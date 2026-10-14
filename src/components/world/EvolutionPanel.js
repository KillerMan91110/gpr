import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import './EvolutionPanel.css';

const I = (name, artist) => ({ name, artist });
// ícono de cada senda según su estilo (classes.role); el orden importa: lo más específico primero
const ROLE_ICONS = [
  [/fuego|dragón|explosiv/, I('flame', 'carl-olsen')], [/hielo/, I('snowflake-1', 'lorc')], [/rayo/, I('lightning-helix', 'lorc')],
  [/tierra/, I('stone-block', 'lorc')], [/agua/, I('water-drop', 'sbed')], [/viento|velocidad|evasión/, I('tornado', 'lorc')],
  [/veneno|toxina/, I('poison-bottle', 'lorc')], [/robo|saqueo|tesor/, I('robber', 'delapouite')],
  [/sigilo|sombra|letal/, I('hood', 'lorc')], [/oscur|corromp|corrupt|pactos/, I('evil-eyes', 'skoll')],
  [/cósmic|estelar/, I('galaxy', 'delapouite')], [/puño/, I('punch', 'lorc')], [/espada|filo/, I('sword-brandish', 'delapouite')],
  [/flecha|disparo|precisión|caza|distancia/, I('bullseye', 'skoll')], [/bestia|naturaleza|bosque|natural/, I('oak-leaf', 'delapouite')],
  [/curación|milagro|bendición|fe |fe$|sagrad|divin|luz|purific/, I('holy-symbol', 'lorc')],
  [/tanque|defensa|titán|golpe\/defensa/, I('checked-shield', 'lorc')], [/aliados/, I('angel-wings', 'lorc')],
  [/mágic|arcan|saber|elemental|sabiduría|control|dominio/, I('crystal-wand', 'lorc')],
  [/bruto|furia|daño|golpe/, I('crossed-swords', 'lorc')],
];
const roleIcon = (role) => ROLE_ICONS.find(([re]) => re.test((role ?? '').toLowerCase()))?.[1] ?? I('dna2', 'lorc');

const PORTRAITS = { GUERRERO: 'Guerrero', MAGO: 'Mago', ARQUERO: 'Arquero', PICARO: 'Picaro', SACERDOTE: 'Sacerdote' };

// geometría del árbol: la clase actual a la izquierda, las sendas en columna a la derecha
const TREE_W = 520;
const ROW_H = 74;
const ROOT_X = 62;
const NODE_X = 300;

// Árbol de evolución de tu clase (inspirado en los árboles de oficios de Ragnarok y las
// ascendencias de Path of Exile). Las sendas son un secreto: un medallón gris con candado hasta
// que cumples alguno de sus requisitos (el back ni siquiera manda su nombre); ahí se revela con
// todo lo que pide. Para evolucionar hay que cumplirlo todo, nivel incluido.
export default function EvolutionPanel({ stats, onChanged, ...props }) {
  const { player, token } = useAuth();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.getEvolutions(player.id, token).then(setData), [player, token]);
  useEffect(() => { load().catch((err) => setMessage({ ok: false, text: err.message })); }, [load]);

  const evolutions = useMemo(() => data?.evolutions ?? [], [data]);
  // por defecto, la primera senda lista para evolucionar o la primera revelada
  const current = evolutions.find((e) => e.evolutionId === selected)
    ?? evolutions.find((e) => e.canEvolve) ?? evolutions.find((e) => !e.locked) ?? null;
  const hidden = evolutions.filter((e) => e.locked).length;
  const chain = stats?.classChain?.length ? stats.classChain : stats?.class ? [stats.class] : [];
  const me = chain[chain.length - 1];
  const portrait = PORTRAITS[(me?.code ?? '').toUpperCase()];

  const height = Math.max(170, evolutions.length * ROW_H + 20);
  const rootY = height / 2;
  const nodeY = (i) => 10 + ROW_H / 2 + i * ROW_H;

  const evolve = async () => {
    if (busy || !current) return;
    setBusy(true);
    try {
      await api.evolve(player.id, current.evolutionId, token);
      audio.sfx('mision');
      setMessage({ ok: true, text: `¡Evolucionaste a ${current.toClassName}!` });
      setConfirm(false);
      setSelected(null);
      await load();
      onChanged?.();
    } catch (err) {
      audio.sfx('error');
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const pick = (evo) => {
    if (evo.locked) { audio.sfx('error'); return; }
    audio.sfx('abrir');
    setSelected(evo.evolutionId);
    setConfirm(false);
  };

  return (
    <FloatingPanel
      {...props}
      id="evolucion"
      title="Evolución"
      icon={<GameIcon name="dna2" artist="lorc" />}
      width={580}
      footer={(
        <div className="wp-tabs">
          <span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>
            {message?.text ?? (hidden ? `${hidden} ${hidden === 1 ? 'senda oculta' : 'sendas ocultas'} · se revelan al cumplir alguno de sus requisitos` : 'Todas tus sendas están reveladas')}
          </span>
        </div>
      )}
    >
      {chain.length > 0 && (
        <div className="evp-path">
          {chain.map((c, i) => (
            <span key={c.id} className={`evp-path-node${i === chain.length - 1 ? ' evp-path-node--now' : ''}`}>
              {i > 0 && <em>›</em>}{c.name}
            </span>
          ))}
          <small>Nv. {data?.level ?? stats?.level}</small>
        </div>
      )}

      {!data && <p className="wp-empty">Cargando…</p>}
      {data && evolutions.length === 0 && <p className="wp-empty">Tu clase ya no tiene más evoluciones.</p>}

      {evolutions.length > 0 && (
        <div className="evp-tree" style={{ height, width: TREE_W }}>
          <svg className="evp-lines" width={TREE_W} height={height} aria-hidden="true">
            {evolutions.map((evo, i) => {
              const y = nodeY(i);
              const x1 = ROOT_X + 38; const x2 = NODE_X - 30; const mx = (x1 + x2) / 2;
              const cls = evo.locked ? 'evp-line--locked' : evo.canEvolve ? 'evp-line--ready' : current?.evolutionId === evo.evolutionId ? 'evp-line--active' : '';
              return <path key={evo.evolutionId} className={`evp-line ${cls}`} d={`M${x1},${rootY} C${mx},${rootY} ${mx},${y} ${x2},${y}`} />;
            })}
          </svg>

          <div className="evp-root" style={{ left: ROOT_X, top: rootY }}>
            <div className="evp-medal evp-medal--root">
              {portrait
                ? <img src={`${process.env.PUBLIC_URL}/portraits/${portrait}.png`} alt="" draggable="false" />
                : <GameIcon {...roleIcon(me?.role)} />}
            </div>
            <span className="evp-root-name">{me?.name ?? 'Tu clase'}</span>
          </div>

          {evolutions.map((evo, i) => {
            const met = evo.locked ? 0 : evo.requirements.filter((r) => r.met).length + (evo.levelMet ? 1 : 0);
            const total = evo.locked ? 0 : evo.requirements.length + 1;
            const state = evo.locked ? 'locked' : evo.canEvolve ? 'ready' : 'open';
            return (
              <button
                key={evo.evolutionId}
                type="button"
                className={`evp-node evp-node--${state}${current?.evolutionId === evo.evolutionId ? ' evp-node--active' : ''}`}
                style={{ left: NODE_X, top: nodeY(i) }}
                onClick={() => pick(evo)}
                title={evo.locked ? 'Senda oculta' : evo.toClassName}
              >
                <span className="evp-medal">
                  <GameIcon {...(evo.locked ? I('padlock', 'lorc') : roleIcon(evo.toClassRole))} />
                  {!evo.locked && (
                    <svg className="evp-ring" viewBox="0 0 36 36" aria-hidden="true">
                      <circle cx="18" cy="18" r="16" pathLength="100" strokeDasharray={`${(met / total) * 100} 100`} />
                    </svg>
                  )}
                </span>
                <span className="evp-node-text">
                  <strong>{evo.locked ? '???' : evo.toClassName}</strong>
                  <small>{evo.locked ? 'Senda oculta' : evo.canEvolve ? '¡Lista para evolucionar!' : `${met}/${total} requisitos`}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {current && (
        <div className={`evp-detail${current.canEvolve ? ' evp-detail--ready' : ''}`}>
          <div className="evp-detail-head">
            <span className="evp-medal evp-medal--small"><GameIcon {...roleIcon(current.toClassRole)} /></span>
            <div>
              <h3>{current.toClassName}</h3>
              {current.toClassRole && <small>{current.toClassRole}</small>}
            </div>
          </div>
          <ul className="evp-reqs">
            <Req met={current.levelMet} text={`Nivel ${current.requiredLevel}`} current={data?.level} target={current.requiredLevel} />
            {current.requirements.map((req, i) => (
              <Req key={i} met={req.met} unknown={req.available === false} text={req.description} current={req.current} target={req.target} />
            ))}
          </ul>
          {current.canEvolve && (confirm ? (
            <div className="evp-confirm">
              <span>Evolucionar es para siempre. ¿Seguro?</span>
              <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={evolve}>Sí, evolucionar</button>
              <button type="button" className="wp-btn" disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button>
            </div>
          ) : (
            <button type="button" className="wp-btn wp-btn--gold wp-btn--wide evp-go" onClick={() => setConfirm(true)}>
              Evolucionar a {current.toClassName}
            </button>
          ))}
        </div>
      )}
    </FloatingPanel>
  );
}

// un requisito con su barra de progreso (si tiene contador)
function Req({ met, unknown, text, current, target }) {
  const hasBar = target != null && current != null && Number(target) > 0;
  const pct = hasBar ? Math.min(100, (Number(current) / Number(target)) * 100) : met ? 100 : 0;
  return (
    <li className={met ? 'evp-req--met' : unknown ? 'evp-req--unknown' : ''}>
      <span className="evp-req-mark">{met ? '✓' : unknown ? '…' : '✗'}</span>
      <span className="evp-req-text">
        {text}
        {hasBar && !met && <em>{Math.min(Number(current), Number(target))}/{target}</em>}
      </span>
      {hasBar && <span className="evp-req-bar"><i style={{ width: `${pct}%` }} /></span>}
    </li>
  );
}
