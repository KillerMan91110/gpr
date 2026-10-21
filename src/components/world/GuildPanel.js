import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import bus from '../../game/bus';
import { guiar, SERVICIOS, LUGARES } from '../../game/cityGuide';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { ORDENES, emblemaDe, ordenDe } from './OrderPanel';
import './GuildPanel.css';

const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };
const ONLINE_MS = 5 * 60 * 1000;
const DEPOSIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Deben coincidir con GUILD_EMBLEMS / GUILD_COLORS de lib/guilds.js en el back.
const GUILD_EMBLEMS = ['🐉', '🦁', '⚔️', '🛡️', '🔥', '❄️', '👑', '🦅', '🐺', '☠️', '⭐', '🌙'];
const GUILD_COLORS = ['#d4af37', '#e0394f', '#4fa0e0', '#5fd97e', '#b572e0', '#f0a93a', '#7a1020', '#143a66', '#ece3cf', '#b9b3c4'];
// Debe coincidir con combatBonusMultipliers de lib/guilds.js en el back.
const combatBonus = (level) => { const l = Math.min(level || 0, 20); return { gold: l, xp: l * 0.5 }; };
const LEVEL_BENEFITS = [
  { level: 1, label: 'Hasta 10 miembros' },
  { level: 2, label: 'Banco de gremio y tienda exclusiva' },
  { level: 3, label: 'Emblema y color propios' },
  { level: 4, label: 'Hasta 20 miembros' },
  { level: 5, label: 'Hasta 30 miembros' },
];

function describeActivity(e) {
  const actor = e.actor_nickname ?? 'Alguien';
  const target = e.target_nickname ?? 'un miembro';
  const meta = e.meta ?? {};
  switch (e.type) {
    case 'JOIN': return `${target} se unió al gremio.`;
    case 'LEAVE': return `${actor} abandonó el gremio.`;
    case 'KICK': return `${actor} expulsó a ${target}.`;
    case 'PROMOTE': return `${actor} ascendió a ${target} a Oficial.`;
    case 'DEMOTE': return `${actor} degradó a ${target} a Miembro.`;
    case 'TRANSFER': return `${actor} le pasó el liderazgo a ${target}.`;
    case 'EDIT': return `${actor} actualizó la información del gremio.`;
    case 'LEVEL_UP': return `¡El gremio subió a nivel ${meta.newLevel ?? '?'}!`;
    case 'DONATION': return `${actor} donó ${Number(meta.amount ?? 0).toLocaleString()} de oro al banco.`;
    case 'SHOP_PURCHASE': return `${actor} compró un objeto de la tienda para ${target}.`;
    case 'CONTRACT': return `Encargo cumplido: «${meta.titulo ?? 'encargo'}» (+${meta.xp ?? 0} XP para el gremio).`;
    case 'CONTRACT_ALL': return `¡El gremio cumplió los tres encargos de la semana! (+${meta.xp ?? 0} XP)`;
    default: return `${actor} hizo algo en el gremio.`;
  }
}

function daysLeft(date) {
  const h = Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 3600000));
  return h >= 48 ? `${Math.floor(h / 24)} días` : h >= 24 ? '1 día' : `${h} h`;
}

function ago(date) {
  if (!date) return '—';
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
const isOnline = (d) => !!d && Date.now() - new Date(d).getTime() < ONLINE_MS;

// Ventana del gremio (G). Con gremio es tu sala: miembros, banco, registro y gestión. Sin gremio
// explica que hay que ir al Registro de Gremios de Aurelia (Oswin). Los servicios de la ciudad
// ya no se abren desde aquí: la pestaña Ciudad te guía con la flecha hasta quien los ofrece.
export default function GuildPanel({ onClose, zIndex, onActivate, defaultPos, openWindow, stats, onChanged }) {
  const { player, token } = useAuth();
  const [guild, setGuild] = useState(undefined);
  const [tab, setTab] = useState('sala');
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState(null);
  const [bank, setBank] = useState(null);
  const [shop, setShop] = useState(null);
  const [masters, setMasters] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null); // acción peligrosa esperando confirmación
  const [editing, setEditing] = useState(null);
  const [donate, setDonate] = useState('');
  const [buy, setBuy] = useState({ item: '', qty: 1, to: '' });

  const loadGuild = useCallback(async () => {
    const g = await api.getMyGuildOpcional(token).catch(() => null);
    setGuild(g);
    if (g && (g.myRole === 'LEADER' || g.myRole === 'OFFICER')) {
      setRequests(await api.getGuildRequests(token, g.id).catch(() => []));
    }
    return g;
  }, [token]);

  useEffect(() => {
    loadGuild();
    const t = setInterval(loadGuild, 30000);
    return () => clearInterval(t);
  }, [loadGuild]);

  const loadExtras = useCallback(async (g) => {
    if (!g) return;
    const [act, mas, con] = await Promise.all([
      api.getGuildActivity(token, g.id).catch(() => []),
      api.getGuildMasters(token, g.id).catch(() => []),
      api.getGuildContracts(token, g.id).catch(() => null),
    ]);
    setActivity(act);
    setMasters(mas);
    setContracts(con);
    if (g.level >= 2) {
      const [b, s] = await Promise.all([api.getGuildBank(token, g.id).catch(() => null), api.getGuildBankShop(token, g.id).catch(() => [])]);
      setBank(b);
      setShop(s);
    }
  }, [token]);
  useEffect(() => { loadExtras(guild); }, [guild?.id, guild?.level]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  // acción común: llama al back, avisa y recarga el gremio
  const run = async (key, fn, okText) => {
    if (busy) return false;
    setBusy(key);
    try {
      const r = await fn();
      audio.sfx('clic');
      setMessage({ ok: true, text: okText ?? r?.message ?? 'Hecho.' });
      const g = await loadGuild();
      await loadExtras(g);
      onChanged?.();
      bus.emit('guild-changed');
      return true;
    } catch (err) {
      audio.sfx('error');
      setMessage({ ok: false, text: err.message });
      return false;
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const orden = ordenDe(stats);
  const goTo = (lugares, info) => { guiar(lugares, info); onClose?.(); };
  // el maestro de tu orden (ver OrderPanel): la flecha apunta delante de él
  const goToOrder = () => {
    const o = ORDENES[orden];
    bus.emit('social-tour', [{ name: `${o.maestro} · ${o.casa}`, x: o.pos[0] * 32 + 16, y: o.pos[1] * 32 + 40, zona: 'aurelia', info: 'Aquí aprendes las técnicas de tu orden y compras su equipo.' }]);
    bus.emit('social-toast', { text: `La flecha te lleva con ${o.maestro}, en el Barrio de las Órdenes de Aurelia.`, kind: 'tour' });
    onClose?.();
  };

  const ciudad = (
    <div className="gh-city">
      {orden && (
        <button type="button" className="wp-guild-order" onClick={goToOrder}>
          <img src={emblemaDe(orden)} alt="" />
          <span>
            <strong>Tu orden · {ORDENES[orden].casa}</strong>
            <small>Técnicas y equipo de tu clase, en persona con {ORDENES[orden].maestro} (Barrio de las Órdenes de Aurelia).</small>
          </span>
        </button>
      )}
      <p className="gh-note">Los servicios se piden en persona. Elige uno y la flecha te lleva con quien lo ofrece (el más cercano a donde estés).</p>
      <div className="wp-tiles">
        {SERVICIOS.map((s) => (
          <button key={s.id} type="button" className="wp-tile" title={s.desc} onClick={() => goTo(s.lugares, s.desc)}>
            <span className="wp-tile-icon"><GameIcon name={s.icon[0]} artist={s.icon[1]} /></span>
            <strong>{s.title}</strong>
            <small>{s.lugares.map((l) => LUGARES[l].name.split(' · ')[0]).filter((n, i, a) => a.indexOf(n) === i).join(' o ')}</small>
          </button>
        ))}
        <button type="button" className="wp-tile" title="Comercia con otros jugadores" onClick={() => openWindow?.('mercado')}>
          <span className="wp-tile-icon"><GameIcon name="money-stack" artist="delapouite" /></span>
          <strong>Mercado</strong>
          <small>Desde cualquier lugar (B)</small>
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ sin gremio
  if (guild === null) {
    return (
      <FloatingPanel id="gremio" title="Gremio de aventureros" icon={<GameIcon name="castle" artist="delapouite" />} width={560}
        defaultPos={defaultPos} onClose={onClose} zIndex={zIndex} onActivate={onActivate}>
        <div className="wp-guild-banner">
          <img className="gh-oswin" src={`${process.env.PUBLIC_URL}/assets/mundo/retratos/oswin.png`} alt="" />
          <div className="wp-guild-info">
            <strong>Sin gremio</strong>
            <small>Para unirte a un gremio o fundar el tuyo, ve al Registro de Gremios de Aurelia y habla con Oswin. Un gremio te da oro y experiencia extra en cada combate.</small>
            <span className="wp-guild-actions">
              <button type="button" className="wp-btn wp-btn--gold" onClick={() => goTo(['oswin'], 'Aquí te unes a un gremio o fundas el tuyo.')}>Llévame con Oswin</button>
            </span>
          </div>
        </div>
        <h4 className="wp-section-title">La ciudad</h4>
        {ciudad}
      </FloatingPanel>
    );
  }

  // ------------------------------------------------------------------ con gremio
  const g = guild;
  const isLeader = g?.myRole === 'LEADER';
  const isOfficer = g?.myRole === 'OFFICER';
  const myId = String(player?.id);
  const xpPct = g && g.xpToNextLevel > 0 ? Math.min(100, Math.round((g.xp / g.xpToNextLevel) * 100)) : 100;
  const donatedToday = bank?.myLastDonationAt && Date.now() - new Date(bank.myLastDonationAt).getTime() < DEPOSIT_COOLDOWN_MS;
  const contractsDone = contracts?.encargos.filter((c) => c.done).length ?? 0;
  const tabs = [['sala', 'Sala'], ['encargos', `Encargos${contracts ? ` ${contractsDone}/${contracts.encargos.length}` : ''}`], ['miembros', `Miembros${requests.length ? ` (${requests.length}!)` : ''}`], ['banco', 'Banco'], ['registro', 'Registro'], ['ciudad', 'Ciudad']];

  return (
    <FloatingPanel
      id="gremio"
      title={g ? g.name : 'Gremio'}
      icon={<GameIcon name="castle" artist="delapouite" />}
      width={600}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={g && (
        <div className="wp-tabs">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" className={`wp-tab${tab === id ? ' wp-tab--active' : ''}`} onClick={() => { setTab(id); setConfirm(null); }}>{label}</button>
          ))}
          <span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text}</span>
        </div>
      )}
    >
      {g === undefined && <p className="wp-empty">Cargando…</p>}
      {g && (
        <>
          {/* estandarte: emblema, nivel, rol y experiencia */}
          <header className="gh-banner" style={g.color ? { '--gh-color': g.color } : undefined}>
            <span className="gh-emblem">{g.emblem || <GameIcon name="castle" artist="delapouite" />}</span>
            <div className="gh-banner-main">
              <strong>{g.name}</strong>
              <small>
                Nivel {g.level} · {g.type === 'OPEN' ? 'Abierto' : 'Cerrado'} · {g.members.length}/{g.memberCap} miembros · Eres {ROLE_LABEL[g.myRole]?.toLowerCase() ?? g.myRole}
              </small>
              <div className="gh-xp" title={`${g.xp.toLocaleString()} / ${g.xpToNextLevel.toLocaleString()} XP`}>
                <div style={{ width: `${xpPct}%` }} />
                <span>{xpPct}% hacia el nivel {g.level + 1}</span>
              </div>
            </div>
          </header>

          {tab === 'sala' && (
            <div className="gh-scroll">
              {!editing ? (
                <section className="gh-card gh-parchment">
                  <h5><GameIcon name="scroll-unfurled" artist="lorc" /> Mensaje del líder</h5>
                  <p>{g.description || 'El líder todavía no dejó un mensaje.'}</p>
                  {isLeader && <button type="button" className="wp-btn" onClick={() => setEditing({ name: g.name, description: g.description ?? '', type: g.type, emblem: g.emblem ?? '', color: g.color ?? '' })}>Editar gremio</button>}
                </section>
              ) : (
                <form
                  className="gh-card gh-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const body = { name: editing.name.trim(), description: editing.description.trim() || undefined, type: editing.type };
                    if (g.level >= 3 && editing.emblem) body.emblem = editing.emblem;
                    if (g.level >= 3 && editing.color) body.color = editing.color;
                    run('edit', () => api.editGuild(token, g.id, body), 'Gremio actualizado.').then((ok) => ok && setEditing(null));
                  }}
                >
                  <label>Nombre<input className="wp-search" value={editing.name} maxLength={50} required onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
                  <label>Mensaje<textarea className="wp-search" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
                  <div className="gh-radio">
                    {[['OPEN', 'Abierto: cualquiera entra'], ['CLOSED', 'Cerrado: por solicitud']].map(([v, l]) => (
                      <label key={v}><input type="radio" checked={editing.type === v} onChange={() => setEditing({ ...editing, type: v })} /> {l}</label>
                    ))}
                  </div>
                  {g.level >= 3 ? (
                    <>
                      <div className="gh-picks">{GUILD_EMBLEMS.map((em) => <button key={em} type="button" className={editing.emblem === em ? 'is-on' : ''} onClick={() => setEditing({ ...editing, emblem: em })}>{em}</button>)}</div>
                      <div className="gh-picks">{GUILD_COLORS.map((c) => <button key={c} type="button" className={`gh-color${editing.color === c ? ' is-on' : ''}`} style={{ background: c }} onClick={() => setEditing({ ...editing, color: c })} />)}</div>
                    </>
                  ) : <p className="gh-note">El emblema y el color propios se desbloquean en el nivel 3.</p>}
                  <span className="gh-actions">
                    <button type="button" className="wp-btn" onClick={() => setEditing(null)}>Cancelar</button>
                    <button type="submit" className="wp-btn wp-btn--gold" disabled={!!busy}>Guardar</button>
                  </span>
                </form>
              )}

              <div className="gh-grid">
                <section className="gh-card">
                  <h5>En combate</h5>
                  <div className="gh-row"><span>Bonificación</span><b>+{combatBonus(g.level).gold}% oro · +{combatBonus(g.level).xp}% XP</b></div>
                  <div className="gh-row"><span>Victorias</span><b>{g.combatStats?.wins ?? 0}</b></div>
                  <div className="gh-row"><span>Derrotas</span><b>{g.combatStats?.losses ?? 0}</b></div>
                  <div className="gh-row"><span>Jefes abatidos</span><b>{g.combatStats?.bossKills ?? 0}</b></div>
                </section>
                <section className="gh-card">
                  <h5>Beneficios</h5>
                  {LEVEL_BENEFITS.map((b) => (
                    <div key={b.level} className={`gh-row${g.level >= b.level ? ' is-on' : ' is-off'}`}><span>Nv {b.level}</span><b>{b.label}</b></div>
                  ))}
                </section>
              </div>

              {masters?.length > 0 && (
                <section className="gh-card">
                  <h5>Maestros del gremio</h5>
                  {masters.map((m) => (
                    <div key={m.id} className="gh-row">
                      <span><b>{m.name}</b> <em>«{m.guild_dialogue}»</em></span>
                      <button type="button" className="wp-btn" onClick={() => openWindow?.('maestro_gremio', { path: `/guild/my/masters/${m.id}` })}>Ver</button>
                    </div>
                  ))}
                </section>
              )}

              <section className="gh-card gh-danger">
                {isLeader ? (
                  confirm === 'disolver' ? (
                    <>
                      <p>¿Seguro? Disolver borra el gremio entero y no se puede deshacer.</p>
                      <span className="gh-actions">
                        <button type="button" className="wp-btn" onClick={() => setConfirm(null)}>Cancelar</button>
                        <button type="button" className="wp-btn gh-btn-danger" disabled={!!busy} onClick={() => run('dissolve', () => api.dissolveGuild(token, g.id), 'El gremio se disolvió.')}>Sí, disolver</button>
                      </span>
                    </>
                  ) : (
                    <>
                      <p>Eres el líder: pasa el liderazgo a otro miembro para poder salir, o disuelve el gremio.</p>
                      <button type="button" className="wp-btn gh-btn-danger" onClick={() => setConfirm('disolver')}>Disolver gremio</button>
                    </>
                  )
                ) : confirm === 'salir' ? (
                  <span className="gh-actions">
                    <span>¿Seguro que quieres salir del gremio?</span>
                    <button type="button" className="wp-btn" onClick={() => setConfirm(null)}>No</button>
                    <button type="button" className="wp-btn gh-btn-danger" disabled={!!busy} onClick={() => run('leave', () => api.leaveGuild(token, g.id))}>Sí, salir</button>
                  </span>
                ) : <button type="button" className="wp-btn gh-btn-danger" onClick={() => setConfirm('salir')}>Salir del gremio</button>}
              </section>
            </div>
          )}

          {tab === 'encargos' && (
            <div className="gh-scroll">
              {!contracts && <p className="gh-note">Cargando los encargos de la semana…</p>}
              {contracts && (
                <>
                  <p className="gh-note">
                    Encargos de esta semana: se cumplen jugando (combates, recolección, donaciones) entre todos los miembros.
                    Cada uno da +{contracts.xpPorEncargo} XP al gremio, y completar los tres, +{contracts.xpBono} más.
                    Se renuevan en {daysLeft(contracts.endsAt)}.
                  </p>
                  {contracts.encargos.map((c) => (
                    <section key={c.code} className={`gh-card gh-contract${c.done ? ' is-done' : ''}`}>
                      <div className="gh-row"><b className="gh-contract-title">{c.titulo}</b><small>{c.done ? '✓ Cumplido' : `+${contracts.xpPorEncargo} XP`}</small></div>
                      <span className="gh-note">{c.texto}</span>
                      <div className="gh-xp gh-contract-bar"><div style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }} /><span>{c.progress.toLocaleString()} / {c.target.toLocaleString()}</span></div>
                    </section>
                  ))}
                  <section className={`gh-card gh-contract${contracts.bonoCobrado ? ' is-done' : ''}`}>
                    <div className="gh-row"><b className="gh-contract-title">Los tres de la semana</b><small>{contracts.bonoCobrado ? '✓ Cobrado' : `+${contracts.xpBono} XP`}</small></div>
                  </section>
                </>
              )}
            </div>
          )}

          {tab === 'miembros' && (
            <div className="gh-scroll">
              {(isLeader || isOfficer) && requests.length > 0 && (
                <section className="gh-card">
                  <h5>Solicitudes de ingreso</h5>
                  {requests.map((r) => (
                    <div key={r.id} className="gh-member">
                      <span className="gh-member-name">{r.nickname}<small>{r.class_name ? `${r.class_name} · ` : ''}Nv {r.level}</small></span>
                      <span className="gh-actions">
                        <button type="button" className="wp-btn wp-btn--gold" disabled={!!busy} onClick={() => run(`req-${r.id}`, () => api.acceptGuildRequest(token, g.id, r.id), `${r.nickname} ya es del gremio.`)}>Aceptar</button>
                        <button type="button" className="wp-btn" disabled={!!busy} onClick={() => run(`req-${r.id}`, () => api.rejectGuildRequest(token, g.id, r.id), 'Solicitud rechazada.')}>Rechazar</button>
                      </span>
                    </div>
                  ))}
                </section>
              )}
              <section className="gh-card">
                <h5>Miembros ({g.members.length}/{g.memberCap})</h5>
                {[...g.members].sort((a, b) => Number(isOnline(b.last_seen_at)) - Number(isOnline(a.last_seen_at)) || b.level - a.level).map((m) => {
                  const self = String(m.id) === myId;
                  const canKick = !self && m.role !== 'LEADER' && (isLeader || (isOfficer && m.role === 'MEMBER'));
                  const canPromote = !self && isLeader && m.role === 'MEMBER';
                  const canDemote = !self && isLeader && m.role === 'OFFICER';
                  const canTransfer = !self && isLeader;
                  const sure = confirm === `m-${m.id}`;
                  return (
                    <div key={m.id} className="gh-member">
                      <span className={`gh-dot${isOnline(m.last_seen_at) ? ' is-on' : ''}`} title={isOnline(m.last_seen_at) ? 'En línea' : `Visto ${ago(m.last_seen_at)}`} />
                      <span className="gh-member-name">
                        {m.nickname}{self && <em> (tú)</em>}
                        <small>{m.class_name ? `${m.class_name} · ` : ''}Nv {m.level}{isOnline(m.last_seen_at) ? ' · en línea' : ` · ${ago(m.last_seen_at)}`}</small>
                      </span>
                      <span className={`gh-role gh-role--${m.role}`}>{ROLE_LABEL[m.role] ?? m.role}</span>
                      {(canKick || canPromote || canDemote || canTransfer) && (
                        sure ? (
                          <span className="gh-actions">
                            {canPromote && <button type="button" className="wp-btn" disabled={!!busy} onClick={() => run('p', () => api.promoteGuildMember(token, g.id, m.id, 'OFFICER'))}>↑ Oficial</button>}
                            {canDemote && <button type="button" className="wp-btn" disabled={!!busy} onClick={() => run('p', () => api.promoteGuildMember(token, g.id, m.id, 'MEMBER'))}>↓ Miembro</button>}
                            {canTransfer && <button type="button" className="wp-btn" disabled={!!busy} onClick={() => run('t', () => api.transferGuildLeadership(token, g.id, m.id))}>Dar liderazgo</button>}
                            {canKick && <button type="button" className="wp-btn gh-btn-danger" disabled={!!busy} onClick={() => run('k', () => api.kickGuildMember(token, g.id, m.id))}>Expulsar</button>}
                            <button type="button" className="wp-btn" onClick={() => setConfirm(null)}>✕</button>
                          </span>
                        ) : <button type="button" className="wp-btn" onClick={() => setConfirm(`m-${m.id}`)}>Gestionar</button>
                      )}
                    </div>
                  );
                })}
              </section>
            </div>
          )}

          {tab === 'banco' && (
            <div className="gh-scroll">
              {g.level < 2 ? <p className="wp-empty">El banco y la tienda del gremio se desbloquean en el nivel 2.</p> : (
                <>
                  <section className="gh-card gh-bank">
                    <span className="gh-bank-gold"><GameIcon name="two-coins" artist="delapouite" /> {Number(bank?.bankGold ?? g.bankGold ?? 0).toLocaleString()}</span>
                    <small>Aportado esta semana: {Number(bank?.weeklyContribution ?? 0).toLocaleString()} de oro</small>
                    <form className="gh-actions" onSubmit={(e) => {
                      e.preventDefault();
                      const amount = Math.floor(Number(donate));
                      if (!amount || amount <= 0) { setMessage({ ok: false, text: 'Escribe cuánto oro quieres donar.' }); return; }
                      run('donate', () => api.depositGuildBank(token, g.id, amount)).then((ok) => ok && setDonate(''));
                    }}>
                      <input className="wp-search" type="number" min="1" placeholder="Oro a donar" value={donate} disabled={donatedToday} onChange={(e) => setDonate(e.target.value)} />
                      <button type="submit" className="wp-btn wp-btn--gold" disabled={!!busy || donatedToday}>Donar</button>
                    </form>
                    {donatedToday && <small>Ya donaste hoy. Podrás volver a donar en {Math.ceil((DEPOSIT_COOLDOWN_MS - (Date.now() - new Date(bank.myLastDonationAt).getTime())) / 3600000)} h.</small>}
                  </section>
                  {bank?.topContributors?.length > 0 && (
                    <section className="gh-card">
                      <h5>Los que más aportan</h5>
                      {bank.topContributors.map((c, i) => (
                        <div key={c.playerId} className="gh-row"><span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {c.nickname}</span><b>{Number(c.totalDonated).toLocaleString()} oro</b></div>
                      ))}
                    </section>
                  )}
                  <section className="gh-card">
                    <h5>Tienda del gremio</h5>
                    {!shop?.length ? <p className="gh-note">{shop === null ? 'Cargando…' : 'No hay objetos a la venta.'}</p>
                      : (isLeader || isOfficer) ? (
                        <form className="gh-buy" onSubmit={(e) => {
                          e.preventDefault();
                          if (!buy.item || !buy.to) { setMessage({ ok: false, text: 'Elige un objeto y a quién enviárselo.' }); return; }
                          run('buy', () => api.buyGuildBankShopItem(token, g.id, Number(buy.item), Number(buy.qty) || 1, Number(buy.to))).then((ok) => ok && setBuy({ item: '', qty: 1, to: '' }));
                        }}>
                          <select className="wp-search" value={buy.item} onChange={(e) => setBuy({ ...buy, item: e.target.value })}>
                            <option value="">Objeto…</option>
                            {shop.map((it) => <option key={it.id} value={it.id}>{it.name} · {Number(it.buy_price).toLocaleString()} oro</option>)}
                          </select>
                          <input className="wp-search" type="number" min="1" value={buy.qty} onChange={(e) => setBuy({ ...buy, qty: e.target.value })} />
                          <select className="wp-search" value={buy.to} onChange={(e) => setBuy({ ...buy, to: e.target.value })}>
                            <option value="">Para…</option>
                            {g.members.map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                          </select>
                          <button type="submit" className="wp-btn wp-btn--gold" disabled={!!busy}>Comprar y enviar</button>
                        </form>
                      ) : <p className="gh-note">El líder y los oficiales compran con el oro del banco y te lo envían por el buzón.</p>}
                  </section>
                </>
              )}
            </div>
          )}

          {tab === 'registro' && (
            <div className="gh-scroll">
              <section className="gh-card">
                {activity === null && <p className="gh-note">Cargando…</p>}
                {activity?.length === 0 && <p className="gh-note">Todavía no pasó nada en el gremio.</p>}
                {activity?.map((e) => (
                  <div key={e.id} className="gh-row"><span>{describeActivity(e)}</span><small>{ago(e.created_at)}</small></div>
                ))}
              </section>
            </div>
          )}

          {tab === 'ciudad' && <div className="gh-scroll">{ciudad}</div>}
        </>
      )}
    </FloatingPanel>
  );
}
