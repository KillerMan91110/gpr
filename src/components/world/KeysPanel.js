import { useEffect, useState } from 'react';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { bindings, resetBindings, setBinding } from '../../game/keybinds';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import './MarketPanel.css';

// Atajos de teclado: cambiar con qué tecla se abre cada ventana del mundo
export default function KeysPanel({ windows, ...props }) {
  const [map, setMap] = useState(() => bindings(windows));
  const [waiting, setWaiting] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const onChange = () => setMap(bindings(windows));
    bus.on('keybinds-changed', onChange);
    return () => bus.off('keybinds-changed', onChange);
  }, [windows]);

  // esperando la tecla nueva: se la come antes que el mapa y que los atajos
  useEffect(() => {
    if (!waiting) return undefined;
    const onKey = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { setWaiting(null); return; }
      const error = setBinding(windows, waiting, e.key);
      if (error) { setMsg({ text: error, ok: false }); audio.sfx('error'); return; }
      setMsg({ text: `${windows[waiting].title}: ahora se abre con ${e.key.toUpperCase()}.`, ok: true });
      audio.sfx('clic');
      setWaiting(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [waiting, windows]);

  return (
    <FloatingPanel
      {...props}
      id="teclas"
      title="Atajos de teclado"
      icon={<GameIcon name="keyboard" artist="delapouite" />}
      width={420}
      footer={(
        <>
          <span className={`wp-bag-msg${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>{msg?.text ?? 'Clic en una tecla para cambiarla'}</span>
          <button type="button" className="wp-btn" onClick={() => { resetBindings(); setMsg({ text: 'Teclas por defecto.', ok: true }); }}>Restablecer</button>
        </>
      )}
    >
      <div className="kb-list">
        {Object.entries(map).map(([id, key]) => (
          <div key={id} className="kb-row">
            <GameIcon name={windows[id].icon[0]} artist={windows[id].icon[1]} />
            <span>{windows[id].title}</span>
            <button type="button" className={`kb-key${waiting === id ? ' is-waiting' : ''}`} onClick={() => setWaiting(waiting === id ? null : id)}>
              {waiting === id ? 'Pulsa una tecla…' : key.toUpperCase()}
            </button>
          </div>
        ))}
      </div>
      <p className="kb-note">Reservadas: WASD y flechas (moverse), E y Espacio (interactuar), T (emojis), V (piedra de regreso), Enter (chat), Esc y 1-5 (combate).</p>
    </FloatingPanel>
  );
}
