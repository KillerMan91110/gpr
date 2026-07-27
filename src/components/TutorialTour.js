import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveCombat, isCombatInProgress } from '../utils/activeCombat';
import GameIcon from './GameIcon';

const STEPS = [
  {
    icon: { name: 'fleur-de-lys', artist: 'delapouite' },
    title: '¡Bienvenido a Etheria!',
    body: 'Sos un nuevo aventurero del reino. Te muestro rápido qué podés hacer — podés saltear esto cuando quieras.',
  },
  {
    icon: { name: 'compass', artist: 'lorc' },
    title: 'Explorar',
    body: 'Elegí una zona y enfrentá monstruos para ganar experiencia, oro y objetos. Empezá por la Pradera Dorada.',
  },
  {
    icon: { name: 'scroll-unfurled', artist: 'lorc' },
    title: 'Misiones',
    body: 'Aceptá contratos del gremio y de NPCs para ganar recompensas extra por objetivos concretos.',
  },
  {
    icon: { name: 'castle', artist: 'lorc' },
    title: 'Gremio',
    body: 'Tu gremio de aventureros: maestros de clase para aprender skills y comprar equipo, enfermería, y compañeros para reclutar.',
  },
  {
    icon: { name: 'backpack', artist: 'delapouite' },
    title: 'Inventario',
    body: 'Equipá armas, armaduras y accesorios, y usá las pociones y objetos que consigas explorando.',
  },
  {
    icon: { name: 'spell-book', artist: 'delapouite' },
    title: 'Habilidades',
    body: 'Las skills que fuiste aprendiendo, activas y pasivas, tanto tuyas como de tu formación.',
  },
  {
    icon: { name: 'crossed-swords', artist: 'lorc' },
    title: 'Formación',
    body: 'Armá tu grupo de combate con NPCs reclutados para pelear junto a vos.',
  },
  {
    icon: { name: 'paw-print', artist: 'lorc' },
    title: 'Mascotas',
    body: 'Conseguí e incubá mascotas que te acompañan y te dan bonos.',
  },
  {
    icon: { name: 'money-stack', artist: 'delapouite' },
    title: 'Mercado',
    body: 'Comprale y vendele objetos a otros jugadores.',
  },
  {
    icon: { name: 'shop', artist: 'delapouite' },
    title: 'Tienda de Artesanos',
    body: 'Comprá materiales y objetos especiales fuera del gremio.',
  },
  {
    icon: { name: 'blacksmith', artist: 'delapouite' },
    title: 'Taller de Crafteo',
    body: 'Usá materiales para craftear pociones, equipo y objetos únicos.',
  },
  {
    icon: { name: 'trophy', artist: 'lorc' },
    title: 'Logros',
    body: 'Objetivos de largo plazo que te dan recompensas al completarlos.',
  },
  {
    icon: { name: 'laurel-crown', artist: 'lorc' },
    title: 'Rangos',
    body: 'Tu progreso de rango dentro del gremio, de F hasta S.',
  },
  {
    icon: { name: 'trophy', artist: 'lorc' },
    title: 'Ranking',
    body: 'Comparate con el resto de los aventureros del reino.',
  },
  {
    icon: { name: 'shaking-hands', artist: 'delapouite' },
    title: 'Social',
    body: 'Agregá amigos y chateá con otros jugadores.',
  },
  {
    icon: { name: 'flag-objective', artist: 'delapouite' },
    title: '¡Empezá tu leyenda!',
    body: 'El Abismo y el World Boss se desbloquean más adelante, cuando tengas el nivel necesario. Por ahora, andá a explorar.',
  },
];

const STORAGE_PREFIX = 'tutorialSeen_';

// Tour de bienvenida puramente local: no toca el back, se guarda en localStorage por player.id
// asi que se muestra una vez por cuenta+navegador. Si el jugador esta en combate cuando entra
// (poco probable recien registrado, pero puede pasar en cuentas viejas la primera vez que esto
// se despliega) directamente no se muestra esa carga, para no taparle la pantalla de combate.
export default function TutorialTour() {
  const { player, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !player) {
      setVisible(false);
      return;
    }
    if (isCombatInProgress(getActiveCombat())) return;
    const seen = localStorage.getItem(STORAGE_PREFIX + player.id);
    if (!seen) {
      setStep(0);
      setVisible(true);
    }
  }, [isAuthenticated, player]);

  function finish() {
    if (player) localStorage.setItem(STORAGE_PREFIX + player.id, 'true');
    setVisible(false);
  }

  function handleNext() {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="tutorial-backdrop">
      <div className="rpg-panel tutorial-card">
        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tutorial-dot${i === step ? ' tutorial-dot--active' : ''}`} />
          ))}
        </div>
        <span className="tutorial-icon"><GameIcon {...current.icon} /></span>
        <h3 className="tutorial-title">{current.title}</h3>
        <p className="tutorial-body">{current.body}</p>
        <div className="tutorial-actions">
          <button type="button" className="tutorial-skip" onClick={finish}>
            Saltar tutorial
          </button>
          <button type="button" className="rpg-button rpg-button--small" onClick={handleNext}>
            {isLast ? 'Comenzar mi aventura' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
