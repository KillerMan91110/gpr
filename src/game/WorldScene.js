import Phaser from 'phaser';
import bus from './bus';
import audio from './audio';
import { MINIMAP } from './hudLayout';
import SocialLayer from './socialLayer';

// Mundo abierto por trozos: la zona (public/assets/mundo/<zona>/mundo.json) está partida en
// trozos de 40x30 tiles. Solo se construyen (tiles, colisiones, monstruos, fauna) los trozos
// alrededor del héroe y se destruyen los que quedan lejos: se camina por toda la zona sin
// pantallas de carga. Lo que es poco y siempre importa (NPCs, jefes, recursos, luces, puntos de
// interés) vive toda la partida.

// Letreros sobre personajes: misma fuente que la interfaz y alta resolución para que el zoom
// de la cámara (pixel art) no los deje borrosos.
const TAG_FONT = 'Cinzel, Georgia, serif';
const TAG_RES = 4;

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEFAULT_ZONE = 'pradera';
const SPEED = 110;
const POI_RADIUS = 44;
const CHUNK_RADIUS = 1; // trozos construidos alrededor del del héroe (3x3)
// Al entrar (o volver de un combate) los monstruos no atacan durante este tiempo, para que no
// te enganche uno que justo pasaba por el punto donde apareces.
const ENCOUNTER_GRACE_MS = 2500;

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
    const dir = `${ASSETS}/mundo/${this.zoneDir}`;
    this.load.json('mundo_zona', `${dir}/mundo.json`);
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
    this.load.json('enemigos', `${ASSETS}/sprites/combate/enemigos.json`);
    // los mapas de los trozos son livianos: se bajan todos; lo que se arma por cercanía es el
    // contenido (capas, colisiones, monstruos, fauna)
    this.load.once('filecomplete-json-mundo_zona', (_k, _t, world) => {
      this.tilesetName = world.tileset || 'pradera';
      if (!this.textures.exists(`tiles_${this.tilesetName}`)) this.load.image(`tiles_${this.tilesetName}`, `${ASSETS}/mundo/tileset_${this.tilesetName}.png`);
      world.chunks.forEach((c) => this.load.tilemapTiledJSON(`chunk_${c.cx}_${c.cy}`, `${dir}/${c.file}`));
    });
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
    this.world = this.cache.json.get('mundo_zona');
    const w = this.world;
    this.chunkPx = { w: w.chunkWidth * w.tile, h: w.chunkHeight * w.tile };
    this.worldPx = { w: this.chunkPx.w * w.columns, h: this.chunkPx.h * w.rows };
    this.zoneId = w.zona;
    this.zoneName = w.nombre;
    this.grassChance = w.encuentroHierba;
    this.grassGid = w.gidHierba;
    this.gidSets = Object.fromEntries(Object.entries(w.gids ?? {}).map(([k, v]) => [k, new Set(v)]));
    this.lastTile = null;
    this.spawnPoint = { ...w.inicio };
    const start = this.startPos || this.spawnPoint;

    this.player = this.physics.add.sprite(start.x, start.y, 'heroe', IDLE.down).setDepth(10);
    this.player.body.setSize(16, 10).setOffset(8, 21);
    this.player.setCollideWorldBounds(true);
    this.nameTag = this.add.text(start.x, start.y - 22, this.heroName, {
      fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#ffffff', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
    this.makeWalkAnims('heroe');

    this.physics.world.setBounds(0, 0, this.worldPx.w, this.worldPx.h);
    this.cameras.main.setBounds(0, 0, this.worldPx.w, this.worldPx.h);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setZoom(2);
    this.cameras.main.fadeIn(400);
    this.createMinimap();

    // enableCapture = false: sin esto Phaser se "come" W/A/S/D y la barra espaciadora y no se
    // podría escribir en el chat.
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      interact: 'E', interact2: 'SPACE',
    }, false);

    this.blockers = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.blockers);
    this.monsters = this.physics.add.group();
    this.physics.add.overlap(this.player, this.monsters, (_p, mon) => this.startEncounter(mon));

    // contenido de toda la zona que vive siempre (sale de los puntos de cada trozo)
    const all = this.allPoints();
    this.pois = all.filter((o) => o.type === 'poi' || o.type === 'npc').map((o) => ({
      id: o.name, x: o.x + 16, y: o.y + 16,
      label: propOf(o, 'etiqueta') ?? o.name, window: propOf(o, 'ventana'), dialogue: propOf(o, 'dialogo') ?? null,
    }));
    this.bossPoints = all.filter((o) => o.type === 'jefe').map((o) => ({
      id: o.name, x: o.x + 16, y: o.y + 16, code: propOf(o, 'monstruo'), level: propOf(o, 'nivel'), label: propOf(o, 'etiqueta') ?? o.name,
    }));
    this.encounterAreas = all.filter((o) => o.type === 'encuentro');
    this.spawnNpcs(all.filter((o) => o.type === 'npc'));
    this.spawnResources(all.filter((o) => o.type === 'recurso'));
    all.filter((o) => o.type === 'aspas').forEach((o) => {
      const blades = this.add.image(o.x, o.y, 'aspas').setDepth(20.2);
      this.tweens.add({ targets: blades, angle: 360, duration: 9000, repeat: -1 });
    });

    this.createDayNight(all.filter((o) => o.type === 'luz'));
    // otros jugadores, globitos de chat, gestos y emojis
    this.social = new SocialLayer(this);
    this.createWeather();
    this.bindBus();

    this.graceUntil = this.time.now + ENCOUNTER_GRACE_MS;
    this.loadMonsterLevels().then(() => this.loadMonsterSheets());
    this.updateChunks(true);
    // al volver del combate (la escena 'batalla' la duerme mientras tanto)
    this.events.on('wake', (_sys, data) => this.onReturnFromBattle(data?.result));
    bus.emit('world-ready', { zoneId: this.zoneId, zoneDir: this.zoneDir, name: this.zoneName });
  }

  // todos los puntos de la zona en coordenadas del mundo
  allPoints() {
    const out = [];
    for (const c of this.world.chunks) {
      const data = this.cache.tilemap.get(`chunk_${c.cx}_${c.cy}`)?.data;
      const layer = data?.layers.find((l) => l.name === 'puntos');
      for (const o of layer?.objects ?? []) out.push({ ...o, x: o.x + c.cx * this.chunkPx.w, y: o.y + c.cy * this.chunkPx.h, chunk: `${c.cx}_${c.cy}` });
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
      // ventana Social: en qué subzona está un jugador (solo si está en esta zona)
      'subzone-at': ({ x, y, zone }, cb) => {
        if (zone && zone !== this.zoneDir) { cb?.(null); return; }
        cb?.(this.world.subzonas?.find((sz) => x >= sz.x0 && x < sz.x1 && y >= sz.y0 && y < sz.y1)?.name ?? null);
      },
      'hero-pos': (cb) => cb?.({ x: this.player?.x ?? 0, y: this.player?.y ?? 0, facing: this.facing, flip: this.player?.flipX }),
    };
    Object.entries(handlers).forEach(([ev, fn]) => bus.on(ev, fn));
    const unbind = () => Object.entries(handlers).forEach(([ev, fn]) => bus.off(ev, fn));
    this.events.once('shutdown', unbind);
    this.events.once('destroy', unbind);
  }

  zoneMapData() {
    const w = this.world;
    return {
      dir: this.zoneDir, id: this.zoneId, name: this.zoneName, heroLevel: this.heroLevel,
      tile: w.tile, chunkWidth: w.chunkWidth, chunkHeight: w.chunkHeight, columns: w.columns, rows: w.rows,
      subzonas: w.subzonas ?? [],
      tileset: this.textures.get(`tiles_${this.tilesetName}`).getSourceImage(),
      chunks: w.chunks.map((c) => {
        const d = this.cache.tilemap.get(`chunk_${c.cx}_${c.cy}`)?.data;
        const layer = (n) => d?.layers.find((l) => l.name === n)?.data ?? [];
        return { cx: c.cx, cy: c.cy, suelo: layer('suelo'), objetos: layer('objetos'), encima: layer('encima') };
      }),
      points: this.allPoints().filter((o) => ['npc', 'poi', 'jefe'].includes(o.type)).map((o) => ({
        type: o.type, name: o.name, x: o.x + 16, y: o.y + 16,
        label: propOf(o, 'nombre') ?? propOf(o, 'etiqueta') ?? o.name,
        monster: propOf(o, 'monstruo'), level: propOf(o, 'nivel'), window: propOf(o, 'ventana'), dialogue: propOf(o, 'dialogo'),
      })),
      marks: this.marks,
    };
  }

  makeWalkAnims(key) {
    for (const [dir, frames] of Object.entries(WALK)) {
      const k = key === 'heroe' ? `walk_${dir}` : `walk_${key}_${dir}`;
      if (!this.anims.exists(k)) this.anims.create({ key: k, frames: frames.map((f) => ({ key, frame: f })), frameRate: 8, repeat: -1 });
    }
  }

  // ---------------------------------------------------------------- trozos
  chunkOf(x, y) {
    return { cx: Math.floor(x / this.chunkPx.w), cy: Math.floor(y / this.chunkPx.h) };
  }

  updateChunks(force = false) {
    const { cx, cy } = this.chunkOf(this.player.x, this.player.y);
    if (!force && this.curChunk && this.curChunk.cx === cx && this.curChunk.cy === cy) return;
    this.curChunk = { cx, cy };
    const wanted = new Set();
    for (let dy = -CHUNK_RADIUS; dy <= CHUNK_RADIUS; dy++) {
      for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < this.world.columns && y < this.world.rows) wanted.add(`${x}_${y}`);
      }
    }
    for (const key of [...this.chunks.keys()]) if (!wanted.has(key)) this.unloadChunk(key);
    for (const key of wanted) if (!this.chunks.has(key)) this.buildChunk(key);
  }

  buildChunk(key) {
    const [cx, cy] = key.split('_').map(Number);
    const map = this.make.tilemap({ key: `chunk_${key}` });
    const tiles = map.addTilesetImage(map.tilesets[0]?.name ?? this.tilesetName, `tiles_${this.tilesetName}`);
    const x0 = cx * this.chunkPx.w;
    const y0 = cy * this.chunkPx.h;
    const ground = map.createLayer('suelo', tiles, x0, y0);
    const objects = map.createLayer('objetos', tiles, x0, y0);
    // copas de los árboles y tejados: por encima del personaje, sin colisión
    const above = map.createLayer('encima', tiles, x0, y0)?.setDepth(20);
    ground.setCollisionByProperty({ colision: true });
    objects.setCollisionByProperty({ colision: true });
    const edges = this.applyPassage(key, ground, objects, x0, y0);
    const colliders = [this.physics.add.collider(this.player, ground), this.physics.add.collider(this.player, objects)];
    if (edges) colliders.push(this.physics.add.collider(this.player, edges));
    const chunk = { key, cx, cy, map, ground, objects, above, colliders, edges, things: [] };
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
  applyPassage(key, ground, objects, x0, y0) {
    const paso = this.cache.tilemap.get(`chunk_${key}`)?.data?.paso;
    if (!paso || !Object.keys(paso).length) return null;
    const cw = this.world.chunkWidth;
    const t = this.world.tile;
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
    ground.calculateFacesWithin(0, 0, cw, this.world.chunkHeight);
    objects.calculateFacesWithin(0, 0, cw, this.world.chunkHeight);
    return edges;
  }

  // capa de suelo y tile bajo un punto del mundo (para la hierba alta y la fauna)
  groundTileAt(x, y) {
    const { cx, cy } = this.chunkOf(x, y);
    return this.chunks.get(`${cx}_${cy}`)?.ground.getTileAtWorldXY(x, y) ?? null;
  }

  // ---------------------------------------------------------------- NPCs
  // NPCs con su sprite propio, nombre, oficio y la marca de misión (! o ?)
  spawnNpcs(npcs) {
    const sprites = [...new Set(npcs.map((o) => propOf(o, 'sprite')).filter(Boolean))];
    sprites.forEach((s) => {
      if (!this.textures.exists(`npc_${s}`)) this.load.spritesheet(`npc_${s}`, `${ASSETS}/mundo/caminar/${s}.png`, { frameWidth: 32, frameHeight: 32 });
    });
    this.load.once('complete', () => {
      for (const o of npcs) {
        const x = o.x + 16;
        const y = o.y + 16;
        const npc = this.add.sprite(x, y, `npc_${propOf(o, 'sprite')}`, IDLE.down).setDepth(9);
        // respiración: un saltito de 1 píxel para que no parezcan estatuas
        this.tweens.add({ targets: npc, y: y - 1, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.blockers.add(this.add.rectangle(x, y + 8, 16, 10));
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
        this.tweens.add({ targets: mark, y: mark.y - 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        // punto en el minimapa (solo se ve si tiene una misión)
        const dot = this.add.circle(x, y, 18, 0xffd84a).setStrokeStyle(5, 0x141420).setDepth(30).setVisible(false);
        this.cameras.main.ignore(dot);
        [tag, role, mark].filter(Boolean).forEach((t) => this.minimap?.ignore(t));
        this.npcs.set(propOf(o, 'dialogo') ?? o.name, { sprite: npc, mark, dot, name: npcName });
      }
      this.setNpcMarks(this.marks);
    });
    // la carga la arranca loadMonsterSheets (una sola tanda)
  }

  // marks: { ren: '!' | '?' | null } — ! hay encargos nuevos, ? hay algo para entregar
  setNpcMarks(marks) {
    this.marks = marks ?? {};
    for (const [id, n] of this.npcs) {
      const m = this.marks[id] ?? null;
      n.mark.setText(m ?? '');
      n.mark.setColor(m === '?' ? '#7dff9a' : '#ffd84a');
      n.dot.setVisible(!!m);
      n.dot.setFillStyle(m === '?' ? 0x7dff9a : 0xffd84a);
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
    // pequeño "trabajo" antes de pedirle el botín al servidor
    this.tweens.add({ targets: r.sprite, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => r.sprite.setAngle(0) });
    audio.sfx(['mineral', 'tronco'].includes(r.tipo) ? 'golpe' : 'recoger');
    this.time.delayedCall(450, () => bus.emit('gather', { id: r.id, tipo: r.tipo }));
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
    chunk.objects.forEachTile((t) => { if (t.index > 0 && this.gidSets.flores?.has(t.index)) flowers.push(t); });
    chunk.ground.forEachTile((t) => {
      if (this.gidSets.flores?.has(t.index)) flowers.push(t);
      else if (this.gidSets.prado?.has(t.index) && !chunk.objects.getTileAt(t.x, t.y)) meadow.push(t);
    });
    chunk.above?.forEachTile((t) => {
      if (this.gidSets.arboles?.has(t.index)) trees.push(t);
      if (this.gidSets.dorados?.has(t.index)) golden.push(t);
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
    this.lights2 = lights.map((o) => {
      const fire = propOf(o, 'tipo') === 'fogata';
      const glow = this.add.image(o.x, o.y, 'luz').setDepth(20.6).setBlendMode('ADD')
        .setTint(fire ? 0xff9a4a : 0xffd890).setScale(fire ? 1.4 : 1).setAlpha(0);
      this.minimap.ignore(glow);
      return { glow, fire };
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
      const rainy = Math.random() < (this.world.clima?.lluvia ?? 0);
      this.setWeather(rainy ? 'lluvia' : 'despejado');
      this.time.delayedCall(Phaser.Math.Between(4, 8) * 60000, roll);
    };
    this.time.delayedCall(Phaser.Math.Between(60000, 120000), roll);
  }

  setWeather(kind) {
    if (kind === this.weather) return;
    this.weather = kind;
    this.rain.emitting = kind === 'lluvia';
    bus.emit('weather', kind);
  }

  updateSky() {
    const h = gameHour();
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
    const [h0, c0] = SKY[i];
    const [h1, c1] = SKY[i + 1];
    let color = lerpColor(c0, c1, (h - h0) / Math.max(0.001, h1 - h0));
    if (this.weather === 'lluvia') color = mulColor(color, 0xb4bccc);
    this.shade.setFillStyle(color);
    // cuánto "de noche" es (0 de día, 1 en plena noche) para las luces
    const c = Phaser.Display.Color.IntegerToColor(color);
    const dark = Phaser.Math.Clamp(1 - (c.red + c.green + c.blue) / (3 * 255), 0, 1) * 1.6;
    const flicker = 0.9 + Math.sin(this.time.now / 90) * 0.05 + Math.random() * 0.05;
    for (const l of this.lights2) l.glow.setAlpha(Math.min(1, dark) * (l.fire ? flicker : 0.85));
    this.heroLight.setPosition(this.player.x, this.player.y - 6).setAlpha(Math.min(0.55, dark * 0.6));
    const night = dark > 0.35;
    this.fireflies.emitting = night && this.weather !== 'lluvia';
    const hour = Math.floor(h);
    if (hour !== this.lastHour) { this.lastHour = hour; bus.emit('clock', { hour, night }); }
  }

  // ---------------------------------------------------------------- subzonas
  updateSubzone() {
    const { x, y } = this.player;
    const sz = this.world.subzonas.find((s) => x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1);
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
    missing.forEach((c) => this.load.spritesheet(`npc_${c}`, `${ASSETS}/mundo/caminar/${c}.png`, { frameWidth: 32, frameHeight: 32 }));
    this.load.once('complete', build);
    this.load.start();
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
    this.graceUntil = this.time.now + ENCOUNTER_GRACE_MS;
    this.input.keyboard.enabled = true;
    this.input.keyboard.resetKeys();
    this.cameras.main.fadeIn(450);
    // jefe derrotado: desaparece de su guarida un rato
    const boss = this.lastBoss;
    this.lastBoss = null;
    if (result === 'PLAYER_WON' && boss?.sprite?.active) this.hideBoss(boss);
    const mon = this.lastEncounterMon;
    this.lastEncounterMon = null;
    if (result === 'PLAYER_WON' && mon?.active) {
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
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
      this.trail = [];
      this.updateChunks(true);
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
  async loadMonsterLevels() {
    try {
      const list = await fetch(`${API_URL}/api/zones/${this.zoneId}/monsters`).then((r) => r.json());
      this.minLevel = Object.fromEntries(list.map((m) => [m.code, m.min_spawn_level]));
    } catch {
      this.minLevel = {};
    }
  }

  eligibleMonsters(area, catalog) {
    return this.areaMonsters(area).filter((c) => catalog[c] && this.textures.exists(`mon_${c}`) && (this.minLevel?.[c] ?? 1) <= this.heroLevel + 1);
  }

  // Las hojas de los monstruos se cargan una vez para toda la zona; los monstruos aparecen
  // cuando se construye el trozo de su zona de hierba.
  loadMonsterSheets() {
    const catalog = this.cache.json.get('enemigos').monsters;
    const codes = new Set([...this.encounterAreas.flatMap((a) => this.areaMonsters(a)), ...this.bossPoints.map((b) => b.code)]);
    for (const code of codes) {
      const m = catalog[code];
      if (m && !this.textures.exists(`mon_${code}`)) {
        this.load.spritesheet(`mon_${code}`, `${ASSETS}/sprites/combate/${m.sheet}`, { frameWidth: m.frameSize.w, frameHeight: m.frameSize.h });
      }
    }
    this.load.once('complete', () => {
      this.sheetsReady = true;
      for (const c of this.chunks.values()) this.spawnChunkMonsters(c);
      this.spawnBosses(catalog);
    });
    this.load.start();
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

  // posición para los demás jugadores (React la manda por socket): ~7 veces por segundo y solo
  // si cambió algo
  reportPosition(time) {
    if (time - (this.lastReport ?? 0) < 140) return;
    this.lastReport = time;
    const moving = this.player.body.velocity.lengthSq() > 0;
    const msg = { x: Math.round(this.player.x), y: Math.round(this.player.y), f: this.facing, flip: this.player.flipX, m: moving };
    const sig = `${msg.x},${msg.y},${msg.f},${msg.flip},${msg.m}`;
    if (sig === this.lastReportSig) return;
    this.lastReportSig = sig;
    bus.emit('hero-moved', msg);
  }

  // niveles de la subzona que contiene el punto (la primera de la lista que lo contenga)
  levelsAt(x, y) {
    const sz = this.world.subzonas?.find((s) => x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1);
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
    bus.emit('encounter', {
      kind: 'zone', code: mon.getData('code'), name: mon.getData('name'), zoneId: this.zoneId, areaLevels: this.subzone?.levels ?? null,
      position: { x: this.player.x, y: this.player.y, zona: this.zoneDir },
    });
  }

  // Encuentro aleatorio al pisar hierba alta (como en Pokémon): una tirada por casilla nueva
  checkGrassEncounter() {
    if (!this.grassChance || !this.grassGid) return;
    const tile = this.groundTileAt(this.player.x, this.player.y + 10);
    const key = tile ? `${tile.x},${tile.y},${this.curChunk.cx},${this.curChunk.cy}` : null;
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
    bus.emit('encounter', { kind: 'zone', name: null, zoneId: this.zoneId, areaLevels: this.subzone?.levels ?? null, position: { x: this.player.x, y: this.player.y, zona: this.zoneDir } });
  }

  // Desafiar a un jefe en su guarida (React pide confirmación antes de empezar)
  challengeBoss(b) {
    if (b.hidden) return;
    this.lastBoss = b;
    bus.emit('boss-challenge', {
      kind: 'boss', code: b.code, level: b.level, name: b.name, rank: b.rank,
      zoneId: this.zoneId, position: { x: this.player.x, y: this.player.y, zona: this.zoneDir },
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

  update(time, delta) {
    if (!this.player) return;
    if (this.shade) this.updateSky();
    this.social?.update(delta);
    this.reportPosition(time);
    for (const m of this.monsters.getChildren()) {
      const tag = m.getData('tag');
      if (tag) tag.setPosition(m.x, m.y - m.getData('tagDy'));
    }
    if (this.encounterLock) return;
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
    this.player.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

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
    if (vx || vy) this.scareFauna();

    this.updatePoi();
    if (this.nearPoi && (Phaser.Input.Keyboard.JustDown(k.interact) || Phaser.Input.Keyboard.JustDown(k.interact2))) {
      if (this.nearPoi.boss) this.challengeBoss(this.nearPoi.boss);
      else if (this.nearPoi.resource) this.gather(this.nearPoi.resource);
      else bus.emit('interact', this.nearPoi);
    }
    if (vx || vy || !this.subzone) this.checkGrassEncounter();
  }

  updatePoi() {
    let nearest = null;
    for (const poi of this.pois) {
      if (poi.boss?.hidden || (poi.resource && !poi.resource.ready)) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, poi.x, poi.y) < POI_RADIUS) nearest = poi;
    }
    if (nearest !== this.nearPoi) {
      this.nearPoi = nearest;
      bus.emit('poi', nearest && { ...nearest, resource: nearest.resource ? { id: nearest.resource.id, tipo: nearest.resource.tipo } : undefined });
    }
  }
}
