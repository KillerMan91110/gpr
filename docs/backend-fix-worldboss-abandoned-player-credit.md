# Fix back: World Boss sigue acreditando daño a quien abandonó el grupo

Reportado en producción: alguien sale del grupo co-op en medio de un combate de World Boss (vía
`DELETE /api/player/:playerId/coop/party`). Eso está bien resuelto para lo normal — se le aplica
la multa de 10% de oro y queda en `combat_abandoned_players` (penalized=TRUE), y el motor de
combate ya usa esa tabla para: (a) hacer que la IA juegue sus turnos (`resolveAbandonedPlayerTurn`,
`routes/combat.js` ~1655) en vez de dejar colgado al compañero que sigue jugando, y (b) excluirlo
de las recompensas normales de XP/oro en `finalizeSession` (`heroPs`/`npcPs` filtran por
`abandonedIds`, líneas ~1351-1353).

El problema: **`handleWorldBossFinalize` no filtra por `combat_abandoned_players` en absoluto.**
Su query de atribución de daño (`routes/combat.js` ~1481-1489):

```js
const dmgByOwner = await db.query(
  `SELECT COALESCE(cp.player_id, cp.owner_player_id) AS owner_id, SUM(cl.damage) AS dmg
   FROM combat_log cl
   JOIN combat_participants cp ON cp.id = cl.actor_participant_id
   WHERE cl.session_id = $1 AND cl.damage IS NOT NULL AND cl.damage > 0 AND cp.side = 'PLAYER'
     AND COALESCE(cp.player_id, cp.owner_player_id) IS NOT NULL
   GROUP BY COALESCE(cp.player_id, cp.owner_player_id)`,
  [sessionId]
);
```

Suma TODO el daño de `combat_log` para ese `owner_id`, sin excluir a quien está en
`combat_abandoned_players` para esta sesión. Como la IA sigue peleando en nombre del que se fue
(y sigue haciendo daño real al jefe), ese daño se le sigue acreditando a esa persona en
`world_boss_damage_log` y en fragmentos cósmicos (`cosmic_shards`) — inconsistente con cómo ya se
maneja todo lo demás (XP/oro normal SÍ lo excluye).

## Fix propuesto

Igual que ya hace `finalizeSession` con `abandonedIds`, pero acá aplicado a la atribución de daño
completa (no solo "desde que abandonó" — más simple y consistente con que abandonar ya vacía todo
el crédito en otros lados de este mismo sistema, ver `docs` ya borrados sobre ESCAPE):

```js
async function handleWorldBossFinalize(sessionId, status, participants) {
  if (status === 'ESCAPED') return;
  const sessRes = await db.query('SELECT world_boss_event_id FROM combat_sessions WHERE id = $1', [sessionId]);
  const eventId = sessRes.rows[0]?.world_boss_event_id;
  if (!eventId) return;

  const boss = participants.enemy.find((e) => e.monster_code?.startsWith(WORLD_BOSS_CODE_PREFIX));
  if (!boss) return;

  const damageDealt = Math.max(0, Math.round(Number(boss.max_hp) - Number(boss.hp)));
  if (damageDealt <= 0) return;

  const abandonedRes = await db.query(
    'SELECT player_id FROM combat_abandoned_players WHERE session_id = $1', [sessionId]
  );
  const abandonedIds = abandonedRes.rows.map((r) => r.player_id);

  const dmgByOwner = await db.query(
    `SELECT COALESCE(cp.player_id, cp.owner_player_id) AS owner_id, SUM(cl.damage) AS dmg
     FROM combat_log cl
     JOIN combat_participants cp ON cp.id = cl.actor_participant_id
     WHERE cl.session_id = $1 AND cl.damage IS NOT NULL AND cl.damage > 0 AND cp.side = 'PLAYER'
       AND COALESCE(cp.player_id, cp.owner_player_id) IS NOT NULL
       AND COALESCE(cp.player_id, cp.owner_player_id) != ALL($2::int[])
     GROUP BY COALESCE(cp.player_id, cp.owner_player_id)`,
    [sessionId, abandonedIds]
  );
  // ... resto igual
```

(`!= ALL($2::int[])` con array vacío es siempre TRUE para cualquier fila, así que no filtra nada
cuando nadie abandonó — comportamiento actual intacto en el caso normal.)

También revisar el cálculo de `killerPlayerId`/top3 un poco más abajo en la misma función (~línea
1515-1535): si el último golpe o el top3 lo hace la IA de alguien que ya abandonó, hoy le daría el
bonus de kill-blow o de top3 a esa persona igual — debería excluirse con el mismo `abandonedIds`.

## Nota aparte (no es bug, es config del navegador)

También se reportó que en un tab de Chrome la barra de HP del jefe baja pero el número x/x no, y
en Edge sí baja el número — ambos tabs deberían mostrar exactamente lo mismo porque la barra y el
número salen del mismo dato (`participant.hp`/`max_hp`) en el mismo render. Lo más probable es que
el tab de Chrome tenga cacheado un bundle viejo de antes de alguno de los últimos deploys de hoy —
pedirle que haga un hard refresh (Ctrl+Shift+R) antes de asumir que es un bug de código.
