import { ASSETS, propOf } from './shared';
import { enFase } from '../story';

// Escenario que sigue la historia de cada jugador (phasing, ver game/story.js): un punto "escena"
// del mapa dibuja un objeto (escombros que tapan un camino, un puente arreglado, el campamento que
// levantaron los refugiados…) solo mientras se cumpla su "fase". Con "solido" además bloquea el
// paso, así un derrumbe corta el camino hasta que la misión lo despeja.
//
// Propiedades del punto: sprite (assets/mundo/escena/<sprite>.png, tira de cuadros), fase,
// ancho / alto (de cada cuadro, 32 si no se dice), cuadros (1 = quieto; 2 o más se anima),
// solido (true / false) y encima (true: se dibuja sobre el héroe, como un arco o una copa).
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const escenaMethods = {
  spawnScenery(points) {
    this.scenery = [];
    if (!points.length) return;
    const sheets = [...new Set(points.map((o) => propOf(o, 'sprite')).filter(Boolean))];
    const sizeOf = (sp) => {
      const o = points.find((p) => propOf(p, 'sprite') === sp);
      return { frameWidth: Number(propOf(o, 'ancho') ?? 32), frameHeight: Number(propOf(o, 'alto') ?? 32) };
    };
    this.loadThen(() => sheets.forEach((sp) => {
      if (!this.textures.exists(`esc_${sp}`)) this.load.spritesheet(`esc_${sp}`, `${ASSETS}/mundo/escena/${sp}.png`, sizeOf(sp));
    }), () => {
      for (const o of points) {
        const sp = propOf(o, 'sprite');
        if (!sp || !this.textures.exists(`esc_${sp}`)) continue;
        const { frameWidth: w, frameHeight: h } = sizeOf(sp);
        // el punto marca la casilla de arriba a la izquierda del objeto
        const x = o.x + w / 2;
        const y = o.y + h;
        const img = this.add.sprite(x, y, `esc_${sp}`, 0).setOrigin(0.5, 1)
          .setDepth(propOf(o, 'encima') ? 20 : 8 + y / 100000);
        const frames = Number(propOf(o, 'cuadros') ?? 1);
        if (frames > 1) {
          const key = `esc_anim_${sp}`;
          if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(`esc_${sp}`, { start: 0, end: frames - 1 }), frameRate: 3, repeat: -1 });
          img.play(key);
        }
        let blocker = null;
        if (propOf(o, 'solido')) {
          blocker = this.add.rectangle(x, y - h / 4, w - 4, h / 2);
          this.blockers.add(blocker);
        }
        this.scenery.push({ img, blocker, fase: propOf(o, 'fase') ?? null });
      }
      this.applySceneryStory(this.storyState);
    });
  },

  applySceneryStory(story) {
    for (const s of this.scenery ?? []) {
      const visible = enFase(story, s.fase);
      s.img.setVisible(visible);
      if (s.blocker?.body) s.blocker.body.enable = visible;
    }
  },
};
