import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card rpg-panel" onSubmit={handleSubmit}>
        <span className="auth-kicker">⚜ Reino de Disgaea ⚜</span>
        <h1>Iniciar sesión</h1>
        <hr className="auth-divider" />
        {error && <p className="auth-error">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="rpg-button" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar al reino'}
        </button>
        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/register">Crear Cuenta</Link>
        </p>
      </form>
    </div>
  );
}
