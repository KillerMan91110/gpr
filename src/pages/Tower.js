import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  CombatantCard, TurnOrderBar, useCombatFloaters, classifyLogEntry,
  SCHOOL_ICONS, SCHOOL_LABELS, TARGET_ICONS, TARGET_LABELS, SKILL_TYPE_ICONS, describeSkillEffect,
} from './ExploreZone';
import { setActiveCombat, clearActiveCombat } from '../utils/activeCombat';
import { setAbyssCheckpoint } from '../utils/abyssCheckpoint';
import GameIcon from '../components/GameIcon';

const MIN_LEVEL = 30;
const LOG_REVEAL_DELAY_MS = 650;
const WIPED_EXIT_DELAY_MS = 3000;
const DIFFICULTIES = [
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Difícil' },
  { value: 3, label: 'Muy Difícil' },
];
const EVENT_TYPE_ICONS = {
  TRAP: '🪤',
  VENDOR: { name: 'shopping-cart', artist: 'delapouite' },
  SANCTUARY: { name: 'sparkles', artist: 'delapouite' },
  SECRET: { name: 'magnifying-glass', artist: 'lorc' },
  STORY: { name: 'scroll-unfurled', artist: 'lorc' },
};
const RARITY_CLASS = {
  COMUN: 'rarity-comun', POCO_COMUN: 'rarity-poco_comun',
  RARO: 'rarity-raro', EPICO: 'rarity-epico', LEGENDARIO: 'rarity-legendario',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function actorBelongsToPlayer(actor, playerId) {
  if (!actor) return false;
  if (actor.player_id != null) return actor.player_id === playerId;
  if (actor.owner_player_id != null) return actor.owner_player_id === playerId;
  return true;
}

export default function Tower() {
  const { player, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [playerLevel, setPlayerLevel] = useState(null);
  const [playerHp, setPlayerHp] = useState(null);
  const [party, setParty] = useState(null);
  const [coopParty, setCoopParty] = useState(null);
  const [difficulty, setDifficulty] = useState(1);
  const [run, setRun] = useState(undefined); // undefined = todavía no cargó, null = sin corrida
  const [floor, setFloor] = useState(null);
  const [session, setSession] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [itemEffects, setItemEffects] = useState({});
  const [skills, setSkills] = useState(null);
  const [npcSkillsCache, setNpcSkillsCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [floorMsg, setFloorMsg] = useState('');
  const [readyStatus, setReadyStatus] = useState(null);
  const [waitingReady, setWaitingReady] = useState(false);
  const [wipedExitIn, setWipedExitIn] = useState(null);
  const [canControl, setCanControl] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [vendorOffer, setVendorOffer] = useState(null);
  const [dungeonCoins, setDungeonCoins] = useState(0);
  const [checkpoint, setCheckpoint] = useState(null);

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // El resultado de un evento/extracción se muestra como popup flotante (mismo patrón que el
  // aviso de "saliste del grupo" de CoopBar) en vez de una línea de texto discreta — para que no
  // pase desapercibido, se auto-cierra solo a los 8s.
  const floorMsgTimer = useRef(null);
  useEffect(() => () => clearTimeout(floorMsgTimer.current), []);
  function showFloorMsg(msg) {
    clearTimeout(floorMsgTimer.current);
    setFloorMsg(msg);
    if (msg) floorMsgTimer.current = setTimeout(() => setFloorMsg(''), 8000);
  }
  function clearFloorMsg() {
    clearTimeout(floorMsgTimer.current);
    setFloorMsg('');
  }

  useEffect(() => {
    if (!player) return;
    api.getPlayerStats(player.id, token).then((s) => { setPlayerLevel(s.level); setPlayerHp({ hp: s.hp, maxHp: s.maxHp }); }).catch(() => setPlayerLevel(null));
    api.getCoopParty(player.id, token).then(setCoopParty).catch(() => setCoopParty(null));
    api.getParty(player.id, token).then(setParty).catch(() => setParty(null));
  }, [player, token]);

  const npcLevelMap = Object.fromEntries(
    (party?.members || []).filter((m) => !m.isHero && m.npcId).map((m) => [m.npcId, m.level])
  );

  // coopParty.members ya trae el nivel de cada compañero (ver GET /coop/party), así que
  // cualquier integrante puede calcular esto mismo por su cuenta sin pedirle nada al back —
  // todos ven exactamente el mismo resultado, no solo quien intenta confirmar último.
  const belowLevelMembers = [
    ...(playerLevel != null && playerLevel < MIN_LEVEL ? [{ nickname: player?.nickname, level: playerLevel }] : []),
    ...(coopParty?.members || []).filter((m) => m.level < MIN_LEVEL),
  ];

  // Solo un recordatorio visual, no bloquea la entrada — el Abismo no cura entre pisos, así
  // que arrancar golpeado es tirar la corrida, pero es decisión del jugador si igual entra.
  const notFullHpMembers = [
    ...(playerHp && playerHp.hp < playerHp.maxHp ? [player?.nickname] : []),
    ...(coopParty?.members || []).filter((m) => m.hp < m.max_hp).map((m) => m.nickname),
  ];

  async function refreshRun() {
    const data = await api.getTowerRun(player.id, token);
    setRun(data.run);
    setFloor(data.floor || null);
    setSession(data.session || null);
    setCanControl(!!data.canControl);
    setPendingEvent(data.pendingEvent || null);
    setCheckpoint(data.checkpoint || null);
    setAbyssCheckpoint(data.checkpoint || null);
    return data;
  }

  function refreshParty() {
    return api.getParty(player.id, token).then(setParty).catch(() => {});
  }

  // Piso completado, esperando la decisión de Seguir/Extraer: sondeo para enterarme apenas
  // quien tiene el control (líder, o alguien vivo si el líder murió) decide algo.
  useEffect(() => {
    if (run?.status !== 'IN_PROGRESS' || session) return undefined;
    const iv = setInterval(() => { refreshRun().catch(() => {}); }, 2500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status, session]);

  // Al perder la corrida, un cartel breve con el resumen y a los 3s vuelve solo a la
  // entrada (mismo patrón que el auto-restart de ExploreZone al terminar un combate).
  useEffect(() => {
    if (run?.status !== 'WIPED') {
      setWipedExitIn(null);
      return undefined;
    }
    setWipedExitIn(Math.ceil(WIPED_EXIT_DELAY_MS / 1000));
    const countdown = setInterval(() => {
      setWipedExitIn((s) => (s != null ? s - 1 : s));
    }, 1000);
    const timeout = setTimeout(() => {
      setRun(null);
      setSession(null);
      setFloor(null);
      setCheckpoint(null);
      setAbyssCheckpoint(null);
    }, WIPED_EXIT_DELAY_MS);
    return () => {
      clearInterval(countdown);
      clearTimeout(timeout);
    };
  }, [run?.status]);

  useEffect(() => {
    if (!player) return;
    refreshRun().catch(() => setRun(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, token]);

  // Al llegar desde el ✓ del cartel global de CoopBar (ya confirmaste "listo" ahí mismo, sin
  // pasar por esta página), arranca directo sin mostrar de nuevo el ready-check acá.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!location.state?.autoStart || run || autoStartedRef.current) return;
    autoStartedRef.current = true;
    navigate(location.pathname, { replace: true, state: {} });
    handleStart(location.state.coopPartnerIds || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, run]);

  // Ready-check co-op: tabla propia player_tower_ready (no la compartida player_coop_ready
  // que usa ExploreZone/CoopBar), para no chocar con el foreign key a zonas reales ni con
  // el cartel global de CoopBar que navegaría a /combat/:zoneId. Mientras estoy en grupo y
  // sin corrida, sondeo quién ya confirmó "listo para El Abismo".
  useEffect(() => {
    if (!coopParty || run) {
      setReadyStatus(null);
      return undefined;
    }
    let cancelled = false;
    async function poll() {
      try {
        const status = await api.getTowerReadyStatus(player.id, token);
        if (!cancelled) setReadyStatus(status);
      } catch {
        // silencioso: es solo polling en background
      }
    }
    poll();
    const iv = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [coopParty, run, player, token]);

  // Mientras espero a que el resto confirme, el que complete el ready-check es quien llama a
  // /tower/start (ver handleReadyClick) — el resto se entera sondeando la corrida en sí.
  useEffect(() => {
    if (!coopParty || run) return undefined;
    let cancelled = false;
    const iv = setInterval(() => {
      refreshRun().then((data) => {
        if (!cancelled && data.run) setWaitingReady(false);
      }).catch(() => {});
    }, 2500);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coopParty, run, player, token]);

  async function handleReadyClick() {
    setError('');
    try {
      const res = await api.setTowerReady(player.id, token);
      if (res.allReady) {
        setWaitingReady(false);
        await handleStart(res.coopPartnerIds || []);
      } else {
        setWaitingReady(true);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelReady() {
    setError('');
    setWaitingReady(false);
    try {
      await api.cancelTowerReady(player.id, token);
    } catch (err) {
      setError(err.message);
    }
  }

  const inCombat = !!session && session.session.status === 'IN_PROGRESS';

  // Igual que ExploreZone: mientras hay combate en curso, ProtectedRoute usa esto para
  // impedir navegar a cualquier otra pantalla (recarga/cierre de pestaña avisa aparte).
  useEffect(() => {
    if (inCombat) {
      setActiveCombat('/abismo', session, null);
    } else {
      clearActiveCombat();
    }
  }, [inCombat, session]);

  useEffect(() => {
    if (!inCombat) return undefined;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inCombat]);

  // Polling co-op: igual que en ExploreZone, para enterarse del turno/fin de sala
  // cuando la mueve un compañero en vez de uno mismo.
  const revealingRef = useRef(false);
  const isCoopSession = new Set(
    (session?.participants || []).filter((p) => p.player_id != null).map((p) => p.player_id)
  ).size > 1;
  useEffect(() => {
    if (!inCombat || !isCoopSession) return undefined;
    let cancelled = false;
    async function poll() {
      if (revealingRef.current) return;
      try {
        const state = await api.getCombatSession(sessionRef.current.session.id, token);
        if (cancelled) return;
        revealingRef.current = true;
        await revealSession(state);
      } catch {
        // silencioso, reintenta la próxima vuelta
      } finally {
        revealingRef.current = false;
      }
    }
    const iv = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCombat, isCoopSession, token]);

  // Reproduce el log nuevo de a una línea (mismo mecanismo que ExploreZone); al final, si la
  // sala terminó, refresca la corrida entera para ver si el server ya armó la sala siguiente,
  // dejó el piso a la espera de Seguir/Extraer, o la corrida quedó perdida.
  async function revealSession(newState) {
    const oldLog = sessionRef.current?.log ?? [];
    const oldStatus = sessionRef.current?.session ?? newState.session;
    const newEntries = newState.log.slice(oldLog.length);

    if (newEntries.length === 0) {
      setSession(newState);
    } else {
      let liveParticipants = sessionRef.current?.participants ?? newState.participants;
      for (let i = 0; i < newEntries.length; i += 1) {
        await sleep(LOG_REVEAL_DELAY_MS);
        const entry = newEntries[i];
        liveParticipants = liveParticipants.map((p) => {
          let next = p;
          if (entry.target_participant_id === p.id && entry.hp_after != null) next = { ...next, hp: entry.hp_after };
          if (entry.actor_participant_id === p.id && entry.mana_after != null) next = { ...next, mana: entry.mana_after };
          return next;
        });
        setSession({
          ...newState,
          session: oldStatus,
          log: [...oldLog, ...newEntries.slice(0, i + 1)],
          participants: liveParticipants,
          nextActorId: null,
        });
      }
      await sleep(250);
      setSession(newState);
    }

    if (newState.session.status !== 'IN_PROGRESS') {
      await sleep(400);
      try {
        const data = await refreshRun();
        if (data.run?.status === 'WIPED') {
          setFloorMsg('Tu grupo cayó. La corrida se perdió y no se banca ninguna moneda.');
        }
      } catch {
        // silencioso
      }
    }
  }

  async function loadInventory() {
    try {
      const items = await api.getPlayerInventory(player.id, token);
      const consumables = items.filter((i) => i.item_type === 'CONSUMABLE');
      setInventory(consumables);
      const missing = consumables.filter((i) => !(i.item_id in itemEffects));
      if (missing.length) {
        const fetched = await Promise.all(missing.map((i) => api.getItem(i.item_id, token).catch(() => null)));
        setItemEffects((prev) => {
          const next = { ...prev };
          missing.forEach((i, idx) => { next[i.item_id] = fetched[idx]?.statBonuses || []; });
          return next;
        });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadSkills() {
    try {
      const result = await api.getPlayerSkills(player.id, token);
      setSkills(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadNpcSkills(npcId) {
    if (npcSkillsCache[npcId]) return;
    try {
      const raw = await api.getNpcSkills(player.id, npcId, token);
      const normalized = raw.map((s) => ({ ...s, supported: s.supportedInCombat }));
      setNpcSkillsCache((prev) => ({ ...prev, [npcId]: normalized }));
    } catch {
      setNpcSkillsCache((prev) => ({ ...prev, [npcId]: [] }));
    }
  }

  async function handleAction(action, options = {}) {
    if (!session) return;
    const actor = session.participants.find((p) => p.id === session.nextActorId);
    if (!actor) return;
    setLoading(true);
    setError('');
    revealingRef.current = true;
    try {
      const state = await api.sendCombatAction(session.session.id, { participantId: actor.id, action, ...options }, token);
      await revealSession(state);
      if (action === 'USE_ITEM') await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      revealingRef.current = false;
    }
  }

  async function handleStart(coopPartnerIds = []) {
    setError('');
    setLoading(true);
    try {
      await api.startTower(player.id, difficulty, coopPartnerIds, token);
      clearFloorMsg();
      await refreshRun();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvance() {
    setError('');
    clearFloorMsg();
    setLoading(true);
    try {
      await api.advanceTower(player.id, token);
      await refreshRun();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEventChoice(choice) {
    setError('');
    setLoading(true);
    try {
      const result = await api.resolveTowerEvent(player.id, choice, token);
      if (result.vendorOffer) {
        // El vendedor no se resuelve solo: abre este pop-up de compra y el evento sigue
        // pendiente en el back hasta que compres algo o cierres con "Cerrar sin comprar".
        setVendorOffer(result.vendorOffer);
        setDungeonCoins(result.dungeon_coins);
        setRun(result.run);
      } else {
        showFloorMsg(result.message || '');
        setRun(result.run);
        setSession(result.session || null);
        setPendingEvent(result.pendingEvent || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVendorBuy(itemId) {
    setError('');
    setLoading(true);
    try {
      const result = await api.buyTowerEventItem(player.id, itemId, token);
      setVendorOffer(null);
      showFloorMsg(result.message || '');
      setRun(result.run);
      setSession(result.session || null);
      setPendingEvent(result.pendingEvent || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleVendorClose() {
    setVendorOffer(null);
    handleEventChoice('B');
  }

  async function handleExtract() {
    setError('');
    setLoading(true);
    try {
      const result = await api.extractTower(player.id, token);
      showFloorMsg(`Extraído en el piso ${result.floorReached} con ${result.coinsEarned} monedas de mazmorra.`);
      setRun(null);
      setSession(null);
      setFloor(null);
      setCheckpoint(null);
      setAbyssCheckpoint(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (run === undefined) {
    return <div className="dashboard"><p>Cargando el Abismo...</p></div>;
  }

  if (playerLevel != null && playerLevel < MIN_LEVEL && !run) {
    return (
      <div className="placeholder-page">
        <h1><GameIcon name="vortex" artist="lorc" /> El Abismo</h1>
        <p>Necesitas nivel {MIN_LEVEL} para entrar. Todavía estás en nivel {playerLevel}.</p>
        <Link to="/combat">Volver a zonas</Link>
      </div>
    );
  }

  // El back nunca incrementa current_room más allá de room_count (la sala completa el piso y
  // ahí queda, ver advanceTowerRoomOrFloor) — con la fórmula (current_room-1)/room_count sola,
  // la barra topeaba en (N-1)/N y jamás se veía llegar a 100% aunque el piso ya esté completo.
  // Forzamos 100% cuando no hay sesión ni evento pendiente: esa es exactamente la señal de
  // "piso completado" que ya usa el resto de la pantalla.
  const floorComplete = run?.status === 'IN_PROGRESS' && !session && !pendingEvent;
  const explorePercent = floor
    ? (floorComplete ? 100 : Math.round(((run.current_room - 1) / floor.room_count) * 100))
    : 0;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="vortex" artist="lorc" /> El Abismo</h1>
          {run && (
            <>
              <p className="dashboard-subtitle">
                Piso {run.current_floor}
                {floor?.is_boss_floor && (
                  <> · <GameIcon name="crown" artist="lorc" /> Piso del Jefe</>
                )}
              </p>
              {floor && !floor.is_boss_floor && (
                <div className="abyss-explore-row">
                  <div className="stat-bar-track abyss-explore-track">
                    <div className="stat-bar-fill abyss" style={{ width: `${explorePercent}%` }} />
                  </div>
                  <span className="hint">{explorePercent}% explorado</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="craft-row">
          {!run && (
            <Link className="rpg-button rpg-button--small" to="/abismo/vendor">
              <GameIcon name="two-coins" artist="delapouite" /> Vendedor
            </Link>
          )}
          {!inCombat && (
            <Link className="logout-btn" to="/combat">Volver</Link>
          )}
        </div>
      </header>

      {error && (
        <div className="modal-overlay" onClick={() => setError('')}>
          <div className="modal-panel rpg-panel" onClick={(e) => e.stopPropagation()}>
            <button className="craft-result-close" onClick={() => setError('')} aria-label="Cerrar">×</button>
            <h3>⚠️ No se pudo entrar</h3>
            <p>{error}</p>
            <button className="rpg-button" onClick={() => setError('')}>Cerrar</button>
          </div>
        </div>
      )}
      {floorMsg && run?.status !== 'WIPED' && (
        <div className="craft-result-popup rpg-panel abyss-event-panel">
          <button className="craft-result-close" onClick={clearFloorMsg} aria-label="Cerrar">✕</button>
          <h4 className="craft-result-title"><GameIcon name="vortex" artist="lorc" /> El Abismo</h4>
          <p className="hint">{floorMsg}</p>
        </div>
      )}

      {!run && (
      <div className="dashboard-columns">
        <div className="dashboard-main">
        <div className="rpg-panel explore-panel">
          <p>Descendé piso a piso enfrentando monstruos cada vez más fuertes. Cada piso completo te da una moneda de mazmorra, pero si tu grupo cae antes de extraer, pierdes todas las de esta corrida.</p>

          {notFullHpMembers.length > 0 && (
            <p className="hint">
              ⚠️ Recuerda que todos deben estar con la vida al máximo antes de entrar ({notFullHpMembers.join(', ')} no está{notFullHpMembers.length > 1 ? 'n' : ''} al máximo). El Abismo no cura entre pisos.
            </p>
          )}

          {(!coopParty || belowLevelMembers.length === 0) && (
            <>
              <div className="craft-row" style={{ justifyContent: 'center', margin: '12px 0' }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    className={`rpg-button rpg-button--small${difficulty === d.value ? ' quest-tab--active' : ''}`}
                    onClick={() => setDifficulty(d.value)}
                    disabled={loading || waitingReady}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {coopParty && <p className="hint">La dificultad la define quien confirme "Listo" al último.</p>}
            </>
          )}

          {!coopParty && (
            <button className="rpg-button" onClick={() => handleStart()} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar al Abismo'}
            </button>
          )}

          {coopParty && belowLevelMembers.length > 0 && (
            <div className="coop-ready-panel">
              <p className="auth-error">
                {belowLevelMembers.map((m) => m.nickname).join(', ')} no {belowLevelMembers.length > 1 ? 'tienen' : 'tiene'} el nivel {MIN_LEVEL} necesario — nadie del grupo puede entrar hasta que suba de nivel.
              </p>
            </div>
          )}

          {coopParty && belowLevelMembers.length === 0 && (() => {
            const groupNames = coopParty.members.filter((m) => m.id !== player.id).map((m) => m.nickname).join(', ');
            const readyHereIds = new Set(
              (readyStatus?.members || []).filter((m) => m.ready).map((m) => m.playerId)
            );
            const readyHereNames = coopParty.members.filter((m) => readyHereIds.has(m.id)).map((m) => m.nickname);
            return (
              <div className="coop-ready-panel">
                {readyHereNames.length > 0 && !waitingReady ? (
                  <>
                    <p>¿Listo para entrar? <strong>{readyHereNames.join(', ')}</strong> ya {readyHereNames.length > 1 ? 'están' : 'está'} esperando aquí.</p>
                    <div className="craft-row" style={{ justifyContent: 'center' }}>
                      <button className="rpg-button" onClick={handleReadyClick} disabled={loading}>
                        ✓ Listo para entrar
                      </button>
                      <button className="rpg-button rpg-button--small" onClick={() => setWaitingReady(false)}>✗</button>
                    </div>
                  </>
                ) : waitingReady ? (
                  <>
                    <p className="hint">Esperando al resto del grupo ({groupNames})...</p>
                    <button className="rpg-button rpg-button--small" onClick={handleCancelReady}>✗ Cancelar</button>
                  </>
                ) : (
                  <>
                    <p>Vas a entrar en grupo con <strong>{groupNames}</strong>. Confirma cuando estés listo.</p>
                    <button className="rpg-button" onClick={handleReadyClick} disabled={loading}>
                      Listo para entrar
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </div>
        </div>
      </div>
      )}

      {run && run.status === 'IN_PROGRESS' && !session && pendingEvent && !vendorOffer && (
        <div className="modal-overlay">
          <div className="modal-panel rpg-panel abyss-event-panel">
            <h2>
              {(() => {
                const eventIcon = EVENT_TYPE_ICONS[pendingEvent.event_type];
                if (!eventIcon) return '❔';
                return typeof eventIcon === 'string' ? eventIcon : <GameIcon {...eventIcon} />;
              })()} Algo llama tu atención...
            </h2>
            <p className="zone-description">{pendingEvent.prompt_text}</p>
            {canControl ? (
              <div className="craft-row" style={{ justifyContent: 'center' }}>
                <button className="rpg-button" onClick={() => handleEventChoice('A')} disabled={loading}>
                  {loading ? '...' : pendingEvent.choice_a_label}
                </button>
                <button className="rpg-button rpg-button--small" onClick={() => handleEventChoice('B')} disabled={loading}>
                  {loading ? '...' : pendingEvent.choice_b_label}
                </button>
              </div>
            ) : (
              <p className="hint">Esperando a que el líder de la corrida (o alguien vivo, si murió) decida qué hacer...</p>
            )}
          </div>
        </div>
      )}

      {vendorOffer && (
        <div className="modal-overlay">
          <div className="modal-panel rpg-panel abyss-event-panel">
            <h2><GameIcon name="shopping-cart" artist="delapouite" /> Vendedor ambulante del Abismo</h2>
            <p className="dashboard-subtitle">Monedas de mazmorra: {dungeonCoins.toLocaleString()}</p>
            {canControl ? (
              <>
                <div className="guild-members-list">
                  {vendorOffer.map((item) => (
                    <div key={item.itemId} className="guild-member-row">
                      <div className="guild-member-info">
                        <span className={`guild-member-name item-rarity-dot ${RARITY_CLASS[item.rarity] || ''}`}>
                          {item.name}
                        </span>
                        <span className="hint guild-member-sub">
                          {item.rarity} · {item.price.toLocaleString()} monedas de mazmorra
                        </span>
                        {item.description && <span className="hint guild-member-sub">{item.description}</span>}
                      </div>
                      <button
                        className="rpg-button rpg-button--small"
                        disabled={loading || dungeonCoins < item.price}
                        onClick={() => handleVendorBuy(item.itemId)}
                      >
                        {loading ? '...' : 'Comprar'}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="craft-row" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button className="rpg-button rpg-button--small" onClick={handleVendorClose} disabled={loading}>
                    Cerrar sin comprar
                  </button>
                </div>
              </>
            ) : (
              <p className="hint">Esperando a que el líder de la corrida (o alguien vivo, si murió) decida qué hacer...</p>
            )}
          </div>
        </div>
      )}

      {run && run.status === 'IN_PROGRESS' && !session && !pendingEvent && checkpoint && (
        <SettlementView
          player={player}
          token={token}
          checkpoint={checkpoint}
          party={party}
          onHealed={refreshParty}
          canControl={canControl}
          onAdvance={handleAdvance}
          onExtract={handleExtract}
          loading={loading}
        />
      )}

      {run && run.status === 'IN_PROGRESS' && !session && !pendingEvent && !checkpoint && (
        <div className="rpg-panel explore-panel">
          <h2>Piso {run.current_floor} completado</h2>
          <p>Monedas acumuladas en esta corrida: <strong>{run.coins_earned}</strong></p>
          {canControl ? (
            <>
              <p className="hint">Si sigues y tu grupo cae en el próximo piso, pierdes todas estas monedas. Si extraes ahora, las banca.</p>
              <div className="craft-row" style={{ justifyContent: 'center' }}>
                <button className="rpg-button" onClick={handleAdvance} disabled={loading}>
                  {loading ? '...' : `Seguir al piso ${run.current_floor + 1}`}
                </button>
                <button className="rpg-button rpg-button-danger" onClick={handleExtract} disabled={loading}>
                  {loading ? '...' : 'Extraer'}
                </button>
              </div>
            </>
          ) : (
            <p className="hint">Esperando a que el líder de la corrida (o alguien vivo, si murió) decida seguir o extraer...</p>
          )}
        </div>
      )}

      {run && run.status === 'WIPED' && (
        <div className="rpg-panel explore-panel">
          <h2>Corrida perdida</h2>
          <p>Tu grupo cayó en el piso {run.current_floor}. No se bancó ninguna moneda de esta corrida.</p>
          {wipedExitIn > 0 && <p className="hint">Volviendo a la entrada en {wipedExitIn}s...</p>}
        </div>
      )}

      {session && (
        <TowerCombatView
          session={session}
          player={player}
          npcLevelMap={npcLevelMap}
          runFloor={run?.current_floor}
          runRoom={run?.current_room}
          loading={loading}
          inventory={inventory}
          itemEffects={itemEffects}
          skills={skills}
          npcSkillsCache={npcSkillsCache}
          onLoadInventory={loadInventory}
          onLoadSkills={loadSkills}
          onLoadNpcSkills={loadNpcSkills}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

const SETTLEMENT_HEAL_COST = 10;

// Ciudad del Abismo: asentamiento cada 15 pisos (docs/backend-spec-ciudad-del-abismo.md). Vive
// en el mismo hueco que ya existia entre limpiar el ultimo piso y llamar a /advance — el back
// ya bancó las monedas solo con el GET /tower/run que trajo este `checkpoint`.
function SettlementView({ player, token, checkpoint, party, onHealed, canControl, onAdvance, onExtract, loading }) {
  const [shop, setShop] = useState(null);
  const [shopError, setShopError] = useState('');
  const [buyQty, setBuyQty] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [dungeonCoins, setDungeonCoins] = useState(null);

  useEffect(() => {
    api.getSettlementShop(player.id, token)
      .then((data) => { setShop(data); setDungeonCoins(data.dungeon_coins); })
      .catch((err) => setShopError(err.message));
  }, [player.id, token]);

  async function handleHeal(targetType, npcId) {
    setShopError('');
    setBusyKey(`heal-${npcId ?? 'HERO'}`);
    try {
      const result = await api.settlementHeal(player.id, targetType, npcId, token);
      setDungeonCoins(result.dungeon_coins);
      await onHealed();
    } catch (err) {
      setShopError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleBuy(itemId) {
    setShopError('');
    const qty = Number(buyQty[itemId] || 1);
    setBusyKey(`buy-${itemId}`);
    try {
      const result = await api.buySettlementShopItem(player.id, itemId, qty, token);
      setDungeonCoins(result.dungeon_coins);
    } catch (err) {
      setShopError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  const heroMember = party?.members?.find((m) => m.isHero);
  const npcMembers = party?.members?.filter((m) => !m.isHero) || [];
  const coins = dungeonCoins ?? 0;

  function healButton(targetType, npcId, member) {
    const key = `heal-${npcId ?? 'HERO'}`;
    const fullHealth = member.hp >= member.maxHp && member.mana >= member.maxMana;
    return (
      <button
        className="rpg-button rpg-button--small"
        disabled={busyKey === key || fullHealth || coins < SETTLEMENT_HEAL_COST}
        onClick={() => handleHeal(targetType, npcId)}
        title={fullHealth ? 'Ya está al máximo' : coins < SETTLEMENT_HEAL_COST ? 'No te alcanzan las monedas' : undefined}
      >
        {busyKey === key ? '...' : `Curar (${SETTLEMENT_HEAL_COST})`}
      </button>
    );
  }

  return (
    <div className="rpg-panel explore-panel abyss-settlement">
      <h2><GameIcon name="anvil" artist="lorc" /> {checkpoint.name}</h2>
      <p className="dashboard-subtitle">
        Monedas de mazmorra: <strong>{coins.toLocaleString()}</strong> — lo ganado hasta el piso {checkpoint.floor} ya está a salvo.
      </p>

      {shopError && <p className="auth-error">{shopError}</p>}

      <section style={{ marginTop: 16 }}>
        <h3 className="guild-members-title">Enfermera</h3>
        <div className="guild-members-list">
          {heroMember && (
            <div className="guild-member-row">
              <div className="guild-member-info">
                <span className="guild-member-name">{heroMember.name}</span>
                <span className="hint guild-member-sub">{heroMember.hp}/{heroMember.maxHp} HP · {heroMember.mana}/{heroMember.maxMana} MP</span>
              </div>
              {healButton('HERO', null, heroMember)}
            </div>
          )}
          {npcMembers.map((n) => (
            <div key={n.npcId} className="guild-member-row">
              <div className="guild-member-info">
                <span className="guild-member-name">{n.name}</span>
                <span className="hint guild-member-sub">{n.hp}/{n.maxHp} HP · {n.mana}/{n.maxMana} MP</span>
              </div>
              {healButton('NPC', n.npcId, n)}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3 className="guild-members-title">Tienda de artesanos del abismo</h3>
        {!shop && <p className="hint">Cargando tienda...</p>}
        {shop && shop.shop.length === 0 && <p className="hint">Sin ítems por ahora.</p>}
        {shop && shop.shop.length > 0 && (
          <div className="item-grid">
            {shop.shop.map((item) => (
              <div key={item.id} className={`rpg-panel inventory-item ${RARITY_CLASS[item.rarity] || ''}`}>
                <div className="inventory-item-header">
                  <span className="inventory-item-name">{item.name}</span>
                  <span className="inventory-item-qty">{item.price.toLocaleString()} monedas</span>
                </div>
                {item.description && <p className="hint">{item.description}</p>}
                <div className="craft-row">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={buyQty[item.id] ?? 1}
                    onChange={(e) => setBuyQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="rpg-input"
                    style={{ width: 60, textAlign: 'center', padding: '4px 6px' }}
                  />
                  <button
                    className="rpg-button rpg-button--small"
                    disabled={busyKey === `buy-${item.id}` || coins < item.price * Number(buyQty[item.id] || 1)}
                    onClick={() => handleBuy(item.id)}
                  >
                    {busyKey === `buy-${item.id}` ? '...' : 'Comprar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {canControl ? (
        <div className="craft-row" style={{ justifyContent: 'center', marginTop: 20 }}>
          <button className="rpg-button" onClick={onAdvance} disabled={loading}>
            {loading ? '...' : `Seguir al piso ${checkpoint.floor + 1}`}
          </button>
          <button className="rpg-button rpg-button-danger" onClick={onExtract} disabled={loading}>
            {loading ? '...' : 'Extraer'}
          </button>
        </div>
      ) : (
        <p className="hint" style={{ marginTop: 20 }}>Esperando a que el líder de la corrida (o alguien vivo, si murió) decida seguir o extraer...</p>
      )}
    </div>
  );
}

function TowerCombatView({
  session, player, npcLevelMap, runFloor, runRoom, loading, inventory, itemEffects, skills, npcSkillsCache,
  onLoadInventory, onLoadSkills, onLoadNpcSkills, onAction,
}) {
  const { session: combatSession, participants, log, nextActorId, round } = session;
  const players = participants.filter((p) => p.side === 'PLAYER');
  const enemies = participants.filter((p) => p.side === 'ENEMY');
  const isCoop = new Set(participants.filter((p) => p.player_id != null).map((p) => p.player_id)).size > 1;
  const actor = participants.find((p) => p.id === nextActorId);
  const hasActiveTurn = combatSession.status === 'IN_PROGRESS' && !!nextActorId;
  const isPlayerTurn = hasActiveTurn && actorBelongsToPlayer(actor, player?.id);
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [pendingSkill, setPendingSkill] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [logAtBottom, setLogAtBottom] = useState(true);
  const logRef = useRef(null);
  const { floaters, shakeIds } = useCombatFloaters(log);

  const selectingAlly = pendingSkill?.targetType === 'ALLY' || !!pendingItem;
  const selectingEnemy = !pendingItem && (!pendingSkill || pendingSkill.targetType === 'ENEMY');

  useEffect(() => {
    const el = logRef.current;
    if (el && logAtBottom) el.scrollTop = el.scrollHeight;
  }, [log, logAtBottom]);

  function handleLogScroll(e) {
    const el = e.target;
    setLogAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  }

  function toggleItems() {
    if (!showItems && !inventory) onLoadInventory();
    setShowItems((v) => !v);
    setPendingSkill(null);
    setPendingItem(null);
    setShowSkills(false);
  }

  function toggleSkills() {
    if (!showSkills) {
      if (actor?.npc_id) onLoadNpcSkills(actor.npc_id);
      else if (!skills) onLoadSkills();
    }
    setShowSkills((v) => !v);
    setShowItems(false);
    setPendingItem(null);
  }

  const activeSkills = actor?.npc_id ? (npcSkillsCache[actor.npc_id] ?? null) : skills;

  function runAction(action, options) {
    setPendingSkill(null);
    setPendingItem(null);
    setShowItems(false);
    setShowSkills(false);
    onAction(action, options);
  }

  function handleSkillClick(skill) {
    setShowSkills(false);
    if (skill.targetType === 'ENEMY' || skill.targetType === 'ALLY') {
      setPendingSkill(skill);
    } else {
      runAction('SKILL', { skillId: skill.id });
    }
  }

  function handleEnemyTarget(enemyId) {
    if (pendingSkill) {
      onAction('SKILL', { skillId: pendingSkill.id, targetParticipantId: enemyId });
      setPendingSkill(null);
    } else {
      onAction('ATTACK', { targetParticipantId: enemyId });
    }
  }

  function handleAllyTarget(allyId) {
    if (pendingItem) {
      onAction('USE_ITEM', { itemId: pendingItem.item_id, targetParticipantId: allyId });
      setPendingItem(null);
    } else {
      onAction('SKILL', { skillId: pendingSkill.id, targetParticipantId: allyId });
      setPendingSkill(null);
    }
  }

  return (
    <div className="combat-view">
      <TurnOrderBar participants={participants} nextActorId={nextActorId} />
      <div className="combat-left">
        <p className="combat-hint">Piso {runFloor} · Sala {runRoom}</p>

        {isPlayerTurn && (
          <p className="combat-hint">
            {pendingItem
              ? `Elige a quién darle ${pendingItem.name}.`
              : selectingAlly
              ? `Elige un aliado para usar ${pendingSkill.name}.`
              : pendingSkill
              ? `Elige un enemigo para usar ${pendingSkill.name}.`
              : `Turno de ${actor?.name}. Haz click en un enemigo para atacar.`}
          </p>
        )}
        {hasActiveTurn && !isPlayerTurn && (
          <p className="combat-hint combat-hint--waiting">⏳ Esperando el turno de tu compañero ({actor?.name})...</p>
        )}

        <div className="combat-log-shell">
          <div className="scroll-fade-top"></div>
          <div className="combat-log rpg-panel" ref={logRef} onScroll={handleLogScroll}>
            {log.length === 0 && round != null && combatSession.status === 'IN_PROGRESS' && (
              <p className="combat-round-label">— Ronda {round} —</p>
            )}
            {log.map((entry, i) => (
              <Fragment key={entry.id}>
                {(i === 0 || entry.round !== log[i - 1].round) && (
                  <p className="combat-round-label">— Ronda {entry.round} —</p>
                )}
                <p className={`combat-log-entry combat-log-entry--${classifyLogEntry(entry)}`}>
                  {entry.description}
                </p>
              </Fragment>
            ))}
          </div>
        </div>

        {isPlayerTurn && !pendingSkill && !pendingItem && (
          <div className="combat-actions rpg-panel">
            <button className="rpg-button" disabled={loading} onClick={() => runAction('ATTACK')}>Atacar</button>
            <button className="rpg-button" disabled={loading} onClick={() => runAction('DEFEND')}>Defender</button>
            <button className="rpg-button" disabled={loading} onClick={toggleItems}>Items</button>
            <button className="rpg-button" disabled={loading} onClick={toggleSkills}>Habilidades</button>
            {actor?.player_id && (
              <button className="rpg-button rpg-button-danger" disabled={loading} onClick={() => runAction('ESCAPE')}>
                Escapar (pierde la corrida)
              </button>
            )}
          </div>
        )}

        {isPlayerTurn && (pendingSkill || pendingItem) && (
          <div className="combat-actions">
            <button className="rpg-button" onClick={() => { setPendingSkill(null); setPendingItem(null); }}>
              Cancelar
            </button>
          </div>
        )}

        {isPlayerTurn && showItems && (
          <div className="rpg-panel item-list">
            {inventory === null && <p>Cargando items...</p>}
            {inventory && inventory.length === 0 && <p>No tienes objetos de combate.</p>}
            {inventory && inventory.map((item) => {
              const effects = itemEffects?.[item.item_id];
              return (
                <button
                  key={item.item_id}
                  className="item-row"
                  disabled={loading}
                  onClick={() => { setShowItems(false); setPendingItem(item); }}
                >
                  <span>{item.name}</span>
                  <span className="item-qty">x{item.quantity}</span>
                  {effects?.length > 0 && (
                    <div className="item-tooltip">
                      {effects.map((e, i) => <div key={i} className="item-tooltip-line">{e.description}</div>)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isPlayerTurn && showSkills && (
          <div className="rpg-panel item-list">
            {activeSkills === null && <p>Cargando habilidades...</p>}
            {activeSkills && activeSkills.length === 0 && <p>No hay habilidades disponibles.</p>}
            {activeSkills && activeSkills.filter((s) => !s.isPassive && s.skillType !== 'PASIVA').map((skill) => {
              const insufficientMana = actor && actor.mana < skill.manaCost;
              const disabled = loading || insufficientMana;
              const icon = SKILL_TYPE_ICONS[skill.skillType] || SKILL_TYPE_ICONS.ATAQUE;
              const schoolIcon = SCHOOL_ICONS[skill.damageSchool];
              const targetIcon = TARGET_ICONS[skill.targetType];
              return (
                <button key={skill.id} className="item-row" disabled={disabled} onClick={() => handleSkillClick(skill)}>
                  <span className="skill-row-main">
                    <span><GameIcon {...icon} /> {skill.name}</span>
                    <span className="skill-row-badges">
                      {schoolIcon && (
                        <span title={SCHOOL_LABELS[skill.damageSchool]}><GameIcon {...schoolIcon} /></span>
                      )}
                      {targetIcon && (
                        <span title={TARGET_LABELS[skill.targetType]}>
                          {typeof targetIcon === 'string' ? targetIcon : <GameIcon {...targetIcon} />}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="item-qty">{skill.manaCost > 0 ? `${skill.manaCost} maná` : 'gratis'}</span>
                  <div className="item-tooltip">
                    {insufficientMana && <div className="item-tooltip-line">No te alcanza el maná</div>}
                    {skill.description && <div className="item-tooltip-line">{skill.description}</div>}
                    {skill.effects?.map((e, i) => (
                      <div key={i} className="item-tooltip-line">{describeSkillEffect(e)}</div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="combat-right">
        <div className="combat-side rpg-panel party-side">
          <h3>{isCoop ? 'Grupo' : 'Tu grupo'}</h3>
          {players.map((p) => (
            <CombatantCard
              key={p.id}
              participant={p}
              level={p.player_id ? p.level : (npcLevelMap?.[p.npc_id] ?? null)}
              isActive={p.id === nextActorId}
              allyTargetable={isPlayerTurn && selectingAlly && p.hp > 0}
              onTarget={() => handleAllyTarget(p.id)}
              partnerOwned={isCoop && !actorBelongsToPlayer(p, player?.id)}
              floaters={floaters.filter((f) => f.participantId === p.id)}
              shaking={shakeIds.has(p.id)}
            />
          ))}
        </div>

        <div className="vs-divider">— vs —</div>

        <div className="combat-side rpg-panel enemy-side">
          <h3>Enemigos</h3>
          {enemies.map((p) => (
            <CombatantCard
              key={p.id}
              participant={p}
              level={null}
              isActive={p.id === nextActorId}
              targetable={isPlayerTurn && selectingEnemy}
              onTarget={() => handleEnemyTarget(p.id)}
              floaters={floaters.filter((f) => f.participantId === p.id)}
              shaking={shakeIds.has(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
