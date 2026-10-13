import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import ItemIcon from './ItemIcon';
import ItemTooltip from './ItemTooltip';
import { iconForItem, RARITY_LABELS } from './itemIcons';
import { CardIcon, RARITY_LABEL } from './coleccionArt';
import './BestiarioPanel.css';

// clave de una entrada (objeto o carta), la misma en todo el front
export const entryKey = (e) => (e.kind === 'card' ? `c:${e.monsterId}` : `${e.itemId}:${e.enchantLevel ?? 0}:${e.qualityTier ?? 0}`);

// Mochila y cartas sueltas del álbum para elegir qué adjuntar (correo) o poner a la venta (muñeco).
// taken: Map clave → cantidad ya elegida (se descuenta de lo que se muestra).
// onPick(entry, todo): entry = { kind, itemId|monsterId, enchantLevel, qualityTier, name, rarity, max, ... }
export default function AttachPicker({ taken, onPick, refreshKey, disabled, exclude = [] }) {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('mochila');
  const [bag, setBag] = useState(null);
  const [cards, setCards] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    api.getPlayerInventory(player.id, token).then(setBag).catch(() => setBag([]));
    api.getCartas(player.id, token).then((r) => setCards(r.owned ?? [])).catch(() => setCards([]));
  }, [player, token, refreshKey]);

  const items = useMemo(() => (bag ?? [])
    .filter((b) => b.quantity > 0 && !exclude.includes(b.code))
    .map((b) => {
      const e = { kind: 'item', itemId: b.item_id, enchantLevel: b.enchant_level ?? 0, qualityTier: b.quality_tier ?? 0 };
      return {
        ...e, name: b.name, rarity: b.effective_rarity || b.rarity, itemType: b.item_type, slot: b.slot, code: b.code,
        sellArtisan: b.sell_artisan, max: b.quantity, left: b.quantity - (taken?.get(entryKey(e)) ?? 0),
      };
    })
    .filter((b) => b.left > 0), [bag, taken, exclude]);

  const cardList = useMemo(() => (cards ?? [])
    .map((c) => ({ ...c, kind: 'card', max: c.quantity, left: c.quantity - (taken?.get(`c:${c.monsterId}`) ?? 0) }))
    .filter((c) => c.left > 0), [cards, taken]);

  const loading = tab === 'mochila' ? bag === null : cards === null;
  const list = tab === 'mochila' ? items : cardList;

  return (
    <div className="ap">
      <div className="ap-head">
        <div className="wp-tabs">
          <button type="button" className={`wp-tab${tab === 'mochila' ? ' wp-tab--active' : ''}`} onClick={() => setTab('mochila')}>Mochila</button>
          <button type="button" className={`wp-tab${tab === 'cartas' ? ' wp-tab--active' : ''}`} onClick={() => setTab('cartas')}>Cartas</button>
        </div>
        <small>clic: agregar · clic derecho: toda la pila</small>
      </div>
      <div className="ap-grid">
        {loading && <p className="wp-empty">Cargando…</p>}
        {!loading && list.length === 0 && (
          <p className="wp-empty">{tab === 'mochila' ? 'No te queda nada en la mochila.' : 'No tienes cartas sueltas (las engarzadas se quitan en el álbum).'}</p>
        )}
        {list.map((e) => {
          const pick = (all) => onPick?.(e, all);
          const tip = (ev) => setHover({ e, x: ev.clientX, y: ev.clientY });
          if (e.kind === 'card') {
            return (
              <button key={`c${e.monsterId}`} type="button" disabled={disabled}
                className={`wp-slot wp-card-slot wp-card-slot--${e.rarity.toLowerCase()}`}
                onClick={() => pick(false)} onContextMenu={(ev) => { ev.preventDefault(); pick(true); }}
                onMouseMove={tip} onMouseLeave={() => setHover(null)}
              >
                <CardIcon rarity={e.rarity} />
                {e.left > 1 && <span className="wp-slot-qty">{e.left}</span>}
              </button>
            );
          }
          const icon = iconForItem({ ...e, item_type: e.itemType });
          return (
            <button key={entryKey(e)} type="button" disabled={disabled}
              className={`wp-slot wp-rarity-${(e.rarity || 'COMUN').toLowerCase()}`}
              onClick={() => pick(false)} onContextMenu={(ev) => { ev.preventDefault(); pick(true); }}
              onMouseMove={tip} onMouseLeave={() => setHover(null)}
            >
              <ItemIcon icon={icon} />
              {e.enchantLevel > 0 && <span className="wp-slot-enchant">+{e.enchantLevel}</span>}
              {e.left > 1 && <span className="wp-slot-qty">{e.left}</span>}
            </button>
          );
        })}
      </div>
      {hover?.e.kind === 'card' && (
        <div className="wp-card-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <b>Carta de {hover.e.name}</b>
          <small>{RARITY_LABEL[hover.e.rarity]} · {hover.e.label}</small>
          <span>{hover.e.text}</span>
        </div>
      )}
      {hover && hover.e.kind !== 'card' && (
        <ItemTooltip
          item={{ itemId: hover.e.itemId, name: hover.e.name, rarity: hover.e.rarity, itemType: hover.e.itemType, slot: hover.e.slot, enchantLevel: hover.e.enchantLevel, qualityTier: hover.e.qualityTier }}
          x={hover.x} y={hover.y} token={token} hint={RARITY_LABELS[hover.e.rarity] ?? ''}
        />
      )}
    </div>
  );
}

// Ícono de una entrada ya elegida (para las listas de adjuntos / venta)
export function EntryIcon({ e }) {
  if (e.kind === 'card') {
    return (
      <span className={`wp-slot wp-card-slot wp-card-slot--${(e.rarity || 'COMMON').toLowerCase()} ap-mini`}>
        <CardIcon rarity={e.rarity} />
      </span>
    );
  }
  const icon = iconForItem({ ...e, item_type: e.itemType });
  return (
    <span className={`wp-slot wp-rarity-${(e.rarity || 'COMUN').toLowerCase()} ap-mini`}>
      <ItemIcon icon={icon} />
      {e.enchantLevel > 0 && <span className="wp-slot-enchant">+{e.enchantLevel}</span>}
    </span>
  );
}
