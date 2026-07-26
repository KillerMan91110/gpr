# Spec back: tienda de cada maestro de clase (segunda pasada)

`class_master_shop_items` ya existe (creada en el piloto) pero vacía, sin endpoints. Esto agrega
ambos: la tienda de cada maestro, cobrando ORO del jugador que compra (no oro de banco de gremio
— es personal, aunque el maestro viva en el gremio), mismo patrón que ya usan
`tower_vendor_shop`/`guild_bank_shop`.

## 1. Endpoints

```js
// GET /api/guilds/:guildId/masters/:masterId/shop
router.get('/:guildId/masters/:masterId/shop', async (req, res, next) => {
  try {
    const memberRes = await db.query(
      'SELECT 1 FROM guild_members WHERE guild_id = $1 AND player_id = $2',
      [req.params.guildId, req.playerId]
    );
    if (!memberRes.rows.length) return res.status(403).json({ error: 'No eres miembro de este gremio' });

    const unlockedRes = await db.query(
      'SELECT 1 FROM guild_class_masters WHERE guild_id = $1 AND master_id = $2',
      [req.params.guildId, req.params.masterId]
    );
    if (!unlockedRes.rows.length) return res.status(404).json({ error: 'Ese maestro no está en este gremio' });

    const shopRes = await db.query(
      `SELECT cmsi.id, cmsi.price, i.id AS item_id, i.code, i.name, i.description, i.item_type, i.rarity
       FROM class_master_shop_items cmsi
       JOIN items i ON i.id = cmsi.item_id
       WHERE cmsi.master_id = $1
       ORDER BY cmsi.price`,
      [req.params.masterId]
    );
    const goldRes = await db.query('SELECT gold FROM players WHERE id = $1', [req.playerId]);
    res.json({ gold: goldRes.rows[0].gold, shop: shopRes.rows });
  } catch (err) { next(err); }
});

// POST /api/guilds/:guildId/masters/:masterId/buy   body: { itemId }
router.post('/:guildId/masters/:masterId/buy', async (req, res, next) => {
  try {
    const memberRes = await db.query(
      'SELECT 1 FROM guild_members WHERE guild_id = $1 AND player_id = $2',
      [req.params.guildId, req.playerId]
    );
    if (!memberRes.rows.length) return res.status(403).json({ error: 'No eres miembro de este gremio' });

    const itemRes = await db.query(
      'SELECT price FROM class_master_shop_items WHERE master_id = $1 AND item_id = $2',
      [req.params.masterId, Number(req.body?.itemId)]
    );
    if (!itemRes.rows.length) return res.status(404).json({ error: 'Ítem no disponible en esta tienda' });
    const price = itemRes.rows[0].price;

    const goldRes = await db.query('SELECT gold FROM players WHERE id = $1', [req.playerId]);
    if (goldRes.rows[0].gold < price) return res.status(400).json({ error: `Oro insuficiente (necesitás ${price})` });

    await db.query('UPDATE players SET gold = gold - $1 WHERE id = $2', [price, req.playerId]);
    await inventory.addItem(req.playerId, Number(req.body.itemId), 1);
    const newGold = (await db.query('SELECT gold FROM players WHERE id = $1', [req.playerId])).rows[0].gold;
    res.json({ bought: true, gold: newGold });
  } catch (err) { next(err); }
});
```

## 2. Contenido: 2 ítems por maestro (1 equipo + 1 material), rareza UNICO

Precios y bonos de stat son punto de partida — ajustalos vos según cómo equilibren en niveles
15-40, no tengo visibilidad de la curva de oro real del juego.

```sql
INSERT INTO items (code, name, item_type, slot, rarity, class_id, required_level, is_craftable, obtain_method, description) VALUES
('KADRIC_ESPADA_VETERANO', 'Espada del Veterano', 'EQUIPMENT', 'WEAPON', 'UNICO', 1, 15, FALSE, 'Tienda de Kadric (gremio)', 'Forjada por Kadric para quien demuestre sostener el filo con convicción.'),
('KADRIC_PIEDRA_AFILADO', 'Piedra de Afilado de Kadric', 'MATERIAL', NULL, 'UNICO', NULL, NULL, FALSE, 'Tienda de Kadric (gremio)', 'Una piedra de afilar que Kadric usa desde antes de que nacieras.'),
('ISOLDE_ESCUDO_JURAMENTO', 'Escudo del Juramento', 'EQUIPMENT', 'OFFHAND', 'UNICO', 8, 15, FALSE, 'Tienda de Dama Isolde (gremio)', 'El escudo que Isolde entrega solo a quienes no se quiebran bajo el peso de la armadura.'),
('ISOLDE_INSIGNIA_GUARDIA', 'Insignia de Guardia', 'MATERIAL', NULL, 'UNICO', NULL, NULL, FALSE, 'Tienda de Dama Isolde (gremio)', 'Insignia que marca a quien Isolde considera digno de vigilar.'),
('AURELIO_CETRO_LUZ', 'Cetro de Luz Consagrada', 'EQUIPMENT', 'WEAPON', 'UNICO', 45, 25, FALSE, 'Tienda de Sumo Paladín Aurelio (gremio)', 'Un cetro que canaliza la misma luz que Aurelio sostuvo sin quebrarse.'),
('AURELIO_RELIQUIA_MENOR', 'Reliquia Sagrada Menor', 'MATERIAL', NULL, 'UNICO', NULL, NULL, FALSE, 'Tienda de Sumo Paladín Aurelio (gremio)', 'Fragmento de una reliquia mayor, todavía tibio de luz.'),
('SERAPHINE_ARMADURA_CELESTIAL', 'Armadura Celestial Menor', 'EQUIPMENT', 'ARMOR', 'UNICO', 46, 40, FALSE, 'Tienda de La Venerable Seraphine (gremio)', 'Una versión menor de la armadura que el cielo mismo reconoció en Seraphine.'),
('SERAPHINE_PLUMA_BENDITA', 'Pluma Bendita', 'MATERIAL', NULL, 'UNICO', NULL, NULL, FALSE, 'Tienda de La Venerable Seraphine (gremio)', 'Cae de un ala que ningún mortal debería haber visto de cerca.'),
('THELEN_GRIMORIO_ARCANO', 'Grimorio del Archimago', 'MATERIAL', NULL, 'UNICO', NULL, NULL, FALSE, 'Tienda de Archimago Thelen (gremio)', 'Páginas escritas por Thelen mismo, todavía con tinta arcana fresca.'),
('THELEN_CRISTAL_ARCANO', 'Cristal Arcano Puro', 'MATERIAL', NULL, 'UNICO', NULL, NULL, FALSE, 'Tienda de Archimago Thelen (gremio)', 'Un cristal que Thelen guarda para sus mejores alumnos.')
ON CONFLICT (code) DO NOTHING;

-- Bonos de stat de los 2 items EQUIPMENT (ajustar valores libremente)
INSERT INTO item_stat_bonuses (item_id, stat_code, amount, is_percent)
SELECT i.id, v.stat_code, v.amount, v.is_percent FROM items i JOIN (VALUES
  ('KADRIC_ESPADA_VETERANO', 'ATK', 12, TRUE),
  ('ISOLDE_ESCUDO_JURAMENTO', 'DEF', 12, TRUE),
  ('AURELIO_CETRO_LUZ', 'MAG', 12, TRUE),
  ('SERAPHINE_ARMADURA_CELESTIAL', 'MAGIC_DEF', 12, TRUE)
) AS v(code, stat_code, amount, is_percent) ON v.code = i.code
ON CONFLICT DO NOTHING;

-- Vincular cada item a la tienda de su maestro
INSERT INTO class_master_shop_items (master_id, item_id, price)
SELECT cm.id, i.id, v.price FROM class_masters cm JOIN items i ON TRUE JOIN (VALUES
  ('Kadric, el Veterano', 'KADRIC_ESPADA_VETERANO', 800),
  ('Kadric, el Veterano', 'KADRIC_PIEDRA_AFILADO', 300),
  ('Dama Isolde, Guardiana del Juramento', 'ISOLDE_ESCUDO_JURAMENTO', 800),
  ('Dama Isolde, Guardiana del Juramento', 'ISOLDE_INSIGNIA_GUARDIA', 300),
  ('Sumo Paladín Aurelio', 'AURELIO_CETRO_LUZ', 1200),
  ('Sumo Paladín Aurelio', 'AURELIO_RELIQUIA_MENOR', 450),
  ('La Venerable Seraphine', 'SERAPHINE_ARMADURA_CELESTIAL', 1600),
  ('La Venerable Seraphine', 'SERAPHINE_PLUMA_BENDITA', 600),
  ('Archimago Thelen', 'THELEN_GRIMORIO_ARCANO', 450),
  ('Archimago Thelen', 'THELEN_CRISTAL_ARCANO', 450)
) AS v(master_name, code, price) ON v.master_name = cm.name AND v.code = i.code
ON CONFLICT DO NOTHING;
```

## 3. Front (lo hago yo apenas esté esto)

En la sección "Maestros" de `GuildMy.js` (ya listada, solo lectura): agregar por cada maestro un
botón "Ver tienda" que abre un modal con `GET .../shop` (mismo patrón visual que `TowerVendor.js` —
lista con rareza, precio, botón Comprar) y llama a `POST .../buy` al comprar.

## Checklist

1. Endpoints GET/POST de tienda por maestro — sección 1.
2. 10 items (2 por maestro) + bonos de stat de los 4 de equipo + vínculo a
   `class_master_shop_items` — sección 2.
3. Front: modal de tienda en la sección Maestros — sección 3.
