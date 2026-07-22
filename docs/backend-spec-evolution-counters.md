# Spec back: contadores de evolución + fix de clase evolucionada

Contexto: el sistema de evolución de clases (`lib/evolution.js`, tablas `class_evolutions`/`class_evolution_requirements`) ya soporta requisitos de tipo `ITEM`, `EQUIPMENT`, `NO_WEAPON` y `STAT_THRESHOLD` correctamente. El tipo `COUNTER` está cargado en `db/seed.sql` (48 códigos distintos, usados en decenas de ramas de evolución) pero **nunca se implementó** — `checkRequirement` devuelve siempre `available:false` para `COUNTER`, así que ninguna evolución que lo use es alcanzable hoy.

Esta spec cubre: (1) el fix de un bug separado pero relacionado (la clase evolucionada no se refleja en ranking/búsqueda), (2) la infraestructura de contadores, y (3) el contenido nuevo (skills) que hace falta para que los 48 códigos tengan sentido.

Todo lo diseñado acá fue charlado y confirmado en detalle con el dueño del proyecto — no son decisiones mías, son especificaciones ya cerradas. Donde algo quedó como "asumo X", es porque no se cerró explícitamente esa arista puntual; avisen si no es así.

---

## 1. Fix: la clase evolucionada no aparece en ranking/búsqueda/gremio

`players` tiene `current_class_id` (clase base) y `evolution_class_id` (se llena al evolucionar, `current_class_id` nunca se toca). La clase "real" a mostrar siempre es `COALESCE(p.evolution_class_id, p.current_class_id)`.

**Ya está bien** en `social.js` (amigos), `coop.js` (grupos) y `server.js` perfil de jugador (`GET /api/player/:playerId/profile`).

**Hay que arreglar** (cambiar `JOIN classes c ON c.id = p.current_class_id` por `JOIN classes c ON c.id = COALESCE(p.evolution_class_id, p.current_class_id)`) en:
- `server.js` → `GET /api/leaderboard` (línea ~422-424)
- `server.js` → `GET /api/leaderboard/wealth` (línea ~443-446)
- `server.js` → `GET /api/players/search` (línea ~834-839)
- `routes/guilds.js` → `GET /mine` (línea ~63-67)
- `routes/guilds.js` → `GET /:id` (línea ~119-124)
- `routes/guilds.js` → `GET /:id/requests` (línea ~500-505)

Fix mecánico, bajo riesgo, 6 lugares.

---

## 2. Infraestructura de contadores

### 2.1 Schema

```sql
CREATE TABLE IF NOT EXISTS player_counters (
  player_id    INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  counter_code TEXT NOT NULL,
  value        INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, counter_code)
);
```

### 2.2 Helper (`lib/counters.js`, nuevo archivo)

```js
const db = require('../db/db');

async function incrementCounter(playerId, code, amount = 1) {
  if (!amount) return;
  await db.query(
    `INSERT INTO player_counters(player_id, counter_code, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (player_id, counter_code)
     DO UPDATE SET value = player_counters.value + $3, updated_at = now()`,
    [playerId, code, amount]
  );
}

async function getCounter(playerId, code) {
  const res = await db.query(
    'SELECT value FROM player_counters WHERE player_id = $1 AND counter_code = $2',
    [playerId, code]
  );
  return res.rows[0]?.value ?? 0;
}

module.exports = { incrementCounter, getCounter };
```

### 2.3 Alias — `KILLS_DIVINO` y `KILLS_NATURALEZA`

Confirmado: no se crean elementos nuevos. `KILLS_DIVINO` = kills con skill de elemento `LIGHT` (Druida ya tiene skills con `element_id = EARTH`, así que `KILLS_NATURALEZA` = `KILLS_EARTH`). No se incrementan como códigos separados — al chequear el requisito, se resuelven contra el contador real:

```js
const COUNTER_ALIASES = {
  KILLS_DIVINO: 'KILLS_LIGHT',
  KILLS_NATURALEZA: 'KILLS_EARTH',
};
```

### 2.4 `ELEMENTOS_DOMINADOS` — no es un contador propio, se calcula

Un elemento está "dominado" cuando su contador `KILLS_<ELEMENTO>` llega a 50. `ELEMENTOS_DOMINADOS >= N` se evalúa contando cuántos de los `KILLS_FIRE/ICE/LIGHTNING/WATER/EARTH/WIND/LIGHT/DARK` (8 elementos "clásicos", **confirmado que `COSMIC` NO cuenta** para el "dominar los 8 elementos" de Maestro Elemental — es un 9no elemento aparte) llegaron a >=50.

```js
const MASTERY_ELEMENTS = ['FIRE', 'ICE', 'LIGHTNING', 'WATER', 'EARTH', 'WIND', 'LIGHT', 'DARK'];
const MASTERY_THRESHOLD = 50;

async function countMasteredElements(playerId) {
  let count = 0;
  for (const el of MASTERY_ELEMENTS) {
    const v = await getCounter(playerId, `KILLS_${el}`);
    if (v >= MASTERY_THRESHOLD) count++;
  }
  return count;
}
```

Usado en: Mago→Elemental (>=4), Elemental→Maestro Elemental (>=8), Envenenador→Pícaro Elemental (>=2, Pícaro puede aprender cualquiera 2 skills elementales — mismo criterio de 50 kills c/u, confirmado).

### 2.5 Reescribir `checkRequirement` (`lib/evolution.js`)

```js
case 'COUNTER': {
  if (req.counter_code === 'ELEMENTOS_DOMINADOS') {
    const mastered = await countMasteredElements(playerId);
    return { met: compareValues(mastered, req.comparison, Number(req.target_value)), available: true };
  }
  const code = COUNTER_ALIASES[req.counter_code] || req.counter_code;
  const value = await getCounter(playerId, code);
  return { met: compareValues(value, req.comparison, Number(req.target_value)), available: true };
}
```

(Reemplaza el `case 'COUNTER': default: return { met: false, available: false }` actual.)

---

## 3. Dónde enganchar cada contador

### 3.1 Ya resuelto en `combat.js` en el punto exacto de la resolución de golpe/kill — solo agregar `incrementCounter(...)` ahí

| Contador | Se incrementa cuando... |
|---|---|
| `CRITICOS_REALIZADOS` | `result.crit === true` en cualquier golpe del jugador |
| `CRITICOS_ARCO` | `result.crit` + el jugador tiene equipado un item con `equipment_type` de arco |
| `KILLS_FIRE/ICE/LIGHTNING/WATER/EARTH/WIND/LIGHT/DARK/COSMIC` | el golpe de gracia (`target.hp <= 0`) fue con una skill cuyo `element_id` corresponde |
| `KILLS_ELEMENTAL` | igual que arriba, cualquier elemento (contador genérico, suma en paralelo al específico) |
| `KILLS_DRAGON` | kill a `monster.category = 'DRACOIDE'` |
| `ANIMALES_CAZADOS`, `ANIMALES_SALVAJES_MUERTOS` | kill a `monster.category = 'BESTIA'` |
| `ENEMIGOS_OSCUROS_MUERTOS` | kill a `monster.category IN ('DEMONIO','ESPECTRO','MUERTO_VIVIENTE')` o elemento `DARK` |
| `BOSSES_COSMICOS_MUERTOS` | `DEFEAT_BOSS` + elemento `COSMIC` |
| `JEFES_FINALES_MUERTOS` | `is_boss_quest` o `is_boss_floor` cumplido |
| `KILLS_EN_RUINAS` | kill en zona "Ruinas"/"Catacumbas" (mismo filtro por `zone_id` que ya usa `KILL_ANY_IN_ZONE`) |
| `GOLPES_LETALES`, `KILLS_EXPLOSIVO`, `KILLS_CORTE`, `KILLS_GOLPE_PUNO` | kill usando el `skill_id` exacto (mismo criterio que `required_skill_id` de quests) |
| `CUROS_REALIZADOS` | se resuelve una skill `skill_type='CURACION'` |
| `CUROS_Y_ATAQUES` | **confirmado**: NO hace falta que ataque y cura sean la misma acción. Se llevan 2 sub-contadores internos (`_CURA_ATAQUE_ATAQUES`, `_CURA_ATAQUE_CURAS`), +1 cada vez que el jugador resuelve una skill `ATAQUE` o `CURACION` respectivamente (Sacerdote → Templario). El valor de `CUROS_Y_ATAQUES` en sí es `min(_CURA_ATAQUE_ATAQUES, _CURA_ATAQUE_CURAS)` — es decir, cada *par* (1 ataque + 1 cura, no importa el orden ni si van seguidos) cuenta como 1 hacia el objetivo de 100 |
| `ATAQUES_ESQUIVADOS` | `result.evaded === true` |
| `ALIADOS_PROTEGIDOS` | se resuelve un `BUFF` con target `ALLY`/`ALL_ALLIES` |
| `ALIADOS_SALVADOS` | se resuelve un efecto `REVIVE` |
| `BENDICIONES_DADAS` | se resuelve la skill de código `SACERDOTE_BENDICION` |
| `EXORCISMOS_EXITOSOS` | se resuelve la skill de código `EXORCISTA_APOYO` (o la que corresponda) |
| `INVOCACIONES_REALIZADAS` | se crea un summon (`createSummonParticipant`) |
| `KILLS_EN_INVISIBILIDAD` | kill mientras el atacante tiene el status de invisibilidad activo |
| `SEGUNDOS_OCULTO` | turnos con invisibilidad activa (aunque el nombre diga "segundos", se mide en turnos — ver sección 5) |

### 3.2 Fuera de combat.js

| Contador | Dónde |
|---|---|
| `POCIONES_CRAFTEADAS` | `routes/crafting.js`, al craftear una receta cuyo `result_item_id` sea una poción |
| `MAZMORRAS_EXPLORADAS` | al completar/extraer un run de Torre Infinita (`routes/tower.js`, equivalente funcional a mazmorra) |
| `MISIONES_COMBATE_COMPLETADAS` | al completar una quest (`routes/players.js`, endpoint complete quest) que tenga al menos un objetivo `KILL_MONSTER`/`KILL_ANY_IN_ZONE`/`DEFEAT_BOSS` |
| `TESOROS_UNICOS_ENCONTRADOS` | en `lib/inventory.js::addItem` — si el item agregado tiene `rarity = 'UNICO'`, incrementar 1 (ver sección 4) |
| `DIAS_VIVIDOS` → **redefinido**, ver sección 3.3 |
| `DIAS_MEDITANDO` → **renombrado**, ver sección 3.4 |
| `ITEMS_ROBADOS`, `ENVENENAMIENTOS`, `VENENOS_DOMINADOS`, `TRAMPAS_DESPLEGADAS`, `TRAMPAS_DETECTADAS`, `PREDICCIONES_USADAS` | dependen de skills nuevas, ver sección 5 |

### 3.3 `DIAS_VIVIDOS` (Nigromante → Lich): redefinido a "combates al límite sobrevividos"

Confirmado: **no** son días de juego. Es "sobrevivir a 100 combates estando en ≤10% HP en algún momento". Confirmado también: si pierde el combate estando así, **no cuenta** — solo cuenta si ese combate lo termina ganando.

Implementación: agregar `had_near_death BOOLEAN NOT NULL DEFAULT FALSE` a `combat_sessions` (o trackearlo en memoria durante la resolución si el combate se resuelve todo en un solo request). Cada vez que el HP de un participante `PLAYER` baja a `<= 0.10 * max_hp`, marcar `had_near_death = true` en su sesión. Al resolver la victoria del combate, si `had_near_death`, `incrementCounter(playerId, 'DIAS_VIVIDOS')`.

**Recomiendo renombrar** el `counter_code` en la base a algo como `COMBATES_LIMITE_SOBREVIVIDOS` para que el nombre no mienta (requiere un `UPDATE class_evolution_requirements SET counter_code = ... WHERE counter_code = 'DIAS_VIVIDOS'` y ajustar la `description`).

### 3.4 `DIAS_MEDITANDO` (Sanador Legendario → Asceta): renombrado a "usos de Meditación"

Confirmado: son 150 usos en combate de la skill "Meditación", no días. **Recomiendo renombrar** el `counter_code` a `MEDITACIONES_USADAS` (mismo tipo de UPDATE que el punto anterior).

La skill en sí (crea un santuario que cura a todo el equipo por 4 rondas) escala su curación según el propio contador acumulado del jugador — ver fórmula en sección 5.

---

## 4. Nueva rareza de ítem: `UNICO`

```sql
ALTER TABLE items DROP CONSTRAINT items_rarity_check; -- o el nombre real de la constraint
ALTER TABLE items ADD CONSTRAINT items_rarity_check
  CHECK (rarity IN ('COMUN', 'POCO_COMUN', 'RARO', 'EPICO', 'LEGENDARIO', 'UNICO'));
```

(Aplica solo a `items.rarity`; `crafting_recipes.rarity` y `pets.rarity` son constraints separadas, no hace falta tocarlas.)

El dueño del proyecto va a crear el/los ítem(s) de rareza `UNICO` (drop raro, puede ser universal o por zona — a definir cuando los cargue). En `lib/inventory.js::addItem`, después de agregar el item, chequear su rareza:

```js
const itemRes = await queryable.query('SELECT rarity FROM items WHERE id = $1', [itemId]);
if (itemRes.rows[0]?.rarity === 'UNICO') {
  await incrementCounter(playerId, 'TESOROS_UNICOS_ENCONTRADOS', quantity);
}
```

Esto cuenta cada pickup de un ítem `UNICO` (no hace falta que sean 50 ítems distintos, cualquier combinación de hallazgos de rareza única suma).

---

## 5. Skills nuevas a agregar (contenido + mecánica)

### 5.1 Venenos (Envenenador → Maestro Envenenador, requiere 5 dominados)

Agregar 5 skills `ESTADO_ALTERADO` con DOT creciente (nombres/números sugeridos, ajustables):

| Skill | DOT %HP/turno | Duración |
|---|---|---|
| Veneno Leve | 6% | 3 turnos |
| Veneno Moderado | 9% | 3 turnos |
| Veneno Fuerte | 12% | 3 turnos |
| Veneno Mortal | 16% | 3 turnos |
| Veneno Letal | 20% | 3 turnos |

`VENENOS_DOMINADOS` se incrementa la **primera vez** que cada código de veneno distinto impacta con éxito (no por cada aplicación repetida) — o sea, es un conteo de "cuántos códigos distintos de veneno aplicó al menos una vez", tope 5. Puede necesitar una tabla chica aparte (`player_counter_details` o similar con el code del veneno ya visto) en vez de un simple INT, para no contar de más si aplica el mismo veneno 10 veces.

### 5.2 Robar (Pícaro → Ladrón Maestro / Ladrón Legendario)

Nueva skill "Robar" (target `ENEMY`). Chance de éxito = base% + `luck * multiplicador` (mismo patrón que ya usa crit: `+ luck * 0.5`). Si tiene éxito: elegir un ítem random de `monster_drops` de ese monstruo (independiente de si el monstruo muere o no), agregarlo directo al inventario del jugador vía `inventory.addItem`, e `incrementCounter(playerId, 'ITEMS_ROBADOS')`.

### 5.3 Trampas (Pícaro → Especialista en Trampas → Buscador de Trampas)

**No es un summon** — es un estado de "cargando" sobre el propio atacante. Agregar a `combat_participants`:
```sql
ALTER TABLE combat_participants
  ADD COLUMN is_preparing_trap BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN trap_rounds_remaining INT NOT NULL DEFAULT 0;
```

Flujo confirmado:
- Turno 1 (usa la skill "Trampa"): `is_preparing_trap = true`, `trap_rounds_remaining = 1`. No hace nada más este turno (mensaje: "preparando trampa").
- Turno 2 (el mismo héroe, bloqueado de elegir otra acción — se resuelve automático): aplica el efecto (sangrado 5%HP máx/turno x5 turnos a un objetivo random del bando contrario a quien puso la trampa — si la puso un jugador, pega a un enemigo random; si la puso un enemigo, pega a un aliado random), muestra "trampa activada", limpia el estado (`is_preparing_trap=false`).
- `incrementCounter(playerId, 'TRAMPAS_DESPLEGADAS')` al momento de activarse (turno 2), no al prepararla.

Costo total confirmado: la trampa le "cuesta" al que la usa 2 turnos completos bloqueado (turno 1 plantar, turno 2 activar) — recién en el turno 3 vuelve a poder elegir una acción normalmente. Los enemigos también pueden tener esta skill (mismo mecanismo, del lado `ENEMY`).

**Desactivar Trampas** (nueva skill, Buscador de Trampas): se usa contra un enemigo que tiene `is_preparing_trap = true` (está a mitad de activación). Si tiene éxito: cancela `is_preparing_trap`/`trap_rounds_remaining` de ese enemigo (la trampa nunca se activa), e `incrementCounter(playerId, 'TRAMPAS_DETECTADAS')`.

### 5.4 Predicción / Visión futura (Sanador Divino → Vidente)

**Confirmado y ajustado**: skill `BUFF`, target `SELF` (o `ALLY`), duración **1 solo turno**, efecto **+100% evasión** ese turno (esquiva garantizada). Para que no esté roto: **cooldown de 2 rondas** entre usos (no se puede volver a lanzar hasta que pasen 2 rondas desde el último uso — necesita trackear `last_used_round` por participante, mismo patrón que ya deberían tener otras skills con cooldown si existen, o agregar el campo si no). Reutiliza el sistema de `STAT_MOD`/buffs temporales existente (ej. "Escudo Leal"). `incrementCounter(playerId, 'PREDICCIONES_USADAS')` cada vez que se lanza (con éxito, respetando el cooldown).

### 5.5 Meditación (Sanador Legendario → Asceta)

Skill `BUFF`, target `ALL_ALIADOS`: crea un HoT de equipo por 4 rondas. La curación %HP/ronda escala según `MEDITACIONES_USADAS` acumulado del jugador (se lee en el momento de lanzar la skill):

```js
function meditationHealPercent(usesSoFar) {
  if (usesSoFar >= 150) return 10;
  if (usesSoFar >= 100) return 7.5;
  if (usesSoFar >= 50) return 5;
  return 2.5;
}
```
(Umbrales sugeridos — el dueño del proyecto puede ajustar los cortes de 50/100/150.) La descripción de la skill que ve el jugador debería reflejar el % actual según su propio contador.

---

## 6. Requisito de evolución a ajustar en `class_evolution_requirements`

- Pícaro Elemental (`class_id=24 → evolves_to_class_id=86`): el dato ya cargado (`ELEMENTOS_DOMINADOS >= 2`) queda **tal cual está**, confirmado — no hace falta tocar esa fila.
- Renombrar `counter_code`: `DIAS_VIVIDOS` → `COMBATES_LIMITE_SOBREVIVIDOS` (fila `class_id=12 → 55`), `DIAS_MEDITANDO` → `MEDITACIONES_USADAS` (fila `class_id=89 → 95`). Actualizar también la `description` de ambas filas para que coincida con la mecánica real (no "días").
- Mercenario (`class_id=25 → evolves_to_class_id=82`, `MISIONES_COMBATE_COMPLETADAS`): se deja tal cual (opción elegida: no tocar el árbol), pero conviene sumarle una línea de lore en `class_evolutions.description` que conecte "Especialista en Trampas" con "Mercenario" (algo como: *"tras dominar el control del campo de batalla, decide vender sus habilidades al mejor postor"*) para que no quede un salto temático raro sin explicación en el texto que ve el jugador.

---

## Checklist para quien implemente

1. Fix de 6 queries (`COALESCE`) — sección 1.
2. Tabla `player_counters` + `lib/counters.js` — sección 2.
3. Reescribir `checkRequirement` (case `COUNTER`, con alias y `ELEMENTOS_DOMINADOS` calculado) — sección 2.5.
4. Enganchar los ~30 contadores que ya tienen mecánica en `combat.js`/`crafting.js`/`tower.js`/`players.js` — sección 3.
5. `had_near_death` en `combat_sessions` + lógica de Lich — sección 3.3.
6. Rareza `UNICO` en `items` + hook en `inventory.addItem` — sección 4.
7. Crear las skills nuevas de la sección 5 (venenos x5, robar, trampa, desactivar trampas, predicción, meditación) con su mecánica.
8. Cambios de `combat_participants` para el estado de trampa (`is_preparing_trap`, `trap_rounds_remaining`) y el motor de combate para bloquear/resolver esas 2 rondas.
9. Renombrar los 2 `counter_code` de la sección 6 en `class_evolution_requirements` (y su `description`).
10. Cargar en `items` el/los ítem(s) `UNICO` que va a definir el dueño del proyecto.

---

## 7. Addendum: exponer progreso numérico (X/Y) para el front

El front quiere mostrar, por cada requisito de tipo `COUNTER` (y de paso `ITEM`), el progreso real como "X/Y" (ej. "37/100 kills con Fuego") en vez de solo un check/cruz, y para los contadores de kills por elemento, mostrarlo con el color de ese elemento. Hoy `checkRequirement` solo devuelve `{met, available}` — faltan los números.

**Cambio en `lib/evolution.js` → `checkRequirement`**: agregar `current` y `target` (y `elementCode` cuando aplique) a cada `return`. Son valores que la función YA calcula internamente en cada `case`, solo hace falta incluirlos en el objeto de retorno:

```js
case 'ITEM': {
  const owned = await db.query(/* ... */);
  const qty = Number(owned.rows[0].qty);
  const target = req.target_value == null ? 1 : Number(req.target_value);
  return { met: compareValues(qty, req.comparison, target), available: true, current: qty, target };
}

case 'COUNTER': {
  if (req.counter_code === 'ELEMENTOS_DOMINADOS') {
    const mastered = await countMasteredElements(playerId);
    const target = Number(req.target_value);
    return { met: compareValues(mastered, req.comparison, target), available: true, current: mastered, target };
  }
  if (req.counter_code === 'CUROS_Y_ATAQUES') {
    const ataques = await getCounter(playerId, '_CURA_ATAQUE_ATAQUES');
    const curas = await getCounter(playerId, '_CURA_ATAQUE_CURAS');
    const value = Math.min(ataques, curas);
    const target = Number(req.target_value);
    return { met: compareValues(value, req.comparison, target), available: true, current: value, target };
  }
  const code = COUNTER_ALIASES[req.counter_code] || req.counter_code;
  const value = await getCounter(playerId, code);
  const target = Number(req.target_value);
  const elementMatch = /^KILLS_(FIRE|ICE|LIGHTNING|WATER|EARTH|WIND|LIGHT|DARK|COSMIC)$/.exec(code);
  return {
    met: compareValues(value, req.comparison, target),
    available: true,
    current: value,
    target,
    elementCode: elementMatch ? elementMatch[1] : null,
  };
}
```

**Cambio en `getAvailableEvolutions`**: al armar cada `requirements.push(...)`, spreadear los campos nuevos:

```js
requirements.push({
  type: req.requirement_type,
  description: req.description,
  met: checked.met,
  available: checked.available,
  current: checked.current ?? null,
  target: checked.target ?? null,
  elementCode: checked.elementCode ?? null,
});
```

`STAT_THRESHOLD`/`EQUIPMENT`/`NO_WEAPON` pueden quedar con `current`/`target` en `null` (son de tipo "sí/no", no tiene sentido una barra de progreso ahí) — el front ya sabe mostrar solo el check en esos casos.

---

## 8. Fase 2: las 6 skills con mecánica de combate inédita

Fase 1 (contadores + fix + rareza `UNICO`) ya está implementada y commiteada (`7a3bf1b`, `e55a0bc`). Esto cubre lo que quedó pendiente: `ITEMS_ROBADOS`, `TRAMPAS_DESPLEGADAS`, `TRAMPAS_DETECTADAS`, `PREDICCIONES_USADAS`, `VENENOS_DOMINADOS` y `MEDITACIONES_USADAS` (ex `DIAS_MEDITANDO`).

### 8.1 Venenos (Envenenador → Maestro Envenenador, `VENENOS_DOMINADOS >= 5`)

**Buena noticia revisando el seed actual: ya existen 2 de los 5 venenos necesarios**, no hace falta inventar 5 de cero:
- `PICARO_ENVENENAMIENTO` ("Envenenamiento", Pícaro nivel 1, DOT 10%/turno x3) — el Envenenador lo hereda de Pícaro.
- `ENVENENADOR_DOT` ("Veneno Letal", Envenenador nivel 22, DOT 10%/turno x3).

Faltan **3 más**, para completar 5 códigos distintos. Propuesta (nombres/números ajustables):

| Skill (code sugerido) | Nombre | Clase / nivel | Efecto |
|---|---|---|---|
| `ENVENENADOR_DOT_DEBILITANTE` | Veneno Debilitante | Envenenador, nivel 26 | DOT 13%/turno x3 + `STAT_MOD` DEF -10% x3 turnos |
| `ENVENENADOR_DOT_CORROSIVO` | Veneno Corrosivo | Envenenador, nivel 30 | DOT 16%/turno x3 |
| `MAESTRO_ENVENENADOR_DOT_VACIO` | Veneno del Vacío | Maestro Envenenador (post-evolución), nivel 1 de la clase nueva | DOT 20%/turno x4 |

**Contador**: `VENENOS_DOMINADOS` no es un simple INT — necesita saber CUÁNTOS CÓDIGOS DISTINTOS de veneno impactaron con éxito al menos una vez (no cuántas veces en total). Tabla nueva:

```sql
CREATE TABLE IF NOT EXISTS player_counter_seen_codes (
  player_id    INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  counter_code TEXT NOT NULL,
  sub_code     TEXT NOT NULL,
  PRIMARY KEY (player_id, counter_code, sub_code)
);
```

Al aplicar con éxito cualquiera de los 5 venenos: `INSERT INTO player_counter_seen_codes(player_id, 'VENENOS_DOMINADOS', skillCode) ON CONFLICT DO NOTHING`. En `checkRequirement`, agregar un case especial (mismo estilo que `ELEMENTOS_DOMINADOS`):

```js
if (req.counter_code === 'VENENOS_DOMINADOS') {
  const res = await db.query(
    `SELECT COUNT(*)::int AS n FROM player_counter_seen_codes WHERE player_id=$1 AND counter_code='VENENOS_DOMINADOS'`,
    [playerId]
  );
  const current = res.rows[0].n;
  const target = Number(req.target_value);
  return { met: compareValues(current, req.comparison, target), available: true, current, target };
}
```

### 8.2 Robar (Pícaro → Ladrón Maestro → Ladrón Legendario, `ITEMS_ROBADOS`)

Nueva skill "Robar" (`PICARO_ROBAR`, `ESPECIAL`, target `ENEMY`, sin daño, nivel sugerido 8, mana ~20).

Lógica al resolverse en combate:
1. Chance de éxito = `30 + luck * 0.5` (mismo multiplicador que ya usa el juego para crit_chance).
2. Si tiene éxito: `SELECT item_id, min_quantity, max_quantity FROM monster_drops WHERE monster_id = $1` — elegir una fila al azar (uniforme está bien), cantidad random entre `min_quantity` y `max_quantity`, `inventory.addItem(playerId, itemId, qty)`, `incrementCounter(playerId, 'ITEMS_ROBADOS', 1)`.
3. Si el monstruo no tiene ninguna fila en `monster_drops`: el robo falla igual (mensaje "no tenía nada que robar"), no cuenta para el contador.
4. Si falla la chance: no pasa nada, no cuenta.

### 8.3 Trampas (Pícaro → Especialista en Trampas, `TRAMPAS_DESPLEGADAS`) — la pieza de motor más grande

**No es un summon**, es un estado de "cargando" sobre el propio atacante (jugador o enemigo). Confirmado el costo total: 2 turnos completos bloqueado (turno 1 plantar, turno 2 activar), recién en el turno 3 vuelve a poder actuar normalmente.

```sql
ALTER TABLE combat_participants
  ADD COLUMN is_preparing_trap BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN trap_rounds_remaining INT NOT NULL DEFAULT 0;
```

Nueva skill "Trampa" (`ESPECIALISTA_TRAMPAS_TRAMPA`, `ESPECIAL`, target `SELF` — el objetivo real se decide recién al activarse, no al plantarla).

Flujo en el motor de combate (en el punto donde ya se resuelve la acción elegida por cada participante, por turno):
1. **Turno en que usa "Trampa"**: `is_preparing_trap = true`, `trap_rounds_remaining = 1`, `has_acted_this_round = true`. Log: *"X está preparando una trampa..."*. No se le pide ninguna otra acción este turno.
2. **Turno siguiente de ese mismo participante**: ANTES de pedirle/procesar una acción elegida, chequear `is_preparing_trap`. Si es true: resolver automático (no se le pregunta qué hacer) — elegir un objetivo random del bando CONTRARIO a quien puso la trampa (si la puso un `PLAYER`, un `ENEMY` random; si la puso un `ENEMY`, un `PLAYER`/aliado random), aplicar sangrado (`DOT` 5% HP máx/turno x5 turnos), log *"¡La trampa de X se activó!"*, limpiar `is_preparing_trap=false`, `trap_rounds_remaining=0`, `has_acted_this_round=true` (tampoco elige acción este turno). `incrementCounter(playerId, 'TRAMPAS_DESPLEGADAS', 1)` en este paso (no al plantarla).
3. **Turno 3 en adelante**: vuelve a la normalidad, elige acciones como cualquier otro turno.

Los monstruos (`ENEMY`) también pueden usar esta skill con el mismo mecanismo — a definir en qué `monster_code` se la dan (queda a criterio del dueño del proyecto).

### 8.4 Desactivar Trampas (Especialista en Trampas → Buscador de Trampas, `TRAMPAS_DETECTADAS`)

Nueva skill "Desactivar Trampas" (`ESPECIALISTA_TRAMPAS_DESACTIVAR`, `ESPECIAL`, target `ENEMY`). Solo se puede usar (o solo tiene efecto) contra un objetivo con `is_preparing_trap = true` — es decir, ya plantó la trampa (turno 1 hecho) pero todavía no la activó (turno 2 no resuelto). Si el objetivo no está en ese estado, la skill no tiene efecto (mensaje: "no hay ninguna trampa que desactivar").

Si tiene éxito: `is_preparing_trap = false`, `trap_rounds_remaining = 0` en el objetivo (la trampa nunca se activa, y ese participante pierde el turno que iba a "recuperar" gratis). `incrementCounter(playerId, 'TRAMPAS_DETECTADAS', 1)`.

### 8.5 Predicción / Visión Futura (Sanador Divino → Vidente, `PREDICCIONES_USADAS`) — necesita cooldown, feature de motor nueva

Hoy **no existe ningún sistema de cooldown** en el juego (busqué explícitamente, no hay nada parecido en `combat.js`). En vez de un campo dedicado solo a esta skill, mejor hacerlo **genérico** desde ya, para que cualquier skill futura con cooldown reutilice el mismo mecanismo sin tocar schema de nuevo:

```sql
ALTER TABLE skills ADD COLUMN cooldown_rounds INT; -- NULL = sin cooldown, es la mayoria de las skills
ALTER TABLE combat_participants
  ADD COLUMN cd_skill_id INT REFERENCES skills(id),
  ADD COLUMN cd_round INT;
```

Validación genérica al intentar usar CUALQUIER skill (no solo Predicción): si `skill.cooldown_rounds IS NOT NULL` y `participant.cd_skill_id = skill.id` y `current_round - participant.cd_round < skill.cooldown_rounds` → todavía no disponible. Si se puede usar: `cd_skill_id = skill.id`, `cd_round = current_round`.

Nueva skill "Predicción" (`SANADOR_DIVINO_PREDICCION`, `BUFF`, target `SELF`, duración 1 turno, `cooldown_rounds = 2`). `skill_effects`: `STAT_MOD`, `stat_code='EVASION'`, `percent_amount=100`, `duration_turns=1` (esquiva garantizada ese turno — el mismo sistema de `STAT_MOD` que ya existe, nada nuevo ahí). Al usarla con éxito, además de actualizar `cd_skill_id`/`cd_round`: `incrementCounter(playerId, 'PREDICCIONES_USADAS', 1)`.

**Limitación conocida y aceptada por ahora**: como `cd_skill_id`/`cd_round` es un solo par por participante (no una tabla de cooldowns por skill), si un mismo personaje llegara a tener DOS skills con cooldown activas a la vez, usar la segunda pisaría el cooldown registrado de la primera. Hoy no pasa (Predicción es la única skill con cooldown en todo el juego), así que no hace falta resolverlo todavía — si en el futuro se necesitan cooldowns simultáneos independientes, ahí sí conviene pasar a una tabla `combat_participant_cooldowns (participant_id, skill_id, cd_round)`.

### 8.6 Meditación (Sanador Legendario → Asceta, `MEDITACIONES_USADAS`)

Nueva skill "Meditación" (`SANADOR_LEGENDARIO_MEDITACION`, `BUFF`, target `ALL_ALLIES`, duración 4 turnos). A diferencia de un HoT normal, el `percent_amount` **no es fijo en `skill_effects`** — se calcula en el momento de resolver la skill en combate, leyendo el contador ANTES de incrementarlo:

```js
function meditationHealPercent(usesSoFar) {
  if (usesSoFar >= 150) return 10;
  if (usesSoFar >= 100) return 7.5;
  if (usesSoFar >= 50) return 5;
  return 2.5;
}
```

Aplicar un `HOT` de 4 turnos con ese % (mismo mecanismo que ya usan Druida/Sacerdote), luego `incrementCounter(playerId, 'MEDITACIONES_USADAS', 1)`. La descripción que ve el jugador en el front debería reflejar el % actual según su propio contador (ej. "Cura 5% HP/turno — sigue mejorando con el uso").

---

## Checklist fase 2

1. Tabla `player_counter_seen_codes` (venenos dominados) — sección 8.1.
2. Las 3 skills de veneno nuevas (más el hook de `VENENOS_DOMINADOS`) — sección 8.1.
3. Skill "Robar" + lógica de `monster_drops` — sección 8.2.
4. Columnas `is_preparing_trap`/`trap_rounds_remaining` en `combat_participants` + motor de 2 turnos — sección 8.3.
5. Skill "Desactivar Trampas" — sección 8.4.
6. Cooldown genérico (`skills.cooldown_rounds` + `cd_skill_id`/`cd_round` en `combat_participants`) + skill "Predicción" con cooldown de 2 rondas — sección 8.5.
7. Skill "Meditación" con curación escalada por contador — sección 8.6.
