import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import ItemIcon from './ItemIcon';
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

// Huevos por zona (gprback/lib/huevos.js): HUEVO_<ZONA>_<RAREZA>; los de siempre son HUEVO_<RAREZA>
const ZONAS = [
  ['PRADERA', 1, 'Pradera Dorada'], ['MONTANA', 2, 'Montañas Grises'], ['VOLCAN', 3, 'Volcán Rojo'], ['COSTAS', 4, 'Costas Muertas'],
  ['TUNDRA', 5, 'Tundra Eterna'], ['CATACUMBAS', 6, 'Catacumbas del Abismo'], ['RUINAS', 7, 'Ruinas Ancestrales'],
];
const ZONA_NOMBRE = Object.fromEntries(ZONAS.map(([, id, name]) => [id, name]));
const RAREZAS = ['COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO'];
function eggInfo(code) {
  const rest = String(code ?? '').replace(/^HUEVO_/, '');
  if (RAREZAS.includes(rest)) return { zoneId: null, rarity: rest };
  const z = ZONAS.find(([c]) => rest.startsWith(`${c}_`));
  const rarity = z && rest.slice(z[0].length + 1);
  return z && RAREZAS.includes(rarity) ? { zoneId: z[1], rarity } : null;
}
// los de siempre primero, después por zona (en el orden del viaje) y por rareza
const eggOrder = (e) => { const i = eggInfo(e.code); return i ? (i.zoneId ?? 0) * 10 + RAREZAS.indexOf(i.rarity) : 999; };
const rarityClass = (r) => (r || 'COMUN').toLowerCase();

function countdown(ms) {
  if (ms <= 0) return 'listo';
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${t % 60}s` : `${t % 60}s`;
}
const hoursText = (h) => (h >= 1 ? `${Math.floor(h)} h${h % 1 ? ` ${Math.round((h % 1) * 60)} min` : ''}` : `${Math.round(h * 60)} min`);

// Establo de mascotas al estilo del diario de mascotas de un MMO: la incubadora siempre arriba; abajo, las
// pestañas Mascotas y Huevos. Lo que elijas (una mascota o un huevo) se ve "en escena" a la derecha.
export default function PetsPanel({ onChanged, onClose, zIndex, onActivate, defaultPos }) {
  const { player, token } = useAuth();
  const [pets, setPets] = useState(null);
  const [catalog, setCatalog] = useState(null);
  // los lugares de la incubadora (uno, o dos con 150 Puntos de Gesta): { max, huevos, puntosParaOtra }
  const [incu, setIncu] = useState({ max: 1, huevos: [], puntosParaOtra: null });
  const [readyAt, setReadyAt] = useState({});
  const [inventory, setInventory] = useState([]);
  const [tab, setTab] = useState('mascotas');
  const [selId, setSelId] = useState(null);
  const [eggId, setEggId] = useState(null);
  const [feeding, setFeeding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const [p, inc, inv] = await Promise.all([api.getPets(player.id, token), api.getIncubadoras(player.id, token), api.getPlayerInventory(player.id, token)]);
    setPets(p);
    setIncu(inc);
    // la cuenta regresiva con el reloj de este navegador (el servidor dice cuántos segundos faltan)
    setReadyAt(Object.fromEntries(inc.huevos.map((h) => [h.ranura, Date.now() + Number(h.seconds_left ?? 0) * 1000])));
    setNow(Date.now());
    setInventory(inv);
  }, [player, token]);

  useEffect(() => { load().catch((e) => setMessage({ ok: false, text: e.message })); }, [load]);
  useEffect(() => { api.getPetCatalog(player.id, token).then(setCatalog).catch(() => setCatalog(null)); }, [player, token]);
  useEffect(() => {
    if (!incu.huevos.some((h) => !h.ready)) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [incu]);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  const eggs = useMemo(() => inventory
    .filter((i) => i.code?.startsWith('HUEVO_') && eggInfo(i.code) && i.quantity > 0)
    .sort((a, b) => eggOrder(a) - eggOrder(b)), [inventory]);
  const food = inventory.filter((i) => i.item_type === 'MATERIAL' && !i.code?.startsWith('HUEVO_') && !i.code?.startsWith('SOBRE_') && !i.favorito && i.quantity > 0);
  const stone = inventory.find((i) => i.code === 'PIEDRA_TRASCENDENCIA' && i.quantity > 0);
  const sorted = useMemo(() => [...(pets ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.level - a.level), [pets]);
  const pet = sorted.find((p) => p.id === selId) ?? sorted[0] ?? null;
  const egg = eggs.find((e) => e.item_id === eggId) ?? eggs[0] ?? null;
  // cada lugar: el huevo que tiene (o null), cuánto le falta y si ya está listo
  const lugares = Array.from({ length: incu.max }, (_, i) => {
    const h = incu.huevos.find((x) => x.ranura === i + 1) ?? null;
    const left = h ? Math.max(0, (readyAt[h.ranura] ?? now) - now) : 0;
    return { ranura: i + 1, h, left, ready: !!h && (h.ready || left <= 0), progress: h ? Math.min(100, 100 - (left / 1000 / Math.max(1, h.total_seconds)) * 100) : 0 };
  });
  const hayLibre = lugares.some((l) => !l.h);
  const proximo = lugares.filter((l) => l.h && !l.ready).sort((a, b) => a.left - b.left)[0];

  const run = async (fn, okText) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      const text = typeof okText === 'function' ? okText(r) : okText;
      if (text) setMessage({ ok: true, text });
      await load();
      onChanged?.();
      return r;
    } catch (e) {
      setMessage({ ok: false, text: e.message });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const claim = async (ranura) => {
    const p = await run(() => api.claimIncubator(player.id, token, ranura), (r) => `¡Eclosionó ${r?.name ?? 'una mascota'}!`);
    if (p?.id) { setTab('mascotas'); setSelId(p.id); }
  };

  // qué puede nacer del huevo elegido (las de su zona y rareza; si la zona no tiene, cualquiera de esa rareza)
  const eggPets = useMemo(() => {
    const info = egg && eggInfo(egg.code);
    if (!info || !catalog?.pets) return [];
    const byRarity = catalog.pets.filter((p) => p.rarity === info.rarity);
    const inZone = info.zoneId ? byRarity.filter((p) => p.zone_id === info.zoneId) : [];
    return inZone.length ? inZone : byRarity;
  }, [egg, catalog]);
  const ownedCodes = useMemo(() => new Set((pets ?? []).map((p) => p.code)), [pets]);

  const [pi, pa] = pet ? petIcon(pet.name) : ['paw-print', 'lorc'];

  const renderPet = () => (pet ? (
    <>
      <div className={`wp-pet-show wp-glow-${rarityClass(pet.rarity)}`}>
        <GameIcon name={pi} artist={pa} />
        <span className="wp-pet-pedestal" />
      </div>
      <h3 className={`wp-text-${rarityClass(pet.rarity)}`}>{pet.name}</h3>
      <p className="wp-pet-sub">
        {RARITY_LABELS[pet.rarity] ?? pet.rarity} · Nivel {pet.level}
        {pet.zone_id ? ` · ${ZONA_NOMBRE[pet.zone_id]}` : ''}{pet.is_active ? ' · Te acompaña' : ''}
      </p>
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
            {food.map((m) => (
              <button key={m.item_id} type="button" className={`wp-slot wp-rarity-${rarityClass(m.rarity)}`} title={m.name} disabled={busy}
                onClick={() => run(() => api.feedPet(player.id, pet.id, m.item_id, 1, token), `${pet.name} comió ${m.name}`)}>
                <ItemIcon icon={iconForItem(m)} />
                {m.quantity > 1 && <span className="wp-slot-qty">{m.quantity}</span>}
              </button>
            ))}
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
  ));

  const renderEgg = () => {
    if (!egg) {
      return (
        <>
          <div className="wp-pet-show wp-pet-show--empty">
            <GameIcon name="egg-clutch" artist="lorc" />
            <span className="wp-pet-pedestal" />
          </div>
          <h3>Sin huevos</h3>
          <p className="wp-pet-sub">Los monstruos de cada zona sueltan sus huevos. De cada uno nace una mascota de esa zona.</p>
        </>
      );
    }
    const info = eggInfo(egg.code);
    const hours = catalog?.hatchHours?.[info.rarity];
    return (
      <>
        <div className={`wp-pet-show wp-egg-show wp-glow-${rarityClass(info.rarity)}`}>
          <ItemIcon icon={iconForItem(egg)} />
          <span className="wp-pet-pedestal" />
        </div>
        <h3 className={`wp-text-${rarityClass(info.rarity)}`}>{egg.name}</h3>
        <p className="wp-pet-sub">
          {RARITY_LABELS[info.rarity] ?? info.rarity} · {info.zoneId ? ZONA_NOMBRE[info.zoneId] : 'De cualquier zona'}
          {hours ? ` · Tarda ${hoursText(hours)}` : ''} · Tienes {egg.quantity}
        </p>
        {egg.description && <p className="wp-pet-desc">“{egg.description}”</p>}
        {eggPets.length > 0 && (
          <div className="wp-egg-hatch">
            <small>Puede nacer:</small>
            <ul>
              {eggPets.map((p) => {
                const [n, a] = petIcon(p.name);
                const have = ownedCodes.has(p.code);
                return (
                  <li key={p.id} className={have ? 'is-owned' : ''} title={have ? 'Ya la tienes' : 'Todavía no la tienes'}>
                    <span className={`wp-slot wp-slot--sm wp-rarity-${rarityClass(p.rarity)}`}><GameIcon name={n} artist={a} /></span>
                    <span>{p.name}{have ? ' ✓' : ''}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="wp-pet-actions">
          {!hayLibre
            ? (
              <button type="button" className="wp-btn" disabled title={incu.max > 1 ? 'Los dos lugares están ocupados' : 'La incubadora tiene un solo lugar'}>
                {lugares.some((l) => l.ready) ? 'Primero eclosiona el que está listo' : `Incubadora ocupada (${countdown(proximo?.left ?? 0)})`}
              </button>
            )
            : (
              <button type="button" className="wp-btn wp-btn--gold" disabled={busy}
                onClick={() => run(() => api.startIncubation(player.id, egg.item_id, token), `Incubando ${egg.name}`)}>
                Incubar
              </button>
            )}
        </div>
      </>
    );
  };

  return (
    <FloatingPanel
      id="mascotas"
      title="Mascotas"
      icon={<GameIcon name="paw" artist="lorc" />}
      width={700}
      defaultPos={defaultPos}
      onClose={onClose}
      zIndex={zIndex}
      onActivate={onActivate}
      footer={<span className={`wp-foot-note${message ? (message.ok ? ' ok' : ' err') : ''}`}>{message?.text ?? `${pets?.length ?? 0} mascota${pets?.length === 1 ? '' : 's'} en la colección · ${eggs.reduce((s, e) => s + e.quantity, 0)} huevos`}</span>}
    >
      {!pets && <p className="wp-empty">Cargando…</p>}
      {pets && (
        <div className="wp-pets">
          <aside className="wp-pets-side">
            {/* la incubadora, siempre a la vista: uno o dos lugares */}
            {lugares.map((l) => (
              <div key={l.ranura} className={`wp-incubator${l.ready ? ' wp-incubator--ready' : ''}`}>
                <span className={`wp-slot wp-slot--lg wp-egg${l.h ? ` wp-rarity-${rarityClass(l.h.egg_rarity)}` : ''}`}>
                  {l.h ? <ItemIcon icon={iconForItem({ name: l.h.egg_name, code: l.h.egg_code })} /> : <GameIcon name="egg-clutch" artist="lorc" />}
                </span>
                <div className="wp-incubator-info">
                  <strong>Incubadora{incu.max > 1 ? ` ${l.ranura}` : ''}</strong>
                  {!l.h && <small>{eggs.length ? 'Vacía: elige un huevo en la pestaña Huevos.' : 'Vacía. Los monstruos sueltan huevos.'}</small>}
                  {l.h && (
                    <>
                      <small>{l.h.egg_name}</small>
                      {l.ready
                        ? <button type="button" className="wp-btn wp-btn--gold" disabled={busy} onClick={() => claim(l.ranura)}>¡Eclosionar!</button>
                        : (
                          <>
                            <div className="wp-bar wp-incubator-bar"><div style={{ width: `${l.progress}%` }} /></div>
                            <span className="wp-incubator-time">{countdown(l.left)}</span>
                          </>
                        )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {incu.puntosParaOtra && (
              <small className="wp-incubator-next">Con {incu.puntosParaOtra} Puntos de Gesta (Logros, L) se abre un segundo lugar.</small>
            )}

            <div className="wp-pets-tabs">
              <button type="button" className={`wp-pets-tab${tab === 'mascotas' ? ' is-on' : ''}`} onClick={() => setTab('mascotas')}>
                <GameIcon name="paw" artist="lorc" /> Mascotas <b>{sorted.length}</b>
              </button>
              <button type="button" className={`wp-pets-tab${tab === 'huevos' ? ' is-on' : ''}`} onClick={() => setTab('huevos')}>
                <GameIcon name="egg-clutch" artist="lorc" /> Huevos <b>{eggs.reduce((s, e) => s + e.quantity, 0)}</b>
              </button>
            </div>

            {tab === 'mascotas' && (
              <ul className="wp-pet-list">
                {sorted.length === 0 && <li className="wp-empty">Todavía no tienes mascotas. ¡Incuba un huevo!</li>}
                {sorted.map((p) => {
                  const [n, a] = petIcon(p.name);
                  return (
                    <li key={p.id}>
                      <button type="button" className={`wp-pet-row${pet?.id === p.id ? ' wp-pet-row--sel' : ''}`} onClick={() => { setSelId(p.id); setFeeding(false); }}>
                        <span className={`wp-slot wp-slot--sm wp-rarity-${rarityClass(p.rarity)}`}><GameIcon name={n} artist={a} /></span>
                        <span className={`wp-pet-name wp-text-${rarityClass(p.rarity)}`}>{p.name}<small>Nv. {p.level}{p.zone_id ? ` · ${ZONA_NOMBRE[p.zone_id]}` : ''}</small></span>
                        {p.is_active && <span className="wp-pet-active" title="Te acompaña">★</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {tab === 'huevos' && (
              <div className="wp-egg-grid">
                {eggs.length === 0 && <span className="wp-empty">No tienes huevos. Los sueltan los monstruos de cada zona.</span>}
                {eggs.map((e) => (
                  <button key={e.item_id} type="button"
                    className={`wp-slot wp-rarity-${rarityClass(e.rarity)}${egg?.item_id === e.item_id ? ' wp-slot--sel' : ''}`}
                    title={e.name} onClick={() => setEggId(e.item_id)}>
                    <ItemIcon icon={iconForItem(e)} />
                    {e.quantity > 1 && <span className="wp-slot-qty">{e.quantity}</span>}
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* lo elegido, en escena */}
          <section className="wp-pet-stage">
            {tab === 'huevos' ? renderEgg() : renderPet()}
          </section>
        </div>
      )}
    </FloatingPanel>
  );
}
