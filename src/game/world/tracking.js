import Phaser from 'phaser';
import { TAG_FONT, TAG_RES, propOf, DUNGEONS } from './shared';

// Rastreo de misiones: para cada misión que el jugador rastrea (botón 📍 del diario o del
// seguidor), una flecha alrededor del héroe apunta al objetivo del paso actual, con el nombre de la
// misión y a cuántos metros (casillas) está; sobre el objetivo late un marcador y en el minimapa se
// ve un punto del mismo color. React manda qué buscar (ver pages/World.js trackTargets):
//   { kind: 'point', zone, x, y }      lugar del mapa (casillas de la zona)
//   { kind: 'npc', npc }               un NPC (aunque la misión lo haya movido de lugar)
//   { kind: 'monster', codes }         el área más cercana donde aparece alguno de esos monstruos
//   { kind: 'boss', code }             un jefe del mapa (o la puerta de la Cripta para sus jefes)
//   { kind: 'nodes', tipos }           la mata, veta o tronco más cercano de esos tipos
// De todo lo que sirve, la flecha va a lo más cercano.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const ARROW_RADIUS = 30; // a cuánto del héroe gira la flecha
const ARRIVED = 2.5 * 32; // a esta distancia ya no hace falta flecha

export const trackingMethods = {
  // tracks: [{ questId, name, color, targets: [...] }]
  setTracking(tracks) {
    for (const t of this.tracks ?? []) [t.arrow, t.label, t.marker, t.dot].forEach((o) => o?.destroy());
    this.tracks = (tracks ?? []).map((t, i) => {
      const color = t.color ?? 0xffd84a;
      const css = `#${color.toString(16).padStart(6, '0')}`;
      const arrow = this.add.triangle(0, 0, 0, -6, 14, 0, 0, 6, color).setStrokeStyle(1.5, 0x141420).setDepth(22).setVisible(false);
      const label = this.add.text(0, 0, '', {
        fontFamily: TAG_FONT, fontSize: '6px', fontStyle: 'bold', color: css, stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(22).setResolution(TAG_RES).setVisible(false);
      // marcador sobre el objetivo: rombo que sube y baja
      const marker = this.add.text(0, 0, '◆', {
        fontFamily: TAG_FONT, fontSize: '12px', fontStyle: 'bold', color: css, stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(22).setResolution(TAG_RES).setVisible(false);
      this.tweens.add({ targets: marker, scale: { from: 0.85, to: 1.15 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // punto en el minimapa (invisible en la cámara principal)
      const dot = this.add.circle(0, 0, 20, color).setStrokeStyle(6, 0x141420).setDepth(31).setVisible(false);
      this.cameras.main.ignore(dot);
      [arrow, label, marker].forEach((o) => this.minimap?.ignore(o));
      return { ...t, index: i, arrow, label, marker, dot, goal: null, lastSearch: 0 };
    });
  },

  // posiciones (globales) donde se cumple cada cosa que busca la misión
  trackCandidates(target) {
    switch (target.kind) {
      case 'point': {
        if (!this.zoneByDir[target.zone]) return [];
        return [this.toGlobal(target.x * 32 + 16, target.y * 32 + 16, target.zone)];
      }
      case 'npc':
        return [...(this.npcs?.values() ?? [])].filter((n) => n.id === target.npc && !n.hidden).map((n) => ({ x: n.sprite.x, y: n.sprite.y }));
      case 'monster':
        return (this.encounterAreas ?? [])
          .filter((a) => String(propOf(a, 'monstruos') ?? '').split(',').map((s) => s.trim()).some((c) => target.codes.includes(c)))
          .map((a) => ({ x: a.x + a.width / 2, y: a.y + a.height / 2 }));
      case 'boss': {
        const boss = (this.bossPoints ?? []).filter((b) => b.code === target.code).map((b) => ({ x: b.x, y: b.y }));
        if (boss.length) return boss;
        // jefes de una mazmorra: su puerta (la Cripta del Vigía, la Mina Profunda, el Arrecife Hundido…)
        const dungeon = Object.entries(DUNGEONS).find(([, d]) => (target.code ?? '').startsWith(d.codePrefix) || d.bossCodes?.includes(target.code))?.[0];
        if (dungeon) {
          return (this.exits ?? []).filter((e) => e.dest === dungeon).map((e) => ({ x: e.rect.centerX, y: e.rect.centerY }));
        }
        return [];
      }
      case 'nodes':
        return [...(this.resources?.values() ?? [])].filter((r) => target.tipos.includes(r.tipo) && r.ready !== false)
          .map((r) => ({ x: r.sprite.x, y: r.sprite.y }));
      default:
        return [];
    }
  },

  updateTracking(time) {
    if (!this.tracks?.length || !this.player) return;
    const px = this.player.x;
    const py = this.player.y;
    for (const t of this.tracks) {
      // el lugar más cercano se busca cada medio segundo (los NPCs y los recursos se mueven)
      if (time - t.lastSearch > 500) {
        t.lastSearch = time;
        let best = null;
        let bestD = Infinity;
        for (const target of t.targets) {
          for (const c of this.trackCandidates(target)) {
            const d = Phaser.Math.Distance.Between(px, py, c.x, c.y);
            if (d < bestD) { bestD = d; best = c; }
          }
        }
        t.goal = best;
      }
      const g = t.goal;
      [t.arrow, t.label, t.marker, t.dot].forEach((o) => o.setVisible(!!g));
      if (!g) continue;
      const d = Phaser.Math.Distance.Between(px, py, g.x, g.y);
      const ang = Phaser.Math.Angle.Between(px, py, g.x, g.y);
      const far = d > ARRIVED;
      t.arrow.setVisible(far);
      t.label.setVisible(far);
      if (far) {
        const r = ARROW_RADIUS + t.index * 6;
        t.arrow.setPosition(px + Math.cos(ang) * r, py - 6 + Math.sin(ang) * r).setRotation(ang);
        t.label.setPosition(px + Math.cos(ang) * (r + 16), py - 6 + Math.sin(ang) * (r + 16) + t.index * 7)
          .setText(`${t.name} · ${Math.round(d / 32)} m`);
      }
      t.marker.setPosition(g.x, g.y - 22);
      t.dot.setPosition(g.x, g.y);
    }
  },
};
