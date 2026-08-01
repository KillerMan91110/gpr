import { useEffect, useState } from 'react';
import { api } from '../api/client';
import GameIcon from './GameIcon';

const REWARD_ICON = {
  GOLD: { name: 'two-coins', artist: 'delapouite' },
  DUNGEON_COINS: { name: 'gem-necklace', artist: 'lorc' },
  COSMIC_SHARDS: { name: 'shard-sword', artist: 'lorc' },
  ITEM: { name: 'present', artist: 'delapouite' },
};

const REWARD_LABEL = { GOLD: 'Oro', DUNGEON_COINS: 'Monedas del Abismo', COSMIC_SHARDS: 'Fragmentos Cósmicos' };

function rewardText(cell) {
  if (cell.rewardType === 'ITEM') return `${cell.itemName} x${cell.quantity}`;
  return `${cell.quantity.toLocaleString()} ${REWARD_LABEL[cell.rewardType]}`;
}

export default function DailyRewardModal({ player, token, onClose, onClaimed }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getDailyReward(player.id, token).then(setData).catch((err) => setError(err.message));
  }, [player, token]);

  async function handleClaim() {
    setBusy(true);
    setError('');
    try {
      const claimResult = await api.claimDailyReward(player.id, token);
      setResult(claimResult);
      const fresh = await api.getDailyReward(player.id, token);
      setData(fresh);
      onClaimed?.(fresh);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel rpg-panel daily-reward-panel" onClick={(e) => e.stopPropagation()}>
        <button className="craft-result-close" onClick={onClose} aria-label="Cerrar">×</button>

        <div className="daily-reward-header">
          <span className="daily-reward-header-icon"><GameIcon name="present" artist="delapouite" /></span>
          <div>
            <h3>Regalo Diario</h3>
            <p className="hint">Vuelve todos los días y junta las 28 recompensas del ciclo.</p>
          </div>
          {data && <span className="daily-reward-streak">Día {data.nextClaimDay}/28</span>}
        </div>

        {error && <p className="auth-error">{error}</p>}
        {result && (
          <p className="hint hint-ok daily-reward-result">
            {result.streakBroken && 'Te salteaste un día y se reinició la racha. '}
            ¡Reclamaste {rewardText({ rewardType: result.rewardType, itemName: result.itemName, quantity: result.quantity })}!
          </p>
        )}

        {!data && !error && <p className="dashboard-loading">Cargando...</p>}

        {data && (
          <>
            <div className="daily-reward-grid">
              {data.calendar.map((cell) => {
                const claimed = cell.day < data.nextClaimDay || (cell.day === data.nextClaimDay && data.claimedToday);
                const current = cell.day === data.nextClaimDay && !data.claimedToday;
                return (
                  <div
                    key={cell.day}
                    className={`daily-reward-cell${current ? ' daily-reward-cell--current' : ''}${claimed ? ' daily-reward-cell--claimed' : ''}${cell.day === 28 ? ' daily-reward-cell--grand' : ''}`}
                    title={rewardText(cell)}
                  >
                    <span className="daily-reward-day">{cell.day}</span>
                    <span className="daily-reward-icon"><GameIcon {...(REWARD_ICON[cell.rewardType])} /></span>
                    <span className="daily-reward-qty">
                      {cell.rewardType === 'ITEM' ? `x${cell.quantity}` : cell.quantity.toLocaleString()}
                    </span>
                    {claimed && <span className="daily-reward-check">✓</span>}
                  </div>
                );
              })}
            </div>

            <button className="rpg-button daily-reward-claim" disabled={busy || data.claimedToday} onClick={handleClaim}>
              {data.claimedToday ? 'Ya reclamaste hoy, vuelve mañana' : busy ? 'Reclamando...' : `🎁 Reclamar día ${data.nextClaimDay}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
