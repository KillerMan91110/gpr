import Phaser from 'phaser';
import bus from './bus';
import { CHARLAS, FRASES, PREGONES } from './cityScripts';
import { gameHour } from './WorldScene';

// Vida de la ciudad (puntos del mapa de Aurelia):
//  ciudadano  vecinos que caminan por una ruta (o se quedan quietos conversando con otros)
//  ruta       puntos ordenados que forman el recorrido de un ciudadano
//  pilar      el Pilar de Aethra animado (también punto de interés: ofrenda)
//  cartel     cartel colgante con ícono junto a la puerta de un edificio
//  palomas    bandada que picotea y sale volando si te acercas
//  gato       gato que toma el sol y a veces da un paseo
// Los globitos de lo que dicen los pinta socialLayer (clave "cit:<nombre>").

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const TAG_FONT = 'Cinzel, Georgia, serif';
const IDLE = { down: 0, up: 3, side: 6 };
const SIGN_ICONS = ['espada', 'baston', 'arco', 'daga', 'sol', 'pocion', 'yunque', 'jarra', 'moneda', 'pergamino', 'balanza', 'gema', 'ala', 'rueda', 'libro', 'cama'];
const TALK_RADIUS = 12 * 32;
const propOf = (o, name) => o.properties?.find((p) => p.name === name)?.value;

export const isFestival = () => new Date().getDay() === 0; // domingo: Festival de Aethra

export default class CityLife {
  static preload(scene) {
    if (!scene.textures.exists('pilar')) scene.load.spritesheet('pilar', `${ASSETS}/mundo/pilar.png`, { frameWidth: 96, frameHeight: 128 });
    if (!scene.textures.exists('carteles')) scene.load.spritesheet('carteles', `${ASSETS}/mundo/carteles.png`, { frameWidth: 24, frameHeight: 24 });
    if (!scene.textures.exists('f_paloma')) scene.load.spritesheet('f_paloma', `${ASSETS}/mundo/fauna/paloma.png`, { frameWidth: 16, frameHeight: 16 });
    if (!scene.textures.exists('f_gato')) scene.load.spritesheet('f_gato', `${ASSETS}/mundo/fauna/gato.png`, { frameWidth: 16, frameHeight: 16 });
  }

  constructor(scene, points) {
    this.scene = scene;
    this.walkers = new Map();
    this.groups = new Map();
    this.flocks = [];
    this.cats = [];
    this.news = [...PREGONES];
    this.festival = isFestival();
    const of = (type) => points.filter((o) => o.type === type);

    // rutas: nombre → puntos en orden
    this.routes = {};
    for (const r of of('ruta')) (this.routes[r.name] = this.routes[r.name] ?? []).push({ x: r.x, y: r.y, orden: propOf(r, 'orden') ?? 0 });
    Object.values(this.routes).forEach((list) => list.sort((a, b) => a.orden - b.orden));

    of('pilar').forEach((o) => this.makePilar(o));
    of('cartel').forEach((o) => this.makeSign(o));
    of('palomas').forEach((o) => this.makeFlock(o));
    of('gato').forEach((o) => this.makeCat(o));

    // hojas de caminar de los ciudadanos (se cargan una vez para todos)
    const citizens = of('ciudadano');
    const sheets = [...new Set(citizens.map((o) => propOf(o, 'sprite')).filter(Boolean))];
    scene.loadThen(() => sheets.forEach((s) => {
      if (!scene.textures.exists(`npc_${s}`)) scene.load.spritesheet(`npc_${s}`, `${ASSETS}/mundo/caminar/${s}.png`, { frameWidth: 32, frameHeight: 32 });
    }), () => citizens.forEach((o) => this.makeCitizen(o)));

    if (this.festival) this.decorateFestival();
    this.loadNews();
    this.newsTimer = scene.time.addEvent({ delay: 120000, loop: true, callback: () => this.loadNews() });
  }

  // noticias del servidor para el pregonero (subidas de nivel, festival…)
  async loadNews() {
    try {
      const list = await fetch(`${API_URL}/api/world/noticias`).then((r) => r.json());
      if (Array.isArray(list) && list.length) this.news = [...list, ...PREGONES];
    } catch { /* se queda con los pregones de siempre */ }
  }

  // ------------------------------------------------------------------ elementos fijos
  makePilar(o) {
    const s = this.scene;
    if (!s.anims.exists('pilar_agua')) s.anims.create({ key: 'pilar_agua', frames: s.anims.generateFrameNumbers('pilar', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    const pilar = s.add.sprite(o.x, o.y + 40, 'pilar', 0).setOrigin(0.5, 1).setDepth(9.5 + (o.y + 40) / 100000).play('pilar_agua');
    s.blockers.add(s.add.rectangle(o.x, o.y + 22, 76, 28));
    if (this.festival) {
      s.tweens.add({ targets: pilar, duration: 1600, yoyo: true, repeat: -1, tint: { from: 0xffffff, to: 0xffe08a } });
    }
    this.pilar = pilar;
  }

  makeSign(o) {
    const s = this.scene;
    const frame = Math.max(0, SIGN_ICONS.indexOf(propOf(o, 'icono')));
    const sign = s.add.image(o.x, o.y - 10, 'carteles', frame).setOrigin(0.5, 0).setDepth(9.7);
    s.minimap?.ignore(sign);
    // se mece un poco con el viento
    s.tweens.add({ targets: sign, angle: { from: -4, to: 4 }, duration: 1800 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  makeFlock(o) {
    const s = this.scene;
    if (!s.anims.exists('f_paloma_vuela')) s.anims.create({ key: 'f_paloma_vuela', frames: s.anims.generateFrameNumbers('f_paloma', { frames: [2, 3] }), frameRate: 12, repeat: -1 });
    const flock = { x: o.x, y: o.y, birds: [], away: false };
    const spawn = () => {
      flock.birds = Array.from({ length: Phaser.Math.Between(4, 6) }, () => {
        const b = s.add.sprite(o.x + Phaser.Math.Between(-28, 28), o.y + Phaser.Math.Between(-18, 18), 'f_paloma', 0).setDepth(9.4).setFlipX(Math.random() < 0.5);
        s.minimap?.ignore(b);
        return b;
      });
      flock.away = false;
    };
    spawn();
    flock.respawn = spawn;
    this.flocks.push(flock);
  }

  makeCat(o) {
    const s = this.scene;
    if (!s.anims.exists('f_gato_anda')) s.anims.create({ key: 'f_gato_anda', frames: s.anims.generateFrameNumbers('f_gato', { start: 1, end: 2 }), frameRate: 6, repeat: -1 });
    const cat = s.add.sprite(o.x, o.y, 'f_gato', 0).setDepth(9.4).setFlipX(Math.random() < 0.5);
    s.minimap?.ignore(cat);
    const stroll = () => {
      if (!cat.active) return;
      let dx = Phaser.Math.Between(-48, 48);
      const toX = Phaser.Math.Clamp(cat.x + dx, o.x - 64, o.x + 64);
      // no se mete en paredes ni objetos: si el camino choca, se queda tomando el sol
      if (s.clearLine && !s.clearLine(Math.floor(cat.x / 32), Math.floor((cat.y + 4) / 32), Math.floor(toX / 32), Math.floor((cat.y + 4) / 32))) dx = 0;
      if (!dx) { s.time.delayedCall(Phaser.Math.Between(6000, 15000), stroll); return; }
      cat.setFlipX(dx < 0).play('f_gato_anda');
      s.tweens.add({
        targets: cat, x: toX, duration: Math.abs(dx) * 40 + 200,
        onComplete: () => { cat.anims.stop(); cat.setFrame(0); s.time.delayedCall(Phaser.Math.Between(6000, 15000), stroll); },
      });
    };
    s.time.delayedCall(Phaser.Math.Between(3000, 9000), stroll);
    this.cats.push(cat);
  }

  // guirnaldas de colores alrededor de la plaza durante el Festival de Aethra
  decorateFestival() {
    const s = this.scene;
    const p = this.pilar;
    if (!p) return;
    const g = s.add.graphics().setDepth(20.4);
    s.minimap?.ignore(g);
    const colors = [0xd84040, 0xffd860, 0x4a5ad8, 0x5aa040, 0xe86a8a];
    for (let i = 0; i < 12; i += 1) {
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = ((i + 1) / 12) * Math.PI * 2;
      const r = 150;
      const x0 = p.x + Math.cos(a0) * r; const y0 = p.y - 40 + Math.sin(a0) * r * 0.7;
      const x1 = p.x + Math.cos(a1) * r; const y1 = p.y - 40 + Math.sin(a1) * r * 0.7;
      g.lineStyle(1, 0x4f2e1c, 1);
      g.beginPath();
      for (let t = 0; t <= 1.001; t += 0.1) { const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 10; if (t === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokePath();
      for (let t = 0.15; t < 1; t += 0.2) {
        const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 10;
        g.fillStyle(colors[Math.floor(t * 10 + i) % colors.length], 1).fillTriangle(x - 3, y, x + 3, y, x, y + 6);
      }
    }
    // confeti que cae de vez en cuando
    const conf = s.add.particles(p.x, p.y - 160, 'mota_mundo', {
      x: { min: -160, max: 160 }, speedY: { min: 20, max: 50 }, speedX: { min: -10, max: 10 }, lifespan: 4000, frequency: 160,
      scale: { start: 0.7, end: 0.4 }, tint: colors, alpha: { start: 1, end: 0 },
    }).setDepth(20.5);
    s.minimap?.ignore(conf);
  }

  // ------------------------------------------------------------------ ciudadanos
  makeCitizen(o) {
    const s = this.scene;
    const key = `npc_${propOf(o, 'sprite')}`;
    if (!s.textures.exists(key)) return;
    s.makeWalkAnims(key);
    const sprite = s.add.sprite(o.x, o.y, key, IDLE.down).setDepth(9.5);
    const nombre = propOf(o, 'nombre');
    const tag = nombre ? s.add.text(o.x, o.y - 18, nombre.split(',')[0], {
      fontFamily: TAG_FONT, fontSize: '6px', fontStyle: 'bold', color: '#e8e0c8', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(4) : null;
    if (tag) s.minimap?.ignore(tag);
    const route = this.routes[propOf(o, 'ruta')] ?? null;
    const w = {
      name: o.name, key, sprite, tag, route, speed: propOf(o, 'velocidad') ?? 32, horario: propOf(o, 'horario') ?? 'siempre',
      rol: propOf(o, 'rol'), frases: FRASES[propOf(o, 'frases')] ?? (propOf(o, 'rol') ? FRASES[propOf(o, 'rol')] : null),
      idx: 0, wait: Phaser.Math.Between(0, 3000), dir: 'down', saidAt: 0,
    };
    if (route?.length) {
      // empieza en el punto de su ruta más cercano a donde lo puso el mapa (o uno al azar si van varios)
      w.idx = Phaser.Math.Between(0, route.length - 1);
      sprite.setPosition(route[w.idx].x, route[w.idx].y);
    }
    const mira = propOf(o, 'mira');
    if (mira) { w.dir = mira === 'up' ? 'up' : mira === 'down' ? 'down' : 'side'; sprite.setFrame(IDLE[w.dir]).setFlipX(mira === 'sideL'); }
    const grupo = propOf(o, 'charla');
    if (grupo) {
      const g = this.groups.get(grupo) ?? { name: grupo, members: [], line: 0, wait: Phaser.Math.Between(1000, 5000) };
      g.members.push(w);
      this.groups.set(grupo, g);
    }
    if (w.rol === 'bardo') this.makeBardMusic(w);
    this.walkers.set(o.name, w);
  }

  makeBardMusic(w) {
    const s = this.scene;
    s.time.addEvent({
      delay: 900, loop: true,
      callback: () => {
        if (!w.sprite.visible) return;
        const n = s.add.text(w.sprite.x + Phaser.Math.Between(-6, 10), w.sprite.y - 18, Phaser.Utils.Array.GetRandom(['♪', '♫', '♩']), {
          fontSize: '9px', color: Phaser.Utils.Array.GetRandom(['#ffe08a', '#9fd6ff', '#ff9ac0']), stroke: '#141420', strokeThickness: 2,
        }).setDepth(21).setResolution(4);
        s.minimap?.ignore(n);
        s.tweens.add({ targets: n, y: n.y - 22, x: n.x + Phaser.Math.Between(-8, 8), alpha: 0, duration: 1800, onComplete: () => n.destroy() });
      },
    });
  }

  // para socialLayer: dónde poner el globito de un ciudadano
  entity(name) {
    const w = this.walkers.get(name);
    return w?.sprite.visible ? { sprite: w.sprite, top: w.sprite.y - 30 } : null;
  }

  visibleNow(w) {
    const h = gameHour();
    if (w.horario === 'dia') return h >= 6 && h < 20;
    if (w.horario === 'tarde') return h >= 17 && h < 23.5;
    if (w.horario === 'noche') return h >= 20 || h < 6;
    return true;
  }

  say(w, text, loud = false) {
    w.saidAt = this.scene.time.now;
    bus.emit('other-say', { id: `cit:${w.name}`, text, loud, npc: true });
  }

  // ------------------------------------------------------------------ cada fotograma
  update(delta) {
    const s = this.scene;
    const hero = s.player;
    if (!hero) return;
    const now = s.time.now;
    for (const w of this.walkers.values()) {
      const vis = this.visibleNow(w);
      if (vis !== w.sprite.visible) { w.sprite.setVisible(vis); w.tag?.setVisible(vis); }
      if (!vis) continue;
      const sp = w.sprite;
      if (w.route?.length > 1) {
        if (w.wait > 0) {
          w.wait -= delta;
          if (sp.anims.isPlaying) { sp.anims.stop(); sp.setFrame(IDLE[w.dir]); }
        } else {
          // camino al siguiente punto de la ruta esquivando casas, muros, fuentes y árboles
          // (WorldScene.findPath); sin camino posible, en línea recta como antes
          if (!w.path) w.path = s.findPath?.(sp.x, sp.y, w.route[(w.idx + 1) % w.route.length].x, w.route[(w.idx + 1) % w.route.length].y) ?? [w.route[(w.idx + 1) % w.route.length]];
          const target = w.path[0];
          const dx = target.x - sp.x;
          const dy = target.y - sp.y;
          const dist = Math.hypot(dx, dy);
          const step = (w.speed * delta) / 1000;
          if (dist <= step) {
            sp.setPosition(target.x, target.y);
            w.path.shift();
            if (!w.path.length) {
              w.path = null;
              w.idx = (w.idx + 1) % w.route.length;
              // se detiene un rato en cada punto (los niños casi nunca)
              w.wait = w.rol === 'nino' ? Phaser.Math.Between(0, 400) : Phaser.Math.Between(400, 3500);
            }
          } else {
            sp.setPosition(sp.x + (dx / dist) * step, sp.y + (dy / dist) * step);
            w.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
            sp.setFlipX(w.dir === 'side' && dx < 0);
            sp.anims.play(`walk_${w.key}_${w.dir}`, true);
          }
        }
      }
      sp.setDepth(9.5 + sp.y / 100000);
      w.tag?.setPosition(sp.x, sp.y - 16);
      // frases sueltas cuando el héroe pasa cerca
      const near = Phaser.Math.Distance.Between(sp.x, sp.y, hero.x, hero.y);
      if (w.rol === 'pregonero') {
        if (near < 16 * 32 && now - w.saidAt > 16000) this.say(w, Phaser.Utils.Array.GetRandom(this.news), true);
      } else if (w.frases && near < (w.rol === 'bardo' ? 8 : 4) * 32 && now - w.saidAt > 9000 && Math.random() < delta / 2500) {
        this.say(w, Phaser.Utils.Array.GetRandom(w.frases));
      }
    }
    // conversaciones: se turnan los globitos mientras el héroe esté cerca
    for (const g of this.groups.values()) {
      const lead = g.members[0]?.sprite;
      if (!lead?.visible) continue;
      if (Phaser.Math.Distance.Between(lead.x, lead.y, hero.x, hero.y) > TALK_RADIUS) continue;
      g.wait -= delta;
      if (g.wait > 0) continue;
      const script = CHARLAS[g.name];
      if (!script) continue;
      const [who, text] = script[g.line];
      const m = g.members[who % g.members.length];
      if (m) this.say(m, text);
      g.line += 1;
      if (g.line >= script.length) { g.line = 0; g.wait = Phaser.Math.Between(20000, 35000); } else g.wait = 3200 + text.length * 35;
    }
    // palomas: salen volando si el héroe se acerca y vuelven al rato
    for (const f of this.flocks) {
      if (f.away) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, hero.x, hero.y) < 56) {
        f.away = true;
        f.birds.forEach((b, i) => {
          const dir = b.x < hero.x ? -1 : 1;
          b.setFlipX(dir < 0).play('f_paloma_vuela');
          s.tweens.add({ targets: b, x: b.x + dir * Phaser.Math.Between(140, 240), y: b.y - Phaser.Math.Between(120, 200), alpha: 0, duration: 1500, delay: i * 60, ease: 'Quad.easeIn', onComplete: () => b.destroy() });
        });
        s.time.delayedCall(25000, () => f.respawn());
      } else if (Math.random() < delta / 900) {
        const b = Phaser.Utils.Array.GetRandom(f.birds);
        if (b?.active) b.setFrame(b.frame.name === 0 ? 1 : 0);
      }
    }
  }
}
