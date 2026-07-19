import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import QuestObjectives from '../components/QuestObjectives';

export default function GuildQuests() {
  const { player, token } = useAuth();
  const [quests, setQuests] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [acceptingId, setAcceptingId] = useState(null);
  const [levelSortAsc, setLevelSortAsc] = useState(true);
  const [zoneFilter, setZoneFilter] = useState('ALL');

  function load() {
    // Las quests con required_class_id son exclusivas de esa clase (desbloquean una skill
    // puntual) y ya se muestran para aceptar en la pestaña de misiones del propio Maestro
    // de Gremio (GuildMasterDetail.js) — acá solo van las quests generales de zona/items.
    return api.getAvailableQuests(player.id, token)
      .then((all) => setQuests(all.filter((q) => !q.required_class_id)));
  }

  useEffect(() => {
    if (!player) return;
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, token]);

  async function handleAccept(quest) {
    setError('');
    setMessage('');
    setAcceptingId(quest.id);
    try {
      await api.acceptQuest(player.id, quest.id, token);
      setMessage(`Aceptaste "${quest.name}". Mirala en 📜 Quests, en el dashboard.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  }

  if (error && !quests) return <div className="dashboard-error">Error: {error}</div>;
  if (!quests) return <div className="dashboard-loading">Cargando...</div>;

  const zoneNames = [...new Set(quests.map((q) => q.zone_name).filter(Boolean))].sort();

  const filtered = zoneFilter === 'ALL' ? quests : quests.filter((q) => q.zone_name === zoneFilter);
  const sorted = [...filtered].sort((a, b) => {
    const la = a.min_level || 1;
    const lb = b.min_level || 1;
    return levelSortAsc ? la - lb : lb - la;
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>📜 Quests del Gremio</h1>
          <p className="dashboard-subtitle">Solo se muestran las misiones de tu nivel y tu rango (o uno inferior).</p>
        </div>
        <Link className="logout-btn" to="/guild">
          Volver
        </Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="craft-filter-bar">
        <button className="rpg-button rpg-button--small" onClick={() => setLevelSortAsc((v) => !v)}>
          Nivel {levelSortAsc ? '↑ Ascendente' : '↓ Descendente'}
        </button>
        <select className="rpg-input" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="ALL">Todas las zonas</option>
          {zoneNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {quests.length > 0 && sorted.length === 0 && (
        <p>No hay misiones en esa zona para tu nivel y rango todavía.</p>
      )}
      {quests.length === 0 && <p>No hay misiones disponibles para tu nivel y rango todavía.</p>}

      <div className="zone-list">
        {sorted.map((q) => (
          <div key={q.id} className="zone-card rpg-panel">
            <div className="zone-card-header">
              <h3>{q.name}</h3>
              <span className="hint">Categoría {q.min_rank_code || 'F'}</span>
            </div>
            <p className="zone-description">
              {q.zone_name || 'Sin zona'} · Nv. {q.min_level || 1}
              {q.max_level ? `-${q.max_level}` : ''}
              {q.npc_name ? ` · ${q.npc_name}` : ''}
            </p>
            {q.description && <p className="hint">{q.description}</p>}
            <p className="hint">
              +{q.xp_reward} XP · +{q.gold_reward} Oro · +{q.reputation_reward} Reputación
              {q.is_repeatable ? ' · 🔁 Repetible' : ' · Única vez'}
            </p>
            <QuestObjectives objectives={q.objectives} />
            {q.accepted ? (
              <p className="hint hint-ok">Ya aceptada</p>
            ) : q.meets_level === false ? (
              <p className="auth-error">Requiere nivel {q.min_level}</p>
            ) : (
              <>
                {q.times_completed > 0 && (
                  <p className="hint">Completada {q.times_completed}x</p>
                )}
                <button className="rpg-button" disabled={acceptingId === q.id} onClick={() => handleAccept(q)}>
                  {acceptingId === q.id ? 'Aceptando...' : 'Aceptar'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
