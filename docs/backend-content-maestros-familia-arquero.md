# Contenido back: maestros de clase — familia Arquero completa (17 nuevos)

Pura escritura de contenido, mismo esquema `class_masters` de siempre. Cubre toda la rama Arquero
confirmada contra `class_evolutions`: 3→16/17/18/19/20, 16→67/69, 17→62/63/64/68, 18→71/72,
19→66/73, 20→70, 70→74.

```sql
INSERT INTO class_masters (class_id, name, intro_dialogue, guild_dialogue) VALUES
(16, 'Torvin, el Rastreador',
 'Torvin sigue el rastro de una bestia peligrosa, casi perdiéndolo por el cansancio — lo ayudás a acorralarla. "Cazar no es matar. Es entender antes que el otro se mueva. Vos ya entendés eso."',
 'Cada flecha que suelto ya sabía dónde iba a caer antes de soltarla.'),
(17, 'Lyra, Ojo Certero',
 'Lyra apunta desde lejos mientras algo se acerca demasiado rápido para su gusto — tu ayuda le da el segundo que necesita. "Un disparo, un objetivo. Vos entendés la paciencia que eso exige."',
 'La distancia no es cobardía. Es respeto por lo que estás a punto de hacer.'),
(18, 'Aldric del Bosque Gris',
 'Aldric combina flechas y curaciones improvisadas mientras protege a un grupo herido — te sumás y el balance vuelve. "Un ranger no elige entre atacar o proteger. Elige hacer ambas cosas bien."',
 'El bosque me enseñó que la fuerza sola nunca alcanza. Aprendé eso pronto.'),
(19, 'Nyx, Sombra con Filo',
 'Nyx combina flechas oscuras con golpes casi invisibles — peleás a su lado sin verla la mitad del tiempo. "La oscuridad no es ausencia de luz. Es una herramienta más. Vos ya la usás bien."',
 'Nadie me ve venir. Vos tampoco, la mayoría de las veces.'),
(20, 'Sylvaeril',
 'Sylvaeril defiende un claro sagrado del bosque con flechas cargadas de magia natural — peleás a su lado y el bosque no te rechaza. "El bosque elige a quién protege. Hoy te eligió a vos también."',
 'Cinco arcos élficos no se encuentran. Se ganan, uno por uno.'),
(62, 'Vantha, la Invisible',
 'Un disparo perfecto sale de la nada, y Vantha aparece un segundo después como si nunca hubiera estado ausente — peleás a su lado sin entender del todo cómo. "Si me ves antes del disparo, hice algo mal."',
 'El sigilo perfecto no es no estar. Es que nadie note cuándo dejaste de estarlo.'),
(63, 'Bram Pólvora',
 'Una flecha explota más cerca de Bram de lo que planeaba — lo sacás de la línea de fuego justo a tiempo. "Cada flecha explosiva es un cálculo. A veces el cálculo falla. Hoy vos me salvaste del error."',
 'Prefiero un poco de riesgo a un combate aburrido. Vos parecés pensar igual.'),
(64, 'Serel, Colmillo Lento',
 'Serel dispara flechas venenosas mientras algo grande se acerca demasiado rápido para que el veneno haga efecto a tiempo — lo ayudás a ganar esos segundos. "El veneno no necesita prisa. Solo necesita tiempo. Vos me lo diste."',
 'La muerte lenta no es crueldad. Es paciencia disfrazada de piedad.'),
(66, 'Ilyana, Flecha de Luz',
 'Flechas de luz pura caen sobre un grupo de criaturas oscuras mientras Ilyana empieza a flaquear — peleás a su lado y la luz se sostiene. "La luz elige a sus arqueros con cuidado. Vos ya demostraste por qué te eligió."',
 'Cada flecha de luz que disparo es una plegaria silenciosa. No siempre sé si la escuchan.'),
(67, 'Gareth Acero Pesado',
 'Gareth reemplaza su arco por una ballesta pesada mientras enfrenta algo que un arco normal no perforaría — peleás a su lado y el disparo por fin conecta. "El arco es velocidad. La ballesta es certeza. Elegí la certeza, y no me arrepiento."',
 'Cambiar de arma no es debilidad. Es reconocer qué necesita el momento.'),
(68, 'Kessa Tormenta',
 'Flechas cargadas de rayo saltan entre varios enemigos a la vez, casi descontroladas — ayudás a Kessa a redirigirlas. "El rayo en una flecha no perdona errores de cálculo. Vos evitaste el mío."',
 'Cada flecha de rayo que suelto es una apuesta. Hasta ahora, gané casi todas.'),
(69, 'Orrin, el de las Mil Presas',
 'Orrin enfrenta a una bestia que ya cazó antes y que ahora volvió más fuerte — peleás a su lado y la historia se repite, esta vez a su favor. "Cada presa que cazo me enseña algo nuevo. Esta te la debo a vos."',
 'Mil presas después, todavía aprendo algo de cada una que se me escapa.'),
(70, 'Thalindor',
 'Thalindor sostiene un arco que parece más viejo que el bosque mismo — peleás a su lado y el arco no te trata como a un extraño. "Este arco vio caer imperios. Hoy te vio a vos, y no fue lo peor que vio."',
 'La sabiduría élfica no se apura. Lamentablemente, algunos peligros sí.'),
(71, 'Kaelith, Raíz y Flecha',
 'Kaelith canaliza magia primordial del bosque mismo mientras algo intenta corromper el área — peleás a su lado y la corrupción retrocede. "El bosque primordial no olvida a quien lo defiende. Ya no te va a olvidar a vos tampoco."',
 'La naturaleza pura no es gentil. Es justa, que es distinto.'),
(72, 'Bren Escudo Verde',
 'Bren se interpone entre sus aliados y el peligro usando magia natural defensiva — peleás a su lado protegiendo a los mismos que él protege. "Proteger no es débil. Es elegir a quién le importás más que a vos mismo."',
 'Cada aliado que protejo es una razón más para seguir de pie.'),
(73, 'Xaltheris',
 'Xaltheris pelea consumido por una oscuridad que ya casi no controla — lo ayudás a contenerla el tiempo suficiente para ganar. "La oscuridad que uso ya no me pertenece del todo. Gracias por recordarme que todavía puedo controlarla."',
 'No pregunto si confiás en mí. Yo tampoco confío del todo en mí mismo.'),
(74, 'Aelendor, Corona Ancestral',
 'Aelendor defiende el corazón mismo del bosque ancestral con una autoridad que nadie cuestiona — peleás a su lado y el bosque entero parece atento. "Gobernar un bosque no es tener poder sobre él. Es merecer su confianza, día a día."',
 'La corona que llevo no es mía. Es del bosque. Yo solo la cuido.')
ON CONFLICT (class_id) DO NOTHING;
```

Familia Arquero completa: 17 clases. Sin ítems de tienda todavía.
