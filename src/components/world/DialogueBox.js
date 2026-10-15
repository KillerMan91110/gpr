import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import audio from '../../game/audio';
import { DIALOGUES } from '../../game/dialogues';

// Caja de diálogo estilo JRPG: retrato del NPC, el texto aparece letra por letra y abajo las
// opciones (1-9 para elegir, Espacio/Enter para completar el texto, Esc para irse).
export default function DialogueBox({ id, ctx, questLines, readyQuests, hasWork, onTurnIn, onOpenWindow, onAction, onClose }) {
  // mientras se conversa, el chat global se aparta para no tapar el cuadro de diálogo
  useEffect(() => {
    document.body.classList.add('en-dialogo');
    return () => document.body.classList.remove('en-dialogo');
  }, []);
  const def = DIALOGUES[id];
  // lo que dice por una misión (lib/questSteps.js) va antes de su saludo; se pasa con "Continuar"
  const [lineIdx, setLineIdx] = useState(0);
  const questLine = questLines?.[lineIdx] ?? null;
  const [text, setText] = useState(() => questLines?.[0]?.text ?? def?.greet(ctx) ?? '');
  const [shown, setShown] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    setShown(0);
    clearInterval(timer.current);
    let n = 0;
    timer.current = setInterval(() => {
      if (n >= text.length) { clearInterval(timer.current); return; }
      n += 1;
      if (n % 2 === 0) audio.sfx('texto');
      setShown((cur) => Math.max(cur, n));
    }, 22);
    return () => clearInterval(timer.current);
  }, [text]);

  const done = shown >= text.length;
  const { night, mark } = ctx;
  // cualquier NPC que dé misiones (game/questGivers.js) ofrece verlas, aunque su diálogo no lo tenga
  // escrito; las que ya cumpliste se le entregan aquí mismo, en persona (una opción por misión)
  const options = useMemo(() => {
    // la última línea de la misión cierra la conversación (ya te dio lo que tenía que darte)
    if (questLine) return lineIdx < questLines.length - 1 ? [{ label: '▶ Continuar', questNext: true }] : [{ label: '▶ Terminar', close: true }];
    const base = def ? def.options({ night, mark }) : [];
    const turnIns = (readyQuests ?? []).map((q) => ({ label: `✔ Entregar: ${q.name}`, turnIn: q }));
    const work = hasWork && !base.some((o) => o.window === 'misiones_gremio')
      ? [{ label: '❗ ¿Tienes trabajo para mí?', window: 'misiones_gremio' }] : [];
    return [...turnIns, ...work, ...base];
  }, [def, night, mark, questLine, lineIdx, questLines, readyQuests, hasWork]);

  const choose = useCallback((o) => {
    audio.sfx('clic');
    if (o.questNext) {
      const next = lineIdx + 1;
      setLineIdx(next);
      setText(questLines?.[next]?.text ?? def?.greet(ctx) ?? '');
      return;
    }
    if (o.turnIn) onTurnIn?.(o.turnIn);
    else if (o.close) onClose();
    else if (o.window) { onOpenWindow(o.window); onClose(); }
    else if (o.next) setText(def.lines[o.next]);
    else if (o.action) { onAction?.(o); onClose(); }
  }, [def, onClose, onOpenWindow, onAction, onTurnIn, lineIdx, questLines, ctx]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (!done && (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e')) { e.preventDefault(); setShown(text.length); return; }
      const n = Number(e.key);
      if (done && n >= 1 && n <= options.length) { e.preventDefault(); choose(options[n - 1]); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [done, options, choose, onClose, text]);

  if (!def) return null;

  return (
    <div className="dlg" role="dialog" aria-label={`Hablando con ${def.name}`}>
      <div className="dlg-portrait">
        <img src={def.portrait} alt="" draggable="false" />
      </div>
      <div className="dlg-body">
        <header className="dlg-name">{def.name}<small>{questLine ? 'Misión' : def.role}</small></header>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <p className="dlg-text" onClick={() => setShown(text.length)}>
          {text.slice(0, shown)}
          {!done && <span className="dlg-caret">▍</span>}
        </p>
        <ol className={`dlg-options${done ? '' : ' dlg-options--wait'}`}>
          {options.map((o, i) => (
            <li key={o.label}>
              <button type="button" disabled={!done} onClick={() => choose(o)}>
                <kbd>{i + 1}</kbd> {o.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
