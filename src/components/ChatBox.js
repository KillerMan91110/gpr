import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CHANNEL_LABELS = { GENERAL: 'General', TRADE: 'Comercio', PARTY: 'Grupo', GUILD: 'Gremio' };
const MSG_POLL_MS = 3000;
const PARTY_POLL_MS = 6000;
const GUILD_POLL_MS = 15000;
const MAX_MESSAGES = 80;

// Party (coop.js) y General/Comercio/Gremio (chat.js) devuelven formas distintas:
// coop -> { id, sender_id, sender_nickname, body }, chat -> { id, nickname, level, body }
// (sin sender_id). Se normalizan acá a una forma común para no bifurcar el render.
function normalizeGetMessages(channel, rawMessages, myNickname, myId) {
  if (channel === 'PARTY') {
    return rawMessages.map((m) => ({
      id: m.id,
      nickname: m.sender_nickname,
      level: null,
      body: m.body,
      mine: m.sender_id === myId,
    }));
  }
  return rawMessages.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    level: m.level,
    body: m.body,
    mine: m.nickname === myNickname,
  }));
}

// Chatbox global (visible en cualquier pantalla mientras estás logueado). Tabs fijos
// General/Comercio siempre visibles; Grupo y Gremio aparecen solo si pertenecés a uno,
// y cada tab solo te comunica con los jugadores de ese canal. Todo a base de polling
// (mismo patrón que CoopBar: el back no tiene websockets).
export default function ChatBox() {
  const { player, token, isAuthenticated } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('GENERAL');
  const [minimized, setMinimized] = useState(false);
  const [party, setParty] = useState(null);
  const [guild, setGuild] = useState(null);
  const [messages, setMessages] = useState({ GENERAL: [], TRADE: [], PARTY: [], GUILD: [] });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const lastIdRef = useRef({ GENERAL: 0, TRADE: 0, PARTY: 0, GUILD: 0 });
  const logRef = useRef(null);
  const partyPollRef = useRef(null);
  const guildPollRef = useRef(null);
  const msgPollRef = useRef(null);

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

  // Poll de mensajes: solo del canal activo, para no pegarle al back por 4 canales a la vez.
  useEffect(() => {
    if (!isAuthenticated || !player || minimized) return undefined;
    if (activeTab === 'PARTY' && !party) return undefined;
    if (activeTab === 'GUILD' && !guild) return undefined;

    let cancelled = false;
    async function poll() {
      try {
        const afterId = lastIdRef.current[activeTab];
        const res = activeTab === 'PARTY'
          ? await api.getCoopMessages(player.id, afterId, token)
          : await api.getChatMessages(player.id, activeTab, afterId, token);
        if (cancelled || !res.messages.length) return;
        lastIdRef.current[activeTab] = res.messages[res.messages.length - 1].id;
        const normalized = normalizeGetMessages(activeTab, res.messages, player.nickname, player.id);
        setMessages((prev) => ({
          ...prev,
          [activeTab]: [...prev[activeTab], ...normalized].slice(-MAX_MESSAGES),
        }));
      } catch {
        // silencioso
      }
    }
    poll();
    msgPollRef.current = setInterval(poll, MSG_POLL_MS);
    return () => { cancelled = true; clearInterval(msgPollRef.current); };
    // party?.groupId / guild?.id (no los objetos enteros) para no reiniciar el poll en cada refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, player, token, activeTab, party?.groupId, guild?.id, minimized]);

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
      lastIdRef.current[activeTab] = sent.id;
      setMessages((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], sent].slice(-MAX_MESSAGES),
      }));
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
