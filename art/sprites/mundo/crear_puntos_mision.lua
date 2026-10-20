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
  -- Montañas Grises: nieve, oso, orco, rayo, fuego de almas y agua helada
  sn1="f6f9fc", sn2="cad6e6", sn3="94a4bc",
  br1="a87850", br2="704c32", br3="3e2a1a",
  oc1="7aa04a", oc2="4e7032",
  zz1="fff7a0", zz2="ffd23a",
  bl1="c8f0ff", bl2="7ec8ff", bl3="3a7ad0",
  dk="1c2a3a",
  -- Costas Muertas: arena, mar, coral, el loro de Rhaegar, nácar y la caracola del rey
  ar1="eedcaa", ar2="d8c28c", ar3="b49c6a", ma1="2c7ea0", ma2="174c66",
  co1="f2aaa2", co2="d87c7a", lo1="4ab84a", lo2="2e7a34", lo3="e8c040", lo4="d84a3a",
  nc1="f4eef6", nc2="d6cce2", go1="ffd860", go2="c89a2a", vi1="3a6a98", es="f2fbf8",
  -- Catacumbas del Abismo: piedra violácea, hierro oxidado, plata y los hongos que brillan
  cs1="8e8898", cs2="6c6678", cs3="4e4a5a", ox1="b8743e", ox2="7e4426", ox3="4a2a18",
  sx1="e4e8f2", sx2="a8aec0", sx3="6a7084", fu1="c6a2ff", fu2="7a5ab0", fu3="a4f4dc", mb1="4a3a30", mb2="2e241e",
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
local NO_OUTLINE = { aq1 = true, aq2 = true, ev = true, ev2 = true, sk3 = true, es = true }
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

-- ================================================================ Montañas Grises
-- el dibujo de los orcos: un cuero clavado con carbón: una cabra enorme con corona y orcos de rodillas
sprite("dibujo_orco", 32, 32, function(G, f)
  G.ellipse(16, 28, 11, 2.5, "t2")
  G.thick(4, 28, 6, 4, 2, "wd2"); G.thick(27, 28, 25, 4, 2, "wd2")
  G.poly({{5, 6}, {27, 5}, {26, 23}, {6, 24}}, "le1")
  G.poly({{20, 6}, {27, 5}, {26, 23}, {21, 23}}, "le2")
  -- la cabra reina
  G.ellipse(15, 13, 5, 3, "K"); G.line(11, 15, 11, 18, "K"); G.line(18, 15, 18, 18, "K")
  G.line(19, 11, 21, 9, "K"); G.line(21, 9, 23, 7, "K"); G.line(20, 9, 19, 6, "K")
  G.rect(13, 8, 17, 9, "y2"); G.px(13, 7, "y2"); G.px(15, 7, "y2"); G.px(17, 7, "y2")
  -- los orcos de rodillas
  for _, x in ipairs({8, 12, 16, 20}) do G.ellipse(x, 21, 1.5, 1.5, "K"); G.line(x, 22, x + 1, 22, "K") end
  if f == 1 then G.px(23, 18, "oc1") end
end)

-- el nido de los murciélagos: ramitas, monedas, gemas y un anillo que brilla
sprite("nido_brillos", 32, 32, function(G, f)
  G.ellipse(16, 24, 13, 6, "wd3")
  G.ellipse(16, 22, 11, 4, "t2")
  for i = 0, 7 do local a = i * math.pi / 4; G.line(16 + math.cos(a) * 9, 23 + math.sin(a) * 3, 16 + math.cos(a) * 13, 24 + math.sin(a) * 5, "wd2") end
  for _, p in ipairs({{10, 21}, {13, 23}, {19, 22}, {22, 20}, {15, 20}}) do G.ellipse(p[1], p[2], 1.6, 1.2, "y1"); G.px(p[1], p[2], "y2") end
  G.poly({{24, 21}, {26, 19}, {27, 22}}, "az")
  G.ellipse(17, 18, 2.4, 2.4, "y1"); G.ellipse(17, 18, 1.1, 1.1, "t2")
  if f == 0 then G.px(18, 16, "W"); G.px(10, 19, "W") else G.px(23, 18, "W"); G.px(13, 21, "W") end
end)

-- la trampa vacía de Sven: cepo de hierro saltado sobre la nieve y huellas enormes
sprite("trampa_vacia", 32, 32, function(G, f)
  G.ellipse(16, 22, 15, 8, "sn1")
  G.ellipse(16, 23, 6, 3, "fe2"); G.ellipse(16, 23, 4, 1.6, "sn2")
  for i = -2, 2 do G.line(16 + i * 2, 20, 16 + i * 2, 18, "fe1") end
  G.line(22, 23, 28, 26, "fe2")
  for _, p in ipairs({{5, 13}, {9, 9}, {25, 12}}) do
    G.ellipse(p[1], p[2], 2.5, 2, "sn3")
    for k = -1, 1 do G.px(p[1] + k * 2, p[2] - 3, "sn3") end
  end
  if f == 1 then G.px(14, 21, "dr"); G.px(17, 22, "dr") end
end)

-- los oseznos: dos cachorros de oso comiéndose los conejos de Sven
sprite("oseznos", 32, 32, function(G, f)
  G.ellipse(16, 27, 13, 3, "sn2")
  local function cub(x, y, look)
    G.ellipse(x, y + 3, 5, 4, "br2"); G.ellipse(x, y + 4, 3, 2, "br1")
    G.ellipse(x, y - 2 + look, 3.6, 3.2, "br2")
    G.px(x - 3, y - 5 + look, "br3"); G.px(x + 3, y - 5 + look, "br3")
    G.px(x - 1, y - 2 + look, "K"); G.px(x + 1, y - 2 + look, "K"); G.px(x, y + look, "br3")
  end
  cub(10, 20, 0); cub(22, 20, f)
  G.ellipse(16, 25, 3, 1.5, "c1"); G.px(18, 24, "pk")
end)

-- el farol de almas: farol de piedra con una llama azul que guía a los espectros
sprite("farol_almas", 32, 32, function(G, f)
  G.ellipse(16, 28, 7, 2, "sn3")
  G.rect(13, 18, 19, 27, "rk2"); G.rect(17, 18, 19, 27, "rk3")
  G.rect(11, 9, 21, 17, "rk2"); G.rect(13, 11, 19, 16, "dk")
  G.poly({{10, 9}, {22, 9}, {16, 3}}, "rk3")
  local h = f == 0 and 0 or 1
  G.ellipse(16, 14 - h, 2, 3, "bl2"); G.ellipse(16, 15 - h, 1, 1.5, "bl1")
  G.px(9, 6 + h, "bl1"); G.px(23, 8 - h, "bl2")
end)

-- un agujero en el hielo, con el agua negra y algo que se mueve abajo
sprite("agujero_hielo", 32, 32, function(G, f)
  G.ellipse(16, 20, 15, 9, "bl1")
  G.ellipse(16, 20, 9, 5, "bl3"); G.ellipse(16, 20, 7, 3.5, "dk")
  G.line(3, 15, 8, 18, "bl2"); G.line(25, 25, 30, 22, "bl2")
  if f == 0 then G.ellipse(14, 20, 3, 1, "aq3"); G.px(19, 19, "W") else G.ellipse(18, 20, 3, 1, "aq3"); G.px(12, 21, "W"); G.px(20, 14, "W") end
end)

-- un pararrayos de hierro doblado, con chispas
sprite("pararrayos_roto", 32, 32, function(G, f)
  G.ellipse(16, 28, 9, 2.5, "rk3")
  G.rect(13, 23, 19, 28, "rk2")
  G.thick(16, 23, 16, 13, 2, "fe2")
  G.thick(16, 13, 22, 7, 2, "fe2"); G.line(15, 23, 15, 13, "fe1")
  G.poly({{22, 7}, {25, 4}, {24, 8}}, "fe1")
  if f == 0 then G.line(23, 9, 27, 12, "zz2"); G.px(26, 5, "zz1") else G.line(9, 14, 13, 16, "zz2"); G.px(21, 4, "zz1"); G.px(28, 10, "zz2") end
end)

-- la piedra del eco: un menhir con espirales enanas; las ondas de sonido se mueven
sprite("piedra_eco", 32, 32, function(G, f)
  G.ellipse(16, 28, 8, 2.5, "t2")
  G.poly({{10, 28}, {22, 28}, {21, 7}, {16, 4}, {11, 7}}, "rk2")
  G.poly({{17, 28}, {22, 28}, {21, 7}, {18, 6}}, "rk3")
  G.ellipse(15, 14, 3, 3, "rk3"); G.ellipse(15, 14, 1.5, 1.5, "rk2"); G.px(15, 14, "ru")
  G.line(13, 20, 18, 20, "rk3"); G.line(14, 23, 17, 23, "rk3")
  local r = f == 0 and 0 or 2
  G.line(5 - r, 10, 5 - r, 16, "bl2"); G.line(27 + r, 10, 27 + r, 16, "bl2")
  G.line(2 - r, 8, 2 - r, 18, "bl1"); G.line(30 + r, 8, 30 + r, 18, "bl1")
end)

-- una tumba enana: losa de piedra con un hacha tallada, nieve encima
sprite("tumba_enana", 32, 32, function(G, f)
  G.ellipse(16, 28, 11, 2.5, "sn2")
  G.rect(8, 10, 24, 28, "rk2"); G.rect(20, 10, 24, 28, "rk3")
  G.ellipse(16, 10, 8, 4, "rk2")
  G.ellipse(16, 8, 8, 3, "sn1"); G.rect(8, 8, 24, 9, "sn1")
  G.line(14, 14, 14, 24, "rk3"); G.poly({{14, 14}, {19, 13}, {19, 18}, {14, 17}}, "rk3")
  if f == 1 then G.px(12, 21, "bl1"); G.px(19, 22, "bl2") end
end)

-- la olla de Hilda, volcada en la nieve, con guiso derramado y huellas de orco
sprite("olla_robada", 32, 32, function(G, f)
  G.ellipse(16, 24, 14, 6, "sn1")
  G.ellipse(19, 25, 7, 2.5, "wd2")
  G.ellipse(12, 20, 7, 6, "fe2"); G.ellipse(10, 20, 4, 4, "dk"); G.rect(16, 15, 20, 16, "fe1")
  for _, p in ipairs({{24, 14}, {27, 18}, {6, 28}}) do G.ellipse(p[1], p[2], 2, 1.5, "oc2"); G.px(p[1] - 1, p[2] - 2, "oc2"); G.px(p[1] + 1, p[2] - 2, "oc2") end
  local h = f == 0 and 0 or 1
  G.px(20, 21 - h, "sn3"); G.px(22, 19 - h, "sn3")
end)

-- ---------------------------------------------------------------- huellas y rastros
-- una huella (planta + dedos) centrada en x, y; s = tamaño, c = color
local function footprint(G, x, y, s, c, toes)
  G.ellipse(x, y, 1.6 * s, 2.2 * s, c)
  for k = -1, 1 do G.ellipse(x + k * 1.6 * s, y - 3 * s, 0.7 * s, 0.8 * s, c) end
  if toes == 4 then G.ellipse(x + 2.6 * s, y - 2 * s, 0.6 * s, 0.7 * s, c) end
end

-- huellas verdes y enormes de orco en la nieve, con gotas de guiso (la olla de Hilda)
sprite("huellas_orco", 32, 32, function(G, f)
  G.ellipse(16, 20, 15, 10, "sn1")
  footprint(G, 9, 25, 1.7, "oc2"); footprint(G, 20, 16, 1.7, "oc2")
  G.ellipse(9, 25, 1.4, 2, "oc1"); G.ellipse(20, 16, 1.4, 2, "oc1")
  for _, p in ipairs({{14, 22}, {25, 12}, {27, 20}}) do G.px(p[1], p[2], "wd2") end
  if f == 1 then G.px(5, 18, "wd2"); G.px(24, 23, "wd2") end
end)

-- huellas de botas y, al lado, los agujeritos redondos de un bastón (el Brujo)
sprite("huellas_baston", 32, 32, function(G, f)
  G.ellipse(16, 20, 15, 10, "sn1")
  for i, p in ipairs({{7, 27}, {13, 21}, {19, 15}, {25, 9}}) do
    G.ellipse(p[1], p[2], 1.6, 2.6, "sn3"); G.ellipse(p[1], p[2] + 2, 1.2, 0.8, "sn2")
    G.ellipse(p[1] + 4, p[2] - 1, 1, 1, "sk3")
  end
  if f == 1 then G.px(28, 6, "zz2") end
end)

-- huellas pequeñas de un chico que bajan por la roca (Tilo)
sprite("huellas_nino", 32, 32, function(G, f)
  G.ellipse(16, 21, 14, 8, "rk1")
  for i, p in ipairs({{6, 26}, {11, 21}, {16, 25}, {21, 19}, {26, 23}}) do G.ellipse(p[1], p[2], 1.2, 1.8, "t2"); G.px(p[1], p[2] - 2, "t2") end
  if f == 1 then G.px(27, 12, "W"); G.px(5, 14, "W") end
end)

-- huellas de lobo frente a una puerta de granja rota
sprite("huellas_lobo", 32, 32, function(G, f)
  G.ellipse(16, 27, 14, 3, "t2")
  G.rect(6, 6, 17, 25, "wd2"); G.rect(6, 6, 17, 7, "wd3"); G.line(11, 7, 11, 25, "wd3")
  G.poly({{17, 8}, {24, 13}, {23, 26}, {17, 25}}, "wd1"); G.line(20, 12, 20, 25, "wd2")
  G.line(8, 14, 14, 20, "dk"); G.line(14, 14, 9, 21, "dk")
  for _, p in ipairs({{21, 29}, {27, 26}}) do footprint(G, p[1], p[2], 1.1, "l3", 4) end
  if f == 1 then G.px(9, 11, "dr"); G.px(13, 11, "dr") end
end)

-- Bram, el minero enano, atrapado bajo unas piedras (agita la mano)
sprite("bram_atrapado", 32, 32, function(G, f)
  G.ellipse(16, 27, 14, 3, "rk3")
  G.ellipse(10, 18, 5, 5, "le1"); G.ellipse(10, 21, 5, 3, "br2") -- cara y barba
  G.ellipse(10, 14, 5, 3, "fe1"); G.px(10, 11, "y1") -- casco con vela
  G.px(8, 17, "K"); G.px(12, 17, "K")
  G.rect(13, 21, 28, 26, "wd2")
  G.ellipse(19, 21, 5, 4, "rk2"); G.ellipse(25, 22, 4, 4, "rk1"); G.ellipse(22, 17, 3, 3, "rk2")
  local h = f == 0 and 0 or 2
  G.thick(4, 22, 2, 15 - h, 2, "le1")
end)

-- Kili, escondido en una grieta: solo se le ven los ojos y la vela del casco
sprite("kili_escondido", 32, 32, function(G, f)
  G.poly({{4, 30}, {9, 4}, {23, 3}, {28, 30}}, "rk2")
  G.poly({{13, 28}, {14, 9}, {18, 9}, {19, 28}}, "dk")
  G.ellipse(16, 15, 2.5, 2, "fe1"); G.px(16, 12, "y1"); G.px(16, 11, f == 0 and "zz1" or "y1")
  G.px(15, 18, "W"); G.px(17, 18, "W"); G.ellipse(16, 21, 2.5, 1.5, "br2")
end)

-- una nota quemada sobre una roca, con un eclipse dibujado
sprite("nota_suelo", 32, 32, function(G, f)
  G.ellipse(16, 25, 12, 5, "rk2"); G.ellipse(16, 23, 10, 4, "rk1")
  G.poly({{8, 21}, {22, 16}, {25, 22}, {11, 27}}, "pa")
  G.line(8, 21, 11, 27, "sk3"); G.line(22, 16, 25, 22, "sk3")
  G.ellipse(17, 21, 2.6, 2.6, "ec2"); G.ellipse(16.3, 20.4, 1.8, 1.8, "pa")
  if f == 1 then G.px(20, 18, "ev") end
end)

-- la red de Nilo tirada en la orilla, con algo que se mueve adentro
sprite("red_pesca", 32, 32, function(G, f)
  G.ellipse(16, 25, 15, 5, "aq2")
  G.ellipse(16, 22, 11, 6, "t1")
  for i = 0, 5 do G.line(6 + i * 4, 17, 8 + i * 3, 27, "y2") end
  for i = 0, 2 do G.line(6, 19 + i * 3, 26, 19 + i * 3, "y2") end
  local x = f == 0 and 14 or 17
  G.ellipse(x, 22, 2.5, 1.5, "sp1"); G.px(x - 1, 21, "K")
end)

-- una rama recta de roble entre las raíces
sprite("rama_suelo", 32, 32, function(G, f)
  G.ellipse(16, 26, 13, 3.5, "t2")
  G.thick(5, 25, 27, 20, 2, "wd2"); G.line(5, 24, 27, 19, "wd1")
  G.line(18, 22, 21, 17, "wd2"); G.poly({{21, 17}, {25, 14}, {23, 18}}, "v2")
  G.line(3, 28, 9, 26, "wd3"); G.line(24, 28, 29, 26, "wd3")
  if f == 1 then G.px(14, 19, "W") end
end)

-- ================================================================ Costas Muertas
-- la botella con la carta de Ignar, varada en la arena
sprite("botella_mensaje", 32, 32, function(G, f)
  G.ellipse(16, 26, 12, 3, "ar3"); G.line(5, 27, 27, 27, "es")
  G.thick(8, 23, 22, 18, 4, "aq3"); G.thick(9, 22, 21, 18, 2, "aq2"); G.rect(22, 16, 25, 19, "wd2")
  G.rect(12, 19, 17, 21, "pa"); G.px(13, 20, "t2"); G.px(15, 20, "t2")
  if f == 1 then G.px(11, 19, "W"); G.px(12, 18, "W") end
end)
-- los restos quemados de un bote, con un jirón de vela negra
sprite("barco_quemado", 32, 32, function(G, f)
  G.ellipse(16, 27, 14, 3.5, "ar3")
  G.poly({{3, 20}, {28, 18}, {25, 27}, {6, 28}}, "sk2"); G.poly({{5, 21}, {26, 19}, {24, 25}, {7, 26}}, "sk3")
  for _, x in ipairs({9, 14, 19, 24}) do G.line(x, 19, x - 1, 27, "t2") end
  G.thick(17, 6, 17, 20, 2, "wd3"); G.poly({{18, 7}, {27, 9 + f}, {25, 15}, {18, 13}}, "ec2")
  if f == 1 then G.px(6, 18, "y1"); G.px(22, 17, "y2") end
end)
-- huellas de botas en la arena que se van hacia el oeste
sprite("huellas_botas", 32, 32, function(G, f)
  G.ellipse(16, 22, 15, 8, "ar2")
  for i = 0, 3 do
    local x, y = 26 - i * 7, 16 + (i % 2) * 6
    G.ellipse(x, y, 2, 1.5, "ar3"); G.rect(x - 1, y + 2, x + 1, y + 3, "ar3")
  end
  if f == 1 then G.px(4, 18, "W") end
end)
-- el cofre de Rhaegar, lleno de Cristales de Eclipse robados
sprite("cofre_cristales", 32, 32, function(G, f)
  G.ellipse(16, 27, 13, 3, "rk3")
  G.rect(6, 15, 26, 26, "wd2"); G.rect(6, 15, 26, 16, "wd1"); G.rect(6, 20, 26, 20, "bz"); G.rect(15, 19, 17, 22, "bz")
  G.poly({{6, 15}, {9, 8}, {29, 8}, {26, 15}}, "wd3")
  for _, c in ipairs({{10, 14}, {15, 12}, {20, 14}, {24, 13}}) do G.poly({{c[1], c[2] + 3}, {c[1] + 2, c[2] - 3}, {c[1] + 4, c[2] + 3}}, "ec1"); G.px(c[1] + 2, c[2] - 1, f == 0 and "ev" or "ev2") end
end)
-- Galleta, el loro de Rhaegar
sprite("loro", 32, 32, function(G, f)
  G.thick(4, 27, 28, 27, 2, "wd2")
  G.ellipse(16, 18, 5, 7, "lo1"); G.ellipse(17, 20, 3, 5, "lo2"); G.ellipse(16, 11, 4, 4, "lo1")
  G.poly({{11, 10}, {8, 12 + f}, {11, 13}}, "lo3"); G.px(15, 10, "K"); G.px(14, 9, "W")
  G.thick(19, 18, 24, 26, 2, "lo4"); G.thick(17, 25, 18, 27, 1, "lo3"); G.thick(14, 25, 14, 27, 1, "lo3")
  if f == 1 then G.px(5, 6, "W"); G.px(7, 5, "W"); G.px(9, 6, "W") end
end)
-- la Caracola del Rey: enorme, dorada, medio enterrada en el barro
sprite("caracola", 32, 32, function(G, f)
  G.ellipse(16, 26, 13, 3.5, "t2")
  G.poly({{4, 24}, {14, 10}, {28, 18}, {24, 26}}, "nc1"); G.poly({{8, 23}, {15, 13}, {24, 19}, {21, 24}}, "nc2")
  for i = 0, 4 do G.line(12 + i * 3, 12 + i, 10 + i * 3, 24, "go2") end
  G.ellipse(26, 21, 3, 4, "co1"); G.px(25, 20, "go1")
  if f == 1 then G.px(14, 9, "W"); G.px(15, 8, "W") end
end)
-- el mapa del fondeadero de Velanegra, enrollado sobre una roca
sprite("mapa_fondeadero", 32, 32, function(G, f)
  G.ellipse(16, 25, 13, 5, "rk2"); G.ellipse(15, 22, 11, 4, "rk1")
  G.rect(8, 15, 24, 21, "pa"); G.ellipse(8, 18, 2, 3, "y2"); G.ellipse(24, 18, 2, 3, "y2")
  G.line(10, 17, 15, 19, "dr"); G.line(15, 19, 21, 16, "dr"); G.ellipse(20, 17, 2, 2, "ec2")
  if f == 1 then G.px(12, 14, "W") end
end)
-- el farol de la luz negra, en lo alto del Faro Negro
sprite("farol_negro", 32, 32, function(G, f)
  G.ellipse(16, 28, 10, 2.5, "rk3")
  G.rect(13, 20, 19, 27, "rk3"); G.rect(10, 8, 22, 20, "ec3"); G.rect(11, 9, 21, 19, "ec2")
  G.ellipse(16, 14, 4, 4, f == 0 and "ev2" or "ev"); G.ellipse(16, 14, 2, 2, "K")
  G.rect(9, 6, 23, 8, "rk2"); G.poly({{11, 6}, {16, 1}, {21, 6}}, "rk3")
end)
-- la cadena de la Bestia, clavada en la roca con un cristal de eclipse
sprite("cadena_bestia", 32, 32, function(G, f)
  G.ellipse(16, 26, 13, 4, "rk2"); G.ellipse(16, 24, 10, 3, "rk1")
  for i = 0, 5 do G.ellipse(4 + i * 4, 20 + (i % 2), 2, 1.5, "fe2"); G.px(4 + i * 4, 20 + (i % 2), "fe1") end
  G.poly({{22, 22}, {25, 8}, {28, 22}}, "ec1"); G.px(25, 13, f == 0 and "ev" or "ev2")
end)
-- la red rota de Marul, colgando de dos palos
sprite("red_rota", 32, 32, function(G, f)
  G.ellipse(16, 28, 13, 2.5, "ar3"); G.rect(4, 6, 5, 28, "wd2"); G.rect(26, 6, 27, 28, "wd2"); G.rect(5, 7, 26, 7, "y3")
  for y = 9, 23, 4 do for x = 6, 25 do if (x + y) % 4 == 0 and not (x > 13 and x < 19 and y > 12) then G.px(x, y, "sk1") end end end
  for x = 7, 25, 4 do for y = 8, 24 do if (x + y) % 4 == 0 and not (x > 13 and x < 19 and y > 12) then G.px(x, y, "sk1") end end end
  G.line(14, 13, 12 + f, 26, "sk1"); G.line(18, 13, 20 - f, 25, "sk1")
end)
-- Trueno en un bote de pesca, con cara de que no sabe cómo llegó ahí
sprite("trueno_barco", 32, 32, function(G, f)
  G.ellipse(16, 27, 15, 3.5, "ma1"); G.line(2, 25, 30, 25, "es")
  horse(G, 2, 2 + f, 0, false)
  G.poly({{2, 21}, {30, 21}, {27, 28}, {5, 28}}, "wd2"); G.rect(3, 21, 29, 22, "wd1")
end)
-- Trueno comiendo algas en el manglar
sprite("trueno_algas", 32, 32, function(G, f)
  G.ellipse(16, 27, 14, 3.5, "t2")
  horse(G, 2, 0, f == 0 and 9 or 10, true)
  for _, x in ipairs({0, 2, 4}) do G.line(x, 30, x + 1, 22, "lo2") end
end)
-- Trueno nadando con los tritones (solo se le ve la cabeza y la crin)
sprite("trueno_nadando", 32, 32, function(G, f)
  G.ellipse(16, 24, 15, 6, "aq3"); G.ellipse(16, 23, 13, 4, "aq2")
  horse(G, 4, 6 + f, 0, false)
  G.ellipse(18, 26, 14, 5, "aq3")
  for i = 0, 3 do G.px(3 + i * 8 + f * 2, 22, "aq1") end
end)

-- Tundra Eterna: una hoguera apagada bajo la nieve (la T2 enciende tres)
sprite("hoguera_apagada", 32, 32, function(G, f)
  G.ellipse(16, 26, 13, 4, "sn2"); G.ellipse(16, 25, 10, 3, "sn1")
  for i = 0, 7 do local a = i * math.pi / 4; G.ellipse(16 + math.cos(a) * 8, 25 + math.sin(a) * 2.5, 2, 1.5, "rk2") end
  G.thick(10, 24, 22, 19, 2, "wd2"); G.thick(10, 19, 22, 24, 2, "wd3"); G.thick(16, 18, 16, 25, 2, "wd2")
  G.ellipse(16, 18, 5, 1.5, "sn1"); G.px(13, 17, "sn1")
  if f == 1 then G.px(17, 12, "sn3"); G.px(18, 9, "sn3") else G.px(15, 13, "sn3"); G.px(16, 10, "sn3") end
end)
-- Trueno revolcándose en la nieve, con la crin llena de escarcha
sprite("trueno_nieve", 32, 32, function(G, f)
  G.ellipse(16, 27, 15, 3.5, "sn2")
  horse(G, 2, 0, f == 0 and 1 or 2, true)
  G.px(9, 9, "sn1"); G.px(11, 12, "sn1"); G.px(17, 13, "sn1")
  for _, p in ipairs({{2, 29}, {27, 28}, {30, 26}}) do G.ellipse(p[1], p[2], 2, 1, "sn1") end
  if f == 1 then G.px(4, 20, "sn1"); G.px(28, 18, "sn1") end
end)
-- el muñeco de nieve de Tilo, con su yelmo y el pañuelo rojo de Anka
sprite("muneco_nieve", 32, 32, function(G, f)
  G.ellipse(16, 28, 12, 3, "sn2")
  G.ellipse(16, 23, 8, 6, "sn1"); G.ellipse(16, 14, 6, 5, "sn1"); G.ellipse(17, 24, 5, 3, "sn2")
  G.ellipse(16, 7, 4, 3.5, "sn1")
  G.rect(12, 2, 20, 5, "fe1"); G.rect(12, 2, 20, 2, "W"); G.rect(15, 0, 16, 2, "dr")
  G.px(14, 7, "K"); G.px(17, 7, "K"); G.rect(18, 8, 21, 8, "y2")
  G.rect(11, 10, 21, 11, "dr"); G.thick(19, 11, 21, 16, 2, "dr")
  G.px(16, 13, "K"); G.px(16, 16, "K")
  G.thick(10, 14, 4, 10 - f, 1, "wd2"); G.thick(22, 14, 28, 10 + f, 1, "wd2")
end)
-- una cría de mamut, peluda como una alfombra
sprite("cria_mamut", 32, 32, function(G, f)
  G.ellipse(16, 28, 12, 3, "sn2")
  for _, x in ipairs({10, 13, 19, 22}) do G.rect(x, 22 + (x % 2 == 0 and f or 0), x + 2, 27, "br3") end
  G.ellipse(16, 19, 9, 6, "br2"); G.ellipse(15, 17, 7, 4, "br1")
  for x = 9, 23, 2 do G.line(x, 22, x + 1, 25, "br3") end
  G.ellipse(7, 17, 4, 4, "br2"); G.ellipse(7, 16, 3, 3, "br1"); G.px(6, 15, "K")
  G.thick(5, 19, 4, 25 - f, 2, "br2"); G.px(8, 20, "pa"); G.px(9, 20, "pa")
  G.thick(25, 17, 28, 20, 1, "br3")
  G.ellipse(16, 13, 5, 1.5, "sn1")
end)

-- ---------------------------------------------------------------- Catacumbas del Abismo
-- la reja de los obispos: barrotes oxidados en un arco de piedra, con la marca de tiza de Ilse
sprite("reja_oxidada", 32, 32, function(G, f)
  G.ellipse(16, 30, 13, 2, "cs3")
  G.rect(3, 6, 6, 30, "cs2"); G.rect(26, 6, 29, 30, "cs2"); G.ellipse(16, 7, 13, 5, "cs1"); G.rect(7, 7, 25, 9, "cs1")
  for x = 8, 24, 4 do G.rect(x, 9, x + 1, 29, "ox2"); G.px(x, 10 + (x % 3) * 5, "ox1") end
  G.rect(7, 15, 25, 16, "ox3"); G.rect(7, 24, 25, 25, "ox3"); G.rect(14, 18, 18, 21, "ox1"); G.px(16, 19, "K")
  G.line(20, 18, 23, 21, f == 0 and "W" or "pa"); G.line(20, 21, 23, 18, f == 0 and "W" or "pa")
end)
-- el espejito de plata rajado, entre telarañas
sprite("espejo_roto", 32, 32, function(G, f)
  G.ellipse(16, 28, 10, 2.5, "cs3")
  G.ellipse(15, 18, 8, 8, "sx2"); G.ellipse(15, 18, 6.5, 6.5, "aq2"); G.line(10, 14, 20, 23, "sx3"); G.line(15, 11, 13, 25, "sx3")
  G.thick(20, 24, 26, 28, 2, "sx2"); G.px(12 + f, 14, "W"); G.px(13 + f, 15, "W")
  for i = 0, 6 do G.px(2 + i * 2, 4 + i, "sn2"); G.px(28 - i, 3 + i * 2, "sn2") end
end)
-- una moneda de plata con agujero, medio enterrada en el barro de la orilla
sprite("moneda_suelo", 32, 32, function(G, f)
  G.ellipse(16, 24, 12, 5, "mb1"); G.ellipse(14, 23, 8, 3, "mb2")
  G.ellipse(17, 20, 5, 4, "sx2"); G.ellipse(17, 19.5, 4, 3, "sx1"); G.ellipse(17, 19.5, 1, 1, "mb2")
  if f == 0 then G.px(13, 16, "W"); G.px(12, 15, "W"); G.px(14, 15, "W") else G.px(21, 17, "W") end
end)
-- Trueno en el Jardín de Hongos, comiendo setas que brillan (y brillando él también)
sprite("trueno_hongos", 32, 32, function(G, f)
  for _, p in ipairs({{3, 27, 3}, {27, 26, 4}, {22, 29, 2}}) do
    G.rect(p[1], p[2] - p[3], p[1] + 1, p[2], "pa"); G.ellipse(p[1] + 0.5, p[2] - p[3], p[3] + 1, p[3], "fu2"); G.px(p[1], p[2] - p[3] - 1, "fu3")
  end
  horse(G, 2, 0, f == 0 and 8 or 9, true)
  for _, p in ipairs({{3, 15}, {14, 12}, {24, 13}, {9, 20}}) do G.px(p[1] + f, p[2], "fu3") end
  G.px(3, 17 + f, "fu1")
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
