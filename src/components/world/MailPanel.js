import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import AttachPicker, { EntryIcon, entryKey } from './AttachPicker';
import './Puestos.css';

// mismas reglas que gprback/lib/correo.js
const FRANQUEO = 10;
const COMISION = 0.05;
const MAX_ADJUNTOS = 6;
const postage = (gold) => FRANQUEO + Math.ceil(Math.max(0, gold) * COMISION);

const fecha = (iso) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
const Coins = ({ value }) => <span className="wp-coins"><GameIcon name="two-coins" artist="delapouite" /> {Number(value ?? 0).toLocaleString()}</span>;

// Correo del reino. Leer y escribir texto a tus amigos se puede desde cualquier lado; mandar oro,
// objetos o cartas (o escribirle a alguien que no es tu amigo) y recoger lo adjunto, en un buzón
// (Plaza del Pilar o Aldea Espiga). El servidor manda también cartas: lo que no vendió tu muñeco,
// lo que nadie recogió y vuelve, etc.
export default function MailPanel({ args, onChanged, gold, ...props }) {
  const { player, token } = useAuth();
  const { socket } = useSocket() ?? {};
  const [tab, setTab] = useState('bandeja');
  const [inbox, setInbox] = useState(null);
  const [open, setOpen] = useState(null); // carta abierta
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  // escribir
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [goldOut, setGoldOut] = useState('');
  const [attach, setAttach] = useState([]);
  const [pickKey, setPickKey] = useState(0);

  const load = useCallback(() => {
    api.getInbox(player.id, token).then(setInbox).catch((err) => setMsg({ ok: false, text: err.message }));
  }, [player, token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('mail:new', load);
    return () => socket.off('mail:new', load);
  }, [socket, load]);

  // "Responder" / "Escribir a" desde otra ventana
  useEffect(() => {
    if (args?.to) { setTo(args.to); setTab('escribir'); }
  }, [args]);

  const read = async (m) => {
    try {
      const full = await api.getMessage(player.id, m.id, token);
      setOpen(full);
      if (!m.read) { load(); bus.emit('mail-refresh'); }
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  const claim = async () => {
    if (!open || busy) return;
    setBusy(true);
    try {
      const r = await api.claimMessage(player.id, open.id, token);
      audio.sfx('monedas');
      setMsg({ ok: true, text: r.message });
      onChanged?.();
      setPickKey((k) => k + 1);
      setOpen(await api.getMessage(player.id, open.id, token));
      load();
    } catch (err) {
      audio.sfx('error');
      setMsg({ ok: false, text: err.message });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!open) return;
    const pending = (open.gold_amount > 0 && !open.gold_claimed) || open.items?.some((i) => !i.claimed);
    // eslint-disable-next-line no-alert
    if (pending && !window.confirm('Esta carta todavía tiene cosas sin recoger. Si la borras, vuelven a quien las mandó cuando venza. ¿Borrarla igual?')) return;
    try {
      await api.deleteMessage(player.id, open.id, token);
      setOpen(null);
      load();
      bus.emit('mail-refresh');
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  const taken = useMemo(() => new Map(attach.map((e) => [entryKey(e), e.quantity])), [attach]);
  const pick = (e, all) => {
    const key = entryKey(e);
    setAttach((list) => {
      const cur = list.find((x) => entryKey(x) === key);
      const add = all ? e.left : 1;
      if (cur) return list.map((x) => (x === cur ? { ...x, quantity: Math.min(x.max, x.quantity + add) } : x));
      if (list.length >= MAX_ADJUNTOS) { setMsg({ ok: false, text: `Puedes adjuntar hasta ${MAX_ADJUNTOS} cosas.` }); return list; }
      return [...list, { ...e, name: e.kind === 'card' ? `Carta de ${e.name}` : e.name, quantity: add }];
    });
    audio.sfx('clic');
  };
  const goldN = Math.max(0, Math.floor(Number(goldOut) || 0));
  const hasAttach = goldN > 0 || attach.length > 0;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.sendMessage(player.id, {
        receiverName: to.trim(), subject, body, goldAmount: goldN,
        items: attach.filter((e) => e.kind !== 'card').map((e) => ({ itemId: e.itemId, quantity: e.quantity, enchantLevel: e.enchantLevel, qualityTier: e.qualityTier })),
        cards: attach.filter((e) => e.kind === 'card').map((e) => ({ monsterId: e.monsterId, quantity: e.quantity })),
      }, token);
      audio.sfx(hasAttach ? 'monedas' : 'clic');
      setMsg({ ok: true, text: `${r.message} a ${to.trim()}.` });
      setSubject(''); setBody(''); setGoldOut(''); setAttach([]); setPickKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      audio.sfx('error');
      setMsg({ ok: false, text: err.message });
    } finally { setBusy(false); }
  };

  const pendingOf = (m) => m.has_unclaimed_items || (m.gold_amount > 0 && !m.gold_claimed);

  return (
    <FloatingPanel
      {...props}
      id="buzon"
      title="Correo del reino"
      icon={<GameIcon name="mailbox" artist="delapouite" />}
      width={500}
      footer={(
        <div className="wp-tabs">
          <span className={`wp-foot-note${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>
            {msg?.text ?? (tab === 'escribir'
              ? (hasAttach ? `Franqueo: ${postage(goldN)} de oro` : 'Texto a un amigo: gratis. A otros: franqueo en un buzón.')
              : 'Lo adjunto se recoge en un buzón.')}
          </span>
          <span className="wp-currency" title="Tu oro"><Coins value={gold} /></span>
        </div>
      )}
    >
      <div className="wp-tabs">
        <button type="button" className={`wp-tab${tab === 'bandeja' ? ' wp-tab--active' : ''}`} onClick={() => { setTab('bandeja'); setMsg(null); }}>
          Bandeja{inbox?.some((m) => !m.read) ? ` (${inbox.filter((m) => !m.read).length})` : ''}
        </button>
        <button type="button" className={`wp-tab${tab === 'escribir' ? ' wp-tab--active' : ''}`} onClick={() => { setTab('escribir'); setMsg(null); }}>Escribir</button>
      </div>

      {tab === 'bandeja' && !open && (
        <ul className="ml-list">
          {inbox === null && <p className="wp-empty">Abriendo el buzón…</p>}
          {inbox?.length === 0 && <p className="wp-empty">No tienes cartas. Las palomas del reino descansan.</p>}
          {inbox?.map((m) => (
            <li key={m.id}>
              <button type="button" className={`ml-row${m.read ? '' : ' is-new'}`} onClick={() => read(m)}>
                <GameIcon name={m.from_system ? 'post-stamp' : 'love-letter'} artist="delapouite" />
                <span className="ml-from">{m.sender_nickname}</span>
                <span className="ml-subj">{m.subject || '(sin asunto)'}</span>
                {pendingOf(m) && <span className="ml-clip" title="Tiene cosas para recoger">📎</span>}
                <small>{fecha(m.created_at)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'bandeja' && open && (
        <article className="ml-letter">
          <header>
            <strong>{open.subject || '(sin asunto)'}</strong>
            <small>De {open.sender_nickname} · {fecha(open.created_at)} · vence {fecha(open.expires_at)}</small>
          </header>
          {open.body && <p className="ml-body">{open.body}</p>}
          {(open.gold_amount > 0 || open.items?.length > 0) && (
            <div className="ml-attach">
              {open.gold_amount > 0 && (
                <span className={`ml-chip${open.gold_claimed ? ' is-done' : ''}`}><Coins value={open.gold_amount} /></span>
              )}
              {open.items?.map((i) => (
                <span key={i.id} className={`ml-chip${i.claimed ? ' is-done' : ''}`}>
                  <EntryIcon e={i.monster_id
                    ? { kind: 'card', rarity: i.card_rarity || 'COMMON' }
                    : { kind: 'item', name: i.item_name, rarity: i.rarity, itemType: i.item_type, slot: i.slot, enchantLevel: i.enchant_level }} />
                  {i.quantity}x {i.item_name}
                </span>
              ))}
            </div>
          )}
          <div className="wp-tabs">
            {pendingOf({ has_unclaimed_items: open.items?.some((i) => !i.claimed), gold_amount: open.gold_amount, gold_claimed: open.gold_claimed }) && (
              <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={claim}>Recoger</button>
            )}
            {open.sender_id && open.sender_id !== player.id && (
              <button type="button" className="wp-btn" onClick={() => { setTo(open.sender_nickname); setSubject(`Re: ${open.subject || ''}`.slice(0, 80)); setOpen(null); setTab('escribir'); }}>Responder</button>
            )}
            <button type="button" className="wp-btn" onClick={remove}>Borrar</button>
            <button type="button" className="wp-btn" onClick={() => setOpen(null)}>Volver</button>
          </div>
        </article>
      )}

      {tab === 'escribir' && (
        <div className="ml-write">
          <label className="pu-field">Para
            <input className="pu-input" placeholder="Nombre del aventurero" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="pu-field">Asunto
            <input className="pu-input" maxLength={80} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <textarea className="pu-input ml-text" rows={3} maxLength={1000} placeholder="Escribe tu carta…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="ml-attach">
            <label className="ml-gold"><GameIcon name="two-coins" artist="delapouite" />
              <input className="pu-input pu-num pu-price" type="number" min="0" placeholder="0" value={goldOut} onChange={(e) => setGoldOut(e.target.value)} />
            </label>
            {attach.map((e) => (
              <span key={entryKey(e)} className="ml-chip">
                <EntryIcon e={e} /> {e.quantity}x {e.name}
                <button type="button" className="pu-x" aria-label={`Quitar ${e.name}`} onClick={() => setAttach((l) => l.filter((x) => entryKey(x) !== entryKey(e)))}>✕</button>
              </span>
            ))}
          </div>
          <AttachPicker taken={taken} onPick={pick} refreshKey={pickKey} disabled={busy} />
          <div className="wp-tabs">
            <button type="button" className="wp-btn wp-btn--gold" disabled={busy || !to.trim() || (!subject.trim() && !body.trim() && !hasAttach)} onClick={send}>
              Enviar{hasAttach ? ` (${postage(goldN) + goldN} de oro en total)` : ''}
            </button>
          </div>
        </div>
      )}
    </FloatingPanel>
  );
}
