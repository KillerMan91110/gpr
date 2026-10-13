import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import ItemIcon from './ItemIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, RARITY_LABELS } from './itemIcons';
import { CardIcon, RARITY_LABEL as CARD_RARITY } from './coleccionArt';
import './MarketPanel.css';

// Mercado entre jugadores dentro del mundo (tecla B): comprar, vender y tus publicaciones.
// Vende ítems, cartas de monstruo y mascotas (mismo backend que la pantalla clásica /market).
const CURRENCIES = { GOLD: ['Oro', 'two-coins', 'delapouite'], DUNGEON_COINS: ['Monedas del Abismo', 'gem-necklace', 'lorc'], COSMIC_SHARDS: ['Fragmentos Cósmicos', 'crystal-cluster', 'lorc'] };
const KINDS = [['todo', 'Todo'], ['ITEM', 'Objetos'], ['CARD', 'Cartas'], ['PET', 'Mascotas']];

function Price({ amount, currency }) {
  const c = CURRENCIES[currency] ?? CURRENCIES.GOLD;
  return <span className={`mk-price mk-price--${currency.toLowerCase()}`} title={c[0]}><GameIcon name={c[1]} artist={c[2]} />{Number(amount).toLocaleString()}</span>;
}

// ícono, nombre y rareza de una publicación (o de algo tuyo para vender)
function describe(l) {
  if (l.type === 'CARD' || l.card) {
    const c = l.card;
    return { icon: <CardIcon rarity={c.rarity} />, name: `Carta de ${c.name}`, sub: `${CARD_RARITY[c.rarity]} · ${c.text}`, rarity: `card-${c.rarity.toLowerCase()}` };
  }
  if (l.type === 'PET' || l.pet) {
    const p = l.pet;
    return { icon: <GameIcon name="paw-print" artist="lorc" />, name: p.name, sub: `Mascota nivel ${p.level} · ${RARITY_LABELS[p.rarity] ?? p.rarity}`, rarity: (p.rarity || 'COMUN').toLowerCase() };
  }
  const it = l.item;
  const ic = iconForItem({ ...it, code: it.code ?? l.item_code });
  const extra = [it.enchant_level > 0 ? `+${it.enchant_level}` : null, it.quality_tier > 0 ? `calidad ${it.quality_tier}` : null].filter(Boolean).join(' · ');
  return { icon: <ItemIcon icon={ic} />, name: it.name, sub: `${RARITY_LABELS[it.rarity] ?? ''}${extra ? ` · ${extra}` : ''}`, rarity: (it.rarity || 'COMUN').toLowerCase() };
}

function Comprar({ onMsg, gold }) {
  const { player, token } = useAuth();
  const [list, setList] = useState(null);
  const [kind, setKind] = useState('todo');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState(null);
  const [hover, setHover] = useState(null);

  const load = useCallback(() => {
    const params = { sortBy };
    if (search.trim()) params.search = search.trim();
    api.getMarketListings(player.id, token, params).then(setList).catch((e) => onMsg(e.message, false));
  }, [player, token, sortBy, search, onMsg]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const shown = (list ?? []).filter((l) => kind === 'todo' || l.type === kind);
  const buy = async (l) => {
    const q = l.type === 'PET' ? undefined : Math.max(1, Math.min(l.quantity, Number(qty[l.id] ?? l.quantity) || 1));
    setBusy(l.id);
    try {
      const r = await api.buyMarketListing(player.id, l.id, token, q);
      onMsg(r.message, true);
      audio.sfx('monedas');
      load();
    } catch (e) { onMsg(e.message, false); audio.sfx('error'); }
    setBusy(null);
  };

  return (
    <>
      <div className="mk-bar">
        <input className="wp-search" type="search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="mk-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Recientes</option>
          <option value="price_asc">Más baratos</option>
          <option value="price_desc">Más caros</option>
        </select>
      </div>
      <div className="mk-kinds">
        {KINDS.map(([k, label]) => <button key={k} type="button" className={kind === k ? 'is-on' : ''} onClick={() => setKind(k)}>{label}</button>)}
      </div>
      {!list && <p className="wp-empty">Cargando…</p>}
      {list && !shown.length && <p className="wp-empty">No hay nada publicado{kind !== 'todo' ? ' de este tipo' : ''}.</p>}
      <div className="mk-list">
        {shown.map((l) => {
          const d = describe(l);
          const q = Math.max(1, Math.min(l.quantity, Number(qty[l.id] ?? l.quantity) || 1));
          const total = l.type === 'PET' ? Number(l.total_price) : q * Number(l.price_per_unit);
          const cantAfford = l.currency === 'GOLD' && total > Number(gold ?? 0);
          return (
            <div
              key={l.id}
              className={`mk-row mk-rar-${d.rarity}`}
              onMouseMove={l.type === 'ITEM' ? (e) => setHover({ l, x: e.clientX, y: e.clientY }) : undefined}
              onMouseLeave={() => setHover(null)}
            >
              <span className="mk-icon">{d.icon}</span>
              <span className="mk-name">
                <b>{d.name}{l.quantity > 1 ? ` x${l.quantity}` : ''}</b>
                <small>{d.sub}</small>
                <small className="mk-seller">Vende {l.is_mine ? 'tú' : l.seller_nickname}</small>
              </span>
              <span className="mk-buy">
                {l.quantity > 1 && !l.is_mine && (
                  <input className="mk-qty" type="number" min={1} max={l.quantity} value={qty[l.id] ?? l.quantity} onChange={(e) => setQty((m) => ({ ...m, [l.id]: e.target.value }))} title="Cantidad" />
                )}
                <Price amount={total} currency={l.currency} />
                {l.quantity > 1 && <small><Price amount={l.price_per_unit} currency={l.currency} /> c/u</small>}
                <button type="button" className="wp-btn wp-btn--gold" disabled={l.is_mine || busy === l.id || cantAfford} onClick={() => buy(l)}>
                  {l.is_mine ? 'Tuya' : busy === l.id ? '…' : cantAfford ? 'Sin oro' : 'Comprar'}
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {hover && (
        <ItemTooltip
          item={{ itemId: hover.l.item.id, name: hover.l.item.name, rarity: hover.l.item.rarity, itemType: hover.l.item.item_type, slot: hover.l.item.slot, requiredLevel: hover.l.item.required_level, enchantLevel: hover.l.item.enchant_level, qualityTier: hover.l.item.quality_tier }}
          x={hover.x}
          y={hover.y}
          token={token}
        />
      )}
    </>
  );
}

function Vender({ onMsg }) {
  const { player, token } = useAuth();
  const [kind, setKind] = useState('ITEM');
  const [inv, setInv] = useState(null);
  const [cards, setCards] = useState(null);
  const [pets, setPets] = useState(null);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({ quantity: 1, price: '', currency: 'GOLD' });
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.getPlayerInventory(player.id, token).then((r) => setInv(r.filter((i) => i.rarity && i.quantity > 0))).catch(() => setInv([]));
    api.getCartas(player.id, token).then((r) => setCards(r.owned)).catch(() => setCards([]));
    api.getPets(player.id, token).then((r) => setPets(Array.isArray(r) ? r : r.pets ?? [])).catch(() => setPets([]));
  }, [player, token]);
  useEffect(() => { load(); }, [load]);

  const things = useMemo(() => {
    if (kind === 'CARD') return (cards ?? []).map((c) => ({ key: `c${c.monsterId}`, card: c, max: c.quantity, history: { cardId: c.monsterId } }));
    if (kind === 'PET') return (pets ?? []).filter((p) => !p.is_active).map((p) => ({ key: `p${p.id}`, pet: p, max: 1, history: { petId: p.pet_id } }));
    return (inv ?? []).map((i) => ({
      key: `i${i.item_id}-${i.enchant_level}-${i.quality_tier}`,
      item: { id: i.item_id, name: i.name, rarity: i.effective_rarity || i.rarity, item_type: i.item_type, slot: i.slot, enchant_level: i.enchant_level, quality_tier: i.quality_tier },
      max: i.quantity,
      history: { itemId: i.item_id, enchantLevel: i.enchant_level, qualityTier: i.quality_tier },
    }));
  }, [kind, inv, cards, pets]);

  const pick = (t) => {
    setSel(t);
    setForm((f) => ({ ...f, quantity: 1 }));
    setHistory(null);
    api.getMarketHistory(player.id, t.history, token).then((r) => setHistory(r.sales)).catch(() => setHistory([]));
  };

  const publish = async () => {
    const price = Number(form.price);
    if (!sel || !(price > 0)) { onMsg('Ponle un precio mayor a 0.', false); return; }
    const quantity = Math.max(1, Math.min(sel.max, Number(form.quantity) || 1));
    const body = sel.card ? { cardMonsterId: sel.card.monsterId, quantity, pricePerUnit: price, currency: form.currency }
      : sel.pet ? { playerPetId: sel.pet.id, pricePerUnit: price, currency: form.currency }
        : { itemId: sel.item.id, enchantLevel: sel.item.enchant_level, qualityTier: sel.item.quality_tier, quantity, pricePerUnit: price, currency: form.currency };
    setBusy(true);
    try {
      const r = await api.createMarketListing(player.id, body, token);
      onMsg(r.message, true);
      audio.sfx('monedas');
      setSel(null);
      load();
    } catch (e) { onMsg(e.message, false); audio.sfx('error'); }
    setBusy(false);
  };

  const avg = history?.length ? Math.round(history.reduce((s, h) => s + Number(h.pricePerUnit), 0) / history.length) : null;
  const d = sel ? describe(sel) : null;
  return (
    <div className="mk-sell">
      <div>
        <div className="mk-kinds">
          {KINDS.slice(1).map(([k, label]) => <button key={k} type="button" className={kind === k ? 'is-on' : ''} onClick={() => { setKind(k); setSel(null); }}>{label}</button>)}
        </div>
        <div className="wp-bag-grid mk-grid">
          {things.map((t) => {
            const td = describe(t);
            return (
              <button key={t.key} type="button" className={`wp-slot wp-rarity-${td.rarity.replace('card-', '')}${sel?.key === t.key ? ' wp-slot--sel' : ''}`} title={td.name} onClick={() => pick(t)}>
                {td.icon}
                {t.max > 1 && <span className="wp-slot-qty">{t.max}</span>}
              </button>
            );
          })}
          {!things.length && <p className="wp-empty">{kind === 'CARD' ? 'No tienes cartas en el álbum (las engarzadas no se venden).' : kind === 'PET' ? 'No tienes mascotas para vender (la activa no se vende).' : 'No tienes objetos para vender.'}</p>}
        </div>
      </div>
      <div className="mk-form">
        {!sel ? <p className="wp-empty">Elige algo para publicarlo.</p> : (
          <>
            <div className="mk-form-head"><span className="mk-icon">{d.icon}</span><span><b>{d.name}</b><small>{d.sub}</small></span></div>
            {sel.max > 1 && (
              <label>Cantidad <input className="mk-qty" type="number" min={1} max={sel.max} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /> <small>de {sel.max}</small></label>
            )}
            <label>Precio c/u <input className="mk-qty mk-qty--wide" type="number" min={1} value={form.price} placeholder={avg ? String(avg) : ''} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></label>
            <label>Moneda
              <select className="mk-select" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
              </select>
            </label>
            <div className="mk-history">
              <b>Últimas ventas</b>
              {history === null ? <small>Buscando…</small> : history.length ? (
                <>
                  <small>Promedio: <Price amount={avg} currency={history[0].currency} /> c/u ({history.length} ventas)</small>
                  {history.slice(0, 4).map((h, i) => <small key={i}>{h.quantity}x a <Price amount={h.pricePerUnit} currency={h.currency} /> · {new Date(h.soldAt).toLocaleDateString()}</small>)}
                </>
              ) : <small>Nadie lo ha vendido todavía: tú pones el precio.</small>}
            </div>
            <small className="mk-fee">El mercado cobra un 5% de comisión cuando se vende.</small>
            <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={publish}>{busy ? 'Publicando…' : 'Publicar'}</button>
          </>
        )}
      </div>
    </div>
  );
}

function Mias({ onMsg }) {
  const { player, token } = useAuth();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => api.getMyMarketListings(player.id, token).then(setList).catch((e) => onMsg(e.message, false)), [player, token, onMsg]);
  useEffect(() => { load(); }, [load]);
  const cancel = async (l) => {
    setBusy(l.id);
    try { const r = await api.cancelMarketListing(player.id, l.id, token); onMsg(r.message, true); load(); } catch (e) { onMsg(e.message, false); }
    setBusy(null);
  };
  if (!list) return <p className="wp-empty">Cargando…</p>;
  if (!list.length) return <p className="wp-empty">Todavía no publicaste nada.</p>;
  return (
    <div className="mk-list">
      {list.map((l) => {
        const d = describe(l);
        return (
          <div key={l.id} className={`mk-row mk-rar-${d.rarity}${l.status !== 'ACTIVE' ? ' is-done' : ''}`}>
            <span className="mk-icon">{d.icon}</span>
            <span className="mk-name"><b>{d.name}{l.quantity > 1 ? ` x${l.quantity}` : ''}</b><small>{d.sub}</small></span>
            <span className="mk-buy">
              <Price amount={l.total_price} currency={l.currency} />
              {l.status === 'ACTIVE' && <button type="button" className="wp-btn" disabled={busy === l.id} onClick={() => cancel(l)}>Cancelar</button>}
              {l.status === 'SOLD' && <small className="mk-sold">Vendido a {l.buyer_nickname}</small>}
              {l.status === 'CANCELLED' && <small>Cancelada</small>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function MarketPanel(props) {
  const [tab, setTab] = useState('comprar');
  const [msg, setMsg] = useState(null);
  const onMsg = useCallback((text, ok) => {
    setMsg({ text, ok });
    if (ok) props.onChanged?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(null), 4500); return () => clearTimeout(t); }, [msg]);
  return (
    <FloatingPanel
      {...props}
      id="mercado"
      title="Mercado"
      icon={<GameIcon name="shop" artist="delapouite" />}
      width={640}
      footer={(
        <>
          <span className={`wp-bag-msg${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>{msg?.text ?? 'Compra y vende con otros jugadores'}</span>
          <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {Number(props.gold ?? 0).toLocaleString()}</span>
        </>
      )}
    >
      <div className="bs-tabs" role="tablist">
        {[['comprar', 'Comprar'], ['vender', 'Vender'], ['mias', 'Mis publicaciones']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'comprar' && <Comprar onMsg={onMsg} gold={props.gold} />}
      {tab === 'vender' && <Vender onMsg={onMsg} />}
      {tab === 'mias' && <Mias onMsg={onMsg} />}
    </FloatingPanel>
  );
}
