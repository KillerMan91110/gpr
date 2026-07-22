# Spec back: framework genérico de innatas de clase evolucionada

Contexto: se diseñaron 94 innatas (una por clase evolucionada), ver el artifact "Innatas de clases evolucionadas — propuesta". Cada clase evolucionada hoy solo tiene un pasivo `"Don de X"` (bono plano de stats, ya implementado como `skill_type='PASIVA'` + `STAT_MOD`). Las innatas son otra cosa: un gancho mecánico temático — la mayoría reacciona a un EVENTO de combate (crítico, kill, curar, esquivar, empezar combate, ganar) en vez de ser solo un número fijo.

Esta spec cubre el **framework genérico** (Nivel 2, el que cubre ~70-75 de las 94 innatas sin necesitar motor nuevo por cada una). Quedan **fuera de esta spec** las ~4 innatas de "stacks que escalan durante el combate" (Ira Creciente, Sed de Sangre, Caos Encarnado, Trofeos de Caza) — esas son Nivel 3, se abordan aparte cuando toque esa familia. La carga de las 94 filas de datos también queda para después, familia por familia (mismo criterio que usamos con el lore) — esta spec es solo la infraestructura.

## 1. Idea central

Cada clase evolucionada tiene **como máximo 1 innata**. En vez de escribir 94 bloques de código distintos en `combat.js`, se carga cada innata como una fila de datos con un `trigger_type` conocido, y el motor de combate llama a un único helper genérico (`applyInnateTrigger`) en los ~7 puntos donde ya se resuelve el evento correspondiente — la mayoría de esos puntos **ya existen** en el código actual.

## 2. Schema

```sql
CREATE TABLE IF NOT EXISTS class_innate_abilities (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL UNIQUE REFERENCES classes(id), -- 1 innata por clase, por eso UNIQUE
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'ON_CRIT',            -- el propio actor acaba de conectar un crítico
    'ON_KILL',            -- el propio actor acaba de matar (deadTargets.length > 0)
    'ON_HEAL_CAST',       -- el propio actor acaba de resolver una skill CURACION/HOT
    'ON_DODGE',           -- el propio actor acaba de esquivar un ataque (result.evaded)
    'ON_DOT_APPLY',       -- el propio actor acaba de aplicar un DOT/ESTADO_ALTERADO
    'ON_COMBAT_START',    -- primera vez que actúa en la sesión (round 1)
    'ON_VICTORY_REWARD',  -- al calcular xp/gold/dungeon_coins de la sesión ganada
    'PASSIVE_STAT',       -- bono permanente, sin condición (= lo mismo que "Don de X" hoy)
    'PASSIVE_CONDITIONAL',-- bono activo solo mientras se cumple una condición de HP/comparación
    'TEAM_AURA',          -- mientras el actor está vivo, todo su bando recibe el bono
    'ONCE_PER_COMBAT_SAVE'-- "si tu HP llega a 0, sobrevive/revive" — 1 vez por combate
  )),
  chance_percent NUMERIC(5,2),              -- NULL = siempre se aplica (no es probabilístico)
  chance_scales_with_luck BOOLEAN NOT NULL DEFAULT FALSE, -- si TRUE, chance_percent * luck del actor
  stat_code TEXT,                            -- que stat toca (ATK, DEF, SPD, EVASION, GOLD, etc.)
  percent_amount NUMERIC(6,2),               -- magnitud del efecto
  condition_type TEXT,                       -- 'SELF_HP_BELOW', 'TARGET_HP_BELOW', 'MORE_HP_THAN_ALLIES', 'ANY_ALLY_HP_BELOW', NULL
  condition_value NUMERIC(6,2),
  extra_json JSONB,                          -- casos puntuales (ej. elemento afectado, tope de escudo)
  description TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_class_innate_abilities_class_id ON class_innate_abilities(class_id);
```

## 3. Puntos de enganche en `combat.js` (la mayoría ya existen)

| trigger_type | Dónde engancha | Estado actual |
|---|---|---|
| `ON_CRIT` | Justo después de resolver el golpe, donde ya se lee `result.crit` (línea ~581, mismo lugar donde se arma `hitDesc`) | Ya existe el dato, solo falta el hook |
| `ON_KILL` | Dentro de `registerKillCounters(playerId, sessionId, deadTargets, skill)` (línea ~394), que ya se llama con la lista de `deadTargets` | Ya existe la función, se le agrega la llamada al innata ahí mismo |
| `ON_DODGE` | Mismo lugar que `ON_CRIT`, leyendo `result.evaded` en vez de `result.crit` | Ya existe el dato |
| `ON_HEAL_CAST` | Donde se resuelve `skill_type === 'CURACION'` o el efecto `HOT` (mismo bloque donde ya se insertan las filas de `combat_participant_buffs` para curación) | Ya existe el bloque |
| `ON_DOT_APPLY` | Donde se resuelve `effect_type === 'DOT'` (mismo bloque donde ya se hace el tracking de `ENVENENAMIENTOS`/`VENENOS_DOMINADOS` de la fase 2) | Ya existe el bloque |
| `ON_COMBAT_START` | Al crear la sesión / primer turno de cada participante (`session.current_round === 1`) | Hook nuevo, chico |
| `ON_VICTORY_REWARD` | Donde se agregan `gold_reward`/`xp_reward` al ganar (línea ~1050, mismo lugar donde ya se aplica `combatBonusMultipliers` del nivel de gremio) | Ya existe el punto, se encadena con el multiplicador de gremio |
| `PASSIVE_STAT` | Igual que el "Don de X" actual — no necesita hook nuevo, es una fila más de bono permanente | Ya existe el mecanismo completo |
| `PASSIVE_CONDITIONAL` | En `getParticipantStat`/donde se calculan stats efectivos en combate, chequeando la condición antes de sumar el bono | Necesita el helper de condición (sección 4) |
| `TEAM_AURA` | Al armar los stats efectivos de cada aliado, chequear si algún vivo del mismo bando tiene una innata `TEAM_AURA` | Necesita iterar el bando, es barato (ya se itera para auras elementales de invocación) |
| `ONCE_PER_COMBAT_SAVE` | Mismo lugar donde hoy se chequea `pet_revive_used` antes de resolver la muerte de un participante | Ya existe el patrón exacto, solo se agrega `innate_used_this_combat` (ver sección 5) |

## 4. Helper genérico

```js
// lib/innates.js (nuevo)
const db = require('../db/db');

async function getInnateForClass(classId) {
  const res = await db.query('SELECT * FROM class_innate_abilities WHERE class_id = $1', [classId]);
  return res.rows[0] || null;
}

function rollChance(innate, actorLuck) {
  if (innate.chance_percent == null) return true; // siempre se aplica
  const chance = innate.chance_scales_with_luck
    ? innate.chance_percent * Number(actorLuck || 1)
    : Number(innate.chance_percent);
  return Math.random() * 100 < chance;
}

function checkCondition(innate, ctx) {
  // ctx: { actor, target, allies, enemies }
  switch (innate.condition_type) {
    case 'SELF_HP_BELOW':
      return (ctx.actor.hp / ctx.actor.max_hp) * 100 < Number(innate.condition_value);
    case 'TARGET_HP_BELOW':
      return ctx.target && (ctx.target.hp / ctx.target.max_hp) * 100 < Number(innate.condition_value);
    case 'MORE_HP_THAN_ALLIES':
      return ctx.allies.every((a) => a.id === ctx.actor.id || ctx.actor.hp > a.hp);
    case 'ANY_ALLY_HP_BELOW':
      return ctx.allies.some((a) => (a.hp / a.max_hp) * 100 < Number(innate.condition_value));
    default:
      return true; // sin condición (PASSIVE_STAT, o triggers que no la necesitan)
  }
}

// Llamado en cada uno de los 7 puntos de enganche de la sección 3, pasando el trigger_type
// correspondiente. Si la clase del actor no tiene innata, o es de otro trigger_type, no hace nada.
async function applyInnateTrigger(triggerType, ctx) {
  const innate = await getInnateForClass(ctx.actor.class_id);
  if (!innate || innate.trigger_type !== triggerType) return null;
  if (!rollChance(innate, ctx.actor.luck)) return null;
  if (!checkCondition(innate, ctx)) return null;
  return innate; // el caller (combat.js) ya sabe, por triggerType, que efecto aplicar
}

module.exports = { getInnateForClass, applyInnateTrigger, checkCondition, rollChance };
```

**Importante**: `applyInnateTrigger` decide SI corresponde disparar la innata (chance + condición). El **efecto en sí** (sumar stat, aplicar DOT extra, dar escudo, etc.) lo aplica `combat.js` en cada punto de enganche, leyendo `innate.stat_code`/`innate.percent_amount`/`innate.extra_json` — igual que ya hace con `skill_effects` para las skills normales. No hace falta un intérprete genérico de efectos, cada uno de los 7 puntos ya sabe qué hacer con su tipo de dato.

## 5. Cambios de schema adicionales

```sql
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS innate_used_this_combat BOOLEAN NOT NULL DEFAULT FALSE;
```

(Reutiliza exactamente el patrón de `pet_revive_used` — no hace falta una tabla nueva, un solo booleano alcanza porque cada participante solo puede tener 1 innata.)

## 6. Ejemplos resueltos (una innata por cada `trigger_type`, de muestra)

Para que quede claro cómo se carga una fila real una vez que el framework esté andando:

```sql
-- Espadachín (7): Filo Constante — ON_CRIT no es, es probabilidad simple tras ataque básico exitoso
-- (no depende de crítico, se agrega un trigger 'ON_BASIC_ATTACK_HIT' o se reutiliza ON_CRIT ajustando
-- la condición; a definir con el back cuando se cargue esta fila puntual)

-- Monje Oscuro (39): Puño Corrupto — ON_CRIT (ver nota: la propuesta dice "ataques básicos", no
-- crítico; ejemplo ilustrativo simplificado)
INSERT INTO class_innate_abilities (class_id, name, trigger_type, chance_percent, stat_code, percent_amount, description)
VALUES (39, 'Puño Corrupto', 'ON_CRIT', 10, NULL, NULL, 'Sus ataques básicos tienen 10% de probabilidad de aplicar un DOT oscuro leve.');

-- Caballero (8): Muro Viviente — PASSIVE_CONDITIONAL
INSERT INTO class_innate_abilities (class_id, name, trigger_type, stat_code, percent_amount, condition_type, description)
VALUES (8, 'Muro Viviente', 'PASSIVE_CONDITIONAL', 'DAMAGE_TAKEN_PHYSICAL', -10, 'MORE_HP_THAN_ALLIES', 'Mientras tenga más HP que cualquier aliado vivo, recibe 10% menos de daño físico.');

-- Paladín Celestial (46): Aura Celestial — TEAM_AURA
INSERT INTO class_innate_abilities (class_id, name, trigger_type, stat_code, percent_amount, description)
VALUES (46, 'Aura Celestial', 'TEAM_AURA', 'RESIST_DARK', 5, 'Todo el equipo gana +5% resistencia a daño oscuro mientras esté vivo.');

-- Maestro Monje Supremo (42): Vacío del Combate — ONCE_PER_COMBAT_SAVE
INSERT INTO class_innate_abilities (class_id, name, trigger_type, extra_json, description)
VALUES (42, 'Vacío del Combate', 'ONCE_PER_COMBAT_SAVE', '{"survive_hp": 1}', 'Una vez por combate, si su HP llega a 0, sobrevive con 1 HP.');

-- Cazador de Reliquias / Mercenario (82): A Sueldo — ON_VICTORY_REWARD
INSERT INTO class_innate_abilities (class_id, name, trigger_type, stat_code, percent_amount, description)
VALUES (82, 'A Sueldo', 'ON_VICTORY_REWARD', 'GOLD', 10, '+10% de oro ganado en cada victoria.');
```

## 7. Fuera de alcance de esta spec (para más adelante)

- **Nivel 3 (stacks que escalan en combate)**: Ira Creciente (Berserker), Sed de Sangre / Caos Encarnado (Titán Furioso/del Caos), Trofeos de Caza (Maestro Cazador). Necesitan una columna de stacks + recálculo de stat en cada stack — se diseña aparte cuando se aborde esa familia.
- **Carga de las 94 filas de datos**: se hace familia por familia una vez que el framework esté probado, mismo formato que usamos para el lore.
- Algunas innatas puntuales (ej. Filo Constante de Espadachín, que dispara tras "ataque básico exitoso" y no tras crítico) van a necesitar un `trigger_type` extra que no está en la lista de la sección 2 — normal, se van agregando al enum a medida que aparecen casos reales al cargar cada familia.

## Checklist

1. Tabla `class_innate_abilities` — sección 2.
2. Columna `innate_used_this_combat` en `combat_participants` — sección 5.
3. `lib/innates.js` con `getInnateForClass`/`applyInnateTrigger`/`checkCondition`/`rollChance` — sección 4.
4. Enganchar `applyInnateTrigger` en los 7 puntos de la sección 3 (la mayoría son 1-2 líneas nuevas en un lugar que ya existe).
5. Avisarme cuando esté probado con los 5 ejemplos de la sección 6, y seguimos cargando las 94 familia por familia.
