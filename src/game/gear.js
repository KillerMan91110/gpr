// Arte del equipo de las 5 clases base (art/sprites/v2/crear_equipo.lua): cada pieza tiene una
// FORMA (espada, hacha, arco, escudo, yelmo, túnica…) y un SET de colores (Pradera, Volcán,
// Océano, Lich…). Lo usan los íconos de la mochila (components/world/ItemIcon.js) y el combate
// (BattleScene: el arma, la mano secundaria y el color de la armadura que llevas puestos).
//
// La base no guarda forma ni set: se deducen del código del ítem (GUERRERO_WEAPON_VOLCAN…) o, si
// no viene, del nombre ("Espada del Volcán").
export const GEAR_ASSETS = `${process.env.PUBLIC_URL}/assets/sprites/equipo`;

export const SHAPES = ['espada', 'gran_espada', 'hacha', 'espada_runica', 'daga', 'arco', 'ballesta', 'baculo_arcano', 'varita', 'baculo_sagrado',
  'escudo', 'carcaj', 'orbe', 'cristal', 'daga_gemela', 'simbolo',
  'yelmo', 'capucha', 'capirote', 'mascara', 'diadema',
  'placas', 'gaban', 'tunica', 'cuero', 'vestidura',
  'guanteletes', 'guantes', 'guantes_tela', 'guantes_bendecidos',
  'botas_pesadas', 'botas', 'sandalias'];
export const SETS = ['hierro', 'acero', 'pradera', 'montana', 'capitan', 'titan', 'acantilado', 'volcan', 'rey_montana', 'caldera', 'titan_fuego',
  'costas', 'oceano', 'profundidades', 'tundra', 'rey_hielo', 'catacumbas', 'lich', 'ancestral', 'arcano', 'sagrado'];
// formas que tienen hoja de combate (arma en la mano o pieza en la mano de atrás)
export const COMBAT_WEAPONS = ['espada', 'gran_espada', 'espada_runica', 'hacha', 'daga', 'arco', 'ballesta', 'baculo_arcano', 'varita', 'baculo_sagrado'];
export const COMBAT_OFFHANDS = ['escudo', 'carcaj', 'orbe', 'cristal', 'daga_gemela', 'simbolo'];

const BASE_BY_ID = { 1: 'guerrero', 2: 'mago', 3: 'arquero', 4: 'picaro', 5: 'sacerdote' };
const BASE_CODES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
// pieza de cada clase según el hueco (cabeza, torso, manos, pies)
const BY_CLASS = {
  guerrero: { HELMET: 'yelmo', ARMOR: 'placas', GLOVES: 'guanteletes', BOOTS: 'botas_pesadas', OFFHAND: 'escudo' },
  arquero: { HELMET: 'capucha', ARMOR: 'gaban', GLOVES: 'guantes', BOOTS: 'botas', OFFHAND: 'carcaj' },
  mago: { HELMET: 'capirote', ARMOR: 'tunica', GLOVES: 'guantes_tela', BOOTS: 'sandalias', OFFHAND: 'orbe' },
  picaro: { HELMET: 'mascara', ARMOR: 'cuero', GLOVES: 'guantes', BOOTS: 'botas', OFFHAND: 'daga_gemela' },
  sacerdote: { HELMET: 'diadema', ARMOR: 'vestidura', GLOVES: 'guantes_bendecidos', BOOTS: 'sandalias', OFFHAND: 'simbolo' },
};
// set por código (los sets de zona tienen sufijo fijo) y, si no, por el nombre
const SET_BY_CODE = [
  [/TITAN_F\b|TITAN_F$/, 'titan_fuego'], [/TITAN_P\b|TITAN_P$/, 'titan'], [/REY_MONT/, 'rey_montana'], [/REY_HIELO/, 'rey_hielo'],
  [/PRADERA/, 'pradera'], [/MONTANAS/, 'montana'], [/CAPITAN/, 'capitan'], [/ACANT/, 'acantilado'], [/VOLCAN/, 'volcan'],
  [/CALDERA/, 'caldera'], [/COSTAS/, 'costas'], [/OCEANO/, 'oceano'], [/PROFU/, 'profundidades'], [/TUNDRA/, 'tundra'],
  [/CATACUMBAS/, 'catacumbas'], [/LICH/, 'lich'], [/RUINAS/, 'ancestral'], [/MAGICA|ESPADA_MAGICA/, 'arcano'],
];
const SET_BY_NAME = [
  [/titan de fuego/, 'titan_fuego'], [/rey de las montanas/, 'rey_montana'], [/rey del hielo/, 'rey_hielo'], [/titan/, 'titan'],
  [/pradera|lobo|lenador/, 'pradera'], [/montana|troll/, 'montana'], [/capitan/, 'capitan'], [/acantilado/, 'acantilado'],
  [/volcan|dragon/, 'volcan'], [/caldera/, 'caldera'], [/costas|\bmar\b/, 'costas'], [/oceano/, 'oceano'], [/profundidades/, 'profundidades'],
  [/tundra|hielo/, 'tundra'], [/catacumbas|maldit/, 'catacumbas'], [/lich|eternidad/, 'lich'], [/ancestral|orion|dioses|primordial|supremo/, 'ancestral'],
  [/runic|arcan|hechicer|mana|archimago|runas|saber|encantad|magic/, 'arcano'], [/excalibur|sagrad|curacion|sanacion|resurreccion|cielo|bendit/, 'sagrado'],
  [/sangr|verdugo|furia/, 'capitan'], [/caos|demoled|sombra/, 'lich'],
  [/acero|precision|templad|reforzad/, 'acero'], [/hierro|madera|aprendiz|cuero/, 'hierro'],
];
const SET_BY_RARITY = { COMUN: 'hierro', POCO_COMUN: 'acero', RARO: 'costas', EPICO: 'arcano', LEGENDARIO: 'ancestral', UNICO: 'titan' };

const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function classOf(item) {
  const code = String(item.code ?? item.item_code ?? item.itemCode ?? '');
  const prefix = BASE_CODES.find((c) => code.startsWith(`${c.toUpperCase()}_`));
  if (prefix) return prefix;
  if (item.class_id != null || item.classId != null) return BASE_BY_ID[item.class_id ?? item.classId] ?? 'otra';
  return item.cls ?? null;
}

function shapeOf(n, slot, cls) {
  if (slot === 'WEAPON') {
    if (/ballesta/.test(n)) return 'ballesta';
    if (/arco/.test(n)) return 'arco';
    if (/hacha/.test(n)) return 'hacha';
    if (/varita/.test(n)) return 'varita';
    if (/baculo|vara/.test(n)) return cls === 'sacerdote' || /sagrad|curacion|sanacion|resurreccion|cielo/.test(n) ? 'baculo_sagrado' : 'baculo_arcano';
    if (/daga|punal/.test(n)) return 'daga';
    if (/gran espada/.test(n)) return 'gran_espada';
    if (/runic|arcan|hechicer|mana|archimago|runas|saber|encantad/.test(n)) return 'espada_runica';
    if (/espada|excalibur|hoja|sable/.test(n)) return 'espada';
    return null;
  }
  if (slot === 'OFFHAND') {
    if (/escudo/.test(n)) return 'escudo';
    if (/carcaj/.test(n)) return 'carcaj';
    if (/orbe/.test(n)) return 'orbe';
    if (/cristal/.test(n)) return 'cristal';
    if (/daga gemela/.test(n)) return 'daga_gemela';
    if (/simbolo/.test(n)) return 'simbolo';
    if (slot === 'OFFHAND') return BY_CLASS[cls]?.OFFHAND ?? null;
  }
  if (slot === 'HELMET') {
    if (/yelmo|casco/.test(n)) return 'yelmo';
    if (/capucha/.test(n)) return 'capucha';
    if (/capirote|sombrero/.test(n)) return 'capirote';
    if (/mascara/.test(n)) return 'mascara';
    if (/diadema|tiara|corona/.test(n)) return 'diadema';
    if (slot === 'HELMET') return BY_CLASS[cls]?.HELMET ?? null;
  }
  if (slot === 'ARMOR') {
    if (/gaban/.test(n)) return 'gaban';
    if (/tunica|toga/.test(n)) return 'tunica';
    if (/vestidura/.test(n)) return 'vestidura';
    if (/^cuero|peto de cuero/.test(n)) return 'cuero';
    if (/armadura|coraza|peto/.test(n)) return 'placas';
    if (slot === 'ARMOR') return BY_CLASS[cls]?.ARMOR ?? null;
  }
  if (slot === 'GLOVES') {
    if (/guantelete/.test(n)) return 'guanteletes';
    if (/guantes bendecidos/.test(n)) return 'guantes_bendecidos';
    if (/guantes de tela/.test(n)) return 'guantes_tela';
    if (slot === 'GLOVES') return BY_CLASS[cls]?.GLOVES ?? 'guantes';
  }
  if (slot === 'BOOTS') {
    if (/sandalia/.test(n)) return 'sandalias';
    if (/botas pesadas/.test(n)) return 'botas_pesadas';
    if (slot === 'BOOTS') return BY_CLASS[cls]?.BOOTS ?? 'botas';
  }
  return null;
}

function setOf(item, n) {
  const code = String(item.code ?? item.item_code ?? item.itemCode ?? '');
  for (const [re, set] of SET_BY_CODE) if (re.test(code)) return set;
  for (const [re, set] of SET_BY_NAME) if (re.test(n)) return set;
  // armaduras pesadas del guerrero por nivel (…_PESADA_L1, _L10…)
  const lvl = /_L(\d+)$/.exec(code);
  if (lvl) return Number(lvl[1]) >= 50 ? 'ancestral' : Number(lvl[1]) >= 20 ? 'acero' : 'hierro';
  return SET_BY_RARITY[item.rarity] ?? 'hierro';
}

// { shape, set } o null si la pieza no tiene arte propio (accesorios, otras clases, consumibles…)
export function gearArt(item) {
  if (!item) return null;
  const type = item.item_type ?? item.itemType;
  if (type && type !== 'EQUIPMENT') return null;
  // sin hueco no se sabe si es equipo (un material como «Corona del Rey» no lleva ícono de casco)
  const slot = item.slot ?? item.resultSlot ?? null;
  if (!slot || slot === 'ACCESSORY') return null;
  const cls = classOf(item);
  if (cls === 'otra') return null;
  const n = normalize(item.name ?? item.item_name ?? item.itemName);
  const shape = shapeOf(n, slot, cls);
  if (!shape) return null;
  return { shape, set: setOf(item, n) };
}

// posición en el atlas de íconos (32x32; una fila por forma, una columna por set)
export function iconCell(art) {
  const r = SHAPES.indexOf(art.shape);
  const c = Math.max(0, SETS.indexOf(art.set));
  return r < 0 ? null : { x: c * 32, y: r * 32 };
}

// ---------------------------------------------------------------- objetos sin forma de equipo
// Pociones, elixires, comidas que curan y accesorios (art/sprites/combate/crear_objetos.lua):
// atlas de una fila, 32x32, en el orden de OBJETOS. Se reconocen por el nombre.
export const OBJETOS = ['pocion_vida_menor', 'pocion_vida_mayor', 'pocion_mana_menor', 'pocion_mana_mayor',
  'elixir_regeneracion', 'esencia_restauradora', 'estofado_lobo', 'sopa_goblin', 'guiso_troll',
  'amuleto_pradera', 'collar_pradera', 'brazalete_pradera', 'anillo_pradera', 'amuleto_capitan', 'anillo_fuerza', 'amuleto_brujo',
  'frasco_vacio', 'agua_purificada', 'lingote_hierro', 'tabla_roble', 'cuero_tratado', 'antidoto', 'tonico_miel', 'vendaje',
  'amuleto_colmillos', 'fibra_lino', 'tela_lino', 'cuarzo_rio', 'trigo', 'harina', 'pan_campo', 'llave_vigia',
  'carne_jabali', 'glandula_sapo', 'medalla_vigia', 'runa_menhir', 'fragmento_eclipse', 'asado_jabali', 'elixir_lago',
  'emblema_guardia', 'amuleto_runico', 'amuleto_alba'];
const OBJETO_BY_NAME = {
  'pocion de vida menor': 'pocion_vida_menor', 'pocion de vida mayor': 'pocion_vida_mayor',
  'pocion de mana menor': 'pocion_mana_menor', 'pocion de mana mayor': 'pocion_mana_mayor',
  'elixir de regeneracion': 'elixir_regeneracion', 'esencia restauradora': 'esencia_restauradora',
  'estofado de lobo': 'estofado_lobo', 'sopa de goblin': 'sopa_goblin', 'guiso de troll': 'guiso_troll',
  'amuleto de pradera': 'amuleto_pradera', 'collar de pradera': 'collar_pradera', 'brazalete de pradera': 'brazalete_pradera',
  'anillo de pradera': 'anillo_pradera', 'amuleto del capitan': 'amuleto_capitan', 'anillo de fuerza menor': 'anillo_fuerza',
  'amuleto del brujo': 'amuleto_brujo',
  'frasco vacio': 'frasco_vacio', 'agua purificada': 'agua_purificada', 'lingote de hierro': 'lingote_hierro',
  'tabla de roble': 'tabla_roble', 'cuero tratado': 'cuero_tratado', antidoto: 'antidoto', 'tonico de miel': 'tonico_miel',
  vendaje: 'vendaje', 'amuleto de colmillos': 'amuleto_colmillos',
  'fibra de lino': 'fibra_lino', 'tela de lino': 'tela_lino', 'cuarzo de rio': 'cuarzo_rio', trigo: 'trigo', harina: 'harina',
  'pan de campo': 'pan_campo', 'llave del vigia': 'llave_vigia',
  'carne de jabali': 'carne_jabali', 'glandula de sapo': 'glandula_sapo', 'medalla del vigia': 'medalla_vigia',
  'runa de menhir': 'runa_menhir', 'fragmento de eclipse': 'fragmento_eclipse', 'asado de jabali': 'asado_jabali',
  'elixir del lago': 'elixir_lago', 'emblema de la guardia': 'emblema_guardia', 'amuleto runico': 'amuleto_runico',
  'amuleto del alba': 'amuleto_alba',
};

// índice en el atlas de objetos, o null
export function objetoArt(item) {
  const key = OBJETO_BY_NAME[normalize(item?.name ?? item?.item_name ?? item?.itemName).trim()];
  return key ? OBJETOS.indexOf(key) : null;
}
