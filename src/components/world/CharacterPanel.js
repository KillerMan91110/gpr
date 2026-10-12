import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, SLOT_LABELS, SLOT_PLACEHOLDER } from './itemIcons';
import { ELEMENTS } from '../../game/elements';

const ASSETS = `${process.env.PUBLIC_URL}/assets/sprites/combate`;
// Arma que se dibuja en la vista previa cuando hay algo en la casilla de arma (ver manifest.json)
const CLASS_WEAPON = { guerrero: 'espada', mago: 'baculo_arcano', arquero: 'arco', picaro: 'daga', sacerdote: 'baculo_sagrado' };
const LEFT = ['HELMET', 'ARMOR', 'GLOVES'];
const RIGHT = ['BOOTS', 'ACCESSORY'];
const BOTTOM = ['WEAPON', 'OFFHAND'];
const TABS = [['personaje', 'Personaje'], ['elementos', 'Elementos'], ['rango', 'Rango']];

function Row({ label, value, accent }) {
  return (
    <div className="wp-stat-row">
      <span>{label}</span>
      <strong className={accent ? `wp-stat--${accent}` : undefined}>{value}</strong>
    </div>
  );
}

// Fila de un elemento con su ícono y color (los mismos que en el combate, ver game/elements.js).
// El valor se apaga cuando es 0 y se resalta cuando es distinto.
function ElementRow({ code, label, value, text }) {
  const el = ELEMENTS[code];
  const color = el?.color ?? 'var(--cream)';
  return (
    <div className={`wp-stat-row wp-elem-row${value ? '' : ' wp-elem-row--zero'}`} style={{ '--elem': color }}>
      <span className="wp-elem-name">
        {el && <span className="wp-elem-icon"><GameIcon name={el.icon[0]} artist={el.icon[1]} /></span>}
        {label}
      </span>
      <strong>{text}</strong>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="wp-stat-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

const pct = (v) => `${Number(v ?? 0).toFixed(Number.isInteger(Number(v)) ? 0 : 2)}%`;

// Ficha del personaje estilo MMO: casillas de equipo alrededor del sprite y las stats al lado.
// Clic derecho en una casilla equipada la desequipa.
export default function CharacterPanel({ stats, refreshKey, onChanged, onClose, zIndex, onActivate }) {
  const { player, token } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [hover, setHover] = useState(null);
  const [tab, setTab] = useState('personaje');
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    api.getPlayerEquipment(player.id, token).then(setEquipment).catch(() => setEquipment([]));
  }, [player, token]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const bySlot = Object.fromEntries(equipment.map((e) => [e.slot, e.item]));
  const baseClass = (stats.classChain?.[0]?.code ?? stats.class?.code ?? 'guerrero').toLowerCase();
  const sprite = CLASS_WEAPON[baseClass] ? baseClass : 'guerrero';
  const className = stats.classChain?.length ? stats.classChain[stats.classChain.length - 1].name : stats.class?.name;

  const unequip = async (slot) => {
    const item = bySlot[slot];
    if (!item) return;
    setHover(null);
    try {
      await api.unequipItem(player.id, slot, token);
      setMessage(`Desequipaste ${item.name}`);
      load();
      onChanged?.();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const renderSlot = (slot) => {
    const item = bySlot[slot];
    const icon = item ? iconForItem({ name: item.name, slot }) : SLOT_PLACEHOLDER[slot];
    const rarity = (item?.effectiveRarity || item?.rarity || '').toLowerCase();
    return (
      <button
        key={slot}
        type="button"
        className={`wp-slot wp-equip-slot${item ? ` wp-rarity-${rarity}` : ' wp-slot--placeholder'}`}
        aria-label={item ? item.name : `${SLOT_LABELS[slot]} (vacío)`}
        onMouseMove={(e) => setHover({ slot, x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHover(null)}
        onContextMenu={(e) => { e.preventDefault(); unequip(slot); }}
        onDoubleClick={() => unequip(slot)}
      >
        <GameIcon name={icon.name} artist={icon.artist} />
        {item?.enchantLevel > 0 && <span className="wp-slot-enchant">+{item.enchantLevel}</span>}
      </button>
    );
  };

  const hoverItem = hover && bySlot[hover.slot];

  return (
    <FloatingPanel
      id="personaje"
      title={stats.nickname}
      icon={<GameIcon name="wizard-face" artist="delapouite" />}
      width={640}
      defaultPos={{ x: 300, y: 110 }}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={(
        <div className="wp-tabs">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={`wp-tab${tab === id ? ' wp-tab--active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
          {message && <span className="wp-char-msg">{message}</span>}
        </div>
      )}
    >
      <div className="wp-char-subtitle">Nivel {stats.level} · <span>{className}</span> · Rango {stats.rank}</div>
      <div className="wp-char">
        <div className="wp-char-paperdoll">
          <div className="wp-char-col">{LEFT.map(renderSlot)}</div>
          <div className="wp-char-preview">
            <div className="wp-char-sprite" style={{ backgroundImage: `url(${ASSETS}/clases/${sprite}.png)` }} />
            {bySlot.WEAPON && (
              <div className="wp-char-sprite" style={{ backgroundImage: `url(${ASSETS}/armas/${CLASS_WEAPON[sprite]}.png)` }} />
            )}
            <div className="wp-char-shadow" />
          </div>
          <div className="wp-char-col">{RIGHT.map(renderSlot)}</div>
          <div className="wp-char-bottom">{BOTTOM.map(renderSlot)}</div>
        </div>

        <div className="wp-char-stats">
          {tab === 'personaje' && (
            <>
              <Section title="General">
                <Row label="Vida" value={`${stats.hp} / ${stats.maxHp}`} accent="hp" />
                <Row label="Maná" value={`${stats.mana} / ${stats.maxMana}`} accent="mp" />
                <Row label="Experiencia" value={`${stats.xpIntoLevel} / ${stats.xpNeededForLevel}`} />
              </Section>
              <Section title="Atributos">
                <Row label="Ataque" value={stats.atk} accent="up" />
                <Row label="Defensa" value={stats.def} accent="up" />
                <Row label="Inteligencia" value={stats.int} />
                <Row label="Defensa mágica" value={stats.magicDef} />
                <Row label="Velocidad" value={stats.spd} />
              </Section>
              <Section title="Combate">
                <Row label="Prob. de crítico" value={pct(stats.crit)} />
                <Row label="Daño crítico" value={pct(stats.critDamage)} />
                <Row label="Evasión" value={pct(stats.evasion)} />
                <Row label="Bonus daño mágico" value={pct(stats.magicDamageBonus)} />
              </Section>
              {(stats.uniqueSkill || stats.innate) && (
                <Section title="Habilidad única">
                  {stats.uniqueSkill && <p className="wp-stat-text"><strong>{stats.uniqueSkill.name}.</strong> {stats.uniqueSkill.description}</p>}
                  {stats.innate && <p className="wp-stat-text"><strong>{stats.innate.name}.</strong> {stats.innate.description}</p>}
                </Section>
              )}
            </>
          )}
          {tab === 'elementos' && (
            <>
              <Section title="Resistencias">
                {(stats.resistances ?? []).map((r) => (
                  <ElementRow key={r.elementCode} code={r.elementCode} label={r.element} value={Number(r.percent)} text={pct(r.percent)} />
                ))}
              </Section>
              <Section title="Daño elemental">
                {(stats.elementalBonuses ?? []).map((b) => (
                  <ElementRow key={b.elementCode} code={b.elementCode} label={b.element} value={Number(b.bonus)} text={`+${pct(b.bonus)}`} />
                ))}
              </Section>
            </>
          )}
          {tab === 'rango' && (
            <Section title="Gremio de Aventureros">
              <div className="wp-rank-badge">{stats.rank}</div>
              <Row label="Reputación" value={Number(stats.reputation).toLocaleString()} />
              {!stats.isMaxRank && <Row label="Siguiente rango" value={`${Number(stats.reputationForNextRank).toLocaleString()} rep`} />}
            </Section>
          )}
        </div>
      </div>

      {hoverItem && (
        <ItemTooltip
          item={{
            itemId: hoverItem.itemId, name: hoverItem.name, rarity: hoverItem.effectiveRarity || hoverItem.rarity,
            itemType: 'EQUIPMENT', slot: hover.slot, requiredLevel: hoverItem.requiredLevel,
            enchantLevel: hoverItem.enchantLevel, qualityTier: hoverItem.qualityTier,
          }}
          x={hover.x}
          y={hover.y}
          token={token}
          hint="Clic derecho: desequipar"
        />
      )}
      {hover && !hoverItem && (
        <div className="wp-tooltip" style={{ left: Math.min(hover.x + 16, window.innerWidth - 200), top: hover.y + 16 }}>
          <div className="wp-tooltip-name">{SLOT_LABELS[hover.slot]}</div>
          <div className="wp-tooltip-sub">Vacío</div>
        </div>
      )}
    </FloatingPanel>
  );
}
