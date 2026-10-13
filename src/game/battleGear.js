import { GEAR_ASSETS, COMBAT_WEAPONS, COMBAT_OFFHANDS, gearArt } from './gear';

// El equipo puesto en el combate (BattleScene): el arma y la mano secundaria salen de las hojas
// de art/sprites/combate/crear_equipo.lua, pintadas con colores "llave" que aquí se cambian por
// los del set (paletas.json); el cuerpo de la clase se repinta con el color de la armadura.
// Todo se hace una vez por combinación (textura nueva en el TextureManager de Phaser).
const hexToRgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const rgbInt = ([r, g, b]) => (r << 16) | (g << 8) | b;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// colores de la ropa de cada clase en sus hojas (Sprites/v2/crear_sprites_v2.lua) → papel del set
const WHITE = [255, 255, 255];
const BODY_ROLES = {
  guerrero: { '4a5060': 'm2', '2e323e': 'm3', '7a8296': 'm1', c0343a: 'c1', '7a1f2a': 'c2', e8c050: 't1' },
  mago: { '2e44b0': 'c1', '1d2770': 'c2', '5070e0': 'c0', e8c050: 't1', a8802c: 't2' },
  arquero: { '3f7040': 'c1', '274828': 'c2', '64984f': 'c0', e8c050: 't1' },
  picaro: { 434352: 'c2', '2e2e3a': 'c3', '62627a': 'c1', '6a3a8a': 't1', 432456: 't2', e8c050: 't1' },
  // la vestidura del sacerdote sigue siendo clara: solo toma un tinte del set
  sacerdote: { eeecf4: (p) => mix(WHITE, p.c0, 0.3), b4b0c8: (p) => mix([180, 176, 200], p.c1, 0.45), e8c050: 't1', a8802c: 't2', '6fc3ff': 'g1' },
};

export function preloadGear(scene, participants) {
  if (!scene.cache.json.exists('eq_paletas')) scene.load.json('eq_paletas', `${GEAR_ASSETS}/paletas.json`);
  for (const p of participants) {
    for (const piece of [p.gear?.weapon, p.gear?.offhand]) {
      const art = gearArt(piece);
      if (!art || !(COMBAT_WEAPONS.includes(art.shape) || COMBAT_OFFHANDS.includes(art.shape))) continue;
      const key = `eqbase_${art.shape}`;
      if (!scene.textures.exists(key)) scene.load.spritesheet(key, `${GEAR_ASSETS}/combate/${art.shape}.png`, { frameWidth: 48, frameHeight: 48 });
    }
  }
}

function setColors(scene, set) {
  const pal = scene.cache.json.get('eq_paletas');
  const roles = pal?.sets?.[set];
  if (!roles) return null;
  return Object.fromEntries(Object.entries(roles).map(([r, h]) => [r, hexToRgb(h)]));
}

// copia la textura cambiando colores exactos (map: entero RGB → [r, g, b])
function recolor(scene, srcKey, dstKey, map) {
  if (scene.textures.exists(dstKey)) return true;
  if (!scene.textures.exists(srcKey)) return false;
  const src = scene.textures.get(srcKey).getSourceImage();
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const to = map.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.addSpriteSheet(dstKey, canvas, { frameWidth: 48, frameHeight: 48 });
  return true;
}

// textura del arma o de la mano secundaria pintada con su set: devuelve la clave o null
export function gearTexture(scene, piece, kind) {
  const art = gearArt(piece);
  const list = kind === 'weapon' ? COMBAT_WEAPONS : COMBAT_OFFHANDS;
  if (!art || !list.includes(art.shape)) return null;
  const colors = setColors(scene, art.set);
  const keys = scene.cache.json.get('eq_paletas')?.keys;
  if (!colors || !keys) return null;
  const map = new Map(Object.entries(keys).map(([role, h]) => [rgbInt(hexToRgb(h)), colors[role]]));
  const dst = `${kind === 'weapon' ? 'w' : 'o'}_eq_${art.shape}_${art.set}`;
  return recolor(scene, `eqbase_${art.shape}`, dst, map) ? dst : null;
}

// cuerpo de la clase con la ropa del color de la armadura puesta: devuelve la clave de textura
export function bodyTexture(scene, cls, armor) {
  const base = `b_${cls}`;
  const art = gearArt(armor);
  const roles = BODY_ROLES[cls];
  if (!art || !roles) return base;
  const colors = setColors(scene, art.set);
  if (!colors) return base;
  const map = new Map(Object.entries(roles).map(([h, role]) => [rgbInt(hexToRgb(h)), typeof role === 'function' ? role(colors) : colors[role]]));
  const dst = `b_${cls}__${art.set}`;
  return recolor(scene, base, dst, map) ? dst : base;
}
