# Contenido back: maestros de clase — resto de la familia Guerrero (18 nuevos)

Pura escritura de contenido — mismo esquema `class_masters` del piloto, sin tocar lógica ni schema.
Completa TODA la familia Guerrero (ya teníamos Kadric=Guerrero, Isolde=Caballero, Aurelio=Paladín,
Seraphine=Caballero Sagrado; acá van los 18 que faltan del árbol completo, confirmados contra
`class_evolutions` real: 6→38/39/40/41, 38→42, 7→43, 8→44/45/48, 44→47, 45→46, 48→49, 9→50, 50→51,
10→52/53).

**Nota aparte, no bloqueante:** el maestro de Guerrero (Kadric, class_id=1) se dispara desde el hook
en `evolvePlayer` — pero Guerrero es la clase BASE que se elige al crear personaje, nunca es
`evolves_to_class_id` de ninguna fila en `class_evolutions`. Así que, tal como está, ese hook nunca
se va a disparar para Kadric (nadie "evoluciona a" Guerrero). No es urgente arreglarlo ahora — la
fila no molesta a nadie estando ahí sin uso — pero avisen si en algún momento quieren que el
encuentro con Kadric dispare desde otro lado (ej. al crear personaje).

```sql
INSERT INTO class_masters (class_id, name, intro_dialogue, guild_dialogue) VALUES
(6, 'Hermano Kaelen',
 'Un grupo de bandidos rodea a Kaelen, que pelea sin armas contra varios a la vez — hasta que ayudás a inclinar la balanza. "Pocos entienden que las manos vacías pueden ser el arma más honesta. Ven al gremio, quiero enseñarte lo que sé."',
 'El puño no miente. La espada puede ocultar la intención — el puño, nunca.'),
(7, 'Roland, Filo Perfecto',
 'Roland duela contra dos oponentes con una elegancia que empieza a fallarle por el cansancio — tu ayuda inclina el combate. "Hace mucho que no veía a alguien mover el acero con esa precisión. Bienvenido."',
 'La espada mágica no perdona errores. Vos todavía no cometiste ninguno que yo haya visto.'),
(9, 'Gorrath, Puño de Furia',
 'Gorrath ruge en medio de una masacre, apenas conteniendo su propia rabia — hasta que peleás a su lado. "La furia sin control te devora. La tuya... la tuya todavía te obedece. Interesante."',
 'Cuidado con la furia. Yo dejé de contar cuántas veces casi me devoró.'),
(10, 'Vellandra, la Arcana Marcial',
 'Un hechizo se le escapa de las manos a Vellandra en pleno combate — lo estabilizás justo antes de que la lastime a ella misma. "Combinar espada y magia exige un control que pocos tienen. Vos lo tenés. Ven al gremio."',
 'La magia sin disciplina es un arma que se vuelve contra vos. Yo aprendí eso de la peor manera.'),
(38, 'Gran Maestro Senn',
 'Senn no necesita moverse para desviar cada golpe — hasta que ve algo en vos que lo hace bajar la guardia por primera vez en años. "Hace décadas que nadie me sorprende. Vos lo hiciste hoy."',
 'El puño maestro no busca golpear primero. Busca no necesitar hacerlo.'),
(39, 'Umbra, el Puño Caído',
 'Umbra pelea con golpes que dejan un rastro de sombra — te reconoce como alguien que también camina cerca del límite. "La oscuridad no te consumió todavía. Eso te hace peligroso. Ven, hablemos."',
 'Todo puño oscuro empezó como un puño honesto. La pregunta es cuándo dejás de notar la diferencia.'),
(40, 'Doran, Puño de Piedra',
 'Doran golpea el suelo y la tierra misma responde — te mira con aprobación cuando devolvés el golpe con la misma fuerza. "La tierra recuerda cada golpe verdadero. La tuya te recordará a vos."',
 'No soy yo quien golpea. Es la montaña, a través de mí. Aprendé a escuchar eso.'),
(41, 'Hermana Lyth',
 'Una luz cálida rodea los puños de Lyth mientras golpea con precisión casi ritual — te invita a unirte al combate y la luz no vacila ante vos. "Pocos canalizan lo divino sin perder la humildad. Vos todavía la tenés."',
 'La energía divina en los puños es un préstamo, no una posesión. No lo olvides nunca.'),
(42, 'El Silencioso',
 'Nadie recuerda su nombre real — solo que detiene ejércitos con un solo golpe. Hoy pelea a tu lado, en silencio, y al final asiente una sola vez.',
 'No hablo mucho. Cuando lo hago, es porque ya lo pensé demasiado.'),
(43, 'Corvinne, Filo Sin Nombre',
 'Corvinne corta el aire mismo con una técnica que nadie más domina — te mide con la mirada mientras peleás a su lado. "Pocas espadas se mueven como la tuya. La mía, hace mucho que dejó de sorprenderse. Hoy lo hizo."',
 'El filo perfecto no es el más afilado. Es el que nunca duda.'),
(44, 'Sir Malachor',
 'Una armadura ennegrecida por magia oscura protege a Malachor mientras cae en combate — lo ayudás y algo en su mirada cambia. "La oscuridad me consumió hace tiempo. Todavía no te consumió a vos. Aprovechalo."',
 'No vine a redimirme. Vine a enseñarte a sobrevivir a lo que yo no pude evitar.'),
(47, 'Sir Vanther, el Caído',
 'Vanther pelea con luz corrompida, oscura pero todavía reconocible como sagrada alguna vez — te mira con algo entre desconfianza y reconocimiento. "Caí de la luz y todavía la uso, corrompida. Vos elegís tu propio camino. Que sea mejor que el mío."',
 'No vine a que me admires. Vine a que no cometas el mismo error que yo.'),
(48, 'Coraza, el Inquebrantable',
 'Una armadura que parece imposible de perforar recibe golpe tras golpe sin ceder — hasta que vos también aguantás a su lado. "Pocos entienden que la verdadera defensa no es no caer. Es no romperse. Bienvenido."',
 'Mi armadura no es indestructible. Yo tampoco. Pero ninguno de los dos lo demuestra fácil.'),
(49, 'Sir Vaelith, Sangre de Dragón',
 'Escamas de dragón cubren la armadura de Vaelith, brillando con un calor que no debería existir — pelea a tu lado y algo antiguo parece reconocerte. "La sangre de dragón no se hereda. Se gana. Vos ya empezaste a ganarla."',
 'Cada escama que llevo costó algo. No preguntes qué, todavía no estás listo para esa respuesta.'),
(50, 'Titán Furioso, el que Bebió del Cáliz',
 'Algo golpea con una furia que ya no parece del todo suya — te reconoce como alguien que entiende ese límite. "El cáliz de la furia te da poder. También te quita algo. Vos todavía no perdiste lo importante."',
 'No pregunto qué bebiste para llegar hasta acá. Yo tampoco quiero recordar qué bebí yo.'),
(51, 'Kharzuk, Heraldo del Caos',
 'Algo en los golpes de Kharzuk ya no sigue ninguna lógica reconocible — y sin embargo, pelea a tu lado con una precisión aterradora. "El caos no elige a cualquiera. Vos ya lo escuchaste, ¿no es cierto?"',
 'No busco que me entiendas. Busco que sobrevivas a lo que viene después de escuchar al caos.'),
(52, 'Thessaly, Filo Arcano',
 'Thessaly combina estocadas con destellos de magia en un ritmo casi imposible de seguir — peleás a su lado sin perder el paso. "Pocos combinan ambas artes sin perder ninguna. Vos las tenés a las dos, intactas."',
 'La espada y la magia se pelean por tu atención. Aprendé a no elegir entre ellas.'),
(53, 'Profesor Endrick',
 'Endrick defiende unas ruinas de un peligro que él mismo despertó sin querer — lo ayudás justo a tiempo. "Toda ruina esconde algo que preferiría seguir dormido. Vos ya demostraste que podés con eso."',
 'Cada reliquia que traigo casi me mata una vez. Aprendé de mis errores, no los repitas.')
ON CONFLICT (class_id) DO NOTHING;
```

Con esto la familia Guerrero queda completa (21 clases, 21 maestros). Ítems de tienda: ninguno
todavía, a propósito — nada más que agregar del lado del back para estos, no hace falta tocar
`class_master_shop_items` ni los endpoints.
