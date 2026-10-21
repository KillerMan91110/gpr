import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';

// Guía del aventurero (gprback/lib/guia.js): carga el paso actual y lo da por hecho cuando el
// jugador hace lo que pide. Los pasos se detectan con lo que ya pasa en el mundo:
//   tomas    → abrir el diálogo de Tomás          mochila → abrir la mochila
//   pilar    → pararse junto al Pilar (refugio)   piedra  → vincular la piedra ('guide-event')
//   puerta   → entrar a la Pradera                combate → ganar un combate ('guide-event')
//   recurso  → recoger un recurso                 aldea   → llegar a la fogata de la Aldea Espiga
//   maestro, catedral, brokk → acercarse a tu maestro, a Elenya o a Brokk (en Aurelia; el servidor
//   comprueba que estés al lado y que sea el maestro de tu clase)
export default function useGuide({ player, token, worldReady, open, dialogue, zoneDir, poi, onReward }) {
  const [guide, setGuide] = useState(null);
  const ref = useRef(null);
  ref.current = guide;
  const busy = useRef(false);
  const retry = useRef(null);

  useEffect(() => {
    if (!worldReady || !player) return;
    api.getGuia(player.id, token).then(setGuide).catch(() => {});
  }, [worldReady, player, token]);

  const advance = useCallback((id) => {
    if (ref.current?.current?.id !== id || busy.current) return;
    busy.current = true;
    clearTimeout(retry.current);
    api.avanzarGuia(player.id, id, token)
      .then((r) => {
        setGuide(r);
        if (r.reward) { audio.sfx('mision'); onReward?.(r.reward, r); return; }
        // el servidor comprueba dónde estás: si tu posición aún no le llegó, se prueba otra vez
        tries.current[id] = (tries.current[id] ?? 0) + 1;
        if (tries.current[id] <= 3) retry.current = setTimeout(() => advanceRef.current?.(id), 2500);
      })
      .catch(() => {})
      .finally(() => { busy.current = false; });
  }, [player, token, onReward]);

  const tries = useRef({});
  const advanceRef = useRef(null);
  advanceRef.current = advance;
  useEffect(() => () => clearTimeout(retry.current), []);

  const skip = useCallback(() => {
    api.saltarGuia(player.id, token).then(setGuide).catch(() => {});
  }, [player, token]);

  useEffect(() => { if (dialogue === 'tomas') advance('tomas'); }, [dialogue, advance]);
  // los pasos que el servidor comprueba por lo que ya hiciste (la piedra ya vinculada, un combate ya
  // ganado, un recurso ya recogido): apenas llegan, se dan por hechos si ya se cumplen. Antes, quien ya
  // tenía la piedra vinculada no podía avanzar: la Estatua no lo deja vincularla otra vez.
  const currentId = guide?.current?.id;
  const autoTried = useRef(null);
  useEffect(() => {
    if (!['piedra', 'combate', 'recurso'].includes(currentId) || autoTried.current === currentId) return;
    autoTried.current = currentId;
    advance(currentId);
  }, [currentId, advance]);
  // al acercarte (o hablar) con tu maestro, Elenya o Brokk
  useEffect(() => {
    const who = poi?.dialogue ?? dialogue;
    if (['aldric', 'isolde', 'sylwen', 'nox', 'anselm'].includes(who)) advance('maestro');
    if (who === 'elenya') advance('catedral');
    if (who === 'brokk') advance('brokk');
  }, [poi?.dialogue, dialogue, advance, guide]);
  useEffect(() => { if (open.includes('inventario')) advance('mochila'); }, [open, advance]);
  useEffect(() => { if (zoneDir === 'pradera') advance('puerta'); }, [zoneDir, advance, guide]);
  useEffect(() => {
    const onRefuge = (name) => {
      if (name.includes('Pilar')) advance('pilar');
      if (name.includes('Aldea Espiga')) advance('aldea');
    };
    const onGathered = () => advance('recurso');
    const onEvent = (id) => advance(id);
    bus.on('refuge-near', onRefuge);
    bus.on('resource-gathered', onGathered);
    bus.on('guide-event', onEvent);
    return () => {
      bus.off('refuge-near', onRefuge);
      bus.off('resource-gathered', onGathered);
      bus.off('guide-event', onEvent);
    };
  }, [advance]);

  return { guide, skip };
}
