// Genera AURELIA, la Ciudad del Pilar (capital de Etheria), como un mundo de 3x3 trozos de
// 40x30 tiles (public/assets/mundo/aurelia/). Es el punto de partida de todos los jugadores.
//
// Diseño (norte arriba): el castillo y la catedral de Aethra al norte; en el centro la Plaza del
// Pilar con la estatua-fuente de la diosa; al oeste el Barrio de las Órdenes (las cinco casas de
// clase); al este el Barrio del Mercado (lonja, puestos, banco, posada); al noroeste el Barrio
// Élfico y al noreste el Barrio Enano; al sur el Barrio Bajo con su canal y la Puerta Sur, que da
// al Camino Real de la Pradera Dorada.
//
// Uso: node art/mapas/generar_aurelia.js   (no pisa la ciudad si ya se editó; --forzar para hacerlo)
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/aurelia');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('Aurelia ya se editó con el editor de mapas: no la piso. Usa --forzar para regenerarla igual.');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const META = Object.fromEntries(TILESET.tiles.map((t) => [t.id + 1, t]));
const TERRENOS = ['pasto', 'dorado', 'camino', 'agua', 'hierba', 'plaza', 'guarida', 'trigo', 'seco', 'meseta', 'cara', 'escalera', 'puente', 'muro',
  'adoquin', 'losa', 'mosaico', 'canal', 'puentep'];

const CW = 40;
const CH = 30;
const COLS = 3;
const ROWS = 3;
const W = CW * COLS;
const H = CH * ROWS;

let seed = 77123;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (list) => list[Math.floor(rand() * list.length)];

// ---------------------------------------------------------------- terreno lógico
const terrain = Array.from({ length: H }, () => new Array(W).fill('pasto'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : null);
const setT = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) terrain[y][x] = t; };
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };
const ellipseT = (cx, cy, rx, ry, t) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) setT(x, y, t);
  }
};

// sitios importantes (tiles)
const P = {
  plaza: { x: 60, y: 45 }, // centro del Pilar
  gate: { x: 58, y: 87 }, // Puerta Sur abierta (4x3, filas 87-89): da directo al Camino Real de la Pradera
};

// muralla
rectT(0, 0, W - 1, 1, 'muro');
rectT(0, H - 2, W - 1, H - 1, 'muro');
for (let y = 2; y < H - 2; y++) { setT(0, y, 'muro'); setT(W - 1, y, 'muro'); }

// calles (adoquines)
rectT(58, 15, 61, 86, 'adoquin'); // Avenida Real (norte-sur)
rectT(2, 44, W - 3, 45, 'adoquin'); // Avenida del Sol (este-oeste)
rectT(4, 22, W - 5, 23, 'adoquin'); // Ronda Norte
rectT(4, 64, W - 5, 65, 'adoquin'); // Ronda Sur
rectT(30, 22, 31, 84, 'adoquin'); // calle de las Órdenes
rectT(90, 22, 91, 84, 'adoquin'); // calle del Mercado
rectT(4, 22, 5, 84, 'adoquin'); rectT(W - 6, 22, W - 5, 84, 'adoquin');
rectT(4, 83, W - 5, 84, 'adoquin'); // calle de la muralla sur
rectT(14, 6, 15, 21, 'adoquin'); rectT(104, 6, 105, 21, 'adoquin'); // a los barrios del norte

// atrio de la catedral y Plaza del Pilar (losas, con anillo de mosaico)
rectT(50, 15, 69, 19, 'losa');
ellipseT(P.plaza.x, P.plaza.y, 12, 9, 'losa');
for (let y = P.plaza.y - 5; y <= P.plaza.y + 5; y++) for (let x = P.plaza.x - 6; x <= P.plaza.x + 6; x++) {
  const d = Math.hypot((x + 0.5 - P.plaza.x) / 6, (y + 0.5 - P.plaza.y) / 4.6);
  if (d > 0.72 && d <= 1) setT(x, y, 'mosaico');
}
// plaza del mercado (al sureste del Pilar)
rectT(66, 47, 87, 57, 'losa');
// placitas de los barrios
rectT(8, 46, 26, 50, 'adoquin'); // patio de armas de las Órdenes

// canal del Barrio Bajo, con puentes de piedra
rectT(2, 72, W - 3, 73, 'canal');
for (const [x0, x1] of [[58, 61], [30, 31], [90, 91], [4, 5], [W - 6, W - 5]]) rectT(x0, 72, x1, 73, 'puentep');
rectT(2, 70, W - 3, 71, 'adoquin'); rectT(2, 74, W - 3, 75, 'adoquin'); // paseos a los lados del canal

// callejones dentro de las manzanas (cada hilera de casas da a uno)
for (const [x0, x1] of [[6, 29], [32, 57], [62, 89], [92, 113]]) {
  for (const y of [29, 37, 51, 57]) rectT(x0, y, x1, y, 'adoquin');
}
// Jardines del Castillo: estanques a los lados de la catedral, con senderos de losas
ellipseT(40, 9, 5.5, 3.2, 'agua');
ellipseT(80, 9, 5.5, 3.2, 'agua');
rectT(33, 13, 55, 13, 'losa'); rectT(65, 13, 88, 13, 'losa');
rectT(44, 3, 44, 12, 'losa'); rectT(75, 3, 75, 12, 'losa');
// callejones del Barrio Enano
rectT(92, 7, 113, 7, 'adoquin'); rectT(92, 14, 97, 14, 'adoquin'); rectT(108, 16, 113, 16, 'adoquin');
// la Puerta Sur: delante, una placita, y el empedrado sigue por debajo del arco hasta la Pradera
rectT(54, 85, 65, 86, 'adoquin');
rectT(59, 87, 60, H - 1, 'adoquin');

// ---------------------------------------------------------------- capas
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H && gid) layer[y * W + x] = gid; };
const freeAt = (x, y) => objects[y * W + x] === 0 && above[y * W + x] === 0;
const mask = (x, y, same) => (same(at(x, y - 1)) ? 1 : 0) | (same(at(x + 1, y)) ? 2 : 0) | (same(at(x, y + 1)) ? 4 : 0) | (same(at(x - 1, y)) ? 8 : 0);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'adoquin') {
      const m = mask(x, y, (n) => ['adoquin', 'losa', 'mosaico', 'puentep', 'muro', null].includes(n));
      gid = m === 15 ? (rand() < 0.1 ? T.adoquin_musgo : rand() < 0.35 ? T.adoquin_b : T.adoquin) : T[`adoquin_${m}`];
    } else if (t === 'losa') gid = rand() < 0.15 ? T.losa_b : T.losa;
    else if (t === 'mosaico') gid = T.mosaico;
    else if (t === 'canal') gid = T[`canal_${mask(x, y, (n) => n === 'canal' || n === 'puentep' || n === null)}`];
    else if (t === 'puentep') gid = T.puente_piedra_v;
    else if (t === 'agua') gid = T[`agua_${mask(x, y, (n) => n === 'agua')}`];
    else { const r = rand(); gid = r < 0.08 ? T.pasto_matas : r < 0.14 ? T.pasto_flores : T.pasto; }
    put(ground, x, y, gid);
  }
}

// objetos grandes: la fila de arriba (tejados, copas) va en "encima" según el tileset
function placeGrid(name, w, h, x, y) {
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const id = T[`${name}_${r}_${c}`];
    if (!id) throw new Error(`falta ${name}_${r}_${c}`);
    put(META[id].encima ? above : objects, x + c, y + r, id);
  }
}
function placeBig(name, x, y) {
  put(objects, x, y, T[`${name}_ai`]); put(objects, x + 1, y, T[`${name}_ad`]);
  put(objects, x, y + 1, T[`${name}_bi`]); put(objects, x + 1, y + 1, T[`${name}_bd`]);
}
const deco = (name, x, y) => { if (freeAt(x, y)) put(objects, x, y, T[name]); };
// un edificio con su puerta abajo al centro; el camino hasta la calle se empedra
function building(name, w, h, x, y, streetY) {
  placeGrid(name, w, h, x, y);
  const dx = x + Math.floor(w / 2);
  if (streetY != null) for (let yy = y + h; yy < streetY; yy++) { setT(dx, yy, 'adoquin'); if (w % 2 === 0) setT(dx - 1, yy, 'adoquin'); }
  return { door: { x: dx - (w % 2 === 0 ? 0.5 : 0), y: y + h } };
}

// muralla con torres en las esquinas
for (let x = 0; x < W; x++) { put(objects, x, 0, T.muro_alto); put(objects, x, 1, T.muro_bajo); put(objects, x, H - 2, T.muro_alto); put(objects, x, H - 1, T.muro_bajo); }
for (let y = 2; y < H - 2; y++) { put(objects, 0, y, T.muro_v); put(objects, W - 1, y, T.muro_v); }
for (const [x, y] of [[0, 0], [W - 2, 0], [0, H - 2], [W - 2, H - 2], [0, 44], [W - 2, 44]]) { for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) objects[(y + r) * W + x + c] = 0; placeGrid('torre_muralla', 2, 2, x, y); }
// Puerta Sur, ABIERTA: el mundo es continuo y se sale caminando a la Pradera Dorada
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) objects[(P.gate.y + r) * W + P.gate.x + c] = 0;
placeGrid('puerta_abierta', 4, 3, P.gate.x, P.gate.y);

// ---- norte: castillo y catedral de Aethra
placeGrid('castillo', 8, 4, 56, 2);
const catedral = building('catedral', 6, 6, 57, 9);
building('capilla', 3, 3, 66, 11, 15);
placeGrid('estatua', 1, 2, 53, 14); placeGrid('estatua', 1, 2, 66, 15);

// ---- Barrio de las Órdenes (oeste)
const cuartel = building('cuartel', 4, 3, 8, 40, 44);
const torre = building('torre_arcana', 2, 4, 18, 39, 44);
const arqueros = building('casa_arqueros', 3, 3, 23, 40, 44);
for (const x of [8, 11, 14]) deco('diana', x, 52);
const taberna = building('taberna_sombra', 3, 3, 21, 56, 64);
building('casa_piedra', 3, 3, 9, 56, 64);
building('casa_alta_b', 2, 3, 15, 56, 64);
building('casa_roja', 3, 3, 34, 39, 44);
building('casa_alta_a', 2, 3, 39, 40, 44);
building('casa_azul', 3, 3, 44, 39, 44);
building('casa_verde', 3, 3, 35, 56, 64);
building('casa_alta_b', 2, 3, 41, 57, 64);
building('casa_roja', 3, 3, 45, 56, 64);
// salón del Gremio (casa grande de piedra en la Ronda Norte)
const gremio = building('casa_piedra', 3, 3, 40, 18, 22);
building('casa_azul', 3, 3, 34, 18, 22);
building('casa_alta_a', 2, 3, 46, 18, 22);
building('casa_verde', 3, 3, 21, 18, 22);

// ---- Barrio del Mercado (este)
const lonja = building('lonja', 4, 3, 72, 40, 44);
const banco = building('banco', 4, 3, 96, 40, 44);
building('casa_alta_a', 2, 3, 78, 40, 44);
building('casa_roja', 3, 3, 82, 39, 44);
building('casa_azul', 3, 3, 102, 39, 44);
building('casa_alta_b', 2, 3, 107, 40, 44);
for (const [x, y] of [[68, 49], [72, 49], [76, 49], [80, 49], [84, 49], [70, 53], [78, 53]]) placeBig(pick(['puesto_rojo', 'puesto_verde', 'puesto']), x, y);
const posada = building('posada', 4, 3, 74, 59, 64);
building('casa_verde', 3, 3, 94, 59, 64);
building('casa_piedra', 3, 3, 100, 59, 64);
building('casa_alta_a', 2, 3, 106, 60, 64);
building('casa_roja', 3, 3, 80, 59, 64);
building('casa_azul', 3, 3, 64, 18, 22);
building('casa_alta_b', 2, 3, 74, 19, 22);
building('casa_roja', 3, 3, 78, 18, 22);

// ---- Barrio Élfico (noroeste): árbol plateado, casas de hojas, jardines
const arbolPlata = { x: 7, y: 5 };
placeGrid('arbol_plata', 3, 3, arbolPlata.x, arbolPlata.y);
const elfica = building('casa_elfica', 3, 3, 17, 9, 22);
building('casa_elfica', 3, 3, 24, 4, null);
building('casa_elfica', 3, 3, 3, 13, null);
for (const [x, y] of [[11, 10], [12, 15], [24, 12], [28, 15], [9, 18]]) deco('maceta', x, y);
for (let x = 20; x <= 29; x++) deco('seto', x, 20);

// ---- Barrio Enano (noreste): forja y casas de piedra
const forja = building('forja_enana', 3, 3, 98, 10, 22);
building('casa_piedra', 3, 3, 108, 4, null);
building('casa_piedra', 3, 3, 92, 4, null);
building('casa_piedra', 3, 3, 109, 13, 22);
for (const [n, x, y] of [['yunque', 102, 14], ['barril', 103, 14], ['caja', 103, 15], ['barril', 96, 15], ['caja', 97, 16]]) deco(n, x, y);

// ---- la diligencia junto a la Puerta Sur
placeGrid('diligencia', 3, 2, 63, 79);

// ---- Plaza del Pilar: bancos, macetas, faroles, árboles en los jardines
for (const [x, y] of [[52, 41], [67, 41], [52, 49], [67, 49]]) deco('banco_plaza', x, y);
for (const [x, y] of [[49, 45], [70, 45], [55, 38], [64, 38], [55, 52], [64, 52]]) deco('maceta', x, y);
const tablon = { x: 56, y: 37 };
deco('cartel', tablon.x, tablon.y);

// ---- hileras de casas: cada una da (puerta abajo) a la calle o callejón de debajo. Se saltan
// los huecos ocupados por los edificios especiales y la plaza
const HOUSES3 = ['casa_roja', 'casa_azul', 'casa_verde', 'casa_piedra'];
const HOUSES2 = ['casa_alta_a', 'casa_alta_b'];
function areaFree(x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (at(xx, yy) !== 'pasto' || !freeAt(xx, yy)) return false;
  }
  return true;
}
function houseRow(y, x0, x1, kinds = null) {
  let x = x0;
  while (x < x1) {
    const kind = kinds ? pick(kinds) : (rand() < 0.4 ? pick(HOUSES2) : pick(HOUSES3));
    const w = kind.startsWith('casa_alta') ? 2 : 3;
    if (x + w - 1 > x1) break;
    if (areaFree(x, y, w, 3)) {
      placeGrid(kind, w, 3, x, y);
      x += w + (rand() < 0.25 ? 1 : 0);
    } else x += 1;
  }
}
const BLOCKS = [[6, 29], [32, 57], [62, 89], [92, 113]];
for (const [x0, x1] of BLOCKS) {
  for (const y of [26, 34, 41, 48, 54, 61, 67, 80]) houseRow(y, x0, x1);
}
// el Barrio Enano es todo de piedra; en la Ronda Norte viven los nobles
houseRow(18, 92, 113, ['casa_piedra']);
houseRow(4, 92, 113, ['casa_piedra']);
houseRow(11, 92, 113, ['casa_piedra']);
houseRow(18, 6, 13, ['casa_verde']);
houseRow(18, 32, 55, ['casa_azul', 'casa_piedra', 'casa_alta_b']);
houseRow(18, 64, 89, ['casa_azul', 'casa_piedra', 'casa_alta_b']);

// vegetación y vida según el barrio: bosque élfico, jardines del castillo, patios de las casas
const inElf = (x, y) => x < 32 && y < 22;
const inGarden = (x, y) => y < 16 && ((x > 32 && x < 56) || (x > 63 && x < 89));
const bigTree = (x, y) => { put(above, x, y, T.arbol_grande_ai); put(above, x + 1, y, T.arbol_grande_ad); put(objects, x, y + 1, T.arbol_grande_bi); put(objects, x + 1, y + 1, T.arbol_grande_bd); };
for (let y = 3; y < H - 3; y++) {
  for (let x = 2; x < W - 2; x++) {
    if (at(x, y) !== 'pasto' || !freeAt(x, y)) continue;
    const r = rand();
    const twoFree = freeAt(x + 1, y) && freeAt(x, y + 1) && freeAt(x + 1, y + 1) && at(x + 1, y) === 'pasto' && at(x, y + 1) === 'pasto' && at(x + 1, y + 1) === 'pasto';
    if (inElf(x, y)) {
      if (r < 0.05 && twoFree) bigTree(x, y);
      else if (r < 0.2) deco(pick(['flores_amarillas', 'flores_blancas', 'flores_moradas']), x, y);
    } else if (inGarden(x, y)) {
      if (r < 0.045 && twoFree) bigTree(x, y);
      else if (r < 0.1) deco('seto', x, y);
      else if (r < 0.3) deco(pick(['flores_amarillas', 'flores_blancas', 'flores_moradas']), x, y);
    } else {
      // patios traseros: cercas, barriles, cajas, pozos, macetas y algún arbusto
      if (r < 0.025 && at(x + 1, y) === 'pasto' && at(x + 2, y) === 'pasto') { for (let k = 0; k < 3; k++) deco('valla', x + k, y); }
      else if (r < 0.04) deco(pick(['barril', 'caja', 'barril']), x, y);
      else if (r < 0.047) deco('pozo', x, y);
      else if (r < 0.06) deco('maceta', x, y);
      else if (r < 0.075) deco('arbusto', x, y);
      else if (r < 0.11) deco(pick(['flores_amarillas', 'flores_blancas', 'flores_moradas']), x, y);
    }
  }
}
// árboles alineados en la Avenida Real (entre los faroles) y alrededor de la plaza
for (let y = 24; y <= 82; y += 8) for (const x of [56, 63]) if (at(x, y) === 'pasto' && freeAt(x, y)) deco('arbol', x, y);
for (const [x, y] of [[46, 40], [46, 50], [74, 38], [48, 36], [72, 36]]) if (at(x, y) === 'pasto' && freeAt(x, y)) deco('arbol', x, y);

// ---------------------------------------------------------------- puntos
const px = (n) => n * 32;
const prop = (name, type, value) => ({ name, type, value });
const points = [];
const pt = (o) => points.push(o);

pt({ name: 'inicio', type: 'spawn', x: px(59), y: px(52) });
// el Pilar de Aethra (sprite animado; se le hace la ofrenda)
pt({ name: 'pilar', type: 'pilar', x: px(P.plaza.x), y: px(P.plaza.y) + 8, properties: [prop('etiqueta', 'string', 'Pilar de Aethra — Ofrenda'), prop('ventana', 'string', 'ofrenda')] });
pt({ name: 'tablon', type: 'poi', x: px(tablon.x), y: px(tablon.y), properties: [prop('etiqueta', 'string', 'Tablón de encargos'), prop('ventana', 'string', 'misiones_gremio')] });

const npc = (name, x, y, props) => pt({ name, type: 'npc', x: px(x), y: px(y), properties: Object.entries(props).map(([k, v]) => prop(k, typeof v === 'number' ? 'int' : 'string', v)) });
npc('guia', 57, 50, { nombre: 'Tomás, guía de Aurelia', sprite: 'npc_tomas', dialogo: 'tomas', etiqueta: 'Hablar con Tomás' });
npc('sacerdotisa', catedral.door.x - 2, catedral.door.y + 1, { nombre: 'Elenya, sacerdotisa de Aethra', sprite: 'npc_elenya', dialogo: 'elenya', etiqueta: 'Hablar con Elenya', ventana: 'enfermeria' });
npc('posadera', posada.door.x + 2, posada.door.y + 1, { nombre: 'Marta, posadera', sprite: 'npc_marta', dialogo: 'marta', etiqueta: 'Hablar con Marta', ventana: 'libro' });
npc('banquero', banco.door.x + 2, banco.door.y + 1, { nombre: 'Durin, banquero', sprite: 'npc_durin', dialogo: 'durin', etiqueta: 'Hablar con Durin', ventana: 'mercado' });
npc('encantadora', elfica.door.x + 2, elfica.door.y + 1, { nombre: 'Aelin, encantadora', sprite: 'npc_aelin', dialogo: 'aelin', etiqueta: 'Hablar con Aelin', ventana: 'encantador' });
npc('herrero_enano', forja.door.x + 2, forja.door.y + 1, { nombre: 'Brokk, maestro herrero', sprite: 'npc_brokk', dialogo: 'brokk', etiqueta: 'Hablar con Brokk', ventana: 'taller' });
npc('mercader', lonja.door.x, lonja.door.y + 1, { nombre: 'Lyra, mercader', sprite: 'npc_lyra', dialogo: 'lyra', etiqueta: 'Hablar con Lyra', ventana: 'artesanos' });
npc('cochero', 62, 82, { nombre: 'Gaspar, cochero', sprite: 'npc_cochero', dialogo: 'cochero', etiqueta: 'Hablar con Gaspar' });
npc('registro_gremios', gremio.door.x + 2, gremio.door.y + 1, { nombre: 'Oswin, registro de gremios', sprite: 'cit_10', dialogo: 'oswin', etiqueta: 'Hablar con Oswin', ventana: 'gremio' });
npc('maestro_guerrero', cuartel.door.x + 2, cuartel.door.y + 1, { nombre: 'Sir Aldric, maestro de armas', sprite: 'npc_maestro_guerrero', dialogo: 'aldric', etiqueta: 'Hablar con Sir Aldric', ventana: 'orden_guerrero' });
npc('maestra_maga', torre.door.x + 1.5, torre.door.y + 1, { nombre: 'Isolde, archimaga', sprite: 'npc_maestra_maga', dialogo: 'isolde', etiqueta: 'Hablar con Isolde', ventana: 'orden_mago' });
npc('maestra_arquera', arqueros.door.x + 2, arqueros.door.y + 1, { nombre: 'Sylwen, maestra arquera', sprite: 'npc_maestra_arquera', dialogo: 'sylwen', etiqueta: 'Hablar con Sylwen', ventana: 'orden_arquero' });
npc('maestro_picaro', taberna.door.x + 2, taberna.door.y + 1, { nombre: 'Nox, el que no se ve', sprite: 'npc_maestro_picaro', dialogo: 'nox', etiqueta: 'Hablar con Nox', ventana: 'orden_picaro' });
npc('sumo_sacerdote', 67.5, 15, { nombre: 'Padre Anselm, sumo sacerdote', sprite: 'npc_sumo_sacerdote', dialogo: 'anselm', etiqueta: 'Hablar con el Padre Anselm', ventana: 'orden_sacerdote' });
npc('heraldo', 63, 47, { nombre: 'Heraldo del Festival', sprite: 'npc_heraldo', dialogo: 'heraldo', etiqueta: 'Hablar con el Heraldo', horario: 'festival' });

// carteles colgados junto a cada puerta (íconos de carteles.png)
const cartel = (icono, x, y) => pt({ name: `cartel_${icono}_${x}`, type: 'cartel', x: px(x) + 16, y: px(y) + 12, properties: [prop('icono', 'string', icono)] });
cartel('ala', catedral.door.x + 2.5, catedral.door.y - 2);
cartel('sol', 68.5, 13);
cartel('espada', cuartel.door.x + 1.5, cuartel.door.y - 1);
cartel('baston', torre.door.x + 1, torre.door.y - 1);
cartel('arco', arqueros.door.x + 1, arqueros.door.y - 1);
cartel('daga', taberna.door.x + 1, taberna.door.y - 1);
cartel('jarra', posada.door.x + 1.5, posada.door.y - 1);
cartel('cama', posada.door.x - 1.5, posada.door.y - 1);
cartel('moneda', banco.door.x + 1.5, banco.door.y - 1);
cartel('balanza', lonja.door.x + 1.5, lonja.door.y - 1);
cartel('gema', elfica.door.x + 1, elfica.door.y - 1);
cartel('yunque', forja.door.x + 1, forja.door.y - 1);
cartel('pergamino', gremio.door.x + 1, gremio.door.y - 1);
cartel('rueda', 66, 80);
cartel('libro', posada.door.x + 2.5, posada.door.y - 2);

// rutas (puntos ordenados) para los que caminan
const ruta = (name, list) => list.forEach(([x, y], i) => pt({ name, type: 'ruta', x: px(x) + 16, y: px(y) + 16, properties: [prop('orden', 'int', i)] }));
ruta('plaza', [[52, 45], [56, 39], [64, 39], [68, 45], [64, 51], [56, 51]]);
ruta('avenida', [[59, 20], [59, 40], [60, 53], [60, 70], [60, 82], [60, 70], [60, 53], [59, 40]]);
ruta('sol_oeste', [[6, 44], [20, 45], [30, 44], [45, 45], [50, 44], [30, 44]]);
ruta('sol_este', [[70, 44], [88, 45], [100, 44], [114, 45], [100, 44], [88, 45]]);
ruta('ronda_norte', [[6, 22], [30, 23], [58, 22], [90, 23], [113, 22], [90, 23], [58, 22], [30, 23]]);
ruta('ronda_sur', [[6, 64], [30, 65], [60, 64], [90, 65], [113, 64], [90, 65], [60, 64], [30, 65]]);
ruta('canal', [[6, 71], [40, 70], [80, 71], [113, 70], [80, 71], [40, 70]]);
ruta('mercado', [[67, 48], [86, 48], [86, 56], [67, 56]]);
ruta('elfos', [[14, 7], [15, 14], [15, 21], [10, 19], [14, 12]]);
ruta('enanos', [[104, 7], [105, 14], [105, 21], [100, 18], [104, 12]]);
ruta('juego', [[54, 54], [57, 56], [62, 56], [65, 54], [62, 52], [57, 52]]);
ruta('patio', [[9, 47], [24, 47], [24, 49], [9, 49]]);
// el farolero recorre los faroles de la Avenida Real y de la plaza
const faroles = [[57, 18], [62, 18], [57, 26], [62, 26], [57, 34], [62, 34], [50, 41], [70, 41], [50, 49], [70, 49], [57, 58], [62, 58], [57, 68], [62, 68], [57, 78], [62, 78]];
ruta('faroles', faroles.map(([x, y]) => [x + (x < 60 ? 1 : -1), y]));

const ciudadano = (name, x, y, props) => pt({ name, type: 'ciudadano', x: px(x) + 16, y: px(y) + 16, properties: Object.entries(props).map(([k, v]) => prop(k, typeof v === 'number' ? 'int' : 'string', v)) });
ciudadano('pregonero', 52, 45, { sprite: 'npc_bram', nombre: 'Bram, el pregonero', ruta: 'plaza', rol: 'pregonero', velocidad: 26 });
ciudadano('farolero', 58, 18, { sprite: 'npc_farolero', nombre: 'Elric, el farolero', ruta: 'faroles', rol: 'farolero', velocidad: 34, horario: 'tarde' });
ciudadano('bardo', 62, 41, { sprite: 'npc_bardo', nombre: 'Fen, el bardo', rol: 'bardo', frases: 'bardo' });
['guardia_1', 'guardia_2', 'guardia_3', 'guardia_4'].forEach((n, i) => ciudadano(n, ...[[59, 21], [8, 22], [110, 64], [40, 70]][i], { sprite: 'npc_guardia', ruta: ['avenida', 'ronda_norte', 'ronda_sur', 'canal'][i], velocidad: 30, frases: 'guardia' }));
const paseantes = [
  ['cit_1', 'sol_oeste', 40], ['cit_2', 'sol_este', 36], ['cit_3', 'elfos', 30], ['cit_4', 'elfos', 26], ['cit_5', 'enanos', 28],
  ['cit_6', 'mercado', 34], ['cit_7', 'mercado', 30], ['cit_8', 'canal', 32], ['cit_9', 'plaza', 24], ['cit_10', 'ronda_norte', 34],
  ['cit_11', 'avenida', 26], ['cit_12', 'canal', 30], ['cit_13', 'ronda_sur', 34], ['cit_14', 'sol_este', 38], ['cit_15', 'mercado', 28],
  ['cit_2', 'ronda_sur', 30], ['cit_1', 'avenida', 36], ['cit_14', 'patio', 30],
];
paseantes.forEach(([sprite, r, v], i) => ciudadano(`paseante_${i}`, 60, 45, { sprite, ruta: r, velocidad: v, horario: i % 3 === 0 ? 'dia' : 'siempre', frases: 'paseante' }));
ciudadano('nino_a', 54, 54, { sprite: 'nino_a', ruta: 'juego', velocidad: 60, rol: 'nino' });
ciudadano('nino_b', 62, 56, { sprite: 'nino_b', ruta: 'juego', velocidad: 58, rol: 'nino', horario: 'dia' });
// grupos que conversan entre ellos (los globitos se turnan; ver src/game/cityScripts.js)
const charla = (grupo, list) => list.forEach(([sprite, x, y, mira], i) => ciudadano(`charla_${grupo}_${i}`, x, y, { sprite, charla: grupo, mira }));
charla('elfo_enano', [['cit_3', 54, 46, 'side'], ['cit_5', 55, 46, 'sideL']]);
charla('guardias', [['npc_guardia', 56.5, 84, 'side'], ['npc_guardia', 57.5, 84, 'sideL']]);
charla('mercado', [['cit_15', 82, 52, 'down'], ['cit_9', 82, 54, 'up']]);
charla('canal', [['cit_12', 34, 74, 'side'], ['cit_8', 35, 74, 'sideL']]);
charla('nobles', [['cit_9', 64, 20, 'side'], ['cit_10', 65, 20, 'sideL']]);
charla('aprendices', [['cit_6', 27, 46, 'side'], ['cit_13', 28, 46, 'sideL']]);

// fauna de ciudad: palomas en la plaza y gatos tomando el sol
for (const [x, y] of [[57, 43], [63, 47], [66, 50], [72, 55]]) pt({ name: `palomas_${x}`, type: 'palomas', x: px(x), y: px(y) });
for (const [x, y] of [[49, 52], [78, 62], [22, 59], [100, 18], [36, 71]]) pt({ name: `gato_${x}`, type: 'gato', x: px(x) + 16, y: px(y) + 16 });

// luces: faroles (con orden para el farolero), la catedral y las ventanas de la posada
faroles.forEach(([x, y], i) => { put(objects, x, y, T.farol); pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', 'farol'), prop('orden', 'int', i)] }); });
pt({ name: 'luz_catedral', type: 'luz', x: px(60), y: px(13), properties: [prop('tipo', 'string', 'catedral')] });
pt({ name: 'luz_posada', type: 'luz', x: px(76), y: px(60), properties: [prop('tipo', 'string', 'fogata')] });
pt({ name: 'luz_forja', type: 'luz', x: px(99) + 16, y: px(12), properties: [prop('tipo', 'string', 'fogata')] });
pt({ name: 'luz_pilar', type: 'luz', x: px(P.plaza.x), y: px(P.plaza.y) - 40, properties: [prop('tipo', 'string', 'pilar')] });

// subzonas (la primera que contiene al jugador gana)
const subzones = [
  { name: 'Plaza del Pilar', x0: 47, y0: 35, x1: 73, y1: 56 },
  { name: 'Catedral de Aethra', x0: 48, y0: 2, x1: 71, y1: 20 },
  { name: 'Barrio Élfico', x0: 2, y0: 2, x1: 31, y1: 21 },
  { name: 'Barrio Enano', x0: 88, y0: 2, x1: 117, y1: 21 },
  { name: 'Barrio de las Órdenes', x0: 2, y0: 22, x1: 47, y1: 63 },
  { name: 'Barrio del Mercado', x0: 62, y0: 22, x1: 117, y1: 63 },
  { name: 'Puerta Sur', x0: 50, y0: 76, x1: 70, y1: 89 },
  { name: 'Barrio Bajo', x0: 2, y0: 64, x1: 117, y1: 89 },
  { name: 'Aurelia', x0: 0, y0: 0, x1: W - 1, y1: H - 1 },
].map((s) => ({ ...s, levels: null, safe: true }));

// ---------------------------------------------------------------- partir en trozos
fs.mkdirSync(outDir, { recursive: true });
const terrainCodes = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) terrainCodes.push(Math.max(0, TERRENOS.indexOf(terrain[y][x])));
// el terreno pudo cambiar al empedrar las entradas: se recalculan esas casillas de suelo
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (terrain[y][x] !== 'adoquin') continue;
  const m = mask(x, y, (n) => ['adoquin', 'losa', 'mosaico', 'puentep', 'muro', null].includes(n));
  const cur = ground[y * W + x];
  if (m === 15 && [T.adoquin, T.adoquin_b, T.adoquin_musgo].includes(cur)) continue;
  ground[y * W + x] = m === 15 ? T.adoquin : T[`adoquin_${m}`];
}
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
      properties: [prop('zona', 'int', 0)],
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
  nombre: 'Aurelia', zona: 0, ciudad: true, musica: 'ciudad', tileset: 'pradera', terrenos: TERRENOS, tile: 32,
  chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0, gidHierba: T.hierba_alta,
  inicio: { x: px(59) + 16, y: px(52) + 16 },
  clima: { estacion: 'verano', lluvia: 0.15 },
  gids: {
    flores: [T.flores_amarillas, T.flores_blancas, T.flores_moradas, T.pasto_flores],
    agua: range16('canal'), prado: [T.pasto, T.pasto_matas], arboles: [T.arbol_grande_ai, T.arbol_grande_ad], dorados: [], seco: [],
  },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));

if (process.argv.includes('--preview')) {
  // vista previa 1 px = 1 tile (para revisar el trazado): art/mapas/aurelia_preview.json → bmp.js
  const COLORS = { pasto: [92, 154, 60], adoquin: [190, 182, 166], losa: [236, 228, 208], mosaico: [90, 110, 200], canal: [58, 114, 192], puentep: [150, 140, 130], muro: [100, 100, 100] };
  const rows = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      let c = COLORS[terrain[y][x]] ?? [255, 0, 255];
      if (objects[y * W + x] || above[y * W + x]) c = c.map((v) => Math.round(v * 0.55));
      row.push(c);
    }
    rows.push(row);
  }
  fs.writeFileSync(path.join(__dirname, 'aurelia_preview.json'), JSON.stringify({ w: W, h: H, rows }));
}
console.log(`Aurelia generada: ${W}x${H} tiles en ${chunks.length} trozos, ${points.length} puntos → ${outDir}`);
