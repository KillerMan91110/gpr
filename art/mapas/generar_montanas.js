// Genera las Montañas Grises (zona 2) como un mundo de 4x4 trozos de 40x30 tiles, igual que la Pradera:
//   public/assets/mundo/montanas/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/montanas/mundo.json            (índice: trozos, subzonas, inicio)
// Va pegada al borde este de la Pradera (etheria.json): el camino del este sigue sin cortes.
//
// Diseño (norte arriba): el Paso de la Montaña entra desde la Pradera por el oeste y sube hasta el
// Bastión de Hierro, el pueblo enano, con la entrada de la Mina Profunda al norte. Al noroeste las
// Minas Abandonadas; al norte el Pinar Nevado y al noreste el Lago Helado. Al este los Acantilados
// del Trueno (Señor del Acantilado); al suroeste la Garganta del Eco, con abismos y puentes
// colgantes; al sureste la Cumbre del Rey, una meseta nevada donde espera el Rey de Montaña. Los
// bordes norte, este y sur los cierran picos y rocas nevadas.
//
// Uso: node art/mapas/generar_montanas.js   (con --preview además deja montanas_preview.json; ver bmp.js)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/montanas');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('Las Montañas ya se editaron con el editor de mapas: no las piso. Usa --forzar para regenerarlas igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico de esta zona (el editor arma los bordes con ellos, ver src/editor/rules.js)
const TERRENOS = ['pasto', 'roca', 'nieve', 'camino', 'abismo', 'hielo', 'hierban', 'plaza', 'mesetan', 'caran', 'escalera', 'colgante', 'muro'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261016;
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
const terrain = Array.from({ length: H }, () => new Array(W).fill('roca'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : null);
const setT = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) terrain[y][x] = t; };
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };
const blobT = (cx, cy, rx, ry, t, rough = 0.35, s = 1, only = null) => {
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
    for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 + (valueNoise(x, y, 3, s) - 0.5) * rough * 2 && (!only || only.includes(at(x, y)))) setT(x, y, t);
    }
  }
};

// sitios importantes (en tiles)
const P = {
  entry: { x: 0, y: 50 }, spawn: { x: 6, y: 51 }, town: { x: 64, y: 50 }, mine: { x: 63, y: 33 },
  oldMine: { x: 22, y: 7 }, lake: { x: 132, y: 17 }, cliffs: { x: 146, y: 58 }, summit: { x: 136, y: 102 },
};

// 1) la Pradera se cuela por el oeste: pasto que se vuelve roca de a poco
for (let y = 0; y < H; y++) for (let x = 0; x < 22; x++) {
  if (x + (fbm(x, y, 5) - 0.5) * 14 < 9 + Math.max(0, 6 - Math.abs(y - 50) / 4)) setT(x, y, 'pasto');
}

// 2) nieve: más al norte y en lo alto; la Cumbre del Rey toda blanca
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'roca') continue;
  const north = (40 - y) / 40 * 0.25;
  const east = (x - 80) / 80 * 0.1;
  if (fbm(x, y, 11) + north + east > 0.6 || fbm(x, y, 17) > 0.7) setT(x, y, 'nieve');
}

// 3) Lago Helado
blobT(P.lake.x, P.lake.y, 13, 8, 'hielo', 0.25, 4);
blobT(P.lake.x, P.lake.y, 17, 11, 'nieve', 0.3, 6, ['roca']);

// 4) Garganta del Eco: un abismo que serpentea de oeste a este, y un brazo hacia el sur
const chasms = [
  { pts: [[6, 80], [18, 84], [30, 82], [44, 88], [58, 86], [72, 92], [86, 90], [96, 96]], w: 3 },
  { pts: [[44, 88], [42, 98], [48, 108], [46, 119]], w: 2 },
];
for (const c of chasms) {
  for (let i = 0; i < c.pts.length - 1; i++) {
    const [x1, y1] = c.pts[i];
    const [x2, y2] = c.pts[i + 1];
    const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const wob = Math.sin((x1 + (x2 - x1) * t) / 3) * 1.2;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t + wob;
      for (let dy = -c.w; dy <= c.w; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dy) <= c.w - (valueNoise(cx + dx, cy + dy, 2, 7) < 0.3 ? 1 : 0)) setT(Math.round(cx + dx), Math.round(cy + dy), 'abismo');
      }
    }
  }
}

// 5) Cumbre del Rey: meseta nevada con su pared de roca al sur y al oeste
const plateau = { cx: 132, cy: 101, rx: 23, ry: 13 };
for (let y = plateau.cy - plateau.ry - 2; y <= plateau.cy + plateau.ry + 2; y++) for (let x = plateau.cx - plateau.rx - 2; x <= plateau.cx + plateau.rx + 2; x++) {
  const d = ((x - plateau.cx) / plateau.rx) ** 2 + ((y - plateau.cy) / plateau.ry) ** 2;
  if (at(x, y) !== 'abismo' && d <= 1 + (valueNoise(x, y, 3, 9) - 0.5) * 0.6) setT(x, y, 'mesetan');
}

// 6) caminos: el Paso (de la Pradera al Bastión), a las minas, al pinar y al lago, a los
//    Acantilados, a la Cumbre y a la Garganta
const roads = [];
const road = (pts, width = 2) => roads.push({ pts, width });
road([[0, 50], [12, 50], [24, 47], [36, 50], [48, 49], [60, 50]]);           // el Paso de la Montaña
road([[63, 46], [63, 37]]);                                                  // a la Mina Profunda
road([[58, 46], [46, 36], [34, 26], [26, 14], [22, 10]], 1);                 // a las Minas Abandonadas
road([[66, 44], [74, 34], [86, 24], [100, 22], [114, 28], [122, 30]], 1);    // pinar y lago
road([[70, 52], [86, 56], [102, 58], [118, 56], [134, 58], [142, 58]]);      // a los Acantilados
road([[118, 56], [124, 70], [128, 82], [132, 90]], 1);                       // subida a la Cumbre
road([[58, 54], [50, 64], [42, 76], [38, 84], [34, 94], [26, 104]], 1);      // a la Garganta
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
        if (tt === 'abismo' || tt === 'colgante') setT(cx + dx, cy + dy, 'colgante');
        else if (tt === 'hielo' || tt === 'mesetan') continue;
        else if (tt !== null) setT(cx + dx, cy + dy, 'camino');
      }
    }
  }
}

// 7) Bastión de Hierro: plaza de piedra rodeada de tierra pisada
blobT(P.town.x, P.town.y, 11, 8, 'camino', 0.4, 12, ['roca', 'nieve', 'pasto']);
rectT(60, 46, 68, 54, 'plaza');

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Bastión de Hierro', x0: 48, y0: 30, x1: 80, y1: 60, levels: null, safe: true },
  { name: 'Minas Abandonadas', x0: 0, y0: 0, x1: 54, y1: 32, levels: '17-21' },
  { name: 'Pinar Nevado', x0: 55, y0: 0, x1: 108, y1: 35, levels: '19-23' },
  { name: 'Lago Helado', x0: 109, y0: 0, x1: 159, y1: 37, levels: '21-24' },
  { name: 'Cumbre del Rey', x0: 104, y0: 84, x1: 159, y1: 119, levels: '28-30' },
  { name: 'Acantilados del Trueno', x0: 81, y0: 38, x1: 159, y1: 83, levels: '24-27' },
  { name: 'Garganta del Eco', x0: 0, y0: 70, x1: 103, y1: 119, levels: '22-26' },
  { name: 'Paso de la Montaña', x0: 0, y0: 33, x1: 80, y1: 69, levels: '16-18' },
  { name: 'Montañas Grises', x0: 0, y0: 0, x1: 159, y1: 119, levels: '16-30' },
];

// 8) hierba nevada (encuentros) por subzona, con los monstruos que viven ahí
const encounterAreas = [
  { name: 'Sendero del Paso', x: 14, y: 39, w: 14, h: 8, monstruos: ['ORCO_MONTANA', 'CABRA_MONTES'] },
  { name: 'Ladera Baja', x: 26, y: 56, w: 15, h: 9, monstruos: ['LOBO_NIEVE', 'ORCO_MONTANA'] },
  { name: 'Escombrera', x: 12, y: 15, w: 14, h: 9, monstruos: ['MINERO_CORROMPIDO', 'MURCIELAGO_CAVERNA'] },
  { name: 'Vetas Viejas', x: 34, y: 5, w: 13, h: 8, monstruos: ['CENTINELA_PIEDRA', 'MINERO_CORROMPIDO'] },
  { name: 'Pinar Helado', x: 66, y: 8, w: 16, h: 10, monstruos: ['LOBO_NIEVE', 'ESPECTRO_HELADO'] },
  { name: 'Claro del Oso', x: 88, y: 26, w: 13, h: 8, monstruos: ['OSO_CUMBRES', 'LOBO_NIEVE'] },
  { name: 'Orilla Helada', x: 112, y: 29, w: 16, h: 6, monstruos: ['ESPECTRO_HELADO', 'SIERPE_HIELO'] },
  { name: 'Cristales del Norte', x: 141, y: 5, w: 13, h: 10, monstruos: ['SIERPE_HIELO', 'GIGANTE_HIELO'] },
  { name: 'Puentes del Eco', x: 24, y: 70, w: 16, h: 8, monstruos: ['TROLL_SALVAJE', 'ARPIA_ECO'] },
  { name: 'Fondo de la Garganta', x: 56, y: 100, w: 18, h: 9, monstruos: ['ARPIA_ECO', 'CENTINELA_PIEDRA'] },
  { name: 'Riscos del Trueno', x: 100, y: 42, w: 16, h: 9, monstruos: ['ELEMENTAL_TORMENTA', 'TROLL_SALVAJE', 'BRUJO_MONTANA'] },
  { name: 'Cornisas', x: 124, y: 66, w: 14, h: 8, monstruos: ['ARPIA_ECO', 'ELEMENTAL_TORMENTA'] },
  { name: 'Nieves Eternas', x: 108, y: 92, w: 15, h: 9, monstruos: ['GUARDIA_TORMENTA', 'ELEMENTAL_TORMENTA', 'GIGANTE_HIELO'] },
  { name: 'Antesala del Rey', x: 140, y: 88, w: 13, h: 8, monstruos: ['GUARDIA_TORMENTA', 'ELEMENTAL_TORMENTA', 'OSO_CUMBRES'] },
];
// más zonas por subzona, como en la Pradera (6-8 cada una): se buscan rectángulos de roca o nieve sin
// caminos, abismos, hielo ni paredes, lejos del pueblo y de los jefes, y se reparten lo más separados
// posible. Los monstruos de cada subzona salen de sus niveles en el back (min/max_spawn_level).
const POBLAR = {
  'Paso de la Montaña': { n: 7, mons: [['ORCO_MONTANA', 'CABRA_MONTES'], ['LOBO_NIEVE', 'CABRA_MONTES'], ['ORCO_MONTANA', 'LOBO_NIEVE']],
    names: ['Pedregal del Orco', 'Lomas de las Cabras', 'Huellas del Lobo', 'Campamento Orco', 'Rellano Nevado', 'Ladera del Viento', 'Pastos Helados'] },
  'Minas Abandonadas': { n: 6, mons: [['MINERO_CORROMPIDO', 'MURCIELAGO_CAVERNA'], ['CENTINELA_PIEDRA', 'MURCIELAGO_CAVERNA'], ['MINERO_CORROMPIDO', 'CENTINELA_PIEDRA']],
    names: ['Boca Vieja', 'Galería Caída', 'Nido de Murciélagos', 'Vetas Negras', 'Patio de las Vagonetas', 'Guardia de Piedra'] },
  'Pinar Nevado': { n: 6, mons: [['LOBO_NIEVE', 'OSO_CUMBRES'], ['ESPECTRO_HELADO', 'LOBO_NIEVE'], ['OSO_CUMBRES', 'ESPECTRO_HELADO']],
    names: ['Pinos Susurrantes', 'Senda del Lobo', 'Hondonada Blanca', 'Bosque Callado', 'Madriguera del Oso', 'Claro de los Ecos'] },
  'Lago Helado': { n: 5, mons: [['SIERPE_HIELO', 'ESPECTRO_HELADO'], ['SIERPE_HIELO', 'ESPECTRO_HELADO', 'GIGANTE_HIELO']],
    names: ['Orilla Norte', 'Témpanos', 'Espejo Helado', 'Bahía de Escarcha', 'Costa de los Lamentos'] },
  'Garganta del Eco': { n: 8, mons: [['TROLL_SALVAJE', 'ARPIA_ECO'], ['ARPIA_ECO', 'CENTINELA_PIEDRA'], ['TROLL_SALVAJE', 'CENTINELA_PIEDRA'], ['TROLL_SALVAJE', 'ARPIA_ECO', 'BRUJO_MONTANA']],
    names: ['Paredes del Eco', 'Nido de Arpías', 'Cueva del Troll', 'Lecho Seco', 'Paso Estrecho', 'Rocas Gemelas', 'Mirador del Abismo', 'Saliente Hueco'] },
  'Acantilados del Trueno': { n: 8, mons: [['ELEMENTAL_TORMENTA', 'ARPIA_ECO'], ['TROLL_SALVAJE', 'ELEMENTAL_TORMENTA'], ['ARPIA_ECO', 'TROLL_SALVAJE', 'BRUJO_MONTANA']],
    names: ['Rocas Quemadas', 'Pararrayos', 'Cornisa Alta', 'Paso del Relámpago', 'Bancal del Viento', 'Peñas Rotas', 'Altar del Trueno', 'Balcón de la Tormenta'] },
  'Cumbre del Rey': { n: 6, mons: [['GUARDIA_TORMENTA', 'ELEMENTAL_TORMENTA', 'OSO_CUMBRES'], ['GUARDIA_TORMENTA', 'OSO_CUMBRES', 'ELEMENTAL_TORMENTA', 'GIGANTE_HIELO']],
    names: ['Campo de Hielo', 'Escalinata del Rey', 'Glaciar Real', 'Tumbas Enanas', 'Viento Eterno', 'Corona de Nieve'] },
};
const subzoneAt = (x, y) => subzones.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
const AREA_BAD = ['camino', 'plaza', 'abismo', 'colgante', 'hielo', 'caran', 'escalera', 'muro'];
const AREA_LAND = ['roca', 'nieve', 'pasto', 'mesetan', 'hierban'];
const KEEP_AWAY = [P.town, P.spawn, P.cliffs, P.summit, P.mine, P.oldMine];
const areaFits = (x, y, w, h, zone) => {
  if (x < 4 || y < 4 || x + w > W - 4 || y + h > H - 4) return false;
  if (subzoneAt(x + w / 2, y + h / 2)?.name !== zone) return false;
  if (subzoneAt(x, y)?.safe || subzoneAt(x + w, y + h)?.safe || subzoneAt(x + w, y)?.safe || subzoneAt(x, y + h)?.safe) return false;
  if (KEEP_AWAY.some((k) => Math.abs(k.x - (x + w / 2)) < w / 2 + 6 && Math.abs(k.y - (y + h / 2)) < h / 2 + 5)) return false;
  if (encounterAreas.some((o) => x < o.x + o.w + 3 && o.x < x + w + 3 && y < o.y + o.h + 3 && o.y < y + h + 3)) return false;
  let land = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const t = at(xx, yy);
    if (AREA_BAD.includes(t)) return false;
    if (AREA_LAND.includes(t)) land++;
  }
  return land >= w * h * 0.9;
};
for (const [zone, cfg] of Object.entries(POBLAR)) {
  const z = subzones.find((s) => s.name === zone);
  const cands = [];
  for (let y = z.y0; y <= z.y1; y += 2) for (let x = z.x0; x <= z.x1; x += 2) {
    const w = 12 + ((x + y) % 3) * 2;
    const h = 7 + ((x * 3 + y) % 3);
    if (areaFits(x, y, w, h, zone)) cands.push({ x, y, w, h });
    // en el terreno más cortado (minas, lago, pinar) también entran zonas más chicas
    else if (areaFits(x, y, 10, 6, zone)) cands.push({ x, y, w: 10, h: 6 });
  }
  const mine = () => encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === zone);
  let k = 0;
  while (mine().length < cfg.n) {
    const placed = mine();
    let best = null;
    let bestD = -1;
    for (const c of cands) {
      if (!areaFits(c.x, c.y, c.w, c.h, zone)) continue;
      const d = placed.length ? Math.min(...placed.map((o) => Math.hypot(o.x + o.w / 2 - c.x - c.w / 2, o.y + o.h / 2 - c.y - c.h / 2))) : 999;
      if (d > bestD) { best = c; bestD = d; }
    }
    if (!best) break;
    encounterAreas.push({ name: cfg.names[k % cfg.names.length], ...best, monstruos: cfg.mons[k % cfg.mons.length] });
    k++;
  }
}
for (const a of encounterAreas) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  for (let y = a.y - 1; y <= a.y + a.h; y++) for (let x = a.x - 1; x <= a.x + a.w; x++) {
    const d = ((x - cx) / (a.w / 2)) ** 2 + ((y - cy) / (a.h / 2)) ** 2;
    const n = valueNoise(x, y, 4, 31);
    if (['roca', 'nieve', 'pasto', 'mesetan'].includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 33) > 0.18) setT(x, y, 'hierban');
  }
}


// la pared de la meseta: dos filas debajo del borde sur y del borde oeste, con una escalera
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'mesetan' || at(x, y + 1) === 'mesetan') continue;
  for (const dy of [1, 2]) if (!['abismo', 'mesetan', 'colgante', 'hielo'].includes(at(x, y + dy))) setT(x, y + dy, 'caran');
}
// subida a la Cumbre desde el norte (el camino llega al borde de la meseta, que no tiene pared)
for (let y = 84; y <= 92; y++) for (const x of [128, 129]) if (at(x, y) === 'caran') setT(x, y, 'escalera');

// ---------------------------------------------------------------- capas de tiles
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = gid; };
const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && objects[y * W + x] === 0 && above[y * W + x] === 0;
const mask = (x, y, same) => (same(at(x, y - 1)) ? 1 : 0) | (same(at(x + 1, y)) ? 2 : 0)
  | (same(at(x, y + 1)) ? 4 : 0) | (same(at(x - 1, y)) ? 8 : 0);
const isPath = (t) => ['camino', 'plaza', 'colgante', 'escalera', null].includes(t);
const isChasm = (t) => t === 'abismo' || t === 'colgante';
const rockLike = (t) => ['roca', 'nieve', 'hierban', 'camino', 'plaza', 'muro', 'abismo', 'colgante', 'hielo', 'mesetan', 'caran', 'escalera', null].includes(t);
const snowLike = (t) => ['nieve', 'hierban', 'hielo', 'mesetan', null].includes(t);
const MOUNTAIN = ['roca', 'nieve', 'mesetan', 'hierban', 'abismo', 'hielo', 'muro'];
const onRock = (x, y) => [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => MOUNTAIN.includes(at(x + dx, y + dy)));

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    const r = rand();
    // el camino entre la roca lleva orilla de roca; el que toca la pradera, de pasto
    if (t === 'camino') gid = T[`${onRock(x, y) ? 'caminor' : 'camino'}_${mask(x, y, isPath)}`];
    else if (t === 'abismo') gid = T[`abismo_${mask(x, y, isChasm)}`];
    else if (t === 'colgante') gid = isChasm(at(x - 1, y)) && isChasm(at(x + 1, y)) ? T.colgante_v : T.colgante_h;
    else if (t === 'hielo') gid = T[`hielo_${mask(x, y, (n) => n === 'hielo')}`];
    else if (t === 'hierban') gid = T.hierba_nevada;
    else if (t === 'plaza') gid = T.piedra_plaza;
    else if (t === 'nieve') {
      const m = mask(x, y, snowLike);
      gid = m === 15 ? (r < 0.06 ? T.nieve_huellas : T.nieve_15) : T[`nieve_${m}`];
    } else if (t === 'mesetan') {
      const m = mask(x, y, (n) => ['mesetan', 'caran', 'escalera', 'hierban'].includes(n));
      gid = m === 15 ? (r < 0.05 ? T.nieve_huellas : T.nieve_15) : T[`mesetan_${m}`];
    } else if (t === 'escalera') gid = T.escalera;
    else if (t === 'caran') {
      const top = at(x, y - 1) === 'mesetan';
      const sideOk = (n) => n === 'caran' || n === 'escalera';
      const side = !sideOk(at(x - 1, y)) ? 'i' : (!sideOk(at(x + 1, y)) ? 'd' : 'c');
      gid = T[`cara_n_${top ? 'a' : 'b'}_${side}`];
    } else if (t === 'roca' || t === 'muro') {
      const m = mask(x, y, rockLike);
      gid = m === 15 ? (r < 0.08 ? T.roca_grava : r < 0.12 ? T.roca_musgo : T.roca_15) : T[`roca_${m}`];
    } else {
      gid = r < 0.08 ? T.pasto_matas : T.pasto;
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
  put(objects, x, y, T[`${name}_ai`]); put(objects, x + 1, y, T[`${name}_ad`]);
  put(objects, x, y + 1, T[`${name}_bi`]); put(objects, x + 1, y + 1, T[`${name}_bd`]);
}
const okGround = (x, y) => ['roca', 'nieve', 'pasto', 'mesetan'].includes(at(x, y));
const areaFree = (x, y, w, h, pad = 0) => {
  for (let yy = y - pad; yy < y + h + pad; yy++) for (let xx = x - pad; xx < x + w + pad; xx++) {
    if (!free(xx, yy) || !okGround(xx, yy)) return false;
  }
  return true;
};
const reserved = [];
const reserve = (x0, y0, x1, y1) => reserved.push([x0, y0, x1, y1]);
const isReserved = (x, y) => reserved.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);

// bordes norte, este y sur: una cordillera de picos que cierra el mapa (el oeste queda abierto)
function edgePeaks() {
  for (let x = 0; x <= W - 3; x += 3) { if (areaFree(x, 0, 3, 3)) placeGrid('pico', 3, 3, x, 0); if (areaFree(x, H - 3, 3, 3)) placeGrid('pico', 3, 3, x, H - 3); }
  for (let y = 3; y <= H - 6; y += 3) if (areaFree(W - 3, y, 3, 3)) placeGrid('pico', 3, 3, W - 3, y);
}
edgePeaks();

// Bastión de Hierro: casas de piedra, la forja enana, puestos, estandartes y antorchas
const torches = [];
function placeTown() {
  placeGrid('casa_piedra', 3, 3, 52, 43);
  placeGrid('casa_piedra', 3, 3, 72, 43);
  placeGrid('forja_enana', 3, 3, 71, 52);
  placeGrid('casa_piedra', 3, 3, 52, 53);
  placeGrid('casa_piedra', 3, 3, 76, 47);
  placeGrid('lonja', 4, 3, 57, 57);
  placeBig('carpa', 46, 48); placeBig('carpa', 46, 52);
  put(objects, 49, 50, T.fogata); put(objects, 48, 47, T.barril); put(objects, 45, 55, T.caja);
  put(objects, 64, 50, T.fogata);
  placeBig('puesto', 58, 47);
  put(objects, 69, 56, T.yunque); put(objects, 70, 56, T.barril); put(objects, 68, 57, T.caja);
  put(objects, 66, 46, T.cartel);
  for (const [x, y] of [[59, 45], [69, 45], [59, 55], [69, 55]]) { put(objects, x, y, T.antorcha); torches.push([x, y]); }
  placeGrid('estandarte_enano', 1, 2, 61, 44); placeGrid('estandarte_enano', 1, 2, 67, 44);
  // la entrada de la Mina Profunda, al norte del pueblo, con sus rieles
  placeGrid('entrada_mina', 3, 3, P.mine.x - 1, P.mine.y);
  for (let y = P.mine.y + 3; y <= 44; y++) put(objects, P.mine.x, y, T.rieles_v);
  put(objects, P.mine.x + 2, P.mine.y + 4, T.vagoneta);
  for (const [x, y] of [[P.mine.x - 2, P.mine.y + 2], [P.mine.x + 2, P.mine.y + 2]]) { put(objects, x, y, T.antorcha); torches.push([x, y]); }
}
placeTown();
reserve(48, 30, 80, 60);

// Minas Abandonadas: una entrada derrumbada, rieles cortados, vagonetas y escombros
placeGrid('entrada_mina', 3, 3, P.oldMine.x - 1, P.oldMine.y - 2);
for (let x = P.oldMine.x + 2; x <= P.oldMine.x + 12; x++) if (hash(x, 1, 3) > 0.25) put(objects, x, P.oldMine.y + 2, T.rieles_h);
for (const [x, y] of [[P.oldMine.x + 6, P.oldMine.y + 3], [P.oldMine.x + 14, P.oldMine.y + 1], [30, 20]]) put(objects, x, y, T.vagoneta);
for (const [x, y] of [[P.oldMine.x - 3, P.oldMine.y + 1], [P.oldMine.x + 3, P.oldMine.y + 1]]) { put(objects, x, y, T.antorcha); torches.push([x, y]); }
reserve(P.oldMine.x - 4, P.oldMine.y - 3, P.oldMine.x + 15, P.oldMine.y + 4);
// Lago Helado: cristales de hielo en la orilla
for (let i = 0; i < 40; i++) {
  const a = rand() * Math.PI * 2;
  const x = Math.round(P.lake.x + Math.cos(a) * (14 + rand() * 3));
  const y = Math.round(P.lake.y + Math.sin(a) * (9 + rand() * 2));
  if (free(x, y) && okGround(x, y) && rand() < 0.5) put(objects, x, y, T.cristal_hielo);
}
// Acantilados del Trueno: el claro del Señor del Acantilado
reserve(P.cliffs.x - 6, P.cliffs.y - 4, P.cliffs.x + 6, P.cliffs.y + 4);
// Cumbre del Rey: un anillo de picos y cristales alrededor del trono
reserve(P.summit.x - 7, P.summit.y - 5, P.summit.x + 7, P.summit.y + 5);
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2;
  const x = Math.round(P.summit.x + Math.cos(a) * 11);
  const y = Math.round(P.summit.y + Math.sin(a) * 7);
  if (i % 2 === 0 && areaFree(x, y, 2, 2)) placeGrid('roca_nevada', 2, 2, x, y);
  else if (free(x, y) && okGround(x, y)) put(objects, x, y, T.cristal_hielo);
}

// ---------------------------------------------------------------- montaña: picos, pinos y rocas
// densidad: pinar al norte, picos en los bordes (cierran el mapa), rocas nevadas sueltas
const peakDensity = (x, y) => {
  let d = 0;
  if (y < 5 || y > H - 7 || x > W - 7) d += 0.9;
  if (x > 100 && y > 36 && y < 82) d += fbm(x, y, 43) - 0.35;
  return d;
};
const pineDensity = (x, y) => {
  let d = fbm(x, y, 41) - 0.42;
  if (x > 52 && x < 112 && y < 40) d += 0.38;
  if (x < 50 && y > 30 && y < 72) d += 0.12;
  if (fbm(x, y, 45) > 0.6) d += 0.3; // bosquecitos sueltos por toda la montaña
  return d;
};
// crestas: filas de picos y rocas nevadas que separan las subzonas (los caminos las cruzan)
const ridges = [
  [[3, 31], [14, 29], [28, 33], [44, 30], [50, 34]],          // entre las Minas y el Paso
  [[82, 37], [94, 41], [106, 38], [112, 40]],                // entre el Pinar y los Acantilados
  [[84, 63], [94, 70], [100, 78], [104, 84]],                // entre los Acantilados y la Garganta
  [[6, 70], [16, 68], [22, 70]],                             // ladera sobre la Garganta
  [[148, 40], [150, 48], [152, 70], [150, 80]],              // detrás del Señor del Acantilado
];
function placeRidges() {
  for (const pts of ridges) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const steps = Math.ceil(dist(x1, y1, x2, y2) / 2);
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = Math.round(x1 + (x2 - x1) * t + (hash(k, i, 71) - 0.5) * 2);
        const y = Math.round(y1 + (y2 - y1) * t + (hash(k, i, 72) - 0.5) * 2);
        for (const [ox, oy] of [[0, 0], [1, -2], [-1, 2]]) {
          const xx = x + ox;
          const yy = y + oy;
          if (isReserved(xx, yy)) continue;
          if (hash(xx, yy, 73) < 0.6 && areaFree(xx, yy, 3, 3)) placeGrid('pico', 3, 3, xx, yy);
          else if (areaFree(xx, yy, 2, 2)) placeGrid(['nieve', 'mesetan'].includes(at(xx, yy)) ? 'roca_nevada' : 'roca_grande', 2, 2, xx, yy);
          else if (free(xx, yy) && okGround(xx, yy)) put(objects, xx, yy, T.roca);
        }
      }
    }
  }
}
placeRidges();
// picos: grandes (3x3), para cerrar los bordes y dar forma a los riscos
for (let y = 1; y < H - 2; y += 3) {
  for (let x = 0; x < W - 2; x += 3) {
    const ox = x + Math.floor(hash(x, y, 53) * 2);
    const oy = y + Math.floor(hash(x, y, 54) * 2);
    if (isReserved(ox, oy) || isReserved(ox + 2, oy + 2) || (ox < 4 && Math.abs(oy - 50) < 8)) continue;
    const d = peakDensity(ox, oy);
    if (d <= 0.05 || rand() > d) continue;
    if (!areaFree(ox, oy, 3, 3)) continue;
    placeGrid('pico', 3, 3, ox, oy);
  }
}
for (let y = 2; y < H - 1; y += 2) {
  for (let x = 0; x < W - 1; x += 2) {
    const ox = x + (hash(x, y, 51) < 0.5 ? 0 : 1);
    const oy = y + (hash(x, y, 52) < 0.5 ? 0 : 1);
    if (isReserved(ox, oy) || isReserved(ox + 1, oy + 1)) continue;
    const d = pineDensity(ox, oy);
    if (d <= 0.05 || rand() > d * 1.4) continue;
    if (!areaFree(ox, oy, 2, 2)) continue;
    if (at(ox, oy) === 'pasto') placeGrid('pino', 2, 2, ox, oy);
    else placeGrid('pino_nevado', 2, 2, ox, oy);
  }
}
// el paso del oeste queda abierto (se entra caminando desde la Pradera)
for (let y = 47; y <= 54; y++) for (let x = 0; x < 6; x++) { put(objects, x, y, 0); put(above, x, y, 0); }

// detalles: rocas, rocas nevadas, cristales, tocones, arbustos secos
for (let i = 0; i < 1400; i++) {
  const x = 2 + Math.floor(rand() * (W - 4));
  const y = 2 + Math.floor(rand() * (H - 4));
  if (!free(x, y) || isReserved(x, y) || !okGround(x, y)) continue;
  const snow = ['nieve', 'mesetan'].includes(at(x, y));
  const r = rand();
  if (r < 0.05) put(objects, x, y, T.roca);
  else if (r < 0.075 && areaFree(x, y, 2, 2)) placeGrid(snow ? 'roca_nevada' : 'roca_grande', 2, 2, x, y);
  else if (r < 0.07 && snow) put(objects, x, y, T.cristal_hielo);
  else if (r < 0.085 && !snow) put(objects, x, y, T.arbusto_seco);
  else if (r < 0.095) put(objects, x, y, T.tocon);
}
// caminos, plaza, puentes, escaleras y paredes siempre libres
for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
  const t = at(x, y);
  const k = y * W + x;
  if (['camino', 'plaza', 'escalera', 'colgante', 'caran', 'abismo', 'hielo'].includes(t)) { objects[k] = 0; above[k] = 0; }
}
// el pueblo y las minas van encima del camino
placeTown();

// ---------------------------------------------------------------- puntos (en coordenadas de la zona, px)
const px = (n) => n * 32;
const prop = (name, type, value) => ({ name, type, value });
const points = [];
const pt = (o) => points.push(o);
pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
pt({ name: 'acantilado_senor', type: 'jefe', x: px(P.cliffs.x), y: px(P.cliffs.y), properties: [
  prop('monstruo', 'string', 'SENOR_ACANTILADO'), prop('nivel', 'int', 27), prop('etiqueta', 'string', 'Desafiar al Señor del Acantilado')] });
pt({ name: 'trono_rey', type: 'jefe', x: px(P.summit.x), y: px(P.summit.y), properties: [
  prop('monstruo', 'string', 'REY_MONTANA'), prop('nivel', 'int', 30), prop('etiqueta', 'string', 'Desafiar al Rey de Montaña')] });
pt({ name: 'enfermeria_bastion', type: 'poi', x: px(64), y: px(51), properties: [prop('etiqueta', 'string', 'Fogata del Bastión — Enfermería'), prop('ventana', 'string', 'enfermeria')] });
// luces de noche: antorchas del pueblo y de las minas, fogata del pueblo
[...torches.map(([x, y]) => [x, y, 'antorcha']), [64, 50, 'fogata']]
  .forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
// zonas de encuentro
encounterAreas.forEach((a) => pt({
  name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
  properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', Math.max(3, Math.round((a.w * a.h) / 25)))],
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
const anyLand = (t) => ['roca', 'nieve', 'mesetan'].includes(t);
function resource(id, tipo, centers, spots = 3) {
  const list = [];
  for (const [cx, cy, r] of centers) {
    for (let i = 0; i < spots; i++) {
      const s = findSpot(cx, cy, r, anyLand, tipo === 'restos_montana');
      if (s) { list.push(s); put(objects, s[0], s[1], 0); put(above, s[0], s[1] - 1, 0); }
    }
  }
  resourceDefs.push({ id, tipo, spots: list.length });
  list.forEach(([x, y], i) => pt({ name: id, type: 'recurso', x: px(x) + 16, y: px(y) + 16, properties: [prop('tipo', 'string', tipo), prop('sitio', 'int', i)] }));
}
// cada subzona con lo suyo (como la Pradera: ~100 puntos en total). Los ids viejos se mantienen.
// Paso de la Montaña
resource('mineral_paso', 'veta_montana', [[34, 44, 8], [14, 60, 6]]);
resource('tronco_paso', 'pino', [[20, 62, 8], [40, 38, 6]]);
resource('flor_paso', 'flor_nieve', [[10, 40, 6], [30, 52, 6]]);
// la entrada derrumbada de las Minas Abandonadas baja a la Mina Profunda (zona propia, ver
// generar_mina.js): la casilla del medio de la entrada es la que se pisa. Las salidas de la mina
// vuelven a la casilla 22,10, justo debajo.
pt({ name: 'entrada_mina_profunda', type: 'salida', x: px(P.oldMine.x), y: px(P.oldMine.y), width: 32, height: 32, properties: [prop('destino', 'string', 'mina_profunda'), prop('x', 'int', 19), prop('y', 'int', 6), prop('etiqueta', 'string', 'La Mina Profunda')] });
// Minas Abandonadas
resource('mineral_minas', 'veta_montana', [[28, 18, 9], [44, 10, 6]], 4);
resource('flor_minas', 'flor_nieve', [[8, 26, 5]]);
resource('cofre_minas', 'cofre_montana', [[8, 6, 3], [48, 4, 3]], 1);
// Pinar Nevado
resource('tronco_pinar', 'pino', [[80, 16, 10], [62, 28, 6]], 4);
resource('flor_pinar', 'flor_nieve', [[96, 10, 8], [70, 4, 5]]);
resource('restos_pinar', 'restos_montana', [[100, 30, 6]]);
// Lago Helado
resource('cuarzo_lago', 'cristal_lago', [[132, 30, 8], [150, 12, 6]], 4);
resource('flor_lago', 'flor_nieve', [[118, 8, 6]]);
resource('cofre_lago', 'cofre_montana', [[154, 30, 3], [110, 6, 3]], 1);
// Garganta del Eco
resource('mineral_garganta', 'veta_montana', [[60, 98, 8], [20, 88, 6]]);
resource('tronco_garganta', 'pino', [[84, 80, 8]]);
resource('flor_garganta', 'flor_nieve', [[40, 110, 8]]);
resource('restos_garganta', 'restos_montana', [[36, 96, 8]]);
resource('cofre_garganta', 'cofre_montana', [[12, 112, 3], [80, 114, 3]], 1);
// Acantilados del Trueno
resource('mineral_acantilados', 'veta_montana', [[100, 60, 8], [140, 48, 6]]);
resource('flor_acantilados', 'flor_nieve', [[120, 76, 8]]);
resource('restos_acantilados', 'restos_montana', [[92, 50, 6]]);
resource('cofre_acantilados', 'cofre_montana', [[156, 44, 3], [118, 40, 3]], 1);
// Cumbre del Rey
resource('mineral_cumbre', 'veta_montana', [[124, 108, 8]]);
resource('flor_cumbre', 'flor_nieve', [[146, 112, 6]]);
resource('restos_cumbre', 'restos_montana', [[146, 98, 6]]);
resource('cofre_cumbre', 'cofre_montana', [[154, 112, 3], [112, 112, 3]], 1);


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
    const objs = points.filter(inside).map((o, i) => ({ id: i + 1, rotation: 0, visible: true, width: 0, height: 0, ...o, x: o.x - x0, y: o.y - y0 }));
    const map = {
      type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
      width: CW, height: CH, tilewidth: 32, tileheight: 32, infinite: false, nextlayerid: 5, nextobjectid: objs.length + 1,
      properties: [prop('zona', 'int', 2)],
      layers: [
        tileLayer(1, 'suelo', cut(ground)), tileLayer(2, 'objetos', cut(objects)), tileLayer(3, 'encima', cut(above)),
        { id: 4, name: 'puntos', type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects: objs },
      ],
      tilesets: [tilesetRef],
      terreno: cut(terrainCodes),
      paso: {},
    };
    const file = `chunk_${cx}_${cy}.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(map));
    chunks.push({ cx, cy, file });
  }
}

const range16 = (p) => Array.from({ length: 16 }, (_, m) => T[`${p}_${m}`]);
const world = {
  nombre: 'Montañas Grises', zona: 2, tileset: 'pradera', terrenos: TERRENOS, tile: 32, chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0.07, gidHierba: T.hierba_nevada,
  inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
  clima: { estacion: 'invierno', lluvia: 0, nieve: 0.5 },
  // tiles que usa la fauna del ambiente
  gids: {
    flores: [],
    agua: range16('hielo'),
    prado: [T.roca_15, T.roca_grava, T.nieve_15],
    arboles: [T.pino_nevado_0_0, T.pino_nevado_0_1, T.pino_0_0, T.pino_0_1],
    dorados: [],
    seco: [],
  },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
fs.writeFileSync(path.join(__dirname, 'recursos_montanas.json'), JSON.stringify(resourceDefs, null, 1));

if (process.argv.includes('--preview')) {
  const COLORS = {
    pasto: [92, 154, 60], roca: [134, 132, 143], nieve: [236, 242, 250], camino: [201, 164, 106], abismo: [26, 24, 34],
    hielo: [168, 220, 240], hierban: [58, 108, 70], plaza: [154, 148, 136], mesetan: [214, 224, 238], caran: [100, 98, 110],
    escalera: [154, 148, 136], colgante: [138, 85, 48], muro: [80, 78, 90],
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
  fs.writeFileSync(path.join(__dirname, 'montanas_preview.json'), JSON.stringify({ w: W, h: H, rows }));
}
console.log(`Montañas generadas: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
console.log('Recursos:', resourceDefs.map((r) => `${r.id}(${r.spots})`).join(' '));
