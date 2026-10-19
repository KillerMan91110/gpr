// Genera las Costas Muertas (zona 4) como un mundo de 4x4 trozos de 40x30 tiles, igual que el Volcán:
//   public/assets/mundo/costas/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/costas/mundo.json            (índice: trozos, subzonas, inicio)
// Va pegado al borde sur del Volcán (etheria.json: x 160, y 330): se entra caminando por la Bajada de
// Basalto, que baja desde la Caldera del Titán (casillas x 102-110 del borde sur del Volcán).
// Diseño completo en gprback/docs/zona4_costas.md.
//
// Diseño (norte arriba): arriba, la pared de basalto del Volcán; por la Bajada se llega a la Playa de
// Ceniza Negra (noreste). Al centro norte, el Delta de Vapor (el río de lava de la Caldera se apaga en
// la Laguna Hirviente); al noroeste la Cala de los Piratas (la cueva y el barco de Rhaegar). Al centro
// este el Puerto Antiguo (humanos) y, sobre el agua, los palafitos de Coralia (tritones). Al medio el
// Manglar de los Susurros; abajo, las Rocas de las Sirenas (islotes que une la marea baja), el Arrecife
// Blanco al este (la entrada al Arrecife Hundido), el Cementerio de Barcos al suroeste, el Faro Negro
// al sur y, en el mar, la plataforma de la Fosa del Abismo, donde está encadenada la Bestia.
//
// Las casillas del suelo salen de las MISMAS reglas que el editor de mapas (src/editor/rules.js), así lo
// generado y lo pintado a mano quedan iguales.
//
// Uso: node art/mapas/generar_costas.js   (con --preview además deja costas_preview.json; ver bmp.js)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

// Lo que todavía no está (tandas siguientes, ver zona4_costas.md): los recursos y los NPCs se agregan
// cuando existan sus tipos, sprites y diálogos. Los combates y los jefes ya están (tanda 2).
const COMBATES_LISTOS = true;

const outDir = path.join(__dirname, '../../public/assets/mundo/costas');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('Las Costas ya se editaron con el editor de mapas: no las piso. Usa --forzar para regenerarlas igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico de esta zona (el editor arma los bordes con ellos, ver src/editor/rules.js)
const TERRENOS = ['arena', 'arenan', 'pastoc', 'coral', 'barro', 'bajo', 'mar', 'banco', 'hierbac', 'muelle', 'camino', 'plaza',
  'basalto', 'lava', 'puentev', 'mesetav', 'carav', 'escalera'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261018;
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
const terrain = Array.from({ length: H }, () => new Array(W).fill('arena'));
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

// sitios importantes (en tiles; las casillas de NPCs, forja, muelles y jefes se repiten en el back:
// lib/cercania.js, lib/questSteps.js y la mazmorra). Los NPCs van en la tanda 4; sus casas ya quedan
// pensadas aquí, cada una junto a lo que pide en sus misiones (zona4_costas.md, sección 9).
const P = {
  entry: { x: 106, y: 0 }, spawn: { x: 106, y: 5 },
  // Puerto Antiguo: plaza, capitanía, astillero, mercado; Coralia sobre el agua, al este
  plaza: { x: 118, y: 45 }, capitania: { x: 111, y: 37 }, astillero: { x: 128, y: 55 }, lonja: { x: 104, y: 55 },
  // la Cala: la cueva de Rhaegar, su campamento y su barco en la ensenada
  cueva: { x: 22, y: 3 }, piratas: { x: 26, y: 14 }, barco: { x: 3, y: 21 },
  laguna: { x: 76, y: 35 }, choza: { x: 22, y: 59 }, lagoon: { x: 77, y: 91 },
  portal: { x: 131, y: 83 }, faro: { x: 70, y: 103 }, ocultos: { x: 63, y: 113 }, cabana: { x: 58, y: 106 },
  fosa: { x: 121, y: 112 }, wreck: { x: 22, y: 96 }, fondeadero: { x: 12, y: 108 },
};

// 1) arena negra volcánica al norte (más espesa cerca del Volcán) y en el cabo del faro
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  // solo al norte (debajo del Volcán); más abajo la arena es clara
  if (y > 44 || (x >= 98 && y >= 27)) continue;
  const north = (36 - y) / 36 * 0.55;
  if (fbm(x, y, 11) + Math.max(0, north) > 0.7) setT(x, y, 'arenan');
}
// 2) el Delta de Vapor: basalto alrededor del río de lava que baja de la Caldera a la Laguna Hirviente
const LAVA = [[88, 0], [87, 8], [83, 16], [80, 24], [77, 30]];
stroke(LAVA, 4, 'basalto', null, 0.8);
blobT(70, 14, 9, 7, 'basalto', 0.45, 21);
blobT(94, 22, 6, 5, 'basalto', 0.45, 22);
stroke(LAVA, 1, 'lava', null, 0.8);
// 3) la Cala de los Piratas: acantilados de basalto al norte, la ensenada al oeste
blobT(22, 4, 22, 5, 'basalto', 0.4, 31);
blobT(42, 7, 9, 4, 'basalto', 0.4, 32);
// 4) el Manglar: barro con canales de agua baja
for (let y = 46; y < 82; y++) for (let x = 0; x < 100; x++) {
  const d = Math.min(1, dist(x / 1.6, y, 44 / 1.6, 63) / 22);
  if (fbm(x, y, 41) * 0.65 + (1 - d) * 0.7 > 0.66) setT(x, y, 'barro');
}
stroke([[2, 52], [16, 56], [30, 52], [46, 60], [62, 56], [76, 63], [86, 70]], 1, 'bajo');
stroke([[6, 76], [22, 70], [36, 76], [48, 72]], 1, 'bajo');
// 5) el Arrecife Blanco: coral sobre la arena, con pozas
for (const [cx, cy, rx, ry] of [[126, 74, 10, 6], [140, 86, 9, 7], [118, 92, 8, 5], [142, 70, 6, 4]]) blobT(cx, cy, rx, ry, 'coral', 0.45, cx + cy);
for (const [cx, cy] of [[124, 76], [138, 90], [116, 90]]) blobT(cx, cy, 2.5, 1.6, 'bajo', 0.3, cx);
// 6) pasto de duna sobre la arena clara (Playa baja, alrededores del puerto, Cementerio)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'arena') continue;
  if (fbm(x, y, 51) > 0.55) setT(x, y, 'pastoc');
}
// 7) el cabo del Faro Negro: roca negra
blobT(P.faro.x + 2, 110, 19, 9, 'arenan', 0.35, 61);
blobT(P.faro.x, 104, 6, 4, 'basalto', 0.3, 62);

// 8) el mar: al este, al sur y en la ensenada de la Cala; el oeste se cierra con mar y acantilado
const eastCoast = (y) => {
  if (y < 32) return 150 + Math.round(valueNoise(0, y, 5, 71) * 4);
  if (y <= 64) return 157;
  if (y <= 100) return 147 + Math.round(valueNoise(0, y, 5, 72) * 5);
  return 92 + Math.round(valueNoise(0, y, 4, 73) * 3);
};
const southCoast = (x) => {
  if (x < 55) return 111 + Math.round(valueNoise(x, 0, 6, 74) * 4);
  if (x < 90) return 118;
  return 101 + Math.round(valueNoise(x, 0, 5, 75) * 2);
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (x >= eastCoast(y) || y >= southCoast(x)) setT(x, y, 'mar');
  if (x <= 1 && y >= 12) setT(x, y, 'mar');
}
blobT(4, 24, 12, 9, 'mar', 0.3, 81);                   // la ensenada de la Cala
blobT(P.laguna.x, P.laguna.y + 1, 9, 5, 'mar', 0.3, 82); // la Laguna Hirviente
// las Rocas de las Sirenas: laguna honda con islotes
blobT(P.lagoon.x, P.lagoon.y, 21, 9, 'bajo', 0.35, 83);
blobT(P.lagoon.x, P.lagoon.y + 1, 14, 5, 'mar', 0.3, 84);
const ISLOTES = [[64, 90, 4, 3], [79, 95, 4, 2.4], [92, 89, 3.2, 3]];
for (const [cx, cy, rx, ry] of ISLOTES) blobT(cx, cy, rx, ry, 'arena', 0.3, cx * 3);
// la plataforma de la Fosa, en el mar
blobT(P.fosa.x, P.fosa.y, 10, 5, 'basalto', 0.25, 85);
// Coralia: agua baja frente al puerto (los palafitos van sobre ella)
rectT(140, 32, 156, 64, 'bajo');

// 9) el agua baja rodea todo el mar (el borde del mar se aclara hacia ella)
const LAND = ['arena', 'arenan', 'pastoc', 'coral', 'barro', 'basalto'];
const nearSea = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!LAND.includes(at(x, y))) continue;
  const r = 2 + Math.round(valueNoise(x, y, 4, 91) * 2);
  let hit = false;
  for (let dy = -r; dy <= r && !hit; dy++) for (let dx = -r; dx <= r && !hit; dx++) if (dx * dx + dy * dy <= r * r && at(x + dx, y + dy) === 'mar') hit = true;
  if (hit) nearSea.push([x, y]);
}
for (const [x, y] of nearSea) setT(x, y, 'bajo');
// el basalto junto a la lava se queda basalto (la lava lleva costra de basalto en la orilla)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'lava') continue;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (['bajo', 'arena', 'arenan', 'pastoc'].includes(at(x + dx, y + dy))) setT(x + dx, y + dy, 'basalto');
}
// 10) los bancos de arena de la marea: unen la orilla con los islotes de las Rocas
const BANCOS = [[[70, 82], [66, 87]], [[67, 92], [76, 95]], [[83, 94], [90, 91]], [[94, 87], [99, 84]]];
for (const b of BANCOS) stroke(b, 1, 'banco', ['bajo', 'mar'], 0.4);

// 11) el Puerto Antiguo: plaza, calles y muelle (losas de piedra), y los muelles de madera de Coralia
rectT(111, 40, 125, 48, 'plaza');             // la plaza
rectT(101, 44, 139, 45, 'plaza');             // calle mayor (oeste → muelle)
rectT(117, 30, 118, 63, 'plaza');             // calle del norte al sur
rectT(104, 58, 139, 59, 'plaza');             // calle del astillero
rectT(135, 34, 139, 62, 'plaza');             // el malecón
for (const y of [38, 48, 58]) rectT(140, y, 153, y + 1, 'muelle');
rectT(152, 38, 153, 59, 'muelle');
// muelles de los botes de Marul: del puerto al mar abierto, hacia el sur
rectT(144, 62, 145, 64, 'muelle', ['bajo', 'mar']);

// 12) caminos: de la Bajada al puerto y del puerto a cada subzona. Sobre la lava, puente de basalto;
// sobre el mar, muelle; sobre el agua baja no hace falta (se vadea)
const roads = [];
const road = (pts, width = 2) => roads.push({ pts, width });
road([[106, 0], [106, 8], [110, 16], [114, 24], [117, 30]]);                  // la Bajada de Basalto, hasta el puerto
road([[101, 44], [94, 38], [90, 30], [84, 22], [72, 20], [58, 19], [42, 17], [26, 15]], 1); // al Delta (cruza la lava por un puente) y a la Cala
road([[101, 45], [90, 52], [76, 56], [60, 58], [44, 60], [28, 60], [22, 61]], 1); // al Manglar y la choza de Cieno
road([[60, 58], [66, 70], [70, 80]], 1);                                     // del manglar a las Rocas
road([[30, 61], [28, 74], [24, 86], [22, 94]], 1);                           // del manglar al Cementerio
road([[22, 98], [36, 102], [50, 104], [60, 106], [68, 107]], 1);             // del Cementerio al Faro
road([[117, 63], [120, 70], [126, 76], [131, 82]], 1);                       // del puerto al Arrecife
road([[99, 84], [108, 78], [120, 70]], 1);                                   // de las Rocas al Arrecife
road([[72, 108], [84, 109], [92, 111], [114, 111]], 2);                      // el embarcadero de la Fosa
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
        else if (tt === 'mar' || tt === 'muelle') setT(cx + dx, cy + dy, 'muelle');
        else if (['plaza', 'bajo', 'banco', 'mesetav', 'carav', 'escalera', null].includes(tt)) continue;
        else setT(cx + dx, cy + dy, 'camino');
      }
    }
  }
}

// 13) el borde norte es la pared de basalto del Volcán: solo se pasa por la Bajada
for (let x = 0; x < W; x++) {
  if (x >= P.entry.x - 5 && x <= P.entry.x + 6) continue;
  setT(x, 0, 'carav'); setT(x, 1, 'carav');
}

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Puerto Antiguo', x0: 100, y0: 32, x1: 139, y1: 64, levels: null, safe: true },
  { name: 'Coralia', x0: 140, y0: 32, x1: 159, y1: 64, levels: null, safe: true },
  { name: 'Playa de Ceniza Negra', x0: 100, y0: 0, x1: 159, y1: 31, levels: '46-48' },
  { name: 'Delta de Vapor', x0: 55, y0: 0, x1: 99, y1: 44, levels: '47-49' },
  { name: 'Cala de los Piratas', x0: 0, y0: 0, x1: 54, y1: 44, levels: '47-51' },
  { name: 'Manglar de los Susurros', x0: 0, y0: 45, x1: 99, y1: 80, levels: '48-52' },
  { name: 'Rocas de las Sirenas', x0: 55, y0: 81, x1: 99, y1: 100, levels: '51-55' },
  { name: 'Arrecife Blanco', x0: 100, y0: 65, x1: 159, y1: 100, levels: '53-57' },
  { name: 'Cementerio de Barcos', x0: 0, y0: 81, x1: 54, y1: 119, levels: '54-58' },
  { name: 'Faro Negro', x0: 55, y0: 101, x1: 89, y1: 119, levels: '55-59' },
  { name: 'Fosa del Abismo', x0: 90, y0: 101, x1: 159, y1: 119, levels: '58-60' },
  { name: 'Costas Muertas', x0: 0, y0: 0, x1: 159, y1: 119, levels: '46-60' },
];
const subzoneAt = (x, y) => subzones.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);

// 14) pasto salado (encuentros) por subzona: pocos grupos y bien poblados (una colonia de cangrejos,
// el campamento pirata, el banco de pirañas…) y entre ellos caminos tranquilos
const encounterAreas = [];
const POBLAR = {
  'Playa de Ceniza Negra': { n: 3, mons: [['CANGREJO_GIGANTE', 'GAVIOTA_CARRONERA'], ['CANGREJO_GIGANTE', 'CANGREJO_GIGANTE'], ['GAVIOTA_CARRONERA', 'CANGREJO_GIGANTE']],
    names: ['Colonia de Cangrejos', 'Arena Humeante', 'Roca de las Gaviotas'] },
  'Delta de Vapor': { n: 3, mons: [['CANGREJO_VAPOR', 'GAVIOTA_CARRONERA'], ['CANGREJO_VAPOR', 'CANGREJO_VAPOR'], ['GAVIOTA_CARRONERA', 'CANGREJO_VAPOR']],
    names: ['Pozas Tibias', 'Orilla del Vapor', 'Roca Nueva'] },
  'Cala de los Piratas': { n: 3, mons: [['PIRATA_SIN_NOMBRE', 'PIRATA_SIN_NOMBRE'], ['PIRATA_SIN_NOMBRE', 'GAVIOTA_CARRONERA'], ['PIRATA_SIN_NOMBRE', 'PIRATA_SIN_NOMBRE']],
    names: ['Vigía Pirata', 'Playa del Contrabando', 'Senda de los Barriles'] },
  'Manglar de los Susurros': { n: 4, mons: [['PIRANA_AGUA', 'COCODRILO_MANGLAR'], ['COCODRILO_MANGLAR', 'COCODRILO_MANGLAR'], ['PIRANA_AGUA', 'PIRANA_AGUA'], ['COCODRILO_MANGLAR', 'PIRANA_AGUA']],
    names: ['Banco de Pirañas', 'Barrizal del Cocodrilo', 'Raíces que Susurran', 'Canal Oscuro'] },
  'Rocas de las Sirenas': { n: 3, mons: [['SIRENA_CORRUPTA', 'MEDUSA_ABISAL'], ['MEDUSA_ABISAL', 'MEDUSA_ABISAL'], ['SIRENA_CORRUPTA', 'SIRENA_CORRUPTA', 'LEVIATAN_MENOR']],
    names: ['Canto de las Rocas', 'Pozas de Medusas', 'Islote del Canto'] },
  'Arrecife Blanco': { n: 3, mons: [['GOLEM_CORAL', 'MEDUSA_ABISAL'], ['GOLEM_CORAL', 'GOLEM_CORAL'], ['GOLEM_CORAL', 'MEDUSA_ABISAL', 'LEVIATAN_MENOR']],
    names: ['Coral Vivo', 'Jardín Blanco', 'Borde del Arrecife'] },
  'Cementerio de Barcos': { n: 3, mons: [['MARINERO_MALDITO', 'MARINERO_MALDITO'], ['MARINERO_MALDITO', 'PIRATA_SIN_NOMBRE'], ['MARINERO_MALDITO', 'MARINERO_MALDITO', 'CAPITAN_PIRATA']],
    names: ['Cascos Varados', 'Arena de los Ahogados', 'Fondeadero Negro'] },
  'Faro Negro': { n: 3, mons: [['ACOLITO_MAREA', 'ACOLITO_MAREA'], ['ACOLITO_MAREA', 'CALAMAR_ABISMO'], ['CALAMAR_ABISMO', 'ACOLITO_MAREA']],
    names: ['Pie del Faro', 'Rocas del Eclipse', 'Escollera Oscura'] },
  'Fosa del Abismo': { n: 1, mons: [['CALAMAR_ABISMO', 'CALAMAR_ABISMO', 'ACOLITO_MAREA']], names: ['Borde de la Fosa'] },
};
const AREA_BAD = ['camino', 'plaza', 'mar', 'muelle', 'lava', 'puentev', 'carav', 'mesetav', 'escalera', 'banco'];
const AREA_LAND = ['arena', 'arenan', 'pastoc', 'coral', 'barro', 'basalto'];
// lugares donde no van grupos de monstruos (ciudad, campamentos, faro, portal, casas)
const KEEP_AWAY = [P.spawn, P.plaza, P.piratas, P.cueva, P.barco, P.choza, P.portal, P.faro, P.cabana, P.fosa, P.wreck, P.laguna, P.fondeadero];
const areaFits = (x, y, w, h, zone, minLand) => {
  if (x < 3 || y < 3 || x + w > W - 2 || y + h > H - 2) return false;
  if (subzoneAt(x + w / 2, y + h / 2)?.name !== zone) return false;
  if ([[x, y], [x + w, y + h], [x + w, y], [x, y + h]].some(([a, b]) => subzoneAt(a, b)?.safe)) return false;
  const pad = ['Faro Negro', 'Fosa del Abismo'].includes(zone) ? 2 : 5;
  if (KEEP_AWAY.some((k) => Math.abs(k.x - (x + w / 2)) < w / 2 + pad && Math.abs(k.y - (y + h / 2)) < h / 2 + pad - 1)) return false;
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
  // en las Rocas y el Arrecife los monstruos también andan por el agua baja
  const minLand = ['Rocas de las Sirenas', 'Arrecife Blanco'].includes(zone) ? 0.35 : (['Faro Negro', 'Fosa del Abismo'].includes(zone) ? 0.6 : 0.85);
  const sizes = zone === 'Fosa del Abismo' ? [[8, 5], [7, 4]] : [[14, 8], [12, 7], [10, 6], [8, 5]];
  const cands = [];
  for (let y = z.y0; y <= z.y1; y += 2) for (let x = z.x0; x <= z.x1; x += 2) {
    for (const [w, h] of sizes) if (areaFits(x, y, w, h, zone, minLand)) { cands.push({ x, y, w, h }); break; }
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
      // los grupos se separan, pero no se van al rincón más lejano: premia el tamaño
      const score = Math.min(d, 40) + c.w * c.h * 0.05;
      if (score > bestD) { best = c; bestD = score; }
    }
    if (!best) break;
    encounterAreas.push({ name: cfg.names[k % cfg.names.length], ...best, monstruos: cfg.mons[k % cfg.mons.length] });
    k++;
  }
}
// el pasto salado se pinta solo sobre tierra (en el agua baja el grupo anda igual, sin pasto)
for (const a of encounterAreas) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  for (let y = a.y - 1; y <= a.y + a.h; y++) for (let x = a.x - 1; x <= a.x + a.w; x++) {
    const d = ((x - cx) / (a.w / 2)) ** 2 + ((y - cy) / (a.h / 2)) ** 2;
    const n = valueNoise(x, y, 4, 31);
    if (['arena', 'arenan', 'pastoc', 'coral'].includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 33) > 0.2) setT(x, y, 'hierbac');
  }
}

// ---------------------------------------------------------------- capas de tiles
async function main() {
  // las reglas del editor (es un módulo ES: se importa una copia .mjs)
  const tmp = path.join(os.tmpdir(), `rules_costas_${process.pid}.mjs`);
  fs.copyFileSync(path.join(__dirname, '../../src/editor/rules.js'), tmp);
  const { makeRules } = await import(pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  const R = makeRules(TILESET);
  // el azar de las variantes del suelo (arena con conchas…) también sale de la semilla
  const mathRandom = Math.random;
  Math.random = rand;

  const ground = new Array(W * H).fill(0);
  const objects = new Array(W * H).fill(0);
  const above = new Array(W * H).fill(0);
  const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = gid; };
  const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && objects[y * W + x] === 0 && above[y * W + x] === 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(ground, x, y, R.groundGid(at, x, y, 0));
  // la pared del norte: la fila de arriba con el borde de ceniza, la de abajo con sombra
  for (let x = 0; x < W; x++) {
    if (at(x, 0) !== 'carav') continue;
    const side = at(x - 1, 0) !== 'carav' ? 'i' : (at(x + 1, 0) !== 'carav' ? 'd' : 'c');
    put(ground, x, 0, T[`cara_v_a_${side}`]);
    put(ground, x, 1, T[`cara_v_b_${side}`]);
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
  function placeBig(name, x, y) {
    put(objects, x, y, T[`${name}_ai`]); put(objects, x + 1, y, T[`${name}_ad`]);
    put(objects, x, y + 1, T[`${name}_bi`]); put(objects, x + 1, y + 1, T[`${name}_bd`]);
  }
  const okGround = (x, y) => ['arena', 'arenan', 'pastoc', 'coral', 'barro', 'basalto'].includes(at(x, y));
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

  // el Puerto Antiguo: capitanía, casas encaladas, almacenes, el mercado de pescado, el astillero
  function placePort() {
    placeGrid('capitania', 4, 3, P.capitania.x, P.capitania.y);
    placeGrid('casa_puerto', 3, 3, 120, 37);
    placeGrid('casa_puerto_b', 3, 3, 123, 37);
    placeGrid('casa_puerto_b', 3, 3, 104, 41);
    placeGrid('almacen', 3, 3, 128, 41);
    placeGrid('almacen', 3, 3, 131, 41);
    placeGrid('lonja', 4, 3, P.lonja.x, P.lonja.y);
    placeGrid('casa_puerto', 3, 3, 110, 55);
    placeGrid('casa_puerto_b', 3, 3, 121, 55);
    placeGrid('astillero', 4, 3, P.astillero.x, P.astillero.y);
    // el puesto de Salitre (el mercader) y el de Doña Almeja en la plaza
    placeBig('puesto_rojo', 112, 46); placeBig('puesto_verde', 123, 46);
    put(objects, 114, 47, T.caja); put(objects, 122, 47, T.barril);
    // bancos y macetas en la plaza, palmeras en los solares
    for (const [x, y] of [[113, 41], [122, 41]]) put(objects, x, y, T.banco_plaza);
    for (const [x, y] of [[111, 40], [125, 40], [111, 48], [125, 48]]) put(objects, x, y, T.maceta);
    for (const [x, y] of [[101, 38], [107, 50], [113, 51], [123, 51], [130, 49], [101, 60], [125, 61], [109, 61], [131, 35], [104, 35]]) placeGrid('palmera', 2, 2, x, y);
    // el malecón: campana de la marea, redes, barriles y faroles
    put(objects, 137, 46, T.campana_puerto);
    put(objects, 139, 35, T.red_pesca); put(objects, 139, 53, T.red_pesca);
    for (const [x, y] of [[134, 44], [134, 41], [127, 44]]) put(objects, x, y, T.barril);
    for (const [x, y] of [[133, 47], [135, 56], [126, 57]]) put(objects, x, y, T.caja);
    put(objects, 132, 57, T.ancla);
    for (const [x, y] of [[110, 40], [126, 40], [110, 48], [126, 48], [135, 38], [135, 50], [135, 60], [116, 33], [119, 61], [103, 46]]) {
      put(objects, x, y, T.farol); lights.push([x, y, 'farol']);
    }
    // el brasero de la plaza es el refugio del puerto
    put(objects, 114, 42, T.fogata); lights.push([114, 42, 'fogata']);
    put(objects, 116, 41, T.cartel);
  }
  placePort();
  reserve(100, 30, 139, 64);
  // Coralia: palafitos sobre el agua, encima de cada pasarela, y lámparas de medusa
  const PALAFITOS = [[141, 35], [146, 35], [143, 45], [148, 45], [141, 55], [147, 55]];
  function placeCoralia() {
    for (const [x, y] of PALAFITOS) placeGrid('palafito', 3, 3, x, y);
    for (const [x, y] of [[140, 37], [151, 40], [140, 47], [151, 50], [140, 57], [151, 60]]) {
      if (at(x, y) === 'muelle' || at(x, y) === 'bajo') { put(objects, x, y, T.lampara_medusa); lights.push([x, y, 'farol']); }
    }
    put(objects, 155, 41, T.boya); put(objects, 155, 55, T.boya);
    put(objects, 147, 63, T.bote); put(objects, 142, 63, T.bote);
  }
  placeCoralia();
  reserve(140, 32, 159, 64);

  // la Cala: la cueva de Rhaegar en el acantilado, su campamento y La Gaviota Insolente en la ensenada
  placeGrid('cueva_pirata', 3, 3, P.cueva.x, P.cueva.y);
  reserve(P.cueva.x - 1, P.cueva.y, P.cueva.x + 3, P.cueva.y + 4);
  placeBig('carpa', P.piratas.x - 5, P.piratas.y - 2); placeBig('carpa', P.piratas.x + 3, P.piratas.y - 3);
  put(objects, P.piratas.x, P.piratas.y, T.fogata); lights.push([P.piratas.x, P.piratas.y, 'fogata']);
  for (const [x, y] of [[-3, 2], [2, 2], [4, 1], [-1, 3]]) put(objects, P.piratas.x + x, P.piratas.y + y, rand() < 0.5 ? T.barril : T.caja);
  put(objects, P.piratas.x + 6, P.piratas.y + 2, T.red_pesca);
  reserve(P.piratas.x - 7, P.piratas.y - 4, P.piratas.x + 7, P.piratas.y + 4);
  // La Gaviota Insolente es un escenario por fase (en la Cala hasta la C9, después en el puerto)
  reserve(P.barco.x - 1, P.barco.y - 1, P.barco.x + 5, P.barco.y + 4);

  // el Delta: respiraderos de vapor junto a la lava y la Laguna Hirviente
  for (let i = 0; i < 40; i++) {
    const x = 60 + Math.floor(rand() * 40);
    const y = 3 + Math.floor(rand() * 38);
    if (free(x, y) && at(x, y) === 'basalto' && [[0, 1], [1, 0], [0, -1], [-1, 0], [2, 0], [-2, 0]].some(([dx, dy]) => at(x + dx, y + dy) === 'lava')) put(objects, x, y, T.respiradero);
  }
  put(objects, 92, 18, T.fogata); lights.push([92, 18, 'fogata']);
  reserve(90, 16, 94, 20);

  // el Manglar: la choza de Cieno (un palafito sobre el barro), con su red y su bote
  placeGrid('palafito', 3, 3, P.choza.x - 1, P.choza.y - 3);
  put(objects, P.choza.x + 3, P.choza.y, T.red_pesca);
  put(objects, P.choza.x - 2, P.choza.y + 1, T.fogata); lights.push([P.choza.x - 2, P.choza.y + 1, 'fogata']);
  reserve(P.choza.x - 4, P.choza.y - 4, P.choza.x + 5, P.choza.y + 3);

  // las Rocas de las Sirenas: rocas en la laguna y cosas que trae el mar a los islotes
  for (const [x, y] of [[71, 92], [86, 93], [76, 88], [84, 88]]) if (at(x, y) === 'mar' || at(x, y) === 'bajo') placeGrid('roca_marina', 2, 2, x, y);
  for (const [cx, cy] of ISLOTES) {
    put(objects, Math.round(cx) + 1, Math.round(cy) - 1, T.roca_costa);
    put(objects, Math.round(cx) - 1, Math.round(cy) + 1, rand() < 0.5 ? T.concha_grande : T.estrella_mar);
  }
  put(objects, 62, 83, T.fogata); lights.push([62, 83, 'fogata']);
  reserve(60, 81, 64, 85);

  // el Arrecife Blanco: la entrada al Arrecife Hundido y un campamento de buzos
  placeGrid('portal_arrecife', 3, 3, P.portal.x - 1, P.portal.y - 2);
  reserve(P.portal.x - 3, P.portal.y - 3, P.portal.x + 3, P.portal.y + 3);
  put(objects, 124, 70, T.fogata); lights.push([124, 70, 'fogata']);
  put(objects, 122, 70, T.caja); put(objects, 126, 69, T.ancla);
  reserve(121, 68, 127, 72);

  // el Cementerio de Barcos: cascos varados, mástiles y anclas
  const WRECKS = [[P.wreck.x - 2, P.wreck.y - 2], [8, 88], [36, 92], [10, 104], [40, 108]];
  for (const [x, y] of WRECKS) {
    let spot = null;
    for (let r = 0; r <= 4 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      if (areaFree(x + dx, y + dy, 3, 2, 0, (a, b) => okGround(a, b) || at(a, b) === 'bajo')) spot = [x + dx, y + dy];
    }
    if (spot) { placeGrid('casco_barco', 3, 2, spot[0], spot[1]); reserve(spot[0] - 1, spot[1] - 1, spot[0] + 3, spot[1] + 2); }
  }
  for (let i = 0; i < 14; i++) {
    const x = 3 + Math.floor(rand() * 50);
    const y = 84 + Math.floor(rand() * 32);
    if (isReserved(x, y)) continue;
    if (areaFree(x, y, 1, 2)) placeGrid('mastil_roto', 1, 2, x, y);
    else if (free(x, y) && okGround(x, y)) put(objects, x, y, rand() < 0.5 ? T.ancla : T.caja);
  }
  put(objects, 26, 100, T.fogata); lights.push([26, 100, 'fogata']);
  reserve(24, 98, 28, 102);

  // el Faro Negro, la cabaña del farero y el campamento de los Ocultos al pie
  placeGrid('faro_negro', 2, 4, P.faro.x, P.faro.y);
  reserve(P.faro.x - 1, P.faro.y, P.faro.x + 2, P.faro.y + 5);
  placeGrid('casa_puerto_b', 3, 3, P.cabana.x - 1, P.cabana.y - 2);
  reserve(P.cabana.x - 2, P.cabana.y - 3, P.cabana.x + 2, P.cabana.y + 2);
  placeGrid('tienda_ocultos', 2, 2, P.ocultos.x - 3, P.ocultos.y - 3); placeGrid('tienda_ocultos', 2, 2, P.ocultos.x + 2, P.ocultos.y - 3);
  for (const [x, y] of [[P.ocultos.x - 3, P.ocultos.y + 1], [P.ocultos.x + 3, P.ocultos.y + 1]]) if (free(x, y)) put(objects, x, y, T.cristal_eclipse);
  put(objects, P.ocultos.x, P.ocultos.y - 1, T.fogata); lights.push([P.ocultos.x, P.ocultos.y - 1, 'fogata']);
  reserve(P.ocultos.x - 4, P.ocultos.y - 4, P.ocultos.x + 4, P.ocultos.y + 2);
  // la luz negra del faro (de noche se ve)
  lights.push([P.faro.x, P.faro.y, 'antorcha']);

  // la Fosa: cristales de eclipse alrededor de donde está encadenada la Bestia
  for (const [dx, dy] of [[-3, -1], [3, -1], [-2, 2], [2, 2]]) {
    const x = P.fosa.x + dx; const y = P.fosa.y + dy;
    if (at(x, y) === 'basalto' && free(x, y)) put(objects, x, y, T.cristal_eclipse);
  }
  reserve(P.fosa.x - 4, P.fosa.y - 3, P.fosa.x + 4, P.fosa.y + 3);

  // ---------------------------------------------------------------- costa: palmeras, mangles, rocas
  // picos y rocas volcánicas al pie de la pared del Volcán (la costa empieza donde termina el volcán)
  for (let x = 0; x < W - 2; x += 3) {
    if (x >= P.entry.x - 8 && x <= P.entry.x + 8) continue;
    const ox = x + Math.floor(hash(x, 0, 53) * 2);
    if (isReserved(ox, 2) || isReserved(ox + 2, 4)) continue;
    if (rand() < 0.55 && areaFree(ox, 2, 3, 3)) placeGrid('pico_volcan', 3, 3, ox, 2);
    else if (areaFree(ox, 2, 2, 2)) placeGrid('roca_volcanica', 2, 2, ox, 2);
  }
  const treeDensity = (x, y) => {
    const z = subzoneAt(x, y)?.name;
    let d = fbm(x, y, 43) - 0.5;
    if (z === 'Manglar de los Susurros') d += 0.5;
    if (['Playa de Ceniza Negra', 'Arrecife Blanco', 'Cementerio de Barcos', 'Cala de los Piratas', 'Rocas de las Sirenas'].includes(z)) d += 0.14;
    if (z === 'Delta de Vapor' || z === 'Faro Negro' || z === 'Fosa del Abismo') d -= 0.3;
    return d;
  };
  for (let y = 4; y < H - 1; y += 3) {
    for (let x = 0; x < W - 1; x += 3) {
      const ox = x + Math.floor(hash(x, y, 51) * 3) - 1;
      const oy = y + Math.floor(hash(x, y, 52) * 3) - 1;
      if (isReserved(ox, oy) || isReserved(ox + 1, oy + 1)) continue;
      const d = treeDensity(ox, oy);
      if (d <= 0.05 || rand() > d * 1.6) continue;
      const mangrove = subzoneAt(ox, oy)?.name === 'Manglar de los Susurros';
      const ok = (a, b) => (mangrove ? ['barro', 'arena', 'pastoc'].includes(at(a, b)) : ['arena', 'pastoc', 'arenan'].includes(at(a, b)));
      if (!areaFree(ox, oy, 2, 2, 0, ok)) continue;
      placeGrid(mangrove ? 'mangle' : 'palmera', 2, 2, ox, oy);
    }
  }
  // el oeste del manglar se cierra con mangles (no hay nada más allá todavía)
  for (let y = 44; y < 82; y += 2) {
    for (const x of [2 + Math.floor(hash(1, y, 57) * 2), 4 + Math.floor(hash(2, y, 58) * 3)]) if (!isReserved(x, y) && areaFree(x, y, 2, 2, 0, (a, b) => ['barro', 'arena', 'pastoc', 'bajo'].includes(at(a, b)))) placeGrid('mangle', 2, 2, x, y);
  }
  // rocas marinas en el mar cerca de la costa
  for (let i = 0; i < 70; i++) {
    const x = 2 + Math.floor(rand() * (W - 4));
    const y = 2 + Math.floor(rand() * (H - 4));
    if (isReserved(x, y) || isReserved(x + 1, y + 1)) continue;
    if (areaFree(x, y, 2, 2, 0, (a, b) => at(a, b) === 'bajo')) placeGrid('roca_marina', 2, 2, x, y);
  }
  // detalles: conchas, estrellas de mar, rocas de la costa, rocas volcánicas en lo negro
  for (let i = 0; i < 1400; i++) {
    const x = 2 + Math.floor(rand() * (W - 4));
    const y = 3 + Math.floor(rand() * (H - 5));
    if (!free(x, y) || isReserved(x, y) || !okGround(x, y)) continue;
    const z = subzoneAt(x, y)?.name;
    const t = at(x, y);
    const r = rand();
    if (r < 0.025) put(objects, x, y, T.roca_costa);
    else if (r < 0.04 && ['arena', 'pastoc'].includes(t)) put(objects, x, y, T.concha_grande);
    else if (r < 0.05 && t === 'arena') put(objects, x, y, T.estrella_mar);
    else if (r < 0.065 && (t === 'arenan' || t === 'basalto') && areaFree(x, y, 2, 2)) placeGrid('roca_volcanica', 2, 2, x, y);
    else if (r < 0.075 && t === 'basalto' && z === 'Delta de Vapor') put(objects, x, y, T.roca_pomez);
    else if (r < 0.08 && z === 'Cementerio de Barcos') put(objects, x, y, T.caja);
  }
  // caminos, plaza, muelles, puentes, lava, mar y paredes siempre libres de decoración suelta
  // (los edificios y objetos de la ciudad se vuelven a poner encima)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    const k = y * W + x;
    if (['camino', 'plaza', 'muelle', 'puentev', 'lava', 'banco', 'carav'].includes(t)) { objects[k] = 0; above[k] = 0; }
  }
  const px = (n) => n * 32;
  const prop = (name, type, value) => ({ name, type, value });
  const points = [];
  const pt = (o) => points.push(o);

  // ---------------------------------------------------------------- recursos
  // cada uno tiene varios sitios posibles; el servidor elige en cuál reaparece (lib/worldNodes.js del
  // back: el id y la cantidad de sitios tienen que coincidir con gprback/lib/worldNodes.zonas.json)
  const resourceDefs = [];
  const resPoints = [];
  const sandy = (t) => ['arena', 'arenan', 'pastoc'].includes(t);
  const anyLand = (t) => ['arena', 'arenan', 'pastoc', 'coral', 'barro', 'basalto'].includes(t);
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
  function resource(id, tipo, centers, spots = 3, okFn = anyLand) {
    const list = [];
    for (const [cx, cy, r] of centers) {
      for (let i = 0; i < spots; i++) {
        const sp = findSpot(cx, cy, r, okFn);
        if (sp) { list.push(sp); resPoints.push(sp); put(objects, sp[0], sp[1], 0); put(above, sp[0], sp[1] - 1, 0); }
      }
    }
    if (!list.length) throw new Error(`no hay lugar para el recurso ${id}`);
    resourceDefs.push({ id, tipo, spots: list.length });
    list.forEach(([x, y], i) => pt({ name: id, type: 'recurso', x: px(x) + 16, y: px(y) + 16, properties: [prop('tipo', 'string', tipo), prop('sitio', 'int', i)] }));
  }
  // Playa de Ceniza Negra
  resource('alga_playa', 'alga_salina', [[128, 22, 8], [146, 12, 6]], 3, sandy);
  resource('restos_playa', 'restos_naufragio', [[138, 26, 6]], 2, sandy);
  resource('cofre_playa', 'cofre_costas', [[144, 7, 5]], 1);
  // Delta de Vapor: ostras en las pozas tibias junto a la laguna
  resource('ostras_delta', 'ostras', [[68, 34, 6], [86, 38, 6]], 3);
  resource('alga_delta', 'alga_salina', [[60, 40, 6]], 2, sandy);
  // Cala de los Piratas
  resource('restos_cala', 'restos_naufragio', [[16, 32, 6], [34, 22, 5]], 2);
  resource('alga_cala', 'alga_salina', [[10, 40, 6]], 3, sandy);
  resource('cofre_cala', 'cofre_costas', [[4, 8, 3], [50, 4, 3]], 1);
  // Manglar de los Susurros
  resource('alga_manglar', 'alga_salina', [[30, 52, 8], [66, 60, 8]], 3);
  resource('ostras_manglar', 'ostras', [[44, 70, 8]], 2);
  resource('restos_manglar', 'restos_naufragio', [[84, 74, 5]], 2);
  // Rocas de las Sirenas: las pozas en los islotes, ostras y una concha gigante en la orilla
  resource('poza_rocas', 'poza_marea', ISLOTES.map(([cx, cy]) => [Math.round(cx), Math.round(cy), 3]), 1, sandy);
  resource('ostras_rocas', 'ostras', [[60, 86, 4], [96, 92, 4]], 2);
  resource('concha_rocas', 'concha_gigante', [[58, 96, 4], [98, 96, 4]], 1);
  // Arrecife Blanco: las vetas de coral, conchas gigantes y un cofre de buzo
  resource('coral_arrecife', 'veta_coral', [[126, 74, 8], [140, 86, 7], [118, 92, 6]], 3, (t) => t === 'coral');
  resource('concha_arrecife', 'concha_gigante', [[146, 76, 4], [134, 96, 4]], 1);
  resource('cofre_arrecife', 'cofre_costas', [[150, 98, 3]], 1);
  // Cementerio de Barcos
  resource('restos_cementerio', 'restos_naufragio', [[14, 92, 8], [40, 104, 8]], 3);
  resource('alga_cementerio', 'alga_salina', [[30, 112, 6]], 2, sandy);
  resource('cofre_cementerio', 'cofre_costas', [[4, 116, 3], [50, 114, 3]], 1);
  // Faro Negro
  resource('coral_faro', 'veta_coral', [[82, 114, 5]], 2);
  resource('ostras_faro', 'ostras', [[58, 114, 4]], 2);
  // Fosa del Abismo: una concha gigante en la plataforma de la Bestia
  resource('concha_fosa', 'concha_gigante', [[P.fosa.x - 6, P.fosa.y + 1, 3]], 1, (t) => t === 'basalto');

  // la Bajada queda abierta
  for (let y = 0; y <= 7; y++) for (let x = P.entry.x - 4; x <= P.entry.x + 5; x++) { put(objects, x, y, 0); put(above, x, y, 0); }
  placePort();
  placeCoralia();
  placeGrid('portal_arrecife', 3, 3, P.portal.x - 1, P.portal.y - 2);

  // ---------------------------------------------------------------- puntos (en coordenadas de la zona, px)
  pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
  // escondites de exploración (gprback/lib/exploracion.js SECRETS): el islote del este de las Rocas (con
  // la marea baja), la bodega del barco hundido del Cementerio y la cueva del fondo de la Cala
  for (const [name, x, y] of [['secreto_islote', 93, 90], ['secreto_bodega', 24, 98], ['secreto_cueva_cala', 12, 6]]) pt({ name, type: 'secreto', x: px(x), y: px(y) });
  // el Arrecife Hundido (zona propia, ver generar_arrecife.js): se pisa la casilla del medio de abajo del portal
  pt({ name: 'entrada_arrecife', type: 'salida', x: px(P.portal.x), y: px(P.portal.y), width: 32, height: 32, properties: [
    prop('destino', 'string', 'arrecife'), prop('x', 'int', 20), prop('y', 'int', 4), prop('etiqueta', 'string', 'El Arrecife Hundido')] });
  // jefes: el Almirante Ahogado en el fondeadero del Cementerio (donde atraca el barco sin bandera) y
  // la Bestia de las Profundidades, encadenada en la plataforma de la Fosa
  const nearFree = (cx, cy) => {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (free(x, y) && free(x, y - 1) && okGround(x, y)) return [x, y];
    }
    throw new Error(`no hay lugar libre cerca de ${cx},${cy}`);
  };
  const [ax, ay] = nearFree(P.fondeadero.x, P.fondeadero.y);
  pt({ name: 'fondeadero_almirante', type: 'jefe', x: px(ax), y: px(ay), properties: [
    prop('monstruo', 'string', 'ALMIRANTE_AHOGADO'), prop('nivel', 'int', 57), prop('etiqueta', 'string', 'Desafiar al Almirante Ahogado')] });
  const [bx, by] = nearFree(P.fosa.x + 3, P.fosa.y);
  pt({ name: 'fosa_bestia', type: 'jefe', x: px(bx), y: px(by), properties: [
    prop('monstruo', 'string', 'BESTIA_PROFUNDIDADES'), prop('nivel', 'int', 60), prop('etiqueta', 'string', 'Desafiar a la Bestia de las Profundidades')] });
  console.log('Jefes:', `Almirante ${ax},${ay}`, '·', `Bestia ${bx},${by}`);
  // NPCs (sus diálogos están en src/game/dialoguesCostas.js; sus casas, en gprback/lib/questSteps.js).
  // Cada uno vive donde tiene sentido según su historia (zona4_costas.md, sección 9). fase: cuándo se
  // ve según la historia de cada jugador (game/story.js)
  const npc = (name, nombre, x, y, pasea = 1, fase = null, sprite = `npc_${name}`) => pt({ name, type: 'npc', x: px(x) + 16, y: px(y) + 16, properties: [
    prop('nombre', 'string', nombre), prop('sprite', 'string', sprite), prop('dialogo', 'string', name),
    prop('etiqueta', 'string', `Hablar con ${nombre.split(',')[0]}`), prop('pasea', 'int', pasea), ...(fase ? [prop('fase', 'string', fase)] : [])] });
  // el Puerto Antiguo
  npc('bastida', 'Osvaldo Bastida, capitán del puerto', 112, 40, 1);
  npc('tilo_puerto', 'Tilo, soldado del puerto', 136, 45, 1, 'COSTAS_HISTORIA_01_BAJADA@empezada,!COSTAS_HISTORIA_01_BAJADA@3-', 'npc_tilo_soldado'); // llega con la C1 (antes está en el Bastión) y mientras te busca o te escolta no está en su puesto
  npc('brea', 'Brea, carpintera de ribera', 130, 58, 1);
  npc('almeja', 'Doña Almeja, cocinera', 106, 58, 1);
  npc('mercader_puerto', 'Salitre, mercader', 112, 48, 0, null, 'npc_salitre');
  npc('gaspar_costas', 'Gaspar, cochero', 137, 61, 1, 'COSTAS_HISTORIA_01_BAJADA', 'npc_cochero');
  // Rhaegar: en su Cala, preso en la capitanía (C4-C9) y, con la alianza, en el muelle
  npc('rhaegar', 'Capitán Rhaegar', 26, 12, 1, '!COSTAS_Q1_CAZADOR_PIRATAS');
  npc('rhaegar_preso', 'Capitán Rhaegar, preso', 116, 39, 0, 'COSTAS_Q1_CAZADOR_PIRATAS,!COSTAS_HISTORIA_09_ALIANZA', 'npc_rhaegar');
  npc('rhaegar_puerto', 'Capitán Rhaegar', 138, 41, 1, 'COSTAS_HISTORIA_09_ALIANZA', 'npc_rhaegar');
  // Anka, la pirata: en la Cala; después de «Amor entre bandos», en el muelle con Tilo
  npc('anka', 'Anka, pirata', 29, 16, 2, '!COSTAS_SEC_AMOR_3@2,!COSTAS_SEC_AMOR_3');
  npc('anka_puerto', 'Anka, pirata', 138, 43, 1, 'COSTAS_SEC_AMOR_3', 'npc_anka');
  // Coralia: Nerea en su palafito, Marul en el muelle de los botes, Nácar en su taller, Ondina jugando
  npc('nerea', 'Nerea, la Anciana Cantora', 147, 39, 1);
  npc('marul', 'Marul, barquero', 145, 62, 1);
  // los primos de Marul atienden los otros dos muelles de los botes (gprback/lib/botes.js), cada uno con su bote
  npc('barquero_cala', 'Sargo, barquero', 18, 22, 0, null, 'npc_marul'); put(objects, 16, 22, T.bote);
  npc('barquero_cementerio', 'Bagre, barquero', 50, 111, 0, null, 'npc_marul'); put(objects, 52, 113, T.bote);
  npc('nacar', 'Nácar, orfebre', 149, 48, 1);
  npc('ondina', 'Ondina', 143, 58, 3);
  // los de afuera: Cieno en su choza del manglar y Bartolo al pie de su faro
  npc('cieno', 'Cieno, pescador', P.choza.x, P.choza.y + 1, 1);
  npc('bartolo', 'Bartolo, farero', P.cabana.x, P.cabana.y + 1, 1);
  // escenario que cambia con la historia (game/world/escena.js; arte: art/sprites/mundo/crear_escena_costas.lua)
  const escena = (name, sprite, x, y, w, h, fase, extra = []) => pt({ name, type: 'escena', x: px(x), y: px(y), properties: [
    prop('sprite', 'string', sprite), prop('fase', 'string', fase), prop('ancho', 'int', w), prop('alto', 'int', h), ...extra] });
  escena('barricada_almacenes', 'barricada', 129, 44, 64, 32, '!COSTAS_HISTORIA_02_PUERTO');
  escena('reja_rhaegar', 'reja', 116, 39, 32, 32, 'COSTAS_Q1_CAZADOR_PIRATAS,!COSTAS_HISTORIA_09_ALIANZA', [prop('encima', 'bool', true)]);
  escena('heridos_coralia', 'heridos', 140, 48, 64, 32, '!COSTAS_HISTORIA_06_CORALIA');
  escena('gaviota_cala', 'gaviota_insolente', P.barco.x, P.barco.y, 128, 96, '!COSTAS_HISTORIA_09_ALIANZA');
  escena('gaviota_puerto', 'gaviota_insolente', 148, 61, 128, 96, 'COSTAS_HISTORIA_09_ALIANZA');
  escena('barco_sin_bandera', 'barco_negro', 4, 110, 128, 96, '!COSTAS_HISTORIA_12_BARCO', [prop('cuadros', 'int', 2)]);
  escena('mastil_hundido', 'mastil_hundido', 7, 112, 32, 64, 'COSTAS_HISTORIA_12_BARCO');
  escena('luz_negra_faro', 'luz_negra', P.faro.x, P.faro.y - 1, 64, 32, '!COSTAS_HISTORIA_13_FARO', [prop('cuadros', 'int', 2), prop('encima', 'bool', true)]);
  escena('luz_faro', 'luz_faro', P.faro.x, P.faro.y - 1, 64, 32, 'COSTAS_SEC_FARO_2', [prop('cuadros', 'int', 2), prop('encima', 'bool', true)]);
  pt({ name: 'enfermeria_puerto', type: 'poi', x: px(115), y: px(43), properties: [prop('etiqueta', 'string', 'Brasero del Puerto — Enfermería'), prop('ventana', 'string', 'enfermeria')] });
  // luces de noche: faroles del puerto, lámparas de medusa, fogatas (refugios) y la luz del faro
  lights.forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
  // zonas de encuentro (los monstruos se ven caminando en su grupo; el pasto solo dispara si
  // COMBATES_LISTOS)
  encounterAreas.forEach((a) => pt({
    name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
    properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', Math.max(3, Math.round((a.w * a.h) / 22)))],
  }));

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
        properties: [prop('zona', 'int', 4)],
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
    nombre: 'Costas Muertas', zona: 4, musica: 'costas', tileset: 'pradera', terrenos: TERRENOS, tile: 32, chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
    encuentroHierba: COMBATES_LISTOS ? 0.06 : 0, gidHierba: T.hierba_salada,
    inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
    clima: { estacion: 'verano', lluvia: 0.2, nieve: 0, bruma: 0.35 },
    // tiles que usa la fauna del ambiente: pájaros en la arena y las palmeras; nada de patos en el mar
    gids: {
      flores: [],
      agua: [],
      prado: [T.arena, T.arena_conchas, T.pastoc_15].filter(Boolean),
      arboles: [T.palmera_0_0, T.palmera_0_1],
      dorados: [],
      seco: [],
    },
    chunks,
    subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
  };
  fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
  fs.writeFileSync(path.join(__dirname, 'recursos_costas.json'), JSON.stringify(resourceDefs, null, 1));
  // los recursos de la zona 4 en el back (el editor de mapas reescribe este archivo al guardar)
  const nodesFile = path.join(__dirname, '../../../gprback/lib/worldNodes.zonas.json');
  if (fs.existsSync(nodesFile)) {
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes['4'] = Object.fromEntries(resourceDefs.map((r) => [r.id, { tipo: r.tipo, sitios: r.spots }]));
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 1));
  }

  if (process.argv.includes('--preview')) {
    // capas de tiles enteras (para la vista previa renderizada con Aseprite)
    fs.writeFileSync(path.join(__dirname, 'costas_preview.json'), JSON.stringify({ w: W, h: H, ground, objects, above }));
  }
  console.log(`Costas generadas: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
  console.log('Encuentros:', encounterAreas.length, '·', Object.keys(POBLAR).map((z) => `${z} ${encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === z).length}`).join(', '));
  console.log('Recursos:', resourceDefs.map((r) => `${r.id}(${r.spots})`).join(' '));
  console.log('Pasos abiertos al norte (casillas x de la fila 0 sin pared):', [...Array(W).keys()].filter((x) => at(x, 0) !== 'carav').join(','));
}
main().catch((e) => { console.error(e); process.exit(1); });
