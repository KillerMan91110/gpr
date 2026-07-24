import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  CombatantCard, TurnOrderBar, useCombatFloaters, classifyLogEntry,
  SCHOOL_ICONS, SCHOOL_LABELS, TARGET_ICONS, TARGET_LABELS, describeSkillEffect,
} from './ExploreZone';
import { setActiveCombat, clearActiveCombat } from '../utils/activeCombat';

const LOG_REVEAL_DELAY_MS = 650;
const STATUS_POLL_MS = 8000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function actorBelongsToPlayer(actor, playerId) {
  if (!actor) return false;
  if (actor.player_id != null) return actor.player_id === playerId;
  if (actor.owner_player_id != null) return actor.owner_player_id === playerId;
  return true;
}

function formatCountdown(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function WorldBoss() {
  const { player, token } = useAuth();

  const [playerLevel, setPlayerLevel] = useState(null);
  const [coopParty, setCoopParty] = useState(null);
  const [status, setStatus] = useState(undefined); // undefined = cargando
  const [leaderboard, setLeaderboard] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    if (!player) return;
    api.getPlayerStats(player.id, token).then((s) => setPlayerLevel(s.level)).catch(() => setPlayerLevel(null));
    api.getCoopParty(player.id, token).then(setCoopParty).catch(() => setCoopParty(null));
  }, [player, token]);

  async function refreshStatus() {
    const data = await api.getWorldBossStatus(token);
    setStatus(data);
    return data;
  }

  async function refreshLeaderboard() {
    const data = await api.getWorldBossLeaderboard(token).catch(() => ({ entries: [] }));
    setLeaderboard(data.entries || []);
  }

  useEffect(() => {
    if (!player) return;
    refreshStatus().catch(() => setStatus(null));
    refreshLeaderboard();
    // Retoma un combate de World Boss en curso si recargaste la página a mitad de un intento.
    api.getActiveCombatSession(token).then((state) => {
      if (state && state.participants?.some((p) => p.monster_code?.startsWith('WORLD_BOSS_'))) {
        setSession(state);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, token]);

  // Refresca el estado global (HP/timer/top3) mientras estás en la sala de preparación,
  // para ver el progreso de otros jugadores sin recargar la página.
  useEffect(() => {
    if (session) return undefined;
    const iv = setInterval(() => {
      refreshStatus().catch(() => {});
      refreshLeaderboard();
    }, STATUS_POLL_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const inCombat = !!session && session.session.status === 'IN_PROGRESS';

  useEffect(() => {
    if (inCombat) setActiveCombat('/worldboss', session, null);
    else clearActiveCombat();
  }, [inCombat, session]);

  useEffect(() => {
    if (!inCombat) return undefined;
    function handleBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inCombat]);

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
      await refreshStatus().catch(() => {});
      await refreshLeaderboard();
    }
  }

  const [inventory, setInventory] = useState(null);
  const [itemEffects, setItemEffects] = useState({});
  const [skills, setSkills] = useState(null);
  const [npcSkillsCache, setNpcSkillsCache] = useState({});

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
    } catch (err) { setError(err.message); }
  }

  async function loadSkills() {
    try { setSkills(await api.getPlayerSkills(player.id, token)); }
    catch (err) { setError(err.message); }
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

  async function handleEnter() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const coopPartnerIds = (coopParty?.members || []).filter((m) => m.id !== player.id).map((m) => m.id);
      const state = await api.enterWorldBoss(player.id, coopPartnerIds, token);
      setSession(state);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === undefined || playerLevel === null) {
    return <div className="dashboard"><p>Cargando...</p></div>;
  }

  if (!status || !status.active) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div><h1>🌌 World Boss</h1></div>
          <Link className="logout-btn" to="/combat">Volver</Link>
        </header>
        <div className="rpg-panel explore-panel">
          <p>
            {status?.status === 'KILLED' && '¡El Devorador de Estrellas fue derrotado en el último evento! '}
            {status?.status === 'EXPIRED' && 'El último evento se cerró sin que nadie lo derrotara. '}
            No hay ningún World Boss activo en este momento. Volvé más tarde.
          </p>
        </div>
      </div>
    );
  }

  if (playerLevel < 10) {
    return (
      <div className="placeholder-page">
        <h1>🌌 World Boss</h1>
        <p>Necesitas nivel 10 para enfrentar al World Boss. Todavía estás en nivel {playerLevel}.</p>
        <Link to="/combat">Volver a zonas</Link>
      </div>
    );
  }

  const hpPercent = status.maxHp ? Math.max(0, Math.min(100, (status.hpRemaining / status.maxHp) * 100)) : 0;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🌌 World Boss</h1>
          {!inCombat && <p className="dashboard-subtitle">El Devorador de Estrellas — evento server-wide</p>}
        </div>
        <div className="craft-row">
          {!session && <Link className="rpg-button rpg-button--small" to="/worldboss/shop">🛒 Tienda</Link>}
          {!session && <Link className="logout-btn" to="/combat">Volver</Link>}
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
      {message && !session && <p className="hint hint-ok infirmary-message">{message}</p>}

      {!session && (
        <>
          <div className="rpg-panel boss-banner">
            <div className="boss-banner-top">
              <span className="boss-name">🌌 El Devorador de Estrellas</span>
              <span className="event-timer">⏳ {formatCountdown(status.endsAt)} restantes</span>
            </div>
            <div className="boss-hp-row">
              <span className="hint">HP GLOBAL DEL JEFE</span>
              <span>{status.hpRemaining.toLocaleString()} / {status.maxHp.toLocaleString()}</span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill boss" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          <div className="dashboard-columns">
            <div className="dashboard-main">
              <div className="rpg-panel explore-panel">
                <p>Pelea con tu formación completa contra un clon del jefe escalado a tu nivel. El daño que le hagas se resta de la vida global compartida — no importa si mueres, lo ya hecho queda contado, y podés reintentar.</p>
                {coopParty && coopParty.members?.length > 1 && (
                  <p className="hint">Vas a entrar junto a tu grupo: {coopParty.members.filter((m) => m.id !== player.id).map((m) => m.nickname).join(', ')}.</p>
                )}
                <button className="rpg-button" onClick={handleEnter} disabled={loading}>
                  {loading ? 'Entrando...' : '⚔️ Entrar en combate'}
                </button>
              </div>
            </div>
            <div className="dashboard-side">
              <div className="rpg-panel">
                <h3 className="guild-members-title">🏆 Ranking de daño</h3>
                {leaderboard.length === 0 && <p className="hint">Todavía nadie le hizo daño.</p>}
                <div className="guild-members-list">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.player_id} className="guild-member-row">
                      <span className="guild-member-name">
                        {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {entry.nickname}
                      </span>
                      <span className="hint">{Number(entry.total_damage).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {session && (
        <WorldBossCombatView
          session={session}
          player={player}
          loading={loading}
          inventory={inventory}
          itemEffects={itemEffects}
          skills={skills}
          npcSkillsCache={npcSkillsCache}
          onLoadInventory={loadInventory}
          onLoadSkills={loadSkills}
          onLoadNpcSkills={loadNpcSkills}
          onAction={handleAction}
          onReturnToLobby={() => setSession(null)}
        />
      )}
    </div>
  );
}

function WorldBossCombatView({
  session, player, loading, inventory, itemEffects, skills, npcSkillsCache,
  onLoadInventory, onLoadSkills, onLoadNpcSkills, onAction, onReturnToLobby,
}) {
  const { session: combatSession, participants, log, nextActorId, round, rewards, bossTaunt } = session;
  const players = participants.filter((p) => p.side === 'PLAYER');
  const enemies = participants.filter((p) => p.side === 'ENEMY');
  const isCoop = new Set(participants.filter((p) => p.player_id != null).map((p) => p.player_id)).size > 1;
  const actor = participants.find((p) => p.id === nextActorId);
  const hasActiveTurn = combatSession.status === 'IN_PROGRESS' && !!nextActorId;
  const isPlayerTurn = hasActiveTurn && actorBelongsToPlayer(actor, player?.id);
  const finished = combatSession.status !== 'IN_PROGRESS';
  const [tauntDismissed, setTauntDismissed] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [pendingSkill, setPendingSkill] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [logAtBottom, setLogAtBottom] = useState(true);
  const logRef = useRef(null);
  const { floaters, shakeIds } = useCombatFloaters(log, participants);

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
    <div className="worldboss-combat">
      {bossTaunt && !tauntDismissed && (
        <div className="rpg-panel worldboss-taunt">
          <span className="worldboss-taunt-icon">🌌</span>
          <p className="worldboss-taunt-text">{bossTaunt}</p>
          <button className="worldboss-taunt-close" onClick={() => setTauntDismissed(true)} aria-label="Cerrar">×</button>
        </div>
      )}

      <TurnOrderBar participants={participants} nextActorId={nextActorId} />

      <div className="rpg-panel worldboss-arena">
        <span className="worldboss-arena-icon">🌌</span>
        <div className="worldboss-arena-body">
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

      <div className="rpg-panel worldboss-formation">
        <h3>{isCoop ? 'Grupo' : 'Tu formación'}</h3>
        <div className="worldboss-formation-cards">
          {players.map((p) => (
            <CombatantCard
              key={p.id}
              participant={p}
              level={p.player_id ? p.level : null}
              isActive={p.id === nextActorId}
              allyTargetable={isPlayerTurn && selectingAlly && p.hp > 0}
              onTarget={() => handleAllyTarget(p.id)}
              partnerOwned={isCoop && !actorBelongsToPlayer(p, player?.id)}
              floaters={floaters.filter((f) => f.participantId === p.id)}
              shaking={shakeIds.has(p.id)}
            />
          ))}
        </div>
      </div>

      <div className="combat-left">
        {isPlayerTurn && (
          <p className="combat-hint">
            {pendingItem
              ? `Elige a quién darle ${pendingItem.name}.`
              : selectingAlly
              ? `Elige un aliado para usar ${pendingSkill.name}.`
              : pendingSkill
              ? `Elige un enemigo para usar ${pendingSkill.name}.`
              : `Turno de ${actor?.name}. Haz click en el jefe para atacar.`}
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
                Retirarse
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
              const icon = { ATAQUE: '⚔', CURACION: '✚', BUFF: '🛡', DEBUFF: '💀', ESTADO_ALTERADO: '☠', ESPECIAL: '✦' }[skill.skillType] || '⚔';
              const schoolIcon = SCHOOL_ICONS[skill.damageSchool];
              const targetIcon = TARGET_ICONS[skill.targetType];
              return (
                <button key={skill.id} className="item-row" disabled={disabled} onClick={() => handleSkillClick(skill)}>
                  <span className="skill-row-main">
                    <span>{icon} {skill.name}</span>
                    <span className="skill-row-badges">
                      {schoolIcon && <span title={SCHOOL_LABELS[skill.damageSchool]}>{schoolIcon}</span>}
                      {targetIcon && <span title={TARGET_LABELS[skill.targetType]}>{targetIcon}</span>}
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

      {finished && (
        <div className="combat-result rpg-panel">
          <h2>
            {combatSession.status === 'PLAYER_WON' && '¡Heriste al Devorador de Estrellas!'}
            {combatSession.status === 'ESCAPED' && 'Escapaste del combate'}
            {combatSession.status === 'ENEMY_WON' && 'Tu formación cayó'}
          </h2>
          {combatSession.status === 'ESCAPED' ? (
            <p className="hint">Al huir no se contabilizó tu daño ni recibiste fragmentos cósmicos en este intento.</p>
          ) : (
            <p className="hint">Tu daño en este intento ya quedó sumado al HP global del jefe y a tus fragmentos cósmicos.</p>
          )}
          {rewards && (
            <>
              <p>+{rewards.xp} XP · +{rewards.gold} Oro</p>
              {rewards.itemsDropped?.length > 0 && (
                <p className="hint hint-ok">
                  Items: {rewards.itemsDropped.map((d) => `${d.itemName} x${d.quantity}`).join(', ')}
                </p>
              )}
              {(rewards.levelUps ?? []).map((l, i) => (
                <p key={i} className="hint hint-ok">
                  {l.npcId
                    ? `¡${l.npcName} subió a nivel ${l.newLevel}!`
                    : l.playerId === player?.id
                    ? `¡Subiste a nivel ${l.newLevel}! HP y maná restaurados.`
                    : `¡Tu compañero subió a nivel ${l.newLevel}!`}
                </p>
              ))}
            </>
          )}
          <button className="rpg-button" onClick={onReturnToLobby}>Volver a la sala</button>
        </div>
      )}
    </div>
  );
}
