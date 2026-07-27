import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

const RARITY_LABELS = {
  COMUN: 'Común',
  POCO_COMUN: 'Poco Común',
  RARO: 'Raro',
  EPICO: 'Épico',
  LEGENDARIO: 'Legendario',
  UNICO: 'Único',
};

function rarityClass(rarity) {
  return `rarity-${(rarity || 'comun').toLowerCase()}`;
}

export default function GuildEvolutionMaster() {
  const { masterId } = useParams();
  const { player, token } = useAuth();
  const [guild, setGuild] = useState(undefined);
  const [master, setMaster] = useState(null);
  const [tab, setTab] = useState('skills');
  const [skillsData, setSkillsData] = useState(null);
  const [questsData, setQuestsData] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [shopRecipient, setShopRecipient] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const g = await api.getMyGuild(token);
    setGuild(g);
    if (!g) return;
    const [mastersList, skills, quests, shop] = await Promise.all([
      api.getGuildMasters(token, g.id),
      api.getGuildMasterSkills(token, g.id, masterId),
      api.getGuildMasterQuests(token, g.id, masterId),
      api.getGuildMasterShop(token, g.id, masterId),
    ]);
    setMaster(mastersList.find((m) => String(m.id) === String(masterId)) || null);
    setSkillsData(skills);
    setQuestsData(quests);
    setShopData(shop);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, masterId]);

  async function handleLearnSkill(skillId) {
    setError('');
    setMessage('');
    setBusyId(`skill-${skillId}`);
    try {
      const result = await api.learnGuildMasterSkill(token, guild.id, masterId, skillId);
      setMessage(result.cost ? `Aprendiste ${result.name} por ${result.cost} de oro.` : `Aprendiste ${result.name}.`);
      const skills = await api.getGuildMasterSkills(token, guild.id, masterId);
      setSkillsData(skills);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAcceptQuest(quest) {
    setError('');
    setMessage('');
    setBusyId(`quest-${quest.id}`);
    try {
      await api.acceptQuest(player.id, quest.id, token);
      setMessage(`Aceptaste "${quest.name}". Mirala en Mis Quests, en el dashboard.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleBuyItem(itemId) {
    const isGift = shopData?.canGift && !shopData?.isMyClass;
    if (isGift && !shopRecipient) {
      setError('Elige a quién le compras.');
      return;
    }
    setError('');
    setMessage('');
    setBusyId(`buy-${itemId}`);
    try {
      const result = await api.buyGuildMasterShopItem(
        token, guild.id, masterId, itemId, isGift ? Number(shopRecipient) : undefined
      );
      setShopData((prev) => (prev ? { ...prev, gold: result.gold } : prev));
      setMessage('Compra realizada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !skillsData) return <div className="dashboard-error">Error: {error}</div>;
  if (guild === undefined || (guild && (!skillsData || !questsData || !shopData))) {
    return <div className="dashboard-loading">Cargando...</div>;
  }
  if (!guild) return <div className="dashboard-error">No pertenecés a ningún gremio.</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1><GameIcon name="wizard-face" artist="delapouite" /> {master?.name || 'Maestro'}</h1>
          {master?.guild_dialogue && <p className="dashboard-subtitle">"{master.guild_dialogue}"</p>}
        </div>
        <Link className="logout-btn" to="/guild/my">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="tab-bar">
        <button className={`tab-button ${tab === 'skills' ? 'active' : ''}`} onClick={() => setTab('skills')}>
          Skills
        </button>
        <button className={`tab-button ${tab === 'quests' ? 'active' : ''}`} onClick={() => setTab('quests')}>
          Quests
        </button>
        <button className={`tab-button ${tab === 'shop' ? 'active' : ''}`} onClick={() => setTab('shop')}>
          Tienda
        </button>
      </div>

      {tab === 'skills' && (
        <div className="skill-list">
          {skillsData.skills.length === 0 && (
            <div className="rpg-panel"><p className="hint">Este maestro no enseña skills todavía.</p></div>
          )}
          {skillsData.skills.map((s) => {
            const disabled = !skillsData.isMyClass || s.learned || s.locked || s.affordable === false || busyId === `skill-${s.id}`;
            return (
              <div key={s.id} className={`rpg-panel skill-card${s.learned ? '' : ' skill-card--unlearned'}`}>
                <div className="skill-card-header">
                  <span className="skill-name">{s.name}</span>
                </div>
                <div className="skill-meta">
                  <span className="skill-unlock-hint">
                    {s.learnMethod === 'GOLD' ? `Costo: ${s.goldCost} de oro` : s.requirementText || 'Requiere misión'}
                  </span>
                </div>
                {s.description && <p className="skill-description">{s.description}</p>}
                {s.learned ? (
                  <p className="hint hint-ok">✓ Ya aprendida</p>
                ) : !skillsData.isMyClass ? (
                  <p className="auth-error">No es tu clase</p>
                ) : s.locked ? (
                  <p className="auth-error">Bloqueada</p>
                ) : (
                  <button className="rpg-button" disabled={disabled} onClick={() => handleLearnSkill(s.id)}>
                    {busyId === `skill-${s.id}` ? 'Aprendiendo...' : s.learnMethod === 'GOLD' ? 'Aprender' : 'Completar misión'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'quests' && (
        <div className="zone-list">
          {questsData.quests.length === 0 && (
            <p className="dashboard-subtitle">Este maestro no tiene misiones todavía.</p>
          )}
          {questsData.quests.map((q) => (
            <div key={q.id} className="zone-card rpg-panel">
              <div className="zone-card-header">
                <h3>{q.name}</h3>
                <span className="hint">Categoría {q.min_rank_code || 'F'}</span>
              </div>
              <p className="zone-description">
                {q.zone_name || 'Sin zona'} · Nv. {q.min_level || 1}
                {q.max_level ? `-${q.max_level}` : ''}
                {q.npc_name ? ` · ${q.npc_name}` : ''}
              </p>
              {q.description && <p className="hint">{q.description}</p>}
              <p className="hint">
                +{q.xp_reward} XP · +{q.gold_reward} Oro · +{q.reputation_reward} Reputación
                {q.is_repeatable ? <> · <GameIcon name="recycle" artist="lorc" /> Repetible</> : ' · Única vez'}
              </p>
              {!questsData.isMyClass ? (
                <p className="auth-error">No es tu clase</p>
              ) : (
                <button
                  className="rpg-button"
                  disabled={busyId === `quest-${q.id}`}
                  onClick={() => handleAcceptQuest(q)}
                >
                  {busyId === `quest-${q.id}` ? 'Aceptando...' : 'Aceptar'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'shop' && (
        <section className="inventory-group">
          <h2>Tienda de {master?.name || 'este maestro'}</h2>
          <p className="dashboard-subtitle">Tu oro: {Number(shopData.gold).toLocaleString()}</p>
          {shopData.canGift && (
            <div className="guild-form-group">
              <label className="guild-form-label">
                No eres de esa clase — cómprale a un compañero que sí lo sea:
              </label>
              <select
                className="rpg-input"
                value={shopRecipient}
                onChange={(e) => setShopRecipient(e.target.value)}
              >
                <option value="">Elige a quién...</option>
                {guild.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.nickname}</option>
                ))}
              </select>
            </div>
          )}
          {shopData.shop.length === 0 ? (
            <p className="hint">Sin ítems por ahora.</p>
          ) : (
            <div className="item-grid">
              {shopData.shop.map((item) => (
                <div key={item.itemId} className={`rpg-panel inventory-item ${rarityClass(item.rarity)}`}>
                  <div className="inventory-item-header">
                    <span className="inventory-item-name">{item.name}</span>
                    <span className="inventory-item-qty">{Number(item.price).toLocaleString()} <GameIcon name="two-coins" artist="delapouite" /></span>
                  </div>
                  <span className="inventory-item-rarity">{RARITY_LABELS[item.rarity] || item.rarity}</span>
                  {item.requiredLevel && <span className="inventory-item-level">Nivel mín. {item.requiredLevel}</span>}
                  <button
                    className="rpg-button equipment-action"
                    disabled={
                      busyId === `buy-${item.itemId}` ||
                      shopData.gold < item.price ||
                      (shopData.canGift && !shopRecipient)
                    }
                    onClick={() => handleBuyItem(item.itemId)}
                    title={shopData.gold < item.price ? 'No tienes suficiente oro' : undefined}
                  >
                    {busyId === `buy-${item.itemId}` ? 'Comprando...' : 'Comprar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
