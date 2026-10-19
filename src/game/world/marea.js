import bus from '../bus';
import audio from '../audio';

// La marea de las Costas Muertas: cada 6 minutos sube o baja (la misma cuenta que gprback/lib/marea.js,
// con el reloj del servidor: World.js le pasa la diferencia con setTideOffset).
//   - Marea baja: los bancos de arena (tile "banco") se pisan y unen las Rocas de las Sirenas con sus
//     islotes, donde están las pozas de marea.
//   - Marea alta: el agua cubre los bancos (tile "banco_alta") y chocan; si te quedas en uno, la ola te
//     arrastra a la orilla.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const TIDE_ZONE = 'costas';
const PERIODO_MS = 12 * 60 * 1000;
// índices del tileset compartido (id + 1): banco de arena con la marea baja y con la marea alta
const GID_BAJA = 1072;
const GID_ALTA = 1073;
const AVISO_MS = 30 * 1000;
// diferencia entre el reloj del servidor y el de este navegador (ms)
let tideOffset = 0;
export const setTideOffset = (ms) => { tideOffset = Number(ms) || 0; };

export const mareaMethods = {
  tideIsLow() {
    const now = Date.now() + tideOffset;
    return now % PERIODO_MS < PERIODO_MS / 2;
  },

  // cuánto falta para que cambie la marea
  tideChangeIn() {
    const f = (Date.now() + tideOffset) % PERIODO_MS;
    return (f < PERIODO_MS / 2 ? PERIODO_MS / 2 : PERIODO_MS) - f;
  },

  // pone los bancos de un trozo de las Costas como manda la marea (al armarlo y cuando cambia)
  applyTideToChunk(chunk) {
    if (chunk.zone.dir !== TIDE_ZONE) return;
    if (this.tideLow == null) this.tideLow = this.tideIsLow();
    if (!chunk.bancos) {
      chunk.bancos = [];
      chunk.ground.forEachTile((t) => { if (t.index === GID_BAJA || t.index === GID_ALTA) chunk.bancos.push([t.x, t.y]); });
    }
    if (!chunk.bancos.length) return;
    const low = this.tideLow;
    const T = 32;
    for (const [tx, ty] of chunk.bancos) {
      const tile = chunk.ground.putTileAt(low ? GID_BAJA : GID_ALTA, tx, ty, false);
      tile.setCollision(!low, !low, !low, !low, false);
      // la grilla de casillas caminables (caminos de los NPCs y del "seguir")
      if (this.walk) {
        const gx = chunk.zone.ox / T + chunk.cx * chunk.zone.world.chunkWidth + tx;
        const gy = chunk.zone.oy / T + chunk.cy * chunk.zone.world.chunkHeight + ty;
        if (gx >= 0 && gy >= 0 && gx < this.gridW && gy < this.gridH) this.walk[gy * this.gridW + gx] = low ? 1 : 0;
      }
    }
    chunk.ground.calculateFacesWithin(0, 0, chunk.zone.world.chunkWidth, chunk.zone.world.chunkHeight);
    this.pathCache?.clear?.();
  },

  updateTide(time) {
    if (!this.player || time < (this.nextTideCheck ?? 0)) return;
    this.nextTideCheck = time + 1000;
    const here = this.zoneDir === TIDE_ZONE;
    const low = this.tideIsLow();
    if (this.tideLow == null) this.tideLow = low;
    // aviso: falta poco para que suba
    if (here && low && this.tideChangeIn() < AVISO_MS && !this.tideWarned) {
      this.tideWarned = true;
      audio.sfx('campana');
      bus.emit('social-toast', { text: '🔔 La campana del puerto suena: la marea empieza a subir. Si estás en un banco de arena, vuelve a la orilla.', kind: 'tour' });
    }
    if (low === this.tideLow) return;
    this.tideLow = low;
    this.tideWarned = false;
    for (const c of this.chunks.values()) this.applyTideToChunk(c);
    if (!here) return;
    audio.sfx('ola');
    bus.emit('social-toast', {
      text: low ? '🌊 La marea está bajando: aparecen los bancos de arena hasta los islotes de las Rocas.' : '🌊 La marea sube: el agua cubre los bancos de arena.',
      kind: 'tour',
    });
    if (!low) this.tideSweep();
  },

  // marea alta: si el héroe quedó sobre un banco (o en un islote rodeado de agua), la ola lo lleva
  // a la casilla seca más cercana desde la que se llega a la orilla
  tideSweep() {
    const T = 32;
    const px = Math.floor(this.player.x / T);
    const py = Math.floor(this.player.y / T);
    const onBank = this.groundTileAt(this.player.x, this.player.y)?.index === GID_ALTA;
    if (!onBank) return;
    for (let r = 1; r <= 14; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = px + dx;
        const y = py + dy;
        if (!this.walkable?.(x, y)) continue;
        const t = this.groundTileAt(x * T + 16, y * T + 16);
        if (!t || t.index === GID_ALTA) continue;
        this.tweens.add({ targets: this.player, x: x * T + 16, y: y * T + 16, duration: 700, ease: 'Sine.easeOut' });
        bus.emit('social-toast', { text: '🌊 ¡Una ola te arrastra hasta la orilla!', kind: 'error' });
        return;
      }
    }
  },
};
