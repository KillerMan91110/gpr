import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

const FORBIDDEN_MSG = 'No tenés permiso de administrador';

const SLOTS = ['WEAPON', 'OFFHAND', 'HELMET', 'ARMOR', 'GLOVES', 'BOOTS', 'ACCESSORY'];
const SLOT_LABELS = {
  WEAPON: 'Arma', OFFHAND: 'Offhand', HELMET: 'Casco', ARMOR: 'Armadura',
  GLOVES: 'Guantes', BOOTS: 'Botas', ACCESSORY: 'Accesorio',
};
const RARITY_ORDER = ['COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO', 'UNICO'];
const RARITY_LABELS = {
  COMUN: 'Común', POCO_COMUN: 'Poco Común', RARO: 'Raro', EPICO: 'Épico', LEGENDARIO: 'Legendario', UNICO: 'Único',
};

function sortItems(list, desc) {
  return [...list].sort((a, b) => {
    const la = Number(a.requiredLevel) || 0;
    const lb = Number(b.requiredLevel) || 0;
    if (la !== lb) return desc ? lb - la : la - lb;
    return a.name.localeCompare(b.name);
  });
}

// Una evolución es otra fila de `classes`, encadenada por `evolutions` (classId -> evolvesToClassId)
// -- no hay tabla propia "evoluciones". Raíz = clase que nunca aparece como destino de evolución.
function rootClasses(classes, evolutions) {
  const targets = new Set(evolutions.map((e) => e.evolvesToClassId));
  return classes.filter((c) => !targets.has(c.id));
}
function findRootOf(evolutions, classId) {
  if (classId == null) return null;
  const parentOf = new Map(evolutions.map((e) => [e.evolvesToClassId, e.classId]));
  let current = classId;
  while (parentOf.has(current)) current = parentOf.get(current);
  return current;
}
function classTree(classes, evolutions, rootId) {
  const byId = new Map(classes.map((c) => [c.id, c]));
  const childrenByParent = new Map();
  for (const e of evolutions) {
    if (!childrenByParent.has(e.classId)) childrenByParent.set(e.classId, []);
    childrenByParent.get(e.classId).push(e.evolvesToClassId);
  }
  const out = [];
  (function walk(id, depth) {
    const c = byId.get(id);
    if (!c) return;
    out.push({ id: c.id, name: c.name, depth });
    for (const childId of childrenByParent.get(id) || []) walk(childId, depth + 1);
  })(rootId, 0);
  return out;
}

function ClassEvolutionPicker({ classId, classes, evolutions, onChange }) {
  const roots = rootClasses(classes, evolutions);
  const selectedRoot = findRootOf(evolutions, classId);
  const tree = selectedRoot != null ? classTree(classes, evolutions, selectedRoot) : [];

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <select
        className="rpg-input"
        value={selectedRoot ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        style={{ maxWidth: 160 }}
      >
        <option value="">Cualquier clase</option>
        {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {selectedRoot != null && (
        <select
          className="rpg-input"
          value={classId ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ maxWidth: 200 }}
        >
          {tree.map((c) => (
            <option key={c.id} value={c.id}>{'—'.repeat(c.depth)} {c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, width = 140, type = 'text' }) {
  return (
    <label className="hint" style={{ display: 'flex', flexDirection: 'column', gap: 2, width }}>
      {label}
      <input
        type={type}
        className="rpg-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width, padding: '4px 6px' }}
      />
    </label>
  );
}

export default function AdminItems() {
  const { player, token } = useAuth();
  const [slot, setSlot] = useState('WEAPON');
  const [classFilter, setClassFilter] = useState('');
  const [sortDesc, setSortDesc] = useState(false);
  const [data, setData] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [newBonusForm, setNewBonusForm] = useState({});
  const [confirmDeleteBonus, setConfirmDeleteBonus] = useState(null);

  useEffect(() => {
    if (!player) return;
    api.getAdminItems(token, slot).then(setData).catch((err) => {
      if (err.message === FORBIDDEN_MSG) setForbidden(true);
      else setError(err.message);
    });
  }, [player, token, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateItemField(itemId, key, value) {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === itemId ? { ...i, [key]: value } : i)),
    }));
  }

  async function handleSaveItem(item) {
    setError('');
    setMessage('');
    const key = `item-${item.id}`;
    setSavingKey(key);
    try {
      const body = {
        name: item.name,
        slot: item.slot,
        isTwoHanded: !!item.isTwoHanded,
        rarity: item.rarity,
        classId: item.classId,
        requiredLevel: item.requiredLevel === '' || item.requiredLevel == null ? null : Number(item.requiredLevel),
        isCraftable: !!item.isCraftable,
        obtainMethod: item.obtainMethod || null,
        buyPrice: item.buyPrice === '' || item.buyPrice == null ? null : Number(item.buyPrice),
        description: item.description || null,
      };
      const res = await api.updateAdminItem(item.id, body, token);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id === item.id ? { ...i, ...res, statBonuses: i.statBonuses } : i)),
      }));
      setMessage(`${item.name} actualizado.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleAddBonus(item) {
    const form = newBonusForm[item.id] || {};
    if (!form.statCode || form.amount === undefined || form.amount === '') {
      setError('Completá código de stat y monto para agregar el bono.');
      return;
    }
    setError('');
    setMessage('');
    const key = `bonus-new-${item.id}`;
    setSavingKey(key);
    try {
      const res = await api.createAdminItemStatBonus(item.id, {
        statCode: form.statCode,
        amount: Number(form.amount),
        isPercent: !!form.isPercent,
        durationTurns: form.durationTurns ? Number(form.durationTurns) : null,
      }, token);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id === item.id ? { ...i, statBonuses: [...i.statBonuses, res] } : i)),
      }));
      setNewBonusForm((prev) => ({ ...prev, [item.id]: {} }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  function updateBonusField(itemId, bonusId, key, value) {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id !== itemId ? i : {
        ...i,
        statBonuses: i.statBonuses.map((b) => (b.id === bonusId ? { ...b, [key]: value } : b)),
      })),
    }));
  }

  async function handleSaveBonus(itemId, bonus) {
    setError('');
    setMessage('');
    const key = `bonus-${bonus.id}`;
    setSavingKey(key);
    try {
      const res = await api.updateAdminItemStatBonus(itemId, bonus.id, {
        statCode: bonus.statCode,
        amount: Number(bonus.amount),
        isPercent: !!bonus.isPercent,
        durationTurns: bonus.durationTurns === '' || bonus.durationTurns == null ? null : Number(bonus.durationTurns),
      }, token);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id !== itemId ? i : {
          ...i,
          statBonuses: i.statBonuses.map((b) => (b.id === bonus.id ? res : b)),
        })),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDeleteBonus(itemId, bonusId) {
    setError('');
    setMessage('');
    setConfirmDeleteBonus(null);
    const key = `bonus-${bonusId}`;
    setSavingKey(key);
    try {
      await api.deleteAdminItemStatBonus(itemId, bonusId, token);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id !== itemId ? i : { ...i, statBonuses: i.statBonuses.filter((b) => b.id !== bonusId) })),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  if (forbidden) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1><GameIcon name="pointy-sword" artist="lorc" /> Admin: Equipo</h1>
          <Link className="logout-btn" to="/">Volver</Link>
        </header>
        <p className="auth-error">{FORBIDDEN_MSG}</p>
      </div>
    );
  }

  if (error && !data) return <div className="dashboard-error">Error: {error}</div>;
  if (!data) return <div className="dashboard-loading">Cargando...</div>;

  const roots = rootClasses(data.classes, data.evolutions);
  const filtered = classFilter === ''
    ? data.items
    : data.items.filter((i) => findRootOf(data.evolutions, i.classId) === Number(classFilter));
  const items = sortItems(filtered, sortDesc);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="pointy-sword" artist="lorc" /> Admin: Equipo</h1>
          <p className="dashboard-subtitle">Editá cualquier ítem de equipo del juego: stats, clase/evolución, rareza y sus bonos.</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="craft-filter-bar">
        <select className="rpg-input" value={slot} onChange={(e) => setSlot(e.target.value)} style={{ maxWidth: 200 }}>
          {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
        </select>
        <select className="rpg-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Todas las clases</option>
          {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          className="rpg-input"
          value={sortDesc ? 'desc' : 'asc'}
          onChange={(e) => setSortDesc(e.target.value === 'desc')}
          style={{ maxWidth: 200 }}
        >
          <option value="asc">Nivel: menor a mayor</option>
          <option value="desc">Nivel: mayor a menor</option>
        </select>
      </div>

      <div className="zone-list">
        {items.map((item) => {
          const saving = savingKey === `item-${item.id}`;
          const bonusForm = newBonusForm[item.id] || {};
          const addingBonus = savingKey === `bonus-new-${item.id}`;
          return (
            <div key={item.id} className="zone-card rpg-panel">
              <div className="zone-card-header">
                <h3>{item.name}</h3>
                <span className="hint">{item.code}</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                <TextField label="Nombre" value={item.name} onChange={(v) => updateItemField(item.id, 'name', v)} width={180} />
                <label className="hint" style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 140 }}>
                  Rareza
                  <select
                    className="rpg-input"
                    value={item.rarity || ''}
                    onChange={(e) => updateItemField(item.id, 'rarity', e.target.value)}
                    style={{ width: 140 }}
                  >
                    {RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITY_LABELS[r]}</option>)}
                  </select>
                </label>
                <label className="hint" style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 140 }}>
                  Slot
                  <select
                    className="rpg-input"
                    value={item.slot || ''}
                    onChange={(e) => updateItemField(item.id, 'slot', e.target.value)}
                    style={{ width: 140 }}
                  >
                    {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
                  </select>
                </label>
                <TextField label="Nivel req." value={item.requiredLevel} onChange={(v) => updateItemField(item.id, 'requiredLevel', v)} width={90} type="number" />
                <TextField label="Precio compra" value={item.buyPrice} onChange={(v) => updateItemField(item.id, 'buyPrice', v)} width={110} type="number" />
                <TextField label="Método de obtención" value={item.obtainMethod} onChange={(v) => updateItemField(item.id, 'obtainMethod', v)} width={180} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                {item.slot === 'WEAPON' && (
                  <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={!!item.isTwoHanded}
                      onChange={(e) => updateItemField(item.id, 'isTwoHanded', e.target.checked)}
                    />
                    Dos manos
                  </label>
                )}
                <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!item.isCraftable}
                    onChange={(e) => updateItemField(item.id, 'isCraftable', e.target.checked)}
                  />
                  Crafteable
                </label>
                <div>
                  <span className="hint">Clase: </span>
                  <ClassEvolutionPicker
                    classId={item.classId}
                    classes={data.classes}
                    evolutions={data.evolutions}
                    onChange={(v) => updateItemField(item.id, 'classId', v)}
                  />
                </div>
              </div>

              <label className="hint" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                Descripción
                <textarea
                  className="rpg-input"
                  value={item.description ?? ''}
                  onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '4px 6px', resize: 'vertical' }}
                />
              </label>

              <button className="rpg-button rpg-button--small" disabled={saving} onClick={() => handleSaveItem(item)}>
                {saving ? 'Guardando...' : 'Guardar ítem'}
              </button>

              <p className="hint" style={{ marginTop: 8 }}><strong>Bonos de stat</strong></p>
              {item.statBonuses.map((b) => {
                const bonusSaving = savingKey === `bonus-${b.id}`;
                return (
                  <div key={b.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', paddingBottom: 6, borderBottom: '1px solid var(--gold-dim)' }}>
                    <TextField label="Stat" value={b.statCode} onChange={(v) => updateBonusField(item.id, b.id, 'statCode', v)} width={160} />
                    <TextField label="Monto" value={b.amount} onChange={(v) => updateBonusField(item.id, b.id, 'amount', v)} width={80} type="number" />
                    <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={!!b.isPercent} onChange={(e) => updateBonusField(item.id, b.id, 'isPercent', e.target.checked)} />
                      %
                    </label>
                    <TextField label="Duración (turnos)" value={b.durationTurns} onChange={(v) => updateBonusField(item.id, b.id, 'durationTurns', v)} width={100} type="number" />
                    <button className="rpg-button rpg-button--small" disabled={bonusSaving} onClick={() => handleSaveBonus(item.id, b)}>
                      {bonusSaving ? '...' : 'Guardar'}
                    </button>
                    {confirmDeleteBonus !== b.id ? (
                      <button className="rpg-button rpg-button-danger rpg-button--small" disabled={bonusSaving} onClick={() => setConfirmDeleteBonus(b.id)}>
                        Eliminar
                      </button>
                    ) : (
                      <>
                        <button className="rpg-button rpg-button-danger rpg-button--small" disabled={bonusSaving} onClick={() => handleDeleteBonus(item.id, b.id)}>
                          ¿Confirmar?
                        </button>
                        <button className="rpg-button rpg-button--small" onClick={() => setConfirmDeleteBonus(null)}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                <TextField
                  label="Nuevo stat"
                  value={bonusForm.statCode}
                  onChange={(v) => setNewBonusForm((prev) => ({ ...prev, [item.id]: { ...bonusForm, statCode: v } }))}
                  width={160}
                />
                <TextField
                  label="Monto"
                  value={bonusForm.amount}
                  onChange={(v) => setNewBonusForm((prev) => ({ ...prev, [item.id]: { ...bonusForm, amount: v } }))}
                  width={80}
                  type="number"
                />
                <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!bonusForm.isPercent}
                    onChange={(e) => setNewBonusForm((prev) => ({ ...prev, [item.id]: { ...bonusForm, isPercent: e.target.checked } }))}
                  />
                  %
                </label>
                <TextField
                  label="Duración (turnos)"
                  value={bonusForm.durationTurns}
                  onChange={(v) => setNewBonusForm((prev) => ({ ...prev, [item.id]: { ...bonusForm, durationTurns: v } }))}
                  width={100}
                  type="number"
                />
                <button className="rpg-button rpg-button--small" disabled={addingBonus} onClick={() => handleAddBonus(item)}>
                  {addingBonus ? 'Agregando...' : 'Agregar bono'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
