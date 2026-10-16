import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';
import { ASSETS } from './shared';

// La lluvia de brasas del Volcán Rojo: en los Ríos de Lava, la Grieta Ardiente y la Caldera del Titán
// el volcán escupe piedras ardientes. Una sombra en el suelo avisa dónde cae (1,6 s); si sigues ahí,
// te alcanza (el servidor te quita vida: gprback/lib/brasas.js). Bajo los arcos de basalto y junto a
// las fogatas no te apuntan: ahí te refugias. Es como la tormenta de las Montañas (tormenta.js), pero
// la brasa se ve caer en diagonal desde el cielo. Arte: art/sprites/mundo/crear_brasas.lua.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const EMBER_ZONE = 'volcan';
const EMBER_SUBZONES = ['Ríos de Lava', 'Grieta Ardiente', 'Caldera del Titán'];
const WARN_MS = 1600;
const EVERY_MS = [4500, 9000];
const HIT_RADIUS = 30;
const SAFE_TILES = 7;
// arcos de basalto (casilla de arriba a la izquierda, 3x2; locales del Volcán: art/mapas/generar_volcan.js)
const ARCOS = [[83, 9], [66, 18], [60, 48], [95, 51], [82, 66], [104, 74], [70, 80], [24, 92], [44, 104], [12, 110],
  [50, 96], [67, 89], [104, 92], [64, 109], [108, 110], [130, 46], [119, 67]];

export const brasasMethods = {
  // ¿caen brasas donde está el héroe?
  embersHere() {
    return this.zoneDir === EMBER_ZONE && EMBER_SUBZONES.includes(this.subzone?.name);
  },

  // bajo un arco (una casilla de margen) o junto a una fogata
  emberSafe() {
    const { x, y } = this.toLocal(this.player.x, this.player.y, this.zone);
    const tx = Math.floor(x / 32);
    const ty = Math.floor(y / 32);
    if (ARCOS.some(([ax, ay]) => tx >= ax - 1 && tx <= ax + 3 && ty >= ay - 1 && ty <= ay + 2)) return true;
    return (this.refuges ?? []).some((r) => Phaser.Math.Distance.Between(r.x, r.y, this.player.x, this.player.y) < SAFE_TILES * 32);
  },

  updateEmbers(time) {
    if (!this.player || this.changingZone) return;
    if (!this.embersHere()) { this.nextEmberAt = null; return; }
    if (this.nextEmberAt == null) {
      this.nextEmberAt = time + 3000;
      this.loadEmberArt();
      return;
    }
    if (time < this.nextEmberAt || this.encounterLock || !this.emberArtReady) return;
    this.nextEmberAt = time + Phaser.Math.Between(...EVERY_MS);
    const aimed = !this.emberSafe() && Math.random() < 0.7;
    // a veces caen dos o tres juntas (solo una te apunta)
    const extra = Math.random() < 0.35 ? Phaser.Math.Between(1, 2) : 0;
    for (let i = 0; i <= extra; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = aimed && i === 0 ? Phaser.Math.Between(0, 34) : Phaser.Math.Between(160, 360);
      this.time.delayedCall(i * 380, () => this.ember(this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d, aimed && i === 0));
    }
  },

  loadEmberArt() {
    if (this.emberArtReady || this.emberArtLoading) return;
    this.emberArtLoading = true;
    this.loadThen(() => {
      if (!this.textures.exists('clima_brasa')) this.load.spritesheet('clima_brasa', `${ASSETS}/mundo/clima/brasa.png`, { frameWidth: 24, frameHeight: 40 });
      if (!this.textures.exists('clima_estallido')) this.load.spritesheet('clima_estallido', `${ASSETS}/mundo/clima/estallido.png`, { frameWidth: 48, frameHeight: 40 });
      if (!this.textures.exists('clima_quemadura')) this.load.image('clima_quemadura', `${ASSETS}/mundo/clima/quemadura.png`);
      if (!this.textures.exists('clima_sombra')) this.load.image('clima_sombra', `${ASSETS}/mundo/clima/sombra_rayo.png`);
    }, () => {
      if (!this.anims.exists('clima_brasa_arde')) {
        this.anims.create({ key: 'clima_brasa_arde', frames: this.anims.generateFrameNumbers('clima_brasa', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
      }
      if (!this.anims.exists('clima_estallido')) {
        this.anims.create({ key: 'clima_estallido', frames: this.anims.generateFrameNumbers('clima_estallido', { start: 0, end: 4 }), frameRate: 12 });
      }
      this.emberArtReady = true;
      this.emberArtLoading = false;
    });
  },

  // una brasa en (x, y): la sombra crece mientras la piedra cae en diagonal; al tocar el suelo, estalla
  ember(x, y, aimed) {
    if (!this.sys.isActive() || !this.player) return;
    const shadow = this.add.image(x, y, 'clima_sombra').setDepth(8.5).setScale(0.3).setAlpha(0.2).setTint(0xffb080);
    this.minimap?.ignore(shadow);
    this.tweens.add({ targets: shadow, scale: 1.1, alpha: 0.9, duration: WARN_MS, ease: 'Quad.easeIn' });
    const rock = this.add.sprite(x + 260, y - 420, 'clima_brasa', 0).setOrigin(0.5, 0.85).setDepth(22).setRotation(-0.55);
    this.minimap?.ignore(rock);
    rock.play('clima_brasa_arde');
    this.tweens.add({ targets: rock, x, y, duration: WARN_MS, ease: 'Quad.easeIn' });
    this.time.delayedCall(WARN_MS, () => {
      shadow.destroy();
      rock.destroy();
      if (!this.sys.isActive() || !this.player) return;
      const boom = this.add.sprite(x, y + 6, 'clima_estallido', 0).setOrigin(0.5, 0.85).setDepth(22).setScale(1.3);
      this.minimap?.ignore(boom);
      boom.play('clima_estallido');
      boom.once('animationcomplete', () => boom.destroy());
      const scorch = this.add.image(x, y, 'clima_quemadura').setDepth(8.4);
      this.minimap?.ignore(scorch);
      this.tweens.add({ targets: scorch, alpha: 0, delay: 4000, duration: 3000, onComplete: () => scorch.destroy() });
      const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
      audio.sfx(dist < 300 ? 'brasa' : 'trueno_lejos');
      if (dist < 160) this.cameras.main.shake(160, 0.004);
      if (aimed && dist < HIT_RADIUS && !this.encounterLock) {
        this.player.setTint(0xff9a6a);
        this.time.delayedCall(260, () => this.player?.clearTint());
        bus.emit('brasa-golpe');
      }
    });
  },
};
