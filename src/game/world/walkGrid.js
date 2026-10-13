import { PASO_FORZADO, PASO_CORNISA } from './shared';

// Casillas caminables de todo el continente y caminos A* (NPCs, vecinos, seguir).
// Métodos de WorldScene (se mezclan en la escena con Object.assign, ver WorldScene.js).
export const walkGridMethods = {
  // Mapa de choque de todo el continente a nivel de casilla (1 = se camina), sacado de los
  // trozos: tiles con "colision" en suelo u objetos, corregido por el paso forzado del editor.
  // Fuera de toda zona no se camina.
  buildWalkGrid() {
    const T = 32;
    this.gridW = Math.ceil(this.worldPx.w / T);
    this.gridH = Math.ceil(this.worldPx.h / T);
    const walk = new Uint8Array(this.gridW * this.gridH);
    const FLIP = 0x1fffffff;
    for (const z of this.zones) {
      const cw = z.world.chunkWidth;
      const ch = z.world.chunkHeight;
      for (const c of z.world.chunks) {
        const d = this.cache.tilemap.get(`chunk_${z.dir}_${c.cx}_${c.cy}`)?.data;
        if (!d) continue;
        const ts = d.tilesets?.[0];
        const first = ts?.firstgid ?? 1;
        const col = new Set((ts?.tiles ?? []).filter((t) => t.properties?.some((p) => p.name === 'colision' && p.value)).map((t) => t.id + first));
        const layer = (n) => d.layers.find((l) => l.name === n)?.data ?? [];
        const suelo = layer('suelo');
        const obj = layer('objetos');
        const gx0 = z.ox / T + c.cx * cw;
        const gy0 = z.oy / T + c.cy * ch;
        for (let k = 0; k < cw * ch; k++) {
          const blocked = col.has((suelo[k] ?? 0) & FLIP) || col.has((obj[k] ?? 0) & FLIP);
          walk[(gy0 + Math.floor(k / cw)) * this.gridW + gx0 + (k % cw)] = blocked ? 0 : 1;
        }
        for (const [idx, v] of Object.entries(d.paso ?? {})) {
          if (!(v & (PASO_FORZADO | PASO_CORNISA))) continue;
          const i = (gy0 + Math.floor(idx / cw)) * this.gridW + gx0 + (idx % cw);
          walk[i] = (v & PASO_CORNISA) || (v & 15) !== 15 ? 1 : 0;
        }
      }
    }
    this.walk = walk;
    this.pathCache = new Map();
  },

  walkable(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.gridW && ty < this.gridH && this.walk[ty * this.gridW + tx] === 1;
  },

  // ¿se puede ir en línea recta de una casilla a otra sin pisar nada que choque?
  // (se mira el ancho del cuerpo, no solo la línea del centro, para no rozar esquinas)
  clearLine(ax, ay, bx, by) {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4;
    const R = 0.3;
    for (let i = 1; i < n; i++) {
      const x = ax + 0.5 + ((bx - ax) * i) / n;
      const y = ay + 0.5 + ((by - ay) * i) / n;
      for (const [ox, oy] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
        if (!this.walkable(Math.floor(x + ox), Math.floor(y + oy))) return false;
      }
    }
    return true;
  },

  // Camino A* (4 direcciones, suavizado) entre dos puntos del mundo, medido en los pies del
  // personaje (feet = cuánto más abajo del centro del sprite están los pies). Devuelve los puntos
  // por donde pasar (centros de casilla, ya en coordenadas del sprite) terminando en el destino,
  // o null si no hay camino (entonces se va en línea recta, como antes).
  findPath(x0, y0, x1, y1, feet = 10) {
    if (!this.walk) return null;
    const T = 32;
    const sx = Math.floor(x0 / T);
    const sy = Math.floor((y0 + feet) / T);
    let ex = Math.floor(x1 / T);
    let ey = Math.floor((y1 + feet) / T);
    // punto de la ruta puesto sobre algo que choca (un banco, el borde de una fuente): se va a la
    // casilla libre más cercana en vez de meterse dentro
    let snapped = false;
    if (!this.walkable(ex, ey)) {
      for (let r = 1; r <= 3 && !snapped; r++) {
        for (let dy = -r; dy <= r && !snapped; dy++) {
          for (let dx = -r; dx <= r && !snapped; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.walkable(ex + dx, ey + dy)) { ex += dx; ey += dy; snapped = true; }
          }
        }
      }
    }
    const key = `${sx},${sy}>${ex},${ey}`;
    if (this.pathCache.has(key)) return this.pathCache.get(key)?.map((p) => ({ ...p })) ?? null;
    let result = null;
    if (sx === ex && sy === ey) result = [];
    else {
      const W = this.gridW;
      const start = sy * W + sx;
      const goal = ey * W + ex;
      const g = new Map([[start, 0]]);
      const from = new Map();
      const heap = [[Math.abs(ex - sx) + Math.abs(ey - sy), start]];
      const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1; const r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      let found = false;
      let budget = 40000;
      while (heap.length && budget-- > 0) {
        const [, cur] = pop();
        if (cur === goal) { found = true; break; }
        const cx = cur % W;
        const cy = (cur - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const ni = ny * W + nx;
          // el destino se acepta aunque el punto de la ruta haya quedado sobre algo que choca
          if (ni !== goal && !this.walkable(nx, ny)) continue;
          const ng = g.get(cur) + 1;
          if (ng < (g.get(ni) ?? Infinity)) {
            g.set(ni, ng);
            from.set(ni, cur);
            push(ng + Math.abs(ex - nx) + Math.abs(ey - ny), ni);
          }
        }
      }
      if (found) {
        const cells = [];
        for (let i = goal; i !== undefined && i !== start; i = from.get(i)) cells.push([i % W, Math.floor(i / W)]);
        cells.reverse();
        // suavizado: de cada punto se salta al más lejano que se ve en línea recta
        const smooth = [];
        let ax = sx;
        let ay = sy;
        for (let i = 0; i < cells.length; i++) {
          const next = cells[i + 1];
          if (next && this.clearLine(ax, ay, next[0], next[1])) continue;
          smooth.push(cells[i]);
          [ax, ay] = cells[i];
        }
        result = smooth.map(([tx, ty]) => ({ x: tx * T + 16, y: ty * T + 16 - feet }));
      }
    }
    if (this.pathCache.size > 500) this.pathCache.clear();
    this.pathCache.set(key, result);
    if (!result) return null;
    const out = result.map((p) => ({ ...p }));
    // el último paso cae justo en el punto de la ruta (o en la casilla libre que lo reemplaza)
    const end = snapped ? { x: ex * T + 16, y: ey * T + 16 - feet } : { x: x1, y: y1 };
    if (out.length) out[out.length - 1] = end; else out.push(end);
    return out;
  },
};
