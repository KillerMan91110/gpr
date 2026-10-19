// Misiones en el mundo, estilo WoW: cada misión la da (y la recibe) un NPC del mapa, que lleva
// encima su marca:
//   ?      (verde)    tienes una misión suya lista para entregar
//   !      (amarillo) tiene una misión que ya puedes aceptar
//   !!     (rojo)     tiene una misión de HISTORIA (principal) que ya puedes aceptar; se dibuja como un ! rojo
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

// Reemplazos por historia: cuando completaste la misión, ese NPC ya no está (viajó con la historia)
// y otro se queda en su lugar con sus misiones. Ren y Tilo se van a las Montañas al terminar «Hacia
// las montañas»; Brin, la aprendiza de Ren, atiende su puesto (mismo lugar: el servidor cuenta la
// cercanía con el puesto de Ren). En el mapa: Ren y Tilo con "oculto_tras", Brin con "requiere".
// Gaspar sube a las Montañas con Tilo y termina en el Volcán: su sobrino Lucio maneja la diligencia.
const STAND_INS = [
  { npc: 'ren', by: 'brin', after: 'PRADERA_HISTORIA_14_MONTANAS' },
  { npc: 'tilo', by: 'brin', after: 'PRADERA_HISTORIA_14_MONTANAS' },
  { npc: 'cochero_aldea', by: 'lucio_aldea', after: 'PRADERA_HISTORIA_14_MONTANAS' },
  { npc: 'cochero', by: 'lucio', after: 'PRADERA_HISTORIA_14_MONTANAS' },
];
let activeStandIns = {};
// done: códigos de las misiones que completó el jugador (World.js lo llama al cargarlas)
export function setStoryStandIns(done) {
  activeStandIns = Object.fromEntries(STAND_INS.filter((s) => done?.has?.(s.after)).map((s) => [s.npc, s.by]));
}
// quién atiende hoy las misiones de este NPC (él mismo, o quien quedó en su lugar)
export const npcFor = (id) => (id ? activeStandIns[id] ?? id : id);
// al revés: al hablar con Brin, el servidor tiene que oír «ren» (los pasos de misión apuntan a él)
export const questTargetsOf = (id) => [id, ...Object.entries(activeStandIns).filter(([, by]) => by === id).map(([npc]) => npc)];

// NPC del mapa que da esta misión (null si su zona no está en el mundo abierto todavía)
export function giverOf(q, continentZoneIds) {
  // misiones de historia (misiones v2): el back dice directo qué NPC la da
  if (q.giver_npc) return npcFor(q.giver_npc);
  const known = QUEST_GIVERS[q.npc_name];
  if (known) return npcFor(known);
  if (q.zone_id == null || continentZoneIds?.includes(q.zone_id)) return npcFor(DEFAULT_GIVER);
  return null;
}
// quién recibe esta misión al entregarla
export const turnInOf = (q, continentZoneIds) => (q.turn_in_npc ? npcFor(q.turn_in_npc) : giverOf(q, continentZoneIds));

export const objectivesDone = (q) => q.objectives?.length > 0 && q.objectives.every((o) => (o.current_count ?? 0) >= o.target_count);

// Qué número mostrar en un objetivo. En las entregas (DELIVER) el progreso guardado queda en 0 hasta
// que el NPC las recibe todas juntas: mientras tanto se muestra lo que llevas en la mochila (have),
// que es lo mismo que te dice el NPC al hablarle.
const pendingDelivery = (o) => o.objective_type === 'DELIVER' && (o.current_count ?? 0) < o.target_count;
export const objectiveCount = (o) => Math.min(pendingDelivery(o) ? (o.have ?? 0) : (o.current_count ?? 0), o.target_count);
// ya tienes todo lo que pide la entrega: falta llevárselo (a quién: el NPC del objetivo)
export const readyToDeliver = (o) => pendingDelivery(o) && (o.have ?? 0) >= o.target_count;

// { ren: '?', lyra: '!', ... } a partir de las misiones activas y disponibles del jugador
export function questMarks({ active = [], available = [], level = 1, continentZoneIds = [] }) {
  const marks = {};
  const rank = { gris: 1, '!': 2, '!!': 3, '?': 4 };
  const put = (id, m) => { if (id && (rank[m] > (rank[marks[id]] ?? 0))) marks[id] = m; };
  // el ? lo lleva quien la recibe (en las de historia puede no ser quien la dio)
  for (const q of active) if (objectivesDone(q)) put(turnInOf(q, continentZoneIds), '?');
  for (const q of available) {
    if (q.accepted || q.prerequisite_met === false) continue;
    if (q.max_level && level > q.max_level + TRIVIAL_LEVELS) continue;
    const giver = giverOf(q, continentZoneIds);
    if (q.meets_level !== false) put(giver, q.quest_type === 'PRINCIPAL' ? '!!' : '!');
    else if ((q.min_level ?? 1) - level <= SOON_LEVELS) put(giver, 'gris');
  }
  return marks;
}

// misiones (disponibles o para entregar) de un NPC, para filtrar el tablón al hablar con él
export function questsOfGiver(list, giver, continentZoneIds) {
  return (list ?? []).filter((q) => giverOf(q, continentZoneIds) === giver);
}

// Entregar en persona: las misiones con turn_in_npc (historia, secundarias y diarias de los NPCs del
// mapa) solo se cobran junto a quien las recibe, desde la conversación con él. Las de las zonas que
// todavía no están en el mundo abierto (sin NPC) siguen entregándose desde el diario.
export const needsTurnInPerson = (q) => !!q.turn_in_npc;

// misiones listas que este NPC recibe
export function readyQuestsFor(active, npc, continentZoneIds) {
  return (active ?? []).filter((q) => objectivesDone(q) && turnInOf(q, continentZoneIds) === npc);
}

// ¿este NPC tiene alguna misión que ya puedes aceptar?
export function hasWorkFor(available, npc, continentZoneIds) {
  return (available ?? []).some((q) => !q.accepted && q.prerequisite_met !== false && q.meets_level !== false
    && giverOf(q, continentZoneIds) === npc);
}

// dónde está cada NPC que recibe misiones (para el diario: «Entrégasela a Marta, en …»)
export const NPC_LUGAR = {
  anciano: 'la fogata de la Aldea Espiga',
  ren: 'la Aldea Espiga',
  mirna: 'la Aldea Espiga',
  goreth: 'la herrería de la Aldea Espiga',
  cochero_aldea: 'la parada de la diligencia, en la Aldea Espiga',
  lucio_aldea: 'la parada de la diligencia, en la Aldea Espiga',
  tilo: 'la Aldea Espiga',
  bruno: 'su granja, en la Aldea Espiga',
  tobias: 'el molino de la Colina',
  brenna: 'el campamento de leñadores del Bosque de Robleviejo',
  nilo: 'el muelle del Lago Cristalino',
  orlan: 'la excavación de las Ruinas del Vigía',
  sela: 'el campamento de refugiados de las Praderas del Este',
  vera: 'la atalaya de las Tierras Heridas',
  elenya: 'la Catedral de Aurelia',
  marta: 'la posada de Aurelia',
  // Bastión de Hierro (Montañas Grises)
  durgan: 'la entrada de la mina del Bastión de Hierro',
  hilda: 'la lonja del Bastión de Hierro',
  ren_bastion: 'la entrada oeste del Bastión de Hierro',
  tilo_bastion: 'la forja del Bastión de Hierro',
  // puestos de las Montañas Grises
  gorm: 'el Puesto del Paso, a la entrada de las Montañas',
  pell: 'el Puesto del Paso, junto a las carretas de Gorm',
  dora: 'el campamento minero de las Minas Abandonadas',
  sven: 'la cabaña del trampero en el Pinar Nevado',
  ingrid: 'la choza de pesca del Lago Helado',
  halvar: 'la atalaya de los Acantilados del Trueno',
  lio: 'el campamento del Eco, junto a la Garganta',
  ulfa: 'el Último Refugio, al pie de la Cumbre del Rey',
  guardia_enano: 'la puerta oeste del Bastión de Hierro',
  brin: 'la Aldea Espiga, en el puesto de Ren',
  // Volcán Rojo (Ascuaria y alrededores)
  brokk: 'la forja de Aurelia',
  gaspar_volcan: 'el pie del Paso del Humo, en la Ladera de Ceniza',
  ascalia: 'la plaza de Ascuaria',
  ignar: 'la Gran Forja de Ascuaria',
  tuli: 'la parrilla de la plaza de Ascuaria',
  chispa: 'las calles de Ascuaria',
  sulfo: 'el laboratorio de los Campos de Azufre',
  ceniza: 'el Bosque Calcinado',
  pumo: 'el muelle de los Ríos de Lava',
  kessa: 'la Cantera de Obsidiana',
  escamas: 'el Nido del Dragón',
  mercader_ascuaria: 'el puesto de la plaza de Ascuaria',
  // Costas Muertas (el Puerto Antiguo, Coralia y alrededores)
  bastida: 'la capitanía del Puerto Antiguo',
  tilo_puerto: 'el muelle del Puerto Antiguo',
  brea: 'el Astillero del Puerto Antiguo',
  almeja: 'el mercado de pescado del Puerto Antiguo',
  mercader_puerto: 'el puesto del muelle del Puerto Antiguo',
  gaspar_costas: 'el muelle de los pescadores del Puerto Antiguo',
  rhaegar: 'el campamento de la Cala de los Piratas',
  rhaegar_preso: 'la celda de la capitanía del Puerto Antiguo',
  rhaegar_puerto: 'la punta del muelle del Puerto Antiguo',
  anka: 'la Cala de los Piratas',
  anka_puerto: 'la punta del muelle del Puerto Antiguo',
  nerea: 'el palafito mayor de Coralia',
  marul: 'el embarcadero de Coralia',
  nacar: 'el taller de nácar de Coralia',
  ondina: 'las pasarelas de Coralia',
  cieno: 'la choza del Manglar de los Susurros',
  bartolo: 'la casita del Faro Negro',
};
