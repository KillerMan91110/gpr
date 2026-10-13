import Phaser from 'phaser';
import bus from '../bus';

// Exploración (components/world/useExploration.js + gprback/lib/exploracion.js): el mapa (M) se
// descubre al caminar, en cuadros de EXPLORE_CELL casillas, y en rincones escondidos hay cofres
// secretos que solo se ven de cerca.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const EXPLORE_CELL = 4; // casillas por lado de cada cuadro del mapa
const VISION = 2; // cuadros alrededor del héroe que se descubren
const SECRET_SEEN = 5 * 32; // a esta distancia empieza a verse el escondite

function decode(b64, size) {
  const out = new Uint8Array(size);
  if (!b64) return out;
  try {
    const bin = atob(b64);
    for (let i = 0; i < Math.min(bin.length, size); i++) out[i] = bin.charCodeAt(i);
  } catch { /* vacío */ }
  return out;
}
function encode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export const exploreMethods = {
  // tamaño en cuadros de una zona
  exploreGrid(z) {
    const w = z.world;
    const cols = Math.ceil((w.chunkWidth * w.columns) / EXPLORE_CELL);
    const rows = Math.ceil((w.chunkHeight * w.rows) / EXPLORE_CELL);
    return { cols, rows, bytes: Math.ceil((cols * rows) / 8) };
  },

  // lo que ya tenía explorado (lo manda React al entrar)
  initExplored(data) {
    this.explored = {};
    for (const z of this.zones) {
      const g = this.exploreGrid(z);
      this.explored[z.dir] = decode(data?.zones?.[z.dir]?.cells, g.bytes);
    }
    this.exploreDirty = new Set();
    this.setSecretsOpened(data?.secrets ?? []);
  },

  // marca los cuadros alrededor del héroe; cada 3 s avisa a React de las zonas con cuadros nuevos
  updateExplore(time) {
    if (!this.explored || !this.player || time < (this.nextExplore ?? 0)) return;
    this.nextExplore = time + 400;
    const z = this.zoneAt(this.player.x, this.player.y);
    const bits = z && this.explored[z.dir];
    if (bits) {
      const { cols, rows } = this.exploreGrid(z);
      const cx = Math.floor((this.player.x - z.ox) / 32 / EXPLORE_CELL);
      const cy = Math.floor((this.player.y - z.oy) / 32 / EXPLORE_CELL);
      for (let y = cy - VISION; y <= cy + VISION; y++) {
        for (let x = cx - VISION; x <= cx + VISION; x++) {
          if (x < 0 || y < 0 || x >= cols || y >= rows || (x - cx) ** 2 + (y - cy) ** 2 > VISION * VISION + 1) continue;
          const i = y * cols + x;
          if (!(bits[i >> 3] & (1 << (i & 7)))) { bits[i >> 3] |= 1 << (i & 7); this.exploreDirty.add(z.dir); }
        }
      }
    }
    if (this.exploreDirty.size && time >= (this.nextExploreSend ?? 0)) {
      this.nextExploreSend = time + 3000;
      for (const dir of this.exploreDirty) bus.emit('explore-cells', { dir, cells: encode(this.explored[dir]) });
      this.exploreDirty.clear();
    }
    this.updateSecrets();
  },

  exploredOf(dir) {
    const z = this.zoneByDir[dir];
    if (!z || !this.explored?.[dir]) return null;
    return { cell: EXPLORE_CELL, ...this.exploreGrid(z), bits: this.explored[dir] };
  },

  // ---- cofres secretos: un cofre viejo que solo se ve de cerca (y destella un poco)
  buildSecrets(all) {
    this.secrets = all.filter((o) => o.type === 'secreto').map((o) => {
      const x = o.x + 16;
      const y = o.y + 16;
      const sprite = this.add.sprite(x, y, 'recursos', 4).setDepth(8 + y / 100000).setAlpha(0);
      const glint = this.add.particles(x, y - 6, 'mota_mundo', {
        x: { min: -10, max: 10 }, y: { min: -8, max: 4 }, lifespan: 900, frequency: 520,
        scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: 0xffe08a, blendMode: 'ADD', emitting: false,
      }).setDepth(9);
      this.minimap?.ignore([sprite, glint]);
      return { id: o.name, x, y, sprite, glint, opened: false };
    });
  },

  setSecretsOpened(ids) {
    for (const s of this.secrets ?? []) if (ids.includes(s.id)) this.markSecretOpened(s);
  },

  markSecretOpened(s) {
    s.opened = true;
    s.sprite.setFrame(5);
    s.glint.emitting = false;
    this.pois = this.pois.filter((p) => p.id !== s.id);
    if (this.nearPoi?.id === s.id) { this.nearPoi = null; bus.emit('poi', null); }
  },

  updateSecrets() {
    for (const s of this.secrets ?? []) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      const a = d > SECRET_SEEN ? 0 : Math.min(1, (SECRET_SEEN - d) / 64);
      s.sprite.setAlpha(s.opened ? a * 0.6 : a);
      s.glint.emitting = !s.opened && a > 0.2;
      const listed = this.pois.some((p) => p.id === s.id);
      if (!s.opened && a > 0.5 && !listed) this.pois.push({ id: s.id, x: s.x, y: s.y + 8, label: 'Examinar el escondite', secret: s.id, radius: 44 });
      if ((s.opened || a <= 0.5) && listed) this.pois = this.pois.filter((p) => p.id !== s.id);
    }
  },

  secretOpened(id) {
    const s = this.secrets?.find((q) => q.id === id);
    if (!s) return;
    this.markSecretOpened(s);
    this.tweens.add({ targets: s.sprite, scale: 1.3, yoyo: true, duration: 160 });
  },
};
