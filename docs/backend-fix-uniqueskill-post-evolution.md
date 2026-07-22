# Fix back: "Pasiva Aprendida" (uniqueSkill) desaparece al evolucionar

## Bug encontrado

En `lib/passives.js` (`getClassPassiveBonuses`):

```js
if (Number(row.learn_level) === 1 && !bonuses.uniqueSkill) {
  bonuses.uniqueSkill = { name: row.name, description: row.description };
}
```

Esto asume que la pasiva única de una clase siempre se aprende en `learn_level = 1`. Cierto para las 5 clases base (`GUERRERO_PASIVA_ESCUDO_DE_HIERRO`, `MAGO_PASIVA_AMPLIFICACION_MAGICA`, etc., todas en nivel 1), pero **falso para cualquier clase evolucionada**: su "Don de X" se aprende en el nivel donde esa clase se desbloquea (`MONJE_PASIVA_DON` en nivel 15, `ESPADACHIN_PASIVA_DON` en nivel 15, etc. — nunca en nivel 1, porque no podés ser Monje antes de nivel 15).

Como `server.js` llama `getClassPassiveBonuses(effectiveClassId, player.level)` con `effectiveClassId` = la clase evolucionada una vez que evolucionás, la condición `learn_level === 1` nunca se cumple para ningún personaje evolucionado → `uniqueSkill` da `null` siempre → el panel "Pasiva Aprendida" del Dashboard desaparece apenas evolucionás, aunque la clase evolucionada sí tenga su propio "Don de X" cargado (el bono de stats de esa pasiva SÍ se suma bien a los números, esto solo rompe el nombre/descripción que se muestra).

## Fix

La query ya trae los resultados ordenados por `learn_level, id` (ver `ORDER BY s.learn_level, s.id` en la misma función). No hace falta comparar contra `1` — alcanza con tomar la PRIMERA fila pasiva que aparezca para esa clase, sea cual sea su `learn_level`:

```js
// antes:
if (Number(row.learn_level) === 1 && !bonuses.uniqueSkill) {
  bonuses.uniqueSkill = { name: row.name, description: row.description };
}

// después:
if (!bonuses.uniqueSkill) {
  bonuses.uniqueSkill = { name: row.name, description: row.description };
}
```

Con esto: para un personaje sin evolucionar, sigue mostrando su "Habilidad Única" de nivel 1 (comportamiento sin cambios). Para un personaje evolucionado, ahora muestra el "Don de X" de la clase a la que evolucionó (nombre real de esa pasiva), que es exactamente lo que el jugador espera ver ahí.

No hace falta tocar `server.js` ni el front — el campo ya se llama `uniqueSkill` en la respuesta y el Dashboard ya lo consume, solo estaba llegando vacío.
