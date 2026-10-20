import Phaser from 'phaser';

// Constantes y utilidades del mundo 2D que comparten WorldScene y sus módulos (game/world/*).

// Letreros sobre personajes: misma fuente que la interfaz y alta resolución para que el zoom
// de la cámara (pixel art) no los deje borrosos.
export const TAG_FONT = 'Cinzel, Georgia, serif';
export const TAG_RES = 4;

export const ASSETS = `${process.env.PUBLIC_URL}/assets`;
export const DEFAULT_ZONE = 'pradera';
// mazmorras (gprback/lib/mazmorra.js): carpeta de la zona → niveles de sus combates y prefijo de sus
// monstruos (bossCodes: jefes que ya existían y no llevan el prefijo)
export const DUNGEONS = {
  cripta: { min: 5, max: 12, codePrefix: 'CRIPTA_' },
  mina_profunda: { min: 18, max: 24, codePrefix: 'MINA_' },
  fisura: { min: 36, max: 42, codePrefix: 'FISURA_' },
  arrecife: { min: 52, max: 58, codePrefix: 'ARRECIFE_', bossCodes: ['SENOR_OCEANO'] },
  cripta_congelada: { min: 67, max: 73, codePrefix: 'CRIPTAH_' },
  trono_huesos: { min: 80, max: 84, codePrefix: 'TRONOH_' },
  observatorio: { min: 92, max: 96, codePrefix: 'OBSERV_' },
};
export const isDungeon = (dir) => !!DUNGEONS[dir];
// el final (la R13 de las Ruinas): las emboscadas de la Plaza del Pilar de Aurelia contra la sombra del Devorador y
// sus hijos se pelean con su fondo (la plaza de noche) y su música
const FINAL_MONSTERS = ['SOMBRA_DEVORADOR', 'ENGENDRO_DEVORADOR', 'OJO_ERRANTE', 'AVATAR_ECLIPSE'];
export const isFinalFight = (encounter) => encounter?.kind === 'emboscada' && encounter.position?.zona === 'aurelia'
  && (encounter.monsters ?? []).some((m) => FINAL_MONSTERS.includes(m.code));
export const SPEED = 110;
// Las ciudades son grandes: dentro se corre un 50% más rápido (bufo "Paso de la ciudad", que se
// ve en el HUD y se pierde al salir). Una zona puede fijar el suyo con "velocidad" en su
// mundo.json (1 = normal).
export const CITY_SPEED = 1.5;
export const POI_RADIUS = 44;
export const GATHER_MS = 1100; // barra de recolectar
// trozos construidos: los que tocan una ventana de ±0.8 trozos alrededor del héroe (a lo sumo
// 3x3, como antes, aunque la ventana cruce el borde entre dos zonas); se destruyen cuando quedan
// fuera de ±1.4 (margen para no armar y desarmar al ir y venir por un borde)
export const CHUNK_NEAR = 0.8;
export const CHUNK_FAR = 1.4;
// Al entrar (o volver de un combate) los monstruos no atacan durante este tiempo, para que no
// te enganche uno que justo pasaba por el punto donde apareces.
export const ENCOUNTER_GRACE_MS = 2500;
// al volver de un combate: más respiro y los monstruos cercanos se apartan (sin esto uno pegado
// al héroe volvía a atacar apenas terminaba la pelea, una y otra vez)
export const POST_BATTLE_GRACE_MS = 5000;
// al huir: 3 s sin que otro monstruo pueda empezar un combate
export const ESCAPE_GRACE_MS = 3000;
export const SHOO_RADIUS = 110;
// los monstruos mucho más débiles que el héroe no se le acercan (si los tocas, igual pelean)
export const SHY_LEVEL_GAP = 5;
export const SHY_RADIUS = 150;
// refugio: si caes, despiertas en el último Pilar o fogata que visitaste
export const REFUGE_RADIUS = 80;
export const REFUGE_KEY = 'mundo_refugio_v1';

// Paso forzado por casilla (capa "paso" de cada trozo, la pinta el editor de mapas como en RPG
// Maker). 0 = lo que diga el tile. Con PASO_FORZADO, los bits 1/2/4/8 cierran el borde de
// arriba/derecha/abajo/izquierda de la casilla (15 = bloqueada entera, 0 = libre aunque el tile
// choque). PASO_CORNISA: se baja (hacia el sur) pero no se sube, como un saliente.
export const PASO_FORZADO = 16;
export const PASO_CORNISA = 32;
export const EDGE = 4; // grosor de los bordes cerrados

// Frames de la hoja de caminar (ver art/sprites/mundo/crear_mundo.lua): 0-2 abajo, 3-5 arriba, 6-8 lado
export const WALK = { down: [1, 0, 2, 0], up: [4, 3, 5, 3], side: [7, 6, 8, 6] };
export const IDLE = { down: 0, up: 3, side: 6 };
// NPCs fuera de las ciudades: radio del paseo (casillas), velocidad (px/s) y a qué distancia se
// detienen para mirar al héroe
export const NPC_STROLL_TILES = 2;
// seguir a otro jugador: a qué distancia se queda detrás de él
export const FOLLOW_GAP = 40;
export const NPC_STROLL_SPEED = 22;
export const NPC_NOTICE_RADIUS = 80;

// recursos (art/sprites/mundo/crear_extras.lua): hoja y [lleno, agotado] por tipo
export const RESOURCES = {
  hierba: { sheet: 'recursos', frames: [0, 1], label: 'Recoger hierbas', glint: 0xfff4a0 },
  mineral: { sheet: 'recursos', frames: [2, 3], label: 'Picar la veta de mineral', glint: 0x6fc3ff },
  cofre: { sheet: 'recursos', frames: [4, 5], label: 'Abrir el cofre', glint: 0xffd84a },
  setas: { sheet: 'recursos2', frames: [0, 1], label: 'Recoger setas', glint: 0xffb0a0 },
  tronco: { sheet: 'recursos2', frames: [2, 3], label: 'Cortar el tronco', glint: 0xfff4a0 },
  flor_luz: { sheet: 'recursos2', frames: [4, 5], label: 'Recoger la flor luminosa', glint: 0x7adcc0 },
  nido: { sheet: 'recursos2', frames: [6, 7], label: 'Revisar el nido', glint: 0xfff4a0 },
  restos: { sheet: 'recursos2', frames: [8, 9], label: 'Registrar los restos', glint: 0xffd84a },
  // recolección v4 (art/sprites/mundo/crear_recursos3.lua)
  lino: { sheet: 'recursos3', frames: [0, 1], label: 'Cosechar el lino', glint: 0xb8d8ff },
  cuarzo: { sheet: 'recursos3', frames: [2, 3], label: 'Recoger el cuarzo de río', glint: 0xf0c8ff },
  trigo: { sheet: 'recursos3', frames: [4, 5], label: 'Segar el trigo', glint: 0xffe070 },
  // Montañas Grises (art/sprites/mundo/crear_recursos4.lua)
  veta_montana: { sheet: 'recursos4', frames: [0, 1], label: 'Picar la veta de acero', glint: 0x6fc3ff },
  pino: { sheet: 'recursos4', frames: [2, 3], label: 'Talar el pino', glint: 0xfff4a0 },
  flor_nieve: { sheet: 'recursos4', frames: [4, 5], label: 'Recoger la flor de nieve', glint: 0xe6fbff },
  cristal_lago: { sheet: 'recursos4', frames: [6, 7], label: 'Recoger el cristal del lago', glint: 0xa8e4ff },
  restos_montana: { sheet: 'recursos2', frames: [8, 9], label: 'Registrar los restos', glint: 0xffd84a },
  cofre_montana: { sheet: 'recursos', frames: [4, 5], label: 'Abrir el cofre', glint: 0xffd84a },
  // Volcán Rojo (art/sprites/mundo/crear_recursos5.lua)
  veta_obsidiana: { sheet: 'recursos5', frames: [0, 1], label: 'Picar la veta de obsidiana', glint: 0xb8a8ff },
  fumarola: { sheet: 'recursos5', frames: [2, 3], label: 'Raspar el azufre de la fumarola', glint: 0xf4e868 },
  flor_ceniza: { sheet: 'recursos5', frames: [4, 5], label: 'Recoger la flor de ceniza', glint: 0xffb060 },
  nido_salamandra: { sheet: 'recursos5', frames: [6, 7], label: 'Revisar el nido de salamandra', glint: 0xf8b070 },
  geoda_ardiente: { sheet: 'recursos5', frames: [8, 9], label: 'Partir la geoda ardiente', glint: 0xff8a20 },
  restos_volcan: { sheet: 'recursos2', frames: [8, 9], label: 'Registrar los restos', glint: 0xffd84a },
  cofre_volcan: { sheet: 'recursos', frames: [4, 5], label: 'Abrir el cofre', glint: 0xffd84a },
  // Costas Muertas (art/sprites/mundo/crear_recursos6.lua)
  veta_coral: { sheet: 'recursos6', frames: [0, 1], label: 'Picar la veta de coral', glint: 0xf2aaa2 },
  alga_salina: { sheet: 'recursos6', frames: [2, 3], label: 'Recoger las algas', glint: 0x8ad8a0 },
  ostras: { sheet: 'recursos6', frames: [4, 5], label: 'Sacar las ostras', glint: 0xf4eef6 },
  restos_naufragio: { sheet: 'recursos6', frames: [6, 7], label: 'Registrar los restos del naufragio', glint: 0xffd84a },
  poza_marea: { sheet: 'recursos6', frames: [8, 9], label: 'Revisar la poza de marea', glint: 0xb2eedf },
  concha_gigante: { sheet: 'recursos6', frames: [10, 11], label: 'Abrir la concha gigante', glint: 0xf8f4f0 },
  cofre_costas: { sheet: 'recursos', frames: [4, 5], label: 'Abrir el cofre', glint: 0xffd84a },
  // Tundra Eterna (art/sprites/mundo/crear_recursos7.lua)
  veta_hielo: { sheet: 'recursos7', frames: [0, 1], label: 'Picar la veta de hielo eterno', glint: 0xa8dcf0 },
  flor_escarcha: { sheet: 'recursos7', frames: [2, 3], label: 'Recoger la flor de escarcha', glint: 0xe4f8ff },
  pino_blanco: { sheet: 'recursos7', frames: [4, 5], label: 'Talar el pino blanco', glint: 0xd4e4f0 },
  agujero_pesca: { sheet: 'recursos7', frames: [6, 7], label: 'Pescar en el agujero del hielo', glint: 0x8ad0f0 },
  menhir_runas: { sheet: 'recursos7', frames: [8, 9], label: 'Desprender una runa del menhir', glint: 0x7af0f8 },
  restos_trineo: { sheet: 'recursos7', frames: [10, 11], label: 'Registrar el trineo abandonado', glint: 0xffd84a },
  cofre_tundra: { sheet: 'recursos', frames: [4, 5], label: 'Abrir el cofre', glint: 0xffd84a },
  // Catacumbas del Abismo (art/sprites/mundo/crear_recursos8.lua)
  pila_huesos: { sheet: 'recursos8', frames: [0, 1], label: 'Revolver la pila de huesos', glint: 0xece4cc },
  setas_palidas: { sheet: 'recursos8', frames: [2, 3], label: 'Recoger las setas pálidas', glint: 0xa4f4dc },
  veta_plata: { sheet: 'recursos8', frames: [4, 5], label: 'Picar la veta de plata sepulcral', glint: 0xe4e8f2 },
  candelabro_olvidado: { sheet: 'recursos8', frames: [6, 7], label: 'Juntar la cera del candelabro', glint: 0xfff4c0 },
  pozo_almas: { sheet: 'recursos8', frames: [8, 9], label: 'Llenar un frasco en el pozo de almas', glint: 0xc0f6ff },
  sarcofago_tesoro: { sheet: 'recursos8', frames: [10, 11], label: 'Registrar el sarcófago', glint: 0xffd84a },
  // Ruinas Ancestrales (art/sprites/mundo/crear_recursos9.lua)
  bloque_marmol: { sheet: 'recursos9', frames: [0, 1], label: 'Cortar el bloque de mármol', glint: 0xf4f0e6 },
  veta_oro_primordial: { sheet: 'recursos9', frames: [2, 3], label: 'Picar la veta de oro primordial', glint: 0xffe08a },
  flores_luminosas: { sheet: 'recursos9', frames: [4, 5], label: 'Recoger las flores luminosas', glint: 0xa6e2f4 },
  fuente_lagrimas: { sheet: 'recursos9', frames: [6, 7], label: 'Llenar un frasco en la fuente de lágrimas', glint: 0xe0f8ff },
  crater_estrella: { sheet: 'recursos9', frames: [8, 9], label: 'Juntar el polvo del cráter', glint: 0xfff8c0 },
  relicario_templo: { sheet: 'recursos9', frames: [10, 11], label: 'Abrir el relicario del templo', glint: 0xffd84a },
};
// mascotas.png: 2 frames por especie, en este orden
export const PET_SPECIES = ['lobo', 'ave', 'limo', 'gato', 'dragon', 'zorro', 'tortuga', 'arana'];
export const BASE_CLASSES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
export const BUTTERFLY_TINTS = [0xffe680, 0xffffff, 0xff9ad0, 0x9ad0ff, 0xffb05a];

// Ciclo de día: 1 minuto real = 1 hora del juego. Color multiplicado sobre el mapa por hora.
export const MINUTES_PER_DAY = 24;
export const SKY = [
  [0, 0x5a64a8], [4, 0x5a64a8], [6, 0xe0a890], [8, 0xffffff], [17, 0xffffff],
  [19, 0xe89a78], [21, 0x6670b0], [24, 0x5a64a8],
];
export const lerpColor = (a, b, t) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    Math.round(ca.red + (cb.red - ca.red) * t),
    Math.round(ca.green + (cb.green - ca.green) * t),
    Math.round(ca.blue + (cb.blue - ca.blue) * t),
  );
};
export const mulColor = (a, b) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor((ca.red * cb.red) / 255, (ca.green * cb.green) / 255, (ca.blue * cb.blue) / 255);
};
export const gameHour = () => ((Date.now() / 60000) % MINUTES_PER_DAY) * (24 / MINUTES_PER_DAY);
export const propOf = (o, name) => o.properties?.find((p) => p.name === name)?.value;
