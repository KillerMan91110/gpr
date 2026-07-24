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
  getCompletedQuests: (playerId, token) => request(`/api/player/${playerId}/quests/completed`, { token }),
  getEvolutions: (playerId, token) => request(`/api/player/${playerId}/evolutions`, { token }),
  evolve: (playerId, evolutionId, token) =>
    request(`/api/player/${playerId}/evolve`, { method: 'POST', body: { evolutionId }, token }),
  getEnchantInfo: (playerId, token) => request(`/api/player/${playerId}/enchant/info`, { token }),
  enchant: (playerId, slot, token) =>
    request(`/api/player/${playerId}/enchant`, { method: 'POST', body: { slot }, token }),
  getEnchantNpcInfo: (playerId, npcId, token) =>
    request(`/api/player/${playerId}/enchant/npc/${npcId}/info`, { token }),
  enchantNpc: (playerId, npcId, slot, token) =>
    request(`/api/player/${playerId}/enchant/npc/${npcId}`, { method: 'POST', body: { slot }, token }),
  getArtisanShop: (playerId, token) => request(`/api/player/${playerId}/artisan-shop`, { token }),
  buyArtisanItem: (playerId, artisanCode, itemCode, quantity, token) =>
    request(`/api/player/${playerId}/artisan-shop/buy`, { method: 'POST', body: { artisanCode, itemCode, quantity }, token }),
  sellArtisanItem: (playerId, itemId, quantity, enchantLevel = 0, token) =>
    request(`/api/player/${playerId}/artisan-shop/sell`, { method: 'POST', body: { itemId, quantity, enchantLevel }, token }),
  getCraftAvailable: (playerId, token) => request(`/api/player/${playerId}/craft/available`, { token }),
  craft: (playerId, recipeCode, quantity, token) =>
    request(`/api/player/${playerId}/craft`, { method: 'POST', body: { recipeCode, quantity }, token }),
  dismantle: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/dismantle`, { method: 'POST', body: { itemId, quantity }, token }),
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
  createMarketListing: (playerId, itemId, enchantLevel, qualityTier, quantity, pricePerUnit, token) =>
    request(`/api/player/${playerId}/market/listings`, {
      method: 'POST',
      body: { itemId, enchantLevel, qualityTier, quantity, pricePerUnit },
      token,
    }),
  cancelMarketListing: (playerId, listingId, token) =>
    request(`/api/player/${playerId}/market/listings/${listingId}`, { method: 'DELETE', token }),
  buyMarketListing: (playerId, listingId, token) =>
    request(`/api/player/${playerId}/market/listings/${listingId}/buy`, { method: 'POST', token }),
  getMyMarketListings: (playerId, token) => request(`/api/player/${playerId}/market/mine`, { token }),
  healAtGuild: (playerId, token, body = {}) =>
    request(`/api/player/${playerId}/guild/heal`, { method: 'POST', body, token }),
  getGuildSkills: (playerId, classId, token) =>
    request(`/api/player/${playerId}/guild/skills${classId ? `?classId=${classId}` : ''}`, { token }),
  learnGuildSkill: (playerId, skillId, token) =>
    request(`/api/player/${playerId}/guild/learn-skill`, { method: 'POST', body: { skillId }, token }),
  getGuildShop: (playerId, classId, token) =>
    request(`/api/player/${playerId}/guild/shop${classId ? `?classId=${classId}` : ''}`, { token }),
  buyGuildItem: (playerId, itemId, token) =>
    request(`/api/player/${playerId}/guild/shop/buy`, { method: 'POST', body: { itemId }, token }),
  sellGuildItem: (playerId, itemId, quantity, enchantLevel = 0, token) =>
    request(`/api/player/${playerId}/guild/shop/sell`, { method: 'POST', body: { itemId, quantity, enchantLevel }, token }),
  getZoneMonsters: (zoneId) => request(`/api/zones/${zoneId}/monsters`),
  exploreZone: (zoneId, token, coopPartnerIds) =>
    request(`/api/combat/zones/${zoneId}/explore`, {
      method: 'POST',
      body: coopPartnerIds?.length ? { coopPartnerIds } : undefined,
      token,
    }),
  getZoneEncounter: (playerId, zoneId, token) =>
    request(`/api/player/${playerId}/zones/${zoneId}/encounter`, { token }),
  createCombatSession: (monsters, token) =>
    request('/api/combat/sessions', { method: 'POST', body: { monsters }, token }),
  sendCombatAction: (sessionId, payload, token) =>
    request(`/api/combat/sessions/${sessionId}/action`, { method: 'POST', body: payload, token }),
  getCombatSession: (sessionId, token) => request(`/api/combat/sessions/${sessionId}`, { token }),
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
  // Mensajes
  getUnreadCount: (playerId, token) => request(`/api/player/${playerId}/messages/unread-count`, { token }),
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
  depositGuildBank: (token, guildId, amount) =>
    request(`/api/guilds/${guildId}/bank/deposit`, { method: 'POST', body: { amount }, token }),
  getGuildBankShop: (token, guildId) => request(`/api/guilds/${guildId}/shop`, { token }),
  buyGuildBankShopItem: (token, guildId, itemId, quantity, recipientPlayerId) =>
    request(`/api/guilds/${guildId}/shop/buy`, { method: 'POST', body: { itemId, quantity, recipientPlayerId }, token }),
  // Torre infinita
  startTower: (playerId, difficulty, coopPartnerIds, token) =>
    request(`/api/player/${playerId}/tower/start`, { method: 'POST', body: { difficulty, coopPartnerIds }, token }),
  getTowerRun: (playerId, token) => request(`/api/player/${playerId}/tower/run`, { token }),
  advanceTower: (playerId, token) => request(`/api/player/${playerId}/tower/advance`, { method: 'POST', token }),
  extractTower: (playerId, token) => request(`/api/player/${playerId}/tower/extract`, { method: 'POST', token }),
  getTowerVendor: (playerId, token) => request(`/api/player/${playerId}/tower/vendor`, { token }),
  buyTowerVendorItem: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/tower/vendor/buy`, { method: 'POST', body: { itemId, quantity }, token }),
  setTowerReady: (playerId, token) => request(`/api/player/${playerId}/tower/ready`, { method: 'POST', token }),
  cancelTowerReady: (playerId, token) => request(`/api/player/${playerId}/tower/ready`, { method: 'DELETE', token }),
  getTowerReadyStatus: (playerId, token) => request(`/api/player/${playerId}/tower/ready-status`, { token }),
  getTowerLeaderboard: () => request('/api/leaderboard/tower'),
  // World Boss
  getWorldBossStatus: (token) => request('/api/worldboss/status', { token }),
  getWorldBossLeaderboard: (token) => request('/api/worldboss/leaderboard', { token }),
  enterWorldBoss: (playerId, coopPartnerIds, token) =>
    request(`/api/player/${playerId}/worldboss/enter`, { method: 'POST', body: { coopPartnerIds }, token }),
  getWorldBossShop: (playerId, token) => request(`/api/player/${playerId}/worldboss/shop`, { token }),
  buyWorldBossItem: (playerId, itemId, quantity, token) =>
    request(`/api/player/${playerId}/worldboss/shop/buy`, { method: 'POST', body: { itemId, quantity }, token }),
};
