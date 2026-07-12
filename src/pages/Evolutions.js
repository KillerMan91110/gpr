import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function requirementMark(req) {
  if (req.met) return '✓';
  if (req.available === false) return '…';
  return '✗';
}

function requirementClass(req) {
  if (req.met) return 'evo-req--met';
  if (req.available === false) return 'evo-req--untracked';
  return 'evo-req--unmet';
}

export default function Evolutions() {
  const { player, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [evolving, setEvolving] = useState(null);

  async function load() {
    const [statsResult, evoResult] = await Promise.all([
      api.getPlayerStats(player.id, token),
      api.getEvolutions(player.id, token),
    ]);
    setStats(statsResult);
    setData(evoResult);
  }

  useEffect(() => {
    if (!player) return;
    load().catch((err) => setError(err.message));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEvolve(evolutionId, className) {
    setError('');
    setMessage('');
    setEvolving(evolutionId);
    try {
      await api.evolve(player.id, evolutionId, token);
      setMessage(`¡Evolucionaste a ${className}!`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setEvolving(null);
    }
  }

  if (!data && !error) return <div className="dashboard-loading">Cargando...</div>;

  const evolutions = data?.evolutions || [];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>⬆ Evoluciones</h1>
          <p className="dashboard-subtitle">Los próximos pasos posibles desde tu clase actual.</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      {stats && (
        <div className="evo-path rpg-panel">
          <div className="evo-path-node">
            <span className="evo-path-node-name">{stats.class.name}</span>
            {!stats.evolution?.name && <span className="evo-path-node-tag">Actual</span>}
          </div>
          {stats.evolution?.name && (
            <>
              <span className="evo-path-arrow">→</span>
              <div className="evo-path-node evo-path-node--active">
                <span className="evo-path-node-name">{stats.evolution.name}</span>
                <span className="evo-path-node-tag">Actual</span>
              </div>
            </>
          )}
          <span className="evo-path-level">Nv. {data?.level ?? stats.level}</span>
        </div>
      )}

      <h2 className="evo-section-title">Rama de evolución</h2>

      {evolutions.length === 0 && (
        <div className="rpg-panel">
          <p className="hint">Todavía no hay evoluciones disponibles desde tu clase actual.</p>
        </div>
      )}

      <div className="evo-branch-grid">
        {evolutions.map((evo) => (
          <div
            key={evo.evolutionId}
            className={`evo-node-card rpg-panel${evo.canEvolve ? ' evo-node-card--ready' : ''}`}
          >
            <div className="evo-node-card-header">
              <h3>{evo.toClassName}</h3>
              {evo.toClassRole && <span className="evo-node-role">{evo.toClassRole}</span>}
            </div>

            {evo.description && <p className="evo-node-desc">{evo.description}</p>}

            <ul className="evo-requirements">
              <li className={`evo-req ${evo.levelMet ? 'evo-req--met' : 'evo-req--unmet'}`}>
                {evo.levelMet ? '✓' : '✗'} Nivel {evo.requiredLevel}
              </li>
              {evo.requirements.map((req, i) => (
                <li key={i} className={`evo-req ${requirementClass(req)}`}>
                  {requirementMark(req)} {req.description}
                </li>
              ))}
            </ul>

            {evo.canEvolve ? (
              <button
                className="rpg-button"
                disabled={!!evolving}
                onClick={() => handleEvolve(evo.evolutionId, evo.toClassName)}
              >
                {evolving === evo.evolutionId ? 'Evolucionando...' : `Evolucionar a ${evo.toClassName}`}
              </button>
            ) : (
              <p className="evo-node-status">
                {evo.requirements.some((r) => r.available === false)
                  ? 'Hay un requisito que todavía no se puede rastrear'
                  : 'Requisitos incompletos'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
