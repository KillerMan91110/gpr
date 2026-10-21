// Diálogos de Aurelia, la Ciudad del Pilar. Mismo formato que dialogues.js; además una opción
// puede tener `action` (ver pages/World.js): 'tour' (el guía te enseña la ciudad) o
// 'viaje' con `destino` (la diligencia).

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const bye = { label: 'Adiós', close: true };
// ¿este jugador ya completó esa misión? (igual que en dialogues.js)
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);

export const DIALOGUES_CIUDAD = {
  tomas: {
    name: 'Tomás', role: 'Guía de Aurelia', portrait: PORTRAIT('tomas'),
    greet: () => pick([
      '¡Te doy la bienvenida a Aurelia, la Ciudad del Pilar! Todo aventurero de Etheria empieza aquí. ¿Te enseño la ciudad?',
      '¡Hola, viajero! Si es tu primera vez en Aurelia, te acompaño a los sitios importantes.',
    ]),
    options: () => [
      { label: 'Enséñame la ciudad', action: 'tour' },
      { label: '¿Qué es el Pilar?', next: 'pilar' },
      { label: '¿Dónde aprendo mi oficio?', next: 'ordenes' },
      { label: '¿Cómo salgo de la ciudad?', next: 'salir' },
      bye,
    ],
    lines: {
      pilar: 'El Pilar honra a Aethra, la Dama de las Aguas. Dicen que el primer manantial de Etheria brotó justo aquí. Si le ofreces unas monedas, la diosa bendice tu camino durante un rato. Los domingos es el Festival de Aethra y la bendición es el doble.',
      ordenes: 'Al oeste está el Barrio de las Órdenes: el Cuartel del Acero de los guerreros, la Torre Arcana de los magos, el Campo del Halcón de los arqueros y una taberna oscura donde se reúnen los pícaros… si los encuentras. La Capilla de la Luz de los sacerdotes está junto a la catedral.',
      salir: 'La Puerta Sur da al Camino Real, que baja a la Pradera Dorada y a la Aldea Espiga. Si tienes prisa, la diligencia te lleva por unas monedas.',
    },
  },
  elenya: {
    name: 'Elenya', role: 'Sacerdotisa de Aethra', portrait: PORTRAIT('elenya'),
    greet: (ctx) => {
      // el final (R13 y R14 de las Ruinas Ancestrales): el epílogo
      if (hecho(ctx, 'RUINAS_HISTORIA_14_VIGIA')) return pick([
        'Vigía. Todavía me cuesta decirlo sin que me tiemble la voz. Te doy la bienvenida a casa.',
        'Seraphine me escribe cada semana desde el Santuario. Dice que los peregrinos le enseñaron a jugar a las cartas. Y que gana siempre.',
        'Los siete fragmentos duermen bajo el Pilar. A veces, de noche, el agua del Pilar brilla con siete colores. Nadie más se da cuenta. Nosotros sí.',
        'El Devorador sueña, y a veces su sombra sale por alguna grieta del mundo. Cuando pase, vas a sentirlo. Todos los Vigías lo sentían.',
      ]);
      if (hecho(ctx, 'RUINAS_HISTORIA_13_RITUAL')) return pick(['Me quedé sin voz de tanto cantar. Seraphine también. Nos reímos como dos chicas. Hacía años que no me reía así.', 'Ve con Brokk e Ignar, que tienen algo para ti. Y después vuelve: todavía falta algo.']);
      if (hecho(ctx, 'PRADERA_HISTORIA_14_MONTANAS') && Math.random() < 0.5) return pick(['El fragmento del Primer Sello descansa bajo el Pilar. El agua lo cuida mejor que cualquier guardia.', 'Rezo por ti cada mañana. Bueno, por ti y por las Montañas. Pero sobre todo por ti.']);
      return ctx.night
        ? 'La catedral nunca cierra. A esta hora el rosetón brilla con la luz de las velas. ¿Vienes herido?'
        : pick(['Que el agua de Aethra lave tus heridas, viajero.', 'Te doy la bienvenida a la Catedral de Aethra. Aquí curamos a quien lo necesite.']);
    },
    options: () => [
      { label: 'Curar a mi grupo', window: 'enfermeria' },
      { label: 'Háblame de Aethra', next: 'aethra' },
      bye,
    ],
    lines: {
      aethra: 'Aethra es la diosa del agua y de la vida. Cuando el mundo era polvo, lloró por él, y de sus lágrimas nacieron los ríos de Etheria. Por eso los que caen en batalla despiertan aquí, junto a su Pilar: ella no abandona a nadie.',
    },
  },
  marta: {
    name: 'Marta', role: 'Posadera de El Grifo Dorado', portrait: PORTRAIT('marta'),
    greet: (ctx) => {
      // la cadena de Ren (Pradera): lo que sabe Marta depende de lo que le llevaste
      if (hecho(ctx, 'PRADERA_SEC_MARTA_4')) return pick(['Ren me escribe desde las Montañas cada semana. Con faltas de ortografía. Me encanta.', 'Le tejí una bufanda a Ren. Dice que no se la saca ni para dormir. Mentiroso. Bueno, ojalá que no.']);
      if (hecho(ctx, 'PRADERA_SEC_MARTA_2')) return 'Las flores de cierto guardabosque brillan en mi ventana todas las noches. No le digas que las miro.';
      if (hecho(ctx, 'PRADERA_SEC_MARTA_1')) return '¿Ren te pidió que me trajeras la carta? Qué tímido. Qué… lindo. No le digas que dije lindo.';
      return ctx.night
        ? pick(['¡Pasa, pasa, que fuera refresca! La sopa todavía está caliente.', 'A estas horas la posada se llena de historias… y de mentiras.'])
        : pick(['¡Te doy la bienvenida a El Grifo Dorado! La mejor cerveza de Aurelia, y lo digo yo.', 'Si quieres dejar unas palabras para la posteridad, ahí está el libro de visitas.']);
    },
    options: () => [
      { label: 'Leer el libro de visitas', window: 'libro' },
      { label: '¿Alguna noticia?', next: 'noticias' },
      bye,
    ],
    lines: {
      noticias: 'Dicen que los lobos de la Pradera están más organizados que nunca, y que algo grande despertó al sureste. Los aventureros que vuelven de las Tierras Heridas no quieren hablar de lo que vieron. Yo que tú, iría bien acompañado.',
    },
  },
  durin: {
    name: 'Durin', role: 'Banquero y subastador', portrait: PORTRAIT('durin'),
    greet: () => pick(['Oro que entra, oro que sale. Así gira el mundo, muchacho.', 'Banco Real de Aurelia. Aquí se compra y se vende todo lo que vale algo.']),
    options: () => [
      { label: 'Ver la casa de subastas', window: 'mercado' },
      { label: '¿Un enano en el banco?', next: 'enano' },
      bye,
    ],
    lines: {
      enano: '¿Y quién mejor? Los enanos contamos monedas desde antes de que los humanos aprendieran a acuñarlas. Mi primo Brokk lleva la forja del barrio enano, por si necesitas que te arreglen algo.',
    },
  },
  aelin: {
    name: 'Aelin', role: 'Encantadora élfica', portrait: PORTRAIT('aelin'),
    greet: () => pick(['El árbol plateado canta cuando alguien encanta bien una espada. Hoy está callado.', 'La magia no se fuerza, se convence. ¿Qué quieres encantar?']),
    options: () => [
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Qué es el árbol plateado?', next: 'arbol' },
      bye,
    ],
    lines: {
      arbol: 'Lo plantaron los primeros elfos que llegaron a Aurelia, como símbolo de la alianza con los humanos. Sus hojas guardan la luz de la luna. Mientras siga en pie, elfos y humanos seremos hermanos.',
    },
  },
  brokk: {
    name: 'Brokk', role: 'Maestro herrero', portrait: PORTRAIT('brokk'),
    greet: (ctx) => {
      // el final: la Lágrima de Aethra la forjan juntos Brokk e Ignar (la R13 de las Ruinas)
      if (hecho(ctx, 'RUINAS_HISTORIA_14_VIGIA')) return pick([
        'Ignar volvió al Volcán. Me dejó su martillo «para que me acuerde de que el de ella pesa más». Mentira. Pesa igual.',
        'La Lágrima de Aethra. La mejor pieza que forjé en mi vida. Bueno, que forjamos. Que conste que el filo es mío.',
      ]);
      if (hecho(ctx, 'RUINAS_HISTORIA_13_RITUAL')) return '*Brokk e Ignar te esperan frente al yunque, callados por primera vez en la vida* ¿La trajiste? La lágrima. Ponla en el yunque. Los dos al mismo tiempo, Ignar. A la cuenta de tres. ¡A LA CUENTA DE TRES, DIJE!';
      return pick(['¡Ja! Otro que viene con la espada mellada. Déjala en el yunque.', 'La forja enana no se apaga desde hace tres siglos. Ni pienso dejar que se apague ahora.']);
    },
    options: (ctx) => [
      { label: 'Usar el taller', window: 'taller' },
      ...(hecho(ctx, 'RUINAS_HISTORIA_13_RITUAL') ? [{ label: '¿Cómo se forja la Lágrima de Aethra?', next: 'lagrima' }] : []),
      bye,
    ],
    lines: {
      lagrima: 'En el taller, con la Lágrima Cristalizada que cayó del Pilar. No hace falta nada más: el resto lo ponemos nosotros. Ignar el fuego, yo el martillo. Sale una por persona, de tu clase, y no falla nunca. Es la única pieza del mundo que no se puede comprar ni vender.',
    },
  },
  oswin: {
    name: 'Oswin', role: 'Registro de gremios', portrait: PORTRAIT('oswin'),
    greet: () => pick([
      'Registro de Gremios de Aurelia. Fundar uno, unirse a uno o contratar aventureros: todo pasa por estas manos.',
      'Firma aquí, aquí y… aquí. ¿Vienes a buscar gremio o a contratar compañeros?',
    ]),
    options: () => [
      { label: 'Unirme a un gremio', window: 'unirse_gremio' },
      { label: 'Fundar un gremio', window: 'crear_gremio' },
      { label: 'Contratar aventureros', window: 'contratar' },
      { label: 'Ver mi gremio', window: 'gremio' },
      { label: '¿Para qué sirve un gremio?', next: 'gremios' },
      bye,
    ],
    lines: {
      gremios: 'Un gremio reparte oro y experiencia extra a sus miembros en cada combate, y cuanto más sube de nivel, más gente admite. A partir del nivel 2 tiene banco y tienda propios. Fundar uno cuesta 50.000 de oro; unirse a uno abierto es gratis.',
    },
  },
  cochero: {
    name: 'Gaspar', role: 'Cochero de la diligencia', portrait: PORTRAIT('cochero'),
    greet: () => pick(['¿Viaje? Rápido y seguro, sin lobos por el camino… casi siempre.', 'La diligencia sale cuando tú digas. Son veinte monedas.']),
    options: () => [
      { label: 'Viajar a la Aldea Espiga (20 de oro)', action: 'viaje', destino: 'aldea' },
      bye,
    ],
    lines: {},
  },
  // Lucio, el sobrino de Gaspar: maneja la diligencia cuando su tío se va con la historia (después de
  // «Hacia las montañas» Gaspar sube con Tilo y termina en el Volcán). Ver STAND_INS en questGivers.js
  lucio: {
    name: 'Lucio', role: 'Cochero de la diligencia', portrait: PORTRAIT('lucio'),
    ambient: ['¡Diligencia a la Aldea Espiga!', 'Los caballos me hacen caso. Casi siempre.', 'Mi tío Gaspar me dejó la diligencia. Y una lista de consejos.'],
    greet: () => pick(['Soy Lucio, el sobrino de Gaspar. Mi tío se fue a las Montañas y me dejó la diligencia. ¿A la Aldea?', '¿Viaje? Veinte monedas y llegas entero. Mi tío decía «casi siempre». Yo digo siempre.']),
    options: () => [
      { label: 'Viajar a la Aldea Espiga (20 de oro)', action: 'viaje', destino: 'aldea' },
      { label: '¿Dónde está Gaspar?', next: 'gaspar' },
      bye,
    ],
    lines: {
      gaspar: 'Subió a las Montañas con el chico ese, Tilo, escondido entre las cajas. Y después Trueno se le escapó otra vez. La última carta que mandó venía chamuscada y decía «Volcán». Nada más. Así es mi tío.',
    },
  },
  lucio_aldea: {
    name: 'Lucio', role: 'Cochero de la diligencia', portrait: PORTRAIT('lucio'),
    ambient: ['¡Diligencia a la capital!', 'Este caballo no es Trueno. Gracias a los dioses.'],
    greet: () => '¿Volvemos a la capital? Veinte monedas y te dejo junto a la Puerta Sur. Mi tío te manda saludos. Bueno, me los mandaría si supiera escribir sin quemar el papel.',
    options: () => [
      { label: 'Viajar a Aurelia (20 de oro)', action: 'viaje', destino: 'aurelia' },
      { label: '¿Dónde está Gaspar?', next: 'gaspar' },
      bye,
    ],
    lines: {
      gaspar: 'Subió a las Montañas con el chico ese, Tilo, escondido entre las cajas. Y después Trueno se le escapó otra vez. La última carta que mandó venía chamuscada y decía «Volcán». Nada más. Así es mi tío.',
    },
  },
  cochero_aldea: {
    name: 'Gaspar', role: 'Cochero de la diligencia', portrait: PORTRAIT('cochero'),
    greet: () => '¿Volvemos a la capital? Por veinte monedas te dejo junto a la Puerta Sur de Aurelia.',
    options: () => [
      { label: 'Viajar a Aurelia (20 de oro)', action: 'viaje', destino: 'aurelia' },
      bye,
    ],
    lines: {},
  },
  aldric: {
    name: 'Sir Aldric', role: 'Maestro de armas · Cuartel del Acero', portrait: PORTRAIT('maestro_guerrero'),
    greet: () => pick(['¡Firmes! Un guerrero se forja con disciplina y acero.', 'El escudo protege a los tuyos. La espada, solo después.']),
    options: () => [{ label: 'Tienda y maestro de los guerreros', window: 'orden_guerrero' }, { label: '¿Qué es el Cuartel?', next: 'lore' }, bye],
    lines: { lore: 'El Cuartel del Acero formó a la guardia de Aurelia durante generaciones. Aquí entrenan todos los que eligen la senda del guerrero: aprenden a resistir, a proteger y a romper la defensa enemiga.' },
  },
  isolde: {
    name: 'Isolde', role: 'Archimaga · Torre Arcana', portrait: PORTRAIT('maestra_maga'),
    greet: () => pick(['Las estrellas del tejado no son pintura, joven. Son advertencias.', 'La magia es conocimiento. Y el conocimiento, como el fuego, quema al imprudente.']),
    options: () => [{ label: 'Tienda y maestra de los magos', window: 'orden_mago' }, { label: '¿Qué guarda la torre?', next: 'lore' }, bye],
    lines: { lore: 'Siete pisos de libros, un observatorio y una puerta que no se abre desde hace cien años. Los aprendices dicen que detrás duerme el primer archimago. Yo prefiero no comprobarlo.' },
  },
  sylwen: {
    name: 'Sylwen', role: 'Maestra arquera · Campo del Halcón', portrait: PORTRAIT('maestra_arquera'),
    greet: () => pick(['Respira, apunta, suelta. Lo demás es ruido.', 'Las dianas del patio no se quejan. Los lobos de la Pradera, sí.']),
    options: () => [{ label: 'Tienda y maestra de los arqueros', window: 'orden_arquero' }, bye],
    lines: {},
  },
  nox: {
    name: 'Nox', role: '…', portrait: PORTRAIT('maestro_picaro'),
    greet: () => pick(['No me viste. No estoy aquí. Pero ya que preguntas…', 'Las sombras de Aurelia tienen dueño, gatito. Y soy yo.']),
    options: () => [{ label: 'Tienda y maestro de los pícaros', window: 'orden_picaro' }, bye],
    lines: {},
  },
  anselm: {
    name: 'Padre Anselm', role: 'Sumo sacerdote · Capilla de la Luz', portrait: PORTRAIT('sumo_sacerdote'),
    greet: () => pick(['La luz de Aethra te guarde, hijo.', 'Curar es más difícil que herir. Por eso tan pocos lo eligen.']),
    options: () => [{ label: 'Tienda y maestro de los sacerdotes', window: 'orden_sacerdote' }, bye],
    lines: {},
  },
  heraldo: {
    name: 'Heraldo del Festival', role: 'Festival de Aethra', portrait: PORTRAIT('heraldo'),
    greet: () => '¡Hoy es el Festival de Aethra! Las ofrendas al Pilar dan el doble de bendición. ¡Celebra con nosotros!',
    options: () => [{ label: 'Hacer una ofrenda al Pilar', window: 'ofrenda' }, bye],
    lines: {},
  },
};

// frases que dicen en globitos cuando pasas cerca (las usa socialLayer)
DIALOGUES_CIUDAD.tomas.ambient = ['¡Bienvenidos a Aurelia!', '¿Primera vez en la ciudad? ¡Habla conmigo!', 'El Pilar brilla más de noche, ya verás.'];
DIALOGUES_CIUDAD.marta.ambient = ['¡Cerveza fresca en El Grifo Dorado!', '¡Sopa del día: puerro y patata!'];
DIALOGUES_CIUDAD.durin.ambient = ['Oro que entra, oro que sale…', 'Hmm, las cuentas no cuadran. Otra vez.'];
DIALOGUES_CIUDAD.brokk.ambient = ['*CLANG* *CLANG*', '¡Más carbón a la fragua!'];
DIALOGUES_CIUDAD.cochero.ambient = ['¡Diligencia a la Aldea Espiga!', 'Los caballos están listos.'];
DIALOGUES_CIUDAD.cochero_aldea.ambient = ['¡Diligencia a la capital!'];
DIALOGUES_CIUDAD.aldric.ambient = ['¡Escudos arriba, reclutas!', '¡Uno, dos! ¡Uno, dos!'];
DIALOGUES_CIUDAD.isolde.ambient = ['Las estrellas están inquietas esta noche…'];
DIALOGUES_CIUDAD.nox.ambient = ['…', 'Psst. Por aquí.'];
DIALOGUES_CIUDAD.heraldo.ambient = ['¡Festival de Aethra! ¡Ofrendas dobles!', '¡Música y alegría en la Plaza del Pilar!'];
