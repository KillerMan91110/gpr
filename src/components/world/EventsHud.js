import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import './EventsHud.css';

// Calendario de eventos (gprback/lib/eventos.js): fichas bajo el minimapa con lo que está pasando
// ahora (Noche de caza, Mercader ambulante, Festival), aviso cuando empieza uno y la ventana con
// lo de esta semana. También le dice a la escena qué mostrar en el mapa (el mercader).
const ICON = { sun: ['sun', 'lorc'], 'wolf-howl': ['wolf-howl', 'lorc'], shop: ['shop', 'delapouite'] };
const hhmm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function useEvents(worldReady) {
  const [cal, setCal] = useState(null);
  const prev = useRef(null);
  const load = useCallback(() => api.getEventos().then((c) => {
    setCal(c);
    const ids = c.active.map((e) => e.id);
    bus.emit('events-state', ids);
    // aviso cuando empieza uno (no al entrar: ahí solo se ven las fichas)
    if (prev.current) {
      for (const e of c.active) {
        if (!prev.current.includes(e.id)) {
          audio.sfx('mision');
          bus.emit('social-toast', { text: `✦ Comenzó: ${e.name}. ${e.desc}`, kind: 'tour' });
        }
      }
    }
    prev.current = ids;
  }).catch(() => {}), []);
  useEffect(() => {
    if (!worldReady) return undefined;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [worldReady, load]);
  return cal;
}

export function EventChips({ cal, onOpen }) {
  if (!cal) return null;
  return (
    <div className="hud-events">
      {!cal.active.length && (
        <button type="button" className="hud-event hud-event--cal" onClick={onOpen} title="Calendario de eventos">
          <GameIcon name="calendar" artist="delapouite" />
        </button>
      )}
      {cal.active.map((e) => (
        <button key={e.id} type="button" className={`hud-event hud-event--${e.id}`} onClick={onOpen} title={`${e.name}: ${e.desc}`}>
          <GameIcon name={(ICON[e.icon] ?? ICON.sun)[0]} artist={(ICON[e.icon] ?? ICON.sun)[1]} />
          <span>{e.name}</span>
          {e.endsAt && <small>hasta {hhmm(e.endsAt)}</small>}
        </button>
      ))}
    </div>
  );
}

// Ventana: lo que pasa ahora y lo de los próximos 7 días
export function CalendarPanel(props) {
  const [cal, setCal] = useState(null);
  useEffect(() => { api.getEventos().then(setCal).catch(() => setCal({ active: [], upcoming: [] })); }, []);
  const byDay = {};
  for (const e of cal?.upcoming ?? []) {
    const d = new Date(e.startsAt);
    const key = d.toDateString();
    (byDay[key] ??= { label: d.toDateString() === new Date().toDateString() ? 'Hoy' : DAYS[d.getDay()], list: [] }).list.push(e);
  }
  return (
    <FloatingPanel {...props} id="calendario" title="Calendario de eventos" icon={<GameIcon name="calendar" artist="delapouite" />} width={420}>
      {!cal && <p className="wp-empty">Cargando…</p>}
      {cal && (
        <div className="ev-cal">
          <h4>Ahora</h4>
          {cal.active.length ? cal.active.map((e) => (
            <div key={e.id} className={`ev-row is-now ev-row--${e.id}`}>
              <GameIcon name={(ICON[e.icon] ?? ICON.sun)[0]} artist={(ICON[e.icon] ?? ICON.sun)[1]} />
              <span><b>{e.name}</b><small>{e.desc}</small></span>
              {e.endsAt && <em>hasta {hhmm(e.endsAt)}</em>}
            </div>
          )) : <p className="wp-empty">No hay ningún evento ahora mismo.</p>}
          <h4>Próximos</h4>
          {Object.values(byDay).map((d) => (
            <div key={d.label + d.list[0].startsAt} className="ev-day">
              <small>{d.label}</small>
              {d.list.map((e) => (
                <div key={e.id + e.startsAt} className={`ev-row ev-row--${e.id}`}>
                  <GameIcon name={(ICON[e.icon] ?? ICON.sun)[0]} artist={(ICON[e.icon] ?? ICON.sun)[1]} />
                  <span><b>{e.name}</b><small>{e.desc}</small></span>
                  <em>{e.id === 'festival' ? 'todo el día' : `${hhmm(e.startsAt)} – ${hhmm(e.endsAt)}`}</em>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </FloatingPanel>
  );
}

// Tienda de Varo, el mercader ambulante
export function WandererPanel(props) {
  const { player, token } = useAuth();
  const [st, setSt] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => api.getAmbulante(player.id, token).then(setSt).catch((e) => setMsg({ text: e.message, ok: false })), [player, token]);
  useEffect(() => { load(); }, [load]);
  const buy = async (o) => {
    try {
      const r = await api.comprarAmbulante(player.id, o.id, token);
      setMsg({ text: `Varo te entrega: ${r.got}.`, ok: true });
      audio.sfx('monedas');
      props.onChanged?.();
      load();
    } catch (e) { setMsg({ text: e.message, ok: false }); audio.sfx('error'); }
  };
  return (
    <FloatingPanel
      {...props}
      id="ambulante"
      title="Varo, mercader ambulante"
      icon={<GameIcon name="shop" artist="delapouite" />}
      width={440}
      footer={(
        <>
          <span className={`wp-bag-msg${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>{msg?.text ?? 'Solo los miércoles y sábados, de 18 a 21'}</span>
          <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {Number(props.gold ?? 0).toLocaleString()}</span>
        </>
      )}
    >
      <div className="ev-shop-head">
        <img src={`${process.env.PUBLIC_URL}/assets/mundo/retratos/ambulante.png`} alt="" />
        <p>«Vengo de muy lejos, viajero. Lo que ves hoy no lo verás mañana… ¡mira con calma!»</p>
      </div>
      {!st && <p className="wp-empty">Cargando…</p>}
      {st && !st.active && <p className="wp-empty">Varo ya siguió su camino. Vuelve el miércoles o el sábado.</p>}
      {st?.active && st.offers.map((o) => (
        <div key={o.id} className="ev-offer">
          <span className="mk-icon">{o.card ? <GameIcon name="card-joker" artist="delapouite" /> : <GameIcon name="potion-ball" artist="lorc" />}</span>
          <span className="ev-offer-text"><b>{o.name}</b><small>{o.desc}</small></span>
          <span className="ev-offer-buy">
            <em><GameIcon name="two-coins" artist="delapouite" /> {o.price.toLocaleString()}</em>
            <button type="button" className="wp-btn wp-btn--gold" disabled={o.left <= 0 || Number(props.gold ?? 0) < o.price} onClick={() => buy(o)}>
              {o.left <= 0 ? 'Agotado' : `Comprar (${o.left})`}
            </button>
          </span>
        </div>
      ))}
    </FloatingPanel>
  );
}
