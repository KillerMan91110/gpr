import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';
import { mulColor } from './shared';

// Los eclipses de las Ruinas Ancestrales: la mirada del Devorador (gprback/docs/zona7_ruinas.md, sección 4).
// Cada 9 minutos el cielo de las Ruinas se oscurece durante un minuto (la misma cuenta que
// gprback/lib/eclipse.js, con el reloj del servidor: World.js le pasa la diferencia con setEclipseOffset).
//   - medio minuto antes, el aviso: «El sol tiembla…»;
//   - durante el eclipse los monstruos salen corrompidos (más fuerza y más botín: lo decide el servidor);
//   - junto a una fuente de lágrimas (los refugios de cada subzona) el eclipse no te alcanza: ahí no hay
//     combates en la hierba.
// No quita vida. Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const ECLIPSE_ZONE = 'ruinas';
const PERIODO_MS = 9 * 60 * 1000;
const DURA_MS = 60 * 1000;
const AVISO_MS = 30 * 1000;
// cuánto tarda en oscurecer y en volver la luz (ms)
const FUNDIDO_MS = 6000;
// a cuántas casillas de una fuente de lágrimas no te alcanza
const FUENTE_TILES = 6;
// el color del cielo durante el eclipse (se multiplica con el de la hora)
const TINTE = 0x6a58a0;
// diferencia entre el reloj del servidor y el de este navegador (ms)
let eclipseOffset = 0;
export const setEclipseOffset = (ms) => { eclipseOffset = Number(ms) || 0; };

const fase = () => (Date.now() + eclipseOffset) % PERIODO_MS;

export const eclipseMethods = {
  // ¿hay eclipse ahora? (en el reloj del servidor; vale para todo el mundo, pero solo se ve en las Ruinas)
  eclipseOn() {
    return fase() >= PERIODO_MS - DURA_MS;
  },

  // cuánto falta para que empiece (si no hay) o para que termine (si hay)
  eclipseChangeIn() {
    const f = fase();
    return f >= PERIODO_MS - DURA_MS ? PERIODO_MS - f : PERIODO_MS - DURA_MS - f;
  },

  // junto a una fuente de lágrimas de las Ruinas (los refugios de sus subzonas)
  nearTearFountain() {
    return (this.refuges ?? []).some((r) => r.zone === ECLIPSE_ZONE && Phaser.Math.Distance.Between(r.x, r.y, this.player.x, this.player.y) < FUENTE_TILES * 32);
  },

  // 0 a 1: cuánto se oscureció el cielo (con un fundido al empezar y al terminar)
  eclipseLevel() {
    if (this.zoneDir !== ECLIPSE_ZONE || !this.eclipseOn()) return 0;
    const f = fase() - (PERIODO_MS - DURA_MS);
    return Phaser.Math.Clamp(Math.min(f, DURA_MS - f) / FUNDIDO_MS, 0, 1);
  },

  // el color del cielo con el eclipse encima (la llama updateSky)
  eclipseTint(color) {
    const k = this.eclipseLevel();
    if (!k) return color;
    const dark = mulColor(color, TINTE);
    const a = Phaser.Display.Color.IntegerToColor(color);
    const b = Phaser.Display.Color.IntegerToColor(dark);
    const mix = (x, y) => Math.round(x + (y - x) * k);
    return Phaser.Display.Color.GetColor(mix(a.red, b.red), mix(a.green, b.green), mix(a.blue, b.blue));
  },

  // durante el eclipse, junto a una fuente de lágrimas no hay combates en la hierba
  eclipseEncounterMul() {
    return this.zoneDir === ECLIPSE_ZONE && this.eclipseOn() && this.nearTearFountain() ? 0 : 1;
  },

  updateEclipse(time) {
    if (!this.player || time < (this.nextEclipseCheck ?? 0)) return;
    this.nextEclipseCheck = time + 1000;
    const here = this.zoneDir === ECLIPSE_ZONE;
    const on = this.eclipseOn();
    const falta = this.eclipseChangeIn();
    // el aviso: medio minuto antes
    if (here && !on && falta < AVISO_MS && !this.eclipseWarned) {
      this.eclipseWarned = true;
      audio.sfx('campana');
      bus.emit('social-toast', { text: '🌑 El sol tiembla… Se acerca un eclipse. Si no quieres pelear con lo que trae, busca una fuente de lágrimas.', kind: 'tour' });
    }
    if (on !== this.lastEclipseOn || here !== this.lastEclipseHere) {
      const started = on && this.lastEclipseOn === false;
      const ended = !on && this.lastEclipseOn === true;
      this.lastEclipseOn = on;
      this.lastEclipseHere = here;
      if (!on) this.eclipseWarned = false;
      if (here && started) {
        audio.sfx('trueno_lejos');
        bus.emit('social-toast', { text: '🌑 ¡Eclipse! El Devorador mira las Ruinas: los monstruos salen corrompidos, más fuertes y con más botín. Junto a las fuentes de lágrimas no te alcanza.', kind: 'error' });
      } else if (here && ended) {
        bus.emit('social-toast', { text: '☀️ El eclipse pasó: vuelve la luz del atardecer.', kind: 'tour' });
      }
    }
    bus.emit('eclipse', here ? { activo: on, seguro: on && this.nearTearFountain(), segundos: Math.ceil(falta / 1000) } : null);
  },
};
