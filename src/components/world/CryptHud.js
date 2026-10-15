import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import './CryptHud.css';

// La Cripta del Vigía (gprback/lib/cripta.js + game/world/cripta.js): dentro de la mazmorra
// carga el recorrido (braseros, guardianes vencidos, puerta), se lo pasa a la escena y atiende
// lo que pide el mapa: encender un brasero, mirar la puerta sellada, volver de un combate.
export function useCrypt({ player, token, worldReady, zoneDir, onChanged }) {
  const [crypt, setCrypt] = useState(null);
  const inside = worldReady && zoneDir === 'cripta';
  const load = useCallback(() => {
    if (!player) return;
    api.getCripta(player.id, token).then((st) => { setCrypt(st); bus.emit('crypt-state', st); }).catch(() => {});
  }, [player, token]);

  useEffect(() => {
    if (!inside) { setCrypt(null); return undefined; }
    load();
    const onBrazier = async (orden) => {
      try {
        const st = await api.encenderBrasero(player.id, orden, token);
        setCrypt(st);
        bus.emit('crypt-state', st);
        audio.sfx('vinculo');
        bus.emit('social-toast', { text: `Encendiste ${st.lit}. Si caes o sales, retomarás desde aquí.`, kind: 'ok' });
      } catch (err) {
        audio.sfx('error');
        bus.emit('social-toast', { text: err.message, kind: 'error' });
      }
    };
    const onDoor = () => {
      audio.sfx('error');
      bus.emit('social-toast', { text: 'Una runa de luz sella la puerta. Se abrirá cuando caigan los tres guardianes de la cripta.', kind: 'tour' });
    };
    const onRefresh = () => { load(); onChanged?.(); };
    bus.on('crypt-brazier', onBrazier);
    bus.on('crypt-door', onDoor);
    bus.on('crypt-refresh', onRefresh);
    return () => {
      bus.off('crypt-brazier', onBrazier);
      bus.off('crypt-door', onDoor);
      bus.off('crypt-refresh', onRefresh);
    };
  }, [inside, load, player, token, onChanged]);

  return crypt;
}

// Recuadro bajo el minimapa con el avance del recorrido
export function CryptTracker({ crypt }) {
  if (!crypt) return null;
  const next = crypt.cleared
    ? 'Venciste al Vigía Caído: la cripta está completada. Sal y vuelve a entrar para recorrerla otra vez.'
    : !crypt.doorOpen
    ? `Vence a los guardianes que patrullan (${crypt.guardians.length}/${crypt.totalGuardians}). Si te ven, te persiguen: muévete fuera de su luz.`
    : 'La Puerta del Vigía está abierta. Baja a la Cámara del Faro.';
  return (
    <div className="hud-crypt">
      <div className="hud-crypt-head">
        <GameIcon name="crypt-entrance" artist="delapouite" />
        <b>La Cripta del Vigía</b>
      </div>
      <div className="hud-crypt-row">
        <span className={crypt.doorOpen ? 'is-done' : ''}><GameIcon name="dungeon-gate" artist="delapouite" /> {crypt.cleared ? '✔ Completado' : `Guardianes ${crypt.guardians.length}/${crypt.totalGuardians}`}</span>
        <span><GameIcon name="lighthouse" artist="delapouite" /> {crypt.braziers ? `Brasero ${crypt.braziers}` : 'Sin brasero'}</span>
      </div>
      <p>{next}</p>
      {crypt.chestReadyAt && <small>Cofre del Vigía: ya lo abriste (vuelve a las {new Date(crypt.chestReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).</small>}
    </div>
  );
}
