import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { guiar } from '../../game/cityGuide';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import AttachPicker, { EntryIcon, entryKey } from './AttachPicker';
import { Doll, LOOK_NAME, timeLeft } from './StallPanel';
import './Puestos.css';

const MUNECO = 'MUNECO_DE_VENTA';
const NO_VENDER = [MUNECO];
const Coins = ({ value }) => <span className="wp-coins"><GameIcon name="two-coins" artist="delapouite" /> {Number(value ?? 0).toLocaleString()}</span>;

// Tu muñeco de venta: armarlo (cartel, aspecto, qué vende y a cuánto) y, mientras atiende, ver lo
// que va vendiendo y recogerlo. Se planta donde estás parado, dentro del Barrio del Mercado.
export default function MyStallPanel({ onChanged, refreshKey, ...props }) {
  const { player, token } = useAuth();
  const { socket } = useSocket() ?? {};
  const [data, setData] = useState(null);
  const [dolls, setDolls] = useState(0);
  const [title, setTitle] = useState(() => `Tienda de ${player.nickname}`);
  const [look, setLook] = useState('oso');
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pickKey, setPickKey] = useState(0);

  const load = useCallback(() => {
    api.getMiPuesto(player.id, token).then(setData).catch((err) => setMsg({ ok: false, text: err.message }));
    api.getPlayerInventory(player.id, token)
      .then((inv) => setDolls(inv.filter((i) => i.code === MUNECO).reduce((n, i) => n + i.quantity, 0)))
      .catch(() => {});
  }, [player, token]);
  useEffect(() => { load(); }, [load, refreshKey]);

  // una venta nueva: se refresca la lista
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('stall:sold', load);
    return () => socket.off('stall:sold', load);
  }, [socket, load]);

  const reglas = data?.reglas;
  const puesto = data?.puesto;
  const taken = useMemo(() => new Map(entries.map((e) => [entryKey(e), e.quantity])), [entries]);

  const pick = (e, all) => {
    const key = entryKey(e);
    setEntries((list) => {
      const cur = list.find((x) => entryKey(x) === key);
      const add = all ? e.left : 1;
      if (cur) return list.map((x) => (x === cur ? { ...x, quantity: Math.min(x.max, x.quantity + add) } : x));
      if (list.length >= (reglas?.maxEntradas ?? 10)) { setMsg({ ok: false, text: `Tu muñeco puede ofrecer hasta ${reglas?.maxEntradas ?? 10} cosas.` }); return list; }
      // precio sugerido: el doble de lo que paga el artesano (o algo redondo)
      const price = e.kind === 'card' ? 150 : Math.max(5, (e.sellArtisan ?? 25) * 2);
      return [...list, { ...e, name: e.kind === 'card' ? `Carta de ${e.name}` : e.name, quantity: add, price }];
    });
    audio.sfx('clic');
  };
  const setEntry = (key, patch) => setEntries((list) => list.map((x) => (entryKey(x) === key ? { ...x, ...patch } : x)));
  const drop = (key) => setEntries((list) => list.filter((x) => entryKey(x) !== key));

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.abrirPuesto(player.id, {
        title, look,
        entries: entries.map((e) => ({
          kind: e.kind, itemId: e.itemId, monsterId: e.monsterId, enchantLevel: e.enchantLevel, qualityTier: e.qualityTier,
          quantity: e.quantity, price: e.price,
        })),
      }, token);
      audio.sfx('vinculo');
      bus.emit('social-toast', { text: `🧸 ${r.message}`, kind: 'ok' });
      setEntries([]);
      setMsg(null);
      onChanged?.();
      load();
    } catch (err) {
      audio.sfx('error');
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (busy) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('¿Recoger tu muñeco? Lo que no se vendió te llegará por correo y el muñeco se gasta.')) return;
    setBusy(true);
    try {
      const r = await api.cerrarPuesto(player.id, token);
      audio.sfx('cerrar');
      bus.emit('social-toast', { text: r.message, kind: 'ok' });
      bus.emit('mail-refresh');
      setPickKey((k) => k + 1);
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const total = entries.reduce((n, e) => n + e.quantity * e.price, 0);

  return (
    <FloatingPanel
      {...props}
      id="mi_puesto"
      title="Mi muñeco de venta"
      icon={<GameIcon name="matryoshka-dolls" artist="delapouite" />}
      width={520}
      footer={(
        <div className="wp-tabs">
          {puesto
            ? <button type="button" className="wp-btn" disabled={busy} onClick={close}>Recoger muñeco</button>
            : <button type="button" className="wp-btn wp-btn--gold" disabled={busy || !dolls || !entries.length} onClick={open}>Plantar muñeco aquí</button>}
          <span className={`wp-foot-note${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>
            {msg?.text ?? (puesto ? `Ganado hasta ahora: ${Number(puesto.earned).toLocaleString()} de oro` : `Si lo vendes todo: ${total.toLocaleString()} de oro`)}
          </span>
        </div>
      )}
    >
      {!data && <p className="wp-empty">Cargando…</p>}

      {puesto && (
        <>
          <header className="pu-head">
            <Doll look={puesto.look} scale={2} frame={1} />
            <div>
              <strong className="pu-sign">«{puesto.title}»</strong>
              <small>Atiende {timeLeft(puesto.expiresAt)} más en el Barrio del Mercado · comisión del mercado {Math.round((reglas?.comision ?? 0.03) * 100)}%</small>
            </div>
          </header>
          <div className="pu-wares">
            {puesto.entries.map((e) => (
              <div key={e.id} className={`pu-ware${e.quantity ? '' : ' is-out'}`}>
                <EntryIcon e={e} />
                <span className="pu-ware-info">
                  <span>{e.name}{e.enchantLevel ? ` +${e.enchantLevel}` : ''}</span>
                  <small>{e.quantity ? `quedan ${e.quantity}` : 'agotado'}{e.sold ? ` · vendidos ${e.sold}` : ''}</small>
                </span>
                <Coins value={e.price} />
              </div>
            ))}
          </div>
          <h5 className="pu-sub">Ventas</h5>
          {puesto.sales.length === 0 && <p className="wp-empty">Todavía nadie compró. ¡Paciencia, el muñeco no se cansa!</p>}
          <ul className="pu-sales">
            {puesto.sales.map((s) => (
              <li key={`${s.created_at}-${s.name}`}>
                <b>{s.buyer ?? 'Alguien'}</b> compró {s.quantity}x {s.name} · <Coins value={s.total - s.fee} />
              </li>
            ))}
          </ul>
        </>
      )}

      {data && !puesto && (
        <>
          <p className="pu-note">
            Pon tus cosas a la venta y tu muñeco las venderá por ti durante {reglas?.horas ?? 24} horas, aunque te desconectes.
            Párate en el <b>Barrio del Mercado de Aurelia</b> y pulsa «Plantar». Lo que no venda te llega por correo.
          </p>
          {!dolls && (
            <p className="pu-note pu-note--warn">
              No tienes ningún Muñeco de Venta. Pip el titiritero los vende por {reglas?.precioMuneco ?? 200} de oro.{' '}
              <button type="button" className="wp-link" onClick={() => guiar(['titiritero'])}>Llévame con Pip</button>
            </p>
          )}
          <div className="pu-setup">
            <label className="pu-field">
              Cartel
              <input className="pu-input" maxLength={32} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="pu-looks" role="radiogroup" aria-label="Aspecto del muñeco">
              {(reglas?.aspectos ?? ['oso', 'conejo', 'gato']).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={look === l} title={LOOK_NAME[l]}
                  className={`pu-look${look === l ? ' is-on' : ''}`} onClick={() => setLook(l)}>
                  <Doll look={l} scale={1.5} />
                </button>
              ))}
            </div>
          </div>
          <div className="pu-wares">
            {entries.length === 0 && <p className="wp-empty">Elige abajo lo que quieres vender.</p>}
            {entries.map((e) => {
              const key = entryKey(e);
              return (
                <div key={key} className="pu-ware pu-ware--edit">
                  <EntryIcon e={e} />
                  <span className="pu-ware-info"><span>{e.name}{e.enchantLevel ? ` +${e.enchantLevel}` : ''}</span><small>tienes {e.max}</small></span>
                  <label title="Cantidad">x
                    <input className="pu-input pu-num" type="number" min="1" max={e.max} value={e.quantity}
                      onChange={(ev) => setEntry(key, { quantity: Math.max(1, Math.min(e.max, Math.floor(Number(ev.target.value) || 1))) })} />
                  </label>
                  <label title="Precio por unidad"><GameIcon name="two-coins" artist="delapouite" />
                    <input className="pu-input pu-num pu-price" type="number" min="1" value={e.price}
                      onChange={(ev) => setEntry(key, { price: Math.max(1, Math.floor(Number(ev.target.value) || 1)) })} />
                  </label>
                  <button type="button" className="pu-x" aria-label={`Quitar ${e.name}`} onClick={() => drop(key)}>✕</button>
                </div>
              );
            })}
          </div>
          {/* si solo tienes un muñeco, no se ofrece: es el que vas a plantar */}
          <AttachPicker taken={taken} onPick={pick} refreshKey={`${refreshKey}-${pickKey}`} disabled={busy} exclude={dolls <= 1 ? NO_VENDER : undefined} />
        </>
      )}
    </FloatingPanel>
  );
}
