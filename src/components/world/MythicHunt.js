import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { CardIcon, MythicMark } from './coleccionArt';
import './MythicHunt.css';

// Jefe mítico de zona (gprback/lib/mythic.js) del lado de React: escucha el socket, le pasa el
// estado a la escena (para que lo ponga en el mapa) y muestra el aviso, la barra de vida
// compartida y lo que te tocó cuando cae.
const PHASE_TEXT = ['vida compartida', 'aullido: esbirros sueltos', 'herido y huyendo', '¡luna roja!'];
const PHASE_TITLE = { 1: 'Aullido', 2: 'Huida', 3: 'Luna roja' };

function left(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MythicHunt({ worldReady, inBattle }) {
  const { socket } = useSocket();
  const [state, setState] = useState(null);
  const [banner, setBanner] = useState(null); // { kind: 'spawn' | 'killed', ... }
  const [reward, setReward] = useState(null);
  const [toast, setToast] = useState(null);
  const [, tick] = useState(0);
  // huyó y aún no encontraste su escondite: la barra no dice dónde está
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onHidden = (h) => setHidden(!!h.hidden);
    bus.on('mythic-hidden', onHidden);
    return () => bus.off('mythic-hidden', onHidden);
  }, []);
  // los avisos que llegan en pleno combate esperan a que vuelvas al mapa
  const queue = useRef([]);
  const inBattleRef = useRef(inBattle);
  inBattleRef.current = inBattle;
  const show = (b) => {
    if (inBattleRef.current) { queue.current.push(b); return; }
    setBanner(b);
    setTimeout(() => setBanner((cur) => (cur === b ? null : cur)), 6000);
  };
  useEffect(() => {
    if (inBattle || !queue.current.length) return undefined;
    const list = queue.current.splice(0);
    let i = 0;
    const next = () => {
      if (i >= list.length) return;
      const b = list[i++];
      setBanner(b);
      setTimeout(() => { setBanner((cur) => (cur === b ? null : cur)); next(); }, 4500);
    };
    next();
    return undefined;
  }, [inBattle]);

  useEffect(() => { api.getMitico().then(setState).catch(() => {}); }, []);
  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (s) => setState(s);
    const onSpawn = (s) => { show({ kind: 'spawn', ...s }); audio.sfx('encuentro'); };
    const onKilled = (s) => { show({ kind: 'killed', ...s }); audio.sfx('cofre'); };
    const onReward = (r) => { setReward(r); audio.sfx('monedas'); };
    const onPhase = (p) => { show({ kind: `phase${p.phase}`, ...p }); audio.sfx(p.phase === 3 ? 'penalizacion' : 'encuentro'); };
    const onAttempt = (a) => { setToast(`Le quitaste ${Number(a.dealt).toLocaleString()} de vida a ${a.name ?? 'el jefe mítico'}.`); setTimeout(() => setToast(null), 5000); };
    socket.on('mythic:update', onUpdate);
    socket.on('mythic:spawn', onSpawn);
    socket.on('mythic:killed', onKilled);
    socket.on('mythic:reward', onReward);
    socket.on('mythic:attempt', onAttempt);
    socket.on('mythic:phase', onPhase);
    return () => {
      socket.off('mythic:phase', onPhase);
      socket.off('mythic:update', onUpdate);
      socket.off('mythic:spawn', onSpawn);
      socket.off('mythic:killed', onKilled);
      socket.off('mythic:reward', onReward);
      socket.off('mythic:attempt', onAttempt);
    };
  }, [socket]);
  // la escena pone o quita al jefe en el mapa
  useEffect(() => { if (worldReady) bus.emit('mythic-state', state); }, [worldReady, state]);
  useEffect(() => {
    if (!state?.hunt) return undefined;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [state?.hunt]);
  // por si el socket no avisa (otra pestaña, reconexión): refresca cada minuto
  useEffect(() => {
    const t = setInterval(() => api.getMitico().then(setState).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, []);

  if (inBattle) return null;
  const hunt = state?.hunt;
  const zone = state?.zones?.[0];
  const near = !hunt && zone && zone.kills >= zone.needed * 0.5;

  return (
    <>
      {hunt && (
        <div className={`mh-bar${hunt.redMoon ? ' mh-bar--red' : ''}`}>
          <MythicMark scale={2} />
          <div className="mh-bar-body">
            <span className="mh-bar-name"><b>{hunt.name}</b> <small>{hidden && hunt.from ? 'escondido: sigue sus huellas' : `en ${hunt.spot}`} · se irá en {left(new Date(hunt.endsAt).getTime() - Date.now())}</small></span>
            <div className="mh-bar-track">
              <div className="mh-bar-fill" style={{ width: `${(hunt.hp / hunt.maxHp) * 100}%` }} />
              {[75, 50, 25].map((t) => <i key={t} className="mh-bar-tick" style={{ left: `${t}%` }} />)}
            </div>
            <small className="mh-bar-hp">
              {hunt.hp.toLocaleString()} / {hunt.maxHp.toLocaleString()} · {PHASE_TEXT[hunt.phase ?? 0]}
              {hunt.phase >= 1 && ` · ${hunt.minionKills} esbirros cazados (defensa −${hunt.defDown}%)`}
            </small>
          </div>
          <button
            type="button"
            className="mh-track"
            title="Una flecha te guía hasta él"
            onClick={() => bus.emit('mythic-track', (ok) => { setToast(ok ? 'Sigue la flecha hasta el jefe mítico.' : 'Su rastro aún no llega hasta aquí.'); setTimeout(() => setToast(null), 3500); })}
          >Rastrear</button>
        </div>
      )}
      {near && (
        <div className={`mh-rumor${zone.kills >= zone.needed ? ' is-ready' : ''}`} title="Cuando entre todos cacen lo suficiente, al caer la noche aparecerá algo…">
          <MythicMark scale={1} />
          {zone.kills >= zone.needed
            ? (state.night ? 'Algo despierta en la Pradera…' : 'La Pradera aguarda la noche…')
            : `La Pradera se inquieta · ${zone.kills}/${zone.needed}`}
        </div>
      )}
      {banner && (
        <div className={`mh-banner mh-banner--${banner.kind}`}>
          <small>{banner.kind === 'spawn' ? '¡Jefe mítico!' : banner.kind === 'killed' ? 'Cacería terminada' : PHASE_TITLE[banner.phase]}</small>
          <strong>{banner.name}</strong>
          <span>
            {banner.kind === 'spawn' && `Ha aparecido en ${banner.spot}${banner.zoneName ? `, en ${banner.zoneName}` : ''}. La noche no terminará hasta que caiga.`}
            {banner.kind === 'killed' && `${banner.killer} asestó el golpe final. ${banner.hunters} cazadores participaron. ¡Amanece!`}
            {banner.kind.startsWith('phase') && banner.text}
          </span>
        </div>
      )}
      {toast && <div className="mh-toast">{toast}</div>}
      {reward && (
        <div className="mh-reward" role="dialog">
          <div className="mh-reward-box">
            <small>Botín de la cacería</small>
            <h3>{reward.boss}</h3>
            <p>Tu aporte: <b>{reward.share}%</b> del daño{reward.killer ? ' · ¡golpe final!' : ''}</p>
            <div className="mh-reward-list">
              <span>+{reward.gold.toLocaleString()} oro</span>
              <span>+{reward.xp.toLocaleString()} XP</span>
              {reward.card && <span className="mh-reward-card"><CardIcon rarity="MYTHIC" /> Carta de Aullaluna</span>}
              {reward.guildXp > 0 && <span className="mh-reward-guild">+{reward.guildXp.toLocaleString()} XP para tu gremio</span>}
              {reward.levelUp && <span>¡Subiste a nivel {reward.levelUp}!</span>}
            </div>
            <button type="button" className="wp-btn wp-btn--gold" onClick={() => setReward(null)}>¡A la caza!</button>
          </div>
        </div>
      )}
    </>
  );
}
