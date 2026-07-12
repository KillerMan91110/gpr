function objectiveLabel(o) {
  if (o.description) return o.description;
  switch (o.objective_type) {
    case 'KILL_MONSTER':
    case 'DEFEAT_BOSS':
      return `Matar a ${o.monster_name || 'monstruo objetivo'}`;
    case 'KILL_ANY_IN_ZONE':
      return 'Matar enemigos comunes de la zona';
    case 'COLLECT_ITEM':
      return `Recolectar ${o.item_name || 'item'}`;
    case 'USE_ACTION':
      return 'Cumplir el requisito de combate';
    default:
      return 'Objetivo';
  }
}

export function allObjectivesComplete(objectives) {
  return !objectives || objectives.every((o) => o.current_count >= o.target_count);
}

export default function QuestObjectives({ objectives }) {
  if (!objectives || !objectives.length) return null;

  return (
    <div className="quest-objectives">
      {objectives.map((o) => {
        const done = o.current_count >= o.target_count;
        const percent = o.target_count ? Math.min(100, (o.current_count / o.target_count) * 100) : 0;
        return (
          <div className="stat-bar" key={o.objective_id}>
            <div className="stat-bar-label">
              <span>{objectiveLabel(o)}</span>
              <span>{o.current_count}/{o.target_count}</span>
            </div>
            <div className="stat-bar-track">
              <div className={`stat-bar-fill quest ${done ? 'done' : ''}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
