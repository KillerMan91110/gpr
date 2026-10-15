// Ícono de cada ítem para la mochila y la ficha del personaje. La base no guarda un ícono por
// ítem, así que se elige por palabras del nombre (y por slot/tipo como respaldo). Primera regla
// que coincide gana: van de lo más específico a lo más general. El equipo de las clases base
// además trae su pixel art (game/gear.js).
import { gearArt, objetoArt } from '../../game/gear';

const I = (name, artist) => ({ name, artist });

const RULES = [
  // objetos de misión de la Pradera (van primero: "collar de cristal" no es un collar de equipo)
  [/carta/, I('love-letter', 'delapouite')],
  [/engranaje/, I('gears', 'lorc')],
  [/mapa/, I('treasure-map', 'lorc')],
  [/saco de/, I('swap-bag', 'lorc')],
  [/palo de/, I('wood-stick', 'delapouite')],
  [/hacha de/, I('wood-axe', 'lorc')],
  [/muneca de trapo/, I('voodoo-doll', 'lorc')],
  [/unguento/, I('bottle-vapors', 'lorc')],
  [/fragmento de sello/, I('crystal-eye', 'lorc')],
  [/collar de cristal|cristal enterrado|cristal del capitan/, I('crystal-cluster', 'lorc')],
  // armas
  [/arco/, I('bow-arrow', 'delapouite')],
  [/baculo sagrado|cetro|sagrad/, I('holy-symbol', 'lorc')],
  [/baculo|vara|varita/, I('wizard-staff', 'lorc')],
  [/daga|punal/, I('plain-dagger', 'lorc')],
  [/espada|hoja|sable/, I('broadsword', 'lorc')],
  // mano secundaria
  [/escudo/, I('round-shield', 'willdabeast')],
  [/tomo|grimorio|libro/, I('spell-book', 'delapouite')],
  // armadura
  [/capucha|capirote|sombrero/, I('hood', 'lorc')],
  [/casco|yelmo/, I('visored-helm', 'lorc')],
  [/tunica|tunica|toga|manto/, I('robe', 'lorc')],
  [/capa/, I('cloak', 'lucasms')],
  [/coraza|peto|armadura/, I('breastplate', 'lorc')],
  [/guantelete/, I('gauntlet', 'delapouite')],
  [/guante/, I('gloves', 'delapouite')],
  [/bota/, I('leather-boot', 'lorc')],
  [/anillo/, I('diamond-ring', 'delapouite')],
  [/amuleto|collar/, I('emerald-necklace', 'delapouite')],
  [/brazalete/, I('ring', 'delapouite')],
  // consumibles
  [/pocion de vida|vida/, I('health-potion', 'delapouite')],
  [/mana/, I('potion-ball', 'lorc')],
  [/huevo/, I('egg-clutch', 'lorc')],
  [/muneco/, I('matryoshka-dolls', 'delapouite')],
  [/pergamino|receta/, I('scroll-unfurled', 'lorc')],
  [/piedra de encantamiento|runa/, I('rune-stone', 'lorc')],
  [/cristal/, I('crystal-growth', 'lorc')],
  // materiales
  [/piel|cuero/, I('animal-hide', 'delapouite')],
  [/lingote/, I('metal-bar', 'lorc')],
  [/mineral/, I('ore', 'faithtoken')],
  [/carbon/, I('coal-wagon', 'delapouite')],
  [/polvo/, I('sparkles', 'delapouite')],
  [/gema|diamante|zafiro|rubi/, I('cut-diamond', 'lorc')],
  [/agua/, I('water-flask', 'delapouite')],
  [/esencia|aceite/, I('fizzing-flask', 'lorc')],
  [/sal\b|sal de/, I('salt-shaker', 'lorc')],
  [/hierba|hongo|seta/, I('mushroom', 'lorc')],
  [/oreja|goblin/, I('goblin-head', 'delapouite')],
  [/colmillo|hueso|diente/, I('bone-knife', 'delapouite')],
  [/cuerno|garra/, I('claw', 'sbed')],
  [/telarana|seda/, I('spider-web', 'lorc')],
  [/rata/, I('rat', 'delapouite')],
  [/lobo/, I('wolf-head', 'lorc')],
  [/tela|hilo/, I('rolled-cloth', 'delapouite')],
  [/madera|tronco/, I('log', 'delapouite')],
  [/carne/, I('meat', 'lorc')],
  [/piedra|roca/, I('stone-pile', 'delapouite')],
];

const BY_SLOT = {
  WEAPON: I('pointy-sword', 'lorc'),
  OFFHAND: I('shield', 'sbed'),
  HELMET: I('visored-helm', 'lorc'),
  ARMOR: I('breastplate', 'lorc'),
  GLOVES: I('gloves', 'delapouite'),
  BOOTS: I('leather-boot', 'lorc'),
  ACCESSORY: I('ring', 'delapouite'),
};
const BY_TYPE = {
  CONSUMABLE: I('standing-potion', 'lorc'),
  MATERIAL: I('wood-pile', 'delapouite'),
};

const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Devuelve { name, artist } de game-icons y, si es equipo de una clase base, también `art`
// ({ shape, set }, el pixel art propio: lo dibuja components/world/ItemIcon.js). Pasa el ítem
// entero cuando puedas: con el código y la clase el arte sale exacto.
export function iconForItem(item) {
  const { name, slot, item_type: itemType } = item ?? {};
  const n = normalize(name);
  let icon = null;
  for (const [re, ic] of RULES) if (re.test(n)) { icon = ic; break; }
  icon = icon || BY_SLOT[slot] || BY_TYPE[itemType] || I('swap-bag', 'lorc');
  const art = gearArt(item);
  if (art) return { ...icon, art };
  // pociones, comidas que curan y accesorios con pixel art propio
  const objeto = objetoArt(item);
  return objeto != null ? { ...icon, objeto } : icon;
}

// Ícono "vacío" de cada casilla de equipo (silueta tenue, como en WoW)
export const SLOT_PLACEHOLDER = BY_SLOT;

export const SLOT_LABELS = {
  WEAPON: 'Arma', OFFHAND: 'Mano secundaria', HELMET: 'Casco', ARMOR: 'Armadura',
  GLOVES: 'Guantes', BOOTS: 'Botas', ACCESSORY: 'Accesorio',
};

export const RARITY_LABELS = {
  COMUN: 'Común', POCO_COMUN: 'Poco común', RARO: 'Raro', EPICO: 'Épico', LEGENDARIO: 'Legendario', UNICO: 'Único',
};

export const TYPE_LABELS = { EQUIPMENT: 'Equipo', CONSUMABLE: 'Consumible', MATERIAL: 'Material' };

export const STAT_LABELS = {
  ATK: 'Ataque', DEF: 'Defensa', MAG: 'Inteligencia', MAGIC_DEF: 'Defensa mágica', SPD: 'Velocidad',
  CRIT_CHANCE: 'Prob. de crítico', CRIT_DAMAGE: 'Daño crítico', EVASION: 'Evasión', HP: 'Vida', LUCK: 'Suerte',
  RESIST_DARK: 'Resistencia a oscuridad',
};
