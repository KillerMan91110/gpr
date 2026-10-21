import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import GameIcon from './GameIcon';
import bus from '../game/bus';

const CHANNEL_LABELS = { CERCA: 'Cerca', GENERAL: 'General', TRADE: 'Comercio', PARTY: 'Grupo', GUILD: 'Gremio' };

// Mundo 2D: pestaña "Cerca" (lo que dices sale en un globito sobre tu personaje y lo leen los
// que están cerca) y comandos que funcionan desde cualquier pestaña.
const EMOTE_TEXT = { saludar: 'saluda', bailar: 'se pone a bailar', reir: 'se ríe', sentarse: 'se sienta', aplaudir: 'aplaude' };
const EMOTE_SELF = { saludar: 'Saludas', bailar: 'Te pones a bailar', reir: 'Te ríes', sentarse: 'Te sientas', aplaudir: 'Aplaudes' };
const WORLD_HELP = 'Comandos: /d decir · /g gritar (o empieza con !) · /s Nombre susurrar · /r responder · /saludar /bailar /reir /sentarse /aplaudir · T emojis';

function parseWorldCommand(text, tab, lastWhisper) {
  const m = /^\/(\S+)\s*([\s\S]*)$/.exec(text);
  if (!m) {
    if (tab !== 'CERCA') return null;
    return text.startsWith('!') ? { type: 'say', loud: true, text: text.slice(1).trim() } : { type: 'say', loud: false, text };
  }
  const cmd = m[1].toLowerCase();
  const rest = m[2].trim();
  if (['s', 'susurrar', 'w'].includes(cmd)) {
    const [to, ...words] = rest.split(/\s+/);
    return { type: 'whisper', to, text: words.join(' ') };
  }
  if (cmd === 'r') return lastWhisper ? { type: 'whisper', to: lastWhisper, text: rest } : { type: 'error', text: 'Nadie te ha susurrado todavía' };
  if (['g', 'gritar'].includes(cmd)) return { type: 'say', loud: true, text: rest };
  if (['d', 'decir'].includes(cmd)) return { type: 'say', loud: false, text: rest };
  if (cmd === 'hola') return { type: 'emote', emote: 'saludar' };
  if (EMOTE_TEXT[cmd]) return { type: 'emote', emote: cmd };
  if (cmd === 'ayuda') return { type: 'help' };
  return { type: 'error', text: 'Comando desconocido. Escribe /ayuda' };
}

let localSeq = 0;
const localId = () => Date.now() * 1000 + (localSeq++ % 1000);
const PARTY_POLL_MS = 6000;
const GUILD_POLL_MS = 15000;
const MAX_MESSAGES = 80;

// Party (coop.js) y General/Comercio/Gremio (chat.js) devuelven formas distintas:
// coop -> { id, sender_id/senderId, sender_nickname/senderNickname, body }
// chat -> { id, nickname, level, body } (sin sender_id). Se normalizan acá a una forma
// común para no bifurcar el render. sender_nickname/senderNickname difiere según si el
// mensaje vino del GET (snake_case) o del evento de socket (camelCase).
function normalizeMessage(channel, raw, myNickname, myId) {
  if (channel === 'PARTY') {
    return {
      id: raw.id,
      nickname: raw.sender_nickname ?? raw.senderNickname,
      level: null,
      body: raw.body,
      mine: (raw.sender_id ?? raw.senderId) === myId,
    };
  }
  return {
    id: raw.id,
    nickname: raw.nickname,
    level: raw.level,
    body: raw.body,
    mine: raw.nickname === myNickname,
  };
}

function mergeMessages(existing, incoming) {
  const seen = new Set();
  const merged = [];
  for (const m of [...existing, ...incoming]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    merged.push(m);
  }
  merged.sort((a, b) => a.id - b.id);
  return merged.slice(-MAX_MESSAGES);
}

// Chatbox global (visible en cualquier pantalla mientras estás logueado). Tabs fijos
// General/Comercio siempre visibles; Grupo y Gremio aparecen solo si perteneces a uno.
// Los mensajes en vivo llegan por WebSocket (rooms chat:GENERAL/TRADE/GUILD:<id>/COOP:<id>);
// el historial de cada canal se trae una sola vez por REST la primera vez que se abre esa
// pestaña. Party/Gremio (quién eres, no los mensajes) siguen en polling: no hay evento de
// socket para eso todavía.
export default function ChatBox() {
  const { player, token, isAuthenticated } = useAuth();
  const { socket, connected: socketConnected } = useSocket();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('GENERAL');
  // en pantallas táctiles chicas el chat empieza plegado (no tapa el juego)
  const [minimized, setMinimized] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 900);
  const [party, setParty] = useState(null);
  const [guild, setGuild] = useState(null);
  const [messages, setMessages] = useState({ CERCA: [], GENERAL: [], TRADE: [], PARTY: [], GUILD: [] });
  const [unread, setUnread] = useState({ CERCA: 0, GENERAL: 0, TRADE: 0, PARTY: 0, GUILD: 0 });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadedRef = useRef({ CERCA: true, GENERAL: false, TRADE: false, PARTY: false, GUILD: false });
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const lastWhisperRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimer = useRef(null);
  const inWorld = location.pathname === '/mundo';
  const partyPollRef = useRef(null);
  const guildPollRef = useRef(null);

  // Para saber, desde dentro del listener de socket (que no se re-crea en cada render),
  // si el mensaje que llega hay que marcarlo como no-leído o no.
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const minimizedRef = useRef(minimized);
  useEffect(() => { minimizedRef.current = minimized; }, [minimized]);

  function appendMessage(channel, msg) {
    setMessages((prev) => (
      prev[channel].some((m) => m.id === msg.id) ? prev : { ...prev, [channel]: mergeMessages(prev[channel], [msg]) }
    ));
  }

  // ---- mundo 2D: pestaña Cerca, susurros, gestos y "escribiendo…" ----
  useEffect(() => {
    if (inWorld) setActiveTab('CERCA');
    else setActiveTab((t) => (t === 'CERCA' ? 'GENERAL' : t));
  }, [inWorld]);

  const addLocal = (msg, unreadToo = true) => {
    const m = { id: localId(), ...msg };
    setMessages((prev) => ({ ...prev, CERCA: [...prev.CERCA, m].slice(-MAX_MESSAGES) }));
    if (unreadToo && !m.mine && (minimizedRef.current || activeTabRef.current !== 'CERCA')) {
      setUnread((prev) => ({ ...prev, CERCA: prev.CERCA + 1 }));
    }
  };

  useEffect(() => {
    if (!socket || !player) return undefined;
    const onSay = (m) => addLocal({ nickname: m.name, level: m.level, body: m.text, kind: m.loud ? 'gritar' : 'decir', mine: m.id === player.id });
    const onWhisper = (m) => {
      const mine = m.from.id === player.id;
      if (!mine) lastWhisperRef.current = m.from.name;
      addLocal({ nickname: mine ? `Para ${m.to.name}` : `De ${m.from.name}`, body: m.text, kind: 'susurro', mine });
    };
    const onEmote = (m) => addLocal({ body: m.id === player.id ? `${EMOTE_SELF[m.emote] ?? m.emote}.` : `${m.name} ${EMOTE_TEXT[m.emote] ?? m.emote}.`, kind: 'gesto', mine: m.id === player.id }, false);
    socket.on('world:say', onSay);
    socket.on('world:whisper', onWhisper);
    socket.on('world:emote', onEmote);
    return () => { socket.off('world:say', onSay); socket.off('world:whisper', onWhisper); socket.off('world:emote', onEmote); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, player?.id]);

  // menú de un jugador → "Susurrar" deja escrito /s Nombre en el chat
  useEffect(() => {
    const onPrefill = (text) => {
      setMinimized(false);
      setActiveTab('CERCA');
      setInput(text);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    bus.on('chat-prefill', onPrefill);
    return () => bus.off('chat-prefill', onPrefill);
  }, []);

  // "escribiendo…": globito con puntos sobre tu personaje mientras escribes algo que se va a decir
  const setTyping = (on) => {
    if (typingRef.current === on) return;
    typingRef.current = on;
    socket?.emit('world:typing', on);
    bus.emit('my-typing', on);
  };
  useEffect(() => {
    if (!inWorld) return undefined;
    const t = input.trim();
    const speaking = activeTab === 'CERCA' ? !/^\/(?!g |gritar |d |decir )/.test(t) : /^\/(g|gritar|d|decir) /.test(t);
    setTyping(!!t && speaking);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 6000);
    return () => clearTimeout(typingTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, activeTab, inWorld]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => setTyping(false), [inWorld]);

  function worldSend(cmd) {
    if (cmd.type === 'help') { addLocal({ body: WORLD_HELP, kind: 'gesto', mine: true }, false); setInput(''); return; }
    if (cmd.type === 'error') { setError(cmd.text); return; }
    if ((cmd.type === 'say' || cmd.type === 'whisper') && !cmd.text) { setError(cmd.type === 'whisper' ? 'Escribe: /s Nombre mensaje' : 'Mensaje vacío'); return; }
    if (!socket) { setError('Sin conexión'); return; }
    const ev = { say: 'world:say', whisper: 'world:whisper', emote: 'world:emote' }[cmd.type];
    const payload = cmd.type === 'say' ? { text: cmd.text, loud: cmd.loud } : cmd.type === 'whisper' ? { to: cmd.to, text: cmd.text } : { emote: cmd.emote };
    setSending(true);
    socket.emit(ev, payload, (r) => {
      setSending(false);
      if (r?.error) { setError(r.error); return; }
      if (cmd.type === 'whisper' && r?.msg) addLocal({ nickname: `Para ${r.msg.to.name}`, body: r.msg.text, kind: 'susurro', mine: true }, false);
      setInput('');
      setTyping(false);
    });
  }

  useEffect(() => {
    if (!isAuthenticated || !player) {
      setParty(null);
      return undefined;
    }
    async function poll() {
      try {
        setParty(await api.getCoopParty(player.id, token));
      } catch {
        // silencioso: polling en background
      }
    }
    poll();
    partyPollRef.current = setInterval(poll, PARTY_POLL_MS);
    return () => clearInterval(partyPollRef.current);
  }, [isAuthenticated, player, token]);

  useEffect(() => {
    if (!isAuthenticated || !player) {
      setGuild(null);
      return undefined;
    }
    async function poll() {
      try {
        setGuild(await api.getMyGuildOpcional(token));
      } catch {
        setGuild(null);
      }
    }
    poll();
    guildPollRef.current = setInterval(poll, GUILD_POLL_MS);
    return () => clearInterval(guildPollRef.current);
  }, [isAuthenticated, player, token]);

  // Si pierdes la party/gremio estando parado en esa tab, vuelve a General.
  useEffect(() => {
    if (activeTab === 'PARTY' && !party) setActiveTab('GENERAL');
  }, [party, activeTab]);
  useEffect(() => {
    if (activeTab === 'GUILD' && !guild) setActiveTab('GENERAL');
  }, [guild, activeTab]);

  // Unirse a las rooms de chat. Se repite cada vez que socketConnected vuelve a true
  // (reconexión, ej. tras un cold-start del back): las rooms no sobreviven, hay que
  // re-unirse con la conexión nueva.
  useEffect(() => {
    if (!socket || !socketConnected) return;
    socket.emit('chat:join', 'GENERAL');
    socket.emit('chat:join', 'TRADE');
    if (guild?.id) socket.emit('chat:join', `GUILD:${guild.id}`);
    if (party?.groupId) socket.emit('chat:join', `COOP:${party.groupId}`);
  }, [socket, socketConnected, guild?.id, party?.groupId]);

  // Anuncios del jefe mítico (gprback/lib/mythic.js): llegan a todos los conectados, estén o no
  // en el mundo 2D, y quedan como una línea dorada en General (y en Cerca dentro del mundo)
  useEffect(() => {
    if (!socket) return undefined;
    const announce = (text) => {
      setMessages((prev) => {
        const last = prev.GENERAL[prev.GENERAL.length - 1]?.id ?? 0;
        const msg = { id: last + 0.001, body: text, kind: 'anuncio' };
        return {
          ...prev,
          GENERAL: [...prev.GENERAL, msg].slice(-MAX_MESSAGES),
          CERCA: [...prev.CERCA, { ...msg, id: localId() }].slice(-MAX_MESSAGES),
        };
      });
      setUnread((prev) => ({
        ...prev,
        GENERAL: activeTabRef.current === 'GENERAL' && !minimizedRef.current ? prev.GENERAL : prev.GENERAL + 1,
      }));
    };
    const onSpawn = (s) => announce(`☠ ¡${s.name} ha aparecido en ${s.spot}${s.zoneName ? `, en ${s.zoneName}` : ''}! La noche no terminará hasta que caiga.`);
    const onKilled = (s) => announce(`✦ ${s.killer} derribó a ${s.name} junto a ${Math.max(0, s.hunters - 1)} cazadores más. ¡Amanece${s.zoneName ? ` en ${s.zoneName}` : ''}!`);
    socket.on('mythic:spawn', onSpawn);
    socket.on('mythic:killed', onKilled);
    return () => { socket.off('mythic:spawn', onSpawn); socket.off('mythic:killed', onKilled); };
  }, [socket]);

  // Mensajes en vivo: un solo listener para las 4 rooms (el payload trae `channel`),
  // sin importar cuál pestaña esté activa.
  useEffect(() => {
    if (!socket || !player) return undefined;
    function handleMessage(raw) {
      const channel = raw.channel;
      if (!(channel in loadedRef.current)) return;
      const normalized = normalizeMessage(channel, raw, player.nickname, player.id);
      appendMessage(channel, normalized);
      // Si el mensaje es mío ya lo vi (lo mandé yo); si no, cuenta como no-leído salvo
      // que ya esté parado justo en esa pestaña con el chat abierto.
      if (!normalized.mine && (minimizedRef.current || channel !== activeTabRef.current)) {
        setUnread((prev) => ({ ...prev, [channel]: prev[channel] + 1 }));
      }
    }
    socket.on('chat:message', handleMessage);
    return () => socket.off('chat:message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, player?.id, player?.nickname]);

  // TRADE y GUILD se vacían solos en el back tras 15min sin mensajes (ver routes/chat.js,
  // clearIfInactive). El room ya filtra por guild_id, así que si nos llega el evento es porque
  // nos corresponde: no hace falta volver a chequear guildId acá.
  useEffect(() => {
    if (!socket) return undefined;
    function handleCleared({ channel }) {
      if (!(channel in loadedRef.current)) return;
      setMessages((prev) => ({ ...prev, [channel]: [] }));
      setUnread((prev) => (prev[channel] ? { ...prev, [channel]: 0 } : prev));
    }
    socket.on('chat:cleared', handleCleared);
    return () => socket.off('chat:cleared', handleCleared);
  }, [socket]);

  // Historial: se trae una sola vez por canal, la primera vez que esa pestaña se vuelve
  // relevante (se abre, o aparece la party/gremio). De ahí en más, los mensajes nuevos
  // llegan solos por socket.
  useEffect(() => {
    if (!isAuthenticated || !player) return;
    if (activeTab === 'PARTY' && !party) return;
    if (activeTab === 'GUILD' && !guild) return;
    if (loadedRef.current[activeTab]) return;
    loadedRef.current[activeTab] = true;

    (async () => {
      try {
        const res = activeTab === 'PARTY'
          ? await api.getCoopMessages(player.id, 0, token)
          : await api.getChatMessages(player.id, activeTab, 0, token);
        if (!res.messages.length) return;
        const normalized = res.messages.map((m) => normalizeMessage(activeTab, m, player.nickname, player.id));
        setMessages((prev) => ({ ...prev, [activeTab]: mergeMessages(prev[activeTab], normalized) }));
      } catch {
        // silencioso
      }
    })();
    // party?.groupId / guild?.id (no los objetos enteros) para no reiniciar el efecto en cada refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, player, token, activeTab, party?.groupId, guild?.id]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, activeTab]);

  // La pestaña activa se considera "leída" mientras el chat esté abierto — tanto al
  // cambiar de pestaña como al desminimizar (ahí vuelve a correr con minimized en false).
  useEffect(() => {
    if (minimized) return;
    setUnread((prev) => (prev[activeTab] ? { ...prev, [activeTab]: 0 } : prev));
  }, [activeTab, minimized]);

  async function handleSend() {
    if (!input.trim()) return;
    setError('');
    if (inWorld) {
      const cmd = parseWorldCommand(input.trim(), activeTab, lastWhisperRef.current);
      if (cmd) { worldSend(cmd); return; }
    }
    setSending(true);
    try {
      let sent;
      if (activeTab === 'PARTY') {
        const msg = await api.sendCoopMessage(player.id, input.trim(), token);
        sent = { id: msg.id, nickname: msg.senderNickname, level: null, body: msg.body, mine: true };
      } else {
        const res = await api.sendChatMessage(player.id, activeTab, input.trim(), token);
        sent = { id: res.message.id, nickname: res.message.nickname, level: res.message.level, body: res.message.body, mine: true };
      }
      appendMessage(activeTab, sent);
      setInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!isAuthenticated || !player) return null;
  if (location.pathname === '/login' || location.pathname === '/register') return null;

  const tabs = [...(inWorld ? ['CERCA'] : []), 'GENERAL', 'TRADE', ...(party ? ['PARTY'] : []), ...(guild ? ['GUILD'] : [])];
  const activeMessages = messages[activeTab] || [];
  const totalUnread = tabs.reduce((sum, t) => sum + unread[t], 0);

  if (minimized) {
    return (
      <button className="chat-box-restore rpg-button rpg-button--small" type="button" onClick={() => setMinimized(false)}>
        <GameIcon name="chat-bubble" artist="delapouite" /> Chat
        {totalUnread > 0 && <span className="chat-tab-badge">{totalUnread}</span>}
      </button>
    );
  }

  return (
    <div className="chat-box rpg-panel">
      <div className="chat-head">
        <div className="chat-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`chat-tab${activeTab === t ? ' chat-tab--active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {CHANNEL_LABELS[t]}
              {unread[t] > 0 && <span className="chat-tab-badge">{unread[t]}</span>}
            </button>
          ))}
        </div>
        <button className="chat-min" type="button" title="Minimizar" onClick={() => setMinimized(true)}>▁</button>
      </div>

      <div className="chat-list" ref={logRef}>
        {activeMessages.length === 0 && <p className="hint chat-empty">Sin mensajes todavía.</p>}
        {activeMessages.map((m) => (
          <div key={m.id} className={`chat-msg${m.mine ? ' chat-msg--mine' : ''}${m.kind ? ` chat-msg--${m.kind}` : ''}`}>
            {m.nickname && (
              <span className="chat-from">
                {m.kind === 'gritar' ? '📢 ' : ''}{m.nickname}{m.level ? ` [${m.level}]` : ''}:
              </span>
            )}{' '}
            <span className="chat-body">{m.body}</span>
          </div>
        ))}
      </div>

      {error && <p className="auth-error chat-error">{error}</p>}

      <div className="chat-input">
        <input
          ref={inputRef}
          type="text"
          className="rpg-input"
          maxLength={300}
          placeholder={activeTab === 'CERCA' ? 'Decir… (/ayuda para ver comandos)' : `Hablar en ${CHANNEL_LABELS[activeTab]}...`}
          value={input}
          onChange={(e) => { setInput(e.target.value); if (error) setError(''); }}
          onBlur={() => inWorld && setTyping(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button className="rpg-button rpg-button--small" type="button" disabled={sending} onClick={handleSend}>
          Enviar
        </button>
      </div>
    </div>
  );
}
