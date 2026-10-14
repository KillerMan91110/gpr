-- Animaciones del taller (crafteo uno por uno), 64x64 por cuadro, en hojas horizontales:
--   estaciones (donde se fabrica): yunque (equipo y lingotes), caldero (pociones), olla (comidas),
--   fuente (llenar frascos en el Pilar de Aethra), mesa (tablas, cuero, vendajes)
--   efectos (el resultado de cada unidad): exito, suerte (salió de mejor rareza), fallo
-- Salida: <dir>/crafteo/<nombre>.png y <dir>/crafteo/crafteo.json (cuadros y duraciones).
-- Uso: aseprite -b --script-param dir=D:/Sprites/v2 --script crear_crafteo.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local dir = app.params.dir
local S = 64

local PAL = {}
for k, v in pairs({
  K="141420", W="ffffff",
  fe1="d8dee8", fe2="8a96a8", fe3="4e5868",          -- hierro (yunque, martillo)
  po1="6e7280", po2="3a3e4a", po3="24262e",          -- olla y caldero
  wd1="b07a48", wd2="7a4e28", wd3="4a2c14",          -- madera
  F="fff2a8", O="ff9a3a", R="d8402a",                -- fuego y chispas
  v1="c8ff9a", v2="6ad040", v3="2e8a2a",             -- poción verde
  aq1="dcf8ff", aq2="7ad0f0", aq3="3a90c0",          -- agua del Pilar
  gl1="e8f4fa", gl2="a8c4d4",                        -- vidrio y vapor
  st1="c8c0b0", st2="948c7c", st3="5e5848",          -- piedra del Pilar
  au1="ffe070", au2="e0a830", au3="9a6a10",          -- oro (suerte)
  sm1="b4b4bc", sm2="7a7a84", sm3="50505a",          -- humo (fallo)
  pa="f0e6d0",
}) do PAL[k] = hex(v) end

local function newGrid()
  local g = {}
  local G = {g = g}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x >= 0 and x < S and y >= 0 and y < S then g[y * S + x] = c end
  end
  function G.rect(x0, y0, x1, y1, c) for y = y0, y1 do for x = x0, x1 do G.px(x, y, c) end end end
  function G.line(x0, y0, x1, y1, c)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
    for i = 0, n do G.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c) end
  end
  function G.thick(x0, y0, x1, y1, w, c)
    for t = 0, w - 1 do
      local o = t - (w - 1) / 2
      if math.abs(y1 - y0) >= math.abs(x1 - x0) then G.line(x0 + o, y0, x1 + o, y1, c) else G.line(x0, y0 + o, x1, y1 + o, c) end
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
  function G.ring(cx, cy, r, c, step)
    for a = 0, 359, step or 6 do G.px(cx + r * math.cos(math.rad(a)), cy + r * math.sin(math.rad(a)), c) end
  end
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
  local g, out = G.g, {}
  for y = 0, S - 1 do for x = 0, S - 1 do
    if not g[y * S + x] then
      for _, o in ipairs({{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) do
        local nx, ny = x + o[1], y + o[2]
        local n = (nx >= 0 and nx < S and ny >= 0 and ny < S) and g[ny * S + nx]
        if n and n ~= "K" then out[y * S + x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
end

local SHEETS = {}
-- draw(G, f) dibuja el cuadro f; lineal = sin contorno (efectos de luz y humo)
local function sheet(name, durations, draw, sinContorno)
  SHEETS[#SHEETS + 1] = {name = name, durations = durations, draw = draw, plain = sinContorno}
end

-- fueguito bajo la olla / el caldero (cambia de forma en cada cuadro)
local function fire(G, cx, y, f)
  local h = {5, 7, 6, 8, 5, 7}
  for i, dx in ipairs({-8, 0, 8}) do
    local t = h[(f + i) % 6 + 1]
    G.poly({{cx + dx - 4, y}, {cx + dx + 4, y}, {cx + dx + (f % 2 == 0 and 1 or -1), y - t}}, "R")
    G.poly({{cx + dx - 2, y}, {cx + dx + 2, y}, {cx + dx, y - t + 3}}, "O")
    G.px(cx + dx, y - 1, "F")
  end
  G.rect(cx - 14, y + 1, cx + 14, y + 3, "wd2"); G.line(cx - 14, y + 1, cx + 14, y + 1, "wd1")
end

-- ---------------------------------------------------------------- yunque
-- el martillo sube, golpea la pieza al rojo (chispas) y vuelve
local HAMMER = {{40, 8}, {35, 15}, {31, 24}, {31, 24}, {35, 15}, {40, 8}}
sheet("yunque", {170, 110, 70, 150, 120, 170}, function(G, f)
  -- yunque
  G.rect(18, 46, 46, 51, "fe2"); G.rect(18, 50, 46, 51, "fe3")
  G.rect(25, 38, 39, 45, "fe2"); G.rect(36, 38, 39, 45, "fe3")
  G.rect(12, 33, 48, 37, "fe1"); G.rect(12, 37, 48, 37, "fe2")
  G.poly({{48, 33}, {58, 35}, {48, 37}}, "fe1")
  -- pieza al rojo sobre el yunque (más brillante en el golpe)
  local hot = (f == 3 or f == 4) and "F" or "O"
  G.rect(23, 30, 37, 32, hot); G.line(23, 30, 37, 30, (f == 3 or f == 4) and "W" or "F")
  -- martillo: mango desde la mano (afuera, a la derecha) hasta la cabeza
  local h = HAMMER[f]
  G.thick(56, 30, h[1] + 3, h[2] + 2, 2, "wd1")
  G.rect(h[1] - 5, h[2] - 3, h[1] + 4, h[2] + 3, "fe2"); G.rect(h[1] - 5, h[2] - 3, h[1] + 4, h[2] - 2, "fe1")
  if f == 3 or f == 4 then
    local r = f == 3 and 6 or 11
    for _, a in ipairs({200, 230, 260, 290, 320, 340}) do
      local x, y = 30 + r * math.cos(math.rad(a)), 30 + r * math.sin(math.rad(a))
      G.px(x, y, f == 3 and "F" or "O"); if f == 4 then G.px(x + math.cos(math.rad(a)), y + math.sin(math.rad(a)), "F") end
    end
  end
end)

-- ---------------------------------------------------------------- caldero
local BUBBLES = {{{26, 28}, {36, 26}}, {{27, 24}, {37, 21}, {31, 29}}, {{28, 19}, {38, 16}, {31, 25}},
  {{29, 14}, {31, 21}, {40, 27}}, {{30, 10}, {32, 16}, {40, 22}}, {{33, 12}, {41, 17}, {25, 27}}}
sheet("caldero", {130, 130, 130, 130, 130, 130}, function(G, f)
  fire(G, 32, 58, f)
  G.ellipse(32, 43, 17, 12, "po2")
  G.ellipse(26, 40, 6, 6, "po1")
  G.rect(18, 53, 21, 55, "po3"); G.rect(43, 53, 46, 55, "po3")
  G.ellipse(32, 32, 18, 4.5, "po1")
  G.ellipse(32, 32, 15, 3, nil, function(x, y) return ((x + y + f) % 5 == 0) and "v1" or "v2" end)
  for _, b in ipairs(BUBBLES[f]) do
    G.ellipse(b[1], b[2], 2, 2, "v1"); G.px(b[1] - 1, b[2] - 1, "W")
  end
end)

-- ---------------------------------------------------------------- olla
local STEAM = {{{24, 22}, {34, 18}}, {{25, 18}, {35, 14}, {42, 22}}, {{24, 14}, {36, 10}, {41, 18}},
  {{26, 10}, {40, 14}, {30, 22}}, {{28, 22}, {39, 10}}, {{23, 20}, {33, 16}, {42, 18}}}
sheet("olla", {150, 150, 150, 150, 150, 150}, function(G, f)
  fire(G, 32, 58, f)
  G.rect(14, 33, 50, 51, "po2"); G.rect(14, 49, 50, 51, "po3"); G.rect(17, 35, 20, 48, "po1")
  G.rect(8, 36, 13, 39, "po3"); G.rect(51, 36, 56, 39, "po3")
  -- tapa que tiembla con el hervor
  local dy = (f == 2 or f == 5) and -2 or 0
  local tilt = (f == 2) and 1 or (f == 5 and -1 or 0)
  G.poly({{13, 33 + dy + tilt}, {51, 33 + dy - tilt}, {46, 29 + dy - tilt}, {18, 29 + dy + tilt}}, "po1")
  G.rect(29, 25 + dy, 35, 28 + dy, "po3")
  for _, s in ipairs(STEAM[f]) do
    G.px(s[1], s[2], "gl1"); G.px(s[1] + 1, s[2] - 1, "gl1"); G.px(s[1], s[2] - 2, "gl1"); G.px(s[1] - 1, s[2] - 3, "gl2")
  end
end)

-- ---------------------------------------------------------------- fuente (Pilar de Aethra)
-- un frasco baja, se hunde en el agua (burbujas) y sale lleno
local FLASK_Y = {12, 20, 27, 27, 20, 12}
local function flask(G, cx, top, full)
  G.rect(cx - 2, top, cx + 2, top + 2, "wd1")
  G.rect(cx - 2, top + 3, cx + 2, top + 6, "gl2")
  G.ellipse(cx, top + 11, 6, 5.5, "gl2")
  if full then G.ellipse(cx, top + 12, 4.6, 4, "aq2"); G.px(cx - 2, top + 10, "aq1") end
  G.px(cx - 4, top + 9, "W")
end
sheet("fuente", {180, 140, 140, 220, 140, 220}, function(G, f)
  -- columna del Pilar y el chorro
  G.rect(4, 6, 13, 40, "st2"); G.rect(4, 6, 6, 40, "st1"); G.rect(2, 4, 15, 7, "st1")
  G.line(14, 12, 18, 14, "aq2"); G.line(18, 14, 20, 36, "aq2"); G.line(19, 15, 21, 36, "aq1")
  -- pila de piedra con el agua
  G.ellipse(34, 46, 26, 11, "st2"); G.ellipse(34, 50, 26, 8, nil, function(x, y) return y > 50 and "st3" or nil end)
  G.ellipse(34, 41, 26, 5, "st1")
  G.ellipse(34, 41, 22, 3.6, "aq2")
  -- ondas donde cae el chorro (solo dentro del agua)
  for i = 0, 1 do
    local r = (f + i * 3) % 6 * 2.2 + 3
    for a = 0, 359, 12 do
      local x, y = 20 + r * math.cos(math.rad(a)), 41 + r * 0.32 * math.sin(math.rad(a))
      local dx, dy = (x - 34) / 21, (y - 41) / 3.2
      if dx * dx + dy * dy <= 1 then G.px(x, y, "aq1") end
    end
  end
  local top = FLASK_Y[f]
  flask(G, 36, top, f >= 5)
  if f == 3 or f == 4 then
    for _, b in ipairs({{33, 36 - f * 2}, {40, 35 - f}, {37, 31 - f}}) do G.ellipse(b[1], b[2], 1.6, 1.6, "aq1") end
  end
  -- el agua tapa la parte hundida del frasco
  if top + 16 > 41 then G.ellipse(34, 41, 22, 3.6, nil, function(x, y) return (y >= 41 and math.abs(x - 36) <= 7) and "aq2" or nil end) end
end)

-- ---------------------------------------------------------------- mesa de trabajo
local SAW_X = {0, 5, 9, 5, 0, -4}
sheet("mesa", {120, 120, 120, 120, 120, 120}, function(G, f)
  G.rect(4, 40, 60, 44, "wd1"); G.rect(4, 44, 60, 45, "wd2")
  G.rect(8, 46, 11, 60, "wd2"); G.rect(53, 46, 56, 60, "wd2")
  -- tabla que se corta
  G.rect(10, 34, 50, 39, "pa"); G.rect(10, 38, 50, 39, "wd1"); G.line(14, 36, 46, 36, "wd1")
  -- serrucho que va y viene
  local dx = SAW_X[f]
  G.poly({{20 + dx, 18}, {44 + dx, 26}, {42 + dx, 33}, {20 + dx, 27}}, "fe1")
  for x = 21, 42, 3 do G.px(x + dx, 27 + (x - 20) * 0.27 + 1, "fe2") end
  G.rect(12 + dx, 16, 21 + dx, 26, "wd1"); G.rect(14 + dx, 19, 18 + dx, 23, "K")
  -- aserrín que cae
  for i = 0, 3 do
    local y = 41 + ((f * 3 + i * 5) % 16)
    G.px(30 + i * 2 + (f % 2), y, "wd1")
  end
end)

-- ---------------------------------------------------------------- efectos del resultado
-- éxito: destello blanco y dorado que se abre en anillo con cuatro estrellitas
local function star(G, cx, cy, r, c)
  for i = -r, r do G.px(cx + i, cy, c); G.px(cx, cy + i, c) end
  if r >= 2 then G.px(cx - 1, cy - 1, "W"); G.px(cx + 1, cy + 1, "W"); G.px(cx - 1, cy + 1, "W"); G.px(cx + 1, cy - 1, "W") end
  G.px(cx, cy, "W")
end
sheet("exito", {60, 60, 70, 80, 80, 90, 90, 110}, function(G, f)
  local r = 5 + f * 3.5
  if f <= 6 then G.ring(32, 32, r, f <= 3 and "W" or "F", f <= 3 and 4 or 8) end
  if f <= 5 then G.ring(32, 32, r - 2, "au1", 10) end
  if f <= 2 then G.ellipse(32, 32, 7 - f * 2, 7 - f * 2, "W") end
  local sr = ({1, 2, 3, 3, 2, 2, 1, 1})[f]
  local d = 10 + f * 2.5
  for _, a in ipairs({45, 135, 225, 315}) do star(G, 32 + d * math.cos(math.rad(a)), 32 + d * math.sin(math.rad(a)), sr, "F") end
end, true)

-- suerte: rayos dorados que giran, anillo y una estrella grande que late
sheet("suerte", {70, 70, 80, 80, 90, 90, 110, 140}, function(G, f)
  local len = math.min(28, 6 + f * 4)
  for i = 0, 7 do
    local a = math.rad(i * 45 + f * 6)
    local c = (i % 2 == 0) and "au1" or "au2"
    for t = 6, len, 1 do
      if f < 7 or t % 2 == 0 then G.px(32 + t * math.cos(a), 32 + t * math.sin(a), c) end
    end
  end
  if f <= 6 then G.ring(32, 32, 8 + f * 3, "F", 5) end
  local sr = ({3, 5, 7, 6, 7, 6, 5, 3})[f]
  star(G, 32, 32, sr, "au1"); star(G, 32, 32, math.max(1, sr - 2), "W")
  for _, p in ipairs({{12, 14}, {52, 18}, {16, 50}, {50, 48}}) do
    if (f + p[1]) % 3 ~= 0 then star(G, p[1], p[2], 1, "F") end
  end
end, true)

-- fallo: grieta y una nube de humo gris que crece, sube y se deshace
local PUFFS = {{0, 0, 6}, {-9, 3, 5}, {9, 2, 5}, {-4, -7, 5}, {6, -6, 4}}
sheet("fallo", {70, 80, 90, 100, 110, 120, 130, 150}, function(G, f)
  if f <= 3 then
    G.line(26, 26, 31, 32, "K"); G.line(31, 32, 29, 37, "K"); G.line(31, 32, 37, 30, "K"); G.line(37, 30, 40, 35, "K")
  end
  local grow = 0.5 + f * 0.25
  for i, p in ipairs(PUFFS) do
    local cx, cy = 32 + p[1] * grow, 34 + p[2] * grow - f * 1.5
    local r = p[3] * grow
    G.ellipse(cx, cy, r, r, nil, function(x, y)
      -- al final se deshace: cada vez quedan menos píxeles (ruido fijo, no rayas)
      local n = (x * x * 7 + y * y * 13 + x * y * 5 + i * 37) % 10
      if f >= 6 and n < (f - 5) * 3 then return nil end
      if y > cy + r * 0.35 then return "sm2" end
      if x > cx + r * 0.4 then return "sm2" end
      return (x < cx - r * 0.3 and y < cy - r * 0.2) and "W" or "sm1"
    end)
  end
end, true)

-- ---------------------------------------------------------------- exportar
local meta = {}
for _, sh in ipairs(SHEETS) do
  local n = #sh.durations
  local img = Image(S * n, S, ColorMode.RGB)
  for f = 1, n do
    local G = newGrid()
    sh.draw(G, f)
    if not sh.plain then outline(G) end
    for k, c in pairs(G.g) do img:drawPixel((f - 1) * S + k % S, k // S, PAL[c] or PAL.K) end
  end
  local spr = Sprite(S * n, S, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
  spr:saveAs(dir .. "/crafteo/" .. sh.name .. ".aseprite")
  spr:saveCopyAs(dir .. "/crafteo/" .. sh.name .. ".png")
  spr:close()
  local d = {}
  for _, v in ipairs(sh.durations) do d[#d + 1] = tostring(v) end
  meta[#meta + 1] = string.format('"%s":{"frames":%d,"durations":[%s]}', sh.name, n, table.concat(d, ","))
end
local fh = io.open(dir .. "/crafteo/crafteo.json", "w")
fh:write('{"size":' .. S .. ',' .. table.concat(meta, ",") .. '}')
fh:close()
