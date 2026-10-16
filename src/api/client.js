const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),
  checkNickname: (nickname) => request(`/api/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`),
  getClasses: () => request('/api/classes'),
  getItem: (itemId, token) => request(`/api/items/${itemId}`, { token }),
  getClassElementals: (classId) => request(`/api/classes/${classId}/elementals`),
  getLeaderboard: () => request('/api/leaderboard'),
  inspectPlayer: (playerId, targetId, token) => request(`/api/player/${playerId}/inspect/${targetId}`, { token }),
  getGuildLeaderboard: () => request('/api/leaderboard/guilds'),
  getWealthLeaderboard: () => request('/api/leaderboard/wealth'),
  getRanks: () => request('/api/ranks'),
  getPlayerStats: (playerId, token) => request(`/api/player/${playerId}/stats`, { token }),
  getPlayerZones: (playerId, token) => request(`/api/player/${playerId}/zones`, { token }),
  getBestiary: (playerId, token) => request(`/api/player/${playerId}/bestiary`, { token }),
  getPlayerInventory: (playerId, token) => request(`/api/player/${playerId}/inventory`, { token }),
  getPlayerEquipment: (playerId, token) => request(`/api/player/${playerId}/equipment`, { token }),
  getPlayerSkills: (playerId, token) => request(`/api/player/${playerId}/skills`, { token }),
  getAchievements: (playerId, token) => request(`/api/player/${playerId}/achievements`, { token }),
  getClassSkills: (playerId, token, npcId) =>
    request(`/api/player/${playerId}/class-skills${npcId ? `?npcId=${npcId}` : ''}`, { token }),
  getAvailableQuests: (playerId, token) => request(`/api/player/${playerId}/quests/available`, { token }),
  getActiveQuests: (playerId, token) => request(`/api/player/${playerId}/quests/active`, { token }),
  acceptQuest: (playerId, questId, token) =>
    request(`/api/player/${playerId}/quests/${questId}/accept`, { method: 'POST', token }),
  completeQuest: (playerId, questId, token) =>
    request(`/api/player/${playerId}/quests/${questId}/complete`, { method: 'POST', token }),
  abandonQuest: (playerId, questId, token) =>
    request(`/api/player/${playerId}/quests/${questId}/abandon`, { method: 'DELETE', token }),
  // misiones por pasos: reiniciar una trabada, avisar que hablaste/llegaste/examinaste y los NPCs movidos
  resetQuest: (playerId, questId, token) =>
    request(`/api/player/${playerId}/quests/${questId}/reset`, { method: 'POST', token }),
  questInteract: (playerId, kind, target, token) =>
    request(`/api/player/${playerId}/quests/interact`, { method: 'POST', body: { kind, target }, token }),
  getQuestNpcSpots: (playerId, token) => request(`/api/player/${playerId}/quests/npc-spots`, { token }),
  getCompletedQuests: (playerId, token) => request(`/api/player/${playerId}/quests/completed`, { token }),
  getEvolutions: (playerId, token) => request(`/api/player/${playerId}/evolutions`, { token }),
  evolve: (playerId, evolutionId, token) =>
    request(`/api/player/${playerId}/evolve`, { method: 'POST', body: { evolutionId }, token }),
  getEnchantInfo: (playerId, token) => request(`/api/player/${playerId}/enchant/info`, { token }),
  enchant: (playerId, slot, useCrystal, token) =>
    request(`/api/player/${playerId}/enchant`, { method: 'POST', body: { slot, useCrystal }, token }),
  getEnchantNpcInfo: (playerId, npcId, token) =>
    request(`/api/player/${playerId}/enchant/npc/${npcId}/info`, { token }),
  enchantNpc: (playerId, npcId, slot, token) =>
    request(`/api/player/${playerId}/enchant/npc/${npcId}`, { method: 'POST', body: { slot }, token }),
  getArtisanShop: (playerId, token) => request(`/api/player/${playerId}/artisan-shop`, { token }),
  buyArtisanItem: (playerId, artisanCode, itemCode, quantity, token) =>
    request(`/api/player/${playerId}/artisan-shop/buy`, { method: 'POST', body: { artisanCode, itemCode, quantity }, token }),
  sellArtisanItem: (playerId, itemId, quantity, enchantLevel = 0, token) =>
    request(`/api/player/${playerId}/artisan-shop/sell`, { method: 'POST', body: { itemId, quantity, enchantLevel }, token }),
  // libro=true (Taller del mundo): también las de pergamino con candado y las básicas por descubrir
  getCraftAvailable: (playerId, token, libro = false) => request(`/api/player/${playerId}/craft/available${libro ? '?libro=1' : ''}`, { token }),
  getCraftNovedades: (playerId, token) => request(`/api/player/${playerId}/craft/novedades`, { token }),
  markCraftSeen: (playerId, recipeCode, token) => request(`/api/player/${playerId}/craft/seen`, { method: 'POST', body: { recipeCode }, token }),
  craft: (playerId, recipeCode, quantity, token) =>
    request(`/api/player/${playerId}/craft`, { method: 'POST', body: { recipeCode, quantity }, token }),
  dismantle: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/dismantle`, { method: 'POST', body: { itemId, quantity }, token }),
  // comida activa ("bien alimentado"): { foodBuff: { name, text, expiresAt } | null }
  getFoodBuff: (playerId, token) => request(`/api/player/${playerId}/food-buff`, { token }),
  useItem: (playerId, itemId, token) =>
    request(`/api/player/${playerId}/use-item`, { method: 'POST', body: { itemId }, token }),
  useRecipeScroll: (playerId, itemId, token) =>
    request(`/api/player/${playerId}/inventory/use/${itemId}`, { method: 'POST', token }),
  // Mascotas
  getPets: (playerId, token) => request(`/api/player/${playerId}/pets`, { token }),
  activatePet: (playerId, playerPetId, token) =>
    request(`/api/player/${playerId}/pets/${playerPetId}/activate`, { method: 'POST', token }),
  deactivatePet: (playerId, playerPetId, token) =>
    request(`/api/player/${playerId}/pets/${playerPetId}/deactivate`, { method: 'POST', token }),
  feedPet: (playerId, playerPetId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/pets/${playerPetId}/feed`, { method: 'POST', body: { itemId, quantity }, token }),
  getIncubator: (playerId, token) => request(`/api/player/${playerId}/pets/incubator`, { token }),
  startIncubation: (playerId, itemId, token) =>
    request(`/api/player/${playerId}/pets/incubator`, { method: 'POST', body: { itemId }, token }),
  claimIncubator: (playerId, token) =>
    request(`/api/player/${playerId}/pets/incubator/claim`, { method: 'POST', token }),
  equipItem: (playerId, itemId, enchantLevel = 0, qualityTier = 0, token) =>
    request(`/api/player/${playerId}/equip`, { method: 'POST', body: { itemId, enchantLevel, qualityTier }, token }),
  unequipItem: (playerId, slot, token) =>
    request(`/api/player/${playerId}/unequip`, { method: 'POST', body: { slot }, token }),
  getMarketListings: (playerId, token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/player/${playerId}/market/listings${qs ? `?${qs}` : ''}`, { token });
  },
  createMarketListing: (playerId, body, token) =>
    request(`/api/player/${playerId}/market/listings`, { method: 'POST', body, token }),
  cancelMarketListing: (playerId, listingId, token) =>
    request(`/api/player/${playerId}/market/listings/${listingId}`, { method: 'DELETE', token }),
  buyMarketListing: (playerId, listingId, token, quantity) =>
    request(`/api/player/${playerId}/market/listings/${listingId}/buy`, { method: 'POST', body: quantity ? { quantity } : undefined, token }),
  getMyMarketListings: (playerId, token) => request(`/api/player/${playerId}/market/mine`, { token }),
  getMarketHistory: (playerId, params, token) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/player/${playerId}/market/history?${qs}`, { token });
  },
  healAtGuild: (playerId, token, body = {}) =>
    request(`/api/player/${playerId}/guild/heal`, { method: 'POST', body, token }),
  getGuildSkills: (playerId, classId, token) =>
    request(`/api/player/${playerId}/guild/skills${classId ? `?classId=${classId}` : ''}`, { token }),
  learnGuildSkill: (playerId, skillId, token) =>
    request(`/api/player/${playerId}/guild/learn-skill`, { method: 'POST', body: { skillId }, token }),
  getGuildShop: (playerId, classId, token) =>
    request(`/api/player/${playerId}/guild/shop${classId ? `?classId=${classId}` : ''}`, { token }),
  buyGuildItem: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/guild/shop/buy`, { method: 'POST', body: { itemId, quantity }, token }),
  sellGuildItem: (playerId, itemId, quantity, enchantLevel = 0, token) =>
    request(`/api/player/${playerId}/guild/shop/sell`, { method: 'POST', body: { itemId, quantity, enchantLevel }, token }),
  getZoneMonsters: (zoneId) => request(`/api/zones/${zoneId}/monsters`),
  // mundo 2D: recursos para recolectar (hierbas, mineral, cofres)
  getWorldNodes: (playerId, zoneId, token) => request(`/api/player/${playerId}/world/nodes?zone=${zoneId}`, { token }),
  gatherWorldNode: (playerId, nodeId, token) => request(`/api/player/${playerId}/world/nodes/${nodeId}/gather`, { method: 'POST', token }),
  // areaLevels: rango de niveles de la subzona del mundo 2D donde empezó el combate ("3-6")
  // worldGroup: en el mundo 2D el servidor suma a los compañeros de grupo que estén cerca
  // areaMonsters: los monstruos de la zona de encuentro del mapa (el servidor arma la pelea con ellos)
  exploreZone: (zoneId, token, coopPartnerIds, leadMonsterCode, areaLevels, worldGroup = false, worldPos = null, areaMonsters = null) => {
    const body = {};
    if (areaMonsters?.length) body.areaMonsters = areaMonsters;
    if (worldPos) body.worldPos = worldPos;
    if (coopPartnerIds?.length) body.coopPartnerIds = coopPartnerIds;
    if (worldGroup) body.worldGroup = true;
    if (leadMonsterCode) body.leadMonsterCode = leadMonsterCode;
    if (areaLevels) body.areaLevels = String(areaLevels);
    return request(`/api/combat/zones/${zoneId}/explore`, {
      method: 'POST',
      body: Object.keys(body).length ? body : undefined,
      token,
    });
  },
  getZoneEncounter: (playerId, zoneId, token) =>
    request(`/api/player/${playerId}/zones/${zoneId}/encounter`, { token }),
  resolveMasterEncounter: (playerId, token) =>
    request(`/api/player/${playerId}/master-encounter/resolve`, { method: 'POST', token }),
  createCombatSession: (monsters, token) =>
    request('/api/combat/sessions', { method: 'POST', body: { monsters }, token }),
  sendCombatAction: (sessionId, payload, token) =>
    request(`/api/combat/sessions/${sessionId}/action`, { method: 'POST', body: payload, token }),
  getCombatSession: (sessionId, token) => request(`/api/combat/sessions/${sessionId}`, { token }),
  // modo espectador: el combate abierto de otro jugador y, mientras lo miras, su estado
  // refuerzos: entrar al combate ya empezado de un compañero de grupo
  reinforceCombat: (targetId, token) => request(`/api/combat/reinforce/${targetId}`, { method: 'POST', token }),
  // taller: ¿estás junto a una forja / al Pilar de Aethra? (barato, se pregunta seguido)
  getCraftStations: (playerId, token) => request(`/api/player/${playerId}/craft/stations`, { token }),
  watchCombat: (targetId, token) => request(`/api/combat/watch/${targetId}`, { token }),
  watchSession: (sessionId, token) => request(`/api/combat/watch/session/${sessionId}`, { token }),
  // caíste en un combate de grupo que sigue: sales de él y despiertas en tu refugio
  leaveFallenCombat: (sessionId, token) => request(`/api/combat/sessions/${sessionId}/leave-fallen`, { method: 'POST', token }),
  getActiveCombatSession: (token) => request('/api/combat/sessions/active', { token }),
  // Party / NPCs
  getNpcStats: (playerId, npcId, token) => request(`/api/player/${playerId}/npcs/${npcId}`, { token }),
  getNpcEquipment: (playerId, npcId, token) => request(`/api/player/${playerId}/npcs/${npcId}/equip`, { token }),
  equipNpcItem: (playerId, npcId, itemId, enchantLevel = 0, qualityTier = 0, token) =>
    request(`/api/player/${playerId}/npcs/${npcId}/equip`, { method: 'POST', body: { itemId, enchantLevel, qualityTier }, token }),
  unequipNpcItem: (playerId, npcId, slot, token) =>
    request(`/api/player/${playerId}/npcs/${npcId}/equip/${slot}`, { method: 'DELETE', token }),
  getNpcSkills: (playerId, npcId, token) => request(`/api/player/${playerId}/npcs/${npcId}/skills`, { token }),
  getParty: (playerId, token) => request(`/api/player/${playerId}/party`, { token }),
  getPartyPool: (playerId, token) => request(`/api/player/${playerId}/party/pool`, { token }),
  refreshPartyPool: (playerId, token) =>
    request(`/api/player/${playerId}/party/pool/refresh`, { method: 'POST', token }),
  hireNpc: (playerId, poolNpcId, token) =>
    request(`/api/player/${playerId}/party/hire/${poolNpcId}`, { method: 'POST', token }),
  getBench: (playerId, token) => request(`/api/player/${playerId}/bench`, { token }),
  swapPartySlots: (playerId, slotA, slotB, token) =>
    request(`/api/player/${playerId}/party/swap`, { method: 'POST', body: { slotA, slotB }, token }),
  swapPartyBench: (playerId, partyRowId, benchRowId, token) =>
    request(`/api/player/${playerId}/party/swap-bench`, { method: 'POST', body: { partyRowId, benchRowId }, token }),
  addBenchToParty: (playerId, benchRowId, token) =>
    request(`/api/player/${playerId}/party/add-from-bench`, { method: 'POST', body: { benchRowId }, token }),
  sendPartyToBench: (playerId, partyRowId, token) =>
    request(`/api/player/${playerId}/party/bench`, { method: 'POST', body: { partyRowId }, token }),
  fireBenchNpc: (playerId, benchRowId, token) =>
    request(`/api/player/${playerId}/bench/${benchRowId}`, { method: 'DELETE', token }),
  firePartyNpc: (playerId, partyRowId, token) =>
    request(`/api/player/${playerId}/party/${partyRowId}`, { method: 'DELETE', token }),
  // Amigos
  getFriends: (playerId, token) => request(`/api/player/${playerId}/friends`, { token }),
  getFriendRequests: (playerId, token) => request(`/api/player/${playerId}/friends/requests`, { token }),
  searchPlayers: (playerId, q, token) =>
    request(`/api/player/${playerId}/friends/search?q=${encodeURIComponent(q)}`, { token }),
  sendFriendRequest: (playerId, targetId, token) =>
    request(`/api/player/${playerId}/friends`, { method: 'POST', body: { targetId }, token }),
  acceptFriendRequest: (playerId, targetId, token) =>
    request(`/api/player/${playerId}/friends/${targetId}/accept`, { method: 'POST', token }),
  removeFriend: (playerId, targetId, token) =>
    request(`/api/player/${playerId}/friends/${targetId}`, { method: 'DELETE', token }),
  // Aurelia: ofrenda al Pilar de Aethra, libro de visitas de la posada y diligencia
  getOfrenda: (playerId, token) => request(`/api/player/${playerId}/world/ofrenda`, { token }),
  makeOfrenda: (playerId, token) => request(`/api/player/${playerId}/world/ofrenda`, { method: 'POST', token }),
  getLibro: (playerId, token) => request(`/api/player/${playerId}/world/libro`, { token }),
  writeLibro: (playerId, text, token) => request(`/api/player/${playerId}/world/libro`, { method: 'POST', body: { text }, token }),
  getEventos: () => request('/api/world/eventos'),
  getAmbulante: (playerId, token) => request(`/api/player/${playerId}/world/ambulante`, { token }),
  comprarAmbulante: (playerId, oferta, token) => request(`/api/player/${playerId}/world/ambulante/comprar`, { method: 'POST', body: { oferta }, token }),
  getMapa: (playerId, token) => request(`/api/player/${playerId}/world/mapa`, { token }),
  guardarCeldas: (playerId, zona, celdas, token) => request(`/api/player/${playerId}/world/mapa/celdas`, { method: 'POST', body: { zona, celdas }, token }),
  descubrirSubzona: (playerId, zona, subzona, token) => request(`/api/player/${playerId}/world/mapa/descubrir`, { method: 'POST', body: { zona, subzona }, token }),
  abrirSecreto: (playerId, id, token) => request(`/api/player/${playerId}/world/secreto`, { method: 'POST', body: { id }, token }),
  getGuia: (playerId, token) => request(`/api/player/${playerId}/world/guia`, { token }),
  avanzarGuia: (playerId, paso, token) => request(`/api/player/${playerId}/world/guia/avanzar`, { method: 'POST', body: { paso }, token }),
  saltarGuia: (playerId, token) => request(`/api/player/${playerId}/world/guia/saltar`, { method: 'POST', token }),
  revive: (playerId, token) => request(`/api/player/${playerId}/world/revivir`, { method: 'POST', token }),
  travel: (playerId, destino, token) => request(`/api/player/${playerId}/world/viaje`, { method: 'POST', body: { destino }, token }),
  // vagonetas de las Montañas y los rayos de la tormenta (gprback/lib/tormenta.js)
  vagoneta: (playerId, destino, token) => request(`/api/player/${playerId}/world/vagoneta`, { method: 'POST', body: { destino }, token }),
  rayo: (playerId, token) => request(`/api/player/${playerId}/world/rayo`, { method: 'POST', token }),
  // balsas de los Ríos de Lava y la lluvia de brasas del Volcán (gprback/lib/brasas.js)
  balsa: (playerId, destino, token) => request(`/api/player/${playerId}/world/balsa`, { method: 'POST', body: { destino }, token }),
  brasa: (playerId, token) => request(`/api/player/${playerId}/world/brasa`, { method: 'POST', token }),
  getPiedra: (playerId, token) => request(`/api/player/${playerId}/world/piedra`, { token }),
  // muñecos de venta (puestos de jugador en el Barrio del Mercado de Aurelia)
  getPuestos: (playerId, zona, token) => request(`/api/player/${playerId}/puestos?zona=${zona}`, { token }),
  getMiPuesto: (playerId, token) => request(`/api/player/${playerId}/puestos/mio`, { token }),
  getPuesto: (playerId, stallId, token) => request(`/api/player/${playerId}/puestos/${stallId}`, { token }),
  abrirPuesto: (playerId, body, token) => request(`/api/player/${playerId}/puestos`, { method: 'POST', body, token }),
  cerrarPuesto: (playerId, token) => request(`/api/player/${playerId}/puestos/cerrar`, { method: 'POST', token }),
  comprarEnPuesto: (playerId, stallId, entryId, quantity, token) =>
    request(`/api/player/${playerId}/puestos/${stallId}/comprar`, { method: 'POST', body: { entryId, quantity }, token }),
  comprarMuneco: (playerId, token) => request(`/api/player/${playerId}/puestos/muneco/comprar`, { method: 'POST', token }),
  vincularPiedra: (playerId, vinculo, token) => request(`/api/player/${playerId}/world/piedra/vincular`, { method: 'POST', body: { vinculo }, token }),
  usarPiedra: (playerId, token) => request(`/api/player/${playerId}/world/piedra/usar`, { method: 'POST', token }),
  // Colección del cazador (tecla K): bestiario, amuletos, cartas y jefe mítico
  getBestiario: (playerId, token) => request(`/api/player/${playerId}/coleccion/bestiario`, { token }),
  buyAmuleto: (playerId, code, token) => request(`/api/player/${playerId}/coleccion/amuleto`, { method: 'POST', body: { code }, token }),
  getCartas: (playerId, token) => request(`/api/player/${playerId}/coleccion/cartas`, { token }),
  socketCarta: (playerId, slot, monsterId, token) => request(`/api/player/${playerId}/coleccion/cartas/engarzar`, { method: 'POST', body: { slot, monsterId }, token }),
  unsocketCarta: (playerId, slot, token) => request(`/api/player/${playerId}/coleccion/cartas/quitar`, { method: 'POST', body: { slot }, token }),
  getMitico: () => request('/api/world/mitico'),
  getCazadores: () => request('/api/world/cazadores'),
  getMiticoAporte: (playerId, token) => request(`/api/player/${playerId}/coleccion/mitico/aporte`, { token }),
  // La Cripta del Vigía (gprback/routes/cripta.js)
  // mazmorras del mundo 2D (Cripta del Vigía, Mina Profunda): dir = carpeta de la zona
  getMazmorra: (playerId, dir, token) => request(`/api/player/${playerId}/world/${dir}`, { token }),
  encenderBrasero: (playerId, orden, token, dir = 'cripta') => request(`/api/player/${playerId}/world/${dir}/brasero`, { method: 'POST', body: { orden }, token }),
  combateMazmorra: (playerId, dir, objetivo, token) => request(`/api/player/${playerId}/world/${dir}/combate`, { method: 'POST', body: { objetivo }, token }),
  getCripta: (playerId, token) => request(`/api/player/${playerId}/world/cripta`, { token }),
  combateCripta: (playerId, objetivo, token) => request(`/api/player/${playerId}/world/cripta/combate`, { method: 'POST', body: { objetivo }, token }),
  enterMitico: (playerId, token) => request(`/api/player/${playerId}/coleccion/mitico/enter`, { method: 'POST', token }),
  // Ventana Social del mundo 2D (tecla O)
  getSocialOverview: (playerId, token) => request(`/api/player/${playerId}/social/overview`, { token }),
  setSocialStatus: (playerId, text, token) => request(`/api/player/${playerId}/social/status`, { method: 'PUT', body: { text }, token }),
  setFriendNote: (playerId, friendId, data, token) => request(`/api/player/${playerId}/social/friends/${friendId}`, { method: 'PUT', body: data, token }),
  commendPlayer: (playerId, targetId, kind, token) => request(`/api/player/${playerId}/social/commend`, { method: 'POST', body: { targetId, kind }, token }),
  getPlayerCard: (playerId, targetId, token) => request(`/api/player/${playerId}/social/card/${targetId}`, { token }),
  // Mensajes
  getUnreadCount: (playerId, token) => request(`/api/player/${playerId}/messages/unread-count`, { token }),
  getDailyReward: (playerId, token) => request(`/api/player/${playerId}/daily-reward`, { token }),
  claimDailyReward: (playerId, token) =>
    request(`/api/player/${playerId}/daily-reward/claim`, { method: 'POST', token }),
  getDailyEvent: (playerId, token) => request(`/api/player/${playerId}/daily-event`, { token }),
  enterDailyEvent: (playerId, token) =>
    request(`/api/player/${playerId}/daily-event/enter`, { method: 'POST', token }),
  getInbox: (playerId, token) => request(`/api/player/${playerId}/messages/inbox`, { token }),
  getSentMessages: (playerId, token) => request(`/api/player/${playerId}/messages/sent`, { token }),
  getMessage: (playerId, messageId, token) => request(`/api/player/${playerId}/messages/${messageId}`, { token }),
  sendMessage: (playerId, payload, token) =>
    request(`/api/player/${playerId}/messages`, { method: 'POST', body: payload, token }),
  claimMessage: (playerId, messageId, token) =>
    request(`/api/player/${playerId}/messages/${messageId}/claim`, { method: 'POST', token }),
  deleteMessage: (playerId, messageId, token) =>
    request(`/api/player/${playerId}/messages/${messageId}`, { method: 'DELETE', token }),
  pingTyping: (playerId, toId, token) =>
    request(`/api/player/${playerId}/messages/typing`, { method: 'POST', body: { toId }, token }),
  getTypingStatus: (playerId, fromId, token) =>
    request(`/api/player/${playerId}/messages/typing?fromId=${fromId}`, { token }),
  // Co-op (grupo de 2 jugadores)
  sendCoopInvite: (playerId, friendId, token) =>
    request(`/api/player/${playerId}/coop/invite`, { method: 'POST', body: { friendId }, token }),
  getPendingCoopInvite: (playerId, token) => request(`/api/player/${playerId}/coop/invite/pending`, { token }),
  acceptCoopInvite: (playerId, inviteId, token) =>
    request(`/api/player/${playerId}/coop/invite/${inviteId}/accept`, { method: 'POST', token }),
  declineCoopInvite: (playerId, inviteId, token) =>
    request(`/api/player/${playerId}/coop/invite/${inviteId}/decline`, { method: 'POST', token }),
  getCoopParty: (playerId, token) => request(`/api/player/${playerId}/coop/party`, { token }),
  leaveCoopParty: (playerId, token) => request(`/api/player/${playerId}/coop/party`, { method: 'DELETE', token }),
  kickCoopMember: (playerId, targetId, token) =>
    request(`/api/player/${playerId}/coop/party/members/${targetId}`, { method: 'DELETE', token }),
  setCoopReady: (playerId, zoneId, token) =>
    request(`/api/player/${playerId}/coop/ready`, { method: 'POST', body: { zoneId }, token }),
  cancelCoopReady: (playerId, token) => request(`/api/player/${playerId}/coop/ready`, { method: 'DELETE', token }),
  getCoopReadyStatus: (playerId, token) => request(`/api/player/${playerId}/coop/ready-status`, { token }),
  shareQuestWithGroup: (playerId, questId, token) =>
    request(`/api/player/${playerId}/coop/share-quest`, { method: 'POST', body: { questId }, token }),
  getCoopMessages: (playerId, afterId, token) =>
    request(`/api/player/${playerId}/coop/messages${afterId ? `?afterId=${afterId}` : ''}`, { token }),
  sendCoopMessage: (playerId, body, token) =>
    request(`/api/player/${playerId}/coop/messages`, { method: 'POST', body: { body }, token }),
  // Chat global (General / Comercio / Gremio; el de Grupo usa los endpoints de coop de arriba)
  getChatMessages: (playerId, channel, afterId, token) =>
    request(`/api/player/${playerId}/chat/${channel}${afterId ? `?afterId=${afterId}` : ''}`, { token }),
  sendChatMessage: (playerId, channel, body, token) =>
    request(`/api/player/${playerId}/chat/${channel}`, { method: 'POST', body: { body }, token }),
  // Guilds
  getGuilds: (token, search) =>
    request(`/api/guilds${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token }),
  getMyGuild: (token) => request('/api/guilds/mine', { token }),
  createGuild: (token, body) => request('/api/guilds', { method: 'POST', body, token }),
  joinGuild: (token, guildId) => request(`/api/guilds/${guildId}/join`, { method: 'POST', token }),
  leaveGuild: (token, guildId) => request(`/api/guilds/${guildId}/leave`, { method: 'DELETE', token }),
  kickGuildMember: (token, guildId, targetPlayerId) =>
    request(`/api/guilds/${guildId}/kick/${targetPlayerId}`, { method: 'DELETE', token }),
  promoteGuildMember: (token, guildId, targetPlayerId, role) =>
    request(`/api/guilds/${guildId}/promote/${targetPlayerId}`, { method: 'PUT', body: { role }, token }),
  transferGuildLeadership: (token, guildId, targetPlayerId) =>
    request(`/api/guilds/${guildId}/transfer/${targetPlayerId}`, { method: 'PUT', token }),
  editGuild: (token, guildId, body) =>
    request(`/api/guilds/${guildId}`, { method: 'PUT', body, token }),
  dissolveGuild: (token, guildId) =>
    request(`/api/guilds/${guildId}`, { method: 'DELETE', token }),
  requestJoinGuild: (token, guildId) => request(`/api/guilds/${guildId}/request`, { method: 'POST', token }),
  getGuildRequests: (token, guildId) => request(`/api/guilds/${guildId}/requests`, { token }),
  acceptGuildRequest: (token, guildId, requestId) =>
    request(`/api/guilds/${guildId}/requests/${requestId}/accept`, { method: 'PUT', token }),
  rejectGuildRequest: (token, guildId, requestId) =>
    request(`/api/guilds/${guildId}/requests/${requestId}/reject`, { method: 'PUT', token }),
  getGuildActivity: (token, guildId, limit) =>
    request(`/api/guilds/${guildId}/activity${limit ? `?limit=${limit}` : ''}`, { token }),
  getGuildBank: (token, guildId) => request(`/api/guilds/${guildId}/bank`, { token }),
  getGuildContracts: (token, guildId) => request(`/api/guilds/${guildId}/contracts`, { token }),
  depositGuildBank: (token, guildId, amount) =>
    request(`/api/guilds/${guildId}/bank/deposit`, { method: 'POST', body: { amount }, token }),
  getGuildBankShop: (token, guildId) => request(`/api/guilds/${guildId}/shop`, { token }),
  getGuildMasters: (token, guildId) => request(`/api/guilds/${guildId}/masters`, { token }),
  getGuildMasterShop: (token, guildId, masterId) =>
    request(`/api/guilds/${guildId}/masters/${masterId}/shop`, { token }),
  buyGuildMasterShopItem: (token, guildId, masterId, itemId, recipientPlayerId, quantity) =>
    request(`/api/guilds/${guildId}/masters/${masterId}/buy`, { method: 'POST', body: { itemId, recipientPlayerId, quantity }, token }),
  getGuildMasterSkills: (token, guildId, masterId) =>
    request(`/api/guilds/${guildId}/masters/${masterId}/skills`, { token }),
  learnGuildMasterSkill: (token, guildId, masterId, skillId) =>
    request(`/api/guilds/${guildId}/masters/${masterId}/learn-skill`, { method: 'POST', body: { skillId }, token }),
  getGuildMasterQuests: (token, guildId, masterId) =>
    request(`/api/guilds/${guildId}/masters/${masterId}/quests`, { token }),
  buyGuildBankShopItem: (token, guildId, itemId, quantity, recipientPlayerId) =>
    request(`/api/guilds/${guildId}/shop/buy`, { method: 'POST', body: { itemId, quantity, recipientPlayerId }, token }),
  // El Abismo (el back sigue usando las rutas /tower/* sin cambios)
  startTower: (playerId, difficulty, coopPartnerIds, token) =>
    request(`/api/player/${playerId}/tower/start`, { method: 'POST', body: { difficulty, coopPartnerIds }, token }),
  getTowerRun: (playerId, token) => request(`/api/player/${playerId}/tower/run`, { token }),
  advanceTower: (playerId, token) => request(`/api/player/${playerId}/tower/advance`, { method: 'POST', token }),
  resolveTowerEvent: (playerId, choice, token) =>
    request(`/api/player/${playerId}/tower/event-choice`, { method: 'POST', body: { choice }, token }),
  buyTowerEventItem: (playerId, itemId, token) =>
    request(`/api/player/${playerId}/tower/vendor-event-buy`, { method: 'POST', body: { itemId }, token }),
  extractTower: (playerId, token) => request(`/api/player/${playerId}/tower/extract`, { method: 'POST', token }),
  getTowerVendor: (playerId, token) => request(`/api/player/${playerId}/tower/vendor`, { token }),
  buyTowerVendorItem: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/tower/vendor/buy`, { method: 'POST', body: { itemId, quantity }, token }),
  setTowerReady: (playerId, token) => request(`/api/player/${playerId}/tower/ready`, { method: 'POST', token }),
  cancelTowerReady: (playerId, token) => request(`/api/player/${playerId}/tower/ready`, { method: 'DELETE', token }),
  getTowerReadyStatus: (playerId, token) => request(`/api/player/${playerId}/tower/ready-status`, { token }),
  getTowerLeaderboard: () => request('/api/leaderboard/tower'),
  // Ciudades del Abismo (asentamientos cada 15 pisos)
  settlementHeal: (playerId, targetType, npcId, token) =>
    request(`/api/player/${playerId}/tower/settlement/heal`, { method: 'POST', body: { targetType, npcId }, token }),
  getSettlementShop: (playerId, token) => request(`/api/player/${playerId}/tower/settlement/shop`, { token }),
  buySettlementShopItem: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/tower/settlement/shop/buy`, { method: 'POST', body: { itemId, quantity }, token }),
  getSettlementNearby: (playerId, token) => request(`/api/player/${playerId}/tower/settlement/nearby`, { token }),
  inviteSettlementPlayer: (playerId, targetPlayerId, token) =>
    request(`/api/player/${playerId}/tower/settlement/invite`, { method: 'POST', body: { targetPlayerId }, token }),
  getSettlementInvitePending: (playerId, token) => request(`/api/player/${playerId}/tower/settlement/invite/pending`, { token }),
  declineSettlementInvite: (playerId, inviteId, token) =>
    request(`/api/player/${playerId}/tower/settlement/invite/${inviteId}/decline`, { method: 'POST', token }),
  acceptSettlementInvite: (playerId, inviteId, token) =>
    request(`/api/player/${playerId}/tower/settlement/invite/${inviteId}/accept`, { method: 'POST', token }),
  getTowerDiscovered: (playerId, token) => request(`/api/player/${playerId}/tower/discovered`, { token }),
  travelToCheckpoint: (playerId, floor, difficulty, coopPartnerIds, token) =>
    request(`/api/player/${playerId}/tower/travel`, { method: 'POST', body: { floor, difficulty, coopPartnerIds }, token }),
  // World Boss
  getWorldBossStatus: (token) => request('/api/worldboss/status', { token }),
  getWorldBossLeaderboard: (token) => request('/api/worldboss/leaderboard', { token }),
  enterWorldBoss: (playerId, coopPartnerIds, token) =>
    request(`/api/player/${playerId}/worldboss/enter`, { method: 'POST', body: { coopPartnerIds }, token }),
  getWorldBossShop: (playerId, token) => request(`/api/player/${playerId}/worldboss/shop`, { token }),
  getWorldBossLegendaryPets: (playerId, token) => request(`/api/player/${playerId}/worldboss/shop/legendary-pets`, { token }),
  buyWorldBossItem: (playerId, itemId, quantity, token, petId) =>
    request(`/api/player/${playerId}/worldboss/shop/buy`, { method: 'POST', body: { itemId, quantity, petId }, token }),
  setWorldBossReady: (playerId, token) => request(`/api/player/${playerId}/worldboss/ready`, { method: 'POST', token }),
  cancelWorldBossReady: (playerId, token) => request(`/api/player/${playerId}/worldboss/ready`, { method: 'DELETE', token }),
  getWorldBossReadyStatus: (playerId, token) => request(`/api/player/${playerId}/worldboss/ready-status`, { token }),
  // Admin (panel de stats de monstruos, solo jugadores con permiso — docs/backend-spec-admin-monstruos.md)
  getAdminMonsters: (token, zoneId) => request(`/api/admin/monsters${zoneId ? `?zoneId=${zoneId}` : ''}`, { token }),
  updateAdminMonsterBase: (monsterId, body, token) =>
    request(`/api/admin/monsters/${monsterId}/base`, { method: 'PATCH', body, token }),
  upsertAdminMonsterScaling: (monsterId, level, body, token) =>
    request(`/api/admin/monsters/${monsterId}/scalings/${level}`, { method: 'PUT', body, token }),
  deleteAdminMonsterScaling: (monsterId, level, token) =>
    request(`/api/admin/monsters/${monsterId}/scalings/${level}`, { method: 'DELETE', token }),
  getAdminEconomia: (token, dias = 14) => request(`/api/admin/economia?dias=${dias}`, { token }),
  getAdminItems: (token, slot) => request(`/api/admin/items${slot ? `?slot=${slot}` : ''}`, { token }),
  updateAdminItem: (itemId, body, token) =>
    request(`/api/admin/items/${itemId}`, { method: 'PATCH', body, token }),
  createAdminItemStatBonus: (itemId, body, token) =>
    request(`/api/admin/items/${itemId}/stat-bonuses`, { method: 'POST', body, token }),
  updateAdminItemStatBonus: (itemId, bonusId, body, token) =>
    request(`/api/admin/items/${itemId}/stat-bonuses/${bonusId}`, { method: 'PUT', body, token }),
  deleteAdminItemStatBonus: (itemId, bonusId, token) =>
    request(`/api/admin/items/${itemId}/stat-bonuses/${bonusId}`, { method: 'DELETE', token }),
  getAdminClassStats: (token, classId) => request(`/api/admin/class-stats${classId ? `?classId=${classId}` : ''}`, { token }),
};
