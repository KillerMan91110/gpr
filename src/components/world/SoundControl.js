import { useEffect, useState } from 'react';
import GameIcon from '../GameIcon';
import audio from '../../game/audio';

// Botón de sonido del HUD (debajo del minimapa): silenciar y volúmenes de música y efectos
export default function SoundControl() {
  const [prefs, setPrefs] = useState({ ...audio.prefs });
  const [open, setOpen] = useState(false);
  useEffect(() => audio.onChange((p) => setPrefs({ ...p })), []);

  const silent = prefs.muted || (prefs.music === 0 && prefs.sfx === 0);
  return (
    <div className={`hud-sound${open ? ' hud-sound--open' : ''}`}>
      <button
        type="button"
        className="hud-sound-btn"
        title={silent ? 'Sonido apagado' : 'Sonido'}
        onClick={() => { audio.unlock(); setOpen(!open); }}
        onContextMenu={(e) => { e.preventDefault(); audio.setPrefs({ muted: !prefs.muted }); }}
      >
        <GameIcon name={silent ? 'speaker-off' : 'speaker'} artist="delapouite" />
      </button>
      {open && (
        <div className="hud-sound-pop">
          <label>
            Música
            <input type="range" min="0" max="1" step="0.05" value={prefs.music} onChange={(e) => audio.setPrefs({ music: Number(e.target.value), muted: false })} />
          </label>
          <label>
            Efectos
            <input type="range" min="0" max="1" step="0.05" value={prefs.sfx} onChange={(e) => { audio.setPrefs({ sfx: Number(e.target.value), muted: false }); audio.sfx('moneda'); }} />
          </label>
          <button type="button" className="wp-btn" onClick={() => audio.setPrefs({ muted: !prefs.muted })}>
            {prefs.muted ? 'Activar sonido' : 'Silenciar todo'}
          </button>
        </div>
      )}
    </div>
  );
}
