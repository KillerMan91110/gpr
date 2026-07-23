# Spec back: World Boss — "El Devorador de Estrellas"

Todo lo diseñado acá fue charlado y cerrado en detalle con el dueño del proyecto (incluye un mockup de layout ya aprobado). Los números marcados como "default, ajustable" son mi propuesta concreta para arrancar — se pueden tunear sin tocar la arquitectura.

## Resumen del feature

Un jefe único, server-wide, con una barra de vida **compartida** entre todos los jugadores. Cada jugador (solo o con su grupo de coop de hasta 3) pelea su propia sub-sesión de combate normal contra un **clon** del boss escalado a su nivel; el daño que le hace en esa sub-sesión se resta de la vida global compartida. Morir en el intento no borra el daño ya hecho — el jugador puede reintentar (con cooldown). El daño se registra por jugador real (los NPCs de su formación suman a su cuenta, no tienen cuenta propia). El evento dura 3 horas; si nadie lo mata en ese tiempo, se cierra igual y se reparte moneda según el daño de cada uno.

**Muy importante — esto NO es una extensión del motor de innatas ni de fases**: el boss no tiene mecánica especial, solo pega fuerte a todo el equipo por turno. Es un feature bastante más chico que el proyecto de innatas.

---

## 1. Schema

```sql
-- El monstruo en sí, reutilizando el sistema de monsters + monster_level_scalings que YA
-- escala HP/ATK/DEF por nivel (el mismo que usa cualquier monstruo de zona/torre). El campo
-- hp/max_hp de ESTE monstruo en la tabla `monsters` no se usa como vida real — se pisa con el
-- HP global compartido al crear cada sub-sesión (ver sección 3).
INSERT INTO monsters (code, name, category, rarity, element_id, base_level, min_spawn_level, max_spawn_level, base_atk, base_def, base_magic_atk, base_magic_def, base_hp, xp_reward, gold_reward)
VALUES ('WORLD_BOSS_DEVORADOR_ESTRELLAS', 'El Devorador de Estrellas', 'COSMICO', 'LEGENDARY',
        (SELECT id FROM elements WHERE code = 'COSMIC'), 50, 10, 120, 900, 700, 950, 750, 40000, 8000, 6000)
ON CONFLICT (code) DO NOTHING;

-- monster_level_scalings ya existe — cargar 2-3 filas (nivel 10, 60, 120) para que la
-- interpolación existente escale ATK/DEF/HP por nivel del jugador que entra. El HP de estas
-- filas NO importa (se pisa igual), pero hay que cargarlo por la constraint de la tabla.

-- Estado del evento (uno activo por vez).
CREATE TABLE IF NOT EXISTS world_boss_events (
  id            SERIAL PRIMARY KEY,
  monster_code  TEXT NOT NULL REFERENCES monsters(code),
  max_hp        INT NOT NULL,
  hp_remaining  INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'KILLED', 'EXPIRED')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at       TIMESTAMPTZ NOT NULL,
  closed_at     TIMESTAMPTZ,
  killed_by_player_id INT REFERENCES players(id)
);

-- Daño acumulado por jugador REAL en el evento actual (NPCs propios ya están sumados acá,
-- nunca tienen fila propia).
CREATE TABLE IF NOT EXISTS world_boss_damage_log (
  event_id     INT NOT NULL REFERENCES world_boss_events(id) ON DELETE CASCADE,
  player_id    INT NOT NULL REFERENCES players(id),
  total_damage BIGINT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  PRIMARY KEY (event_id, player_id)
);

-- Moneda global.
ALTER TABLE players ADD COLUMN IF NOT EXISTS cosmic_shards INT NOT NULL DEFAULT 0;

-- Tienda (mismo patrón que tower_vendor_shop).
CREATE TABLE IF NOT EXISTS world_boss_shop (
  id      SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id),
  price   INT NOT NULL
);
```

## 2. Constantes de balance (defaults, ajustables sin tocar arquitectura)

```js
const WORLD_BOSS_MAX_HP = 40000;
const EVENT_DURATION_HOURS = 3;
const ATTEMPT_COOLDOWN_SECONDS = 60;   // ilimitados intentos, solo cooldown entre uno y otro
const MIN_LEVEL_TO_ENTER = 10;
const BOSS_HIT_PERCENT_MIN = 3;        // % del HP MÁXIMO del objetivo, por golpe del boss
const BOSS_HIT_PERCENT_MAX = 7;
const BOSS_DEF_MITIGATION_CAP = 0.45;  // la DEF del objetivo puede reducir hasta 45% ese %, nunca más
const SHARDS_PER_DAMAGE_POINT = 1 / 400; // 1 fragmento cósmico cada 400 de daño hecho (basado en daño CRUDO, no %)
const KILL_BONUS_SHARDS = 500;         // bono para quien da el golpe final
const TOP3_BONUS_SHARDS = [300, 200, 100]; // bono para el top 1/2/3 de daño total del evento
```

## 3. Entrar al World Boss — reutiliza el motor de combate existente casi sin cambios

`hydrateMonsters` (`routes/combat.js`) ya acepta `{ code, level }` y ya interpola ATK/DEF/HP con `monster_level_scalings` — es EXACTAMENTE el mecanismo que hace falta para "un clon escalado al nivel del jugador que entra", no hay que inventar nada ahí.

**Nuevo endpoint** `POST /api/player/:playerId/worldboss/enter` (reusa el mismo flujo que `POST /api/combat/sessions`, con estas diferencias):

1. Validar: `player.level >= MIN_LEVEL_TO_ENTER`, existe un `world_boss_events` con `status = 'ACTIVE'` y `now() < ends_at` (si `now() >= ends_at`, cerrarlo primero — ver sección 6 — y devolver 400 "el evento ya cerró"), y que pasó `ATTEMPT_COOLDOWN_SECONDS` desde `world_boss_damage_log.last_attempt_at` de ese jugador (si no hay fila todavía, no hay cooldown).
2. Igual que `POST /sessions`: `hydratePlayers`/`hydratePartyNpcs` (o el equivalente coop de hasta 3 jugadores reales — mismo mecanismo que ya usa la Torre vía `guest_player_id`/`guest_player_id_2` en `combat_sessions`) + `hydrateMonsters([{ code: event.monster_code, level: player.level }])`.
3. **Después** de `insertParticipants`, hacer un `UPDATE combat_participants SET hp = $1, max_hp = $1 WHERE session_id = $2 AND monster_code = $3` con `$1 = event.hp_remaining` — así el clon arranca siempre con la vida REAL que le queda al boss global en ese momento, no con el HP escalado por nivel que trae `hydrateMonsters` (ese valor se descarta).
4. Marcar de algún modo que esta sesión es "de world boss" (ej. una tabla puente `world_boss_session_links(session_id, event_id)`, o una columna `world_boss_event_id` en `combat_sessions`) para que el hook de cierre (sección 4) sepa qué hacer.

## 4. Al cerrar la sub-sesión (ganada, perdida, o abandonada) — restar del HP global y repartir

Enganchar en `finalizeSession` (donde ya se resuelve el cierre de cualquier sesión, gane o pierda el jugador): si la sesión tiene `world_boss_event_id`:

1. `damageDealt = maxHpDelClonAlEmpezar - hpFinalDelClon` (clampeado a `>= 0`, y a `<= hp_remaining actual` por las dudas de que 2 sesiones cierren casi al mismo tiempo — usar `UPDATE ... SET hp_remaining = GREATEST(0, hp_remaining - $1)` para que sea atómico).
2. Repartir `damageDealt` entre los jugadores reales de la sesión, agrupando por dueño (`actor.player_id ?? actor.owner_player_id` de cada golpe registrado en `combat_log` — mismo criterio que ya se usa para recompensas normales) — no hace falta prorratear "a ojo", el log de combate ya tiene el actor exacto de cada golpe.
3. Por cada jugador real con daño > 0 en esta sesión: `UPDATE world_boss_damage_log SET total_damage = total_damage + $1, last_attempt_at = now()` (upsert si no existe fila), y acreditar `ROUND($1 * SHARDS_PER_DAMAGE_POINT)` a `players.cosmic_shards`.
4. Si `hp_remaining` llegó a 0: marcar `world_boss_events.status = 'KILLED'`, `killed_by_player_id` = el jugador cuyo golpe lo llevó a 0, `closed_at = now()`, y otorgar `KILL_BONUS_SHARDS` a ese jugador + `TOP3_BONUS_SHARDS` a los 3 de mayor `total_damage` en `world_boss_damage_log` de ese evento (recalculando el orden en ese momento).

## 5. Daño del boss hacia el equipo — sistema paralelo a ATK/DEF, no lo reemplaza

El boss **ignora la fórmula de daño física/mágica normal** en su turno. En vez de eso, en su resolución de IA (mismo lugar de `advanceEnemyTurns` donde ya se decide la acción de cualquier monstruo), si `actor.monster_code === 'WORLD_BOSS_DEVORADOR_ESTRELLAS'`:

```js
const basePercent = BOSS_HIT_PERCENT_MIN + Math.random() * (BOSS_HIT_PERCENT_MAX - BOSS_HIT_PERCENT_MIN);
for (const target of allAlivePlayerSideParticipants) { // TODOS, jugador + sus NPCs — golpe en área
  const mitigation = Math.min(BOSS_DEF_MITIGATION_CAP, target.def / 3000); // curva simple, ajustable
  const finalPercent = basePercent * (1 - mitigation);
  const dmg = Math.max(1, Math.round(target.max_hp * finalPercent / 100));
  target.hp = Math.max(0, target.hp - dmg);
  await persistParticipant(target);
}
```

(La curva `def / 3000` es un placeholder razonable dado que niveles altos rondan ~600-1200 DEF con equipo — da mitigaciones de ~20-40% en ese rango, tocando el tope 45% recién con builds muy defensivas. Ajustable con la primera prueba real.) Esto se loguea igual que cualquier golpe en área (`insertLog` con descripción tipo "¡El Devorador de Estrellas golpea a todo el equipo!"), y es el punto donde el front dispara el shake (ver sección 8).

### 5.1 El boss debe ser inmune a daño de % de HP máximo (venenos y el sangrado de Trampa)

**Confirmado con el dueño del proyecto**: el veneno (y el sangrado de la Trampa del Especialista en Trampas) calculan su daño como `% del HP MÁXIMO del objetivo` (`dotDmg = round(max_hp * applied_flat / 100)`, ver fase 2 de evoluciones). Contra un objetivo de 40 000 HP, ese mismo % se traduce en una cifra absoluta muchísimo mayor que cualquier golpe por fórmula ATK/DEF — el Envenenador (y cualquiera con acceso a Trampa) pasaría a ser objetivamente la mejor opción posible contra el World Boss, rompiendo el balance entre builds.

**Fix**: el World Boss debe ser inmune a CUALQUIER intento de aplicarle un efecto `DOT` (venenos, sangrado de trampa). En el punto donde ya se resuelve `effect_type === 'DOT'` contra un objetivo (mismo bloque de `routes/combat.js` que inserta la fila en `combat_participant_buffs`), agregar al principio:

```js
if (target.monster_code === 'WORLD_BOSS_DEVORADOR_ESTRELLAS') {
  // Inmune a daño por % de HP máximo — mismo criterio en toda skill/innata que use DOT.
  // Log opcional: `${target.name} es inmune a los efectos de veneno/sangrado.`
} else {
  // ... lógica actual de aplicar el DOT ...
}
```

Recomiendo hacerlo genérico desde ya (un campo `immune_to_percent_dot BOOLEAN` en `monsters`, no un `if` hardcodeado al `monster_code`) para no tener que tocar este código de nuevo si en el futuro agregan un segundo World Boss u otro jefe de este calibre:

```sql
ALTER TABLE monsters ADD COLUMN IF NOT EXISTS immune_to_percent_dot BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE monsters SET immune_to_percent_dot = TRUE WHERE code = 'WORLD_BOSS_DEVORADOR_ESTRELLAS';
```

Y el chequeo en combat.js queda `if (target.immune_to_percent_dot) { ... } else { ... }`. Todo lo demás (golpes normales, skills de daño directo, debuffs de stats sin componente de %HP como -10% DEF, críticos, etc.) sigue funcionando normal contra el boss — la inmunidad es específica a "daño por % de HP máximo por turno", no a venenos como concepto completo (el debuff de DEF que acompaña a Veneno Debilitante, por ejemplo, sí debería seguir aplicando).

## 6. Cierre por tiempo (si nadie lo mata en 3hs)

Chequeo perezoso (mismo estilo que ya usa el resto del combate: se resuelve la primera vez que algo toca el evento después de vencido, no hace falta un cron dedicado): en el endpoint de estado del evento (sección 7) y en `POST /worldboss/enter`, si `status = 'ACTIVE'` y `now() >= ends_at`: `UPDATE world_boss_events SET status = 'EXPIRED', closed_at = now()`. La moneda ya se fue acreditando sesión por sesión durante las 3hs (sección 4, paso 3) — no hace falta un reparto especial al expirar, solo cerrar el estado. No hay bono de golpe final si expira (nadie lo mató), pero el top 3 de daño **si** puede tener su bono igual — a definir si querés que el top 3 aplique también cuando expira sin morir, o solo cuando lo matan. *(Punto que dejé abierto: asumí que el top 3 aplica siempre, se mate o no el boss, porque "quien hizo más daño" no depende de si terminó en kill. Avisame si no es así.)*

## 7. Endpoints nuevos

| Método | Path | Qué hace |
|---|---|---|
| `GET /api/worldboss/status` | Público o autenticado — estado del evento activo (o el último cerrado): `hpRemaining`, `maxHp`, `endsAt`, `status`, top 3 del `world_boss_damage_log` | 
| `POST /api/player/:playerId/worldboss/enter` | Sección 3 — arranca la sub-sesión (devuelve el mismo shape que `POST /api/combat/sessions`, el front lo trata como un combate normal) |
| `GET /api/worldboss/leaderboard` | Todo el `world_boss_damage_log` del evento activo/último, ordenado por `total_damage` |
| `GET /api/player/:playerId/worldboss/shop` | Catálogo de `world_boss_shop` + `cosmic_shards` del jugador |
| `POST /api/player/:playerId/worldboss/shop/buy` | Comprar, mismo patrón que `tower_vendor_shop` |

## 8. Cómo se spawnea el evento

Dado que es un juego operado por vos (sin panel de admin), para esta primera versión alcanza con un **script chico** (`node scripts/spawnWorldBoss.js` o un endpoint protegido que solo vos llamás) que hace `INSERT INTO world_boss_events (monster_code, max_hp, hp_remaining, ends_at) VALUES (..., WORLD_BOSS_MAX_HP, WORLD_BOSS_MAX_HP, now() + interval '3 hours')` — vos decidís cuándo lanzarlo mientras probamos el ritmo. Si más adelante lo querés automático (ej. cada 5 días), es un cron de una línea que llama a lo mismo — no hace falta resolverlo ahora.

## 9. Front (lo hago yo)

Ya está aprobado el layout (mockup: banner de HP global + timer + top 3, formación vs. boss, shake al golpe en área, panel de stats personales). Voy a necesitar:
- Pantalla nueva "World Boss" con el layout del mockup, consumiendo los endpoints de la sección 7.
- El combate en sí reusa el componente de combate existente (mismo mecanismo de turnos/log/acciones) — solo le agrego el banner de arriba y el shake cuando el log indica un golpe en área del boss.
- Entrada a la tienda del World Boss (catálogo + comprar), mismo componente que ya existe para la tienda de la Torre, adaptado.

## Checklist

1. Tablas `world_boss_events`, `world_boss_damage_log`, `world_boss_shop` + columna `cosmic_shards` — sección 1.
2. Cargar el monstruo `WORLD_BOSS_DEVORADOR_ESTRELLAS` + sus `monster_level_scalings` — sección 1.
3. Endpoint `POST /worldboss/enter` reusando `hydrateMonsters`/`hydratePlayers`/coop existente, pisando el HP del clon con el HP global — sección 3.
4. Hook en `finalizeSession` para restar del HP global, repartir daño/moneda, y detectar el kill — sección 4.
5. Rama especial en la IA del boss para el golpe en área por % de HP máximo con mitigación por DEF — sección 5.
6. Columna `monsters.immune_to_percent_dot` + chequeo antes de aplicar cualquier DOT — sección 5.1.
7. Chequeo perezoso de expiración por tiempo — sección 6.
8. Los 4 endpoints de la sección 7.
9. Script simple para spawnear el evento manualmente — sección 8.
10. Cargar en `world_boss_shop` los ítems `UNICO` que se van a vender ahí.
