import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';
import WorldScene from '../game/WorldScene';
import BattleScene from '../game/BattleScene';
import Battle from '../components/world/Battle';
import bus from '../game/bus';
import audio from '../game/audio';
import { speciesOf } from '../game/pets';
import DialogueBox from '../components/world/DialogueBox';
import QuestTracker from '../components/world/QuestTracker';
import TargetFrame from '../components/world/TargetFrame';
import { questMarks } from '../game/questGivers';
import LevelUpBanner from '../components/world/LevelUpBanner';
import SoundControl from '../components/world/SoundControl';
import { MINIMAP } from '../game/hudLayout';
import { CLASS_ICON } from '../utils/classIcons';
import BagPanel from '../components/world/BagPanel';
import CharacterPanel from '../components/world/CharacterPanel';
import SkillsPanel from '../components/world/SkillsPanel';
import { QuestBoardPanel, QuestLogPanel } from '../components/world/QuestPanels';
import EmbedPanel from '../components/world/EmbedPanel';
import MerchantPanel from '../components/world/MerchantPanel';
import CraftingPanel from '../components/world/CraftingPanel';
import PetsPanel from '../components/world/PetsPanel';
import FormationPanel from '../components/world/FormationPanel';
import GuildPanel from '../components/world/GuildPanel';
import EnchantPanel from '../components/world/EnchantPanel';
import { AchievementsPanel, InfirmaryPanel, RankingPanel } from '../components/world/MorePanels';
import MapPanel from '../components/world/MapPanel';
import WorldSocial from '../components/world/WorldSocial';
import SocialPanel from '../components/world/SocialPanel';
import { OfrendaPanel, LibroPanel, VinculoPanel } from '../components/world/CityPanels';
import OrderPanel from '../components/world/OrderPanel';
import GuildRegistryPanel from '../components/world/GuildRegistryPanel';
import InspectPanel from '../components/world/InspectPanel';
import TradePanel from '../components/world/TradePanel';
import StallPanel from '../components/world/StallPanel';
import MyStallPanel from '../components/world/MyStallPanel';
import MailPanel from '../components/world/MailPanel';
import BestiarioPanel from '../components/world/BestiarioPanel';
import KeysPanel from '../components/world/KeysPanel';
import GuideTracker from '../components/world/GuideTracker';
import { useCrypt, CryptTracker } from '../components/world/CryptHud';
import useGuide from '../components/world/useGuide';
import useExploration from '../components/world/useExploration';
import TouchControls from '../components/world/TouchControls';
import { useEvents, EventChips, CalendarPanel, WandererPanel } from '../components/world/EventsHud';
import { bindings as keyBindings } from '../game/keybinds';
import MarketPanel from '../components/world/MarketPanel';
import HirePanel from '../components/world/HirePanel';
import MythicHunt from '../components/world/MythicHunt';
import './World.css';

// Ventanas del mundo. Todas son paneles flotantes que NO bloquean el mapa: se puede caminar con
// ellas abiertas, tener varias a la vez y moverlas. `key` = tecla de acceso directo.
// Gremio, Mercado, Formación y Mascotas reusan la pantalla de siempre dentro del marco (embed).
const WINDOWS = {
  inventario:      { title: 'Mochila',            key: 'i', icon: ['knapsack', 'lorc'],          panel: BagPanel,          pos: 'right' },
  personaje:       { title: 'Personaje',          key: 'c', icon: ['wizard-face', 'delapouite'], panel: CharacterPanel,    pos: { x: 300, y: 110 } },
  habilidades:     { title: 'Habilidades',        key: 'h', icon: ['spell-book', 'delapouite'],  panel: SkillsPanel,       pos: { x: 330, y: 130 } },
  misiones:        { title: 'Misiones',           key: 'j', icon: ['scroll-unfurled', 'lorc'],   panel: QuestLogPanel,     pos: { x: 360, y: 150 } },
  formacion:       { title: 'Formación',          key: 'f', icon: ['meeple-army', 'delapouite'], panel: FormationPanel,    pos: { x: 300, y: 90 } },
  mascotas:        { title: 'Mascotas',           key: 'n', icon: ['paw', 'lorc'],               panel: PetsPanel,         pos: { x: 320, y: 100 } },
  gremio:          { title: 'Gremio',             key: 'g', icon: ['castle', 'delapouite'],      panel: GuildPanel,        pos: { x: 340, y: 80 } },
  mercado:         { title: 'Mercado',            key: 'b', icon: ['shop', 'delapouite'],        panel: MarketPanel,       pos: { x: 280, y: 70 } },
  mapa:            { title: 'Mapa',               key: 'm', icon: ['treasure-map', 'lorc'],      panel: MapPanel,          pos: { x: 360, y: 70 } },
  logros:          { title: 'Logros',             key: 'l', icon: ['trophy-cup', 'delapouite'],  panel: AchievementsPanel, pos: { x: 350, y: 100 } },
  calendario:      { title: 'Calendario de eventos', panel: CalendarPanel, pos: { x: 380, y: 90 } },
  ambulante:       { title: 'Mercader ambulante', panel: WandererPanel,     pos: { x: 360, y: 110 } },
  teclas:          { title: 'Atajos de teclado',  panel: KeysPanel,         pos: { x: 360, y: 100 } },
  bestiario:       { title: 'Bestiario',          key: 'k', icon: ['book-aura', 'lorc'],         panel: BestiarioPanel,    pos: { x: 240, y: 70 } },
  ranking:         { title: 'Ranking',            key: 'r', icon: ['podium', 'delapouite'],      panel: RankingPanel,      pos: 'right' },
  social:          { title: 'Social',             key: 'o', icon: ['two-shadows', 'lorc'],       panel: SocialPanel,       pos: 'right' },
  // solo desde puntos del mapa (sin botón en la barra)
  misiones_gremio: { title: 'Tablón del gremio',  panel: QuestBoardPanel, pos: { x: 360, y: 120 } },
  enfermeria:      { title: 'Enfermería',         panel: InfirmaryPanel,  pos: { x: 420, y: 160 } },
  artesanos:       { title: 'Artesanos del gremio', panel: MerchantPanel, pos: { x: 360, y: 90 } },
  taller:          { title: 'Taller del herrero',   panel: CraftingPanel, pos: { x: 330, y: 80 } },
  // servicios del gremio que siguen usando su pantalla de siempre dentro del marco
  contratar:       { title: 'Contratar aventureros', panel: HirePanel, pos: { x: 320, y: 90 } },
  encantador:      { title: 'Encantador',            panel: EnchantPanel, pos: { x: 380, y: 90 } },
  // Registro de Gremios de Aurelia (solo hablando con Oswin)
  unirse_gremio:   { title: 'Registro de Gremios',   panel: GuildRegistryPanel, pos: { x: 340, y: 80 }, props: { tab: 'unirse' } },
  crear_gremio:    { title: 'Registro de Gremios',   panel: GuildRegistryPanel, pos: { x: 340, y: 80 }, props: { tab: 'fundar' } },
  // maestro de evolución que trajo un miembro al gremio (la ruta llega al abrirla, ver openWin)
  maestro_gremio:  { title: 'Maestro del gremio',    icon: ['wizard-face', 'delapouite'],   embed: '/guild/my/masters' },
  // inspeccionar a otro jugador (clic en él → Inspeccionar; el jugador llega al abrirla)
  inspeccionar:    { title: 'Inspeccionar',          panel: InspectPanel, pos: { x: 300, y: 80 } },
  // comercio directo con otro jugador (se abre cuando los dos aceptan; el estado llega en args)
  comercio:        { title: 'Comercio',              panel: TradePanel, pos: { x: 260, y: 70 } },
  // correo del reino (buzones de la Plaza del Pilar y la Aldea Espiga, o desde la ventana Social)
  buzon:           { title: 'Correo',                panel: MailPanel, pos: { x: 340, y: 90 } },
  // muñecos de venta: el de otro jugador (clic en el muñeco) y el tuyo (usar el muñeco de la mochila)
  puesto:          { title: 'Puesto',                panel: StallPanel, pos: { x: 320, y: 90 } },
  mi_puesto:       { title: 'Mi muñeco de venta',    panel: MyStallPanel, pos: { x: 300, y: 70 } },
  // Aurelia: el Pilar de Aethra, el libro de visitas de la posada y la Estatua del Viajero
  ofrenda:         { title: 'Pilar de Aethra',       panel: OfrendaPanel, pos: { x: 380, y: 120 } },
  libro:           { title: 'Libro de visitas',      panel: LibroPanel,   pos: { x: 360, y: 100 } },
  vinculo:         { title: 'Estatua del Viajero',   panel: VinculoPanel, pos: { x: 380, y: 90 }, props: { vinculo: 'aurelia' } },
  // casas de las órdenes: solo se abren hablando con su maestro en el Barrio de las Órdenes
  orden_guerrero:  { title: 'Cuartel del Acero',     panel: OrderPanel, pos: { x: 300, y: 70 }, props: { orden: 'guerrero' } },
  orden_mago:      { title: 'Torre Arcana',          panel: OrderPanel, pos: { x: 300, y: 70 }, props: { orden: 'mago' } },
  orden_arquero:   { title: 'Campo del Halcón',      panel: OrderPanel, pos: { x: 300, y: 70 }, props: { orden: 'arquero' } },
  orden_picaro:    { title: 'La Sombra Callada',     panel: OrderPanel, pos: { x: 300, y: 70 }, props: { orden: 'picaro' } },
  orden_sacerdote: { title: 'Capilla de la Luz',     panel: OrderPanel, pos: { x: 300, y: 70 }, props: { orden: 'sacerdote' } },
};

function defaultPosFor(w) {
  if (w.pos === 'right') return { x: Math.max(20, window.innerWidth - 500), y: 236 };
  if (w.pos) return w.pos;
  return { x: 20 + Math.max(0, (window.innerWidth - Math.min(820, window.innerWidth - 40)) / 2), y: 70 };
}
// en el celular la barra muestra solo estas (y la piedra); el resto va en el menú (☰)
const QUICK = ['inventario', 'mapa', 'misiones'];
const TOOLBAR = ['inventario', 'personaje', 'habilidades', 'misiones', 'formacion', 'mascotas', 'gremio', 'social', 'mercado', 'mapa', 'bestiario', 'logros', 'ranking'];
// piedra de regreso: tecla y segundos que hay que quedarse quieto para usarla
const STONE_KEY = 'v';
const HEARTH_MS = 5000;

const BASE_CLASSES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
// v2: la Pradera grande por trozos (las posiciones del mapa viejo ya no sirven)
const POS_KEY = 'mundo_posicion_v2';
// zona de arranque si no hay posición guardada (la posición guarda en qué zona estabas): todos
// los aventureros empiezan en Aurelia, la capital
const DEFAULT_ZONE_ID = 0;
const DEFAULT_ZONE_DIR = 'aurelia';
const ZONE_TITLES = { aurelia: ['La capital', 'Aurelia'], pradera: ['Zona 1', 'Pradera Dorada'], cripta: ['Mazmorra', 'La Cripta del Vigía'] };
// recorrido del guía Tomás por Aurelia (lugar, posición en píxeles y qué hay ahí)
const AURELIA_TOUR = [
  { name: 'Catedral de Aethra', x: 59.5 * 32, y: 16 * 32, info: 'Aquí te curan y aquí despiertas si caes en combate.' },
  { name: 'Barrio de las Órdenes', x: 16 * 32, y: 45 * 32, info: 'Las casas de cada clase: tienda y maestro de tu oficio.' },
  { name: 'Barrio del Mercado', x: 76 * 32, y: 47 * 32, info: 'Lyra, los puestos y la casa de subastas de Durin.' },
  { name: 'El Grifo Dorado', x: 76 * 32, y: 63 * 32, info: 'La posada de Marta y el libro de visitas.' },
  { name: 'Puerta Sur', x: 59.5 * 32, y: 84 * 32, info: 'El Camino Real baja a la Pradera Dorada. La diligencia de Gaspar está al lado.' },
  { name: 'Pilar de Aethra', x: 60 * 32, y: 51 * 32, info: '¡Listo! Haz una ofrenda al Pilar para que la diosa bendiga tu viaje.' },
];
const plain = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// clase base de un compañero (las evolucionadas empiezan con el nombre de su clase base)
const baseOf = (m) => BASE_CLASSES.find((c) => plain(m.classCode ?? m.className).startsWith(c)) ?? 'guerrero';
const HUD_POLL_MS = 15000;

function isTyping(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function Bar({ value, max, kind, thin }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`hud-bar hud-bar--${kind}${thin ? ' hud-bar--thin' : ''}`}>
      <div className="hud-bar-fill" style={{ width: `${pct}%` }} />
      {!thin && <span>{value} / {max}</span>}
    </div>
  );
}

// Retratos de public/portraits/ (Title Case, ver Dashboard.js). Las clases evolucionadas no
// tienen retrato propio todavía: se muestra el ícono de su clase.
const PORTRAIT_FILES = { GUERRERO: 'Guerrero', MAGO: 'Mago', ARQUERO: 'Arquero', PICARO: 'Picaro', SACERDOTE: 'Sacerdote' };

function Portrait({ code, small }) {
  const file = PORTRAIT_FILES[code];
  if (file) return <img src={`${process.env.PUBLIC_URL}/portraits/${file}.png`} alt="" draggable="false" />;
  const icon = CLASS_ICON[code] ?? { name: 'person', artist: 'delapouite' };
  return <GameIcon name={icon.name} artist={icon.artist} className={small ? 'hud-portrait-icon--small' : ''} />;
}

export default function World() {
  const { player, token } = useAuth();
  const navigate = useNavigate();
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [stats, setStats] = useState(null);
  // combate en curso (el mapa queda dormido mientras tanto)
  const [battle, setBattle] = useState(null);
  const battleRef = useRef(null);
  battleRef.current = battle;
  // dónde despiertas si caes (lo avisa la escena al volver del combate)
  const reviveRef = useRef(null);
  useEffect(() => {
    const onRevive = ({ place }) => { reviveRef.current = place; };
    bus.on('hero-revive', onRevive);
    return () => bus.off('hero-revive', onRevive);
  }, []);
  const [party, setParty] = useState([]);
  // ventanas abiertas, en orden de apilado (la última queda adelante y es la que cierra Esc)
  const [open, setOpen] = useState([]);
  const [typing, setTyping] = useState(false);
  const [poi, setPoi] = useState(null);
  const [encounter, setEncounter] = useState(null);
  // desafío a un jefe esperando confirmación
  const [bossPrompt, setBossPrompt] = useState(null);
  // sube cada vez que algo cambia el equipo/inventario, para que los paneles abiertos se recarguen
  const [refreshKey, setRefreshKey] = useState(0);
  // conversación con un NPC, marcas de misión, subida de nivel y hora del día
  const [dialogue, setDialogue] = useState(null);
  const [npcMarks, setNpcMarks] = useState({});
  // misiones del jugador (para las marcas de los NPCs y el seguimiento de la derecha)
  const [quests, setQuests] = useState({ active: [], available: [] });
  // NPC con el que se abrió el tablón: muestra solo sus misiones (null = todas, el tablón del gremio)
  const [questGiver, setQuestGiver] = useState(null);
  // ids de las zonas del mundo abierto (las de etheria.json)
  const [continentZoneIds, setContinentZoneIds] = useState([]);
  // bufos del héroe que da el mundo (Paso de la ciudad…): iconos junto al minimapa, como en WoW
  const [buffs, setBuffs] = useState([]);
  // barra de lanzamiento (recolectar): { label, ms, key }
  const [cast, setCast] = useState(null);
  useEffect(() => {
    let t = null;
    const onCast = (c) => { clearTimeout(t); setCast({ ...c, key: Date.now() }); t = setTimeout(() => setCast(null), c.ms + 150); };
    const onDone = (r) => { if (r?.error) { clearTimeout(t); setCast(null); } };
    const onCancel = () => { clearTimeout(t); setCast(null); };
    bus.on('cast', onCast);
    bus.on('resource-gathered', onDone);
    bus.on('hearth-cancel', onCancel);
    return () => { clearTimeout(t); bus.off('cast', onCast); bus.off('resource-gathered', onDone); bus.off('hearth-cancel', onCancel); };
  }, []);
  const [levelUp, setLevelUp] = useState(null);
  const [clock, setClock] = useState(null);
  const [worldReady, setWorldReady] = useState(false);
  const [zoneId, setZoneId] = useState(DEFAULT_ZONE_ID);
  const [zoneDir, setZoneDir] = useState(null);
  const [zoneInfo, setZoneInfo] = useState({ name: null, music: 'pradera', key: 0 });
  const sceneDataRef = useRef(null);
  // subzona donde está el héroe (cartel al entrar y nombre en el minimapa) y clima
  const [subzone, setSubzone] = useState(null);
  const [subzoneBanner, setSubzoneBanner] = useState(null);
  const [weather, setWeather] = useState('despejado');

  // ---- datos del HUD ----
  // grupo de jugadores (co-op): con quién vas; se pide con el HUD y al momento cuando el
  // servidor avisa que el grupo cambió
  const [coop, setCoop] = useState(null);
  const coopRef = useRef(null);
  coopRef.current = coop;
  const loadCoop = useCallback(() => {
    if (!player || !token) return;
    api.getCoopParty(player.id, token).then(setCoop).catch(() => {});
  }, [player, token]);

  const loadHud = useCallback(() => {
    if (!player || !token) return;
    api.getPlayerStats(player.id, token).then(setStats).catch(() => {});
    api.getParty(player.id, token).then((p) => setParty(p.members ?? [])).catch(() => {});
    loadCoop();
  }, [player, token, loadCoop]);
  useEffect(() => {
    bus.on('coop-changed', loadCoop);
    return () => bus.off('coop-changed', loadCoop);
  }, [loadCoop]);
  // la escena pinta distinto a los de tu grupo
  const coopIds = (coop?.members ?? []).map((m) => m.id).join(',');
  useEffect(() => {
    if (worldReady) bus.emit('party-ids', coopIds ? coopIds.split(',').map(Number) : []);
  }, [worldReady, coopIds]);

  useEffect(() => {
    loadHud();
    const t = setInterval(loadHud, HUD_POLL_MS);
    return () => clearInterval(t);
  }, [loadHud]);

  // equipar/usar algo cambia stats, vida, maná: refrescar HUD y los dos paneles
  const onInventoryChanged = useCallback(() => {
    loadHud();
    setRefreshKey((k) => k + 1);
  }, [loadHud]);
  // avisos de fuera de las ventanas (una venta de tu muñeco, por ejemplo)
  useEffect(() => {
    bus.on('inventory-changed', onInventoryChanged);
    return () => bus.off('inventory-changed', onInventoryChanged);
  }, [onInventoryChanged]);

  // ---- ventanas ----
  const toggleWindow = useCallback((id) => {
    setOpen((list) => {
      audio.sfx(list.includes(id) ? 'cerrar' : 'abrir');
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  }, []);
  // algunas ventanas reciben datos al abrirse (p. ej. la ruta del maestro del gremio)
  const [winArgs, setWinArgs] = useState({});
  const openWin = useCallback((id, args) => {
    audio.sfx('abrir');
    if (args) setWinArgs((cur) => ({ ...cur, [id]: args }));
    setOpen((list) => [...list.filter((x) => x !== id), id]);
  }, []);
  const closeWin = useCallback((id) => { audio.sfx('cerrar'); setOpen((list) => list.filter((x) => x !== id)); }, []);
  const bringToFront = useCallback((id) => {
    setOpen((list) => (list[list.length - 1] === id ? list : [...list.filter((x) => x !== id), id]));
  }, []);

  // ---- juego (Phaser) ----
  const baseClass = stats ? (stats.classChain?.[0]?.code ?? stats.class?.code ?? '').toLowerCase() : null;
  useEffect(() => {
    if (!baseClass || !hostRef.current) return undefined;
    let startPos = null;
    try { startPos = JSON.parse(sessionStorage.getItem(POS_KEY)); } catch { /* sin posición guardada */ }
    let game = null;
    let disposed = false;
    const boot = () => {
      if (disposed) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: '#1a2416',
        pixelArt: true,
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        physics: { default: 'arcade', arcade: { debug: false } },
        input: { keyboard: { target: window } },
      });
      // posiciones guardadas antes de que existiera la ciudad: eran de la Pradera
      const zoneDirStart = startPos ? (startPos.zona ?? 'pradera') : DEFAULT_ZONE_DIR;
      const sceneData = {
        heroClass: BASE_CLASSES.includes(baseClass) ? baseClass : 'guerrero',
        heroName: stats.nickname,
        heroLevel: stats.level,
        startPos,
        zoneDir: zoneDirStart,
      };
      sceneDataRef.current = sceneData;
      game.scene.add('mundo', WorldScene, true, sceneData);
      game.scene.add('batalla', BattleScene, false);
      gameRef.current = game;
      if (process.env.NODE_ENV === 'development') window.etheriaGame = game; // para inspeccionar desde la consola
    };
    // los letreros de Phaser se dibujan una sola vez: esperar a que la fuente esté cargada
    Promise.all([document.fonts.load('700 9px Cinzel'), document.fonts.load('700 16px Cinzel')])
      .catch(() => {})
      .then(boot);
    return () => { disposed = true; gameRef.current = null; game?.destroy(true); };
    // stats solo se usa para el arranque: no recrear el juego cada vez que se refresca el HUD
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseClass]);

  // ---- eventos que vienen del mapa ----
  useEffect(() => {
    const onPoi = (p) => setPoi(p);
    // los NPCs con diálogo primero conversan; el resto abre su ventana directamente
    const onInteract = (p) => {
      if (p?.dialogue) setDialogue(p.dialogue);
      else if (p?.window) {
        if (p.window === 'misiones_gremio') setQuestGiver(null); // el tablón muestra todas
        openWin(p.window, p.args);
      }
    };
    const onEncounter = (e) => {
      // en grupo, el servidor suma a los compañeros que estén cerca (ver combat.js worldGroup)
      if (e.kind === 'zone') e = { ...e, group: !!coopRef.current?.members?.length };
      setEncounter(e);
      sessionStorage.setItem(POS_KEY, JSON.stringify(e.position));
      // tras el aviso "¡Combate!" entra la escena de batalla (sin cambiar de página)
      setTimeout(() => { setEncounter(null); setBattle(e); }, 1300);
    };
    const onBossChallenge = (b) => setBossPrompt(b);
    // un compañero de grupo empezó un combate cerca: entras con él (si estás libre)
    const onCoopBattle = (b) => { if (!battleRef.current) bus.emit('coop-battle-join', b); };
    // ventanas que piden abrir otras partes (p. ej. Inspeccionar desde el menú de un jugador)
    const onOpenWindow = ({ id, args }) => openWin(id, args);
    bus.on('coop-battle', onCoopBattle);
    bus.on('open-window', onOpenWindow);
    bus.on('poi', onPoi);
    bus.on('interact', onInteract);
    bus.on('encounter', onEncounter);
    bus.on('boss-challenge', onBossChallenge);
    return () => {
      bus.off('coop-battle', onCoopBattle); bus.off('open-window', onOpenWindow);
      bus.off('poi', onPoi); bus.off('interact', onInteract); bus.off('encounter', onEncounter); bus.off('boss-challenge', onBossChallenge);
    };
  }, [navigate, openWin]);

  // ---- mundo vivo: compañeros, mascota, recursos, marcas de misión, música ----
  useEffect(() => {
    const onReady = (z) => {
      if (z?.zoneId != null) setZoneId(z.zoneId);
      if (z?.zoneDir) setZoneDir(z.zoneDir);
      if (z?.zoneIds) setContinentZoneIds((cur) => (cur.join() === z.zoneIds.join() ? cur : z.zoneIds));
      setBuffs(z?.buffs ?? []);
      setZoneInfo((cur) => ({ name: z?.name, dir: z?.zoneDir, music: z?.music ?? 'pradera', key: cur.key + 1 }));
      setWorldReady(true);
    };
    const onClock = (c) => setClock(c);
    let bannerTimer = null;
    const onSubzone = (sz) => {
      setSubzone(sz);
      setSubzoneBanner({ ...sz, key: Date.now() });
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => setSubzoneBanner(null), 3800);
    };
    const onWeather = (w) => setWeather(w);
    bus.on('world-ready', onReady);
    bus.on('clock', onClock);
    bus.on('subzone', onSubzone);
    bus.on('weather', onWeather);
    return () => {
      clearTimeout(bannerTimer);
      bus.off('world-ready', onReady); bus.off('clock', onClock); bus.off('subzone', onSubzone); bus.off('weather', onWeather);
    };
  }, []);

  useEffect(() => {
    audio.music(battle ? (battle.kind === 'boss' || battle.kind === 'mythic' || battle.target === 'jefe' ? 'jefe' : 'batalla') : zoneInfo.music);
  }, [battle, zoneInfo.music]);

  // ---- salto de zona (diligencia, salidas a zonas fuera del continente) ----
  // Las zonas de etheria.json se cruzan caminando; un viaje dentro del continente solo mueve al
  // héroe (fundido corto, sin desmontar la escena). Solo una zona fuera del continente remonta.
  useEffect(() => {
    const onZone = ({ zoneDir: dir, x, y }) => {
      const pos = { x, y, zona: dir };
      sessionStorage.setItem(POS_KEY, JSON.stringify(pos));
      let moved = false;
      bus.emit('teleport', { zoneDir: dir, x, y }, (ok) => { moved = ok; });
      if (moved) return;
      setWorldReady(false);
      setPoi(null);
      const sc = gameRef.current?.scene.getScene('mundo');
      if (!sc) return;
      const data = { ...sceneDataRef.current, heroLevel: stats?.level ?? sceneDataRef.current?.heroLevel, startPos: pos, zoneDir: dir };
      sceneDataRef.current = data;
      sc.scene.restart(data);
    };
    bus.on('zone-change', onZone);
    return () => bus.off('zone-change', onZone);
  }, [stats?.level]);

  // ---- acciones de los diálogos: recorrido del guía, viajes en diligencia ----
  const onDialogueAction = useCallback(async (o) => {
    if (o.action === 'tour') {
      bus.emit('social-tour', AURELIA_TOUR);
      bus.emit('social-toast', { text: 'Tomás: «¡Sígueme! La flecha verde te lleva a cada lugar.»', kind: 'tour' });
    } else if (o.action === 'muneco') {
      // Pip el titiritero vende el muñeco de venta
      try {
        const r = await api.comprarMuneco(player.id, token);
        audio.sfx('monedas');
        bus.emit('social-toast', { text: `🧸 ${r.message} Úsalo desde la mochila en el Barrio del Mercado.`, kind: 'ok' });
        loadHud();
        setRefreshKey((k) => k + 1);
      } catch (err) {
        audio.sfx('error');
        bus.emit('social-toast', { text: err.message, kind: 'error' });
      }
    } else if (o.action === 'viaje') {
      try {
        const r = await api.travel(player.id, o.destino, token);
        audio.sfx('monedas');
        loadHud();
        bus.emit('zone-change', { zoneDir: r.zona, x: r.x, y: r.y });
      } catch (err) {
        audio.sfx('error');
        bus.emit('social-toast', { text: err.message, kind: 'error' });
      }
    }
  }, [player, token, loadHud]);
  useEffect(() => () => audio.music(null), []);

  // ---- piedra de regreso (tecla V): la escena la canaliza unos segundos y el servidor lleva
  // a qué estatua está vinculada y la recarga de 20 minutos ----
  const [piedra, setPiedra] = useState(null);
  const [, setPiedraTick] = useState(0);
  useEffect(() => {
    if (!player) return undefined;
    api.getPiedra(player.id, token).then(setPiedra).catch(() => {});
    const t = setInterval(() => setPiedraTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, [player, token]);
  const piedraLeft = piedra?.readyAt ? Math.max(0, new Date(piedra.readyAt).getTime() - Date.now()) : 0;
  const castStone = useCallback(() => {
    if (battleRef.current || !piedra) return;
    const left = piedra.readyAt ? new Date(piedra.readyAt).getTime() - Date.now() : 0;
    if (left > 0) {
      audio.sfx('error');
      bus.emit('social-toast', { text: `La piedra todavía no tiene fuerza. Estará lista en ${Math.ceil(left / 60000)} min.`, kind: 'error' });
      return;
    }
    bus.emit('hearth-start', { ms: HEARTH_MS }, (ok) => {
      if (!ok) return;
      audio.sfx('piedra');
      bus.emit('cast', { label: `Piedra de regreso · ${piedra.nombre}`, ms: HEARTH_MS });
    });
  }, [piedra]);
  useEffect(() => {
    if (!player) return undefined;
    const onDone = async () => {
      try {
        const r = await api.usarPiedra(player.id, token);
        setPiedra(r);
        bus.emit('zone-change', { zoneDir: r.destino.zona, x: r.destino.x, y: r.destino.y });
        setTimeout(() => { audio.sfx('vinculo'); bus.emit('hearth-arrive'); }, 650);
        bus.emit('social-toast', { text: `La piedra te devuelve a ${r.lugar}.`, kind: 'tour' });
      } catch (err) {
        audio.sfx('error');
        bus.emit('social-toast', { text: err.message, kind: 'error' });
        api.getPiedra(player.id, token).then(setPiedra).catch(() => {});
      }
    };
    const onCancel = ({ reason }) => bus.emit('social-toast', {
      text: reason === 'combate' ? '¡Te atacaron! Perdiste la concentración.' : 'Te moviste y la piedra se apagó.', kind: 'error',
    });
    bus.on('hearth-done', onDone);
    bus.on('hearth-cancel', onCancel);
    return () => { bus.off('hearth-done', onDone); bus.off('hearth-cancel', onCancel); };
  }, [player, token]);

  // compañeros del grupo caminando detrás del héroe
  const partyKey = party.filter((m) => !m.isHero).map(baseOf).join(',');
  useEffect(() => {
    if (worldReady) bus.emit('world-party', partyKey ? partyKey.split(',') : []);
  }, [worldReady, partyKey]);

  // mascota activa siguiéndote
  useEffect(() => {
    if (!worldReady || !player) return;
    api.getPets(player.id, token)
      .then((pets) => { const a = pets.find((p) => p.is_active); bus.emit('world-pet', a ? speciesOf(a.name) : null); })
      .catch(() => {});
  }, [worldReady, player, token, refreshKey]);

  // estado de los recursos del mapa (hierbas, vetas, cofres)
  useEffect(() => {
    if (!worldReady || !player) return;
    api.getWorldNodes(player.id, zoneId, token).then((list) => bus.emit('resources-state', list)).catch(() => {});
  }, [worldReady, player, token, zoneId]);

  useEffect(() => {
    const onGather = async ({ id }) => {
      try {
        const r = await api.gatherWorldNode(player.id, id, token);
        bus.emit('resource-gathered', { id, ...r });
        loadHud();
        setRefreshKey((k) => k + 1);
      } catch (err) {
        audio.sfx('error');
        bus.emit('resource-gathered', { id, error: err.message });
      }
    };
    bus.on('gather', onGather);
    return () => bus.off('gather', onGather);
  }, [player, token, loadHud]);

  // Misiones en el mundo (estilo WoW, ver game/questGivers.js): cada NPC que da misiones lleva
  // "?" si tienes algo para entregarle, "!" si tiene una que ya puedes aceptar y "!" gris si
  // tendrá una cuando subas un poco más. Todo el mundo abierto a la vez, no solo tu zona.
  useEffect(() => {
    if (!player) return;
    Promise.all([api.getActiveQuests(player.id, token), api.getAvailableQuests(player.id, token)])
      .then(([active, available]) => setQuests({ active, available }))
      .catch(() => {});
  }, [player, token, refreshKey, stats?.level]);
  // Al entrar al mundo: si quedó un combate abierto (recargaste la página, se cortó la conexión
  // o un compañero sigue peleando el combate de tu grupo) se retoma en vez de dejarte "afuera"
  // pero atrapado en él (el servidor no te dejaría empezar otro ni sumarte al de tu grupo).
  const resumeChecked = useRef(false);
  useEffect(() => {
    if (!worldReady || !player || resumeChecked.current) return;
    resumeChecked.current = true;
    api.getActiveCombatSession(token).then((s) => {
      if (s?.session && s.session.status === 'IN_PROGRESS' && !battleRef.current) {
        bus.emit('coop-battle-join', { kind: 'retomar', zoneId, leaderName: null });
      }
    }).catch(() => {});
  }, [worldReady, player, token, zoneId]);

  // aceptaste una misión que te compartió tu grupo: se recargan el rastreador y las marcas
  useEffect(() => {
    const onQuests = () => setRefreshKey((k) => k + 1);
    bus.on('quests-changed', onQuests);
    return () => bus.off('quests-changed', onQuests);
  }, []);
  useEffect(() => {
    setNpcMarks(questMarks({ ...quests, level: stats?.level ?? 1, continentZoneIds }));
  }, [quests, stats?.level, continentZoneIds]);
  useEffect(() => { if (worldReady) bus.emit('npc-marks', npcMarks); }, [worldReady, npcMarks]);

  // subida de nivel: cartel, fanfarria y columna de luz en el mapa
  const prevStats = useRef(null);
  useEffect(() => {
    if (!stats) return;
    const prev = prevStats.current;
    prevStats.current = stats;
    if (prev && stats.level > prev.level) {
      setLevelUp({ level: stats.level, before: prev, after: stats });
      audio.jingle('nivel');
      bus.emit('level-up');
    }
    bus.emit('hero-level', stats.level);
  }, [stats]);

  const confirmBoss = useCallback(() => {
    const b = bossPrompt;
    if (!b) return;
    if (b.kind === 'mythic' && stats && stats.level < b.level) return;
    setBossPrompt(null);
    gameRef.current?.scene.getScene('mundo')?.lockForBattle();
    bus.emit('encounter', b);
  }, [bossPrompt, stats]);

  // El chat global se vuelve semitransparente dentro del mundo (ver World.css: body.en-mundo)
  useEffect(() => {
    document.body.classList.add('en-mundo');
    return () => document.body.classList.remove('en-mundo');
  }, []);

  // ---- teclado: el mapa no escucha mientras escribes (las ventanas no lo bloquean) ----
  useEffect(() => {
    bus.emit('input-enabled', !typing && !bossPrompt && !dialogue);
  }, [typing, bossPrompt, dialogue]);

  useEffect(() => {
    const onFocusIn = (e) => setTyping(isTyping(e.target));
    const onFocusOut = () => setTyping(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => { document.removeEventListener('focusin', onFocusIn); document.removeEventListener('focusout', onFocusOut); };
  }, []);

  // durante el combate se esconde el chat (body.en-combate, ver Battle.css)
  useEffect(() => {
    document.body.classList.toggle('en-combate', !!battle);
    return () => document.body.classList.remove('en-combate');
  }, [battle]);

  const finishBattle = useCallback(({ status, redirect, rewards } = {}) => {
    if (redirect) { navigate(redirect); return; }
    const game = gameRef.current;
    if (game) {
      game.scene.stop('batalla');
      game.scene.wake('mundo', { result: status });
    }
    // botín del combate flotando sobre el héroe al volver al mapa
    if (status === 'PLAYER_WON') bus.emit('guide-event', 'combate');
    if (status === 'PLAYER_WON' && rewards) {
      const lines = [];
      if (rewards.xp) lines.push({ text: `+${Number(rewards.xp).toLocaleString()} XP`, color: '#8fc9ff' });
      if (rewards.gold) lines.push({ text: `+${Number(rewards.gold).toLocaleString()} oro`, color: '#ffd84a' });
      (rewards.itemsDropped ?? []).forEach((d) => lines.push({ text: `+${d.quantity} ${d.itemName}`, color: '#bfffcf' }));
      setTimeout(() => bus.emit('float-loot', lines), 500);
    }
    if (status === 'ENEMY_WON') {
      sessionStorage.removeItem(POS_KEY);
      // despiertas en tu refugio con la mitad de la vida (y pierdes un poco de oro)
      api.revive(player.id, token)
        .then((r) => {
          if (!r?.revived) return;
          const place = reviveRef.current;
          const where = place ? `junto a ${place}` : 'en el inicio de la zona';
          bus.emit('social-toast', { text: `Despiertas ${where}, aturdido.${r.goldLost ? ` Perdiste ${r.goldLost.toLocaleString()} de oro.` : ''}`, kind: 'tour' });
        })
        .catch(() => {})
        .finally(() => loadHud());
    }
    setBattle(null);
    loadHud();
    setRefreshKey((k) => k + 1);
  }, [navigate, loadHud, player, token]);

  // Guía del aventurero: la primera hora del jugador, paso a paso (ver components/world/useGuide.js)
  const [newSlots, setNewSlots] = useState([]);
  const onGuideReward = useCallback((rw, st) => {
    const fresh = st?.newPlayer ? rw.unlocks ?? [] : [];
    const extra = fresh.length ? ` Nuevo en la barra: ${fresh.map((id) => WINDOWS[id]?.title).filter(Boolean).join(', ')}.` : '';
    bus.emit('social-toast', { text: `✦ ${rw.title}: +${rw.gold} oro, +${rw.xp} XP.${extra}`, kind: 'tour' });
    if (fresh.length) { setNewSlots(fresh); setTimeout(() => setNewSlots([]), 9000); }
    loadHud();
  }, [loadHud]);
  // exploración: niebla del mapa, subzonas descubiertas y cofres secretos
  useExploration({ player, token, worldReady, zoneDir, subzone, onChanged: loadHud });
  // calendario de eventos (fichas bajo el minimapa, avisos y el mercader en el mapa)
  const calendar = useEvents(worldReady);
  // la Cripta del Vigía: avance del recorrido (solo dentro de la mazmorra)
  const crypt = useCrypt({ player, token, worldReady, zoneDir, onChanged: loadHud });
  const { guide, skip: skipGuide } = useGuide({ player, token, worldReady, open, dialogue, zoneDir, onReward: onGuideReward });
  // jugador nuevo: la barra se va encendiendo con la guía (null = todo encendido)
  const unlocked = guide?.unlocked ?? null;
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;
  const toolbar = unlocked ? TOOLBAR.filter((id) => unlocked.includes(id)) : TOOLBAR;
  // menú de ventanas del celular (☰): todas las de la barra en una cuadrícula
  const [menuOpen, setMenuOpen] = useState(false);

  // atajos de las ventanas (cambiables en "Atajos de teclado")
  const [keymap, setKeymap] = useState(() => keyBindings(WINDOWS));
  useEffect(() => {
    const onChange = () => setKeymap(keyBindings(WINDOWS));
    bus.on('keybinds-changed', onChange);
    return () => bus.off('keybinds-changed', onChange);
  }, []);
  const keyToWindow = useMemo(() => Object.fromEntries(Object.entries(keymap).map(([id, k]) => [k, id])), [keymap]);

  const bossPromptRef = useRef(null);
  bossPromptRef.current = bossPrompt;
  const dialogueRef = useRef(null);
  dialogueRef.current = dialogue;

  useEffect(() => {
    const onKey = (e) => {
      if (battleRef.current) return; // el combate tiene sus propios atajos
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (bossPromptRef.current) {
        if (e.key === 'Enter') { e.preventDefault(); confirmBoss(); }
        if (e.key === 'Escape') setBossPrompt(null);
        return;
      }
      if (dialogueRef.current) return; // el diálogo maneja sus teclas
      if (e.key === 'Escape') { setOpen((list) => { if (list.length) audio.sfx('cerrar'); return list.slice(0, -1); }); return; }
      if (e.key === 'Enter') {
        const chat = document.querySelector('.chat-box input');
        if (chat) { e.preventDefault(); chat.focus(); }
        return;
      }
      if (e.key.toLowerCase() === STONE_KEY) { e.preventDefault(); castStone(); return; }
      const id = keyToWindow[e.key.toLowerCase()];
      if (id && unlockedRef.current && TOOLBAR.includes(id) && !unlockedRef.current.includes(id)) return; // aún apagada
      if (id) { e.preventDefault(); toggleWindow(id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleWindow, confirmBoss, castStone, keyToWindow]);

  const heroMember = party.find((m) => m.isHero);
  const companions = party.filter((m) => !m.isHero);
  const heroCode = stats ? (stats.classChain?.[0]?.code ?? stats.class?.code) : null;
  const xpPct = stats && stats.xpNeededForLevel > 0 ? Math.min(100, (stats.xpIntoLevel / stats.xpNeededForLevel) * 100) : 0;

  return (
    <div className={`world-root${battle ? ' world-root--battle' : ''}`}>
      <div className="world-canvas" ref={hostRef} />

      {battle && gameRef.current && (
        <Battle game={gameRef.current} encounter={battle} heroBaseClass={baseClass} onFinish={finishBattle} />
      )}

      {/* ---- marco del héroe (arriba a la izquierda) ---- */}
      {stats && (
        <div className="hud-unit">
          <div className="hud-portrait">
            <Portrait code={heroCode} />
            <span className="hud-level" title="Nivel">{stats.level}</span>
          </div>
          <div className="hud-unit-body">
            <div className="hud-unit-name">
              <span>{stats.nickname}</span>
              <small>{heroMember?.className ?? stats.class?.name}</small>
            </div>
            <Bar value={stats.hp} max={stats.maxHp} kind="hp" />
            <Bar value={stats.mana} max={stats.maxMana} kind="mp" />
            <div className="hud-gold"><GameIcon name="two-coins" artist="delapouite" /> {Number(stats.gold).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* ---- compañeros del grupo (tus contratados) y jugadores de tu grupo ---- */}
      {(companions.length > 0 || coop?.members?.length > 0) && (
        <div className={`hud-party${coop?.members?.length ? ' hud-party--coop' : ''}`}>
          {coop?.members?.length > 0 && (
            <div className="hud-coop">
              <div className="hud-coop-head">
                <span>⚔ Grupo{coop.isLeader ? ' · eres líder' : ''}</span>
                <button type="button" title="Salir del grupo" onClick={async () => { await api.leaveCoopParty(player.id, token).catch(() => {}); loadCoop(); window.dispatchEvent(new Event('coop-refresh')); }}>Salir</button>
              </div>
              {coop.members.map((m) => (
                <div className="hud-party-member hud-coop-member" key={`coop-${m.id}`} title="Clic: opciones" onClick={(e) => bus.emit('player-menu', { id: m.id, name: m.nickname, level: m.level, x: e.clientX, y: e.clientY })}>
                  <div className="hud-party-icon"><Portrait code={m.class_code} small /></div>
                  <div className="hud-party-body">
                    <div className="hud-party-name">{m.nickname} <small>Nv. {m.level}</small></div>
                    <Bar value={m.hp} max={m.max_hp} kind="hp" thin />
                    <Bar value={m.mana} max={m.max_mana} kind="mp" thin />
                  </div>
                </div>
              ))}
            </div>
          )}
          {companions.map((m) => (
            <div className="hud-party-member" key={m.slot}>
              <div className="hud-party-icon"><Portrait code={m.classCode} small /></div>
              <div className="hud-party-body">
                <div className="hud-party-name">{m.name} <small>Nv. {m.level}</small></div>
                <Bar value={m.hp} max={m.maxHp} kind="hp" thin />
                <Bar value={m.mana} max={m.maxMana} kind="mp" thin />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- minimapa: el mapa lo dibuja Phaser, acá solo el marco ---- */}
      <div className="hud-minimap" style={{ width: MINIMAP.width, height: MINIMAP.height, top: MINIMAP.margin, right: MINIMAP.margin }}>
        <span className="hud-minimap-zone" title={zoneInfo.name ?? ''}>{subzone?.name ?? zoneInfo.name ?? ''}</span>
        {clock && (
          <span className={`hud-clock${clock.night ? ' hud-clock--night' : ''}`} title={clock.night ? 'Noche' : 'Día'}>
            <GameIcon name={clock.night ? 'moon' : 'sun'} artist="lorc" />
            {String(clock.hour).padStart(2, '0')}:00
            {weather === 'lluvia' && <GameIcon name="raining" artist="lorc" />}
            {weather === 'niebla' && <GameIcon name="fog" artist="delapouite" />}
          </span>
        )}
      </div>
      {/* ---- objetivo: con quién o qué interactúas (E), a la derecha del marco del héroe ---- */}
      {!battle && !dialogue && <TargetFrame poi={poi} marks={npcMarks} />}

      {/* ---- barra de lanzamiento (recolectar) ---- */}
      {cast && !battle && (
        <div className="hud-cast" key={cast.key}>
          <div className="hud-cast-fill" style={{ animationDuration: `${cast.ms}ms` }} />
          <span>{cast.label}</span>
        </div>
      )}

      {!battle && buffs.length > 0 && (
        <div className="hud-buffs" style={{ top: MINIMAP.margin + 2, right: MINIMAP.margin + MINIMAP.width + 16 }}>
          {buffs.map((b) => (
            <div className="hud-buff" key={b.id} tabIndex={0}>
              <GameIcon name={b.icon[0]} artist={b.icon[1]} />
              <small>{b.label ?? '∞'}</small>
              <div className="hud-buff-tip" role="tooltip"><b>{b.name}</b><span>{b.desc}</span></div>
            </div>
          ))}
        </div>
      )}
      {!battle && <SoundControl />}
      {/* celular / tablet: joystick para moverse */}
      <TouchControls hidden={!!battle || !!dialogue || !worldReady} />
      {/* columna derecha bajo el minimapa: eventos, guía y misiones apilados (sin pisarse) */}
      {!battle && (
        <div className="hud-right" style={{ top: MINIMAP.margin + MINIMAP.height + 8, right: MINIMAP.margin }}>
          <EventChips cal={calendar} onOpen={() => openWin('calendario')} />
          <CryptTracker crypt={crypt} />
          <GuideTracker
            guide={guide}
            onSkip={skipGuide}
            onToast={(text) => bus.emit('social-toast', { text, kind: 'tour' })}
          />
          <QuestTracker active={quests.active} continentZoneIds={continentZoneIds} onOpen={() => openWin('misiones')} />
        </div>
      )}

      {/* ---- conversación con un NPC ---- */}
      {dialogue && (
        <DialogueBox
          id={dialogue}
          ctx={{ night: !!clock?.night, mark: npcMarks[dialogue] ?? null }}
          onOpenWindow={(win) => {
            // el tablón abierto desde un NPC muestra solo sus misiones
            if (win === 'misiones_gremio') setQuestGiver(dialogue);
            openWin(win);
          }}
          onAction={onDialogueAction}
          onClose={() => setDialogue(null)}
        />
      )}

      {levelUp && <LevelUpBanner {...levelUp} onDone={() => setLevelUp(null)} />}

      {/* otros jugadores, globitos, gestos, emojis (T) y menú al hacer clic en alguien */}
      <WorldSocial worldReady={worldReady} zoneDir={zoneDir} baseClass={baseClass} inBattle={!!battle} level={stats?.level} coop={coop} onCoopChanged={loadCoop} />
      {/* jefe mítico de zona: aviso, barra de vida compartida y botín */}
      <MythicHunt worldReady={worldReady} inBattle={!!battle} />

      {/* ---- barra de acciones con experiencia (abajo al centro) ---- */}
      <div className="hud-actionbar">
        {stats && (
          <div className="hud-xp" title={`${stats.xpIntoLevel} / ${stats.xpNeededForLevel} XP`}>
            <div className="hud-xp-fill" style={{ width: `${xpPct}%` }} />
            <span>Nivel {stats.level} · {xpPct.toFixed(1)}%</span>
          </div>
        )}
        <div className="hud-slots">
          {toolbar.map((id) => {
            const w = WINDOWS[id];
            const k = (keymap[id] ?? w.key ?? '').toUpperCase();
            return (
              <button
                key={id}
                type="button"
                className={`hud-slot${open.includes(id) ? ' hud-slot--active' : ''}${newSlots.includes(id) ? ' hud-slot--new' : ''}${QUICK.includes(id) ? ' hud-slot--quick' : ''}`}
                aria-label={`${w.title} (${k})`}
                onClick={() => toggleWindow(id)}
              >
                <GameIcon name={w.icon[0]} artist={w.icon[1]} />
                <kbd>{k}</kbd>
                <span className="hud-tooltip">{w.title}</span>
              </button>
            );
          })}
          <span className="hud-slots-sep" />
          {/* piedra de regreso: el arco oscuro muestra cuánto le falta para recargarse */}
          <button
            type="button"
            className={`hud-slot hud-slot--piedra${piedraLeft ? ' hud-slot--cd' : ''}`}
            aria-label="Piedra de regreso (V)"
            style={{ '--cd': piedraLeft ? piedraLeft / ((piedra?.recargaMin ?? 20) * 60000) : 0 }}
            onClick={castStone}
          >
            <img src={`${process.env.PUBLIC_URL}/assets/mundo/vinculo/piedra_regreso.png`} alt="" />
            {piedraLeft > 0 && <span className="hud-slot-cd">{Math.ceil(piedraLeft / 60000)}m</span>}
            <kbd>{STONE_KEY.toUpperCase()}</kbd>
            <span className="hud-tooltip">
              Piedra de regreso{piedra ? ` · ${piedra.nombre}` : ''}
              {piedraLeft > 0 && <small> · lista en {Math.ceil(piedraLeft / 60000)} min</small>}
            </span>
          </button>
          {/* celular: todas las ventanas en una cuadrícula */}
          <button
            type="button"
            className={`hud-slot hud-slot--menu${menuOpen ? ' hud-slot--active' : ''}${newSlots.some((id) => !QUICK.includes(id)) ? ' hud-slot--new' : ''}`}
            aria-label="Menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hud-menu-icon" aria-hidden="true">☰</span>
          </button>
          <span className="hud-slots-sep" />
          <button type="button" className={`hud-slot hud-slot--teclas${open.includes('teclas') ? ' hud-slot--active' : ''}`} aria-label="Atajos de teclado" onClick={() => toggleWindow('teclas')}>
            <GameIcon name="keyboard" artist="delapouite" />
            <span className="hud-tooltip">Atajos de teclado</span>
          </button>
          <button type="button" className="hud-slot" aria-label="Salir del mundo" onClick={() => navigate('/')}>
            <GameIcon name="house" artist="delapouite" />
            <span className="hud-tooltip">Salir del mundo</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className="hud-menu-sheet" onClick={() => setMenuOpen(false)}>
          <div className="hud-menu-grid" role="menu" aria-label="Ventanas">
            {toolbar.map((id) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className={`hud-menu-item${open.includes(id) ? ' is-open' : ''}${newSlots.includes(id) ? ' is-new' : ''}`}
                onClick={() => toggleWindow(id)}
              >
                <GameIcon name={WINDOWS[id].icon[0]} artist={WINDOWS[id].icon[1]} />
                <span>{WINDOWS[id].title}</span>
              </button>
            ))}
            <button type="button" role="menuitem" className="hud-menu-item" onClick={() => navigate('/')}>
              <GameIcon name="house" artist="delapouite" />
              <span>Salir del mundo</span>
            </button>
          </div>
        </div>
      )}

      {/* ---- acción contextual (abajo a la derecha) ---- */}
      {poi && !open.includes(poi.window) && !encounter && !dialogue && (
        <button
          type="button"
          className={`hud-context${poi.boss || poi.mythic ? ' hud-context--boss' : ''}${poi.resource ? ' hud-context--gather' : ''}`}
          onClick={() => {
            const scene = gameRef.current?.scene.getScene('mundo');
            if (poi.boss) scene?.challengeBoss(poi.boss);
            else if (poi.mythic) scene?.challengeMythic();
            else if (poi.secret) bus.emit('secret-open', poi.secret);
            else if (poi.action) scene?.cryptAction(poi);
            else if (poi.resource) { const r = scene?.resources.get(poi.resource.id); if (r) scene.gather(r); }
            else if (poi.dialogue) setDialogue(poi.dialogue);
            else if (poi.window) openWin(poi.window);
          }}
        >
          <span className="hud-context-key">E</span>
          <span className="hud-context-label">{poi.label}</span>
        </button>
      )}

      {/* ---- confirmación para desafiar a un jefe ---- */}
      {bossPrompt && (
        <div className="boss-prompt">
          <div className="boss-prompt-box">
            <small className={`boss-prompt-rank boss-prompt-rank--${bossPrompt.rank}`}>
              {bossPrompt.rank === 'mitico' ? 'Jefe mítico' : bossPrompt.kind === 'cripta' ? 'Jefe de la mazmorra' : bossPrompt.rank === 'jefe' ? 'Jefe de zona' : 'Minijefe'}
            </small>
            <h2>{bossPrompt.name}</h2>
            {bossPrompt.kind === 'mythic' ? (
              <>
                <p>Vida compartida: {Number(bossPrompt.hp).toLocaleString()} / {Number(bossPrompt.maxHp).toLocaleString()}</p>
                <p className="boss-prompt-note">Cada intento le resta vida para todos. Cuando caiga, el botín se reparte según cuánto daño hiciste. Nivel mínimo {bossPrompt.level}.</p>
                {stats && stats.level < bossPrompt.level && <p className="boss-prompt-warn">⚠ Necesitas nivel {bossPrompt.level} para enfrentarlo. Sigue cazando y vuelve.</p>}
              </>
            ) : bossPrompt.kind === 'cripta' ? (
              <>
                <p>Nivel {bossPrompt.level}</p>
                <p className="boss-prompt-note">Cuando su faro apunte a alguien, ese héroe debe usar <b>Defender</b> en su turno o perderá media vida. Su escudo cambia de debilidad cada vez que se recupera de una rotura: mira cuál tiene.</p>
              </>
            ) : <p>Nivel {bossPrompt.level}</p>}
            {bossPrompt.kind !== 'mythic' && stats && stats.level < bossPrompt.level - 3 && (
              <p className="boss-prompt-warn">⚠ Es mucho más fuerte que tú (nivel {stats.level}). Ve con tu grupo completo y pociones.</p>
            )}
            <div className="boss-prompt-actions">
              <button type="button" className="boss-prompt-go" onClick={confirmBoss} disabled={bossPrompt.kind === 'mythic' && !!stats && stats.level < bossPrompt.level}>Desafiar <kbd>Enter</kbd></button>
              <button type="button" className="boss-prompt-no" onClick={() => setBossPrompt(null)}>Ahora no <kbd>Esc</kbd></button>
            </div>
          </div>
        </div>
      )}

      {/* ---- nombre de la zona al entrar y de cada subzona al cruzarla (como en WoW) ---- */}
      {zoneInfo.name && (
        <div className="hud-zone-title" aria-hidden="true" key={zoneInfo.key}>
          <small>{ZONE_TITLES[zoneInfo.dir]?.[0] ?? ''}</small>
          {ZONE_TITLES[zoneInfo.dir]?.[1] ?? zoneInfo.name}
        </div>
      )}
      {subzoneBanner && subzoneBanner.name !== zoneInfo.name && (
        <div className={`hud-subzone${subzoneBanner.safe ? ' hud-subzone--safe' : ''}`} key={subzoneBanner.key} aria-hidden="true">
          {subzoneBanner.name}
          <small>{subzoneBanner.safe ? 'Zona segura' : `Niveles ${subzoneBanner.levels}`}</small>
        </div>
      )}

      {encounter && (
        <div className="world-encounter">
          <div className={`world-encounter-text${encounter.kind === 'boss' || encounter.kind === 'mythic' || encounter.target === 'jefe' ? ' world-encounter-text--boss' : ''}`}>
            <small>{encounter.kind === 'cripta' ? (encounter.target === 'jefe' ? 'Jefe de la mazmorra' : '¡Un guardián te vio!') : encounter.kind === 'retomar' ? 'Tu combate seguía abierto' : encounter.kind === 'grupo' ? '¡Combate en grupo!' : encounter.kind === 'esbirro' ? 'Esbirro de Aullaluna' : encounter.kind === 'mythic' ? 'Jefe mítico' : encounter.kind === 'boss' ? (encounter.rank === 'jefe' ? 'Jefe de zona' : 'Minijefe') : '¡Combate!'}</small>
            {encounter.kind === 'cripta' ? encounter.name : encounter.kind === 'retomar' ? '¡Vuelves a la pelea!' : encounter.kind === 'grupo' ? `${encounter.name ?? 'Tu grupo'} necesita tu ayuda` : encounter.kind === 'boss' || encounter.kind === 'mythic' ? encounter.name : (encounter.name ? `Un ${encounter.name} te ataca` : '¡Algo se mueve entre la hierba!')}
          </div>
        </div>
      )}

      {/* Paneles flotantes. Portal a <body> en una capa propia: así quedan por encima del chat
          global, pero la capa deja pasar los clics al mapa (solo los paneles los reciben). */}
      {stats && createPortal(
        <div className="wp-layer">
          {open.map((id, i) => {
            const w = WINDOWS[id];
            const common = {
              zIndex: 10 + i,
              onActivate: () => bringToFront(id),
              onClose: () => closeWin(id),
              defaultPos: defaultPosFor(w),
            };
            if (w.embed) {
              const path = winArgs[id]?.path ?? w.embed;
              return <EmbedPanel key={`${id}:${path}`} {...common} id={id} title={w.title} icon={w.icon} path={path} openWindow={openWin} />;
            }
            const Panel = w.panel;
            return (
              <Panel
                key={id}
                {...common}
                {...w.props}
                args={winArgs[id]}
                coop={coop}
                onCoopChanged={loadCoop}
                piedra={piedra}
                onPiedra={(r) => { setPiedra(r); bus.emit('guide-event', 'piedra'); }}
                onUseStone={castStone}
                stats={stats}
                party={party}
                gold={stats.gold}
                refreshKey={refreshKey}
                onChanged={onInventoryChanged}
                openWindow={openWin}
                giver={id === 'misiones_gremio' ? questGiver : undefined}
                onClearGiver={() => setQuestGiver(null)}
                continentZoneIds={continentZoneIds}
                windows={WINDOWS}
              />
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
