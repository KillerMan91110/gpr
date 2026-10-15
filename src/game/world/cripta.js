import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';
import { ASSETS, TAG_FONT, TAG_RES, propOf } from './shared';

// La Cripta del Vigía (gprback/lib/cripta.js, mapa de art/mapas/generar_cripta.js): mazmorra bajo
// las Ruinas del Vigía. Aquí viven la boca de la cripta que se ve en la Pradera y, dentro, los
// guardianes que patrullan con su cono de visión (si te ven, te persiguen), los braseros de
// control, la Puerta del Vigía (sellada hasta vencer a los guardianes) y el jefe en su estrado.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const PATROL_SPEED = 36;
const CHASE_SPEED = 80; // el héroe va a 110: si corres a tiempo, te escapas
const RETURN_SPEED = 50;
const VIEW = 112; // alcance del cono de visión (px)
const VIEW_ANGLE = Phaser.Math.DegToRad(38); // medio ángulo del cono
const SENSE = 34; // te nota aunque estés a su espalda si te pegas mucho
const GIVE_UP = 230; // a esta distancia deja de perseguirte
const CHASE_MS = 6000;
const GUARD_SCALE = 0.8;
const FLED_IGNORE_MS = 8000; // el guardián del que huiste no te ve en este rato (vuelve a su ronda)

export const criptaMethods = {
  buildCrypt(all) {
    // ---- desde fuera: la boca de la cripta sobre su salida en las Ruinas del Vigía
    const mouths = (this.exits ?? []).filter((e) => e.dest === 'cripta');
    if (mouths.length) {
      this.loadThen(() => { if (!this.textures.exists('mz_entrada')) this.load.image('mz_entrada', `${ASSETS}/mundo/mazmorra/entrada.png`); }, () => {
        for (const e of mouths) {
          const img = this.add.image(e.rect.centerX, e.rect.bottom, 'mz_entrada').setOrigin(0.5, 1).setDepth(8.9);
          const glow = this.add.image(e.rect.centerX, e.rect.y + 4, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(0x7ff8ff).setScale(0.5).setAlpha(0.5);
          this.tweens.add({ targets: glow, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1 });
          this.minimap?.ignore(glow);
          img.setData('label', e.label);
        }
      });
    }
    this.crypt = null;
    if (!this.world.mazmorra) return;

    // ---- dentro de la cripta
    const crypt = { state: null, guardians: [], braziers: [], door: null, boss: null, ready: false };
    this.crypt = crypt;
    const catalog = this.cache.json.get('enemigos').monsters;
    const gPoints = all.filter((o) => o.type === 'guardian');
    const bossPt = all.find((o) => o.type === 'vigia');
    const codes = new Set([...gPoints.map((o) => propOf(o, 'monstruo')), bossPt && propOf(bossPt, 'monstruo')].filter(Boolean));
    this.loadThen(() => {
      if (!this.textures.exists('mz_brasero')) this.load.spritesheet('mz_brasero', `${ASSETS}/mundo/mazmorra/brasero.png`, { frameWidth: 32, frameHeight: 32 });
      if (!this.textures.exists('mz_puerta')) this.load.spritesheet('mz_puerta', `${ASSETS}/mundo/mazmorra/puerta_sello.png`, { frameWidth: 128, frameHeight: 64 });
      for (const code of codes) {
        const m = catalog[code];
        if (m && !this.textures.exists(`mon_${code}`)) this.load.spritesheet(`mon_${code}`, `${ASSETS}/sprites/combate/${m.sheet}`, { frameWidth: m.frameSize.w, frameHeight: m.frameSize.h });
      }
    }, () => {
      if (!this.anims.exists('mz_brasero_fuego')) this.anims.create({ key: 'mz_brasero_fuego', frames: this.anims.generateFrameNumbers('mz_brasero', { start: 1, end: 4 }), frameRate: 8, repeat: -1 });
      if (!this.anims.exists('mz_puerta_sello')) this.anims.create({ key: 'mz_puerta_sello', frames: this.anims.generateFrameNumbers('mz_puerta', { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
      this.buildBraziers(all.filter((o) => o.type === 'brasero'));
      this.buildDoor(all.find((o) => o.type === 'sello'));
      if (bossPt) this.buildCryptBoss(bossPt, catalog);
      crypt.guardianPoints = gPoints;
      crypt.catalog = catalog;
      crypt.ready = true;
      if (crypt.state) this.applyCryptState(crypt.state);
    });
    this.guardianGroup = this.physics.add.group();
    this.physics.add.overlap(this.player, this.guardianGroup, (_p, s) => this.guardianCatch(s.getData('guardian')));
    this.coneGfx = this.add.graphics().setDepth(8.5);
    this.minimap?.ignore(this.coneGfx);
  },

  buildBraziers(points) {
    this.crypt.braziers = points.map((o) => {
      const x = o.x + 16;
      const y = o.y + 16;
      const sprite = this.add.sprite(x, y, 'mz_brasero', 0).setOrigin(0.5, 0.75).setDepth(9 + y / 100000);
      const block = this.add.rectangle(x, y + 2, 20, 12);
      this.blockers.add(block);
      const glow = this.add.image(x, y - 8, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(0xff9a4a).setScale(1.5).setAlpha(0);
      this.minimap?.ignore(glow);
      return { orden: propOf(o, 'orden'), label: propOf(o, 'etiqueta') ?? 'Brasero', x, y, sprite, glow, lit: false };
    });
  },

  buildDoor(o) {
    if (!o) return;
    const x = o.x + (o.width || 128) / 2;
    const y = o.y + (o.height || 64);
    const sprite = this.add.sprite(x, y, 'mz_puerta', 0).setOrigin(0.5, 1).setDepth(8.8).play('mz_puerta_sello');
    const block = this.add.rectangle(x, o.y + 40, o.width || 128, 48);
    this.blockers.add(block);
    const glow = this.add.image(x, o.y + 40, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(0x7ff8ff).setScale(1.2).setAlpha(0.6);
    this.tweens.add({ targets: glow, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    this.minimap?.ignore(glow);
    this.crypt.door = { x, y: o.y + 64, sprite, block, glow, open: false };
  },

  buildCryptBoss(o, catalog) {
    const code = propOf(o, 'monstruo');
    const info = catalog[code];
    if (!info || !this.textures.exists(`mon_${code}`)) return;
    const animKey = `mon_idle_${code}`;
    if (!this.anims.exists(animKey)) this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key: `mon_${code}`, frame: f })), frameRate: 2, repeat: -1 });
    const { x, y } = o;
    const aura = this.add.ellipse(x, y + 14, 64, 20, 0x7ff8ff, 0.3).setDepth(8);
    this.tweens.add({ targets: aura, alpha: 0.1, scaleX: 1.2, duration: 1100, yoyo: true, repeat: -1 });
    const sprite = this.add.sprite(x, y, `mon_${code}`, info.animations.idle.frames[0]).setOrigin(0.5, 0.9).setDepth(9).play(animKey);
    const block = this.add.rectangle(x, y + 4, 34, 18);
    this.blockers.add(block);
    const tag = this.add.text(x, y - sprite.displayHeight * 0.9 - 2, `JEFE · ${info.name}`, {
      fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#9af4ff', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
    this.minimap?.ignore(tag);
    this.crypt.boss = { code, name: info.name, x, y, sprite, aura, tag, block };
    this.pois.push({ id: 'cripta_vigia', x, y: y + 12, label: `Desafiar ${/^El /.test(info.name) ? info.name.replace(/^El /, 'al ') : `a ${info.name}`}`, action: 'crypt-boss', radius: 56 });
  },

  // ---- estado del recorrido (lo manda React: braseros, guardianes vencidos, puerta)
  applyCryptState(st) {
    const crypt = this.crypt;
    if (!crypt) return;
    crypt.state = st;
    if (!crypt.ready) return;
    for (const b of crypt.braziers) {
      const lit = b.orden <= st.braziers;
      if (lit && !b.lit) b.sprite.play('mz_brasero_fuego');
      if (!lit && b.lit) b.sprite.stop().setFrame(0);
      b.lit = lit;
      this.pois = this.pois.filter((p) => p.id !== `brasero_${b.orden}`);
      if (!lit) this.pois.push({ id: `brasero_${b.orden}`, x: b.x, y: b.y + 6, label: `Encender: ${b.label}`, action: 'crypt-brazier', arg: b.orden, radius: 46 });
    }
    const d = crypt.door;
    if (d && d.open !== st.doorOpen) {
      d.open = st.doorOpen;
      d.block.body.enable = !d.open;
      d.glow.setVisible(!d.open);
      if (d.open) d.sprite.stop().setFrame(2); else d.sprite.play('mz_puerta_sello');
    }
    this.pois = this.pois.filter((p) => p.id !== 'cripta_puerta');
    if (d && !d.open) {
      this.pois.push({
        id: 'cripta_puerta', x: d.x, y: d.y + 10, radius: 70, action: 'crypt-door',
        label: `Puerta sellada (${st.guardians.length}/${st.totalGuardians} guardianes)`,
      });
    }
    // cripta completada (venciste al Vigía): el jefe ya no está mientras sigas adentro
    const b = crypt.boss;
    if (b) {
      const gone = !!st.cleared;
      [b.sprite, b.aura, b.tag].forEach((o) => o?.setVisible(!gone));
      if (b.block?.body) b.block.body.enable = !gone;
      this.pois = this.pois.filter((p) => p.id !== 'cripta_vigia');
      if (!gone) this.pois.push({ id: 'cripta_vigia', x: b.x, y: b.y + 12, label: `Desafiar ${/^El /.test(b.name) ? b.name.replace(/^El /, 'al ') : `a ${b.name}`}`, action: 'crypt-boss', radius: 56 });
    }
    if (this.nearPoi && !this.pois.includes(this.nearPoi)) { this.nearPoi = null; bus.emit('poi', null); }
    // guardianes: los vencidos desaparecen, los que faltan aparecen en el inicio de su ronda
    // completada: no vuelve a salir ningún guardián hasta que salgas y vuelvas a entrar
    const down = new Set(st.cleared ? (crypt.guardianPoints ?? []).map((o) => o.name).concat(st.guardians) : st.guardians);
    for (const g of crypt.guardians) if (down.has(g.id)) this.removeGuardian(g);
    crypt.guardians = crypt.guardians.filter((g) => !down.has(g.id));
    for (const o of crypt.guardianPoints ?? []) {
      if (down.has(o.name) || crypt.guardians.some((g) => g.id === o.name)) continue;
      this.spawnGuardian(o);
    }
  },

  spawnGuardian(o) {
    const code = propOf(o, 'monstruo');
    const info = this.crypt.catalog[code];
    if (!info || !this.textures.exists(`mon_${code}`)) return;
    const z = this.zoneByDir[o.zone] ?? this.zone;
    const route = String(propOf(o, 'ruta') ?? '').split(';').map((s) => s.split(',').map(Number))
      .filter((p) => p.length === 2 && p.every(Number.isFinite))
      .map(([tx, ty]) => ({ x: z.ox + tx * 32 + 16, y: z.oy + ty * 32 + 16 }));
    if (!route.length) return;
    const animKey = `mon_idle_${code}`;
    if (!this.anims.exists(animKey)) this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key: `mon_${code}`, frame: f })), frameRate: 3, repeat: -1 });
    const sprite = this.guardianGroup.create(route[0].x, route[0].y, `mon_${code}`, info.animations.idle.frames[0]).setScale(GUARD_SCALE).setDepth(9).play(animKey);
    sprite.body.setSize(22, 14).setOffset(info.frameSize.w / 2 - 11, info.frameSize.h - 18);
    const tag = this.add.text(sprite.x, sprite.y, info.name, {
      fontFamily: TAG_FONT, fontSize: '6px', fontStyle: 'bold', color: '#ffb0a0', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
    const alert = this.add.text(sprite.x, sprite.y, '!', {
      fontFamily: TAG_FONT, fontSize: '12px', fontStyle: 'bold', color: '#ff5a4a', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES).setVisible(false);
    this.minimap?.ignore([tag, alert]);
    const g = {
      id: o.name, code, name: info.name, sprite, tag, alert, route, loop: [true, 'true', 1, '1'].includes(propOf(o, 'vuelta')),
      wp: route.length > 1 ? 1 : 0, dir: 1, mode: 'patrol', angle: 0, until: 0, tagDy: (info.frameSize.h * GUARD_SCALE) / 2 + 2,
    };
    sprite.setData('guardian', g);
    this.crypt.guardians.push(g);
  },

  removeGuardian(g) {
    if (!g.sprite.active) return;
    this.tweens.add({ targets: [g.sprite, g.tag], alpha: 0, duration: 600, onComplete: () => { g.sprite.destroy(); g.tag.destroy(); g.alert.destroy(); } });
    g.sprite.body.enable = false;
  },

  // mueve hacia (tx, ty) sin meterse en paredes; devuelve la distancia que faltaba
  guardianStep(g, tx, ty, speed, dt) {
    const s = g.sprite;
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return d;
    const step = Math.min(d, speed * dt);
    const nx = s.x + (dx / d) * step;
    const ny = s.y + (dy / d) * step;
    const ok = (x, y) => this.walkable(Math.floor(x / 32), Math.floor((y + 8) / 32));
    if (ok(nx, ny)) s.setPosition(nx, ny);
    else if (ok(nx, s.y)) s.setPosition(nx, s.y);
    else if (ok(s.x, ny)) s.setPosition(s.x, ny);
    g.angle = Math.atan2(dy, dx);
    // los sprites de combate miran a la izquierda: voltear al ir a la derecha
    s.setFlipX(dx > 0.5);
    return d;
  },

  updateCrypt(time, delta) {
    const crypt = this.crypt;
    if (!crypt?.ready) return;
    const dt = Math.min(delta, 50) / 1000;
    // braseros encendidos: la luz tiembla
    for (const b of crypt.braziers) b.glow.setAlpha(b.lit ? 0.75 + Math.sin(time / 90 + b.orden) * 0.08 + Math.random() * 0.05 : 0);
    this.coneGfx.clear();
    const frozen = this.encounterLock;
    const calm = time < (this.graceUntil ?? 0);
    for (const g of crypt.guardians) {
      const s = g.sprite;
      if (!s.active) continue;
      g.tag.setPosition(s.x, s.y - g.tagDy);
      g.alert.setPosition(s.x, s.y - g.tagDy - 8);
      if (frozen) continue;
      // huiste de este: el rato sin verte se cuenta desde el primer cuadro tras el combate
      if (g.ignoreMs) { g.ignoreUntil = time + g.ignoreMs; g.ignoreMs = 0; g.sprite.setAlpha(0.55); }
      if (g.ignoreUntil && time > g.ignoreUntil) { g.ignoreUntil = 0; g.sprite.setAlpha(1); }
      const pd = Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y);
      if (g.mode === 'patrol') {
        const t = g.route[g.wp];
        if (this.guardianStep(g, t.x, t.y, PATROL_SPEED, dt) < 3 && g.route.length > 1) {
          if (g.loop) g.wp = (g.wp + 1) % g.route.length;
          else {
            if (g.wp + g.dir >= g.route.length || g.wp + g.dir < 0) g.dir *= -1;
            g.wp += g.dir;
          }
        }
        // ¿te ve? dentro del cono (y sin pared en medio) o pegado a él
        const ang = Phaser.Math.Angle.Between(s.x, s.y, this.player.x, this.player.y);
        const inCone = pd < VIEW && Math.abs(Phaser.Math.Angle.Wrap(ang - g.angle)) < VIEW_ANGLE;
        const seen = !calm && !g.ignoreUntil && (pd < SENSE || (inCone && this.clearLine(Math.floor(s.x / 32), Math.floor(s.y / 32), Math.floor(this.player.x / 32), Math.floor(this.player.y / 32))));
        if (seen) {
          g.mode = 'alert';
          g.until = time + 450;
          g.alert.setVisible(true);
          this.tweens.add({ targets: g.alert, y: g.alert.y - 4, duration: 120, yoyo: true });
          audio.sfx('encuentro');
        }
        // cono de visión en el suelo
        this.coneGfx.fillStyle(0x7ff8ff, 0.1);
        this.coneGfx.slice(s.x, s.y + 6, VIEW, g.angle - VIEW_ANGLE, g.angle + VIEW_ANGLE, false);
        this.coneGfx.fillPath();
      } else if (g.mode === 'alert') {
        g.angle = Phaser.Math.Angle.Between(s.x, s.y, this.player.x, this.player.y);
        s.setFlipX(this.player.x > s.x);
        if (time > g.until) { g.mode = 'chase'; g.until = time + CHASE_MS; }
      } else if (g.mode === 'chase') {
        this.guardianStep(g, this.player.x, this.player.y, CHASE_SPEED, dt);
        if (pd > GIVE_UP || time > g.until || calm) { g.mode = 'return'; g.alert.setVisible(false); }
      } else if (g.mode === 'return') {
        // vuelve al punto de su ronda más cercano
        let best = 0;
        g.route.forEach((p, i) => { if (Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) < Phaser.Math.Distance.Between(s.x, s.y, g.route[best].x, g.route[best].y)) best = i; });
        if (this.guardianStep(g, g.route[best].x, g.route[best].y, RETURN_SPEED, dt) < 3) { g.wp = best; g.mode = 'patrol'; }
      }
    }
  },

  // un guardián te alcanzó: combate contra él y su escolta
  guardianCatch(g) {
    if (!g || g.ignoreUntil || g.ignoreMs || this.encounterLock || this.time.now < (this.graceUntil ?? 0)) return;
    this.encounterLock = true;
    this.lastGuardian = g;
    this.stopPlayer();
    this.input.keyboard.enabled = false;
    this.cameras.main.shake(250, 0.006);
    audio.sfx('encuentro');
    this.tweens.add({ targets: g.sprite, alpha: 0.3, yoyo: true, repeat: 3, duration: 90 });
    g.alert.setVisible(false);
    g.mode = 'patrol';
    bus.emit('encounter', {
      kind: 'cripta', target: g.id, code: g.code, name: g.name, zoneId: this.zoneId,
      position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  },

  challengeCryptBoss() {
    const b = this.crypt?.boss;
    if (!b) return;
    bus.emit('boss-challenge', {
      kind: 'cripta', target: 'jefe', code: b.code, name: b.name, rank: 'jefe',
      level: Math.max(6, Math.min(13, (this.heroLevel ?? 1) + 1)),
      zoneId: this.zoneId, position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  },

  // acciones de los puntos de la cripta (tecla E o el botón de acción)
  cryptAction(poi) {
    if (poi.action === 'crypt-boss') this.challengeCryptBoss();
    else bus.emit(poi.action, poi.arg);
  },

  // al volver de un combate: el guardián vencido se desvanece y React vuelve a pedir el estado
  cryptAfterBattle(result) {
    if (!this.crypt) return;
    const g = this.lastGuardian;
    this.lastGuardian = null;
    if (result === 'PLAYER_WON' && g) this.removeGuardian(g);
    if (result === 'ESCAPED' && g?.sprite.active) g.ignoreMs = FLED_IGNORE_MS;
    // los que te perseguían vuelven a su ronda
    for (const q of this.crypt.guardians) { q.mode = 'return'; q.alert.setVisible(false); }
    bus.emit('crypt-refresh');
  },

  // dónde despiertas si caes dentro: el último brasero encendido (o la entrada)
  cryptRespawn() {
    const r = this.crypt?.state?.respawn;
    return r ? this.toGlobal(r.x * 32 + 16, r.y * 32 + 16, this.zoneDir) : this.spawnPoint;
  },

  // la cripta no tiene cielo: oscuridad fija y solo la luz de antorchas, braseros y tu farol
  updateIndoorSky() {
    this.shade.setFillStyle(0x3c3858);
    const flicker = 0.9 + Math.sin(this.time.now / 90) * 0.05 + Math.random() * 0.05;
    // el faro del Vigía late despacio y suave (si no, tapa al jefe)
    for (const l of this.lights2) l.glow.setAlpha(l.tipo === 'faro' ? 0.32 + Math.sin(this.time.now / 700) * 0.08 : l.fire ? flicker : 0.85);
    this.heroLight.setPosition(this.player.x, this.player.y - 6).setScale(1.9).setAlpha(0.55);
    this.fireflies.emitting = false;
  },
};
