import Phaser from 'phaser';
import bus from './bus';
import audio from './audio';
import { ELEMENTS } from './elements';
import { DOT_STATUS, STATUS_ICONS, statusesOf } from './statuses';
import { preloadGear, gearTexture, bodyTexture } from './battleGear';

// Escena de combate estilo Octopath (2.5D): fondo en capas con parallax y desenfoque, héroes a la
// izquierda y monstruos a la derecha en diagonal, cámara que respira y se acerca en los golpes.
// No decide nada del combate: React manda el estado y las entradas nuevas del registro
// ('battle-play') y la escena las anima una por una; al terminar avisa con 'battle-played'.

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const VW = 640; // tamaño "virtual" del combate (el fondo es de 640x360 en pixel art)
const VH = 360;
// pantalla vertical (celular): ancho virtual que se encuadra (los dos bandos con un margen)
const PORTRAIT_SPAN = 430;
const UNIT_SCALE = 1.7;

// pies de cada combatiente; el primero es el de adelante. Los monstruos van en espejo.
// como mucho 3 por lado (3 jugadores, o 1 jugador y sus 2 compañeros, o 2 jugadores y uno)
// el cuarto puesto es para un refuerzo que llega a mitad de la pelea
const HERO_SLOTS = [{ x: 212, y: 296 }, { x: 160, y: 270 }, { x: 150, y: 326 }, { x: 104, y: 298 }];
const ENEMY_SLOTS = HERO_SLOTS.map((s) => ({ x: VW - s.x, y: s.y }));

const BASE_CLASSES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
const CLASS_WEAPON = { guerrero: 'espada', mago: 'baculo_arcano', arquero: 'arco', picaro: 'daga', sacerdote: 'baculo_sagrado' };

const BACKGROUNDS = {
  pradera: ['1_cielo', '2_montanas', '3_colinas', '4_suelo', '5_primer_plano'],
  // la Cripta del Vigía (art/sprites/mundo/crear_fondo_cripta.lua): mismas capas, bajo tierra
  cripta: ['1_cielo', '2_montanas', '3_colinas', '4_suelo', '5_primer_plano'],
};
// colores para rellenar arriba y abajo del escenario en pantalla vertical
const FILL_COLORS = { pradera: [0x4f86d6, 0xc9a46a], cripta: [0x0c0a16, 0x3a3650] };
// cuánto se mueve cada capa respecto de la cámara (parallax)
const LAYER_SCROLL = [0.05, 0.18, 0.4, 1, 1.25];

const wait = (scene, ms) => new Promise((r) => scene.time.delayedCall(ms, r));
const tween = (scene, cfg) => new Promise((r) => scene.tweens.add({ ...cfg, onComplete: r }));
const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('batalla');
  }

  init(data) {
    this.state = data.state;
    this.heroBaseClass = data.heroBaseClass || 'guerrero';
    // en un combate en grupo hay varios héroes: solo el tuyo usa tu clase y tu arma equipada
    this.myPlayerId = data.playerId ?? null;
    this.heroHasWeapon = data.heroHasWeapon !== false;
    this.background = data.background || 'pradera';
    this.units = new Map();
    this.queue = Promise.resolve();
    this.targeting = null;
  }

  isMyHero(p) {
    return !!p.player_id && !p.npc_id && (this.myPlayerId == null || p.player_id === this.myPlayerId);
  }

  classOf(p) {
    if (this.isMyHero(p)) return this.heroBaseClass;
    // compañeros de grupo y contratados: su clase base real (las evoluciones usan la de su base)
    const base = normalize(p.base_class_code);
    if (BASE_CLASSES.includes(base)) return base;
    const n = normalize(p.class_name);
    return BASE_CLASSES.find((c) => n.startsWith(c)) || 'guerrero';
  }

  preload() {
    BACKGROUNDS[this.background].forEach((name, i) => {
      // la clave lleva el nombre del fondo: si no, un combate en la cripta reusaría el de la Pradera
      this.load.image(`fondo_${this.background}_${i}`, `${ASSETS}/combate/fondos/${this.background}/${name}.png`);
    });
    this.load.json('manifest_heroes', `${ASSETS}/sprites/combate/manifest.json`);
    this.load.json('enemigos', `${ASSETS}/sprites/combate/enemigos.json`);
    const sheet = (key, url, size) => {
      if (!this.textures.exists(key)) this.load.spritesheet(key, url, { frameWidth: size, frameHeight: size });
    };
    for (const p of this.state.participants) {
      if (p.side === 'PLAYER') {
        const cls = this.classOf(p);
        sheet(`b_${cls}`, `${ASSETS}/sprites/combate/clases/${cls}.png`, 48);
        sheet(`w_${CLASS_WEAPON[cls]}`, `${ASSETS}/sprites/combate/armas/${CLASS_WEAPON[cls]}.png`, 48);
      }
    }
    // el arma, la mano secundaria y la armadura que lleva puestos cada héroe (game/battleGear.js)
    preloadGear(this, this.state.participants);
    // íconos de estados (los mismos de la interfaz); se achican en create para que se lean bien
    for (const [name, artist] of STATUS_ICONS) {
      if (!this.textures.exists(`ico_${name}`) && !this.textures.exists(`icos_${name}`)) {
        this.load.image(`ico_${name}`, `${process.env.PUBLIC_URL}/Icons/${artist}/${name}.png`);
      }
    }
    // las hojas de los monstruos se cargan en create, cuando ya está el catálogo
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d0b14');
    this.buildBackground();
    this.buildAmbience();
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));

    const catalog = this.cache.json.get('enemigos').monsters;
    for (const p of this.state.participants) {
      const m = catalog[p.monster_code];
      if (p.side === 'ENEMY' && m && !this.textures.exists(`mon_${p.monster_code}`)) {
        this.load.spritesheet(`mon_${p.monster_code}`, `${ASSETS}/sprites/combate/${m.sheet}`, { frameWidth: m.frameSize.w, frameHeight: m.frameSize.h });
      }
    }
    this.load.once('complete', () => {
      this.makeStatusIcons();
      this.createAnims(catalog);
      this.spawnUnits(catalog);
      this.intro();
    });
    this.load.start();

    this.onPlay = ({ logs, participants, actionElement, actorId, actionSkill }) => {
      this.queue = this.queue.then(() => this.playLogs(logs, participants, { actionElement, actorId, actionSkill }));
    };
    this.onTargeting = (side) => this.setTargeting(side);
    this.onActive = (pid) => this.setActive(pid);
    this.onEnd = (status) => this.endBattle(status);
    this.onHighlight = (pid) => this.highlight(pid);
    bus.on('battle-play', this.onPlay);
    bus.on('battle-targeting', this.onTargeting);
    bus.on('battle-active', this.onActive);
    bus.on('battle-end', this.onEnd);
    bus.on('battle-highlight', this.onHighlight);
    const unbind = () => {
      bus.off('battle-play', this.onPlay);
      bus.off('battle-targeting', this.onTargeting);
      bus.off('battle-active', this.onActive);
      bus.off('battle-end', this.onEnd);
      bus.off('battle-highlight', this.onHighlight);
    };
    this.events.once('shutdown', unbind);
    this.events.once('destroy', unbind);
  }

  // ---------------------------------------------------------------- escenario
  buildBackground() {
    this.layers = BACKGROUNDS[this.background].map((_, i) => this.add.image(-40, -10, `fondo_${this.background}_${i}`)
      .setOrigin(0, 0)
      .setScale((VW + 80) / VW)
      .setScrollFactor(LAYER_SCROLL[i])
      .setDepth(i === 4 ? 1000 : -100 + i));
    // profundidad de campo: lo lejano y el primer plano desenfocados, los personajes nítidos
    if (this.renderer.type === Phaser.WEBGL) {
      this.layers[1].preFX?.addBlur(0, 1, 1, 0.6);
      this.layers[2].preFX?.addBlur(0, 0.5, 0.5, 0.4);
      this.layers[4].preFX?.addBlur(1, 2, 2, 1.1);
      this.cameras.main.postFX?.addVignette(0.5, 0.5, 0.9, 0.32);
    }
  }

  buildAmbience() {
    // polen y motas de luz flotando
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfff4c0, 1).fillCircle(2, 2, 2).generateTexture('mota', 4, 4).destroy();
    this.add.particles(0, 0, 'mota', {
      x: { min: -20, max: VW + 20 },
      y: { min: 120, max: VH },
      lifespan: 7000,
      speedX: { min: 3, max: 12 },
      speedY: { min: -9, max: -2 },
      alpha: { start: 0.7, end: 0 },
      scale: { min: 0.3, max: 0.8 },
      frequency: 160,
      blendMode: 'ADD',
    }).setDepth(900);
    // chispas para los golpes
    const s = this.make.graphics({ x: 0, y: 0 }, false);
    s.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3).generateTexture('chispa', 3, 3).destroy();
    const a = this.make.graphics({ x: 0, y: 0 }, false);
    a.fillStyle(0x6a4a2a, 1).fillRect(0, 1, 14, 1).fillStyle(0xd8d8e0, 1).fillRect(14, 0, 3, 3).fillStyle(0xc0343a, 1).fillRect(0, 0, 2, 3)
      .generateTexture('flecha', 17, 3).destroy();
    // texturas de los efectos elementales (se tiñen con el color de cada elemento)
    const e = this.make.graphics({ x: 0, y: 0 }, false);
    e.fillStyle(0xffffff, 1).fillTriangle(2, 0, 4, 4, 0, 4).fillTriangle(0, 4, 4, 4, 2, 9).generateTexture('esquirla', 5, 10).destroy();
    const r = this.make.graphics({ x: 0, y: 0 }, false);
    r.fillStyle(0xffffff, 1).fillRect(1, 0, 3, 5).fillRect(0, 1, 5, 3).generateTexture('roca', 5, 5).destroy();
    const h = this.make.graphics({ x: 0, y: 0 }, false);
    h.fillStyle(0xffffff, 1).fillCircle(6, 6, 6).generateTexture('humo', 12, 12).destroy();
    const st = this.make.graphics({ x: 0, y: 0 }, false);
    st.fillStyle(0xffffff, 1).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1).generateTexture('estrella', 5, 5).destroy();
  }

  fitCamera() {
    const cam = this.cameras.main;
    const { width, height } = this.scale.gameSize;
    if (width / height < 1) {
      // celular en vertical: cubrir el alto dejaba fuera a los dos bandos (héroes a la izquierda,
      // monstruos a la derecha). Se encuadra a lo ancho lo que ocupa la pelea y arriba y abajo
      // del escenario se rellena con el cielo y la tierra del fondo.
      this.baseZoom = width / PORTRAIT_SPAN;
      if (!this.fillers) {
        this.fillers = [
          this.add.rectangle(VW / 2, 0, VW * 6, 4000, (FILL_COLORS[this.background] ?? FILL_COLORS.pradera)[0]).setOrigin(0.5, 1).setDepth(-200),
          this.add.rectangle(VW / 2, VH - 14, VW * 6, 4000, (FILL_COLORS[this.background] ?? FILL_COLORS.pradera)[1]).setOrigin(0.5, 0).setDepth(-98),
        ];
      }
      cam.setZoom(this.baseZoom);
      cam.centerOn(VW / 2, VH * 0.66);
    } else {
      this.fillers?.forEach((f) => f.destroy());
      this.fillers = null;
      this.baseZoom = Math.max(width / VW, height / VH);
      cam.setZoom(this.baseZoom);
      cam.centerOn(VW / 2, VH / 2);
    }
    // Una capa con scrollFactor f se dibuja corrida scrollX*(1-f) respecto de una normal: se
    // compensa con la posición base de la cámara para que todas calcen en el encuadre inicial y
    // solo se separen cuando la cámara se mueve (eso es el parallax).
    this.layers?.forEach((layer, i) => {
      const f = LAYER_SCROLL[i];
      layer.setPosition(-40 - cam.scrollX * (1 - f), -10 - cam.scrollY * (1 - f));
    });
  }

  // cámara que "respira": un vaivén lento que hace trabajar al parallax
  breathe() {
    this.breathTween?.stop();
    this.breathTween = this.tweens.add({
      targets: this.cameras.main,
      scrollX: { from: this.cameras.main.scrollX - 6, to: this.cameras.main.scrollX + 6 },
      duration: 4200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ---------------------------------------------------------------- combatientes
  createAnims(catalog) {
    const manifest = this.cache.json.get('manifest_heroes');
    const make = (key, texture, frames, durations, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map((f, i) => ({ key: texture, frame: f, duration: durations[i] })),
        repeat: loop ? -1 : 0,
      });
    };
    for (const cls of BASE_CLASSES) {
      for (const [tag, a] of Object.entries(manifest.animations)) {
        if (this.textures.exists(`b_${cls}`)) make(`b_${cls}_${tag}`, `b_${cls}`, a.frames, a.durations, a.loop);
        const w = CLASS_WEAPON[cls];
        if (this.textures.exists(`w_${w}`)) make(`w_${w}_${tag}`, `w_${w}`, a.frames, a.durations, a.loop);
      }
    }
    this.makeUnitAnims = (tex) => {
      if (!this.textures.exists(tex)) return;
      for (const [tag, a] of Object.entries(manifest.animations)) make(`${tex}_${tag}`, tex, a.frames, a.durations, a.loop);
    };
    for (const [code, m] of Object.entries(catalog)) {
      if (!this.textures.exists(`mon_${code}`)) continue;
      for (const [tag, a] of Object.entries(m.animations)) make(`m_${code}_${tag}`, `mon_${code}`, a.frames, a.durations, a.loop);
    }
  }

  spawnUnits(catalog) {
    const heroes = this.state.participants.filter((p) => p.side === 'PLAYER');
    const enemies = this.state.participants.filter((p) => p.side === 'ENEMY');
    heroes.forEach((p, i) => this.spawnHero(p, HERO_SLOTS[i % HERO_SLOTS.length]));
    enemies.forEach((p, i) => this.spawnMonster(p, ENEMY_SLOTS[i % ENEMY_SLOTS.length], catalog[p.monster_code]));
    // jefes y minijefes (rank en enemigos.json): tienen entrada propia y barra de vida grande
    this.bosses = enemies
      .filter((p) => ['jefe', 'miniboss', 'mitico'].includes(catalog[p.monster_code]?.rank))
      .map((p) => ({ pid: p.id, name: catalog[p.monster_code].name, rank: catalog[p.monster_code].rank }));
  }

  shadow(x, y, w) {
    return this.add.ellipse(x, y, w, w * 0.28, 0x000000, 0.35).setDepth(y - 1);
  }

  spawnHero(p, slot) {
    const cls = this.classOf(p);
    // equipo puesto (lo manda el servidor para los jugadores): arma y mano secundaria con el
    // color de su set y la ropa del color de la armadura. Los compañeros NPC usan lo de su clase.
    const gear = p.gear;
    const weaponTex = (gear?.weapon && gearTexture(this, gear.weapon, 'weapon')) || `w_${CLASS_WEAPON[cls]}`;
    const offhandTex = gear?.offhand ? gearTexture(this, gear.offhand, 'offhand') : null;
    const bodyTex = gear ? bodyTexture(this, cls, gear.armor) : `b_${cls}`;
    [weaponTex, offhandTex, bodyTex].forEach((t) => t && this.makeUnitAnims(t));
    const showWeapon = gear ? !!gear.weapon : (!this.isMyHero(p) || this.heroHasWeapon);
    const shadow = this.shadow(slot.x, slot.y, 34);
    const weapon = showWeapon && this.textures.exists(weaponTex) ? this.add.sprite(slot.x, slot.y, weaponTex, 0).setOrigin(22 / 48, 46 / 48).setScale(UNIT_SCALE).setDepth(slot.y) : null;
    const body = this.add.sprite(slot.x, slot.y, bodyTex, 0).setOrigin(22 / 48, 46 / 48).setScale(UNIT_SCALE).setDepth(slot.y + 0.5);
    const offhand = offhandTex ? this.add.sprite(slot.x, slot.y, offhandTex, 0).setOrigin(22 / 48, 46 / 48).setScale(UNIT_SCALE).setDepth(slot.y + 0.6) : null;
    const unit = {
      pid: p.id, side: 'PLAYER', kind: 'hero', cls, weaponTex, bodyTex, offhandTex, body, weapon, offhand, shadow,
      home: { ...slot }, alive: p.hp > 0, ranged: cls === 'arquero', maxHp: p.max_hp, name: p.name,
      elementCode: p.element_code ?? null, imbued: p.imbued_element_code ?? null, resistances: {},
    };
    this.units.set(p.id, unit);
    this.playUnit(unit, unit.alive ? 'idle' : 'ko');
    this.syncStatuses(unit, p, true);
  }

  spawnMonster(p, slot, info) {
    const code = p.monster_code;
    const size = info?.frameSize.w ?? 48;
    const scale = UNIT_SCALE * (size > 48 ? 1.15 : 1);
    const shadow = this.shadow(slot.x, slot.y, size > 48 ? 70 : 38);
    const body = this.add.sprite(slot.x, slot.y, `mon_${code}`, 0).setOrigin(0.5, (size - 2) / size).setScale(scale).setDepth(slot.y + 0.5);
    const top = slot.y - size * scale * 0.82;
    const bar = this.add.graphics().setDepth(1100);
    const label = this.add.text(slot.x, top - 10, p.name.replace(/ Lv\.\d+$/, ''), {
      fontFamily: 'Cinzel, Georgia, serif', fontSize: '8px', fontStyle: 'bold', color: '#f6e6c0', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(1100).setResolution(6);
    const unit = {
      pid: p.id, side: 'ENEMY', kind: 'monster', code, body, shadow, bar, label,
      home: { ...slot }, alive: p.hp > 0, maxHp: p.max_hp, hp: p.hp, barY: top - 6, name: p.name,
      elementCode: p.element_code ?? null, imbued: null, resistances: p.resistances ?? {},
    };
    this.units.set(p.id, unit);
    this.drawBar(unit);
    this.playUnit(unit, 'idle');
    this.syncStatuses(unit, p, true);
    this.syncShield(unit, p.shield, true);
  }

  drawBar(u) {
    if (!u.bar) return;
    const w = 40;
    const x = u.home.x - w / 2;
    const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
    u.bar.clear();
    if (!u.alive) return;
    u.bar.fillStyle(0x000000, 0.8).fillRoundedRect(x - 1, u.barY - 1, w + 2, 5, 2);
    u.bar.fillStyle(pct > 0.5 ? 0x5fd97e : pct > 0.25 ? 0xe8c050 : 0xe0394f, 1).fillRoundedRect(x, u.barY, w * pct, 3, 1.5);
  }

  playUnit(u, tag) {
    if (u.kind === 'hero') {
      u.body.play(`${u.bodyTex}_${tag}`, true);
      u.weapon?.play(`${u.weaponTex}_${tag}`, true);
      u.offhand?.play(`${u.offhandTex}_${tag}`, true);
    } else {
      const key = `m_${u.code}_${tag}`;
      if (this.anims.exists(key)) u.body.play(key, true);
      else if (tag === 'cast' && this.anims.exists(`m_${u.code}_attack`)) u.body.play(`m_${u.code}_attack`, true);
    }
  }

  // mueve cuerpo, arma y sombra juntos
  moveUnit(u, x, y, duration, ease = 'Quad.easeOut') {
    return tween(this, { targets: [u.body, u.weapon, u.offhand, u.shadow].filter(Boolean), x, y, duration, ease });
  }

  // ---------------------------------------------------------------- entrada
  async intro() {
    const cam = this.cameras.main;
    cam.flash(350, 255, 255, 255);
    cam.setZoom(this.baseZoom * 1.35);
    this.tweens.add({ targets: cam, zoom: this.baseZoom, duration: 900, ease: 'Cubic.easeOut' });
    const heroes = [...this.units.values()].filter((u) => u.kind === 'hero');
    const monsters = [...this.units.values()].filter((u) => u.kind === 'monster');
    heroes.forEach((u) => [u.body, u.weapon, u.offhand, u.shadow].filter(Boolean).forEach((o) => { o.x -= 140; }));
    monsters.forEach((u) => [u.body, u.shadow, u.label].forEach((o) => o.setAlpha(0)));
    heroes.forEach((u, i) => {
      this.playUnit(u, 'idle');
      this.tweens.add({ targets: [u.body, u.weapon, u.offhand, u.shadow].filter(Boolean), x: `+=140`, duration: 650, delay: i * 90, ease: 'Cubic.easeOut' });
    });
    monsters.forEach((u, i) => this.tweens.add({ targets: [u.body, u.shadow, u.label], alpha: 1, duration: 500, delay: 300 + i * 120 }));
    await wait(this, 1000);
    bus.emit('battle-bosses', this.bosses ?? []);
    if (this.bosses?.length) await this.bossEntrance(this.units.get(this.bosses[0].pid));
    this.breathe();
    bus.emit('battle-ready');
  }

  // Entrada del jefe: la cámara va hacia él, destello rojo, temblor y rugido (anim. de hechizo/ataque)
  async bossEntrance(u) {
    if (!u) return;
    const cam = this.cameras.main;
    cam.pan(u.home.x - 30, u.home.y - 40, 500, 'Sine.easeInOut');
    this.tweens.add({ targets: cam, zoom: this.baseZoom * 1.4, duration: 500, ease: 'Sine.easeInOut' });
    await wait(this, 520);
    cam.flash(260, 255, 60, 40);
    cam.shake(700, 0.012);
    this.playUnit(u, 'cast');
    this.ring(u.home.x, u.home.y - 30, 0xff4a3a, 60, 700);
    this.ring(u.home.x, u.home.y - 30, 0xffd84a, 40, 520);
    this.tweens.add({ targets: u.body, scaleX: u.body.scaleX * 1.08, scaleY: u.body.scaleY * 1.08, duration: 160, yoyo: true, repeat: 2 });
    await wait(this, 1500);
    if (u.alive) this.playUnit(u, 'idle');
    cam.pan(VW / 2, VH / 2, 600, 'Sine.easeInOut');
    this.tweens.add({ targets: cam, zoom: this.baseZoom, duration: 600, ease: 'Sine.easeInOut' });
    await wait(this, 620);
  }

  // ---------------------------------------------------------------- refuerzos
  // Un compañero de grupo llega a mitad del combate: se cargan sus hojas (clase y equipo) y su
  // héroe entra caminando desde la izquierda hasta su puesto.
  async reinforce(p) {
    const cls = this.classOf(p);
    const sheet = (key, url) => {
      if (!this.textures.exists(key)) this.load.spritesheet(key, url, { frameWidth: 48, frameHeight: 48 });
    };
    sheet(`b_${cls}`, `${ASSETS}/sprites/combate/clases/${cls}.png`);
    sheet(`w_${CLASS_WEAPON[cls]}`, `${ASSETS}/sprites/combate/armas/${CLASS_WEAPON[cls]}.png`);
    preloadGear(this, [p]);
    if (this.load.list.size > 0) {
      await new Promise((resolve) => { this.load.once('complete', resolve); this.load.start(); });
    }
    const heroes = [...this.units.values()].filter((u) => u.kind === 'hero');
    const slot = HERO_SLOTS[heroes.length % HERO_SLOTS.length];
    this.spawnHero(p, slot);
    const u = this.units.get(p.id);
    if (!u) return;
    const parts = [u.body, u.weapon, u.offhand, u.shadow].filter(Boolean);
    parts.forEach((o) => { o.x -= 260; });
    this.playUnit(u, this.anims.exists(`${u.bodyTex}_walk`) ? 'walk' : 'idle');
    await tween(this, { targets: parts, x: `+=260`, duration: 1500, ease: 'Linear' });
    this.playUnit(u, u.alive ? 'idle' : 'ko');
  }

  // ---------------------------------------------------------------- registro de combate
  async playLogs(logs, participants, ctx = {}) {
    // vida final de cada uno: sirve para repartir el resultado de las habilidades de área
    this.finalHp = Object.fromEntries((participants ?? []).map((p) => [p.id, p.hp]));
    try {
      // refuerzos que no estaban: entran caminando antes de seguir con el registro
      for (const p of participants ?? []) {
        if (p.side !== 'PLAYER' || p.is_summon || p.player_id == null || this.units.has(p.id)) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.reinforce(p);
        } catch (err) {
          console.error('[batalla] no se pudo sumar al refuerzo', p, err);
        }
      }
      for (const log of logs) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.animateLog(log, ctx);
        } catch (err) {
          // una animación que falla no puede trabar el combate: se sigue con la próxima
          console.error('[batalla] no se pudo animar', log, err);
        }
      }
      // sincroniza vida y muertes con el estado final por si algo no vino en el registro
      for (const p of participants ?? []) {
        const u = this.units.get(p.id);
        if (!u) continue;
        u.hp = p.hp;
        u.maxHp = p.max_hp;
        if (p.resistances) u.resistances = p.resistances;
        if (p.imbued_element_code !== undefined) u.imbued = p.imbued_element_code;
        if (u.alive && p.hp <= 0) this.kill(u);
        this.drawBar(u);
        if (u.alive) this.syncStatuses(u, p);
        if (u.kind === 'monster') this.syncShield(u, p.shield);
      }
    } finally {
      // siempre avisar: React espera esto para devolver el control al jugador
      bus.emit('battle-played');
    }
  }

  // Elemento de cada golpe. El registro del back no lo trae: para las habilidades del jugador lo
  // manda React (sabe qué skill eligió); el ataque básico usa el elemento imbuido del arma; los
  // monstruos atacan con su propio elemento.
  elementOf(log, actor, ctx) {
    if (!actor) return null;
    if (log.action === 'SKILL' && actor.pid === ctx.actorId && ctx.actionElement) return ctx.actionElement;
    if (actor.kind === 'monster') return actor.elementCode;
    if (log.action === 'ATTACK') return actor.imbued;
    return null;
  }

  async animateLog(log, ctx = {}) {
    const actor = this.units.get(log.actor_participant_id);
    const target = this.units.get(log.target_participant_id);
    const element = ELEMENTS[this.elementOf(log, actor, ctx)] ? this.elementOf(log, actor, ctx) : null;
    // React muestra la frase y actualiza la vida del objetivo a medida que se anima cada golpe
    bus.emit('battle-log', log);
    // Romper y Furia: el back los registra después del golpe que los provocó
    if (target && /ha sido ROTO/.test(log.description ?? '')) { await this.breakFx(target); return; }
    if (target && /entra en furia/.test(log.description ?? '')) { await this.furyFx(target); return; }
    // veneno, quemadura, sangrado o regeneración al cerrar la ronda: el back los registra con
    // actor = objetivo
    if (actor && actor === target && log.action === 'SKILL' && (log.damage > 0 || log.heal > 0) && /veneno|quemadura|sangrado|regeneraci/i.test(log.description ?? '')) {
      await this.statusTick(actor, log);
      return;
    }
    // paralizado: pierde el turno
    if (actor && actor === target && /está paralizado/.test(log.description ?? '')) {
      await this.paralyzedFx(actor);
      return;
    }
    switch (log.action) {
      case 'ATTACK':
        if (actor && target) await this.attack(actor, target, log, element);
        else if (target) await this.impact(target, log, null, element, actor);
        break;
      case 'SKILL':
        if (actor) await this.skill(actor, target, log, element, actor.pid === ctx.actorId ? ctx.actionSkill : null);
        else if (target) await this.impact(target, log, 'magic', element, actor);
        break;
      case 'USE_ITEM':
        if (actor) { this.playUnit(actor, 'cast'); await wait(this, 300); }
        if (target) await this.impact(target, log, 'heal');
        if (actor?.alive) this.playUnit(actor, 'idle');
        break;
      case 'DEFEND':
        if (actor) {
          this.playUnit(actor, 'defend');
          this.floatText(actor, 'Defensa', '#8fc9ff', 10);
          await wait(this, 500);
        }
        break;
      case 'ESCAPE':
        // si la huida falla el combate sigue: nadie se va de la pantalla
        if (log.success === false) await this.failEscape(actor);
        else await this.escape();
        break;
      default:
        if (target && (log.damage || log.heal)) await this.impact(target, log);
        else await wait(this, 250);
    }
  }

  async attack(actor, target, log, element) {
    this.focusOn(actor, target);
    if (actor.ranged) {
      this.playUnit(actor, 'attack_bow');
      await wait(this, 420);
      const arrow = this.add.image(actor.body.x + 20, actor.body.y - 38, 'flecha').setDepth(1050).setScale(1.2);
      arrow.setFlipX(actor.side === 'ENEMY');
      if (element) arrow.setTint(ELEMENTS[element].light);
      await tween(this, { targets: arrow, x: target.home.x, y: target.home.y - 34, duration: 180 });
      arrow.destroy();
      await this.impact(target, log, null, element, actor);
      await wait(this, 150);
    } else {
      const dir = actor.side === 'PLAYER' ? 1 : -1;
      const tx = target.home.x - dir * (actor.kind === 'monster' && actor.body.width > 48 ? 70 : 46);
      await this.moveUnit(actor, tx, target.home.y + 2, 230, 'Quad.easeIn');
      this.playUnit(actor, actor.kind === 'hero' ? 'attack_melee' : 'attack');
      await wait(this, actor.kind === 'hero' ? 200 : 180);
      await this.impact(target, log, null, element, actor);
      await wait(this, 120);
      await this.moveUnit(actor, actor.home.x, actor.home.y, 260);
    }
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  async cast(actor, target, log, element) {
    this.focusOn(actor, target);
    this.playUnit(actor, 'cast');
    const color = log.heal ? 0x7dff9a : (ELEMENTS[element]?.hex ?? 0x9a7aff);
    // carga: el color del elemento se junta en la mano antes de lanzar
    const hx = actor.body.x + (actor.side === 'PLAYER' ? 18 : -18);
    this.charge(hx, actor.body.y - 60, color);
    await wait(this, 450);
    if (target) {
      if (!log.heal) this.elementEffect(target, element);
      else this.burst(target.home.x, target.home.y - 30, color, 22);
      await this.impact(target, log, log.heal ? 'heal' : 'magic', element, actor);
    }
    await wait(this, 150);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  async impact(target, log, kind, element, attacker) {
    if (log.hp_after != null) target.hp = log.hp_after;
    if (log.evaded) {
      audio.sfx('esquiva');
      this.floatText(target, '¡Esquiva!', '#ffffff', 11);
      await tween(this, { targets: [target.body, target.weapon, target.offhand].filter(Boolean), x: `+=${target.side === 'PLAYER' ? -12 : 12}`, duration: 90, yoyo: true });
      return;
    }
    if (log.heal) {
      audio.sfx('curar');
      this.floatText(target, `+${log.heal}`, '#7dff9a', 14);
      this.drawBar(target);
      await wait(this, 300);
      return;
    }
    if (!log.damage && log.damage !== 0) { await wait(this, 200); return; }

    // debilidad / resistencia: solo se conocen las de los monstruos (los ataca el jugador)
    const el = ELEMENTS[element];
    const affinity = el && attacker?.side === 'PLAYER' ? (target.resistances?.[element] ?? 0) : 0;
    const weak = affinity < 0;

    audio.sfx(log.crit || weak ? 'critico' : kind === 'magic' ? 'impacto_magico' : 'golpe');
    this.playUnit(target, 'hurt');
    target.body.setTintFill(el ? el.light : 0xffffff);
    target.weapon?.setTintFill(0xffffff);
    target.offhand?.setTintFill(0xffffff);
    this.time.delayedCall(weak ? 140 : 80, () => {
      target.body.clearTint();
      target.weapon?.clearTint();
      target.offhand?.clearTint();
      if (target.stunFx) target.body.setTint(0x9aa0c8); // sigue aturdido (roto)
    });
    if (el && kind !== 'magic') this.elementEffect(target, element, 0.6);
    this.burst(target.home.x, target.home.y - 28, el ? el.hex : (kind === 'magic' ? 0xb07aff : 0xffe6a0), log.crit || weak ? 18 : 10);

    const color = el ? el.color : '#ffffff';
    if (weak) {
      this.cameras.main.shake(260, 0.014);
      this.punchZoom();
      this.floatText(target, `${log.damage}`, color, 22, log.crit ? '¡Débil! ¡Crítico!' : '¡Débil!', '#ffd84a');
    } else if (log.crit) {
      this.cameras.main.shake(220, 0.012);
      this.punchZoom();
      this.floatText(target, `${log.damage}`, el ? color : '#ffd84a', 20, affinity > 0 ? '¡Crítico! · Resiste' : '¡Crítico!');
    } else {
      this.cameras.main.shake(120, 0.004);
      this.floatText(target, `${log.damage}`, color, affinity > 0 ? 12 : 15, affinity > 0 ? 'Resiste' : null, '#a8a0b8');
    }
    const dir = target.side === 'PLAYER' ? -1 : 1;
    await tween(this, { targets: [target.body, target.weapon, target.offhand].filter(Boolean), x: `+=${dir * (weak ? 12 : 7)}`, duration: 70, yoyo: true });
    this.drawBar(target);
    if (log.hp_after != null && log.hp_after <= 0) await this.kill(target);
    else if (target.alive) this.playUnit(target, 'idle');
  }

  // ---------------------------------------------------------------- efectos por elemento
  emit(x, y, texture, cfg, quantity) {
    // las texturas son de pocos píxeles: se agrandan para que se lean bien con el zoom del combate
    const grow = (s) => (typeof s === 'number' ? s * 1.8 : s && typeof s === 'object' && 'start' in s ? { ...s, start: s.start * 1.8, end: s.end * 1.8 } : s);
    const p = this.add.particles(x, y, texture, { emitting: false, blendMode: 'ADD', ...cfg, scale: grow(cfg.scale) }).setDepth(1060);
    p.explode(quantity);
    this.time.delayedCall((cfg.lifespan?.max ?? cfg.lifespan ?? 600) + 200, () => p.destroy());
    return p;
  }

  ring(x, y, color, maxRadius = 26, duration = 380) {
    const g = this.add.circle(x, y, 4).setStrokeStyle(4, color, 1).setDepth(1055).setBlendMode('ADD');
    this.tweens.add({ targets: g, radius: maxRadius * 1.3, alpha: 0, duration, ease: 'Cubic.easeOut', onUpdate: () => g.setStrokeStyle(4, color, g.alpha), onComplete: () => g.destroy() });
  }

  charge(x, y, color) {
    audio.sfx('magia');
    this.emit(x, y, 'mota', {
      speed: { min: 30, max: 60 }, lifespan: 380, scale: { start: 1.2, end: 0 }, tint: color,
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 18), quantity: 14 },
      moveToX: 0, moveToY: 0,
    }, 14);
    this.ring(x, y, color, 14, 300);
  }

  // Efecto propio de cada elemento sobre el objetivo. power < 1 = versión chica (ataque con arma imbuida).
  elementEffect(target, code, power = 1) {
    const el = ELEMENTS[code];
    if (!el) return;
    const x = target.home.x;
    const y = target.home.y - 28;
    const n = (q) => Math.max(4, Math.round(q * power));
    switch (code) {
      case 'FIRE':
        this.emit(x, y + 14, 'mota', { speedX: { min: -40, max: 40 }, speedY: { min: -150, max: -60 }, lifespan: { min: 300, max: 650 }, scale: { start: 1.6, end: 0 }, tint: [el.hex, 0xffd84a, 0xff4020] }, n(30));
        this.ring(x, y + 10, el.hex, 30 * power);
        break;
      case 'ICE':
        for (let i = 0; i < n(7); i++) {
          const s = this.add.image(x + Phaser.Math.Between(-22, 22), y - 70 - i * 6, 'esquirla').setTint(el.light).setDepth(1056).setBlendMode('ADD').setScale(1.4);
          this.tweens.add({ targets: s, y: y + Phaser.Math.Between(-6, 16), duration: 200 + i * 25, ease: 'Quad.easeIn', onComplete: () => { this.emit(s.x, s.y, 'chispa', { speed: { min: 20, max: 60 }, lifespan: 300, scale: { start: 1, end: 0 }, tint: el.hex }, 4); s.destroy(); } });
        }
        break;
      case 'LIGHTNING': {
        const g = this.add.graphics().setDepth(1057).setBlendMode('ADD');
        let px = x + Phaser.Math.Between(-10, 10);
        let py = -20;
        const pts = [{ x: px, y: py }];
        while (py < y) { px = x + Phaser.Math.Between(-14, 14); py += Phaser.Math.Between(14, 26); pts.push({ x: px, y: Math.min(py, y) }); }
        // halo ancho del color del elemento y núcleo blanco encima
        g.lineStyle(7, el.hex, 0.7).strokePoints(pts);
        g.lineStyle(3, 0xffffff, 1).strokePoints(pts);
        this.cameras.main.flash(110, 255, 250, 200);
        this.tweens.add({ targets: g, alpha: 0, duration: 320, delay: 160, onComplete: () => g.destroy() });
        this.emit(x, y, 'chispa', { speed: { min: 60, max: 180 }, lifespan: 300, scale: { start: 1.2, end: 0 }, tint: [el.hex, 0xffffff] }, n(20));
        break;
      }
      case 'WIND':
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 90, () => this.ring(x, y + 6 - i * 10, el.hex, (22 + i * 6) * power, 420));
        this.emit(x, y, 'mota', { speed: { min: 50, max: 120 }, angle: { min: -40, max: 40 }, lifespan: 500, scale: { start: 1, end: 0 }, tint: el.light, rotate: { min: 0, max: 360 } }, n(16));
        break;
      case 'EARTH':
        this.emit(x, target.home.y, 'roca', { speedX: { min: -70, max: 70 }, speedY: { min: -170, max: -80 }, gravityY: 420, lifespan: 700, scale: { start: 1.4, end: 0.6 }, tint: [el.hex, 0x6a4a2a, el.light], blendMode: 'NORMAL', rotate: { min: 0, max: 360 } }, n(16));
        this.cameras.main.shake(180, 0.008 * power);
        break;
      case 'WATER':
        this.emit(x, y + 10, 'mota', { speedX: { min: -80, max: 80 }, speedY: { min: -160, max: -60 }, gravityY: 380, lifespan: 650, scale: { start: 1.2, end: 0.2 }, tint: [el.hex, el.light] }, n(26));
        this.ring(x, target.home.y - 4, el.light, 30 * power, 500);
        break;
      case 'LIGHT': {
        const beam = this.add.rectangle(x, y - 70, 38 * power, 230, el.hex, 0.55).setDepth(1056).setBlendMode('ADD');
        const core = this.add.rectangle(x, y - 70, 14 * power, 230, 0xffffff, 0.9).setDepth(1057).setBlendMode('ADD');
        beam.scaleX = 0.1;
        core.scaleX = 0.1;
        this.tweens.add({ targets: [beam, core], scaleX: 1, duration: 140, yoyo: true, hold: 260, onComplete: () => { beam.destroy(); core.destroy(); } });
        this.emit(x, y, 'estrella', { speed: { min: 30, max: 100 }, lifespan: 600, scale: { start: 1.4, end: 0 }, tint: [el.light, el.hex] }, n(18));
        break;
      }
      case 'DARK':
        this.emit(x, y + 10, 'humo', { speedX: { min: -30, max: 30 }, speedY: { min: -60, max: -20 }, lifespan: 800, scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.7, end: 0 }, tint: [el.hex, 0x2a1840], blendMode: 'NORMAL' }, n(14));
        this.ring(x, y, el.hex, 28 * power, 520);
        break;
      case 'COSMIC':
        this.emit(x, y, 'estrella', { speed: { min: 40, max: 140 }, lifespan: 750, scale: { start: 1.6, end: 0 }, tint: [el.hex, el.light, 0x6fc3ff], rotate: { min: 0, max: 360 } }, n(26));
        this.ring(x, y, el.light, 34 * power, 480);
        this.ring(x, y, el.hex, 22 * power, 380);
        break;
      default:
        this.burst(x, y, el.hex, n(16));
    }
  }

  async kill(u) {
    if (!u.alive) return;
    u.alive = false;
    audio.sfx('morir');
    this.clearShield(u);
    this.clearStatuses(u);
    this.drawBar(u);
    if (u.kind === 'hero') {
      this.playUnit(u, 'ko');
      await wait(this, 300);
    } else {
      this.playUnit(u, 'die');
      u.label?.setVisible(false);
      await wait(this, 350);
      this.tweens.add({ targets: [u.body, u.shadow], alpha: 0, duration: 600 });
      this.burst(u.home.x, u.home.y - 20, 0xffffff, 16);
    }
  }

  async escape() {
    const heroes = [...this.units.values()].filter((u) => u.kind === 'hero' && u.alive);
    heroes.forEach((u) => {
      u.body.setFlipX(true);
      u.weapon?.setFlipX(true);
      u.offhand?.setFlipX(true);
    });
    await Promise.all(heroes.map((u) => tween(this, { targets: [u.body, u.weapon, u.offhand, u.shadow].filter(Boolean), x: '-=220', alpha: 0, duration: 650, ease: 'Quad.easeIn' })));
  }

  // Intento de huida fallido: el héroe se da vuelta, corre un poco, tropieza y vuelve a su lugar
  async failEscape(actor) {
    if (!actor?.alive) { await wait(this, 300); return; }
    const parts = [actor.body, actor.weapon, actor.offhand, actor.shadow].filter(Boolean);
    actor.body.setFlipX(true);
    actor.weapon?.setFlipX(true);
    actor.offhand?.setFlipX(true);
    await tween(this, { targets: parts, x: '-=46', duration: 260, ease: 'Quad.easeOut' });
    this.playUnit(actor, 'hurt');
    this.floatText(actor, '¡No pudo huir!', '#ffb4a8', 10);
    await tween(this, { targets: parts, x: '+=6', duration: 70, yoyo: true, repeat: 2 });
    actor.body.setFlipX(false);
    actor.weapon?.setFlipX(false);
    actor.offhand?.setFlipX(false);
    await tween(this, { targets: parts, x: actor.home.x, duration: 320, ease: 'Quad.easeInOut' });
    this.playUnit(actor, 'idle');
  }

  endBattle(status) {
    this.setTargeting(null);
    this.activeArrow?.destroy();
    this.activeArrow = null;
    // recentrar siempre (por si el final llegó con la cámara todavía acercada a un golpe)
    this.breathTween?.stop();
    this.cameras.main.pan(VW / 2, VH / 2, 500, 'Sine.easeInOut', true);
    if (status === 'PLAYER_WON') {
      [...this.units.values()].filter((u) => u.kind === 'hero' && u.alive).forEach((u) => this.playUnit(u, 'victory'));
      this.tweens.add({ targets: this.cameras.main, zoom: this.baseZoom * 1.08, duration: 1200, ease: 'Sine.easeOut' });
    } else {
      this.tweens.add({ targets: this.cameras.main, zoom: this.baseZoom, duration: 500, ease: 'Sine.easeOut' });
    }
  }

  // ---------------------------------------------------------------- habilidades
  // Cada habilidad se anima según su "tipo" (tajo, ráfaga, disparo, lluvia de flechas, proyectil
  // mágico, tormenta, curación, mejora, maldición, veneno, sigilo, robo, resurrección). Las del
  // jugador traen sus datos desde React (ctx.actionSkill); las de los monstruos se deducen del
  // registro, que solo trae la frase.
  skillStyle(sk, actor, target, log) {
    const code = sk?.code ?? '';
    const type = sk?.skillType;
    const tt = sk?.targetType;
    const heavy = /MORTAL|DEVASTADOR|BRUTAL|LETAL|ASESINATO|DEMOLED|APLAST/.test(code);
    const holy = /DIVIN|SAGRAD|SANT/.test(code);
    if (sk) {
      if (/RESURRECC|REVIV/.test(code)) return { kind: 'revive' };
      if (/INVISIB|SIGILO|SOMBRA/.test(code)) return { kind: 'stealth' };
      if (/ROBAR|HURTO/.test(code)) return { kind: 'steal' };
      if (/PURIFIC/.test(code)) return { kind: 'heal', cleanse: true };
      if (type === 'CURACION') return { kind: 'heal', all: tt === 'ALL_ALLIES' };
      if (type === 'ESTADO_ALTERADO') return { kind: 'poison', thrown: actor.kind === 'hero' };
      if (type === 'DEBUFF') return { kind: 'curse', holy };
      if (type === 'BUFF' || type === 'ESPECIAL') {
        return { kind: 'buff', shout: /GRITO|AULLIDO|FURIA/.test(code), shield: /ESCUDO|PROTECC|DEFENS/.test(code), holy };
      }
      const hits = Math.max(1, Number(sk.hits) || 1);
      if (sk.damageSchool === 'MAGICO' || (!sk.damageSchool && actor.kind === 'hero' && ['mago', 'sacerdote'].includes(actor.cls))) {
        return { kind: tt === 'ALL_ENEMIES' ? 'storm' : 'bolt', holy };
      }
      if (actor.ranged) {
        if (tt === 'ALL_ENEMIES') return { kind: 'volley', hits };
        return { kind: 'shot', precise: /PRECIS|CERTER|ENFOQ/.test(code), explosive: /EXPLOS/.test(code) };
      }
      if (tt === 'ALL_ENEMIES') return { kind: 'quake' };
      if (hits > 1) return { kind: 'flurry', hits };
      return { kind: 'slash', heavy, holy };
    }
    // monstruos (y habilidades sin datos): se deduce de la frase y del resultado
    const desc = log.description ?? '';
    if (/revivid/i.test(desc)) return { kind: 'revive' };
    if (log.heal) return { kind: 'heal' };
    if (/envenenad/i.test(desc)) return { kind: 'poison', thrown: false };
    if (desc.includes('; ')) return { kind: 'quake' };
    if (!log.damage && log.damage !== 0) {
      if (!target || target.side === actor.side) return { kind: 'buff', shout: actor.kind === 'monster' };
      return { kind: 'curse' };
    }
    return actor.ranged ? { kind: 'shot' } : { kind: 'slash', heavy: actor.kind === 'monster' };
  }

  // Objetivos con su parte del daño/curación. Las habilidades de área llegan en UNA entrada del
  // registro con la frase "usa X sobre A, haciéndole 12 de daño; B esquiva; …": se reparte.
  skillHits(log, actor, target) {
    const desc = log.description ?? '';
    const m = desc.match(/ (?:sobre|y cura a) (.+)\.$/);
    const segs = m ? m[1].split('; ') : [];
    if (segs.length > 1) {
      const used = new Set();
      const pool = [...this.units.values()].filter((u) => u.alive).sort((a, b) => a.pid - b.pid);
      const hits = segs.map((seg) => {
        const dmg = seg.match(/^(.+), haciéndole (\d+) de daño( \(¡Crítico!\))?$/);
        const heal = seg.match(/^(.+), curándole (\d+) HP$/);
        const ev = seg.match(/^(.+) esquiva$/);
        const name = (dmg || heal || ev)?.[1];
        const unit = name && pool.find((u) => !used.has(u.pid) && u.name === name);
        if (!unit) return null;
        used.add(unit.pid);
        return {
          unit,
          log: {
            damage: dmg ? Number(dmg[2]) : null, heal: heal ? Number(heal[2]) : null, crit: !!dmg?.[3], evaded: !!ev,
            hp_after: unit === target ? log.hp_after : this.finalHp?.[unit.pid],
          },
        };
      }).filter(Boolean);
      if (hits.length) return hits;
    }
    return target ? [{ unit: target, log }] : [];
  }

  async skill(actor, target, log, element, sk) {
    const style = this.skillStyle(sk, actor, target, log);
    this.lastSkillCode = sk?.code ?? null;
    const hits = this.skillHits(log, actor, target);
    const main = hits[0]?.unit ?? target;
    switch (style.kind) {
      case 'slash': return this.fxSlash(actor, main, hits, element, style);
      case 'flurry': return this.fxFlurry(actor, main, hits, element, style.hits);
      case 'quake': return this.fxQuake(actor, hits, element);
      case 'shot': return this.fxShot(actor, main, hits, element, style);
      case 'volley': return this.fxVolley(actor, hits, element);
      case 'bolt': return this.fxBolt(actor, main, hits, element, style);
      case 'storm': return this.fxStorm(actor, hits, element, style);
      case 'heal': return this.fxHeal(actor, hits, style);
      case 'revive': return this.fxRevive(actor, hits);
      case 'buff': return this.fxBuff(actor, main ?? actor, style);
      case 'curse': return this.fxCurse(actor, main, hits, style);
      case 'poison': return this.fxPoison(actor, main, hits, style);
      case 'stealth': return this.fxStealth(actor);
      case 'steal': return this.fxSteal(actor, main, hits);
      default: return this.cast(actor, target, log, element);
    }
  }

  async hitAll(hits, kind, element, attacker, stagger = 0) {
    for (const h of hits) {
      if (stagger) {
        this.impact(h.unit, h.log, kind, element, attacker);
        // eslint-disable-next-line no-await-in-loop
        await wait(this, stagger);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await this.impact(h.unit, h.log, kind, element, attacker);
      }
    }
    if (stagger) await wait(this, 380);
  }

  // ---- cuerpo a cuerpo
  slashArc(x, y, color, flip, size = 1, angle = 0) {
    const g = this.add.graphics().setDepth(1057).setBlendMode('ADD');
    const r = 26 * size;
    const draw = (t) => {
      g.clear();
      const a0 = Phaser.Math.DegToRad(angle - 70);
      const a1 = Phaser.Math.DegToRad(angle - 70 + 150 * t);
      g.lineStyle(7 * size, color, 0.45).beginPath().arc(0, 0, r, a0, a1).strokePath();
      g.lineStyle(2.5 * size, 0xffffff, 1).beginPath().arc(0, 0, r - 1, a0, a1).strokePath();
    };
    g.setPosition(x, y).setScale(flip ? -1 : 1, 1);
    const o = { t: 0 };
    this.tweens.add({ targets: o, t: 1, duration: 110, onUpdate: () => draw(o.t) });
    this.tweens.add({ targets: g, alpha: 0, delay: 140, duration: 220, onComplete: () => g.destroy() });
  }

  async dashTo(actor, target, gap = 46) {
    const dir = actor.side === 'PLAYER' ? 1 : -1;
    const tx = target.home.x - dir * (actor.kind === 'monster' && actor.body.width > 48 ? 70 : gap);
    await this.moveUnit(actor, tx, target.home.y + 2, 230, 'Quad.easeIn');
  }

  async fxSlash(actor, target, hits, element, style) {
    if (!target) return;
    this.focusOn(actor, target);
    const color = style.holy ? 0xffe680 : (ELEMENTS[element]?.hex ?? 0xdfe8ff);
    if (style.holy) this.charge(actor.body.x, actor.body.y - 50, 0xffe680);
    await this.dashTo(actor, target);
    const flip = actor.side === 'ENEMY';
    if (style.heavy) {
      // salto y golpe contra el suelo
      const parts = [actor.body, actor.weapon, actor.offhand].filter(Boolean);
      await tween(this, { targets: parts, y: '-=34', duration: 180, ease: 'Quad.easeOut' });
      this.playUnit(actor, actor.kind === 'hero' ? 'attack_melee' : 'attack');
      await tween(this, { targets: parts, y: '+=34', duration: 110, ease: 'Quad.easeIn' });
      this.cameras.main.shake(320, 0.02);
      this.ring(target.home.x, target.home.y, color, 46, 520);
      this.emit(target.home.x, target.home.y, 'roca', {
        speedX: { min: -90, max: 90 }, speedY: { min: -170, max: -60 }, gravityY: 420, lifespan: 650,
        scale: { start: 1.3, end: 0.5 }, tint: [0x8a6a4a, 0x5a4030], blendMode: 'NORMAL', rotate: { min: 0, max: 360 },
      }, 16);
      this.slashArc(target.home.x, target.home.y - 30, color, flip, 1.5, 20);
    } else {
      this.playUnit(actor, actor.kind === 'hero' ? 'attack_melee' : 'attack');
      await wait(this, 150);
      this.slashArc(target.home.x, target.home.y - 30, color, flip, 1.2);
      if (style.holy) this.elementEffect(target, 'LIGHT', 0.7);
    }
    await this.hitAll(hits, null, element ?? (style.holy ? 'LIGHT' : null), actor);
    await wait(this, 120);
    await this.moveUnit(actor, actor.home.x, actor.home.y, 260);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  // estela: copia translúcida del cuerpo que se desvanece
  afterimage(u) {
    const ghost = this.add.sprite(u.body.x, u.body.y, u.body.texture.key, u.body.frame.name)
      .setOrigin(u.body.originX, u.body.originY).setScale(u.body.scaleX, u.body.scaleY).setFlipX(u.body.flipX)
      .setDepth(u.body.depth - 0.1).setTintFill(0x9ad0ff).setAlpha(0.5);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
  }

  async fxFlurry(actor, target, hits, element, n) {
    if (!target) return;
    this.focusOn(actor, target);
    await this.dashTo(actor, target, 40);
    const flip = actor.side === 'ENEMY';
    const color = ELEMENTS[element]?.hex ?? 0xdfe8ff;
    const count = Math.min(6, Math.max(2, n));
    for (let i = 0; i < count; i++) {
      this.afterimage(actor);
      this.playUnit(actor, actor.kind === 'hero' ? 'attack_melee' : 'attack');
      this.slashArc(target.home.x + Phaser.Math.Between(-6, 6), target.home.y - 24 - Phaser.Math.Between(0, 16), color, i % 2 ? !flip : flip, 0.9, Phaser.Math.Between(-40, 40));
      this.burst(target.home.x, target.home.y - 28, color, 6);
      target.body.setTintFill(0xffffff);
      this.time.delayedCall(50, () => target.body.clearTint());
      // eslint-disable-next-line no-await-in-loop
      await wait(this, 95);
    }
    await this.hitAll(hits, null, element, actor);
    await this.moveUnit(actor, actor.home.x, actor.home.y, 240);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  async fxQuake(actor, hits, element) {
    this.focusOn(actor);
    this.playUnit(actor, actor.kind === 'hero' ? 'attack_melee' : 'cast');
    const parts = [actor.body, actor.weapon, actor.offhand].filter(Boolean);
    await tween(this, { targets: parts, y: '-=24', duration: 200, ease: 'Quad.easeOut' });
    await tween(this, { targets: parts, y: '+=24', duration: 110, ease: 'Quad.easeIn' });
    this.cameras.main.shake(600, 0.02);
    this.ring(actor.home.x, actor.home.y, 0xc8a070, 90, 700);
    for (const h of hits) {
      this.emit(h.unit.home.x, h.unit.home.y, 'roca', {
        speedX: { min: -60, max: 60 }, speedY: { min: -190, max: -80 }, gravityY: 440, lifespan: 700,
        scale: { start: 1.4, end: 0.5 }, tint: [0x8a6a4a, 0x5a4030, 0xc8a070], blendMode: 'NORMAL', rotate: { min: 0, max: 360 },
      }, 14);
    }
    await this.hitAll(hits, null, element ?? 'EARTH', actor, 110);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  // ---- arqueros
  async fxShot(actor, target, hits, element, style) {
    if (!target) return;
    this.focusOn(actor, target);
    this.playUnit(actor, actor.kind === 'hero' ? 'attack_bow' : 'attack');
    const sx = actor.body.x + (actor.side === 'PLAYER' ? 20 : -20);
    const sy = actor.body.y - 38;
    if (style.precise) {
      // apunta: destello en la punta y línea de mira
      this.charge(sx, sy, 0xffffff);
      const line = this.add.line(0, 0, sx, sy, target.home.x, target.home.y - 34, 0xff5a4a, 0.5).setOrigin(0).setDepth(1050).setLineWidth(0.6);
      await wait(this, 520);
      line.destroy();
    } else {
      await wait(this, 380);
    }
    const arrow = this.add.image(sx, sy, 'flecha').setDepth(1050).setScale(style.precise ? 1.5 : 1.2).setFlipX(actor.side === 'ENEMY');
    const tint = style.explosive ? 0xff8a3a : ELEMENTS[element]?.light;
    if (tint) arrow.setTint(tint);
    const trail = this.add.particles(0, 0, 'mota', {
      lifespan: 220, scale: { start: 0.8, end: 0 }, alpha: { start: 0.7, end: 0 }, frequency: 12,
      tint: tint ?? 0xfff4c0, blendMode: 'ADD',
    }).setDepth(1049);
    trail.startFollow(arrow);
    await tween(this, { targets: arrow, x: target.home.x, y: target.home.y - 34, duration: style.precise ? 120 : 180 });
    arrow.destroy();
    trail.stop();
    this.time.delayedCall(400, () => trail.destroy());
    if (style.explosive) {
      this.cameras.main.shake(260, 0.014);
      this.elementEffect(target, 'FIRE', 1);
      this.ring(target.home.x, target.home.y - 28, 0xffd84a, 40, 450);
    } else if (style.precise) {
      this.cameras.main.flash(90, 255, 255, 255);
    }
    await this.hitAll(hits, null, element ?? (style.explosive ? 'FIRE' : null), actor);
    await wait(this, 150);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  async fxVolley(actor, hits, element) {
    this.focusOn(actor);
    this.playUnit(actor, actor.kind === 'hero' ? 'attack_bow' : 'attack');
    await wait(this, 300);
    // flechas al cielo…
    for (let i = 0; i < 5; i++) {
      const a = this.add.image(actor.body.x + 16, actor.body.y - 40, 'flecha').setDepth(1050).setAngle(-70).setScale(1.5);
      this.tweens.add({ targets: a, x: a.x + 30 + i * 6, y: -30, duration: 260, delay: i * 40, onComplete: () => a.destroy() });
    }
    await wait(this, 380);
    this.resetFocus();
    // …y caen en lluvia sobre cada objetivo
    const tint = ELEMENTS[element]?.light;
    for (const h of hits) {
      for (let i = 0; i < 6; i++) {
        const x = h.unit.home.x + Phaser.Math.Between(-22, 22);
        const a = this.add.image(x - 40, -20 - i * 14, 'flecha').setDepth(1050).setAngle(65).setScale(1.6);
        if (tint) a.setTint(tint);
        this.tweens.add({
          targets: a, x, y: h.unit.home.y - Phaser.Math.Between(4, 30), duration: 240, delay: i * 45, ease: 'Quad.easeIn',
          onComplete: () => { this.burst(a.x, a.y, 0xffe6a0, 4); a.destroy(); },
        });
      }
    }
    await wait(this, 420);
    await this.hitAll(hits, null, element, actor, 120);
    if (actor.alive) this.playUnit(actor, 'idle');
  }

  // ---- magia
  async fxBolt(actor, target, hits, element, style) {
    if (!target) return;
    this.focusOn(actor, target);
    this.playUnit(actor, 'cast');
    const el = ELEMENTS[element] ?? (style.holy ? ELEMENTS.LIGHT : null);
    const color = el?.hex ?? 0x9a7aff;
    const hx = actor.body.x + (actor.side === 'PLAYER' ? 18 : -18);
    const hy = actor.body.y - 52;
    this.charge(hx, hy, color);
    await wait(this, 420);
    // los rayos y la luz caen del cielo; el resto viaja como un orbe
    if (!['LIGHTNING', 'LIGHT'].includes(element)) {
      const orb = this.add.circle(hx, hy, 5, el?.light ?? 0xd8c8ff, 1).setDepth(1052).setBlendMode('ADD');
      const halo = this.add.circle(hx, hy, 10, color, 0.45).setDepth(1051).setBlendMode('ADD');
      const trail = this.add.particles(0, 0, 'mota', {
        lifespan: 300, scale: { start: 1.2, end: 0 }, frequency: 10, tint: [color, el?.light ?? 0xffffff], blendMode: 'ADD',
        speed: { min: 5, max: 20 },
      }).setDepth(1050);
      trail.startFollow(orb);
      this.tweens.add({ targets: [orb, halo], scale: { from: 0.8, to: 1.2 }, duration: 90, yoyo: true, repeat: -1 });
      await tween(this, { targets: [orb, halo], x: target.home.x, y: target.home.y - 30, duration: 260, ease: 'Quad.easeIn' });
      orb.destroy();
      halo.destroy();
      trail.stop();
      this.time.delayedCall(400, () => trail.destroy());
    }
    if (el) this.elementEffect(target, element ?? 'LIGHT');
    else this.arcane(target);
    await this.hitAll(hits, 'magic', element ?? (style.holy ? 'LIGHT' : null), actor);
    await wait(this, 150);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  // magia sin elemento: runas violetas y estrellas
  arcane(target) {
    const x = target.home.x;
    const y = target.home.y - 28;
    this.ring(x, y, 0xb07aff, 34, 480);
    this.ring(x, y, 0xffffff, 18, 360);
    this.emit(x, y, 'estrella', { speed: { min: 40, max: 120 }, lifespan: 600, scale: { start: 1.4, end: 0 }, tint: [0xb07aff, 0xe0c8ff], rotate: { min: 0, max: 360 } }, 18);
  }

  async fxStorm(actor, hits, element, style) {
    const cam = this.cameras.main;
    this.breathTween?.pause();
    this.tweens.add({ targets: cam, zoom: this.baseZoom * 1.05, duration: 300 });
    this.playUnit(actor, 'cast');
    const el = ELEMENTS[element] ?? (style.holy ? ELEMENTS.LIGHT : null);
    const color = el?.hex ?? 0x9a7aff;
    this.charge(actor.body.x, actor.body.y - 52, color);
    this.ring(actor.home.x, actor.home.y - 10, color, 50, 700);
    await wait(this, 500);
    const fc = Phaser.Display.Color.IntegerToColor(el?.light ?? 0xd8c8ff);
    cam.flash(160, fc.red, fc.green, fc.blue);
    // tormenta elemental sin elemento fijo: cada objetivo recibe uno distinto
    const cycle = ['FIRE', 'ICE', 'LIGHTNING', 'WIND'];
    hits.forEach((h, i) => this.time.delayedCall(i * 140, () => {
      if (el) this.elementEffect(h.unit, element ?? 'LIGHT');
      else if (/ELEMENTAL/.test(this.lastSkillCode ?? '')) this.elementEffect(h.unit, cycle[i % cycle.length]);
      else this.arcane(h.unit);
    }));
    await wait(this, 200);
    await this.hitAll(hits, 'magic', element, actor, 140);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  // ---- apoyo
  lightColumn(u, color, width = 26) {
    const x = u.home.x;
    const beam = this.add.rectangle(x, u.home.y - 60, width, 150, color, 0.35).setDepth(1056).setBlendMode('ADD');
    const core = this.add.rectangle(x, u.home.y - 60, width * 0.35, 150, 0xffffff, 0.7).setDepth(1057).setBlendMode('ADD');
    beam.scaleX = 0.1;
    core.scaleX = 0.1;
    this.tweens.add({ targets: [beam, core], scaleX: 1, duration: 160, yoyo: true, hold: 300, onComplete: () => { beam.destroy(); core.destroy(); } });
    this.emit(x, u.home.y - 10, 'estrella', { speedX: { min: -20, max: 20 }, speedY: { min: -90, max: -40 }, lifespan: 800, scale: { start: 1.3, end: 0 }, tint: [color, 0xffffff] }, 16);
    this.ring(x, u.home.y - 2, color, 26, 520);
  }

  async fxHeal(actor, hits, style) {
    this.playUnit(actor, 'cast');
    const color = style.cleanse ? 0xbfe6ff : 0x7dff9a;
    this.charge(actor.body.x + (actor.side === 'PLAYER' ? 18 : -18), actor.body.y - 52, color);
    await wait(this, 380);
    const targets = hits.length ? hits : [{ unit: actor, log: {} }];
    targets.forEach((h, i) => this.time.delayedCall(i * 120, () => this.lightColumn(h.unit, color)));
    await wait(this, 260);
    await this.hitAll(targets.filter((h) => h.log.heal || h.log.damage), 'heal', null, actor, targets.length > 1 ? 120 : 0);
    if (!targets.some((h) => h.log.heal)) await wait(this, 300);
    if (actor.alive) this.playUnit(actor, 'idle');
  }

  async fxRevive(actor, hits) {
    this.playUnit(actor, 'cast');
    this.charge(actor.body.x, actor.body.y - 52, 0xffe680);
    await wait(this, 420);
    for (const h of hits) {
      this.lightColumn(h.unit, 0xffe680, 34);
      this.cameras.main.flash(200, 255, 240, 180);
      // vuelve a levantarse (el estado final confirma la vida)
      h.unit.alive = true;
      this.tweens.add({ targets: [h.unit.body, h.unit.shadow, h.unit.weapon, h.unit.offhand, h.unit.label].filter(Boolean), alpha: 1, duration: 400 });
      h.unit.label?.setVisible(true);
      this.playUnit(h.unit, 'idle');
      if (h.log.hp_after != null) h.unit.hp = h.log.hp_after;
      this.drawBar(h.unit);
    }
    await wait(this, 600);
    if (actor.alive) this.playUnit(actor, 'idle');
  }

  async fxBuff(actor, target, style) {
    this.playUnit(actor, style.shout && actor.kind === 'hero' ? 'victory' : 'cast');
    const color = style.holy ? 0xffe680 : style.shield ? 0x8fc9ff : 0xffd84a;
    if (style.shout) {
      // grito de guerra: ondas que salen del que grita
      this.cameras.main.shake(380, 0.008);
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 120, () => this.ring(actor.home.x, actor.home.y - 34, 0xff8a4a, 40 + i * 16, 520));
    } else {
      this.charge(actor.body.x + (actor.side === 'PLAYER' ? 18 : -18), actor.body.y - 52, color);
    }
    await wait(this, 400);
    if (style.shield) {
      const bubble = this.add.circle(target.home.x, target.home.y - 30, 30, color, 0.18).setStrokeStyle(2, 0xbfe6ff, 0.9)
        .setDepth(1055).setBlendMode('ADD').setScale(0.3);
      this.tweens.add({ targets: bubble, scale: 1, duration: 260, ease: 'Back.easeOut' });
      this.tweens.add({ targets: bubble, alpha: 0, delay: 600, duration: 300, onComplete: () => bubble.destroy() });
    } else {
      this.ring(target.home.x, target.home.y, color, 34, 600);
      this.emit(target.home.x, target.home.y - 4, 'estrella', {
        speedX: { min: -24, max: 24 }, speedY: { min: -100, max: -40 }, lifespan: 750, scale: { start: 1.3, end: 0 }, tint: [color, 0xffffff],
      }, 18);
    }
    await wait(this, 500);
    if (actor.alive) this.playUnit(actor, 'idle');
  }

  // sello oscuro bajo el objetivo
  sigil(u, color) {
    const g = this.add.graphics().setDepth(u.home.y - 0.5).setBlendMode('ADD').setPosition(u.home.x, u.home.y);
    g.lineStyle(1.5, color, 0.9).strokeEllipse(0, 0, 54, 16).strokeEllipse(0, 0, 40, 11);
    const pts = [0, 1, 2, 3, 4].map((i) => {
      const a = (i * 144 - 90) * (Math.PI / 180);
      return { x: Math.cos(a) * 22, y: Math.sin(a) * 6.5 };
    });
    g.strokePoints([...pts, pts[0]]);
    g.setScale(0.2);
    this.tweens.add({ targets: g, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: g, alpha: 0, delay: 700, duration: 300, onComplete: () => g.destroy() });
  }

  async fxCurse(actor, target, hits, style) {
    if (!target) return;
    this.playUnit(actor, 'cast');
    const color = style.holy ? 0xffe680 : 0xa040e0;
    this.charge(actor.body.x + (actor.side === 'PLAYER' ? 18 : -18), actor.body.y - 52, color);
    await wait(this, 400);
    const targets = hits.length ? hits.map((h) => h.unit) : [target];
    targets.forEach((u) => {
      this.sigil(u, color);
      this.emit(u.home.x, u.home.y - 6, 'humo', {
        speedX: { min: -20, max: 20 }, speedY: { min: -50, max: -15 }, lifespan: 800, scale: { start: 0.4, end: 1.2 },
        alpha: { start: 0.6, end: 0 }, tint: style.holy ? [0xffe680, 0xffffff] : [0x7a30b0, 0x2a1840], blendMode: style.holy ? 'ADD' : 'NORMAL',
      }, 12);
      u.body.setTint(style.holy ? 0xfff0b0 : 0xc080ff);
      this.time.delayedCall(500, () => u.body.clearTint());
    });
    await wait(this, 700);
    if (actor.alive) this.playUnit(actor, 'idle');
  }

  async fxPoison(actor, target, hits, style) {
    if (!target) return;
    this.focusOn(actor, target);
    if (style.thrown) {
      this.playUnit(actor, 'attack_melee');
      await wait(this, 160);
      const dagger = this.add.image(actor.body.x + 16, actor.body.y - 36, 'flecha').setScale(0.8).setTint(0x7be05a).setDepth(1050)
        .setFlipX(actor.side === 'ENEMY');
      this.tweens.add({ targets: dagger, angle: 720, duration: 220 });
      await tween(this, { targets: dagger, x: target.home.x, y: target.home.y - 30, duration: 220 });
      dagger.destroy();
    } else {
      await this.dashTo(actor, target);
      this.playUnit(actor, actor.kind === 'hero' ? 'attack_melee' : 'attack');
      await wait(this, 160);
    }
    this.emit(target.home.x, target.home.y - 28, 'humo', {
      speedX: { min: -30, max: 30 }, speedY: { min: -60, max: -20 }, lifespan: 700, scale: { start: 0.3, end: 1.2 },
      alpha: { start: 0.8, end: 0 }, tint: [0x5ad04a, 0x2a7a2a, 0x9aff6a], blendMode: 'NORMAL',
    }, 16);
    target.body.setTint(0x7be05a);
    this.time.delayedCall(350, () => target.body.clearTint());
    const damaging = hits.filter((h) => h.log.damage || h.log.evaded);
    if (damaging.length) await this.hitAll(damaging, null, null, actor);
    else await wait(this, 350);
    if (!style.thrown) await this.moveUnit(actor, actor.home.x, actor.home.y, 240);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  async fxStealth(actor) {
    this.playUnit(actor, 'cast');
    await wait(this, 200);
    this.emit(actor.home.x, actor.home.y - 24, 'humo', {
      speedX: { min: -60, max: 60 }, speedY: { min: -50, max: 10 }, lifespan: 900, scale: { start: 0.6, end: 1.8 },
      alpha: { start: 0.85, end: 0 }, tint: [0x6a6a7a, 0x3a3a48, 0x9a9aaa], blendMode: 'NORMAL',
    }, 26);
    // se desvanece un momento; si queda invisible lo mantiene el efecto del estado (NO_DAMAGE)
    await tween(this, { targets: [actor.body, actor.weapon, actor.offhand].filter(Boolean), alpha: 0.3, duration: 300, yoyo: true, hold: 250 });
    if (actor.alive) this.playUnit(actor, 'idle');
  }

  async fxSteal(actor, target, hits) {
    if (!target) return;
    this.focusOn(actor, target);
    this.afterimage(actor);
    await this.dashTo(actor, target, 34);
    this.afterimage(actor);
    this.playUnit(actor, 'attack_melee');
    await wait(this, 140);
    this.slashArc(target.home.x, target.home.y - 26, 0xffd84a, actor.side === 'ENEMY', 0.8);
    // monedas que vuelan del objetivo al ladrón
    for (let i = 0; i < 6; i++) {
      const c = this.add.circle(target.home.x, target.home.y - 30, 2.5, 0xffd84a).setStrokeStyle(1, 0x8a6a10).setDepth(1058);
      this.tweens.add({
        targets: c, x: actor.home.x + Phaser.Math.Between(-8, 8), y: actor.home.y - 40 - Phaser.Math.Between(0, 20),
        duration: 420, delay: 120 + i * 50, ease: 'Sine.easeInOut', onComplete: () => c.destroy(),
      });
    }
    const damaging = hits.filter((h) => h.log.damage || h.log.evaded);
    if (damaging.length) await this.hitAll(damaging, null, null, actor);
    await wait(this, 300);
    await this.moveUnit(actor, actor.home.x, actor.home.y, 260);
    if (actor.alive) this.playUnit(actor, 'idle');
    this.resetFocus();
  }

  // ---------------------------------------------------------------- Romper (escudos)
  // Escudo a la izquierda de la barra de vida con los puntos que le quedan; roto = aturdido
  syncShield(u, shield, silent = false) {
    if (!u.alive || !shield) { this.clearShield(u); return; }
    const x = u.home.x - 27;
    const y = u.barY + 1;
    if (!u.shieldIcon) {
      u.shieldBg = this.add.circle(x, y, 6.5, 0x0d0b14, 0.95).setStrokeStyle(1, 0x8fc9ff).setDepth(1110);
      u.shieldIcon = this.add.image(x, y, 'icos_checked-shield').setDisplaySize(9, 9).setTintFill(0x8fc9ff).setDepth(1111);
      u.shieldText = this.add.text(x + 0.5, y + 0.5, '', {
        fontFamily: 'Cinzel, Georgia, serif', fontSize: '7px', fontStyle: 'bold', color: '#ffffff', stroke: '#0d0b14', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(1112).setResolution(6);
    }
    const before = u.shieldValue;
    u.shieldValue = shield.current;
    u.shieldText.setText(shield.broken ? '' : String(shield.current));
    const broken = shield.broken;
    u.shieldIcon.setTintFill(broken ? 0x6a6a7a : shield.current <= 1 ? 0xffb05a : 0x8fc9ff);
    u.shieldBg.setStrokeStyle(1, broken ? 0x6a6a7a : 0x8fc9ff);
    // el escudo que baja hace un pequeño temblor
    if (!silent && before != null && shield.current < before && !broken) {
      this.tweens.add({ targets: [u.shieldIcon, u.shieldBg, u.shieldText], x: '+=1.5', duration: 40, yoyo: true, repeat: 2 });
    }
    // aturdido: estrellas girando sobre la cabeza
    if (broken && !u.stunFx) this.startStun(u);
    if (!broken && u.stunFx) this.stopStun(u, !silent);
  }

  clearShield(u) {
    [u.shieldBg, u.shieldIcon, u.shieldText].forEach((o) => o?.destroy());
    u.shieldBg = u.shieldIcon = u.shieldText = null;
    if (u.stunFx) this.stopStun(u, false);
  }

  startStun(u) {
    const cx = u.home.x;
    const cy = u.barY - 30;
    const stars = [0, 1, 2].map(() => this.add.image(cx, cy, 'estrella').setTint(0xffe680).setDepth(1105).setScale(1.6).setBlendMode('ADD'));
    const state = { a: 0 };
    const tw = this.tweens.add({
      targets: state, a: Math.PI * 2, duration: 1100, repeat: -1,
      onUpdate: () => stars.forEach((st, i) => {
        const ang = state.a + (i * Math.PI * 2) / 3;
        st.setPosition(cx + Math.cos(ang) * 12, cy + Math.sin(ang) * 4);
      }),
    });
    u.body.setTint(0x9aa0c8);
    u.stunFx = { stars, tw };
  }

  stopStun(u, announce) {
    u.stunFx.tw.stop();
    u.stunFx.stars.forEach((st) => st.destroy());
    u.stunFx = null;
    if (u.alive) u.body.clearTint();
    if (announce && u.alive) {
      this.floatText(u, 'Escudo restaurado', '#8fc9ff', 9);
      this.ring(u.home.x, u.home.y - 28, 0x8fc9ff, 34, 500);
    }
  }

  async breakFx(u) {
    audio.sfx('romper');
    this.cameras.main.shake(380, 0.02);
    this.cameras.main.flash(140, 200, 230, 255);
    this.punchZoom();
    const x = u.home.x;
    const y = u.home.y - 30;
    // el escudo estalla en esquirlas
    this.emit(x, y, 'esquirla', {
      speed: { min: 80, max: 220 }, lifespan: 700, rotate: { min: 0, max: 360 }, scale: { start: 1.3, end: 0.3 },
      tint: [0xbfe6ff, 0x8fc9ff, 0xffffff], gravityY: 200,
    }, 26);
    this.ring(x, y, 0xbfe6ff, 50, 520);
    this.ring(x, y, 0xffffff, 30, 380);
    const t = this.add.text(x, y - 22, '¡ROTO!', {
      fontFamily: 'Cinzel, Georgia, serif', fontSize: '22px', fontStyle: 'bold', color: '#bfe6ff', stroke: '#101830', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1210).setResolution(6).setScale(2.2).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
    this.tweens.add({ targets: u.body, x: `+=${u.side === 'PLAYER' ? -10 : 10}`, duration: 90, yoyo: true, repeat: 1 });
    if (u.shieldText) u.shieldText.setText('');
    if (!u.stunFx) this.startStun(u);
    await wait(this, 900);
  }

  async furyFx(u) {
    audio.sfx('encuentro');
    this.cameras.main.flash(220, 255, 60, 40);
    this.cameras.main.shake(500, 0.014);
    this.playUnit(u, 'cast');
    this.ring(u.home.x, u.home.y - 30, 0xff4a3a, 60, 700);
    this.emit(u.home.x, u.home.y - 10, 'humo', {
      speedX: { min: -40, max: 40 }, speedY: { min: -90, max: -30 }, lifespan: 900, scale: { start: 0.5, end: 1.8 },
      alpha: { start: 0.7, end: 0 }, tint: [0xff4a3a, 0x8a1010], blendMode: 'ADD',
    }, 24);
    const t = this.add.text(u.home.x, u.home.y - 90, '¡FURIA!', {
      fontFamily: 'Cinzel, Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#ff7a5a', stroke: '#200808', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1210).setResolution(6).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 20, delay: 1000, duration: 500, onComplete: () => t.destroy() });
    bus.emit('battle-fury', u.pid);
    await wait(this, 1300);
    if (u.alive) this.playUnit(u, 'idle');
  }

  // ---------------------------------------------------------------- estados alterados
  // Los PNG de game-icons son de 512px: dibujados a 8px con el filtro "pixel art" se ven
  // serruchados, así que se reducen una vez (con suavizado) a una textura de 32px.
  makeStatusIcons() {
    for (const [name] of STATUS_ICONS) {
      const small = `icos_${name}`;
      if (this.textures.exists(small) || !this.textures.exists(`ico_${name}`)) continue;
      const src = this.textures.get(`ico_${name}`).getSourceImage();
      const canvas = this.textures.createCanvas(small, 32, 32);
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, 32, 32);
      canvas.refresh();
      this.textures.remove(`ico_${name}`);
    }
  }

  // altura de los íconos: sobre el nombre en los monstruos, sobre la cabeza en los héroes
  statusAnchor(u) {
    return u.kind === 'monster' ? { x: u.home.x, y: u.barY - 16 } : { x: u.home.x - 2, y: u.home.y - 96 };
  }

  // Compara los estados nuevos con los que ya tenía: anuncia los que aparecen, apaga los que se
  // fueron y redibuja la fila de íconos. silent = al crear la escena (sin anuncios).
  syncStatuses(u, p, silent = false) {
    const list = statusesOf(p);
    const before = u.statusKeys ?? new Set();
    const now = new Set(list.map((st) => st.key));
    u.statusKeys = now;
    u.fx ??= {};
    if (!silent) {
      list.filter((st) => !before.has(st.key) && st.key !== 'DEFENDING').forEach((st, i) => {
        this.time.delayedCall(i * 260, () => this.announceStatus(u, st));
      });
    }
    // efectos que acompañan al combatiente mientras dure cada estado
    for (const key of Object.keys(u.fx)) {
      if (!now.has(key)) this.stopStatusFx(u, key);
    }
    for (const st of list) {
      if (!u.fx[st.key]) u.fx[st.key] = this.startStatusFx(u, st);
    }
    this.drawStatusIcons(u, list);
  }

  drawStatusIcons(u, list) {
    u.statusIcons?.forEach((o) => o.destroy());
    u.statusIcons = [];
    const shown = list.slice(0, 5);
    if (!shown.length) return;
    const { x, y } = this.statusAnchor(u);
    const step = 11;
    const x0 = x - ((shown.length - 1) * step) / 2;
    shown.forEach((st, i) => {
      const cx = x0 + i * step;
      const ring = this.add.circle(cx, y, 5.2, 0x0d0b14, 0.92).setStrokeStyle(1, st.hex, 1).setDepth(1110);
      const icon = this.textures.exists(`icos_${st.icon[0]}`)
        ? this.add.image(cx, y, `icos_${st.icon[0]}`).setDisplaySize(7.5, 7.5).setTintFill(st.hex).setDepth(1111)
        : null;
      const parts = [ring, icon].filter(Boolean);
      // los que están por terminar parpadean
      if (st.rounds === 1) this.tweens.add({ targets: parts, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
      u.statusIcons.push(...parts);
    });
  }

  announceStatus(u, st) {
    if (!u.alive) return;
    const { x, y } = this.statusAnchor(u);
    this.floatText(u, st.short, st.color, 10);
    audio.sfx(DOT_STATUS.has(st.key) ? 'veneno' : st.kind === 'buff' ? 'mejora' : 'penalizacion');
    if (DOT_STATUS.has(st.key)) {
      this.emit(u.home.x, u.home.y - 30, 'humo', {
        speedX: { min: -25, max: 25 }, speedY: { min: -50, max: -15 }, lifespan: 700, scale: { start: 0.3, end: 1 },
        alpha: { start: 0.7, end: 0 }, tint: st.key === 'DOT' ? [0x5ad04a, 0x2a7a2a, 0x9aff6a] : [st.hex, 0x2a1a1a], blendMode: 'NORMAL',
      }, 14);
    } else if (st.key === 'PARALYZE') {
      this.sparks(u, st.hex);
    } else if (st.kind === 'buff') {
      this.rainArrows(u, st.hex, -1);
      this.ring(u.home.x, u.home.y - 10, st.hex, 26, 520);
    } else {
      this.rainArrows(u, st.hex, 1);
    }
    // el ícono nuevo hace un "pop"
    const pop = this.add.circle(x, y, 4, st.hex, 0.6).setDepth(1109).setBlendMode('ADD');
    this.tweens.add({ targets: pop, scale: 3, alpha: 0, duration: 420, onComplete: () => pop.destroy() });
  }

  // flechas de mejora (suben) o de penalización (bajan) alrededor del combatiente
  rainArrows(u, color, dir) {
    for (let i = 0; i < 5; i++) {
      const ax = u.home.x + Phaser.Math.Between(-20, 20);
      const ay = u.home.y - (dir < 0 ? 10 : 70) - Phaser.Math.Between(0, 14);
      const tri = this.add.triangle(ax, ay, 0, dir < 0 ? 6 : 0, 4, dir < 0 ? 0 : 6, 8, dir < 0 ? 6 : 0, color, 0.95)
        .setDepth(1058).setBlendMode('ADD').setAlpha(0);
      this.tweens.add({ targets: tri, alpha: 1, duration: 120, delay: i * 70 });
      this.tweens.add({ targets: tri, y: ay + dir * 38, alpha: 0, duration: 650, delay: 120 + i * 70, ease: 'Sine.easeIn', onComplete: () => tri.destroy() });
    }
  }

  // Efecto que acompaña al combatiente mientras dure el estado; devuelve { stop() }
  startStatusFx(u, st) {
    const follow = (emitter, oy) => { emitter.startFollow(u.body, 0, oy); return emitter; };
    const parts = [];
    if (DOT_STATUS.has(st.key)) {
      // veneno verde, quemadura en chispas que suben, sangrado en gotas que caen
      const bleed = st.key === 'BLEED';
      parts.push(follow(this.add.particles(0, 0, 'mota', {
        x: { min: -12, max: 12 }, speedY: bleed ? { min: 14, max: 30 } : { min: -26, max: -12 }, lifespan: 1100, frequency: 240,
        scale: { start: 0.9, end: 0.2 }, alpha: { start: 0.9, end: 0 }, tint: st.key === 'DOT' ? [0x5ad04a, 0x9aff6a] : [st.hex, 0xffffff],
        blendMode: st.key === 'BURN' ? 'ADD' : 'NORMAL',
      }).setDepth(1050), bleed ? -40 : -30));
    } else if (st.key === 'DAMAGE_TAKEN' && st.kind === 'debuff') {
      parts.push(follow(this.add.particles(0, 0, 'humo', {
        x: { min: -16, max: 16 }, speedY: { min: -18, max: -6 }, lifespan: 1300, frequency: 300,
        scale: { start: 0.3, end: 0.9 }, alpha: { start: 0.45, end: 0 }, tint: [0x7a30b0, 0x2a1840],
      }).setDepth(1049), -6));
    } else if (st.key === 'FURY') {
      parts.push(follow(this.add.particles(0, 0, 'humo', {
        x: { min: -18, max: 18 }, speedY: { min: -40, max: -15 }, lifespan: 900, frequency: 120,
        scale: { start: 0.4, end: 1.1 }, alpha: { start: 0.5, end: 0 }, tint: [0xff4a3a, 0xff8a3a], blendMode: 'ADD',
      }).setDepth(u.home.y - 0.6), -10));
    } else if (st.key === 'HOT') {
      parts.push(follow(this.add.particles(0, 0, 'estrella', {
        x: { min: -14, max: 14 }, speedY: { min: -24, max: -10 }, lifespan: 1000, frequency: 380,
        scale: { start: 1, end: 0 }, tint: 0x7dff9a, blendMode: 'ADD',
      }).setDepth(1050), -20));
    } else if (st.key === 'NO_DAMAGE') {
      const targets = [u.body, u.weapon, u.offhand].filter(Boolean);
      const tw = this.tweens.add({ targets, alpha: { from: 0.35, to: 0.6 }, duration: 700, yoyo: true, repeat: -1 });
      return { stop: () => { tw.stop(); targets.forEach((o) => o.setAlpha(1)); } };
    } else if (st.key === 'FARO') {
      // mira del faro sobre el apuntado: un anillo de luz que late
      const ring = this.add.circle(u.home.x, u.home.y - 26, 22).setStrokeStyle(2, 0x7ff8ff, 0.95).setDepth(1052).setBlendMode('ADD');
      const tw = this.tweens.add({ targets: ring, scale: { from: 1.15, to: 0.8 }, alpha: { from: 0.4, to: 1 }, duration: 520, yoyo: true, repeat: -1 });
      return { stop: () => { tw.stop(); ring.destroy(); } };
    } else if (st.key === 'DEFENDING') {
      const dir = u.side === 'PLAYER' ? 1 : -1;
      const shield = this.add.ellipse(u.home.x + dir * 20, u.home.y - 30, 14, 52, 0x8fc9ff, 0.22)
        .setStrokeStyle(1.5, 0xbfe6ff, 0.9).setDepth(u.home.y + 1).setBlendMode('ADD');
      const tw = this.tweens.add({ targets: shield, alpha: { from: 0.55, to: 1 }, scaleY: { from: 0.96, to: 1.04 }, duration: 600, yoyo: true, repeat: -1 });
      return { stop: () => { tw.stop(); this.tweens.add({ targets: shield, alpha: 0, duration: 200, onComplete: () => shield.destroy() }); } };
    } else if (st.kind === 'buff') {
      parts.push(follow(this.add.particles(0, 0, 'mota', {
        x: { min: -14, max: 14 }, speedY: { min: -30, max: -14 }, lifespan: 900, frequency: 520,
        scale: { start: 0.8, end: 0 }, tint: st.hex, blendMode: 'ADD',
      }).setDepth(1050), -8));
    } else {
      parts.push(follow(this.add.particles(0, 0, 'mota', {
        x: { min: -14, max: 14 }, speedY: { min: 10, max: 22 }, lifespan: 900, frequency: 560,
        scale: { start: 0.8, end: 0 }, tint: st.hex, blendMode: 'ADD',
      }).setDepth(1050), -70));
    }
    return { stop: () => parts.forEach((pt) => { pt.stop(); this.time.delayedCall(1400, () => pt.destroy()); }) };
  }

  stopStatusFx(u, key) {
    u.fx?.[key]?.stop();
    delete u.fx[key];
  }

  clearStatuses(u) {
    Object.keys(u.fx ?? {}).forEach((k) => this.stopStatusFx(u, k));
    u.statusIcons?.forEach((o) => o.destroy());
    u.statusIcons = [];
    u.statusKeys = new Set();
  }

  // paralizado: chispas y el combatiente tiembla sin moverse
  async paralyzedFx(u) {
    if (!u.alive) return;
    audio.sfx('penalizacion');
    this.sparks(u, 0xffe23a);
    this.floatText(u, 'Paralizado', '#ffe95a', 12);
    await tween(this, { targets: [u.body, u.weapon, u.offhand].filter(Boolean), x: '+=2', duration: 50, yoyo: true, repeat: 4 });
    await wait(this, 240);
  }

  sparks(u, hex) {
    this.emit(u.home.x, u.home.y - 34, 'estrella', {
      speed: { min: 40, max: 110 }, lifespan: 380, scale: { start: 0.9, end: 0 }, tint: [hex, 0xffffff], blendMode: 'ADD',
    }, 14);
  }

  // daño de veneno, quemadura o sangrado, o curación por regeneración, al cerrar la ronda
  async statusTick(u, log) {
    if (log.hp_after != null) u.hp = log.hp_after;
    if (log.damage > 0) {
      const desc = log.description ?? '';
      const [label, color, tint, smoke] = /quemadura/.test(desc) ? ['Quemadura', '#ff9a4a', 0xff8a4a, [0xff7a2a, 0x3a1a0a]]
        : /sangrado/.test(desc) ? ['Sangrado', '#ff6a6a', 0xff6a6a, [0xe03a3a, 0x3a0a0a]]
          : ['Veneno', '#7be05a', 0x7be05a, [0x5ad04a, 0x2a7a2a]];
      audio.sfx('veneno');
      this.emit(u.home.x, u.home.y - 28, 'humo', {
        speedX: { min: -30, max: 30 }, speedY: { min: -60, max: -20 }, lifespan: 600, scale: { start: 0.3, end: 1.1 },
        alpha: { start: 0.8, end: 0 }, tint: smoke, blendMode: 'NORMAL',
      }, 12);
      u.body.setTint(tint);
      u.weapon?.setTint(tint);
      u.offhand?.setTint(tint);
      this.playUnit(u, 'hurt');
      this.floatText(u, `${log.damage}`, color, 14, label, '#ffffff');
      await tween(this, { targets: [u.body, u.weapon, u.offhand].filter(Boolean), x: `+=${u.side === 'PLAYER' ? -4 : 4}`, duration: 80, yoyo: true, repeat: 1 });
      u.body.clearTint();
      u.weapon?.clearTint();
      u.offhand?.clearTint();
      this.drawBar(u);
      if (log.hp_after != null && log.hp_after <= 0) await this.kill(u);
      else if (u.alive) this.playUnit(u, 'idle');
    } else {
      this.emit(u.home.x, u.home.y - 30, 'estrella', { speed: { min: 20, max: 60 }, lifespan: 600, scale: { start: 1.2, end: 0 }, tint: 0x7dff9a }, 12);
      this.floatText(u, `+${log.heal}`, '#7dff9a', 13, 'Regeneración', '#bfffcf');
      this.drawBar(u);
      await wait(this, 420);
    }
  }

  // ---------------------------------------------------------------- cámara y efectos
  focusOn(a, b) {
    const cam = this.cameras.main;
    const cx = b ? (a.home.x + b.home.x) / 2 : a.home.x;
    this.breathTween?.pause();
    this.tweens.add({ targets: cam, zoom: this.baseZoom * 1.12, duration: 300, ease: 'Sine.easeOut' });
    cam.pan(cx, VH / 2 + 30, 300, 'Sine.easeOut');
  }

  resetFocus() {
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, zoom: this.baseZoom, duration: 400, ease: 'Sine.easeInOut' });
    cam.pan(VW / 2, VH / 2, 400, 'Sine.easeInOut', false, (_c, progress) => {
      if (progress === 1) this.breathTween?.resume();
    });
  }

  punchZoom() {
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, zoom: cam.zoom * 1.06, duration: 70, yoyo: true });
  }

  burst(x, y, color, quantity) {
    const p = this.add.particles(x, y, 'chispa', {
      speed: { min: 40, max: 140 },
      lifespan: 420,
      scale: { start: 1, end: 0 },
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(1060);
    p.explode(quantity);
    this.time.delayedCall(600, () => p.destroy());
  }

  floatText(u, text, color, size, header, headerColor = '#ff8a5a') {
    const x = u.home.x + Phaser.Math.Between(-6, 6);
    const y = u.home.y - 62;
    const t = this.add.text(x, y, text, {
      fontFamily: 'Cinzel, Georgia, serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#141420', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1200).setResolution(6).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, delay: 500, duration: 650, onComplete: () => t.destroy() });
    if (header) {
      const h = this.add.text(x, y - 16, header, {
        fontFamily: 'Cinzel, Georgia, serif', fontSize: '8px', fontStyle: 'bold', color: headerColor, stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(1200).setResolution(6);
      this.tweens.add({ targets: h, y: y - 40, alpha: 0, delay: 500, duration: 650, onComplete: () => h.destroy() });
    }
  }

  // ---------------------------------------------------------------- turno y objetivos
  setActive(pid) {
    this.activeArrow?.destroy();
    this.activeArrow = null;
    const u = this.units.get(pid);
    if (!u || !u.alive) return;
    const y = u.home.y - 78;
    this.activeArrow = this.add.triangle(u.home.x, y, 0, 0, 10, 0, 5, 8, 0xffd84a).setDepth(1150).setStrokeStyle(1.5, 0x141420);
    this.tweens.add({ targets: this.activeArrow, y: y - 4, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  setTargeting(side) {
    this.targeting = side;
    for (const u of this.units.values()) {
      u.body.removeAllListeners();
      u.body.disableInteractive();
      u.body.clearTint();
      if (side && u.side === side && u.alive) {
        u.body.setInteractive({ useHandCursor: true, pixelPerfect: false });
        u.body.on('pointerover', () => { u.body.setTint(0xffe08a); bus.emit('battle-hover', u.pid); });
        u.body.on('pointerout', () => { u.body.clearTint(); bus.emit('battle-hover', null); });
        u.body.on('pointerdown', () => { u.body.clearTint(); bus.emit('battle-target', u.pid); });
      }
    }
  }

  highlight(pid) {
    for (const u of this.units.values()) {
      if (this.targeting && u.side === this.targeting && u.alive) {
        if (u.pid === pid) u.body.setTint(0xffe08a); else u.body.clearTint();
      }
    }
  }
}
