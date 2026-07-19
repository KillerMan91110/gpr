import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function lockReason(zone, index, zones) {
  if (index === 0) return null;
  const previous = zones[index - 1];
  return `Requiere derrotar al jefe de "${previous.name}" o llegar a nivel ${zone.minLevel}.`;
}

// La zona recomendada es la ÚLTIMA desbloqueada cuyo jefe todavía no cayó (no la primera):
// el back desbloquea zonas tanto por jefe derrotado como por nivel, así que si vas subiendo
// de nivel sin pararte a matar jefes, puede haber varias zonas "desbloqueadas y sin jefe" a
// la vez — la más avanzada de esas es la que le corresponde a tu nivel actual, no la vieja.
function recommendedZoneId(zones) {
  const candidates = zones.filter((z) => z.unlocked && !z.bossDefeated);
  return candidates.length ? candidates[candidates.length - 1].id : null;
}

function ZoneProgress({ monsters, discovered }) {
  if (!monsters || !monsters.length) return null;

  const total = monsters.length;
  const found = monsters.filter((m) => discovered.has(m.id)).length;
  const percent = Math.round((found / total) * 100);

  return (
    <div className="zone-progress">
      <div className="stat-bar-label">
        <span>Especies descubiertas</span>
        <span>{found} / {total} <span className="stat-bar-percent">({percent}%)</span></span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill zone-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ZoneEnemies({ monsters, discovered }) {
  if (!monsters) return <p className="hint">Cargando enemigos...</p>;
  if (!monsters.length) return null;

  const nameFor = (m) => (discovered.has(m.id) ? m.name : '???');

  const boss = monsters.find((m) => m.rarity === 'LEGENDARY');
  const common = monsters.filter((m) => m.rarity !== 'LEGENDARY');

  return (
    <div className="zone-enemies">
      <p className="zone-enemies-label">Enemigos</p>
      <div className="zone-enemies-tags">
        {common.map((m) => (
          <span key={m.id} className={`zone-enemy-tag monster-rarity-${m.rarity.toLowerCase()}`}>
            {nameFor(m)}
          </span>
        ))}
      </div>
      {boss && (
        <p className="zone-boss-name">⚠ Jefe de zona: <strong>{nameFor(boss)}</strong></p>
      )}
    </div>
  );
}

function ZoneRewards({ monsters }) {
  if (!monsters || !monsters.length) return null;

  const xpValues = monsters.map((m) => m.xp_reward).filter((v) => v != null);
  const goldValues = monsters.map((m) => m.gold_reward).filter((v) => v != null);
  if (!xpValues.length && !goldValues.length) return null;

  const range = (values) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `${min}` : `${min}-${max}`;
  };

  return (
    <p className="zone-rewards">
      Recompensas por enemigo: ⭐ {range(xpValues)} XP · 🪙 {range(goldValues)} Oro
    </p>
  );
}

export default function Zones() {
  const { player, token } = useAuth();
  const [zones, setZones] = useState(null);
  const [zoneMonsters, setZoneMonsters] = useState({});
  const [discovered, setDiscovered] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getPlayerZones(player.id, token)
      .then(setZones)
      .catch((err) => setError(err.message));
    api.getBestiary(player.id, token)
      .then((ids) => setDiscovered(new Set(ids)))
      .catch(() => setDiscovered(new Set()));
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
                <ZoneProgress monsters={zoneMonsters[zone.id]} discovered={discovered} />
                <ZoneEnemies monsters={zoneMonsters[zone.id]} discovered={discovered} />
                <ZoneRewards monsters={zoneMonsters[zone.id]} />
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
