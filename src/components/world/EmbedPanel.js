import { useState } from 'react';
import { Route, Routes, UNSAFE_RouteContext as RouteContext } from 'react-router-dom';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import Guild from '../../pages/Guild';
import GuildMasters from '../../pages/GuildMasters';
import GuildMasterDetail from '../../pages/GuildMasterDetail';
import GuildAdventurers from '../../pages/GuildAdventurers';
import GuildQuests from '../../pages/GuildQuests';
import GuildCreate from '../../pages/GuildCreate';
import GuildJoin from '../../pages/GuildJoin';
import GuildMy from '../../pages/GuildMy';
import GuildEvolutionMaster from '../../pages/GuildEvolutionMaster';
import GuildEnchant from '../../pages/GuildEnchant';
import Infirmary from '../../pages/Infirmary';
import ArtisanShop from '../../pages/ArtisanShop';
import Market from '../../pages/Market';
import Crafting from '../../pages/Crafting';
import Formation from '../../pages/Formation';
import Pets from '../../pages/Pets';

// Pantallas clásicas que se pueden abrir dentro de una ventana del mundo. Los enlaces entre
// ellas (p. ej. Gremio → Contratar aventureros) navegan DENTRO de la ventana en vez de sacar
// al jugador del mapa.
const EMBED_ROUTES = [
  ['/guild', Guild],
  ['/guild/masters', GuildMasters],
  ['/guild/masters/:classId', GuildMasterDetail],
  ['/guild/adventurers', GuildAdventurers],
  ['/guild/infirmary', Infirmary],
  ['/guild/quests', GuildQuests],
  ['/guild/create', GuildCreate],
  ['/guild/join', GuildJoin],
  ['/guild/my', GuildMy],
  ['/guild/my/masters/:masterId', GuildEvolutionMaster],
  ['/guild/enchant', GuildEnchant],
  ['/artisan-shop', ArtisanShop],
  ['/market', Market],
  ['/crafting', Crafting],
  ['/formation', Formation],
  ['/pets', Pets],
];

// rutas que ya tienen ventana propia en el mundo: se abre esa en vez de la pantalla clásica
const NATIVE_WINDOWS = {
  '/guild': 'gremio', '/artisan-shop': 'artesanos', '/crafting': 'taller', '/pets': 'mascotas',
  '/formation': 'formacion', '/guild/infirmary': 'enfermeria', '/quests': 'misiones', '/guild/enchant': 'encantador',
};

const ROOT_ROUTE = { outlet: null, matches: [], isDataRoute: false };
const EMBED_PREFIXES = ['/guild', '/artisan-shop', '/market', '/crafting', '/formation', '/pets'];
const isEmbeddable = (path) => EMBED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

export default function EmbedPanel({ id, title, icon, path, openWindow, ...props }) {
  const [stack, setStack] = useState([path]);
  const current = stack[stack.length - 1];

  const onClickCapture = (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const url = new URL(a.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    e.preventDefault();
    e.stopPropagation();
    if (url.pathname === '/' || url.pathname === current) return;
    if (NATIVE_WINDOWS[url.pathname] && openWindow) { openWindow(NATIVE_WINDOWS[url.pathname]); return; }
    // volver a la pantalla de origen (los "Volver" de cada página) o abrir una nueva
    const back = stack.lastIndexOf(url.pathname);
    if (back >= 0) setStack(stack.slice(0, back + 1));
    else if (isEmbeddable(url.pathname)) setStack([...stack, url.pathname]);
  };

  return (
    <FloatingPanel
      {...props}
      id={id}
      title={title}
      icon={<GameIcon name={icon[0]} artist={icon[1]} />}
      width={Math.min(820, window.innerWidth - 40)}
      className="wp-panel--embed"
    >
      {stack.length > 1 && (
        <div className="wp-embed-nav">
          <button type="button" className="wp-btn" onClick={() => setStack(stack.slice(0, -1))}>
            ◂ Volver
          </button>
        </div>
      )}
      <div className={`wp-embed wp-embed--${id}`} onClickCapture={onClickCapture} key={current}>
        {/* rutas propias de la ventana: se "resetea" la ruta padre (/mundo) para poder resolverlas */}
        <RouteContext.Provider value={ROOT_ROUTE}>
          <Routes location={{ pathname: current }}>
            {EMBED_ROUTES.map(([p, Page]) => <Route key={p} path={p} element={<Page />} />)}
          </Routes>
        </RouteContext.Provider>
      </div>
    </FloatingPanel>
  );
}
