import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function lockReason(zone, index, zones) {
  if (index === 0) return null;
  const previous = zones[index - 1];
  return `Requiere derrotar al jefe de "${previous.name}" o llegar a nivel ${zone.minLevel}.`;
}

export default function Zones() {
  const { player, token } = useAuth();
  const [zones, setZones] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getPlayerZones(player.id, token)
      .then(setZones)
      .catch((err) => setError(err.message));
  }, [player, token]);

  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!zones) return <div className="dashboard-loading">Cargando zonas...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>⚔ Zonas de Combate</h1>
          <p className="dashboard-subtitle">Avanza derrotando al jefe de cada zona</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      <div className="zone-list">
        {zones.map((zone, index) => (
          <div key={zone.id} className={`zone-card rpg-panel ${zone.unlocked ? '' : 'zone-locked'}`}>
            <div className="zone-card-header">
              <h3>{zone.unlocked ? zone.name : `🔒 ${zone.name}`}</h3>
              <span className="zone-level-range">Nv. {zone.levelRange}</span>
            </div>
            <p className="zone-description">{zone.description}</p>

            {zone.unlocked ? (
              <>
                <span className={`zone-boss-status ${zone.bossDefeated ? 'boss-down' : ''}`}>
                  {zone.bossDefeated ? '✓ Jefe derrotado' : '⚔ Jefe sin derrotar'}
                </span>
                <Link className="rpg-button zone-enter" to={`/combat/${zone.id}`} state={{ zone }}>
                  Entrar a la zona
                </Link>
              </>
            ) : (
              <span className="zone-lock-reason">{lockReason(zone, index, zones)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
