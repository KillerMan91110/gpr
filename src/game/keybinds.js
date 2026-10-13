import bus from './bus';

// Atajos de teclado de las ventanas del mundo, cambiables por el jugador (se guardan en este
// navegador). Las teclas del juego en sí no se pueden usar para ventanas.
const STORAGE = 'mundo_teclas_v1';
export const RESERVED = {
  w: 'moverse', a: 'moverse', s: 'moverse', d: 'moverse', e: 'interactuar', t: 'la rueda de emojis', v: 'la piedra de regreso',
  ' ': 'interactuar', enter: 'el chat', escape: 'cerrar ventanas',
  1: 'el combate', 2: 'el combate', 3: 'el combate', 4: 'el combate', 5: 'el combate',
};

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE)) ?? {}; } catch { return {}; }
}

// { idVentana: tecla } con lo que eligió el jugador encima de las teclas por defecto
export function bindings(windows) {
  const custom = load();
  return Object.fromEntries(Object.entries(windows).filter(([, w]) => w.key).map(([id, w]) => [id, custom[id] ?? w.key]));
}

// Cambia la tecla de una ventana; si otra la usaba, intercambian. Devuelve un error en texto o null.
export function setBinding(windows, id, key) {
  const k = key.toLowerCase();
  if (RESERVED[k]) return `La tecla ${k === ' ' ? 'Espacio' : k.toUpperCase()} es para ${RESERVED[k]}.`;
  if (!/^[a-z0-9]$/.test(k)) return 'Usa una letra o un número.';
  const cur = bindings(windows);
  const custom = load();
  const other = Object.keys(cur).find((o) => o !== id && cur[o] === k);
  if (other) custom[other] = cur[id];
  custom[id] = k;
  try { localStorage.setItem(STORAGE, JSON.stringify(custom)); } catch { /* sin guardar */ }
  bus.emit('keybinds-changed');
  return null;
}

export function resetBindings() {
  try { localStorage.removeItem(STORAGE); } catch { /* nada */ }
  bus.emit('keybinds-changed');
}
