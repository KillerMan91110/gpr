# Contenido back: más eventos narrativos en El Abismo

Pura escritura de contenido — mismo esquema `tower_room_events`, sin tocar lógica ni schema.
6 más por categoría (30 en total), para sumar a los 10 que ya existen y bajar la repetición ahora
que los pisos tardan 8 salas en completarse.

```sql
INSERT INTO tower_room_events (event_type, prompt_text, choice_a_label, choice_b_label, weight) VALUES
('TRAP', 'Una losa se hunde bajo tu peso, y un chasquido metálico resuena desde las paredes.', 'Correr hacia adelante', 'Quedarte quieto', 10),
('TRAP', 'El aire se vuelve pesado, casi venenoso, cerca de un montículo de huesos apilados con cuidado.', 'Acercarte a investigar', 'Mantener la distancia', 10),
('TRAP', 'Una telaraña gruesa, del tamaño de una puerta, cubre el paso — algo se mueve en el centro.', 'Cortarla de un tajo', 'Buscar otro camino', 10),
('TRAP', 'El eco de tus propios pasos empieza a llegar un instante tarde, como si algo los repitiera.', 'Girarte de golpe', 'Acelerar el paso', 10),
('TRAP', 'Un símbolo grabado en el suelo brilla tenue en cuanto lo pisás.', 'Completar el símbolo', 'Borrarlo con el pie', 10),
('TRAP', 'Gotea algo espeso y oscuro desde el techo, justo sobre el camino que seguías.', 'Pasar de todos modos', 'Rodear la mancha', 10),
('VENDOR', 'Un carrito destartalado avanza solo, empujado por nadie, con mercancía tintineando.', 'Detenerlo y revisar', 'Dejarlo pasar', 10),
('VENDOR', 'Alguien silba una melodía familiar desde una hoguera pequeña, apartada del camino.', 'Acercarte al fuego', 'Seguir de largo', 10),
('VENDOR', 'Una mano pálida se asoma desde una grieta, sosteniendo algo brillante.', 'Tomar lo que ofrece', 'Ignorar la mano', 10),
('VENDOR', 'Un cartel de madera, mal escrito, anuncia "TRUEQUES" con una flecha hacia la oscuridad.', 'Seguir la flecha', 'No hacerle caso', 10),
('VENDOR', 'El sonido de monedas cayendo en cascada te guía hacia una cueva lateral.', 'Entrar a la cueva', 'Seguir el camino principal', 10),
('VENDOR', 'Una figura envuelta en velos ofrece intercambiar "algo por algo", sin decir qué.', 'Aceptar el trato', 'Rechazar la oferta', 10),
('SANCTUARY', 'Un círculo de hongos luminosos rodea un claro extrañamente tranquilo.', 'Entrar al círculo', 'Rodearlo por fuera', 10),
('SANCTUARY', 'El frío del Abismo desaparece de golpe cerca de una estatua sin rostro.', 'Apoyarte en la estatua', 'Seguir de largo', 10),
('SANCTUARY', 'Un estanque de aguas quietas refleja un cielo que no debería existir tan abajo.', 'Mirar el reflejo y descansar', 'No mirar, seguir', 10),
('SANCTUARY', 'Encontrás una pequeña hoguera ya encendida, sin nadie alrededor, ardiendo tranquila.', 'Sentarte junto al fuego', 'Apagarla y continuar', 10),
('SANCTUARY', 'Un árbol pálido, imposible en la oscuridad, deja caer una fruta madura a tus pies.', 'Comer la fruta', 'Dejarla ahí', 10),
('SANCTUARY', 'El eco de una canción de cuna resuena suave desde algún lugar cercano.', 'Seguir el sonido y descansar', 'Taparte los oídos y avanzar', 10),
('SECRET', 'Un pasadizo angosto se esconde detrás de una cascada de agua subterránea.', 'Cruzar la cascada', 'Seguir de largo', 10),
('SECRET', 'Las marcas de garras en la pared parecen formar, casi, un mapa.', 'Seguir las marcas', 'No confiar en ellas', 10),
('SECRET', 'Un escalón suena hueco bajo tu bota, distinto a los demás.', 'Forzar el escalón', 'Pisar con cuidado y seguir', 10),
('SECRET', 'Una puerta diminuta, del tamaño de un puño, está tallada en la roca — imposible de abrir a mano.', 'Buscar la forma de abrirla', 'Dejarla como curiosidad', 10),
('SECRET', 'El polvo del suelo dibuja un patrón que no parece casual.', 'Seguir el patrón', 'Barrerlo con el pie', 10),
('SECRET', 'Una corriente de aire fresco sale de una rendija que no debería tener salida al exterior.', 'Ensanchar la rendija', 'Ignorar la corriente', 10),
('STORY', 'Una armadura vacía, apoyada contra la pared, todavía sostiene una espada clavada en el suelo.', 'Examinar la armadura', 'Rendirle respeto y seguir', 10),
('STORY', 'Alguien talló su propio nombre, una y otra vez, en la misma piedra.', 'Leer el nombre', 'No detenerte', 10),
('STORY', 'Un juguete infantil, gastado por el tiempo, yace solo en medio del pasillo.', 'Recogerlo', 'Dejarlo donde está', 10),
('STORY', 'Las paredes de esta sala están cubiertas de fechas talladas, contando algo que ya no continúa.', 'Contar las fechas', 'Seguir sin mirar', 10),
('STORY', 'Un mural descolorido muestra una ciudad entera, tragada por la oscuridad.', 'Estudiar el mural', 'Continuar el descenso', 10),
('STORY', 'Cadenas rotas cuelgan del techo, todavía balanceándose levemente.', 'Investigar las cadenas', 'Pasar rápido, sin mirar arriba', 10)
ON CONFLICT DO NOTHING;
```

Con esto quedan 40 eventos en total (8 por categoría), suficiente para que no se repitan tan seguido
dentro de un mismo ciclo de 9 pisos.
