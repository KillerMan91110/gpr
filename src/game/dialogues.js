// Diálogos de los NPCs del mundo. Cada NPC tiene saludos (según la hora del día y si tiene algo
// para ti), opciones que abren sus ventanas y un par de líneas de historia de la zona.
//
// Opción: { label, window? (abre esa ventana), next? (muestra otra línea), close? }

import { DIALOGUES_CIUDAD } from './dialoguesCiudad';
import { enFase } from './story';

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
// ¿este jugador ya completó esa misión? (ctx.done: códigos de sus misiones completadas). Lo que
// dicen los NPCs sigue la historia de cada jugador: nadie te agradece algo que no hiciste.
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);
// ¿la tiene en curso? (cualquier paso). Para lo demás (paso N, sin empezar…): enFase(ctx.fase, 'CODE@2'), ver game/story.js
const enCurso = (ctx, code) => enFase(ctx?.fase, `${code}@activa`);
// globitos que siguen la historia: ambient puede ser una lista o (ctx) => lista
export const ambientOf = (id, story) => {
  const a = DIALOGUES[id]?.ambient;
  return typeof a === 'function' ? a({ done: story?.done, fase: story }) : a ?? [];
};

// Los trillizos vagoneteros de las Montañas (Grun, Grat y Grot): cada uno atiende una estación y te
// lleva a las otras dos (gprback/lib/tormenta.js). Se distinguen por cómo hablan… un poco.
const ESTACIONES = { bastion: 'el Bastión de Hierro', minas: 'las Minas Abandonadas', garganta: 'la Garganta del Eco' };
const vagonetero = (aqui, name, saludo, ambient) => ({
  name,
  role: 'Vagonetero',
  portrait: PORTRAIT('vagonetero'),
  ambient,
  greet: () => pick(saludo),
  options: () => [
    ...Object.entries(ESTACIONES).filter(([k]) => k !== aqui).map(([k, lugar]) => ({ label: `Viajar a ${lugar} (15 de oro)`, action: 'vagoneta', destino: k })),
    { label: '¿Cómo funcionan las vagonetas?', next: 'como' },
    { label: 'Adiós', close: true },
  ],
  lines: {
    como: 'Los túneles viejos de los enanos unen el Bastión, las Minas y la Garganta. Te subes, te agarras fuerte y en un suspiro llegas. Eso sí: solo te llevo a donde ya fuiste caminando. Si no conoces la estación, no sé dónde frenar contigo adentro.',
  },
});

// Las balseras de pómez del Volcán (Pumo y sus primas Toba y Lapilli): cada una atiende un muelle y te
// lleva a los otros dos (gprback/lib/brasas.js).
const MUELLES = { rios: 'los Ríos de Lava', cantera: 'la Cantera de Obsidiana', caldera: 'la Caldera del Titán' };
const balsaOpciones = (aqui) => Object.entries(MUELLES).filter(([k]) => k !== aqui)
  .map(([k, lugar]) => ({ label: `Cruzar a ${lugar} (20 de oro)`, action: 'balsa', destino: k }));
const balsera = (aqui, name, role, saludo, ambient) => ({
  name,
  role,
  portrait: PORTRAIT('pumo'),
  ambient,
  greet: () => pick(saludo),
  options: () => [
    ...balsaOpciones(aqui),
    { label: '¿Es seguro cruzar la lava?', next: 'seguro' },
    { label: 'Adiós', close: true },
  ],
  lines: {
    seguro: 'La pómez flota hasta en la lava, y nosotras remamos con remos de basalto que no se queman. Lo peligroso es lo que cae del cielo, no lo que corre abajo. Solo te llevamos a un muelle que ya pisaste: no frenamos en medio de la lava para preguntar el camino.',
  },
});

export const DIALOGUES = {
  ren: {
    name: 'Ren',
    role: 'Guardabosque',
    portrait: PORTRAIT('ren'),
    // frases sueltas que dice en un globito cuando pasas cerca
    ambient: (ctx) => [
      'Cuidado con los lobos de noche…',
      '¡El tablón tiene encargos nuevos!',
      'Si ves un goblin con un saco, es mío.',
      ...(hecho(ctx, 'PRADERA_Q3_TITAN_PRADERA')
        ? ['El sureste ya no huele a ceniza. Huele a hierba.', 'Los lobos vuelven a tenerle miedo al fuego. Bien.']
        : ['Las huellas van hacia el lago. Otra vez.', 'Hmm… la tierra del sureste huele a ceniza.']),
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return pick([
        'Las huellas no mienten: hiciste lo que te pedí. Revisa tu diario y entrégame el encargo.',
        '¡Bien hecho! La pradera respira un poco mejor gracias a ti. Ven, cobremos esa recompensa.',
      ]);
      if (mark === '!') return pick([
        'Tengo trabajo para alguien con buen pulso. Los monstruos se están acercando demasiado al campamento.',
        'Llegas justo a tiempo. El tablón está lleno de encargos y no me alcanzan las flechas para todos.',
      ]);
      if (hecho(ctx, 'PRADERA_Q3_TITAN_PRADERA')) return pick(['El Titán ya no ruge. La hierba vuelve a crecer en el sureste, despacito.', 'Los lobos vuelven a temerle al fuego. Como debe ser. Eso lo hiciste tú.']);
      if (hecho(ctx, 'PRADERA_HISTORIA_10_RITUAL')) return 'Desde que rompiste el ritual, el Círculo ya no brilla rojo. La manada, en cambio, sigue rara.';
      return night
        ? pick(['De noche los lobos se vuelven atrevidos. Quédate cerca de la luz de los faroles.', 'Shh… ¿Oyes eso? Algo se mueve en la hierba alta. Siempre es así cuando cae el sol.'])
        : pick(['La pradera parece tranquila, pero no te fíes de la hierba alta.', 'Buenos días, aventurero. ¿Vienes a ayudar o solo de paso?']);
    },
    options: (ctx) => [
      { label: 'Ver encargos del gremio', window: 'misiones_gremio' },
      { label: 'Háblame de la Pradera', next: 'lore' },
      { label: '¿Qué hay en el este?', next: hecho(ctx, 'PRADERA_HISTORIA_11_MANADA') ? 'este_despues' : 'este' },
      { label: '¿Y al sur?', next: hecho(ctx, 'PRADERA_HISTORIA_10_RITUAL') ? 'sur_despues' : 'sur' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      lore: 'La Aldea Espiga es el granero de la capital: todo el trigo que se come tras la Puerta Norte sale de estos campos. Hace unos años el Titán despertó en el sureste y la tierra empezó a secarse a su alrededor. Desde entonces los lobos se organizan en manadas y los goblins saquean las granjas.',
      sur: 'Bajando por el camino del sur llegas al Círculo de Piedras: menhires con runas que brillan de noche. Últimamente un chamán hace rituales ahí. Al suroeste quedan las Ruinas del Vigía, la vieja torre que protegía los campos; ahora es refugio de bandidos.',
      este: 'Sigue el camino al este y cruzarás el río por el puente. Al noreste, pasando el Lago Cristalino, está la Guarida de la Manada: ahí manda el Capitán de los Lobos. Más al este empiezan las Montañas Grises. Y al sureste… las Tierras Heridas y el Corazón de la Pradera, donde duerme el Titán. Ni se te ocurra ir sin un buen grupo.',
      sur_despues: 'Bajando por el camino del sur llegas al Círculo de Piedras. Desde que rompiste el ritual del Chamán, las runas brillan azules otra vez, como cuando yo era chico. Al suroeste quedan las Ruinas del Vigía, la vieja torre que protegía los campos; los bandidos todavía se esconden ahí.',
      este_despues: 'Sigue el camino al este y cruzarás el río por el puente. Al noreste, pasando el Lago Cristalino, está la Guarida de la Manada: sin el collar del Capitán, los lobos volvieron a ser lobos. Más al este empiezan las Montañas Grises. Y al sureste, las Tierras Heridas y el Corazón de la Pradera, donde duerme el Titán.',
    },
  },
  // Brin: la aprendiza de Ren. Aparece en su puesto cuando Ren se va a las Montañas (después de
  // «Hacia las montañas»); se queda con el tablón y los encargos de Ren (ver STAND_INS en questGivers.js)
  brin: {
    name: 'Brin',
    role: 'Aprendiza de guardabosque',
    portrait: PORTRAIT('brin'),
    ambient: [
      '¡El tablón tiene encargos nuevos!',
      'Ren dice que las huellas no mienten. Yo todavía no sé leerlas todas.',
      'Si ves un goblin con un saco, avísame. Ren me dejó la lista.',
    ],
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Lo hiciste! Ren dice que hay que pagar en el momento. Ven, que te pago.';
      if (mark === '!') return 'Ren me dejó el tablón lleno de encargos. Yo sola no llego a todos… ¿me ayudas?';
      return night
        ? pick(['Ren hacía la ronda de noche. Ahora la hago yo. Con dos faroles, por las dudas.', 'De noche la pradera cruje. Ren decía que no es nada. Ren no está.'])
        : pick(['Ren se fue a las Montañas Grises detrás del Encapuchado. Me dejó su puesto. Y su arco. Y una lista larguísima.', 'Tilo se escapó detrás de Ren, ¿sabías? Su mamá todavía está enojada.']);
    },
    options: () => [
      { label: 'Ver encargos del gremio', window: 'misiones_gremio' },
      { label: '¿Dónde está Ren?', next: 'ren' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      ren: 'Cuando Elenya dijo que el Encapuchado subió a las Montañas, Ren agarró su arco y se fue esa misma noche. Me dijo «cuida el puesto, Brin, y no te fíes de la hierba alta». Tilo se coló en la diligencia de Gaspar para seguirlo. Están en el Bastión de Hierro, con los enanos.',
    },
  },
  lyra: {
    name: 'Lyra',
    role: 'Mercader',
    portrait: PORTRAIT('lyra'),
    ambient: [
      '¡Esencias y especias de todo el reino!',
      '¡Compro pieles y colmillos, buen precio!',
      'Pociones para el camino, aventurero.',
      'Hoy llegó una caravana del norte…',
    ],
    greet: ({ night }) => (night
      ? pick(['¿A estas horas? Bueno, para un buen cliente la tienda nunca cierra.', 'Los artesanos ya duermen, pero yo me encargo de sus encargos. ¿Qué buscas?'])
      : pick(['¡Bienvenido! Hierbas frescas, esencias y materiales de los mejores artesanos del gremio.', 'Si traes botín de tus cacerías, te lo compro a buen precio. Palabra de mercader.'])),
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Qué vale la pena recolectar?', next: 'recolectar' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      recolectar: 'Las matas con flores esconden Hierba Mágica; en Robleviejo hay setas y troncos de roble, y en lo alto de los árboles, nidos con plumas… y a veces un huevo. Las rocas con vetas azules tienen hierro, y junto al lago crecen flores que brillan. Dicen que en los rincones de la pradera hay cofres olvidados y restos de aventureros que no volvieron. Lo que tú recojas no se lo quitas a nadie: la pradera da para todos.',
    },
  },
  // Pip: titiritero del Barrio del Mercado. Vende los muñecos de venta (gprback/lib/puestos.js)
  pip: {
    name: 'Pip',
    role: 'Titiritero',
    portrait: PORTRAIT('pip'),
    ambient: [
      '¡Muñecos que venden solos! ¡Pasen y vean!',
      'Mi osito vendió tres espadas mientras yo almorzaba.',
      '¿Cansado de gritar precios? ¡Que lo haga un muñeco!',
      'Hilos de seda, ojos de botón, corazón de comerciante.',
    ],
    greet: ({ night }) => (night
      ? pick(['Shh… los muñecos duermen, pero yo no. ¿Quieres uno?', 'De noche cosen mejor los ojitos. ¿Te llevas un muñeco?'])
      : pick(['¡Hola, hola! ¿Tienes cosas que vender y poco tiempo? Mis muñecos atienden tu puesto por ti.', '¡Bienvenido al taller de Pip! Cada muñeco que hago es un vendedor incansable.'])),
    options: () => [
      { label: 'Comprar un Muñeco de Venta (200 de oro)', action: 'muneco' },
      { label: '¿Cómo funcionan?', next: 'como' },
      { label: 'Ver mi muñeco', window: 'mi_puesto' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      como: 'Fácil: usas el muñeco desde tu mochila aquí, en el Barrio del Mercado, le pones un cartel y le das lo que quieras vender con su precio. Se sienta en su manta y vende por ti un día entero, aunque te vayas a cazar o te desconectes. Cada venta te paga al momento, menos una pequeña comisión del mercado. Cuando lo recoges, o se le acaba el día, lo que no vendió te llega por correo al buzón de la Plaza del Pilar.',
    },
  },
  // Mirna: la comerciante de la Aldea Espiga (Lyra atiende en la capital). Vende lo que traen los
  // artesanos y compra el botín; da los encargos de la "Comerciante de la Aldea" (questGivers.js)
  mirna: {
    name: 'Mirna',
    role: 'Comerciante',
    portrait: PORTRAIT('mirna'),
    ambient: [
      '¡Hierbas de la pradera, recién cortadas!',
      '¡Compro pieles y colmillos, buen precio!',
      'Pan de Espiga y pociones para el camino.',
      'Mi cesta pesa más que mi suegra, y eso es decir mucho.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Lo conseguiste! Pasa, pasa, que te pago lo prometido.';
      if (mark === '!') return 'Ay, qué bien que pasas. Necesito unas manos fuertes para un encargo.';
      if (hecho(ctx, 'PRADERA_SEC_CERCA_4') && Math.random() < 0.5) return pick(['Margarita ya tiene corral. Con candado. Con DOS candados. Igual se escapa.', 'Bruno y Goreth almorzaron juntos ayer. No se hablaron, pero almorzaron. Es un comienzo.']);
      return night
        ? pick(['¿Tan tarde? Bueno, la tienda de una aldea nunca cierra del todo.', 'Los grillos y yo, siempre despiertos. ¿Qué buscas?'])
        : pick(['¡Bienvenido a la Aldea Espiga! Tengo hierbas, pociones y lo que traen los artesanos de la capital.', 'Si traes botín de tus cacerías, te lo compro. Palabra de Mirna.']);
    },
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Qué vale la pena recolectar?', next: 'recolectar' },
      { label: '¿Conoces a Lyra?', next: 'lyra' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      recolectar: 'Las matas con flores esconden Hierba Mágica; en Robleviejo hay setas y troncos de roble, y en lo alto de los árboles, nidos con plumas… y a veces un huevo. Las rocas con vetas azules tienen hierro, y junto al lago crecen flores que brillan. Dicen que en los rincones de la pradera hay cofres olvidados y restos de aventureros que no volvieron.',
      lyra: '¿La mercader de la capital? Es mi prima. Ella se quedó con la tienda grande del Barrio del Mercado y yo con la de la aldea, que huele mejor. Si vas a Aurelia, salúdala de mi parte.',
    },
  },
  goreth: {
    name: 'Goreth',
    role: 'Herrero',
    portrait: PORTRAIT('goreth'),
    ambient: [
      '*clang* *clang*',
      'Este yunque tiene más años que tu abuelo.',
      '¿Esa espada? Tráemela antes de que se parta.',
      'Hmph. Hace calor en la fragua.',
    ],
    greet: (ctx) => {
      if (hecho(ctx, 'PRADERA_SEC_CERCA_4') && Math.random() < 0.4) return pick(['Bruno me saludó ayer. Con la mano entera, no con un dedo. Progreso.', 'La vaca era de Mirna. Todo este tiempo. Hmph. Le debo una disculpa a Bruno. No se la voy a dar.']);
      return ctx.night
        ? pick(['El fuego de la fragua no se apaga nunca. Como mi mal humor.', 'Hmph. Otro que no duerme. ¿Qué necesitas forjar?'])
        : pick(['Trae materiales y te forjo algo que no se rompa al primer golpe.', '¿Esa espada? He visto palos más afilados. Déjame ver qué puedo hacer.']);
    },
    options: () => [
      { label: 'Usar el taller', window: 'taller' },
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Cómo se consigue mejor equipo?', next: 'equipo' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      equipo: 'Fácil: derrotas monstruos, juntas lo que sueltan y me lo traes. Si quieres que brille, el encantador usa piedras de encantamiento. Las rocas con vetas a veces tienen alguna.',
    },
  },
  // el Anciano Sabio de la aldea: da las misiones del Titán y del Chamán (ver questGivers.js)
  anciano: {
    name: 'Aldren',
    role: 'Anciano sabio',
    portrait: PORTRAIT('anciano'),
    ambient: (ctx) => [
      'Siéntate, siéntate. Las historias no se cuentan de pie.',
      ...(hecho(ctx, 'PRADERA_Q3_TITAN_PRADERA')
        ? ['Las luciérnagas volvieron. Las cuento todas las noches.', 'El Titán duerme tranquilo otra vez. Como cuando yo era joven.']
        : ['La tierra del sureste está enferma…', 'Cuando yo era joven, el Titán dormía tranquilo.']),
      ...(hecho(ctx, 'PRADERA_HISTORIA_10_RITUAL') ? [] : ['Hmm… las runas del Círculo brillaron otra vez anoche.']),
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return pick([
        'Lo veo en tus ojos: lo hiciste. Ven, cuéntamelo todo y recibe lo que te ganaste.',
        'La pradera ya se siente distinta. Fuiste tú, ¿verdad? Siéntate y hablemos de tu recompensa.',
      ]);
      if (mark === '!') return pick([
        'Ah, un aventurero con buen paso. Tengo algo que pedirte… algo que yo ya no puedo hacer.',
        'Te esperaba. Las estrellas dijeron que vendría alguien. Escucha bien lo que te voy a contar.',
      ]);
      if (mark === 'gris') return 'Todavía no estás listo para lo que tengo que pedirte. Vuelve cuando hayas crecido un poco más.';
      if (hecho(ctx, 'PRADERA_Q3_TITAN_PRADERA')) return pick(['Las luciérnagas volvieron al sureste. Anoche conté tres. ¡Tres!', 'El Titán duerme otra vez. Esta vez, tranquilo. Eso también es obra tuya.']);
      if (hecho(ctx, 'PRADERA_HISTORIA_10_RITUAL')) return 'Ya no se oyen los tambores del Círculo. Ese silencio me gusta más.';
      return night
        ? pick(['De noche se oyen los tambores del chamán desde el Círculo de Piedras. No vayas solo.', 'Las luciérnagas solo salen donde la tierra está sana. Cada año hay menos.'])
        : pick(['Buen día, joven. La aldea es pequeña, pero sus historias son viejas.', 'Antes de la capital, antes del Pilar, ya había trigo en estos campos.']);
    },
    options: (ctx) => [
      { label: 'Háblame del Titán', next: hecho(ctx, 'PRADERA_Q3_TITAN_PRADERA') ? 'titan_despues' : 'titan' },
      hecho(ctx, 'PRADERA_HISTORIA_10_RITUAL')
        ? { label: '¿Quién era ese Chamán?', next: 'chaman_despues' }
        : { label: '¿Qué pasa en el Círculo de Piedras?', next: 'chaman' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      titan: 'El Titán de la Pradera es tan viejo como las colinas. Dormía bajo la tierra del sureste, en lo que ahora llaman el Corazón de la Pradera, hasta que alguien lo despertó. Desde entonces la tierra se seca a su alrededor y los animales enloquecen. Para enfrentarlo necesitarás nivel, buen equipo… y amigos.',
      chaman: 'Un chamán de túnica negra hace rituales en el Círculo de Piedras, al sur. Las runas brillan rojas cuando canta. Creo que tiene algo que ver con el despertar del Titán, pero nadie que fue a preguntarle volvió para contarlo.',
      titan_despues: 'El Titán de la Pradera es tan viejo como las colinas. Era el guardián del Primer Sello, y alguien le clavó un cristal en el pecho para usarlo. Tú se lo sacaste. Ahora duerme otra vez bajo el Corazón de la Pradera, y esta vez sueña tranquilo.',
      chaman_despues: 'Cantaba en el Círculo para despertar al Titán. Le rompiste el ritual y las runas volvieron a brillar azules. Pero no trabajaba solo: llevaba un mapa de la Guarida, y los goblins hablaban de «el hombre de la capucha». Alguien le daba las órdenes.',
    },
  },
  // Tilo: el niño de la Aldea que quiere ser héroe (misiones graciosas, gprback schema.sql)
  tilo: {
    name: 'Tilo',
    role: 'Aprendiz de héroe',
    portrait: PORTRAIT('tilo'),
    ambient: [
      '¡Ataque giratorio! …Uy, me mareé.',
      '¡Cuando sea grande voy a matar un dragón!',
      'Cuando tenga espada, se va a llamar Partelobos.',
      '¿Tú también fuiste niño alguna vez?',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Volviste! ¡Cuéntame todo, todo, todo!';
      if (mark === '!') return '¡Oye, oye! ¡Tengo una misión importantísima para ti!';
      if (hecho(ctx, 'PRADERA_SEC_TILO_3')) return pick(['Ya le conté tu aventura a toda la aldea. Le agregué un dragón. Queda mejor.', '¡Partelobos y yo practicamos todos los días! Ayer partí una calabaza. De Bruno. No le digas.']);
      return night
        ? pick(['Mi mamá dice que me vaya a dormir, pero los héroes no duermen. Bueno, un poquito.', 'De noche hago guardia. Desde la ventana. Con la manta.'])
        : pick(['¿Eres un aventurero de verdad? ¿Con espada de verdad? ¡Qué suerte!', '¡Mira mi postura de combate! …¿Está bien así?']);
    },
    options: () => [
      { label: '¿Por qué quieres ser héroe?', next: 'heroe' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      heroe: 'Porque cuando los lobos atacaron la granja de mi tío, nadie vino a ayudar. Cuando yo sea héroe, voy a llegar siempre. Siempre, siempre. Aunque llueva.',
    },
  },
  // Bruno: el vecino gruñón de Goreth (la cadena de la cerca)
  bruno: {
    name: 'Bruno',
    role: 'Granjero',
    portrait: PORTRAIT('bruno'),
    ambient: [
      'Grrr… esa vaca otra vez.',
      'Mi cerca era más bonita antes.',
      'Ese herrero hace demasiado ruido.',
      'En mis tiempos las calabazas eran más grandes.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Hmph. ¿Ya está? Bueno, pasa, pasa.';
      if (mark === '!') return 'Tú. Sí, tú. Necesito a alguien que no sea un inútil. ¿Lo eres?';
      if (hecho(ctx, 'PRADERA_SEC_CERCA_4')) return pick(['Margarita viene a comerse mi cerca y yo la dejo. Es de Mirna. Con Mirna no se discute.', 'Goreth me arregló la azada. Gratis. Hmph. Sus calabazas siguen siendo normalitas.']);
      return night
        ? pick(['¿No duermes? Yo tampoco. Ese yunque no para ni de noche.', 'Vigilo mi cerca. Por si acaso.'])
        : pick(['¿Qué miras? Es una cerca. Una cerca normal.', 'Si vienes de parte de Goreth, ya te puedes ir.']);
    },
    options: () => [
      { label: '¿Qué tienes contra Goreth?', next: 'goreth' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      goreth: '¿Contra Goreth? Nada. Solo que hace ruido, se cree el mejor herrero del reino y una vez dijo que mis calabazas eran «normalitas». NORMALITAS. Gané el concurso tres años seguidos.',
    },
  },
  // Tobías: el molinero de la Colina del Molino
  tobias: {
    name: 'Tobías',
    role: 'Molinero',
    portrait: PORTRAIT('tobias'),
    ambient: [
      'Gira, gira, rueda…',
      '¡Harina fresca para el Festival!',
      'El viento hoy viene del este.',
      '*achís* Perdón, la harina.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Lo lograste! Ven, ven, que te pago con lo que tengo.';
      if (mark === '!') return '¡Ay, qué bueno que subiste! Tengo un problemita… bueno, un problemón.';
      if (enCurso(ctx, 'PRADERA_HISTORIA_05_MOLINO')) return 'El campamento goblin está al este, pasando las rocas. Mis engranajes, con cuidado, por favor: son de bronce viejo y lloran si se golpean.';
      if (hecho(ctx, 'PRADERA_HISTORIA_05_MOLINO')) return pick(['¡Los cuatro engranajes en su sitio! Gira, gira, rueda… como debe ser.', 'Desde que me devolviste los engranajes no paro de moler. Harina para todo el Festival.']);
      return night
        ? pick(['De noche el molino descansa. Yo no: cuento los sacos.', 'Escucha el viento entre las aspas. Es la mejor canción de la Pradera.'])
        : pick(['Bienvenido a la Colina del Molino. Si traes trigo, sales con harina.', 'Sin este molino, la aldea no tendría pan. Ni yo trabajo, claro.']);
    },
    options: () => [
      { label: '¿Cómo se hace el pan?', next: 'pan' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      pan: 'Fácil: juntas trigo en los campos, lo conviertes en harina en cualquier taller (aquí sale más fina, claro) y después al horno con un poco de Agua Purificada del Pilar. El Pan de Campo cura y llena la panza.',
    },
  },
  // ---- puestos de la Pradera: un NPC con su campamento en cada subzona (misiones de su zona) ----
  // Brenna: la leñadora del Bosque de Robleviejo
  brenna: {
    name: 'Brenna',
    role: 'Leñadora',
    portrait: PORTRAIT('brenna'),
    ambient: [
      '¡Madera va!',
      'Este bosque está enfermo. Lo siento en la corteza.',
      'Los jabalíes ya no respetan ni el hacha.',
      'El roble viejo tiene más años que todos nosotros juntos.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Volviste entero! Ven, siéntate junto al fuego y cuéntame.';
      if (mark === '!') return 'Oye, tú, el de las botas limpias. ¿Sabes usar eso que llevas? Me vendría bien una mano.';
      if (hecho(ctx, 'PRADERA_SEC_HACHA') && Math.random() < 0.5) return 'Mi hacha volvió a casa. Con un diente de jabalí clavado, de recuerdo. Mi padre se habría reído.';
      if (hecho(ctx, 'PRADERA_HISTORIA_06_RAICES')) return pick(['El roble viejo echó una hoja nueva. Una sola. Pero verde.', 'Desde que le untaste el ungüento, el bosque suena distinto. Mejor.']);
      return night
        ? pick(['De noche el bosque cruje distinto. Quédate cerca del fuego.', 'No duermo bien desde que los jabalíes enloquecieron.'])
        : pick(['Bienvenido al campamento de leñadores. Cuidado con el tronco, que no es asiento.', 'Si buscas madera de roble, la que cae sola es la mejor.']);
    },
    options: (ctx) => [
      { label: '¿Qué le pasa al bosque?', next: hecho(ctx, 'PRADERA_HISTORIA_06_RAICES') ? 'bosque_despues' : 'bosque' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      bosque: 'Desde la primavera los árboles se secan de adentro hacia afuera, como si algo les chupara la savia por las raíces. Y los jabalíes… antes huían del hacha. Ahora la buscan. El roble viejo, más al norte, es el que peor está.',
      bosque_despues: 'El ungüento salvó al roble viejo, pero lo que te mostró no me deja dormir: un gigante dormido y una mano con guante negro. El bosque no estaba enfermo. Lo estaban usando. Y los jabalíes siguen furiosos, así que algo de eso todavía anda suelto.',
    },
  },
  // ---------------------------------------------------------------- Bastión de Hierro (Montañas Grises)
  // Durgan: el jefe minero enano, gruñón y orgulloso; da la historia de las Montañas
  durgan: {
    name: 'Durgan',
    role: 'Jefe de la mina',
    portrait: PORTRAIT('durgan'),
    ambient: [
      '¡Esa veta no se va a picar sola!',
      'Mi barba tiene más años que tu espada.',
      'Las minas cantaban antes. Ahora solo crujen.',
      'Hmph. Humanos. Siempre con frío.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Volviste! Y con todas las piernas. Cuéntame, que no tengo todo el día.';
      if (mark === '!') return 'Tú. Sí, tú, el alto. Tengo trabajo para alguien que no se asuste de la oscuridad.';
      if (hecho(ctx, 'MONTANAS_Q3_REY_MONTANA') && Math.random() < 0.5) return pick(['El Rey Thorvald descansa. Los rayos vuelven a caer donde deben: en los pararrayos de Halvar.', 'Hoy cayó un rayo sobre la Cumbre. Despacito. Mi abuelo decía que así saludaba el Rey.']);
      if (hecho(ctx, 'MONTANAS_SEC_BARBA') && Math.random() < 0.5) return pick(['¿Qué miras? Es azul. Los enanos importantes llevan la barba azul. Desde ahora.', 'Hilda dice que la boda es en primavera. Yo digo que en invierno, que hay menos trabajo. Va a ser en primavera.']);
      return night
        ? pick(['De noche los rayos caen más cerca. Duerme con un ojo abierto.', 'Hmph. Otro que no duerme. Yo tampoco, desde que la mina se volvió loca.'])
        : pick(['Bienvenido al Bastión de Hierro. No toques nada que brille.', 'Si vienes a cavar, cava. Si vienes a mirar, mira desde lejos.']);
    },
    options: () => [
      { label: '¿Qué pasa en la mina?', next: 'mina' },
      { label: '¿Y esas tormentas?', next: 'tormenta' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      mina: 'Hace un año los mineros empezaron a ver luces negras en las vetas. Después dejaron de volver a casa. Los que vuelven no son los mismos: tienen los ojos oscuros y pican la roca hasta romperse las manos. Algo hay allá abajo. Algo viejo.',
      tormenta: 'Mi abuelo decía que el Rey de la Montaña mandaba a los rayos, y que los rayos lo obedecían por amor. Ahora caen donde quieren. El Rey ya no está bien… y nadie se atreve a subir a la Cumbre a preguntarle por qué.',
    },
  },
  // Hilda: la cocinera del Bastión; enseña las comidas de la montaña
  hilda: {
    name: 'Hilda',
    role: 'Cocinera del Bastión',
    portrait: PORTRAIT('hilda'),
    ambient: [
      '¡Sopa caliente para los valientes!',
      'Un enano con hambre es un enano peligroso.',
      'La flor de nieve le da un sabor… mmm.',
      '¿Eso es una costilla de oso? ¡Dámela!',
    ],
    greet: (ctx) => (hecho(ctx, 'MONTANAS_SEC_BARBA') && Math.random() < 0.5
      ? pick(['¡Ay, cielo! Estoy probando recetas para la boda. Prueba esto. No, no preguntes qué es.', 'Durgan se peina la barba azul todas las mañanas. ¡Cuarenta años sin peinarse y ahora no suelta el peine!'])
      : ctx.night
      ? pick(['A estas horas solo queda caldo. Pero es el mejor caldo de la sierra.', 'Siéntate junto al fuego, que se te ve el frío en la cara.'])
      : pick(['Nadie sale a la nieve con la panza vacía. Come antes de irte: te dura un buen rato.', 'Tráeme carne de cabra o un buen lomo de oso y te cocino algo que te haga pelear como tres enanos.'])),
    options: () => [
      { label: 'Cocinar', window: 'taller' },
      { label: '¿Por qué comer antes de salir?', next: 'comida' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      comida: 'Porque la comida de verdad no se olvida en un ratito, cielo. Comes antes de salir y durante un buen rato peleas mejor: más fuerza, más aguante, según lo que comas. Uno a la vez, eh, que no quiero enanos reventados.',
    },
  },
  // Ren en las Montañas: llegó antes como explorador, siguiendo al Encapuchado
  ren_bastion: {
    name: 'Ren',
    role: 'Explorador',
    portrait: PORTRAIT('ren'),
    ambient: (ctx) => [
      'Nunca vi tanta nieve junta.',
      hecho(ctx, 'MONTANAS_Q3_REY_MONTANA') ? 'El Encapuchado bajó al sur. Otra vez un paso detrás de él.' : 'Las huellas del Encapuchado siguen hacia el este.',
      // la bufanda solo existe si los ayudaste a encontrarse (cadena de Marta)
      hecho(ctx, 'PRADERA_SEC_MARTA_4') ? 'Marta me tejió esta bufanda. No me la saco ni para dormir.' : 'Debí traer una bufanda. Una de verdad.',
    ],
    greet: ({ mark }) => {
      if (mark === '?') return '¡Ahí estás! Cuéntame qué encontraste.';
      if (mark === '!') return 'Llegué hace unos días siguiendo al Encapuchado. Tengo algo para ti.';
      return pick(['Las montañas no son el bosque: aquí el frío te muerde de verdad.', 'Los enanos no confían en nadie. Pero Durgan es buena gente, aunque no lo parezca.']);
    },
    options: () => [
      { label: '¿Qué haces aquí?', next: 'aqui' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      aqui: 'Seguí las huellas del Encapuchado desde el Corazón de la Pradera. Subió por el Paso de la Montaña y se metió en las minas. Los enanos dicen que desde entonces las tormentas no paran. No creo que sea casualidad.',
    },
  },
  // Tilo, ahora escudero de los enanos: ayuda en la forja del Bastión
  tilo_bastion: {
    name: 'Tilo',
    role: 'Escudero de los enanos',
    portrait: PORTRAIT('tilo_escudero'),
    ambient: [
      '¡Mira mi casco! ¡Es de verdad!',
      'Durgan dice que soy el escudero más ruidoso que tuvo.',
      '*clang* ¡Ay, mi dedo!',
      'Partelobos se quedó en casa. ¡Ahora tengo un martillo!',
    ],
    greet: ({ mark }) => {
      if (mark === '?') return '¡Volviste! ¿Me trajiste algo? ¿Una espada? ¿Un dragón?';
      if (mark === '!') return '¡Tengo una misión importantísima! Bueno… importante. Bueno, una misión.';
      return pick(['¡Vine a ayudar! Mi mamá no sabe. Bueno, sabe. Gritó mucho.', 'Ahora soy escudero de verdad. Limpio las armaduras y avivo la forja. ¡Y a veces me dejan martillar!']);
    },
    options: () => [
      { label: 'Usar la forja', window: 'taller' },
      { label: '¿Cómo llegaste hasta aquí?', next: 'llegada' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      llegada: '¡Me colé en la diligencia de Gaspar! Trueno se escapó a mitad del camino y tuvimos que seguirlo hasta el Paso. Cuando llegamos, Durgan me vio cargar un barril y dijo «este sirve». ¡Así que ahora soy escudero!',
    },
  },
  // ---------------------------------------------------------------- puestos de las Montañas Grises
  // Gorm: el carretero enano del Puesto del Paso, el primero que ves al llegar a las Montañas
  gorm: {
    name: 'Gorm',
    role: 'Carretero',
    portrait: PORTRAIT('gorm'),
    ambient: [
      '¡Carretas al Bastión! ¡Quien quiera subir, que empuje!',
      'Esa rueda chilla. Todas chillan. Es la montaña.',
      '¿Para qué querrá un orco tanta sal?',
      'Pell, ¡deja de darle pan a las cabras!',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Volviste! Siéntate, que traigo la cerveza del Bastión… bueno, lo que queda.';
      if (mark === '!') return 'Tú tienes cara de saber pelear. Tengo un problema con cuernos. Y con orcos. Y con sal.';
      if (hecho(ctx, 'MONTANAS_SEC_ORCO_COCINERO') && Math.random() < 0.5) return pick(['¿Un orco cocinero? ¿Que se llama Gruk? Hmph. El guiso que dejó en la puerta estaba bueno. No le digas.', 'Guardé el hacha. Por ahora. Por si acaso. Hmph.']);
      if (hecho(ctx, 'MONTANAS_SEC_CABRA_REINA')) return pick(['Les dejé el saco de sal en el cruce. Ni una carreta volcada desde entonces. ¡Viva la cabra reina!', 'Pell quiere ir a saludar a la cabra reina. Le dije que primero aprenda a correr.']);
      return night
        ? pick(['De noche no sale ninguna carreta. Los lobos no respetan los horarios.', 'Quédate cerca del fuego, que en el Paso el viento muerde.'])
        : pick(['Bienvenido a las Montañas Grises. Sigue el camino al este y llegas al Bastión de Hierro.', 'Si ves una carreta volcada, no es mía. Bueno, seguro sí es mía.']);
    },
    options: () => [
      { label: '¿Qué es este puesto?', next: 'puesto' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      puesto: 'Aquí paran las carretas que suben mineral al Bastión y bajan hierro a Aurelia. Antes era un viaje tranquilo. Ahora hay orcos en el Paso, lobos en la nieve y cabras que embisten como si les debieras plata. Yo sigo subiendo igual. Alguien tiene que hacerlo.',
    },
  },
  // Pell: el mozo de las carretas, un chico que les da de comer a las cabras
  pell: {
    name: 'Pell',
    role: 'Mozo de carretas',
    portrait: PORTRAIT('pell'),
    ambient: [
      '¡Esa cabra me miró feo!',
      'Un día voy a manejar mi propia carreta.',
      '¿Eres un héroe? ¿Uno de verdad?',
    ],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y? ¿Era un orco? ¿Era grande? ¿Te mordió? ¡Cuéntame!';
      if (ctx.mark === '!') return '¡Psst! Alguien se come la despensa del Puesto. Gorm ya está afilando el hacha. Yo quiero averiguar antes.';
      if (enCurso(ctx, 'MONTANAS_SEC_ORCO_COCINERO')) return 'Las huellas iban hacia el campamento orco. De puntillas. ¿Quién camina de puntillas para robar cebollas?';
      if (hecho(ctx, 'MONTANAS_SEC_ORCO_COCINERO')) return pick(['¡Hoy amaneció un saco de sal en la puerta! Y una zanahoria tallada con forma de cabra. Creo que es un regalo.', 'Gorm guardó el hacha. Dice que no, pero la guardó.']);
      return hecho(ctx, 'MONTANAS_SEC_CABRA_REINA')
        ? pick(['¿Es verdad que la cabra reina tiene corona? ¿De latas? ¡Yo quiero una corona de latas!', '¡Gorm dice que fuiste tú quien encontró a la cabra reina! ¿Te dejó tocarle los cuernos?'])
        : pick(['Los orcos se llevaron la sal de la carreta otra vez. ¿Para qué querrán tanta sal? ¿Se la comen?', 'Gorm dice que no hable con los viajeros. Pero tú pareces simpático.']);
    },
    options: () => [{ label: 'Adiós', close: true }],
    lines: {},
  },
  // Dora: la minera vieja que rescataste en las Minas Abandonadas (M3); se quedó a cuidar el campamento
  dora: {
    name: 'Dora',
    role: 'Minera',
    portrait: PORTRAIT('dora'),
    ambient: [
      'Sesenta años picando piedra y nunca vi vetas negras.',
      'Esos murciélagos se llevan todo lo que brilla.',
      'Kili, ¡apaga esa vela que nos quemas la carpa!',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Mi lámpara! Bueno, cuéntame qué más encontraste en ese nido.';
      if (mark === '!') return 'Ven, ven. Una vieja como yo no puede trepar hasta el nido de los murciélagos. Tú sí.';
      if (hecho(ctx, 'MONTANAS_SEC_BARBA')) return pick(['¿Te enteraste? ¡Durgan y Hilda se casan! Cuarenta años esperando. Los enanos somos lentos para el amor.', '¡Una barba azul! Sesenta años en la mina y nunca vi una barba azul.']);
      return night
        ? pick(['De noche los mineros de abajo cantan. Ya no saben la letra.', 'No bajes de noche. Ni yo bajo de noche.'])
        : pick(['Gracias otra vez por sacarme de ahí abajo. Ahora cuido el campamento: alguien tiene que avisar si algo sube.', 'Las Minas Abandonadas no están abandonadas. Están llenas. Ese es el problema.']);
    },
    options: () => [
      { label: '¿Qué pasó en las minas?', next: 'minas' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      minas: 'Encontramos una veta negra, tibia, que latía. Los que picaron más cerca empezaron a olvidarse de cosas: primero de cenar, después de dormir, después de su nombre. Ahora pican la piedra con las manos. Si los ves, no los odies. Eran buenos muchachos.',
    },
  },
  // Nori: el minero que se quedó en el campamento esperando a Bram, Kili y Dora. Antes del rescate
  // (M3 «Mineros perdidos») está angustiado y te manda con Durgan; después, contento
  nori: {
    name: 'Nori',
    role: 'Minero',
    portrait: PORTRAIT('nori'),
    ambient: [
      'Las vetas negras… no me gustan nada.',
      'Una vela más, por si acaso.',
      'Este campamento era más ruidoso antes.',
    ],
    greet: (ctx) => (enCurso(ctx, 'MONTANAS_HISTORIA_03_MINEROS')
      ? '¿Bajaste ya? Kili, cuando tiene miedo, se mete en las grietas. Y Dora nunca suelta su lámpara: si ves una luz, es ella.'
      : hecho(ctx, 'MONTANAS_HISTORIA_03_MINEROS')
      ? pick(['¡Volvieron los tres! Bram cojea, Kili no se calla y Dora ya me está dando órdenes. Como siempre. Gracias, de verdad.', 'Desde que trajiste a Dora el campamento vuelve a oler a caldo. Y a gritos. Me encanta.'])
      : pick(['Bram, Kili y la vieja Dora bajaron a las minas hace tres días y no volvieron. Yo me quedé cuidando el campamento… y no sé qué hacer. Durgan, en el Bastión, sabrá.', '¿Vienes del Bastión? ¿Durgan mandó a alguien a buscar a mis compañeros? Tres días ya… tres días.'])),
    options: (ctx) => [
      ...(hecho(ctx, 'MONTANAS_HISTORIA_03_MINEROS') ? [] : [{ label: '¿Qué pasó en las minas?', next: 'minas' }]),
      { label: 'Adiós', close: true },
    ],
    lines: {
      minas: 'Encontraron una veta negra, tibia, que latía. Bram dijo que valía una fortuna y bajaron a picarla. Desde entonces se oyen golpes allá abajo, de noche, como si alguien siguiera picando. Y los murciélagos salen a montones. Ve con Durgan: él sabe qué hacer.',
    },
  },
  // Kili: el minero joven que rescataste; habla demasiado
  kili: {
    name: 'Kili',
    role: 'Minero',
    portrait: PORTRAIT('kili'),
    ambient: [
      '¡Dos días escondido en una grieta! ¡Dos!',
      'El caldo de Hilda me salvó la vida. Bueno, tú también.',
      'Shhh… ¿escuchaste? Ah, no, era mi panza.',
    ],
    greet: () => pick(['¡Mi héroe! Sigo debiéndote un caldo. Cuando Hilda me fíe, te invito.', 'Dora dice que no vuelva a bajar. Yo digo que la próxima vez llevo más velas.']),
    options: () => [{ label: 'Adiós', close: true }],
    lines: {},
  },
  // Sven: el trampero del Pinar Nevado, duro por fuera
  sven: {
    name: 'Sven',
    role: 'Trampero',
    portrait: PORTRAIT('sven'),
    ambient: [
      'Las huellas no mienten. La gente sí.',
      'Este frío no es normal. Los espectros lo traen.',
      'Si oyes un susurro entre los pinos, no contestes.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Ya volviste. Cuéntame. Y no me endulces nada.';
      if (mark === '!') return 'Tú. Sí, tú. Alguien me vacía las trampas y no tengo tiempo de vigilarlas todas.';
      if (hecho(ctx, 'MONTANAS_SEC_NOMBRES')) return pick(['El farol sigue encendido. Algunas noches veo pasar sombras hacia el valle. Ya no susurran.', 'Arne encontró el camino. Yo me quedo un poco más, por si alguien más lo busca.']);
      if (hecho(ctx, 'MONTANAS_SEC_TRAMPAS')) return pick(['Los oseznos ya están más gorditos. No se lo digas a nadie.', 'La osa me dejó una trucha en la puerta. Creo que es un gracias.']);
      return night
        ? pick(['De noche el pinar susurra. No es el viento.', 'Quédate junto al fuego. Los espectros odian la luz.'])
        : pick(['El Pinar Nevado no perdona a los distraídos. Mira dónde pisas.', 'Pieles, carne, trampas. Así vivo. No me quejo.']);
    },
    options: () => [
      { label: '¿Qué son los espectros?', next: 'espectros' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      espectros: 'Viajeros que se perdieron en la nieve. Se quedan dando vueltas, buscando el camino, y con los años se olvidan de qué buscaban. Algunos solo están tristes. Otros ya están enojados. Desde que llegó el Encapuchado hay muchos más. Y más enojados.',
    },
  },
  // Ingrid: la pescadora del Lago Helado, que busca al Viejo Bigotes de su abuelo
  ingrid: {
    name: 'Ingrid',
    role: 'Pescadora',
    portrait: PORTRAIT('ingrid'),
    ambient: [
      '¡Pica, pica, pica! … No picó.',
      'Mi abuelo pescó aquí setenta años. Setenta.',
      'Las sierpes me espantan todo. ¡Fuera, bichas!',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¿Lo viste? ¿Lo viste de verdad? ¡Cuéntamelo todo!';
      if (mark === '!') return '¿Crees en peces gigantes? Yo sí. Y necesito a alguien que me crea.';
      if (enCurso(ctx, 'MONTANAS_SEC_BIGOTES')) return 'Lo vi otra vez, bajo el hielo gris. Una sombra larga, con bigotes. No me mires así: ¡con bigotes!';
      if (hecho(ctx, 'MONTANAS_SEC_BIGOTES')) return pick(['¡Bigotes ya espanta sierpes solito! Bueno, las espanta un poco. Y después se esconde.', 'Bigotes creció dos dedos. Mi abuelo estaría orgulloso. O asustado.']);
      return night
        ? pick(['De noche el hielo cruje. A veces parece que alguien camina debajo.', 'El lago brilla de noche. Mi abuelo decía que es el Viejo Bigotes, que lee con linterna.'])
        : pick(['Bienvenido al Lago Helado. No pises donde el hielo está gris.', 'El lago no se derrite ni en verano. Pero tampoco se congela del todo. Raro, ¿no?']);
    },
    options: () => [
      { label: '¿Quién es el Viejo Bigotes?', next: 'bigotes' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      bigotes: 'El pez más grande del lago, con bigotes largos como cuerdas de barco. Mi abuelo lo vio tres veces. La tercera se le llevó la caña, el balde y un zapato. Nadie le creyó. Yo sí. Algún día lo voy a ver.',
    },
  },
  // Halvar: el guardián de los pararrayos de los Acantilados del Trueno
  halvar: {
    name: 'Halvar',
    role: 'Guardián de los pararrayos',
    portrait: PORTRAIT('halvar'),
    ambient: [
      'Uno, dos… ¡TRES! Ahí cayó otro.',
      'Los rayos no se cuentan, se escuchan.',
      'Este casco ya recibió cuatro rayos. Por eso tengo el pelo así.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Vienes de revisar mis pararrayos. ¿Qué encontraste? Habla fuerte, que estoy un poco sordo.';
      if (mark === '!') return hecho(ctx, 'MONTANAS_SEC_PARARRAYOS') ? 'Tengo que pedirte algo. Y esta vez no es de pararrayos… es de una voz.' : '¡Tú! Algo me rompe los pararrayos. Y no es la tormenta.';
      if (hecho(ctx, 'MONTANAS_SEC_ASTRID')) return pick(['Cada tormenta soplo el cuerno de Astrid. Las arpías ahora repiten el cuerno, no su voz. Así está mejor.', 'Ya no oigo a Astrid en las peñas. Oigo su cuerno. Y los viajeros llegan a salvo.']);
      if (hecho(ctx, 'MONTANAS_SEC_PARARRAYOS')) return pick(['El troll ya tiene su pararrayos de madera. Lo usa todas las mañanas. Parece feliz.', 'Desde que el troll se rasca con madera, mis pararrayos duran el triple.']);
      return night
        ? pick(['De noche las tormentas son más bonitas. Y más peligrosas.', 'Si se te paran los pelos, agáchate. Hazme caso.'])
        : pick(['Mis pararrayos atraen los rayos para que no caigan sobre los viajeros. Treinta años cuidándolos.', 'Los Acantilados del Trueno no se llaman así por adorno.']);
    },
    options: (ctx) => [
      { label: '¿Por qué hay tantas tormentas?', next: hecho(ctx, 'MONTANAS_Q3_REY_MONTANA') ? 'tormentas_despues' : 'tormentas' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      tormentas: 'Antes el Rey de la Montaña mandaba a los rayos. Con su corona los calmaba. Desde que enloqueció, las tormentas hacen lo que quieren, y los elementales nacen de cada rayo que cae. Mis pararrayos son lo único que mantiene el camino abierto.',
      tormentas_despues: 'Antes el Rey de la Montaña mandaba a los rayos, y desde que le devolviste su Corazón vuelven a obedecerle. Todavía caen, eh: es una montaña. Pero caen donde deben, en mis pararrayos, y no en la cabeza de los viajeros.',
    },
  },
  // Lío: el bardo mediano que vino a la Garganta del Eco a buscar canciones
  lio: {
    name: 'Lío',
    role: 'Bardo',
    portrait: PORTRAIT('lio'),
    ambient: [
      '♪ La la laaa… ♪ No, así no era.',
      '¡Esas arpías desafinan a propósito!',
      'Toda canción necesita un final. Esta todavía no lo tiene.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Volviste! ¿La escuchaste? ¿Cómo sigue? ¡Cántamela!';
      if (mark === '!') return 'Ay, ay, ay. Me robaron la canción. No me mires así: se puede robar una canción.';
      if (hecho(ctx, 'MONTANAS_SEC_CANCION')) return pick(['♪ Thorvald, Thorvald, rey del trueno… ♪ ¡Ya me la sé entera! Gracias a ti.', 'Las arpías ahora cantan MI versión. Desafinada, pero mía.']);
      return night
        ? pick(['De noche el eco canta solo. Yo lo anoto.', '♪ Duerme, viajero, que el eco vigila… ♪ Esa es mía.'])
        : pick(['Vine a la Garganta del Eco a buscar canciones viejas. Encontré arpías. Y trolls. Y frío.', 'Cada piedra de esta garganta guarda una canción. Hay que saber escuchar.']);
    },
    options: () => [
      { label: '¿Qué es la Garganta del Eco?', next: 'garganta' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      garganta: 'Una grieta enorme que parte la montaña. Todo lo que dices rebota y vuelve… a veces cambiado. Las arpías aprendieron a imitar voces: si oyes que alguien pide ayuda, mira bien antes de correr. Y los enanos dejaron piedras talladas que guardan sus canciones.',
    },
  },
  // Ulfa: la guardiana de las Tumbas Enanas, al pie de la Cumbre del Rey
  ulfa: {
    name: 'Ulfa',
    role: 'Guardiana de las tumbas',
    portrait: PORTRAIT('ulfa'),
    ambient: [
      'Los muertos también tienen frío.',
      'Una flor por cada guardia. Así era la costumbre.',
      'Escucha. Ahí va la ronda.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Volviste de las tumbas. Lo veo en tu cara.';
      if (mark === '!') return hecho(ctx, 'MONTANAS_SEC_RONDA') ? 'Los gigantes de hielo están rompiendo las tumbas. Otra vez necesito tu ayuda.' : 'Los guardias de la Cumbre no descansan. Necesito a alguien que no les tenga miedo.';
      if (hecho(ctx, 'MONTANAS_SEC_ORDEN')) return pick(['Leí la carta del Rey frente a las tumbas. Esa noche, la ronda pasó en silencio.', 'Ahora entiendo a los guardias. No los voy a llamar malditos nunca más.']);
      if (hecho(ctx, 'MONTANAS_SEC_RONDA')) return pick(['La tumba de mi abuelo ya no tiene nieve. Ni un copo. Creo que está contento.', 'Algunas noches todavía se oye la ronda. Pero ahora son menos pasos.']);
      return night
        ? pick(['De noche se oyen los pasos de la guardia. Tres siglos haciendo la misma ronda.', 'No subas de noche. La Cumbre es de ellos de noche.'])
        : pick(['Este es el último refugio antes de la Cumbre del Rey. Descansa mientras puedas.', 'Mi familia cuida las Tumbas Enanas desde que se cerraron. Ahora quedo yo.']);
    },
    options: () => [
      { label: '¿Quiénes están en las tumbas?', next: 'tumbas' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      tumbas: 'La guardia del Rey de la Montaña. Cuando el Rey se encerró en su trono, sus guardias juraron no dejar pasar a nadie. Murieron cumpliendo y siguieron cumpliendo. Ahora la tormenta los despierta y los hace marchar. No son malos. Solo están cansados.',
    },
  },
  // guardia en la entrada oeste del Bastión de Hierro
  guardia_enano: {
    name: 'Brund',
    role: 'Guardia del Bastión',
    portrait: PORTRAIT('guardia_enano'),
    ambient: [
      '¡Alto! … Ah, eres tú. Pasa.',
      'Nadie entra con orcos atrás. Nadie.',
      'Hace frío hasta en la armadura.',
      'Es mi primer mes de guardia. Se nota, ¿no?',
    ],
    greet: (ctx) => {
      if (ctx.mark === '!') return '¡Psst! Tengo un problema. Uno grande. Uno con forma de olla.';
      if (hecho(ctx, 'MONTANAS_SEC_OLLA')) return pick(['Hilda ya no me mira feo. Bueno, menos feo. Gracias por lo de la olla.', 'Los orcos pasan por el cruce a buscar su guiso y se van. ¡Ni un asalto esta semana!']);
      return pick(['Bienvenido al Bastión de Hierro. Durgan está en la entrada de la mina, Hilda en la lonja.', 'Los puestos del camino tienen fogata. Si caes en la nieve, despiertas en la última junto a la que descansaste.']);
    },
    options: () => [{ label: 'Adiós', close: true }],
    lines: {},
  },
  // vagonetas de las Montañas: los trillizos
  vagonetero_bastion: vagonetero('bastion', 'Grun',
    ['¡Vagonetas! ¡A las Minas o a la Garganta! Agárrate el sombrero.', 'Soy Grun, el mayor. Por tres minutos. Grat y Grot atienden las otras estaciones.'],
    ['¡Vagoneta sale!', 'Grat siempre frena tarde. Grot frena temprano. Yo freno justo.', '¡Agárrate el sombrero!']),
  vagonetero_minas: vagonetero('minas', 'Grat',
    ['¡Sube, sube! Las vagonetas no esperan. Bueno, sí esperan, pero yo no.', 'Soy Grat, el del medio. El más simpático. Pregúntale a cualquiera. Menos a Grun.'],
    ['¡Frenos revisados! Más o menos.', 'Los murciélagos odian el ruido de las ruedas. Mejor.', '¡Siguiente parada, donde tú digas!']),
  vagonetero_garganta: vagonetero('garganta', 'Grot',
    ['Hola. Soy Grot. Llevo vagonetas. Despacio. Muy despacio. Seguro.', 'El eco repite el chirrido de las ruedas tres veces. A Lío le encanta.'],
    ['Despacio se llega.', 'Las arpías no alcanzan a una vagoneta. Casi nunca.', '…Grat frena tarde. No le digas que te lo dije.']),
  // Nilo: el pescador viejo del Lago Cristalino
  nilo: {
    name: 'Nilo',
    role: 'Pescador',
    portrait: PORTRAIT('nilo'),
    ambient: [
      'Hoy no pica nada. Ni ayer. Ni antes de ayer.',
      'Este lago era claro como un espejo…',
      'Esos sapos me miran feo.',
      'Mi abuelo pescó aquí, y su abuelo también.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Ajá! Sabía que volverías. Los buenos siempre vuelven al muelle.';
      if (mark === '!') return 'Psst, acércate. Un viejo pescador necesita un favor.';
      if (hecho(ctx, 'PRADERA_SEC_RED')) return pick(['La red aguanta. Hoy pesqué un pez de verdad. Pequeño, pero pez.', 'Los sapos miran la red remendada y se van. Saben que perdieron.']);
      return night
        ? pick(['De noche salen los sapos grandes. Y croan. Toda. La. Noche.', 'Si ves luces sobre el agua, no las sigas. Hazle caso a este viejo.'])
        : pick(['Siéntate un rato. Pescar es esperar, y esperar es la mitad de la vida.', 'Desde que el agua se enturbió, solo pesco botas.']);
    },
    options: () => [
      { label: '¿Qué le pasó al lago?', next: 'lago' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      lago: 'Un día el agua amaneció turbia, con olor a ceniza. Después salieron los sapos, grandes como perros. Y hace poco apareció un forastero ahogado aquí cerca, con una capa negra que no era de pescador. El lago se está llenando de cosas que no son del lago.',
    },
  },
  // Maese Orlan: el erudito de Aurelia que excava la torre del Vigía
  orlan: {
    name: 'Maese Orlan',
    role: 'Erudito',
    portrait: PORTRAIT('orlan'),
    ambient: [
      'Fascinante… fascinante.',
      '¡No pises eso! Es un fragmento de cerámica de hace cuatro siglos.',
      'Los Vigías escribían en una lengua muy curiosa.',
      'Si solo pudiera leer la última línea…',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Excelente! Muéstrame lo que encontraste, con cuidado, con cuidado.';
      if (mark === '!') return 'Ah, justo a tiempo. Necesito a alguien con más músculo que paciencia. Sin ofender.';
      if (hecho(ctx, 'PRADERA_SEC_INSCRIPCIONES')) return pick(['Mandé tus tres inscripciones a la Biblioteca. No me creen. La Biblioteca nunca me cree.', 'Releo tus notas cada noche. Fascinante. Y un poco aterrador.']);
      return night
        ? pick(['De noche las inscripciones parecen moverse. Seguro es el cansancio. Seguro.', 'Los esqueletos no me dejan dormir. Ni trabajar. Ni pensar.'])
        : pick(['Bienvenido a la excavación de la Torre del Vigía, por encargo de la Biblioteca de Aurelia.', 'Cada piedra de estas ruinas cuenta una historia. La mayoría, tristes.']);
    },
    options: () => [
      { label: '¿Quiénes eran los Vigías?', next: 'vigias' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      vigias: 'Una orden de guardianes humanos. Cada uno vigilaba a una criatura antigua y a lo que esa criatura protegía. Esta torre era de la familia del primer Vigía de la Pradera. Su escudo, un ojo abierto, aparece en todas partes… incluso en los huesos que se levantan de noche.',
    },
  },
  // Sela: la granjera que guía a los refugiados de las Praderas del Este
  sela: {
    name: 'Sela',
    role: 'Granjera',
    portrait: PORTRAIT('sela'),
    ambient: [
      'Tenemos que aguantar. Todos juntos.',
      'Extraño mi casa…',
      '¿Alguien vio a la cabra blanca?',
      'Esas luces del sur no son de nadie bueno.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Gracias a ti esta gente duerme un poco más tranquila. Ven, ven.';
      if (mark === '!') return 'Por favor, escúchame. Somos pocos y tenemos miedo, pero no somos cobardes.';
      if (hecho(ctx, 'PRADERA_Q3_TITAN_PRADERA')) return pick(['Dicen que el Titán se calmó. Mañana vamos a ver las granjas. Con miedo, pero vamos.', 'Los niños ya juegan lejos del fuego. Eso, para mí, es la paz.']);
      if (hecho(ctx, 'PRADERA_SEC_RECUERDO')) return 'Mi hija duerme abrazada a su muñeca. Y yo, por fin, duermo un poco también.';
      return night
        ? pick(['Hacemos guardia por turnos. Las luces del Círculo se ven desde aquí.', 'Los niños preguntan cuándo volvemos a casa. No sé qué decirles.'])
        : pick(['Bienvenido al campamento. No tenemos mucho, pero el fuego es de todos.', 'Mi granja estaba a una hora de aquí. Ahora es de los lobos.']);
    },
    options: () => [
      { label: '¿Por qué huyeron?', next: 'huida' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      huida: 'Primero fueron los lobos, más grandes y más listos que nunca. Después las luces rojas en el Círculo de Piedras, cada noche. Y una mañana el trigo amaneció negro en un círculo perfecto alrededor de mi casa. Juntamos lo que pudimos y nos vinimos aquí, cerca del camino.',
    },
  },
  // Vera: la cazadora que vigila la Guarida y las grietas desde su atalaya
  vera: {
    name: 'Vera',
    role: 'Cazadora',
    portrait: PORTRAIT('vera'),
    ambient: (ctx) => [
      'Shh. Escucha. ¿Oyes al norte?',
      'Desde aquí se ve todo: la Guarida y las grietas.',
      'Una flecha bien puesta vale más que diez espadas.',
      hecho(ctx, 'PRADERA_HISTORIA_11_MANADA') ? 'Cero lobos con cristales hoy. Cero.' : 'Tres lobos esta mañana. Dos con cristales.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Buen trabajo. Lo vi todo desde aquí arriba. Casi todo.';
      if (mark === '!') return 'Tú. Tienes pinta de saber pelear. Tengo algo que necesita más de un arco.';
      if (hecho(ctx, 'PRADERA_HISTORIA_12_HERIDA')) return pick(['Las grietas que cerraste ya no brillan ni de noche. Me quedé sin nada que contar. Es raro. Es bueno.', 'Hoy bajé de la atalaya a cazar un conejo. Para comer. Hacía meses que no cazaba para comer.']);
      if (hecho(ctx, 'PRADERA_HISTORIA_11_MANADA')) return pick(['La Guarida está en silencio. Sin el collar, la manada volvió a ser manada.', 'Hoy conté cero lobos con cristales. Cero. Hacía meses que no escribía un cero.']);
      return night
        ? pick(['De noche las grietas brillan violeta. No te acerques sin luz.', 'Los aullidos de la Guarida no paran desde hace semanas.'])
        : pick(['Esta es mi atalaya. Desde aquí vigilo a la manada y a lo que sale de la tierra.', 'Si vas al sur, ve armado. Las bestias de la grieta no perdonan.']);
    },
    options: (ctx) => [
      { label: '¿Qué vigilas?', next: hecho(ctx, 'PRADERA_HISTORIA_11_MANADA') ? 'vigila_despues' : 'vigila' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      vigila: 'Al norte, la Guarida: el Capitán de los Lobos manda ahí y la manada le obedece como nunca. Al sur, las Tierras Heridas: la tierra se abrió en grietas y de ahí salen lobos deformes con cristales en el lomo. Alguien está detrás de todo esto. Yo solo cuento cuántos salen cada día.',
      vigila_despues: 'Al norte, la Guarida: desde que le quitaste el collar al Capitán, los lobos volvieron a ser lobos. Al sur, las Tierras Heridas: la tierra se abrió en grietas y de ahí salen bestias con cristales en el lomo. Alguien está detrás de todo esto. Yo sigo contando.',
    },
  },
  // ---------------------------------------------------------------- Volcán Rojo (Ascuaria y alrededores)
  // las balseras de pómez: Pumo y sus primas Toba y Lapilli (gprback/lib/brasas.js)
  balsero_cantera: balsera('cantera', 'Toba', 'Balsera',
    ['¿A los Ríos o a la Caldera? Súbete, que la pómez flota y yo remo.', 'Soy Toba, prima de Pumo. La que rema derecho.'],
    ['¡Balsa al agua! Bueno, a la lava.', 'Pumo cobra lo mismo y rema peor.', 'No metas la mano. En serio.']),
  balsero_caldera: balsera('caldera', 'Lapilli', 'Balsera',
    ['Desde aquí se oye el corazón del Titán. Bum… bum… ¿Nos vamos?', 'Soy Lapilli, la prima chica. Remo rápido porque me da miedo la Caldera.'],
    ['¿Oíste eso? Fue el Titán. O mi panza.', 'Rápido, rápido, que hace calor.', 'Toba dice que soy miedosa. Toba tiene razón.']),
  // Gaspar: el cochero de Aurelia, que bajó por el Paso del Humo persiguiendo a Trueno (otra vez)
  gaspar_volcan: {
    name: 'Gaspar',
    role: 'Cochero (sin diligencia)',
    portrait: PORTRAIT('cochero'),
    ambient: [
      '¡Truenooo! ¡Ven, bonito!',
      'Este caballo me va a matar de un susto.',
      'Ni una diligencia baja por aquí. Ni una.',
      'Huele a huevo podrido. ¿O soy yo?',
    ],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Y bien? ¿Lo encontraste? ¿Está entero? ¿Está gordo? ¡Dime algo!';
      if (mark === '!') return '¡Tú! ¡Por fin una cara conocida! Tengo un problema. Bueno, dos. Uno tiene cuatro patas.';
      if (enFase(ctx.fase, 'VOLCAN_SEC_TRUENO@4+')) return '¿Ese es…? ¡ES ÉL! ¡Trueno, bribón! No, no, no lo sueltes, que se me escapa otra vez.';
      if (enCurso(ctx, 'VOLCAN_SEC_TRUENO')) return '¿Lo viste? Gris, mancha blanca, cara de no haber hecho nada. Si huele a trigo quemado, va por ahí.';
      if (hecho(ctx, 'VOLCAN_SEC_TRUENO')) return pick(['Trueno ya no se escapa. Le compré unas herraduras de basalto. Ahora no puede correr: pesan una tonelada.', 'Los dracónidos dicen que Trueno es el primer caballo que pisa Ascuaria. Está insoportable de orgulloso.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_03_PUERTAS')) return pick(['¿Ya te dejaron entrar a Ascuaria? A mí me miraron como a una salchicha en la parrilla.', 'Algún día voy a poner una diligencia hasta aquí. Cuando dejen de llover piedras.']);
      return pick(['La salamandra me miró feo. Y después me quemó la bota. Ten cuidado en la Ladera.', 'Bajé por el paso persiguiendo a Trueno. Ahora no sé subir. Ni él tampoco.']);
    },
    options: () => [
      { label: '¿Qué haces aquí abajo?', next: 'aqui' },
      { label: '¿Qué hay en el Volcán?', next: 'volcan' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      aqui: 'Trueno se asustó con un rayo en las Montañas y salió disparado por el Paso del Humo. Yo detrás, claro. Él corre más. Yo me caigo más. Así llegamos los dos, más o menos al mismo tiempo, al lugar más caliente de Etheria.',
      volcan: 'Bajando la Ladera de Ceniza está Ascuaria, el pueblo de los dracónidos: gente con escamas y cuernos que no quiere forasteros. Al oeste hay campos de azufre que huelen peor que mis botas. Al este, una cantera de vidrio negro. Y al sur, ríos de lava y una montaña que respira. No vayas al sur. Bueno, ve. Pero no me pidas que te acompañe.',
    },
  },
  // Ascalia: la matriarca de Ascuaria, fría con los forasteros hasta que te ganas su respeto
  ascalia: {
    name: 'Ascalia',
    role: 'Matriarca de Ascuaria',
    portrait: PORTRAIT('ascalia'),
    ambient: [
      'Ascuaria no se arrodilla. Ni ante el fuego.',
      'Hmm. Otro forastero.',
      'Las brasas caen. Nosotros seguimos.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Has vuelto. Habla, y que tus palabras pesen lo que pesaron tus pasos.';
      if (mark === '!') return hecho(ctx, 'VOLCAN_HISTORIA_11_DRAGON') ? 'Es la hora. Las puertas de la Caldera tienen guardián, y Ascuaria no puede pedirle esto a nadie más.' : 'Forastero. Si quieres mi permiso, gánatelo.';
      if (hecho(ctx, 'VOLCAN_Q3_TITAN_FUEGO')) return pick(['El volcán duerme tranquilo por primera vez en años. Los niños preguntan tu nombre. Se lo digo.', 'En Ascuaria no hay estatuas de forasteros. Todavía.']);
      if (hecho(ctx, 'VOLCAN_Q2_CORAZON_CALDERA')) return pick(['El Señor de la Caldera cayó. Tú abriste la puerta. Ahora termina lo que empezaste.', 'Mi madre decía que el Titán era el corazón del volcán. Que alguien le haya puesto cadenas es una ofensa a todos nosotros.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_03_PUERTAS')) return pick(['Puedes andar por Ascuaria. No confundas eso con confianza.', 'Ignar habla mucho de ti. Ignar habla mucho de todo.']);
      return night
        ? pick(['De noche la lava ilumina las calles. No necesitamos faroles. Ni visitas.', 'Es tarde, forastero. ¿Qué buscas en mi plaza?'])
        : pick(['Estás en Ascuaria. Aquí se trabaja el fuego y se respeta la palabra.', 'Los forasteros traen problemas. ¿Cuál traes tú?']);
    },
    options: () => [
      { label: '¿Quiénes son los dracónidos?', next: 'draconidos' },
      { label: '¿Por qué caen brasas?', next: 'brasas' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      draconidos: 'Somos los hijos del volcán. Nuestros abuelos dicen que el primer dracónido nació de un huevo de dragón que cayó en la lava y no se quemó. Yo digo que somos gente que aprendió a vivir donde nadie más se atreve. Las escamas ayudan. Los cuernos, para el orgullo.',
      brasas: 'El volcán siempre escupió fuego, pero ahora escupe con rabia. Desde que el Titán despertó, en los Ríos de Lava, la Grieta y la Caldera llueven piedras ardientes. Si ves una sombra en el suelo, muévete. Bajo los arcos de basalto y junto a las fogatas estarás a salvo: los construyeron nuestros abuelos para eso.',
    },
  },
  // Ignar: el Forjador de Fuego, el mejor herrero de Etheria (según él) y rival de Brokk
  ignar: {
    name: 'Ignar',
    role: 'Forjador de Fuego · Gran Forja',
    portrait: PORTRAIT('ignar'),
    ambient: [
      '*CLANG* ¡Perfecto! *CLANG* ¡Más perfecto!',
      'Brokk forja con carbón. Yo forjo con un volcán.',
      'El fuego no miente. La gente sí.',
      '¡No toques el yunque! … Bueno, tócalo. Está tibio.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Ajá! Vuelves. Déjame ver qué traes. Si está bien, lo digo. Si está mal, también.';
      if (mark === '!') return hecho(ctx, 'VOLCAN_HISTORIA_09_MAESTRO') ? 'Tengo que arreglar lo que hice. Y no puedo hacerlo solo. Eso me cuesta decirlo.' : '¡Tú! Tienes brazos. Bien. Necesito brazos que no se quemen fácil.';
      if (hecho(ctx, 'VOLCAN_SEC_RIVALES_4') && Math.random() < 0.5) return pick(['Brokk y yo forjamos una espada juntos. No se lo cuentes a nadie. Bueno, cuéntaselo a todos: quedó perfecta.', 'Le mandé a Brokk un poco de obsidiana. Me mandó una carta que dice «bonita piedra». De él, eso es un abrazo.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_10_FISURA')) return pick(['Morvak usaba mis moldes. MIS moldes. Ya no queda ni uno en la Fisura. Me aseguré.', 'Ahora forjo cada pieza mirándola dos veces. Antes la miraba una y me aplaudía.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_09_MAESTRO')) return pick(['Yo forjé esos cristales. Sin saberlo, pero los forjé. El fuego no perdona eso. Yo tampoco.', 'Si el Encapuchado vuelve por aquí, que traiga un buen escudo.']);
      return night
        ? pick(['La Gran Forja no duerme. Yo tampoco. Bueno, a veces. Sobre el yunque.', '¿A estas horas? Bien. El metal sale mejor de noche. No sé por qué. Pero sale.'])
        : pick(['Bienvenido a la Gran Forja. Aquí el fuego viene directo del volcán: ni carbón, ni fuelle, ni excusas.', '¿Esa espada la hizo Brokk? Se nota. Ven, déjame mostrarte lo que es forjar.']);
    },
    options: () => [
      { label: 'Usar la Gran Forja', window: 'taller' },
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Qué tiene de especial tu forja?', next: 'forja' },
      { label: '¿Conoces a Brokk?', next: 'brokk' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      forja: 'La Gran Forja está construida sobre una chimenea del volcán: el fuego sube solo, más caliente que cualquier carbón. Con él se trabaja la obsidiana y el basalto, que en Aurelia ni se pueden calentar. Aquí salen las armas de obsidiana y, si me traes lo de la Fisura, las de Forja Negra. Ojo: solo forjo para quien pueda levantarlas.',
      brokk: '¿Brokk? ¿El enano de Aurelia? Buen herrero. Para ser enano. Para ser de ciudad. Para usar carbón. Hace treinta años competimos en la Feria de Aethra: él hizo una espada que cortaba el viento, yo hice una que cortaba su espada. Él dice que empatamos. Mentira. Pero lo respeto. No le digas.',
    },
  },
  // Tuli: la parrillera de la plaza; cocina todo lo que tenga escamas
  tuli: {
    name: 'Tuli',
    role: 'Parrillera',
    portrait: PORTRAIT('tuli'),
    ambient: [
      '¡Colas de salamandra a la brasa! ¡Calentitas!',
      '¿Picante? ¿Muy picante? ¿O picante de verdad?',
      'La brasa del volcán da otro sabor. Créeme.',
      '¡Ay! Me quemé. Otra vez. Ni lo sentí.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Lo trajiste! A ver, a ver… huele bien. Huele MUY bien.';
      if (mark === '!') return '¡Eh, forastero! ¿Tienes estómago fuerte? Necesito a alguien valiente. Para cocinar. Y para probar.';
      if (hecho(ctx, 'VOLCAN_SEC_PICANTE')) return pick(['Mi chile de azufre ya es famoso. Ignar lloró. Dijo que era el humo. No era el humo.', '¿Otra ración de chile? Tú sí que tienes escamas por dentro.']);
      return night
        ? pick(['La parrilla no se apaga ni de noche. La lava la mantiene caliente.', 'Siéntate. A esta hora todo sabe mejor.'])
        : pick(['¡Bienvenido a la mejor parrilla de Etheria! También es la única de Ascuaria, pero eso no importa.', 'Tráeme carne de salamandra, colas o lo que tenga escamas y te preparo algo que te dure todo el camino.']);
    },
    options: () => [
      { label: 'Cocinar', window: 'taller' },
      { label: '¿Qué se come en Ascuaria?', next: 'comida' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      comida: 'Todo lo que tenga escamas y no te coma primero. La salamandra es tierna si la cocinas despacio sobre basalto. Las colas, crujientes. Y si le pones chile de azufre, te dura el calor en la panza horas: aguantas más los golpes. Los forasteros lloran. Los dracónidos piden más.',
    },
  },
  // Chispa: niña dracónida obsesionada con los dragones
  chispa: {
    name: 'Chispa',
    role: 'Niña dracónida',
    portrait: PORTRAIT('chispa'),
    ambient: [
      '¡Grrr! Soy un dragón. ¡GRRR!',
      '¿Viste un dragón? ¿Uno de verdad?',
      'Cuando sea grande voy a volar. Ya verás.',
      '¡Mis cuernos crecieron! … Un poquito.',
    ],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Lo hiciste? ¿Sí? ¿SÍ? ¡Cuéntame todo y despacito!';
      if (mark === '!') return hecho(ctx, 'VOLCAN_SEC_HUEVO_1') ? '¡Psst! El huevo se movió. Bueno, creo. ¡Necesito ayuda otra vez!' : '¡Oye! ¿Sabes guardar un secreto? Uno grande. Uno con cáscara.';
      if (hecho(ctx, 'VOLCAN_SEC_HUEVO_3')) return pick(['¡Brasita ya escupe chispas! Bueno, escupe humo. Pero va a escupir chispas.', '¡Mamá dejó que Brasita duerma en mi cuarto! Bueno, no sabe. ¡No le digas!', 'Le puse Brasita, como el dragón del Viejo Escamas. Cuando se lo dije, lloró. Pero de los buenos.']);
      if (hecho(ctx, 'VOLCAN_SEC_HUEVO_1')) return pick(['El huevo está calentito. Lo tapo con mi manta. Bueno, con la de mamá.', 'Le canto al huevo todas las noches. Creo que le gusta. O se aburre.']);
      return pick(['¿Sabías que los dragones duermen en lava? ¡Yo también quiero!', 'El Viejo Escamas dice que crió un dragón. ¡UN DRAGÓN! Cuando sea grande, yo también.']);
    },
    options: (ctx) => [
      { label: 'Háblame de los dragones', next: hecho(ctx, 'VOLCAN_HISTORIA_11_DRAGON') ? 'dragones_despues' : 'dragones' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      dragones_despues: '¡Son lo mejor que existe! El del Viejo Escamas se fue al fuego. Él dice que ahora vuela más alto que nunca, y que ya no le duele nada. Cuando sea grande voy a cuidar dragones como él. Y no voy a dejar que nadie les clave nada.',
      dragones: '¡Son lo mejor que existe! Tienen escamas como nosotros pero más grandes, y alas, y fuego de verdad. Antes había muchos en el Nido, al sureste. Ahora queda uno solo y está enfermo. El Viejo Escamas llora cuando habla de él. A mí no me deja ir. Pero yo sé el camino.',
    },
  },
  // Sulfo: el alquimista humano que vive entre las fumarolas y ya no siente el olor
  sulfo: {
    name: 'Sulfo',
    role: 'Alquimista',
    portrait: PORTRAIT('sulfo'),
    ambient: [
      '¿Qué olor? Yo no huelo nada.',
      'El azufre amarillo para pociones. El verde para… no toques el verde.',
      '*cof cof* Es por el clima.',
      'Treinta años aquí. Los mejores de mi vida. Creo.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return '¡Volviste! ¿Lo traes? Ponlo ahí, junto al caldero. No, ahí no. Ahí tampoco. Bueno, dámelo.';
      if (mark === '!') return 'Ah, un visitante. Raro. Muy raro. Nadie viene a los Campos de Azufre. No entiendo por qué.';
      if (hecho(ctx, 'VOLCAN_SEC_OLOR')) return pick(['Ahora huelo a flor de ceniza. Ascalia me dejó entrar al pueblo. ¡Por primera vez en diez años!', 'El perfume funciona. Tuli dice que todavía huelo a huevo. Pero a huevo fresco.']);
      return night
        ? pick(['De noche las fumarolas brillan. Es precioso. Y tóxico. Pero precioso.', 'No duermo mucho. Las pociones no se vigilan solas.'])
        : pick(['Bienvenido a mi laboratorio. Todo el campo es mi laboratorio. Y mi casa. Y mi jardín.', 'Las fumarolas dan el mejor azufre de Etheria. Si las picas con cuidado.']);
    },
    options: () => [
      { label: '¿Para qué sirve el azufre?', next: 'azufre' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      azufre: 'Para todo. Pociones, pólvora, tintes, remedios para la tos… bueno, no para la tos. En las fumarolas se junta el mejor, amarillo y limpio. Tráemelo y con él se hacen las pociones de resistencia al fuego que te van a salvar la piel en el sur. Ah, y si ves un elemental de azufre, no respires cerca. Hazme caso.',
    },
  },
  // Ceniza: la guardabosque dracónida que replanta el Bosque Calcinado
  ceniza: {
    name: 'Ceniza',
    role: 'Guardabosque',
    portrait: PORTRAIT('ceniza'),
    ambient: [
      'Un brote. Otro brote. Shh, no los pises.',
      'El bosque se quemó. No se murió.',
      'Los bandidos pisan todo. Todo.',
      'Algún día aquí habrá sombra otra vez.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Volviste. ¿Cómo quedó? ¿Siguen vivos los brotes?';
      if (mark === '!') return hecho(ctx, 'VOLCAN_SEC_BOSQUE_1') ? 'Tengo semillas nuevas. Y un problema nuevo.' : 'Tú. Mira dónde pisas. Ahí. Exacto. Ese es un brote. Y necesito ayuda para que siga así.';
      if (hecho(ctx, 'VOLCAN_SEC_BOSQUE_3')) return pick(['Los bandidos ya no vuelven. El bosque te lo agradece. Yo también.', 'Mira: el primer árbol que plantamos ya me llega a la rodilla. A mi rodilla, que es alta.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_06_MOLDES')) return pick(['Las cajas que enterraron los bandidos tenían ese símbolo raro. El eclipse. No me gustó nada.', 'Desde que te llevaste los moldes, los bandidos están nerviosos. Bien.']);
      return night
        ? pick(['De noche las brasas del suelo brillan. Parecen luciérnagas. No lo son.', 'Los bandidos se mueven de noche. Yo también.'])
        : pick(['Este es el Bosque Calcinado. Antes se llamaba Bosque Rojo, por las hojas. Ahora es rojo por otra cosa.', 'Los dracónidos dicen que el bosque no vuelve. Yo digo que sí. Tarda, pero vuelve.']);
    },
    options: () => [
      { label: '¿Qué le pasó al bosque?', next: 'bosque' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      bosque: 'Hace unos años el volcán rugió y un río de lava bajó por aquí. Los árboles se quemaron de pie. Algunos todavía humean. Pero mira la ceniza: cada tanto sale una flor. La flor de ceniza solo crece donde hubo fuego. Es la primera en volver. Después, si nadie la pisa, vuelven los demás.',
    },
  },
  // Pumo: el balsero pícaro de los Ríos de Lava (sus primas Toba y Lapilli atienden los otros muelles)
  pumo: {
    name: 'Pumo',
    role: 'Balsero',
    portrait: PORTRAIT('pumo'),
    ambient: [
      '¡Balsas de pómez! ¡Flotan en la lava! ¡Casi siempre!',
      'Precio especial para ti. Igual que para todos.',
      'Mis primas reman peor. No se lo digas.',
      'Si se hunde, te devuelvo el oro. Si puedes pedirlo.',
    ],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¡Mi cliente favorito! ¿Lo trajiste? ¿Sí? Entonces el próximo viaje… lo pagas igual. Pero con una sonrisa.';
      if (mark === '!') return hecho(ctx, 'VOLCAN_Q1_DOMADOR_FUEGO') ? '¡Ey! Tengo un negocio para ti. Uno honesto. Bueno, casi.' : '¿Cruzar la lava? Claro. ¿Ayudarme con un asuntito? También, ¿no?';
      if (hecho(ctx, 'VOLCAN_SEC_POMEZ')) return pick(['La pómez nueva flota el doble. Ahora puedo llevar a Tuli. Y su parrilla.', '¡Las balsas ya no crujen! Bueno, crujen menos. Es el sonido de la calidad.']);
      return pick(['¿Vas a la Cantera o a la Caldera? Mis primas Toba y Lapilli te esperan del otro lado.', 'La pómez es piedra que flota. La lava es piedra que corre. Juntas, un negocio redondo.']);
    },
    options: () => [
      ...balsaOpciones('rios'),
      { label: '¿Cómo funcionan las balsas?', next: 'como' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      como: 'La pómez es piedra del volcán llena de agujeros: tan liviana que flota hasta en la lava. Mi abuelo hizo la primera balsa; yo hice el negocio. Mis primas y yo cuidamos tres muelles: el de los Ríos de Lava, el de la Cantera de Obsidiana y el de la Caldera. Solo te llevamos a un muelle que ya pisaste: si no, ¿cómo sé que no me vas a pedir que frene en medio de la lava?',
    },
  },
  // Kessa: la talladora de obsidiana; odia que Ignar la llame «artesana»
  kessa: {
    name: 'Kessa',
    role: 'Talladora de obsidiana',
    portrait: PORTRAIT('kessa'),
    ambient: [
      'Tallar no es forjar. Es mejor.',
      'Ignar me dijo «artesana». ARTESANA.',
      'El vidrio negro corta hasta la mirada.',
      'Shh. Los gólems escuchan el golpe del cincel.',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Has vuelto. Déjame ver. Hmm. Sí. Esto sirve.';
      if (mark === '!') return 'Tú. ¿Sabes lo que es la paciencia? Yo sí. Y se me está acabando.';
      if (hecho(ctx, 'VOLCAN_SEC_ARTESANA')) return pick(['Ignar ahora me llama «maestra talladora». Le cuesta. Se le nota en la cara. Me encanta.', 'Mi daga de obsidiana está en la Gran Forja, colgada al lado de su mejor espada. Brilla más.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_09_MAESTRO')) return pick(['Los gólems ya no se despiertan solos. El Maestro de la Lava los llamaba. Ya no llama a nadie.', 'Ignar forjó esos cristales sin saberlo. No me alegro. Bueno, un poquito.']);
      return night
        ? pick(['De noche la obsidiana refleja la lava. Parece que la cantera arde por dentro.', 'No tallo de noche. Solo miro. La piedra te dice dónde cortar.'])
        : pick(['Bienvenido a la Cantera de Obsidiana. No toques los bordes. No te lo repito.', 'Cada pieza de obsidiana tiene un filo escondido. Mi trabajo es encontrarlo.']);
    },
    options: () => [
      { label: '¿Qué es la obsidiana?', next: 'obsidiana' },
      { label: '¿Y los gólems?', next: 'golems' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      obsidiana: 'Lava que se enfrió tan rápido que no tuvo tiempo de volverse piedra. Es vidrio: negro, duro y con un filo que ningún acero alcanza. Pero se rompe si no sabes tallarla. Ignar la calienta y le pega con el martillo. Yo la escucho y la corto. Adivina cuál de los dos hace las mejores armas.',
      golems: 'Siempre hubo gólems de obsidiana en la cantera, dormidos dentro de la roca. Se despiertan si alguien les pega muy fuerte, y entonces vuelven a dormirse. Pero ahora están despiertos todo el tiempo, con los ojos rojos. Alguien los despertó a propósito. Y no fui yo.',
    },
  },
  // Marga: la mercader de la plaza de Ascuaria; compra el botín y vende lo de los artesanos de Aurelia
  mercader_ascuaria: {
    name: 'Marga',
    role: 'Mercader de Ascuaria',
    portrait: PORTRAIT('marga'),
    ambient: [
      '¡Escamas, colmillos, azufre! Todo se compra, todo se vende.',
      'Una moneda, dos monedas… ¿y esa? Esa es mía.',
      'Ignar me debe tres martillos. Tres.',
      'Lo que traes del Volcán, en Aurelia vale el doble. Aquí, lo justo.',
    ],
    greet: (ctx) => {
      const { night } = ctx;
      if (hecho(ctx, 'VOLCAN_Q3_TITAN_FUEGO')) return pick(['¡El héroe de la Caldera en mi puesto! Hoy te atiendo yo misma. Bueno, siempre te atiendo yo misma.', 'Desde que cayó el Titán, las caravanas vuelven a subir. Y con ellas, el buen negocio.']);
      if (!hecho(ctx, 'VOLCAN_HISTORIA_03_PUERTAS')) return 'Un forastero. Mmm. Ascalia no te dejó entrar todavía, pero el oro no tiene escamas. ¿Qué traes?';
      return night
        ? pick(['¿A estas horas? Para un buen cliente el puesto no cierra nunca.', 'De noche se vende poco y se cuenta mucho. ¿Vienes a vender o a comprar?'])
        : pick(['Bienvenido a mi puesto. Si viene del Volcán, te lo compro; si lo necesitas para el camino, te lo vendo.', 'Las caravanas de Aurelia me traen hierbas, aceite y carbón. Lo que te falte, pregúntame.']);
    },
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Cómo llegan tus cosas hasta aquí?', next: 'caravanas' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      caravanas: 'Con las caravanas que bajan por el Paso del Humo, cuando los bandidos del Bosque las dejan pasar. Traigo lo mismo que venden los artesanos de Aurelia, para que nadie tenga que subir la montaña por un frasco. Y me llevo escamas, obsidiana y azufre: en la capital pagan bien por todo lo que huele a volcán.',
    },
  },
  // el Viejo Escamas: el anciano que crió al dragón cuando era cría
  escamas: {
    name: 'Viejo Escamas',
    role: 'Guardián del Nido',
    portrait: PORTRAIT('escamas'),
    ambient: [
      'Brasita… ¿me oyes todavía?',
      'Mis huesos crujen como la roca del nido.',
      'Antes el cielo tenía dragones. Muchos.',
      '*tararea una canción muy vieja*',
    ],
    greet: (ctx) => {
      const { night, mark } = ctx;
      if (mark === '?') return 'Has vuelto. Siéntate. Cuéntamelo despacio: mis oídos ya no son lo que eran.';
      if (mark === '!') return hecho(ctx, 'VOLCAN_HISTORIA_11_DRAGON') ? 'Tengo que pedirte una última cosa. La más difícil. Para Brasita.' : '¿Tienes un momento para un viejo? Es por mi dragón. Está sufriendo.';
      if (hecho(ctx, 'VOLCAN_SEC_ULTIMO_VUELO')) return pick(['Su escama cayó en la lava como una hoja. Brasita voló una última vez. Gracias. De verdad.', 'Ahora le canto a las nubes. Creo que él me escucha desde ahí.']);
      if (hecho(ctx, 'VOLCAN_HISTORIA_11_DRAGON')) return pick(['Al final me reconoció. Cuando el cristal se rompió, me miró como cuando cabía en mi sombrero.', 'Lloraba fuego, ¿sabes? Por el cristal. Ya no llora. Ya no le duele nada.']);
      return night
        ? pick(['De noche Brasita gime en el nido. Antes cantaba. Yo le cantaba a él.', 'Duerme tú. Yo me quedo despierto. Alguien tiene que hacerle compañía.'])
        : pick(['Este es el Nido del Dragón. Ya no nacen dragones grandes: solo dracos, que son otra cosa. Y él.', 'Crié a Brasita cuando era así de chiquito. Cabía en mi sombrero. Ahora yo cabría en su boca.']);
    },
    options: (ctx) => [
      hecho(ctx, 'VOLCAN_HISTORIA_11_DRAGON')
        ? { label: '¿Cómo era Brasita?', next: 'brasita_despues' }
        : { label: '¿Quién es Brasita?', next: 'brasita' },
      { label: '¿Qué pasó con los dragones?', next: 'dragones' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      brasita: 'La última cría del Nido. Su madre no volvió de la Caldera y yo lo encontré temblando entre los huesos. Lo alimenté con carbón y canciones durante cuarenta años. Ahora lo llaman Dragón Menor y le tienen miedo. Algo le clavaron en el pecho: un cristal oscuro que lo quema por dentro. Por eso ataca. No es malo. Le duele.',
      brasita_despues: 'Juguetón. Me quemaba la barba para que le hiciera caso, y se dormía en la lava con la cola afuera, como un gato. Cuarenta años de carbón y canciones. Alguien le clavó un cristal y tú se lo sacaste. Se fue en paz, y eso es más de lo que muchos dragones tuvieron.',
      dragones: 'Hubo un tiempo en que los dragones anidaban aquí cada verano. Los dracónidos dicen que venimos de ellos. Después vino la guerra de los dioses, el Titán se durmió y los dragones se fueron. No sé a dónde. Brasita se quedó conmigo. Mira los huesos del Nido: algunos son de dragones más grandes que una casa.',
    },
  },
  // Aurelia (dialoguesCiudad.js)
  ...DIALOGUES_CIUDAD,
};
