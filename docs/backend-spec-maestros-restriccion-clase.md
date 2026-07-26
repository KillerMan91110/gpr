# Spec back: restringir la tienda de cada maestro por clase (+ regalo de líder/oficial)

Hoy `GET/POST /guilds/:id/masters/:masterId/shop|buy` solo chequea membresía de gremio — cualquiera
puede comprar equipo de cualquier clase, aunque no pueda usarlo. Se agrega:

- **Compra para uno mismo**: solo si tu clase actual (o alguna de sus clases ancestro en la cadena
  de evolución) coincide con la del maestro — así un Paladín sigue pudiendo comprarle a Isolde
  (maestra de Caballero) aunque ya haya evolucionado más allá, no se le "castiga" el acceso.
- **Regalo**: líder/oficial puede comprar de CUALQUIER tienda de maestro (sin que su propia clase
  coincida) especificando un destinatario del gremio — pero el destinatario sí tiene que tener la
  clase correspondiente, y lo paga el ORO PERSONAL de quien compra (no el banco de gremio — sigue
  siendo personal, mismo criterio ya establecido).

`getClassAncestorChain(classId)` ya existe en `lib/evolution.js` (exportada) — devuelve el array
completo incluyendo la clase pedida, ej. para Paladín: `[1, 8, 45]` (Guerrero, Caballero, Paladín).
Es exactamente lo que hace falta para el chequeo de "coincide o desciende de".

## `GET /:id/masters/:masterId/shop` — agregar el chequeo de elegibilidad

```js
const { getClassAncestorChain } = require('../lib/evolution'); // agregar al require de arriba

router.get('/:id/masters/:masterId/shop', async (req, res, next) => {
  try {
    const playerId = req.playerId;
    const { id: guildId, masterId } = req.params;

    const memberRes = await db.query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND player_id = $2',
      [guildId, playerId]
    );
    if (!memberRes.rows.length) return res.status(403).json({ error: 'No eres miembro de este gremio' });
    const myRole = memberRes.rows[0].role;

    const unlockedRes = await db.query(
      'SELECT cm.class_id FROM guild_class_masters gcm JOIN class_masters cm ON cm.id = gcm.master_id WHERE gcm.guild_id = $1 AND gcm.master_id = $2',
      [guildId, masterId]
    );
    if (!unlockedRes.rows.length) return res.status(404).json({ error: 'Ese maestro no está en este gremio' });
    const masterClassId = unlockedRes.rows[0].class_id;

    const myClassRes = await db.query(
      'SELECT COALESCE(evolution_class_id, current_class_id) AS class_id FROM players WHERE id = $1',
      [playerId]
    );
    const myChain = await getClassAncestorChain(myClassRes.rows[0].class_id);
    const isMyClass = myChain.includes(masterClassId);
    const canGift = myRole === 'LEADER' || myRole === 'OFFICER';

    if (!isMyClass && !canGift) {
      return res.status(403).json({ error: 'Esta tienda es para la clase de este maestro. Pedile a tu líder u oficial que te compre algo si sos de esa clase.' });
    }

    const shopRes = await db.query(
      `SELECT cmsi.id, cmsi.price, i.id AS item_id, i.code, i.name, i.description, i.item_type, i.rarity
       FROM class_master_shop_items cmsi
       JOIN items i ON i.id = cmsi.item_id
       WHERE cmsi.master_id = $1
       ORDER BY cmsi.price`,
      [masterId]
    );
    const goldRes = await db.query('SELECT gold FROM players WHERE id = $1', [playerId]);
    res.json({ gold: goldRes.rows[0].gold, shop: shopRes.rows, isMyClass, canGift: canGift && !isMyClass });
  } catch (error) { next(error); }
});
```

(`canGift` en la respuesta le avisa al front si tiene que mostrar el selector de destinatario — ver
sección front.)

## `POST /:id/masters/:masterId/buy` — aceptar `recipientPlayerId` opcional

```js
router.post('/:id/masters/:masterId/buy', async (req, res, next) => {
  try {
    const playerId = req.playerId;
    const { id: guildId, masterId } = req.params;
    const itemId = Number(req.body?.itemId);
    const recipientPlayerId = req.body?.recipientPlayerId ? Number(req.body.recipientPlayerId) : playerId;
    if (!itemId) return res.status(400).json({ error: 'itemId requerido' });

    const memberRes = await db.query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND player_id = $2',
      [guildId, playerId]
    );
    if (!memberRes.rows.length) return res.status(403).json({ error: 'No eres miembro de este gremio' });
    const myRole = memberRes.rows[0].role;

    const masterRes = await db.query('SELECT class_id FROM class_masters WHERE id = $1', [masterId]);
    const masterClassId = masterRes.rows[0]?.class_id;

    if (recipientPlayerId !== playerId) {
      // Regalo: solo líder/oficial, y el DESTINATARIO tiene que ser de esa clase (o su cadena).
      if (myRole !== 'LEADER' && myRole !== 'OFFICER') {
        return res.status(403).json({ error: 'Solo el líder o un oficial puede comprarle a otro miembro' });
      }
      const recipientMemberRes = await db.query(
        'SELECT 1 FROM guild_members WHERE guild_id = $1 AND player_id = $2',
        [guildId, recipientPlayerId]
      );
      if (!recipientMemberRes.rows.length) return res.status(400).json({ error: 'El destinatario no es miembro de este gremio' });
      const recipientClassRes = await db.query(
        'SELECT COALESCE(evolution_class_id, current_class_id) AS class_id FROM players WHERE id = $1',
        [recipientPlayerId]
      );
      const recipientChain = await getClassAncestorChain(recipientClassRes.rows[0].class_id);
      if (!recipientChain.includes(masterClassId)) {
        return res.status(400).json({ error: 'El destinatario no es de la clase de este maestro' });
      }
    } else {
      // Para uno mismo: mi propia clase (o cadena) tiene que coincidir.
      const myClassRes = await db.query(
        'SELECT COALESCE(evolution_class_id, current_class_id) AS class_id FROM players WHERE id = $1',
        [playerId]
      );
      const myChain = await getClassAncestorChain(myClassRes.rows[0].class_id);
      if (!myChain.includes(masterClassId)) {
        return res.status(403).json({ error: 'Esta tienda es para la clase de este maestro' });
      }
    }

    const shopItemRes = await db.query(
      'SELECT price FROM class_master_shop_items WHERE master_id = $1 AND item_id = $2',
      [masterId, itemId]
    );
    if (!shopItemRes.rows.length) return res.status(404).json({ error: 'Ítem no disponible en esta tienda' });
    const price = shopItemRes.rows[0].price;

    const goldRes = await db.query('SELECT gold FROM players WHERE id = $1', [playerId]);
    const currentGold = Number(goldRes.rows[0].gold);
    if (currentGold < price) return res.status(400).json({ error: `Oro insuficiente (necesitás ${price})` });

    // Siempre paga quien compra (playerId), aunque sea un regalo — el item va al destinatario.
    await db.query('UPDATE players SET gold = gold - $1 WHERE id = $2', [price, playerId]);
    await inventory.addItem(recipientPlayerId, itemId, 1);

    res.json({ bought: true, gold: currentGold - price, recipientPlayerId });
  } catch (error) { next(error); }
});
```

## Front (lo hago yo apenas esté esto)

- Botón "Ver tienda" en la sección Maestros: deshabilitado (con tooltip "Esta tienda es para la
  clase de {nombre}") si ni tu clase coincide ni sos líder/oficial — hoy está siempre habilitado.
- Dentro del modal de tienda: si `canGift` viene en `true` en la respuesta del GET, mostrar un
  `<select>` de destinatario (mismos `guild.members` que ya usa el formulario del banco de gremio)
  en vez de comprar directo para uno mismo; si `isMyClass` es `true`, comprar directo como hoy.

## Checklist

1. Chequeo de clase (cadena completa vía `getClassAncestorChain`) en GET shop — sección "GET".
2. `recipientPlayerId` opcional + validaciones de regalo en POST buy — sección "POST".
3. Front: botón deshabilitado sin acceso + selector de destinatario cuando `canGift` — sección Front.
