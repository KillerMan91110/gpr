// Dibujo del editor: el mapa (con caché por trozo cuando se ve de lejos), las capas de ayuda
// (rejilla, paso, objetos, subzonas) y el minimapa.
import { PASO_FORZADO, PASO_CORNISA, TOPLEFT_TYPES } from './zone';

const TS = 32;
const CACHE_SCALE = 0.5; // los trozos cacheados se guardan a media resolución (para zoom < 1)

// recursos (mismos frames que WorldScene)
export const RESOURCE_FRAMES = {
  hierba: ['recursos', 0], mineral: ['recursos', 2], cofre: ['recursos', 4],
  setas: ['recursos2', 0], tronco: ['recursos2', 2], flor_luz: ['recursos2', 4], nido: ['recursos2', 6], restos: ['recursos2', 8],
  lino: ['recursos3', 0], cuarzo: ['recursos3', 2], trigo: ['recursos3', 4],
  veta_montana: ['recursos4', 0], pino: ['recursos4', 2], flor_nieve: ['recursos4', 4], cristal_lago: ['recursos4', 6],
  restos_montana: ['recursos2', 8], cofre_montana: ['recursos', 4],
  veta_obsidiana: ['recursos5', 0], fumarola: ['recursos5', 2], flor_ceniza: ['recursos5', 4], nido_salamandra: ['recursos5', 6],
  geoda_ardiente: ['recursos5', 8], restos_volcan: ['recursos2', 8], cofre_volcan: ['recursos', 4],
};

export const POINT_STYLE = {
  spawn: { color: '#5dff8a', label: 'Inicio' },
  npc: { color: '#ffd84a', label: 'NPC' },
  poi: { color: '#6fc3ff', label: 'Punto' },
  jefe: { color: '#ff5a5a', label: 'Jefe' },
  recurso: { color: '#b0ff7a', label: 'Recurso' },
  luz: { color: '#ffb347', label: 'Luz' },
  encuentro: { color: '#ff7ad9', label: 'Combates' },
  salida: { color: '#7dffa8', label: 'Salida' },
  pilar: { color: '#9ae8ff', label: 'Pilar' },
  cartel: { color: '#e8c46a', label: 'Cartel' },
  ciudadano: { color: '#c8b0ff', label: 'Ciudadano' },
  ruta: { color: '#8a7aff', label: 'Ruta' },
  palomas: { color: '#d8dce4', label: 'Palomas' },
  gato: { color: '#e07a3a', label: 'Gato' },
  aspas: { color: '#e0e0e0', label: 'Aspas' },
  vinculo: { color: '#f0e6a0', label: 'Estatua' },
  estandarte: { color: '#ff8a5a', label: 'Estandarte' },
  buzon: { color: '#7ac8ff', label: 'Buzón' },
  secreto: { color: '#ffe08a', label: 'Secreto' },
  // La Cripta del Vigía (game/world/cripta.js)
  guardian: { color: '#ff6a4a', label: 'Guardián' },
  brasero: { color: '#ff9a4a', label: 'Brasero' },
  sello: { color: '#7ff8ff', label: 'Puerta sellada' },
  vigia: { color: '#4ae0ff', label: 'Jefe de mazmorra' },
};

const propOf = (o, name) => o.properties?.find((p) => p.name === name)?.value;

// centro visible de un punto (en píxeles del mundo)
export function pointCenter(p) {
  if (p.type === 'encuentro' || p.type === 'salida') return { x: p.x + p.width / 2, y: p.y + p.height / 2 };
  return TOPLEFT_TYPES.has(p.type) ? { x: p.x + 16, y: p.y + 16 } : { x: p.x, y: p.y };
}

export class Renderer {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images; // { tiles, recursos, recursos2, recursos3, recursos4, recursos5, aspas, npc: { nombre: img } }
    this.zone = null;
    this.view = { x: 0, y: 0, zoom: 1 };
    this.opts = { grid: true, encima: true, puntos: true, subzonas: false, paso: false, chunks: true };
    this.overlay = {};
    this.cache = new Map();
    this.frame = 0;
  }

  setZone(zone) {
    this.zone = zone;
    this.cache.clear();
    this.cols = zone.rules.columns;
  }

  invalidate(bbox) {
    if (!this.zone) return;
    if (!bbox) { this.cache.clear(); return; }
    const z = this.zone;
    for (let cy = Math.floor((bbox.y0 - 1) / z.ch); cy <= Math.floor((bbox.y1 + 1) / z.ch); cy++) {
      for (let cx = Math.floor((bbox.x0 - 1) / z.cw); cx <= Math.floor((bbox.x1 + 1) / z.cw); cx++) this.cache.delete(`${cx}_${cy}`);
    }
  }

  request() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.request();
  }

  get size() { return { w: this.canvas.clientWidth, h: this.canvas.clientHeight }; }
  toWorld(sx, sy) { return { x: this.view.x + sx / this.view.zoom, y: this.view.y + sy / this.view.zoom }; }
  toScreen(wx, wy) { return { x: (wx - this.view.x) * this.view.zoom, y: (wy - this.view.y) * this.view.zoom }; }

  drawTile(ctx, gid, dx, dy, size) {
    if (!gid) return;
    const s = gid - 1;
    ctx.drawImage(this.images.tiles, (s % this.cols) * TS, Math.floor(s / this.cols) * TS, TS, TS, dx, dy, size, size);
  }

  chunkCanvas(cx, cy) {
    const key = `${cx}_${cy}`;
    let c = this.cache.get(key);
    if (c) return c;
    const z = this.zone;
    const size = TS * CACHE_SCALE;
    const make = () => {
      const cv = document.createElement('canvas');
      cv.width = z.cw * size;
      cv.height = z.ch * size;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      return { cv, g };
    };
    const base = make();
    const top = make();
    for (let y = 0; y < z.ch; y++) {
      for (let x = 0; x < z.cw; x++) {
        const i = (cy * z.ch + y) * z.W + (cx * z.cw + x);
        this.drawTile(base.g, z.layers.suelo[i], x * size, y * size, size);
        this.drawTile(base.g, z.layers.objetos[i], x * size, y * size, size);
        this.drawTile(top.g, z.layers.encima[i], x * size, y * size, size);
      }
    }
    c = { base: base.cv, top: top.cv };
    this.cache.set(key, c);
    return c;
  }

  // casillas visibles
  visibleCells() {
    const z = this.zone;
    const { w, h } = this.size;
    const a = this.toWorld(0, 0);
    const b = this.toWorld(w, h);
    return {
      x0: Math.max(0, Math.floor(a.x / TS)), y0: Math.max(0, Math.floor(a.y / TS)),
      x1: Math.min(z.W - 1, Math.floor(b.x / TS)), y1: Math.min(z.H - 1, Math.floor(b.y / TS)),
    };
  }

  draw() {
    const { ctx } = this;
    const z = this.zone;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const { w, h } = this.size;
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, w, h);
    if (!z || !this.images.tiles) return;
    const { zoom } = this.view;
    this.lastView = { ...this.view };
    const cell = this.visibleCells();
    // posición en pantalla de la casilla (redondeada para que no queden rayas entre tiles)
    const sx = (x) => Math.round((x * TS - this.view.x) * zoom);
    const sy = (y) => Math.round((y * TS - this.view.y) * zoom);

    if (zoom < 1) {
      const cpx = z.cw * TS;
      const cpy = z.ch * TS;
      for (let cy = Math.floor(cell.y0 / z.ch); cy <= Math.floor(cell.y1 / z.ch); cy++) {
        for (let cx = Math.floor(cell.x0 / z.cw); cx <= Math.floor(cell.x1 / z.cw); cx++) {
          const c = this.chunkCanvas(cx, cy);
          const p = this.toScreen(cx * cpx, cy * cpy);
          ctx.drawImage(c.base, Math.round(p.x), Math.round(p.y), Math.ceil(cpx * zoom), Math.ceil(cpy * zoom));
        }
      }
      this.drawPointSprites(cell);
      if (this.opts.encima) {
        ctx.globalAlpha = this.opts.encimaAlpha ?? 1;
        for (let cy = Math.floor(cell.y0 / z.ch); cy <= Math.floor(cell.y1 / z.ch); cy++) {
          for (let cx = Math.floor(cell.x0 / z.cw); cx <= Math.floor(cell.x1 / z.cw); cx++) {
            const c = this.chunkCanvas(cx, cy);
            const p = this.toScreen(cx * cpx, cy * cpy);
            ctx.drawImage(c.top, Math.round(p.x), Math.round(p.y), Math.ceil(cpx * zoom), Math.ceil(cpy * zoom));
          }
        }
        ctx.globalAlpha = 1;
      }
    } else {
      for (let y = cell.y0; y <= cell.y1; y++) {
        for (let x = cell.x0; x <= cell.x1; x++) {
          const i = y * z.W + x;
          const dx = sx(x);
          const dy = sy(y);
          const size = sx(x + 1) - dx;
          this.drawTile(ctx, z.layers.suelo[i], dx, dy, size);
          this.drawTile(ctx, z.layers.objetos[i], dx, dy, size);
        }
      }
      this.drawPointSprites(cell);
      if (this.opts.encima) {
        ctx.globalAlpha = this.opts.encimaAlpha ?? 1;
        for (let y = cell.y0; y <= cell.y1; y++) {
          for (let x = cell.x0; x <= cell.x1; x++) {
            const g = z.layers.encima[y * z.W + x];
            if (g) this.drawTile(ctx, g, sx(x), sy(y), sx(x + 1) - sx(x));
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    if (this.opts.paso) this.drawPassage(cell, sx, sy);
    if (this.opts.grid && zoom >= 0.75) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = cell.x0; x <= cell.x1 + 1; x++) { ctx.moveTo(sx(x) + 0.5, sy(cell.y0)); ctx.lineTo(sx(x) + 0.5, sy(cell.y1 + 1)); }
      for (let y = cell.y0; y <= cell.y1 + 1; y++) { ctx.moveTo(sx(cell.x0), sy(y) + 0.5); ctx.lineTo(sx(cell.x1 + 1), sy(y) + 0.5); }
      ctx.stroke();
    }
    if (this.opts.chunks) {
      ctx.strokeStyle = 'rgba(255,216,74,0.35)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (let cx = 0; cx <= z.columns; cx++) { ctx.moveTo(sx(cx * z.cw) + 0.5, sy(0)); ctx.lineTo(sx(cx * z.cw) + 0.5, sy(z.H)); }
      for (let cy = 0; cy <= z.rows; cy++) { ctx.moveTo(sx(0), sy(cy * z.ch) + 0.5); ctx.lineTo(sx(z.W), sy(cy * z.ch) + 0.5); }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.opts.subzonas) this.drawSubzones();
    if (this.opts.puntos) this.drawPointMarkers();
    this.drawOverlay(sx, sy);
    this.onAfterDraw?.();
  }

  // NPCs, recursos y aspas con su dibujo real (debajo de las copas, como en el juego)
  drawPointSprites(cell) {
    if (!this.opts.puntos) return;
    const { ctx } = this;
    const { zoom } = this.view;
    const minX = cell.x0 * TS - 64;
    const maxX = (cell.x1 + 2) * TS + 64;
    const minY = cell.y0 * TS - 64;
    const maxY = (cell.y1 + 2) * TS + 64;
    for (const p of this.zone.puntos) {
      const c = pointCenter(p);
      if (c.x < minX || c.x > maxX || c.y < minY || c.y > maxY) continue;
      let img = null;
      let frame = 0;
      let fw = 32;
      if (p.type === 'npc') img = this.images.npc?.[propOf(p, 'sprite')];
      else if (p.type === 'recurso') {
        const r = RESOURCE_FRAMES[propOf(p, 'tipo')];
        if (r) { img = this.images[r[0]]; [, frame] = r; }
      } else if (p.type === 'aspas') { img = this.images.aspas; fw = 72; }
      if (!img) continue;
      const s = this.toScreen(c.x - fw / 2, c.y - fw / 2);
      ctx.drawImage(img, frame * fw, 0, fw, fw, Math.round(s.x), Math.round(s.y), fw * zoom, fw * zoom);
    }
  }

  drawPassage(cell, sx, sy) {
    const { ctx } = this;
    const z = this.zone;
    const zoom = this.view.zoom;
    const detail = zoom >= 0.75;
    ctx.lineWidth = Math.max(1.5, 2 * zoom);
    for (let y = cell.y0; y <= cell.y1; y++) {
      for (let x = cell.x0; x <= cell.x1; x++) {
        const p = z.layers.paso[y * z.W + x];
        const dx = sx(x);
        const dy = sy(y);
        const s = sx(x + 1) - dx;
        if (!p) {
          if (z.blocked(x, y)) {
            ctx.fillStyle = 'rgba(255,60,60,0.22)';
            ctx.fillRect(dx, dy, s, s);
            if (detail) this.cross(dx, dy, s, 'rgba(255,120,120,0.55)');
          }
          continue;
        }
        if (p & PASO_CORNISA) {
          ctx.fillStyle = 'rgba(80,160,255,0.25)';
          ctx.fillRect(dx, dy, s, s);
          ctx.fillStyle = '#7ab8ff';
          ctx.beginPath();
          ctx.moveTo(dx + s * 0.25, dy + s * 0.3); ctx.lineTo(dx + s * 0.75, dy + s * 0.3); ctx.lineTo(dx + s / 2, dy + s * 0.75);
          ctx.fill();
          ctx.fillRect(dx, dy, s, Math.max(2, s * 0.1));
          continue;
        }
        if (!(p & PASO_FORZADO)) continue;
        const m = p & 15;
        if (m === 15) {
          ctx.fillStyle = 'rgba(255,40,40,0.45)';
          ctx.fillRect(dx, dy, s, s);
          this.cross(dx, dy, s, '#ff8080');
          continue;
        }
        if (m === 0) {
          ctx.fillStyle = 'rgba(60,255,120,0.18)';
          ctx.fillRect(dx, dy, s, s);
          ctx.strokeStyle = '#7dffa8';
          ctx.beginPath();
          ctx.arc(dx + s / 2, dy + s / 2, s * 0.28, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
        ctx.fillStyle = 'rgba(255,170,40,0.15)';
        ctx.fillRect(dx, dy, s, s);
        ctx.fillStyle = '#ffae3c';
        const t = Math.max(3, s * 0.14);
        if (m & 1) ctx.fillRect(dx, dy, s, t);
        if (m & 2) ctx.fillRect(dx + s - t, dy, t, s);
        if (m & 4) ctx.fillRect(dx, dy + s - t, s, t);
        if (m & 8) ctx.fillRect(dx, dy, t, s);
      }
    }
  }

  cross(dx, dy, s, color) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(dx + s * 0.3, dy + s * 0.3); ctx.lineTo(dx + s * 0.7, dy + s * 0.7);
    ctx.moveTo(dx + s * 0.7, dy + s * 0.3); ctx.lineTo(dx + s * 0.3, dy + s * 0.7);
    ctx.stroke();
  }

  drawSubzones() {
    const { ctx } = this;
    const sel = this.overlay.subzone;
    ctx.font = '600 12px Cinzel, Georgia, serif';
    for (const s of this.zone.subzonas) {
      const a = this.toScreen(s.x0, s.y0);
      const b = this.toScreen(s.x1, s.y1);
      const on = sel === s.uid;
      ctx.strokeStyle = on ? '#ffe066' : 'rgba(180,220,255,0.45)';
      ctx.lineWidth = on ? 2.5 : 1;
      ctx.setLineDash(on ? [] : [10, 6]);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.setLineDash([]);
      if (on) {
        ctx.fillStyle = 'rgba(255,224,102,0.08)';
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
      }
      const label = `${s.name}${s.levels ? ` · ${s.levels}` : ''}${s.safe ? ' · segura' : ''}`;
      this.label(label, a.x + 6, a.y + 16, on ? '#ffe066' : '#cfe6ff', 'left');
    }
  }

  drawPointMarkers() {
    const { ctx } = this;
    const sel = this.overlay.selected;
    const zoom = this.view.zoom;
    for (const p of this.zone.puntos) {
      const st = POINT_STYLE[p.type] ?? { color: '#ccc', label: p.type };
      const on = sel === p.uid;
      if (p.type === 'encuentro' || p.type === 'salida') {
        const exit = p.type === 'salida';
        const a = this.toScreen(p.x, p.y);
        const b = this.toScreen(p.x + p.width, p.y + p.height);
        ctx.fillStyle = exit ? (on ? 'rgba(125,255,168,0.25)' : 'rgba(125,255,168,0.12)') : (on ? 'rgba(255,122,217,0.18)' : 'rgba(255,122,217,0.07)');
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeStyle = exit ? '#7dffa8' : (on ? '#ffd0f2' : 'rgba(255,122,217,0.7)');
        ctx.lineWidth = on ? 2.5 : 1.5;
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        if (on) { ctx.fillStyle = exit ? '#7dffa8' : '#ffd0f2'; ctx.fillRect(b.x - 6, b.y - 6, 12, 12); }
        const dest = p.properties?.find((q) => q.name === 'destino')?.value;
        if (zoom >= 0.4 || on) this.label(exit ? `➜ ${dest ?? '?'}` : `⚔ ${p.name}`, a.x + 5, a.y + 14, exit ? '#b9ffcf' : '#ffd0f2', 'left');
        continue;
      }
      const c = pointCenter(p);
      const s = this.toScreen(c.x, c.y);
      const r = Math.max(5, 7 * Math.min(zoom, 1.5));
      ctx.lineWidth = on ? 3 : 1.5;
      ctx.strokeStyle = on ? '#ffffff' : st.color;
      ctx.fillStyle = `${st.color}33`;
      if (p.type === 'luz') {
        const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 40 * zoom);
        g.addColorStop(0, 'rgba(255,200,90,0.45)');
        g.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, 40 * zoom, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `${st.color}66`;
      }
      ctx.beginPath();
      if (p.type === 'poi' || p.type === 'jefe') {
        ctx.moveTo(s.x, s.y - r * 1.3); ctx.lineTo(s.x + r * 1.3, s.y); ctx.lineTo(s.x, s.y + r * 1.3); ctx.lineTo(s.x - r * 1.3, s.y); ctx.closePath();
      } else {
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      if (zoom >= 0.6 || on || p.type === 'jefe' || p.type === 'spawn') {
        const text = p.type === 'npc' ? String(propOf(p, 'nombre') ?? p.name).split(',')[0]
          : p.type === 'recurso' ? p.name
            : p.type === 'jefe' ? `☠ ${propOf(p, 'monstruo') ?? p.name}`
              : p.type === 'spawn' ? '⚑ Inicio'
                : p.type === 'luz' ? '' : p.name;
        if (text) this.label(text, s.x, s.y - r - 6, on ? '#ffffff' : st.color, 'center');
      }
    }
  }

  label(text, x, y, color, align) {
    const { ctx } = this;
    ctx.font = '600 11px "EB Garamond", Georgia, serif';
    ctx.textAlign = align;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,12,18,0.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  // cursor, vista previa del pincel, selección
  drawOverlay(sx, sy) {
    const { ctx } = this;
    const o = this.overlay;
    const z = this.zone;
    if (o.stamp && o.cursor) {
      // vista previa del sello (tiles o lo copiado) semitransparente
      ctx.globalAlpha = 0.6;
      const { w, h } = o.stamp;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const tx = o.cursor.x + x;
          const ty = o.cursor.y + y;
          if (!z.inside(tx, ty)) continue;
          const size = sx(tx + 1) - sx(tx);
          for (const g of o.stamp.layersAt(x, y)) this.drawTile(ctx, g, sx(tx), sy(ty), size);
        }
      }
      ctx.globalAlpha = 1;
    }
    if (o.rect) {
      const { x0, y0, x1, y1 } = o.rect;
      ctx.strokeStyle = o.rectColor ?? '#ffe066';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx(x0), sy(y0), sx(x1 + 1) - sx(x0), sy(y1 + 1) - sy(y0));
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,224,102,0.08)';
      ctx.fillRect(sx(x0), sy(y0), sx(x1 + 1) - sx(x0), sy(y1 + 1) - sy(y0));
      this.label(`${x1 - x0 + 1}×${y1 - y0 + 1}`, sx(x1 + 1) + 4, sy(y1 + 1) + 4, '#ffe066', 'left');
    }
    if (o.cursor) {
      const { x, y } = o.cursor;
      const w = o.cursor.w ?? 1;
      const h = o.cursor.h ?? 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx(x) + 0.5, sy(y) + 0.5, sx(x + w) - sx(x) - 1, sy(y + h) - sy(y) - 1);
      if (o.edge != null) {
        // borde que se va a abrir/cerrar en el modo de paso por bordes
        const s = sx(x + 1) - sx(x);
        const t = Math.max(3, s * 0.16);
        ctx.fillStyle = '#ffffff';
        const e = o.edge;
        if (e === 1) ctx.fillRect(sx(x), sy(y), s, t);
        if (e === 2) ctx.fillRect(sx(x + 1) - t, sy(y), t, s);
        if (e === 4) ctx.fillRect(sx(x), sy(y + 1) - t, s, t);
        if (e === 8) ctx.fillRect(sx(x), sy(y), t, s);
      }
    }
  }
}

// ------------------------------------------------------------ minimapa (1 píxel por casilla)
export function tileColors(img, count, columns) {
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, img.width, img.height).data;
  const colors = new Array(count + 1).fill(null);
  for (let i = 0; i < count; i++) {
    const ox = (i % columns) * TS;
    const oy = Math.floor(i / columns) * TS;
    let r = 0; let gg = 0; let b = 0; let n = 0;
    for (let y = 0; y < TS; y += 2) {
      for (let x = 0; x < TS; x += 2) {
        const k = ((oy + y) * img.width + (ox + x)) * 4;
        if (data[k + 3] < 128) continue;
        r += data[k]; gg += data[k + 1]; b += data[k + 2]; n += 1;
      }
    }
    colors[i + 1] = n ? [r / n, gg / n, b / n, n / ((TS / 2) * (TS / 2))] : null;
  }
  return colors;
}

export function paintMinimap(canvas, zone, colors, bbox = null) {
  if (canvas.width !== zone.W || canvas.height !== zone.H) { canvas.width = zone.W; canvas.height = zone.H; bbox = null; }
  const g = canvas.getContext('2d');
  const x0 = bbox ? Math.max(0, bbox.x0 - 1) : 0;
  const y0 = bbox ? Math.max(0, bbox.y0 - 1) : 0;
  const x1 = bbox ? Math.min(zone.W - 1, bbox.x1 + 1) : zone.W - 1;
  const y1 = bbox ? Math.min(zone.H - 1, bbox.y1 + 1) : zone.H - 1;
  const img = g.createImageData(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * zone.W + x;
      let c = colors[zone.layers.suelo[i]] ?? [30, 30, 30, 1];
      for (const l of ['objetos', 'encima']) {
        const o = colors[zone.layers[l][i]];
        // mezcla según cuánto del tile está pintado (un farol tapa poco, un árbol mucho)
        if (o) c = c.map((v, k) => (k < 3 ? v * (1 - o[3]) + o[k] * o[3] : 1));
      }
      const k = ((y - y0) * img.width + (x - x0)) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, x0, y0);
}
