import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { socialStore } from '../../game/socialStore';
import PlayerInspectModal from '../PlayerInspectModal';
import './WorldSocial.css';

// Lo social del mundo 2D del lado de React: entra a la zona por socket y reparte a la escena lo
// que hacen los demás (posiciones, globitos, gestos, emojis, estados); avisa si estás en
// combate o ausente; avisos de amigos; menú al hacer clic en otro jugador y ruleta de emojis (T).

export const EMOJIS = ['❤️', '😂', '👍', '❗', '❓', '💤', '😮', '😡'];
export const COMMENDS = [
  { kind: 'valiente', label: 'Valiente', icon: '🛡' },
  { kind: 'amable', label: 'Amable', icon: '💛' },
  { kind: 'guia', label: 'Guía', icon: '🧭' },
];
const AFK_MS = 3 * 60 * 1000;
const FRIEND_TOAST_COOLDOWN = 60 * 1000;

const isTyping = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export default function WorldSocial({ worldReady, zoneDir, baseClass, inBattle, level }) {
  const { player, token } = useAuth();
  const { socket, connected } = useSocket();
  const [menu, setMenu] = useState(null);
  const [card, setCard] = useState(null);
  const [menuNote, setMenuNote] = useState('');
  const [inspect, setInspect] = useState(null);
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

  // ---- entrar a la zona y repartir lo que llega por socket a la escena ----
  useEffect(() => {
    if (!worldReady || !socket || !connected || !player || !zoneDir) return undefined;
    const enter = () => bus.emit('hero-pos', (p) => {
      socket.emit('world:enter', { zone: zoneDir, x: p.x, y: p.y, facing: p.facing, flip: p.flip, cls: baseClass }, (r) => {
        if (!r?.ok) return;
        bus.emit('others-roster', { me: player.id, list: r.roster });
        if (socialStore.get().lfg) socket.emit('world:lfg', true);
      });
    });
    enter();
    const forward = {
      'world:join': 'other-join', 'world:leave': 'other-leave', 'world:moved': 'other-move', 'world:typing': 'other-typing',
      'world:say': 'other-say', 'world:emote': 'other-emote', 'world:emoji': 'other-emoji', 'world:state': 'other-state',
      'world:lfg': 'other-lfg',
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
    socket.on('world:replaced', onReplaced);
    bus.on('hero-moved', onMove);
    bus.on('social-lfg', onLfg);
    return () => {
      fns.forEach(([ev, fn]) => socket.off(ev, fn));
      socket.off('world:replaced', onReplaced);
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

  // subió de nivel (o cambió de gremio / amigos): los demás ven el número nuevo
  useEffect(() => {
    if (socket && connected && level) socket.emit('world:refresh');
  }, [level, socket, connected]);

  // ---- estados: en combate / ausente (3 min sin hacer nada) ----
  useEffect(() => {
    if (!socket || !connected) return undefined;
    const send = () => {
      const idle = Date.now() - lastActive.current > AFK_MS;
      afk.current = idle;
      socket.emit('world:state', { state: inBattle ? 'combate' : idle ? 'ausente' : null });
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
  }, [socket, connected, inBattle]);

  // ---- clic en otro jugador (o en un nombre de la ventana Social) ----
  useEffect(() => {
    const onMenu = (m) => {
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
          <button type="button" disabled={card && !isFriend} title={card && !isFriend ? 'Primero tienen que ser amigos' : ''} onClick={() => act(() => api.sendCoopInvite(player.id, menu.id, token), 'Invitación al grupo enviada')}>⚔ Invitar al grupo</button>
          <button type="button" onClick={() => { setInspect(menu.id); setMenu(null); }}>🛡 Ver equipo</button>
          <button type="button" onClick={() => { socialStore.setTrack({ id: menu.id, name: menu.name }); setMenu(null); toast(`Siguiendo el rastro de ${menu.name}`, 'info'); }}>➜ Seguir rastro</button>
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

      <div className="ws-toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`ws-toast ws-toast--${t.kind}`}>{t.text}</div>)}
      </div>

      {inspect && <PlayerInspectModal player={player} token={token} targetId={inspect} onClose={() => setInspect(null)} />}
    </>
  );
}
