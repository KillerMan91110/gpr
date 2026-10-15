-- Equipo de las 5 clases base de Etheria: íconos de la mochila y piezas de combate.
--
-- Cada pieza tiene una FORMA (espada, hacha, arco, escudo, yelmo, túnica…) y un SET (Pradera,
-- Volcán, Océano, Lich…). Las formas se dibujan una vez con "papeles" de color (metal, adorno,
-- tela, madera, gema) y cada set pone sus colores en esos papeles.
--
-- Genera (en <dir>/equipo/):
--   iconos.png / iconos.json   atlas de 32x32: una fila por forma, una columna por set
--   paletas.json               colores de cada set por papel + los colores "llave" del combate
--   combate/<forma>.png        hojas de combate (48x48, los mismos 19 cuadros que las clases de
--                              crear_sprites_v2.lua) pintadas con colores llave: el juego las
--                              repinta con el set del arma equipada (game/gear.js)
-- Uso: aseprite -b --script-param dir=D:/Sprites/v2 --script crear_equipo.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local dir = app.params.dir

-- ---------------------------------------------------------------- papeles y sets
-- m1..m3 metal (claro, medio, oscuro) · t1,t2 adorno · c0..c3 tela/cuero · g1,g2 gema
-- w1,w2 madera/empuñadura (iguales en todos) · K contorno · W brillo
local ROLES = {"m1","m2","m3","t1","t2","c0","c1","c2","c3","g1","g2","w1","w2"}
local SETS = {
  {"hierro",        {"c8d0dc","8a96a8","555f70", "b07a48","6a4428", "d8b088","a87848","7a5430","4f2e1c", "c8d0dc","8a96a8"}},
  {"acero",         {"e4ecf4","a8b4c8","6a7488", "8ab0d8","4a6a98", "8aa4d8","5a74b0","3a5088","24345c", "8ad8ff","2f6fe0"}},
  {"pradera",       {"dfe6ec","9aa6b4","5e6878", "e8c050","a8802c", "b8e890","7ab858","4f8a3c","2c5420", "c8ff8a","4f9a3a"}},
  {"montana",       {"d8dce4","9aa0ac","5a606e", "c8b898","8a7a5a", "c0b8a8","8a8274","5e5850","3a3632", "b8e0ff","5a8ab8"}},
  {"capitan",       {"e8eef4","a8b2c0","626c7c", "ffe070","c09030", "f0907a","d0443a","8a2430","4a1218", "ffe890","d09a30"}},
  {"titan",         {"fff4b8","e8bc48","a07a24", "fffae0","c8962c", "f8d488","d09a48","9a6a28","5e3e14", "fff8d0","f0b840"}},
  {"acantilado",    {"d0dce8","8a9ab0","4e5c74", "a8b8c8","647490", "a8bcd0","7088a8","4a5e7a","2c3a50", "e0f4ff","70a8d8"}},
  {"volcan",        {"8e807c","5c4c4a","342828", "ff9a4a","c0502a", "ffa060","e0602a","9a3018","541810", "ffe070","ff6a2a"}},
  {"rey_montana",   {"eeeef8","b4b4cc","6c6c8c", "d0b0ff","8460c8", "c0a8f0","8a68d0","5a4098","342460", "f0dcff","a070e8"}},
  {"caldera",       {"746462","4a3e3c","2a2020", "ffb04a","d06a1a", "f07a3a","b83a1e","701e12","3e0e08", "fff0a0","ff9020"}},
  {"titan_fuego",   {"ffe0a0","f0903a","a8461c", "fff0a0","e0a030", "ffb060","ec6a32","a8361c","621810", "fffad8","ffc040"}},
  {"costas",        {"dcf4f0","94c8c0","4c7c76", "eedcaa","b49c6a", "88e0d0","48aa98","2a7468","164640", "d0fff6","48d8bc"}},
  {"oceano",        {"d4ecff","7cace4","3c6caa", "a8f0ff","48b0d8", "78b4f0","3a78d0","22508e","12305e", "d0f8ff","48c8ff"}},
  {"profundidades", {"5c7c9c","34506e","1c2c44", "60f4d4","2a9e8a", "3e6494","26406e","162a4c","0c182e", "90ffe8","28d4b2"}},
  {"tundra",        {"f4faff","c4e0f4","7ca4c4", "dcf6ff","8cc8e8", "eef6fc","b4d4ec","74a0c8","40668e", "ffffff","a0e4ff"}},
  {"rey_hielo",     {"ffffff","bcecff","5cacdc", "e4f4ff","8cbce4", "b4e4ff","5cb4ec","2e74b8","1a4074", "ecffff","70f0ff"}},
  {"catacumbas",    {"ece0bc","bcac84","7c7056", "a4d878","5c8c3c", "8a9a72","5e6e4a","3c4a2e","222c1a", "b8ff80","5cd04a"}},
  {"lich",          {"7c6c8e","4e425e","2c243a", "c0b0ee","7c6abc", "7a5a9e","543a7e","34225a","1c1236", "ccff90","6ce04a"}},
  {"ancestral",     {"f4eac4","ccb47c","8c7442", "90f4dc","3cac94", "e4cc94","b49458","70582e","40321a", "b0fff2","3ce4c4"}},
  {"arcano",        {"e4ecff","9cacec","5c6cac", "ccacff","7c5ac4", "a48cf0","6c4cc8","44309a","261a5c", "dcf6ff","70c4ff"}},
  {"sagrado",       {"ffffff","dce4f2","8c9cba", "ffe070","c09030", "fcfcff","e0e4f0","b0b8cc","74809a", "8ad8ff","3a7ae0"}},
  {"vigia",         {"f0cc90","c08848","7a5028", "ffd86a","c09030", "8aa8e8","4a6ad8","2e4478","1c2c50", "fff4b0","ffd86a"}},
}
local WOOD = {"a8703c","6a4428"}
local SET_INDEX = {}
for i, s in ipairs(SETS) do SET_INDEX[s[1]] = i end

local BASE = {K=hex("141420"), W=hex("ffffff"), D=hex("1c1828"), S=hex("f0e6d0")}
local function paletteOf(i)
  local p = {}
  for k, c in pairs(BASE) do p[k] = c end
  local cols = SETS[i][2]
  for j = 1, 11 do p[ROLES[j]] = hex(cols[j]) end
  p.w1 = hex(WOOD[1]); p.w2 = hex(WOOD[2])
  return p
end
-- colores "llave" de las hojas de combate (el juego los cambia por los del set)
local KEYS = {}
for j, r in ipairs(ROLES) do KEYS[r] = string.format("%02x%02x%02x", 250, j * 9, 250 - j * 7) end
local KEYPAL = {}
for k, c in pairs(BASE) do KEYPAL[k] = c end
for r, h in pairs(KEYS) do KEYPAL[r] = hex(h) end
KEYPAL.w1 = hex(WOOD[1]); KEYPAL.w2 = hex(WOOD[2]) -- la madera no cambia

-- ---------------------------------------------------------------- lienzo
local function newGrid(W, H, ground)
  ground = ground or H - 1
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x >= 0 and x < W and y >= 0 and y < H and y <= ground then g[y * W + x] = c end
  end
  function G.get(x, y) return g[y * W + x] end
  function G.rect(x0, y0, x1, y1, c) for y = y0, y1 do for x = x0, x1 do G.px(x, y, c) end end end
  function G.line(x0, y0, x1, y1, c)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
    for i = 0, n do G.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c) end
  end
  function G.thick(x0, y0, x1, y1, w, c)
    local vertical = math.abs(y1 - y0) >= math.abs(x1 - x0)
    for t = 0, w - 1 do
      local o = t - (w - 1) // 2
      if vertical then G.line(x0 + o, y0, x1 + o, y1, c) else G.line(x0, y0 + o, x1, y1 + o, c) end
    end
  end
  function G.ellipse(cx, cy, rx, ry, c)
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 then G.px(x, y, c) end
    end end
  end
  -- polígono relleno (lista de puntos)
  function G.poly(pts, c)
    local miny, maxy = math.huge, -math.huge
    for _, p in ipairs(pts) do miny = math.min(miny, p[2]); maxy = math.max(maxy, p[2]) end
    for y = math.floor(miny), math.ceil(maxy) do
      local xs = {}
      for i = 1, #pts do
        local a, b = pts[i], pts[i % #pts + 1]
        if (a[2] <= y and b[2] > y) or (b[2] <= y and a[2] > y) then
          xs[#xs + 1] = a[1] + (y - a[2]) * (b[1] - a[1]) / (b[2] - a[2])
        end
      end
      table.sort(xs)
      for i = 1, #xs - 1, 2 do for x = math.ceil(xs[i]), math.floor(xs[i + 1]) do G.px(x, y, c) end end
    end
  end
  return G
end

local function outline(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y = 0, H - 1 do for x = 0, W - 1 do
    if not g[y * W + x] then
      for _, o in ipairs({{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) do
        local nx, ny = x + o[1], y + o[2]
        local n = (nx >= 0 and nx < W and ny >= 0 and ny < H) and g[ny * W + nx]
        if n and n ~= "K" then out[y * W + x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
end

local function paint(img, G, pal, ox, oy)
  for k, c in pairs(G.g) do img:drawPixel(ox + k % G.w, oy + k // G.w, pal[c] or BASE.K) end
end

-- ---------------------------------------------------------------- formas de los íconos (32x32)
-- hoja recta en diagonal (de abajo-izquierda hacia arriba-derecha) con filo claro y lomo oscuro
local function diagBlade(G, x0, y0, len, w)
  for i = 0, len do
    local x, y = x0 + i, y0 - i
    G.px(x, y, "m2"); G.px(x + 1, y, "m1")
    if w >= 3 then G.px(x, y + 1, "m3") end
    if w >= 4 then G.px(x + 1, y + 1, "m2"); G.px(x + 2, y, "m1") end
  end
  G.px(x0 + len + 1, y0 - len - 1, "m1")
end

local ICONS = {}
local function icon(name, draw) ICONS[#ICONS + 1] = {name = name, draw = draw} end

icon("espada", function(G)
  diagBlade(G, 10, 21, 15, 3)
  G.line(6, 18, 13, 25, "t1"); G.line(7, 18, 14, 25, "t2")
  G.thick(5, 26, 9, 22, 2, "w2"); G.px(6, 25, "w1")
  G.ellipse(4, 27, 1.5, 1.5, "g1")
end)
icon("gran_espada", function(G)
  diagBlade(G, 11, 20, 16, 4)
  G.line(5, 16, 15, 26, "t1"); G.line(6, 16, 16, 26, "t2"); G.px(10, 21, "g1")
  G.thick(3, 28, 9, 22, 2, "w2"); G.px(5, 26, "w1"); G.px(7, 24, "w1")
  G.ellipse(3, 28, 1.5, 1.5, "t1")
end)
icon("hacha", function(G)
  G.thick(5, 28, 21, 8, 2, "w1"); G.line(6, 28, 22, 8, "w2")
  G.poly({{17, 6}, {26, 3}, {29, 10}, {27, 17}, {20, 14}}, "m2")
  G.line(26, 3, 29, 10, "m1"); G.line(29, 10, 27, 17, "m1"); G.line(20, 14, 27, 17, "m3")
  G.poly({{16, 9}, {12, 7}, {13, 12}}, "m3")
  G.rect(19, 9, 21, 11, "t1"); G.px(20, 10, "g1")
  G.rect(5, 26, 7, 28, "t2")
end)
icon("espada_runica", function(G)
  diagBlade(G, 10, 21, 15, 3)
  for i = 2, 14, 3 do G.px(10 + i, 21 - i, "g1"); G.px(11 + i, 21 - i, "g2") end
  G.line(6, 18, 13, 25, "t1"); G.line(7, 18, 14, 25, "t2"); G.ellipse(10, 22, 1.5, 1.5, "g1")
  G.thick(5, 26, 9, 22, 2, "w2")
  G.ellipse(4, 27, 1.5, 1.5, "g2")
end)
icon("daga", function(G)
  diagBlade(G, 13, 18, 9, 3)
  G.line(10, 16, 15, 21, "t1"); G.line(11, 16, 16, 21, "t2")
  G.thick(8, 23, 12, 19, 2, "w2")
  G.ellipse(7, 24, 1.5, 1.5, "t1")
end)
icon("arco", function(G)
  for k = -13, 13 do
    local x = 9 + math.floor(9 * math.cos(math.pi * k / 28) + 0.5)
    G.px(x, 16 + k, (math.abs(k) >= 11) and "t1" or "w1"); G.px(x + 1, 16 + k, (math.abs(k) >= 11) and "t2" or "w2")
  end
  G.line(9, 3, 9, 29, "S")
  G.rect(17, 14, 19, 18, "c1"); G.px(18, 16, "c0")
  G.line(10, 16, 26, 16, "w1"); G.poly({{26, 14}, {29, 16}, {26, 18}}, "m1"); G.px(10, 15, "c1"); G.px(10, 17, "c1")
end)
icon("ballesta", function(G)
  G.thick(6, 26, 20, 12, 3, "w1"); G.line(7, 27, 21, 13, "w2")
  G.line(11, 7, 26, 22, "m2"); G.line(12, 7, 27, 22, "m1"); G.line(10, 8, 25, 23, "m3")
  G.line(11, 7, 15, 17, "S"); G.line(26, 22, 16, 18, "S")
  G.line(15, 17, 26, 6, "w2"); G.poly({{25, 5}, {29, 3}, {27, 7}}, "m1")
  G.rect(16, 15, 18, 17, "t1"); G.rect(5, 25, 7, 27, "t2")
end)
icon("baculo_arcano", function(G)
  G.thick(4, 29, 20, 13, 2, "w1"); G.line(5, 29, 21, 13, "w2")
  for _, o in ipairs({{19, 9}, {27, 9}, {19, 16}, {26, 16}}) do G.line(o[1], o[2], 23, 12, "t1") end
  G.ellipse(23, 9, 4.5, 4.5, "g2"); G.ellipse(22, 8, 3, 3, "g1"); G.px(21, 7, "W"); G.px(22, 7, "W")
  G.rect(11, 21, 13, 23, "t2")
end)
icon("varita", function(G)
  G.thick(8, 26, 20, 14, 2, "w2"); G.line(8, 25, 20, 13, "w1")
  G.rect(10, 22, 12, 24, "t1"); G.rect(17, 15, 18, 16, "t2")
  local cx, cy = 23, 10
  G.line(cx - 4, cy, cx + 4, cy, "g1"); G.line(cx, cy - 4, cx, cy + 4, "g1")
  G.line(cx - 2, cy - 2, cx + 2, cy + 2, "g2"); G.line(cx - 2, cy + 2, cx + 2, cy - 2, "g2")
  G.px(cx, cy, "W")
end)
icon("baculo_sagrado", function(G)
  G.thick(4, 29, 19, 14, 2, "t1"); G.line(5, 29, 20, 14, "t2")
  G.ellipse(23, 9, 6, 6, "t1"); G.ellipse(23, 9, 4, 4, nil)
  for y = 5, 13 do for x = 19, 27 do
    local d = math.sqrt((x - 23) ^ 2 + (y - 9) ^ 2)
    if d < 4 then G.g[y * 32 + x] = nil end
  end end
  G.ellipse(23, 9, 2.2, 2.2, "g1"); G.px(22, 8, "W")
  G.line(23, 1, 23, 3, "t1"); G.line(29, 9, 31, 9, "t1"); G.line(15, 9, 17, 9, "t1")
end)
-- mano secundaria
icon("escudo", function(G)
  G.poly({{6, 4}, {26, 4}, {26, 15}, {16, 28}, {6, 15}}, "m2")
  G.poly({{8, 6}, {24, 6}, {24, 15}, {16, 25}, {8, 15}}, "c1")
  G.poly({{16, 6}, {24, 6}, {24, 15}, {16, 25}}, "c2")
  G.line(6, 4, 26, 4, "m1"); G.line(6, 4, 6, 15, "m1")
  G.rect(15, 6, 17, 24, "t1"); G.rect(8, 12, 24, 13, "t1")
  G.ellipse(16, 12.5, 2.5, 2.5, "g1"); G.px(15, 11, "W")
end)
icon("carcaj", function(G)
  for i, f in ipairs({{11, 4}, {15, 3}, {19, 5}}) do
    G.line(f[1] + 2, f[2] + 6, f[1] + 5, f[2] + 14, "w2")
    G.poly({{f[1], f[2]}, {f[1] + 3, f[2] + 1}, {f[1] + 3, f[2] + 5}, {f[1] + 1, f[2] + 5}}, i == 2 and "g1" or "c0")
  end
  G.poly({{9, 14}, {19, 10}, {26, 26}, {16, 30}}, "c2")
  G.poly({{11, 14}, {19, 11}, {25, 25}, {17, 28}}, "c1")
  G.line(10, 15, 19, 11, "t1"); G.line(12, 20, 21, 16, "t2"); G.line(14, 25, 23, 21, "t2")
  G.line(9, 14, 16, 30, "c3")
end)
icon("orbe", function(G)
  G.poly({{9, 27}, {23, 27}, {20, 22}, {12, 22}}, "t2")
  G.line(10, 26, 22, 26, "t1")
  G.line(11, 22, 9, 16, "t1"); G.line(21, 22, 23, 16, "t1")
  G.ellipse(16, 13, 8, 8, "g2"); G.ellipse(15, 12, 6, 6, "g1")
  G.ellipse(13, 10, 2, 2, "W"); G.px(19, 17, "W")
end)
icon("cristal", function(G)
  G.poly({{16, 2}, {22, 10}, {20, 24}, {12, 24}, {10, 10}}, "g2")
  G.poly({{16, 2}, {22, 10}, {16, 24}}, "g1")
  G.line(16, 2, 16, 24, "W")
  G.poly({{8, 14}, {11, 18}, {10, 25}, {7, 25}, {6, 18}}, "g2"); G.poly({{24, 15}, {26, 19}, {25, 25}, {22, 25}, {22, 19}}, "g1")
  G.rect(6, 25, 26, 28, "m2"); G.line(6, 25, 26, 25, "m1"); G.rect(9, 28, 23, 29, "m3")
end)
icon("daga_gemela", function(G)
  -- en espejo: la hoja apunta arriba a la izquierda y la guarda es curva
  for i = 0, 9 do local x, y = 19 - i, 18 - i; G.px(x, y, "m2"); G.px(x - 1, y, "m1"); G.px(x, y + 1, "m3") end
  G.px(8, 7, "m1")
  G.line(16, 21, 18, 18, "t1"); G.line(19, 17, 22, 15, "t1"); G.px(15, 22, "t2"); G.px(23, 14, "t2")
  G.thick(20, 20, 24, 24, 2, "w2")
  G.ellipse(25, 25, 1.5, 1.5, "g1")
end)
icon("simbolo", function(G)
  G.line(16, 1, 12, 7, "m2"); G.line(16, 1, 20, 7, "m2")
  for a = 0, 7 do
    local ang = a * math.pi / 4
    G.line(16 + math.cos(ang) * 7, 17 + math.sin(ang) * 7, 16 + math.cos(ang) * 12, 17 + math.sin(ang) * 12, "t2")
  end
  G.ellipse(16, 17, 8, 8, "t1"); G.ellipse(16, 17, 6, 6, "c0")
  G.rect(15, 12, 17, 22, "t2"); G.rect(11, 15, 21, 17, "t2")
  G.ellipse(16, 16.5, 1.6, 1.6, "g1")
end)
-- cabeza
icon("yelmo", function(G)
  G.ellipse(16, 15, 10, 11, "m2"); G.ellipse(14, 13, 7, 8, "m1")
  G.rect(6, 15, 26, 26, "m2"); G.rect(22, 15, 26, 26, "m3")
  G.rect(8, 16, 24, 18, "D"); G.rect(15, 16, 17, 25, "m3")
  for y = 20, 24, 2 do G.rect(9, y, 13, y, "D"); G.rect(19, y, 23, y, "D") end
  G.rect(6, 26, 26, 27, "t1")
  G.thick(16, 4, 22, 0, 2, "c1"); G.px(15, 4, "c2"); G.px(23, 1, "c0")
end)
icon("capucha", function(G)
  G.poly({{16, 2}, {27, 14}, {28, 28}, {4, 28}, {5, 14}}, "c1")
  G.poly({{16, 2}, {27, 14}, {28, 28}, {20, 28}}, "c2")
  G.ellipse(16, 18, 6.5, 8, "D"); G.px(14, 17, "W"); G.px(18, 17, "W")
  G.line(9, 11, 16, 4, "c0"); G.line(4, 28, 28, 28, "t1"); G.line(9, 26, 23, 26, "t2")
end)
icon("capirote", function(G)
  G.poly({{17, 1}, {24, 21}, {9, 21}}, "c1"); G.poly({{17, 1}, {24, 21}, {18, 21}}, "c2")
  G.line(17, 1, 21, 4, "c1"); G.px(22, 5, "c2")
  G.ellipse(16, 23, 14, 4, "c2"); G.ellipse(16, 22, 13, 3, "c1")
  G.rect(9, 18, 24, 20, "t1"); G.rect(15, 18, 17, 20, "g1")
  G.px(14, 10, "g1"); G.px(13, 11, "g1"); G.px(15, 11, "g1"); G.px(14, 12, "g1")
end)
icon("mascara", function(G)
  G.poly({{4, 10}, {28, 10}, {26, 20}, {18, 24}, {14, 24}, {6, 20}}, "c1")
  G.poly({{16, 10}, {28, 10}, {26, 20}, {18, 24}, {16, 24}}, "c2")
  G.ellipse(10, 15, 3, 2, "D"); G.ellipse(22, 15, 3, 2, "D")
  G.line(4, 10, 28, 10, "c0"); G.line(14, 22, 18, 22, "t1")
  G.line(1, 12, 4, 13, "t2"); G.line(28, 13, 31, 12, "t2")
  G.px(10, 12, "t1"); G.px(22, 12, "t1")
end)
icon("diadema", function(G)
  for x = 3, 29 do
    local y = 21 - math.floor(8 * math.sin(math.pi * (x - 3) / 26) + 0.5)
    G.px(x, y - 1, "t1"); G.px(x, y, "t1"); G.px(x, y + 1, "t2"); G.px(x, y + 2, "t2")
  end
  G.poly({{16, 3}, {21, 10}, {16, 15}, {11, 10}}, "t1"); G.poly({{16, 3}, {21, 10}, {16, 15}}, "t2")
  G.ellipse(16, 10, 2.5, 3.2, "g1"); G.px(15, 8, "W")
  G.poly({{8, 12}, {10, 15}, {8, 18}, {6, 15}}, "t1"); G.ellipse(8, 15, 1.2, 1.2, "g2")
  G.poly({{24, 12}, {26, 15}, {24, 18}, {22, 15}}, "t1"); G.ellipse(24, 15, 1.2, 1.2, "g2")
end)
-- torso
icon("placas", function(G)
  G.poly({{9, 8}, {23, 8}, {25, 18}, {22, 24}, {10, 24}, {7, 18}}, "m2")
  G.poly({{16, 8}, {23, 8}, {25, 18}, {22, 24}, {16, 24}}, "m3")
  G.poly({{12, 8}, {20, 8}, {16, 12}}, "D"); G.line(12, 8, 16, 12, "t1"); G.line(20, 8, 16, 12, "t1")
  G.line(10, 10, 10, 18, "m1"); G.line(11, 10, 11, 14, "m1"); G.line(16, 13, 16, 23, "m1")
  G.ellipse(6, 10, 4, 3.5, "m1"); G.ellipse(26, 10, 4, 3.5, "m2")
  G.line(2, 12, 9, 13, "t2"); G.line(23, 13, 30, 12, "t2")
  G.rect(8, 20, 24, 21, "t1"); G.rect(15, 20, 17, 21, "g1")
  G.rect(9, 24, 23, 25, "m2"); G.rect(10, 26, 22, 27, "m3"); G.line(9, 24, 23, 24, "m1"); G.line(10, 28, 22, 28, "t2")
end)
icon("gaban", function(G)
  G.poly({{10, 3}, {22, 3}, {27, 29}, {5, 29}}, "c1")
  G.poly({{16, 3}, {22, 3}, {27, 29}, {16, 29}}, "c2")
  G.poly({{10, 3}, {16, 9}, {22, 3}, {20, 2}, {12, 2}}, "c0")
  G.line(16, 9, 16, 29, "c3")
  G.rect(7, 17, 25, 18, "w2"); G.rect(15, 16, 17, 19, "t1")
  G.px(14, 11, "t1"); G.px(14, 14, "t1"); G.line(5, 29, 27, 29, "t2")
end)
icon("tunica", function(G)
  G.poly({{11, 3}, {21, 3}, {25, 12}, {22, 12}, {26, 29}, {6, 29}, {10, 12}, {7, 12}}, "c1")
  G.poly({{16, 3}, {21, 3}, {25, 12}, {22, 12}, {26, 29}, {16, 29}}, "c2")
  G.line(16, 3, 16, 29, "t1"); G.line(6, 28, 26, 28, "t1"); G.line(7, 12, 10, 12, "t2"); G.line(22, 12, 25, 12, "t2")
  G.rect(9, 15, 23, 16, "g2"); G.px(16, 15, "g1")
  G.ellipse(16, 5, 3, 2, "D")
end)
icon("cuero", function(G)
  G.poly({{9, 4}, {23, 4}, {25, 24}, {16, 28}, {7, 24}}, "c2")
  G.poly({{16, 4}, {23, 4}, {25, 24}, {16, 28}}, "c3")
  G.line(9, 7, 23, 21, "w2"); G.line(23, 7, 9, 21, "w2")
  G.rect(15, 13, 17, 15, "t1")
  G.rect(8, 22, 24, 23, "w1"); G.rect(15, 21, 17, 24, "t2")
  G.poly({{12, 4}, {16, 9}, {20, 4}}, "D"); G.line(9, 4, 9, 22, "c1")
end)
icon("vestidura", function(G)
  G.poly({{11, 3}, {21, 3}, {26, 13}, {22, 13}, {25, 29}, {7, 29}, {10, 13}, {6, 13}}, "S")
  G.poly({{16, 3}, {21, 3}, {26, 13}, {22, 13}, {25, 29}, {16, 29}}, "c1")
  G.rect(13, 4, 19, 29, "c0"); G.line(13, 4, 13, 29, "t1"); G.line(19, 4, 19, 29, "t1")
  G.rect(15, 10, 17, 20, "t1"); G.rect(13, 13, 19, 14, "t1"); G.px(16, 13, "g1")
  G.line(7, 28, 25, 28, "t2")
end)
-- manos
icon("guanteletes", function(G)
  G.poly({{8, 4}, {20, 4}, {22, 14}, {26, 18}, {24, 22}, {20, 20}, {20, 28}, {8, 28}}, "m2")
  G.poly({{14, 4}, {20, 4}, {22, 14}, {26, 18}, {24, 22}, {20, 20}, {20, 28}, {14, 28}}, "m3")
  for y = 6, 12, 3 do G.line(9, y, 19, y, "m1") end
  G.rect(7, 22, 21, 28, "t1"); G.rect(7, 27, 21, 28, "t2"); G.ellipse(14, 25, 1.5, 1.5, "g1")
end)
icon("guantes", function(G)
  G.poly({{9, 3}, {19, 3}, {20, 13}, {25, 16}, {23, 20}, {19, 18}, {19, 26}, {9, 26}}, "c1")
  G.poly({{15, 3}, {19, 3}, {20, 13}, {25, 16}, {23, 20}, {19, 18}, {19, 26}, {15, 26}}, "c2")
  for x = 11, 17, 3 do G.line(x, 3, x, 9, "c3") end
  G.rect(8, 22, 20, 28, "w1"); G.line(8, 28, 20, 28, "w2"); G.px(14, 25, "t1")
end)
icon("guantes_tela", function(G)
  G.poly({{9, 3}, {19, 3}, {20, 13}, {25, 16}, {23, 20}, {19, 18}, {19, 26}, {9, 26}}, "c0")
  G.poly({{15, 3}, {19, 3}, {20, 13}, {25, 16}, {23, 20}, {19, 18}, {19, 26}, {15, 26}}, "c1")
  for x = 11, 17, 3 do G.line(x, 3, x, 9, "c2") end
  G.poly({{6, 21}, {22, 21}, {24, 29}, {4, 29}}, "c2"); G.line(5, 25, 23, 25, "t1")
end)
icon("guantes_bendecidos", function(G)
  G.poly({{9, 3}, {19, 3}, {20, 13}, {25, 16}, {23, 20}, {19, 18}, {19, 26}, {9, 26}}, "S")
  G.poly({{15, 3}, {19, 3}, {20, 13}, {25, 16}, {23, 20}, {19, 18}, {19, 26}, {15, 26}}, "c0")
  G.rect(8, 21, 20, 28, "t1"); G.line(8, 28, 20, 28, "t2"); G.line(8, 21, 20, 21, "t2")
  G.ellipse(14, 24.5, 2, 2, "g1"); G.px(13, 12, "t1"); G.px(14, 11, "t1"); G.px(14, 13, "t1"); G.px(15, 12, "t1")
end)
-- pies
icon("botas_pesadas", function(G)
  G.poly({{8, 3}, {19, 3}, {19, 20}, {28, 23}, {28, 29}, {6, 29}, {7, 20}}, "m2")
  G.poly({{14, 3}, {19, 3}, {19, 20}, {28, 23}, {28, 29}, {14, 29}}, "m3")
  for y = 6, 15, 3 do G.line(8, y, 18, y, "m1") end
  G.rect(6, 27, 28, 29, "D"); G.rect(7, 17, 19, 19, "t1"); G.px(12, 18, "g1")
end)
icon("botas", function(G)
  G.poly({{9, 3}, {18, 3}, {18, 20}, {27, 23}, {27, 28}, {7, 28}, {8, 20}}, "c1")
  G.poly({{14, 3}, {18, 3}, {18, 20}, {27, 23}, {27, 28}, {14, 28}}, "c2")
  G.rect(8, 3, 18, 6, "c0"); G.line(8, 6, 18, 6, "c3")
  G.rect(7, 27, 27, 29, "w2"); G.rect(8, 15, 18, 16, "w1"); G.rect(12, 14, 14, 17, "t1")
end)
icon("sandalias", function(G)
  G.poly({{3, 25}, {27, 23}, {29, 26}, {4, 28}}, "w1"); G.line(4, 28, 29, 26, "w2")
  G.poly({{4, 21}, {11, 20}, {11, 25}, {4, 26}}, "c2")
  G.thick(17, 24, 27, 21, 3, "c1"); G.line(17, 22, 27, 19, "c0")
  G.thick(11, 25, 15, 17, 2, "c1"); G.thick(15, 25, 11, 17, 2, "c2")
  G.rect(9, 6, 15, 16, "c0"); G.rect(13, 6, 15, 16, "c1")
  for y = 8, 14, 3 do G.line(9, y, 15, y + 1, "c2") end
  G.ellipse(13, 17, 1.8, 1.8, "t1"); G.px(12, 16, "W")
end)

do
  local cols, rows = #SETS, #ICONS
  local img = Image(cols * 32, rows * 32, ColorMode.RGB)
  for r, ic in ipairs(ICONS) do
    local G = newGrid(32, 32)
    ic.draw(G)
    outline(G)
    for c = 1, cols do paint(img, G, paletteOf(c), (c - 1) * 32, (r - 1) * 32) end
  end
  local spr = Sprite(cols * 32, rows * 32, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
  spr:saveAs(dir .. "/equipo/iconos.aseprite")
  spr:saveCopyAs(dir .. "/equipo/iconos.png")
  spr:close()
  local shapes, sets = {}, {}
  for _, ic in ipairs(ICONS) do shapes[#shapes + 1] = '"' .. ic.name .. '"' end
  for _, s in ipairs(SETS) do sets[#sets + 1] = '"' .. s[1] .. '"' end
  local fh = io.open(dir .. "/equipo/iconos.json", "w")
  fh:write(string.format('{"size":32,"shapes":[%s],"sets":[%s]}', table.concat(shapes, ","), table.concat(sets, ",")))
  fh:close()
end

-- ---------------------------------------------------------------- piezas de combate (48x48)
-- Mismas poses que crear_sprites_v2.lua (mano y torso por cuadro): si cambias FRAMES allá,
-- cámbialos aquí también.
local FW, FH, OX, OY = 48, 48, 8, 16
local GROUND = OY + 29
local FRAMES = {
  {hx=25,hy=16, ang="up",      u=0, lean=0},
  {hx=25,hy=16, ang="up",      u=1, lean=0},
  {hx=19,hy=7,  ang="upback",  u=0, lean=-1},
  {hx=24,hy=9,  ang="upfwd",   u=0, lean=1},
  {hx=27,hy=15, ang="downfwd", u=1, lean=2},
  {hx=25,hy=15, ang="upfwd",   u=0, lean=1},
  {hx=26,hy=14, ang="up",      u=0, lean=0,  draw=0},
  {hx=26,hy=14, ang="up",      u=0, lean=-1, draw=1},
  {hx=26,hy=14, ang="up",      u=0, lean=-1, draw=0},
  {hx=23,hy=9,  ang="up",      u=0, lean=0},
  {hx=24,hy=5,  ang="up",      u=0, lean=0},
  {hx=26,hy=12, ang="upfwd",   u=0, lean=1},
  {hx=22,hy=16, ang="up",      u=1, lean=-2},
  {hx=23,hy=16, ang="up",      u=0, lean=-1},
  {hx=22,hy=14, ang="up",      u=1, lean=-1, defend=true},
  {hx=23,hy=19, ang="downfwd", u=3, lean=1,  ko=1},
  {hx=24,hy=23, ang="fwd",     u=5, lean=2,  ko=2},
  {hx=21,hy=4,  ang="up",      u=0, lean=0},
  {hx=21,hy=4,  ang="up",      u=0, lean=0,  jump=-2},
  -- caminar
  {hx=26,hy=16, ang="up",      u=0, lean=1},
  {hx=25,hy=16, ang="up",      u=1, lean=1},
  {hx=23,hy=16, ang="up",      u=0, lean=1},
  {hx=25,hy=16, ang="up",      u=1, lean=1},
}
local DIRS = {up={0,-1}, upfwd={1,-1}, fwd={1,0}, downfwd={1,1}, upback={-1,-1}}
local function handPoint(P) return OX + P.lean + P.hx, OY + P.u + (P.jump or 0) + P.hy end

local function blade(G, P, o)
  local cx, cy = handPoint(P)
  local d = DIRS[P.ang]; local dx, dy = d[1], d[2]
  local sx, sy = (dx == 0) and 1 or 0, (dx ~= 0 and dy == 0) and 1 or 0
  local from, to = o.from, o.to
  if dx ~= 0 and dy ~= 0 then sx, sy = 1, 0; to = from + math.floor((to - from) * 0.72 + 0.5) end
  G.px(cx - dx * 2, cy - dy * 2, o.pommel or "t1"); G.px(cx - dx, cy - dy, "w2")
  for k = -o.guard, o.guard do G.px(cx + dx * from - dy * k, cy + dy * from + dx * k, "t1") end
  for i = from + 1, to do
    G.px(cx + dx * i, cy + dy * i, "m1")
    if i < to then G.px(cx + dx * i + sx, cy + dy * i + sy, "m2") end
    if o.wide and i < to - 1 then G.px(cx + dx * i - sx, cy + dy * i - sy, "m3") end
    if o.runes and i % 3 == 0 and i < to - 1 then G.px(cx + dx * i, cy + dy * i, "g1") end
  end
end
local function shaft(G, P, a, b, c1, c2)
  local cx, cy = handPoint(P)
  local d = DIRS[P.ang]; local dx, dy = d[1], d[2]
  for i = a, b do G.px(cx + dx * i, cy + dy * i, (i < (a + b) / 2 - 4) and c2 or c1) end
  return cx, cy, dx, dy
end

local COMBAT = {}
COMBAT.espada = function(G, P) blade(G, P, {from=2, to=13, guard=2}) end
COMBAT.gran_espada = function(G, P) blade(G, P, {from=3, to=17, guard=3, wide=true}) end
COMBAT.espada_runica = function(G, P) blade(G, P, {from=2, to=13, guard=2, runes=true, pommel="g1"}) end
COMBAT.daga = function(G, P) blade(G, P, {from=2, to=7, guard=1}) end
COMBAT.hacha = function(G, P)
  local cx, cy, dx, dy = shaft(G, P, -4, 12, "w1", "w2")
  -- hoja a un lado del mango, cerca de la punta
  for i = 8, 12 do
    for k = 1, (i == 8 or i == 12) and 3 or 5 do
      G.px(cx + dx * i - dy * k, cy + dy * i + dx * k, k >= 4 and "m1" or "m2")
    end
  end
  G.px(cx + dx * 13, cy + dy * 13, "m3"); G.px(cx + dx * 10 + dy, cy + dy * 10 - dx, "m3")
end
COMBAT.arco = function(G, P)
  local cx, cy = handPoint(P)
  for k = -11, 11 do
    local x = cx - 3 + math.floor(3 * math.cos(math.pi * k / 22) + 0.5)
    G.px(x, cy + k, (math.abs(k) >= 10) and "t1" or "w1")
  end
  if P.draw == 1 then
    G.line(cx - 3, cy - 10, cx - 9, cy, "m3"); G.line(cx - 3, cy + 10, cx - 9, cy, "m3")
    G.line(cx - 9, cy, cx + 2, cy, "w1"); G.px(cx + 3, cy, "m1"); G.px(cx + 4, cy, "m1")
    G.px(cx - 9, cy - 1, "c1"); G.px(cx - 9, cy + 1, "c1")
  else
    G.line(cx - 3, cy - 10, cx - 3, cy + 10, "m3")
  end
end
COMBAT.ballesta = function(G, P)
  local cx, cy = handPoint(P)
  G.rect(cx - 4, cy, cx + 7, cy + 1, "w1"); G.line(cx - 4, cy + 1, cx + 7, cy + 1, "w2")
  for k = -6, 6 do G.px(cx + 6 - math.floor(math.abs(k) / 3), cy + k, (math.abs(k) >= 5) and "m3" or "m2") end
  local pull = (P.draw == 1) and 0 or 3
  G.line(cx + 5 - 2, cy - 5, cx + pull, cy, "m3"); G.line(cx + 5 - 2, cy + 5, cx + pull, cy, "m3")
  G.line(cx + pull, cy - 1, cx + 10, cy - 1, "w2"); G.px(cx + 11, cy - 1, "m1")
  G.px(cx, cy + 2, "t1")
end
COMBAT.baculo_arcano = function(G, P)
  local cx, cy, dx, dy = shaft(G, P, -12, 8, "w1", "w2")
  local x, y = cx + dx * 11, cy + dy * 11
  G.px(x - dx * 2 - dy, y - dy * 2 + dx, "t1"); G.px(x - dx * 2 + dy, y - dy * 2 - dx, "t1")
  G.px(x - dx, y - dy, "g2"); G.px(x, y, "g1"); G.px(x + dx, y + dy, "W")
  G.px(x - dy, y + dx, "g1"); G.px(x + dy, y - dx, "g2")
end
COMBAT.varita = function(G, P)
  local cx, cy, dx, dy = shaft(G, P, -2, 6, "w2", "w2")
  G.px(cx + dx * 3, cy + dy * 3, "t1")
  local x, y = cx + dx * 8, cy + dy * 8
  G.px(x, y, "W"); G.px(x - 1, y, "g1"); G.px(x + 1, y, "g1"); G.px(x, y - 1, "g1"); G.px(x, y + 1, "g1")
end
COMBAT.baculo_sagrado = function(G, P)
  local cx, cy, dx, dy = shaft(G, P, -12, 8, "t1", "t2")
  local x, y = cx + dx * 11, cy + dy * 11
  for _, o in ipairs({{-1,-2},{0,-2},{1,-2},{-2,-1},{2,-1},{-2,0},{2,0},{-2,1},{2,1},{-1,2},{0,2},{1,2}}) do G.px(x + o[1], y + o[2], "t1") end
  G.px(x, y - 1, "W"); G.px(x - 1, y, "g1"); G.px(x, y, "g1"); G.px(x + 1, y, "g2"); G.px(x, y + 1, "g2")
end
-- mano secundaria: en el lado de atrás del torso (coordenadas del personaje + inclinación)
local function back(P) return OX + P.lean, OY + P.u + (P.jump or 0) end
COMBAT.escudo = function(G, P)
  local x, y = back(P)
  local cx, cy = x + (P.defend and 12 or 8), y + 17
  G.poly({{cx - 4, cy - 6}, {cx + 4, cy - 6}, {cx + 4, cy + 1}, {cx, cy + 6}, {cx - 4, cy + 1}}, "m2")
  G.poly({{cx - 3, cy - 5}, {cx + 3, cy - 5}, {cx + 3, cy + 1}, {cx, cy + 4}, {cx - 3, cy + 1}}, "c1")
  G.line(cx, cy - 5, cx, cy + 4, "t1"); G.line(cx - 3, cy - 2, cx + 3, cy - 2, "t1"); G.px(cx, cy - 2, "g1")
  G.line(cx - 4, cy - 6, cx + 4, cy - 6, "m1")
end
COMBAT.carcaj = function(G, P)
  local x, y = back(P)
  G.rect(x + 8, y + 9, x + 10, y + 19, "c2"); G.line(x + 8, y + 10, x + 8, y + 19, "c1")
  G.rect(x + 8, y + 12, x + 10, y + 12, "t1"); G.rect(x + 8, y + 17, x + 10, y + 17, "t1")
  G.px(x + 8, y + 7, "c0"); G.px(x + 9, y + 6, "g1"); G.px(x + 10, y + 7, "c0")
  G.px(x + 8, y + 8, "w1"); G.px(x + 9, y + 7, "w1"); G.px(x + 9, y + 8, "w1"); G.px(x + 10, y + 8, "w1")
end
COMBAT.orbe = function(G, P, f)
  local x, y = back(P)
  local cx, cy = x + 5, y + 12 + ((f % 2 == 0) and 1 or 0)
  G.rect(cx - 1, cy - 2, cx + 1, cy + 2, "g1"); G.rect(cx - 2, cy - 1, cx + 2, cy + 1, "g1")
  G.px(cx + 1, cy + 1, "g2"); G.px(cx + 2, cy, "g2"); G.px(cx, cy + 2, "g2"); G.px(cx - 1, cy - 1, "W")
end
COMBAT.cristal = function(G, P, f)
  local x, y = back(P)
  local cx, cy = x + 5, y + 12 + ((f % 2 == 0) and 1 or 0)
  G.poly({{cx, cy - 4}, {cx + 2, cy - 1}, {cx + 1, cy + 3}, {cx - 1, cy + 3}, {cx - 2, cy - 1}}, "g2")
  G.line(cx, cy - 4, cx, cy + 3, "g1"); G.px(cx, cy - 2, "W")
end
COMBAT.daga_gemela = function(G, P)
  local x, y = back(P)
  local hx, hy = x + 9, y + 19
  G.px(hx, hy, "w2"); G.px(hx + 1, hy - 1, "w2"); G.px(hx - 1, hy + 1, "t1"); G.px(hx + 1, hy + 1, "t1")
  for i = 1, 5 do G.px(hx - i, hy + 1 + i, "m1"); if i < 5 then G.px(hx - i + 1, hy + 1 + i, "m2") end end
end
COMBAT.simbolo = function(G, P)
  local x, y = back(P)
  local cx, cy = x + 11, y + 21
  G.px(cx, cy - 2, "m2"); G.rect(cx - 1, cy - 1, cx + 1, cy + 1, "t1"); G.px(cx, cy, "g1")
  G.px(cx - 2, cy, "t2"); G.px(cx + 2, cy, "t2"); G.px(cx, cy + 2, "t2")
end

local COMBAT_ORDER = {"espada","gran_espada","espada_runica","hacha","daga","arco","ballesta","baculo_arcano","varita","baculo_sagrado",
  "escudo","carcaj","orbe","cristal","daga_gemela","simbolo"}
for _, name in ipairs(COMBAT_ORDER) do
  local img = Image(FW * #FRAMES, FH, ColorMode.RGB)
  for f, P in ipairs(FRAMES) do
    local G = newGrid(FW, FH, GROUND)
    COMBAT[name](G, P, f)
    outline(G)
    paint(img, G, KEYPAL, (f - 1) * FW, 0)
  end
  local spr = Sprite(FW * #FRAMES, FH, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
  spr:saveCopyAs(dir .. "/equipo/combate/" .. name .. ".png")
  spr:close()
end

-- ---------------------------------------------------------------- paletas para el juego
do
  local parts = {}
  for _, s in ipairs(SETS) do
    local roles = {}
    for j = 1, 11 do roles[#roles + 1] = string.format('"%s":"%s"', ROLES[j], s[2][j]) end
    parts[#parts + 1] = string.format('"%s":{%s}', s[1], table.concat(roles, ","))
  end
  local keys = {}
  for _, r in ipairs(ROLES) do if r ~= "w1" and r ~= "w2" then keys[#keys + 1] = string.format('"%s":"%s"', r, KEYS[r]) end end
  local fh = io.open(dir .. "/equipo/paletas.json", "w")
  fh:write(string.format('{"keys":{%s},"sets":{%s}}', table.concat(keys, ","), table.concat(parts, ",")))
  fh:close()
end
