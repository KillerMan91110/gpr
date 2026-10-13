import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { EntryIcon } from './AttachPicker';
import { RARITY_LABELS } from './itemIcons';
import { RARITY_LABEL } from './coleccionArt';
import './Puestos.css';

export const LOOK_ROW = { oso: 0, conejo: 1, gato: 2 };
export const LOOK_NAME = { oso: 'Osito', conejo: 'Conejito', gato: 'Gatito' };

// El muñeco dibujado (hoja munecos.png: una fila por aspecto)
export function Doll({ look = 'oso', scale = 2, frame = 0 }) {
  const row = LOOK_ROW[look] ?? 0;
  return (
    <span
      className="pu-doll"
      style={{
        width: 32 * scale, height: 32 * scale,
        backgroundImage: `url(${process.env.PUBLIC_URL}/assets/mundo/puestos/munecos.png)`,
        backgroundSize: `${64 * scale}px ${96 * scale}px`,
        backgroundPosition: `${-frame * 32 * scale}px ${-row * 32 * scale}px`,
      }}
      aria-hidden="true"
    />
  );
}

export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'recogiendo sus cosas';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h} h ${m} min` : `${m} min`;
}

const Coins = ({ value }) => <span className="wp-coins"><GameIcon name="two-coins" artist="delapouite" /> {Number(value ?? 0).toLocaleString()}</span>;

// Puesto de otro jugador: lo que vende su muñeco, al precio que puso
export default function StallPanel({ args, onChanged, gold, openWindow, ...props }) {
  const { player, token } = useAuth();
  const { socket } = useSocket() ?? {};
  const stallId = args?.stallId;
  const [view, setView] = useState(null);
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!stallId) return;
    api.getPuesto(player.id, stallId, token).then(setView).catch((err) => setMsg({ ok: false, text: err.message }));
  }, [player, token, stallId]);
  useEffect(() => { setSel(null); load(); }, [load]);

  // otro compró algo o el dueño lo cerró
  useEffect(() => {
    if (!socket) return undefined;
    const onChange = (c) => { if (!c?.stallId || c.stallId === stallId) load(); };
    socket.on('stalls:changed', onChange);
    return () => socket.off('stalls:changed', onChange);
  }, [socket, stallId, load]);

  const entries = (view?.entries ?? []).filter((e) => e.quantity > 0);
  const chosen = entries.find((e) => e.id === sel) ?? null;
  const mine = view?.ownerId === player.id;
  const total = chosen ? chosen.price * qty : 0;

  const buy = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    try {
      const r = await api.comprarEnPuesto(player.id, stallId, chosen.id, qty, token);
      audio.sfx('monedas');
      setMsg({ ok: true, text: r.message });
      setQty(1);
      onChanged?.();
      load();
    } catch (err) {
      audio.sfx('error');
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FloatingPanel
      {...props}
      id="puesto"
      title={view ? `Puesto de ${view.owner}` : 'Puesto'}
      icon={<GameIcon name="matryoshka-dolls" artist="delapouite" />}
      width={460}
      footer={(
        <div className="wp-tabs">
          <span className={`wp-foot-note${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>{msg?.text ?? 'Elige algo y cuántos quieres.'}</span>
          <span className="wp-currency" title="Tu oro"><Coins value={gold} /></span>
        </div>
      )}
    >
      {!view && !msg && <p className="wp-empty">El muñeco te mira con sus ojos de botón…</p>}
      {view && (
        <>
          <header className="pu-head">
            <Doll look={view.look} scale={2} />
            <div>
              <strong className="pu-sign">«{view.title}»</strong>
              <small>{LOOK_NAME[view.look] ?? 'Muñeco'} de {view.owner} · {view.open ? `atiende ${timeLeft(view.expiresAt)} más` : 'ya cerró'}</small>
            </div>
          </header>
          {mine && (
            <p className="pu-note">
              Es tu muñeco. <button type="button" className="wp-link" onClick={() => openWindow?.('mi_puesto')}>Ver tus ventas</button>
            </p>
          )}
          {view.open && entries.length === 0 && <p className="wp-empty">¡Lo vendió todo! Vuelve otro día.</p>}
          <div className="pu-wares">
            {entries.map((e) => (
              <button key={e.id} type="button" className={`pu-ware${e.id === sel ? ' is-on' : ''}`} onClick={() => { setSel(e.id); setQty(1); }}>
                <EntryIcon e={e} />
                <span className="pu-ware-info">
                  <span className={`wp-text-${(e.rarity || 'comun').toLowerCase()}`}>{e.name}{e.enchantLevel ? ` +${e.enchantLevel}` : ''}</span>
                  <small>{e.kind === 'card' ? `${RARITY_LABEL[e.rarity] ?? ''} · ${e.text}` : (RARITY_LABELS[e.rarity] ?? '')} · quedan {e.quantity}</small>
                </span>
                <Coins value={e.price} />
              </button>
            ))}
          </div>
          {chosen && !mine && (
            <div className="pu-buy">
              <label>
                Cantidad
                <input type="number" min="1" max={chosen.quantity} value={qty}
                  onChange={(ev) => setQty(Math.max(1, Math.min(chosen.quantity, Math.floor(Number(ev.target.value) || 1))))} />
              </label>
              <span>Total <Coins value={total} /></span>
              <button type="button" className="wp-btn wp-btn--gold" disabled={busy || total > Number(gold ?? 0)} onClick={buy}>
                {total > Number(gold ?? 0) ? 'No te alcanza' : 'Comprar'}
              </button>
            </div>
          )}
        </>
      )}
    </FloatingPanel>
  );
}
