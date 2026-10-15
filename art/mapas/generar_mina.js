// Genera LA MINA PROFUNDA, la mazmorra bajo las Minas Abandonadas (Montañas Grises), como una zona
// fuera del continente de 1x2 trozos de 40x30 tiles (public/assets/mundo/mina_profunda/), con su propio
// tileset (tileset_mina, ver art/sprites/mundo/crear_mina.lua). Mismo recorrido que la Cripta del Vigía
// (el motor es el molde de gprback/lib/mazmorra.js):
//   Entrada (escaleras de salida y 1er farol) → Galería de las Vagonetas (dos Mineros Poseídos que
//   patrullan de lado a lado) → Pozo de Cristal (2º farol y el Gólem de Veta que da vueltas) → Reja del
//   Sello (cerrada hasta vencer a los tres guardianes) → Cámara del Sello (el Gólem de Hierro Negro y,
//   detrás, el Segundo Sello agrietado).
//
// Las casillas de faroles, guardianes, reja y jefe están repetidas en gprback/lib/mina.js (el servidor
// comprueba que estés cerca), y la del Sello en la misión «La Mina Profunda» (M6): si mueves algo aquí,
// muévelo allá también.
//
// Uso: node art/mapas/generar_mina.js   (no pisa la mina si ya se editó; --forzar para hacerlo)
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/mina_profunda');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('La mina ya se editó con el editor de mapas: no la piso. Usa --forzar para regenerarla igual.');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_mina.json');
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const META = Object.fromEntries(TILESET.tiles.map((t) => [t.id + 1, t]));
const TERRENOS = ['suelo', 'muro', 'rieles', 'sello', 'escalera'];

const CW = 40;
const CH = 30;
const COLS = 1;
const ROWS = 2;
const W = CW * COLS;
const H = CH * ROWS;
const px = (t) => t * 32;
const prop = (name, type, value) => ({ name, type, value });

let seed = 2207;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------------------------------------------------------------- terreno lógico
const terrain = Array.from({ length: H }, () => new Array(W).fill('muro'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : 'muro');
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrain[y][x] = t; };
const floor = (t) => t !== 'muro';

rectT(13, 3, 26, 11, 'suelo'); // Entrada
rectT(18, 3, 21, 3, 'escalera'); // escaleras de vuelta a las Minas Abandonadas
rectT(18, 12, 21, 19, 'suelo'); // túnel
rectT(19, 12, 20, 19, 'rieles');
rectT(4, 20, 35, 33, 'suelo'); // Galería de las Vagonetas
rectT(4, 26, 35, 27, 'rieles');
rectT(18, 34, 21, 38, 'suelo'); // túnel
rectT(19, 34, 20, 38, 'rieles');
rectT(9, 39, 30, 46, 'suelo'); // Pozo de Cristal
rectT(18, 47, 21, 48, 'suelo'); // hueco de la Reja del Sello
rectT(7, 49, 32, 58, 'suelo'); // Cámara del Sello
rectT(14, 53, 25, 58, 'sello');
rectT(28, 49, 29, 49, 'escalera'); // subida a las Minas Abandonadas (al vencer al Gólem)

// ---------------------------------------------------------------- capas
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H && gid) layer[y * W + x] = gid; };
const points = [];
const pt = (o) => points.push(o);

// suelo y paredes: la pared con suelo debajo muestra su cara de roca; el resto es techo
const torches = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'muro') {
      if (floor(at(x, y + 1))) {
        const torch = x % 6 === 2 && floor(at(x - 1, y + 1)) && floor(at(x + 1, y + 1));
        const pozo = y >= 38 && y <= 46;
        const r = rand();
        gid = torch ? T.pared_farol : pozo && r < 0.35 ? T.pared_cristal : r < 0.2 ? T.pared_veta : T.pared;
        if (torch) torches.push([x, y]);
      } else gid = T.techo;
    } else if (t === 'escalera') gid = T.escalera;
    else if (t === 'rieles') gid = (x >= 18 && x <= 21 && (y < 20 || y > 33)) ? T.rieles_v : T.rieles_h;
    else if (t === 'sello') gid = T.piso_sello;
    else if (at(x, y - 1) === 'muro') gid = T.sombra;
    else {
      const r = rand();
      const pozo = y >= 39 && y <= 46;
      gid = pozo && r < 0.12 ? T.grieta_negra : r < 0.08 ? T.suelo_grava : r < 0.11 ? T.suelo_charco : T.suelo;
    }
    put(ground, x, y, gid);
  }
}

const freeAt = (x, y) => floor(at(x, y)) && !objects[y * W + x] && !above[y * W + x];
const viga = (x, y) => { put(above, x, y, T.viga_0_0); put(objects, x, y + 1, T.viga_1_0); };
const deco = (name, x, y) => { if (freeAt(x, y)) put(objects, x, y, T[name]); };

// Entrada
viga(14, 4); viga(25, 4);
deco('barril', 13, 10); deco('caja', 26, 10); deco('pila_mineral', 25, 8);
// Galería: vigas fuera de los carriles de los mineros (filas 24 y 29) y de los rieles (26-27)
for (const x of [7, 12, 27, 32]) { viga(x, 21); viga(x, 31); }
deco('vagoneta', 5, 20); deco('vagoneta', 34, 20); deco('pila_mineral', 5, 33); deco('pila_mineral', 34, 33);
deco('barril', 16, 20); deco('caja', 23, 20); deco('barril', 17, 33); deco('caja', 22, 33);
// Pozo de Cristal
deco('pila_mineral', 9, 39); deco('pila_mineral', 30, 39); deco('barril', 9, 46); deco('caja', 30, 46);
deco('vagoneta', 19, 43); deco('pila_mineral', 20, 43);
// Cámara del Sello: el Segundo Sello (2x2) detrás del Gólem
for (const y of [50, 55]) { viga(9, y); viga(30, y); }
put(above, 19, 55, T.sello_0_0); put(above, 20, 55, T.sello_0_1);
put(objects, 19, 56, T.sello_1_0); put(objects, 20, 56, T.sello_1_1);
deco('barril', 7, 58); deco('caja', 32, 58);

// ---------------------------------------------------------------- puntos
const KEY = { brasero: [], guardian: [] };
// escaleras de salida: vuelven a la puerta de la Mina Profunda en las Minas Abandonadas (casilla 22,10)
pt({ name: 'salida_minas', type: 'salida', x: px(18), y: px(3), width: 128, height: 32, properties: [prop('destino', 'string', 'montanas'), prop('x', 'int', 22), prop('y', 'int', 10), prop('etiqueta', 'string', 'Minas Abandonadas')] });
pt({ name: 'salida_sello', type: 'salida', x: px(28), y: px(49), width: 64, height: 32, properties: [prop('destino', 'string', 'montanas'), prop('x', 'int', 22), prop('y', 'int', 10), prop('etiqueta', 'string', 'Minas Abandonadas')] });
// faroles de control (orden 1 y 2): al encenderlos, si caes o sales, retomas desde ahí
const farol = (orden, x, y, nombre) => { KEY.brasero.push({ orden, x, y }); pt({ name: `brasero_${orden}`, type: 'brasero', x: px(x), y: px(y), properties: [prop('orden', 'int', orden), prop('etiqueta', 'string', nombre)] }); };
farol(1, 16, 7, 'Farol de la Entrada');
farol(2, 12, 40, 'Farol del Pozo');
// guardianes con su ronda (casillas separadas por ";", van y vuelven o dan la vuelta)
const guardian = (id, monstruo, ruta, vuelta = false) => {
  const [x, y] = ruta[0];
  KEY.guardian.push({ id, ruta });
  pt({ name: id, type: 'guardian', x: px(x) + 16, y: px(y) + 16, properties: [prop('monstruo', 'string', monstruo), prop('ruta', 'string', ruta.map((p) => p.join(',')).join(';')), prop('vuelta', 'bool', vuelta)] });
};
guardian('minero_norte', 'MINA_MINERO', [[5, 24], [34, 24]]);
guardian('minero_sur', 'MINA_MINERO', [[34, 29], [5, 29]]);
guardian('golem_pozo', 'MINA_GOLEM_VETA', [[11, 41], [28, 41], [28, 45], [11, 45]], true);
// Reja del Sello (4x2 casillas) y el jefe delante del Sello
pt({ name: 'reja_sello', type: 'sello', x: px(18), y: px(47), width: 128, height: 64, properties: [] });
pt({ name: 'golem_negro', type: 'vigia', x: px(19) + 32, y: px(52) + 16, properties: [prop('monstruo', 'string', 'MINA_GOLEM_NEGRO'), prop('etiqueta', 'string', 'El Gólem de Hierro Negro')] });
// luces: faroles de las paredes y el brillo azul del Sello
torches.forEach(([x, y], i) => pt({ name: `farol_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 14, properties: [prop('tipo', 'string', 'antorcha')] }));
pt({ name: 'luz_sello', type: 'luz', x: px(20), y: px(55), properties: [prop('tipo', 'string', 'pilar')] });

const subzones = [
  { name: 'Entrada', x0: 13, y0: 3, x1: 26, y1: 19 },
  { name: 'Galería de las Vagonetas', x0: 4, y0: 20, x1: 35, y1: 38 },
  { name: 'Pozo de Cristal', x0: 9, y0: 39, x1: 30, y1: 48 },
  { name: 'Cámara del Sello', x0: 7, y0: 49, x1: 32, y1: 58 },
  { name: 'La Mina Profunda', x0: 0, y0: 0, x1: W - 1, y1: H - 1 },
].map((s, i) => ({ ...s, levels: i === 4 ? null : '18-24' }));

// ---------------------------------------------------------------- partir en trozos
fs.mkdirSync(outDir, { recursive: true });
const terrainCodes = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) terrainCodes.push(Math.max(0, TERRENOS.indexOf(terrain[y][x])));
const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: CW, height: CH, data });
const tilesetRef = {
  firstgid: 1, name: 'mina', image: '../tileset_mina.png', imagewidth: TILESET.columns * 32,
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
// las capas "encima" se ven por arriba del héroe: comprobación rápida de que no se usó un tile de choque ahí
for (const gid of above) if (gid && META[gid]?.colision) throw new Error(`tile de choque en "encima": ${META[gid].nombre}`);

const world = {
  // zona 2: el servidor la trata como parte de las Montañas (misiones, bestiario); interior = sin cielo
  nombre: 'La Mina Profunda', zona: 2, interior: true, mazmorra: 'mina_profunda', musica: 'cripta', tileset: 'mina', terrenos: TERRENOS, tile: 32,
  // arte propio del farol de control y de la reja (public/assets/mundo/mazmorra, art/sprites/mundo/crear_mina.lua)
  mazmorraArte: { brasero: 'farol', puerta: 'reja_sello', luzPuerta: 0x9ae8ff },
  chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0, gidHierba: 0,
  inicio: { x: px(19) + 32, y: px(6) + 16 },
  clima: { estacion: 'interior', lluvia: 0 },
  gids: { flores: [], agua: [], prado: [], arboles: [], dorados: [], seco: [] },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
console.log(`Mina Profunda generada: ${W}x${H} tiles en ${chunks.length} trozos, ${points.length} puntos → ${outDir}`);
console.log(JSON.stringify(KEY));
