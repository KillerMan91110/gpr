import Phaser from 'phaser';
import bus from './bus';
import audio from './audio';
import { MINIMAP } from './hudLayout';
import SocialLayer from './socialLayer';
import { socialStore } from './socialStore';
import CityLife, { isFestival } from './cityLife';

// Mundo abierto continuo (estilo MMO): public/assets/mundo/etheria.json coloca cada zona
// (public/assets/mundo/<zona>/mundo.json) en su lugar del continente. Todas las zonas viven en
// la misma escena con coordenadas globales: se camina de Aurelia a la Pradera por la Puerta Sur
// sin fundidos ni pantallas de carga. Cada zona está partida en trozos de 40x30 tiles; solo se
// construyen (tiles, colisiones, monstruos, fauna) los trozos cercanos al héroe, crucen o no el
// borde entre zonas. Lo que es poco y siempre importa (NPCs, jefes, recursos, luces, puntos de
// interés) vive toda la partida.
//
// Hacia afuera (React, servidor, sockets) las posiciones siguen siendo LOCALES a la zona donde
// está el héroe ({ x, y, zona }), así el backend no cambia: toLocal()/toGlobal() traducen.

// Letreros sobre personajes: misma fuente que la interfaz y alta resolución para que el zoom
// de la cámara (pixel art) no los deje borrosos.
const TAG_FONT = 'Cinzel, Georgia, serif';
const TAG_RES = 4;

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEFAULT_ZONE = 'pradera';
const SPEED = 110;
// Las ciudades son grandes: dentro se corre un 50% más rápido (bufo "Paso de la ciudad", que se
// ve en el HUD y se pierde al salir). Una zona puede fijar el suyo con "velocidad" en su
// mundo.json (1 = normal).
const CITY_SPEED = 1.5;
const POI_RADIUS = 44;
const GATHER_MS = 1100; // barra de recolectar
// trozos construidos: los que tocan una ventana de ±0.8 trozos alrededor del héroe (a lo sumo
// 3x3, como antes, aunque la ventana cruce el borde entre dos zonas); se destruyen cuando quedan
// fuera de ±1.4 (margen para no armar y desarmar al ir y venir por un borde)
const CHUNK_NEAR = 0.8;
const CHUNK_FAR = 1.4;
// Al entrar (o volver de un combate) los monstruos no atacan durante este tiempo, para que no
// te enganche uno que justo pasaba por el punto donde apareces.
const ENCOUNTER_GRACE_MS = 2500;
// al volver de un combate: más respiro y los monstruos cercanos se apartan (sin esto uno pegado
// al héroe volvía a atacar apenas terminaba la pelea, una y otra vez)
const POST_BATTLE_GRACE_MS = 5000;
const SHOO_RADIUS = 110;
// los monstruos mucho más débiles que el héroe no se le acercan (si los tocas, igual pelean)
const SHY_LEVEL_GAP = 5;
const SHY_RADIUS = 150;
// refugio: si caes, despiertas en el último Pilar o fogata que visitaste
const REFUGE_RADIUS = 80;
const REFUGE_KEY = 'mundo_refugio_v1';

// Paso forzado por casilla (capa "paso" de cada trozo, la pinta el editor de mapas como en RPG
// Maker). 0 = lo que diga el tile. Con PASO_FORZADO, los bits 1/2/4/8 cierran el borde de
// arriba/derecha/abajo/izquierda de la casilla (15 = bloqueada entera, 0 = libre aunque el tile
// choque). PASO_CORNISA: se baja (hacia el sur) pero no se sube, como un saliente.
export const PASO_FORZADO = 16;
export const PASO_CORNISA = 32;
const EDGE = 4; // grosor de los bordes cerrados

// Frames de la hoja de caminar (ver art/sprites/mundo/crear_mundo.lua): 0-2 abajo, 3-5 arriba, 6-8 lado
const WALK = { down: [1, 0, 2, 0], up: [4, 3, 5, 3], side: [7, 6, 8, 6] };
const IDLE = { down: 0, up: 3, side: 6 };
// NPCs fuera de las ciudades: radio del paseo (casillas), velocidad (px/s) y a qué distancia se
// detienen para mirar al héroe
const NPC_STROLL_TILES = 2;
const NPC_STROLL_SPEED = 22;
const NPC_NOTICE_RADIUS = 80;

// recursos (art/sprites/mundo/crear_extras.lua): hoja y [lleno, agotado] por tipo
const RESOURCES = {
  hierba: { sheet: 'recursos', frames: [0, 1], label: 'Recoger hierbas', glint: 0xfff4a0 },
  mineral: { sheet: 'recursos', frames: [2, 3], label: 'Picar la veta de mineral', glint: 0x6fc3ff },
  cofre: { sheet: 'recursos', frames: [4, 5], label: 'Abrir el cofre', glint: 0xffd84a },
  setas: { sheet: 'recursos2', frames: [0, 1], label: 'Recoger setas', glint: 0xffb0a0 },
  tronco: { sheet: 'recursos2', frames: [2, 3], label: 'Cortar el tronco', glint: 0xfff4a0 },
  flor_luz: { sheet: 'recursos2', frames: [4, 5], label: 'Recoger la flor luminosa', glint: 0x7adcc0 },
  nido: { sheet: 'recursos2', frames: [6, 7], label: 'Revisar el nido', glint: 0xfff4a0 },
  restos: { sheet: 'recursos2', frames: [8, 9], label: 'Registrar los restos', glint: 0xffd84a },
};
// mascotas.png: 2 frames por especie, en este orden
const PET_SPECIES = ['lobo', 'ave', 'limo', 'gato', 'dragon', 'zorro', 'tortuga', 'arana'];
const BASE_CLASSES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
const BUTTERFLY_TINTS = [0xffe680, 0xffffff, 0xff9ad0, 0x9ad0ff, 0xffb05a];

// Ciclo de día: 1 minuto real = 1 hora del juego. Color multiplicado sobre el mapa por hora.
const MINUTES_PER_DAY = 24;
const SKY = [
  [0, 0x5a64a8], [4, 0x5a64a8], [6, 0xe0a890], [8, 0xffffff], [17, 0xffffff],
  [19, 0xe89a78], [21, 0x6670b0], [24, 0x5a64a8],
];
const lerpColor = (a, b, t) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    Math.round(ca.red + (cb.red - ca.red) * t),
    Math.round(ca.green + (cb.green - ca.green) * t),
    Math.round(ca.blue + (cb.blue - ca.blue) * t),
  );
};
const mulColor = (a, b) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor((ca.red * cb.red) / 255, (ca.green * cb.green) / 255, (ca.blue * cb.blue) / 255);
};
export const gameHour = () => ((Date.now() / 60000) % MINUTES_PER_DAY) * (24 / MINUTES_PER_DAY);
const propOf = (o, name) => o.properties?.find((p) => p.name === name)?.value;

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('mundo');
  }

  init(data) {
    this.heroClass = data.heroClass || 'guerrero';
    this.heroName = data.heroName || '';
    this.heroLevel = data.heroLevel || 1;
    this.startPos = data.startPos || null;
    this.zoneDir = data.zoneDir || DEFAULT_ZONE;
    this.facing = 'down';
    this.nearPoi = null;
    this.encounterLock = false;
    this.trail = [];
    this.followers = [];
    this.pet = null;
    this.resources = new Map();
    this.resourceState = new Map();
    this.npcs = new Map();
    this.marks = {};
    this.chunks = new Map();
    this.pois = [];
    this.lights2 = [];
    this.subzone = null;
    this.weather = 'despejado';
  }

  preload() {
    // el continente y, a partir de él, cada zona con sus trozos (la zona de inicio siempre)
    this.queuedZones = new Set();
    this.queuedTilesets = new Set();
    const onEtheria = (eth) => {
      (eth?.zonas ?? []).forEach((z) => this.queueZone(z.dir));
      this.queueZone(this.zoneDir);
    };
    if (this.cache.json.exists('etheria')) onEtheria(this.cache.json.get('etheria'));
    else {
      this.load.json('etheria', `${ASSETS}/mundo/etheria.json`);
      this.load.once('filecomplete-json-etheria', (_k, _t, eth) => onEtheria(eth));
      // sin etheria.json (o roto) se juega solo la zona de inicio, como antes
      const onError = (file) => { if (file.key === 'etheria') { this.load.off('loaderror', onError); this.queueZone(this.zoneDir); } };
      this.load.on('loaderror', onError);
    }
    this.load.spritesheet('heroe', `${ASSETS}/mundo/caminar/${this.heroClass}.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('recursos', `${ASSETS}/mundo/recursos.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('recursos2', `${ASSETS}/mundo/recursos2.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('mascotas', `${ASSETS}/mundo/mascotas.png`, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('f_mariposa', `${ASSETS}/mundo/fauna/mariposa.png`, { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet('f_pajaro', `${ASSETS}/mundo/fauna/pajaro.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('f_conejo', `${ASSETS}/mundo/fauna/conejo.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('f_ciervo', `${ASSETS}/mundo/fauna/ciervo.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.image('aspas', `${ASSETS}/mundo/aspas.png`);
    SocialLayer.preload(this);
    CityLife.preload(this);
    this.load.json('enemigos', `${ASSETS}/sprites/combate/enemigos.json`);
  }

  // Los mapas de los trozos son livianos (~37 KB): se bajan todos los de todas las zonas; lo que
  // se arma por cercanía es el contenido (capas, colisiones, monstruos, fauna).
  queueZone(dir) {
    if (!dir || this.queuedZones.has(dir)) return;
    this.queuedZones.add(dir);
    const base = `${ASSETS}/mundo/${dir}`;
    const onWorld = (world) => {
      const ts = world.tileset || 'pradera';
      if (!this.textures.exists(`tiles_${ts}`) && !this.queuedTilesets.has(ts)) {
        this.queuedTilesets.add(ts);
        this.load.image(`tiles_${ts}`, `${ASSETS}/mundo/tileset_${ts}.png`);
      }
      world.chunks.forEach((c) => {
        const key = `chunk_${dir}_${c.cx}_${c.cy}`;
        if (!this.cache.tilemap.exists(key)) this.load.tilemapTiledJSON(key, `${base}/${c.file}`);
      });
    };
    const key = `mundo_${dir}`;
    if (this.cache.json.exists(key)) { onWorld(this.cache.json.get(key)); return; }
    this.load.json(key, `${base}/mundo.json`);
    this.load.once(`filecomplete-json-${key}`, (_k, _t, world) => onWorld(world));
  }

  // ---------------------------------------------------------------- continente
  // Arma la lista de zonas con su desplazamiento en píxeles dentro del continente.
  buildContinent() {
    const eth = this.cache.json.get('etheria');
    let placed = (eth?.zonas ?? []).filter((z) => this.cache.json.exists(`mundo_${z.dir}`));
    if (!placed.some((z) => z.dir === this.zoneDir)) placed = [{ dir: this.zoneDir, x: 0, y: 0 }];
    this.zones = placed.map((z) => {
      const world = this.cache.json.get(`mundo_${z.dir}`);
      const t = world.tile;
      const chunkPx = { w: world.chunkWidth * t, h: world.chunkHeight * t };
      return {
        dir: z.dir, world, chunkPx, tileset: world.tileset || 'pradera',
        ox: z.x * t, oy: z.y * t, w: chunkPx.w * world.columns, h: chunkPx.h * world.rows,
        gidSets: Object.fromEntries(Object.entries(world.gids ?? {}).map(([k, v]) => [k, new Set(v)])),
      };
    });
    this.zoneByDir = Object.fromEntries(this.zones.map((z) => [z.dir, z]));
    this.worldPx = {
      w: Math.max(...this.zones.map((z) => z.ox + z.w)),
      h: Math.max(...this.zones.map((z) => z.oy + z.h)),
    };
  }

  zoneAt(x, y) {
    return this.zones.find((z) => x >= z.ox && x < z.ox + z.w && y >= z.oy && y < z.oy + z.h) ?? null;
  }

  // posición local (la que entienden React y el servidor) ↔ global (la de la escena)
  toLocal(x, y, zone = this.zoneAt(x, y) ?? this.zone) {
    return { x: Math.round(x - zone.ox), y: Math.round(y - zone.oy), zona: zone.dir };
  }

  toGlobal(x, y, dir) {
    const z = (dir && this.zoneByDir[dir]) || this.zone;
    return { x: x + z.ox, y: y + z.oy };
  }

  // la zona donde está el héroe manda: id para el servidor, música, encuentros, punto de regreso
  setZone(zone) {
    this.zone = zone;
    this.world = zone.world;
    this.zoneDir = zone.dir;
    this.zoneId = zone.world.zona;
    this.zoneName = zone.world.nombre;
    this.grassChance = zone.world.encuentroHierba;
    this.grassGid = zone.world.gidHierba;
    this.spawnPoint = this.toGlobal(zone.world.inicio.x, zone.world.inicio.y, zone.dir);
    this.speedMul = zone.world.velocidad ?? (zone.world.ciudad ? CITY_SPEED : 1);
  }

  zoneBuffs() {
    if (!(this.speedMul > 1)) return [];
    return [{
      id: 'paso_ciudad', name: 'Paso de la ciudad', icon: ['running-shoe', 'delapouite'],
      desc: `+${Math.round((this.speedMul - 1) * 100)}% velocidad de movimiento mientras estés en ${this.zoneName}.`,
    }];
  }

  emitZone() {
    bus.emit('world-ready', {
      zoneId: this.zoneId, zoneDir: this.zoneDir, name: this.zoneName, music: this.world.musica ?? 'pradera', city: !!this.world.ciudad,
      zoneIds: this.zones.map((z) => z.world.zona), // zonas del mundo abierto (para las misiones)
      buffs: this.zoneBuffs(), // bufos que da estar en esta zona (el HUD los muestra)
    });
  }

  // cruzaste a otra zona caminando: React cambia música, sala de jugadores, recursos y misiones
  checkZoneChange() {
    const z = this.zoneAt(this.player.x, this.player.y);
    if (!z || z === this.zone) return;
    const before = this.speedMul;
    this.setZone(z);
    this.subzone = null;
    this.emitZone();
    // aviso del cambio de paso al entrar o salir de la ciudad
    if (this.speedMul > before) {
      this.floatLoot([{ text: `Paso de la ciudad: +${Math.round((this.speedMul - 1) * 100)}% velocidad`, color: '#9ae8ff' }]);
      audio.sfx('mejora');
    } else if (this.speedMul < before) this.floatLoot([{ text: 'Perdiste: Paso de la ciudad', color: '#d8cdb4' }]);
  }

  // Teletransporte dentro del continente (diligencia, volver al punto de inicio): fundido corto
  // sin desmontar la escena. Devuelve false si la zona no está en el continente.
  teleport(dir, x, y) {
    if (!this.zoneByDir?.[dir] || this.teleporting) return !!this.zoneByDir?.[dir];
    this.teleporting = true;
    this.stopPlayer();
    this.input.keyboard.enabled = false;
    audio.sfx('abrir');
    const cam = this.cameras.main;
    cam.fadeOut(250, 10, 10, 16);
    cam.once('camerafadeoutcomplete', () => {
      const g = this.toGlobal(x, y, dir);
      this.player.setPosition(g.x, g.y);
      this.trail = [];
      this.updateChunks(true);
      this.checkZoneChange();
      this.graceUntil = this.time.now + ENCOUNTER_GRACE_MS;
      cam.fadeIn(350);
      this.input.keyboard.enabled = true;
      this.input.keyboard.resetKeys();
      this.teleporting = false;
    });
    return true;
  }

  // Huecos del rectángulo del continente que no son de ninguna zona: paredes invisibles, para
  // que nadie salga caminando al vacío por un borde abierto.
  blockVoid() {
    const t = 32;
    const cols = Math.ceil(this.worldPx.w / t);
    const rows = Math.ceil(this.worldPx.h / t);
    let open = new Map(); // "x0,x1" → fila donde empezó el rectángulo
    const flush = (key, y0, y1) => {
      const [a, b] = key.split(',').map(Number);
      const r = this.add.rectangle(a * t + ((b - a) * t) / 2, y0 * t + ((y1 - y0) * t) / 2, (b - a) * t, (y1 - y0) * t).setVisible(false);
      this.blockers.add(r);
    };
    for (let ty = 0; ty <= rows; ty++) {
      const runs = new Set();
      if (ty < rows) {
        let start = -1;
        for (let tx = 0; tx <= cols; tx++) {
          const empty = tx < cols && !this.zoneAt(tx * t + 1, ty * t + 1);
          if (empty && start < 0) start = tx;
          if (!empty && start >= 0) { runs.add(`${start},${tx}`); start = -1; }
        }
      }
      const next = new Map();
      for (const [key, y0] of open) { if (runs.has(key)) next.set(key, y0); else flush(key, y0, ty); }
      for (const key of runs) if (!next.has(key)) next.set(key, ty);
      open = next;
    }
  }

  create() {
    if (!this.textures.exists('mota_mundo')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillCircle(2, 2, 2).generateTexture('mota_mundo', 4, 4).destroy();
      const r = this.make.graphics({ x: 0, y: 0 }, false);
      r.fillStyle(0xbfd8ff, 1).fillRect(0, 0, 1, 7).generateTexture('gota', 1, 7).destroy();
      const l = this.make.graphics({ x: 0, y: 0 }, false);
      l.fillStyle(0xffffff, 1).fillRect(1, 0, 2, 1).fillRect(0, 1, 4, 2).fillRect(1, 3, 2, 1).generateTexture('hoja', 4, 4).destroy();
    }
    this.buildContinent();
    this.setZone(this.zoneByDir[this.zoneDir]);
    this.lastTile = null;
    // la posición guardada es local a su zona (la de antes del mundo continuo también)
    const start = this.startPos ? this.toGlobal(this.startPos.x, this.startPos.y, this.startPos.zona ?? this.zoneDir) : this.spawnPoint;

    this.player = this.physics.add.sprite(start.x, start.y, 'heroe', IDLE.down).setDepth(10);
    this.player.body.setSize(16, 10).setOffset(8, 21);
    this.player.setCollideWorldBounds(true);
    this.nameTag = this.add.text(start.x, start.y - 22, this.heroName, {
      fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#ffffff', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
    this.makeWalkAnims('heroe');
    this.dust = this.add.particles(0, 0, 'mota_mundo', {
      x: { min: -5, max: 5 }, y: { min: -1, max: 2 }, lifespan: 420, frequency: 70, speedY: { min: -14, max: -4 },
      speedX: { min: -10, max: 10 }, scale: { start: 0.9, end: 0.2 }, alpha: { start: 0.55, end: 0 }, tint: [0xe8dcc0, 0xc8b898], emitting: false,
    }).setDepth(9.4);
    this.dust.startFollow(this.player, 0, 13);

    this.physics.world.setBounds(0, 0, this.worldPx.w, this.worldPx.h);
    this.cameras.main.setBounds(0, 0, this.worldPx.w, this.worldPx.h);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setZoom(2);
    this.cameras.main.fadeIn(400);
    this.createMinimap();
    this.minimap.ignore(this.dust);

    // enableCapture = false: sin esto Phaser se "come" W/A/S/D y la barra espaciadora y no se
    // podría escribir en el chat.
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      interact: 'E', interact2: 'SPACE',
    }, false);

    this.blockers = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.blockers);
    if (this.zones.length > 1) this.blockVoid();
    this.monsters = this.physics.add.group();
    this.physics.add.overlap(this.player, this.monsters, (_p, mon) => this.startEncounter(mon));
    // los monstruos tampoco atraviesan NPCs, recursos ni el vacío (con el mapa chocan por trozo)
    this.physics.add.collider(this.monsters, this.blockers);
    // casillas caminables de todo el continente: los vecinos de la ciudad buscan camino con ella
    this.buildWalkGrid();

    // contenido de toda la zona que vive siempre (sale de los puntos de cada trozo)
    const all = this.allPoints();
    // NPCs con horario "festival" solo aparecen el día del Festival de Aethra
    const festival = isFestival();
    const present = all.filter((o) => o.type !== 'npc' || propOf(o, 'horario') !== 'festival' || festival);
    this.pois = present.filter((o) => ['poi', 'npc', 'pilar', 'vinculo'].includes(o.type)).map((o) => ({
      id: o.name, x: o.x + 16, y: o.y + 16,
      label: propOf(o, 'etiqueta') ?? o.name, window: propOf(o, 'ventana'), dialogue: propOf(o, 'dialogo') ?? null,
    }));
    this.bossPoints = all.filter((o) => o.type === 'jefe').map((o) => ({
      id: o.name, x: o.x + 16, y: o.y + 16, code: propOf(o, 'monstruo'), level: propOf(o, 'nivel'), label: propOf(o, 'etiqueta') ?? o.name,
    }));
    this.encounterAreas = all.filter((o) => o.type === 'encuentro');
    this.spawnNpcs(present.filter((o) => o.type === 'npc'));
    // salidas a zonas que todavía no están en el continente (las que sí, se cruzan caminando)
    this.exits = all.filter((o) => o.type === 'salida' && !this.zoneByDir[propOf(o, 'destino')]).map((o) => ({
      rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width || 64, o.height || 32),
      dest: propOf(o, 'destino'), tx: propOf(o, 'x'), ty: propOf(o, 'y'), label: propOf(o, 'etiqueta'),
    }));
    this.exitsArmedAt = this.time.now + 1500;
    if (all.some((o) => ['ciudadano', 'pilar', 'cartel', 'palomas', 'gato', 'vinculo'].includes(o.type))) this.city = new CityLife(this, all);
    this.spawnResources(all.filter((o) => o.type === 'recurso'));
    all.filter((o) => o.type === 'aspas').forEach((o) => {
      const blades = this.add.image(o.x, o.y, 'aspas').setDepth(20.2);
      this.tweens.add({ targets: blades, angle: 360, duration: 9000, repeat: -1 });
    });

    this.createDayNight(all.filter((o) => o.type === 'luz'));
    this.buildRefuges(all);
    // otros jugadores, globitos de chat, gestos y emojis
    this.social = new SocialLayer(this);
    this.createWeather();
    this.bindBus();

    this.graceUntil = this.time.now + ENCOUNTER_GRACE_MS;
    this.loadMonsterLevels().then(() => this.loadMonsterSheets());
    this.updateChunks(true);
    // al volver del combate (la escena 'batalla' la duerme mientras tanto)
    this.events.on('wake', (_sys, data) => this.onReturnFromBattle(data?.result));
    this.emitZone();
  }

  // todos los puntos de todas las zonas en coordenadas globales (zone/chunk dicen de dónde son)
  allPoints() {
    const out = [];
    for (const z of this.zones) {
      for (const c of z.world.chunks) {
        const data = this.cache.tilemap.get(`chunk_${z.dir}_${c.cx}_${c.cy}`)?.data;
        const layer = data?.layers.find((l) => l.name === 'puntos');
        for (const o of layer?.objects ?? []) {
          out.push({ ...o, x: o.x + z.ox + c.cx * z.chunkPx.w, y: o.y + z.oy + c.cy * z.chunkPx.h, chunk: `${z.dir}:${c.cx}_${c.cy}`, zone: z.dir });
        }
      }
    }
    return out;
  }

  // eventos que manda React (HUD, ventanas, servidor)
  bindBus() {
    const handlers = {
      'input-enabled': (enabled) => {
        this.input.keyboard.enabled = enabled;
        this.input.keyboard.resetKeys();
        if (!enabled) this.stopPlayer();
      },
      'world-party': (classes) => this.setFollowers(classes),
      'world-pet': (species) => this.setPet(species),
      'hero-level': (lvl) => {
        this.heroLevel = lvl;
        // al subir de nivel los monstruos cambian de color
        this.monsters.getChildren().forEach((m) => { const t = m.getData('tag'); if (t) t.setColor(this.levelColor(t.text.replace('Nv ', ''))); });
      },
      'npc-marks': (marks) => this.setNpcMarks(marks),
      'resources-state': (list) => this.setResourceStates(list),
      'resource-gathered': (r) => this.onGathered(r),
      'float-loot': (lines) => this.floatLoot(lines),
      'level-up': () => this.levelUpFx(),
      // ventana del mapa (M): todo lo que hace falta para dibujar la zona y tu posición
      'zone-map-data': (cb) => cb?.(this.zoneMapData()),
      'ofrenda-fx': () => this.ofrendaFx(),
      // ventana Social: en qué subzona está un jugador (solo si está en esta zona)
      // (x, y locales a esa zona; sin zona, la del héroe)
      'subzone-at': ({ x, y, zone }, cb) => {
        const z = zone ? this.zoneByDir[zone] : this.zone;
        if (!z) { cb?.(null); return; }
        cb?.(z.world.subzonas?.find((sz) => x >= sz.x0 && x < sz.x1 && y >= sz.y0 && y < sz.y1)?.name ?? null);
      },
      // posición local en la zona actual (lo que se manda por socket y se guarda)
      'hero-pos': (cb) => {
        const p = this.player ? this.toLocal(this.player.x, this.player.y, this.zone) : { x: 0, y: 0, zona: this.zoneDir };
        cb?.({ x: p.x, y: p.y, zone: p.zona, facing: this.facing, flip: this.player?.flipX });
      },
      // viaje en diligencia u otro salto: sin desmontar la escena si la zona está en el continente
      'teleport': ({ zoneDir, x, y }, cb) => cb?.(this.teleport(zoneDir, x, y)),
      // piedra de regreso: React pide empezar a canalizarla (cb dice si se pudo)
      'hearth-start': ({ ms }, cb) => cb?.(this.startHearth(ms)),
      'hearth-arrive': () => this.hearthArriveFx(),
      // jefe mítico de zona (components/world/MythicHunt.js): aparece, se va o muere
      'mythic-state': (s) => this.setMythic(s?.hunt ?? null),
      'mythic-track': (cb) => cb?.(this.trackMythic()),
    };
    Object.entries(handlers).forEach(([ev, fn]) => bus.on(ev, fn));
    const unbind = () => Object.entries(handlers).forEach(([ev, fn]) => bus.off(ev, fn));
    this.events.once('shutdown', unbind);
    this.events.once('destroy', unbind);
  }

  // mapa (M) de la zona donde estás, en coordenadas locales de esa zona
  zoneMapData() {
    const z = this.zone;
    const w = z.world;
    return {
      dir: this.zoneDir, id: this.zoneId, name: this.zoneName, heroLevel: this.heroLevel,
      tile: w.tile, chunkWidth: w.chunkWidth, chunkHeight: w.chunkHeight, columns: w.columns, rows: w.rows,
      subzonas: w.subzonas ?? [],
      tileset: this.textures.get(`tiles_${z.tileset}`).getSourceImage(),
      chunks: w.chunks.map((c) => {
        const d = this.cache.tilemap.get(`chunk_${z.dir}_${c.cx}_${c.cy}`)?.data;
        const layer = (n) => d?.layers.find((l) => l.name === n)?.data ?? [];
        return { cx: c.cx, cy: c.cy, suelo: layer('suelo'), objetos: layer('objetos'), encima: layer('encima') };
      }),
      points: this.allPoints().filter((o) => o.zone === z.dir && ['npc', 'poi', 'jefe', 'salida', 'pilar', 'vinculo'].includes(o.type)).map((o) => ({
        type: o.type, name: o.name, x: o.x - z.ox + 16, y: o.y - z.oy + 16,
        label: propOf(o, 'nombre') ?? propOf(o, 'etiqueta') ?? o.name,
        monster: propOf(o, 'monstruo'), level: propOf(o, 'nivel'), window: propOf(o, 'ventana'), dialogue: propOf(o, 'dialogo'),
      })),
      marks: this.marks,
      mythic: this.mythic?.sprite && this.mythic.zoneDir === z.dir
        ? { x: this.mythic.x - z.ox, y: this.mythic.y - z.oy, name: this.mythic.hunt.name, spot: this.mythic.hunt.spot }
        : null,
    };
  }

  // ---------------------------------------------------------------- jefe mítico
  // Aparece en la casilla que mandó el servidor (o la libre más cercana): grande, con aura de
  // luna, motas de luz y su nombre. Se desafía con E como un jefe de guarida.
  setMythic(hunt) {
    const moved = this.mythic && hunt && this.mythic.id === hunt.id && (this.mythic.hunt.x !== hunt.x || this.mythic.hunt.y !== hunt.y);
    if (this.mythic && (!hunt || this.mythic.id !== hunt.id || moved)) {
      const m = this.mythic;
      if (!moved) this.clearMinions();
      [m.sprite, m.aura, m.glow, m.tag, m.motes, m.block].forEach((o) => o?.destroy());
      this.pois = this.pois.filter((p) => p.id !== 'mitico');
      if (this.nearPoi?.id === 'mitico') { this.nearPoi = null; bus.emit('poi', null); }
      this.mythic = null;
      // terminó la cacería: amanece de golpe (unos segundos) donde estaba la noche eterna
      if (!hunt && this.nightZone) this.startDawn();
    }
    this.nightZone = hunt?.zoneDir ?? null;
    this.redMoon = !!hunt?.redMoon;
    if (this.mythic) {
      this.mythic.hunt = hunt;
      this.mythic.tag?.setColor(hunt.redMoon ? '#ffb0a0' : '#c8f4ff');
      this.syncMinions();
      return;
    }
    if (!hunt) return;
    const z = this.zoneByDir[hunt.zoneDir];
    const catalog = this.cache.json.get('enemigos')?.monsters;
    const info = catalog?.[hunt.code];
    if (!z || !info || !this.walk) return;
    let tx = Math.floor(z.ox / 32) + hunt.x;
    let ty = Math.floor(z.oy / 32) + hunt.y;
    if (!this.walkable(tx, ty)) {
      let best = null;
      for (let r = 1; r <= 10 && !best; r++) {
        for (let dy = -r; dy <= r && !best; dy++) {
          for (let dx = -r; dx <= r && !best; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.walkable(tx + dx, ty + dy)) best = [tx + dx, ty + dy];
          }
        }
      }
      if (best) [tx, ty] = best;
    }
    const x = tx * 32 + 16;
    const y = ty * 32 + 16;
    const key = `mon_${hunt.code}`;
    this.mythic = { id: hunt.id, hunt, zoneDir: z.dir, x, y };
    const build = () => {
      const m = this.mythic;
      if (!m || m.id !== hunt.id || m.sprite) return;
      const animKey = `mon_idle_${hunt.code}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key, frame: f })), frameRate: 2, repeat: -1 });
      }
      m.glow = this.add.image(x, y - 10, 'luz').setDepth(8).setBlendMode('ADD').setTint(0x7ff8ff).setScale(2.4).setAlpha(0.55);
      this.tweens.add({ targets: m.glow, alpha: 0.25, scale: 2.8, duration: 1400, yoyo: true, repeat: -1 });
      m.aura = this.add.ellipse(x, y + 14, 78, 22, 0x7ff8ff, 0.3).setDepth(8);
      this.tweens.add({ targets: m.aura, alpha: 0.1, scaleX: 1.2, duration: 1100, yoyo: true, repeat: -1 });
      m.sprite = this.add.sprite(x, y, key, info.animations.idle.frames[0]).setOrigin(0.5, 0.9).setScale(1.35).setDepth(9).play(animKey);
      m.motes = this.add.particles(x, y - 20, 'mota_mundo', {
        x: { min: -40, max: 40 }, y: { min: -30, max: 20 }, lifespan: 1800, frequency: 140, speedY: { min: -18, max: -6 },
        scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: 0xc8f4ff, blendMode: 'ADD',
      }).setDepth(9.5);
      m.block = this.add.rectangle(x, y + 4, 44, 20);
      this.blockers.add(m.block);
      m.tag = this.add.text(x, y - m.sprite.displayHeight * 0.9 - 2, `MÍTICO · ${hunt.name}`, {
        fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#c8f4ff', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      [m.glow, m.tag, m.motes].forEach((o) => this.minimap?.ignore(o));
      if (hunt.redMoon) { m.tag.setColor('#ffb0a0'); m.glow.setTint(0xff7a7a); m.aura.setFillStyle(0xff6a5a, 0.3); }
      this.pois.push({ id: 'mitico', x, y: y + 10, label: `Enfrentar a ${hunt.name}`, mythic: true, radius: 72 });
      // si lo venías rastreando y se mudó, la flecha apunta al nuevo lugar
      if (socialStore.get().track?.mythic) socialStore.setTrack({ name: hunt.name.split(',')[0], x, y, mythic: true });
      this.syncMinions();
    };
    if (this.textures.exists(key)) build();
    else this.loadThen(() => this.load.spritesheet(key, `${ASSETS}/sprites/combate/${info.sheet}`, { frameWidth: info.frameSize.w, frameHeight: info.frameSize.h }), build);
  }

  // flecha de rastreo hacia el jefe (botón "Rastrear" de la barra)
  trackMythic() {
    const m = this.mythic;
    if (!m) return false;
    socialStore.setTrack({ name: m.hunt.name.split(',')[0], x: m.x, y: m.y, mythic: true });
    return true;
  }

  // Esbirros (lobos espectrales): desde la fase 1 rondan alrededor del jefe; cazarlos lo debilita
  syncMinions() {
    const m = this.mythic;
    const want = m?.hunt?.phase >= 1 ? 6 : 0;
    this.minions = (this.minions ?? []).filter((x) => x.active);
    if (!want) { this.clearMinions(); return; }
    const code = m.hunt.minionCode ?? 'LOBO_ESPECTRAL';
    const catalog = this.cache.json.get('enemigos')?.monsters;
    const info = catalog?.[code];
    if (!info) return;
    const key = `mon_${code}`;
    const spawn = () => {
      this.minions = (this.minions ?? []).filter((x) => x.active);
      const area = new Phaser.Geom.Rectangle(m.x - 12 * 32, m.y - 9 * 32, 24 * 32, 18 * 32);
      for (let i = this.minions.length; i < want; i++) {
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 20; tries++) {
          x = Phaser.Math.Between(area.x, area.right);
          y = Phaser.Math.Between(area.y, area.bottom);
          if (this.walkable(Math.floor(x / 32), Math.floor(y / 32)) && Phaser.Math.Distance.Between(x, y, m.x, m.y) > 96) break;
        }
        const animKey = `mon_idle_${code}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key, frame: f })), frameRate: 2.5, repeat: -1 });
        }
        const mon = this.monsters.create(x, y, key, info.animations.idle.frames[0]).setScale(0.8).setDepth(9).setAlpha(0.85);
        mon.play(animKey);
        mon.body.setSize(24, 16).setOffset(info.frameSize.w / 2 - 12, info.frameSize.h - 20);
        mon.setData({ code, name: info.name, area, chunk: 'mitico', minion: true });
        const glow = this.add.image(x, y - 6, 'luz').setDepth(8.5).setBlendMode('ADD').setTint(0x9ae8ff).setScale(0.9).setAlpha(0.35);
        this.minimap?.ignore(glow);
        mon.setData('glow', glow);
        mon.once('destroy', () => glow.destroy());
        mon.setAlpha(0);
        this.tweens.add({ targets: mon, alpha: 0.85, duration: 900 });
        this.wander(mon);
        this.minions.push(mon);
      }
    };
    if (this.textures.exists(key)) spawn();
    else this.loadThen(() => this.load.spritesheet(key, `${ASSETS}/sprites/combate/${info.sheet}`, { frameWidth: info.frameSize.w, frameHeight: info.frameSize.h }), spawn);
  }

  clearMinions() {
    (this.minions ?? []).forEach((x) => x.active && x.destroy());
    this.minions = [];
  }

  // ¿el héroe está bajo la noche eterna del jefe mítico?
  frozenNight() {
    return !!this.nightZone && this.zone?.dir === this.nightZone;
  }

  startDawn() {
    this.dawnFrom = this.shade?.fillColor ?? 0x5a64a8;
    this.dawnUntil = this.time.now + 20000;
  }

  challengeMythic() {
    const m = this.mythic;
    if (!m?.sprite) return;
    const h = m.hunt;
    bus.emit('boss-challenge', {
      kind: 'mythic', rank: 'mitico', code: h.code, name: h.name, level: h.minLevel, hp: h.hp, maxHp: h.maxHp,
      zoneId: this.zoneByDir[m.zoneDir]?.world.zona ?? this.zoneId, position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  }

  makeWalkAnims(key) {
    for (const [dir, frames] of Object.entries(WALK)) {
      const k = key === 'heroe' ? `walk_${dir}` : `walk_${key}_${dir}`;
      if (!this.anims.exists(k)) this.anims.create({ key: k, frames: frames.map((f) => ({ key, frame: f })), frameRate: 8, repeat: -1 });
    }
  }

  // ---------------------------------------------------------------- trozos
  // clave del trozo que contiene un punto global: "<zona>:<cx>_<cy>" (null fuera de toda zona)
  chunkKeyAt(x, y) {
    const z = this.zoneAt(x, y);
    if (!z) return null;
    return `${z.dir}:${Math.floor((x - z.ox) / z.chunkPx.w)}_${Math.floor((y - z.oy) / z.chunkPx.h)}`;
  }

  // trozos de todas las zonas que tocan la ventana de ±r trozos alrededor de (x, y)
  chunksAround(x, y, r) {
    const keys = new Set();
    for (const z of this.zones) {
      const rx = z.chunkPx.w * r;
      const ry = z.chunkPx.h * r;
      const cx0 = Math.max(0, Math.floor((x - rx - z.ox) / z.chunkPx.w));
      const cx1 = Math.min(z.world.columns - 1, Math.floor((x + rx - z.ox) / z.chunkPx.w));
      const cy0 = Math.max(0, Math.floor((y - ry - z.oy) / z.chunkPx.h));
      const cy1 = Math.min(z.world.rows - 1, Math.floor((y + ry - z.oy) / z.chunkPx.h));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) keys.add(`${z.dir}:${cx}_${cy}`);
    }
    return keys;
  }

  updateChunks(force = false) {
    // se recalcula cada medio trozo recorrido (los bordes de zona no caen en múltiplos de trozo)
    const { x, y } = this.player;
    const cell = `${Math.floor(x / 640)}_${Math.floor(y / 480)}`;
    if (!force && cell === this.curCell) return;
    this.curCell = cell;
    const wanted = this.chunksAround(x, y, CHUNK_NEAR);
    const keep = this.chunksAround(x, y, CHUNK_FAR);
    for (const key of [...this.chunks.keys()]) if (!keep.has(key)) this.unloadChunk(key);
    for (const key of wanted) if (!this.chunks.has(key)) this.buildChunk(key);
  }

  buildChunk(key) {
    const [dir, rest] = key.split(':');
    const zone = this.zoneByDir[dir];
    const [cx, cy] = rest.split('_').map(Number);
    const map = this.make.tilemap({ key: `chunk_${dir}_${cx}_${cy}` });
    const tiles = map.addTilesetImage(map.tilesets[0]?.name ?? zone.tileset, `tiles_${zone.tileset}`);
    const x0 = zone.ox + cx * zone.chunkPx.w;
    const y0 = zone.oy + cy * zone.chunkPx.h;
    const ground = map.createLayer('suelo', tiles, x0, y0);
    const objects = map.createLayer('objetos', tiles, x0, y0);
    // copas de los árboles y tejados: por encima del personaje, sin colisión
    const above = map.createLayer('encima', tiles, x0, y0)?.setDepth(20);
    ground.setCollisionByProperty({ colision: true });
    objects.setCollisionByProperty({ colision: true });
    const edges = this.applyPassage(zone, `chunk_${dir}_${cx}_${cy}`, ground, objects, x0, y0);
    const colliders = [this.physics.add.collider(this.player, ground), this.physics.add.collider(this.player, objects)];
    if (edges) colliders.push(this.physics.add.collider(this.player, edges));
    // los monstruos chocan con árboles, rocas, casas y bordes del mapa igual que el héroe
    colliders.push(this.physics.add.collider(this.monsters, ground), this.physics.add.collider(this.monsters, objects));
    if (edges) colliders.push(this.physics.add.collider(this.monsters, edges));
    const chunk = { key, zone, cx, cy, map, ground, objects, above, colliders, edges, things: [] };
    this.chunks.set(key, chunk);
    this.spawnChunkMonsters(chunk);
    this.spawnFauna(chunk);
  }

  unloadChunk(key) {
    const c = this.chunks.get(key);
    if (!c) return;
    c.colliders.forEach((col) => col.destroy());
    c.edges?.destroy(true);
    // la fauna tiene tweens y temporizadores propios: se cortan antes de destruirla
    c.things.forEach((t) => { this.tweens.killTweensOf(t); t.destroy?.(); });
    this.monsters.getChildren().filter((m) => m.getData('chunk') === key).forEach((m) => m.destroy());
    c.map.destroy();
    this.chunks.delete(key);
  }

  // Paso forzado del editor: libera casillas que el tile bloquearía y cierra bordes sueltos
  // (escaleras con barandas, cornisas que solo se bajan, pasillos de una casilla…).
  applyPassage(zone, mapKey, ground, objects, x0, y0) {
    const paso = this.cache.tilemap.get(mapKey)?.data?.paso;
    if (!paso || !Object.keys(paso).length) return null;
    const cw = zone.world.chunkWidth;
    const t = zone.world.tile;
    const edges = this.physics.add.staticGroup();
    const wall = (x, y, w, h, oneWay) => {
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false);
      edges.add(r);
      // cornisa: solo choca al subir (el héroe la toca con su lado de arriba)
      if (oneWay) Object.assign(r.body.checkCollision, { up: false, down: true, left: false, right: false });
    };
    for (const [idx, v] of Object.entries(paso)) {
      const tx = Number(idx) % cw;
      const ty = Math.floor(Number(idx) / cw);
      const px = x0 + tx * t;
      const py = y0 + ty * t;
      if (!(v & (PASO_FORZADO | PASO_CORNISA))) continue;
      // la casilla manda: se olvida la colisión de sus tiles y se cierran solo los bordes pedidos
      [ground, objects].forEach((l) => l.getTileAt(tx, ty)?.resetCollision(false));
      if (v & PASO_CORNISA) { wall(px, py, t, EDGE, true); continue; }
      const m = v & 15;
      if (m === 15) { wall(px, py, t, t); continue; }
      if (m & 1) wall(px, py, t, EDGE);
      if (m & 2) wall(px + t - EDGE, py, EDGE, t);
      if (m & 4) wall(px, py + t - EDGE, t, EDGE);
      if (m & 8) wall(px, py, EDGE, t);
    }
    // las caras de choque de los vecinos cambian cuando una casilla deja de chocar
    ground.calculateFacesWithin(0, 0, cw, zone.world.chunkHeight);
    objects.calculateFacesWithin(0, 0, cw, zone.world.chunkHeight);
    return edges;
  }

  // capa de suelo y tile bajo un punto del mundo (para la hierba alta y la fauna)
  groundTileAt(x, y) {
    const key = this.chunkKeyAt(x, y);
    return (key && this.chunks.get(key)?.ground.getTileAtWorldXY(x, y)) || null;
  }

  // ---------------------------------------------------------------- casillas caminables
  // Mapa de choque de todo el continente a nivel de casilla (1 = se camina), sacado de los
  // trozos: tiles con "colision" en suelo u objetos, corregido por el paso forzado del editor.
  // Fuera de toda zona no se camina.
  buildWalkGrid() {
    const T = 32;
    this.gridW = Math.ceil(this.worldPx.w / T);
    this.gridH = Math.ceil(this.worldPx.h / T);
    const walk = new Uint8Array(this.gridW * this.gridH);
    const FLIP = 0x1fffffff;
    for (const z of this.zones) {
      const cw = z.world.chunkWidth;
      const ch = z.world.chunkHeight;
      for (const c of z.world.chunks) {
        const d = this.cache.tilemap.get(`chunk_${z.dir}_${c.cx}_${c.cy}`)?.data;
        if (!d) continue;
        const ts = d.tilesets?.[0];
        const first = ts?.firstgid ?? 1;
        const col = new Set((ts?.tiles ?? []).filter((t) => t.properties?.some((p) => p.name === 'colision' && p.value)).map((t) => t.id + first));
        const layer = (n) => d.layers.find((l) => l.name === n)?.data ?? [];
        const suelo = layer('suelo');
        const obj = layer('objetos');
        const gx0 = z.ox / T + c.cx * cw;
        const gy0 = z.oy / T + c.cy * ch;
        for (let k = 0; k < cw * ch; k++) {
          const blocked = col.has((suelo[k] ?? 0) & FLIP) || col.has((obj[k] ?? 0) & FLIP);
          walk[(gy0 + Math.floor(k / cw)) * this.gridW + gx0 + (k % cw)] = blocked ? 0 : 1;
        }
        for (const [idx, v] of Object.entries(d.paso ?? {})) {
          if (!(v & (PASO_FORZADO | PASO_CORNISA))) continue;
          const i = (gy0 + Math.floor(idx / cw)) * this.gridW + gx0 + (idx % cw);
          walk[i] = (v & PASO_CORNISA) || (v & 15) !== 15 ? 1 : 0;
        }
      }
    }
    this.walk = walk;
    this.pathCache = new Map();
  }

  walkable(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.gridW && ty < this.gridH && this.walk[ty * this.gridW + tx] === 1;
  }

  // ¿se puede ir en línea recta de una casilla a otra sin pisar nada que choque?
  // (se mira el ancho del cuerpo, no solo la línea del centro, para no rozar esquinas)
  clearLine(ax, ay, bx, by) {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4;
    const R = 0.3;
    for (let i = 1; i < n; i++) {
      const x = ax + 0.5 + ((bx - ax) * i) / n;
      const y = ay + 0.5 + ((by - ay) * i) / n;
      for (const [ox, oy] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
        if (!this.walkable(Math.floor(x + ox), Math.floor(y + oy))) return false;
      }
    }
    return true;
  }

  // Camino A* (4 direcciones, suavizado) entre dos puntos del mundo, medido en los pies del
  // personaje (feet = cuánto más abajo del centro del sprite están los pies). Devuelve los puntos
  // por donde pasar (centros de casilla, ya en coordenadas del sprite) terminando en el destino,
  // o null si no hay camino (entonces se va en línea recta, como antes).
  findPath(x0, y0, x1, y1, feet = 10) {
    if (!this.walk) return null;
    const T = 32;
    const sx = Math.floor(x0 / T);
    const sy = Math.floor((y0 + feet) / T);
    let ex = Math.floor(x1 / T);
    let ey = Math.floor((y1 + feet) / T);
    // punto de la ruta puesto sobre algo que choca (un banco, el borde de una fuente): se va a la
    // casilla libre más cercana en vez de meterse dentro
    let snapped = false;
    if (!this.walkable(ex, ey)) {
      for (let r = 1; r <= 3 && !snapped; r++) {
        for (let dy = -r; dy <= r && !snapped; dy++) {
          for (let dx = -r; dx <= r && !snapped; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.walkable(ex + dx, ey + dy)) { ex += dx; ey += dy; snapped = true; }
          }
        }
      }
    }
    const key = `${sx},${sy}>${ex},${ey}`;
    if (this.pathCache.has(key)) return this.pathCache.get(key)?.map((p) => ({ ...p })) ?? null;
    let result = null;
    if (sx === ex && sy === ey) result = [];
    else {
      const W = this.gridW;
      const start = sy * W + sx;
      const goal = ey * W + ex;
      const g = new Map([[start, 0]]);
      const from = new Map();
      const heap = [[Math.abs(ex - sx) + Math.abs(ey - sy), start]];
      const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1; const r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      let found = false;
      let budget = 40000;
      while (heap.length && budget-- > 0) {
        const [, cur] = pop();
        if (cur === goal) { found = true; break; }
        const cx = cur % W;
        const cy = (cur - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const ni = ny * W + nx;
          // el destino se acepta aunque el punto de la ruta haya quedado sobre algo que choca
          if (ni !== goal && !this.walkable(nx, ny)) continue;
          const ng = g.get(cur) + 1;
          if (ng < (g.get(ni) ?? Infinity)) {
            g.set(ni, ng);
            from.set(ni, cur);
            push(ng + Math.abs(ex - nx) + Math.abs(ey - ny), ni);
          }
        }
      }
      if (found) {
        const cells = [];
        for (let i = goal; i !== undefined && i !== start; i = from.get(i)) cells.push([i % W, Math.floor(i / W)]);
        cells.reverse();
        // suavizado: de cada punto se salta al más lejano que se ve en línea recta
        const smooth = [];
        let ax = sx;
        let ay = sy;
        for (let i = 0; i < cells.length; i++) {
          const next = cells[i + 1];
          if (next && this.clearLine(ax, ay, next[0], next[1])) continue;
          smooth.push(cells[i]);
          [ax, ay] = cells[i];
        }
        result = smooth.map(([tx, ty]) => ({ x: tx * T + 16, y: ty * T + 16 - feet }));
      }
    }
    if (this.pathCache.size > 500) this.pathCache.clear();
    this.pathCache.set(key, result);
    if (!result) return null;
    const out = result.map((p) => ({ ...p }));
    // el último paso cae justo en el punto de la ruta (o en la casilla libre que lo reemplaza)
    const end = snapped ? { x: ex * T + 16, y: ey * T + 16 - feet } : { x: x1, y: y1 };
    if (out.length) out[out.length - 1] = end; else out.push(end);
    return out;
  }

  // ---------------------------------------------------------------- NPCs
  // NPCs con su sprite propio, nombre, oficio y la marca de misión (! o ?)
  spawnNpcs(npcs) {
    const sprites = [...new Set(npcs.map((o) => propOf(o, 'sprite')).filter(Boolean))];
    this.loadThen(() => sprites.forEach((s) => {
      if (!this.textures.exists(`npc_${s}`)) this.load.spritesheet(`npc_${s}`, `${ASSETS}/mundo/caminar/${s}.png`, { frameWidth: 32, frameHeight: 32 });
    }), () => {
      for (const o of npcs) {
        const x = o.x + 16;
        const y = o.y + 16;
        // si su hoja no cargó (sprite nuevo sin exportar todavía) se ve con la del héroe
        const tex = this.textures.exists(`npc_${propOf(o, 'sprite')}`) ? `npc_${propOf(o, 'sprite')}` : 'heroe';
        const npc = this.add.sprite(x, y, tex, IDLE.down).setDepth(9);
        const blocker = this.add.rectangle(x, y + 8, 16, 10);
        this.blockers.add(blocker);
        // "Lyra, mercader" → nombre arriba y oficio debajo entre ‹ ›, como en un MMO
        const [npcName, npcRole] = String(propOf(o, 'nombre') ?? o.name).split(/,\s*/);
        const role = npcRole && this.add.text(x, y - 17, `‹${npcRole.charAt(0).toUpperCase()}${npcRole.slice(1)}›`, {
          fontFamily: "'EB Garamond', Georgia, serif", fontSize: '8px', fontStyle: 'italic', color: '#d8cdb4', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
        const tag = this.add.text(x, npcRole ? y - 25 : y - 17, npcName, {
          fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#ffe9a8', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
        const mark = this.add.text(x, tag.y - 8, '', {
          fontFamily: TAG_FONT, fontSize: '11px', fontStyle: 'bold', color: '#ffd84a', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
        // punto en el minimapa (solo se ve si tiene una misión)
        const dot = this.add.circle(x, y, 18, 0xffd84a).setStrokeStyle(5, 0x141420).setDepth(30).setVisible(false);
        this.cameras.main.ignore(dot);
        [tag, role, mark].filter(Boolean).forEach((t) => this.minimap?.ignore(t));
        // el mismo NPC puede estar en dos zonas (Lyra en la capital y en la aldea): clave por zona
        const id = propOf(o, 'dialogo') ?? o.name;
        // Paseo: fuera de las ciudades dan unos pasos alrededor de su puesto (casillas de radio,
        // "pasea" en el mapa lo cambia; 0 = quieto). En la ciudad se quedan en su tienda o su casa.
        const ciudad = !!this.zoneByDir[o.zone]?.world.ciudad;
        const radius = Number(propOf(o, 'pasea') ?? (ciudad ? 0 : NPC_STROLL_TILES)) * 32;
        if (tex !== 'heroe') this.makeWalkAnims(tex);
        const poi = this.pois.find((q) => q.id === o.name && q.x === x && q.y === y) ?? null;
        this.npcs.set(`${o.zone}:${id}`, {
          id, sprite: npc, mark, dot, name: npcName, tag, role, blocker, poi, tex,
          home: { x, y }, pos: { x, y }, radius, dir: 'down', target: null,
          wait: Phaser.Math.Between(1000, 6000), phase: Math.random() * Math.PI * 2,
        });
      }
      this.setNpcMarks(this.marks);
    });
  }

  // Los NPCs con paseo caminan despacio entre casillas libres cerca de su puesto y nunca se alejan
  // más de su radio. Si el héroe se acerca se detienen y lo miran (así es fácil hablarles).
  // Todos respiran (1 px) cuando están quietos.
  updateNpcs(time, delta) {
    if (!this.npcs.size || !this.player) return;
    for (const n of this.npcs.values()) {
      const sp = n.sprite;
      const hero = Phaser.Math.Distance.Between(n.pos.x, n.pos.y, this.player.x, this.player.y);
      let moving = false;
      if (hero < NPC_NOTICE_RADIUS) {
        // atento al héroe: deja lo que hacía y se gira hacia él
        n.target = null;
        const dx = this.player.x - n.pos.x;
        const dy = this.player.y - n.pos.y;
        n.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
        sp.setFlipX(n.dir === 'side' && dx < 0);
      } else if (n.radius > 0 && n.target) {
        const dx = n.target.x - n.pos.x;
        const dy = n.target.y - n.pos.y;
        const dist = Math.hypot(dx, dy);
        const step = (NPC_STROLL_SPEED * delta) / 1000;
        if (dist <= step) {
          n.pos = { ...n.target };
          n.target = null;
          n.wait = Phaser.Math.Between(2500, 8000);
        } else {
          n.pos = { x: n.pos.x + (dx / dist) * step, y: n.pos.y + (dy / dist) * step };
          n.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
          sp.setFlipX(n.dir === 'side' && dx < 0);
          moving = true;
        }
      } else if (n.radius > 0) {
        n.wait -= delta;
        if (n.wait <= 0) {
          n.target = this.npcStrollTarget(n);
          n.wait = n.target ? 0 : Phaser.Math.Between(2000, 5000);
        }
      }
      if (moving) {
        if (n.tex !== 'heroe') sp.anims.play(`walk_${n.tex}_${n.dir}`, true);
      } else if (sp.anims.isPlaying || sp.frame.name !== IDLE[n.dir]) {
        sp.anims.stop();
        sp.setFrame(IDLE[n.dir]);
      }
      // quieto respira; caminando ya se mueve con los pasos
      const breath = moving ? 0 : Math.round((Math.sin(time / 520 + n.phase) - 1) / 2);
      sp.setPosition(n.pos.x, n.pos.y + breath).setDepth(9 + n.pos.y / 100000);
      // lo que acompaña al NPC: nombre, oficio, marca de misión, punto del minimapa, choque y "E"
      const bob = Math.round(Math.sin(time / 300 + n.phase) * 1.5);
      n.role?.setPosition(n.pos.x, n.pos.y - 17);
      n.tag.setPosition(n.pos.x, n.role ? n.pos.y - 25 : n.pos.y - 17);
      n.mark.setPosition(n.pos.x, n.tag.y - 8 + bob);
      n.dot.setPosition(n.pos.x, n.pos.y);
      if (n.blocker.x !== n.pos.x || n.blocker.y !== n.pos.y + 8) {
        n.blocker.setPosition(n.pos.x, n.pos.y + 8);
        n.blocker.body?.updateFromGameObject();
        if (n.poi) { n.poi.x = n.pos.x; n.poi.y = n.pos.y; }
      }
    }
  }

  // casilla libre al azar dentro del radio del NPC, a la que se llega en línea recta
  npcStrollTarget(n) {
    const T = 32;
    const r = Math.floor(n.radius / T);
    const hx = Math.floor(n.home.x / T);
    const hy = Math.floor(n.home.y / T);
    const cx = Math.floor(n.pos.x / T);
    const cy = Math.floor(n.pos.y / T);
    for (let tries = 0; tries < 8; tries++) {
      const tx = hx + Phaser.Math.Between(-r, r);
      const ty = hy + Phaser.Math.Between(-r, r);
      if ((tx === cx && ty === cy) || !this.walkable(tx, ty)) continue;
      if (!this.clearLine(cx, cy, tx, ty)) continue;
      // que no se suban encima de otro NPC
      const busy = [...this.npcs.values()].some((m) => m !== n && Math.hypot(m.pos.x - (tx * T + 16), m.pos.y - (ty * T + 16)) < T);
      if (!busy) return { x: tx * T + 16, y: ty * T + 16 };
    }
    return null;
  }

  // Cargas de imágenes una detrás de otra: si varias partes (NPCs, vecinos de la ciudad,
  // compañeros, otros jugadores, monstruos) piden archivos mientras el cargador ya está
  // trabajando, Phaser puede dejarlos en cola para siempre. addFiles agrega los archivos;
  // done corre cuando terminaron de cargar.
  loadThen(addFiles, done) {
    this.loadChain = (this.loadChain ?? Promise.resolve()).then(() => new Promise((resolve) => {
      const run = () => {
        addFiles?.();
        this.load.once('complete', () => { try { done?.(); } finally { resolve(); } });
        this.load.start();
      };
      if (this.load.isLoading()) this.load.once('complete', run); else run();
    }));
  }

  // marks: { ren: '!' | '?' | 'gris' | null } (ver game/questGivers.js) — ? algo para entregar,
  // ! misión que ya puedes aceptar, gris: misión para dentro de poco
  setNpcMarks(marks) {
    this.marks = marks ?? {};
    const COLORS = { '?': ['#7dff9a', 0x7dff9a], '!': ['#ffd84a', 0xffd84a], gris: ['#a8a8b0', 0x8a8a94] };
    for (const n of this.npcs.values()) {
      const m = this.marks[n.id] ?? null;
      const [css, hex] = COLORS[m] ?? COLORS['!'];
      n.mark.setText(m ? (m === 'gris' ? '!' : m) : '');
      n.mark.setColor(css);
      n.mark.setAlpha(m === 'gris' ? 0.85 : 1);
      n.dot.setVisible(!!m);
      n.dot.setFillStyle(hex);
    }
  }

  // ---------------------------------------------------------------- recursos
  // Cada recurso tiene varios sitios posibles (puntos "recurso" con el mismo nombre y "sitio");
  // el servidor dice en cuál está ahora para este jugador.
  spawnResources(points) {
    const byId = new Map();
    for (const o of points) {
      if (!byId.has(o.name)) byId.set(o.name, { tipo: propOf(o, 'tipo'), spots: [] });
      byId.get(o.name).spots[propOf(o, 'sitio') ?? 0] = { x: o.x, y: o.y };
    }
    for (const [id, def] of byId) {
      const cfg = RESOURCES[def.tipo];
      if (!cfg) continue;
      const first = def.spots.find(Boolean);
      const sprite = this.add.sprite(first.x, first.y, cfg.sheet, cfg.frames[0]).setOrigin(0.5, 0.94).setDepth(9);
      const block = this.add.rectangle(first.x, first.y - 4, 18, 10);
      this.blockers.add(block);
      const glint = this.add.particles(0, 0, 'mota_mundo', {
        x: { min: -8, max: 8 }, y: { min: -6, max: 6 }, lifespan: 900, frequency: def.tipo === 'cofre' ? 500 : 900,
        scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, speedY: { min: -12, max: -4 }, tint: cfg.glint, blendMode: 'ADD',
      }).setDepth(11);
      glint.startFollow(sprite, 0, -12);
      this.minimap?.ignore(glint);
      const r = { id, tipo: def.tipo, cfg, sprite, block, glint, ready: true, spots: def.spots, spot: 0 };
      this.resources.set(id, r);
      const poi = { id, x: first.x, y: first.y - 6, label: cfg.label, resource: r };
      r.poi = poi;
      this.pois.push(poi);
      this.placeResource(r, 0);
    }
  }

  placeResource(r, spot) {
    const s = r.spots[spot] ?? r.spots.find(Boolean);
    r.spot = spot;
    r.sprite.setPosition(s.x, s.y);
    r.block.setPosition(s.x, s.y - 4);
    r.block.body?.updateFromGameObject?.();
    r.poi.x = s.x;
    r.poi.y = s.y - 6;
  }

  setResourceStates(list) {
    for (const s of list ?? []) {
      const r = this.resources.get(s.id);
      if (!r) continue;
      this.resourceState.set(s.id, s);
      if (s.ready) { this.placeResource(r, s.spot ?? 0); this.setResourceReady(r, true); }
      else { this.setResourceReady(r, false); this.scheduleRespawn(r, s.readyAt, s.spot); }
    }
  }

  setResourceReady(r, ready) {
    r.ready = ready;
    r.sprite.setFrame(r.cfg.frames[ready ? 0 : 1]);
    r.glint.emitting = ready;
  }

  // reaparece en su nuevo sitio cuando le toca
  scheduleRespawn(r, readyAt, spot) {
    r.respawn?.remove();
    const ms = Math.max(1000, new Date(readyAt).getTime() - Date.now());
    r.respawn = this.time.delayedCall(ms, () => {
      this.tweens.add({
        targets: r.sprite, alpha: 0, duration: 250,
        onComplete: () => {
          this.placeResource(r, spot ?? r.spot);
          this.setResourceReady(r, true);
          this.tweens.add({ targets: r.sprite, alpha: 1, duration: 400 });
        },
      });
    });
  }

  gather(r) {
    if (!r.ready || this.gathering) return;
    this.gathering = true;
    this.stopPlayer();
    // "trabajo" con barra de lanzamiento (como recolectar en WoW/FFXIV) antes de pedir el botín
    const ms = GATHER_MS;
    bus.emit('cast', { label: r.cfg.label, ms });
    this.tweens.add({ targets: r.sprite, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: Math.round(ms / 160) - 1, onComplete: () => r.sprite.setAngle(0) });
    const hit = ['mineral', 'tronco'].includes(r.tipo) ? 'golpe' : 'recoger';
    audio.sfx(hit);
    this.time.delayedCall(ms / 2, () => audio.sfx(hit));
    this.time.delayedCall(ms, () => bus.emit('gather', { id: r.id, tipo: r.tipo }));
  }

  // React avisa qué salió (o error con r.error)
  onGathered(res) {
    this.gathering = false;
    const r = this.resources.get(res.id);
    if (!r) return;
    if (res.error) {
      this.floatLoot([{ text: res.error, color: '#ff9a8a' }]);
      return;
    }
    this.setResourceReady(r, false);
    this.scheduleRespawn(r, res.readyAt, res.spot);
    audio.sfx(r.tipo === 'cofre' || r.tipo === 'restos' ? 'cofre' : 'recoger');
    const burst = this.add.particles(r.sprite.x, r.sprite.y - 12, 'mota_mundo', {
      speed: { min: 30, max: 90 }, lifespan: 600, scale: { start: 1.2, end: 0 }, emitting: false, tint: [r.cfg.glint, 0xffffff], blendMode: 'ADD',
    }).setDepth(12);
    burst.explode(18);
    this.time.delayedCall(800, () => burst.destroy());
    const lines = [];
    if (res.gold) lines.push({ text: `+${res.gold} oro`, color: '#ffd84a' });
    for (const it of res.items ?? []) lines.push({ text: `+${it.quantity} ${it.name}`, color: '#bfffcf' });
    this.floatLoot(lines);
  }

  // ---------------------------------------------------------------- fauna del ambiente
  // Mariposas sobre las flores, pájaros que se espantan al pasar, conejos en el prado, ciervos
  // en los bosques y hojas doradas que caen. Todo es decorado: nace y muere con su trozo.
  spawnFauna(chunk) {
    const flowers = [];
    const meadow = [];
    const trees = [];
    const golden = [];
    const gids = chunk.zone.gidSets;
    chunk.objects.forEachTile((t) => { if (t.index > 0 && gids.flores?.has(t.index)) flowers.push(t); });
    chunk.ground.forEachTile((t) => {
      if (gids.flores?.has(t.index)) flowers.push(t);
      else if (gids.prado?.has(t.index) && !chunk.objects.getTileAt(t.x, t.y)) meadow.push(t);
    });
    chunk.above?.forEachTile((t) => {
      if (gids.arboles?.has(t.index)) trees.push(t);
      if (gids.dorados?.has(t.index)) golden.push(t);
    });
    const pick = (list, n) => Phaser.Utils.Array.Shuffle(list.slice()).slice(0, n);
    const add = (o) => { chunk.things.push(o); this.minimap?.ignore(o); return o; };
    if (!this.anims.exists('f_mariposa')) {
      this.anims.create({ key: 'f_mariposa', frames: this.anims.generateFrameNumbers('f_mariposa', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'f_pajaro_vuela', frames: this.anims.generateFrameNumbers('f_pajaro', { frames: [1, 2] }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: 'f_conejo', frames: this.anims.generateFrameNumbers('f_conejo', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
    }
    // mariposas revoloteando cerca de las flores
    for (const t of pick(flowers, 6)) {
      const b = add(this.add.sprite(t.pixelX + 16, t.pixelY + 8, 'f_mariposa').setTint(Phaser.Utils.Array.GetRandom(BUTTERFLY_TINTS)).setDepth(19).play('f_mariposa'));
      const flutter = () => {
        if (!b.active) return;
        this.tweens.add({
          targets: b, x: t.pixelX + 16 + Phaser.Math.Between(-30, 30), y: t.pixelY + 8 + Phaser.Math.Between(-24, 16),
          duration: Phaser.Math.Between(1200, 2600), ease: 'Sine.easeInOut', onComplete: flutter,
        });
      };
      flutter();
    }
    if (chunk.zone.world.ciudad) return;
    // pájaros en el suelo que salen volando si te acercas
    for (const t of pick(meadow, 3)) {
      const bird = add(this.add.sprite(t.pixelX + 16, t.pixelY + 20, 'f_pajaro', 0).setDepth(9).setFlipX(Math.random() < 0.5));
      bird.setData('pajaro', true);
      this.tweens.add({ targets: bird, y: bird.y - 1, duration: 300, yoyo: true, repeat: -1, repeatDelay: Phaser.Math.Between(800, 2500) });
    }
    // conejos que saltan por el prado
    for (const t of pick(meadow, 2)) {
      const rab = add(this.add.sprite(t.pixelX + 16, t.pixelY + 20, 'f_conejo', 0).setDepth(9));
      const hop = () => {
        if (!rab.active) return;
        const dx = Phaser.Math.Between(-40, 40);
        rab.setFlipX(dx < 0).play('f_conejo');
        this.tweens.add({
          targets: rab, x: rab.x + dx, y: rab.y + Phaser.Math.Between(-20, 20), duration: 900,
          onComplete: () => {
            if (!rab.active) return;
            rab.anims.stop();
            rab.setFrame(0);
            this.time.delayedCall(Phaser.Math.Between(1500, 4000), hop);
          },
        });
      };
      this.time.delayedCall(Phaser.Math.Between(500, 3000), hop);
    }
    // ciervos pastando en los claros del bosque
    if (trees.length > 12) {
      for (const t of pick(meadow.filter((m) => trees.some((tr) => Math.abs(tr.x - m.x) < 5 && Math.abs(tr.y - m.y) < 5)), 1)) {
        const deer = add(this.add.sprite(t.pixelX + 16, t.pixelY + 16, 'f_ciervo', 0).setDepth(9).setFlipX(Math.random() < 0.5));
        const graze = this.time.addEvent({
          delay: Phaser.Math.Between(2500, 5000), loop: true,
          callback: () => { if (deer.active) deer.setFrame(deer.frame.name === 0 ? 1 : 0); else graze.remove(); },
        });
        deer.setData('ciervo', true);
      }
    }
    // hojas doradas que caen de los árboles dorados
    for (const t of pick(golden, 4)) {
      const p = add(this.add.particles(t.pixelX + 16, t.pixelY + 8, 'hoja', {
        x: { min: -20, max: 20 }, speedY: { min: 8, max: 18 }, speedX: { min: -6, max: 10 }, lifespan: 3500, frequency: 900,
        rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, tint: [0xf0d070, 0xd87a3a, 0xc8a040],
      }).setDepth(19));
      p.setScale(1);
    }
  }

  // pájaros y ciervos se espantan cuando el héroe pasa cerca
  scareFauna() {
    for (const c of this.chunks.values()) {
      for (const o of c.things) {
        if (!o.active || o.getData?.('huyendo')) continue;
        const near = Phaser.Math.Distance.Between(o.x, o.y, this.player.x, this.player.y);
        if (o.getData?.('pajaro') && near < 50) {
          o.setData('huyendo', true);
          o.play('f_pajaro_vuela');
          const dir = o.x < this.player.x ? -1 : 1;
          o.setFlipX(dir < 0);
          this.tweens.add({ targets: o, x: o.x + dir * 220, y: o.y - 160, alpha: 0, duration: 1600, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
        } else if (o.getData?.('ciervo') && near < 70) {
          o.setData('huyendo', true);
          o.setFrame(1);
          const dir = o.x < this.player.x ? -1 : 1;
          o.setFlipX(dir < 0);
          this.tweens.add({ targets: o, x: o.x + dir * 180, y: o.y + Phaser.Math.Between(-40, 40), alpha: 0, duration: 1400, delay: 200, onComplete: () => o.destroy() });
        }
      }
    }
  }

  // ---------------------------------------------------------------- textos flotantes
  // Botín, oro y XP subiendo desde el héroe, uno detrás del otro
  floatLoot(lines) {
    (lines ?? []).forEach((l, i) => {
      this.time.delayedCall(i * 260, () => {
        const t = this.add.text(this.player.x, this.player.y - 26, l.text, {
          fontFamily: TAG_FONT, fontSize: '8px', fontStyle: 'bold', color: l.color ?? '#ffffff', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(25).setResolution(TAG_RES).setAlpha(0);
        this.minimap?.ignore(t);
        this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 180 });
        this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 1300, duration: 700, onComplete: () => t.destroy() });
      });
    });
  }

  // ofrenda al Pilar: chispas de agua y luz sobre el héroe y el Pilar
  ofrendaFx() {
    const targets = [{ x: this.player.x, y: this.player.y }];
    if (this.city?.pilar) targets.push({ x: this.city.pilar.x, y: this.city.pilar.y - 90 });
    for (const t of targets) {
      const p = this.add.particles(t.x, t.y, 'mota_mundo', {
        x: { min: -16, max: 16 }, speedY: { min: -90, max: -30 }, speedX: { min: -20, max: 20 }, lifespan: 1400,
        scale: { start: 1.3, end: 0 }, tint: [0x9ae8ff, 0xffffff, 0xffe08a], blendMode: 'ADD', emitting: false,
      }).setDepth(24);
      this.minimap?.ignore(p);
      p.explode(36);
      this.time.delayedCall(1600, () => p.destroy());
    }
    this.cameras.main.flash(250, 180, 230, 255);
  }

  // columna de luz dorada al subir de nivel
  levelUpFx() {
    const { x, y } = this.player;
    const beam = this.add.rectangle(x, y - 60, 26, 140, 0xffe680, 0.4).setDepth(24).setBlendMode('ADD');
    const core = this.add.rectangle(x, y - 60, 8, 140, 0xffffff, 0.8).setDepth(24).setBlendMode('ADD');
    [beam, core].forEach((o) => { o.scaleX = 0.1; this.minimap?.ignore(o); });
    this.tweens.add({ targets: [beam, core], scaleX: 1, duration: 200, yoyo: true, hold: 700, onComplete: () => { beam.destroy(); core.destroy(); } });
    const ring = this.add.circle(x, y + 8, 6).setStrokeStyle(3, 0xffd84a).setDepth(24).setBlendMode('ADD');
    this.minimap?.ignore(ring);
    this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
    const p = this.add.particles(x, y, 'mota_mundo', {
      x: { min: -14, max: 14 }, speedY: { min: -120, max: -40 }, lifespan: 1200, scale: { start: 1.4, end: 0 },
      tint: [0xffd84a, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(24);
    this.minimap?.ignore(p);
    p.explode(40);
    this.time.delayedCall(1500, () => p.destroy());
    this.cameras.main.flash(300, 255, 240, 180);
  }

  // ---------------------------------------------------------------- día, noche y clima
  createDayNight(lights) {
    if (!this.textures.exists('luz')) {
      const c = this.textures.createCanvas('luz', 128, 128);
      const ctx = c.getContext();
      const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 128, 128);
      c.refresh();
    }
    const cam = this.cameras.main;
    // capa que tiñe todo (multiplica) por encima del mapa y debajo de los nombres
    this.shade = this.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0).setDepth(20.5).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.minimap.ignore(this.shade);
    // cubre lo que ve la cámara (con margen por el seguimiento suave)
    this.events.on('postupdate', () => {
      const v = cam.worldView;
      this.shade.setPosition(v.x - 48, v.y - 48);
      if (this.shade.width !== v.width + 96 || this.shade.height !== v.height + 96) this.shade.setSize(v.width + 96, v.height + 96);
      this.rain?.setPosition(v.x + v.width / 2, v.y - 20);
    });
    const LIGHT = { fogata: [0xff9a4a, 1.4], catedral: [0xbfd8ff, 3.2], pilar: [0x9ae8ff, 2.2], farol: [0xffd890, 1] };
    this.lights2 = lights.map((o) => {
      const tipo = propOf(o, 'tipo') ?? 'farol';
      const fire = tipo === 'fogata';
      const [tint, scale] = LIGHT[tipo] ?? LIGHT.farol;
      const glow = this.add.image(o.x, o.y, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(tint).setScale(scale).setAlpha(0);
      this.minimap.ignore(glow);
      return { glow, fire, orden: propOf(o, 'orden') ?? null };
    });
    // farol del héroe de noche
    this.heroLight = this.add.image(0, 0, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(0xffe0a0).setScale(1.3).setAlpha(0);
    this.minimap.ignore(this.heroLight);
    // luciérnagas cerca del héroe de noche
    this.fireflies = this.add.particles(0, 0, 'mota_mundo', {
      x: { min: -180, max: 180 }, y: { min: -120, max: 120 }, lifespan: 2600, frequency: 260,
      speedX: { min: -8, max: 8 }, speedY: { min: -8, max: 8 }, scale: { start: 0.5, end: 0.2 },
      alpha: { start: 0.9, end: 0 }, tint: 0xd8ff8a, blendMode: 'ADD', emitting: false,
    }).setDepth(20.7);
    this.fireflies.startFollow(this.player);
    this.minimap.ignore(this.fireflies);
    this.lastHour = -1;
    this.updateSky();
  }

  // Clima: la Pradera es de final de verano: casi siempre despejado, a veces llueve un rato
  createWeather() {
    const cam = this.cameras.main;
    this.rain = this.add.particles(0, 0, 'gota', {
      x: { min: -400, max: 400 }, y: 0, speedY: { min: 380, max: 460 }, speedX: { min: -60, max: -40 },
      lifespan: 900, frequency: 8, quantity: 2, alpha: { start: 0.55, end: 0.2 }, emitting: false,
    }).setDepth(22);
    this.minimap.ignore(this.rain);
    this.rain.setPosition(cam.worldView.x, cam.worldView.y);
    const roll = () => {
      // durante la noche eterna manda la niebla, no llueve
    const rainy = !this.frozenNight() && Math.random() < (this.world.clima?.lluvia ?? 0);
      this.setWeather(rainy ? 'lluvia' : 'despejado');
      this.time.delayedCall(Phaser.Math.Between(4, 8) * 60000, roll);
    };
    this.time.delayedCall(Phaser.Math.Between(60000, 120000), roll);
  }

  // niebla espectral de la cacería (la ven todos los de la zona, no es al azar como la lluvia)
  setMythicFog(on) {
    if (!this.mythicFog && on) {
      this.mythicFog = this.add.particles(0, 0, 'luz', {
        x: { min: -460, max: 460 }, y: { min: -320, max: 320 }, lifespan: 9000, frequency: 420,
        speedX: { min: 4, max: 14 }, speedY: { min: -3, max: 3 }, scale: { start: 2.6, end: 3.6 },
        alpha: { onEmit: () => 0, onUpdate: (_p, _k, t) => Math.sin(t * Math.PI) * 0.2 }, tint: 0xc8d8ff, emitting: false,
      }).setDepth(20.8);
      this.minimap?.ignore(this.mythicFog);
    }
    if (!this.mythicFog) return;
    const v = this.cameras.main.worldView;
    this.mythicFog.setPosition(v.centerX, v.centerY);
    if (on !== this.mythicFog.emitting) {
      this.mythicFog.emitting = on;
      this.mythicFog.setParticleTint(this.redMoon ? 0xffc0b8 : 0xc8d8ff);
      if (on && this.weather === 'lluvia') this.setWeather('despejado');
      bus.emit('weather', on ? 'niebla' : this.weather);
    }
  }

  setWeather(kind) {
    if (kind === this.weather) return;
    this.weather = kind;
    this.rain.emitting = kind === 'lluvia';
    bus.emit('weather', kind);
  }

  updateSky() {
    // noche eterna: mientras el jefe mítico vive, en su zona se queda la medianoche
    const frozen = this.frozenNight();
    const h = frozen ? 1 : gameHour();
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
    const [h0, c0] = SKY[i];
    const [h1, c1] = SKY[i + 1];
    let color = lerpColor(c0, c1, (h - h0) / Math.max(0.001, h1 - h0));
    if (frozen) color = mulColor(color, this.redMoon ? 0xffa8a0 : 0xc8d4ff);
    // amanecer al caer el jefe: del color de la noche al del cielo de verdad
    if (!frozen && this.dawnUntil && this.time.now < this.dawnUntil) {
      color = lerpColor(this.dawnFrom, color, 1 - (this.dawnUntil - this.time.now) / 20000);
    }
    this.setMythicFog(frozen);
    if (this.weather === 'lluvia') color = mulColor(color, 0xb4bccc);
    this.shade.setFillStyle(color);
    // cuánto "de noche" es (0 de día, 1 en plena noche) para las luces
    const c = Phaser.Display.Color.IntegerToColor(color);
    const dark = Phaser.Math.Clamp(1 - (c.red + c.green + c.blue) / (3 * 255), 0, 1) * 1.6;
    const flicker = 0.9 + Math.sin(this.time.now / 90) * 0.05 + Math.random() * 0.05;
    for (const l of this.lights2) {
      // los faroles numerados se van encendiendo en orden al oscurecer (la ronda del farolero)
      const on = l.orden == null || dark > 0.12 + l.orden * 0.03;
      l.glow.setAlpha(on ? Math.min(1, dark) * (l.fire ? flicker : 0.85) : 0);
    }
    this.heroLight.setPosition(this.player.x, this.player.y - 6).setAlpha(Math.min(0.55, dark * 0.6));
    const night = dark > 0.35;
    this.fireflies.emitting = night && this.weather !== 'lluvia';
    const hour = Math.floor(h);
    if (hour !== this.lastHour) { this.lastHour = hour; bus.emit('clock', { hour, night }); }
  }

  // ---------------------------------------------------------------- subzonas
  updateSubzone() {
    const { x, y } = this.toLocal(this.player.x, this.player.y, this.zone);
    const sz = this.world.subzonas?.find((s) => x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1);
    if (sz && sz.name !== this.subzone?.name) {
      this.subzone = sz;
      bus.emit('subzone', { name: sz.name, levels: sz.levels, safe: !!sz.safe, zone: this.zoneName });
    }
  }

  // ---------------------------------------------------------------- compañeros y mascota
  // classes: clases base de los NPCs del grupo (en orden); caminan detrás del héroe
  setFollowers(classes) {
    const list = (classes ?? []).map((c) => (BASE_CLASSES.includes(c) ? c : 'guerrero')).slice(0, 2);
    if (list.join() === this.followers.map((f) => f.cls).join()) return;
    this.followers.forEach((f) => f.sprite.destroy());
    this.followers = [];
    const missing = list.filter((c) => !this.textures.exists(`npc_${c}`));
    const build = () => {
      this.followers = list.map((cls, i) => {
        this.makeWalkAnims(`npc_${cls}`);
        const sprite = this.add.sprite(this.player.x, this.player.y, `npc_${cls}`, IDLE.down).setDepth(9.9 - i * 0.1);
        return { cls, sprite, key: `npc_${cls}`, gap: 18 * (i + 1) };
      });
      if (this.pet) this.pet.gap = 18 * (this.followers.length + 1);
    };
    if (!missing.length) { build(); return; }
    this.loadThen(() => missing.forEach((c) => {
      if (!this.textures.exists(`npc_${c}`)) this.load.spritesheet(`npc_${c}`, `${ASSETS}/mundo/caminar/${c}.png`, { frameWidth: 32, frameHeight: 32 });
    }), build);
  }

  setPet(species) {
    const idx = PET_SPECIES.indexOf(species);
    this.pet?.sprite.destroy();
    this.pet = null;
    if (idx < 0) return;
    const sprite = this.add.sprite(this.player.x, this.player.y + 4, 'mascotas', idx * 2).setDepth(9.5).setOrigin(0.5, 0.85);
    const key = `pet_${species}`;
    if (!this.anims.exists(key)) this.anims.create({ key, frames: [{ key: 'mascotas', frame: idx * 2 }, { key: 'mascotas', frame: idx * 2 + 1 }], frameRate: 7, repeat: -1 });
    this.pet = { sprite, key, frame: idx * 2, gap: 18 * (this.followers.length + 1) };
  }

  // cada seguidor se para en la estela del héroe a su distancia
  updateFollowers(moving) {
    const p = this.player;
    const last = this.trail[0];
    if (!last || Phaser.Math.Distance.Between(last.x, last.y, p.x, p.y) > 2) {
      this.trail.unshift({ x: p.x, y: p.y });
      if (this.trail.length > 120) this.trail.pop();
    }
    const at = (gap) => {
      let d = 0;
      for (let i = 1; i < this.trail.length; i++) {
        d += Phaser.Math.Distance.Between(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
        if (d >= gap) return this.trail[i];
      }
      return this.trail[this.trail.length - 1] ?? { x: p.x, y: p.y };
    };
    for (const f of this.followers) {
      const pos = at(f.gap);
      const dx = pos.x - f.sprite.x;
      const dy = pos.y - f.sprite.y;
      f.sprite.setPosition(pos.x, pos.y).setDepth(pos.y < p.y ? 9.8 : 10.2);
      if (moving && (Math.abs(dx) + Math.abs(dy) > 0.3)) {
        const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
        if (dir === 'side') f.sprite.setFlipX(dx < 0);
        f.sprite.anims.play(`walk_${f.key}_${dir}`, true);
        f.dir = dir;
      } else if (f.sprite.anims.isPlaying) {
        f.sprite.anims.stop();
        f.sprite.setFrame(IDLE[f.dir ?? 'down']);
      }
    }
    if (this.pet) {
      const pos = at(this.pet.gap);
      const dx = pos.x - this.pet.sprite.x;
      this.pet.sprite.setPosition(pos.x, pos.y + 6).setDepth(pos.y < p.y ? 9.7 : 10.1);
      if (Math.abs(dx) > 0.2) this.pet.sprite.setFlipX(dx < 0);
      if (moving) this.pet.sprite.anims.play(this.pet.key, true);
      else if (this.pet.sprite.anims.isPlaying) { this.pet.sprite.anims.stop(); this.pet.sprite.setFrame(this.pet.frame); }
    }
  }

  // ---------------------------------------------------------------- jefes
  // Jefes en su guarida: quietos, más grandes, con su nombre y un aura; se desafían con E
  spawnBosses(catalog) {
    for (const b of this.bossPoints) {
      const info = catalog[b.code];
      if (!info || !this.textures.exists(`mon_${b.code}`)) continue;
      const animKey = `mon_idle_${b.code}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({ key: animKey, frames: info.animations.idle.frames.map((f) => ({ key: `mon_${b.code}`, frame: f })), frameRate: 2, repeat: -1 });
      }
      const aura = this.add.ellipse(b.x, b.y + 14, 56, 18, info.rank === 'jefe' ? 0xff4a3a : 0xffa03a, 0.35).setDepth(8);
      this.tweens.add({ targets: aura, alpha: 0.12, scaleX: 1.15, duration: 900, yoyo: true, repeat: -1 });
      const sprite = this.add.sprite(b.x, b.y, `mon_${b.code}`, info.animations.idle.frames[0])
        .setOrigin(0.5, 0.9).setScale(info.rank === 'jefe' ? 1 : 0.9).setDepth(9).play(animKey);
      const block = this.add.rectangle(b.x, b.y + 4, 30, 18);
      this.blockers.add(block);
      const tag = this.add.text(b.x, sprite.y - sprite.displayHeight * 0.9 - 2, `${info.rank === 'jefe' ? 'JEFE' : 'MINIJEFE'} · ${info.name}`, {
        fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: info.rank === 'jefe' ? '#ff8a7a' : '#ffc06a', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      this.minimap?.ignore(tag);
      Object.assign(b, { sprite, aura, block, tag, name: info.name, rank: info.rank });
      this.pois.push({ id: b.id, x: b.x, y: b.y + 10, label: b.label, boss: b });
    }
  }

  hideBoss(b) {
    [b.sprite, b.aura, b.tag].forEach((o) => o.setVisible(false));
    b.block.body.enable = false;
    b.hidden = true;
    // vuelve a su guarida a los 5 minutos
    this.time.delayedCall(5 * 60 * 1000, () => {
      [b.sprite, b.aura, b.tag].forEach((o) => o.setVisible(true));
      b.block.body.enable = true;
      b.hidden = false;
    });
  }

  onReturnFromBattle(result) {
    this.encounterLock = false;
    this.graceUntil = this.time.now + POST_BATTLE_GRACE_MS;
    this.shooMonsters();
    this.input.keyboard.enabled = true;
    this.input.keyboard.resetKeys();
    this.cameras.main.fadeIn(450);
    // jefe derrotado: desaparece de su guarida un rato
    const boss = this.lastBoss;
    this.lastBoss = null;
    if (result === 'PLAYER_WON' && boss?.sprite?.active) this.hideBoss(boss);
    const mon = this.lastEncounterMon;
    this.lastEncounterMon = null;
    if (result === 'PLAYER_WON' && mon?.active && mon.getData('minion')) {
      // esbirro cazado: se deshace en niebla y otro sale un rato después
      mon.destroy();
      this.time.delayedCall(15000, () => this.syncMinions());
    } else if (result === 'PLAYER_WON' && mon?.active) {
      // el derrotado desaparece y otro de la misma zona aparece un rato después
      const area = mon.getData('area');
      const chunkKey = mon.getData('chunk');
      const catalog = this.cache.json.get('enemigos').monsters;
      mon.destroy();
      this.time.delayedCall(20000, () => {
        if (!this.chunks.has(chunkKey)) return;
        const list = this.eligibleMonsters(area, catalog);
        if (!list.length) return;
        this.createMonster(Phaser.Utils.Array.GetRandom(list), catalog, area, chunkKey);
      });
    }
    if (result === 'ENEMY_WON') {
      // despiertas en tu último refugio (o en el inicio de la zona si nunca pasaste por uno)
      const r = this.refuge && this.zoneByDir[this.refuge.zone] ? this.toGlobal(this.refuge.x, this.refuge.y, this.refuge.zone) : this.spawnPoint;
      this.player.setPosition(r.x, r.y);
      bus.emit('hero-revive', { place: this.refuge?.name ?? null });
      this.trail = [];
      this.updateChunks(true);
      this.checkZoneChange();
    }
  }

  // Minimapa: segunda cámara arriba a la derecha (el marco lo dibuja el HUD de React).
  createMinimap() {
    const { width, height, margin, zoom } = MINIMAP;
    this.minimap = this.cameras.add(0, 0, width, height).setZoom(zoom).setName('minimapa');
    this.minimap.setBounds(0, 0, this.worldPx.w, this.worldPx.h);
    this.minimap.setBackgroundColor(0x1a2416);
    this.minimap.startFollow(this.player);
    this.minimap.ignore(this.nameTag);
    // punto del jugador: grande para que se vea al zoom del minimapa, invisible en la cámara principal
    this.playerDot = this.add.circle(this.player.x, this.player.y, 14, 0xffe066).setStrokeStyle(5, 0x141420).setDepth(30);
    this.cameras.main.ignore(this.playerDot);
    const place = (gameSize) => this.minimap.setPosition(gameSize.width - width - margin, margin);
    place(this.scale.gameSize);
    this.scale.on('resize', place);
    this.events.once('shutdown', () => this.scale.off('resize', place));
  }

  // ---------------------------------------------------------------- monstruos
  // Nivel mínimo de cada monstruo de la zona: los que te superan no rondan el mapa hasta que
  // tengas nivel (igual que el servidor no los mete en los encuentros de hierba).
  // (de todas las zonas del continente que tienen monstruos)
  async loadMonsterLevels() {
    this.minLevel = {};
    const withMonsters = [...new Set(this.allPoints().filter((o) => o.type === 'encuentro' || o.type === 'jefe').map((o) => this.zoneByDir[o.zone].world.zona))];
    await Promise.all(withMonsters.map(async (id) => {
      try {
        const list = await fetch(`${API_URL}/api/zones/${id}/monsters`).then((r) => r.json());
        for (const m of list) this.minLevel[m.code] = m.min_spawn_level;
      } catch { /* sin datos: aparecen todos */ }
    }));
  }

  eligibleMonsters(area, catalog) {
    return this.areaMonsters(area).filter((c) => catalog[c] && this.textures.exists(`mon_${c}`) && (this.minLevel?.[c] ?? 1) <= this.heroLevel + 1);
  }

  // Las hojas de los monstruos se cargan una vez para toda la zona; los monstruos aparecen
  // cuando se construye el trozo de su zona de hierba.
  loadMonsterSheets() {
    const catalog = this.cache.json.get('enemigos').monsters;
    const codes = new Set([...this.encounterAreas.flatMap((a) => this.areaMonsters(a)), ...this.bossPoints.map((b) => b.code)]);
    this.loadThen(() => {
      for (const code of codes) {
        const m = catalog[code];
        if (m && !this.textures.exists(`mon_${code}`)) {
          this.load.spritesheet(`mon_${code}`, `${ASSETS}/sprites/combate/${m.sheet}`, { frameWidth: m.frameSize.w, frameHeight: m.frameSize.h });
        }
      }
    }, () => {
      this.sheetsReady = true;
      for (const c of this.chunks.values()) this.spawnChunkMonsters(c);
      this.spawnBosses(catalog);
    });
  }

  spawnChunkMonsters(chunk) {
    if (!this.sheetsReady || chunk.monstersSpawned) return;
    chunk.monstersSpawned = true;
    const catalog = this.cache.json.get('enemigos').monsters;
    for (const area of this.encounterAreas.filter((a) => a.chunk === chunk.key)) {
      const list = this.eligibleMonsters(area, catalog);
      const count = propOf(area, 'cantidad') ?? 2;
      for (let i = 0; i < count && list.length; i++) this.createMonster(Phaser.Utils.Array.GetRandom(list), catalog, area, chunk.key);
    }
  }

  areaMonsters(area) {
    return String(propOf(area, 'monstruos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  createMonster(code, catalog, area, chunkKey) {
    const info = catalog[code];
    const x = Phaser.Math.Between(area.x + 16, area.x + area.width - 16);
    const y = Phaser.Math.Between(area.y + 16, area.y + area.height - 16);
    const idle = info.animations.idle.frames;
    const animKey = `mon_idle_${code}`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({ key: animKey, frames: idle.map((f) => ({ key: `mon_${code}`, frame: f })), frameRate: 2.5, repeat: -1 });
    }
    const mon = this.monsters.create(x, y, `mon_${code}`, idle[0]).setScale(0.75).setDepth(9);
    mon.play(animKey);
    mon.body.setSize(24, 16).setOffset(info.frameSize.w / 2 - 12, info.frameSize.h - 20);
    mon.setData({ code, name: info.name, area, chunk: chunkKey });
    // rango de nivel de la subzona (como en un MMO), con color según el peligro para el héroe
    const levels = this.levelsAt(area.x + area.width / 2, area.y + area.height / 2);
    mon.setData('levels', levels);
    if (levels) {
      const tag = this.add.text(x, y, `Nv ${levels}`, {
        fontFamily: TAG_FONT, fontSize: '6px', fontStyle: 'bold', color: this.levelColor(levels), stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      this.minimap?.ignore(tag);
      mon.setData('tag', tag);
      mon.setData('tagDy', (info.frameSize.h * 0.75) / 2 - 2);
      mon.once('destroy', () => tag.destroy());
    }
    this.wander(mon);
  }

  // salidas que quedan: solo hacia zonas que aún no están en el continente (etheria.json)
  checkExits(time) {
    if (!this.exits?.length || this.changingZone || time < this.exitsArmedAt) return;
    const { x, y } = this.player;
    const e = this.exits.find((ex) => Phaser.Geom.Rectangle.Contains(ex.rect, x, y + 8));
    if (e?.dest) this.changeZone(e.dest, e.tx, e.ty);
  }

  // salto a una zona fuera del continente: fundido y React vuelve a montar la escena
  changeZone(dest, tx, ty) {
    if (this.changingZone) return;
    this.changingZone = true;
    this.stopPlayer();
    this.input.keyboard.enabled = false;
    audio.sfx('abrir');
    this.cameras.main.fadeOut(350, 10, 10, 16);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      bus.emit('zone-change', { zoneDir: dest, x: (tx ?? 0) * 32 + 16, y: (ty ?? 0) * 32 + 16 });
    });
  }

  // posición para los demás jugadores (React la manda por socket): ~7 veces por segundo y solo
  // si cambió algo
  reportPosition(time) {
    if (time - (this.lastReport ?? 0) < 140) return;
    this.lastReport = time;
    const moving = this.player.body.velocity.lengthSq() > 0;
    const pos = this.toLocal(this.player.x, this.player.y, this.zone);
    const msg = { x: pos.x, y: pos.y, f: this.facing, flip: this.player.flipX, m: moving };
    const sig = `${msg.x},${msg.y},${msg.f},${msg.flip},${msg.m}`;
    if (sig === this.lastReportSig) return;
    this.lastReportSig = sig;
    bus.emit('hero-moved', msg);
  }

  // niveles de la subzona que contiene el punto (la primera de la lista que lo contenga)
  levelsAt(gx, gy) {
    const z = this.zoneAt(gx, gy);
    if (!z) return null;
    const x = gx - z.ox;
    const y = gy - z.oy;
    const sz = z.world.subzonas?.find((s) => x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1);
    return sz?.levels ?? null;
  }

  // gris muy fácil, verde fácil, amarillo parejo, naranja difícil, rojo peligroso (estilo WoW)
  levelColor(levels) {
    const [a, b = a] = String(levels).split('-').map(Number);
    const diff = (a + b) / 2 - this.heroLevel;
    if (diff >= 5) return '#ff4a4a';
    if (diff >= 3) return '#ff9a3c';
    if (diff >= -2) return '#ffe066';
    if (diff >= -6) return '#7ddc5a';
    return '#a0a0a0';
  }

  // Aparta a los monstruos que quedaron pegados al héroe al volver de un combate
  shooMonsters() {
    if (!this.player) return;
    for (const m of this.monsters.getChildren()) {
      const d = Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y);
      if (d > SHOO_RADIUS) continue;
      const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, m.x, m.y) || Math.random() * Math.PI * 2;
      const nx = this.player.x + Math.cos(ang) * SHOO_RADIUS;
      const ny = this.player.y + Math.sin(ang) * SHOO_RADIUS;
      if (this.walkable(Math.floor(nx / 32), Math.floor((ny + 10) / 32))) m.setPosition(nx, ny);
      m.setVelocity(Math.cos(ang) * 40, Math.sin(ang) * 40);
    }
  }

  // ¿este monstruo es mucho más débil que el héroe? (entonces no se le acerca)
  isShy(mon) {
    const levels = mon.getData('levels');
    if (!levels || mon.getData('minion')) return false;
    const [a, b = a] = String(levels).split('-').map(Number);
    return this.heroLevel - b >= SHY_LEVEL_GAP;
  }

  // Refugios: el Pilar de Aethra y las fogatas fuera de las ciudades
  buildRefuges(all) {
    this.refuges = all.filter((o) => o.type === 'pilar' || (o.type === 'luz' && propOf(o, 'tipo') === 'fogata' && !this.zoneByDir[o.zone]?.world.ciudad))
      .map((o) => {
        const z = this.zoneByDir[o.zone];
        const lx = o.x - z.ox;
        const ly = o.y - z.oy;
        const sz = z.world.subzonas?.find((s) => s.name !== z.world.nombre && lx >= s.x0 && lx < s.x1 && ly >= s.y0 && ly < s.y1);
        const name = o.type === 'pilar' ? 'el Pilar de Aethra' : `la fogata de ${sz?.name ?? z.world.nombre}`;
        return { x: o.x, y: o.y + 24, zone: o.zone, name };
      });
    try { this.refuge = JSON.parse(localStorage.getItem(REFUGE_KEY)); } catch { this.refuge = null; }
  }

  checkRefuge(time) {
    if (!this.refuges?.length || time < (this.nextRefugeCheck ?? 0)) return;
    this.nextRefugeCheck = time + 500;
    const r = this.refuges.find((q) => Phaser.Math.Distance.Between(q.x, q.y, this.player.x, this.player.y) < REFUGE_RADIUS);
    if (!r || this.refuge?.name === r.name) return;
    const l = this.toLocal(r.x, r.y, this.zoneByDir[r.zone]);
    this.refuge = { name: r.name, zone: r.zone, x: l.x, y: l.y };
    try { localStorage.setItem(REFUGE_KEY, JSON.stringify(this.refuge)); } catch { /* sin guardar */ }
    bus.emit('social-toast', { text: `Refugio: ${r.name}. Si caes, despertarás aquí.`, kind: 'ok' });
    audio.sfx('curar');
  }

  // Deambula dentro de su zona de hierba alta; si se sale, vuelve hacia el centro.
  wander(mon) {
    if (!mon.active) return;
    const { area } = mon.data.values;
    // los muy débiles se apartan si el héroe anda cerca (no huyen lejos de su zona)
    if (this.player && this.isShy(mon) && Phaser.Math.Distance.Between(mon.x, mon.y, this.player.x, this.player.y) < SHY_RADIUS) {
      const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, mon.x, mon.y);
      mon.setVelocity(Math.cos(ang) * 34, Math.sin(ang) * 34);
      mon.setFlipX(mon.body.velocity.x > 0);
      this.time.delayedCall(Phaser.Math.Between(700, 1200), () => this.wander(mon));
      return;
    }
    const inside = Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(area.x, area.y, area.width, area.height), mon.x, mon.y);
    if (!inside) {
      this.physics.moveTo(mon, area.x + area.width / 2, area.y + area.height / 2, 30);
    } else if (Math.random() < 0.35) {
      mon.setVelocity(0, 0);
    } else {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      mon.setVelocity(Math.cos(angle) * 28, Math.sin(angle) * 28);
    }
    // Los sprites de combate miran a la izquierda: voltear cuando caminan a la derecha
    mon.setFlipX(mon.body.velocity.x > 0);
    this.time.delayedCall(Phaser.Math.Between(1200, 2800), () => this.wander(mon));
  }

  startEncounter(mon) {
    if (this.encounterLock || this.time.now < this.graceUntil) return;
    this.encounterLock = true;
    this.lastEncounterMon = mon;
    this.stopPlayer();
    this.monsters.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
    this.cameras.main.shake(250, 0.006);
    audio.sfx('encuentro');
    this.tweens.add({ targets: mon, alpha: 0.3, yoyo: true, repeat: 3, duration: 90 });
    if (mon.getData('minion')) {
      bus.emit('encounter', {
        kind: 'esbirro', code: mon.getData('code'), name: mon.getData('name'), level: Math.max(1, Math.min(15, this.heroLevel ?? 1)),
        zoneId: this.zoneId, position: this.toLocal(this.player.x, this.player.y, this.zone),
      });
      return;
    }
    bus.emit('encounter', {
      kind: 'zone', code: mon.getData('code'), name: mon.getData('name'), zoneId: this.zoneId, areaLevels: this.subzone?.levels ?? null,
      position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  }

  // Encuentro aleatorio al pisar hierba alta (como en Pokémon): una tirada por casilla nueva
  checkGrassEncounter() {
    if (!this.grassChance || !this.grassGid) return;
    const tile = this.groundTileAt(this.player.x, this.player.y + 10);
    const key = tile ? `${tile.x},${tile.y},${this.chunkKeyAt(this.player.x, this.player.y + 10)}` : null;
    if (key === this.lastTile) return;
    this.lastTile = key;
    this.updateSubzone();
    if (tile?.index === this.grassGid) audio.sfx('pasos');
    if (!tile || tile.index !== this.grassGid || this.time.now < this.graceUntil) return;
    if (Math.random() >= this.grassChance) return;
    this.encounterLock = true;
    this.lastEncounterMon = null;
    this.stopPlayer();
    this.monsters.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
    this.cameras.main.shake(250, 0.006);
    audio.sfx('encuentro');
    bus.emit('encounter', { kind: 'zone', name: null, zoneId: this.zoneId, areaLevels: this.subzone?.levels ?? null, position: this.toLocal(this.player.x, this.player.y, this.zone) });
  }

  // Desafiar a un jefe en su guarida (React pide confirmación antes de empezar)
  challengeBoss(b) {
    if (b.hidden) return;
    this.lastBoss = b;
    bus.emit('boss-challenge', {
      kind: 'boss', code: b.code, level: b.level, name: b.name, rank: b.rank,
      zoneId: this.zoneId, position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
  }

  // Lo llama React al confirmar el desafío: bloquea el mapa hasta que vuelva del combate
  lockForBattle() {
    this.encounterLock = true;
    this.stopPlayer();
    this.monsters.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
  }

  stopPlayer() {
    if (!this.player) return;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.player.setFrame(IDLE[this.facing]);
  }

  // ---------------------------------------------------------------- piedra de regreso
  // Se canaliza unos segundos quieto, envuelto en motas de agua. Moverse o que te ataquen la
  // corta (como la piedra de hogar de WoW): así no sirve para escapar de un combate.
  startHearth(ms) {
    if (this.hearthing || this.gathering || this.teleporting || this.encounterLock || !this.player) return false;
    this.stopPlayer();
    const fx = this.add.particles(this.player.x, this.player.y + 6, 'mota_mundo', {
      speedY: { min: -60, max: -25 }, speedX: { min: -12, max: 12 }, lifespan: 900, frequency: 45,
      scale: { start: 1.1, end: 0 }, tint: [0x9ae8ff, 0xe8fcff, 0x4ab4e8], blendMode: 'ADD',
      emitZone: { type: 'edge', source: new Phaser.Geom.Ellipse(0, 0, 30, 12), quantity: 24 },
    }).setDepth(12);
    this.hearthing = { until: this.time.now + ms, fx };
    return true;
  }

  stopHearth(reason) {
    const h = this.hearthing;
    if (!h) return;
    this.hearthing = null;
    h.fx.stop();
    this.time.delayedCall(900, () => h.fx.destroy());
    bus.emit(reason === 'listo' ? 'hearth-done' : 'hearth-cancel', { reason });
  }

  updateHearth(moving) {
    const h = this.hearthing;
    if (!h) return;
    h.fx.setPosition(this.player.x, this.player.y + 6);
    if (moving) this.stopHearth('movimiento');
    else if (this.time.now >= h.until) this.stopHearth('listo');
  }

  hearthArriveFx() {
    if (!this.player) return;
    const burst = this.add.particles(this.player.x, this.player.y, 'mota_mundo', {
      speed: { min: 40, max: 110 }, lifespan: 700, scale: { start: 1.4, end: 0 }, emitting: false,
      tint: [0x9ae8ff, 0xffffff], blendMode: 'ADD',
    }).setDepth(12);
    burst.explode(28);
    this.time.delayedCall(900, () => burst.destroy());
  }

  update(time, delta) {
    if (!this.player) return;
    if (this.shade) this.updateSky();
    this.social?.update(delta);
    this.city?.update(delta);
    this.updateNpcs(time, delta);
    this.reportPosition(time);
    this.checkExits(time);
    this.checkRefuge(time);
    for (const m of this.monsters.getChildren()) {
      const tag = m.getData('tag');
      if (tag) tag.setPosition(m.x, m.y - m.getData('tagDy'));
      const glow = m.getData('glow');
      if (glow) glow.setPosition(m.x, m.y - 6);
    }
    if (this.encounterLock) { if (this.hearthing) this.stopHearth('combate'); return; }
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (this.input.keyboard.enabled && !this.gathering) {
      if (k.left.isDown || k.left2.isDown) vx -= 1;
      if (k.right.isDown || k.right2.isDown) vx += 1;
      if (k.up.isDown || k.up2.isDown) vy -= 1;
      if (k.down.isDown || k.down2.isDown) vy += 1;
    }
    const len = Math.hypot(vx, vy) || 1;
    const speed = SPEED * (this.speedMul ?? 1);
    this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
    this.player.anims.timeScale = this.speedMul ?? 1; // los pasos van al ritmo de la carrera
    this.updateHearth(!!(vx || vy));
    // con el bufo de velocidad se levanta polvo a los pies al correr
    if (this.dust) this.dust.emitting = !!(vx || vy) && this.speedMul > 1;

    if (vx || vy) {
      // la animación sigue al eje dominante; con diagonal pura gana el horizontal
      this.facing = Math.abs(vx) >= Math.abs(vy) && vx !== 0 ? 'side' : (vy < 0 ? 'up' : 'down');
      if (this.facing === 'side') this.player.setFlipX(vx < 0);
      this.player.anims.play(`walk_${this.facing}`, true);
    } else if (this.player.anims.isPlaying) {
      this.stopPlayer();
    }
    this.nameTag.setPosition(this.player.x, this.player.y - 14);
    this.playerDot?.setPosition(this.player.x, this.player.y);
    this.updateFollowers(!!(vx || vy));
    this.updateChunks();
    if (vx || vy) this.checkZoneChange();
    if (vx || vy) this.scareFauna();

    this.updatePoi();
    if (this.nearPoi && (Phaser.Input.Keyboard.JustDown(k.interact) || Phaser.Input.Keyboard.JustDown(k.interact2))) {
      if (this.nearPoi.boss) this.challengeBoss(this.nearPoi.boss);
      else if (this.nearPoi.mythic) this.challengeMythic();
      else if (this.nearPoi.resource) this.gather(this.nearPoi.resource);
      else bus.emit('interact', this.nearPoi);
    }
    if (vx || vy || !this.subzone) this.checkGrassEncounter();
  }

  updatePoi() {
    let nearest = null;
    for (const poi of this.pois) {
      if (poi.boss?.hidden || (poi.resource && !poi.resource.ready)) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, poi.x, poi.y) < (poi.radius ?? POI_RADIUS)) nearest = poi;
    }
    if (nearest !== this.nearPoi) {
      this.nearPoi = nearest;
      bus.emit('poi', nearest && { ...nearest, resource: nearest.resource ? { id: nearest.resource.id, tipo: nearest.resource.tipo } : undefined });
    }
  }
}
