# Fix back: nivel duplicado en el log ("Rata de Alcantarilla Lv.4 Lv.4")

Reportado: `"Marco ataca a Rata de Alcantarilla Lv.4 Lv.4, infligiéndole 640 de daño."` — el nivel
sale dos veces.

Causa: `hydrateMonsters` ya arma el `name` con el nivel adentro (`` `${monster.name} Lv.${level}` ``,
o `Lv.???` para el World Boss — `routes/combat.js` ~línea 268), y encima `levelTag(target)`
(docs/backend-spec-log-narrativo.md, ya implementado) le suma otro " Lv.N" al final. Para jugadores
y NPCs el `name` NO trae el nivel, así que ahí `levelTag` funciona bien — el bug es solo con
monstruos como objetivo.

## Fix

```js
function levelTag(p) {
  return (p?.level != null && !p.monster_code) ? ` Lv.${p.level}` : '';
}
```

Con el chequeo de `!p.monster_code`, un monstruo (que ya trae el nivel en el nombre) no se toca;
un jugador o NPC (que no lo trae) sigue recibiendo el tag como corresponde.

## De paso: el turno del enemigo no tiene la frase narrativa nueva

Al mismo tiempo que arreglás esto, dos lugares más quedaron con la frase vieja (`"ataca a X por N
de daño"`) cuando es el MONSTRUO el que ataca — nunca se tocaron en el commit anterior, que solo
cubrió el ATTACK del jugador y el SKILL. `routes/combat.js` líneas ~1740 y ~2110:

```js
// antes
: `${actor.name} (IA) ataca a ${target.name} por ${result.damage} de daño${result.crit ? ' (¡crítico!)' : ''}.`,
// y
: `${actor.name} ataca a ${target.name} por ${result.damage} de daño${result.crit ? ' (¡crítico!)' : ''}.`,

// después (mismo patrón que ya se aplicó al ATTACK del jugador)
: `${actor.name} ataca a ${target.name}${levelTag(target)}, infligiéndole ${result.damage} de daño${result.crit ? ' (¡Crítico!)' : ''}.`,
```

(En estos dos casos `target` es un jugador o NPC, nunca un monstruo, así que `levelTag` no va a
duplicar nada acá — es exactamente el caso que sí necesita el tag.)
