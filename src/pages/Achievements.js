import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const BONUS_LABEL = {
  DAMAGE_VS_CATEGORY: (b) => `+${b.percent}% DMG vs ${b.category}`,
  DAMAGE_PHYSICAL:    (b) => `+${b.percent}% DMG Físico`,
  DAMAGE_MAGICAL:     (b) => `+${b.percent}% DMG Mágico`,
  DAMAGE_ELEMENTAL:   (b) => `+${b.percent}% DMG Elemental`,
  DAMAGE_ELEMENT:     (b) => `+${b.percent}% DMG ${b.category}`,
  GOLD_EARNED:        (b) => `+${b.percent}% Oro ganado`,
  XP_EARNED:          (b) => `+${b.percent}% XP ganada`,
};

function bonusText(bonus) {
  const fn = BONUS_LABEL[bonus?.type];
  return fn ? fn(bonus) : null;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Achievements() {
  const { player, token } = useAuth();
  const [achievements, setAchievements] = useState(null);
  const [tab, setTab] = useState('unlocked');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getAchievements(player.id, token)
      .then(setAchievements)
      .catch((err) => setError(err.message));
  }, [player, token]);

  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!achievements) return <div className="dashboard-loading">Cargando logros...</div>;

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked   = achievements.filter((a) => !a.unlocked);
  const list     = tab === 'unlocked' ? unlocked : locked;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🏆 Logros</h1>
          <p className="dashboard-subtitle">
            {unlocked.length} / {achievements.length} desbloqueados
          </p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      <div className="quest-tabs">
        <button
          className={`rpg-button rpg-button--small${tab === 'unlocked' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('unlocked')}
        >
          Desbloqueados ({unlocked.length})
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'locked' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('locked')}
        >
          Bloqueados ({locked.length})
        </button>
      </div>

      {list.length === 0 && (
        <div className="rpg-panel" style={{ marginTop: 12 }}>
          <p className="hint">
            {tab === 'unlocked' ? 'Aún no desbloqueaste ningún logro.' : '¡Desbloqueaste todos los logros!'}
          </p>
        </div>
      )}

      <div className="ach-list">
        {list.map((a) => {
          const bonus = bonusText(a.bonus);
          const pct = a.progress.required
            ? Math.min(100, Math.round((a.progress.current / a.progress.required) * 100))
            : 100;
          return (
            <div key={a.id} className={`rpg-panel ach-card${a.unlocked ? ' ach-card--unlocked' : ''}`}>
              <div className="ach-card-header">
                <span className="ach-name">{a.name}</span>
                {a.unlocked
                  ? <span className="ach-badge-unlocked">✓ Desbloqueado</span>
                  : <span className="ach-progress-text">{a.progress.current} / {a.progress.required}</span>
                }
              </div>

              {a.description && <p className="ach-description">{a.description}</p>}

              {bonus && (
                <span className="ach-bonus">{bonus}</span>
              )}

              {a.unlocked && a.unlockedAt && (
                <p className="ach-date">{formatDate(a.unlockedAt)}</p>
              )}

              {!a.unlocked && a.progress.required > 0 && (
                <div className="ach-bar-track">
                  <div className="ach-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
