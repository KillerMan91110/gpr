import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import { CardIcon } from './coleccionArt';
import GameIcon from '../GameIcon';
import ItemIcon from './ItemIcon';
import { iconForItem } from './itemIcons';
import bus from '../../game/bus';
import audio from '../../game/audio';
import { ELEMENTS, splitResistances } from '../../game/elements';
import { statusesOf } from '../../game/statuses';
import { isDungeon } from '../../game/world/shared';
import { rewindState } from '../../game/combatLog';
import './Battle.css';

const ZONE_BACKGROUND = { 1: 'pradera', 2: 'montanas', 3: 'volcan', 4: 'costas', 5: 'tundra', 6: 'catacumbas' };
// mazmorras con fondo propio (las demás pelean sobre la piedra de la cripta)
const DUNGEON_BACKGROUND = { fisura: 'fisura', arrecife: 'arrecife', cripta_congelada: 'cripta_congelada', trono_huesos: 'trono_huesos' };
// combate en grupo: a partir de cuándo se puede saltar el turno de un compañero que no responde
// (el servidor exige lo mismo, ver IDLE_TURN_MS en routes/combat.js) y cada cuánto se pregunta
// por el estado mientras actúa otro (por si se pierde un aviso del socket)
const IDLE_SKIP_MS = 30 * 1000;
const COOP_POLL_MS = 3000;

// ¿este combatiente lo manejas tú? (tu héroe o tus compañeros contratados)
// diferencia de nivel desde la que el combate se pone en contra (en el back, LEVEL_GAP_FREE + 1)
const LEVEL_GAP_WARN = 3;

function isMine(p, playerId) {
  if (p.player_id != null) return p.player_id === playerId;
  if (p.owner_player_id != null) return p.owner_player_id === playerId;
  return true;
}

// Ícono de elemento con su color (y el nombre al pasar el ratón)
function ElementIcon({ code, dim, title }) {
  const el = ELEMENTS[code];
  if (!el) return null;
  return (
    <span className={`bt-elem${dim ? ' bt-elem--dim' : ''}`} style={{ '--elem': el.color }} title={title ?? el.name}>
      <GameIcon name={el.icon[0]} artist={el.icon[1]} />
    </span>
  );
}

// Retratos de las clases base (public/portraits); las evolucionadas usan la inicial
const PORTRAITS = ['Guerrero', 'Mago', 'Arquero', 'Picaro', 'Sacerdote'];
const portraitOf = (className) => {
  const plain = (className ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const file = PORTRAITS.find((f) => f.toLowerCase() === plain.toLowerCase());
  return file ? `${process.env.PUBLIC_URL}/portraits/${file}.png` : null;
};

// Catálogo de sprites de enemigos (mismo JSON que usa la escena) para las miniaturas
let monsterCatalog = null;
const catalogPromise = fetch(`${process.env.PUBLIC_URL}/assets/sprites/combate/enemigos.json`)
  .then((r) => r.json())
  .then((j) => { monsterCatalog = j.monsters; })
  .catch(() => {});

function Face({ p }) {
  if (p.side === 'ENEMY') {
    const info = monsterCatalog?.[p.monster_code];
    if (info) {
      const { w, h } = info.frameSize;
      return (
        <span className="bt-face bt-face--monster">
          <span
            className="bt-face-sprite"
            style={{
              width: w,
              height: h,
              backgroundImage: `url(${process.env.PUBLIC_URL}/assets/sprites/combate/${info.sheet})`,
              transform: `translate(-50%, -50%) scale(${Math.min(1.1, 40 / Math.max(w, h))})`,
            }}
          />
        </span>
      );
    }
  }
  const src = p.side === 'PLAYER' ? portraitOf(p.class_name) : null;
  return (
    <span className={`bt-face bt-face--${p.side === 'PLAYER' ? 'hero' : 'monster'}`}>
      {src ? <img src={src} alt="" draggable="false" /> : <b>{p.name?.[0]}</b>}
    </span>
  );
}

// Orden de turnos como lo resuelve el servidor (lib/combat.js): dentro de la ronda los lados
// se alternan y en cada lado actúa primero el más rápido que aún no actuó; la ronda siguiente
// la abre el lado con más velocidad media.
function turnQueue(participants, nextActorId) {
  const alive = participants.filter((p) => p.hp > 0);
  const bySpd = (a, b) => b.spd - a.spd || a.id - b.id;
  const avg = (side) => {
    const l = alive.filter((p) => p.side === side);
    return l.length ? l.reduce((s, p) => s + p.spd, 0) / l.length : 0;
  };
  const opener = avg('ENEMY') > avg('PLAYER') ? 'ENEMY' : 'PLAYER';
  const build = (pool, first) => {
    const q = { PLAYER: pool.filter((p) => p.side === 'PLAYER').sort(bySpd), ENEMY: pool.filter((p) => p.side === 'ENEMY').sort(bySpd) };
    const out = [];
    let side = first;
    while (q.PLAYER.length || q.ENEMY.length) {
      if (!q[side].length) side = side === 'PLAYER' ? 'ENEMY' : 'PLAYER';
      out.push(q[side].shift());
      side = side === 'PLAYER' ? 'ENEMY' : 'PLAYER';
    }
    return out;
  };
  const current = alive.find((p) => p.id === nextActorId);
  const now = build(alive.filter((p) => !p.has_acted_this_round), current?.side ?? opener);
  return { now, next: build(alive, opener) };
}

function TurnOrder({ participants, nextActorId, round }) {
  const { now, next } = turnQueue(participants, nextActorId);
  const shownNow = now.slice(0, 7);
  const shownNext = next.slice(0, Math.max(0, 8 - shownNow.length));
  const chip = (p, i, upcoming) => (
    <span
      key={`${upcoming ? 'n' : 'c'}-${p.id}`}
      className={`bt-turn bt-turn--${p.side === 'PLAYER' ? 'ally' : 'foe'}${!upcoming && i === 0 ? ' bt-turn--now' : ''}${upcoming ? ' bt-turn--later' : ''}`}
      title={p.name}
    >
      <Face p={p} />
    </span>
  );
  return (
    <div className="bt-turns" aria-label="Orden de turnos">
      <span className="bt-turns-label">Turnos</span>
      {shownNow.map((p, i) => chip(p, i, false))}
      {shownNext.length > 0 && <span className="bt-turns-sep">R{round + 1}</span>}
      {shownNext.map((p, i) => chip(p, i, true))}
    </div>
  );
}

// Estados activos de un combatiente: ícono con su color y los turnos que le quedan
function StatusRow({ p }) {
  const list = statusesOf(p);
  if (!list.length) return null;
  return (
    <span className="bt-status-row">
      {list.map((st) => (
        <span
          key={st.key}
          className={`bt-status bt-status--${st.kind}${st.rounds === 1 ? ' bt-status--ending' : ''}`}
          style={{ '--st': st.color }}
          title={`${st.name}
${st.detail}`}
        >
          <GameIcon name={st.icon[0]} artist={st.icon[1]} />
          {st.rounds != null && <i>{st.rounds}</i>}
        </span>
      ))}
    </span>
  );
}

const onceBus = (event) => new Promise((resolve) => bus.once(event, resolve));
const maxLogId = (log) => (log ?? []).reduce((m, l) => Math.max(m, l.id), 0);

function Bar({ value, max, kind }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`bt-bar bt-bar--${kind}`}>
      <div className="bt-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Combate estilo Octopath dentro del mundo: arranca la sesión en la API, le pasa el estado a la
// escena de Phaser ('batalla') para que lo anime y muestra el menú de comandos encima.
// Arranque del combate: retoma uno pendiente o crea el del encuentro. Se guarda la promesa por
// encuentro (startRequests) para que el doble montaje de React no cree dos combates.
const startRequests = new WeakMap();
const BESTIARY_STAGE = { 1: 'estadísticas desbloqueadas', 2: 'botín desbloqueado', 3: '¡ficha dominada!' };
async function startOrResume(encounter, token, playerId) {
  // modo espectador: solo se mira el combate de otro jugador (el menú ya lo pidió para ver si
  // seguía abierto); se muestra desde ahora, sin repetir lo que ya pasó
  if (encounter.kind === 'espectar') return { initial: encounter.initial ?? await api.watchCombat(encounter.targetId, token), resumed: true };
  let initial = await api.getActiveCombatSession(token).catch(() => null);
  if (initial?.session) return { initial, resumed: true };
  // combate de un compañero de grupo: ya existe; si no está, terminó antes de que llegaras
  if (encounter.kind === 'grupo' || encounter.kind === 'retomar' || encounter.kind === 'refuerzo') throw new Error('Ese combate ya terminó.');
  // jefe desafiado en su guarida: pelea contra ese monstruo; jefe mítico: intento contra su vida
  // compartida; si no, encuentro de la zona
  try {
    if (encounter.kind === 'mythic') initial = await api.enterMitico(playerId, token);
    else if (encounter.kind === 'cripta') initial = await api.combateMazmorra(playerId, encounter.dungeon ?? 'cripta', encounter.target, token);
    else if (encounter.kind === 'emboscada') initial = await api.createCombatSession(encounter.monsters, token);
    else initial = encounter.kind === 'boss' || encounter.kind === 'esbirro'
      ? await api.createCombatSession([{ code: encounter.code, level: encounter.level }], token)
      : await api.exploreZone(encounter.zoneId, token, undefined, encounter.code, encounter.areaLevels, !!encounter.group, encounter.position, encounter.areaMonsters);
    return { initial, resumed: false };
  } catch (err) {
    // otra pestaña ya creó el combate: retomarlo
    const again = await api.getActiveCombatSession(token).catch(() => null);
    if (!again?.session) throw err;
    return { initial: again, resumed: true };
  }
}

export default function Battle({ game, encounter, heroBaseClass, onFinish }) {
  const { player, token } = useAuth();
  const { socket } = useSocket() ?? {};
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | intro | command | target | busy | end | error
  const [menu, setMenu] = useState(null); // null | 'skills' | 'items'
  const [pending, setPending] = useState(null); // { action, skill?, item?, side }
  const [skills, setSkills] = useState({});
  const [items, setItems] = useState(null);
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null);
  const [hover, setHover] = useState(null);
  // frase y vida "en vivo" mientras la escena anima el turno (el estado final llega después)
  const [liveLine, setLiveLine] = useState(null);
  const [liveHp, setLiveHp] = useState({});
  const lastLogId = useRef(0);
  const mythicRef = useRef(null);
  const [, setCatalogReady] = useState(!!monsterCatalog);
  useEffect(() => { catalogPromise.then(() => setCatalogReady(true)); }, []);

  // jefes de este combate (los anuncia la escena): cartel de entrada y barra de vida grande
  const [bosses, setBosses] = useState([]);
  const [bossIntro, setBossIntro] = useState(null);
  // refuerzos: un compañero de grupo que estaba lejos se une a tu combate ya empezado
  const [reinforce, setReinforce] = useState(null);
  const announced = useRef(new Set()); // refuerzos ya anunciados (el aviso llega por socket y por consulta)
  // aviso de nivel: si algún enemigo te pasa por LEVEL_GAP_WARN niveles o más, haces menos daño y
  // recibes más (lib/combat.js levelGapMultiplier en el back); se avisa una vez al empezar
  const [levelWarn, setLevelWarn] = useState(null);
  const levelWarned = useRef(null);
  const bossesRef = useRef([]);
  useEffect(() => {
    const onBosses = (list) => {
      bossesRef.current = list;
      setBosses(list);
      if (list.length) {
        setBossIntro(list[0]);
        setTimeout(() => setBossIntro(null), 2600);
      }
    };
    bus.on('battle-bosses', onBosses);
    return () => bus.off('battle-bosses', onBosses);
  }, []);

  useEffect(() => {
    const onLog = (log) => {
      setLiveLine(log.description);
      if (log.target_participant_id && log.hp_after != null) {
        setLiveHp((m) => ({ ...m, [log.target_participant_id]: log.hp_after }));
      }
    };
    bus.on('battle-log', onLog);
    return () => bus.off('battle-log', onLog);
  }, []);

  const participants = (state?.participants ?? []).map((p) => (liveHp[p.id] != null ? { ...p, hp: liveHp[p.id] } : p));
  const heroes = participants.filter((p) => p.side === 'PLAYER');
  const enemies = participants.filter((p) => p.side === 'ENEMY');
  const turnActor = participants.find((p) => p.id === state?.nextActorId && p.side === 'PLAYER');
  // modo espectador: no eliges nada, solo miras (y puedes dejar de mirar cuando quieras)
  const spectating = encounter.kind === 'espectar';
  // en grupo solo eliges por tus personajes; el turno de un compañero se espera
  const actor = turnActor && isMine(turnActor, player.id) ? turnActor : null;
  const waitingFor = phase === 'command' && turnActor && !actor && !spectating ? turnActor : null;
  const ownerOf = (p) => (p?.player_id != null ? p : participants.find((h) => h.player_id != null && h.player_id === p?.owner_player_id));
  const isCoop = new Set(participants.filter((p) => p.player_id != null).map((p) => p.player_id)).size > 1;
  // en grupo: si cayeron todos tus personajes pero tus compañeros siguen, puedes mirar o volver
  // a tu refugio (el servidor te saca de la pelea sin castigo)
  const mine = participants.filter((p) => p.side === 'PLAYER' && isMine(p, player.id));
  const iFell = isCoop && phase !== 'end' && phase !== 'loading' && mine.length > 0 && mine.every((p) => p.hp <= 0);
  const [watching, setWatching] = useState(false);
  const lastLine = state?.log?.length ? state.log[state.log.length - 1].description : null;

  // ---- reproducir entradas nuevas del registro en la escena ----
  // actionElement: elemento de la habilidad que acaba de usar el jugador (el registro no lo trae)
  const play = useCallback(async (next, actionElement = null, actorId = null, actionSkill = null) => {
    const logs = (next.log ?? []).filter((l) => l.id > lastLogId.current);
    lastLogId.current = Math.max(lastLogId.current, maxLogId(next.log));
    const done = onceBus('battle-played');
    bus.emit('battle-play', { logs, participants: next.participants, actionElement, actorId, actionSkill });
    // red de seguridad: si la escena no avisa (pestaña en segundo plano, error), no trabar el turno
    const limit = new Promise((resolve) => setTimeout(resolve, 4000 + logs.length * 2500));
    await Promise.race([done, limit]);
  }, []);

  const lastChangeAt = useRef(Date.now());
  const afterTurn = useCallback((next) => {
    lastChangeAt.current = Date.now();
    setState(next);
    setLiveHp({});
    const status = next.session?.status;
    if (status && status !== 'IN_PROGRESS') {
      setResult({ status, rewards: next.rewards });
      setPhase('end');
      // fin del combate: se corta la música y suena la fanfarria
      audio.music(null);
      if (status === 'PLAYER_WON') audio.jingle('victoria');
      else if (status === 'ENEMY_WON') audio.jingle('derrota');
      bus.emit('battle-active', null);
      bus.emit('battle-end', status);
    } else {
      setPhase('command');
      bus.emit('battle-active', next.nextActorId);
    }
  }, []);

  // ---- arranque: retomar un combate pendiente o explorar la zona ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // un solo pedido por encuentro aunque React monte el combate dos veces (modo estricto)
        if (!startRequests.has(encounter)) startRequests.set(encounter, startOrResume(encounter, token, player.id));
        const { initial, resumed } = await startRequests.get(encounter);
        // en la escena el héroe aparece con o sin arma según lo que tenga equipado
        const equipment = await api.getPlayerEquipment(player.id, token).catch(() => []);
        const heroHasWeapon = equipment.some((e) => e.slot === 'WEAPON' && e.item);
        if (cancelled) return;
        if (initial?.masterEncounter) {
          // los encuentros con maestros de clase siguen en la pantalla clásica
          onFinish({ redirect: `/combat/${encounter.zoneId}` });
          return;
        }
        // si se retoma un combate, no se repite su registro viejo
        lastLogId.current = resumed ? maxLogId(initial.log) : 0;
        // jefe mítico: la barra muestra la vida compartida de toda la cacería
        if (initial.mythic) mythicRef.current = { ...initial.mythic, startHp: initial.mythic.hp };
        // combate nuevo: si los enemigos ya actuaron (un jefe rápido abre con una de área), se arranca
        // con la vida de antes de su turno y ese turno se juega después de la entrada (game/combatLog.js)
        const shown = resumed ? initial : rewindState(initial);
        setState(shown);
        setPhase('intro');
        const ready = onceBus('battle-ready');
        game.scene.sleep('mundo');
        game.scene.start('batalla', {
          state: shown,
          heroBaseClass,
          heroHasWeapon,
          playerId: player.id,
          // las mazmorras pelean sobre piedra bajo tierra (el fondo de la cripta)
          background: DUNGEON_BACKGROUND[encounter.dungeon ?? encounter.position?.zona]
            ?? (encounter.kind === 'cripta' || isDungeon(encounter.position?.zona) ? 'cripta' : ZONE_BACKGROUND[encounter.zoneId] ?? 'pradera'),
        });
        await ready;
        if (cancelled) return;
        // un respiro antes del primer golpe enemigo, para que se vea venir
        if (shown !== initial) await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        await play(initial);
        if (!cancelled) afterTurn(initial);
      } catch (err) {
        if (!cancelled) { setMessage(err.message); setPhase('error'); }
      }
    })();
    return () => { cancelled = true; };
    // solo al montar: un encuentro = un combate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- enviar una acción ----
  const sending = useRef(false);
  const act = useCallback(async ({ element, skill, ...payload }) => {
    if (!actor || !state || sending.current) return; // nunca dos acciones a la vez
    sending.current = true;
    setPhase('busy');
    setMenu(null);
    setPending(null);
    bus.emit('battle-targeting', null);
    bus.emit('battle-active', null);
    try {
      const next = await api.sendCombatAction(state.session.id, { participantId: actor.id, ...payload }, token);
      await play(next, element ?? null, actor.id, skill ?? null);
      afterTurn(next);
    } catch (err) {
      setMessage(err.message);
      // el error puede venir de un estado viejo: se vuelve a pedir el real antes de seguir
      try {
        const fresh = await api.getCombatSession(state.session.id, token);
        await play(fresh);
        afterTurn(fresh);
      } catch {
        setPhase('command');
        bus.emit('battle-active', actor.id);
      }
    } finally {
      sending.current = false;
    }
  }, [actor, state, token, play, afterTurn]);

  // los temporizadores no dependen del efecto: si llega otro estado del combate antes de que salga
  // el cartel, no se cancela (solo al cerrar la pantalla)
  const levelWarnTimers = useRef([]);
  useEffect(() => () => levelWarnTimers.current.forEach(clearTimeout), []);
  const warnSessionId = state?.session?.id;
  useEffect(() => {
    if (!warnSessionId || levelWarned.current === warnSessionId) return;
    const list = state?.participants ?? [];
    const me = list.find((p) => p.player_id === player.id);
    if (!me) return;
    levelWarned.current = warnSessionId;
    const higher = list.filter((p) => p.side === 'ENEMY' && p.hp > 0 && p.level != null && me.level != null
      && p.level - me.level >= LEVEL_GAP_WARN);
    if (!higher.length) return;
    const gap = Math.max(...higher.map((p) => p.level - me.level));
    // si hay jefe, después de su cartel de entrada
    levelWarnTimers.current.push(setTimeout(() => {
      setLevelWarn({ gap, count: higher.length, key: Date.now() });
      audio.sfx('penalizacion');
      levelWarnTimers.current.push(setTimeout(() => setLevelWarn(null), 3800));
    }, bossesRef.current.length ? 2700 : 400));
  }, [warnSessionId, state?.participants, player.id]);

  // ---- combate en grupo: lo que hacen los compañeros llega por socket (y por consulta, por
  // si se pierde algún aviso); se reproduce en orden, nunca encima de una acción propia ----
  const syncing = useRef(false);
  const queued = useRef(null);
  const applyRemote = useCallback(async (next) => {
    if (!next?.session || next.session.id !== state?.session?.id) return;
    // héroes que llegan a mitad de la pelea (refuerzos; las invocaciones no cuentan)
    const known = new Set((state?.participants ?? []).map((p) => p.id));
    const newcomers = (next.participants ?? []).filter((p) => p.side === 'PLAYER' && !p.is_summon && p.player_id != null && !known.has(p.id));
    if (!newcomers.length && maxLogId(next.log) <= lastLogId.current && next.session.status === state?.session?.status) return;
    const arriving = newcomers.filter((p) => p.player_id !== player.id && !announced.current.has(p.id));
    arriving.forEach((p) => announced.current.add(p.id));
    if (arriving.length) {
      setReinforce({ names: arriving.map((p) => p.name), key: Date.now() });
      audio.sfx('mision');
      setTimeout(() => setReinforce(null), 3400);
    }
    if (sending.current || syncing.current) { queued.current = next; return; }
    syncing.current = true;
    try {
      setPhase('busy');
      await play(next);
      afterTurn(next);
    } finally {
      syncing.current = false;
      const q = queued.current;
      queued.current = null;
      if (q) applyRemote(q);
    }
  }, [state, play, afterTurn, player]);
  const sessionId = state?.session?.id;
  useEffect(() => {
    // (también peleando solo: un compañero de grupo puede llegar como refuerzo)
    if (!socket || !sessionId) return undefined;
    socket.emit('combat:join', sessionId);
    const onUpdate = (next) => applyRemote(next);
    socket.on('combat:update', onUpdate);
    return () => socket.off('combat:update', onUpdate);
  }, [socket, sessionId, applyRemote]);
  // espectador: además del socket, se pregunta cada pocos segundos (por si se pierde un aviso o
  // el combate termina sin uno, p. ej. si el jugador huye o se desconecta)
  useEffect(() => {
    if (!spectating || !sessionId || phase === 'end' || phase === 'error') return undefined;
    const t = setInterval(() => {
      api.watchSession(sessionId, token).then(applyRemote).catch(() => {});
    }, COOP_POLL_MS);
    return () => clearInterval(t);
  }, [spectating, sessionId, phase, token, applyRemote]);
  // espectador: cuando el combate que mirabas termina (gane o pierda), vuelves solo al mundo
  const stopWatching = useCallback(() => onFinish({ status: 'SPECTATE' }), [onFinish]);
  useEffect(() => {
    if (!spectating || phase !== 'end') return undefined;
    const t = setTimeout(stopWatching, 3500);
    return () => clearTimeout(t);
  }, [spectating, phase, stopWatching]);
  const waitingId = waitingFor?.id;
  useEffect(() => {
    if (!waitingId || !sessionId) return undefined;
    const t = setInterval(() => {
      api.getCombatSession(sessionId, token).then(applyRemote).catch(() => {});
    }, COOP_POLL_MS);
    return () => clearInterval(t);
  }, [waitingId, sessionId, token, applyRemote]);
  // el compañero no responde: pasados IDLE_SKIP_MS se puede hacer que se defienda
  const [, setIdleTick] = useState(0);
  useEffect(() => {
    if (!waitingId) return undefined;
    const t = setInterval(() => setIdleTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [waitingId]);
  const idleLeft = waitingFor ? Math.max(0, IDLE_SKIP_MS - (Date.now() - lastChangeAt.current)) : 0;
  const skipIdle = useCallback(async () => {
    if (!waitingFor || sending.current) return;
    sending.current = true;
    setPhase('busy');
    try {
      const next = await api.sendCombatAction(state.session.id, { participantId: waitingFor.id, action: 'DEFEND', skipIdle: true }, token);
      await play(next);
      afterTurn(next);
    } catch (err) {
      setMessage(err.message);
      setPhase('command');
    } finally {
      sending.current = false;
    }
  }, [waitingFor, state, token, play, afterTurn]);

  // ---- elegir objetivo (clic en la escena o en las listas) ----
  const startTargeting = useCallback((p) => {
    const aliveEnemies = enemies.filter((e) => e.hp > 0);
    if (p.side === 'ENEMY' && aliveEnemies.length === 1) {
      act({ ...p.payload, targetParticipantId: aliveEnemies[0].id });
      return;
    }
    setPending(p);
    setMenu(null);
    setPhase('target');
    bus.emit('battle-targeting', p.side);
  }, [enemies, act]);

  const chooseTarget = useCallback((pid) => {
    if (!pending) return;
    act({ ...pending.payload, targetParticipantId: pid });
  }, [pending, act]);

  useEffect(() => {
    const onTarget = (pid) => chooseTarget(pid);
    const onHover = (pid) => setHover(pid);
    bus.on('battle-target', onTarget);
    bus.on('battle-hover', onHover);
    return () => { bus.off('battle-target', onTarget); bus.off('battle-hover', onHover); };
  }, [chooseTarget]);

  const cancelTargeting = useCallback(() => {
    setPending(null);
    setPhase('command');
    bus.emit('battle-targeting', null);
  }, []);

  // ---- menús ----
  const openSkills = async () => {
    setMenu((m) => (m === 'skills' ? null : 'skills'));
    const key = actor.npc_id ? `npc_${actor.npc_id}` : 'heroe';
    if (skills[key]) return;
    try {
      const list = actor.npc_id
        ? (await api.getNpcSkills(player.id, actor.npc_id, token)).map((s) => ({ ...s, supported: s.supportedInCombat }))
        : await api.getPlayerSkills(player.id, token);
      setSkills((s) => ({ ...s, [key]: list }));
    } catch {
      setSkills((s) => ({ ...s, [key]: [] }));
    }
  };

  const openItems = async () => {
    setMenu((m) => (m === 'items' ? null : 'items'));
    try {
      const inv = await api.getPlayerInventory(player.id, token);
      // la Vela de Sebo no sirve en combate: solo enciende la llama en el mapa (game/world/llama.js)
      setItems(inv.filter((i) => i.item_type === 'CONSUMABLE' && i.quantity > 0 && i.code !== 'VELA_SEBO'));
    } catch {
      setItems([]);
    }
  };

  const pickSkill = (s) => {
    // datos para que la escena elija la animación de la habilidad (tajo, disparo, hechizo…)
    const fx = { code: s.code ?? null, skillType: s.skillType, targetType: s.targetType, damageSchool: s.damageSchool ?? null, hits: s.hits };
    const payload = { action: 'SKILL', skillId: s.id, element: s.elementCode ?? null, skill: fx };
    if (s.targetType === 'ENEMY') startTargeting({ side: 'ENEMY', payload });
    else if (s.targetType === 'ALLY') startTargeting({ side: 'PLAYER', payload });
    else act(payload);
  };

  const pickItem = (it) => startTargeting({ side: 'PLAYER', payload: { action: 'USE_ITEM', itemId: it.item_id } });

  // ---- teclado: atajos del menú y Esc para cancelar ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (phase === 'target' && e.key === 'Escape') { cancelTargeting(); return; }
      if (spectating) {
        if (e.key === 'Escape' || (phase === 'end' && (e.key === 'Enter' || e.key === ' '))) { e.preventDefault(); stopWatching(); }
        return;
      }
      if (phase === 'end' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onFinish({ status: result?.status, rewards: result?.rewards }); return; }
      if (phase !== 'command') return;
      if (e.key === 'Escape') setMenu(null);
      else if (e.key === '1') startTargeting({ side: 'ENEMY', payload: { action: 'ATTACK' } });
      else if (e.key === '2') openSkills();
      else if (e.key === '3') openItems();
      else if (e.key === '4') act({ action: 'DEFEND' });
      else if (e.key === '5') act({ action: 'ESCAPE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const skillList = actor ? skills[actor.npc_id ? `npc_${actor.npc_id}` : 'heroe'] : null;

  return (
    <div className="bt-root">
      {/* línea del último suceso (arriba) */}
      {state && phase !== 'loading' && (
        <div className="bt-banner">
          <span className="bt-round">Ronda {state.session?.current_round ?? state.round}</span>
          <span className="bt-line">{phase === 'target' ? 'Elige un objetivo · Esc para cancelar' : (liveLine ?? lastLine ?? '¡Comienza el combate!')}</span>
        </div>
      )}

      {/* orden de turnos (arriba a la izquierda) */}
      {state && phase !== 'loading' && phase !== 'end' && (
        <TurnOrder
          participants={participants}
          nextActorId={phase === 'busy' ? null : state.nextActorId}
          round={state.session?.current_round ?? state.round ?? 1}
        />
      )}

      {/* cartel de entrada del jefe */}
      {/* refuerzos: cartel rojo de evento mientras el compañero entra caminando */}
      {reinforce && (
        <div className="bt-reinforce" key={reinforce.key}>
          <small>¡Evento!</small>
          <strong>¡Tus refuerzos están llegando!</strong>
          <span>{reinforce.names.join(' y ')} se une a la batalla</span>
        </div>
      )}

      {/* aviso de nivel: enemigos que te superan por varios niveles */}
      {levelWarn && (
        <div className="bt-reinforce bt-levelwarn" key={levelWarn.key}>
          <small>¡Cuidado!</small>
          <strong>{levelWarn.count > 1 ? 'Enemigos de nivel superior' : 'Enemigo de nivel superior'}</strong>
          <span>Te supera{levelWarn.count > 1 ? 'n' : ''} por {levelWarn.gap} niveles: harás menos daño y recibirás más</span>
        </div>
      )}

      {bossIntro && (
        <div className={`bt-boss-intro bt-boss-intro--${bossIntro.rank}`}>
          <small>{bossIntro.rank === 'mitico' ? 'Jefe mítico' : bossIntro.rank === 'jefe' ? 'Jefe de zona' : 'Minijefe'}</small>
          <strong>{bossIntro.name}</strong>
        </div>
      )}

      {/* barra de vida grande del jefe (arriba al centro, debajo de la línea de sucesos) */}
      {bosses.map((b) => {
        const p = participants.find((x) => x.id === b.pid);
        if (!p) return null;
        const shared = b.rank === 'mitico' ? mythicRef.current : null;
        const maxHp = shared?.maxHp ?? p.max_hp;
        const pctHp = Math.max(0, Math.min(100, (p.hp / maxHp) * 100));
        return (
          <div key={b.pid} className={`bt-bossbar bt-bossbar--${b.rank}${(p.effects ?? []).some((x) => x.code === 'FURY') ? ' bt-bossbar--fury' : ''}`}>
            <span className="bt-bossbar-name">
              {p.element_code && <ElementIcon code={p.element_code} />}
              {b.name}
              {p.shield && <span className={`bt-shield${p.shield.broken ? ' bt-shield--broken' : ''}`}><GameIcon name={p.shield.broken ? 'cracked-shield' : 'checked-shield'} artist="lorc" /><b>{p.shield.broken ? 'ROTO' : p.shield.current}</b></span>}
              <small>{shared ? 'Vida compartida · ' : ''}{p.hp} / {maxHp}</small>
            </span>
            <div className="bt-bossbar-track"><div className="bt-bossbar-fill" style={{ width: `${pctHp}%` }} /></div>
          </div>
        );
      })}

      {/* enemigos (arriba a la derecha) */}
      {enemies.length > 0 && (
        <div className="bt-enemies">
          {enemies.map((e) => {
            const { weak, strong } = splitResistances(e.resistances);
            const pendingElement = phase === 'target' ? pending?.payload?.element : null;
            const effect = pendingElement ? (e.resistances?.[pendingElement] ?? 0) : 0;
            return (
              <button
                key={e.id}
                type="button"
                className={`bt-enemy${e.hp <= 0 ? ' bt-enemy--dead' : ''}${hover === e.id ? ' bt-enemy--hover' : ''}${effect < 0 ? ' bt-enemy--weak' : ''}`}
                disabled={phase !== 'target' || pending?.side !== 'ENEMY' || e.hp <= 0}
                onMouseEnter={() => bus.emit('battle-highlight', e.id)}
                onMouseLeave={() => bus.emit('battle-highlight', null)}
                onClick={() => chooseTarget(e.id)}
              >
                <span className="bt-enemy-name">
                  {e.shield && (
                    <span className={`bt-shield${e.shield.broken ? ' bt-shield--broken' : ''}`} title={e.shield.broken ? 'Roto: pierde turnos y recibe +50% de daño' : `Escudo: ${e.shield.current}/${e.shield.max} (las debilidades lo rompen más rápido)`}>
                      <GameIcon name={e.shield.broken ? 'cracked-shield' : 'checked-shield'} artist="lorc" />
                      <b>{e.shield.broken ? 'ROTO' : e.shield.current}</b>
                    </span>
                  )}
                  {e.element_code && <ElementIcon code={e.element_code} title={`Elemento: ${ELEMENTS[e.element_code]?.name}`} />}
                  {e.name}
                  {effect < 0 && <em className="bt-tag bt-tag--weak">¡Débil!</em>}
                  {effect > 0 && <em className="bt-tag bt-tag--resist">Resiste</em>}
                </span>
                <Bar value={e.hp} max={e.max_hp} kind="hp" />
                <StatusRow p={e} />
                {(weak.length > 0 || strong.length > 0 || e.affinity_hidden > 0) && (
                  <span className="bt-affinities">
                    {weak.length > 0 && <small>Débil</small>}
                    {weak.map((w) => <ElementIcon key={w.code} code={w.code} title={`Débil a ${ELEMENTS[w.code].name} (${w.value}%)`} />)}
                    {strong.length > 0 && <small>Resiste</small>}
                    {strong.map((s) => <ElementIcon key={s.code} code={s.code} dim title={`Resiste ${ELEMENTS[s.code].name} (+${s.value}%)`} />)}
                    {/* las que todavía no descubriste: golpéalo con elementos (o completa su Bestiario) */}
                    {Array.from({ length: e.affinity_hidden ?? 0 }, (_, i) => (
                      <i key={`q${i}`} className="bt-affinity-unknown" title="Afinidad sin descubrir: golpéalo con distintos elementos">?</i>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* grupo (abajo a la derecha) */}
      {heroes.length > 0 && (
        <div className="bt-party">
          {heroes.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`bt-hero${actor?.id === h.id && phase === 'command' ? ' bt-hero--active' : ''}${h.hp <= 0 ? ' bt-hero--dead' : ''}`}
              disabled={phase !== 'target' || pending?.side !== 'PLAYER'}
              onClick={() => chooseTarget(h.id)}
            >
              <Face p={h} />
              <span className="bt-hero-name">{h.name}<small>{h.class_name ?? 'Aliado'}</small><StatusRow p={h} /></span>
              <span className="bt-hero-nums">{h.hp}<small>/{h.max_hp}</small></span>
              <Bar value={h.hp} max={h.max_hp} kind="hp" />
              <span className="bt-hero-nums bt-hero-nums--mp">{h.mana ?? 0}<small>/{h.max_mana ?? 0}</small></span>
              <Bar value={h.mana ?? 0} max={h.max_mana ?? 0} kind="mp" />
            </button>
          ))}
        </div>
      )}

      {/* combate en grupo: caíste pero tu grupo sigue */}
      {iFell && (
        <div className={`bt-commands bt-waiting bt-fallen${watching ? ' bt-fallen--small' : ''}`}>
          <div className="bt-commands-head">{watching ? 'Mirando…' : 'Caíste'}</div>
          {!watching && <p>Tu grupo sigue peleando. Puedes mirar cómo termina o volver a tu refugio.</p>}
          {!watching && <button type="button" className="bt-cmd" onClick={() => setWatching(true)}><GameIcon name="eye-target" artist="delapouite" /> Seguir mirando</button>}
          <button
            type="button"
            className="bt-cmd"
            onClick={async () => {
              try {
                await api.leaveFallenCombat(state.session.id, token);
                onFinish({ status: 'ENEMY_WON' });
              } catch (err) { setMessage(err.message); }
            }}
          >
            <GameIcon name="campfire" artist="lorc" /> Volver a mi refugio
          </button>
        </div>
      )}

      {/* modo espectador: miras el combate de otro jugador */}
      {spectating && phase !== 'end' && phase !== 'error' && (
        <div className="bt-commands bt-waiting">
          <div className="bt-commands-head"><GameIcon name="eye-target" artist="delapouite" /> Observando</div>
          <p>Miras el combate de {encounter.name ?? 'otro aventurero'}.{turnActor ? ` Turno de ${turnActor.name}.` : ''}</p>
          <button type="button" className="bt-cmd" onClick={stopWatching}><GameIcon name="exit-door" artist="delapouite" /> Dejar de mirar <kbd>Esc</kbd></button>
        </div>
      )}

      {/* combate en grupo: turno de un compañero */}
      {waitingFor && !iFell && (
        <div className="bt-commands bt-waiting">
          <div className="bt-commands-head">Turno de {waitingFor.name}</div>
          <p>{waitingFor.player_id != null ? 'Tu compañero está eligiendo qué hacer…' : `Juega ${ownerOf(waitingFor)?.name ?? 'tu compañero'}…`}</p>
          {idleLeft > 0
            ? <small>Si no responde, en {Math.ceil(idleLeft / 1000)} s podrás saltar su turno.</small>
            : <button type="button" className="bt-cmd" onClick={skipIdle}><GameIcon name="hourglass" artist="lorc" /> Saltar su turno (se defiende)</button>}
        </div>
      )}

      {/* menú de comandos (abajo a la izquierda) */}
      {phase === 'command' && actor && (
        <div className="bt-commands">
          <div className="bt-commands-head">{actor.name}</div>
          <button type="button" className="bt-cmd" onClick={() => startTargeting({ side: 'ENEMY', payload: { action: 'ATTACK' } })}>
            <GameIcon name="crossed-swords" artist="lorc" /> Atacar <kbd>1</kbd>
          </button>
          <button type="button" className={`bt-cmd${menu === 'skills' ? ' bt-cmd--open' : ''}`} onClick={openSkills}>
            <GameIcon name="spell-book" artist="delapouite" /> Habilidades <kbd>2</kbd>
          </button>
          <button type="button" className={`bt-cmd${menu === 'items' ? ' bt-cmd--open' : ''}`} onClick={openItems}>
            <GameIcon name="standing-potion" artist="lorc" /> Objetos <kbd>3</kbd>
          </button>
          <button type="button" className="bt-cmd" onClick={() => act({ action: 'DEFEND' })}>
            <GameIcon name="checked-shield" artist="lorc" /> Defender <kbd>4</kbd>
          </button>
          <button type="button" className="bt-cmd" onClick={() => act({ action: 'ESCAPE' })}>
            <GameIcon name="dodging" artist="lorc" /> Huir <kbd>5</kbd>
          </button>

          {menu === 'skills' && (
            <div className="bt-submenu">
              {!skillList && <p className="bt-empty">Cargando…</p>}
              {skillList?.length === 0 && <p className="bt-empty">Sin habilidades</p>}
              {skillList?.map((s) => {
                const noMana = (s.manaCost ?? 0) > (actor.mana ?? 0);
                // rondas que faltan para poder usarla otra vez (tiempo de espera)
                const waitRounds = actor.cooldowns?.[s.id] ?? 0;
                const reload = s.cooldownRounds ? `
Se puede usar cada ${s.cooldownRounds} rondas.` : '';
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="bt-sub"
                    disabled={!s.supported || noMana || waitRounds > 0}
                    title={s.supported ? `${s.description ?? ''}${reload}` : s.unsupportedReason}
                    onClick={() => pickSkill(s)}
                  >
                    <span className="bt-sub-name">
                      {s.elementCode && <ElementIcon code={s.elementCode} />}
                      {s.name}
                      {s.elementCode && enemies.some((e) => e.hp > 0 && (e.resistances?.[s.elementCode] ?? 0) < 0) && (
                        <em className="bt-tag bt-tag--weak" title="Algún enemigo es débil a este elemento">▲</em>
                      )}
                    </span>
                    {waitRounds > 0
                      ? <small className="bt-nomana" title="Rondas para poder usarla otra vez">⌛ {waitRounds}</small>
                      : <small className={noMana ? 'bt-nomana' : ''}>{s.manaCost} MP</small>}
                  </button>
                );
              })}
            </div>
          )}
          {menu === 'items' && (
            <div className="bt-submenu">
              {items === null && <p className="bt-empty">Cargando…</p>}
              {items?.length === 0 && <p className="bt-empty">Sin consumibles</p>}
              {items?.map((it) => (
                <button key={it.inventory_id} type="button" className="bt-sub" onClick={() => pickItem(it)}>
                  <span className="bt-sub-name"><ItemIcon icon={iconForItem({ ...it, item_type: 'CONSUMABLE' })} />{it.name}</span>
                  <small>x{it.quantity}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'target' && (
        <button type="button" className="bt-cancel" onClick={cancelTargeting}>Cancelar (Esc)</button>
      )}

      {message && phase !== 'error' && (
        <button type="button" className="bt-toast" onClick={() => setMessage(null)}>{message}</button>
      )}

      {phase === 'error' && (
        <div className="bt-result">
          <div className="bt-result-box">
            <h2>{spectating ? 'No se puede mirar ese combate' : 'No se pudo iniciar el combate'}</h2>
            <p>{message}</p>
            <button type="button" className="bt-continue" onClick={() => onFinish({ status: 'ERROR' })}>Volver al mapa</button>
          </div>
        </div>
      )}

      {phase === 'end' && result && spectating && (
        <div className={`bt-result bt-result--${result.status}`}>
          <div className="bt-result-box">
            <h2>Terminó el combate</h2>
            <p>
              {result.status === 'PLAYER_WON' && `¡${encounter.name ?? 'El aventurero'} ganó la pelea!`}
              {result.status === 'ENEMY_WON' && `${encounter.name ?? 'El aventurero'} cayó en la pelea.`}
              {result.status === 'ESCAPED' && `${encounter.name ?? 'El aventurero'} escapó del combate.`}
              {!['PLAYER_WON', 'ENEMY_WON', 'ESCAPED'].includes(result.status) && 'El combate se cerró.'}
            </p>
            <p><small>Vuelves al mundo…</small></p>
            <button type="button" className="bt-continue" onClick={stopWatching}>Volver ya <kbd>Enter</kbd></button>
          </div>
        </div>
      )}

      {phase === 'end' && result && !spectating && (
        <div className={`bt-result bt-result--${result.status}`}>
          <div className="bt-result-box">
            <h2>
              {result.status === 'PLAYER_WON' && '¡Victoria!'}
              {result.status === 'ENEMY_WON' && 'Derrota'}
              {result.status === 'ESCAPED' && 'Escapaste'}
            </h2>
            {result.status === 'PLAYER_WON' && result.rewards && (
              <div className="bt-rewards">
                {!result.rewards.mythic && <span><GameIcon name="sparkles" artist="delapouite" /> +{Number(result.rewards.xp ?? 0).toLocaleString()} XP</span>}
                {!result.rewards.mythic && <span className="bt-gold"><GameIcon name="two-coins" artist="delapouite" /> +{Number(result.rewards.gold ?? 0).toLocaleString()} oro</span>}
                {result.rewards.itemsDropped?.map((d) => (
                  <span key={`${d.itemName}-${d.quantity}`} className="bt-drop"><GameIcon name="swap-bag" artist="lorc" /> {d.itemName} x{d.quantity}</span>
                ))}
                {/* pieza de set de un monstruo raro: la tuya (cada héroe tira por su cuenta, de su clase) */}
                {result.rewards.setPieces?.filter((p) => p.playerId === player.id).map((p) => (
                  <span key={`pieza-${p.itemId}`} className="bt-levelup"><GameIcon name="crossed-swords" artist="lorc" /> ¡Pieza de equipo! {p.name}</span>
                ))}
                {result.rewards.levelUps?.map((l) => (
                  <span key={`${l.playerId ?? l.npcId}`} className="bt-levelup">¡{l.npcName ?? player.nickname} sube a nivel {l.newLevel}!</span>
                ))}
                {result.rewards.levelUps?.filter((l) => l.playerId === player.id && l.teachable?.length).map((l) => (
                  <span key={`tecnica-${l.newLevel}`} className="bt-levelup">Tu maestro ya puede enseñarte: {l.teachable.join(', ')}.</span>
                ))}
                {result.rewards.cardsDropped?.map((c) => (
                  <span key={`carta-${c.monsterId}`} className={`bt-card bt-card--${c.rarity.toLowerCase()}`}>
                    <CardIcon rarity={c.rarity} /> ¡Carta de {c.name}! <small>{c.text}</small>
                  </span>
                ))}
                {result.rewards.bestiary?.map((b) => (
                  <span key={`best-${b.monsterId}-${b.stage}`} className="bt-bestiary">
                    <GameIcon name="book-aura" artist="lorc" /> Bestiario · {b.name}: {BESTIARY_STAGE[b.stage]}{b.points ? ` (+${b.points} puntos)` : ''}
                  </span>
                ))}
                {result.rewards.mythic?.killed && <span className="bt-levelup">¡Derribaste al jefe mítico! El botín se reparte entre todos los cazadores.</span>}
                {result.rewards.dungeonRepeat && (
                  <span className="bt-bestiary">
                    <GameIcon name="sands-of-time" artist="lorc" /> Ya venciste al jefe de esta mazmorra hoy: esta pasada da la mitad de experiencia y oro. El botín y el cofre salen igual.
                  </span>
                )}
                {result.rewards.crypt?.guardian && (
                  <span className="bt-bestiary">
                    <GameIcon name="dungeon-gate" artist="delapouite" /> Cayó un {result.rewards.crypt.guardianWord ?? 'guardián de la cripta'} ({result.rewards.crypt.guardians.length}/{result.rewards.crypt.totalGuardians})
                    {result.rewards.crypt.doorOpen ? `: ¡${result.rewards.crypt.doorName ?? 'la Puerta del Vigía'} se abre!` : ''}
                  </span>
                )}
                {result.rewards.crypt?.boss && (
                  <span className="bt-levelup">
                    <GameIcon name={result.rewards.crypt.bossIcon ?? 'lighthouse'} artist="delapouite" /> {result.rewards.crypt.bossDownText ?? '¡El Vigía Caído se apaga!'}
                    {result.rewards.crypt.chest
                      ? ` ${result.rewards.crypt.chestName ?? 'Cofre del Vigía'}: +${Number(result.rewards.crypt.chest.gold).toLocaleString()} oro${result.rewards.crypt.chest.item ? ` y ${result.rewards.crypt.chest.item.name} x${result.rewards.crypt.chest.item.quantity}` : ''}.`
                      : ' Su cofre ya lo abriste hoy: vuelve mañana por otro.'}
                  </span>
                )}
              </div>
            )}
            {mythicRef.current && result.status !== 'PLAYER_WON' && (() => {
              const boss = enemies.find((e) => e.monster_code?.startsWith('MITICO_'));
              const dealt = boss ? Math.max(0, mythicRef.current.startHp - boss.hp) : 0;
              return <p className="bt-mythic-note">Le quitaste <b>{dealt.toLocaleString()}</b> de vida a {mythicRef.current.name}. Tu aporte cuenta para el botín cuando caiga.</p>;
            })()}
            {result.status === 'ENEMY_WON' && !mythicRef.current && (encounter.kind === 'cripta'
              ? <p>Tu grupo cayó. Despertarás junto al último brasero que encendiste con la mitad de la vida, y perderás un poco de oro. Los guardianes que venciste siguen vencidos.</p>
              : <p>Tu grupo cayó. Despertarás en tu último refugio (el Pilar o una fogata) con la mitad de la vida, y perderás un poco de oro.</p>)}
            <button type="button" className="bt-continue" onClick={() => onFinish({ status: result.status, rewards: result.rewards })}>Continuar <kbd>Enter</kbd></button>
          </div>
        </div>
      )}
    </div>
  );
}
