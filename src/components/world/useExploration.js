import { useEffect, useRef } from 'react';
import { api } from '../../api/client';
import bus from '../../game/bus';
import audio from '../../game/audio';

// Exploración (gprback/lib/exploracion.js, game/world/explore.js): carga lo explorado al entrar,
// guarda los cuadros nuevos que va pisando el héroe, premia cada subzona descubierta por primera
// vez y abre los cofres secretos.
export default function useExploration({ player, token, worldReady, zoneDir, subzone, onChanged }) {
  const known = useRef({}); // { zona: Set(subzonas descubiertas) }
  const pending = useRef({}); // { zona: base64 } cuadros por guardar

  useEffect(() => {
    if (!worldReady || !player) return;
    api.getMapa(player.id, token).then((d) => {
      known.current = Object.fromEntries(Object.entries(d.zones).map(([z, v]) => [z, new Set(v.subzones)]));
      bus.emit('explore-init', d);
    }).catch(() => bus.emit('explore-init', null));
  }, [worldReady, player, token]);

  // cuadros nuevos: se guardan cada 10 s (y al salir), no en cada paso
  useEffect(() => {
    if (!player) return undefined;
    const flush = () => {
      for (const [zona, celdas] of Object.entries(pending.current)) api.guardarCeldas(player.id, zona, celdas, token).catch(() => {});
      pending.current = {};
    };
    const onCells = ({ dir, cells }) => { pending.current[dir] = cells; };
    bus.on('explore-cells', onCells);
    const t = setInterval(flush, 10000);
    window.addEventListener('beforeunload', flush);
    return () => { bus.off('explore-cells', onCells); clearInterval(t); window.removeEventListener('beforeunload', flush); flush(); };
  }, [player, token]);

  // primera vez en una subzona: XP, y premio grande al descubrir todas las de la zona
  useEffect(() => {
    const name = subzone?.name;
    if (!worldReady || !player || !zoneDir || !name) return;
    const set = known.current[zoneDir];
    if (!set || set.has(name)) return;
    set.add(name);
    api.descubrirSubzona(player.id, zoneDir, name, token).then((r) => {
      if (!r?.nuevo) return;
      audio.sfx('mision');
      bus.emit('social-toast', { text: `🗺 Descubriste ${r.subzona} (${r.found}/${r.total}) · +${r.xp} XP`, kind: 'tour' });
      if (r.completa) {
        setTimeout(() => bus.emit('social-toast', { text: `🏅 ¡Exploraste toda ${r.completa.zona}! +${r.completa.gold} oro, +${r.completa.xp} XP`, kind: 'tour' }), 1500);
      }
      onChanged?.();
    }).catch(() => set.delete(name));
  }, [worldReady, player, token, zoneDir, subzone?.name, onChanged]);

  // cofres secretos
  useEffect(() => {
    if (!player) return undefined;
    const onOpen = (id) => {
      api.abrirSecreto(player.id, id, token).then((r) => {
        audio.sfx('cofre');
        bus.emit('secret-opened', id);
        bus.emit('social-toast', { text: `✨ ${r.name}: +${r.gold} oro, +${r.xp} XP${r.card ? ` y la Carta de ${r.card.name}` : ''}`, kind: 'tour' });
        onChanged?.();
      }).catch((e) => bus.emit('social-toast', { text: e.message, kind: 'error' }));
    };
    bus.on('secret-open', onOpen);
    return () => bus.off('secret-open', onOpen);
  }, [player, token, onChanged]);
}
