import { useEffect, useRef, useState } from 'react';
import GameIcon from './GameIcon';
import audio from '../game/audio';
import './LogroBanner.css';

// cuánto queda cada aviso: 5 segundos, o 3 si hay más esperando (así una tanda de logros no tapa la pantalla)
const SHOW_MS = 5000;
const SHOW_MS_COLA = 3000;

// Aviso de logro ganado (gprback/lib/logros.js), en cualquier pantalla: cualquier respuesta del servidor
// que traiga logros nuevos los anuncia (api/client.js, evento 'etheria-logros'). Si llegan varios juntos,
// salen de a uno, más rápido.
export default function LogroBanner() {
  const [cola, setCola] = useState([]);
  const timer = useRef(null);
  const enCola = useRef(0);
  enCola.current = cola.length;

  useEffect(() => {
    const onLogros = (e) => setCola((c) => [...c, ...(e.detail ?? [])]);
    window.addEventListener('etheria-logros', onLogros);
    return () => window.removeEventListener('etheria-logros', onLogros);
  }, []);

  const actual = cola[0];
  useEffect(() => {
    if (!actual) return undefined;
    audio.sfx('mision');
    timer.current = setTimeout(() => setCola((c) => c.slice(1)), enCola.current > 1 ? SHOW_MS_COLA : SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [actual]);

  if (!actual) return null;
  return (
    // clic: se cierran todos los avisos que esperaban (los logros igual quedan en la ventana de Logros)
    <button type="button" className="logro-banner" onClick={() => setCola([])} title="Cerrar">
      <span className="logro-banner-medal"><GameIcon name="star-medal" artist="delapouite" /></span>
      <span className="logro-banner-body">
        <small>¡Logro!{actual.puntos ? ` · +${actual.puntos} de Gesta` : ''}</small>
        <strong>{actual.name}</strong>
        <em>«{actual.lore}»</em>
        {actual.bono && <span className="logro-banner-bono">Título: {actual.bono}</span>}
      </span>
    </button>
  );
}
