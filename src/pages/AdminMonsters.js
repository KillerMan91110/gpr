import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

const FORBIDDEN_MSG = 'No tenés permiso de administrador';

const BASE_FIELDS = ['hp', 'atk', 'def', 'magicAtk', 'magicDef', 'spd', 'evasion', 'critChance', 'critDamage'];
const SCALING_FIELDS = [...BASE_FIELDS, 'elementalDamage'];
const FIELD_LABELS = {
  hp: 'HP', atk: 'ATK', def: 'DEF', magicAtk: 'INT', magicDef: 'DEF MAG', spd: 'SPD',
  evasion: 'Evasión', critChance: 'Crítico %', critDamage: 'Daño crít %', elementalDamage: 'Daño elem.',
};

const RARITY_ORDER = ['COMMON', 'RARE', 'MINIBOSS', 'LEGENDARY'];
const RARITY_LABELS = { COMMON: 'Común', RARE: 'Raro', MINIBOSS: 'Miniboss', LEGENDARY: 'Legendario' };

function sortMonsters(list) {
  return [...list].sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return a.baseLevel - b.baseLevel || a.name.localeCompare(b.name);
  });
}

function StatField({ label, value, onChange }) {
  return (
    <label className="hint" style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 74 }}>
      {label}
      <input
        type="number"
        className="rpg-input"
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 70, textAlign: 'center', padding: '4px 6px' }}
      />
    </label>
  );
}

export default function AdminMonsters() {
  const { player, token } = useAuth();
  const [data, setData] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!player) return;
    api.getAdminMonsters(token).then((d) => {
      setData(d);
      setZoneId((prev) => prev ?? d.zones[0]?.id ?? null);
    }).catch((err) => {
      if (err.message === FORBIDDEN_MSG) setForbidden(true);
      else setError(err.message);
    });
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateBaseField(monsterId, key, value) {
    setData((prev) => ({
      ...prev,
      monsters: prev.monsters.map((m) => (m.id === monsterId ? { ...m, base: { ...m.base, [key]: value } } : m)),
    }));
  }

  function updateScalingField(monsterId, level, key, value) {
    setData((prev) => ({
      ...prev,
      monsters: prev.monsters.map((m) => (m.id !== monsterId ? m : {
        ...m,
        scalings: m.scalings.map((s) => (s.level === level ? { ...s, [key]: value } : s)),
      })),
    }));
  }

  async function handleSaveBase(monster) {
    setError('');
    setMessage('');
    const key = `base-${monster.id}`;
    setSavingKey(key);
    try {
      const body = {};
      for (const f of BASE_FIELDS) body[f] = Number(monster.base[f]) || 0;
      const res = await api.updateAdminMonsterBase(monster.id, body, token);
      setData((prev) => ({
        ...prev,
        monsters: prev.monsters.map((m) => (m.id === monster.id ? { ...m, base: res.base, usesScaling: res.usesScaling } : m)),
      }));
      setMessage(`Base de ${monster.name} actualizada.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveScaling(monster, scaling) {
    setError('');
    setMessage('');
    const key = `scaling-${monster.id}-${scaling.level}`;
    setSavingKey(key);
    try {
      const body = {};
      for (const f of SCALING_FIELDS) body[f] = Number(scaling[f]) || 0;
      const res = await api.upsertAdminMonsterScaling(monster.id, scaling.level, body, token);
      setData((prev) => ({
        ...prev,
        monsters: prev.monsters.map((m) => (m.id !== monster.id ? m : {
          ...m,
          usesScaling: true,
          scalings: m.scalings.map((s) => (s.level === scaling.level ? res : s)),
        })),
      }));
      setMessage(`Nivel ${scaling.level} de ${monster.name} actualizado.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDeleteScaling(monster, level) {
    setError('');
    setMessage('');
    setConfirmDelete(null);
    const key = `scaling-${monster.id}-${level}`;
    setSavingKey(key);
    try {
      await api.deleteAdminMonsterScaling(monster.id, level, token);
      setData((prev) => ({
        ...prev,
        monsters: prev.monsters.map((m) => (m.id !== monster.id ? m : {
          ...m,
          scalings: m.scalings.filter((s) => s.level !== level),
          usesScaling: m.scalings.filter((s) => s.level !== level).length > 0,
        })),
      }));
      setMessage(`Fila de nivel ${level} de ${monster.name} eliminada.`);
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
          <h1><GameIcon name="cog" artist="lorc" /> Admin: Monstruos</h1>
          <Link className="logout-btn" to="/">Volver</Link>
        </header>
        <p className="auth-error">{FORBIDDEN_MSG}</p>
      </div>
    );
  }

  if (error && !data) return <div className="dashboard-error">Error: {error}</div>;
  if (!data) return <div className="dashboard-loading">Cargando...</div>;

  const monsters = sortMonsters(data.monsters.filter((m) => m.zoneId === zoneId));

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="cog" artist="lorc" /> Admin: Monstruos</h1>
          <p className="dashboard-subtitle">Editá las stats reales de combate de cualquier monstruo, zona por zona.</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="quest-tabs">
        {data.zones.map((z) => (
          <button
            key={z.id}
            className={`rpg-button rpg-button--small${zoneId === z.id ? ' quest-tab--active' : ''}`}
            onClick={() => setZoneId(z.id)}
          >
            {z.name}
          </button>
        ))}
      </div>

      <div className="zone-list">
        {monsters.map((m) => {
          const baseSaving = savingKey === `base-${m.id}`;
          return (
            <div key={m.id} className="zone-card rpg-panel">
              <div className="zone-card-header">
                <h3>{m.name}</h3>
                <span className="hint">{RARITY_LABELS[m.rarity] || m.rarity}</span>
              </div>
              <p className="hint">
                {m.code} · Nivel {m.baseLevel} · Spawn {m.minSpawnLevel}–{m.maxSpawnLevel}
              </p>

              <p className="hint">
                <strong>Stats reales{m.usesScaling ? ' (escalado por nivel)' : ''}</strong>
              </p>
              {m.scalings.length === 0 && (
                <p className="hint">Sin filas de escalado — pelea directamente con los valores de Base de abajo.</p>
              )}
              {m.scalings.map((s) => {
                const scalingSaving = savingKey === `scaling-${m.id}-${s.level}`;
                const confirmKey = `${m.id}-${s.level}`;
                return (
                  <div key={s.level} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', paddingBottom: 6, borderBottom: '1px solid var(--gold-dim)' }}>
                    <span className="hint" style={{ width: 60 }}>Niv. {s.level}</span>
                    {SCALING_FIELDS.map((f) => (
                      <StatField
                        key={f}
                        label={FIELD_LABELS[f]}
                        value={s[f]}
                        onChange={(v) => updateScalingField(m.id, s.level, f, v)}
                      />
                    ))}
                    <button
                      className="rpg-button rpg-button--small"
                      disabled={scalingSaving}
                      onClick={() => handleSaveScaling(m, s)}
                    >
                      {scalingSaving ? '...' : 'Guardar'}
                    </button>
                    {confirmDelete !== confirmKey ? (
                      <button
                        className="rpg-button rpg-button-danger rpg-button--small"
                        disabled={scalingSaving}
                        onClick={() => setConfirmDelete(confirmKey)}
                      >
                        Eliminar
                      </button>
                    ) : (
                      <>
                        <button
                          className="rpg-button rpg-button-danger rpg-button--small"
                          disabled={scalingSaving}
                          onClick={() => handleDeleteScaling(m, s.level)}
                        >
                          ¿Confirmar?
                        </button>
                        <button className="rpg-button rpg-button--small" onClick={() => setConfirmDelete(null)}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              <p className="hint" style={{ marginTop: 8 }}>
                <strong>Base (referencia)</strong>
                {m.usesScaling && (
                  <span className="auth-error" style={{ marginLeft: 8 }}>
                    ⚠️ este monstruo pelea con las stats de escalado de arriba — editar esto no cambia nada en combate real
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                {BASE_FIELDS.map((f) => (
                  <StatField
                    key={f}
                    label={FIELD_LABELS[f]}
                    value={m.base[f]}
                    onChange={(v) => updateBaseField(m.id, f, v)}
                  />
                ))}
                <button
                  className="rpg-button rpg-button--small"
                  disabled={baseSaving}
                  onClick={() => handleSaveBase(m)}
                >
                  {baseSaving ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
