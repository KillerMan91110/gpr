import Phaser from 'phaser';
import bus from '../bus';
import { socialStore } from '../socialStore';
import audio from '../audio';
import { TAG_FONT, TAG_RES, ASSETS } from './shared';

// Cuando huye, el jefe queda escondido: hay que seguir sus huellas hasta acercarse tanto
const FOUND_RADIUS = 170;
const PRINT_GAP = 38;
const FOUND_KEY = 'mitico_encontrado';
const foundKey = (hunt) => `${hunt.id}:${hunt.x},${hunt.y}`;
function wasFound(hunt) {
  try { return sessionStorage.getItem(FOUND_KEY) === foundKey(hunt); } catch { return false; }
}

// colores de cada jefe mítico (gprback/lib/mythic.js MITICOS): luz de luna en la Pradera, rayo en
// las Montañas y brasa en el Volcán. En la última fase (luna roja, tormenta, erupción) todos se tiñen.
const THEMES = {
  pradera: { glow: 0x7ff8ff, tag: '#c8f4ff', mote: 0xc8f4ff, minion: 0x9ae8ff, fog: 0xc8d8ff, print: 0x9ae8ff },
  montanas: { glow: 0xffe46a, tag: '#fff2b0', mote: 0xfff7a0, minion: 0xffe46a, fog: 0xd8dce8, print: 0xffe46a },
  volcan: { glow: 0xff8a3a, tag: '#ffd0a0', mote: 0xffb060, minion: 0xff8a3a, fog: 0xc8a8a0, print: 0xff9a5a },
};
const themeOf = (zoneDir) => THEMES[zoneDir] ?? THEMES.pradera;

// Jefe mítico en el mapa: aparece, se muda, sus esbirros, la noche eterna con niebla y el rastreo.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const mythicMethods = {
  // Aparece en la casilla que mandó el servidor (o la libre más cercana): grande, con aura de
  // luna, motas de luz y su nombre. Se desafía con E como un jefe de guarida.
  setMythic(hunt) {
    const moved = this.mythic && hunt && this.mythic.id === hunt.id && (this.mythic.hunt.x !== hunt.x || this.mythic.hunt.y !== hunt.y);
    if (this.mythic && (!hunt || this.mythic.id !== hunt.id || moved)) {
      const m = this.mythic;
      if (!moved) this.clearMinions();
      [m.sprite, m.aura, m.glow, m.tag, m.motes, m.block].forEach((o) => o?.destroy());
      this.clearMythicTrail();
      this.pois = this.pois.filter((p) => p.id !== 'mitico');
      if (this.nearPoi?.id === 'mitico') { this.nearPoi = null; bus.emit('poi', null); }
      this.mythic = null;
      // terminó la cacería: amanece de golpe (unos segundos) donde estaba la noche eterna
      if (!hunt && this.nightZone) this.startDawn();
    }
    this.nightZone = hunt?.zoneDir ?? null;
    this.redMoon = !!hunt?.redMoon;
    if (this.mythic) {
      this.mythic.hunt = hunt;
      this.mythic.tag?.setColor(hunt.redMoon ? '#ffb0a0' : themeOf(hunt.zoneDir).tag);
      this.syncMinions();
      return;
    }
    if (!hunt) return;
    const z = this.zoneByDir[hunt.zoneDir];
    const catalog = this.cache.json.get('enemigos')?.monsters;
    const info = catalog?.[hunt.code];
    if (!z || !info || !this.walk) return;
    const { x, y } = this.freeTileNear(z, hunt.x, hunt.y);
    const key = `mon_${hunt.code}`;
    this.mythic = { id: hunt.id, hunt, zoneDir: z.dir, x, y };
    // huyó: escondido hasta que sigas sus huellas (salvo que ya lo hayas encontrado)
    if (hunt.from && !wasFound(hunt)) {
      const from = this.freeTileNear(z, hunt.from.x, hunt.from.y);
      Object.assign(this.mythic, { hidden: true, fromX: from.x, fromY: from.y });
      this.drawMythicTrail(from.x, from.y, x, y, hunt.redMoon, themeOf(hunt.zoneDir).print);
    }
    const build = () => {
      const m = this.mythic;
      // (si su hoja aún se está cargando, el aviso de "cargada" lo vuelve a llamar)
      if (!m || m.id !== hunt.id || m.sprite || m.hidden || !this.textures.exists(key)) return;
      const animKey = `mon_idle_${hunt.code}`;
      if (this.anims.exists(animKey) && !this.anims.get(animKey).frames.length) this.anims.remove(animKey);
      if (!this.anims.exists(animKey)) {
        this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key, frame: f })), frameRate: 2, repeat: -1 });
      }
      const th = themeOf(hunt.zoneDir);
      m.glow = this.add.image(x, y - 10, 'luz').setDepth(8).setBlendMode('ADD').setTint(th.glow).setScale(2.4).setAlpha(0.55);
      this.tweens.add({ targets: m.glow, alpha: 0.25, scale: 2.8, duration: 1400, yoyo: true, repeat: -1 });
      m.aura = this.add.ellipse(x, y + 14, 78, 22, th.glow, 0.3).setDepth(8);
      this.tweens.add({ targets: m.aura, alpha: 0.1, scaleX: 1.2, duration: 1100, yoyo: true, repeat: -1 });
      m.sprite = this.add.sprite(x, y, key, info.animations.idle.frames[0]).setOrigin(0.5, 0.9).setScale(1.35).setDepth(9).play(animKey);
      m.motes = this.add.particles(x, y - 20, 'mota_mundo', {
        x: { min: -40, max: 40 }, y: { min: -30, max: 20 }, lifespan: 1800, frequency: 140, speedY: { min: -18, max: -6 },
        scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: th.mote, blendMode: 'ADD',
      }).setDepth(9.5);
      m.block = this.add.rectangle(x, y + 4, 44, 20);
      this.blockers.add(m.block);
      m.tag = this.add.text(x, y - m.sprite.displayHeight * 0.9 - 2, `MÍTICO · ${hunt.name}`, {
        fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: th.tag, stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      [m.glow, m.tag, m.motes].forEach((o) => this.minimap?.ignore(o));
      if (hunt.redMoon) { m.tag.setColor('#ffb0a0'); m.glow.setTint(0xff7a7a); m.aura.setFillStyle(0xff6a5a, 0.3); }
      this.pois.push({ id: 'mitico', x, y: y + 10, label: `Enfrentar a ${hunt.name}`, mythic: true, radius: 72 });
      // si lo venías rastreando y se mudó, la flecha apunta al nuevo lugar
      if (socialStore.get().track?.mythic) socialStore.setTrack({ name: hunt.name.split(',')[0], x, y, mythic: true });
      this.syncMinions();
    };
    this.mythic.build = build;
    if (this.mythic.hidden) { this.syncMinions(); bus.emit('mythic-hidden', { id: hunt.id, hidden: true }); }
    if (this.textures.exists(key)) build();
    else this.loadThen(() => this.load.spritesheet(key, `${ASSETS}/sprites/combate/${info.sheet}`, { frameWidth: info.frameSize.w, frameHeight: info.frameSize.h }), build);
  },

  // casilla (global, centro) caminable más cercana a una casilla local de la zona
  freeTileNear(z, lx, ly) {
    let tx = Math.floor(z.ox / 32) + lx;
    let ty = Math.floor(z.oy / 32) + ly;
    if (!this.walkable(tx, ty)) {
      let best = null;
      for (let r = 1; r <= 10 && !best; r++) {
        for (let dy = -r; dy <= r && !best; dy++) {
          for (let dx = -r; dx <= r && !best; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.walkable(tx + dx, ty + dy)) best = [tx + dx, ty + dy];
          }
        }
      }
      if (best) [tx, ty] = best;
    }
    return { x: tx * 32 + 16, y: ty * 32 + 16 };
  },

  // Huellas brillantes desde donde huyó hasta su escondite, por el camino caminable (A*), una
  // cada PRINT_GAP px, alternando pata izquierda y derecha; titilan en cadena hacia adelante
  drawMythicTrail(x0, y0, x1, y1, red, tint = 0x9ae8ff) {
    this.clearMythicTrail();
    if (!this.textures.exists('huella')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillEllipse(6, 8, 7, 6);
      [[2.5, 3.5], [6, 2], [9.5, 3.5]].forEach(([cx, cy]) => g.fillCircle(cx, cy, 1.6));
      g.generateTexture('huella', 12, 12).destroy();
    }
    const path = [{ x: x0, y: y0 }, ...(this.findPath(x0, y0, x1, y1, 0) ?? [{ x: x1, y: y1 }])];
    const prints = [];
    let carry = 0;
    let side = 1;
    for (let i = 1; i < path.length && prints.length < 160; i++) {
      const a = path[i - 1];
      const b = path[i];
      const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (let d = PRINT_GAP - carry; d < len; d += PRINT_GAP) {
        const px = a.x + Math.cos(ang) * d + Math.cos(ang + Math.PI / 2) * 5 * side;
        const py = a.y + Math.sin(ang) * d + Math.sin(ang + Math.PI / 2) * 5 * side;
        side = -side;
        prints.push(this.add.image(px, py + 8, 'huella').setRotation(ang + Math.PI / 2).setDepth(20.65)
          .setBlendMode('ADD').setTint(red ? 0xff9a8a : tint).setAlpha(0.35));
      }
      carry = (carry + len) % PRINT_GAP;
    }
    prints.forEach((p, i) => {
      this.minimap?.ignore(p);
      this.tweens.add({ targets: p, alpha: 0.95, scale: 1.25, duration: 380, yoyo: true, repeat: -1, repeatDelay: 1600, delay: (i % 40) * 90 });
    });
    this.mythicTrail = prints;
  },

  clearMythicTrail() {
    (this.mythicTrail ?? []).forEach((p) => { this.tweens.killTweensOf(p); p.destroy(); });
    this.mythicTrail = [];
  },

  // ¿llegaste al escondite siguiendo las huellas? (lo llama update)
  checkMythicTrail(time) {
    const m = this.mythic;
    if (!m?.hidden || !this.player || time < (this.nextTrailCheck ?? 0)) return;
    this.nextTrailCheck = time + 300;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) > FOUND_RADIUS) return;
    m.hidden = false;
    try { sessionStorage.setItem(FOUND_KEY, foundKey(m.hunt)); } catch { /* sin guardar */ }
    this.clearMythicTrail();
    m.build?.();
    this.cameras.main.shake(300, 0.006);
    audio.sfx('encuentro');
    bus.emit('mythic-hidden', { id: m.id, hidden: false });
    bus.emit('social-toast', { text: `¡Encontraste el escondite de ${m.hunt.name.split(',')[0]}!`, kind: 'tour' });
  },

  // flecha de rastreo hacia el jefe (botón "Rastrear" de la barra); si está escondido, hacia el
  // comienzo de sus huellas
  trackMythic() {
    const m = this.mythic;
    if (!m) return false;
    const name = m.hunt.name.split(',')[0];
    if (m.hidden) socialStore.setTrack({ name: `las huellas de ${name}`, x: m.fromX, y: m.fromY, mythic: true });
    else socialStore.setTrack({ name, x: m.x, y: m.y, mythic: true });
    return true;
  },

  // Esbirros (lobos espectrales, cabras tronadoras, crías de Ignivora): desde la fase 1 rondan
  // alrededor del jefe; cazarlos lo debilita
  syncMinions() {
    const m = this.mythic;
    const want = m?.hunt?.phase >= 1 ? 6 : 0;
    this.minions = (this.minions ?? []).filter((x) => x.active);
    if (!want) { this.clearMinions(); return; }
    const code = m.hunt.minionCode ?? 'LOBO_ESPECTRAL';
    const catalog = this.cache.json.get('enemigos')?.monsters;
    const info = catalog?.[code];
    if (!info) return;
    const key = `mon_${code}`;
    const spawn = () => {
      this.minions = (this.minions ?? []).filter((x) => x.active);
      const cx = m.hidden ? m.fromX : m.x;
      const cy = m.hidden ? m.fromY : m.y;
      const area = new Phaser.Geom.Rectangle(cx - 12 * 32, cy - 9 * 32, 24 * 32, 18 * 32);
      for (let i = this.minions.length; i < want; i++) {
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 20; tries++) {
          x = Phaser.Math.Between(area.x, area.right);
          y = Phaser.Math.Between(area.y, area.bottom);
          if (this.walkable(Math.floor(x / 32), Math.floor(y / 32)) && Phaser.Math.Distance.Between(x, y, cx, cy) > 96) break;
        }
        const animKey = `mon_idle_${code}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key, frame: f })), frameRate: 2.5, repeat: -1 });
        }
        const mon = this.monsters.create(x, y, key, info.animations.idle.frames[0]).setScale(0.8).setDepth(9).setAlpha(0.85);
        mon.play(animKey);
        mon.body.setSize(24, 16).setOffset(info.frameSize.w / 2 - 12, info.frameSize.h - 20);
        mon.setData({ code, name: info.name, area, chunk: 'mitico', minion: true });
        const glow = this.add.image(x, y - 6, 'luz').setDepth(8.5).setBlendMode('ADD').setTint(themeOf(m.zoneDir).minion).setScale(0.9).setAlpha(0.35);
        this.minimap?.ignore(glow);
        mon.setData('glow', glow);
        mon.once('destroy', () => glow.destroy());
        mon.setAlpha(0);
        this.tweens.add({ targets: mon, alpha: 0.85, duration: 900 });
        this.wander(mon);
        this.minions.push(mon);
      }
    };
    if (this.textures.exists(key)) spawn();
    else this.loadThen(() => this.load.spritesheet(key, `${ASSETS}/sprites/combate/${info.sheet}`, { frameWidth: info.frameSize.w, frameHeight: info.frameSize.h }), spawn);
  },

  clearMinions() {
    (this.minions ?? []).forEach((x) => x.active && x.destroy());
    this.minions = [];
  },

  // ¿el héroe está bajo la noche eterna del jefe mítico?
  frozenNight() {
    return !!this.nightZone && this.zone?.dir === this.nightZone;
  },

  startDawn() {
    this.dawnFrom = this.shade?.fillColor ?? 0x5a64a8;
    this.dawnUntil = this.time.now + 20000;
  },

  challengeMythic() {
    const m = this.mythic;
    if (!m?.sprite) return;
    const h = m.hunt;
    bus.emit('boss-challenge', {
      kind: 'mythic', rank: 'mitico', code: h.code, name: h.name, level: h.minLevel, hp: h.hp, maxHp: h.maxHp,
      zoneId: this.zoneByDir[m.zoneDir]?.world.zona ?? this.zoneId, position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  },

  // niebla espectral de la cacería (la ven todos los de la zona, no es al azar como la lluvia)
  setMythicFog(on) {
    if (!this.mythicFog && on) {
      this.mythicFog = this.add.particles(0, 0, 'luz', {
        x: { min: -460, max: 460 }, y: { min: -320, max: 320 }, lifespan: 9000, frequency: 420,
        speedX: { min: 4, max: 14 }, speedY: { min: -3, max: 3 }, scale: { start: 2.6, end: 3.6 },
        alpha: { onEmit: () => 0, onUpdate: (_p, _k, t) => Math.sin(t * Math.PI) * 0.2 }, tint: 0xc8d8ff, emitting: false,
      }).setDepth(20.8);
      this.minimap?.ignore(this.mythicFog);
    }
    if (!this.mythicFog) return;
    const v = this.cameras.main.worldView;
    this.mythicFog.setPosition(v.centerX, v.centerY);
    if (on !== this.mythicFog.emitting) {
      this.mythicFog.emitting = on;
      this.mythicFog.setParticleTint(this.redMoon ? 0xffc0b8 : themeOf(this.nightZone).fog);
      if (on && (this.weather === 'lluvia' || this.weather === 'nieve')) this.setWeather('despejado');
      bus.emit('weather', on ? 'niebla' : this.weather);
    }
  },
};
