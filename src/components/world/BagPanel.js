import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import ItemIcon from './ItemIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem } from './itemIcons';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { CardIcon, RARITY_LABEL } from './coleccionArt';
import './BestiarioPanel.css';

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
    questItem: !!row.is_quest_item,
  };
}

// Mochila estilo MMO: grilla de casillas con ícono, borde por rareza y cantidad. Clic derecho
// (o doble clic) equipa el equipo o usa el consumible.
export default function BagPanel({ gold, refreshKey, onChanged, onClose, zIndex, onActivate, openWindow, piedra, onUseStone }) {
  const { player, token } = useAuth();
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [hover, setHover] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  // pestaña de cartas de monstruo (se engarzan desde el Bestiario, tecla K)
  const [tab, setTab] = useState('objetos');
  const [cards, setCards] = useState(null);
  const [cardHover, setCardHover] = useState(null);
  // la piedra de regreso va siempre en la primera casilla (no es un objeto del inventario: la
  // lleva todo aventurero y su estado vive en el servidor, ver lib/piedraRegreso.js)
  const [stoneHover, setStoneHover] = useState(null);
  const stoneLeft = piedra?.readyAt ? Math.max(0, new Date(piedra.readyAt).getTime() - Date.now()) : 0;
  useEffect(() => {
    api.getCartas(player.id, token).then((r) => setCards(r.owned)).catch(() => setCards([]));
  }, [player, token, refreshKey]);
  const openAlbum = () => { openWindow?.('bestiario'); setTimeout(() => bus.emit('bestiario-tab', 'cartas'), 0); };

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
      // los objetos de misión primero (no se venden ni se pierden de vista)
      .sort((a, b) => Number(!!b.is_quest_item) - Number(!!a.is_quest_item)
        || (TYPE_ORDER[a.item_type] ?? 9) - (TYPE_ORDER[b.item_type] ?? 9)
        || RARITY_ORDER.indexOf(b.effective_rarity || b.rarity) - RARITY_ORDER.indexOf(a.effective_rarity || a.rarity)
        || a.name.localeCompare(b.name));
  }, [items, search]);

  const slots = Math.max(MIN_SLOTS, Math.ceil((visible.length + 1) / COLUMNS) * COLUMNS) - 1;

  const activate = async (it) => {
    if (busy) return;
    setHover(null);
    try {
      setBusy(true);
      if (it.code === 'MUNECO_DE_VENTA') {
        // el muñeco de venta no se "usa": abre la ventana para armar el puesto
        openWindow?.('mi_puesto');
        return;
      }
      if (it.is_scroll) {
        // pergamino de receta: se lee y enseña a fabricar su set (se busca en el Taller, tecla U)
        if (it.recipe_already_learned) {
          setMessage({ ok: false, text: 'Ya conoces todas las recetas de este pergamino.' });
          return;
        }
        const r = await api.useRecipeScroll(player.id, it.item_id, token);
        const names = (r?.learnedRecipes ?? []).map((x) => x.resultName);
        audio.sfx('mision');
        if (names.length) audio.sfx('descubrir');
        setMessage({ ok: true, text: names.length ? `📜 ¡Aprendiste ${names.length > 1 ? `${names.length} crafteos nuevos` : 'un crafteo nuevo'}! ${names.join(', ')}. Búscalos en el Taller (U).` : (r?.message ?? 'Leíste el pergamino') });
      } else if (it.item_type === 'EQUIPMENT') {
        await api.equipItem(player.id, it.item_id, it.enchant_level, it.quality_tier, token);
        setMessage({ ok: true, text: `Equipaste ${it.name}` });
      } else if (it.item_type === 'CONSUMABLE' && !NO_GENERIC_USE.has(it.code)) {
        const r = await api.useItem(player.id, it.item_id, token);
        setMessage({ ok: true, text: r?.message || `Usaste ${it.name}` });
        // comida con bonus: el HUD muestra "Bien alimentado" con su tiempo
        if (r?.foodBuff) bus.emit('food-buff', r.foodBuff);
        // la Vela de Sebo: la llama de las Catacumbas vuelve a arder entera (game/world/llama.js)
        if (r?.llama) bus.emit('llama-llena');
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
    if (it.is_quest_item) return 'Objeto de misión: no se vende ni se regala. Se va al entregar o abandonar la misión.';
    if (it.code === 'MUNECO_DE_VENTA') return 'Clic derecho: armar tu puesto';
    if (it.is_scroll) return it.recipe_already_learned ? 'Ya conoces todas sus recetas' : 'Clic derecho: leer el pergamino (aprendes sus recetas)';
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
      <div className="wp-bag-tabs">
        <button type="button" className={tab === 'objetos' ? 'is-on' : ''} onClick={() => setTab('objetos')}>Objetos</button>
        <button type="button" className={tab === 'cartas' ? 'is-on' : ''} onClick={() => setTab('cartas')}>Cartas{cards?.length ? ` (${cards.reduce((n, c) => n + c.quantity, 0)})` : ''}</button>
      </div>
      {tab === 'cartas' ? (
        <>
          <div className="wp-bag-grid" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 44px)` }}>
            {Array.from({ length: Math.max(16, Math.ceil((cards?.length ?? 0) / COLUMNS) * COLUMNS) }, (_, i) => {
              const c = cards?.[i];
              if (!c) return <div key={`vacia-${i}`} className="wp-slot wp-slot--empty" />;
              return (
                <button
                  key={c.monsterId}
                  type="button"
                  className={`wp-slot wp-card-slot wp-card-slot--${c.rarity.toLowerCase()}`}
                  onMouseMove={(e) => setCardHover({ c, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setCardHover(null)}
                  onDoubleClick={openAlbum}
                  onContextMenu={(e) => { e.preventDefault(); openAlbum(); }}
                >
                  <CardIcon rarity={c.rarity} />
                  {c.quantity > 1 && <span className="wp-slot-qty">{c.quantity}</span>}
                </button>
              );
            })}
          </div>
          {cards?.length === 0 && <p className="wp-empty">Aún no tienes cartas. Los monstruos las sueltan muy de vez en cuando.</p>}
          <button type="button" className="wp-btn" style={{ marginTop: 8, width: '100%' }} onClick={openAlbum}>Abrir el álbum y engarzar (K)</button>
          {cardHover && (
            <div className="wp-card-tip" style={{ left: cardHover.x + 14, top: cardHover.y + 14 }}>
              <b>Carta de {cardHover.c.name}</b>
              <small>{RARITY_LABEL[cardHover.c.rarity]} · {cardHover.c.label}</small>
              <span>{cardHover.c.text}</span>
              <em>Clic derecho: abrir el álbum para engarzarla</em>
            </div>
          )}
        </>
      ) : (<>
      <input
        className="wp-search"
        type="search"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="wp-bag-grid" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 44px)` }}>
        <button
          type="button"
          className={`wp-slot wp-slot--piedra${stoneLeft ? ' is-cd' : ''}`}
          onMouseMove={(e) => setStoneHover({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setStoneHover(null)}
          onDoubleClick={() => onUseStone?.()}
          onContextMenu={(e) => { e.preventDefault(); onUseStone?.(); }}
        >
          <img src={`${process.env.PUBLIC_URL}/assets/mundo/vinculo/piedra_regreso.png`} alt="Piedra de regreso" />
          {stoneLeft > 0 && <span className="wp-slot-qty">{Math.ceil(stoneLeft / 60000)}m</span>}
        </button>
        {Array.from({ length: slots }, (_, i) => {
          const it = visible[i];
          if (!it) return <div key={`vacio-${i}`} className="wp-slot wp-slot--empty" />;
          const icon = iconForItem(it);
          const rarity = (it.effective_rarity || it.rarity || 'COMUN').toLowerCase();
          return (
            <button
              key={it.inventory_id}
              type="button"
              className={`wp-slot wp-rarity-${rarity}${it.is_quest_item ? ' wp-slot--quest' : ''}`}
              onMouseMove={(e) => setHover({ it, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
              onDoubleClick={() => activate(it)}
              onContextMenu={(e) => { e.preventDefault(); activate(it); }}
            >
              <ItemIcon icon={icon} />
              {it.is_quest_item && <span className="wp-slot-quest" aria-label="Objeto de misión">📜</span>}
              {it.enchant_level > 0 && <span className="wp-slot-enchant">+{it.enchant_level}</span>}
              {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
            </button>
          );
        })}
      </div>
      {items === null && <p className="wp-empty">Cargando…</p>}
      {items?.length === 0 && <p className="wp-empty">Tu mochila está vacía. Derrota monstruos o visita a los artesanos.</p>}
      {hover && <ItemTooltip item={toTooltipItem(hover.it)} x={hover.x} y={hover.y} token={token} hint={hintFor(hover.it)} />}
      {stoneHover && (
        <div className="wp-card-tip wp-stone-tip" style={{ left: Math.min(stoneHover.x + 14, window.innerWidth - 260), top: stoneHover.y + 14 }}>
          <b>Piedra de regreso</b>
          <small>Objeto de viaje · no se vende ni se pierde</small>
          {piedra && !piedra.vinculo
            ? <span>Todavía no está vinculada. Vincúlala en la Estatua del Viajero de {piedra.estatua?.nombre ?? 'Aurelia'} ({piedra.estatua?.lugar ?? 'la Plaza del Pilar'}) para poder usarla.</span>
            : <span>Te devuelve junto a la Estatua del Viajero de {piedra?.nombre ?? 'Aurelia'}. Quédate quieto unos segundos para usarla.</span>}
          <span>{stoneLeft ? `Recargando: lista en ${Math.ceil(stoneLeft / 60000)} min.` : `Lista. Recarga de ${piedra?.recargaMin ?? 20} min.`}</span>
          <em>Clic derecho o tecla V: usar</em>
        </div>
      )}
      </>)}
    </FloatingPanel>
  );
}
