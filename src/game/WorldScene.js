import Phaser from 'phaser';
import bus from './bus';
import { MINIMAP } from './hudLayout';

// Letreros sobre personajes: misma fuente que la interfaz y alta resolución para que el zoom
// de la cámara (pixel art) no los deje borrosos.
const TAG_FONT = 'Cinzel, Georgia, serif';
const TAG_RES = 4;

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const SPEED = 110;
const POI_RADIUS = 44;
// Al entrar (o volver de un combate) los monstruos no atacan durante este tiempo, para que no
// te enganche uno que justo pasaba por el punto donde apareces.
const ENCOUNTER_GRACE_MS = 2500;

// Frames de la hoja de caminar (ver art/sprites/mundo/crear_mundo.lua): 0-2 abajo, 3-5 arriba, 6-8 lado
const WALK = { down: [1, 0, 2, 0], up: [4, 3, 5, 3], side: [7, 6, 8, 6] };
const IDLE = { down: 0, up: 3, side: 6 };

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('mundo');
  }

  init(data) {
    this.heroClass = data.heroClass || 'guerrero';
    this.heroName = data.heroName || '';
    this.startPos = data.startPos || null;
    this.facing = 'down';
    this.nearPoi = null;
    this.encounterLock = false;
  }

  preload() {
    this.load.tilemapTiledJSON('pradera', `${ASSETS}/mundo/pradera.json`);
    this.load.image('tiles_pradera', `${ASSETS}/mundo/tileset_pradera.png`);
    this.load.spritesheet('heroe', `${ASSETS}/mundo/caminar/${this.heroClass}.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.json('enemigos', `${ASSETS}/sprites/combate/enemigos.json`);
  }

  create() {
    const map = this.make.tilemap({ key: 'pradera' });
    const tiles = map.addTilesetImage('pradera', 'tiles_pradera');
    const ground = map.createLayer('suelo', tiles);
    const objects = map.createLayer('objetos', tiles);
    // copas de los árboles grandes: por encima del personaje, sin colisión
    map.createLayer('encima', tiles)?.setDepth(20);
    ground.setCollisionByProperty({ colision: true });
    objects.setCollisionByProperty({ colision: true });
    this.groundLayer = ground;
    const mapProp = (name, fallback) => map.properties?.find?.((p) => p.name === name)?.value ?? fallback;
    this.zoneId = mapProp('zona', 1);
    this.zoneName = mapProp('nombre', '');
    this.grassChance = mapProp('encuentro_hierba', 0);
    this.grassGid = mapProp('gid_hierba', null);
    this.lastTile = null;

    const points = map.getObjectLayer('puntos').objects;
    const spawn = points.find((o) => o.type === 'spawn');
    this.spawnPoint = { x: spawn.x + 16, y: spawn.y + 16 };
    const start = this.startPos || this.spawnPoint;

    this.player = this.physics.add.sprite(start.x, start.y, 'heroe', IDLE.down).setDepth(10);
    this.player.body.setSize(16, 10).setOffset(8, 21);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, objects);
    this.nameTag = this.add.text(start.x, start.y - 22, this.heroName, {
      fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#ffffff', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(20).setResolution(TAG_RES);

    for (const [dir, frames] of Object.entries(WALK)) {
      this.anims.create({ key: `walk_${dir}`, frames: frames.map((f) => ({ key: 'heroe', frame: f })), frameRate: 8, repeat: -1 });
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setZoom(2);
    this.cameras.main.fadeIn(300);
    this.createMinimap(map);

    // enableCapture = false: sin esto Phaser se "come" W/A/S/D y la barra espaciadora y no se
    // podría escribir en el chat.
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      interact: 'E', interact2: 'SPACE',
    }, false);

    const propOf = (o, name) => o.properties?.find((p) => p.name === name)?.value;
    this.pois = points.filter((o) => o.type === 'poi' || o.type === 'npc').map((o) => ({
      id: o.name,
      x: o.x + 16,
      y: o.y + 16,
      label: propOf(o, 'etiqueta') ?? o.name,
      window: propOf(o, 'ventana'),
    }));
    this.blockers = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.blockers);
    this.spawnNpcs(points.filter((o) => o.type === 'npc'), propOf);
    this.bossPoints = points.filter((o) => o.type === 'jefe').map((o) => ({
      id: o.name,
      x: o.x + 16,
      y: o.y + 16,
      code: propOf(o, 'monstruo'),
      level: propOf(o, 'nivel'),
      label: propOf(o, 'etiqueta') ?? o.name,
    }));

    this.onInputEnabled = (enabled) => {
      this.input.keyboard.enabled = enabled;
      this.input.keyboard.resetKeys();
      if (!enabled) this.stopPlayer();
    };
    bus.on('input-enabled', this.onInputEnabled);
    const unbind = () => bus.off('input-enabled', this.onInputEnabled);
    this.events.once('shutdown', unbind);
    this.events.once('destroy', unbind);

    this.graceUntil = this.time.now + ENCOUNTER_GRACE_MS;
    this.spawnMonsters(points.filter((o) => o.type === 'encuentro'), this.bossPoints);
    // al volver del combate (la escena 'batalla' la duerme mientras tanto)
    this.events.on('wake', (_sys, data) => this.onReturnFromBattle(data?.result));
  }

  // NPCs del campamento: sprite de caminar de una clase, quietos mirando hacia abajo, con nombre
  spawnNpcs(npcs, propOf) {
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
        const block = this.add.rectangle(x, y + 8, 16, 10);
        this.blockers.add(block);
        // "Lyra, mercader" → nombre arriba y oficio debajo entre ‹ ›, como en un MMO
        const [npcName, npcRole] = String(propOf(o, 'nombre') ?? o.name).split(/,\s*/);
        const role = npcRole && this.add.text(x, y - 17, `‹${npcRole.charAt(0).toUpperCase()}${npcRole.slice(1)}›`, {
          fontFamily: "'EB Garamond', Georgia, serif", fontSize: '8px', fontStyle: 'italic', color: '#d8cdb4', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
        const tag = this.add.text(x, npcRole ? y - 25 : y - 17, npcName, {
          fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#ffe9a8', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
        const mark = this.add.text(x, tag.y - 8, '!', {
          fontFamily: TAG_FONT, fontSize: '10px', fontStyle: 'bold', color: '#ffd84a', stroke: '#141420', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
        this.tweens.add({ targets: mark, y: mark.y - 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        [tag, role, mark].filter(Boolean).forEach((t) => this.minimap?.ignore(t));
      }
    });
    // la carga la arranca spawnMonsters (una sola tanda para todo)
  }

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
      const catalog = this.cache.json.get('enemigos').monsters;
      mon.destroy();
      this.time.delayedCall(20000, () => {
        const list = this.areaMonsters(area).filter((c) => catalog[c] && this.textures.exists(`mon_${c}`));
        if (!list.length) return;
        const code = Phaser.Utils.Array.GetRandom(list);
        this.createMonster(code, catalog[code], area);
      });
    }
    if (result === 'ENEMY_WON') {
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
    }
  }

  // Minimapa: segunda cámara arriba a la derecha (el marco lo dibuja el HUD de React).
  createMinimap(map) {
    const { width, height, margin, zoom } = MINIMAP;
    this.minimap = this.cameras.add(0, 0, width, height).setZoom(zoom).setName('minimapa');
    this.minimap.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
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

  // Las hojas de los monstruos se cargan acá (y no en preload) porque recién ahora sabemos,
  // por el mapa, qué monstruos viven en esta zona.
  spawnMonsters(areas, bosses = []) {
    const catalog = this.cache.json.get('enemigos').monsters;
    const codes = new Set([...areas.flatMap((a) => this.areaMonsters(a)), ...bosses.map((b) => b.code)]);
    for (const code of codes) {
      const m = catalog[code];
      if (m && !this.textures.exists(`mon_${code}`)) {
        this.load.spritesheet(`mon_${code}`, `${ASSETS}/sprites/combate/${m.sheet}`, { frameWidth: m.frameSize.w, frameHeight: m.frameSize.h });
      }
    }
    this.load.once('complete', () => {
      this.monsters = this.physics.add.group();
      for (const area of areas) {
        const list = this.areaMonsters(area).filter((c) => catalog[c]);
        const count = area.properties?.find((p) => p.name === 'cantidad')?.value ?? 3;
        for (let i = 0; i < count && list.length; i++) {
          const code = Phaser.Utils.Array.GetRandom(list);
          this.createMonster(code, catalog[code], area);
        }
      }
      this.physics.add.overlap(this.player, this.monsters, (_p, mon) => this.startEncounter(mon));
      this.spawnBosses(catalog);
    });
    this.load.start();
  }

  areaMonsters(area) {
    const raw = area.properties?.find((p) => p.name === 'monstruos')?.value ?? '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  createMonster(code, info, area) {
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
    mon.setData({ code, name: info.name, area });
    this.wander(mon);
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
    this.tweens.add({ targets: mon, alpha: 0.3, yoyo: true, repeat: 3, duration: 90 });
    bus.emit('encounter', {
      kind: 'zone',
      code: mon.getData('code'),
      name: mon.getData('name'),
      zoneId: this.zoneId,
      position: { x: this.player.x, y: this.player.y },
    });
  }

  // Encuentro aleatorio al pisar hierba alta (como en Pokémon): una tirada por casilla nueva
  checkGrassEncounter() {
    if (!this.grassChance || !this.grassGid) return;
    const tile = this.groundLayer.getTileAtWorldXY(this.player.x, this.player.y + 10);
    const key = tile ? `${tile.x},${tile.y}` : null;
    if (key === this.lastTile) return;
    this.lastTile = key;
    if (!tile || tile.index !== this.grassGid || this.time.now < this.graceUntil) return;
    if (Math.random() >= this.grassChance) return;
    this.encounterLock = true;
    this.lastEncounterMon = null;
    this.stopPlayer();
    this.monsters?.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
    this.cameras.main.shake(250, 0.006);
    bus.emit('encounter', { kind: 'zone', name: null, zoneId: this.zoneId, position: { x: this.player.x, y: this.player.y } });
  }

  // Desafiar a un jefe en su guarida (React pide confirmación antes de empezar)
  challengeBoss(b) {
    if (b.hidden) return;
    this.lastBoss = b;
    bus.emit('boss-challenge', {
      kind: 'boss', code: b.code, level: b.level, name: b.name, rank: b.rank,
      zoneId: this.zoneId, position: { x: this.player.x, y: this.player.y },
    });
  }

  // Lo llama React al confirmar el desafío: bloquea el mapa hasta que vuelva del combate
  lockForBattle() {
    this.encounterLock = true;
    this.stopPlayer();
    this.monsters?.setVelocity(0, 0);
    this.input.keyboard.enabled = false;
  }

  stopPlayer() {
    if (!this.player) return;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.player.setFrame(IDLE[this.facing]);
  }

  update() {
    if (!this.player || this.encounterLock) return;
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (this.input.keyboard.enabled) {
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

    this.updatePoi();
    if (this.nearPoi && (Phaser.Input.Keyboard.JustDown(k.interact) || Phaser.Input.Keyboard.JustDown(k.interact2))) {
      if (this.nearPoi.boss) this.challengeBoss(this.nearPoi.boss);
      else bus.emit('interact', this.nearPoi);
    }
    if (vx || vy) this.checkGrassEncounter();
  }

  updatePoi() {
    let nearest = null;
    for (const poi of this.pois) {
      if (poi.boss?.hidden) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, poi.x, poi.y) < POI_RADIUS) nearest = poi;
    }
    if (nearest !== this.nearPoi) {
      this.nearPoi = nearest;
      bus.emit('poi', nearest);
    }
  }
}
