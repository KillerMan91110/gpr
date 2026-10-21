// Diálogos de las Ruinas Ancestrales (el Santuario de las Lágrimas y el Observatorio). Mismo formato que
// dialogues.js. Lo que dicen sigue la historia de cada jugador (R1-R12, ver gprback/docs/zona7_ruinas.md), y
// algunas cosas dependen de lo que elegiste antes: Hela en la T14 de la Tundra y Velkan en las Catacumbas.

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const bye = { label: 'Adiós', close: true };
// igual que en dialogues.js
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);
// lo que elegiste en la Tundra (Hela) y cómo terminó Velkan en las Catacumbas
const perdono = (ctx) => hecho(ctx, 'TUNDRA_HISTORIA_14_PERDON');
const velkanVive = (ctx) => perdono(ctx) && hecho(ctx, 'CATACUMBAS_HISTORIA_11_PADRE');
// la historia de las Ruinas
const guardianes = (ctx) => hecho(ctx, 'RUINAS_Q1_GUARDIANES_TEMPLO');
const peregrinos = (ctx) => hecho(ctx, 'RUINAS_HISTORIA_05_ENTIDAD');
const ojoVisto = (ctx) => hecho(ctx, 'RUINAS_HISTORIA_07_OBSERVATORIO');
const fuente = (ctx) => hecho(ctx, 'RUINAS_HISTORIA_09_LAGRIMAS');
const centinela = (ctx) => hecho(ctx, 'RUINAS_Q2_CENTINELA_COSMICO');
const aedan = (ctx) => hecho(ctx, 'RUINAS_Q3_GRAN_ESQUELETO_ABISMO');
const septimo = (ctx) => hecho(ctx, 'RUINAS_HISTORIA_12_SELLO');
// el final: el ritual en Aurelia (R13) y el título (R14)
const ritual = (ctx) => hecho(ctx, 'RUINAS_HISTORIA_13_RITUAL');
const vigia = (ctx) => hecho(ctx, 'RUINAS_HISTORIA_14_VIGIA');

// las Escalinatas de Luz (gprback/lib/escalinatas.js): desde cada una se sube a las otras dos
const ESCALINATAS = { santuario: 'el Santuario de las Lágrimas', patio: 'el Patio de las Estatuas', torres: 'las Torres del Velo' };
const escalinata = (aqui) => ({
  name: 'La Escalinata de Luz', role: 'El camino de Aethra', portrait: PORTRAIT('escalinata_luz'),
  ambient: ['*el círculo de luz late despacio bajo tus pies*'],
  greet: () => pick([
    '*un círculo de luz en el suelo. Cuando lo pisas, el aire se llena de escalones transparentes que suben y bajan hacia otros lugares de las Ruinas*',
    '*la luz del círculo se acomoda a tu paso, como si te estuviera esperando*',
  ]),
  options: () => [
    ...Object.entries(ESCALINATAS).filter(([k]) => k !== aqui).map(([k, lugar]) => ({ label: `Subir hasta ${lugar}`, action: 'escalinata', destino: k })),
    { label: '¿Qué es esto?', next: 'que' },
    bye,
  ],
  lines: {
    que: 'Los aethrinos no caminaban de un lado al otro del templo: subían por escaleras de luz que Aethra dejó tendidas entre los lugares que más quería. Solo llevan a donde ya estuviste: la luz no conoce caminos que tus pies no pisaron. Y no cobran nada. La luz nunca cobró.',
  },
});

// los maestros aethrinos de las Pruebas de la Orden (gprback/docs/evoluciones_pruebas.md): enseñaban a los primeros
// Vigías y vuelven con los peregrinos (R5). Dan la Ascensión (PRUEBA_<CLASE>_3) a los de su clase desde el nivel 90.
const maestro = ({ name, role, portrait, clase, ambient, saludo, hecho: dicho, vigia, prueba }) => ({
  name, role, portrait: PORTRAIT(portrait), ambient,
  greet: (ctx) => {
    if (ctx.mark === '?') return 'Volviste, y sin un rasguño de más. Cuéntame cómo fue.';
    if (ctx.mark === '!') return 'Te estaba esperando. Mil años, para ser exactos. Siéntate: es hora de tu Ascensión.';
    if (hecho(ctx, `PRUEBA_${clase}_3`)) return dicho;
    return pick(saludo);
  },
  options: () => [
    { label: 'Háblame del primer Vigía', next: 'vigia' },
    { label: '¿Qué es la Ascensión?', next: 'prueba' },
    bye,
  ],
  lines: { vigia, prueba },
});

export const DIALOGUES_RUINAS = {
  // ---------------------------------------------------------------- el Santuario de las Lágrimas
  // Seraphine, la Última Sacerdotisa: mil años cuidando el Séptimo Sello sola
  seraphine: {
    name: 'Seraphine', role: 'La Última Sacerdotisa', portrait: PORTRAIT('seraphine'),
    ambient: (ctx) => [
      '*canta bajito una canción sin palabras*',
      '*pasa la mano por el altar partido*',
      ...(fuente(ctx) ? ['*mira la fuente llena y sonríe sin darse cuenta*', 'Agua otra vez. Qué ruido tan lindo.'] : ['*mira la fuente seca*', 'Mil años. Uno se acostumbra a casi todo.']),
    ],
    greet: (ctx) => {
      if (ctx.mark === '?') return 'Volviste. Cuéntame. Hace mucho que nadie me cuenta nada.';
      if (ctx.mark === '!') return 'Vigía. Acércate. El templo me pidió algo, y yo no puedo hacerlo sola.';
      if (vigia(ctx)) return pick([
        'Ya no soy la Última Sacerdotisa. Tres peregrinas me pidieron que les enseñe la canción. Desafinan. Es perfecto.',
        'Fui a Aurelia y volví. Vi el mar desde el Camino Real. Mil años, y nunca había visto el mar.',
        'El Devorador duerme. A veces lo escucho dar vueltas en sueños. Le canto un poco y se calma. Como cualquier chico.',
        // el Paso de las Cumbres (generar_ruinas.js): después de la R14 el Velo se abre al este, hacia la Tundra
        'El Velo se abrió en las cumbres, al este. Del otro lado hay un puente de hielo y el norte de los reyes del frío. Aethra ya no necesita escondernos.',
      ]);
      if (ritual(ctx)) return 'Lo hicimos, Vigía. Elenya canta mejor que yo; no se lo digas. Ve a Aurelia: te están esperando.';
      if (septimo(ctx)) return pick([
        'El Séptimo Fragmento duerme en la fuente. Es lo único que la oscuridad no se anima a tocar.',
        'Siete. Por fin siete. Cuando estés listo, iremos a Aurelia. Elenya ya lo sabe: lo sintió desde la Catedral.',
        'Arriba, el Devorador tiene los dos ojos abiertos. No le tengas miedo. Ahora es él el que no duerme.',
      ]);
      if (aedan(ctx)) return pick([
        'Aedan me sonrió antes de irse. Mil años y nunca lo vi sonreír. Tenía diecinueve años.',
        'Aldren no se movió del Corazón del Templo hasta que se apagó la última luz. Después bajó solo. Es más fuerte de lo que parece.',
      ]);
      if (fuente(ctx)) return pick([
        'La fuente tiene agua. Los chicos de los peregrinos se meten a jugar. Antes me habría enojado.',
        'Orin no para de golpear el yunque. Dice que tiene mil años de trabajo atrasado.',
      ]);
      if (peregrinos(ctx)) return pick([
        'Madre Tilda me trajo sopa. Hace mil años que nadie me trae nada. Lloré. Bueno, siempre lloro, pero esta vez fue distinto.',
        'Hay cuarenta peregrinos en el Santuario. Cuarenta. Les tengo que aprender los nombres.',
      ]);
      if (guardianes(ctx)) return pick([
        'El Guardián te llamó Vigía. No es un título que se regale. Es un nombre que se reconoce.',
        'Los Heraldos tocan su nota en la cripta, abajo del templo. Si la escuchas de noche, no es un sueño.',
      ]);
      if (hecho(ctx, 'RUINAS_HISTORIA_01_VELO')) return pick([
        'Bienvenido al Santuario de las Lágrimas. Antes era un pueblo. Ahora es un pueblo de una.',
        'La niebla te dejó pasar. A mí nunca me dejó salir. Será que la niebla sabe lo que hace.',
      ]);
      return pick(['*una mujer de pelo plateado te mira desde junto al altar, sin moverse*', '¿Eres real? Perdona. Hace mucho que no veo a nadie.']);
    },
    options: (ctx) => [
      { label: '¿Quién era Aethra?', next: 'aethra' },
      { label: '¿Qué es el Devorador?', next: septimo(ctx) ? 'devorador_despierto' : 'devorador' },
      ...(hecho(ctx, 'RUINAS_SEC_ECO_HELA') ? [{ label: 'Lo que viste de Hela', next: perdono(ctx) ? 'hela_perdon' : 'hela_justicia' }] : []),
      ...(hecho(ctx, 'RUINAS_HISTORIA_08_TUMBA') ? [{ label: '¿Y los demás que me ayudaron?', next: velkanVive(ctx) ? 'aliados_velkan' : 'aliados' }] : []),
      bye,
    ],
    lines: {
      aethra: 'La Madre de las Estrellas. Antes del mundo había estrellas, y una de ellas tenía hambre: se comía la luz de las otras. Aethra era su hermana. Lo encerró aquí, debajo del templo, y lo ató con siete Sellos. Lloró siete veces mientras lo hacía. No de miedo: de pena. Lo quería. Las hermanas se quieren aunque se coman las estrellas.',
      devorador: 'Era una estrella. Ahora es un hambre con ojos. Mientras quede un Sello entero, sueña. Cuando sueña, sus sueños se escapan y caen: los engendros, los ojos, los eclipses. Lo que más quiere no es salir. Es que alguien le cante otra vez. Por eso las sacerdotisas seguimos cantando.',
      devorador_despierto: 'Tiene los dos ojos abiertos. Te mira a ti, porque tienes el fragmento. No te va a seguir: no puede. Pero va a mandar su sombra. Cuando lleguemos al Pilar, la sombra va a salir por las grietas de la plaza. Ahí no vas a estar solo. Te lo prometo.',
      hela_perdon: 'Me contaste que la perdonaste, en el norte, cuando todos pedían justicia. El lago todavía guarda sus lágrimas, pero ya no aparecen nuevas. Eso quiere decir que dejó de llorar. Cuando llegue el final, va a querer estar a tu lado. Me lo dijo el agua.',
      hela_justicia: 'Me contaste que elegiste la justicia, en el norte. Que ahora vive en Aurelia, con Elenya, aprendiendo a cantar en la Catedral. El lago todavía la recuerda llorando. Pero las sacerdotisas sabemos algo: el que canta, de a poco, deja de llorar. Cuando llegue el final, va a estar con Elenya.',
      aliados: 'Los que ayudaste en el camino no se olvidaron de ti. Lo sé porque el Velo se abrió: el Velo solo se abre para alguien a quien muchos esperan. Cuando hagamos el ritual en Aurelia, van a estar ahí. Los que puedan, pelearán a tu lado.',
      aliados_velkan: 'Los que ayudaste en el camino no se olvidaron de ti. Aldren me contó de su hijo: que lo perdonaste, y que vive. Cuando hagamos el ritual en Aurelia, Velkan va a estar ahí. Quiere pelear al lado del que le dio la segunda oportunidad. Y su padre va a hacer como que no llora.',
    },
  },
  // Orin, el picapedrero: un aethrino joven que restaura estatuas; la forja del Santuario es suya
  orin: {
    name: 'Orin', role: 'El picapedrero', portrait: PORTRAIT('orin'),
    ambient: (ctx) => (fuente(ctx)
      ? ['*golpea el yunque con un fuego blanco*', 'Mil años de trabajo atrasado. Ni lo pienso.', '*silba mientras sopla la fragua*']
      : ['*talla una cara de Aethra en un bloque de mármol*', '*sopla el polvo del cincel*', 'La forja está fría, pero el mármol no necesita fuego.']),
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Lo trajiste? Ponlo en el banco, con cuidado. El mármol bueno tiene orgullo.';
      if (ctx.mark === '!') return '¡Eh, Vigía! Necesito unas manos que no tiemblen. Las mías tiemblan desde hace mil años, de frío.';
      if (vigia(ctx)) return pick(['Brokk me mandó una carta: dice que el filo de tu Lágrima es suyo. Ignar me mandó otra: dice que el filo es de ella. Les contesté a los dos que el mármol del mango es mío.', 'Estoy tallando una estatua nueva para el Patio. No es de Aethra. Es tuya. No te rías.']);
      if (hecho(ctx, 'RUINAS_SEC_FORJAS')) return pick(['El enano y la dracónida van a venir. Los dos. Ya me estoy poniendo nervioso.', 'Tres forjas juntas. Nunca pasó. Ni en los tiempos de Aethra.']);
      if (fuente(ctx)) return pick([
        'La forja tiene fuego otra vez. Fuego blanco, del agua de las lágrimas. Corta el oro primordial como manteca.',
        'Tráeme oro primordial, mármol sagrado y algo de lo que dejan los guardianes. Te hago algo que brille.',
      ]);
      return pick([
        'Soy Orin. Era aprendiz de picapedrero cuando cayó todo. Me quedé aprendiz mil años.',
        'La forja está en ruinas, pero el yunque aguanta. Puedo trabajar igual. Más despacio, pero igual.',
      ]);
    },
    options: () => [
      { label: 'Usar la forja', window: 'taller' },
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Qué es el oro primordial?', next: 'oro' },
      bye,
    ],
    lines: {
      oro: 'Es el oro de antes de que existieran las minas. Dicen que es luz de Aethra que se puso dura de tanto esperar. Sale en vetas blancas, en la Cantera y en las Torres. No se oxida, no pesa casi nada y, si lo calientas con fuego de lágrimas, se acuerda de la forma que le diste. Por eso las armaduras de aquí duran mil años.',
    },
  },
  // Madre Tilda: la peregrina más vieja; llega con los peregrinos en la R5 y cocina para todos
  tilda: {
    name: 'Madre Tilda', role: 'La peregrina', portrait: PORTRAIT('tilda'),
    ambient: ['*revuelve una olla que brilla un poco*', 'Cuarenta bocas, cuarenta caminos.', '*le pone una manta a un peregrino de piedra*', '¿Quién quiere pan?'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Lo encontraste? Pasa, pasa. La olla espera, y yo también.';
      if (ctx.mark === '!') return 'Hijo, ven. Necesito unas piernas jóvenes. Las mías hicieron todos los caminos del mundo.';
      if (vigia(ctx)) return pick(['Ya somos sesenta en el Santuario. Sesenta bocas. Soy feliz.', 'Siéntate, Vigía. El primer plato es para el que salvó el mundo. Así fue siempre en los caminos. Bueno, no siempre se salvaba el mundo.']);
      if (hecho(ctx, 'RUINAS_SEC_PEREGRINOS_2')) return pick(['Ya son tres los que se despertaron. Comen como si no hubieran comido en mil años. Será por eso.', 'La peregrina de la Escalinata me ayuda en la cocina. Cocina mejor que yo. No se lo digas.']);
      return pick([
        'Soy Tilda. Los chicos me dicen Madre. Caminé desde la Pradera siguiendo una canción, como todos.',
        'Bienvenido a la posada. No tiene techo, pero tiene sopa. Una cosa por vez.',
        'Los peregrinos de piedra eran de los nuestros. Gente que vino a pedir y se quedó esperando.',
      ]);
    },
    options: () => [
      { label: 'Cocinar', window: 'taller' },
      { label: '¿Por qué vinieron?', next: 'camino' },
      bye,
    ],
    lines: {
      camino: 'Una noche, en cada pueblo, alguien escuchó una canción que venía del norte. Nadie sabe por qué la escuchamos nosotros y no los demás. Yo creo que es porque estábamos tristes. Las canciones de cuna las escuchan los que no pueden dormir. Caminamos meses. La niebla nos dejó pasar el día que rompiste el cristal. Llegamos, vimos el pueblo vacío, y nos quedamos. A los pueblos vacíos hay que llenarlos.',
    },
  },
  // Casio, el último peregrino: un mercader de caminos que siguió la canción tres años
  casio: {
    name: 'Casio', role: 'El último peregrino', portrait: PORTRAIT('casio'),
    ambient: ['*acomoda su mercadería sobre una columna caída*', 'Precio de peregrino.', '*tararea una canción lenta*', '¿Pan? ¿Lágrimas? ¿Flores que brillan?'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y? ¿Lo viste? Cuenta, cuenta.';
      if (ctx.mark === '!') return 'Psst. Tú, el que cruzó primero. Tengo una pregunta que me pica hace tres años.';
      if (vigia(ctx)) return pick(['La canción se calló. Ya no la escucho de noche. Y la extraño. ¿Te parece raro? A mí también.', 'Precio especial para el Vigía de Etheria: el mismo de siempre, pero con una sonrisa.']);
      if (hecho(ctx, 'RUINAS_SEC_TRUENO')) return pick(['Ese caballo me debe una manzana. Se lo dije a Gaspar en la carta. Con letra grande.', 'Si ves un caballo gris mirando la niebla, ya sabes de quién es.']);
      if (hecho(ctx, 'RUINAS_SEC_CANCION')) return pick(['Seguí tres años una canción de cuna para un monstruo. Lo cuento en los caminos y nadie me cree.', 'Ahora la canto yo también, de noche. Seraphine dice que desafino. Pero canto.']);
      return pick([
        'Casio, mercader de caminos. Todo lo que dan las Ruinas, más lo que traen los peregrinos.',
        'Llegué el último. Siempre llego el último. Pero llego.',
      ]);
    },
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Cómo llegaste aquí?', next: 'llegar' },
      bye,
    ],
    lines: {
      llegar: 'Vendía telas en las Montañas. Una noche, en el Paso, escuché una canción que salía de la niebla. Al otro día, otra vez. Fui siguiéndola: la escuchaba en las Costas, en la Tundra, siempre del lado del Velo. Tres años. Un día, la niebla se abrió y me encontré con cuarenta peregrinos que habían escuchado lo mismo. Vendí todas las telas para comprar harina. Mejor negocio no hice nunca.',
    },
  },
  // Aldren en las Ruinas: llega después de la R7 a ver la tumba vacía del primer Vigía
  aldren_ruinas: {
    name: 'Aldren', role: 'Último de los Vigías', portrait: PORTRAIT('anciano'),
    ambient: (ctx) => (aedan(ctx)
      ? ['*lee el libro de los Vigías en voz alta, para nadie*', '*mira el Corazón del Templo desde lejos*', 'Aedan. Diecinueve años.']
      : ['*mira las torres del templo con la boca abierta*', 'Mis rodillas subieron hasta aquí. No sé cómo.', '*hojea un libro viejo*']),
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y bien? A mi edad las noticias se reciben sentado. Ya me senté.';
      if (ctx.mark === '!') return 'Acércate. Tengo algo que pedirte, y es de familia.';
      if (vigia(ctx)) return pick([
        'El libro de los Vigías ya tiene la última página. Dice tu nombre. Lo voy a leer en la Aldea, a los chicos, como le leía a Velkan.',
        ...(velkanVive(ctx) ? ['Velkan vino al ritual. Peleó a tu lado. Después me abrazó y no dijo nada. Fue lo mejor que me dijo en la vida.'] : ['Liora vio el sol en la plaza. Dijo que era más amarillo de lo que se acordaba. Lloró. Los fantasmas también lloran, parece.']),
        'Mi familia cuidó los Sellos desde antes de que hubiera reyes. Ahora los cuida alguien que eligió hacerlo. Es mejor así.',
      ]);
      if (aedan(ctx)) return pick([
        'Me dijo que tengo la cara de su madre. Mil años, y se acordaba de la cara de su madre.',
        'Le leí su nombre y se acordó. Eso es lo que hacen los Vigías, ¿sabes? Recuerdan. Para que nadie se olvide.',
        ...(velkanVive(ctx) ? ['Le escribí a Velkan. Quiero que suba a ver esto. Que vea quiénes fuimos.'] : ['Ojalá Velkan hubiera visto esto. Ojalá muchas cosas.']),
      ]);
      if (hecho(ctx, 'RUINAS_HISTORIA_08_TUMBA')) return pick(['Dos tumbas y ningún cuerpo. Ya sé dónde está. Y me da miedo saberlo.', 'Las tumbas tienen flores ahora. Gracias. Los Vigías no querían flores. Yo sí.']);
      return pick([
        'Elenya me contó que cruzaste el Velo. Tuve que verlo con mis ojos. Así que subí.',
        'Toda la vida contando historias de los Vigías, y resulta que tienen un campo con sus tumbas. Aquí, al lado de casa.',
      ]);
    },
    options: (ctx) => [
      { label: '¿Quiénes eran los Vigías?', next: 'vigias' },
      ...(aedan(ctx) ? [{ label: 'Háblame de Aedan', next: 'aedan' }] : []),
      bye,
    ],
    lines: {
      vigias: 'No tenían castillo ni corona. Tenían una lanza y una promesa: cuidar los Sellos mientras quedara uno. Cuando el primero se rompió, se fueron a cuidar los otros. Uno por tierra, de padre a hijo. Mi familia es la última. Pensé que la promesa se terminaba conmigo. Pero tú la tomaste sin que nadie te la pidiera. Eso también es ser Vigía.',
      aedan: 'Era el más joven de los primeros Vigías. Juró quedarse de guardia en el Corazón del Templo mientras quedara un Sello, y se quedó. Mil años. La oscuridad del Devorador se le metió adentro mientras esperaba: así es la oscuridad, entra por los que esperan mucho. Pero no se fue nunca. Hasta que alguien de su sangre le dijo que ya podía.',
    },
  },

  // ---------------------------------------------------------------- los maestros de la Ascensión
  thalor: maestro({
    name: 'Thalor', role: 'Maestro de armas de los Vigías', portrait: 'thalor', clase: 'GUERRERO',
    ambient: ['*hace girar una espada vieja sin mirarla*', 'Piernas firmes. Siempre piernas firmes.', '*se rasca el casco: hace mil años que no se lo saca*'],
    saludo: ['Soy Thalor. Le enseñé a Borin a pararse. El resto lo aprendió solo.', 'Los guerreros de ahora llevan demasiado metal. Borin peleaba con una camisa y una promesa.'],
    hecho: 'Llevas la marca de oro. Borin la llevaba igual, torcida, porque se movió cuando se la puse. Tú no te moviste.',
    vigia: 'Borin no tenía escudo. Decía que un escudo te enseña a esconderte. Se ponía delante de los demás y aguantaba. Murió de pie delante del Tercer Sello, cuando cayó. Cuando lo encontramos, todavía estaba de pie.',
    prueba: 'Los guerreros de tu Orden que llegan lejos vienen aquí. Les pido un recuerdo de su viaje y los mando a pelear contra su propia sombra, al pie de la Escalinata del Patio. La sombra no se cansa, no tiene miedo y sabe todo lo que sabes. Si le ganas, te marco con el oro de los Vigías.',
  }),
  lyssandra: maestro({
    name: 'Lyssandra', role: 'Maestra arcana de los Vigías', portrait: 'lyssandra', clase: 'MAGO',
    ambient: ['*cuenta estrellas con los dedos, aunque es de día*', 'Ilyra habría corregido eso.', '*el sombrero se le mueve solo*'],
    saludo: ['Soy Lyssandra. Le enseñé a Ilyra a leer el cielo. Después ella me corregía a mí.', 'Los magos de Aurelia escriben demasiado. Ilyra decía que un hechizo que necesitas anotar, no lo entendiste.'],
    hecho: 'La marca te queda bien. Ilyra diría que está un poco corrida. Ilyra decía eso de todo.',
    vigia: 'Ilyra leyó en las estrellas que el Devorador volvería con un eclipse, mil años antes de que pasara. Nadie le creyó. Se pasó la vida dejando avisos en el Observatorio para quien viniera después. Para ti, supongo.',
    prueba: 'Un mago que llega aquí ya sabe muchos hechizos. Lo que no sabe es qué haría si alguien supiera exactamente los mismos. Tráeme un fragmento de eclipse y sube a pelear contra tu sombra, al pie de la Escalinata del Patio.',
  }),
  eryndel: maestro({
    name: 'Eryndel', role: 'Maestro arquero de los Vigías', portrait: 'eryndel', clase: 'ARQUERO',
    ambient: ['*tensa un arco sin flecha y lo suelta despacio*', 'El viento viene del este. Siempre del este.', '*mira un pájaro muy lejano*'],
    saludo: ['Soy Eryndel. Le enseñé a Taren a esperar. Tirar lo sabía desde chico.', 'Ese carcaj está muy lleno. Los buenos arqueros llevan pocas flechas.'],
    hecho: 'Taren tiraba a la pluma, tú le diste a tu sombra en el corazón. Bueno. Cada Vigía tiene su estilo.',
    vigia: 'Taren cazaba grifos en las cumbres del norte sin matarlos: les tiraba a una pluma, de lejos, y se la llevaba como trofeo. Decía que un arquero que no elige dónde pega, no es arquero. Cuidó el Cuarto Sello hasta el final.',
    prueba: 'Tu sombra no falla nunca. Esa es toda la prueba: tienes que no fallar tú tampoco. Antes, tráeme una pluma de grifo, para que Taren sepa que vienes de su parte. Después, la Escalinata del Patio.',
  }),
  velis: maestro({
    name: 'Velis', role: 'Maestra de sombras de los Vigías', portrait: 'velis', clase: 'PICARO',
    ambient: ['*no estaba ahí hace un segundo*', 'Shh.', '*juega con una moneda que aparece y desaparece*'],
    saludo: ['Soy Velis. Le enseñé a Sael todo lo que sabía. Después ella me robó la bolsa. Orgullo de maestra.', 'No me mires así. Llevo mil años aquí y todavía nadie me vio llegar.'],
    hecho: 'La marca de oro y ni pestañeaste. Sael lloró. De risa, pero lloró.',
    vigia: 'Sael le robó una moneda a Óbolo, el barquero de los muertos, y la usó para volver del otro lado. Eso dicen. Yo estaba ahí: la moneda se la regaló él, porque Sael lo hizo reír. A Óbolo nadie lo hace reír.',
    prueba: 'Pídele una moneda a Óbolo, en las Catacumbas. Si te la da, es que le caes bien, y eso vale más que cualquier robo. Después pelea contra la única sombra que no puedes esquivar: la tuya, al pie de la Escalinata del Patio.',
  }),
  seren: maestro({
    name: 'Seren', role: 'Maestro de la luz de los Vigías', portrait: 'seren', clase: 'SACERDOTE',
    ambient: ['*reza en voz baja con los ojos abiertos*', 'La fuente tiene agua otra vez. Qué alegría.', '*le sonríe a un peregrino que pasa*'],
    saludo: ['Soy Seren. Le enseñé a Edrin a curar. Él me enseñó a no tener miedo de no poder.', 'La luz no se tiene, se presta. Eso lo dijo Edrin. Yo solo lo repito desde hace mil años.'],
    hecho: 'Ya te prestaron la luz entera. Úsala bien. Y de vez en cuando, cúrate a ti también.',
    vigia: 'Edrin juntó las lágrimas de Aethra una por una, cuando caían, y con ellas hizo el agua de la fuente. Cuidó el Quinto Sello curando a los que lo defendían. Nunca levantó un arma. Nunca le hizo falta.',
    prueba: 'Tráeme una lágrima de Aethra, que Edrin la reconozca. Después sube a la Escalinata del Patio. Tu sombra cura igual que tú y no se cansa de curarse: no le ganas a golpes, le ganas con paciencia.',
  }),

  // ---------------------------------------------------------------- las Escalinatas de Luz
  escalinata_santuario: escalinata('santuario'),
  escalinata_patio: escalinata('patio'),
  escalinata_torres: escalinata('torres'),

  // ---------------------------------------------------------------- el Observatorio
  // Ptolio, el aprendiz del Gran Astrónomo: un fantasma amable que no deja de hablar
  ptolio: {
    name: 'Ptolio', role: 'El aprendiz del astrónomo', portrait: PORTRAIT('ptolio'),
    ambient: (ctx) => [
      '*anota cosas en el aire con un dedo*',
      '*intenta agarrar una pluma y la mano la atraviesa*',
      ...(ojoVisto(ctx) ? ['*no mira hacia el telescopio*', 'No miro. No miro. No miro.'] : ['Treinta y dos, treinta y tres… perdí la cuenta.']),
    ],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¡Volviste! ¿Y? ¿Y? ¿Y? Perdón. Hace mil años que nadie vuelve.';
      if (ctx.mark === '!') return '¡Tú! Sí, tú, el que respira. Tengo un problema. Bueno, tengo muchos. Uno a la vez.';
      if (vigia(ctx)) return pick(['Anoto todas las noches: «el ojo sigue cerrado». El trabajo más aburrido del mundo. ¡Me encanta!', '¡Te dieron el título! «Vigía de Etheria». Yo sigo siendo «aprendiz». Ya llegará. En otros mil años.']);
      if (centinela(ctx)) return pick(['¡Derribaste un pedazo de cielo! Lo anoté. Bueno, lo anotaste tú. Con letra fea.', 'El paso al Corazón del Templo está abierto. Mi maestro estaría orgulloso. Y asustado. Las dos cosas.']);
      if (ojoVisto(ctx)) return pick(['El ojo te vio, ¿sabes? Por eso parpadeó. Te reconoció. No sé si eso es bueno.', 'Mi maestro tenía razón. No era una estrella. Era un párpado. Odio cuando tiene razón.']);
      if (hecho(ctx, 'RUINAS_HISTORIA_06_ASTROLABIO')) return pick(['¡Una visita viva! Todavía no me acostumbro. ¿Te puedo pinchar? No, no puedo. Perdón.', 'La llave del astrolabio abre la puerta grande. Pero la puerta grande está… ocupada.']);
      return pick(['*un fantasma con sombrero de estrellas te mira, se asusta, y se esconde detrás del telescopio*', '¿Ho… hola? ¿Eres una estrella caída? No, las estrellas no saludan.']);
    },
    options: (ctx) => [
      { label: '¿Qué hacían aquí?', next: 'observatorio' },
      { label: '¿Qué le pasó a tu maestro?', next: ojoVisto(ctx) ? 'maestro_ojo' : 'maestro' },
      bye,
    ],
    lines: {
      observatorio: 'Mirábamos al Devorador. Todas las noches, alguien subía al telescopio y anotaba si se movía. Mil años de notas: «no se mueve», «no se mueve», «no se mueve». Era el trabajo más aburrido del mundo. Lo extraño muchísimo.',
      maestro: 'La última noche miró por el telescopio y dijo «despierto». Una sola palabra. Después la lente se partió con un ruido como de hielo, y él siguió mirando. No se movió más. Sigue ahí adentro, mirando. Yo me quedé afuera. Soy un fantasma, pero no soy tonto.',
      maestro_ojo: 'Ahora sé lo que vio: el ojo del Devorador, del otro lado de la lente. Mi maestro no se volvió loco: se quedó mirando para que el ojo no mirara otra cosa. Mil años sosteniéndole la mirada a un dios. Eso es ser astrónomo. Yo apenas soy aprendiz.',
    },
  },
};
