import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

const RARITY_LABELS = {
  COMUN: 'Común',
  POCO_COMUN: 'Poco Común',
  RARO: 'Raro',
  EPICO: 'Épico',
  LEGENDARIO: 'Legendario',
};

const SLOT_ICONS = {
  WEAPON: { name: 'pointy-sword', artist: 'lorc' },
  OFFHAND: { name: 'shield', artist: 'sbed' },
  HELMET: { name: 'helmet', artist: 'sbed' },
  ARMOR: { name: 'armor-vest', artist: 'lorc' },
  GLOVES: { name: 'gloves', artist: 'delapouite' },
  BOOTS: { name: 'leather-boot', artist: 'lorc' },
  ACCESSORY: { name: 'ring', artist: 'delapouite' },
};
const TYPE_ICONS = {
  EQUIPMENT: { name: 'pointy-sword', artist: 'lorc' },
  CONSUMABLE: { name: 'health-potion', artist: 'delapouite' },
  MATERIAL: { name: 'wood-pile', artist: 'delapouite' },
};

const CURRENCY_LABELS = { GOLD: 'Oro', DUNGEON_COINS: 'Monedas del Abismo', COSMIC_SHARDS: 'Fragmentos Cósmicos' };
const CURRENCY_OPTIONS = ['GOLD', 'DUNGEON_COINS', 'COSMIC_SHARDS'];

// Mismo mapeo que ya usa Pets.js para estos bonuses — se duplica acá (no está exportado) para
// poder mostrar de qué se trata la mascota antes de comprarla/publicarla.
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

function itemIcon(item) {
  const icon = item.item_type === 'EQUIPMENT'
    ? (SLOT_ICONS[item.slot] || { name: 'cog', artist: 'lorc' })
    : TYPE_ICONS[item.item_type];
  return icon ? <GameIcon {...icon} /> : '❔';
}

function rarityClass(rarity) {
  return `rarity-${(rarity || 'comun').toLowerCase()}`;
}

function formatPrice(amount, currency) {
  return `${Number(amount).toLocaleString()} ${CURRENCY_LABELS[currency] || currency}`;
}

function EnchantBadge({ level }) {
  if (!level) return null;
  return <span className="enchant-badge">+{level}</span>;
}

function LuckBadge({ tier }) {
  if (!tier) return null;
  return (
    <span className="luck-badge" title="Salió de mejor rareza por suerte">
      <GameIcon name="sparkles" artist="delapouite" /> Suerte
    </span>
  );
}

function CurrencySelect({ value, onChange }) {
  return (
    <select className="rpg-input" value={value} onChange={onChange} style={{ maxWidth: 170 }}>
      {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
    </select>
  );
}

function PetBonusList({ bonuses }) {
  if (!bonuses?.length) return null;
  return (
    <div className="skill-effects">
      {bonuses.map((b, i) => {
        const text = formatBonus(b);
        return text ? <span key={i} className="skill-effect">{text}</span> : null;
      })}
    </div>
  );
}

export default function Market() {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('buy');
  const [listings, setListings] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [pets, setPets] = useState(null);
  const [myListings, setMyListings] = useState(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('todo');
  const [sortBy, setSortBy] = useState('recent');
  const [sellForm, setSellForm] = useState({});
  const [petSellForm, setPetSellForm] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBuy = useCallback(async () => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (rarityFilter !== 'todo') params.rarity = rarityFilter;
    if (sortBy !== 'recent') params.sortBy = sortBy;
    setListings(await api.getMarketListings(player.id, token, params));
  }, [player, token, search, rarityFilter, sortBy]);

  const loadSell = useCallback(async () => {
    setInventory(await api.getPlayerInventory(player.id, token));
  }, [player, token]);

  const loadPets = useCallback(async () => {
    setPets(await api.getPets(player.id, token));
  }, [player, token]);

  const loadMine = useCallback(async () => {
    setMyListings(await api.getMyMarketListings(player.id, token));
  }, [player, token]);

  useEffect(() => {
    if (!player) return;
    setError('');
    if (tab === 'buy') loadBuy().catch((err) => setError(err.message));
    if (tab === 'sell') loadSell().catch((err) => setError(err.message));
    if (tab === 'sellPet') loadPets().catch((err) => setError(err.message));
    if (tab === 'mine') loadMine().catch((err) => setError(err.message));
  }, [tab, player, loadBuy, loadSell, loadPets, loadMine]);

  async function handleBuy(listing) {
    setError('');
    setMessage('');
    setBusyKey(`buy-${listing.id}`);
    try {
      const res = await api.buyMarketListing(player.id, listing.id, token);
      setMessage(res.message);
      await loadBuy();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePublish(item, cardKey) {
    const form = sellForm[cardKey] || {};
    const quantity = Math.max(1, Math.min(item.quantity, Number(form.quantity) || 1));
    const pricePerUnit = Number(form.price) || 0;
    const currency = form.currency || 'GOLD';
    if (pricePerUnit <= 0) {
      setError('Ingresa un precio válido para publicar.');
      return;
    }
    setError('');
    setMessage('');
    setBusyKey(`publish-${cardKey}`);
    try {
      const res = await api.createMarketListing(player.id, {
        itemId: item.item_id,
        enchantLevel: item.enchant_level,
        qualityTier: item.quality_tier,
        quantity,
        pricePerUnit,
        currency,
      }, token);
      setMessage(res.message);
      setSellForm((prev) => ({ ...prev, [cardKey]: { quantity: '', price: '', currency: 'GOLD' } }));
      await loadSell();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePublishPet(pet) {
    const form = petSellForm[pet.id] || {};
    const pricePerUnit = Number(form.price) || 0;
    const currency = form.currency || 'GOLD';
    if (pricePerUnit <= 0) {
      setError('Ingresa un precio válido para publicar.');
      return;
    }
    setError('');
    setMessage('');
    setBusyKey(`publish-pet-${pet.id}`);
    try {
      const res = await api.createMarketListing(player.id, { playerPetId: pet.id, pricePerUnit, currency }, token);
      setMessage(res.message);
      setPetSellForm((prev) => ({ ...prev, [pet.id]: { price: '', currency: 'GOLD' } }));
      await loadPets();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCancel(listing) {
    setError('');
    setMessage('');
    setBusyKey(`cancel-${listing.id}`);
    try {
      await api.cancelMarketListing(player.id, listing.id, token);
      setMessage(listing.type === 'PET' ? 'Publicación cancelada.' : 'Publicación cancelada, ítem devuelto a tu inventario.');
      await loadMine();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  const sellableItems = (inventory || []).filter((i) => i.rarity);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="money-stack" artist="delapouite" /> Mercado de Jugadores</h1>
          <p className="dashboard-subtitle">
            Compra y vende ítems y mascotas directamente con otros jugadores, en oro, monedas del abismo o fragmentos cósmicos.
            {' '}<span className="hint">El mercado cobra un 5% de comisión en cada venta.</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link className="logout-btn" to="/guild">Volver</Link>
        </div>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="quest-tabs">
        <button className={`rpg-button rpg-button--small${tab === 'buy' ? ' quest-tab--active' : ''}`} onClick={() => setTab('buy')}>
          Comprar
        </button>
        <button className={`rpg-button rpg-button--small${tab === 'sell' ? ' quest-tab--active' : ''}`} onClick={() => setTab('sell')}>
          Vender Ítem
        </button>
        <button className={`rpg-button rpg-button--small${tab === 'sellPet' ? ' quest-tab--active' : ''}`} onClick={() => setTab('sellPet')}>
          Vender Mascota
        </button>
        <button className={`rpg-button rpg-button--small${tab === 'mine' ? ' quest-tab--active' : ''}`} onClick={() => setTab('mine')}>
          Mis Publicaciones
        </button>
      </div>

      {tab === 'buy' && (
        <>
          <div className="craft-filter-bar">
            <input
              type="text"
              className="rpg-input"
              placeholder="Buscar ítem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 200 }}
            />
            {['todo', 'COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO'].map((r) => (
              <button
                key={r}
                className={`rpg-button rpg-button--small${rarityFilter === r ? ' quest-tab--active' : ''}`}
                onClick={() => setRarityFilter(r)}
              >
                {r === 'todo' ? 'Todo' : RARITY_LABELS[r]}
              </button>
            ))}
            <select className="rpg-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="recent">Más recientes</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
            <span className="hint">El filtro de rareza y búsqueda solo aplica a ítems.</span>
          </div>

          {!listings && <p className="dashboard-loading">Cargando...</p>}
          {listings && listings.length === 0 && <p className="hint">No hay publicaciones activas todavía.</p>}

          <div className="item-grid">
            {listings?.map((l) => l.type === 'PET' ? (
              <div key={l.id} className={`rpg-panel inventory-item ${rarityClass(l.pet.rarity)}`}>
                <div className="inventory-item-header">
                  <span className="inventory-item-name">
                    <span className="inventory-item-icon"><GameIcon name="paw-print" artist="lorc" /></span>
                    {l.pet.name}
                  </span>
                  <span className="inventory-item-qty">Niv. {l.pet.level}</span>
                </div>
                <span className="inventory-item-rarity">{RARITY_LABELS[l.pet.rarity] || l.pet.rarity}</span>
                <span className="hint">Vínculo: {l.pet.bond_points}</span>
                <PetBonusList bonuses={l.pet.bonuses} />
                <span className="hint market-seller">Vende: {l.is_mine ? 'Tú' : l.seller_nickname}</span>
                <span className="market-price">{formatPrice(l.total_price, l.currency)}</span>
                <button
                  className="rpg-button equipment-action"
                  disabled={l.is_mine || busyKey === `buy-${l.id}`}
                  onClick={() => handleBuy(l)}
                >
                  {l.is_mine ? 'Tu publicación' : busyKey === `buy-${l.id}` ? 'Comprando...' : 'Comprar'}
                </button>
              </div>
            ) : (
              <div key={l.id} className={`rpg-panel inventory-item ${rarityClass(l.item.item_rarity)}`}>
                <div className="inventory-item-header">
                  <span className="inventory-item-name">
                    <span className="inventory-item-icon">{itemIcon({ item_type: l.item.item_type, slot: l.item.slot })}</span>
                    {l.item.name}
                    <EnchantBadge level={l.item.enchant_level} />
                    <LuckBadge tier={l.item.quality_tier} />
                  </span>
                  <span className="inventory-item-qty">x{l.quantity}</span>
                </div>
                <span className="inventory-item-rarity">{RARITY_LABELS[l.item.item_rarity] || l.item.item_rarity}</span>
                <span className="hint market-seller">Vende: {l.is_mine ? 'Tú' : l.seller_nickname}</span>
                <span className="market-price">
                  {formatPrice(l.total_price, l.currency)}
                  {l.quantity > 1 && <span className="hint"> ({formatPrice(l.price_per_unit, l.currency)} c/u)</span>}
                </span>
                <button
                  className="rpg-button equipment-action"
                  disabled={l.is_mine || busyKey === `buy-${l.id}`}
                  onClick={() => handleBuy(l)}
                >
                  {l.is_mine ? 'Tu publicación' : busyKey === `buy-${l.id}` ? 'Comprando...' : 'Comprar'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'sell' && (
        <>
          {sellableItems.length === 0 && <p className="hint">No tienes ítems para vender.</p>}
          <div className="item-grid">
            {sellableItems.map((item) => {
              const cardKey = `${item.item_id}-${item.enchant_level}-${item.quality_tier}`;
              const form = sellForm[cardKey] || {};
              const displayRarity = item.effective_rarity || item.rarity;
              return (
                <div key={cardKey} className={`rpg-panel inventory-item ${rarityClass(displayRarity)}`}>
                  <div className="inventory-item-header">
                    <span className="inventory-item-name">
                      <span className="inventory-item-icon">{itemIcon(item)}</span>
                      {item.name}
                      <EnchantBadge level={item.enchant_level} />
                      <LuckBadge tier={item.quality_tier} />
                    </span>
                    <span className="inventory-item-qty">x{item.quantity}</span>
                  </div>
                  <span className="inventory-item-rarity">{RARITY_LABELS[displayRarity] || displayRarity}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      placeholder="Cant."
                      value={form.quantity ?? ''}
                      onChange={(e) => setSellForm((prev) => ({ ...prev, [cardKey]: { ...form, quantity: e.target.value } }))}
                      className="rpg-input"
                      style={{ width: 56, textAlign: 'center', padding: '4px 6px' }}
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Precio c/u"
                      value={form.price ?? ''}
                      onChange={(e) => setSellForm((prev) => ({ ...prev, [cardKey]: { ...form, price: e.target.value } }))}
                      className="rpg-input"
                      style={{ width: 90, textAlign: 'center', padding: '4px 6px' }}
                    />
                    <CurrencySelect
                      value={form.currency || 'GOLD'}
                      onChange={(e) => setSellForm((prev) => ({ ...prev, [cardKey]: { ...form, currency: e.target.value } }))}
                    />
                  </div>
                  <button
                    className="rpg-button equipment-action"
                    disabled={busyKey === `publish-${cardKey}`}
                    onClick={() => handlePublish(item, cardKey)}
                  >
                    {busyKey === `publish-${cardKey}` ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'sellPet' && (
        <>
          {!pets && <p className="dashboard-loading">Cargando...</p>}
          {pets && pets.length === 0 && <p className="hint">No tienes mascotas para vender.</p>}
          <div className="item-grid">
            {pets?.map((pet) => {
              const form = petSellForm[pet.id] || {};
              return (
                <div key={pet.id} className={`rpg-panel inventory-item ${rarityClass(pet.rarity)}`}>
                  <div className="inventory-item-header">
                    <span className="inventory-item-name">
                      <span className="inventory-item-icon"><GameIcon name="paw-print" artist="lorc" /></span>
                      {pet.name}
                    </span>
                    <span className="inventory-item-qty">Niv. {pet.level}</span>
                  </div>
                  <span className="inventory-item-rarity">{RARITY_LABELS[pet.rarity] || pet.rarity}</span>
                  <span className="hint">Vínculo: {pet.bond_points}</span>
                  <PetBonusList bonuses={pet.bonuses} />
                  {pet.is_active ? (
                    <p className="auth-error">Está activa — desactívala en Mascotas antes de publicarla.</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <input
                          type="number"
                          min={1}
                          placeholder="Precio"
                          value={form.price ?? ''}
                          onChange={(e) => setPetSellForm((prev) => ({ ...prev, [pet.id]: { ...form, price: e.target.value } }))}
                          className="rpg-input"
                          style={{ width: 90, textAlign: 'center', padding: '4px 6px' }}
                        />
                        <CurrencySelect
                          value={form.currency || 'GOLD'}
                          onChange={(e) => setPetSellForm((prev) => ({ ...prev, [pet.id]: { ...form, currency: e.target.value } }))}
                        />
                      </div>
                      <button
                        className="rpg-button equipment-action"
                        disabled={busyKey === `publish-pet-${pet.id}`}
                        onClick={() => handlePublishPet(pet)}
                      >
                        {busyKey === `publish-pet-${pet.id}` ? 'Publicando...' : 'Publicar'}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <>
          {!myListings && <p className="dashboard-loading">Cargando...</p>}
          {myListings && myListings.length === 0 && <p className="hint">Todavía no publicaste nada.</p>}
          <div className="item-grid">
            {myListings?.map((l) => (
              <div key={l.id} className={`rpg-panel inventory-item ${rarityClass(l.type === 'PET' ? l.pet.rarity : l.item.item_rarity)}`}>
                <div className="inventory-item-header">
                  <span className="inventory-item-name">
                    <span className="inventory-item-icon">
                      {l.type === 'PET' ? <GameIcon name="paw-print" artist="lorc" /> : itemIcon({ item_type: l.item.item_type, slot: l.item.slot })}
                    </span>
                    {l.type === 'PET' ? l.pet.name : l.item.name}
                    {l.type === 'ITEM' && <EnchantBadge level={l.item.enchant_level} />}
                    {l.type === 'ITEM' && <LuckBadge tier={l.item.quality_tier} />}
                  </span>
                  <span className="inventory-item-qty">{l.type === 'PET' ? `Niv. ${l.pet.level}` : `x${l.quantity}`}</span>
                </div>
                <span className="inventory-item-rarity">
                  {l.type === 'PET' ? (RARITY_LABELS[l.pet.rarity] || l.pet.rarity) : (RARITY_LABELS[l.item.item_rarity] || l.item.item_rarity)}
                </span>
                <span className="market-price">{formatPrice(l.total_price, l.currency)}</span>
                {l.status === 'ACTIVE' && (
                  <button
                    className="rpg-button equipment-action"
                    disabled={busyKey === `cancel-${l.id}`}
                    onClick={() => handleCancel(l)}
                  >
                    {busyKey === `cancel-${l.id}` ? 'Cancelando...' : 'Cancelar publicación'}
                  </button>
                )}
                {l.status === 'SOLD' && <span className="hint">Vendido a {l.buyer_nickname}</span>}
                {l.status === 'CANCELLED' && <span className="hint">Cancelada</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
