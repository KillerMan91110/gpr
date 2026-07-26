# Spec back: Maestros de clase (piloto — 5 clases)

Al evolucionar a una clase con maestro definido, la próxima exploración de zona (no combate
normal) te encuentra con ese maestro en un evento narrativo corto; al ayudarlo, se instala
permanentemente en TU GREMIO (no personal — cualquier miembro puede comprarle después), con una
pequeña tienda exclusiva. Piloto de 5 clases para probar el gancho completo (encuentro simple +
encuentro en cadena tras evolucionar de nuevo) antes de decidir si se expande a las 94.

Sin tirada de azar para encontrarlo: es determinístico, en la próxima exploración después de
evolucionar — el "explorando lo encontrás" queda como sabor narrativo, no como bloqueo real.

## 0. Requisito: el jugador tiene que estar en un gremio

Si evolucionás sin estar en un gremio, no se dispara nada (se guarda igual el pendiente, ver
sección 2 — se resuelve la primera vez que sí tengas gremio). El maestro es un beneficio de
gremio, no personal, siguiendo el mismo criterio que ya usa el banco/tienda de gremio.

## 1. Tablas nuevas

```sql
CREATE TABLE IF NOT EXISTS class_masters (
  id             SERIAL PRIMARY KEY,
  class_id       INT NOT NULL REFERENCES classes(id) UNIQUE,
  name           TEXT NOT NULL,
  intro_dialogue TEXT NOT NULL,   -- lo que dice en el encuentro de exploración
  guild_dialogue TEXT NOT NULL    -- lo que dice ya instalado en el gremio (front, sección 6)
);

CREATE TABLE IF NOT EXISTS class_master_shop_items (
  id         SERIAL PRIMARY KEY,
  master_id  INT NOT NULL REFERENCES class_masters(id) ON DELETE CASCADE,
  item_id    INT NOT NULL REFERENCES items(id),
  price      INT NOT NULL  -- en oro del jugador que compra, no oro de banco de gremio
);

-- Qué maestros desbloqueó CADA gremio, y quién lo trajo (para el "gracias a fulano" del front)
CREATE TABLE IF NOT EXISTS guild_class_masters (
  guild_id           INT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  master_id          INT NOT NULL REFERENCES class_masters(id),
  unlocked_by_player_id INT REFERENCES players(id),
  unlocked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, master_id)
);

ALTER TABLE players ADD COLUMN IF NOT EXISTS pending_master_id INT REFERENCES class_masters(id);
```

## 2. Hook en evolución — `lib/evolution.js`, `evolvePlayer()` (~línea 257, justo después del
`UPDATE players SET evolution_class_id = ...`)

```js
const masterRes = await db.query('SELECT id FROM class_masters WHERE class_id = $1', [evolvesToClassId]);
if (masterRes.rows.length) {
  const masterId = masterRes.rows[0].id;
  const guildRes = await db.query('SELECT guild_id FROM guild_members WHERE player_id = $1', [playerId]);
  const guildId = guildRes.rows[0]?.guild_id;
  const alreadyUnlocked = guildId
    ? await db.query('SELECT 1 FROM guild_class_masters WHERE guild_id = $1 AND master_id = $2', [guildId, masterId])
    : { rows: [] };
  if (!alreadyUnlocked.rows.length) {
    await db.query('UPDATE players SET pending_master_id = $1 WHERE id = $2', [masterId, playerId]);
  }
}
```

(`evolvesToClassId` es el mismo valor que ya usás para el `UPDATE` de `evolution_class_id` en esa
misma función — no hace falta pedir nada nuevo.)

## 3. Hook en exploración — `routes/combat.js`, `POST /zones/:zoneId/explore` (~línea 2172), ANTES
de armar el combate normal

```js
const playerRow = await db.query('SELECT pending_master_id FROM players WHERE id = $1', [req.playerId]);
const pendingMasterId = playerRow.rows[0]?.pending_master_id;
if (pendingMasterId) {
  const guildRes = await db.query('SELECT guild_id FROM guild_members WHERE player_id = $1', [req.playerId]);
  const guildId = guildRes.rows[0]?.guild_id;
  if (guildId) {
    const master = (await db.query('SELECT * FROM class_masters WHERE id = $1', [pendingMasterId])).rows[0];
    return res.status(200).json({ masterEncounter: { masterId: master.id, name: master.name, dialogue: master.intro_dialogue } });
  }
  // Sin gremio todavia: el pendiente queda guardado, se resuelve solo cuando entres a uno.
}
```

Nada más de la lógica de exploración existente se toca — esto es un `return` temprano antes de
elegir monstruos, mismo patrón que ya usa `buildTowerRoom` en El Abismo para sus eventos.

## 4. Resolver el encuentro — `POST /api/player/:playerId/master-encounter/resolve`

```js
router.post('/:playerId/master-encounter/resolve', async (req, res, next) => {
  try {
    const playerRes = await db.query('SELECT pending_master_id FROM players WHERE id = $1', [req.params.playerId]);
    const masterId = playerRes.rows[0]?.pending_master_id;
    if (!masterId) return res.status(400).json({ error: 'No hay ningún encuentro pendiente' });

    const guildRes = await db.query('SELECT guild_id FROM guild_members WHERE player_id = $1', [req.params.playerId]);
    const guildId = guildRes.rows[0]?.guild_id;
    if (!guildId) return res.status(400).json({ error: 'Necesitás estar en un gremio' });

    await db.query(
      `INSERT INTO guild_class_masters(guild_id, master_id, unlocked_by_player_id) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [guildId, masterId, req.params.playerId]
    );
    await db.query('UPDATE players SET pending_master_id = NULL WHERE id = $1', [req.params.playerId]);
    res.json({ unlocked: true, masterId });
  } catch (err) { next(err); }
});
```

## 5. Tienda del maestro (dentro del gremio) — reusa el patrón de `GET/POST tower/vendor` y del
banco de gremio, pero cobra ORO del jugador (no oro de banco de gremio)

```js
// GET /api/guilds/:guildId/masters — lista de maestros desbloqueados + su tienda
// POST /api/guilds/:guildId/masters/:masterId/buy   body: { itemId }
```
Mismo esquema que ya usa `tower_vendor_shop`/`guild_bank_shop`: valida oro del jugador, descuenta,
`inventory.addItem`. No detallo el handler completo porque es un calco directo de esos dos que ya
existen.

## 6. Front (lo hago yo una vez esté esto)

- `ExploreZone.js`: si `POST /zones/:zoneId/explore` devuelve `masterEncounter` en vez de la sesión
  de combate de siempre, mostrar un modal (mismo patrón que el popup de evento de El Abismo) con
  el diálogo y un botón "Ayudar" que llama a `POST /master-encounter/resolve`.
- `GuildMy.js`: nueva sección "Maestros" listando `guild_class_masters` de tu gremio (nombre +
  `guild_dialogue` + quién lo trajo) con su tienda, mismo patrón visual que el banco/tienda de
  gremio que ya existe ahí.

## 7. Contenido semilla — las 5 clases piloto

Cadena Guerrero → Caballero → Paladín → Caballero Sagrado (prueba encuentro simple + en cadena) +
Mago (prueba que el gancho no depende de la familia Guerrero).

```sql
INSERT INTO class_masters (class_id, name, intro_dialogue, guild_dialogue) VALUES
(1, 'Kadric, el Veterano',
 '¡Cuidado! — un bandido cae ante vos antes de que termine de hablar. Kadric baja el brazo, sorprendido. "Hace tiempo que no veía a alguien sostener el filo con tanta convicción. Ven al gremio cuando puedas."',
 'Todavía sostengo el filo mejor que la mayoría de los novatos que veo pasar. Pero vos... vos ya no sos un novato.'),
(8, 'Dama Isolde, Guardiana del Juramento',
 'Isolde retrocede un paso, cediendo terreno ante la bestia — hasta que aparecés vos. "Pocos soportan el peso de una armadura completa sin quebrarse. Bienvenido al gremio, caballero."',
 'El juramento no se lleva en la armadura. Se lleva en no romperse cuando pesa. Vos ya lo sabés.'),
(45, 'Sumo Paladín Aurelio',
 'La luz que envuelve a Aurelio parpadea, casi extinguida — y se estabiliza en cuanto derrotás a lo que lo acosaba. "La luz no elige a cualquiera. Vos la sostuviste sin que te consumiera."',
 'Cada paladín cree que la luz lo eligió. Pocos entienden que la luz solo espera a ver quién no se quiebra primero.'),
(46, 'La Venerable Seraphine',
 'Seraphine no pide ayuda — la ofrece, incluso rodeada. Cuando termina el combate, te mira con algo parecido al reconocimiento. "El cielo mismo reconoce tu armadura, ahora."',
 'Pocos alcanzan la gracia celestial y siguen de pie. Menos todavía la llevan sin arrogancia. Vos, por ahora, sos de los pocos.'),
(2, 'Archimago Thelen',
 'Un circulo arcano inestable amenaza con colapsar sobre Thelen — lo estabilizás justo a tiempo. "El poder sin estudio es solo ruido. Vos ya entendiste eso. Ven, hay mucho que enseñarte todavía."',
 'La magia no es fuerza. Es paciencia con forma de fuego. Todavía te falta paciencia — pero eso se enseña.')
ON CONFLICT (class_id) DO NOTHING;
```

Ítems de tienda: dejo esto para después de que confirmes que el encuentro/gremio funcionan de
punta a punta — hay que revisar qué ítems ya existen en `items` para no duplicar antes de crear
"Espada del Veterano", "Escudo del Juramento", etc. Si preferís, lo armamos en una segunda pasada
junto con la UI de la tienda (sección 5-6).

## Checklist

1. `class_masters` / `class_master_shop_items` / `guild_class_masters` / `players.pending_master_id`
   — sección 1.
2. Hook en `evolvePlayer` — sección 2.
3. Hook en `/zones/:zoneId/explore` — sección 3.
4. `POST /master-encounter/resolve` — sección 4.
5. Contenido de las 5 clases piloto — sección 7 (ítems de tienda: segunda pasada).
6. Endpoints de tienda del maestro (`GET/POST /guilds/:guildId/masters...`) — sección 5, cuando
   se arme la tienda.
