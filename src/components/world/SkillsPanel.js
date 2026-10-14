import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { STAT_LABELS } from './itemIcons';

const I = (name, artist) => ({ name, artist });

// Ícono por tipo de skill (la base no guarda uno propio)
export function skillIcon(s) {
  const n = (s.name || '').toLowerCase();
  if (s.skillType === 'CURACION') return I('heart-plus', 'zeromancer');
  if (s.skillType === 'PASIVA') return /escudo|defensa|piel|armadura/.test(n) ? I('checked-shield', 'lorc') : I('aura', 'lorc');
  if (s.skillType === 'BUFF') return s.targetType === 'SELF' ? I('muscle-up', 'lorc') : I('sparkles', 'delapouite');
  if (s.skillType === 'DEBUFF') return I('broken-shield', 'lorc');
  if (s.skillType === 'ESTADO_ALTERADO') return /veneno|toxic/.test(n) ? I('poison-bottle', 'lorc') : I('stopwatch', 'lorc');
  if (s.skillType === 'ESPECIAL') return I('magic-swirl', 'lorc');
  if (/fuego|llama|ign/.test(n)) return I('fireball', 'lorc');
  if (/hielo|escarcha|helad/.test(n)) return I('ice-bolt', 'lorc');
  if (/luz|sagrad|divin/.test(n)) return I('sunbeams', 'lorc');
  if (/flecha|disparo|tiro/.test(n)) return s.targetType === 'ALL_ENEMIES' ? I('arrow-cluster', 'lorc') : I('bullseye', 'skoll');
  if (/pu[nñ]o|golpe de palma|pu[nñ]etazo/.test(n)) return I('punch', 'lorc');
  if (s.damageSchool === 'MAGICO') return s.targetType === 'ALL_ENEMIES' ? I('crystal-ball', 'lorc') : I('crystal-wand', 'lorc');
  if (s.targetType === 'ALL_ENEMIES') return I('crossed-swords', 'lorc');
  return I('sword-brandish', 'delapouite');
}

export const TYPE_LABEL = {
  ATAQUE: 'Ataque', PASIVA: 'Pasiva', BUFF: 'Mejora', DEBUFF: 'Debilitación', ESTADO_ALTERADO: 'Estado alterado',
  ESPECIAL: 'Especial', CURACION: 'Curación',
};
export const TARGET_LABEL = { SELF: 'Uno mismo', ENEMY: 'Un enemigo', ALL_ENEMIES: 'Todos los enemigos', ALLY: 'Un aliado', ALL_ALLIES: 'Todo el grupo' };
const LEARN_LABEL = { LEVEL: 'Se aprende al nivel', GOLD: 'Se compra al maestro', QUEST: 'Recompensa de misión', ITEM: 'Se aprende con un objeto' };

function effectText(e) {
  const amount = e.percentAmount != null ? `${e.percentAmount}%` : e.flatAmount;
  const stat = STAT_LABELS[e.statCode] ?? e.statCode ?? '';
  const turns = e.durationTurns ? ` (${e.durationTurns} turnos)` : '';
  return `${e.effectType.replace(/_/g, ' ').toLowerCase()} ${stat} ${amount ?? ''}${turns}`.trim();
}

// Libro de habilidades: todas las skills de la clase, aprendidas y por aprender.
export default function SkillsPanel(props) {
  const { player, token } = useAuth();
  const [skills, setSkills] = useState(null);
  const [tab, setTab] = useState('activas');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getClassSkills(player.id, token).then(setSkills).catch(() => setSkills([]));
  }, [player, token]);

  const list = useMemo(() => (skills ?? [])
    .filter((s) => (tab === 'pasivas' ? s.isPassive : !s.isPassive))
    .sort((a, b) => Number(b.learned) - Number(a.learned) || (a.learnLevel ?? 999) - (b.learnLevel ?? 999)), [skills, tab]);

  const current = list.find((s) => s.id === selected) ?? list[0];
  const learnedCount = (skills ?? []).filter((s) => s.learned).length;

  return (
    <FloatingPanel
      {...props}
      id="habilidades"
      title="Libro de habilidades"
      icon={<GameIcon name="spell-book" artist="delapouite" />}
      width={620}
      footer={(
        <div className="wp-tabs">
          {[['activas', 'Activas'], ['pasivas', 'Pasivas']].map(([id, label]) => (
            <button key={id} type="button" className={`wp-tab${tab === id ? ' wp-tab--active' : ''}`} onClick={() => { setTab(id); setSelected(null); }}>{label}</button>
          ))}
          <span className="wp-foot-note">{learnedCount} / {skills?.length ?? 0} aprendidas</span>
        </div>
      )}
    >
      <div className="wp-split">
        <div className="wp-skill-list">
          {skills === null && <p className="wp-empty">Cargando…</p>}
          {list.map((s) => {
            const icon = skillIcon(s);
            return (
              <button
                key={s.id}
                type="button"
                className={`wp-skill${s.learned ? '' : ' wp-skill--locked'}${current?.id === s.id ? ' wp-skill--active' : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <span className="wp-skill-icon"><GameIcon name={icon.name} artist={icon.artist} /></span>
                <span className="wp-skill-name">{s.name}</span>
                <span className="wp-skill-meta">
                  {s.learned ? (s.manaCost ? `${s.manaCost} maná` : TYPE_LABEL[s.skillType]) : (s.learnLevel ? `Nv. ${s.learnLevel}` : '—')}
                </span>
              </button>
            );
          })}
        </div>
        {current && (
          <div className="wp-detail">
            <div className="wp-detail-head">
              <span className="wp-skill-icon wp-skill-icon--big"><GameIcon {...skillIcon(current)} /></span>
              <div>
                <h3>{current.name}</h3>
                <span className="wp-detail-sub">{TYPE_LABEL[current.skillType] ?? current.skillType}{current.damageSchool ? ` · ${current.damageSchool.toLowerCase()}` : ''}</span>
              </div>
            </div>
            <p className="wp-detail-desc">{current.description}</p>
            <div className="wp-detail-rows">
              {!current.isPassive && <div><span>Costo</span><strong className="wp-stat--mp">{current.manaCost} maná</strong></div>}
              <div><span>Objetivo</span><strong>{TARGET_LABEL[current.targetType] ?? current.targetType}</strong></div>
              {current.hits > 1 && <div><span>Golpes</span><strong>{current.hits}</strong></div>}
              <div>
                <span>Estado</span>
                <strong className={current.learned ? 'wp-stat--up' : 'wp-stat--locked'}>
                  {current.learned ? 'Aprendida' : `${LEARN_LABEL[current.learnMethod] ?? 'Bloqueada'}${current.learnLevel && current.learnMethod === 'LEVEL' ? ` ${current.learnLevel}` : ''}`}
                </strong>
              </div>
            </div>
            {current.effects?.length > 0 && (
              <ul className="wp-detail-effects">
                {current.effects.map((e, i) => <li key={i}>{effectText(e)}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </FloatingPanel>
  );
}
