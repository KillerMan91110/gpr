import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';
import { SHOO_RADIUS, SHY_LEVEL_GAP, REFUGE_RADIUS, REFUGE_KEY, propOf } from './shared';

// Monstruos que se apartan al volver de un combate o si son mucho más débiles, y refugios (Pilar y fogatas).
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const refugesMethods = {
  // Aparta a los monstruos que quedaron pegados al héroe al volver de un combate
  shooMonsters() {
    if (!this.player) return;
    for (const m of this.monsters.getChildren()) {
      const d = Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y);
      if (d > SHOO_RADIUS) continue;
      const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, m.x, m.y) || Math.random() * Math.PI * 2;
      const nx = this.player.x + Math.cos(ang) * SHOO_RADIUS;
      const ny = this.player.y + Math.sin(ang) * SHOO_RADIUS;
      if (this.walkable(Math.floor(nx / 32), Math.floor((ny + 10) / 32))) m.setPosition(nx, ny);
      m.setVelocity(Math.cos(ang) * 40, Math.sin(ang) * 40);
    }
  },

  // ¿este monstruo es mucho más débil que el héroe? (entonces no se le acerca)
  isShy(mon) {
    const levels = mon.getData('levels');
    if (!levels || mon.getData('minion')) return false;
    const [a, b = a] = String(levels).split('-').map(Number);
    return this.heroLevel - b >= SHY_LEVEL_GAP;
  },

  // Refugios: el Pilar de Aethra y las fogatas fuera de las ciudades
  buildRefuges(all) {
    this.refuges = all.filter((o) => o.type === 'pilar' || (o.type === 'luz' && propOf(o, 'tipo') === 'fogata' && !this.zoneByDir[o.zone]?.world.ciudad))
      .map((o) => {
        const z = this.zoneByDir[o.zone];
        const lx = o.x - z.ox;
        const ly = o.y - z.oy;
        const sz = z.world.subzonas?.find((s) => s.name !== z.world.nombre && lx >= s.x0 && lx < s.x1 && ly >= s.y0 && ly < s.y1);
        const name = o.type === 'pilar' ? 'el Pilar de Aethra' : `la fogata de ${sz?.name ?? z.world.nombre}`;
        return { x: o.x, y: o.y + 24, zone: o.zone, name };
      });
    try { this.refuge = JSON.parse(localStorage.getItem(REFUGE_KEY)); } catch { this.refuge = null; }
  },

  checkRefuge(time) {
    if (!this.refuges?.length || time < (this.nextRefugeCheck ?? 0)) return;
    this.nextRefugeCheck = time + 500;
    const r = this.refuges.find((q) => Phaser.Math.Distance.Between(q.x, q.y, this.player.x, this.player.y) < REFUGE_RADIUS);
    // la guía del aventurero escucha cuándo estás junto a un refugio (el Pilar, la fogata de la Aldea)
    if (r) bus.emit('refuge-near', r.name);
    if (!r || this.refuge?.name === r.name) return;
    const l = this.toLocal(r.x, r.y, this.zoneByDir[r.zone]);
    this.refuge = { name: r.name, zone: r.zone, x: l.x, y: l.y };
    try { localStorage.setItem(REFUGE_KEY, JSON.stringify(this.refuge)); } catch { /* sin guardar */ }
    bus.emit('social-toast', { text: `Refugio: ${r.name}. Si caes, despertarás aquí.`, kind: 'ok' });
    audio.sfx('curar');
  },
};
