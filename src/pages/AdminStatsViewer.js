import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

const FORBIDDEN_MSG = 'No tenés permiso de administrador';

const COLUMNS = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'mag', label: 'INT' },
  { key: 'magicDef', label: 'DEF MAG' },
  { key: 'spd', label: 'SPD' },
  { key: 'mana', label: 'Maná' },
  { key: 'crit', label: 'Crítico %' },
];

export default function AdminStatsViewer() {
  const { player, token } = useAuth();
  const [classId, setClassId] = useState(1);
  const [data, setData] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getAdminClassStats(token, classId).then(setData).catch((err) => {
      if (err.message === FORBIDDEN_MSG) setForbidden(true);
      else setError(err.message);
    });
  }, [player, token, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (forbidden) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1><GameIcon name="chart" artist="delapouite" /> Visor de Stats</h1>
          <Link className="logout-btn" to="/">Volver</Link>
        </header>
        <p className="auth-error">{FORBIDDEN_MSG}</p>
      </div>
    );
  }

  if (error && !data) return <div className="dashboard-error">Error: {error}</div>;
  if (!data) return <div className="dashboard-loading">Cargando...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="chart" artist="delapouite" /> Visor de Stats</h1>
          <p className="dashboard-subtitle">Cómo escala cada clase base del nivel 1 al 100, sin equipo puesto ni evolución.</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}

      <div className="craft-filter-bar">
        <select className="rpg-input" value={classId} onChange={(e) => setClassId(Number(e.target.value))} style={{ maxWidth: 200 }}>
          {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="hint">
          Evasión base: {data.class.baseEvasion} · Daño crítico base: {data.class.baseCritDamage}% (fijos, no escalan por nivel)
        </span>
      </div>

      <div className="admin-stats-table-wrap rpg-panel">
        <table className="admin-stats-table">
          <thead>
            <tr>
              <th>Nivel</th>
              {COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.levels.map((row) => (
              <tr key={row.level}>
                <td>{row.level}</td>
                {COLUMNS.map((c) => <td key={c.key}>{row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
