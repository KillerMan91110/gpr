import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { CLASS_ICON } from '../../utils/classIcons';
import './MarketPanel.css';

// Contratar aventureros del gremio, dentro del mundo (antes era la pantalla /guild/adventurers
// metida en un marco). Mismos endpoints: pool del gremio, refrescar (gratis cada tanto) y contratar.
const STATS = [['HP', 'hp'], ['MP', 'mana'], ['ATK', 'atk'], ['DEF', 'def'], ['MAG', 'int'], ['MDEF', 'magicDef'], ['SPD', 'spd'], ['CRIT', 'crit', '%']];

function clock(secs) {
  const m = Math.floor(secs / 60);
  return `${m}:${String(secs % 60).padStart(2, '0')}`;
}

export default function HirePanel(props) {
  const { player, token } = useAuth();
  const [pool, setPool] = useState(null);
  const [cost, setCost] = useState(150);
  const [left, setLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const gold = Number(props.gold ?? 0);

  const countdown = (secs) => {
    clearInterval(timer.current);
    setLeft(secs);
    if (secs > 0) timer.current = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(timer.current), 0) : s - 1)), 1000);
  };
  const load = useCallback(() => api.getPartyPool(player.id, token).then((d) => {
    setPool(d.npcs);
    setCost(d.refreshCost);
    countdown(d.secondsUntilFreeRefresh ?? 0);
  }).catch((e) => setMsg({ text: e.message, ok: false })), [player, token]);
  useEffect(() => { load(); return () => clearInterval(timer.current); }, [load]);
  // cuando llega a 0 el gremio ya trajo gente nueva
  useEffect(() => { if (left === 0 && pool) load(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);

  const refresh = async () => {
    setBusy(true);
    try {
      const d = await api.refreshPartyPool(player.id, token);
      setPool(d.npcs);
      setCost(d.refreshCost);
      countdown(d.secondsUntilFreeRefresh ?? 1800);
      setMsg({ text: '¡Nuevos aventureros llegaron al gremio!', ok: true });
      props.onChanged?.();
    } catch (e) { setMsg({ text: e.message, ok: false }); audio.sfx('error'); }
    setBusy(false);
  };
  const hire = async (npc) => {
    setBusy(true);
    try {
      const d = await api.hireNpc(player.id, npc.poolNpcId, token);
      setPool((p) => p.filter((n) => n.poolNpcId !== npc.poolNpcId));
      setMsg({ text: d.message, ok: true });
      audio.sfx('monedas');
      props.onChanged?.();
    } catch (e) { setMsg({ text: e.message, ok: false }); audio.sfx('error'); }
    setBusy(false);
  };

  return (
    <FloatingPanel
      {...props}
      id="contratar"
      title="Contratar aventureros"
      icon={<GameIcon name="crossed-swords" artist="lorc" />}
      width={600}
      footer={(
        <>
          <span className={`wp-bag-msg${msg ? (msg.ok ? ' ok' : ' err') : ''}`}>{msg?.text ?? 'Los contratados se unen a tu Formación (F)'}</span>
          <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {gold.toLocaleString()}</span>
        </>
      )}
    >
      <div className="hp-bar">
        <button type="button" className="wp-btn" disabled={busy || (left > 0 && gold < cost)} onClick={refresh}>
          <GameIcon name="clockwise-rotation" artist="delapouite" /> {left === 0 ? 'Buscar nuevos (gratis)' : `Buscar nuevos · ${cost} oro`}
        </button>
        {left > 0 && <small>Gratis en {clock(left)}</small>}
      </div>
      {!pool && <p className="wp-empty">Cargando…</p>}
      {pool && !pool.length && <p className="wp-empty">No queda nadie en el tablón. Busca nuevos candidatos.</p>}
      <div className="hp-grid">
        {pool?.map((npc) => {
          const afford = gold >= npc.hireCost;
          return (
            <div key={npc.poolNpcId} className="hp-card">
              <div className="hp-head">
                <span className="mk-icon"><GameIcon {...(CLASS_ICON[npc.className] || CLASS_ICON.GUERRERO)} /></span>
                <span className="mk-name"><b>{npc.name}</b><small>{npc.className} · nivel {npc.level}</small></span>
              </div>
              <dl className="hp-stats">
                {STATS.map(([label, key, suf]) => <div key={key}><dt>{label}</dt><dd>{npc[key] != null ? `${npc[key]}${suf ?? ''}` : '—'}</dd></div>)}
              </dl>
              <button type="button" className="wp-btn wp-btn--gold" disabled={busy || !afford} onClick={() => hire(npc)}>
                {afford ? `Contratar · ${npc.hireCost.toLocaleString()} oro` : `Faltan ${(npc.hireCost - gold).toLocaleString()} de oro`}
              </button>
            </div>
          );
        })}
      </div>
    </FloatingPanel>
  );
}
