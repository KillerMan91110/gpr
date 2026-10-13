import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

const FORBIDDEN_MSG = 'No tenés permiso de administrador';
const n = (v) => Number(v ?? 0).toLocaleString('es');

// Economía: cuánto oro hay en el juego y cuánto entra y sale cada día (gprback/lib/economia.js).
// El neto del día es lo que el juego creó (combates, misiones, ventas a NPC…) menos lo que se
// llevó (tiendas, franqueo, comisiones…). Si el neto sube y sube, el oro vale cada vez menos.
export default function AdminEconomia() {
  const { player, token } = useAuth();
  const [dias, setDias] = useState(14);
  const [data, setData] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getAdminEconomia(token, dias).then(setData).catch((err) => {
      if (err.message === FORBIDDEN_MSG) setForbidden(true);
      else setError(err.message);
    });
  }, [player, token, dias]);

  const header = (
    <header className="dashboard-header">
      <div>
        <h1><GameIcon name="two-coins" artist="delapouite" /> Economía</h1>
        <p className="dashboard-subtitle">Oro en circulación y cuánto entra y sale del juego cada día.</p>
      </div>
      <Link className="logout-btn" to="/">Volver</Link>
    </header>
  );

  if (forbidden) return <div className="dashboard">{header}<p className="auth-error">{FORBIDDEN_MSG}</p></div>;
  if (error && !data) return <div className="dashboard-error">Error: {error}</div>;
  if (!data) return <div className="dashboard-loading">Cargando...</div>;

  const { totals, system, perDay, top, week } = data;
  const maxAbs = Math.max(1, ...perDay.map((d) => Math.max(Number(d.gold_in), Number(d.gold_out))));

  return (
    <div className="dashboard">
      {header}
      <div className="craft-filter-bar">
        <select className="rpg-input" value={dias} onChange={(e) => setDias(Number(e.target.value))} style={{ maxWidth: 200 }}>
          {[7, 14, 30, 90].map((d) => <option key={d} value={d}>Últimos {d} días</option>)}
        </select>
        <span className="hint">
          {n(totals.gold)} de oro entre {n(totals.players)} jugadores · la mitad tiene menos de {n(totals.median)}
        </span>
      </div>

      <div className="admin-stats-table-wrap rpg-panel">
        <table className="admin-stats-table">
          <thead>
            <tr><th>Día</th><th>Entró</th><th>Salió</th><th>Neto</th><th>Cambios</th><th style={{ width: '40%' }}>Entró / salió</th></tr>
          </thead>
          <tbody>
            {perDay.length === 0 && <tr><td colSpan={6}>Todavía no hay movimientos registrados (empieza a contar desde que se reinició el servidor).</td></tr>}
            {perDay.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td style={{ color: '#7dff9a' }}>+{n(d.gold_in)}</td>
                <td style={{ color: '#ff8a8a' }}>-{n(d.gold_out)}</td>
                <td style={{ color: Number(d.net) > 0 ? '#ffd27a' : '#9ad8f0', fontWeight: 700 }}>{Number(d.net) > 0 ? '+' : ''}{n(d.net)}</td>
                <td>{n(d.changes)}</td>
                <td>
                  <div style={{ height: 6, width: `${(Number(d.gold_in) / maxAbs) * 100}%`, background: '#5fd97e', borderRadius: 3 }} />
                  <div style={{ height: 6, width: `${(Number(d.gold_out) / maxAbs) * 100}%`, background: '#e05a5a', borderRadius: 3, marginTop: 2 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-stats-table-wrap rpg-panel">
        <table className="admin-stats-table">
          <thead><tr><th colSpan={2}>Últimos 7 días</th></tr></thead>
          <tbody>
            <tr><td>Mercado (ventas en oro)</td><td>{n(week.market?.sales)} ventas · {n(week.market?.volume)} de oro</td></tr>
            <tr><td>Comercios entre jugadores</td><td>{n(week.trades?.trades)}</td></tr>
            <tr><td>Muñecos de venta</td><td>{n(week.stalls?.open)} atendiendo ahora · {n(week.stalls?.earned)} de oro ganado</td></tr>
            <tr><td>Correo</td><td>{n(week.mail?.letters)} cartas · {n(week.mail?.gold)} de oro enviado</td></tr>
            {system?.length > 0 && (
              <tr>
                <td>Cuentas del sistema (no cuentan arriba)</td>
                <td>{system.map((p) => `${p.nickname}: ${n(p.gold)}`).join(' · ')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-stats-table-wrap rpg-panel">
        <table className="admin-stats-table">
          <thead><tr><th>#</th><th>Jugador</th><th>Nivel</th><th>Oro</th><th>% del total</th></tr></thead>
          <tbody>
            {top.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td><td>{p.nickname}</td><td>{p.level}</td><td>{n(p.gold)}</td>
                <td>{totals.gold > 0 ? ((Number(p.gold) / Number(totals.gold)) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
