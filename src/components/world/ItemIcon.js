import GameIcon from '../GameIcon';
import { GEAR_ASSETS, OBJETOS, SETS, SHAPES, iconCell } from '../../game/gear';
import './ItemIcon.css';

// Ícono de un ítem: el pixel art del equipo de las clases base (game/gear.js, atlas de
// art/sprites/combate/crear_equipo.lua) o, si la pieza no tiene arte propio, el de game-icons.
export default function ItemIcon({ icon, className = '' }) {
  // pociones, comidas y accesorios: atlas de objetos (una fila)
  if (icon?.objeto != null) {
    return (
      <span
        className={`item-art ${className}`.trim()}
        aria-hidden="true"
        style={{
          backgroundImage: `url(${GEAR_ASSETS}/objetos.png)`,
          backgroundSize: `${OBJETOS.length * 100}% 100%`,
          backgroundPosition: `${(icon.objeto / (OBJETOS.length - 1)) * 100}% 0%`,
        }}
      />
    );
  }
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
