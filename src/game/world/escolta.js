import Phaser from 'phaser';
import { ASSETS, IDLE, SPEED } from './shared';

// Escoltas de misión (objetivo ESCORT, ver gprback/lib/questSteps.js): alguien camina detrás del
// héroe hasta un lugar. Va por el mismo camino que hiciste tú (así nunca atraviesa paredes) y un poco
// más lento. Si te alejas demasiado se queda quieto y te pide que lo esperes; cuando vuelves a su
// lado, sigue. El paso solo se cumple si llegas al destino con él cerca.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
const ESCORT_SPEED = SPEED * 0.85;
const LOST_TILES = 9; // a esta distancia se queda esperando
const BACK_TILES = 4; // a esta distancia vuelve a seguirte
const JUMP_TILES = 30; // más lejos que esto viajaste (diligencia, vagoneta…): viajó contigo
const NEAR_TILES = 3; // así de cerca tiene que estar al llegar
const WAIT_LINES = ['¡Espérame!', '¡Más despacio!', '¡Eh! ¡No me dejes aquí!', 'Me duelen los pies…'];
const CHAT_MS = [9000, 16000]; // cada cuánto dice algo mientras camina (escort.lines)

export const escoltaMethods = {
  // point: el punto ESCORT del paso actual (con escort { sprite, name }) o null
  setQuestEscort(point) {
    const cur = this.escort;
    if (cur && point && cur.objectiveId === point.objectiveId) return;
    if (cur) { cur.sprite.destroy(); cur.tag.destroy(); this.escort = null; }
    if (!point?.escort?.sprite || !this.player) return;
    const key = `npc_${point.escort.sprite.replace(/^npc_/, '')}`;
    const build = () => {
      if (!this.textures.exists(key) || !this.player) return;
      this.makeWalkAnims(key);
      const sprite = this.add.sprite(this.player.x - 20, this.player.y, key, IDLE.down).setDepth(10);
      const tag = this.add.text(sprite.x, sprite.y - 17, point.escort.name ?? '', {
        fontFamily: "'EB Garamond', Georgia, serif", fontSize: '8px', fontStyle: 'bold', color: '#9af4ff', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(3);
      this.minimap?.ignore(tag);
      this.escort = { objectiveId: point.objectiveId, sprite, tag, key, path: [], waiting: false, dir: 'down', point, chatAt: this.time.now + 4000 };
    };
    if (this.textures.exists(key)) build();
    else this.loadThen(() => this.load.spritesheet(key, `${ASSETS}/mundo/caminar/${key}.png`, { frameWidth: 32, frameHeight: 32 }), build);
  },

  updateEscort(delta) {
    const e = this.escort;
    const p = this.player;
    if (!e || !p) return;
    let dist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, p.x, p.y);
    if (dist > JUMP_TILES * 32) {
      e.sprite.setPosition(p.x - 20, p.y);
      e.path = [];
      e.waiting = false;
      dist = 20;
    }
    // el camino del héroe: el seguidor lo recorre punto por punto
    const last = e.path[e.path.length - 1];
    if (!last || Phaser.Math.Distance.Between(last.x, last.y, p.x, p.y) > 6) e.path.push({ x: p.x, y: p.y });
    if (e.waiting) {
      if (dist <= BACK_TILES * 32) {
        e.waiting = false;
        e.path = [{ x: p.x, y: p.y }];
        if (!e.point.escort?.waitLines?.length) this.social?.say('escolta', '¡Ahí estás! Vamos.');
      }
    } else if (dist > LOST_TILES * 32) {
      e.waiting = true;
      this.social?.say('escolta', Phaser.Utils.Array.GetRandom(e.point.escort?.waitLines?.length ? e.point.escort.waitLines : WAIT_LINES));
    }
    // charla de camino (lo que dice mientras lo acompañas)
    const lines = e.point.escort?.lines ?? [];
    if (!e.waiting && lines.length && this.time.now >= e.chatAt) {
      e.chatAt = this.time.now + Phaser.Math.Between(...CHAT_MS);
      this.social?.say('escolta', Phaser.Utils.Array.GetRandom(lines));
    }
    let moving = false;
    if (!e.waiting && dist > 26 && e.path.length) {
      let step = (ESCORT_SPEED * delta) / 1000;
      while (step > 0 && e.path.length) {
        const t = e.path[0];
        const d = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, t.x, t.y);
        if (d <= step) { e.sprite.setPosition(t.x, t.y); e.path.shift(); step -= d; continue; }
        const dx = t.x - e.sprite.x;
        const dy = t.y - e.sprite.y;
        e.sprite.setPosition(e.sprite.x + (dx / d) * step, e.sprite.y + (dy / d) * step);
        e.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
        if (e.dir === 'side') e.sprite.setFlipX(dx < 0);
        step = 0;
        moving = true;
      }
    }
    if (moving) e.sprite.anims.play(`walk_${e.key}_${e.dir}`, true);
    else if (e.sprite.anims.isPlaying) { e.sprite.anims.stop(); e.sprite.setFrame(IDLE[e.dir] ?? IDLE.down); }
    e.sprite.setDepth(e.sprite.y < p.y ? 9.8 : 10.2);
    e.tag.setPosition(e.sprite.x, e.sprite.y - 17);
  },

  // ¿llegó el escoltado? (el destino lo revisa checkQuestVisits como un lugar más)
  escortArrived(p) {
    const e = this.escort;
    if (!e || e.objectiveId !== p.objectiveId) return false;
    return Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y) <= NEAR_TILES * 32;
  },

  // cumplido: se despide y se va caminando
  finishEscort(objectiveId) {
    const e = this.escort;
    if (!e || e.objectiveId !== objectiveId) return;
    this.escort = null;
    this.tweens.add({ targets: [e.sprite, e.tag], alpha: 0, delay: 2500, duration: 900, onComplete: () => { e.sprite.destroy(); e.tag.destroy(); } });
  },
};
