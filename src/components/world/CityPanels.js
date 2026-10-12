import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import './CityPanels.css';

// Ventanas de Aurelia: la ofrenda al Pilar de Aethra y el libro de visitas de El Grifo Dorado.

function left(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export function OfrendaPanel(props) {
  const { player, token } = useAuth();
  const [state, setState] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(() => api.getOfrenda(player.id, token).then(setState).catch((e) => setMsg(e.message)), [player, token]);
  useEffect(() => { load(); const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, [load]);

  const offer = async () => {
    setBusy(true);
    try {
      const r = await api.makeOfrenda(player.id, token);
      setState(r);
      audio.sfx('ofrenda');
      bus.emit('ofrenda-fx');
      props.onChanged?.();
      setMsg(r.festival ? '¡Aethra te sonríe en su festival! Bendición doble.' : 'La moneda cae al agua… y sientes la bendición de Aethra.');
    } catch (e) { setMsg(e.message); audio.sfx('error'); }
    setBusy(false);
  };

  const active = state?.active && new Date(state.expiresAt).getTime() > Date.now();
  return (
    <FloatingPanel {...props} id="ofrenda" title="Pilar de Aethra" icon={<GameIcon name="water-drop" artist="sbed" />} width={420}>
      <div className="cp-ofrenda">
        <div className={`cp-fountain${active ? ' is-blessed' : ''}${state?.festival ? ' is-festival' : ''}`}>
          <img src={`${process.env.PUBLIC_URL}/assets/mundo/retratos/elenya.png`} alt="" />
        </div>
        <p className="cp-lore">«Arroja una moneda a las aguas de Aethra y la Dama bendecirá tu camino.»</p>
        {state?.festival && <p className="cp-festival">✦ Hoy es el Festival de Aethra: la bendición es doble ✦</p>}
        {active ? (
          <div className="cp-blessing">
            <b>Bendición de Aethra</b>
            <span>+{Math.round(state.bonus * 100)}% de experiencia en combate</span>
            <small>Quedan {left(new Date(state.expiresAt).getTime() - Date.now())}</small>
          </div>
        ) : <p className="cp-none">No tienes ninguna bendición activa.</p>}
        <button type="button" className="wp-btn wp-btn--gold" disabled={busy || !state || state.offeredToday} onClick={offer}>
          {state?.offeredToday ? 'Ya hiciste tu ofrenda de hoy' : `Ofrecer ${state?.cost ?? 50} de oro`}
        </button>
        {msg && <p className="cp-msg">{msg}</p>}
      </div>
    </FloatingPanel>
  );
}

export function LibroPanel(props) {
  const { player, token } = useAuth();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => api.getLibro(player.id, token).then(setList).catch((e) => setMsg(e.message)), [player, token]);
  useEffect(() => { load(); }, [load]);

  const write = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.writeLibro(player.id, text.trim(), token);
      setText('');
      setMsg('Tu firma quedó en el libro.');
      audio.sfx('clic');
      load();
    } catch (err) { setMsg(err.message); audio.sfx('error'); }
  };

  return (
    <FloatingPanel {...props} id="libro" title="Libro de visitas · El Grifo Dorado" icon={<GameIcon name="book-cover" artist="lorc" />} width={480}>
      <div className="cp-libro">
        <form onSubmit={write} className="cp-libro-form">
          <textarea maxLength={160} rows={2} placeholder="Deja unas palabras para los que vengan después…" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="wp-btn wp-btn--gold" disabled={!text.trim()}>Firmar</button>
        </form>
        {msg && <p className="cp-msg">{msg}</p>}
        <ul className="cp-libro-list">
          {list === null && <li className="cp-none">Abriendo el libro…</li>}
          {list?.length === 0 && <li className="cp-none">Nadie ha firmado todavía. ¡Sé el primero!</li>}
          {list?.map((e) => (
            <li key={e.id}>
              <p>«{e.text}»</p>
              <small>— {e.nickname}, nivel {e.level} · {new Date(e.created_at).toLocaleDateString('es')}</small>
            </li>
          ))}
        </ul>
      </div>
    </FloatingPanel>
  );
}
