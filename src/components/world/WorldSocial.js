import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { socialStore } from '../../game/socialStore';
import './WorldSocial.css';
import Aviso from '../Avisos';

// Lo social del mundo 2D del lado de React: entra a la zona por socket y reparte a la escena lo
// que hacen los demás (posiciones, globitos, gestos, emojis, estados); avisa si estás en
// combate o ausente; avisos de amigos; menú al hacer clic en otro jugador y ruleta de emojis (T).
// Grupo: avisos por socket (invitación, cambios del grupo, combate del grupo, misión compartida).

export const EMOJIS = ['❤️', '😂', '👍', '❗', '❓', '💤', '😮', '😡'];
export const COMMENDS = [
  { kind: 'valiente', label: 'Valiente', icon: '🛡' },
  { kind: 'amable', label: 'Amable', icon: '💛' },
  { kind: 'guia', label: 'Guía', icon: '🧭' },
];
const AFK_MS = 3 * 60 * 1000;
const FRIEND_TOAST_COOLDOWN = 60 * 1000;

const isTyping = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export default function WorldSocial({ worldReady, zoneDir, baseClass, inBattle, watching, level, coop, onCoopChanged }) {
  const { player, token } = useAuth();
  const { socket, connected } = useSocket();
  const [menu, setMenu] = useState(null);
  const [card, setCard] = useState(null);
  const [menuNote, setMenuNote] = useState('');
  const [shared, setShared] = useState(null); // misión que te ofrece un compañero de grupo
  const [tradeAsk, setTradeAsk] = useState(null); // alguien quiere comerciar contigo
  const [wheel, setWheel] = useState(false);
  const [toasts, setToasts] = useState([]);
  const lastActive = useRef(Date.now());
  const afk = useRef(false);
  const friendToastAt = useRef({});

  useEffect(() => { if (player) socialStore.init(player.id); }, [player]);

  const toast = (text, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'tour' ? 7000 : 4200);
  };

  useEffect(() => {
    const onToast = ({ text, kind }) => { toast(text, kind); audio.sfx(kind === 'error' ? 'error' : 'mision'); };
    bus.on('social-toast', onToast);
    return () => bus.off('social-toast', onToast);
  }, []);

  // ---- tu mascota activa (la que te sigue): los demás jugadores también la ven ----
  const petRef = useRef(null);
  useEffect(() => {
    const onPet = (species) => {
      petRef.current = species ?? null;
      if (socket && connected) socket.emit('world:pet', petRef.current);
    };
    bus.on('world-pet', onPet);
    return () => bus.off('world-pet', onPet);
  }, [socket, connected]);

  // ---- entrar a la zona y repartir lo que llega por socket a la escena ----
  useEffect(() => {
    if (!worldReady || !socket || !connected || !player || !zoneDir) return undefined;
    const enter = () => bus.emit('hero-pos', (p) => {
      socket.emit('world:enter', { zone: zoneDir, x: p.x, y: p.y, facing: p.facing, flip: p.flip, cls: baseClass, pet: petRef.current }, (r) => {
        if (!r?.ok) return;
        bus.emit('others-roster', { me: player.id, list: r.roster });
        bus.emit('my-guild', r.me?.guild ?? null);
        bus.emit('my-title', { titulo: r.me?.titulo ?? null, aura: !!r.me?.aura });
        if (socialStore.get().lfg) socket.emit('world:lfg', true);
      });
    });
    enter();
    const forward = {
      'world:join': 'other-join', 'world:leave': 'other-leave', 'world:moved': 'other-move', 'world:typing': 'other-typing',
      'world:say': 'other-say', 'world:emote': 'other-emote', 'world:emoji': 'other-emoji', 'world:state': 'other-state',
      'world:lfg': 'other-lfg', 'world:pet': 'other-pet',
    };
    const fns = Object.entries(forward).map(([ev, to]) => [ev, (data) => bus.emit(to, data)]);
    fns.forEach(([ev, fn]) => socket.on(ev, fn));
    const onMove = (m) => { lastActive.current = Date.now(); socket.emit('world:move', m); };
    const onLfg = (on) => socket.emit('world:lfg', on);
    // el mismo personaje entró al mundo desde otra pestaña: esta deja de mostrarse a los demás
    const onReplaced = () => {
      bus.emit('others-roster', { me: player.id, list: [] });
      toast('Entraste al mundo desde otra pestaña: aquí los demás ya no te ven', 'error');
    };
    // se unió, salió o fundó un gremio (o equipó un título de logro): el servidor recarga sus datos y
    // todos ven la etiqueta nueva
    const onGuildChanged = () => socket.emit('world:refresh', null, (r) => {
      if (!r?.ok) return;
      bus.emit('my-guild', r.me?.guild ?? null);
      bus.emit('my-title', { titulo: r.me?.titulo ?? null, aura: !!r.me?.aura });
    });
    socket.on('world:replaced', onReplaced);
    bus.on('guild-changed', onGuildChanged);
    bus.on('hero-moved', onMove);
    bus.on('social-lfg', onLfg);
    return () => {
      fns.forEach(([ev, fn]) => socket.off(ev, fn));
      socket.off('world:replaced', onReplaced);
      bus.off('guild-changed', onGuildChanged);
      bus.off('hero-moved', onMove);
      bus.off('social-lfg', onLfg);
      socket.emit('world:leave');
      bus.emit('others-roster', { me: player.id, list: [] });
    };
  }, [worldReady, socket, connected, player, zoneDir, baseClass]);

  // ---- avisos: amigos que se conectan, elogios recibidos, susurros (para "Recientes") ----
  useEffect(() => {
    if (!socket || !player) return undefined;
    const friendNote = (id, text) => {
      const last = friendToastAt.current[id] ?? 0;
      if (Date.now() - last < FRIEND_TOAST_COOLDOWN) return;
      friendToastAt.current[id] = Date.now();
      toast(text, 'friend');
      audio.sfx('abrir');
      bus.emit('social-refresh');
    };
    const onOnline = (f) => friendNote(f.id, `★ ${f.name} se conectó`);
    const onOffline = (f) => friendNote(f.id, `☆ ${f.name} se desconectó`);
    const onCommended = ({ kind }) => {
      const c = COMMENDS.find((x) => x.kind === kind);
      toast(`${c?.icon ?? '★'} ¡Alguien te elogió como ${c?.label ?? kind}!`, 'ok');
      audio.sfx('mision');
    };
    const onWhisper = (m) => { if (m.from.id !== player.id) socialStore.meet({ id: m.from.id, name: m.from.name }, 'susurro'); };
    socket.on('social:friend-online', onOnline);
    socket.on('social:friend-offline', onOffline);
    socket.on('social:commended', onCommended);
    socket.on('world:whisper', onWhisper);
    return () => {
      socket.off('social:friend-online', onOnline);
      socket.off('social:friend-offline', onOffline);
      socket.off('social:commended', onCommended);
      socket.off('world:whisper', onWhisper);
    };
  }, [socket, player]);

  // ---- grupo: avisos por socket ----
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => { window.dispatchEvent(new Event('coop-refresh')); bus.emit('coop-changed'); };
    const onInvite = (inv) => {
      toast(`⚔ ${inv.leader?.nickname ?? 'Alguien'} te invita a su grupo`, 'friend');
      audio.sfx('abrir');
      refresh();
    };
    // un compañero chocó con monstruos cerca de ti: entras a su combate
    const onBattle = (b) => bus.emit('coop-battle', b);
    const onQuestShare = (q) => { setShared(q); audio.sfx('mision'); };
    // tu grupo entró en combate sin ti (estabas lejos o en otra pelea)
    const onMissed = (m) => toast(m.why === 'lleno'
      ? `${m.leaderName ?? 'Tu grupo'} entró con su formación completa: no quedaba lugar para ti. Haz tu propio intento.`
      : m.why === 'aliento'
      ? `${m.leaderName ?? 'Tu grupo'} entró sin ti: todavía estabas recuperando el aliento.`
      : m.why === 'ocupado'
      ? `${m.leaderName ?? 'Tu grupo'} entró en otro combate mientras peleabas.`
      : m.why === 'observando'
      ? `${m.leaderName ?? 'Tu grupo'} entró en combate mientras mirabas otra pelea.`
      : `${m.leaderName ?? 'Tu grupo'} entró en combate lejos de ti.`, 'info');
    socket.on('coop:battle-missed', onMissed);
    // alguien del grupo se conectó o se desconectó: se recarga la lista del grupo (gris si no está)
    const onPresence = () => bus.emit('coop-changed');
    socket.on('coop:presence', onPresence);
    socket.on('coop:invite', onInvite);
    socket.on('coop:changed', refresh);
    socket.on('coop:battle', onBattle);
    socket.on('coop:quest-share', onQuestShare);
    return () => {
      socket.off('coop:invite', onInvite);
      socket.off('coop:changed', refresh);
      socket.off('coop:battle', onBattle);
      socket.off('coop:quest-share', onQuestShare);
      socket.off('coop:battle-missed', onMissed);
      socket.off('coop:presence', onPresence);
    };
  }, [socket]);

  // ---- muñecos de venta: la escena los dibuja con la lista que le mandamos ----
  // (todo el continente se ve a la vez, así que se piden los de las zonas con mercado)
  useEffect(() => {
    if (!worldReady || !player) return undefined;
    let alive = true;
    const zonas = ['aurelia'];
    const load = (zona) => api.getPuestos(player.id, zona, token)
      .then((r) => { if (alive) bus.emit('stalls-state', { zone: zona, puestos: r.puestos }); })
      .catch(() => {});
    zonas.forEach(load);
    const onChanged = (c) => { if (zonas.includes(c?.zone)) load(c.zone); };
    // alguien le compró a tu muñeco: te llega el oro al momento
    const onSold = (s) => {
      toast(`🧸 ${s.buyer ?? 'Alguien'} le compró ${s.quantity}x ${s.name} a tu muñeco (+${Number(s.earned).toLocaleString()} de oro)`, 'ok');
      audio.sfx('monedas');
      bus.emit('inventory-changed');
    };
    socket?.on('stalls:changed', onChanged);
    socket?.on('stall:sold', onSold);
    return () => {
      alive = false;
      socket?.off('stalls:changed', onChanged);
      socket?.off('stall:sold', onSold);
    };
  }, [worldReady, player, token, socket]);

  // ---- correo: cartas sin leer (la banderita del buzón y el aviso) ----
  useEffect(() => {
    if (!player) return undefined;
    const refresh = () => api.getUnreadCount(player.id, token)
      .then((r) => bus.emit('mail-unread', r.unreadMessages ?? 0)).catch(() => {});
    const onMail = (m) => {
      toast(`✉ ${m?.from ? `Carta de ${m.from}` : 'Te llegó una carta'}${m?.attach ? ' con cosas para recoger' : ''}. Léela en un buzón o en Social.`, 'friend');
      audio.sfx('mision');
      refresh();
    };
    if (worldReady) refresh();
    socket?.on('mail:new', onMail);
    bus.on('mail-refresh', refresh);
    return () => {
      socket?.off('mail:new', onMail);
      bus.off('mail-refresh', refresh);
    };
  }, [player, token, socket, worldReady]);

  // ---- comercio: solicitudes y apertura de la ventana ----
  useEffect(() => {
    if (!socket) return undefined;
    const onRequested = ({ from }) => { setTradeAsk(from); audio.sfx('abrir'); };
    const onDeclined = ({ by }) => toast(`${by} no quiso comerciar ahora.`, 'info');
    const onOpen = (t) => { setTradeAsk(null); bus.emit('open-window', { id: 'comercio', args: { trade: t } }); audio.sfx('abrir'); };
    socket.on('trade:requested', onRequested);
    socket.on('trade:declined', onDeclined);
    socket.on('trade:open', onOpen);
    return () => {
      socket.off('trade:requested', onRequested);
      socket.off('trade:declined', onDeclined);
      socket.off('trade:open', onOpen);
    };
  }, [socket]);

  // la solicitud caduca sola (el servidor la olvida a los 30 s)
  useEffect(() => {
    if (!tradeAsk) return undefined;
    const t = setTimeout(() => setTradeAsk(null), 30000);
    return () => clearTimeout(t);
  }, [tradeAsk]);

  const answerTrade = (accept) => {
    const from = tradeAsk;
    setTradeAsk(null);
    socket?.emit('trade:respond', { from: from.id, accept }, (r) => { if (r?.error) { toast(r.error, 'error'); audio.sfx('error'); } });
  };

  const askTrade = () => {
    const to = menu;
    setMenu(null);
    socket?.emit('trade:request', { to: to.id }, (r) => {
      if (r?.error) { toast(r.error, 'error'); audio.sfx('error'); } else toast(`Le pediste a ${to.name} comerciar. Esperando respuesta…`, 'info');
    });
  };

  // ---- refuerzos: acercarte a un compañero de grupo que pelea y unirte a su batalla (su menú) ----
  const joinAllyBattle = async (ally) => {
    setMenu(null);
    try {
      const st = await api.reinforceCombat(ally.leaderId, token);
      bus.emit('coop-battle-join', { kind: 'refuerzo', sessionId: st.session?.id, leaderName: ally.leaderName }, (ok) => {
        // el mapa estaba ocupado (otro aviso): el combate queda guardado y se retoma al volver
        if (!ok) toast('Te uniste a la batalla: entrarás en cuanto termines lo que estás haciendo.', 'info');
      });
    } catch (err) { toast(err.message, 'error'); audio.sfx('error'); }
  };

  const acceptShared = async () => {
    const q = shared;
    setShared(null);
    try {
      await api.acceptQuest(player.id, q.questId, token);
      toast(`Aceptaste «${q.questName}». Lo que cacen juntos cuenta para los dos.`, 'ok');
      audio.sfx('mision');
      bus.emit('quests-changed');
    } catch (err) { toast(err.message, 'error'); audio.sfx('error'); }
  };

  // subió de nivel (o cambió de gremio / amigos): los demás ven el número nuevo
  useEffect(() => {
    if (socket && connected && level) socket.emit('world:refresh');
  }, [level, socket, connected]);

  // ---- estados: en combate / mirando un combate / fabricando / ausente (3 min sin hacer nada) ----
  const [crafting, setCrafting] = useState(false);
  useEffect(() => {
    bus.on('crafting', setCrafting);
    return () => bus.off('crafting', setCrafting);
  }, []);
  useEffect(() => {
    if (!socket || !connected) return undefined;
    const send = () => {
      const idle = Date.now() - lastActive.current > AFK_MS;
      afk.current = idle;
      socket.emit('world:state', { state: watching ? 'observando' : inBattle ? 'combate' : crafting ? 'crafteando' : idle ? 'ausente' : null });
    };
    send();
    const onActivity = () => {
      lastActive.current = Date.now();
      if (afk.current) send();
    };
    window.addEventListener('keydown', onActivity);
    window.addEventListener('mousedown', onActivity);
    const t = setInterval(send, 15000);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('mousedown', onActivity);
    };
  }, [socket, connected, inBattle, watching, crafting]);

  // ---- clic en otro jugador (o en un nombre de la ventana Social) ----
  useEffect(() => {
    const onMenu = (m) => {
      if (m.state === undefined) bus.emit('player-state', m.id, (state) => { m = { ...m, state }; });
      setMenu(m);
      setCard(null);
      setMenuNote('');
      audio.sfx('abrir');
      api.getPlayerCard(player.id, m.id, token).then(setCard).catch(() => setCard(null));
    };
    bus.on('player-menu', onMenu);
    return () => bus.off('player-menu', onMenu);
  }, [player, token]);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!e.target.closest?.('.ws-menu')) setMenu(null); };
    const esc = (e) => { if (e.key === 'Escape') setMenu(null); };
    // el clic que abrió el menú todavía está subiendo hasta window: si se escucha ya, lo cierra
    // en el mismo instante. Se empieza a escuchar en el siguiente turno.
    const t = setTimeout(() => {
      window.addEventListener('mousedown', close);
      window.addEventListener('keydown', esc);
    }, 0);
    return () => { clearTimeout(t); window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [menu]);

  const act = async (fn, ok, after) => {
    try { await fn(); setMenuNote(ok); audio.sfx('mision'); after?.(); bus.emit('social-refresh'); } catch (err) { setMenuNote(err.message); audio.sfx('error'); }
  };
  const reloadCard = () => api.getPlayerCard(player.id, menu.id, token).then(setCard).catch(() => {});
  const isFriend = card?.friendship === 'ACCEPTED';
  // ¿ya está en tu grupo? entonces no se le invita: se ve que está contigo (y el líder puede expulsarlo)
  const inMyGroup = !!menu && !!coop?.members?.some((m) => m.id === menu.id);

  // ---- ruleta de emojis (T) ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || inBattle) return;
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setWheel((w) => !w); return; }
      if (!wheel) return;
      if (e.key === 'Escape') { setWheel(false); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= EMOJIS.length) { e.preventDefault(); e.stopPropagation(); sendEmoji(EMOJIS[n - 1]); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const sendEmoji = (emoji) => {
    setWheel(false);
    socket?.emit('world:emoji', { emoji }, (r) => { if (r?.error) toast(r.error, 'error'); });
  };

  return (
    <>
      {menu && (
        <div className="ws-menu" style={{ left: Math.min(menu.x + 8, window.innerWidth - 250), top: Math.max(8, Math.min(menu.y + 8, window.innerHeight - 380)) }}>
          <div className="ws-menu-head">
            <b>{menu.name}</b>
            <small>Nivel {card?.level ?? menu.level}{card?.class_name ? ` · ${card.class_name}` : ''}{(card?.guild_name ?? menu.guild?.name) ? ` · ‹${card?.guild_name ?? menu.guild.name}›` : ''}</small>
            {card?.status_text && <em className="ws-menu-status">“{card.status_text}”</em>}
            {card && (
              <div className="ws-menu-badges">
                {COMMENDS.map((c) => <span key={c.kind} title={c.label}>{c.icon} {card.commends[c.kind]}</span>)}
                {isFriend && <span className="ws-bond" title={`${card.bond.points} minutos juntos`}>♥ {card.bond.name}</span>}
              </div>
            )}
          </div>
          <button type="button" onClick={() => { bus.emit('chat-prefill', `/s ${menu.name} `); setMenu(null); }}>💬 Susurrar</button>
          {inMyGroup ? (
            <>
              <p className="ws-menu-note ws-menu-group">⚔ En tu grupo</p>
              {coop?.isLeader && (
                <button type="button" onClick={() => act(() => api.kickCoopMember(player.id, menu.id, token), `${menu.name} ya no está en tu grupo`, () => { onCoopChanged?.(); window.dispatchEvent(new Event('coop-refresh')); })}>✖ Expulsar del grupo</button>
              )}
            </>
          ) : (
            <button type="button" onClick={() => act(() => api.sendCoopInvite(player.id, menu.id, token), 'Invitación al grupo enviada')}>⚔ Invitar al grupo</button>
          )}
          {menu.state === 'combate' && inMyGroup && (
            <button type="button" onClick={() => joinAllyBattle({ leaderId: menu.id, leaderName: menu.name })}>⚔ Unirse a la batalla</button>
          )}
          {menu.state === 'combate' && (
            <button
              type="button"
              onClick={async () => {
                setMenu(null);
                try {
                  // se pide antes de salir del mapa: si ya terminó, te enteras sin moverte
                  const initial = await api.watchCombat(menu.id, token);
                  bus.emit('spectate-start', { targetId: menu.id, name: menu.name, initial }, (ok) => {
                    if (!ok) toast('Ahora no puedes mirar otro combate.', 'error');
                  });
                } catch (err) { toast(err.message, 'error'); audio.sfx('error'); }
              }}
            >
              👁 Ver combate
            </button>
          )}
          <button type="button" onClick={() => { bus.emit('open-window', { id: 'inspeccionar', args: { targetId: menu.id, name: menu.name } }); setMenu(null); }}>🛡 Inspeccionar</button>
          <button type="button" onClick={askTrade}>🤝 Comerciar</button>
          <button type="button" onClick={() => { bus.emit('open-window', { id: 'buzon', args: { to: menu.name } }); setMenu(null); }}>✉ Escribir carta</button>
          <button type="button" onClick={() => { bus.emit('follow-player', { id: menu.id, name: menu.name }); setMenu(null); toast(`Sigues a ${menu.name}. Muévete para dejar de seguirlo.`, 'info'); }}>👣 Seguir</button>
          <button type="button" onClick={() => { socialStore.setTrack({ id: menu.id, name: menu.name }); setMenu(null); toast(`Siguiendo el rastro de ${menu.name}`, 'info'); }}>➜ Rastro</button>
          {!isFriend && card?.direction !== 'sent' && (
            <button type="button" onClick={() => act(() => api.sendFriendRequest(player.id, menu.id, token), card?.direction === 'received' ? '¡Ahora son amigos!' : 'Solicitud de amistad enviada', reloadCard)}>
              ★ {card?.direction === 'received' ? 'Aceptar su solicitud' : 'Agregar amigo'}
            </button>
          )}
          {card?.direction === 'sent' && !isFriend && <p className="ws-menu-note">Solicitud de amistad pendiente</p>}
          <div className="ws-commend">
            <span>Elogiar:</span>
            {COMMENDS.map((c) => (
              <button key={c.kind} type="button" disabled={!!card?.commendedToday} title={card?.commendedToday ? 'Ya lo elogiaste hoy' : c.label}
                className={card?.commendedToday === c.kind ? 'on' : ''}
                onClick={() => act(() => api.commendPlayer(player.id, menu.id, c.kind, token), `Elogiaste a ${menu.name}: ${c.label}`, reloadCard)}
              >
                {c.icon}
              </button>
            ))}
          </div>
          {menuNote && <p className="ws-menu-note">{menuNote}</p>}
        </div>
      )}

      {wheel && (
        <div className="ws-wheel" role="dialog" aria-label="Emojis">
          {EMOJIS.map((e, i) => {
            const a = (i / EMOJIS.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <button key={e} type="button" style={{ transform: `translate(${Math.cos(a) * 78}px, ${Math.sin(a) * 78}px)` }} onClick={() => sendEmoji(e)}>
                <span>{e}</span><kbd>{i + 1}</kbd>
              </button>
            );
          })}
          <span className="ws-wheel-hint">T / Esc</span>
        </div>
      )}

      {/* en la misma columna que el aviso de logro (components/Avisos.js): nunca se pisan */}
      <Aviso orden={1}><div className="ws-toasts">
        {toasts.map((t) => <div key={t.id} className={`ws-toast ws-toast--${t.kind}`}>{t.text}</div>)}
      </div></Aviso>

      {tradeAsk && (
        <div className="ws-share ws-trade-ask" role="dialog" aria-label="Solicitud de comercio">
          <img src={`${process.env.PUBLIC_URL}/assets/mundo/comercio.png`} alt="" />
          <p><b>{tradeAsk.name}</b> quiere comerciar contigo.</p>
          <span>
            <button type="button" className="wp-btn wp-btn--gold" onClick={() => answerTrade(true)}>Aceptar</button>
            <button type="button" className="wp-btn" onClick={() => answerTrade(false)}>Rechazar</button>
          </span>
        </div>
      )}

      {shared && (
        <div className="ws-share" role="dialog" aria-label="Misión compartida">
          <p><b>{shared.fromName}</b> comparte una misión contigo:</p>
          <strong>«{shared.questName}»</strong>
          <small>Si la aceptas, lo que cacen juntos cuenta para los dos.</small>
          <span>
            <button type="button" className="wp-btn wp-btn--gold" onClick={acceptShared}>Aceptar</button>
            <button type="button" className="wp-btn" onClick={() => setShared(null)}>Ahora no</button>
          </span>
        </div>
      )}
    </>
  );
}
