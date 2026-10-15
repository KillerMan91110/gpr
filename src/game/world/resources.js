import bus from '../bus';
import audio from '../audio';
import { GATHER_MS, RESOURCES, propOf } from './shared';

// Recursos recolectables (hierbas, vetas, cofres…): personales y reaparecen.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const resourcesMethods = {
  // Cada recurso tiene varios sitios posibles (puntos "recurso" con el mismo nombre y "sitio");
  // el servidor dice en cuál está ahora para este jugador.
  spawnResources(points) {
    const byId = new Map();
    for (const o of points) {
      if (!byId.has(o.name)) byId.set(o.name, { tipo: propOf(o, 'tipo'), spots: [] });
      byId.get(o.name).spots[propOf(o, 'sitio') ?? 0] = { x: o.x, y: o.y };
    }
    for (const [id, def] of byId) {
      const cfg = RESOURCES[def.tipo];
      if (!cfg) continue;
      const first = def.spots.find(Boolean);
      const sprite = this.add.sprite(first.x, first.y, cfg.sheet, cfg.frames[0]).setOrigin(0.5, 0.94).setDepth(9);
      const block = this.add.rectangle(first.x, first.y - 4, 18, 10);
      this.blockers.add(block);
      const glint = this.add.particles(0, 0, 'mota_mundo', {
        x: { min: -8, max: 8 }, y: { min: -6, max: 6 }, lifespan: 900, frequency: /^cofre/.test(def.tipo) ? 500 : 900,
        scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, speedY: { min: -12, max: -4 }, tint: cfg.glint, blendMode: 'ADD',
      }).setDepth(11);
      glint.startFollow(sprite, 0, -12);
      this.minimap?.ignore(glint);
      const r = { id, tipo: def.tipo, cfg, sprite, block, glint, ready: true, spots: def.spots, spot: 0 };
      this.resources.set(id, r);
      const poi = { id, x: first.x, y: first.y - 6, label: cfg.label, resource: r };
      r.poi = poi;
      this.pois.push(poi);
      this.placeResource(r, 0);
    }
  },

  placeResource(r, spot) {
    const s = r.spots[spot] ?? r.spots.find(Boolean);
    r.spot = spot;
    r.sprite.setPosition(s.x, s.y);
    r.block.setPosition(s.x, s.y - 4);
    r.block.body?.updateFromGameObject?.();
    r.poi.x = s.x;
    r.poi.y = s.y - 6;
  },

  setResourceStates(list) {
    for (const s of list ?? []) {
      const r = this.resources.get(s.id);
      if (!r) continue;
      this.resourceState.set(s.id, s);
      if (s.ready) { this.placeResource(r, s.spot ?? 0); this.setResourceReady(r, true); }
      else { this.setResourceReady(r, false); this.scheduleRespawn(r, s.readyAt, s.spot); }
    }
  },

  setResourceReady(r, ready) {
    r.ready = ready;
    r.sprite.setFrame(r.cfg.frames[ready ? 0 : 1]);
    r.glint.emitting = ready;
  },

  // reaparece en su nuevo sitio cuando le toca
  scheduleRespawn(r, readyAt, spot) {
    r.respawn?.remove();
    const ms = Math.max(1000, new Date(readyAt).getTime() - Date.now());
    r.respawn = this.time.delayedCall(ms, () => {
      this.tweens.add({
        targets: r.sprite, alpha: 0, duration: 250,
        onComplete: () => {
          this.placeResource(r, spot ?? r.spot);
          this.setResourceReady(r, true);
          this.tweens.add({ targets: r.sprite, alpha: 1, duration: 400 });
        },
      });
    });
  },

  gather(r) {
    if (!r.ready || this.gathering) return;
    this.gathering = true;
    this.stopPlayer();
    // "trabajo" con barra de lanzamiento (como recolectar en WoW/FFXIV) antes de pedir el botín
    const ms = GATHER_MS;
    bus.emit('cast', { label: r.cfg.label, ms });
    this.tweens.add({ targets: r.sprite, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: Math.round(ms / 160) - 1, onComplete: () => r.sprite.setAngle(0) });
    const hit = ['mineral', 'tronco', 'veta_montana', 'pino'].includes(r.tipo) ? 'golpe' : 'recoger';
    audio.sfx(hit);
    this.time.delayedCall(ms / 2, () => audio.sfx(hit));
    this.time.delayedCall(ms, () => bus.emit('gather', { id: r.id, tipo: r.tipo }));
  },

  // React avisa qué salió (o error con r.error)
  onGathered(res) {
    this.gathering = false;
    const r = this.resources.get(res.id);
    if (!r) return;
    if (res.error) {
      this.floatLoot([{ text: res.error, color: '#ff9a8a' }]);
      return;
    }
    this.setResourceReady(r, false);
    this.scheduleRespawn(r, res.readyAt, res.spot);
    audio.sfx(/^(cofre|restos)/.test(r.tipo) ? 'cofre' : 'recoger');
    const burst = this.add.particles(r.sprite.x, r.sprite.y - 12, 'mota_mundo', {
      speed: { min: 30, max: 90 }, lifespan: 600, scale: { start: 1.2, end: 0 }, emitting: false, tint: [r.cfg.glint, 0xffffff], blendMode: 'ADD',
    }).setDepth(12);
    burst.explode(18);
    this.time.delayedCall(800, () => burst.destroy());
    const lines = [];
    if (res.gold) lines.push({ text: `+${res.gold} oro`, color: '#ffd84a' });
    for (const it of res.items ?? []) lines.push({ text: `+${it.quantity} ${it.name}`, color: '#bfffcf' });
    this.floatLoot(lines);
  },
};
