import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import FloatingPanel from './FloatingPanel';
import { CATEGORY_LABEL, CardIcon, CharmIcon, MonsterCard, MonsterPortrait, MythicMark, RARITY_LABEL } from './coleccionArt';
import './BestiarioPanel.css';

// Colección del cazador (tecla K): fichas del bestiario con metas de caza, amuletos que se
// compran con los puntos de las fichas dominadas y el álbum de cartas para engarzar.
const STAGE_TEXT = ['Visto', 'Estadísticas', 'Botín', 'Dominado'];
const DROP_RARITY = { COMUN: 'Común', POCO_COMUN: 'Poco común', RARO: 'Raro', EPICO: 'Épico', LEGENDARIO: 'Legendario', UNICO: 'Único' };

function KillBar({ kills, thresholds }) {
  const max = thresholds[2];
  return (
    <div className="bs-killbar">
      <div className="bs-killbar-track">
        <div className="bs-killbar-fill" style={{ width: `${Math.min(100, (kills / max) * 100)}%` }} />
        {thresholds.map((t, i) => (
          <span key={t} className={`bs-killbar-mark${kills >= t ? ' is-done' : ''}`} style={{ left: `${(t / max) * 100}%` }} title={`${t}: ${STAGE_TEXT[i + 1]}`} />
        ))}
      </div>
      <small>{kills.toLocaleString()} / {max} derrotados</small>
    </div>
  );
}

function Locked({ need, what }) {
  return <p className="bs-locked"><GameIcon name="padlock" artist="lorc" /> Derrota {need} más para ver {what}.</p>;
}

function Ficha({ m }) {
  if (!m.known) {
    return (
      <div className="bs-detail bs-detail--unknown">
        <MonsterPortrait code={m.code} box={128} silhouette />
        <h3>???</h3>
        <p className="bs-locked">Aún no te has cruzado con esta criatura. Explora la zona para descubrirla.</p>
      </div>
    );
  }
  const [t1, t2] = m.thresholds;
  return (
    <div className={`bs-detail bs-rar-${m.rarity.toLowerCase()}`}>
      <div className="bs-detail-head">
        <MonsterPortrait code={m.code} box={128} />
        <div>
          <h3>{m.name}</h3>
          <p className="bs-tags">
            <span className={`bs-rarity bs-rarity--${m.rarity.toLowerCase()}`}>{m.mythic ? 'Mítico' : RARITY_LABEL[m.rarity]}</span>
            <span>{CATEGORY_LABEL[m.category] ?? m.category}</span>
            {m.stage === 3 && <span className="bs-dominado">★ Dominado</span>}
          </p>
          <KillBar kills={m.kills} thresholds={m.thresholds} />
          <small className="bs-hint">Domínalo y ganas {m.points} puntos de bestiario.</small>
        </div>
      </div>
      {m.description && <p className="bs-desc">«{m.description}»</p>}
      <h4>Estadísticas</h4>
      {m.stats ? (
        <dl className="bs-stats">
          <div><dt>Nivel</dt><dd>{m.stats.levels}</dd></div>
          <div><dt>Vida</dt><dd>{m.stats.hp}</dd></div>
          <div><dt>Ataque</dt><dd>{m.stats.atk}</dd></div>
          <div><dt>Defensa</dt><dd>{m.stats.def}</dd></div>
          <div><dt>Magia</dt><dd>{m.stats.mag}</dd></div>
          <div><dt>Def. mágica</dt><dd>{m.stats.mdef}</dd></div>
          <div><dt>Velocidad</dt><dd>{m.stats.spd}</dd></div>
          <div><dt>Evasión</dt><dd>{m.stats.evasion}%</dd></div>
          {m.stats.element && <div><dt>Elemento</dt><dd>{m.stats.element}</dd></div>}
        </dl>
      ) : <Locked need={t1 - m.kills} what="sus estadísticas" />}
      <h4>Botín</h4>
      {m.drops ? (
        m.drops.length ? (
          <ul className="bs-drops">
            {m.drops.map((d) => (
              <li key={d.name}><span className={`bs-drop-name rar-${(d.rarity || 'COMUN').toLowerCase()}`}>{d.name}</span><small>{DROP_RARITY[d.rarity] ?? ''}</small><b>{d.chance}%</b></li>
            ))}
          </ul>
        ) : <p className="bs-locked">No suelta objetos: su botín se reparte en la cacería.</p>
      ) : <Locked need={t2 - m.kills} what="lo que suelta" />}
      <h4>Carta</h4>
      <div className="bs-cardrow">
        <MonsterCard card={{ ...m, rarity: m.rarity }} scale={2} />
        <div>
          <b>{m.card.label}</b>
          <p>{m.card.text}</p>
          <small>{m.card.owned ? `Tienes ${m.card.owned}` : 'Aún no la tienes'}{m.card.chance != null ? ` · sale ${m.card.chance}% de las veces` : ' · solo del botín de la cacería'}</small>
        </div>
      </div>
    </div>
  );
}

function Fichas({ data }) {
  const [sel, setSel] = useState(null);
  const [zone, setZone] = useState(null);
  const zones = data.zones.filter((z) => z.monsters.length);
  const cur = zones.find((z) => z.id === zone) ?? zones.find((z) => z.monsters.some((m) => m.known)) ?? zones[0];
  const m = cur?.monsters.find((x) => x.id === sel) ?? cur?.monsters.find((x) => x.known) ?? cur?.monsters[0];
  if (!cur) return <p className="wp-empty">No hay criaturas registradas.</p>;
  const known = cur.monsters.filter((x) => x.known).length;
  return (
    <div className="bs-fichas">
      <div className="bs-list">
        <select className="bs-zone" value={cur.id} onChange={(e) => { setZone(Number(e.target.value)); setSel(null); }}>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.levels})</option>)}
        </select>
        <small className="bs-zone-count">{known} / {cur.monsters.length} descubiertos</small>
        <div className="bs-grid">
          {cur.monsters.map((x) => (
            <button
              key={x.id}
              type="button"
              className={`bs-tile bs-rar-${x.rarity.toLowerCase()}${x.id === m?.id ? ' is-selected' : ''}${x.stage === 3 ? ' is-done' : ''}`}
              onClick={() => { setSel(x.id); audio.sfx('clic'); }}
              title={x.known ? x.name : '???'}
            >
              <MonsterPortrait code={x.code} box={48} silhouette={!x.known} />
              <span className="bs-tile-bar"><i style={{ width: `${Math.min(100, (x.kills / x.thresholds[2]) * 100)}%` }} /></span>
              {x.stage === 3 && <span className="bs-tile-star">★</span>}
              {x.mythic && <span className="bs-tile-mythic"><MythicMark scale={1} /></span>}
            </button>
          ))}
        </div>
      </div>
      {m && <Ficha m={m} />}
    </div>
  );
}

function Amuletos({ data, onBuy, busy }) {
  return (
    <div className="bs-charms">
      <p className="bs-intro">Cada ficha que <b>dominas</b> te da puntos de bestiario. Gástalos en amuletos: bonos permanentes que te ayudan a cazar.</p>
      {data.charms.map((c) => (
        <div key={c.code} className={`bs-charm${c.level ? ' is-on' : ''}`}>
          <CharmIcon code={c.code} scale={2} />
          <div className="bs-charm-text">
            <b>{c.name}</b>
            <span className="bs-pips">{Array.from({ length: c.max }, (_, i) => <i key={i} className={i < c.level ? 'on' : ''} />)}</span>
            <small>{c.text ?? 'Sin activar'}{c.next ? ` → ${c.next.text}` : ''}</small>
          </div>
          {c.next ? (
            <button type="button" className="wp-btn wp-btn--gold" disabled={busy || data.points.available < c.next.cost} onClick={() => onBuy(c.code)}>
              {c.level ? 'Mejorar' : 'Activar'} · {c.next.cost} pts
            </button>
          ) : <span className="bs-max">Máximo</span>}
        </div>
      ))}
    </div>
  );
}

const BONUS_TEXT = {
  gold: (v) => `+${v}% oro`, xp: (v) => `+${v}% experiencia`, drop: (v) => `+${v}% botín`, regen: (v) => `${v}% vida al ganar`,
  mana: (v) => `${v}% maná al ganar`, guard: (v) => `-${v}% daño recibido`, card: (v) => `+${v}% cartas`,
};

function Cartas({ onMsg }) {
  const { player, token } = useAuth();
  const [st, setSt] = useState(null);
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getCartas(player.id, token).then(setSt).catch((e) => onMsg(e.message)); }, [player, token, onMsg]);

  const run = async (fn, ok) => {
    setBusy(true);
    try { setSt(await fn()); onMsg(ok); audio.sfx('mejora'); } catch (e) { onMsg(e.message); audio.sfx('error'); }
    setBusy(false);
  };
  const socket = (card) => {
    if (!slot) { onMsg('Primero elige una ranura del equipo (a la izquierda).'); return; }
    run(() => api.socketCarta(player.id, slot, card.monsterId, token), `Engarzaste la Carta de ${card.name}.`);
  };
  if (!st) return <p className="wp-empty">Cargando álbum…</p>;
  const bonus = Object.entries(st.bonus).filter(([, v]) => v > 0);
  return (
    <div className="bs-cards">
      <div className="bs-slots">
        <h4>Ranuras del equipo</h4>
        {st.slots.map((s) => (
          <div key={s.slot} className={`bs-slot${slot === s.slot ? ' is-selected' : ''}`}>
            <button type="button" className="bs-slot-pick" onClick={() => setSlot(s.slot)}>
              {s.card ? <span className="bs-slot-card"><CardIcon rarity={s.card.rarity} /></span> : <span className="bs-slot-empty">+</span>}
              <span className="bs-slot-text">
                <b>{s.label}</b>
                <small>{s.card ? `Carta de ${s.card.name}` : (s.item ?? 'sin equipo')}</small>
                {s.card && <em>{s.card.text}</em>}
              </span>
            </button>
            {s.card && <button type="button" className="bs-slot-remove" disabled={busy} title="Quitar (vuelve al álbum)" onClick={() => run(() => api.unsocketCarta(player.id, s.slot, token), 'La carta volvió al álbum.')}>×</button>}
          </div>
        ))}
        <div className="bs-bonus">
          <b>Bonos de cartas y amuletos</b>
          {bonus.length ? bonus.map(([k, v]) => <span key={k}>{BONUS_TEXT[k]?.(v) ?? `${k} ${v}`}</span>) : <small>Ninguno todavía</small>}
        </div>
      </div>
      <div className="bs-album">
        <h4>Álbum {slot ? <small>· clic en una carta para engarzarla en {st.slots.find((s) => s.slot === slot)?.label}</small> : <small>· elige una ranura</small>}</h4>
        {st.owned.length ? (
          <div className="bs-album-grid">
            {st.owned.map((c) => (
              <div key={c.monsterId} className="bs-album-item">
                <MonsterCard card={c} scale={2} count={c.quantity} onClick={busy ? undefined : () => socket(c)} title={`${c.name}: ${c.text}`} />
                <small>{c.text}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="bs-intro">Aún no tienes cartas. Cada monstruo puede soltar la suya muy de vez en cuando; los minijefes y jefes, un poco más seguido. La carta mítica solo sale de la cacería del jefe mítico.</p>
        )}
      </div>
    </div>
  );
}

// Ranking semanal de cazadores de jefes míticos (los primeros llevan título)
function Cazadores() {
  const { player } = useAuth();
  const [list, setList] = useState(null);
  useEffect(() => { api.getCazadores().then(setList).catch(() => setList([])); }, []);
  if (!list) return <p className="wp-empty">Cargando…</p>;
  return (
    <div className="bs-hunters">
      <p className="bs-intro">Daño a los jefes míticos en los últimos 7 días. El primero es <b>Cazador de Lunas</b>; el segundo y el tercero, <b>Rastreadores Espectrales</b>.</p>
      {!list.length && <p className="wp-empty">Nadie ha cazado un jefe mítico esta semana. ¡Sé el primero!</p>}
      {list.map((h) => (
        <div key={h.id} className={`bs-hunter${h.rank <= 3 ? ` bs-hunter--${h.rank}` : ''}${h.id === player.id ? ' is-me' : ''}`}>
          <span className="bs-hunter-rank">{h.rank}</span>
          <span className="bs-hunter-name"><b>{h.nickname}</b><small>{h.title} · nivel {h.level}</small></span>
          <span className="bs-hunter-stats">
            <b>{h.damage.toLocaleString()}</b><small>daño</small>
          </span>
          <span className="bs-hunter-stats"><b>{h.hunts}</b><small>cacerías</small></span>
          <span className="bs-hunter-stats"><b>{h.final_blows}</b><small>golpes finales</small></span>
        </div>
      ))}
    </div>
  );
}

export default function BestiarioPanel(props) {
  const { player, token } = useAuth();
  const [tab, setTab] = useState('fichas');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.getBestiario(player.id, token).then(setData).catch((e) => setMsg(e.message)), [player, token]);
  useEffect(() => { load(); }, [load, props.refreshKey]);
  // la mochila abre el bestiario directo en el álbum de cartas
  useEffect(() => {
    const onTab = (t) => setTab(t);
    bus.on('bestiario-tab', onTab);
    return () => bus.off('bestiario-tab', onTab);
  }, []);
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);

  const buy = async (code) => {
    setBusy(true);
    try {
      const r = await api.buyAmuleto(player.id, code, token);
      setData((d) => ({ ...d, ...r }));
      audio.sfx('monedas');
      setMsg('El amuleto brilla con más fuerza.');
    } catch (e) { setMsg(e.message); audio.sfx('error'); }
    setBusy(false);
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const all = data.zones.flatMap((z) => z.monsters);
    return { known: all.filter((m) => m.known).length, done: all.filter((m) => m.stage === 3).length, total: all.length };
  }, [data]);
  const onMsg = useCallback((t) => setMsg(t), []);

  return (
    <FloatingPanel
      {...props}
      id="bestiario"
      title="Bestiario"
      icon={<GameIcon name="book-aura" artist="lorc" />}
      width={720}
      footer={(
        <>
          <span className="wp-bag-msg">{msg || (stats ? `${stats.known} descubiertos · ${stats.done} dominados de ${stats.total}` : '')}</span>
          {data && <span className="bs-points" title="Puntos de bestiario">✦ {data.points.available} puntos</span>}
        </>
      )}
    >
      <div className="bs-tabs" role="tablist">
        {[['fichas', 'Fichas'], ['amuletos', 'Amuletos'], ['cartas', 'Cartas'], ['cazadores', 'Cazadores']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {!data && <p className="wp-empty">Cargando…</p>}
      {data && tab === 'fichas' && <Fichas data={data} />}
      {data && tab === 'amuletos' && <Amuletos data={data} onBuy={buy} busy={busy} />}
      {tab === 'cartas' && <Cartas onMsg={onMsg} />}
      {tab === 'cazadores' && <Cazadores />}
    </FloatingPanel>
  );
}
