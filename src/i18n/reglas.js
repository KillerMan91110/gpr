// Reglas por frase para el inglés (etapa 2): el registro del combate y los efectos de las habilidades se arman
// juntando pedazos («X usa Y sobre A, haciéndole 30 de daño (¡Crítico!); B esquiva.»), así que no sirve buscar la
// frase entera en el diccionario. Cada regla cambia un pedazo conocido; los nombres de habilidades, clases y
// estados que quedan adentro se traducen con el diccionario (t). Se aplican solo si el texto no se encontró entero.

const ELEMENTOS = {
  fuego: 'fire', hielo: 'ice', rayo: 'lightning', viento: 'wind', tierra: 'earth', agua: 'water', luz: 'light',
  oscuridad: 'darkness', cósmico: 'cosmic', cosmico: 'cosmic',
  Fuego: 'Fire', Hielo: 'Ice', Rayo: 'Lightning', Viento: 'Wind', Tierra: 'Earth', Agua: 'Water', Luz: 'Light', Oscuridad: 'Darkness',
};
const ESTADOS = {
  ceguera: 'blindness', sangrado: 'bleeding', quemadura: 'burn', parálisis: 'paralysis', ralentización: 'slow',
  veneno: 'poison', envenenamiento: 'poison', congelación: 'freezing', debilitamiento: 'weakness', silencio: 'silence',
  plaga: 'plague', maldición: 'curse', provocación: 'taunt', regeneración: 'regeneration', espinas: 'thorns',
};
const DANO = { elemental: 'elemental', físico: 'physical', mágico: 'magic', crítico: 'critical' };
// lo que sigue al nivel del monstruo: «Goblin Lv.30 · Poco Común Frenético»
const RAREZA = { 'Élite': 'Elite', 'Poco Común': 'Uncommon', Raro: 'Rare', 'Mini Jefe': 'Miniboss', Jefe: 'Boss', 'Épico': 'Epic', Legendario: 'Legendary', 'Común': 'Common' };
const AFIJO = { 'Frenético': 'Frenzied', Gigante: 'Giant', Dorado: 'Golden', Corrupto: 'Corrupted', 'del Eclipse': 'of the Eclipse' };
const BONO = {
  experiencia: 'experience', oro: 'gold', 'botín': 'loot', 'vida al ganar': 'health on victory', 'maná al ganar': 'mana on victory',
  'daño recibido': 'damage taken', 'probabilidad de carta': 'card chance',
};
const DONDE = {
  'su zona': 'in its zone', 'esa mazmorra': 'in that dungeon', 'el Volcán': 'in the Volcano', 'la Tundra': 'in the Tundra',
  'las Catacumbas': 'in the Catacombs', 'las Costas': 'on the Coasts', 'las Montañas': 'in the Mountains', 'las Ruinas': 'in the Ruins',
};
const el = (w) => ELEMENTOS[w] ?? w;
const es = (w) => ESTADOS[w] ?? w;

export function crearReglas(t) {
  return [
    // ---- efectos: las frases enteras van antes que las duraciones sueltas ----
    [/(\d+)%: parálisis por (\d+) turnos \((\d+)% de perder el turno\)/g, '$1%: paralysis for $2 turns ($3% chance to lose the turn)'],
    [/(\d+)%: ceguera por (\d+) turnos \((?:falla el )?(\d+)% (?:de fallar|de sus golpes)\)/g, '$1%: blindness for $2 turns (misses $3% of hits)'],
    [/todos los aliados regeneran (\d+)% HP máximo por turno/g, 'all allies regenerate $1% max HP per turn'],
    [/[Rr]egenera (\d+)% HP máximo a todos los aliados por turno/g, 'regenerates $1% max HP for all allies per turn'],
    [/[Rr]egenera (\d+)% HP máximo por turno/g, 'regenerates $1% max HP per turn'],
    [/[Pp]ierde (\d+)% (?:de su )?HP máximo por turno/g, 'loses $1% max HP per turn'],
    [/[Rr]evive (?:a un )?aliado caído con (\d+)% HP/g, 'revives a fallen ally with $1% HP'],
    [/[Ii]nvoca (?:un |una )?(.+?) por (\d+) rondas; aura \+(\d+)% (?:de )?resist(?:encia)?( \p{Lu}+)?( al equipo)?/gu,
      (_, x, n, p, r, e) => `Summons ${t(x)} for ${n} rounds; aura +${p}%${r ?? ''} resistance${e ? ' to the team' : ''}`],
    [/regeneración: (\d+)% HP\/turno/g, 'regeneration: $1% HP/turn'],
    [/ daño recibido/g, ' damage taken'],
    [/[Rr]ecupera (\d+) de maná/g, 'Recovers $1 mana'],
    // solo después del «·» del nivel (en «Dragón Menor Corrupto», Corrupto es parte del nombre)
    [/ · (Poco Común|Mini Jefe|Élite|Raro|Jefe|Épico|Legendario|Común)(?: (Frenético|Gigante|Dorado|Corrupto|del Eclipse))?(?!\p{L})/gu,
      (_, x, a) => ` · ${RAREZA[x]}${a ? ` ${AFIJO[a]}` : ''}`],
    [/ · (Frenético|Gigante|Dorado|Corrupto|del Eclipse)(?!\p{L})/gu, (_, a) => ` · ${AFIJO[a]}`],
    // ---- registro del combate ----
    [/ usa (.+?) sobre /g, (_, s) => ` uses ${t(s)} on `],
    [/ usa (.+?) y cura a /g, (_, s) => ` uses ${t(s)} and heals `],
    [/ usa ([^:.;]+?)(:|\.|$)/g, (_, s, f) => ` uses ${t(s)}${f}`],
    [/ usó (.+?) en sí mismo: recuperó (\d+) HP/g, (_, s, n) => ` used ${t(s)} on themselves: recovered ${n} HP`],
    [/ usó (.+?) en (.+?): (.+?) recuperó (\d+) HP/g, (_, s, a, b, n) => ` used ${t(s)} on ${a}: ${b} recovered ${n} HP`],
    [/, (?:haciéndole|infligiéndole) (\d+) de daño( elemental)?/g, (_, n, e) => `, dealing ${n}${e ? ' elemental' : ''} damage`],
    [/, curándole (\d+) HP/g, ', healing $1 HP'],
    [/ \(¡Crítico!\)/g, ' (Critical!)'],
    [/:? recuperó (\d+) HP/g, (m, n) => `${m.startsWith(':') ? ':' : ''} recovered ${n} HP`],
    [/ sin hacerle daño/g, ' without hurting it'],
    [/ esquiva\b/g, ' dodges'],
    [/ ataca a (.+?)(,|:)/g, ' attacks $1$2'],
    [/: (\d+) de daño \+ (\d+) de (\p{L}+)/gu, (_, a, b, e) => `: ${a} damage + ${b} ${el(e)}`],
    [/ sufre (\d+) de daño por (\p{L}+)/gu, (_, n, s) => ` takes ${n} damage from ${es(s)}`],
    [/¡(.+?) sufre (\p{L}+)!/gu, (_, x, s) => `${x} suffers ${es(s)}!`],
    [/ es inmune a (\p{L}+)/gu, (_, s) => ` is immune to ${es(s)}`],
    [/ (\p{Lu}[\p{L}_]*) refrescad[oa] \(/gu, ' $1 refreshed ('],
    [/ · Élite/g, ' · Elite'],
    [/\bUna barrera cubre a /g, 'A barrier covers '],
    // ---- efectos de las habilidades ----
    [/ (?:por|durante) (\d+) turnos?/g, (_, n) => ` for ${n} turn${n === '1' ? '' : 's'}`],
    [/ (?:por|durante) (\d+) rondas?/g, (_, n) => ` for ${n} round${n === '1' ? '' : 's'}`],
    [/ los siguientes (\d+) turnos/g, ' for the next $1 turns'],
    [/ (?:de forma )?permanente/g, ' permanent'],
    [/ a todos los aliados/g, ' to all allies'],
    [/ al aliado/g, ' to the ally'],
    [/ a (?:un )?aliado/g, ' to an ally'],
    [/ a ti\b/g, ' to you'],
    [/ al enemigo/g, ' to the enemy'],
    [/ al equipo/g, ' to the team'],
    [/Crítico%?/g, 'Critical'],
    [/[Ee]vasión/g, 'evasion'],
    [/curación otorgada/g, 'healing done'],
    [/daño (elemental|físico|mágico|crítico)/g, (_, d) => `${DANO[d]} damage`],
    [/Daño (\p{L}+)/gu, (_, e) => `${el(e)} damage`],
    [/oro obtenido/g, 'gold gained'],
    [/tasa de dropeo/g, 'drop rate'],
    [/XP obtenida/g, 'XP gained'],
    [/DEF MAG/g, 'MAG DEF'],
    [/resistencia a (\p{L}+)/gu, (_, e) => `${el(e)} resistance`],
    [/[Pp]ierde (\d+)% (?:de su )?HP máximo por turno/g, 'loses $1% max HP per turn'],
    [/todos los aliados regeneran (\d+)% HP máximo por turno/g, 'all allies regenerate $1% max HP per turn'],
    [/[Rr]egenera (\d+)% HP máximo a todos los aliados por turno/g, 'regenerates $1% max HP for all allies per turn'],
    [/[Rr]egenera (\d+)% HP máximo por turno/g, 'regenerates $1% max HP per turn'],
    [/[Rr]egeneras (\d+)% HP\/turno/g, 'you regenerate $1% HP/turn'],
    [/[Rr]evive aliado caído con (\d+)% HP/g, 'revives a fallen ally with $1% HP'],
    [/^Enemigo /, 'Enemy '],
    [/ recibe \+(\d+)% daño/g, ' takes +$1% damage'],
    [/[Ii]nvoca (?:un |una )?(.+?) por (\d+) rondas; aura \+(\d+)% (?:de )?resist(?:encia)?( \p{Lu}+)?/gu,
      (_, x, n, p, r) => `Summons ${t(x)} for ${n} rounds; aura +${p}%${r ? `${r}` : ''} resistance`],
    [/Ataques físicos imbuídos con (\p{L}+) \+(\d+)%/gu, (_, e, n) => `Physical attacks imbued with ${el(e)} +${n}%`],
    [/(\d+)%: parálisis por (\d+) turnos \((\d+)% de perder el turno\)/g, '$1%: paralysis for $2 turns ($3% chance to lose the turn)'],
    [/(\d+)%: ceguera por (\d+) turnos \((?:falla el )?(\d+)% (?:de fallar|de sus golpes)\)/g, '$1%: blindness for $2 turns (misses $3% of hits)'],
    [/(\p{L}+), (\d+)% de vida por turno/gu, (_, s, n) => `${es(s)}, ${n}% health per turn`],
    [/ de vida por turno/g, ' health per turn'],
    [/-(\d+)% de ataque/g, '-$1% attack'],
    [/-(\d+)% de velocidad/g, '-$1% speed'],
    [/\+(\d+)% de (ataque|magia) a/g, (_, n, s) => `+${n}% ${s === 'ataque' ? 'attack' : 'magic'} to`],
    [/de daño si la defensa del enemigo es mayor a (\d+)/g, "damage if the enemy's defense is above $1"],
    [/daño si la DEF enemiga es menor a (\d+)/g, 'damage if enemy DEF is below $1'],
    [/La quemadura baja (\d+)% el ataque/g, 'The burn lowers attack by $1%'],
    [/[Ee]limina efectos negativos de un aliado/g, 'Removes negative effects from an ally'],
    [/^Veneno: /, 'Poison: '],
    // el bono de los títulos de logro (lib/logros.js): «+5% de experiencia en las Montañas», «-2% de daño recibido»
    [/([+-]\d+%) (?:de )?(experiencia|oro|botín|vida al ganar|maná al ganar|daño recibido|probabilidad de carta)/g, (_, n, b) => `${n} ${BONO[b]}`],
    [/ en (su zona|esa mazmorra|el Volcán|la Tundra|las Catacumbas|las Costas|las Montañas|las Ruinas)\b/g, (_, z) => ` ${DONDE[z]}`],
    [/^(\p{Lu}[^:]{2,40}): /u, (m, x) => (t(x) !== x ? `${t(x)}: ` : m)],
    // el monstruo antes de su nivel: «… on Capitán de los Lobos Lv.12» (se busca el nombre conocido más largo al final)
    [/(\p{Lu}[\p{L}\p{N} ,'’-]*?) Lv\.(\d+|\?+)/gu, (m, pre, lv) => {
      const w = pre.split(' ');
      for (let k = 0; k < w.length; k += 1) {
        const nombre = w.slice(k).join(' ').replace(/^,/, '');
        const en = t(nombre);
        if (en !== nombre) return `${w.slice(0, k).join(' ')}${k ? ' ' : ''}${en} Lv.${lv}`;
      }
      return m;
    }],
  ];
}
