// Misiones en el mundo, estilo WoW: cada misión la da (y la recibe) un NPC del mapa, que lleva
// encima su marca:
//   ?      (verde)    tienes una misión suya lista para entregar
//   !      (amarillo) tiene una misión que ya puedes aceptar
//   gris   (! gris)   tiene una misión para dentro de poco (te faltan SOON_LEVELS niveles o menos)
// Las misiones de muy bajo nivel para ti (TRIVIAL_LEVELS por encima de su máximo) no se marcan,
// igual que WoW esconde las triviales.
//
// La tabla quests guarda el nombre del NPC (npc_name); acá se traduce al NPC del mapa (su
// "dialogo" en los puntos del mapa / dialogues.js). Para que un NPC nuevo dé misiones: ponerlo
// en el mapa con su "dialogo" y agregarlo aquí.

export const QUEST_GIVERS = {
  'Guardabosque Local': 'ren',
  'Comerciante de la Aldea': 'mirna', // Mirna, en la plaza de la Aldea Espiga
  'Anciano Sabio': 'anciano', // Aldren, junto a la fogata de la Aldea Espiga
  'Comandante Aldric': 'aldric', // Sir Aldric, maestro de armas (Barrio de las Órdenes, Aurelia)
};

// misiones sin NPC conocido de las zonas del continente: el tablón del gremio (Ren)
export const DEFAULT_GIVER = 'ren';
export const SOON_LEVELS = 3;
export const TRIVIAL_LEVELS = 6;

// NPC del mapa que da esta misión (null si su zona no está en el mundo abierto todavía)
export function giverOf(q, continentZoneIds) {
  // misiones de historia (misiones v2): el back dice directo qué NPC la da
  if (q.giver_npc) return q.giver_npc;
  const known = QUEST_GIVERS[q.npc_name];
  if (known) return known;
  if (q.zone_id == null || continentZoneIds?.includes(q.zone_id)) return DEFAULT_GIVER;
  return null;
}

const objectivesDone = (q) => q.objectives?.length > 0 && q.objectives.every((o) => (o.current_count ?? 0) >= o.target_count);

// { ren: '?', lyra: '!', ... } a partir de las misiones activas y disponibles del jugador
export function questMarks({ active = [], available = [], level = 1, continentZoneIds = [] }) {
  const marks = {};
  const rank = { gris: 1, '!': 2, '?': 3 };
  const put = (id, m) => { if (id && (rank[m] > (rank[marks[id]] ?? 0))) marks[id] = m; };
  // el ? lo lleva quien la recibe (en las de historia puede no ser quien la dio)
  for (const q of active) if (objectivesDone(q)) put(q.turn_in_npc ?? giverOf(q, continentZoneIds), '?');
  for (const q of available) {
    if (q.accepted || q.prerequisite_met === false) continue;
    if (q.max_level && level > q.max_level + TRIVIAL_LEVELS) continue;
    const giver = giverOf(q, continentZoneIds);
    if (q.meets_level !== false) put(giver, '!');
    else if ((q.min_level ?? 1) - level <= SOON_LEVELS) put(giver, 'gris');
  }
  return marks;
}

// misiones (disponibles o para entregar) de un NPC, para filtrar el tablón al hablar con él
export function questsOfGiver(list, giver, continentZoneIds) {
  return (list ?? []).filter((q) => giverOf(q, continentZoneIds) === giver);
}
