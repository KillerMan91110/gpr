// Rastreo de misiones (botón 📍 del seguidor y del diario): qué tiene que señalar la flecha del mapa
// según el paso actual de la misión. El mapa (game/world/tracking.js) busca lo más cercano.
import { giverOf, objectivesDone } from './questGivers';

export const MAX_TRACKED = 3;
// un color por misión rastreada (flecha, marcador y punto del minimapa)
export const TRACK_COLORS = [0xffd84a, 0x7dd8ff, 0xff8ad0];
export const trackColorCss = (i) => `#${TRACK_COLORS[i % TRACK_COLORS.length].toString(16).padStart(6, '0')}`;

// de dónde sale un objeto: monstruos que lo sueltan y recursos del mapa (lo manda el back)
function sourceTargets(o) {
  const out = [];
  if (o.sources?.nodes?.length) out.push({ kind: 'nodes', tipos: o.sources.nodes });
  if (o.sources?.monsters?.length) out.push({ kind: 'monster', codes: o.sources.monsters });
  return out;
}

// lo que busca la misión ahora: [{ kind, ... }] (vacío si no hay nada que señalar en el mapa)
export function trackTargets(q, continentZoneIds) {
  const objs = q.objectives ?? [];
  if (objectivesDone(q)) {
    const npc = q.turn_in_npc ?? giverOf(q, continentZoneIds);
    return npc ? [{ kind: 'npc', npc }] : [];
  }
  const out = [];
  for (const o of objs.filter((x) => !x.future && (x.current_count ?? 0) < x.target_count)) {
    switch (o.objective_type) {
      case 'VISIT':
      case 'INVESTIGATE':
      case 'AMBUSH':
        if (o.place) out.push({ kind: 'point', zone: o.place.zone, x: o.place.x, y: o.place.y });
        break;
      case 'TALK':
        if (o.target_code) out.push({ kind: 'npc', npc: o.target_code });
        break;
      case 'DELIVER':
        // con lo que pide en la mochila, a quien se lo entregas; si te falta, adonde conseguirlo
        if ((o.have ?? 0) >= o.target_count && o.target_code) out.push({ kind: 'npc', npc: o.target_code });
        else out.push(...sourceTargets(o));
        break;
      case 'COLLECT_ITEM':
        out.push(...sourceTargets(o));
        break;
      case 'KILL_MONSTER':
        if (o.monster_code) out.push({ kind: 'monster', codes: [o.monster_code] });
        break;
      case 'DEFEAT_BOSS':
        if (o.monster_code) out.push({ kind: 'boss', code: o.monster_code });
        break;
      default:
    }
  }
  return out;
}

// las misiones rastreadas se guardan en el navegador, por personaje
const key = (playerId) => `misiones_rastreadas_v1:${playerId}`;
export function loadTracked(playerId) {
  try {
    const v = JSON.parse(localStorage.getItem(key(playerId)) ?? '[]');
    return Array.isArray(v) ? v.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}
export function saveTracked(playerId, ids) {
  try {
    localStorage.setItem(key(playerId), JSON.stringify(ids));
  } catch {
    // sin almacenamiento (modo privado): el rastreo dura hasta recargar
  }
}
