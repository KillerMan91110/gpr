// Geografía del mundo de Etheria para el mapa (pestaña "Mundo"): dónde queda cada zona, qué
// caminos las unen y por qué salida de cada mapa se llega. Los ids numéricos son los de
// monster_zones; la capital todavía no es una zona de combate.
//
// Norte arriba: la capital al norte de la Pradera (Puerta Norte), las Montañas Grises al este
// (Camino del Este), el Volcán Rojo al sur de las Montañas (Paso del Humo) y las Costas Muertas al
// sur del Volcán (Bajada de Basalto). La Tundra Eterna, al noreste, se alcanza en barco desde las Costas.
// Tiene que coincidir con public/assets/mundo/etheria.json y gprback/docs/mapa_etheria.md.

export const ATLAS_ZONES = {
  capital: {
    dir: 'aurelia', name: 'Aurelia', levels: null, x: 268, y: 138, color: '#c9b27a', icon: ['castle', 'delapouite'],
    description: 'La Ciudad del Pilar, capital de Etheria: la catedral de Aethra, las casas de las órdenes, el mercado y la corte. Aquí empieza todo aventurero.',
    route: 'Al norte de la Pradera Dorada, cruzando la Puerta Norte por el Camino Real. También hay diligencia desde la Aldea Espiga.',
  },
  1: {
    dir: 'pradera', x: 268, y: 238, color: '#d8b84a', icon: ['wheat', 'lorc'],
    route: 'Tierras de cultivo al sur de la capital. Aldea Espiga está en el cruce de caminos.',
  },
  2: { dir: 'montanas', x: 420, y: 214, color: '#9aa0a8', icon: ['stone-pile', 'delapouite'], route: 'Al este de la Pradera, siguiendo el Camino del Este. El Bastión de Hierro está en el corazón de la sierra.' },
  3: { dir: 'volcan', x: 420, y: 296, color: '#d0603a', icon: ['fireball', 'lorc'], route: 'Al sur de las Montañas Grises, bajando por el Paso del Humo. Ascuaria, la ciudad de los dracónidos, está sobre una meseta de basalto.' },
  4: { dir: 'costas', x: 420, y: 362, color: '#4a9cb8', icon: ['lighthouse', 'delapouite'], route: 'Al sur del Volcán Rojo, bajando por la Bajada de Basalto desde la Caldera del Titán. El Puerto Antiguo y los palafitos de Coralia están junto al mar.' },
  5: { dir: 'tundra', x: 520, y: 120, color: '#bfe2f2', icon: ['ice-bolt', 'lorc'], route: 'Lejos al noreste, al otro lado del Mar del Norte: solo se llega en el barco de Rhaegar, que zarpa del Puerto Antiguo. Fiordo Blanco, la ciudad de los norteños, está junto al muelle.' },
  6: { x: 112, y: 298, color: '#7a5aa0', icon: ['ghost', 'lorc'], route: 'Al oeste, bajo las colinas que hay pasadas las Ruinas del Vigía.' },
  7: { x: 96, y: 102, color: '#5fb39a', icon: ['crystal-ball', 'lorc'], route: 'En el extremo noroeste, al final de la Tundra.' },
};

// caminos entre zonas (para dibujarlos en el mapa)
export const ATLAS_ROADS = [
  ['capital', 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [5, 7], ['capital', 7],
];

// salidas de cada zona del mundo abierto (nombre del punto en el mapa → zona a la que lleva)
export const ZONE_EXITS = {
  pradera: { puerta_norte: 'capital', salida_este: 2 },
  aurelia: { puerta_sur: 1 },
};

// contorno del continente (viewBox 600x400)
export const CONTINENT_PATH = 'M58 70 C 90 30, 170 24, 230 30 C 300 14, 380 18, 440 40 C 500 52, 560 60, 578 110 C 590 160, 560 200, 566 250 C 572 300, 540 360, 480 378 C 420 392, 360 370, 300 376 C 230 384, 160 372, 100 350 C 50 330, 28 280, 36 220 C 42 170, 30 110, 58 70 Z';
