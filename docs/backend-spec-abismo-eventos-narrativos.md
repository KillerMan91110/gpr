# Spec back: Eventos narrativos en El Abismo (fase 2), ponderados por Luck

Hoy, **cada sala de una corrida es garantizado combate** — `buildTowerRoom` siempre hidrata
monstruos y crea una `combat_sessions`, sin excepción (`routes/combat.js` ~1238). Esto agrega una
categoría de sala alternativa: antes de decidir si la sala es combate, se tira una ruleta pesada
(pesos ajustados por Luck) entre COMBATE y 5 tipos de evento narrativo. Si sale evento, el jugador
ve un prompt con 2 opciones en vez de entrar directo a pelear.

No es IA en tiempo real — es una tabla de contenido pre-escrito + selección aleatoria pesada,
igual que ya funciona el resto del juego (drops, rarezas, mutaciones). Luck no cambia el texto,
cambia las probabilidades de qué categoría te toca.

## 1. Tabla nueva: `tower_room_events`

```sql
CREATE TABLE IF NOT EXISTS tower_room_events (
  id             SERIAL PRIMARY KEY,
  event_type     TEXT NOT NULL CHECK (event_type IN ('TRAP','VENDOR','SANCTUARY','SECRET','STORY')),
  prompt_text    TEXT NOT NULL,
  choice_a_label TEXT NOT NULL,
  choice_b_label TEXT NOT NULL,
  weight         INT NOT NULL DEFAULT 10
);
```

`weight` pondera QUÉ FILA dentro de su categoría sale (no la categoría en sí, eso lo maneja la
ruleta de la sección 2). Con esto ya se puede tener varias variantes de texto por categoría sin
que se sientan repetitivas.

## 2. Ruleta de categoría, pesada por Luck

En `buildTowerRoom`, antes de hidratar monstruos:

```js
const CATEGORY_BASE_WEIGHTS = { COMBAT: 55, TRAP: 15, VENDOR: 10, SANCTUARY: 8, SECRET: 7, STORY: 5 };

// Luck alta: menos trampas, más de todo lo bueno. Luck baja: al revés. El promedio de luck del
// grupo (no solo de quien inició), tope en +/-40 para no volver el combate irrelevante ni
// garantizar solo eventos buenos con luck muy alta.
function rollRoomCategory(avgLuck) {
  const shift = Math.max(-40, Math.min(40, avgLuck * 0.6));
  const w = { ...CATEGORY_BASE_WEIGHTS };
  w.TRAP = Math.max(2, w.TRAP - shift * 0.5);
  w.VENDOR += shift * 0.15;
  w.SANCTUARY += shift * 0.15;
  w.SECRET += shift * 0.1;
  w.STORY += shift * 0.1;

  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [cat, weight] of Object.entries(w)) {
    if (roll < weight) return cat;
    roll -= weight;
  }
  return 'COMBAT';
}
```

`avgLuck` = promedio del stat `luck` (ya calculado en `hydratePlayers`) de todos los humanos de la
corrida — no hace falta pedir nada nuevo, ya se hidratan en `buildTowerRoom` antes de esto.

Si `rollRoomCategory` devuelve `'COMBAT'`: **cero cambios** — sigue exactamente el flujo actual
(hidratar monstruos, crear `combat_sessions`). Si devuelve otra cosa: elegir una fila random de
`tower_room_events WHERE event_type = <categoria>` (pesada por `weight`), y en vez de crear una
sesión de combate:

```sql
ALTER TABLE player_tower_runs ADD COLUMN IF NOT EXISTS pending_event_id INT REFERENCES tower_room_events(id);
```

```js
await db.query('UPDATE player_tower_runs SET pending_event_id = $1 WHERE id = $2', [event.id, run.id]);
```

`current_session_id` queda NULL (como hoy cuando termina un piso) — `GET /tower/run` ya devuelve
`run` completo, el front distingue "sala de evento pendiente" de "piso completo" con
`run.pending_event_id != null`.

## 3. Resolver la elección: `POST /api/player/:playerId/tower/event-choice`

Body: `{ choice: 'A' | 'B' }`. Solo quien tiene el control de la corrida (misma regla que
`/advance`, `canControlRun`) puede resolver. Efecto según `event_type` + `choice`:

| Tipo | Opción A | Opción B |
|---|---|---|
| TRAP | Daño: -8% del HP máximo a todo el grupo (mismo % que ya usa el World Boss como referencia, pero un golpe único, no por turno) | Sin efecto |
| VENDOR | Suma 1 item random barato al inventario del líder (reusar `inventory.addItem`, tabla `items` filtrada por rareza COMUN/POCO_COMUN) | Sin efecto |
| SANCTUARY | Cura a todo el grupo (jugadores + NPCs vivos) a HP y maná máximo | Sin efecto |
| SECRET | +2 monedas de mazmorra a `coins_earned` de la corrida (se bancan igual que las del piso, al extraer) | Sin efecto |
| STORY | `incrementCounter(playerId, 'HISTORIAS_DEL_ABISMO_LEIDAS')` (contador nuevo, sin otro efecto) | Sin efecto |

Después de aplicar el efecto: limpiar `pending_event_id = NULL` y llamar al mismo paso de avance
de sala que hoy usa `handleTowerSessionEnd` cuando gana un combate — conviene extraer ese pedazo
(el `if (run.current_room < floorRow.room_count) { buildTowerRoom(...) } else { ...banca moneda de
piso... }`, líneas ~1316-1332) a una función compartida `advanceTowerRoomOrFloor(run, floorRow)`
para no duplicar la lógica entre el camino de combate y el de evento.

## 4. Contenido semilla (ejemplos reales, no placeholder — agregar más con el tiempo)

```sql
INSERT INTO tower_room_events (event_type, prompt_text, choice_a_label, choice_b_label, weight) VALUES
('TRAP', 'El suelo cede bajo tus pies — una fosa de picos oxidados se abre de golpe.', 'Saltar e investigar qué hay más allá', 'Retroceder con cuidado', 10),
('TRAP', 'Un hilo casi invisible cruza el pasillo. Al tensarlo, algo cruje sobre tu cabeza.', 'Cortar el hilo de un tajo', 'Rodearlo por el costado', 10),
('VENDOR', 'Una figura encapuchada aguarda junto a un carromato destartalado, entre las sombras del Abismo.', 'Comerciar con el desconocido', 'Seguir de largo', 10),
('VENDOR', 'El eco de monedas cayendo te guía hasta un pequeño campamento abandonado, con mercancía todavía tibia.', 'Revisar la mercancía', 'No tocar nada', 10),
('SANCTUARY', 'Una luz tenue emana de un altar cubierto de musgo. El aire aquí se siente más liviano.', 'Descansar junto al altar', 'Seguir descendiendo', 10),
('SANCTUARY', 'Encontrás una fuente de agua cristalina, imposible en un lugar tan profundo y oscuro.', 'Beber y descansar', 'Desconfiar y continuar', 10),
('SECRET', 'Notás una grieta apenas visible entre las rocas, oculta tras una cortina de raíces.', 'Entrar por la grieta', 'Ignorarla', 10),
('SECRET', 'Un reflejo metálico llama tu atención bajo un montón de escombros.', 'Cavar entre los escombros', 'No perder el tiempo', 10),
('STORY', 'Un diario ajado yace junto a los restos de quien alguna vez lo escribió. Las últimas palabras son casi ilegibles.', 'Leer el diario', 'Dejarlo donde está', 10),
('STORY', 'Grabados en la piedra cuentan, en un idioma casi olvidado, la historia de quienes construyeron este lugar.', 'Detenerse a descifrarlos', 'No hay tiempo para esto', 10)
ON CONFLICT DO NOTHING;
```

## 5. Front (lo hago yo una vez esté esto)

En `Tower.js`, cuando `run.pending_event_id != null` y `!session`: mostrar el prompt (`prompt_text`
+ los 2 `choice_*_label`) en vez de la pantalla de "piso completado", con 2 botones que llaman a
`POST /tower/event-choice`. Necesito que `GET /tower/run` devuelva el evento completo (no solo el
id) para no pedir un endpoint aparte — algo como `res.json({ run, floor, session, canControl,
pendingEvent })` con `pendingEvent` = la fila de `tower_room_events` si `run.pending_event_id` está
seteado.

## Checklist

1. `tower_room_events` (tabla) + `player_tower_runs.pending_event_id` (columna) — sección 1-2.
2. `rollRoomCategory` pesado por Luck promedio del grupo, enganchado en `buildTowerRoom` antes de
   hidratar monstruos — sección 2.
3. Extraer `advanceTowerRoomOrFloor` de `handleTowerSessionEnd` para reusarlo desde el nuevo
   endpoint — sección 3.
4. `POST /tower/event-choice` con la tabla de efectos por tipo — sección 3.
5. `GET /tower/run` devuelve `pendingEvent` hidratado — sección 5.
6. Seed inicial de eventos (sección 4) — se puede ampliar después, esto alcanza para probar el
   sistema end-to-end.
