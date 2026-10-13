import GameIcon from '../GameIcon';
import { GEAR_ASSETS, SETS, SHAPES, iconCell } from '../../game/gear';
import './ItemIcon.css';

// Ícono de un ítem: el pixel art del equipo de las clases base (game/gear.js, atlas de
// art/sprites/combate/crear_equipo.lua) o, si la pieza no tiene arte propio, el de game-icons.
export default function ItemIcon({ icon, className = '' }) {
  const cell = icon?.art && iconCell(icon.art);
  if (!cell) return <GameIcon name={icon?.name ?? 'swap-bag'} artist={icon?.artist ?? 'lorc'} className={className} />;
  const col = cell.x / 32;
  const row = cell.y / 32;
  return (
    <span
      className={`item-art ${className}`.trim()}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${GEAR_ASSETS}/iconos.png)`,
        backgroundSize: `${SETS.length * 100}% ${SHAPES.length * 100}%`,
        backgroundPosition: `${(col / (SETS.length - 1)) * 100}% ${(row / (SHAPES.length - 1)) * 100}%`,
      }}
    />
  );
}
