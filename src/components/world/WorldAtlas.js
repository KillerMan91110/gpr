import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import bus from '../../game/bus';
import { ATLAS_ZONES } from '../../game/atlas';
import GameIcon from '../GameIcon';

// Mapa del mundo (pestaña "Mundo" del mapa, tecla M): el continente de verdad, pintado en pixel art a
// partir de los mapas de cada zona (art/mapas/generar_atlas.js + art/sprites/mundo/crear_atlas.lua).
// Encima: la niebla de lo que todavía no exploraste (gprback/lib/exploracion.js), los bordes y nombres
// de las zonas, ciudades, mazmorras, jefes, muelles y trineos, la ruta del barco y dónde estás.
// Se acerca con la rueda (o los botones) y se arrastra para moverlo.

const ASSETS = `${process.env.PUBLIC_URL}/assets/mundo/atlas`;
const ZOOMS = [1, 1.6, 2.4, 3.4];
const EXPLORE_CELL = 4; // casillas por lado de cada cuadro explorado (igual que game/world/explore.js)
// icono de cada tipo de lugar
const LUGAR_ICON = {
  ciudad: ['castle', 'delapouite'], mazmorra: ['dungeon-gate', 'delapouite'], jefe: ['crowned-skull', 'lorc'],
  barco: ['anchor', 'lorc'], trineo: ['dog-house', 'delapouite'], bote: ['sailboat', 'delapouite'], estatua: ['angel-outfit', 'lorc'],
};
const LUGAR_NOMBRE = { ciudad: 'Ciudad', mazmorra: 'Mazmorra', jefe: 'Jefe', barco: 'Barco', trineo: 'Trineos', bote: 'Botes', estatua: 'Estatua' };

// mismo criterio de colores que los monstruos del mapa
function levelColor(levels, heroLevel) {
  if (!levels) return '#9dffbf';
  const [a, b = a] = String(levels).split('-').map(Number);
  const diff = (a + b) / 2 - heroLevel;
  if (diff >= 5) return '#ff6a5a';
  if (diff >= 3) return '#ffad5a';
  if (diff >= -2) return '#ffe066';
  if (diff >= -6) return '#9be07a';
  return '#b8b8b8';
}

const b64bits = (s) => {
  try { return Uint8Array.from(atob(s || ''), (c) => c.charCodeAt(0)); } catch { return new Uint8Array(0); }
};

export default function WorldAtlas({ currentZoneId, onZone }) {
  const { player, token } = useAuth();
  const navigate = useNavigate();
  const [atlas, setAtlas] = useState(null);
  const [zones, setZones] = useState([]);
  const [explored, setExplored] = useState(null);
  const [here, setHere] = useState(null); // { dir, heroLevel }
  const [hero, setHero] = useState(null); // posición en casillas del atlas
  const [selected, setSelected] = useState(currentZoneId);
  const [hover, setHover] = useState(null);
  const [zoomI, setZoomI] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewW, setViewW] = useState(640);
  const viewRef = useRef(null);
  const fogRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    fetch(`${ASSETS}/atlas.json`).then((r) => r.json()).then(setAtlas).catch(() => setAtlas(null));
    api.getPlayerZones(player.id, token).then(setZones).catch(() => setZones([]));
    api.getMapa(player.id, token).then((d) => setExplored(d?.zones ?? {})).catch(() => setExplored({}));
    bus.emit('zone-map-data', (d) => setHere({ dir: d.dir, heroLevel: d.heroLevel, explored: d.explored }));
  }, [player, token]);

  // dónde está el héroe (casillas locales de su zona → casillas del atlas)
  const zoneByDir = useMemo(() => Object.fromEntries((atlas?.zonas ?? []).map((z) => [z.dir, z])), [atlas]);
  useEffect(() => {
    if (!atlas || !here) return undefined;
    const tick = () => bus.emit('hero-pos', (p) => {
      const z = zoneByDir[here.dir];
      if (p && z) setHero({ x: z.x + p.x / 32, y: z.y + p.y / 32 });
    });
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [atlas, here, zoneByDir]);

  // ancho del recuadro (para encajar el mapa entero a zoom 1)
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [atlas]);

  const W = atlas?.width ?? 1;
  const H = atlas?.height ?? 1;
  const viewH = Math.round(viewW * 0.72);
  const fit = Math.min(viewW / W, viewH / H);
  const scale = fit * ZOOMS[zoomI]; // píxeles de pantalla por casilla

  // el mapa no se va del recuadro
  const clamp = useCallback((p, s = scale) => {
    const mw = W * s;
    const mh = H * s;
    return {
      x: mw <= viewW ? (viewW - mw) / 2 : Math.min(0, Math.max(viewW - mw, p.x)),
      y: mh <= viewH ? (viewH - mh) / 2 : Math.min(0, Math.max(viewH - mh, p.y)),
    };
  }, [W, H, viewW, viewH, scale]);
  useEffect(() => { setPan((p) => clamp(p)); }, [clamp]);

  // acercar dejando quieto el punto bajo el cursor (o el centro)
  const zoomTo = useCallback((i, cx = viewW / 2, cy = viewH / 2) => {
    const ni = Math.max(0, Math.min(ZOOMS.length - 1, i));
    if (ni === zoomI) return;
    const ns = fit * ZOOMS[ni];
    setPan((p) => {
      const tx = (cx - p.x) / scale;
      const ty = (cy - p.y) / scale;
      return clamp({ x: cx - tx * ns, y: cy - ty * ns }, ns);
    });
    setZoomI(ni);
  }, [zoomI, fit, scale, viewW, viewH, clamp]);
  const centerOn = (tx, ty, i = Math.max(zoomI, 2)) => {
    const ns = fit * ZOOMS[i];
    setZoomI(i);
    setPan(clamp({ x: viewW / 2 - tx * ns, y: viewH / 2 - ty * ns }, ns));
  };

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomTo(zoomI + (e.deltaY < 0 ? 1 : -1), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomI, zoomTo]);

  const onDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, pan, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.moved) setPan(clamp({ x: d.pan.x + dx, y: d.pan.y + dy }));
  };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };
  const clicked = () => !drag.current?.moved;

  // datos de cada zona: lo del atlas (geografía) + lo del servidor (desbloqueo, jefe vencido, niveles)
  const info = useCallback((id) => {
    const a = ATLAS_ZONES[id] ?? {};
    const z = zones.find((q) => String(q.id) === String(id));
    return {
      id, ...a, name: a.name ?? z?.name ?? '…', levels: a.levels ?? z?.levelRange ?? null,
      description: a.description ?? z?.description ?? '', unlocked: id === 'capital' ? true : !!z?.unlocked, bossDefeated: !!z?.bossDefeated,
    };
  }, [zones]);
  const idOf = (z) => (z.zona === 0 ? 'capital' : z.zona);
  const heroLevel = here?.heroLevel ?? 1;
  // lo explorado de una zona: lo guardado en el servidor + lo que recorriste ahora en la zona donde estás
  const bitsOf = useCallback((z, ex) => {
    const bits = b64bits(ex?.cells);
    const live = here?.dir === z.dir ? here.explored?.bits : null;
    if (!live) return bits;
    const out = new Uint8Array(Math.max(bits.length, live.length));
    for (let i = 0; i < out.length; i++) out[i] = (bits[i] ?? 0) | (live[i] ?? 0);
    return out;
  }, [here]);

  // niebla: una casilla por píxel; se tapa lo que no exploraste de cada zona (las bloqueadas, enteras)
  useEffect(() => {
    const cv = fogRef.current;
    if (!cv || !atlas || explored == null) return;
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (const z of atlas.zonas) {
      const inf = info(idOf(z));
      if (z.ciudad && inf.unlocked) continue; // la capital se ve siempre
      const land = b64bits(z.tierra);
      const seen = inf.unlocked ? bitsOf(z, explored[z.dir]) : new Uint8Array(0);
      g.fillStyle = inf.unlocked ? 'rgba(18, 24, 38, 0.74)' : 'rgba(12, 14, 22, 0.9)';
      const cols = Math.ceil(z.w / EXPLORE_CELL);
      const rows = Math.ceil(z.h / EXPLORE_CELL);
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        const bit = 1 << (i & 7);
        // solo la tierra que se puede pisar: el mar y las paredes macizas nunca se recorren
        if (!(land[i >> 3] & bit) || (seen[i >> 3] & bit)) continue;
        g.fillRect(z.x + cx * EXPLORE_CELL, z.y + cy * EXPLORE_CELL, EXPLORE_CELL, EXPLORE_CELL);
      }
    }
  }, [atlas, explored, W, H, info, bitsOf]);

  // las zonas del mundo que todavía no están en el continente (más adelante)
  const lejanas = Object.keys(ATLAS_ZONES).filter((id) => !(atlas?.zonas ?? []).some((z) => String(idOf(z)) === String(id)));
  const sel = info(selected);
  const isHere = (id) => String(id) === String(currentZoneId);
  const pct = (z) => {
    const ex = explored?.[z.dir];
    if (!ex && here?.dir !== z.dir) return null;
    const bits = bitsOf(z, ex);
    const land = b64bits(z.tierra);
    let n = 0;
    let total = 0;
    for (let i = 0; i < land.length * 8; i++) {
      if (!(land[i >> 3] & (1 << (i & 7)))) continue;
      total++;
      if (bits[i >> 3] & (1 << (i & 7))) n++;
    }
    return total ? Math.round((n / total) * 100) : null;
  };
  const selZone = (atlas?.zonas ?? []).find((z) => String(idOf(z)) === String(selected));

  if (!atlas) return <div className="ma-loading">Desplegando el mapa…</div>;
  const s = scale;
  const showDetail = zoomI >= 1;
  return (
    <div className="ma">
      <div
        className="ma-view"
        ref={viewRef}
        style={{ height: viewH }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <div className="ma-world" style={{ width: W * s, height: H * s, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
          <img className="ma-img" src={`${ASSETS}/atlas.png`} alt="" draggable={false} />
          <canvas className="ma-fog" ref={fogRef} />
          <svg className="ma-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {(atlas.rutas ?? []).map((r) => (
              <polyline key={r.nombre} className={`ma-route ma-route--${r.tipo}`} points={r.puntos.map(([x, y]) => `${x},${y}`).join(' ')} />
            ))}
            {atlas.zonas.map((z) => {
              const id = idOf(z);
              const on = String(selected) === String(id) || hover === z.dir;
              return (
                <rect
                  key={z.dir} x={z.x + 0.5} y={z.y + 0.5} width={z.w - 1} height={z.h - 1}
                  className={`ma-zone${on ? ' on' : ''}${info(id).unlocked ? '' : ' locked'}`}
                  onPointerEnter={() => setHover(z.dir)} onPointerLeave={() => setHover(null)}
                  onClick={() => clicked() && setSelected(id)}
                />
              );
            })}
          </svg>
          {/* lugares: ciudades, mazmorras, jefes, muelles, trineos (de las zonas que ya abriste) */}
          {atlas.zonas.filter((z) => info(idOf(z)).unlocked).flatMap((z) => z.lugares.map((l, i) => {
            if (!showDetail && l.tipo !== 'ciudad' && l.tipo !== 'mazmorra') return null;
            const ic = LUGAR_ICON[l.tipo];
            return (
              <span key={`${z.dir}-${i}`} className={`ma-pin ma-pin--${l.tipo}${l.capital ? ' capital' : ''}`} style={{ left: (l.x + 0.5) * s, top: (l.y + 0.5) * s }} title={`${LUGAR_NOMBRE[l.tipo]}: ${l.nombre}${l.nivel ? ` · Nv ${l.nivel}` : ''}`}>
                <GameIcon name={ic[0]} artist={ic[1]} />
                {(l.tipo === 'ciudad' ? zoomI >= 1 || l.capital : zoomI >= 2) && <em>{l.nombre}</em>}
              </span>
            );
          }))}
          {/* nombre y niveles de cada zona */}
          {atlas.zonas.map((z) => {
            const id = idOf(z);
            const inf = info(id);
            const p = pct(z);
            return (
              <button
                type="button" key={z.dir}
                className={`ma-label${inf.unlocked ? '' : ' locked'}${String(selected) === String(id) ? ' on' : ''}`}
                style={{ left: (z.x + z.w / 2) * s, top: (z.y + (z.ciudad ? z.h * 0.12 : z.h / 2)) * s }}
                onClick={() => clicked() && setSelected(id)}
              >
                {!inf.unlocked && <GameIcon name="padlock" artist="lorc" />}
                <b>{inf.name}</b>
                {inf.levels && <small style={{ color: inf.unlocked ? levelColor(inf.levels, heroLevel) : '#9a9a9a' }}>Nv {inf.levels}</small>}
                {inf.unlocked && p != null && showDetail && <i>{p}% explorado</i>}
                {inf.bossDefeated && <span className="ma-crown"><GameIcon name="crown" artist="lorc" /></span>}
              </button>
            );
          })}
          {hero && (
            <span className="ma-hero" style={{ left: hero.x * s, top: hero.y * s }} title="Estás aquí">
              <i />
              <em>Estás aquí</em>
            </span>
          )}
        </div>
        <span className="ma-rose" aria-hidden="true">N<br />▲</span>
        <div className="ma-tools" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => zoomTo(zoomI + 1)} disabled={zoomI >= ZOOMS.length - 1} title="Acercar">+</button>
          <button type="button" onClick={() => zoomTo(zoomI - 1)} disabled={zoomI === 0} title="Alejar">−</button>
          {hero && <button type="button" onClick={() => centerOn(hero.x, hero.y)} title="Centrar en mí"><GameIcon name="position-marker" artist="delapouite" /></button>}
        </div>
      </div>

      <div className="ma-legend">
        {Object.entries(LUGAR_ICON).map(([k, ic]) => <span key={k}><GameIcon name={ic[0]} artist={ic[1]} /> {LUGAR_NOMBRE[k]}</span>)}
        <span><i className="ma-l-route" /> Ruta del barco</span>
        <span><i className="ma-l-fog" /> Sin explorar</span>
      </div>

      <div className="mp-info">
        <div>
          <h3>{sel.name} {sel.levels && <small>Nv {sel.levels}</small>}</h3>
          <p>{sel.description}</p>
          {sel.route && <p className="mp-route"><GameIcon name="direction-signs" artist="delapouite" /> {sel.route}</p>}
          {lejanas.length > 0 && (
            <p className="ma-far">
              Más allá del mapa:{' '}
              {lejanas.map((id, i) => {
                const z = info(id);
                return <button type="button" key={id} className={String(selected) === String(id) ? 'on' : ''} onClick={() => setSelected(id)}>{i ? ' · ' : ''}{z.name}{z.levels ? ` (Nv ${z.levels})` : ''}</button>;
              })}
            </p>
          )}
        </div>
        {isHere(sel.id) ? (
          <button type="button" className="wp-btn wp-btn--gold" onClick={onZone}>Ver la zona</button>
        ) : selZone && sel.unlocked ? (
          <button type="button" className="wp-btn" onClick={() => centerOn(selZone.x + selZone.w / 2, selZone.y + selZone.h / 2, 1)}>Ir en el mapa</button>
        ) : sel.unlocked && !selZone ? (
          <button type="button" className="wp-btn" title="Esta zona todavía no está en el mundo abierto" onClick={() => navigate(`/combat/${sel.id}`)}>Explorar</button>
        ) : (
          <span className="mp-status locked">Bloqueada</span>
        )}
      </div>
    </div>
  );
}
