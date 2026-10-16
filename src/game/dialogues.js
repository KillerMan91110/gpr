// Diálogos de los NPCs del mundo. Cada NPC tiene saludos (según la hora del día y si tiene algo
// para ti), opciones que abren sus ventanas y un par de líneas de historia de la zona.
//
// Opción: { label, window? (abre esa ventana), next? (muestra otra línea), close? }

import { DIALOGUES_CIUDAD } from './dialoguesCiudad';

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
// ¿este jugador ya completó esa misión? (ctx.done: códigos de sus misiones completadas). Lo que
// dicen los NPCs sigue la historia de cada jugador: nadie te agradece algo que no hiciste.
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);

export const DIALOGUES = {
  ren: {
    name: 'Ren',
    role: 'Guardabosque',
    portrait: PORTRAIT('ren'),
    // frases sueltas que dice en un globito cuando pasas cerca
    ambient: [
      'Cuidado con los lobos de noche…',
      'Las huellas van hacia el lago. Otra vez.',
      '¡El tablón tiene encargos nuevos!',
      'Hmm… la tierra del sureste huele a ceniza.',
      'Si ves un goblin con un saco, es mío.',
    ],
    greet: ({ night, mark }) => {
      if (mark === '?') return pick([
        'Las huellas no mienten: hiciste lo que te pedí. Revisa tu diario y entrégame el encargo.',
        '¡Bien hecho! La pradera respira un poco mejor gracias a ti. Ven, cobremos esa recompensa.',
      ]);
      if (mark === '!') return pick([
        'Tengo trabajo para alguien con buen pulso. Los monstruos se están acercando demasiado al campamento.',
        'Llegas justo a tiempo. El tablón está lleno de encargos y no me alcanzan las flechas para todos.',
      ]);
      return night
        ? pick(['De noche los lobos se vuelven atrevidos. Quédate cerca de la luz de los faroles.', 'Shh… ¿Oyes eso? Algo se mueve en la hierba alta. Siempre es así cuando cae el sol.'])
        : pick(['La pradera parece tranquila, pero no te fíes de la hierba alta.', 'Buenos días, aventurero. ¿Vienes a ayudar o solo de paso?']);
    },
    options: () => [
      { label: 'Ver encargos del gremio', window: 'misiones_gremio' },
      { label: 'Háblame de la Pradera', next: 'lore' },
      { label: '¿Qué hay en el este?', next: 'este' },
      { label: '¿Y al sur?', next: 'sur' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      lore: 'La Aldea Espiga es el granero de la capital: todo el trigo que se come tras la Puerta Norte sale de estos campos. Hace unos años el Titán despertó en el sureste y la tierra empezó a secarse a su alrededor. Desde entonces los lobos se organizan en manadas y los goblins saquean las granjas.',
      sur: 'Bajando por el camino del sur llegas al Círculo de Piedras: menhires con runas que brillan de noche. Últimamente un chamán hace rituales ahí. Al suroeste quedan las Ruinas del Vigía, la vieja torre que protegía los campos; ahora es refugio de bandidos.',
      este: 'Sigue el camino al este y cruzarás el río por el puente. Al noreste, pasando el Lago Cristalino, está la Guarida de la Manada: ahí manda el Capitán de los Lobos. Más al este empiezan las Montañas Grises. Y al sureste… las Tierras Heridas y el Corazón de la Pradera, donde duerme el Titán. Ni se te ocurra ir sin un buen grupo.',
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
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Lo conseguiste! Pasa, pasa, que te pago lo prometido.';
      if (mark === '!') return 'Ay, qué bien que pasas. Necesito unas manos fuertes para un encargo.';
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
    greet: ({ night }) => (night
      ? pick(['El fuego de la fragua no se apaga nunca. Como mi mal humor.', 'Hmph. Otro que no duerme. ¿Qué necesitas forjar?'])
      : pick(['Trae materiales y te forjo algo que no se rompa al primer golpe.', '¿Esa espada? He visto palos más afilados. Déjame ver qué puedo hacer.'])),
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
    ambient: [
      'La tierra del sureste está enferma…',
      'Hmm… las runas del Círculo brillaron otra vez anoche.',
      'Cuando yo era joven, el Titán dormía tranquilo.',
      'Siéntate, siéntate. Las historias no se cuentan de pie.',
    ],
    greet: ({ night, mark }) => {
      if (mark === '?') return pick([
        'Lo veo en tus ojos: lo hiciste. Ven, cuéntamelo todo y recibe lo que te ganaste.',
        'La pradera ya se siente distinta. Fuiste tú, ¿verdad? Siéntate y hablemos de tu recompensa.',
      ]);
      if (mark === '!') return pick([
        'Ah, un aventurero con buen paso. Tengo algo que pedirte… algo que yo ya no puedo hacer.',
        'Te esperaba. Las estrellas dijeron que vendría alguien. Escucha bien lo que te voy a contar.',
      ]);
      if (mark === 'gris') return 'Todavía no estás listo para lo que tengo que pedirte. Vuelve cuando hayas crecido un poco más.';
      return night
        ? pick(['De noche se oyen los tambores del chamán desde el Círculo de Piedras. No vayas solo.', 'Las luciérnagas solo salen donde la tierra está sana. Cada año hay menos.'])
        : pick(['Buen día, joven. La aldea es pequeña, pero sus historias son viejas.', 'Antes de la capital, antes del Pilar, ya había trigo en estos campos.']);
    },
    options: () => [
      { label: 'Háblame del Titán', next: 'titan' },
      { label: '¿Qué pasa en el Círculo de Piedras?', next: 'chaman' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      titan: 'El Titán de la Pradera es tan viejo como las colinas. Dormía bajo la tierra del sureste, en lo que ahora llaman el Corazón de la Pradera, hasta que alguien lo despertó. Desde entonces la tierra se seca a su alrededor y los animales enloquecen. Para enfrentarlo necesitarás nivel, buen equipo… y amigos.',
      chaman: 'Un chamán de túnica negra hace rituales en el Círculo de Piedras, al sur. Las runas brillan rojas cuando canta. Creo que tiene algo que ver con el despertar del Titán, pero nadie que fue a preguntarle volvió para contarlo.',
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
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Volviste! ¡Cuéntame todo, todo, todo!';
      if (mark === '!') return '¡Oye, oye! ¡Tengo una misión importantísima para ti!';
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
    greet: ({ night, mark }) => {
      if (mark === '?') return 'Hmph. ¿Ya está? Bueno, pasa, pasa.';
      if (mark === '!') return 'Tú. Sí, tú. Necesito a alguien que no sea un inútil. ¿Lo eres?';
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
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Lo lograste! Ven, ven, que te pago con lo que tengo.';
      if (mark === '!') return '¡Ay, qué bueno que subiste! Tengo un problemita… bueno, un problemón.';
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
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Volviste entero! Ven, siéntate junto al fuego y cuéntame.';
      if (mark === '!') return 'Oye, tú, el de las botas limpias. ¿Sabes usar eso que llevas? Me vendría bien una mano.';
      return night
        ? pick(['De noche el bosque cruje distinto. Quédate cerca del fuego.', 'No duermo bien desde que los jabalíes enloquecieron.'])
        : pick(['Bienvenido al campamento de leñadores. Cuidado con el tronco, que no es asiento.', 'Si buscas madera de roble, la que cae sola es la mejor.']);
    },
    options: () => [
      { label: '¿Qué le pasa al bosque?', next: 'bosque' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      bosque: 'Desde la primavera los árboles se secan de adentro hacia afuera, como si algo les chupara la savia por las raíces. Y los jabalíes… antes huían del hacha. Ahora la buscan. El roble viejo, más al norte, es el que peor está.',
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
    ambient: [
      'Las huellas del Encapuchado siguen hacia el este.',
      'Nunca vi tanta nieve junta.',
      'Marta me dio esta bufanda. No me la saco ni para dormir.',
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
    greet: (ctx) => (hecho(ctx, 'MONTANAS_SEC_CABRA_REINA')
      ? pick(['¿Es verdad que la cabra reina tiene corona? ¿De latas? ¡Yo quiero una corona de latas!', '¡Gorm dice que fuiste tú quien encontró a la cabra reina! ¿Te dejó tocarle los cuernos?'])
      : pick(['Los orcos se llevaron la sal de la carreta otra vez. ¿Para qué querrán tanta sal? ¿Se la comen?', 'Gorm dice que no hable con los viajeros. Pero tú pareces simpático.'])),
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
    greet: (ctx) => (hecho(ctx, 'MONTANAS_HISTORIA_03_MINEROS')
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
      if (mark === '!') return '¡Tú! Algo me rompe los pararrayos. Y no es la tormenta.';
      if (hecho(ctx, 'MONTANAS_SEC_PARARRAYOS')) return pick(['El troll ya tiene su pararrayos de madera. Lo usa todas las mañanas. Parece feliz.', 'Desde que el troll se rasca con madera, mis pararrayos duran el triple.']);
      return night
        ? pick(['De noche las tormentas son más bonitas. Y más peligrosas.', 'Si se te paran los pelos, agáchate. Hazme caso.'])
        : pick(['Mis pararrayos atraen los rayos para que no caigan sobre los viajeros. Treinta años cuidándolos.', 'Los Acantilados del Trueno no se llaman así por adorno.']);
    },
    options: () => [
      { label: '¿Por qué hay tantas tormentas?', next: 'tormentas' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      tormentas: 'Antes el Rey de la Montaña mandaba a los rayos. Con su corona los calmaba. Desde que enloqueció, las tormentas hacen lo que quieren, y los elementales nacen de cada rayo que cae. Mis pararrayos son lo único que mantiene el camino abierto.',
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
      if (mark === '!') return 'Los guardias de la Cumbre no descansan. Necesito a alguien que no les tenga miedo.';
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
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Ajá! Sabía que volverías. Los buenos siempre vuelven al muelle.';
      if (mark === '!') return 'Psst, muchacho. Acércate. Un viejo pescador necesita un favor.';
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
    greet: ({ night, mark }) => {
      if (mark === '?') return '¡Excelente! Muéstrame lo que encontraste, con cuidado, con cuidado.';
      if (mark === '!') return 'Ah, justo a tiempo. Necesito a alguien con más músculo que paciencia. Sin ofender.';
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
    greet: ({ night, mark }) => {
      if (mark === '?') return 'Gracias a ti esta gente duerme un poco más tranquila. Ven, ven.';
      if (mark === '!') return 'Por favor, escúchame. Somos pocos y tenemos miedo, pero no somos cobardes.';
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
    ambient: [
      'Shh. Escucha. ¿Oyes al norte?',
      'Tres lobos esta mañana. Dos con cristales.',
      'Desde aquí se ve todo: la Guarida y las grietas.',
      'Una flecha bien puesta vale más que diez espadas.',
    ],
    greet: ({ night, mark }) => {
      if (mark === '?') return 'Buen trabajo. Lo vi todo desde aquí arriba. Casi todo.';
      if (mark === '!') return 'Tú. Tienes pinta de saber pelear. Tengo algo que necesita más de un arco.';
      return night
        ? pick(['De noche las grietas brillan violeta. No te acerques sin luz.', 'Los aullidos de la Guarida no paran desde hace semanas.'])
        : pick(['Esta es mi atalaya. Desde aquí vigilo a la manada y a lo que sale de la tierra.', 'Si vas al sur, ve armado. Las bestias de la grieta no perdonan.']);
    },
    options: () => [
      { label: '¿Qué vigilas?', next: 'vigila' },
      { label: 'Adiós', close: true },
    ],
    lines: {
      vigila: 'Al norte, la Guarida: el Capitán de los Lobos manda ahí y la manada le obedece como nunca. Al sur, las Tierras Heridas: la tierra se abrió en grietas y de ahí salen lobos deformes con cristales en el lomo. Alguien está detrás de todo esto. Yo solo cuento cuántos salen cada día.',
    },
  },
  // Aurelia (dialoguesCiudad.js)
  ...DIALOGUES_CIUDAD,
};
