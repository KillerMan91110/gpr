import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { getAbyssCheckpoint } from '../../utils/abyssCheckpoint';

const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };

// Cada servicio abre su propia ventana del mundo (ver WINDOWS en pages/World.js)
const SERVICES = [
  { win: 'contratar', icon: ['crossed-swords', 'lorc'], title: 'Contratar', desc: 'Recluta aventureros para tu grupo.', surface: true },
  { win: 'maestros', icon: ['graduate-cap', 'delapouite'], title: 'Maestros', desc: 'Aprende técnicas de tu clase.', surface: true },
  { win: 'enfermeria', icon: ['healing', 'delapouite'], title: 'Enfermería', desc: 'Recupera vida y maná.' },
  { win: 'quests_gremio', icon: ['scroll-unfurled', 'lorc'], title: 'Encargos', desc: 'Misiones para miembros del gremio.', surface: true },
  { win: 'encantador', icon: ['magic-swirl', 'lorc'], title: 'Encantador', desc: 'Mejora tu equipo con piedras.' },
];
const COMMERCE = [
  { win: 'artesanos', icon: ['shop', 'delapouite'], title: 'Artesanos', desc: 'Materiales y venta de botín.', surface: true },
  { win: 'mercado', icon: ['money-stack', 'delapouite'], title: 'Mercado', desc: 'Comercia con otros jugadores.' },
  { win: 'taller', icon: ['anvil', 'lorc'], title: 'Taller', desc: 'Fabrica y desmantela equipo.', surface: true },
];

// Sala del gremio: estandarte arriba (tu gremio o cómo unirte a uno) y los servicios como un
// tablero de iconos grandes; cada uno abre su ventana sin salir del mapa.
export default function GuildPanel({ onClose, zIndex, onActivate, defaultPos, openWindow }) {
  const { token } = useAuth();
  const [myGuild, setMyGuild] = useState(undefined);
  const inAbyss = !!getAbyssCheckpoint();

  useEffect(() => { api.getMyGuild(token).then(setMyGuild).catch(() => setMyGuild(null)); }, [token]);

  const tile = (s) => {
    const locked = inAbyss && s.surface;
    return (
      <button key={s.win} type="button" className="wp-tile" disabled={locked} title={locked ? 'Solo en la superficie' : s.desc} onClick={() => openWindow?.(s.win)}>
        <span className="wp-tile-icon"><GameIcon name={s.icon[0]} artist={s.icon[1]} /></span>
        <strong>{s.title}</strong>
        <small>{locked ? 'Solo en la superficie' : s.desc}</small>
      </button>
    );
  };

  return (
    <FloatingPanel
      id="gremio"
      title="Gremio de aventureros"
      icon={<GameIcon name="castle" artist="delapouite" />}
      width={560}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
    >
      <div className="wp-guild-banner">
        <span className="wp-guild-crest"><GameIcon name={myGuild ? 'heraldic-sun' : 'checked-shield'} artist={myGuild ? 'caro-asercion' : 'lorc'} /></span>
        {myGuild === undefined && <p className="wp-empty">Cargando…</p>}
        {myGuild && (
          <div className="wp-guild-info">
            <strong>{myGuild.name}</strong>
            <small>Nivel {myGuild.level} · {myGuild.type === 'OPEN' ? 'Abierto' : 'Cerrado'} · {ROLE_LABEL[myGuild.myRole] ?? myGuild.myRole}</small>
            <button type="button" className="wp-btn wp-btn--gold" onClick={() => openWindow?.('mi_gremio')}>Sala del gremio</button>
          </div>
        )}
        {myGuild === null && (
          <div className="wp-guild-info">
            <strong>Sin gremio</strong>
            <small>Únete a uno o funda el tuyo para acceder a encargos, banco y mejoras compartidas.</small>
            <span className="wp-guild-actions">
              <button type="button" className="wp-btn wp-btn--gold" onClick={() => openWindow?.('unirse_gremio')}>Unirse</button>
              <button type="button" className="wp-btn" onClick={() => openWindow?.('crear_gremio')}>Fundar</button>
            </span>
          </div>
        )}
      </div>

      <h4 className="wp-section-title">Servicios</h4>
      <div className="wp-tiles">{SERVICES.map(tile)}</div>
      <h4 className="wp-section-title">Comercio</h4>
      <div className="wp-tiles">{COMMERCE.map(tile)}</div>
    </FloatingPanel>
  );
}
