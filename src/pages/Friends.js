import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ONLINE_MS = 5 * 60 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const RARITY_LABELS = {
  COMUN: 'Común', POCO_COMUN: 'Poco Común', RARO: 'Raro', EPICO: 'Épico', LEGENDARIO: 'Legendario',
};

export default function Friends() {
  const { player, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState(null);
  const [requests, setRequests] = useState(null);
  const [coopParty, setCoopParty] = useState(null);
  const [coopBusyId, setCoopBusyId] = useState(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [messagesTab, setMessagesTab] = useState('inbox');
  const [inbox, setInbox] = useState(null);
  const [sent, setSent] = useState(null);
  const [openMessage, setOpenMessage] = useState(null);
  const [returnToChat, setReturnToChat] = useState(null);
  const [chatWith, setChatWith] = useState(null);
  const [chatThread, setChatThread] = useState(null);
  const [friendTyping, setFriendTyping] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeGold, setComposeGold] = useState('');
  const [composeItems, setComposeItems] = useState([]);
  const [playerInventory, setPlayerInventory] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [claimPopup, setClaimPopup] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const chatThreadRef = useRef(null);
  const chatPollRef = useRef(null);
  const typingPollRef = useRef(null);
  const typingPingRef = useRef(null);
  const claimPopupTimer = useRef(null);

  async function loadFriends() {
    setFriends(await api.getFriends(player.id, token));
  }
  async function loadRequests() {
    setRequests(await api.getFriendRequests(player.id, token));
  }

  useEffect(() => {
    if (!player) return;
    loadFriends().catch((err) => setError(err.message));
    loadRequests().catch((err) => setError(err.message));
    api.getCoopParty(player.id, token).then(setCoopParty).catch(() => setCoopParty(null));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al llegar desde la barra de co-op (botón "Chat" flotante) con un compañero para abrir.
  useEffect(() => {
    if (!player || !location.state?.openChatWith) return;
    openChat(location.state.openChatWith);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, location.state]);

  useEffect(() => {
    if (!player || tab !== 'messages') return;
    if (messagesTab === 'inbox' && inbox === null) {
      api.getInbox(player.id, token).then(setInbox).catch((err) => setError(err.message));
    }
    if (messagesTab === 'sent' && sent === null) {
      api.getSentMessages(player.id, token).then(setSent).catch((err) => setError(err.message));
    }
  }, [tab, messagesTab, player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    clearInterval(chatPollRef.current);
    clearInterval(typingPollRef.current);
    clearTimeout(typingPingRef.current);
    clearTimeout(claimPopupTimer.current);
  }, []);

  useEffect(() => {
    if (chatThreadRef.current) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
    }
  }, [chatThread, friendTyping]);

  // ─── Agregar amigos ───────────────────────────────────────────────────────

  function openAddFriend() {
    setShowAddFriend(true);
    setSearchQuery('');
    setSearchResults(null);
    setError('');
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    if (searchQuery.trim().length < 2) {
      setError('Ingresá al menos 2 caracteres');
      return;
    }
    setSearching(true);
    try {
      setSearchResults(await api.searchPlayers(player.id, searchQuery, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(target) {
    setError(''); setMessage('');
    setBusyKey(`req-${target.id}`);
    try {
      const res = await api.sendFriendRequest(player.id, target.id, token);
      setMessage(res.message);
      setSearchResults((prev) =>
        prev.map((p) => (p.id === target.id
          ? { ...p, friendship_status: res.status || 'PENDING', friendship_direction: res.status === 'ACCEPTED' ? null : 'sent' }
          : p))
      );
      if (res.status === 'ACCEPTED') await loadFriends();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAccept(targetId) {
    setError(''); setMessage('');
    setBusyKey(`acc-${targetId}`);
    try {
      await api.acceptFriendRequest(player.id, targetId, token);
      await Promise.all([loadFriends(), loadRequests()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(targetId) {
    setError(''); setMessage('');
    setBusyKey(`rm-${targetId}`);
    try {
      const res = await api.removeFriend(player.id, targetId, token);
      setMessage(res.message);
      await Promise.all([loadFriends(), loadRequests()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleInviteCoop(friend) {
    setError(''); setMessage('');
    setCoopBusyId(friend.id);
    try {
      const res = await api.sendCoopInvite(player.id, friend.id, token);
      setMessage(`Invitación de grupo enviada a ${friend.nickname} (expira pronto, decile que la acepte ya).`);
      void res;
    } catch (err) {
      setError(err.message);
    } finally {
      setCoopBusyId(null);
    }
  }

  // ─── Chat con un amigo ────────────────────────────────────────────────────
  // No hay endpoint de "conversación" en el back: se arma el hilo mezclando
  // inbox + sent filtrados por ese amigo y ordenados por fecha.

  async function loadChatThread(friendId) {
    const [inboxData, sentData] = await Promise.all([
      api.getInbox(player.id, token),
      api.getSentMessages(player.id, token),
    ]);
    setInbox(inboxData);
    setSent(sentData);
    const fromFriend = inboxData.filter((m) => m.sender_id === friendId).map((m) => ({ ...m, mine: false }));
    const toFriend = sentData.filter((m) => m.receiver_id === friendId).map((m) => ({ ...m, mine: true }));
    const thread = [...fromFriend, ...toFriend].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setChatThread(thread);
  }

  function stopChatPolling() {
    clearInterval(chatPollRef.current);
    clearInterval(typingPollRef.current);
    clearTimeout(typingPingRef.current);
    chatPollRef.current = null;
    typingPollRef.current = null;
    setFriendTyping(false);
  }

  function closeChat() {
    stopChatPolling();
    setChatWith(null);
  }

  async function openChat(friend) {
    setChatWith(friend);
    setComposeBody('');
    setComposeGold('');
    setComposeItems([]);
    setShowAttachments(false);
    setChatThread(null);
    setFriendTyping(false);
    setError('');
    if (!playerInventory) {
      api.getPlayerInventory(player.id, token).then(setPlayerInventory).catch(() => setPlayerInventory([]));
    }
    try {
      await loadChatThread(friend.id);
    } catch (err) {
      setError(err.message);
    }

    stopChatPolling();
    // Nuevos mensajes sin recargar manualmente (no hay websockets, se aproxima con polling).
    chatPollRef.current = setInterval(() => {
      loadChatThread(friend.id).catch(() => {});
    }, 4000);
    // Indicador "escribiendo..." del otro lado.
    typingPollRef.current = setInterval(() => {
      api.getTypingStatus(player.id, friend.id, token)
        .then((res) => setFriendTyping(!!res.typing))
        .catch(() => {});
    }, 2000);
  }

  function notifyTyping() {
    if (!chatWith) return;
    api.pingTyping(player.id, chatWith.id, token).catch(() => {});
  }

  function handleComposeBodyChange(value) {
    setComposeBody(value);
    clearTimeout(typingPingRef.current);
    typingPingRef.current = setTimeout(notifyTyping, 300);
  }

  function addComposeItem(item) {
    setComposeItems((prev) => {
      const key = `${item.item_id}-${item.enchant_level}-${item.quality_tier}`;
      if (prev.some((i) => i.key === key)) return prev;
      return [...prev, {
        key, item_id: item.item_id, name: item.name,
        enchant_level: item.enchant_level, quality_tier: item.quality_tier,
        max: item.quantity, sendQty: 1,
      }];
    });
  }

  function removeComposeItem(key) {
    setComposeItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateComposeItemQty(key, qty) {
    setComposeItems((prev) => prev.map((i) => (i.key === key ? { ...i, sendQty: qty } : i)));
  }

  async function handleSendChatMessage() {
    if (!composeBody.trim() && !(Number(composeGold) > 0) && composeItems.length === 0) return;
    setError('');
    setBusyKey('send-message');
    try {
      const payload = {
        receiverId: chatWith.id,
        subject: '',
        body: composeBody,
        goldAmount: Number(composeGold) || 0,
        items: composeItems.map((i) => ({
          itemId: i.item_id,
          quantity: Number(i.sendQty) || 1,
          enchantLevel: i.enchant_level,
          qualityTier: i.quality_tier,
        })),
      };
      await api.sendMessage(player.id, payload, token);
      setComposeBody('');
      setComposeGold('');
      setComposeItems([]);
      setShowAttachments(false);
      await loadChatThread(chatWith.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  // ─── Detalle de mensaje (claim / delete) ──────────────────────────────────

  async function handleOpenMessage(msg) {
    setError('');
    try {
      const full = await api.getMessage(player.id, msg.id, token);
      // Se abre un modal encima de otro modal si el chat queda de fondo (mismo z-index,
      // se pisan y queda confuso). Cerramos el chat y lo recordamos para reabrirlo al salir.
      if (chatWith) {
        setReturnToChat(chatWith);
        closeChat();
      }
      setOpenMessage(full);
      if (!msg.read) setInbox(await api.getInbox(player.id, token));
    } catch (err) {
      setError(err.message);
    }
  }

  function closeMessageDetail() {
    setOpenMessage(null);
    if (returnToChat) {
      const friend = returnToChat;
      setReturnToChat(null);
      openChat(friend);
    }
  }

  async function handleClaim(messageId) {
    setError('');
    setBusyKey('claim');
    try {
      const res = await api.claimMessage(player.id, messageId, token);
      closeMessageDetail();
      clearTimeout(claimPopupTimer.current);
      setClaimPopup(res.claimed || []);
      claimPopupTimer.current = setTimeout(() => setClaimPopup(null), 6000);
      setInbox(await api.getInbox(player.id, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteMessage(messageId) {
    setError('');
    setBusyKey('delete');
    try {
      await api.deleteMessage(player.id, messageId, token);
      closeMessageDetail();
      if (inbox !== null) setInbox(await api.getInbox(player.id, token));
      if (sent !== null) setSent(await api.getSentMessages(player.id, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  if (!friends || !requests) return <div className="dashboard-loading">Cargando...</div>;

  // Grupo co-op: hasta 3 en total (yo + 2 más). Solo el líder puede sumar gente nueva.
  const coopGroupFull = (coopParty?.members?.length ?? 0) >= 2;
  const canInviteToCoop = !coopParty || (coopParty.isLeader && !coopGroupFull);
  const coopInviteDisabledReason = !coopParty
    ? ''
    : coopGroupFull
      ? 'El grupo ya está lleno (máx 3)'
      : !coopParty.isLeader
        ? 'Solo el líder del grupo puede invitar'
        : '';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🤝 Amigos</h1>
          <p className="dashboard-subtitle">Agregá jugadores, chateá y mandá regalos.</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      {claimPopup && (
        <div className="craft-result-popup rpg-panel">
          <button
            className="craft-result-close"
            onClick={() => { clearTimeout(claimPopupTimer.current); setClaimPopup(null); }}
            aria-label="Cerrar"
          >
            ×
          </button>
          <h4 className="craft-result-title">🎁 ¡Recibiste un regalo!</h4>
          {claimPopup.length === 0 && <p className="craft-result-line">No había nada más para reclamar.</p>}
          {claimPopup.map((c, i) => (
            <p key={i} className="craft-result-line">✓ {c}</p>
          ))}
        </div>
      )}

      <div className="quest-tabs">
        <button
          className={`rpg-button rpg-button--small${tab === 'friends' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('friends')}
        >
          Amigos{friends.length > 0 ? ` (${friends.length})` : ''}
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'requests' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('requests')}
        >
          Solicitudes{requests.length > 0 ? ` (${requests.length})` : ''}
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'messages' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('messages')}
        >
          Mensajes
        </button>
      </div>

      {tab === 'friends' && (
        <div className="rpg-panel">
          <div className="craft-row" style={{ justifyContent: 'flex-end', marginTop: 0, marginBottom: 10 }}>
            <button className="rpg-button rpg-button--small" onClick={openAddFriend}>
              + Agregar amigo
            </button>
          </div>
          {friends.length === 0 && <p className="hint">Todavía no tenés amigos. Usá "+ Agregar amigo" para buscarlos.</p>}
          <div className="guild-members-list">
            {friends.map((f) => (
              <div key={f.id} className="guild-member-row guild-member-row--with-actions">
                <div className="guild-member-info">
                  <span className="guild-member-name">
                    {f.nickname}
                    {isOnline(f.last_seen) && <span className="friend-online-dot" title="En línea">●</span>}
                  </span>
                  <span className="hint guild-member-sub">
                    Nv. {f.level} · {f.class_name} · Amigos desde {formatDate(f.friends_since)}
                  </span>
                </div>
                <div className="guild-member-actions">
                  <button className="rpg-button rpg-button--small" onClick={() => openChat(f)}>
                    Chat
                  </button>
                  {coopParty?.members?.some((m) => m.id === f.id) ? (
                    <span className="hint hint-ok">✓ En tu grupo</span>
                  ) : (
                    <button
                      className="rpg-button rpg-button--small"
                      disabled={!canInviteToCoop || coopBusyId === f.id}
                      title={coopInviteDisabledReason}
                      onClick={() => handleInviteCoop(f)}
                    >
                      {coopBusyId === f.id ? 'Invitando...' : 'Invitar a grupo'}
                    </button>
                  )}
                  <button
                    className="rpg-button rpg-button--small"
                    disabled={busyKey === `rm-${f.id}`}
                    onClick={() => handleRemove(f.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="rpg-panel">
          <h3>Solicitudes recibidas</h3>
          {requests.length === 0 && <p className="hint">No tenés solicitudes pendientes.</p>}
          <div className="guild-members-list">
            {requests.map((r) => (
              <div key={r.id} className="guild-member-row guild-member-row--with-actions">
                <div className="guild-member-info">
                  <span className="guild-member-name">{r.nickname}</span>
                  <span className="hint guild-member-sub">
                    Nv. {r.level} · {r.class_name} · {formatDate(r.requested_at)}
                  </span>
                </div>
                <div className="guild-member-actions">
                  <button
                    className="rpg-button rpg-button--small"
                    disabled={busyKey === `acc-${r.id}`}
                    onClick={() => handleAccept(r.id)}
                  >
                    Aceptar
                  </button>
                  <button
                    className="rpg-button rpg-button--small"
                    disabled={busyKey === `rm-${r.id}`}
                    onClick={() => handleRemove(r.id)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <>
          <div className="craft-filter-bar">
            <button
              className={`rpg-button rpg-button--small${messagesTab === 'inbox' ? ' quest-tab--active' : ''}`}
              onClick={() => setMessagesTab('inbox')}
            >
              Recibidos
            </button>
            <button
              className={`rpg-button rpg-button--small${messagesTab === 'sent' ? ' quest-tab--active' : ''}`}
              onClick={() => setMessagesTab('sent')}
            >
              Enviados
            </button>
          </div>

          <div className="rpg-panel">
            {messagesTab === 'inbox' && (
              <>
                {inbox === null && <p className="hint">Cargando...</p>}
                {inbox !== null && inbox.length === 0 && <p className="hint">Bandeja vacía.</p>}
                {inbox !== null && inbox.length > 0 && (
                  <div className="guild-members-list">
                    {inbox.map((m) => (
                      <div key={m.id} className="guild-member-row guild-member-row--with-actions">
                        <div className="guild-member-info">
                          <span className="guild-member-name">
                            {!m.read && <span className="luck-badge" style={{ marginLeft: 0, marginRight: 6 }}>Nuevo</span>}
                            {m.subject || '(Sin asunto)'} — de {m.sender_nickname}
                          </span>
                          <span className="hint guild-member-sub">
                            {formatDateTime(m.created_at)}
                            {m.gold_amount > 0 && !m.gold_claimed && ` · 🪙 ${m.gold_amount} sin reclamar`}
                            {m.has_unclaimed_items && ' · 🎁 items sin reclamar'}
                          </span>
                        </div>
                        <div className="guild-member-actions">
                          <button className="rpg-button rpg-button--small" onClick={() => handleOpenMessage(m)}>
                            Abrir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {messagesTab === 'sent' && (
              <>
                {sent === null && <p className="hint">Cargando...</p>}
                {sent !== null && sent.length === 0 && <p className="hint">No enviaste mensajes.</p>}
                {sent !== null && sent.length > 0 && (
                  <div className="guild-members-list">
                    {sent.map((m) => (
                      <div key={m.id} className="guild-member-row guild-member-row--with-actions">
                        <div className="guild-member-info">
                          <span className="guild-member-name">{m.subject || '(Sin asunto)'} — para {m.receiver_nickname}</span>
                          <span className="hint guild-member-sub">
                            {formatDateTime(m.created_at)} · {m.read ? 'Leído' : 'No leído'}
                            {m.gold_amount > 0 && ` · 🪙 ${m.gold_amount}`}
                          </span>
                        </div>
                        <div className="guild-member-actions">
                          <button className="rpg-button rpg-button--small" onClick={() => handleOpenMessage(m)}>
                            Abrir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Modal: buscar y agregar amigos ── */}
      {showAddFriend && (
        <div className="modal-overlay" onClick={() => setShowAddFriend(false)}>
          <div className="modal-panel rpg-panel" onClick={(e) => e.stopPropagation()}>
            <button className="craft-result-close" onClick={() => setShowAddFriend(false)} aria-label="Cerrar">×</button>
            <h3>Buscar jugadores</h3>
            <form onSubmit={handleSearch} className="craft-row" style={{ marginBottom: 10 }}>
              <input
                type="text"
                className="rpg-input"
                placeholder="Nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button className="rpg-button rpg-button--small" disabled={searching} type="submit">
                {searching ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
            {searchResults !== null && (
              <div className="guild-members-list">
                {searchResults.length === 0 && <p className="hint">Sin resultados.</p>}
                {searchResults.map((p) => (
                  <div key={p.id} className="guild-member-row guild-member-row--with-actions">
                    <div className="guild-member-info">
                      <span className="guild-member-name">{p.nickname}</span>
                      <span className="hint guild-member-sub">Nv. {p.level} · {p.class_name}</span>
                    </div>
                    <div className="guild-member-actions">
                      {p.friendship_status === 'ACCEPTED' && <span className="hint">Ya son amigos</span>}
                      {p.friendship_status === 'PENDING' && p.friendship_direction === 'sent' && (
                        <span className="hint">Solicitud enviada</span>
                      )}
                      {p.friendship_status === 'PENDING' && p.friendship_direction === 'received' && (
                        <button
                          className="rpg-button rpg-button--small"
                          disabled={busyKey === `acc-${p.id}`}
                          onClick={() => handleAccept(p.id)}
                        >
                          Aceptar
                        </button>
                      )}
                      {!p.friendship_status && (
                        <button
                          className="rpg-button rpg-button--small"
                          disabled={busyKey === `req-${p.id}`}
                          onClick={() => handleSendRequest(p)}
                        >
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: detalle de mensaje (claim / delete) ── */}
      {openMessage && (
        <div className="modal-overlay" onClick={closeMessageDetail}>
          <div className="modal-panel rpg-panel" onClick={(e) => e.stopPropagation()}>
            <button className="craft-result-close" onClick={closeMessageDetail} aria-label="Cerrar">×</button>
            <h3>{openMessage.subject || '(Sin asunto)'}</h3>
            <p className="hint">
              {openMessage.receiver_id === player.id ? `De: ${openMessage.sender_nickname}` : 'Enviado'} · {formatDateTime(openMessage.created_at)}
            </p>
            {openMessage.body && <p style={{ whiteSpace: 'pre-wrap' }}>{openMessage.body}</p>}
            {openMessage.gold_amount > 0 && (
              <p className="hint">
                🪙 {openMessage.gold_amount} oro {openMessage.gold_claimed ? '(reclamado)' : '(sin reclamar)'}
              </p>
            )}
            {openMessage.items?.length > 0 && (
              <div className="craft-ingredients">
                {openMessage.items.map((it) => (
                  <span key={it.id} className="craft-ingredient">
                    {it.item_name} x{it.quantity} · {RARITY_LABELS[it.rarity] || it.rarity} {it.claimed ? '(reclamado)' : ''}
                  </span>
                ))}
              </div>
            )}
            <div className="craft-row" style={{ marginTop: 12 }}>
              {openMessage.receiver_id === player.id
                && ((openMessage.gold_amount > 0 && !openMessage.gold_claimed) || openMessage.items?.some((it) => !it.claimed)) && (
                <button className="rpg-button" disabled={busyKey === 'claim'} onClick={() => handleClaim(openMessage.id)}>
                  {busyKey === 'claim' ? 'Reclamando...' : 'Reclamar'}
                </button>
              )}
              <button className="rpg-button rpg-button--small" disabled={busyKey === 'delete'} onClick={() => handleDeleteMessage(openMessage.id)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat con un amigo ── */}
      {chatWith && (
        <div className="modal-overlay" onClick={closeChat}>
          <div className="modal-panel rpg-panel chat-panel" onClick={(e) => e.stopPropagation()}>
            <button className="craft-result-close" onClick={closeChat} aria-label="Cerrar">×</button>
            <div className="chat-header">
              <span className="chat-avatar">{chatWith.nickname[0]?.toUpperCase()}</span>
              <div className="chat-header-info">
                <h3>{chatWith.nickname}</h3>
                <span className={`chat-status${isOnline(chatWith.last_seen) ? ' chat-status--online' : ''}`}>
                  {isOnline(chatWith.last_seen) ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>

            <div className="chat-thread" ref={chatThreadRef}>
              {chatThread === null && <p className="hint">Cargando...</p>}
              {chatThread !== null && chatThread.length === 0 && (
                <p className="hint">Todavía no se mandaron mensajes. ¡Escribí el primero!</p>
              )}
              {chatThread?.map((m) => (
                <div
                  key={m.id}
                  className={`chat-bubble ${m.mine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}
                  onClick={() => handleOpenMessage(m)}
                  title="Ver detalle"
                >
                  {m.body && <span>{m.body}</span>}
                  {!m.body && !m.mine && <span className="hint">🎁 Te mandó un regalo</span>}
                  {!m.body && m.mine && <span className="hint">🎁 Regalo enviado</span>}
                  <span className="chat-bubble-meta">
                    {formatDateTime(m.created_at)}
                    {m.gold_amount > 0 && ` · 🪙 ${m.gold_amount}${m.gold_claimed ? '' : ' (sin reclamar)'}`}
                    {!m.mine && m.has_unclaimed_items && ' · 🎁 items'}
                  </span>
                </div>
              ))}
              {friendTyping && (
                <div className="chat-bubble chat-bubble--theirs chat-bubble--typing">
                  <span className="typing-dots"><span></span><span></span><span></span></span>
                </div>
              )}
            </div>

            <div className="chat-compose">
              <div className="craft-row" style={{ marginTop: 0 }}>
                <input
                  type="text"
                  className="rpg-input"
                  placeholder="Escribí un mensaje..."
                  value={composeBody}
                  onChange={(e) => handleComposeBodyChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                  style={{ flex: 1 }}
                />
                <button
                  className={`rpg-button rpg-button--small${showAttachments ? ' quest-tab--active' : ''}`}
                  onClick={() => setShowAttachments((s) => !s)}
                  title="Adjuntar oro o items"
                  type="button"
                >
                  🎁
                </button>
                <button className="rpg-button rpg-button--small" disabled={busyKey === 'send-message'} onClick={handleSendChatMessage}>
                  {busyKey === 'send-message' ? '...' : 'Enviar'}
                </button>
              </div>

              {showAttachments && (
                <div style={{ marginTop: 10 }}>
                  <label className="hint">Oro a enviar</label>
                  <input
                    type="number"
                    min={0}
                    className="rpg-input"
                    value={composeGold}
                    onChange={(e) => setComposeGold(e.target.value)}
                    style={{ width: 120, display: 'block', margin: '4px 0 10px' }}
                  />

                  <label className="hint">Adjuntar items</label>
                  {composeItems.length > 0 && (
                    <div className="craft-ingredients" style={{ margin: '6px 0' }}>
                      {composeItems.map((i) => (
                        <span key={i.key} className="craft-ingredient">
                          {i.name}
                          <input
                            type="number"
                            min={1}
                            max={i.max}
                            value={i.sendQty}
                            onChange={(e) => updateComposeItemQty(i.key, e.target.value)}
                            className="rpg-input"
                            style={{ width: 44, marginLeft: 6, padding: '2px 4px' }}
                          />
                          <button
                            className="craft-result-close"
                            style={{ position: 'static', marginLeft: 4 }}
                            onClick={() => removeComposeItem(i.key)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {playerInventory === null && <p className="hint">Cargando inventario...</p>}
                  {playerInventory !== null && (
                    <div className="guild-members-list" style={{ maxHeight: 130, overflowY: 'auto' }}>
                      {playerInventory.map((it) => (
                        <div key={`${it.item_id}-${it.enchant_level}-${it.quality_tier}`} className="guild-member-row">
                          <div className="guild-member-info">
                            <span className="guild-member-name">{it.name}</span>
                            <span className="hint guild-member-sub">{RARITY_LABELS[it.rarity] || it.rarity} · x{it.quantity}</span>
                          </div>
                          <button className="rpg-button rpg-button--small" onClick={() => addComposeItem(it)}>+</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
