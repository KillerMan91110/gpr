-- Lo que se busca en las misiones de la Pradera, visto en el mapa (en vez de un signo flotando):
-- Trueno en sus tres escondites, la vaca Margarita, la gallina Copito, el lobo caído, el carro
-- asaltado, las manchas negras, el botín goblin, el roble enfermo, el bolso del ahogado, el altar
-- del eclipse, el cristal del Capitán, las grietas, la madriguera con el hacha, las inscripciones y
-- la muñeca. Cada uno es una tira horizontal de 2 cuadros (respira, brilla o se mueve un poco).
-- Mismo estilo que crear_objetos.lua: contorno oscuro automático.
-- Salida: <png>/mision/<nombre>.png (tira) y <dir>/mision/<nombre>.aseprite
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script art/sprites/mundo/crear_puntos_mision.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local PAL = {}
for k, v in pairs({
  K="141420", W="ffffff", pa="f0e6d0",
  -- caballo gris de Gaspar y la vaca
  h1="b8b4bc", h2="8a8692", h3="5e5a68", hm="3a3640", hb="f4f0f4",
  c1="f0ece4", c2="c8c0b4", cn="3a3036", pk="e8a0a8", az="4a7ad8",
  -- gallina
  g1="ffffff", g2="d8d4dc", gr="e0303c", gy="f0c040",
  -- lobo
  l1="8a8e98", l2="5e6270", l3="3e4250",
  -- madera, tierra, cuero, piedra
  wd1="c08850", wd2="8a5a30", wd3="5a3818", t1="7a5a3a", t2="4e3622",
  le1="d09860", le2="9a6438", le3="5e3a1c",
  rk1="b8b4c0", rk2="8a8694", rk3="5e5a68", ru="ffd86a",
  fe1="c8d0dc", fe2="8a96a8", bz="c09030",
  -- trigo, pasto, agua, hojas secas
  y1="f0d070", y2="c89a38", y3="8a6420", v1="8ab84a", v2="5e8a32",
  aq1="dcf8ff", aq2="8ad8f0", aq3="3a98c8",
  sk1="8a7a50", sk2="5e5434", sk3="3e3826",
  -- eclipse
  ec1="5a4878", ec2="2e2440", ec3="171222", ev="c890ff", ev2="8a50d8",
  -- muñeca
  d1="f0d070", d2="c89a38", dr="c0343a",
}) do PAL[k] = hex(v) end

local function newGrid(W, H)
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x >= 0 and x < W and y >= 0 and y < H then g[y * W + x] = c end
  end
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
  function G.ellipse(cx, cy, rx, ry, c, fn)
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 then
        local col = fn and fn(x, y) or c
        if col then G.px(x, y, col) end
      end
    end end
  end
  function G.poly(pts, c)
    local miny, maxy = math.huge, -math.huge
    for _, p in ipairs(pts) do miny = math.min(miny, p[2]); maxy = math.max(maxy, p[2]) end
    for y = math.floor(miny), math.ceil(maxy) do
      local xs = {}
      for i = 1, #pts do
        local a, b = pts[i], pts[i % #pts + 1]
        if (a[2] <= y and b[2] > y) or (b[2] <= y and a[2] > y) then xs[#xs + 1] = a[1] + (y - a[2]) * (b[1] - a[1]) / (b[2] - a[2]) end
      end
      table.sort(xs)
      for i = 1, #xs - 1, 2 do for x = math.ceil(xs[i]), math.floor(xs[i + 1]) do G.px(x, y, c) end end
    end
  end
  return G
end

-- contorno oscuro (las capas sin contorno, como el agua o el brillo, se marcan con "nl")
local NO_OUTLINE = { aq1 = true, aq2 = true, ev = true, ev2 = true, sk3 = true }
local function toImage(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y = 0, H - 1 do for x = 0, W - 1 do
    if not g[y * W + x] then
      for _, o in ipairs({{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) do
        local nx, ny = x + o[1], y + o[2]
        local n = (nx >= 0 and nx < W and ny >= 0 and ny < H) and g[ny * W + nx]
        if n and n ~= "K" and not NO_OUTLINE[n] then out[y * W + x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(W, H, ColorMode.RGB)
  for k, c in pairs(g) do img:drawPixel(k % W, k // W, PAL[c] or PAL.K) end
  return img
end

local SPRITES = {}
local function sprite(name, W, H, draw) SPRITES[#SPRITES + 1] = { name = name, w = W, h = H, draw = draw } end

-- ---------------------------------------------------------------- Trueno, el caballo de Gaspar
-- caballo de perfil mirando a la izquierda; head: dy de la cabeza (pastar), legs: patas visibles
local function horse(G, ox, oy, head, legs)
  if legs then
    for _, x in ipairs({7, 10, 19, 22}) do G.rect(ox + x, oy + 20, ox + x + 1, oy + 27, "h3"); G.rect(ox + x, oy + 27, ox + x + 1, oy + 28, "hm") end
  end
  G.ellipse(ox + 15, oy + 17, 10, 5.5, "h1")
  G.ellipse(ox + 16, oy + 19, 8, 3, "h2")
  G.ellipse(ox + 18, oy + 16, 3, 2, "hb") -- la mancha blanca
  G.thick(ox + 25, oy + 14, ox + 29, oy + 22, 2, "hm") -- cola
  -- cuello y cabeza
  G.thick(ox + 8, oy + 15, ox + 4, oy + 8 + head, 4, "h1")
  G.poly({{ox + 1, oy + 7 + head}, {ox + 6, oy + 5 + head}, {ox + 6, oy + 11 + head}, {ox - 1, oy + 12 + head}}, "h1")
  G.rect(ox - 1, oy + 11 + head, ox + 2, oy + 12 + head, "h2")
  G.thick(ox + 6, oy + 6 + head, ox + 10, oy + 13, 2, "hm") -- crin
  G.px(ox + 3, oy + 8 + head, "K")
  G.px(ox + 5, oy + 4 + head, "h2")
end

sprite("trueno_trigo", 32, 32, function(G, f)
  horse(G, 2, 0, f == 0 and 8 or 9, true)
  for _, x in ipairs({0, 3, 6, 26, 29}) do G.line(x, 31, x + (f == 0 and 0 or 1), 24, "y2"); G.px(x + (f == 0 and 0 or 1), 23, "y1") end
end)

sprite("trueno_lago", 32, 32, function(G, f)
  G.ellipse(16, 25, 15, 5, "aq3")
  G.ellipse(16, 24, 13, 3.5, "aq2")
  horse(G, 2, 8, f == 0 and 0 or 1, false)
  -- el agua tapa el cuerpo
  G.ellipse(18, 28, 14, 4, "aq3")
  for i = 0, 3 do G.px(4 + i * 7 + f * 2, 24, "aq1"); G.px(5 + i * 7 + f * 2, 24, "aq1") end
end)

sprite("trueno_dormido", 32, 32, function(G, f)
  -- echado, con las patas dobladas y los ojos cerrados
  G.ellipse(17, 24, 12, 5, "h1")
  G.ellipse(18, 26, 10, 2.5, "h2")
  G.ellipse(20, 23, 3, 2, "hb")
  G.thick(28, 23, 31, 28, 2, "hm")
  G.poly({{2, 22}, {9, 19}, {11, 25}, {3, 27}}, "h1")
  G.line(9, 19, 13, 22, "hm")
  G.line(4, 23, 6, 23, "K")
  G.rect(8, 28, 14, 29, "h3"); G.rect(20, 28, 26, 29, "h3")
  -- z z z
  local zx, zy = 6 + f, 13 - f * 2
  G.line(zx, zy, zx + 3, zy, "W"); G.line(zx + 3, zy, zx, zy + 3, "W"); G.line(zx, zy + 3, zx + 3, zy + 3, "W")
  G.px(zx + 6, zy - 4, "W"); G.px(zx + 7, zy - 4, "W"); G.px(zx + 6, zy - 3, "W"); G.px(zx + 7, zy - 2, "W")
end)

-- ---------------------------------------------------------------- la vaca Margarita (cinta azul)
sprite("vaca", 32, 32, function(G, f)
  for _, x in ipairs({8, 11, 20, 23}) do G.rect(x, 21, x + 1, 28, "c2"); G.rect(x, 28, x + 1, 29, "cn") end
  G.ellipse(17, 17, 10, 6, "c1")
  G.ellipse(13, 15, 3, 2.5, "cn"); G.ellipse(21, 19, 3, 2, "cn")
  G.ellipse(17, 22, 3, 2, "pk")
  G.thick(27, 14, 29, 22, 1, "c2"); G.px(29, 23, "cn")
  local hy = f == 0 and 0 or 1
  G.ellipse(5, 13 + hy, 4.5, 4, "c1")
  G.rect(1, 15 + hy, 5, 18 + hy, "pk"); G.px(2, 16 + hy, "K"); G.px(4, 16 + hy, "K")
  G.px(4, 12 + hy, "K")
  G.line(2, 9 + hy, 0, 7 + hy, "c2"); G.line(8, 9 + hy, 10, 7 + hy, "c2")
  G.rect(7, 16 + hy, 9, 19 + hy, "az") -- cinta azul
  G.ellipse(8, 21 + hy, 1.5, 1.5, "y2") -- cencerro
end)

-- ---------------------------------------------------------------- Copito, la gallina que se cree lobo
sprite("gallina", 32, 32, function(G, f)
  local by = f == 0 and 0 or -1
  G.rect(13, 25, 13, 29, "gy"); G.rect(18, 25, 18, 29, "gy")
  G.ellipse(16, 20 + by, 8, 6, "g1")
  G.ellipse(18, 21 + by, 5, 3, "g2")
  G.poly({{22, 16 + by}, {27, 12 + by}, {26, 19 + by}}, "g2") -- cola
  G.ellipse(10, 13 + by * 2, 4, 4, "g1")
  G.poly({{5, 13 + by * 2}, {7, 12 + by * 2}, {7, 14 + by * 2}}, "gy")
  G.rect(9, 8 + by * 2, 11, 9 + by * 2, "gr"); G.px(10, 7 + by * 2, "gr")
  G.px(9, 12 + by * 2, "K")
  G.px(8, 16 + by * 2, "gr")
end)

-- ---------------------------------------------------------------- el lobo caído con su collar
sprite("lobo_caido", 32, 32, function(G, f)
  G.ellipse(16, 23, 11, 4.5, "l1")
  G.ellipse(17, 25, 9, 2, "l2")
  G.thick(27, 22, 31, 25, 2, "l2")
  G.poly({{1, 21}, {8, 19}, {9, 25}, {2, 26}}, "l1")
  G.poly({{3, 19}, {5, 15}, {6, 19}}, "l2")
  G.line(3, 22, 5, 22, "K")
  G.rect(8, 27, 13, 28, "l3"); G.rect(18, 27, 23, 28, "l3")
  -- collar con la piedra negra
  G.thick(9, 19, 10, 26, 2, "le2")
  G.poly({{10, 24}, {13, 26}, {10, 29}, {8, 26}}, "ec2")
  G.px(10, 26, f == 0 and "ev" or "ev2")
  if f == 1 then G.px(13, 23, "ev"); G.px(7, 29, "ev") end
end)

-- ---------------------------------------------------------------- el carro de Goreth, asaltado
sprite("carro_asaltado", 48, 32, function(G, f)
  -- caja del carro, inclinada sobre la rueda rota
  G.poly({{6, 12}, {36, 10}, {38, 22}, {8, 24}}, "wd1")
  G.poly({{6, 12}, {36, 10}, {36, 13}, {6, 15}}, "wd2")
  for x = 10, 34, 6 do G.line(x, 12, x + 1, 23, "wd2") end
  G.thick(36, 14, 46, 17, 2, "wd3") -- lanza
  -- rueda sana y rueda rota
  G.ellipse(30, 25, 5, 5, "wd3"); G.ellipse(30, 25, 3.5, 3.5, nil, function() return nil end)
  for i = 0, 3 do local a = i * math.pi / 2; G.line(30, 25, 30 + math.cos(a) * 4, 25 + math.sin(a) * 4, "wd2") end
  G.thick(8, 27, 15, 29, 2, "wd3"); G.thick(4, 23, 9, 30, 2, "wd3")
  -- cajas caídas y herramientas
  G.rect(16, 25, 22, 30, "wd1"); G.line(16, 25, 22, 30, "wd2"); G.line(22, 25, 16, 30, "wd2")
  G.thick(38, 27, 45, 24, 1, "fe2"); G.rect(44, 22, 46, 24, "fe1")
  G.px(25, 29, "pa"); G.px(26, 30, "pa")
  if f == 1 then G.px(41, 21, "W") end
end)

-- ---------------------------------------------------------------- mancha negra en el trigo
sprite("mancha_negra", 32, 32, function(G, f)
  G.ellipse(16, 24, 14, 6, "sk3")
  G.ellipse(16, 24, 10, 4, "sk2")
  for _, x in ipairs({5, 9, 22, 26}) do G.line(x, 24, x - 1, 17, "sk1"); G.px(x - 1, 16, "sk2") end
  G.poly({{14, 25}, {16, 15}, {18, 25}}, "ec2"); G.px(16, 18, "ev")
  -- humito negro
  local s = f == 0 and 0 or 1
  G.px(15 - s, 12, "sk3"); G.px(16, 10 - s, "sk3"); G.px(17 + s, 8, "sk3")
end)

-- ---------------------------------------------------------------- el botín de los goblins
sprite("botin_goblin", 32, 32, function(G, f)
  G.ellipse(16, 26, 13, 4, "t1")
  G.ellipse(10, 21, 6, 5, "fe2"); G.rect(5, 18, 15, 19, "fe1") -- olla
  -- engranajes de Tobías
  for _, c in ipairs({{21, 21}, {25, 25}}) do
    for i = 0, 5 do local a = i * math.pi / 3; G.thick(c[1] + math.cos(a) * 3, c[2] + math.sin(a) * 3, c[1] + math.cos(a) * 5, c[2] + math.sin(a) * 5, 2, "wd2") end
    G.ellipse(c[1], c[2], 3.5, 3.5, "wd1"); G.px(c[1], c[2], "bz")
  end
  for _, p in ipairs({{13, 26}, {15, 27}, {17, 26}}) do G.px(p[1], p[2], "y1"); G.px(p[1] + 1, p[2], "y2") end
  if f == 1 then G.px(22, 18, "W") end
end)

-- ---------------------------------------------------------------- el roble viejo, enfermo
sprite("roble_enfermo", 48, 48, function(G, f)
  G.ellipse(24, 45, 12, 3, "t2")
  G.poly({{18, 46}, {30, 46}, {28, 24}, {20, 24}}, "wd2")
  G.poly({{24, 46}, {30, 46}, {28, 24}, {25, 24}}, "wd3")
  G.thick(21, 28, 10, 16, 3, "wd2"); G.thick(27, 28, 38, 14, 3, "wd2"); G.thick(24, 26, 24, 10, 3, "wd2")
  -- hojas ralas, pardas y grises
  for _, c in ipairs({{10, 14, 6}, {38, 12, 6}, {24, 8, 7}, {16, 20, 5}, {32, 20, 5}}) do
    G.ellipse(c[1], c[2], c[3], c[3] * 0.7, "sk1")
    G.ellipse(c[1] - 1, c[2] - 1, c[3] * 0.6, c[3] * 0.4, "y3")
  end
  -- venas negras del cristal
  G.line(24, 44, 22, 34, "ec2"); G.line(22, 34, 25, 28, "ec2"); G.px(23, 38, "ev")
  -- hoja que cae
  local lx, ly = 34 + f * 2, 28 + f * 6
  G.px(lx, ly, "y2"); G.px(lx + 1, ly, "y3")
end)

-- ---------------------------------------------------------------- el bolso del ahogado
sprite("bolso_ahogado", 32, 32, function(G, f)
  G.ellipse(16, 26, 12, 3.5, "aq2")
  G.ellipse(16, 21, 9, 6, "le2")
  G.ellipse(15, 20, 7, 4, "le1")
  G.rect(9, 16, 23, 18, "le3")
  G.thick(10, 16, 4, 27, 1, "le3") -- correa
  G.rect(15, 17, 17, 19, "bz")
  G.poly({{19, 22}, {27, 24}, {24, 28}}, "ec2") -- capa negra
  G.px(12 + f * 3, 25, "aq1"); G.px(20 - f * 2, 27, "aq1")
end)

-- ---------------------------------------------------------------- el altar del ritual
sprite("altar_eclipse", 32, 32, function(G, f)
  G.ellipse(16, 27, 13, 4, f == 0 and "ev2" or "ec1")
  G.rect(6, 19, 26, 27, "rk2"); G.rect(6, 19, 26, 20, "rk1"); G.rect(22, 21, 26, 27, "rk3")
  G.line(9, 23, 13, 23, "rk3"); G.line(17, 25, 21, 25, "rk3")
  G.poly({{12, 19}, {16, 3}, {20, 19}}, "ec2")
  G.poly({{12, 19}, {16, 3}, {15, 19}}, "ec1")
  G.line(16, 6, 16, 16, "ev")
  if f == 1 then G.px(10, 8, "ev"); G.px(23, 11, "ev"); G.px(8, 15, "ev2") else G.px(22, 6, "ev"); G.px(9, 11, "ev2") end
end)

-- ---------------------------------------------------------------- el cristal del Capitán, en el suelo
sprite("cristal_suelo", 32, 32, function(G, f)
  G.ellipse(16, 27, 11, 3, "t2")
  G.thick(5, 25, 13, 23, 2, "le2"); G.thick(19, 23, 27, 25, 2, "le2")
  G.poly({{10, 25}, {16, 9}, {22, 25}}, "ec2")
  G.poly({{10, 25}, {16, 9}, {15, 25}}, "ec1")
  G.line(16, 12, 16, 22, "ev")
  if f == 1 then G.px(8, 14, "ev"); G.px(24, 12, "ev") end
end)

-- ---------------------------------------------------------------- una grieta de oscuridad
sprite("grieta_oscura", 32, 32, function(G, f)
  local glow = f == 0 and "ev2" or "ev"
  G.ellipse(16, 22, 14, 6, "sk3")
  G.thick(4, 20, 12, 23, 2, "ec3"); G.thick(12, 23, 19, 19, 2, "ec3"); G.thick(19, 19, 28, 24, 2, "ec3")
  G.line(5, 20, 12, 22, glow); G.line(12, 22, 19, 19, glow); G.line(19, 19, 27, 23, glow)
  G.line(15, 21, 14, 27, "ec3"); G.line(15, 21, 14, 26, glow)
  for i = 0, 2 do G.px(9 + i * 7, 14 - f * 2 - i, "ev") end
end)

-- ---------------------------------------------------------------- la madriguera con el hacha clavada
sprite("madriguera_hacha", 32, 32, function(G, f)
  G.ellipse(16, 24, 14, 6, "t1")
  G.ellipse(16, 22, 11, 5, "wd2")
  G.ellipse(14, 23, 5, 3, "t2") -- la boca de la madriguera
  -- el hacha de Brenna, clavada en la tierra
  G.thick(22, 23, 27, 9, 2, "wd1")
  G.poly({{17, 20}, {24, 18}, {25, 24}, {19, 26}}, "fe2")
  G.line(17, 20, 19, 26, "fe1")
  if f == 1 then G.px(18, 21, "W") end
  for _, p in ipairs({{6, 20}, {26, 26}}) do G.px(p[1], p[2], "v2") end
end)

-- ---------------------------------------------------------------- piedra con inscripciones del Vigía
sprite("inscripcion", 32, 32, function(G, f)
  G.ellipse(16, 28, 9, 2.5, "t2")
  G.poly({{9, 28}, {23, 28}, {22, 6}, {16, 3}, {10, 6}}, "rk2")
  G.poly({{18, 28}, {23, 28}, {22, 6}, {19, 5}}, "rk3")
  G.poly({{10, 6}, {16, 3}, {14, 8}}, "rk1")
  local c = f == 0 and "rk3" or "ru"
  G.ellipse(15, 11, 3, 2, c); G.px(15, 11, "K")
  for i = 0, 3 do G.line(11, 16 + i * 3, 17, 16 + i * 3, c) end
end)

-- ---------------------------------------------------------------- la muñeca de la hija de Sela
sprite("muneca_suelo", 32, 32, function(G, f)
  G.ellipse(16, 27, 9, 2.5, "t2")
  -- tirada en el piso, de costado
  G.ellipse(8, 23, 3.5, 3.5, "pa"); G.px(7, 22, "K")
  G.rect(5, 19, 10, 20, "wd1")
  G.poly({{11, 20}, {22, 20}, {24, 26}, {11, 26}}, "d1")
  G.rect(15, 22, 17, 24, "dr")
  G.thick(24, 23, 28, 23, 2, "pa"); G.thick(13, 19, 15, 15, 2, "pa")
  if f == 1 then G.px(20, 18, "W") end
end)

-- ---------------------------------------------------------------- salida
local dir, png = app.params.dir, app.params.png
local manifest = {}
for _, s in ipairs(SPRITES) do
  local frames = {}
  for f = 0, 1 do
    local G = newGrid(s.w, s.h)
    s.draw(G, f)
    frames[#frames + 1] = toImage(G)
  end
  local spr = Sprite(s.w, s.h, ColorMode.RGB)
  for i, img in ipairs(frames) do
    local fr = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    fr.duration = 0.5
    spr:newCel(spr.layers[1], fr, img, Point(0, 0))
  end
  spr:saveAs(dir .. "/mision/" .. s.name .. ".aseprite")
  spr:close()
  local strip = Image(s.w * #frames, s.h, ColorMode.RGB)
  for i, img in ipairs(frames) do strip:drawImage(img, Point((i - 1) * s.w, 0)) end
  local out = Sprite(s.w * #frames, s.h, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], strip, Point(0, 0))
  out:saveCopyAs(png .. "/mision/" .. s.name .. ".png")
  out:close()
  manifest[#manifest + 1] = string.format('"%s": [%d, %d]', s.name, s.w, s.h)
end
local fh = io.open(png .. "/mision/sprites.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }\n")
fh:close()
