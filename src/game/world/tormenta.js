import Phaser from 'phaser';
import bus from '../bus';
import audio from '../audio';
import { ASSETS } from './shared';

// La tormenta de las Montañas Grises: en la Cumbre del Rey y los Acantilados del Trueno caen rayos.
// Una sombra en el suelo avisa dónde va a caer (1,4 s); si sigues ahí cuando cae, te alcanza (el
// servidor te quita vida: gprback/lib/tormenta.js). Cerca de una fogata (los puestos) no te apuntan:
// los rayos caen lejos, para que se vea la tormenta. Arte: art/sprites/mundo/crear_tormenta.lua.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const STORM_ZONE = 'montanas';
const STORM_SUBZONES = ['Cumbre del Rey', 'Acantilados del Trueno'];
const WARN_MS = 1400;
const EVERY_MS = [5000, 10000];
const HIT_RADIUS = 30;
const SAFE_TILES = 7;

export const tormentaMethods = {
  // ¿hay tormenta donde está el héroe?
  stormHere() {
    return this.zoneDir === STORM_ZONE && STORM_SUBZONES.includes(this.subzone?.name);
  },

  updateStorm(time) {
    if (!this.player || this.changingZone) return;
    if (!this.stormHere()) { this.nextStrikeAt = null; return; }
    // recién entraste: el primer rayo tarda un poco (y se cargan los dibujos)
    if (this.nextStrikeAt == null) {
      this.nextStrikeAt = time + 3000;
      this.loadStormArt();
      return;
    }
    if (time < this.nextStrikeAt || this.encounterLock || !this.stormArtReady) return;
    this.nextStrikeAt = time + Phaser.Math.Between(...EVERY_MS);
    // en un puesto (cerca de una fogata) estás a salvo: el rayo cae lejos
    const safe = (this.refuges ?? []).some((r) => Phaser.Math.Distance.Between(r.x, r.y, this.player.x, this.player.y) < SAFE_TILES * 32);
    const aimed = !safe && Math.random() < 0.75;
    const a = Math.random() * Math.PI * 2;
    const d = aimed ? Phaser.Math.Between(0, 36) : Phaser.Math.Between(220, 380);
    this.lightning(this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d, aimed);
  },

  loadStormArt() {
    if (this.stormArtReady || this.stormArtLoading) return;
    this.stormArtLoading = true;
    this.loadThen(() => {
      if (!this.textures.exists('clima_rayo')) this.load.spritesheet('clima_rayo', `${ASSETS}/mundo/clima/rayo.png`, { frameWidth: 48, frameHeight: 192 });
      if (!this.textures.exists('clima_quemadura')) this.load.image('clima_quemadura', `${ASSETS}/mundo/clima/quemadura.png`);
      if (!this.textures.exists('clima_sombra')) this.load.image('clima_sombra', `${ASSETS}/mundo/clima/sombra_rayo.png`);
    }, () => {
      if (!this.anims.exists('clima_rayo_cae')) {
        this.anims.create({ key: 'clima_rayo_cae', frames: this.anims.generateFrameNumbers('clima_rayo', { start: 0, end: 3 }), frameRate: 14 });
      }
      this.stormArtReady = true;
      this.stormArtLoading = false;
    });
  },

  // un rayo en (x, y): primero la sombra que crece, después el golpe
  lightning(x, y, aimed) {
    const shadow = this.add.image(x, y, 'clima_sombra').setDepth(8.5).setScale(0.4).setAlpha(0.2);
    this.minimap?.ignore(shadow);
    this.tweens.add({ targets: shadow, scale: 1.3, alpha: 0.95, duration: WARN_MS, ease: 'Quad.easeIn' });
    this.time.delayedCall(WARN_MS, () => {
      shadow.destroy();
      if (!this.sys.isActive()) return;
      const bolt = this.add.sprite(x, y + 6, 'clima_rayo', 0).setOrigin(0.5, 0.97).setDepth(22).setScale(1.2).setBlendMode('ADD');
      this.minimap?.ignore(bolt);
      bolt.play('clima_rayo_cae');
      bolt.once('animationcomplete', () => bolt.destroy());
      const scorch = this.add.image(x, y, 'clima_quemadura').setDepth(8.4);
      this.minimap?.ignore(scorch);
      this.tweens.add({ targets: scorch, alpha: 0, delay: 4000, duration: 3000, onComplete: () => scorch.destroy() });
      const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
      audio.sfx(dist < 300 ? 'trueno' : 'trueno_lejos');
      this.cameras.main.flash(dist < 300 ? 120 : 60, 220, 235, 255, false);
      if (dist < 200) this.cameras.main.shake(180, 0.004);
      // ¿te alcanzó? (solo los que te apuntaban: los de lejos son para ver la tormenta)
      if (aimed && dist < HIT_RADIUS && !this.encounterLock) {
        this.player.setTint(0xbfe6ff);
        this.time.delayedCall(260, () => this.player?.clearTint());
        bus.emit('rayo-golpe');
      }
    });
  },
};
