// Arte del equipo de las 5 clases base (art/sprites/v2/crear_equipo.lua): cada pieza tiene una
// FORMA (espada, hacha, arco, escudo, yelmo, túnica…) y un SET de colores (Pradera, Volcán,
// Océano, Lich…). Lo usan los íconos de la mochila (components/world/ItemIcon.js) y el combate
// (BattleScene: el arma, la mano secundaria y el color de la armadura que llevas puestos).
//
// La base no guarda forma ni set: se deducen del código del ítem (GUERRERO_WEAPON_VOLCAN…) o, si
// no viene, del nombre ("Espada del Volcán").
export const GEAR_ASSETS = `${process.env.PUBLIC_URL}/assets/sprites/equipo`;

export const SHAPES = ['espada', 'gran_espada', 'hacha', 'espada_runica', 'daga', 'arco', 'ballesta', 'baculo_arcano', 'varita', 'baculo_sagrado',
  'escudo', 'carcaj', 'orbe', 'cristal', 'daga_gemela', 'simbolo',
  'yelmo', 'capucha', 'capirote', 'mascara', 'diadema',
  'placas', 'gaban', 'tunica', 'cuero', 'vestidura',
  'guanteletes', 'guantes', 'guantes_tela', 'guantes_bendecidos',
  'botas_pesadas', 'botas', 'sandalias',
  // accesorios (de cualquier clase): una forma por tipo, pintada con el set
  'amuleto', 'collar', 'anillo', 'brazalete', 'colgante', 'medallon', 'relicario'];
export const SETS = ['hierro', 'acero', 'pradera', 'montana', 'capitan', 'titan', 'acantilado', 'volcan', 'rey_montana', 'caldera', 'titan_fuego',
  'costas', 'oceano', 'profundidades', 'tundra', 'rey_hielo', 'catacumbas', 'lich', 'ancestral', 'arcano', 'sagrado', 'vigia', 'escarcha', 'hierro_negro',
  'obsidiana', 'forja_negra', 'coral', 'abismo', 'glaciar', 'reina', 'guardian', 'sepulcral', 'trono', 'centinela',
  'estelar', 'observatorio', 'cosmico', 'vigia_primero', 'lagrima'];
// formas que tienen hoja de combate (arma en la mano o pieza en la mano de atrás)
export const COMBAT_WEAPONS = ['espada', 'gran_espada', 'espada_runica', 'hacha', 'daga', 'arco', 'ballesta', 'baculo_arcano', 'varita', 'baculo_sagrado'];
export const COMBAT_OFFHANDS = ['escudo', 'carcaj', 'orbe', 'cristal', 'daga_gemela', 'simbolo'];

const BASE_BY_ID = { 1: 'guerrero', 2: 'mago', 3: 'arquero', 4: 'picaro', 5: 'sacerdote' };
const BASE_CODES = ['guerrero', 'mago', 'arquero', 'picaro', 'sacerdote'];
// pieza de cada clase según el hueco (cabeza, torso, manos, pies)
const BY_CLASS = {
  guerrero: { HELMET: 'yelmo', ARMOR: 'placas', GLOVES: 'guanteletes', BOOTS: 'botas_pesadas', OFFHAND: 'escudo' },
  arquero: { HELMET: 'capucha', ARMOR: 'gaban', GLOVES: 'guantes', BOOTS: 'botas', OFFHAND: 'carcaj' },
  mago: { HELMET: 'capirote', ARMOR: 'tunica', GLOVES: 'guantes_tela', BOOTS: 'sandalias', OFFHAND: 'orbe' },
  picaro: { HELMET: 'mascara', ARMOR: 'cuero', GLOVES: 'guantes', BOOTS: 'botas', OFFHAND: 'daga_gemela' },
  sacerdote: { HELMET: 'diadema', ARMOR: 'vestidura', GLOVES: 'guantes_bendecidos', BOOTS: 'sandalias', OFFHAND: 'simbolo' },
};
// set por código (los sets de zona tienen sufijo fijo) y, si no, por el nombre
const SET_BY_CODE = [
  [/_VIGIA$|_VIGIA_CAIDO$/, 'vigia'], // set de la Guardia y armas del Vigía Caído (Pradera)
  [/_ESCARCHA$/, 'escarcha'], // set de la Escarcha (Montañas Grises, nv 21)
  [/_HIERRO_NEGRO$/, 'hierro_negro'], // armas de Hierro Negro (Mina Profunda, nv 22)
  [/_OBSIDIANA$/, 'obsidiana'], // tier medio del Volcán (nv 36)
  [/_FORJA_NEGRA$/, 'forja_negra'], // armas de la Fisura Infernal (nv 37)
  [/_CORAL$/, 'coral'], // tier medio de las Costas (nv 51)
  [/_ABISMO$/, 'abismo'], // armas del Arrecife Hundido (nv 52)
  [/_GLACIAR$/, 'glaciar'], // tier medio de la Tundra (nv 66)
  [/_REINA$/, 'reina'], // armas de la Cripta Congelada (nv 67)
  [/_GUARDIAN(_MAGO)?$/, 'guardian'], // set del Guardián del Hielo (nv 70)
  [/_SEPULCRAL$/, 'sepulcral'], // tier medio de las Catacumbas (nv 81)
  [/_TRONO$/, 'trono'], // armas del Trono de Huesos (nv 82)
  [/_CENTINELA(_MAGO)?$/, 'centinela'], // set del Centinela de la Muerte (nv 84)
  [/_ESTELAR$/, 'estelar'], // tier medio de las Ruinas (nv 91)
  [/_OBSERVATORIO$/, 'observatorio'], // armas del Observatorio Roto (nv 93)
  [/_COSMICO(_MAGO)?$/, 'cosmico'], // set del Centinela Cósmico (nv 97)
  [/_VIGIA_PRIMERO(_MAGO)?$/, 'vigia_primero'], // set del Primer Vigía (nv 100)
  [/_WEAPON_LAGRIMA$/, 'lagrima'], // la Lágrima de Aethra, el arma del final (nv 100)
  [/TITAN_F\b|TITAN_F$/, 'titan_fuego'], [/TITAN_P\b|TITAN_P$/, 'titan'], [/REY_MONT/, 'rey_montana'], [/REY_HIELO/, 'rey_hielo'],
  [/PRADERA/, 'pradera'], [/MONTANAS/, 'montana'], [/CAPITAN/, 'capitan'], [/ACANT/, 'acantilado'], [/VOLCAN/, 'volcan'],
  [/CALDERA/, 'caldera'], [/COSTAS/, 'costas'], [/OCEANO/, 'oceano'], [/PROFU/, 'profundidades'], [/TUNDRA/, 'tundra'],
  [/CATACUMBAS/, 'catacumbas'], [/LICH/, 'lich'], [/RUINAS/, 'ancestral'], [/MAGICA|ESPADA_MAGICA/, 'arcano'],
];
const SET_BY_NAME = [
  [/antiguos/, 'ancestral'], [/nyssara/, 'arcano'], // accesorios sueltos
  [/obsidiana/, 'obsidiana'], [/forja negra/, 'forja_negra'], [/coral/, 'coral'], [/abismo/, 'abismo'], [/glaciar/, 'glaciar'], [/de la reina/, 'reina'], [/guardian/, 'guardian'], [/marea/, 'costas'], [/almirante/, 'oceano'],
  [/titan de fuego/, 'titan_fuego'], [/rey de las montanas/, 'rey_montana'], [/rey del hielo/, 'rey_hielo'], [/titan/, 'titan'],
  [/pradera|lobo|lenador/, 'pradera'], [/montana|troll/, 'montana'], [/capitan/, 'capitan'], [/acantilado/, 'acantilado'],
  [/volcan|dragon/, 'volcan'], [/caldera/, 'caldera'], [/costas|\bmar\b/, 'costas'], [/oceano/, 'oceano'], [/profundidades/, 'profundidades'],
  [/tundra|hielo/, 'tundra'], [/catacumbas|maldit/, 'catacumbas'], [/lich|eternidad/, 'lich'], [/ancestral|orion|dioses|primordial|supremo/, 'ancestral'],
  [/runic|arcan|hechicer|mana|archimago|runas|saber|encantad|magic/, 'arcano'], [/excalibur|sagrad|curacion|sanacion|resurreccion|cielo|bendit/, 'sagrado'],
  [/sangr|verdugo|furia/, 'capitan'], [/caos|demoled|sombra/, 'lich'],
  [/acero|precision|templad|reforzad/, 'acero'], [/hierro|madera|aprendiz|cuero/, 'hierro'],
];
const SET_BY_RARITY = { COMUN: 'hierro', POCO_COMUN: 'acero', RARO: 'costas', EPICO: 'arcano', LEGENDARIO: 'ancestral', UNICO: 'titan' };

const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function classOf(item) {
  const code = String(item.code ?? item.item_code ?? item.itemCode ?? '');
  const prefix = BASE_CODES.find((c) => code.startsWith(`${c.toUpperCase()}_`));
  if (prefix) return prefix;
  if (item.class_id != null || item.classId != null) return BASE_BY_ID[item.class_id ?? item.classId] ?? 'otra';
  return item.cls ?? null;
}

function shapeOf(n, slot, cls) {
  if (slot === 'WEAPON') {
    if (/ballesta/.test(n)) return 'ballesta';
    if (/arco/.test(n)) return 'arco';
    if (/hacha/.test(n)) return 'hacha';
    if (/varita/.test(n)) return 'varita';
    if (/baculo|vara/.test(n)) return cls === 'sacerdote' || /sagrad|curacion|sanacion|resurreccion|cielo/.test(n) ? 'baculo_sagrado' : 'baculo_arcano';
    if (/daga|punal/.test(n)) return 'daga';
    if (/gran espada/.test(n)) return 'gran_espada';
    if (/runic|arcan|hechicer|mana|archimago|runas|saber|encantad/.test(n)) return 'espada_runica';
    if (/espada|excalibur|hoja|sable/.test(n)) return 'espada';
    return null;
  }
  if (slot === 'OFFHAND') {
    if (/escudo/.test(n)) return 'escudo';
    if (/carcaj/.test(n)) return 'carcaj';
    if (/orbe/.test(n)) return 'orbe';
    if (/cristal/.test(n)) return 'cristal';
    if (/daga gemela/.test(n)) return 'daga_gemela';
    if (/simbolo/.test(n)) return 'simbolo';
    if (slot === 'OFFHAND') return BY_CLASS[cls]?.OFFHAND ?? null;
  }
  if (slot === 'HELMET') {
    if (/yelmo|casco/.test(n)) return 'yelmo';
    if (/capucha/.test(n)) return 'capucha';
    if (/capirote|sombrero/.test(n)) return 'capirote';
    if (/mascara/.test(n)) return 'mascara';
    if (/diadema|tiara|corona/.test(n)) return 'diadema';
    if (slot === 'HELMET') return BY_CLASS[cls]?.HELMET ?? null;
  }
  if (slot === 'ARMOR') {
    if (/gaban/.test(n)) return 'gaban';
    if (/tunica|toga/.test(n)) return 'tunica';
    if (/vestidura/.test(n)) return 'vestidura';
    if (/^cuero|peto de cuero/.test(n)) return 'cuero';
    if (/armadura|coraza|peto/.test(n)) return 'placas';
    if (slot === 'ARMOR') return BY_CLASS[cls]?.ARMOR ?? null;
  }
  if (slot === 'GLOVES') {
    if (/guantelete/.test(n)) return 'guanteletes';
    if (/guantes bendecidos/.test(n)) return 'guantes_bendecidos';
    if (/guantes de tela/.test(n)) return 'guantes_tela';
    if (slot === 'GLOVES') return BY_CLASS[cls]?.GLOVES ?? 'guantes';
  }
  if (slot === 'BOOTS') {
    if (/sandalia/.test(n)) return 'sandalias';
    if (/botas pesadas/.test(n)) return 'botas_pesadas';
    if (slot === 'BOOTS') return BY_CLASS[cls]?.BOOTS ?? 'botas';
  }
  return null;
}

// la forma de un accesorio por su nombre (los que no dicen qué son, como el Ojo del Mañana, son medallones)
function accessoryShape(n) {
  if (/amuleto/.test(n)) return 'amuleto';
  if (/collar/.test(n)) return 'collar';
  if (/anillo|sortija/.test(n)) return 'anillo';
  if (/brazalete|pulsera/.test(n)) return 'brazalete';
  if (/colgante/.test(n)) return 'colgante';
  if (/relicario/.test(n)) return 'relicario';
  return 'medallon';
}

function setOf(item, n) {
  const code = String(item.code ?? item.item_code ?? item.itemCode ?? '');
  for (const [re, set] of SET_BY_CODE) if (re.test(code)) return set;
  for (const [re, set] of SET_BY_NAME) if (re.test(n)) return set;
  // armaduras pesadas del guerrero por nivel (…_PESADA_L1, _L10…)
  const lvl = /_L(\d+)$/.exec(code);
  if (lvl) return Number(lvl[1]) >= 50 ? 'ancestral' : Number(lvl[1]) >= 20 ? 'acero' : 'hierro';
  return SET_BY_RARITY[item.rarity] ?? 'hierro';
}

// { shape, set } o null si la pieza no tiene arte propio (accesorios, otras clases, consumibles…)
export function gearArt(item) {
  if (!item) return null;
  const type = item.item_type ?? item.itemType;
  if (type && type !== 'EQUIPMENT') return null;
  // sin hueco no se sabe si es equipo (un material como «Corona del Rey» no lleva ícono de casco)
  const slot = item.slot ?? item.resultSlot ?? null;
  if (!slot) return null;
  if (slot === 'ACCESSORY') {
    // los que tienen dibujo propio en el atlas de objetos (los de la Pradera, la Herradura de Goreth…) lo conservan
    if (objetoArt(item) != null) return null;
    const n = normalize(item.name ?? item.item_name ?? item.itemName);
    return { shape: accessoryShape(n), set: setOf(item, n) };
  }
  const cls = classOf(item);
  if (cls === 'otra') return null;
  const n = normalize(item.name ?? item.item_name ?? item.itemName);
  const shape = shapeOf(n, slot, cls);
  if (!shape) return null;
  return { shape, set: setOf(item, n) };
}

// posición en el atlas de íconos (32x32; una fila por forma, una columna por set)
export function iconCell(art) {
  const r = SHAPES.indexOf(art.shape);
  const c = Math.max(0, SETS.indexOf(art.set));
  return r < 0 ? null : { x: c * 32, y: r * 32 };
}

// ---------------------------------------------------------------- objetos sin forma de equipo
// Pociones, elixires, comidas que curan y accesorios (art/sprites/combate/crear_objetos.lua):
// atlas de una fila, 32x32, en el orden de OBJETOS. Se reconocen por el nombre.
// Huevos y sobres de cartas por zona (los nombres los arma gprback/lib/huevos.js).
// Van al final del atlas, en este orden: los huevos de siempre, los de cada zona (cinco rarezas) y los sobres.
const ZONAS_OBJ = [['pradera', 'de la pradera'], ['montana', 'de las montanas'], ['volcan', 'del volcan'], ['costas', 'de las costas'],
  ['tundra', 'de la tundra'], ['catacumbas', 'de las catacumbas'], ['ruinas', 'de las ruinas']];
const RAREZAS_OBJ = [['comun', 'comun'], ['poco_comun', 'poco comun'], ['raro', 'raro'], ['epico', 'epico'], ['legendario', 'legendario']];
const HUEVOS = [null, ...ZONAS_OBJ].flatMap((z) => RAREZAS_OBJ.map(([r, rn]) => (z
  ? [`huevo_${z[0]}_${r}`, `huevo ${rn} ${z[1]}`]
  : [`huevo_${r}`, `huevo ${rn}`])));
const SOBRES = ZONAS_OBJ.map(([z, de]) => [`sobre_${z}`, `sobre de cartas ${de}`]);
export const OBJETOS = ['pocion_vida_menor', 'pocion_vida_mayor', 'pocion_mana_menor', 'pocion_mana_mayor',
  'elixir_regeneracion', 'esencia_restauradora', 'estofado_lobo', 'sopa_goblin', 'guiso_troll',
  'amuleto_pradera', 'collar_pradera', 'brazalete_pradera', 'anillo_pradera', 'amuleto_capitan', 'anillo_fuerza', 'amuleto_brujo',
  'frasco_vacio', 'agua_purificada', 'lingote_hierro', 'tabla_roble', 'cuero_tratado', 'antidoto', 'tonico_miel', 'vendaje',
  'amuleto_colmillos', 'fibra_lino', 'tela_lino', 'cuarzo_rio', 'trigo', 'harina', 'pan_campo', 'llave_vigia',
  'carne_jabali', 'glandula_sapo', 'medalla_vigia', 'runa_menhir', 'fragmento_eclipse', 'asado_jabali', 'elixir_lago',
  'emblema_guardia', 'amuleto_runico', 'amuleto_alba',
  'collar_cristal_negro', 'saco_cristales', 'cristal_enterrado', 'engranaje_molino', 'unguento_raiz', 'carta_eclipse',
  'mapa_chaman', 'cristal_capitan', 'fragmento_sello', 'palo_roble', 'carta_ren', 'carta_marta', 'hacha_brenna', 'muneca_trapo', 'ojo_vigia',
  // materiales de los monstruos de las Montañas Grises
  'cuerno_cabra', 'colmillo_orco', 'piel_lobo_nieve', 'pico_corrompido', 'membrana_murcielago', 'fragmento_piedra_viva',
  'esencia_helada', 'garra_oso', 'escama_sierpe', 'piel_troll', 'pluma_arpia', 'nucleo_tormenta', 'cristal_gigante', 'vara_brujo',
  'madera_pino', 'flor_nieve', 'acero_refinado',
  'carne_cabra', 'lomo_oso', 'asado_cabra', 'te_flor_nieve', 'caldo_oso', 'elixir_tormenta', 'insignia_guardia_real',
  // la Mina Profunda y los objetos de misión de la historia de las Montañas
  'mena_hierro_negro', 'corazon_hierro_negro', 'llave_mina', 'carta_elenya', 'hacha_orco', 'cristal_veta', 'esquirla_sello',
  'nota_brujo', 'corazon_tormenta', 'fragmento_sello_montanas', 'anillo_durgan', 'olla_hilda', 'cuerno_astrid', 'carta_rey',
  // Volcán Rojo: materiales de sus monstruos y recursos, y sus comidas
  'escama_salamandra', 'pelaje_ceniza', 'caparazon_azufre', 'brasa_bandido', 'esencia_fuego', 'colmillo_magma', 'esquirla_obsidiana',
  'nucleo_infernal', 'ala_draco', 'sello_eclipse', 'cuerno_demonio_lava', 'cola_diablillo', 'corazon_brasa', 'escama_dragon_corrupto',
  'cristal_lava', 'corazon_caldera', 'nucleo_titan_fuego', 'azufre', 'obsidiana_bruta', 'flor_ceniza', 'piedra_pomez', 'gema_fuego',
  'escoria_negra', 'corazon_forja_negra', 'carne_salamandra', 'aceite_cocina',
  'asado_salamandra', 'te_flor_ceniza', 'chile_azufre', 'estofado_draco', 'elixir_magma',
  // Costas Muertas
  'caparazon_cangrejo', 'pluma_salada', 'parche_pirata', 'caparazon_hervido', 'diente_pirana', 'cuero_cocodrilo', 'gel_medusa',
  'escama_sirena', 'fragmento_coral', 'cadena_ahogada', 'sello_marea', 'tinta_abisal', 'colmillo_leviatan', 'perla_marina',
  'carta_velanegra', 'ancla_almirante', 'corazon_abisal', 'alga_salina', 'coral_rojo', 'carne_ostra', 'madera_naufragio',
  'cuerda_alquitran', 'estrella_mar', 'sal_marina', 'arena_abisal', 'perla_abismo', 'carne_cocodrilo',
  'sopa_cangrejo', 'ostras_brasa', 'te_alga', 'ceviche_ostras', 'guiso_cocodrilo', 'elixir_marea', 'brocheta_calamar',
  // Tundra Eterna
  'grasa_foca', 'colmillo_jabali_helado', 'piel_lobo_hielo', 'pluma_nivea', 'esencia_congelada', 'nucleo_escarcha', 'trampa_cazador',
  'zarpa_oso_blanco', 'puno_gigante_nieve', 'sello_eclipse_helado', 'placa_escarcha', 'escama_glacial', 'colmillo_mamut',
  'pelaje_aurora', 'flor_escarcha', 'hielo_eterno', 'madera_pino_blanco', 'pescado_glacial', 'runa_nortena', 'nucleo_guardian',
  'corona_rey_hielo', 'gema_helada', 'hielo_eterno_puro', 'lagrima_reina', 'baculo_roto_bruja', 'carne_mamut',
  'pescado_brasa', 'pan_grasa_foca', 'te_flor_escarcha', 'sopa_raices', 'hidromiel_caliente', 'elixir_aurora', 'estofado_mamut',
  'sopa_jabali',
  // Catacumbas del Abismo
  'cola_rata_osario', 'ala_murcielago_vampiro', 'espada_rota_esqueleto', 'carne_putrefacta_ancestral', 'seda_tumba', 'esporas_palidas',
  'cadena_espectral', 'garra_gul', 'hueso_reanimado', 'lamento_cristalizado', 'reliquia_maldita', 'sello_eclipse_negro',
  'diente_gusano', 'yelmo_vacio', 'nucleo_centinela', 'hueso_antiguo', 'seta_palida', 'plata_sepulcral',
  'plata_sepulcral_pura', 'cera_eterna', 'esencia_de_alma', 'fragmento_del_abismo', 'grimorio_corrupto', 'corazon_lich_ancestral',
  'corona_huesos', 'carne_gusano', 'pescado_ciego', 'sopa_setas_palidas', 'pan_ofrenda', 'pescado_ciego_asado',
  'te_cera_eterna', 'guiso_sepulturero', 'vino_velados', 'caldo_hueso_antiguo',
  // la oscuridad de las Catacumbas
  'vela_sebo',
  // Ruinas Ancestrales
  'polvo_marmol', 'pluma_grifo', 'escama_lagrima', 'trompeta_rota', 'carne_estelar', 'iris_vacio', 'corazon_marmol',
  'corona_eclipsada', 'nucleo_cosmico', 'nucleo_antiguo', 'piedra_runica', 'esencia_ancestral_fuego', 'esencia_ancestral_agua',
  'esencia_ancestral_hielo', 'nucleo_primordial', 'fragmento_templo_corrupto', 'alma_gran_esqueleto', 'polvo_de_estrellas',
  'fragmento_de_luz', 'oro_primordial', 'hierro_primordial', 'flor_luminosa', 'marmol_sagrado', 'lagrima_aethra',
  'bronce_celeste', 'fragmento_lente', 'carne_grifo', 'pescado_lago', 'miel_abeja_antigua', 'pan_peregrino',
  'sopa_flor_luminosa', 'agua_lagrimas', 'pescado_lago_asado', 'miel_lagrimas', 'nectar_estelar', 'guiso_vigias',
  // el final
  'lagrima_cristalizada', 'fragmento_sello_ruinas',
  // los huevos (los de siempre y los de cada zona, en las cinco rarezas) y los sobres de cartas de cada zona
  ...HUEVOS.map(([k]) => k), ...SOBRES.map(([k]) => k),
  // el regalo de Goreth (la cerca de la Pradera)
  'herradura_goreth',
  // los símbolos de las evoluciones (gprback/docs/evoluciones_pruebas.md)
  'caliz_de_la_furia', 'coraza_titan_piedra', 'piedra_filosofal', 'perla_estrellas', 'rama_robleviejo', 'arco_de_los_antiguos', 'cuerno_tormenta', 'caliz_de_coral', 'cadena_del_trono', 'ala_del_templo', 'escama_sierpe', 'corazon_eclipse', 'rosario_primer_vigia', 'corona_flores_luminosas', 'nucleo_estelar', 'libro_cuentas_pirata'];
const OBJETO_BY_NAME = {
  'pocion de vida menor': 'pocion_vida_menor', 'pocion de vida mayor': 'pocion_vida_mayor',
  'pocion de mana menor': 'pocion_mana_menor', 'pocion de mana mayor': 'pocion_mana_mayor',
  'elixir de regeneracion': 'elixir_regeneracion', 'esencia restauradora': 'esencia_restauradora',
  'estofado de lobo': 'estofado_lobo', 'sopa de goblin': 'sopa_goblin', 'guiso de troll': 'guiso_troll',
  'amuleto de pradera': 'amuleto_pradera', 'collar de pradera': 'collar_pradera', 'brazalete de pradera': 'brazalete_pradera',
  'anillo de pradera': 'anillo_pradera', 'amuleto del capitan': 'amuleto_capitan', 'anillo de fuerza menor': 'anillo_fuerza',
  'amuleto del brujo': 'amuleto_brujo',
  'frasco vacio': 'frasco_vacio', 'agua purificada': 'agua_purificada', 'lingote de hierro': 'lingote_hierro',
  'tabla de roble': 'tabla_roble', 'cuero tratado': 'cuero_tratado', antidoto: 'antidoto', 'tonico de miel': 'tonico_miel',
  vendaje: 'vendaje', 'amuleto de colmillos': 'amuleto_colmillos',
  'fibra de lino': 'fibra_lino', 'tela de lino': 'tela_lino', 'cuarzo de rio': 'cuarzo_rio', trigo: 'trigo', harina: 'harina',
  'pan de campo': 'pan_campo', 'llave del vigia': 'llave_vigia',
  'carne de jabali': 'carne_jabali', 'glandula de sapo': 'glandula_sapo', 'medalla del vigia': 'medalla_vigia',
  'runa de menhir': 'runa_menhir', 'fragmento de eclipse': 'fragmento_eclipse', 'asado de jabali': 'asado_jabali',
  'elixir del lago': 'elixir_lago', 'emblema de la guardia': 'emblema_guardia', 'amuleto runico': 'amuleto_runico',
  'amuleto del alba': 'amuleto_alba',
  // objetos de misión de la Pradera
  'collar de cristal negro': 'collar_cristal_negro', 'saco de cristales negros': 'saco_cristales',
  'cristal enterrado': 'cristal_enterrado', 'engranaje del molino': 'engranaje_molino', 'unguento de raiz': 'unguento_raiz',
  'carta con un eclipse': 'carta_eclipse', 'mapa del chaman': 'mapa_chaman', 'cristal del capitan': 'cristal_capitan',
  'primer fragmento de sello': 'fragmento_sello', 'palo de roble': 'palo_roble', 'carta de ren': 'carta_ren',
  'carta de marta': 'carta_marta', 'hacha de brenna': 'hacha_brenna', 'muneca de trapo': 'muneca_trapo', 'ojo del vigia': 'ojo_vigia',
  // materiales de los monstruos de las Montañas Grises
  'cuerno de cabra montes': 'cuerno_cabra', 'colmillo de orco': 'colmillo_orco', 'piel de lobo de las nieves': 'piel_lobo_nieve',
  'pico corrompido': 'pico_corrompido', 'membrana de murcielago': 'membrana_murcielago', 'fragmento de piedra viva': 'fragmento_piedra_viva',
  'esencia espectral helada': 'esencia_helada', 'garra de oso de las cumbres': 'garra_oso', 'escama de sierpe de hielo': 'escama_sierpe',
  'piel de troll': 'piel_troll', 'pluma de arpia del eco': 'pluma_arpia', 'nucleo de tormenta': 'nucleo_tormenta',
  'cristal de gigante de hielo': 'cristal_gigante', 'vara del brujo de montana': 'vara_brujo',
  'madera de pino nevado': 'madera_pino', 'flor de nieve': 'flor_nieve', 'acero refinado': 'acero_refinado',
  'carne de cabra montes': 'carne_cabra', 'lomo de oso de las cumbres': 'lomo_oso', 'asado de cabra montes': 'asado_cabra',
  'te de flor de nieve': 'te_flor_nieve', 'caldo de oso': 'caldo_oso', 'elixir de tormenta': 'elixir_tormenta',
  'insignia de la guardia real': 'insignia_guardia_real',
  'mena de hierro negro': 'mena_hierro_negro', 'corazon de hierro negro': 'corazon_hierro_negro',
  // objetos de misión de las Montañas
  'llave de la mina profunda': 'llave_mina', 'carta de elenya': 'carta_elenya', 'hacha de orco marcada': 'hacha_orco',
  'cristal de la veta': 'cristal_veta', 'esquirla del segundo sello': 'esquirla_sello', 'nota del brujo': 'nota_brujo',
  'corazon de la tormenta': 'corazon_tormenta', 'segundo fragmento de sello': 'fragmento_sello_montanas',
  'anillo de durgan': 'anillo_durgan', 'olla de hilda': 'olla_hilda',
  'cuerno de astrid': 'cuerno_astrid', 'carta sellada del rey': 'carta_rey',
  // Volcán Rojo
  'escama de salamandra': 'escama_salamandra', 'pelaje de ceniza': 'pelaje_ceniza', 'caparazon de azufre': 'caparazon_azufre',
  'brasa de bandido': 'brasa_bandido', 'esencia de fuego': 'esencia_fuego', 'colmillo de magma': 'colmillo_magma',
  'esquirla de obsidiana': 'esquirla_obsidiana', 'nucleo infernal': 'nucleo_infernal', 'ala de draco': 'ala_draco',
  'sello de eclipse': 'sello_eclipse', 'cuerno de demonio de lava': 'cuerno_demonio_lava', 'cola de diablillo': 'cola_diablillo',
  'corazon de brasa': 'corazon_brasa', 'escama de dragon corrupto': 'escama_dragon_corrupto', 'cristal de lava': 'cristal_lava',
  'corazon de la caldera': 'corazon_caldera', 'nucleo del titan de fuego': 'nucleo_titan_fuego', azufre: 'azufre',
  'obsidiana bruta': 'obsidiana_bruta', 'flor de ceniza': 'flor_ceniza', 'piedra pomez': 'piedra_pomez', 'gema de fuego': 'gema_fuego',
  'escoria negra': 'escoria_negra', 'corazon de la forja negra': 'corazon_forja_negra', 'cola de salamandra': 'carne_salamandra',
  'aceite de cocina': 'aceite_cocina', 'asado de salamandra': 'asado_salamandra', 'te de flor de ceniza': 'te_flor_ceniza',
  'chile de azufre': 'chile_azufre', 'estofado de draco': 'estofado_draco', 'elixir de magma': 'elixir_magma',
  // Costas Muertas
  'caparazon de cangrejo gigante': 'caparazon_cangrejo', 'pluma salada': 'pluma_salada', 'parche de pirata': 'parche_pirata',
  'caparazon hervido': 'caparazon_hervido', 'diente de pirana': 'diente_pirana', 'cuero de cocodrilo': 'cuero_cocodrilo',
  'gel de medusa': 'gel_medusa', 'escama de sirena': 'escama_sirena', 'fragmento de coral vivo': 'fragmento_coral',
  'cadena ahogada': 'cadena_ahogada', 'sello de la marea': 'sello_marea', 'tinta abisal': 'tinta_abisal',
  'colmillo de leviatan': 'colmillo_leviatan', 'perla marina': 'perla_marina', 'carta de velanegra': 'carta_velanegra',
  'ancla del almirante': 'ancla_almirante', 'corazon abisal': 'corazon_abisal', 'alga salina': 'alga_salina', 'coral rojo': 'coral_rojo',
  'carne de ostra': 'carne_ostra', 'madera de naufragio': 'madera_naufragio', 'cuerda con alquitran': 'cuerda_alquitran',
  'estrella de mar': 'estrella_mar', 'sal marina': 'sal_marina', 'arena abisal': 'arena_abisal', 'perla del abismo': 'perla_abismo',
  'carne de cocodrilo': 'carne_cocodrilo', 'sopa de cangrejo': 'sopa_cangrejo', 'ostras a la brasa': 'ostras_brasa',
  'te de alga': 'te_alga', 'ceviche de ostras': 'ceviche_ostras', 'guiso de cocodrilo': 'guiso_cocodrilo',
  'elixir de la marea': 'elixir_marea', 'brocheta de calamar en su tinta': 'brocheta_calamar',
  // Tundra Eterna
  'grasa de foca': 'grasa_foca', 'colmillo de jabali helado': 'colmillo_jabali_helado', 'piel de lobo de hielo': 'piel_lobo_hielo',
  'pluma nivea': 'pluma_nivea', 'esencia congelada': 'esencia_congelada', 'nucleo de escarcha': 'nucleo_escarcha',
  'trampa del cazador del hielo': 'trampa_cazador', 'zarpa de oso blanco': 'zarpa_oso_blanco',
  'puno de gigante de nieve': 'puno_gigante_nieve', 'sello del eclipse helado': 'sello_eclipse_helado',
  'placa de escarcha': 'placa_escarcha', 'escama glacial': 'escama_glacial', 'colmillo de mamut': 'colmillo_mamut',
  'pelaje de aurora': 'pelaje_aurora', 'flor de escarcha': 'flor_escarcha', 'hielo eterno': 'hielo_eterno',
  'madera de pino blanco': 'madera_pino_blanco', 'pescado glacial': 'pescado_glacial', 'runa nortena': 'runa_nortena',
  'nucleo del guardian del hielo': 'nucleo_guardian', 'corona del rey del hielo': 'corona_rey_hielo', 'gema helada': 'gema_helada',
  'hielo eterno puro': 'hielo_eterno_puro', 'lagrima de la reina': 'lagrima_reina',
  'baculo roto de bruja congelada': 'baculo_roto_bruja', 'carne de mamut': 'carne_mamut',
  'pescado glacial a la brasa': 'pescado_brasa', 'pan de centeno con grasa de foca': 'pan_grasa_foca',
  'te de flor de escarcha': 'te_flor_escarcha', 'sopa de raices': 'sopa_raices', 'hidromiel caliente': 'hidromiel_caliente',
  'elixir de la aurora': 'elixir_aurora', 'estofado de mamut': 'estofado_mamut', 'sopa de jabali helado': 'sopa_jabali',
  // Catacumbas del Abismo
  'cola de rata de osario': 'cola_rata_osario', 'ala de murcielago vampiro': 'ala_murcielago_vampiro',
  'espada rota de esqueleto': 'espada_rota_esqueleto', 'carne putrefacta ancestral': 'carne_putrefacta_ancestral',
  'seda de tumba': 'seda_tumba', 'esporas palidas': 'esporas_palidas', 'cadena espectral': 'cadena_espectral',
  'garra de gul': 'garra_gul', 'hueso reanimado': 'hueso_reanimado', 'lamento cristalizado': 'lamento_cristalizado',
  'reliquia maldita': 'reliquia_maldita', 'sello del eclipse negro': 'sello_eclipse_negro',
  'diente de gusano de las criptas': 'diente_gusano', 'yelmo vacio': 'yelmo_vacio', 'nucleo del centinela': 'nucleo_centinela',
  'hueso antiguo': 'hueso_antiguo', 'seta palida': 'seta_palida', 'plata sepulcral': 'plata_sepulcral',
  'plata sepulcral pura': 'plata_sepulcral_pura', 'cera eterna': 'cera_eterna', 'esencia de alma': 'esencia_de_alma',
  'fragmento del abismo': 'fragmento_del_abismo', 'grimorio corrupto': 'grimorio_corrupto',
  'corazon del lich ancestral': 'corazon_lich_ancestral', 'corona de huesos': 'corona_huesos',
  'carne de gusano de las criptas': 'carne_gusano', 'pescado ciego': 'pescado_ciego',
  'sopa de setas palidas': 'sopa_setas_palidas', 'pan de ofrenda': 'pan_ofrenda', 'pescado ciego asado': 'pescado_ciego_asado',
  'te de cera eterna': 'te_cera_eterna', 'guiso del sepulturero': 'guiso_sepulturero', 'vino de los velados': 'vino_velados',
  'caldo de hueso antiguo': 'caldo_hueso_antiguo', 'vela de sebo': 'vela_sebo',
  'polvo de marmol': 'polvo_marmol', 'pluma de grifo': 'pluma_grifo', 'escama de lagrima': 'escama_lagrima',
  'trompeta rota': 'trompeta_rota', 'carne estelar': 'carne_estelar', 'iris del vacio': 'iris_vacio',
  'corazon de marmol': 'corazon_marmol', 'corona eclipsada': 'corona_eclipsada', 'nucleo cosmico': 'nucleo_cosmico',
  'nucleo antiguo': 'nucleo_antiguo', 'piedra runica': 'piedra_runica', 'esencia ancestral de fuego': 'esencia_ancestral_fuego',
  'esencia ancestral de agua': 'esencia_ancestral_agua', 'esencia ancestral de hielo': 'esencia_ancestral_hielo',
  'nucleo primordial': 'nucleo_primordial', 'fragmento del templo corrupto': 'fragmento_templo_corrupto',
  'alma del gran esqueleto del abismo': 'alma_gran_esqueleto', 'polvo de estrellas': 'polvo_de_estrellas',
  'fragmento de luz': 'fragmento_de_luz', 'oro primordial': 'oro_primordial', 'hierro primordial': 'hierro_primordial',
  'flor luminosa': 'flor_luminosa', 'marmol sagrado': 'marmol_sagrado', 'lagrima de aethra': 'lagrima_aethra',
  'bronce celeste': 'bronce_celeste', 'fragmento de lente': 'fragmento_lente', 'carne de grifo': 'carne_grifo',
  'pescado del lago de las lagrimas': 'pescado_lago', 'miel de abeja antigua': 'miel_abeja_antigua',
  'pan de peregrino': 'pan_peregrino', 'sopa de flor luminosa': 'sopa_flor_luminosa', 'agua de lagrimas': 'agua_lagrimas',
  'pescado del lago asado': 'pescado_lago_asado', 'miel de las lagrimas': 'miel_lagrimas', 'nectar estelar': 'nectar_estelar',
  'guiso de los vigias': 'guiso_vigias',
  'lagrima cristalizada': 'lagrima_cristalizada', 'septimo fragmento de sello': 'fragmento_sello_ruinas',
  ...Object.fromEntries([...HUEVOS, ...SOBRES].map(([k, name]) => [name, k])),
  'herradura de goreth': 'herradura_goreth',
  'caliz de la furia': 'caliz_de_la_furia',
  'coraza del titan de piedra': 'coraza_titan_piedra',
  'piedra filosofal': 'piedra_filosofal',
  'perla de las estrellas': 'perla_estrellas',
  'rama de robleviejo': 'rama_robleviejo',
  'arco de los antiguos': 'arco_de_los_antiguos',
  'cuerno de la tormenta': 'cuerno_tormenta',
  'caliz de coral': 'caliz_de_coral',
  'cadena del trono': 'cadena_del_trono',
  'ala del templo': 'ala_del_templo',
  'escama de la sierpe': 'escama_sierpe',
  'corazon del eclipse': 'corazon_eclipse',
  'rosario del primer vigia': 'rosario_primer_vigia',
  'corona de flores luminosas': 'corona_flores_luminosas',
  'nucleo estelar': 'nucleo_estelar',
  'libro de cuentas pirata': 'libro_cuentas_pirata',
};

// índice en el atlas de objetos, o null
export function objetoArt(item) {
  const key = OBJETO_BY_NAME[normalize(item?.name ?? item?.item_name ?? item?.itemName).trim()];
  return key ? OBJETOS.indexOf(key) : null;
}
