import { useCallback, useEffect, useRef, useState } from 'react';
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
import { AchievementsPanel, InfirmaryPanel, RankingPanel, WorldMapPanel } from '../components/world/MorePanels';
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
  mercado:         { title: 'Mercado',            key: 'b', icon: ['shop', 'delapouite'],        embed: '/market' },
  mapa:            { title: 'Mapa del mundo',     key: 'm', icon: ['treasure-map', 'lorc'],      panel: WorldMapPanel,     pos: { x: 380, y: 90 } },
  logros:          { title: 'Logros',             key: 'l', icon: ['trophy-cup', 'delapouite'],  panel: AchievementsPanel, pos: { x: 350, y: 100 } },
  ranking:         { title: 'Ranking',            key: 'r', icon: ['podium', 'delapouite'],      panel: RankingPanel,      pos: 'right' },
  // solo desde puntos del mapa (sin botón en la barra)
  misiones_gremio: { title: 'Tablón del gremio',  panel: QuestBoardPanel, pos: { x: 360, y: 120 } },
  enfermeria:      { title: 'Enfermería',         panel: InfirmaryPanel,  pos: { x: 420, y: 160 } },
  artesanos:       { title: 'Artesanos del gremio', panel: MerchantPanel, pos: { x: 360, y: 90 } },
  taller:          { title: 'Taller del herrero',   panel: CraftingPanel, pos: { x: 330, y: 80 } },
  // servicios del gremio que siguen usando su pantalla de siempre dentro del marco
  contratar:       { title: 'Contratar aventureros', icon: ['crossed-swords', 'lorc'],      embed: '/guild/adventurers' },
  maestros:        { title: 'Maestros del gremio',   icon: ['graduate-cap', 'delapouite'],  embed: '/guild/masters' },
  quests_gremio:   { title: 'Encargos del gremio',   icon: ['scroll-unfurled', 'lorc'],     embed: '/guild/quests' },
  encantador:      { title: 'Encantador',            panel: EnchantPanel, pos: { x: 380, y: 90 } },
  mi_gremio:       { title: 'Sala del gremio',       icon: ['castle', 'delapouite'],        embed: '/guild/my' },
  crear_gremio:    { title: 'Fundar un gremio',      icon: ['trowel', 'delapouite'],        embed: '/guild/create' },
  unirse_gremio:   { title: 'Unirse a un gremio',    icon: ['shaking-hands', 'delapouite'], embed: '/guild/join' },
};

function defaultPosFor(w) {
  if (w.pos === 'right') return { x: Math.max(20, window.innerWidth - 500), y: 236 };
  if (w.pos) return w.pos;
  return { x: 20 + Math.max(0, (window.innerWidth - Math.min(820, window.innerWidth - 40)) / 2), y: 70 };
}
const TOOLBAR = ['inventario', 'personaje', 'habilidades', 'misiones', 'formacion', 'mascotas', 'gremio', 'mercado', 'mapa', 'logros', 'ranking'];
const KEY_TO_WINDOW = Object.fromEntries(Object.entries(WINDOWS).filter(([, w]) => w.key).map(([id, w]) => [w.key, id]));

const BASE_CLASSES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
const POS_KEY = 'mundo_posicion';
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

  // ---- datos del HUD ----
  const loadHud = useCallback(() => {
    if (!player || !token) return;
    api.getPlayerStats(player.id, token).then(setStats).catch(() => {});
    api.getParty(player.id, token).then((p) => setParty(p.members ?? [])).catch(() => {});
  }, [player, token]);

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

  // ---- ventanas ----
  const toggleWindow = useCallback((id) => {
    setOpen((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }, []);
  const openWin = useCallback((id) => {
    setOpen((list) => [...list.filter((x) => x !== id), id]);
  }, []);
  const closeWin = useCallback((id) => setOpen((list) => list.filter((x) => x !== id)), []);
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
      game.scene.add('mundo', WorldScene, true, {
        heroClass: BASE_CLASSES.includes(baseClass) ? baseClass : 'guerrero',
        heroName: stats.nickname,
        startPos,
      });
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
    const onInteract = (p) => { if (p?.window) openWin(p.window); };
    const onEncounter = (e) => {
      setEncounter(e);
      sessionStorage.setItem(POS_KEY, JSON.stringify(e.position));
      // tras el aviso "¡Combate!" entra la escena de batalla (sin cambiar de página)
      setTimeout(() => { setEncounter(null); setBattle(e); }, 1300);
    };
    const onBossChallenge = (b) => setBossPrompt(b);
    bus.on('poi', onPoi);
    bus.on('interact', onInteract);
    bus.on('encounter', onEncounter);
    bus.on('boss-challenge', onBossChallenge);
    return () => {
      bus.off('poi', onPoi); bus.off('interact', onInteract); bus.off('encounter', onEncounter); bus.off('boss-challenge', onBossChallenge);
    };
  }, [navigate, openWin]);

  const confirmBoss = useCallback(() => {
    const b = bossPrompt;
    if (!b) return;
    setBossPrompt(null);
    gameRef.current?.scene.getScene('mundo')?.lockForBattle();
    bus.emit('encounter', b);
  }, [bossPrompt]);

  // El chat global se vuelve semitransparente dentro del mundo (ver World.css: body.en-mundo)
  useEffect(() => {
    document.body.classList.add('en-mundo');
    return () => document.body.classList.remove('en-mundo');
  }, []);

  // ---- teclado: el mapa no escucha mientras escribes (las ventanas no lo bloquean) ----
  useEffect(() => {
    bus.emit('input-enabled', !typing && !bossPrompt);
  }, [typing, bossPrompt]);

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

  const finishBattle = useCallback(({ status, redirect } = {}) => {
    if (redirect) { navigate(redirect); return; }
    const game = gameRef.current;
    if (game) {
      game.scene.stop('batalla');
      game.scene.wake('mundo', { result: status });
    }
    if (status === 'ENEMY_WON') sessionStorage.removeItem(POS_KEY);
    setBattle(null);
    loadHud();
    setRefreshKey((k) => k + 1);
  }, [navigate, loadHud]);

  const bossPromptRef = useRef(null);
  bossPromptRef.current = bossPrompt;

  useEffect(() => {
    const onKey = (e) => {
      if (battleRef.current) return; // el combate tiene sus propios atajos
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (bossPromptRef.current) {
        if (e.key === 'Enter') { e.preventDefault(); confirmBoss(); }
        if (e.key === 'Escape') setBossPrompt(null);
        return;
      }
      if (e.key === 'Escape') { setOpen((list) => list.slice(0, -1)); return; }
      if (e.key === 'Enter') {
        const chat = document.querySelector('.chat-box input');
        if (chat) { e.preventDefault(); chat.focus(); }
        return;
      }
      const id = KEY_TO_WINDOW[e.key.toLowerCase()];
      if (id) { e.preventDefault(); toggleWindow(id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleWindow, confirmBoss]);

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

      {/* ---- compañeros del grupo ---- */}
      {companions.length > 0 && (
        <div className="hud-party">
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
        <span className="hud-minimap-zone">Pradera Dorada</span>
      </div>

      {/* ---- barra de acciones con experiencia (abajo al centro) ---- */}
      <div className="hud-actionbar">
        {stats && (
          <div className="hud-xp" title={`${stats.xpIntoLevel} / ${stats.xpNeededForLevel} XP`}>
            <div className="hud-xp-fill" style={{ width: `${xpPct}%` }} />
            <span>Nivel {stats.level} · {xpPct.toFixed(1)}%</span>
          </div>
        )}
        <div className="hud-slots">
          {TOOLBAR.map((id) => {
            const w = WINDOWS[id];
            return (
              <button
                key={id}
                type="button"
                className={`hud-slot${open.includes(id) ? ' hud-slot--active' : ''}`}
                aria-label={`${w.title} (${w.key.toUpperCase()})`}
                onClick={() => toggleWindow(id)}
              >
                <GameIcon name={w.icon[0]} artist={w.icon[1]} />
                <kbd>{w.key.toUpperCase()}</kbd>
                <span className="hud-tooltip">{w.title}</span>
              </button>
            );
          })}
          <span className="hud-slots-sep" />
          <button type="button" className="hud-slot" aria-label="Salir del mundo" onClick={() => navigate('/')}>
            <GameIcon name="house" artist="delapouite" />
            <span className="hud-tooltip">Salir del mundo</span>
          </button>
        </div>
      </div>

      {/* ---- acción contextual (abajo a la derecha) ---- */}
      {poi && !open.includes(poi.window) && !encounter && (
        <button
          type="button"
          className={`hud-context${poi.boss ? ' hud-context--boss' : ''}`}
          onClick={() => {
            if (poi.boss) gameRef.current?.scene.getScene('mundo')?.challengeBoss(poi.boss);
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
              {bossPrompt.rank === 'jefe' ? 'Jefe de zona' : 'Minijefe'}
            </small>
            <h2>{bossPrompt.name}</h2>
            <p>Nivel {bossPrompt.level}</p>
            {stats && stats.level < bossPrompt.level - 3 && (
              <p className="boss-prompt-warn">⚠ Es mucho más fuerte que tú (nivel {stats.level}). Ve con tu grupo completo y pociones.</p>
            )}
            <div className="boss-prompt-actions">
              <button type="button" className="boss-prompt-go" onClick={confirmBoss}>Desafiar <kbd>Enter</kbd></button>
              <button type="button" className="boss-prompt-no" onClick={() => setBossPrompt(null)}>Ahora no <kbd>Esc</kbd></button>
            </div>
          </div>
        </div>
      )}

      {/* ---- nombre de la zona al entrar ---- */}
      <div className="hud-zone-title" aria-hidden="true">
        <small>Zona 1</small>
        Pradera Dorada
      </div>

      {encounter && (
        <div className="world-encounter">
          <div className={`world-encounter-text${encounter.kind === 'boss' ? ' world-encounter-text--boss' : ''}`}>
            <small>{encounter.kind === 'boss' ? (encounter.rank === 'jefe' ? 'Jefe de zona' : 'Minijefe') : '¡Combate!'}</small>
            {encounter.kind === 'boss' ? encounter.name : (encounter.name ? `Un ${encounter.name} te ataca` : '¡Algo se mueve entre la hierba!')}
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
            if (w.embed) return <EmbedPanel key={id} {...common} id={id} title={w.title} icon={w.icon} path={w.embed} openWindow={openWin} />;
            const Panel = w.panel;
            return (
              <Panel
                key={id}
                {...common}
                stats={stats}
                party={party}
                gold={stats.gold}
                refreshKey={refreshKey}
                onChanged={onInventoryChanged}
                openWindow={openWin}
              />
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
