# Spec back: lore de clases evolucionadas

Contexto: hoy `classes.description` es solo una línea mecánica de rol (ej. "Rama Guerrero con maldiciones y daño oscuro.") y se usa siempre, sin importar si el jugador evolucionó o no — el endpoint de stats ni siquiera devuelve una descripción propia para la clase evolucionada. Se escribió lore narrativo (1-2 frases + tag de especialidad) para las **94 clases evolucionadas** (todo tier 2 y tier 3/4; las 5 clases base — Guerrero/Mago/Arquero/Pícaro/Sacerdote — quedan con su descripción actual, no llevan lore nuevo).

Confirmado con el dueño del proyecto: cuando el jugador evoluciona, el Dashboard debe mostrar este lore **en vez de** la descripción mecánica de siempre, solo para la clase a la que evolucionó.

## 1. Schema

```sql
ALTER TABLE classes ADD COLUMN IF NOT EXISTS lore TEXT;
```

Queda `NULL` para las 5 clases base (1 Guerrero, 2 Mago, 3 Arquero, 4 Pícaro, 5 Sacerdote) — no llevan lore en esta tanda.

## 2. Carga de datos (94 filas)

```sql
UPDATE classes AS c SET lore = v.lore
FROM (VALUES
  (6, 'Renunció al acero el día en que descubrió que sus propios puños, templados por años de disciplina, golpeaban con más certeza que cualquier arma forjada. — Ataque y defensa física'),
  (7, 'Encontró una espada mágica que responde a su voluntad como una extensión de su propio brazo; cada corte suyo es pura velocidad hecha acero. — Ataque físico'),
  (8, 'Se cubrió con una armadura pesada hasta volverse un muro viviente: donde otros retroceden, él avanza, porque nada que lo golpee puede quebrar su voluntad de proteger. — Defensa física'),
  (9, 'Dejó que la furia del combate lo consumiera por completo, y en ese abandono encontró un poder que ningún guerrero contenido podría igualar. — Ataque físico'),
  (10, 'Aprendió a canalizar magia elemental a través de su propio acero, demostrando que la fuerza bruta y el arcano no tienen por qué ser caminos separados. — Ataque físico y mágico'),
  (38, 'Sus puños ya no son solo músculo y hueso: son la culminación de una vida entera dedicada a perfeccionar el combate sin armas. — Ataque y defensa física'),
  (39, 'La oscuridad se filtró en su disciplina hasta fusionarse con ella; cada golpe suyo lleva un eco de la corrupción que aceptó voluntariamente. — Ataque y defensa física'),
  (40, 'Aprendió a golpear no solo con el cuerpo sino con la tierra misma bajo sus pies, haciendo temblar el suelo con cada impacto. — Ataque y defensa física'),
  (41, 'Sus puños fueron bendecidos por una fuerza superior; cada golpe que asesta es tanto un acto de fe como de combate. — Ataque físico y defensa mágica'),
  (42, 'Alcanzó el límite absoluto del combate sin armas: ya no pelea, se ha convertido en la pelea misma. — Ataque y defensa física'),
  (43, 'Sus técnicas de corte ya no se distinguen del instinto; la espada y su brazo se mueven como un solo pensamiento. — Ataque físico'),
  (44, 'Cambió el brillo de su armadura por las sombras, aceptando un poder corrupto a cambio de una fuerza que la luz jamás podría ofrecerle. — Ataque y defensa física'),
  (45, 'Su armadura ahora resplandece con magia divina: ya no solo protege con acero, protege con fe. — Defensa física y mágica'),
  (46, 'Fue bendecido con una armadura celestial que lo vuelve casi imposible de derribar, un bastión viviente entre el mal y los inocentes. — Defensa física y mágica'),
  (47, 'Cayó en la oscuridad sin perder su armadura sagrada, y ahora protege con la misma devoción con la que antaño servía a la luz. — Defensa física y mágica'),
  (48, 'Forjó una armadura tan indestructible que ya nadie recuerda haberlo visto sangrar en combate. — Defensa física'),
  (49, 'Se cubrió con escamas de dragón auténticas, y desde entonces su armadura respira con un poder que no es del todo humano. — Defensa física'),
  (50, 'Bebió del cáliz de la furia sin mirar atrás, y ahora su ira es tan vasta que apenas cabe en un solo cuerpo. — Ataque físico'),
  (51, 'El caos se apoderó de su furia hasta corromperla por completo; ya no lucha por rabia, lucha porque el caos mismo lo exige. — Ataque físico'),
  (52, 'Fusionó el filo de su espada con el arcano hasta que ya no sabe distinguir dónde termina el acero y empieza la magia. — Ataque físico y mágico'),
  (53, 'Cambió el campo de batalla por ruinas olvidadas, y encontró en el saber ancestral un poder que ningún hechizo moderno podría replicar. — Ataque físico y mágico'),

  (12, 'Aprendió a susurrarle órdenes a la muerte misma, y ahora los caídos se levantan para pelear a su lado sin hacer preguntas. — Ataque mágico (oscuro)'),
  (13, 'Dejó de pelear con sus propias manos el día en que descubrió que podía convocar aliados desde otros planos para que lucharan por él. — Soporte mágico (invocación)'),
  (14, 'Rompió las cadenas de un solo hechizo y aprendió a doblegar varios elementos a la vez, convirtiendo cada combate en una tormenta impredecible. — Ataque mágico'),
  (15, 'Sintió el llamado de un poder superior y fusionó su magia con la luz divina, elevando cada hechizo a algo casi sagrado. — Ataque mágico'),
  (31, 'Eligió el fuego por sobre todos los elementos, y ahora cada hechizo suyo arde con una intensidad que ni él mismo puede contener del todo. — Ataque mágico (Fuego)'),
  (32, 'Aprendió a congelar el tiempo mismo de sus enemigos, un instante a la vez, con hechizos tan fríos como su concentración. — Ataque mágico (Hielo)'),
  (33, 'Domesticó al rayo hasta volverlo una extensión de su propia voluntad, golpeando antes de que el trueno siquiera se escuche. — Ataque mágico (Rayo)'),
  (34, 'Encontró en el agua una fuerza tan flexible como implacable, capaz de erosionar cualquier defensa con paciencia infinita. — Ataque mágico (Agua)'),
  (35, 'Aprendió a escuchar a la tierra bajo sus pies, y ahora la hace responder a su llamado con la fuerza de montañas enteras. — Ataque mágico (Tierra)'),
  (36, 'Se volvió tan veloz como el viento que domina, golpeando y desapareciendo antes de que el enemigo pueda reaccionar. — Ataque mágico (Viento)'),
  (37, 'Canalizó la luz misma como arma, iluminando el campo de batalla con hechizos que queman tanto como purifican. — Ataque mágico (Luz)'),
  (59, 'Dejó de especializarse en un solo elemento para dominarlos todos, convirtiéndose en una fuerza de la naturaleza en sí mismo. — Ataque mágico (multi-elemental)'),
  (54, 'Ya no invoca no-muertos sueltos: comanda ejércitos enteros de ellos, un monarca que gobierna sobre la muerte misma. — Ataque mágico (oscuro)'),
  (55, 'Cruzó el umbral que ningún hechicero se atreve a cruzar y trascendió la muerte por completo, volviéndose inmortal a costa de su propia humanidad. — Ataque mágico (oscuro)'),
  (56, 'Firmó pactos con entidades que otros ni se atreven a nombrar, y ahora demonios enteros responden a su llamado. — Soporte mágico (invocación oscura)'),
  (57, 'Purificó su magia hasta que solo seres celestiales responden a su llamado, guerreros de luz que pelean por una causa justa. — Soporte mágico (invocación divina)'),
  (58, 'Aprendió el lenguaje de las bestias más feroces del mundo y ahora las llama a la batalla como si fueran viejas amigas. — Soporte mágico (invocación salvaje)'),
  (61, 'Su poder trascendió tanto lo divino que algunos dudan si sigue siendo mortal; los que lo vieron pelear lo describen como casi un mito viviente. — Ataque mágico'),
  (60, 'Alcanzó un poder tan raro y absoluto que solo un puñado de seres en toda la historia lograron dominar el elemento Cósmico como él. — Ataque mágico (Cósmico)'),

  (16, 'Pasó tanto tiempo rastreando presas que sus flechas ya no fallan; cada disparo suyo es la conclusión de una cacería que empezó mucho antes del combate. — Ataque físico'),
  (17, 'Aprendió a encontrar la grieta exacta en cualquier armadura, disparando con una precisión que ignora hasta la mejor defensa. — Ataque físico'),
  (18, 'Encontró el equilibrio entre el arco y la magia de la naturaleza, volviéndose tan útil protegiendo a sus aliados como derribando enemigos. — Ataque físico y mágico'),
  (19, 'Impregnó sus flechas con magia oscura, y ahora cada disparo certero es también un golpe directo a la mente del enemigo. — Ataque físico y mágico'),
  (20, 'El bosque mismo parece guiar sus flechas, un arquero que pelea en armonía con la naturaleza que lo rodea. — Ataque físico y mágico'),
  (67, 'Cambió la agilidad del arco por el peso brutal de una ballesta, prefiriendo un solo disparo devastador a diez certeros. — Ataque físico'),
  (69, 'Ya perdió la cuenta de sus presas hace mucho tiempo; su nombre solo se pronuncia con respeto entre quienes sobrevivieron para contarlo. — Ataque físico'),
  (62, 'Aprendió a disparar desde las sombras mismas, un fantasma que el enemigo nunca ve llegar hasta que ya es demasiado tarde. — Ataque físico (sigilo)'),
  (63, 'Cambió la precisión silenciosa por el estruendo: cada una de sus flechas explota con una fuerza que borra a varios enemigos a la vez. — Ataque físico'),
  (64, 'Sus flechas no necesitan matar al instante; el veneno que llevan hace el resto del trabajo mientras él ya apunta al siguiente blanco. — Ataque físico (veneno)'),
  (68, 'Cada flecha suya viaja acompañada de un relámpago, golpeando con una velocidad que el ojo apenas alcanza a seguir. — Ataque físico (Rayo)'),
  (71, 'Se adentró tanto en la magia primordial del bosque que ya no sabe distinguir dónde termina su voluntad y empieza la de la naturaleza misma. — Ataque físico y mágico'),
  (72, 'Dejó de cazar para proteger; ahora usa la fuerza del bosque para escudar a sus aliados antes que para derribar enemigos. — Soporte físico y mágico'),
  (66, 'Sus flechas ahora arden con magia divina, un castigo de luz para quienes se atreven a enfrentarlo. — Ataque físico y mágico (Luz)'),
  (73, 'La oscuridad terminó por consumirlo entero; ya no dispara para ganar, dispara porque las sombras se lo exigen. — Ataque físico y mágico (oscuro)'),
  (70, 'Porta un arco legendario heredado de generaciones élficas pasadas, cargado con toda la sabiduría de su pueblo. — Ataque físico y mágico'),
  (74, 'Se convirtió en el gobernante indiscutido del bosque ancestral, una corona que solo el más sabio de los elfos puede portar. — Ataque físico y mágico'),

  (21, 'Aprendió técnicas que ni el mejor espadachín podría replicar, golpeando y desapareciendo antes de que el enemigo procese lo que pasó. — Ataque físico'),
  (22, 'Perfeccionó el arte del golpe letal hasta convertirlo en su única filosofía: un combate, un golpe, un final. — Ataque físico (crítico)'),
  (23, 'Ya no roba por necesidad, roba porque es el mejor haciéndolo; ningún bolsillo ni cofre está a salvo de sus manos. — Ataque físico (utilidad)'),
  (24, 'Descubrió que la paciencia mata tan bien como el acero, dejando que sus venenos hagan el trabajo mientras él observa desde la distancia. — Ataque físico (veneno)'),
  (25, 'Convirtió el campo de batalla mismo en su arma, sembrando trampas que deciden el combate antes de que el primer golpe siquiera se dé. — Ataque físico (control)'),
  (78, 'Nadie lo ha visto atacar jamás; solo ven las consecuencias, porque ya se ha ido antes de que el golpe registre. — Ataque físico (sigilo)'),
  (79, 'Fusionó sus técnicas ninja con magia oscura, volviéndose una amenaza que ataca tanto desde el sigilo como desde las sombras mismas. — Ataque físico y mágico (oscuro)'),
  (87, 'Llevó su agilidad a un extremo casi imposible; los golpes que no logran tocarlo son, de lejos, más que los que sí. — Defensa física (evasión)'),
  (75, 'El golpe letal dejó de ser una técnica para convertirse en su firma; cada enemigo que enfrenta sabe que solo tiene una oportunidad de sobrevivir. — Ataque físico (crítico)'),
  (76, 'Se especializó en cazar a los más peligrosos: jefes que otros temen enfrentar son, para él, simplemente el siguiente contrato. — Ataque físico (crítico)'),
  (80, 'Su historial de robos ya es leyenda en cada rincón del reino; hasta sus víctimas hablan de él con una mezcla de rabia y admiración. — Ataque físico (utilidad)'),
  (81, 'Cambió el saqueo común por la caza de reliquias únicas, encontrando en las ruinas más olvidadas tesoros que nadie más podría hallar. — Ataque físico (utilidad)'),
  (77, 'Domina cinco venenos distintos con una precisión casi artística; cada uno diseñado para un tipo distinto de sufrimiento. — Ataque físico (veneno)'),
  (86, 'Fusionó el sigilo de su clase con la magia elemental, volviendo cada golpe furtivo en un desastre elemental esperando a ocurrir. — Ataque físico y mágico'),
  (82, 'Tras dominar el control absoluto del campo de batalla, decidió que sus habilidades valían demasiado para desperdiciarlas gratis: ahora pelea por quien pague mejor. — Ataque físico'),
  (83, 'Ninguna mazmorra, por peligrosa que sea, lo intimida; conoce sus trucos, sus trampas y sus secretos mejor que quienes las construyeron. — Ataque físico (utilidad)'),
  (84, 'Aprendió a desaparecer por completo en medio del combate, un fantasma que ataca y se desvanece antes de que nadie pueda reaccionar. — Defensa física (sigilo)'),
  (85, 'Se volvió experto en detectar peligros que nadie más nota, desarmando amenazas ocultas antes de que puedan siquiera activarse. — Defensa física (control)'),

  (26, 'Perfeccionó el arte de curar hasta volverlo casi instantáneo, levantando escudos de fe que protegen a todo su equipo. — Curación / soporte mágico'),
  (27, 'Aprendió a hablar el idioma silencioso de la naturaleza, y ahora la usa tanto para sanar a sus aliados como para castigar a sus enemigos. — Ataque y soporte mágico'),
  (28, 'Cambió las curaciones simples por escudos capaces de resistir cualquier golpe, un muro de fe tan duro como cualquier armadura. — Defensa mágica'),
  (29, 'Sus curaciones dejaron de ser un alivio para convertirse en milagros; ha traído de vuelta a compañeros que todos daban por perdidos. — Curación suprema'),
  (30, 'Dedicó su fe a purgar la oscuridad allá donde la encuentre, castigando a las criaturas malignas con la misma devoción con la que cura a los suyos. — Ataque mágico (purificación)'),
  (88, 'Sus curaciones masivas pueden salvar a un equipo entero al borde de la derrota en un solo instante de fe. — Curación mayor'),
  (97, 'Reparte bendiciones constantemente, casi sin descanso, como si cada aliento suyo fuera una plegaria a favor de sus aliados. — Soporte mágico'),
  (100, 'Es venerado por curaciones que ya perdió la cuenta de cuántas veces salvaron a alguien de una muerte segura. — Curación suprema'),
  (90, 'Domina la magia de la naturaleza en su forma más pura y ancestral, una fuerza que precede a cualquier civilización. — Ataque y soporte mágico'),
  (91, 'Dejó de atacar para dedicarse por completo a proteger a sus aliados, canalizando la naturaleza como un escudo viviente. — Soporte mágico (defensa)'),
  (98, 'Se volvió experto en pociones y hierbas sagradas, encontrando en la alquimia una forma distinta de proteger a los suyos. — Soporte mágico (curación)'),
  (92, 'Su defensa y su fe se volvieron inquebrantables por igual; ningún golpe logra hacer temblar ni su armadura ni su convicción. — Defensa mágica'),
  (93, 'Alcanzó una magia divina tan avanzada que su sola presencia en el campo de batalla reconforta a sus aliados y aterra a sus enemigos. — Defensa mágica'),
  (89, 'Es capaz de traer de vuelta a cualquiera del borde mismo de la muerte; los que pelean a su lado saben que nunca están realmente solos. — Curación suprema'),
  (101, 'Aprendió a leer el combate antes de que ocurra, prediciendo los golpes enemigos como si ya los hubiera vivido antes. — Soporte mágico (predicción)'),
  (95, 'Alcanzó una iluminación interior tan profunda que su sola meditación en combate se convierte en un santuario de curación para todo su equipo. — Curación suprema'),
  (99, 'Su fe se retorció hasta abrazar la magia oscura, conservando el poder de sanar mientras se entrega por completo a la corrupción. — Curación / ataque mágico oscuro'),
  (94, 'Es temido por todas las criaturas oscuras del reino; ninguna maldición ni corrupción sobrevive mucho tiempo cerca de su purga. — Ataque mágico (purificación)'),
  (96, 'Se volvió experto en expulsar la oscuridad de cualquier alma poseída, un especialista en purificación que la corrupción misma teme enfrentar. — Ataque mágico (purificación)')
) AS v(id, lore)
WHERE c.id = v.id;
```

## 3. Exponer el lore en el endpoint de stats

En `server.js`, endpoint `GET /api/player/:playerId/stats` (línea ~114): agregar `c.lore AS class_lore` y `ce.lore AS evolution_class_lore` al SELECT, y sumarlos a la respuesta JSON:

```js
class: {
  id: player.current_class_id,
  name: player.class_name,
  code: player.class_code,
  role: player.class_role,
  description: player.class_description,
  lore: player.class_lore, // NULL para las 5 clases base
  portrait: `${player.class_name}.png`,
},
evolution: {
  id: player.evolution_class_id,
  name: player.evolution_class_name,
  lore: player.evolution_class_lore, // el que realmente importa mostrar si ya evolucionó
  // ...resto de campos que ya devuelve
},
```

## 4. Front (lo hago yo, no hace falta que lo toquen)

En `Dashboard.js`, donde hoy se muestra siempre `stats.class.description` en `hero-class-desc`, cambiar a: si `stats.evolution?.lore` existe, mostrar eso; si no, mantener el fallback actual (`stats.class.description`). Cero riesgo: si el back todavía no mandó el campo, se comporta exactamente igual que hoy.

## Checklist

1. `ALTER TABLE classes ADD COLUMN lore TEXT` — sección 1.
2. Correr el `UPDATE ... FROM (VALUES ...)` de la sección 2 (94 filas).
3. Agregar `class_lore`/`evolution_class_lore` al SELECT y a la respuesta JSON de `GET /api/player/:playerId/stats` — sección 3.
4. Avisarme cuando esté, y actualizo `Dashboard.js` para mostrarlo.
