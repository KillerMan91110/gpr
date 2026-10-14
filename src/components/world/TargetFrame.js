import GameIcon from '../GameIcon';
import { DIALOGUES } from '../../game/dialogues';

// Marco del objetivo (como el "target frame" de WoW, a la derecha del marco del héroe): muestra
// con quién o con qué vas a interactuar al pulsar E — NPC con su retrato, oficio y marca de
// misión; jefe con su rango y nivel; recurso para recolectar.
const RESOURCE_ICON = {
  hierba: ['herbs-bundle', 'delapouite'], setas: ['mushrooms', 'delapouite'], flor_luz: ['dandelion-flower', 'delapouite'],
  mineral: ['crystal-growth', 'lorc'], tronco: ['wood-axe', 'lorc'], cofre: ['locked-chest', 'lorc'],
  nido: ['nest-eggs', 'delapouite'], restos: ['skull-crossed-bones', 'lorc'],
  lino: ['flax', 'delapouite'], cuarzo: ['crystal-cluster', 'lorc'], trigo: ['wheat', 'lorc'],
};

export default function TargetFrame({ poi, marks = {} }) {
  if (!poi) return null;
  let kind = 'lugar';
  let name = String(poi.label ?? '').replace(/^(Hablar con|Desafiar a(l)?)\s*/i, '');
  let sub = 'Lugar';
  let portrait = null;
  let icon = ['position-marker', 'delapouite'];
  let level = null;
  let mark = null;

  if (poi.dialogue && DIALOGUES[poi.dialogue]) {
    const d = DIALOGUES[poi.dialogue];
    kind = 'npc';
    name = d.name;
    sub = d.role;
    portrait = d.portrait;
    mark = marks[poi.dialogue] ?? null;
  } else if (poi.boss) {
    kind = 'jefe';
    name = poi.boss.name ?? name;
    sub = poi.boss.rank === 'jefe' ? 'Jefe' : 'Minijefe';
    level = poi.boss.level ?? null;
    icon = ['crowned-skull', 'lorc'];
  } else if (poi.resource) {
    kind = 'recurso';
    sub = 'Recolectable';
    icon = RESOURCE_ICON[poi.resource.tipo] ?? ['sparkles', 'delapouite'];
  }

  return (
    <div className={`hud-target hud-target--${kind}`} aria-live="polite">
      <div className="hud-target-body">
        <div className="hud-target-name">
          <span>{name}</span>
          {mark && <b className={`hud-target-mark hud-target-mark--${mark === '?' ? 'entrega' : mark === 'gris' ? 'gris' : 'mision'}`}>{mark === 'gris' ? '!' : mark}</b>}
        </div>
        <small>{sub}{level ? ` · Nv ${level}` : ''}</small>
        <div className={`hud-target-bar hud-target-bar--${kind}`} />
        <em>[E] {kind === 'npc' ? 'Hablar' : kind === 'jefe' ? 'Desafiar' : kind === 'recurso' ? 'Recolectar' : 'Usar'}</em>
      </div>
      <div className="hud-target-portrait">
        {portrait ? <img src={portrait} alt="" draggable="false" /> : <GameIcon name={icon[0]} artist={icon[1]} />}
        {level && <span className="hud-level">{level}</span>}
      </div>
    </div>
  );
}
