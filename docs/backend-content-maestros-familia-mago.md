# Contenido back: maestros de clase — familia Mago completa (19 nuevos)

Pura escritura de contenido, mismo esquema `class_masters` de siempre. Cubre toda la rama Mago
confirmada contra `class_evolutions`: 2→12/13/14/15, 14→31/32/33/34/35/36/37, 12→54/55, 13→56/57/58,
14→59, 15→61, 61→60.

```sql
INSERT INTO class_masters (class_id, name, intro_dialogue, guild_dialogue) VALUES
(12, 'Maldris, el Cuervo Pálido',
 'Un ejército de esqueletos rodea a Maldris, que apenas logra mantenerlos bajo control mientras algo más grande se acerca — lo ayudás justo a tiempo. "La muerte obedece a quien no le teme. Vos tampoco le temés, ¿verdad?"',
 'No levanto muertos por crueldad. Los levanto porque alguien tiene que recordarlos.'),
(13, 'Yssara, la que Llama',
 'Yssara invoca aliados uno tras otro, cada vez más débil — hasta que peleás junto a sus invocaciones y el combate se inclina. "Invocar no es reemplazar tu propia fuerza. Es multiplicarla. Vos ya lo entendés."',
 'Cada aliado que invoco es un pedazo mío. Aprendé a no dar más de lo que podés perder.'),
(14, 'Fenrik, el que Doma Cuatro Vientos',
 'Fenrik lanza fuego, hielo y rayo casi al mismo tiempo, perdiendo el control por un instante — lo estabilizás con tu propio ataque. "Dominar un elemento es fuerza. Dominar varios es un equilibrio que pocos sostienen."',
 'Cada elemento tiene su propio temperamento. Aprendé a escucharlos antes de que te escuchen a vos.'),
(15, 'Seraphiel, Voz de lo Alto',
 'Una luz cegadora rodea a Seraphiel mientras contiene algo que no debería estar aquí abajo — peleás a su lado y la luz no te rechaza. "Lo divino no se impone. Se te ofrece. Vos ya lo aceptaste sin saberlo."',
 'El poder supremo no es tuyo. Es prestado. No lo olvides nunca.'),
(31, 'Ignara, Llama Eterna',
 'Ignara arde literalmente mientras pelea, controlando el fuego que la envuelve — te reconoce cuando devolvés el golpe con la misma intensidad. "El fuego no perdona a quien duda. Vos no dudaste."',
 'Doscientas muertes al fuego me costó este dominio. Espero que a vos te cueste menos.'),
(32, 'Wrenna, Escarcha Eterna',
 'El hielo de Wrenna casi la encierra a ella misma en su propio hechizo — la liberás justo a tiempo. "El hielo no mata rápido. Mata seguro. Vos ya entendés esa paciencia."',
 'Congelar algo no es destruirlo. Es esperar el momento correcto para romperlo.'),
(33, 'Zarek, Tormenta Viva',
 'Rayos saltan sin control alrededor de Zarek, casi golpeándolo a él mismo — lo ayudás a canalizarlos de vuelta al enemigo. "El rayo no elige a quién golpea. Vos aprendiste a apuntar igual."',
 'Doscientos rayos después, todavía me sorprende no haberme matado yo mismo.'),
(34, 'Marejada',
 'El agua responde a cada gesto suyo con una precisión casi líquida — peleás a su lado sin que ni una gota caiga fuera de lugar. "El agua cede ante todo y no pierde nunca. Aprendé esa lección."',
 'Nadie recuerda mi nombre de antes del agua. Ya no importa quién era.'),
(35, 'Grundar, Puño de Montaña',
 'La tierra misma se levanta para proteger a Grundar de una emboscada — peleás a su lado y las rocas no te tratan como enemigo. "La tierra es paciente. Yo aprendí a serlo también. Vos ya empezás a entenderlo."',
 'Doscientos golpes de tierra después, todavía respeto cada roca que levanto.'),
(36, 'Silva, Viento Sin Nombre',
 'Silva se mueve casi tan rápido como el viento que controla — apenas la seguís, pero alcanza para ayudarla. "El viento no se detiene para nadie. Vos casi lo alcanzaste."',
 'Nunca me quedo en un lugar mucho tiempo. Este gremio es la excepción, por ahora.'),
(37, 'Lucian, Portador de Luz',
 'Una luz cegadora rodea a Lucian mientras repele algo que la oscuridad casi consume — peleás a su lado sin que la luz te lastime. "La luz no juzga a quien la usa bien. Vos la usás bien."',
 'Doscientas veces usé la luz para matar. Todavía no sé si eso me hace mejor o peor persona.'),
(54, 'El Rey sin Nombre',
 'Un ejército entero de no-muertos obedece un solo gesto suyo — peleás a su lado y por un instante también parecés parte de ese ejército. "No gobierno a los muertos. Los muertos me siguen porque ya no tienen nada mejor que hacer."',
 'Un reino de huesos no reemplaza uno de carne. Nunca lo olvidés.'),
(55, 'Ashkeloth',
 'Ashkeloth ya no respira, y sin embargo pelea con una precisión que ningún vivo podría sostener tanto tiempo — te mira con algo parecido a la curiosidad de alguien que hace siglos no siente nada. "La muerte no fue el final que esperaba. Fue apenas el comienzo de algo más aburrido."',
 'No te apures a envidiar la inmortalidad. Yo llevo siglos aburrido.'),
(56, 'Bael''thor',
 'Un pacto oscuro casi se le escapa de las manos a Bael''thor — lo ayudás antes de que el demonio invocado se vuelva contra él. "Cada pacto tiene un precio. El mío ya lo pagué. Espero que el tuyo, si algún día hacés uno, sea más barato."',
 'No pregunto qué le debés a la oscuridad. Solo espero que puedas pagarlo.'),
(57, 'Seraphina Lumis',
 'Seres celestiales responden al llamado de Lumis con una devoción casi conmovedora — peleás junto a ellos sin que te traten como intruso. "Lo celestial no se invoca. Se le pide, con humildad. Vos ya entendés esa diferencia."',
 'Cada aliado celestial que llamo me recuerda cuánto me falta para merecerlos.'),
(58, 'Rhaska, Voz de la Manada',
 'Bestias salvajes responden al llamado de Rhaska con una lealtad feroz — peleás a su lado y la manada te acepta sin dudar. "Las bestias no mienten como la gente. Por eso las prefiero."',
 'La manada no me sigue por magia. Me sigue porque nunca les di razones para no hacerlo.'),
(59, 'Octavia, la de los Ocho Elementos',
 'Octavia alterna entre los ocho elementos sin perder ni un segundo de ritmo — peleás a su lado y apenas lográs seguirle el paso. "Dominar uno es un logro. Dominar los ocho es una carga que pocos eligen cargar."',
 'Cada elemento que domino me cuesta un pedazo de mí dedicado solo a él. Elegí bien cuáles priorizar.'),
(60, 'El Vacío que Habla',
 'Algo que ya no parece del todo humano canaliza un poder cósmico casi incomprensible — peleás a su lado y sentís que algo antiguo te está evaluando. "Pocos llegan tan lejos. Menos todavía vuelven siendo reconocibles."',
 'No preguntes qué soy ahora. Ni yo estoy seguro de la respuesta.'),
(61, 'Astraia, Eco de las Estrellas',
 'Astraia canaliza un poder que parece venir de más allá del cielo mismo — peleás a su lado y por un instante ves algo que no deberías haber visto. "Pocos mortales tocan el poder de las estrellas sin quebrarse. Vos seguís de pie."',
 'Casi nadie alcanza este poder. Los que lo hacen, rara vez siguen siendo los mismos.')
ON CONFLICT (class_id) DO NOTHING;
```

Familia Mago completa: 19 clases (más el propio Mago=Archimago Thelen del piloto original, que sigue
como el único con el mismo problema de Kadric — clase base, nunca se alcanza vía evolución. Mismo
caso, no bloqueante). Sin ítems de tienda todavía.
