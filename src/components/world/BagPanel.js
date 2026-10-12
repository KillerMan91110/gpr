import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem } from './itemIcons';

const MIN_SLOTS = 48; // casillas vacías de relleno para que se vea como una mochila
const COLUMNS = 8;
const TYPE_ORDER = { EQUIPMENT: 0, CONSUMABLE: 1, MATERIAL: 2 };
const RARITY_ORDER = ['COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO', 'UNICO'];
// Estos consumibles no se usan desde la mochila (ver NO_GENERIC_USE en pages/Inventory.js)
const NO_GENERIC_USE = new Set(['CRISTAL_RESURRECCION', 'CRISTAL_ESTABILIDAD', 'CRISTAL_ESTABILIDAD_MAYOR', 'PIEDRA_TRASCENDENCIA']);

export function toTooltipItem(row) {
  return {
    itemId: row.item_id,
    name: row.name,
    rarity: row.effective_rarity || row.rarity,
    itemType: row.item_type,
    slot: row.slot,
    requiredLevel: row.required_level,
    enchantLevel: row.enchant_level,
    qualityTier: row.quality_tier,
    quantity: row.quantity,
    code: row.code,
  };
}

// Mochila estilo MMO: grilla de casillas con ícono, borde por rareza y cantidad. Clic derecho
// (o doble clic) equipa el equipo o usa el consumible.
export default function BagPanel({ gold, refreshKey, onChanged, onClose, zIndex, onActivate }) {
  const { player, token } = useAuth();
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [hover, setHover] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.getPlayerInventory(player.id, token).then(setItems).catch(() => setItems([]));
  }, [player, token]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? [])
      .filter((it) => it.quantity > 0 && (!q || it.name.toLowerCase().includes(q)))
      .sort((a, b) => (TYPE_ORDER[a.item_type] ?? 9) - (TYPE_ORDER[b.item_type] ?? 9)
        || RARITY_ORDER.indexOf(b.effective_rarity || b.rarity) - RARITY_ORDER.indexOf(a.effective_rarity || a.rarity)
        || a.name.localeCompare(b.name));
  }, [items, search]);

  const slots = Math.max(MIN_SLOTS, Math.ceil(visible.length / COLUMNS) * COLUMNS);

  const activate = async (it) => {
    if (busy) return;
    setHover(null);
    try {
      setBusy(true);
      if (it.item_type === 'EQUIPMENT') {
        await api.equipItem(player.id, it.item_id, it.enchant_level, it.quality_tier, token);
        setMessage({ ok: true, text: `Equipaste ${it.name}` });
      } else if (it.item_type === 'CONSUMABLE' && !NO_GENERIC_USE.has(it.code)) {
        const r = await api.useItem(player.id, it.item_id, token);
        setMessage({ ok: true, text: r?.message || `Usaste ${it.name}` });
      } else {
        return;
      }
      load();
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const hintFor = (it) => {
    if (it.item_type === 'EQUIPMENT') return 'Clic derecho: equipar';
    if (it.item_type === 'CONSUMABLE' && !NO_GENERIC_USE.has(it.code)) return 'Clic derecho: usar';
    return null;
  };

  return (
    <FloatingPanel
      id="mochila"
      title="Mochila"
      icon={<GameIcon name="knapsack" artist="lorc" />}
      width={8 * 44 + 7 * 4 + 28}
      defaultPos={{ x: window.innerWidth - (8 * 44 + 7 * 4 + 28) - 20, y: 236 }}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={(
        <>
          <span className={`wp-bag-msg${message ? (message.ok ? ' ok' : ' err') : ''}`}>
            {message ? message.text : `${visible.length} objeto${visible.length === 1 ? '' : 's'}`}
          </span>
          <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {Number(gold ?? 0).toLocaleString()}</span>
        </>
      )}
    >
      <input
        className="wp-search"
        type="search"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="wp-bag-grid" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 44px)` }}>
        {Array.from({ length: slots }, (_, i) => {
          const it = visible[i];
          if (!it) return <div key={`vacio-${i}`} className="wp-slot wp-slot--empty" />;
          const icon = iconForItem(it);
          const rarity = (it.effective_rarity || it.rarity || 'COMUN').toLowerCase();
          return (
            <button
              key={it.inventory_id}
              type="button"
              className={`wp-slot wp-rarity-${rarity}`}
              onMouseMove={(e) => setHover({ it, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
              onDoubleClick={() => activate(it)}
              onContextMenu={(e) => { e.preventDefault(); activate(it); }}
            >
              <GameIcon name={icon.name} artist={icon.artist} />
              {it.enchant_level > 0 && <span className="wp-slot-enchant">+{it.enchant_level}</span>}
              {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
            </button>
          );
        })}
      </div>
      {items === null && <p className="wp-empty">Cargando…</p>}
      {items?.length === 0 && <p className="wp-empty">Tu mochila está vacía. Derrota monstruos o visita a los artesanos.</p>}
      {hover && <ItemTooltip item={toTooltipItem(hover.it)} x={hover.x} y={hover.y} token={token} hint={hintFor(hover.it)} />}
    </FloatingPanel>
  );
}
