import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import QuestObjectives from '../QuestObjectives';
import FloatingPanel from './FloatingPanel';
import ItemTooltip from './ItemTooltip';
import { iconForItem, RARITY_LABELS } from './itemIcons';
import { skillIcon, TYPE_LABEL, TARGET_LABEL } from './SkillsPanel';
import './OrderPanel.css';

const ASSETS = `${process.env.PUBLIC_URL}/assets/mundo`;

// Las cinco órdenes de Aurelia: cada una enseña a su clase base (classId) en su casa del Barrio
// de las Órdenes. Solo se abren hablando con su maestro: hay que ir a la ciudad a aprender.
export const ORDENES = {
  guerrero: { classId: 1, casa: 'Cuartel del Acero', maestro: 'Sir Aldric', retrato: 'maestro_guerrero', pos: [12, 44], frase: '«Un guerrero se forja con disciplina y acero.»' },
  mago: { classId: 2, casa: 'Torre Arcana', maestro: 'Isolde', retrato: 'maestra_maga', pos: [20, 44], frase: '«El conocimiento, como el fuego, quema al imprudente.»' },
  arquero: { classId: 3, casa: 'Campo del Halcón', maestro: 'Sylwen', retrato: 'maestra_arquera', pos: [26, 44], frase: '«Respira, apunta, suelta. Lo demás es ruido.»' },
  picaro: { classId: 4, casa: 'La Sombra Callada', maestro: 'Nox', retrato: 'maestro_picaro', pos: [24, 60], frase: '«No me viste. No estoy aquí. Pero ya que preguntas…»' },
  sacerdote: { classId: 5, casa: 'Capilla de la Luz', maestro: 'Padre Anselm', retrato: 'sumo_sacerdote', pos: [68, 15], frase: '«Curar es más difícil que herir.»' },
};
// (pos = casilla del maestro en Aurelia, para guiarte hasta él con la flecha)
// emblema de la orden (hecho en Aseprite, art/sprites/mundo/crear_vinculo.lua)
export const emblemaDe = (orden) => `${ASSETS}/vinculo/orden_${orden}.png`;

// precio de venta: la mitad del de compra si alguna orden lo vende; si no, según la rareza
// (mismo cálculo que routes/players.js en guild/shop/sell)
const SELL_BY_RARITY = { COMUN: 20, POCO_COMUN: 50, RARO: 120, EPICO: 300, LEGENDARIO: 700 };

function Coins({ value }) {
  return <span className="wp-coins"><GameIcon name="two-coins" artist="delapouite" /> {Number(value ?? 0).toLocaleString()}</span>;
}

export default function OrderPanel({ orden, gold, onChanged, ...props }) {
  const { player, token } = useAuth();
  const info = ORDENES[orden] ?? ORDENES.guerrero;
  const [tab, setTab] = useState('tecnicas');
  const [skills, setSkills] = useState(null);
  const [details, setDetails] = useState({});
  const [shop, setShop] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [quests, setQuests] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [sk, sh, inv, qs] = await Promise.all([
      api.getGuildSkills(player.id, info.classId, token),
      api.getGuildShop(player.id, info.classId, token),
      api.getPlayerInventory(player.id, token),
      api.getAvailableQuests(player.id, token),
    ]);
    setSkills(sk);
    setShop(sh);
    setInventory(inv);
    setQuests(qs.filter((q) => String(q.required_class_id) === String(info.classId)));
    // detalle de las técnicas (tipo, maná, objetivo) solo existe para tu propia clase
    if (sk.isOwnClass) {
      const mine = await api.getClassSkills(player.id, token).catch(() => []);
      setDetails(Object.fromEntries(mine.map((s) => [s.id, s])));
    }
  }, [player, token, info.classId]);

  useEffect(() => { load().catch((err) => setMessage({ ok: false, text: err.message })); }, [load]);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  // acción común: llama al back, avisa y recarga
  const run = async (fn, okText, sfx = 'moneda') => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      audio.sfx(sfx);
      setMessage({ ok: true, text: okText(r) });
      await load();
      onChanged?.();
    } catch (err) {
      audio.sfx('error');
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const skillList = useMemo(() => (skills?.skills ?? [])
    .map((s) => ({ ...details[s.id], ...s }))
    .sort((a, b) => Number(a.learned) - Number(b.learned) || (a.goldCost ?? 0) - (b.goldCost ?? 0)), [skills, details]);
  const current = tab === 'tecnicas' ? (skillList.find((s) => s.id === selected) ?? skillList[0]) : null;
  const sellable = useMemo(() => (inventory ?? []).filter((i) => i.item_type === 'EQUIPMENT' && i.quantity > 0), [inventory]);
  const own = !!skills?.isOwnClass;
  const switchTab = (t) => { setTab(t); setSelected(null); };

  const tooltipFor = (it) => ({ itemId: it.itemId ?? it.item_id ?? it.id, name: it.name, rarity: it.rarity, slot: it.slot, enchantLevel: it.enchant_level });

  return (
    <FloatingPanel
      {...props}
      id={`orden_${orden}`}
      title={info.casa}
      icon={<img className="op-emblem-icon" src={emblemaDe(orden)} alt="" />}
      width={640}
      footer={(
        <div className="wp-tabs">
          {[['tecnicas', 'Técnicas'], ['tienda', 'Tienda'], ['vender', 'Vender'], ['encargos', `Encargos${quests?.length ? ` (${quests.length})` : ''}`]].map(([id, label]) => (
            <button key={id} type="button" className={`wp-tab${tab === id ? ' wp-tab--active' : ''}`} onClick={() => switchTab(id)}>{label}</button>
          ))}
          <span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text}</span>
          <span className="wp-currency" title="Oro"><GameIcon name="two-coins" artist="delapouite" /> {Number(gold ?? 0).toLocaleString()}</span>
        </div>
      )}
    >
      <header className="op-head">
        <img className="op-portrait" src={`${ASSETS}/retratos/${info.retrato}.png`} alt="" />
        <div>
          <strong>{info.maestro}</strong>
          <small>{info.casa}</small>
          <p>{own ? info.frase : '«No eres de los nuestros, pero mis armas sirven a quien las pague.»'}</p>
        </div>
        <img className="op-emblem" src={emblemaDe(orden)} alt="" />
      </header>

      {!skills && <p className="wp-empty">Cargando…</p>}

      {skills && tab === 'tecnicas' && (
        <div className="wp-split">
          <div className="wp-skill-list">
            {skillList.length === 0 && <p className="wp-empty">Esta orden no tiene técnicas que enseñar.</p>}
            {skillList.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`wp-skill${s.learned ? '' : ' wp-skill--locked'}${current?.id === s.id ? ' wp-skill--active' : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <span className="wp-skill-icon"><GameIcon {...skillIcon(s)} /></span>
                <span className="wp-skill-name">{s.name}</span>
                <span className="wp-skill-meta">{s.learned ? 'Aprendida' : s.learnMethod === 'GOLD' ? `${s.goldCost} oro` : 'Misión'}</span>
              </button>
            ))}
          </div>
          {current && (
            <div className="wp-detail">
              <div className="wp-detail-head">
                <span className="wp-skill-icon wp-skill-icon--big"><GameIcon {...skillIcon(current)} /></span>
                <div>
                  <h3>{current.name}</h3>
                  <span className="wp-detail-sub">{TYPE_LABEL[current.skillType] ?? (current.learnMethod === 'GOLD' ? 'Técnica de la orden' : 'Técnica secreta')}</span>
                </div>
              </div>
              {current.description && <p className="wp-detail-desc">{current.description}</p>}
              <div className="wp-detail-rows">
                {current.manaCost > 0 && !current.isPassive && <div><span>Costo</span><strong className="wp-stat--mp">{current.manaCost} maná</strong></div>}
                {current.targetType && <div><span>Objetivo</span><strong>{TARGET_LABEL[current.targetType] ?? current.targetType}</strong></div>}
                <div>
                  <span>Se aprende</span>
                  <strong>{current.learnMethod === 'GOLD' ? `${current.goldCost} de oro` : `Misión: ${current.requirementText ?? '—'}`}</strong>
                </div>
              </div>
              {current.learned ? <p className="op-state op-state--ok">✓ Ya la dominas</p>
                : !own ? <p className="op-state">Solo {info.maestro} enseña a los de su orden.</p>
                  : current.locked ? <p className="op-state">Primero completa la misión «{current.requirementText}».</p>
                    : (
                      <button
                        type="button"
                        className="wp-btn wp-btn--gold"
                        disabled={busy || (current.learnMethod === 'GOLD' && current.affordable === false)}
                        onClick={() => run(() => api.learnGuildSkill(player.id, current.id, token), (r) => `Aprendiste ${r.name}${r.cost ? ` por ${r.cost} de oro` : ''}.`, 'mejora')}
                      >
                        {current.learnMethod === 'GOLD' ? (current.affordable === false ? 'No te alcanza el oro' : `Aprender (${current.goldCost} de oro)`) : 'Aprender'}
                      </button>
                    )}
            </div>
          )}
        </div>
      )}

      {shop && tab === 'tienda' && (
        <>
          {!shop.isOwnClass && <p className="op-note">Solo los de la orden pueden comprar aquí.</p>}
          <div className="op-wares">
            {shop.items.map((it) => {
              const icon = iconForItem(it);
              const rarity = (it.rarity || 'COMUN').toLowerCase();
              const poor = it.buyPrice > (gold ?? 0);
              return (
                <div key={it.id} className={`op-ware${poor ? ' op-ware--poor' : ''}`} onMouseMove={(e) => setHover({ it, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHover(null)}>
                  <span className={`wp-slot wp-rarity-${rarity}`}><GameIcon name={icon.name} artist={icon.artist} /></span>
                  <span className="op-ware-info">
                    <span className={`wp-text-${rarity}`}>{it.name}</span>
                    <small>{RARITY_LABELS[it.rarity] ?? it.rarity}{it.requiredLevel ? ` · Nv ${it.requiredLevel}` : ''}</small>
                  </span>
                  <Coins value={it.buyPrice} />
                  <button
                    type="button"
                    className="wp-btn wp-btn--gold"
                    disabled={busy || poor || !shop.isOwnClass}
                    onClick={() => run(() => api.buyGuildItem(player.id, it.id, 1, token), (r) => `Compraste ${r.name} por ${r.cost} de oro.`)}
                  >
                    Comprar
                  </button>
                </div>
              );
            })}
            {shop.items.length === 0 && <p className="wp-empty">La tienda está vacía por ahora.</p>}
          </div>
        </>
      )}

      {inventory && tab === 'vender' && (
        <div className="op-wares">
          {sellable.length === 0 && <p className="wp-empty">No tienes equipo sin usar para vender. Lo que llevas puesto no se vende.</p>}
          {sellable.map((it) => {
            const icon = iconForItem(it);
            const rarity = (it.rarity || 'COMUN').toLowerCase();
            const enchant = it.enchant_level ?? 0;
            const price = it.buy_price != null ? Math.round(it.buy_price / 2) : (SELL_BY_RARITY[it.rarity] ?? 10);
            return (
              <div key={`${it.item_id}-${enchant}`} className="op-ware" onMouseMove={(e) => setHover({ it, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHover(null)}>
                <span className={`wp-slot wp-rarity-${rarity}`}>
                  <GameIcon name={icon.name} artist={icon.artist} />
                  {enchant > 0 && <span className="wp-slot-enchant">+{enchant}</span>}
                  {it.quantity > 1 && <span className="wp-slot-qty">{it.quantity}</span>}
                </span>
                <span className="op-ware-info">
                  <span className={`wp-text-${rarity}`}>{it.name}</span>
                  <small>{RARITY_LABELS[it.rarity] ?? it.rarity}</small>
                </span>
                <Coins value={price} />
                <button
                  type="button"
                  className="wp-btn"
                  disabled={busy}
                  onClick={() => run(() => api.sellGuildItem(player.id, it.item_id, 1, enchant, token), (r) => `Vendiste ${r.name} por ${r.goldGained} de oro.`)}
                >
                  Vender
                </button>
              </div>
            );
          })}
        </div>
      )}

      {quests && tab === 'encargos' && (
        <div className="op-quests">
          {quests.length === 0 && <p className="wp-empty">{info.maestro} no tiene encargos para ti por ahora. Aparecen según tu nivel y tu rango.</p>}
          {quests.map((q) => (
            <div key={q.id} className="op-quest">
              <div className="op-quest-head">
                <strong>{q.name}</strong>
                <small>Rango {q.min_rank_code || 'F'} · Nv {q.min_level || 1}{q.max_level ? `-${q.max_level}` : ''}</small>
              </div>
              {q.description && <p>{q.description}</p>}
              <QuestObjectives objectives={q.objectives} />
              <div className="op-quest-foot">
                <span>+{q.xp_reward} XP · <Coins value={q.gold_reward} /> · +{q.reputation_reward} reputación{q.is_repeatable ? ' · repetible' : ''}</span>
                {q.accepted ? <span className="op-state op-state--ok">Aceptado</span>
                  : q.meets_level === false ? <span className="op-state">Requiere nivel {q.min_level}</span>
                    : (
                      <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={() => run(() => api.acceptQuest(player.id, q.id, token), () => `Aceptaste «${q.name}». Lo verás en tu diario (J).`, 'clic')}>
                        Aceptar
                      </button>
                    )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hover && <ItemTooltip item={tooltipFor(hover.it)} x={hover.x} y={hover.y} token={token} />}
    </FloatingPanel>
  );
}
