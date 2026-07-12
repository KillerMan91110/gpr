import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };
const ONLINE_MS = 5 * 60 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

export default function GuildMy() {
  const { token, player } = useAuth();
  const navigate = useNavigate();
  const [guild, setGuild] = useState(null);
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
  const [editLoading, setEditLoading] = useState(false);

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
    setEditing(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    clearMsg();
    setEditLoading(true);
    try {
      await api.editGuild(token, guild.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        type: editType,
      });
      setMessage('Gremio actualizado.');
      setEditing(false);
      await refreshGuild();
    } catch (err) { setError(err.message); }
    finally { setEditLoading(false); }
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🏛 {guild.name}</h1>
          <p className="dashboard-subtitle">
            Nivel {guild.level} ·{' '}
            {guild.type === 'OPEN' ? '🔓 Abierto' : '🔒 Cerrado'} ·{' '}
            Rol: {ROLE_LABEL[guild.myRole] ?? guild.myRole}
          </p>
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
          <span className="guild-xp-label">Experiencia del gremio</span>
          <span className="hint">
            {guild.xp.toLocaleString()} / {guild.xpToNextLevel.toLocaleString()} XP
          </span>
        </div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill xp" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      {/* Info del gremio */}
      <div className="rpg-panel guild-info-panel">
        {!editing ? (
          <>
            <p className="hint guild-type-desc">
              {guild.type === 'OPEN'
                ? '🔓 Gremio abierto — cualquier aventurero puede unirse libremente.'
                : '🔒 Gremio cerrado — el acceso es solo mediante solicitud que el líder acepta o rechaza.'}
            </p>
            {guild.description && (
              <p className="zone-description guild-description">{guild.description}</p>
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
                    {isSelf && <span className="guild-member-self"> (vos)</span>}
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
                      {isOnline(m.last_seen_at) ? '● En línea' : '○ Offline'}
                    </span>
                  )}
                  <span className="guild-member-role hint">
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

      {/* Salir / Disolver */}
      <div className="rpg-panel">
        {isLeader ? (
          <>
            <p className="hint">
              Sos el líder. Transferí el liderazgo para poder salir, o disolví el gremio.
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
