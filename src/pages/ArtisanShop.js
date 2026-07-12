import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const RARITY_CLASS = {
  COMUN: 'rarity-comun', POCO_COMUN: 'rarity-poco_comun',
  RARO: 'rarity-raro', EPICO: 'rarity-epico', LEGENDARIO: 'rarity-legendario',
};

export default function ArtisanShop() {
  const { player, token } = useAuth();
  const [artisans, setArtisans] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [tab, setTab] = useState('buy');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadingKey, setLoadingKey] = useState(null);
  const [sellQty, setSellQty] = useState({});
  const [filterArtisan, setFilterArtisan] = useState('todo');

  async function load() {
    const [art, inv] = await Promise.all([
      api.getArtisanShop(player.id, token),
      api.getPlayerInventory(player.id, token),
    ]);
    setArtisans(art);
    setInventory(inv);
  }

  useEffect(() => {
    if (!player) return;
    load().catch((err) => setError(err.message));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBuy(artisanCode, itemCode, itemName, price) {
    setError('');
    setMessage('');
    const key = `buy-${artisanCode}-${itemCode}`;
    setLoadingKey(key);
    try {
      await api.buyArtisanItem(player.id, artisanCode, itemCode, 1, token);
      setMessage(`Compraste ${itemName} por ${price} Oro.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleSell(item) {
    setError('');
    setMessage('');
    const enchantLevel = item.enchant_level ?? 0;
    const cardKey = `${item.item_id}-${enchantLevel}`;
    const qty = Number(sellQty[cardKey] || 1);
    setLoadingKey(`sell-${cardKey}`);
    try {
      const result = await api.sellArtisanItem(player.id, item.item_id, qty, enchantLevel, token);
      setMessage(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingKey(null);
    }
  }

  if (!artisans || !inventory) return <div className="dashboard-loading">Cargando...</div>;

  const filteredArtisans = filterArtisan === 'todo'
    ? artisans
    : artisans.filter((a) => a.code === filterArtisan);

  const sellableItems = inventory.filter((i) => i.rarity && i.rarity !== '');

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🏪 Tienda de Artesanos</h1>
          <p className="dashboard-subtitle">Comprá materiales especiales o vendé ítems.</p>
        </div>
        <Link className="logout-btn" to="/guild">Volver</Link>
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
      </div>

      {tab === 'buy' && (
        <>
          <div className="craft-filter-bar">
            <button
              className={`rpg-button rpg-button--small${filterArtisan === 'todo' ? ' quest-tab--active' : ''}`}
              onClick={() => setFilterArtisan('todo')}
            >
              Todo
            </button>
            {artisans.map((art) => (
              <button
                key={art.code}
                className={`rpg-button rpg-button--small${filterArtisan === art.code ? ' quest-tab--active' : ''}`}
                onClick={() => setFilterArtisan(art.code)}
              >
                {art.specialty || art.name}
              </button>
            ))}
          </div>
          <div className="zone-list">
          {filteredArtisans.map((art) => (
            <div key={art.code} className="rpg-panel">
              <h3 className="guild-members-title">
                {art.name}
                <span className="hint" style={{ marginLeft: 8, fontSize: '0.8rem' }}>{art.specialty}</span>
              </h3>
              {art.shop.length === 0 && <p className="hint">Sin stock.</p>}
              <div className="guild-members-list">
                {art.shop.map((item) => (
                  <div key={item.itemCode} className="guild-member-row">
                    <div className="guild-member-info">
                      <span className={`guild-member-name item-rarity-dot ${RARITY_CLASS[item.rarity] || ''}`}>
                        {item.name}
                      </span>
                      <span className="hint guild-member-sub">
                        {item.rarity} · {item.price.toLocaleString()} Oro
                        {item.playerOwns > 0 ? ` · Tenés: ${item.playerOwns}` : ''}
                      </span>
                      {item.description && <span className="hint guild-member-sub">{item.description}</span>}
                    </div>
                    <button
                      className="rpg-button rpg-button--small"
                      disabled={loadingKey === `buy-${art.code}-${item.itemCode}`}
                      onClick={() => handleBuy(art.code, item.itemCode, item.name, item.price)}
                    >
                      {loadingKey === `buy-${art.code}-${item.itemCode}` ? '...' : 'Comprar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {tab === 'sell' && (
        <div className="rpg-panel">
          {sellableItems.length === 0 && (
            <p className="hint">No tenés ítems para vender.</p>
          )}
          <div className="guild-members-list">
            {sellableItems.map((item) => {
              const enchantLevel = item.enchant_level ?? 0;
              const cardKey = `${item.item_id}-${enchantLevel}`;
              return (
                <div key={cardKey} className="guild-member-row">
                  <div className="guild-member-info">
                    <span className={`guild-member-name item-rarity-dot ${RARITY_CLASS[item.rarity] || ''}`}>
                      {item.name}
                      {enchantLevel > 0 && <span className="enchant-badge">+{enchantLevel}</span>}
                    </span>
                    <span className="hint guild-member-sub">
                      {item.rarity} · x{item.quantity} en inventario
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={sellQty[cardKey] ?? 1}
                      onChange={(e) => setSellQty((prev) => ({ ...prev, [cardKey]: e.target.value }))}
                      className="rpg-input"
                      style={{ width: 52, textAlign: 'center', padding: '4px 6px' }}
                    />
                    <button
                      className="rpg-button rpg-button--small"
                      disabled={loadingKey === `sell-${cardKey}`}
                      onClick={() => handleSell(item)}
                    >
                      {loadingKey === `sell-${cardKey}` ? '...' : 'Vender'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
