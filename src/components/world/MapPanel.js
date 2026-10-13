import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import { ATLAS_ZONES, ATLAS_ROADS, ZONE_EXITS, CONTINENT_PATH } from '../../game/atlas';
import GameIcon from '../GameIcon';
import { MythicMark } from './coleccionArt';
import './BestiarioPanel.css';
import FloatingPanel from './FloatingPanel';
import './MapPanel.css';

// Mapa (M). Pestaña "Zona": el mapa entero de la zona donde estás (como el minimapa, pero
// completo) con las subzonas y sus niveles, NPCs, jefes, salidas y tu posición en vivo.
// Pestaña "Mundo": todas las zonas de Etheria, cómo se conectan y por dónde se llega.

const PX = 4; // píxeles por casilla del mapa de zona a zoom 1

// mismo criterio de colores que los monstruos del mapa (WorldScene.levelColor)
export function levelColor(levels, heroLevel) {
  if (!levels) return '#9dffbf';
  const [a, b = a] = String(levels).split('-').map(Number);
  const diff = (a + b) / 2 - heroLevel;
  if (diff >= 5) return '#ff4a4a';
  if (diff >= 3) return '#ff9a3c';
  if (diff >= -2) return '#ffe066';
  if (diff >= -6) return '#7ddc5a';
  return '#a0a0a0';
}

// dibuja la zona completa (todas las capas) a 8 px por casilla, una vez por apertura
function renderZone(data) {
  const tiles = 8;
  const W = data.chunkWidth * data.columns;
  const H = data.chunkHeight * data.rows;
  const cv = document.createElement('canvas');
  cv.width = W * tiles;
  cv.height = H * tiles;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const img = data.tileset;
  const cols = Math.floor(img.width / 32);
  for (const c of data.chunks) {
    for (const layer of ['suelo', 'objetos', 'encima']) {
      const arr = c[layer];
      for (let i = 0; i < arr.length; i += 1) {
        const gid = arr[i];
        if (!gid) continue;
        const x = c.cx * data.chunkWidth + (i % data.chunkWidth);
        const y = c.cy * data.chunkHeight + Math.floor(i / data.chunkWidth);
        g.drawImage(img, ((gid - 1) % cols) * 32, Math.floor((gid - 1) / cols) * 32, 32, 32, x * tiles, y * tiles, tiles, tiles);
      }
    }
  }
  // un velo cálido de pergamino para que se lea como un mapa y no como una captura
  g.fillStyle = 'rgba(70, 50, 20, 0.18)';
  g.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

// subzona que manda en cada punto (la primera de la lista que lo contenga, como en el juego)
const subzoneAt = (subs, x, y) => subs.find((s) => x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1);

function ZoneMap({ onWorld }) {
  const [data, setData] = useState(null);
  const [hero, setHero] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState(null);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const centered = useRef(false);

  useEffect(() => {
    bus.emit('zone-map-data', (d) => setData(d));
    const tick = () => bus.emit('hero-pos', (p) => setHero(p));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, []);

  const image = useMemo(() => (data ? renderZone(data) : null), [data]);
  const W = data ? data.chunkWidth * data.columns : 0;
  const H = data ? data.chunkHeight * data.rows : 0;
  const scale = (PX * zoom) / (data?.tile ?? 32); // píxeles del panel por píxel del mundo

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !image) return;
    cv.width = image.width;
    cv.height = image.height;
    cv.getContext('2d').drawImage(image, 0, 0);
  }, [image]);

  // al abrir (y al cambiar el zoom) la vista se centra en el héroe
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hero || !data) return;
    if (centered.current === zoom) return;
    centered.current = zoom;
    el.scrollLeft = hero.x * scale - el.clientWidth / 2;
    el.scrollTop = hero.y * scale - el.clientHeight / 2;
  }, [hero, zoom, scale, data]);

  // etiqueta de cada subzona en el centro de la parte que realmente le toca (las subzonas se
  // pisan: "Tierras Heridas" no incluye al Corazón de la Pradera aunque su rectángulo sí)
  const labels = useMemo(() => {
    if (!data) return [];
    const subs = data.subzonas;
    const acc = new Map();
    const step = data.tile * 2;
    for (let y = step / 2; y < H * data.tile; y += step) {
      for (let x = step / 2; x < W * data.tile; x += step) {
        const s = subzoneAt(subs, x, y);
        if (!s) continue;
        const a = acc.get(s) ?? { x: 0, y: 0, n: 0 };
        a.x += x; a.y += y; a.n += 1;
        acc.set(s, a);
      }
    }
    // la subzona que cubre toda la zona (el nombre de la zona) no lleva etiqueta propia
    return [...acc.entries()]
      .filter(([s]) => !(s.x0 <= 0 && s.y0 <= 0 && s.x1 >= W * data.tile && s.y1 >= H * data.tile))
      .map(([s, a]) => ({ s, x: a.x / a.n, y: a.y / a.n }));
  }, [data, W, H]);

  if (!data) return <p className="wp-empty">Cargando el mapa…</p>;

  // si el nombre de una subzona cae sobre NPCs o lugares (la plaza de la aldea), se sube un poco
  const placed = labels.map(({ s, x, y }) => {
    const lx = x * scale;
    const blocked = (ly) => data.points.some((p) => Math.abs(p.x * scale - lx) < 60 && Math.abs(p.y * scale - ly) < 20);
    let ly = y * scale;
    for (let k = 0; k < 8 && blocked(ly); k += 1) ly -= 14;
    return { s, lx, ly };
  });

  const exits = ZONE_EXITS[data.dir] ?? {};
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - r.left) / scale;
    const wy = (e.clientY - r.top) / scale;
    const s = subzoneAt(data.subzonas, wx, wy);
    setHover(s ? { s, x: e.clientX - r.left, y: e.clientY - r.top } : null);
  };
  const facingRot = !hero ? 0 : hero.facing === 'up' ? 180 : hero.facing === 'side' ? (hero.flip ? 90 : -90) : 0;

  return (
    <div className="mp-zone">
      <div className="mp-scroll" ref={scrollRef}>
        <div className="mp-map" style={{ width: W * PX * zoom, height: H * PX * zoom }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <canvas ref={canvasRef} className="mp-canvas" />
          {placed.map(({ s, lx, ly }) => (
            <span key={s.name} className="mp-sub" style={{ left: lx, top: ly }}>
              <b>{s.name}</b>
              <small style={{ color: s.safe ? '#9dffbf' : levelColor(s.levels, data.heroLevel) }}>{s.safe ? 'Zona segura' : `Nv ${s.levels}`}</small>
            </span>
          ))}
          {data.points.map((p) => {
            const exit = exits[p.name];
            if ((p.type === 'poi' || p.type === 'salida') && exit != null) {
              const dest = ATLAS_ZONES[exit];
              return (
                <span key={p.name} className="mp-pin mp-exit" style={{ left: p.x * scale, top: p.y * scale }} title={p.label}>
                  <i>➜</i><em>{dest?.name ?? 'Salida'}{dest?.soon ? ' (próximamente)' : ''}</em>
                </span>
              );
            }
            if (p.type === 'npc') {
              const mark = data.marks?.[p.dialogue];
              return (
                <span key={p.name} className={`mp-pin mp-npc${mark ? ` mp-npc--${mark === '?' ? 'entrega' : mark === 'gris' ? 'gris' : 'mision'}` : ''}`} style={{ left: p.x * scale, top: p.y * scale }} title={p.label}>
                  <i>{mark === 'gris' ? '!' : (mark || '●')}</i>{zoom > 1 && <em>{String(p.label).split(',')[0]}</em>}
                </span>
              );
            }
            if (p.type === 'jefe') {
              return (
                <span key={p.name} className="mp-pin mp-boss" style={{ left: p.x * scale, top: p.y * scale }} title={p.label}>
                  <i>☠</i><em>{p.label.replace(/^Desafiar a(l)?\s*/i, '')}{p.level ? ` · Nv ${p.level}` : ''}</em>
                </span>
              );
            }
            return (
              <span key={p.name} className="mp-pin mp-poi" style={{ left: p.x * scale, top: p.y * scale }} title={p.label}>
                <i>◆</i>{zoom > 1 && <em>{String(p.label).split('—')[0].trim()}</em>}
              </span>
            );
          })}
          {data.mythic && (
            <span className="mp-pin mp-mythic" style={{ left: data.mythic.x * scale, top: data.mythic.y * scale }} title={`${data.mythic.name} — ${data.mythic.spot}`}>
              <i><MythicMark scale={1} /></i><em>{data.mythic.name.split(',')[0]}</em>
            </span>
          )}
          {hero && (
            <span className="mp-hero" style={{ left: hero.x * scale, top: hero.y * scale }}>
              <i style={{ transform: `rotate(${facingRot}deg)` }}>▼</i>
            </span>
          )}
          {hover && (
            <span className="mp-tip" style={{ left: hover.x + 14, top: hover.y + 10 }}>
              <b>{hover.s.name}</b>
              <small style={{ color: hover.s.safe ? '#9dffbf' : levelColor(hover.s.levels, data.heroLevel) }}>
                {hover.s.safe ? 'Zona segura' : `Niveles ${hover.s.levels}`}
              </small>
            </span>
          )}
        </div>
        <span className="mp-compass" aria-hidden="true">N<br />▲</span>
      </div>
      <div className="mp-bar">
        <div className="mp-legend">
          <span><i className="mp-l-hero">▼</i> Tú</span>
          <span><i className="mp-l-npc">●</i> NPC</span>
          <span><i className="mp-l-poi">◆</i> Lugar</span>
          <span><i className="mp-l-boss">☠</i> Jefe</span>
          <span><i className="mp-l-exit">➜</i> Salida</span>
          {data.mythic && <span><i><MythicMark scale={1} /></i> Jefe mítico</span>}
        </div>
        <div className="mp-tools">
          <button type="button" className={zoom === 1 ? 'on' : ''} onClick={() => setZoom(1)}>Entera</button>
          <button type="button" className={zoom === 2 ? 'on' : ''} onClick={() => setZoom(2)}>Cerca</button>
          <button type="button" className="mp-world-btn" onClick={onWorld}><GameIcon name="world" artist="lorc" /> Mundo</button>
        </div>
      </div>
    </div>
  );
}

function WorldAtlas({ currentZoneId, onZone }) {
  const { player, token } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(currentZoneId);

  useEffect(() => {
    api.getPlayerZones(player.id, token).then(setZones).catch(() => setZones([]));
  }, [player, token]);

  const info = (id) => {
    const a = ATLAS_ZONES[id];
    const z = zones.find((q) => String(q.id) === String(id));
    return {
      id, ...a, name: a.name ?? z?.name ?? '…', levels: a.levels ?? z?.levelRange ?? null,
      description: a.description ?? z?.description ?? '', unlocked: id === 'capital' ? true : !!z?.unlocked, bossDefeated: !!z?.bossDefeated,
    };
  };
  const ids = Object.keys(ATLAS_ZONES);
  const sel = info(selected);
  const here = (id) => String(id) === String(currentZoneId);

  return (
    <div className="mp-world">
      <svg className="mp-atlas" viewBox="0 0 600 400" role="img" aria-label="Mapa del mundo">
        <defs>
          <radialGradient id="mp-sea" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#2d5a73" />
            <stop offset="100%" stopColor="#14283a" />
          </radialGradient>
          <linearGradient id="mp-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6d3a3" />
            <stop offset="100%" stopColor="#c9b07a" />
          </linearGradient>
          <filter id="mp-rough"><feTurbulence baseFrequency="0.04" numOctaves="3" seed="7" /><feDisplacementMap in="SourceGraphic" scale="6" /></filter>
        </defs>
        <rect width="600" height="400" fill="url(#mp-sea)" />
        {/* olas */}
        {[[40, 380], [520, 30], [570, 300], [20, 150], [300, 395]].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 12} ${y} q6 -5 12 0 t12 0`} className="mp-wave" />
        ))}
        <path d={CONTINENT_PATH} fill="url(#mp-land)" stroke="#6b5326" strokeWidth="2.5" filter="url(#mp-rough)" />
        {/* relieve decorativo: montañas al este, árboles al oeste */}
        {[[392, 190], [410, 176], [430, 192], [448, 178], [404, 232], [440, 232], [500, 140], [520, 98]].map(([x, y]) => (
          <path key={`m${x}${y}`} d={`M${x - 10} ${y + 8} L${x} ${y - 9} L${x + 10} ${y + 8} Z`} className="mp-mount" />
        ))}
        {[[150, 230], [162, 244], [140, 252], [190, 190], [60, 250], [76, 236]].map(([x, y]) => (
          <circle key={`t${x}${y}`} cx={x} cy={y} r="6" className="mp-tree" />
        ))}
        {ATLAS_ROADS.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={ATLAS_ZONES[a].x} y1={ATLAS_ZONES[a].y} x2={ATLAS_ZONES[b].x} y2={ATLAS_ZONES[b].y} className="mp-road" />
        ))}
        {ids.map((id) => {
          const z = info(id);
          const on = String(selected) === String(id);
          return (
            <g key={id} className={`mp-node${z.unlocked ? '' : ' locked'}${on ? ' on' : ''}`} transform={`translate(${z.x} ${z.y})`} onClick={() => setSelected(id)}>
              <circle r={id === 'capital' ? 22 : 19} fill={z.color} className="mp-node-disc" />
              {here(id) && <circle r="27" className="mp-here-ring" />}
              <text y={id === 'capital' ? 36 : 33} className="mp-node-name">{z.name}</text>
              {z.levels && <text y={id === 'capital' ? 47 : 44} className="mp-node-lv">Nv {z.levels}</text>}
            </g>
          );
        })}
        <g transform="translate(560 360)" className="mp-rose">
          <circle r="16" />
          <path d="M0 -14 L4 0 L0 14 L-4 0 Z" />
          <text y="-19">N</text>
        </g>
      </svg>
      {/* iconos encima del SVG (GameIcon es HTML) */}
      <div className="mp-icons">
        {ids.map((id) => {
          const z = info(id);
          return (
            <button key={id} type="button" className={`mp-icon${z.unlocked ? '' : ' locked'}`} style={{ left: `${(z.x / 600) * 100}%`, top: `${(z.y / 400) * 100}%` }} onClick={() => setSelected(id)} title={z.name}>
              <GameIcon name={z.unlocked ? z.icon[0] : 'padlock'} artist={z.unlocked ? z.icon[1] : 'lorc'} />
              {z.bossDefeated && <span className="mp-crown"><GameIcon name="crown" artist="lorc" /></span>}
              {here(id) && <span className="mp-here">Estás aquí</span>}
            </button>
          );
        })}
      </div>
      <div className="mp-info">
        <div>
          <h3>{sel.name} {sel.levels && <small>Nv {sel.levels}</small>}</h3>
          <p>{sel.description}</p>
          <p className="mp-route"><GameIcon name="direction-signs" artist="delapouite" /> {sel.route}</p>
        </div>
        {here(sel.id) ? (
          <button type="button" className="wp-btn wp-btn--gold" onClick={onZone}>Ver la zona</button>
        ) : sel.soon ? (
          <span className="mp-status">Próximamente</span>
        ) : sel.unlocked ? (
          <button type="button" className="wp-btn" title="Esta zona todavía no está en el mundo abierto" onClick={() => navigate(`/combat/${sel.id}`)}>Explorar</button>
        ) : (
          <span className="mp-status locked">Bloqueada</span>
        )}
      </div>
    </div>
  );
}

export default function MapPanel(props) {
  const [tab, setTab] = useState('zona');
  const [zone, setZone] = useState({ id: 1, name: 'Zona' });
  // en Aurelia (zona 0) el "Estás aquí" del mapa del mundo es la capital
  useEffect(() => { bus.emit('zone-map-data', (d) => setZone({ id: d.dir === 'aurelia' ? 'capital' : d.id, name: d.name })); }, []);
  return (
    <FloatingPanel {...props} id="mapa" title="Mapa" icon={<GameIcon name="treasure-map" artist="lorc" />} width={Math.min(700, window.innerWidth - 16)}>
      <div className="mp-tabs">
        <button type="button" className={tab === 'zona' ? 'on' : ''} onClick={() => setTab('zona')}>{zone.name}</button>
        <button type="button" className={tab === 'mundo' ? 'on' : ''} onClick={() => setTab('mundo')}><GameIcon name="world" artist="lorc" /> Mundo</button>
      </div>
      {tab === 'zona' ? <ZoneMap onWorld={() => setTab('mundo')} /> : <WorldAtlas currentZoneId={zone.id} onZone={() => setTab('zona')} />}
    </FloatingPanel>
  );
}
