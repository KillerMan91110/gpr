import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CREATE_COST = 50000;

export default function GuildCreate() {
  const { player, token } = useAuth();
  const navigate = useNavigate();
  const [myGuild, setMyGuild] = useState(undefined);
  const [gold, setGold] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('OPEN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!player) return;
    Promise.all([
      api.getMyGuild(token).catch(() => null),
      api.getPlayerStats(player.id, token),
    ]).then(([guild, stats]) => {
      setMyGuild(guild);
      setGold(Number(stats.gold));
    });
  }, [player, token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.createGuild(token, { name: name.trim(), description: description.trim() || undefined, type });
      setSuccess(`¡Gremio "${result.name}" creado exitosamente!`);
      setTimeout(() => navigate('/guild'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (myGuild === undefined) return <div className="dashboard-loading">Cargando...</div>;
  if (myGuild) return <Navigate to="/guild/my" replace />;

  const canAfford = gold !== null && gold >= CREATE_COST;
  const nameValid = name.trim().length >= 3;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🏗 Crear Gremio</h1>
          <p className="dashboard-subtitle">
            Funda tu propio gremio · Costo: {CREATE_COST.toLocaleString()} 🪙
          </p>
        </div>
        <Link className="logout-btn" to="/guild">
          Volver
        </Link>
      </header>

      {myGuild && (
        <div className="rpg-panel">
          <p>
            Ya perteneces al gremio <strong>{myGuild.name}</strong>.
          </p>
          <p className="hint">Tienes que salir de tu gremio actual para poder crear uno nuevo.</p>
        </div>
      )}

      {!myGuild && (
        <form className="rpg-panel guild-form" onSubmit={handleCreate}>
          {error && <p className="auth-error">{error}</p>}
          {success && <p className="hint hint-ok infirmary-message">{success}</p>}

          <div className="guild-form-group">
            <label className="guild-form-label">Nombre del gremio</label>
            <input
              className="rpg-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              placeholder="Entre 3 y 50 caracteres"
            />
          </div>

          <div className="guild-form-group">
            <label className="guild-form-label">Descripción (opcional)</label>
            <textarea
              className="rpg-input rpg-input--textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Cuenta de qué se trata tu gremio..."
            />
          </div>

          <div className="guild-form-group">
            <label className="guild-form-label">Tipo de gremio</label>
            <div className="guild-type-options">
              <label className="guild-type-option">
                <input
                  type="radio"
                  value="OPEN"
                  checked={type === 'OPEN'}
                  onChange={() => setType('OPEN')}
                />
                <span>
                  <strong>Abierto</strong> — cualquiera puede unirse
                </span>
              </label>
              <label className="guild-type-option">
                <input
                  type="radio"
                  value="CLOSED"
                  checked={type === 'CLOSED'}
                  onChange={() => setType('CLOSED')}
                />
                <span>
                  <strong>Cerrado</strong> — solo por invitación
                </span>
              </label>
            </div>
          </div>

          <div className="guild-form-footer">
            <span className={canAfford ? 'hint' : 'auth-error'}>
              Tu oro: {gold !== null ? Number(gold).toLocaleString() : '...'} 🪙
              {!canAfford && gold !== null && ` · Faltan ${(CREATE_COST - gold).toLocaleString()} 🪙`}
            </span>
            <button
              className="rpg-button"
              type="submit"
              disabled={loading || !canAfford || !nameValid}
            >
              {loading ? 'Creando...' : 'Crear Gremio'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
