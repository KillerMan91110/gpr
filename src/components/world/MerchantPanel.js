import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import ItemIcon from './ItemIcon';
import audio from '../../game/audio';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, RARITY_LABELS } from './itemIcons';
import SeleccionMochila from './SeleccionMochila';


const ARTISAN_ICON = {
  alquimista: ['fizzing-flask', 'lorc'],
  cocinero: ['cooking-pot', 'delapouite'],
  herrero: ['anvil', 'lorc'],
  joyero: ['gem-pendant', 'lorc'],
  peletero: ['animal-hide', 'delapouite'],
  sastre: ['sewing-needle', 'lorc'],
  fuego: ['shop', 'delapouite'],
  marino: ['shop', 'delapouite'],
};
const iconOfArtisan = (a) => ARTISAN_ICON[(a.specialty || '').toLowerCase()] ?? ['shop', 'delapouite'];
// mercaderes de una zona (solo aparecen ahí): su retrato, cómo se presentan y su saludo
const LOCAL_MERCHANT = {
  MERCADER_ASCUARIA: { portrait: 'marga', role: 'Mercader de Ascuaria', greeting: '«Lo del volcán, sin meter la mano en la lava. ¿Qué te llevas?»' },
  MERCADER_PUERTO: { portrait: 'salitre', role: 'Mercader del Puerto Antiguo', greeting: '«Todo lo que escupe el mar, seco y sin arena. Casi sin arena.»' },
  MERCADER_SANTUARIO: { portrait: 'casio', role: 'El último peregrino', greeting: '«Tres años siguiendo una canción, y mira: terminé vendiendo pan. ¿Qué te llevas?»' },
};
const PORTRAITS = `${process.env.PUBLIC_URL}/assets/mundo/retratos`;
function ArtisanFace({ a }) {
  const local = LOCAL_MERCHANT[a.code];
  if (local?.portrait) return <img className="wp-merchant-face" src={`${PORTRAITS}/${local.portrait}.png`} alt="" />;
  const [n, ar] = iconOfArtisan(a);
  return <GameIcon name={n} artist={ar} />;
}

const ROWS_PER_PAGE = 10;
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '');

function Coins({ value }) {
  return (
    <span className="wp-coins">
      <GameIcon name="two-coins" artist="delapouite" /> {Number(value ?? 0).toLocaleString()}
    </span>
  );
}

function QtyStepper({ value, max, onChange }) {
  const set = (v) => onChange(Math.max(1, Math.min(max, Number(v) || 1)));
  return (
    <span className="wp-qty">
      <button type="button" onClick={() => set(value - 1)} disabled={value <= 1}>−</button>
      <input type="number" min={1} max={max} value={value} onChange={(e) => set(e.target.value)} />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max}>+</button>
      <button type="button" className="wp-qty-max" onClick={() => set(max)} disabled={value >= max}>Máx</button>
    </span>
  );
}

// Tienda de los artesanos al estilo del mercader de un MMO: los artesanos son pestañas con su
// retrato a la izquierda, la mercancía en casillas con precio y, abajo, Comprar / Vender.
export default function MerchantPanel({ gold, onChanged, onClose, zIndex, onActivate, defaultPos }) {
  const { player, token } = useAuth();
  const [artisans, setArtisans] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [tab, setTab] = useState('buy');
  const [artisanCode, setArtisanCode] = useState(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [hover, setHover] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [art, inv] = await Promise.all([api.getArtisanShop(player.id, token), api.getPlayerInventory(player.id, token)]);
    setArtisans(art);
    setInventory(inv);
    setArtisanCode((c) => c ?? art[0]?.code ?? null);
  }, [player, token]);

  useEffect(() => { load().catch((err) => setMessage({ ok: false, text: err.message })); }, [load]);

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const artisan = artisans?.find((a) => a.code === artisanCode);
  const stock = artisan?.shop ?? [];
  const pages = Math.max(1, Math.ceil(stock.length / ROWS_PER_PAGE));
  const shown = stock.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const sellable = useMemo(
    () => (inventory ?? []).filter((i) => i.quantity > 0 && i.sell_artisan),
    [inventory],
  );

  // Vender: se eligen una o varias casillas (components/world/SeleccionMochila.js). «Marcar lo que no usas» elige
  // lo que gprback/lib/mochila.js marca como `sobra`; con una sola elegida se puede ajustar la cantidad.
  const sobra = useMemo(() => sellable.filter((i) => i.sobra), [sellable]);
  const [vSel, setVSel] = useState(() => new Map());
  const [vFiltro, setVFiltro] = useState('');
  const elegidas = sellable.filter((i) => vSel.has(i.inventory_id));
  const totalVenta = elegidas.reduce((t, i) => t + i.sell_artisan * (vSel.get(i.inventory_id) ?? 0), 0);
  const unaSola = elegidas.length === 1 ? elegidas[0] : null;
  const sellSelected = async () => {
    if (!elegidas.length || busy) return;
    setBusy(true);
    try {
      // una línea por objeto y encantamiento (las calidades distintas se juntan)
      const by = new Map();
      for (const i of elegidas) {
        const k = `${i.item_id}:${i.enchant_level ?? 0}`;
        by.set(k, { itemId: i.item_id, enchantLevel: i.enchant_level ?? 0, quantity: (by.get(k)?.quantity ?? 0) + (vSel.get(i.inventory_id) ?? 0) });
      }
      const r = await api.sellArtisanBatch(player.id, [...by.values()], token);
      audio.sfx('moneda');
      setMessage({ ok: true, text: r.message });
      setVSel(new Map());
      await load();
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const pick = (sel) => { setSelected(sel); setQty(1); };
  const switchTab = (t) => { setTab(t); setSelected(null); setVSel(new Map()); };

  const buy = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const r = await api.buyArtisanItem(player.id, artisan.code, selected.itemCode, qty, token);
      audio.sfx('moneda');
      setMessage({ ok: true, text: r.message });
      await load();
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const tooltipFor = (it) => ({
    itemId: it.itemId ?? it.item_id,
    name: it.name,
    rarity: it.rarity,
    itemType: it.item_type,
    slot: it.slot,
    enchantLevel: it.enchant_level,
    qualityTier: it.quality_tier,
  });

  const maxBuy = selected && tab === 'buy' ? Math.max(1, Math.min(99, Math.floor((gold ?? 0) / Math.max(1, selected.price)))) : 1;

  return (
    <FloatingPanel
      id="artesanos"
      title="Artesanos del gremio"
      icon={<GameIcon name="shop" artist="delapouite" />}
      width={640}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={(
        <>
          <div className="wp-tabs">
            <button type="button" className={`wp-tab${tab === 'buy' ? ' wp-tab--active' : ''}`} onClick={() => switchTab('buy')}>Comprar</button>
            <button type="button" className={`wp-tab${tab === 'sell' ? ' wp-tab--active' : ''}`} onClick={() => switchTab('sell')}>Vender</button>
            <span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text}</span>
            <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {Number(gold ?? 0).toLocaleString()}</span>
          </div>
        </>
      )}
    >
      {!artisans && <p className="wp-empty">Cargando…</p>}
      {artisans && (
        <div className="wp-merchant">
          {/* artesanos: pestañas verticales con su oficio */}
          {tab === 'buy' && (
            <nav className="wp-merchant-rail">
              {artisans.map((a) => {
                return (
                  <button
                    key={a.code}
                    type="button"
                    className={`wp-rail-btn${a.code === artisanCode ? ' wp-rail-btn--active' : ''}`}
                    title={`${a.name} · ${cap(a.specialty)}`}
                    onClick={() => { setArtisanCode(a.code); setPage(0); setSelected(null); }}
                  >
                    <ArtisanFace a={a} />
                  </button>
                );
              })}
            </nav>
          )}

          <div className="wp-merchant-main">
            {tab === 'buy' && artisan && (
              <>
                <header className="wp-merchant-head">
                  <span className="wp-merchant-portrait"><ArtisanFace a={artisan} /></span>
                  <div>
                    <strong>{artisan.name}</strong>
                    <small>
                      {LOCAL_MERCHANT[artisan.code]?.role ?? cap(artisan.specialty)} · {LOCAL_MERCHANT[artisan.code]?.greeting ?? '«¿Qué necesitas hoy, aventurero?»'}
                    </small>
                  </div>
                </header>
                <div className="wp-merchant-grid">
                  {shown.map((it) => {
                    const icon = iconForItem(it);
                    const rarity = (it.rarity || 'COMUN').toLowerCase();
                    const isSel = selected?.itemCode === it.itemCode;
                    const tooExpensive = it.price > (gold ?? 0);
                    return (
                      <button
                        key={it.itemCode}
                        type="button"
                        className={`wp-ware${isSel ? ' wp-ware--sel' : ''}${tooExpensive ? ' wp-ware--poor' : ''}`}
                        onClick={() => pick(it)}
                        onDoubleClick={() => { pick(it); }}
                        onMouseMove={(e) => setHover({ it, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHover(null)}
                      >
                        <span className={`wp-slot wp-rarity-${rarity}`}>
                          <ItemIcon icon={icon} />
                          {it.playerOwns > 0 && <span className="wp-slot-qty">{it.playerOwns}</span>}
                        </span>
                        <span className="wp-ware-info">
                          <span className={`wp-ware-name wp-text-${rarity}`}>{it.name}</span>
                          <Coins value={it.price} />
                        </span>
                      </button>
                    );
                  })}
                  {Array.from({ length: Math.max(0, ROWS_PER_PAGE - shown.length) }, (_, i) => (
                    <span key={`v-${i}`} className="wp-ware wp-ware--empty"><span className="wp-slot wp-slot--empty" /></span>
                  ))}
                </div>
                {pages > 1 && (
                  <div className="wp-pager">
                    <button type="button" className="wp-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>◂</button>
                    <span>Página {page + 1} de {pages}</span>
                    <button type="button" className="wp-btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>▸</button>
                  </div>
                )}
              </>
            )}

            {tab === 'sell' && (
              <>
                <header className="wp-merchant-head">
                  <span className="wp-merchant-portrait"><GameIcon name="money-stack" artist="delapouite" /></span>
                  <div>
                    <strong>Vender a los artesanos</strong>
                    <small>Clic para elegir una o varias cosas (✓). Lo equipado y lo que tiene candado 🔒 no se vende.</small>
                  </div>
                </header>
                <SeleccionMochila
                  items={sellable}
                  sel={vSel}
                  onChange={setVSel}
                  filtro={vFiltro}
                  onFiltro={setVFiltro}
                  onHover={setHover}
                  vacio="No tienes nada de esa rareza para vender."
                  atajos={[{
                    label: `Marcar lo que no usas (${sobra.length})`,
                    title: 'Equipo de otra clase o peor que el tuyo, y botín que ninguna receta ni misión pide',
                    disabled: !sobra.length,
                    onClick: () => setVSel(new Map(sobra.map((i) => [i.inventory_id, i.quantity]))),
                  }]}
                />
              </>
            )}

            {/* barra de la transacción: lo elegido, cantidad y total */}
            {tab === 'buy' && (
              <div className={`wp-deal${selected ? '' : ' wp-deal--idle'}`}>
                {!selected && <span className="wp-deal-hint">Elige una mercancía para comprarla.</span>}
                {selected && (
                  <>
                    <span className={`wp-deal-name wp-text-${(selected.rarity || 'COMUN').toLowerCase()}`}>
                      {selected.name}
                      <small>{RARITY_LABELS[selected.rarity] ?? selected.rarity}</small>
                    </span>
                    <QtyStepper value={qty} max={maxBuy} onChange={setQty} />
                    <span className="wp-deal-total">Total <Coins value={selected.price * qty} /></span>
                    <button type="button" className="wp-btn wp-btn--gold" disabled={busy || selected.price * qty > (gold ?? 0)} onClick={buy}>Comprar</button>
                  </>
                )}
              </div>
            )}
            {tab === 'sell' && (
              <div className={`wp-deal${elegidas.length ? '' : ' wp-deal--idle'}`}>
                {!elegidas.length && <span className="wp-deal-hint">Elige una o varias cosas de tu mochila para venderlas.</span>}
                {unaSola && (
                  <>
                    <span className={`wp-deal-name wp-text-${(unaSola.rarity || 'COMUN').toLowerCase()}`}>
                      {unaSola.name}
                      <small>{RARITY_LABELS[unaSola.rarity] ?? unaSola.rarity} · tienes {unaSola.quantity}</small>
                    </span>
                    <QtyStepper value={vSel.get(unaSola.inventory_id)} max={unaSola.quantity}
                      onChange={(n) => setVSel(new Map([[unaSola.inventory_id, n]]))} />
                  </>
                )}
                {elegidas.length > 1 && (
                  <span className="wp-deal-name">
                    {elegidas.length} cosas elegidas
                    <small>{elegidas.reduce((t, i) => t + (vSel.get(i.inventory_id) ?? 0), 0)} unidades en total</small>
                  </span>
                )}
                {elegidas.length > 0 && (
                  <>
                    <span className="wp-deal-total">Recibes <Coins value={totalVenta} /></span>
                    <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={sellSelected}>
                      Vender{elegidas.length > 1 ? ` (${elegidas.length})` : ''}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {hover && <ItemTooltip item={tooltipFor(hover.it)} x={hover.x} y={hover.y} token={token} />}
    </FloatingPanel>
  );
}
