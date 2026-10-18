import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import ItemIcon from './ItemIcon';
import audio from '../../game/audio';
import bus from '../../game/bus';
import { CraftSprite, STATION_SOUND, sheetLength, stationFor } from './CraftAnim';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import MaterialSources from './MaterialSources';
import { iconForItem, RARITY_LABELS, STAT_LABELS } from './itemIcons';

// dónde se fabrica cada receta (crafting_recipes.station en el back)
const STATION_LABEL = {
  forja: { icon: ['anvil', 'lorc'], text: 'Se fabrica en una forja' },
  pilar: { icon: ['water-drop', 'sbed'], text: 'Se llena en el Pilar de Aethra' },
  libre: { icon: ['knapsack', 'lorc'], text: 'Se puede fabricar en cualquier lado' },
};
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const STATIONS_POLL_MS = 3000;

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
// Se abre en cualquier lado (tecla U): pociones, comidas y refinados simples se hacen donde sea;
// el equipo y los lingotes piden estar en una forja y el agua, junto al Pilar de Aethra. Se
// fabrica uno por uno, con la animación de la estación y el efecto de cada resultado.
// filtros por tipo de pieza (los huecos del equipo que entran en cada uno)
const SLOT_FILTERS = [
  { code: 'todo', name: 'Todo', slots: [] },
  { code: 'arma', name: 'Armas', slots: ['WEAPON'] },
  { code: 'izq', name: 'Mano izq.', slots: ['OFFHAND'] },
  { code: 'armadura', name: 'Armadura', slots: ['HELMET', 'ARMOR', 'GLOVES', 'BOOTS'] },
  { code: 'joya', name: 'Accesorios', slots: ['ACCESSORY'] },
];

// la pieza frente a lo que llevas puesto en ese hueco (un arma a dos manos también quita la mano izquierda)
const statKey = (s) => `${s.stat}${s.percent ? '%' : ''}`;
const fmtStat = (v, percent) => `${Math.round(v * 10) / 10}${percent ? '%' : ''}`;
function StatCompare({ recipe }) {
  const sumBy = (list) => {
    const m = new Map();
    for (const s of list ?? []) m.set(statKey(s), { ...s, amount: (m.get(statKey(s))?.amount ?? 0) + Number(s.amount) });
    return m;
  };
  const now = sumBy(recipe.resultStats);
  const worn = sumBy(recipe.equipped?.stats);
  const keys = [...new Set([...now.keys(), ...worn.keys()])];
  return (
    <div className="wp-compare">
      <div className="wp-compare-head">
        {recipe.equipped ? <>Frente a lo que llevas: <b>{recipe.equipped.names.join(' + ')}</b></> : 'No llevas nada en ese hueco'}
        {recipe.twoHanded && recipe.equipped?.names.length > 1 && <small> (a dos manos: también se quita la mano izquierda)</small>}
      </div>
      <ul>
        {keys.map((k) => {
          const a = now.get(k); const b = worn.get(k);
          const s = a ?? b; const diff = (a?.amount ?? 0) - (b?.amount ?? 0);
          const cls = Math.abs(diff) < 0.05 ? 'same' : diff > 0 ? 'up' : 'down';
          return (
            <li key={k} className={`wp-compare--${cls}`}>
              <span>{STAT_LABELS[s.stat] ?? s.stat}</span>
              <b>{a ? `+${fmtStat(a.amount, s.percent)}` : '—'}</b>
              {recipe.equipped && <em>{cls === 'same' ? '=' : `${cls === 'up' ? '▲' : '▼'} ${fmtStat(Math.abs(diff), s.percent)}`}</em>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CraftingPanel({ onChanged, onClose, zIndex, onActivate, defaultPos, args }) {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('craft');
  const [recipes, setRecipes] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [cat, setCat] = useState('todo');
  const [search, setSearch] = useState('');
  // filtros de la lista: tipo de pieza y los interruptores (puedo fabricar, para mi nivel, sin candado)
  const [slotFilter, setSlotFilter] = useState('todo');
  const [onlyCraftable, setOnlyCraftable] = useState(false);
  const [onlyMyLevel, setOnlyMyLevel] = useState(false);
  const [hideLocked, setHideLocked] = useState(false);
  const [selCode, setSelCode] = useState(null);
  const [selItem, setSelItem] = useState(null);
  const [qty, setQty] = useState(1);
  // material del que se está mirando «¿Dónde?» (sale de dónde conseguirlo)
  const [whereOpen, setWhereOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  // fabricación en curso (o la última, con su resumen): ver craft()
  const [run, setRun] = useState(null);
  const stopRef = useRef(false);
  // ¿estás junto a una forja / al Pilar? (se pregunta cada pocos segundos mientras caminas)
  const [stations, setStations] = useState(null);

  // el libro de recetas (gprback/lib/recetas.js): las básicas descubiertas, las de pergamino (con
  // candado si no las aprendiste) y una fila "hidden" por cada básica sin descubrir (solo se cuentan)
  const [hidden, setHidden] = useState([]);
  const loadRecipes = useCallback(() => api.getCraftAvailable(player.id, token, true).then((list) => {
    setRecipes(list.filter((r) => !r.hidden));
    setHidden(list.filter((r) => r.hidden));
  }), [player, token]);
  const loadInventory = useCallback(() => api.getPlayerInventory(player.id, token).then(setInventory), [player, token]);

  useEffect(() => { loadRecipes().catch((e) => setError(e.message)); }, [loadRecipes]);
  useEffect(() => {
    const check = () => api.getCraftStations(player.id, token).then(setStations).catch(() => {});
    check();
    const t = setInterval(check, STATIONS_POLL_MS);
    return () => clearInterval(t);
  }, [player, token]);
  // abierta desde el Pilar ("Llenar frascos"): con esa receta elegida
  useEffect(() => {
    if (args?.recipe) {
      setTab('craft'); setCat('todo'); setSearch(''); setSlotFilter('todo'); setOnlyCraftable(false); setOnlyMyLevel(false); setHideLocked(false);
      setSelCode(args.recipe); setResult(null);
    }
  }, [args]);
  // si se cierra la ventana a mitad, se deja de fabricar
  useEffect(() => () => { stopRef.current = true; bus.emit('crafting', false); }, []);
  useEffect(() => { if (tab === 'dismantle') loadInventory().catch((e) => setError(e.message)); }, [tab, loadInventory]);

  const categories = useMemo(() => {
    const list = [{ code: 'todo', name: 'Todas', icon: ['hammer-drop', 'lorc'] }];
    const seen = new Set();
    for (const r of [...(recipes ?? []), ...hidden]) {
      if (r.classCode && !seen.has(r.classCode)) {
        seen.add(r.classCode);
        list.push({ code: r.classCode, name: r.className, icon: CLASS_ICON[r.classCode] ?? ['anvil', 'lorc'] });
      }
    }
    const all = [...(recipes ?? []), ...hidden];
    if (all.some((r) => r.resultType === 'CONSUMABLE')) list.push({ code: 'CONSUMABLE', name: 'Consumibles', icon: ['standing-potion', 'lorc'] });
    if (all.some((r) => r.resultType === 'MATERIAL')) list.push({ code: 'MATERIAL', name: 'Materiales y refinados', icon: ['metal-bar', 'lorc'] });
    return list;
  }, [recipes, hidden]);
  const inCat = useCallback((r) => cat === 'todo' || (cat === 'CONSUMABLE' || cat === 'MATERIAL' ? r.resultType === cat : r.classCode === cat), [cat]);
  // cuántas básicas faltan por descubrir en esta categoría (no se muestran: se descubren consiguiendo sus materiales)
  const undiscovered = hidden.filter(inCat).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // arriba las NUEVAS hasta que las abres; después por nivel de menor a mayor (sin nivel: consumibles
    // y materiales, primero) y, en el mismo nivel, las que puedes hacer antes que las de candado
    const slotOk = (r) => slotFilter === 'todo' || (r.resultType === 'EQUIPMENT' && SLOT_FILTERS.find((f) => f.code === slotFilter)?.slots.includes(r.resultSlot));
    return (recipes ?? []).filter((r) => inCat(r) && (!q || (!r.locked && r.resultName.toLowerCase().includes(q)))
      && slotOk(r) && (!onlyCraftable || r.canCraft) && (!onlyMyLevel || r.levelOk !== false) && (!hideLocked || !r.locked))
      .sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || (a.requiredLevel ?? 0) - (b.requiredLevel ?? 0)
        || Number(!!a.locked) - Number(!!b.locked) || Number(b.canCraft) - Number(a.canCraft) || a.resultName.localeCompare(b.resultName));
  }, [recipes, inCat, search, slotFilter, onlyCraftable, onlyMyLevel, hideLocked]);
  const anyFilter = slotFilter !== 'todo' || onlyCraftable || onlyMyLevel || hideLocked;
  // al abrir una receta nueva deja de ser "NUEVO"
  const openRecipe = (r) => {
    setSelCode(r.code);
    if (r.isNew) {
      setRecipes((list) => list.map((x) => (x.code === r.code ? { ...x, isNew: false } : x)));
      api.markCraftSeen(player.id, r.code, token).catch(() => {});
    }
  };

  const recipe = recipes?.find((r) => r.code === selCode) ?? filtered[0] ?? null;
  const craftable = recipe ? Math.min(99, ...recipe.ingredients.map((i) => Math.floor(i.have / Math.max(1, i.need)))) : 0;
  // aviso si la receta pide un lugar y no estás ahí (lo último que dijo el servidor)
  const stationNote = recipe?.station ? (stations ? stations[recipe.station] : recipe.stationNote) ?? null : null;

  // Fabricar uno por uno: la estación trabaja (martillazos, burbujas…) mientras el servidor decide
  // esa unidad, y después sale su efecto: éxito, suerte (mejor rareza) o fallo. "Detener" corta
  // antes de la siguiente unidad (las ya hechas quedan hechas).
  const craft = async () => {
    if (!recipe || busy) return;
    const station = stationFor(recipe);
    const total = qty;
    const itemIcon = iconForItem({ name: recipe.resultName, slot: recipe.resultSlot, item_type: recipe.resultType });
    stopRef.current = false;
    setBusy(true);
    setError(null);
    setResult(null);
    bus.emit('crafting', true);
    let st = { name: recipe.resultName, itemIcon, total, done: 0, ok: 0, lucky: 0, fail: 0, gained: 0, lost: {}, station, effect: null, key: 0, working: true };
    setRun(st);
    try {
      for (let i = 0; i < total && !stopRef.current; i += 1) {
        st = { ...st, effect: null, working: true };
        setRun(st);
        // eslint-disable-next-line no-await-in-loop
        const [r] = await Promise.all([api.craft(player.id, recipe.code, 1, token), wait(sheetLength(station))]);
        const lucky = (r.results ?? []).some((x) => x.qualityTier > 0);
        const effect = r.successCount > 0 ? (lucky ? 'suerte' : 'exito') : 'fallo';
        audio.sfx(effect === 'suerte' ? 'craft_suerte' : effect === 'exito' ? 'craft_ok' : 'craft_fallo');
        const lost = { ...st.lost };
        (r.lost ?? []).forEach((m) => { lost[m.name] = (lost[m.name] ?? 0) + m.quantity; });
        st = {
          ...st,
          done: st.done + 1,
          ok: st.ok + (r.successCount > 0 ? 1 : 0),
          lucky: st.lucky + (lucky ? 1 : 0),
          fail: st.fail + (r.failCount ?? 0),
          gained: st.gained + (r.totalGained ?? 0),
          lost,
          effect,
          rarity: r.results?.[0]?.rarity ?? null,
          key: st.key + 1,
          working: false,
        };
        setRun(st);
        // eslint-disable-next-line no-await-in-loop
        await wait(sheetLength(effect) + 250);
      }
    } catch (e) {
      setError(e.message);
      audio.sfx('error');
    } finally {
      bus.emit('crafting', false);
      setRun({ ...st, working: false, finished: true });
      setBusy(false);
      setQty(1);
      await loadRecipes().catch(() => {});
      onChanged?.();
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
      title="Taller"
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
            <span className="wp-cat-name">
              {categories.find((c) => c.code === cat)?.name}
              {undiscovered > 0 && <small className="wp-cat-hidden" title="Se descubren al conseguir alguno de sus materiales"> · {undiscovered} por descubrir</small>}
            </span>
            <input className="wp-search wp-search--inline" type="search" placeholder="Buscar receta…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="wp-filter-bar">
            {SLOT_FILTERS.map((f) => (
              <button key={f.code} type="button" className={`wp-filter${slotFilter === f.code ? ' wp-filter--on' : ''}`} onClick={() => setSlotFilter(f.code)}>{f.name}</button>
            ))}
            <span className="wp-filter-sep" />
            <button type="button" className={`wp-filter${onlyCraftable ? ' wp-filter--on' : ''}`} title="Solo las que tienes materiales para fabricar" onClick={() => setOnlyCraftable((v) => !v)}>Puedo fabricar</button>
            <button type="button" className={`wp-filter${onlyMyLevel ? ' wp-filter--on' : ''}`} title="Oculta el equipo que todavía no puedes equipar" onClick={() => setOnlyMyLevel((v) => !v)}>Para mi nivel</button>
            <button type="button" className={`wp-filter${hideLocked ? ' wp-filter--on' : ''}`} title="Oculta las recetas de pergamino que no aprendiste" onClick={() => setHideLocked((v) => !v)}>Sin candado</button>
            {anyFilter && (
              <button type="button" className="wp-filter wp-filter--clear" title="Quitar los filtros" onClick={() => { setSlotFilter('todo'); setOnlyCraftable(false); setOnlyMyLevel(false); setHideLocked(false); }}>✕</button>
            )}
          </div>
          <div className="wp-craft">
            <ul className="wp-recipe-list">
              {!recipes && <li className="wp-empty">Cargando…</li>}
              {recipes && filtered.length === 0 && anyFilter && <li className="wp-empty">Ninguna receta con estos filtros.</li>}
              {recipes && filtered.length === 0 && !anyFilter && <li className="wp-empty">{undiscovered > 0 ? 'Todavía no descubriste ninguna: consigue materiales (cazando, recolectando o comprando) y aparecen solas.' : 'Sin recetas. Desbloquea zonas y derrota jefes para aprender más.'}</li>}
              {filtered.map((r) => {
                const icon = iconForItem({ name: r.resultName, slot: r.resultSlot, item_type: r.resultType });
                const n = Math.min(...r.ingredients.map((i) => Math.floor(i.have / Math.max(1, i.need))));
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`wp-recipe${recipe?.code === r.code ? ' wp-recipe--sel' : ''}${r.canCraft ? '' : ' wp-recipe--missing'}${r.locked ? ' wp-recipe--locked' : ''}`}
                      onClick={() => { if (busy) return; openRecipe(r); setQty(1); setResult(null); setRun(null); }}
                    >
                      {r.locked ? (
                        <>
                          <span className="wp-slot wp-slot--sm wp-slot--locked"><GameIcon name="padlock" artist="lorc" /></span>
                          <span className="wp-recipe-name" title={`Se aprende con ${r.scrollName} o consiguiendo esta pieza`}>???</span>
                        </>
                      ) : (
                        <>
                          <span className={`wp-slot wp-slot--sm wp-rarity-${(r.rarity || 'COMUN').toLowerCase()}`}><ItemIcon icon={icon} /></span>
                          <span className={`wp-recipe-name wp-text-${(r.rarity || 'COMUN').toLowerCase()}`}>{r.resultName}</span>
                        </>
                      )}
                      {r.isNew && <span className="wp-recipe-new">NUEVO</span>}
                      {r.otherClass && (
                        <span className="wp-recipe-other" title={`Es para ${r.className ?? 'otra clase'}: tú no te la puedes equipar. Sirve para venderla o regalarla.`}>
                          {r.className ?? 'Otra clase'}
                        </span>
                      )}
                      {r.requiredLevel && (
                        <span className={`wp-recipe-lv${r.levelOk ? '' : ' wp-recipe-lv--high'}`} title={r.levelOk ? `Se equipa desde el nivel ${r.requiredLevel}` : `Necesitas nivel ${r.requiredLevel} para equiparlo`}>
                          Nv {r.requiredLevel}
                        </span>
                      )}
                      {r.canCraft && <span className="wp-recipe-count" title="Puedes fabricar">{n}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            <section className="wp-craft-detail">
              {recipe?.locked && (
                <>
                  <header className="wp-craft-head">
                    <span className="wp-slot wp-slot--lg wp-slot--locked"><GameIcon name="padlock" artist="lorc" /></span>
                    <div>
                      <strong>???</strong>
                      <small>Set de jefe{recipe.className ? ` · ${recipe.className}` : ''}{recipe.requiredLevel ? ` · Nivel ${recipe.requiredLevel}` : ''}</small>
                    </div>
                  </header>
                  <div className="wp-craft-locked">
                    <b>🔒 Receta sin aprender</b>
                    <span><b>{recipe.scrollName}</b> te enseña todo el set. También aprendes esta pieza si la consigues.</span>
                    {(recipe.scrollSources ?? []).map((s) => (
                      <span key={s.monster}><b>{s.monster}</b> · pieza del set {s.pieceChance}% · pergamino {s.chance}% por victoria</span>
                    ))}
                  </div>
                </>
              )}
              {recipe && !recipe.locked && (
                <>
                  <header className="wp-craft-head">
                    <span
                      className={`wp-slot wp-slot--lg wp-rarity-${(recipe.rarity || 'COMUN').toLowerCase()}`}
                      onMouseMove={(e) => recipe.resultItemId && setHover({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <ItemIcon icon={resultIcon} />
                      {recipe.resultQuantity > 1 && <span className="wp-slot-qty">{recipe.resultQuantity}</span>}
                    </span>
                    <div>
                      <strong className={`wp-text-${(recipe.rarity || 'COMUN').toLowerCase()}`}>{recipe.resultName}</strong>
                      <small>{RARITY_LABELS[recipe.rarity] ?? recipe.rarity}{recipe.className ? ` · ${recipe.className}` : ''}{recipe.twoHanded ? ' · Dos manos' : ''}{recipe.artisanName ? ` · ${recipe.artisanName}` : ''}</small>
                      {recipe.requiredLevel && (
                        <small className={recipe.levelOk ? 'wp-craft-lv' : 'wp-craft-lv wp-craft-lv--high'}>
                          Requiere nivel {recipe.requiredLevel}{recipe.levelOk ? '' : ' · todavía no puedes equiparlo'}
                        </small>
                      )}
                      {recipe.otherClass && (
                        <small className="wp-craft-other">
                          Es para {recipe.className ?? 'otra clase'}: tú no te la puedes equipar (sirve para venderla o regalarla)
                        </small>
                      )}
                    </div>
                  </header>
                  {recipe.description && <p className="wp-craft-desc">{recipe.description}</p>}
                  {recipe.resultStats && <StatCompare recipe={recipe} />}
                  <div className="wp-craft-stats">
                    <span>Éxito <b>{recipe.successRate}%</b></span>
                    <span>Obtienes <b>x{recipe.resultQuantity}</b></span>
                  </div>
                  {(() => {
                    const s = STATION_LABEL[recipe.station ?? 'libre'] ?? STATION_LABEL.libre;
                    return (
                      <div className={`craft-station${stationNote ? ' craft-station--far' : ''}`}>
                        <GameIcon name={s.icon[0]} artist={s.icon[1]} /> {s.text} {stationNote ? '' : '✓'}
                        {stationNote && <small>{stationNote}</small>}
                      </div>
                    );
                  })()}
                  <h4 className="wp-section-title">Materiales</h4>
                  <ul className="wp-mats">
                    {recipe.ingredients.map((ing, i) => {
                      const icon = iconForItem({ name: ing.itemName });
                      const ok = ing.have >= ing.need * qty;
                      const open = whereOpen === ing.itemId;
                      return [
                        <li key={`${ing.itemId}-${i}`} className={ok ? '' : 'wp-mat--missing'}>
                          <span className="wp-slot wp-slot--sm"><ItemIcon icon={icon} /></span>
                          <span className="wp-mat-name">{ing.itemName}</span>
                          {/* de dónde sale el material que te falta (monstruos, recursos, forja, tienda) */}
                          {!ok && (
                            <button type="button" className={`wp-mat-where${open ? ' on' : ''}`} onClick={() => setWhereOpen(open ? null : ing.itemId)}>
                              ¿Dónde?
                            </button>
                          )}
                          <span className="wp-mat-count"><b>{ing.have}</b> / {ing.need * qty}</span>
                        </li>,
                        open && !ok && (
                          <li key={`${ing.itemId}-${i}-src`} className="wp-mat-src-row">
                            <MaterialSources playerId={player.id} itemId={ing.itemId} token={token} />
                          </li>
                        ),
                      ];
                    })}
                  </ul>
                  <div className="wp-deal">
                    <Stepper value={qty} max={Math.max(1, craftable)} onChange={setQty} />
                    {busy
                      ? <button type="button" className="wp-btn" onClick={() => { stopRef.current = true; }}>Detener</button>
                      : <button type="button" className="wp-btn wp-btn--gold" disabled={!recipe.canCraft || !!stationNote} onClick={craft}>Fabricar</button>}
                  </div>
                </>
              )}
              {run && (
                <div className="craft-stage">
                  <div className="craft-stage-art">
                    <CraftSprite
                      name={run.station}
                      onFrame={(i) => { const s = run.working && STATION_SOUND[run.station]?.[i]; if (s) audio.sfx(s); }}
                    />
                    {run.effect && <CraftSprite key={run.key} name={run.effect} loop={false} className="craft-effect" />}
                    {run.effect && (
                      <span key={`item-${run.key}`} className={`craft-stage-item${run.effect === 'fallo' ? ' craft-stage-item--fallo' : ''}`}>
                        <ItemIcon icon={run.itemIcon} />
                      </span>
                    )}
                  </div>
                  <div className={`craft-stage-caption${run.effect ? ` craft-stage-caption--${run.effect}` : ''}`}>
                    {run.finished
                      ? (run.done === 0 ? 'No se fabricó nada' : `${run.name}: listo`)
                      : run.working
                        ? `Fabricando ${run.name}… ${run.done + 1}/${run.total}`
                        : run.effect === 'suerte'
                          ? `¡Qué suerte! Salió ${RARITY_LABELS[run.rarity] ?? 'mejor'}`
                          : run.effect === 'exito' ? '¡Salió bien!' : 'Falló… se perdió parte del material'}
                  </div>
                  <div className="craft-progress"><span style={{ width: `${(run.done / Math.max(1, run.total)) * 100}%` }} /></div>
                  {run.finished && (
                    <>
                      <div className="craft-summary">
                        {run.gained > 0 && <span className="ok">✓ {run.gained}x {run.name}</span>}
                        {run.lucky > 0 && <span className="lucky">★ {run.lucky} con suerte</span>}
                        {run.fail > 0 && <span className="err">✗ {run.fail} {run.fail === 1 ? 'fallo' : 'fallos'}</span>}
                      </div>
                      {Object.keys(run.lost).length > 0 && (
                        <div className="craft-lost">Perdiste: {Object.entries(run.lost).map(([n, q]) => `${q}x ${n}`).join(', ')}</div>
                      )}
                      <button type="button" className="wp-btn" onClick={() => setRun(null)}>Listo</button>
                    </>
                  )}
                </div>
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
            {/* solo el equipo se desmantela (gprback/lib/desmantelar.js): devuelve 1 o 2 de sus materiales al
                azar, nunca las piezas de jefe, y según la rareza a veces una piedra de encantamiento */}
            {(inventory ?? []).filter((i) => i.quantity > 0 && i.item_type === 'EQUIPMENT').map((it) => {
              const icon = iconForItem(it);
              return (
                <button
                  key={it.inventory_id}
                  type="button"
                  className={`wp-slot wp-rarity-${(it.rarity || 'COMUN').toLowerCase()}${selItem?.inventory_id === it.inventory_id ? ' wp-slot--sel' : ''}`}
                  onClick={() => { setSelItem(it); setQty(1); setResult(null); }}
                >
                  <ItemIcon icon={icon} />
                  {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
                </button>
              );
            })}
            {inventory === null && <p className="wp-empty">Cargando…</p>}
          </div>
          <section className="wp-craft-detail">
            {!selItem && !result && <p className="wp-deal-hint">Elige un equipo de la mochila para romperlo: recuperas uno o dos de sus materiales, al azar. Las piezas raras, épicas y legendarias a veces dejan una piedra de encantamiento. Las piezas de jefe (coronas, yelmos, núcleos…) no vuelven.</p>}
            {selItem && (
              <>
                <header className="wp-craft-head">
                  <span className={`wp-slot wp-slot--lg wp-rarity-${(selItem.rarity || 'COMUN').toLowerCase()}`}>
                    <ItemIcon icon={iconForItem(selItem)} />
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
      {hover && recipe && !recipe.locked && (
        <ItemTooltip item={{ itemId: recipe.resultItemId, name: recipe.resultName, rarity: recipe.rarity, itemType: recipe.resultType, slot: recipe.resultSlot }} x={hover.x} y={hover.y} token={token} />
      )}
    </FloatingPanel>
  );
}
