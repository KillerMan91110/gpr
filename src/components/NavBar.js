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

// Navbar global fijo, visible en cualquier pantalla autenticada (mismo criterio que
// CoopBar): agrupa los ~11 destinos del juego en categorías temáticas en vez de una
// lista plana de links, y centraliza acá el único botón de logout de toda la app.
export default function NavBar() {
  const { player, token, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [socialCounts, setSocialCounts] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !player) return;
    api.getUnreadCount(player.id, token).then(setSocialCounts).catch(() => setSocialCounts(null));
  }, [isAuthenticated, player, token, location.pathname]);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenMenu(null);
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
      <Link to="/" className={`app-navbar-brand${location.pathname === '/' ? ' app-navbar-link--active' : ''}`}>
        🏠 {player.nickname}
      </Link>

      <div className="app-navbar-links">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="app-navbar-dropdown">
            <button
              type="button"
              className={`app-navbar-link${cat.items.some((i) => isActive(i.to)) ? ' app-navbar-link--active' : ''}`}
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

      <button
        type="button"
        className="rpg-button rpg-button--small app-navbar-logout"
        onClick={() => { api.logout(token).catch(() => {}); logout(); }}
      >
        Salir
      </button>
    </nav>
  );
}
