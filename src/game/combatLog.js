// Lectura de las frases del registro de combate que traen varios objetivos (habilidades de área):
//   "X usa Y sobre A, haciéndole 12 de daño; B esquiva; C, haciéndole 30 de daño (¡Crítico!). ¡A sufre sangrado!"
//   "X usa Y y cura a A, curándole 40 HP; B, curándole 35 HP."
// Devuelve los objetivos en orden ({ name, damage, heal, crit, evaded }) o [] si la frase no es de varios.
// La lista termina en el primer punto seguido de espacio o del final (después puede venir un estado,
// como "¡A sufre sangrado!"); los puntos de "Lv.58" no cortan porque siguen con un número.
export function splitHits(description) {
  const m = (description ?? '').match(/ (?:sobre|y cura a) (.+?)\.(?=\s|$)/);
  const segs = m ? m[1].split('; ') : [];
  if (segs.length < 2) return [];
  return segs.map((seg) => {
    const dmg = seg.match(/^(.+), haciéndole (\d+) de daño( \(¡Crítico!\))?$/);
    const heal = seg.match(/^(.+), curándole (\d+) HP$/);
    const ev = seg.match(/^(.+) esquiva$/);
    const name = (dmg || heal || ev)?.[1];
    if (!name) return null;
    return { name, damage: dmg ? Number(dmg[2]) : null, heal: heal ? Number(heal[2]) : null, crit: !!dmg?.[3], evaded: !!ev };
  }).filter(Boolean);
}

// Combate nuevo: el servidor ya jugó los turnos de los enemigos que van primero (un jefe rápido puede
// abrir con una habilidad de área). La escena y la interfaz arrancan con la vida de ANTES de esos
// turnos (sumando el daño y restando la curación de cada uno), así el primer ataque se ve entero.
export function rewindState(state) {
  const parts = state?.participants ?? [];
  const logs = state?.log ?? [];
  if (!logs.length) return state;
  const delta = new Map();
  const add = (id, n) => { if (id != null && n) delta.set(id, (delta.get(id) ?? 0) + n); };
  for (const l of logs) {
    const hits = splitHits(l.description);
    if (hits.length) {
      const used = new Set();
      for (const h of hits) {
        const p = parts.find((x) => !used.has(x.id) && x.name === h.name);
        if (!p) continue;
        used.add(p.id);
        add(p.id, (h.damage ?? 0) - (h.heal ?? 0));
      }
    } else {
      add(l.target_participant_id, (Number(l.damage) || 0) - (Number(l.heal) || 0));
    }
  }
  if (!delta.size) return state;
  return {
    ...state,
    participants: parts.map((p) => (delta.has(p.id)
      ? { ...p, hp: Math.max(0, Math.min(Number(p.max_hp) || Infinity, Number(p.hp) + delta.get(p.id))) }
      : p)),
  };
}
