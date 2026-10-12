import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import audio from '../../game/audio';
import { DIALOGUES } from '../../game/dialogues';

// Caja de diálogo estilo JRPG: retrato del NPC, el texto aparece letra por letra y abajo las
// opciones (1-9 para elegir, Espacio/Enter para completar el texto, Esc para irse).
export default function DialogueBox({ id, ctx, onOpenWindow, onClose }) {
  const def = DIALOGUES[id];
  const [text, setText] = useState(() => def?.greet(ctx) ?? '');
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
  const options = useMemo(() => (def ? def.options({ night, mark }) : []), [def, night, mark]);

  const choose = useCallback((o) => {
    audio.sfx('clic');
    if (o.close) onClose();
    else if (o.window) { onOpenWindow(o.window); onClose(); }
    else if (o.next) setText(def.lines[o.next]);
  }, [def, onClose, onOpenWindow]);

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
        <header className="dlg-name">{def.name}<small>{def.role}</small></header>
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
