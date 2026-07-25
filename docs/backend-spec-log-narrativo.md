# Spec back: log de combate más narrativo (con nivel del objetivo)

Pedido: que el log de combate se sienta más "vivo" — en vez de `"Marco ataca a Goblin por 45 de
daño."`, algo como `"Marco realiza un ataque sobre Goblin Lv.5, haciéndole 45 de daño."` / `"Elira
usa Toque Sanador y cura a Marco Lv.30 por 30 HP."`.

Esto vive en `routes/combat.js`, repartido en docenas de `insertLog(...)` distintos (ataque básico,
cada tipo de skill, DOT/HOT, items, defender, escapar, golpe de área del World Boss, etc.) — no es
un solo lugar, así que no tiene sentido reescribir las decenas de strings a mano una por una. Mejor
un helper compartido que centralice el formato, y aplicarlo primero en los dos casos de mayor
tráfico (ataque básico y skill de ataque/curación) — el resto se puede ir sumando después sin que
todo tenga que salir en el mismo commit.

## 0. Bug encontrado de paso: los NPCs propios no tienen `level`

`hydratePartyNpcs` (`routes/combat.js` ~167) devuelve el combatant sin campo `level` — a diferencia
de `hydratePlayers` (que sí trae `level: p.level`) y `hydrateMonsters` (que trae `level` del
escalado). La consulta SQL de `hydratePartyNpcs` ya trae `pn.level`, solo falta pasarlo:

```js
// dentro del objeto que devuelve hydratePartyNpcs, agregar:
level: npc.level,
```

Sin esto, un NPC propio como objetivo/actor va a mostrar el tag de nivel vacío mientras que
jugadores y monstruos sí lo muestran — inconsistente.

## 1. Helper compartido para el tag de nivel

```js
function levelTag(p) {
  return p?.level != null ? ` Lv.${p.level}` : '';
}
```

## 2. Ataque básico (mayor tráfico, un solo objetivo)

Ubicación actual: `routes/combat.js` ~2699-2701, dentro de `action === 'ATTACK'`.

```js
description: result.evaded
  ? `${actor.name} ataca a ${target.name}${levelTag(target)}, pero esquiva el golpe.`
  : `${actor.name} ataca a ${target.name}${levelTag(target)}, infligiéndole ${result.damage} de daño${attackElementalMods ? ' elemental' : ''}${result.crit ? ' (¡Crítico!)' : ''}.`,
```

## 3. Skill de ataque/curación (multi-objetivo)

Ubicación actual: `routes/combat.js` ~3349-3363, el bloque que arma `verb`/`summary`/`totalAmount`.

```js
const summary = results
  .map((r) => r.evaded
    ? `${r.target.name}${levelTag(r.target)} esquiva`
    : skill.skill_type === 'CURACION'
      ? `${r.target.name}${levelTag(r.target)}, curándole ${r.amount} HP`
      : `${r.target.name}${levelTag(r.target)}, haciéndole ${r.amount} de daño${r.crit ? ' (¡Crítico!)' : ''}`)
  .join('; ');

description: skill.skill_type === 'CURACION'
  ? `${actor.name} usa ${skill.name} y cura a ${summary}.`
  : `${actor.name} usa ${skill.name} sobre ${summary}.`,
```

Ejemplo con un solo objetivo: `"Elira usa Toque Sanador y cura a Marco Lv.30, curándole 30 HP."`
(queda un poco redundante "cura...curándole" con un solo objetivo — ajustar la redacción como
prefieras, la idea central es el patrón de nombre+nivel+efecto, no el texto exacto).

## 4. El resto (progresivo, no hace falta ahora)

Mismo patrón (`levelTag` + "nombre Lv.N, efecto") aplicable después a: BUFF/DEBUFF, DOT/HOT ticks,
USE_ITEM, DEFEND, ESCAPE, golpe de área del World Boss, trampas. No los especifico uno por uno acá
— son muchos y de menor tráfico, mejor ir migrándolos de a poco reusando el mismo `levelTag()` que
en las secciones 2-3, en vez de intentar cubrir todo en un solo commit grande.
