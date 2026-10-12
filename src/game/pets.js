// Especie (sprite del mapa, ver mascotas.png) de cada mascota según su nombre: la base no
// guarda imagen, así que se elige por palabras como los íconos de los ítems.
const RULES = [
  [/lobo|perrito|tejon|mapache|ciervo/, 'lobo'],
  [/zorro|comadreja|nutria|ardilla|conejo|raton/, 'zorro'],
  [/gato|imp/, 'gato'],
  [/dragon|salamandra|fenix/, 'dragon'],
  [/buho|lechuza|paloma|colibri|halcon|ave|polilla|grillo|escarabajo/, 'ave'],
  [/tortug|cangrejo|golem/, 'tortuga'],
  [/arana|camaleon|serpiente/, 'arana'],
];
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function speciesOf(name) {
  const n = norm(name);
  return RULES.find(([re]) => re.test(n))?.[1] ?? 'limo';
}
