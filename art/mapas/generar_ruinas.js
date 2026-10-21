// Genera las RUINAS ANCESTRALES (zona 7) como un mundo de 4x4 trozos de 40x30 tiles, al aire libre y EN el
// continente (etheria.json: x 160, y 90; al sur quedan las Montañas, al este la Tundra):
//   public/assets/mundo/ruinas/chunk_<cx>_<cy>.json  (mapas de Tiled, uno por trozo)
//   public/assets/mundo/ruinas/mundo.json            (índice: trozos, subzonas, inicio)
// Todo el borde es el Velo de Aethra (niebla que choca). Se entra por un solo hueco: la Puerta del Velo, al
// sur, frente al paso que se abrió en las Montañas (casillas 63-65 del borde norte del Pinar Nevado). Hasta
// la R1 una niebla (punto "escena" con fase) tapa ese hueco. El otro camino es la escalera de la Cripta de
// los Heraldos, que baja al Trono de Huesos (R4). Después del final (la R14) se abre un segundo hueco: el Paso
// de las Cumbres, en el borde este, que cruza a la Tundra por un puente de hielo (generar_tundra.js).
// Diseño completo en gprback/docs/zona7_ruinas.md.
//
// Diseño (norte arriba), una subzona por trozo:
//   Torres del Velo · Observatorio Roto · Corazón del Templo (el Séptimo Sello) · Grieta Estelar
//   Bosque Petrificado · Patio de las Estatuas · Templo Sagrado · Jardines de las Lágrimas
//   Escalinata de los Peregrinos · Santuario de las Lágrimas (la ciudad) · Cripta de los Heraldos · Lago
//   Campo de los Vigías · Puerta del Velo (la entrada) · Cantera de Mármol · Camino de las Cumbres
// El prado de las Ruinas es el suelo de base; encima van el mármol del templo, la calzada, el agua de
// lágrimas, el cielo estelar de la Grieta y las paredes del templo. Las casillas del suelo salen de las
// MISMAS reglas que el editor de mapas (src/editor/rules.js).
//
// Uso: node art/mapas/generar_ruinas.js   (con --preview además deja ruinas_preview.json)
//
// OJO: desde que existe el editor de mapas (página /editor del juego), el mapa guardado manda. Si la
// zona ya se editó a mano el generador no la pisa, salvo con --forzar (se pierde lo editado).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

// Lo que ya está, por tandas (ver zona7_ruinas.md): los combates y los jefes (tanda 2).
const COMBATES_LISTOS = true;

const outDir = path.join(__dirname, '../../public/assets/mundo/ruinas');
try {
  const prev = JSON.parse(fs.readFileSync(path.join(outDir, 'mundo.json'), 'utf8'));
  if (prev.editado && !process.argv.includes('--forzar')) {
    console.error('Las Ruinas ya se editaron con el editor de mapas: no las piso. Usa --forzar para regenerarlas igual (pierdes lo editado).');
    process.exit(1);
  }
} catch { /* primera vez */ }

const TILESET = require('../sprites/mundo/tileset_pradera.json');
try {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites/mundo/tileset_pradera.ajustes.json'), 'utf8'));
  for (const t of TILESET.tiles) if (ajustes[t.nombre]) Object.assign(t, ajustes[t.nombre]);
} catch { /* sin ajustes */ }
// tipos de terreno lógico de esta zona (el editor arma los bordes con ellos, ver src/editor/rules.js)
const TERRENOS = ['prador', 'marmol', 'caminom', 'losaoro', 'sagrada', 'lagrima', 'puenter', 'cielo', 'murot', 'velo'];
const T = Object.fromEntries(TILESET.tiles.map((t) => [t.nombre, t.id + 1]));
const CW = 40;
const CH = 30;
const COLS = 4;
const ROWS = 4;
const W = CW * COLS;
const H = CH * ROWS;

// ---------------------------------------------------------------- azar con semilla y ruido suave
let seed = 20261021;
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
const terrain = Array.from({ length: H }, () => new Array(W).fill('prador'));
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
// un recinto de paredes del templo con su piso de mármol (las puertas se abren después)
const enclosure = (x0, y0, x1, y1, floor = 'marmol') => {
  rectT(x0, y0, x1, y1, 'murot');
  rectT(x0 + 1, y0 + 2, x1 - 1, y1 - 1, floor);
};

// sitios importantes (en tiles; las casillas de NPCs, salidas y refugios se repiten en el back cuando hagan
// falta: lib/cercania.js, lib/questSteps.js y lib/exploracion.js). Los NPCs van en la tanda 4.
const P = {
  // la Puerta del Velo: el hueco del borde sur, frente al paso abierto en las Montañas (x 63-65)
  puerta: { x: 63, y: 113 },
  // el Santuario de las Lágrimas: el altar de Seraphine, la fuente, las casas, la posada y la forja
  santuario: { x: 60, y: 75 }, altar: { x: 59, y: 66 }, fuente: { x: 59, y: 74 }, spawn: { x: 60, y: 80 },
  posada: { x: 44, y: 66 }, forja: { x: 71, y: 66 }, casa1: { x: 45, y: 79 }, casa2: { x: 70, y: 79 },
  escalinataSantuario: { x: 66, y: 84 },
  // el templo: el Templo Sagrado, el Corazón del Templo (el Séptimo Sello) y la Cripta de los Heraldos
  templo: { x: 100, y: 45 }, sello: { x: 99, y: 12 }, heraldos: { x: 98, y: 64 },
  // afuera
  telescopio: { x: 58, y: 10 }, patio: { x: 60, y: 45 }, lago: { x: 140, y: 75 }, jardines: { x: 140, y: 45 },
  grieta: { x: 140, y: 15 }, torres: { x: 20, y: 15 }, bosque: { x: 20, y: 45 }, escalinata: { x: 20, y: 75 },
  campo: { x: 20, y: 105 }, cantera: { x: 100, y: 105 }, cumbres: { x: 140, y: 105 },
  // el Paso de las Cumbres: el hueco del borde este (filas 88-90) hacia la Tundra, que se abre con la R14
  pasoCumbres: { x: 151, y: 88 },
  tumbaVacia: { x: 21, y: 101 },
};

// 1) el Velo: todo el borde del mapa (3 casillas, con jirones hacia adentro), salvo el hueco de la Puerta
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
  const n = valueNoise(x, y, 4, 11);
  if (edge < 3 || (edge < 6 && n > 0.62)) setT(x, y, 'velo');
}
rectT(P.puerta.x, P.puerta.y + 2, P.puerta.x + 2, H - 1, 'prador');

// 2) los lugares
// el Santuario de las Lágrimas: una plaza de losas de oro rodeada de prado, con una calzada a la Puerta
rectT(40, 62, 79, 88, 'prador');
blobT(P.santuario.x, P.santuario.y, 15, 11, 'marmol', 0.25, 21);
rectT(52, 70, 68, 82, 'losaoro');
// el Templo Sagrado y el Corazón del Templo: dos recintos de paredes unidos por una puerta
enclosure(84, 32, 116, 57);
blobT(100, 45, 9, 6, 'losaoro', 0.15, 22, ['marmol']);
enclosure(86, 3, 113, 26, 'losaoro');
rectT(91, 8, 108, 21, 'marmol');
// la Cripta de los Heraldos: una sala baja, con la escalera al Trono de Huesos al fondo
enclosure(86, 61, 113, 84);
// el Patio de las Estatuas: mármol y losas de oro al aire libre
blobT(P.patio.x, P.patio.y, 16, 11, 'marmol', 0.3, 23);
rectT(50, 40, 70, 50, 'losaoro');
// el Observatorio Roto: una terraza de mármol con el telescopio
blobT(P.telescopio.x + 1, P.telescopio.y + 2, 13, 8, 'marmol', 0.3, 24);
// la Grieta Estelar: el suelo roto, con islas de prado unidas por calzadas
blobT(P.grieta.x, P.grieta.y, 15, 10, 'cielo', 0.45, 25, ['prador']);
blobT(P.grieta.x - 6, P.grieta.y - 3, 3, 2, 'prador', 0.3, 26);
blobT(P.grieta.x + 7, P.grieta.y + 4, 3, 2, 'prador', 0.3, 27);
blobT(144, 8, 2, 2, 'prador', 0.3, 28);
// los Jardines de las Lágrimas: arroyos que nacen de una fuente y bajan al Lago
stroke([[132, 34], [136, 42], [140, 47], [146, 54], [144, 60]], 1, 'lagrima', ['prador'], 0.8);
stroke([[150, 36], [148, 44], [140, 47]], 1, 'lagrima', ['prador'], 0.6);
// el Lago de las Lágrimas, con dos islas
blobT(P.lago.x, P.lago.y, 13, 9, 'lagrima', 0.35, 31, ['prador']);
blobT(P.lago.x - 4, P.lago.y + 1, 3, 2, 'prador', 0.2, 32, ['lagrima']);
blobT(P.lago.x + 6, P.lago.y - 3, 2, 2, 'prador', 0.2, 33, ['lagrima']);
// la Cantera de Mármol: mármol a la vista y bloques sueltos
blobT(P.cantera.x, P.cantera.y, 13, 8, 'marmol', 0.5, 34);
// las Torres del Velo: la niebla se mete entre las torres
blobT(P.torres.x - 3, P.torres.y + 6, 5, 3, 'velo', 0.5, 35, ['prador']);
// el Camino de las Cumbres: el Velo sube por las cumbres hacia la Tundra
blobT(P.cumbres.x + 10, P.cumbres.y - 4, 6, 6, 'velo', 0.5, 36, ['prador']);

// 3) la calzada de mármol que une todo (desde la Puerta del Velo)
const calzadas = [
  [[64, 115], [64, 100], [62, 88]],                     // Puerta → Santuario
  [[60, 62], [60, 56]],                                 // Santuario → Patio
  [[60, 34], [60, 24], [59, 18]],                       // Patio → Observatorio
  [[76, 45], [84, 45]],                                 // Patio → Templo Sagrado (puerta oeste)
  [[100, 57], [100, 61]],                               // Templo Sagrado → Cripta de los Heraldos
  [[100, 32], [100, 26]],                               // Templo Sagrado → Corazón del Templo
  [[44, 45], [30, 46], [20, 45]],                       // Patio → Bosque Petrificado
  [[20, 45], [20, 30], [20, 20]],                       // Bosque → Torres del Velo
  [[40, 75], [30, 76], [20, 75]],                       // Santuario → Escalinata de los Peregrinos
  [[20, 75], [20, 90], [20, 102]],                      // Escalinata → Campo de los Vigías
  [[64, 100], [80, 102], [100, 104]],                   // Puerta → Cantera
  [[100, 104], [120, 104], [138, 104]],                 // Cantera → Camino de las Cumbres
  [[79, 75], [86, 72]],                                 // Santuario → Cripta de los Heraldos (puerta oeste)
  [[116, 45], [128, 45], [138, 46]],                    // Templo Sagrado → Jardines (puerta este)
  [[140, 50], [142, 60], [140, 66]],                    // Jardines → Lago
  [[138, 104], [138, 92], [134, 84]],                   // Cumbres → Lago (orilla sur)
  [[110, 12], [120, 13], [134, 12]],                    // Corazón del Templo → Grieta (puerta este)
  [[72, 10], [86, 12]],                                 // Observatorio → Corazón del Templo (puerta oeste)
];
for (const c of calzadas) {
  for (let i = 0; i < c.length - 1; i++) {
    const [x1, y1] = c[i];
    const [x2, y2] = c[i + 1];
    const steps = Math.ceil(dist(x1, y1, x2, y2) * 2);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const cx = Math.round(x1 + (x2 - x1) * f);
      const cy = Math.round(y1 + (y2 - y1) * f);
      for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) {
        const t = at(cx + dx, cy + dy);
        if (t === 'prador' || t === 'velo') setT(cx + dx, cy + dy, 'caminom');
        else if (t === 'murot') setT(cx + dx, cy + dy, 'marmol');
        else if (t === 'lagrima') setT(cx + dx, cy + dy, 'puenter');
        else if (t === 'cielo') setT(cx + dx, cy + dy, 'puenter');
      }
    }
  }
}
// sobre el cielo estelar no hay puentes de mármol: el camino es piedra flotante (prado)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(x, y) !== 'puenter') continue;
  const nearSky = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => at(x + dx, y + dy) === 'cielo');
  const nearTear = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => at(x + dx, y + dy) === 'lagrima');
  if (nearSky && !nearTear) setT(x, y, 'caminom');
}
// el borde del mapa, siempre Velo (salvo el hueco de la Puerta)
for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) if (!(y >= H - 2 && x >= P.puerta.x && x <= P.puerta.x + 2)) setT(x, y, 'velo');
for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) setT(x, y, 'velo');
// el hueco de la Puerta: tres casillas de calzada hasta el borde (del otro lado, el paso de las Montañas)
rectT(P.puerta.x, P.puerta.y, P.puerta.x + 2, H - 1, 'caminom');
// el Paso de las Cumbres (el hueco del borde este hacia la Tundra) se abre al final, en main(): ver más abajo

// subzonas: nombre y niveles al entrar (la primera que contenga al héroe gana)
const subzones = [
  { name: 'Santuario de las Lágrimas', x0: 40, y0: 60, x1: 79, y1: 89, levels: null, safe: true },
  { name: 'Puerta del Velo', x0: 40, y0: 90, x1: 79, y1: 119, levels: '86-87' },
  { name: 'Campo de los Vigías', x0: 0, y0: 90, x1: 39, y1: 119, levels: '87-89' },
  { name: 'Escalinata de los Peregrinos', x0: 0, y0: 60, x1: 39, y1: 89, levels: '88-90' },
  { name: 'Cantera de Mármol', x0: 80, y0: 90, x1: 119, y1: 119, levels: '88-90' },
  { name: 'Camino de las Cumbres', x0: 120, y0: 90, x1: 159, y1: 119, levels: '89-91' },
  { name: 'Bosque Petrificado', x0: 0, y0: 30, x1: 39, y1: 59, levels: '90-92' },
  { name: 'Cripta de los Heraldos', x0: 80, y0: 60, x1: 119, y1: 89, levels: '90-92' },
  { name: 'Patio de las Estatuas', x0: 40, y0: 30, x1: 79, y1: 59, levels: '91-93' },
  { name: 'Lago de las Lágrimas', x0: 120, y0: 60, x1: 159, y1: 89, levels: '91-93' },
  { name: 'Jardines de las Lágrimas', x0: 120, y0: 30, x1: 159, y1: 59, levels: '92-94' },
  { name: 'Torres del Velo', x0: 0, y0: 0, x1: 39, y1: 29, levels: '93-95' },
  { name: 'Observatorio Roto', x0: 40, y0: 0, x1: 79, y1: 29, levels: '93-95' },
  { name: 'Templo Sagrado', x0: 80, y0: 30, x1: 119, y1: 59, levels: '94-96' },
  { name: 'Grieta Estelar', x0: 120, y0: 0, x1: 159, y1: 29, levels: '96-98' },
  { name: 'Corazón del Templo', x0: 80, y0: 0, x1: 119, y1: 29, levels: '98-100' },
  { name: 'Ruinas Ancestrales', x0: 0, y0: 0, x1: 159, y1: 119, levels: '86-100' },
];
const subzoneAt = (x, y) => subzones.find((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);

// 4) hierba sagrada (encuentros) por subzona: pocos grupos y bien poblados
const encounterAreas = [];
const POBLAR = {
  'Puerta del Velo': { n: 2, mons: [['PEREGRINO_PIEDRA', 'PEREGRINO_PIEDRA'], ['PEREGRINO_PIEDRA', 'GRIFO_TEMPLO']], names: ['Los que Esperan', 'Escalones de la Puerta'] },
  'Campo de los Vigías': { n: 2, mons: [['GRIFO_TEMPLO', 'GRIFO_TEMPLO'], ['GUARDIAN_RUINAS', 'GRIFO_TEMPLO']], names: ['Las Tumbas', 'Nido de Grifos'] },
  'Escalinata de los Peregrinos': { n: 2, mons: [['PEREGRINO_PIEDRA', 'GUARDIAN_RUINAS'], ['GUARDIAN_RUINAS', 'GUARDIAN_RUINAS']], names: ['Peldaños Rotos', 'Los Penitentes'] },
  'Cantera de Mármol': { n: 3, mons: [['GUARDIAN_RUINAS', 'GRIFO_TEMPLO'], ['GUARDIAN_RUINAS', 'COLOSO_MARMOL'], ['GRIFO_TEMPLO', 'GRIFO_TEMPLO']], names: ['Bloques Caídos', 'El Coloso', 'Andamios'] },
  'Camino de las Cumbres': { n: 2, mons: [['SERPIENTE_LAGRIMAS', 'GRIFO_TEMPLO'], ['GUARDIAN_RUINAS', 'SERPIENTE_LAGRIMAS']], names: ['Las Cumbres', 'Paso Nublado'] },
  'Bosque Petrificado': { n: 3, mons: [['CENTINELA_ANTIGUO', 'CENTINELA_ANTIGUO'], ['CENTINELA_ANTIGUO', 'GRIFO_TEMPLO'], ['CENTINELA_ANTIGUO', 'GUARDIAN_RUINAS']], names: ['Árboles de Piedra', 'Claro Mudo', 'Las Raíces'] },
  'Cripta de los Heraldos': { n: 2, mons: [['HERALDO_OLVIDADO', 'HERALDO_OLVIDADO'], ['HERALDO_OLVIDADO', 'CENTINELA_ANTIGUO']], names: ['Los Heraldos', 'Nichos de Trompetas'] },
  'Patio de las Estatuas': { n: 3, mons: [['CENTINELA_ANTIGUO', 'GUARDIAN_FUEGO_ANCESTRAL'], ['GUARDIAN_FUEGO_ANCESTRAL', 'COLOSO_MARMOL'], ['CENTINELA_ANTIGUO', 'HERALDO_OLVIDADO']], names: ['Las Estatuas', 'Fuego del Patio', 'Los Que Vigilan'] },
  'Lago de las Lágrimas': { n: 3, mons: [['SERPIENTE_LAGRIMAS', 'SERPIENTE_LAGRIMAS'], ['GUARDIAN_AGUA_ANCESTRAL', 'SERPIENTE_LAGRIMAS'], ['SERPIENTE_LAGRIMAS', 'HERALDO_OLVIDADO']], names: ['Orilla Clara', 'Aguas Hondas', 'Los Juncos'] },
  'Jardines de las Lágrimas': { n: 3, mons: [['GUARDIAN_HIELO_ANCESTRAL', 'SERPIENTE_LAGRIMAS'], ['GUARDIAN_AGUA_ANCESTRAL', 'GUARDIAN_HIELO_ANCESTRAL'], ['SERPIENTE_LAGRIMAS', 'SERPIENTE_LAGRIMAS']], names: ['Los Arroyos', 'Flores de Luz', 'La Fuente Vieja'] },
  'Torres del Velo': { n: 3, mons: [['ESTRELLA_CAIDA', 'ESTRELLA_CAIDA'], ['ESTRELLA_CAIDA', 'HERALDO_OLVIDADO'], ['ESTRELLA_CAIDA', 'CENTINELA_ANTIGUO']], names: ['Pie de las Torres', 'Estrellas Caídas', 'La Niebla'] },
  'Observatorio Roto': { n: 2, mons: [['ESTRELLA_CAIDA', 'HERALDO_OLVIDADO'], ['ESTRELLA_CAIDA', 'ESTRELLA_CAIDA']], names: ['Terraza del Telescopio', 'Lentes Rotas'] },
  'Templo Sagrado': { n: 3, mons: [['ENGENDRO_DEVORADOR', 'HERALDO_OLVIDADO'], ['ENGENDRO_DEVORADOR', 'ENGENDRO_DEVORADOR'], ['ESTRELLA_CAIDA', 'ENGENDRO_DEVORADOR']], names: ['La Nave', 'Columnas Negras', 'El Coro'] },
  'Grieta Estelar': { n: 3, mons: [['OJO_ERRANTE', 'ENGENDRO_DEVORADOR'], ['OJO_ERRANTE', 'OJO_ERRANTE'], ['OJO_ERRANTE', 'AVATAR_ECLIPSE']], names: ['Islas Flotantes', 'Los Ojos', 'Borde del Cielo'] },
  'Corazón del Templo': { n: 2, mons: [['AVATAR_ECLIPSE', 'ENGENDRO_DEVORADOR'], ['OJO_ERRANTE', 'AVATAR_ECLIPSE']], names: ['Antes del Sello', 'Los Últimos'] },
};
const AREA_BAD = ['murot', 'lagrima', 'cielo', 'velo', 'puenter', 'losaoro'];
const AREA_LAND = ['prador', 'marmol', 'caminom'];
// lugares donde no van grupos de monstruos (la Puerta, el sello, la escalera, el telescopio)
const KEEP_AWAY = [{ x: P.puerta.x + 1, y: P.puerta.y + 2 }, { x: P.sello.x + 1, y: P.sello.y + 1 }, { x: P.heraldos.x + 1, y: P.heraldos.y + 2 }, { x: P.telescopio.x + 1, y: P.telescopio.y + 2 }];
const areaFits = (x, y, w, h, zone, minLand) => {
  if (x < 6 || y < 6 || x + w > W - 6 || y + h > H - 6) return false;
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
// la hierba sagrada se pinta sobre el prado y el mármol de cada grupo
for (const a of encounterAreas) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  for (let y = a.y - 1; y <= a.y + a.h; y++) for (let x = a.x - 1; x <= a.x + a.w; x++) {
    const d = ((x - cx) / (a.w / 2)) ** 2 + ((y - cy) / (a.h / 2)) ** 2;
    const n = valueNoise(x, y, 4, 171);
    if (['prador', 'marmol'].includes(at(x, y)) && d <= 0.95 + (n - 0.5) * 0.9 && valueNoise(x, y, 2, 173) > 0.2) setT(x, y, 'sagrada');
  }
}

// ---------------------------------------------------------------- capas de tiles
async function main() {
  const tmp = path.join(os.tmpdir(), `rules_ruinas_${process.pid}.mjs`);
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
  const okGround = (x, y) => ['prador', 'marmol', 'losaoro', 'caminom'].includes(at(x, y));
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
  // las fuentes de lágrimas son los refugios (reapareces ahí si caes): una por subzona
  const refuge = (x, y) => { placeGrid('fuente_lagrimas', 2, 2, x, y); lights.push([x, y, 'fogata']); };
  const near = (cx, cy, w, h, pad, ok = okGround, rMax = 7) => {
    for (let r = 0; r <= rMax; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!isReserved(cx + dx, cy + dy) && areaFree(cx + dx, cy + dy, w, h, pad, ok)) return [cx + dx, cy + dy];
    }
    return null;
  };

  // el Santuario de las Lágrimas: todo en ruinas al principio (las casas restauradas se dibujan encima con
  // puntos "escena" con fase, ver más abajo)
  function placeTown() {
    placeGrid('altar_santuario', 2, 2, P.altar.x, P.altar.y);
    placeGrid('fuente_seca', 2, 2, P.fuente.x, P.fuente.y);
    placeGrid('ruina_posada', 4, 3, P.posada.x, P.posada.y);
    placeGrid('ruina_forja', 3, 3, P.forja.x, P.forja.y);
    placeGrid('ruina_casa', 3, 3, P.casa1.x, P.casa1.y);
    placeGrid('ruina_casa', 3, 3, P.casa2.x, P.casa2.y);
    for (const [x, y] of [[53, 71], [67, 71], [53, 81], [67, 81]]) one('farol_templo', x, y, 'farol');
    for (const [x, y] of [[50, 74], [69, 74]]) placeGrid('columna_rota_m', 1, 2, x, y);
    one('escalinata_luz', P.escalinataSantuario.x, P.escalinataSantuario.y);
    for (const [x, y] of [[56, 84], [63, 84]]) one('banco_marmol', x, y);
  }
  placeTown();
  reserve(40, 60, 79, 89);

  // la Puerta del Velo (se pasa por la columna del medio)
  placeGrid('puerta_velo', 3, 3, P.puerta.x, P.puerta.y);
  reserve(P.puerta.x - 2, P.puerta.y - 2, P.puerta.x + 4, H - 1);
  // la escalera de la Cripta de los Heraldos al Trono de Huesos
  placeGrid('escalera_heraldos', 3, 3, P.heraldos.x, P.heraldos.y);
  reserve(P.heraldos.x - 2, P.heraldos.y - 1, P.heraldos.x + 4, P.heraldos.y + 5);
  // el Corazón del Templo: el altar del Séptimo Sello, con estatuas de Aethra alrededor
  placeGrid('altar_sello', 2, 2, P.sello.x, P.sello.y);
  reserve(P.sello.x - 4, P.sello.y - 3, P.sello.x + 5, P.sello.y + 5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.round(P.sello.x + 0.5 + Math.cos(a) * 8);
    const y = Math.round(P.sello.y + Math.sin(a) * 5) - 1;
    if (areaFree(x, y, 1, 2)) placeGrid('estatua_aethra', 1, 2, x, y);
  }
  // el Observatorio Roto: el telescopio (la puerta de la mazmorra está debajo, ver los puntos)
  placeGrid('telescopio_roto', 3, 3, P.telescopio.x, P.telescopio.y);
  reserve(P.telescopio.x - 2, P.telescopio.y - 1, P.telescopio.x + 4, P.telescopio.y + 5);
  // el Templo Sagrado: dos filas de columnas y un altar en el medio
  for (let x = 88; x <= 112; x += 4) for (const y of [36, 51]) if (Math.abs(x - 100) > 3 && areaFree(x, y, 1, 2)) placeGrid('columna_rota_m', 1, 2, x, y);
  for (const [x, y] of [[90, 44], [110, 44]]) if (areaFree(x, y, 1, 2)) placeGrid('estatua_aethra', 1, 2, x, y);
  for (const [x, y] of [[96, 41], [104, 41]]) if (areaFree(x, y, 1, 2)) placeGrid('cristal_eclipse_g', 1, 2, x, y);
  // la Cripta de los Heraldos: tumbas a los lados y estatuas de los Vigías
  for (let x = 89; x <= 110; x += 3) for (const y of [70, 80]) if (!isReserved(x, y) && free(x, y) && okGround(x, y)) one('tumba_vigia', x, y);
  for (const [x, y] of [[88, 74], [111, 74]]) if (areaFree(x, y, 1, 2)) placeGrid('estatua_vigia', 1, 2, x, y);
  // el Patio de las Estatuas: estatuas de Aethra y de los Vigías en filas, y un arco al templo
  for (let x = 48; x <= 72; x += 6) for (const y of [36, 52]) {
    const name = (x / 6) % 2 === 0 ? 'estatua_aethra' : 'estatua_vigia';
    if (!isReserved(x, y) && areaFree(x, y, 1, 2)) placeGrid(name, 1, 2, x, y);
  }
  if (areaFree(76, 43, 3, 2, 0, (a, b) => ['marmol', 'caminom', 'prador', 'losaoro'].includes(at(a, b)))) placeGrid('arco_templo', 3, 2, 76, 43);
  // las Torres del Velo
  for (const [x, y] of [[8, 6], [26, 8], [14, 18], [30, 20]]) { const s = near(x, y, 2, 4, 1); if (s) { placeGrid('torre_velo', 2, 4, s[0], s[1]); reserve(s[0] - 1, s[1] - 1, s[0] + 2, s[1] + 4); } }
  // el Bosque Petrificado
  for (let i = 0; i < 26; i++) {
    const x = 6 + Math.floor(rand() * 30);
    const y = 32 + Math.floor(rand() * 26);
    if (!isReserved(x, y) && at(x, y) === 'prador' && areaFree(x, y, 2, 2, 1, (a, b) => at(a, b) === 'prador')) placeGrid('arbol_piedra', 2, 2, x, y);
  }
  // la Grieta Estelar: cristales del eclipse en las islas
  for (const [x, y] of [[133, 11], [147, 18], [143, 8]]) { const s = near(x, y, 1, 2, 0); if (s) placeGrid('cristal_eclipse_g', 1, 2, s[0], s[1]); }
  // el Campo de los Vigías: tumbas en filas; la del primer Vigía, abierta y vacía
  for (let y = 96; y <= 112; y += 4) for (let x = 8; x <= 32; x += 4) {
    if (x === P.tumbaVacia.x && y === P.tumbaVacia.y) continue;
    if (!isReserved(x, y) && free(x, y) && okGround(x, y) && at(x, y) !== 'caminom') one('tumba_vigia', x, y);
  }
  one('tumba_vacia', P.tumbaVacia.x, P.tumbaVacia.y);
  reserve(P.tumbaVacia.x - 1, P.tumbaVacia.y - 1, P.tumbaVacia.x + 1, P.tumbaVacia.y + 2);
  for (const [x, y] of [[6, 94], [34, 94]]) { const s = near(x, y, 1, 2, 0); if (s) placeGrid('estatua_vigia', 1, 2, s[0], s[1]); }
  // la Cantera de Mármol: bloques sueltos y columnas a medio tallar
  for (let i = 0; i < 18; i++) {
    const x = 88 + Math.floor(rand() * 26);
    const y = 96 + Math.floor(rand() * 16);
    if (!isReserved(x, y) && free(x, y) && okGround(x, y) && at(x, y) !== 'caminom') one('escombros_m', x, y);
  }
  for (const [x, y] of [[92, 100], [108, 110]]) { const s = near(x, y, 1, 2, 0); if (s) placeGrid('columna_rota_m', 1, 2, s[0], s[1]); }
  // la Escalinata de los Peregrinos: columnas a los dos lados del camino
  for (let y = 64; y <= 86; y += 6) for (const x of [16, 24]) if (!isReserved(x, y) && areaFree(x, y, 1, 2)) placeGrid('columna_rota_m', 1, 2, x, y);
  // una fuente de lágrimas (refugio) por subzona
  for (const [x, y] of [[54, 104], [12, 100], [10, 70], [96, 112], [132, 110], [10, 40], [118, 70], [52, 54], [130, 82], [126, 38], [24, 26], [46, 22], [110, 54], [126, 24], [116, 18]]) {
    const s = near(x, y, 2, 2, 1, okGround, 8);
    if (s) { refuge(s[0], s[1]); reserve(s[0] - 1, s[1] - 1, s[0] + 2, s[1] + 2); }
  }

  // ---------------------------------------------------------------- detalles sueltos
  for (let i = 0; i < 2600; i++) {
    const x = 3 + Math.floor(rand() * (W - 6));
    const y = 3 + Math.floor(rand() * (H - 6));
    if (!free(x, y) || isReserved(x, y) || !okGround(x, y) || ['losaoro', 'caminom'].includes(at(x, y))) continue;
    const z = subzoneAt(x, y)?.name;
    const r = rand();
    if (r < 0.03 && at(x, y) === 'prador' && ['Jardines de las Lágrimas', 'Lago de las Lágrimas', 'Bosque Petrificado', 'Puerta del Velo', 'Escalinata de los Peregrinos'].includes(z)) one('flor_luminosa', x, y);
    else if (r < 0.045) one('escombros_m', x, y);
    else if (r < 0.052 && at(x, y) === 'marmol') one('vasija_ofrenda', x, y);
    else if (r < 0.056 && ['Patio de las Estatuas', 'Templo Sagrado', 'Corazón del Templo'].includes(z)) one('farol_templo', x, y, 'farol');
  }
  // los caminos, los puentes, el agua, el cielo y el Velo siempre libres de decoración suelta
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    const k = y * W + x;
    if (['murot', 'puenter', 'lagrima', 'cielo', 'velo', 'caminom'].includes(t) && !isReserved(x, y)) { objects[k] = 0; above[k] = 0; }
  }
  // lo que tiene que quedar sí o sí (por si la limpieza tocó algo)
  placeTown();
  placeGrid('puerta_velo', 3, 3, P.puerta.x, P.puerta.y);
  placeGrid('escalera_heraldos', 3, 3, P.heraldos.x, P.heraldos.y);
  placeGrid('altar_sello', 2, 2, P.sello.x, P.sello.y);
  placeGrid('telescopio_roto', 3, 3, P.telescopio.x, P.telescopio.y);
  // las otras dos Escalinatas de Luz (viaje rápido, gprback/lib/escalinatas.js): el Patio de las Estatuas y las
  // Torres del Velo (la del Santuario la pone placeTown)
  for (const [k, x, y] of [['escalinataPatio', 60, 48], ['escalinataTorres', 22, 18]]) {
    const s = near(x, y, 1, 1, 0);
    if (!s) throw new Error(`no hay lugar para la escalinata cerca de ${x},${y}`);
    P[k] = { x: s[0], y: s[1] };
    one('escalinata_luz', s[0], s[1]);
  }

  const px = (n) => n * 32;
  const prop = (name, type, value) => ({ name, type, value });
  const points = [];
  const pt = (o) => points.push(o);

  // ---------------------------------------------------------------- puntos (en coordenadas de la zona, px)
  pt({ name: 'inicio', type: 'spawn', x: px(P.spawn.x), y: px(P.spawn.y) });
  // El Santuario revive con la historia (zona7_ruinas.md, sección 4): las casas restauradas se dibujan
  // ENCIMA de las ruinas con un punto "escena" (assets/mundo/escena/, art/sprites/mundo/crear_santuario.lua)
  // que solo se ve con su fase. La R5 trae a los peregrinos (casas y posada); la R9, la fuente y la forja.
  const escena = (name, sprite, x, y, w, h, fase) => pt({ name, type: 'escena', x: px(x), y: px(y), properties: [
    prop('sprite', 'string', sprite), prop('ancho', 'int', w * 32), prop('alto', 'int', h * 32), prop('solido', 'bool', true), prop('fase', 'string', fase)] });
  const R5 = 'RUINAS_HISTORIA_05_ENTIDAD';
  const R9 = 'RUINAS_HISTORIA_09_LAGRIMAS';
  escena('posada_restaurada', 'posada_santuario', P.posada.x, P.posada.y, 4, 3, R5);
  escena('casa_restaurada_1', 'casa_aethrina', P.casa1.x, P.casa1.y, 3, 3, R5);
  escena('casa_restaurada_2', 'casa_aethrina', P.casa2.x, P.casa2.y, 3, 3, R5);
  escena('forja_restaurada', 'forja_santuario', P.forja.x, P.forja.y, 3, 3, R9);
  escena('fuente_encendida', 'fuente_lagrimas', P.fuente.x, P.fuente.y, 2, 2, R9);
  // la niebla que tapa el hueco de la Puerta del Velo hasta la R1 (desde su paso 2 se abre)
  pt({ name: 'niebla_puerta', type: 'escena', x: px(P.puerta.x), y: px(H - 2), properties: [
    prop('sprite', 'string', 'niebla_velo'), prop('ancho', 'int', 96), prop('alto', 'int', 64), prop('solido', 'bool', true), prop('encima', 'bool', true),
    prop('fase', 'string', '!RUINAS_HISTORIA_01_VELO@2+,!RUINAS_HISTORIA_01_VELO')] });
  // la niebla del Velo que tapa el Paso de las Cumbres hasta el final (la R14): una por fila, porque cada
  // escena choca solo con su mitad de abajo
  for (let i = 0; i < 3; i++) {
    pt({ name: `niebla_cumbres_${i + 1}`, type: 'escena', x: px(W - 3), y: px(P.pasoCumbres.y - 1 + i), properties: [
      prop('sprite', 'string', 'niebla_velo'), prop('ancho', 'int', 96), prop('alto', 'int', 64), prop('solido', 'bool', true), prop('encima', 'bool', true),
      prop('fase', 'string', '!RUINAS_HISTORIA_14_VIGIA')] });
  }
  // la escalera de la Cripta de los Heraldos baja al Trono de Huesos (generar_trono_huesos.js); se abre en la R4
  pt({ name: 'bajada_trono', type: 'salida', x: px(P.heraldos.x + 1), y: px(P.heraldos.y + 2), width: 32, height: 32, properties: [
    prop('destino', 'string', 'trono_huesos'), prop('x', 'int', 14), prop('y', 'int', 51), prop('etiqueta', 'string', 'El Trono de Huesos'),
    prop('fase', 'string', 'RUINAS_Q4_HERALDOS_OLVIDADOS@3+|RUINAS_Q4_HERALDOS_OLVIDADOS'),
    prop('sellada', 'string', 'Una losa de mármol con siete trompetas talladas tapa la escalera. Algo frío sube desde abajo.')] });
  // ---------------------------------------------------------------- NPCs (tanda 4; diálogos en src/game/dialoguesRuinas.js)
  const npcTiles = [];
  const npcSpot = (cx, cy) => {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (free(x, y) && free(x, y - 1) && okGround(x, y) && !npcTiles.some(([a, c]) => a === x && c === y)) return [x, y];
    }
    throw new Error(`no hay lugar para un NPC cerca de ${cx},${cy}`);
  };
  const npcsPuestos = [];
  const npc = (name, nombre, cx, cy, pasea = 1, fase = null, sprite = `npc_${name}`) => {
    const [x, y] = npcSpot(cx, cy);
    npcTiles.push([x, y]);
    npcsPuestos.push(`${name} ${x},${y}`);
    pt({ name, type: 'npc', x: px(x) + 16, y: px(y) + 16, properties: [
      prop('nombre', 'string', nombre), prop('sprite', 'string', sprite), prop('dialogo', 'string', name),
      prop('etiqueta', 'string', `Hablar con ${nombre.split(',')[0]}`), prop('pasea', 'int', pasea), ...(fase ? [prop('fase', 'string', fase)] : [])] });
  };
  // el Santuario: Seraphine junto a su altar y Orin en la forja (en ruinas hasta la R9, pero ya trabaja)
  npc('seraphine', 'Seraphine, la Última Sacerdotisa', P.altar.x + 1, P.altar.y + 3, 0);
  npc('orin', 'Orin, el picapedrero', P.forja.x + 1, P.forja.y + 4, 0);
  // vuelven con los peregrinos en la R5: Madre Tilda en la posada y Casio en la plaza
  npc('tilda', 'Madre Tilda, la peregrina', P.posada.x + 2, P.posada.y + 4, 0, R5);
  npc('casio', 'Casio, el último peregrino', 56, 77, 0, R5);
  // Aldren llega cuando terminas la R7 (viene a ver la tumba vacía de su antepasado)
  npc('aldren_ruinas', 'Aldren, último de los Vigías', P.fuente.x + 4, P.fuente.y + 1, 1, 'RUINAS_HISTORIA_07_OBSERVATORIO', 'npc_anciano');
  // Ptolio, el aprendiz fantasma, afuera del Observatorio, junto al telescopio roto
  npc('ptolio', 'Ptolio, el astrónomo', P.telescopio.x + 1, P.telescopio.y + 5, 1);
  // los maestros aethrinos de las Pruebas de la Orden (gprback/docs/evoluciones_pruebas.md): esperan en el Santuario
  // desde que vuelven los peregrinos, en semicírculo alrededor de la fuente
  npc('thalor', 'Thalor, maestro de armas', P.fuente.x - 5, P.fuente.y - 2, 0, R5);
  npc('lyssandra', 'Lyssandra, maestra arcana', P.fuente.x - 3, P.fuente.y - 4, 0, R5);
  npc('eryndel', 'Eryndel, maestro arquero', P.fuente.x + 4, P.fuente.y - 4, 0, R5);
  npc('velis', 'Velis, maestra de sombras', P.fuente.x + 6, P.fuente.y - 2, 0, R5);
  npc('seren', 'Seren, maestro de la luz', P.fuente.x - 6, P.fuente.y + 2, 0, R5);
  console.log('NPCs:', npcsPuestos.join(' · '));
  // el Observatorio Roto (mazmorra, generar_observatorio.js): la puerta de bronce bajo el telescopio roto. La
  // cierra el servidor (lib/observatorio.js): se abre con la Llave del Astrolabio de Seraphine (R6)
  pt({ name: 'entrada_observatorio', type: 'salida', x: px(P.telescopio.x + 1), y: px(P.telescopio.y + 3), width: 32, height: 32, properties: [
    prop('destino', 'string', 'observatorio'), prop('x', 'int', 20), prop('y', 'int', 4), prop('etiqueta', 'string', 'El Observatorio Roto')] });
  // las Escalinatas de Luz: al pararte sobre el círculo, subes y bajas en otra (gprback/lib/escalinatas.js)
  for (const [name, k] of [['escalinata_santuario', 'escalinataSantuario'], ['escalinata_patio', 'escalinataPatio'], ['escalinata_torres', 'escalinataTorres']]) {
    pt({ name, type: 'poi', x: px(P[k].x), y: px(P[k].y), properties: [prop('etiqueta', 'string', 'La Escalinata de Luz'), prop('dialogo', 'string', name)] });
  }
  console.log('Escalinatas:', ['escalinataSantuario', 'escalinataPatio', 'escalinataTorres'].map((k) => `${P[k].x},${P[k].y}`).join(' · '));
  // luces: faroles, las fuentes de lágrimas (refugios), el Sello y el Santuario
  lights.forEach(([x, y, tipo], i) => pt({ name: `luz_${i + 1}`, type: 'luz', x: px(x) + 16, y: px(y) + 12, properties: [prop('tipo', 'string', tipo)] }));
  pt({ name: 'luz_sello', type: 'luz', x: px(P.sello.x + 1), y: px(P.sello.y) + 16, properties: [prop('tipo', 'string', 'pilar')] });
  pt({ name: 'luz_altar', type: 'luz', x: px(P.altar.x + 1), y: px(P.altar.y) + 16, properties: [prop('tipo', 'string', 'faro')] });
  // jefes de la historia: el Guardián Ancestral en la puerta oeste del Templo Sagrado, la Entidad Corrupta en
  // el medio del templo, el Centinela Cósmico en el paso al Corazón del Templo y el Gran Esqueleto del Abismo
  // delante del Séptimo Sello
  if (COMBATES_LISTOS) {
    const nearFree = (cx, cy) => {
      for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx; const y = cy + dy;
        if (free(x, y) && free(x, y - 1) && okGround(x, y)) return [x, y];
      }
      throw new Error(`no hay lugar libre cerca de ${cx},${cy}`);
    };
    const jefes = [
      ['puerta_guardian_ancestral', 'GUARDIAN_ANCESTRAL', 94, 'Desafiar al Guardián Ancestral Primordial', 89, 45],
      ['templo_entidad', 'ENTIDAD_CORRUPTA_TEMPLO', 95, 'Desafiar a la Entidad Corrupta del Templo', 100, 47],
      ['paso_centinela_cosmico', 'CENTINELA_COSMICO', 97, 'Desafiar al Centinela Cósmico', 100, 29],
      ['sello_gran_esqueleto', 'GRAN_ESQUELETO_ABISMO', 100, 'Desafiar al Gran Esqueleto del Abismo', P.sello.x + 1, P.sello.y + 5],
    ];
    const puestos = [];
    for (const [name, code, nivel, etiqueta, cx, cy] of jefes) {
      const [x, y] = nearFree(cx, cy);
      puestos.push(`${code} ${x},${y}`);
      pt({ name, type: 'jefe', x: px(x), y: px(y), properties: [prop('monstruo', 'string', code), prop('nivel', 'int', nivel), prop('etiqueta', 'string', etiqueta)] });
    }
    console.log('Jefes:', puestos.join(' · '));
  }
  // zonas de encuentro (los monstruos se ven caminando en su grupo; la hierba solo dispara si COMBATES_LISTOS)
  if (COMBATES_LISTOS) {
    encounterAreas.forEach((a) => pt({
      name: a.name, type: 'encuentro', x: px(a.x), y: px(a.y), width: px(a.w), height: px(a.h),
      properties: [prop('monstruos', 'string', a.monstruos.join(',')), prop('cantidad', 'int', Math.max(3, Math.round((a.w * a.h) / 20)))],
    }));
  }

  // ---------------------------------------------------------------- comprobaciones
  // desde la Puerta del Velo se llega caminando a cada subzona y a cada punto importante
  const walkable = (x, y) => {
    const g = ground[y * W + x];
    const o = objects[y * W + x];
    return !TILESET.tiles[g - 1]?.colision && !(o && TILESET.tiles[o - 1]?.colision);
  };
  const seen = new Uint8Array(W * H);
  const q = [[P.puerta.x + 1, H - 1]];
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

  // ---------------------------------------------------------------- recursos
  // (después de ver por dónde se camina: cada recurso queda al lado de una casilla a la que se llega)
  // cada uno tiene varios sitios posibles; el servidor elige en cuál reaparece (lib/worldNodes.js del
  // back: el id y la cantidad de sitios tienen que coincidir con gprback/lib/worldNodes.zonas.json)
  const resourceDefs = [];
  const resPoints = [];
  const floorOk = (t) => ['prador', 'marmol'].includes(t);
  function findSpot(cx, cy, r0, okFn) {
    // si no hay lugar cerca, se busca un poco más lejos
    for (let tries = 0; tries < 800; tries++) {
      const r = r0 + Math.floor(tries / 160) * 3;
      const x = Math.round(cx + (rand() * 2 - 1) * r);
      const y = Math.round(cy + (rand() * 2 - 1) * r);
      if (x < 3 || y < 3 || x > W - 4 || y > H - 4) continue;
      if (free(x, y) && free(x, y - 1) && !isReserved(x, y) && !npcTiles.some(([a, c]) => Math.abs(a - x) + Math.abs(c - y) < 2) && okFn(at(x, y)) && [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => reach(x + dx, y + dy)) && !resPoints.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 3)) return [x, y];
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
  // la Cantera y el Patio: bloques de mármol; la Cantera y las Torres: vetas de oro primordial
  resource('marmol_cantera', 'bloque_marmol', [[98, 104, 10]], 4);
  resource('marmol_patio', 'bloque_marmol', [[60, 44, 9]], 3);
  resource('oro_cantera', 'veta_oro_primordial', [[110, 100, 8]], 2);
  resource('oro_torres', 'veta_oro_primordial', [[20, 14, 9]], 3);
  // los Jardines y el Bosque Petrificado: flores luminosas (solo en el prado)
  resource('flores_jardines', 'flores_luminosas', [[140, 44, 10]], 4, (t) => t === 'prador');
  resource('flores_bosque', 'flores_luminosas', [[20, 44, 10]], 3, (t) => t === 'prador');
  // el Lago y los Jardines: fuentes de lágrimas
  resource('lagrimas_lago', 'fuente_lagrimas', [[140, 74, 10]], 3);
  resource('lagrimas_jardines', 'fuente_lagrimas', [[132, 52, 7]], 2);
  // las Torres del Velo y la Grieta Estelar: cráteres de estrella
  resource('crater_torres', 'crater_estrella', [[14, 20, 8]], 2);
  resource('crater_grieta', 'crater_estrella', [[140, 14, 10]], 4);
  // relicarios escondidos en las esquinas (el cofre de la zona)
  resource('relicario_campo', 'relicario_templo', [[32, 114, 4]], 1);
  resource('relicario_torres', 'relicario_templo', [[5, 5, 4]], 1);
  resource('relicario_jardines', 'relicario_templo', [[154, 34, 4]], 1);

  // los tres secretos (gprback/lib/exploracion.js SECRETS): detrás de la tumba vacía del primer Vigía, el
  // catalejo que Ptolio escondió en lo alto de las Torres y la primera lágrima de Aethra, en el rincón más
  // escondido de los Jardines. Quedan al lado de una casilla a la que se llega caminando (como los recursos)
  const secretos = [];
  for (const [name, x, y] of [['secreto_tumba_vacia', 24, 96], ['secreto_telescopio_ptolio', 36, 4], ['secreto_primera_lagrima', 155, 57]]) {
    const s = findSpot(x, y, 3, (t) => ['prador', 'marmol', 'caminom', 'losaoro'].includes(t));
    if (!s) throw new Error(`no hay lugar para el secreto ${name}`);
    resPoints.push(s);
    secretos.push(`${name} ${s[0]},${s[1]}`);
    pt({ name, type: 'secreto', x: px(s[0]), y: px(s[1]) });
  }
  console.log('Secretos:', secretos.join(' · '));

  const lost = [];
  for (const s of subzones.slice(0, -1)) {
    let any = false;
    for (let y = s.y0; y <= s.y1 && !any; y++) for (let x = s.x0; x <= s.x1 && !any; x++) any = reach(x, y);
    if (!any) lost.push(s.name);
  }
  for (const [name, x, y] of [['Altar del Santuario', P.altar.x + 1, P.altar.y + 2], ['Escalera de los Heraldos', P.heraldos.x + 1, P.heraldos.y + 2],
    ['Sello', P.sello.x, P.sello.y + 2], ['Telescopio', P.telescopio.x + 1, P.telescopio.y + 3], ['Tumba vacía', P.tumbaVacia.x, P.tumbaVacia.y + 1],
    ['Inicio', P.spawn.x, P.spawn.y]]) {
    if (!reach(x, y)) lost.push(name);
  }
  // los recursos también (se recogen parado al lado)
  for (const [x, y] of resPoints) if (![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => reach(x + dx, y + dy))) lost.push(`recurso ${x},${y}`);
  if (lost.length) console.warn('OJO, no se llega caminando a:', lost.join(', '));
  // el Velo tiene que cerrar todo el borde, salvo el hueco de la Puerta (el Paso de las Cumbres se abre después)
  const leaks = [];
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (walkable(x, y) && !(y === H - 1 && x >= P.puerta.x && x <= P.puerta.x + 2)) leaks.push(`${x},${y}`);
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (walkable(x, y)) leaks.push(`${x},${y}`);
  if (leaks.length) throw new Error(`el Velo tiene huecos en el borde: ${leaks.slice(0, 10).join(' ')}`);

  // ---------------------------------------------------------------- el Paso de las Cumbres (al final: sin tocar el azar)
  // Tres filas de calzada desde el Camino de las Cumbres hasta el borde este; del otro lado, el puente de hielo
  // de la Tundra (generar_tundra.js). Lo tapa la niebla del Velo hasta la R14 (los puntos "niebla_cumbres")
  const TERRENO_PASO = 'caminom';
  {
    const PX0 = P.pasoCumbres.x, PX1 = W - 1, PY0 = P.pasoCumbres.y, PY1 = P.pasoCumbres.y + 2;
    // lo que haya cerca (árboles, rocas y sus copas) se quita entero, para no dejar medio árbol
    for (let y = PY0 - 2; y <= PY1 + 2; y++) for (let x = PX0 - 1; x <= PX1 + 1; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      if (y >= PY0 && y <= PY1 && x >= PX0 && x <= PX1) setT(x, y, TERRENO_PASO);
      if (y >= PY0 - 1 && y <= PY1 + 1) { objects[y * W + x] = 0; above[y * W + x] = 0; }
    }
    // el suelo de esas casillas y sus vecinas, con un azar aparte (el del mapa ya se usó)
    let s2 = 7;
    const mathRandom2 = Math.random;
    Math.random = () => ((s2 = (s2 * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let y = PY0 - 1; y <= PY1 + 1; y++) for (let x = PX0 - 1; x <= PX1 + 1; x++) put(ground, x, y, R.groundGid(at, x, y, 0));
    Math.random = mathRandom2;
  }

  // se llega caminando desde la calzada y sale al borde
  {
    const ok = [0, 1, 2].every((i) => walkable(W - 1, P.pasoCumbres.y + i))
      && [0, 1, 2].some((i) => reach(P.pasoCumbres.x - 1, P.pasoCumbres.y + i));
    if (!ok) throw new Error('el Paso de las Cumbres no conecta con la calzada');
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
        properties: [prop('zona', 'int', 7)],
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
    nombre: 'Ruinas Ancestrales', zona: 7, musica: 'ruinas', tileset: 'pradera', terrenos: TERRENOS, tile: 32,
    chunkWidth: CW, chunkHeight: CH, columns: COLS, rows: ROWS,
    encuentroHierba: COMBATES_LISTOS ? 0.06 : 0, gidHierba: T.hierba_sagrada,
    inicio: { x: px(P.spawn.x) + 16, y: px(P.spawn.y) + 16 },
    clima: { estacion: 'verano', lluvia: 0.05 },
    // tiles que usa la fauna del ambiente: mariposas en el prado y las flores de luz, pájaros en los árboles de piedra
    gids: {
      flores: [T.prado_ruinas_flores].filter(Boolean),
      agua: [],
      prado: [T.prado_ruinas, T.prado_ruinas_b].filter(Boolean),
      arboles: [T.arbol_piedra_0_0, T.arbol_piedra_0_1].filter(Boolean),
      dorados: [],
      seco: [],
    },
    chunks,
    subzonas: subzones.map((s) => ({ ...s, x0: px(s.x0), y0: px(s.y0), x1: px(s.x1 + 1), y1: px(s.y1 + 1) })),
  };
  fs.writeFileSync(path.join(outDir, 'mundo.json'), JSON.stringify(world, null, 1));
  fs.writeFileSync(path.join(__dirname, 'recursos_ruinas.json'), JSON.stringify(resourceDefs, null, 1));
  // los recursos de la zona 7 en el back (el editor de mapas reescribe este archivo al guardar)
  const nodesFile = path.join(__dirname, '../../../gprback/lib/worldNodes.zonas.json');
  if (fs.existsSync(nodesFile)) {
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes['7'] = Object.fromEntries(resourceDefs.map((r) => [r.id, { tipo: r.tipo, sitios: r.spots }]));
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 1));
  }
  console.log('Recursos:', resourceDefs.length, 'tipos de nodo,', resourceDefs.reduce((a, r) => a + r.spots, 0), 'sitios');

  if (process.argv.includes('--preview')) {
    fs.writeFileSync(path.join(__dirname, 'ruinas_preview.json'), JSON.stringify({ w: W, h: H, ground, objects, above }));
  }
  console.log(`Ruinas generadas: ${W}x${H} tiles en ${chunks.length} trozos → ${outDir}`);
  console.log('Encuentros:', encounterAreas.length, '·', Object.keys(POBLAR).map((z) => `${z} ${encounterAreas.filter((o) => subzoneAt(o.x + o.w / 2, o.y + o.h / 2)?.name === z).length}`).join(', '));
  console.log('Luces:', lights.length, '· refugios:', lights.filter((l) => l[2] === 'fogata').length);
}
main().catch((e) => { console.error(e); process.exit(1); });
