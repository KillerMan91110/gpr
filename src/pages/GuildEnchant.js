import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const SLOT_LABEL = {
  WEAPON: 'Arma', OFFHAND: 'Mano izquierda', HELMET: 'Casco',
  ARMOR: 'Pechera', GLOVES: 'Guantes', BOOTS: 'Botas', ACCESSORY: 'Accesorio',
};

export default function GuildEnchant() {
  const { player, token } = useAuth();
  const [party, setParty] = useState(null);
  const [activeMember, setActiveMember] = useState(0); // 0 = héroe, 1 = slot2, 2 = slot3
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [enchanting, setEnchanting] = useState(null);

  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];
  const slot2Npc = partyNpcs.find((n) => n.slot === 2) || null;
  const slot3Npc = partyNpcs.find((n) => n.slot === 3) || null;

  useEffect(() => {
    if (!player) return;
    api.getParty(player.id, token).then(setParty).catch(() => setParty(null));
  }, [player, token]);

  useEffect(() => {
    if (!player || !party) return;
    setSlots(null);
    const npc = activeMember === 1 ? slot2Npc : activeMember === 2 ? slot3Npc : null;
    const promise = npc
      ? api.getEnchantNpcInfo(player.id, npc.npcId, token)
      : api.getEnchantInfo(player.id, token);
    promise.then(setSlots).catch((err) => setError(err.message));
  }, [player, token, party, activeMember]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEnchant(slot) {
    setError('');
    setMessage('');
    setEnchanting(slot);
    const npc = activeMember === 1 ? slot2Npc : activeMember === 2 ? slot3Npc : null;
    try {
      const result = npc
        ? await api.enchantNpc(player.id, npc.npcId, slot, token)
        : await api.enchant(player.id, slot, token);
      setMessage(result.message);
      const data = npc
        ? await api.getEnchantNpcInfo(player.id, npc.npcId, token)
        : await api.getEnchantInfo(player.id, token);
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnchanting(null);
    }
  }

  function switchMember(idx) {
    setActiveMember(idx);
    setMessage('');
    setError('');
  }

  if (!party) return <div className="dashboard-loading">Cargando...</div>;

  const activeNpc = activeMember === 1 ? slot2Npc : activeMember === 2 ? slot3Npc : null;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>✦ Encantador</h1>
          <p className="dashboard-subtitle">Mejorá el equipo equipado con piedras de encantamiento.</p>
        </div>
        <Link className="logout-btn" to="/guild">Volver</Link>
      </header>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="hint hint-ok infirmary-message">{message}</p>}

      <div className="hero-switcher" style={{ marginBottom: 16 }}>
        <button
          className={`switcher-btn${activeMember === 0 ? ' switcher-btn--active' : ''}`}
          onClick={() => switchMember(0)}
        >
          Héroe
        </button>
        <button
          className={`switcher-btn${activeMember === 1 ? ' switcher-btn--active' : ''}`}
          onClick={() => switchMember(1)}
          disabled={!slot2Npc}
        >
          {slot2Npc ? slot2Npc.name : 'Slot 2'}
        </button>
        <button
          className={`switcher-btn${activeMember === 2 ? ' switcher-btn--active' : ''}`}
          onClick={() => switchMember(2)}
          disabled={!slot3Npc}
        >
          {slot3Npc ? slot3Npc.name : 'Slot 3'}
        </button>
      </div>

      {!slots && <div className="dashboard-loading">Cargando...</div>}

      {slots && slots.length === 0 && (
        <div className="rpg-panel">
          <p className="hint">
            {activeNpc
              ? `${activeNpc.name} no tiene ningún equipo puesto.`
              : <><Link to="/inventory">Equipá items desde el inventario</Link> para poder encantar.</>
            }
          </p>
        </div>
      )}

      {slots && slots.length > 0 && (
        <div className="zone-list">
          {slots.map((s) => (
            <div key={s.slot} className="zone-card rpg-panel">
              <div className="zone-card-header">
                <h3>{SLOT_LABEL[s.slot] || s.slot}</h3>
                <span className="hint enchant-level">+{s.enchantLevel}</span>
              </div>
              <p className="zone-description">{s.itemName}</p>
              <div className="enchant-bar-row">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`enchant-pip${i < s.enchantLevel ? ' enchant-pip--filled' : ''}`}
                  />
                ))}
              </div>
              {s.enchantLevel >= 10 ? (
                <p className="hint hint-ok">Nivel máximo (+10) alcanzado.</p>
              ) : s.nextCost ? (
                <>
                  <p className="hint">
                    Siguiente: {s.nextCost.quantity}x {s.nextCost.stone} · {s.nextCost.gold.toLocaleString()} Oro
                    · {s.nextCost.successRate}% de éxito
                  </p>
                  <button
                    className="rpg-button"
                    disabled={enchanting === s.slot}
                    onClick={() => handleEnchant(s.slot)}
                  >
                    {enchanting === s.slot ? 'Encantando...' : `Encantar → +${s.enchantLevel + 1}`}
                  </button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
