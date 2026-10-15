import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { questsOfGiver, needsTurnInPerson, NPC_LUGAR } from '../../game/questGivers';
import { DIALOGUES } from '../../game/dialogues';
import audio from '../../game/audio';
import bus from '../../game/bus';

const objectivesDone = (q) => (q.objectives ?? []).every((o) => (o.current_count ?? 0) >= o.target_count);

function Stars({ n }) {
  return <span className="wp-stars" title={`Dificultad ${n}/5`}>{'★'.repeat(n ?? 0)}<span>{'★'.repeat(Math.max(0, 5 - (n ?? 0)))}</span></span>;
}

function Rewards({ q }) {
  return (
    <div className="wp-rewards">
      {q.xp_reward > 0 && <span><GameIcon name="sparkles" artist="delapouite" /> {Number(q.xp_reward).toLocaleString()} XP</span>}
      {q.gold_reward > 0 && <span className="wp-rewards-gold"><GameIcon name="two-coins" artist="delapouite" /> {Number(q.gold_reward).toLocaleString()} oro</span>}
      {q.reputation_reward > 0 && <span><GameIcon name="laurels" artist="lorc" /> {q.reputation_reward} rep</span>}
    </div>
  );
}

// Misiones por pasos: se ven los objetivos ya cumplidos y los del paso actual; los siguientes
// quedan como "???" para no adelantar la historia.
function Objectives({ q }) {
  const future = (q.objectives ?? []).filter((o) => o.future).length;
  return (
    <ul className="wp-objectives">
      {(q.objectives ?? []).filter((o) => !o.future).map((o) => {
        const cur = Math.min(o.current_count ?? 0, o.target_count);
        const done = cur >= o.target_count;
        return (
          <li key={o.objective_id} className={done ? 'done' : ''}>
            <span>{done ? '✔' : '◇'} {o.description}</span>
            <span className="wp-objective-bar"><span style={{ width: `${(cur / o.target_count) * 100}%` }} /></span>
            <small>{cur}/{o.target_count}</small>
          </li>
        );
      })}
      {future > 0 && <li className="wp-objective-next"><span>◇ ??? (se revela al avanzar)</span></li>}
    </ul>
  );
}

function QuestDetail({ q, actions }) {
  return (
    <div className="wp-detail">
      <div className="wp-quest-title">
        <h3>{q.name}</h3>
        <Stars n={q.difficulty_stars} />
      </div>
      <span className="wp-detail-sub">
        {q.zone_name ?? 'Etheria'} · {q.npc_name ?? 'Gremio'} · Nv. {q.min_level}{q.max_level ? `-${q.max_level}` : '+'}
        {q.is_repeatable ? ' · Repetible' : ' · Única'}
        {q.is_personal ? ' · Personal' : ''}
      </span>
      <p className="wp-detail-desc wp-parchment">{q.description}</p>
      <h4 className="wp-subhead">Objetivos</h4>
      <Objectives q={q} />
      <h4 className="wp-subhead">Recompensas</h4>
      <Rewards q={q} />
      {actions && <div className="wp-detail-actions">{actions}</div>}
    </div>
  );
}

function useMessage() {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);
  return [message, setMessage];
}

// Diario de misiones (J): misiones aceptadas y su progreso, más el registro de completadas.
export function QuestLogPanel({ onChanged, tracked = [], onToggleTrack, ...props }) {
  const { player, token } = useAuth();
  const [active, setActive] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [tab, setTab] = useState('curso');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useMessage();

  // con grupo de jugadores se puede compartir una misión activa (ver coop.js share-quest)
  const [inGroup, setInGroup] = useState(false);
  const load = useCallback(() => {
    api.getActiveQuests(player.id, token).then(setActive).catch(() => setActive([]));
    api.getCompletedQuests(player.id, token).then(setCompleted).catch(() => setCompleted([]));
    api.getCoopParty(player.id, token).then((g) => setInGroup(!!g?.members?.length)).catch(() => setInGroup(false));
  }, [player, token]);
  useEffect(() => { load(); }, [load]);
  // un compañero te compartió una misión y la aceptaste
  useEffect(() => {
    bus.on('quests-changed', load);
    return () => bus.off('quests-changed', load);
  }, [load]);

  const list = tab === 'curso' ? (active ?? []) : completed;
  const current = list.find((q) => q.id === selected) ?? list[0];

  const run = async (fn, okText) => {
    setBusy(true);
    try {
      await fn();
      if (okText.includes('completada')) audio.jingle('mision');
      setMessage({ ok: true, text: okText });
      setSelected(null);
      load();
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FloatingPanel
      {...props}
      id="misiones"
      title="Diario de misiones"
      icon={<GameIcon name="scroll-unfurled" artist="lorc" />}
      width={640}
      footer={(
        <div className="wp-tabs">
          <button type="button" className={`wp-tab${tab === 'curso' ? ' wp-tab--active' : ''}`} onClick={() => { setTab('curso'); setSelected(null); }}>En curso ({active?.length ?? 0})</button>
          <button type="button" className={`wp-tab${tab === 'hechas' ? ' wp-tab--active' : ''}`} onClick={() => { setTab('hechas'); setSelected(null); }}>Completadas</button>
          {message && <span className={`wp-foot-note ${message.ok ? 'ok' : 'err'}`}>{message.text}</span>}
        </div>
      )}
    >
      <div className="wp-split">
        <div className="wp-skill-list">
          {active === null && <p className="wp-empty">Cargando…</p>}
          {active !== null && list.length === 0 && (
            <p className="wp-empty">{tab === 'curso' ? 'No tienes misiones. Busca a los NPCs con un ❗ amarillo sobre la cabeza (también salen en el minimapa y en el mapa, M).' : 'Todavía no completaste ninguna.'}</p>
          )}
          {list.map((q) => (
            <button key={`${q.id}-${q.completed_at ?? ''}`} type="button" className={`wp-quest${current?.id === q.id ? ' wp-skill--active' : ''}`} onClick={() => setSelected(q.id)}>
              <span className="wp-quest-name">{tab === 'curso' && objectivesDone(q) ? '❗ ' : ''}{q.name}</span>
              <small>{q.zone_name ?? ''} · Nv. {q.min_level}</small>
            </button>
          ))}
        </div>
        {current && (
          <QuestDetail
            q={current}
            actions={tab === 'curso' && (
              <>
                <button
                  type="button"
                  className={`wp-btn${tracked.includes(current.id) ? ' wp-btn--on' : ''}`}
                  onClick={() => onToggleTrack?.(current.id)}
                  title="La flecha del mapa te lleva a su objetivo"
                >
                  📍 {tracked.includes(current.id) ? 'Dejar de rastrear' : 'Rastrear'}
                </button>
                {needsTurnInPerson(current) ? (
                  // se entrega en persona: hablando con quien la recibe (marca ? en el mapa)
                  <span className={`wp-quest-turnin${objectivesDone(current) ? ' wp-quest-turnin--ready' : ''}`}>
                    {objectivesDone(current) ? '❔ Entrégasela' : 'Se entrega'} a {DIALOGUES[current.turn_in_npc]?.name ?? 'quien te la dio'}
                    {NPC_LUGAR[current.turn_in_npc] ? `, en ${NPC_LUGAR[current.turn_in_npc]}` : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="wp-btn wp-btn--gold"
                    disabled={busy || !objectivesDone(current)}
                    onClick={() => run(() => api.completeQuest(player.id, current.id, token), `¡${current.name} completada!`)}
                  >
                    Entregar
                  </button>
                )}
                {inGroup && !current.is_personal && (
                  <button
                    type="button"
                    className="wp-btn"
                    disabled={busy}
                    title="Tus compañeros de grupo reciben la misión; lo que cacen juntos cuenta para todos"
                    onClick={async () => {
                      try {
                        const r = await api.shareQuestWithGroup(player.id, current.id, token);
                        setMessage({ ok: true, text: r.sentTo ? `Compartiste «${current.name}» con tu grupo` : 'Todos en tu grupo ya la tienen' });
                      } catch (err) { setMessage({ ok: false, text: err.message }); }
                    }}
                  >
                    Compartir con el grupo
                  </button>
                )}
                {current.objectives?.some((o) => o.step > 1) && (
                  <button
                    type="button"
                    className="wp-btn"
                    disabled={busy}
                    title="Si la misión quedó trabada: vuelve al primer paso (se quitan sus objetos de misión)"
                    onClick={() => run(() => api.resetQuest(player.id, current.id, token), `${current.name}: volviste al primer paso`)}
                  >
                    Reiniciar
                  </button>
                )}
                <button type="button" className="wp-btn wp-btn--danger" disabled={busy} onClick={() => run(() => api.abandonQuest(player.id, current.id, token), `Abandonaste ${current.name}`)}>
                  Abandonar
                </button>
              </>
            )}
          />
        )}
      </div>
    </FloatingPanel>
  );
}

// Tablón de misiones del gremio (cartel del campamento): misiones disponibles para aceptar.
// Abierto desde un NPC (giver), muestra solo las misiones que da ese NPC, como en WoW.
export function QuestBoardPanel({ onChanged, giver, onClearGiver, continentZoneIds, ...props }) {
  const { player, token } = useAuth();
  const [quests, setQuests] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useMessage();

  const load = useCallback(() => {
    api.getAvailableQuests(player.id, token).then(setQuests).catch(() => setQuests([]));
  }, [player, token]);
  useEffect(() => { load(); }, [load]);

  const list = (giver ? questsOfGiver(quests, giver, continentZoneIds) : (quests ?? []))
    .filter((q) => !q.accepted)
    .sort((a, b) => Number(b.meets_level) - Number(a.meets_level) || a.min_level - b.min_level);
  const current = list.find((q) => q.id === selected) ?? list[0];
  const canAccept = current && current.meets_level && current.prerequisite_met;

  const accept = async () => {
    setBusy(true);
    try {
      await api.acceptQuest(player.id, current.id, token);
      bus.emit('quest-accepted', current.id);
      audio.sfx('mejora');
      setMessage({ ok: true, text: `Aceptaste: ${current.name}` });
      setSelected(null);
      load();
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FloatingPanel
      {...props}
      id="tablon"
      title={giver ? `Misiones de ${DIALOGUES[giver]?.name ?? giver}` : 'Tablón del gremio'}
      icon={<GameIcon name="scroll-quill" artist="delapouite" />}
      width={640}
      footer={message
        ? <span className={`wp-foot-note ${message.ok ? 'ok' : 'err'}`}>{message.text}</span>
        : (
          <span className="wp-foot-note">
            {list.length} misiones disponibles
            {giver && <button type="button" className="wp-btn" style={{ marginLeft: 8 }} onClick={onClearGiver}>Ver todas</button>}
          </span>
        )}
    >
      <div className="wp-split">
        <div className="wp-skill-list">
          {quests === null && <p className="wp-empty">Cargando…</p>}
          {list.map((q) => (
            <button
              key={q.id}
              type="button"
              className={`wp-quest${q.meets_level ? '' : ' wp-skill--locked'}${current?.id === q.id ? ' wp-skill--active' : ''}`}
              onClick={() => setSelected(q.id)}
            >
              <span className="wp-quest-name">{q.quest_type === 'DIARIA' ? '◆ ' : q.quest_type === 'PRINCIPAL' ? '✦ ' : ''}{q.name}</span>
              <small>Nv. {q.min_level}{q.max_level ? `-${q.max_level}` : '+'} · <Stars n={q.difficulty_stars} /></small>
            </button>
          ))}
        </div>
        {current && (
          <QuestDetail
            q={current}
            actions={(
              <button type="button" className="wp-btn wp-btn--gold" disabled={busy || !canAccept} onClick={accept}>
                {!current.meets_level ? `Requiere nivel ${current.min_level}` : !current.prerequisite_met ? 'Requiere otra misión antes' : 'Aceptar misión'}
              </button>
            )}
          />
        )}
      </div>
    </FloatingPanel>
  );
}
