import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const RARITY_CLASS = {
  COMUN: 'rarity-comun', POCO_COMUN: 'rarity-poco_comun',
  RARO: 'rarity-raro', EPICO: 'rarity-epico', LEGENDARIO: 'rarity-legendario', UNICO: 'rarity-unico',
};

export default function WorldBossShop() {
  const { player, token } = useAuth();
  const [shop, setShop] = useState(null);
  const [cosmicShards, setCosmicShards] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadingKey, setLoadingKey] = useState(null);

  async function load() {
    const data = await api.getWorldBossShop(player.id, token);
    setShop(data.shop);
    setCosmicShards(data.cosmic_shards ?? 0);
  }

  useEffect(() => {
    if (!player) return;
    load().catch((err) => setError(err.message));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBuy(item) {
    setError('');
    setMessage('');
    setLoadingKey(item.item_id);
    try {
      const result = await api.buyWorldBossItem(player.id, item.item_id, 1, token);
      setMessage(`Compraste ${result.item ?? item.name} por ${result.cost ?? item.price} fragmentos cósmicos.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingKey(null);
    }
  }

  if (!shop) return <div className="dashboard-loading">Cargando...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🌌 Tienda del World Boss</h1>
          <p className="dashboard-subtitle">Fragmentos cósmicos: {cosmicShards.toLocaleString()}</p>
        </div>
        <Link className="logout-btn" to="/worldboss">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="rpg-panel">
        {shop.length === 0 && <p className="hint">Sin stock por ahora.</p>}
        <div className="guild-members-list">
          {shop.map((item) => (
            <div key={item.item_id} className="guild-member-row">
              <div className="guild-member-info">
                <span className={`guild-member-name item-rarity-dot ${RARITY_CLASS[item.rarity] || ''}`}>
                  {item.name}
                </span>
                <span className="hint guild-member-sub">
                  {item.rarity} · {item.price.toLocaleString()} fragmentos cósmicos
                </span>
                {item.description && <span className="hint guild-member-sub">{item.description}</span>}
              </div>
              <button
                className="rpg-button rpg-button--small"
                disabled={loadingKey === item.item_id || cosmicShards < item.price}
                onClick={() => handleBuy(item)}
              >
                {loadingKey === item.item_id ? '...' : 'Comprar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
