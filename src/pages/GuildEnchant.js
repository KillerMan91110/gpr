import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GameIcon from '../components/GameIcon';

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
  const [crystalQty, setCrystalQty] = useState(0);
  const [majorCrystalQty, setMajorCrystalQty] = useState(0);
  const [useCrystal, setUseCrystal] = useState(false);

  const partyNpcs = party?.members?.filter((m) => !m.isHero) || [];
  const slot2Npc = partyNpcs.find((n) => n.slot === 2) || null;
  const slot3Npc = partyNpcs.find((n) => n.slot === 3) || null;

  // El back prioriza el Cristal Mayor sobre el regular si el jugador tiene los dos (ver
  // POST /:playerId/enchant) — el front tiene que reflejar el mismo bonus que realmente se va a
  // aplicar, no siempre +15.
  const hasAnyCrystal = crystalQty > 0 || majorCrystalQty > 0;
  const activeCrystalBonus = majorCrystalQty > 0 ? 30 : crystalQty > 0 ? 15 : 0;
  const activeCrystalName = majorCrystalQty > 0 ? 'Cristal de Estabilidad Mayor' : 'Cristal de Estabilidad';

  useEffect(() => {
    if (!player) return;
    api.getParty(player.id, token).then(setParty).catch(() => setParty(null));
    api.getPlayerInventory(player.id, token)
      .then((inv) => {
        setCrystalQty(inv.find((i) => i.code === 'CRISTAL_ESTABILIDAD')?.quantity || 0);
        setMajorCrystalQty(inv.find((i) => i.code === 'CRISTAL_ESTABILIDAD_MAYOR')?.quantity || 0);
      })
      .catch(() => { setCrystalQty(0); setMajorCrystalQty(0); });
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
        : await api.enchant(player.id, slot, useCrystal, token);
      setMessage(result.message);
      const data = npc
        ? await api.getEnchantNpcInfo(player.id, npc.npcId, token)
        : await api.getEnchantInfo(player.id, token);
      setSlots(data);
      if (!npc && useCrystal) {
        if (majorCrystalQty > 0) setMajorCrystalQty((q) => Math.max(0, q - 1));
        else setCrystalQty((q) => Math.max(0, q - 1));
        setUseCrystal(false);
      }
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
          <h1><GameIcon name="magic-swirl" artist="lorc" /> Encantador</h1>
          <p className="dashboard-subtitle">Mejora el equipo equipado con piedras de encantamiento.</p>
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
              : <><Link to="/inventory">Equipa items desde el inventario</Link> para poder encantar.</>
            }
          </p>
        </div>
      )}

      {slots && slots.length > 0 && !activeNpc && hasAnyCrystal && (
        <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={useCrystal} onChange={(e) => setUseCrystal(e.target.checked)} />
          Usar {activeCrystalName} (+{activeCrystalBonus}% de éxito, se consume en el intento
          {majorCrystalQty > 0 && crystalQty > 0 ? ` — tienes ${majorCrystalQty} Mayor y ${crystalQty} normal` : ` — tienes ${majorCrystalQty > 0 ? majorCrystalQty : crystalQty}`})
        </label>
      )}

      {slots && slots.length > 0 && (
        <div className="zone-list">
          {slots.map((s) => {
            const boosted = !activeNpc && useCrystal && s.nextCost;
            const effectiveRate = boosted ? Math.min(100, s.nextCost.successRate + activeCrystalBonus) : s.nextCost?.successRate;
            return (
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
                      · {effectiveRate}% de éxito{boosted ? ' (con cristal)' : ''}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
