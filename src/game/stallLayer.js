import bus from './bus';

// Muñecos de venta del mundo (los puestos de los jugadores; ver gprback/lib/puestos.js).
// Cada muñeco se dibuja sentado en su manta, con el cartel de la tienda en un globo encima (como
// las tiendas de NosTale) y el nombre del dueño debajo. Al acercarte se vuelve un punto de interés
// (E o clic) que abre la ventana con lo que vende. React manda la lista por el bus ('stalls-state')
// cada vez que entras a una zona o el servidor avisa que algo cambió.

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
const TAG_FONT = 'Cinzel, Georgia, serif';
const RES = 4;
const LOOK_ROW = { oso: 0, conejo: 1, gato: 2 };

export default class StallLayer {
  static preload(scene) {
    if (!scene.textures.exists('munecos')) scene.load.spritesheet('munecos', `${ASSETS}/mundo/puestos/munecos.png`, { frameWidth: 32, frameHeight: 32 });
  }

  constructor(scene) {
    this.scene = scene;
    this.dolls = new Map(); // id → { sprite, sign, tag, poi }
    for (const [look, row] of Object.entries(LOOK_ROW)) {
      const key = `muneco_${look}`;
      if (!scene.anims.exists(key)) {
        scene.anims.create({ key, frames: scene.anims.generateFrameNumbers('munecos', { frames: [row * 2, row * 2, row * 2 + 1, row * 2] }), frameRate: 1.6, repeat: -1 });
      }
    }
    this.onState = ({ zone, puestos }) => this.sync(zone, puestos ?? []);
    bus.on('stalls-state', this.onState);
    scene.events.once('shutdown', () => this.destroy());
  }

  // deja en la escena exactamente los muñecos de la lista (de esa zona)
  sync(zone, list) {
    const keep = new Set(list.map((s) => s.id));
    for (const [id, d] of this.dolls) if (d.zone === zone && !keep.has(id)) this.remove(id);
    for (const s of list) {
      const cur = this.dolls.get(s.id);
      if (cur && cur.title === s.title && cur.look === s.look) continue;
      if (cur) this.remove(s.id);
      this.add(zone, s);
    }
  }

  add(zone, s) {
    const sc = this.scene;
    const { x, y } = sc.toGlobal(s.x, s.y, zone);
    const look = LOOK_ROW[s.look] != null ? s.look : 'oso';
    const sprite = sc.add.sprite(x, y + 4, 'munecos', LOOK_ROW[look] * 2).setDepth(9 + y / 100000).play({ key: `muneco_${look}`, startFrame: Math.floor(Math.random() * 3) });
    sprite.setInteractive({ useHandCursor: true });
    const poi = { id: `stall:${s.id}`, x, y, radius: 40, label: `Ver el puesto de ${s.owner}`, window: 'puesto', args: { stallId: s.id } };
    sprite.on('pointerdown', () => bus.emit('interact', poi));

    // cartel: globo de madera clara con borde dorado y el nombre de la tienda
    const label = sc.add.text(0, 0, s.title, {
      fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#3a2208', align: 'center',
      wordWrap: { width: 96, useAdvancedWrap: true },
    }).setOrigin(0.5, 1).setResolution(RES);
    const w = Math.max(26, label.width + 12);
    const h = label.height + 6;
    const g = sc.add.graphics();
    g.fillStyle(0xfff3d0, 0.97);
    g.lineStyle(1, 0xb8862c, 1);
    g.fillRoundedRect(-w / 2, -h - 4, w, h, 4);
    g.strokeRoundedRect(-w / 2, -h - 4, w, h, 4);
    g.fillTriangle(-3, -4.5, 3, -4.5, 0, 0);
    g.lineBetween(-3, -4, 0, 0);
    g.lineBetween(3, -4, 0, 0);
    // monedita a la izquierda del texto
    g.fillStyle(0xf0cc5a, 1).fillCircle(-w / 2 + 5, -h / 2 - 4, 2.2);
    g.lineStyle(1, 0xa8802c, 1).strokeCircle(-w / 2 + 5, -h / 2 - 4, 2.2);
    label.setPosition(3, -6.5);
    const sign = sc.add.container(x, y - 14, [g, label]).setDepth(22);
    sc.tweens.add({ targets: sign, y: y - 16, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const tag = sc.add.text(x, y + 19, `${s.owner}`, {
      fontFamily: TAG_FONT, fontSize: '6px', fontStyle: 'bold', color: '#ffe9a8', stroke: '#141420', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(21).setResolution(RES);
    sc.minimap?.ignore([sign, tag]);

    sc.pois.push(poi);
    this.dolls.set(s.id, { zone, title: s.title, look: s.look, sprite, sign, tag, poi });
  }

  remove(id) {
    const d = this.dolls.get(id);
    if (!d) return;
    this.scene.tweens.killTweensOf(d.sign);
    d.sprite.destroy();
    d.sign.destroy();
    d.tag.destroy();
    this.scene.pois = this.scene.pois.filter((p) => p !== d.poi);
    if (this.scene.nearPoi === d.poi) { this.scene.nearPoi = null; bus.emit('poi', null); }
    this.dolls.delete(id);
  }

  destroy() {
    bus.off('stalls-state', this.onState);
    for (const id of [...this.dolls.keys()]) this.remove(id);
  }
}
