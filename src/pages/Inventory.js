import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const SLOT_LABELS = {
  WEAPON: 'Arma',
  OFFHAND: 'Mano Secundaria',
  HELMET: 'Casco',
  ARMOR: 'Armadura',
  GLOVES: 'Guantes',
  BOOTS: 'Botas',
  ACCESSORY: 'Accesorio',
};

const RARITY_LABELS = {
  COMUN: 'Común',
  POCO_COMUN: 'Poco Común',
  RARO: 'Raro',
  EPICO: 'Épico',
  LEGENDARIO: 'Legendario',
};

const TYPE_LABELS = {
  EQUIPMENT: 'Equipo',
  CONSUMABLE: 'Consumibles',
  MATERIAL: 'Materiales',
};

const TYPE_ORDER = ['EQUIPMENT', 'CONSUMABLE', 'MATERIAL'];
const RARITY_ORDER = ['COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO'];

const STAT_LABELS = {
  ATK: 'ATK',
  DEF: 'DEF',
  MAG: 'INT',
  MAGIC_DEF: 'DEF MAG',
  SPD: 'SPD',
  CRIT_CHANCE: 'CRIT',
  CRIT_DAMAGE: 'CRIT DMG',
  EVASION: 'Evasión',
  HP: 'HP',
  LUCK: 'Suerte',
};

// Mismo criterio que lib/equipment.js del back (QUALITY_TIER_MULTIPLIER) para poder
// calcular en el front el valor efectivo de cada stat y compararlo contra lo equipado.
const QUALITY_TIER_MULTIPLIER = [1.0, 1.15, 1.35, 1.60, 2.0];

const SLOT_ICONS = {
  WEAPON: '⚔️', OFFHAND: '🛡️', HELMET: '⛑️', ARMOR: '👕',
  GLOVES: '🧤', BOOTS: '👢', ACCESSORY: '💍',
};
const TYPE_ICONS = { EQUIPMENT: '⚔️', CONSUMABLE: '🧪', MATERIAL: '🪵' };

function itemIcon(item) {
  if (item.item_type === 'EQUIPMENT') return SLOT_ICONS[item.slot] || '⚙️';
  return TYPE_ICONS[item.item_type] || '❔';
}

function rarityClass(rarity) {
  return `rarity-${(rarity || 'comun').toLowerCase()}`;
}

function EnchantBadge({ level }) {
  if (!level) return null;
  return <span className="enchant-badge">+{level}</span>;
}

function LuckBadge({ tier }) {
  if (!tier) return null;
  return <span className="luck-badge" title="Salió de mejor rareza por suerte">✦ Suerte</span>;
}

function EquippedTag() {
  return <span className="equipped-tag">✓ Equipado</span>;
}

function EquippedCountNote({ count }) {
  if (!count) return null;
  return <span className="inventory-item-equipped-note">+{count} equipado{count > 1 ? 's' : ''}</span>;
}

// Suma los bonos crudos de un item aplicando el mismo multiplicador de encantamiento/tier
// que usa el back al calcular stats de combate, agrupados por stat_code.
function effectiveBonusMap(bonuses, enchantLevel = 0, qualityTier = 0) {
  const enchantMult = 1 + (enchantLevel || 0) * 0.05;
  const qualityMult = QUALITY_TIER_MULTIPLIER[qualityTier || 0] ?? 1;
  const map = {};
  (bonuses || []).forEach((b) => {
    const value = Math.round(Number(b.amount) * enchantMult * qualityMult);
    const prev = map[b.stat_code];
    map[b.stat_code] = { value: (prev?.value || 0) + value, isPercent: b.is_percent };
  });
  return map;
}

function StatTooltip({ bonuses, enchantLevel = 0, qualityTier = 0, compareTo }) {
  const own = effectiveBonusMap(bonuses, enchantLevel, qualityTier);
  const statCodes = [...new Set([...Object.keys(own), ...Object.keys(compareTo || {})])];
  if (!statCodes.length) return null;
  return (
    <div className="item-tooltip">
      {statCodes.map((code) => {
        const o = own[code] || { value: 0, isPercent: compareTo?.[code]?.isPercent };
        const other = compareTo?.[code];
        const diff = compareTo ? o.value - (other?.value || 0) : null;
        return (
          <div key={code} className="item-tooltip-line">
            {o.value}{o.isPercent ? '%' : ''} {STAT_LABELS[code] || code}
            {!!diff && (
              <span className={diff > 0 ? 'stat-diff-up' : 'stat-diff-down'}>
                {' '}({diff > 0 ? '+' : ''}{diff}{o.isPercent ? '%' : ''} vs equipado)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Inventory() {
  const { player, token } = useAuth();
  const [equipment, setEquipment] = useState(null);
  const [items, setItems] = useState(null);
  const [party, setParty] = useState(null);
  const [npcEquipments, setNpcEquipments] = useState({});
  const [activeMember, setActiveMember] = useState(0); // 0=hero, 1=slot2, 2=slot3
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [statBonuses, setStatBonuses] = useState({});
  const [recipeResult, setRecipeResult] = useState(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');
  const recipeResultTimer = useRef(null);
  const fetchedStatIds = useRef(new Set());

  useEffect(() => () => clearTimeout(recipeResultTimer.current), []);

  const ensureStatBonuses = useCallback(async (ids) => {
    const toFetch = [...new Set(ids)].filter((id) => id != null && !fetchedStatIds.current.has(id));
    if (!toFetch.length) return;
    toFetch.forEach((id) => fetchedStatIds.current.add(id));
    const fetched = await Promise.all(
      toFetch.map((id) => api.getItem(id, token).catch(() => null))
    );
    setStatBonuses((prev) => {
      const next = { ...prev };
      toFetch.forEach((id, i) => { next[id] = fetched[i]?.statBonuses || []; });
      return next;
    });
  }, [token]);

  const loadNpcEquipments = useCallback(async (npcs) => {
    if (!npcs.length) return;
    const results = await Promise.all(
      npcs.map((n) =>
        api.getNpcEquipment(player.id, n.npcId, token)
          .then((d) => ({ npcId: n.npcId, slots: d.slots }))
          .catch(() => ({ npcId: n.npcId, slots: [] }))
      )
    );
    const map = {};
    results.forEach(({ npcId, slots }) => { map[npcId] = slots; });
    setNpcEquipments(map);
    ensureStatBonuses(results.flatMap(({ slots }) => slots.filter((s) => s.item).map((s) => s.item.itemId)));
  }, [player, token, ensureStatBonuses]);

  const loadAll = useCallback(async () => {
    const [eq, inv, partyData] = await Promise.all([
      api.getPlayerEquipment(player.id, token),
      api.getPlayerInventory(player.id, token),
      api.getParty(player.id, token),
    ]);
    setEquipment(eq);
    setItems(inv);
    ensureStatBonuses([
      ...inv.filter((i) => i.item_type === 'EQUIPMENT').map((i) => i.item_id),
      ...eq.filter((s) => s.item).map((s) => s.item.itemId),
    ]);
    setParty(partyData);
    const partyNpcs = partyData.members?.filter((m) => !m.isHero) || [];
    await loadNpcEquipments(partyNpcs);
  }, [player, token, loadNpcEquipments, ensureStatBonuses]);

  useEffect(() => {
    if (!player) return;
    loadAll().catch((err) => setError(err.message));
  }, [player, loadAll]);

  async function handleUseItem(itemId) {
    setError('');
    setMessage('');
    setBusyId(`use-${itemId}`);
    try {
      const res = await api.useItem(player.id, itemId, token);
      setMessage(res.message);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUseScroll(itemId) {
    setError('');
    setBusyId(`scroll-${itemId}`);
    try {
      const res = await api.useRecipeScroll(player.id, itemId, token);
      clearTimeout(recipeResultTimer.current);
      setRecipeResult(res);
      recipeResultTimer.current = setTimeout(() => setRecipeResult(null), 7000);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(itemId, enchantLevel = 0, qualityTier = 0) {
    setError('');
    setBusyId(`${itemId}-${enchantLevel}-${qualityTier}`);
    try {
      await api.equipItem(player.id, itemId, enchantLevel, qualityTier, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnequip(slot) {
    setError('');
    setBusyId(slot);
    try {
      await api.unequipItem(player.id, slot, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquipNpc(npcId, itemId, enchantLevel = 0, qualityTier = 0) {
    setError('');
    setBusyId(`ne-${npcId}-${itemId}-${enchantLevel}-${qualityTier}`);
    try {
      await api.equipNpcItem(player.id, npcId, itemId, enchantLevel, qualityTier, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnequipNpc(npcId, slot) {
    setError('');
    setBusyId(`nu-${npcId}-${slot}`);
    try {
      await api.unequipNpcItem(player.id, npcId, slot, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !items) return <div className="dashboard-error">Error: {error}</div>;
  if (!equipment || !items) return <div className="dashboard-loading">Cargando inventario...</div>;

  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];
  const slot2Npc = partyNpcs.find((n) => n.slot === 2) || null;
  const slot3Npc = partyNpcs.find((n) => n.slot === 3) || null;
  const activeNpc = activeMember === 1 ? slot2Npc : activeMember === 2 ? slot3Npc : null;

  const activeSlots = activeNpc
    ? (npcEquipments[activeNpc.npcId] || [])
    : equipment;

  function handleEquipActive(itemId, enchantLevel, qualityTier) {
    if (activeNpc) handleEquipNpc(activeNpc.npcId, itemId, enchantLevel, qualityTier);
    else handleEquip(itemId, enchantLevel, qualityTier);
  }

  function handleUnequipActive(slot) {
    if (activeNpc) handleUnequipNpc(activeNpc.npcId, slot);
    else handleUnequip(slot);
  }

  const searchLower = search.trim().toLowerCase();
  const filteredItems = items.filter((i) => {
    if (searchLower && !i.name.toLowerCase().includes(searchLower)) return false;
    if (rarityFilter !== 'ALL' && (i.effective_rarity || i.rarity) !== rarityFilter) return false;
    return true;
  });

  function sortItems(list) {
    if (sortBy === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'level') return [...list].sort((a, b) => (b.required_level || 0) - (a.required_level || 0));
    if (sortBy === 'rarity') {
      return [...list].sort((a, b) => {
        const ra = RARITY_ORDER.indexOf(a.effective_rarity || a.rarity);
        const rb = RARITY_ORDER.indexOf(b.effective_rarity || b.rarity);
        return rb - ra;
      });
    }
    return list;
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: sortItems(filteredItems.filter((i) => i.item_type === type)),
  })).filter((g) => g.items.length > 0);

  // Cuenta cuántas copias de cada (item, encantamiento, tier) están equipadas ahora mismo,
  // sumando héroe + todos los NPCs cargados (no solo el que está activo en el switcher).
  const equippedCounts = {};
  const bumpEquippedCount = (slotItem) => {
    if (!slotItem) return;
    const key = `${slotItem.itemId}-${slotItem.enchantLevel || 0}-${slotItem.qualityTier || 0}`;
    equippedCounts[key] = (equippedCounts[key] || 0) + 1;
  };
  equipment.forEach((s) => bumpEquippedCount(s.item));
  Object.values(npcEquipments).forEach((slots) => slots.forEach((s) => bumpEquippedCount(s.item)));

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🎒 Inventario</h1>
          <p className="dashboard-subtitle">Equipo y objetos de tu personaje</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      {/* ── Panel de equipo con switcher ── */}
      <div className="hero-section">
        <section className="rpg-panel equipment-panel" style={{ flex: 1, marginBottom: 0 }}>
          <h2>{activeNpc ? `Equipo — ${activeNpc.name}` : `Equipo — ${player.nickname}`}</h2>
          <div className="equipment-grid">
            {activeSlots.map((slotData) => (
              <div key={slotData.slot} className="equipment-slot">
                <span className="equipment-slot-label">{SLOT_ICONS[slotData.slot] || ''} {SLOT_LABELS[slotData.slot]}</span>
                {slotData.item ? (
                  <>
                    <span className={`equipment-item-name ${rarityClass(slotData.item.effectiveRarity || slotData.item.rarity)}`}>
                      {slotData.item.name}
                      {slotData.item.enchantLevel > 0 && (
                        <EnchantBadge level={slotData.item.enchantLevel} />
                      )}
                      <LuckBadge tier={slotData.item.qualityTier} />
                      <StatTooltip
                        bonuses={statBonuses[slotData.item.itemId]}
                        enchantLevel={slotData.item.enchantLevel}
                        qualityTier={slotData.item.qualityTier}
                      />
                    </span>
                    <span className="inventory-item-rarity">
                      {RARITY_LABELS[slotData.item.effectiveRarity || slotData.item.rarity] || slotData.item.rarity}
                    </span>
                    <EquippedTag />
                    <button
                      className="rpg-button equipment-action"
                      disabled={!!busyId}
                      onClick={() => handleUnequipActive(slotData.slot)}
                    >
                      Quitar
                    </button>
                  </>
                ) : (
                  <span className="equipment-empty">Vacío</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="hero-switcher">
          <button
            className={`switcher-btn${activeMember === 0 ? ' switcher-btn--active' : ''}`}
            onClick={() => setActiveMember(0)}
          >
            {player.nickname}
          </button>
          <button
            className={`switcher-btn${activeMember === 1 ? ' switcher-btn--active' : ''}`}
            onClick={() => setActiveMember(1)}
            disabled={!slot2Npc}
          >
            {slot2Npc ? slot2Npc.name : 'Slot 2'}
          </button>
          <button
            className={`switcher-btn${activeMember === 2 ? ' switcher-btn--active' : ''}`}
            onClick={() => setActiveMember(2)}
            disabled={!slot3Npc}
          >
            {slot3Npc ? slot3Npc.name : 'Slot 3'}
          </button>
        </div>
      </div>

      <div className="craft-filter-bar">
        <input
          type="text"
          className="rpg-input"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <select className="rpg-input" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="ALL">Todas las rarezas</option>
          {RARITY_ORDER.map((r) => (
            <option key={r} value={r}>{RARITY_LABELS[r]}</option>
          ))}
        </select>
        <select className="rpg-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="default">Orden por defecto</option>
          <option value="rarity">Ordenar por rareza</option>
          <option value="level">Ordenar por nivel</option>
          <option value="name">Ordenar por nombre</option>
        </select>
      </div>

      {items.length === 0 && <p className="dashboard-subtitle">No tienes items todavía.</p>}
      {items.length > 0 && grouped.length === 0 && (
        <p className="dashboard-subtitle">Ningún item coincide con ese filtro.</p>
      )}

      {grouped.map(({ type, items: groupItems }) => (
        <section key={type} className="inventory-group">
          <h2>{TYPE_ICONS[type] || ''} {TYPE_LABELS[type]}</h2>
          <div className="item-grid">
            {groupItems.map((item) => {
              const enchantLevel = item.enchant_level ?? 0;
              const qualityTier = item.quality_tier ?? 0;
              const displayRarity = item.effective_rarity || item.rarity;
              const cardKey = `${item.item_id}-${enchantLevel}-${qualityTier}`;
              const equippedInSlot = item.item_type === 'EQUIPMENT'
                ? activeSlots.find((s) => s.slot === item.slot)?.item
                : null;
              const compareTo = equippedInSlot
                ? effectiveBonusMap(statBonuses[equippedInSlot.itemId], equippedInSlot.enchantLevel, equippedInSlot.qualityTier)
                : null;
              return (
                <div key={cardKey} className={`rpg-panel inventory-item ${rarityClass(displayRarity)}`}>
                  <div className="inventory-item-header">
                    <span className="inventory-item-name">
                      <span className="inventory-item-icon">{itemIcon(item)}</span>
                      {item.name}
                      {enchantLevel > 0 && <EnchantBadge level={enchantLevel} />}
                      <LuckBadge tier={qualityTier} />
                      {item.item_type === 'EQUIPMENT' && (
                        <StatTooltip
                          bonuses={statBonuses[item.item_id]}
                          enchantLevel={enchantLevel}
                          qualityTier={qualityTier}
                          compareTo={compareTo}
                        />
                      )}
                    </span>
                    <span className="inventory-item-qty">
                      x{item.quantity}
                      <EquippedCountNote count={equippedCounts[cardKey] || 0} />
                    </span>
                  </div>
                  <span className="inventory-item-rarity">{RARITY_LABELS[displayRarity] || displayRarity}</span>
                  {item.required_level && (
                    <span className="inventory-item-level">Nivel mín. {item.required_level}</span>
                  )}
                  {item.item_type === 'EQUIPMENT' && (
                    <button
                      className="rpg-button equipment-action"
                      disabled={!!busyId}
                      onClick={() => handleEquipActive(item.item_id, enchantLevel, qualityTier)}
                    >
                      {activeNpc ? `Equipar a ${activeNpc.name}` : 'Equipar'}
                    </button>
                  )}
                  {item.code?.startsWith('HUEVO_') && (
                    <Link to="/pets" className="rpg-button equipment-action">
                      🐾 Incubar
                    </Link>
                  )}
                  {item.item_type === 'CONSUMABLE' && (
                    <button
                      className="rpg-button equipment-action"
                      disabled={!!busyId}
                      onClick={() => handleUseItem(item.item_id)}
                    >
                      {busyId === `use-${item.item_id}` ? 'Usando...' : 'Usar'}
                    </button>
                  )}
                  {item.is_scroll && (
                    <button
                      className="rpg-button equipment-action"
                      disabled={!!busyId}
                      onClick={() => handleUseScroll(item.item_id)}
                    >
                      {busyId === `scroll-${item.item_id}`
                        ? 'Usando...'
                        : item.recipe_already_learned ? '📖 Ya aprendida' : '📖 Aprender receta'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {recipeResult && (
        <div className="craft-result-popup rpg-panel">
          <button
            className="craft-result-close"
            onClick={() => { clearTimeout(recipeResultTimer.current); setRecipeResult(null); }}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h4 className="craft-result-title">
            {recipeResult.alreadyLearned ? '📖 Receta ya conocida' : '🎉 ¡Nueva receta!'}
          </h4>
          <p className="hint">{recipeResult.message}</p>
        </div>
      )}
    </div>
  );
}
