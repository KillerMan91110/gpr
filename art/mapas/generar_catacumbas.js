// Genera las CATACUMBAS DEL ABISMO (zona 6) como un mundo de 4x4 trozos de 40x30 tiles, igual que la
// Tundra, pero bajo tierra y FUERA del continente (no va en etheria.json; interior: true):
//   public/assets/mundo/catacumbas/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/catacumbas/mundo.json            (índice: trozos, subzonas, inicio)
// Se entra por la escalera sellada del fondo de la Cripta Congelada (se abre al terminar la T14, cualquiera
// de las dos) y, más adelante, por la cripta sellada de la Catedral de Aurelia (A5). Diseño completo en
// gprback/docs/zona6_catacumbas.md.
//
// Diseño (norte arriba): arriba, la Sala del Sexto Sello (oeste), la Biblioteca Prohibida, el Abismo de
// las Almas y la Escalera Helada (este, por donde se llega). En medio, la Antesala del Trono (con la
// entrada del Trono de Huesos), el Santuario Profanado, Vela Eterna (la ciudad de los Velados) y el
// Osario de los Reyes. Abajo, el Río de las Almas, el Jardín de Hongos, los Nichos de los Sacerdotes y
// la Galería de las Máscaras; al sur, el Lago Negro y la Cripta de la Catedral (la subida a Aurelia).
//
// Bajo tierra todo empieza siendo pared: se tallan las salas (una caverna por trozo, con borde irregular)
// y las galerías que las unen; después van el agua, el abismo, los hongos y los huesos. Las casillas del
// suelo salen de las MISMAS reglas que el editor de mapas (src/editor/rules.js).
//
// Uso: node art/mapas/generar_catacumbas.js   (con --preview además deja catacumbas_preview.json)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

// Lo que ya está, por tandas (ver zona6_catacumbas.md): los combates y los jefes (tanda 2).
const COMBATES_LISTOS = true;

const outDir = path.join(__dirname, '../../public/assets/mundo/catacumbas');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('Las Catacumbas ya se editaron con el editor de mapas: no las piso. Usa --forzar para regenerarlas igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico de esta zona (el editor arma los bordes con ellos, ver src/editor/rules.js)
const TERRENOS = ['losac', 'muroc', 'tierrac', 'huesosc', 'hongos', 'aguan', 'rioalma', 'osario', 'losavel', 'puentec', 'muellec',
  'abismo', 'colgante'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261020;
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
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

// ---------------------------------------------------------------- terreno lógico
const terrain = Array.from({ length: H }, () => new Array(W).fill('muroc'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : null);
const setT = (x, y, t) => { if (x >= 2 && x < W - 2 && y >= 2 && y < H - 2) terrain[y][x] = t; };
const setAny = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) terrain[y][x] = t; };
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

// sitios importantes (en tiles; las casillas de NPCs, forja, muelles, jefes y las salidas se repiten en el
// back: lib/cercania.js, lib/questSteps.js y lib/exploracion.js). Los NPCs de las misiones van en la
// tanda 4; sus casas ya quedan pensadas aquí (zona6_catacumbas.md, sección 9).
const P = {
  // Vela Eterna: la Gran Vela en el medio de la plaza, la forja de Osmund, la casa de Ilse, los
  // mausoleos de los Velados, el puesto de Hollin y el muelle del barquero
  granVela: { x: 99, y: 38 }, plaza: { x: 100, y: 44 }, spawn: { x: 100, y: 47 },
  forja: { x: 85, y: 33 }, ilse: { x: 112, y: 33 }, puesto: { x: 107, y: 46 }, muelle: { x: 100, y: 52 },
  // las dos subidas: a la Cripta Congelada (Escalera Helada) y a Aurelia (la cripta de la Catedral)
  escaleraHelada: { x: 139, y: 1 }, escaleraCatedral: { x: 145, y: 97 },
  // afuera
  trono: { x: 19, y: 34 }, sello: { x: 20, y: 14 }, altar: { x: 59, y: 43 }, biblioteca: { x: 60, y: 15 },
  abismo: { x: 100, y: 15 }, osario: { x: 140, y: 45 }, galeria: { x: 140, y: 75 }, nichos: { x: 100, y: 75 },
  jardin: { x: 60, y: 75 }, rio: { x: 20, y: 75 }, lago: { x: 40, y: 105 }, criptaCat: { x: 120, y: 108 },
};

// 1) las salas: una caverna por trozo (el centro con algo de ruido, el borde irregular)
const ROOMS = [
  // [cx, cy, rx, ry]
  [20, 14, 15, 10], [60, 15, 16, 10], [100, 15, 16, 10], [140, 15, 14, 10],
  [20, 45, 15, 10], [60, 45, 15, 10], [140, 45, 15, 11],
  [20, 75, 15, 11], [60, 75, 16, 11], [100, 75, 15, 10], [140, 75, 15, 10],
];
ROOMS.forEach(([cx, cy, rx, ry], i) => {
  blobT(cx, cy, rx, ry, 'losac', 0.45, 100 + i, ['muroc']);
  rectT(cx - Math.round(rx * 0.6), cy - Math.round(ry * 0.6), cx + Math.round(rx * 0.6), cy + Math.round(ry * 0.6), 'losac');
});
// Vela Eterna: una caverna grande y casi cuadrada (la ciudad)
rectT(84, 32, 116, 56, 'losac');
blobT(100, 44, 19, 14, 'losac', 0.3, 120, ['muroc']);
// la Biblioteca Prohibida es una sala recta (los Velados la construyeron, no es una cueva)
rectT(44, 5, 76, 25, 'losac');
// el Lago Negro (los dos trozos de abajo a la izquierda) y la Cripta de la Catedral (los dos de la derecha)
blobT(40, 105, 34, 11, 'losac', 0.4, 130, ['muroc']);
rectT(86, 101, 154, 115, 'losac');
blobT(120, 108, 34, 8, 'losac', 0.35, 131, ['muroc']);
// la Escalera Helada llega por arriba: un pasillo corto hasta la sala
rectT(138, 3, 142, 8, 'losac');
// la subida a Aurelia: un nicho al norte de la Cripta de la Catedral
rectT(144, 99, 148, 101, 'losac');

// 2) lo que hay en cada sala (antes de las galerías: las galerías que cruzan agua o abismo ponen puentes)
// el Abismo de las Almas: grietas sin fondo que se cruzan por puentes colgantes
stroke([[86, 6], [94, 12], [102, 16], [110, 22], [116, 20]], 1, 'abismo', ['losac'], 0.6);
stroke([[96, 22], [104, 10], [108, 6]], 1, 'abismo', ['losac'], 0.5);
// el Río de las Almas baja de norte a sur por su sala
stroke([[14, 62], [16, 68], [22, 74], [24, 80], [20, 88]], 1, 'rioalma', ['losac'], 0.8);
// el Lago Negro: el agua quieta, con dos islotes
blobT(40, 106, 27, 7, 'aguan', 0.35, 141, ['losac']);
blobT(30, 107, 3, 2, 'losac', 0.2, 142, ['aguan']);
blobT(52, 104, 2, 2, 'losac', 0.2, 143, ['aguan']);
// el estanque del barquero en Vela Eterna
rectT(95, 53, 105, 56, 'aguan');
// Jardín de Hongos, Osario de los Reyes, Antesala del Trono y tierra de tumba por todas partes
blobT(P.jardin.x, P.jardin.y, 13, 8, 'hongos', 0.45, 151, ['losac']);
blobT(P.osario.x, P.osario.y + 1, 10, 6, 'tierrac', 0.45, 152, ['losac']);
blobT(P.osario.x, P.osario.y + 1, 7, 4, 'huesosc', 0.4, 153, ['tierrac']);
blobT(P.trono.x + 1, P.trono.y + 12, 11, 6, 'huesosc', 0.45, 154, ['losac']);
blobT(P.altar.x + 1, P.altar.y + 2, 9, 6, 'losavel', 0.2, 155, ['losac']);
blobT(P.sello.x, P.sello.y + 1, 8, 5, 'losavel', 0.15, 156, ['losac']);
rectT(86, 37, 114, 50, 'losavel', ['losac']);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'losac') continue;
  const n = valueNoise(x, y, 6, 161);
  const city = x >= 80 && x < 120 && y >= 30 && y < 60;
  if (!city && n > 0.74) setT(x, y, 'tierrac');
}
// un poco de hongos a la orilla del río y del lago
blobT(26, 70, 3, 2, 'hongos', 0.4, 162, ['losac', 'tierrac']); blobT(14, 84, 3, 2, 'hongos', 0.4, 163, ['losac', 'tierrac']);
blobT(66, 96, 4, 2, 'hongos', 0.4, 164, ['losac', 'tierrac']);

// 3) las galerías que unen las salas (anchas las principales). Sobre el agua o el abismo, puentes
const galleries = [
  [[140, 15], [140, 30], [140, 45]],                    // Escalera Helada → Osario
  [[140, 45], [124, 45], [116, 44]],                    // Osario → Vela Eterna
  [[140, 45], [140, 60], [140, 75]],                    // Osario → Galería de las Máscaras
  [[100, 32], [100, 24], [100, 15]],                    // Vela Eterna → Abismo
  [[100, 56], [96, 62], [100, 75]],                     // Vela Eterna → Nichos
  [[84, 44], [76, 45], [60, 45]],                       // Vela Eterna → Santuario
  [[140, 75], [120, 76], [100, 75]],                    // Galería → Nichos
  [[140, 75], [138, 90], [136, 104]],                   // Galería → Cripta de la Catedral
  [[100, 75], [102, 90], [104, 104]],                   // Nichos → Cripta de la Catedral
  [[100, 75], [80, 74], [60, 75]],                      // Nichos → Jardín
  [[60, 75], [60, 60], [60, 45]],                       // Jardín → Santuario
  [[60, 75], [58, 88], [56, 97]],                       // Jardín → Lago (orilla norte)
  [[20, 75], [40, 76], [60, 75]],                       // Río → Jardín
  [[20, 75], [18, 88], [16, 98]],                       // Río → Lago (orilla oeste)
  [[20, 75], [20, 60], [20, 45]],                       // Río → Antesala del Trono
  [[60, 45], [60, 30], [60, 15]],                       // Santuario → Biblioteca
  [[100, 15], [80, 14], [60, 15]],                      // Abismo → Biblioteca
  [[60, 15], [40, 14], [20, 14]],                       // Biblioteca → Sala del Sexto Sello
  [[20, 45], [20, 30], [20, 14]],                       // Antesala → Sala del Sexto Sello
  [[84, 108], [76, 104], [70, 104]],                    // Cripta de la Catedral → Lago (orilla este)
];
for (const g of galleries) {
  for (let i = 0; i < g.length - 1; i++) {
    const [x1, y1] = g[i];
    const [x2, y2] = g[i + 1];
    const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const cx = Math.round(x1 + (x2 - x1) * f);
      const cy = Math.round(y1 + (y2 - y1) * f);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const t = at(cx + dx, cy + dy);
        if (t === 'muroc') setT(cx + dx, cy + dy, 'losac');
        else if (t === 'abismo') setT(cx + dx, cy + dy, 'colgante');
        else if (t === 'rioalma') setT(cx + dx, cy + dy, 'puentec');
      }
    }
  }
}
// el muelle del barquero en Vela Eterna y en el Lago Negro (orillas norte y oeste)
rectT(P.muelle.x - 1, P.muelle.y, P.muelle.x, 55, 'muellec', ['aguan', 'losavel', 'losac']);
for (let y = 96; y <= 104; y++) for (const x of [56, 57]) if (at(x, y) === 'aguan') setT(x, y, 'muellec');
for (let x = 13; x <= 20; x++) for (const y of [104, 105]) if (at(x, y) === 'aguan') setT(x, y, 'muellec');

// 4) limpieza: puntas de pared sueltas (una casilla de roca entre suelos) se vuelven suelo
for (let pass = 0; pass < 2; pass++) {
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    if (at(x, y) !== 'muroc') continue;
    const n = [at(x, y - 1), at(x + 1, y), at(x, y + 1), at(x - 1, y)].filter((t) => t !== 'muroc').length;
    if (n >= 3) setT(x, y, 'losac');
  }
}
// la pared del borde del mapa, siempre entera
for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) setAny(x, y, 'muroc');
for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) setAny(x, y, 'muroc');
// las dos subidas: la casilla de entrada (centro de abajo del objeto) se pisa; detrás, pared
for (const e of [P.escaleraHelada, P.escaleraCatedral]) {
  rectT(e.x - 1, e.y - 2, e.x + 3, e.y + 1, 'muroc');
  setAny(e.x + 1, e.y + 2, 'losac');
  setAny(e.x + 1, e.y + 3, 'losac'); setAny(e.x, e.y + 3, 'losac'); setAny(e.x + 2, e.y + 3, 'losac');
}
// la entrada del Trono de Huesos (el arco de cráneos) en la pared norte de la Antesala
rectT(P.trono.x - 1, P.trono.y - 4, P.trono.x + 3, P.trono.y, 'muroc');
rectT(P.trono.x - 2, P.trono.y + 2, P.trono.x + 4, P.trono.y + 5, 'huesosc', ['losac', 'tierrac', 'huesosc', 'muroc']);
setAny(P.trono.x + 1, P.trono.y + 1, 'huesosc');

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Vela Eterna', x0: 80, y0: 30, x1: 119, y1: 59, levels: null, safe: true },
  { name: 'Escalera Helada', x0: 120, y0: 0, x1: 159, y1: 29, levels: '76-77' },
  { name: 'Osario de los Reyes', x0: 120, y0: 30, x1: 159, y1: 59, levels: '77-79' },
  { name: 'Galería de las Máscaras', x0: 120, y0: 60, x1: 159, y1: 89, levels: '77-79' },
  { name: 'Cripta de la Catedral', x0: 80, y0: 90, x1: 159, y1: 119, levels: '77-79' },
  { name: 'Nichos de los Sacerdotes', x0: 80, y0: 60, x1: 119, y1: 89, levels: '78-80' },
  { name: 'Jardín de Hongos', x0: 40, y0: 60, x1: 79, y1: 89, levels: '79-81' },
  { name: 'Santuario Profanado', x0: 40, y0: 30, x1: 79, y1: 59, levels: '80-82' },
  { name: 'Lago Negro', x0: 0, y0: 90, x1: 79, y1: 119, levels: '80-83' },
  { name: 'Abismo de las Almas', x0: 80, y0: 0, x1: 119, y1: 29, levels: '81-83' },
  { name: 'Río de las Almas', x0: 0, y0: 60, x1: 39, y1: 89, levels: '82-84' },
  { name: 'Biblioteca Prohibida', x0: 40, y0: 0, x1: 79, y1: 29, levels: '82-84' },
  { name: 'Antesala del Trono', x0: 0, y0: 30, x1: 39, y1: 59, levels: '83-85' },
  { name: 'Sala del Sexto Sello', x0: 0, y0: 0, x1: 39, y1: 29, levels: '84-85' },
  { name: 'Catacumbas del Abismo', x0: 0, y0: 0, x1: 159, y1: 119, levels: '76-85' },
];
const subzoneAt = (x, y) => subzones.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);

// 5) polvo de osario (encuentros) por subzona: pocos grupos y bien poblados (una cripta de gules, un
// nido de arañas, los acólitos del eclipse…). Los monstruos nuevos llegan en la tanda 2.
const encounterAreas = [];
const POBLAR = {
  'Escalera Helada': { n: 2, mons: [['RATA_OSARIO', 'RATA_OSARIO'], ['RATA_OSARIO', 'MURCIELAGO_VAMPIRO']], names: ['Escalones Rotos', 'Nido de Ratas'] },
  'Osario de los Reyes': { n: 3, mons: [['ESQUELETO_GUERRERO', 'ESQUELETO_GUERRERO'], ['ESQUELETO_GUERRERO', 'ZOMBIE_ANCIANO'], ['ZOMBIE_ANCIANO', 'RATA_OSARIO']], names: ['Tumbas Reales', 'Pilas de Huesos', 'Guardia de los Reyes'] },
  'Galería de las Máscaras': { n: 3, mons: [['MURCIELAGO_VAMPIRO', 'MURCIELAGO_VAMPIRO'], ['ESQUELETO_GUERRERO', 'MURCIELAGO_VAMPIRO'], ['ESQUELETO_GUERRERO', 'ESQUELETO_GUERRERO']], names: ['Las Máscaras', 'Techo de Murciélagos', 'Pasillo de Columnas'] },
  'Cripta de la Catedral': { n: 3, mons: [['RATA_OSARIO', 'ZOMBIE_ANCIANO'], ['ZOMBIE_ANCIANO', 'ZOMBIE_ANCIANO'], ['ARANA_TUMBA', 'RATA_OSARIO']], names: ['Ataúdes Abiertos', 'Sótano de los Obispos', 'Telarañas'] },
  'Nichos de los Sacerdotes': { n: 3, mons: [['ZOMBIE_ANCIANO', 'ARANA_TUMBA'], ['ARANA_TUMBA', 'ARANA_TUMBA'], ['ZOMBIE_ANCIANO', 'ESQUELETO_GUERRERO']], names: ['Nichos Saqueados', 'Nido de Arañas', 'Los Que Rezan'] },
  'Jardín de Hongos': { n: 3, mons: [['HONGO_PALIDO', 'HONGO_PALIDO'], ['HONGO_PALIDO', 'ARANA_TUMBA'], ['HONGO_PALIDO', 'GUSANO_CRIPTA']], names: ['Sombreros Pálidos', 'Esporas', 'Raíces del Gusano'] },
  'Santuario Profanado': { n: 2, mons: [['FANTASMA_ENCADENADO', 'GUL_HAMBRIENTO'], ['FANTASMA_ENCADENADO', 'FANTASMA_ENCADENADO']], names: ['Las Cadenas', 'Altar Roto'] },
  'Lago Negro': { n: 3, mons: [['GUL_HAMBRIENTO', 'GUL_HAMBRIENTO'], ['GUL_HAMBRIENTO', 'FANTASMA_ENCADENADO'], ['GUL_HAMBRIENTO', 'GUSANO_CRIPTA']], names: ['Orilla de los Gules', 'Aguas Quietas', 'Cueva del Gusano'] },
  'Abismo de las Almas': { n: 3, mons: [['ALMA_EN_PENA', 'CADAVER_REANIMADO'], ['CADAVER_REANIMADO', 'CADAVER_REANIMADO'], ['ALMA_EN_PENA', 'ALMA_EN_PENA']], names: ['Borde del Abismo', 'Los que Cayeron', 'Lamentos'] },
  'Río de las Almas': { n: 3, mons: [['ALMA_EN_PENA', 'ALMA_EN_PENA'], ['ALMA_EN_PENA', 'CADAVER_REANIMADO'], ['CADAVER_REANIMADO', 'GUL_HAMBRIENTO']], names: ['Vado de las Almas', 'Orilla Fría', 'Remanso'] },
  'Biblioteca Prohibida': { n: 3, mons: [['SACERDOTE_MALDITO', 'SACERDOTE_MALDITO'], ['SACERDOTE_MALDITO', 'INQUISIDOR_ECLIPSE'], ['INQUISIDOR_ECLIPSE', 'ALMA_EN_PENA']], names: ['Sala de Lectura', 'Libros Encadenados', 'Los Copistas'] },
  'Antesala del Trono': { n: 3, mons: [['INQUISIDOR_ECLIPSE', 'CABALLERO_SIN_ROSTRO'], ['INQUISIDOR_ECLIPSE', 'INQUISIDOR_ECLIPSE'], ['INQUISIDOR_ECLIPSE', 'SACERDOTE_MALDITO']], names: ['Guardia del Trono', 'Campamento del Eclipse', 'Huesos Rotos'] },
  'Sala del Sexto Sello': { n: 2, mons: [['INQUISIDOR_ECLIPSE', 'CABALLERO_SIN_ROSTRO'], ['CABALLERO_SIN_ROSTRO', 'INQUISIDOR_ECLIPSE']], names: ['Círculo del Sello', 'Los Últimos Fieles'] },
};
const AREA_BAD = ['muroc', 'aguan', 'rioalma', 'abismo', 'colgante', 'puentec', 'muellec', 'losavel'];
const AREA_LAND = ['losac', 'tierrac', 'huesosc', 'hongos'];
// lugares donde no van grupos de monstruos (la entrada del Trono, el altar, el sello, las subidas, las salas de lectura)
const KEEP_AWAY = [P.trono, P.altar, P.sello, { x: P.escaleraHelada.x + 1, y: P.escaleraHelada.y + 4 }, { x: P.escaleraCatedral.x + 1, y: P.escaleraCatedral.y + 4 }];
const areaFits = (x, y, w, h, zone, minLand) => {
  if (x < 3 || y < 3 || x + w > W - 3 || y + h > H - 2) return false;
  if (subzoneAt(x + w / 2, y + h / 2)?.name !== zone) return false;
  if ([[x, y], [x + w, y + h], [x + w, y], [x, y + h]].some(([a, b]) => subzoneAt(a, b)?.safe)) return false;
  if (KEEP_AWAY.some((k) => Math.abs(k.x - (x + w / 2)) < w / 2 + 5 && Math.abs(k.y - (y + h / 2)) < h / 2 + 4)) return false;
  if (encounterAreas.some((o) => x < o.x + o.w + 5 && o.x < x + w + 5 && y < o.y + o.h + 5 && o.y < y + h + 5)) return false;
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
  let minLand = 0.85;
  const sizes = [[12, 7], [10, 6], [8, 5], [7, 4], [6, 4]];
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
      const score = Math.min(d, 30) + c.w * c.h * 0.05;
      if (score > bestD) { best = c; bestD = score; }
    }
    if (!best && minLand > 0.7) { minLand = 0.7; continue; }
    if (!best) break;
    encounterAreas.push({ name: cfg.names[k % cfg.names.length], ...best, monstruos: cfg.mons[k % cfg.mons.length] });
    k++;
  }
}
// el polvo de osario se pinta sobre las losas, la tierra, los huesos y los hongos
for (const a of encounterAreas) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  for (let y = a.y - 1; y <= a.y + a.h; y++) for (let x = a.x - 1; x <= a.x + a.w; x++) {
    const d = ((x - cx) / (a.w / 2)) ** 2 + ((y - cy) / (a.h / 2)) ** 2;
    const n = valueNoise(x, y, 4, 171);
    if (AREA_LAND.includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 173) > 0.2) setT(x, y, 'osario');
  }
}

// ---------------------------------------------------------------- capas de tiles
async function main() {
  const tmp = path.join(os.tmpdir(), `rules_catacumbas_${process.pid}.mjs`);
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
  Math.random = mathRandom;
  for (const [i, g] of ground.entries()) if (!g) throw new Error(`casilla sin tile en ${i % W},${Math.floor(i / W)} (${terrain[Math.floor(i / W)][i % W]})`);

  // ---------------------------------------------------------------- objetos
  function placeGrid(name, w, h, x, y) {
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const id = T[`${name}_${r}_${c}`];
      if (!id) throw new Error(`falta el tile ${name}_${r}_${c}`);
      const meta = TILESET.tiles[id - 1];
      put(meta.encima ? above : objects, x + c, y + r, id);
    }
  }
  const okGround = (x, y) => ['losac', 'tierrac', 'huesosc', 'hongos', 'losavel'].includes(at(x, y));
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
  const one = (name, x, y, light = null) => {
    if (!T[name]) throw new Error(`falta el tile ${name}`);
    put(objects, x, y, T[name]);
    if (light) lights.push([x, y, light]);
  };
  // las lámparas de alma son los refugios (reapareces ahí si caes): una por subzona
  const lamp = (x, y) => { placeGrid('lampara_alma', 1, 2, x, y); lights.push([x, y, 'fogata']); };

  // Vela Eterna: la Gran Vela, la forja de hueso, la casa de Ilse, los mausoleos, el puesto de Hollin
  function placeTown() {
    placeGrid('gran_vela', 2, 3, P.granVela.x, P.granVela.y);
    placeGrid('forja_hueso', 3, 3, P.forja.x, P.forja.y);
    placeGrid('casa_ilse', 3, 3, P.ilse.x, P.ilse.y);
    placeGrid('mausoleo', 3, 3, 92, 33);
    placeGrid('mausoleo_b', 3, 3, 105, 33);
    placeGrid('mausoleo_b', 3, 3, 86, 49);
    placeGrid('mausoleo', 3, 3, 111, 49);
    placeGrid('puesto_reliquias', 2, 2, P.puesto.x, P.puesto.y);
    placeGrid('estatua_velada', 1, 2, 93, 41); placeGrid('estatua_velada', 1, 2, 106, 41);
    placeGrid('barca', 2, 1, P.muelle.x + 1, 55);
    for (const [x, y] of [[90, 38], [110, 38], [90, 46], [110, 46]]) one('candelabro', x, y, 'farol');
    one('velas', 97, 41, 'farol'); one('velas', 102, 41, 'farol');
    lamp(96, 46); lamp(104, 46);
  }
  placeTown();
  reserve(80, 30, 119, 59);

  // las dos subidas y la entrada del Trono de Huesos
  placeGrid('escalera_helada', 3, 3, P.escaleraHelada.x, P.escaleraHelada.y);
  reserve(P.escaleraHelada.x - 2, P.escaleraHelada.y, P.escaleraHelada.x + 4, P.escaleraHelada.y + 6);
  placeGrid('escalera_catedral', 3, 3, P.escaleraCatedral.x, P.escaleraCatedral.y);
  reserve(P.escaleraCatedral.x - 2, P.escaleraCatedral.y, P.escaleraCatedral.x + 4, P.escaleraCatedral.y + 6);
  placeGrid('portal_trono', 3, 3, P.trono.x, P.trono.y - 1);
  reserve(P.trono.x - 3, P.trono.y - 2, P.trono.x + 5, P.trono.y + 6);
  // el Santuario Profanado: el altar con el eclipse partido, cadenas y cristales de los Ocultos
  placeGrid('altar_profanado', 2, 2, P.altar.x, P.altar.y);
  reserve(P.altar.x - 3, P.altar.y - 2, P.altar.x + 4, P.altar.y + 4);
  for (const [x, y] of [[52, 40], [67, 41], [54, 49], [65, 50]]) if (free(x, y) && okGround(x, y)) one('cadenas', x, y);
  for (const [x, y] of [[50, 44], [69, 46]]) if (free(x, y) && okGround(x, y)) one('cristal_eclipse', x, y);
  // la Sala del Sexto Sello: un círculo de estatuas veladas alrededor del sello
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.round(P.sello.x + Math.cos(a) * 9);
    const y = Math.round(P.sello.y + Math.sin(a) * 6) - 1;
    if (areaFree(x, y, 1, 2)) placeGrid('estatua_velada', 1, 2, x, y);
  }
  reserve(P.sello.x - 10, P.sello.y - 7, P.sello.x + 10, P.sello.y + 7);
  // la Biblioteca Prohibida: filas de estanterías y atriles
  for (const y of [7, 12, 18]) for (let x = 46; x <= 72; x += 6) {
    if (Math.abs(x + 1 - P.biblioteca.x) < 4 || isReserved(x, y)) continue;
    if (areaFree(x, y, 2, 2)) placeGrid('estante_libros', 2, 2, x, y);
  }
  for (const [x, y] of [[49, 23], [56, 23], [66, 23], [72, 23]]) if (free(x, y) && okGround(x, y)) one('atril', x, y);
  for (const [x, y] of [[45, 6], [75, 6], [45, 24], [75, 24]]) if (free(x, y) && okGround(x, y)) one('candelabro', x, y, 'farol');
  // la Galería de las Máscaras: columnas en dos filas y estatuas contra las paredes
  for (let x = 128; x <= 152; x += 6) for (const y of [69, 79]) if (areaFree(x, y, 1, 2)) placeGrid('columna_cat', 1, 2, x, y);
  // los Nichos de los Sacerdotes: lápidas y ataúdes en filas
  for (let x = 90; x <= 110; x += 5) for (const y of [69, 81]) if (free(x, y) && okGround(x, y)) one('lapida_c', x, y);
  for (const x of [92, 107]) if (areaFree(x, 72, 1, 2)) placeGrid('ataud', 1, 2, x, 72);
  // el Osario de los Reyes: sarcófagos de los reyes antiguos y pilas de cráneos
  for (const [x, y] of [[130, 40], [146, 40], [130, 51], [146, 51]]) if (areaFree(x, y, 2, 1)) placeGrid('sarcofago', 2, 1, x, y);
  // el Jardín de Hongos: hongos gigantes
  for (const [x, y] of [[50, 70], [66, 68], [54, 80], [70, 80], [60, 72]]) if (areaFree(x, y, 2, 2, 0, (a, b) => ['hongos', 'losac', 'tierrac'].includes(at(a, b)))) placeGrid('hongo_gigante', 2, 2, x, y);
  // la Cripta de la Catedral: ataúdes de los obispos y sarcófagos
  for (let x = 92; x <= 150; x += 9) if (!isReserved(x, 104) && areaFree(x, 104, 2, 1)) placeGrid('sarcofago', 2, 1, x, 104);
  for (let x = 96; x <= 150; x += 12) if (!isReserved(x, 110) && areaFree(x, 110, 1, 2)) placeGrid('ataud', 1, 2, x, 110);
  // una lámpara de alma (refugio) por subzona
  for (const [x, y] of [[136, 12], [146, 47], [146, 76], [126, 106], [104, 78], [62, 66], [62, 50], [66, 98], [96, 20], [26, 70], [56, 20], [24, 50], [26, 16]]) {
    let spot = null;
    for (let r = 0; r <= 5 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      if (!isReserved(x + dx, y + dy) && areaFree(x + dx, y + dy, 1, 2, 1)) spot = [x + dx, y + dy];
    }
    if (spot) { lamp(spot[0], spot[1]); reserve(spot[0] - 1, spot[1] - 1, spot[0] + 1, spot[1] + 2); }
  }

  // ---------------------------------------------------------------- detalles sueltos
  for (let i = 0; i < 2600; i++) {
    const x = 3 + Math.floor(rand() * (W - 6));
    const y = 3 + Math.floor(rand() * (H - 6));
    if (!free(x, y) || isReserved(x, y) || !okGround(x, y) || at(x, y) === 'losavel') continue;
    const z = subzoneAt(x, y)?.name;
    const wallUp = at(x, y - 1) === 'muroc';
    const r = rand();
    if (r < 0.025 && wallUp) one('telarana', x, y);
    else if (r < 0.04 && ['Osario de los Reyes', 'Antesala del Trono', 'Nichos de los Sacerdotes', 'Cripta de la Catedral'].includes(z)) one('pila_craneos', x, y);
    else if (r < 0.05) one('velas', x, y, 'farol');
    else if (r < 0.06 && ['Nichos de los Sacerdotes', 'Galería de las Máscaras', 'Biblioteca Prohibida'].includes(z)) one('urna', x, y);
    else if (r < 0.085 && ['Jardín de Hongos', 'Lago Negro', 'Río de las Almas'].includes(z)) one('hongo_brillante', x, y);
    else if (r < 0.09 && ['Santuario Profanado', 'Antesala del Trono'].includes(z)) one('cadenas', x, y);
  }
  // las galerías, los puentes, los muelles y el agua siempre libres de decoración suelta
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    const k = y * W + x;
    if (['muroc', 'colgante', 'puentec', 'muellec', 'aguan', 'rioalma', 'abismo'].includes(t) && !isReserved(x, y)) { objects[k] = 0; above[k] = 0; }
  }
  // lo que tiene que quedar sí o sí (por si la limpieza tocó algo)
  placeTown();
  placeGrid('escalera_helada', 3, 3, P.escaleraHelada.x, P.escaleraHelada.y);
  placeGrid('escalera_catedral', 3, 3, P.escaleraCatedral.x, P.escaleraCatedral.y);
  placeGrid('portal_trono', 3, 3, P.trono.x, P.trono.y - 1);

  const px = (n) => n * 32;
  const prop = (name, type, value) => ({ name, type, value });
  const points = [];
  const pt = (o) => points.push(o);

  // ---------------------------------------------------------------- recursos
  // cada uno tiene varios sitios posibles; el servidor elige en cuál reaparece (lib/worldNodes.js del
  // back: el id y la cantidad de sitios tienen que coincidir con gprback/lib/worldNodes.zonas.json)
  const resourceDefs = [];
  const resPoints = [];
  const floorOk = (t) => ['losac', 'tierrac', 'huesosc', 'hongos'].includes(t);
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
  function resource(id, tipo, centers, spots = 3, okFn = floorOk) {
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
  // Escalera Helada, Osario de los Reyes y Galería de las Máscaras: huesos y candelabros
  resource('huesos_escalera', 'pila_huesos', [[138, 16, 8]], 2);
  resource('cera_escalera', 'candelabro_olvidado', [[146, 10, 6]], 2);
  resource('huesos_osario', 'pila_huesos', [[140, 45, 9], [150, 52, 6]], 2);
  resource('sarcofago_osario', 'sarcofago_tesoro', [[154, 38, 3]], 1);
  resource('cera_galeria', 'candelabro_olvidado', [[140, 72, 10]], 2);
  resource('huesos_galeria', 'pila_huesos', [[132, 80, 6]], 1);
  // la Cripta de la Catedral y los Nichos de los Sacerdotes
  resource('huesos_cripta', 'pila_huesos', [[100, 108, 8], [130, 110, 8]], 1);
  resource('cera_cripta', 'candelabro_olvidado', [[115, 104, 8]], 2);
  resource('setas_cripta', 'setas_palidas', [[92, 112, 5]], 1);
  resource('cera_nichos', 'candelabro_olvidado', [[100, 72, 9]], 2);
  resource('huesos_nichos', 'pila_huesos', [[95, 80, 6]], 2);
  resource('setas_nichos', 'setas_palidas', [[108, 82, 5]], 1);
  // el Jardín de Hongos y el Lago Negro
  resource('setas_jardin', 'setas_palidas', [[60, 75, 10], [52, 80, 6]], 2);
  resource('setas_lago', 'setas_palidas', [[64, 98, 6], [14, 96, 5]], 1);
  resource('sarcofago_lago', 'sarcofago_tesoro', [[6, 100, 4]], 1);
  // el Santuario Profanado
  resource('cera_santuario', 'candelabro_olvidado', [[60, 40, 8]], 2);
  resource('sarcofago_santuario', 'sarcofago_tesoro', [[70, 52, 3]], 1);
  // el Abismo, el Río, la Biblioteca, la Antesala y la Sala del Sexto Sello
  resource('plata_abismo', 'veta_plata', [[90, 10, 8], [110, 20, 6]], 2);
  resource('pozo_rio', 'pozo_almas', [[20, 72, 8], [26, 82, 6]], 2);
  resource('setas_rio', 'setas_palidas', [[12, 84, 4]], 1);
  resource('plata_biblioteca', 'veta_plata', [[50, 22, 5], [70, 8, 5]], 1);
  resource('cera_biblioteca', 'candelabro_olvidado', [[60, 22, 8]], 2);
  resource('huesos_antesala', 'pila_huesos', [[20, 48, 8]], 2);
  resource('sarcofago_antesala', 'sarcofago_tesoro', [[8, 50, 3]], 1);
  resource('plata_sello', 'veta_plata', [[10, 20, 5]], 2);
  resource('sarcofago_sello', 'sarcofago_tesoro', [[32, 6, 3]], 1);

  // ---------------------------------------------------------------- puntos (en coordenadas de la zona, px)
  pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
  // NPCs (sus diálogos están en src/game/dialoguesCatacumbas.js; sus casas, en gprback/lib/questSteps.js).
  // fase: cuándo se ve según la historia de cada jugador (game/story.js)
  const npcSpot = (cx, cy, ok = okGround) => {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (free(x, y) && free(x, y - 1) && ok(x, y) && !resPoints.some(([a, b]) => a === x && b === y)) return [x, y];
    }
    throw new Error(`no hay lugar para un NPC cerca de ${cx},${cy}`);
  };
  const npcsPuestos = [];
  const npc = (name, nombre, cx, cy, pasea = 1, fase = null, sprite = `npc_${name}`) => {
    const [x, y] = npcSpot(cx, cy);
    npcsPuestos.push(`${name} ${x},${y}`);
    pt({ name, type: 'npc', x: px(x) + 16, y: px(y) + 16, properties: [
      prop('nombre', 'string', nombre), prop('sprite', 'string', sprite), prop('dialogo', 'string', name),
      prop('etiqueta', 'string', `Hablar con ${nombre.split(',')[0]}`), prop('pasea', 'int', pasea), ...(fase ? [prop('fase', 'string', fase)] : [])] });
  };
  // Vela Eterna
  npc('liora', 'Liora, la Primera Vela', 98, 43, 0, null, 'npc_liora');
  npc('osmund', 'Osmund, el herrero velado', P.forja.x + 2, P.forja.y + 4, 0, null, 'npc_osmund');
  npc('ilse', 'Ilse, la sepulturera', P.ilse.x, P.ilse.y + 4, 1, null, 'npc_ilse');
  npc('mercader_vela', 'Hollin, mercader de reliquias', P.puesto.x + 2, P.puesto.y + 1, 0, null, 'npc_hollin');
  npc('obolo', 'Óbolo, el barquero', P.muelle.x + 2, P.muelle.y - 1, 0, null, 'npc_obolo');
  // las otras dos paradas de la barca de Óbolo (gprback/lib/barca.js): el muelle del Lago Negro y la orilla
  // del Río de las Almas. Es el mismo Óbolo: los muertos no esperan, así que siempre llega antes que tú
  npc('barca_lago', 'Óbolo, el barquero', 58, 95, 0, null, 'npc_obolo');
  npc('barca_rio', 'Óbolo, el barquero', 26, 72, 0, null, 'npc_obolo');
  // Aldren baja después de que abres la puerta de la Catedral (A5); su hijo se queda con él si en la
  // Tundra elegiste el perdón (A11)
  npc('aldren_vela', 'Aldren, anciano sabio', 95, 44, 1, 'CATACUMBAS_HISTORIA_05_CATEDRAL', 'npc_anciano');
  npc('velkan_vela', 'Velkan, el hijo de Aldren', 94, 46, 1, 'CATACUMBAS_HISTORIA_11_PADRE,TUNDRA_HISTORIA_14_PERDON', 'npc_velkan');
  // afuera: Velkan, caído junto al altar (solo en el paso 4 de la A11) y Don Osvaldo en los Nichos
  npc('velkan_herido', 'Velkan, el Encapuchado', P.altar.x + 2, P.altar.y + 4, 0, 'CATACUMBAS_HISTORIA_11_PADRE@4', 'npc_velkan');
  npc('osvaldo', 'Don Osvaldo, el portero', 100, 74, 1, '!CATACUMBAS_SEC_OSVALDO_3', 'npc_osvaldo');
  console.log('NPCs:', npcsPuestos.join(' · '));
  pt({ name: 'enfermeria_vela', type: 'poi', x: px(P.granVela.x + 1), y: px(P.granVela.y + 4), properties: [prop('etiqueta', 'string', 'La Gran Vela — Enfermería'), prop('ventana', 'string', 'enfermeria')] });
  // la subida a la Cripta Congelada: el centro de abajo de la Escalera Helada (vuelve junto a la
  // escalera del fondo de la tumba de la reina, ver generar_cripta_congelada.js)
  pt({ name: 'subida_cripta', type: 'salida', x: px(P.escaleraHelada.x + 1), y: px(P.escaleraHelada.y + 2), width: 32, height: 32, properties: [
    prop('destino', 'string', 'cripta_congelada'), prop('x', 'int', 14), prop('y', 'int', 56), prop('etiqueta', 'string', 'La Cripta Congelada')] });
  // la subida a Aurelia: la cripta de la Catedral, sellada hasta que Elenya la abre (A5)
  pt({ name: 'subida_aurelia', type: 'salida', x: px(P.escaleraCatedral.x + 1), y: px(P.escaleraCatedral.y + 2), width: 32, height: 32, properties: [
    prop('destino', 'string', 'aurelia'), prop('x', 'int', 64), prop('y', 'int', 14), prop('etiqueta', 'string', 'Aurelia'),
    prop('fase', 'string', 'CATACUMBAS_HISTORIA_05_CATEDRAL@3+|CATACUMBAS_HISTORIA_05_CATEDRAL'),
    prop('sellada', 'string', 'Una reja de hierro cierra la escalera. Del otro lado, alguien tendría que abrirla.')] });
  // el Trono de Huesos (mazmorra, generar_trono_huesos.js): el centro de abajo del arco de cráneos. La
  // puerta la cierra el servidor (lib/trono_huesos.js): se abre con la Llave de Hueso de Liora (A8)
  pt({ name: 'entrada_trono_huesos', type: 'salida', x: px(P.trono.x + 1), y: px(P.trono.y + 1), width: 32, height: 32, properties: [
    prop('destino', 'string', 'trono_huesos'), prop('x', 'int', 20), prop('y', 'int', 4), prop('etiqueta', 'string', 'El Trono de Huesos')] });
  // los tres secretos (gprback/lib/exploracion.js SECRETS): la tumba del primer Vigía en el rincón más hondo de
  // la Cripta de la Catedral, el escondite de Velkan en la punta de los Nichos y la barca hundida al final
  // del muelle viejo del Lago Negro
  for (const [name, x, y] of [['secreto_tumba_vigia', 154, 115], ['secreto_escondite_velkan', 116, 72], ['secreto_barca_hundida', 20, 104]]) pt({ name, type: 'secreto', x: px(x), y: px(y) });
  // luces: velas, candelabros, la Gran Vela y las lámparas de alma (refugios)
  lights.forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
  pt({ name: 'luz_gran_vela', type: 'luz', x: px(P.granVela.x + 1), y: px(P.granVela.y) + 12, properties: [prop('tipo', 'string', 'faro')] });
  pt({ name: 'luz_trono', type: 'luz', x: px(P.trono.x + 1) + 16, y: px(P.trono.y) + 16, properties: [prop('tipo', 'string', 'pilar')] });
  // jefes de la historia: el Guardián del Abismo en la galería que baja de la Escalera Helada al Osario,
  // el Archimago en el medio de la Biblioteca, el Centinela de la Muerte en la galería que lleva a la
  // Sala del Sexto Sello y el Lich en el sello
  if (COMBATES_LISTOS) {
    const nearFree = (cx, cy) => {
      for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx; const y = cy + dy;
        if (free(x, y) && free(x, y - 1) && okGround(x, y)) return [x, y];
      }
      throw new Error(`no hay lugar libre cerca de ${cx},${cy}`);
    };
    const jefes = [
      ['puerta_guardian_abismo', 'GUARDIAN_ABISMO', 78, 'Desafiar al Guardián del Abismo', 140, 30],
      ['biblioteca_archimago', 'ARCHIMAGO_CORRUPTO', 82, 'Desafiar al Archimago Corrupto', P.biblioteca.x, P.biblioteca.y],
      ['paso_centinela', 'CENTINELA_MUERTE', 84, 'Desafiar al Centinela de la Muerte', 36, 14],
      ['sello_lich', 'LICH_ANCESTRAL', 85, 'Desafiar al Lich Ancestral', P.sello.x, P.sello.y],
    ];
    const puestos = [];
    for (const [name, code, nivel, etiqueta, cx, cy] of jefes) {
      const [x, y] = nearFree(cx, cy);
      puestos.push(`${code} ${x},${y}`);
      pt({ name, type: 'jefe', x: px(x), y: px(y), properties: [prop('monstruo', 'string', code), prop('nivel', 'int', nivel), prop('etiqueta', 'string', etiqueta)] });
    }
    console.log('Jefes:', puestos.join(' · '));
  }
  // zonas de encuentro (los monstruos se ven caminando en su grupo; el polvo solo dispara si COMBATES_LISTOS)
  if (COMBATES_LISTOS) {
    encounterAreas.forEach((a) => pt({
      name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
      properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', Math.max(3, Math.round((a.w * a.h) / 20)))],
    }));
  }

  // ---------------------------------------------------------------- comprobaciones
  // desde la llegada (la Escalera Helada) se llega caminando a cada subzona y a cada punto
  const walkable = (x, y) => {
    const g = ground[y * W + x];
    const o = objects[y * W + x];
    return !TILESET.tiles[g - 1]?.colision && !(o && TILESET.tiles[o - 1]?.colision);
  };
  const seen = new Uint8Array(W * H);
  const q = [[P.escaleraHelada.x + 1, P.escaleraHelada.y + 3]];
  seen[q[0][1] * W + q[0][0]] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !walkable(nx, ny)) continue;
      seen[ny * W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  const reach = (x, y) => seen[y * W + x] === 1;
  const lost = [];
  for (const s of subzones.slice(0, -1)) {
    let any = false;
    for (let y = s.y0; y <= s.y1 && !any; y++) for (let x = s.x0; x <= s.x1 && !any; x++) any = reach(x, y);
    if (!any) lost.push(s.name);
  }
  for (const [name, x, y] of [['Escalera Catedral', P.escaleraCatedral.x + 1, P.escaleraCatedral.y + 2], ['Trono', P.trono.x + 1, P.trono.y + 1],
    ['Gran Vela', P.granVela.x + 1, P.granVela.y + 4], ['Altar', P.altar.x, P.altar.y + 2], ['Sello', P.sello.x, P.sello.y], ['Muelle', P.muelle.x, 53]]) {
    if (!reach(x, y)) lost.push(name);
  }
  if (lost.length) console.warn('OJO, no se llega caminando a:', lost.join(', '));

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
        properties: [prop('zona', 'int', 6)],
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
    // interior: sin cielo ni clima (la luz la ponen las velas y las lámparas)
    nombre: 'Catacumbas del Abismo', zona: 6, interior: true, musica: 'catacumbas', tileset: 'pradera', terrenos: TERRENOS, tile: 32,
    chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
    encuentroHierba: COMBATES_LISTOS ? 0.06 : 0, gidHierba: T.suelo_osario,
    inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
    clima: { estacion: 'interior', lluvia: 0 },
    // tiles que usa la fauna del ambiente: bajo tierra no hay pájaros ni mariposas
    gids: { flores: [], agua: [], prado: [], arboles: [], dorados: [], seco: [] },
    chunks,
    subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
  };
  fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
  fs.writeFileSync(path.join(__dirname, 'recursos_catacumbas.json'), JSON.stringify(resourceDefs, null, 1));
  // los recursos de la zona 6 en el back (el editor de mapas reescribe este archivo al guardar)
  const nodesFile = path.join(__dirname, '../../../gprback/lib/worldNodes.zonas.json');
  if (fs.existsSync(nodesFile)) {
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes['6'] = Object.fromEntries(resourceDefs.map((r) => [r.id, { tipo: r.tipo, sitios: r.spots }]));
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 1));
  }
  console.log('Recursos:', resourceDefs.length, 'tipos de nodo,', resourceDefs.reduce((a, r) => a + r.spots, 0), 'sitios');

  if (process.argv.includes('--preview')) {
    fs.writeFileSync(path.join(__dirname, 'catacumbas_preview.json'), JSON.stringify({ w: W, h: H, ground, objects, above }));
  }
  console.log(`Catacumbas generadas: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
  console.log('Encuentros:', encounterAreas.length, '·', Object.keys(POBLAR).map((z) => `${z} ${encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === z).length}`).join(', '));
  console.log('Luces:', lights.length, '· refugios:', lights.filter((l) => l[2] === 'fogata').length);
}
main().catch((e) => { console.error(e); process.exit(1); });
