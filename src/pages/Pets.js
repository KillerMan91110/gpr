import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const RARITY_LABEL = {
  COMUN: 'Común', POCO_COMUN: 'Poco común', RARO: 'Raro',
  EPICO: 'Épico', LEGENDARIO: 'Legendario',
};

function rarityClass(rarity) {
  return `rarity-${(rarity || 'comun').toLowerCase()}`;
}

const BONUS_LABEL = {
  ATK_FLAT: 'ATK', DEF_FLAT: 'DEF', MAG_FLAT: 'INT', MAGIC_DEF_FLAT: 'DEF MAG', SPD_FLAT: 'SPD',
  CRIT_CHANCE_FLAT: 'Crítico', CRIT_DMG_FLAT: 'Daño crítico', EVASION_FLAT: 'Evasión',
  HP_FLAT: 'HP', MANA_FLAT: 'Maná', LUCK_FLAT: 'Suerte',
  HEAL_BONUS_PERCENT: 'Bono de curación', HOT_HP_PERCENT: 'Regeneración HP/turno',
  GOLD_PERCENT: 'Oro', XP_PERCENT: 'XP', DROP_RATE_PERCENT: 'Tasa de drop',
  PHYSICAL_DAMAGE_PERCENT: 'Daño físico', MAGICAL_DAMAGE_PERCENT: 'Daño mágico',
  ELEMENTAL_DAMAGE_PERCENT: 'Daño elemental', DAMAGE_REDUCTION_PERCENT: 'Reducción de daño recibido',
  ELEMENTAL_RESISTANCE_PERCENT: 'Resistencia elemental', MANA_COST_REDUCTION_PERCENT: 'Reducción de costo de maná',
  ESCAPE_BONUS_FLAT: 'Bono de escape', GUILD_XP_PERCENT: 'XP de gremio',
  PASSIVE_REVIVE: 'Revive 1 vez por combate',
};

const BONUS_IS_PERCENT = new Set([
  'HEAL_BONUS_PERCENT', 'HOT_HP_PERCENT', 'GOLD_PERCENT', 'XP_PERCENT', 'DROP_RATE_PERCENT',
  'PHYSICAL_DAMAGE_PERCENT', 'MAGICAL_DAMAGE_PERCENT', 'ELEMENTAL_DAMAGE_PERCENT',
  'DAMAGE_REDUCTION_PERCENT', 'ELEMENTAL_RESISTANCE_PERCENT', 'MANA_COST_REDUCTION_PERCENT',
  'GUILD_XP_PERCENT',
]);

function formatBonus(bonus) {
  const label = BONUS_LABEL[bonus.stat_code] || bonus.stat_code;
  if (bonus.stat_code === 'PASSIVE_REVIVE') {
    return Number(bonus.value) >= 1 ? label : null;
  }
  const suffix = BONUS_IS_PERCENT.has(bonus.stat_code) ? '%' : '';
  const value = Math.round(Number(bonus.value) * 100) / 100;
  return `+${value}${suffix} ${label}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Pets() {
  const { player, token } = useAuth();
  const [pets, setPets] = useState(null);
  const [incubator, setIncubator] = useState(undefined); // undefined = no cargado, null = vacía
  const [inventory, setInventory] = useState(null);
  const [selectedEggId, setSelectedEggId] = useState('');
  const [feedTarget, setFeedTarget] = useState(null); // { playerPetId, itemId, quantity }
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hatchResult, setHatchResult] = useState(null);
  const hatchResultTimer = useRef(null);

  async function loadAll() {
    const [petsData, incubatorData, inventoryData] = await Promise.all([
      api.getPets(player.id, token),
      api.getIncubator(player.id, token),
      api.getPlayerInventory(player.id, token),
    ]);
    setPets(petsData);
    setIncubator(incubatorData);
    setInventory(inventoryData);
  }

  useEffect(() => {
    if (!player) return;
    loadAll().catch((err) => setError(err.message));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuenta regresiva del lado del cliente: hatch_ready_at es un timestamp fijo, no hace
  // falta pollear al back cada segundo, solo re-renderizar contra la hora actual.
  useEffect(() => {
    if (!incubator || incubator.ready) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [incubator]);

  useEffect(() => () => clearTimeout(hatchResultTimer.current), []);

  const eggItems = (inventory || []).filter((i) => i.code?.startsWith('HUEVO_'));
  const materialItems = (inventory || []).filter((i) => i.item_type === 'MATERIAL' && !i.code?.startsWith('HUEVO_'));
  const activePet = (pets || []).find((p) => p.is_active);
  const readyNow = incubator && (incubator.ready || new Date(incubator.hatch_ready_at).getTime() <= now);

  async function handleActivate(playerPetId) {
    setBusy(true);
    setError('');
    try {
      await api.activatePet(player.id, playerPetId, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(playerPetId) {
    setBusy(true);
    setError('');
    try {
      await api.deactivatePet(player.id, playerPetId, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFeed(playerPetId) {
    if (!feedTarget?.itemId) return;
    setBusy(true);
    setError('');
    try {
      await api.feedPet(player.id, playerPetId, feedTarget.itemId, feedTarget.quantity || 1, token);
      setFeedTarget(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleStartIncubation() {
    if (!selectedEggId) return;
    setBusy(true);
    setError('');
    try {
      await api.startIncubation(player.id, selectedEggId, token);
      setSelectedEggId('');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim() {
    setBusy(true);
    setError('');
    try {
      const pet = await api.claimIncubator(player.id, token);
      clearTimeout(hatchResultTimer.current);
      setHatchResult(pet);
      hatchResultTimer.current = setTimeout(() => setHatchResult(null), 8000);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!pets) return <div className="placeholder-page"><p>Cargando...</p></div>;

  return (
    <div className="dashboard">
      <h1>🐾 Mascotas</h1>
      {error && <p className="auth-error">{error}</p>}

      <section className="rpg-panel pets-section">
        <h2>Incubadora</h2>
        {incubator === null && (
          <div className="craft-row">
            <select
              className="rpg-input"
              value={selectedEggId}
              onChange={(e) => setSelectedEggId(e.target.value)}
            >
              <option value="">Elige un huevo...</option>
              {eggItems.map((egg) => (
                <option key={egg.item_id} value={egg.item_id}>
                  {egg.name} (x{egg.quantity})
                </option>
              ))}
            </select>
            <button className="rpg-button rpg-button--small" disabled={busy || !selectedEggId} onClick={handleStartIncubation}>
              Incubar
            </button>
          </div>
        )}
        {incubator && !readyNow && (
          <p className="hint">
            Incubando <strong>{incubator.egg_name}</strong> ({RARITY_LABEL[incubator.egg_rarity]}) —
            listo en {formatCountdown(new Date(incubator.hatch_ready_at).getTime() - now)}
          </p>
        )}
        {incubator && readyNow && (
          <div className="craft-row">
            <p className="hint hint-ok">¡{incubator.egg_name} está listo para eclosionar!</p>
            <button className="rpg-button rpg-button--small" disabled={busy} onClick={handleClaim}>
              Reclamar
            </button>
          </div>
        )}
        {incubator === null && eggItems.length === 0 && (
          <p className="hint">No tienes huevos en el inventario todavía.</p>
        )}
      </section>

      <section className="rpg-panel pets-section">
        <h2>Mascota activa</h2>
        {activePet ? (
          <p className="hint hint-ok">
            {activePet.name} · Nv. {activePet.level} ({RARITY_LABEL[activePet.rarity]})
          </p>
        ) : (
          <p className="hint">No tienes ninguna mascota activa.</p>
        )}
      </section>

      <section className="inventory-group">
        <h2>Colección</h2>
        {pets.length === 0 && <p className="hint">Todavía no tienes mascotas. ¡Incuba un huevo!</p>}
        <div className="item-grid">
          {pets.map((pet) => (
            <div key={pet.id} className={`rpg-panel inventory-item ${rarityClass(pet.rarity)}`}>
              <div className="inventory-item-header">
                <span className="inventory-item-name">
                  {pet.name}
                  {pet.is_active && <span className="equipped-tag">✓ Activa</span>}
                </span>
              </div>
              <span className="inventory-item-rarity">{RARITY_LABEL[pet.rarity]}</span>
              <p className="hint">Nv. {pet.level} · Vínculo {pet.bond_points}/100</p>
              {pet.description && <p className="hint">{pet.description}</p>}

              {(pet.bonuses || []).length > 0 && (
                <div className="pet-bonus-list">
                  {pet.bonuses.map((b) => {
                    const text = formatBonus(b);
                    return text ? <span key={b.stat_code} className="pet-bonus-tag">{text}</span> : null;
                  })}
                </div>
              )}

              <div className="craft-row">
                {pet.is_active ? (
                  <button className="rpg-button rpg-button--small" disabled={busy} onClick={() => handleDeactivate(pet.id)}>
                    Desactivar
                  </button>
                ) : (
                  <button className="rpg-button rpg-button--small" disabled={busy} onClick={() => handleActivate(pet.id)}>
                    Activar
                  </button>
                )}
              </div>

              {feedTarget?.playerPetId === pet.id ? (
                <div className="craft-row">
                  <select
                    className="rpg-input"
                    value={feedTarget.itemId}
                    onChange={(e) => setFeedTarget({ ...feedTarget, itemId: e.target.value })}
                  >
                    <option value="">Elige un material...</option>
                    {materialItems.map((m) => (
                      <option key={m.item_id} value={m.item_id}>{m.name} (x{m.quantity})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="rpg-input"
                    min={1}
                    value={feedTarget.quantity}
                    onChange={(e) => setFeedTarget({ ...feedTarget, quantity: Math.max(1, Number(e.target.value)) })}
                    style={{ width: 60 }}
                  />
                  <button className="rpg-button rpg-button--small" disabled={busy || !feedTarget.itemId} onClick={() => handleFeed(pet.id)}>
                    Confirmar
                  </button>
                  <button className="rpg-button rpg-button--small" disabled={busy} onClick={() => setFeedTarget(null)}>
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  className="rpg-button rpg-button--small"
                  disabled={busy}
                  onClick={() => setFeedTarget({ playerPetId: pet.id, itemId: '', quantity: 1 })}
                >
                  Alimentar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {hatchResult && (
        <div className="craft-result-popup rpg-panel">
          <button
            className="craft-result-close"
            onClick={() => { clearTimeout(hatchResultTimer.current); setHatchResult(null); }}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h4 className="craft-result-title">🎉 ¡Nueva mascota!</h4>
          <p className="hint">
            Eclosionó <strong>{hatchResult.name}</strong> ({RARITY_LABEL[hatchResult.rarity]})
          </p>
        </div>
      )}
    </div>
  );
}
