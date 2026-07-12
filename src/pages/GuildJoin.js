import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function GuildJoin() {
  const { token } = useAuth();
  const [myGuild, setMyGuild] = useState(undefined);
  const [guilds, setGuilds] = useState(null);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getMyGuild(token)
      .then(setMyGuild)
      .catch(() => setMyGuild(null));
    loadGuilds('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadGuilds(q) {
    setError('');
    try {
      const result = await api.getGuilds(token, q);
      setGuilds(result);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadGuilds(search);
  }

  async function handleJoin(guild) {
    setError('');
    setMessage('');
    setJoiningId(guild.id);
    try {
      const result = await api.joinGuild(token, guild.id);
      setMessage(result.message);
      const mine = await api.getMyGuild(token).catch(() => null);
      setMyGuild(mine);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleRequest(guild) {
    setError('');
    setMessage('');
    setRequestingId(guild.id);
    try {
      const result = await api.requestJoinGuild(token, guild.id);
      setMessage(result.message);
      setRequestedIds((prev) => new Set([...prev, guild.id]));
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestingId(null);
    }
  }

  if (myGuild === undefined) return <div className="dashboard-loading">Cargando...</div>;
  if (myGuild) return <Navigate to="/guild/my" replace />;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🤝 Unirse a un Gremio</h1>
          <p className="dashboard-subtitle">Buscá un gremio existente para unirte</p>
        </div>
        <Link className="logout-btn" to="/guild">
          Volver
        </Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <form className="guild-search-row" onSubmit={handleSearch}>
        <input
          className="rpg-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar gremio por nombre..."
        />
        <button className="rpg-button" type="submit">
          Buscar
        </button>
      </form>

      {guilds === null && <div className="dashboard-loading">Cargando gremios...</div>}
      {guilds && guilds.length === 0 && (
        <p className="hint">No se encontraron gremios{search ? ` para "${search}"` : ''}.</p>
      )}
      {guilds && guilds.length > 0 && (
        <div className="zone-list">
          {guilds.map((g) => {
            const alreadyRequested = requestedIds.has(g.id);
            return (
              <div key={g.id} className="zone-card rpg-panel">
                <div className="zone-card-header">
                  <h3>{g.name}</h3>
                  <span className="hint">Nv. {g.level}</span>
                </div>
                {g.description && <p className="zone-description">{g.description}</p>}
                <p className="hint">
                  Líder: {g.leaderName} · {g.memberCount} miembro(s) ·{' '}
                  {g.type === 'OPEN' ? '🔓 Abierto' : '🔒 Cerrado'}
                </p>
                {g.type === 'OPEN' ? (
                  <button
                    className="rpg-button"
                    disabled={joiningId === g.id}
                    onClick={() => handleJoin(g)}
                  >
                    {joiningId === g.id ? 'Uniéndose...' : 'Unirse'}
                  </button>
                ) : (
                  <button
                    className="rpg-button"
                    disabled={requestingId === g.id || alreadyRequested}
                    title="El líder deberá aceptar tu solicitud"
                    onClick={() => handleRequest(g)}
                  >
                    {requestingId === g.id
                      ? 'Enviando...'
                      : alreadyRequested
                      ? '✓ Solicitud enviada'
                      : 'Solicitar ingreso'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
