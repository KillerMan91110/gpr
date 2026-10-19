// Música y efectos de sonido del mundo, sintetizados con WebAudio (chiptune): no hay archivos
// de audio, todo se genera acá. Un solo motor para el mapa, el combate y las ventanas.
//
//   audio.music('pradera' | 'batalla' | 'jefe' | null)   cambia de tema con fundido
//   audio.jingle('victoria' | 'derrota' | 'nivel')        fanfarria corta (baja la música mientras suena)
//   audio.sfx('golpe' | 'critico' | 'magia' | ...)        efecto puntual
//
// Los navegadores no dejan sonar nada hasta que el jugador interactúa: el contexto se crea con
// el primer clic o tecla y lo que se pidió antes queda pendiente.

const PREFS_KEY = 'etheria_audio';
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return 0;
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};

// ---- temas: cada voz es una lista de pasos (corcheas). "-" silencio, "." mantiene la nota anterior
const bars = (...b) => b.join(' ').split(/\s+/);
const TRACKS = {
  pradera: {
    bpm: 96,
    voices: [
      { wave: 'triangle', gain: 0.16, steps: bars(
        'C3 . . . G2 . . .', 'A2 . . . E3 . . .', 'F2 . . . C3 . . .', 'G2 . . . D3 . . .',
        'C3 . . . G2 . . .', 'F2 . . . C3 . . .', 'G2 . . . D3 . . .', 'C3 . . . G2 . C3 .',
      ) },
      { wave: 'square', gain: 0.025, short: true, steps: bars(
        'C4 E4 G4 E4 C5 G4 E4 G4', 'A3 C4 E4 C4 A4 E4 C4 E4', 'F3 A3 C4 A3 F4 C4 A3 C4', 'G3 B3 D4 B3 G4 D4 B3 D4',
        'C4 E4 G4 E4 C5 G4 E4 G4', 'F3 A3 C4 A3 F4 C4 A3 C4', 'G3 B3 D4 B3 G4 D4 B3 D4', 'C4 E4 G4 E4 C5 - - -',
      ) },
      { wave: 'square', gain: 0.05, steps: bars(
        'E5 . D5 C5 D5 . E5 .', 'C5 . A4 . . . - -', 'A4 . C5 . F5 . E5 D5', 'D5 . . . B4 . G4 .',
        'E5 . G5 . E5 D5 C5 .', 'F5 . E5 D5 C5 . A4 .', 'B4 . C5 D5 G5 . F5 D5', 'C5 . . . - - - -',
      ) },
    ],
  },
  // Aurelia: plaza de mercado, laúd y flauta (sol mayor, compás alegre)
  ciudad: {
    bpm: 108,
    drums: 'k - h - s - h -',
    voices: [
      { wave: 'triangle', gain: 0.15, steps: bars(
        'G2 . . . D3 . . .', 'E2 . . . B2 . . .', 'C3 . . . G2 . . .', 'D3 . . . A2 . D3 .',
        'G2 . . . D3 . . .', 'C3 . . . G2 . . .', 'A2 . . . D3 . . .', 'G2 . D3 . G2 . . .',
      ) },
      { wave: 'square', gain: 0.022, short: true, steps: bars(
        'G3 B3 D4 B3 G4 D4 B3 D4', 'E3 G3 B3 G3 E4 B3 G3 B3', 'C4 E4 G4 E4 C5 G4 E4 G4', 'D4 F#4 A4 F#4 D5 A4 F#4 A4',
        'G3 B3 D4 B3 G4 D4 B3 D4', 'C4 E4 G4 E4 C5 G4 E4 G4', 'A3 C4 E4 C4 D4 F#4 A4 F#4', 'G3 B3 D4 B3 G4 - - -',
      ) },
      { wave: 'triangle', gain: 0.07, steps: bars(
        'D5 . B4 . G4 . B4 D5', 'E5 . D5 B4 G4 . - -', 'E5 . G5 . E5 D5 C5 .', 'D5 . . . A4 . F#4 .',
        'B4 . D5 . G5 . F#5 E5', 'E5 . C5 . G4 . E5 .', 'D5 . C5 B4 A4 . F#4 .', 'G4 . . . - - - -',
      ) },
    ],
  },
  // La Cripta del Vigía: re menor, lento, un bajo que respira y una campana lejana
  cripta: {
    bpm: 66,
    voices: [
      { wave: 'triangle', gain: 0.17, steps: bars(
        'D2 . . . . . . .', 'A1 . . . . . . .', 'A#1 . . . . . . .', 'A1 . . . C2 . . .',
        'D2 . . . . . . .', 'F2 . . . . . . .', 'A#1 . . . G1 . . .', 'A1 . . . . . . .',
      ) },
      { wave: 'sine', gain: 0.05, steps: bars(
        'D4 . . . - - A4 .', '- - - - E4 . . .', 'F4 . . . - - D4 .', 'C#4 . . . - - - -',
        'D4 . . . - - F4 .', 'A4 . . . G4 . F4 .', 'E4 . . . D4 . . .', 'C#4 . . . - - - -',
      ) },
      { wave: 'square', gain: 0.012, short: true, steps: bars(
        'D6 - - - - - - -', '- - - - - - - -', '- - - - A5 - - -', '- - - - - - - -',
        'D6 - - - - - - -', '- - - - - - - -', '- - - - F5 - - -', '- - E5 - - - - -',
      ) },
    ],
  },
  // Montañas Grises: mi menor, lento y grave; un bordón de gaita, un cuerno que llama entre los
  // picos y un tambor de marcha lejano (los enanos del Bastión)
  montanas: {
    bpm: 84,
    drums: 'k - - - s - - -',
    voices: [
      { wave: 'triangle', gain: 0.17, steps: bars(
        'E2 . . . . . . .', 'E2 . . . B1 . . .', 'C2 . . . . . . .', 'D2 . . . B1 . . .',
        'E2 . . . . . . .', 'G2 . . . D2 . . .', 'C2 . . . D2 . . .', 'E2 . . . . . . .',
      ) },
      { wave: 'square', gain: 0.018, short: true, steps: bars(
        'E3 B3 E4 B3 E3 B3 E4 B3', 'E3 B3 E4 B3 B2 F#3 B3 F#3', 'C3 G3 C4 G3 C3 G3 C4 G3', 'D3 A3 D4 A3 B2 F#3 B3 F#3',
        'E3 B3 E4 B3 E3 B3 E4 B3', 'G3 D4 G4 D4 D3 A3 D4 A3', 'C3 G3 C4 G3 D3 A3 D4 A3', 'E3 B3 E4 B3 E4 - - -',
      ) },
      { wave: 'triangle', gain: 0.08, steps: bars(
        'B4 . . . E5 . . .', 'D5 . B4 . A4 . G4 .', 'G4 . . . E4 . G4 .', 'A4 . . . F#4 . . .',
        'B4 . . . E5 . G5 .', 'F#5 . E5 . D5 . B4 .', 'C5 . B4 . A4 . F#4 .', 'E4 . . . - - - -',
      ) },
    ],
  },
  // Volcán Rojo: mi frigio (el fa natural le da el aire de fuego y desierto), tambores pesados de la
  // forja de Ascuaria y un bajo que golpea como un martillo
  volcan: {
    bpm: 100,
    drums: 'k - k s - k s -',
    voices: [
      { wave: 'sawtooth', gain: 0.06, short: true, steps: bars(
        'E2 E2 - E2 F2 - E2 -', 'E2 E2 - E2 G2 - F2 -', 'D2 D2 - D2 E2 - D2 -', 'C2 C2 - C2 D2 - E2 -',
        'E2 E2 - E2 F2 - E2 -', 'E2 E2 - E2 G2 - F2 -', 'A1 A1 - A1 C2 - B1 -', 'E2 . . . F2 . E2 .',
      ) },
      { wave: 'square', gain: 0.045, steps: bars(
        'E4 . F4 . G#4 . . .', 'A4 . G#4 F4 E4 . . .', 'D4 . E4 . F4 . E4 D4', 'C4 . . . E4 . . .',
        'B4 . C5 . B4 . G#4 .', 'A4 . B4 A4 G#4 . F4 .', 'E4 . F4 . E4 . D4 .', 'E4 . . . - - - -',
      ) },
      { wave: 'triangle', gain: 0.06, steps: bars(
        'B3 . . . . . . .', 'C4 . . . B3 . . .', 'A3 . . . . . . .', 'G3 . . . G#3 . . .',
        'B3 . . . . . . .', 'C4 . . . B3 . . .', 'C4 . . . D4 . . .', 'B3 . . . . . . .',
      ) },
    ],
  },
  // Costas Muertas: re dórico en seis por ocho (un vals de taberna de puerto): el bajo sube y baja
  // como las olas, un acordeón de fondo y una flauta de marinero
  costas: {
    bpm: 112,
    drums: 'k - - s - -',
    voices: [
      { wave: 'triangle', gain: 0.16, steps: bars(
        'D2 . . A2 . .', 'C2 . . G2 . .', 'D2 . . A2 . .', 'F2 . . C3 . .',
        'D2 . . A2 . .', 'C2 . . G2 . .', 'A#1 . . F2 . .', 'A1 . . E2 . .',
      ) },
      { wave: 'square', gain: 0.02, short: true, steps: bars(
        'D3 F3 A3 F3 A3 F3', 'C3 E3 G3 E3 G3 E3', 'D3 F3 A3 F3 A3 F3', 'F3 A3 C4 A3 C4 A3',
        'D3 F3 A3 F3 A3 F3', 'C3 E3 G3 E3 G3 E3', 'A#2 D3 F3 D3 F3 D3', 'A2 C#3 E3 C#3 E3 C#3',
      ) },
      { wave: 'triangle', gain: 0.07, steps: bars(
        'A4 . . D5 . E5', 'F5 . E5 D5 . C5', 'D5 . . A4 . .', 'C5 . . A4 . .',
        'A4 . B4 C5 . D5', 'E5 . . G5 . E5', 'D5 . C5 A#4 . A4', 'A4 . . - - -',
      ) },
    ],
  },
  // el Arrecife Hundido: fa sostenido menor, muy lento y con eco, como cantado debajo del agua; una
  // caracola que llama de lejos
  arrecife: {
    bpm: 60,
    voices: [
      { wave: 'sine', gain: 0.17, steps: bars(
        'F#2 . . . . . . .', 'D2 . . . . . . .', 'E2 . . . . . . .', 'C#2 . . . . . . .',
        'F#2 . . . . . . .', 'A2 . . . . . . .', 'D2 . . . E2 . . .', 'C#2 . . . . . . .',
      ) },
      { wave: 'triangle', gain: 0.05, steps: bars(
        'C#4 . . . A4 . . .', 'F#4 . . . - - - -', 'G#4 . . . E4 . . .', 'F4 . . . - - - -',
        'C#4 . . . F#4 . A4 .', 'C#5 . . . B4 . A4 .', 'F#4 . . . G#4 . . .', 'F4 . . . - - - -',
      ) },
      { wave: 'sine', gain: 0.02, short: true, steps: bars(
        'F#5 - - C#6 - - - -', '- - A5 - - - - -', '- - - - G#5 - - -', '- - F5 - - - - -',
        'F#5 - - C#6 - - - -', '- - E6 - - - - -', '- - - - A5 - - -', '- - G#5 - - - - -',
      ) },
    ],
  },
  // la Tundra Eterna: re menor, lento y ancho; un tambor de piel cada dos tiempos, cuernos norteños en
  // quintas y un viento agudo que va y viene
  tundra: {
    bpm: 76,
    drums: 'k - - - s - - -',
    voices: [
      { wave: 'triangle', gain: 0.15, steps: bars(
        'D2 . . . . . . .', 'D2 . . . A1 . . .', 'A#1 . . . . . . .', 'C2 . . . . . . .',
        'D2 . . . . . . .', 'F2 . . . C2 . . .', 'A#1 . . . C2 . . .', 'D2 . . . . . . .',
      ) },
      { wave: 'sawtooth', gain: 0.035, steps: bars(
        'D3 . . . A3 . . .', 'F3 . . . E3 . D3 .', 'D3 . . . F3 . . .', 'E3 . . . - - - -',
        'A3 . . . D4 . . .', 'C4 . . . A3 . . .', 'A#3 . . . G3 . . .', 'A3 . . . - - - -',
      ) },
      { wave: 'sine', gain: 0.02, short: true, steps: bars(
        '- - - - A5 - - -', '- - D6 - - - - -', '- - - - F5 - - -', '- - E6 - - - - -',
        '- - - - A5 - - -', '- - F6 - - - - -', '- - - - D6 - - -', '- - C#6 - - - - -',
      ) },
    ],
  },
  // la Cripta Congelada: mi menor, lento, una caja de música que toca la canción de cuna de la reina
  // sobre un bajo frío que casi no se mueve
  cripta_congelada: {
    bpm: 66,
    voices: [
      { wave: 'sine', gain: 0.16, steps: bars(
        'E2 . . . . . . .', 'C2 . . . . . . .', 'A1 . . . . . . .', 'B1 . . . . . . .',
        'E2 . . . . . . .', 'G2 . . . . . . .', 'C2 . . . D2 . . .', 'B1 . . . . . . .',
      ) },
      { wave: 'triangle', gain: 0.06, steps: bars(
        'B4 . G4 . E4 . G4 .', 'C5 . . . G4 . . .', 'A4 . C5 . E5 . C5 .', 'B4 . . . D#5 . . .',
        'E5 . D5 . B4 . G4 .', 'D5 . . . B4 . . .', 'C5 . B4 . A4 . F#4 .', 'E4 . . . - - - -',
      ) },
      { wave: 'sine', gain: 0.025, short: true, steps: bars(
        'E6 - - B5 - - - -', '- - G5 - - - - -', '- - - - E6 - - -', '- - F#5 - - - - -',
        'G6 - - E6 - - - -', '- - D6 - - - - -', '- - - - C6 - - -', '- - B5 - - - - -',
      ) },
    ],
  },
  batalla: {
    bpm: 150,
    drums: 'k h s h k k s h',
    voices: [
      { wave: 'sawtooth', gain: 0.07, short: true, steps: bars(
        'A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 G#2 B2',
        'A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E3 E2 E3 E2',
      ) },
      { wave: 'square', gain: 0.055, steps: bars(
        'A4 . C5 . E5 . D5 C5', 'F5 . E5 . C5 . A4 .', 'G4 . B4 . D5 . C5 B4', 'G#4 . . . E4 . . .',
        'A4 . C5 E5 A5 . G5 E5', 'F5 . A5 . G5 F5 E5 D5', 'D5 . B4 . G4 . B4 D5', 'E5 . . . G#5 . B5 .',
      ) },
      { wave: 'triangle', gain: 0.05, steps: bars(
        'E4 . . . A4 . . .', 'C5 . . . A4 . . .', 'D5 . . . B4 . . .', 'B4 . . . G#4 . . .',
        'E4 . . . A4 . . .', 'C5 . . . A4 . . .', 'B4 . . . G4 . . .', 'G#4 . . . B4 . . .',
      ) },
    ],
  },
  jefe: {
    bpm: 164,
    drums: 'k k s h k k s s',
    voices: [
      { wave: 'sawtooth', gain: 0.08, short: true, steps: bars(
        'D2 D2 D3 D2 D2 D3 D2 D3', 'A#1 A#1 A#2 A#1 A#1 A#2 A#1 A#2', 'C2 C2 C3 C2 C2 C3 C2 C3', 'A1 A1 A2 A1 A2 A1 C#3 E3',
      ) },
      { wave: 'square', gain: 0.055, steps: bars(
        'D5 . . F5 E5 . D5 .', 'A#4 . . D5 C5 . A#4 A4', 'C5 . E5 . G5 . F5 E5', 'C#5 . . . A4 . E5 .',
        'D5 . F5 A5 D6 . C6 A5', 'A#5 . A5 G5 F5 . D5 .', 'E5 . G5 . C6 . A#5 G5', 'A5 . . . C#6 . E6 .',
      ) },
      { wave: 'square', gain: 0.02, short: true, steps: bars(
        'D4 F4 A4 F4 D4 F4 A4 F4', 'A#3 D4 F4 D4 A#3 D4 F4 D4', 'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C#4 E4 C#4 A3 C#4 E4 C#4',
      ) },
    ],
  },
};

const JINGLES = {
  victoria: { bpm: 180, voices: [
    { wave: 'square', gain: 0.07, steps: bars('C5 E5 G5 C6 . . G5 . C6 . . . . . . .') },
    { wave: 'triangle', gain: 0.12, steps: bars('C3 . . . . . G3 . C4 . . . . . . .') },
  ] },
  derrota: { bpm: 90, voices: [
    { wave: 'triangle', gain: 0.1, steps: bars('A4 . G4 . F4 . E4 . . . . .') },
    { wave: 'square', gain: 0.03, steps: bars('A3 . . . F3 . . . E3 . . .') },
  ] },
  nivel: { bpm: 240, voices: [
    { wave: 'square', gain: 0.06, steps: bars('C5 E5 G5 C6 E6 G6 C7 . . . . .') },
    { wave: 'triangle', gain: 0.1, steps: bars('C4 . G4 . C5 . E5 . G5 . . .') },
  ] },
  mision: { bpm: 200, voices: [
    { wave: 'square', gain: 0.05, steps: bars('G5 . C6 . E6 . . .') },
  ] },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.prefs = { music: 0.6, sfx: 0.8, muted: false };
    try { Object.assign(this.prefs, JSON.parse(localStorage.getItem(PREFS_KEY)) || {}); } catch { /* sin preferencias */ }
    this.track = null;
    this.wanted = null;
    this.timer = null;
    this.listeners = new Set();
    if (typeof window !== 'undefined') {
      const unlock = () => this.unlock();
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    // ruido blanco reutilizable para golpes y percusión
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyPrefs();
    if (this.wanted) { const t = this.wanted; this.wanted = null; this.music(t); }
  }

  // ---- preferencias (volúmenes y silencio), compartidas con el control del HUD
  setPrefs(p) {
    Object.assign(this.prefs, p);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch { /* storage no disponible */ }
    this.applyPrefs();
    this.listeners.forEach((fn) => fn(this.prefs));
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  applyPrefs() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.prefs.muted ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.prefs.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx, t, 0.05);
  }

  // ---- notas
  tone(f, start, dur, { wave = 'square', gain = 0.1, out, attack = 0.005, release = 0.06, slide } = {}) {
    if (!f) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(f, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), start + dur);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.setValueAtTime(gain, Math.max(start + attack, start + dur - release));
    g.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(g).connect(out ?? this.sfxBus);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  burst(start, dur, { gain = 0.2, filter = 'bandpass', from = 2000, to, q = 1, out } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    // el ruido dura 1 s: los sonidos largos (el retumbo del trueno) lo repiten
    src.loop = dur > 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(from, start);
    if (to) f.frequency.exponentialRampToValueAtTime(to, start + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(f).connect(g).connect(out ?? this.sfxBus);
    src.start(start, Math.random() * 0.5);
    src.stop(start + dur + 0.02);
  }

  drum(kind, t, out) {
    if (kind === 'k') this.tone(140, t, 0.16, { wave: 'sine', gain: 0.35, slide: 40, out });
    else if (kind === 's') this.burst(t, 0.12, { gain: 0.16, filter: 'highpass', from: 1500, out });
    else if (kind === 'h') this.burst(t, 0.04, { gain: 0.06, filter: 'highpass', from: 7000, out });
  }

  // ---- música: secuenciador con planificación anticipada
  music(name) {
    if (!this.ctx) { this.wanted = name; return; }
    if (this.track?.name === name) return;
    const prev = this.track;
    if (prev) {
      prev.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      setTimeout(() => prev.gain.disconnect(), 1500);
    }
    this.track = null;
    clearInterval(this.timer);
    if (!name || !TRACKS[name]) return;
    const def = TRACKS[name];
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.musicBus);
    gain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4);
    const length = Math.max(...def.voices.map((v) => v.steps.length));
    this.track = { name, def, gain, step: 0, next: this.ctx.currentTime + 0.1, length };
    this.timer = setInterval(() => this.schedule(), 30);
  }

  schedule() {
    const tr = this.track;
    if (!tr) return;
    const stepDur = 60 / tr.def.bpm / 2;
    while (tr.next < this.ctx.currentTime + 0.15) {
      this.playStep(tr.def, tr.step, tr.next, stepDur, tr.gain);
      tr.step = (tr.step + 1) % tr.length;
      tr.next += stepDur;
    }
  }

  playStep(def, step, t, stepDur, out) {
    for (const v of def.voices) {
      const note = v.steps[step % v.steps.length];
      if (!note || note === '-' || note === '.') continue;
      // cuánto dura: hasta la próxima nota o silencio
      let n = 1;
      if (!v.short) while (v.steps[(step + n) % v.steps.length] === '.' && n < 16) n++;
      this.tone(freq(note), t, stepDur * n * (v.short ? 0.8 : 0.95), { wave: v.wave, gain: v.gain, out });
    }
    if (def.drums) {
      const pat = def.drums.split(' ');
      const d = pat[step % pat.length];
      if (d && d !== '-') this.drum(d, t, out);
    }
  }

  jingle(name) {
    if (!this.ctx || !JINGLES[name]) return;
    const def = JINGLES[name];
    const stepDur = 60 / def.bpm / 2;
    const length = Math.max(...def.voices.map((v) => v.steps.length));
    const t0 = this.ctx.currentTime + 0.05;
    // baja la música mientras suena la fanfarria
    if (this.track) {
      const g = this.track.gain.gain;
      g.setTargetAtTime(0.15, t0, 0.05);
      g.setTargetAtTime(1, t0 + length * stepDur + 0.4, 0.5);
    }
    for (let s = 0; s < length; s++) this.playStep(def, s, t0 + s * stepDur, stepDur, this.sfxBus);
  }

  // ---- efectos
  sfx(name) {
    if (!this.ctx || this.prefs.muted) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'trueno':
        // el rayo: chasquido seco y después el retumbo largo y grave de la montaña
        this.burst(t, 0.12, { gain: 0.45, from: 5000, to: 900, q: 1 });
        this.burst(t + 0.08, 1.6, { gain: 0.32, filter: 'lowpass', from: 420, to: 60, q: 0.7 });
        this.tone(55, t + 0.05, 1.2, { wave: 'sine', gain: 0.25, slide: 30 });
        break;
      case 'brasa':
        // la piedra ardiente que revienta contra el suelo: golpe sordo y chisporroteo
        this.burst(t, 0.5, { gain: 0.3, filter: 'lowpass', from: 900, to: 80, q: 0.8 });
        this.tone(70, t, 0.35, { wave: 'sine', gain: 0.28, slide: 35 });
        this.burst(t + 0.06, 0.3, { gain: 0.08, filter: 'bandpass', from: 3500, to: 1800, q: 2 });
        break;
      case 'ola':
        // la marea: una ola larga que sube y rompe
        this.burst(t, 1.4, { gain: 0.16, filter: 'lowpass', from: 300, to: 1400, q: 0.6 });
        this.burst(t + 1, 1.2, { gain: 0.12, filter: 'bandpass', from: 2000, to: 400, q: 0.8 });
        break;
      case 'campana':
        // la campana del puerto avisa que cambia la marea
        for (let i = 0; i < 2; i++) {
          this.tone(660, t + i * 0.7, 1.1, { wave: 'sine', gain: 0.1, release: 0.9 });
          this.tone(1320, t + i * 0.7, 0.6, { wave: 'sine', gain: 0.03, release: 0.5 });
        }
        break;
      case 'trueno_lejos':
        this.burst(t, 2.2, { gain: 0.14, filter: 'lowpass', from: 260, to: 50, q: 0.7 });
        break;
      case 'golpe':
        this.burst(t, 0.09, { gain: 0.3, from: 1200, to: 300, q: 2 });
        this.tone(160, t, 0.1, { wave: 'sine', gain: 0.3, slide: 60 });
        break;
      case 'critico':
        this.burst(t, 0.14, { gain: 0.35, from: 2000, to: 300, q: 2 });
        this.tone(180, t, 0.14, { wave: 'sine', gain: 0.35, slide: 50 });
        this.tone(1760, t + 0.03, 0.12, { wave: 'square', gain: 0.05 });
        break;
      case 'esquiva':
        this.burst(t, 0.18, { gain: 0.12, filter: 'bandpass', from: 600, to: 3000, q: 3 });
        break;
      case 'magia':
        this.tone(330, t, 0.35, { wave: 'sine', gain: 0.12, slide: 1320 });
        this.tone(660, t + 0.05, 0.3, { wave: 'triangle', gain: 0.06, slide: 1760 });
        break;
      case 'impacto_magico':
        this.burst(t, 0.25, { gain: 0.22, filter: 'lowpass', from: 3000, to: 200 });
        this.tone(880, t, 0.2, { wave: 'triangle', gain: 0.07, slide: 220 });
        break;
      case 'curar':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(freq(n), t + i * 0.06, 0.25, { wave: 'sine', gain: 0.08 }));
        break;
      case 'monedas':
        [0, 0.07, 0.15].forEach((d, i) => this.tone(freq(['E6', 'G6', 'C7'][i]), t + d, 0.12, { wave: 'square', gain: 0.035 }));
        break;
      case 'ofrenda':
        // moneda que cae al agua y la bendición que sube
        this.tone(freq('A6'), t, 0.08, { wave: 'square', gain: 0.04 });
        this.burst(t + 0.12, 0.3, { gain: 0.08, filter: 'lowpass', from: 1800, to: 300 });
        ['C5', 'E5', 'G5', 'B5', 'E6'].forEach((n, i) => this.tone(freq(n), t + 0.35 + i * 0.08, 0.5, { wave: 'sine', gain: 0.06 }));
        break;
      case 'piedra':
        // la piedra de regreso empieza a vibrar: un zumbido grave que sube
        this.tone(110, t, 1.2, { wave: 'sine', gain: 0.12, slide: 220 });
        this.tone(freq('E5'), t + 0.2, 0.9, { wave: 'triangle', gain: 0.04, slide: freq('E6') });
        break;
      case 'vinculo':
        // llegada junto a la estatua (o vincular la piedra): campanas de agua
        this.burst(t, 0.35, { gain: 0.1, filter: 'bandpass', from: 3000, to: 600, q: 1.5 });
        ['E5', 'B5', 'E6', 'G#6', 'B6'].forEach((n, i) => this.tone(freq(n), t + 0.1 + i * 0.07, 0.6, { wave: 'sine', gain: 0.06 }));
        break;
      case 'mejora':
        ['G4', 'C5', 'E5', 'G5'].forEach((n, i) => this.tone(freq(n), t + i * 0.05, 0.18, { wave: 'triangle', gain: 0.08 }));
        break;
      case 'penalizacion':
        ['E5', 'C5', 'A4', 'F4'].forEach((n, i) => this.tone(freq(n), t + i * 0.06, 0.18, { wave: 'square', gain: 0.04 }));
        break;
      case 'veneno':
        for (let i = 0; i < 3; i++) this.tone(300 + Math.random() * 200, t + i * 0.07, 0.06, { wave: 'sine', gain: 0.08, slide: 700 });
        break;
      case 'romper':
        this.burst(t, 0.4, { gain: 0.35, filter: 'highpass', from: 2500 });
        [2637, 2093, 1568, 1319, 988].forEach((f, i) => this.tone(f, t + i * 0.04, 0.2, { wave: 'square', gain: 0.04 }));
        this.tone(110, t, 0.3, { wave: 'sine', gain: 0.3, slide: 40 });
        break;
      case 'morir':
        this.tone(220, t, 0.4, { wave: 'square', gain: 0.06, slide: 55 });
        this.burst(t + 0.05, 0.3, { gain: 0.15, filter: 'lowpass', from: 1500, to: 100 });
        break;
      case 'encuentro':
        this.tone(220, t, 0.3, { wave: 'sawtooth', gain: 0.06, slide: 880 });
        this.burst(t + 0.1, 0.3, { gain: 0.15, filter: 'bandpass', from: 500, to: 4000, q: 2 });
        break;
      case 'moneda':
        this.tone(freq('B5'), t, 0.07, { wave: 'square', gain: 0.06 });
        this.tone(freq('E6'), t + 0.07, 0.2, { wave: 'square', gain: 0.06 });
        break;
      case 'recoger':
        this.tone(freq('A5'), t, 0.08, { wave: 'triangle', gain: 0.1 });
        this.tone(freq('E6'), t + 0.06, 0.15, { wave: 'sine', gain: 0.08 });
        break;
      case 'cofre':
        this.tone(90, t, 0.3, { wave: 'sawtooth', gain: 0.05, slide: 140 });
        ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(freq(n), t + 0.3 + i * 0.05, 0.15, { wave: 'square', gain: 0.04 }));
        break;
      case 'abrir':
        this.burst(t, 0.12, { gain: 0.08, filter: 'bandpass', from: 800, to: 2400, q: 1.5 });
        break;
      // aviso suave (invitaciones, misiones compartidas, alguien te busca)
      // el «tin» de descubrir o aprender un crafteo: dos campanitas agudas
      case 'descubrir':
        this.tone(freq('E6'), t, 0.35, { wave: 'sine', gain: 0.1 });
        this.tone(freq('B6'), t + 0.07, 0.5, { wave: 'sine', gain: 0.08 });
        this.tone(freq('E7'), t + 0.07, 0.3, { wave: 'triangle', gain: 0.025 });
        break;
      case 'mision':
        ['G5', 'C6', 'E6'].forEach((n, i) => this.tone(freq(n), t + i * 0.09, 0.22, { wave: 'triangle', gain: 0.07 }));
        break;
      case 'cerrar':
        this.burst(t, 0.1, { gain: 0.07, filter: 'bandpass', from: 2400, to: 700, q: 1.5 });
        break;
      case 'clic':
        this.tone(1200, t, 0.03, { wave: 'square', gain: 0.03 });
        break;
      case 'texto':
        this.tone(600 + Math.random() * 120, t, 0.025, { wave: 'square', gain: 0.018 });
        break;
      case 'error':
        this.tone(140, t, 0.18, { wave: 'square', gain: 0.06 });
        break;
      case 'pasos':
        this.burst(t, 0.03, { gain: 0.03, filter: 'lowpass', from: 600 });
        break;
      // ---- taller (crafteo uno por uno, ver components/world/CraftAnim.js)
      case 'yunque':
        // martillazo: golpe seco y el "tiiin" metálico del yunque
        this.burst(t, 0.05, { gain: 0.2, filter: 'highpass', from: 1800 });
        this.tone(freq('E6'), t, 0.25, { wave: 'square', gain: 0.035 });
        this.tone(freq('B6'), t + 0.01, 0.35, { wave: 'sine', gain: 0.05 });
        break;
      case 'burbuja':
        for (let i = 0; i < 2; i++) this.tone(260 + Math.random() * 180, t + i * 0.09, 0.07, { wave: 'sine', gain: 0.07, slide: 900 });
        break;
      case 'hervor':
        this.burst(t, 0.3, { gain: 0.06, filter: 'lowpass', from: 700, to: 300 });
        this.tone(200 + Math.random() * 80, t + 0.1, 0.06, { wave: 'sine', gain: 0.05, slide: 600 });
        break;
      case 'agua':
        // el frasco entra al agua del Pilar
        this.burst(t, 0.35, { gain: 0.1, filter: 'bandpass', from: 1600, to: 500, q: 1.2 });
        for (let i = 0; i < 3; i++) this.tone(400 + Math.random() * 300, t + 0.08 + i * 0.07, 0.06, { wave: 'sine', gain: 0.06, slide: 1200 });
        break;
      case 'serrucho':
        this.burst(t, 0.12, { gain: 0.06, filter: 'bandpass', from: 2400, to: 3200, q: 4 });
        this.burst(t + 0.16, 0.12, { gain: 0.06, filter: 'bandpass', from: 3200, to: 2400, q: 4 });
        break;
      case 'craft_ok':
        // salió bien: arpegio alegre que sube y un brillito
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(freq(n), t + i * 0.07, 0.22, { wave: 'triangle', gain: 0.09 }));
        this.tone(freq('E7'), t + 0.3, 0.12, { wave: 'square', gain: 0.025 });
        break;
      case 'craft_suerte':
        // salió de mejor rareza: fanfarria más larga con destellos
        ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => this.tone(freq(n), t + i * 0.07, 0.3, { wave: 'square', gain: 0.045 }));
        this.tone(freq('C4'), t, 0.5, { wave: 'triangle', gain: 0.12 });
        this.tone(freq('G4'), t + 0.25, 0.5, { wave: 'triangle', gain: 0.12 });
        [0.45, 0.55, 0.62, 0.7].forEach((d, i) => this.tone(freq(['C7', 'E7', 'G7', 'C8'][i]), t + d, 0.1, { wave: 'sine', gain: 0.05 }));
        break;
      case 'craft_fallo':
        // falló: "pfff" de humo y un "wa-waaa" triste que baja
        this.burst(t, 0.3, { gain: 0.12, filter: 'lowpass', from: 1200, to: 150 });
        this.tone(freq('G4'), t + 0.15, 0.22, { wave: 'square', gain: 0.05, slide: freq('F#4') });
        this.tone(freq('F#4'), t + 0.4, 0.5, { wave: 'square', gain: 0.05, slide: freq('C4') });
        break;
      default:
    }
  }
}

const audio = new AudioEngine();
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') window.etheriaAudio = audio;
export default audio;
