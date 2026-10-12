// Reglas del tileset para el editor de mapas: nombres de tiles, en qué capa va cada uno y cómo se
// arman los bordes automáticos de cada terreno (igual que art/mapas/generar_pradera.js, para que lo
// pintado a mano quede igual que lo generado).
//
// Máscara de vecinos de 4 bits: 1 arriba, 2 derecha, 4 abajo, 8 izquierda → tile "<terreno>_<máscara>".

export const TERRAIN_LIST = ['pasto', 'dorado', 'camino', 'agua', 'hierba', 'plaza', 'guarida', 'trigo', 'seco', 'meseta', 'cara', 'escalera', 'puente', 'muro',
  // v4 (ciudad)
  'adoquin', 'losa', 'mosaico', 'canal', 'puentep'];

// Pinceles de terreno de la paleta (orden y nombre que se ven)
export const TERRAIN_BRUSHES = [
  { id: 'pasto', label: 'Pasto', icon: 'pasto' },
  { id: 'dorado', label: 'Pasto dorado', icon: 'dorado_15' },
  { id: 'camino', label: 'Camino', icon: 'camino_15' },
  { id: 'agua', label: 'Agua', icon: 'agua_15' },
  { id: 'puente', label: 'Puente', icon: 'puente_h' },
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
  { id: 'puentep', label: 'Puente de piedra', icon: 'puente_piedra_v' },
];

const GROUND_NAME = /^(pasto|pasto_matas|pasto_flores|camino(_\d+)?|agua(_\d+)?|orilla_agua_arriba|trigo_\d+|seco_\d+|dorado_\d+|meseta_\d+|cara_[ab]_[icd]|escalera|puente_[hv]|piedra_plaza|suelo_guarida|hierba_alta|adoquin(_\d+|_b|_musgo)?|losa(_b)?|mosaico|canal_\d+|puente_piedra_[hv])$/;

export function terrainOfName(name) {
  if (!name) return 'pasto';
  if (/^adoquin/.test(name)) return 'adoquin';
  if (/^losa/.test(name)) return 'losa';
  if (name === 'mosaico') return 'mosaico';
  if (/^canal_/.test(name)) return 'canal';
  if (/^puente_piedra_/.test(name)) return 'puentep';
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
  const randomCobble = () => { const r = Math.random(); return r < 0.12 ? T.adoquin_musgo : r < 0.4 ? T.adoquin_b : T.adoquin; };

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
    const isPath = (n) => ['camino', 'plaza', 'guarida', 'puente', 'escalera', null].includes(n);
    const isWater = (n) => n === 'agua' || n === 'puente';
    switch (t) {
      case 'camino': return T[`camino_${mask(isPath)}`];
      case 'agua': return T[`agua_${mask(isWater)}`];
      case 'puente': return isWater(tAt(x - 1, y)) && isWater(tAt(x + 1, y)) ? T.puente_v : T.puente_h;
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
      case 'puentep': return tAt(x - 1, y) === 'canal' && tAt(x + 1, y) === 'canal' ? T.puente_piedra_v : T.puente_piedra_h;
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
