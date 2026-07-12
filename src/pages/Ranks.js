import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const RANK_COLORS = {
  F: '#b9b3c4',
  E: '#5fd97e',
  D: '#4fa0e0',
  C: '#b572e0',
  B: '#f0a93a',
  A: '#f0d878',
  S: '#e0394f',
};

function BenefitCard({ icon, label, value }) {
  return (
    <div className="rank-benefit-card">
      <span className="rank-benefit-icon">{icon}</span>
      <span className="rank-benefit-label">{label}</span>
      <strong className="rank-benefit-value">{value}</strong>
    </div>
  );
}

export default function Ranks() {
  const { player, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    Promise.all([api.getPlayerStats(player.id, token), api.getRanks()])
      .then(([s, r]) => { setStats(s); setRanks(r); })
      .catch((err) => setError(err.message));
  }, [player, token]);

  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!stats || !ranks.length) return <div className="dashboard-loading">Cargando rangos...</div>;

  const currentRankData = ranks.find((r) => r.code === stats.rank);
  const nextRankData = ranks.find((r) => Number(r.min_reputation) > stats.reputation);
  const currentRankIndex = ranks.findIndex((r) => r.code === stats.rank);

  const minRep = currentRankData ? Number(currentRankData.min_reputation) : 0;
  const into = stats.reputation - minRep;
  const needed = stats.isMaxRank ? 0 : stats.reputationForNextRank - minRep;
  const percent = stats.isMaxRank ? 100 : needed ? Math.min(100, (into / needed) * 100) : 0;

  const rankColor = RANK_COLORS[stats.rank] || '#d4af37';

  return (
    <div className="dashboard">

      {/* ── Topbar ── */}
      <div className="dashboard-topbar">
        <Link to="/" className="back-link">← Inicio</Link>
      </div>

      {/* ── Hero: rango actual ── */}
      <div className="rpg-panel dash-panel ranks-hero">
        <div className="rank-badge-large" style={{ color: rankColor }}>
          <span className="rank-badge-letter">{stats.rank}</span>
          <span className="rank-badge-name">{currentRankData?.name}</span>
        </div>

        <div className="ranks-hero-info">
          {currentRankData?.description && (
            <p className="ranks-hero-desc">{currentRankData.description}</p>
          )}

          {stats.isMaxRank ? (
            <p className="ranks-max-label">Rango máximo alcanzado</p>
          ) : (
            <div className="ranks-progress-block">
              <div className="ranks-progress-label">
                <span>Reputación hacia {nextRankData?.name}</span>
                <span>{stats.reputation.toLocaleString()} / {stats.reputationForNextRank?.toLocaleString()}</span>
              </div>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${percent}%`, background: rankColor, boxShadow: `0 0 8px ${rankColor}88` }}
                />
              </div>
              <p className="ranks-next-hint">
                Faltan <strong>{(stats.reputationForNextRank - stats.reputation).toLocaleString()}</strong> pts para{' '}
                <strong>{nextRankData?.name} ({nextRankData?.code})</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Beneficios actuales ── */}
      <p className="ranks-section-title">Beneficios Actuales</p>
      <div className="ranks-benefits-grid">
        <BenefitCard
          icon="⚡"
          label="Bonus XP"
          value={currentRankData?.xp_bonus_percent > 0 ? `+${currentRankData.xp_bonus_percent}%` : '—'}
        />
        <BenefitCard
          icon="🏪"
          label="Descuento Tienda"
          value={currentRankData?.shop_discount_percent > 0 ? `-${currentRankData.shop_discount_percent}%` : '—'}
        />
        <BenefitCard
          icon="💰"
          label="Bonus Recompensas"
          value={currentRankData?.reward_bonus_percent > 0 ? `+${currentRankData.reward_bonus_percent}%` : '—'}
        />
        <BenefitCard
          icon="🎒"
          label="Slots Extra"
          value={currentRankData?.extra_inventory_slots > 0 ? `+${currentRankData.extra_inventory_slots}` : '—'}
        />
      </div>

      {/* ── Tabla de rangos ── */}
      <p className="ranks-section-title">Tabla de Rangos</p>
      <div className="rpg-panel dash-panel ranks-table">
        {ranks.map((rank, idx) => {
          const isCurrent = rank.code === stats.rank;
          const isPast = idx < currentRankIndex;
          const color = RANK_COLORS[rank.code] || '#d4af37';
          const hasPerks = rank.xp_bonus_percent > 0 || rank.shop_discount_percent > 0
            || rank.reward_bonus_percent > 0 || rank.extra_inventory_slots > 0;

          return (
            <div
              key={rank.code}
              className={`rank-table-row ${isCurrent ? 'rank-table-current' : ''} ${isPast ? 'rank-table-past' : ''} ${!isCurrent && !isPast ? 'rank-table-future' : ''}`}
              style={{ '--rank-color': color }}
            >
              <div className="rank-table-badge" style={{ color }}>
                {rank.code}
              </div>

              <div className="rank-table-body">
                <div className="rank-table-header">
                  <span className="rank-table-name">{rank.name}</span>
                  <span className="rank-table-req">
                    {rank.max_reputation
                      ? `${Number(rank.min_reputation).toLocaleString()} – ${Number(rank.max_reputation).toLocaleString()} rep`
                      : `${Number(rank.min_reputation).toLocaleString()}+ rep`}
                  </span>
                </div>
                <div className="rank-table-perks">
                  {hasPerks ? (
                    <>
                      {rank.xp_bonus_percent > 0 && <span className="rank-perk">XP +{rank.xp_bonus_percent}%</span>}
                      {rank.shop_discount_percent > 0 && <span className="rank-perk">Tienda -{rank.shop_discount_percent}%</span>}
                      {rank.reward_bonus_percent > 0 && <span className="rank-perk">Recomp. +{rank.reward_bonus_percent}%</span>}
                      {rank.extra_inventory_slots > 0 && <span className="rank-perk">+{rank.extra_inventory_slots} slots</span>}
                    </>
                  ) : (
                    <span className="rank-perk rank-perk-none">Sin beneficios adicionales</span>
                  )}
                </div>
              </div>

              <div className="rank-table-status">
                {isPast && <span className="rank-status-done">✓</span>}
                {isCurrent && <span className="rank-status-current">Actual</span>}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
