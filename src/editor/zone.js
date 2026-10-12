// Modelo de una zona en el editor: todas las capas de todos los trozos unidas en un solo mapa
// grande (coordenadas de mundo), con deshacer/rehacer. Al guardar se vuelve a partir en trozos con
// el mismo formato que lee el juego (WorldScene) y que escribía el generador.
import { makeRules, TERRAIN_LIST } from './rules';

export const PASO_FORZADO = 16;
export const PASO_CORNISA = 32;
// puntos cuyo x/y es la esquina de arriba a la izquierda de su casilla (el juego les suma 16)
export const TOPLEFT_TYPES = new Set(['npc', 'poi', 'jefe', 'spawn']);
export const LAYERS = ['suelo', 'objetos', 'encima', 'terreno', 'paso'];
const HISTORY_MAX = 200;

const ASSETS = `${process.env.PUBLIC_URL}/assets`;
let uidSeq = 1;
const withUid = (o) => ({ ...o, uid: uidSeq++ });

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export async function fetchTileset(name) {
  return getJson(`/__editor/tileset/${name}`);
}

export async function loadZone(dir) {
  const base = `${ASSETS}/mundo/${dir}`;
  const mundo = await getJson(`${base}/mundo.json`);
  const meta = await fetchTileset(mundo.tileset || 'pradera');
  const chunks = await Promise.all(mundo.chunks.map((c) => getJson(`${base}/${c.file}`).then((data) => ({ ...c, data }))));
  return new Zone(dir, mundo, meta, chunks);
}

// zona nueva en blanco: pasto, un punto de inicio al centro y una subzona que la cubre entera
export function blankZone({ dir, nombre, zona, columns, rows, meta, chunkWidth = 40, chunkHeight = 30 }) {
  const rules = makeRules(meta);
  const n = chunkWidth * chunkHeight;
  const W = chunkWidth * columns;
  const H = chunkHeight * rows;
  const chunks = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < columns; cx++) {
      chunks.push({
        cx, cy, file: `chunk_${cx}_${cy}.json`,
        data: {
          layers: [
            { name: 'suelo', data: Array.from({ length: n }, () => rules.randomPasto()) },
            { name: 'objetos', data: new Array(n).fill(0) },
            { name: 'encima', data: new Array(n).fill(0) },
            { name: 'puntos', objects: [] },
          ],
          terreno: new Array(n).fill(0),
          paso: {},
        },
      });
    }
  }
  const mid = { x: Math.floor(W / 2) * 32, y: Math.floor(H / 2) * 32 };
  const midChunk = chunks.find((c) => c.cx === Math.floor(mid.x / (chunkWidth * 32)) && c.cy === Math.floor(mid.y / (chunkHeight * 32)));
  midChunk.data.layers[3].objects.push({ name: 'inicio', type: 'spawn', x: mid.x % (chunkWidth * 32), y: mid.y % (chunkHeight * 32), width: 0, height: 0 });
  const mundo = {
    nombre, zona, tileset: meta.name || 'pradera', terrenos: TERRAIN_LIST, tile: 32, chunkWidth, chunkHeight, columns, rows,
    encuentroHierba: 0.07, inicio: { x: mid.x + 16, y: mid.y + 16 }, clima: { estacion: 'verano', lluvia: 0.2 },
    subzonas: [{ name: nombre, x0: 0, y0: 0, x1: W * 32, y1: H * 32, levels: '1-5' }],
  };
  return new Zone(dir, mundo, meta, chunks, true);
}

export class Zone {
  constructor(dir, mundo, meta, chunks, isNew = false) {
    this.dir = dir;
    this.isNew = isNew;
    this.meta = meta;
    this.tilesetName = mundo.tileset || 'pradera';
    this.rules = makeRules(meta, mundo.terrenos || TERRAIN_LIST);
    this.terrainList = mundo.terrenos || TERRAIN_LIST;
    this.cw = mundo.chunkWidth;
    this.ch = mundo.chunkHeight;
    this.columns = mundo.columns;
    this.rows = mundo.rows;
    this.W = this.cw * this.columns;
    this.H = this.ch * this.rows;
    const { chunks: _c, subzonas, ...info } = mundo;
    this.info = info; // nombre, zona, clima, encuentroHierba…
    this.subzonas = (subzonas ?? []).map(withUid);
    const size = this.W * this.H;
    this.layers = {
      suelo: new Uint16Array(size), objetos: new Uint16Array(size), encima: new Uint16Array(size),
      terreno: new Uint8Array(size), paso: new Uint8Array(size),
    };
    this.puntos = [];
    const cpx = this.cw * 32;
    const cpy = this.ch * 32;
    for (const c of chunks) {
      const d = c.data;
      const layer = (name) => d.layers.find((l) => l.name === name);
      for (let y = 0; y < this.ch; y++) {
        for (let x = 0; x < this.cw; x++) {
          const li = y * this.cw + x;
          const gi = (c.cy * this.ch + y) * this.W + (c.cx * this.cw + x);
          for (const name of ['suelo', 'objetos', 'encima']) this.layers[name][gi] = layer(name)?.data[li] ?? 0;
          // los mapas sin capa de terreno (hechos antes del editor) lo deducen del tile del suelo
          this.layers.terreno[gi] = d.terreno ? d.terreno[li]
            : Math.max(0, this.terrainList.indexOf(this.rules.terrainOfGid(this.layers.suelo[gi])));
        }
      }
      for (const [li, v] of Object.entries(d.paso ?? {})) {
        const x = Number(li) % this.cw;
        const y = Math.floor(Number(li) / this.cw);
        this.layers.paso[(c.cy * this.ch + y) * this.W + (c.cx * this.cw + x)] = v;
      }
      for (const o of layer('puntos')?.objects ?? []) {
        const { id: _id, rotation: _r, visible: _v, ...rest } = o;
        this.puntos.push(withUid({ ...rest, x: o.x + c.cx * cpx, y: o.y + c.cy * cpy }));
      }
    }
    this.undoStack = [];
    this.redoStack = [];
    this.tx = null;
    this.listeners = new Set();
    this.dirty = isNew;
  }

  // ------------------------------------------------------------ lectura
  inside(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  idx(x, y) { return y * this.W + x; }
  get(layer, x, y) { return this.inside(x, y) ? this.layers[layer][this.idx(x, y)] : 0; }
  tAt = (x, y) => (this.inside(x, y) ? this.terrainList[this.layers.terreno[this.idx(x, y)]] : null);

  // ¿la casilla bloquea al héroe? (paso forzado o, si no, la colisión de sus tiles)
  blocked(x, y) {
    const p = this.get('paso', x, y);
    if (p & PASO_CORNISA) return false;
    if (p & PASO_FORZADO) return (p & 15) === 15;
    return this.rules.collides(this.get('suelo', x, y)) || this.rules.collides(this.get('objetos', x, y));
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(change) { this.listeners.forEach((fn) => fn(change)); }

  // ------------------------------------------------------------ transacciones (un trazo = un paso de deshacer)
  begin(label = 'Editar') {
    if (!this.tx) this.tx = { label, cells: new Map(), bbox: null, tbox: null };
    return this.tx;
  }

  growBox(box, x, y) {
    if (!box) return { x0: x, y0: y, x1: x, y1: y };
    box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
    return box;
  }

  set(layer, x, y, value) {
    if (!this.inside(x, y)) return;
    const i = this.idx(x, y);
    const arr = this.layers[layer];
    if (arr[i] === value) return;
    const tx = this.begin();
    const key = `${layer}:${i}`;
    if (!tx.cells.has(key)) tx.cells.set(key, [LAYERS.indexOf(layer), i, arr[i], value]);
    else tx.cells.get(key)[3] = value;
    arr[i] = value;
    tx.bbox = this.growBox(tx.bbox, x, y);
    if (layer === 'terreno') tx.tbox = this.growBox(tx.tbox, x, y);
  }

  commit() {
    const tx = this.tx;
    this.tx = null;
    if (!tx || !tx.cells.size) return null;
    const changes = [...tx.cells.values()].filter((c) => c[2] !== c[3]);
    if (!changes.length) return null;
    this.pushHistory({ type: 'cells', label: tx.label, changes });
    this.emit({ cells: true, bbox: tx.bbox });
    return tx.bbox;
  }

  pushHistory(entry) {
    this.undoStack.push(entry);
    if (this.undoStack.length > HISTORY_MAX) this.undoStack.shift();
    this.redoStack = [];
    this.dirty = true;
  }

  applyEntry(entry, forward) {
    if (entry.type === 'cells') {
      let box = null;
      for (const [l, i, before, after] of entry.changes) {
        this.layers[LAYERS[l]][i] = forward ? after : before;
        box = this.growBox(box, i % this.W, Math.floor(i / this.W));
      }
      this.emit({ cells: true, bbox: box });
    } else {
      this.restoreObjects(JSON.parse(forward ? entry.after : entry.before));
      this.emit({ objects: true });
    }
    this.dirty = true;
  }

  undo() {
    const e = this.undoStack.pop();
    if (!e) return null;
    this.applyEntry(e, false);
    this.redoStack.push(e);
    return e.label;
  }

  redo() {
    const e = this.redoStack.pop();
    if (!e) return null;
    this.applyEntry(e, true);
    this.undoStack.push(e);
    return e.label;
  }

  // ------------------------------------------------------------ objetos (puntos, subzonas, datos de la zona)
  objectsSnapshot() {
    return JSON.stringify({ puntos: this.puntos, subzonas: this.subzonas, info: this.info });
  }

  restoreObjects(s) {
    this.puntos = s.puntos;
    this.subzonas = s.subzonas;
    this.info = s.info;
  }

  // mergeKey: ediciones seguidas del mismo campo (escribir un nombre letra a letra) son un solo
  // paso de deshacer
  editObjects(label, fn, mergeKey = null) {
    const before = this.objectsSnapshot();
    const result = fn();
    const after = this.objectsSnapshot();
    if (before !== after) {
      const last = this.undoStack[this.undoStack.length - 1];
      if (mergeKey && last?.mergeKey === mergeKey && Date.now() - last.at < 2000 && !this.redoStack.length) {
        last.after = after;
        last.at = Date.now();
        this.dirty = true;
      } else {
        this.pushHistory({ type: 'objs', label, before, after, mergeKey, at: Date.now() });
      }
      this.emit({ objects: true });
    }
    return result;
  }

  // para arrastres: los objetos se mueven en vivo y al soltar queda un solo paso de deshacer
  commitObjects(label, before) {
    const after = this.objectsSnapshot();
    if (before !== after) {
      this.pushHistory({ type: 'objs', label, before, after });
      this.emit({ objects: true });
    }
  }

  addPoint(o) { return this.editObjects('Añadir objeto', () => { const p = withUid(o); this.puntos.push(p); return p; }); }
  updatePoint(uid, patch, label = 'Editar objeto', mergeKey = `p${uid}:${Object.keys(patch).join()}`) {
    this.editObjects(label, () => { this.puntos = this.puntos.map((p) => (p.uid === uid ? { ...p, ...patch } : p)); }, mergeKey);
  }
  removePoint(uid) { this.editObjects('Borrar objeto', () => { this.puntos = this.puntos.filter((p) => p.uid !== uid); }); }
  addSubzone(s) { return this.editObjects('Añadir subzona', () => { const z = withUid(s); this.subzonas.unshift(z); return z; }); }
  updateSubzone(uid, patch, label = 'Editar subzona') {
    this.editObjects(label, () => { this.subzonas = this.subzonas.map((z) => (z.uid === uid ? { ...z, ...patch } : z)); }, `s${uid}:${Object.keys(patch).join()}`);
  }
  removeSubzone(uid) { this.editObjects('Borrar subzona', () => { this.subzonas = this.subzonas.filter((z) => z.uid !== uid); }); }
  moveSubzone(uid, dir) {
    this.editObjects('Ordenar subzonas', () => {
      const i = this.subzonas.findIndex((z) => z.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= this.subzonas.length) return;
      const list = [...this.subzonas];
      [list[i], list[j]] = [list[j], list[i]];
      this.subzonas = list;
    });
  }
  updateInfo(patch) { this.editObjects('Datos de la zona', () => { this.info = { ...this.info, ...patch }; }, `i:${Object.keys(patch).join()}`); }

  // ------------------------------------------------------------ pintar
  // Terreno con bordes automáticos (como los autotiles de RPG Maker)
  paintTerrain(cells, terrain) {
    const c = this.terrainList.indexOf(terrain);
    if (c < 0) return;
    this.begin(`Pintar ${terrain}`);
    let box = null;
    for (const [x, y] of cells) {
      if (!this.inside(x, y)) continue;
      this.set('terreno', x, y, c);
      box = this.growBox(box, x, y);
    }
    if (!box) return;
    if (terrain === 'meseta') { this.addCliffs(box); box.y1 += 3; }
    else if (terrain !== 'cara' && terrain !== 'escalera') { this.removeOrphanCliffs(box); box.y1 += 3; }
    this.retile(box, 1);
  }

  // la meseta lleva su pared de roca de dos filas debajo del borde sur
  addCliffs(box) {
    for (let x = box.x0; x <= box.x1; x++) {
      for (let y = box.y0 - 1; y <= box.y1; y++) {
        if (this.tAt(x, y) !== 'meseta' || ['meseta', 'trigo'].includes(this.tAt(x, y + 1))) continue;
        for (const dy of [1, 2]) {
          const n = this.tAt(x, y + dy);
          if (n !== null && !['agua', 'meseta', 'puente', 'trigo', 'escalera', 'cara'].includes(n)) this.set('terreno', x, y + dy, this.terrainList.indexOf('cara'));
        }
      }
    }
  }

  // paredes que se quedaron sin meseta encima vuelven a ser pasto
  removeOrphanCliffs(box) {
    const pasto = this.terrainList.indexOf('pasto');
    for (let x = box.x0; x <= box.x1; x++) {
      for (let y = box.y0; y <= box.y1 + 3; y++) {
        if (this.tAt(x, y) !== 'cara') continue;
        const up = this.tAt(x, y - 1);
        const ok = up === 'meseta' || ((up === 'cara' || up === 'escalera') && this.tAt(x, y - 2) === 'meseta');
        if (!ok) this.set('terreno', x, y, pasto);
      }
    }
  }

  // recalcula el tile del suelo de las casillas del recuadro (+ margen) según su terreno
  retile(box, pad = 1) {
    if (!box) return;
    for (let y = box.y0 - pad; y <= box.y1 + pad; y++) {
      for (let x = box.x0 - pad; x <= box.x1 + pad; x++) {
        if (!this.inside(x, y)) continue;
        const cur = this.get('suelo', x, y);
        const gid = this.rules.groundGid(this.tAt, x, y, cur);
        if (gid && gid !== cur) this.set('suelo', x, y, gid);
      }
    }
  }

  // tile suelto: en el suelo también cambia el terreno lógico (sin bordes automáticos: lo pintado manda)
  paintTile(layer, x, y, gid) {
    this.begin('Pintar tiles');
    this.set(layer, x, y, gid);
    if (layer === 'suelo' && gid) this.set('terreno', x, y, Math.max(0, this.terrainList.indexOf(this.rules.terrainOfGid(gid))));
  }

  // borra lo de más arriba de la casilla (copa/tejado, luego objeto); en el suelo deja pasto
  erase(x, y, layer) {
    this.begin('Borrar');
    if (layer === 'suelo') { this.paintTerrain([[x, y]], 'pasto'); return; }
    if (layer && layer !== 'auto') { this.set(layer, x, y, 0); return; }
    if (this.get('encima', x, y)) this.set('encima', x, y, 0);
    else this.set('objetos', x, y, 0);
  }

  setPaso(x, y, v) {
    this.begin('Paso');
    this.set('paso', x, y, v);
  }

  // relleno (balde): casillas conectadas con el mismo valor que (x, y) en esa capa
  floodCells(layer, x, y, limit = 40000) {
    if (!this.inside(x, y)) return [];
    const arr = this.layers[layer];
    const target = arr[this.idx(x, y)];
    const seen = new Uint8Array(this.W * this.H);
    const out = [];
    const stack = [[x, y]];
    while (stack.length && out.length < limit) {
      const [cx, cy] = stack.pop();
      if (!this.inside(cx, cy)) continue;
      const i = this.idx(cx, cy);
      if (seen[i] || arr[i] !== target) continue;
      seen[i] = 1;
      out.push([cx, cy]);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return out;
  }

  // ------------------------------------------------------------ copiar y pegar
  copyRegion(x0, y0, w, h) {
    const clip = { w, h };
    for (const l of LAYERS) {
      clip[l] = [];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) clip[l].push(this.get(l, x, y));
    }
    // objetos del mapa que caen dentro (se pegan también, menos el inicio)
    const inRect = (p) => {
      const cxp = p.x + (p.width ?? 0) / 2;
      const cyp = p.y + (p.height ?? 0) / 2;
      return cxp >= x0 * 32 && cyp >= y0 * 32 && cxp < (x0 + w) * 32 && cyp < (y0 + h) * 32;
    };
    clip.puntos = this.puntos.filter((p) => p.type !== 'spawn' && inRect(p)).map(({ uid: _u, ...p }) => ({ ...p, x: p.x - x0 * 32, y: p.y - y0 * 32 }));
    return clip;
  }

  pasteRegion(clip, x0, y0) {
    this.begin('Pegar');
    for (let y = 0; y < clip.h; y++) {
      for (let x = 0; x < clip.w; x++) {
        const k = y * clip.w + x;
        for (const l of LAYERS) this.set(l, x0 + x, y0 + y, clip[l][k]);
      }
    }
    // costuras: los bordes automáticos de alrededor se rehacen
    this.retile({ x0: x0 - 1, y0: y0 - 1, x1: x0 + clip.w, y1: y0 - 1 }, 0);
    this.retile({ x0: x0 - 1, y0: y0 + clip.h, x1: x0 + clip.w, y1: y0 + clip.h }, 0);
    this.retile({ x0: x0 - 1, y0, x1: x0 - 1, y1: y0 + clip.h - 1 }, 0);
    this.retile({ x0: x0 + clip.w, y0, x1: x0 + clip.w, y1: y0 + clip.h - 1 }, 0);
    this.commit();
    if (clip.puntos?.length) {
      this.editObjects('Pegar objetos', () => {
        clip.puntos.forEach((p) => this.puntos.push(withUid({ ...p, x: p.x + x0 * 32, y: p.y + y0 * 32 })));
      });
    }
  }

  clearRegion(x0, y0, w, h) {
    this.begin('Borrar zona');
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { this.set('objetos', x, y, 0); this.set('encima', x, y, 0); }
    this.commit();
  }

  // ------------------------------------------------------------ guardar
  serialize() {
    const cpx = this.cw * 32;
    const cpy = this.ch * 32;
    // los sitios de cada recurso van numerados 0..n-1 (el servidor elige uno por número): se
    // respeta el número que ya tenían para que los recursos de los jugadores no cambien de lugar
    const sitioOf = new Map();
    const byName = {};
    this.puntos.filter((p) => p.type === 'recurso').forEach((p) => { (byName[p.name] = byName[p.name] ?? []).push(p); });
    for (const list of Object.values(byName)) {
      const used = new Set();
      const pending = [];
      for (const p of list) {
        const v = p.properties?.find((q) => q.name === 'sitio')?.value;
        if (Number.isInteger(v) && v >= 0 && v < list.length && !used.has(v)) { used.add(v); sitioOf.set(p.uid, v); } else pending.push(p);
      }
      let next = 0;
      for (const p of pending) {
        while (used.has(next)) next += 1;
        used.add(next);
        sitioOf.set(p.uid, next);
      }
    }
    const puntos = this.puntos.map(({ uid, ...p }) => {
      if (p.type !== 'recurso') return p;
      const props = (p.properties ?? []).filter((q) => q.name !== 'sitio');
      return { ...p, properties: [...props, { name: 'sitio', type: 'int', value: sitioOf.get(uid) }] };
    });
    const chunks = [];
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.columns; cx++) {
        const c = { cx, cy, suelo: [], objetos: [], encima: [], terreno: [], paso: {}, puntos: [] };
        for (let y = 0; y < this.ch; y++) {
          for (let x = 0; x < this.cw; x++) {
            const gi = (cy * this.ch + y) * this.W + (cx * this.cw + x);
            c.suelo.push(this.layers.suelo[gi]);
            c.objetos.push(this.layers.objetos[gi]);
            c.encima.push(this.layers.encima[gi]);
            c.terreno.push(this.layers.terreno[gi]);
            if (this.layers.paso[gi]) c.paso[y * this.cw + x] = this.layers.paso[gi];
          }
        }
        // cada punto va al trozo donde cae su centro, en coordenadas del trozo
        c.puntos = puntos.filter((p) => {
          const ox = p.x + (p.width ?? 0) / 2;
          const oy = p.y + (p.height ?? 0) / 2;
          return Math.floor(ox / cpx) === cx && Math.floor(oy / cpy) === cy;
        }).map((p) => ({ ...p, x: p.x - cx * cpx, y: p.y - cy * cpy }));
        chunks.push(c);
      }
    }
    const spawn = this.puntos.find((p) => p.type === 'spawn');
    const T = this.rules.T;
    const mundo = {
      ...this.info,
      tileset: this.tilesetName,
      terrenos: this.terrainList,
      tile: 32, chunkWidth: this.cw, chunkHeight: this.ch, columns: this.columns, rows: this.rows,
      gidHierba: T.hierba_alta,
      inicio: spawn ? { x: spawn.x + 16, y: spawn.y + 16 } : this.info.inicio,
      gids: this.rules.faunaGids(),
      subzonas: this.subzonas.map(({ uid: _u, ...z }) => z),
    };
    return { mundo, chunks };
  }
}
