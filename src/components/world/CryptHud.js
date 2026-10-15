import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';
import GameIcon from '../GameIcon';
import { isDungeon } from '../../game/world/shared';
import './CryptHud.css';

// Las mazmorras (la Cripta del Vigía, la Mina Profunda; gprback/lib/mazmorra.js + game/world/cripta.js):
// dentro de una carga el recorrido (braseros/faroles, guardianes vencidos, puerta), se lo pasa a la
// escena y atiende lo que pide el mapa: encender un farol, mirar la puerta cerrada, volver de un combate.
// Los nombres (de la mazmorra, el jefe, la puerta…) vienen del servidor.
export function useCrypt({ player, token, worldReady, zoneDir, onChanged }) {
  const [crypt, setCrypt] = useState(null);
  const inside = worldReady && isDungeon(zoneDir);
  const load = useCallback(() => {
    if (!player || !isDungeon(zoneDir)) return;
    api.getMazmorra(player.id, zoneDir, token).then((st) => { setCrypt(st); bus.emit('crypt-state', st); }).catch(() => {});
  }, [player, token, zoneDir]);

  useEffect(() => {
    if (!inside) { setCrypt(null); return undefined; }
    load();
    const onBrazier = async (orden) => {
      try {
        const st = await api.encenderBrasero(player.id, orden, token, zoneDir);
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
      bus.emit('social-toast', { text: crypt?.doorHint ?? 'La puerta está cerrada. Se abrirá cuando caigan los tres guardianes.', kind: 'tour' });
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
  }, [inside, load, player, token, onChanged, zoneDir, crypt?.doorHint]);

  return crypt;
}

// Recuadro bajo el minimapa con el avance del recorrido
export function CryptTracker({ crypt }) {
  if (!crypt) return null;
  const name = crypt.name ?? 'La mazmorra';
  const door = crypt.doorName ?? 'la puerta';
  const word = crypt.brazierWord ?? 'Brasero';
  const next = crypt.cleared
    ? `Venciste a ${crypt.bossName ?? 'su jefe'}: ${name.replace(/^La /, 'la ')} está completada. Sal y vuelve a entrar para recorrerla otra vez.`
    : !crypt.doorOpen
    ? `Vence a los guardianes que patrullan (${crypt.guardians.length}/${crypt.totalGuardians}). Si te ven, te persiguen: muévete fuera de su luz.`
    : `${door.charAt(0).toUpperCase()}${door.slice(1)} está abierta. Ve a enfrentar a ${crypt.bossName ?? 'su jefe'}.`;
  return (
    <div className="hud-crypt">
      <div className="hud-crypt-head">
        <GameIcon name={crypt.icon ?? 'crypt-entrance'} artist="delapouite" />
        <b>{name}</b>
      </div>
      <div className="hud-crypt-row">
        <span className={crypt.doorOpen ? 'is-done' : ''}><GameIcon name="dungeon-gate" artist="delapouite" /> {crypt.cleared ? '✔ Completado' : `Guardianes ${crypt.guardians.length}/${crypt.totalGuardians}`}</span>
        <span><GameIcon name={crypt.brazierIcon ?? 'lighthouse'} artist="delapouite" /> {crypt.braziers ? `${word} ${crypt.braziers}` : `Sin ${word.toLowerCase()}`}</span>
      </div>
      <p>{next}</p>
      {crypt.chestReadyAt && <small>{crypt.chestName ?? 'Cofre'}: ya lo abriste (vuelve a las {new Date(crypt.chestReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).</small>}
    </div>
  );
}
