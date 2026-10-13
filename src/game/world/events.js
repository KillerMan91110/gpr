import { TAG_FONT, TAG_RES, ASSETS, IDLE } from './shared';

// Calendario de eventos (gprback/lib/eventos.js): lo que se ve en el mapa mientras un evento está
// activo. Hoy: Varo, el mercader ambulante, junto al Pilar de Aethra (miércoles y sábados).
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const eventsMethods = {
  setEvents(active = []) {
    this.setWanderer(active.includes('mercader'));
  },

  setWanderer(on) {
    if (!on) {
      const w = this.wanderer;
      if (!w) return;
      [w.sprite, w.tag, w.role, w.glow, w.block].forEach((o) => o?.destroy());
      this.pois = this.pois.filter((p) => p.id !== 'ambulante');
      this.wanderer = null;
      return;
    }
    if (this.wanderer) return;
    const pilar = this.allPoints().find((o) => o.type === 'pilar');
    if (!pilar || !this.walk) return;
    // a un costado del Pilar, en una casilla libre
    let tx = Math.floor((pilar.x + 96) / 32);
    let ty = Math.floor((pilar.y + 48) / 32);
    for (let r = 0; r < 6 && !this.walkable(tx, ty); r++) tx += 1;
    const x = tx * 32 + 16;
    const y = ty * 32 + 16;
    this.wanderer = { x, y };
    const key = 'npc_npc_ambulante';
    const build = () => {
      const w = this.wanderer;
      if (!w || w.sprite) return;
      w.glow = this.add.image(x + 6, y + 4, 'luz').setDepth(20.6).setBlendMode('ADD').setTint(0xffd890).setScale(0.8).setAlpha(0.5);
      w.sprite = this.add.sprite(x, y, this.textures.exists(key) ? key : 'heroe', IDLE.down).setDepth(9);
      w.block = this.add.rectangle(x, y + 8, 16, 10);
      this.blockers.add(w.block);
      w.role = this.add.text(x, y - 17, '‹Mercader ambulante›', {
        fontFamily: "'EB Garamond', Georgia, serif", fontSize: '8px', fontStyle: 'italic', color: '#d8cdb4', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      w.tag = this.add.text(x, y - 25, 'Varo', {
        fontFamily: TAG_FONT, fontSize: '7px', fontStyle: 'bold', color: '#ffe9a8', stroke: '#141420', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(21).setResolution(TAG_RES);
      [w.tag, w.role, w.glow].forEach((t) => this.minimap?.ignore(t));
      this.tweens.add({ targets: w.glow, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      this.pois.push({ id: 'ambulante', x, y: y + 10, label: 'Hablar con Varo, mercader ambulante', window: 'ambulante' });
    };
    if (this.textures.exists(key)) build();
    else this.loadThen(() => this.load.spritesheet(key, `${ASSETS}/mundo/caminar/npc_ambulante.png`, { frameWidth: 32, frameHeight: 32 }), build);
  },
};
