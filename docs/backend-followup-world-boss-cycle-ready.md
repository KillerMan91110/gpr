# Follow-up back: World Boss — ciclo automático + ready-check de grupo

Estado actual: `world_boss_events` está vacía, nunca se corrió `scripts/spawnWorldBoss.js` — por eso no hay ningún World Boss activo ahora mismo. Esto ya no importa una vez armado lo de abajo, porque el evento va a arrancar solo.

## 1. Ciclo automático: 3hs activo → 1h de pausa → vuelve a aparecer, para siempre

Hoy el único lanzador es el script manual. Se pide que se repita solo, sin intervención.

**Extraer la lógica de spawn a una función reusable** (`lib/worldBossScheduler.js`), sacándola de `scripts/spawnWorldBoss.js` (el script sigue existiendo para forzar uno manual con `--force` si hace falta para pruebas, pero ahora llama a esta función en vez de tener la lógica duplicada):

```js
const WORLD_BOSS_MONSTER_CODE = 'WORLD_BOSS_DEVORADOR_ESTRELLAS';
const WORLD_BOSS_MAX_HP = 40000;
const EVENT_DURATION_HOURS = 3;
const PAUSE_HOURS = 1;

async function spawnWorldBossEvent() {
  const res = await db.query(
    `INSERT INTO world_boss_events (monster_code, max_hp, hp_remaining, ends_at)
     VALUES ($1, $2, $2, now() + interval '${EVENT_DURATION_HOURS} hours')
     RETURNING *`,
    [WORLD_BOSS_MONSTER_CODE, WORLD_BOSS_MAX_HP]
  );
  return res.rows[0];
}

// Se llama periódicamente (ver más abajo). Hace 2 cosas: cierra el evento ACTIVE si ya venció
// (mismo criterio que expireIfNeeded en routes/worldboss.js, pero acá SIN esperar a que alguien
// entre a la página — así la pausa de 1h arranca puntual), y si no queda ninguno ACTIVE y ya
// pasó la pausa desde que cerró el último (o nunca hubo uno), spawnea el siguiente.
async function tickWorldBossSchedule() {
  await db.query(
    "UPDATE world_boss_events SET status = 'EXPIRED', closed_at = now() WHERE status = 'ACTIVE' AND ends_at <= now()"
  );

  const activeRes = await db.query("SELECT 1 FROM world_boss_events WHERE status = 'ACTIVE'");
  if (activeRes.rows.length) return;

  const lastRes = await db.query('SELECT closed_at FROM world_boss_events ORDER BY id DESC LIMIT 1');
  const lastClosedAt = lastRes.rows[0]?.closed_at;
  if (lastClosedAt && Date.now() - new Date(lastClosedAt).getTime() < PAUSE_HOURS * 3600 * 1000) return;

  await spawnWorldBossEvent();
}

module.exports = { spawnWorldBossEvent, tickWorldBossSchedule };
```

**En `server.js`**, arrancarlo al bootear el proceso y repetirlo cada 1 minuto (no hace falta cron de sistema, el server ya es un proceso Node de larga duración):

```js
const { tickWorldBossSchedule } = require('./lib/worldBossScheduler');
tickWorldBossSchedule().catch(console.error);
setInterval(() => { tickWorldBossSchedule().catch(console.error); }, 60 * 1000);
```

Con esto: el primer evento arranca solo al desplegar (nunca hubo `closed_at` previo), y de ahí en más se repite 3hs activo / 1h de pausa, indefinidamente, sin que nadie tenga que correr nada a mano.

## 2. El ranking se resetea solo por evento — confirmado, no hace falta tocar nada

`world_boss_damage_log` ya está scopeado por `event_id`, y tanto `GET /worldboss/status` (el `top3`) como `GET /worldboss/leaderboard` ya filtran por el evento activo (o el último cerrado, vía `getActiveOrLastEvent`). Cuando el scheduler arriba crea un evento nuevo, automáticamente el ranking arranca vacío para ese `event_id` — es gratis, ya estaba bien diseñado.

## 3. Ready-check de grupo al entrar en combate

Se pide: si estás en grupo co-op y tocás "Entrar en combate", que les mande a los demás un aviso de "¿listo?" y recién arranque cuando confirmen — no que arrastres a tu grupo a la pelea sin avisarles. Esto ya existe para la Torre (`player_tower_ready` + 3 endpoints en `routes/tower.js`) — clonar exactamente el mismo patrón para World Boss, tabla separada (no reusar `player_tower_ready`, ya que este mecanismo es "por actividad", igual que Torre tiene la suya):

```sql
CREATE TABLE IF NOT EXISTS player_worldboss_ready (
  player_id INT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  ready_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

3 endpoints en `routes/worldboss.js` (`playerRouter`), copiando literal la lógica de `routes/tower.js` líneas 63-123 (`getMyGroupId`/`getGroupMemberIds` vía `player_coop_group_members`, mismo `READY_TTL_MS = 15000`), solo cambiando la tabla:

- `POST /api/player/:playerId/worldboss/ready` → arma/actualiza mi `ready_at`; si todos los del grupo están ready dentro del TTL, limpia las filas y devuelve `{ allReady: true, coopPartnerIds }`.
- `DELETE /api/player/:playerId/worldboss/ready` → cancela mi ready.
- `GET /api/player/:playerId/worldboss/ready-status` → `{ inParty, myReady, members: [{playerId, ready}] }`.

## 4. Front (lo hago yo una vez esté esto)

En `WorldBoss.js`, agregar el mismo bloque de ready-check que ya tiene `Tower.js` (poll a `ready-status`, botón "Listo para entrar"/"Cancelar", y solo llamar a `enterWorldBoss` con los `coopPartnerIds` que devuelve `allReady`) — actualmente `handleEnter` arranca directo con todo el grupo sin pedir confirmación, hay que reemplazarlo por el flujo de ready-check. Necesito 3 métodos nuevos en `api/client.js` (`setWorldBossReady`, `cancelWorldBossReady`, `getWorldBossReadyStatus`), mismo patrón que los de Torre.

## Checklist

1. `lib/worldBossScheduler.js` con `spawnWorldBossEvent`/`tickWorldBossSchedule` — sección 1.
2. Arrancar el scheduler en `server.js` (llamada inicial + `setInterval` de 1 min) — sección 1.
3. Actualizar `scripts/spawnWorldBoss.js` para llamar a la función extraída en vez de duplicar la lógica (opcional, prolijidad).
4. Tabla `player_worldboss_ready` + los 3 endpoints de ready-check — sección 3.
