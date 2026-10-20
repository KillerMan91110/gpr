// Genera el MAPA DEL MUNDO (pestaña "Mundo" del mapa, tecla M) a partir de los mapas reales de cada
// zona: lo que se ve es lo que hay. Dos pasos:
//   1) este script junta el continente: qué casilla va dónde (según public/assets/mundo/etheria.json),
//      dónde termina cada zona y sus lugares (ciudades, mazmorras, jefes, muelles y trineos), y escribe
//        public/assets/mundo/atlas/atlas.json   lo que usa el juego (zonas, subzonas y lugares)
//        art/mapas/atlas_casillas.json          la grilla de casillas para el paso 2 (no va al juego)
//   2) art/sprites/mundo/crear_atlas.lua la pinta en pixel art (public/assets/mundo/atlas/atlas.png).
// Cada vez que se agrega o se edita una zona del continente, se vuelven a correr los dos:
//   node art/mapas/generar_atlas.js
//   D:\aseprite\aseprite.exe -b --script-param dir=art/mapas --script-param png=public/assets/mundo/atlas --script art/sprites/mundo/crear_atlas.lua
const fs = require('fs');
const path = require('path');

const MUNDO = path.join(__dirname, '../../public/assets/mundo');
const OUT = path.join(MUNDO, 'atlas');
const E = JSON.parse(fs.readFileSync(path.join(MUNDO, 'etheria.json'), 'utf8'));
// mar alrededor del continente (casillas)
const MARGIN = 14;
// las mazmorras a las que se baja desde cada zona (salidas del mapa)
const MAZMORRAS = { cripta: 'La Cripta del Vigía', mina_profunda: 'La Mina Profunda', fisura: 'La Fisura Infernal', arrecife: 'El Arrecife Hundido', cripta_congelada: 'La Cripta Congelada' };
// NPCs que marcan un viaje: el barco de Rhaegar y los trineos de Skadi
const VIAJES = {
  rhaegar_puerto: ['barco', 'La Gaviota Insolente'], rhaegar_fiordo: ['barco', 'La Gaviota Insolente'],
  skadi: ['trineo', 'Trineos de Skadi'], trineo_aldea: ['trineo', 'Trineos de Kari'], trineo_campamento: ['trineo', 'Trineos de Leif'],
  barquero_coralia: ['bote', 'Botes de Marul'], barquero_cala: ['bote', 'Botes de Sargo'], barquero_cementerio: ['bote', 'Botes de Bagre'],
  balsero_rios: ['bote', 'Balsas de Pumo'], balsero_cantera: ['bote', 'Balsas de Toba'], balsero_caldera: ['bote', 'Balsas de Lapilli'],
};
const prop = (o, n) => (o.properties ?? []).find((p) => p.name === n)?.value;

// ---------------------------------------------------------------- zonas y extensión del continente
const zones = E.zonas.map((z) => {
  const w = JSON.parse(fs.readFileSync(path.join(MUNDO, z.dir, 'mundo.json'), 'utf8'));
  return { ...z, w, W: w.chunkWidth * w.columns, H: w.chunkHeight * w.rows };
});
const x0 = Math.min(...zones.map((z) => z.x)) - MARGIN;
const y0 = Math.min(...zones.map((z) => z.y)) - MARGIN;
const x1 = Math.max(...zones.map((z) => z.x + z.W)) + MARGIN;
const y1 = Math.max(...zones.map((z) => z.y + z.H)) + MARGIN;
const W = x1 - x0;
const H = y1 - y0;
// por casilla: suelo, objeto (o lo que se ve encima) y a qué zona pertenece (0 = mar abierto)
const ground = new Array(W * H).fill(0);
const object = new Array(W * H).fill(0);
const zoneOf = new Array(W * H).fill(0);
const solid = new Array(W * H).fill(0);

const out = { tile: 2, width: W, height: H, origen: { x: x0, y: y0 }, zonas: [] };
zones.forEach((z, zi) => {
  const lugares = [];
  for (const c of z.w.chunks) {
    const ch = JSON.parse(fs.readFileSync(path.join(MUNDO, z.dir, c.file), 'utf8'));
    const L = (n) => ch.layers.find((l) => l.name === n);
    const cw = z.w.chunkWidth;
    const colision = new Set((ch.tilesets?.[0]?.tiles ?? []).filter((t) => t.properties?.some((p) => p.name === 'colision' && p.value)).map((t) => t.id + 1));
    for (let i = 0; i < cw * z.w.chunkHeight; i++) {
      const gx = z.x + c.cx * cw + (i % cw) - x0;
      const gy = z.y + c.cy * z.w.chunkHeight + Math.floor(i / cw) - y0;
      const k = gy * W + gx;
      const g = L('suelo').data[i] & 0x1fffffff;
      const o = (L('objetos').data[i] || L('encima')?.data[i] || 0) & 0x1fffffff;
      ground[k] = g;
      object[k] = o;
      zoneOf[k] = zi + 1;
      solid[k] = colision.has(g) ? 1 : 0;
    }
    // lugares del mapa (en casillas del continente)
    for (const o of L('puntos').objects) {
      const tx = z.x + c.cx * cw + Math.floor(o.x / 32) - x0;
      const ty = z.y + c.cy * z.w.chunkHeight + Math.floor(o.y / 32) - y0;
      if (o.type === 'jefe') lugares.push({ tipo: 'jefe', nombre: String(prop(o, 'etiqueta') ?? o.name).replace(/^Desafiar a(l)?\s*/i, ''), nivel: prop(o, 'nivel') ?? null, x: tx, y: ty });
      else if (o.type === 'salida' && MAZMORRAS[prop(o, 'destino')]) lugares.push({ tipo: 'mazmorra', nombre: MAZMORRAS[prop(o, 'destino')], x: tx, y: ty });
      else if (o.type === 'npc' && VIAJES[o.name]) lugares.push({ tipo: VIAJES[o.name][0], nombre: VIAJES[o.name][1], x: tx, y: ty });
      else if (o.type === 'vinculo' || o.type === 'pilar') lugares.push({ tipo: 'estatua', nombre: o.type === 'pilar' ? 'El Pilar de Aethra' : 'Estatua del Viajero', x: tx, y: ty });
    }
  }
  const subzonas = (z.w.subzonas ?? []).filter((s) => s.name !== z.w.nombre).map((s) => ({
    nombre: s.name, niveles: s.levels ?? null, segura: !!s.safe,
    x: z.x - x0 + Math.floor(s.x0 / 32), y: z.y - y0 + Math.floor(s.y0 / 32), w: Math.round((s.x1 - s.x0) / 32), h: Math.round((s.y1 - s.y0) / 32),
  }));
  // las ciudades (subzonas seguras con gente; Aurelia entera)
  if (z.w.ciudad) lugares.push({ tipo: 'ciudad', nombre: z.w.nombre, x: z.x - x0 + Math.round(z.W / 2), y: z.y - y0 + Math.round(z.H / 2), capital: true });
  for (const s of subzonas) if (s.segura && s.w * s.h < 1600) lugares.push({ tipo: 'ciudad', nombre: s.nombre, x: s.x + Math.round(s.w / 2), y: s.y + Math.round(s.h / 2) });
  out.zonas.push({ dir: z.dir, zona: z.w.zona, nombre: z.w.nombre, ciudad: !!z.w.ciudad, x: z.x - x0, y: z.y - y0, w: z.W, h: z.H, subzonas, lugares });
});

// la ruta del barco de Rhaegar (Puerto Antiguo ↔ Fiordo Blanco) va por el mar, rodeando la costa este
const muelle = (n) => out.zonas.flatMap((z) => z.lugares).find((l) => l.tipo === 'barco' && l.nombre && l.x != null && (n === 'sur' ? l.y > H / 2 : l.y < H / 2));
const a = muelle('sur');
const b = muelle('norte');
if (a && b) {
  // por fuera del continente: hacia el este hasta el mar abierto y después al norte
  let east = Math.max(a.x, b.x);
  while (east < W - 3 && [...Array(H).keys()].some((y) => y > b.y && y < a.y && zoneOf[y * W + east] && !solid[y * W + east])) east++;
  out.rutas = [{ tipo: 'barco', nombre: 'La Gaviota Insolente', puntos: [[a.x, a.y], [east + 4, a.y - 6], [east + 6, Math.round((a.y + b.y) / 2)], [east + 4, b.y + 8], [b.x, b.y]] }];
}

// ---------------------------------------------------------------- tierras sin explorar alrededor
// Las zonas son rectángulos: para que el continente no se vea a cajones, alrededor de cada masa de
// tierra se agrega una franja de tierra "sin explorar" con la costa irregular, que sigue el terreno
// del borde (nieve junto a la Tundra, arena junto a las Costas…). Las islas (la Tundra, que se alcanza
// en barco) quedan separadas por un canal de mar.
const ISLAS = new Set(['tundra']);
const group = (zi) => (ISLAS.has(zones[zi - 1].dir) ? 2 : 1);
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const smooth = (x, y, sc, s) => {
  const fx = x / sc; const fy = y / sc; const ix = Math.floor(fx); const iy = Math.floor(fy); const tx = fx - ix; const ty = fy - iy;
  const u = tx * tx * (3 - 2 * tx); const v = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy, s); const b = hash(ix + 1, iy, s); const c = hash(ix, iy + 1, s); const d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const noise = (x, y) => smooth(x, y, 16, 3) * 0.55 + smooth(x, y, 7, 7) * 0.3 + smooth(x, y, 3, 5) * 0.15;
// tierra que sirve de muestra para lo que hay afuera: no agua, no paredes del borde del mapa
const isLandTile = (k) => zoneOf[k] > 0 && !solid[k] && !/^(mar_|fiordo|bajo|agua|canal|cara|camino|adoquin|muelle|losa|piedra_plaza)/.test(NOMBRES[ground[k]] ?? '');
const NOMBRES = Object.fromEntries(require('../sprites/mundo/tileset_pradera.json').tiles.map((t) => [t.id + 1, t.nombre]));
const R = 24;
const near = [null, new Int16Array(W * H).fill(-1), new Int16Array(W * H).fill(-1)];
const src = new Int32Array(W * H).fill(-1);
for (const gname of [1, 2]) {
  const dist = near[gname];
  const q = [];
  for (let k = 0; k < W * H; k++) if (zoneOf[k] && group(zoneOf[k]) === gname && isLandTile(k)) { dist[k] = 0; q.push(k); if (src[k] < 0) src[k] = k; }
  for (let h = 0; h < q.length; h++) {
    const k = q[h]; const x = k % W; const y = (k - x) / W;
    if (dist[k] >= R + 4) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nk = ny * W + nx;
      if (dist[nk] >= 0 || zoneOf[nk]) continue;
      dist[nk] = dist[k] + 1; q.push(nk);
      if (src[nk] < 0) src[nk] = src[k];
    }
  }
}
const wild = new Array(W * H).fill(0);
let wildN = 0;
for (let k = 0; k < W * H; k++) {
  if (zoneOf[k]) continue;
  const x = k % W; const y = (k - x) / W;
  const r = 4 + noise(x, y) * (R - 4);
  for (const gname of [1, 2]) {
    const d = near[gname][k];
    const other = near[3 - gname][k];
    // el canal entre el continente y las islas: nada de tierra a menos de 7 casillas de la otra
    if (d > 0 && d <= r && (other < 0 || other > 7 + d) && src[k] >= 0) {
      wild[k] = 1; wildN++;
      // el terreno de un lugar al azar cerca del borde (no siempre la misma casilla: si no, quedan rayas)
      const s0 = src[k]; const sx = s0 % W; const sy = (s0 - sx) / W;
      let pick = s0;
      for (let t = 0; t < 6; t++) {
        const cx = sx + Math.floor((hash(x, y, 20 + t) - 0.5) * 14); const cy = sy + Math.floor((hash(x, y, 40 + t) - 0.5) * 14);
        const ck = cy * W + cx;
        if (cx >= 0 && cy >= 0 && cx < W && cy < H && isLandTile(ck)) { pick = ck; break; }
      }
      ground[k] = ground[pick];
      // algún árbol o roca suelta, como los de cerca
      if (hash(x, y, 11) < 0.14 && object[pick]) object[k] = object[pick];
      break;
    }
  }
}
console.log('tierras sin explorar alrededor:', wildN, 'casillas');

fs.mkdirSync(OUT, { recursive: true });
// ---------------------------------------------------------------- tierra de cada zona (para la niebla)
// Por cada cuadro de exploración (4×4 casillas, como lib/exploracion.js): 1 si se puede pisar algo ahí.
// El mapa del mundo solo tapa con niebla esos cuadros: el mar y las paredes macizas, que nunca se
// recorren, quedan a la vista.
const CELDA = 4;
// (mar_: el mar; el mármol de las Ruinas también empieza con «mar»)
const isWaterName = (n) => /^(mar_|fiordo|bajo|agua|canal)/.test(n ?? '');
for (const z of out.zonas) {
  const cols = Math.ceil(z.w / CELDA);
  const rows = Math.ceil(z.h / CELDA);
  const bits = Buffer.alloc(Math.ceil((cols * rows) / 8));
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let land = false;
    for (let y = cy * CELDA; y < Math.min(z.h, cy * CELDA + CELDA) && !land; y++) {
      for (let x = cx * CELDA; x < Math.min(z.w, cx * CELDA + CELDA); x++) {
        const k = (z.y + y) * W + z.x + x;
        if (!solid[k] && !isWaterName(NOMBRES[ground[k]])) { land = true; break; }
      }
    }
    const i = cy * cols + cx;
    if (land) bits[i >> 3] |= 1 << (i & 7);
  }
  z.tierra = bits.toString('base64');
}

fs.writeFileSync(path.join(OUT, 'atlas.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'atlas_casillas.json'), JSON.stringify({ w: W, h: H, ground, object, zone: zoneOf, solid, wild }));
console.log(`Atlas: ${W}x${H} casillas (${W * 2}x${H * 2} px), ${out.zonas.length} zonas, ${out.zonas.reduce((n, z) => n + z.lugares.length, 0)} lugares`);
