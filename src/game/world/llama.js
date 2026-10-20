import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';

// La oscuridad de las Catacumbas del Abismo (gprback/docs/zona6_catacumbas.md, sección 4).
// Bajo tierra no hay día: el héroe lleva su propia LLAMA. Fuera de Vela Eterna se va gastando (una barra,
// como el calor de la Tundra en world/frio.js). Las lámparas de alma (los refugios de cada subzona) y
// Vela Eterna la vuelven a encender, y la Vela de Sebo (se compra a Hollin o la hace Ilse) la llena donde
// sea. Con la llama apagada quedas A OSCURAS: ves mucho menos alrededor y los muertos te encuentran
// antes (más combates en el osario). No quita vida (la Tundra ya lo hace con el frío).
// Mientras Morgath, la Polilla de la Vela Negra, anda suelta en las Catacumbas, la llama se gasta más
// rápido: busca la luz para apagarla.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const DARK_ZONE = 'catacumbas';
const STORE_KEY = 'catacumbas_llama';
// cuánto baja por segundo (de 100 a 0 en ~4 minutos)
const DROP_PER_S = 0.42;
const MOTH_MUL = 1.5;
// junto a una lámpara de alma (y en Vela Eterna) se enciende rápido
const LIGHT_PER_S = 12;
const LAMP_TILES = 6;
// a oscuras: los combates en el osario salen más seguido
export const DARK_ENCOUNTER_MUL = 1.6;

export const llamaMethods = {
  // ¿se gasta la llama aquí? (las Catacumbas, fuera de Vela Eterna)
  darkHere() {
    return this.zoneDir === DARK_ZONE && !this.subzone?.safe;
  },

  // junto a una lámpara de alma de las Catacumbas (los refugios de sus subzonas)
  nearLamp() {
    return (this.refuges ?? []).some((r) => r.zone === DARK_ZONE && Phaser.Math.Distance.Between(r.x, r.y, this.player.x, this.player.y) < LAMP_TILES * 32);
  },

  initLlama() {
    if (this.llamaReady) return;
    this.llamaReady = true;
    let saved = 100;
    try { saved = Number(sessionStorage.getItem(STORE_KEY) ?? 100); } catch { /* sin guardar */ }
    this.llama = Number.isFinite(saved) ? Phaser.Math.Clamp(saved, 0, 100) : 100;
    this.aOscuras = this.llama <= 0;
    // la Vela de Sebo (la mochila avisa por el bus al usarla)
    const onCandle = () => { this.llama = 100; this.setDark(false); this.emitLlama(true); audio.sfx('curar'); };
    bus.on('llama-llena', onCandle);
    this.events.once('shutdown', () => bus.off('llama-llena', onCandle));
  },

  setDark(on) {
    if (this.aOscuras === on) return;
    this.aOscuras = on;
    if (on) {
      this.floatLoot?.([{ text: 'Tu llama se apagó', color: '#c6a2ff' }]);
      bus.emit('social-toast', { text: '🕯️ Tu llama se apagó: estás a oscuras. Ves mucho menos y los muertos te encuentran antes. Busca una lámpara de alma o enciende una Vela de Sebo.', kind: 'error' });
    } else if (this.player) {
      this.floatLoot?.([{ text: 'Tu llama vuelve a arder', color: '#c0f6ff' }]);
    }
  },

  // avisa al HUD (solo cuando cambia de a 5 %, para no redibujar a cada cuadro)
  emitLlama(force = false) {
    const step = Math.round(this.llama / 5) * 5;
    const here = this.darkHere();
    if (!force && step === this.lastLlamaStep && here === this.lastLlamaHere) return;
    this.lastLlamaStep = step;
    this.lastLlamaHere = here;
    bus.emit('llama', { luz: step, aOscuras: this.aOscuras, aqui: here });
    try { sessionStorage.setItem(STORE_KEY, String(Math.round(this.llama))); } catch { /* sin guardar */ }
  },

  updateLlama(time, delta) {
    if (!this.player || this.changingZone) return;
    if (this.zoneDir !== DARK_ZONE) {
      if (this.lastLlamaHere !== undefined && this.lastLlamaHere !== null) { this.lastLlamaHere = null; bus.emit('llama', null); }
      return;
    }
    this.initLlama();
    if (this.encounterLock) return;
    const dt = Math.min(delta, 250) / 1000;
    if (this.nearLamp() || !this.darkHere()) {
      const was = this.llama;
      this.llama = Math.min(100, this.llama + LIGHT_PER_S * dt);
      if (was < 100 && this.llama >= 100 && this.darkHere()) audio.sfx('curar');
      if (this.aOscuras && this.llama > 15) this.setDark(false);
    } else {
      const moth = this.nightZone === DARK_ZONE;
      this.llama = Math.max(0, this.llama - DROP_PER_S * (moth ? MOTH_MUL : 1) * dt);
      if (this.llama <= 0 && !this.aOscuras) this.setDark(true);
    }
    this.emitLlama();
  },

  // la luz del héroe en las Catacumbas (la llama updateIndoorSky): se achica con la llama y, a oscuras,
  // casi no se ve nada
  applyLlamaLight() {
    if (this.zoneDir !== DARK_ZONE || this.llama == null) return;
    const k = this.aOscuras ? 0 : this.llama / 100;
    this.heroLight.setScale(0.8 + 1.1 * k).setAlpha(0.3 + 0.25 * k);
    this.shade.setFillStyle(this.aOscuras ? 0x1e1c2c : 0x3c3858);
  },

  // a oscuras los muertos te encuentran antes
  darkEncounterMul() {
    return this.zoneDir === DARK_ZONE && this.aOscuras ? DARK_ENCOUNTER_MUL : 1;
  },
};
