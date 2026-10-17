-- Trueno, el caballo gris de Gaspar (con su mancha blanca), caminando: para las escoltas de misión
-- (gpr/src/game/world/escolta.js). Mismo dibujo y paleta que en crear_puntos_mision.lua y el mismo
-- formato que los NPCs: 32x32, 9 cuadros (abajo x3, arriba x3, lado x3; de lado mira a la derecha).
-- Salida: <dir>/caminar/npc_trueno.aseprite y <png>/caminar/npc_trueno.png (tira de 288x32)
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script art/sprites/mundo/crear_trueno_caminar.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local PAL = {}
for k, v in pairs({ K="141420", h1="b8b4bc", h2="8a8692", h3="5e5a68", hm="3a3640", hb="f4f0f4" }) do PAL[k] = hex(v) end

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
  function G.ellipse(cx, cy, rx, ry, c)
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 then G.px(x, y, c) end
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
  -- espejo horizontal (el dibujo de lado se hace mirando a la izquierda, como en los puntos de misión)
  function G.mirror()
    local n = {}
    for k, c in pairs(g) do n[(k // W) * W + (W - 1 - k % W)] = c end
    for k in pairs(g) do g[k] = nil end
    for k, c in pairs(n) do g[k] = c end
  end
  return G
end

local function toImage(G)
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
  local img = Image(W, H, ColorMode.RGB)
  for k, c in pairs(g) do img:drawPixel(k % W, k // W, PAL[c]) end
  return img
end

-- de lado (mirando a la izquierda): las patas se cruzan al caminar
local LEGS = {
  [0] = {{7, 0}, {10, 0}, {19, 0}, {22, 0}},
  [1] = {{5, -1}, {11, 0}, {17, 0}, {23, -1}},
  [2] = {{9, 0}, {8, -1}, {21, -1}, {20, 0}},
}
local function side(G, step)
  local ox, oy = 1, 1
  local bob = step == 0 and 0 or 1
  for _, l in ipairs(LEGS[step]) do
    local x, lift = l[1], l[2]
    G.rect(ox + x, oy + 20, ox + x + 1, oy + 26 + lift, "h3")
    G.rect(ox + x, oy + 26 + lift, ox + x + 1, oy + 27 + lift, "hm")
  end
  G.ellipse(ox + 15, oy + 17 - bob, 10, 5.5, "h1")
  G.ellipse(ox + 16, oy + 19 - bob, 8, 3, "h2")
  G.ellipse(ox + 18, oy + 16 - bob, 3, 2, "hb") -- la mancha blanca
  G.thick(ox + 25, oy + 14 - bob, ox + 28 + step % 2, oy + 22, 2, "hm") -- cola
  G.thick(ox + 8, oy + 15 - bob, ox + 4, oy + 8 - bob, 4, "h1")
  G.poly({{ox + 1, oy + 7 - bob}, {ox + 6, oy + 5 - bob}, {ox + 6, oy + 11 - bob}, {ox - 1, oy + 12 - bob}}, "h1")
  G.rect(ox - 1, oy + 11 - bob, ox + 2, oy + 12 - bob, "h2")
  G.thick(ox + 6, oy + 6 - bob, ox + 10, oy + 13 - bob, 2, "hm") -- crin
  G.px(ox + 3, oy + 8 - bob, "K")
  G.px(ox + 5, oy + 4 - bob, "h2")
  G.mirror()
end

-- de frente: cabeza larga con la mancha en la frente, pecho y las dos patas delanteras
local function front(G, step)
  local l, r = step == 1 and -1 or 0, step == 2 and -1 or 0
  G.rect(11, 21, 12, 27 + l, "h3"); G.rect(11, 27 + l, 12, 28 + l, "hm")
  G.rect(19, 21, 20, 27 + r, "h3"); G.rect(19, 27 + r, 20, 28 + r, "hm")
  G.ellipse(16, 19, 7, 5.5, "h1")
  G.ellipse(16, 21, 5, 3, "h2")
  G.rect(12, 3, 13, 6, "h1"); G.px(12, 2, "h1"); G.rect(19, 3, 20, 6, "h1"); G.px(20, 2, "h1") -- orejas
  G.ellipse(16, 10, 4, 6, "h1")
  G.rect(14, 13, 18, 16, "h2") -- hocico
  G.px(15, 15, "K"); G.px(17, 15, "K")
  G.px(13, 9, "K"); G.px(19, 9, "K")
  G.ellipse(16, 7.5, 1.5, 1.5, "hb") -- la mancha blanca
  G.px(16, 4, "hm"); G.px(15, 5, "hm"); G.px(17, 5, "hm") -- copete
end

-- de espaldas: grupa, cola que se mece y la crin entre las orejas
local function back(G, step)
  local l, r = step == 1 and -1 or 0, step == 2 and -1 or 0
  G.rect(11, 21, 12, 27 + l, "h3"); G.rect(11, 27 + l, 12, 28 + l, "hm")
  G.rect(19, 21, 20, 27 + r, "h3"); G.rect(19, 27 + r, 20, 28 + r, "hm")
  G.poly({{12, 4}, {14, 7}, {12, 8}}, "h1"); G.poly({{20, 4}, {18, 7}, {20, 8}}, "h1")
  G.ellipse(16, 10, 4, 4, "h1")
  G.thick(16, 6, 16, 13, 2, "hm") -- crin
  G.ellipse(16, 18, 8, 6, "h1")
  G.ellipse(16, 17, 5, 3, "h2")
  local sway = step == 1 and -1 or (step == 2 and 1 or 0)
  G.thick(16, 15, 16 + sway, 26, 3, "hm") -- cola
end

local frames = {}
for _, draw in ipairs({front, back, side}) do
  for step = 0, 2 do
    local G = newGrid(32, 32)
    draw(G, step)
    frames[#frames + 1] = G
  end
end

local dir, png = app.params.dir, app.params.png
local spr = Sprite(32, 32, ColorMode.RGB)
spr.layers[1].name = "arte"
for i, G in ipairs(frames) do
  local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
  frame.duration = 0.15
  spr:newCel(spr.layers[1], frame, toImage(G), Point(0, 0))
end
for i, name in ipairs({"abajo", "arriba", "lado"}) do local t = spr:newTag(i * 3 - 2, i * 3); t.name = name end
spr:saveAs(dir .. "/caminar/npc_trueno.aseprite")
spr:close()
if png then
  local strip = Image(32 * #frames, 32, ColorMode.RGB)
  -- toImage pinta el contorno sobre la grilla: se vuelve a dibujar cada cuadro para la tira
  for i = 1, #frames do
    local G = newGrid(32, 32)
    ;({front, back, side})[(i - 1) // 3 + 1](G, (i - 1) % 3)
    strip:drawImage(toImage(G), Point((i - 1) * 32, 0))
  end
  local s = Sprite(32 * #frames, 32, ColorMode.RGB)
  s:newCel(s.layers[1], s.frames[1], strip, Point(0, 0))
  s:saveCopyAs(png .. "/caminar/npc_trueno.png")
  s:close()
end
