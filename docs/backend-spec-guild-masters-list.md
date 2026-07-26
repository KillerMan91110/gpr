# Spec back: endpoint de lectura para "Maestros" del gremio

El piloto de maestros de clase (ya implementado: tablas + hook de evolución + hook de exploración
+ resolver) dejó la tienda para una segunda pasada, pero hace falta ANTES un endpoint mínimo de
lectura — hoy no hay ninguna forma de listar qué maestros desbloqueó un gremio para mostrarlos en
el front. Esto es solo lectura, sin tienda todavía (eso sigue siendo la segunda pasada).

## `GET /api/guilds/:guildId/masters`

```js
router.get('/:guildId/masters', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT cm.id, cm.name, cm.guild_dialogue, gcm.unlocked_at, p.nickname AS unlocked_by_nickname
       FROM guild_class_masters gcm
       JOIN class_masters cm ON cm.id = gcm.master_id
       LEFT JOIN players p ON p.id = gcm.unlocked_by_player_id
       WHERE gcm.guild_id = $1
       ORDER BY gcm.unlocked_at`,
      [req.params.guildId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});
```

Mismo router/prefijo que ya usan `/bank`, `/shop`, `/activity` de gremio — no hace falta nada nuevo
de auth, ya están cubiertos por lo que sea que protege esas rutas hoy.

## Front (lo hago yo apenas esté esto)

`GuildMy.js`: nueva sección "Maestros" listando esto (nombre + `guild_dialogue` + "gracias a
{unlocked_by_nickname}"), mismo panel visual que banco/tienda/actividad que ya están ahí. Sin
botón de compra todavía — eso espera a la tienda real (segunda pasada, ya avisada).
