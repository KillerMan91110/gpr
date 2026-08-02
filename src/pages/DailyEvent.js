import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  CombatantCard, TurnOrderBar, useCombatFloaters, classifyLogEntry,
  SCHOOL_ICONS, SCHOOL_LABELS, TARGET_ICONS, TARGET_LABELS, SKILL_TYPE_ICONS, describeSkillEffect,
  RARITY_COLOR, RARITY_GLOW, MUTATION_INFO,
} from './ExploreZone';
import { setActiveCombat, clearActiveCombat } from '../utils/activeCombat';
import GameIcon from '../components/GameIcon';

const LOG_REVEAL_DELAY_MS = 650;
// Solo estos 3 tiers son válidos para forced_rarity (docs/backend-spec-evento-del-dia.md) — no
// hace falta el resto de ENCOUNTER_RARITY_LABEL de El Abismo (que incluye POCO_COMUN/RARO).
const RARITY_LABEL = { ELITE: 'Élite', MINI_JEFE: 'Mini Jefe', JEFE: 'Jefe' };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function actorBelongsToPlayer(actor, playerId) {
  if (!actor) return false;
  if (actor.player_id != null) return actor.player_id === playerId;
  if (actor.owner_player_id != null) return actor.owner_player_id === playerId;
  return true;
}

export default function DailyEvent() {
  const { player, token } = useAuth();

  const [event, setEvent] = useState(undefined); // undefined = cargando
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  async function refreshEvent() {
    const data = await api.getDailyEvent(player.id, token);
    setEvent(data);
    return data;
  }

  useEffect(() => {
    if (!player) return;
    refreshEvent().catch(() => setEvent(null));
    // Retoma un intento del Evento del Día en curso si recargaste la página a mitad de combate.
    api.getActiveCombatSession(token).then((state) => {
      if (state?.session?.daily_event_code) setSession(state);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, token]);

  const inCombat = !!session && session.session.status === 'IN_PROGRESS';

  useEffect(() => {
    if (inCombat) setActiveCombat('/daily-event', session, null);
    else clearActiveCombat();
  }, [inCombat, session]);

  useEffect(() => {
    if (!inCombat) return undefined;
    function handleBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inCombat]);

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
    try {
      const state = await api.sendCombatAction(session.session.id, { participantId: actor.id, action, ...options }, token);
      await revealSession(state);
      if (action === 'USE_ITEM') await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnter() {
    setError('');
    setLoading(true);
    try {
      const state = await api.enterDailyEvent(player.id, token);
      setSession(state);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnToLobby() {
    setSession(null);
    try { await refreshEvent(); } catch (err) { setError(err.message); }
  }

  if (event === undefined) {
    return <div className="dashboard"><p>Cargando...</p></div>;
  }
  if (event === null) {
    return (
      <div className="placeholder-page">
        <h1><GameIcon name="magic-portal" artist="lorc" /> Evento del Día</h1>
        <p>No se pudo cargar el Evento del Día. Probá de nuevo más tarde.</p>
        <Link to="/combat">Volver a zonas</Link>
      </div>
    );
  }

  if (inCombat || (session && session.session.status !== 'IN_PROGRESS')) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div><h1><GameIcon name="magic-portal" artist="lorc" /> {event.name}</h1></div>
        </header>
        {error && (
          <div className="modal-overlay" onClick={() => setError('')}>
            <div className="modal-panel rpg-panel" onClick={(e) => e.stopPropagation()}>
              <button className="craft-result-close" onClick={() => setError('')} aria-label="Cerrar">×</button>
              <h3>⚠️ No se pudo continuar</h3>
              <p>{error}</p>
            </div>
          </div>
        )}
        <DailyEventCombatView
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
          onReturnToLobby={handleReturnToLobby}
        />
      </div>
    );
  }

  const tierKey = event.forcedRarity.toLowerCase();
  const mutation = event.forcedMutation ? MUTATION_INFO[event.forcedMutation] : null;
  const attemptsLeft = Math.max(0, event.attemptsMax - event.attemptsUsed);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="magic-portal" artist="lorc" /> Evento del Día</h1>
          <p className="dashboard-subtitle">Un encuentro especial, igual para todos hoy. Mañana cambia.</p>
        </div>
        <Link className="logout-btn" to="/combat">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}

      <div
        className="rpg-panel daily-event-card"
        style={{ '--event-color': RARITY_COLOR[tierKey], '--event-glow': RARITY_GLOW[tierKey] }}
      >
        <div className="daily-event-card-header">
          <h2>{event.name}</h2>
          <span className="daily-event-tier-badge">{RARITY_LABEL[event.forcedRarity] || event.forcedRarity}</span>
        </div>

        {event.flavorText && <p className="daily-event-flavor">{event.flavorText}</p>}

        {mutation && (
          <p className="daily-event-mutation">
            <GameIcon {...mutation.icon} /> {mutation.desc}
          </p>
        )}

        <div className="daily-event-rewards">
          <p className="daily-event-rewards-title">Recompensa de hoy (a tu nivel actual)</p>
          <div className="daily-event-rewards-row">
            <span className="daily-event-reward-chip">
              <GameIcon name="thunder-struck" artist="lorc" /> {event.previewXp.toLocaleString()} XP
            </span>
            <span className="daily-event-reward-chip">
              <GameIcon name="two-coins" artist="delapouite" /> {event.previewGold.toLocaleString()} Oro
            </span>
            <span className="daily-event-reward-chip">
              <GameIcon name="gem-necklace" artist="lorc" /> {event.dungeonCoinsReward.toLocaleString()} Monedas del Abismo
            </span>
            {event.bonusMaterial && (
              <span className="daily-event-reward-chip">
                <GameIcon name="present" artist="delapouite" /> {event.bonusMaterial.chancePercent}% de {event.bonusMaterial.itemName} x{event.bonusMaterial.quantity}
              </span>
            )}
          </div>
        </div>

        <div className="daily-event-attempts">
          <GameIcon name="ticket" artist="delapouite" />
          <div className="daily-event-attempts-pips">
            {Array.from({ length: event.attemptsMax }).map((_, i) => (
              <span key={i} className={`daily-event-pip${i < event.attemptsUsed ? ' daily-event-pip--used' : ''}`} />
            ))}
          </div>
          <span className="daily-event-attempts-label">{attemptsLeft}/{event.attemptsMax} entradas hoy</span>
        </div>

        <button
          className="rpg-button daily-event-enter"
          disabled={loading || !event.canEnter}
          onClick={handleEnter}
        >
          {loading ? 'Entrando...' : event.canEnter ? 'Entrar' : 'Sin entradas por hoy'}
        </button>
      </div>
    </div>
  );
}

function DailyEventCombatView({
  session, player, loading, inventory, itemEffects, skills, npcSkillsCache,
  onLoadInventory, onLoadSkills, onLoadNpcSkills, onAction, onReturnToLobby,
}) {
  const { session: combatSession, participants, log, nextActorId, round, rewards } = session;
  const players = participants.filter((p) => p.side === 'PLAYER');
  const enemies = participants.filter((p) => p.side === 'ENEMY');
  const actor = participants.find((p) => p.id === nextActorId);
  const hasActiveTurn = combatSession.status === 'IN_PROGRESS' && !!nextActorId;
  const isPlayerTurn = hasActiveTurn && actorBelongsToPlayer(actor, player?.id);
  const finished = combatSession.status !== 'IN_PROGRESS';
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [pendingSkill, setPendingSkill] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [logAtBottom, setLogAtBottom] = useState(true);
  const logRef = useRef(null);
  const { floaters, shakeIds } = useCombatFloaters(log, participants);

  const selectingAlly = pendingSkill?.targetType === 'ALLY' || !!pendingItem;
  const selectingEnemy = !pendingItem && (!pendingSkill || pendingSkill.targetType === 'ENEMY');
  const pendingItemIsRevive = !!pendingItem
    && (itemEffects[pendingItem.item_id] || []).some((b) => b.stat_code === 'REVIVE_HP_PERCENT');

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
      <TurnOrderBar participants={participants} nextActorId={nextActorId} />

      <div className="rpg-panel worldboss-arena daily-event-arena">
        <span className="worldboss-arena-icon"><GameIcon name="magic-portal" artist="lorc" /></span>
        <div className="worldboss-arena-body">
          {enemies.map((p) => (
            <CombatantCard
              key={p.id}
              participant={p}
              level={null}
              isActive={p.id === nextActorId}
              targetable={isPlayerTurn && selectingEnemy && p.hp > 0}
              onTarget={() => handleEnemyTarget(p.id)}
              floaters={floaters.filter((f) => f.participantId === p.id)}
              shaking={shakeIds.has(p.id)}
            />
          ))}
        </div>
      </div>

      <div className="rpg-panel worldboss-formation">
        <h3>Tu formación</h3>
        <div className="worldboss-formation-cards">
          {players.map((p) => (
            <CombatantCard
              key={p.id}
              participant={p}
              level={p.player_id ? p.level : null}
              isActive={p.id === nextActorId}
              allyTargetable={isPlayerTurn && selectingAlly && (pendingItemIsRevive ? p.hp <= 0 : p.hp > 0)}
              onTarget={() => handleAllyTarget(p.id)}
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
              ? (pendingItemIsRevive ? `Elige a quién revivir con ${pendingItem.name}.` : `Elige a quién darle ${pendingItem.name}.`)
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
                Escapar
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

      {finished && (
        <div className="combat-result rpg-panel">
          <h2>
            {combatSession.status === 'PLAYER_WON' && '¡Victoria!'}
            {combatSession.status === 'ESCAPED' && 'Escapaste del combate'}
            {combatSession.status === 'ENEMY_WON' && 'Tu formación cayó'}
          </h2>
          {rewards && (
            <>
              <p>
                +{rewards.xp} XP · +{rewards.gold} Oro
                {rewards.dungeonCoins > 0 && ` · +${rewards.dungeonCoins} Monedas del Abismo`}
              </p>
              {rewards.itemsDropped?.length > 0 && (
                <p className="hint hint-ok">
                  Items: {rewards.itemsDropped.map((d) => `${d.itemName} x${d.quantity}`).join(', ')}
                </p>
              )}
              {rewards.bonusMaterial && (
                <p className="hint hint-ok daily-event-bonus-line">
                  <GameIcon name="ticket" artist="delapouite" /> Bono del evento: {rewards.bonusMaterial.itemName} x{rewards.bonusMaterial.quantity}
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
          <button className="rpg-button" onClick={onReturnToLobby}>Volver</button>
        </div>
      )}
    </div>
  );
}
