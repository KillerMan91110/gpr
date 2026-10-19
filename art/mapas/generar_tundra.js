// Genera la Tundra Eterna (zona 5) como un mundo de 4x4 trozos de 40x30 tiles, igual que las Costas:
//   public/assets/mundo/tundra/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/tundra/mundo.json            (índice: trozos, subzonas, inicio)
// Va arriba a la derecha del continente (etheria.json: x 320, y 90). No toca a pie ninguna otra zona:
// se llega en el barco de Rhaegar desde el Puerto Antiguo hasta el muelle de Fiordo Blanco
// (gprback/lib/barco.js). Diseño completo en gprback/docs/zona5_tundra.md.
//
// Diseño (norte arriba): arriba, el Palacio de Hielo (noroeste), la Grieta del Glaciar, el Cementerio
// Real (la entrada de la Cripta Congelada) y la Torre de Cristal (noreste). En medio, el Valle de los
// Gigantes, el Santuario del Quinto Sello, el Lago de Cristal (hielo que se camina) y el Bosque de Pinos
// Blancos. Abajo, el Campamento de los Cazadores, la Estepa de la Aurora, la Aldea de los Mamuts y la
// Costa Helada. Al sur, el Mar Helado y, en su rincón del este, Fiordo Blanco, la ciudad de los
// norteños, donde atraca La Gaviota Insolente.
//
// Las casillas del suelo salen de las MISMAS reglas que el editor de mapas (src/editor/rules.js).
//
// Uso: node art/mapas/generar_tundra.js   (con --preview además deja tundra_preview.json)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

// Lo que ya está, por tandas (ver zona5_tundra.md): los combates y los jefes
// (tanda 2), los recursos (tanda 3), los NPCs (tanda 4) y la entrada de la Cripta (tanda 5).
const COMBATES_LISTOS = true;

const outDir = path.join(__dirname, '../../public/assets/mundo/tundra');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('La Tundra ya se editó con el editor de mapas: no la piso. Usa --forzar para regenerarla igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico de esta zona (el editor arma los bordes con ellos, ver src/editor/rules.js)
const TERRENOS = ['nieve', 'nieveh', 'musgo', 'roca', 'hierban', 'fiordo', 'lago', 'losah', 'muellen', 'camino', 'plaza',
  'abismo', 'colgante', 'mesetan', 'caran', 'escalera'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261019;
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
const terrain = Array.from({ length: H }, () => new Array(W).fill('nieve'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : null);
const setT = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) terrain[y][x] = t; };
const rectT = (x0, y0, x1, y1, t, only = null) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!only || only.includes(at(x, y))) setT(x, y, t);
};
const blobT = (cx, cy, rx, ry, t, rough = 0.35, s = 1, only = null) => {
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
    for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 + (valueNoise(x, y, 3, s) - 0.5) * rough * 2 && (!only || only.includes(at(x, y)))) setT(x, y, t);
    }
  }
};
const stroke = (pts, w, t, only = null, wobble = 1.2) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const wob = Math.sin((x1 + (x2 - x1) * f) / 4) * wobble;
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

// sitios importantes (en tiles; las casillas de NPCs, forja, muelles, jefes y la Cripta se repiten en el
// back: lib/cercania.js, lib/questSteps.js, lib/barco.js y la mazmorra). Los NPCs de las misiones van
// en la tanda 4; sus casas ya quedan pensadas aquí (zona5_tundra.md, sección 9).
const P = {
  // Fiordo Blanco: el muelle (donde atraca el barco y se aparece), la plaza, la casa larga de la Anciana,
  // la posada, la forja, la perrera de los trineos
  muelle: { x: 146, y: 106 }, spawn: { x: 146, y: 101 }, plaza: { x: 137, y: 98 },
  jarl: { x: 128, y: 91 }, posada: { x: 139, y: 91 }, forja: { x: 150, y: 94 }, perrera: { x: 122, y: 101 },
  // afuera
  palacio: { x: 12, y: 3 }, rey: { x: 20, y: 15 }, santuario: { x: 60, y: 44 }, guardian: { x: 60, y: 41 },
  cripta: { x: 100, y: 10 }, torre: { x: 140, y: 7 }, lago: { x: 100, y: 45 },
  cazadores: { x: 20, y: 74 }, mamuts: { x: 100, y: 74 }, estepa: { x: 60, y: 75 }, valle: { x: 20, y: 45 }, grieta: { x: 60, y: 15 },
};

// 1) el borde norte es una pared de roca nevada; al oeste y al este, el mar helado
rectT(0, 0, W - 1, 1, 'caran');
// 2) el Mar Helado: el sur (salvo la costa de Fiordo Blanco), el oeste y el este
const southCoast = (x) => {
  if (x >= 116) return 109 + Math.round(valueNoise(x, 0, 5, 11) * 2);
  return 92 + Math.round(valueNoise(x, 0, 6, 12) * 5);
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (y >= southCoast(x) || x <= 1 || x >= W - 2) setT(x, y, 'fiordo');
}
// el fiordo entra hacia la ciudad (el muelle va sobre él)
blobT(134, 108, 8, 4, 'fiordo', 0.3, 13);
// islotes y una lengua de hielo en el Mar Helado
for (const [cx, cy, rx, ry] of [[30, 104, 6, 3], [64, 108, 5, 3], [92, 103, 4, 2]]) blobT(cx, cy, rx, ry, 'nieve', 0.35, cx);
blobT(64, 101, 3, 4, 'lago', 0.2, 14);
// la lengua de hielo llega a la costa y al islote del medio: ahí está el barco atrapado (un escondite)
rectT(64, 95, 64, 106, 'lago');
// 3) nieve profunda en el Valle de los Gigantes y la Grieta; musgo en la Estepa y la Aldea de los Mamuts
for (let y = 2; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'nieve') continue;
  const n = fbm(x, y, 21);
  const deep = (x < 40 && y >= 30 && y < 60) || (x >= 40 && x < 80 && y < 30);
  const moss = y >= 60 && x >= 40 && x < 120;
  if (deep && n > 0.5) setT(x, y, 'nieveh');
  else if (moss && n > 0.55) setT(x, y, 'musgo');
  else if (!deep && !moss && n > 0.72) setT(x, y, 'nieveh');
}
// 4) roca de montaña al pie de la pared norte y en el Valle (donde duermen los gigantes)
for (let x = 0; x < W; x++) for (let y = 2; y <= 3 + Math.round(valueNoise(x, 0, 4, 31) * 3); y++) if (at(x, y) !== 'caran') setT(x, y, 'roca');
blobT(14, 40, 6, 4, 'roca', 0.45, 32); blobT(30, 52, 5, 3, 'roca', 0.45, 33);
// 5) el Lago de Cristal: hielo que se camina (y resbala, tanda 6)
blobT(P.lago.x, P.lago.y, 14, 8, 'lago', 0.35, 41);
// 6) la Grieta del Glaciar: grietas sin fondo que se cruzan por puentes colgantes
stroke([[44, 8], [52, 14], [58, 22], [66, 26], [76, 24]], 1, 'abismo', null, 0.6);
stroke([[48, 26], [56, 20]], 1, 'abismo', null, 0.4);
// 7) el Santuario del Quinto Sello y la explanada del Palacio: losas de hielo
blobT(P.santuario.x, P.santuario.y, 7, 5, 'losah', 0.1, 51);
rectT(11, 9, 26, 17, 'losah');
// 8) Fiordo Blanco: la plaza, las calles y el muelle
rectT(130, 96, 145, 100, 'plaza');
rectT(124, 98, 155, 99, 'plaza');
rectT(137, 90, 138, 106, 'plaza');
rectT(145, 100, 147, 108, 'plaza', ['nieve', 'nieveh', 'musgo', 'fiordo']);
for (let y = 104; y <= 113; y++) for (let x = 145; x <= 147; x++) if (at(x, y) === 'fiordo') setT(x, y, 'muellen');
// el muelle de los pescadores, al oeste del fiordo
for (let y = 106; y <= 111; y++) if (at(128, y) === 'fiordo') setT(128, y, 'muellen');

// 9) caminos: del Fiordo a cada subzona (el estilo del camino lo ponen las reglas del editor)
const roads = [];
const road = (pts, width = 2) => roads.push({ pts, width });
road([[138, 90], [140, 80], [142, 72], [140, 60], [138, 48], [140, 34], [140, 18]]);   // Costa Helada → Bosque → Torre de Cristal
road([[130, 98], [118, 88], [104, 80], [86, 76], [66, 76], [46, 74], [26, 74]], 1);  // la Aldea, la Estepa, el Campamento
road([[104, 80], [102, 66], [98, 56]], 1);                                           // de la Aldea al Lago
road([[104, 36], [102, 24], [100, 14]], 1);                                          // del Lago al Cementerio Real
road([[66, 76], [62, 62], [60, 50]], 1);                                             // de la Estepa al Santuario
road([[60, 38], [58, 30], [52, 20], [40, 16], [30, 15]], 1);                          // del Santuario al Palacio (cruza la Grieta)
road([[24, 72], [22, 60], [20, 48], [18, 34], [20, 21]], 1);                          // del Campamento al Valle y al Palacio
road([[120, 46], [110, 46]], 1);                                                     // del Bosque al Lago
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
        else if (['plaza', 'losah', 'lago', 'fiordo', 'muellen', 'caran', null].includes(tt)) continue;
        else setT(cx + dx, cy + dy, 'camino');
      }
    }
  }
}

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Fiordo Blanco', x0: 120, y0: 88, x1: 159, y1: 119, levels: null, safe: true },
  { name: 'Costa Helada', x0: 120, y0: 60, x1: 159, y1: 87, levels: '61-63' },
  { name: 'Aldea de los Mamuts', x0: 80, y0: 60, x1: 119, y1: 95, levels: '62-64' },
  { name: 'Bosque de Pinos Blancos', x0: 120, y0: 30, x1: 159, y1: 59, levels: '62-65' },
  { name: 'Estepa de la Aurora', x0: 40, y0: 60, x1: 79, y1: 95, levels: '63-66' },
  { name: 'Lago de Cristal', x0: 80, y0: 30, x1: 119, y1: 59, levels: '64-67' },
  { name: 'Campamento de los Cazadores', x0: 0, y0: 60, x1: 39, y1: 95, levels: '65-68' },
  { name: 'Torre de Cristal', x0: 120, y0: 0, x1: 159, y1: 29, levels: '66-68' },
  { name: 'Valle de los Gigantes', x0: 0, y0: 30, x1: 39, y1: 59, levels: '68-71' },
  { name: 'Santuario del Quinto Sello', x0: 40, y0: 30, x1: 79, y1: 59, levels: '70-72' },
  { name: 'Cementerio Real', x0: 80, y0: 0, x1: 119, y1: 29, levels: '71-74' },
  { name: 'Grieta del Glaciar', x0: 40, y0: 0, x1: 79, y1: 29, levels: '70-73' },
  { name: 'Palacio de Hielo', x0: 0, y0: 0, x1: 39, y1: 29, levels: '73-75' },
  { name: 'Mar Helado', x0: 0, y0: 96, x1: 119, y1: 119, levels: null },
  { name: 'Tundra Eterna', x0: 0, y0: 0, x1: 159, y1: 119, levels: '61-75' },
];
const subzoneAt = (x, y) => subzones.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);

// 10) hierba nevada (encuentros) por subzona: pocos grupos y bien poblados (una manada, un campamento,
// los gigantes del valle…) y entre ellos caminos tranquilos. Los monstruos nuevos llegan en la tanda 2.
const encounterAreas = [];
const POBLAR = {
  'Costa Helada': { n: 3, mons: [['FOCA_COLMILLO', 'FOCA_COLMILLO'], ['FOCA_COLMILLO', 'LOBO_HIELO'], ['FOCA_COLMILLO', 'FOCA_COLMILLO']],
    names: ['Playa de las Focas', 'Roca del Viento', 'Hielo Roto'] },
  'Aldea de los Mamuts': { n: 3, mons: [['JABALI_HELADO', 'JABALI_HELADO'], ['JABALI_HELADO', 'MAMUT_LANUDO'], ['JABALI_HELADO', 'BUHO_NIVEO']],
    names: ['Pastos Helados', 'Huellas de Mamut', 'Revolcadero'] },
  'Bosque de Pinos Blancos': { n: 3, mons: [['LOBO_HIELO', 'LOBO_HIELO'], ['LOBO_HIELO', 'BUHO_NIVEO'], ['BUHO_NIVEO', 'BUHO_NIVEO']],
    names: ['Cubil de los Lobos', 'Claro del Búho', 'Pinos Viejos'] },
  'Estepa de la Aurora': { n: 3, mons: [['BUHO_NIVEO', 'JABALI_HELADO'], ['MAMUT_LANUDO', 'BUHO_NIVEO'], ['BUHO_NIVEO', 'BUHO_NIVEO']],
    names: ['Círculo de Piedras', 'Pradera Verde', 'Viento de la Estepa'] },
  'Lago de Cristal': { n: 2, mons: [['ESPIRITU_CONGELADO', 'ESPIRITU_CONGELADO'], ['ESPIRITU_CONGELADO', 'ELEMENTAL_ESCARCHA']],
    names: ['Orilla de los Espíritus', 'Islote del Lago'] },
  'Campamento de los Cazadores': { n: 3, mons: [['CAZADOR_HIELO', 'CAZADOR_HIELO'], ['CAZADOR_HIELO', 'LOBO_HIELO'], ['CAZADOR_HIELO', 'CAZADOR_HIELO']],
    names: ['Trampas', 'Puesto de Caza', 'Senda de las Pieles'] },
  'Torre de Cristal': { n: 2, mons: [['ELEMENTAL_ESCARCHA', 'ELEMENTAL_ESCARCHA'], ['ELEMENTAL_ESCARCHA', 'ESPIRITU_CONGELADO']],
    names: ['Pie de la Torre', 'Cristales Rotos'] },
  'Valle de los Gigantes': { n: 3, mons: [['GIGANTE_NIEVE', 'OSO_NIEVES'], ['OSO_NIEVES', 'OSO_NIEVES'], ['GIGANTE_NIEVE', 'GIGANTE_NIEVE']],
    names: ['Huesos de Gigante', 'Osera', 'Lecho de los Gigantes'] },
  'Santuario del Quinto Sello': { n: 2, mons: [['CULTISTA_HELADO', 'ELEMENTAL_ESCARCHA'], ['CULTISTA_HELADO', 'CULTISTA_HELADO']],
    names: ['Campamento del Eclipse', 'Puerta del Santuario'] },
  'Grieta del Glaciar': { n: 3, mons: [['CULTISTA_HELADO', 'SIERPE_GLACIAL'], ['SIERPE_GLACIAL', 'OSO_NIEVES'], ['LOBO_AURORA', 'SIERPE_GLACIAL']],
    names: ['Labio de la Grieta', 'Nido de Sierpes', 'Hielo Azul'] },
  'Cementerio Real': { n: 3, mons: [['CABALLERO_ESCARCHA', 'CABALLERO_ESCARCHA'], ['CABALLERO_ESCARCHA', 'ESPIRITU_CONGELADO'], ['CABALLERO_ESCARCHA', 'CULTISTA_HELADO']],
    names: ['Tumbas de los Reyes', 'Avenida de los Menhires', 'Guardia de la Reina'] },
  'Palacio de Hielo': { n: 2, mons: [['CABALLERO_ESCARCHA', 'SIERPE_GLACIAL'], ['CABALLERO_ESCARCHA', 'CABALLERO_ESCARCHA']],
    names: ['Jardín Helado', 'Guardia del Rey'] },
};
const AREA_BAD = ['camino', 'plaza', 'fiordo', 'muellen', 'abismo', 'colgante', 'caran', 'losah', 'escalera'];
const AREA_LAND = ['nieve', 'nieveh', 'musgo', 'roca', 'lago'];
// lugares donde no van grupos de monstruos (ciudad, campamentos, palacio, torre, cripta, santuario)
const KEEP_AWAY = [P.spawn, P.plaza, P.palacio, P.rey, P.santuario, P.cripta, P.torre, P.cazadores, P.mamuts, P.estepa];
const areaFits = (x, y, w, h, zone, minLand) => {
  if (x < 3 || y < 3 || x + w > W - 3 || y + h > H - 2) return false;
  if (subzoneAt(x + w / 2, y + h / 2)?.name !== zone) return false;
  if ([[x, y], [x + w, y + h], [x + w, y], [x, y + h]].some(([a, b]) => subzoneAt(a, b)?.safe)) return false;
  if (KEEP_AWAY.some((k) => Math.abs(k.x - (x + w / 2)) < w / 2 + 5 && Math.abs(k.y - (y + h / 2)) < h / 2 + 4)) return false;
  if (encounterAreas.some((o) => x < o.x + o.w + 6 && o.x < x + w + 6 && y < o.y + o.h + 6 && o.y < y + h + 6)) return false;
  let land = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const t = at(xx, yy);
    if (AREA_BAD.includes(t)) return false;
    if (AREA_LAND.includes(t)) land++;
  }
  return land >= w * h * minLand;
};
for (const [zone, cfg] of Object.entries(POBLAR)) {
  const z = subzones.find((s) => s.name === zone);
  // en las subzonas apretadas (el Cementerio entre tumbas, la Grieta entre abismos) se aceptan grupos
  // más chicos y con algo menos de nieve libre, para que ninguna quede casi vacía
  let minLand = 0.85;
  const sizes = [[14, 8], [12, 7], [10, 6], [8, 5], [7, 4]];
  const cands = [];
  for (let y = z.y0; y <= z.y1; y += 2) for (let x = z.x0; x <= z.x1; x += 2) {
    for (const [w, h] of sizes) if (areaFits(x, y, w, h, zone, 0.7)) cands.push({ x, y, w, h });
  }
  const mine = () => encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === zone);
  let k = 0;
  while (mine().length < cfg.n) {
    const placed = mine();
    let best = null;
    let bestD = -1;
    for (const c of cands) {
      if (!areaFits(c.x, c.y, c.w, c.h, zone, minLand)) continue;
      const d = placed.length ? Math.min(...placed.map((o) => Math.hypot(o.x + o.w / 2 - c.x - c.w / 2, o.y + o.h / 2 - c.y - c.h / 2))) : 999;
      const score = Math.min(d, 40) + c.w * c.h * 0.05;
      if (score > bestD) { best = c; bestD = score; }
    }
    if (!best && minLand > 0.7) { minLand = 0.7; continue; }
    if (!best) break;
    encounterAreas.push({ name: cfg.names[k % cfg.names.length], ...best, monstruos: cfg.mons[k % cfg.mons.length] });
    k++;
  }
}
// la hierba nevada se pinta sobre la nieve y el musgo (no sobre el lago)
for (const a of encounterAreas) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  for (let y = a.y - 1; y <= a.y + a.h; y++) for (let x = a.x - 1; x <= a.x + a.w; x++) {
    const d = ((x - cx) / (a.w / 2)) ** 2 + ((y - cy) / (a.h / 2)) ** 2;
    const n = valueNoise(x, y, 4, 61);
    if (['nieve', 'nieveh', 'musgo'].includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 63) > 0.2) setT(x, y, 'hierban');
  }
}

// ---------------------------------------------------------------- capas de tiles
async function main() {
  const tmp = path.join(os.tmpdir(), `rules_tundra_${process.pid}.mjs`);
  fs.copyFileSync(path.join(__dirname, '../../src/editor/rules.js'), tmp);
  const { makeRules } = await import(pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  const R = makeRules(TILESET);
  const mathRandom = Math.random;
  Math.random = rand;

  const ground = new Array(W * H).fill(0);
  const objects = new Array(W * H).fill(0);
  const above = new Array(W * H).fill(0);
  const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = gid; };
  const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && objects[y * W + x] === 0 && above[y * W + x] === 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(ground, x, y, R.groundGid(at, x, y, 0));
  // la pared del norte: la fila de arriba con la nieve, la de abajo con sombra
  for (let x = 0; x < W; x++) {
    const side = x === 0 ? 'i' : (x === W - 1 ? 'd' : 'c');
    put(ground, x, 0, T[`cara_n_a_${side}`]);
    put(ground, x, 1, T[`cara_n_b_${side}`]);
  }
  Math.random = mathRandom;

  // ---------------------------------------------------------------- objetos
  function placeGrid(name, w, h, x, y) {
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const id = T[`${name}_${r}_${c}`];
      if (!id) throw new Error(`falta el tile ${name}_${r}_${c}`);
      const meta = TILESET.tiles[id - 1];
      put(meta.encima ? above : objects, x + c, y + r, id);
    }
  }
  const okGround = (x, y) => ['nieve', 'nieveh', 'musgo', 'roca'].includes(at(x, y));
  const areaFree = (x, y, w, h, pad = 0, ok = okGround) => {
    for (let yy = y - pad; yy < y + h + pad; yy++) for (let xx = x - pad; xx < x + w + pad; xx++) {
      if (!free(xx, yy) || !ok(xx, yy)) return false;
    }
    return true;
  };
  const reserved = [];
  const reserve = (x0, y0, x1, y1) => reserved.push([x0, y0, x1, y1]);
  const isReserved = (x, y) => reserved.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  const lights = [];
  const fire = (x, y) => { put(objects, x, y, T.hoguera_nortena); lights.push([x, y, 'fogata']); };

  // Fiordo Blanco: la casa larga de la Anciana, la posada, la forja, casas, la perrera y el muelle
  function placeTown() {
    placeGrid('casa_larga', 4, 3, P.jarl.x, P.jarl.y);
    placeGrid('posada_nortenia', 4, 3, P.posada.x, P.posada.y);
    placeGrid('forja_nortenia', 3, 3, P.forja.x, P.forja.y);
    placeGrid('casa_nortenia', 3, 3, 123, 93);
    placeGrid('casa_nortenia', 3, 3, 151, 100);
    placeGrid('casa_nortenia', 3, 3, 131, 101);
    placeGrid('perrera', 2, 2, P.perrera.x, P.perrera.y);
    put(objects, P.perrera.x + 2, P.perrera.y + 1, T.trineo);
    // la plaza: la hoguera (refugio y enfermería), estandartes, escudos, leña e hidromiel
    put(objects, P.plaza.x, P.plaza.y - 1, T.hoguera_nortena); lights.push([P.plaza.x, P.plaza.y - 1, 'fogata']);
    for (const x of [131, 143]) placeGrid('estandarte_nortenio', 1, 2, x, 95);
    put(objects, 133, 100, T.escudo_nortenio); put(objects, 141, 100, T.cuerno_hidromiel);
    put(objects, 126, 97, T.pila_lena); put(objects, 154, 97, T.pila_lena); put(objects, 148, 98, T.barril); put(objects, 149, 98, T.caja);
    for (const [x, y] of [[129, 96], [146, 96], [136, 103], [144, 103], [124, 99], [155, 99]]) { put(objects, x, y, T.farol); lights.push([x, y, 'farol']); }
    put(objects, 135, 96, T.cartel);
  }
  placeTown();
  reserve(120, 88, 159, 119);

  // el Palacio de Hielo, la explanada y su guardia de estatuas (el Rey se pelea frente al portón)
  placeGrid('palacio_hielo', 6, 5, P.palacio.x, P.palacio.y);
  for (const [x, y] of [[10, 10], [27, 10], [10, 15], [27, 15]]) placeGrid('menhir_runico', 1, 2, x, y);
  reserve(P.palacio.x - 2, P.palacio.y - 1, P.palacio.x + 8, 21);
  // el Santuario del Quinto Sello: un círculo de menhires rúnicos alrededor de las losas
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.round(P.santuario.x + Math.cos(a) * 8);
    const y = Math.round(P.santuario.y + Math.sin(a) * 5) - 1;
    if (areaFree(x, y, 1, 2, 0, (a2, b2) => ['nieve', 'nieveh', 'musgo', 'losah', 'roca'].includes(at(a2, b2)))) placeGrid('menhir_runico', 1, 2, x, y);
  }
  reserve(P.santuario.x - 9, P.santuario.y - 7, P.santuario.x + 9, P.santuario.y + 6);
  // el Cementerio Real: la entrada de la Cripta Congelada y las tumbas de los reyes (menhires en filas)
  placeGrid('portal_cripta', 3, 3, P.cripta.x - 1, P.cripta.y - 2);
  reserve(P.cripta.x - 3, P.cripta.y - 3, P.cripta.x + 3, P.cripta.y + 3);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const x = 86 + col * 6 + (row % 2) * 3;
    const y = 16 + row * 4;
    if (!isReserved(x, y) && areaFree(x, y, 1, 2)) placeGrid('menhir_runico', 1, 2, x, y);
  }
  // la Torre de Cristal, con cristales de hielo alrededor
  placeGrid('torre_cristal', 2, 4, P.torre.x, P.torre.y);
  reserve(P.torre.x - 2, P.torre.y - 1, P.torre.x + 3, P.torre.y + 5);
  for (const [dx, dy] of [[-4, 3], [5, 2], [-3, 6], [6, 6]]) { const x = P.torre.x + dx; const y = P.torre.y + dy; if (free(x, y) && okGround(x, y)) put(objects, x, y, T.cristal_hielo); }
  // el Campamento de los Cazadores: tiendas de pieles, la hoguera, leña y trineos
  for (const [dx, dy] of [[-6, -3], [3, -4], [-5, 3], [4, 2]]) placeGrid('tienda_cazador', 2, 2, P.cazadores.x + dx, P.cazadores.y + dy);
  fire(P.cazadores.x, P.cazadores.y);
  put(objects, P.cazadores.x - 2, P.cazadores.y + 1, T.pila_lena); put(objects, P.cazadores.x + 2, P.cazadores.y - 1, T.trineo);
  reserve(P.cazadores.x - 8, P.cazadores.y - 5, P.cazadores.x + 7, P.cazadores.y + 5);
  // la Aldea de los Mamuts: los mamuts de piedra que tallaron los norteños, y un puesto de pastores
  placeGrid('mamut_piedra', 3, 2, P.mamuts.x - 6, P.mamuts.y - 4);
  placeGrid('mamut_piedra', 3, 2, P.mamuts.x + 4, P.mamuts.y + 1);
  placeGrid('tienda_cazador', 2, 2, P.mamuts.x - 1, P.mamuts.y - 1);
  fire(P.mamuts.x + 2, P.mamuts.y - 2);
  reserve(P.mamuts.x - 8, P.mamuts.y - 6, P.mamuts.x + 8, P.mamuts.y + 4);
  // la Estepa de la Aurora: un círculo de piedras rúnicas donde se mira la aurora
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.round(P.estepa.x + Math.cos(a) * 5);
    const y = Math.round(P.estepa.y + Math.sin(a) * 3) - 1;
    if (areaFree(x, y, 1, 2)) placeGrid('menhir_runico', 1, 2, x, y);
  }
  fire(P.estepa.x, P.estepa.y);
  reserve(P.estepa.x - 7, P.estepa.y - 5, P.estepa.x + 7, P.estepa.y + 4);
  // hogueras (refugios: también dan calor, tanda 6), una por subzona
  for (const [x, y] of [[132, 66], [146, 44], [94, 40], [24, 44], [52, 52], [70, 18], [112, 8], [132, 22], [30, 22]]) {
    let spot = null;
    for (let r = 0; r <= 4 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      if (areaFree(x + dx, y + dy, 1, 1, 1)) spot = [x + dx, y + dy];
    }
    if (spot) { fire(spot[0], spot[1]); reserve(spot[0] - 1, spot[1] - 1, spot[0] + 1, spot[1] + 1); }
  }

  // ---------------------------------------------------------------- picos, bosques, rocas y témpanos
  // picos de la cordillera al pie de la pared norte
  for (let x = 0; x < W - 2; x += 3) {
    const ox = x + Math.floor(hash(x, 0, 71) * 2);
    if (isReserved(ox, 2) || isReserved(ox + 2, 4)) continue;
    if (rand() < 0.6 && areaFree(ox, 2, 3, 3)) placeGrid('pico', 3, 3, ox, 2);
    else if (areaFree(ox, 2, 2, 2)) placeGrid('roca_nevada', 2, 2, ox, 2);
  }
  const treeDensity = (x, y) => {
    const z = subzoneAt(x, y)?.name;
    let d = fbm(x, y, 73) - 0.5;
    if (z === 'Bosque de Pinos Blancos') d += 0.62;
    if (['Valle de los Gigantes', 'Campamento de los Cazadores', 'Costa Helada', 'Cementerio Real'].includes(z)) d += 0.12;
    if (['Estepa de la Aurora', 'Lago de Cristal', 'Grieta del Glaciar', 'Santuario del Quinto Sello', 'Palacio de Hielo'].includes(z)) d -= 0.25;
    return d;
  };
  for (let y = 4; y < H - 1; y += 3) {
    for (let x = 2; x < W - 3; x += 3) {
      const ox = x + Math.floor(hash(x, y, 81) * 3) - 1;
      const oy = y + Math.floor(hash(x, y, 82) * 3) - 1;
      if (isReserved(ox, oy) || isReserved(ox + 1, oy + 1)) continue;
      const d = treeDensity(ox, oy);
      if (d <= 0.05 || rand() > d * 1.6) continue;
      if (!areaFree(ox, oy, 2, 2, 0, (a, b) => ['nieve', 'nieveh', 'musgo'].includes(at(a, b)))) continue;
      placeGrid(rand() < 0.6 ? 'abeto_blanco' : 'pino_nevado', 2, 2, ox, oy);
    }
  }
  // témpanos en el mar y en el fiordo
  for (let i = 0; i < 60; i++) {
    const x = 2 + Math.floor(rand() * (W - 4));
    const y = 90 + Math.floor(rand() * (H - 92));
    if (isReserved(x, y) && !(x >= 120 && y >= 112)) continue;
    if (at(x, y) === 'fiordo' && free(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => at(x + dx, y + dy) === 'fiordo')) put(objects, x, y, T.tempano);
  }
  // detalles: rocas con nieve, cristales de hielo, flores de escarcha, leña
  for (let i = 0; i < 1400; i++) {
    const x = 2 + Math.floor(rand() * (W - 4));
    const y = 4 + Math.floor(rand() * (H - 6));
    if (!free(x, y) || isReserved(x, y) || !okGround(x, y)) continue;
    const z = subzoneAt(x, y)?.name;
    const r = rand();
    if (r < 0.02 && areaFree(x, y, 2, 2)) placeGrid('roca_nevada', 2, 2, x, y);
    else if (r < 0.03 && ['Grieta del Glaciar', 'Torre de Cristal', 'Lago de Cristal'].includes(z)) put(objects, x, y, T.cristal_hielo);
    else if (r < 0.045 && ['Estepa de la Aurora', 'Bosque de Pinos Blancos', 'Aldea de los Mamuts'].includes(z)) put(objects, x, y, T.flor_escarcha_deco);
    else if (r < 0.05 && z === 'Valle de los Gigantes') put(objects, x, y, T.hueso_grande);
  }
  // caminos, plaza, muelle, puentes, losas, lago, agua y paredes siempre libres de decoración suelta
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    const k = y * W + x;
    if (['camino', 'plaza', 'muellen', 'colgante', 'caran'].includes(t)) { objects[k] = 0; above[k] = 0; }
  }
  placeTown();
  placeGrid('portal_cripta', 3, 3, P.cripta.x - 1, P.cripta.y - 2);
  placeGrid('palacio_hielo', 6, 5, P.palacio.x, P.palacio.y);
  // el barco atrapado en el hielo, en el islote del medio del Mar Helado (escondite)
  placeGrid('casco_barco', 3, 2, 60, 107);
  const px = (n) => n * 32;
  const prop = (name, type, value) => ({ name, type, value });
  const points = [];
  const pt = (o) => points.push(o);

  // ---------------------------------------------------------------- recursos
  // cada uno tiene varios sitios posibles; el servidor elige en cuál reaparece (lib/worldNodes.js del
  // back: el id y la cantidad de sitios tienen que coincidir con gprback/lib/worldNodes.zonas.json)
  const resourceDefs = [];
  const resPoints = [];
  const snowy = (t) => ['nieve', 'nieveh', 'musgo', 'roca'].includes(t);
  function findSpot(cx, cy, r0, okFn) {
    // si no hay lugar cerca, se busca un poco más lejos
    for (let tries = 0; tries < 800; tries++) {
      const r = r0 + Math.floor(tries / 160) * 3;
      const x = Math.round(cx + (rand() * 2 - 1) * r);
      const y = Math.round(cy + (rand() * 2 - 1) * r);
      if (free(x, y) && free(x, y - 1) && !isReserved(x, y) && okFn(at(x, y)) && !resPoints.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 3)) return [x, y];
    }
    return null;
  }
  function resource(id, tipo, centers, spots = 3, okFn = snowy) {
    const list = [];
    for (const [cx, cy, r] of centers) {
      for (let i = 0; i < spots; i++) {
        const sp = findSpot(cx, cy, r, okFn);
        if (sp) { list.push(sp); resPoints.push(sp); }
      }
    }
    if (!list.length) throw new Error(`no hay lugar para el recurso ${id}`);
    resourceDefs.push({ id, tipo, spots: list.length });
    list.forEach(([x, y], i) => pt({ name: id, type: 'recurso', x: px(x) + 16, y: px(y) + 16, properties: [prop('tipo', 'string', tipo), prop('sitio', 'int', i)] }));
  }
  // Costa Helada y Aldea de los Mamuts: trineos abandonados y flores
  resource('restos_costa', 'restos_trineo', [[134, 72, 8]], 2);
  resource('cofre_costa', 'cofre_tundra', [[154, 64, 4]], 1);
  resource('restos_aldea', 'restos_trineo', [[96, 80, 8]], 2);
  resource('flor_aldea', 'flor_escarcha', [[108, 66, 8]], 2);
  // Bosque de Pinos Blancos: la madera y las flores de escarcha
  resource('pino_bosque', 'pino_blanco', [[132, 40, 10], [148, 50, 8]], 3);
  resource('flor_bosque', 'flor_escarcha', [[140, 34, 8]], 2);
  resource('cofre_bosque', 'cofre_tundra', [[156, 32, 3]], 1);
  // Estepa de la Aurora: flores y los menhires del círculo de piedras
  resource('flor_estepa', 'flor_escarcha', [[50, 70, 8], [70, 86, 8]], 3);
  resource('menhir_estepa', 'menhir_runas', [[P.estepa.x, P.estepa.y, 6]], 3);
  // Lago de Cristal: los agujeros de pesca, en el hielo
  resource('pesca_lago', 'agujero_pesca', [[P.lago.x, P.lago.y, 9]], 4, (t) => t === 'lago');
  resource('flor_lago', 'flor_escarcha', [[86, 36, 5]], 2);
  // Campamento de los Cazadores
  resource('restos_cazadores', 'restos_trineo', [[20, 82, 8]], 2);
  resource('pino_cazadores', 'pino_blanco', [[10, 68, 6]], 2);
  // Torre de Cristal y Grieta del Glaciar: las vetas de hielo eterno
  resource('veta_torre', 'veta_hielo', [[132, 16, 8], [150, 20, 6]], 3);
  resource('cofre_torre', 'cofre_tundra', [[156, 4, 3]], 1);
  resource('veta_grieta', 'veta_hielo', [[50, 10, 8], [70, 22, 6]], 3);
  // Valle de los Gigantes
  resource('veta_valle', 'veta_hielo', [[10, 36, 6]], 2);
  resource('restos_valle', 'restos_trineo', [[30, 52, 6]], 1);
  // Santuario y Cementerio Real: menhires rúnicos
  resource('menhir_santuario', 'menhir_runas', [[50, 36, 6]], 2);
  resource('menhir_cementerio', 'menhir_runas', [[90, 16, 8], [112, 20, 6]], 3);
  resource('cofre_cementerio', 'cofre_tundra', [[116, 4, 3]], 1);
  // Palacio de Hielo: un cofre en la explanada
  resource('cofre_palacio', 'cofre_tundra', [[34, 24, 4]], 1);

  // ---------------------------------------------------------------- puntos (en coordenadas de la zona, px)
  pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
  // Rhaegar espera junto a su barco, en el muelle (gprback/lib/barco.js); La Gaviota Insolente atracada
  pt({ name: 'rhaegar_fiordo', type: 'npc', x: px(P.muelle.x - 2) + 16, y: px(P.muelle.y - 1) + 16, properties: [
    prop('nombre', 'string', 'Capitán Rhaegar'), prop('sprite', 'string', 'npc_rhaegar'), prop('dialogo', 'string', 'rhaegar_fiordo'),
    prop('etiqueta', 'string', 'Hablar con Capitán Rhaegar'), prop('pasea', 'int', 0)] });
  // NPCs (sus diálogos están en src/game/dialoguesTundra.js; sus casas, en gprback/lib/questSteps.js).
  // Cada uno vive donde tiene sentido según su historia (zona5_tundra.md, sección 9). fase: cuándo se
  // ve según la historia de cada jugador (game/story.js)
  const npcSpot = (cx, cy, ok = okGround) => {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (free(x, y) && free(x, y - 1) && ok(x, y) && !resPoints.some(([a, b]) => a === x && b === y)) return [x, y];
    }
    throw new Error(`no hay lugar para un NPC cerca de ${cx},${cy}`);
  };
  const npcsPuestos = [];
  const npc = (name, nombre, cx, cy, pasea = 1, fase = null, sprite = `npc_${name}`, ok = undefined) => {
    const [x, y] = npcSpot(cx, cy, ok);
    npcsPuestos.push(`${name} ${x},${y}`);
    pt({ name, type: 'npc', x: px(x) + 16, y: px(y) + 16, properties: [
      prop('nombre', 'string', nombre), prop('sprite', 'string', sprite), prop('dialogo', 'string', name),
      prop('etiqueta', 'string', `Hablar con ${nombre.split(',')[0]}`), prop('pasea', 'int', pasea), ...(fase ? [prop('fase', 'string', fase)] : [])] });
  };
  const plaza = (x, y) => okGround(x, y) || ['plaza', 'camino', 'muellen'].includes(at(x, y));
  // Fiordo Blanco
  npc('hrafna', 'Hrafna, la Anciana del Hielo', P.jarl.x + 1, P.jarl.y + 4, 0, null, 'npc_hrafna', plaza);
  // Eirik: en el Lago hasta que lo escoltas (T4); después, en la casa larga con su abuela
  npc('eirik_lago', 'Eirik, el Príncipe del Hielo', P.lago.x - 2, P.lago.y + 1, 0, '!TUNDRA_HISTORIA_04_PRINCIPE,!TUNDRA_HISTORIA_04_PRINCIPE@3+', 'npc_eirik', (x, y) => at(x, y) === 'lago');
  npc('eirik', 'Eirik, el Príncipe del Hielo', P.jarl.x - 1, P.jarl.y + 4, 1, 'TUNDRA_HISTORIA_04_PRINCIPE@empezada,!TUNDRA_HISTORIA_04_PRINCIPE@3-', 'npc_eirik', plaza);
  // Hela: en la casa larga desde que cae su padre (T13); si eliges la justicia, se va a Aurelia
  npc('hela', 'Hela, la hija del Rey', P.jarl.x + 3, P.jarl.y + 4, 0, 'TUNDRA_Q3_REY_HIELO,!TUNDRA_HISTORIA_14_JUSTICIA,!TUNDRA_HISTORIA_14_JUSTICIA@4+', 'npc_hela', plaza);
  npc('sigrun', 'Sigrún, la herrera', P.forja.x, P.forja.y + 3, 0, null, 'npc_sigrun', plaza);
  npc('gunnhild', 'Gunnhild, la posadera', P.posada.x + 1, P.posada.y + 4, 1, null, 'npc_gunnhild', plaza);
  npc('mercader_fiordo', 'Bjorn el Mudo, mercader', P.muelle.x - 4, P.muelle.y - 3, 0, null, 'npc_bjorn', plaza);
  npc('skadi', 'Skadi, la domadora de perros', P.perrera.x + 1, P.perrera.y + 3, 1, null, 'npc_skadi', plaza);
  // Tilo llega de vacaciones después de que traes a Eirik (T4)
  npc('tilo_tundra', 'Tilo, soldado del puerto', P.plaza.x - 2, P.plaza.y, 1, 'TUNDRA_HISTORIA_04_PRINCIPE', 'npc_tilo_soldado', plaza);
  // afuera
  npc('vigdis', 'Vigdis, la astrónoma', P.torre.x, P.torre.y + 4, 0, null, 'npc_vigdis');
  npc('ulrich', 'Ulrich, el cazador', P.cazadores.x, P.cazadores.y + 2, 1, null, 'npc_ulrich');
  npc('ren_tundra', 'Ren, el guardabosque', 136, 46, 1, null, 'npc_ren');
  // los trineos de perros de Skadi (gprback/lib/trineos.js): sus hermanos Kari (Aldea) y Leif (Campamento)
  npc('trineo_aldea', 'Kari, conductora de trineos', P.mamuts.x + 4, P.mamuts.y + 3, 0, null, 'npc_kari');
  npc('trineo_campamento', 'Leif, conductor de trineos', P.cazadores.x + 4, P.cazadores.y - 3, 0, null, 'npc_leif');
  console.log('NPCs:', npcsPuestos.join(' · '));
  pt({ name: 'gaviota_fiordo', type: 'escena', x: px(P.muelle.x + 2), y: px(P.muelle.y + 2), properties: [
    prop('sprite', 'string', 'gaviota_insolente'), prop('ancho', 'int', 128), prop('alto', 'int', 96)] });
  pt({ name: 'enfermeria_fiordo', type: 'poi', x: px(P.plaza.x + 1), y: px(P.plaza.y), properties: [prop('etiqueta', 'string', 'Hoguera de Fiordo Blanco — Enfermería'), prop('ventana', 'string', 'enfermeria')] });
  // luces de noche: faroles de la ciudad y hogueras (refugios)
  lights.forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
  // escondites de exploración (gprback/lib/exploracion.js SECRETS): el barco atrapado en el hielo del
  // islote del medio, la cueva detrás del mamut de piedra de la Aldea y el nido del búho gigante del Bosque
  for (const [name, x, y] of [['secreto_barco_hielo', 64, 108], ['secreto_cueva_mamut', 93, 70], ['secreto_nido_buho', 122, 34]]) pt({ name, type: 'secreto', x: px(x), y: px(y) });
  // la Cripta Congelada (zona propia, ver generar_cripta_congelada.js): se pisa la casilla del medio de abajo del portal
  pt({ name: 'entrada_cripta_congelada', type: 'salida', x: px(P.cripta.x), y: px(P.cripta.y), width: 32, height: 32, properties: [
    prop('destino', 'string', 'cripta_congelada'), prop('x', 'int', 20), prop('y', 'int', 4), prop('etiqueta', 'string', 'La Cripta Congelada')] });
  // la luz de la Torre de Cristal
  pt({ name: 'luz_torre', type: 'luz', x: px(P.torre.x + 1), y: px(P.torre.y + 1), properties: [prop('tipo', 'string', 'faro')] });
  // jefes: el Guardián del Hielo en la puerta del Santuario del Quinto Sello y el Rey del Hielo en su
  // trono, delante del Palacio
  if (COMBATES_LISTOS) {
    const nearFree = (cx, cy) => {
      for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx; const y = cy + dy;
        if (free(x, y) && free(x, y - 1) && okGround(x, y)) return [x, y];
      }
      throw new Error(`no hay lugar libre cerca de ${cx},${cy}`);
    };
    const [gx, gy] = nearFree(P.guardian.x, P.guardian.y);
    pt({ name: 'santuario_guardian', type: 'jefe', x: px(gx), y: px(gy), properties: [
      prop('monstruo', 'string', 'GUARDIAN_HIELO'), prop('nivel', 'int', 72), prop('etiqueta', 'string', 'Desafiar al Guardián del Hielo')] });
    const [rx, ry] = nearFree(P.rey.x, P.rey.y);
    pt({ name: 'trono_rey_hielo', type: 'jefe', x: px(rx), y: px(ry), properties: [
      prop('monstruo', 'string', 'REY_HIELO'), prop('nivel', 'int', 75), prop('etiqueta', 'string', 'Desafiar al Rey del Hielo')] });
    console.log('Jefes:', `Guardián ${gx},${gy}`, '·', `Rey ${rx},${ry}`);
  }
  // zonas de encuentro (los monstruos se ven caminando en su grupo; el pasto solo dispara si COMBATES_LISTOS)
  if (COMBATES_LISTOS) {
    encounterAreas.forEach((a) => pt({
      name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
      properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', Math.max(3, Math.round((a.w * a.h) / 22)))],
    }));
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
        properties: [prop('zona', 'int', 5)],
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
    nombre: 'Tundra Eterna', zona: 5, musica: 'tundra', tileset: 'pradera', terrenos: TERRENOS, tile: 32, chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
    encuentroHierba: COMBATES_LISTOS ? 0.06 : 0, gidHierba: T.hierba_nevada,
    inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
    clima: { estacion: 'invierno', lluvia: 0, nieve: 0.6 },
    // tiles que usa la fauna del ambiente: pájaros en la nieve y los pinos; nada de patos en el fiordo
    gids: {
      flores: [],
      agua: [],
      prado: [T.nieve_15, T.musgo_15].filter(Boolean),
      arboles: [T.abeto_blanco_0_0, T.abeto_blanco_0_1, T.pino_nevado_0_0, T.pino_nevado_0_1].filter(Boolean),
      dorados: [],
      seco: [],
    },
    chunks,
    subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
  };
  fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
  fs.writeFileSync(path.join(__dirname, 'recursos_tundra.json'), JSON.stringify(resourceDefs, null, 1));
  // los recursos de la zona 5 en el back (el editor de mapas reescribe este archivo al guardar)
  const nodesFile = path.join(__dirname, '../../../gprback/lib/worldNodes.zonas.json');
  if (fs.existsSync(nodesFile)) {
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes['5'] = Object.fromEntries(resourceDefs.map((r) => [r.id, { tipo: r.tipo, sitios: r.spots }]));
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 1));
  }
  console.log('Recursos:', resourceDefs.length, 'tipos de nodo,', resourceDefs.reduce((a, r) => a + r.spots, 0), 'sitios');

  if (process.argv.includes('--preview')) {
    fs.writeFileSync(path.join(__dirname, 'tundra_preview.json'), JSON.stringify({ w: W, h: H, ground, objects, above }));
  }
  console.log(`Tundra generada: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
  console.log('Encuentros:', encounterAreas.length, '·', Object.keys(POBLAR).map((z) => `${z} ${encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === z).length}`).join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
