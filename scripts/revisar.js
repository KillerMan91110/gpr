#!/usr/bin/env node
// Revisión rápida antes de un commit:  npm run revisar
//
// Busca los errores que más se repiten cuando varias personas (o agentes) tocan el juego a la
// vez y que no salen hasta que alguien abre esa pantalla:
//   - objetos del editor sin estilo (el editor se caía al abrir "Objetos")
//   - tipos de punto usados en los mapas que el editor no conoce
//   - mapas: trozos que faltan o no se pueden leer, zonas del continente sin mundo.json
//   - monstruos de las zonas de combate / jefes sin sprite en enemigos.json (o sin su .png)
//   - íconos <GameIcon name artist> y de las ventanas que no existen en public/Icons
//   - sonidos audio.sfx('x') que audio.js no sabe tocar
//   - y al final el lint de todo src/
// Sale con código 1 si encuentra errores (las advertencias no cortan).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PUB = path.join(ROOT, 'public');
const errores = [];
const avisos = [];
const err = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);
const leer = (f) => fs.readFileSync(f, 'utf8');
const json = (f) => JSON.parse(leer(f));

function archivosJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return archivosJs(p);
    return /\.(js|jsx)$/.test(d.name) ? [p] : [];
  });
}
const fuentes = archivosJs(SRC).map((f) => ({ f: path.relative(ROOT, f), txt: leer(f) }));

// ---- editor: objetos y estilos
const render = leer(path.join(SRC, 'editor/render.js'));
const estilo = new Set([...render.slice(render.indexOf('POINT_STYLE')).split('};')[0].matchAll(/^\s+([a-z_]+):\s*\{/gm)].map((m) => m[1]));
const editor = leer(path.join(SRC, 'pages/MapEditor.js'));
const objetos = [...editor.slice(editor.indexOf('OBJECT_TYPES')).split('];')[0].matchAll(/type: '([a-z_]+)'/g)].map((m) => m[1]);
for (const t of objetos) if (!estilo.has(t)) err(`Editor: el objeto "${t}" está en OBJECT_TYPES pero no tiene estilo en POINT_STYLE (src/editor/render.js) — el panel Objetos se cae`);

// ---- mapas
const MUNDO = path.join(PUB, 'assets/mundo');
const catalogo = json(path.join(PUB, 'assets/sprites/combate/enemigos.json')).monsters;
const etheria = json(path.join(MUNDO, 'etheria.json'));
const zonas = fs.readdirSync(MUNDO).filter((d) => fs.existsSync(path.join(MUNDO, d, 'mundo.json')));
for (const z of etheria.zonas ?? []) if (!zonas.includes(z.dir)) err(`Mapas: etheria.json nombra la zona "${z.dir}" pero no existe public/assets/mundo/${z.dir}/mundo.json`);
for (const dir of zonas) {
  const mundo = json(path.join(MUNDO, dir, 'mundo.json'));
  for (const c of mundo.chunks ?? []) {
    const file = path.join(MUNDO, dir, `chunk_${c.cx}_${c.cy}.json`);
    let data;
    try { data = json(file); } catch (e) { err(`Mapas: ${dir}/chunk_${c.cx}_${c.cy}.json falta o no es JSON válido (${e.message})`); continue; }
    for (const o of data.layers?.find((l) => l.name === 'puntos')?.objects ?? []) {
      const donde = `${dir}/chunk_${c.cx}_${c.cy} "${o.name}"`;
      if (!estilo.has(o.type)) aviso(`Mapas: ${donde} es de tipo "${o.type}", que el editor no conoce (se ve gris y no se puede crear desde "Añadir")`);
      const prop = (n) => o.properties?.find((p) => p.name === n)?.value;
      const codigos = o.type === 'encuentro' ? String(prop('monstruos') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        : o.type === 'jefe' ? [prop('monstruo')].filter(Boolean) : [];
      if (o.type === 'encuentro' && !codigos.length) err(`Mapas: ${donde} es una zona de combate sin monstruos`);
      for (const code of codigos) if (!catalogo[code]) err(`Mapas: ${donde} usa el monstruo ${code}, que no tiene sprite en enemigos.json (no aparecerá en el mapa)`);
    }
  }
}
for (const [code, m] of Object.entries(catalogo)) {
  if (!fs.existsSync(path.join(PUB, 'assets/sprites/combate', m.sheet))) err(`Sprites: ${code} apunta a ${m.sheet}, que no existe`);
}

// ---- íconos
const icono = (name, artist) => fs.existsSync(path.join(PUB, 'Icons', artist, `${name}.png`));
for (const { f, txt } of fuentes) {
  for (const m of txt.matchAll(/<GameIcon\s+name="([a-z0-9-]+)"\s+artist="([a-z0-9-]+)"/g)) {
    if (!icono(m[1], m[2])) err(`Íconos: ${f} usa ${m[2]}/${m[1]}, que no existe en public/Icons`);
  }
  for (const m of txt.matchAll(/icon:\s*\['([a-z0-9-]+)',\s*'([a-z0-9-]+)'\]/g)) {
    if (!icono(m[1], m[2])) err(`Íconos: ${f} usa ${m[2]}/${m[1]}, que no existe en public/Icons`);
  }
}

// ---- sonidos
const audio = leer(path.join(SRC, 'game/audio.js'));
const sfx = audio.slice(audio.indexOf('sfx(name)'));
const sonidos = new Set([...sfx.matchAll(/case '([a-z_]+)'/g)].map((m) => m[1]));
for (const { f, txt } of fuentes) {
  for (const m of txt.matchAll(/audio\.sfx\('([a-z_]+)'\)/g)) {
    if (!sonidos.has(m[1])) aviso(`Sonidos: ${f} pide audio.sfx('${m[1]}'), que audio.js no tiene (no suena nada)`);
  }
}

// ---- lint
let lintOk = true;
if (!process.argv.includes('--sin-lint')) {
  try {
    execSync('npx eslint --max-warnings=0 src', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    lintOk = false;
    err(`Lint: npx eslint encontró problemas:\n${String(e.stdout || e.message).trim()}`);
  }
}

// ---- resultado
const linea = (s) => `  • ${s}`;
const unicos = [...new Set(avisos)];
if (unicos.length) console.log(`\n⚠️  Advertencias (${unicos.length}):\n${unicos.map(linea).join('\n')}`);
if (errores.length) {
  console.log(`\n❌ Errores (${errores.length}):\n${errores.map(linea).join('\n')}\n`);
  process.exit(1);
}
console.log(`\n✅ Todo en orden: ${objetos.length} objetos del editor, ${zonas.length} zonas, ${Object.keys(catalogo).length} monstruos, ${fuentes.length} archivos${lintOk ? ' y lint limpio' : ''}.\n`);
