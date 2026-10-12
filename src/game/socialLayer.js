import Phaser from 'phaser';
import bus from './bus';
import { DIALOGUES } from './dialogues';
import { socialStore } from './socialStore';

// Lo social del mundo: los demás jugadores caminando (con su clase, nombre, nivel y gremio),
// los globitos de chat sobre las cabezas (también el de "…" mientras alguien escribe), gestos,
// emojis, estados (en combate / ausente) y las frases sueltas de los NPCs. La red la maneja
// React (pages/World.js) y llega aquí por el bus.

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const TAG_FONT = 'Cinzel, Georgia, serif';
const TEXT_FONT = "'EB Garamond', Georgia, serif";
const RES = 4;
const IDLE = { down: 0, up: 3, side: 6 };
const GESTURES = ['saludar', 'bailar', 'reir', 'sentarse', 'aplaudir']; // frames de gestos.png
const STATE_ICON = { combate: '⚔', ausente: '💤' };
const NPC_CHAT_MS = [14000, 26000];
const MEET_RADIUS = 10 * 32; // a esta distancia cuenta como "te cruzaste" (lista de recientes)
const FOUND_RADIUS = 3 * 32; // rastro: llegaste

export default class SocialLayer {
  constructor(scene) {
    this.scene = scene;
    this.myId = null;
    this.others = new Map(); // id → { sprite, name, guild, stateIcon, dot, tx, ty, f, flip, m, cls, state }
    this.bubbles = new Map(); // clave de entidad → { box, typing, timer }
    this.met = new Set();
    this.track = socialStore.get().track;
    this.ensureTextures();
    this.bind();
    this.scheduleNpcChat();
    this.createTrackArrow();
    // bandera "busco grupo" del héroe, junto a su nombre
    this.heroFlag = scene.add.text(0, 0, socialStore.get().lfg ? '⚑' : '', { fontSize: '8px', color: '#ffd84a', stroke: '#141420', strokeThickness: 3 })
      .setOrigin(0, 1).setDepth(21).setResolution(RES);
    scene.minimap?.ignore(this.heroFlag);
  }

  static preload(scene) {
    scene.load.spritesheet('gestos', `${ASSETS}/mundo/gestos.png`, { frameWidth: 16, frameHeight: 16 });
  }

  ensureTextures() {
    const s = this.scene;
    if (s.textures.exists('globo_px')) return;
    const g = s.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2).generateTexture('globo_px', 2, 2).destroy();
  }

  bind() {
    const handlers = {
      'others-roster': ({ me, list }) => this.setRoster(me, list),
      'other-join': (p) => this.upsert(p),
      'other-leave': ({ id }) => this.remove(id),
      'other-move': (m) => this.move(m),
      'other-typing': ({ id, on }) => this.typing(this.keyOf(id), on),
      'other-say': (m) => this.say(this.keyOf(m.id), m.text, m.loud),
      'other-emote': ({ id, emote }) => this.emote(this.keyOf(id), emote),
      'other-emoji': ({ id, emoji }) => this.emoji(this.keyOf(id), emoji),
      'other-state': ({ id, state }) => this.setState(id, state),
      'my-typing': (on) => this.typing('me', on),
      'other-lfg': ({ id, on }) => { const o = this.others.get(id); if (o) { o.lfg = on; this.setState(id, o.state); } },
      'social-lfg': (on) => this.heroFlag.setText(on ? '⚑' : ''),
      'social-track': (t) => { this.track = t; if (!t) this.trackBox.setVisible(false); },
    };
    Object.entries(handlers).forEach(([ev, fn]) => bus.on(ev, fn));
    const unbind = () => Object.entries(handlers).forEach(([ev, fn]) => bus.off(ev, fn));
    this.scene.events.once('shutdown', unbind);
    this.scene.events.once('destroy', unbind);
  }

  keyOf(id) {
    return id === this.myId ? 'me' : `p:${id}`;
  }

  // sprite y altura de la cabeza de cada entidad (yo, otro jugador, NPC)
  entity(key) {
    const s = this.scene;
    if (key === 'me') return s.player ? { sprite: s.player, top: s.nameTag.y - 8 } : null;
    if (key.startsWith('p:')) {
      const o = this.others.get(Number(key.slice(2)));
      return o ? { sprite: o.sprite, top: o.name.y - 8 } : null;
    }
    if (key.startsWith('npc:')) {
      const n = s.npcs.get(key.slice(4));
      return n ? { sprite: n.sprite, top: n.sprite.y - 38 } : null;
    }
    return null;
  }

  // ------------------------------------------------------------------ otros jugadores
  setRoster(me, list) {
    this.myId = me;
    for (const id of [...this.others.keys()]) if (!list.some((p) => p.id === id)) this.remove(id);
    list.forEach((p) => this.upsert(p));
  }

  upsert(p) {
    if (p.id === this.myId) return;
    const cur = this.others.get(p.id);
    if (cur) {
      // volvió a entrar (cambió de nivel o de gremio): solo se actualizan los letreros
      cur.name.setText(`${p.name}  ${p.level}`);
      cur.guild.setText(p.guild ? `‹${p.guild.name}›` : '').setColor(p.guild?.color || '#a8e0a0');
      cur.info = p;
      cur.lfg = !!p.lfg;
      this.setState(p.id, p.state);
      return;
    }
    const s = this.scene;
    const key = `npc_${p.cls}`;
    const build = () => {
      if (this.others.has(p.id)) return;
      s.makeWalkAnims(key);
      const sprite = s.add.sprite(p.x, p.y, key, IDLE[p.f] ?? 0).setDepth(9.6).setFlipX(!!p.flip);
      sprite.setInteractive({ useHandCursor: true, pixelPerfect: false });
      sprite.on('pointerdown', (pointer) => {
        const ev = pointer.event;
        bus.emit('player-menu', { id: p.id, name: p.name, level: p.level, guild: p.guild, x: ev.clientX, y: ev.clientY });
      });
      const name = s.add.text(p.x, p.y - 22, `${p.name}  ${p.level}`, {
        fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#9fd6ff', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(RES);
      const guild = s.add.text(p.x, p.y - 14, p.guild ? `‹${p.guild.name}›` : '', {
        fontFamily: TEXT_FONT, fontSize: '7px', fontStyle: 'italic', color: p.guild?.color || '#a8e0a0', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(RES);
      const stateIcon = s.add.text(p.x, p.y, '', { fontSize: '9px' }).setOrigin(0, 1).setDepth(21).setResolution(RES);
      // punto azul en el minimapa
      const dot = s.add.circle(p.x, p.y, 12, 0x6fc3ff).setStrokeStyle(4, 0x141420).setDepth(29);
      s.cameras.main.ignore(dot);
      [name, guild, stateIcon].forEach((t) => s.minimap?.ignore(t));
      const o = { id: p.id, cls: p.cls, info: p, lfg: !!p.lfg, sprite, name, guild, stateIcon, dot, tx: p.x, ty: p.y, f: p.f, flip: p.flip, m: p.m, state: null };
      this.others.set(p.id, o);
      this.setState(p.id, p.state);
    };
    if (s.textures.exists(key)) build();
    else {
      s.load.spritesheet(key, `${ASSETS}/mundo/caminar/${p.cls}.png`, { frameWidth: 32, frameHeight: 32 });
      s.load.once(`filecomplete-spritesheet-${key}`, build);
      s.load.start();
    }
  }

  remove(id) {
    const o = this.others.get(id);
    if (!o) return;
    this.clearBubble(`p:${id}`);
    [o.sprite, o.name, o.guild, o.stateIcon, o.dot].forEach((x) => { this.scene.tweens.killTweensOf(x); x.destroy(); });
    this.others.delete(id);
  }

  move({ id, x, y, f, flip, m }) {
    const o = this.others.get(id);
    if (!o) return;
    Object.assign(o, { tx: x, ty: y, f, flip, m });
    if (m && o.sitting) this.stand(o.sprite, o);
  }

  setState(id, state) {
    const o = this.others.get(id);
    if (!o) return;
    o.state = state ?? null;
    o.stateIcon.setText(STATE_ICON[o.state] ?? (o.lfg ? '⚑' : '')).setColor(o.lfg && !o.state ? '#ffd84a' : '#ffffff');
    o.sprite.setAlpha(o.state === 'combate' ? 0.55 : 1);
  }

  // ------------------------------------------------------------------ globitos
  makeBox(text, { loud = false, small = false } = {}) {
    const s = this.scene;
    const label = s.add.text(0, 0, text, {
      fontFamily: loud ? TAG_FONT : TEXT_FONT, fontSize: loud ? '8px' : '8px', fontStyle: loud ? 'bold' : 'normal',
      color: loud ? '#8a1a10' : '#241a08', align: 'center', wordWrap: { width: small ? 40 : 112, useAdvancedWrap: true },
    }).setOrigin(0.5, 1).setResolution(RES);
    const w = Math.max(14, label.width + 8);
    const h = label.height + 5;
    const g = s.add.graphics();
    g.fillStyle(loud ? 0xfff0e0 : 0xfffaf0, 0.97);
    g.lineStyle(1, loud ? 0xc0342a : 0x3a2a14, 1);
    g.fillRoundedRect(-w / 2, -h - 3, w, h, 3);
    g.strokeRoundedRect(-w / 2, -h - 3, w, h, 3);
    // colita del globo
    g.fillTriangle(-3, -3.5, 3, -3.5, 0, 1);
    g.lineBetween(-3, -3, 0, 1);
    g.lineBetween(3, -3, 0, 1);
    label.setPosition(0, -5.5);
    const box = s.add.container(0, 0, [g, label]).setDepth(23);
    s.minimap?.ignore(box);
    box.label = label;
    return box;
  }

  clearBubble(key) {
    const b = this.bubbles.get(key);
    if (!b) return;
    b.timer?.remove();
    b.dots?.remove();
    this.scene.tweens.killTweensOf(b.box);
    b.box.destroy();
    this.bubbles.delete(key);
  }

  say(key, text, loud = false) {
    if (!this.entity(key)) return;
    this.clearBubble(key);
    const box = this.makeBox(loud ? text.toUpperCase() : text, { loud });
    box.setScale(0.6).setAlpha(0);
    this.scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
    // más tiempo si el mensaje es largo
    const ms = Math.min(10000, 3500 + text.length * 60);
    const timer = this.scene.time.delayedCall(ms, () => {
      this.scene.tweens.add({ targets: box, alpha: 0, y: box.y - 6, duration: 300, onComplete: () => this.clearBubble(key) });
    });
    this.bubbles.set(key, { box, timer });
    this.place(key);
  }

  typing(key, on) {
    const cur = this.bubbles.get(key);
    if (!on) { if (cur?.typing) this.clearBubble(key); return; }
    if (cur) return; // ya tiene un globito (escribiendo o un mensaje)
    if (!this.entity(key)) return;
    const box = this.makeBox('•••', { small: true });
    let step = 0;
    const dots = this.scene.time.addEvent({
      delay: 320, loop: true,
      callback: () => { step = (step + 1) % 4; box.label.setText(['•  ', '•• ', '•••', ' ••'][step]); },
    });
    // si se queda colgado (se fue sin terminar), desaparece solo
    const timer = this.scene.time.delayedCall(12000, () => this.clearBubble(key));
    this.bubbles.set(key, { box, typing: true, dots, timer });
    this.place(key);
  }

  place(key) {
    const b = this.bubbles.get(key);
    const e = this.entity(key);
    if (!b || !e) { if (b) this.clearBubble(key); return; }
    b.box.setPosition(e.sprite.x, e.top);
  }

  // ------------------------------------------------------------------ gestos y emojis
  emote(key, emote) {
    const e = this.entity(key);
    const frame = GESTURES.indexOf(emote);
    if (!e || frame < 0) return;
    const s = this.scene;
    const sp = e.sprite;
    const icon = s.add.image(sp.x + 10, e.top + 2, 'gestos', frame).setDepth(22.5);
    s.minimap?.ignore(icon);
    s.tweens.add({ targets: icon, y: icon.y - 12, alpha: { from: 1, to: 0 }, duration: 2400, ease: 'Sine.easeOut', onComplete: () => icon.destroy() });
    const o = key.startsWith('p:') ? this.others.get(Number(key.slice(2))) : null;
    const holder = o ?? (key === 'me' ? s : null);
    s.tweens.killTweensOf(sp);
    sp.setAngle(0).setScale(1);
    // solo ángulo y escala (no la posición: el héroe tiene física)
    if (emote === 'saludar') s.tweens.add({ targets: sp, angle: { from: -7, to: 7 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => sp.setAngle(0) });
    if (emote === 'bailar') {
      s.tweens.add({ targets: sp, scaleY: 1.12, scaleX: 0.92, duration: 180, yoyo: true, repeat: 7, onComplete: () => sp.setScale(1) });
      s.tweens.add({ targets: sp, angle: { from: -10, to: 10 }, duration: 360, yoyo: true, repeat: 3, onComplete: () => sp.setAngle(0) });
    }
    if (emote === 'reir') s.tweens.add({ targets: sp, scaleY: 0.92, duration: 90, yoyo: true, repeat: 7, onComplete: () => sp.setScale(1) });
    if (emote === 'aplaudir') s.tweens.add({ targets: sp, scaleY: 1.1, duration: 140, yoyo: true, repeat: 3, onComplete: () => sp.setScale(1) });
    if (emote === 'sentarse' && holder) {
      // sentado hasta que vuelva a caminar
      sp.setScale(1.06, 0.8);
      holder.sitting = true;
    }
  }

  stand(sp, holder) {
    holder.sitting = false;
    sp.setScale(1);
  }

  emoji(key, emoji) {
    const e = this.entity(key);
    if (!e) return;
    const s = this.scene;
    const t = s.add.text(e.sprite.x, e.top - 2, emoji, { fontSize: '14px' }).setOrigin(0.5, 1).setDepth(22.6).setResolution(RES);
    s.minimap?.ignore(t);
    t.setScale(0.3);
    s.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    s.tweens.add({ targets: t, y: t.y - 18, alpha: 0, delay: 1400, duration: 900, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ rastro hacia un amigo
  createTrackArrow() {
    const s = this.scene;
    const arrow = s.add.graphics();
    arrow.fillStyle(0x7dffa8, 1).lineStyle(1.5, 0x10301c, 1);
    arrow.beginPath(); arrow.moveTo(9, 0); arrow.lineTo(-5, -6); arrow.lineTo(-2, 0); arrow.lineTo(-5, 6); arrow.closePath();
    arrow.fillPath(); arrow.strokePath();
    const label = s.add.text(0, 0, '', {
      fontFamily: TAG_FONT, fontSize: '6px', fontStyle: 'bold', color: '#b9ffcf', stroke: '#10301c', strokeThickness: 3,
    }).setOrigin(0.5, 0).setResolution(RES);
    this.trackArrow = arrow;
    this.trackLabel = label;
    this.trackBox = s.add.container(0, 0, [arrow, label]).setDepth(24).setVisible(false);
    s.minimap?.ignore(this.trackBox);
  }

  updateTrack() {
    const s = this.scene;
    const t = this.track;
    const o = t && this.others.get(t.id);
    if (!o) { this.trackBox.setVisible(false); return; }
    const dx = o.sprite.x - s.player.x;
    const dy = o.sprite.y - s.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < FOUND_RADIUS) {
      this.trackBox.setVisible(false);
      this.track = null;
      socialStore.setTrack(null);
      this.emoji('me', '✨');
      bus.emit('social-toast', { text: `¡Encontraste a ${t.name}!`, kind: 'ok' });
      return;
    }
    const ang = Math.atan2(dy, dx);
    this.trackBox.setVisible(true).setPosition(s.player.x + Math.cos(ang) * 26, s.player.y + 4 + Math.sin(ang) * 22);
    this.trackArrow.setRotation(ang);
    this.trackLabel.setText(`${t.name} · ${Math.round(dist / 32)} m`).setPosition(0, 8);
  }

  // ------------------------------------------------------------------ NPCs que hablan solos
  scheduleNpcChat() {
    const s = this.scene;
    s.time.delayedCall(Phaser.Math.Between(...NPC_CHAT_MS), () => {
      if (!s.sys.isActive() || !s.player) { this.scheduleNpcChat(); return; }
      const near = [...s.npcs.entries()].filter(([key, n]) => DIALOGUES[key]?.ambient?.length
        && Phaser.Math.Distance.Between(n.sprite.x, n.sprite.y, s.player.x, s.player.y) < 420
        && !this.bubbles.has(`npc:${key}`));
      if (near.length) {
        const [key] = Phaser.Utils.Array.GetRandom(near);
        this.say(`npc:${key}`, Phaser.Utils.Array.GetRandom(DIALOGUES[key].ambient));
      }
      this.scheduleNpcChat();
    });
  }

  // ------------------------------------------------------------------ cada fotograma
  update(delta) {
    const s = this.scene;
    const k = 1 - Math.exp(-delta / 90);
    for (const o of this.others.values()) {
      const sp = o.sprite;
      const dx = o.tx - sp.x;
      const dy = o.ty - sp.y;
      const far = Math.hypot(dx, dy);
      if (far > 240) sp.setPosition(o.tx, o.ty); // teletransporte o se atrasó mucho
      else sp.setPosition(sp.x + dx * k, sp.y + dy * k);
      const walking = o.m || far > 2;
      const key = `npc_${o.cls}`;
      if (walking) {
        sp.anims.play(`walk_${key}_${o.f}`, true);
        sp.setFlipX(o.f === 'side' && !!o.flip);
      } else if (sp.anims.isPlaying) {
        sp.anims.stop();
        sp.setFrame(IDLE[o.f] ?? 0);
      }
      sp.setDepth(9.6 + sp.y / 100000);
      o.name.setPosition(sp.x, sp.y - (o.guild.text ? 22 : 14));
      o.guild.setPosition(sp.x, sp.y - 14);
      o.stateIcon.setPosition(sp.x + o.name.width / 2 + 1, o.name.y + 1);
      o.dot.setPosition(sp.x, sp.y);
    }
    // te cruzaste con alguien: queda en "Recientes" de la ventana Social
    this.meetTimer = (this.meetTimer ?? 0) + delta;
    if (this.meetTimer > 1000) {
      this.meetTimer = 0;
      for (const o of this.others.values()) {
        if (this.met.has(o.id) || Math.hypot(o.sprite.x - s.player.x, o.sprite.y - s.player.y) > MEET_RADIUS) continue;
        this.met.add(o.id);
        socialStore.meet(o.info, 'cruce', s.subzone?.name ?? s.zoneName);
      }
    }
    if (this.track) this.updateTrack();
    if (this.heroFlag.text) this.heroFlag.setPosition(s.nameTag.x + s.nameTag.width / 2 + 1, s.nameTag.y + 1);
    // el héroe se levanta al caminar
    if (s.sitting && s.player.body.velocity.lengthSq() > 0) this.stand(s.player, s);
    for (const key of this.bubbles.keys()) this.place(key);
    this.unstack();
  }

  // dos globitos que se pisan (jugadores uno al lado del otro): el de más abajo en la pantalla
  // se queda y los demás suben lo justo para leerse
  unstack() {
    const list = [...this.bubbles.values()].map((b) => {
      const w = (b.box.label.width + 8) * b.box.scaleX;
      const h = (b.box.label.height + 8) * b.box.scaleY;
      return { box: b.box, w, h };
    }).sort((a, b) => b.box.y - a.box.y);
    for (let i = 1; i < list.length; i += 1) {
      const a = list[i];
      for (let j = 0; j < i; j += 1) {
        const b = list[j];
        const overlapX = Math.abs(a.box.x - b.box.x) < (a.w + b.w) / 2;
        const overlapY = a.box.y > b.box.y - b.h && a.box.y - a.h < b.box.y;
        if (overlapX && overlapY) a.box.y = b.box.y - b.h - 1;
      }
    }
  }
}
