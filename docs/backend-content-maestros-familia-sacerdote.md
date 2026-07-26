# Contenido back: maestros de clase — familia Sacerdote completa (19 nuevos)

Pura escritura de contenido, mismo esquema `class_masters` de siempre. Cubre toda la rama Sacerdote
confirmada contra `class_evolutions`: 5→26/27/28/29/30, 26→88/97, 88→100, 27→90/91, 90→98,
28→92, 92→93, 29→89/101, 89→95, 101→99, 30→94, 94→96.

Con esta doc quedan las 5 familias completas (Guerrero, Mago, Arquero, Pícaro, Sacerdote) — todas
las 94 clases evolucionadas del juego van a tener maestro.

```sql
INSERT INTO class_masters (class_id, name, intro_dialogue, guild_dialogue) VALUES
(26, 'Hermana Marisol',
 'Marisol cura heridas en medio del caos, agotando su maná justo cuando más se necesita — le das el respiro que necesita para seguir. "Curar en combate es correr contra el tiempo. Vos me diste tiempo extra."',
 'Cada vida que salvo es una razón más para seguir despertándome cada día.'),
(27, 'Padre Osric',
 'Osric invoca la naturaleza para contener una amenaza que crece más rápido de lo que puede controlar — lo ayudás a equilibrar la balanza. "La naturaleza da y quita en igual medida. Hoy te tocó a vos ayudarme a que diera un poco más."',
 'No controlo la naturaleza. Negocio con ella, todos los días.'),
(28, 'Sir Ardonis',
 'Ardonis sostiene un escudo mágico que empieza a resquebrajarse bajo el peso del ataque — reforzás la defensa justo antes de que ceda. "La fe blindada todavía necesita compañía a veces. Gracias por ser esa compañía hoy."',
 'Mi escudo no me protege a mí. Protege a los que están detrás. Nunca lo olvides.'),
(29, 'Madre Elyndra',
 'Elyndra intenta curar a todo un grupo agotado con una sola oración masiva — la ayudás a sostener el hechizo hasta el final. "Curar a muchos a la vez cuesta más de lo que parece. Gracias por darme el tiempo para terminarlo."',
 'Ninguna cura masiva reemplaza cuidar a cada uno como si fuera el único.'),
(30, 'Inquisidora Vesna',
 'Vesna enfrenta algo profundamente corrupto que su propia magia apenas logra contener — peleás a su lado y la purga finalmente avanza. "Purificar la corrupción exige más fe de la que la mayoría tiene. Vos la tenés, aunque no lo sepas todavía."',
 'No juzgo a quien cae en la oscuridad. Juzgo a quien elige quedarse ahí.'),
(88, 'Su Eminencia Tobar',
 'Tobar canaliza curaciones masivas mientras dirige a un grupo entero fuera del peligro — te sumás a proteger su concentración. "Un obispo no pelea solo. Pelea guiando a otros a que no tengan que hacerlo tan seguido."',
 'Cada curación masiva que lanzo es un rezo que decido compartir con todos a la vez.'),
(89, 'Meridia, la que No Deja Morir a Nadie',
 'Meridia intenta un milagro imposible sobre alguien al borde de la muerte — tu ayuda inclina el milagro a su favor. "Nadie debería morir si yo estoy cerca. Hoy, gracias a vos, nadie murió."',
 'No siempre puedo salvar a todos. Pero cada vez que puedo, elijo intentarlo de todas formas.'),
(90, 'Ancestro Verdehoja',
 'Verdehoja canaliza la magia más antigua del bosque, casi perdiendo el control de su propio poder — lo ayudás a anclarlo. "La magia ancestral no se domina. Se le pide permiso, con humildad. Vos ya entendés eso."',
 'Antes de mí, otros cuidaron este poder. Después de mí, espero que alguien más lo haga.'),
(91, 'Faelan Guardián Verde',
 'Faelan se interpone entre el peligro y un grupo de aliados heridos, usando toda la naturaleza a su alcance — peleás a su lado sosteniendo esa barrera. "Proteger no es una habilidad. Es una decisión que tomo cada vez que hace falta."',
 'Cada aliado que protejo confía en que no voy a fallar. Todavía no fallé.'),
(92, 'Sir Baldric Fe Blindada',
 'Baldric combina armadura pesada y fe inquebrantable contra algo que pone a prueba ambas — peleás a su lado y ninguna de las dos cede. "La fe blindada no es solo metal. Es convicción con forma de armadura. Vos ya la tenés."',
 'Mi armadura pesa menos que la duda. Por eso elegí cargar con ella.'),
(93, 'Alteza Solmund',
 'Solmund canaliza magia divina avanzada mientras contiene algo que amenaza con corromper todo a su alrededor — peleás a su lado y la luz se sostiene. "Pocos alcanzan la fe suprema sin perder de vista por qué empezaron. Vos no la perdiste."',
 'El poder divino que uso no es mío. Es un préstamo que trato de merecer cada día.'),
(94, 'Su Severidad Kaltheus',
 'Kaltheus enfrenta a una criatura temida por todas las cosas oscuras, apenas sosteniendo la purga — peleás a su lado y la criatura finalmente cae. "Las criaturas oscuras me temen por una buena razón. Hoy se las recordamos juntos."',
 'No busco ser temido. Busco que lo oscuro tenga una razón para pensarlo dos veces.'),
(95, 'El Silente de la Montaña',
 'Un monje sacerdote medita en medio del combate, alcanzando una calma que parece imposible bajo ataque — peleás protegiendo esa quietud. "La iluminación no se interrumpe con facilidad. Gracias por asegurarte de que nada la interrumpiera hoy."',
 'No hablo de mi iluminación. Se nota, o no se nota. Las palabras no ayudan.'),
(96, 'Padre Ignathus',
 'Ignathus enfrenta una posesión que se resiste con una violencia inusual — lo ayudás a completar el exorcismo antes de que se le escape. "Cada exorcismo es una negociación con algo que no quiere irse. Gracias por inclinar la negociación a mi favor."',
 'Lo que expulso no desaparece. Solo deja de ser tu problema. A veces se vuelve el mío.'),
(97, 'Hermano Faelyn',
 'Faelyn reparte bendiciones constantes a todo el que lo rodea, incluso en pleno peligro — te sumás y una de esas bendiciones te alcanza también. "Bendecir no cuesta nada, salvo el tiempo que a veces no tenés. Gracias por darme ese tiempo."',
 'No elijo a quién bendecir. Elijo bendecir a todos y dejar que ellos decidan qué hacer con eso.'),
(98, 'Madre Yolanda',
 'Yolanda prepara una poción sagrada en pleno combate, arriesgándose a que la interrumpan — la cubrís hasta que termina. "Cada poción sagrada lleva su tiempo. Interrumpirla a mitad de camino la arruina. Gracias por el tiempo."',
 'La alquimia sagrada no es magia instantánea. Es paciencia disfrazada de ciencia.'),
(99, 'Vesryn el Corrompido',
 'Vesryn canaliza una fe oscura y corrompida que apenas logra controlar — peleás a su lado sin juzgarlo del todo. "Abracé la magia oscura sabiendo el precio. Todavía no me arrepiento, la mayoría de los días."',
 'No pido que entiendas mi camino. Pido que no le des la espalda a quien lo eligió.'),
(100, 'Su Santidad Theodren',
 'Theodren cura incontables heridas en una sola batalla, cada una con la misma devoción que la anterior — te sumás a proteger su resistencia. "Cada curación cuenta, aunque sean incontables. Gracias por asegurarte de que pudiera seguir contando."',
 'No busco ser venerado. Busco que cada cura valga la pena, una por una.'),
(101, 'Nyssara, Ojos del Mañana',
 'Nyssara predice cada movimiento enemigo un instante antes de que ocurra, pero la visión empieza a agotarla — la ayudás a sostenerla hasta el final del combate. "Ver el futuro en combate es agotador. Gracias por darme el tiempo para seguir viendo."',
 'No siempre me gusta lo que veo venir. Pero prefiero saberlo a no saberlo.')
ON CONFLICT (class_id) DO NOTHING;
```

Familia Sacerdote completa: 19 clases. Sin ítems de tienda todavía — igual que el resto, queda
pendiente a propósito.
