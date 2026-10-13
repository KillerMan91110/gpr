import { useEffect, useRef, useState } from 'react';
import bus from '../../game/bus';
import './WorldMobile.css';

// Controles táctiles del mundo (celular / tablet): un joystick abajo a la izquierda que mueve al
// héroe (WorldScene lee 'touch-move'). El botón de acción (E) ya está en pantalla cuando hay algo
// cerca y se toca como cualquier botón. Solo aparece en pantallas táctiles.
const RADIUS = 46;
export const isTouch = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

export default function TouchControls({ hidden }) {
  const [touch] = useState(isTouch);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const base = useRef(null);
  const pid = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('tactil', touch);
    return () => document.body.classList.remove('tactil');
  }, [touch]);
  // al ocultarse (combate, diálogo) el héroe se queda quieto
  useEffect(() => { if (hidden) bus.emit('touch-move', null); }, [hidden]);
  if (!touch || hidden) return null;

  const move = (e) => {
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS; }
    setKnob({ x: dx, y: dy, on: true });
    bus.emit('touch-move', { x: dx / RADIUS, y: dy / RADIUS });
  };
  const end = () => { pid.current = null; setKnob({ x: 0, y: 0, on: false }); bus.emit('touch-move', null); };

  return (
    <div
      ref={base}
      className={`tc-stick${knob.on ? ' is-on' : ''}`}
      onPointerDown={(e) => { pid.current = e.pointerId; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* puntero sin captura */ } move(e); }}
      onPointerMove={(e) => { if (pid.current === e.pointerId) move(e); }}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Joystick para moverse"
    >
      <span className="tc-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
