// Geografía del mundo de Etheria para el mapa (pestaña "Mundo"): dónde queda cada zona, qué
// caminos las unen y por qué salida de cada mapa se llega. Los ids numéricos son los de
// monster_zones; la capital todavía no es una zona de combate.
//
// Norte arriba: la capital al norte de la Pradera (Puerta Norte), las Montañas Grises al este
// (Camino del Este), y desde ahí el resto del continente.

export const ATLAS_ZONES = {
  capital: {
    name: 'La Capital', levels: null, x: 268, y: 138, color: '#c9b27a', icon: ['castle', 'delapouite'],
    description: 'La ciudad amurallada del reino: gremios, comercio y la corte. Sus campos del sur son la Pradera Dorada.',
    route: 'Al norte de la Pradera Dorada, cruzando la Puerta Norte por el Camino Real.',
    soon: true,
  },
  1: {
    dir: 'pradera', x: 268, y: 238, color: '#d8b84a', icon: ['wheat', 'lorc'],
    route: 'Tierras de cultivo al sur de la capital. Aldea Espiga está en el cruce de caminos.',
  },
  2: { x: 420, y: 214, color: '#9aa0a8', icon: ['stone-pile', 'delapouite'], route: 'Al este de la Pradera, siguiendo el Camino del Este hasta salir del mapa.' },
  3: { x: 528, y: 118, color: '#d0603a', icon: ['fireball', 'lorc'], route: 'Al noreste, atravesando los pasos de las Montañas Grises.' },
  4: { x: 476, y: 334, color: '#5a8cae', icon: ['water-flask', 'delapouite'], route: 'Bajando hacia el mar desde el Volcán Rojo, por la costa este.' },
  5: { x: 330, y: 50, color: '#bfe2f2', icon: ['ice-bolt', 'lorc'], route: 'Lejos al norte, más allá de la capital.' },
  6: { x: 112, y: 298, color: '#7a5aa0', icon: ['ghost', 'lorc'], route: 'Al oeste, bajo las colinas que hay pasadas las Ruinas del Vigía.' },
  7: { x: 96, y: 102, color: '#5fb39a', icon: ['crystal-ball', 'lorc'], route: 'En el extremo noroeste, al final de la Tundra.' },
};

// caminos entre zonas (para dibujarlos en el mapa)
export const ATLAS_ROADS = [
  ['capital', 1], [1, 2], [2, 3], [3, 4], [2, 4], ['capital', 5], [1, 6], [5, 7], ['capital', 7],
];

// salidas de cada zona del mundo abierto (nombre del punto en el mapa → zona a la que lleva)
export const ZONE_EXITS = {
  pradera: { puerta_norte: 'capital', salida_este: 2 },
};

// contorno del continente (viewBox 600x400)
export const CONTINENT_PATH = 'M58 70 C 90 30, 170 24, 230 30 C 300 14, 380 18, 440 40 C 500 52, 560 60, 578 110 C 590 160, 560 200, 566 250 C 572 300, 540 360, 480 378 C 420 392, 360 370, 300 376 C 230 384, 160 372, 100 350 C 50 330, 28 280, 36 220 C 42 170, 30 110, 58 70 Z';
