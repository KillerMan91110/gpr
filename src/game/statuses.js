import { ELEMENTS } from './elements';

// Estados alterados y mejoras de combate. El back los guarda en combat_participant_buffs con un
// stat_code (DOT = veneno, NO_DAMAGE = invisibilidad, RESIST_X, IMBUE_X o la estadística que
// modifica) y los manda en participants[].effects. Aquí se traducen a nombre, ícono y color.

const STATS = {
  ATK: { name: 'Ataque', short: 'ATQ', icon: ['crossed-swords', 'lorc'] },
  DEF: { name: 'Defensa', short: 'DEF', icon: ['checked-shield', 'lorc'] },
  MAG: { name: 'Magia', short: 'MAG', icon: ['magic-swirl', 'lorc'] },
  MAGIC_DEF: { name: 'Defensa mágica', short: 'DMAG', icon: ['magic-shield', 'lorc'] },
  SPD: { name: 'Velocidad', short: 'VEL', icon: ['sprint', 'lorc'] },
  EVASION: { name: 'Evasión', short: 'EVA', icon: ['running-ninja', 'darkzaitzev'] },
  CRIT_CHANCE: { name: 'Prob. de crítico', short: 'CRIT', icon: ['eye-target', 'delapouite'] },
  CRIT_DAMAGE: { name: 'Daño crítico', short: 'DCRIT', icon: ['heavy-arrow', 'lorc'] },
  PHYSICAL_DAMAGE: { name: 'Daño físico', short: 'FÍS', icon: ['pointy-sword', 'lorc'] },
  MAGICAL_DAMAGE: { name: 'Daño mágico', short: 'MÁG', icon: ['crystal-ball', 'lorc'] },
  MAGIC_DAMAGE_DEALT: { name: 'Daño mágico', short: 'MÁG', icon: ['crystal-ball', 'lorc'] },
  ELEMENTAL_DAMAGE: { name: 'Daño elemental', short: 'ELEM', icon: ['lightning-trio', 'lorc'] },
  HEAL_BONUS: { name: 'Curación', short: 'CUR', icon: ['heart-plus', 'zeromancer'] },
  HP: { name: 'Vida', short: 'PV', icon: ['crowned-heart', 'lorc'] },
};

const BUFF = { color: '#ffd84a', hex: 0xffd84a };
const DEBUFF = { color: '#c08aff', hex: 0xa070ff };

// Un efecto del back → cómo mostrarlo. `key` agrupa los repetidos (dos venenos = un ícono).
export function describeEffect(e) {
  const code = e.code ?? '';
  const turns = e.rounds != null ? ` · ${e.rounds} ${e.rounds === 1 ? 'turno' : 'turnos'}` : '';
  const from = e.source ? ` (${e.source})` : '';

  if (code === 'DOT') {
    return {
      key: 'DOT', kind: 'debuff', name: 'Veneno', short: 'Veneno', icon: ['poison-bottle', 'lorc'], color: '#7be05a', hex: 0x5ad04a,
      detail: `Pierde ${e.amount}% de su vida máxima cada ronda${turns}${from}`,
    };
  }
  if (code === 'HOT') {
    return {
      key: 'HOT', kind: 'buff', name: 'Regeneración', short: 'Regen', icon: ['regeneration', 'sbed'], color: '#7dff9a', hex: 0x7dff9a,
      detail: `Recupera ${e.amount}% de su vida máxima cada ronda${turns}${from}`,
    };
  }
  if (code === 'NO_DAMAGE') {
    return {
      key: 'NO_DAMAGE', kind: 'buff', name: 'Invisible', short: 'Oculto', icon: ['invisible', 'delapouite'], color: '#bfe6ff', hex: 0xbfe6ff,
      detail: `No recibe daño${turns}${from}`,
    };
  }
  if (code === 'DAMAGE_TAKEN') {
    const curse = e.amount > 0;
    return {
      key: 'DAMAGE_TAKEN', kind: curse ? 'debuff' : 'buff', name: curse ? 'Maldición' : 'Protección',
      short: curse ? 'Maldito' : 'Protegido', icon: curse ? ['cursed-star', 'lorc'] : ['shield-reflect', 'lorc'],
      color: curse ? '#d070ff' : '#8fc9ff', hex: curse ? 0x9a40d0 : 0x8fc9ff,
      detail: `${curse ? 'Recibe' : 'Reduce el daño recibido en'} ${curse ? `${e.amount}% más de daño` : `${Math.abs(e.amount)}%`}${turns}${from}`,
    };
  }
  if (code === 'DEFENDING') {
    return {
      key: 'DEFENDING', kind: 'buff', name: 'Defendiendo', short: 'Defensa', icon: ['checked-shield', 'lorc'], color: '#8fc9ff', hex: 0x8fc9ff,
      detail: 'Recibe menos daño hasta su próximo turno',
    };
  }
  if (code === 'TRAP') {
    return {
      key: 'TRAP', kind: 'buff', name: 'Trampa preparada', short: 'Trampa', icon: ['spiked-armor', 'lorc'], color: '#ffc06a', hex: 0xffc06a,
      detail: 'Se activará en su próximo turno',
    };
  }
  if (code.startsWith('RESIST_')) {
    const el = ELEMENTS[code.slice(7)];
    const up = !e.debuff && e.amount >= 0;
    return {
      key: code, kind: up ? 'buff' : 'debuff', name: `${up ? 'Resistencia' : 'Vulnerable'} a ${el?.name ?? code.slice(7)}`,
      short: `${el?.name ?? ''} ${up ? '↑' : '↓'}`, icon: el?.icon ?? ['magic-shield', 'lorc'], color: el?.color ?? BUFF.color, hex: el?.hex ?? BUFF.hex,
      detail: `${up ? '+' : ''}${e.amount}% de resistencia${turns}${from}`,
    };
  }
  if (code.startsWith('IMBUE_')) {
    const el = ELEMENTS[code.slice(6)];
    return {
      key: code, kind: 'buff', name: `Arma de ${el?.name ?? code.slice(6)}`, short: el?.name ?? 'Imbuido',
      icon: el?.icon ?? ['magic-swirl', 'lorc'], color: el?.color ?? BUFF.color, hex: el?.hex ?? BUFF.hex,
      detail: `Sus ataques hacen daño de ${el?.name ?? 'elemento'}${turns}${from}`,
    };
  }
  const elementDamage = code.match(/^([A-Z]+)_DAMAGE$/);
  if (elementDamage && ELEMENTS[elementDamage[1]]) {
    const el = ELEMENTS[elementDamage[1]];
    const up = !e.debuff;
    return {
      key: code, kind: up ? 'buff' : 'debuff', name: `Daño de ${el.name}`, short: `${el.name} ${up ? '↑' : '↓'}`,
      icon: el.icon, color: el.color, hex: el.hex, detail: `${e.amount > 0 ? '+' : ''}${e.amount}${turns}${from}`,
    };
  }
  const stat = STATS[code] ?? { name: code, short: code, icon: ['upgrade', 'delapouite'] };
  // el valor ya viene con signo (negativo = reducido); el flag solo desempata el 0
  const up = e.amount > 0 || (e.amount === 0 && !e.debuff);
  return {
    key: `${code}_${up ? 'UP' : 'DOWN'}`, kind: up ? 'buff' : 'debuff', name: `${stat.name} ${up ? 'aumentado' : 'reducido'}`,
    short: `${stat.short} ${up ? '↑' : '↓'}`, icon: stat.icon, ...(up ? BUFF : DEBUFF),
    detail: `${e.amount > 0 ? '+' : ''}${e.amount} ${stat.name.toLowerCase()}${turns}${from}`,
  };
}

// Todos los estados de un combatiente (efectos del back + defensa/trampa), agrupados por key.
export function statusesOf(p) {
  if (!p || p.hp <= 0) return [];
  const raw = [...(p.effects ?? [])];
  if (p.is_defending) raw.push({ code: 'DEFENDING' });
  if (p.is_preparing_trap) raw.push({ code: 'TRAP' });
  const byKey = new Map();
  for (const e of raw) {
    const d = describeEffect(e);
    const prev = byKey.get(d.key);
    if (prev) {
      prev.rounds = Math.max(prev.rounds ?? 0, e.rounds ?? 0);
      prev.stacks += 1;
      prev.detail += `\n${d.detail}`;
    } else {
      byKey.set(d.key, { ...d, rounds: e.rounds ?? null, stacks: 1 });
    }
  }
  // primero lo malo (lo que más importa ver), después las mejoras
  return [...byKey.values()].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'debuff' ? -1 : 1));
}

// Íconos que la escena de combate precarga para dibujar los estados sobre los combatientes
export const STATUS_ICONS = [
  ['poison-bottle', 'lorc'], ['regeneration', 'sbed'], ['invisible', 'delapouite'], ['cursed-star', 'lorc'],
  ['shield-reflect', 'lorc'], ['checked-shield', 'lorc'], ['spiked-armor', 'lorc'], ['magic-shield', 'lorc'],
  ['magic-swirl', 'lorc'], ['upgrade', 'delapouite'], ...Object.values(STATS).map((s) => s.icon),
  ...Object.values(ELEMENTS).map((e) => e.icon),
];
