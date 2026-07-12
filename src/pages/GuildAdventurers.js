import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CLASS_ICON = {
  GUERRERO: '⚔', Guerrero: '⚔',
  MAGO: '✦', Mago: '✦',
  ARQUERO: '🏹', Arquero: '🏹',
  PICARO: '🗡', PÍCARO: '🗡', Pícaro: '🗡',
  SACERDOTE: '✙', Sacerdote: '✙',
};

const NPC_STATS = [
  { label: 'HP',   key: 'hp' },
  { label: 'MP',   key: 'mana' },
  { label: 'ATK',  key: 'atk' },
  { label: 'DEF',  key: 'def' },
  { label: 'INT',  key: 'int' },
  { label: 'MDEF', key: 'magicDef' },
  { label: 'SPD',  key: 'spd' },
  { label: 'CRIT',     key: 'crit',       suffix: '%' },
  { label: 'CRIT DMG', key: 'critDamage', suffix: '%' },
  { label: 'EVASIÓN',  key: 'evasion',    suffix: '%' },
];

function NpcPoolCard({ npc, gold, disabled, onHire }) {
  const canAfford = gold >= npc.hireCost;
  return (
    <div className="rpg-panel npc-card">
      <div className="npc-card-header">
        <span className="npc-class-icon">{CLASS_ICON[npc.className] || '⚔'}</span>
        <div className="npc-header-info">
          <h3 className="npc-name">{npc.name}</h3>
          <span className="hero-class-role">{npc.className} · Niv. {npc.level}</span>
        </div>
      </div>
      <div className="npc-stats-grid">
        {NPC_STATS.map(({ label, key, suffix }) => (
          <div key={key} className="npc-stat">
            <span className="npc-stat-label">{label}</span>
            <span className="npc-stat-value">
              {npc[key] != null ? `${npc[key]}${suffix || ''}` : '—'}
            </span>
          </div>
        ))}
      </div>
      <button
        className={`npc-hire-btn${canAfford ? '' : ' npc-hire-btn--unaffordable'}`}
        disabled={disabled || !canAfford}
        onClick={() => onHire(npc.poolNpcId, npc.hireCost)}
      >
        {canAfford
          ? `Contratar — ${npc.hireCost} 🪙`
          : `Faltan ${npc.hireCost - gold} 🪙`}
      </button>
    </div>
  );
}

export default function GuildAdventurers() {
  const { player, token } = useAuth();
  const [pool, setPool] = useState([]);
  const [refreshCost, setRefreshCost] = useState(150);
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  function showMsg(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(null), 3500);
  }

  function startCountdown(seconds) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    if (seconds <= 0) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const load = useCallback(async () => {
    try {
      const [poolData, stats] = await Promise.all([
        api.getPartyPool(player.id, token),
        api.getPlayerStats(player.id, token),
      ]);
      setPool(poolData.npcs);
      setRefreshCost(poolData.refreshCost);
      setGold(stats.gold);
      startCountdown(poolData.secondsUntilFreeRefresh ?? 0);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [player, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (player) load(); }, [player, load]);

  // Auto-reload when timer hits 0 (pool auto-regenerated on the server)
  useEffect(() => {
    if (countdown === 0 && !loading) load();
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  async function handleRefresh() {
    setBusy(true);
    try {
      const data = await api.refreshPartyPool(player.id, token);
      setPool(data.npcs);
      setRefreshCost(data.refreshCost);
      setGold(data.gold);
      startCountdown(data.secondsUntilFreeRefresh ?? 1800);
      showMsg('¡Nuevos aventureros llegaron al gremio!');
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function handleHire(poolNpcId, cost) {
    setBusy(true);
    try {
      const data = await api.hireNpc(player.id, poolNpcId, token);
      setPool((prev) => prev.filter((n) => n.poolNpcId !== poolNpcId));
      setGold((g) => g - cost);
      showMsg(data.message);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="dashboard-loading">Cargando aventureros...</div>;

  const canRefresh = gold !== null && gold >= refreshCost;

  function fmtCountdown(secs) {
    if (secs == null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>⚔ Contratar Aventureros</h1>
          <p className="dashboard-subtitle">Reclutá compañeros para tu expedición</p>
        </div>
        <Link className="logout-btn" to="/guild">Volver</Link>
      </header>

      {msg && (
        <div className={`rpg-panel dash-panel npc-msg${msg.isError ? ' npc-msg--error' : ' npc-msg--ok'}`}>
          {msg.text}
        </div>
      )}

      <div className="rpg-panel dash-panel npc-toolbar">
        <span className="npc-toolbar-gold">🪙 {gold?.toLocaleString()} oro</span>
        <div className="npc-toolbar-refresh">
          <button
            className="logout-btn"
            onClick={handleRefresh}
            disabled={busy || !canRefresh}
          >
            🔄 Refrescar — {refreshCost} 🪙
          </button>
          {countdown != null && countdown > 0 && (
            <span className="npc-free-timer">Gratis en {fmtCountdown(countdown)}</span>
          )}
          {countdown === 0 && (
            <span className="npc-free-timer npc-free-timer--ready">¡Refresco gratis disponible!</span>
          )}
        </div>
      </div>

      {pool.length === 0 ? (
        <div className="rpg-panel dash-panel">
          <p className="npc-empty-msg">
            No hay aventureros disponibles.{' '}
            {canRefresh
              ? 'Refrescá el pool para ver nuevos candidatos.'
              : `Necesitás ${refreshCost} oro para buscar candidatos.`}
          </p>
        </div>
      ) : (
        <div className="npc-pool-grid">
          {pool.map((npc) => (
            <NpcPoolCard
              key={npc.poolNpcId}
              npc={npc}
              gold={gold}
              disabled={busy}
              onHire={handleHire}
            />
          ))}
        </div>
      )}
    </div>
  );
}
