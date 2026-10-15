import Phaser from 'phaser';
import bus from '../bus';
import { TAG_FONT, TAG_RES } from './shared';

// Misiones por pasos en el mapa (ver gprback/lib/questSteps.js):
//   - NPCs que una misión mueve de lugar (Aldren esperándote en la puerta de la Cripta): solo los
//     ve así el jugador que está en ese paso; al terminarlo vuelven a su puesto.
//   - Puntos de misión: lugares a los que llegar (VISIT), cosas que examinar con la E
//     (INVESTIGATE) y emboscadas (AMBUSH). Se marcan con un brillo y una marca encima.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const POINT_COLORS = { VISIT: 0x7dc8ff, INVESTIGATE: 0xffd84a, AMBUSH: 0xff6a5a };
const POINT_LABELS = { VISIT: 'Lugar de misión', INVESTIGATE: 'Examinar', AMBUSH: 'Algo te observa…' };

export const questsMethods = {
  // spots: [{ npc, zone, x, y }] (casillas locales de la zona)
  setQuestNpcSpots(spots) {
    this.questSpots = spots ?? [];
    if (!this.npcs?.size) return;
    for (const n of this.npcs.values()) {
      const spot = this.questSpots.find((s) => s.npc === n.id && this.zoneByDir[s.zone]);
      if (spot) {
        const g = this.toGlobal(spot.x * 32 + 16, spot.y * 32 + 16, spot.zone);
        if (!n.questHome) n.questHome = { home: n.home, radius: n.radius };
        n.home = { x: g.x, y: g.y };
        n.pos = { x: g.x, y: g.y };
        n.target = null;
        n.radius = 0;
      } else if (n.questHome) {
        // el paso terminó: vuelve a su puesto
        n.home = n.questHome.home;
        n.pos = { ...n.home };
        n.radius = n.questHome.radius;
        n.target = null;
        n.questHome = null;
      }
    }
  },

  // points: [{ objectiveId, type, zone, x, y, radius, label, questName }]
  setQuestPoints(points) {
    for (const m of this.questMarkers ?? []) m.forEach((o) => o.destroy());
    this.questMarkers = [];
    this.pois = (this.pois ?? []).filter((p) => !p.questPoint);
    // cada vez que cambian los puntos (tras cada avance) se puede volver a avisar si no se cumplió
    this.questVisited = new Set();
    this.questPoints = (points ?? []).filter((p) => this.zoneByDir[p.zone]).map((p) => {
      const g = this.toGlobal(p.x * 32 + 16, p.y * 32 + 16, p.zone);
      return { ...p, gx: g.x, gy: g.y };
    });
    for (const p of this.questPoints) {
      const color = POINT_COLORS[p.type] ?? 0xffd84a;
      const glow = this.add.circle(p.gx, p.gy, 10, color, 0.25).setDepth(8).setBlendMode('ADD');
      this.tweens.add({ targets: glow, scale: { from: 0.8, to: 1.6 }, alpha: { from: 0.45, to: 0 }, duration: 1200, repeat: -1 });
      const icon = this.add.text(p.gx, p.gy - 18, p.type === 'VISIT' ? '◆' : '?', {
        fontFamily: TAG_FONT, fontSize: '11px', fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}`, stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      this.tweens.add({ targets: icon, y: p.gy - 22, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.minimap?.ignore(icon);
      this.questMarkers.push([glow, icon]);
      // examinar y emboscada se hacen con la E, como cualquier punto del mapa
      if (p.type !== 'VISIT') {
        this.pois.push({ id: `mision_${p.objectiveId}`, x: p.gx, y: p.gy, label: p.label ?? POINT_LABELS[p.type], questPoint: p });
      }
    }
  },

  // emboscada de misión: el servidor la confirmó y ahora empieza el combate con esos monstruos
  startQuestAmbush({ monsters, name }) {
    if (this.encounterLock || !monsters?.length) return;
    this.lockForBattle();
    bus.emit('encounter', {
      kind: 'emboscada', monsters, name: name ?? null,
      zoneId: this.zoneId, position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  },

  // llegar a un lugar de misión: se avisa una vez (el servidor confirma que estás ahí)
  checkQuestVisits() {
    if (!this.questPoints?.length || !this.player) return;
    for (const p of this.questPoints) {
      if (p.type !== 'VISIT' || this.questVisited.has(p.objectiveId)) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.gx, p.gy) <= (p.radius ?? 3) * 32) {
        this.questVisited.add(p.objectiveId);
        bus.emit('quest-point', p);
      }
    }
  },
};
