import Phaser from 'phaser';
import bus from './bus';
import { ambientOf } from './dialogues';
import { socialStore } from './socialStore';
import { PET_SPECIES } from './world/shared';

// Lo social del mundo: los demás jugadores caminando (con su clase, nombre, nivel y gremio),
// los globitos de chat sobre las cabezas (también el de "…" mientras alguien escribe), gestos,
// emojis, estados (en combate / ausente) y las frases sueltas de los NPCs. La red la maneja
// React (pages/World.js) y llega aquí por el bus.

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const PET_GAP = 18; // a cuántos px detrás de su dueño camina la mascota (como la tuya)
const TAG_FONT = 'Cinzel, Georgia, serif';
const TEXT_FONT = "'EB Garamond', Georgia, serif";
const RES = 4;
const IDLE = { down: 0, up: 3, side: 6 };
const GESTURES = ['saludar', 'bailar', 'reir', 'sentarse', 'aplaudir']; // frames de gestos.png
// en combate se muestra el globito animado de espadas (globo_combate) y mirando el combate de
// otro, el de un ojo que parpadea (globo_observando); los dos hechos en Aseprite
const STATE_ICON = { ausente: '💤' };
const STATE_BUBBLE = { combate: 'globo_combate', observando: 'globo_observando', crafteando: 'globo_crafteo' };
const BUBBLE_ANIM = {
  globo_combate: { frameRate: 6 },
  // abierto un buen rato y un parpadeo rápido
  globo_observando: { durations: [1200, 70, 120, 70] },
  // martillo: arriba, bajando, golpe con chispas, rebote
  globo_crafteo: { durations: [200, 100, 160, 120] },
};
const NPC_CHAT_MS = [14000, 26000];
const MEET_RADIUS = 10 * 32; // a esta distancia cuenta como "te cruzaste" (lista de recientes)
const FOUND_RADIUS = 3 * 32; // rastro: llegaste

export default class SocialLayer {
  constructor(scene) {
    this.scene = scene;
    this.myId = null;
    this.others = new Map(); // id → { sprite, name, guild, stateIcon, dot, tx, ty, f, flip, m, cls, state }
    this.bubbles = new Map(); // clave de entidad → { box, typing, timer }
    // estado que llegó antes de que su sprite terminara de cargar (se aplica al crearlo)
    this.pendingState = new Map();
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
    scene.load.spritesheet('globo_combate', `${ASSETS}/mundo/globo_combate.png`, { frameWidth: 24, frameHeight: 24 });
    scene.load.spritesheet('globo_observando', `${ASSETS}/mundo/globo_observando.png`, { frameWidth: 24, frameHeight: 24 });
    scene.load.spritesheet('globo_crafteo', `${ASSETS}/mundo/globo_crafteo.png`, { frameWidth: 24, frameHeight: 24 });
  }

  ensureTextures() {
    const s = this.scene;
    if (s.textures.exists('globo_px')) return;
    const g = s.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2).generateTexture('globo_px', 2, 2).destroy();
  }

  bind() {
    // por socket llegan posiciones locales a la zona (la sala es la de tu zona): a globales
    const g = (p) => {
      if (!p || p.x == null || !this.scene.toGlobal) return p;
      return { ...p, ...this.scene.toGlobal(p.x, p.y, p.zona ?? p.zone) };
    };
    const handlers = {
      'others-roster': ({ me, list }) => this.setRoster(me, (list ?? []).map(g)),
      'other-join': (p) => this.upsert(g(p)),
      'other-leave': ({ id }) => this.remove(id),
      'other-move': (m) => this.move(g(m)),
      'other-typing': ({ id, on }) => this.typing(this.keyOf(id), on),
      'other-say': (m) => this.say(this.keyOf(m.id), m.text, m.loud),
      // recorrido guiado: una lista de lugares; al llegar a uno se pasa al siguiente
      'social-tour': (stops) => { this.tour = stops?.length ? stops.map(g) : null; this.nextTourStop(); },
      'other-emote': ({ id, emote }) => this.emote(this.keyOf(id), emote),
      'other-emoji': ({ id, emoji }) => this.emoji(this.keyOf(id), emoji),
      'other-state': ({ id, state }) => this.setState(id, state),
      'other-pet': ({ id, pet }) => this.setPet(id, pet),
      'my-typing': (on) => this.typing('me', on),
      'other-lfg': ({ id, on }) => { const o = this.others.get(id); if (o) { o.lfg = on; this.setState(id, o.state); } },
      'social-lfg': (on) => this.heroFlag.setText(on ? '⚑' : ''),
      'social-track': (t) => { this.track = t; if (!t) this.trackBox.setVisible(false); },
      // compañeros de grupo: nombre celeste y punto verde en el minimapa
      'party-ids': (ids) => this.setParty(ids),
      // estado de otro jugador (menú abierto desde la lista del grupo)
      'player-state': (id, cb) => cb?.(this.others.get(id)?.state ?? null),
      // mapa (M): dónde están tus compañeros de grupo que andan por esta zona (x, y locales)
      'party-positions': (cb) => {
        const s = this.scene;
        const out = [];
        for (const o of this.others.values()) {
          if (!this.partyIds?.has(o.id) || !s.zone) continue;
          if (s.zoneAt && s.zoneAt(o.tx, o.ty) !== s.zone) continue;
          const p = s.toLocal(o.tx, o.ty, s.zone);
          out.push({ id: o.id, name: o.info?.name ?? '', state: o.state, x: p.x, y: p.y });
        }
        cb?.(out);
      },
    };
    Object.entries(handlers).forEach(([ev, fn]) => bus.on(ev, fn));
    const unbind = () => Object.entries(handlers).forEach(([ev, fn]) => bus.off(ev, fn));
    this.scene.events.once('shutdown', unbind);
    this.scene.events.once('destroy', unbind);
  }

  keyOf(id) {
    if (typeof id === 'string' && id.startsWith('cit:')) return id; // vecinos de la ciudad (cityLife)
    return id === this.myId ? 'me' : `p:${id}`;
  }

  nextTourStop() {
    const stop = this.tour?.shift();
    if (!stop) { this.tour = null; return; }
    socialStore.setTrack({ name: stop.name, x: stop.x, y: stop.y, info: stop.info, tour: true });
  }

  // sprite y altura de la cabeza de cada entidad (yo, otro jugador, NPC)
  entity(key) {
    const s = this.scene;
    if (key === 'me') return s.player ? { sprite: s.player, top: s.nameTag.y - 8 } : null;
    if (key.startsWith('p:')) {
      const o = this.others.get(Number(key.slice(2)));
      return o ? { sprite: o.sprite, top: o.name.y - 8 } : null;
    }
    if (key.startsWith('cit:')) return this.scene.city?.entity(key.slice(4)) ?? null;
    // quien te acompaña en una misión de escolta (world/escolta.js)
    if (key === 'escolta') return s.escort ? { sprite: s.escort.sprite, top: s.escort.sprite.y - 30 } : null;
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
      this.setPet(p.id, p.pet);
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
        // el estado (en combate…) deja ofrecer "Ver combate" en el menú
        bus.emit('player-menu', { id: p.id, name: p.name, level: p.level, guild: p.guild, state: this.others.get(p.id)?.state ?? null, x: ev.clientX, y: ev.clientY });
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
      this.paintParty(o);
      this.setPet(p.id, p.pet);
      this.setState(p.id, this.pendingState.has(p.id) ? this.pendingState.get(p.id) : p.state);
      this.pendingState.delete(p.id);
    };
    if (s.textures.exists(key)) build();
    else s.loadThen(() => { if (!s.textures.exists(key)) s.load.spritesheet(key, `${ASSETS}/mundo/caminar/${p.cls}.png`, { frameWidth: 32, frameHeight: 32 }); }, build);
  }

  setParty(ids) {
    this.partyIds = new Set(ids ?? []);
    for (const o of this.others.values()) this.paintParty(o);
  }

  paintParty(o) {
    const inParty = this.partyIds?.has(o.id);
    o.name.setColor(inParty ? '#7dffd8' : '#9fd6ff');
    o.dot.setFillStyle(inParty ? 0x7dff9a : 0x6fc3ff);
  }

  remove(id) {
    this.pendingState.delete(id);
    const o = this.others.get(id);
    if (!o) return;
    this.clearBubble(`p:${id}`);
    [o.sprite, o.name, o.guild, o.stateIcon, o.dot, o.fightBubble, o.pet?.sprite].filter(Boolean).forEach((x) => { this.scene.tweens.killTweensOf(x); x.destroy(); });
    this.others.delete(id);
  }

  move({ id, x, y, f, flip, m }) {
    const o = this.others.get(id);
    if (!o) return;
    Object.assign(o, { tx: x, ty: y, f, flip, m });
    if (m && o.sitting) this.stand(o.sprite, o);
  }

  // Mascota de otro jugador: camina detrás de él por su estela, igual que la tuya detrás de ti
  // (WorldScene.setPet). species = especie del sprite (mascotas.png) o null si no lleva.
  setPet(id, species) {
    const o = this.others.get(id);
    if (!o) return;
    if ((o.pet?.species ?? null) === (species ?? null)) return;
    o.pet?.sprite.destroy();
    o.pet = null;
    const idx = PET_SPECIES.indexOf(species);
    if (idx < 0) return;
    const s = this.scene;
    const sprite = s.add.sprite(o.sprite.x, o.sprite.y + 4, 'mascotas', idx * 2).setDepth(9.5).setOrigin(0.5, 0.85);
    const key = `pet_${species}`;
    if (!s.anims.exists(key)) s.anims.create({ key, frames: [{ key: 'mascotas', frame: idx * 2 }, { key: 'mascotas', frame: idx * 2 + 1 }], frameRate: 7, repeat: -1 });
    s.minimap?.ignore(sprite);
    sprite.setAlpha(o.sprite.alpha);
    o.pet = { species, sprite, key, frame: idx * 2, trail: [] };
  }

  // la mascota sigue la estela de su dueño a PET_GAP px
  updatePet(o, walking) {
    const pet = o.pet;
    const sp = o.sprite;
    const last = pet.trail[0];
    if (!last || Math.hypot(last.x - sp.x, last.y - sp.y) > 2) {
      pet.trail.unshift({ x: sp.x, y: sp.y });
      if (pet.trail.length > 40) pet.trail.pop();
    }
    let pos = pet.trail[pet.trail.length - 1];
    let acc = 0;
    for (let i = 1; i < pet.trail.length; i += 1) {
      acc += Math.hypot(pet.trail[i].x - pet.trail[i - 1].x, pet.trail[i].y - pet.trail[i - 1].y);
      if (acc >= PET_GAP) { pos = pet.trail[i]; break; }
    }
    const dx = pos.x - pet.sprite.x;
    pet.sprite.setPosition(pos.x, pos.y + 6).setDepth(pos.y < sp.y ? 9.55 : 9.65 + sp.y / 100000);
    if (Math.abs(dx) > 0.2) pet.sprite.setFlipX(dx < 0);
    if (walking) pet.sprite.anims.play(pet.key, true);
    else if (pet.sprite.anims.isPlaying) { pet.sprite.anims.stop(); pet.sprite.setFrame(pet.frame); }
  }

  setState(id, state) {
    const o = this.others.get(id);
    if (!o) { this.pendingState.set(id, state ?? null); return; }
    o.state = state ?? null;
    o.stateIcon.setText(STATE_ICON[o.state] ?? (o.lfg && !o.state ? '⚑' : '')).setColor(o.lfg && !o.state ? '#ffd84a' : '#ffffff');
    // peleando o mirando una pelea: translúcido (los monstruos no lo tocan); fabricando, no
    o.sprite.setAlpha(STATE_BUBBLE[o.state] && o.state !== 'crafteando' ? 0.55 : 1);
    o.pet?.sprite.setAlpha(o.sprite.alpha);
    // globito sobre la cabeza: espadas mientras pelea (solo o en grupo), un ojo mientras mira el
    // combate de otro; se quita al terminar
    const key = STATE_BUBBLE[o.state] ?? null;
    if (o.fightBubble && o.fightBubble.texture.key !== key) {
      const b = o.fightBubble;
      o.fightBubble = null;
      this.scene.tweens.add({ targets: b, scale: 0, duration: 160, onComplete: () => b.destroy() });
    }
    if (key && !o.fightBubble) {
      const s = this.scene;
      if (!s.anims.exists(key)) {
        const { frameRate, durations } = BUBBLE_ANIM[key];
        const frames = s.anims.generateFrameNumbers(key, { start: 0, end: 3 });
        if (durations) frames.forEach((f, i) => { f.duration = durations[i]; });
        s.anims.create({ key, frames, frameRate: frameRate ?? 1000, repeat: -1 });
      }
      o.fightBubble = s.add.sprite(o.sprite.x, o.sprite.y, key, 0).setOrigin(0.5, 1).setDepth(22).play(key);
      s.minimap?.ignore(o.fightBubble);
      s.tweens.add({ targets: o.fightBubble, scale: { from: 0, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    }
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
    // el rastro puede ser hacia otro jugador o hacia un lugar (x, y)
    const o = t?.id != null ? this.others.get(t.id) : null;
    const target = o ? o.sprite : (t?.x != null ? t : null);
    if (!target) { this.trackBox.setVisible(false); return; }
    const dx = target.x - s.player.x;
    const dy = target.y - s.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < FOUND_RADIUS) {
      this.trackBox.setVisible(false);
      this.track = null;
      socialStore.setTrack(null);
      this.emoji('me', '✨');
      if (t.tour) {
        bus.emit('social-toast', { text: `${t.name}: ${t.info ?? ''}`, kind: 'tour' });
        this.scene.time.delayedCall(1200, () => this.nextTourStop());
      } else bus.emit('social-toast', { text: `¡Encontraste a ${t.name}!`, kind: 'ok' });
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
      // clave "zona:dialogo" (n.id es el dialogo)
      const near = [...s.npcs.entries()].filter(([key, n]) => !n.hidden && ambientOf(n.id, s.storyState).length
        && Phaser.Math.Distance.Between(n.sprite.x, n.sprite.y, s.player.x, s.player.y) < 420
        && !this.bubbles.has(`npc:${key}`));
      if (near.length) {
        const [key, n] = Phaser.Utils.Array.GetRandom(near);
        // lo que dicen sigue la historia de este jugador (dialogues.js ambientOf)
        this.say(`npc:${key}`, Phaser.Utils.Array.GetRandom(ambientOf(n.id, s.storyState)));
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
      o.fightBubble?.setPosition(sp.x, o.name.y - 9);
      o.dot.setPosition(sp.x, sp.y);
      if (o.pet) this.updatePet(o, walking);
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
