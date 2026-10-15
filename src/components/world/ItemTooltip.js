import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { RARITY_LABELS, SLOT_LABELS, STAT_LABELS, TYPE_LABELS } from './itemIcons';

// Mismos multiplicadores que lib/equipment.js del back (y que la pantalla de Inventario)
const QUALITY_TIER_MULTIPLIER = [1.0, 1.15, 1.35, 1.60, 2.0];

// El detalle (bonos, descripción) no viene en la lista del inventario: se pide una vez por ítem
const detailCache = new Map();

function useItemDetail(itemId, token) {
  const [detail, setDetail] = useState(() => detailCache.get(itemId) ?? null);
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
  return detail;
}

// item: { itemId, name, rarity, itemType, slot, requiredLevel, enchantLevel, qualityTier, quantity }
export default function ItemTooltip({ item, x, y, token, hint }) {
  const detail = useItemDetail(item.itemId, token);
  const rarity = item.rarity || 'COMUN';
  const mult = (1 + (item.enchantLevel || 0) * 0.05) * (QUALITY_TIER_MULTIPLIER[item.qualityTier || 0] ?? 1);

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
      {detail?.statBonuses?.map((b) => (
        <div key={b.stat_code} className="wp-tooltip-stat">
          +{Math.round(Number(b.amount) * mult)}{b.is_percent ? '%' : ''} {STAT_LABELS[b.stat_code] ?? b.stat_code}
        </div>
      ))}
      {detail?.class_name && <div className="wp-tooltip-req">Clase: {detail.class_name}</div>}
      {item.requiredLevel > 1 && <div className="wp-tooltip-req">Requiere nivel {item.requiredLevel}</div>}
      {detail?.description && <div className="wp-tooltip-desc">“{detail.description}”</div>}
      {hint && <div className="wp-tooltip-hint">{hint}</div>}
    </div>
  );
}
