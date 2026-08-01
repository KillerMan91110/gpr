import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import QuestObjectives, { allObjectivesComplete } from '../components/QuestObjectives';
import GameIcon from '../components/GameIcon';
import { RANK_COLORS } from './Ranks';

const RARITY_STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function MyQuests() {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('active');
  const [quests, setQuests] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [completingId, setCompletingId] = useState(null);
  const [abandoningId, setAbandoningId] = useState(null);
  const [confirmAbandon, setConfirmAbandon] = useState(null);
  const [questResult, setQuestResult] = useState(null);
  const questResultTimer = useRef(null);

  function showQuestResult(result) {
    clearTimeout(questResultTimer.current);
    setQuestResult(result);
    questResultTimer.current = setTimeout(() => setQuestResult(null), 9000);
  }

  useEffect(() => () => clearTimeout(questResultTimer.current), []);

  function loadActive() {
    return api.getActiveQuests(player.id, token).then(setQuests);
  }
  function loadCompleted() {
    return api.getCompletedQuests(player.id, token).then(setCompleted);
  }

  useEffect(() => {
    if (!player) return;
    loadActive().catch((err) => setError(err.message));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!player || tab !== 'completed') return;
    if (completed !== null) return;
    loadCompleted().catch((err) => setError(err.message));
  }, [tab, player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComplete(quest) {
    setError('');
    setMessage('');
    setCompletingId(quest.id);
    try {
      // Rango previo para saber si newRank es realmente NUEVO -- el endpoint de completar no
      // manda esa comparación hecha, solo el rango resultante. Si este fetch falla no bloquea la
      // misión en sí, simplemente no festeja un posible rank-up esta vez.
      const previousRank = await api.getPlayerStats(player.id, token).then((s) => s.rank).catch(() => null);
      const result = await api.completeQuest(player.id, quest.id, token);
      showQuestResult({ ...result, rankChanged: previousRank != null && previousRank !== result.newRank });
      setCompleted(null);
      await loadActive();
    } catch (err) {
      setError(err.message);
    } finally {
      setCompletingId(null);
    }
  }

  async function handleAbandon(quest) {
    setError('');
    setMessage('');
    setAbandoningId(quest.id);
    setConfirmAbandon(null);
    try {
      const result = await api.abandonQuest(player.id, quest.id, token);
      setMessage(`Abandonaste "${result.questName}".`);
      await loadActive();
    } catch (err) {
      setError(err.message);
    } finally {
      setAbandoningId(null);
    }
  }

  if (error && !quests) return <div className="dashboard-error">Error: {error}</div>;
  if (!quests) return <div className="dashboard-loading">Cargando...</div>;

  const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const sorted = [...quests].sort((a, b) => {
    const ra = RANK_ORDER.indexOf(a.min_rank_code || 'F');
    const rb = RANK_ORDER.indexOf(b.min_rank_code || 'F');
    return rb - ra;
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="scroll-unfurled" artist="lorc" /> Mis Quests</h1>
          <p className="dashboard-subtitle">Misiones aceptadas y registro de completadas.</p>
        </div>
        <Link className="logout-btn" to="/">
          Volver
        </Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      {questResult && (
        <div className="craft-result-popup rpg-panel quest-result-popup">
          <button
            className="craft-result-close"
            onClick={() => { clearTimeout(questResultTimer.current); setQuestResult(null); }}
            aria-label="Cerrar"
          >
            ×
          </button>
          <h4 className="craft-result-title">{questResult.questCompleted}</h4>
          <p className="craft-result-line quest-result-routine">
            +{questResult.xpGained} XP · +{questResult.goldGained} Oro · +{questResult.reputationGained} Rep.
          </p>

          {questResult.leveledUp && (
            <p className="quest-result-highlight">
              <GameIcon name="stairs-goal" artist="delapouite" /> ¡Subiste a nivel {questResult.newLevel}!
            </p>
          )}
          {questResult.rankChanged && (
            <p className="quest-result-highlight" style={{ color: RANK_COLORS[questResult.newRank] || 'inherit' }}>
              <GameIcon name="star-medal" artist="delapouite" /> ¡Nuevo rango: {questResult.newRank}!
            </p>
          )}
          {(questResult.unlockedAchievements || []).map((a) => (
            <p key={a.code} className="quest-result-highlight" title={a.description}>
              <GameIcon name="trophy" artist="lorc" /> Logro desbloqueado: {a.name}
            </p>
          ))}
          {questResult.itemsGained?.length > 0 && (
            <p className="quest-result-highlight">
              <GameIcon name="present" artist="delapouite" />{' '}
              {questResult.itemsGained.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="quest-tabs">
        <button
          className={`rpg-button rpg-button--small${tab === 'active' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('active')}
        >
          En curso ({quests.length})
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'completed' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('completed')}
        >
          Completadas
        </button>
      </div>

      {tab === 'active' && (
        <>
          {sorted.length === 0 && (
            <p>
              No tienes misiones aceptadas. Visita el <Link to="/guild/quests">tablón del gremio</Link> para tomar una.
            </p>
          )}
          <div className="zone-list">
            {sorted.map((q) => {
              const ready = allObjectivesComplete(q.objectives);
              const isBossMain = q.is_boss_quest && q.quest_type === 'PRINCIPAL';
              return (
                <div key={q.id} className="zone-card rpg-panel">
                  <div className="zone-card-header">
                    <h3>{q.name}</h3>
                    <span className="hint">Categoría {q.min_rank_code || 'F'}</span>
                  </div>
                  <p className="zone-description">
                    {q.zone_name || 'Sin zona'}
                    {q.npc_name ? ` · ${q.npc_name}` : ''}
                  </p>
                  {q.description && <p className="hint">{q.description}</p>}
                  <p className="hint">
                    +{q.xp_reward} XP · +{q.gold_reward} Oro · +{q.reputation_reward} Reputación
                    {q.is_repeatable ? <> · <GameIcon name="recycle" artist="lorc" /> Repetible</> : ' · Única vez'}
                  </p>
                  <QuestObjectives objectives={q.objectives} />
                  <div className="quest-card-actions">
                    <button
                      className="rpg-button"
                      disabled={completingId === q.id || !ready}
                      onClick={() => handleComplete(q)}
                      title={ready ? undefined : 'Todavía no cumpliste todos los objetivos'}
                    >
                      {completingId === q.id ? 'Completando...' : ready ? 'Completar' : 'Objetivos incompletos'}
                    </button>
                    {!isBossMain && confirmAbandon !== q.id && (
                      <button
                        className="rpg-button rpg-button-danger rpg-button--small"
                        disabled={!!abandoningId}
                        onClick={() => setConfirmAbandon(q.id)}
                      >
                        Abandonar
                      </button>
                    )}
                    {!isBossMain && confirmAbandon === q.id && (
                      <>
                        <button
                          className="rpg-button rpg-button-danger rpg-button--small"
                          disabled={!!abandoningId}
                          onClick={() => handleAbandon(q)}
                        >
                          {abandoningId === q.id ? '...' : '¿Confirmar?'}
                        </button>
                        <button
                          className="rpg-button rpg-button--small"
                          onClick={() => setConfirmAbandon(null)}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'completed' && (
        <>
          {completed === null && <div className="dashboard-loading">Cargando...</div>}
          {completed && completed.length === 0 && (
            <p className="hint">Todavía no completaste ninguna quest.</p>
          )}
          {completed && completed.length > 0 && (
            <div className="zone-list">
              {completed.map((q) => (
                <div key={q.id} className="zone-card rpg-panel quest-card--completed">
                  <div className="zone-card-header">
                    <h3>{q.name}</h3>
                    <span className="hint quest-completed-badge">✓ {q.timesCompleted}x</span>
                  </div>
                  <p className="zone-description">
                    {q.zoneName || 'Sin zona'}
                    {q.npcName ? ` · ${q.npcName}` : ''}
                    {q.difficultyStar > 0 ? ` · ${RARITY_STARS(q.difficultyStar)}` : ''}
                  </p>
                  <p className="hint">
                    +{q.rewards?.xp} XP · +{q.rewards?.gold} Oro · +{q.rewards?.reputation} Reputación
                  </p>
                  {q.rewards?.items?.length > 0 && (
                    <p className="hint">Items: {q.rewards.items.map((i) => `${i.itemName} x${i.quantity}`).join(', ')}</p>
                  )}
                  <p className="hint quest-completed-date">
                    Última: {new Date(q.lastCompletedAt).toLocaleDateString()}
                    {q.isRepeatable && ' · Repetible'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
