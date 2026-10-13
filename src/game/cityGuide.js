// Guía de servicios: dónde está cada NPC que ofrece un servicio (casillas locales de su zona) y
// cómo llevar al jugador hasta él con la flecha de rastreo. Los servicios ya no se abren a
// distancia: hay que ir a la ciudad (o a la aldea) y hablar con quien los ofrece.
import bus from './bus';

const T = 32;
// lugar → zona, casilla del NPC y quién es
export const LUGARES = {
  oswin: { zona: 'aurelia', x: 43, y: 22, name: 'Oswin · Registro de Gremios' },
  elenya: { zona: 'aurelia', x: 58, y: 16, name: 'Elenya · Catedral de Aethra' },
  aelin: { zona: 'aurelia', x: 20, y: 13, name: 'Aelin · Barrio Élfico' },
  lyra_aurelia: { zona: 'aurelia', x: 74, y: 44, name: 'Lyra · Barrio del Mercado' },
  brokk: { zona: 'aurelia', x: 101, y: 14, name: 'Brokk · Forja enana' },
  durin: { zona: 'aurelia', x: 100, y: 44, name: 'Durin · Banco Real' },
  tablon_aurelia: { zona: 'aurelia', x: 56, y: 37, name: 'Tablón de encargos · Plaza del Pilar' },
  fogata_aldea: { zona: 'pradera', x: 78, y: 51, name: 'Fogata de la Aldea Espiga' },
  lyra_aldea: { zona: 'pradera', x: 76, y: 50, name: 'Lyra · Aldea Espiga' },
  goreth: { zona: 'pradera', x: 84, y: 51, name: 'Goreth · Aldea Espiga' },
  tablon_aldea: { zona: 'pradera', x: 84, y: 47, name: 'Tablón de encargos · Aldea Espiga' },
};

// servicio → ícono, descripción y lugares donde se ofrece (el primero es el de la capital)
export const SERVICIOS = [
  { id: 'contratar', icon: ['crossed-swords', 'lorc'], title: 'Contratar', desc: 'Recluta aventureros para tu grupo.', lugares: ['oswin'] },
  { id: 'enfermeria', icon: ['healing', 'delapouite'], title: 'Enfermería', desc: 'Recupera vida y maná.', lugares: ['elenya', 'fogata_aldea'] },
  { id: 'encantador', icon: ['magic-swirl', 'lorc'], title: 'Encantador', desc: 'Mejora tu equipo con piedras.', lugares: ['aelin', 'goreth'] },
  { id: 'artesanos', icon: ['shop', 'delapouite'], title: 'Artesanos', desc: 'Materiales y venta de botín.', lugares: ['lyra_aurelia', 'lyra_aldea'] },
  { id: 'taller', icon: ['anvil', 'lorc'], title: 'Taller', desc: 'Fabrica y desmantela equipo.', lugares: ['brokk', 'goreth'] },
  { id: 'tablon', icon: ['scroll-unfurled', 'lorc'], title: 'Encargos', desc: 'Misiones del tablón.', lugares: ['tablon_aurelia', 'tablon_aldea'] },
];

// zona donde está el héroe ahora (la escena contesta al momento por el bus)
function heroZone() {
  let zona = null;
  bus.emit('hero-pos', (p) => { zona = p?.zone ?? null; });
  return zona;
}

// Lleva al jugador al lugar más a mano de la lista: el de su zona si hay, si no el primero.
export function guiar(lugarIds, info) {
  const zona = heroZone();
  const id = lugarIds.find((l) => LUGARES[l]?.zona === zona) ?? lugarIds[0];
  const l = LUGARES[id];
  if (!l) return null;
  bus.emit('social-tour', [{ name: l.name, x: l.x * T + 16, y: l.y * T + 40, zona: l.zona, info: info ?? '' }]);
  bus.emit('social-toast', { text: `La flecha te lleva con ${l.name}.`, kind: 'tour' });
  return l;
}
