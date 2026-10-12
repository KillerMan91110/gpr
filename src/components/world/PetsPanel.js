import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { iconForItem, RARITY_LABELS } from './itemIcons';

const BONUS_LABEL = {
  ATK_FLAT: 'Ataque', DEF_FLAT: 'Defensa', MAG_FLAT: 'Inteligencia', MAGIC_DEF_FLAT: 'Defensa mágica', SPD_FLAT: 'Velocidad',
  CRIT_CHANCE_FLAT: 'Crítico', CRIT_DMG_FLAT: 'Daño crítico', EVASION_FLAT: 'Evasión',
  HP_FLAT: 'Vida', MANA_FLAT: 'Maná', LUCK_FLAT: 'Suerte',
  HEAL_BONUS_PERCENT: 'Curación', HOT_HP_PERCENT: 'Regeneración por turno',
  GOLD_PERCENT: 'Oro', XP_PERCENT: 'Experiencia', DROP_RATE_PERCENT: 'Botín',
  PHYSICAL_DAMAGE_PERCENT: 'Daño físico', MAGICAL_DAMAGE_PERCENT: 'Daño mágico',
  ELEMENTAL_DAMAGE_PERCENT: 'Daño elemental', DAMAGE_REDUCTION_PERCENT: 'Daño recibido reducido',
  ELEMENTAL_RESISTANCE_PERCENT: 'Resistencia elemental', MANA_COST_REDUCTION_PERCENT: 'Coste de maná reducido',
  ESCAPE_BONUS_FLAT: 'Huida', GUILD_XP_PERCENT: 'XP de gremio', PASSIVE_REVIVE: 'Revive 1 vez por combate',
};
const IS_PERCENT = (code) => code.endsWith('_PERCENT');

function bonusText(b) {
  const label = BONUS_LABEL[b.stat_code] || b.stat_code;
  if (b.stat_code === 'PASSIVE_REVIVE') return Number(b.value) >= 1 ? label : null;
  return `+${Math.round(Number(b.value) * 100) / 100}${IS_PERCENT(b.stat_code) ? '%' : ''} ${label}`;
}

// Ícono de cada especie por palabras del nombre (la base no guarda imagen de mascota)
const PET_ICONS = [
  [/lobo|perrito/, ['wolf-head', 'lorc']], [/zorro|comadreja|mapache|nutria|tejon|ardilla/, ['fox-head', 'lorc']],
  [/raton|conejo/, ['rabbit', 'delapouite']], [/arana/, ['spider-face', 'carl-olsen']], [/tortug/, ['turtle', 'lorc']],
  [/salamandra|serpiente|camaleon/, ['snake', 'lorc']], [/imp|espiritu|familiar/, ['fairy', 'delapouite']],
  [/golem/, ['golem-head', 'delapouite']], [/dragon/, ['dragon-head', 'faithtoken']], [/buho|lechuza/, ['owl', 'lorc']],
  [/fenix|ave|paloma|colibri|halcon|polilla|grillo|escarabajo/, ['bird-twitter', 'lorc']], [/cangrejo/, ['crab', 'lorc']],
  [/rana|pulpo|tiburon|erizo/, ['slime', 'delapouite']], [/ciervo/, ['horse-head', 'delapouite']], [/gato/, ['cat', 'lorc']],
];
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const petIcon = (name) => PET_ICONS.find(([re]) => re.test(norm(name)))?.[1] ?? ['paw-print', 'lorc'];

function countdown(ms) {
  if (ms <= 0) return 'listo';
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${t % 60}s` : `${t % 60}s`;
}

// Establo de mascotas al estilo del diario de mascotas de un MMO: colección a la izquierda,
// la mascota elegida "en escena" a la derecha con sus bonos, y la incubadora arriba.
export default function PetsPanel({ onChanged, onClose, zIndex, onActivate, defaultPos }) {
  const { player, token } = useAuth();
  const [pets, setPets] = useState(null);
  const [incubator, setIncubator] = useState(undefined);
  const [inventory, setInventory] = useState([]);
  const [selId, setSelId] = useState(null);
  const [feeding, setFeeding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const [p, inc, inv] = await Promise.all([api.getPets(player.id, token), api.getIncubator(player.id, token), api.getPlayerInventory(player.id, token)]);
    setPets(p);
    setIncubator(inc);
    setInventory(inv);
  }, [player, token]);

  useEffect(() => { load().catch((e) => setMessage({ ok: false, text: e.message })); }, [load]);
  useEffect(() => {
    if (!incubator || incubator.ready) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [incubator]);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  const eggs = inventory.filter((i) => i.code?.startsWith('HUEVO_') && i.quantity > 0);
  const food = inventory.filter((i) => i.item_type === 'MATERIAL' && !i.code?.startsWith('HUEVO_') && i.quantity > 0);
  const stone = inventory.find((i) => i.code === 'PIEDRA_TRASCENDENCIA' && i.quantity > 0);
  const sorted = useMemo(() => [...(pets ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.level - a.level), [pets]);
  const pet = sorted.find((p) => p.id === selId) ?? sorted[0] ?? null;
  const ready = incubator && (incubator.ready || new Date(incubator.hatch_ready_at).getTime() <= now);

  const run = async (fn, okText) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      const text = typeof okText === 'function' ? okText(r) : okText;
      if (text) setMessage({ ok: true, text });
      await load();
      onChanged?.();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const [pi, pa] = pet ? petIcon(pet.name) : ['paw-print', 'lorc'];

  return (
    <FloatingPanel
      id="mascotas"
      title="Mascotas"
      icon={<GameIcon name="paw" artist="lorc" />}
      width={660}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={<span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text ?? `${pets?.length ?? 0} mascota${pets?.length === 1 ? '' : 's'} en la colección`}</span>}
    >
      {!pets && <p className="wp-empty">Cargando…</p>}
      {pets && (
        <div className="wp-pets">
          <aside className="wp-pets-side">
            {/* incubadora */}
            <div className={`wp-incubator${ready ? ' wp-incubator--ready' : ''}`}>
              <span className="wp-slot wp-slot--lg wp-egg"><GameIcon name="egg-clutch" artist="lorc" /></span>
              <div className="wp-incubator-info">
                <strong>Incubadora</strong>
                {incubator === null && eggs.length === 0 && <small>Sin huevos. Los sueltan algunos monstruos.</small>}
                {incubator === null && eggs.length > 0 && <small>Elige un huevo para incubar:</small>}
                {incubator && !ready && (
                  <>
                    <small>{incubator.egg_name}</small>
                    <span className="wp-incubator-time">{countdown(new Date(incubator.hatch_ready_at).getTime() - now)}</span>
                  </>
                )}
                {incubator && ready && (
                  <button type="button" className="wp-btn wp-btn--gold" disabled={busy}
                    onClick={() => run(() => api.claimIncubator(player.id, token), (p) => `¡Eclosionó ${p?.name ?? 'una mascota'}!`)}>
                    ¡Eclosionar!
                  </button>
                )}
              </div>
            </div>
            {incubator === null && eggs.length > 0 && (
              <div className="wp-egg-row">
                {eggs.map((egg) => (
                  <button key={egg.item_id} type="button" className={`wp-slot wp-rarity-${(egg.rarity || 'COMUN').toLowerCase()}`}
                    title={`${egg.name} · clic para incubar`} disabled={busy}
                    onClick={() => run(() => api.startIncubation(player.id, egg.item_id, token), `Incubando ${egg.name}`)}>
                    <GameIcon name="egg-clutch" artist="lorc" />
                    {egg.quantity > 1 && <span className="wp-slot-qty">{egg.quantity}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* colección */}
            <ul className="wp-pet-list">
              {sorted.length === 0 && <li className="wp-empty">Todavía no tienes mascotas. ¡Incuba un huevo!</li>}
              {sorted.map((p) => {
                const [n, a] = petIcon(p.name);
                return (
                  <li key={p.id}>
                    <button type="button" className={`wp-pet-row${pet?.id === p.id ? ' wp-pet-row--sel' : ''}`} onClick={() => { setSelId(p.id); setFeeding(false); }}>
                      <span className={`wp-slot wp-slot--sm wp-rarity-${(p.rarity || 'COMUN').toLowerCase()}`}><GameIcon name={n} artist={a} /></span>
                      <span className={`wp-pet-name wp-text-${(p.rarity || 'COMUN').toLowerCase()}`}>{p.name}<small>Nv. {p.level}</small></span>
                      {p.is_active && <span className="wp-pet-active" title="Te acompaña">★</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* la mascota elegida en escena */}
          <section className="wp-pet-stage">
            {pet ? (
              <>
                <div className={`wp-pet-show wp-glow-${(pet.rarity || 'COMUN').toLowerCase()}`}>
                  <GameIcon name={pi} artist={pa} />
                  <span className="wp-pet-pedestal" />
                </div>
                <h3 className={`wp-text-${(pet.rarity || 'COMUN').toLowerCase()}`}>{pet.name}</h3>
                <p className="wp-pet-sub">{RARITY_LABELS[pet.rarity] ?? pet.rarity} · Nivel {pet.level}{pet.is_active ? ' · Te acompaña' : ''}</p>
                <div className="wp-pet-bond">
                  <span>Vínculo</span>
                  <div className="wp-bar"><div style={{ width: `${Math.min(100, pet.bond_points)}%` }} /></div>
                  <b>{pet.bond_points}/100</b>
                </div>
                {pet.description && <p className="wp-pet-desc">“{pet.description}”</p>}
                <ul className="wp-pet-bonuses">
                  {(pet.bonuses ?? []).map((b) => {
                    const t = bonusText(b);
                    return t ? <li key={b.stat_code}>{t}</li> : null;
                  })}
                </ul>
                <div className="wp-pet-actions">
                  {pet.is_active
                    ? <button type="button" className="wp-btn" disabled={busy} onClick={() => run(() => api.deactivatePet(player.id, pet.id, token), `${pet.name} vuelve al establo`)}>Guardar</button>
                    : <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={() => run(() => api.activatePet(player.id, pet.id, token), `${pet.name} ahora te acompaña`)}>Invocar</button>}
                  <button type="button" className={`wp-btn${feeding ? ' wp-btn--on' : ''}`} disabled={busy} onClick={() => setFeeding(!feeding)}>Alimentar</button>
                  {stone && (
                    <button type="button" className="wp-btn" disabled={busy} title="Sube el nivel y el tope en +3"
                      onClick={() => run(() => api.feedPet(player.id, pet.id, stone.item_id, 1, token), (r) => `¡${pet.name} trascendió! Nivel ${r.level}`)}>
                      ✨ Trascender ({stone.quantity})
                    </button>
                  )}
                </div>
                {feeding && (
                  <div className="wp-feed">
                    <small>Clic en un material para darle 1 (sube el vínculo):</small>
                    <div className="wp-egg-row">
                      {food.length === 0 && <span className="wp-empty">No tienes materiales.</span>}
                      {food.map((m) => {
                        const ic = iconForItem(m);
                        return (
                          <button key={m.item_id} type="button" className={`wp-slot wp-rarity-${(m.rarity || 'COMUN').toLowerCase()}`} title={m.name} disabled={busy}
                            onClick={() => run(() => api.feedPet(player.id, pet.id, m.item_id, 1, token), `${pet.name} comió ${m.name}`)}>
                            <GameIcon name={ic.name} artist={ic.artist} />
                            {m.quantity > 1 && <span className="wp-slot-qty">{m.quantity}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="wp-pet-show wp-pet-show--empty">
                  <GameIcon name="paw-print" artist="lorc" />
                  <span className="wp-pet-pedestal" />
                </div>
                <h3>Establo vacío</h3>
                <p className="wp-pet-sub">Algunos monstruos sueltan huevos. Incúbalos para conseguir compañeros que te dan bonos en combate.</p>
              </>
            )}
          </section>
        </div>
      )}
    </FloatingPanel>
  );
}
