import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CLASS_ICON = {
  GUERRERO: '⚔', Guerrero: '⚔',
  MAGO: '✦', Mago: '✦',
  ARQUERO: '🏹', Arquero: '🏹',
  PICARO: '🗡', PÍCARO: '🗡', Pícaro: '🗡',
  SACERDOTE: '✙', Sacerdote: '✙',
};

const NPC_STATS = [
  { label: 'HP',   key: 'hp' },
  { label: 'MP',   key: 'mana' },
  { label: 'ATK',  key: 'atk' },
  { label: 'DEF',  key: 'def' },
  { label: 'INT',  key: 'int' },
  { label: 'MDEF', key: 'magicDef' },
  { label: 'SPD',  key: 'spd' },
  { label: 'CRIT',     key: 'crit',       suffix: '%' },
  { label: 'CRIT DMG', key: 'critDamage', suffix: '%' },
  { label: 'EVASIÓN',  key: 'evasion',    suffix: '%' },
];

function NpcMiniStats({ member }) {
  return (
    <div className="npc-stats-grid">
      {NPC_STATS.map(({ label, key, suffix }) => (
        <div key={key} className="npc-stat">
          <span className="npc-stat-label">{label}</span>
          <span className="npc-stat-value">
            {member[key] != null ? `${member[key]}${suffix || ''}` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Formation() {
  const { player, token } = useAuth();
  const [party, setParty] = useState(null);
  const [bench, setBench] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [swapSource, setSwapSource] = useState(null); // { partyRowId, slot, name }

  function showMsg(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(null), 3500);
  }

  const loadAll = useCallback(async () => {
    try {
      const [partyData, benchData] = await Promise.all([
        api.getParty(player.id, token),
        api.getBench(player.id, token),
      ]);
      setParty(partyData);
      setBench(benchData);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [player, token]);

  useEffect(() => { if (player) loadAll(); }, [player, loadAll]);

  async function act(fn) {
    if (busy) return;
    setBusy(true);
    try {
      const data = await fn();
      setSwapSource(null);
      await loadAll();
      if (data?.message) showMsg(data.message);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  function handleSwapSlots() {
    act(() => api.swapPartySlots(player.id, 2, 3, token));
  }

  function handleSwapBench(benchRowId) {
    act(() => api.swapPartyBench(player.id, swapSource.partyRowId, benchRowId, token));
  }

  function handleAddToParty(benchRowId) {
    act(() => api.addBenchToParty(player.id, benchRowId, token));
  }

  function handleFireBench(benchRowId, name) {
    if (!window.confirm(`¿Despedir a ${name}? Esta acción es permanente.`)) return;
    act(() => api.fireBenchNpc(player.id, benchRowId, token));
  }

  function handleFireParty(partyRowId, name) {
    if (!window.confirm(`¿Despedir a ${name}? Esta acción es permanente y lo elimina del juego.`)) return;
    act(() => api.firePartyNpc(player.id, partyRowId, token));
  }

  if (loading) return <div className="dashboard-loading">Cargando formación...</div>;

  const hero = party?.members?.find((m) => m.isHero);
  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];
  const slot2 = partyNpcs.find((n) => n.slot === 2);
  const slot3 = partyNpcs.find((n) => n.slot === 3);
  const benchMembers = bench?.members || [];
  const hasEmptySlot = partyNpcs.length < 2;
  const hasBothSlots = partyNpcs.length === 2;
  const isSelectingSwap = !!swapSource;

  function PartyNpcCard({ member, slot }) {
    return (
      <div className="formation-member">
        <div className="npc-card-header">
          <span className="npc-class-icon">{CLASS_ICON[member.className] || '⚔'}</span>
          <div className="npc-header-info">
            <h3 className="npc-name">{member.name}</h3>
            <span className="hero-class-role">{member.className} · Niv. {member.level}</span>
          </div>
          <span className="formation-slot-badge">Slot {slot}</span>
        </div>
        <NpcMiniStats member={member} />
        {!isSelectingSwap && (
          <div className="formation-actions">
            {benchMembers.length > 0 && (
              <button
                className="logout-btn formation-action-btn"
                onClick={() => setSwapSource({ partyRowId: member.partyRowId, slot, name: member.name })}
                disabled={busy}
              >
                🔄 Intercambiar
              </button>
            )}
            <button
              className="logout-btn formation-fire-btn"
              onClick={() => handleFireParty(member.partyRowId, member.name)}
              disabled={busy}
            >
              Despedir
            </button>
          </div>
        )}
      </div>
    );
  }

  function EmptySlotCard({ slot }) {
    return (
      <div className="formation-member formation-member--empty">
        <span className="formation-slot-badge">Slot {slot}</span>
        <p className="formation-empty-label">Vacío</p>
        <Link to="/guild/adventurers" className="logout-btn">Contratar</Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>⚔ Formación — Mi Grupo</h1>
          <p className="dashboard-subtitle">Gestiona tu equipo de aventureros</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {msg && (
        <div className={`rpg-panel dash-panel npc-msg${msg.isError ? ' npc-msg--error' : ' npc-msg--ok'}`}>
          {msg.text}
        </div>
      )}

      {isSelectingSwap && (
        <div className="rpg-panel dash-panel formation-hint">
          <span>
            Intercambiando <strong>{swapSource.name}</strong> (Slot {swapSource.slot}) — elige un miembro del banco
          </span>
          <button className="logout-btn" onClick={() => setSwapSource(null)}>Cancelar</button>
        </div>
      )}

      {/* ── Grupo Activo ── */}
      <div className="rpg-panel dash-panel">
        <div className="formation-panel-header">
          <p className="panel-title">Grupo Activo</p>
          {hasBothSlots && !isSelectingSwap && (
            <button className="logout-btn formation-swap-all" onClick={handleSwapSlots} disabled={busy}>
              ↕ Slot 2 ↔ Slot 3
            </button>
          )}
        </div>

        <div className="formation-party">
          {hero && (
            <div className="formation-member formation-member--hero">
              <div className="npc-card-header">
                <span className="npc-class-icon">★</span>
                <div className="npc-header-info">
                  <h3 className="npc-name">{hero.name}</h3>
                  <span className="hero-class-role">{hero.className} · Niv. {hero.level}</span>
                </div>
                <span className="formation-slot-badge">Slot 1 · Héroe</span>
              </div>
              <NpcMiniStats member={hero} />
            </div>
          )}

          {slot2 ? <PartyNpcCard member={slot2} slot={2} /> : <EmptySlotCard slot={2} />}
          {slot3 ? <PartyNpcCard member={slot3} slot={3} /> : <EmptySlotCard slot={3} />}
        </div>
      </div>

      {/* ── Banco de Reserva ── */}
      <div className="rpg-panel dash-panel">
        <p className="panel-title">Banco de Reserva ({benchMembers.length}/{bench?.cap || 10})</p>

        {benchMembers.length === 0 ? (
          <p className="formation-empty-label">
            No tienes aventureros en reserva.{' '}
            <Link to="/guild/adventurers" style={{ color: 'var(--gold-bright)' }}>Contratar más</Link>
          </p>
        ) : (
          <div className="bench-list">
            {benchMembers.map((npc) => (
              <div
                key={npc.benchRowId}
                className={`formation-bench-member${isSelectingSwap ? ' formation-bench-member--target' : ''}`}
              >
                <div className="npc-card-header">
                  <span className="npc-class-icon">{CLASS_ICON[npc.className] || '⚔'}</span>
                  <div className="npc-header-info">
                    <h3 className="npc-name">{npc.name}</h3>
                    <span className="hero-class-role">{npc.className} · Niv. {npc.level}</span>
                  </div>
                </div>
                <NpcMiniStats member={npc} />
                <div className="formation-actions">
                  {isSelectingSwap ? (
                    <button
                      className="logout-btn formation-action-btn formation-action-btn--highlight"
                      onClick={() => handleSwapBench(npc.benchRowId)}
                      disabled={busy}
                    >
                      ↑ Poner en Slot {swapSource.slot}
                    </button>
                  ) : hasEmptySlot ? (
                    <button
                      className="logout-btn formation-action-btn"
                      onClick={() => handleAddToParty(npc.benchRowId)}
                      disabled={busy}
                    >
                      ↑ Subir al grupo
                    </button>
                  ) : null}
                  {!isSelectingSwap && (
                    <button
                      className="logout-btn formation-fire-btn"
                      onClick={() => handleFireBench(npc.benchRowId, npc.name)}
                      disabled={busy}
                    >
                      Despedir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
