-- Escenario por fase de las Costas Muertas (game/world/escena.js): objetos del mapa que se ven o no
-- según la historia de cada jugador. Tiras horizontales de cuadros en <png>/escena/<nombre>.png y
-- el .aseprite en <dir>/escena/.
--   barricada          64x32   cajas y tablas frente a los almacenes del puerto (antes de la C2)
--   reja               32x32   los barrotes de la celda de Rhaegar en la capitanía (C4 a C9)
--   heridos            64x32   tritones heridos sobre esteras en la pasarela de Coralia (antes de la C6)
--   barco_negro        128x96  el barco sin bandera, fondeado en el Cementerio (antes de la C12), 2 cuadros
--   mastil_hundido     32x64   lo que queda del barco sin bandera (después de la C12)
--   luz_negra          64x32   la luz negra del Faro Negro (antes de la C13), 2 cuadros
--   luz_faro           64x32   la luz dorada del faro, otra vez encendida (Bartolo), 2 cuadros
--   gaviota_insolente  128x96  el barco de Rhaegar (en la Cala hasta la C9; después, en el puerto),
--                              copiado de los tiles barco_pirata del tileset
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script art/sprites/mundo/crear_escena_costas.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local PAL = {}
for k, v in pairs({
  K="141420", W="ffffff",
  wd1="c08850", wd2="8a5a30", wd3="5a3818", fe1="c8d0dc", fe2="8a96a8", fe3="5e6878",
  ar3="b49c6a", bj1="62c6be", bj2="48aaa6", es="f2fbf8", ma1="2c7ea0",
  tr1="7ac4b4", tr2="4e9688", tf="5ab0d8", st1="d8c28c", st2="a8906a", bl="f2f0e8", sg="c03030",
  ng1="3a3640", ng2="242028", ng3="141218", vl1="2a2630", vl2="1a1820",
  ec1="c890ff", ec2="8a50d8", ec3="4e2490", go1="ffe08a", go2="ffc040", go3="e09020",
}) do PAL[k] = hex(v) end
local GLOW = { es = true, ec1 = true, ec2 = true, go1 = true, go2 = true, go3 = true }

local function newGrid(W, H)
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c) x, y = math.floor(x + 0.5), math.floor(y + 0.5); if x >= 0 and x < W and y >= 0 and y < H then g[y * W + x] = c end end
  function G.rect(x0, y0, x1, y1, c) for y = y0, y1 do for x = x0, x1 do G.px(x, y, c) end end end
  function G.line(x0, y0, x1, y1, c) local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1); for i = 0, n do G.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c) end end
  function G.ellipse(cx, cy, rx, ry, c) for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do local dx, dy = (x - cx) / rx, (y - cy) / ry; if dx * dx + dy * dy <= 1 then G.px(x, y, c) end end end end
  return G
end
local function toImage(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y = 0, H - 1 do for x = 0, W - 1 do
    if not g[y * W + x] then
      for _, o in ipairs({{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) do
        local nx, ny = x + o[1], y + o[2]
        local n = (nx >= 0 and nx < W and ny >= 0 and ny < H) and g[ny * W + nx]
        if n and n ~= "K" and not GLOW[n] then out[y * W + x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(W, H, ColorMode.RGB)
  for k, c in pairs(g) do img:drawPixel(k % W, k // W, PAL[c]) end
  return img
end

local SCENES = {}
local function scene(name, w, h, frames, draw) SCENES[#SCENES + 1] = { name = name, w = w, h = h, frames = frames, draw = draw } end

scene("barricada", 64, 32, 1, function(G)
  G.ellipse(32, 29, 30, 3, "ar3")
  for _, b in ipairs({{2, 14, 18, 28}, {20, 18, 34, 28}, {40, 12, 58, 28}}) do
    G.rect(b[1], b[2], b[3], b[4], "wd2"); G.rect(b[1], b[2], b[3], b[2] + 1, "wd1"); G.line(b[1], b[2], b[3], b[4], "wd3"); G.line(b[3], b[2], b[1], b[4], "wd3")
  end
  G.rect(0, 10, 63, 12, "wd1"); G.rect(0, 12, 63, 12, "wd3"); G.line(8, 4, 30, 12, "wd2"); G.line(44, 2, 26, 12, "wd2")
end)

scene("reja", 32, 32, 1, function(G)
  G.rect(2, 2, 29, 4, "fe3"); G.rect(2, 28, 29, 30, "fe3")
  for x = 4, 28, 5 do G.rect(x, 4, x + 1, 28, "fe2"); G.px(x, 5, "fe1"); G.px(x, 15, "fe1") end
  G.rect(2, 15, 29, 16, "fe3")
end)

scene("heridos", 64, 32, 1, function(G)
  for _, e in ipairs({{2, 18}, {34, 18}}) do
    G.rect(e[1], e[2], e[1] + 27, e[2] + 9, "st1"); for x = e[1], e[1] + 27, 3 do G.rect(x, e[2], x, e[2] + 9, "st2") end
    -- el tritón acostado, con una venda
    G.ellipse(e[1] + 8, e[2] + 4, 4, 3, "tr1"); G.px(e[1] + 3, e[2] + 3, "tf"); G.px(e[1] + 13, e[2] + 3, "tf")
    G.rect(e[1] + 12, e[2] + 2, e[1] + 25, e[2] + 7, "bl"); G.rect(e[1] + 12, e[2] + 2, e[1] + 25, e[2] + 2, "tr2")
    G.rect(e[1] + 6, e[2] + 1, e[1] + 10, e[2] + 1, "bl"); G.px(e[1] + 8, e[2] + 1, "sg")
  end
  G.ellipse(31, 12, 3, 2, "bj2"); G.ellipse(31, 11, 2, 1, "bj1")
end)

-- el barco sin bandera: casco negro, velas negras raídas y el eclipse que brilla en la proa
scene("barco_negro", 128, 96, 2, function(G, f)
  G.ellipse(64, 90, 60, 5, "bj2")
  for y = 58, 88 do local half = math.floor(58 - (y - 58) * 0.6); G.rect(64 - half, y, 64 + half, y, (y // 4) % 2 == 0 and "ng2" or "ng3") end
  G.rect(8, 58, 120, 61, "ng1"); for x = 22, 106, 14 do G.ellipse(x, 68, 2, 2, "K") end
  for _, m in ipairs({{44, 8, 32, 54}, {86, 14, 28, 54}}) do
    local mx, top, w, bot = m[1], m[2], m[3], m[4]
    G.rect(mx - 1, top - 6, mx + 1, bot + 4, "ng1")
    for y = top, bot - 8 do
      local bulge = math.floor(math.sin((y - top) / (bot - 8 - top) * math.pi) * (f == 0 and 3 or 4))
      for x = mx - w // 2 - bulge, mx + w // 2 + bulge do if (x * 7 + y * 3) % 23 ~= 0 then G.px(x, y, (y // 6) % 2 == 0 and "vl1" or "vl2") end end
    end
    for x = mx - w // 2, mx + w // 2, 5 do G.line(x, bot - 8, x + 1, bot - 4, "vl1") end
  end
  G.ellipse(112, 60, 4, 4, "ec2"); G.ellipse(112, 60, 2, 2, f == 0 and "ec1" or "W"); G.ellipse(113, 59, 2, 2, "K")
end)

scene("mastil_hundido", 32, 64, 1, function(G)
  G.ellipse(16, 58, 14, 4, "bj2"); G.ellipse(16, 57, 10, 2, "bj1")
  G.rect(14, 6, 18, 57, "ng1"); G.rect(14, 6, 15, 57, "ng2"); G.rect(6, 16, 26, 18, "ng1")
  for i = 0, 4 do G.line(7 + i * 4, 19, 6 + i * 4, 30 + i % 2 * 3, "vl1") end
  G.line(4, 57, 28, 57, "es")
end)

local function light(G, f, c1, c2, c3)
  G.ellipse(32, 16, 12 + f * 2, 12 + f * 2, c3); G.ellipse(32, 16, 8, 8, c2); G.ellipse(32, 16, 4, 4, c1)
  for i = 0, 3 do G.line(32 - 14 - i * 4, 16 + i, 32 - 20 - i * 6, 16 + i * 2, c3); G.line(32 + 14 + i * 4, 16 + i, 32 + 20 + i * 6, 16 + i * 2, c3) end
end
scene("luz_negra", 64, 32, 2, function(G, f) light(G, f, "ec1", "ec2", "ec3") end)
scene("luz_faro", 64, 32, 2, function(G, f) light(G, f, "W", "go1", "go2") end)

local dir, png = app.params.dir, app.params.png
for _, s in ipairs(SCENES) do
  local frames = {}
  for f = 0, s.frames - 1 do local G = newGrid(s.w, s.h); s.draw(G, f); frames[#frames + 1] = toImage(G) end
  local spr = Sprite(s.w, s.h, ColorMode.RGB)
  for i, img in ipairs(frames) do
    local fr = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    fr.duration = 0.4
    spr:newCel(spr.layers[1], fr, img, Point(0, 0))
  end
  spr:saveAs(dir .. "/escena/" .. s.name .. ".aseprite")
  spr:close()
  local strip = Image(s.w * #frames, s.h, ColorMode.RGB)
  for i, img in ipairs(frames) do strip:drawImage(img, Point((i - 1) * s.w, 0)) end
  local out = Sprite(s.w * #frames, s.h, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], strip, Point(0, 0))
  out:saveCopyAs(png .. "/escena/" .. s.name .. ".png")
  out:close()
end

-- La Gaviota Insolente: los 12 tiles barco_pirata_<fila>_<col> del tileset, pegados en un solo cuadro
local ts = Image{ fromFile = png .. "/tileset_pradera.png" }
local f = io.open(dir .. "/tileset_pradera.json"); local meta = f:read("a"); f:close()
local ship = Image(128, 96, ColorMode.RGB)
for r = 0, 2 do for c = 0, 3 do
  local id = tonumber(meta:match('"id": (%d+), "nombre": "barco_pirata_' .. r .. '_' .. c .. '"'))
  local tile = Image(32, 32, ColorMode.RGB)
  tile:drawImage(ts, Point(-(id % 8) * 32, -(id // 8) * 32))
  ship:drawImage(tile, Point(c * 32, r * 32))
end end
local out = Sprite(128, 96, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], ship, Point(0, 0))
out:saveCopyAs(png .. "/escena/gaviota_insolente.png")
out:close()
