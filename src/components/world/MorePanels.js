import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';

// =====================================================================================
// Mapa del mundo (M)
// =====================================================================================
// Posición de cada zona sobre el pergamino (en %), siguiendo el camino del aventurero
const ZONE_LAYOUT = {
  1: { x: 14, y: 76, icon: ['wheat', 'lorc'] },
  2: { x: 27, y: 34, icon: ['stone-pile', 'delapouite'] },
  3: { x: 45, y: 66, icon: ['fireball', 'lorc'] },
  4: { x: 62, y: 84, icon: ['water-flask', 'delapouite'] },
  5: { x: 68, y: 30, icon: ['ice-bolt', 'lorc'] },
  6: { x: 84, y: 60, icon: ['ghost', 'lorc'] },
  7: { x: 88, y: 18, icon: ['crystal-ball', 'lorc'] },
};
const CURRENT_ZONE = 1; // por ahora el mundo 2D es solo la Pradera

export function WorldMapPanel(props) {
  const { player, token } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState(null);
  const [selected, setSelected] = useState(CURRENT_ZONE);

  useEffect(() => {
    api.getPlayerZones(player.id, token).then(setZones).catch(() => setZones([]));
  }, [player, token]);

  const ordered = (zones ?? []).filter((z) => ZONE_LAYOUT[z.id]).sort((a, b) => a.id - b.id);
  const current = ordered.find((z) => z.id === selected);
  const path = ordered.map((z) => `${ZONE_LAYOUT[z.id].x * 6},${ZONE_LAYOUT[z.id].y * 3.6}`).join(' ');

  return (
    <FloatingPanel {...props} id="mapa" title="Mapa de Etheria" icon={<GameIcon name="treasure-map" artist="lorc" />} width={640}>
      <div className="wp-map">
        <svg className="wp-map-path" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={path} />
        </svg>
        {ordered.map((z) => {
          const L = ZONE_LAYOUT[z.id];
          return (
            <button
              key={z.id}
              type="button"
              className={`wp-map-node${z.unlocked ? '' : ' wp-map-node--locked'}${z.id === selected ? ' wp-map-node--selected' : ''}`}
              style={{ left: `${L.x}%`, top: `${L.y}%` }}
              onClick={() => setSelected(z.id)}
            >
              <span className="wp-map-node-icon">
                <GameIcon name={z.unlocked ? L.icon[0] : 'padlock'} artist={z.unlocked ? L.icon[1] : 'lorc'} />
              </span>
              {z.bossDefeated && <span className="wp-map-node-crown"><GameIcon name="crown" artist="lorc" /></span>}
              {z.id === CURRENT_ZONE && <span className="wp-map-here">Estás aquí</span>}
              <span className="wp-map-node-label">{z.name}</span>
            </button>
          );
        })}
        <span className="wp-map-compass"><GameIcon name="compass" artist="lorc" /></span>
      </div>
      {current && (
        <div className="wp-map-info">
          <div>
            <h3>{current.name} <small>Nv. {current.levelRange}</small></h3>
            <p>{current.description}</p>
          </div>
          {current.id === CURRENT_ZONE ? (
            <span className="wp-map-status">Estás aquí</span>
          ) : current.unlocked ? (
            <button type="button" className="wp-btn wp-btn--gold" onClick={() => navigate(`/combat/${current.id}`)}>Explorar</button>
          ) : (
            <span className="wp-map-status wp-map-status--locked">Bloqueada</span>
          )}
        </div>
      )}
    </FloatingPanel>
  );
}

// =====================================================================================
// Logros (L)
// =====================================================================================
const CATEGORY_LABEL = {
  BESTIA: 'bestias', HUMANOIDE: 'humanoides', ELEMENTAL: 'elementales', DEMONIO: 'demonios', MUERTO_VIVIENTE: 'muertos vivientes',
  ESPECTRO: 'espectros', DRACOIDE: 'dracoides', ACUATICO: 'acuáticos', INSECTOIDE: 'insectoides',
};

function bonusText(b) {
  if (!b) return null;
  if (b.type === 'DAMAGE_VS_CATEGORY') return `+${b.percent}% de daño contra ${CATEGORY_LABEL[b.category] ?? b.category}`;
  if (b.percent != null) return `+${b.percent}% ${String(b.type).replace(/_/g, ' ').toLowerCase()}`;
  return String(b.type).replace(/_/g, ' ').toLowerCase();
}

export function AchievementsPanel(props) {
  const { player, token } = useAuth();
  const [list, setList] = useState(null);

  useEffect(() => {
    api.getAchievements(player.id, token).then(setList).catch(() => setList([]));
  }, [player, token]);

  const unlocked = (list ?? []).filter((a) => a.unlocked).length;
  const sorted = [...(list ?? [])].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)
    || (b.progress.current / b.progress.required) - (a.progress.current / a.progress.required));

  return (
    <FloatingPanel
      {...props}
      id="logros"
      title="Logros"
      icon={<GameIcon name="trophy-cup" artist="delapouite" />}
      width={660}
      footer={(
        <div className="wp-ach-total">
          <span>{unlocked} / {list?.length ?? 0} desbloqueados</span>
          <span className="wp-ach-total-bar"><span style={{ width: `${list?.length ? (unlocked / list.length) * 100 : 0}%` }} /></span>
        </div>
      )}
    >
      {list === null && <p className="wp-empty">Cargando…</p>}
      <div className="wp-ach-grid">
        {sorted.map((a) => {
          const pctDone = Math.min(100, (a.progress.current / a.progress.required) * 100);
          return (
            <div key={a.id} className={`wp-ach${a.unlocked ? ' wp-ach--done' : ''}`}>
              <span className="wp-ach-medal"><GameIcon name={a.unlocked ? 'star-medal' : 'medal'} artist={a.unlocked ? 'delapouite' : 'lorc'} /></span>
              <div className="wp-ach-body">
                <strong>{a.name}</strong>
                <p>{a.description}</p>
                {a.bonus && <small className="wp-ach-bonus">{bonusText(a.bonus)}</small>}
                <span className="wp-ach-bar"><span style={{ width: `${pctDone}%` }} /></span>
                <small className="wp-ach-progress">{Math.min(a.progress.current, a.progress.required).toLocaleString()} / {a.progress.required.toLocaleString()}</small>
              </div>
            </div>
          );
        })}
      </div>
    </FloatingPanel>
  );
}

// =====================================================================================
// Ranking (R)
// =====================================================================================
const RANK_TABS = [
  ['jugadores', 'Jugadores'],
  ['riqueza', 'Riqueza'],
  ['gremios', 'Gremios'],
  ['abismo', 'El Abismo'],
];

export function RankingPanel(props) {
  const { player } = useAuth();
  const [tab, setTab] = useState('jugadores');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    const loaders = {
      jugadores: () => api.getLeaderboard().then((r) => r.map((x) => ({ pos: x.position, id: x.playerId, name: x.nickname, sub: `${x.className} · Rango ${x.rank}`, value: `Nv. ${x.level}` }))),
      riqueza: () => api.getWealthLeaderboard().then((r) => r.map((x) => ({ pos: x.position, id: x.playerId, name: x.nickname, sub: `${x.className} · Nv. ${x.level}`, value: Number(x.gold).toLocaleString(), gold: true }))),
      gremios: () => api.getGuildLeaderboard().then((r) => r.map((x) => ({ pos: x.position, name: x.name, sub: `${x.memberCount} miembros`, value: `Nv. ${x.level}` }))),
      abismo: () => api.getTowerLeaderboard().then((r) => (r.solo ?? []).map((x) => ({ pos: x.position, name: x.members.join(', '), sub: x.difficulty, value: `Piso ${x.floor}` }))),
    };
    loaders[tab]().then(setRows).catch(() => setRows([]));
  }, [tab]);

  return (
    <FloatingPanel
      {...props}
      id="ranking"
      title="Ranking"
      icon={<GameIcon name="podium" artist="delapouite" />}
      width={460}
      footer={(
        <div className="wp-tabs">
          {RANK_TABS.map(([id, label]) => (
            <button key={id} type="button" className={`wp-tab${tab === id ? ' wp-tab--active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      )}
    >
      <div className="wp-rank-list">
        {rows === null && <p className="wp-empty">Cargando…</p>}
        {rows?.length === 0 && <p className="wp-empty">Todavía no hay nadie en este ranking.</p>}
        {rows?.map((r) => (
          <div key={`${r.pos}-${r.name}`} className={`wp-rank-row${r.pos <= 3 ? ` wp-rank-row--top${r.pos}` : ''}${r.id === player.id ? ' wp-rank-row--me' : ''}`}>
            <span className="wp-rank-pos">{r.pos <= 3 ? <GameIcon name="crown" artist="lorc" /> : r.pos}</span>
            <span className="wp-rank-name">{r.name}<small>{r.sub}</small></span>
            <span className={`wp-rank-value${r.gold ? ' wp-rewards-gold' : ''}`}>{r.gold && <GameIcon name="two-coins" artist="delapouite" />} {r.value}</span>
          </div>
        ))}
      </div>
    </FloatingPanel>
  );
}

// =====================================================================================
// Enfermería (fogata del campamento)
// =====================================================================================
export function InfirmaryPanel({ party, gold, onChanged, ...props }) {
  const { player, token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  // 1 de oro por cada punto de vida o maná que falte (ver pages/Infirmary.js)
  const missing = (m) => Math.max(0, m.maxHp - m.hp) + Math.max(0, m.maxMana - m.mana);
  const total = party.reduce((acc, m) => acc + missing(m), 0);

  const heal = useCallback(async (body, label) => {
    setBusy(true);
    try {
      await api.healAtGuild(player.id, token, body);
      setMessage({ ok: true, text: `${label} recuperado` });
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }, [player, token, onChanged]);

  return (
    <FloatingPanel
      {...props}
      id="enfermeria"
      title="Fogata del campamento"
      icon={<GameIcon name="campfire" artist="lorc" />}
      width={420}
      footer={(
        <>
          <span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message ? message.text : '1 de oro por punto de vida o maná'}</span>
          <span className="wp-currency"><GameIcon name="two-coins" artist="delapouite" /> {Number(gold ?? 0).toLocaleString()}</span>
        </>
      )}
    >
      <p className="wp-detail-desc wp-parchment">El calor de la fogata cierra heridas y repone el maná… por un módico precio.</p>
      {party.map((m) => {
        const cost = missing(m);
        return (
          <div key={m.slot} className="wp-heal-row">
            <div className="wp-heal-info">
              <strong>{m.isHero ? '★ ' : ''}{m.name}</strong>
              <div className="hud-bar hud-bar--hp hud-bar--thin"><div className="hud-bar-fill" style={{ width: `${(m.hp / m.maxHp) * 100}%` }} /></div>
              <div className="hud-bar hud-bar--mp hud-bar--thin"><div className="hud-bar-fill" style={{ width: `${(m.mana / m.maxMana) * 100}%` }} /></div>
            </div>
            <button
              type="button"
              className="wp-btn"
              disabled={busy || cost === 0}
              onClick={() => heal(m.isHero ? { heroOnly: true } : { npcId: m.npcId }, m.name)}
            >
              {cost === 0 ? 'Sano' : `Curar · ${cost}`}
            </button>
          </div>
        );
      })}
      <button type="button" className="wp-btn wp-btn--gold wp-btn--wide" disabled={busy || total === 0} onClick={() => heal({}, 'Todo el grupo')}>
        {total === 0 ? 'Todo el grupo está sano' : `Curar a todos · ${total} de oro`}
      </button>
    </FloatingPanel>
  );
}
