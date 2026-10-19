// Diálogos de la Tundra Eterna (Fiordo Blanco y alrededores). Mismo formato que dialogues.js. Lo que
// dicen sigue la historia de cada jugador (T1-T14, ver gprback/docs/zona5_tundra.md): nadie te
// agradece algo que no hiciste, y lo que elegiste en la T14 (el perdón o la justicia) se nota.

import { enFase } from './story';

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const bye = { label: 'Adiós', close: true };
// igual que en dialogues.js
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);
const enCurso = (ctx, code) => enFase(ctx?.fase, `${code}@activa`);
// Los trineos de Skadi (gprback/lib/trineos.js): Skadi en Fiordo Blanco y sus hermanos Kari (la Aldea)
// y Leif (el Campamento); cada uno te lleva a las otras dos paradas
const PARADAS = { fiordo: 'la perrera de Fiordo Blanco', aldea: 'la Aldea de los Mamuts', campamento: 'el Campamento de los Cazadores' };
const trineoOpciones = (aqui) => Object.entries(PARADAS).filter(([k]) => k !== aqui)
  .map(([k, lugar]) => ({ label: `Ir en trineo a ${lugar} (30 de oro)`, action: 'trineo', destino: k }));
const conductor = (aqui, name, saludo, ambient) => ({
  name, role: 'Conductor de trineos', portrait: PORTRAIT(aqui === 'aldea' ? 'kari' : 'leif'), ambient,
  greet: () => pick(saludo),
  options: () => [...trineoOpciones(aqui), { label: '¿Son seguros los perros?', next: 'perros' }, bye],
  lines: {
    perros: 'Más seguros que tus piernas en la nieve. Conocen cada camino, cada grieta y cada hoguera. Solo te llevamos a una parada que ya pisaste: los perros no confían en quien no conoce el camino. Yo tampoco.',
  },
});
// la elección de la T14
const perdono = (ctx) => hecho(ctx, 'TUNDRA_HISTORIA_14_PERDON');
const juzgo = (ctx) => hecho(ctx, 'TUNDRA_HISTORIA_14_JUSTICIA');
const reyCaido = (ctx) => hecho(ctx, 'TUNDRA_Q3_REY_HIELO');

// Hela habla igual en la casa larga y en Aurelia; lo que cambia es lo que elegiste
const helaLines = {
  madre: 'Mi madre cantaba una canción de cuna sobre un lobo que se comía la aurora. Eirik se dormía antes de la mitad. Yo nunca. Me quedaba despierta para saber si el lobo se la terminaba comiendo. Nunca lo supe: mamá se dormía antes que yo.',
  ocultos: 'Me encontraron en el Lago, llorando, el invierno en que murió mamá. Un hombre con capucha me dijo que mi padre la había encerrado bajo el hielo. Que con su ayuda podía sacarla. Le creí diez años. Diez. Era más fácil odiar a mi padre que extrañar a mi madre.',
};

export const DIALOGUES_TUNDRA = {
  // ---------------------------------------------------------------- muelle
  // Rhaegar espera junto a La Gaviota Insolente en el muelle de Fiordo Blanco (gprback/lib/barco.js)
  rhaegar_fiordo: {
    name: 'Capitán Rhaegar', role: 'Capitán de La Gaviota Insolente', portrait: PORTRAIT('rhaegar'),
    ambient: ['Frío. Mucho frío. Odio el frío.', '¡Galleta! ¡Sal de mi abrigo!', 'Este hielo cruje como un barco viejo.', '*se sopla las manos*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y? ¿Lo encontraste? Dime que sí. Ese caballo se comió media bodega.';
      if (ctx.mark === '!') return 'Tú. Sí, tú. Tengo un problema con cuatro patas y crin.';
      if (juzgo(ctx)) return pick(['Llevé a la hija del rey a Aurelia. No habló en todo el viaje. Galleta tampoco. Fue el viaje más callado de mi vida.', 'La justicia está bien. Pero el barco se sintió frío sin ella. Más frío, digo.']);
      if (perdono(ctx)) return pick(['La hija del rey me trajo pescado ayer. Para Galleta. Galleta la ama. Yo… la tolero.', 'Perdonar no es fácil. Yo perdoné a tu capitán Bastida. Bueno, casi.']);
      return pick([
        'Aquí estamos. El fin del mundo. Huele a pescado congelado y a problemas. Mis dos cosas favoritas.',
        'La Gaviota no se mueve de este muelle hasta que me digas. Bueno, hasta que se congele. Después veremos.',
        'Los norteños me miran raro. Creo que es el sombrero. O el loro. O que soy pirata.',
      ]);
    },
    options: () => [
      { label: 'Volver al Puerto Antiguo', action: 'barco', destino: 'puerto' },
      { label: '¿Qué sabes de este lugar?', next: 'norte' },
      bye,
    ],
    lines: {
      norte: 'Poco. Nadie viene al norte: el mar se congela, los vientos te dan vuelta el barco y los norteños no quieren visitas. Dicen que su rey congeló todo a propósito, hace años. Yo digo que nadie congela un reino a propósito. Pero el Encapuchado vino para acá, así que algo hay. Pregúntale a la vieja de la casa larga: tiene cara de saber todo y de no contarlo.',
    },
  },
  // Bjorn el Mudo: el mercader del muelle; habla por señas y su loro grita por él
  mercader_fiordo: {
    name: 'Bjorn el Mudo', role: 'Mercader del muelle', portrait: PORTRAIT('bjorn'),
    ambient: ['*señala sus pieles y levanta los pulgares*', '*el loro:* ¡BARATO! ¡TODO BARATO!', '*se rasca la barba*', '*el loro:* ¡NO TOQUES SIN COMPRAR!'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '*Bjorn mira tu mochila con interés. El loro:* «¡¿TRAJISTE EL PESCADO?! ¡ÉL PREGUNTA SI TRAJISTE EL PESCADO!»';
      if (ctx.mark === '!') return '*Bjorn te hace señas de que te acerques. El loro:* «¡TIENE UN TRABAJO PARA TI! ¡PAGA BIEN! ¡BUENO, PAGA!»';
      if (hecho(ctx, 'TUNDRA_SEC_PESCA')) return '*Bjorn te da una palmada en el hombro. El loro:* «¡EL PESCADOR! ¡LLEGÓ EL PESCADOR!»';
      return pick([
        '*Bjorn hace una reverencia exagerada. El loro:* «¡BIENVENIDO! ¡ÉL DICE BIENVENIDO! ¡YO DIGO QUE COMPRES!»',
        '*Bjorn te muestra una piel blanca y la acaricia. El loro:* «¡SUAVE! ¡CALIENTITA! ¡CARA!»',
      ]);
    },
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Por qué no habla?', next: 'mudo' },
      bye,
    ],
    lines: {
      mudo: '*Bjorn se encoge de hombros y señala al loro. El loro:* «¡PERDIÓ LA VOZ GRITANDO EN UNA TORMENTA! ¡AVISABA A LOS BARCOS! ¡SALVÓ A TODOS! ¡AHORA GRITO YO! ¡ME GUSTA GRITAR!»',
    },
  },

  // ---------------------------------------------------------------- la casa larga
  // Hrafna, la Anciana del Hielo: la abuela de la familia real; seca y sabia
  hrafna: {
    name: 'Hrafna', role: 'La Anciana del Hielo', portrait: PORTRAIT('hrafna'),
    ambient: (ctx) => [
      '*remueve el fuego con un palo*',
      'El frío no perdona al que no sabe.',
      ...(reyCaido(ctx) ? ['El fiordo se deshiela. Hace diez años que no veía agua.'] : ['Mi hijo está allá arriba. Solo. Con su invierno.']),
    ],
    greet: (ctx) => {
      if (ctx.mark === '?') return 'Siéntate. Cuéntame. Despacio: a mi edad las noticias rápidas hacen daño.';
      if (ctx.mark === '!') return 'Sureño. Acércate. Tengo algo que pedirte, y no me gusta pedir.';
      if (perdono(ctx)) return pick(['Hela me ayuda a hacer el pan. Lo quema. Todos los días. No le digas que te dije.', 'Dejaste a mi nieta en casa. No sé si fue justo. Sé que fue bueno. A veces es lo mismo.']);
      if (juzgo(ctx)) return pick(['Hela me escribe desde Aurelia. Dice que la tratan bien. Dice que la sacerdotisa la escucha. Ojalá sea cierto.', 'Elegiste la justicia. No te lo reprocho. Mi hijo también habría elegido eso. Y después habría llorado solo, como yo.']);
      if (reyCaido(ctx)) return pick(['Mi hijo descansa. El Sello también. Ahora los vivos tenemos trabajo.', 'Diez años de invierno. Y se terminó en una tarde.']);
      if (hecho(ctx, 'TUNDRA_HISTORIA_04_PRINCIPE')) return pick(['Eirik duerme en su cuarto otra vez. Ronca igual que su padre.', 'Gracias por traerme a mi nieto. Falta la otra.']);
      if (hecho(ctx, 'TUNDRA_HISTORIA_01_RUMBO')) return pick(['Tienes las manos calientes. Bien. Úsalas.', 'En el norte se habla poco y se hace mucho. Tú haces bastante. Hablas también, pero te perdono.']);
      return pick(['¿Un sureño? En mi casa no se entra sin sacarse la nieve de las botas.', 'Hace mucho que no viene nadie del sur. El último no traía buenas intenciones.']);
    },
    options: (ctx) => [
      { label: '¿Por qué está congelado el reino?', next: reyCaido(ctx) ? 'invierno_fin' : 'invierno' },
      { label: '¿Quién es usted?', next: 'quien' },
      bye,
    ],
    lines: {
      invierno: 'Mi hijo, el Rey, congeló el norte hace diez años. Los sureños dicen que se volvió loco. Los norteños dicen que nos castigó. Yo digo que mi hijo nunca hizo nada sin una razón, y que esa razón está debajo del hielo.',
      invierno_fin: 'Lo congeló para frenar el Quinto Sello. Su esposa se lo pidió antes de morir. Diez años sosteniendo el frío solo, sin poder contárselo a nadie: ni a sus hijos, ni a su madre. *mira el fuego* Ahora el Sello está renovado y él descansa. Eso es lo que hacen los reyes de verdad: cargan cosas que nadie ve.',
      quien: 'Hrafna. La madre del Rey del Hielo y la abuela de dos chicos que no se hablan. Cuidé este reino cuando mi hijo era chico, y lo cuido ahora que él no puede. Ya estoy vieja para esto. Pero nadie más se ofrece.',
    },
  },
  // Eirik en el Lago de Cristal, antes de que lo traigas (T4)
  eirik_lago: {
    name: 'Eirik', role: 'El Príncipe del Hielo', portrait: PORTRAIT('eirik'),
    ambient: ['*mira el hielo, inmóvil*', 'Debajo hay algo que respira.', '*patea la nieve*'],
    greet: (ctx) => (enCurso(ctx, 'TUNDRA_HISTORIA_04_PRINCIPE')
      ? '¿Te manda mi abuela? *no se da vuelta* Vamos. Pero yo camino adelante.'
      : pick(['No me molestes. Estoy mirando el hielo.', '¿Sureño? Vuelve al sur. Aquí no hay nada para ti.', 'Si te mandó mi padre, dile que no.'])),
    options: () => [{ label: '¿Qué buscas en el hielo?', next: 'hielo' }, bye],
    lines: {
      hielo: 'Mi hermana dice que debajo del hielo está nuestra madre. Que nuestro padre la encerró ahí. Yo vengo cada noche a mirar. No veo nada. Pero a veces el hielo brilla, y siento que alguien me mira desde abajo.',
    },
  },
  // Eirik en la casa larga: el príncipe que quiere salvar a su padre y a su hermana
  eirik: {
    name: 'Eirik', role: 'El Príncipe del Hielo', portrait: PORTRAIT('eirik'),
    ambient: (ctx) => [
      '*afila una espada que no usa*',
      'No me digas «alteza».',
      ...(perdono(ctx) ? ['Hela, ¡devuelve mi capa!'] : juzgo(ctx) ? ['*mira hacia el sur*'] : ['*mira la puerta, como esperando a alguien*']),
    ],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y? Dime cómo salió. Sin rodeos. Los rodeos son para los sureños.';
      if (ctx.mark === '!') return 'Te necesito. No me gusta decirlo, así que no me hagas repetirlo.';
      if (perdono(ctx)) return pick(['Hela y yo patinamos en el Lago ayer. Ganó ella. Como siempre. Gracias, sureño. De verdad.', 'Mi hermana se ríe otra vez. Me había olvidado de cómo sonaba.']);
      if (juzgo(ctx)) return pick(['Le escribo a Hela cada semana. Ella me contesta todas. Diez años sin una carta y ahora no para.', 'Fue justo. Lo sé. Igual la extraño.']);
      if (reyCaido(ctx)) return pick(['Mi padre se fue sonriendo. ¿Lo viste? Sonrió.', 'Ahora me toca decidir qué hacemos con Hela. Y no quiero decidirlo solo.']);
      if (hecho(ctx, 'TUNDRA_HISTORIA_12_HERMANOS')) return pick(['Hela leyó la carta de mamá. Lloró toda la noche. Yo también. No se lo digas a nadie.', 'Mi hermana está en casa. Después de diez años. No sé qué decirle. Le hago té. Mucho té.']);
      if (hecho(ctx, 'TUNDRA_HISTORIA_06_BRUJA')) return pick(['Hela. Mi hermana. La de blanco en la ventisca.', 'No la odies. Le mintieron. Odia a los que le mintieron.']);
      return pick(['Mi abuela dice que confíe en ti. Estoy en eso.', 'Este cuarto era mío. Ahora es demasiado chico. O yo demasiado grande.']);
    },
    options: (ctx) => [
      { label: '¿Qué pasó con tu familia?', next: 'familia' },
      ...(hecho(ctx, 'TUNDRA_HISTORIA_06_BRUJA') ? [{ label: 'Háblame de tu hermana', next: perdono(ctx) || juzgo(ctx) ? 'hela_despues' : 'hela' }] : []),
      bye,
    ],
    lines: {
      familia: 'Mi madre murió un invierno. Al siguiente, mi padre congeló el reino y no volvió a hablar con nadie. Hela se fue con unos de capa negra. Yo me fui al Lago, a mirar el hielo. Mi abuela se quedó sola con todo. Somos una familia muy norteña: nadie se queja y todos sufren.',
      hela: 'De chicos éramos inseparables. Ella patinaba mejor, yo nadaba mejor, y los dos le teníamos miedo a la abuela. Cuando murió mamá, Hela dejó de hablarme. Después se fue. Yo debería haberla seguido. No lo hice. Eso me lo voy a reprochar siempre.',
      hela_despues: 'Hela está aprendiendo a vivir sin odiar a nadie. Es difícil, dice. Odiar ocupa mucho lugar, y cuando se va queda un hueco enorme. Yo le digo que lo llene con algo. Ella dice que lo está llenando con té. Mucho té.',
    },
  },
  // Hela en la casa larga: después de la T13 y si la perdonaste (o antes de que te la lleves)
  hela: {
    name: 'Hela', role: 'La hija del Rey del Hielo', portrait: PORTRAIT('hela'),
    ambient: (ctx) => (perdono(ctx) ? ['*quema el pan otra vez*', 'Abuela, ¡no estaba quemado! Estaba tostado.', '*mira la Grieta por la ventana*'] : ['*mira el fuego sin parpadear*', '*se abraza las rodillas*']),
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Qué decidiste? Dímelo. No me voy a enojar. Ya no tengo fuerzas para enojarme.';
      if (perdono(ctx)) return pick(['Cuido el Sello todos los días. Bajo a la Grieta y escucho. Está tranquilo. Como yo, casi.', 'Gracias por dejarme quedar. No sé si lo merezco. Pero voy a intentar merecerlo.', 'Eirik me dejó una carta en la Grieta. Dice «perdón» y algo más. No te digo qué. Es mío.']);
      return pick(['Mi padre se fue. Mi madre también. Solo quedan mi abuela, mi hermano y lo que hice.', 'No me mires así. Ya sé lo que hice.']);
    },
    options: () => [{ label: 'Háblame de tu madre', next: 'madre' }, { label: '¿Por qué ayudaste a los Ocultos?', next: 'ocultos' }, bye],
    lines: helaLines,
  },
  // Hela en Aurelia, junto a Elenya, si elegiste la justicia
  hela_aurelia: {
    name: 'Hela', role: 'La hija del Rey del Hielo', portrait: PORTRAIT('hela'),
    ambient: ['*mira el Pilar*', 'Aquí hace calor. Demasiado.', '*escribe una carta*'],
    greet: (ctx) => pick([
      'Le conté a la sacerdotisa todo lo que sé de los Ocultos. Todo. Hasta lo que me daba vergüenza.',
      'Mi hermano me escribe cada semana. Le contesto todas. Dice que en el norte el fiordo ya tiene agua.',
      ctx.night ? 'De noche miro al norte. Desde aquí no se ve la aurora. La extraño.' : 'Elenya me deja ayudar en la enfermería. Curo con frío: bajo la fiebre. Es lo único bueno que sé hacer con el hielo.',
    ]),
    options: () => [{ label: 'Háblame de tu madre', next: 'madre' }, { label: '¿Por qué ayudaste a los Ocultos?', next: 'ocultos' }, bye],
    lines: helaLines,
  },

  // ---------------------------------------------------------------- Fiordo Blanco
  // Sigrún: la herrera de la Forja de la Casa Larga; desafía a Brokk y a Ignar
  sigrun: {
    name: 'Sigrún', role: 'Herrera de Fiordo Blanco', portrait: PORTRAIT('sigrun'),
    ambient: ['*golpea el yunque*', '¡El hierro del sur es mantequilla!', 'El hielo eterno no se funde: se convence.', '*se seca la frente con el antebrazo*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Trajiste lo que te pedí? Muéstrame. Rápido, que el fuego no espera.';
      if (ctx.mark === '!') return '¡Tú! Tienes piernas largas. Necesito un cartero.';
      if (hecho(ctx, 'TUNDRA_SEC_FORJAS')) return pick(['«Aceptable», dijo el enano. ACEPTABLE. Lo voy a enmarcar.', 'El año que viene: concurso de las tres forjas. Tú haces de juez. Y no te dejes sobornar. Salvo por mí.']);
      return pick(['Bienvenido a la Forja de la Casa Larga. Si es de hielo eterno, lo forjo. Si es de hierro del sur, me río y después lo forjo.', 'Tráeme hielo eterno, colmillos y zarpas, y te hago algo que no se rompe nunca.']);
    },
    options: () => [
      { label: 'Usar la forja', window: 'taller' },
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Qué es el hielo eterno?', next: 'hielo' },
      bye,
    ],
    lines: {
      hielo: 'Hielo que no se derrite. Ni en mi fragua, ni en la boca de un dragón. Sale de las vetas de la Torre de Cristal y de la Grieta. Dicen que es el frío del primer invierno del mundo, que se quedó a vivir en la piedra. Yo digo que es el mejor metal que hay. Y no es metal. Eso es lo lindo.',
    },
  },
  // Gunnhild: la posadera de El Cuerno Caliente; grita brindis
  gunnhild: {
    name: 'Gunnhild', role: 'Posadera de El Cuerno Caliente', portrait: PORTRAIT('gunnhild'),
    ambient: ['¡POR EL NORTE!', '¡Otra ronda!', '¡Hidromiel caliente! ¡Para el frío y para el alma!', '*levanta un cuerno enorme*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¡LLEGÓ! ¡A ver qué trajo! ¡Si son flores, brindamos! ¡Si no, también!';
      if (ctx.mark === '!') return '¡SUREÑO! ¡Necesito un favor! ¡Y después brindamos!';
      if (perdono(ctx)) return pick(['¡La hija del rey viene a ayudar a la cocina! ¡Quema todo! ¡La adoro!', '¡POR LOS HERMANOS DEL HIELO! ¡Que vivan!']);
      if (reyCaido(ctx)) return pick(['¡Por el Rey del Hielo! *se le quiebra la voz* Por el Rey. Que descanse.', '¡El fiordo tiene agua! ¡AGUA! ¡Mañana pescamos en barco como antes!']);
      return pick(['¡Bienvenido a El Cuerno Caliente! ¡Pasa, siéntate, come y no te vayas sin brindar!', '¡Tengo estofado de mamut, pescado a la brasa y hidromiel! ¡Tráeme lo que cazas y te lo cocino!']);
    },
    options: () => [
      { label: 'Cocinar', window: 'taller' },
      { label: '¿Qué se come en el norte?', next: 'comida' },
      bye,
    ],
    lines: {
      comida: '¡Todo lo que te calienta! El pescado glacial a la brasa, con la piel crujiente. El pan de centeno con grasa de foca, que pesa como una piedra y te deja andar un día entero. La sopa de raíces con jabalí. El estofado de mamut, que es para los días grandes. ¡Y el hidromiel! La miel sale de las abejas de la flor de escarcha. ¡No hay nada igual en el mundo!',
    },
  },
  // Skadi: la domadora de perros de trineo (los trineos llegan en la tanda 6)
  skadi: {
    name: 'Skadi', role: 'Domadora de perros de trineo', portrait: PORTRAIT('skadi'),
    ambient: ['¡Quieto, Copo!', '*silba y seis perros se sientan*', 'Los perros saben antes que nadie cuándo viene la ventisca.', '*rasca una oreja peluda*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿La encontraste? Mis perros están nerviosos desde que la olieron.';
      if (ctx.mark === '!') return 'Ven. Mis perros olieron algo que no me gusta.';
      if (hecho(ctx, 'TUNDRA_SEC_MAMUT')) return pick(['La cría de mamut viene a visitar a los perros. Se llevan bien. Los perros le tienen miedo, pero se llevan bien.', 'Los mamuts recuerdan para siempre. Te van a recordar.']);
      return pick(['¿Te gustan los perros? Si no, no te acerques. Si sí, tampoco: muerden por cariño.', 'En la tundra el que no tiene trineo camina. Y el que camina, se congela. Algún día te llevo.']);
    },
    options: () => [...trineoOpciones('fiordo'), { label: '¿Para qué son los trineos?', next: 'trineos' }, bye],
    lines: {
      trineos: 'Para cruzar la tundra sin morir en el intento. Mis perros conocen cada camino, cada grieta y cada hoguera. Mi hermana Kari espera en la Aldea de los Mamuts y mi hermano Leif en el Campamento de los Cazadores: te llevamos de una parada a otra, siempre que ya hayas llegado a pie una vez. Los perros no confían en quien no conoce el camino.',
    },
  },
  // Tilo: ya soldado del puerto, de vacaciones en la nieve (después de la T4)
  tilo_tundra: {
    name: 'Tilo', role: 'Soldado del puerto (de vacaciones)', portrait: PORTRAIT('tilo_soldado'),
    ambient: ['¡NIEVE!', '*se tira de espaldas a hacer un ángel de nieve*', '¡Tengo frío! ¡Me encanta!', 'Bastida me dio vacaciones. Bueno, me echó.'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y? ¿Y? ¿Lo encontraste? ¡Dime que sí!';
      if (ctx.mark === '!') return '¡Eh! ¡Ven! ¡Tengo un plan! ¡Es un plan de nieve!';
      if (hecho(ctx, 'TUNDRA_SEC_MUNECO_2')) return pick(['Las focas siguen con mi muñeco. Lo visitan. Le llevan pescado. Creo que lo eligieron rey.', 'Anka me escribió. Dice que le devuelva el pañuelo. ¡Lo tiene una foca!']);
      return pick(['¡Nunca vi tanta nieve! ¡En el sur la nieve dura un día y es gris!', '¡Hice un ángel de nieve! Bueno, parece una papa. Pero una papa con alas.']);
    },
    options: () => [{ label: '¿Cómo están en el puerto?', next: 'puerto' }, bye],
    lines: {
      puerto: '¡Bien! Bastida escribe el reglamento nuevo. Va por el artículo noventa. El noventa dice «no traer caballos a los barcos». Lo escribió por Trueno. Y Anka… Anka está bien. Muy bien. Me regaló un pañuelo. Que ahora tiene una foca. Larga historia.',
    },
  },

  trineo_aldea: conductor('aldea', 'Kari', [
    '¡Arriba, arriba! Los perros quieren correr. ¿Tú también?',
    'Mi hermana Skadi manda. Yo conduzco. Los perros hacen lo que quieren.',
  ], ['*acaricia a un perro enorme*', '¡Quieto, Trueno! No, el caballo no. El perro.', 'Los mamuts nos miran raro.']),
  trineo_campamento: conductor('campamento', 'Leif', [
    'Los cazadores no me pagan. Los perros sí: con lametazos. ¿Vas a algún lado?',
    'Desde aquí al Fiordo en un suspiro. Bueno, en muchos suspiros. Pero rápidos.',
  ], ['*ata un arnés*', 'Los perros huelen a los osos antes que nadie.', '*sopla las manos*']),

  // ---------------------------------------------------------------- afuera
  // Vigdis: la astrónoma de la Torre de Cristal; estudia la aurora
  vigdis: {
    name: 'Vigdis', role: 'Astrónoma de la Torre de Cristal', portrait: PORTRAIT('vigdis'),
    ambient: ['*mira el cielo con un cristal*', 'Verde, verde, morado. Mal.', 'Las estrellas no mienten. Los astrónomos, a veces.', '*anota números en una libreta*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Trajiste lo que te pedí? Déjalo ahí. No, ahí no. Ahí. Sí.';
      if (ctx.mark === '!') return 'Ah, sureño. Ven, mira por aquí. ¿Ves eso? No me gusta.';
      if (hecho(ctx, 'TUNDRA_SEC_AURORA_2')) return pick(['La aurora está más verde cada noche. El morado se va.', 'Escribí un libro sobre la aurora. Tiene tres lectores: yo, tú y el búho de la ventana.']);
      if (hecho(ctx, 'TUNDRA_HISTORIA_03_TORRE')) return pick(['La torre ya no late. Gracias. Ahora puedo dormir. Bueno, de día.', 'Desde aquí arriba veo todo: el lago, el palacio, la grieta. Y lo que se mueve en la nieve de noche.']);
      return pick(['La torre brilla morada desde la luna de sangre. Y late. Las torres no laten.', 'Cuidado con la escalera. Tiene trescientos escalones y uno está flojo. No sé cuál.']);
    },
    options: () => [{ label: '¿Qué es la aurora?', next: 'aurora' }, bye],
    lines: {
      aurora: 'Los norteños dicen que es el aliento de un lobo gigante que corre por el cielo. Yo digo que es luz que viene de muy lejos y choca con el frío. Las dos cosas son ciertas, creo. Desde el eclipse tiene hilos morados, y eso no es ni lobo ni luz: es otra cosa. Algo que sube desde abajo del hielo.',
    },
  },
  // Ulrich: el cazador que vendió el mapa del Sello a los Ocultos
  ulrich: {
    name: 'Ulrich', role: 'Cazador del Hielo', portrait: PORTRAIT('ulrich'),
    ambient: (ctx) => (hecho(ctx, 'TUNDRA_SEC_ULRICH') ? ['*talla madera en vez de trampas*', 'Ahora hago juguetes. Para los chicos del Fiordo.'] : ['*fuma una pipa apagada*', 'Treinta años cazando.', '*mira el fuego*']),
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Lo hiciste? Siéntate. Cuéntame.';
      if (ctx.mark === '!') return 'Sureño. Necesito arreglar algo que rompí. No puedo solo.';
      if (hecho(ctx, 'TUNDRA_SEC_ULRICH')) return pick(['Fundí las trampas. Hice cucharas. Treinta cucharas. Nadie necesita treinta cucharas.', 'Ya no cazo. Ahora tallo. Los chicos del Fiordo tienen muñecos de mamut. Es algo.']);
      if (hecho(ctx, 'TUNDRA_HISTORIA_05_CAZADORES')) return pick(['Vendí el camino al Sello por oro. No me lo voy a perdonar.', 'El oro sureño pesa más de lo que parece.']);
      return pick(['¿Qué quieres? Aquí no hay nada para comprar. Bueno, pieles. ¿Quieres pieles?', 'El campamento no es lugar para sureños. Ni para nadie, últimamente.']);
    },
    options: () => [{ label: '¿Qué cazan aquí?', next: 'caza' }, bye],
    lines: {
      caza: 'Osos, jabalíes, a veces un mamut viejo que ya no puede con el invierno. Lo justo para vivir. Hasta que vino el de capa negra con oro sureño. Ahí empezamos a cazar otra cosa: caminos. Mapas. Secretos. Eso no se caza: se vende. Y lo que se vende no vuelve.',
    },
  },
  // Ren: el guardabosque de la Pradera, de explorador en el Bosque de Pinos Blancos
  ren_tundra: {
    name: 'Ren', role: 'Guardabosque (de explorador)', portrait: PORTRAIT('ren'),
    ambient: ['*anota en su libreta con los dedos azules*', 'Frío. Frío. Frío.', 'Los pinos blancos son hermosos.', '*estornuda*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y? ¿Qué viste? ¡Cuéntame todo! Despacio, que anoto.';
      if (ctx.mark === '!') return '¡Eh! ¡Tú! ¡Necesito ayuda con algo raro!';
      if (hecho(ctx, 'TUNDRA_SEC_EXPLORADOR_2')) return pick(['¿Marta te dijo algo? ¿Que vuelva? ¡Vuelvo en primavera! Bueno, en verano. Bueno, cuando se derrita.', 'Le escribí a Marta otra carta. Esta tiene más tachones que la primera.']);
      return pick(['¡Ren, de la Pradera! ¿Te acuerdas? Me vine a ver los pinos blancos. Y me quedé a ver todo lo demás.', 'En la Pradera los lobos aúllan. Aquí no. Cazan en silencio. Me da escalofríos. Bueno, me da escalofríos todo, hace mucho frío.']);
    },
    options: () => [{ label: '¿Qué haces tan al norte?', next: 'norte' }, bye],
    lines: {
      norte: 'Un guardabosque tiene que conocer todos los bosques. Eso me dije. Después vi cuánto frío hacía y me arrepentí. Después vi los pinos blancos al amanecer y me desarrepentí. Así estoy: arrepintiéndome y desarrepintiéndome cada mañana.',
    },
  },
};
