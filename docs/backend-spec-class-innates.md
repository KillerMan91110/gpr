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
    'PASSIVE_CONDITIONAL',-- bono activo solo mientras se cumple una condición (ver condition_type)
    'TEAM_AURA',          -- mientras el actor está vivo, todo su bando (o un aliado puntual) recibe el bono
    'ONCE_PER_COMBAT',    -- "una vez por combate pasa X" (revivir, inmunidad, cura garantizada, etc.)
    'ON_BASIC_ATTACK_HIT',-- el propio actor conecta un ataque básico (no crítico, cualquier golpe normal)
    'ON_SPELL_DAMAGE',    -- el propio actor conecta un hechizo ofensivo
    'ON_SPELL_CAST',      -- el propio actor lanza cualquier hechizo (antes de resolver daño)
    'ON_AOE_HIT',         -- el propio actor resuelve un ataque en área
    'ON_CRIT_RECEIVED',   -- el propio actor ACABA DE RECIBIR un golpe crítico
    'ON_DAMAGE_TAKEN',    -- el propio actor acaba de recibir cualquier daño
    'ON_DEFEND',          -- el propio actor usó la acción Defender este turno
    'ON_IMBUE',           -- el propio actor imbuye un elemento en un aliado
    'ON_TURN_START',      -- al empezar el turno del propio actor (cada ronda)
    'ON_ENEMY_TARGETS_ME',-- el propio actor está a punto de recibir un ataque (defensivo, antes de resolver)
    'ON_REVIVE_CAST',     -- el propio actor resuelve una skill de tipo REVIVE
    'ON_CRAFT',           -- el propio actor craftea un ítem (fuera de combate)
    'MODIFIES_SKILL'      -- no dispara en un evento genérico: altera el comportamiento de UNA skill puntual (ver extra_json.skill_code)
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
| `ONCE_PER_COMBAT` | Mismo lugar donde hoy se chequea `pet_revive_used` antes de resolver la muerte de un participante | Ya existe el patrón exacto, solo se agrega `innate_used_this_combat` (ver sección 5) |

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
    case 'SELF_HP_ABOVE':
      return (ctx.actor.hp / ctx.actor.max_hp) * 100 > Number(innate.condition_value);
    case 'TARGET_HP_ABOVE_SELF':
      return ctx.target && ctx.target.hp > ctx.actor.hp;
    case 'TARGET_CATEGORY_IN':
      return ctx.target && (innate.extra_json?.categories || []).includes(ctx.target.monster_category);
    case 'TARGET_IS_BOSS':
      return ctx.target?.is_boss === true;
    case 'IS_INVISIBLE':
      return ctx.actor.is_invisible === true;
    case 'ZONE_IN':
      return (innate.extra_json?.zones || []).includes(ctx.zoneCode);
    case 'MULTIPLE_SUMMONS_ACTIVE':
      return ctx.allies.filter((a) => a.is_summon && a.summoner_id === ctx.actor.id).length > 1;
    case 'ALREADY_FOUGHT_TYPE':
      return ctx.alreadyFoughtCategoriesThisCombat?.has(ctx.target?.monster_category);
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

## 6. Mapeo completo de las 90 innatas sin stacks (Nivel 2)

Las 4 restantes (Berserker, Titán Furioso, Titán del Caos, Maestro Cazador) son de stacks — van en la sección 7 (Nivel 3, con su propio schema). Estas 90 sí entran en el framework de arriba.

```sql
-- ═══ GUERRERO (18 de 21 — quedan afuera Berserker/Titán Furioso/Titán del Caos, van en Nivel 3) ═══
INSERT INTO class_innate_abilities
  (class_id, name, trigger_type, chance_percent, chance_scales_with_luck, stat_code, percent_amount, condition_type, condition_value, extra_json, description)
VALUES
  (6, 'Centro de Gravedad', 'ON_DEFEND', NULL, FALSE, NULL, 20, NULL, NULL, NULL,
    'Al usar Defender, el primer golpe que recibe ese turno reduce su daño un 20% adicional.'),
  (7, 'Filo Constante', 'ON_BASIC_ATTACK_HIT', 15, FALSE, NULL, NULL, NULL, NULL, '{"effect":"extra_attack"}',
    '15% de probabilidad de atacar una segunda vez en la misma ronda tras un ataque básico exitoso.'),
  (8, 'Muro Viviente', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'DAMAGE_TAKEN_PHYSICAL', -10, 'MORE_HP_THAN_ALLIES', NULL, NULL,
    'Mientras tenga más HP que cualquier aliado vivo, recibe 10% menos de daño físico.'),
  (10, 'Canalización Dual', 'ON_BASIC_ATTACK_HIT', 20, FALSE, NULL, NULL, NULL, NULL, '{"effect":"add_minor_magic_hit_of_imbued_element"}',
    '20% de probabilidad de que un ataque básico agregue un golpe mágico menor del elemento imbuido.'),
  (38, 'Cuerpo de Hierro', 'ON_CRIT_RECEIVED', NULL, FALSE, NULL, NULL, NULL, NULL, '{"immune_def_debuff_turns":1}',
    'Inmune a debuffs de DEF por 1 turno después de recibir un golpe crítico.'),
  (39, 'Puño Corrupto', 'ON_BASIC_ATTACK_HIT', 10, FALSE, NULL, NULL, NULL, NULL, '{"apply_dot":"DARK_MINOR"}',
    'Sus ataques básicos tienen 10% de probabilidad de aplicar un DOT oscuro leve.'),
  (40, 'Temblor', 'ON_AOE_HIT', NULL, FALSE, 'SPD', NULL, NULL, NULL, '{"debuff_all_targets_1_turn":true}',
    'Su ataque en área también reduce la SPD de todos los golpeados por 1 turno.'),
  (41, 'Puño Bendito', 'ON_BASIC_ATTACK_HIT', NULL, FALSE, NULL, 3, NULL, NULL, '{"effect":"heal_self_percent_of_damage_dealt"}',
    'Sus ataques básicos lo curan un 3% del daño infligido.'),
  (42, 'Vacío del Combate', 'ONCE_PER_COMBAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"survive_hp":1}',
    'Una vez por combate, si su HP llega a 0, sobrevive con 1 HP.'),
  (43, 'Danza de Acero', 'ON_DODGE', NULL, FALSE, NULL, NULL, NULL, NULL, '{"guarantee_next_crit":true}',
    'Cada vez que esquiva un ataque, su próximo golpe es crítico garantizado.'),
  (44, 'Armadura que Sangra', 'ON_DAMAGE_TAKEN', 15, FALSE, NULL, 10, NULL, NULL, '{"effect":"reflect_damage"}',
    '15% de probabilidad de reflejar 10% del daño recibido al atacante.'),
  (45, 'Escudo de Fe', 'ON_HEAL_CAST', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"grant_small_shield_to_healed_target"}',
    'Al curar a un aliado, ese aliado recibe también un escudo pequeño (absorbe el próximo golpe).'),
  (46, 'Aura Celestial', 'TEAM_AURA', NULL, FALSE, 'RESIST_DARK', 5, NULL, NULL, NULL,
    'Todo el equipo gana +5% resistencia a daño oscuro mientras esté vivo.'),
  (47, 'Pacto Abisal', 'ON_KILL', NULL, FALSE, NULL, 5, NULL, NULL, '{"effect":"heal_self_percent_max_hp"}',
    'Al matar a un enemigo, roba 5% de su HP máximo como curación instantánea.'),
  (48, 'Fortaleza', 'PASSIVE_STAT', NULL, FALSE, 'DAMAGE_TAKEN_PHYSICAL', -8, NULL, NULL, '{"non_stackable_with_temp_def_buffs":true}',
    '-8% daño físico recibido de forma permanente, no acumulable con buffs temporales de DEF.'),
  (49, 'Escamas de Dragón', 'ONCE_PER_COMBAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"immune_first_crit":true}',
    'Inmune al primer golpe crítico que reciba en cada combate.'),
  (52, 'Filo Arcano', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"basic_attack_also_scales_with":"MAG"}',
    'Sus ataques básicos escalan también con un % de MAG, además de ATK.'),
  (53, 'Saber Ancestral', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'ALL_DAMAGE', 10, 'ZONE_IN', NULL, '{"zones":["RUINAS_ANCESTRALES","CATACUMBAS_ABISMO"]}',
    '+10% de todo el daño en combates dentro de Ruinas Ancestrales o Catacumbas del Abismo.')
ON CONFLICT (class_id) DO NOTHING;

-- ═══ MAGO (19 de 19) ═══
INSERT INTO class_innate_abilities
  (class_id, name, trigger_type, chance_percent, chance_scales_with_luck, stat_code, percent_amount, condition_type, condition_value, extra_json, description)
VALUES
  (12, 'Eco de los Caídos', 'ON_KILL', 20, FALSE, NULL, NULL, NULL, NULL, '{"effect":"summon_spirit_single_attack"}',
    '20% de probabilidad de que un enemigo muerto por su hechizo invoque un espíritu que ataca una vez.'),
  (13, 'Vínculo Espiritual', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"summon_bonus":{"atk":10,"mag":10}}',
    'Sus invocados reciben +10% ATK/MAG sobre el valor estándar de invocación.'),
  (14, 'Resonancia Elemental', 'ON_IMBUE', NULL, FALSE, NULL, 5, NULL, NULL, '{"effect":"self_gains_resist_that_element_1_turn"}',
    'Al imbuir un elemento en un aliado, también gana +5% de resistencia a ese elemento por 1 turno.'),
  (15, 'Luz Interior', 'ON_SPELL_DAMAGE', NULL, FALSE, NULL, 5, NULL, NULL, '{"effect":"heal_lowest_hp_ally_percent_of_damage"}',
    'Sus hechizos ofensivos curan un 5% de su daño al aliado con menos HP.'),
  (31, 'Combustión', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"dot_can_crit":["FIRE"]}',
    'Sus DOT de Fuego pueden hacer crítico.'),
  (32, 'Escarcha', 'ON_SPELL_DAMAGE', 10, FALSE, 'SPD', NULL, NULL, NULL, '{"element":"ICE","debuff_target_1_turn":true}',
    'Sus hechizos de Hielo tienen 10% de probabilidad de reducir la SPD del objetivo 1 turno.'),
  (33, 'Reflejos del Rayo', 'PASSIVE_STAT', NULL, FALSE, 'SPD', 10, NULL, NULL, NULL,
    '+10% SPD permanente.'),
  (34, 'Erosión', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"element":"WATER","ignore_def_percent":10}',
    'Sus hechizos de Agua ignoran 10% de la DEF/DEF MAG enemiga.'),
  (35, 'Raíces de Piedra', 'PASSIVE_STAT', NULL, FALSE, 'DEF', 10, NULL, NULL, NULL,
    '+10% DEF permanente.'),
  (36, 'Paso del Viento', 'PASSIVE_STAT', NULL, FALSE, 'EVASION', 10, NULL, NULL, NULL,
    '10% de probabilidad de esquivar cualquier ataque.'),
  (37, 'Bendición de Luz', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'DAMAGE_DEALT', 15, 'TARGET_CATEGORY_IN', NULL, '{"categories":["DEMONIO","ESPECTRO","MUERTO_VIVIENTE"]}',
    '+15% de daño contra enemigos oscuros o no-muertos.'),
  (59, 'Convergencia', 'ON_SPELL_DAMAGE', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"apply_resist_debuff_of_that_element"}',
    'Cada hechizo elemental aplica también un pequeño debuff de resistencia a ese elemento en el objetivo.'),
  (54, 'Legión', 'ON_KILL', 25, FALSE, NULL, NULL, NULL, NULL, '{"effect":"summon_skeleton_temp"}',
    'Probabilidad de invocar un esqueleto aliado temporal al matar un enemigo (25%, ajustable — el original no especificaba número).'),
  (55, 'Trascendencia', 'ONCE_PER_COMBAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"revive_percent":25}',
    'Una vez por combate, si muere, revive automáticamente con 25% HP.'),
  (56, 'Pacto de Sangre', 'PASSIVE_CONDITIONAL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"summon_damage_scales_inverse_self_hp"}',
    'Sus invocados hacen más daño cuanto menos HP tenga el invocador.'),
  (57, 'Coro Celestial', 'ON_TURN_START', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"heal_team_small_while_summon_active"}',
    'Sus invocados curan levemente al equipo en cada turno que están activos.'),
  (58, 'Instinto de Manada', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'SPD', NULL, 'MULTIPLE_SUMMONS_ACTIVE', NULL, '{"applies_to":"summons"}',
    'Sus invocados ganan SPD extra si hay más de un invocado activo a la vez.'),
  (61, 'Casi Mito', 'ON_SPELL_CAST', 5, FALSE, NULL, NULL, NULL, NULL, '{"effect":"no_mana_cost"}',
    'Probabilidad pequeña (5%) de que un hechizo no consuma maná.'),
  (60, 'Ecos del Cosmos', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"element":"COSMIC","ignore_all_resistance":true}',
    'Sus hechizos de elemento Cósmico ignoran toda resistencia elemental enemiga.')
ON CONFLICT (class_id) DO NOTHING;

-- ═══ ARQUERO (16 de 17 — queda afuera Maestro Cazador, va en Nivel 3) ═══
INSERT INTO class_innate_abilities
  (class_id, name, trigger_type, chance_percent, chance_scales_with_luck, stat_code, percent_amount, condition_type, condition_value, extra_json, description)
VALUES
  (16, 'Instinto de Caza', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'DAMAGE_DEALT', 10, 'ALREADY_FOUGHT_TYPE', NULL, NULL,
    '+10% de daño contra un tipo de enemigo si ya se enfrentó a uno igual antes en el combate.'),
  (17, 'Ojo Certero', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"ignore_def_percent":15}',
    'Sus ataques ignoran 15% de la DEF enemiga.'),
  (18, 'Versatilidad', 'PASSIVE_CONDITIONAL', NULL, FALSE, NULL, 10, 'ANY_ALLY_HP_BELOW', 50, '{"if_true":"HEAL_POWER","if_false":"DAMAGE"}',
    'Recibe +10% de poder de curación si algún aliado (incluido él) está bajo 50% HP; si no, +10% de daño.'),
  (19, 'Flecha que Corrompe', 'ON_CRIT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"debuff_mag_target"}',
    'Sus golpes críticos aplican un pequeño debuff de MAG al objetivo.'),
  (20, 'Favor del Bosque', 'ON_TURN_START', NULL, FALSE, NULL, 3, NULL, NULL, '{"effect":"heal_self"}',
    'Regenera 3% de su HP cada turno.'),
  (62, 'Disparo Fantasma', 'ON_COMBAT_START', NULL, FALSE, NULL, NULL, NULL, NULL, '{"first_attack_unavoidable":true}',
    'Su primer ataque de cada combate no puede ser esquivado.'),
  (63, 'Onda Expansiva', 'ON_AOE_HIT', 10, FALSE, NULL, NULL, NULL, NULL, '{"effect":"stun_1_turn"}',
    'Sus ataques en área tienen 10% de probabilidad de aturdir 1 turno.'),
  (64, 'Veneno Persistente', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"dot_duration_bonus_turns":1}',
    'Sus DOT duran 1 turno más de lo normal.'),
  (68, 'Velocidad del Trueno', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"tie_break_spd_always_first":true}',
    'En empate de SPD contra el enemigo más veloz, siempre actúa primero.'),
  (67, 'Perforación', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"ignore_defend_status":true}',
    'Sus ataques básicos ignoran el estado Defender del objetivo.'),
  (66, 'Flecha de Luz', 'ON_BASIC_ATTACK_HIT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"heal_random_ally_small"}',
    'Sus flechas curan levemente a un aliado al azar al impactar.'),
  (73, 'Sombra Doble', 'ON_ENEMY_TARGETS_ME', 40, TRUE, NULL, NULL, NULL, NULL, '{"effect":"redirect_to_random_participant"}',
    '40% × luck de que un ataque enemigo se confunda y golpee a otro objetivo al azar (aliado o enemigo del confundido).'),
  (70, 'Arco Legendario', 'ON_CRIT', NULL, FALSE, NULL, 20, NULL, NULL, '{"effect":"crit_damage_bonus"}',
    'Sus golpes críticos hacen 20% más daño de lo normal.'),
  (74, 'Corona Ancestral', 'TEAM_AURA', NULL, FALSE, 'ALL_ELEMENTAL_RESIST', 5, NULL, NULL, NULL,
    'Todo el equipo gana +5% de todas las resistencias elementales.'),
  (71, 'Un Solo Ser', 'PASSIVE_STAT', NULL, FALSE, NULL, 15, NULL, NULL, '{"effect":"copy_ally_resistances_percent"}',
    'Copia el 15% de las resistencias elementales de sus aliados vivos.'),
  (72, 'Escudo de Ramas', 'TEAM_AURA', NULL, FALSE, 'DAMAGE_TAKEN', -10, NULL, NULL, '{"target":"lowest_hp_ally"}',
    'El aliado con menos HP recibe 10% menos daño mientras esté vivo.')
ON CONFLICT (class_id) DO NOTHING;

-- ═══ PÍCARO (18 de 18) ═══
INSERT INTO class_innate_abilities
  (class_id, name, trigger_type, chance_percent, chance_scales_with_luck, stat_code, percent_amount, condition_type, condition_value, extra_json, description)
VALUES
  (21, 'Paso Ligero', 'PASSIVE_STAT', NULL, FALSE, 'SPD', 8, NULL, NULL, NULL,
    '+8% SPD permanente.'),
  (22, 'Instinto Letal', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'CRIT_CHANCE', 10, 'TARGET_HP_ABOVE_SELF', NULL, NULL,
    'Contra enemigos con más HP que él, +10% de probabilidad de crítico.'),
  (23, 'Manos Rápidas', 'MODIFIES_SKILL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"PICARO_ROBAR","effect":"extra_action_reduced_chance","penalty_percent":50}',
    'Su skill Robar no consume el turno completo: puede volver a actuar con -50% de probabilidad de éxito ese mismo turno.'),
  (24, 'Toxina Base', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"dot_damage_bonus_percent":10}',
    'Sus DOT hacen 10% más daño por turno.'),
  (25, 'Terreno Preparado', 'MODIFIES_SKILL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"ESPECIALISTA_TRAMPAS_TRAMPA","effect":"instant_activation_same_turn"}',
    'Su Trampa tarda un turno menos en activarse (plantar y activar en el mismo turno).'),
  (78, 'Nunca Visto', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'EVASION', 20, 'IS_INVISIBLE', NULL, NULL,
    '+20% de probabilidad de esquivar cualquier ataque mientras tenga invisibilidad activa.'),
  (79, 'Fusión de Sombras', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"dot_can_crit":["DARK"]}',
    'Sus DOT oscuros pueden hacer crítico.'),
  (87, 'Casi Intocable', 'PASSIVE_STAT', NULL, FALSE, 'EVASION', 15, NULL, NULL, NULL,
    '+15% de evasión permanente.'),
  (75, 'Un Golpe, Un Final', 'PASSIVE_CONDITIONAL', NULL, FALSE, NULL, NULL, 'TARGET_HP_BELOW', 15, '{"effect":"guarantee_crit"}',
    'Contra enemigos con menos de 15% HP, sus ataques son crítico garantizado.'),
  (76, 'Cazador de Jefes', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'DAMAGE_DEALT', 20, 'TARGET_IS_BOSS', NULL, NULL,
    '+20% de daño contra jefes de quest o de piso de torre.'),
  (80, 'Leyenda Viva', 'MODIFIES_SKILL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"PICARO_ROBAR","success_bonus_percent":15}',
    '+15% de probabilidad de éxito adicional en Robar.'),
  (81, 'Ojo de Tesoros', 'MODIFIES_SKILL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"PICARO_ROBAR","effect":"rare_drop_chance_bonus"}',
    'Al robar con éxito, probabilidad extra de obtener el drop más raro del monstruo en vez de uno al azar.'),
  (77, 'Síntesis Tóxica', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"poisons_stack_independently":true}',
    'Sus 5 venenos pueden coexistir en el mismo objetivo sin reemplazarse entre sí.'),
  (86, 'Filo Elemental', 'ON_COMBAT_START', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"imbue_random_element_on_basic_attacks"}',
    'Sus ataques básicos se imbuyen con un elemento al azar al empezar cada combate.'),
  (82, 'A Sueldo', 'ON_VICTORY_REWARD', NULL, FALSE, 'GOLD', 10, NULL, NULL, NULL,
    '+10% de oro ganado en cada victoria.'),
  (83, 'Sentido de Mazmorra', 'ON_VICTORY_REWARD', NULL, FALSE, 'DUNGEON_COINS', 15, NULL, NULL, NULL,
    '+15% de monedas de mazmorra ganadas en la Torre Infinita.'),
  (84, 'Fantasma de Combate', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"invisibility_duration_bonus_turns":1}',
    'Su invisibilidad dura 1 turno extra.'),
  (85, 'Detector Nato', 'MODIFIES_SKILL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"ESPECIALISTA_TRAMPAS_DESACTIVAR","success_rate_percent":100}',
    'Su Desactivar Trampas nunca falla (100% de éxito).')
ON CONFLICT (class_id) DO NOTHING;

-- ═══ SACERDOTE (19 de 19) ═══
INSERT INTO class_innate_abilities
  (class_id, name, trigger_type, chance_percent, chance_scales_with_luck, stat_code, percent_amount, condition_type, condition_value, extra_json, description)
VALUES
  (26, 'Fe Instantánea', 'ON_HEAL_CAST', 10, FALSE, NULL, NULL, NULL, NULL, '{"effect":"double_heal"}',
    '10% de probabilidad de que una curación se duplique.'),
  (27, 'Equilibrio Natural', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"no_extra_mana_switching_dmg_heal"}',
    'Alterna entre daño y curación sin costo de maná adicional por el cambio.'),
  (28, 'Escudo de Fe', 'ON_DEFEND', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"grant_small_shield_random_ally"}',
    'Al usar Defender, también otorga un escudo pequeño a un aliado al azar.'),
  (29, 'Milagro', 'PASSIVE_CONDITIONAL', NULL, FALSE, 'HEAL_POWER', 20, 'TARGET_HP_BELOW', 30, NULL,
    'Sus curas a aliados con menos de 30% HP curan 20% más.'),
  (30, 'Juicio', 'PASSIVE_CONDITIONAL', NULL, FALSE, NULL, NULL, 'TARGET_CATEGORY_IN', NULL, '{"categories":["DEMONIO","ESPECTRO","MUERTO_VIVIENTE"],"effect":"ignore_magic_resistance"}',
    'Su daño contra enemigos oscuros o no-muertos ignora la resistencia mágica.'),
  (88, 'Curación en Cadena', 'ON_HEAL_CAST', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"heal_adjacent_lowest_hp_ally_small"}',
    'Su cura principal también cura levemente al aliado adyacente con menos HP.'),
  (97, 'Plegaria Constante', 'PASSIVE_STAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"no_buff_target_limit":true}',
    'Sus bendiciones no tienen límite de aliados con el buff activo a la vez.'),
  (100, 'Incontables Milagros', 'ONCE_PER_COMBAT', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"next_heal_cannot_fail_or_be_interrupted"}',
    'Una vez por combate, su próxima curación no puede fallar ni ser interrumpida.'),
  (90, 'Ciclo de Vida', 'ON_HEAL_CAST', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"restore_mana_on_heal"}',
    'Recupera maná extra cada vez que cura a un aliado.'),
  (91, 'Escudo Natural', 'TEAM_AURA', NULL, FALSE, 'EVASION', 5, NULL, NULL, '{"target":"protected_ally"}',
    'El aliado que protege también gana +5% de evasión.'),
  (98, 'Alquimia Sagrada', 'ON_CRAFT', NULL, FALSE, NULL, 10, NULL, NULL, '{"effect":"potion_potency_bonus"}',
    'Las pociones que craftea tienen 10% más potencia.'),
  (92, 'Fe Blindada', 'PASSIVE_CONDITIONAL', NULL, FALSE, NULL, NULL, 'SELF_HP_ABOVE', 50, '{"effect":"immune_def_debuffs"}',
    'Inmune a debuffs de DEF mientras tenga más de 50% HP.'),
  (93, 'Presencia Divina', 'TEAM_AURA', NULL, FALSE, 'CRIT_CHANCE', 5, NULL, NULL, NULL,
    'Todo el equipo gana +5% de probabilidad de crítico mientras esté vivo.'),
  (89, 'Nunca Solos', 'ON_REVIVE_CAST', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"heal_team_small_on_revive"}',
    'Su Revivir también cura levemente a todo el equipo al activarse.'),
  (101, 'Premonición', 'PASSIVE_STAT', NULL, FALSE, 'EVASION', 10, NULL, NULL, NULL,
    '10% de probabilidad de esquivar cualquier ataque, incluso sin usar Predicción.'),
  (95, 'Santuario Interior', 'ON_HEAL_CAST', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"SANADOR_LEGENDARIO_MEDITACION","effect":"cleanse_one_debuff_each_ally"}',
    'Su Meditación también limpia un debuff de cada aliado al lanzarse.'),
  (99, 'Fe Retorcida', 'ON_HEAL_CAST', NULL, FALSE, NULL, NULL, NULL, NULL, '{"effect":"heal_also_damages_enemies_small"}',
    'Sus curaciones también dañan levemente a los enemigos.'),
  (94, 'Purga Absoluta', 'PASSIVE_CONDITIONAL', NULL, FALSE, NULL, NULL, 'TARGET_CATEGORY_IN', NULL, '{"categories":["DEMONIO","ESPECTRO","MUERTO_VIVIENTE"],"effect":"ignore_all_resistance"}',
    'Su daño contra criaturas oscuras ignora toda resistencia.'),
  (96, 'Exorcismo Perfecto', 'MODIFIES_SKILL', NULL, FALSE, NULL, NULL, NULL, NULL, '{"skill_code":"EXORCISTA_APOYO","success_rate_percent":100}',
    'Su Exorcismo (Exorcismo Supremo) nunca falla.')
ON CONFLICT (class_id) DO NOTHING;
```

Notas sobre `extra_json.effect`/claves puntuales: son "punteros" a lógica bespoke que sí hay que codear a mano en el punto de enganche correspondiente (ej. `"effect":"reflect_damage"` implica que en el hook de `ON_DAMAGE_TAKEN` haya un `if (innate.extra_json.effect === 'reflect_damage')`). El framework decide **cuándo** evaluar la innata (evento + chance + condición); **qué hace** cada efecto puntual sigue siendo código explícito por caso, como ya pasa con `skill_effects`. Eso es esperable — con 90 efectos distintos no hay forma de que sea 100% genérico, pero al menos el 90% del trabajo (cuándo dispara, con qué probabilidad, bajo qué condición) ya está resuelto por el framework y no hay que reinventarlo en cada uno.

## 7. Nivel 3: las 4 innatas de stacks (Berserker, Titán Furioso, Titán del Caos, Maestro Cazador)

```sql
ALTER TABLE class_innate_abilities ADD COLUMN IF NOT EXISTS is_stacking BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS innate_stacks INT NOT NULL DEFAULT 0;
```

Regla general: cuando el `trigger_type` dispara (ej. `ON_KILL`, `ON_DAMAGE_TAKEN`), en vez de aplicar el efecto una sola vez, se hace `innate_stacks += extra_json.stack_amount` (clampeado a `extra_json.stack_cap` si tiene), y el bono real es `percent_amount * innate_stacks` sobre `stat_code`, recalculado en cada lectura de stats (igual que ya se hace con buffs temporales). `extra_json.reset_on` indica cuándo se reinician los stacks a 0.

```sql
INSERT INTO class_innate_abilities
  (class_id, name, trigger_type, is_stacking, stat_code, percent_amount, extra_json, description)
VALUES
  (9, 'Ira Creciente', 'ON_DAMAGE_TAKEN', TRUE, 'ATK', 3, '{"stack_per_hp_lost_percent":10,"reset_on":"full_heal"}',
    '+3% ATK acumulativo por cada 10% de HP perdido; se reinicia al curarse por completo.'),
  (50, 'Sed de Sangre', 'ON_KILL', TRUE, 'ATK', 5, '{"stack_amount":1,"reset_on":"never_within_combat"}',
    'Cada kill otorga un stack permanente de +5% ATK por el resto del combate.'),
  (51, 'Caos Encarnado', 'ON_KILL', TRUE, 'ATK', 5, '{"stack_amount":1,"reset_on":"never_within_combat","also_stat_code":"DAMAGE_TAKEN","also_percent_per_stack":2}',
    'Los stacks de Sed de Sangre también aumentan levemente el daño que recibe, +2% por stack (riesgo/recompensa).'),
  (69, 'Trofeos de Caza', 'ON_KILL', TRUE, 'DAMAGE_DEALT', 1, '{"stack_amount":1,"reset_on":"never_within_combat"}',
    '+1% de daño acumulable por cada kill logrado durante el combate.')
ON CONFLICT (class_id) DO NOTHING;
```

Con esto, **las 94 innatas quedan cubiertas** (90 en el framework de Nivel 2 + 4 de stacks en Nivel 3). Las claves de `extra_json.effect` marcadas arriba (`reflect_damage`, `guarantee_next_crit`, `double_heal`, etc.) son alrededor de 40 "efectos puntuales" distintos que hay que codear explícitamente en `combat.js` — no hay forma de evitar eso con 90 mecánicas distintas, pero ya no hace falta decidir CUÁNDO ni CON QUÉ PROBABILIDAD cada una, eso ya lo resuelve el framework.

## Checklist

1. Tabla `class_innate_abilities` (+ columna `is_stacking` de la sección 7) — sección 2.
2. Columnas `innate_used_this_combat` e `innate_stacks` en `combat_participants` — secciones 5 y 7.
3. `lib/innates.js` con `getInnateForClass`/`applyInnateTrigger`/`checkCondition`/`rollChance` — sección 4.
4. Enganchar `applyInnateTrigger` en los puntos de la sección 3 (la mayoría ya existen).
5. Cargar las 94 filas de las secciones 6 y 7.
6. Codear los ~40 `extra_json.effect` puntuales en cada punto de enganche correspondiente (esto es lo más largo, pero cada uno es autocontenido y chico).
