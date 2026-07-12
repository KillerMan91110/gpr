import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOLD_PER_POINT = 2;

const CLASS_ICON = {
  GUERRERO: '⚔', MAGO: '✦', ARQUERO: '🏹', PICARO: '🗡', SACERDOTE: '✙',
};

function HealBar({ label, hp, maxHp, mana, maxMana, cost, gold, busy, onHeal }) {
  const missingHp   = maxHp - hp;
  const missingMana = maxMana - mana;
  const missing     = missingHp + missingMana;
  const full        = missing <= 0;
  const canAfford   = gold >= cost;

  return (
    <div className="infirmary-member">
      <div className="infirmary-member-top">
        <span className="infirmary-member-name">{label}</span>
        {full ? (
          <span className="infirmary-full-badge">✓ Full</span>
        ) : (
          <button
            className={`logout-btn infirmary-heal-btn${canAfford ? '' : ' infirmary-heal-btn--cant'}`}
            disabled={busy || full}
            onClick={onHeal}
            title={canAfford ? undefined : `Faltan ${cost - gold} 🪙`}
          >
            {canAfford ? `Curar — ${cost} 🪙` : `Faltan ${cost - gold} 🪙`}
          </button>
        )}
      </div>
      <div className="stat-bar infirmary-bar">
        <div className="stat-bar-label">
          <span>❤ HP</span>
          <span>{hp}/{maxHp}</span>
        </div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill hp" style={{ width: `${maxHp ? (hp / maxHp) * 100 : 0}%` }} />
        </div>
      </div>
      {maxMana > 0 && (
        <div className="stat-bar infirmary-bar">
          <div className="stat-bar-label">
            <span>✦ Maná</span>
            <span>{mana}/{maxMana}</span>
          </div>
          <div className="stat-bar-track">
            <div className="stat-bar-fill mana" style={{ width: `${maxMana ? (mana / maxMana) * 100 : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Infirmary() {
  const { player, token } = useAuth();
  const [stats, setStats]   = useState(null);
  const [party, setParty]   = useState(null);
  const [error, setError]   = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy]     = useState(false);

  const loadAll = useCallback(async () => {
    const [s, p] = await Promise.all([
      api.getPlayerStats(player.id, token),
      api.getParty(player.id, token),
    ]);
    setStats(s);
    setParty(p);
  }, [player, token]);

  useEffect(() => {
    if (!player) return;
    loadAll().catch((err) => setError(err.message));
  }, [player, loadAll]);

  function showMsg(text, isError = false) {
    setMessage({ text, isError });
    setTimeout(() => setMessage(''), 3500);
  }

  async function heal(body, successFn) {
    setBusy(true);
    setError('');
    try {
      const result = await api.healAtGuild(player.id, token, body);
      showMsg(successFn(result));
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleHealHero() {
    heal({ heroOnly: true }, (r) =>
      `${r.healedHp > 0 ? `+${r.healedHp} HP` : ''}${r.healedMana > 0 ? ` +${r.healedMana} Maná` : ''} al héroe — ${r.cost} 🪙`
    );
  }

  function handleHealNpc(npcId, name) {
    heal({ npcId }, (r) =>
      `${r.healedHp > 0 ? `+${r.healedHp} HP` : ''}${r.healedMana > 0 ? ` +${r.healedMana} Maná` : ''} a ${name} — ${r.cost} 🪙`
    );
  }

  function handleHealAll() {
    heal({}, (r) => {
      const parts = [];
      if (r.hero) parts.push('Héroe');
      r.npcsHealed?.forEach((n) => parts.push(n.name));
      return `Curados: ${parts.join(', ')} — ${r.totalCost} 🪙`;
    });
  }

  if (error && !stats) return <div className="dashboard-error">Error: {error}</div>;
  if (!stats)          return <div className="dashboard-loading">Cargando...</div>;

  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];

  const heroMissing = (stats.maxHp - stats.hp) + (stats.maxMana - stats.mana);
  const heroCost    = heroMissing * GOLD_PER_POINT;

  const npcCosts = partyNpcs.map((n) => ({
    ...n,
    missing: (n.maxHp - n.hp) + (n.maxMana - n.mana),
    cost: ((n.maxHp - n.hp) + (n.maxMana - n.mana)) * GOLD_PER_POINT,
  }));

  const totalMissing = heroMissing + npcCosts.reduce((s, n) => s + n.missing, 0);
  const totalCost    = totalMissing * GOLD_PER_POINT;
  const allFull      = totalMissing <= 0;
  const anyAffordable = stats.gold >= GOLD_PER_POINT && !allFull;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>✚ Enfermería</h1>
          <p className="dashboard-subtitle">{GOLD_PER_POINT} de oro por cada punto de HP o maná · Tenés {stats.gold.toLocaleString()} 🪙</p>
        </div>
        <Link className="logout-btn" to="/guild">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && (
        <p className={`hint infirmary-message${message.isError ? '' : ' hint-ok'}`}>{message.text}</p>
      )}

      <div className="rpg-panel infirmary-panel">
        <HealBar
          label={`★ ${stats.nickname}`}
          hp={stats.hp}       maxHp={stats.maxHp}
          mana={stats.mana}   maxMana={stats.maxMana}
          cost={heroCost}     gold={stats.gold}
          busy={busy}         onHeal={handleHealHero}
        />

        {partyNpcs.map((npc) => {
          const nd = npcCosts.find((n) => n.npcId === npc.npcId);
          const icon = CLASS_ICON[npc.className?.toUpperCase()] || '◆';
          return (
            <HealBar
              key={npc.npcId}
              label={`${icon} ${npc.name}`}
              hp={npc.hp}       maxHp={npc.maxHp}
              mana={npc.mana}   maxMana={npc.maxMana}
              cost={nd?.cost ?? 0}  gold={stats.gold}
              busy={busy}
              onHeal={() => handleHealNpc(npc.npcId, npc.name)}
            />
          );
        })}

        <div className="infirmary-footer">
          {allFull ? (
            <p className="hint hint-ok">El grupo está al máximo.</p>
          ) : (
            <button
              className="rpg-button"
              disabled={busy || !anyAffordable}
              onClick={handleHealAll}
            >
              {stats.gold >= totalCost
                ? `Curar a todos — ${totalCost} 🪙`
                : `Curar con lo que alcance — ${stats.gold} 🪙`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
