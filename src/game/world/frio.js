import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';
import { gameHour } from './shared';

// El frío de la Tundra Eterna y el hielo resbaloso del Lago de Cristal.
// El frío: fuera de Fiordo Blanco una barra de CALOR baja despacio (más rápido de
// noche y con nevada). Las hogueras (los refugios de cada subzona) y la comida la llenan. Con la barra
// vacía quedas ENTUMECIDO: caminas más lento y cada tanto pierdes un poco de vida (el servidor te la
// quita y nunca te deja en 0: gprback/lib/frio.js). Es como la tormenta de las Montañas y las brasas
// del Volcán. El HUD (pages/World.js) muestra la barra como un bufo con su porcentaje.
// El hielo del Lago (tiles "lago_*" del tileset compartido): el héroe resbala, arranca y frena despacio
// y sigue de largo un poco al soltar las teclas. No te deja atrapado: en el medio del lago están Eirik
// y los agujeros de pesca, y hay que poder pararse ahí.
// La aurora: de noche, en la Tundra, cintas verdes y moradas ondulan en lo alto de la pantalla (solo se
// ven; el mítico Hrimgar sale en estas noches).
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const COLD_ZONE = 'tundra';
// gids del hielo del Lago de Cristal (lago_0 … lago_15; art/sprites/mundo/crear_mundo.lua, tileset v9)
const ICE_GID_MIN = 1402;
const ICE_GID_MAX = 1417;
// qué tan rápido la velocidad sigue a las teclas sobre el hielo (por segundo; fuera del hielo es al instante)
const ICE_GRIP = 2.2;
const ICE_SPEED = 1.15;
const STORE_KEY = 'tundra_calor';
// cuánto baja por segundo (de 100 a 0 en ~4 minutos de día, sin nevada)
const DROP_PER_S = 0.42;
const NIGHT_MUL = 1.5;
const SNOW_MUL = 1.3;
// junto a una hoguera sube rápido
const WARM_PER_S = 9;
const WARM_TILES = 6;
// entumecido: más lento y un golpe de frío cada tanto
export const NUMB_SPEED = 0.7;
const NUMB_HIT_MS = 12000;

export const frioMethods = {
  // ¿hace frío aquí? (la Tundra, fuera de las subzonas seguras: Fiordo Blanco)
  coldHere() {
    return this.zoneDir === COLD_ZONE && !this.subzone?.safe;
  },

  // junto a una hoguera de la Tundra (los refugios de sus subzonas)
  nearFire() {
    return (this.refuges ?? []).some((r) => r.zone === COLD_ZONE && Phaser.Math.Distance.Between(r.x, r.y, this.player.x, this.player.y) < WARM_TILES * 32);
  },

  initCold() {
    if (this.coldReady) return;
    this.coldReady = true;
    let saved = 100;
    try { saved = Number(sessionStorage.getItem(STORE_KEY) ?? 100); } catch { /* sin guardar */ }
    this.warmth = Number.isFinite(saved) ? Phaser.Math.Clamp(saved, 0, 100) : 100;
    this.numb = this.warmth <= 0;
    // la comida caliente llena la barra (la ventana de comida avisa por el bus al comer)
    const onFood = () => { this.warmth = 100; this.setNumb(false); this.emitCold(true); };
    bus.on('food-buff', onFood);
    this.events.once('shutdown', () => bus.off('food-buff', onFood));
  },

  setNumb(on) {
    if (this.numb === on) return;
    this.numb = on;
    if (on) {
      this.floatLoot?.([{ text: 'Entumecido: el frío te cala los huesos', color: '#9ad8ff' }]);
      bus.emit('social-toast', { text: '🥶 Estás entumecido: caminas más lento y el frío te quita vida. Busca una hoguera o come algo caliente.', kind: 'error' });
      this.nextNumbHit = this.time.now + 3000;
    } else if (this.player) {
      this.floatLoot?.([{ text: 'Ya no estás entumecido', color: '#ffd27a' }]);
    }
  },

  // avisa al HUD (solo cuando cambia de a 5 %, para no redibujar a cada cuadro)
  emitCold(force = false) {
    const step = Math.round(this.warmth / 5) * 5;
    const here = this.coldHere();
    if (!force && step === this.lastColdStep && here === this.lastColdHere) return;
    this.lastColdStep = step;
    this.lastColdHere = here;
    bus.emit('frio', here || this.warmth < 100 ? { calor: step, entumecido: this.numb, aqui: here } : null);
    try { sessionStorage.setItem(STORE_KEY, String(Math.round(this.warmth))); } catch { /* sin guardar */ }
  },

  // multiplicador de velocidad por el frío
  coldSpeed() {
    return this.numb && this.zoneDir === COLD_ZONE ? NUMB_SPEED : 1;
  },

  updateCold(time, delta) {
    if (!this.player || this.changingZone) return;
    if (this.zoneDir !== COLD_ZONE) {
      if (this.lastColdHere !== undefined && this.lastColdHere !== null) { this.lastColdHere = null; bus.emit('frio', null); }
      return;
    }
    this.initCold();
    if (this.encounterLock) return;
    const dt = Math.min(delta, 250) / 1000;
    if (this.nearFire() || !this.coldHere()) {
      const was = this.warmth;
      this.warmth = Math.min(100, this.warmth + (this.coldHere() ? WARM_PER_S : WARM_PER_S * 2) * dt);
      if (was < 100 && this.warmth >= 100 && this.coldHere()) audio.sfx('curar');
      if (this.numb && this.warmth > 15) this.setNumb(false);
    } else {
      const h = gameHour();
      const night = h >= 20 || h < 6;
      const mul = (night ? NIGHT_MUL : 1) * (this.weather === 'nieve' ? SNOW_MUL : 1);
      this.warmth = Math.max(0, this.warmth - DROP_PER_S * mul * dt);
      if (this.warmth <= 0 && !this.numb) this.setNumb(true);
      if (this.numb && time >= (this.nextNumbHit ?? 0)) {
        this.nextNumbHit = time + NUMB_HIT_MS;
        this.player.setTint(0x9ad8ff);
        this.time.delayedCall(300, () => this.player?.clearTint());
        bus.emit('frio-golpe');
      }
    }
    this.emitCold();
  },

  // ¿el héroe pisa el hielo del Lago?
  onIce() {
    if (this.zoneDir !== COLD_ZONE || !this.player) return false;
    const t = this.groundTileAt(this.player.x, this.player.y + 6);
    return !!t && t.index >= ICE_GID_MIN && t.index <= ICE_GID_MAX;
  },

  // velocidad final sobre el hielo: sigue a la que piden las teclas, pero de a poco (resbala)
  iceVelocity(tx, ty, delta) {
    if (!this.onIce()) { this.iceVel = null; return { x: tx, y: ty, sliding: false }; }
    const v = this.iceVel ?? { x: this.player.body.velocity.x, y: this.player.body.velocity.y };
    const k = Math.min(1, ICE_GRIP * Math.min(delta, 100) / 1000);
    v.x += (tx * ICE_SPEED - v.x) * k;
    v.y += (ty * ICE_SPEED - v.y) * k;
    // si choca contra algo, ahí se para
    const b = this.player.body.blocked;
    if ((b.left && v.x < 0) || (b.right && v.x > 0)) v.x = 0;
    if ((b.up && v.y < 0) || (b.down && v.y > 0)) v.y = 0;
    if (Math.abs(v.x) < 2) v.x = 0;
    if (Math.abs(v.y) < 2) v.y = 0;
    this.iceVel = v;
    return { x: v.x, y: v.y, sliding: !!(v.x || v.y) && !(tx || ty) };
  },

  // la aurora en el cielo de la Tundra (la llama updateSky con lo oscuro que está: 0 de día, ~1.6 de noche)
  updateAurora(dark) {
    const show = this.zoneDir === COLD_ZONE && !this.world?.interior && dark > 0.35;
    if (!show) { if (this.aurora) this.aurora.setVisible(false); return; }
    if (!this.aurora) {
      this.aurora = this.add.graphics().setScrollFactor(0).setDepth(20.6).setBlendMode(Phaser.BlendModes.ADD);
      this.minimap?.ignore(this.aurora);
    }
    const now = this.time.now;
    if (now < (this.nextAuroraDraw ?? 0)) return;
    this.nextAuroraDraw = now + 80;
    const g = this.aurora.setVisible(true).clear();
    const { width: w, height: h } = this.scale;
    const alpha = Phaser.Math.Clamp((dark - 0.35) * 0.5, 0, 0.32);
    const t = now / 1000;
    // dos cintas: verde arriba y morada un poco más abajo; cada una son columnas finas que suben y bajan
    for (const [y0, amp, freq, speed, color, k] of [[h * 0.08, h * 0.05, 0.006, 0.35, 0x7af0b8, 1], [h * 0.17, h * 0.04, 0.009, -0.25, 0xb884ff, 0.7]]) {
      for (let x = 0; x < w; x += 4) {
        const y = y0 + Math.sin(x * freq + t * speed) * amp + Math.sin(x * freq * 2.3 - t * speed * 1.7) * amp * 0.35;
        const tall = h * (0.07 + 0.04 * Math.sin(x * 0.02 + t));
        g.fillStyle(color, alpha * k * (0.6 + 0.4 * Math.sin(x * 0.05 + t * 2)));
        g.fillRect(x, y, 3, tall);
      }
    }
  },
};
