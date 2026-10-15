// Diálogos de los NPCs del mundo. Cada NPC tiene saludos (según la hora del día y si tiene algo
// para ti), opciones que abren sus ventanas y un par de líneas de historia de la zona.
//
// Opción: { label, window? (abre esa ventana), next? (muestra otra línea), close? }

import { DIALOGUES_CIUDAD } from './dialoguesCiudad';

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

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
    options: ({ mark }) => [
      { label: 'Ver encargos del gremio', window: 'misiones_gremio' },
      ...(mark === '?' ? [{ label: 'Entregar misiones', window: 'misiones' }] : []),
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
      'Mi espada se llama Partelobos.',
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
