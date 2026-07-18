import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const CATEGORIES = [
  {
    key: 'aventura',
    icon: '🗡️',
    label: 'Aventura',
    items: [
      { to: '/combat', label: 'Combate' },
      { to: '/tower', label: 'Torre Infinita' },
      { to: '/quests', label: 'Misiones' },
    ],
  },
  {
    key: 'personaje',
    icon: '🧙',
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
    icon: '💰',
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
          🏠 {player.nickname}
        </Link>

        {gold !== null && (
          <button
            type="button"
            className="app-navbar-gold"
            title={gold.toLocaleString()}
            onClick={() => setShowExactGold((v) => !v)}
          >
            🪙 {showExactGold ? gold.toLocaleString() : formatGold(gold)}
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
              {cat.icon} {cat.label} <span className="app-navbar-caret">▾</span>
            </button>
            {openMenu === cat.key && (
              <div className="app-navbar-menu rpg-panel">
                {cat.items.map((item) => (
                  <Link key={item.to} to={item.to} className="app-navbar-menu-item">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <Link to="/guild" className={`app-navbar-link${isActive('/guild') ? ' app-navbar-link--active' : ''}`}>
          🏛️ Gremio
        </Link>

        <Link to="/friends" className={`app-navbar-link${isActive('/friends') ? ' app-navbar-link--active' : ''}`}>
          🤝 Social
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
          ☰
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
