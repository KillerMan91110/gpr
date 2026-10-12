import bus from './bus';

// Estado social del mundo que comparten la escena, el chat y la ventana Social:
// jugadores recientes (los que te cruzaste; se guardan en este navegador), "busco grupo" y a
// quién estás siguiendo el rastro.
const MAX_RECENT = 40;
const key = (me) => `social_recientes_${me}`;

let me = null;
let recent = [];
let lfg = false;
let track = null; // { id, name }

const changed = () => bus.emit('social-store', { recent, lfg, track });

export const socialStore = {
  init(playerId) {
    if (me === playerId) return;
    me = playerId;
    try { recent = JSON.parse(localStorage.getItem(key(me))) ?? []; } catch { recent = []; }
    changed();
  },
  get: () => ({ recent, lfg, track }),

  // te cruzaste (o hablaste) con alguien: queda arriba de la lista de recientes
  meet(p, how, where) {
    if (!me || !p?.id || p.id === me) return;
    const prev = recent.find((r) => r.id === p.id);
    const entry = {
      id: p.id, name: p.name ?? prev?.name, level: p.level ?? prev?.level, cls: p.cls ?? prev?.cls,
      how: how ?? prev?.how ?? 'cruce', where: where ?? prev?.where ?? '', at: Date.now(),
    };
    recent = [entry, ...recent.filter((r) => r.id !== p.id)].slice(0, MAX_RECENT);
    try { localStorage.setItem(key(me), JSON.stringify(recent)); } catch { /* sin espacio */ }
    changed();
  },
  forget(id) {
    recent = recent.filter((r) => r.id !== id);
    try { localStorage.setItem(key(me), JSON.stringify(recent)); } catch { /* sin espacio */ }
    changed();
  },

  setLfg(on) { lfg = !!on; changed(); bus.emit('social-lfg', lfg); },
  setTrack(t) { track = t; changed(); bus.emit('social-track', track); },
};
