import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { guiar } from '../../game/cityGuide';
import { CLASS_ICON } from '../../utils/classIcons';
import { getAbyssCheckpoint } from '../../utils/abyssCheckpoint';

const STATS = [
  ['hp', 'PV'], ['mana', 'PM'], ['atk', 'ATQ'], ['def', 'DEF'], ['int', 'INT'],
  ['magicDef', 'DMAG'], ['spd', 'VEL'], ['crit', 'CRIT', '%'],
];

const PORTRAITS = ['Guerrero', 'Mago', 'Arquero', 'Picaro', 'Sacerdote'];
const plain = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Face({ member, size = 'lg' }) {
  const file = PORTRAITS.find((f) => f.toLowerCase() === plain(member.className));
  const icon = CLASS_ICON[member.className] ?? CLASS_ICON.GUERRERO;
  return (
    <span className={`wp-face wp-face--${size}`}>
      {file ? <img src={`${process.env.PUBLIC_URL}/portraits/${file}.png`} alt="" draggable="false" /> : <GameIcon {...icon} />}
    </span>
  );
}

// Formación al estilo de la pantalla de grupo de un JRPG: tres tarjetas grandes (héroe y dos
// compañeros) y abajo la reserva como una fila de retratos. Clic en alguien para ver qué hacer.
export default function FormationPanel({ onChanged, onClose, zIndex, onActivate, defaultPos, openWindow }) {
  const { player, token } = useAuth();
  const [party, setParty] = useState(null);
  const [bench, setBench] = useState(null);
  const [sel, setSel] = useState(null); // { kind: 'party' | 'bench', member, slot? }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const inAbyss = !!getAbyssCheckpoint();

  const load = useCallback(async () => {
    const [p, b] = await Promise.all([api.getParty(player.id, token), api.getBench(player.id, token)]);
    setParty(p);
    setBench(b);
  }, [player, token]);

  useEffect(() => { load().catch((e) => setMessage({ ok: false, text: e.message })); }, [load]);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const act = async (fn, confirmText) => {
    if (busy || (confirmText && !window.confirm(confirmText))) return;
    setBusy(true);
    try {
      const r = await fn();
      setSel(null);
      await load();
      onChanged?.();
      if (r?.message) setMessage({ ok: true, text: r.message });
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const hero = party?.members?.find((m) => m.isHero);
  const npcs = party?.members?.filter((m) => !m.isHero) ?? [];
  const bySlot = { 2: npcs.find((n) => n.slot === 2), 3: npcs.find((n) => n.slot === 3) };
  const reserve = bench?.members ?? [];
  const cap = bench?.cap ?? 10;
  // se contrata en persona, con Oswin en el Registro de Gremios de Aurelia
  const hire = () => guiar(['oswin'], 'Habla con Oswin para contratar aventureros.');

  const card = (member, slot) => {
    if (!member) {
      return (
        <div key={slot} className="wp-party-card wp-party-card--empty">
          <span className="wp-party-slot">Puesto {slot}</span>
          <span className="wp-face wp-face--lg wp-face--empty">+</span>
          <p>Puesto libre</p>
          {sel?.kind === 'bench'
            ? <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={() => act(() => api.addBenchToParty(player.id, sel.member.benchRowId, token))}>Poner a {sel.member.name}</button>
            : <button type="button" className="wp-btn" onClick={hire}>Contratar</button>}
        </div>
      );
    }
    const isSel = sel?.kind === 'party' && sel.member.partyRowId === member.partyRowId;
    return (
      <button
        key={slot}
        type="button"
        className={`wp-party-card${member.isHero ? ' wp-party-card--hero' : ''}${isSel ? ' wp-party-card--sel' : ''}${sel?.kind === 'bench' && !member.isHero ? ' wp-party-card--target' : ''}`}
        onClick={() => {
          if (member.isHero) return;
          if (sel?.kind === 'bench') act(() => api.swapPartyBench(player.id, member.partyRowId, sel.member.benchRowId, token));
          else setSel(isSel ? null : { kind: 'party', member, slot });
        }}
      >
        <span className="wp-party-slot">{member.isHero ? 'Líder' : `Puesto ${slot}`}</span>
        <Face member={member} />
        <strong>{member.name}</strong>
        <small>{member.className} · Nv. {member.level}</small>
        <dl className="wp-party-stats">
          {STATS.map(([k, label, suf]) => (
            <div key={k}><dt>{label}</dt><dd>{member[k] != null ? `${Math.round(Number(member[k]) * 10) / 10}${suf ?? ''}` : '—'}</dd></div>
          ))}
        </dl>
      </button>
    );
  };

  return (
    <FloatingPanel
      id="formacion"
      title="Formación"
      icon={<GameIcon name="meeple-army" artist="delapouite" />}
      width={640}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={<span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text ?? 'Clic en un compañero o en alguien de la reserva para ver sus opciones.'}</span>}
    >
      {!party && <p className="wp-empty">Cargando…</p>}
      {party && (
        <>
          <div className="wp-party">
            {hero && card(hero, 1)}
            {card(bySlot[2], 2)}
            {card(bySlot[3], 3)}
          </div>

          {/* acciones del elegido */}
          {sel && (
            <div className="wp-deal">
              <span className="wp-deal-name">{sel.member.name}<small>{sel.kind === 'bench' ? 'En reserva · clic en un puesto del grupo para cambiarlo' : `Puesto ${sel.slot}`}</small></span>
              {sel.kind === 'party' && (
                <>
                  {bySlot[2] && bySlot[3] && <button type="button" className="wp-btn" disabled={busy} onClick={() => act(() => api.swapPartySlots(player.id, 2, 3, token))}>Cambiar puestos 2 ↔ 3</button>}
                  {!inAbyss && <button type="button" className="wp-btn" disabled={busy || reserve.length >= cap} onClick={() => act(() => api.sendPartyToBench(player.id, sel.member.partyRowId, token))}>A la reserva</button>}
                  <button type="button" className="wp-btn wp-btn--danger" disabled={busy} onClick={() => act(() => api.firePartyNpc(player.id, sel.member.partyRowId, token), `¿Despedir a ${sel.member.name}? Es permanente.`)}>Despedir</button>
                </>
              )}
              {sel.kind === 'bench' && (
                <button type="button" className="wp-btn wp-btn--danger" disabled={busy} onClick={() => act(() => api.fireBenchNpc(player.id, sel.member.benchRowId, token), `¿Despedir a ${sel.member.name}? Es permanente.`)}>Despedir</button>
              )}
              <button type="button" className="wp-btn" onClick={() => setSel(null)}>✕</button>
            </div>
          )}

          <h4 className="wp-section-title">Reserva {inAbyss ? '' : `(${reserve.length}/${cap})`}</h4>
          {inAbyss && <p className="wp-empty">En la Ciudad del Abismo la reserva se quedó en la superficie.</p>}
          {!inAbyss && (
            <div className="wp-reserve">
              {reserve.map((m) => (
                <button
                  key={m.benchRowId}
                  type="button"
                  className={`wp-reserve-member${sel?.kind === 'bench' && sel.member.benchRowId === m.benchRowId ? ' wp-reserve-member--sel' : ''}`}
                  title={`${m.name} · ${m.className} Nv. ${m.level}`}
                  onClick={() => setSel(sel?.member?.benchRowId === m.benchRowId ? null : { kind: 'bench', member: m })}
                >
                  <Face member={m} size="sm" />
                  <span>{m.name}</span>
                  <small>Nv. {m.level}</small>
                </button>
              ))}
              {reserve.length < cap && (
                <button type="button" className="wp-reserve-member wp-reserve-member--add" onClick={hire} title="Contratar aventureros">
                  <span className="wp-face wp-face--sm wp-face--empty">+</span>
                  <span>Contratar</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </FloatingPanel>
  );
}
