import { useEffect, useRef, useState } from 'react';
import './CraftAnim.css';

// Animaciones del taller (art/sprites/combate/crear_crafteo.lua, hechas en Aseprite): la estación
// donde se fabrica (yunque, caldero, olla, fuente del Pilar, mesa) y el efecto del resultado de
// cada unidad (éxito, suerte, fallo). Hojas horizontales de 64x64.
const ASSETS = `${process.env.PUBLIC_URL}/assets/sprites/crafteo`;

// duración (ms) de cada cuadro: la misma que public/assets/sprites/crafteo/crafteo.json
export const CRAFT_SHEETS = {
  yunque: [170, 110, 70, 150, 120, 170],
  caldero: [130, 130, 130, 130, 130, 130],
  olla: [150, 150, 150, 150, 150, 150],
  fuente: [180, 140, 140, 220, 140, 220],
  mesa: [120, 120, 120, 120, 120, 120],
  exito: [60, 60, 70, 80, 80, 90, 90, 110],
  suerte: [70, 70, 80, 80, 90, 90, 110, 140],
  fallo: [70, 80, 90, 100, 110, 120, 130, 150],
};
export const sheetLength = (name) => CRAFT_SHEETS[name].reduce((a, b) => a + b, 0);

// sonido de cada estación en el cuadro en que pasa algo (el martillazo, la burbuja…)
export const STATION_SOUND = {
  yunque: { 2: 'yunque' },
  caldero: { 0: 'burbuja', 3: 'burbuja' },
  olla: { 1: 'hervor', 4: 'hervor' },
  fuente: { 2: 'agua' },
  mesa: { 1: 'serrucho' },
};

// dónde se ve que se fabrica cada receta
export function stationFor(recipe) {
  if (!recipe) return 'yunque';
  if (recipe.station === 'pilar') return 'fuente';
  if (recipe.station === 'forja') return 'yunque';
  const n = (recipe.resultName ?? '').toLowerCase();
  if (/estofado|sopa|guiso|asado/.test(n)) return 'olla';
  if (recipe.resultType === 'CONSUMABLE' && !/vendaje/.test(n)) return 'caldero';
  return 'mesa';
}

// Hoja animada. En bucle (estaciones) o una sola vez (efectos, avisa con onEnd). onFrame(i) se
// llama al entrar a cada cuadro (para los sonidos).
export function CraftSprite({ name, loop = true, onFrame, onEnd, scale = 2, className = '' }) {
  const [frame, setFrame] = useState(0);
  const cb = useRef({ onFrame, onEnd });
  cb.current = { onFrame, onEnd };
  useEffect(() => {
    const durations = CRAFT_SHEETS[name];
    let i = 0;
    let t = null;
    let alive = true;
    setFrame(0);
    const step = () => {
      cb.current.onFrame?.(i);
      t = setTimeout(() => {
        if (!alive) return;
        i += 1;
        if (i >= durations.length) {
          if (!loop) { cb.current.onEnd?.(); return; }
          i = 0;
        }
        setFrame(i);
        step();
      }, durations[i]);
    };
    step();
    return () => { alive = false; clearTimeout(t); };
  }, [name, loop]);
  const size = 64 * scale;
  const n = CRAFT_SHEETS[name].length;
  return (
    <span
      className={`craft-sprite ${className}`.trim()}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${ASSETS}/${name}.png)`,
        backgroundSize: `${size * n}px ${size}px`,
        backgroundPosition: `${-frame * size}px 0`,
      }}
    />
  );
}
