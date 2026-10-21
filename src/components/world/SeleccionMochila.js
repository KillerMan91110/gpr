import ItemIcon from './ItemIcon';
import { iconForItem } from './itemIcons';

// Elegir cosas de la mochila para venderlas o desmantelarlas (MerchantPanel y CraftingPanel), igual en los dos:
// clic en una casilla la marca (✓) o la desmarca; lo que tiene candado se ve apagado y no se puede elegir.
// Arriba, filtros por rareza y atajos («Marcar lo que no usas», «Limpiar»).
//   sel: Map inventory_id → cantidad elegida; onChange(nuevoMap)
export const RAREZAS_FILTRO = [['', 'Todo'], ['COMUN', 'Común'], ['POCO_COMUN', 'Poco común'], ['RARO', 'Raro'], ['EPICO', 'Épico'], ['LEGENDARIO', 'Legendario']];

export default function SeleccionMochila({ items, sel, onChange, filtro, onFiltro, atajos = [], onHover, vacio }) {
  const visibles = filtro ? items.filter((i) => (i.rarity || 'COMUN') === filtro) : items;
  const toggle = (it) => {
    if (it.favorito) return;
    const n = new Map(sel);
    if (n.has(it.inventory_id)) n.delete(it.inventory_id);
    else n.set(it.inventory_id, it.quantity);
    onChange(n);
  };
  return (
    <div className="wp-selmo">
      <div className="wp-selmo-bar">
        {RAREZAS_FILTRO.map(([r, label]) => (
          <button key={r || 'todo'} type="button" className={`wp-selmo-chip${filtro === r ? ' is-on' : ''}${r ? ` wp-text-${r.toLowerCase()}` : ''}`} onClick={() => onFiltro(r)}>
            {label}
          </button>
        ))}
        <span className="wp-selmo-sep" />
        {atajos.map((a) => (
          <button key={a.label} type="button" className="wp-selmo-chip wp-selmo-chip--accion" disabled={a.disabled} title={a.title} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
        {sel.size > 0 && <button type="button" className="wp-selmo-chip" onClick={() => onChange(new Map())}>Limpiar ({sel.size})</button>}
      </div>
      <div className="wp-bag-grid wp-sell-grid">
        {visibles.map((it) => {
          const rarity = (it.effective_rarity || it.rarity || 'COMUN').toLowerCase();
          const on = sel.has(it.inventory_id);
          return (
            <button
              key={it.inventory_id}
              type="button"
              className={`wp-slot wp-rarity-${rarity}${on ? ' wp-slot--chk' : ''}${it.favorito ? ' wp-slot--locked' : ''}`}
              onClick={() => toggle(it)}
              onMouseMove={(e) => onHover?.({ it, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => onHover?.(null)}
              title={it.favorito ? 'Tiene candado: quítaselo en la mochila' : undefined}
            >
              <ItemIcon icon={iconForItem(it)} />
              {it.favorito && <span className="wp-slot-lock" aria-label="Con candado">🔒</span>}
              {it.mejora && <span className="wp-slot-up" aria-label="Mejor que lo que llevas">▲</span>}
              {it.enchant_level > 0 && <span className="wp-slot-enchant">+{it.enchant_level}</span>}
              {it.quantity > 1 && <span className="wp-slot-qty">{on && sel.get(it.inventory_id) !== it.quantity ? `${sel.get(it.inventory_id)}/` : ''}{it.quantity}</span>}
              {on && <span className="wp-slot-chk" aria-label="Elegido">✓</span>}
            </button>
          );
        })}
        {Array.from({ length: Math.max(0, 36 - visibles.length) }, (_, i) => <span key={`v-${i}`} className="wp-slot wp-slot--empty" />)}
      </div>
      {!visibles.length && vacio && <p className="wp-empty">{vacio}</p>}
    </div>
  );
}
