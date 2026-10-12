import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, RARITY_LABELS } from './itemIcons';

const CLASS_ICON = {
  GUERRERO: ['broadsword', 'lorc'], MAGO: ['wizard-staff', 'lorc'], ARQUERO: ['bow-arrow', 'delapouite'],
  PICARO: ['plain-dagger', 'lorc'], SACERDOTE: ['holy-symbol', 'lorc'],
};

function Stepper({ value, max, onChange }) {
  const set = (v) => onChange(Math.max(1, Math.min(Math.max(1, max), Number(v) || 1)));
  return (
    <span className="wp-qty">
      <button type="button" onClick={() => set(value - 1)} disabled={value <= 1}>−</button>
      <input type="number" min={1} max={max} value={value} onChange={(e) => set(e.target.value)} />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max}>+</button>
      <button type="button" className="wp-qty-max" onClick={() => set(max)} disabled={value >= max}>Máx</button>
    </span>
  );
}

// Taller al estilo del registro de oficios de FFXIV: categorías arriba, recetas a la izquierda
// (con cuántas se pueden hacer) y a la derecha el resultado, los materiales tienes/necesitas y
// el botón de fabricar. La pestaña Desmantelar usa la mochila.
export default function CraftingPanel({ onChanged, onClose, zIndex, onActivate, defaultPos }) {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('craft');
  const [recipes, setRecipes] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [cat, setCat] = useState('todo');
  const [search, setSearch] = useState('');
  const [selCode, setSelCode] = useState(null);
  const [selItem, setSelItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);

  const loadRecipes = useCallback(() => api.getCraftAvailable(player.id, token).then(setRecipes), [player, token]);
  const loadInventory = useCallback(() => api.getPlayerInventory(player.id, token).then(setInventory), [player, token]);

  useEffect(() => { loadRecipes().catch((e) => setError(e.message)); }, [loadRecipes]);
  useEffect(() => { if (tab === 'dismantle') loadInventory().catch((e) => setError(e.message)); }, [tab, loadInventory]);

  const categories = useMemo(() => {
    const list = [{ code: 'todo', name: 'Todas', icon: ['hammer-drop', 'lorc'] }];
    const seen = new Set();
    for (const r of recipes ?? []) {
      if (r.classCode && !seen.has(r.classCode)) {
        seen.add(r.classCode);
        list.push({ code: r.classCode, name: r.className, icon: CLASS_ICON[r.classCode] ?? ['anvil', 'lorc'] });
      }
    }
    if ((recipes ?? []).some((r) => r.resultType === 'CONSUMABLE')) list.push({ code: 'CONSUMABLE', name: 'Consumibles', icon: ['standing-potion', 'lorc'] });
    return list;
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (recipes ?? []).filter((r) => (cat === 'todo' || (cat === 'CONSUMABLE' ? r.resultType === 'CONSUMABLE' : r.classCode === cat))
      && (!q || r.resultName.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.canCraft) - Number(a.canCraft));
  }, [recipes, cat, search]);

  const recipe = recipes?.find((r) => r.code === selCode) ?? filtered[0] ?? null;
  const craftable = recipe ? Math.min(99, ...recipe.ingredients.map((i) => Math.floor(i.have / Math.max(1, i.need)))) : 0;

  const craft = async () => {
    if (!recipe || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.craft(player.id, recipe.code, qty, token);
      setResult({ type: 'craft', name: recipe.resultName, ...r });
      setQty(1);
      await loadRecipes();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const dismantle = async () => {
    if (!selItem || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.dismantle(player.id, selItem.item_id, qty, token);
      setResult({ type: 'dismantle', name: selItem.name, quantity: qty, materials: r.materials ?? [] });
      setSelItem(null);
      setQty(1);
      await loadInventory();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resultIcon = recipe ? iconForItem({ name: recipe.resultName, slot: recipe.resultSlot, item_type: recipe.resultType }) : null;

  return (
    <FloatingPanel
      id="taller"
      title="Taller del herrero"
      icon={<GameIcon name="anvil" artist="lorc" />}
      width={700}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={(
        <div className="wp-tabs">
          <button type="button" className={`wp-tab${tab === 'craft' ? ' wp-tab--active' : ''}`} onClick={() => { setTab('craft'); setResult(null); setQty(1); }}>Fabricar</button>
          <button type="button" className={`wp-tab${tab === 'dismantle' ? ' wp-tab--active' : ''}`} onClick={() => { setTab('dismantle'); setResult(null); setQty(1); }}>Desmantelar</button>
          <span className="wp-foot-note err">{error}</span>
        </div>
      )}
    >
      {tab === 'craft' && (
        <>
          <div className="wp-cat-bar">
            {categories.map((c) => (
              <button key={c.code} type="button" title={c.name} className={`wp-cat${cat === c.code ? ' wp-cat--active' : ''}`} onClick={() => { setCat(c.code); setSelCode(null); }}>
                <GameIcon name={c.icon[0]} artist={c.icon[1]} />
              </button>
            ))}
            <span className="wp-cat-name">{categories.find((c) => c.code === cat)?.name}</span>
            <input className="wp-search wp-search--inline" type="search" placeholder="Buscar receta…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="wp-craft">
            <ul className="wp-recipe-list">
              {!recipes && <li className="wp-empty">Cargando…</li>}
              {recipes && filtered.length === 0 && <li className="wp-empty">Sin recetas. Desbloquea zonas y derrota jefes para aprender más.</li>}
              {filtered.map((r) => {
                const icon = iconForItem({ name: r.resultName, slot: r.resultSlot, item_type: r.resultType });
                const n = Math.min(...r.ingredients.map((i) => Math.floor(i.have / Math.max(1, i.need))));
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`wp-recipe${recipe?.code === r.code ? ' wp-recipe--sel' : ''}${r.canCraft ? '' : ' wp-recipe--missing'}`}
                      onClick={() => { setSelCode(r.code); setQty(1); setResult(null); }}
                    >
                      <span className={`wp-slot wp-slot--sm wp-rarity-${(r.rarity || 'COMUN').toLowerCase()}`}><GameIcon name={icon.name} artist={icon.artist} /></span>
                      <span className={`wp-recipe-name wp-text-${(r.rarity || 'COMUN').toLowerCase()}`}>{r.resultName}</span>
                      {r.canCraft && <span className="wp-recipe-count" title="Puedes fabricar">{n}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            <section className="wp-craft-detail">
              {recipe && (
                <>
                  <header className="wp-craft-head">
                    <span
                      className={`wp-slot wp-slot--lg wp-rarity-${(recipe.rarity || 'COMUN').toLowerCase()}`}
                      onMouseMove={(e) => recipe.resultItemId && setHover({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <GameIcon name={resultIcon.name} artist={resultIcon.artist} />
                      {recipe.resultQuantity > 1 && <span className="wp-slot-qty">{recipe.resultQuantity}</span>}
                    </span>
                    <div>
                      <strong className={`wp-text-${(recipe.rarity || 'COMUN').toLowerCase()}`}>{recipe.resultName}</strong>
                      <small>{RARITY_LABELS[recipe.rarity] ?? recipe.rarity}{recipe.className ? ` · ${recipe.className}` : ''}{recipe.artisanName ? ` · ${recipe.artisanName}` : ''}</small>
                    </div>
                  </header>
                  {recipe.description && <p className="wp-craft-desc">{recipe.description}</p>}
                  <div className="wp-craft-stats">
                    <span>Éxito <b>{recipe.successRate}%</b></span>
                    <span>Obtienes <b>x{recipe.resultQuantity}</b></span>
                  </div>
                  <h4 className="wp-section-title">Materiales</h4>
                  <ul className="wp-mats">
                    {recipe.ingredients.map((ing, i) => {
                      const icon = iconForItem({ name: ing.itemName });
                      const ok = ing.have >= ing.need * qty;
                      return (
                        <li key={`${ing.itemId}-${i}`} className={ok ? '' : 'wp-mat--missing'}>
                          <span className="wp-slot wp-slot--sm"><GameIcon name={icon.name} artist={icon.artist} /></span>
                          <span className="wp-mat-name">{ing.itemName}</span>
                          <span className="wp-mat-count"><b>{ing.have}</b> / {ing.need * qty}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="wp-deal">
                    <Stepper value={qty} max={Math.max(1, craftable)} onChange={setQty} />
                    <button type="button" className="wp-btn wp-btn--gold" disabled={!recipe.canCraft || busy} onClick={craft}>
                      {busy ? 'Fabricando…' : 'Fabricar'}
                    </button>
                  </div>
                </>
              )}
              {result && (
                <div className="wp-craft-result">
                  <strong>{result.type === 'craft' ? result.name : `Desmantelado: ${result.quantity}x ${result.name}`}</strong>
                  {result.type === 'craft' && (result.results ?? []).map((r) => (
                    <span key={r.qualityTier} className="ok">✓ {r.quantity}x {RARITY_LABELS[r.rarity] ?? r.rarity}{r.qualityTier > 0 ? ' · ¡Suerte!' : ''}</span>
                  ))}
                  {result.type === 'craft' && result.failCount > 0 && <span className="err">✗ Falló {result.failCount} {result.failCount === 1 ? 'vez' : 'veces'}</span>}
                  {result.type === 'dismantle' && result.materials.length === 0 && <span>No se recuperó ningún material.</span>}
                  {result.type === 'dismantle' && result.materials.map((m) => <span key={m.id} className="ok">✓ {m.quantity}x {m.name}</span>)}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {tab === 'dismantle' && (
        <div className="wp-craft">
          <div className="wp-bag-grid wp-sell-grid">
            {(inventory ?? []).filter((i) => i.quantity > 0).map((it) => {
              const icon = iconForItem(it);
              return (
                <button
                  key={it.inventory_id}
                  type="button"
                  className={`wp-slot wp-rarity-${(it.rarity || 'COMUN').toLowerCase()}${selItem?.inventory_id === it.inventory_id ? ' wp-slot--sel' : ''}`}
                  onClick={() => { setSelItem(it); setQty(1); setResult(null); }}
                >
                  <GameIcon name={icon.name} artist={icon.artist} />
                  {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
                </button>
              );
            })}
            {inventory === null && <p className="wp-empty">Cargando…</p>}
          </div>
          <section className="wp-craft-detail">
            {!selItem && !result && <p className="wp-deal-hint">Elige un objeto de la mochila para romperlo y recuperar materiales.</p>}
            {selItem && (
              <>
                <header className="wp-craft-head">
                  <span className={`wp-slot wp-slot--lg wp-rarity-${(selItem.rarity || 'COMUN').toLowerCase()}`}>
                    <GameIcon name={iconForItem(selItem).name} artist={iconForItem(selItem).artist} />
                  </span>
                  <div>
                    <strong className={`wp-text-${(selItem.rarity || 'COMUN').toLowerCase()}`}>{selItem.name}</strong>
                    <small>{RARITY_LABELS[selItem.rarity] ?? selItem.rarity} · tienes {selItem.quantity}</small>
                  </div>
                </header>
                <div className="wp-deal">
                  <Stepper value={qty} max={Math.min(99, selItem.quantity)} onChange={setQty} />
                  <button type="button" className="wp-btn wp-btn--danger" disabled={busy} onClick={dismantle}>{busy ? '…' : 'Desmantelar'}</button>
                </div>
              </>
            )}
            {result && (
              <div className="wp-craft-result">
                <strong>Desmantelado: {result.quantity}x {result.name}</strong>
                {result.materials.length === 0 && <span>No se recuperó ningún material.</span>}
                {result.materials.map((m) => <span key={m.id} className="ok">✓ {m.quantity}x {m.name}</span>)}
              </div>
            )}
          </section>
        </div>
      )}
      {hover && recipe && (
        <ItemTooltip item={{ itemId: recipe.resultItemId, name: recipe.resultName, rarity: recipe.rarity, itemType: recipe.resultType, slot: recipe.resultSlot }} x={hover.x} y={hover.y} token={token} />
      )}
    </FloatingPanel>
  );
}
