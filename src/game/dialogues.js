// Diálogos de los NPCs del mundo. Cada NPC tiene saludos (según la hora del día y si tiene algo
// para ti), opciones que abren sus ventanas y un par de líneas de historia de la zona.
//
// Opción: { label, window? (abre esa ventana), next? (muestra otra línea), close? }

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
      '¡Hierbas frescas! ¡Esencias de la capital!',
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
};
