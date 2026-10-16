import Phaser from 'phaser';
import { TAG_FONT, TAG_RES, ASSETS, IDLE, NPC_STROLL_TILES, NPC_STROLL_SPEED, NPC_NOTICE_RADIUS, propOf } from './shared';

// NPCs: aparecen, pasean alrededor de su puesto, miran al héroe y llevan marcas de misión.
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const npcsMethods = {
  // NPCs con su sprite propio, nombre, oficio y la marca de misión (! o ?)
  spawnNpcs(npcs) {
    const sprites = [...new Set(npcs.map((o) => propOf(o, 'sprite')).filter(Boolean))];
    this.loadThen(() => sprites.forEach((s) => {
      if (!this.textures.exists(`npc_${s}`)) this.load.spritesheet(`npc_${s}`, `${ASSETS}/mundo/caminar/${s}.png`, { frameWidth: 32, frameHeight: 32 });
    }), () => {
      for (const o of npcs) {
        const x = o.x + 16;
        const y = o.y + 16;
        // si su hoja no cargó (sprite nuevo sin exportar todavía) se ve con la del héroe
        const tex = this.textures.exists(`npc_${propOf(o, 'sprite')}`) ? `npc_${propOf(o, 'sprite')}` : 'heroe';
        const npc = this.add.sprite(x, y, tex, IDLE.down).setDepth(9);
        const blocker = this.add.rectangle(x, y + 8, 16, 10);
        this.blockers.add(blocker);
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
        // punto en el minimapa (solo se ve si tiene una misión)
        const dot = this.add.circle(x, y, 18, 0xffd84a).setStrokeStyle(5, 0x141420).setDepth(30).setVisible(false);
        this.cameras.main.ignore(dot);
        [tag, role, mark].filter(Boolean).forEach((t) => this.minimap?.ignore(t));
        // el mismo NPC puede estar en dos zonas (Gaspar en la capital y en la aldea): clave por zona
        const id = propOf(o, 'dialogo') ?? o.name;
        // Paseo: fuera de las ciudades dan unos pasos alrededor de su puesto (casillas de radio,
        // "pasea" en el mapa lo cambia; 0 = quieto). En la ciudad se quedan en su tienda o su casa.
        const ciudad = !!this.zoneByDir[o.zone]?.world.ciudad;
        const radius = Number(propOf(o, 'pasea') ?? (ciudad ? 0 : NPC_STROLL_TILES)) * 32;
        if (tex !== 'heroe') this.makeWalkAnims(tex);
        const poi = this.pois.find((q) => q.id === o.name && q.x === x && q.y === y) ?? null;
        this.npcs.set(`${o.zone}:${id}`, {
          id, sprite: npc, mark, dot, name: npcName, tag, role, blocker, poi, tex,
          home: { x, y }, pos: { x, y }, radius, dir: 'down', target: null,
          wait: Phaser.Math.Between(1000, 6000), phase: Math.random() * Math.PI * 2,
          // historia de cada jugador: aparece después de esa misión ("requiere") o se va después de ella ("oculto_tras")
          story: { requiere: propOf(o, 'requiere') ?? null, ocultoTras: propOf(o, 'oculto_tras') ?? null },
        });
      }
      this.applyNpcStory(this.storyDone);
      this.setNpcMarks(this.marks);
      // NPCs que una misión mandó a otro lugar (llegaron antes que sus sprites)
      if (this.questSpots?.length) this.setQuestNpcSpots(this.questSpots);
    });
  },

  // Los NPCs con paseo caminan despacio entre casillas libres cerca de su puesto y nunca se alejan
  // más de su radio. Si el héroe se acerca se detienen y lo miran (así es fácil hablarles).
  // Todos respiran (1 px) cuando están quietos.
  updateNpcs(time, delta) {
    if (!this.npcs.size || !this.player) return;
    for (const n of this.npcs.values()) {
      if (n.hidden) continue;
      const sp = n.sprite;
      const hero = Phaser.Math.Distance.Between(n.pos.x, n.pos.y, this.player.x, this.player.y);
      let moving = false;
      if (hero < NPC_NOTICE_RADIUS) {
        // atento al héroe: deja lo que hacía y se gira hacia él
        n.target = null;
        const dx = this.player.x - n.pos.x;
        const dy = this.player.y - n.pos.y;
        n.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
        sp.setFlipX(n.dir === 'side' && dx < 0);
      } else if (n.radius > 0 && n.target) {
        const dx = n.target.x - n.pos.x;
        const dy = n.target.y - n.pos.y;
        const dist = Math.hypot(dx, dy);
        const step = (NPC_STROLL_SPEED * delta) / 1000;
        if (dist <= step) {
          n.pos = { ...n.target };
          n.target = null;
          n.wait = Phaser.Math.Between(2500, 8000);
        } else {
          n.pos = { x: n.pos.x + (dx / dist) * step, y: n.pos.y + (dy / dist) * step };
          n.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy < 0 ? 'up' : 'down');
          sp.setFlipX(n.dir === 'side' && dx < 0);
          moving = true;
        }
      } else if (n.radius > 0) {
        n.wait -= delta;
        if (n.wait <= 0) {
          n.target = this.npcStrollTarget(n);
          n.wait = n.target ? 0 : Phaser.Math.Between(2000, 5000);
        }
      }
      if (moving) {
        if (n.tex !== 'heroe') sp.anims.play(`walk_${n.tex}_${n.dir}`, true);
      } else if (sp.anims.isPlaying || sp.frame.name !== IDLE[n.dir]) {
        sp.anims.stop();
        sp.setFrame(IDLE[n.dir]);
      }
      // quieto respira; caminando ya se mueve con los pasos
      const breath = moving ? 0 : Math.round((Math.sin(time / 520 + n.phase) - 1) / 2);
      sp.setPosition(n.pos.x, n.pos.y + breath).setDepth(9 + n.pos.y / 100000);
      // lo que acompaña al NPC: nombre, oficio, marca de misión, punto del minimapa, choque y "E"
      const bob = Math.round(Math.sin(time / 300 + n.phase) * 1.5);
      n.role?.setPosition(n.pos.x, n.pos.y - 17);
      n.tag.setPosition(n.pos.x, n.role ? n.pos.y - 25 : n.pos.y - 17);
      n.mark.setPosition(n.pos.x, n.tag.y - 8 + bob);
      n.dot.setPosition(n.pos.x, n.pos.y);
      if (n.blocker.x !== n.pos.x || n.blocker.y !== n.pos.y + 8) {
        n.blocker.setPosition(n.pos.x, n.pos.y + 8);
        n.blocker.body?.updateFromGameObject();
        if (n.poi) { n.poi.x = n.pos.x; n.poi.y = n.pos.y; }
      }
    }
  },

  // casilla libre al azar dentro del radio del NPC, a la que se llega en línea recta
  npcStrollTarget(n) {
    const T = 32;
    const r = Math.floor(n.radius / T);
    const hx = Math.floor(n.home.x / T);
    const hy = Math.floor(n.home.y / T);
    const cx = Math.floor(n.pos.x / T);
    const cy = Math.floor(n.pos.y / T);
    for (let tries = 0; tries < 8; tries++) {
      const tx = hx + Phaser.Math.Between(-r, r);
      const ty = hy + Phaser.Math.Between(-r, r);
      if ((tx === cx && ty === cy) || !this.walkable(tx, ty)) continue;
      if (!this.clearLine(cx, cy, tx, ty)) continue;
      // que no se suban encima de otro NPC
      const busy = [...this.npcs.values()].some((m) => m !== n && Math.hypot(m.pos.x - (tx * T + 16), m.pos.y - (ty * T + 16)) < T);
      if (!busy) return { x: tx * T + 16, y: ty * T + 16 };
    }
    return null;
  },

  // marks: { ren: '!' | '!!' | '?' | 'gris' | null } (ver game/questGivers.js) — ? algo para entregar,
  // ! misión que ya puedes aceptar (!! rojo si es de la historia), gris: misión para dentro de poco
  setNpcMarks(marks) {
    this.marks = marks ?? {};
    const COLORS = { '?': ['#7dff9a', 0x7dff9a], '!': ['#ffd84a', 0xffd84a], '!!': ['#ff5a4a', 0xff5a4a], gris: ['#a8a8b0', 0x8a8a94] };
    for (const n of this.npcs.values()) {
      const m = this.marks[n.id] ?? null;
      const [css, hex] = COLORS[m] ?? COLORS['!'];
      n.mark.setText(m ? (m === 'gris' || m === '!!' ? '!' : m) : '');
      n.mark.setColor(css);
      n.mark.setAlpha(m === 'gris' ? 0.85 : 1);
      n.dot.setVisible(!!m && !n.hidden);
      n.dot.setFillStyle(hex);
    }
  },

  // Lo que ve cada jugador depende de SU historia (done: códigos de las misiones que completó). Un
  // NPC con "requiere" no está hasta que completes esa misión (Dora y Kili, perdidos en las minas
  // hasta que los rescatas); uno con "oculto_tras" se va cuando la completas. Mientras no se sabe la
  // historia del jugador (done == null), los que dependen de ella no se muestran.
  applyNpcStory(done) {
    this.storyDone = done ?? null;
    for (const n of this.npcs.values()) {
      const { requiere, ocultoTras } = n.story ?? {};
      if (!requiere && !ocultoTras) continue;
      const visible = !!done && (!requiere || done.has(requiere)) && (!ocultoTras || !done.has(ocultoTras));
      n.hidden = !visible;
      [n.sprite, n.tag, n.role].filter(Boolean).forEach((g) => g.setVisible(visible));
      n.mark.setVisible(visible);
      n.dot.setVisible(visible && !!this.marks?.[n.id]);
      if (n.blocker.body) n.blocker.body.enable = visible;
      if (n.poi) n.poi.hidden = !visible;
    }
  },
};
