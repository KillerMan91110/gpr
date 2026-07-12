import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const RARITY_LABELS = {
  COMUN: 'Común',
  POCO_COMUN: 'Poco Común',
  RARO: 'Raro',
  EPICO: 'Épico',
  LEGENDARIO: 'Legendario',
};

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

export default function Market() {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('buy');
  const [gold, setGold] = useState(null);
  const [listings, setListings] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [myListings, setMyListings] = useState(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('todo');
  const [sortBy, setSortBy] = useState('recent');
  const [sellForm, setSellForm] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadGold = useCallback(async () => {
    const stats = await api.getPlayerStats(player.id, token);
    setGold(stats.gold);
  }, [player, token]);

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

  const loadMine = useCallback(async () => {
    setMyListings(await api.getMyMarketListings(player.id, token));
  }, [player, token]);

  useEffect(() => {
    if (!player) return;
    loadGold().catch(() => {});
  }, [player, token, loadGold]);

  useEffect(() => {
    if (!player) return;
    setError('');
    if (tab === 'buy') loadBuy().catch((err) => setError(err.message));
    if (tab === 'sell') loadSell().catch((err) => setError(err.message));
    if (tab === 'mine') loadMine().catch((err) => setError(err.message));
  }, [tab, player, loadBuy, loadSell, loadMine]);

  async function handleBuy(listing) {
    setError('');
    setMessage('');
    setBusyKey(`buy-${listing.id}`);
    try {
      const res = await api.buyMarketListing(player.id, listing.id, token);
      setMessage(res.message);
      await Promise.all([loadBuy(), loadGold()]);
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
    if (pricePerUnit <= 0) {
      setError('Ingresá un precio válido para publicar.');
      return;
    }
    setError('');
    setMessage('');
    setBusyKey(`publish-${cardKey}`);
    try {
      const res = await api.createMarketListing(
        player.id, item.item_id, item.enchant_level, item.quality_tier, quantity, pricePerUnit, token
      );
      setMessage(res.message);
      setSellForm((prev) => ({ ...prev, [cardKey]: { quantity: '', price: '' } }));
      await loadSell();
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
      setMessage('Publicación cancelada, ítem devuelto a tu inventario.');
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
          <h1>💰 Mercado de Jugadores</h1>
          <p className="dashboard-subtitle">
            Comprá y vendé ítems directamente con otros jugadores.
            {' '}<span className="hint">El mercado cobra un 5% de comisión en cada venta.</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {gold !== null && <span className="market-gold-tag">🪙 {gold.toLocaleString()} Oro</span>}
          <Link className="logout-btn" to="/guild">Volver</Link>
        </div>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="quest-tabs">
        <button
          className={`rpg-button rpg-button--small${tab === 'buy' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('buy')}
        >
          Comprar
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'sell' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('sell')}
        >
          Vender
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'mine' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('mine')}
        >
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
          </div>

          {!listings && <p className="dashboard-loading">Cargando...</p>}
          {listings && listings.length === 0 && <p className="hint">No hay publicaciones activas todavía.</p>}

          <div className="item-grid">
            {listings?.map((l) => (
              <div key={l.id} className={`rpg-panel inventory-item ${rarityClass(l.rarity)}`}>
                <div className="inventory-item-header">
                  <span className="inventory-item-name">
                    <span className="inventory-item-icon">{itemIcon(l)}</span>
                    {l.name}
                    <EnchantBadge level={l.enchant_level} />
                    <LuckBadge tier={l.quality_tier} />
                  </span>
                  <span className="inventory-item-qty">x{l.quantity}</span>
                </div>
                <span className="inventory-item-rarity">{RARITY_LABELS[l.rarity] || l.rarity}</span>
                <span className="hint market-seller">Vende: {l.is_mine ? 'Vos' : l.seller_nickname}</span>
                <span className="market-price">
                  🪙 {Number(l.total_price).toLocaleString()} Oro
                  {l.quantity > 1 && <span className="hint"> ({Number(l.price_per_unit).toLocaleString()} c/u)</span>}
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
          {sellableItems.length === 0 && <p className="hint">No tenés ítems para vender.</p>}
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
                  <div style={{ display: 'flex', gap: 6 }}>
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

      {tab === 'mine' && (
        <>
          {!myListings && <p className="dashboard-loading">Cargando...</p>}
          {myListings && myListings.length === 0 && <p className="hint">Todavía no publicaste nada.</p>}
          <div className="item-grid">
            {myListings?.map((l) => (
              <div key={l.id} className={`rpg-panel inventory-item ${rarityClass(l.rarity)}`}>
                <div className="inventory-item-header">
                  <span className="inventory-item-name">
                    <span className="inventory-item-icon">{itemIcon(l)}</span>
                    {l.name}
                    <EnchantBadge level={l.enchant_level} />
                    <LuckBadge tier={l.quality_tier} />
                  </span>
                  <span className="inventory-item-qty">x{l.quantity}</span>
                </div>
                <span className="inventory-item-rarity">{RARITY_LABELS[l.rarity] || l.rarity}</span>
                <span className="market-price">🪙 {Number(l.total_price).toLocaleString()} Oro</span>
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
