import bus from '../../game/bus';
import GameIcon from '../GameIcon';

// Guía del aventurero en el HUD (bajo el minimapa, encima de las misiones): el paso actual de la
// primera hora del jugador, con "Rastrear" (la flecha te lleva) y la opción de saltarla.
export default function GuideTracker({ guide, onSkip, onToast }) {
  if (!guide || guide.done || !guide.current) return null;
  const c = guide.current;
  const track = () => bus.emit('guide-track', c.id, (ok) => onToast?.(ok ? 'Sigue la flecha.' : 'Eso queda en otra zona: sigue avanzando.'));
  return (
    <div className="hud-guide">
      <div className="hud-guide-head">
        <GameIcon name="compass" artist="lorc" />
        <b>Guía del aventurero</b>
        <small>{guide.step + 1}/{guide.total}</small>
      </div>
      <strong>{c.title}</strong>
      <p>{c.text}</p>
      <div className="hud-guide-foot">
        <span className="hud-guide-reward">+{c.gold} oro · +{c.xp} XP</span>
        <button type="button" onClick={track}>Rastrear</button>
        <button type="button" className="hud-guide-skip" onClick={onSkip} title="Terminar la guía y encender toda la barra">Saltar</button>
      </div>
    </div>
  );
}
