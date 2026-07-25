# Spec back: Rareza de encuentro + mutaciones en El Abismo

Cubre la última pieza del pitch original que faltaba: que un monstruo de sala normal (no jefe de
piso) pueda salir ocasionalmente mucho más fuerte y/o distinto — sin tocar `monsters.rarity`
(que ya existe y significa otra cosa: elegibilidad de spawn por zona/nivel, COMMON/RARE). Esto es
una capa nueva y separada: **rareza de encuentro**, tirada por spawn, en `buildTowerRoom` después
de `hydrateMonsters` — mismo lugar donde ya se aplica el multiplicador de dificultad hoy.

No aplica a pisos de jefe (`is_boss_floor`): esos ya tienen su propio monstruo curado
(`boss_monster_code`), no tiene sentido mutarlo también.

## 1. Schema: una columna nueva, nada de tabla de contenido

```sql
ALTER TABLE combat_participants ADD COLUMN IF NOT EXISTS mutation_code TEXT;
```

Todo lo demás (tiers, multiplicadores, mutaciones) son constantes en código, no contenido a
autorar — a diferencia de los eventos narrativos, acá no hace falta texto escrito a mano.

## 2. Tiers de rareza de encuentro (independientes de `monsters.rarity`)

```js
const ENCOUNTER_RARITY_WEIGHTS      = { COMUN: 60, POCO_COMUN: 20, RARO: 10, ELITE: 7, MINI_JEFE: 2, JEFE: 1 };
const ENCOUNTER_RARITY_STAT_MULT    = { COMUN: 1,  POCO_COMUN: 1.15, RARO: 1.35, ELITE: 1.7, MINI_JEFE: 2.2, JEFE: 2.8 };
const ENCOUNTER_RARITY_REWARD_MULT  = { COMUN: 1,  POCO_COMUN: 1.2,  RARO: 1.5,  ELITE: 2,   MINI_JEFE: 3,   JEFE: 4 };
const ENCOUNTER_RARITY_MUTATION_CHANCE = { COMUN: 0, POCO_COMUN: 0.1, RARO: 0.3, ELITE: 0.6, MINI_JEFE: 0.9, JEFE: 1 };
const ENCOUNTER_RARITY_LABEL = { POCO_COMUN: 'Poco Común', RARO: 'Raro', ELITE: 'Élite', MINI_JEFE: 'Mini Jefe', JEFE: 'Jefe' };
```

(Los colores Blanco/Verde/Azul/Morado/Naranja/Rojo del pitch quedan para el front, sección 5 —
no hace falta que el back mande un color, alcanza con mandar el tier.)

## 3. Mutaciones

```js
const MUTATIONS = {
  FRENETICO: { label: 'Frenético', apply: (e) => { e.spd = Math.round(e.spd * 1.4); } },
  GIGANTE:   { label: 'Gigante',   apply: (e) => { e.hp = Math.round(e.hp * 2); e.max_hp = e.hp; } },
  DORADO:    { label: 'Dorado',    apply: (e) => { e.gold_reward = Math.round(e.gold_reward * 3); } },
  CORRUPTO:  { label: 'Corrupto',  apply: (e) => { e.mutation_code = 'CORRUPTO'; } },
};
```

Frenético/Gigante/Dorado son gratis: solo tocan campos que `hydrateMonsters` ya calcula, cero
lógica nueva en el motor de combate. **Corrupto es la única que necesita un hook nuevo**: cuando
un `combat_participants` con `mutation_code = 'CORRUPTO'` conecta un ATTACK básico contra un
jugador/NPC, aplicar el mismo tipo de debuff DOT que ya usa el resto del juego (`INSERT INTO
combat_participant_buffs(...,'DOT',...)`, ver el bloque de veneno que ya existe en la resolución
de ATTACK/SKILL). El lugar exacto es donde se resuelve el daño de un ATTACK normal del enemigo —
lo vas a ubicar más rápido vos que yo mirando el archivo, es agregar un `if (actor.mutation_code
=== 'CORRUPTO' && action === 'ATTACK' && !evaded) { ...aplicar DOT al target... }` ahí.

## 4. Dónde engancha: `buildTowerRoom`, después de la hidratación

```js
const ENCOUNTER_RARITY_ORDER = Object.keys(ENCOUNTER_RARITY_WEIGHTS);

function rollEncounterRarity() {
  const total = Object.values(ENCOUNTER_RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const tier of ENCOUNTER_RARITY_ORDER) {
    if (roll < ENCOUNTER_RARITY_WEIGHTS[tier]) return tier;
    roll -= ENCOUNTER_RARITY_WEIGHTS[tier];
  }
  return 'COMUN';
}

function applyEncounterRarity(enemy) {
  const tier = rollEncounterRarity();
  if (tier !== 'COMUN') {
    const mult = ENCOUNTER_RARITY_STAT_MULT[tier];
    enemy.hp = Math.round(enemy.hp * mult); enemy.max_hp = enemy.hp;
    enemy.atk = Math.round(enemy.atk * mult);
    enemy.def = Math.round(enemy.def * mult);
    enemy.mag = Math.round(enemy.mag * mult);
    enemy.magic_def = Math.round(enemy.magic_def * mult);
    enemy.spd = Math.round(enemy.spd * mult);
    const rewardMult = ENCOUNTER_RARITY_REWARD_MULT[tier];
    enemy.gold_reward = Math.round(enemy.gold_reward * rewardMult);
    enemy.xp_reward = Math.round(enemy.xp_reward * rewardMult);
    enemy.name = `${enemy.name} · ${ENCOUNTER_RARITY_LABEL[tier]}`;
    enemy.encounter_rarity = tier; // exponer en combat_participants para que el front la pinte
  }
  if (Math.random() < ENCOUNTER_RARITY_MUTATION_CHANCE[tier]) {
    const codes = Object.keys(MUTATIONS);
    const code = codes[Math.floor(Math.random() * codes.length)];
    MUTATIONS[code].apply(enemy);
    enemy.name = `${enemy.name} ${MUTATIONS[code].label}`;
  }
}
```

En `buildTowerRoom`, justo después del loop que ya aplica `statMult` (dificultad + lap infinito),
agregar:

```js
if (!floorRow.is_boss_floor) {
  for (const e of enemyCombatants) applyEncounterRarity(e);
}
```

`enemy.encounter_rarity` y `enemy.mutation_code` viajan naturalmente si `insertParticipants` ya
inserta cualquier campo que le llegue en el objeto combatant (como pasa con el resto de los stats)
— si `combat_participants` no tiene columna para `encounter_rarity`, con que quede en el `name`
concatenado alcanza para el v1 (el front no necesita el campo separado todavía, ver sección 5).

## 5. Front (lo hago yo una vez esté esto)

Para v1, el nombre ya viene con la rareza/mutación concatenada (`"Goblin · Élite Corrupto"`), así
que el `CombatantCard` existente ya lo muestra sin tocar nada. Si más adelante querés los colores
del pitch (blanco/verde/azul/morado/naranja/rojo por tier), ahí sí pido que `combat_participants`
tenga la columna `encounter_rarity` de verdad y la exponga `fetchSessionState`, para pintar el
nombre en vez de parsearlo del string.

## Checklist

1. `ALTER TABLE combat_participants ADD COLUMN mutation_code TEXT` — sección 1.
2. Constantes de tiers + mutaciones — secciones 2-3.
3. `rollEncounterRarity` / `applyEncounterRarity` enganchado en `buildTowerRoom` después del
   multiplicador de dificultad existente, solo si `!floorRow.is_boss_floor` — sección 4.
4. Hook de Corrupto en la resolución de ATTACK básico — única mutación con lógica nueva, sección 3.
