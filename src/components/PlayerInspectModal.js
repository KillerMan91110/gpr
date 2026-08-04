import { useEffect, useState } from 'react';
import { api } from '../api/client';
import GameIcon from './GameIcon';
import { CLASS_ICON } from '../utils/classIcons';

const SLOT_LABEL = {
  WEAPON: 'Arma', OFFHAND: 'Mano izquierda', HELMET: 'Casco',
  ARMOR: 'Pechera', GLOVES: 'Guantes', BOOTS: 'Botas', ACCESSORY: 'Accesorio',
};
const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };
const STAT_FIELDS = [
  { label: 'HP', key: 'hp' },
  { label: 'ATK', key: 'atk' },
  { label: 'DEF', key: 'def' },
  { label: 'MAG', key: 'mag' },
  { label: 'MDEF', key: 'magicDef' },
  { label: 'SPD', key: 'spd' },
  { label: 'CRIT', key: 'crit', suffix: '%' },
];

function formatSince(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'long' });
}

export default function PlayerInspectModal({ player, token, targetId, onClose }) {
  const [data, setData] = useState(undefined); // undefined = cargando, null = error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.inspectPlayer(player.id, targetId, token)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) { setError(err.message); setData(null); } });
    return () => { cancelled = true; };
  }, [player, targetId, token]);

  const classIcon = data ? (CLASS_ICON[data.className] || CLASS_ICON[data.className?.toUpperCase()]) : null;
  const totalFights = data ? data.general.combatWins + data.general.combatLosses : 0;
  const winRate = totalFights > 0 ? Math.round((data.general.combatWins / totalFights) * 100) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel rpg-panel inspect-panel" onClick={(e) => e.stopPropagation()}>
        <button className="craft-result-close" onClick={onClose} aria-label="Cerrar">×</button>

        {data === undefined && <p className="dashboard-loading">Cargando...</p>}
        {data === null && <p className="auth-error">{error || 'No se pudo cargar este jugador.'}</p>}

        {data && (
          <>
            <div className="inspect-header">
              <span className="inspect-class-icon">{classIcon ? <GameIcon {...classIcon} /> : '◆'}</span>
              <div className="inspect-header-info">
                <h3 className="inspect-name">{data.nickname}</h3>
                <p className="inspect-sub">
                  Nv. {data.level} · {data.className}
                  {data.rank && <span className="inspect-rank-badge">Rango {data.rank}</span>}
                </p>
                {formatSince(data.createdAt) && (
                  <p className="inspect-since">En Etheria desde {formatSince(data.createdAt)}</p>
                )}
              </div>
            </div>

            <div className="inspect-section">
              <p className="inspect-section-title">Estadísticas</p>
              <div className="npc-stats-grid">
                {STAT_FIELDS.map(({ label, key, suffix }) => (
                  <div key={key} className="npc-stat">
                    <span className="npc-stat-label">{label}</span>
                    <span className="npc-stat-value">{data.stats[key]}{suffix || ''}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="inspect-section">
              <p className="inspect-section-title">Trayectoria</p>
              <div className="inspect-general-row">
                <span className="inspect-general-chip">
                  <GameIcon name="crossed-swords" artist="lorc" /> {data.general.combatWins} victorias
                </span>
                <span className="inspect-general-chip">
                  <GameIcon name="death-skull" artist="sbed" /> {data.general.combatLosses} derrotas
                </span>
                {winRate != null && <span className="inspect-general-chip inspect-general-chip--rate">{winRate}% de victorias</span>}
                <span className="inspect-general-chip">
                  <GameIcon name="crown" artist="lorc" /> {data.general.bossKills} jefes derrotados
                </span>
              </div>
            </div>

            <div className="inspect-section">
              <p className="inspect-section-title">Gremio</p>
              {data.guild ? (
                <p className="inspect-guild">
                  <span className={`inspect-role-badge inspect-role-badge--${data.guild.role.toLowerCase()}`}>
                    {ROLE_LABEL[data.guild.role] || data.guild.role}
                  </span>
                  {' '}de <strong>{data.guild.name}</strong>
                </p>
              ) : (
                <p className="hint">Sin gremio.</p>
              )}
            </div>

            <div className="inspect-section">
              <p className="inspect-section-title">Equipo</p>
              {data.equipment.length === 0 && <p className="hint">Sin equipo puesto.</p>}
              {data.equipment.length > 0 && (
                <div className="inspect-equip-list">
                  {data.equipment.map((eq) => (
                    <div key={eq.slot} className="inspect-equip-row">
                      <span className="inspect-equip-slot">{SLOT_LABEL[eq.slot] || eq.slot}</span>
                      <span className={`equipment-item-name rarity-${(eq.rarity || 'comun').toLowerCase()}`}>
                        {eq.itemName}
                        {eq.enchantLevel > 0 && <span className="enchant-badge">+{eq.enchantLevel}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.companions.length > 0 && (
              <div className="inspect-section">
                <p className="inspect-section-title">Acompañantes</p>
                <div className="inspect-companions">
                  {data.companions.map((npc, i) => (
                    <div key={i} className="inspect-companion-card">
                      <p className="inspect-companion-name">
                        {npc.name} <span className="hint">Nv. {npc.level} · {npc.className}</span>
                      </p>
                      {npc.equipment.length > 0 ? (
                        <div className="inspect-companion-equip">
                          {npc.equipment.map((eq) => (
                            <span key={eq.slot} className={`equipment-item-name rarity-${(eq.rarity || 'comun').toLowerCase()}`}>
                              {eq.itemName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="hint">Sin equipo puesto.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
