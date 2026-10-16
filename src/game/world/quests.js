import Phaser from 'phaser';
import bus from '../bus';
import { TAG_FONT, TAG_RES, ASSETS } from './shared';

// Misiones por pasos en el mapa (ver gprback/lib/questSteps.js):
//   - NPCs que una misión mueve de lugar (Aldren esperándote en la puerta de la Cripta): solo los
//     ve así el jugador que está en ese paso; al terminarlo vuelven a su puesto.
//   - Puntos de misión: lugares a los que llegar (VISIT), cosas que examinar con la E
//     (INVESTIGATE) y emboscadas (AMBUSH). Se marcan con un brillo y una marca encima.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const POINT_COLORS = { VISIT: 0x7dc8ff, INVESTIGATE: 0xffd84a, AMBUSH: 0xff6a5a };
const POINT_LABELS = { VISIT: 'Lugar de misión', INVESTIGATE: 'Examinar', AMBUSH: 'Algo te observa…' };
// lo que se busca, dibujado en el mapa (art/sprites/mundo/crear_puntos_mision.lua): tiras de 2
// cuadros en assets/mundo/mision. Tamaño de cada cuadro (si no está aquí, 32x32).
const POINT_SPRITE_SIZE = { carro_asaltado: [48, 32], roble_enfermo: [48, 48] };

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

  // points: [{ objectiveId, type, zone, x, y, radius, label, questName, sprite?, huye? }]
  setQuestPoints(points) {
    this.questPointsRaw = points ?? [];
    const next = (points ?? []).filter((p) => this.zoneByDir[p.zone]).map((p) => {
      const g = this.toGlobal(p.x * 32 + 16, p.y * 32 + 16, p.zone);
      return { ...p, gx: g.x, gy: g.y };
    });
    const nextIds = new Set(next.map((p) => p.objectiveId));
    // lo que ya se cumplió se borra; lo que «huye» (Trueno) se va corriendo antes de desaparecer
    for (const m of this.questMarkers ?? []) {
      if (m.point.huye && m.sprite && !nextIds.has(m.point.objectiveId)) {
        m.parts.filter((o) => o !== m.sprite).forEach((o) => o.destroy());
        m.sprite.setFlipX(true);
        this.tweens.add({ targets: m.sprite, x: m.sprite.x + 160, alpha: 0, duration: 1100, ease: 'Quad.easeIn', onComplete: () => m.sprite.destroy() });
      } else {
        m.parts.forEach((o) => o.destroy());
      }
    }
    this.questMarkers = [];
    this.pois = (this.pois ?? []).filter((p) => !p.questPoint);
    // cada vez que cambian los puntos (tras cada avance) se puede volver a avisar si no se cumplió
    this.questVisited = new Set();
    this.questPoints = next;
    const token = (this.questPointsToken ?? 0) + 1;
    this.questPointsToken = token;
    // primero se cargan los dibujos que falten; después se arma cada punto
    const missing = [...new Set(next.map((p) => p.sprite).filter((sp) => sp && !sp.startsWith('mon:') && !this.textures.exists(`qp_${sp}`)))];
    // las emboscadas muestran a su monstruo ("mon:CODIGO"): su hoja puede no estar cargada todavía
    const catalog = this.cache.json.get('enemigos')?.monsters ?? {};
    const missingMon = [...new Set(next.map((p) => p.sprite).filter((sp) => sp?.startsWith('mon:')).map((sp) => sp.slice(4)))]
      .filter((code) => catalog[code] && !this.textures.exists(`mon_${code}`));
    const build = () => { if (this.questPointsToken === token) next.forEach((p) => this.buildQuestPoint(p)); };
    if (missing.length || missingMon.length) {
      this.loadThen(() => {
        missing.forEach((sp) => {
          const [w, h] = POINT_SPRITE_SIZE[sp] ?? [32, 32];
          this.load.spritesheet(`qp_${sp}`, `${ASSETS}/mundo/mision/${sp}.png`, { frameWidth: w, frameHeight: h });
        });
        missingMon.forEach((code) => {
          const m = catalog[code];
          this.load.spritesheet(`mon_${code}`, `${ASSETS}/sprites/combate/${m.sheet}`, { frameWidth: m.frameSize.w, frameHeight: m.frameSize.h });
        });
      }, build);
    } else {
      build();
    }
  },

  // el dibujo de un punto: lo que se busca (o el monstruo de la emboscada), con su brillo y su marca
  questPointSprite(p) {
    if (!p.sprite) return null;
    if (p.sprite.startsWith('mon:')) {
      const code = p.sprite.slice(4);
      const info = this.cache.json.get('enemigos')?.monsters?.[code];
      if (!info || !this.textures.exists(`mon_${code}`)) return null;
      const key = `mon_idle_${code}`;
      if (!this.anims.exists(key)) {
        this.anims.create({ key, frames: info.animations.idle.frames.map((f) => ({ key: `mon_${code}`, frame: f })), frameRate: 2.5, repeat: -1 });
      }
      return this.add.sprite(p.gx, p.gy + 6, `mon_${code}`, info.animations.idle.frames[0]).setScale(0.75).setOrigin(0.5, 0.9).play(key);
    }
    const tex = `qp_${p.sprite}`;
    if (!this.textures.exists(tex)) return null;
    const key = `qp_anim_${p.sprite}`;
    if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
    return this.add.sprite(p.gx, p.gy + 8, tex, 0).setOrigin(0.5, 0.9).play(key);
  },

  buildQuestPoint(p) {
    const color = POINT_COLORS[p.type] ?? 0xffd84a;
    const sprite = this.questPointSprite(p);
    if (sprite) sprite.setDepth(9);
    const glow = this.add.circle(p.gx, p.gy, sprite ? 14 : 10, color, 0.25).setDepth(8).setBlendMode('ADD');
    this.tweens.add({ targets: glow, scale: { from: 0.8, to: 1.6 }, alpha: { from: 0.45, to: 0 }, duration: 1200, repeat: -1 });
    // la marca va arriba del dibujo (o del brillo si no hay dibujo)
    const top = sprite ? sprite.y - sprite.displayHeight * 0.9 - 2 : p.gy - 18;
    const icon = this.add.text(p.gx, top, p.type === 'VISIT' ? '◆' : '?', {
      fontFamily: TAG_FONT, fontSize: '11px', fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}`, stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
    this.tweens.add({ targets: icon, y: top - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.minimap?.ignore(icon);
    this.questMarkers.push({ point: p, sprite, parts: [glow, icon, sprite].filter(Boolean) });
    // examinar y emboscada se hacen con la E, como cualquier punto del mapa
    if (p.type !== 'VISIT') {
      this.pois.push({ id: `mision_${p.objectiveId}`, x: p.gx, y: p.gy, label: p.label ?? POINT_LABELS[p.type], questPoint: p });
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
