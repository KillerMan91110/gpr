import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RARITY_LABELS, SLOT_LABELS, STAT_LABELS, TYPE_LABELS } from './itemIcons';

// Mismos multiplicadores que lib/equipment.js del back (y que la pantalla de Inventario)
const QUALITY_TIER_MULTIPLIER = [1.0, 1.15, 1.35, 1.60, 2.0];

// El detalle (bonos, descripción) no viene en la lista del inventario: se pide una vez por ítem
const detailCache = new Map();

function useItemDetail(itemId, token) {
  // el estado solo sirve para volver a pintar cuando llega; se lee siempre del caché por su id (así
  // nunca se mezcla con el de otra pieza al pasar el ratón de una a otra)
  const [, setDetail] = useState(() => detailCache.get(itemId) ?? null);
  useEffect(() => {
    if (!itemId) return undefined;
    if (detailCache.has(itemId)) { setDetail(detailCache.get(itemId)); return undefined; }
    let cancelled = false;
    api.getItem(itemId, token).then((d) => {
      detailCache.set(itemId, d);
      if (!cancelled) setDetail(d);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [itemId, token]);
  return itemId ? detailCache.get(itemId) ?? null : null;
}

const multOf = (it) => (1 + (it?.enchantLevel || 0) * 0.05) * (QUALITY_TIER_MULTIPLIER[it?.qualityTier || 0] ?? 1);
const statKey = (b) => `${b.stat_code}${b.is_percent ? '%' : ''}`;

// Lo que llevas puesto, para pintar cada stat en verde (mejor) o rojo (peor). Se pide como mucho cada
// 5 s (si te cambias algo, al rato el tooltip ya compara con lo nuevo).
let equippedCache = { at: 0, playerId: null, list: null, pending: null };
function useEquipped(playerId, token, enabled) {
  const fresh = equippedCache.playerId === playerId && Date.now() - equippedCache.at < 5000;
  const [list, setList] = useState(() => (fresh ? equippedCache.list : null));
  useEffect(() => {
    if (!enabled || !playerId) return undefined;
    if (equippedCache.playerId === playerId && Date.now() - equippedCache.at < 5000 && equippedCache.list) { setList(equippedCache.list); return undefined; }
    let cancelled = false;
    equippedCache.pending ??= api.getPlayerEquipment(playerId, token)
      .then((l) => { equippedCache = { at: Date.now(), playerId, list: l, pending: null }; return l; })
      .catch(() => { equippedCache.pending = null; return null; });
    equippedCache.pending.then((l) => { if (!cancelled && l) setList(l); });
    return () => { cancelled = true; };
  }, [playerId, token, enabled]);
  return list;
}
// lo que esa pieza reemplazaría: su hueco (y la mano izquierda si es a dos manos, o el arma a dos
// manos si es una mano izquierda); null si no aplica o si es justo lo que llevas puesto
function replacedBy(item, detail, equipped) {
  if (!equipped || item.itemType !== 'EQUIPMENT' || !item.slot) return null;
  const bySlot = Object.fromEntries(equipped.map((e) => [e.slot, e.item]));
  const own = bySlot[item.slot];
  if (own && own.itemId === item.itemId && (own.enchantLevel || 0) === (item.enchantLevel || 0)
    && (own.qualityTier || 0) === (item.qualityTier || 0)) return null;
  return [own, detail?.is_two_handed && item.slot === 'WEAPON' ? bySlot.OFFHAND : null,
    item.slot === 'OFFHAND' && bySlot.WEAPON?.isTwoHanded ? bySlot.WEAPON : null].filter(Boolean);
}

// item: { itemId, name, rarity, itemType, slot, requiredLevel, enchantLevel, qualityTier, quantity }
export default function ItemTooltip({ item, x, y, token, hint }) {
  const { player } = useAuth();
  const detail = useItemDetail(item.itemId, token);
  const rarity = item.rarity || 'COMUN';
  const mult = multOf(item);
  const equipped = useEquipped(player?.id, token, item.itemType === 'EQUIPMENT');
  const replaced = replacedBy(item, detail, equipped);
  // las stats de lo que se reemplaza (con su calidad y encantamiento)
  const r0 = useItemDetail(replaced?.[0]?.itemId, token);
  const r1 = useItemDetail(replaced?.[1]?.itemId, token);
  let worn = null;
  if (replaced) {
    worn = new Map();
    [[replaced[0], r0], [replaced[1], r1]].forEach(([it, d]) => {
      if (!it || !d) return;
      for (const b of d.statBonuses ?? []) {
        const k = statKey(b);
        worn.set(k, { ...b, total: (worn.get(k)?.total ?? 0) + Number(b.amount) * multOf(it) });
      }
    });
  }
  const own = new Set((detail?.statBonuses ?? []).map(statKey));
  const lost = worn ? [...worn.values()].filter((b) => !own.has(statKey(b)) && Math.round(b.total) !== 0) : [];

  // que no se salga de la pantalla
  const left = Math.min(x + 16, window.innerWidth - 270);
  const top = Math.min(y + 16, window.innerHeight - 220);

  return (
    <div className="wp-tooltip" style={{ left, top }}>
      <div className={`wp-tooltip-name wp-rarity-${rarity.toLowerCase()}${item.questItem ? ' wp-tooltip-name--quest' : ''}`}>
        {item.name}{item.enchantLevel ? ` +${item.enchantLevel}` : ''}
      </div>
      <div className="wp-tooltip-sub">
        {item.questItem ? 'Objeto de misión' : RARITY_LABELS[rarity] ?? rarity}
        {item.questItem ? '' : item.itemType === 'EQUIPMENT' ? ` · ${SLOT_LABELS[item.slot] ?? item.slot}` : ` · ${TYPE_LABELS[item.itemType] ?? ''}`}
        {detail?.is_two_handed ? ' · Dos manos' : ''}
      </div>
      {detail?.statBonuses?.map((b) => {
        const v = Math.round(Number(b.amount) * mult);
        // frente a lo que llevas puesto: verde si gana, rojo si pierde
        const w = worn ? Math.round(worn.get(statKey(b))?.total ?? 0) : null;
        const cmp = w === null ? '' : v > w ? ' wp-tooltip-stat--up' : v < w ? ' wp-tooltip-stat--down' : ' wp-tooltip-stat--same';
        return (
          <div key={statKey(b)} className={`wp-tooltip-stat${cmp}`}>
            {v >= 0 ? '+' : ''}{v}{b.is_percent ? '%' : ''} {STAT_LABELS[b.stat_code] ?? b.stat_code}
            {w !== null && v !== w && <small> ({v > w ? '▲' : '▼'}{Math.abs(v - w)})</small>}
          </div>
        );
      })}
      {lost.map((b) => (
        <div key={`lost-${statKey(b)}`} className="wp-tooltip-stat wp-tooltip-stat--down">
          ▼{Math.round(b.total)}{b.is_percent ? '%' : ''} {STAT_LABELS[b.stat_code] ?? b.stat_code} <small>(lo pierdes)</small>
        </div>
      ))}
      {replaced && replaced.length > 0 && (
        <div className="wp-tooltip-vs">Frente a: {replaced.map((r) => r.name).join(' + ')}</div>
      )}
      {detail?.class_name && <div className="wp-tooltip-req">Clase: {detail.class_name}</div>}
      {item.requiredLevel > 1 && <div className="wp-tooltip-req">Requiere nivel {item.requiredLevel}</div>}
      {detail?.description && <div className="wp-tooltip-desc">“{detail.description}”</div>}
      {hint && <div className="wp-tooltip-hint">{hint}</div>}
    </div>
  );
}
