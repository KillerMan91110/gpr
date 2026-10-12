// Guiones de la vida de Aurelia (los usa cityLife.js): conversaciones entre vecinos (se turnan los
// globitos), frases sueltas de los que pasean y pregones del pregonero.

// grupo de charla → lista de [quién habla (0, 1…), texto]
export const CHARLAS = {
  elfo_enano: [
    [1, '¡Te digo que la cerveza enana es la mejor de Etheria!'],
    [0, 'Si te gusta beber barro con espuma, quizá.'],
    [1, '¡¿Barro?! ¡Retira eso, orejas de lechuga!'],
    [0, 'El vino élfico tiene trescientos años de tradición.'],
    [1, 'Y sabe a flores mojadas. Ja.'],
    [0, '…Invítame a una en El Grifo y lo discutimos.'],
    [1, '¡Eso es hablar!'],
  ],
  guardias: [
    [0, '¿Oíste lo del Capitán de los Lobos?'],
    [1, 'Dicen que ya tiene una manada de cincuenta.'],
    [0, 'Y nosotros aquí, cuidando una puerta.'],
    [1, 'Mejor una puerta que un lobo, créeme.'],
    [0, 'Tienes razón. Mira, ahí viene otro aventurero.'],
    [1, 'Que la diosa lo acompañe… lo va a necesitar.'],
  ],
  mercado: [
    [0, '¡Tres monedas por esas manzanas! ¿Me ves cara de noble?'],
    [1, 'Son de la Aldea Espiga, señora, las mejores.'],
    [0, 'Hmm… está bien. Pero dame cuatro.'],
    [1, '¡Trato hecho!'],
  ],
  canal: [
    [0, 'Hoy no pica nada.'],
    [1, 'Es que los peces del canal ya te conocen.'],
    [0, 'Ja, ja. Muy gracioso.'],
    [1, 'Ayer saqué una bota. Una bota, Tom.'],
    [0, '¿Y la otra?'],
  ],
  nobles: [
    [0, '¿Asistirás al baile del castillo?'],
    [1, 'Si el rey no lo vuelve a suspender…'],
    [0, 'Dicen que está preocupado por el sureste.'],
    [1, 'Todos lo estamos, querida. Todos.'],
  ],
  aprendices: [
    [0, '¡Hoy le di tres veces a la diana!'],
    [1, '¿A la tuya o a la de al lado?'],
    [0, '…Detalles.'],
    [1, 'Sir Aldric nos va a tener corriendo hasta la noche.'],
    [0, 'Mejor eso que limpiar la armería otra vez.'],
  ],
};

export const FRASES = {
  paseante: [
    '¡Qué buen día hace!', 'Tengo que pasar por el mercado…', '¿Has visto el Pilar de noche? Brilla precioso.',
    'Mi primo se fue a las Montañas Grises y no volvió.', '¡Buenas, aventurero!', 'Dicen que la posada tiene sopa nueva.',
    'Uf, qué cansancio.', 'La catedral es preciosa por dentro.', '¿Otro aventurero? Cada día llegan más.',
  ],
  guardia: ['¡Circulen!', 'Todo en orden.', 'Ojo con los carteristas en el mercado.', 'Por el rey y por Aethra.', 'Sin peleas en la plaza.'],
  bardo: [
    '♪ Oh, Aethra de las aguas claras… ♪', '♪ Lloró la diosa y nació el río… ♪', '♪ Un lobo, dos lobos, ¡corre aventurero! ♪',
    '¡Una moneda para el bardo!', '♪ En la Pradera dorada duerme un titán… ♪',
  ],
  nino: ['¡Atrápame!', '¡No me alcanzas!', '¡Ja, ja, ja!', '¡Te toca!', '¡Mamá, mira, un aventurero!'],
  farolero: ['Uno más…', '¡Que se haga la luz!', 'La noche llega temprano hoy.'],
};

// pregones fijos (se mezclan con las noticias del servidor: subidas de nivel, festival…)
export const PREGONES = [
  '¡Oíd, oíd! ¡El Festival de Aethra se celebra cada domingo en la Plaza del Pilar!',
  '¡Oíd, oíd! ¡El gremio busca aventureros para limpiar la Pradera de lobos!',
  '¡Oíd, oíd! ¡Se dice que el Titán de la Pradera ha despertado!',
  '¡Oíd, oíd! ¡La diligencia sale a la Aldea Espiga desde la Puerta Sur!',
  '¡Oíd, oíd! ¡Ofrendad al Pilar y Aethra bendecirá vuestro camino!',
];
