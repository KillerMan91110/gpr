// Fases del mundo (phasing, como en los MMO): cada jugador ve el mundo según SU historia. Un NPC, un
// objeto del mapa o una línea de diálogo puede depender de en qué punto va de una misión:
//
//   CODE            la completó
//   !CODE           no la completó (puede tenerla en curso)
//   CODE@no         ni la empezó ni la completó
//   CODE@activa     la tiene en curso (cualquier paso)
//   CODE@2          la tiene en curso y va en el paso 2
//   CODE@2+         la tiene en curso y va en el paso 2 o más adelante
//   CODE@2-         la tiene en curso y va en el paso 2 o antes
//   CODE@lista      la tiene en curso con todo cumplido (falta entregarla)
//   CODE@empezada   la tiene en curso o ya la completó
//   !…              lo contrario de cualquiera de las anteriores (!CODE = no la completó;
//                   !CODE@2 = no está en el paso 2: Ren no está en su puesto mientras lo escoltas)
//
// Varias condiciones separadas por coma deben cumplirse todas: "MONTANAS_HISTORIA_02_ORCOS,!MONTANAS_SEC_OLLA".
// En el mapa va en la propiedad "fase" del punto; "requiere" (= CODE) y "oculto_tras" (= !CODE) siguen
// funcionando igual que antes.

// estado: { done: Set de códigos completados, active: Map código → { step, ready } } (null = todavía no se sabe)
export function makeStory(doneCodes, activeQuests) {
  if (!doneCodes) return null;
  const active = new Map();
  for (const q of activeQuests ?? []) {
    if (!q?.code) continue;
    const ready = q.objectives?.length > 0 && q.objectives.every((o) => (o.current_count ?? 0) >= o.target_count);
    active.set(q.code, { step: q.current_step ?? 1, ready });
  }
  return { done: doneCodes instanceof Set ? doneCodes : new Set(doneCodes), active };
}

function cumple(story, cond) {
  const c = cond.trim();
  if (!c) return true;
  if (c.startsWith('!')) return !cumple(story, c.slice(1));
  const [code, how] = c.split('@');
  if (!how) return story.done.has(code);
  const act = story.active.get(code);
  switch (how) {
    case 'no': return !act && !story.done.has(code);
    case 'activa': return !!act;
    case 'lista': return !!act?.ready;
    case 'empezada': return !!act || story.done.has(code);
    default: {
      const n = parseInt(how, 10);
      if (!act || Number.isNaN(n)) return false;
      const step = act.step ?? 1;
      if (how.endsWith('+')) return step >= n;
      if (how.endsWith('-')) return step <= n;
      return step === n;
    }
  }
}

// ¿se cumple esta fase? Sin historia cargada (story null) solo pasa lo que no depende de ella.
export function enFase(story, expr) {
  if (!expr) return true;
  if (!story) return false;
  return String(expr).split(',').every((c) => cumple(story, c));
}

// la fase de un punto del mapa, juntando "fase", "requiere" y "oculto_tras"
export function faseDe({ fase, requiere, ocultoTras }) {
  return [fase, requiere, ocultoTras && `!${ocultoTras}`].filter(Boolean).join(',') || null;
}
