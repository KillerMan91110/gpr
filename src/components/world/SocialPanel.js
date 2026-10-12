import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { socialStore } from '../../game/socialStore';
import { CLASS_ICON } from '../../utils/classIcons';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { COMMENDS } from './WorldSocial';
import './SocialPanel.css';

// Ventana Social (O): tu tarjeta (estado y "busco grupo"), amigos con dónde están y qué hacen,
// favoritos, notas y lazos; quién está cerca; con quién te cruzaste; solicitudes y buzón.

const TABS = [
  { id: 'amigos', label: 'Amigos', icon: ['two-shadows', 'lorc'] },
  { id: 'cerca', label: 'Cerca', icon: ['radar-sweep', 'lorc'] },
  { id: 'recientes', label: 'Recientes', icon: ['backward-time', 'delapouite'] },
  { id: 'solicitudes', label: 'Solicitudes', icon: ['envelope', 'lorc'] },
  { id: 'buzon', label: 'Buzón', icon: ['mailbox', 'delapouite'] },
];
const ZONE_NAMES = { pradera: 'Pradera Dorada', aurelia: 'Aurelia' };
const STATE_LABEL = { combate: '⚔ En combate', ausente: '💤 Ausente' };

function ago(iso) {
  if (!iso) return 'hace tiempo';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function ClassBadge({ code, online, state }) {
  const icon = CLASS_ICON[code] || CLASS_ICON[String(code ?? '').toUpperCase()] || { name: 'person', artist: 'delapouite' };
  const dot = !online ? 'off' : state === 'combate' ? 'combat' : state === 'ausente' ? 'away' : 'on';
  return (
    <span className="sp-badge">
      <GameIcon name={icon.name} artist={icon.artist} />
      <i className={`sp-dot sp-dot--${dot}`} />
    </span>
  );
}

export default function SocialPanel(props) {
  const { openWindow } = props;
  const { player, token } = useAuth();
  const { socket, connected } = useSocket();
  const [tab, setTab] = useState('amigos');
  const [data, setData] = useState(null);
  const [who, setWho] = useState({ here: [], friends: [] });
  const [store, setStore] = useState(socialStore.get());
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState(null);
  const [noteEdit, setNoteEdit] = useState(null);
  const [msg, setMsg] = useState('');
  const [mail, setMail] = useState(null);
  const [onlyLfg, setOnlyLfg] = useState(false);
  const [here, setHere] = useState(null); // mi posición y subzona (para distancias)

  const load = useCallback(() => {
    api.getSocialOverview(player.id, token).then((d) => {
      setData(d);
      setStatus((s) => (document.activeElement?.classList?.contains('sp-status-input') ? s : d.me.statusText));
    }).catch((err) => setMsg(err.message));
  }, [player, token]);

  // quién está conectado y dónde (por socket), cada pocos segundos mientras la ventana está abierta
  const refreshWho = useCallback(() => {
    if (!socket || !connected) return;
    socket.emit('world:who', null, (r) => {
      if (!r) return;
      const withSub = (list) => list.map((p) => {
        let sub = null;
        bus.emit('subzone-at', { x: p.x, y: p.y, zone: p.zone }, (name) => { sub = name; });
        return { ...p, sub };
      });
      setWho({ here: withSub(r.here), friends: withSub(r.friends) });
    });
    bus.emit('hero-pos', (p) => setHere(p));
  }, [socket, connected]);

  useEffect(() => {
    load();
    refreshWho();
    api.getUnreadCount(player.id, token).then(setMail).catch(() => {});
    const t1 = setInterval(refreshWho, 4000);
    const t2 = setInterval(load, 30000);
    const onRefresh = () => { load(); refreshWho(); };
    const onStore = (s) => setStore({ ...s });
    bus.on('social-refresh', onRefresh);
    bus.on('social-store', onStore);
    return () => { clearInterval(t1); clearInterval(t2); bus.off('social-refresh', onRefresh); bus.off('social-store', onStore); };
  }, [load, refreshWho, player, token]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };
  const run = async (fn, ok) => {
    try { await fn(); if (ok) flash(ok); audio.sfx('mision'); load(); socket?.emit('world:refresh'); } catch (err) { flash(err.message); audio.sfx('error'); }
  };

  const online = useMemo(() => Object.fromEntries(who.friends.map((f) => [f.id, f])), [who]);
  const friends = useMemo(() => {
    const list = (data?.friends ?? []).filter((f) => !filter || `${f.nickname} ${f.note}`.toLowerCase().includes(filter.toLowerCase()));
    return {
      fav: list.filter((f) => f.favorite),
      on: list.filter((f) => !f.favorite && online[f.id]),
      off: list.filter((f) => !f.favorite && !online[f.id]),
    };
  }, [data, filter, online]);
  const onlineCount = (data?.friends ?? []).filter((f) => online[f.id]).length;
  const requestCount = data?.requests.length ?? 0;

  const saveStatus = (text) => {
    if (text === data?.me.statusText) return;
    run(() => api.setSocialStatus(player.id, text, token), 'Estado actualizado');
  };
  const toggleLfg = () => {
    socialStore.setLfg(!store.lfg);
    audio.sfx('abrir');
  };
  const locationOf = (f) => {
    const o = online[f.id];
    if (!o) return `Desconectado · ${ago(f.last_seen)}`;
    const zone = ZONE_NAMES[o.zone] ?? o.zone;
    return [zone, o.sub].filter(Boolean).join(' · ');
  };
  const menuFor = (e, p) => {
    const r = e.currentTarget.getBoundingClientRect();
    bus.emit('player-menu', { id: p.id, name: p.nickname ?? p.name, level: p.level, x: r.left - 250, y: r.top });
  };

  const doSearch = async (q) => {
    if (q.trim().length < 2) { setSearch(null); return; }
    try { setSearch(await api.searchPlayers(player.id, q.trim(), token)); } catch (err) { flash(err.message); }
  };

  const renderFriend = (f) => {
    const o = online[f.id];
    const isOpen = open === f.id;
    const b = f.bond;
    const pct = b.next ? Math.min(100, ((b.points - b.from) / (b.next.at - b.from)) * 100) : 100;
    return (
      <li key={f.id} className={`sp-friend${o ? ' is-on' : ''}${isOpen ? ' is-open' : ''}`}>
        <div className="sp-row" onClick={() => setOpen(isOpen ? null : f.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(isOpen ? null : f.id)}>
          <ClassBadge code={f.class_code} online={!!o} state={o?.state} />
          <div className="sp-main">
            <div className="sp-name">
              <b>{f.nickname}</b> <small>Nv {f.level}</small>
              {o?.lfg && <span className="sp-lfg" title="Busca grupo">⚑ busca grupo</span>}
            </div>
            <div className="sp-loc">{o?.state ? STATE_LABEL[o.state] : locationOf(f)}</div>
            {f.status_text && <div className="sp-status">“{f.status_text}”</div>}
            {f.note && <div className="sp-note">📝 {f.note}</div>}
          </div>
          <div className="sp-side">
            <button type="button" className={`sp-star${f.favorite ? ' on' : ''}`} title={f.favorite ? 'Quitar de favoritos' : 'Favorito'}
              onClick={(e) => { e.stopPropagation(); run(() => api.setFriendNote(player.id, f.id, { favorite: !f.favorite }, token)); }}
            >★</button>
            <span className={`sp-bond sp-bond--${b.tier}`} title={`Lazo: ${b.name} (${b.points} min juntos)`}>♥</span>
          </div>
        </div>
        {isOpen && (
          <div className="sp-detail">
            <div className="sp-bondbar">
              <span>♥ {b.name}</span>
              <span className="sp-bar"><span style={{ width: `${pct}%` }} /></span>
              <small>{b.next ? `${b.points}/${b.next.at} min juntos → ${b.next.name}` : `${b.points} min juntos · lazo máximo`}</small>
            </div>
            <div className="sp-commends">
              {COMMENDS.map((c) => <span key={c.kind} title={c.label}>{c.icon} {f.commends[c.kind]}</span>)}
              <small>Amigos desde {new Date(f.friends_since).toLocaleDateString('es')}</small>
            </div>
            {noteEdit?.id === f.id ? (
              <form className="sp-noteform" onSubmit={(e) => { e.preventDefault(); run(() => api.setFriendNote(player.id, f.id, { note: noteEdit.text }, token), 'Nota guardada'); setNoteEdit(null); }}>
                <input autoFocus maxLength={120} value={noteEdit.text} placeholder="Nota solo para ti (ej: tanque, juega de noche)" onChange={(e) => setNoteEdit({ id: f.id, text: e.target.value })} />
                <button type="submit">Guardar</button>
              </form>
            ) : null}
            <div className="sp-actions">
              <button type="button" onClick={() => bus.emit('chat-prefill', `/s ${f.nickname} `)} disabled={!o}>💬 Susurrar</button>
              <button type="button" disabled={!o} onClick={() => { socialStore.setTrack({ id: f.id, name: f.nickname }); flash(`Siguiendo el rastro de ${f.nickname}`); }}>➜ Rastro</button>
              <button type="button" onClick={() => run(() => api.sendCoopInvite(player.id, f.id, token), 'Invitación al grupo enviada')} disabled={!o}>⚔ Invitar</button>
              <button type="button" onClick={() => setNoteEdit({ id: f.id, text: f.note })}>📝 Nota</button>
              <button type="button" onClick={(e) => menuFor(e, f)}>⋯ Más</button>
              <button type="button" className="sp-danger" onClick={() => { if (window.confirm(`¿Quitar a ${f.nickname} de tus amigos?`)) run(() => api.removeFriend(player.id, f.id, token), 'Amigo eliminado'); }}>✕</button>
            </div>
          </div>
        )}
      </li>
    );
  };

  const section = (title, list, empty) => (
    <>
      <h4 className="sp-h">{title} <small>{list.length}</small></h4>
      {list.length ? <ul className="sp-list">{list.map(renderFriend)}</ul> : empty && <p className="sp-empty">{empty}</p>}
    </>
  );

  const nearby = who.here.filter((p) => !onlyLfg || p.lfg).map((p) => ({ ...p, dist: here ? Math.round(Math.hypot(p.x - here.x, p.y - here.y) / 32) : null }))
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  const friendIds = new Set((data?.friends ?? []).map((f) => f.id));

  return (
    <FloatingPanel {...props} id="social" title="Social" icon={<GameIcon name="two-shadows" artist="lorc" />} width={Math.min(520, window.innerWidth - 16)}>
      <div className="sp-root">
        <div className="sp-content">
          {/* tu tarjeta */}
          <div className="sp-me">
            <div className="sp-me-top">
              <b>{player.nickname}</b>
              <span className="sp-me-commends" title="Elogios recibidos">{COMMENDS.map((c) => <span key={c.kind}>{c.icon} {data?.me.commends[c.kind] ?? 0}</span>)}</span>
            </div>
            <div className="sp-me-row">
              <input
                className="sp-status-input"
                maxLength={80}
                placeholder="¿Qué estás haciendo? (lo ven tus amigos)"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                onBlur={(e) => saveStatus(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
              <button type="button" className={`sp-lfg-btn${store.lfg ? ' on' : ''}`} onClick={toggleLfg} title="Muestra una bandera sobre tu personaje para que te inviten">
                ⚑ {store.lfg ? 'Buscando grupo' : 'Busco grupo'}
              </button>
            </div>
          </div>

          {msg && <p className="sp-msg">{msg}</p>}
          {!data && <p className="sp-empty">Cargando…</p>}

          {data && tab === 'amigos' && (
            <>
              <div className="sp-tools">
                <input placeholder="Buscar amigo o agregar por nombre…" value={filter} onChange={(e) => { setFilter(e.target.value); doSearch(e.target.value); }} />
              </div>
              {search && search.filter((r) => !friendIds.has(r.id)).length > 0 && (
                <ul className="sp-list sp-search">
                  {search.filter((r) => !friendIds.has(r.id)).map((r) => (
                    <li key={r.id} className="sp-simple">
                      <ClassBadge code={r.class_code} online={false} />
                      <span><b>{r.nickname}</b> <small>Nv {r.level}</small></span>
                      {r.friendship_status === 'PENDING'
                        ? <em>{r.friendship_direction === 'sent' ? 'Pendiente' : 'Te envió solicitud'}</em>
                        : <button type="button" onClick={() => run(() => api.sendFriendRequest(player.id, r.id, token), `Solicitud enviada a ${r.nickname}`).then(() => doSearch(filter))}>+ Agregar</button>}
                    </li>
                  ))}
                </ul>
              )}
              {section('★ Favoritos', friends.fav, null)}
              {section(`En línea`, friends.on, (data.friends.length ? 'Ningún otro amigo conectado ahora.' : 'Todavía no tienes amigos. Busca a alguien arriba, o haz clic en un jugador del mapa → Agregar amigo.'))}
              {section('Desconectados', friends.off, null)}
            </>
          )}

          {data && tab === 'cerca' && (
            <>
              <div className="sp-tools">
                <label className="sp-check"><input type="checkbox" checked={onlyLfg} onChange={(e) => setOnlyLfg(e.target.checked)} /> Solo los que buscan grupo</label>
              </div>
              <h4 className="sp-h">En tu zona <small>{nearby.length}</small></h4>
              {nearby.length === 0 && <p className="sp-empty">No hay nadie más por aquí… por ahora.</p>}
              <ul className="sp-list">
                {nearby.map((p) => (
                  <li key={p.id} className="sp-simple sp-click" onClick={(e) => menuFor(e, p)} role="button" tabIndex={0} onKeyDown={() => {}}>
                    <ClassBadge code={p.cls?.toUpperCase()} online state={p.state} />
                    <span className="sp-grow">
                      <b>{p.name}</b> <small>Nv {p.level}</small>{friendIds.has(p.id) && <small className="sp-isfriend"> ★ amigo</small>}
                      <span className="sp-loc">{p.state ? STATE_LABEL[p.state] : p.sub ?? ''}{p.lfg ? ' · ⚑ busca grupo' : ''}</span>
                    </span>
                    {p.dist != null && <em className="sp-dist">{p.dist} m</em>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {data && tab === 'recientes' && (
            <>
              <h4 className="sp-h">Aventureros con los que te cruzaste <small>{store.recent.length}</small></h4>
              {store.recent.length === 0 && <p className="sp-empty">Cuando pases cerca de otros jugadores, o te susurren, aparecerán aquí para que puedas agregarlos.</p>}
              <ul className="sp-list">
                {store.recent.map((r) => (
                  <li key={r.id} className="sp-simple">
                    <ClassBadge code={r.cls?.toUpperCase()} online={!!who.here.find((p) => p.id === r.id) || !!online[r.id]} />
                    <span className="sp-grow">
                      <b>{r.name}</b> {r.level && <small>Nv {r.level}</small>}
                      <span className="sp-loc">{r.how === 'susurro' ? 'Te susurró' : `Se cruzaron${r.where ? ` en ${r.where}` : ''}`} · {ago(r.at)}</span>
                    </span>
                    {friendIds.has(r.id)
                      ? <em className="sp-isfriend">★ amigo</em>
                      : <button type="button" onClick={() => run(() => api.sendFriendRequest(player.id, r.id, token), `Solicitud enviada a ${r.name}`)}>+ Agregar</button>}
                    <button type="button" className="sp-x" title="Quitar de la lista" onClick={() => socialStore.forget(r.id)}>×</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data && tab === 'solicitudes' && (
            <>
              <h4 className="sp-h">Te quieren agregar <small>{data.requests.length}</small></h4>
              {data.requests.length === 0 && <p className="sp-empty">No tienes solicitudes nuevas.</p>}
              <ul className="sp-list">
                {data.requests.map((r) => (
                  <li key={r.id} className="sp-simple">
                    <ClassBadge code={r.class_code} online={!!online[r.id]} />
                    <span className="sp-grow"><b>{r.nickname}</b> <small>Nv {r.level} · {r.class_name}</small><span className="sp-loc">{ago(r.requested_at)}</span></span>
                    <button type="button" className="sp-ok" onClick={() => run(() => api.acceptFriendRequest(player.id, r.id, token), `¡Ahora eres amigo de ${r.nickname}!`)}>Aceptar</button>
                    <button type="button" className="sp-x" title="Rechazar" onClick={() => run(() => api.removeFriend(player.id, r.id, token), 'Solicitud rechazada')}>×</button>
                  </li>
                ))}
              </ul>
              <h4 className="sp-h">Enviadas <small>{data.sent.length}</small></h4>
              <ul className="sp-list">
                {data.sent.map((r) => (
                  <li key={r.id} className="sp-simple">
                    <span className="sp-grow"><b>{r.nickname}</b> <small>Nv {r.level}</small><span className="sp-loc">Esperando respuesta</span></span>
                    <button type="button" className="sp-x" title="Cancelar" onClick={() => run(() => api.removeFriend(player.id, r.id, token), 'Solicitud cancelada')}>×</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data && tab === 'buzon' && (
            <div className="sp-mail">
              <GameIcon name="mailbox" artist="delapouite" />
              <p>{mail?.unread ? `Tienes ${mail.unread} carta${mail.unread === 1 ? '' : 's'} sin leer.` : 'No tienes cartas nuevas.'}</p>
              <p className="sp-empty">En el buzón puedes escribir cartas a tus amigos y enviarles oro u objetos.</p>
              <button type="button" className="wp-btn wp-btn--gold" onClick={() => openWindow?.('buzon')}>Abrir el buzón</button>
            </div>
          )}
        </div>

        {/* pestañas verticales a la derecha (como el panel social nuevo de WoW) */}
        <nav className="sp-rail">
          {TABS.map((t) => {
            const count = { amigos: `${onlineCount}/${data?.friends.length ?? 0}`, cerca: who.here.length, solicitudes: requestCount || '', buzon: mail?.unread || '' }[t.id] ?? '';
            const alert = (t.id === 'solicitudes' && requestCount > 0) || (t.id === 'buzon' && mail?.unread > 0);
            return (
              <button key={t.id} type="button" className={`${tab === t.id ? 'on' : ''}${alert ? ' alert' : ''}`} onClick={() => setTab(t.id)} title={t.label}>
                <GameIcon name={t.icon[0]} artist={t.icon[1]} />
                <span>{t.label}</span>
                {count !== '' && <small>{count}</small>}
              </button>
            );
          })}
        </nav>
      </div>
    </FloatingPanel>
  );
}
