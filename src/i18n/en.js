// Interfaz en inglés (etapa 1): textos fijos y patrones con {0}, {1}… Lo arma el script de traducción a partir de
// los textos de los componentes. Los diálogos, objetos, misiones y monstruos están en en_contenido.js.
// Para agregar uno a mano: 'Texto en español': 'English text'.
/* eslint-disable quotes */
export const fijos = {
 "Guerrero": "Warrior",
 "Maestros del combate cuerpo a cuerpo. Su fuerza y resistencia les permiten enfrentar a cualquier criatura en primera línea.": "Masters of close combat. Their strength and endurance let them face any creature on the front line.",
 "Mago": "Mage",
 "Estudiosos del Éter. Controlan los elementos y dominan hechizos capaces de cambiar el rumbo de cualquier batalla.": "Scholars of the Ether. They command the elements and wield spells that can turn the tide of any battle.",
 "Pícaro": "Rogue",
 "Especialistas en velocidad, venenos y golpes críticos. Atacan desde las sombras antes de desaparecer de nuevo.": "Specialists in speed, poisons and critical strikes. They strike from the shadows and vanish again.",
 "Sacerdote": "Priest",
 "Elegidos por la Luz de Etheria. Curan aliados, eliminan maldiciones y usan magia sagrada contra las fuerzas oscuras.": "Chosen by the Light of Etheria. They heal allies, lift curses and turn holy magic against the dark forces.",
 "Arquero": "Archer",
 "Expertos en combate a distancia. Su precisión abate enemigos antes incluso de ser vistos.": "Experts in ranged combat. Their aim brings enemies down before they are even seen.",
 "Gremio de Aventureros": "Adventurers' Guild",
 "Gremio de Herreros": "Blacksmiths' Guild",
 "Gremio de Encantadores": "Enchanters' Guild",
 "Gremio de Sastres": "Tailors' Guild",
 "Gremio de Alquimistas": "Alchemists' Guild",
 "Gremio de Joyeros": "Jewelers' Guild",
 "Gremio de Eruditos": "Scholars' Guild",
 "Gremio de Comerciantes": "Merchants' Guild",
 "El punto de partida de todo aventurero. Lobos, goblins, bandidos y criaturas salvajes acechan entre los campos dorados. Su guardián es el gigantesco Titán de la Pradera, cuya derrota demuestra que un aventurero está listo para dejar las tierras iniciales.": "Where every adventurer begins. Wolves, goblins, bandits and wild creatures lurk among the golden fields. Its guardian is the towering Titan of the Meadow, and defeating it proves an adventurer is ready to leave the starting lands.",
 "Gigantes de hielo, orcos, trolls y antiguos guardianes de piedra habitan estas montañas. Bajo sus picos hay minas abandonadas donde aún resuenan extraños rituales.": "Ice giants, orcs, trolls and ancient stone guardians dwell in these mountains. Beneath their peaks lie abandoned mines where strange rituals still echo.",
 "El corazón ardiente del reino. La lava dio vida a demonios, salamandras y elementales de fuego. Nadie conoce el verdadero origen del Maestro de la Lava.": "The burning heart of the kingdom. The lava gave life to demons, salamanders and fire elementals. No one knows the true origin of the Lava Master.",
 "El mar reclama a quienes se acercan demasiado. Piratas malditos, monstruos marinos y espíritus de antiguos navegantes vagan por playas envueltas en tormentas eternas.": "The sea claims those who come too close. Cursed pirates, sea monsters and the spirits of old sailors roam beaches wrapped in endless storms.",
 "Un desierto helado donde el tiempo parece detenido. Guardianes ancestrales protegen un antiguo templo oculto bajo el hielo.": "A frozen desert where time seems to stand still. Ancient guardians protect an old temple hidden beneath the ice.",
 "Las ruinas de una civilización perdida. Nigromantes, espectros y muertos vivientes custodian conocimientos que nunca debieron descubrirse.": "The ruins of a lost civilization. Necromancers, specters and the undead guard knowledge that should never have been found.",
 "El lugar donde comenzó la Gran Fractura. Aquí la magia deja de obedecer las leyes conocidas y los Guardianes Ancestrales protegen un secreto capaz de cambiar el destino de Etheria.": "The place where the Great Fracture began. Here magic stops obeying the known laws, and the Ancient Guardians protect a secret that could change the fate of Etheria.",
 "Iniciar sesión": "Log in",
 "Reino de Etheria": "Kingdom of Etheria",
 "Te damos la bienvenida a Etheria": "Welcome to Etheria",
 "Un reino donde la magia y el acero conviven desde hace siglos. Más allá de sus murallas se extiende un mundo salvaje de monstruos, ruinas olvidadas y secretos que nadie ha logrado desentrañar.": "A kingdom where magic and steel have lived side by side for centuries. Beyond its walls lies a wild world of monsters, forgotten ruins and secrets no one has managed to unravel.",
 "Crear cuenta": "Create account",
 "El Reino de Etheria": "The Kingdom of Etheria",
 "Gobernado por la Corona de Etheria, el reino es el mayor bastión de la civilización conocida. Castillos, aldeas, fortalezas y academias mágicas se alzan bajo su bandera, protegidos por caballeros, magos y aventureros.": "Ruled by the Crown of Etheria, the kingdom is the greatest stronghold of the known world. Castles, villages, fortresses and magic academies rise under its banner, guarded by knights, mages and adventurers.",
 "Aunque las ciudades son seguras, los caminos nunca lo son. Cada año aparecen nuevas criaturas, antiguas ruinas emergen de la tierra y las fuerzas oscuras avanzan un poco más.": "The cities may be safe, but the roads never are. Every year new creatures appear, ancient ruins rise from the earth and the dark forces push a little further.",
 "Por eso nació el": "That is why they founded the",
 ": una organización encargada de entrenar héroes, aceptar contratos y organizar expediciones hacia las zonas más peligrosas del reino.": ": an order that trains heroes, takes on contracts and leads expeditions into the most dangerous lands of the kingdom.",
 "La Gran Fractura": "The Great Fracture",
 "Hace más de mil años, una catástrofe conocida como la": "More than a thousand years ago, a catastrophe known as the",
 "Gran Fractura": "Great Fracture",
 "alteró el equilibrio del mundo. La energía mágica comenzó a brotar desde las profundidades de la tierra, corrompiendo bestias, despertando gigantes dormidos y abriendo portales hacia lugares prohibidos. Desde entonces, Etheria depende de sus aventureros para mantener la paz.": "upset the balance of the world. Magical energy began to well up from the depths of the earth, corrupting beasts, waking sleeping giants and opening portals to forbidden places. Ever since, Etheria has relied on its adventurers to keep the peace.",
 "Las Cinco Clases Fundamentales": "The Five Founding Classes",
 "Todo aventurero comienza su historia eligiendo uno de los cinco caminos.": "Every adventurer begins their story by choosing one of five paths.",
 "Los Maestros de Clase": "The Class Masters",
 "Cada camino tiene un Maestro del Gremio, veteranos considerados los mejores de todo Etheria. Solo quienes demuestren verdadero talento podrán aprender sus técnicas avanzadas y descubrir habilidades ocultas.": "Each path has a Guild Master, veterans considered the finest in all of Etheria. Only those who show true talent can learn their advanced techniques and uncover hidden skills.",
 "Los Grandes Gremios": "The Great Guilds",
 "La economía y la supervivencia del reino dependen de antiguos gremios especializados. Cada uno ofrece mejoras, equipo, misiones y conocimientos únicos.": "The kingdom's economy and survival depend on ancient specialized guilds. Each one offers upgrades, gear, quests and unique knowledge.",
 "Las Zonas de Etheria": "The Lands of Etheria",
 "Cada región representa un desafío mayor que la anterior.": "Each region is a greater challenge than the last.",
 "Nivel": "Level",
 "El Abismo": "The Abyss",
 "Mucho antes de la fundación del reino existía una inmensa prisión construida por una civilización desaparecida. Con el paso de los siglos fue olvidada... hasta que comenzó a abrirse de nuevo.": "Long before the kingdom was founded, a vanished civilization built an immense prison. Over the centuries it was forgotten... until it began to open again.",
 "Hoy se la conoce simplemente como": "Today it is simply known as",
 "Cada piso desciende más hacia las profundidades del mundo, donde la corrupción es más intensa y los monstruos más poderosos. Los aventureros pueden extraer antiguas": "Each floor goes deeper into the depths of the world, where the corruption is stronger and the monsters more powerful. Adventurers can bring back ancient",
 "Monedas de Mazmorra": "Dungeon Coins",
 "— pero si todo el grupo cae antes de escapar, las profundidades reclaman todo el botín. Nadie sabe cuántos pisos existen realmente.": "— but if the whole party falls before escaping, the depths claim all the loot. No one knows how many floors there really are.",
 "El Devorador de Estrellas": "The Star Devourer",
 "Existe una criatura que ningún reino ha logrado derrotar. No pertenece a este mundo.": "There is a creature no kingdom has ever defeated. It does not belong to this world.",
 "Las leyendas cuentan que cayó del cielo durante la Gran Fractura, envuelta en un eclipse. Su cuerpo absorbe la magia del entorno y consume la energía vital de todo lo que se acerca.": "Legends say it fell from the sky during the Great Fracture, wrapped in an eclipse. Its body drinks the magic around it and consumes the life of everything that comes near.",
 "Cuando aparece, todas las campanas del reino resuenan al mismo tiempo. Los aventureros abandonan sus misiones. Los gremios unen fuerzas. Incluso los Maestros de Clase toman las armas.": "When it appears, every bell in the kingdom rings at once. Adventurers abandon their quests. The guilds join forces. Even the Class Masters take up arms.",
 "Porque saben que si el Devorador de Estrellas permanece con vida demasiado tiempo... el cielo volverá a oscurecerse.": "Because they know that if the Star Devourer lives too long... the sky will go dark again.",
 "Una nueva leyenda comienza": "A new legend begins",
 "Cada monstruo derrotado. Cada jefe conquistado. Cada objeto forjado. Cada gremio fortalecido. Cada piso del Abismo explorado.": "Every monster defeated. Every boss conquered. Every item forged. Every guild made stronger. Every floor of the Abyss explored.",
 "Todo forma parte de una única historia: la historia de Etheria... y la del aventurero que decidirá el destino del reino.": "It is all part of a single story: the story of Etheria... and of the adventurer who will decide the fate of the kingdom.",
 "Comenzar mi leyenda": "Begin my legend",
 "¿Ya tienes cuenta?": "Already have an account?",
 "Etheria — un mundo por explorar": "Etheria — a world to explore",
 "Contraseña": "Password",
 "Entrando...": "Entering...",
 "Entrar al reino": "Enter the kingdom",
 "¿No tienes cuenta?": "Don't have an account?",
 "Crear Cuenta": "Create Account",
 "Picaro": "Rogue",
 "Elige una clase": "Choose a class",
 "Crear personaje": "Create character",
 "Disponible": "Available",
 "Ya está en uso": "Already taken",
 "Clase": "Class",
 "Creando...": "Creating...",
 "Mochila": "Backpack",
 "Personaje": "Character",
 "Habilidades": "Skills",
 "Evolución": "Evolution",
 "Misiones": "Quests",
 "Formación": "Party",
 "Mascotas": "Pets",
 "Gremio": "Guild",
 "Mercado": "Market",
 "Mapa": "Map",
 "Logros": "Achievements",
 "Calendario de eventos": "Event calendar",
 "Mercader ambulante": "Wandering merchant",
 "Atajos de teclado": "Keyboard shortcuts",
 "Bestiario": "Bestiary",
 "Tablón del gremio": "Guild board",
 "Enfermería": "Infirmary",
 "Artesanos del gremio": "Guild artisans",
 "Taller": "Workshop",
 "Contratar aventureros": "Hire adventurers",
 "Encantador": "Enchanter",
 "Registro de Gremios": "Guild Registry",
 "Maestro del gremio": "Guild master",
 "Inspeccionar": "Inspect",
 "Comercio": "Trade",
 "Correo": "Mail",
 "Puesto": "Stall",
 "Mi muñeco de venta": "My sales dummy",
 "Pilar de Aethra": "Pillar of Aethra",
 "Libro de visitas": "Guestbook",
 "Estatua del Viajero": "Traveler's Statue",
 "La capital": "The capital",
 "Mazmorra": "Dungeon",
 "Bajo tierra": "Underground",
 "Detrás del Velo": "Beyond the Veil",
 "Aquí te curan y aquí despiertas si caes en combate.": "They heal you here, and you wake up here if you fall in combat.",
 "Las casas de cada clase: tienda y maestro de tu oficio.": "The houses of each class: your trade's shop and master.",
 "Lyra, los puestos y la casa de subastas de Durin.": "Lyra, the stalls and Durin's auction house.",
 "La posada de Marta y el libro de visitas.": "Marta's inn and the guestbook.",
 "Puerta Sur": "South Gate",
 "El Camino Real baja a la Pradera Dorada. La diligencia está al lado.": "The Royal Road goes down to the Golden Meadow. The stagecoach is right next to it.",
 "¡Listo! Haz una ofrenda al Pilar para que la diosa bendiga tu viaje.": "Done! Make an offering at the Pillar so the goddess blesses your journey.",
 "Entumecido": "Numb",
 "El frío te cala los huesos: caminas más lento y pierdes un poco de vida. Acércate a una hoguera o come algo caliente.": "The cold chills you to the bone: you walk slower and lose a little health. Go to a campfire or eat something hot.",
 "Fuera de Fiordo Blanco el frío te va quitando el calor (más rápido de noche y con nevada). Las hogueras y la comida lo recuperan.": "Outside Fiordo Blanco the cold drains your warmth (faster at night and in snowfall). Campfires and food bring it back.",
 "Aquí estás a resguardo: recuperas el calor.": "You are sheltered here: you regain your warmth.",
 "El Devorador mira las Ruinas, pero junto a esta fuente de lágrimas no te alcanza: aquí no hay combates.": "The Devourer watches the Ruins, but it cannot reach you by this fountain of tears: there are no fights here.",
 "El Devorador mira las Ruinas: los monstruos salen corrompidos, con +20% de fuerza y +25% de botín. Junto a las fuentes de lágrimas no te alcanza.": "The Devourer watches the Ruins: monsters come out corrupted, with +20% strength and +25% loot. It cannot reach you by the fountains of tears.",
 "A oscuras": "In the dark",
 "Tu llama se apagó: ves mucho menos y los muertos te encuentran antes. Acércate a una lámpara de alma o enciende una Vela de Sebo.": "Your flame went out: you see much less and the dead find you sooner. Go to a soul lamp or light a Tallow Candle.",
 "Fuera de Vela Eterna tu llama se va gastando. Las lámparas de alma la encienden otra vez y la Vela de Sebo la llena donde sea.": "Outside Vela Eterna your flame burns down. Soul lamps light it again and a Tallow Candle refills it anywhere.",
 "Aquí la luz es segura: tu llama vuelve a arder.": "The light is safe here: your flame burns again.",
 "La puerta está sellada.": "The door is sealed.",
 "Tomás: «¡Sígueme! La flecha verde te lleva a cada lugar.»": "Tomás: «Follow me! The green arrow leads you to each place.»",
 "la Plaza del Pilar": "the Pillar Square",
 "¡Te atacaron! Perdiste la concentración.": "You were attacked! You lost your focus.",
 "Te moviste y la piedra se apagó.": "You moved and the stone went dark.",
 "en el inicio de la zona": "at the start of the zone",
 "⚔ Grupo": "⚔ Party",
 "· eres líder": "· you are the leader",
 "Salir del grupo": "Leave party",
 "Salir": "Leave",
 "Clic: opciones": "Click: options",
 "Desconectado": "Offline",
 "Nv.": "Lv.",
 "Noche": "Night",
 "Día": "Day",
 "Piedra de regreso (V)": "Hearthstone (V)",
 "Piedra de regreso": "Hearthstone",
 "sin vincular": "unbound",
 "· lista en": "· ready in",
 "Menú": "Menu",
 "Salir del mundo": "Leave the world",
 "Ventanas": "Windows",
 "Jefe mítico": "Mythic boss",
 "Jefe de la mazmorra": "Dungeon boss",
 "Jefe de zona": "Zone boss",
 "Minijefe": "Miniboss",
 "Vida compartida:": "Shared health:",
 "Cada intento le resta vida para todos. Cuando caiga, el botín se reparte según cuánto daño hiciste.": "Every attempt takes health away for everyone. When it falls, the loot is shared by how much damage you dealt.",
 "Recomendado: Nv.": "Recommended: Lv.",
 "Cuando su faro apunte a alguien, ese héroe debe usar": "When its beacon points at someone, that hero must use",
 "Defender": "Defend",
 "en su turno o perderá media vida. Su escudo cambia de debilidad cada vez que se recupera de una rotura: mira cuál tiene.": "on their turn or lose half their health. Its shield changes weakness every time it recovers from a break: check which one it has.",
 "+ · Tu nivel:": "+ · Your level:",
 ". Ve con tu grupo completo y pociones.": ". Bring your full party and potions.",
 "Desafiar": "Challenge",
 "Ahora no": "Not now",
 "Zona segura": "Safe zone",
 "¡Refuerzos!": "Reinforcements!",
 "Modo espectador": "Spectator mode",
 "¡Un guardián te vio!": "A guardian saw you!",
 "¡Emboscada!": "Ambush!",
 "Tu combate seguía abierto": "Your fight was still open",
 "¡Combate en grupo!": "Party fight!",
 "Esbirro del jefe mítico": "Mythic boss minion",
 "¡Combate!": "Fight!",
 "¡Vuelves a la pelea!": "Back to the fight!",
 "Tu grupo": "Your party",
 "¡Algo se mueve entre la hierba!": "Something moves in the grass!",
 "Página no encontrada": "Page not found",
 "Esta ruta no existe.": "This page does not exist.",
 "Volver al inicio": "Back to the start",
 "Activar música": "Turn music on",
 "Silenciar música": "Mute music",
 "Volumen de la música": "Music volume",
 "Cerca": "Nearby",
 "Grupo": "Party",
 "se pone a bailar": "starts dancing",
 "se ríe": "laughs",
 "se sienta": "sits down",
 "Saludas": "You wave",
 "Te pones a bailar": "You start dancing",
 "Te ríes": "You laugh",
 "Te sientas": "You sit down",
 "Aplaudes": "You clap",
 "Comandos: /d decir · /g gritar (o empieza con !) · /s Nombre susurrar · /r responder · /saludar /bailar /reir /sentarse /aplaudir · T emojis": "Commands: /d say · /g shout (or start with !) · /s Name whisper · /r reply · /wave /dance /laugh /sit /clap · T emojis",
 "Nadie te ha susurrado todavía": "No one has whispered to you yet",
 "Comando desconocido. Escribe /ayuda": "Unknown command. Type /help",
 "Escribe: /s Nombre mensaje": "Type: /s Name message",
 "Mensaje vacío": "Empty message",
 "Sin conexión": "Offline",
 "Minimizar": "Minimize",
 "Sin mensajes todavía.": "No messages yet.",
 "Decir… (/ayuda para ver comandos)": "Say… (/help to see commands)",
 "Enviar": "Send",
 "Cerrar": "Close",
 "⚠️ Saliste del grupo": "⚠️ You left the party",
 "Saliste del grupo en media exploración. Fuiste penalizado con la pérdida de un 10% de tu oro (": "You left the party in the middle of an expedition. You were penalized with the loss of 10% of your gold (",
 "oro).": "gold).",
 "Invitación de grupo": "Party invitation",
 "(Nv.": "(Lv.",
 "te invitó a formar un grupo co-op.": "invited you to join a co-op party.",
 "Ya están:": "Already in:",
 "✓ Aceptar": "✓ Accept",
 "✗ Rechazar": "✗ Decline",
 "¿Listo para explorar?": "Ready to explore?",
 "Aceptar": "Accept",
 "Rechazar": "Decline",
 "¿Listo para El Abismo?": "Ready for the Abyss?",
 "¿Listo para el World Boss?": "Ready for the World Boss?",
 "· líder": "· leader",
 "Conectado": "Online",
 "Oro": "Gold",
 "Monedas del Abismo": "Abyss Coins",
 "Fragmentos Cósmicos": "Cosmic Shards",
 "Regalo Diario": "Daily Gift",
 "Vuelve todos los días y junta las 28 recompensas del ciclo.": "Come back every day and collect all 28 rewards of the cycle.",
 "Te salteaste un día y se reinició la racha.": "You skipped a day and your streak was reset.",
 "¡Reclamaste": "You claimed",
 "Cargando...": "Loading...",
 "Ya reclamaste hoy, vuelve mañana": "You already claimed today, come back tomorrow",
 "Reclamando...": "Claiming...",
 "Algo salió mal": "Something went wrong",
 "Hubo un error inesperado. Probá volver al inicio.": "An unexpected error happened. Try going back to the start.",
 "está listo para eclosionar!": "is ready to hatch!",
 "Ir a reclamar": "Go claim it",
 "¡Logro!": "Achievement!",
 "Título:": "Title:",
 "Aventura": "Adventure",
 "Mundo (beta)": "World (beta)",
 "Explorar": "Explore",
 "Evento del Día": "Event of the Day",
 "Inventario": "Inventory",
 "Rangos": "Ranks",
 "Economía": "Economy",
 "Tienda de Artesanos": "Artisan Shop",
 "Taller de Crafteo": "Crafting Workshop",
 "Monstruos": "Monsters",
 "Equipo": "Gear",
 "Visor Stats": "Stats Viewer",
 "Piso": "Floor",
 "Diario": "Journal",
 "Arma": "Weapon",
 "Mano izquierda": "Off hand",
 "Casco": "Helmet",
 "Pechera": "Chest",
 "Guantes": "Gloves",
 "Botas": "Boots",
 "Accesorio": "Accessory",
 "Líder": "Leader",
 "Oficial": "Officer",
 "Miembro": "Member",
 "No se pudo cargar este jugador.": "This player could not be loaded.",
 "Rango": "Rank",
 "En Etheria desde": "In Etheria since",
 "Estadísticas": "Stats",
 "Trayectoria": "Record",
 "victorias": "wins",
 "derrotas": "losses",
 "% de victorias": "% wins",
 "jefes derrotados": "bosses defeated",
 "de": "of",
 "Sin gremio.": "No guild.",
 "Sin equipo puesto.": "No gear equipped.",
 "Acompañantes": "Companions",
 "monstruo objetivo": "target monster",
 "Matar enemigos comunes de la zona": "Kill common enemies in the zone",
 "Cumplir el requisito de combate": "Meet the combat requirement",
 "Objetivo": "Objective",
 "¡Te damos la bienvenida a Etheria!": "Welcome to Etheria!",
 "Acabas de llegar al reino. Te muestro rápido qué puedes hacer — puedes saltarlo cuando quieras.": "You just arrived in the kingdom. Here's a quick look at what you can do — you can skip it whenever you want.",
 "Elige una zona y enfrenta monstruos para ganar experiencia, oro y objetos. Empieza por la Pradera Dorada.": "Pick a zone and fight monsters to earn experience, gold and items. Start with the Golden Meadow.",
 "Acepta contratos del gremio y de NPCs para ganar recompensas extra por objetivos concretos.": "Take contracts from the guild and NPCs to earn extra rewards for specific goals.",
 "Tu gremio de aventureros: maestros de clase para aprender skills y comprar equipo, enfermería, y compañeros para reclutar.": "Your adventurers' guild: class masters to learn skills and buy gear, the infirmary, and companions to recruit.",
 "Equipa armas, armaduras y accesorios, y usa las pociones y objetos que consigas explorando.": "Equip weapons, armor and accessories, and use the potions and items you find while exploring.",
 "Las skills que fuiste aprendiendo, activas y pasivas, tanto tuyas como de tu formación.": "The skills you have learned, active and passive, both yours and your party's.",
 "Arma tu grupo de combate con NPCs reclutados para pelear junto a ti.": "Build your combat party with recruited NPCs who fight by your side.",
 "Consigue e incuba mascotas que te acompañan y te dan bonos.": "Find and hatch pets that follow you and give you bonuses.",
 "Cómprale y véndele objetos a otros jugadores.": "Buy and sell items with other players.",
 "Compra materiales y objetos especiales fuera del gremio.": "Buy materials and special items outside the guild.",
 "Usa materiales para craftear pociones, equipo y objetos únicos.": "Use materials to craft potions, gear and unique items.",
 "Objetivos de largo plazo que te dan recompensas al completarlos.": "Long-term goals that give you rewards when you complete them.",
 "Tu progreso de rango dentro del gremio, de F hasta S.": "Your rank progress in the guild, from F to S.",
 "Compárate con el resto de los aventureros del reino.": "Compare yourself with the rest of the kingdom's adventurers.",
 "Agrega amigos y chatea con otros jugadores.": "Add friends and chat with other players.",
 "¡Empieza tu leyenda!": "Begin your legend!",
 "El Abismo y el World Boss se desbloquean más adelante, cuando tengas el nivel necesario. Por ahora, ve a explorar.": "The Abyss and the World Boss unlock later, once you reach the required level. For now, go explore.",
 "Saltar tutorial": "Skip tutorial",
 "Comenzar mi aventura": "Begin my adventure",
 "Siguiente →": "Next →",
 "Cartas": "Cards",
 "clic: agregar · clic derecho: toda la pila": "click: add · right click: the whole stack",
 "Cargando…": "Loading…",
 "No te queda nada en la mochila.": "Your backpack is empty.",
 "No tienes cartas sueltas (las engarzadas se quitan en el álbum).": "You have no loose cards (socketed ones are removed in the album).",
 "Carta de": "Card of",
 "Ya conoces todas las recetas de este pergamino.": "You already know every recipe in this scroll.",
 "un crafteo nuevo": "a new recipe",
 "Leíste el pergamino": "You read the scroll",
 "Objeto de misión: no se vende ni se regala. Se va al entregar o abandonar la misión.": "Quest item: it can't be sold or given away. It goes away when you turn in or abandon the quest.",
 "Clic derecho: armar tu puesto": "Right click: set up your stall",
 "Clic derecho: abrir el sobre (tres cartas)": "Right click: open the pack (three cards)",
 "Ya conoces todas sus recetas": "You already know all its recipes",
 "Clic derecho: leer el pergamino (aprendes sus recetas)": "Right click: read the scroll (you learn its recipes)",
 "▲ Mejor que lo que llevas · clic derecho: equipar": "▲ Better than what you wear · right click: equip",
 "Clic derecho: equipar": "Right click: equip",
 "Clic derecho: usar": "Right click: use",
 "Objetos": "Items",
 "Aún no tienes cartas. Los monstruos las sueltan muy de vez en cuando.": "You don't have any cards yet. Monsters drop them every now and then.",
 "Abrir el álbum y engarzar (K)": "Open the album and socket (K)",
 "Clic derecho: abrir el álbum para engarzarla": "Right click: open the album to socket it",
 "Buscar…": "Search…",
 "Lo que tiene candado no se vende, no se desmantela ni se le da de comer a la mascota": "Locked items can't be sold, dismantled or fed to your pet",
 "Listo": "Done",
 "Candados": "Locks",
 "Clic en una casilla para ponerle o quitarle el candado. Lo que tiene candado no se vende, no se desmantela ni se le da de comer a la mascota.": "Click a slot to lock or unlock it. Locked items can't be sold, dismantled or fed to your pet.",
 "Con candado": "Locked",
 "Objeto de misión": "Quest item",
 "Mejor que lo que llevas": "Better than what you wear",
 "Tu mochila está vacía. Derrota monstruos o visita a los artesanos.": "Your backpack is empty. Defeat monsters or visit the artisans.",
 "🔒 Con candado (Mayús + clic: quitarlo)": "🔒 Locked (Shift + click: unlock)",
 "Mayús + clic: poner candado": "Shift + click: lock",
 "Objeto de viaje · no se vende ni se pierde": "Travel item · can't be sold or lost",
 "Todavía no está vinculada. Vincúlala en la Estatua del Viajero de": "It is not bound yet. Bind it at the Traveler's Statue in",
 ") para poder usarla.": ") to be able to use it.",
 "Te devuelve junto a la Estatua del Viajero de": "Takes you back to the Traveler's Statue in",
 ". Quédate quieto unos segundos para usarla.": ". Stand still for a few seconds to use it.",
 "Clic derecho o tecla V: usar": "Right click or V key: use",
 "Orden de turnos": "Turn order",
 "Turnos": "Turns",
 "estadísticas desbloqueadas": "stats unlocked",
 "botín desbloqueado": "loot unlocked",
 "¡ficha dominada!": "entry mastered!",
 "Ese combate ya terminó.": "That fight is already over.",
 "Ronda": "Round",
 "Elige un objetivo · Esc para cancelar": "Choose a target · Esc to cancel",
 "¡Comienza el combate!": "The fight begins!",
 "¡Evento!": "Event!",
 "¡Tus refuerzos están llegando!": "Your reinforcements are coming!",
 "se une a la batalla": "joins the battle",
 "¡Cuidado!": "Watch out!",
 "Enemigos de nivel superior": "Higher-level enemies",
 "Enemigo de nivel superior": "Higher-level enemy",
 "Te supera": "Outlevels you",
 "por": "by",
 "niveles: harás menos daño y recibirás más": "levels: you will deal less damage and take more",
 "Vida compartida ·": "Shared health ·",
 "Roto: pierde turnos y recibe +50% de daño": "Broken: loses turns and takes +50% damage",
 "¡Débil!": "Weak!",
 "Resiste": "Resists",
 "Débil": "Weak",
 "Afinidad sin descubrir: golpéalo con distintos elementos": "Undiscovered affinity: hit it with different elements",
 "Aliado": "Ally",
 "Mirando…": "Watching…",
 "Caíste": "You fell",
 "Tu grupo sigue peleando. Puedes mirar cómo termina o volver a tu refugio.": "Your party is still fighting. You can watch how it ends or go back to your shelter.",
 "Seguir mirando": "Keep watching",
 "Volver a mi refugio": "Back to my shelter",
 "Observando": "Watching",
 "Miras el combate de": "You watch the fight of",
 "otro aventurero": "another adventurer",
 "Dejar de mirar": "Stop watching",
 "Turno de": "Turn of",
 "Tu compañero está eligiendo qué hacer…": "Your companion is choosing what to do…",
 "tu compañero": "your companion",
 "Si no responde, en": "If they don't respond, in",
 "s podrás saltar su turno.": "s you can skip their turn.",
 "Saltar su turno (se defiende)": "Skip their turn (they defend)",
 "Atacar": "Attack",
 "Huir": "Flee",
 "Sin habilidades": "No skills",
 "Algún enemigo es débil a este elemento": "Some enemy is weak to this element",
 "Falta": "Missing",
 "Rondas para poder usarla otra vez": "Rounds until you can use it again",
 "Sin consumibles": "No consumables",
 "Cancelar (Esc)": "Cancel (Esc)",
 "No se puede mirar ese combate": "You can't watch that fight",
 "No se pudo iniciar el combate": "The fight could not start",
 "Volver al mapa": "Back to the map",
 "Terminó el combate": "The fight is over",
 "El aventurero": "The adventurer",
 "El combate se cerró.": "The fight was closed.",
 "Vuelves al mundo…": "Going back to the world…",
 "Volver ya": "Go back now",
 "¡Victoria!": "Victory!",
 "Derrota": "Defeat",
 "Escapaste": "You escaped",
 "oro": "gold",
 "¡Pieza de equipo!": "Gear piece!",
 "sube a nivel": "reaches level",
 "Tu maestro ya puede enseñarte:": "Your master can now teach you:",
 "¡Carta de": "Card of",
 "Bestiario ·": "Bestiary ·",
 "¡Derribaste al jefe mítico! El botín se reparte entre todos los cazadores.": "You brought down the mythic boss! The loot is shared among all the hunters.",
 "Ya venciste al jefe de esta mazmorra hoy: esta pasada da la mitad de experiencia y oro. El botín y el cofre salen igual.": "You already beat this dungeon's boss today: this run gives half the experience and gold. The loot and the chest are the same.",
 "Cayó un": "Down went a",
 "guardián de la cripta": "crypt guardian",
 "la Puerta del Vigía": "the Watcher's Gate",
 "¡El Vigía Caído se apaga!": "The Fallen Watcher goes dark!",
 "Cofre del Vigía": "Watcher's Chest",
 "Su cofre ya lo abriste hoy: vuelve mañana por otro.": "You already opened its chest today: come back tomorrow for another.",
 "Le quitaste": "You took",
 "de vida a": "health from",
 ". Tu aporte cuenta para el botín cuando caiga.": ". Your share counts for the loot when it falls.",
 "Tu grupo cayó. Despertarás junto al último brasero que encendiste con la mitad de la vida, y perderás un poco de oro. Los guardianes que venciste siguen vencidos.": "Your party fell. You will wake up next to the last brazier you lit with half your health, and you will lose a little gold. The guardians you defeated stay defeated.",
 "Tu grupo cayó. Despertarás en tu último refugio (el Pilar o una fogata) con la mitad de la vida, y perderás un poco de oro.": "Your party fell. You will wake up at your last shelter (the Pillar or a campfire) with half your health, and you will lose a little gold.",
 "Continuar": "Continue",
 "Visto": "Seen",
 "Botín": "Loot",
 "Dominado": "Mastered",
 "Común": "Common",
 "Poco común": "Uncommon",
 "Raro": "Rare",
 "Épico": "Epic",
 "Legendario": "Legendary",
 "Único": "Unique",
 "derrotados": "defeated",
 "más para ver": "more to see",
 "Aún no te has cruzado con esta criatura. Explora la zona para descubrirla.": "You haven't come across this creature yet. Explore the zone to discover it.",
 "Mítico": "Mythic",
 "★ Dominado": "★ Mastered",
 "Domínalo y ganas": "Master it and earn",
 "puntos de bestiario.": "bestiary points.",
 "Vida": "Health",
 "Ataque": "Attack",
 "Defensa": "Defense",
 "Magia": "Magic",
 "Def. mágica": "Magic def.",
 "Velocidad": "Speed",
 "Evasión": "Evasion",
 "Elemento": "Element",
 "sus estadísticas": "its stats",
 "No suelta objetos: su botín se reparte en la cacería.": "It drops no items: its loot is shared in the hunt.",
 "lo que suelta": "what it drops",
 "Carta": "Card",
 "Aún no la tienes": "You don't have it yet",
 "· solo del botín de la cacería": "· only from the hunt's loot",
 "No hay criaturas registradas.": "No creatures recorded.",
 "descubiertos": "discovered",
 "Cada ficha que": "Every entry you",
 "dominas": "master",
 "te da puntos de bestiario. Gástalos en amuletos: bonos permanentes que te ayudan a cazar.": "gives you bestiary points. Spend them on charms: permanent bonuses that help you hunt.",
 "Sin activar": "Inactive",
 "Mejorar": "Upgrade",
 "Activar": "Activate",
 "Máximo": "Max",
 "Primero elige una ranura del equipo (a la izquierda).": "First choose a gear slot (on the left).",
 "Cargando álbum…": "Loading album…",
 "Ranuras del equipo": "Gear slots",
 "sin equipo": "no gear",
 "Quitar (vuelve al álbum)": "Remove (back to the album)",
 "La carta volvió al álbum.": "The card went back to the album.",
 "Bonos de cartas y amuletos": "Card and charm bonuses",
 "Ninguno todavía": "None yet",
 "Álbum": "Album",
 "· clic en una carta para engarzarla en": "· click a card to socket it in",
 "· elige una ranura": "· choose a slot",
 "Aún no tienes cartas. Cada monstruo puede soltar la suya muy de vez en cuando; los minijefes y jefes, un poco más seguido. La carta mítica solo sale de la cacería del jefe mítico.": "You don't have any cards yet. Every monster can drop its own every now and then; minibosses and bosses a little more often. The mythic card only drops from the mythic boss hunt.",
 "Daño a los jefes míticos en los últimos 7 días. El primero es": "Damage to mythic bosses in the last 7 days. First place is",
 "Cazador de Lunas": "Moon Hunter",
 "; el segundo y el tercero,": "; second and third,",
 "Rastreadores Espectrales": "Spectral Trackers",
 "Nadie ha cazado un jefe mítico esta semana. ¡Sé el primero!": "No one has hunted a mythic boss this week. Be the first!",
 "· nivel": "· level",
 "daño": "damage",
 "cacerías": "hunts",
 "golpes finales": "final blows",
 "El amuleto brilla con más fuerza.": "The charm shines brighter.",
 "Puntos de bestiario": "Bestiary points",
 "puntos": "points",
 "Fichas": "Entries",
 "Amuletos": "Charms",
 "Cazadores": "Hunters",
 "Bonos": "Bonuses",
 "Elementos": "Elements",
 "Experiencia": "Experience",
 "Prob. de carta": "Card chance",
 "Vida al ganar": "Health on victory",
 "Maná al ganar": "Mana on victory",
 "Daño recibido": "Damage taken",
 "Vida máxima": "Max health",
 "Defensa mágica": "Magic defense",
 "Crítico": "Critical",
 "Daño crítico": "Critical damage",
 "Maná": "Mana",
 "Suerte": "Luck",
 "· Rango": "· Rank",
 "Atributos": "Attributes",
 "Combate": "Combat",
 "Prob. de crítico": "Critical chance",
 "Bonus daño mágico": "Magic damage bonus",
 "Habilidad única": "Unique skill",
 "Título y Gesta": "Title and Feats",
 "Título": "Title",
 "Ninguno": "None",
 "Puntos de Gesta": "Feat Points",
 "Mascota": "Pet",
 "Ninguna te acompaña. Invócala en Mascotas.": "None is with you. Summon one in Pets.",
 "En combate (cartas, amuletos, título y Gesta)": "In combat (cards, charms, title and Feats)",
 "Todavía nada. Engarza cartas (Colección, K) o equipa un título (Logros, L).": "Nothing yet. Socket cards (Collection, K) or equip a title (Achievements, L).",
 "Cartas:": "Cards:",
 "Resistencias": "Resistances",
 "Daño elemental": "Elemental damage",
 "Reputación": "Reputation",
 "Siguiente rango": "Next rank",
 "Clic derecho: desequipar": "Right click: unequip",
 "Vacío": "Empty",
 "¡Aethra te sonríe en su festival! Bendición doble.": "Aethra smiles on you during her festival! Double blessing.",
 "La moneda cae al agua… y sientes la bendición de Aethra.": "The coin falls into the water… and you feel Aethra's blessing.",
 "«Arroja una moneda a las aguas de Aethra y la Dama bendecirá tu camino.»": "«Toss a coin into the waters of Aethra and the Lady will bless your path.»",
 "✦ Hoy es el Festival de Aethra: la bendición es doble ✦": "✦ Today is the Festival of Aethra: the blessing is doubled ✦",
 "Bendición de Aethra": "Blessing of Aethra",
 "% de experiencia en combate": "% combat experience",
 "Quedan": "Time left",
 "No tienes ninguna bendición activa.": "You have no active blessing.",
 "Ya hiciste tu ofrenda de hoy": "You already made today's offering",
 "Llenar frascos de agua": "Fill water flasks",
 "Tu firma quedó en el libro.": "Your signature is in the book.",
 "Libro de visitas · El Grifo Dorado": "Guestbook · The Golden Griffin",
 "Deja unas palabras para los que vengan después…": "Leave a few words for those who come after…",
 "Firmar": "Sign",
 "Abriendo el libro…": "Opening the book…",
 "Nadie ha firmado todavía. ¡Sé el primero!": "No one has signed yet. Be the first!",
 ", nivel": ", level",
 "«Quien deja aquí el eco de su piedra, siempre encuentra el camino de vuelta.»": "«Whoever leaves the echo of their stone here always finds the way back.»",
 "Vinculada a": "Bound to",
 "Todavía no está vinculada: vincúlala aquí para poder usarla.": "It is not bound yet: bind it here to be able to use it.",
 "Lista para usar · tecla V": "Ready to use · V key",
 "Tu piedra ya está vinculada aquí": "Your stone is already bound here",
 "Vincular la piedra aquí": "Bind the stone here",
 "Úsala desde cualquier lugar: tardas unos segundos en concentrarte y, si te mueves o te atacan, se corta. Después necesita": "Use it from anywhere: it takes a few seconds to focus and, if you move or get attacked, it breaks. Then it needs",
 "minutos para recargarse.": "minutes to recharge.",
 "Rara": "Rare",
 "Legendaria": "Legendary",
 "Mítica": "Mythic",
 "Bestia": "Beast",
 "Insectoide": "Insectoid",
 "Humanoide": "Humanoid",
 "Demonio": "Demon",
 "Espectro": "Specter",
 "No muerto": "Undead",
 "Acuático": "Aquatic",
 "Dracoide": "Draconic",
 "Cósmico": "Cosmic",
 "Se fabrica en una forja": "Crafted at a forge",
 "Se llena en el Pilar de Aethra": "Filled at the Pillar of Aethra",
 "Se puede fabricar en cualquier lado": "Can be crafted anywhere",
 "Todo": "All",
 "Armas": "Weapons",
 "Mano izq.": "Off hand",
 "Armadura": "Armor",
 "Accesorios": "Accessories",
 "Frente a lo que llevas:": "Compared to what you wear:",
 "No llevas nada en ese hueco": "You have nothing in that slot",
 "(a dos manos: también se quita la mano izquierda)": "(two-handed: the off hand is removed too)",
 "Todas": "All",
 "Consumibles": "Consumables",
 "Materiales y refinados": "Materials and refined",
 "Fabricar": "Craft",
 "Desmantelar": "Dismantle",
 "Se descubren al conseguir alguno de sus materiales": "They are discovered when you get one of their materials",
 "por descubrir": "to discover",
 "Buscar receta…": "Search recipe…",
 "Solo las que tienes materiales para fabricar": "Only those you have materials for",
 "Puedo fabricar": "I can craft",
 "Oculta el equipo que todavía no puedes equipar": "Hides gear you can't equip yet",
 "Para mi nivel": "For my level",
 "Oculta las recetas de pergamino que no aprendiste": "Hides the scroll recipes you haven't learned",
 "Sin candado": "Unlocked",
 "Quitar los filtros": "Clear filters",
 "Ninguna receta con estos filtros.": "No recipe matches these filters.",
 "Todavía no descubriste ninguna: consigue materiales (cazando, recolectando o comprando) y aparecen solas.": "You haven't discovered any yet: get materials (hunting, gathering or buying) and they appear on their own.",
 "Sin recetas. Desbloquea zonas y derrota jefes para aprender más.": "No recipes. Unlock zones and defeat bosses to learn more.",
 "NUEVO": "NEW",
 "otra clase": "another class",
 "Otra clase": "Another class",
 "Nv": "Lv",
 "Puedes fabricar": "You can craft",
 "Set de jefe": "Boss set",
 "🔒 Receta sin aprender": "🔒 Recipe not learned",
 "te enseña todo el set. También aprendes esta pieza si la consigues.": "teaches you the whole set. You also learn this piece if you get it.",
 "· pieza del set": "· set piece",
 "% · pergamino": "% · scroll",
 "% por victoria": "% per victory",
 "· Dos manos": "· Two-handed",
 "Requiere nivel": "Requires level",
 "· todavía no puedes equiparlo": "· you can't equip it yet",
 "Es para": "It is for",
 ": tú no te la puedes equipar (sirve para venderla o regalarla)": ": you can't equip it (you can sell it or give it away)",
 "Éxito": "Success",
 "Obtienes": "You get",
 "Lo que cobra el artesano por su trabajo (por cada intento)": "What the artisan charges for the work (per attempt)",
 "Trabajo": "Work",
 "Materiales": "Materials",
 "¿Dónde?": "Where?",
 "Detener": "Stop",
 "No se fabricó nada": "Nothing was crafted",
 "¡Salió bien!": "It worked!",
 "Falló… se perdió parte del material": "It failed… part of the material was lost",
 "con suerte": "lucky",
 "Perdiste:": "You lost:",
 "· ¡Suerte!": "· Lucky!",
 "✗ Falló": "✗ Failed",
 "No se recuperó ningún material.": "No material was recovered.",
 "No tienes equipo de esa rareza para desmantelar.": "You have no gear of that rarity to dismantle.",
 "Equipo de otra clase o peor que el tuyo": "Gear for another class or worse than yours",
 "Desmantelaste": "You dismantled",
 "Esta vez no se recuperó nada.": "Nothing was recovered this time.",
 "Elige una o varias piezas para romperlas. Recuperas uno o dos de sus materiales, al azar; las raras, épicas y legendarias a veces dejan una piedra de encantamiento. Las piezas de jefe no vuelven.": "Choose one or more pieces to break them down. You get back one or two of their materials at random; rare, epic and legendary pieces sometimes leave an enchanting stone. Boss pieces don't come back.",
 "· tienes": "· you have",
 "Puede salir": "Can drop",
 "Mirando la pieza…": "Looking at the piece…",
 "hasta": "up to",
 "por pieza": "per piece",
 "% por pieza": "% per piece",
 "piezas elegidas": "pieces chosen",
 "unidades · cada una sortea sus materiales": "units · each one rolls its materials",
 "La puerta está cerrada. Se abrirá cuando caigan los tres guardianes.": "The door is closed. It will open when the three guardians fall.",
 "La mazmorra": "The dungeon",
 "la puerta": "the door",
 "Brasero": "Brazier",
 "su jefe": "its boss",
 "✔ Completado": "✔ Completed",
 "Cofre": "Chest",
 ": ya lo abriste (vuelve a las": ": you already opened it (come back at",
 "▶ Continuar": "▶ Continue",
 "▶ Terminar": "▶ Finish",
 "❗ ¿Tienes trabajo para mí?": "❗ Do you have work for me?",
 "Misión": "Quest",
 "◂ Volver": "◂ Back",
 "Épica": "Epic",
 "Héroe": "Hero",
 "Equipa piezas desde la ficha del personaje (C) para poder encantarlas.": "Equip pieces from the character sheet (C) to be able to enchant them.",
 "No llevas nada equipado.": "You have nothing equipped.",
 "¡Encantamiento máximo!": "Maximum enchantment!",
 "Probabilidad": "Chance",
 "Usar": "Use",
 "Cristal de Estabilidad Mayor": "Greater Stability Crystal",
 "Cristal de Estabilidad": "Stability Crystal",
 "%, tienes": "%, you have",
 "Encantando…": "Enchanting…",
 "Reforjar calidad": "Reforge quality",
 "Cada escalón multiplica todas las estadísticas de la pieza": "Each step multiplies all the piece's stats",
 "· si falla, el oro se pierde": "· if it fails, the gold is lost",
 "¡Calidad máxima!": "Maximum quality!",
 "Domingo": "Sunday",
 "Lunes": "Monday",
 "Martes": "Tuesday",
 "Miércoles": "Wednesday",
 "Jueves": "Thursday",
 "Viernes": "Friday",
 "Sábado": "Saturday",
 "Hoy": "Today",
 "Ahora": "Now",
 "No hay ningún evento ahora mismo.": "There is no event right now.",
 "Próximos": "Upcoming",
 "todo el día": "all day",
 "Varo, mercader ambulante": "Varo, wandering merchant",
 "Solo los miércoles y sábados, de 18 a 21": "Only on Wednesdays and Saturdays, from 18 to 21",
 "«Vengo de muy lejos, viajero. Lo que ves hoy no lo verás mañana… ¡mira con calma!»": "«I come from very far away, traveler. What you see today you won't see tomorrow… take your time!»",
 "Varo ya siguió su camino. Vuelve el miércoles o el sábado.": "Varo has already moved on. Come back on Wednesday or Saturday.",
 "Agotado": "Sold out",
 "Prueba superada: las sendas de este escalón ya se pueden recorrer.": "Trial passed: the paths of this step are now open.",
 "Primero tienes que superar la prueba del escalón anterior.": "First you have to pass the previous step's trial.",
 "senda oculta": "hidden path",
 "sendas ocultas": "hidden paths",
 "Todas tus sendas están reveladas": "All your paths are revealed",
 "Prueba de la Orden ·": "Trial of the Order ·",
 "Próximas habilidades:": "Upcoming skills:",
 "(nv.": "(lv.",
 "Tu clase ya no tiene más evoluciones.": "Your class has no more evolutions.",
 "Tu clase": "Your class",
 "Senda oculta": "Hidden path",
 "¡Lista para evolucionar!": "Ready to evolve!",
 "nv.": "lv.",
 "al evolucionar": "on evolving",
 "Evolucionar es para siempre. ¿Seguro?": "Evolving is forever. Are you sure?",
 "Sí, evolucionar": "Yes, evolve",
 "Cancelar": "Cancel",
 "Evolucionar a": "Evolve into",
 "Habla con Oswin para contratar aventureros.": "Talk to Oswin to hire adventurers.",
 "Puesto libre": "Free spot",
 "Poner a": "Place",
 "Contratar": "Hire",
 "· Nv.": "· Lv.",
 "Clic en un compañero o en alguien de la reserva para ver sus opciones.": "Click a companion or someone in reserve to see their options.",
 "En reserva · clic en un puesto del grupo para cambiarlo": "In reserve · click a party spot to swap them",
 "Cambiar puestos 2 ↔ 3": "Swap spots 2 ↔ 3",
 "A la reserva": "To reserve",
 "Despedir": "Dismiss",
 "Reserva": "Reserve",
 "En la Ciudad del Abismo la reserva se quedó en la superficie.": "In the Abyss City your reserve stayed on the surface.",
 "Sigue la flecha.": "Follow the arrow.",
 "Eso queda en otra zona: sigue avanzando.": "That is in another zone: keep going.",
 "Guía del aventurero": "Adventurer's guide",
 "oro · +": "gold · +",
 "Rastrear": "Track",
 "Terminar la guía y encender toda la barra": "Finish the guide and unlock the whole bar",
 "Saltar": "Skip",
 "Hasta 10 miembros": "Up to 10 members",
 "Banco de gremio y tienda exclusiva": "Guild bank and exclusive shop",
 "Emblema y color propios": "Custom emblem and color",
 "Hasta 20 miembros": "Up to 20 members",
 "Hasta 30 miembros": "Up to 30 members",
 "Alguien": "Someone",
 "un miembro": "a member",
 "1 día": "1 day",
 "Hecho.": "Done.",
 "Aquí aprendes las técnicas de tu orden y compras su equipo.": "Here you learn your order's techniques and buy its gear.",
 "Tu orden ·": "Your order ·",
 "Técnicas y equipo de tu clase, en persona con": "Your class's techniques and gear, in person with",
 "(Barrio de las Órdenes de Aurelia).": "(Aurelia's Order Quarter).",
 "Los servicios se piden en persona. Elige uno y la flecha te lleva con quien lo ofrece (el más cercano a donde estés).": "Services are requested in person. Pick one and the arrow takes you to whoever offers it (the closest to where you are).",
 "Comercia con otros jugadores": "Trade with other players",
 "Desde cualquier lugar (B)": "From anywhere (B)",
 "Gremio de aventureros": "Adventurers' guild",
 "Sin gremio": "No guild",
 "Para unirte a un gremio o fundar el tuyo, ve al Registro de Gremios de Aurelia y habla con Oswin. Un gremio te da oro y experiencia extra en cada combate.": "To join a guild or found your own, go to Aurelia's Guild Registry and talk to Oswin. A guild gives you extra gold and experience in every fight.",
 "Aquí te unes a un gremio o fundas el tuyo.": "Here you join a guild or found your own.",
 "Llévame con Oswin": "Take me to Oswin",
 "La ciudad": "The city",
 "Sala": "Hall",
 "Banco": "Bank",
 "Registro": "Log",
 "Ciudad": "City",
 "Abierto": "Open",
 "Cerrado": "Closed",
 "miembros · Eres": "members · You are",
 "% hacia el nivel": "% to level",
 "Mensaje del líder": "Leader's message",
 "El líder todavía no dejó un mensaje.": "The leader hasn't left a message yet.",
 "Editar gremio": "Edit guild",
 "Gremio actualizado.": "Guild updated.",
 "Nombre": "Name",
 "Mensaje": "Message",
 "Abierto: cualquiera entra": "Open: anyone can join",
 "Cerrado: por solicitud": "Closed: by request",
 "El emblema y el color propios se desbloquean en el nivel 3.": "The custom emblem and color unlock at level 3.",
 "Guardar": "Save",
 "En combate": "In combat",
 "Bonificación": "Bonus",
 "% oro · +": "% gold · +",
 "Victorias": "Victories",
 "Derrotas": "Defeats",
 "Jefes abatidos": "Bosses slain",
 "Beneficios": "Perks",
 "Maestros del gremio": "Guild masters",
 "Ver": "View",
 "¿Seguro? Disolver borra el gremio entero y no se puede deshacer.": "Are you sure? Disbanding deletes the whole guild and can't be undone.",
 "El gremio se disolvió.": "The guild was disbanded.",
 "Sí, disolver": "Yes, disband",
 "Eres el líder: pasa el liderazgo a otro miembro para poder salir, o disuelve el gremio.": "You are the leader: pass leadership to another member to be able to leave, or disband the guild.",
 "Disolver gremio": "Disband guild",
 "¿Seguro que quieres salir del gremio?": "Are you sure you want to leave the guild?",
 "Sí, salir": "Yes, leave",
 "Salir del gremio": "Leave the guild",
 "Cargando los encargos de la semana…": "Loading this week's tasks…",
 "Encargos de esta semana: se cumplen jugando (combates, recolección, donaciones) entre todos los miembros. Cada uno da +": "This week's tasks: they are completed by playing (fights, gathering, donations) among all members. Each one gives +",
 "XP al gremio, y completar los tres, +": "XP to the guild, and completing all three, +",
 "más. Se renuevan en": "more. They renew in",
 "✓ Cumplido": "✓ Completed",
 "Los tres de la semana": "All three of the week",
 "✓ Cobrado": "✓ Collected",
 "Solicitudes de ingreso": "Join requests",
 "Solicitud rechazada.": "Request declined.",
 "Miembros (": "Members (",
 "En línea": "Online",
 "(tú)": "(you)",
 "· en línea": "· online",
 "↑ Oficial": "↑ Officer",
 "↓ Miembro": "↓ Member",
 "Dar liderazgo": "Give leadership",
 "Expulsar": "Kick",
 "Gestionar": "Manage",
 "El banco y la tienda del gremio se desbloquean en el nivel 2.": "The guild bank and shop unlock at level 2.",
 "Aportado esta semana:": "Contributed this week:",
 "de oro": "gold",
 "Escribe cuánto oro quieres donar.": "Type how much gold you want to donate.",
 "Oro a donar": "Gold to donate",
 "Donar": "Donate",
 "Ya donaste hoy. Podrás volver a donar en": "You already donated today. You can donate again in",
 "Los que más aportan": "Top contributors",
 "Tienda del gremio": "Guild shop",
 "No hay objetos a la venta.": "There are no items for sale.",
 "Elige un objeto y a quién enviárselo.": "Choose an item and who to send it to.",
 "Objeto…": "Item…",
 "Para…": "To…",
 "Comprar y enviar": "Buy and send",
 "El líder y los oficiales compran con el oro del banco y te lo envían por el buzón.": "The leader and officers buy with the bank's gold and send it to you by mail.",
 "Todavía no pasó nada en el gremio.": "Nothing has happened in the guild yet.",
 "Unirse": "Join",
 "Fundar": "Found",
 "Registro de Gremios de Aurelia": "Aurelia Guild Registry",
 "«Fundar un gremio cuesta 50.000 de oro. Elige bien el nombre: no se aceptan repetidos.»": "«Founding a guild costs 50,000 gold. Choose the name well: duplicates are not accepted.»",
 "Tu gremio": "Your guild",
 "Abrir mi gremio (G)": "Open my guild (G)",
 "Buscar gremio por nombre…": "Search guild by name…",
 "Buscar": "Search",
 "Abriendo el registro…": "Opening the registry…",
 "No hay gremios": "There are no guilds",
 ". ¿Por qué no fundas el tuyo?": ". Why not found your own?",
 "miembro": "member",
 "Líder:": "Leader:",
 "Unirme": "Join",
 "✓ Solicitud enviada": "✓ Request sent",
 "Pedir ingreso": "Request to join",
 "Nombre del gremio": "Guild name",
 "Entre 3 y 50 letras": "Between 3 and 50 letters",
 "Mensaje para los miembros (opcional)": "Message for the members (optional)",
 "Cuesta": "Costs",
 "Fundar gremio": "Found guild",
 "¡Nuevos aventureros llegaron al gremio!": "New adventurers arrived at the guild!",
 "Los contratados se unen a tu Formación (F)": "Hired adventurers join your Party (F)",
 "Buscar nuevos (gratis)": "Look for new ones (free)",
 "Gratis en": "Free in",
 "No queda nadie en el tablón. Busca nuevos candidatos.": "There's no one left on the board. Look for new candidates.",
 "Invitación al grupo enviada": "Party invitation sent",
 "⚔ En tu grupo": "⚔ In your party",
 "⚔ Invitar al grupo": "⚔ Invite to party",
 "👣 Seguir": "👣 Follow",
 "No se pudo ver a este jugador.": "This player could not be viewed.",
 "› · Nv": "› · Lv",
 "jefes abatidos": "bosses slain",
 "logros": "achievements",
 "fichas ·": "entries ·",
 "dominadas": "mastered",
 "Sin mascota": "No pet",
 "Compañeros de su grupo": "Party companions",
 "Mano secundaria": "Off hand",
 "Consumible": "Consumable",
 "Resistencia a oscuridad": "Darkness resistance",
 "Curación": "Healing",
 "Vida por ronda": "Health per round",
 "Maná por ronda": "Mana per round",
 "de vida": "health",
 "de maná": "mana",
 "de ataque en combate": "attack in combat",
 "de defensa en combate": "defense in combat",
 "de inteligencia en combate": "intelligence in combat",
 "de velocidad en combate": "speed in combat",
 "de vida por ronda": "health per round",
 "(lo pierdes)": "(you lose it)",
 "Frente a:": "Compared to:",
 "Clase:": "Class:",
 "Clic en una tecla para cambiarla": "Click a key to change it",
 "Teclas por defecto.": "Default keys.",
 "Restablecer": "Reset",
 "Pulsa una tecla…": "Press a key…",
 "Reservadas: WASD y flechas (moverse), E y Espacio (interactuar), T (emojis), V (piedra de regreso), Enter (chat), Esc y 1-5 (combate).": "Reserved: WASD and arrows (move), E and Space (interact), T (emojis), V (hearthstone), Enter (chat), Esc and 1-5 (combat).",
 "¡Has subido de nivel!": "You leveled up!",
 "Nueva habilidad": "New skill",
 "Nuevas habilidades": "New skills",
 "Esta carta todavía tiene cosas sin recoger. Si la borras, vuelven a quien las mandó cuando venza. ¿Borrarla igual?": "This letter still has things to collect. If you delete it, they go back to the sender when it expires. Delete it anyway?",
 "Correo del reino": "Royal mail",
 "Texto a un amigo: gratis. A otros: franqueo en un buzón.": "Text to a friend: free. To others: postage at a mailbox.",
 "Lo adjunto se recoge en un buzón.": "Attachments are collected at a mailbox.",
 "Tu oro": "Your gold",
 "Bandeja": "Inbox",
 "Escribir": "Write",
 "Abriendo el buzón…": "Opening the mailbox…",
 "No tienes cartas. Las palomas del reino descansan.": "You have no letters. The kingdom's pigeons are resting.",
 "(sin asunto)": "(no subject)",
 "Tiene cosas para recoger": "Has things to collect",
 "De": "From",
 "· vence": "· expires",
 "Recoger": "Collect",
 "Responder": "Reply",
 "Borrar": "Delete",
 "Volver": "Back",
 "Para": "To",
 "Nombre del aventurero": "Adventurer's name",
 "Asunto": "Subject",
 "Escribe tu carta…": "Write your letter…",
 "Cargando el mapa…": "Loading the map…",
 "Salida": "Exit",
 "(próximamente)": "(coming soon)",
 "Tu maestro": "Your master",
 "Buzón del correo": "Mailbox",
 "Buzón": "Mailbox",
 "Tú": "You",
 "Lugar": "Place",
 "Jefe": "Boss",
 "Camina para descubrir el mapa": "Walk to reveal the map",
 "% explorado": "% explored",
 "Estatua": "Statue",
 "en otra zona": "in another zone",
 "Entera": "Whole",
 "Mundo": "World",
 "Zona": "Zone",
 "Recientes": "Recent",
 "Más baratos": "Cheapest",
 "Más caros": "Most expensive",
 "No hay nada publicado": "Nothing listed",
 "de este tipo": "of this type",
 "Vende": "Seller",
 "tú": "you",
 "Cantidad": "Quantity",
 "c/u": "each",
 "Tuya": "Yours",
 "Sin oro": "No gold",
 "Comprar": "Buy",
 "Ponle un precio mayor a 0.": "Set a price above 0.",
 "No tienes cartas en el álbum (las engarzadas no se venden).": "You have no cards in the album (socketed ones can't be sold).",
 "No tienes mascotas para vender (la activa no se vende).": "You have no pets to sell (the active one can't be sold).",
 "No tienes objetos para vender.": "You have no items to sell.",
 "Elige algo para publicarlo.": "Choose something to list it.",
 "Precio c/u": "Price each",
 "Moneda": "Currency",
 "Últimas ventas": "Recent sales",
 "Buscando…": "Searching…",
 "Promedio:": "Average:",
 "c/u (": "each (",
 "ventas)": "sales)",
 "x a": "x at",
 "Nadie lo ha vendido todavía: tú pones el precio.": "No one has sold it yet: you set the price.",
 "El mercado cobra un 5% de comisión cuando se vende.": "The market takes a 5% fee when it sells.",
 "Publicando…": "Listing…",
 "Publicar": "List",
 "Todavía no publicaste nada.": "You haven't listed anything yet.",
 "Vendido a": "Sold to",
 "Cancelada": "Cancelled",
 "Compra y vende con otros jugadores": "Buy and sell with other players",
 "Vender": "Sell",
 "Mis publicaciones": "My listings",
 "común": "common",
 "en la forja": "at the forge",
 "en el Pilar de Aethra": "at the Pillar of Aethra",
 "Lo sueltan": "Dropped by",
 "…y": "…and",
 "más.": "more.",
 "Se recoge": "Gathered",
 "Se fabrica": "Crafted",
 "en el Taller": "in the Workshop",
 "Se compra": "Bought",
 "a los artesanos por": "from the artisans for",
 "de oro.": "gold.",
 "También sale en lugares que todavía no descubriste.": "It also drops in places you haven't discovered yet.",
 "Todavía no sabes de dónde sale.": "You don't know where it comes from yet.",
 "Mercader de Ascuaria": "Ascuaria Merchant",
 "«Lo del volcán, sin meter la mano en la lava. ¿Qué te llevas?»": "«Volcano goods, without sticking your hand in the lava. What will you take?»",
 "Mercader del Puerto Antiguo": "Old Port Merchant",
 "«Todo lo que escupe el mar, seco y sin arena. Casi sin arena.»": "«Everything the sea spits out, dry and sand-free. Almost sand-free.»",
 "El último peregrino": "The last pilgrim",
 "«Tres años siguiendo una canción, y mira: terminé vendiendo pan. ¿Qué te llevas?»": "«Three years following a song, and look: I ended up selling bread. What will you take?»",
 "«¿Qué necesitas hoy, aventurero?»": "«What do you need today, adventurer?»",
 "Página": "Page",
 "Vender a los artesanos": "Sell to the artisans",
 "Clic para elegir una o varias cosas (✓). Lo equipado y lo que tiene candado 🔒 no se vende.": "Click to choose one or more things (✓). Equipped and locked 🔒 items aren't sold.",
 "No tienes nada de esa rareza para vender.": "You have nothing of that rarity to sell.",
 "Equipo de otra clase o peor que el tuyo, y botín que ninguna receta ni misión pide": "Gear for another class or worse than yours, and loot no recipe or quest asks for",
 "Elige una mercancía para comprarla.": "Choose a ware to buy it.",
 "Elige una o varias cosas de tu mochila para venderlas.": "Choose one or more things from your backpack to sell them.",
 "cosas elegidas": "things chosen",
 "unidades en total": "units in total",
 "Recibes": "You get",
 "Te quitaste el título.": "You removed your title.",
 "Gesta": "Feats",
 "¡Todos los hitos!": "All milestones!",
 "Quitar": "Remove",
 "Ninguno. Gana un logro y equipa su título: se ve sobre tu nombre.": "None. Earn an achievement and equip its title: it shows above your name.",
 "✦ Lo llevas puesto": "✦ You're wearing it",
 "Equipar título": "Equip title",
 "Jugadores": "Players",
 "Riqueza": "Wealth",
 "Gremios": "Guilds",
 "Todavía no hay nadie en este ranking.": "There's no one in this ranking yet.",
 "Fogata del campamento": "Camp bonfire",
 "1 de oro por punto de vida o maná": "1 gold per health or mana point",
 "El calor de la fogata cierra heridas y repone el maná… por un módico precio.": "The warmth of the bonfire closes wounds and restores mana… for a modest price.",
 "Sano": "Healthy",
 "Todo el grupo": "Whole party",
 "Todo el grupo está sano": "The whole party is healthy",
 "¿Recoger tu muñeco? Lo que no se vendió te llegará por correo y el muñeco se gasta.": "Pick up your dummy? What didn't sell will reach you by mail and the dummy is used up.",
 "Recoger muñeco": "Pick up dummy",
 "Plantar muñeco aquí": "Place dummy here",
 "Atiende": "Open for",
 "más en el Barrio del Mercado · comisión del mercado": "more in the Market Quarter · market fee",
 "Ventas": "Sales",
 "Todavía nadie compró. ¡Paciencia, el muñeco no se cansa!": "No one has bought yet. Patience, the dummy never gets tired!",
 "compró": "bought",
 "Pon tus cosas a la venta y tu muñeco las venderá por ti durante": "Put your things up for sale and your dummy will sell them for you for",
 "horas, aunque te desconectes. Párate en el": "hours, even if you log off. Stand in",
 "Barrio del Mercado de Aurelia": "Aurelia's Market Quarter",
 "y pulsa «Plantar». Lo que no venda te llega por correo.": "and press «Place». What doesn't sell reaches you by mail.",
 "No tienes ningún Muñeco de Venta. Pip el titiritero los vende por": "You don't have any Sales Dummy. Pip the puppeteer sells them for",
 "Llévame con Pip": "Take me to Pip",
 "Cartel": "Sign",
 "Aspecto del muñeco": "Dummy look",
 "Elige abajo lo que quieres vender.": "Choose below what you want to sell.",
 "tienes": "you have",
 "Precio por unidad": "Price per unit",
 "vida compartida": "shared health",
 "aullido: esbirros sueltos": "howl: minions released",
 "herido y huyendo": "wounded and fleeing",
 "¡luna roja!": "red moon!",
 "Aullido": "Howl",
 "Huida": "Flight",
 "Luna roja": "Red moon",
 "bramido: cabras sueltas": "bellow: goats released",
 "¡tormenta verde!": "green storm!",
 "Bramido": "Bellow",
 "Tormenta verde": "Green storm",
 "sus crías salen de la lava": "its young come out of the lava",
 "herida y escondida": "wounded and hidden",
 "¡erupción!": "eruption!",
 "Crías de fuego": "Fire spawn",
 "Erupción": "Eruption",
 "sus cangrejos salen de la arena": "its crabs come out of the sand",
 "herido y escondido": "wounded and hidden",
 "¡furia del ermitaño!": "hermit's fury!",
 "Cangrejos ermitaños": "Hermit crabs",
 "Furia": "Fury",
 "su canto: peces estelares sueltos": "its song: star fish released",
 "herida y sumergida en el cielo": "wounded and sunk into the sky",
 "¡su ojo arde como un sol!": "its eye burns like a sun!",
 "El canto": "The song",
 "Ojo de sol": "Sun eye",
 "la Pradera": "the Meadow",
 "la montaña": "the mountain",
 "el Volcán": "the Volcano",
 "la costa": "the coast",
 "las Ruinas": "the Ruins",
 "el jefe mítico": "the mythic boss",
 "escondido: sigue sus huellas": "hidden: follow its tracks",
 "· se irá en": "· it will leave in",
 "Una flecha te guía hasta él": "An arrow guides you to it",
 "Sigue la flecha hasta el jefe mítico.": "Follow the arrow to the mythic boss.",
 "Su rastro aún no llega hasta aquí.": "Its trail doesn't reach this far yet.",
 "Cuando entre todos cacen lo suficiente, al caer la noche aparecerá algo…": "When everyone has hunted enough, something will appear at nightfall…",
 "la zona": "the zone",
 "¡Jefe mítico!": "Mythic boss!",
 "Cacería terminada": "Hunt over",
 "Botín de la cacería": "Hunt loot",
 "Tu aporte:": "Your share:",
 "del daño": "of the damage",
 "· ¡golpe final!": "· final blow!",
 "XP para tu gremio": "XP for your guild",
 "¡Subiste a nivel": "You reached level",
 "¡A la caza!": "To the hunt!",
 "«Un guerrero se forja con disciplina y acero.»": "«A warrior is forged with discipline and steel.»",
 "«El conocimiento, como el fuego, quema al imprudente.»": "«Knowledge, like fire, burns the reckless.»",
 "«Respira, apunta, suelta. Lo demás es ruido.»": "«Breathe, aim, release. The rest is noise.»",
 "«No me viste. No estoy aquí. Pero ya que preguntas…»": "«You didn't see me. I'm not here. But since you ask…»",
 "Padre Anselm": "Father Anselm",
 "«Curar es más difícil que herir.»": "«Healing is harder than hurting.»",
 "Técnicas": "Techniques",
 "Tienda": "Shop",
 "«No eres de los nuestros, pero mis armas sirven a quien las pague.»": "«You're not one of us, but my weapons serve whoever pays for them.»",
 "Esta orden no tiene técnicas que enseñar.": "This order has no techniques to teach.",
 "Aprendida": "Learned",
 "Técnica de la orden": "Order technique",
 "Técnica secreta": "Secret technique",
 "Costo": "Cost",
 "maná": "mana",
 "Recarga": "Cooldown",
 "cada": "every",
 "rondas": "rounds",
 "Se aprende": "Learned by",
 "✓ Ya la dominas": "✓ You've mastered it",
 "enseña a los de su orden.": "teaches members of their order.",
 "Te la enseño cuando llegues al nivel": "I'll teach it to you when you reach level",
 "Primero completa la misión «": "First complete the quest «",
 "No te alcanza el oro": "Not enough gold",
 "Aprender": "Learn",
 "Solo los de la orden pueden comprar aquí.": "Only members of the order can buy here.",
 "La tienda está vacía por ahora.": "The shop is empty for now.",
 "No tienes equipo sin usar para vender. Lo que llevas puesto no se vende.": "You have no unused gear to sell. What you're wearing can't be sold.",
 "no tiene encargos para ti por ahora. Aparecen según tu nivel y tu rango.": "has no tasks for you right now. They appear according to your level and rank.",
 "· Nv": "· Lv",
 "reputación": "reputation",
 "· repetible": "· repeatable",
 "Aceptado": "Accepted",
 "Regeneración por turno": "Regeneration per turn",
 "Daño físico": "Physical damage",
 "Daño mágico": "Magic damage",
 "Daño recibido reducido": "Reduced damage taken",
 "Resistencia elemental": "Elemental resistance",
 "Coste de maná reducido": "Reduced mana cost",
 "XP de gremio": "Guild XP",
 "Revive 1 vez por combate": "Revives once per fight",
 "una mascota": "a pet",
 "· Nivel": "· Level",
 "· Te acompaña": "· With you",
 "Vínculo": "Bond",
 "Invocar": "Summon",
 "Alimentar": "Feed",
 "Sube el nivel y el tope en +3": "Raises the level and the cap by +3",
 "✨ Trascender (": "✨ Transcend (",
 "Clic en un material para darle 1 (sube el vínculo):": "Click a material to give it 1 (raises the bond):",
 "No tienes materiales.": "You have no materials.",
 "Establo vacío": "Empty stable",
 "Algunos monstruos sueltan huevos. Incúbalos para conseguir compañeros que te dan bonos en combate.": "Some monsters drop eggs. Hatch them to get companions that give you bonuses in combat.",
 "Sin huevos": "No eggs",
 "Los monstruos de cada zona sueltan sus huevos. De cada uno nace una mascota de esa zona.": "The monsters of each zone drop their eggs. Each one hatches a pet from that zone.",
 "De cualquier zona": "From any zone",
 "· Tienes": "· You have",
 "Puede nacer:": "Can hatch:",
 "Ya la tienes": "You already have it",
 "Todavía no la tienes": "You don't have it yet",
 "Los dos lugares están ocupados": "Both spots are taken",
 "La incubadora tiene un solo lugar": "The incubator has only one spot",
 "Primero eclosiona el que está listo": "First hatch the one that's ready",
 "Incubar": "Incubate",
 "Incubadora": "Incubator",
 "Vacía: elige un huevo en la pestaña Huevos.": "Empty: choose an egg in the Eggs tab.",
 "Vacía. Los monstruos sueltan huevos.": "Empty. Monsters drop eggs.",
 "¡Eclosionar!": "Hatch!",
 "Con": "With",
 "Puntos de Gesta (Logros, L) se abre un segundo lugar.": "Feat Points (Achievements, L) a second spot opens.",
 "Huevos": "Eggs",
 "Todavía no tienes mascotas. ¡Incuba un huevo!": "You don't have pets yet. Hatch an egg!",
 "Te acompaña": "With you",
 "No tienes huevos. Los sueltan los monstruos de cada zona.": "You have no eggs. The monsters of each zone drop them.",
 "quien las pide": "whoever asks for them",
 "◇ ??? (se revela al avanzar)": "◇ ??? (revealed as you progress)",
 "· Repetible": "· Repeatable",
 "· Única": "· Unique",
 "Objetivos": "Objectives",
 "Recompensas": "Rewards",
 "Diario de misiones": "Quest journal",
 "En curso (": "In progress (",
 "Completadas": "Completed",
 "No tienes misiones. Busca a los NPCs con un ❗ amarillo sobre la cabeza (también salen en el minimapa y en el mapa, M).": "You have no quests. Look for NPCs with a yellow ❗ above their head (they also show on the minimap and the map, M).",
 "Todavía no completaste ninguna.": "You haven't completed any yet.",
 "La flecha del mapa te lleva a su objetivo": "The map arrow takes you to its objective",
 "Dejar de rastrear": "Stop tracking",
 "❔ Entrégasela": "❔ Turn it in",
 "Se entrega": "Turned in to",
 "quien te la dio": "whoever gave it to you",
 "Entregar": "Turn in",
 "Todos en tu grupo ya la tienen": "Everyone in your party already has it",
 "Compartir con el grupo": "Share with party",
 "Si la misión quedó trabada: vuelve al primer paso (se quitan sus objetos de misión)": "If the quest got stuck: go back to the first step (its quest items are removed)",
 "Reiniciar": "Restart",
 "Abandonar": "Abandon",
 "misiones disponibles": "available quests",
 "Ver todas": "See all",
 "Requiere otra misión antes": "Requires another quest first",
 "Aceptar misión": "Accept quest",
 "Mostrar": "Show",
 "Plegar": "Fold",
 "Rastrear en el mapa": "Track on the map",
 "✔ Entrégala a": "✔ Turn it in to",
 "· ¡llévaselo a": "· take it to",
 "quien lo pide": "whoever asks for it",
 "más… (J)": "more… (J)",
 "Limpiar (": "Clear (",
 "Tiene candado: quítaselo en la mochila": "It's locked: unlock it in the backpack",
 "Elegido": "Chosen",
 "Pasiva": "Passive",
 "Mejora": "Buff",
 "Debilitación": "Debuff",
 "Estado alterado": "Status effect",
 "Especial": "Special",
 "Uno mismo": "Self",
 "Un enemigo": "One enemy",
 "Todos los enemigos": "All enemies",
 "Un aliado": "One ally",
 "Se aprende al nivel": "Learned at level",
 "Se compra al maestro": "Bought from the master",
 "Recompensa de misión": "Quest reward",
 "Se aprende con un objeto": "Learned with an item",
 "Libro de habilidades": "Skill book",
 "Activas": "Active",
 "Pasivas": "Passive",
 "aprendidas · las nuevas te las enseña tu maestro en Aurelia": "learned · your master in Aurelia teaches you new ones",
 "Todavía no aprendiste ninguna.": "You haven't learned any yet.",
 "Golpes": "Hits",
 "Requiere": "Requires",
 "(no la llevas)": "(you're not carrying it)",
 "Estado": "Status",
 "Bloqueada": "Locked",
 "Amigos": "Friends",
 "Solicitudes": "Requests",
 "⚔ En combate": "⚔ In combat",
 "💤 Ausente": "💤 Away",
 "hace tiempo": "a while ago",
 "hace un momento": "just now",
 "Estado actualizado": "Status updated",
 "Busca grupo": "Looking for party",
 "⚑ busca grupo": "⚑ looking for party",
 "Quitar de favoritos": "Remove from favorites",
 "Favorito": "Favorite",
 "Amigos desde": "Friends since",
 "Nota guardada": "Note saved",
 "Nota solo para ti (ej: tanque, juega de noche)": "Note just for you (e.g.: tank, plays at night)",
 "💬 Susurrar": "💬 Whisper",
 "➜ Rastro": "➜ Trail",
 "⚔ Invitar": "⚔ Invite",
 "📝 Nota": "📝 Note",
 "⋯ Más": "⋯ More",
 "Amigo eliminado": "Friend removed",
 "Elogios recibidos": "Praise received",
 "¿Qué estás haciendo? (lo ven tus amigos)": "What are you doing? (your friends see it)",
 "Muestra una bandera sobre tu personaje para que te inviten": "Shows a flag above your character so others invite you",
 "Buscando grupo": "Looking for party",
 "Busco grupo": "I'm looking for a party",
 "Buscar amigo o agregar por nombre…": "Search friend or add by name…",
 "Pendiente": "Pending",
 "Te envió solicitud": "Sent you a request",
 "+ Agregar": "+ Add",
 "★ Favoritos": "★ Favorites",
 "Ningún otro amigo conectado ahora.": "No other friends online right now.",
 "Todavía no tienes amigos. Busca a alguien arriba, o haz clic en un jugador del mapa → Agregar amigo.": "You don't have friends yet. Search for someone above, or click a player on the map → Add friend.",
 "Desconectados": "Offline",
 "Solo los que buscan grupo": "Only those looking for a party",
 "En tu zona": "In your zone",
 "No hay nadie más por aquí… por ahora.": "No one else around here… for now.",
 "★ amigo": "★ friend",
 "· ⚑ busca grupo": "· ⚑ looking for party",
 "Aventureros con los que te cruzaste": "Adventurers you crossed paths with",
 "Cuando pases cerca de otros jugadores, o te susurren, aparecerán aquí para que puedas agregarlos.": "When you pass near other players, or they whisper to you, they'll show up here so you can add them.",
 "Te susurró": "Whispered to you",
 "Quitar de la lista": "Remove from the list",
 "Te quieren agregar": "They want to add you",
 "No tienes solicitudes nuevas.": "You have no new requests.",
 "Solicitud rechazada": "Request declined",
 "Enviadas": "Sent",
 "Esperando respuesta": "Waiting for an answer",
 "Solicitud cancelada": "Request cancelled",
 "No tienes cartas nuevas.": "You have no new letters.",
 "En el buzón puedes escribir cartas a tus amigos y enviarles oro u objetos.": "At the mailbox you can write letters to your friends and send them gold or items.",
 "Abrir el buzón": "Open the mailbox",
 "Sonido apagado": "Sound off",
 "Sonido": "Sound",
 "Música": "Music",
 "Efectos": "Effects",
 "Activar sonido": "Turn sound on",
 "Silenciar todo": "Mute all",
 "Osito": "Teddy bear",
 "Conejito": "Bunny",
 "Gatito": "Kitten",
 "recogiendo sus cosas": "packing up their things",
 "Elige algo y cuántos quieres.": "Choose something and how many you want.",
 "El muñeco te mira con sus ojos de botón…": "The dummy looks at you with its button eyes…",
 "Muñeco": "Dummy",
 "ya cerró": "already closed",
 "Es tu muñeco.": "It's your dummy.",
 "Ver tus ventas": "See your sales",
 "¡Lo vendió todo! Vuelve otro día.": "It sold everything! Come back another day.",
 "· quedan": "· left",
 "No te alcanza": "You can't afford it",
 "Recolectable": "Gatherable",
 "Hablar": "Talk",
 "Recolectar": "Gather",
 "Joystick para moverse": "Joystick to move",
 "lo canceló": "cancelled it",
 "No tienes tanto oro": "You don't have that much gold",
 "Tu oferta": "Your offer",
 "✓ Confirmó": "✓ Confirmed",
 "✓ Listo": "✓ Ready",
 "Ofreciendo…": "Offering…",
 "Revisa bien la oferta antes de aceptar": "Check the offer carefully before accepting",
 "⚠ Quitó:": "⚠ Removed:",
 "Cambiar mi oferta": "Change my offer",
 "Esperando…": "Waiting…",
 "Aceptar intercambio": "Accept trade",
 "Volver a la oferta": "Back to the offer",
 "Revisa bien lo que recibes y lo que das.": "Check carefully what you get and what you give.",
 "Abriendo el comercio…": "Opening the trade…",
 "clic: agregar 1 · clic derecho: toda la pila · clic en tu oferta: quitar": "click: add 1 · right click: the whole stack · click your offer: remove",
 "No tienes cartas sueltas. Las engarzadas hay que quitarlas en el álbum para comerciarlas.": "You have no loose cards. Socketed ones must be removed in the album to trade them.",
 "No te queda nada para ofrecer.": "You have nothing left to offer.",
 "Recibes de": "You get from",
 "Nada": "Nothing",
 "Das": "You give",
 "quitó cosas de su oferta antes de este paso. Revisa que sea lo acordado.": "removed things from their offer before this step. Check that it's what you agreed on.",
 "Barco": "Ship",
 "Trineos": "Sleds",
 "Botes": "Boats",
 "Desplegando el mapa…": "Unfolding the map…",
 "Estás aquí": "You are here",
 "Acercar": "Zoom in",
 "Alejar": "Zoom out",
 "Centrar en mí": "Center on me",
 "Ruta del barco": "Ship route",
 "Sin explorar": "Unexplored",
 "Más allá del mapa:": "Beyond the map:",
 "Ver la zona": "See the zone",
 "Ir en el mapa": "Go on the map",
 "Esta zona todavía no está en el mundo abierto": "This zone isn't in the open world yet",
 "Valiente": "Brave",
 "Amable": "Kind",
 "Guía": "Guide",
 "Entraste al mundo desde otra pestaña: aquí los demás ya no te ven": "You entered the world from another tab: others can't see you here anymore",
 "Te llegó una carta": "You got a letter",
 "con cosas para recoger": "with things to collect",
 "Te uniste a la batalla: entrarás en cuanto termines lo que estás haciendo.": "You joined the battle: you'll go in as soon as you finish what you're doing.",
 "✖ Expulsar del grupo": "✖ Kick from party",
 "⚔ Unirse a la batalla": "⚔ Join the battle",
 "Ahora no puedes mirar otro combate.": "You can't watch another fight right now.",
 "👁 Ver combate": "👁 Watch fight",
 "🛡 Inspeccionar": "🛡 Inspect",
 "🤝 Comerciar": "🤝 Trade",
 "✉ Escribir carta": "✉ Write letter",
 "¡Ahora son amigos!": "You're now friends!",
 "Solicitud de amistad enviada": "Friend request sent",
 "Aceptar su solicitud": "Accept their request",
 "Agregar amigo": "Add friend",
 "Solicitud de amistad pendiente": "Friend request pending",
 "Elogiar:": "Praise:",
 "Ya lo elogiaste hoy": "You already praised them today",
 "Solicitud de comercio": "Trade request",
 "quiere comerciar contigo.": "wants to trade with you.",
 "Misión compartida": "Shared quest",
 "comparte una misión contigo:": "shares a quest with you:",
 "Si la aceptas, lo que cacen juntos cuenta para los dos.": "If you accept, what you hunt together counts for both.",
 "FÍS": "PHY",
 "MÁG": "MAG",
 "Sangrado": "Bleeding",
 "Quemadura": "Burn",
 "Quemado": "Burned",
 "Veneno": "Poison",
 "Ralentizado": "Slowed",
 "Lento": "Slow",
 "Paralizado": "Paralyzed",
 "Ceguera": "Blindness",
 "Ciego": "Blind",
 "Debilitado": "Weakened",
 "Provocando": "Taunting",
 "Provoca": "Taunt",
 "Mojado": "Wet",
 "Congelado": "Frozen",
 "Enraizado": "Rooted",
 "Atrapado": "Trapped",
 "Silenciado": "Silenced",
 "Silencio": "Silence",
 "Runa grabada": "Engraved rune",
 "Runa": "Rune",
 "Sentenciado": "Sentenced",
 "Sentencia": "Sentence",
 "Presa marcada": "Marked prey",
 "Presa": "Prey",
 "Plaga": "Plague",
 "Raíces espinosas": "Thorny roots",
 "Raíces": "Roots",
 "Barrera": "Barrier",
 "Clon de sombra": "Shadow clone",
 "Clon": "Clone",
 "Contragolpe": "Counter",
 "Contra": "Counter",
 "Protegido por un juramento": "Protected by an oath",
 "Juramento": "Oath",
 "Semilla": "Seed",
 "Último aliento": "Last breath",
 "Aliento": "Breath",
 "El rayo lo electrocuta, el hielo lo congela y la tierra lo vuelve barro": "Lightning shocks it, ice freezes it and earth turns it into mud",
 "Pierde su próximo turno": "Loses its next turn",
 "No puede usar habilidades, solo el ataque básico": "Can't use skills, only the basic attack",
 "El próximo golpe se lo lleva el clon": "The clone takes the next hit",
 "La mitad del daño que recibe la paga quien juró protegerlo": "Half the damage it takes is paid by whoever swore to protect it",
 "El próximo golpe mortal lo deja con 1 de vida": "The next deadly blow leaves it at 1 health",
 "Regeneración": "Regeneration",
 "Oculto": "Hidden",
 "Maldición": "Curse",
 "Protección": "Protection",
 "Maldito": "Cursed",
 "Protegido": "Protected",
 "Recibe": "Takes",
 "Reduce el daño recibido en": "Reduces damage taken by",
 "Apuntado por el faro": "Targeted by the beacon",
 "¡Faro!": "Beacon!",
 "El Vigía dispara su faro en su próximo turno. ¡Usa Defender para cubrirte!": "The Watcher fires its beacon on its next turn. Use Defend to cover yourself!",
 "Defendiendo": "Defending",
 "Recibe menos daño hasta su próximo turno": "Takes less damage until its next turn",
 "Trampa preparada": "Trap set",
 "Trampa": "Trap",
 "Se activará en su próximo turno": "It will trigger on its next turn",
 "Resistencia": "Resistance",
 "Imbuido": "Imbued",
 "La Ciudad del Pilar, capital de Etheria: la catedral de Aethra, las casas de las órdenes, el mercado y la corte. Aquí empieza todo aventurero.": "The City of the Pillar, capital of Etheria: the cathedral of Aethra, the order houses, the market and the court. Every adventurer starts here.",
 "Al norte de la Pradera Dorada, cruzando la Puerta Norte por el Camino Real. También hay diligencia desde la Aldea Espiga.": "North of the Golden Meadow, through the North Gate along the Royal Road. There is also a stagecoach from Aldea Espiga.",
 "Tierras de cultivo al sur de la capital. Aldea Espiga está en el cruce de caminos.": "Farmland south of the capital. Aldea Espiga sits at the crossroads.",
 "Al este de la Pradera, siguiendo el Camino del Este. El Bastión de Hierro está en el corazón de la sierra.": "East of the Meadow, along the East Road. The Iron Bastion stands at the heart of the range.",
 "Al sur de las Montañas Grises, bajando por el Paso del Humo. Ascuaria, la ciudad de los dracónidos, está sobre una meseta de basalto.": "South of the Gray Mountains, down the Smoke Pass. Ascuaria, the city of the dragonborn, sits on a basalt plateau.",
 "Al sur del Volcán Rojo, bajando por la Bajada de Basalto desde la Caldera del Titán. El Puerto Antiguo y los palafitos de Coralia están junto al mar.": "South of the Red Volcano, down the Basalt Descent from the Titan's Caldera. The Old Port and the stilt houses of Coralia are by the sea.",
 "Lejos al noreste, al otro lado del Mar del Norte: solo se llega en el barco de Rhaegar, que zarpa del Puerto Antiguo. Fiordo Blanco, la ciudad de los norteños, está junto al muelle.": "Far to the northeast, across the North Sea: you can only get there on Rhaegar's ship, which sails from the Old Port. Fiordo Blanco, the city of the northerners, is by the dock.",
 "Bajo tierra: se baja por la escalera sellada del fondo de la Cripta Congelada, en la Tundra. Más adelante también por la cripta de la Catedral de Aurelia. Vela Eterna, la ciudad de los Velados, está en el medio.": "Underground: you go down the sealed stairway at the bottom of the Frozen Crypt, in the Tundra. Later also through the crypt of Aurelia's Cathedral. Vela Eterna, the city of the Veiled, is in the middle.",
 "Al lado de Aurelia y al norte de las Montañas Grises, detrás del Velo de Aethra: una niebla blanca que no deja pasar. Se abre un solo hueco, la Puerta del Velo, al norte del Pinar Nevado, cuando Elenya pone los seis Fragmentos en el Pilar. El Santuario de las Lágrimas, el último de los aethrinos, está pasando la Puerta.": "Next to Aurelia and north of the Gray Mountains, behind the Veil of Aethra: a white mist that lets no one through. Only one gap opens, the Veil Gate, north of the Snowy Pinewood, when Elenya places the six Shards on the Pillar.",
 "Definitiva": "Ultimate",
 "— DEFINITIVA —": "— ULTIMATE —",
 "¡Contragolpe!": "Counter!",
 "¡Clon!": "Clone!",
 "¡Último aliento!": "Last breath!",
 "Barrera rota": "Barrier broken",
 "¡Presa!": "Prey!",
 "¡Esquiva!": "Dodge!",
 "¡Débil! ¡Crítico!": "Weak! Critical!",
 "¡Crítico! · Resiste": "Critical! · Resists",
 "¡Crítico!": "Critical!",
 "¡No pudo huir!": "Couldn't flee!",
 "Escudo restaurado": "Shield restored",
 "¡ROTO!": "BROKEN!",
 "¡FURIA!": "FURY!",
 "Oswin · Registro de Gremios": "Oswin · Guild Registry",
 "Elenya · Catedral de Aethra": "Elenya · Cathedral of Aethra",
 "Aelin · Barrio Élfico": "Aelin · Elven Quarter",
 "Lyra · Barrio del Mercado": "Lyra · Market Quarter",
 "Brokk · Forja enana": "Brokk · Dwarven forge",
 "Durin · Banco Real": "Durin · Royal Bank",
 "Tablón de encargos · Plaza del Pilar": "Task board · Pillar Square",
 "Fogata de la Aldea Espiga": "Aldea Espiga bonfire",
 "Buzón · Plaza del Pilar": "Mailbox · Pillar Square",
 "Buzón · Aldea Espiga": "Mailbox · Aldea Espiga",
 "Pip · Barrio del Mercado": "Pip · Market Quarter",
 "Tablón de encargos · Aldea Espiga": "Task board · Aldea Espiga",
 "Recluta aventureros para tu grupo.": "Recruit adventurers for your party.",
 "Recupera vida y maná.": "Restore health and mana.",
 "Mejora tu equipo con piedras.": "Upgrade your gear with stones.",
 "Artesanos": "Artisans",
 "Materiales y venta de botín.": "Materials and loot selling.",
 "Fabrica y desmantela equipo.": "Craft and dismantle gear.",
 "Manda y recoge oro, objetos y cartas.": "Send and collect gold, items and letters.",
 "Muñecos de venta": "Sales dummies",
 "Pip vende el muñeco que atiende tu puesto.": "Pip sells the dummy that runs your stall.",
 "Encargos": "Tasks",
 "Misiones del tablón.": "Board quests.",
 "Ningún gremio alzó su estandarte": "No guild has raised its banner",
 "Fuego": "Fire",
 "Hielo": "Ice",
 "Rayo": "Lightning",
 "Viento": "Wind",
 "Tierra": "Earth",
 "Agua": "Water",
 "Luz": "Light",
 "Oscuridad": "Darkness",
 "la rueda de emojis": "the emoji wheel",
 "la piedra de regreso": "the hearthstone",
 "el chat": "the chat",
 "cerrar ventanas": "closing windows",
 "el combate": "combat",
 "Espacio": "Space",
 "Usa una letra o un número.": "Use a letter or a number.",
 "Paso de la ciudad": "City pace",
 "Perdiste: Paso de la ciudad": "You lost: City pace",
 "la entrada de la mazmorra": "the dungeon entrance",
 "El paso está cerrado.": "The pass is closed.",
 "Encender": "Light",
 "🌑 El sol tiembla… Se acerca un eclipse. Si no quieres pelear con lo que trae, busca una fuente de lágrimas.": "🌑 The sun trembles… An eclipse is coming. If you don't want to fight what it brings, find a fountain of tears.",
 "🌑 ¡Eclipse! El Devorador mira las Ruinas: los monstruos salen corrompidos, más fuertes y con más botín. Junto a las fuentes de lágrimas no te alcanza.": "🌑 Eclipse! The Devourer watches the Ruins: monsters come out corrupted, stronger and with more loot. It can't reach you by the fountains of tears.",
 "☀️ El eclipse pasó: vuelve la luz del atardecer.": "☀️ The eclipse is over: the evening light returns.",
 "‹Mercader ambulante›": "‹Wandering merchant›",
 "Hablar con Varo, mercader ambulante": "Talk to Varo, wandering merchant",
 "Examinar el escondite": "Examine the hideout",
 "Entumecido: el frío te cala los huesos": "Numb: the cold chills you to the bone",
 "🥶 Estás entumecido: caminas más lento y el frío te quita vida. Busca una hoguera o come algo caliente.": "🥶 You're numb: you walk slower and the cold drains your health. Find a campfire or eat something hot.",
 "Ya no estás entumecido": "You're no longer numb",
 "el Pilar de Aethra": "the Pillar of Aethra",
 "la Estatua del Viajero": "the Traveler's Statue",
 "tu maestro": "your master",
 "Elenya, en la Catedral": "Elenya, in the Cathedral",
 "Brokk, en su forja": "Brokk, at his forge",
 "la Puerta Sur": "the South Gate",
 "los monstruos": "the monsters",
 "un recurso": "a resource",
 "Tu llama se apagó": "Your flame went out",
 "🕯️ Tu llama se apagó: estás a oscuras. Ves mucho menos y los muertos te encuentran antes. Busca una lámpara de alma o enciende una Vela de Sebo.": "🕯️ Your flame went out: you're in the dark. You see much less and the dead find you sooner. Find a soul lamp or light a Tallow Candle.",
 "Tu llama vuelve a arder": "Your flame burns again",
 "🔔 La campana del puerto suena: la marea empieza a subir. Si estás en un banco de arena, vuelve a la orilla.": "🔔 The harbor bell rings: the tide is starting to rise. If you're on a sandbank, go back to the shore.",
 "🌊 La marea está bajando: aparecen los bancos de arena hasta los islotes de las Rocas.": "🌊 The tide is going out: sandbanks appear all the way to the islets of the Rocks.",
 "🌊 La marea sube: el agua cubre los bancos de arena.": "🌊 The tide is rising: the water covers the sandbanks.",
 "🌊 ¡Una ola te arrastra hasta la orilla!": "🌊 A wave drags you to the shore!",
 "Lugar de misión": "Quest location",
 "Examinar": "Examine",
 "Algo te observa…": "Something is watching you…",
 "Destino de la escolta": "Escort destination",
 "tu escoltado": "your escort",
 "la lámpara de alma": "the soul lamp",
 "la fuente de lágrimas": "the fountain of tears",
 "la fogata": "the campfire",
 "Recoger hierbas": "Gather herbs",
 "Picar la veta de mineral": "Mine the ore vein",
 "Abrir el cofre": "Open the chest",
 "Recoger setas": "Gather mushrooms",
 "Cortar el tronco": "Chop the log",
 "Recoger la flor luminosa": "Pick the glowing flower",
 "Revisar el nido": "Check the nest",
 "Registrar los restos": "Search the remains",
 "Cosechar el lino": "Harvest the flax",
 "Recoger el cuarzo de río": "Collect the river quartz",
 "Segar el trigo": "Reap the wheat",
 "Picar la veta de acero": "Mine the steel vein",
 "Talar el pino": "Fell the pine",
 "Recoger la flor de nieve": "Pick the snow flower",
 "Recoger el cristal del lago": "Collect the lake crystal",
 "Picar la veta de obsidiana": "Mine the obsidian vein",
 "Raspar el azufre de la fumarola": "Scrape the sulfur from the vent",
 "Recoger la flor de ceniza": "Pick the ash flower",
 "Revisar el nido de salamandra": "Check the salamander nest",
 "Partir la geoda ardiente": "Split the burning geode",
 "Picar la veta de coral": "Mine the coral vein",
 "Recoger las algas": "Gather the seaweed",
 "Sacar las ostras": "Collect the oysters",
 "Registrar los restos del naufragio": "Search the shipwreck remains",
 "Revisar la poza de marea": "Check the tide pool",
 "Abrir la concha gigante": "Open the giant shell",
 "Picar la veta de hielo eterno": "Mine the eternal ice vein",
 "Recoger la flor de escarcha": "Pick the frost flower",
 "Talar el pino blanco": "Fell the white pine",
 "Pescar en el agujero del hielo": "Fish in the ice hole",
 "Desprender una runa del menhir": "Pry a rune from the menhir",
 "Registrar el trineo abandonado": "Search the abandoned sled",
 "Revolver la pila de huesos": "Dig through the bone pile",
 "Recoger las setas pálidas": "Gather the pale mushrooms",
 "Picar la veta de plata sepulcral": "Mine the sepulchral silver vein",
 "Juntar la cera del candelabro": "Collect the candelabra wax",
 "Llenar un frasco en el pozo de almas": "Fill a flask at the soul well",
 "Registrar el sarcófago": "Search the sarcophagus",
 "Cortar el bloque de mármol": "Cut the marble block",
 "Picar la veta de oro primordial": "Mine the primordial gold vein",
 "Recoger las flores luminosas": "Pick the glowing flowers",
 "Llenar un frasco en la fuente de lágrimas": "Fill a flask at the fountain of tears",
 "Juntar el polvo del cráter": "Gather the crater dust",
 "Abrir el relicario del templo": "Open the temple reliquary",
 "arco o ballesta": "bow or crossbow",
 "daga": "dagger",
 "arma de filo": "bladed weapon",
 "escudo": "shield",
 "un arma": "a weapon",
 "Arco o ballesta": "Bow or crossbow",
 "Daga": "Dagger",
 "Arma de filo": "Bladed weapon",
 "Escudo": "Shield",
 "Un arma": "A weapon",
 "Monje": "Monk",
 "Inteligencia": "Intelligence",
 "Sonido e idioma": "Sound and language",
 "Idioma": "Language",
 "Tablón de encargos": "Task board"
};

export const patrones = [
 [
  "{0} te espera en {1}. Los maestros aethrinos llegan con los peregrinos, cuando cae la Entidad Corrupta del Templo.",
  "{0} is waiting for you in {1}. The Aethrin masters arrive with the pilgrims, when the Corrupted Entity of the Temple falls."
 ],
 [
  "«Ya figuras en el registro de {0}. Para cambiar de gremio, primero tienes que salir del tuyo (tecla G).»",
  "«You are already on the registry of {0}. To change guilds, you first have to leave yours (G key).»"
 ],
 [
  "✨ Subes por la escalera de luz, que se arma escalón por escalón bajo tus pies, y bajas en {0}.",
  "✨ You climb the stairway of light, which builds itself step by step under your feet, and come down at {0}."
 ],
 [
  "Vence a los guardianes que patrullan ({0}/{1}). Si te ven, te persiguen: muévete fuera de su luz.",
  "Defeat the patrolling guardians ({0}/{1}). If they see you, they chase you: stay out of their light."
 ],
 [
  "🛶 Óbolo empuja la barca con la pértiga. El agua negra no hace ruido. Te deja en {0}.",
  "🛶 Óbolo pushes the boat with his pole. The black water makes no sound. He leaves you at {0}."
 ],
 [
  "{0} entró con su formación completa: no quedaba lugar para ti. Haz tu propio intento.",
  "{0} went in with a full party: there was no room for you. Make your own attempt."
 ],
 [
  "Tu piedra todavía no está vinculada. Vincúlala en la Estatua del Viajero de {0} ({1}).",
  "Your stone is not bound yet. Bind it at the Traveler's Statue in {0} ({1})."
 ],
 [
  "⚡ ¡Te alcanzó un rayo! −{0} de vida. Cuando veas la sombra en el suelo, ¡muévete!",
  "⚡ You were struck by lightning! −{0} health. When you see the shadow on the ground, move!"
 ],
 [
  "Venciste a {0}: {1} está completada. Sal y vuelve a entrar para recorrerla otra vez.",
  "You defeated {0}: {1} is complete. Leave and come back in to run it again."
 ],
 [
  "{0} de 5 cargas: la Palma Liberada y el Puño del Primer Vigía las gastan todas",
  "{0} of 5 charges: Released Palm and First Watcher's Fist spend them all"
 ],
 [
  "🔥 ¡Te cayó una brasa! −{0} de vida. Bajo los arcos de basalto estás a salvo.",
  "🔥 An ember hit you! −{0} health. You are safe under the basalt arches."
 ],
 [
  "🧬 ¡Descubriste una nueva senda de evolución: {0}! Mírala en Evolución (Y).",
  "🧬 You discovered a new evolution path: {0}! See it in Evolution (Y)."
 ],
 [
  "En curso. Míralo en tu diario de misiones (J) y vuelve con {0} al terminar.",
  "In progress. See it in your quest journal (J) and come back to {0} when you finish."
 ],
 [
  "Es para {0}: tú no te la puedes equipar. Sirve para venderla o regalarla.",
  "It is for {0}: you can't equip it. You can sell it or give it away."
 ],
 [
  "🥶 El frío te quita {0} de vida. Busca una hoguera o come algo caliente.",
  "🥶 The cold takes {0} health. Find a campfire or eat something hot."
 ],
 [
  "La flecha te lleva con {0}, en el Barrio de las Órdenes de Aurelia.",
  "The arrow takes you to {0}, in Aurelia's Order Quarter."
 ],
 [
  "🔔 ¡Descubriste un crafteo nuevo: {0}! Míralo en el Taller (U).",
  "🔔 You discovered a new recipe: {0}! See it in the Workshop (U)."
 ],
 [
  "☠ ¡{0} ha aparecido en {1}{2}! La noche no terminará hasta que caiga.",
  "☠ {0} has appeared in {1}{2}! The night will not end until it falls."
 ],
 [
  "🔔 ¡Descubriste {0} crafteos nuevos! Míralos en el Taller (U).",
  "🔔 You discovered {0} new recipes! See them in the Workshop (U)."
 ],
 [
  "El próximo golpe con elemento la hace estallar (+{0}% de daño)",
  "The next elemental hit makes it burst (+{0}% damage)"
 ],
 [
  "{0} asestó el golpe final. {1} cazadores participaron. ¡Amanece!",
  "{0} landed the final blow. {1} hunters took part. Dawn breaks!"
 ],
 [
  "¡El gremio cumplió los tres encargos de la semana! (+{0} XP)",
  "The guild completed all three tasks of the week! (+{0} XP)"
 ],
 [
  "La piedra todavía no tiene fuerza. Estará lista en {0} min.",
  "The stone has no power yet. It will be ready in {0} min."
 ],
 [
  "Ha aparecido en {0}{1}. La noche no terminará hasta que caiga.",
  "It has appeared in {0}{1}. The night will not end until it falls."
 ],
 [
  "{0} entró sin ti: todavía estabas recuperando el aliento.",
  "{0} went in without you: you were still catching your breath."
 ],
 [
  "Aceptaste «{0}». Lo que cacen juntos cuenta para los dos.",
  "You accepted «{0}». What you hunt together counts for both."
 ],
 [
  "🧸 {0} Úsalo desde la mochila en el Barrio del Mercado.",
  "🧸 {0} Use it from your backpack in the Market Quarter."
 ],
 [
  "La piedra se entibia en tu mano. Ahora te traerá a {0}.",
  "The stone warms in your hand. Now it will bring you to {0}."
 ],
 [
  "El próximo golpe físico lo desvía y lo devuelve al {0}%",
  "Deflects the next physical hit and returns it at {0}%"
 ],
 [
  "Cada golpe que recibe lo cura el {0}% de su vida máxima",
  "Every hit it takes heals {0}% of its max health"
 ],
 [
  "🛶 ¡Sube y no toques la lava! La balsa te lleva a {0}.",
  "🛶 Climb aboard and don't touch the lava! The raft takes you to {0}."
 ],
 [
  "Encendiste {0}. Si caes o sales, retomarás desde aquí.",
  "You lit {0}. If you fall or leave, you will start again from here."
 ],
 [
  "⚓ ¡Leven anclas! La Gaviota Insolente te lleva a {0}.",
  "⚓ Weigh anchor! The Gaviota Insolente takes you to {0}."
 ],
 [
  "{0} {1} · se revelan al cumplir alguno de sus requisitos",
  "{0} {1} · revealed when you meet any of their requirements"
 ],
 [
  "🔒 {0} tiene candado: no se vende ni se da de comer.",
  "🔒 {0} is locked: it can't be sold or fed."
 ],
 [
  "Escudo: {0}/{1} (las debilidades lo rompen más rápido)",
  "Shield: {0}/{1} (weaknesses break it faster)"
 ],
 [
  "✦ {0} derribó a {1} junto a {2} cazadores más. ¡Amanece{3}!",
  "✦ {0} brought down {1} together with {2} more hunters. Dawn breaks{3}!"
 ],
 [
  "{0} entró en combate mientras mirabas otra pelea.",
  "{0} started a fight while you were watching another."
 ],
 [
  "+{0}% velocidad de movimiento mientras estés en {1}.",
  "+{0}% movement speed while you're in {1}."
 ],
 [
  "Llegaste, pero {0} se quedó atrás. Ve a buscarlo.",
  "You arrived, but {0} stayed behind. Go get them."
 ],
 [
  "🐕 ¡Agárrate fuerte! Los perros te llevan a {0}.",
  "🐕 Hold on tight! The dogs take you to {0}."
 ],
 [
  "📜 ¡Aprendiste {0}! {1}. Búscalos en el Taller (U).",
  "📜 You learned {0}! {1}. Find them in the Workshop (U)."
 ],
 [
  "Le pediste a {0} comerciar. Esperando respuesta…",
  "You asked {0} to trade. Waiting for an answer…"
 ],
 [
  "⛵ ¡Agárrate a la borda! El bote te lleva a {0}.",
  "⛵ Hold on to the rail! The boat takes you to {0}."
 ],
 [
  "Encargo cumplido: «{0}» (+{1} XP para el gremio).",
  "Task done: «{0}» (+{1} XP for the guild)."
 ],
 [
  "Sin el arma que piden ya no puedes usar: {0}{1}.",
  "Without the weapon they need you can no longer use: {0}{1}."
 ],
 [
  "Sigues a {0}. Muévete para dejar de seguirlo.",
  "You're following {0}. Move to stop following."
 ],
 [
  "Se aprende con {0} o consiguiendo esta pieza",
  "Learned with {0} or by getting this piece"
 ],
 [
  "{0} entró en otro combate mientras peleabas.",
  "{0} started another fight while you were fighting."
 ],
 [
  "Tus combates empiezan con {0}. Quedan {1} min.",
  "Your fights start with {0}. {1} min left."
 ],
 [
  "Aceptaste «{0}». Lo verás en tu diario (J).",
  "You accepted «{0}». You'll see it in your journal (J)."
 ],
 [
  "Cada vez que actúa, la luz lo quema por {0}",
  "Every time it acts, the light burns it for {0}"
 ],
 [
  "¡Comercio con {0} completado! Recibiste: {1}.",
  "Trade with {0} complete! You received: {1}."
 ],
 [
  "🧸 {0} le compró {1}x {2} a tu muñeco (+{3} de oro)",
  "🧸 {0} bought {1}x {2} from your dummy (+{3} gold)"
 ],
 [
  "Absorbe {0} de daño antes de tocar la vida",
  "Absorbs {0} damage before touching health"
 ],
 [
  "Recupera {0}% de su vida máxima cada ronda{1}{2}",
  "Recovers {0}% of its max health each round{1}{2}"
 ],
 [
  "🛒 ¡Agárrate! La vagoneta te lleva a {0}.",
  "🛒 Hold on tight! The mine cart takes you to {0}."
 ],
 [
  "Desde el nivel {0}, {1} te la va a ofrecer{2}.",
  "From level {0}, {1} will offer it to you{2}."
 ],
 [
  "{0} actualizó la información del gremio.",
  "{0} updated the guild info."
 ],
 [
  "{0} compró un objeto de la tienda para {1}.",
  "{0} bought an item from the shop for {1}."
 ],
 [
  "Tu muñeco puede ofrecer hasta {0} cosas.",
  "Your dummy can offer up to {0} things."
 ],
 [
  "Pierde {0}% de su vida máxima cada ronda{1}{2}",
  "Loses {0}% of its max health each round{1}{2}"
 ],
 [
  "Refugio: {0}. Si caes, despertarás aquí.",
  "Shelter: {0}. If you fall, you'll wake up here."
 ],
 [
  "Ataque +{0} hasta el final del combate",
  "Attack +{0} until the end of the fight"
 ],
 [
  "{0} mascota{1} en la colección · {2} huevos",
  "{0} pet{1} in the collection · {2} eggs"
 ],
 [
  "✉ {0}{1}. Léela en un buzón o en Social.",
  "✉ {0}{1}. Read it at a mailbox or in Social."
 ],
 [
  "{0}{1} está abierta. Ve a enfrentar a {2}.",
  "{0}{1} is open. Go face {2}."
 ],
 [
  "{0} / {1} logros · {2} de {3} puntos de Gesta",
  "{0} / {1} achievements · {2} of {3} Feat points"
 ],
 [
  "🏅 ¡Exploraste toda {0}! +{1} oro, +{2} XP",
  "🏅 You explored all of {0}! +{1} gold, +{2} XP"
 ],
 [
  "🃏 {0} Míralas en la Colección (K).",
  "🃏 {0} See them in the Collection (K)."
 ],
 [
  "· {0} esbirros cazados (defensa −{1}%)",
  "· {0} minions hunted (defense −{1}%)"
 ],
 [
  "Necesitas nivel {0} para equiparlo",
  "You need level {0} to equip it"
 ],
 [
  "(¡ya las tienes! llévaselas a {0})",
  "(you have them! take them to {0})"
 ],
 [
  "Paso de la ciudad: +{0}% velocidad",
  "City pace: +{0}% speed"
 ],
 [
  "{0} descubiertos · {1} dominados de {2}",
  "{0} discovered · {1} mastered out of {2}"
 ],
 [
  "{0} entró en combate lejos de ti.",
  "{0} started a fight far from you."
 ],
 [
  "¡Encontraste el escondite de {0}!",
  "You found {0}'s hideout!"
 ],
 [
  "Puedes adjuntar hasta {0} cosas.",
  "You can attach up to {0} things."
 ],
 [
  "¿Despedir a {0}? Es permanente.",
  "Dismiss {0}? It is permanent."
 ],
 [
  "✔ «{0}»: ya puedes entregarla.",
  "✔ «{0}»: you can turn it in now."
 ],
 [
  "Se puede usar cada {0} rondas.",
  "Can be used every {0} rounds."
 ],
 [
  "Ganado hasta ahora: {0} de oro",
  "Earned so far: {0} gold"
 ],
 [
  "Compartiste «{0}» con tu grupo",
  "You shared «{0}» with your party"
 ],
 [
  "Puedes ofrecer hasta {0} cosas",
  "You can offer up to {0} things"
 ],
 [
  "Puede perder el turno (25%){0}{1}",
  "May lose its turn (25%){0}{1}"
 ],
 [
  "Los enemigos lo atacan a él{0}{1}",
  "Enemies attack it{0}{1}"
 ],
 [
  "Recargando: lista en {0} min.",
  "Recharging: ready in {0} min."
 ],
 [
  "¡El gremio subió a nivel {0}!",
  "The guild reached level {0}!"
 ],
 [
  "Ahora llevas el título «{0}».",
  "You now wear the title «{0}»."
 ],
 [
  "Si lo vendes todo: {0} de oro",
  "If you sell everything: {0} gold"
 ],
 [
  "🗺 Descubriste {0} ({1}/{2}) · +{3} XP",
  "🗺 You discovered {0} ({1}/{2}) · +{3} XP"
 ],
 [
  "{0} ¡Alguien te elogió como {1}!",
  "{0} Someone praised you as {1}!"
 ],
 [
  "{0} no quiso comerciar ahora.",
  "{0} didn't want to trade right now."
 ],
 [
  "Sus ataques hacen daño de {0}{1}{2}",
  "Its attacks deal {0} damage{1}{2}"
 ],
 [
  "La piedra te devuelve a {0}.",
  "The stone takes you back to {0}."
 ],
 [
  "Se equipa desde el nivel {0}",
  "Equippable from level {0}"
 ],
 [
  "{0} le pasó el liderazgo a {1}.",
  "{0} passed leadership to {1}."
 ],
 [
  "{0}: volviste al primer paso",
  "{0}: you went back to the first step"
 ],
 [
  "{0} min juntos · lazo máximo",
  "{0} min together · max bond"
 ],
 [
  "¿Quitar a {0} de tus amigos?",
  "Remove {0} from your friends?"
 ],
 [
  "Engarzaste la Carta de {0}.",
  "You socketed the {0} Card."
 ],
 [
  "Marcar lo que no usas ({0})",
  "Mark what you don't use ({0})"
 ],
 [
  "{0} no lleva nada equipado.",
  "{0} has nothing equipped."
 ],
 [
  "{0} hizo algo en el gremio.",
  "{0} did something in the guild."
 ],
 [
  "Le quitaste {0} de vida a {1}.",
  "You took {0} health from {1}."
 ],
 [
  "Esperando a que {0} acepte…",
  "Waiting for {0} to accept…"
 ],
 [
  "Falla el {0}% de sus golpes{1}{2}",
  "Misses {0}% of its hits{1}{2}"
 ],
 [
  "La flecha te lleva con {0}.",
  "The arrow takes you to {0}."
 ],
 [
  "Lista. Recarga de {0} min.",
  "Ready. Recharge: {0} min."
 ],
 [
  "{0} ascendió a {1} a Oficial.",
  "{0} promoted {1} to Officer."
 ],
 [
  "{0} donó {1} de oro al banco.",
  "{0} donated {1} gold to the bank."
 ],
 [
  "Curar a todos · {0} de oro",
  "Heal everyone · {0} gold"
 ],
 [
  "Compraste {0} por {1} de oro.",
  "You bought {0} for {1} gold."
 ],
 [
  "Siguiendo el rastro de {0}",
  "Following {0}'s trail"
 ],
 [
  "Tienes {0} carta{1} sin leer.",
  "You have {0} unread letter{1}."
 ],
 [
  "⚔ {0} te invita a su grupo",
  "⚔ {0} invites you to their party"
 ],
 [
  "{0} ya no está en tu grupo",
  "{0} is no longer in your party"
 ],
 [
  "Gremio campeón ‹{0}› · Nv {1}",
  "Champion guild ‹{0}› · Lv {1}"
 ],
 [
  "Despiertas {0}, aturdido.{1}",
  "You wake up {0}, dazed.{1}"
 ],
 [
  "Encantamiento +{0} de +10",
  "Enchantment +{0} of +10"
 ],
 [
  "{0} degradó a {1} a Miembro.",
  "{0} demoted {1} to Member."
 ],
 [
  "Vendiste {0} por {1} de oro.",
  "You sold {0} for {1} gold."
 ],
 [
  "¡Ahora eres amigo de {0}!",
  "You're now friends with {0}!"
 ],
 [
  "Comercio cancelado: {0} {1}.",
  "Trade cancelled: {0} {1}."
 ],
 [
  "{0} ya no tiene candado.",
  "{0} is no longer locked."
 ],
 [
  "· sale {0}% de las veces",
  "· drops {0}% of the time"
 ],
 [
  "Recargando: lista en {0}",
  "Recharging: ready in {0}"
 ],
 [
  "{0}: ahora se abre con {1}.",
  "{0}: now opens with {1}."
 ],
 [
  "Incubadora ocupada ({0})",
  "Incubator busy ({0})"
 ],
 [
  "Comercio cancelado: {0}.",
  "Trade cancelled: {0}."
 ],
 [
  "Perdiste de vista a {0}.",
  "You lost sight of {0}."
 ],
 [
  "Piedra de regreso · {0}",
  "Hearthstone · {0}"
 ],
 [
  "Nuevo en la barra: {0}.",
  "New on the bar: {0}."
 ],
 [
  "Miras el combate de {0}",
  "You watch {0}'s fight"
 ],
 [
  "{0} escapó del combate.",
  "{0} escaped from the fight."
 ],
 [
  "({0} de estos, al azar)",
  "({0} of these, at random)"
 ],
 [
  "{0} abandonó el gremio.",
  "{0} left the guild."
 ],
 [
  "Buscar nuevos · {0} oro",
  "Look for new ones · {0} gold"
 ],
 [
  "¡{0} trascendió! Nivel {1}",
  "{0} transcended! Level {1}"
 ],
 [
  "Lazo: {0} ({1} min juntos)",
  "Bond: {0} ({1} min together)"
 ],
 [
  "Solicitud enviada a {0}",
  "Request sent to {0}"
 ],
 [
  "¡Qué suerte! Salió {0}",
  "Lucky! You got {0}"
 ],
 [
  "{0} se unió al gremio.",
  "{0} joined the guild."
 ],
 [
  "· {0} piezas de equipo",
  "· {0} gear pieces"
 ],
 [
  "Algo despierta en {0}…",
  "Something awakens in {0}…"
 ],
 [
  "La tecla {0} es para {1}.",
  "The {0} key is for {1}."
 ],
 [
  "{0} está desconectado",
  "{0} is offline"
 ],
 [
  "Corres a ayudar a {0}",
  "You run to help {0}"
 ],
 [
  "{0} necesita tu ayuda",
  "{0} needs your help"
 ],
 [
  "{0} cayó en la pelea.",
  "{0} fell in the fight."
 ],
 [
  "Varo te entrega: {0}.",
  "Varo hands you: {0}."
 ],
 [
  "{0} te la ofrece en {1}.",
  "{0} offers it to you in {1}."
 ],
 [
  "¡Evolucionaste a {0}!{1}",
  "You evolved into {0}!{1}"
 ],
 [
  "{0} ya es del gremio.",
  "{0} is now in the guild."
 ],
 [
  "({0} de oro en total)",
  "({0} gold in total)"
 ],
 [
  "{0} aguarda la noche…",
  "{0} awaits the night…"
 ],
 [
  "Aprender ({0} de oro)",
  "Learn ({0} gold)"
 ],
 [
  "{0} vuelve al establo",
  "{0} goes back to the stable"
 ],
 [
  "{0} ahora te acompaña",
  "{0} is now with you"
 ],
 [
  "Bien alimentado: {0}",
  "Well fed: {0}"
 ],
 [
  "Perdiste {0} de oro.",
  "You lost {0} gold."
 ],
 [
  "Franqueo: {0} de oro",
  "Postage: {0} gold"
 ],
 [
  "Mascota nivel {0} · {1}",
  "Level {0} pet · {1}"
 ],
 [
  "Próximo hito: {0} · {1}",
  "Next milestone: {0} · {1}"
 ],
 [
  "· desde el nivel {0}",
  "· from level {0}"
 ],
 [
  "(desde el nivel {0})",
  "(from level {0})"
 ],
 [
  "Ver el puesto de {0}",
  "See {0}'s stall"
 ],
 [
  "✦ {0}: +{1} oro, +{2} XP.{3}",
  "✦ {0}: +{1} gold, +{2} XP.{3}"
 ],
 [
  "🎁 Reclamar día {0}",
  "🎁 Claim day {0}"
 ],
 [
  "{0} crafteos nuevos",
  "{0} new recipes"
 ],
 [
  "¡{0} ganó la pelea!",
  "{0} won the fight!"
 ],
 [
  "-{0}% daño recibido",
  "-{0}% damage taken"
 ],
 [
  "Desmantelado: {0}x {1}",
  "Dismantled: {0}x {1}"
 ],
 [
  "que se llamen «{0}»",
  "named «{0}»"
 ],
 [
  "Contratar · {0} oro",
  "Hire · {0} gold"
 ],
 [
  "{0} se inquieta · {1}/{2}",
  "{0} grows restless · {1}/{2}"
 ],
 [
  "☆ {0} se desconectó",
  "☆ {0} went offline"
 ],
 [
  "{0}{1}% de resistencia{2}{3}",
  "{0}{1}% resistance{2}{3}"
 ],
 [
  "✔ ¡{0} completada!",
  "✔ {0} complete!"
 ],
 [
  "{0}% vida al ganar",
  "{0}% health on victory"
 ],
 [
  "{0}% maná al ganar",
  "{0}% mana on victory"
 ],
 [
  "Ofrecer {0} de oro",
  "Offer {0} gold"
 ],
 [
  "{0} minutos juntos",
  "{0} minutes together"
 ],
 [
  "Requiere nivel {0}",
  "Requires level {0}"
 ],
 [
  "Desconectado · {0}",
  "Offline · {0}"
 ],
 [
  "{0}/{1} min juntos → {2}",
  "{0}/{1} min together → {2}"
 ],
 [
  "✨ {0}: +{1} oro, +{2} XP{3}",
  "✨ {0}: +{1} gold, +{2} XP{3}"
 ],
 [
  "las huellas de {0}",
  "{0}'s tracks"
 ],
 [
  "+{0}% experiencia",
  "+{0}% experience"
 ],
 [
  "Desequipaste {0}.{1}",
  "You unequipped {0}.{1}"
 ],
 [
  "Fabricando {0}… {1}/{2}",
  "Crafting {0}… {1}/{2}"
 ],
 [
  "Desmantelar ({0})",
  "Dismantle ({0})"
 ],
 [
  "Faltan {0} de oro",
  "{0} gold short"
 ],
 [
  "y la Carta de {0}",
  "and the {0} Card"
 ],
 [
  "Elogiaste a {0}: {1}",
  "You praised {0}: {1}"
 ],
 [
  "No recibe daño{0}{1}",
  "Takes no damage{0}{1}"
 ],
 [
  "Hablar en {0}...",
  "Speak in {0}..."
 ],
 [
  "Resiste {0} (+{1}%)",
  "Resists {0} (+{1}%)"
 ],
 [
  "Hablando con {0}",
  "Talking to {0}"
 ],
 [
  "✦ Comenzó: {0}. {1}",
  "✦ Started: {0}. {1}"
 ],
 [
  "Aprendiste: {0}.",
  "You learned: {0}."
 ],
 [
  "¡{0} completada!",
  "{0} complete!"
 ],
 [
  "Comercio con {0}",
  "Trade with {0}"
 ],
 [
  "★ {0} se conectó",
  "★ {0} came online"
 ],
 [
  "{0}% más de daño",
  "{0}% more damage"
 ],
 [
  "· Tu nivel: {0}",
  "· Your level: {0}"
 ],
 [
  "Un {0} te ataca",
  "A {0} attacks you"
 ],
 [
  "· +{0} de Gesta",
  "· +{0} Feat"
 ],
 [
  "Débil a {0} ({1}%)",
  "Weak to {0} ({1}%)"
 ],
 [
  ": ¡{0} se abre!",
  ": {0} opens!"
 ],
 [
  "✔ Entregar: {0}",
  "✔ Turn in: {0}"
 ],
 [
  "Encantar a +{0}",
  "Enchant to +{0}"
 ],
 [
  "{0} expulsó a {1}.",
  "{0} kicked {1}."
 ],
 [
  "· te faltan {0}",
  "· you need {0} more"
 ],
 [
  "{0}: en combate",
  "{0}: in combat"
 ],
 [
  "Aprendiste {0}{1}.",
  "You learned {0}{1}."
 ],
 [
  "¡Eclosionó {0}!",
  "{0} hatched!"
 ],
 [
  "Abandonaste {0}",
  "You abandoned {0}"
 ],
 [
  "Misiones de {0}",
  "{0}'s quests"
 ],
 [
  "atiende {0} más",
  "open for {0} more"
 ],
 [
  "{0} está listo.",
  "{0} is ready."
 ],
 [
  "Enfrentar a {0}",
  "Face {0}"
 ],
 [
  "Desafiar al {0}",
  "Challenge the {0}"
 ],
 [
  "Expulsar a {0}",
  "Kick {0}"
 ],
 [
  "Recolectar {0}",
  "Gather {0}"
 ],
 [
  "Equipaste {0}.{1}",
  "You equipped {0}.{1}"
 ],
 [
  "{0} recuperado",
  "{0} restored"
 ],
 [
  "· vendidos {0}",
  "· {0} sold"
 ],
 [
  "por {0} de oro",
  "for {0} gold"
 ],
 [
  "Aceptaste: {0}",
  "You accepted: {0}"
 ],
 [
  "Se cruzaron{0}",
  "Crossed paths{0}"
 ],
 [
  "{0} ya aceptó.",
  "{0} already accepted."
 ],
 [
  "Hablar con {0}",
  "Talk to {0}"
 ],
 [
  "Desafiar a {0}",
  "Challenge {0}"
 ],
 [
  "Recibiste {0}{1}",
  "You received {0}{1}"
 ],
 [
  "Elemento: {0}",
  "Element: {0}"
 ],
 [
  "Turno de {0}.",
  "{0}'s turn."
 ],
 [
  "(+{0} puntos)",
  "(+{0} points)"
 ],
 [
  "Comprar ({0})",
  "Buy ({0})"
 ],
 [
  "Tienda de {0}",
  "{0}'s shop"
 ],
 [
  "Incubando {0}",
  "Incubating {0}"
 ],
 [
  "Puesto de {0}",
  "{0}'s stall"
 ],
 [
  "Oferta de {0}",
  "{0}'s offer"
 ],
 [
  "{0} aumentado",
  "{0} up"
 ],
 [
  "{0} aumentada",
  "{0} up"
 ],
 [
  "+{0}% cartas",
  "+{0}% cards"
 ],
 [
  "Carta de {0}",
  "{0} Card"
 ],
 [
  "hace {0} min",
  "{0} min ago"
 ],
 [
  "{0} · Rango {1}{2}",
  "{0} · Rank {1}{2}"
 ],
 [
  "{0} miembros",
  "{0} members"
 ],
 [
  "({0} turnos)",
  "({0} turns)"
 ],
 [
  "Desafiar {0}",
  "Challenge {0}"
 ],
 [
  "MÍTICO · {0}",
  "MYTHIC · {0}"
 ],
 [
  "{0} reducido",
  "{0} down"
 ],
 [
  "{0} reducida",
  "{0} down"
 ],
 [
  "Abrir el {0}",
  "Open the {0}"
 ],
 [
  "Camino a {0}",
  "Road to {0}"
 ],
 [
  "{0} · Rango {1}",
  "{0} · Rank {1}"
 ],
 [
  "Calor: {0}%",
  "Warmth: {0}%"
 ],
 [
  "Llama: {0}%",
  "Flame: {0}%"
 ],
 [
  "junto a {0}",
  "next to {0}"
 ],
 [
  "Niveles {0}",
  "Levels {0}"
 ],
 [
  "Matar a {0}",
  "Kill {0}"
 ],
 [
  "{0}: +{1} oro{2}{3}.",
  "{0}: +{1} gold{2}{3}."
 ],
 [
  "+{0}% botín",
  "+{0}% loot"
 ],
 [
  "{0} (vacío)",
  "{0} (empty)"
 ],
 [
  "· Nivel {0}",
  "· Level {0}"
 ],
 [
  "Encargos{0}",
  "Tasks{0}"
 ],
 [
  "Miembros{0}",
  "Members{0}"
 ],
 [
  "· Rango {0}",
  "· Rank {0}"
 ],
 [
  "calidad {0}",
  "quality {0}"
 ],
 [
  "Curar · {0}",
  "Heal · {0}"
 ],
 [
  "Misión: {0}",
  "Quest: {0}"
 ],
 [
  "· Tarda {0}",
  "· Takes {0}"
 ],
 [
  "Arma de {0}",
  "{0} weapon"
 ],
 [
  "Daño de {0}",
  "{0} damage"
 ],
 [
  "Usaste {0}",
  "You used {0}"
 ],
 [
  "{0} objeto{1}",
  "{0} item{1}"
 ],
 [
  "Juega {0}…",
  "{0} is playing…"
 ],
 [
  "Tienes {0}",
  "You have {0}"
 ],
 [
  "{0} piezas",
  "{0} pieces"
 ],
 [
  "{0}: listo",
  "{0}: done"
 ],
 [
  "Puesto {0}",
  "Spot {0}"
 ],
 [
  "hace {0} h",
  "{0} h ago"
 ],
 [
  "hace {0} d",
  "{0} d ago"
 ],
 [
  "{0}: vacío",
  "{0}: empty"
 ],
 [
  "Quitar {0}",
  "Remove {0}"
 ],
 [
  "quedan {0}",
  "{0} left"
 ],
 [
  "{0} de oro{1}",
  "{0} gold{1}"
 ],
 [
  "{0} comió {1}",
  "{0} ate {1}"
 ],
 [
  "{0} de oro",
  "{0} gold"
 ],
 [
  "JEFE · {0}",
  "BOSS · {0}"
 ],
 [
  "+{0}% oro",
  "+{0}% gold"
 ],
 [
  "Nivel {0}",
  "Level {0}"
 ],
 [
  "Visto {0}",
  "Seen {0}"
 ],
 [
  "y {0} más",
  "and {0} more"
 ],
 [
  "Falta {0}",
  "Missing {0}"
 ],
 [
  "Rango {0}",
  "Rank {0}"
 ],
 [
  "+{0} oro",
  "+{0} gold"
 ],
 [
  "Para {0}",
  "To {0}"
 ],
 [
  "{0} días",
  "{0} days"
 ],
 [
  "Piso {0}",
  "Floor {0}"
 ],
 [
  "{0} maná",
  "{0} mana"
 ],
 [
  "Sin {0}",
  "No {0}"
 ],
 [
  "{0} oro",
  "{0} gold"
 ],
 [
  "Nv. {0}",
  "Lv. {0}"
 ],
 [
  "Nv {0}",
  "Lv {0}"
 ]
];
