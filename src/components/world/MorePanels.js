import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import bus from '../../game/bus';

// =====================================================================================
// Logros (L): gprback/lib/logros.js. Arriba, los Puntos de Gesta con sus hitos y el título que llevas;
// abajo, una pestaña por grupo. Cada logro dice su lore, cómo se gana y su premio; los ganados que
// dan título se pueden equipar (uno solo a la vez: se ve sobre tu nombre en el mundo).
// =====================================================================================
const GRUPO_ICON = {
  historia: ['scroll-unfurled', 'lorc'], primera: ['crossed-swords', 'lorc'], mazmorras: ['dungeon-gate', 'delapouite'],
  solitario: ['lone-wolf', 'lorc'], caceria: ['wolf-head', 'lorc'], miticos: ['dragon-head', 'faithtoken'],
  artesania: ['anvil', 'lorc'], exploracion: ['treasure-map', 'lorc'], secretos: ['locked-chest', 'delapouite'],
};

export function AchievementsPanel(props) {
  const { player, token } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('historia');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => api.getLogros(player.id, token).then(setData).catch((e) => setMsg(e.message)), [player, token]);
  useEffect(() => { load(); }, [load]);

  const equipar = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.equiparTitulo(player.id, code, token);
      setMsg(r.titulo ? `Ahora llevas el título «${r.titulo}».` : 'Te quitaste el título.');
      // el mundo vuelve a cargar tu nombre (y lo ven los demás): components/world/WorldSocial.js
      bus.emit('guild-changed');
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logros = data?.lista ?? [];
  const ganados = logros.filter((a) => a.unlocked).length;
  const delGrupo = logros.filter((a) => a.grupo === tab)
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (b.progress.current / b.progress.required) - (a.progress.current / a.progress.required));
  const gesta = data?.gesta;
  const proximo = gesta?.hitos.find((h) => !h.logrado);
  const anterior = [...(gesta?.hitos ?? [])].reverse().find((h) => h.logrado)?.puntos ?? 0;
  const tituloActual = logros.find((a) => a.code === data?.titulo);

  return (
    <FloatingPanel
      {...props}
      id="logros"
      title="Logros"
      icon={<GameIcon name="trophy-cup" artist="delapouite" />}
      width={720}
      footer={(
        <div className="wp-ach-total">
          <span>{msg ?? `${ganados} / ${logros.length} logros · ${gesta?.puntos ?? 0} de ${data?.totalPuntos ?? 0} puntos de Gesta`}</span>
          <span className="wp-ach-total-bar"><span style={{ width: `${logros.length ? (ganados / logros.length) * 100 : 0}%` }} /></span>
        </div>
      )}
    >
      {!data && <p className="wp-empty">Cargando…</p>}
      {data && (
        <>
          {/* Puntos de Gesta y título */}
          <div className="wp-gesta">
            <div className="wp-gesta-top">
              <span className="wp-gesta-pts"><GameIcon name="laurel-crown" artist="lorc" /> {gesta.puntos} <small>Gesta</small></span>
              <div className="wp-gesta-bar">
                <span style={{ width: `${proximo ? ((gesta.puntos - anterior) / (proximo.puntos - anterior)) * 100 : 100}%` }} />
              </div>
              <small className="wp-gesta-next">{proximo ? `Próximo hito: ${proximo.puntos} · ${proximo.texto}` : '¡Todos los hitos!'}</small>
            </div>
            <ul className="wp-gesta-hitos">
              {gesta.hitos.map((h) => (
                <li key={h.puntos} className={h.logrado ? 'is-on' : ''} title={h.texto}><b>{h.puntos}</b> {h.texto}</li>
              ))}
            </ul>
            <div className="wp-gesta-titulo">
              <span>Título:</span>
              {tituloActual
                ? (
                  <>
                    <b>«{tituloActual.name}»</b>
                    <small>{tituloActual.premio}</small>
                    <button type="button" className="wp-btn wp-btn--sm" disabled={busy} onClick={() => equipar(null)}>Quitar</button>
                  </>
                )
                : <small>Ninguno. Gana un logro y equipa su título: se ve sobre tu nombre.</small>}
            </div>
          </div>

          {/* un grupo por pestaña */}
          <div className="wp-ach-tabs">
            {data.grupos.map((g) => {
              const all = logros.filter((a) => a.grupo === g.id);
              const [n, ar] = GRUPO_ICON[g.id] ?? ['medal', 'lorc'];
              return (
                <button key={g.id} type="button" className={`wp-ach-tab${tab === g.id ? ' is-on' : ''}`} onClick={() => setTab(g.id)} title={g.name}>
                  <GameIcon name={n} artist={ar} /> {g.name} <b>{all.filter((a) => a.unlocked).length}/{all.length}</b>
                </button>
              );
            })}
          </div>

          <div className="wp-ach-grid">
            {delGrupo.map((a) => {
              const pctDone = Math.min(100, (a.progress.current / a.progress.required) * 100);
              const equipado = data.titulo === a.code;
              return (
                <div key={a.code} className={`wp-ach${a.unlocked ? ' wp-ach--done' : ''}${a.secreto && !a.unlocked ? ' wp-ach--secret' : ''}${equipado ? ' wp-ach--equipped' : ''}`}>
                  <span className="wp-ach-medal"><GameIcon name={a.unlocked ? 'star-medal' : a.secreto ? 'locked-chest' : 'medal'} artist={a.unlocked || a.secreto ? 'delapouite' : 'lorc'} /></span>
                  <div className="wp-ach-body">
                    <div className="wp-ach-head"><strong>{a.name}</strong><span className="wp-ach-pts">{a.puntos}</span></div>
                    <p className="wp-ach-lore">«{a.lore}»</p>
                    {a.como && <p className="wp-ach-como">{a.como}</p>}
                    {!(a.secreto && !a.unlocked) && <small className="wp-ach-bonus">{a.caceria ? '' : 'Título: '}{a.premio}</small>}
                    {!a.unlocked && a.progress.required > 1 && (
                      <>
                        <span className="wp-ach-bar"><span style={{ width: `${pctDone}%` }} /></span>
                        <small className="wp-ach-progress">{a.progress.current.toLocaleString()} / {a.progress.required.toLocaleString()}</small>
                      </>
                    )}
                    {a.unlocked && !a.caceria && (
                      equipado
                        ? <span className="wp-ach-equipped">✦ Lo llevas puesto</span>
                        : <button type="button" className="wp-btn wp-btn--sm" disabled={busy} onClick={() => equipar(a.code)}>Equipar título</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
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
