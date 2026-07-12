import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CLASS_ICONS = {
  GUERRERO: '⚔',
  MAGO: '🔮',
  ARQUERO: '🏹',
  PICARO: '🗡',
  SACERDOTE: '✨',
};

export default function GuildMasters() {
  const { player, token } = useAuth();
  const [classes, setClasses] = useState(null);
  const [myClassId, setMyClassId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    Promise.all([api.getClasses(), api.getPlayerStats(player.id, token)])
      .then(([allClasses, stats]) => {
        setClasses(allClasses.filter((c) => c.id <= 5));
        setMyClassId(stats.class.id);
      })
      .catch((err) => setError(err.message));
  }, [player, token]);

  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!classes) return <div className="dashboard-loading">Cargando...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🎓 Maestros de Gremio</h1>
          <p className="dashboard-subtitle">
            Cada clase base tiene su propio maestro. Solo el de tu clase puede enseñarte skills.
          </p>
        </div>
        <Link className="logout-btn" to="/guild">
          Volver
        </Link>
      </header>

      <div className="zone-list">
        {classes.map((c) => (
          <Link key={c.id} to={`/guild/masters/${c.id}`} className="zone-card rpg-panel guild-section-link">
            <div className="zone-card-header">
              <h3>
                {CLASS_ICONS[c.code] || '🎓'} Maestro {c.name}
              </h3>
              {c.id === myClassId && <span className="hint hint-ok">Tu clase</span>}
            </div>
            <p className="zone-description">
              {c.role}
              {c.description ? ` — ${c.description}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
