import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const BASE_CLASS_IDS = [1, 2, 3, 4, 5];
// Los archivos en public/portraits/ están en Title Case (Guerrero.png), no en mayúsculas
// como el code de la clase (GUERRERO).
const CLASS_PORTRAIT_FILES = {
  GUERRERO: 'Guerrero',
  MAGO: 'Mago',
  ARQUERO: 'Arquero',
  PICARO: 'Picaro',
  SACERDOTE: 'Sacerdote',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getClasses()
      .then((all) => setClasses(all.filter((c) => BASE_CLASS_IDS.includes(c.id))))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!nickname) {
      setNicknameStatus(null);
      return;
    }
    const timer = setTimeout(() => {
      api.checkNickname(nickname)
        .then((res) => setNicknameStatus(res.available))
        .catch(() => setNicknameStatus(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [nickname]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!classId) {
      setError('Elige una clase');
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, nickname, classId: Number(classId) });
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
        <h1>Crear personaje</h1>
        <hr className="auth-divider" />
        {error && <p className="auth-error">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Nickname
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          {nicknameStatus === true && <span className="hint hint-ok">Disponible</span>}
          {nicknameStatus === false && <span className="hint hint-error">Ya está en uso</span>}
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <label>
          Clase
          <div className="class-picker">
            {classes.map((c) => {
              const fileName = CLASS_PORTRAIT_FILES[c.code];
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`class-card${Number(classId) === c.id ? ' class-card--selected' : ''}`}
                  onClick={() => setClassId(c.id)}
                >
                  {fileName && (
                    <img className="class-card-portrait" src={`/portraits/${fileName}.png`} alt={c.name} />
                  )}
                  <span className="class-card-name">{c.name}</span>
                  {c.role && <span className="class-card-role">{c.role}</span>}
                </button>
              );
            })}
          </div>
        </label>
        <button type="submit" className="rpg-button" disabled={loading || nicknameStatus === false}>
          {loading ? 'Creando...' : 'Crear personaje'}
        </button>
        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </form>
    </div>
  );
}
