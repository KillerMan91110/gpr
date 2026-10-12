// Genera la Pradera Dorada (zona 1) como un mundo de 4x4 trozos de 40x30 tiles:
//   public/assets/mundo/pradera/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/pradera/mundo.json            (índice: trozos, subzonas, inicio)
// El juego carga solo los trozos alrededor del héroe (sin pantallas de carga).
//
// Diseño (norte arriba): muralla y Puerta Norte de la capital → Camino Real → Aldea Espiga en el
// cruce de caminos. Al oeste el Bosque de Robleviejo y los Campos de Espiga; al este la Colina del
// Molino, el Lago Cristalino (de donde nace el río) y la Guarida de la Manada; al sur las Ruinas
// del Vigía y el Círculo de Piedras; al sureste la tierra se seca hasta el Corazón de la Pradera,
// donde duerme el Titán. Los bordes anuncian la zona vecina (pinos y rocas hacia las Montañas).
//
// Uso: node art/mapas/generar_pradera.js   (con --preview además deja pradera_preview.json; ver bmp.js)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/pradera');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('La Pradera ya se editó con el editor de mapas: no la piso. Usa --forzar para regenerarla igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
// ajustes de paso/encima por tile hechos en el editor (pestaña Tiles), por nombre de tile
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico: cada trozo guarda el suyo por casilla (capa "terreno") para que el
// editor sepa armar los bordes automáticos igual que este generador
const TERRENOS = ['pasto', 'dorado', 'camino', 'agua', 'hierba', 'plaza', 'guarida', 'trigo', 'seco', 'meseta', 'cara', 'escalera', 'puente', 'muro'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261013;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const hash = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);
function valueNoise(x, y, scale, s) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const a = hash(x0, y0, s); const b = hash(x0 + 1, y0, s);
  const c = hash(x0, y0 + 1, s); const d = hash(x0 + 1, y0 + 1, s);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}
const fbm = (x, y, s) => valueNoise(x, y, 18, s) * 0.6 + valueNoise(x, y, 7, s + 1) * 0.3 + valueNoise(x, y, 3, s + 2) * 0.1;
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

// ---------------------------------------------------------------- terreno lógico
// pasto | dorado | camino | agua | hierba | plaza | guarida | trigo | seco | meseta | cara | escalera | puente
const terrain = Array.from({ length: H }, () => new Array(W).fill('pasto'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : null);
const setT = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) terrain[y][x] = t; };
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };
const blobT = (cx, cy, rx, ry, t, rough = 0.35, s = 1) => {
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
    for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 + (valueNoise(x, y, 3, s) - 0.5) * rough * 2) setT(x, y, t);
    }
  }
};

// sitios importantes (en tiles)
const P = {
  gate: { x: 78, y: 0 }, cross: { x: 80, y: 50 }, spawn: { x: 80, y: 57 },
  lake: { x: 124, y: 16 }, mill: { x: 96, y: 28 }, goblins: { x: 110, y: 35 },
  den: { x: 148, y: 28 }, ruins: { x: 26, y: 96 }, stones: { x: 80, y: 97 }, titan: { x: 142, y: 104 },
};

// 1) pasto dorado en manchas (más al sur y al centro: el norte junto a la capital es más verde)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const n = fbm(x, y, 11);
    if (n + (y / H) * 0.18 > 0.62) setT(x, y, 'dorado');
  }
}

// 2) tierra herida alrededor del Titán: se seca cuanto más cerca
for (let y = 60; y < H; y++) {
  for (let x = 96; x < W; x++) {
    const d = dist(x, y, P.titan.x, P.titan.y);
    const n = fbm(x, y, 21);
    if (d < 14 || (d < 34 && n > 0.25 + (d - 14) / 34)) setT(x, y, 'seco');
  }
}

// 3) lago y río (nace en el Lago Cristalino y baja hasta salir por el sur)
blobT(P.lake.x, P.lake.y, 12, 7, 'agua', 0.25, 4);
const river = [[118, 21], [116, 30], [112, 40], [110, 52], [107, 64], [104, 76], [101, 88], [100, 100], [98, 112], [97, 119]];
for (let i = 0; i < river.length - 1; i++) {
  const [x1, y1] = river[i];
  const [x2, y2] = river[i + 1];
  const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const wob = Math.sin((y1 + (y2 - y1) * t) / 4) * 1.6;
    const cx = x1 + (x2 - x1) * t + wob;
    const cy = y1 + (y2 - y1) * t;
    for (let dx = -1; dx <= 1; dx++) setT(Math.round(cx + dx), Math.round(cy), 'agua');
  }
}

// 4) caminos: Camino Real (norte), al este (Montañas Grises), oeste (granjas), sur y senderos
const roads = [];
const road = (pts, width = 2) => roads.push({ pts, width });
road([[79, 3], [79, 14], [81, 26], [80, 38], [80, 50]]);                    // Camino Real
road([[80, 50], [94, 50], [108, 51], [124, 49], [140, 50], [159, 50]]);      // al este
road([[80, 50], [64, 51], [46, 50], [30, 52]]);                              // al oeste (campos)
road([[80, 50], [80, 66], [79, 82], [80, 90]]);                              // al sur (Círculo)
road([[80, 66], [62, 74], [44, 84], [32, 92]], 1);                           // sendero a las Ruinas
road([[80, 90], [92, 94], [100, 95], [112, 97]], 1);                         // sendero al Titán (se pierde en la tierra seca)
road([[88, 44], [92, 41], [97, 40]], 1);                                     // a la escalera del molino
road([[124, 49], [128, 38], [132, 30], [140, 28]], 1);                       // a la Guarida de la Manada
for (const r of roads) {
  for (let i = 0; i < r.pts.length - 1; i++) {
    const [x1, y1] = r.pts[i];
    const [x2, y2] = r.pts[i + 1];
    const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const cx = Math.round(x1 + (x2 - x1) * t);
      const cy = Math.round(y1 + (y2 - y1) * t);
      for (let dy = 0; dy < r.width; dy++) for (let dx = 0; dx < r.width; dx++) {
        const tt = at(cx + dx, cy + dy);
        if (tt === 'agua' || tt === 'puente') setT(cx + dx, cy + dy, 'puente');
        else if (tt !== null && tt !== 'seco') setT(cx + dx, cy + dy, 'camino');
      }
    }
  }
}

// 5) Aldea Espiga: suelo de tierra pisada con forma natural y una plazuela de piedra en el pozo
blobT(80.5, 50, 9, 7, 'camino', 0.4, 12);
rectT(78, 44, 82, 48, 'plaza');
// guaridas: claros de tierra pisada con bordes naturales (el camino se funde con el pasto)
blobT(P.den.x, P.den.y, 5, 3.5, 'camino', 0.5, 7);
// (el Corazón de la Pradera es tierra seca: solo lo marcan el anillo de rocas y las grietas)

// 6) mesetas (Colina del Molino, la loma del bosque y un risco al este) con su pared de roca al sur
// formas redondeadas e irregulares (no rectángulos): elipse deformada por ruido
const plateaus = [
  { cx: 96, cy: 29, rx: 8, ry: 6, stair: 97 },
  { cx: 19, cy: 15, rx: 7, ry: 4, stair: 18 },
  { cx: 145, cy: 63, rx: 7, ry: 4, stair: 144 },
];
for (const p of plateaus) {
  for (let y = p.cy - p.ry - 2; y <= p.cy + p.ry + 2; y++) for (let x = p.cx - p.rx - 2; x <= p.cx + p.rx + 2; x++) {
    const d = ((x - p.cx) / p.rx) ** 2 + ((y - p.cy) / p.ry) ** 2;
    if (at(x, y) !== 'agua' && d <= 1 + (valueNoise(x, y, 3, 9) - 0.5) * 0.7) setT(x, y, 'meseta');
  }
  p.y1 = p.cy + p.ry + 2;
  p.y0 = p.cy - p.ry - 2;
}
// trigal en lo alto de la Colina del Molino
for (let y = P.mill.y + 1; y <= P.mill.y + 3; y++) for (let x = P.mill.x - 6; x <= P.mill.x - 3; x++) {
  const up = (n) => n === 'meseta' || n === 'trigo';
  if (up(at(x, y)) && up(at(x, y + 1)) && up(at(x - 1, y)) && up(at(x + 1, y)) && up(at(x, y - 1))) setT(x, y, 'trigo');
}

// 7) trigales (Campos de Espiga y alrededores de la aldea)
const fields = [
  [8, 42, 18, 48], [22, 42, 34, 47], [8, 56, 20, 63], [38, 55, 52, 61], [24, 64, 36, 70], [60, 56, 70, 62], [88, 58, 96, 63],
];
for (const [x0, y0, x1, y1] of fields) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  if (['pasto', 'dorado'].includes(at(x, y))) setT(x, y, 'trigo');
}

// 8) hierba alta (encuentros) por subzona, con qué monstruos viven ahí
const encounterAreas = [
  { name: 'Claro de los Lobos', x: 24, y: 24, w: 12, h: 8, monstruos: ['LOBO_PRADERA', 'RATA_ALCANTARILLA'] },
  { name: 'Linde de los Campos', x: 10, y: 66, w: 12, h: 8, monstruos: ['RATA_ALCANTARILLA', 'GOBLIN_SAQUEADOR'] },
  { name: 'Campamento Goblin', x: 105, y: 32, w: 9, h: 9, monstruos: ['GOBLIN_SAQUEADOR'] },
  { name: 'Pastizal del Lago', x: 104, y: 6, w: 9, h: 8, monstruos: ['LOBO_PRADERA', 'GOBLIN_SAQUEADOR'] },
  { name: 'Bosque de la Manada', x: 134, y: 34, w: 14, h: 9, monstruos: ['LOBO_FEROZ', 'LOBO_PRADERA'] },
  { name: 'Patio de las Ruinas', x: 18, y: 90, w: 15, h: 12, monstruos: ['BANDIDO_CORRUPTO', 'RATA_ALCANTARILLA'] },
  { name: 'Círculo de Piedras', x: 70, y: 90, w: 20, h: 13, monstruos: ['CHAMAN_OSCURO', 'BANDIDO_CORRUPTO'] },
  { name: 'Hondonada de las Arañas', x: 116, y: 78, w: 16, h: 12, monstruos: ['ARANA_VENENOSA', 'LOBO_FEROZ'] },
  { name: 'Pastizal Sur', x: 48, y: 104, w: 18, h: 8, monstruos: ['ARANA_VENENOSA', 'BANDIDO_CORRUPTO', 'LOBO_PRADERA'] },
];
// la hierba crece en manchas redondeadas e irregulares dentro de cada zona (nunca un rectángulo)
for (const a of encounterAreas) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  for (let y = a.y - 1; y <= a.y + a.h; y++) for (let x = a.x - 1; x <= a.x + a.w; x++) {
    const d = ((x - cx) / (a.w / 2)) ** 2 + ((y - cy) / (a.h / 2)) ** 2;
    const n = valueNoise(x, y, 4, 31);
    if (['pasto', 'dorado', 'seco'].includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 33) > 0.18) setT(x, y, 'hierba');
  }
}
// suelo empedrado roto de la vieja torre del vigía
for (let y = P.ruins.y - 4; y <= P.ruins.y + 4; y++) for (let x = P.ruins.x - 5; x <= P.ruins.x + 5; x++) {
  if (valueNoise(x, y, 2, 35) > 0.45 && ((x - P.ruins.x) / 5) ** 2 + ((y - P.ruins.y) / 4) ** 2 < 1) setT(x, y, 'plaza');
}

// muralla de la capital (las dos filas de arriba)
for (let x = 0; x < W; x++) { setT(x, 0, 'muro'); setT(x, 1, 'muro'); }

// la pared de las mesetas: dos filas debajo del borde sur
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'meseta' || ['meseta', 'trigo'].includes(at(x, y + 1))) continue;
  for (const dy of [1, 2]) if (!['agua', 'meseta', 'puente', 'trigo'].includes(at(x, y + dy))) setT(x, y + dy, 'cara');
}
for (const p of plateaus) {
  for (let y = p.y0; y < p.y1 + 4; y++) {
    if (at(p.stair, y) === 'cara') setT(p.stair, y, 'escalera');
    if (at(p.stair + 1, y) === 'cara') setT(p.stair + 1, y, 'escalera');
  }
}

// ---------------------------------------------------------------- capas de tiles
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = gid; };
const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && objects[y * W + x] === 0 && above[y * W + x] === 0;
const mask = (x, y, same) => (same(at(x, y - 1)) ? 1 : 0) | (same(at(x + 1, y)) ? 2 : 0)
  | (same(at(x, y + 1)) ? 4 : 0) | (same(at(x - 1, y)) ? 8 : 0);
const isPath = (t) => ['camino', 'plaza', 'guarida', 'puente', 'escalera', null].includes(t);
const isWater = (t) => t === 'agua' || t === 'puente';

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'camino') gid = T[`camino_${mask(x, y, isPath)}`];
    else if (t === 'agua') gid = T[`agua_${mask(x, y, isWater)}`];
    else if (t === 'puente') gid = isWater(at(x - 1, y)) && isWater(at(x + 1, y)) ? T.puente_v : T.puente_h;
    else if (t === 'hierba') gid = T.hierba_alta;
    else if (t === 'plaza') gid = T.piedra_plaza;
    else if (t === 'guarida') gid = T.suelo_guarida;
    else if (t === 'trigo') gid = T[`trigo_${mask(x, y, (n) => n === 'trigo')}`];
    else if (t === 'seco') gid = T[`seco_${mask(x, y, (n) => ['seco', 'guarida', 'hierba', 'camino'].includes(n))}`];
    else if (t === 'dorado') gid = T[`dorado_${mask(x, y, (n) => ['dorado', 'hierba', 'trigo', 'camino'].includes(n))}`];
    else if (t === 'meseta') {
      // arriba de la meseta el pasto es el mismo de alrededor; solo el borde lleva el filo de luz
      const m = mask(x, y, (n) => n === 'meseta' || n === 'cara' || n === 'escalera' || n === 'trigo');
      if (m === 15) {
        const r = rand();
        gid = fbm(x, y, 11) + (y / H) * 0.18 > 0.62 ? T.dorado_15 : (r < 0.08 ? T.pasto_matas : r < 0.13 ? T.pasto_flores : T.pasto);
      } else gid = T[`meseta_${m}`];
    }
    else if (t === 'escalera') gid = T.escalera;
    else if (t === 'cara') {
      const top = at(x, y - 1) === 'meseta';
      const sideOk = (n) => n === 'cara' || n === 'escalera';
      const side = !sideOk(at(x - 1, y)) ? 'i' : (!sideOk(at(x + 1, y)) ? 'd' : 'c');
      gid = T[`cara_${top ? 'a' : 'b'}_${side}`];
    } else {
      const r = rand();
      gid = r < 0.08 ? T.pasto_matas : r < 0.13 ? T.pasto_flores : T.pasto;
    }
    put(ground, x, y, gid);
  }
}

// ---------------------------------------------------------------- objetos
function placeGrid(name, w, h, x, y) {
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const id = T[`${name}_${r}_${c}`];
    const meta = TILESET.tiles[id - 1];
    put(meta.encima ? above : objects, x + c, y + r, id);
  }
}
function placeBig(name, x, y) {
  if (name === 'arbol_grande') { put(above, x, y, T.arbol_grande_ai); put(above, x + 1, y, T.arbol_grande_ad); }
  else { put(objects, x, y, T[`${name}_ai`]); put(objects, x + 1, y, T[`${name}_ad`]); }
  put(objects, x, y + 1, T[`${name}_bi`]); put(objects, x + 1, y + 1, T[`${name}_bd`]);
}
const okGround = (x, y) => ['pasto', 'dorado', 'seco', 'meseta'].includes(at(x, y));
const areaFree = (x, y, w, h, pad = 0) => {
  for (let yy = y - pad; yy < y + h + pad; yy++) for (let xx = x - pad; xx < x + w + pad; xx++) {
    if (!free(xx, yy) || !okGround(xx, yy)) return false;
  }
  return true;
};
// zonas que se dejan despejadas (alrededor de los puntos importantes)
const reserved = [];
const reserve = (x0, y0, x1, y1) => reserved.push([x0, y0, x1, y1]);
const isReserved = (x, y) => reserved.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);

// muralla de la capital al norte con la Puerta Norte
for (let x = 0; x < W; x++) { put(objects, x, 0, T.muro_alto); put(objects, x, 1, T.muro_bajo); }
placeGrid('puerta_norte', 4, 3, P.gate.x, P.gate.y);
reserve(70, 2, 90, 8);

// Aldea Espiga: granjas, pozo, mercado, forja, puesto del guardabosque
function placeVillage() {
  placeGrid('granja', 3, 3, 71, 41);
  placeGrid('granja', 3, 3, 87, 41);
  placeGrid('granero', 3, 3, 66, 52);
  put(objects, 80, 46, T.pozo);
  put(objects, 78, 52, T.fogata);
  placeBig('puesto', 75, 47);
  put(objects, 85, 53, T.yunque); put(objects, 86, 53, T.barril); put(objects, 86, 54, T.caja);
  put(objects, 84, 46, T.cartel);
  for (const [x, y] of [[76, 45], [85, 45], [76, 55], [85, 55]]) put(objects, x, y, T.farol);
  for (const [x, y] of [[78, 40], [83, 58], [70, 49], [91, 52]]) put(objects, x, y, T.senal);
  put(objects, 74, 57, T.carreta); put(objects, 69, 57, T.heno); put(objects, 70, 58, T.heno);
}
placeVillage();
reserve(64, 38, 96, 60);

// Campos de Espiga: cercas, espantapájaros y heno en cada trigal; granja y granero
for (const [x0, y0, x1, y1] of fields) {
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (free(x, y0 - 1) && okGround(x, y0 - 1) && x % 7 !== 3) put(objects, x, y0 - 1, T.valla);
  }
  put(objects, Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), T.espantapajaros);
  if (free(x1 + 2, y1) && okGround(x1 + 2, y1)) put(objects, x1 + 2, y1, T.heno);
}
placeGrid('granja', 3, 3, 36, 39);
placeGrid('granero', 3, 3, 54, 63);
reserve(34, 37, 40, 43);

// Colina del Molino: el molino con su trigal, cerca y sacos
placeGrid('molino', 3, 3, P.mill.x - 1, P.mill.y - 2);
put(objects, P.mill.x - 3, P.mill.y + 2, T.carreta); put(objects, P.mill.x + 3, P.mill.y + 1, T.heno);
reserve(P.mill.x - 4, P.mill.y - 3, P.mill.x + 4, P.mill.y + 4);
// Campamento Goblin
placeGrid('tienda_goblin', 2, 2, 106, 31); placeGrid('tienda_goblin', 2, 2, 112, 35);
put(objects, 109, 37, T.fogata); put(objects, 105, 38, T.caja); put(objects, 114, 32, T.huesos);
reserve(104, 30, 116, 40);
// Lago Cristalino: nenúfares, juncos y flores
for (let i = 0; i < 30; i++) {
  const x = Math.round(P.lake.x + (rand() * 2 - 1) * 9);
  const y = Math.round(P.lake.y + (rand() * 2 - 1) * 5);
  if (at(x, y) === 'agua' && mask(x, y, isWater) === 15) put(objects, x, y, T.nenufar);
}
for (let i = 0; i < 60; i++) {
  const a = rand() * Math.PI * 2;
  const x = Math.round(P.lake.x + Math.cos(a) * (13 + rand() * 2));
  const y = Math.round(P.lake.y + Math.sin(a) * (8 + rand() * 2));
  if (free(x, y) && okGround(x, y)) put(objects, x, y, rand() < 0.6 ? T.juncos : T.flores_blancas);
}
// Guarida de la Manada (Capitán)
reserve(P.den.x - 7, P.den.y - 5, P.den.x + 7, P.den.y + 5);
for (const [x, y] of [[143, 25], [153, 26], [145, 32], [151, 31]]) put(objects, x, y, T.huesos);
// Ruinas del Vigía
for (let i = 0; i < 26; i++) {
  const a = (i / 26) * Math.PI * 2;
  const x = Math.round(P.ruins.x + Math.cos(a) * 9);
  const y = Math.round(P.ruins.y + Math.sin(a) * 7);
  if (free(x, y) && i % 5 !== 0) put(objects, x, y, i % 3 === 0 ? T.columna_rota : T.muro_ruina);
}
put(objects, P.ruins.x, P.ruins.y - 2, T.columna_rota); put(objects, P.ruins.x + 2, P.ruins.y + 1, T.huesos);
reserve(P.ruins.x - 10, P.ruins.y - 8, P.ruins.x + 10, P.ruins.y + 8);
// Círculo de Piedras
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  placeGrid('menhir', 1, 2, Math.round(P.stones.x + Math.cos(a) * 6), Math.round(P.stones.y - 1 + Math.sin(a) * 4));
}
reserve(P.stones.x - 8, P.stones.y - 6, P.stones.x + 8, P.stones.y + 6);
// Tierras Heridas: árboles muertos, huesos y grietas; Corazón de la Pradera
reserve(P.titan.x - 8, P.titan.y - 6, P.titan.x + 8, P.titan.y + 6);
for (let i = 0; i < 300; i++) {
  const x = 96 + Math.floor(rand() * 62);
  const y = 62 + Math.floor(rand() * 56);
  if (at(x, y) !== 'seco' || isReserved(x, y)) continue;
  const r = rand();
  if (r < 0.12 && areaFree(x, y, 2, 2, 1)) placeGrid('arbol_muerto', 2, 2, x, y);
  else if (r < 0.3 && free(x, y)) put(objects, x, y, T.arbusto_seco);
  else if (r < 0.4 && free(x, y)) put(objects, x, y, T.hueso_grande);
  else if (r < 0.75 && free(x, y)) put(objects, x, y, T.grieta);
}
// el cráter del Titán: anillo de rocas, árboles muertos y huesos; grietas hacia el centro
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2 + rand() * 0.2;
  const x = Math.round(P.titan.x + Math.cos(a) * 9);
  const y = Math.round(P.titan.y + Math.sin(a) * 6.5);
  if (i % 4 === 0 && areaFree(x, y, 2, 2)) placeGrid('roca_grande', 2, 2, x, y);
  else if (i % 4 === 2 && areaFree(x, y, 2, 2)) placeGrid('arbol_muerto', 2, 2, x, y);
  else if (free(x, y)) put(objects, x, y, i % 2 ? T.hueso_grande : T.arbusto_seco);
}
for (let i = 0; i < 14; i++) {
  const a = rand() * Math.PI * 2;
  const r = 3 + rand() * 4;
  const x = Math.round(P.titan.x + Math.cos(a) * r);
  const y = Math.round(P.titan.y + Math.sin(a) * r * 0.7);
  if (free(x, y) && Math.hypot(x - P.titan.x, y - P.titan.y) > 2) put(objects, x, y, rand() < 0.7 ? T.grieta : T.huesos);
}

// ---------------------------------------------------------------- bosques y vegetación natural
// densidad de árboles: robles al noroeste, pinos al noreste y al este (hacia las Montañas Grises),
// bordes del mundo cerrados y bosquecillos sueltos por el ruido
const forestDensity = (x, y) => {
  let d = fbm(x, y, 41) - 0.45;
  if (x < 56 && y < 38) d += 0.32;
  if (x > 128 && y < 46) d += 0.3;
  if (x > 140 && y >= 46 && y < 80) d += 0.25;
  if (x < 4 || y > H - 5 || x > W - 4) d += 0.6;
  if (y < 12 && x > 60 && x < 100) d -= 0.4;
  return d;
};
for (let y = 2; y < H - 1; y += 2) {
  for (let x = 0; x < W - 1; x += 2) {
    const ox = x + (hash(x, y, 51) < 0.5 ? 0 : 1);
    const oy = y + (hash(x, y, 52) < 0.5 ? 0 : 1);
    if (isReserved(ox, oy) || isReserved(ox + 1, oy + 1)) continue;
    const d = forestDensity(ox, oy);
    if (d <= 0.05 || rand() > d * 1.4) continue;
    if (!areaFree(ox, oy, 2, 2)) continue;
    if (at(ox, oy) === 'seco') continue;
    const pine = ox > 128 || (ox > 120 && oy > 46);
    const golden = !pine && at(ox, oy) === 'dorado' && rand() < 0.35;
    if (pine) placeGrid('pino', 2, 2, ox, oy);
    else if (golden) placeGrid('arbol_dorado', 2, 2, ox, oy);
    else placeBig('arbol_grande', ox, oy);
  }
}
// la salida este queda abierta
for (let y = 48; y <= 53; y++) for (let x = W - 4; x < W; x++) { put(objects, x, y, 0); put(above, x, y, 0); }

// detalles: flores por manchas, setas y troncos en el bosque, bayas, tocones, rocas
for (let i = 0; i < 1600; i++) {
  const x = 2 + Math.floor(rand() * (W - 4));
  const y = 3 + Math.floor(rand() * (H - 6));
  if (!free(x, y) || isReserved(x, y) || !['pasto', 'dorado', 'meseta'].includes(at(x, y))) continue;
  const inForest = forestDensity(x, y) > 0.2;
  const flowers = fbm(x, y, 61) > 0.62;
  const r = rand();
  if (flowers && r < 0.55) put(objects, x, y, [T.flores_amarillas, T.flores_blancas, T.flores_moradas][Math.floor(fbm(x, y, 62) * 30) % 3]);
  else if (inForest && r < 0.12) put(objects, x, y, T.setas);
  else if (inForest && r < 0.16 && areaFree(x, y, 2, 1)) placeGrid('tronco_caido', 2, 1, x, y);
  else if (r < 0.03) put(objects, x, y, T.bayas);
  else if (r < 0.045) put(objects, x, y, T.tocon);
  else if (r < 0.06 && x > 120) put(objects, x, y, rand() < 0.5 ? T.roca : T.pino_chico);
  else if (r < 0.065 && areaFree(x, y, 2, 2)) placeGrid('roca_grande', 2, 2, x, y);
}
// caminos, plaza, puentes, escaleras y paredes siempre libres; en el agua solo nenúfares
for (let y = 2; y < H; y++) for (let x = 0; x < W; x++) {
  const t = at(x, y);
  const k = y * W + x;
  const lair = Math.hypot(x - P.titan.x, (y - P.titan.y) * 1.4) < 10 || Math.hypot(x - P.den.x, (y - P.den.y) * 1.4) < 8;
  if (['camino', 'plaza', 'escalera', 'puente', 'cara'].includes(t) && !(lair && t === 'camino')) { objects[k] = 0; above[k] = 0; }
  if (t === 'agua' && objects[k] !== T.nenufar) objects[k] = 0;
}
// la aldea y la Puerta Norte van encima de la plaza y del camino
placeVillage();
placeGrid('puerta_norte', 4, 3, P.gate.x, P.gate.y);
// Camino Real: faroles a los lados hasta la aldea, cartel y un puesto de guardia junto a la puerta
const roadLamps = [];
for (let y = 6; y <= 36; y += 6) {
  for (const side of [-1, 1]) {
    for (let x = 79 + side * 2; Math.abs(x - 80) < 8; x += side) {
      if (at(x, y) !== 'camino' && free(x, y) && okGround(x, y)) { put(objects, x, y, T.farol); roadLamps.push([x, y]); break; }
    }
  }
}
put(objects, 82, 5, T.senal);
placeBig('carpa', 84, 4); placeBig('carpa', 73, 4);
put(objects, 86, 6, T.barril); put(objects, 72, 6, T.caja);

// ---------------------------------------------------------------- puntos (en coordenadas del mundo, px)
const px = (n) => n * 32;
const prop = (name, type, value) => ({ name, type, value });
const points = [];
const pt = (o) => points.push(o);
pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
pt({ name: 'puerta_norte', type: 'poi', x: px(79), y: px(3), properties: [prop('etiqueta', 'string', 'Puerta Norte — la capital (próximamente)')] });
pt({ name: 'enfermeria', type: 'poi', x: px(78), y: px(51), properties: [prop('etiqueta', 'string', 'Fogata de la aldea — Enfermería'), prop('ventana', 'string', 'enfermeria')] });
pt({ name: 'tablon', type: 'poi', x: px(84), y: px(47), properties: [prop('etiqueta', 'string', 'Tablón de encargos'), prop('ventana', 'string', 'misiones_gremio')] });
pt({ name: 'salida_este', type: 'poi', x: px(158), y: px(50), properties: [prop('etiqueta', 'string', 'Camino a las Montañas Grises — Mapa'), prop('ventana', 'string', 'mapa')] });
pt({ name: 'guardabosque', type: 'npc', x: px(82), y: px(48), properties: [
  prop('nombre', 'string', 'Ren, guardabosque'), prop('sprite', 'string', 'npc_ren'), prop('dialogo', 'string', 'ren'),
  prop('etiqueta', 'string', 'Hablar con Ren'), prop('ventana', 'string', 'misiones_gremio')] });
pt({ name: 'mercader', type: 'npc', x: px(76), y: px(50), properties: [
  prop('nombre', 'string', 'Lyra, mercader'), prop('sprite', 'string', 'npc_lyra'), prop('dialogo', 'string', 'lyra'),
  prop('etiqueta', 'string', 'Hablar con Lyra'), prop('ventana', 'string', 'artesanos')] });
pt({ name: 'herrero', type: 'npc', x: px(84), y: px(51), properties: [
  prop('nombre', 'string', 'Goreth, herrero'), prop('sprite', 'string', 'npc_goreth'), prop('dialogo', 'string', 'goreth'),
  prop('etiqueta', 'string', 'Hablar con Goreth'), prop('ventana', 'string', 'taller')] });
pt({ name: 'guarida_capitan', type: 'jefe', x: px(P.den.x), y: px(P.den.y), properties: [
  prop('monstruo', 'string', 'CAPITAN_LOBOS'), prop('nivel', 'int', 12), prop('etiqueta', 'string', 'Desafiar al Capitán de los Lobos')] });
pt({ name: 'corazon_pradera', type: 'jefe', x: px(P.titan.x), y: px(P.titan.y), properties: [
  prop('monstruo', 'string', 'TITAN_PRADERA'), prop('nivel', 'int', 15), prop('etiqueta', 'string', 'Desafiar al Titán de la Pradera')] });
// el molino gira (sprite de aspas sobre la torre)
pt({ name: 'aspas_molino', type: 'aspas', x: px(P.mill.x) + 16, y: px(P.mill.y - 2) + 30 });
// luces de noche
[[76, 45, 'farol'], [85, 45, 'farol'], [76, 55, 'farol'], [85, 55, 'farol'], [78, 52, 'fogata'], [109, 37, 'fogata'],
  ...roadLamps.map(([x, y]) => [x, y, 'farol'])]
  .forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
// zonas de encuentro
encounterAreas.forEach((a) => pt({
  name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
  properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', Math.max(2, Math.round((a.w * a.h) / 45)))],
}));

// recursos: cada uno tiene varios sitios posibles; el servidor elige en cuál reaparece
// (ver lib/worldNodes.js del back: el id y la cantidad de sitios tienen que coincidir)
const resourceDefs = [];
function findSpot(cx, cy, r, okFn, inReserved = false) {
  for (let tries = 0; tries < 300; tries++) {
    const x = Math.round(cx + (rand() * 2 - 1) * r);
    const y = Math.round(cy + (rand() * 2 - 1) * r);
    if (free(x, y) && free(x, y - 1) && (inReserved || !isReserved(x, y)) && okFn(at(x, y))) return [x, y];
  }
  return null;
}
const meadow = (t) => ['pasto', 'dorado'].includes(t);
const anyLand = (t) => ['pasto', 'dorado', 'seco', 'meseta'].includes(t);
function resource(id, tipo, centers, spots = 3) {
  const list = [];
  for (const [cx, cy, r] of centers) {
    for (let i = 0; i < spots; i++) {
      const s = findSpot(cx, cy, r, ['restos', 'cofre', 'mineral'].includes(tipo) ? anyLand : meadow, tipo === 'restos');
      if (s) { list.push(s); put(objects, s[0], s[1], 0); put(above, s[0], s[1] - 1, 0); }
    }
  }
  resourceDefs.push({ id, tipo, spots: list.length });
  list.forEach(([x, y], i) => pt({ name: id, type: 'recurso', x: px(x) + 16, y: px(y) + 16, properties: [prop('tipo', 'string', tipo), prop('sitio', 'int', i)] }));
}
resource('hierba_camino', 'hierba', [[86, 24, 8]]);
resource('hierba_campos', 'hierba', [[30, 58, 10]]);
resource('hierba_lago', 'hierba', [[110, 22, 8]]);
resource('hierba_sur', 'hierba', [[60, 92, 10]]);
resource('hierba_este', 'hierba', [[132, 58, 8]]);
resource('hierba_robleviejo', 'hierba', [[40, 18, 10]]);
resource('flor_lago', 'flor_luz', [[124, 26, 6]], 2);
resource('flor_piedras', 'flor_luz', [[80, 106, 5]], 2);
resource('setas_robleviejo', 'setas', [[22, 30, 10]]);
resource('setas_manada', 'setas', [[140, 40, 8]]);
resource('tronco_robleviejo', 'tronco', [[44, 10, 10]]);
resource('tronco_bosque_sur', 'tronco', [[40, 110, 10]]);
resource('nido_robleviejo', 'nido', [[16, 8, 8]], 2);
resource('nido_lago', 'nido', [[134, 12, 6]], 2);
resource('mineral_molino', 'mineral', [[96, 42, 6]]);
resource('mineral_este', 'mineral', [[150, 58, 8]]);
resource('mineral_loma', 'mineral', [[20, 24, 5]]);
resource('mineral_heridas', 'mineral', [[132, 96, 8]]);
resource('restos_ruinas', 'restos', [[26, 96, 7]]);
resource('restos_heridas', 'restos', [[128, 110, 8]]);
resource('cofre_bosque', 'cofre', [[6, 6, 4], [52, 6, 4]], 1);
resource('cofre_lago', 'cofre', [[138, 6, 3], [112, 4, 3]], 1);
resource('cofre_heridas', 'cofre', [[154, 116, 3], [104, 116, 3]], 1);

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Aldea Espiga', x0: 64, y0: 38, x1: 96, y1: 60, levels: null, safe: true },
  { name: 'Colina del Molino', x0: 86, y0: 20, x1: 118, y1: 44, levels: '3-6' },
  { name: 'Lago Cristalino', x0: 100, y0: 2, x1: 132, y1: 30, levels: '4-8' },
  { name: 'Camino Real', x0: 60, y0: 2, x1: 100, y1: 37, levels: '1-3' },
  { name: 'Guarida de la Manada', x0: 128, y0: 2, x1: 159, y1: 46, levels: '8-12' },
  { name: 'Bosque de Robleviejo', x0: 0, y0: 2, x1: 59, y1: 37, levels: '2-5' },
  { name: 'Campos de Espiga', x0: 0, y0: 38, x1: 63, y1: 76, levels: '1-4' },
  { name: 'Ruinas del Vigía', x0: 0, y0: 77, x1: 50, y1: 119, levels: '5-8' },
  { name: 'Círculo de Piedras', x0: 51, y0: 77, x1: 95, y1: 119, levels: '8-10' },
  { name: 'Corazón de la Pradera', x0: 128, y0: 94, x1: 159, y1: 119, levels: '15' },
  { name: 'Tierras Heridas', x0: 96, y0: 66, x1: 159, y1: 119, levels: '10-15' },
  { name: 'Praderas del Este', x0: 97, y0: 45, x1: 159, y1: 65, levels: '5-9' },
  { name: 'Pradera Dorada', x0: 0, y0: 0, x1: 159, y1: 119, levels: '1-15' },
];

// ---------------------------------------------------------------- partir en trozos
fs.mkdirSync(outDir, { recursive: true });
const terrainCodes = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) terrainCodes.push(Math.max(0, TERRENOS.indexOf(terrain[y][x])));
const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: CW, height: CH, data });
const tilesetRef = {
  firstgid: 1, name: 'pradera', image: '../tileset_pradera.png', imagewidth: TILESET.columns * 32,
  imageheight: Math.ceil(TILESET.count / TILESET.columns) * 32, tilewidth: 32, tileheight: 32,
  columns: TILESET.columns, tilecount: TILESET.count, margin: 0, spacing: 0,
  tiles: TILESET.tiles.filter((t) => t.colision).map((t) => ({ id: t.id, properties: [{ name: 'colision', type: 'bool', value: true }] })),
};
const chunks = [];
for (let cy = 0; cy < ROWS; cy++) {
  for (let cx = 0; cx < COLS; cx++) {
    const cut = (layer) => {
      const out = [];
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) out.push(layer[(cy * CH + y) * W + (cx * CW + x)]);
      return out;
    };
    const x0 = px(cx * CW);
    const y0 = px(cy * CH);
    const inside = (o) => {
      const ox = o.x + (o.width ?? 0) / 2;
      const oy = o.y + (o.height ?? 0) / 2;
      return ox >= x0 && ox < x0 + px(CW) && oy >= y0 && oy < y0 + px(CH);
    };
    // los puntos se guardan relativos al trozo (como los dejaría Tiled)
    const objs = points.filter(inside).map((o, i) => ({ id: i + 1, rotation: 0, visible: true, width: 0, height: 0, ...o, x: o.x - x0, y: o.y - y0 }));
    const map = {
      type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
      width: CW, height: CH, tilewidth: 32, tileheight: 32, infinite: false, nextlayerid: 5, nextobjectid: objs.length + 1,
      properties: [prop('zona', 'int', 1)],
      layers: [
        tileLayer(1, 'suelo', cut(ground)), tileLayer(2, 'objetos', cut(objects)), tileLayer(3, 'encima', cut(above)),
        { id: 4, name: 'puntos', type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects: objs },
      ],
      tilesets: [tilesetRef],
      // datos del editor: terreno lógico por casilla y paso forzado (índice → valor, ver WorldScene)
      terreno: cut(terrainCodes),
      paso: {},
    };
    const file = `chunk_${cx}_${cy}.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(map));
    chunks.push({ cx, cy, file });
  }
}

const world = {
  nombre: 'Pradera Dorada', zona: 1, tileset: 'pradera', terrenos: TERRENOS, tile: 32, chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0.07, gidHierba: T.hierba_alta,
  inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
  clima: { estacion: 'verano', lluvia: 0.25 },
  // tiles que usa la fauna del ambiente (mariposas en las flores, brillos en el agua, hojas…)
  gids: {
    flores: [T.flores_amarillas, T.flores_blancas, T.flores_moradas, T.pasto_flores],
    agua: Array.from({ length: 16 }, (_, m) => T[`agua_${m}`]),
    prado: [T.pasto, T.pasto_matas, ...Array.from({ length: 16 }, (_, m) => T[`dorado_${m}`])],
    arboles: [T.arbol_grande_ai, T.arbol_grande_ad, T.pino_0_0, T.pino_0_1],
    dorados: [T.arbol_dorado_0_0, T.arbol_dorado_0_1],
    seco: Array.from({ length: 16 }, (_, m) => T[`seco_${m}`]),
  },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
fs.writeFileSync(path.join(__dirname, 'recursos_pradera.json'), JSON.stringify(resourceDefs, null, 1));

// vista previa del mapa completo (1 px = 1 tile): node generar_pradera.js --preview && node bmp.js
if (process.argv.includes('--preview')) {
const COLORS = {
  pasto: [92, 154, 60], dorado: [168, 168, 72], camino: [201, 164, 106], agua: [74, 138, 216], hierba: [58, 108, 40],
  plaza: [154, 148, 136], guarida: [118, 92, 64], trigo: [208, 168, 64], seco: [168, 152, 120], meseta: [111, 174, 74],
  cara: [118, 112, 96], escalera: [154, 148, 136], puente: [138, 85, 48], muro: [184, 178, 168],
};
const rows = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    let c = COLORS[terrain[y][x]] ?? [255, 0, 255];
    if (objects[y * W + x] || above[y * W + x]) c = c.map((v) => Math.round(v * 0.6));
    row.push(c);
  }
  rows.push(row);
}
fs.writeFileSync(path.join(__dirname, 'pradera_preview.json'), JSON.stringify({ w: W, h: H, rows }));
}
console.log(`Pradera generada: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
console.log('Recursos:', resourceDefs.map((r) => `${r.id}(${r.spots})`).join(' '));
