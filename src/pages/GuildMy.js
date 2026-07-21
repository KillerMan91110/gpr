import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };
const ONLINE_MS = 5 * 60 * 1000;
const DEPOSIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Deben coincidir exactamente con GUILD_EMBLEMS / GUILD_COLORS de lib/guilds.js en el back.
const GUILD_EMBLEMS = ['🐉', '🦁', '⚔️', '🛡️', '🔥', '❄️', '👑', '🦅', '🐺', '☠️', '⭐', '🌙'];
const GUILD_COLORS = ['#d4af37', '#e0394f', '#4fa0e0', '#5fd97e', '#b572e0', '#f0a93a', '#7a1020', '#143a66', '#ece3cf', '#b9b3c4'];

function formatDaysAgo(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return 'Fundado hoy';
  if (days === 1) return 'Fundado ayer';
  return `Fundado hace ${days} días`;
}

function describeActivity(entry) {
  const actor = entry.actor_nickname ?? 'Alguien';
  const target = entry.target_nickname ?? 'un miembro';
  const meta = entry.meta ?? {};
  switch (entry.type) {
    case 'JOIN': return `${target} se unió al gremio.`;
    case 'LEAVE': return `${actor} abandonó el gremio.`;
    case 'KICK': return `${actor} expulsó a ${target}.`;
    case 'PROMOTE': return `${actor} ascendió a ${target} a Oficial.`;
    case 'DEMOTE': return `${actor} degradó a ${target} a Miembro.`;
    case 'TRANSFER': return `${actor} transfirió el liderazgo a ${target}.`;
    case 'EDIT': return `${actor} actualizó la información del gremio.`;
    case 'LEVEL_UP': return `El gremio subió a Nivel ${meta.newLevel ?? '?'}.`;
    case 'DONATION': return `${actor} donó ${Number(meta.amount ?? 0).toLocaleString()} de oro al banco.`;
    case 'SHOP_PURCHASE': return `${actor} compró un item de la tienda para ${target}.`;
    default: return `${actor} realizó una acción (${entry.type}).`;
  }
}

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return 'Sin datos';
  const diffMin = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `Hace ${diffDay} d`;
  const diffMonth = Math.floor(diffDay / 30);
  return `Hace ${diffMonth} mes${diffMonth > 1 ? 'es' : ''}`;
}

export default function GuildMy() {
  const { token, player } = useAuth();
  const navigate = useNavigate();
  const [guild, setGuild] = useState(null);
  const [rankPosition, setRankPosition] = useState(null);
  const [requests, setRequests] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState('OPEN');
  const [editEmblem, setEditEmblem] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [activity, setActivity] = useState(null);
  const [bank, setBank] = useState(null);
  const [shop, setShop] = useState(null);
  const [donateAmount, setDonateAmount] = useState('');
  const [donateLoading, setDonateLoading] = useState(false);
  const [buyItemId, setBuyItemId] = useState('');
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyRecipient, setBuyRecipient] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function refresh() {
      api.getMyGuild(token)
        .then((g) => {
          if (cancelled) return;
          setGuild(g);
          if (g.myRole === 'LEADER' || g.myRole === 'OFFICER') {
            api.getGuildRequests(token, g.id)
              .then((r) => { if (!cancelled) setRequests(r); })
              .catch(() => { if (!cancelled) setRequests([]); });
          }
        })
        .catch(() => { if (!cancelled) navigate('/guild', { replace: true }); });
    }

    refresh();
    const interval = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, navigate]);

  useEffect(() => {
    if (!guild?.id) return;
    let cancelled = false;
    api.getGuildLeaderboard()
      .then((rows) => {
        if (cancelled) return;
        const entry = rows.find((r) => r.id === guild.id);
        setRankPosition(entry ? entry.position : null);
      })
      .catch(() => { if (!cancelled) setRankPosition(null); });
    return () => { cancelled = true; };
  }, [guild?.id]);

  useEffect(() => {
    if (!guild?.id) return;
    let cancelled = false;
    api.getGuildActivity(token, guild.id).then((r) => { if (!cancelled) setActivity(r); }).catch(() => { if (!cancelled) setActivity([]); });
    if (guild.level >= 2) {
      api.getGuildBank(token, guild.id).then((r) => { if (!cancelled) setBank(r); }).catch(() => { if (!cancelled) setBank(null); });
      api.getGuildBankShop(token, guild.id).then((r) => { if (!cancelled) setShop(r); }).catch(() => { if (!cancelled) setShop([]); });
    }
    return () => { cancelled = true; };
  }, [token, guild?.id, guild?.level]);

  async function refreshBank() {
    const b = await api.getGuildBank(token, guild.id).catch(() => null);
    setBank(b);
  }

  async function refreshActivity() {
    const a = await api.getGuildActivity(token, guild.id).catch(() => []);
    setActivity(a);
  }

  async function refreshGuild() {
    const g = await api.getMyGuild(token);
    setGuild(g);
    if (g.myRole === 'LEADER' || g.myRole === 'OFFICER') {
      const r = await api.getGuildRequests(token, g.id).catch(() => []);
      setRequests(r);
    }
  }

  function clearMsg() { setError(''); setMessage(''); }

  async function handleAccept(requestId) {
    clearMsg();
    setActionLoading(`req-${requestId}`);
    try {
      await api.acceptGuildRequest(token, guild.id, requestId);
      setMessage('Solicitud aceptada.');
      await refreshGuild();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  async function handleReject(requestId) {
    clearMsg();
    setActionLoading(`req-${requestId}`);
    try {
      await api.rejectGuildRequest(token, guild.id, requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setMessage('Solicitud rechazada.');
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  async function handleKick(memberId) {
    clearMsg();
    setActionLoading(`kick-${memberId}`);
    try {
      const result = await api.kickGuildMember(token, guild.id, memberId);
      setMessage(result.message);
      await refreshGuild();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  async function handlePromote(memberId, newRole) {
    clearMsg();
    setActionLoading(`promo-${memberId}`);
    try {
      const result = await api.promoteGuildMember(token, guild.id, memberId, newRole);
      setMessage(result.message);
      await refreshGuild();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  async function handleTransfer(memberId) {
    clearMsg();
    setActionLoading(`transfer-${memberId}`);
    try {
      const result = await api.transferGuildLeadership(token, guild.id, memberId);
      setMessage(result.message);
      await refreshGuild();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  async function handleLeave() {
    clearMsg();
    setLeaving(true);
    try {
      const result = await api.leaveGuild(token, guild.id);
      setMessage(result.message);
      setTimeout(() => navigate('/guild', { replace: true }), 1500);
    } catch (err) { setError(err.message); setLeaving(false); }
  }

  async function handleDissolve() {
    clearMsg();
    setActionLoading('dissolve');
    try {
      await api.dissolveGuild(token, guild.id);
      navigate('/guild', { replace: true });
    } catch (err) {
      setError(err.message);
      setActionLoading(null);
      setConfirmDissolve(false);
    }
  }

  function startEdit() {
    setEditName(guild.name);
    setEditDesc(guild.description || '');
    setEditType(guild.type);
    setEditEmblem(guild.emblem || '');
    setEditColor(guild.color || '');
    setEditing(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    clearMsg();
    setEditLoading(true);
    try {
      const body = {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        type: editType,
      };
      if (guild.level >= 3 && editEmblem) body.emblem = editEmblem;
      if (guild.level >= 3 && editColor) body.color = editColor;
      await api.editGuild(token, guild.id, body);
      setMessage('Gremio actualizado.');
      setEditing(false);
      await refreshGuild();
    } catch (err) { setError(err.message); }
    finally { setEditLoading(false); }
  }

  async function handleDonate(e) {
    e.preventDefault();
    clearMsg();
    const amount = Math.floor(Number(donateAmount));
    if (!amount || amount <= 0) { setError('Ingresá un monto válido.'); return; }
    setDonateLoading(true);
    try {
      const result = await api.depositGuildBank(token, guild.id, amount);
      setMessage(result.message);
      setDonateAmount('');
      await refreshBank();
      await refreshActivity();
    } catch (err) { setError(err.message); }
    finally { setDonateLoading(false); }
  }

  async function handleBuy(e) {
    e.preventDefault();
    clearMsg();
    if (!buyItemId || !buyRecipient) { setError('Elegí un item y un destinatario.'); return; }
    setBuyLoading(true);
    try {
      const result = await api.buyGuildBankShopItem(token, guild.id, Number(buyItemId), Number(buyQuantity) || 1, Number(buyRecipient));
      setMessage(result.message);
      setBuyItemId('');
      setBuyQuantity(1);
      setBuyRecipient('');
      await refreshBank();
      await refreshActivity();
    } catch (err) { setError(err.message); }
    finally { setBuyLoading(false); }
  }

  if (!guild) return <div className="dashboard-loading">Cargando...</div>;

  const xpPercent = guild.xpToNextLevel > 0
    ? Math.min(100, Math.round((guild.xp / guild.xpToNextLevel) * 100))
    : 100;

  const hasOnlineData = guild.members.some((m) => m.last_seen_at != null);
  const hasClassData = guild.members.some((m) => m.class_name != null);
  const pendingRequests = requests ?? [];
  const myId = String(player?.id);
  const isLeader = guild.myRole === 'LEADER';
  const isOfficer = guild.myRole === 'OFFICER';

  const xpRemaining = Math.max(0, guild.xpToNextLevel - guild.xp);

  return (
    <div className="dashboard">
      <header
        className="dashboard-header guild-header"
        style={guild.color ? { borderLeftColor: guild.color } : undefined}
      >
        <div className="guild-header-main">
          <h1>
            <span className="guild-emblem" style={guild.color ? { color: guild.color } : undefined}>
              {guild.emblem || '🏛'}
            </span>{' '}
            {guild.name}
          </h1>
          <div className="guild-header-badges">
            <span className="guild-badge guild-badge--level">Nivel {guild.level}</span>
            <span className="guild-badge">
              {guild.type === 'OPEN' ? '🔓 Abierto' : '🔒 Cerrado'}
            </span>
            <span className={`guild-badge guild-role-badge guild-role-badge--${guild.myRole}`}>
              {ROLE_LABEL[guild.myRole] ?? guild.myRole}
            </span>
            <span className="guild-badge guild-badge--members">
              👥 {guild.members.length}/{guild.memberCap}
            </span>
            {rankPosition && (
              <span className="guild-badge guild-badge--rank">🏆 Ranking #{rankPosition}</span>
            )}
            {guild.foundedAt && (
              <span className="guild-badge">🗓 {formatDaysAgo(guild.foundedAt)}</span>
            )}
          </div>
        </div>
        <Link className="logout-btn" to="/guild">
          Volver
        </Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      {/* XP del gremio */}
      <div className="rpg-panel guild-xp-panel">
        <div className="guild-xp-row">
          <span className="guild-xp-label">Experiencia del gremio · Nivel {guild.level}</span>
          <span className="hint">
            {guild.xp.toLocaleString()} / {guild.xpToNextLevel.toLocaleString()} XP ({xpPercent}%)
          </span>
        </div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill xp" style={{ width: `${xpPercent}%` }} />
        </div>
        <span className="hint guild-xp-remaining">
          Faltan {xpRemaining.toLocaleString()} XP para subir a Nivel {guild.level + 1}
        </span>
      </div>

      <div className="guild-grid-2col">
      {/* Estadísticas rápidas */}
      <div className="rpg-panel guild-stats-panel">
        <h3 className="guild-members-title">Estadísticas</h3>
        <div className="guild-stats-list">
          <div className="guild-stat-row">
            <span className="hint">Miembros</span>
            <span>{guild.members.length} / {guild.memberCap}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Nivel</span>
            <span>{guild.level}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Tipo</span>
            <span>{guild.type === 'OPEN' ? '🔓 Abierto' : '🔒 Cerrado'}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Tu rol</span>
            <span>{ROLE_LABEL[guild.myRole] ?? guild.myRole}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Ranking</span>
            <span>{rankPosition ? `#${rankPosition}` : 'Fuera del Top 30'}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Victorias</span>
            <span>{guild.combatStats?.wins ?? 0}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Derrotas</span>
            <span>{guild.combatStats?.losses ?? 0}</span>
          </div>
          <div className="guild-stat-row">
            <span className="hint">Jefes abatidos</span>
            <span>{guild.combatStats?.bossKills ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Info del gremio / mensaje del líder */}
      <div className="rpg-panel guild-info-panel">
        {!editing ? (
          <>
            <p className="hint guild-type-desc">
              {guild.type === 'OPEN'
                ? '🔓 Gremio abierto — cualquier aventurero puede unirse libremente.'
                : '🔒 Gremio cerrado — el acceso es solo mediante solicitud que el líder acepta o rechaza.'}
            </p>
            <h3 className="guild-members-title guild-message-title">📜 Mensaje del líder</h3>
            {guild.description ? (
              <p className="zone-description guild-description guild-message-parchment">{guild.description}</p>
            ) : (
              <p className="hint">El líder aún no dejó un mensaje.</p>
            )}
            {isLeader && (
              <button className="rpg-button rpg-button--small guild-edit-btn" onClick={startEdit}>
                Editar gremio
              </button>
            )}
          </>
        ) : (
          <form className="guild-form" onSubmit={handleEditSubmit}>
            <div className="guild-form-group">
              <label className="guild-form-label">Nombre</label>
              <input
                className="rpg-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="guild-form-group">
              <label className="guild-form-label">Descripción</label>
              <textarea
                className="rpg-input rpg-input--textarea"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="guild-form-group">
              <label className="guild-form-label">Tipo</label>
              <div className="guild-type-options">
                <label className="guild-type-option">
                  <input type="radio" value="OPEN" checked={editType === 'OPEN'} onChange={() => setEditType('OPEN')} />
                  <span><strong>Abierto</strong> — cualquiera puede unirse</span>
                </label>
                <label className="guild-type-option">
                  <input type="radio" value="CLOSED" checked={editType === 'CLOSED'} onChange={() => setEditType('CLOSED')} />
                  <span><strong>Cerrado</strong> — solo por solicitud</span>
                </label>
              </div>
            </div>
            {guild.level >= 3 ? (
              <div className="guild-form-group">
                <label className="guild-form-label">Emblema</label>
                <div className="guild-emblem-options">
                  {GUILD_EMBLEMS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`guild-emblem-option${editEmblem === e ? ' guild-emblem-option--selected' : ''}`}
                      onClick={() => setEditEmblem(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <label className="guild-form-label">Color</label>
                <div className="guild-color-options">
                  {GUILD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      className={`guild-color-option${editColor === c ? ' guild-color-option--selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="hint">🔒 El emblema y color personalizados se desbloquean en Nivel 3.</p>
            )}
            <div className="guild-form-footer">
              <button type="button" className="rpg-button rpg-button--small" onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button type="submit" className="rpg-button rpg-button--small" disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>

      <div className="guild-grid-2col">
      {/* Banco de gremio */}
      <div className="rpg-panel guild-bank-panel">
        <h3 className="guild-members-title">🏦 Banco de gremio</h3>
        {guild.level < 2 ? (
          <p className="hint">🔒 Se desbloquea en Nivel 2.</p>
        ) : (
          <>
            <p className="guild-bank-gold">{(bank?.bankGold ?? guild.bankGold ?? 0).toLocaleString()} de oro</p>
            <p className="hint">Contribución semanal del gremio: {(bank?.weeklyContribution ?? 0).toLocaleString()} oro</p>
            <form className="guild-donate-form" onSubmit={handleDonate}>
              <input
                className="rpg-input"
                type="number"
                min="1"
                placeholder="Monto a donar"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                disabled={donateLoading || (bank?.myLastDonationAt && Date.now() - new Date(bank.myLastDonationAt).getTime() < DEPOSIT_COOLDOWN_MS)}
              />
              <button
                type="submit"
                className="rpg-button rpg-button--small"
                disabled={donateLoading || (bank?.myLastDonationAt && Date.now() - new Date(bank.myLastDonationAt).getTime() < DEPOSIT_COOLDOWN_MS)}
              >
                {donateLoading ? 'Donando...' : 'Donar'}
              </button>
            </form>
            {bank?.myLastDonationAt && Date.now() - new Date(bank.myLastDonationAt).getTime() < DEPOSIT_COOLDOWN_MS && (
              <p className="hint">Ya donaste hoy. Podés volver a donar en {Math.ceil((DEPOSIT_COOLDOWN_MS - (Date.now() - new Date(bank.myLastDonationAt).getTime())) / 3600000)}h.</p>
            )}
            {bank?.topContributors?.length > 0 && (
              <>
                <h4 className="guild-bank-subtitle">Top contribuyentes</h4>
                <div className="guild-bank-contributors">
                  {bank.topContributors.map((c, i) => (
                    <div key={c.playerId} className="guild-bank-contributor-row">
                      <span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {c.nickname}</span>
                      <span className="hint">{c.totalDonated.toLocaleString()} oro</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Tienda de gremio */}
      <div className="rpg-panel guild-shop-panel">
        <h3 className="guild-members-title">🛒 Tienda de gremio</h3>
        {guild.level < 2 ? (
          <p className="hint">🔒 Se desbloquea en Nivel 2.</p>
        ) : !shop?.length ? (
          <p className="hint">{shop === null ? 'Cargando...' : 'No hay items disponibles.'}</p>
        ) : (isLeader || isOfficer) ? (
          <form className="guild-buy-form" onSubmit={handleBuy}>
            <select className="rpg-input" value={buyItemId} onChange={(e) => setBuyItemId(e.target.value)} required>
              <option value="">Elegí un item...</option>
              {shop.map((it) => (
                <option key={it.id} value={it.id}>{it.name} — {Number(it.buy_price).toLocaleString()} oro</option>
              ))}
            </select>
            <input
              className="rpg-input"
              type="number"
              min="1"
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(e.target.value)}
            />
            <select className="rpg-input" value={buyRecipient} onChange={(e) => setBuyRecipient(e.target.value)} required>
              <option value="">Enviar a...</option>
              {guild.members.map((m) => (
                <option key={m.id} value={m.id}>{m.nickname}</option>
              ))}
            </select>
            <button type="submit" className="rpg-button rpg-button--small" disabled={buyLoading}>
              {buyLoading ? 'Comprando...' : 'Comprar y enviar'}
            </button>
          </form>
        ) : (
          <p className="hint">Tu líder u oficiales pueden comprar items con el oro donado y enviártelos por correo.</p>
        )}
      </div>
      </div>

      {/* Solicitudes de ingreso (LEADER y OFFICER, gremio cerrado) */}
      {(isLeader || isOfficer) && guild.type === 'CLOSED' && (
        <div className="rpg-panel">
          <h3 className="guild-members-title">
            Solicitudes de ingreso
            {pendingRequests.length > 0 && (
              <span className="guild-requests-badge">{pendingRequests.length}</span>
            )}
          </h3>
          {requests === null && <p className="hint">Cargando solicitudes...</p>}
          {pendingRequests.length === 0 && requests !== null && (
            <p className="hint">No hay solicitudes pendientes.</p>
          )}
          {pendingRequests.length > 0 && (
            <div className="guild-members-list">
              {pendingRequests.map((r) => (
                <div key={r.id} className="guild-member-row guild-request-row">
                  <div className="guild-member-info">
                    <span className="guild-member-name">{r.nickname}</span>
                    <span className="hint guild-member-sub">
                      {r.class_name ? <>{r.class_name} · </> : null}
                      Nv. {r.level}
                      {r.rank ? ` · ${r.rank}` : ''}
                    </span>
                  </div>
                  <div className="guild-request-actions">
                    <button
                      className="rpg-button rpg-button--small"
                      disabled={actionLoading === `req-${r.id}`}
                      onClick={() => handleAccept(r.id)}
                    >
                      {actionLoading === `req-${r.id}` ? '...' : 'Aceptar'}
                    </button>
                    <button
                      className="rpg-button rpg-button-danger rpg-button--small"
                      disabled={actionLoading === `req-${r.id}`}
                      onClick={() => handleReject(r.id)}
                    >
                      {actionLoading === `req-${r.id}` ? '...' : 'Rechazar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de miembros */}
      <div className="rpg-panel">
        <h3 className="guild-members-title">Miembros ({guild.members.length})</h3>
        <div className="guild-members-list">
          {guild.members.map((m) => {
            const isSelf = String(m.id) === myId;
            const canKick = !isSelf && m.role !== 'LEADER' &&
              (isLeader || (isOfficer && m.role === 'MEMBER'));
            const canPromote = !isSelf && isLeader && m.role === 'MEMBER';
            const canDemote = !isSelf && isLeader && m.role === 'OFFICER';
            const canTransfer = !isSelf && isLeader && m.role !== 'LEADER';
            const hasActions = canKick || canPromote || canDemote || canTransfer;

            return (
              <div key={m.id} className={`guild-member-row${hasActions ? ' guild-member-row--with-actions' : ''}`}>
                <div className="guild-member-info">
                  <span className="guild-member-name">
                    {m.nickname}
                    {isSelf && <span className="guild-member-self"> (tú)</span>}
                  </span>
                  <span className="hint guild-member-sub">
                    {hasClassData && <>{m.class_name ?? '—'} · </>}
                    Nv. {m.level}
                    {m.rank ? ` · ${m.rank}` : ''}
                  </span>
                </div>
                <div className="guild-member-right">
                  {hasOnlineData && (
                    <span className={`guild-member-status${isOnline(m.last_seen_at) ? ' guild-member-status--online' : ''}`}>
                      {isOnline(m.last_seen_at) ? '● En línea' : `○ ${formatLastSeen(m.last_seen_at)}`}
                    </span>
                  )}
                  <span className={`guild-role-badge guild-role-badge--${m.role}`}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </div>
                {hasActions && (
                  <div className="guild-member-actions">
                    {canPromote && (
                      <button
                        className="rpg-button rpg-button--small"
                        disabled={!!actionLoading}
                        title="Ascender a Oficial"
                        onClick={() => handlePromote(m.id, 'OFFICER')}
                      >
                        {actionLoading === `promo-${m.id}` ? '...' : '↑ Oficial'}
                      </button>
                    )}
                    {canDemote && (
                      <button
                        className="rpg-button rpg-button--small"
                        disabled={!!actionLoading}
                        title="Degradar a Miembro"
                        onClick={() => handlePromote(m.id, 'MEMBER')}
                      >
                        {actionLoading === `promo-${m.id}` ? '...' : '↓ Miembro'}
                      </button>
                    )}
                    {canTransfer && (
                      <button
                        className="rpg-button rpg-button--small"
                        disabled={!!actionLoading}
                        title="Transferir liderazgo"
                        onClick={() => handleTransfer(m.id)}
                      >
                        {actionLoading === `transfer-${m.id}` ? '...' : '👑 Liderazgo'}
                      </button>
                    )}
                    {canKick && (
                      <button
                        className="rpg-button rpg-button-danger rpg-button--small"
                        disabled={!!actionLoading}
                        title="Expulsar del gremio"
                        onClick={() => handleKick(m.id)}
                      >
                        {actionLoading === `kick-${m.id}` ? '...' : 'Expulsar'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="rpg-panel">
        <h3 className="guild-members-title">Actividad reciente</h3>
        {activity === null && <p className="hint">Cargando...</p>}
        {activity?.length === 0 && <p className="hint">Todavía no hay actividad registrada.</p>}
        {activity?.length > 0 && (
          <div className="guild-activity-list">
            {activity.map((entry) => (
              <div key={entry.id} className="guild-activity-row">
                <span>{describeActivity(entry)}</span>
                <span className="hint">{formatLastSeen(entry.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Salir / Disolver */}
      <div className="rpg-panel">
        {isLeader ? (
          <>
            <p className="hint">
              Eres el líder. Transfiere el liderazgo para poder salir, o disuelve el gremio.
            </p>
            {!confirmDissolve ? (
              <button className="rpg-button rpg-button-danger" onClick={() => setConfirmDissolve(true)}>
                Disolver gremio
              </button>
            ) : (
              <div className="guild-dissolve-confirm">
                <p className="auth-error">¿Estás seguro? Esta acción es irreversible y elimina el gremio completo.</p>
                <div className="guild-dissolve-btns">
                  <button
                    className="rpg-button rpg-button-danger"
                    disabled={actionLoading === 'dissolve'}
                    onClick={handleDissolve}
                  >
                    {actionLoading === 'dissolve' ? 'Disolviendo...' : 'Confirmar disolución'}
                  </button>
                  <button className="rpg-button rpg-button--small" onClick={() => setConfirmDissolve(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button className="rpg-button rpg-button-danger" disabled={leaving} onClick={handleLeave}>
            {leaving ? 'Saliendo...' : 'Salir del gremio'}
          </button>
        )}
      </div>
    </div>
  );
}
