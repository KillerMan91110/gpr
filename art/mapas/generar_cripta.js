// Genera LA CRIPTA DEL VIGÍA, la mazmorra bajo las Ruinas del Vigía (Pradera Dorada), como una
// zona fuera del continente de 1x2 trozos de 40x30 tiles (public/assets/mundo/cripta/), con su
// propio tileset (tileset_cripta, ver art/sprites/mundo/crear_cripta.lua).
//
// Recorrido (norte arriba, se baja hacia el sur):
//   Antesala (escaleras de salida y 1er brasero) → Galería de los Centinelas (dos centinelas que
//   patrullan de lado a lado) → Osario (2º brasero y el espectro que da vueltas) → Puerta del
//   Vigía (sellada hasta vencer a los tres guardianes) → Cámara del Faro (el Vigía Caído).
//
// Las casillas de braseros, guardianes, puerta y jefe están repetidas en gprback/lib/cripta.js
// (el servidor comprueba que estés cerca): si mueves algo aquí, muévelo allá también.
//
// Uso: node art/mapas/generar_cripta.js   (no pisa la cripta si ya se editó; --forzar para hacerlo)
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/cripta');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('La cripta ya se editó con el editor de mapas: no la piso. Usa --forzar para regenerarla igual.');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_cripta.json');
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const META = Object.fromEntries(TILESET.tiles.map((t) => [t.id + 1, t]));
const TERRENOS = ['suelo', 'muro', 'alfombra', 'estrado', 'escalera'];

const CW = 40;
const CH = 30;
const COLS = 1;
const ROWS = 2;
const W = CW * COLS;
const H = CH * ROWS;
const px = (t) => t * 32;
const prop = (name, type, value) => ({ name, type, value });

let seed = 9137;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------------------------------------------------------------- terreno lógico
const terrain = Array.from({ length: H }, () => new Array(W).fill('muro'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : 'muro');
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrain[y][x] = t; };
const floor = (t) => t !== 'muro';

rectT(13, 3, 26, 11, 'suelo'); // Antesala
rectT(18, 3, 21, 3, 'escalera'); // escaleras de vuelta a las ruinas
rectT(18, 12, 21, 19, 'suelo'); // pasillo
rectT(4, 20, 35, 33, 'suelo'); // Galería de los Centinelas
rectT(18, 34, 21, 38, 'suelo'); // pasillo
rectT(9, 39, 30, 46, 'suelo'); // Osario
rectT(18, 47, 21, 48, 'suelo'); // hueco de la Puerta del Vigía
rectT(7, 49, 32, 58, 'suelo'); // Cámara del Faro
rectT(18, 49, 21, 52, 'alfombra');
rectT(15, 53, 24, 56, 'estrado');
rectT(28, 49, 29, 49, 'escalera'); // subida a las ruinas (al vencer al Vigía la puerta se vuelve a sellar)

// ---------------------------------------------------------------- capas
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H && gid) layer[y * W + x] = gid; };
const points = [];
const pt = (o) => points.push(o);

// suelo y paredes: la pared con suelo debajo muestra su cara de ladrillos; el resto es techo
const torches = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'muro') {
      if (floor(at(x, y + 1))) {
        const torch = x % 6 === 2 && floor(at(x - 1, y + 1)) && floor(at(x + 1, y + 1));
        gid = torch ? T.pared_antorcha : rand() < 0.18 ? T.pared_b : T.pared;
        if (torch) torches.push([x, y]);
      } else gid = T.techo;
    } else if (t === 'escalera') gid = T.escalera;
    else if (t === 'alfombra') gid = T.alfombra;
    else if (t === 'estrado') gid = T.estrado;
    else if (at(x, y - 1) === 'muro') gid = T.sombra;
    else {
      const r = rand();
      const osario = y >= 39 && y <= 46;
      gid = osario && r < 0.16 ? T.suelo_huesos : r < 0.08 ? T.suelo_musgo : r < 0.14 ? T.suelo_b : r < 0.17 ? T.grieta : T.suelo;
    }
    put(ground, x, y, gid);
  }
}
// runas alrededor del estrado del Vigía
for (const [x, y] of [[13, 54], [26, 54], [13, 57], [26, 57]]) put(ground, x, y, T.runa);

const freeAt = (x, y) => floor(at(x, y)) && !objects[y * W + x] && !above[y * W + x];
const column = (x, y) => { put(above, x, y, T.columna_0_0); put(objects, x, y + 1, T.columna_1_0); };
const sarcophagus = (x, y) => { put(objects, x, y, T.sarcofago_0_0); put(objects, x + 1, y, T.sarcofago_0_1); };
const deco = (name, x, y) => { if (freeAt(x, y)) put(objects, x, y, T[name]); };

// Antesala
column(14, 4); column(25, 4);
deco('urna', 13, 10); deco('urna', 26, 10); deco('pila_huesos', 25, 8);
put(above, 13, 3, T.telarana);
// Galería: columnas fuera de los carriles de los centinelas (filas 25 y 28)
for (const x of [7, 12, 27, 32]) { column(x, 21); column(x, 31); }
sarcophagus(4, 20); sarcophagus(34, 20); sarcophagus(4, 33); sarcophagus(34, 33);
deco('urna', 16, 20); deco('urna', 23, 20); deco('pila_huesos', 17, 33); deco('pila_huesos', 22, 33);
put(above, 4, 21, T.telarana);
// Osario
deco('pila_huesos', 9, 39); deco('pila_huesos', 30, 39); deco('pila_huesos', 9, 46); deco('pila_huesos', 30, 46);
deco('urna', 20, 43); deco('pila_huesos', 19, 43);
sarcophagus(14, 43); sarcophagus(24, 43);
// Cámara del Faro
for (const y of [50, 55]) { column(9, y); column(30, y); }
deco('urna', 7, 58); deco('urna', 32, 58);
put(above, 7, 49, T.telarana);

// ---------------------------------------------------------------- puntos
const KEY = { brasero: [], guardian: [] };
// escaleras de salida: vuelven a la boca de la cripta en las Ruinas del Vigía (casilla 31,104)
pt({ name: 'salida_ruinas', type: 'salida', x: px(18), y: px(3), width: 128, height: 32, properties: [prop('destino', 'string', 'pradera'), prop('x', 'int', 31), prop('y', 'int', 106), prop('etiqueta', 'string', 'Ruinas del Vigía')] });
pt({ name: 'salida_faro', type: 'salida', x: px(28), y: px(49), width: 64, height: 32, properties: [prop('destino', 'string', 'pradera'), prop('x', 'int', 31), prop('y', 'int', 106), prop('etiqueta', 'string', 'Ruinas del Vigía')] });
// braseros de control (orden 1 y 2): al encenderlos, si caes o sales, retomas desde ahí
const brasero = (orden, x, y, nombre) => { KEY.brasero.push({ orden, x, y }); pt({ name: `brasero_${orden}`, type: 'brasero', x: px(x), y: px(y), properties: [prop('orden', 'int', orden), prop('etiqueta', 'string', nombre)] }); };
brasero(1, 16, 7, 'Brasero de la Antesala');
brasero(2, 12, 40, 'Brasero del Osario');
// guardianes con su ronda (casillas separadas por ";", van y vuelven o dan la vuelta)
const guardian = (id, monstruo, ruta, vuelta = false) => {
  const [x, y] = ruta[0];
  KEY.guardian.push({ id, ruta });
  pt({ name: id, type: 'guardian', x: px(x) + 16, y: px(y) + 16, properties: [prop('monstruo', 'string', monstruo), prop('ruta', 'string', ruta.map((p) => p.join(',')).join(';')), prop('vuelta', 'bool', vuelta)] });
};
guardian('centinela_norte', 'CRIPTA_CENTINELA', [[5, 25], [34, 25]]);
guardian('centinela_sur', 'CRIPTA_CENTINELA', [[34, 28], [5, 28]]);
guardian('espectro_osario', 'CRIPTA_ESPECTRO', [[11, 41], [28, 41], [28, 45], [11, 45]], true);
// Puerta del Vigía (4x2 casillas) y el jefe en su estrado
pt({ name: 'puerta_vigia', type: 'sello', x: px(18), y: px(47), width: 128, height: 64, properties: [] });
pt({ name: 'vigia', type: 'vigia', x: px(19) + 32, y: px(54) + 16, properties: [prop('monstruo', 'string', 'CRIPTA_VIGIA'), prop('etiqueta', 'string', 'El Vigía Caído')] });
// luces: antorchas de las paredes y el gran faro del Vigía
torches.forEach(([x, y], i) => pt({ name: `antorcha_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 14, properties: [prop('tipo', 'string', 'antorcha')] }));
pt({ name: 'luz_faro', type: 'luz', x: px(20), y: px(54), properties: [prop('tipo', 'string', 'faro')] });

const subzones = [
  { name: 'Antesala', x0: 13, y0: 3, x1: 26, y1: 19 },
  { name: 'Galería de los Centinelas', x0: 4, y0: 20, x1: 35, y1: 38 },
  { name: 'Osario', x0: 9, y0: 39, x1: 30, y1: 48 },
  { name: 'Cámara del Faro', x0: 7, y0: 49, x1: 32, y1: 58 },
  { name: 'La Cripta del Vigía', x0: 0, y0: 0, x1: W - 1, y1: H - 1 },
].map((s, i) => ({ ...s, levels: i === 4 ? null : '6-10' }));

// ---------------------------------------------------------------- partir en trozos
fs.mkdirSync(outDir, { recursive: true });
const terrainCodes = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) terrainCodes.push(Math.max(0, TERRENOS.indexOf(terrain[y][x])));
const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: CW, height: CH, data });
const tilesetRef = {
  firstgid: 1, name: 'cripta', image: '../tileset_cripta.png', imagewidth: TILESET.columns * 32,
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
      properties: [prop('zona', 'int', 1)],
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
  // zona 1: el servidor la trata como parte de la Pradera (misiones, bestiario); interior = sin cielo
  nombre: 'La Cripta del Vigía', zona: 1, interior: true, mazmorra: 'cripta', musica: 'cripta', tileset: 'cripta', terrenos: TERRENOS, tile: 32,
  chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0, gidHierba: 0,
  inicio: { x: px(19) + 32, y: px(6) + 16 },
  clima: { estacion: 'interior', lluvia: 0 },
  gids: { flores: [], agua: [], prado: [], arboles: [], dorados: [], seco: [] },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
console.log(`Cripta generada: ${W}x${H} tiles en ${chunks.length} trozos, ${points.length} puntos → ${outDir}`);
console.log(JSON.stringify(KEY));
