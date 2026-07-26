import { Link } from 'react-router-dom';
import GameIcon from '../components/GameIcon';

export default function NotFound() {
  return (
    <div className="placeholder-page">
      <h1>
        <GameIcon name="magnifying-glass" artist="lorc" /> Página no encontrada
      </h1>
      <p>Esta ruta no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}
