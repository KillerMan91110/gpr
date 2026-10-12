import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import audio from '../../game/audio';
import FloatingPanel from './FloatingPanel';
import { iconForItem, SLOT_LABELS } from './itemIcons';

const prettyCode = (code) => (code ?? '').toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Encantador como una forja: a quién (héroe o compañeros) arriba, sus piezas equipadas a la
// izquierda y a la derecha la pieza elegida con sus 10 gemas, el coste y la probabilidad.
export default function EnchantPanel({ onChanged, onClose, zIndex, onActivate, defaultPos }) {
  const { player, token } = useAuth();
  const [party, setParty] = useState(null);
  const [member, setMember] = useState(0);
  const [slots, setSlots] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selSlot, setSelSlot] = useState(null);
  const [useCrystal, setUseCrystal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null); // { ok, text }

  const npcs = party?.members?.filter((m) => !m.isHero).sort((a, b) => a.slot - b.slot) ?? [];
  const npc = member > 0 ? npcs[member - 1] : null;
  const crystals = inventory.find((i) => i.code === 'CRISTAL_ESTABILIDAD')?.quantity ?? 0;
  const major = inventory.find((i) => i.code === 'CRISTAL_ESTABILIDAD_MAYOR')?.quantity ?? 0;
  // el back usa primero el Mayor si hay de los dos (POST /:playerId/enchant)
  const crystalBonus = major > 0 ? 30 : crystals > 0 ? 15 : 0;

  const loadSlots = useCallback(async () => {
    const data = npc ? await api.getEnchantNpcInfo(player.id, npc.npcId, token) : await api.getEnchantInfo(player.id, token);
    setSlots(data);
  }, [npc, player, token]);

  useEffect(() => {
    api.getParty(player.id, token).then(setParty).catch(() => setParty({ members: [] }));
    api.getPlayerInventory(player.id, token).then(setInventory).catch(() => {});
  }, [player, token]);

  useEffect(() => { if (party) { setSlots(null); loadSlots().catch(() => setSlots([])); } }, [party, loadSlots]);

  const current = slots?.find((s) => s.slot === selSlot) ?? slots?.[0] ?? null;
  const stone = current?.nextCost ? inventory.find((i) => i.code === current.nextCost.stone) : null;
  const stoneHave = stone?.quantity ?? 0;
  const rate = current?.nextCost ? Math.min(100, current.nextCost.successRate + (!npc && useCrystal ? crystalBonus : 0)) : 0;

  const enchant = async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      const r = npc ? await api.enchantNpc(player.id, npc.npcId, current.slot, token) : await api.enchant(player.id, current.slot, useCrystal, token);
      setFlash({ ok: r.success !== false, text: r.message });
      audio.sfx(r.success !== false ? 'mejora' : 'romper');
      setTimeout(() => setFlash(null), 2600);
      setUseCrystal(false);
      await loadSlots();
      setInventory(await api.getPlayerInventory(player.id, token));
      onChanged?.();
    } catch (e) {
      setFlash({ ok: false, text: e.message });
      setTimeout(() => setFlash(null), 2600);
    } finally {
      setBusy(false);
    }
  };

  const members = [{ name: player?.nickname ?? 'Héroe', hero: true }, ...npcs];

  return (
    <FloatingPanel
      id="encantador"
      title="Encantador"
      icon={<GameIcon name="magic-swirl" artist="lorc" />}
      width={600}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={<span className="wp-foot-note">Equipa piezas desde la ficha del personaje (C) para poder encantarlas.</span>}
    >
      <div className="wp-cat-bar">
        {members.map((m, i) => (
          <button key={m.npcId ?? 'heroe'} type="button" className={`wp-member-tab${member === i ? ' wp-member-tab--active' : ''}`}
            onClick={() => { setMember(i); setSelSlot(null); setUseCrystal(false); }}>
            {m.hero ? '★ ' : ''}{m.name}
          </button>
        ))}
      </div>
      {!slots && <p className="wp-empty">Cargando…</p>}
      {slots?.length === 0 && <p className="wp-empty">{npc ? `${npc.name} no lleva nada equipado.` : 'No llevas nada equipado.'}</p>}
      {slots?.length > 0 && (
        <div className="wp-craft">
          <ul className="wp-recipe-list wp-recipe-list--narrow">
            {slots.map((s) => {
              const ic = iconForItem({ name: s.itemName, slot: s.slot });
              return (
                <li key={s.slot}>
                  <button type="button" className={`wp-recipe${current?.slot === s.slot ? ' wp-recipe--sel' : ''}`} onClick={() => setSelSlot(s.slot)}>
                    <span className="wp-slot wp-slot--sm"><GameIcon name={ic.name} artist={ic.artist} /></span>
                    <span className="wp-recipe-name">{s.itemName}<small className="wp-sub">{SLOT_LABELS[s.slot] ?? s.slot}</small></span>
                    <span className={`wp-enchant-lv${s.enchantLevel > 0 ? ' on' : ''}`}>+{s.enchantLevel}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {current && (
            <section className={`wp-craft-detail wp-forge${flash ? (flash.ok ? ' wp-forge--ok' : ' wp-forge--fail') : ''}`}>
              <div className="wp-forge-item">
                <span className="wp-slot wp-slot--lg wp-forge-slot">
                  <GameIcon name={iconForItem({ name: current.itemName, slot: current.slot }).name} artist={iconForItem({ name: current.itemName, slot: current.slot }).artist} />
                  {current.enchantLevel > 0 && <span className="wp-slot-enchant">+{current.enchantLevel}</span>}
                </span>
                <strong>{current.itemName}</strong>
                <small>{SLOT_LABELS[current.slot] ?? current.slot}</small>
              </div>
              <div className="wp-gems" title={`Encantamiento +${current.enchantLevel} de +10`}>
                {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < current.enchantLevel ? 'on' : ''} />)}
              </div>

              {current.enchantLevel >= 10 && <p className="wp-forge-max">¡Encantamiento máximo!</p>}
              {current.nextCost && current.enchantLevel < 10 && (
                <>
                  <div className="wp-forge-cost">
                    <span className={stoneHave >= current.nextCost.quantity ? '' : 'wp-mat--missing'}>
                      <span className="wp-slot wp-slot--sm"><GameIcon name="rune-stone" artist="lorc" /></span>
                      <span className="wp-mat-name">{stone?.name ?? prettyCode(current.nextCost.stone)}</span>
                      <span className="wp-mat-count"><b>{stoneHave}</b> / {current.nextCost.quantity}</span>
                    </span>
                    <span className="wp-coins"><GameIcon name="two-coins" artist="delapouite" /> {current.nextCost.gold.toLocaleString()}</span>
                  </div>
                  <div className="wp-forge-rate">
                    <span>Probabilidad</span>
                    <div className="wp-bar wp-bar--rate"><div style={{ width: `${rate}%` }} /></div>
                    <b>{rate}%</b>
                  </div>
                  {!npc && crystalBonus > 0 && (
                    <label className="wp-check">
                      <input type="checkbox" checked={useCrystal} onChange={(e) => setUseCrystal(e.target.checked)} />
                      Usar {major > 0 ? 'Cristal de Estabilidad Mayor' : 'Cristal de Estabilidad'} (+{crystalBonus}%, tienes {major > 0 ? major : crystals})
                    </label>
                  )}
                  <button type="button" className="wp-btn wp-btn--gold wp-forge-btn" disabled={busy} onClick={enchant}>
                    {busy ? 'Encantando…' : `Encantar a +${current.enchantLevel + 1}`}
                  </button>
                </>
              )}
              {flash && <p className={`wp-forge-msg ${flash.ok ? 'ok' : 'err'}`}>{flash.text}</p>}
            </section>
          )}
        </div>
      )}
    </FloatingPanel>
  );
}
