import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const TYPE_LABELS = {
  PASIVA: 'Pasiva', ATAQUE: 'Ataque', CURACION: 'Curación',
  BUFF: 'Buff', DEBUFF: 'Debuff', ESPECIAL: 'Especial', ESTADO_ALTERADO: 'Estado',
};
const TYPE_CSS = {
  PASIVA: 'skill-type--passive', ATAQUE: 'skill-type--attack', CURACION: 'skill-type--heal',
  BUFF: 'skill-type--buff', DEBUFF: 'skill-type--debuff', ESPECIAL: 'skill-type--special',
  ESTADO_ALTERADO: 'skill-type--status',
};
const TARGET_LABELS = {
  SELF: 'Uno mismo', SINGLE_ENEMY: 'Un enemigo', ALL_ENEMIES: 'Todos los enemigos',
  SINGLE_ALLY: 'Un aliado', ALL_ALLIES: 'Todos los aliados',
};
const SCHOOL_LABELS = { PHYSICAL: 'Físico', MAGICAL: 'Mágico' };
const STAT_LABELS = {
  ATK: 'ATK', MAG: 'INT', HP: 'HP', SPD: 'SPD', DEF: 'DEF',
  CRIT_CHANCE: 'CRIT', EVASION: 'Evasión', MAGIC_DAMAGE_DEALT: 'DMG Mágico',
};

function isPassiveSkill(s) {
  return s.isPassive || s.skillType === 'PASIVA';
}

function EffectSummary({ effects }) {
  if (!effects?.length) return null;
  return (
    <div className="skill-effects">
      {effects.map((e, i) => {
        const stat = STAT_LABELS[e.statCode] || e.statCode;
        if (e.effectType === 'HOT') return <span key={i} className="skill-effect">Regen HP +{e.percentAmount}%/turno</span>;
        if (e.effectType === 'STAT_MOD' && e.percentAmount != null) return <span key={i} className="skill-effect">+{e.percentAmount}% {stat}</span>;
        if (e.effectType === 'STAT_MOD' && e.flatAmount != null) return <span key={i} className="skill-effect">+{e.flatAmount} {stat}</span>;
        return null;
      })}
    </div>
  );
}

export default function Skills() {
  const { player, token } = useAuth();
  const [party, setParty] = useState(null);
  const [skills, setSkills] = useState(null);
  const [activeMember, setActiveMember] = useState(0);
  const [filterType, setFilterType] = useState('activas');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.getParty(player.id, token).then(setParty).catch(() => setParty(null));
  }, [player, token]);

  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];
  const slot2Npc = partyNpcs.find((n) => n.slot === 2) || null;
  const slot3Npc = partyNpcs.find((n) => n.slot === 3) || null;
  const activeNpc = activeMember === 1 ? slot2Npc : activeMember === 2 ? slot3Npc : null;

  useEffect(() => {
    if (!player) return;
    // Si el slot está seleccionado pero el NPC aún no cargó, esperar
    if ((activeMember === 1 && !slot2Npc) || (activeMember === 2 && !slot3Npc)) return;
    setSkills(null);
    setError('');
    api.getClassSkills(player.id, token, activeNpc?.npcId)
      .then(setSkills)
      .catch((err) => setError(err.message));
  }, [player, token, activeMember, activeNpc?.npcId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = (skills || []).filter((s) => {
    if (!s.learned) return false;
    if (filterType === 'activas' && isPassiveSkill(s)) return false;
    if (filterType === 'pasivas' && !isPassiveSkill(s)) return false;
    return true;
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>✦ Habilidades</h1>
          <p className="dashboard-subtitle">Skills de tu clase y tu formación.</p>
        </div>
        <Link className="logout-btn" to="/">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}

      <div className="hero-switcher" style={{ marginBottom: 16 }}>
        <button
          className={`switcher-btn${activeMember === 0 ? ' switcher-btn--active' : ''}`}
          onClick={() => setActiveMember(0)}
        >
          {player.nickname}
        </button>
        <button
          className={`switcher-btn${activeMember === 1 ? ' switcher-btn--active' : ''}`}
          onClick={() => setActiveMember(1)}
          disabled={!slot2Npc}
        >
          {slot2Npc ? slot2Npc.name : 'Slot 2'}
        </button>
        <button
          className={`switcher-btn${activeMember === 2 ? ' switcher-btn--active' : ''}`}
          onClick={() => setActiveMember(2)}
          disabled={!slot3Npc}
        >
          {slot3Npc ? slot3Npc.name : 'Slot 3'}
        </button>
      </div>

      <div className="craft-filter-bar">
        <button
          className={`rpg-button rpg-button--small${filterType === 'activas' ? ' quest-tab--active' : ''}`}
          onClick={() => setFilterType('activas')}
        >
          Activas
        </button>
        <button
          className={`rpg-button rpg-button--small${filterType === 'pasivas' ? ' quest-tab--active' : ''}`}
          onClick={() => setFilterType('pasivas')}
        >
          Pasivas
        </button>
      </div>

      {!skills && !error && <div className="dashboard-loading">Cargando habilidades...</div>}

      {skills && filtered.length === 0 && (
        <div className="rpg-panel"><p className="hint">No hay skills con ese filtro.</p></div>
      )}

      <div className="skill-list">
        {filtered.map((s) => (
          <div key={s.id} className={`rpg-panel skill-card${s.learned ? '' : ' skill-card--unlearned'}`}>
            <div className="skill-card-header">
              <span className="skill-name">{s.name}</span>
              <span className={`skill-type-badge ${TYPE_CSS[s.skillType] || ''}`}>
                {TYPE_LABELS[s.skillType] || s.skillType}
              </span>
            </div>

            <div className="skill-meta">
              {s.learned
                ? <span className="skill-learned-mark">✓ Aprendida</span>
                : s.learnMethod === 'LEVEL'
                  ? <span className="skill-unlock-hint">Se aprende en nivel {s.learnLevel}</span>
                  : <span className="skill-unlock-hint">Se aprende en el gremio</span>
              }
              {!isPassiveSkill(s) && s.manaCost > 0 && (
                <span className="skill-stat-chip">{s.manaCost} maná</span>
              )}
              {!isPassiveSkill(s) && s.targetType && (
                <span className="skill-stat-chip">{TARGET_LABELS[s.targetType] || s.targetType}</span>
              )}
              {!isPassiveSkill(s) && s.damageSchool && (
                <span className="skill-stat-chip">{SCHOOL_LABELS[s.damageSchool] || s.damageSchool}</span>
              )}
              {!isPassiveSkill(s) && s.hits > 1 && (
                <span className="skill-stat-chip">{s.hits} golpes</span>
              )}
            </div>

            {s.description && <p className="skill-description">{s.description}</p>}
            {isPassiveSkill(s) && <EffectSummary effects={s.effects} />}
          </div>
        ))}
      </div>
    </div>
  );
}
