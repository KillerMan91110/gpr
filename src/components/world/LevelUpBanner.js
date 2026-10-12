import { useEffect } from 'react';

const ROWS = [
  ['maxHp', 'Vida'], ['maxMana', 'Maná'], ['atk', 'Ataque'], ['def', 'Defensa'],
  ['int', 'Inteligencia'], ['magicDef', 'Defensa mágica'], ['spd', 'Velocidad'],
];

// Cartel de subida de nivel: el número nuevo en grande y lo que subió cada estadística.
export default function LevelUpBanner({ level, before, after, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5200);
    return () => clearTimeout(t);
  }, [onDone]);

  const gains = ROWS
    .map(([k, label]) => ({ label, diff: Number(after?.[k] ?? 0) - Number(before?.[k] ?? 0) }))
    .filter((g) => g.diff > 0);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="lvlup" onClick={onDone}>
      <div className="lvlup-rays" />
      <small>¡Has subido de nivel!</small>
      <strong>Nivel {level}</strong>
      {gains.length > 0 && (
        <ul>
          {gains.map((g) => <li key={g.label}>{g.label} <b>+{g.diff}</b></li>)}
        </ul>
      )}
    </div>
  );
}
