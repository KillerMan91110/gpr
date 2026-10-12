// pradera_preview.json -> pradera_preview.bmp (para revisar el diseño del mapa)
const fs = require('fs');
const { w, h, rows } = JSON.parse(fs.readFileSync(__dirname + '/pradera_preview.json'));
const rowSize = Math.ceil((w * 3) / 4) * 4;
const buf = Buffer.alloc(54 + rowSize * h);
buf.write('BM'); buf.writeUInt32LE(buf.length, 2); buf.writeUInt32LE(54, 10); buf.writeUInt32LE(40, 14);
buf.writeInt32LE(w, 18); buf.writeInt32LE(h, 22); buf.writeUInt16LE(1, 26); buf.writeUInt16LE(24, 28); buf.writeUInt32LE(rowSize * h, 34);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const [r, g, b] = rows[y][x]; const o = 54 + (h - 1 - y) * rowSize + x * 3;
  buf[o] = b; buf[o + 1] = g; buf[o + 2] = r;
}
fs.writeFileSync(__dirname + '/pradera_preview.bmp', buf);
