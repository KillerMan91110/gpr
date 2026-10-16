import Phaser from 'phaser';
import { socialStore } from '../socialStore';
import { propOf } from './shared';

// Guía del aventurero (components/world/GuideTracker.js): dónde queda el objetivo de cada paso
// para que la flecha de rastreo lleve al jugador.
// el maestro de cada clase base en el Barrio de las Órdenes (su "dialogo" en el mapa de Aurelia)
export const MASTER_OF = { guerrero: 'aldric', mago: 'isolde', arquero: 'sylwen', picaro: 'nox', sacerdote: 'anselm' };

// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const guideMethods = {
  guideTarget(id) {
    const all = this.allPoints();
    const near = (list) => list.sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, this.player.x, this.player.y)
      - Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y))[0] ?? null;
    switch (id) {
      case 'tomas': {
        const o = all.find((p) => p.type === 'npc' && propOf(p, 'dialogo') === 'tomas');
        return o && { x: o.x + 16, y: o.y + 16, name: 'Tomás' };
      }
      case 'pilar': {
        const o = all.find((p) => p.type === 'pilar');
        return o && { x: o.x, y: o.y + 20, name: 'el Pilar de Aethra' };
      }
      case 'piedra': {
        const o = all.find((p) => p.type === 'vinculo');
        return o && { x: o.x + 16, y: o.y + 40, name: 'la Estatua del Viajero' };
      }
      // los tres de Aurelia: el maestro de tu clase, Elenya en la Catedral y Brokk en su forja
      case 'maestro': case 'catedral': case 'brokk': {
        const npc = id === 'maestro' ? MASTER_OF[this.heroClass] ?? 'aldric' : id === 'catedral' ? 'elenya' : 'brokk';
        const o = all.find((p) => p.type === 'npc' && propOf(p, 'dialogo') === npc);
        const name = id === 'maestro' ? 'tu maestro' : id === 'catedral' ? 'Elenya, en la Catedral' : 'Brokk, en su forja';
        return o && { x: o.x + 16, y: o.y + 16, name };
      }
      case 'puerta': {
        // la puerta abierta de la muralla sur de Aurelia (casillas 58-61, filas 87-89)
        if (!this.zoneByDir.aurelia) return null;
        const g = this.toGlobal(60 * 32, 89 * 32 + 16, 'aurelia');
        return { ...g, name: 'la Puerta Sur' };
      }
      case 'combate': {
        const a = near(this.encounterAreas.map((e) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })));
        return a && { ...a, name: 'los monstruos' };
      }
      case 'recurso': {
        const r = near([...(this.resources?.values() ?? [])].filter((x) => x.ready).map((x) => ({ x: x.sprite.x, y: x.sprite.y })));
        return r && { ...r, name: 'un recurso' };
      }
      case 'aldea': {
        const r = this.refuges?.find((q) => q.name.includes('Aldea Espiga'));
        return r && { x: r.x, y: r.y, name: 'la Aldea Espiga' };
      }
      default: return null;
    }
  },

  trackGuide(id) {
    const t = this.guideTarget(id);
    if (!t) return false;
    socialStore.setTrack({ name: t.name, x: t.x, y: t.y, guide: id });
    return true;
  },
};
