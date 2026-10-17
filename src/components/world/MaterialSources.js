import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { RESOURCES } from '../../game/world/shared';
import './MaterialSources.css';

// «¿Dónde?» en un material del Taller: de dónde sale (gprback/lib/fuentes.js). Se pide al abrirlo y
// queda guardado mientras el Taller está abierto. No nombra lo de zonas que todavía no abriste.
const RARITY = { COMMON: 'común', RARE: 'raro', MINIBOSS: 'minijefe', LEGENDARY: 'jefe' };
const STATION = { forja: 'en la forja', pilar: 'en el Pilar de Aethra' };
const cache = new Map();

export default function MaterialSources({ playerId, itemId, token }) {
  const [src, setSrc] = useState(cache.get(itemId));
  const [error, setError] = useState(null);
  useEffect(() => {
    if (cache.has(itemId)) { setSrc(cache.get(itemId)); return; }
    api.getCraftFuentes(playerId, itemId, token)
      .then((r) => { cache.set(itemId, r); setSrc(r); })
      .catch((e) => setError(e.message));
  }, [playerId, itemId, token]);

  if (error) return <div className="mat-src mat-src--empty">{error}</div>;
  if (src === undefined) return <div className="mat-src mat-src--empty">Buscando…</div>;
  const empty = !src || (!src.monsters.length && !src.nodes.length && !src.crafted && !src.shop);
  return (
    <div className="mat-src">
      {src?.monsters.length > 0 && (
        <>
          <b>Lo sueltan</b>
          <ul>
            {src.monsters.map((m) => (
              <li key={`${m.name}-${m.zone}`}>
                {m.name}{m.rarity !== 'COMMON' && <em> ({RARITY[m.rarity] ?? m.rarity})</em>}
                <span>{m.chance}%{m.max > 1 ? ` · ${m.min}-${m.max}` : ''} · {m.zone}</span>
              </li>
            ))}
          </ul>
          {src.more > 0 && <small>…y {src.more} más.</small>}
        </>
      )}
      {src?.nodes.length > 0 && (
        <>
          <b>Se recoge</b>
          <ul>
            {src.nodes.map((n) => (
              <li key={n.type}>
                {RESOURCES[n.type]?.label ?? n.type}
                <span>{n.chance}% · {n.zones.join(', ')}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {src?.crafted && <p><b>Se fabrica</b> {STATION[src.crafted.station] ?? 'en el Taller'}{src.crafted.artisan ? ` (${src.crafted.artisan})` : ''}.</p>}
      {src?.shop && <p><b>Se compra</b> a los artesanos por {src.shop.price.toLocaleString()} de oro.</p>}
      {src?.hidden > 0 && <small>También sale en lugares que todavía no descubriste.</small>}
      {empty && !src?.hidden && <small>Todavía no sabes de dónde sale.</small>}
    </div>
  );
}
