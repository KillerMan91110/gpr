// Diálogos de las Costas Muertas (el Puerto Antiguo, Coralia, la Cala, el Manglar y el Faro Negro).
// Mismo formato que dialogues.js. Lo que dicen sigue la historia de cada jugador (C1-C14, ver
// gprback/docs/zona4_costas.md): nadie te agradece algo que no hiciste.

import { enFase } from './story';

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const bye = { label: 'Adiós', close: true };
// igual que en dialogues.js
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);
const enCurso = (ctx, code) => enFase(ctx?.fase, `${code}@activa`);

// Los botes de Marul (gprback/lib/botes.js): Marul en Coralia y sus primos Sargo (la Cala) y Bagre (el
// Cementerio); cada uno te lleva a los otros dos muelles
const EMBARCADEROS = { coralia: 'el embarcadero de Coralia', cala: 'la Cala de los Piratas', cementerio: 'el Cementerio de Barcos' };
const boteOpciones = (aqui) => Object.entries(EMBARCADEROS).filter(([k]) => k !== aqui)
  .map(([k, lugar]) => ({ label: `Ir en bote a ${lugar} (25 de oro)`, action: 'bote', destino: k }));
const barquero = (aqui, name, saludo, ambient) => ({
  name, role: 'Barquero de Coralia', portrait: PORTRAIT('marul'), ambient,
  greet: () => pick(saludo),
  options: () => [...boteOpciones(aqui), { label: '¿Es seguro el bote?', next: 'seguro' }, bye],
  lines: {
    seguro: 'Más seguro que caminar por el Manglar. Remamos nosotros, que conocemos cada canal y cada roca. Solo te llevamos a un muelle que ya pisaste: si no, ¿cómo sabemos que no nos vas a pedir que paremos en medio del mar a buscar un zapato?',
  },
});

// Rhaegar tiene tres puntos en el mapa (la Cala, la celda y el muelle): habla igual en los tres
const rhaegarLines = {
  galleta: 'Galleta. El loro. Lo encontré en un barco de los Ocultos, encerrado en una jaula con un cristal de eclipse. Repetía «Fosa, Fosa, Fosa». Le di una galleta y no se calló nunca más. Es el mejor marinero de mi tripulación. No le digas a Anka.',
  ocultos: 'Hace diez años un barco sin bandera hundió el mío frente al Faro. No por oro: por cristales. Los llevaban a la Fosa, donde está la Bestia. Desde entonces les robo cada cargamento que puedo y lo tiro al fondo del mar. Tu capitán me llama pirata. Tiene razón. Pero un pirata con propósito.',
};

export const DIALOGUES_COSTAS = {
  // ---------------------------------------------------------------- Puerto Antiguo
  // Osvaldo Bastida: el capitán del puerto, honesto, aburrido y con un secreto en el libro de amarres
  bastida: {
    name: 'Osvaldo Bastida', role: 'Capitán del puerto', portrait: PORTRAIT('bastida'),
    ambient: (ctx) => [
      'Artículo tercero: «no correr en el muelle».',
      'Día cuarenta y uno sin incidentes. Bueno, sin incidentes graves.',
      '*hojea el reglamento*',
      ...(hecho(ctx, 'COSTAS_HISTORIA_09_ALIANZA') ? ['Debería haber un artículo sobre barcos sin bandera. Lo estoy escribiendo.'] : ['Los martes llega un barco. Paga puntual. Muy puntual.']),
    ],
    greet: (ctx) => {
      const { mark, night } = ctx;
      if (mark === '?') return 'Ah. Volvió. Siéntese. No, ahí no, que esa silla es del reglamento. Cuénteme.';
      if (mark === '!') return 'Disculpe. ¿Tiene un momento? El reglamento dice que en caso de emergencia hay que pedir ayuda. Le estoy pidiendo ayuda.';
      if (hecho(ctx, 'COSTAS_Q3_BESTIA_PROFUNDIDADES')) return pick(['El mar está tranquilo. Lo anoté en el libro: «mar tranquilo». Hace años que no escribía eso.', 'Rhaegar y yo jugamos a las cartas los jueves. Me hace trampa. Lo dejo. Es lo justo.']);
      if (hecho(ctx, 'COSTAS_HISTORIA_09_ALIANZA')) return pick(['Les vendí el amarre durante años. No voy a olvidarlo. Pero voy a arreglarlo.', 'Rhaegar dice que soy un buen hombre con malos libros. Es lo más amable que me dijo nadie.']);
      if (hecho(ctx, 'COSTAS_Q1_CAZADOR_PIRATAS')) return pick(['Rhaegar está en la celda. Canta. Toda la noche. Canciones de marineros con letras que el reglamento no permite.', 'Dice que caza sombras. Yo digo que roba barcos. Los dos tenemos razón, y eso me molesta.']);
      return night
        ? pick(['El faro está apagado otra vez. Bueno, encendido en negro. Que es peor.', 'De noche vienen los piratas. Yo estoy despierto. Con el reglamento.'])
        : pick(['Bienvenido al Puerto Antiguo. Tiene trescientos años, cuarenta y dos artículos de reglamento y un capitán. Ese soy yo.', 'Si busca a alguien, pregúnteme. Tengo a todos anotados. Con buena letra.']);
    },
    options: (ctx) => [
      { label: '¿Qué pasa en el puerto?', next: hecho(ctx, 'COSTAS_HISTORIA_12_BARCO') ? 'puerto_despues' : 'puerto' },
      { label: '¿Qué hay en la costa?', next: 'costa' },
      bye,
    ],
    lines: {
      puerto: 'Antes llegaban barcos de todo Etheria: sal, pescado, perlas de los tritones. Ahora vienen piratas de noche, el faro alumbra en negro y los pescadores no salen. El Puerto Antiguo se está quedando sin puerto. Y el reglamento no dice qué hacer cuando todo pasa a la vez.',
      puerto_despues: 'El barco sin bandera está en el fondo del Cementerio y los pescadores vuelven a salir. Ayer entró un barco de sal. ¡De sal! Lo anoté con letra grande. Cuando quiera, el Puerto Antiguo es su casa. Lo dice el artículo cuarenta y tres. Lo escribí ayer.',
      costa: 'Al norte, la Playa de Ceniza Negra: la arena es negra por el volcán y los cangrejos son del tamaño de una carreta. Al oeste, el Delta y el Manglar, donde vive Cieno. Más allá, la Cala de los Piratas. Al sur, el Arrecife Blanco, las Rocas de las Sirenas, el Cementerio de Barcos y el Faro Negro. Y al lado del puerto, Coralia, la ciudad de los tritones. Sobre el agua. No me pregunte cómo.',
    },
  },
  // Tilo: el chico de la Aldea Espiga, ahora soldado (de guardia, del muelle) del Puerto Antiguo
  tilo_puerto: {
    name: 'Tilo', role: 'Soldado del puerto', portrait: PORTRAIT('tilo_soldado'),
    ambient: (ctx) => [
      '¡Firmes! …Bueno, más o menos firmes.',
      '¿Viste mi yelmo? Es del puerto.',
      ...(hecho(ctx, 'COSTAS_SEC_AMOR_3') ? ['*suspira mirando hacia la Cala*', 'Anka dice que mi yelmo es ridículo. Me lo pidió prestado.'] : ['Las gaviotas me robaron el almuerzo. Otra vez.']),
    ],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Y? ¿Y? ¿Qué pasó? ¡Cuéntame todo!';
      if (mark === '!') return hecho(ctx, 'COSTAS_HISTORIA_09_ALIANZA') ? 'Oye… ¿puedo pedirte un favor? Uno raro. Uno del corazón.' : '¡Eh! ¡Tengo una misión! Bueno, la tiene el capitán. Pero yo te aviso.';
      if (hecho(ctx, 'COSTAS_SEC_AMOR_3')) return pick(['Anka viene al muelle los domingos. Hablamos de barcos. Bueno, ella habla y yo me caigo al agua.', '¡Me dijo que sí! ¡Tres veces! Ya te lo conté. Te lo cuento otra vez.']);
      if (hecho(ctx, 'COSTAS_HISTORIA_12_BARCO')) return pick(['¡Hundiste el barco sin bandera! Yo lo vi desde el muelle. Bueno, vi humo. Pero fue increíble.', 'El capitán me dejó usar la campana. ¡La toqué tres veces! Se me cayó el yelmo.']);
      return pick(['Aldren me escribe cada mes. Dice que la Aldea te extraña. Y que me lave las orejas.', 'Desde que me fui de la Aldea crecí un montón. Medio dedo. Pero un montón.', 'Cuido el muelle. Es un trabajo importante. El muelle no se va a ningún lado, pero lo cuido igual.']);
    },
    options: () => [
      { label: '¿Cómo terminaste aquí?', next: 'llegada' },
      bye,
    ],
    lines: {
      llegada: 'Durgan me mandó al puerto con una carta para el capitán: «este chico sirve, pero hace mucho ruido». ¡Y me dio trabajo! Me dieron yelmo, lanza y un muelle. La lanza me la quitaron porque pinché un barril de ron. Pero el yelmo me lo dejaron.',
    },
  },
  // Brea: la carpintera de ribera del astillero; habla poco, hace barcos y armas de coral
  brea: {
    name: 'Brea', role: 'Carpintera de ribera', portrait: PORTRAIT('brea'),
    ambient: ['*toc toc toc*', 'Madera de naufragio. La mejor.', 'Ese casco no flota. Todavía.', 'Hmm.'],
    greet: (ctx) => {
      const { mark, night } = ctx;
      if (mark === '?') return 'A ver. Hmm. Sirve.';
      if (mark === '!') return 'Tú. Trabajo. ¿Sí o no?';
      if (hecho(ctx, 'COSTAS_HISTORIA_12_BARCO')) return pick(['El barco sin bandera era bueno. Bien hecho. Lástima.', 'Me traje un tablón del barco negro. No se pudre. Lo estoy estudiando.']);
      return night
        ? pick(['Tarde. Igual entra.', 'De noche se oye la madera. Me dice qué tabla cambiar.'])
        : pick(['Astillero. Barcos y armas. Coral y madera de naufragio.', 'Coral rojo, duro. El blanco se parte. Tráeme rojo.']);
    },
    options: () => [
      { label: 'Usar el astillero', window: 'taller' },
      { label: '¿Qué haces con el coral?', next: 'coral' },
      bye,
    ],
    lines: {
      coral: 'El coral rojo es más duro que el hierro y no se oxida con el mar. Lo corto, lo pulo y lo engarzo en madera de naufragio, que ya aguantó todo lo que el mar le hizo. Así salen las armas de la Marea y las de Coral. Con lo del Arrecife Hundido, las del Abismo. Pero eso no lo hace cualquiera. Lo hago yo.',
    },
  },
  // Doña Almeja: la cocinera del mercado de pescado; grita «¡FRESCO!» aunque no lo sea
  almeja: {
    name: 'Doña Almeja', role: 'Cocinera', portrait: PORTRAIT('almeja'),
    ambient: ['¡FRESCO! ¡Todo FRESCO!', '¡Sopa de cangrejo! ¡En su caparazón!', '¿Ostras? ¡Ostras!', 'Ese pescado me miró feo.'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¡A ver, a ver! ¿Lo traes? ¡Huele a mar! ¡Huele a FRESCO!';
      if (mark === '!') return '¡Tú! ¡Sí, tú! ¡Con esa cara de hambre! Tengo un trabajito.';
      if (hecho(ctx, 'COSTAS_SEC_LORO_2')) return pick(['Ese loro me sigue llamando «sopa aguada». Desde el muelle. Lo escucho.', '¿Sabes qué le doy al loro ahora? Sopa. Aguada. A ver si aprende.']);
      if (hecho(ctx, 'COSTAS_SEC_FRESCO')) return pick(['¡Gracias a ti hay sopa todos los días! Bueno, casi todos.', 'Cieno dice que el guiso de cocodrilo es receta suya. MENTIRA. Bueno, un poco.']);
      return pick(['¡Bienvenido al mercado de pescado! ¡Todo fresco! Bueno, lo de la izquierda no. Lo de la izquierda es de ayer.', 'Tráeme ostras, algas, cangrejo o lo que nade, y te preparo algo que te deje como nuevo.']);
    },
    options: () => [
      { label: 'Cocinar', window: 'taller' },
      { label: '¿Qué se come en la costa?', next: 'comida' },
      bye,
    ],
    lines: {
      comida: 'Todo lo que sale del mar y no te muerde primero. La ostra se come cruda con un poco de sal de las pozas, o a la brasa si eres delicado. El cangrejo gigante, en sopa y en su propio caparazón. El cocodrilo, en guiso, despacio. Y el calamar del abismo, en su tinta. Te deja los dientes negros, pero pegas como un ancla.',
    },
  },
  // Salitre: el mercader del muelle; compra lo que escupe el mar
  mercader_puerto: {
    name: 'Salitre', role: 'Mercader del puerto', portrait: PORTRAIT('salitre'),
    ambient: ['¡Perlas, conchas, escamas! ¡Compro y vendo!', 'Esto vale algo. Esto también. Esto… esto es una bota.', 'Los barcos no llegan, pero yo sigo aquí.', '*cuenta monedas mojadas*'],
    greet: (ctx) => {
      const { night } = ctx;
      if (hecho(ctx, 'COSTAS_HISTORIA_12_BARCO')) return pick(['¡Vuelven los barcos! ¡Vuelve el negocio! Pasa, pasa, que hoy estoy de buen humor.', 'Ayer llegó un barco de sal. Le compré toda la sal. No sé qué voy a hacer con tanta sal.']);
      return night
        ? pick(['¿A esta hora? Para un buen cliente el puesto no cierra.', 'De noche se vende poco y se ve mucho. Velas negras, por ejemplo. Yo no vi nada.'])
        : pick(['Bienvenido a mi puesto. Si lo escupe el mar, te lo compro. Si lo necesitas para el camino, te lo vendo.', 'Lo de la costa, en Aurelia vale una fortuna. Aquí, lo justo. Pero sin caminar.']);
    },
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Qué trae el mar?', next: 'mar' },
      bye,
    ],
    lines: {
      mar: 'De todo. Algas, ostras, cuerdas con brea, madera de barcos hundidos y, si tienes suerte, una perla. Cada mañana la marea deja cosas en la playa negra y yo las junto antes que las gaviotas. Las gaviotas me ganan casi siempre. Lo que traigas del mar, te lo pago mejor que en cualquier otra zona.',
    },
  },
  // Gaspar: el cochero de la Aldea Espiga, que siguió a Trueno hasta el mar
  gaspar_costas: {
    name: 'Gaspar', role: 'Cochero (sin diligencia, sin caballo)', portrait: PORTRAIT('cochero'),
    ambient: ['¡Truenooo! ¡Sal del agua!', 'Me mareo. Y eso que estoy en tierra.', 'Los caballos no nadan. ¿O sí?', 'Huele a pescado. Mucho.'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Lo encontraste? ¿Está mojado? ¿Está contento? ¿Está mojado Y contento?';
      if (mark === '!') return '¡Tú otra vez! ¿Adivinas qué pasó? Exacto. Trueno.';
      if (enCurso(ctx, 'COSTAS_SEC_TRUENO')) return 'Gris, mancha blanca, huele a algas. Si lo ves subido a un barco, es él. Ningún otro caballo es tan tonto.';
      if (hecho(ctx, 'COSTAS_SEC_TRUENO')) return pick(['Trueno ahora nada todas las mañanas. Dice Ondina que mejor que un tritón. Yo lo miro desde la orilla.', 'Volcán, montaña y mar. Este caballo conoce más Etheria que yo. Y yo soy cochero.']);
      return pick(['Bajé la Bajada de Basalto detrás de Trueno. Él, saltando. Yo, rodando.', '¿Sabes que aquí no hay caminos para la diligencia? Hay muelles. Los muelles no me sirven.']);
    },
    options: () => [
      { label: '¿Qué haces en el puerto?', next: 'aqui' },
      bye,
    ],
    lines: {
      aqui: 'Trueno olió el mar desde la Caldera. Te lo juro: levantó la cabeza, relinchó y salió corriendo por la Bajada de Basalto. Yo detrás, como siempre. Ahora él quiere ser marinero y yo quiero volver a la Aldea. Ninguno de los dos se va a salir con la suya.',
    },
  },

  // ---------------------------------------------------------------- Rhaegar (la Cala, la celda y el muelle)
  rhaegar: {
    name: 'Capitán Rhaegar', role: 'Pirata', portrait: PORTRAIT('rhaegar'),
    ambient: ['¡Galleta! ¡Baja de ahí!', 'Esta cueva es mía. El mar también. Bueno, casi.', '*afila el sable*', 'Barco sin bandera, barco hundido.'],
    greet: ({ mark }) => {
      if (mark === '?') return 'Así que hiciste el trabajo de tu capitán. Bien. Ahora hablemos de verdad.';
      return pick(['¿El perro de Bastida? Llegas tarde: ya robé lo que había que robar esta semana.', 'Bienvenido a mi Cala. Si vienes a pelear, pelea. Si vienes a hablar, siéntate. Si vienes a robar, ponte a la fila.']);
    },
    options: () => [{ label: '¿Quién es Galleta?', next: 'galleta' }, bye],
    lines: rhaegarLines,
  },
  rhaegar_preso: {
    name: 'Capitán Rhaegar', role: 'Pirata (preso)', portrait: PORTRAIT('rhaegar'),
    ambient: ['♪ Quince hombres sobre el cofre… ♪', '¡Bastida! ¡La sopa está fría!', 'Buena celda. He estado en peores.', '*silba*'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return 'Ah, mi carcelero favorito. Bueno, el de tu capitán. ¿Qué traes?';
      if (mark === '!') return 'Psst. Tú. Acércate. Tengo algo que contarte que tu capitán no quiere escuchar.';
      if (hecho(ctx, 'COSTAS_Q2_TRIDENTE_PERDIDO')) return 'Así que liberaste al rey de los tritones. Ahora libérame a mí. Tengo un barco que hundir y no lo puedo hacer desde aquí.';
      return pick(['Esta celda tiene buena vista. Al muelle. Por donde llega el barco sin bandera.', 'Tu capitán me trae sopa todos los días. Fría. A propósito, creo.']);
    },
    options: () => [{ label: '¿Por qué atacas barcos?', next: 'ocultos' }, { label: '¿Quién es Galleta?', next: 'galleta' }, bye],
    lines: rhaegarLines,
  },
  rhaegar_puerto: {
    name: 'Capitán Rhaegar', role: 'Capitán de La Gaviota Insolente', portrait: PORTRAIT('rhaegar'),
    ambient: (ctx) => [
      '¡Galleta! ¡Deja la oreja de Bastida!',
      'Viento del sur. Buen viento.',
      ...(hecho(ctx, 'COSTAS_HISTORIA_12_BARCO') ? ['Por el Almirante. *brinda al mar*'] : ['Velanegra está ahí afuera. La huelo.']),
    ],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Y bien? Cuéntamelo como se cuentan las cosas en un barco: con exageraciones.';
      if (mark === '!') return 'Tengo trabajo para ti. Del bueno. Del que da miedo.';
      if (hecho(ctx, 'COSTAS_Q3_BESTIA_PROFUNDIDADES')) return pick(['La Bestia canta de nuevo. ¿La oyes? Esa canción la escuché de niño. Pensé que no la iba a oír nunca más.', 'El Encapuchado huyó al norte, hacia el hielo. Cuando se abra el paso, La Gaviota Insolente te lleva. Gratis. Bueno, casi.']);
      if (hecho(ctx, 'COSTAS_HISTORIA_12_BARCO')) return pick(['El barco sin bandera está en el fondo. Diez años esperando esto. Sabe raro. Sabe bien.', 'Ahora queda la Bestia. Y el faro. Bartolo te está esperando: el viejo no duerme desde que le robaron la luz.']);
      return pick(['La Gaviota Insolente está lista para zarpar. Yo también. Tú, no sé.', 'Bastida me devolvió el sable. Lo había guardado en un cajón, con una etiqueta. «Sable de pirata. Peligroso.» Me emocioné.']);
    },
    // después de la C14, La Gaviota Insolente te lleva al norte, a Fiordo Blanco (gprback/lib/barco.js)
    options: (ctx) => [
      ...(hecho(ctx, 'COSTAS_Q3_BESTIA_PROFUNDIDADES') ? [{ label: 'Zarpar a Fiordo Blanco, en la Tundra', action: 'barco', destino: 'fiordo' }] : []),
      { label: '¿Por qué cazas a los Ocultos?', next: 'ocultos' }, { label: '¿Quién es Galleta?', next: 'galleta' }, bye,
    ],
    lines: rhaegarLines,
  },
  // Anka: la pirata del pañuelo rojo (y de Tilo)
  anka: {
    name: 'Anka', role: 'Pirata', portrait: PORTRAIT('anka'),
    ambient: ['¿Qué miras?', '*se acomoda el pañuelo*', 'El té no es de piratas. Me gusta igual.', 'Ese soldadito se cayó al agua. Ja.'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Y? No, no me cuentes. Bueno, sí.';
      if (mark === '!') return 'Oye. Tú que vas al puerto. ¿Le llevas algo a alguien? No es nada. Es una cosa.';
      if (hecho(ctx, 'COSTAS_SEC_AMOR_1')) return pick(['El soldadito escribe raro. Tacha todo. Me gusta.', 'No me preguntes por la carta. No pasó nada. Pasó un poco.']);
      return pick(['Soy Anka. La mejor ladrona de la Cala. Le robé el yelmo a un soldado. Bueno, se lo devolví. Bueno, me lo tiró él.', 'Rhaegar dice que soy demasiado blanda para pirata. Le robé las botas mientras dormía. Ya no lo dice.']);
    },
    options: () => [{ label: '¿Cómo es la vida en la Cala?', next: 'cala' }, bye],
    lines: {
      cala: 'Dormimos en la cueva, comemos lo que pescamos y robamos lo que lleva el eclipse. No todos los piratas son iguales: los de la Cala no le robamos a pescadores. Los otros, los Sin Nombre, le roban a cualquiera. Esos no son de Rhaegar. Esos son de Velanegra.',
    },
  },
  anka_puerto: {
    name: 'Anka', role: 'Pirata (de visita)', portrait: PORTRAIT('anka'),
    ambient: ['*mira de reojo a Tilo*', 'Este muelle no está mal.', 'El té del puerto es mejor que el de la Cala.', '¡Tilo! ¡Tu yelmo!'],
    greet: () => pick(['No vine por él. Vine por el té. Bueno, por los dos.', 'Si le cuentas a Rhaegar que me viste sonreír, te tiro al mar.', 'El soldadito me enseñó a tocar la campana. Toqué cinco veces. Bastida casi se desmaya.']),
    options: () => [bye],
    lines: {},
  },

  // ---------------------------------------------------------------- Coralia (los tritones)
  // Nerea: la Anciana Cantora, hija del rey de los tritones
  nerea: {
    name: 'Nerea', role: 'Anciana Cantora de Coralia', portrait: PORTRAIT('nerea'),
    ambient: (ctx) => [
      '*canta muy bajito*',
      'El mar recuerda todo. Nosotros también.',
      ...(hecho(ctx, 'COSTAS_Q3_BESTIA_PROFUNDIDADES') ? ['¿La oyes cantar? Está libre.'] : ['Padre… ¿me oyes desde el fondo?']),
    ],
    greet: (ctx) => {
      const { mark, night } = ctx;
      if (mark === '?') return 'Has vuelto, viajero del mundo seco. Siéntate en la estera. Cuéntame.';
      if (mark === '!') return hecho(ctx, 'COSTAS_HISTORIA_06_CORALIA') ? 'Escucha. Lo que tengo que pedirte no se pide dos veces.' : 'Un viajero del mundo seco. Hace mucho que nadie del mundo seco nos mira a los ojos.';
      if (hecho(ctx, 'COSTAS_Q3_BESTIA_PROFUNDIDADES')) return pick(['La Bestia canta en la Fosa. Los niños de Coralia bailan en las pasarelas. Hace cien años que no bailaban.', 'Volveremos al Arrecife pronto. Primero, a limpiarlo. Los Ocultos dejan mucho cristal y poco respeto.']);
      if (hecho(ctx, 'COSTAS_Q2_TRIDENTE_PERDIDO')) return pick(['Mi padre volvió en sí al final. Me alcanza con eso. Casi.', 'Ahora la Bestia. Mi padre la cuidó toda la vida. Nos toca a nosotros.']);
      return night
        ? pick(['De noche cantamos para que los niños duerman. Y para que el mar no se olvide de nosotros.', 'Mira el agua. Brilla. Son las algas. Antes brillaba todo el Arrecife así.'])
        : pick(['Bienvenido a Coralia. No es nuestra casa. Es donde vivimos mientras no podemos volver a casa.', 'Los tritones vivíamos en el Arrecife Hundido. Ahora vivimos sobre el agua, mirándola.']);
    },
    options: (ctx) => [
      { label: '¿Quiénes son los tritones?', next: 'tritones' },
      { label: '¿Qué es la Bestia?', next: hecho(ctx, 'COSTAS_Q3_BESTIA_PROFUNDIDADES') ? 'bestia_despues' : 'bestia' },
      bye,
    ],
    lines: {
      tritones: 'Somos el pueblo del mar: piel azul, aletas y ojos para ver en la oscuridad del fondo. Vivíamos en el Arrecife Hundido, una ciudad de coral bajo las olas, cuidando a la Bestia de las Profundidades como lo pidió Aethra. Cuando llegaron los Ocultos, hechizaron a mi padre, el rey, y nos echaron. Coralia es lo que construimos con lo que pudimos salvar.',
      bestia: 'La madre de todos los leviatanes, la Guardiana del Cuarto Sello. Duerme en la Fosa del Abismo y su sueño es el que mantiene el sello cerrado. Los Ocultos la encadenaron con cristales de eclipse y la luz negra del faro no la deja dormir. Una Bestia despierta es un sello abierto. Y un sello abierto es lo que quiere el Encapuchado.',
      bestia_despues: 'Duerme otra vez. No encadenada: dormida, como debe ser. El Cuarto Fragmento está con tu sacerdotisa, y el sello que queda es más fuerte que antes. Cuando la Bestia canta, los leviatanes jóvenes vuelven a la Fosa y el mar se calma. Gracias, viajero. Coralia no olvida.',
    },
  },
  // Marul: el barquero tritón, tímido y risueño (los botes, en la tanda de la marea)
  marul: {
    name: 'Marul', role: 'Barquero de Coralia', portrait: PORTRAIT('marul'),
    ambient: ['Jeje.', 'Remendar. Me gusta esa palabra.', '¡Esa gaviota se rió de mí!', '*anuda redes rapidísimo*'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¡Volviste! ¿Lo trajiste? ¡Jeje! ¡Lo trajiste!';
      if (mark === '!') return 'Ehm… hola. ¿Me ayudas? Es con las redes. Siempre es con las redes.';
      if (hecho(ctx, 'COSTAS_SEC_RED_2')) return pick(['¡Red llena todos los días! Doña Almeja me abraza. Huele a sopa.', 'Las gaviotas ya no se ríen. Bueno, se ríen menos.']);
      return pick(['Soy Marul. Remo, pesco y remiendo. Jeje. Remiendo.', 'El mar del mundo seco es raro. Tiene arena negra. Y botas. Muchas botas.']);
    },
    options: () => [...boteOpciones('coralia'), { label: '¿Qué hay en el agua?', next: 'agua' }, bye],
    lines: {
      agua: 'Ostras en las rocas, algas en el fondo, cangrejos que se comen las redes y pirañas en el Delta. Y en el sur, con la marea baja, se ven las pozas y los bancos de arena: ahí aparecen cosas que el mar esconde. Yo conozco todos los canales. Si quieres, te llevo en mi bote a la Cala o al Cementerio: mis primos Sargo y Bagre te esperan allá. Jeje.',
    },
  },
  // Nácar: la orfebre tritona, encanta el equipo con perlas y nácar
  nacar: {
    name: 'Nácar', role: 'Orfebre de Coralia', portrait: PORTRAIT('nacar'),
    ambient: ['Brillo. Más brillo.', '*pule una perla*', 'El nácar guarda la luz del fondo.', 'No toques eso. Está encantado. Y es mío.'],
    greet: ({ night }) => (night
      ? pick(['De noche el nácar brilla solo. Mira.', 'Trabajo mejor de noche. El mar está callado.'])
      : pick(['Bienvenido a mi taller. Aquí el equipo sale más fuerte y más bonito. Las dos cosas importan.', 'Las perlas del Arrecife guardan magia. Te la pongo en la espada, si quieres.'])),
    options: () => [
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Cómo se encanta con nácar?', next: 'nacar' },
      bye,
    ],
    lines: {
      nacar: 'El nácar es lo que la ostra hace con lo que le duele: lo envuelve, capa por capa, hasta que brilla. Con la magia es igual. La envuelvo en tu equipo, capa por capa, con una piedra de encantamiento, y queda pegada. Mi abuela lo hacía con el tridente del rey. Yo lo hago con lo que me traigas.',
    },
  },
  // Ondina: niña tritona que colecciona cosas del «mundo seco»
  ondina: {
    name: 'Ondina', role: 'Niña tritona', portrait: PORTRAIT('ondina'),
    ambient: ['¡Un botón! ¡Del mundo seco!', '¿Eso es un zapato? ¿Me lo das?', '*chapotea*', '¡Mi colección es la mejor de Coralia!'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Lo trajiste? ¿Es raro? ¿Es MUY raro?';
      if (mark === '!') return '¡Oye! ¡Tú eres del mundo seco! ¿Me ayudas con mi colección?';
      if (hecho(ctx, 'COSTAS_SEC_TESOROS_2')) return pick(['¡La flor tibia sigue tibia! Duerme conmigo. Bueno, al lado.', '¿Cuidas mi huevo? ¿Ya nació? ¿Qué es? ¡Avísame!']);
      if (hecho(ctx, 'COSTAS_SEC_TRUENO')) return '¡El caballo que nada viene a visitarme! Le doy algas. Le encantan.';
      return pick(['¡Hola! ¿Sabías que en el mundo seco la gente usa zapatos? ¡Para los PIES!', 'Tengo una cuchara, un botón y un zapato. Uno solo. ¿Tienes el otro?']);
    },
    options: () => [{ label: '¿Qué tienes en tu colección?', next: 'coleccion' }, bye],
    lines: {
      coleccion: 'Una cuchara, un botón, un zapato y… ¡ya está! Pero son tesoros. La cuchara es para comer sopa, eso me dijo Doña Almeja. El botón no sé para qué es. Y el zapato es para un pie, pero ¿dónde está el otro? Los del mundo seco pierden muchos zapatos. Seguro tienen muchos pies.',
    },
  },

  // los primos de Marul, en los otros dos muelles de los botes
  barquero_cala: barquero('cala', 'Sargo', [
    'Soy Sargo, primo de Marul. Él rema mejor. Yo remo más rápido.',
    '¿Al puerto? ¿Al Cementerio? Sube, que los piratas de aquí no muerden. Casi nunca.',
  ], ['¡Bote! ¡Bote al puerto!', 'Rhaegar me paga en ron. Yo no tomo ron.', '*achica agua del bote*']),
  barquero_cementerio: barquero('cementerio', 'Bagre', [
    'Soy Bagre. Primo de Marul. No me gusta este muelle: los muertos miran.',
    'Sube rápido, que se levanta la niebla y no me gusta la niebla.',
  ], ['Rápido, rápido…', 'Ese mástil se movió. Te juro que se movió.', '*rema sin mirar atrás*']),

  // ---------------------------------------------------------------- el Manglar y el Faro
  // Cieno: el pescador hosco del Manglar
  cieno: {
    name: 'Cieno', role: 'Pescador del Manglar', portrait: PORTRAIT('cieno'),
    ambient: ['Hmpf.', 'Ese tronco no es un tronco.', 'Guiso de cocodrilo. Receta mía.', 'Mis piernas. Me gustan mis piernas.'],
    greet: (ctx) => {
      const { mark } = ctx;
      if (mark === '?') return '¿Ya? ¿Tan rápido? Hmpf. A ver.';
      if (mark === '!') return 'Tú. Tienes cara de no tenerle miedo a los cocodrilos. Error tuyo. Pero me sirve.';
      if (hecho(ctx, 'COSTAS_SEC_MANGLAR')) return pick(['Me mojé los pies en el canal. Por primera vez en años. Qué fresquito.', 'El grande ya no está. Los chicos me miran con respeto. O con hambre.']);
      return pick(['Vivo en el Manglar porque nadie viene al Manglar. Hasta hoy.', 'Los cocodrilos, las pirañas y los susurros. No sé qué es peor. Los susurros.']);
    },
    options: () => [{ label: '¿Qué son los susurros?', next: 'susurros' }, bye],
    lines: {
      susurros: 'De noche, entre las raíces, se oyen voces. No son palabras: son como alguien cantando debajo del agua, muy lejos. Mi abuelo decía que es el canto de los tritones que se ahogaron. Yo digo que son las ranas. Pero a veces las ranas dicen mi nombre.',
    },
  },
  // Bartolo: el farero al que echaron de su faro
  bartolo: {
    name: 'Bartolo', role: 'Farero', portrait: PORTRAIT('bartolo'),
    ambient: (ctx) => (hecho(ctx, 'COSTAS_SEC_FARO_2')
      ? ['¡Mira esa luz! ¡Mira!', 'Treinta años. Y sigue girando.', '*silba contento*']
      : ['Mi faro…', 'Esa luz no alumbra. Llama.', '*mira el faro con la gorra en la mano*']),
    greet: (ctx) => {
      const { mark, night } = ctx;
      if (mark === '?') return '¿Y? ¿Lo hiciste? Dime que lo hiciste.';
      if (mark === '!') return hecho(ctx, 'COSTAS_HISTORIA_13_FARO') ? 'Un faro apagado es un faro muerto. Ayúdame a que vuelva a vivir.' : 'Tú. Tienes cara de los que suben escaleras. Necesito a uno de esos.';
      if (hecho(ctx, 'COSTAS_SEC_FARO_2')) return pick(['Los pescadores me saludan desde el agua. Desde el agua. Hace años que no me saludaba nadie.', 'Subo cada noche. Bueno, cada dos. El vértigo. Pero subo.']);
      if (hecho(ctx, 'COSTAS_HISTORIA_13_FARO')) return 'Está apagado. Mejor apagado que negro. Pero un faro apagado no sirve para nada.';
      return night
        ? 'Mírala. La luz negra. No alumbra el mar: lo llama. Y algo en el fondo le contesta.'
        : pick(['Treinta años encendiendo ese faro. Ahora vivo en la casita de abajo, mirándolo.', 'Los de túnica mojada me echaron una noche. Ni la gorra me dejaron sacar. Bueno, la gorra sí.']);
    },
    options: () => [{ label: '¿Qué pasó con el faro?', next: 'faro' }, bye],
    lines: {
      faro: 'El Faro Negro antes se llamaba Faro de Aethra. Mi abuelo lo encendía, su abuelo también. Un día llegaron los acólitos con túnicas que gotean agua aunque no llueva, me echaron y pusieron una lámpara de cristal morado. Desde entonces la luz es negra y la Bestia no duerme. Las cadenas bajan del embarcadero a la Fosa. No te acerques solo.',
    },
  },
};
