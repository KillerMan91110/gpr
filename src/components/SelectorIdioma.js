import { IDIOMAS, idiomaActual, cambiarIdioma } from '../i18n';

// Botones de idioma (Español / English). Cambiar recarga la página en el idioma elegido (src/i18n). Va con
// data-no-traducir para que sus nombres no se traduzcan.
export default function SelectorIdioma({ className = '' }) {
  const actual = idiomaActual();
  return (
    <div className={`idioma-sel ${className}`} data-no-traducir role="group" aria-label="Idioma / Language">
      {IDIOMAS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`idioma-btn${l.code === actual ? ' is-on' : ''}`}
          aria-pressed={l.code === actual}
          title={l.label}
          onClick={() => cambiarIdioma(l.code)}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
