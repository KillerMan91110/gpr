import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from './GameIcon';

const CATEGORIES = [
  {
    key: 'aventura',
    gameIcon: { name: 'crossed-swords', artist: 'lorc' },
    label: 'Aventura',
    items: [
      { to: '/combat', label: 'Explorar', gameIcon: { name: 'compass', artist: 'lorc' } },
      { to: '/abismo', label: 'El Abismo', gameIcon: { name: 'vortex', artist: 'lorc' } },
      { to: '/worldboss', label: 'World Boss', gameIcon: { name: 'galaxy', artist: 'delapouite' } },
      { to: '/quests', label: 'Misiones', gameIcon: { name: 'scroll-unfurled', artist: 'lorc' } },
    ],
  },
  {
    key: 'personaje',
    gameIcon: { name: 'wizard-face', artist: 'delapouite' },
    label: 'Personaje',
    items: [
      { to: '/inventory', label: 'Inventario' },
      { to: '/skills', label: 'Habilidades' },
      { to: '/formation', label: 'Formación' },
      { to: '/pets', label: 'Mascotas' },
      { to: '/achievements', label: 'Logros' },
      { to: '/ranks', label: 'Rangos' },
    ],
  },
  {
    key: 'economia',
    gameIcon: { name: 'money-stack', artist: 'delapouite' },
    label: 'Economía',
    items: [
      { to: '/market', label: 'Mercado' },
      { to: '/artisan-shop', label: 'Tienda de Artesanos' },
      { to: '/crafting', label: 'Taller de Crafteo' },
    ],
  },
];

const GOLD_POLL_MS = 10000;

function formatGold(value) {
  if (value >= 1_000_000) {
    const v = value / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const v = value / 1_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}k`;
  }
  return value.toLocaleString();
}

export default function NavBar() {
  const { player, token, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [socialCounts, setSocialCounts] = useState(null);
  const [gold, setGold] = useState(null);
  const [showExactGold, setShowExactGold] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !player) return;
    api.getUnreadCount(player.id, token).then(setSocialCounts).catch(() => setSocialCounts(null));
  }, [isAuthenticated, player, token, location.pathname]);

  // Oro siempre visible en el navbar: se refresca al cambiar de pantalla (por si compraste/
  // vendiste algo) y con un poll de fondo para cuando te quedás en la misma pantalla gastando.
  useEffect(() => {
    if (!isAuthenticated || !player) return undefined;
    let cancelled = false;
    function pollGold() {
      api.getPlayerStats(player.id, token)
        .then((stats) => { if (!cancelled) setGold(stats.gold); })
        .catch(() => {});
    }
    pollGold();
    const interval = setInterval(pollGold, GOLD_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated, player, token, location.pathname]);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !player) return null;
  if (location.pathname === '/login' || location.pathname === '/register') return null;

  function isActive(to) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  const socialBadge = (socialCounts?.unreadMessages || 0) + (socialCounts?.pendingFriendRequests || 0);

  return (
    <nav className="app-navbar" ref={rootRef}>
      <div className="app-navbar-identity">
        <Link to="/" className={`app-navbar-brand${location.pathname === '/' ? ' app-navbar-link--active' : ''}`}>
          <GameIcon name="house" artist="delapouite" /> {player.nickname}
        </Link>

        {gold !== null && (
          <button
            type="button"
            className="app-navbar-gold"
            title={gold.toLocaleString()}
            onClick={() => setShowExactGold((v) => !v)}
          >
            <GameIcon name="two-coins" artist="delapouite" /> {showExactGold ? gold.toLocaleString() : formatGold(gold)}
          </button>
        )}
      </div>

      <div className={`app-navbar-links${mobileOpen ? ' app-navbar-links--open' : ''}`}>
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="app-navbar-dropdown">
            <button
              type="button"
              className={`app-navbar-link${cat.key === 'aventura' ? ' app-navbar-link--primary' : ''}${cat.items.some((i) => isActive(i.to)) ? ' app-navbar-link--active' : ''}`}
              onClick={() => setOpenMenu(openMenu === cat.key ? null : cat.key)}
            >
              {cat.gameIcon && <GameIcon {...cat.gameIcon} />} {cat.label} <span className="app-navbar-caret">▾</span>
            </button>
            {openMenu === cat.key && (
              <div className="app-navbar-menu rpg-panel">
                {cat.items.map((item) => (
                  <Link key={item.to} to={item.to} className="app-navbar-menu-item">
                    {item.gameIcon && <GameIcon {...item.gameIcon} />} {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <Link to="/guild" className={`app-navbar-link${isActive('/guild') ? ' app-navbar-link--active' : ''}`}>
          <GameIcon name="castle" artist="lorc" /> Gremio
        </Link>

        <Link to="/ranking" className={`app-navbar-link${isActive('/ranking') ? ' app-navbar-link--active' : ''}`}>
          <GameIcon name="trophy" artist="lorc" /> Ranking
        </Link>

        <Link to="/friends" className={`app-navbar-link${isActive('/friends') ? ' app-navbar-link--active' : ''}`}>
          <GameIcon name="shaking-hands" artist="delapouite" /> Social
          {socialBadge > 0 && <span className="nav-badge">{socialBadge}</span>}
        </Link>
      </div>

      <div className="app-navbar-actions">
        <button
          type="button"
          className="app-navbar-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menú"
        >
          <GameIcon name="hamburger-menu" artist="delapouite" />
        </button>

        <button
          type="button"
          className="rpg-button rpg-button--small app-navbar-logout"
          onClick={() => { api.logout(token).catch(() => {}); logout(); }}
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
