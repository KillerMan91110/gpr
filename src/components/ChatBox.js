import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';

const CHANNEL_LABELS = { GENERAL: 'General', TRADE: 'Comercio', PARTY: 'Grupo', GUILD: 'Gremio' };
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
// General/Comercio siempre visibles; Grupo y Gremio aparecen solo si pertenecés a uno.
// Los mensajes en vivo llegan por WebSocket (rooms chat:GENERAL/TRADE/GUILD:<id>/COOP:<id>);
// el historial de cada canal se trae una sola vez por REST la primera vez que se abre esa
// pestaña. Party/Gremio (quién sos, no los mensajes) siguen en polling: no hay evento de
// socket para eso todavía.
export default function ChatBox() {
  const { player, token, isAuthenticated } = useAuth();
  const { socket, connected: socketConnected } = useSocket();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('GENERAL');
  const [minimized, setMinimized] = useState(false);
  const [party, setParty] = useState(null);
  const [guild, setGuild] = useState(null);
  const [messages, setMessages] = useState({ GENERAL: [], TRADE: [], PARTY: [], GUILD: [] });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadedRef = useRef({ GENERAL: false, TRADE: false, PARTY: false, GUILD: false });
  const logRef = useRef(null);
  const partyPollRef = useRef(null);
  const guildPollRef = useRef(null);

  function appendMessage(channel, msg) {
    setMessages((prev) => (
      prev[channel].some((m) => m.id === msg.id) ? prev : { ...prev, [channel]: mergeMessages(prev[channel], [msg]) }
    ));
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
        setGuild(await api.getMyGuild(token));
      } catch {
        setGuild(null);
      }
    }
    poll();
    guildPollRef.current = setInterval(poll, GUILD_POLL_MS);
    return () => clearInterval(guildPollRef.current);
  }, [isAuthenticated, player, token]);

  // Si perdés la party/gremio estando parado en esa tab, volvé a General.
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

  // Mensajes en vivo: un solo listener para las 4 rooms (el payload trae `channel`),
  // sin importar cuál pestaña esté activa.
  useEffect(() => {
    if (!socket || !player) return undefined;
    function handleMessage(raw) {
      const channel = raw.channel;
      if (!(channel in loadedRef.current)) return;
      appendMessage(channel, normalizeMessage(channel, raw, player.nickname, player.id));
    }
    socket.on('chat:message', handleMessage);
    return () => socket.off('chat:message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, player?.id, player?.nickname]);

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

  async function handleSend() {
    if (!input.trim()) return;
    setSending(true);
    setError('');
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

  const tabs = ['GENERAL', 'TRADE', ...(party ? ['PARTY'] : []), ...(guild ? ['GUILD'] : [])];
  const activeMessages = messages[activeTab] || [];

  if (minimized) {
    return (
      <button className="chat-box-restore rpg-button rpg-button--small" type="button" onClick={() => setMinimized(false)}>
        💬 Chat
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
            </button>
          ))}
        </div>
        <button className="chat-min" type="button" title="Minimizar" onClick={() => setMinimized(true)}>▁</button>
      </div>

      <div className="chat-list" ref={logRef}>
        {activeMessages.length === 0 && <p className="hint chat-empty">Sin mensajes todavía.</p>}
        {activeMessages.map((m) => (
          <div key={m.id} className={`chat-msg${m.mine ? ' chat-msg--mine' : ''}`}>
            <span className="chat-from">
              {m.nickname}{m.level ? ` [${m.level}]` : ''}:
            </span>{' '}
            <span className="chat-body">{m.body}</span>
          </div>
        ))}
      </div>

      {error && <p className="auth-error chat-error">{error}</p>}

      <div className="chat-input">
        <input
          type="text"
          className="rpg-input"
          maxLength={300}
          placeholder={`Hablar en ${CHANNEL_LABELS[activeTab]}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button className="rpg-button rpg-button--small" type="button" disabled={sending} onClick={handleSend}>
          Enviar
        </button>
      </div>
    </div>
  );
}
