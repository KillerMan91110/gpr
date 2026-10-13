import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, SLOT_PLACEHOLDER, SLOT_LABELS, RARITY_LABELS } from './itemIcons';
import { CLASS_ICON } from '../../utils/classIcons';
import { COMMENDS } from './WorldSocial';
import './InspectPanel.css';

const ROLE_LABEL = { LEADER: 'Líder', OFFICER: 'Oficial', MEMBER: 'Miembro' };
// casillas del equipo a los dos lados del retrato, como en la ventana de personaje de un MMO
const LEFT = ['HELMET', 'ARMOR', 'GLOVES', 'BOOTS'];
const RIGHT = ['WEAPON', 'OFFHAND', 'ACCESSORY'];
const STATS = [['HP', 'hp'], ['ATK', 'atk'], ['DEF', 'def'], ['MAG', 'mag'], ['MDEF', 'magicDef'], ['SPD', 'spd'], ['CRIT', 'crit', '%']];
const BASES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
const plain = (t) => (t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Portrait({ classCode, className }) {
  const base = BASES.find((b) => plain(classCode).startsWith(b) || plain(className).startsWith(b));
  if (base) return <img src={`${process.env.PUBLIC_URL}/portraits/${base.charAt(0).toUpperCase()}${base.slice(1)}.png`} alt="" />;
  const icon = CLASS_ICON[classCode] ?? { name: 'person', artist: 'delapouite' };
  return <GameIcon name={icon.name} artist={icon.artist} />;
}

// Inspeccionar a otro jugador del mundo (clic en él → Inspeccionar): su equipo con íconos y
// tooltips, su gremio, su mascota, logros, bestiario, elogios y lazo de amistad.
export default function InspectPanel({ args, coop, onCoopChanged, ...props }) {
  const { player, token } = useAuth();
  const targetId = args?.targetId;
  const [data, setData] = useState(undefined);
  const [card, setCard] = useState(null);
  const [hover, setHover] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!targetId) return;
    setData(undefined);
    api.inspectPlayer(player.id, targetId, token).then(setData).catch(() => setData(null));
    api.getPlayerCard(player.id, targetId, token).then(setCard).catch(() => setCard(null));
  }, [player, targetId, token]);

  const bySlot = Object.fromEntries((data?.equipment ?? []).map((e) => [e.slot, e]));
  const isFriend = card?.friendship === 'ACCEPTED';
  const fights = data ? data.general.combatWins + data.general.combatLosses : 0;

  const slot = (code) => {
    const e = bySlot[code];
    if (!e) {
      const ph = SLOT_PLACEHOLDER[code];
      return (
        <span key={code} className="wp-slot wp-slot--placeholder ip-slot" title={`${SLOT_LABELS[code] ?? code}: vacío`}>
          {ph && <GameIcon name={ph.name} artist={ph.artist} />}
        </span>
      );
    }
    const icon = iconForItem({ name: e.itemName, slot: e.slot, item_type: 'EQUIPMENT' });
    const rarity = (e.rarity || 'COMUN').toLowerCase();
    return (
      <span
        key={code}
        className={`wp-slot wp-rarity-${rarity} ip-slot`}
        onMouseMove={(ev) => setHover({ e, x: ev.clientX, y: ev.clientY })}
        onMouseLeave={() => setHover(null)}
      >
        <GameIcon name={icon.name} artist={icon.artist} />
        {e.enchantLevel > 0 && <span className="wp-slot-enchant">+{e.enchantLevel}</span>}
      </span>
    );
  };

  const invite = async () => {
    try {
      await api.sendCoopInvite(player.id, targetId, token);
      setNote('Invitación al grupo enviada');
      audio.sfx('mision');
    } catch (err) { setNote(err.message); audio.sfx('error'); }
  };

  return (
    <FloatingPanel {...props} id="inspeccionar" title={data ? data.nickname : (args?.name ?? 'Inspeccionar')} icon={<GameIcon name="magnifying-glass" artist="lorc" />} width={560}
      footer={data && (
        <div className="wp-tabs">
          {coop?.members?.some((m) => m.id === targetId)
            ? <span className="wp-tab ip-in-group">⚔ En tu grupo</span>
            : <button type="button" className="wp-tab" onClick={invite}>⚔ Invitar al grupo</button>}
          <button type="button" className="wp-tab" onClick={() => { bus.emit('follow-player', { id: targetId, name: data.nickname }); props.onClose?.(); }}>👣 Seguir</button>
          <span className="wp-foot-note ok">{note}</span>
        </div>
      )}
    >
      {data === undefined && <p className="wp-empty">Cargando…</p>}
      {data === null && <p className="wp-empty">No se pudo ver a este jugador.</p>}
      {data && (
        <div className="ip">
          <header className="ip-head">
            <span className="ip-portrait"><Portrait classCode={data.classCode} className={data.className} /></span>
            <div className="ip-who">
              <strong>{data.nickname}</strong>
              <small>Nivel {data.level} · {data.className}{data.rank ? ` · Rango ${data.rank}` : ''}</small>
              {card?.status_text && <em>«{card.status_text}»</em>}
              {data.guild ? (
                <span className="ip-guild" style={data.guild.color ? { '--ip-guild': data.guild.color } : undefined}>
                  <b>{data.guild.emblem || '⚜'}</b> ‹{data.guild.name}› · Nv {data.guild.level} · {ROLE_LABEL[data.guild.role] ?? data.guild.role}
                </span>
              ) : <span className="ip-guild ip-guild--none">Sin gremio</span>}
            </div>
          </header>

          <div className="ip-body">
            {/* equipo alrededor del retrato */}
            <div className="ip-doll">
              <div className="ip-col">{LEFT.map(slot)}</div>
              <div className="ip-figure"><Portrait classCode={data.classCode} className={data.className} /></div>
              <div className="ip-col">{RIGHT.map(slot)}</div>
            </div>

            <div className="ip-side">
              <div className="ip-stats">
                {STATS.map(([label, key, suffix]) => (
                  <div key={key}><span>{label}</span><b>{data.stats[key]}{suffix ?? ''}</b></div>
                ))}
              </div>
              <div className="ip-facts">
                <div><GameIcon name="crossed-swords" artist="lorc" /> {data.general.combatWins} victorias{fights ? ` (${Math.round((data.general.combatWins / fights) * 100)}%)` : ''}</div>
                <div><GameIcon name="crown" artist="lorc" /> {data.general.bossKills} jefes abatidos</div>
                <div><GameIcon name="trophy-cup" artist="delapouite" /> {data.achievements} logros</div>
                <div><GameIcon name="book-aura" artist="lorc" /> {data.bestiary.fichas} fichas · {data.bestiary.dominadas} dominadas</div>
                <div><GameIcon name="paw" artist="lorc" /> {data.pet ? `${data.pet.name} (Nv ${data.pet.level})` : 'Sin mascota'}</div>
              </div>
              {card && (
                <div className="ip-commends">
                  {COMMENDS.map((c) => <span key={c.kind} title={c.label}>{c.icon} {card.commends[c.kind]}</span>)}
                  {isFriend && <span className="ip-bond" title={`${card.bond.points} minutos juntos`}>♥ {card.bond.name}</span>}
                </div>
              )}
            </div>
          </div>

          {data.companions.length > 0 && (
            <div className="ip-companions">
              <h5>Compañeros de su grupo</h5>
              {data.companions.map((n, i) => (
                <div key={i}><b>{n.name}</b> <small>Nv {n.level} · {n.className}{n.equipment.length ? ` · ${n.equipment.length} piezas de equipo` : ''}</small></div>
              ))}
            </div>
          )}
        </div>
      )}
      {hover && (
        <ItemTooltip
          item={{ itemId: hover.e.itemId, name: hover.e.itemName, rarity: hover.e.rarity, itemType: 'EQUIPMENT', slot: hover.e.slot, enchantLevel: hover.e.enchantLevel, qualityTier: hover.e.qualityTier }}
          x={hover.x}
          y={hover.y}
          token={token}
          hint={`${SLOT_LABELS[hover.e.slot] ?? hover.e.slot} · ${RARITY_LABELS[hover.e.rarity] ?? hover.e.rarity}`}
        />
      )}
    </FloatingPanel>
  );
}
