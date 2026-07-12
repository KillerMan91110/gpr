import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import QuestObjectives from '../components/QuestObjectives';

const RARITY_LABELS = {
  COMUN: 'Común',
  POCO_COMUN: 'Poco Común',
  RARO: 'Raro',
  EPICO: 'Épico',
  LEGENDARIO: 'Legendario',
};

function rarityClass(rarity) {
  return `rarity-${(rarity || 'comun').toLowerCase()}`;
}

// Mismas etiquetas/colores que ya usa Skills.js para las skills del propio jugador — se
// reusan acá para que una skill se vea igual sin importar si la mirás desde tu lista o
// desde el maestro que la enseña.
const TYPE_LABELS = {
  PASIVA: 'Pasiva', ATAQUE: 'Ataque', CURACION: 'Curación',
  BUFF: 'Buff', DEBUFF: 'Debuff', ESPECIAL: 'Especial', ESTADO_ALTERADO: 'Estado',
};
const TYPE_CSS = {
  PASIVA: 'skill-type--passive', ATAQUE: 'skill-type--attack', CURACION: 'skill-type--heal',
  BUFF: 'skill-type--buff', DEBUFF: 'skill-type--debuff', ESPECIAL: 'skill-type--special',
  ESTADO_ALTERADO: 'skill-type--status',
};
const TARGET_LABELS = {
  SELF: 'Uno mismo', SINGLE_ENEMY: 'Un enemigo', ALL_ENEMIES: 'Todos los enemigos',
  SINGLE_ALLY: 'Un aliado', ALL_ALLIES: 'Todos los aliados',
};
const SCHOOL_LABELS = { PHYSICAL: 'Físico', MAGICAL: 'Mágico' };

export default function GuildMasterDetail() {
  const { classId } = useParams();
  const { player, token } = useAuth();
  const [classInfo, setClassInfo] = useState(null);
  const [tab, setTab] = useState('skills');
  const [data, setData] = useState(null);
  const [shop, setShop] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [quests, setQuests] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    return Promise.all([
      api.getClasses(),
      api.getGuildSkills(player.id, classId, token),
      api.getGuildShop(player.id, classId, token),
      api.getPlayerInventory(player.id, token),
      api.getAvailableQuests(player.id, token),
    ]).then(([allClasses, skillsData, shopData, inventoryData, questsData]) => {
      setClassInfo(allClasses.find((c) => String(c.id) === String(classId)) || null);
      setData(skillsData);
      setShop(shopData);
      setInventory(inventoryData);
      setQuests(questsData);
    });
  }

  useEffect(() => {
    if (!player) return;
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, token, classId]);

  async function handleLearn(skillId) {
    setError('');
    setMessage('');
    setBusyId(skillId);
    try {
      const result = await api.learnGuildSkill(player.id, skillId, token);
      setMessage(`Aprendiste ${result.name} por ${result.cost} de oro.`);
      await load();
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
      setMessage(`Aceptaste "${quest.name}". Mirala en 📜 Quests, en el dashboard.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleBuy(itemId) {
    setError('');
    setMessage('');
    setBusyId(`buy-${itemId}`);
    try {
      const result = await api.buyGuildItem(player.id, itemId, token);
      setMessage(`Compraste ${result.name} por ${result.cost} de oro.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSell(itemId, quantity, enchantLevel = 0) {
    setError('');
    setMessage('');
    const cardKey = `${itemId}-${enchantLevel}`;
    setBusyId(`sell-${cardKey}`);
    try {
      const result = await api.sellGuildItem(player.id, itemId, quantity, enchantLevel, token);
      setMessage(`Vendiste ${result.name} x${result.quantitySold} por ${result.goldGained} de oro.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !data) return <div className="dashboard-error">Error: {error}</div>;
  if (!data || !classInfo || !shop || !inventory || !quests) {
    return <div className="dashboard-loading">Cargando...</div>;
  }

  const exclusiveQuests = quests.filter((q) => String(q.required_class_id) === String(classId));
  const sellableItems = inventory.filter((i) => i.item_type === 'EQUIPMENT');

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>🎓 Maestro {classInfo.name}</h1>
          <p className="dashboard-subtitle">
            {data.isOwnClass
              ? `Tu maestro de clase. Tenés ${data.gold} de oro.`
              : `Tienda de ${classInfo.name}. Podés comprar para tus contratados. Tenés ${data.gold} de oro.`}
          </p>
        </div>
        <Link className="logout-btn" to="/guild/masters">
          Volver
        </Link>
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
          {data.skills.map((s) => {
            const disabled = !data.isOwnClass || s.learned || s.locked || s.affordable === false || busyId === s.id;
            const isPassive = s.skillType === 'PASIVA';
            return (
              <div key={s.id} className={`rpg-panel skill-card${s.learned ? '' : ' skill-card--unlearned'}`}>
                <div className="skill-card-header">
                  <span className="skill-name">{s.name}</span>
                  {s.skillType && (
                    <span className={`skill-type-badge ${TYPE_CSS[s.skillType] || ''}`}>
                      {TYPE_LABELS[s.skillType] || s.skillType}
                    </span>
                  )}
                </div>

                <div className="skill-meta">
                  <span className="skill-unlock-hint">
                    {s.learnMethod === 'GOLD' ? `Costo: ${s.goldCost} de oro` : s.requirementText || 'Requiere misión'}
                  </span>
                  {!isPassive && s.manaCost > 0 && (
                    <span className="skill-stat-chip">{s.manaCost} maná</span>
                  )}
                  {!isPassive && s.targetType && (
                    <span className="skill-stat-chip">{TARGET_LABELS[s.targetType] || s.targetType}</span>
                  )}
                  {!isPassive && s.damageSchool && (
                    <span className="skill-stat-chip">{SCHOOL_LABELS[s.damageSchool] || s.damageSchool}</span>
                  )}
                  {!isPassive && s.hits > 1 && (
                    <span className="skill-stat-chip">{s.hits} golpes</span>
                  )}
                </div>

                {s.description && <p className="skill-description">{s.description}</p>}

                {s.learned ? (
                  <p className="hint hint-ok">✓ Ya aprendida</p>
                ) : !data.isOwnClass ? (
                  <p className="auth-error">No es tu clase</p>
                ) : s.locked ? (
                  <p className="auth-error">Bloqueada</p>
                ) : (
                  <button className="rpg-button" disabled={disabled} onClick={() => handleLearn(s.id)}>
                    {busyId === s.id ? 'Aprendiendo...' : s.learnMethod === 'GOLD' ? 'Aprender' : 'Completar misión'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'quests' && (
        <div className="zone-list">
          {exclusiveQuests.length === 0 && (
            <p className="dashboard-subtitle">
              Este maestro no tiene misiones para vos por ahora. Aparecen solo bajo ciertas condiciones de nivel y rango.
            </p>
          )}
          {exclusiveQuests.map((q) => (
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
                {q.is_repeatable ? ' · 🔁 Repetible' : ' · Única vez'}
              </p>
              <QuestObjectives objectives={q.objectives} />
              {q.accepted ? (
                <p className="hint hint-ok">Ya aceptada</p>
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
        <>
          <section className="inventory-group">
            <h2>Set básico de {classInfo.name}</h2>
            <div className="item-grid">
              {shop.items.map((i) => (
                <div key={i.id} className={`rpg-panel inventory-item ${rarityClass(i.rarity)}`}>
                  <div className="inventory-item-header">
                    <span className="inventory-item-name">{i.name}</span>
                    <span className="inventory-item-qty">{i.buyPrice} 🪙</span>
                  </div>
                  <span className="inventory-item-rarity">{RARITY_LABELS[i.rarity] || i.rarity}</span>
                  {i.requiredLevel && <span className="inventory-item-level">Nivel mín. {i.requiredLevel}</span>}
                  <button
                    className="rpg-button equipment-action"
                    disabled={busyId === `buy-${i.id}` || !i.affordable}
                    onClick={() => handleBuy(i.id)}
                    title={i.affordable ? undefined : 'No tenés suficiente oro'}
                  >
                    {busyId === `buy-${i.id}` ? 'Comprando...' : 'Comprar'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="inventory-group">
            <h2>Vender equipo sin usar</h2>
            {sellableItems.length === 0 && <p className="dashboard-subtitle">No tenés equipo sin usar para vender.</p>}
            <div className="item-grid">
              {sellableItems.map((i) => {
                const enchantLevel = i.enchant_level ?? 0;
                const cardKey = `${i.item_id}-${enchantLevel}`;
                return (
                  <div key={cardKey} className={`rpg-panel inventory-item ${rarityClass(i.rarity)}`}>
                    <div className="inventory-item-header">
                      <span className="inventory-item-name">
                        {i.name}
                        {enchantLevel > 0 && <span className="enchant-badge">+{enchantLevel}</span>}
                      </span>
                      <span className="inventory-item-qty">x{i.quantity}</span>
                    </div>
                    <span className="inventory-item-rarity">{RARITY_LABELS[i.rarity] || i.rarity}</span>
                    <button
                      className="rpg-button equipment-action"
                      disabled={busyId === `sell-${cardKey}`}
                      onClick={() => handleSell(i.item_id, 1, enchantLevel)}
                    >
                      {busyId === `sell-${cardKey}` ? 'Vendiendo...' : 'Vender x1'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
