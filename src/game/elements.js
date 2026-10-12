// Los 9 elementos de Etheria (tabla `elements` del back) con su color e ícono. El mismo color se
// usa en el HUD (debilidades, habilidades) y en la escena de combate (golpes, números, partículas).
// Salen de las variables --element-* de App.css; Tierra y Oscuridad van un poco más claras para
// que se lean sobre los paneles oscuros y sobre el fondo del combate.
export const ELEMENTS = {
  FIRE:      { name: 'Fuego',     color: '#e8622c', hex: 0xe8622c, light: 0xffc06a, icon: ['fire', 'sbed'] },
  ICE:       { name: 'Hielo',     color: '#7fd8e8', hex: 0x7fd8e8, light: 0xe6fbff, icon: ['snowflake-1', 'lorc'] },
  LIGHTNING: { name: 'Rayo',      color: '#e8d84a', hex: 0xe8d84a, light: 0xffffc0, icon: ['lightning-arc', 'lorc'] },
  WIND:      { name: 'Viento',    color: '#8fdb8f', hex: 0x8fdb8f, light: 0xe0ffe0, icon: ['tornado', 'lorc'] },
  EARTH:     { name: 'Tierra',    color: '#b0884a', hex: 0xb0884a, light: 0xe0c48a, icon: ['stone-pile', 'delapouite'] },
  WATER:     { name: 'Agua',      color: '#4fa0e0', hex: 0x4fa0e0, light: 0xbfe2ff, icon: ['water-drop', 'sbed'] },
  LIGHT:     { name: 'Luz',       color: '#f0d878', hex: 0xf0d878, light: 0xffffff, icon: ['sun', 'lorc'] },
  DARK:      { name: 'Oscuridad', color: '#8a6ac0', hex: 0x8a6ac0, light: 0xd6b8ff, icon: ['evil-moon', 'lorc'] },
  COSMIC:    { name: 'Cósmico',   color: '#b572e0', hex: 0xb572e0, light: 0xf0d0ff, icon: ['galaxy', 'delapouite'] },
};

export const ELEMENT_ORDER = ['FIRE', 'ICE', 'LIGHTNING', 'WIND', 'EARTH', 'WATER', 'LIGHT', 'DARK', 'COSMIC'];

// Debilidades (resistencia < 0) y resistencias (> 0) de un monstruo, de mayor a menor efecto
export function splitResistances(resistances = {}) {
  const entries = Object.entries(resistances).filter(([code]) => ELEMENTS[code]);
  return {
    weak: entries.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).map(([code, v]) => ({ code, value: v })),
    strong: entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([code, v]) => ({ code, value: v })),
  };
}
