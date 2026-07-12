import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function StatBar({ label, value, max, variant }) {
  const percent = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="stat-bar">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="stat-bar-track">
        <div className={`stat-bar-fill ${variant}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function RankBar({ rank, reputation, reputationForNextRank, isMaxRank, ranks }) {
  const currentRank = ranks?.find((r) => r.code === rank);
  const minRep = currentRank ? Number(currentRank.min_reputation) : 0;
  const into = reputation - minRep;
  const needed = isMaxRank ? 0 : reputationForNextRank - minRep;
  const percent = isMaxRank ? 100 : needed ? Math.min(100, (into / needed) * 100) : 0;

  return (
    <div className="rank-row">
      <span className="rank-label">Rango {rank}</span>
      <div className="rank-bar-track">
        <div className="rank-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="rank-bar-text">{isMaxRank ? 'MAX' : `${into} / ${needed}`}</span>
    </div>
  );
}

function formatPercent(value) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(2)}`;
}

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-row-label">{label}</span>
      <span className="stat-row-value">{value}</span>
    </div>
  );
}

const CLASS_ICONS = {
  GUERRERO: '⚔',
  MAGO: '✦',
  ARQUERO: '🏹',
  PICARO: '🗡',
  SACERDOTE: '✙',
};

function ClassPortrait({ code, name }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="hero-portrait-fallback">
        <span>{CLASS_ICONS[code] || '?'}</span>
      </div>
    );
  }

  return (
    <img
      className="hero-portrait"
      src={`/portraits/${code}.png`}
      alt={name}
      onError={() => setImgError(true)}
    />
  );
}

export default function Dashboard() {
  const { player, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [ranks, setRanks] = useState(null);
  const [party, setParty] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [guildLeaderboard, setGuildLeaderboard] = useState(null);
  const [leaderboardTab, setLeaderboardTab] = useState('players');
  const [activeMember, setActiveMember] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getPlayerStats(player.id, token)
      .then(setStats)
      .catch((err) => setError(err.message));
    api.getRanks()
      .then(setRanks)
      .catch(() => setRanks(null));
    api.getParty(player.id, token)
      .then(setParty)
      .catch(() => setParty(null));
    api.getLeaderboard()
      .then(setLeaderboard)
      .catch(() => setLeaderboard(null));
    api.getGuildLeaderboard()
      .then(setGuildLeaderboard)
      .catch(() => setGuildLeaderboard([]));
  }, [player, token]);

  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!stats) return <div className="dashboard-loading">Cargando personaje...</div>;

  const displayClass = stats.evolution?.name
    ? `${stats.class.name} → ${stats.evolution.name}`
    : stats.class.name;

  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];
  const slot2Npc = partyNpcs.find((n) => n.slot === 2) || null;
  const slot3Npc = partyNpcs.find((n) => n.slot === 3) || null;
  const activeNpc = activeMember === 1 ? slot2Npc : activeMember === 2 ? slot3Npc : null;
  const heroPartyMember = party?.members?.find((m) => m.isHero);
  const currentUniqueSkill = activeNpc ? activeNpc.uniqueSkill : heroPartyMember?.uniqueSkill;
  const combatStats = activeNpc || stats;
  const currentElementals = activeNpc
    ? { resistances: activeNpc.resistances ?? [], elementalBonuses: activeNpc.elementalBonuses ?? [] }
    : { resistances: stats.resistances ?? [], elementalBonuses: stats.elementalBonuses ?? [] };
  const hasCurrentElemental =
    currentElementals.resistances?.length > 0 || currentElementals.elementalBonuses?.length > 0;

  const CLASS_ICONS_LB = { GUERRERO: '⚔', MAGO: '✦', ARQUERO: '🏹', PICARO: '🗡', SACERDOTE: '✙' };

  return (
    <div className="dashboard">

      <div className="dashboard-columns">

        {/* ── Columna principal ── */}
        <div className="dashboard-main">

          {/* ── Ficha del héroe + Switcher de formación ── */}
          <div className="hero-section">
            <div className="hero-card rpg-panel">
              <ClassPortrait code={stats.class.code} name={stats.class.name} />
              <div className="hero-info">
                <h1>{stats.nickname}</h1>
                <div className="hero-class-tag">
                  <span className="hero-class-name">{displayClass}</span>
                  
                </div>
                {stats.class.description && (
                  <p className="hero-class-desc">{stats.class.description}</p>
                )}
                <p className="hero-class-level">Nivel {stats.level}</p>
                {ranks && (
                  <RankBar
                    rank={stats.rank}
                    reputation={stats.reputation}
                    reputationForNextRank={stats.reputationForNextRank}
                    isMaxRank={stats.isMaxRank}
                    ranks={ranks}
                  />
                )}
              </div>
            </div>
            <div className="hero-switcher">
              <button
                className={`switcher-btn${activeMember === 0 ? ' switcher-btn--active' : ''}`}
                onClick={() => setActiveMember(0)}
              >
                {stats.nickname}
              </button>
              <button
                className={`switcher-btn${activeMember === 1 ? ' switcher-btn--active' : ''}`}
                onClick={() => setActiveMember(1)}
                disabled={!slot2Npc}
              >
                {slot2Npc ? slot2Npc.name : 'Slot 2'}
              </button>
              <button
                className={`switcher-btn${activeMember === 2 ? ' switcher-btn--active' : ''}`}
                onClick={() => setActiveMember(2)}
                disabled={!slot3Npc}
              >
                {slot3Npc ? slot3Npc.name : 'Slot 3'}
              </button>
            </div>
          </div>

          {/* ── Habilidad innata ── */}
          {currentUniqueSkill && (
            <div className="rpg-panel dash-panel">
              <p className="panel-title">
                 {activeNpc ? `✦ Habilidad Innata — ${activeNpc.name}` : '✦ Habilidad Innata'}
                </p>
              <p className="unique-skill-name">{currentUniqueSkill.name}</p>
              <p className="unique-skill-desc">{currentUniqueSkill.description}</p>
            </div>
          )}

          {/* ── Vitalidad ── */}
          <div className="rpg-panel dash-panel">
            <p className="panel-title">
              {activeNpc ? `Vitalidad — ${activeNpc.name}` : 'Vitalidad'}
            </p>
            <StatBar label="HP" value={combatStats.hp} max={combatStats.maxHp} variant="hp" />
            <StatBar label="Maná" value={combatStats.mana} max={combatStats.maxMana} variant="mana" />
            <StatBar
              label="XP"
              value={activeNpc ? (activeNpc.xpIntoLevel ?? 0) : stats.xpIntoLevel}
              max={activeNpc ? (activeNpc.xpNeededForLevel ?? 1) : stats.xpNeededForLevel}
              variant="xp"
            />
          </div>

          {/* ── Progreso + Combate ── */}
          <div className="dash-two-col">
            <div className="rpg-panel dash-panel">
              <p className="panel-title">Progreso</p>
              <div className="stat-row-list">
                <StatRow label="Oro" value={stats.gold.toLocaleString()} />
                <StatRow label="Reputación" value={stats.reputation.toLocaleString()} />
                <StatRow label="Rango" value={stats.rank} />
              </div>
            </div>

            <div className="rpg-panel dash-panel">
              <p className="panel-title">
                {activeNpc ? `Combate — ${activeNpc.name} — ${activeNpc.className}` : 'Combate'}
              </p>
              <div className="combat-stat-grid">
                <StatRow label="ATK" value={combatStats.atk} />
                <StatRow label="DEF" value={combatStats.def} />
                <StatRow label="INT" value={combatStats.int} />
                <StatRow label="DEF MAG" value={combatStats.magicDef} />
                <StatRow label="SPD" value={combatStats.spd} />
                <StatRow label="CRIT Chance" value={`${formatPercent(combatStats.crit)}%`}/>
                <StatRow label="CRIT DMG" value={`${combatStats.critDamage ?? 0}%`} />
                <StatRow label="Evasión" value={`${combatStats.evasion ?? 0}%`} />
              </div>
            </div>
          </div>

          {/* ── Elementales ── */}
          {hasCurrentElemental && (
            <div className="rpg-panel dash-panel">
              <p className="panel-title">
                {activeNpc ? `Elementales — ${activeNpc.name}` : 'Elementales'}
              </p>
              <div className="elemental-sections">
                {currentElementals.resistances?.length > 0 && (
                  <div className="elemental-group">
                    <p className="elemental-group-label">Resistencias</p>
                    <div className="elemental-grid">
                      {currentElementals.resistances.map((r) => (
                        <div key={r.elementCode} className={`elemental-card elem-${r.elementCode.toLowerCase()}`}>
                          <span className="elemental-name">{r.element}</span>
                          <strong className="elemental-value">
                            {r.percent > 0 ? `+${r.percent}%` : `${r.percent}%`}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentElementals.elementalBonuses?.length > 0 && (
                  <div className="elemental-group">
                    <p className="elemental-group-label">Daño Elemental</p>
                    <div className="elemental-grid">
                      {currentElementals.elementalBonuses.map((b) => (
                        <div key={b.elementCode} className={`elemental-card elem-${b.elementCode.toLowerCase()}`}>
                          <span className="elemental-name">{b.element}</span>
                          <strong className="elemental-value">+{b.bonus}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Leaderboard ── */}
        <aside className="rpg-panel leaderboard-panel">
          <p className="panel-title leaderboard-title">🏆 Ranking</p>

          {guildLeaderboard && guildLeaderboard.length > 0 && (
            <div className="leaderboard-tabs">
              <button
                className={`rpg-button rpg-button--small${leaderboardTab === 'players' ? ' quest-tab--active' : ''}`}
                onClick={() => setLeaderboardTab('players')}
              >
                Jugadores
              </button>
              <button
                className={`rpg-button rpg-button--small${leaderboardTab === 'guilds' ? ' quest-tab--active' : ''}`}
                onClick={() => setLeaderboardTab('guilds')}
              >
                Gremios
              </button>
            </div>
          )}

          {leaderboardTab === 'players' && (
            <>
              {!leaderboard && <p className="leaderboard-empty">Cargando...</p>}
              {leaderboard && leaderboard.length === 0 && (
                <p className="leaderboard-empty">Sin datos aún.</p>
              )}
              {leaderboard && leaderboard.map((entry) => {
                const isSelf = entry.nickname === stats.nickname;
                return (
                  <div key={entry.position} className={`leaderboard-row${isSelf ? ' leaderboard-row--self' : ''}`}>
                    <span className="lb-pos">{entry.position}</span>
                    <span className="lb-icon">{CLASS_ICONS_LB[entry.className?.toUpperCase()] || '◆'}</span>
                    <div className="lb-info">
                      <span className="lb-name">{entry.nickname}</span>
                      <span className="lb-sub">{entry.className} · Nv.{entry.level}</span>
                    </div>
                    <span className="lb-rank">{entry.rank}</span>
                  </div>
                );
              })}
            </>
          )}

          {leaderboardTab === 'guilds' && (
            <>
              {!guildLeaderboard && <p className="leaderboard-empty">Cargando...</p>}
              {guildLeaderboard && guildLeaderboard.length === 0 && (
                <p className="leaderboard-empty">Sin gremios aún.</p>
              )}
              {guildLeaderboard && guildLeaderboard.map((guild) => (
                <div key={guild.position} className="leaderboard-row">
                  <span className="lb-pos">{guild.position}</span>
                  <span className="lb-icon">🏛</span>
                  <div className="lb-info">
                    <span className="lb-name">{guild.name}</span>
                    <span className="lb-sub">Nv.{guild.level} · {guild.memberCount} miembro{guild.memberCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </aside>

      </div>
    </div>
  );
}
