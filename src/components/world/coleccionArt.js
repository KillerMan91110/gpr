import { useEffect, useState } from 'react';

// Arte de la colección del cazador (art/sprites/mundo/crear_coleccion.lua): marcos de carta,
// íconos de carta para la mochila, amuletos y retratos de monstruo sacados de su hoja de combate.
const PUB = process.env.PUBLIC_URL;
const ART = `${PUB}/assets/mundo/coleccion`;
export const RARITY_INDEX = { COMMON: 0, RARE: 1, MINIBOSS: 2, LEGENDARY: 3, MYTHIC: 4 };
export const RARITY_LABEL = { COMMON: 'Común', RARE: 'Rara', MINIBOSS: 'Minijefe', LEGENDARY: 'Legendaria', MYTHIC: 'Mítica' };
export const CHARM_INDEX = { bolsa: 0, pluma: 1, ojo: 2, trebol: 3, hoja: 4 };
export const CATEGORY_LABEL = {
  BESTIA: 'Bestia', INSECTOIDE: 'Insectoide', HUMANOIDE: 'Humanoide', DEMONIO: 'Demonio', ESPECTRO: 'Espectro',
  MUERTO_VIVIENTE: 'No muerto', ACUATICO: 'Acuático', ELEMENTAL: 'Elemental', DRACOIDE: 'Dracoide', COSMICO: 'Cósmico',
};

let catalog = null;
const catalogPromise = fetch(`${PUB}/assets/sprites/combate/enemigos.json`)
  .then((r) => r.json())
  .then((j) => { catalog = j.monsters; return catalog; })
  .catch(() => { catalog = {}; return catalog; });

export function useMonsterCatalog() {
  const [cat, setCat] = useState(catalog);
  useEffect(() => { if (!cat) catalogPromise.then(setCat); }, [cat]);
  return cat;
}

// Cuadro de una hoja horizontal (frame `i` de `count`) escalado a `size` px de alto
function sheetStyle(url, frameW, frameH, count, i, scale) {
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${frameW * count * scale}px ${frameH * scale}px`,
    backgroundPosition: `${-i * frameW * scale}px 0`,
    width: frameW * scale,
    height: frameH * scale,
  };
}

export function CardIcon({ rarity = 'COMMON', scale = 2, className = '' }) {
  return <i className={`col-sprite ${className}`} style={sheetStyle(`${ART}/carta_icono.png`, 16, 16, 5, RARITY_INDEX[rarity] ?? 0, scale)} aria-hidden="true" />;
}

export function CharmIcon({ code, scale = 2, className = '' }) {
  return <i className={`col-sprite ${className}`} style={sheetStyle(`${ART}/amuletos.png`, 24, 24, 5, CHARM_INDEX[code] ?? 0, scale)} aria-hidden="true" />;
}

export function MythicMark({ scale = 2 }) {
  return <i className="col-sprite" style={sheetStyle(`${ART}/marca_mitico.png`, 16, 16, 1, 0, scale)} aria-hidden="true" />;
}

// Retrato: primer cuadro de la hoja de combate; si no hay arte todavía, un "?"
// silhouette = negro (monstruo que aún no conoces)
export function MonsterPortrait({ code, box = 64, silhouette = false }) {
  const cat = useMonsterCatalog();
  const info = cat?.[code];
  if (!info) return <span className="col-portrait col-portrait--none" style={{ width: box, height: box }}>?</span>;
  const scale = Math.max(1, Math.floor(box / Math.max(info.frameSize.w, info.frameSize.h)));
  const frames = 1 + Math.max(0, ...Object.values(info.animations ?? {}).flatMap((a) => a.frames));
  return (
    <span className="col-portrait" style={{ width: box, height: box }}>
      <i
        className={`col-sprite${silhouette ? ' col-sprite--shadow' : ''}`}
        style={sheetStyle(`${PUB}/assets/sprites/combate/${info.sheet}`, info.frameSize.w, info.frameSize.h, frames, 0, scale)}
        aria-hidden="true"
      />
    </span>
  );
}

// Carta completa: marco por rareza + retrato + nombre en la placa
export function MonsterCard({ card, scale = 2, count, onClick, selected, title }) {
  const r = RARITY_INDEX[card.rarity] ?? 0;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`col-card col-card--${(card.rarity || 'COMMON').toLowerCase()}${selected ? ' is-selected' : ''}`}
      style={{ width: 40 * scale, height: 56 * scale }}
      onClick={onClick}
      title={title}
    >
      <i className="col-sprite col-card-frame" style={sheetStyle(`${ART}/cartas.png`, 40, 56, 5, r, scale)} aria-hidden="true" />
      <span className="col-card-art" style={{ left: 5 * scale, top: 7 * scale, width: 30 * scale, height: 31 * scale }}>
        <MonsterPortrait code={card.code} box={30 * scale} />
      </span>
      <span className="col-card-name" style={{ left: 5 * scale, top: 42 * scale, width: 30 * scale, height: 7 * scale }}>{card.name}</span>
      {count > 1 && <span className="col-card-count">x{count}</span>}
    </Tag>
  );
}
