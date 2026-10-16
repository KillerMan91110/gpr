// Genera LA FISURA INFERNAL, la mazmorra bajo la Grieta Ardiente (Volcán Rojo), como una zona fuera
// del continente de 1x2 trozos de 40x30 tiles (public/assets/mundo/fisura/), con su propio tileset
// (tileset_fisura, ver art/sprites/mundo/crear_fisura.lua). Es la forja secreta de los Ocultos, donde
// Morvak convierte los moldes robados a Ignar en Cristales de Eclipse. El motor es el molde de
// gprback/lib/mazmorra.js (definición en gprback/lib/fisura.js):
//   Entrada (escaleras de salida y la Cuba de la Entrada) → Sala de Fundición (el Fundidor Oculto que
//   patrulla entre los hornos) → Puente de Escoria (los Diablillos de Fragua sobre un lago de lava) →
//   Galería de los Moldes (la Cuba del Puente) → El Foso (el Gólem de Escoria da vueltas) → Portón de
//   la Forja (cerrado hasta vencer a los tres guardianes) → Cámara de Morvak (el jefe frente a su
//   forja).
//
// Las casillas de cubas, guardianes, portón y jefe están repetidas en gprback/lib/fisura.js (el
// servidor comprueba que estés cerca): si mueves algo aquí, muévelo allá también.
//
// Uso: node art/mapas/generar_fisura.js   (no pisa la Fisura si ya se editó; --forzar para hacerlo)
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/fisura');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('La Fisura ya se editó con el editor de mapas: no la piso. Usa --forzar para regenerarla igual.');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_fisura.json');
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const META = Object.fromEntries(TILESET.tiles.map((t) => [t.id + 1, t]));
const TERRENOS = ['suelo', 'muro', 'lava', 'puente', 'puentev', 'escalera', 'forja'];

const CW = 40;
const CH = 30;
const COLS = 1;
const ROWS = 2;
const W = CW * COLS;
const H = CH * ROWS;
const px = (t) => t * 32;
const prop = (name, type, value) => ({ name, type, value });
// la entrada de la Fisura en el Volcán está en la casilla 33,97; se vuelve dos casillas más abajo
const VOLCAN_VUELTA = { x: 33, y: 99 };

let seed = 3907;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------------------------------------------------------------- terreno lógico
const terrain = Array.from({ length: H }, () => new Array(W).fill('muro'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : 'muro');
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrain[y][x] = t; };
const floor = (t) => t !== 'muro';
const walk = (t) => t !== 'muro' && t !== 'lava';

rectT(13, 3, 26, 11, 'suelo'); // Entrada
rectT(18, 3, 21, 3, 'escalera'); // escaleras de vuelta al Volcán
rectT(18, 12, 21, 14, 'suelo'); // túnel
rectT(4, 15, 35, 21, 'suelo'); // Sala de Fundición
rectT(18, 22, 21, 23, 'suelo'); // túnel
rectT(4, 24, 35, 28, 'lava'); // Puente de Escoria: un lago de lava…
rectT(4, 25, 35, 27, 'puente'); // …con el puente de lado a lado
rectT(18, 24, 21, 24, 'puentev'); // bajada al puente
rectT(18, 28, 21, 28, 'puentev'); // y salida hacia la galería
rectT(18, 29, 21, 29, 'suelo'); // túnel
rectT(10, 30, 33, 36, 'suelo'); // Galería de los Moldes
rectT(18, 37, 21, 38, 'suelo'); // túnel
rectT(9, 39, 30, 46, 'suelo'); // El Foso
rectT(18, 47, 21, 48, 'suelo'); // hueco del Portón de la Forja
rectT(7, 49, 32, 58, 'suelo'); // Cámara de Morvak
rectT(17, 54, 22, 57, 'forja');
rectT(28, 49, 29, 49, 'escalera'); // subida al Volcán (al vencer a Morvak)
// pozos de lava en el Foso y en la cámara (lejos de las rondas)
rectT(9, 39, 10, 39, 'lava'); rectT(29, 46, 30, 46, 'lava');
rectT(7, 57, 9, 58, 'lava'); rectT(30, 57, 32, 58, 'lava');

// ---------------------------------------------------------------- capas
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H && gid) layer[y * W + x] = gid; };
const points = [];
const pt = (o) => points.push(o);

// suelo y paredes: la pared con suelo debajo muestra su cara de basalto; el resto es techo
const torches = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'muro') {
      if (floor(at(x, y + 1))) {
        const torch = x % 6 === 2 && floor(at(x - 1, y + 1)) && floor(at(x + 1, y + 1));
        const r = rand();
        gid = torch ? T.pared_brasero : r < 0.12 ? T.pared_eclipse : r < 0.22 ? T.pared_cadena : T.pared;
        if (torch) torches.push([x, y]);
      } else gid = T.techo;
    } else if (t === 'escalera') gid = T.escalera;
    else if (t === 'lava') gid = walk(at(x, y - 1)) && at(x, y - 1) !== 'puente' ? T.lava_borde : T.lava;
    // puente ancho: baranda arriba y abajo, tablones en el medio (y en las bajadas)
    else if (t === 'puente') gid = at(x, y - 1) === 'lava' ? T.puente_n : at(x, y + 1) === 'lava' ? T.puente_s : T.puente_c;
    else if (t === 'puentev') gid = T.puente_c;
    else if (t === 'forja') gid = T.piso_forja;
    else if (at(x, y - 1) === 'muro') gid = T.sombra;
    else {
      const r = rand();
      const foso = y >= 39 && y <= 46;
      gid = foso && r < 0.35 ? T.suelo_escoria : r < 0.06 ? T.suelo_grieta : r < 0.1 ? T.suelo_escoria : T.suelo;
    }
    put(ground, x, y, gid);
  }
}

const freeAt = (x, y) => walk(at(x, y)) && !objects[y * W + x] && !above[y * W + x];
const deco = (name, x, y) => { if (freeAt(x, y)) put(objects, x, y, T[name]); };
// horno 2x2: la cúpula (fila de arriba) se ve sobre el héroe, la boca (fila de abajo) choca
const horno = (x, y) => {
  put(above, x, y, T.horno_0_0); put(above, x + 1, y, T.horno_0_1);
  put(objects, x, y + 1, T.horno_1_0); put(objects, x + 1, y + 1, T.horno_1_1);
};
// canal de metal fundido que cruza una sala (se puede pisar)
const canal = (x0, x1, y) => { for (let x = x0; x <= x1; x++) if (at(x, y) === 'suelo') put(ground, x, y, T.canal); };

// Entrada
deco('caja', 25, 10); deco('crisol', 26, 4); deco('pila_escoria', 14, 4); deco('molde', 24, 4);
// Sala de Fundición: hornos contra la pared de arriba, yunques y moldes abajo (la ronda va por la fila 18)
for (const x of [6, 12, 26, 32]) horno(x, 15);
canal(4, 35, 20);
deco('yunque', 9, 21); deco('molde', 15, 21); deco('molde', 24, 21); deco('yunque', 30, 21);
deco('crisol', 4, 17); deco('pila_escoria', 35, 17);
// Galería de los Moldes (la cuba 2 está en 27,33)
for (const x of [11, 13, 15, 23, 31]) deco('molde', x, 31);
deco('caja', 10, 36); deco('caja', 33, 36); deco('pila_escoria', 33, 30); deco('yunque', 14, 35); deco('crisol', 22, 35);
// El Foso: montañas de escoria en las esquinas (la ronda del gólem va por 11..28 × 40..44)
deco('pila_escoria', 9, 46); deco('pila_escoria', 30, 39); deco('pila_escoria', 9, 42); deco('pila_escoria', 30, 43);
// Cámara de Morvak: su forja detrás de él
horno(10, 49); horno(28, 51);
deco('yunque', 23, 53); deco('molde', 16, 50); deco('molde', 24, 50); deco('crisol', 12, 55); deco('caja', 27, 56);

// ---------------------------------------------------------------- puntos
const KEY = { brasero: [], guardian: [] };
const vuelta = [prop('destino', 'string', 'volcan'), prop('x', 'int', VOLCAN_VUELTA.x), prop('y', 'int', VOLCAN_VUELTA.y), prop('etiqueta', 'string', 'Volcán Rojo')];
pt({ name: 'salida_volcan', type: 'salida', x: px(18), y: px(3), width: 128, height: 32, properties: vuelta });
pt({ name: 'salida_forja', type: 'salida', x: px(28), y: px(49), width: 64, height: 32, properties: vuelta });
// cubas de control (orden 1 y 2): al volcarlas, si caes o sales, retomas desde ahí
const cuba = (orden, x, y, nombre) => { KEY.brasero.push({ orden, x, y }); pt({ name: `brasero_${orden}`, type: 'brasero', x: px(x), y: px(y), properties: [prop('orden', 'int', orden), prop('etiqueta', 'string', nombre)] }); };
cuba(1, 13, 9, 'Cuba de la Entrada');
cuba(2, 27, 33, 'Cuba del Puente');
// guardianes con su ronda (casillas separadas por ";", van y vuelven o dan la vuelta)
const guardian = (id, monstruo, ruta, vueltaRonda = false) => {
  const [x, y] = ruta[0];
  KEY.guardian.push({ id, ruta });
  pt({ name: id, type: 'guardian', x: px(x) + 16, y: px(y) + 16, properties: [prop('monstruo', 'string', monstruo), prop('ruta', 'string', ruta.map((p) => p.join(',')).join(';')), prop('vuelta', 'bool', vueltaRonda)] });
};
guardian('fundidor', 'FISURA_FUNDIDOR', [[6, 18], [33, 18]]);
guardian('diablillos', 'FISURA_DIABLILLO', [[8, 26], [31, 26]]);
guardian('golem_foso', 'FISURA_GOLEM_ESCORIA', [[11, 40], [28, 40], [28, 44], [11, 44]], true);
// Portón de la Forja (4x2 casillas) y Morvak frente a su forja
pt({ name: 'porton_forja', type: 'sello', x: px(18), y: px(47), width: 128, height: 64, properties: [] });
pt({ name: 'morvak', type: 'vigia', x: px(19) + 32, y: px(53) + 16, properties: [prop('monstruo', 'string', 'FISURA_MORVAK'), prop('etiqueta', 'string', 'Morvak, el Forjador de Eclipses')] });
// luces: braseros de las paredes, las bocas de los hornos y el brillo de la lava
torches.forEach(([x, y], i) => pt({ name: `brasero_pared_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 14, properties: [prop('tipo', 'string', 'antorcha')] }));
for (const [x, y] of [[7, 16], [13, 16], [27, 16], [33, 16], [11, 50], [29, 52]]) {
  pt({ name: `horno_${x}_${y}`, type: 'luz', x: px(x), y: px(y) + 16, properties: [prop('tipo', 'string', 'fogata')] });
}
for (const [x, y] of [[8, 26], [20, 26], [31, 26]]) pt({ name: `lava_${x}`, type: 'luz', x: px(x), y: px(y), properties: [prop('tipo', 'string', 'antorcha')] });

const subzones = [
  { name: 'Entrada', x0: 13, y0: 3, x1: 26, y1: 14 },
  { name: 'Sala de Fundición', x0: 4, y0: 15, x1: 35, y1: 23 },
  { name: 'Puente de Escoria', x0: 4, y0: 24, x1: 35, y1: 29 },
  { name: 'Galería de los Moldes', x0: 10, y0: 30, x1: 33, y1: 38 },
  { name: 'El Foso', x0: 9, y0: 39, x1: 30, y1: 48 },
  { name: 'Cámara de Morvak', x0: 7, y0: 49, x1: 32, y1: 58 },
  { name: 'La Fisura Infernal', x0: 0, y0: 0, x1: W - 1, y1: H - 1 },
].map((s, i, all) => ({ ...s, levels: i === all.length - 1 ? null : '36-42' }));

// ---------------------------------------------------------------- partir en trozos
fs.mkdirSync(outDir, { recursive: true });
const terrainCodes = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) terrainCodes.push(Math.max(0, TERRENOS.indexOf(terrain[y][x])));
const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: CW, height: CH, data });
const tilesetRef = {
  firstgid: 1, name: 'fisura', image: '../tileset_fisura.png', imagewidth: TILESET.columns * 32,
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
// las capas "encima" se ven por arriba del héroe: comprobación rápida de que no se usó un tile de choque ahí
for (const gid of above) if (gid && META[gid]?.colision) throw new Error(`tile de choque en "encima": ${META[gid].nombre}`);
// las rondas de los guardianes y las cubas tienen que quedar sobre casillas que se pisan y sin objetos
for (const g of KEY.guardian) {
  for (const [x, y] of g.ruta) if (!freeAt(x, y)) throw new Error(`la ronda de ${g.id} pasa por una casilla ocupada (${x},${y})`);
}
for (const b of KEY.brasero) if (!freeAt(b.x, b.y)) throw new Error(`la cuba ${b.orden} está sobre una casilla ocupada (${b.x},${b.y})`);

const world = {
  // zona 3: el servidor la trata como parte del Volcán (misiones, bestiario); interior = sin cielo
  nombre: 'La Fisura Infernal', zona: 3, interior: true, mazmorra: 'fisura', musica: 'cripta', tileset: 'fisura', terrenos: TERRENOS, tile: 32,
  // arte propio de la cuba de control y del portón (public/assets/mundo/mazmorra, art/sprites/mundo/crear_fisura.lua)
  mazmorraArte: { brasero: 'cuba', puerta: 'porton_forja', luzPuerta: 0xff8a24, accion: 'Volcar' },
  chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0, gidHierba: 0,
  inicio: { x: px(19) + 32, y: px(6) + 16 },
  clima: { estacion: 'interior', lluvia: 0 },
  gids: { flores: [], agua: [], prado: [], arboles: [], dorados: [], seco: [] },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
console.log(`Fisura Infernal generada: ${W}x${H} tiles en ${chunks.length} trozos, ${points.length} puntos → ${outDir}`);
console.log(JSON.stringify(KEY));
