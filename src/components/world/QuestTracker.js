import { useState } from 'react';
import { DIALOGUES } from '../../game/dialogues';
import { turnInOf, objectiveCount, readyToDeliver, npcFor } from '../../game/questGivers';
import { trackColorCss } from '../../game/questTracking';

// Seguimiento de misiones (como el de WoW, a la derecha bajo el minimapa): tus misiones en curso
// con el avance de cada objetivo. Las que ya cumpliste dicen a quién entregarlas. Clic en una
// abre el diario (J). El 📍 de cada una la rastrea en el mapa (flecha hacia su objetivo) o deja de
// rastrearla. Se puede plegar.
const MAX = 5;

export default function QuestTracker({ active = [], continentZoneIds = [], tracked = [], onToggleTrack, onOpen }) {
  const [folded, setFolded] = useState(false);
  if (!active.length) return null;
  // las rastreadas primero
  const shown = [...active].sort((a, b) => Number(tracked.includes(b.id)) - Number(tracked.includes(a.id))).slice(0, MAX);
  return (
    <div className="hud-tracker">
      <button type="button" className="hud-tracker-head" onClick={() => setFolded((f) => !f)} title={folded ? 'Mostrar' : 'Plegar'}>
        Misiones <small>{active.length}</small> <span>{folded ? '+' : '−'}</span>
      </button>
      {!folded && shown.map((q) => {
        const objs = q.objectives ?? [];
        const done = objs.length > 0 && objs.every((o) => (o.current_count ?? 0) >= o.target_count);
        // a quién se entrega: el que la recibe en persona (misiones de historia) o el que la dio
        const giver = turnInOf(q, continentZoneIds);
        const ti = tracked.indexOf(q.id);
        return (
          <div key={q.id} className={`hud-tracker-row${ti >= 0 ? ' tracked' : ''}`}>
            <button
              type="button"
              className="hud-tracker-pin"
              style={ti >= 0 ? { color: trackColorCss(ti), borderColor: trackColorCss(ti) } : undefined}
              onClick={() => onToggleTrack?.(q.id)}
              title={ti >= 0 ? 'Dejar de rastrear' : 'Rastrear en el mapa'}
              aria-pressed={ti >= 0}
            >
              📍
            </button>
            <button type="button" className={`hud-tracker-q${done ? ' done' : ''}`} onClick={onOpen}>
              <b>{q.quest_type === 'DIARIA' ? '◆ ' : q.quest_type === 'PRINCIPAL' ? '✦ ' : ''}{q.name}</b>
              {done
                ? <em>✔ Entrégala a {DIALOGUES[giver]?.name ?? q.npc_name ?? 'quien te la dio'}</em>
                // solo el paso actual: los siguientes no se adelantan
                : objs.filter((o) => !o.future).map((o) => (
                  <span key={o.objective_id}>
                    - {o.description}: {objectiveCount(o)}/{o.target_count}
                    {readyToDeliver(o) && <em> · ¡llévaselo a {DIALOGUES[npcFor(o.target_code)]?.name ?? 'quien lo pide'}!</em>}
                  </span>
                ))}
            </button>
          </div>
        );
      })}
      {!folded && active.length > MAX && <small className="hud-tracker-more">y {active.length - MAX} más… (J)</small>}
    </div>
  );
}
