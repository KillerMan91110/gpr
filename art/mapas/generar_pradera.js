// Genera el mapa de la Pradera Dorada en formato Tiled (JSON), para poder abrirlo y seguir
// editándolo a mano en Tiled (https://www.mapeditor.org). Tiles de 32x32.
//
// Uso: node art/mapas/generar_pradera.js
// Salida: public/assets/mundo/pradera.json (usa public/assets/mundo/tileset_pradera.png)
//
// Capas: "suelo" (terreno, con autotiles de camino y agua), "objetos" (lo que choca),
// "encima" (copas de árboles, se dibujan por encima del personaje) y "puntos" (inicio, NPCs,
// puntos de interés, guaridas de jefe y zonas de encuentro).
const fs = require('fs');
const path = require('path');

const TILESET = require('../sprites/mundo/tileset_pradera.json');
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1])); // gid = id + 1

const W = 40;
const H = 30;

// RNG con semilla: el mapa sale igual cada vez que se regenera
let seed = 20261012;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------------------------------------------------------------- terreno lógico
// pasto | camino | agua | hierba | plaza | guarida
const terrain = Array.from({ length: H }, () => new Array(W).fill('pasto'));
const setT = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) terrain[y][x] = t; };
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };

// campamento del gremio (oeste)
rectT(3, 10, 12, 19, 'plaza');
// camino principal hacia la salida del este, y desvíos a las guaridas
rectT(13, 14, W - 1, 15, 'camino');
rectT(19, 7, 20, 13, 'camino');          // al pastizal norte
rectT(33, 10, 34, 13, 'camino');          // a la guarida del Capitán
rectT(30, 16, 31, 21, 'camino');          // al Corazón de la Pradera (Titán)
// estanque al noreste
rectT(25, 3, 31, 7, 'agua');
setT(25, 3, 'pasto'); setT(31, 3, 'pasto'); setT(31, 7, 'pasto');
// guaridas de jefe
rectT(32, 7, 37, 9, 'guarida');
rectT(29, 22, 36, 26, 'guarida');
// hierba alta: donde hay monstruos y encuentros al caminar
const encounterAreas = [
  { name: 'Pastizal norte', x: 12, y: 3, w: 6, h: 9, monstruos: ['LOBO_PRADERA', 'RATA_ALCANTARILLA', 'GOBLIN_SAQUEADOR'] },
  { name: 'Pastizal sur', x: 13, y: 18, w: 12, h: 7, monstruos: ['ARANA_VENENOSA', 'BANDIDO_CORRUPTO', 'LOBO_PRADERA'] },
  { name: 'Claro del este', x: 22, y: 9, w: 9, h: 4, monstruos: ['LOBO_FEROZ', 'CHAMAN_OSCURO', 'GOBLIN_SAQUEADOR'] },
];
for (const a of encounterAreas) {
  for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (terrain[y][x] === 'pasto') setT(x, y, 'hierba');
}

// ---------------------------------------------------------------- capas de tiles
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : null);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = gid; };
const free = (x, y) => objects[y * W + x] === 0 && above[y * W + x] === 0;

// máscara de vecinos: 1 arriba, 2 derecha, 4 abajo, 8 izquierda (ver crear_mundo.lua)
const mask = (x, y, same) => (same(at(x, y - 1)) ? 1 : 0) | (same(at(x + 1, y)) ? 2 : 0)
  | (same(at(x, y + 1)) ? 4 : 0) | (same(at(x - 1, y)) ? 8 : 0);
const isPath = (t) => t === 'camino' || t === 'plaza' || t === 'guarida' || t === null;
const isWater = (t) => t === 'agua';

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'camino') gid = T[`camino_${mask(x, y, isPath)}`];
    else if (t === 'agua') gid = T[`agua_${mask(x, y, isWater)}`];
    else if (t === 'hierba') gid = T.hierba_alta;
    else if (t === 'plaza') gid = T.piedra_plaza;
    else if (t === 'guarida') gid = T.suelo_guarida;
    else { const r = rand(); gid = r < 0.1 ? T.pasto_matas : r < 0.16 ? T.pasto_flores : T.pasto; }
    put(ground, x, y, gid);
  }
}

// objetos de 2x2: la mitad de arriba de los árboles va en "encima" (tapa al personaje)
function placeBig(name, x, y) {
  if (name === 'arbol_grande') {
    put(above, x, y, T.arbol_grande_ai); put(above, x + 1, y, T.arbol_grande_ad);
  } else {
    put(objects, x, y, T[`${name}_ai`]); put(objects, x + 1, y, T[`${name}_ad`]);
  }
  put(objects, x, y + 1, T[`${name}_bi`]); put(objects, x + 1, y + 1, T[`${name}_bd`]);
}
const areaFree = (x, y, w, h) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx < 0 || yy < 0 || xx >= W || yy >= H || !free(xx, yy) || at(xx, yy) !== 'pasto') return false;
  }
  return true;
};

// bosque en el borde con árboles grandes, dejando libre la salida del este
for (let x = 0; x < W; x += 2) { placeBig('arbol_grande', x, 0); placeBig('arbol_grande', x, H - 2); }
for (let y = 2; y < H - 2; y += 2) {
  placeBig('arbol_grande', 0, y);
  if (y < 12 || y > 16) placeBig('arbol_grande', W - 2, y);
}
for (let y = 13; y <= 16; y++) { put(objects, W - 2, y, 0); put(objects, W - 1, y, 0); put(above, W - 2, y, 0); put(above, W - 1, y, 0); }

// campamento: carpas, faroles, fogata, cartel, puesto del mercader, yunque del herrero, vallas
placeBig('carpa', 4, 10);
placeBig('carpa', 9, 10);
put(objects, 7, 10, T.farol);
put(objects, 7, 19, T.farol);
put(objects, 7, 13, T.fogata);
put(objects, 12, 12, T.cartel);
placeBig('puesto', 3, 16);
put(objects, 10, 18, T.yunque);
put(objects, 11, 18, T.barril);
put(objects, 12, 18, T.caja);
for (let x = 3; x <= 12; x++) { put(objects, x, 9, T.valla); put(objects, x, 20, T.valla); }

// guaridas: huesos y rocas alrededor
for (const [x, y] of [[32, 7], [37, 9], [29, 26], [36, 22], [33, 26]]) put(objects, x, y, T.huesos);
for (const [x, y] of [[36, 7], [29, 22], [36, 26]]) put(objects, x, y, T.roca);

// árboles grandes, rocas y arbustos sueltos (sin tapar caminos, agua, hierba ni guaridas)
for (let i = 0; i < 140; i++) {
  const x = 2 + Math.floor(rand() * (W - 4));
  const y = 2 + Math.floor(rand() * (H - 4));
  const r = rand();
  if (r < 0.25) { if (areaFree(x, y, 2, 2) && areaFree(x - 1, y - 1, 4, 4)) placeBig('arbol_grande', x, y); }
  else if (areaFree(x, y, 1, 1) && Math.abs(y - 14.5) > 2) put(objects, x, y, r < 0.6 ? T.arbusto : T.roca);
}

// ---------------------------------------------------------------- puntos
const px = (n) => n * 32;
const prop = (name, type, value) => ({ name, type, value });
const points = [
  { name: 'inicio', type: 'spawn', x: px(7), y: px(15) },
  { name: 'enfermeria', type: 'poi', x: px(7), y: px(13), properties: [
    prop('etiqueta', 'string', 'Fogata del campamento — Enfermería'), prop('ventana', 'string', 'enfermeria'),
  ] },
  { name: 'tablon', type: 'poi', x: px(12), y: px(12), properties: [
    prop('etiqueta', 'string', 'Tablón de misiones del gremio'), prop('ventana', 'string', 'misiones_gremio'),
  ] },
  { name: 'salida_este', type: 'poi', x: px(39), y: px(14), properties: [
    prop('etiqueta', 'string', 'Camino a las Montañas Grises — Mapa'), prop('ventana', 'string', 'mapa'),
  ] },
  // NPCs: se dibujan con un sprite de caminar de una clase (mirando hacia abajo)
  { name: 'guardabosque', type: 'npc', x: px(11), y: px(13), properties: [
    prop('nombre', 'string', 'Ren, guardabosque'), prop('sprite', 'string', 'arquero'),
    prop('etiqueta', 'string', 'Hablar con Ren — Misiones'), prop('ventana', 'string', 'misiones_gremio'),
  ] },
  { name: 'mercader', type: 'npc', x: px(5), y: px(15), properties: [
    prop('nombre', 'string', 'Lyra, mercader'), prop('sprite', 'string', 'picaro'),
    prop('etiqueta', 'string', 'Comerciar con Lyra — Artesanos'), prop('ventana', 'string', 'artesanos'),
  ] },
  { name: 'herrero', type: 'npc', x: px(9), y: px(17), properties: [
    prop('nombre', 'string', 'Goreth, herrero'), prop('sprite', 'string', 'guerrero'),
    prop('etiqueta', 'string', 'Hablar con Goreth — Taller'), prop('ventana', 'string', 'taller'),
  ] },
  // guaridas de jefe: el jefe espera ahí y se lo desafía con E
  { name: 'guarida_capitan', type: 'jefe', x: px(34), y: px(8), properties: [
    prop('monstruo', 'string', 'CAPITAN_LOBOS'), prop('nivel', 'int', 12),
    prop('etiqueta', 'string', 'Desafiar al Capitán de los Lobos'),
  ] },
  { name: 'corazon_pradera', type: 'jefe', x: px(32), y: px(24), properties: [
    prop('monstruo', 'string', 'TITAN_PRADERA'), prop('nivel', 'int', 15),
    prop('etiqueta', 'string', 'Desafiar al Titán de la Pradera'),
  ] },
  ...encounterAreas.map((a) => ({
    name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
    properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', 2)],
  })),
].map((o, i) => ({ id: i + 1, rotation: 0, visible: true, width: 0, height: 0, ...o }));

const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: W, height: H, data });

const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: 32, tileheight: 32, infinite: false,
  nextlayerid: 5, nextobjectid: points.length + 1,
  properties: [
    prop('zona', 'int', 1),
    prop('nombre', 'string', 'Pradera Dorada'),
    prop('encuentro_hierba', 'float', 0.08), // probabilidad de encuentro por cada casilla de hierba alta que pisas
    prop('gid_hierba', 'int', T.hierba_alta),
  ],
  layers: [
    tileLayer(1, 'suelo', ground),
    tileLayer(2, 'objetos', objects),
    tileLayer(3, 'encima', above),
    { id: 4, name: 'puntos', type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects: points },
  ],
  tilesets: [{
    firstgid: 1, name: 'pradera', image: 'tileset_pradera.png', imagewidth: TILESET.columns * 32,
    imageheight: Math.ceil(TILESET.count / TILESET.columns) * 32, tilewidth: 32, tileheight: 32,
    columns: TILESET.columns, tilecount: TILESET.count, margin: 0, spacing: 0,
    tiles: TILESET.tiles.filter((t) => t.colision).map((t) => ({
      id: t.id, properties: [{ name: 'colision', type: 'bool', value: true }],
    })),
  }],
};

const out = path.join(__dirname, '../../public/assets/mundo/pradera.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(map));
console.log(`Mapa generado: ${out} (${W}x${H})`);
