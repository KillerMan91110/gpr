// Genera EL TRONO DE HUESOS, la mazmorra de las Catacumbas del Abismo, como una zona fuera del continente
// de 1x2 trozos de 40x30 tiles (public/assets/mundo/trono_huesos/), con su propio tileset
// (tileset_trono_huesos, ver art/sprites/mundo/crear_trono_huesos.lua). Es la corte del Lich: una sala
// del trono hecha con los huesos de los sacerdotes que traicionó. En el fondo, el Coloso de Huesos.
// El motor es el molde de gprback/lib/mazmorra.js (definición en gprback/lib/trono_huesos.js):
//   Arco de Cráneos (escalones y la Vela del Arco) → Galería del Bufón (el Bufón de Hueso salta entre las
//   estatuas) → Puente de Costillas (la Guardia Real cruza el pozo de huesos, de a dos) → Salón de las
//   Ofrendas (la Vela de las Ofrendas) → Cámara de la Doncella (la Doncella Velada da vueltas, atada) →
//   Puerta de Hueso (sellada hasta vencer a los tres guardianes) → Sala del Trono (el Coloso de Huesos).
//
// Mismo plano que la Cripta Congelada (generar_cripta_congelada.js), así las casillas de las velas, los
// guardianes, la puerta y el jefe están repetidas en gprback/lib/trono_huesos.js (el servidor comprueba
// que estés cerca): si mueves algo aquí, muévelo allá también.
//
// Uso: node art/mapas/generar_trono_huesos.js   (no pisa el Trono si ya se editó; --forzar para hacerlo)
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../public/assets/mundo/trono_huesos');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('El Trono de Huesos ya se editó con el editor de mapas: no lo piso. Usa --forzar para regenerarlo igual.');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_trono_huesos.json');
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const META = Object.fromEntries(TILESET.tiles.map((t) => [t.id + 1, t]));
const TERRENOS = ['suelo', 'muro', 'abismo', 'puente', 'puentev', 'escalera', 'tumba'];

const CW = 40;
const CH = 30;
const COLS = 1;
const ROWS = 2;
const W = CW * COLS;
const H = CH * ROWS;
const px = (t) => t * 32;
const prop = (name, type, value) => ({ name, type, value });
// la entrada del Trono en las Catacumbas es el centro de abajo del arco de cráneos (20,35); se vuelve dos casillas más abajo
const CATACUMBAS_VUELTA = { x: 20, y: 37 };

let seed = 8484;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------------------------------------------------------------- terreno lógico
const terrain = Array.from({ length: H }, () => new Array(W).fill('muro'));
const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? terrain[y][x] : 'muro');
const rectT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrain[y][x] = t; };
const floor = (t) => t !== 'muro';
const walk = (t) => t !== 'muro' && t !== 'abismo';

rectT(13, 3, 26, 11, 'suelo'); // Arco de Cráneos
rectT(18, 3, 21, 3, 'escalera'); // escalones de vuelta a las Catacumbas
rectT(18, 12, 21, 14, 'suelo'); // túnel
rectT(4, 15, 35, 21, 'suelo'); // Galería del Bufón
rectT(18, 22, 21, 23, 'suelo'); // túnel
rectT(4, 24, 35, 28, 'abismo'); // Puente de Costillas: el pozo de huesos…
rectT(4, 25, 35, 27, 'puente'); // …con el puente de costillas de lado a lado
rectT(18, 24, 21, 24, 'puentev'); // bajada al puente
rectT(18, 28, 21, 28, 'puentev'); // y salida hacia las ofrendas
rectT(18, 29, 21, 29, 'suelo'); // túnel
rectT(10, 30, 33, 36, 'suelo'); // Salón de las Ofrendas
rectT(18, 37, 21, 38, 'suelo'); // túnel
rectT(9, 39, 30, 46, 'suelo'); // Cámara de la Doncella
rectT(18, 47, 21, 48, 'suelo'); // hueco de la Puerta de Hueso
rectT(7, 49, 32, 58, 'suelo'); // Sala del Trono
rectT(17, 54, 22, 57, 'tumba');
rectT(28, 49, 29, 49, 'escalera'); // subida a las Catacumbas (al vencer al Coloso)
// bocas del pozo de huesos en la Cámara y en la sala (lejos de las rondas)
rectT(9, 39, 10, 39, 'abismo'); rectT(29, 46, 30, 46, 'abismo');
rectT(7, 57, 9, 58, 'abismo'); rectT(30, 57, 32, 58, 'abismo');

// ---------------------------------------------------------------- capas
const ground = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const put = (layer, x, y, gid) => { if (x >= 0 && x < W && y >= 0 && y < H && gid) layer[y * W + x] = gid; };
const points = [];
const pt = (o) => points.push(o);

// suelo y paredes: la pared con suelo debajo muestra su cara de piedra; el resto es techo
const velas = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = terrain[y][x];
    let gid;
    if (t === 'muro') {
      if (floor(at(x, y + 1))) {
        const glow = x % 6 === 2 && floor(at(x - 1, y + 1)) && floor(at(x + 1, y + 1));
        const r = rand();
        // los cristales de eclipse de los Ocultos están clavados más abajo, cerca del trono
        const eclipse = y > 30 ? 0.12 : 0.04;
        gid = glow ? T.pared_vela : r < eclipse ? T.pared_eclipse : r < eclipse + 0.2 ? T.pared_craneos : T.pared;
        if (glow) velas.push([x, y]);
      } else gid = T.techo;
    } else if (t === 'escalera') gid = T.escalera;
    else if (t === 'abismo') gid = walk(at(x, y - 1)) && at(x, y - 1) !== 'puente' ? T.abismo_borde : T.abismo;
    // puente ancho: baranda de costillas arriba y abajo, huesos lisos en el medio (y en las bajadas)
    else if (t === 'puente') gid = at(x, y - 1) === 'abismo' ? T.puente_n : at(x, y + 1) === 'abismo' ? T.puente_s : T.puente_c;
    else if (t === 'puentev') gid = T.puente_c;
    else if (t === 'tumba') gid = T.piso_trono;
    else if (at(x, y - 1) === 'muro') gid = T.sombra;
    else {
      const r = rand();
      const camara = y >= 39 && y <= 46;
      gid = camara && r < 0.3 ? T.suelo_huesos : r < 0.07 ? T.suelo_grieta : r < 0.16 ? T.suelo_huesos : T.suelo;
    }
    put(ground, x, y, gid);
  }
}

const freeAt = (x, y) => walk(at(x, y)) && !objects[y * W + x] && !above[y * W + x];
const deco = (name, x, y) => { if (freeAt(x, y)) put(objects, x, y, T[name]); };
// piezas de 2x2: la fila de arriba se ve sobre el héroe, la de abajo choca
const grande = (name, x, y) => {
  put(above, x, y, T[`${name}_0_0`]); put(above, x + 1, y, T[`${name}_0_1`]);
  put(objects, x, y + 1, T[`${name}_1_0`]); put(objects, x + 1, y + 1, T[`${name}_1_1`]);
};
// canal por donde corre la luz de las almas (se puede pisar)
const canal = (x0, x1, y) => { for (let x = x0; x <= x1; x++) if (at(x, y) === 'suelo') put(ground, x, y, T.canal_almas); };

// Arco de Cráneos
deco('vasija', 25, 10); deco('sarcofago', 26, 4); deco('bloque_hielo', 14, 4); deco('columna', 24, 4);
// Galería del Bufón: estatuas de los sacerdotes velados contra la pared de arriba (la ronda va por la fila 18)
for (const x of [6, 12, 26, 32]) grande('estatua', x, 15);
canal(4, 35, 20);
deco('columna', 9, 21); deco('vasija', 15, 21); deco('vasija', 24, 21); deco('columna', 30, 21);
deco('urna', 4, 17); deco('bloque_hielo', 35, 17);
// Salón de las Ofrendas (la vela 2 está en 27,33): los ataúdes abiertos de los sacerdotes
for (const x of [11, 13, 15, 23, 31]) deco(x % 2 ? 'sarcofago' : 'urna', x, 31);
deco('vasija', 10, 36); deco('vasija', 33, 36); deco('cristal', 33, 30); deco('sarcofago', 14, 35); deco('urna', 22, 35);
// Cámara de la Doncella: cristales de eclipse en las esquinas (la ronda de la doncella va por 11..28 × 40..44)
deco('cristal', 9, 46); deco('cristal', 30, 39); deco('bloque_hielo', 9, 42); deco('cristal', 30, 43);
// Sala del Trono: el trono detrás del Coloso y dos sacerdotes velados de piedra que lo custodian
grande('tumba', 19, 54);
grande('estatua', 10, 49); grande('estatua', 28, 51);
deco('cristal', 23, 53); deco('columna', 16, 50); deco('columna', 24, 50); deco('urna', 12, 55); deco('vasija', 27, 56);

// ---------------------------------------------------------------- puntos
const KEY = { brasero: [], guardian: [] };
const vuelta = [prop('destino', 'string', 'catacumbas'), prop('x', 'int', CATACUMBAS_VUELTA.x), prop('y', 'int', CATACUMBAS_VUELTA.y), prop('etiqueta', 'string', 'Catacumbas del Abismo')];
pt({ name: 'salida_catacumbas', type: 'salida', x: px(18), y: px(3), width: 128, height: 32, properties: vuelta });
pt({ name: 'salida_trono', type: 'salida', x: px(28), y: px(49), width: 64, height: 32, properties: vuelta });
// velas de control (orden 1 y 2): al encenderlas, si caes o sales, retomas desde ahí
const vela = (orden, x, y, nombre) => { KEY.brasero.push({ orden, x, y }); pt({ name: `brasero_${orden}`, type: 'brasero', x: px(x), y: px(y), properties: [prop('orden', 'int', orden), prop('etiqueta', 'string', nombre)] }); };
vela(1, 13, 9, 'Vela del Arco');
vela(2, 27, 33, 'Vela de las Ofrendas');
// guardianes con su ronda (casillas separadas por ";", van y vuelven o dan la vuelta)
const guardian = (id, monstruo, ruta, vueltaRonda = false) => {
  const [x, y] = ruta[0];
  KEY.guardian.push({ id, ruta });
  pt({ name: id, type: 'guardian', x: px(x) + 16, y: px(y) + 16, properties: [prop('monstruo', 'string', monstruo), prop('ruta', 'string', ruta.map((p) => p.join(',')).join(';')), prop('vuelta', 'bool', vueltaRonda)] });
};
guardian('bufon', 'TRONOH_BUFON', [[6, 18], [33, 18]]);
guardian('guardia', 'TRONOH_GUARDIA', [[8, 26], [31, 26]]);
guardian('doncella', 'TRONOH_DONCELLA', [[11, 40], [28, 40], [28, 44], [11, 44]], true);
// Puerta de Hueso (4x2 casillas) y el Coloso frente al trono
pt({ name: 'puerta_trono', type: 'sello', x: px(18), y: px(47), width: 128, height: 64, properties: [] });
pt({ name: 'coloso', type: 'vigia', x: px(19) + 32, y: px(53) + 16, properties: [prop('monstruo', 'string', 'TRONOH_COLOSO'), prop('etiqueta', 'string', 'el Coloso de Huesos')] });
// luces: las velas de las paredes, el canal de la galería, el pozo bajo el puente y el trono
velas.forEach(([x, y], i) => pt({ name: `vela_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 14, properties: [prop('tipo', 'string', 'faro')] }));
for (const [x, y] of [[8, 20], [20, 20], [31, 20]]) pt({ name: `canal_${x}`, type: 'luz', x: px(x), y: px(y), properties: [prop('tipo', 'string', 'farol')] });
for (const [x, y] of [[8, 26], [20, 26], [31, 26]]) pt({ name: `abismo_${x}`, type: 'luz', x: px(x), y: px(y), properties: [prop('tipo', 'string', 'faro')] });
pt({ name: 'trono', type: 'luz', x: px(20), y: px(55), properties: [prop('tipo', 'string', 'pilar')] });

const subzones = [
  { name: 'Arco de Cráneos', x0: 13, y0: 3, x1: 26, y1: 14 },
  { name: 'Galería del Bufón', x0: 4, y0: 15, x1: 35, y1: 23 },
  { name: 'Puente de Costillas', x0: 4, y0: 24, x1: 35, y1: 29 },
  { name: 'Salón de las Ofrendas', x0: 10, y0: 30, x1: 33, y1: 38 },
  { name: 'Cámara de la Doncella', x0: 9, y0: 39, x1: 30, y1: 48 },
  { name: 'Sala del Trono', x0: 7, y0: 49, x1: 32, y1: 58 },
  { name: 'El Trono de Huesos', x0: 0, y0: 0, x1: W - 1, y1: H - 1 },
].map((s, i, all) => ({ ...s, levels: i === all.length - 1 ? null : '80-84' }));

// ---------------------------------------------------------------- partir en trozos
fs.mkdirSync(outDir, { recursive: true });
const terrainCodes = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) terrainCodes.push(Math.max(0, TERRENOS.indexOf(terrain[y][x])));
const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: CW, height: CH, data });
const tilesetRef = {
  firstgid: 1, name: 'trono_huesos', image: '../tileset_trono_huesos.png', imagewidth: TILESET.columns * 32,
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
// las capas "encima" se ven por arriba del héroe: comprobación rápida de que no se usó un tile de choque ahí
for (const gid of above) if (gid && META[gid]?.colision) throw new Error(`tile de choque en "encima": ${META[gid].nombre}`);
// las rondas de los guardianes y las velas tienen que quedar sobre casillas que se pisan y sin objetos
for (const g of KEY.guardian) {
  for (const [x, y] of g.ruta) if (!freeAt(x, y)) throw new Error(`la ronda de ${g.id} pasa por una casilla ocupada (${x},${y})`);
}
for (const b of KEY.brasero) if (!freeAt(b.x, b.y)) throw new Error(`la vela ${b.orden} está sobre una casilla ocupada (${b.x},${b.y})`);

const world = {
  // zona 6: el servidor la trata como parte de las Catacumbas (misiones, bestiario); interior = sin cielo
  nombre: 'El Trono de Huesos', zona: 6, interior: true, mazmorra: 'trono_huesos', musica: 'trono_huesos', tileset: 'trono_huesos', terrenos: TERRENOS, tile: 32,
  // arte propio de la vela de control y de la puerta (public/assets/mundo/mazmorra, art/sprites/mundo/crear_trono_huesos.lua)
  mazmorraArte: { brasero: 'vela_negra', puerta: 'puerta_hueso', luzPuerta: 0xc0f6ff, accion: 'Encender' },
  chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
  encuentroHierba: 0, gidHierba: 0,
  inicio: { x: px(19) + 32, y: px(6) + 16 },
  clima: { estacion: 'interior', lluvia: 0 },
  gids: { flores: [], agua: [], prado: [], arboles: [], dorados: [], seco: [] },
  chunks,
  subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
};
fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
console.log(`Trono de Huesos generado: ${W}x${H} tiles en ${chunks.length} trozos, ${points.length} puntos → ${outDir}`);
console.log(JSON.stringify(KEY));
