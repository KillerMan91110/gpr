// Reglas del tileset para el editor de mapas: nombres de tiles, en qué capa va cada uno y cómo se
// arman los bordes automáticos de cada terreno (igual que art/mapas/generar_pradera.js, para que lo
// pintado a mano quede igual que lo generado).
//
// Máscara de vecinos de 4 bits: 1 arriba, 2 derecha, 4 abajo, 8 izquierda → tile "<terreno>_<máscara>".

export const TERRAIN_LIST = ['pasto', 'dorado', 'camino', 'agua', 'hierba', 'plaza', 'guarida', 'trigo', 'seco', 'meseta', 'cara', 'escalera', 'puente', 'muro',
  // v4 (ciudad)
  'adoquin', 'losa', 'mosaico', 'canal', 'puentep',
  // v5 (Montañas Grises)
  'roca', 'nieve', 'abismo', 'hielo', 'hierban', 'mesetan', 'caran', 'colgante',
  // v6 (Volcán Rojo)
  'basalto', 'ceniza', 'lava', 'azufre', 'quemado', 'obsidiana', 'hierbaq', 'mesetav', 'carav', 'puentev', 'losav',
  // v8 (Costas Muertas)
  'arena', 'arenan', 'pastoc', 'coral', 'barro', 'bajo', 'mar', 'banco', 'hierbac', 'muelle',
  // v9 (Tundra Eterna)
  'nieveh', 'fiordo', 'musgo', 'losah', 'muellen', 'lago'];

// Pinceles de terreno de la paleta (orden y nombre que se ven)
export const TERRAIN_BRUSHES = [
  { id: 'pasto', label: 'Pasto', icon: 'pasto' },
  { id: 'dorado', label: 'Pasto dorado', icon: 'dorado_15' },
  { id: 'camino', label: 'Camino', icon: 'camino_15' },
  { id: 'agua', label: 'Agua', icon: 'agua_15' },
  { id: 'puente', label: 'Puente', icon: 'puente_10' },
  { id: 'trigo', label: 'Trigal', icon: 'trigo_15' },
  { id: 'seco', label: 'Tierra seca', icon: 'seco_15' },
  { id: 'hierba', label: 'Hierba alta (combates)', icon: 'hierba_alta' },
  { id: 'meseta', label: 'Meseta (con pared)', icon: 'meseta_4' },
  { id: 'cara', label: 'Pared de roca', icon: 'cara_a_c' },
  { id: 'escalera', label: 'Escalera', icon: 'escalera' },
  { id: 'plaza', label: 'Empedrado', icon: 'piedra_plaza' },
  { id: 'guarida', label: 'Tierra pisada', icon: 'suelo_guarida' },
  { id: 'adoquin', label: 'Adoquines (calle)', icon: 'adoquin' },
  { id: 'losa', label: 'Losas de mármol', icon: 'losa' },
  { id: 'mosaico', label: 'Mosaico', icon: 'mosaico' },
  { id: 'canal', label: 'Canal', icon: 'canal_10' },
  { id: 'puentep', label: 'Puente de piedra', icon: 'puente_piedra_5' },
  { id: 'roca', label: 'Roca de montaña', icon: 'roca_15' },
  { id: 'nieve', label: 'Nieve', icon: 'nieve_15' },
  { id: 'hierban', label: 'Hierba nevada (combates)', icon: 'hierba_nevada' },
  { id: 'hielo', label: 'Hielo', icon: 'hielo_15' },
  { id: 'abismo', label: 'Abismo', icon: 'abismo_15' },
  { id: 'colgante', label: 'Puente colgante', icon: 'colgante_10' },
  { id: 'mesetan', label: 'Meseta nevada (con pared)', icon: 'mesetan_4' },
  { id: 'caran', label: 'Pared de roca nevada', icon: 'cara_n_a_c' },
  { id: 'basalto', label: 'Basalto', icon: 'basalto' },
  { id: 'ceniza', label: 'Ceniza', icon: 'ceniza_15' },
  { id: 'hierbaq', label: 'Hierba quemada (combates)', icon: 'hierba_quemada' },
  { id: 'lava', label: 'Lava', icon: 'lava_15' },
  { id: 'puentev', label: 'Puente de basalto', icon: 'puente_basalto_10' },
  { id: 'azufre', label: 'Azufre', icon: 'azufre_15' },
  { id: 'quemado', label: 'Tierra quemada', icon: 'quemado_15' },
  { id: 'obsidiana', label: 'Obsidiana', icon: 'obsidiana_15' },
  { id: 'losav', label: 'Losas de basalto', icon: 'losa_basalto' },
  { id: 'mesetav', label: 'Meseta de basalto (con pared)', icon: 'mesetav_4' },
  { id: 'carav', label: 'Pared de basalto', icon: 'cara_v_a_c' },
  { id: 'arena', label: 'Arena', icon: 'arena' },
  { id: 'arenan', label: 'Arena negra', icon: 'arenan_15' },
  { id: 'pastoc', label: 'Pasto de duna', icon: 'pastoc_15' },
  { id: 'hierbac', label: 'Pasto salado (combates)', icon: 'hierba_salada' },
  { id: 'coral', label: 'Coral', icon: 'coral_15' },
  { id: 'barro', label: 'Barro del manglar', icon: 'barro_15' },
  { id: 'bajo', label: 'Agua baja (se camina)', icon: 'bajo_15' },
  { id: 'mar', label: 'Mar (va rodeado de agua baja)', icon: 'mar_15' },
  { id: 'banco', label: 'Banco de arena (marea)', icon: 'banco' },
  { id: 'muelle', label: 'Muelle / pasarela', icon: 'muelle_10' },
  { id: 'nieveh', label: 'Nieve profunda', icon: 'nieveh_15' },
  { id: 'fiordo', label: 'Agua helada del fiordo', icon: 'fiordo_15' },
  { id: 'musgo', label: 'Musgo de la tundra', icon: 'musgo_15' },
  { id: 'losah', label: 'Losas de hielo', icon: 'losa_hielo' },
  { id: 'muellen', label: 'Muelle nevado', icon: 'muellen_10' },
  { id: 'lago', label: 'Hielo del lago (se camina, resbala)', icon: 'lago_15' },
];

const GROUND_NAME = /^(pasto|pasto_matas|pasto_flores|camino(_\d+)?|agua(_\d+)?|orilla_agua_arriba|trigo_\d+|seco_\d+|dorado_\d+|meseta_\d+|cara_[ab]_[icd]|escalera|puente_(\d+|[hv])|piedra_plaza|suelo_guarida|hierba_alta|adoquin(_\d+|_b|_musgo)?|losa(_b)?|mosaico|canal_\d+|puente_piedra_(\d+|[hv])|caminor_\d+|roca_(\d+|grava|musgo)|nieve_(\d+|huellas)|abismo_\d+|hielo_\d+|mesetan_\d+|cara_n_[ab]_[icd]|colgante_(\d+|[hv])|hierba_nevada|basalto(_grieta)?|ceniza_(\d+|pomez|huellas)|lava_\d+|azufre_\d+|quemado_\d+|obsidiana_\d+|caminov_\d+|mesetav_\d+|cara_v_[ab]_[icd]|hierba_quemada|losa_basalto(_runa)?|puente_basalto_(\d+|[hv])|arena(_conchas|_huellas)?|arenan_\d+|pastoc_\d+|coral_\d+|barro_\d+|caminoc_\d+|bajo_\d+|mar_\d+|banco(_alta)?|hierba_salada|muelle_\d+|nieveh_\d+|fiordo_\d+|musgo_\d+|losa_hielo(_runa)?|muellen_\d+|lago_\d+)$/;

// (y en la Tundra: el camino entre la nieve profunda o el musgo también lleva orilla de roca)
const MOUNTAIN = ['roca', 'nieve', 'mesetan', 'hierban', 'abismo', 'hielo', 'nieveh', 'musgo', 'lago'];
// el camino entre el basalto del volcán lleva orilla de basalto (caminov_*)
const VOLCANO = ['basalto', 'ceniza', 'lava', 'azufre', 'quemado', 'obsidiana', 'hierbaq', 'mesetav', 'puentev'];
// el camino entre la arena de la costa es de conchas molidas (caminoc_*)
const COAST = ['arena', 'arenan', 'pastoc', 'coral', 'barro', 'bajo', 'mar', 'banco', 'hierbac', 'muelle'];

export function terrainOfName(name) {
  if (!name) return 'pasto';
  // v9 (Tundra): antes que las reglas generales (losa_hielo no es losa, muellen no es muelle)
  if (/^nieveh_/.test(name)) return 'nieveh';
  if (/^fiordo_/.test(name)) return 'fiordo';
  if (/^musgo_/.test(name)) return 'musgo';
  if (/^losa_hielo/.test(name)) return 'losah';
  if (/^muellen_/.test(name)) return 'muellen';
  if (/^lago_\d+$/.test(name)) return 'lago';
  // v8 (Costas): antes que las reglas generales (caminoc es camino; banco_plaza es un banco de plaza)
  if (/^arenan_/.test(name)) return 'arenan';
  if (/^arena(_conchas|_huellas)?$/.test(name)) return 'arena';
  if (/^pastoc_/.test(name)) return 'pastoc';
  if (/^coral_\d+$/.test(name)) return 'coral';
  if (/^barro_\d+$/.test(name)) return 'barro';
  if (/^caminoc_/.test(name)) return 'camino';
  if (/^bajo_\d+$/.test(name)) return 'bajo';
  if (/^mar_\d+$/.test(name)) return 'mar';
  if (/^banco(_alta)?$/.test(name)) return 'banco';
  if (name === 'hierba_salada') return 'hierbac';
  if (/^muelle_/.test(name)) return 'muelle';
  // v6 (Volcán): antes que las reglas generales (losa_basalto no es losa, cara_v no es cara)
  if (/^basalto/.test(name)) return 'basalto';
  if (/^ceniza_/.test(name)) return 'ceniza';
  if (/^lava_\d+$/.test(name)) return 'lava';
  if (/^azufre_\d+$/.test(name)) return 'azufre';
  if (/^quemado_\d+$/.test(name)) return 'quemado';
  if (/^obsidiana_\d+$/.test(name)) return 'obsidiana';
  if (/^caminov_/.test(name)) return 'camino';
  if (/^mesetav_/.test(name)) return 'mesetav';
  if (/^cara_v_/.test(name)) return 'carav';
  if (name === 'hierba_quemada') return 'hierbaq';
  if (/^losa_basalto/.test(name)) return 'losav';
  if (/^puente_basalto_/.test(name)) return 'puentev';
  if (/^adoquin/.test(name)) return 'adoquin';
  if (/^losa/.test(name)) return 'losa';
  if (name === 'mosaico') return 'mosaico';
  if (/^canal_/.test(name)) return 'canal';
  if (/^puente_piedra_/.test(name)) return 'puentep';
  if (/^roca_(\d+|grava|musgo)$/.test(name)) return 'roca';
  if (/^nieve_/.test(name)) return 'nieve';
  if (/^abismo_/.test(name)) return 'abismo';
  if (/^hielo_\d+$/.test(name)) return 'hielo';
  if (/^mesetan_/.test(name)) return 'mesetan';
  if (/^cara_n_/.test(name)) return 'caran';
  if (/^colgante_/.test(name)) return 'colgante';
  if (name === 'hierba_nevada') return 'hierban';
  if (/^camino/.test(name)) return 'camino';
  if (/^agua|^orilla_agua/.test(name)) return 'agua';
  if (/^trigo_/.test(name)) return 'trigo';
  if (/^seco_/.test(name)) return 'seco';
  if (/^dorado_/.test(name)) return 'dorado';
  if (/^meseta_/.test(name)) return 'meseta';
  if (/^cara_/.test(name)) return 'cara';
  if (name === 'escalera') return 'escalera';
  if (/^puente_/.test(name)) return 'puente';
  if (name === 'piedra_plaza') return 'plaza';
  if (name === 'suelo_guarida') return 'guarida';
  if (name === 'hierba_alta') return 'hierba';
  return 'pasto';
}

export function makeRules(meta, terrainList = TERRAIN_LIST) {
  const T = {};
  const names = [];
  for (const t of meta.tiles) { T[t.nombre] = t.id + 1; names[t.id + 1] = t.nombre; }
  const flags = [];
  for (const t of meta.tiles) flags[t.id + 1] = { colision: !!t.colision, encima: !!t.encima };
  const code = Object.fromEntries(terrainList.map((t, i) => [t, i]));
  const pastoFamily = new Set([T.pasto, T.pasto_matas, T.pasto_flores, T.dorado_15].filter(Boolean));
  const cobbleFamily = new Set([T.adoquin, T.adoquin_b, T.adoquin_musgo].filter(Boolean));
  const slabFamily = new Set([T.losa, T.losa_b].filter(Boolean));
  const rockFamily = new Set([T.roca_15, T.roca_grava, T.roca_musgo].filter(Boolean));
  const snowFamily = new Set([T.nieve_15, T.nieve_huellas].filter(Boolean));
  const randomRock = () => { const r = Math.random(); return r < 0.08 ? T.roca_grava : r < 0.12 ? T.roca_musgo : T.roca_15; };
  const randomSnow = () => (Math.random() < 0.06 ? T.nieve_huellas : T.nieve_15);
  const randomCobble = () => { const r = Math.random(); return r < 0.12 ? T.adoquin_musgo : r < 0.4 ? T.adoquin_b : T.adoquin; };
  const ashFamily = new Set([T.ceniza_15, T.ceniza_pomez, T.ceniza_huellas].filter(Boolean));
  const randomAsh = () => { const r = Math.random(); return r < 0.06 ? T.ceniza_pomez : r < 0.1 ? T.ceniza_huellas : T.ceniza_15; };
  const basaltFamily = new Set([T.basalto, T.basalto_grieta].filter(Boolean));
  const sandFamily = new Set([T.arena, T.arena_conchas, T.arena_huellas].filter(Boolean));
  const randomSand = () => { const r = Math.random(); return r < 0.05 ? T.arena_conchas : r < 0.08 ? T.arena_huellas : T.arena; };

  const randomPasto = () => {
    const r = Math.random();
    return r < 0.08 ? T.pasto_matas : r < 0.13 ? T.pasto_flores : T.pasto;
  };

  // capa natural de un tile: suelo, objetos o encima (copas y tejados)
  const layerOf = (gid) => {
    const n = names[gid];
    if (!n) return 'objetos';
    if (GROUND_NAME.test(n)) return 'suelo';
    return flags[gid]?.encima ? 'encima' : 'objetos';
  };

  // gid del suelo de la casilla (x, y) según su terreno y el de sus vecinos
  // tAt(x, y) → nombre del terreno o null fuera del mapa; cur = gid actual (para no cambiar la
  // variante del pasto cada vez que se repinta al lado)
  function groundGid(tAt, x, y, cur) {
    const t = tAt(x, y);
    const mask = (same) => (same(tAt(x, y - 1)) ? 1 : 0) | (same(tAt(x + 1, y)) ? 2 : 0) | (same(tAt(x, y + 1)) ? 4 : 0) | (same(tAt(x - 1, y)) ? 8 : 0);
    const isPath = (n) => ['camino', 'plaza', 'guarida', 'puente', 'escalera', 'colgante', null].includes(n);
    const isChasm = (n) => n === 'abismo' || n === 'colgante';
    // como en art/mapas/generar_montanas.js
    const rockLike = (n) => ['roca', 'nieve', 'hierban', 'camino', 'plaza', 'muro', 'abismo', 'colgante', 'hielo', 'mesetan', 'caran', 'escalera', null].includes(n);
    // los terrenos de la Tundra dibujan su propio borde sobre la nieve: la nieve a su lado va entera
    const snowLike = (n) => ['nieve', 'hierban', 'hielo', 'mesetan', 'nieveh', 'musgo', 'fiordo', 'muellen', 'losah', 'lago', null].includes(n);
    const isWater = (n) => n === 'agua' || n === 'puente';
    // como en art/mapas/generar_volcan.js
    const isLava = (n) => n === 'lava' || n === 'puentev';
    const ashLike = (n) => ['ceniza', 'hierbaq', 'quemado', 'camino', 'losav', null].includes(n);
    // puentes con bordes automáticos (<puente>_<máscara>): el puente sigue por los lados que no dan a
    // su agua, lava, canal o abismo, y lleva baranda por los demás; sin esos tiles, el viejo _h / _v
    const bridge = (prefix, liquid, old) => T[`${prefix}_${mask((n) => n !== liquid)}`] ?? old();
    switch (t) {
      case 'camino': {
        const around = [tAt(x, y - 1), tAt(x + 1, y), tAt(x, y + 1), tAt(x - 1, y)];
        // el estilo del camino sale de lo que hay hasta dos casillas a la redonda: así el medio de un
        // camino ancho (rodeado de camino) sigue con el estilo de su orilla
        const near = [];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && Math.abs(dx) + Math.abs(dy) <= 2) near.push(tAt(x + dx, y + dy));
        const volcanPath = (n) => ['camino', 'losav', 'puentev', 'escalera', null].includes(n);
        // entre la arena de la costa, camino de conchas (caminoc_*); va primero para que un camino de
        // la costa que roza el basalto no cambie de estilo casilla por casilla
        if (T.caminoc_0 && near.some((n) => COAST.includes(n))) return T[`caminoc_${mask((n) => ['camino', 'plaza', 'muelle', 'escalera', 'losav', null].includes(n))}`];
        // entre el basalto del volcán, el camino lleva orilla de basalto (caminov_*)
        if (T.caminov_0 && near.some((n) => VOLCANO.includes(n))) return T[`caminov_${mask(volcanPath)}`];
        // entre la roca de la montaña, el camino lleva orilla de roca (caminor_*)
        const rock = T.caminor_0 && around.some((n) => MOUNTAIN.includes(n));
        return T[`${rock ? 'caminor' : 'camino'}_${mask(isPath)}`];
      }
      case 'basalto': return basaltFamily.has(cur) ? cur : (Math.random() < 0.05 ? T.basalto_grieta : T.basalto);
      case 'ceniza': {
        const m = mask(ashLike);
        if (m === 15) return ashFamily.has(cur) ? cur : randomAsh();
        return T[`ceniza_${m}`];
      }
      case 'lava': return T[`lava_${mask(isLava)}`];
      case 'puentev': return bridge('puente_basalto', 'lava', () => (isLava(tAt(x - 1, y)) && isLava(tAt(x + 1, y)) ? T.puente_basalto_v : T.puente_basalto_h));
      case 'azufre': return T[`azufre_${mask((n) => n === 'azufre')}`];
      case 'quemado': return T[`quemado_${mask((n) => n === 'quemado' || n === 'hierbaq')}`];
      case 'obsidiana': return T[`obsidiana_${mask((n) => n === 'obsidiana')}`];
      case 'hierbaq': return T.hierba_quemada;
      case 'losav': return [T.losa_basalto, T.losa_basalto_runa].includes(cur) ? cur : (Math.random() < 0.06 ? T.losa_basalto_runa : T.losa_basalto);
      case 'mesetav': return T[`mesetav_${mask((n) => ['mesetav', 'carav', 'escalera', 'losav'].includes(n))}`];
      case 'carav': {
        const top = tAt(x, y - 1) === 'mesetav';
        const sideOk = (n) => n === 'carav' || n === 'escalera';
        const side = !sideOk(tAt(x - 1, y)) ? 'i' : (!sideOk(tAt(x + 1, y)) ? 'd' : 'c');
        return T[`cara_v_${top ? 'a' : 'b'}_${side}`];
      }
      // v8 (Costas): como en art/mapas/generar_costas.js
      case 'arena': return sandFamily.has(cur) ? cur : randomSand();
      case 'arenan': return T[`arenan_${mask((n) => n === 'arenan' || n === null)}`];
      case 'pastoc': return T[`pastoc_${mask((n) => n === 'pastoc' || n === null)}`];
      case 'coral': return T[`coral_${mask((n) => n === 'coral' || n === null)}`];
      case 'barro': return T[`barro_${mask((n) => n === 'barro' || n === null)}`];
      // el agua baja sigue en el mar y bajo los muelles; el mar solo en el mar
      case 'bajo': return T[`bajo_${mask((n) => ['bajo', 'mar', 'muelle', null].includes(n))}`];
      case 'mar': return T[`mar_${mask((n) => n === 'mar' || n === null)}`];
      case 'banco': return T.banco;
      case 'hierbac': return T.hierba_salada;
      case 'muelle': return T[`muelle_${mask((n) => !['bajo', 'mar'].includes(n))}`];
      // v9 (Tundra): como en art/mapas/generar_tundra.js
      case 'nieveh': return T[`nieveh_${mask((n) => n === 'nieveh' || n === null)}`];
      case 'fiordo': return T[`fiordo_${mask((n) => ['fiordo', 'muellen', null].includes(n))}`];
      case 'musgo': return T[`musgo_${mask((n) => n === 'musgo' || n === null)}`];
      case 'losah': return [T.losa_hielo, T.losa_hielo_runa].includes(cur) ? cur : (Math.random() < 0.06 ? T.losa_hielo_runa : T.losa_hielo);
      case 'muellen': return T[`muellen_${mask((n) => n !== 'fiordo')}`];
      case 'lago': return T[`lago_${mask((n) => n === 'lago')}`];
      case 'agua': return T[`agua_${mask(isWater)}`];
      case 'puente': return bridge('puente', 'agua', () => (isWater(tAt(x - 1, y)) && isWater(tAt(x + 1, y)) ? T.puente_v : T.puente_h));
      case 'hierba': return T.hierba_alta;
      case 'plaza': return T.piedra_plaza;
      case 'guarida': return T.suelo_guarida;
      case 'trigo': return T[`trigo_${mask((n) => n === 'trigo')}`];
      case 'seco': return T[`seco_${mask((n) => ['seco', 'guarida', 'hierba', 'camino'].includes(n))}`];
      case 'dorado': return T[`dorado_${mask((n) => ['dorado', 'hierba', 'trigo', 'camino'].includes(n))}`];
      case 'meseta': {
        const m = mask((n) => n === 'meseta' || n === 'cara' || n === 'escalera' || n === 'trigo');
        if (m === 15) return pastoFamily.has(cur) ? cur : randomPasto();
        return T[`meseta_${m}`];
      }
      case 'escalera': return T.escalera;
      case 'adoquin': {
        const m = mask((n) => ['adoquin', 'losa', 'mosaico', 'plaza', 'puentep', 'escalera', null].includes(n));
        if (m === 15) return cobbleFamily.has(cur) ? cur : randomCobble();
        return T[`adoquin_${m}`];
      }
      case 'losa': return slabFamily.has(cur) ? cur : (Math.random() < 0.15 ? T.losa_b : T.losa);
      case 'mosaico': return T.mosaico;
      case 'canal': return T[`canal_${mask((n) => n === 'canal' || n === 'puentep')}`];
      case 'puentep': return bridge('puente_piedra', 'canal', () => (tAt(x - 1, y) === 'canal' && tAt(x + 1, y) === 'canal' ? T.puente_piedra_v : T.puente_piedra_h));
      case 'roca': {
        const m = mask(rockLike);
        if (m === 15) return rockFamily.has(cur) ? cur : randomRock();
        return T[`roca_${m}`];
      }
      case 'nieve': {
        const m = mask(snowLike);
        if (m === 15) return snowFamily.has(cur) ? cur : randomSnow();
        return T[`nieve_${m}`];
      }
      case 'mesetan': {
        const m = mask((n) => ['mesetan', 'caran', 'escalera', 'hierban'].includes(n));
        if (m === 15) return snowFamily.has(cur) ? cur : randomSnow();
        return T[`mesetan_${m}`];
      }
      case 'abismo': return T[`abismo_${mask(isChasm)}`];
      case 'colgante': return bridge('colgante', 'abismo', () => (isChasm(tAt(x - 1, y)) && isChasm(tAt(x + 1, y)) ? T.colgante_v : T.colgante_h));
      case 'hielo': return T[`hielo_${mask((n) => n === 'hielo')}`];
      case 'hierban': return T.hierba_nevada;
      case 'caran': {
        const top = tAt(x, y - 1) === 'mesetan';
        const sideOk = (n) => n === 'caran' || n === 'escalera';
        const side = !sideOk(tAt(x - 1, y)) ? 'i' : (!sideOk(tAt(x + 1, y)) ? 'd' : 'c');
        return T[`cara_n_${top ? 'a' : 'b'}_${side}`];
      }
      case 'cara': {
        const top = tAt(x, y - 1) === 'meseta';
        const sideOk = (n) => n === 'cara' || n === 'escalera';
        const side = !sideOk(tAt(x - 1, y)) ? 'i' : (!sideOk(tAt(x + 1, y)) ? 'd' : 'c');
        return T[`cara_${top ? 'a' : 'b'}_${side}`];
      }
      default:
        return pastoFamily.has(cur) && cur !== T.dorado_15 ? cur : randomPasto();
    }
  }

  // tiles grandes (granja_0_0…granja_2_2, arbol_grande_ai…bd) agrupados para la paleta
  const bigObjects = [];
  const grids = {};
  for (const t of meta.tiles) {
    const g = /^(.+)_(\d+)_(\d+)$/.exec(t.nombre);
    if (g) {
      const k = g[1];
      grids[k] = grids[k] ?? { name: k, cells: [] };
      grids[k].cells.push({ r: +g[2], c: +g[3], gid: t.id + 1 });
    }
    const q = /^(.+)_(ai|ad|bi|bd)$/.exec(t.nombre);
    if (q) {
      const k = q[1];
      grids[k] = grids[k] ?? { name: k, cells: [] };
      grids[k].cells.push({ r: q[2][0] === 'a' ? 0 : 1, c: q[2][1] === 'i' ? 0 : 1, gid: t.id + 1 });
    }
  }
  for (const g of Object.values(grids)) {
    const w = Math.max(...g.cells.map((c) => c.c)) + 1;
    const h = Math.max(...g.cells.map((c) => c.r)) + 1;
    if (w * h < 2) continue;
    const gids = new Array(w * h).fill(0);
    g.cells.forEach((c) => { gids[c.r * w + c.c] = c.gid; });
    bigObjects.push({ name: g.name, w, h, gids });
  }
  bigObjects.sort((a, b) => a.name.localeCompare(b.name));

  // tiles que usa la fauna del ambiente (mismo criterio que el generador)
  const range16 = (p) => Array.from({ length: 16 }, (_, m) => T[`${p}_${m}`]).filter(Boolean);
  const faunaGids = () => ({
    flores: [T.flores_amarillas, T.flores_blancas, T.flores_moradas, T.pasto_flores].filter(Boolean),
    agua: range16('agua'),
    prado: [T.pasto, T.pasto_matas, ...range16('dorado')].filter(Boolean),
    arboles: [T.arbol_grande_ai, T.arbol_grande_ad, T.pino_0_0, T.pino_0_1].filter(Boolean),
    dorados: [T.arbol_dorado_0_0, T.arbol_dorado_0_1].filter(Boolean),
    seco: range16('seco'),
  });

  return {
    T, names, flags, code, terrainList, layerOf, groundGid, bigObjects, faunaGids, randomPasto,
    terrainOfGid: (gid) => terrainOfName(names[gid]),
    collides: (gid) => !!flags[gid]?.colision,
    count: meta.count,
    columns: meta.columns,
  };
}
