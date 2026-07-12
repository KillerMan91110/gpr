import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };

const SERVICE_SECTIONS = [
  {
    to: '/guild/adventurers',
    icon: '⚔',
    title: 'Contratar Aventureros',
    description: 'Reclutá NPCs para tu equipo. Refrescá el pool para ver nuevos candidatos.',
  },
  {
    to: '/guild/masters',
    icon: '🎓',
    title: 'Maestros de Gremio',
    description: 'Las 5 clases base tienen su propio maestro. Aprendé skills si tu clase coincide.',
  },
  {
    to: '/guild/infirmary',
    icon: '✚',
    title: 'Enfermería',
    description: 'Restaurá tu HP y Maná al máximo antes de salir a explorar.',
  },
  {
    to: '/guild/quests',
    icon: '📜',
    title: 'Quests del Gremio',
    description: 'Misiones exclusivas para miembros, con recompensas para vos y el tesoro del gremio.',
  },
  {
    to: '/guild/enchant',
    icon: '✦',
    title: 'Encantador',
    description: 'Mejorá el nivel de encantamiento de tu equipo equipado con piedras mágicas.',
  },
];

const COMMERCE_SECTIONS = [
  {
    to: '/artisan-shop',
    icon: '🏪',
    title: 'Tienda de Artesanos',
    description: 'Comprá materiales raros o vendé ítems a los artesanos del gremio.',
  },
  {
    to: '/market',
    icon: '💰',
    title: 'Mercado de Jugadores',
    description: 'Publicá ítems de tu inventario a la venta o comprále a otros jugadores.',
  },
  {
    to: '/crafting',
    icon: '⚒',
    title: 'Taller de Crafteo',
    description: 'Fabricá ítems con materiales o desmantelá equipos para recuperar componentes.',
  },
];

export default function Guild() {
  const { token } = useAuth();
  const [myGuild, setMyGuild] = useState(undefined);

  useEffect(() => {
    api.getMyGuild(token)
      .then(setMyGuild)
      .catch(() => setMyGuild(null));
  }, [token]);

  if (myGuild === undefined) return <div className="dashboard-loading">Cargando...</div>;

  const guildSections = myGuild
    ? [
        {
          to: '/guild/my',
          icon: '🏛',
          title: myGuild.name,
          description: `Nivel ${myGuild.level} · ${myGuild.type === 'OPEN' ? 'Abierto' : 'Cerrado'} · Rol: ${ROLE_LABEL[myGuild.myRole] ?? myGuild.myRole}`,
        },
      ]
    : [
        {
          to: '/guild/create',
          icon: '🏗',
          title: 'Crear Gremio',
          description: 'Fundá tu propio gremio y convertite en su líder.',
        },
        {
          to: '/guild/join',
          icon: '🤝',
          title: 'Unirse a un Gremio',
          description: 'Buscá un gremio existente y pedí formar parte de él.',
        },
      ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🏛 Gremio de Aventureros</h1>
          <p className="dashboard-subtitle">Tu base de operaciones entre expediciones</p>
        </div>
        <Link className="logout-btn" to="/">
          Volver
        </Link>
      </header>

      <div className="zone-list">
        {guildSections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className={`zone-card rpg-panel guild-section-link${myGuild ? ' guild-section-link--mine' : ''}`}
          >
            <div className="zone-card-header">
              <h3>
                {section.icon} {section.title}
              </h3>
            </div>
            <p className="zone-description">{section.description}</p>
          </Link>
        ))}
      </div>

      <h2 className="guild-category-title">Servicios del Gremio</h2>
      <div className="zone-list">
        {SERVICE_SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="zone-card rpg-panel guild-section-link">
            <div className="zone-card-header">
              <h3>
                {section.icon} {section.title}
              </h3>
            </div>
            <p className="zone-description">{section.description}</p>
          </Link>
        ))}
      </div>

      <h2 className="guild-category-title">Comercio</h2>
      <div className="zone-list">
        {COMMERCE_SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="zone-card rpg-panel guild-section-link">
            <div className="zone-card-header">
              <h3>
                {section.icon} {section.title}
              </h3>
            </div>
            <p className="zone-description">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
