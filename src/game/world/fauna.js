import Phaser from 'phaser';
import { BUTTERFLY_TINTS } from './shared';

// Fauna del ambiente (conejos, ciervos, pájaros, mariposas) que huye del héroe.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const faunaMethods = {
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
  },

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
  },
};
