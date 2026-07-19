import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CLASS_ICONS = { GUERRERO: '⚔', MAGO: '✦', ARQUERO: '🏹', PICARO: '🗡', SACERDOTE: '✙' };
const DIFFICULTY_LABELS = { 1: 'Normal', 2: 'Difícil', 3: 'Muy Difícil' };
const TOWER_MODES = [
  { key: 'solo', label: 'Solo' },
  { key: 'duo', label: 'Dúo' },
  { key: 'trio', label: 'Trío' },
];

const CATEGORIES = [
  { key: 'players', label: 'Jugadores', icon: '🏆' },
  { key: 'guilds', label: 'Gremios', icon: '🛡️' },
  { key: 'tower', label: 'Torre Infinita', icon: '🗼' },
  { key: 'wealth', label: 'Riqueza', icon: '💰' },
];

function normalizePlayers(list, myNickname) {
  return list.map((e) => ({
    position: e.position,
    icon: CLASS_ICONS[e.className?.toUpperCase()] || '◆',
    name: e.nickname,
    sub: `${e.className} · Nv.${e.level}`,
    value: `Nv. ${e.level}`,
    isSelf: e.nickname === myNickname,
  }));
}

function normalizeGuilds(list) {
  return list.map((g) => ({
    position: g.position,
    icon: '🏛',
    name: g.name,
    sub: `${g.memberCount} miembro${g.memberCount === 1 ? '' : 's'}`,
    value: `Nv. ${g.level}`,
    isSelf: false,
  }));
}

function normalizeTower(list, myNickname) {
  return list.map((e) => ({
    position: e.position,
    icon: '🗼',
    name: e.members.join(' & '),
    sub: DIFFICULTY_LABELS[e.difficulty] || `Dificultad ${e.difficulty}`,
    value: `Piso ${e.floor}`,
    isSelf: e.members.includes(myNickname),
  }));
}

function normalizeWealth(list, myNickname) {
  return list.map((e) => ({
    position: e.position,
    icon: CLASS_ICONS[e.className?.toUpperCase()] || '◆',
    name: e.nickname,
    sub: `Nv. ${e.level}`,
    value: `${Number(e.gold).toLocaleString()} Oro`,
    isSelf: e.nickname === myNickname,
  }));
}

function PodiumCard({ entry, place }) {
  const trophy = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
  return (
    <div className={`ranking-podium-card ranking-podium-card--${place}`}>
      <span className="ranking-podium-trophy">{trophy}</span>
      <span className="ranking-podium-icon">{entry.icon}</span>
      <span className={`ranking-podium-name${entry.isSelf ? ' ranking-podium-name--self' : ''}`}>{entry.name}</span>
      <span className="ranking-podium-value">{entry.value}</span>
      <span className="ranking-podium-sub">{entry.sub}</span>
    </div>
  );
}

export default function Ranking() {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('players');
  const [towerMode, setTowerMode] = useState('solo');

  const [players, setPlayers] = useState(null);
  const [guilds, setGuilds] = useState(null);
  const [tower, setTower] = useState(null);
  const [wealth, setWealth] = useState(null);
  const [wealthAvailable, setWealthAvailable] = useState(true);

  useEffect(() => {
    api.getLeaderboard().then(setPlayers).catch(() => setPlayers([]));
    api.getGuildLeaderboard().then(setGuilds).catch(() => setGuilds([]));
    api.getTowerLeaderboard().then(setTower).catch(() => setTower(null));
    api.getWealthLeaderboard().then(setWealth).catch(() => setWealthAvailable(false));
  }, [token]);

  const categories = CATEGORIES.filter((c) => c.key !== 'wealth' || wealthAvailable);

  let entries = null;
  if (tab === 'players' && players) entries = normalizePlayers(players, player?.nickname);
  else if (tab === 'guilds' && guilds) entries = normalizeGuilds(guilds);
  else if (tab === 'tower' && tower) entries = normalizeTower(tower[towerMode] || [], player?.nickname);
  else if (tab === 'wealth' && wealth) entries = normalizeWealth(wealth, player?.nickname);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🏆 Ranking</h1>
          <p className="dashboard-subtitle">Los mejores de GPR</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      <div className="ranking-tabs">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`rpg-button rpg-button--small${tab === c.key ? ' quest-tab--active' : ''}`}
            onClick={() => setTab(c.key)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {tab === 'tower' && (
        <div className="ranking-subtabs">
          {TOWER_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`rpg-button rpg-button--small${towerMode === m.key ? ' quest-tab--active' : ''}`}
              onClick={() => setTowerMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {!entries && <p className="leaderboard-empty">Cargando...</p>}
      {entries && entries.length === 0 && <p className="leaderboard-empty">Sin datos todavía.</p>}

      {entries && entries.length > 0 && (
        <>
          <div className="ranking-podium">
            {entries[1] && <PodiumCard entry={entries[1]} place={2} />}
            {entries[0] && <PodiumCard entry={entries[0]} place={1} />}
            {entries[2] && <PodiumCard entry={entries[2]} place={3} />}
          </div>

          {entries.length > 3 && (
            <div className="rpg-panel ranking-list">
              {entries.slice(3).map((e) => (
                <div key={e.position} className={`leaderboard-row${e.isSelf ? ' leaderboard-row--self' : ''}`}>
                  <span className="lb-pos">{e.position}</span>
                  <span className="lb-icon">{e.icon}</span>
                  <div className="lb-info">
                    <span className="lb-name">{e.name}</span>
                    <span className="lb-sub">{e.sub}</span>
                  </div>
                  <span className="lb-value">{e.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
