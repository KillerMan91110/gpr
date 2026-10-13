import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './WorldPanels.css';
import './WorldWindows.css';

const STORAGE_PREFIX = 'mundo_panel_';
// mismo corte que WorldMobile.css: por debajo, las ventanas van a todo el ancho
const NARROW = 760;

function loadPos(id, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + id));
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch { /* sin posición guardada */ }
  return fallback;
}

// Ventana flotante del mundo que NO bloquea el mapa (como la mochila o la ficha en un MMO):
// se puede seguir caminando con ella abierta y se mueve arrastrando la barra de título.
// La posición se recuerda en este navegador.
export default function FloatingPanel({ id, title, icon, defaultPos, width, onClose, children, footer, zIndex, onActivate, className = '' }) {
  const [pos, setPos] = useState(() => loadPos(id, defaultPos));
  const drag = useRef(null);
  const ref = useRef(null);

  // que la ventana nunca quede fuera de la pantalla (posición guardada en otra resolución,
  // pantalla pequeña o ventana del navegador achicada)
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      // en pantallas angostas la ventana ocupa el ancho (WorldMobile.css): no se toca ni se guarda
      if (!el || window.innerWidth <= NARROW) return;
      const maxX = Math.max(0, window.innerWidth - el.offsetWidth - 8);
      const maxY = Math.max(0, window.innerHeight - Math.min(el.offsetHeight, window.innerHeight) - 8);
      setPos((p) => {
        const x = Math.min(Math.max(0, p.x), maxX);
        const y = Math.min(Math.max(0, p.y), maxY);
        return x === p.x && y === p.y ? p : { x, y };
      });
    };
    fit();
    window.addEventListener('resize', fit);
    // si el contenido crece (otra pestaña, una lista que carga), que siga entrando en pantalla
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro && ref.current) ro.observe(ref.current);
    return () => { window.removeEventListener('resize', fit); ro?.disconnect(); };
  }, []);

  useEffect(() => {
    if (window.innerWidth <= NARROW) return;
    try { localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(pos)); } catch { /* storage no disponible */ }
  }, [id, pos]);

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const x = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.current.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.current.dy));
    setPos({ x, y });
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <section
      ref={ref}
      className={`wp-panel ${className}`.trim()}
      style={{ left: pos.x, top: pos.y, width, zIndex }}
      aria-label={title}
      onPointerDownCapture={onActivate}
    >
      <header
        className="wp-panel-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {icon && <span className="wp-panel-icon">{icon}</span>}
        <h2>{title}</h2>
        <button type="button" className="wp-panel-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </header>
      <div className="wp-panel-body">{children}</div>
      {footer && <footer className="wp-panel-foot">{footer}</footer>}
    </section>
  );
}
