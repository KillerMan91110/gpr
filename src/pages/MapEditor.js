// Editor de mapas del mundo (estilo RPG Maker): pintar terrenos con bordes automáticos, tiles y
// objetos grandes, marcar el paso casilla por casilla, colocar NPCs/recursos/luces/zonas de combate,
// subzonas y datos de la zona. Guarda directo en public/assets/mundo/<zona>/ a través del servidor
// de desarrollo (src/setupProxy.js): solo funciona con `npm start` en este PC.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadZone, blankZone, fetchTileset, PASO_FORZADO, PASO_CORNISA, TOPLEFT_TYPES } from '../editor/zone';
import { TERRAIN_BRUSHES } from '../editor/rules';
import { Renderer, tileColors, paintMinimap, pointCenter, POINT_STYLE, RESOURCE_FRAMES } from '../editor/render';
import { DIALOGUES } from '../game/dialogues';
import './MapEditor.css';

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const ZOOMS = [0.125, 0.25, 0.375, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const SESSION_KEY = 'editor_sesion_v1';
const POS_KEY = 'mundo_posicion_v2';
const TS = 32;
// ventanas del juego que puede abrir un NPC o punto de interés (pages/World.js)
const WINDOW_IDS = ['inventario', 'personaje', 'habilidades', 'misiones', 'formacion', 'mascotas', 'gremio', 'mercado', 'mapa', 'logros',
  'ranking', 'misiones_gremio', 'enfermeria', 'artesanos', 'taller', 'contratar', 'encantador',
  'crear_gremio', 'unirse_gremio', 'vinculo', 'orden_guerrero', 'orden_mago', 'orden_arquero', 'orden_picaro', 'orden_sacerdote'];
const RESOURCE_TYPES = Object.keys(RESOURCE_FRAMES);
const SEASONS = ['primavera', 'verano', 'otoño', 'invierno'];
const OBJECT_TYPES = [
  { type: 'npc', label: 'NPC', hint: 'Personaje con nombre, sprite, diálogo y ventana' },
  { type: 'poi', label: 'Punto', hint: 'Lugar con el que se interactúa (cartel, fogata, salida)' },
  { type: 'jefe', label: 'Jefe', hint: 'Monstruo jefe que se desafía' },
  { type: 'recurso', label: 'Recurso', hint: 'Hierbas, vetas, cofres… (personal y reaparece)' },
  { type: 'encuentro', label: 'Combates', hint: 'Zona donde rondan monstruos' },
  { type: 'luz', label: 'Luz', hint: 'Farol o fogata que alumbra de noche' },
  { type: 'aspas', label: 'Aspas', hint: 'Aspas de molino girando' },
  { type: 'salida', label: 'Salida', hint: 'Franja que lleva a otra zona al pisarla (destino y casilla de llegada)' },
  { type: 'ciudadano', label: 'Ciudadano', hint: 'Vecino que camina por una ruta, conversa (charla) o se queda quieto' },
  { type: 'ruta', label: 'Ruta', hint: 'Punto de una ruta: mismo nombre = misma ruta, en el orden indicado' },
  { type: 'cartel', label: 'Cartel', hint: 'Cartel colgante con ícono junto a una puerta' },
  { type: 'pilar', label: 'Pilar', hint: 'El Pilar de Aethra (fuente animada y ofrenda)' },
  { type: 'palomas', label: 'Palomas', hint: 'Bandada que sale volando al acercarse' },
  { type: 'gato', label: 'Gato', hint: 'Gato que toma el sol' },
  { type: 'vinculo', label: 'Estatua', hint: 'Estatua del Viajero: vincula la piedra de regreso (solo en ciudades grandes)' },
  { type: 'estandarte', label: 'Estandarte', hint: 'Estandarte del gremio campeón (se tiñe con su color y emblema)' },
  { type: 'buzon', label: 'Buzón', hint: 'Buzón del correo del reino (la banderita se levanta si tienes cartas)' },
  { type: 'secreto', label: 'Secreto', hint: 'Cofre escondido (se abre una vez). El nombre tiene que estar en SECRETS de gprback/lib/exploracion.js' },
  { type: 'escena', label: 'Escenario por fase', hint: 'Objeto que cada jugador ve según su historia (escombros, un puente arreglado…). Ver game/world/escena.js' },
  // mazmorras (ver game/world/cripta.js y gprback/lib/cripta.js: las casillas se repiten allá)
  { type: 'guardian', label: 'Guardián', hint: 'Guardián de mazmorra que patrulla (ruta = casillas "x,y;x,y"; vuelta = da la vuelta en vez de ir y volver). El nombre tiene que estar en GUARDIANES de gprback/lib/cripta.js' },
  { type: 'brasero', label: 'Brasero', hint: 'Brasero de control de la mazmorra (orden 1, 2…): al encenderlo, retomas desde ahí' },
  { type: 'sello', label: 'Puerta sellada', hint: 'Puerta de 4x2 casillas que se abre al vencer a todos los guardianes' },
  { type: 'vigia', label: 'Jefe de mazmorra', hint: 'Jefe de la mazmorra en su estrado' },
];
// objetos que se editan con la lista genérica de propiedades
const GENERIC_PROPS = {
  salida: [['destino', 'string', 'pradera'], ['x', 'int', 0], ['y', 'int', 0], ['etiqueta', 'string', 'Salida']],
  ciudadano: [['sprite', 'string', 'cit_1'], ['ruta', 'string', ''], ['velocidad', 'int', 32], ['horario', 'string', 'siempre'], ['charla', 'string', ''], ['mira', 'string', ''], ['frases', 'string', 'paseante'], ['nombre', 'string', ''], ['rol', 'string', '']],
  ruta: [['orden', 'int', 0]],
  vinculo: [['etiqueta', 'string', 'Estatua del Viajero — Piedra de regreso'], ['ventana', 'string', 'vinculo'], ['vinculo', 'string', 'aurelia']],
  cartel: [['icono', 'string', 'espada']],
  pilar: [['etiqueta', 'string', 'Pilar de Aethra — Ofrenda'], ['ventana', 'string', 'ofrenda']],
  palomas: [],
  gato: [],
  estandarte: [],
  buzon: [['etiqueta', 'string', 'Abrir el buzón'], ['ventana', 'string', 'buzon']],
  guardian: [['monstruo', 'string', 'CRIPTA_CENTINELA'], ['ruta', 'string', '5,25;34,25'], ['vuelta', 'bool', false]],
  brasero: [['orden', 'int', 1], ['etiqueta', 'string', 'Brasero']],
  sello: [],
  escena: [['sprite', 'string', ''], ['fase', 'string', ''], ['ancho', 'int', 32], ['alto', 'int', 32], ['cuadros', 'int', 1], ['solido', 'bool', false], ['encima', 'bool', false]],
  vigia: [['monstruo', 'string', 'CRIPTA_VIGIA'], ['etiqueta', 'string', 'El Vigía Caído']],
};
const PASO_TOOLS = [
  { id: 'auto', label: 'Auto', icon: '◌', hint: 'Lo que diga el tile (borra lo forzado)' },
  { id: 'libre', label: 'Libre', icon: '○', hint: 'Se pasa siempre, aunque el tile choque' },
  { id: 'bloq', label: 'Bloqueado', icon: '✕', hint: 'No se pasa nunca' },
  { id: 'bordes', label: 'Bordes', icon: '▣', hint: 'Clic cerca de un borde para cerrarlo/abrirlo (barandas, pasillos)' },
  { id: 'cornisa', label: 'Cornisa', icon: '▼', hint: 'Se baja hacia el sur pero no se sube' },
];
const PASO_VALUE = { auto: 0, libre: PASO_FORZADO, bloq: PASO_FORZADO | 15, cornisa: PASO_CORNISA };
const MAP_TOOLS = [
  { id: 'lapiz', label: 'Lápiz', key: 'B', icon: '✎' },
  { id: 'rect', label: 'Rectángulo', key: 'R', icon: '▭' },
  { id: 'balde', label: 'Balde', key: 'F', icon: '⛁' },
  { id: 'goma', label: 'Goma', key: 'E', icon: '⌫' },
  { id: 'gotero', label: 'Cuentagotas', key: 'I', icon: '⊙' },
  { id: 'seleccion', label: 'Seleccionar', key: 'M', icon: '⬚' },
];

const getProp = (o, name) => o?.properties?.find((p) => p.name === name)?.value;
const withProp = (o, name, type, value) => {
  const rest = (o.properties ?? []).filter((p) => p.name !== name);
  return value === '' || value == null || Number.isNaN(value) ? rest : [...rest, { name, type, value }];
};
const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? {}; } catch { return {}; } };

// casillas de una línea entre dos casillas (para que un trazo rápido no deje huecos)
function lineCells(a, b) {
  const out = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 4000; guard++) {
    out.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    // un paso a la vez (nunca en diagonal): los bordes automáticos solo unen vecinos de lado
    if (e2 - dy > dx - e2) { err += dy; x += sx; } else { err += dx; y += sy; }
  }
  return out;
}
const normRect = (a, b) => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });

// --------------------------------------------------------------------------- piezas pequeñas
function TileIcon({ img, gid, columns, size = 32 }) {
  if (!img || !gid) return <span className="me-tileicon" style={{ width: size, height: size }} />;
  const s = gid - 1;
  const k = size / TS;
  return (
    <span
      className="me-tileicon"
      style={{
        width: size, height: size, backgroundImage: `url(${img.src})`,
        backgroundPosition: `-${(s % columns) * TS * k}px -${Math.floor(s / columns) * TS * k}px`,
        backgroundSize: `${img.width * k}px ${img.height * k}px`,
      }}
    />
  );
}

function StampThumb({ img, stamp, columns, max = 64 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !img) return;
    const k = Math.min(1, max / (Math.max(stamp.w, stamp.h) * TS));
    cv.width = stamp.w * TS * k;
    cv.height = stamp.h * TS * k;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    stamp.gids.forEach((gid, i) => {
      if (!gid) return;
      const s = gid - 1;
      g.drawImage(img, (s % columns) * TS, Math.floor(s / columns) * TS, TS, TS, (i % stamp.w) * TS * k, Math.floor(i / stamp.w) * TS * k, TS * k, TS * k);
    });
  }, [img, stamp, columns, max]);
  return <canvas ref={ref} className="me-stampthumb" />;
}

// paleta del tileset: arrastrar selecciona un sello de varios tiles; en modo "flags" se ve y cambia
// el choque (○/✕) y si va por encima del héroe (☆) de cada tile, como la base de datos de RPG Maker
function TilePalette({ img, rules, value, onPick, flagsMode, onToggleFlag, version }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const cols = rules.columns;
  const rows = Math.ceil(rules.count / cols);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !img) return;
    cv.width = cols * TS;
    cv.height = rows * TS;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#20242e';
    g.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if ((x + y) % 2) { g.fillStyle = '#272c38'; g.fillRect(x * TS, y * TS, TS, TS); }
    g.drawImage(img, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x <= cols; x += 1) { g.beginPath(); g.moveTo(x * TS + 0.5, 0); g.lineTo(x * TS + 0.5, cv.height); g.stroke(); }
    for (let y = 0; y <= rows; y += 1) { g.beginPath(); g.moveTo(0, y * TS + 0.5); g.lineTo(cv.width, y * TS + 0.5); g.stroke(); }
    if (flagsMode) {
      g.font = 'bold 15px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = 0; i < rules.count; i += 1) {
        const f = rules.flags[i + 1] ?? {};
        const x = (i % cols) * TS;
        const y = Math.floor(i / cols) * TS;
        g.fillStyle = f.colision ? 'rgba(160,20,20,0.45)' : 'rgba(10,60,30,0.35)';
        g.fillRect(x, y, TS, TS);
        g.lineWidth = 3;
        g.strokeStyle = '#000';
        g.strokeText(f.colision ? '✕' : '○', x + 16, y + 16);
        g.fillStyle = f.colision ? '#ff9a9a' : '#9dffbf';
        g.fillText(f.colision ? '✕' : '○', x + 16, y + 16);
        if (f.encima) { g.font = 'bold 11px sans-serif'; g.fillStyle = '#ffe066'; g.fillText('☆', x + 25, y + 8); g.font = 'bold 15px sans-serif'; }
      }
    } else if (value) {
      g.strokeStyle = '#ffe066';
      g.lineWidth = 2;
      g.strokeRect(value.x * TS + 1, value.y * TS + 1, value.w * TS - 2, value.h * TS - 2);
    }
  }, [img, rules, cols, rows, value, flagsMode, version]);
  const cellOf = (e) => {
    const r = ref.current.getBoundingClientRect();
    const k = ref.current.width / r.width;
    return { x: Math.max(0, Math.min(cols - 1, Math.floor(((e.clientX - r.left) * k) / TS))), y: Math.max(0, Math.min(rows - 1, Math.floor(((e.clientY - r.top) * k) / TS))) };
  };
  const emit = (a, b) => {
    const x0 = Math.min(a.x, b.x); const y0 = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x) + 1; const h = Math.abs(a.y - b.y) + 1;
    const gids = [];
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const id = (y0 + y) * cols + x0 + x; gids.push(id < rules.count ? id + 1 : 0); }
    onPick({ x: x0, y: y0, w, h, gids });
  };
  return (
    <canvas
      ref={ref}
      className="me-palette"
      onMouseDown={(e) => {
        const c = cellOf(e);
        if (flagsMode) { onToggleFlag(c.y * cols + c.x + 1, e.shiftKey ? 'encima' : 'colision'); return; }
        drag.current = c; emit(c, c);
      }}
      onMouseMove={(e) => { if (drag.current && !flagsMode) emit(drag.current, cellOf(e)); }}
      onMouseUp={() => { drag.current = null; }}
      onMouseLeave={() => { drag.current = null; }}
    />
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="me-field" title={hint}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// --------------------------------------------------------------------------- editor
export default function MapEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const miniRef = useRef(null);
  const statusRef = useRef(null);
  const miniViewRef = useRef(null);
  const renderer = useRef(null);
  const zoneRef = useRef(null);
  const colorsRef = useRef(null);
  const imagesRef = useRef({ npc: {} });
  const clipRef = useRef(null);
  const drag = useRef(null);
  const spaceDown = useRef(false);
  const restored = useRef(false);

  const session = useMemo(readSession, []);
  const [zones, setZones] = useState([]);
  const [dir, setDir] = useState(session.dir || 'pradera');
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [loading, setLoading] = useState('Cargando editor…');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(session.mode || 'mapa');
  const [mapTab, setMapTab] = useState(session.mapTab || 'terrenos');
  const [tool, setTool] = useState(session.tool || 'lapiz');
  const [brush, setBrush] = useState(session.brush || { kind: 'terrain', id: 'camino' });
  const [layer, setLayer] = useState(session.layer || 'auto');
  const [size, setSize] = useState(session.size || 1);
  const [pasoTool, setPasoTool] = useState(session.pasoTool || 'bloq');
  const [pasoTab, setPasoTab] = useState('casillas');
  const [selected, setSelected] = useState(null);
  const [selSub, setSelSub] = useState(null);
  const [addType, setAddType] = useState(null);
  const [opts, setOpts] = useState(session.opts || { grid: true, encima: true, encimaAlpha: 1, puntos: true, subzonas: false, chunks: true });
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [selection, setSelection] = useState(null);
  const [pasting, setPasting] = useState(false);
  const [help, setHelp] = useState(false);
  const [sprites, setSprites] = useState([]);
  const [monsters, setMonsters] = useState({});
  const [tilesImg, setTilesImg] = useState(null);
  const [zoom, setZoomState] = useState(1);
  const [filter, setFilter] = useState('');
  const [ajustes, setAjustes] = useState(null);
  const [flagsVer, setFlagsVer] = useState(0);
  const [newZone, setNewZone] = useState({ dir: '', nombre: '', zona: 2, columns: 3, rows: 3 });

  // estado actual para los manejadores de ratón/teclado
  const st = useRef({});
  st.current = { mode, tool, brush, layer, size, pasoTool, selected, selSub, addType, picking, selection, pasting, opts, dir, mapTab };

  const zone = zoneRef.current;
  const rules = zone?.rules;

  const say = useCallback((text, kind = 'ok') => {
    setToast({ text, kind, key: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.kind === 'error' ? 7000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ------------------------------------------------------------------ sesión (sobrevive a la recarga al guardar)
  const persist = useCallback((withHistory = true) => {
    const z = zoneRef.current;
    const r = renderer.current;
    const s = st.current;
    if (!z || !r) return; // todavía no hay nada cargado (React monta dos veces en desarrollo)
    const data = {
      dir: s.dir, mode: s.mode, mapTab: s.mapTab, tool: s.tool, brush: s.brush?.kind === 'clip' ? null : s.brush, layer: s.layer, size: s.size,
      pasoTool: s.pasoTool, opts: s.opts, view: r ? { ...r.view } : null,
      history: withHistory ? { dir: z.dir, undo: z.undoStack, redo: z.redoStack } : null,
    };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, history: null })); } catch { /* sin espacio */ }
    }
  }, []);

  // lienzo
  useEffect(() => {
    const cv = canvasRef.current;
    renderer.current = new Renderer(cv, imagesRef.current);
    const r = renderer.current;
    const ro = new ResizeObserver(() => r.resize());
    ro.observe(cv);
    // recuadro de lo que se ve, encima del minimapa
    r.onAfterDraw = () => {
      const z = zoneRef.current;
      const el = miniViewRef.current;
      if (!z || !el) return;
      const { w, h } = r.size;
      Object.assign(el.style, {
        left: `${(r.view.x / (z.W * TS)) * 100}%`, top: `${(r.view.y / (z.H * TS)) * 100}%`,
        width: `${(w / r.view.zoom / (z.W * TS)) * 100}%`, height: `${(h / r.view.zoom / (z.H * TS)) * 100}%`,
      });
    };
    r.resize();
    // para inspeccionar desde la consola
    if (process.env.NODE_ENV === 'development') window.etheriaEditor = { zone: () => zoneRef.current, renderer: r };
    return () => ro.disconnect();
  }, []);

  // ------------------------------------------------------------------ carga
  useEffect(() => {
    fetch('/__editor/zonas').then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(setZones).catch(() => setError('El editor necesita el servidor de desarrollo (npm start) en este PC.'));
    fetch('/__editor/sprites').then((r) => r.json()).then(setSprites).catch(() => {});
    fetch(`${ASSETS}/sprites/combate/enemigos.json`).then((r) => r.json()).then((d) => setMonsters(d.monsters ?? {})).catch(() => {});
  }, []);

  const centerOn = useCallback((wx, wy) => {
    const r = renderer.current;
    if (!r) return;
    const { w, h } = r.size;
    r.view.x = wx - w / (2 * r.view.zoom);
    r.view.y = wy - h / (2 * r.view.zoom);
    r.request();
  }, []);

  const repaintMini = useCallback((bbox) => {
    const z = zoneRef.current;
    if (z && colorsRef.current && miniRef.current) paintMinimap(miniRef.current, z, colorsRef.current, bbox);
  }, []);

  useEffect(() => {
    if (!dir) return undefined;
    let cancelled = false;
    let off = null;
    setLoading('Cargando zona…');
    (async () => {
      try {
        const z = zoneRef.current?.dir === dir && zoneRef.current.isNew ? zoneRef.current : await loadZone(dir);
        if (cancelled) return;
        const v = Date.now();
        const imgs = imagesRef.current;
        const [tiles, recursos, recursos2, recursos3, recursos4, recursos5, recursos6, recursos7, recursos8, aspas] = await Promise.all([
          loadImage(`${ASSETS}/mundo/tileset_${z.tilesetName}.png?v=${v}`),
          imgs.recursos ?? loadImage(`${ASSETS}/mundo/recursos.png`),
          imgs.recursos2 ?? loadImage(`${ASSETS}/mundo/recursos2.png`),
          imgs.recursos3 ?? loadImage(`${ASSETS}/mundo/recursos3.png`),
          imgs.recursos4 ?? loadImage(`${ASSETS}/mundo/recursos4.png`),
          imgs.recursos5 ?? loadImage(`${ASSETS}/mundo/recursos5.png`),
          imgs.recursos6 ?? loadImage(`${ASSETS}/mundo/recursos6.png`),
          imgs.recursos7 ?? loadImage(`${ASSETS}/mundo/recursos7.png`),
          imgs.recursos8 ?? loadImage(`${ASSETS}/mundo/recursos8.png`),
          imgs.aspas ?? loadImage(`${ASSETS}/mundo/aspas.png`),
        ]);
        if (cancelled) return;
        Object.assign(imgs, { tiles, recursos, recursos2, recursos3, recursos4, recursos5, recursos6, recursos7, recursos8, aspas });
        // historial de antes de la recarga (guardar recarga la página en desarrollo)
        if (!restored.current) {
          restored.current = true;
          const s = readSession();
          if (s.history?.dir === dir) { z.undoStack = s.history.undo ?? []; z.redoStack = s.history.redo ?? []; }
        }
        zoneRef.current = z;
        setTilesImg(tiles);
        colorsRef.current = tileColors(tiles, z.rules.count, z.rules.columns);
        const r = renderer.current;
        r.images = imgs;
        r.setZone(z);
        off = z.onChange((ch) => {
          if (ch.cells) { r.invalidate(ch.bbox); repaintMini(ch.bbox); }
          r.request();
          bump();
        });
        repaintMini(null);
        const sv = readSession().view;
        if (sv && readSession().dir === dir) { r.view = { ...sv }; setZoomState(sv.zoom); r.request(); }
        else {
          const spawn = z.puntos.find((p) => p.type === 'spawn');
          r.view.zoom = 1;
          setZoomState(1);
          centerOn(spawn ? spawn.x + 16 : (z.W * TS) / 2, spawn ? spawn.y + 16 : (z.H * TS) / 2);
        }
        setSelected(null);
        setSelSub(null);
        setAjustes(null);
        setLoading(null);
        bump();
      } catch (err) {
        if (!cancelled) { setLoading(null); setError(`No se pudo cargar la zona "${dir}": ${err.message}`); }
      }
    })();
    return () => { cancelled = true; off?.(); };
  }, [dir, bump, centerOn, repaintMini]);

  // hojas de los NPCs (para verlos en el mapa)
  useEffect(() => {
    sprites.forEach((s) => {
      if (imagesRef.current.npc[s]) return;
      loadImage(`${ASSETS}/mundo/caminar/${s}.png`).then((img) => {
        if (img) { imagesRef.current.npc[s] = img; renderer.current?.request(); }
      });
    });
  }, [sprites]);

  useEffect(() => {
    const r = renderer.current;
    if (!r) return;
    r.opts = { ...opts, paso: mode === 'paso', subzonas: opts.subzonas || mode === 'zona' || selSub != null };
    r.overlay.selected = selected;
    r.overlay.subzone = selSub;
    r.request();
  }, [opts, mode, selected, selSub]);

  // avisar antes de salir con cambios sin guardar
  useEffect(() => {
    const onUnload = (e) => {
      persist(true);
      if (zoneRef.current?.dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('beforeunload', onUnload); persist(true); };
  }, [persist]);

  // ------------------------------------------------------------------ zoom y vista
  const setZoom = useCallback((next, sx, sy) => {
    const r = renderer.current;
    if (!r) return;
    const z = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], next));
    const { w, h } = r.size;
    const ax = sx ?? w / 2;
    const ay = sy ?? h / 2;
    const before = r.toWorld(ax, ay);
    r.view.zoom = z;
    r.view.x = before.x - ax / z;
    r.view.y = before.y - ay / z;
    setZoomState(z);
    r.request();
  }, []);
  const zoomStep = useCallback((dirStep, sx, sy) => {
    const cur = renderer.current?.view.zoom ?? 1;
    const i = ZOOMS.findIndex((z) => z >= cur - 1e-6);
    const j = Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + dirStep));
    setZoom(ZOOMS[j], sx, sy);
  }, [setZoom]);

  useEffect(() => {
    const cv = canvasRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomStep(e.deltaY < 0 ? 1 : -1, e.clientX - rect.left, e.clientY - rect.top);
    };
    cv.addEventListener('wheel', onWheel, { passive: false });
    return () => cv.removeEventListener('wheel', onWheel);
  }, [zoomStep]);

  // ------------------------------------------------------------------ pintar
  const cellAt = (e) => {
    const r = renderer.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = r.toWorld(sx, sy);
    return { wx: w.x, wy: w.y, x: Math.floor(w.x / TS), y: Math.floor(w.y / TS), sx, sy };
  };

  const stampOf = (b) => (b?.kind === 'stamp' ? b : null);
  const layerFor = (gid) => (st.current.layer === 'auto' ? zoneRef.current.rules.layerOf(gid) : st.current.layer);
  const brushCells = (c) => {
    const n = st.current.size;
    const o = Math.floor((n - 1) / 2);
    const out = [];
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) out.push([c.x - o + x, c.y - o + y]);
    return out;
  };

  const refreshAround = (box, pad = 4) => {
    if (!box) return;
    const b = { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad };
    renderer.current.invalidate(b);
    repaintMini(b);
    renderer.current.request();
  };

  const placeStamp = (s, ax, ay) => {
    const z = zoneRef.current;
    s.gids.forEach((gid, i) => { if (gid) z.paintTile(layerFor(gid), ax + (i % s.w), ay + Math.floor(i / s.w), gid); });
  };

  const paintLine = (from, to) => {
    const z = zoneRef.current;
    const s = st.current;
    const pts = lineCells(from, to);
    if (s.brush.kind === 'terrain') {
      const cells = [];
      pts.forEach((p) => cells.push(...brushCells(p)));
      z.paintTerrain(cells, s.brush.id);
    } else if (stampOf(s.brush)) {
      const b = s.brush;
      const d = drag.current;
      for (const p of pts) {
        const ax = d.origin.x + Math.floor((p.x - d.origin.x) / b.w) * b.w;
        const ay = d.origin.y + Math.floor((p.y - d.origin.y) / b.h) * b.h;
        const k = `${ax},${ay}`;
        if (d.done.has(k)) continue;
        d.done.add(k);
        placeStamp(b, ax, ay);
      }
    }
    refreshAround(z.tx?.bbox);
  };

  const eraseLine = (from, to) => {
    const z = zoneRef.current;
    for (const p of lineCells(from, to)) for (const [x, y] of brushCells(p)) z.erase(x, y, st.current.layer);
    refreshAround(z.tx?.bbox);
  };

  const fillRect = (rect) => {
    const z = zoneRef.current;
    const b = st.current.brush;
    if (b.kind === 'terrain') {
      const cells = [];
      for (let y = rect.y0; y <= rect.y1; y += 1) for (let x = rect.x0; x <= rect.x1; x += 1) cells.push([x, y]);
      z.paintTerrain(cells, b.id);
    } else if (stampOf(b)) {
      for (let y = rect.y0; y <= rect.y1; y += 1) {
        for (let x = rect.x0; x <= rect.x1; x += 1) {
          const gid = b.gids[((y - rect.y0) % b.h) * b.w + ((x - rect.x0) % b.w)];
          if (gid) z.paintTile(layerFor(gid), x, y, gid);
        }
      }
    }
    z.commit();
  };

  const bucket = (c) => {
    const z = zoneRef.current;
    const b = st.current.brush;
    if (b.kind === 'terrain') {
      const cells = z.floodCells('terreno', c.x, c.y);
      z.paintTerrain(cells, b.id);
    } else if (stampOf(b)) {
      const first = b.gids.find(Boolean);
      if (!first) return;
      const L = layerFor(first);
      for (const [x, y] of z.floodCells(L, c.x, c.y)) {
        const gid = b.gids[(((y - c.y) % b.h) + b.h) % b.h * b.w + ((((x - c.x) % b.w) + b.w) % b.w)];
        if (gid) z.paintTile(L, x, y, gid);
      }
    }
    if (z.commit()) say('Relleno hecho');
  };

  const pick = (c, terrain) => {
    const z = zoneRef.current;
    if (!z.inside(c.x, c.y)) return;
    if (terrain || st.current.mapTab === 'terrenos') {
      const t = z.tAt(c.x, c.y);
      if (TERRAIN_BRUSHES.some((b) => b.id === t)) { setBrush({ kind: 'terrain', id: t }); setMapTab('terrenos'); }
      return;
    }
    const gid = z.get('encima', c.x, c.y) || z.get('objetos', c.x, c.y) || z.get('suelo', c.x, c.y);
    if (!gid) return;
    const cols = z.rules.columns;
    setBrush({ kind: 'stamp', w: 1, h: 1, gids: [gid], x: (gid - 1) % cols, y: Math.floor((gid - 1) / cols) });
    if (st.current.mapTab === 'terrenos') setMapTab('tiles');
    if (st.current.tool === 'gotero') setTool('lapiz');
  };

  const edgeAt = (c) => {
    const fx = c.wx / TS - c.x;
    const fy = c.wy / TS - c.y;
    const d = [[fy, 1], [1 - fx, 2], [1 - fy, 4], [fx, 8]].sort((a, b) => a[0] - b[0]);
    return d[0][1];
  };

  const toggleEdge = (c) => {
    const z = zoneRef.current;
    if (!z.inside(c.x, c.y)) return;
    const cur = z.get('paso', c.x, c.y);
    const base = cur & PASO_FORZADO ? cur : PASO_FORZADO;
    z.setPaso(c.x, c.y, base ^ edgeAt(c));
    z.commit();
  };

  const snapPoint = (type, wx, wy) => {
    if (TOPLEFT_TYPES.has(type) || type === 'encuentro' || type === 'salida') return { x: Math.floor(wx / TS) * TS, y: Math.floor(wy / TS) * TS };
    return { x: Math.floor(wx / TS) * TS + 16, y: Math.floor(wy / TS) * TS + 16 };
  };

  const newObject = (type, c) => {
    const z = zoneRef.current;
    const pos = snapPoint(type, c.wx, c.wy);
    const count = (t) => z.puntos.filter((p) => p.type === t).length + 1;
    const prop = (name, ptype, value) => ({ name, type: ptype, value });
    const base = { type, ...pos, width: 0, height: 0 };
    switch (type) {
      case 'npc': return { ...base, name: `npc_${count('npc')}`, properties: [prop('nombre', 'string', 'Nuevo, aldeano'), prop('sprite', 'string', sprites.find((s) => s.startsWith('npc_')) ?? 'npc_ren'), prop('etiqueta', 'string', 'Hablar')] };
      case 'poi': return { ...base, name: `punto_${count('poi')}`, properties: [prop('etiqueta', 'string', 'Punto de interés')] };
      case 'jefe': return { ...base, name: `jefe_${count('jefe')}`, properties: [prop('monstruo', 'string', 'LOBO_FEROZ'), prop('nivel', 'int', 10), prop('etiqueta', 'string', 'Desafiar al jefe')] };
      case 'recurso': return { ...base, name: `hierba_${count('recurso')}`, properties: [prop('tipo', 'string', 'hierba')] };
      case 'luz': return { ...base, name: `luz_${count('luz')}`, properties: [prop('tipo', 'string', 'farol')] };
      case 'encuentro': return { ...base, name: 'Zona de combate', width: 8 * TS, height: 6 * TS, properties: [prop('monstruos', 'string', 'LOBO_PRADERA'), prop('cantidad', 'int', 3)] };
      case 'aspas': return { ...base, name: 'aspas' };
      case 'salida': return { ...base, name: `salida_${count('salida')}`, width: 4 * TS, height: TS, properties: GENERIC_PROPS.salida.map(([n, t, v]) => prop(n, t, v)) };
      case 'ruta': return { ...base, name: 'ruta_nueva', properties: [prop('orden', 'int', z.puntos.filter((p) => p.type === 'ruta' && p.name === 'ruta_nueva').length)] };
      case 'ciudadano': return { ...base, name: `ciudadano_${count('ciudadano')}`, properties: [prop('sprite', 'string', 'cit_1'), prop('frases', 'string', 'paseante')] };
      case 'cartel': return { ...base, name: `cartel_${count('cartel')}`, properties: [prop('icono', 'string', 'espada')] };
      case 'pilar': return { ...base, name: 'pilar', properties: GENERIC_PROPS.pilar.map(([n, t, v]) => prop(n, t, v)) };
      case 'palomas': return { ...base, name: `palomas_${count('palomas')}` };
      case 'gato': return { ...base, name: `gato_${count('gato')}` };
      case 'vinculo': return { ...base, name: `estatua_${count('vinculo')}`, properties: GENERIC_PROPS.vinculo.map(([n, t, v]) => prop(n, t, v)) };
      case 'estandarte': return { ...base, name: `estandarte_${count('estandarte')}` };
      case 'secreto': return { ...base, name: `secreto_${count('secreto')}` };
      case 'guardian': case 'brasero': case 'vigia': return { ...base, name: `${type}_${count(type)}`, properties: GENERIC_PROPS[type].map(([n, t, v]) => prop(n, t, v)) };
      case 'sello': return { ...base, name: `puerta_${count('sello')}`, width: 4 * TS, height: 2 * TS };
      case 'buzon': return { ...base, name: `buzon_${count('buzon')}`, properties: GENERIC_PROPS.buzon.map(([n, t, v]) => prop(n, t, v)) };
      default: return base;
    }
  };

  // punto o zona de combate bajo el ratón (los puntos ganan a los rectángulos)
  const hitObject = (c) => {
    const z = zoneRef.current;
    const r = renderer.current;
    const zoomK = r.view.zoom;
    let rectHit = null;
    for (let i = z.puntos.length - 1; i >= 0; i -= 1) {
      const p = z.puntos[i];
      if (p.type === 'encuentro' || p.type === 'salida') {
        const nearCorner = Math.abs(c.wx - (p.x + p.width)) * zoomK < 10 && Math.abs(c.wy - (p.y + p.height)) * zoomK < 10;
        if (nearCorner && st.current.selected === p.uid) return { p, resize: true };
        if (!rectHit && c.wx >= p.x && c.wy >= p.y && c.wx < p.x + p.width && c.wy < p.y + p.height) rectHit = { p };
        continue;
      }
      const ctr = pointCenter(p);
      if (Math.hypot(ctr.x - c.wx, ctr.y - c.wy) * zoomK < Math.max(12, 14 * Math.min(zoomK, 1.5))) return { p };
    }
    return rectHit;
  };


  const onMouseDown = (e) => {
    const z = zoneRef.current;
    const r = renderer.current;
    if (!z || !r) return;
    const c = cellAt(e);
    if (e.button === 1 || (e.button === 0 && spaceDown.current)) {
      e.preventDefault();
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: r.view.x, vy: r.view.y };
      return;
    }
    const s = st.current;
    if (s.picking) { if (e.button === 0) testHere(c); else setPicking(false); return; }
    if (s.mode === 'mapa') {
      if (e.button === 2) { pick(c, e.shiftKey); return; }
      if (e.button !== 0) return;
      if (s.pasting && clipRef.current) { z.pasteRegion(clipRef.current, c.x, c.y); refreshAround({ x0: c.x, y0: c.y, x1: c.x + clipRef.current.w, y1: c.y + clipRef.current.h }); return; }
      switch (s.tool) {
        case 'lapiz': drag.current = { kind: 'paint', last: c, origin: c, done: new Set() }; paintLine(c, c); break;
        case 'goma': drag.current = { kind: 'erase', last: c }; eraseLine(c, c); break;
        case 'rect': drag.current = { kind: 'rect', from: c }; r.overlay.rect = normRect(c, c); r.overlay.rectColor = null; r.request(); break;
        case 'balde': bucket(c); break;
        case 'gotero': pick(c, e.shiftKey); break;
        case 'seleccion': drag.current = { kind: 'select', from: c }; setSelection(null); r.overlay.rect = normRect(c, c); r.overlay.rectColor = '#6fc3ff'; r.request(); break;
        default: break;
      }
      return;
    }
    if (s.mode === 'paso') {
      if (pasoTab === 'tiles') return;
      if (e.button === 2) { drag.current = { kind: 'paso', last: c, value: 0 }; z.setPaso(c.x, c.y, 0); refreshAround({ x0: c.x, y0: c.y, x1: c.x, y1: c.y }, 1); return; }
      if (e.button !== 0) return;
      if (s.pasoTool === 'bordes') { toggleEdge(c); return; }
      drag.current = { kind: 'paso', last: c, value: PASO_VALUE[s.pasoTool] };
      z.setPaso(c.x, c.y, PASO_VALUE[s.pasoTool]);
      r.request();
      return;
    }
    if (s.mode === 'objetos' || s.mode === 'zona') {
      if (e.button !== 0) return;
      if (s.mode === 'objetos' && s.addType) {
        if (s.addType === 'spawn') return;
        const p = z.addPoint(newObject(s.addType, c));
        setSelected(p.uid);
        if (!e.shiftKey) setAddType(null);
        return;
      }
      // subzona elegida en la lista: se mueve arrastrando o se cambia de tamaño desde la esquina
      if (s.selSub != null) {
        const sz = z.subzonas.find((q) => q.uid === s.selSub);
        if (sz) {
          const k = r.view.zoom;
          if (Math.abs(c.wx - sz.x1) * k < 10 && Math.abs(c.wy - sz.y1) * k < 10) {
            drag.current = { kind: 'subresize', sz, before: z.objectsSnapshot() };
            return;
          }
          if (s.mode === 'zona' && c.wx >= sz.x0 && c.wy >= sz.y0 && c.wx < sz.x1 && c.wy < sz.y1) {
            drag.current = { kind: 'submove', sz, start: c, orig: { ...sz }, before: z.objectsSnapshot() };
            return;
          }
        }
      }
      if (s.mode !== 'objetos') return;
      const hit = hitObject(c);
      if (!hit) { setSelected(null); return; }
      setSelected(hit.p.uid);
      drag.current = { kind: hit.resize ? 'resize' : 'move', p: hit.p, start: c, orig: { x: hit.p.x, y: hit.p.y }, before: z.objectsSnapshot() };
    }
  };

  const updateStatus = (c) => {
    const z = zoneRef.current;
    const el = statusRef.current;
    if (!z || !el) return;
    if (!z.inside(c.x, c.y)) { el.textContent = 'Fuera del mapa'; return; }
    const n = (l) => z.rules.names[z.get(l, c.x, c.y)] ?? '—';
    const p = z.get('paso', c.x, c.y);
    const paso = p & PASO_CORNISA ? 'cornisa' : p & PASO_FORZADO ? ((p & 15) === 15 ? 'bloqueado (forzado)' : (p & 15) ? 'bordes cerrados' : 'libre (forzado)') : (z.blocked(c.x, c.y) ? 'bloqueado' : 'libre');
    const sub = z.subzonas.find((s) => c.wx >= s.x0 && c.wy >= s.y0 && c.wx < s.x1 && c.wy < s.y1);
    el.textContent = `Casilla ${c.x},${c.y} · trozo ${Math.floor(c.x / z.cw)},${Math.floor(c.y / z.ch)} · terreno: ${z.tAt(c.x, c.y)} · suelo: ${n('suelo')} · objeto: ${n('objetos')} · encima: ${n('encima')} · paso: ${paso}${sub ? ` · ${sub.name}` : ''}`;
  };

  const onMouseMove = (e) => {
    const z = zoneRef.current;
    const r = renderer.current;
    if (!z || !r) return;
    const d = drag.current;
    if (d?.kind === 'pan') {
      r.view.x = d.vx - (e.clientX - d.sx) / r.view.zoom;
      r.view.y = d.vy - (e.clientY - d.sy) / r.view.zoom;
      r.request();
      return;
    }
    const c = cellAt(e);
    const s = st.current;
    updateStatus(c);
    // cursor y vista previa
    const o = r.overlay;
    o.edge = null;
    o.stamp = null;
    if (s.mode === 'mapa' && s.pasting && clipRef.current) {
      const clip = clipRef.current;
      o.cursor = { x: c.x, y: c.y, w: clip.w, h: clip.h };
      o.stamp = { w: clip.w, h: clip.h, layersAt: (x, y) => { const k = y * clip.w + x; return [clip.suelo[k], clip.objetos[k], clip.encima[k]]; } };
    } else if (s.mode === 'mapa' && stampOf(s.brush) && (s.tool === 'lapiz')) {
      const b = s.brush;
      o.cursor = { x: c.x, y: c.y, w: b.w, h: b.h };
      o.stamp = { w: b.w, h: b.h, layersAt: (x, y) => [b.gids[y * b.w + x]] };
    } else if (s.mode === 'mapa' && (s.tool === 'lapiz' || s.tool === 'goma')) {
      const n = s.size;
      const off = Math.floor((n - 1) / 2);
      o.cursor = { x: c.x - off, y: c.y - off, w: n, h: n };
    } else if (s.mode === 'objetos' || s.mode === 'zona') {
      o.cursor = s.addType ? { x: c.x, y: c.y } : null;
    } else {
      o.cursor = { x: c.x, y: c.y };
      if (s.mode === 'paso' && s.pasoTool === 'bordes') o.edge = edgeAt(c);
    }
    if (s.picking) o.cursor = { x: c.x, y: c.y };
    if (d) {
      if (d.kind === 'paint' && (c.x !== d.last.x || c.y !== d.last.y)) { paintLine(d.last, c); d.last = c; }
      else if (d.kind === 'erase' && (c.x !== d.last.x || c.y !== d.last.y)) { eraseLine(d.last, c); d.last = c; }
      else if (d.kind === 'rect' || d.kind === 'select') o.rect = normRect(d.from, c);
      else if (d.kind === 'paso' && (c.x !== d.last.x || c.y !== d.last.y)) {
        for (const p of lineCells(d.last, c)) z.setPaso(p.x, p.y, d.value);
        d.last = c;
      } else if (d.kind === 'move') {
        const free = e.altKey;
        const nx = d.orig.x + (c.wx - d.start.wx);
        const ny = d.orig.y + (c.wy - d.start.wy);
        if (free) { d.p.x = Math.round(nx); d.p.y = Math.round(ny); }
        else if (TOPLEFT_TYPES.has(d.p.type) || d.p.type === 'encuentro' || d.p.type === 'salida') { d.p.x = Math.round(nx / TS) * TS; d.p.y = Math.round(ny / TS) * TS; }
        else { const sp = snapPoint(d.p.type, nx, ny); d.p.x = sp.x; d.p.y = sp.y; }
      } else if (d.kind === 'resize') {
        d.p.width = Math.max(2 * TS, Math.round((c.wx - d.p.x) / TS) * TS);
        d.p.height = Math.max(2 * TS, Math.round((c.wy - d.p.y) / TS) * TS);
      } else if (d.kind === 'subresize') {
        d.sz.x1 = Math.max(d.sz.x0 + 2 * TS, Math.round(c.wx / TS) * TS);
        d.sz.y1 = Math.max(d.sz.y0 + 2 * TS, Math.round(c.wy / TS) * TS);
      } else if (d.kind === 'submove') {
        const dx = Math.round((c.wx - d.start.wx) / TS) * TS;
        const dy = Math.round((c.wy - d.start.wy) / TS) * TS;
        Object.assign(d.sz, { x0: d.orig.x0 + dx, y0: d.orig.y0 + dy, x1: d.orig.x1 + dx, y1: d.orig.y1 + dy });
      }
    }
    r.request();
  };

  const onMouseUp = () => {
    const z = zoneRef.current;
    const r = renderer.current;
    const d = drag.current;
    drag.current = null;
    if (!d || !z) return;
    if (d.kind === 'paint' || d.kind === 'erase' || d.kind === 'paso') z.commit();
    else if (d.kind === 'rect') { const rect = r.overlay.rect; r.overlay.rect = null; if (rect) fillRect(rect); }
    else if (d.kind === 'select') {
      setSelection(r.overlay.rect);
    } else if (d.kind === 'move' || d.kind === 'resize') z.commitObjects(d.kind === 'move' ? 'Mover objeto' : 'Cambiar tamaño', d.before);
    else if (d.kind === 'submove' || d.kind === 'subresize') z.commitObjects('Mover subzona', d.before);
    r.request();
  };

  // ------------------------------------------------------------------ guardar
  const save = useCallback(async () => {
    const z = zoneRef.current;
    if (!z) return false;
    setSaving(true);
    const wasDirty = z.dirty;
    z.dirty = false;
    persist(true);
    try {
      const res = await fetch(`/__editor/guardar/${z.dir}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(z.serialize()),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || res.statusText);
      z.isNew = false;
      say(`Guardado: ${data.trozos} trozos${data.recursos ? ` · ${data.cantidadRecursos} recursos sincronizados con el servidor` : ' · (no encontré el backend para los recursos)'}`);
      fetch('/__editor/zonas').then((r) => r.json()).then(setZones).catch(() => {});
      return true;
    } catch (err) {
      z.dirty = wasDirty;
      say(`No se pudo guardar: ${err.message}`, 'error');
      return false;
    } finally {
      setSaving(false);
      bump();
    }
  }, [persist, say, bump]);

  const testHere = async (c) => {
    const z = zoneRef.current;
    setPicking(false);
    if (!z.inside(c.x, c.y)) return;
    if (z.blocked(c.x, c.y)) { say('Esa casilla está bloqueada: elige una donde se pueda caminar', 'error'); return; }
    if (z.dirty && !(await save())) return;
    sessionStorage.setItem(POS_KEY, JSON.stringify({ x: c.x * TS + 16, y: c.y * TS + 16, zona: z.dir }));
    navigate('/mundo');
  };

  const saveTileFlags = async () => {
    const z = zoneRef.current;
    if (!z || !ajustes) return;
    persist(true);
    try {
      const res = await fetch(`/__editor/ajustes/${z.tilesetName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ajustes) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAjustes(null);
      say(`Paso de los tiles guardado (${data.zonas} zona${data.zonas === 1 ? '' : 's'} actualizadas)`);
    } catch (err) { say(`No se pudo guardar: ${err.message}`, 'error'); }
  };

  const toggleFlag = (gid, flag) => {
    const z = zoneRef.current;
    const name = z.rules.names[gid];
    if (!name) return;
    const f = z.rules.flags[gid] ?? { colision: false, encima: false };
    f[flag] = !f[flag];
    z.rules.flags[gid] = f;
    // los ajustes que ya tenía el tileset se conservan: se manda la lista completa
    setAjustes((a) => {
      const next = { ...(a ?? z.meta.ajustes ?? {}) };
      next[name] = { colision: f.colision, encima: f.encima };
      return next;
    });
    setFlagsVer((v) => v + 1);
    renderer.current.request();
  };

  // ------------------------------------------------------------------ teclado
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const z = zoneRef.current;
      const r = renderer.current;
      if (!z || !r) return;
      const s = st.current;
      const k = e.key.toLowerCase();
      if (e.code === 'Space') { spaceDown.current = true; e.preventDefault(); return; }
      if (e.ctrlKey || e.metaKey) {
        if (k === 's') { e.preventDefault(); save(); return; }
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); const l = z.undo(); if (l) say(`Deshecho: ${l}`); return; }
        if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); const l = z.redo(); if (l) say(`Rehecho: ${l}`); return; }
        if ((k === 'c' || k === 'x') && s.selection) {
          e.preventDefault();
          const { x0, y0, x1, y1 } = s.selection;
          clipRef.current = z.copyRegion(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
          if (k === 'x') z.clearRegion(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
          say(`${k === 'x' ? 'Cortado' : 'Copiado'} ${x1 - x0 + 1}×${y1 - y0 + 1} (Ctrl+V para pegar)`);
          return;
        }
        if (k === 'v' && clipRef.current) { e.preventDefault(); setMode('mapa'); setPasting(true); r.overlay.rect = null; setSelection(null); return; }
        return;
      }
      if (k === 'escape') {
        setPasting(false); setPicking(false); setAddType(null); setSelection(null);
        r.overlay.rect = null; r.overlay.rectColor = null; r.request();
        return;
      }
      if ((k === 'delete' || k === 'backspace')) {
        if (s.mode === 'objetos' && s.selected != null) { z.removePoint(s.selected); setSelected(null); return; }
        if (s.mode === 'mapa' && s.selection) {
          const { x0, y0, x1, y1 } = s.selection;
          z.clearRegion(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
          return;
        }
      }
      const toolKey = { b: 'lapiz', r: 'rect', f: 'balde', e: 'goma', i: 'gotero', m: 'seleccion' }[k];
      if (toolKey && s.mode === 'mapa') { setTool(toolKey); setPasting(false); return; }
      const modeKey = { 1: 'mapa', 2: 'paso', 3: 'objetos', 4: 'zona' }[k];
      if (modeKey) { setMode(modeKey); return; }
      if (k === '+' || k === '=') zoomStep(1);
      else if (k === '-') zoomStep(-1);
      else if (k === 'g') setOpts((o) => ({ ...o, grid: !o.grid }));
      else if (k === 't') setOpts((o) => ({ ...o, encimaAlpha: o.encimaAlpha === 1 ? 0.35 : 1 }));
      else if (k === 'h' || k === '?') setHelp((h) => !h);
      else if (k === '[') setSize((n) => Math.max(1, n - 1));
      else if (k === ']') setSize((n) => Math.min(9, n + 1));
    };
    const onKeyUp = (e) => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [save, say, zoomStep]);

  // ------------------------------------------------------------------ minimapa
  const miniNav = (e) => {
    const z = zoneRef.current;
    if (!z) return;
    const rect = miniRef.current.getBoundingClientRect();
    centerOn(((e.clientX - rect.left) / rect.width) * z.W * TS, ((e.clientY - rect.top) / rect.height) * z.H * TS);
    bump();
  };

  // ------------------------------------------------------------------ zonas
  const createZone = async () => {
    const d = newZone.dir.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(d)) { say('La carpeta solo puede tener minúsculas, números y _', 'error'); return; }
    if (zones.some((zz) => zz.dir === d)) { say('Ya existe una zona con esa carpeta', 'error'); return; }
    if (zones.some((zz) => zz.zona === Number(newZone.zona))) { say(`El número de zona ${newZone.zona} ya lo usa otra zona`, 'error'); return; }
    if (zoneRef.current?.dirty && !window.confirm('Hay cambios sin guardar en esta zona. ¿Descartarlos?')) return;
    const meta = await fetchTileset(zoneRef.current?.tilesetName ?? 'pradera');
    const z = blankZone({ dir: d, nombre: newZone.nombre.trim() || d, zona: Number(newZone.zona), columns: Number(newZone.columns), rows: Number(newZone.rows), meta: { ...meta, name: zoneRef.current?.tilesetName ?? 'pradera' } });
    zoneRef.current = z;
    sessionStorage.removeItem(SESSION_KEY);
    restored.current = true;
    setDir(d);
    setMode('mapa');
    say('Zona nueva creada: pinta y guarda (Ctrl+S) para crear sus archivos');
  };

  const switchZone = (d) => {
    if (d === dir) return;
    if (zoneRef.current?.dirty && !window.confirm('Hay cambios sin guardar. ¿Cambiar de zona y descartarlos?')) return;
    zoneRef.current = null;
    restored.current = true;
    setDir(d);
  };

  // ------------------------------------------------------------------ paneles
  const selPoint = zone?.puntos.find((p) => p.uid === selected) ?? null;
  const selSubzone = zone?.subzonas.find((s) => s.uid === selSub) ?? null;
  const setPointProp = (name, type, value) => zone.updatePoint(selPoint.uid, { properties: withProp(selPoint, name, type, value) }, 'Editar objeto', `p${selPoint.uid}:${name}`);
  const focusPoint = (p) => {
    setSelected(p.uid);
    const c = pointCenter(p);
    if (renderer.current.view.zoom < 1) setZoom(1);
    centerOn(c.x, c.y);
  };
  const monsterOptions = Object.entries(monsters).map(([code, m]) => ({ code, name: m.name }));
  const dialogueKeys = Object.keys(DIALOGUES);
  const resourceIds = zone ? [...new Set(zone.puntos.filter((p) => p.type === 'recurso').map((p) => p.name))] : [];

  const paletteValue = brush.kind === 'stamp' && brush.x != null ? brush : null;
  const cursorClass = picking ? 'is-pick' : spaceDown.current ? 'is-pan' : `tool-${mode === 'mapa' ? tool : mode}`;

  return (
    <div className="map-editor" onContextMenu={(e) => e.preventDefault()}>
      {/* ---------------------------------------------------------------- barra superior */}
      <header className="me-top">
        <div className="me-brand">⚒ Editor de mapas</div>
        <select className="me-select" value={dir ?? ''} onChange={(e) => switchZone(e.target.value)} title="Zona">
          {zones.map((z) => <option key={z.dir} value={z.dir}>{z.nombre} ({z.dir})</option>)}
          {zone?.isNew && <option value={zone.dir}>{zone.info.nombre} (nueva)</option>}
        </select>
        <nav className="me-modes">
          {[['mapa', 'Mapa', '1'], ['paso', 'Paso', '2'], ['objetos', 'Objetos', '3'], ['zona', 'Zona', '4']].map(([id, label, key]) => (
            <button key={id} type="button" className={mode === id ? 'on' : ''} onClick={() => { setMode(id); setPasting(false); setAddType(null); }} title={`${label} (${key})`}>{label}</button>
          ))}
        </nav>
        <div className="me-group">
          <button type="button" onClick={() => { const l = zone?.undo(); if (l) say(`Deshecho: ${l}`); }} disabled={!zone?.undoStack.length} title="Deshacer (Ctrl+Z)">↶</button>
          <button type="button" onClick={() => { const l = zone?.redo(); if (l) say(`Rehecho: ${l}`); }} disabled={!zone?.redoStack.length} title="Rehacer (Ctrl+Y)">↷</button>
        </div>
        <div className="me-group">
          <button type="button" onClick={() => zoomStep(-1)} title="Alejar (-)">−</button>
          <span className="me-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomStep(1)} title="Acercar (+)">+</button>
        </div>
        <div className="me-group me-toggles">
          <button type="button" className={opts.grid ? 'on' : ''} onClick={() => setOpts((o) => ({ ...o, grid: !o.grid }))} title="Rejilla (G)">▦</button>
          <button type="button" className={opts.encimaAlpha < 1 ? 'on' : ''} onClick={() => setOpts((o) => ({ ...o, encimaAlpha: o.encimaAlpha === 1 ? 0.35 : 1 }))} title="Copas y tejados transparentes (T)">☁</button>
          <button type="button" className={opts.puntos ? 'on' : ''} onClick={() => setOpts((o) => ({ ...o, puntos: !o.puntos }))} title="Ver objetos">◆</button>
          <button type="button" className={opts.subzonas ? 'on' : ''} onClick={() => setOpts((o) => ({ ...o, subzonas: !o.subzonas }))} title="Ver subzonas">⌗</button>
          <button type="button" className={opts.chunks ? 'on' : ''} onClick={() => setOpts((o) => ({ ...o, chunks: !o.chunks }))} title="Ver bordes de los trozos">┼</button>
        </div>
        <div className="me-spacer" />
        <button type="button" className={`me-test ${picking ? 'on' : ''}`} onClick={() => setPicking((p) => !p)} title="Elige una casilla y entra al juego ahí">▶ Probar aquí</button>
        <button type="button" className="me-save" onClick={save} disabled={saving || !zone} title="Guardar (Ctrl+S)">
          {saving ? 'Guardando…' : zone?.dirty ? '● Guardar' : 'Guardado'}
        </button>
        <button type="button" className="me-help-btn" onClick={() => setHelp(true)} title="Ayuda (H)">?</button>
        <button type="button" className="me-exit" onClick={() => navigate('/mundo')} title="Volver al juego">✕</button>
      </header>

      {/* ---------------------------------------------------------------- panel izquierdo */}
      <aside className="me-side">
        {rules && mode === 'mapa' && (
          <>
            <div className="me-tools">
              {MAP_TOOLS.map((t) => (
                <button key={t.id} type="button" className={tool === t.id && !pasting ? 'on' : ''} onClick={() => { setTool(t.id); setPasting(false); }} title={`${t.label} (${t.key})`}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            {pasting && <div className="me-note">Pegando: clic para colocar · Esc para terminar</div>}
            {selection && !pasting && <div className="me-note">Selección {selection.x1 - selection.x0 + 1}×{selection.y1 - selection.y0 + 1}: Ctrl+C copiar · Ctrl+X cortar · Supr vaciar</div>}
            <div className="me-row">
              <Field label="Capa" hint="Auto: cada tile va a su capa (suelo, objetos o encima del héroe)">
                <select value={layer} onChange={(e) => setLayer(e.target.value)}>
                  <option value="auto">Automática</option>
                  <option value="suelo">Suelo</option>
                  <option value="objetos">Objetos</option>
                  <option value="encima">Encima (copas, tejados)</option>
                </select>
              </Field>
              <Field label="Grosor" hint="Tamaño del pincel de terreno y la goma ([ y ])">
                <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 7, 9].map((n) => <option key={n} value={n}>{n}×{n}</option>)}
                </select>
              </Field>
            </div>
            <div className="me-tabs">
              {[['terrenos', 'Terrenos'], ['tiles', 'Tiles'], ['grandes', 'Objetos grandes']].map(([id, label]) => (
                <button key={id} type="button" className={mapTab === id ? 'on' : ''} onClick={() => setMapTab(id)}>{label}</button>
              ))}
            </div>
            <div className="me-scroll">
              {mapTab === 'terrenos' && (
                <>
                  <p className="me-hint">Terrenos con bordes automáticos: los caminos, el agua y los trigales se unen solos con lo de al lado. La meseta crea su pared de roca.</p>
                  <div className="me-terrains">
                    {TERRAIN_BRUSHES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={brush.kind === 'terrain' && brush.id === b.id ? 'on' : ''}
                        onClick={() => { setBrush({ kind: 'terrain', id: b.id }); if (tool === 'gotero' || tool === 'seleccion') setTool('lapiz'); setPasting(false); }}
                      >
                        <TileIcon img={tilesImg} gid={rules.T[b.icon]} columns={rules.columns} />
                        <span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {mapTab === 'tiles' && (
                <>
                  <p className="me-hint">Clic para elegir un tile, arrastra para un sello de varios. Clic derecho en el mapa copia el tile de ahí.</p>
                  <TilePalette
                    img={tilesImg}
                    rules={rules}
                    value={paletteValue}
                    onPick={(s) => { setBrush({ kind: 'stamp', ...s }); if (tool === 'gotero' || tool === 'seleccion') setTool('lapiz'); setPasting(false); }}
                  />
                </>
              )}
              {mapTab === 'grandes' && (
                <div className="me-bigs">
                  {rules.bigObjects.map((o) => (
                    <button
                      key={o.name}
                      type="button"
                      className={brush.kind === 'stamp' && brush.name === o.name ? 'on' : ''}
                      onClick={() => { setBrush({ kind: 'stamp', name: o.name, w: o.w, h: o.h, gids: o.gids }); setTool('lapiz'); setPasting(false); }}
                    >
                      <StampThumb img={tilesImg} stamp={o} columns={rules.columns} />
                      <span>{o.name.replace(/_/g, ' ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {rules && mode === 'paso' && (
          <>
            <div className="me-tabs">
              <button type="button" className={pasoTab === 'casillas' ? 'on' : ''} onClick={() => setPasoTab('casillas')}>Por casilla</button>
              <button type="button" className={pasoTab === 'tiles' ? 'on' : ''} onClick={() => setPasoTab('tiles')}>Por tile</button>
            </div>
            {pasoTab === 'casillas' ? (
              <div className="me-scroll">
                <p className="me-hint">Fuerza el paso de casillas sueltas, como en RPG Maker. Clic derecho vuelve a Auto. Lo rojo tenue es lo que ya bloquean los tiles.</p>
                <div className="me-paso">
                  {PASO_TOOLS.map((t) => (
                    <button key={t.id} type="button" className={pasoTool === t.id ? 'on' : ''} onClick={() => setPasoTool(t.id)} title={t.hint}>
                      <b>{t.icon}</b>
                      <span>{t.label}</span>
                      <small>{t.hint}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="me-scroll">
                <p className="me-hint">Paso de cada tile para todo el juego (como la base de datos de RPG Maker): clic cambia ○ se pasa / ✕ choca; Mayús+clic marca ☆ (se dibuja encima del héroe).</p>
                <TilePalette img={tilesImg} rules={rules} flagsMode onToggleFlag={toggleFlag} version={flagsVer} onPick={() => {}} />
                <button type="button" className="me-primary" disabled={!ajustes} onClick={saveTileFlags}>Guardar paso de los tiles</button>
              </div>
            )}
          </>
        )}

        {zone && mode === 'objetos' && (
          <div className="me-scroll">
            <h4 className="me-h">Añadir</h4>
            <div className="me-addgrid">
              {OBJECT_TYPES.map((t) => (
                <button key={t.type} type="button" className={addType === t.type ? 'on' : ''} title={t.hint} onClick={() => setAddType(addType === t.type ? null : t.type)}>
                  <i style={{ background: POINT_STYLE[t.type]?.color ?? '#999' }} />{t.label}
                </button>
              ))}
            </div>
            {addType && <div className="me-note">Clic en el mapa para colocar (Mayús+clic para poner varios)</div>}

            {selPoint ? (
              <div className="me-props">
                <h4 className="me-h">{POINT_STYLE[selPoint.type]?.label ?? selPoint.type} <small>{selPoint.type === 'encuentro' ? `${selPoint.width / TS}×${selPoint.height / TS}` : `${Math.floor(pointCenter(selPoint).x / TS)},${Math.floor(pointCenter(selPoint).y / TS)}`}</small></h4>
                {selPoint.type !== 'spawn' && selPoint.type !== 'aspas' && selPoint.type !== 'luz' && (
                  <Field label={selPoint.type === 'recurso' ? 'Id del recurso' : 'Nombre interno'} hint={selPoint.type === 'recurso' ? 'Los puntos con el mismo id son los sitios posibles de un mismo recurso' : ''}>
                    <input value={selPoint.name} list={selPoint.type === 'recurso' ? 'me-res-ids' : undefined} onChange={(e) => zone.updatePoint(selPoint.uid, { name: e.target.value.replace(/\s+/g, selPoint.type === 'encuentro' ? ' ' : '_') })} />
                  </Field>
                )}
                {selPoint.type === 'npc' && (
                  <>
                    <Field label="Nombre, oficio" hint="Ej: Lyra, mercader → nombre arriba y ‹Mercader› debajo"><input value={getProp(selPoint, 'nombre') ?? ''} onChange={(e) => setPointProp('nombre', 'string', e.target.value)} /></Field>
                    <Field label="Sprite">
                      <select value={getProp(selPoint, 'sprite') ?? ''} onChange={(e) => setPointProp('sprite', 'string', e.target.value)}>
                        {sprites.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Diálogo" hint="Conversación de src/game/dialogues.js">
                      <select value={getProp(selPoint, 'dialogo') ?? ''} onChange={(e) => setPointProp('dialogo', 'string', e.target.value)}>
                        <option value="">— sin diálogo (abre la ventana) —</option>
                        {dialogueKeys.map((k) => <option key={k} value={k}>{DIALOGUES[k].name}</option>)}
                      </select>
                    </Field>
                    <Field label="Aparece después de la misión" hint="Código de misión (ej: MONTANAS_HISTORIA_03_MINEROS). Cada jugador lo ve solo si ya la completó">
                      <input value={getProp(selPoint, 'requiere') ?? ''} placeholder="— siempre —" onChange={(e) => setPointProp('requiere', 'string', e.target.value.trim().toUpperCase())} />
                    </Field>
                    <Field label="Se va después de la misión" hint="Código de misión: deja de verse para quien ya la completó">
                      <input value={getProp(selPoint, 'oculto_tras') ?? ''} placeholder="— nunca —" onChange={(e) => setPointProp('oculto_tras', 'string', e.target.value.trim().toUpperCase())} />
                    </Field>
                    <Field label="Fase (avanzado)" hint="Se suma a lo de arriba. CODIGO@activa (la tiene en curso), CODIGO@2 (va en el paso 2), CODIGO@2+, CODIGO@lista, CODIGO@no (ni la empezó), !CODIGO; varias con coma. Ver game/story.js">
                      <input value={getProp(selPoint, 'fase') ?? ''} placeholder="— sin fase —" onChange={(e) => setPointProp('fase', 'string', e.target.value.trim())} />
                    </Field>
                  </>
                )}
                {(selPoint.type === 'npc' || selPoint.type === 'poi' || selPoint.type === 'jefe') && (
                  <Field label="Texto al acercarse"><input value={getProp(selPoint, 'etiqueta') ?? ''} onChange={(e) => setPointProp('etiqueta', 'string', e.target.value)} /></Field>
                )}
                {(selPoint.type === 'npc' || selPoint.type === 'poi') && (
                  <Field label="Ventana que abre">
                    <select value={getProp(selPoint, 'ventana') ?? ''} onChange={(e) => setPointProp('ventana', 'string', e.target.value)}>
                      <option value="">— ninguna —</option>
                      {WINDOW_IDS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </Field>
                )}
                {selPoint.type === 'jefe' && (
                  <>
                    <Field label="Monstruo">
                      <select value={getProp(selPoint, 'monstruo') ?? ''} onChange={(e) => setPointProp('monstruo', 'string', e.target.value)}>
                        {monsterOptions.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Nivel"><input type="number" min="1" value={getProp(selPoint, 'nivel') ?? 1} onChange={(e) => setPointProp('nivel', 'int', parseInt(e.target.value, 10))} /></Field>
                  </>
                )}
                {selPoint.type === 'recurso' && (
                  <>
                    <Field label="Tipo">
                      <select value={getProp(selPoint, 'tipo') ?? 'hierba'} onChange={(e) => setPointProp('tipo', 'string', e.target.value)}>
                        {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <p className="me-hint">Sitios de «{selPoint.name}»: {zone.puntos.filter((p) => p.type === 'recurso' && p.name === selPoint.name).length}. Reaparece en uno de ellos (distinto para cada jugador).</p>
                    <button type="button" className="me-secondary" onClick={() => { const p = zone.addPoint({ ...selPoint, uid: undefined, x: selPoint.x + 2 * TS }); setSelected(p.uid); }}>+ Añadir otro sitio</button>
                  </>
                )}
                {selPoint.type === 'luz' && (
                  <Field label="Tipo">
                    <select value={getProp(selPoint, 'tipo') ?? 'farol'} onChange={(e) => setPointProp('tipo', 'string', e.target.value)}>
                      <option value="farol">Farol</option>
                      <option value="fogata">Fogata</option>
                    </select>
                  </Field>
                )}
                {selPoint.type === 'encuentro' && (
                  <>
                    <Field label="Monstruos que rondan">
                      <div className="me-checks">
                        {monsterOptions.map((m) => {
                          const list = String(getProp(selPoint, 'monstruos') ?? '').split(',').filter(Boolean);
                          const on = list.includes(m.code);
                          return (
                            <label key={m.code} className={on ? 'on' : ''}>
                              <input type="checkbox" checked={on} onChange={() => setPointProp('monstruos', 'string', (on ? list.filter((x) => x !== m.code) : [...list, m.code]).join(','))} />
                              {m.name}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label="Cuántos a la vez"><input type="number" min="1" max="12" value={getProp(selPoint, 'cantidad') ?? 2} onChange={(e) => setPointProp('cantidad', 'int', parseInt(e.target.value, 10))} /></Field>
                    <p className="me-hint">Arrastra la esquina de abajo a la derecha para cambiar el tamaño. Los combates por pisar hierba alta salen del terreno «Hierba alta».</p>
                  </>
                )}
                {GENERIC_PROPS[selPoint.type] && (
                  <>
                    {[...new Set([...GENERIC_PROPS[selPoint.type].map(([n]) => n), ...(selPoint.properties ?? []).map((q) => q.name)])].map((n) => {
                      const def = GENERIC_PROPS[selPoint.type].find(([k]) => k === n);
                      const type = selPoint.properties?.find((q) => q.name === n)?.type ?? def?.[1] ?? 'string';
                      return (
                        <Field key={n} label={n}>
                          {type === 'bool' ? (
                            <input type="checkbox" checked={!!getProp(selPoint, n)} onChange={(e) => setPointProp(n, type, e.target.checked)} />
                          ) : (
                            <input
                              type={type === 'int' ? 'number' : 'text'}
                              value={getProp(selPoint, n) ?? ''}
                              placeholder={def ? String(def[2]) : ''}
                              onChange={(e) => setPointProp(n, type, type === 'int' ? parseInt(e.target.value, 10) : e.target.value)}
                            />
                          )}
                        </Field>
                      );
                    })}
                    {selPoint.type === 'salida' && <p className="me-hint">destino = carpeta de la zona (aurelia, pradera…); x/y = casilla donde apareces allí. Arrastra la esquina para cambiar el tamaño.</p>}
                    {selPoint.type === 'ruta' && <p className="me-hint">Los puntos con el mismo nombre forman una ruta; los ciudadanos la recorren en el orden indicado.</p>}
                    {selPoint.type === 'ciudadano' && <p className="me-hint">sprite = hoja de caminar (cit_1…cit_15, npc_guardia…); ruta = nombre de una ruta; horario: siempre, dia, tarde, noche; charla = grupo de conversación; mira: side, sideL, up, down.</p>}
                    {selPoint.type === 'escena' && <p className="me-hint">sprite = assets/mundo/escena/&lt;sprite&gt;.png; fase = cuándo se ve (ej: MONTANAS_HISTORIA_02_ORCOS, !CODIGO, CODIGO@activa, CODIGO@2, CODIGO@no; varias con coma); solido = tapa el paso mientras se ve.</p>}
                    {selPoint.type === 'cartel' && <p className="me-hint">icono: espada, baston, arco, daga, sol, pocion, yunque, jarra, moneda, pergamino, balanza, gema, ala, rueda, libro, cama.</p>}
                  </>
                )}
                {selPoint.type === 'spawn' && <p className="me-hint">Donde aparece el jugador al entrar a la zona por primera vez. Arrástralo para moverlo.</p>}
                {selPoint.type !== 'spawn' && <button type="button" className="me-danger" onClick={() => { zone.removePoint(selPoint.uid); setSelected(null); }}>Borrar (Supr)</button>}
              </div>
            ) : <p className="me-hint">Clic en un objeto del mapa para editarlo; arrástralo para moverlo (Alt: sin ajustar a la rejilla).</p>}

            <h4 className="me-h">En la zona <input className="me-filter" placeholder="Buscar…" value={filter} onChange={(e) => setFilter(e.target.value)} /></h4>
            <ul className="me-list">
              {zone.puntos
                .filter((p) => !filter || `${p.name} ${getProp(p, 'nombre') ?? ''} ${p.type}`.toLowerCase().includes(filter.toLowerCase()))
                .map((p) => (
                  <li key={p.uid}>
                    <button type="button" className={selected === p.uid ? 'on' : ''} onClick={() => focusPoint(p)}>
                      <i style={{ background: POINT_STYLE[p.type]?.color ?? '#999' }} />
                      <span>{p.type === 'npc' ? String(getProp(p, 'nombre') ?? p.name).split(',')[0] : p.type === 'spawn' ? 'Inicio' : p.name}</span>
                      <small>{POINT_STYLE[p.type]?.label ?? p.type}</small>
                    </button>
                  </li>
                ))}
            </ul>
            <datalist id="me-res-ids">{resourceIds.map((id) => <option key={id} value={id} />)}</datalist>
          </div>
        )}

        {zone && mode === 'zona' && (
          <div className="me-scroll">
            <h4 className="me-h">Datos de la zona</h4>
            <Field label="Nombre"><input value={zone.info.nombre ?? ''} onChange={(e) => zone.updateInfo({ nombre: e.target.value })} /></Field>
            <div className="me-row">
              <Field label="Nº de zona" hint="El mismo id que la zona en la base de datos (monstruos, misiones)"><input type="number" min="1" value={zone.info.zona ?? 1} onChange={(e) => zone.updateInfo({ zona: parseInt(e.target.value, 10) || 1 })} /></Field>
              <Field label="Combates en hierba" hint="Probabilidad por casilla de hierba alta pisada"><input type="number" step="0.01" min="0" max="1" value={zone.info.encuentroHierba ?? 0} onChange={(e) => zone.updateInfo({ encuentroHierba: parseFloat(e.target.value) || 0 })} /></Field>
            </div>
            <div className="me-row">
              <Field label="Estación">
                <select value={zone.info.clima?.estacion ?? 'verano'} onChange={(e) => zone.updateInfo({ clima: { ...zone.info.clima, estacion: e.target.value } })}>
                  {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Lluvia" hint="Probabilidad de que llueva en cada cambio de clima (0 a 1)"><input type="number" step="0.05" min="0" max="1" value={zone.info.clima?.lluvia ?? 0} onChange={(e) => zone.updateInfo({ clima: { ...zone.info.clima, lluvia: parseFloat(e.target.value) || 0 } })} /></Field>
            </div>
            <p className="me-hint">Tamaño: {zone.columns}×{zone.rows} trozos de {zone.cw}×{zone.ch} casillas ({zone.W}×{zone.H}). Tileset: {zone.tilesetName}.</p>

            <h4 className="me-h">Subzonas <button type="button" className="me-mini" onClick={() => { const r = renderer.current; const c = r.toWorld(r.size.w / 2, r.size.h / 2); const x0 = Math.floor(c.x / TS) * TS - 6 * TS; const y0 = Math.floor(c.y / TS) * TS - 4 * TS; const s = zone.addSubzone({ name: 'Nueva subzona', x0, y0, x1: x0 + 12 * TS, y1: y0 + 8 * TS, levels: '1-5' }); setSelSub(s.uid); }}>+ Añadir</button></h4>
            <p className="me-hint">El nombre sale en pantalla al entrar. Si se pisan, gana la de más arriba en la lista. Elige una y arrástrala en el mapa (la esquina cambia el tamaño).</p>
            <ul className="me-list">
              {zone.subzonas.map((s, i) => (
                <li key={s.uid} className="me-subrow">
                  <button type="button" className={selSub === s.uid ? 'on' : ''} onClick={() => { setSelSub(s.uid); centerOn((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2); }}>
                    <span>{s.name}</span><small>{s.safe ? 'segura' : s.levels ? `Nv ${s.levels}` : ''}</small>
                  </button>
                  <button type="button" className="me-mini" disabled={i === 0} onClick={() => zone.moveSubzone(s.uid, -1)} title="Subir prioridad">▲</button>
                  <button type="button" className="me-mini" disabled={i === zone.subzonas.length - 1} onClick={() => zone.moveSubzone(s.uid, 1)} title="Bajar prioridad">▼</button>
                </li>
              ))}
            </ul>
            {selSubzone && (
              <div className="me-props">
                <Field label="Nombre"><input value={selSubzone.name} onChange={(e) => zone.updateSubzone(selSubzone.uid, { name: e.target.value })} /></Field>
                <div className="me-row">
                  <Field label="Niveles"><input value={selSubzone.levels ?? ''} placeholder="3-6" onChange={(e) => zone.updateSubzone(selSubzone.uid, { levels: e.target.value || null })} /></Field>
                  <Field label="Zona segura"><input type="checkbox" checked={!!selSubzone.safe} onChange={(e) => zone.updateSubzone(selSubzone.uid, { safe: e.target.checked || undefined })} /></Field>
                </div>
                <button type="button" className="me-danger" onClick={() => { zone.removeSubzone(selSubzone.uid); setSelSub(null); }}>Borrar subzona</button>
              </div>
            )}

            <h4 className="me-h">Nueva zona</h4>
            <p className="me-hint">Crea una zona en blanco (por ejemplo la capital). Cada trozo mide {40}×{30} casillas.</p>
            <div className="me-row">
              <Field label="Carpeta"><input value={newZone.dir} placeholder="capital" onChange={(e) => setNewZone((n) => ({ ...n, dir: e.target.value }))} /></Field>
              <Field label="Nº zona"><input type="number" min="1" value={newZone.zona} onChange={(e) => setNewZone((n) => ({ ...n, zona: e.target.value }))} /></Field>
            </div>
            <Field label="Nombre"><input value={newZone.nombre} placeholder="Ciudad de …" onChange={(e) => setNewZone((n) => ({ ...n, nombre: e.target.value }))} /></Field>
            <div className="me-row">
              <Field label="Trozos de ancho"><input type="number" min="1" max="8" value={newZone.columns} onChange={(e) => setNewZone((n) => ({ ...n, columns: e.target.value }))} /></Field>
              <Field label="Trozos de alto"><input type="number" min="1" max="8" value={newZone.rows} onChange={(e) => setNewZone((n) => ({ ...n, rows: e.target.value }))} /></Field>
            </div>
            <button type="button" className="me-primary" onClick={createZone}>Crear zona</button>
          </div>
        )}
      </aside>

      {/* ---------------------------------------------------------------- mapa */}
      <main className="me-stage">
        <canvas
          ref={canvasRef}
          className={`me-canvas ${cursorClass}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={(e) => { onMouseUp(e); if (renderer.current) { renderer.current.overlay.cursor = null; renderer.current.request(); } }}
        />
        {(
          <div className="me-mini-wrap" style={{ display: zone ? 'block' : 'none' }}>
            <canvas ref={miniRef} className="me-minimap" onMouseDown={miniNav} onMouseMove={(e) => { if (e.buttons === 1) miniNav(e); }} />
            <div ref={miniViewRef} className="me-mini-view" />
          </div>
        )}
        {picking && <div className="me-banner">Elige la casilla donde quieres aparecer · Esc para cancelar</div>}
        {loading && <div className="me-loading">{loading}</div>}
        {error && <div className="me-error">{error}</div>}
        {toast && <div key={toast.key} className={`me-toast ${toast.kind}`}>{toast.text}</div>}
      </main>

      <footer className="me-status">
        <span ref={statusRef}>Pasa el ratón por el mapa</span>
        <span className="me-status-right">{zone ? `${zone.undoStack.length} cambios · ${zone.dirty ? 'sin guardar' : 'guardado'}` : ''}</span>
      </footer>

      {help && (
        <div className="me-help" onClick={() => setHelp(false)} role="presentation">
          <div className="me-help-card" onClick={(e) => e.stopPropagation()} role="presentation">
            <h3>Atajos del editor</h3>
            <div className="me-help-cols">
              <dl>
                <dt>Rueda</dt><dd>Zoom</dd>
                <dt>Espacio + arrastrar / botón central</dt><dd>Mover la vista</dd>
                <dt>1 2 3 4</dt><dd>Mapa · Paso · Objetos · Zona</dd>
                <dt>B R F E I M</dt><dd>Lápiz · Rectángulo · Balde · Goma · Cuentagotas · Seleccionar</dd>
                <dt>[ ]</dt><dd>Grosor del pincel</dd>
                <dt>Clic derecho</dt><dd>Copiar tile (Mayús: terreno) · en Paso: volver a Auto</dd>
              </dl>
              <dl>
                <dt>Ctrl+Z / Ctrl+Y</dt><dd>Deshacer / rehacer</dd>
                <dt>Ctrl+C / X / V</dt><dd>Copiar, cortar y pegar una selección (con objetos)</dd>
                <dt>Supr</dt><dd>Borrar objeto o vaciar la selección</dd>
                <dt>Ctrl+S</dt><dd>Guardar (la página se recarga sola y sigues donde estabas)</dd>
                <dt>G · T</dt><dd>Rejilla · copas transparentes</dd>
                <dt>Esc</dt><dd>Cancelar pegar, colocar o selección</dd>
              </dl>
            </div>
            <p>El editor guarda en <code>public/assets/mundo/&lt;zona&gt;/</code> y le pasa la lista de recursos al servidor del juego. Solo funciona con <code>npm start</code> en este PC.</p>
            <button type="button" className="me-primary" onClick={() => setHelp(false)}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
