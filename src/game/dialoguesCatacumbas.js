// Diálogos de las Catacumbas del Abismo (Vela Eterna y alrededores). Mismo formato que dialogues.js. Lo
// que dicen sigue la historia de cada jugador (A1-A14, ver gprback/docs/zona6_catacumbas.md), y el final
// de Velkan depende de lo que elegiste en la T14 de la Tundra (el perdón o la justicia).

import { enFase } from './story';

const PORTRAIT = (name) => `${process.env.PUBLIC_URL}/assets/mundo/retratos/${name}.png`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const bye = { label: 'Adiós', close: true };
// igual que en dialogues.js
const hecho = (ctx, code) => !!ctx?.done?.has?.(code);
const enCurso = (ctx, code) => enFase(ctx?.fase, `${code}@activa`);
// la elección de la T14 (decide el final de Velkan en la A11)
const perdono = (ctx) => hecho(ctx, 'TUNDRA_HISTORIA_14_PERDON');
const padreHijo = (ctx) => hecho(ctx, 'CATACUMBAS_HISTORIA_11_PADRE');
const lichCaido = (ctx) => hecho(ctx, 'CATACUMBAS_Q3_LICH_ANCESTRAL');
const ultimaVela = (ctx) => hecho(ctx, 'CATACUMBAS_HISTORIA_12_VELA');
// la barca de Óbolo (gprback/lib/barca.js): sus tres paradas; desde cada una te lleva a las otras dos
const PARADAS = { vela: 'el muelle de Vela Eterna', lago: 'el muelle del Lago Negro', rio: 'la orilla del Río de las Almas' };
const barcaOpciones = (aqui) => Object.entries(PARADAS).filter(([k]) => k !== aqui)
  .map(([k, lugar]) => ({ label: `Cruzar a ${lugar} (una moneda: 40 de oro)`, action: 'barca', destino: k }));
const barqueroLines = {
  lago: 'Al otro lado están el Abismo de las Almas y la orilla de los que no pagaron. No te conviene ir sin luz. Te llevo a donde ya pisaste: la barca no conoce caminos nuevos, y yo tampoco. El precio es una moneda. Siempre fue una moneda. Los precios de los muertos no suben.',
  antes: '¿Cómo llegué antes que tú? *se encoge de hombros, y le suenan los huesos* Los muertos no esperan, vivo. Ni hacen fila.',
};
// Óbolo en las otras paradas: el mismo barquero, que siempre llega antes que tú
const barquero = (aqui, ambient) => ({
  name: 'Óbolo', role: 'El barquero', portrait: PORTRAIT('obolo'), ambient,
  greet: () => pick([
    '*Óbolo ya te está esperando, apoyado en la pértiga* Llegas tarde. Como todos los vivos.',
    'Una moneda. ¿A dónde?',
    '*cuenta unas monedas que no tiene* Mil años y la barca nunca se hundió. Bueno, una vez. No preguntes.',
  ]),
  options: () => [...barcaOpciones(aqui), { label: '¿Cómo llegaste antes que yo?', next: 'antes' }, bye],
  lines: barqueroLines,
});

export const DIALOGUES_CATACUMBAS = {
  // ---------------------------------------------------------------- la Gran Vela
  // Liora, la Primera Vela: la sacerdotisa velada que encendió la vela cuando el sumo sacerdote los traicionó
  liora: {
    name: 'Liora', role: 'La Primera Vela', portrait: PORTRAIT('liora'),
    ambient: (ctx) => [
      '*acomoda la mecha de la Gran Vela con dos dedos de luz*',
      'Mil años. La cera no se acaba. Nosotros tampoco.',
      ...(ultimaVela(ctx) ? ['*su luz tiembla, más débil que antes*', 'Todavía alcanza. Todavía.'] : ['*mira hacia el fondo de la plaza, donde la oscuridad empieza*']),
    ],
    greet: (ctx) => {
      if (ctx.mark === '?') return 'Volviste con la llama encendida. Bien. Cuéntame qué viste allá afuera.';
      if (ctx.mark === '!') return 'Vivo. Acércate a la luz. Tengo algo que pedirte, y la oscuridad escucha.';
      // el final (R13 de las Ruinas): Liora subió a Aurelia a ver el sol, como pidió en la A14
      if (hecho(ctx, 'RUINAS_HISTORIA_13_RITUAL')) return pick([
        'Vi el sol, vivo. En la plaza de Aurelia, después del canto. Era más amarillo de lo que me acordaba. Gracias por llevarme.',
        'Les conté a los Velados cómo es el sol. No me creen que quema un poco. Tendrán que subir a verlo ellos.',
      ]);
      if (lichCaido(ctx)) return pick([
        'Mi maestro ya no está. Pensé que me iba a sentir libre. Me siento… cansada. Es parecido.',
        'Los Velados cantan otra vez en la Catedral de abajo. Hacía mil años que no cantaban. Desafinan. Es hermoso.',
        'El Devorador despierta. Lo siento en la cera: tiembla aunque no haya viento.',
      ]);
      if (ultimaVela(ctx)) return pick(['No me mires así. Una vela que se gasta no se apaga: se termina de dar.', 'Todavía me queda luz para un rato. Úsala bien.']);
      if (padreHijo(ctx)) return perdono(ctx)
        ? pick(['Aldren y su hijo se sientan junto a la Vela cada noche. No hablan mucho. No hace falta.', 'Velkan me pidió perdón. A mí, que no lo conocía. Le dije que se lo pidiera a la vela: ella lo escucha mejor.'])
        : pick(['Le grabamos un nombre a Velkan en los Nichos. No el que él había escrito. El suyo.', 'Aldren no llora. Pero viene a la Vela todas las noches, y la vela se inclina hacia él.']);
      if (hecho(ctx, 'CATACUMBAS_HISTORIA_04_SANTUARIO')) return pick(['El anillo del Santuario decía «Velkan». Un nombre de vivo, en un lugar de muertos.', 'Los acólitos del Eclipse bajan cada vez más. Huelen la luz y la quieren apagar.']);
      if (hecho(ctx, 'CATACUMBAS_HISTORIA_01_ESCALERA')) return pick([
        'Mientras arda la Gran Vela, la oscuridad no entra a la plaza. Afuera… afuera es otra cosa.',
        'Los Velados te miran raro. No es desconfianza: es que se olvidaron de cómo se ve alguien con sombra.',
      ]);
      return pick(['*una mujer hecha de luz azul te mira en silencio*', 'Un vivo. Hace mucho que no bajaba uno.']);
    },
    options: (ctx) => [
      { label: '¿Qué es Vela Eterna?', next: 'vela' },
      { label: '¿Quién era el sumo sacerdote?', next: lichCaido(ctx) ? 'maestro_despues' : 'maestro' },
      bye,
    ],
    lines: {
      vela: 'Cuando el sumo sacerdote nos traicionó, apagó todas las lámparas del templo y dejó que la oscuridad nos comiera uno por uno. Yo tenía una vela en la mano. Una sola. La encendí y les dije a los que quedaban que se pusieran alrededor. Nos quedamos. Mil años. La vela creció con nosotros. Ahora es una ciudad.',
      maestro: 'Su nombre lo borramos de todas las piedras: no merece que lo repitamos. Nos enseñó a leer, a cantar y a encender la primera vela. Era el mejor de nosotros. Y un día tuvo miedo de morir. Solo eso: miedo. El miedo lo llevó al Devorador, y el Devorador le prometió no morir nunca. Cumplió. Ahora es eso que vive en la Sala del Sexto Sello.',
      maestro_despues: 'Mi maestro. Te va a parecer raro, pero lo extraño: no al Lich, al hombre que me enseñó a sostener la vela sin quemarme. Ese murió hace mil años. Lo que tú derrotaste era solo su miedo, con corona.',
    },
  },
  // Aldren en Vela Eterna: baja con Elenya en la A5 y se queda; su hijo es el Encapuchado
  aldren_vela: {
    name: 'Aldren', role: 'Último de los Vigías', portrait: PORTRAIT('anciano'),
    ambient: (ctx) => (padreHijo(ctx)
      ? (perdono(ctx) ? ['*le sirve té a su hijo, que no lo toma*', 'Come algo, Velkan.', '*sonríe sin darse cuenta*'] : ['*da vueltas a una capucha negra entre las manos*', '*mira la Vela sin parpadear*'])
      : ['*lee un libro viejo a la luz de la Vela*', 'Mis rodillas no están para escaleras.', '*mira hacia los túneles*']),
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Y bien? Habla. A mi edad ya no me asustan las noticias. Casi.';
      if (ctx.mark === '!') return 'Acércate. Hay algo que no te conté. Ya es hora.';
      if (padreHijo(ctx) && perdono(ctx)) return pick([
        'Mi hijo duerme con una vela encendida. A los cuarenta años. No le digas que te conté.',
        'Velkan quiere subir a la Aldea. Le da miedo que la gente lo reconozca. Le dije que en la Aldea nadie reconoce a nadie: todos somos viejos y ciegos.',
        'Veinte años perdidos. Ahora tenemos los que quedan. No es poco.',
      ]);
      if (padreHijo(ctx)) return pick([
        'Se puso delante de mí. Delante del golpe. Eso es lo último que hizo. Eso es lo que voy a recordar.',
        'Lo enterramos al lado de su madre, arriba, en la Catedral. Elenya cantó. Desafinó un poco. A él le habría gustado.',
        'Fue justo. Lo sé. Hiciste lo que había que hacer en el norte. Pero un padre no sabe de justicia. Solo sabe extrañar.',
      ]);
      if (hecho(ctx, 'CATACUMBAS_HISTORIA_07_HIJO')) return pick(['«Velkan, hijo de nadie.» Así se llamó a sí mismo. Y la culpa de eso es mía.', 'Si lo ves antes que yo, no le hagas daño. Si puedes. Si no puedes… avísame.']);
      if (hecho(ctx, 'CATACUMBAS_HISTORIA_06_ARCHIMAGO')) return pick(['El Archimago dijo de dónde viene el Encapuchado. Yo ya lo sabía. Lo supe siempre.', 'Hay cosas que un viejo calla porque le dan vergüenza. Y después es tarde.']);
      return pick(['Toda la vida contando cuentos de los Vigías en la Aldea, y resulta que los cuentos eran ciertos. Y que viven aquí abajo.', 'Elenya me pidió que me quedara arriba. No le hice caso. Es lo único que nos queda a los viejos: no hacer caso.']);
    },
    options: (ctx) => [
      { label: '¿Qué hace aquí abajo?', next: 'abajo' },
      ...(hecho(ctx, 'CATACUMBAS_HISTORIA_07_HIJO') ? [{ label: 'Háblame de Velkan', next: padreHijo(ctx) ? (perdono(ctx) ? 'velkan_vive' : 'velkan_muere') : 'velkan' }] : []),
      bye,
    ],
    lines: {
      abajo: 'Mi familia cuidó los Sellos desde antes de que hubiera reyes. Vigías, nos llamaban. Yo soy el último. Pensé que mi trabajo era contar la historia para que nadie la olvidara. Me equivoqué: el trabajo era bajar. Tarde, pero bajé.',
      velkan: 'Era un chico que tenía miedo de la oscuridad. Le conté todas las historias de los Sellos, del Devorador, de los Vigías. Quería que fuera valiente. Lo asusté más. Y un día alguien le ofreció no tener miedo nunca más. Se fue con él. Yo me quedé contando cuentos.',
      velkan_vive: 'Está aprendiendo a vivir sin la capucha. Le cuesta: se la sigue poniendo cuando cree que nadie lo ve. Ayer me preguntó si su madre lo habría perdonado. Le dije que sí. No sé si es verdad. Pero era lo que había que decir, y eso también lo aprendí tarde.',
      velkan_muere: 'Al final se acordó de quién era. Se puso entre el golpe y yo, como cuando era chico y se ponía entre el perro del vecino y yo. Me llamó «papá». Veinte años sin escucharlo. Lo voy a escuchar el resto de mi vida.',
    },
  },
  // Velkan en Vela Eterna, al lado de su padre: solo si en la Tundra elegiste el perdón
  velkan_vela: {
    name: 'Velkan', role: 'El hijo de Aldren', portrait: PORTRAIT('velkan'),
    ambient: ['*se acomoda una capucha que ya no lleva*', '*mira la Gran Vela de cerca, como un chico*', 'Mi padre ronca. Siempre roncó.'],
    greet: (ctx) => (hecho(ctx, 'RUINAS_HISTORIA_13_RITUAL') ? pick([
      'Pelear del lado de la luz. Veinte años del otro lado y resulta que este pesa menos.',
      'Mi padre me vio pelear a tu lado contra la Sombra. No dijo nada. Lloró. Es lo mismo.',
    ]) : pick([
      'No sé qué decirte. «Gracias» queda chico. «Perdón» también. Me quedo con los dos.',
      'Veinte años sirviendo a alguien que me prometía no tener miedo. Ahora duermo con una vela. Es mejor trato.',
      'Mi padre me contó lo que hiciste en el norte con la hija del rey. Que la perdonaste. Ahora entiendo por qué me miraste así en el altar.',
    ])),
    options: () => [{ label: '¿Quién te convenció de unirte a los Ocultos?', next: 'ocultos' }, { label: '¿Qué vas a hacer ahora?', next: 'ahora' }, bye],
    lines: {
      ocultos: 'Un hombre sin cara, en la Biblioteca. Hablaba con la voz del Lich, pero no era él: el Lich no sale de su sala. Me dijo que los Sellos eran una cárcel para un dios que solo quería despertar, y que el que lo ayudara no iba a morir nunca. Tenía dieciséis años y miedo. Le creí. Al que te hable así, no le creas.',
      ahora: 'Mi padre quiere que suba a la Aldea. Yo quiero quedarme aquí un tiempo, con los Velados. Ellos saben lo que es haber hecho algo terrible y seguir cuidando una luz. Liora dice que puedo ayudar con la cera. Es poco. Por algo se empieza.',
    },
  },
  // Velkan caído junto al altar del Santuario Profanado, durante la A11 (después de la emboscada)
  velkan_herido: {
    name: 'Velkan', role: 'El Encapuchado', portrait: PORTRAIT('velkan'),
    ambient: ['*respira con dificultad*', 'Papá…', '*aprieta la mano de su padre*'],
    greet: (ctx) => (enCurso(ctx, 'CATACUMBAS_HISTORIA_11_PADRE')
      ? '*levanta la vista, sin capucha* Tú. El que llegaba siempre un paso detrás. *tose* Ahora llegaste justo.'
      : '*no contesta: mira la vela que su padre sostiene*'),
    options: () => [bye],
    lines: {},
  },

  // ---------------------------------------------------------------- Vela Eterna
  // Osmund: el herrero velado; forjaba las campanas del templo y ahora forja con hueso
  osmund: {
    name: 'Osmund', role: 'El herrero velado', portrait: PORTRAIT('osmund'),
    ambient: ['*golpea el yunque sin hacer ruido*', 'El hueso no se funde. Se convence. Como el hierro, pero más terco.', '*sopla la fragua con un fuelle de luz*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Lo trajiste? Déjalo en el banco. Con cuidado: hay huesos que muerden.';
      if (ctx.mark === '!') return 'Vivo. Necesito unas manos que se puedan ensuciar. Las mías ya no.';
      if (hecho(ctx, 'CATACUMBAS_SEC_FORJAS')) return pick(['«Raro, pero bueno», dijo el enano. Mil años esperando que alguien me diga eso.', 'Brokk me mandó un martillo de regalo. No puedo levantarlo: lo atraviesa la mano. Lo tengo colgado igual.']);
      return pick([
        'Forja de Hueso. Si es de plata sepulcral, lo trabajo. Si es de hueso antiguo, lo trabajo con respeto.',
        'Antes forjaba las campanas del templo. Ahora el templo no tiene campanas. Pero la gente sigue necesitando armaduras.',
        'Tráeme plata sepulcral, hueso antiguo y algo que haya pertenecido a un muerto enojado. Te hago algo que asusta.',
      ]);
    },
    options: () => [
      { label: 'Usar la forja', window: 'taller' },
      { label: 'Encantar mi equipo', window: 'encantador' },
      { label: '¿Qué es la plata sepulcral?', next: 'plata' },
      bye,
    ],
    lines: {
      plata: 'La plata con la que enterraban a los sacerdotes: anillos, monedas para los ojos, cálices. Mil años en la oscuridad la volvieron pálida y fría. No se oxida, no se raya y espanta a los muertos que no descansan. Sale de las vetas de los Osarios. Hay una más pura todavía, en el Trono de Huesos. Esa no la toqué nunca.',
    },
  },
  // Ilse, la sepulturera: una mujer viva que bajó a cuidar las tumbas de la Catedral; la única que cocina
  ilse: {
    name: 'Ilse', role: 'La sepulturera', portrait: PORTRAIT('ilse'),
    ambient: ['*revuelve una olla que huele a hongos*', 'Los muertos no comen. Yo sí, y mucho.', '*se sacude tierra de las manos*', '¿Quién se llevó mi pala? ¡Osvaldo!'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Lo encontraste? Pásamelo. La olla espera.';
      if (ctx.mark === '!') return '¡Eh, tú, el que respira! Ven, que necesito ayuda y aquí nadie tiene manos de verdad.';
      if (hecho(ctx, 'CATACUMBAS_SEC_TRUENO')) return pick(['Gaspar me contestó la carta. Dice que Trueno todavía brilla de noche. Que lo usa de farol.', 'Ese caballo se comió media cosecha de setas. Gaspar me mandó un saco de papas para pagarla. Aquí abajo, las papas valen oro.']);
      if (hecho(ctx, 'CATACUMBAS_HISTORIA_05_CATEDRAL')) return pick(['Ya no tengo que pasar por la reja oxidada para subir a la Catedral. Me cambió la vida. Bueno, las rodillas.', 'Elenya bajó a probar mi guiso. Dijo «interesante». Viniendo de una sacerdotisa, es un elogio.']);
      return pick([
        'Soy Ilse. Cuido las tumbas de la Catedral desde abajo. Alguien tiene que barrer, aunque sea a los muertos.',
        'Bienvenido a la única cocina de Vela Eterna. Siéntate. Los Velados solo vienen a oler.',
      ]);
    },
    options: () => [
      { label: 'Cocinar', window: 'taller' },
      { label: '¿Por qué bajaste aquí?', next: 'bajar' },
      bye,
    ],
    lines: {
      bajar: 'Mi padre fue sepulturero de la Catedral, y su madre antes que él. Un día barriendo la cripta encontré una reja que daba para abajo. Bajé. Encontré una ciudad de muertos amables que hacía mil años que nadie visitaba. Volví al día siguiente con una olla. No me fui más. Arriba la gente vive apurada. Aquí, nadie.',
    },
  },
  // Hollin: un saqueador de tumbas que se quedó a vivir (y a vender) entre los Velados
  mercader_vela: {
    name: 'Hollin', role: 'Mercader de reliquias', portrait: PORTRAIT('hollin'),
    ambient: ['*le saca brillo a un cáliz con la manga*', 'Todo legal. Más o menos.', '*mira a los Velados de reojo*', 'Precio especial para los vivos.'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '¿Tienes lo mío? No lo muestres mucho, que Liora mira.';
      if (ctx.mark === '!') return 'Psst. Tú. Tengo un negocio. Medio honesto. Bastante honesto. Escucha.';
      if (hecho(ctx, 'CATACUMBAS_SEC_RELIQUIAS_2')) return pick(['Los Velados ahora me saludan. Es incómodo. Prefería cuando me miraban mal.', 'Devolví tres cosas esta semana. Tres. Me estoy volviendo blando.']);
      if (hecho(ctx, 'CATACUMBAS_SEC_RELIQUIAS_1')) return pick(['Le devolviste el relicario a Liora. Bien hecho. Lo digo en serio, aunque me duela el bolsillo.', 'Liora me sonrió ayer. Creo. Es difícil saber con la luz.']);
      return pick([
        'Bienvenido al puesto de Hollin. Reliquias, amuletos, cosas brillantes. Todo con garantía. La garantía es mi palabra.',
        'Bajé a saquear una tumba hace quince años. Me perdí. Me encontraron los Velados. Me quedé. Ahora vendo.',
      ]);
    },
    options: () => [
      { label: 'Comerciar', window: 'artesanos' },
      { label: '¿Los Velados no se enojan?', next: 'velados' },
      bye,
    ],
    lines: {
      velados: 'Al principio, mucho. Una señora transparente me siguió una semana entera mirándome. No decía nada. Solo miraba. Al final devolví el anillo. Ahora tenemos un trato: lo que saco de las tumbas de los Velados, lo devuelvo; lo que saco de las tumbas del Eclipse, lo vendo. Ellos dicen que es justo. Yo digo que es negocio.',
    },
  },

  // ---------------------------------------------------------------- el Lago Negro
  // Óbolo: el barquero esqueleto del Lago Negro; cobra en monedas viejas y no se ríe nunca
  obolo: {
    name: 'Óbolo', role: 'El barquero', portrait: PORTRAIT('obolo'),
    ambient: ['*apoya la pértiga en el muelle*', 'El agua negra no refleja. No mires.', '*cuenta monedas que no tiene*'],
    greet: (ctx) => {
      if (ctx.mark === '?') return '*extiende la mano huesuda* ¿Las monedas?';
      if (ctx.mark === '!') return 'Vivo. Se me cayeron unas monedas. No se cruza el lago gratis. Ni para mí.';
      if (hecho(ctx, 'CATACUMBAS_SEC_BARQUERO')) return pick(['Mis monedas. Las cuento cada noche. Siguen siendo tres. Bien.', 'Te debo un viaje. No lo olvido. Los barqueros no olvidan deudas.']);
      return pick([
        'Mil años remando este lago. Nadie me pregunta nunca cómo estoy. ¿Ves? Tú tampoco.',
        'Una moneda, y te cruzo. Al Lago Negro o al Río de las Almas. Solo a donde ya pisaste.',
      ]);
    },
    options: () => [...barcaOpciones('vela'), { label: '¿A dónde lleva el lago?', next: 'lago' }, bye],
    lines: barqueroLines,
  },
  // las otras dos paradas de la barca
  barca_lago: barquero('lago', ['*apoya la pértiga en el muelle*', 'El agua negra no refleja. No mires.', '*mira el islote del medio del lago*']),
  barca_rio: barquero('rio', ['*mira pasar las almas por el río*', 'Esas no pagaron.', '*silba bajito una canción de cuna*']),

  // ---------------------------------------------------------------- los Nichos
  // Don Osvaldo: un esqueleto que no sabe que está muerto (y después lo sabe y le da igual)
  osvaldo: {
    name: 'Don Osvaldo', role: 'Vecino de los Nichos', portrait: PORTRAIT('osvaldo'),
    ambient: (ctx) => (hecho(ctx, 'CATACUMBAS_SEC_OSVALDO_2')
      ? ['*se mira en el espejo y suspira*', 'Muy flaco. Muy, muy flaco.', '*silba una canción de misa*']
      : ['¿Llegó el pan?', '*se rasca la cabeza y suena a castañuelas*', 'Hace frío, ¿no? No, ¿verdad? Yo tampoco lo siento.']),
    greet: (ctx) => {
      if (ctx.mark === '?') return '¡Ah, volvió! Pase, pase. ¿Qué me trae?';
      if (ctx.mark === '!') return '¡Buenas! Disculpe la molestia, ¿tiene un minuto? O dos. Yo tengo todo el tiempo del mundo, parece.';
      if (hecho(ctx, 'CATACUMBAS_SEC_OSVALDO_2')) return pick(['Así que muerto. Bueno. Uno se acostumbra. Más fácil que acostumbrarse a la suegra.', 'Lo bueno de estar muerto: no me duele la espalda. Lo malo: no tengo espalda.']);
      return pick([
        '¡Buenas tardes! ¿O noches? Aquí abajo nunca sé. Debería salir más.',
        'Mi señora dice que estoy muy pálido. Yo digo que es la luz.',
      ]);
    },
    options: () => [{ label: '¿Cuánto hace que vive aquí?', next: 'tiempo' }, bye],
    lines: {
      tiempo: '¿Aquí? Desde ayer, creo. O desde el martes. Era portero del templo, ¿sabe? Abría la puerta de la misa. Un día cerraron todo, se apagaron las lámparas y me senté a esperar que volvieran a abrir. Todavía espero. Raro que tarden tanto, ¿no?',
    },
  },
};
