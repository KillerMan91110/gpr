import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import GameIcon from '../components/GameIcon';

const CLASSES = [
  {
    key: 'guerrero',
    name: 'Guerrero',
    icon: { name: 'broadsword', artist: 'lorc' },
    text: 'Maestros del combate cuerpo a cuerpo. Su fuerza y resistencia les permiten enfrentar a cualquier criatura en primera línea.',
  },
  {
    key: 'mago',
    name: 'Mago',
    icon: { name: 'wizard-staff', artist: 'lorc' },
    text: 'Estudiosos del Éter. Controlan los elementos y dominan hechizos capaces de cambiar el rumbo de cualquier batalla.',
  },
  {
    key: 'picaro',
    name: 'Pícaro',
    icon: { name: 'daggers', artist: 'lorc' },
    text: 'Especialistas en velocidad, venenos y golpes críticos. Atacan desde las sombras antes de desaparecer de nuevo.',
  },
  {
    key: 'sacerdote',
    name: 'Sacerdote',
    icon: { name: 'holy-symbol', artist: 'lorc' },
    text: 'Elegidos por la Luz de Disgaea. Curan aliados, eliminan maldiciones y usan magia sagrada contra las fuerzas oscuras.',
  },
  {
    key: 'arquero',
    name: 'Arquero',
    icon: { name: 'bow-arrow', artist: 'delapouite' },
    text: 'Expertos en combate a distancia. Su precisión abate enemigos antes incluso de ser vistos.',
  },
];

const GUILDS = [
  { name: 'Gremio de Aventureros', icon: { name: 'crossed-swords', artist: 'lorc' } },
  { name: 'Gremio de Herreros', icon: { name: 'anvil', artist: 'lorc' } },
  { name: 'Gremio de Encantadores', icon: { name: 'spell-book', artist: 'delapouite' } },
  { name: 'Gremio de Sastres', icon: { name: 'sewing-needle', artist: 'lorc' } },
  { name: 'Gremio de Alquimistas', icon: { name: 'round-bottom-flask', artist: 'lorc' } },
  { name: 'Gremio de Joyeros', icon: { name: 'gems', artist: 'lorc' } },
  { name: 'Gremio de Eruditos', icon: { name: 'open-book', artist: 'lorc' } },
  { name: 'Gremio de Comerciantes', icon: { name: 'shopping-cart', artist: 'delapouite' } },
];

const ZONES = [
  {
    name: 'Pradera Dorada',
    level: '1-15',
    icon: { name: 'wheat', artist: 'lorc' },
    text: 'El punto de partida de todo aventurero. Lobos, goblins, bandidos y criaturas salvajes acechan entre los campos dorados. Su guardián es el gigantesco Titán de la Pradera, cuya derrota demuestra que un aventurero está listo para dejar las tierras iniciales.',
  },
  {
    name: 'Montañas Grises',
    level: '16-30',
    icon: { name: 'mountaintop', artist: 'lorc' },
    text: 'Gigantes de hielo, orcos, trolls y antiguos guardianes de piedra habitan estas montañas. Bajo sus picos hay minas abandonadas donde aún resuenan extraños rituales.',
  },
  {
    name: 'Volcán Rojo',
    level: '31-45',
    icon: { name: 'volcano', artist: 'lorc' },
    text: 'El corazón ardiente del reino. La lava dio vida a demonios, salamandras y elementales de fuego. Nadie conoce el verdadero origen del Maestro de la Lava.',
  },
  {
    name: 'Costas Muertas',
    level: '46-60',
    icon: { name: 'pirate-flag', artist: 'delapouite' },
    text: 'El mar reclama a quienes se acercan demasiado. Piratas malditos, monstruos marinos y espíritus de antiguos navegantes vagan por playas envueltas en tormentas eternas.',
  },
  {
    name: 'Tundra Eterna',
    level: '61-75',
    icon: { name: 'snowflake-1', artist: 'lorc' },
    text: 'Un desierto helado donde el tiempo parece detenido. Guardianes ancestrales protegen un antiguo templo oculto bajo el hielo.',
  },
  {
    name: 'Catacumbas del Abismo',
    level: '76-85',
    icon: { name: 'tombstone', artist: 'lorc' },
    text: 'Las ruinas de una civilización perdida. Nigromantes, espectros y muertos vivientes custodian conocimientos que nunca debieron descubrirse.',
  },
  {
    name: 'Ruinas Ancestrales',
    level: '86-100',
    icon: { name: 'magic-portal', artist: 'lorc' },
    text: 'El lugar donde comenzó la Gran Fractura. Aquí la magia deja de obedecer las leyes conocidas y los Guardianes Ancestrales protegen un secreto capaz de cambiar el destino de Disgaea.',
  },
];

// IntersectionObserver liviano para revelar cada sección al entrar en pantalla — sin libs nuevas,
// consistente con el resto del proyecto. Si el navegador no soporta IO, .reveal nunca se agrega
// y el CSS trata la ausencia de la clase como "visible" (ver .landing-section en App.css).
function useRevealOnScroll() {
  const rootRef = useRef(null);
  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll('.landing-reveal') || [];
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('landing-reveal--visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);
  return rootRef;
}

export default function Landing() {
  const rootRef = useRevealOnScroll();

  return (
    <div className="landing-page" ref={rootRef}>
      <header className="landing-topbar">
        <span className="landing-topbar-brand">
          <GameIcon name="fleur-de-lys" artist="delapouite" /> Disgaea
        </span>
        <Link to="/login" className="rpg-button rpg-button--small">Iniciar sesión</Link>
      </header>

      <section className="landing-hero">
        <span className="landing-kicker">
          <GameIcon name="fleur-de-lys" artist="delapouite" /> Reino de Disgaea{' '}
          <GameIcon name="fleur-de-lys" artist="delapouite" />
        </span>
        <h1 className="landing-hero-title">Bienvenido a Disgaea</h1>
        <p className="landing-hero-lede">
          Un reino donde la magia y el acero conviven desde hace siglos. Más allá de sus murallas
          se extiende un mundo salvaje de monstruos, ruinas olvidadas y secretos que nadie ha
          logrado desentrañar.
        </p>
        <div className="landing-hero-actions">
          <Link to="/login" className="rpg-button">Iniciar sesión</Link>
          <Link to="/register" className="rpg-button rpg-button--ghost">Crear cuenta</Link>
        </div>
      </section>

      <section className="landing-section landing-reveal">
        <h2><GameIcon name="castle" artist="lorc" /> El Reino de Disgaea</h2>
        <p>
          Gobernado por la Corona de Disgaea, el reino es el mayor bastión de la civilización
          conocida. Castillos, aldeas, fortalezas y academias mágicas se alzan bajo su bandera,
          protegidos por caballeros, magos y aventureros.
        </p>
        <p>
          Aunque las ciudades son seguras, los caminos nunca lo son. Cada año aparecen nuevas
          criaturas, antiguas ruinas emergen de la tierra y las fuerzas oscuras avanzan un poco más.
        </p>
        <p>
          Por eso nació el <strong>Gremio de Aventureros</strong>: una organización encargada de
          entrenar héroes, aceptar contratos y organizar expediciones hacia las zonas más
          peligrosas del reino.
        </p>
        <div className="landing-callout rpg-panel">
          <h3><GameIcon name="eclipse" artist="lorc" /> La Gran Fractura</h3>
          <p>
            Hace más de mil años, una catástrofe conocida como la <strong>Gran Fractura</strong>{' '}
            alteró el equilibrio del mundo. La energía mágica comenzó a brotar desde las
            profundidades de la tierra, corrompiendo bestias, despertando gigantes dormidos y
            abriendo portales hacia lugares prohibidos. Desde entonces, Disgaea depende de sus
            aventureros para mantener la paz.
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--alt landing-reveal">
        <h2><GameIcon name="crossed-swords" artist="lorc" /> Las Cinco Clases Fundamentales</h2>
        <p>Todo aventurero comienza su historia eligiendo uno de los cinco caminos.</p>
        <div className="landing-classes-grid">
          {CLASSES.map((c) => (
            <div key={c.key} className="rpg-panel landing-class-card">
              <span className="landing-class-icon"><GameIcon {...c.icon} /></span>
              <h3>{c.name}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-reveal">
        <h2><GameIcon name="wizard-face" artist="delapouite" /> Los Maestros de Clase</h2>
        <p>
          Cada camino tiene un Maestro del Gremio, veteranos considerados los mejores de todo
          Disgaea. Solo quienes demuestren verdadero talento podrán aprender sus técnicas
          avanzadas y descubrir habilidades ocultas.
        </p>
      </section>

      <section className="landing-section landing-section--alt landing-reveal">
        <h2><GameIcon name="money-stack" artist="delapouite" /> Los Grandes Gremios</h2>
        <p>
          La economía y la supervivencia del reino dependen de antiguos gremios especializados.
          Cada uno ofrece mejoras, equipo, misiones y conocimientos únicos.
        </p>
        <div className="landing-guilds-grid">
          {GUILDS.map((g) => (
            <div key={g.name} className="landing-guild-chip">
              <GameIcon {...g.icon} /> {g.name}
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-reveal">
        <h2><GameIcon name="compass" artist="lorc" /> Las Zonas de Disgaea</h2>
        <p>Cada región representa un desafío mayor que la anterior.</p>
        <div className="landing-zones-grid">
          {ZONES.map((z) => (
            <div key={z.name} className="rpg-panel landing-zone-card">
              <div className="landing-zone-header">
                <span className="landing-zone-icon"><GameIcon {...z.icon} /></span>
                <div>
                  <h3>{z.name}</h3>
                  <span className="landing-zone-level">Nivel {z.level}</span>
                </div>
              </div>
              <p>{z.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-feature landing-feature--abismo landing-reveal">
        <div className="landing-feature-inner">
          <span className="landing-feature-icon"><GameIcon name="vortex" artist="lorc" /></span>
          <h2>El Abismo</h2>
          <p>
            Mucho antes de la fundación del reino existía una inmensa prisión construida por una
            civilización desaparecida. Con el paso de los siglos fue olvidada... hasta que
            comenzó a abrirse de nuevo.
          </p>
          <p>Hoy se la conoce simplemente como <strong>El Abismo</strong>.</p>
          <p>
            Cada piso desciende más hacia las profundidades del mundo, donde la corrupción es más
            intensa y los monstruos más poderosos. Los aventureros pueden extraer antiguas{' '}
            <strong>Monedas de Mazmorra</strong> — pero si todo el grupo cae antes de escapar, las
            profundidades reclaman todo el botín. Nadie sabe cuántos pisos existen realmente.
          </p>
        </div>
      </section>

      <section className="landing-feature landing-feature--worldboss landing-reveal">
        <div className="landing-feature-inner">
          <span className="landing-feature-icon"><GameIcon name="galaxy" artist="delapouite" /></span>
          <h2>El Devorador de Estrellas</h2>
          <p>Existe una criatura que ningún reino ha logrado derrotar. No pertenece a este mundo.</p>
          <p>
            Las leyendas cuentan que cayó del cielo durante la Gran Fractura, envuelta en un
            eclipse. Su cuerpo absorbe la magia del entorno y consume la energía vital de todo lo
            que se acerca.
          </p>
          <p>
            Cuando aparece, todas las campanas del reino resuenan al mismo tiempo. Los aventureros
            abandonan sus misiones. Los gremios unen fuerzas. Incluso los Maestros de Clase toman
            las armas.
          </p>
          <p className="landing-feature-emphasis">
            Porque saben que si el Devorador de Estrellas permanece con vida demasiado tiempo...
            el cielo volverá a oscurecerse.
          </p>
        </div>
      </section>

      <section className="landing-closing landing-reveal">
        <h2>Una nueva leyenda comienza</h2>
        <p>
          Cada monstruo derrotado. Cada jefe conquistado. Cada objeto forjado. Cada gremio
          fortalecido. Cada piso del Abismo explorado.
        </p>
        <p>
          Todo forma parte de una única historia: la historia de Disgaea... y la del aventurero
          que decidirá el destino del reino.
        </p>
        <div className="landing-hero-actions">
          <Link to="/register" className="rpg-button">Comenzar mi leyenda</Link>
        </div>
        <p className="landing-closing-switch">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>

      <footer className="landing-footer">
        <span><GameIcon name="fleur-de-lys" artist="delapouite" /> Disgaea — un mundo por explorar</span>
      </footer>
    </div>
  );
}
