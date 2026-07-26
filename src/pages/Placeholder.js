import { Link } from 'react-router-dom';
import GameIcon from '../components/GameIcon';

export default function Placeholder({ title }) {
  return (
    <div className="placeholder-page">
      <h1>
        <GameIcon name="fleur-de-lys" artist="delapouite" /> {title}{' '}
        <GameIcon name="fleur-de-lys" artist="delapouite" />
      </h1>
      <p>Próximamente.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}
