import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { clearActiveCombat, getActiveCombat, isCombatInProgress } from '../utils/activeCombat';

const ONLINE_MS = 5 * 60 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

// Barra flotante global de grupo co-op: visible en cualquier pantalla mientras estás
// logueado. Se encarga de avisar invitaciones entrantes, mostrar con quién estás
// agrupado, un atajo al chat de ese amigo, y el botón para salir del grupo.
// Todo es a base de polling (el back no tiene websockets para esto).
export default function CoopBar() {
  const { player, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [party, setParty] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [readyStatus, setReadyStatus] = useState(null);
  const [dismissedZoneId, setDismissedZoneId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [penaltyPopup, setPenaltyPopup] = useState(null);
  const partyPollRef = useRef(null);
  const invitePollRef = useRef(null);
  const readyPollRef = useRef(null);
  const chatPollRef = useRef(null);
  const lastMessageIdRef = useRef(0);
  const chatLogRef = useRef(null);
  const penaltyPopupTimer = useRef(null);

  useEffect(() => () => clearTimeout(penaltyPopupTimer.current), []);

  useEffect(() => {
    if (!isAuthenticated || !player) {
      setParty(null);
      return undefined;
    }
    async function pollParty() {
      try {
        setParty(await api.getCoopParty(player.id, token));
      } catch {
        // silencioso: polling en background
      }
    }
    pollParty();
    partyPollRef.current = setInterval(pollParty, 6000);
    return () => clearInterval(partyPollRef.current);
  }, [isAuthenticated, player, token]);

  useEffect(() => {
    if (!isAuthenticated || !player || party) {
      clearInterval(invitePollRef.current);
      setPendingInvite(null);
      return undefined;
    }
    async function pollInvite() {
      try {
        setPendingInvite(await api.getPendingCoopInvite(player.id, token));
      } catch {
        // silencioso
      }
    }
    pollInvite();
    invitePollRef.current = setInterval(pollInvite, 3000);
    return () => clearInterval(invitePollRef.current);
  }, [isAuthenticated, player, token, party]);

  // Ready-check: si tu compañero ya marcó "listo" para una zona y vos no, se muestra acá
  // (en cualquier pantalla) sin necesidad de entrar a esa zona para verlo.
  useEffect(() => {
    if (!isAuthenticated || !player || !party) {
      clearInterval(readyPollRef.current);
      setReadyStatus(null);
      return undefined;
    }
    async function pollReady() {
      try {
        setReadyStatus(await api.getCoopReadyStatus(player.id, token));
      } catch {
        // silencioso
      }
    }
    pollReady();
    readyPollRef.current = setInterval(pollReady, 3000);
    return () => clearInterval(readyPollRef.current);
  }, [isAuthenticated, player, token, party]);

  // Chat de grupo: siempre visible mientras estás agrupado, no un popup que hay que abrir.
  // afterId evita traer toda la conversación de vuelta en cada poll, solo lo nuevo.
  useEffect(() => {
    if (!isAuthenticated || !player || !party) {
      clearInterval(chatPollRef.current);
      setChatMessages([]);
      lastMessageIdRef.current = 0;
      return undefined;
    }
    let cancelled = false;
    async function pollMessages() {
      try {
        const res = await api.getCoopMessages(player.id, lastMessageIdRef.current, token);
        if (cancelled || !res.messages.length) return;
        lastMessageIdRef.current = res.messages[res.messages.length - 1].id;
        setChatMessages((prev) => [...prev, ...res.messages].slice(-50));
      } catch {
        // silencioso
      }
    }
    pollMessages();
    chatPollRef.current = setInterval(pollMessages, 3000);
    return () => { cancelled = true; clearInterval(chatPollRef.current); };
    // party.groupId (no el objeto party entero) para no reiniciar el poll en cada refresh de la barra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, player, token, party?.groupId]);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatMessages]);

  async function handleSendPartyChat() {
    if (!chatInput.trim()) return;
    setChatSending(true);
    setError('');
    try {
      const msg = await api.sendCoopMessage(player.id, chatInput.trim(), token);
      lastMessageIdRef.current = msg.id;
      setChatMessages((prev) => [...prev, { ...msg, sender_nickname: msg.senderNickname }].slice(-50));
      setChatInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setChatSending(false);
    }
  }

  const inCombat = isCombatInProgress(getActiveCombat());
  // Con hasta 2 companeros, alcanza con que UNO ya haya marcado listo para mostrar el cartel
  // (si despues falta el tercero, el back simplemente va a seguir esperando ese ready).
  const otherReady = readyStatus?.members?.find((m) => m.ready) ?? null;
  const showReadyPrompt = !!(
    party && !inCombat && otherReady && !readyStatus?.myReady && otherReady.zoneId !== dismissedZoneId
  );

  async function handleAcceptReady() {
    setBusy(true);
    setError('');
    try {
      const zoneId = otherReady.zoneId;
      const res = await api.setCoopReady(player.id, zoneId, token);
      // Si por una carrera el ready de alguien ya expiró, no asumas que la sesión existe:
      // navegá igual pero sin autoStart, para que la zona muestre el ready-check normal.
      navigate(`/combat/${zoneId}`, { state: res.allReady ? { autoStart: true } : {} });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleDeclineReady() {
    setDismissedZoneId(otherReady.zoneId);
  }

  async function handleAccept() {
    if (!pendingInvite) return;
    setBusy(true);
    setError('');
    try {
      await api.acceptCoopInvite(player.id, pendingInvite.id, token);
      setPendingInvite(null);
      setParty(await api.getCoopParty(player.id, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!pendingInvite) return;
    setBusy(true);
    try {
      await api.declineCoopInvite(player.id, pendingInvite.id, token);
    } catch {
      // no importa si ya habia expirado
    } finally {
      setPendingInvite(null);
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    setError('');
    try {
      const result = await api.leaveCoopParty(player.id, token);
      setParty(null);
      if (result?.leftDuringCombat) {
        clearActiveCombat();
        clearTimeout(penaltyPopupTimer.current);
        setPenaltyPopup({ goldPenalty: result.goldPenalty });
        penaltyPopupTimer.current = setTimeout(() => setPenaltyPopup(null), 8000);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleKick(member) {
    setBusy(true);
    setError('');
    try {
      await api.kickCoopMember(player.id, member.id, token);
      setParty(await api.getCoopParty(player.id, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated || !player) return null;
  if (location.pathname === '/login' || location.pathname === '/register') return null;

  return (
    <>
      {penaltyPopup && (
        <div className="craft-result-popup rpg-panel">
          <button
            className="craft-result-close"
            onClick={() => { clearTimeout(penaltyPopupTimer.current); setPenaltyPopup(null); }}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h4 className="craft-result-title">⚠️ Saliste del grupo</h4>
          <p className="hint">
            Saliste del grupo en media exploración. Fuiste penalizado con la pérdida de un
            10% de tu oro ({penaltyPopup.goldPenalty} oro).
          </p>
        </div>
      )}

      {pendingInvite && !party && (
        <div className="coop-invite-popup rpg-panel">
          <p className="craft-result-title">🤝 Invitación de grupo</p>
          <p className="hint">
            <strong>{pendingInvite.leader_nickname}</strong> (Nv. {pendingInvite.leader_level} · {pendingInvite.leader_class})
            {' '}te invitó a formar un grupo co-op.
          </p>
          {pendingInvite.existingMembers?.length > 0 && (
            <p className="hint">Ya están: {pendingInvite.existingMembers.map((m) => m.nickname).join(', ')}</p>
          )}
          {error && <p className="auth-error">{error}</p>}
          <div className="craft-row">
            <button className="rpg-button rpg-button--small" disabled={busy} onClick={handleAccept}>
              ✓ Aceptar
            </button>
            <button className="rpg-button rpg-button--small" disabled={busy} onClick={handleDecline}>
              ✗ Rechazar
            </button>
          </div>
        </div>
      )}

      {showReadyPrompt && (
        <div className="coop-ready-bar rpg-panel">
          <span className="coop-ready-text">¿Listo para explorar?</span>
          <div className="coop-ready-actions">
            <button className="coop-check-btn" disabled={busy} onClick={handleAcceptReady} aria-label="Aceptar">
              ✓
            </button>
            <button className="coop-x-btn" disabled={busy} onClick={handleDeclineReady} aria-label="Rechazar">
              ✗
            </button>
          </div>
        </div>
      )}

      {party && (
        <div className="coop-bar rpg-panel">
          <span className="coop-bar-label">🤝 Grupo{party.isLeader ? ' · líder' : ''}</span>
          {party.members.map((m) => (
            <div key={m.id} className="coop-bar-member">
              <div className="coop-bar-info">
                <span className="coop-bar-partner">
                  {m.nickname}
                  <span
                    className={`coop-bar-status-dot ${isOnline(m.last_seen_at) ? 'coop-bar-status-dot--online' : 'coop-bar-status-dot--offline'}`}
                    title={isOnline(m.last_seen_at) ? 'Conectado' : 'Desconectado'}
                  >
                    ●
                  </span>
                </span>
                <span className="coop-bar-class">Nv. {m.level} · {m.class_name}</span>
                <span className="coop-bar-hp">{Math.max(0, m.hp)}/{m.max_hp} HP</span>
              </div>
              {party.isLeader && (
                <button
                  className="coop-bar-kick-btn"
                  disabled={busy}
                  onClick={() => handleKick(m)}
                  title={`Expulsar a ${m.nickname}`}
                  aria-label={`Expulsar a ${m.nickname}`}
                >
                  ⛔
                </button>
              )}
            </div>
          ))}
          {error && <p className="auth-error">{error}</p>}
          <div className="coop-bar-actions">
            <button className="rpg-button rpg-button--small" disabled={busy} onClick={handleLeave}>
              Salir del grupo
            </button>
          </div>
        </div>
      )}

      {party && (
        <div className="party-chat rpg-panel">
          <span className="coop-bar-label">💬 Chat de grupo</span>
          <div className="party-chat-log" ref={chatLogRef}>
            {chatMessages.length === 0 && <p className="hint">Sin mensajes todavía.</p>}
            {chatMessages.map((m) => (
              <p
                key={m.id}
                className={`party-chat-line${m.sender_id === player.id ? ' party-chat-line--mine' : ''}`}
              >
                <strong>{m.sender_id === player.id ? 'Vos' : m.sender_nickname}:</strong> {m.body}
              </p>
            ))}
          </div>
          <div className="party-chat-input-row">
            <input
              type="text"
              className="rpg-input"
              placeholder="Escribí al grupo..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendPartyChat(); }}
              maxLength={500}
            />
            <button className="rpg-button rpg-button--small" disabled={chatSending} onClick={handleSendPartyChat}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
