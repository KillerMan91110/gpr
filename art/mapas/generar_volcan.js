// Genera el Volcán Rojo (zona 3) como un mundo de 4x4 trozos de 40x30 tiles, igual que las Montañas:
//   public/assets/mundo/volcan/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/volcan/mundo.json            (índice: trozos, subzonas, inicio)
// Va pegado al borde sur de las Montañas (etheria.json): se entra caminando por el Paso del Humo.
// Diseño completo en gprback/docs/zona3_volcan.md.
//
// Diseño (norte arriba): el Paso del Humo baja desde las Montañas a la Ladera de Ceniza; al noreste,
// sobre una meseta de basalto, Ascuaria, la ciudad de los dracónidos (la Gran Forja de Ignar). Al
// noroeste los Campos de Azufre, con sus fumarolas; al oeste el Bosque Calcinado y el campamento de
// los bandidos. En el centro, los Ríos de Lava con puentes de basalto y el muelle de las balsas de
// Pumo; al este la Cantera de Obsidiana. Abajo: al suroeste la Grieta Ardiente (los Ocultos y la
// entrada a la Fisura Infernal), al centro la Caldera del Titán (un lago de lava con una isla) y al
// sureste el Nido del Dragón, con huesos enormes. Picos volcánicos cierran los bordes.
//
// Uso: node art/mapas/generar_volcan.js   (con --preview además deja volcan_preview.json; ver bmp.js)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/volcan');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('El Volcán ya se editó con el editor de mapas: no lo piso. Usa --forzar para regenerarlo igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico de esta zona (el editor arma los bordes con ellos, ver src/editor/rules.js)
const TERRENOS = ['basalto', 'ceniza', 'lava', 'azufre', 'quemado', 'obsidiana', 'camino', 'hierbaq', 'mesetav', 'carav', 'escalera', 'puentev', 'losav'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261017;
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
const terrain = Array.from({ length: H }, () => new Array(W).fill('basalto'));
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
const stroke = (pts, w, t, only = null) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const wob = Math.sin((x1 + (x2 - x1) * f) / 4) * 1.2;
      const cx = x1 + (x2 - x1) * f;
      const cy = y1 + (y2 - y1) * f + wob;
      for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
        if (dx * dx + dy * dy > w * w + 1) continue;
        const xx = Math.round(cx + dx);
        const yy = Math.round(cy + dy);
        if (!only || only.includes(at(xx, yy))) setT(xx, yy, t);
      }
    }
  }
};

// sitios importantes (en tiles; las casillas de NPCs, forja y jefes se repiten en el back:
// lib/cercania.js y lib/questSteps.js)
const P = {
  entry: { x: 88, y: 0 }, spawn: { x: 88, y: 4 }, town: { x: 112, y: 30 }, forge: { x: 113, y: 21 },
  fisura: { x: 33, y: 95 }, gates: { x: 86, y: 89 }, titan: { x: 86, y: 107 }, lake: { x: 86, y: 106 },
  bandits: { x: 13, y: 74 }, cult: { x: 18, y: 104 }, dock: { x: 72, y: 46 }, quarry: { x: 138, y: 54 }, nest: { x: 136, y: 102 },
};

// 1) ceniza: la Ladera (norte) casi toda; más abajo solo manchas sueltas sobre el basalto
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const north = (44 - y) / 44 * 0.4;
  if (fbm(x, y, 11) + Math.max(0, north) > 0.66) setT(x, y, 'ceniza');
}
// 2) Campos de Azufre: costras amarillas al noroeste
for (const [cx, cy, rx, ry] of [[14, 12, 9, 6], [30, 24, 10, 6], [12, 34, 8, 5], [38, 8, 7, 4]]) blobT(cx, cy, rx, ry, 'azufre', 0.4, cx + cy);
// 3) Bosque Calcinado: tierra quemada al oeste, más espesa en el medio del bosque y deshilachada en el borde
for (let y = 40; y < 90; y++) for (let x = 0; x < 56; x++) {
  const d = Math.min(1, dist(x / 1.1, y, 22 / 1.1, 64) / 26);
  if (fbm(x, y, 21) * 0.6 + (1 - d) * 0.75 > 0.62) setT(x, y, 'quemado');
}
// 4) Cantera de Obsidiana: campos de vidrio negro al este
for (const [cx, cy, rx, ry] of [[134, 50, 10, 6], [148, 64, 9, 7], [130, 72, 8, 5], [152, 46, 5, 4]]) blobT(cx, cy, rx, ry, 'obsidiana', 0.35, cx * 2 + cy);
// 5) Ríos de Lava: dos ríos que cruzan el centro de oeste a este, y charcos en la Grieta y el Nido
const RIVERS = [
  [[50, 50], [62, 54], [74, 52], [88, 58], [100, 56], [112, 62], [122, 60]],
  [[54, 78], [66, 72], [80, 70], [94, 76], [106, 80], [118, 78]],
  [[88, 58], [90, 64], [86, 70]], // brazo que une los dos ríos
];
for (const r of RIVERS) stroke(r, 1, 'lava');
for (const [cx, cy, rx, ry] of [[44, 100, 4, 3], [10, 90, 3, 2], [150, 112, 4, 2], [122, 96, 3, 2]]) blobT(cx, cy, rx, ry, 'lava', 0.3, cx + cy);
// 6) Caldera del Titán: un lago de lava con una isla de basalto en el medio
blobT(P.lake.x, P.lake.y, 21, 11, 'lava', 0.25, 77);
blobT(P.lake.x, P.lake.y + 1, 7, 4, 'basalto', 0.2, 78);
// 7) Ascuaria: meseta de basalto con su plaza
const plateau = { cx: P.town.x, cy: P.town.y, rx: 17, ry: 10 };
for (let y = plateau.cy - plateau.ry - 2; y <= plateau.cy + plateau.ry + 2; y++) for (let x = plateau.cx - plateau.rx - 2; x <= plateau.cx + plateau.rx + 2; x++) {
  const d = ((x - plateau.cx) / plateau.rx) ** 2 + ((y - plateau.cy) / plateau.ry) ** 2;
  if (d <= 1 + (valueNoise(x, y, 3, 9) - 0.5) * 0.3) setT(x, y, 'mesetav');
}
rectT(105, 27, 117, 34, 'losav');

// 8) caminos: del Paso a Ascuaria, y de ahí a cada subzona (sobre la lava pasan puentes de basalto)
const roads = [];
const road = (pts, width = 2) => roads.push({ pts, width });
road([[88, 0], [88, 8], [92, 14], [100, 18], [106, 22]]);                      // el Paso del Humo, hasta Ascuaria
road([[96, 16], [80, 18], [62, 16], [46, 18], [30, 20], [20, 24]], 1);          // a los Campos de Azufre
road([[46, 18], [40, 32], [34, 46], [28, 58], [22, 70], [16, 74]], 1);          // al Bosque Calcinado y los bandidos
road([[111, 40], [108, 48], [100, 54], [92, 62], [88, 72], [86, 80], [86, 88]]); // de Ascuaria a la Caldera, cruzando los ríos
road([[100, 54], [84, 50], [72, 47]], 1);                                       // al muelle de Pumo
road([[124, 34], [132, 42], [138, 50]], 1);                                     // a la Cantera
road([[92, 62], [110, 66], [126, 66], [134, 70]], 1);                            // de los ríos a la Cantera por el sur
road([[86, 82], [104, 88], [118, 94], [132, 100]], 1);                           // al Nido del Dragón
road([[86, 82], [64, 88], [48, 92], [36, 98]], 1);                               // a la Grieta y la Fisura
road([[22, 70], [24, 84], [30, 94]], 1);                                        // del bosque a la Grieta
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
        if (tt === 'lava' || tt === 'puentev') setT(cx + dx, cy + dy, 'puentev');
        else if (['mesetav', 'losav', 'carav'].includes(tt)) continue;
        else if (tt !== null) setT(cx + dx, cy + dy, 'camino');
      }
    }
  }
}
// el puente de la Caldera: de las puertas a la isla del Titán
for (let y = P.gates.y; y <= P.lake.y - 2; y++) for (const x of [86, 87]) if (['lava', 'puentev', 'camino', 'basalto', 'ceniza'].includes(at(x, y))) setT(x, y, at(x, y) === 'lava' || at(x, y) === 'puentev' ? 'puentev' : 'camino');

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Ascuaria', x0: 94, y0: 18, x1: 130, y1: 42, levels: null, safe: true },
  { name: 'Campos de Azufre', x0: 0, y0: 0, x1: 49, y1: 43, levels: '32-35' },
  { name: 'Bosque Calcinado', x0: 0, y0: 44, x1: 49, y1: 85, levels: '33-36' },
  { name: 'Cantera de Obsidiana', x0: 120, y0: 43, x1: 159, y1: 85, levels: '36-40' },
  { name: 'Ríos de Lava', x0: 50, y0: 43, x1: 119, y1: 85, levels: '35-39' },
  { name: 'Grieta Ardiente', x0: 0, y0: 86, x1: 59, y1: 119, levels: '39-42' },
  { name: 'Nido del Dragón', x0: 116, y0: 86, x1: 159, y1: 119, levels: '38-41' },
  { name: 'Caldera del Titán', x0: 60, y0: 86, x1: 115, y1: 119, levels: '43-45' },
  { name: 'Ladera de Ceniza', x0: 50, y0: 0, x1: 159, y1: 42, levels: '31-33' },
  { name: 'Volcán Rojo', x0: 0, y0: 0, x1: 159, y1: 119, levels: '31-45' },
];

// 9) hierba quemada (encuentros) por subzona, con los monstruos que viven ahí
const encounterAreas = [];
const POBLAR = {
  'Ladera de Ceniza': { n: 7, mons: [['SALAMANDRA_ROJA', 'LOBO_CENIZA'], ['LOBO_CENIZA', 'SALAMANDRA_ROJA']],
    names: ['Pendiente Gris', 'Pinos Quemados', 'Huellas en la Ceniza', 'Rellano del Humo', 'Lomas de Pómez', 'Cuesta del Lobo', 'Mirador del Volcán'] },
  'Campos de Azufre': { n: 6, mons: [['ESCARABAJO_AZUFRE', 'SALAMANDRA_ROJA'], ['ESCARABAJO_AZUFRE', 'ELEMENTAL_FUEGO'], ['ESCARABAJO_AZUFRE', 'LOBO_CENIZA']],
    names: ['Charcos Verdes', 'Costra Amarilla', 'Campo de Fumarolas', 'Nube Amarga', 'Hondonada de Azufre', 'Cristales Podridos'] },
  'Bosque Calcinado': { n: 7, mons: [['LOBO_CENIZA', 'BANDIDO_FUEGO'], ['BANDIDO_FUEGO', 'BANDIDO_FUEGO'], ['BANDIDO_FUEGO', 'LOBO_CENIZA']],
    names: ['Troncos Negros', 'Claro de las Brasas', 'Senda del Bandido', 'Madriguera de Ceniza', 'Robledal Muerto', 'Vigía de los Bandidos', 'Humo entre Ramas'] },
  'Ríos de Lava': { n: 7, mons: [['ELEMENTAL_FUEGO', 'SERPIENTE_MAGMA'], ['SERPIENTE_MAGMA', 'SALAMANDRA_ROJA'], ['ELEMENTAL_FUEGO', 'SALAMANDRA_ROJA']],
    names: ['Orilla Ardiente', 'Vado de Magma', 'Isla de Basalto', 'Remolino Rojo', 'Costa Humeante', 'Brazo del Río', 'Piedras Flotantes'] },
  'Cantera de Obsidiana': { n: 6, mons: [['GOLEM_OBSIDIANA', 'CENTINELA_INFERNAL'], ['GOLEM_OBSIDIANA', 'GOLEM_OBSIDIANA'], ['CENTINELA_INFERNAL', 'GOLEM_OBSIDIANA']],
    names: ['Agujas Negras', 'Talud de Vidrio', 'Pozo de la Cantera', 'Bancal Pulido', 'Espejo Negro', 'Grúas Viejas'] },
  'Nido del Dragón': { n: 6, mons: [['DRACO_BRASA', 'DRACO_BRASA'], ['DRACO_BRASA', 'SERPIENTE_MAGMA'], ['DRACO_BRASA', 'DRAGON_MENOR_CORRUPTO']],
    names: ['Costillar', 'Cementerio de Escamas', 'Huevos Tibios', 'Cráter del Nido', 'Garra Partida', 'Vuelo Bajo'] },
  'Grieta Ardiente': { n: 7, mons: [['FANATICO_ECLIPSE', 'CENTINELA_INFERNAL'], ['FANATICO_ECLIPSE', 'DEMONIO_LAVA'], ['CENTINELA_INFERNAL', 'FANATICO_ECLIPSE', 'MAESTRO_LAVA']],
    names: ['Tierra Partida', 'Altar del Eclipse', 'Tiendas Moradas', 'Grieta Roja', 'Vigilia Oscura', 'Paso de los Fanáticos', 'Borde del Abismo'] },
  'Caldera del Titán': { n: 6, mons: [['DEMONIO_LAVA', 'DIABLILLO_CALDERA'], ['DIABLILLO_CALDERA', 'DIABLILLO_CALDERA'], ['DEMONIO_LAVA', 'DIABLILLO_CALDERA', 'DEMONIO_LAVA']],
    names: ['Labio del Cráter', 'Rocas Saltarinas', 'Cornisa de Fuego', 'Antesala de la Caldera', 'Humo Rojo', 'Risas en la Lava'] },
};
const subzoneAt = (x, y) => subzones.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
const AREA_BAD = ['camino', 'losav', 'lava', 'puentev', 'carav', 'escalera', 'mesetav'];
const AREA_LAND = ['basalto', 'ceniza', 'quemado', 'azufre', 'obsidiana'];
const KEEP_AWAY = [P.town, P.spawn, P.gates, P.titan, P.fisura, P.dock, P.bandits, P.cult, P.quarry, P.nest];
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
    if (AREA_LAND.includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 33) > 0.18) setT(x, y, 'hierbaq');
  }
}

// la pared de la meseta: dos filas debajo del borde sur, con una escalera para bajar a los ríos
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'mesetav' || ['mesetav', 'losav'].includes(at(x, y + 1))) continue;
  for (const dy of [1, 2]) if (!['lava', 'mesetav', 'losav', 'puentev'].includes(at(x, y + dy))) setT(x, y + dy, 'carav');
}
for (let y = 36; y <= 44; y++) for (const x of [111, 112]) if (at(x, y) === 'carav') setT(x, y, 'escalera');

// ---------------------------------------------------------------- capas de tiles
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = gid; };
const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && objects[y * W + x] === 0 && above[y * W + x] === 0;
const mask = (x, y, same) => (same(at(x, y - 1)) ? 1 : 0) | (same(at(x + 1, y)) ? 2 : 0)
  | (same(at(x, y + 1)) ? 4 : 0) | (same(at(x - 1, y)) ? 8 : 0);
const isPath = (t) => ['camino', 'losav', 'puentev', 'escalera', null].includes(t);
const ashLike = (t) => ['ceniza', 'hierbaq', 'quemado', 'camino', 'losav', null].includes(t);
const isLava = (t) => t === 'lava' || t === 'puentev';
// la Grieta Ardiente tiene la tierra partida: más basalto con grietas encendidas
const crackChance = (x, y) => (subzoneAt(x, y)?.name === 'Grieta Ardiente' ? 0.22 : subzoneAt(x, y)?.name === 'Caldera del Titán' ? 0.14 : 0.04);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    const r = rand();
    if (t === 'camino') gid = T[`caminov_${mask(x, y, isPath)}`];
    else if (t === 'lava') gid = T[`lava_${mask(x, y, isLava)}`];
    else if (t === 'puentev') gid = isLava(at(x - 1, y)) && isLava(at(x + 1, y)) ? T.puente_basalto_v : T.puente_basalto_h;
    else if (t === 'azufre') gid = T[`azufre_${mask(x, y, (n) => n === 'azufre')}`];
    else if (t === 'quemado') gid = T[`quemado_${mask(x, y, (n) => ['quemado', 'hierbaq'].includes(n))}`];
    else if (t === 'obsidiana') gid = T[`obsidiana_${mask(x, y, (n) => n === 'obsidiana')}`];
    else if (t === 'hierbaq') gid = T.hierba_quemada;
    else if (t === 'losav') gid = r < 0.06 ? T.losa_basalto_runa : T.losa_basalto;
    else if (t === 'ceniza') {
      const m = mask(x, y, ashLike);
      gid = m === 15 ? (r < 0.06 ? T.ceniza_pomez : r < 0.1 ? T.ceniza_huellas : T.ceniza_15) : T[`ceniza_${m}`];
    } else if (t === 'mesetav') {
      gid = T[`mesetav_${mask(x, y, (n) => ['mesetav', 'carav', 'escalera', 'losav'].includes(n))}`];
    } else if (t === 'escalera') gid = T.escalera;
    else if (t === 'carav') {
      const top = at(x, y - 1) === 'mesetav';
      const sideOk = (n) => n === 'carav' || n === 'escalera';
      const side = !sideOk(at(x - 1, y)) ? 'i' : (!sideOk(at(x + 1, y)) ? 'd' : 'c');
      gid = T[`cara_v_${top ? 'a' : 'b'}_${side}`];
    } else {
      gid = r < crackChance(x, y) ? T.basalto_grieta : T.basalto;
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
const okGround = (x, y) => ['basalto', 'ceniza', 'quemado', 'azufre', 'obsidiana', 'mesetav'].includes(at(x, y));
const areaFree = (x, y, w, h, pad = 0) => {
  for (let yy = y - pad; yy < y + h + pad; yy++) for (let xx = x - pad; xx < x + w + pad; xx++) {
    if (!free(xx, yy) || !okGround(xx, yy)) return false;
  }
  return true;
};
const reserved = [];
const reserve = (x0, y0, x1, y1) => reserved.push([x0, y0, x1, y1]);
const isReserved = (x, y) => reserved.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);

// Ascuaria: casas de basalto, la Gran Forja de Ignar, la parrilla de Tuli, estandartes y faroles
const lights = [];
function placeTown() {
  placeGrid('gran_forja', 4, 3, P.forge.x, P.forge.y);
  placeGrid('casa_basalto', 3, 3, 99, 23);
  placeGrid('casa_basalto_b', 3, 3, 106, 21);
  placeGrid('casa_basalto_b', 3, 3, 99, 32);
  placeGrid('casa_basalto', 3, 3, 121, 31);
  placeGrid('casa_basalto', 3, 3, 120, 23);
  put(objects, 117, 25, T.yunque); put(objects, 118, 26, T.barril); put(objects, 112, 25, T.caja);
  put(objects, 108, 36, T.parrilla); put(objects, 107, 36, T.barril);
  // el puesto de Marga, la mercader, en la esquina de la plaza
  put(objects, 115, 27, T.puesto_rojo_ai); put(objects, 116, 27, T.puesto_rojo_ad);
  put(objects, 115, 28, T.puesto_rojo_bi); put(objects, 116, 28, T.puesto_rojo_bd);
  put(objects, 117, 29, T.caja); put(objects, 117, 30, T.barril);
  placeGrid('estandarte_dracon', 1, 2, 105, 26); placeGrid('estandarte_dracon', 1, 2, 117, 26);
  for (const [x, y] of [[104, 28], [118, 28], [104, 34], [118, 34], [110, 21], [124, 28]]) { put(objects, x, y, T.farol_lava); lights.push([x, y, 'farol']); }
  // el brasero de la plaza es el refugio de Ascuaria (como la fogata del Bastión)
  put(objects, 111, 33, T.brasero_dracon); lights.push([111, 33, 'fogata']);
  put(objects, 113, 30, T.huevo_dragon);
  put(objects, 109, 27, T.cartel);
}
placeTown();
reserve(94, 18, 130, 42);

// Campos de Azufre: respiraderos sueltos
for (let i = 0; i < 26; i++) {
  const x = 3 + Math.floor(rand() * 44);
  const y = 3 + Math.floor(rand() * 38);
  if (free(x, y) && at(x, y) === 'azufre' && rand() < 0.8) put(objects, x, y, T.respiradero);
}
// Bosque Calcinado: el campamento de los bandidos (carpas, fogata, cajas robadas)
placeBig('carpa', P.bandits.x - 4, P.bandits.y - 2); placeBig('carpa', P.bandits.x + 3, P.bandits.y - 2);
put(objects, P.bandits.x, P.bandits.y, T.fogata); lights.push([P.bandits.x, P.bandits.y, 'fogata']);
put(objects, P.bandits.x - 2, P.bandits.y + 2, T.caja); put(objects, P.bandits.x + 2, P.bandits.y + 2, T.barril); put(objects, P.bandits.x + 4, P.bandits.y + 2, T.caja);
reserve(P.bandits.x - 6, P.bandits.y - 4, P.bandits.x + 7, P.bandits.y + 4);
// Ríos de Lava: el muelle de Pumo con sus balsas de pómez
put(objects, P.dock.x - 2, P.dock.y + 3, T.balsa_pomez); put(objects, P.dock.x + 2, P.dock.y + 4, T.balsa_pomez);
put(objects, P.dock.x + 1, P.dock.y, T.farol_lava); lights.push([P.dock.x + 1, P.dock.y, 'farol']);
reserve(P.dock.x - 4, P.dock.y - 3, P.dock.x + 4, P.dock.y + 3);
// Cantera de Obsidiana: grúas y bloques
placeGrid('grua_cantera', 2, 2, P.quarry.x - 6, P.quarry.y - 4); placeGrid('grua_cantera', 2, 2, P.quarry.x + 4, P.quarry.y + 2);
put(objects, P.quarry.x - 2, P.quarry.y + 1, T.caja); put(objects, P.quarry.x + 1, P.quarry.y - 3, T.farol_lava); lights.push([P.quarry.x + 1, P.quarry.y - 3, 'farol']);
reserve(P.quarry.x - 7, P.quarry.y - 5, P.quarry.x + 6, P.quarry.y + 4);
// Nido del Dragón: el cráneo, el costillar y los huevos
placeGrid('craneo_dragon', 3, 2, P.nest.x + 6, P.nest.y - 3);
placeGrid('costillas_dragon', 3, 2, P.nest.x - 6, P.nest.y + 4);
for (const [x, y] of [[P.nest.x - 2, P.nest.y], [P.nest.x + 1, P.nest.y + 1], [P.nest.x + 3, P.nest.y - 1]]) put(objects, x, y, T.huevo_dragon);
put(objects, P.nest.x - 4, P.nest.y - 2, T.huesos_dragon);
reserve(P.nest.x - 7, P.nest.y - 4, P.nest.x + 9, P.nest.y + 6);
// Grieta Ardiente: el campamento de los Ocultos (tiendas, cristales de eclipse) y el portal de la Fisura
placeGrid('tienda_ocultos', 2, 2, P.cult.x - 4, P.cult.y - 3); placeGrid('tienda_ocultos', 2, 2, P.cult.x + 3, P.cult.y - 2);
for (const [x, y] of [[P.cult.x, P.cult.y + 2], [P.cult.x - 3, P.cult.y + 1], [P.cult.x + 5, P.cult.y + 2]]) put(objects, x, y, T.cristal_eclipse);
put(objects, P.cult.x, P.cult.y - 1, T.fogata); lights.push([P.cult.x, P.cult.y - 1, 'fogata']);
reserve(P.cult.x - 5, P.cult.y - 4, P.cult.x + 6, P.cult.y + 3);
placeGrid('portal_fisura', 3, 3, P.fisura.x - 1, P.fisura.y);
for (const [x, y] of [[P.fisura.x - 2, P.fisura.y + 2], [P.fisura.x + 2, P.fisura.y + 2]]) { put(objects, x, y, T.brasero_dracon); lights.push([x, y, 'antorcha']); }
reserve(P.fisura.x - 3, P.fisura.y - 1, P.fisura.x + 3, P.fisura.y + 5);
// Caldera: las puertas (dos agujas y braseros) y la isla del Titán
for (const x of [P.gates.x - 3, P.gates.x + 4]) placeGrid('aguja_obsidiana', 1, 2, x, P.gates.y - 2);
reserve(P.gates.x - 4, P.gates.y - 3, P.gates.x + 5, P.gates.y + 3);
reserve(P.titan.x - 5, P.titan.y - 3, P.titan.x + 5, P.titan.y + 3);

// arcos de basalto: el refugio de la lluvia de brasas (Ríos, Grieta y Caldera; ver game/world/brasas.js).
// Cada uno busca un hueco libre cerca del lugar pensado; las casillas quedan en ARCOS_PUESTOS.
const ARCOS = [[84, 10], [66, 18], [60, 48], [96, 52], [82, 66], [104, 74], [70, 80], [24, 92], [44, 104], [12, 112], [50, 96],
  [70, 92], [104, 92], [66, 108], [108, 110], [130, 46], [120, 66]];
const ARCOS_PUESTOS = [];
for (const [cx, cy] of ARCOS) {
  let spot = null;
  for (let r = 0; r <= 6 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
    if (!isReserved(cx + dx, cy + dy) && areaFree(cx + dx, cy + dy, 3, 2)) spot = [cx + dx, cy + dy];
  }
  if (spot) { placeGrid('arco_basalto', 3, 2, spot[0], spot[1]); ARCOS_PUESTOS.push(spot); reserve(spot[0], spot[1], spot[0] + 2, spot[1] + 1); }
}

// ---------------------------------------------------------------- volcán: picos, árboles calcinados, agujas y rocas
const peakDensity = (x, y) => {
  let d = 0;
  if ((y < 4 && Math.abs(x - P.entry.x) > 6) || y > H - 6 || x > W - 6 || x < 4) d += 0.9;
  if (subzoneAt(x, y)?.name === 'Caldera del Titán' && dist(x, y, P.lake.x, P.lake.y) > 24) d += 0.4;
  return d;
};
const treeDensity = (x, y) => {
  const z = subzoneAt(x, y)?.name;
  let d = fbm(x, y, 41) - 0.48;
  if (z === 'Bosque Calcinado') d += 0.45;
  if (z === 'Ladera de Ceniza') d += 0.08;
  return d;
};
// crestas de picos que separan las subzonas (los caminos las cruzan)
const ridges = [
  [[2, 44], [14, 43], [26, 45], [36, 43]],          // entre los Campos y el Bosque
  [[50, 30], [52, 38], [50, 42]],                   // entre los Campos y la Ladera
  [[120, 44], [122, 52], [118, 58]],                // entre los Ríos y la Cantera
  [[60, 86], [58, 96], [62, 108]],                  // entre la Grieta y la Caldera
  [[114, 88], [116, 100], [112, 112]],              // entre la Caldera y el Nido
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
          if (hash(xx, yy, 73) < 0.55 && areaFree(xx, yy, 3, 3)) placeGrid('pico_volcan', 3, 3, xx, yy);
          else if (areaFree(xx, yy, 2, 2)) placeGrid('roca_volcanica', 2, 2, xx, yy);
          else if (free(xx, yy) && okGround(xx, yy)) put(objects, xx, yy, T.roca_pomez);
        }
      }
    }
  }
}
placeRidges();
for (let y = 0; y < H - 2; y += 3) {
  for (let x = 0; x < W - 2; x += 3) {
    const ox = x + Math.floor(hash(x, y, 53) * 2);
    const oy = y + Math.floor(hash(x, y, 54) * 2);
    if (isReserved(ox, oy) || isReserved(ox + 2, oy + 2)) continue;
    const d = peakDensity(ox, oy);
    if (d <= 0.05 || rand() > d) continue;
    if (!areaFree(ox, oy, 3, 3)) continue;
    placeGrid('pico_volcan', 3, 3, ox, oy);
  }
}
for (let y = 2; y < H - 1; y += 2) {
  for (let x = 0; x < W - 1; x += 2) {
    const ox = x + (hash(x, y, 51) < 0.5 ? 0 : 1);
    const oy = y + (hash(x, y, 52) < 0.5 ? 0 : 1);
    if (isReserved(ox, oy) || isReserved(ox + 1, oy + 1)) continue;
    const d = treeDensity(ox, oy);
    if (d <= 0.05 || rand() > d * 1.4) continue;
    if (!areaFree(ox, oy, 2, 2)) continue;
    placeGrid('arbol_calcinado', 2, 2, ox, oy);
  }
}
// Cantera: agujas de obsidiana sobre el vidrio negro
for (let i = 0; i < 60; i++) {
  const x = 120 + Math.floor(rand() * 38);
  const y = 44 + Math.floor(rand() * 40);
  if (!isReserved(x, y) && at(x, y) === 'obsidiana' && areaFree(x, y, 1, 2) && rand() < 0.6) placeGrid('aguja_obsidiana', 1, 2, x, y);
}
// el paso del norte queda abierto (se entra caminando desde las Montañas)
for (let y = 0; y <= 6; y++) for (let x = P.entry.x - 4; x <= P.entry.x + 5; x++) { put(objects, x, y, 0); put(above, x, y, 0); }

// detalles: rocas, pómez, tocones humeantes, arbustos calcinados, huesos
for (let i = 0; i < 1500; i++) {
  const x = 2 + Math.floor(rand() * (W - 4));
  const y = 2 + Math.floor(rand() * (H - 4));
  if (!free(x, y) || isReserved(x, y) || !okGround(x, y)) continue;
  const z = subzoneAt(x, y)?.name;
  const r = rand();
  if (r < 0.04) put(objects, x, y, T.roca_pomez);
  else if (r < 0.06 && areaFree(x, y, 2, 2)) placeGrid('roca_volcanica', 2, 2, x, y);
  else if (r < 0.08 && (z === 'Bosque Calcinado' || z === 'Ladera de Ceniza')) put(objects, x, y, T.tocon_humeante);
  else if (r < 0.095) put(objects, x, y, T.arbusto_calcinado);
  else if (r < 0.1 && z === 'Nido del Dragón') put(objects, x, y, T.huesos_dragon);
  else if (r < 0.105 && z === 'Grieta Ardiente') put(objects, x, y, T.cristal_eclipse);
}
// caminos, plaza, puentes, escaleras, paredes y lava siempre libres
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const t = at(x, y);
  const k = y * W + x;
  if (['camino', 'losav', 'escalera', 'puentev', 'carav', 'lava'].includes(t)) { objects[k] = 0; above[k] = 0; }
}
// la ciudad, el muelle y el portal van encima del camino
placeTown();
put(objects, P.dock.x - 2, P.dock.y + 3, 0); put(objects, P.dock.x + 2, P.dock.y + 4, 0);
for (const [x, y] of [[P.dock.x - 2, P.dock.y + 4], [P.dock.x + 3, P.dock.y + 5]]) if (at(x, y) === 'lava') put(objects, x, y, T.balsa_pomez);
placeGrid('portal_fisura', 3, 3, P.fisura.x - 1, P.fisura.y);

// ---------------------------------------------------------------- puntos (en coordenadas de la zona, px)
const px = (n) => n * 32;
const prop = (name, type, value) => ({ name, type, value });
const points = [];
const pt = (o) => points.push(o);
pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
pt({ name: 'puertas_caldera', type: 'jefe', x: px(P.gates.x), y: px(P.gates.y), properties: [
  prop('monstruo', 'string', 'SENOR_CALDERA'), prop('nivel', 'int', 42), prop('etiqueta', 'string', 'Desafiar al Señor de la Caldera')] });
pt({ name: 'isla_titan', type: 'jefe', x: px(P.titan.x), y: px(P.titan.y), properties: [
  prop('monstruo', 'string', 'TITAN_FUEGO'), prop('nivel', 'int', 45), prop('etiqueta', 'string', 'Desafiar al Titán de Fuego')] });
pt({ name: 'enfermeria_ascuaria', type: 'poi', x: px(112), y: px(33), properties: [prop('etiqueta', 'string', 'Brasero de Ascuaria — Enfermería'), prop('ventana', 'string', 'enfermeria')] });
// la Fisura Infernal (zona propia, ver generar_fisura.js): se pisa la casilla del medio del portal
pt({ name: 'entrada_fisura', type: 'salida', x: px(P.fisura.x), y: px(P.fisura.y + 2), width: 32, height: 32, properties: [prop('destino', 'string', 'fisura'), prop('x', 'int', 20), prop('y', 'int', 4), prop('etiqueta', 'string', 'La Fisura Infernal')] });
// NPCs (sus diálogos están en src/game/dialogues.js; los que dan misiones, en gprback/lib/questSteps.js)
const npc = (name, nombre, x, y, pasea = 1, extra = [], sprite = `npc_${name}`) => pt({ name, type: 'npc', x: px(x) + 16, y: px(y) + 16, properties: [
  prop('nombre', 'string', nombre), prop('sprite', 'string', sprite), prop('dialogo', 'string', name),
  prop('etiqueta', 'string', `Hablar con ${nombre.split(',')[0]}`), prop('pasea', 'int', pasea), ...extra] });
npc('ignar', 'Ignar, el Forjador de Fuego', P.forge.x + 2, P.forge.y + 4, 1);
npc('ascalia', 'Ascalia, matriarca de Ascuaria', 111, 30, 1);
npc('tuli', 'Tuli, parrillera', 109, 36, 1);
npc('chispa', 'Chispa', 114, 32, 4);
npc('gaspar_volcan', 'Gaspar, cochero', P.entry.x + 3, 6, 1, [], 'npc_cochero');
npc('sulfo', 'Sulfo, alquimista', 24, 22, 2);
npc('ceniza', 'Ceniza, guardabosque', 26, 62, 3);
npc('pumo', 'Pumo, balsero', P.dock.x, P.dock.y + 1, 1);
npc('kessa', 'Kessa, talladora', P.quarry.x, P.quarry.y + 1, 2);
npc('escamas', 'Viejo Escamas', P.nest.x, P.nest.y + 2, 1);
// las balseras, primas de Pumo (mismo sprite): los muelles de la Cantera y de la Caldera (lib/brasas.js)
npc('balsero_cantera', 'Toba, balsera', 122, 62, 1, [], 'npc_pumo');
npc('balsero_caldera', 'Lapilli, balsera', 79, 93, 1, [], 'npc_pumo');
// Marga, la mercader de Ascuaria: compra el botín y vende lo de los artesanos (servicio "artesanos")
npc('mercader_ascuaria', 'Marga, mercader', 115, 29, 0, [], 'npc_marga');
// luces de noche: faroles de lava de Ascuaria, el muelle y la cantera, fogatas y braseros (refugios)
lights.forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
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
const anyLand = (t) => ['basalto', 'ceniza', 'quemado', 'azufre', 'obsidiana'].includes(t);
function resource(id, tipo, centers, spots = 3, okFn = anyLand) {
  const list = [];
  for (const [cx, cy, r] of centers) {
    for (let i = 0; i < spots; i++) {
      const s = findSpot(cx, cy, r, okFn, tipo === 'restos_volcan');
      if (s) { list.push(s); put(objects, s[0], s[1], 0); put(above, s[0], s[1] - 1, 0); }
    }
  }
  resourceDefs.push({ id, tipo, spots: list.length });
  list.forEach(([x, y], i) => pt({ name: id, type: 'recurso', x: px(x) + 16, y: px(y) + 16, properties: [prop('tipo', 'string', tipo), prop('sitio', 'int', i)] }));
}
// cada subzona con lo suyo
// Ladera de Ceniza
resource('flor_ladera', 'flor_ceniza', [[70, 14, 8], [140, 20, 8]]);
resource('nido_ladera', 'nido_salamandra', [[62, 30, 6], [146, 34, 6]]);
resource('restos_ladera', 'restos_volcan', [[78, 26, 6]]);
// Campos de Azufre: las fumarolas, solo sobre el azufre
resource('fumarola_campos', 'fumarola', [[14, 12, 8], [30, 24, 8], [12, 34, 6]], 3, (t) => t === 'azufre');
resource('flor_campos', 'flor_ceniza', [[40, 36, 6]]);
resource('cofre_campos', 'cofre_volcan', [[6, 4, 3], [46, 4, 3]], 1);
// Bosque Calcinado
resource('flor_bosque', 'flor_ceniza', [[20, 50, 8], [36, 72, 8]]);
resource('restos_bosque', 'restos_volcan', [[P.bandits.x + 2, P.bandits.y + 4, 3]]);
resource('cofre_bosque', 'cofre_volcan', [[4, 82, 3], [46, 48, 3]], 1);
// Ríos de Lava
resource('nido_rios', 'nido_salamandra', [[66, 60, 8], [104, 70, 8]]);
resource('veta_rios', 'veta_obsidiana', [[80, 80, 6], [112, 50, 6]]);
resource('cofre_rios', 'cofre_volcan', [[60, 46, 3], [116, 84, 3]], 1);
// Cantera de Obsidiana
resource('veta_cantera', 'veta_obsidiana', [[134, 50, 8], [148, 64, 8], [130, 74, 6]], 3);
resource('geoda_cantera', 'geoda_ardiente', [[154, 50, 4], [140, 80, 4]], 1);
// Nido del Dragón
resource('nido_dragon', 'nido_salamandra', [[128, 112, 6]]);
resource('geoda_nido', 'geoda_ardiente', [[150, 96, 5], [124, 90, 4]], 1);
resource('restos_nido', 'restos_volcan', [[144, 112, 6]]);
resource('cofre_nido', 'cofre_volcan', [[156, 116, 3]], 1);
// Grieta Ardiente
resource('veta_grieta', 'veta_obsidiana', [[46, 110, 6]]);
resource('fumarola_grieta', 'fumarola', [[8, 112, 5]], 2, anyLand);
resource('restos_grieta', 'restos_volcan', [[P.cult.x + 1, P.cult.y + 4, 3]]);
resource('cofre_grieta', 'cofre_volcan', [[4, 116, 3], [52, 116, 3]], 1);
// Caldera del Titán
resource('geoda_caldera', 'geoda_ardiente', [[66, 96, 4], [106, 96, 4]], 1);
resource('cofre_caldera', 'cofre_volcan', [[64, 114, 3], [108, 114, 3]], 1);

// cofres secretos (solo se ven de cerca; el premio está en gprback/lib/exploracion.js, SECRETS):
// la bolsa del leñador entre los árboles quemados, el tesoro de un dracónido bajo el costillar y el
// alijo de un Oculto arrepentido en el rincón más hondo de la Grieta
const secrets = [];
for (const [name, cx, cy] of [['secreto_bosque', 6, 58], ['secreto_nido', 154, 112], ['secreto_grieta', 4, 108]]) {
  let spot = null;
  for (let r = 0; r < 8 && !spot; r++) {
    for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (free(x, y) && anyLand(at(x, y)) && !isReserved(x, y)) spot = [x, y];
    }
  }
  if (!spot) throw new Error(`no hay lugar para ${name}`);
  secrets.push([name, ...spot]);
  pt({ name, type: 'secreto', x: px(spot[0]), y: px(spot[1]) });
}

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
      properties: [prop('zona', 'int', 3)],
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

const world = {
  nombre: 'Volcán Rojo', zona: 3, musica: 'volcan', tileset: 'pradera', terrenos: TERRENOS, tile: 32, chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0.07, gidHierba: T.hierba_quemada,
  inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
  // ceniza que cae todo el día (game/world/brasas.js) y la lluvia de brasas de vez en cuando
  clima: { estacion: 'verano', lluvia: 0, nieve: 0, ceniza: 1 },
  // tiles que usa la fauna del ambiente: sin agua (nada de patos en la lava) ni flores
  gids: {
    flores: [],
    agua: [],
    prado: [T.ceniza_15, T.ceniza_pomez, T.basalto],
    arboles: [T.arbol_calcinado_0_0, T.arbol_calcinado_0_1],
    dorados: [],
    seco: [],
  },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
fs.writeFileSync(path.join(__dirname, 'recursos_volcan.json'), JSON.stringify(resourceDefs, null, 1));

if (process.argv.includes('--preview')) {
  const COLORS = {
    basalto: [62, 56, 66], ceniza: [170, 164, 156], lava: [255, 140, 40], azufre: [222, 200, 70], quemado: [60, 46, 36],
    obsidiana: [36, 30, 50], camino: [140, 122, 94], hierbaq: [90, 70, 52], mesetav: [80, 72, 84], carav: [52, 46, 58],
    escalera: [150, 140, 130], puentev: [110, 100, 110], losav: [96, 88, 100],
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
  fs.writeFileSync(path.join(__dirname, 'volcan_preview.json'), JSON.stringify({ w: W, h: H, rows }));
}
console.log(`Volcán generado: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
console.log('Encuentros:', encounterAreas.length, '·', Object.keys(POBLAR).map((z) => `${z} ${encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === z).length}`).join(', '));
console.log('Recursos:', resourceDefs.map((r) => `${r.id}(${r.spots})`).join(' '));
console.log('Secretos:', secrets.map(([n, x, y]) => `${n} ${x},${y}`).join(' · '));
console.log('Arcos:', JSON.stringify(ARCOS_PUESTOS));
