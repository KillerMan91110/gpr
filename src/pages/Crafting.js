import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const RARITY_LABEL = {
  COMUN: 'Común', POCO_COMUN: 'Poco común', RARO: 'Raro',
  EPICO: 'Épico', LEGENDARIO: 'Legendario',
};

export default function Crafting() {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('craft');
  const [recipes, setRecipes] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [craftingCode, setCraftingCode] = useState(null);
  const [craftQty, setCraftQty] = useState({});
  const [dismantleId, setDismantleId] = useState(null);
  const [dismantleQty, setDismantleQty] = useState({});
  const [filterCat, setFilterCat] = useState('todo');
  const [craftResult, setCraftResult] = useState(null);
  const craftResultTimer = useRef(null);

  async function loadRecipes() {
    const data = await api.getCraftAvailable(player.id, token);
    setRecipes(data);
  }

  async function loadInventory() {
    const data = await api.getPlayerInventory(player.id, token);
    setInventory(data);
  }

  useEffect(() => {
    if (!player) return;
    loadRecipes().catch((err) => setError(err.message));
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!player || tab !== 'dismantle') return;
    if (inventory !== null) return;
    loadInventory().catch((err) => setError(err.message));
  }, [tab, player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  function showCraftResult(popup) {
    clearTimeout(craftResultTimer.current);
    setCraftResult(popup);
    craftResultTimer.current = setTimeout(() => setCraftResult(null), 7000);
  }

  useEffect(() => () => clearTimeout(craftResultTimer.current), []);

  async function handleCraft(recipe) {
    setError('');
    const qty = Number(craftQty[recipe.code] || 1);
    setCraftingCode(recipe.code);
    try {
      const result = await api.craft(player.id, recipe.code, qty, token);
      showCraftResult({
        recipeName: recipe.resultName,
        successCount: result.successCount,
        failCount: result.failCount,
        results: result.results,
      });
      await loadRecipes();
    } catch (err) {
      setError(err.message);
    } finally {
      setCraftingCode(null);
    }
  }

  async function handleDismantle(item) {
    setError('');
    setMessage('');
    const qty = Number(dismantleQty[item.item_id] || 1);
    setDismantleId(item.item_id);
    try {
      const result = await api.dismantle(player.id, item.item_id, qty, token);
      setMessage(result.message);
      await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setDismantleId(null);
    }
  }

  if (!recipes) return <div className="dashboard-loading">Cargando...</div>;

  // Categorías dinámicas a partir de las recetas disponibles
  const classCategories = [];
  const seenCodes = new Set();
  for (const r of recipes) {
    if (r.classCode && !seenCodes.has(r.classCode)) {
      seenCodes.add(r.classCode);
      classCategories.push({ code: r.classCode, name: r.className });
    }
  }
  const hasConsumables = recipes.some((r) => r.resultType === 'CONSUMABLE');

  const filteredRecipes = recipes.filter((r) => {
    if (filterCat === 'todo') return true;
    if (filterCat === 'CONSUMABLE') return r.resultType === 'CONSUMABLE';
    return r.classCode === filterCat;
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>⚒ Crafteo</h1>
          <p className="dashboard-subtitle">Fabrica ítems con materiales o desmantela equipos.</p>
        </div>
        <Link className="logout-btn" to="/guild">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      {craftResult && (
        <div className="craft-result-popup rpg-panel">
          <button
            className="craft-result-close"
            onClick={() => { clearTimeout(craftResultTimer.current); setCraftResult(null); }}
            aria-label="Cerrar"
          >
            ×
          </button>
          <h4 className="craft-result-title">{craftResult.recipeName}</h4>
          {(craftResult.results || []).map((r) => (
            <p key={r.qualityTier} className="craft-result-line">
              ✓ {r.quantity}x{' '}
              <span className={`equipment-item-name rarity-${r.rarity.toLowerCase()}`}>
                {RARITY_LABEL[r.rarity] || r.rarity}
              </span>
              {r.qualityTier > 0 && <span className="luck-badge">✦ Suerte</span>}
            </p>
          ))}
          {craftResult.failCount > 0 && (
            <p className="craft-result-line craft-result-fail">
              ✗ Falló {craftResult.failCount} {craftResult.failCount === 1 ? 'vez' : 'veces'}
            </p>
          )}
        </div>
      )}

      <div className="quest-tabs">
        <button
          className={`rpg-button rpg-button--small${tab === 'craft' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('craft')}
        >
          Fabricar
        </button>
        <button
          className={`rpg-button rpg-button--small${tab === 'dismantle' ? ' quest-tab--active' : ''}`}
          onClick={() => setTab('dismantle')}
        >
          Desmantelar
        </button>
      </div>

      {tab === 'craft' && (
        <>
          <div className="craft-filter-bar">
            <button
              className={`rpg-button rpg-button--small${filterCat === 'todo' ? ' quest-tab--active' : ''}`}
              onClick={() => setFilterCat('todo')}
            >
              Todo
            </button>
            {classCategories.map((cat) => (
              <button
                key={cat.code}
                className={`rpg-button rpg-button--small${filterCat === cat.code ? ' quest-tab--active' : ''}`}
                onClick={() => setFilterCat(cat.code)}
              >
                {cat.name}
              </button>
            ))}
            {hasConsumables && (
              <button
                className={`rpg-button rpg-button--small${filterCat === 'CONSUMABLE' ? ' quest-tab--active' : ''}`}
                onClick={() => setFilterCat('CONSUMABLE')}
              >
                Consumibles
              </button>
            )}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="rpg-panel">
              <p className="hint">No hay recetas disponibles. Desbloquea zonas derrota jefes para acceder a nuevas recetas.</p>
            </div>
          )}
          <div className="zone-list">
            {filteredRecipes.map((r) => (
              <div key={r.id} className={`zone-card rpg-panel${r.canCraft ? '' : ' craft-card--missing'}`}>
                <div className="zone-card-header">
                  <h3>{r.resultName}</h3>
                  <span className="hint">{RARITY_LABEL[r.rarity] || r.rarity}</span>
                </div>
                {r.artisanName && <p className="zone-description">Artesano: {r.artisanName}</p>}
                {r.description && <p className="hint">{r.description}</p>}
                <p className="hint">Éxito: {r.successRate}% · Resultado: x{r.resultQuantity}</p>
                <div className="craft-ingredients">
                  {r.ingredients.map((ing, i) => (
                    <span
                      key={`${r.id}-${ing.itemId}-${i}`}
                      className={`craft-ingredient${ing.have >= ing.need ? '' : ' craft-ingredient--missing'}`}
                    >
                      {ing.itemName} {ing.have}/{ing.need}
                    </span>
                  ))}
                </div>
                <div className="craft-row">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={craftQty[r.code] ?? 1}
                    onChange={(e) => setCraftQty((prev) => ({ ...prev, [r.code]: e.target.value }))}
                    className="rpg-input"
                    style={{ width: 60, textAlign: 'center', padding: '4px 6px' }}
                  />
                  <button
                    className="rpg-button"
                    disabled={!r.canCraft || craftingCode === r.code}
                    title={r.canCraft ? '' : 'Materiales insuficientes'}
                    onClick={() => handleCraft(r)}
                  >
                    {craftingCode === r.code ? 'Fabricando...' : 'Fabricar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'dismantle' && (
        <>
          {inventory === null && <div className="dashboard-loading">Cargando inventario...</div>}
          {inventory !== null && (
            <div className="rpg-panel">
              {inventory.length === 0 && <p className="hint">Inventario vacío.</p>}
              <div className="guild-members-list">
                {inventory.map((item) => (
                  <div key={item.item_id} className="guild-member-row">
                    <div className="guild-member-info">
                      <span className="guild-member-name">{item.name}</span>
                      <span className="hint guild-member-sub">
                        {item.rarity} · {item.item_type} · x{item.quantity}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={dismantleQty[item.item_id] ?? 1}
                        onChange={(e) => setDismantleQty((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="rpg-input"
                        style={{ width: 52, textAlign: 'center', padding: '4px 6px' }}
                      />
                      <button
                        className="rpg-button rpg-button--small"
                        disabled={dismantleId === item.item_id}
                        onClick={() => handleDismantle(item)}
                      >
                        {dismantleId === item.item_id ? '...' : 'Desmantelar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
