import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getActiveCombat, setActiveCombat, clearActiveCombat } from '../utils/activeCombat';

const AUTO_RESTART_DELAY_MS = 5000;
const LOG_REVEAL_DELAY_MS = 650;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStoredCombat(zoneId) {
  const stored = getActiveCombat();
  if (!stored || stored.path !== `/combat/${zoneId}`) return null;
  return stored.session?.session?.status === 'IN_PROGRESS' ? stored : null;
}

export default function ExploreZone() {
  const { zoneId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { player, token } = useAuth();

  const [zone, setZone] = useState(location.state?.zone || null);
  const [playerLevel, setPlayerLevel] = useState(null);
  const [party, setParty] = useState(null);
  const [enemyLevels, setEnemyLevels] = useState(() => readStoredCombat(zoneId)?.enemyLevels ?? null);
  const [inventory, setInventory] = useState(null);
  const [itemEffects, setItemEffects] = useState({});
  const [skills, setSkills] = useState(null);
  const [npcSkillsCache, setNpcSkillsCache] = useState({}); // { npcId: normalizedSkills[] }
  const [session, setSession] = useState(() => readStoredCombat(zoneId)?.session ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [coopParty, setCoopParty] = useState(null);
  const [readyStatus, setReadyStatus] = useState(null);
  const [waitingReady, setWaitingReady] = useState(false);

  // session en un ref, siempre al dia: revealSession la usa para calcular "que hay de nuevo"
  // tanto cuando la llamo yo (despues de mi accion) como cuando la llama el poll de abajo
  // (despues de la accion de mi companero) — si leyera el "session" del closure del efecto
  // de polling, quedaria pisado con el valor de cuando se armo ese efecto, no el mas reciente.
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Revela el log nuevo de a una linea (en vez de saltar directo al estado final) para que se
  // pueda seguir quien ataco a quien. Cada entrada trae hp_after/mana_after del participante que
  // afecto (actor_participant_id/target_participant_id), asi que el HP/mana de esa tarjeta baja
  // en el mismo paso en que aparece la linea, en vez de saltar todo junto al final.
  // loading ya queda en true durante toda la reproduccion (handleAction no libera el finally
  // hasta que este await termina), asi que alcanza para deshabilitar los botones.
  async function revealSession(newState) {
    const oldLog = sessionRef.current?.log ?? [];
    const oldStatus = sessionRef.current?.session ?? newState.session;
    const newEntries = newState.log.slice(oldLog.length);

    if (newEntries.length === 0) {
      setSession(newState);
      return;
    }

    let liveParticipants = sessionRef.current?.participants ?? newState.participants;
    for (let i = 0; i < newEntries.length; i += 1) {
      await sleep(LOG_REVEAL_DELAY_MS);
      const entry = newEntries[i];
      liveParticipants = liveParticipants.map((p) => {
        let next = p;
        if (entry.target_participant_id === p.id && entry.hp_after != null) {
          next = { ...next, hp: entry.hp_after };
        }
        if (entry.actor_participant_id === p.id && entry.mana_after != null) {
          next = { ...next, mana: entry.mana_after };
        }
        return next;
      });
      setSession({
        ...newState,
        session: oldStatus,
        log: [...oldLog, ...newEntries.slice(0, i + 1)],
        participants: liveParticipants,
        nextActorId: null,
        rewards: undefined,
      });
    }
    await sleep(250);
    setSession(newState);
  }

  useEffect(() => {
    if (zone || !player) return;
    api.getPlayerZones(player.id, token)
      .then((zones) => {
        const found = zones.find((z) => String(z.id) === String(zoneId));
        if (!found) setError('Zona no encontrada');
        else setZone(found);
      })
      .catch((err) => setError(err.message));
  }, [zone, player, token, zoneId]);

  function refreshPartyAndLevel() {
    if (!player) return;
    api.getPlayerStats(player.id, token)
      .then((stats) => setPlayerLevel(stats.level))
      .catch(() => setPlayerLevel(null));
    api.getParty(player.id, token)
      .then(setParty)
      .catch(() => setParty(null));
  }

  useEffect(() => {
    refreshPartyAndLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, token]);

  // ─── Co-op: grupo con otro jugador y ready-check antes de explorar ────────

  useEffect(() => {
    if (!player) return;
    api.getCoopParty(player.id, token).then(setCoopParty).catch(() => setCoopParty(null));
  }, [player, token]);

  // Al llegar desde el ✓ de la barra co-op (ya confirmaste "listo" ahí), arranca directo
  // sin mostrar de nuevo el botón de confirmar.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!location.state?.autoStart || !coopParty || session || autoStartedRef.current) return;
    autoStartedRef.current = true;
    navigate(location.pathname, { replace: true, state: {} });
    startCoopExplore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, coopParty, session]);

  useEffect(() => {
    if (!coopParty || session) {
      setReadyStatus(null);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const status = await api.getCoopReadyStatus(player.id, token);
        if (!cancelled) setReadyStatus(status);
      } catch {
        // silencioso: es solo polling en background
      }
    }
    poll();
    const iv = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [coopParty, session, player, token]);

  // El back borra las filas de "ready" de los dos apenas detecta que ambos confirmaron
  // (para poder reusarlas en la próxima ronda), así que el flag bothReady solo lo ve quien
  // hizo la segunda confirmación — el que está esperando nunca lo va a leer por polling,
  // ya desapareció. Por eso, mientras estoy en grupo y sin sesión, pregunto directo si ya
  // existe una pelea activa (la creó mi compañero al confirmar) y me uno a esa.
  useEffect(() => {
    if (!coopParty || session) return;
    let cancelled = false;
    async function pollActiveSession() {
      try {
        const result = await api.getActiveCombatSession(token);
        if (!cancelled) {
          setWaitingReady(false);
          setSession(result);
        }
      } catch {
        // 404 = todavía no arrancó, seguimos esperando
      }
    }
    const iv = setInterval(pollActiveSession, 2500);
    return () => { cancelled = true; clearInterval(iv); };
  }, [coopParty, session, token]);

  async function startCoopExplore() {
    setError('');
    setLoading(true);
    try {
      // coopParty puede estar viejo (se pide una sola vez al montar la página) — si alguien
      // se fue del grupo mientras estabas parado acá, la lista quedaría con gente que ya no
      // está, y el back rechaza el explore o arma la sesión con datos podridos. Refrescamos
      // justo antes de armar la sesión.
      const freshParty = await api.getCoopParty(player.id, token);
      if (!freshParty) throw new Error('Ya no estás en un grupo co-op');
      setCoopParty(freshParty);
      const result = await api.exploreZone(zoneId, token, freshParty.members.map((m) => m.id));
      setEnemyLevels((result.monsters || []).map((m) => m.level));
      setSession(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReadyClick() {
    setError('');
    try {
      const res = await api.setCoopReady(player.id, zoneId, token);
      if (res.allReady) {
        await startCoopExplore();
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
      await api.cancelCoopReady(player.id, token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadInventory() {
    if (!player) return;
    try {
      const items = await api.getPlayerInventory(player.id, token);
      const consumables = items.filter((i) => i.item_type === 'CONSUMABLE');
      setInventory(consumables);
      // Descripciones de efecto (cura cuánto, buff de qué) para el tooltip al pasar el mouse.
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

  async function handleExplore() {
    setError('');
    setLoading(true);
    try {
      const result = await api.exploreZone(zoneId, token);
      setEnemyLevels((result.monsters || []).map((m) => m.level));
      setSession(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSkills() {
    if (!player) return;
    try {
      const result = await api.getPlayerSkills(player.id, token);
      setSkills(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadNpcSkills(npcId) {
    if (!player || npcSkillsCache[npcId]) return;
    try {
      const raw = await api.getNpcSkills(player.id, npcId, token);
      // normalize supportedInCombat → supported to match hero skill shape
      const normalized = raw.map((s) => ({ ...s, supported: s.supportedInCombat }));
      setNpcSkillsCache((prev) => ({ ...prev, [npcId]: normalized }));
    } catch {
      setNpcSkillsCache((prev) => ({ ...prev, [npcId]: [] }));
    }
  }

  const inCombat = !!session && session.session.status === 'IN_PROGRESS';

  useEffect(() => {
    if (!session) return;
    if (session.session.status === 'IN_PROGRESS') {
      setActiveCombat(`/combat/${zoneId}`, session, enemyLevels);
    } else {
      clearActiveCombat();
    }
  }, [session, enemyLevels, zoneId]);

  useEffect(() => {
    if (!inCombat) return;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inCombat]);

  // Sincroniza el combate co-op: hasta ahora, la única forma de enterarse de que el
  // compañero actuó era mi propia acción devolviendo el estado nuevo. Si el turno era
  // suyo, mi pantalla quedaba congelada esperando algo que nunca iba a llegar sola.
  // Mientras el combate está en curso hago polling de la sesión y reviso las novedades
  // con revealSession (mismo mecanismo que uso para mis propias acciones).
  const revealingRef = useRef(false);
  // Cuenta jugadores humanos distintos entre los participantes en vez de mirar guest_player_id
  // (esa columna solo cubre hasta 2; con grupos de 3 hay guest_player_id_2 tambien).
  const isCoopSession = new Set(
    (session?.participants || []).filter((p) => p.player_id != null).map((p) => p.player_id)
  ).size > 1;
  useEffect(() => {
    if (!inCombat || !isCoopSession) return undefined;
    let cancelled = false;
    async function pollCombat() {
      if (revealingRef.current) return;
      try {
        const state = await api.getCombatSession(sessionRef.current.session.id, token);
        if (cancelled) return;
        revealingRef.current = true;
        await revealSession(state);
      } catch {
        // silencioso: reintenta en la proxima vuelta
      } finally {
        revealingRef.current = false;
      }
    }
    const iv = setInterval(pollCombat, 2500);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCombat, isCoopSession, token]);

  async function handleAction(action, options = {}) {
    if (!session) return;
    const actor = session.participants.find((p) => p.id === session.nextActorId);
    if (!actor) return;
    setLoading(true);
    setError('');
    revealingRef.current = true;
    try {
      const state = await api.sendCombatAction(
        session.session.id,
        { participantId: actor.id, action, ...options },
        token
      );
      await revealSession(state);
      if (action === 'USE_ITEM') await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      revealingRef.current = false;
    }
  }

  if (zone && zone.unlocked === false) {
    return (
      <div className="placeholder-page">
        <h1>🔒 Zona bloqueada</h1>
        <p>Todavía no puedes entrar a esta zona.</p>
        <Link to="/combat">Volver a zonas</Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{zone ? zone.name : 'Explorando...'}</h1>
          {zone && <p className="dashboard-subtitle">Nv. {zone.levelRange}</p>}
        </div>
        {!inCombat && (
          <Link className="logout-btn" to="/combat">
            Volver
          </Link>
        )}
      </header>

      {error && <p className="auth-error">{error}</p>}

      {!session && !coopParty && (
        <div className="rpg-panel explore-panel">
          <p>Explora la zona para encontrar enemigos, recuerda mantener tu grupo equilibrado.</p>
          <button className="rpg-button" onClick={handleExplore} disabled={loading}>
            {loading ? 'Explorando...' : 'Explorar'}
          </button>
        </div>
      )}

      {!session && coopParty && (() => {
        const groupNames = coopParty.members.map((m) => m.nickname).join(', ');
        const readyHereIds = new Set(
          (readyStatus?.members || [])
            .filter((m) => m.ready && Number(m.zoneId) === Number(zoneId))
            .map((m) => m.playerId)
        );
        const readyHereNames = coopParty.members.filter((m) => readyHereIds.has(m.id)).map((m) => m.nickname);
        return (
          <div className="rpg-panel explore-panel coop-ready-panel">
            {readyHereNames.length > 0 && !waitingReady ? (
              <>
                <p>¿Listo para explorar? <strong>{readyHereNames.join(', ')}</strong> ya {readyHereNames.length > 1 ? 'están' : 'está'} esperando aquí.</p>
                <div className="craft-row" style={{ justifyContent: 'center' }}>
                  <button className="rpg-button" onClick={handleReadyClick} disabled={loading}>
                    ✓ Listo para explorar
                  </button>
                  <button className="rpg-button rpg-button--small" onClick={() => navigate('/combat')}>
                    ✗
                  </button>
                </div>
              </>
            ) : waitingReady ? (
              <>
                <p className="hint">Esperando al resto del grupo ({groupNames})...</p>
                <button className="rpg-button rpg-button--small" onClick={handleCancelReady}>
                  ✗ Cancelar
                </button>
              </>
            ) : (
              <>
                <p>Exploras en grupo con <strong>{groupNames}</strong>. Confirma cuando estés listo.</p>
                <button className="rpg-button" onClick={handleReadyClick} disabled={loading}>
                  Listo para explorar
                </button>
              </>
            )}
          </div>
        );
      })()}

      {session && (
        <CombatView
          session={session}
          player={player}
          playerLevel={playerLevel}
          npcLevelMap={Object.fromEntries(
            (party?.members || []).filter((m) => !m.isHero && m.npcId).map((m) => [m.npcId, m.level])
          )}
          enemyLevels={enemyLevels}
          loading={loading}
          inventory={inventory}
          itemEffects={itemEffects}
          skills={skills}
          npcSkillsCache={npcSkillsCache}
          onLoadInventory={loadInventory}
          onLoadSkills={loadSkills}
          onLoadNpcSkills={loadNpcSkills}
          onAction={handleAction}
          onRestart={() => {
            clearActiveCombat();
            refreshPartyAndLevel();
            setSession(null);
            setInventory(null);
            setSkills(null);
            setNpcSkillsCache({});
            setEnemyLevels(null);
          }}
        />
      )}
    </div>
  );
}

function actorBelongsToPlayer(actor, playerId) {
  if (!actor) return false;
  if (actor.player_id != null) return actor.player_id === playerId;
  if (actor.owner_player_id != null) return actor.owner_player_id === playerId;
  return true; // NPC propio en partida solo (sin owner_player_id, no hay compañero)
}

function CombatView({
  session,
  player,
  playerLevel,
  npcLevelMap,
  enemyLevels,
  loading,
  inventory,
  itemEffects,
  skills,
  npcSkillsCache,
  onLoadInventory,
  onLoadSkills,
  onLoadNpcSkills,
  onAction,
  onRestart,
}) {
  const { session: combatSession, participants, log, nextActorId, rewards, round } = session;
  const players = participants.filter((p) => p.side === 'PLAYER');
  const enemies = participants.filter((p) => p.side === 'ENEMY');
  const finished = combatSession.status !== 'IN_PROGRESS';
  const isCoop = new Set(participants.filter((p) => p.player_id != null).map((p) => p.player_id)).size > 1;
  const actor = participants.find((p) => p.id === nextActorId);
  const hasActiveTurn = !finished && !!nextActorId;
  const isPlayerTurn = hasActiveTurn && actorBelongsToPlayer(actor, player?.id);
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [pendingSkill, setPendingSkill] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [logAtBottom, setLogAtBottom] = useState(true);
  const logRef = useRef(null);

  const selectingAlly = pendingSkill?.targetType === 'ALLY' || !!pendingItem;
  const selectingEnemy = !pendingItem && (!pendingSkill || pendingSkill.targetType === 'ENEMY');

  // Sigue el combate como un chat: si el jugador estaba al fondo del log,
  // lo mantenemos ahí al llegar acciones nuevas; si scrolleó para revisar
  // el historial, no lo interrumpimos.
  useEffect(() => {
    const el = logRef.current;
    if (el && logAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [log, logAtBottom]);

  const onRestartRef = useRef(onRestart);
  useEffect(() => {
    onRestartRef.current = onRestart;
  }, [onRestart]);

  const [autoRestartIn, setAutoRestartIn] = useState(null);

  useEffect(() => {
    if (!finished) {
      setAutoRestartIn(null);
      return;
    }
    setAutoRestartIn(Math.ceil(AUTO_RESTART_DELAY_MS / 1000));
    const countdown = setInterval(() => {
      setAutoRestartIn((s) => (s != null ? s - 1 : s));
    }, 1000);
    const timeout = setTimeout(() => onRestartRef.current(), AUTO_RESTART_DELAY_MS);
    return () => {
      clearInterval(countdown);
      clearTimeout(timeout);
    };
  }, [finished]);

  function handleLogScroll(e) {
    const el = e.target;
    setLogAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  }

  function jumpLogToBottom() {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setLogAtBottom(true);
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
      if (actor?.npc_id) {
        onLoadNpcSkills(actor.npc_id);
      } else if (!skills) {
        onLoadSkills();
      }
    }
    setShowSkills((v) => !v);
    setShowItems(false);
    setPendingItem(null);
  }

  // Skills to show: hero's list or the active NPC's list
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
      // SELF, ALL_ALLIES, ALL_ENEMIES — no target selection needed
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

  const heroLevelUps = rewards?.levelUps?.filter((l) => l.playerId) ?? [];
  const npcLevelUps = rewards?.levelUps?.filter((l) => l.npcId) ?? [];

  return (
    <div className="combat-view">
      <div className="combat-left">
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
          <p className="combat-hint combat-hint--waiting">
            ⏳ Esperando el turno de tu compañero ({actor?.name})...
          </p>
        )}

        <div className="combat-log-shell">
          <div className="scroll-fade-top"></div>
          <div className="combat-log rpg-panel" ref={logRef} onScroll={handleLogScroll}>
            {log.length === 0 && round != null && !finished && (
              <p className="combat-round-label">— Ronda {round} —</p>
            )}
            {log.map((entry, i) => (
              <Fragment key={entry.id}>
                {(i === 0 || entry.round !== log[i - 1].round) && (
                  <p className="combat-round-label">— Ronda {entry.round} —</p>
                )}
                <p>{entry.description}</p>
              </Fragment>
            ))}
          </div>
          {!logAtBottom && (
            <button className="log-jump-btn" onClick={jumpLogToBottom}>
              ↓ acciones nuevas
            </button>
          )}
        </div>

        {isPlayerTurn && !pendingSkill && !pendingItem && (
          <div className="combat-actions rpg-panel">
            <button className="rpg-button" disabled={loading} onClick={() => runAction('ATTACK')}>
              Atacar
            </button>
            <button className="rpg-button" disabled={loading} onClick={() => runAction('DEFEND')}>
              Defender
            </button>
            <button className="rpg-button" disabled={loading} onClick={toggleItems}>
              Items
            </button>
            <button className="rpg-button" disabled={loading} onClick={toggleSkills}>
              Habilidades
            </button>
            {actor?.player_id && (
              <button className="rpg-button rpg-button-danger" disabled={loading} onClick={() => runAction('ESCAPE')}>
                Escapar
              </button>
            )}
          </div>
        )}

        {isPlayerTurn && (pendingSkill || pendingItem) && (
          <div className="combat-actions">
            <button
              className="rpg-button"
              onClick={() => {
                setPendingSkill(null);
                setPendingItem(null);
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {isPlayerTurn && showItems && (
          <div className="rpg-panel item-list">
            {inventory === null && <p>Cargando items...</p>}
            {inventory && inventory.length === 0 && <p>No tienes objetos de combate.</p>}
            {inventory &&
              inventory.map((item) => {
                const effects = itemEffects?.[item.item_id];
                return (
                  <button
                    key={item.item_id}
                    className="item-row"
                    disabled={loading}
                    onClick={() => {
                      setShowItems(false);
                      setPendingItem(item);
                    }}
                  >
                    <span>{item.name}</span>
                    <span className="item-qty">x{item.quantity}</span>
                    {effects?.length > 0 && (
                      <div className="item-tooltip">
                        {effects.map((e, i) => (
                          <div key={i} className="item-tooltip-line">{e.description}</div>
                        ))}
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
            {activeSkills &&
              activeSkills.filter((s) => !s.isPassive && s.skillType !== 'PASIVA').map((skill) => {
                const insufficientMana = actor && actor.mana < skill.manaCost;
                const disabled = loading || insufficientMana;
                const title = insufficientMana ? 'No te alcanza el maná' : (skill.description || '');
                const icon = {
                  ATAQUE: '⚔', CURACION: '✚', BUFF: '🛡', DEBUFF: '💀',
                  ESTADO_ALTERADO: '☠', ESPECIAL: '✦',
                }[skill.skillType] || '⚔';
                return (
                  <button
                    key={skill.id}
                    className="item-row"
                    disabled={disabled}
                    title={title}
                    onClick={() => handleSkillClick(skill)}
                  >
                    <span>{icon} {skill.name}</span>
                    <span className="item-qty">{skill.manaCost > 0 ? `${skill.manaCost} maná` : 'gratis'}</span>
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
              level={p.player_id ? (p.level ?? playerLevel) : (npcLevelMap?.[p.npc_id] ?? null)}
              isActive={p.id === nextActorId}
              allyTargetable={isPlayerTurn && selectingAlly && p.hp > 0}
              onTarget={() => handleAllyTarget(p.id)}
              partnerOwned={isCoop && !actorBelongsToPlayer(p, player?.id)}
            />
          ))}
        </div>

        <div className="vs-divider">— vs —</div>

        <div className="combat-side rpg-panel enemy-side">
          <h3>Enemigos</h3>
          {enemies.map((p, i) => (
            <CombatantCard
              key={p.id}
              participant={p}
              level={enemyLevels?.[i]}
              isActive={p.id === nextActorId}
              targetable={isPlayerTurn && selectingEnemy}
              onTarget={() => handleEnemyTarget(p.id)}
            />
          ))}
        </div>
      </div>

      {finished && (
        <div className="combat-result rpg-panel">
          <h2>
            {combatSession.status === 'PLAYER_WON' && '¡Victoria!'}
            {combatSession.status === 'ESCAPED' && 'Escapaste'}
            {combatSession.status === 'ENEMY_WON' && 'Derrota'}
          </h2>
          {rewards && (
            <>
              <p>+{rewards.xp} XP · +{rewards.gold} Oro</p>
              {rewards.itemsDropped && rewards.itemsDropped.length > 0 && (
                <p className="hint hint-ok">
                  Items: {rewards.itemsDropped.map((d) => `${d.itemName} x${d.quantity}`).join(', ')}
                </p>
              )}
              {heroLevelUps.map((l) => (
                <p key={l.playerId} className="hint hint-ok">
                  {l.playerId === player?.id
                    ? `¡Subiste a nivel ${l.newLevel}! HP y maná restaurados.`
                    : `¡Tu compañero subió a nivel ${l.newLevel}!`}
                </p>
              ))}
              {npcLevelUps.map((l) => (
                <p key={l.npcId} className="hint hint-ok">
                  ¡{l.npcName} subió a nivel {l.newLevel}!
                </p>
              ))}
            </>
          )}
          {autoRestartIn > 0 && (
            <p className="hint">Volviendo a explorar en {autoRestartIn}s...</p>
          )}
          <button className="rpg-button" onClick={onRestart}>
            Explorar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

export function CombatantCard({ participant, level, isActive, targetable, allyTargetable, onTarget, partnerOwned }) {
  const hpPercent = participant.max_hp ? Math.max(0, (participant.hp / participant.max_hp) * 100) : 0;
  const manaPercent = participant.max_mana ? Math.max(0, (participant.mana / participant.max_mana) * 100) : 0;
  const dead = participant.hp <= 0;
  const clickable = (targetable || allyTargetable) && !dead;

  const classes = [
    'combatant-card',
    dead ? 'combatant-dead' : '',
    isActive ? 'combatant-active' : '',
    targetable && !dead ? 'combatant-targetable' : '',
    allyTargetable && !dead ? 'combatant-ally-targetable' : '',
    partnerOwned ? 'combatant-partner' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={clickable ? onTarget : undefined}>
      <div className="combatant-info">
        <div className="combatant-name">
          {participant.name}
          {level != null && <span className="combatant-level"> Nv. {level}</span>}
          {participant.is_defending && <span className="combatant-defending"> 🛡</span>}
          {partnerOwned && <span className="combatant-partner-tag"> (compañero)</span>}
          {participant.is_ai_controlled && <span className="combatant-ai-tag"> 🤖 IA</span>}
        </div>
        {participant.class_name && (
          <div className="combatant-class">{participant.class_name}</div>
        )}
        <div className="combatant-bar-row">
          <div className="stat-bar-track combatant-hp-track">
            <div className="stat-bar-fill hp" style={{ width: `${hpPercent}%` }} />
          </div>
          <span className="combatant-bar-text">
            {Math.max(0, participant.hp)}/{participant.max_hp}
          </span>
        </div>
        {participant.max_mana > 0 && (
          <div className="combatant-bar-row">
            <div className="stat-bar-track combatant-mana-track">
              <div className="stat-bar-fill mana" style={{ width: `${manaPercent}%` }} />
            </div>
            <span className="combatant-bar-text combatant-bar-text--mana">
              {Math.max(0, participant.mana)}/{participant.max_mana}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
