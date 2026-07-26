// Ícono de game-icons.net (public/Icons/<artist>/<name>.png) recoloreado vía mask-image — ver
// la clase .game-icon en App.css para el porqué (negro sólido + máscara en vez de <img>).
export default function GameIcon({ name, artist, className = '', title }) {
  const src = `${process.env.PUBLIC_URL}/Icons/${artist}/${name}.png`;
  return (
    <span
      className={`game-icon ${className}`.trim()}
      style={{ '--icon-src': `url(${src})` }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
