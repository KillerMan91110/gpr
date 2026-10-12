// Servidor del editor de mapas (página /editor). Create React App carga este archivo solo en
// desarrollo (`npm start`): en el build de producción no existe, así que nadie puede guardar mapas
// desde el juego publicado. Además solo acepta peticiones desde este mismo PC.
//
//   GET  /__editor/zonas                 zonas que hay en public/assets/mundo/<dir>/mundo.json
//   GET  /__editor/tileset/:nombre       tiles del tileset (nombre, choque, encima) con los ajustes
//   GET  /__editor/sprites               hojas de caminar disponibles para NPCs
//   POST /__editor/guardar/:dir          guarda la zona entera (trozos + mundo.json + recursos del back)
//   POST /__editor/ajustes/:nombre       guarda el paso/encima por tile y lo aplica a todas las zonas
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MUNDO = path.join(ROOT, 'public/assets/mundo');
const ART = path.join(ROOT, 'art/sprites/mundo');
// los recursos del mapa los valida el servidor del juego: se le deja la lista en su carpeta
const BACK = process.env.EDITOR_BACKEND_DIR || path.resolve(ROOT, '../gprback');
const BACK_NODES = path.join(BACK, 'lib/worldNodes.zonas.json');

const SAFE = /^[a-z0-9_]+$/;
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, data, pretty = false) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, pretty ? JSON.stringify(data, null, 1) : JSON.stringify(data));
  fs.renameSync(tmp, file);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024 * 1024) { reject(new Error('Mapa demasiado grande')); req.destroy(); } else parts.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8'))); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// tiles del tileset (lo exporta crear_mundo.lua) con los ajustes hechos en el editor encima
function tilesetMeta(name) {
  const meta = readJson(path.join(ART, `tileset_${name}.json`));
  if (!meta) return null;
  const ajustes = readJson(path.join(ART, `tileset_${name}.ajustes.json`), {});
  meta.tiles = meta.tiles.map((t) => ({ ...t, ...(ajustes[t.nombre] ?? {}) }));
  return { meta, ajustes };
}

// referencia al tileset que va dentro de cada trozo (como la escribe Tiled)
function tilesetRef(name, meta) {
  return {
    firstgid: 1, name, image: `../tileset_${name}.png`, imagewidth: meta.columns * 32,
    imageheight: Math.ceil(meta.count / meta.columns) * 32, tilewidth: 32, tileheight: 32,
    columns: meta.columns, tilecount: meta.count, margin: 0, spacing: 0,
    tiles: meta.tiles.filter((t) => t.colision).map((t) => ({ id: t.id, properties: [{ name: 'colision', type: 'bool', value: true }] })),
  };
}

const tileLayer = (id, name, w, h, data) => ({ id, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: w, height: h, data });

function saveZone(dir, body) {
  const { mundo, chunks } = body;
  if (!mundo || !Array.isArray(chunks) || !chunks.length) throw new Error('Faltan datos de la zona');
  const tsName = mundo.tileset || 'pradera';
  if (!SAFE.test(tsName)) throw new Error('Nombre de tileset inválido');
  const ts = tilesetMeta(tsName);
  if (!ts) throw new Error(`No existe el tileset ${tsName}`);
  const ref = tilesetRef(tsName, ts.meta);
  const cw = mundo.chunkWidth;
  const ch = mundo.chunkHeight;
  const n = cw * ch;
  const outDir = path.join(MUNDO, dir);
  fs.mkdirSync(outDir, { recursive: true });

  const list = [];
  for (const c of chunks) {
    const { cx, cy } = c;
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) throw new Error('Trozo inválido');
    for (const k of ['suelo', 'objetos', 'encima', 'terreno']) {
      if (!Array.isArray(c[k]) || c[k].length !== n) throw new Error(`Capa ${k} del trozo ${cx},${cy} inválida`);
    }
    const objects = (c.puntos ?? []).map((o, i) => ({
      id: i + 1, name: String(o.name ?? ''), type: String(o.type ?? ''), rotation: 0, visible: true,
      x: Math.round(o.x), y: Math.round(o.y), width: Math.round(o.width ?? 0), height: Math.round(o.height ?? 0),
      ...(o.properties?.length ? { properties: o.properties } : {}),
    }));
    const map = {
      type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
      width: cw, height: ch, tilewidth: 32, tileheight: 32, infinite: false, nextlayerid: 5, nextobjectid: objects.length + 1,
      properties: [{ name: 'zona', type: 'int', value: mundo.zona }],
      layers: [
        tileLayer(1, 'suelo', cw, ch, c.suelo), tileLayer(2, 'objetos', cw, ch, c.objetos), tileLayer(3, 'encima', cw, ch, c.encima),
        { id: 4, name: 'puntos', type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects },
      ],
      tilesets: [ref],
      terreno: c.terreno,
      paso: c.paso ?? {},
    };
    const file = `chunk_${cx}_${cy}.json`;
    writeJson(path.join(outDir, file), map);
    list.push({ cx, cy, file });
  }
  // trozos que sobraron (la zona se achicó)
  const keep = new Set(list.map((c) => c.file));
  for (const f of fs.readdirSync(outDir)) if (/^chunk_\d+_\d+\.json$/.test(f) && !keep.has(f)) fs.unlinkSync(path.join(outDir, f));
  writeJson(path.join(outDir, 'mundo.json'), { ...mundo, editado: true, chunks: list }, true);

  // recursos (id → tipo y cantidad de sitios) para que el servidor del juego los valide
  const nodes = {};
  for (const c of chunks) for (const o of c.puntos ?? []) {
    if (o.type !== 'recurso') continue;
    const tipo = o.properties?.find((p) => p.name === 'tipo')?.value;
    nodes[o.name] = { tipo, sitios: (nodes[o.name]?.sitios ?? 0) + 1 };
  }
  let recursos = false;
  if (fs.existsSync(path.dirname(BACK_NODES))) {
    const all = readJson(BACK_NODES, {});
    all[mundo.zona] = nodes;
    writeJson(BACK_NODES, all, true);
    recursos = true;
  }
  return { ok: true, trozos: list.length, recursos, cantidadRecursos: Object.keys(nodes).length };
}

// cambió el paso/encima de algún tile: se reescribe la referencia al tileset en todas las zonas
function saveTileSettings(name, ajustes) {
  writeJson(path.join(ART, `tileset_${name}.ajustes.json`), ajustes, true);
  const ts = tilesetMeta(name);
  const ref = tilesetRef(name, ts.meta);
  let zonas = 0;
  for (const dir of fs.readdirSync(MUNDO)) {
    const world = readJson(path.join(MUNDO, dir, 'mundo.json'));
    if (!world?.chunks || (world.tileset || 'pradera') !== name) continue;
    for (const c of world.chunks) {
      const file = path.join(MUNDO, dir, c.file);
      const map = readJson(file);
      if (!map) continue;
      map.tilesets = [ref];
      writeJson(file, map);
    }
    zonas += 1;
  }
  return { ok: true, zonas };
}

module.exports = function editorDeMapas(app) {
  app.use('/__editor', async (req, res) => {
    const send = (code, data) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    if (!LOCAL.has(req.socket.remoteAddress)) return send(403, { error: 'El editor solo funciona desde este PC' });
    const [, action, arg] = req.url.split('?')[0].split('/');
    try {
      if (req.method === 'GET' && action === 'zonas') {
        const zonas = fs.readdirSync(MUNDO)
          .map((dir) => ({ dir, world: readJson(path.join(MUNDO, dir, 'mundo.json')) }))
          .filter((z) => z.world?.chunks)
          .map(({ dir, world }) => ({ dir, nombre: world.nombre, zona: world.zona, editado: !!world.editado }));
        return send(200, zonas);
      }
      if (req.method === 'GET' && action === 'tileset' && SAFE.test(arg ?? '')) {
        const ts = tilesetMeta(arg);
        return ts ? send(200, { ...ts.meta, name: arg, ajustes: ts.ajustes }) : send(404, { error: 'Tileset no encontrado' });
      }
      if (req.method === 'GET' && action === 'sprites') {
        const files = fs.readdirSync(path.join(MUNDO, 'caminar')).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''));
        return send(200, files);
      }
      if (req.method === 'POST' && action === 'guardar' && SAFE.test(arg ?? '')) {
        return send(200, saveZone(arg, await readBody(req)));
      }
      if (req.method === 'POST' && action === 'ajustes' && SAFE.test(arg ?? '')) {
        return send(200, saveTileSettings(arg, await readBody(req)));
      }
      return send(404, { error: 'No existe' });
    } catch (err) {
      return send(500, { error: err.message });
    }
  });
};
