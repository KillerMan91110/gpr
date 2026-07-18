import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function lockReason(zone, index, zones) {
  if (index === 0) return null;
  const previous = zones[index - 1];
  return `Requiere derrotar al jefe de "${previous.name}" o llegar a nivel ${zone.minLevel}.`;
}

// La zona recomendada es la primera desbloqueada cuyo jefe todavía no cayó:
// es el frente de avance natural del jugador, sin necesitar datos nuevos del backend.
function recommendedZoneId(zones) {
  const zone = zones.find((z) => z.unlocked && !z.bossDefeated);
  return zone?.id ?? null;
}

function ZoneEnemies({ monsters }) {
  if (!monsters) return <p className="hint">Cargando enemigos...</p>;
  if (!monsters.length) return null;

  const boss = monsters.find((m) => m.rarity === 'LEGENDARY');
  const common = monsters.filter((m) => m.rarity !== 'LEGENDARY');

  return (
    <div className="zone-enemies">
      <p className="zone-enemies-label">Enemigos</p>
      <div className="zone-enemies-tags">
        {common.slice(0, 5).map((m) => (
          <span key={m.id} className={`zone-enemy-tag monster-rarity-${m.rarity.toLowerCase()}`}>
            {m.name}
          </span>
        ))}
        {common.length > 5 && <span className="hint">+{common.length - 5} más</span>}
      </div>
      {boss && (
        <p className="zone-boss-name">⚠ Jefe de zona: <strong>{boss.name}</strong></p>
      )}
    </div>
  );
}

export default function Zones() {
  const { player, token } = useAuth();
  const [zones, setZones] = useState(null);
  const [zoneMonsters, setZoneMonsters] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getPlayerZones(player.id, token)
      .then(setZones)
      .catch((err) => setError(err.message));
  }, [player, token]);

  // Enemigos por zona: se piden aparte porque es un endpoint público (no depende del jugador)
  // y así no bloquea el render inicial de las tarjetas.
  useEffect(() => {
    if (!zones) return;
    zones.filter((z) => z.unlocked).forEach((zone) => {
      if (zoneMonsters[zone.id]) return;
      api.getZoneMonsters(zone.id)
        .then((monsters) => setZoneMonsters((prev) => ({ ...prev, [zone.id]: monsters })))
        .catch(() => setZoneMonsters((prev) => ({ ...prev, [zone.id]: [] })));
    });
  }, [zones]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!zones) return <div className="dashboard-loading">Cargando zonas...</div>;

  const recommendedId = recommendedZoneId(zones);

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
        {zones.map((zone, index) => {
          const isRecommended = zone.id === recommendedId;
          return (
          <div key={zone.id} className={`zone-card rpg-panel ${zone.unlocked ? '' : 'zone-locked'}${isRecommended ? ' zone-recommended' : ''}`}>
            {isRecommended && <span className="zone-recommended-badge">★ RECOMENDADA</span>}
            <div className="zone-card-header">
              <h3>{zone.unlocked ? zone.name : `🔒 ${zone.name}`}</h3>
              <span className="zone-level-range">Nv. {zone.levelRange}</span>
            </div>
            <p className="zone-description">{zone.description}</p>

            {zone.unlocked ? (
              <>
                <ZoneEnemies monsters={zoneMonsters[zone.id]} />
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
          );
        })}
      </div>
    </div>
  );
}
