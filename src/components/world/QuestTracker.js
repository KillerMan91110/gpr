import { useState } from 'react';
import { DIALOGUES } from '../../game/dialogues';
import { giverOf } from '../../game/questGivers';

// Seguimiento de misiones (como el de WoW, a la derecha bajo el minimapa): tus misiones en curso
// con el avance de cada objetivo. Las que ya cumpliste dicen a quién entregarlas. Clic en una
// abre el diario (J). Se puede plegar.
const MAX = 5;

export default function QuestTracker({ active = [], continentZoneIds = [], onOpen }) {
  const [folded, setFolded] = useState(false);
  if (!active.length) return null;
  const shown = active.slice(0, MAX);
  return (
    <div className="hud-tracker">
      <button type="button" className="hud-tracker-head" onClick={() => setFolded((f) => !f)} title={folded ? 'Mostrar' : 'Plegar'}>
        Misiones <small>{active.length}</small> <span>{folded ? '+' : '−'}</span>
      </button>
      {!folded && shown.map((q) => {
        const objs = q.objectives ?? [];
        const done = objs.length > 0 && objs.every((o) => (o.current_count ?? 0) >= o.target_count);
        const giver = giverOf(q, continentZoneIds);
        return (
          <button type="button" key={q.id} className={`hud-tracker-q${done ? ' done' : ''}`} onClick={onOpen}>
            <b>{q.quest_type === 'DIARIA' ? '◆ ' : ''}{q.name}</b>
            {done
              ? <em>✔ Entrégala a {DIALOGUES[giver]?.name ?? q.npc_name ?? 'quien te la dio'}</em>
              : objs.map((o) => (
                <span key={o.objective_id}>
                  - {o.description}: {Math.min(o.current_count ?? 0, o.target_count)}/{o.target_count}
                </span>
              ))}
          </button>
        );
      })}
      {!folded && active.length > MAX && <small className="hud-tracker-more">y {active.length - MAX} más… (J)</small>}
    </div>
  );
}
