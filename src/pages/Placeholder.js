import { Link } from 'react-router-dom';

export default function Placeholder({ title }) {
  return (
    <div className="placeholder-page">
      <h1>⚜ {title} ⚜</h1>
      <p>Próximamente.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  );
}
