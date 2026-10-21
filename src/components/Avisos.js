import { createPortal } from 'react-dom';
import './Avisos.css';

// Una sola columna para los avisos que aparecen arriba de la pantalla (logro ganado, avisos del mundo…),
// así nunca se pisan entre sí: cada uno se dibuja dentro de la misma columna (portal) y se apilan en el
// orden de `orden` (el logro va primero).
let host = null;
function columna() {
  if (!host) {
    host = document.createElement('div');
    host.className = 'avisos';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

export default function Aviso({ orden = 0, children }) {
  return createPortal(<div className="avisos-item" style={{ order: orden }}>{children}</div>, columna());
}
