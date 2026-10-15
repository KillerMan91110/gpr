import Phaser from 'phaser';
import bus from './bus';
import audio from './audio';
import { MINIMAP } from './hudLayout';
import SocialLayer from './socialLayer';
import StallLayer from './stallLayer';
import CityLife, { isFestival } from './cityLife';
import { TAG_FONT, TAG_RES, ASSETS, DEFAULT_ZONE, SPEED, CITY_SPEED, POI_RADIUS, CHUNK_NEAR, CHUNK_FAR, ENCOUNTER_GRACE_MS, POST_BATTLE_GRACE_MS, ESCAPE_GRACE_MS, SHY_RADIUS, PASO_FORZADO, PASO_CORNISA, EDGE, WALK, IDLE, FOLLOW_GAP, PET_SPECIES, BASE_CLASSES, SKY, lerpColor, mulColor, gameHour, propOf, isDungeon } from './world/shared';
import { mythicMethods } from './world/mythic';
import { walkGridMethods } from './world/walkGrid';
import { npcsMethods } from './world/npcs';
import { resourcesMethods } from './world/resources';
import { faunaMethods } from './world/fauna';
import { refugesMethods } from './world/refuges';
import { guideMethods } from './world/guide';
import { exploreMethods } from './world/explore';
import { eventsMethods } from './world/events';
import { criptaMethods } from './world/cripta';
import { questsMethods } from './world/quests';
import { trackingMethods } from './world/tracking';

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

// lo usan otros archivos (editor de mapas, cityLife)
export { PASO_FORZADO, PASO_CORNISA, gameHour } from './world/shared';

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
    // al saltar a una zona fuera del continente la escena se reinicia: lo de la anterior no sirve
    this.city = null;
    this.crypt = null;
    this.lastGuardian = null;
    this.mythic = null;
    // objetos que los módulos crean una sola vez (niebla del jefe mítico, huellas, esbirros, el
    // mercader): tras el reinicio apuntarían a los de la escena anterior, ya destruidos
    this.mythicFog = null;
    this.mythicTrail = [];
    this.minions = [];
    this.wanderer = null;
    this.changingZone = false;
    this.teleporting = false;
    this.pendingGrace = 0;
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
    this.load.spritesheet('recursos3', `${ASSETS}/mundo/recursos3.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('recursos4', `${ASSETS}/mundo/recursos4.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('mascotas', `${ASSETS}/mundo/mascotas.png`, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('f_mariposa', `${ASSETS}/mundo/fauna/mariposa.png`, { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet('f_pajaro', `${ASSETS}/mundo/fauna/pajaro.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('f_conejo', `${ASSETS}/mundo/fauna/conejo.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('f_ciervo', `${ASSETS}/mundo/fauna/ciervo.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.image('aspas', `${ASSETS}/mundo/aspas.png`);
    SocialLayer.preload(this);
    CityLife.preload(this);
    StallLayer.preload(this);
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
    // cada zona tiene su clima: al cruzar se vuelve a tirar (no sigue nevando en la Pradera)
    this.rollWeather?.();
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
      const f = this.make.graphics({ x: 0, y: 0 }, false);
      f.fillStyle(0xffffff, 1).fillRect(1, 0, 1, 3).fillRect(0, 1, 3, 1).generateTexture('copo', 3, 3).destroy();
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
    // tu gremio bajo tu nombre, igual que lo ven los demás (lo manda WorldSocial al entrar o cambiar)
    this.guildTag = this.add.text(start.x, start.y - 14, '', {
      fontFamily: "'EB Garamond', Georgia, serif", fontSize: '7px', fontStyle: 'italic', color: '#a8e0a0', stroke: '#141420', strokeThickness: 3,
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
    this.pois = present.filter((o) => ['poi', 'npc', 'pilar', 'vinculo', 'buzon'].includes(o.type)).map((o) => ({
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
    if (all.some((o) => ['ciudadano', 'pilar', 'cartel', 'palomas', 'gato', 'vinculo', 'estandarte', 'buzon'].includes(o.type))) this.city = new CityLife(this, all);
    this.spawnResources(all.filter((o) => o.type === 'recurso'));
    all.filter((o) => o.type === 'aspas').forEach((o) => {
      const blades = this.add.image(o.x, o.y, 'aspas').setDepth(20.2);
      this.tweens.add({ targets: blades, angle: 360, duration: 9000, repeat: -1 });
    });

    this.createDayNight(all.filter((o) => o.type === 'luz'));
    this.buildRefuges(all);
    this.buildSecrets(all);
    // la Cripta del Vigía: su boca en las ruinas y, dentro, guardianes, braseros, puerta y jefe
    this.buildCrypt(all);
    const onCryptState = (st) => this.applyCryptState(st);
    bus.on('crypt-state', onCryptState);
    this.events.once('shutdown', () => bus.off('crypt-state', onCryptState));
    // otros jugadores, globitos de chat, gestos y emojis
    this.social = new SocialLayer(this);
    // muñecos de venta de los jugadores (Barrio del Mercado)
    this.stalls = new StallLayer(this);
    this.createWeather();
    this.bindBus();

    this.graceUntil = this.time.now + ENCOUNTER_GRACE_MS;
    // al saltar de zona la escena se reinicia con el teclado apagado (changeZone lo apagó): se
    // vuelve a encender aquí, si no el héroe queda quieto hasta recargar la página
    this.input.keyboard.enabled = true;
    this.input.keyboard.resetKeys();
    this.loadMonsterSheets();
    this.updateChunks(true);
    // al volver del combate (la escena 'batalla' la duerme mientras tanto). Los eventos de la
    // escena sobreviven al reinicio: se quitan al cerrarla para no responder dos veces.
    const onWake = (_sys, data) => this.onReturnFromBattle(data?.result);
    this.events.on('wake', onWake);
    this.events.once('shutdown', () => this.events.off('wake', onWake));
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
      'quest-npc-spots': (spots) => this.setQuestNpcSpots(spots),
      'quest-points': (points) => this.setQuestPoints(points),
      'quest-track': (tracks) => this.setTracking(tracks),
      'quest-ambush': (a) => this.startQuestAmbush(a),
      'cripta-abrir': (e) => this.changeZone(e.dest, e.tx, e.ty),
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
      // grupo: seguir a otro jugador y entrar al combate que empezó un compañero
      'follow-player': (t) => this.startFollow(t),
      // (ojo: sin callback, cb?.(...) ni siquiera evalúa el argumento: se llama aparte)
      'coop-battle-join': (b, cb) => { const ok = this.joinGroupBattle(b); cb?.(ok); },
      // modo espectador: mirar el combate de otro jugador (menú del jugador → "Ver combate")
      'spectate-start': (t, cb) => { const ok = this.startSpectate(t); cb?.(ok); },
      'my-guild': (g) => this.guildTag?.setText(g ? `‹${g.name}›` : '').setColor(g?.color || '#a8e0a0'),
      // jefe mítico de zona (components/world/MythicHunt.js): aparece, se va o muere
      'mythic-state': (s) => this.setMythic(s?.hunt ?? null),
      // guía del aventurero: flecha hacia el objetivo del paso actual
      'guide-track': (id, cb) => cb?.(this.trackGuide(id)),
      // exploración: lo ya explorado y los cofres secretos abiertos (ver world/explore.js)
      'explore-init': (data) => this.initExplored(data),
      'secret-opened': (id) => this.secretOpened(id),
      // calendario de eventos: lo que aparece en el mapa (el mercader ambulante)
      'events-state': (active) => this.setEvents(active),
      // controles táctiles: dirección del joystick (-1..1) y "tocar para interactuar"
      'touch-move': (v) => { this.touchVec = v; },
      'touch-interact': () => { this.touchInteract = true; },
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
      points: this.allPoints().filter((o) => o.zone === z.dir && ['npc', 'poi', 'jefe', 'salida', 'pilar', 'vinculo', 'buzon'].includes(o.type)).map((o) => ({
        type: o.type, name: o.name, x: o.x - z.ox + 16, y: o.y - z.oy + 16,
        label: propOf(o, 'nombre') ?? propOf(o, 'etiqueta') ?? o.name,
        monster: propOf(o, 'monstruo'), level: propOf(o, 'nivel'), window: propOf(o, 'ventana'), dialogue: propOf(o, 'dialogo'),
      })),
      marks: this.marks,
      explored: this.exploredOf(z.dir),
      mythic: this.mythic?.sprite && this.mythic.zoneDir === z.dir
        ? { x: this.mythic.x - z.ox, y: this.mythic.y - z.oy, name: this.mythic.hunt.name, spot: this.mythic.hunt.spot }
        : null,
    };
  }

  // ---------------------------------------------------------------- jefe mítico

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

  // ---------------------------------------------------------------- NPCs

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

  // ---------------------------------------------------------------- recursos

  // ---------------------------------------------------------------- fauna del ambiente

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
    const cover = () => {
      const v = cam.worldView;
      this.shade.setPosition(v.x - 48, v.y - 48);
      if (this.shade.width !== v.width + 96 || this.shade.height !== v.height + 96) this.shade.setSize(v.width + 96, v.height + 96);
      this.rain?.setPosition(v.x + v.width / 2, v.y - 20);
      this.snow?.setPosition(v.x + v.width / 2, v.y - 20);
    };
    this.events.on('postupdate', cover);
    this.events.once('shutdown', () => this.events.off('postupdate', cover));
    const LIGHT = { fogata: [0xff9a4a, 1.4], catedral: [0xbfd8ff, 3.2], pilar: [0x9ae8ff, 2.2], farol: [0xffd890, 1], antorcha: [0xff9a4a, 0.9], faro: [0x7ff8ff, 1.7] };
    this.lights2 = lights.map((o) => {
      const tipo = propOf(o, 'tipo') ?? 'farol';
      const fire = tipo === 'fogata' || tipo === 'antorcha';
      const [tint, scale] = LIGHT[tipo] ?? LIGHT.farol;
      const glow = this.add.image(o.x, o.y, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(tint).setScale(scale).setAlpha(0);
      this.minimap.ignore(glow);
      return { glow, fire, tipo, orden: propOf(o, 'orden') ?? null };
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

  // Clima: la Pradera es de final de verano: casi siempre despejado, a veces llueve un rato.
  // En las zonas de invierno (clima.nieve) nieva en vez de llover.
  createWeather() {
    const cam = this.cameras.main;
    this.rain = this.add.particles(0, 0, 'gota', {
      x: { min: -400, max: 400 }, y: 0, speedY: { min: 380, max: 460 }, speedX: { min: -60, max: -40 },
      lifespan: 900, frequency: 8, quantity: 2, alpha: { start: 0.55, end: 0.2 }, emitting: false,
    }).setDepth(22);
    this.minimap.ignore(this.rain);
    this.rain.setPosition(cam.worldView.x, cam.worldView.y);
    this.snow = this.add.particles(0, 0, 'copo', {
      x: { min: -460, max: 460 }, y: { min: -40, max: 0 }, speedY: { min: 40, max: 80 }, speedX: { min: -30, max: 10 },
      lifespan: 9000, frequency: 40, quantity: 2, scale: { min: 0.8, max: 1.6 }, alpha: { start: 0.9, end: 0.3 },
      accelerationX: { min: -6, max: 6 }, emitting: false,
    }).setDepth(22);
    this.minimap.ignore(this.snow);
    this.snow.setPosition(cam.worldView.x, cam.worldView.y);
    this.rollWeather = () => {
      // durante la noche eterna manda la niebla: ni llueve ni nieva
      const clima = this.world.clima ?? {};
      const frozen = this.frozenNight();
      if (!frozen && Math.random() < (clima.nieve ?? 0)) this.setWeather('nieve');
      else this.setWeather(!frozen && Math.random() < (clima.lluvia ?? 0) ? 'lluvia' : 'despejado');
    };
    const roll = () => {
      this.rollWeather();
      this.time.delayedCall(Phaser.Math.Between(4, 8) * 60000, roll);
    };
    this.time.delayedCall(Phaser.Math.Between(60000, 120000), roll);
    // en las zonas de invierno el clima se ve desde que llegas
    if (this.world.clima?.nieve) this.rollWeather();
  }

  setWeather(kind) {
    if (kind === this.weather) return;
    this.weather = kind;
    this.rain.emitting = kind === 'lluvia';
    if (this.snow) this.snow.emitting = kind === 'nieve';
    bus.emit('weather', kind);
  }

  updateSky() {
    if (this.world?.interior) { this.updateIndoorSky(); return; }
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
    else if (this.weather === 'nieve') color = mulColor(color, 0xdce4f0);
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
    // respiro antes de otro combate (evita quedar atrapado en un bucle de peleas). El reloj de la
    // escena estuvo parado durante el combate y salta en el próximo cuadro: el respiro se cuenta
    // desde ahí (ver update), no desde ahora. Al huir es más corto.
    this.graceUntil = Infinity;
    this.pendingGrace = result === 'ESCAPED' ? ESCAPE_GRACE_MS : POST_BATTLE_GRACE_MS;
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
    this.cryptAfterBattle(result);
    if (result === 'ENEMY_WON') {
      // despiertas en tu último refugio (o en el inicio de la zona si nunca pasaste por uno); en
      // la cripta, en el último brasero que encendiste
      const r = this.crypt ? this.cryptRespawn()
        : this.refuge && this.zoneByDir[this.refuge.zone] ? this.toGlobal(this.refuge.x, this.refuge.y, this.refuge.zone) : this.spawnPoint;
      this.player.setPosition(r.x, r.y);
      bus.emit('hero-revive', { place: this.crypt ? (this.crypt.state?.respawn?.name ?? 'la entrada de la mazmorra') : this.refuge?.name ?? null });
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
    this.minimap.ignore(this.guildTag);
    // punto del jugador: grande para que se vea al zoom del minimapa, invisible en la cámara principal
    this.playerDot = this.add.circle(this.player.x, this.player.y, 14, 0xffe066).setStrokeStyle(5, 0x141420).setDepth(30);
    this.cameras.main.ignore(this.playerDot);
    const place = (gameSize) => this.minimap.setPosition(gameSize.width - width - margin, margin);
    place(this.scale.gameSize);
    this.scale.on('resize', place);
    this.events.once('shutdown', () => this.scale.off('resize', place));
  }

  // ---------------------------------------------------------------- monstruos
  // Todos los monstruos del área se ven siempre, aunque te superen: el letrero de la subzona y
  // el color de su nivel (rojo = peligroso) avisan, como en un MMO. Antes se escondían los de
  // más nivel y las subzonas altas parecían vacías aunque dijeran "Niveles 10-15".
  eligibleMonsters(area, catalog) {
    return this.areaMonsters(area).filter((c) => catalog[c] && this.textures.exists(`mon_${c}`));
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
      // las emboscadas de misión muestran a su monstruo: se rearman ahora que están sus hojas
      if (this.questPointsRaw?.length) this.setQuestPoints(this.questPointsRaw);
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
    // la Cripta del Vigía puede estar sellada (se abre con la llave de Aldren): React le pregunta
    // al servidor y, si está abierta, manda 'cripta-abrir'; mientras, el héroe da un paso atrás
    if (isDungeon(e?.dest)) {
      this.exitsArmedAt = time + 2500;
      this.stopPlayer();
      this.player.setPosition(this.player.x, this.player.y + 28);
      bus.emit('cripta-puerta', { dest: e.dest, tx: e.tx, ty: e.ty });
      return;
    }
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

  // Un compañero de grupo cercano chocó con monstruos: entras a su combate (mismo aviso que un
  // encuentro propio). Devuelve false si ya estabas en otro.
  joinGroupBattle(b) {
    if (this.encounterLock || !this.player) return false;
    this.encounterLock = true;
    this.stopFollow();
    if (this.hearthing) this.stopHearth('combate');
    this.stopPlayer();
    this.monsters.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
    this.cameras.main.shake(250, 0.006);
    audio.sfx('encuentro');
    bus.emit('encounter', {
      kind: b.kind ?? 'grupo', name: b.leaderName, zoneId: b.zoneId ?? this.zoneId, sessionId: b.sessionId,
      position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
    return true;
  }

  // Modo espectador: miras el combate de otro jugador (ver components/world/Battle.js). Tu héroe
  // se queda quieto en el mapa (los demás lo ven translúcido y con un globito con un ojo) y al
  // volver los monstruos de alrededor se apartan, como después de cualquier combate.
  startSpectate(t) {
    if (this.encounterLock || !this.player || !t?.targetId) return false;
    this.encounterLock = true;
    this.stopFollow();
    if (this.hearthing) this.stopHearth('combate');
    this.stopPlayer();
    this.monsters.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
    audio.sfx('abrir');
    bus.emit('encounter', {
      kind: 'espectar', targetId: t.targetId, name: t.name, initial: t.initial, zoneId: this.zoneId,
      position: this.toLocal(this.player.x, this.player.y, this.zone),
    });
    return true;
  }

  // ---------------------------------------------------------------- seguir a otro jugador
  // Como "seguir" en un MMO: tu héroe camina detrás de él (buscando el camino) hasta que tocas
  // una tecla de movimiento o lo pierdes de vista.
  startFollow(t) {
    if (!t?.id) return;
    this.following = { id: t.id, name: t.name, path: null, pathAt: 0 };
  }

  stopFollow(reason) {
    if (!this.following) return;
    const name = this.following.name;
    this.following = null;
    if (reason === 'perdido') bus.emit('social-toast', { text: `Perdiste de vista a ${name}.`, kind: 'error' });
  }

  // dirección hacia la que caminar para seguir (0,0 si ya está pegado)
  followStep(time) {
    const f = this.following;
    const o = this.social?.others.get(f.id);
    if (!o) { this.stopFollow('perdido'); return { x: 0, y: 0 }; }
    const tx = o.sprite.x;
    const ty = o.sprite.y;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty) < FOLLOW_GAP) { f.path = null; return { x: 0, y: 0 }; }
    if (!f.path?.length || time - f.pathAt > 700) {
      f.path = this.findPath(this.player.x, this.player.y, tx, ty) ?? [{ x: tx, y: ty }];
      f.pathAt = time;
    }
    while (f.path.length && Phaser.Math.Distance.Between(this.player.x, this.player.y, f.path[0].x, f.path[0].y) < 6) f.path.shift();
    const next = f.path[0] ?? { x: tx, y: ty };
    const dx = next.x - this.player.x;
    const dy = next.y - this.player.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
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
      areaMonsters: mon.getData('area') ? this.areaMonsters(mon.getData('area')) : null,
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
    bus.emit('encounter', {
      kind: 'zone', name: null, zoneId: this.zoneId, areaLevels: this.subzone?.levels ?? null, position: this.toLocal(this.player.x, this.player.y, this.zone),
      areaMonsters: this.areaMonstersAt(this.player.x, this.player.y),
    });
  }

  // Monstruos de la zona de encuentro donde estás (o de la más cercana de tu subzona, a menos de
  // ~20 casillas): el servidor arma la pelea con ellos, así cada monstruo vive en su lugar del mapa
  areaMonstersAt(x, y) {
    const sub = this.subzone?.name;
    let best = null;
    let bestD = 640 * 640;
    for (const a of this.encounterAreas ?? []) {
      if (this.zoneAt(a.x + a.width / 2, a.y + a.height / 2) !== this.zone) continue;
      if (Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(a.x, a.y, a.width, a.height), x, y)) return this.areaMonsters(a);
      const cx = a.x + a.width / 2;
      const cy = a.y + a.height / 2;
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      const local = this.toLocal(cx, cy, this.zone);
      const sz = this.world.subzonas?.find((s) => local.x >= s.x0 && local.x < s.x1 && local.y >= s.y0 && local.y < s.y1 && !s.safe);
      if (d < bestD && (!sub || sz?.name === sub)) { best = a; bestD = d; }
    }
    return best ? this.areaMonsters(best) : null;
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
    if (this.pendingGrace) {
      this.graceUntil = time + this.pendingGrace;
      this.pendingGrace = 0;
      // el héroe parpadea mientras dura el respiro (los monstruos no lo tocan)
      this.tweens.add({ targets: this.player, alpha: 0.45, duration: 220, yoyo: true, repeat: Math.max(0, Math.floor((this.graceUntil - time) / 440) - 1), onComplete: () => this.player?.setAlpha(1) });
    }
    if (this.shade) this.updateSky();
    this.social?.update(delta);
    this.city?.update(delta);
    this.updateNpcs(time, delta);
    this.reportPosition(time);
    this.checkExits(time);
    this.checkRefuge(time);
    this.checkMythicTrail(time);
    this.updateExplore(time);
    this.updateCrypt(time, delta);
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
      // joystick en pantalla (celular / tablet, ver components/world/TouchControls.js)
      if (!vx && !vy && this.touchVec && Math.hypot(this.touchVec.x, this.touchVec.y) > 0.25) ({ x: vx, y: vy } = this.touchVec);
    }
    // siguiendo a otro jugador: tocar una tecla de movimiento lo corta
    if (this.following) {
      if (vx || vy) this.stopFollow();
      else if (this.input.keyboard.enabled && !this.gathering) ({ x: vx, y: vy } = this.followStep(time));
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
    this.nameTag.setPosition(this.player.x, this.player.y - (this.guildTag.text ? 22 : 14));
    this.guildTag.setPosition(this.player.x, this.player.y - 14);
    this.playerDot?.setPosition(this.player.x, this.player.y);
    this.updateFollowers(!!(vx || vy));
    this.updateChunks();
    if (vx || vy) this.checkZoneChange();
    if (vx || vy) this.scareFauna();

    this.updatePoi();
    this.checkQuestVisits();
    this.updateTracking(time);
    const touchE = this.touchInteract;
    this.touchInteract = false;
    if (this.nearPoi && (touchE || Phaser.Input.Keyboard.JustDown(k.interact) || Phaser.Input.Keyboard.JustDown(k.interact2))) {
      if (this.nearPoi.boss) this.challengeBoss(this.nearPoi.boss);
      else if (this.nearPoi.mythic) this.challengeMythic();
      else if (this.nearPoi.resource) this.gather(this.nearPoi.resource);
      else if (this.nearPoi.secret) bus.emit('secret-open', this.nearPoi.secret);
      else if (this.nearPoi.action) this.cryptAction(this.nearPoi);
      else if (this.nearPoi.questPoint) bus.emit('quest-point', this.nearPoi.questPoint);
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

// Partes de la escena que viven en su propio archivo (game/world/*)
Object.assign(WorldScene.prototype, mythicMethods, walkGridMethods, npcsMethods, resourcesMethods, faunaMethods, refugesMethods, guideMethods, exploreMethods, eventsMethods, criptaMethods, questsMethods, trackingMethods);
