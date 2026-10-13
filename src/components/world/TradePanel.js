import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, RARITY_LABELS } from './itemIcons';
import { CardIcon, RARITY_LABEL } from './coleccionArt';
import './BestiarioPanel.css';
import './TradePanel.css';

const MAX_SLOTS = 8;
const ICON = `${process.env.PUBLIC_URL}/assets/mundo/comercio.png`;
const keyOf = (i) => (i.kind === 'card' ? `c:${i.monsterId}` : `${i.itemId}:${i.enchantLevel ?? 0}:${i.qualityTier ?? 0}`);
// lo que se manda al servidor de cada casilla
const wire = (i) => (i.kind === 'card'
  ? { kind: 'card', monsterId: i.monsterId, quantity: i.quantity }
  : { itemId: i.itemId, enchantLevel: i.enchantLevel, qualityTier: i.qualityTier, quantity: i.quantity });

// Una casilla de la oferta (tuya o del otro)
function OfferSlot({ it, onClick, onContext, onHover }) {
  if (!it) return <span className="wp-slot wp-slot--empty tp-slot" />;
  const events = {
    onClick,
    onContextMenu: (e) => { e.preventDefault(); onContext?.(); },
    onMouseMove: (e) => onHover?.({ it, x: e.clientX, y: e.clientY }),
    onMouseLeave: () => onHover?.(null),
  };
  if (it.kind === 'card') {
    return (
      <button type="button" className={`wp-slot wp-card-slot wp-card-slot--${(it.rarity || 'COMMON').toLowerCase()} tp-slot`} {...events}>
        <CardIcon rarity={it.rarity} />
        {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
      </button>
    );
  }
  const icon = iconForItem({ name: it.name, slot: it.slot, item_type: it.itemType });
  const rarity = (it.rarity || 'COMUN').toLowerCase();
  return (
    <button
      type="button"
      className={`wp-slot wp-rarity-${rarity} tp-slot`}
      {...events}
    >
      <GameIcon name={icon.name} artist={icon.artist} />
      {it.enchantLevel > 0 && <span className="wp-slot-enchant">+{it.enchantLevel}</span>}
      {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
    </button>
  );
}

// Ventana de comercio entre dos jugadores (al estilo WoW, con la confirmación de RuneScape):
// tu oferta y la del otro lado a lado, tu mochila abajo. "Listo" pone tu lado en verde; cualquier
// cambio lo apaga para los dos. Con los dos listos, una pantalla de confirmación que ya no deja
// cambiar nada. Lo que el otro QUITA de su oferta queda marcado en rojo.
export default function TradePanel({ args, onChanged, gold, ...props }) {
  const { player, token } = useAuth();
  const { socket } = useSocket() ?? {};
  const [trade, setTrade] = useState(args?.trade ?? null);
  const [bag, setBag] = useState(null);
  const [cards, setCards] = useState(null);
  const [bagTab, setBagTab] = useState('mochila');
  const [goldInput, setGoldInput] = useState('');
  const [note, setNote] = useState(null);
  const [hover, setHover] = useState(null);
  const [flash, setFlash] = useState(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  const loadBag = useCallback(() => {
    api.getPlayerInventory(player.id, token).then(setBag).catch(() => setBag([]));
    api.getCartas(player.id, token).then((r) => setCards(r.owned ?? [])).catch(() => setCards([]));
  }, [player, token]);
  useEffect(() => { loadBag(); }, [loadBag]);

  const say = (text, ok = false) => { setNote({ text, ok }); };
  const emit = useCallback((ev, data = {}) => new Promise((resolve) => {
    socket?.emit(ev, data, (r) => {
      if (r?.error) { say(r.error); audio.sfx('error'); }
      resolve(r);
    });
  }), [socket]);

  // estado del comercio que manda el servidor
  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (t) => {
      setTrade((prev) => {
        // el otro quitó algo: se avisa con un parpadeo rojo
        if (prev && t.them.removed.length > prev.them.removed.length) { setFlash(true); audio.sfx('penalizacion'); setTimeout(() => setFlash(false), 1600); }
        return t;
      });
      setGoldInput((g) => (g === '' ? String(t.me.gold || '') : g));
    };
    const onClosed = ({ reason, by }) => {
      closingRef.current = true;
      bus.emit('social-toast', { text: by ? `Comercio cancelado: ${by} ${reason === 'cancelado' ? 'lo canceló' : reason}.` : `Comercio cancelado: ${reason}.`, kind: 'error' });
      onCloseRef.current?.();
    };
    const onDone = (s) => {
      closingRef.current = true;
      const parts = [...s.received.items.map((i) => `${i.quantity}x ${i.name}`), ...(s.received.gold ? [`${s.received.gold.toLocaleString()} de oro`] : [])];
      bus.emit('social-toast', { text: `¡Comercio con ${s.with} completado! Recibiste: ${parts.join(', ') || 'nada'}.`, kind: 'ok' });
      audio.sfx('monedas');
      onChanged?.();
      onCloseRef.current?.();
    };
    socket.on('trade:update', onUpdate);
    socket.on('trade:open', onUpdate);
    socket.on('trade:closed', onClosed);
    socket.on('trade:done', onDone);
    return () => {
      socket.off('trade:update', onUpdate);
      socket.off('trade:open', onUpdate);
      socket.off('trade:closed', onClosed);
      socket.off('trade:done', onDone);
    };
  }, [socket, onChanged]);

  // si entras en combate, el comercio se cancela
  useEffect(() => {
    const onEncounter = () => { emit('trade:cancel'); };
    bus.on('encounter', onEncounter);
    return () => bus.off('encounter', onEncounter);
  }, [emit]);

  // cerrar la ventana = cancelar (salvo que ya lo cerró el servidor)
  const close = () => {
    if (!closingRef.current) emit('trade:cancel');
    props.onClose?.();
  };

  const mine = trade?.me;
  const theirs = trade?.them;
  const offered = useMemo(() => new Map((mine?.items ?? []).map((i) => [keyOf(i), i.quantity])), [mine]);

  // lo que queda en la mochila (descontando lo ofrecido)
  const bagLeft = useMemo(() => (bag ?? [])
    .filter((b) => b.quantity > 0)
    .map((b) => {
      const k = keyOf({ itemId: b.item_id, enchantLevel: b.enchant_level, qualityTier: b.quality_tier });
      return { ...b, left: b.quantity - (offered.get(k) ?? 0) };
    })
    .filter((b) => b.left > 0), [bag, offered]);

  // cartas sueltas del álbum (las engarzadas no aparecen: hay que quitarlas primero)
  const cardsLeft = useMemo(() => (cards ?? [])
    .map((c) => ({ ...c, left: c.quantity - (offered.get(`c:${c.monsterId}`) ?? 0) }))
    .filter((c) => c.left > 0), [cards, offered]);

  const sendOffer = (items, g = Number(goldInput) || 0) => emit('trade:offer', { items: items.map(wire), gold: g });

  // agrega una entrada (objeto o carta) a tu oferta, sumando si ya estaba
  const addEntry = (entry, add) => {
    if (trade?.stage !== 'offer') return;
    const items = (mine?.items ?? []).map((i) => ({ ...i }));
    const cur = items.find((i) => keyOf(i) === keyOf(entry));
    if (cur) cur.quantity += add;
    else {
      if (items.length >= MAX_SLOTS) { say(`Puedes ofrecer hasta ${MAX_SLOTS} cosas`); return; }
      items.push({ ...entry, quantity: add });
    }
    audio.sfx('clic');
    sendOffer(items);
  };

  const addCard = (c, all = false) => addEntry({ kind: 'card', monsterId: c.monsterId }, all ? c.left : 1);

  const addFromBag = (b, all = false) => addEntry(
    { itemId: b.item_id, enchantLevel: b.enchant_level ?? 0, qualityTier: b.quality_tier ?? 0 },
    all ? b.left : 1,
  );

  const removeFromOffer = (it, all = false) => {
    if (trade?.stage !== 'offer') return;
    const items = (mine?.items ?? [])
      .map((i) => (keyOf(i) === keyOf(it) ? { ...i, quantity: all ? 0 : i.quantity - 1 } : i))
      .filter((i) => i.quantity > 0);
    audio.sfx('clic');
    sendOffer(items);
  };

  const applyGold = () => {
    const g = Math.max(0, Math.floor(Number(goldInput) || 0));
    if (g === (mine?.gold ?? 0)) return;
    if (g > Number(gold ?? 0)) { say('No tienes tanto oro'); return; }
    sendOffer(mine?.items ?? [], g);
  };

  const summary = (o) => [
    ...o.items.map((i) => `${i.quantity.toLocaleString()}x ${i.name}${i.enchantLevel ? ` +${i.enchantLevel}` : ''}`),
    ...(o.gold ? [`${o.gold.toLocaleString()} de oro`] : []),
  ];

  const pane = (side, who, isMine) => (
    <section className={`tp-pane${side.ready ? ' is-ready' : ''}${side.confirmed ? ' is-confirmed' : ''}${!isMine && flash ? ' is-flash' : ''}`}>
      <header>
        <strong>{isMine ? 'Tu oferta' : `Oferta de ${who}`}</strong>
        <small>{side.confirmed ? '✓ Confirmó' : side.ready ? '✓ Listo' : 'Ofreciendo…'}</small>
      </header>
      <div className="tp-grid">
        {Array.from({ length: MAX_SLOTS }, (_, i) => {
          const it = side.items[i];
          return (
            <OfferSlot
              key={it ? keyOf(it) : `v${i}`}
              it={it}
              onHover={setHover}
              onClick={isMine && it ? () => removeFromOffer(it) : undefined}
              onContext={isMine && it ? () => removeFromOffer(it, true) : undefined}
            />
          );
        })}
      </div>
      <div className="tp-gold">
        <GameIcon name="two-coins" artist="delapouite" />
        {isMine
          ? <input type="number" min="0" value={goldInput} placeholder="0" disabled={trade?.stage !== 'offer'} onChange={(e) => setGoldInput(e.target.value)} onBlur={applyGold} onKeyDown={(e) => e.key === 'Enter' && applyGold()} />
          : <b>{Number(side.gold || 0).toLocaleString()}</b>}
      </div>
      {!isMine && side.removed.length > 0 && (
        <p className="tp-removed" title="Revisa bien la oferta antes de aceptar">
          ⚠ Quitó: {side.removed.map((r) => (r.gold ? `${r.gold.toLocaleString()} de oro` : `${r.quantity}x ${r.name}`)).join(', ')}
        </p>
      )}
    </section>
  );

  return (
    <FloatingPanel
      {...props}
      onClose={close}
      id="comercio"
      title={theirs ? `Comercio con ${theirs.name}` : 'Comercio'}
      icon={<img className="tp-icon" src={ICON} alt="" />}
      width={620}
      footer={trade && (
        <div className="wp-tabs">
          {trade.stage === 'offer' && (
            mine.ready
              ? <button type="button" className="wp-btn" onClick={() => emit('trade:unready')}>Cambiar mi oferta</button>
              : <button type="button" className="wp-btn wp-btn--gold" onClick={() => { audio.sfx('clic'); emit('trade:ready'); }}>Listo</button>
          )}
          {trade.stage === 'confirm' && (
            <>
              <button type="button" className="wp-btn wp-btn--gold" disabled={mine.confirmed} onClick={() => { audio.sfx('clic'); emit('trade:confirm'); }}>
                {mine.confirmed ? 'Esperando…' : 'Aceptar intercambio'}
              </button>
              <button type="button" className="wp-btn" onClick={() => emit('trade:unready')}>Volver a la oferta</button>
            </>
          )}
          <span className={`wp-foot-note${note ? (note.ok ? ' ok' : ' err') : ''}`}>
            {note?.text ?? (trade.stage === 'confirm' ? 'Revisa bien lo que recibes y lo que das.' : theirs.ready && !mine.ready ? `${theirs.name} está listo.` : '')}
          </span>
          <button type="button" className="wp-btn tp-cancel" onClick={close}>Cancelar</button>
        </div>
      )}
    >
      {!trade && <p className="wp-empty">Abriendo el comercio…</p>}
      {trade && trade.stage !== 'confirm' && (
        <>
          <div className="tp-panes">
            {pane(mine, player.nickname, true)}
            <span className="tp-swap" aria-hidden="true">⇄</span>
            {pane(theirs, theirs.name, false)}
          </div>
          <div className="tp-bag-head">
            <div className="wp-tabs">
              <button type="button" className={`wp-tab${bagTab === 'mochila' ? ' wp-tab--active' : ''}`} onClick={() => setBagTab('mochila')}>Mochila</button>
              <button type="button" className={`wp-tab${bagTab === 'cartas' ? ' wp-tab--active' : ''}`} onClick={() => setBagTab('cartas')}>Cartas</button>
            </div>
            <small>clic: agregar 1 · clic derecho: toda la pila · clic en tu oferta: quitar</small>
          </div>
          {bagTab === 'cartas' && (
            <div className="tp-bag">
              {cards === null && <p className="wp-empty">Cargando…</p>}
              {cards && cardsLeft.length === 0 && <p className="wp-empty">No tienes cartas sueltas. Las engarzadas hay que quitarlas en el álbum para comerciarlas.</p>}
              {cardsLeft.map((c) => (
                <button
                  key={c.monsterId}
                  type="button"
                  className={`wp-slot wp-card-slot wp-card-slot--${c.rarity.toLowerCase()}`}
                  disabled={trade.stage !== 'offer'}
                  onClick={() => addCard(c)}
                  onContextMenu={(e) => { e.preventDefault(); addCard(c, true); }}
                  onMouseMove={(e) => setHover({ it: { ...c, kind: 'card', name: `Carta de ${c.name}` }, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                >
                  <CardIcon rarity={c.rarity} />
                  {c.left > 1 && <span className="wp-slot-qty">{c.left}</span>}
                </button>
              ))}
            </div>
          )}
          {bagTab === 'mochila' && <div className="tp-bag">
            {bag === null && <p className="wp-empty">Cargando…</p>}
            {bag && bagLeft.length === 0 && <p className="wp-empty">No te queda nada para ofrecer.</p>}
            {bagLeft.map((b) => {
              const icon = iconForItem(b);
              const rarity = (b.effective_rarity || b.rarity || 'COMUN').toLowerCase();
              return (
                <button
                  key={b.inventory_id}
                  type="button"
                  className={`wp-slot wp-rarity-${rarity}`}
                  disabled={trade.stage !== 'offer'}
                  onClick={() => addFromBag(b)}
                  onContextMenu={(e) => { e.preventDefault(); addFromBag(b, true); }}
                  onMouseMove={(e) => setHover({ it: { itemId: b.item_id, name: b.name, rarity: b.rarity, itemType: b.item_type, slot: b.slot, enchantLevel: b.enchant_level, qualityTier: b.quality_tier }, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                >
                  <GameIcon name={icon.name} artist={icon.artist} />
                  {b.enchant_level > 0 && <span className="wp-slot-enchant">+{b.enchant_level}</span>}
                  {b.left > 1 && <span className="wp-slot-qty">{b.left}</span>}
                </button>
              );
            })}
          </div>}
        </>
      )}
      {trade && trade.stage === 'confirm' && (
        // segundo paso (como en RuneScape): todo con su cantidad exacta y ya sin poder cambiar
        <div className="tp-confirm">
          <img src={ICON} alt="" />
          <div className="tp-confirm-cols">
            <section>
              <h5>Recibes de {theirs.name}</h5>
              {summary(theirs).length ? <ul>{summary(theirs).map((t) => <li key={t}>{t}</li>)}</ul> : <p className="wp-empty">Nada</p>}
            </section>
            <section>
              <h5>Das</h5>
              {summary(mine).length ? <ul>{summary(mine).map((t) => <li key={t}>{t}</li>)}</ul> : <p className="wp-empty">Nada</p>}
            </section>
          </div>
          {theirs.removed.length > 0 && <p className="tp-removed">⚠ {theirs.name} quitó cosas de su oferta antes de este paso. Revisa que sea lo acordado.</p>}
          <p className="tp-status">{theirs.confirmed ? `${theirs.name} ya aceptó.` : `Esperando a que ${theirs.name} acepte…`}</p>
        </div>
      )}
      {hover?.it.kind === 'card' && (
        <div className="wp-card-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <b>{hover.it.name}</b>
          <small>{RARITY_LABEL[hover.it.rarity]} · {hover.it.label}</small>
          <span>{hover.it.text}</span>
        </div>
      )}
      {hover && hover.it.kind !== 'card' && (
        <ItemTooltip
          item={{ itemId: hover.it.itemId, name: hover.it.name, rarity: hover.it.rarity, itemType: hover.it.itemType, slot: hover.it.slot, enchantLevel: hover.it.enchantLevel, qualityTier: hover.it.qualityTier }}
          x={hover.x}
          y={hover.y}
          token={token}
          hint={RARITY_LABELS[hover.it.rarity] ?? ''}
        />
      )}
    </FloatingPanel>
  );
}
