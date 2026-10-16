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
  'costas', 'oceano', 'profundidades', 'tundra', 'rey_hielo', 'catacumbas', 'lich', 'ancestral', 'arcano', 'sagrado', 'vigia', 'escarcha', 'hierro_negro'];
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
  [/_VIGIA$|_VIGIA_CAIDO$/, 'vigia'], // set de la Guardia y armas del Vigía Caído (Pradera)
  [/_ESCARCHA$/, 'escarcha'], // set de la Escarcha (Montañas Grises, nv 21)
  [/_HIERRO_NEGRO$/, 'hierro_negro'], // armas de Hierro Negro (Mina Profunda, nv 22)
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
  'emblema_guardia', 'amuleto_runico', 'amuleto_alba',
  'collar_cristal_negro', 'saco_cristales', 'cristal_enterrado', 'engranaje_molino', 'unguento_raiz', 'carta_eclipse',
  'mapa_chaman', 'cristal_capitan', 'fragmento_sello', 'palo_roble', 'carta_ren', 'carta_marta', 'hacha_brenna', 'muneca_trapo', 'ojo_vigia',
  // materiales de los monstruos de las Montañas Grises
  'cuerno_cabra', 'colmillo_orco', 'piel_lobo_nieve', 'pico_corrompido', 'membrana_murcielago', 'fragmento_piedra_viva',
  'esencia_helada', 'garra_oso', 'escama_sierpe', 'piel_troll', 'pluma_arpia', 'nucleo_tormenta', 'cristal_gigante', 'vara_brujo',
  'madera_pino', 'flor_nieve', 'acero_refinado',
  'carne_cabra', 'lomo_oso', 'asado_cabra', 'te_flor_nieve', 'caldo_oso', 'elixir_tormenta', 'insignia_guardia_real',
  // la Mina Profunda y los objetos de misión de la historia de las Montañas
  'mena_hierro_negro', 'corazon_hierro_negro', 'llave_mina', 'carta_elenya', 'hacha_orco', 'cristal_veta', 'esquirla_sello',
  'nota_brujo', 'corazon_tormenta', 'fragmento_sello_montanas', 'anillo_durgan', 'olla_hilda'];
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
  // objetos de misión de la Pradera
  'collar de cristal negro': 'collar_cristal_negro', 'saco de cristales negros': 'saco_cristales',
  'cristal enterrado': 'cristal_enterrado', 'engranaje del molino': 'engranaje_molino', 'unguento de raiz': 'unguento_raiz',
  'carta con un eclipse': 'carta_eclipse', 'mapa del chaman': 'mapa_chaman', 'cristal del capitan': 'cristal_capitan',
  'primer fragmento de sello': 'fragmento_sello', 'palo de roble': 'palo_roble', 'carta de ren': 'carta_ren',
  'carta de marta': 'carta_marta', 'hacha de brenna': 'hacha_brenna', 'muneca de trapo': 'muneca_trapo', 'ojo del vigia': 'ojo_vigia',
  // materiales de los monstruos de las Montañas Grises
  'cuerno de cabra montes': 'cuerno_cabra', 'colmillo de orco': 'colmillo_orco', 'piel de lobo de las nieves': 'piel_lobo_nieve',
  'pico corrompido': 'pico_corrompido', 'membrana de murcielago': 'membrana_murcielago', 'fragmento de piedra viva': 'fragmento_piedra_viva',
  'esencia espectral helada': 'esencia_helada', 'garra de oso de las cumbres': 'garra_oso', 'escama de sierpe de hielo': 'escama_sierpe',
  'piel de troll': 'piel_troll', 'pluma de arpia del eco': 'pluma_arpia', 'nucleo de tormenta': 'nucleo_tormenta',
  'cristal de gigante de hielo': 'cristal_gigante', 'vara del brujo de montana': 'vara_brujo',
  'madera de pino nevado': 'madera_pino', 'flor de nieve': 'flor_nieve', 'acero refinado': 'acero_refinado',
  'carne de cabra montes': 'carne_cabra', 'lomo de oso de las cumbres': 'lomo_oso', 'asado de cabra montes': 'asado_cabra',
  'te de flor de nieve': 'te_flor_nieve', 'caldo de oso': 'caldo_oso', 'elixir de tormenta': 'elixir_tormenta',
  'insignia de la guardia real': 'insignia_guardia_real',
  'mena de hierro negro': 'mena_hierro_negro', 'corazon de hierro negro': 'corazon_hierro_negro',
  // objetos de misión de las Montañas
  'llave de la mina profunda': 'llave_mina', 'carta de elenya': 'carta_elenya', 'hacha de orco marcada': 'hacha_orco',
  'cristal de la veta': 'cristal_veta', 'esquirla del segundo sello': 'esquirla_sello', 'nota del brujo': 'nota_brujo',
  'corazon de la tormenta': 'corazon_tormenta', 'segundo fragmento de sello': 'fragmento_sello_montanas',
  'anillo de durgan': 'anillo_durgan', 'olla de hilda': 'olla_hilda',
};

// índice en el atlas de objetos, o null
export function objetoArt(item) {
  const key = OBJETO_BY_NAME[normalize(item?.name ?? item?.item_name ?? item?.itemName).trim()];
  return key ? OBJETOS.indexOf(key) : null;
}
