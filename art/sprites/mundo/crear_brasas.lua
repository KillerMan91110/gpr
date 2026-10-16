-- La lluvia de brasas del Volcán Rojo (Ríos de Lava, Grieta Ardiente y Caldera del Titán):
--   clima/brasa.png     tira de 2 cuadros de 24x40: la piedra ardiente que cae, con su estela de fuego
--   clima/estallido.png tira de 5 cuadros de 48x40: el estallido de chispas y lava al tocar el suelo
-- La sombra que avisa y la marca chamuscada son las de la tormenta (crear_tormenta.lua).
-- Salida: <dir>/clima/*.aseprite y <png>/clima/*.png
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script art/sprites/mundo/crear_brasas.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=tonumber(s:sub(7,8) ~= "" and s:sub(7,8) or "ff",16)} end
local PAL = {
  K = hex("141420"), W = hex("fff8e0"), y1 = hex("ffe060"), o1 = hex("ff9a2a"), o2 = hex("e05a1a"), r1 = hex("9a2a12"),
  b1 = hex("4e4852"), b2 = hex("2e2a32"), sm = hex("6a646080"), sm2 = hex("8a848040"),
  t1 = hex("ff9a2ad0"), t2 = hex("e05a1a90"), t3 = hex("9a2a1250"),
}
local dir, png = app.params.dir, app.params.png

local function grid(W, H)
  local G = { w = W, h = H, g = {} }
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x >= 0 and x < W and y >= 0 and y < H then G.g[y * W + x] = c end
  end
  function G.disc(cx, cy, r, c) for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    if (x - cx) ^ 2 + (y - cy) ^ 2 <= r * r then G.px(x, y, c) end end end end
  function G.ell(cx, cy, rx, ry, c) for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
    if ((x - cx) / rx) ^ 2 + ((y - cy) / ry) ^ 2 <= 1 then G.px(x, y, c) end end end end
  return G
end
local function image(G)
  local img = Image(G.w, G.h, ColorMode.RGB)
  for k, c in pairs(G.g) do img:drawPixel(k % G.w, k // G.w, PAL[c]) end
  return img
end
local function save(name, W, H, frames)
  local spr = Sprite(W, H, ColorMode.RGB)
  for i, G in ipairs(frames) do
    local fr = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    fr.duration = 0.07
    spr:newCel(spr.layers[1], fr, image(G), Point(0, 0))
  end
  spr:saveAs(dir .. "/clima/" .. name .. ".aseprite")
  spr:close()
  local strip = Image(W * #frames, H, ColorMode.RGB)
  for i, G in ipairs(frames) do strip:drawImage(image(G), Point((i - 1) * W, 0)) end
  local out = Sprite(W * #frames, H, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], strip, Point(0, 0))
  out:saveCopyAs(png .. "/clima/" .. name .. ".png")
  out:close()
end

-- ---------------------------------------------------------------- la brasa que cae
-- piedra de basalto encendida abajo, con una estela de fuego que se afina hacia arriba
local function rock(G, flick)
  for i = 0, 26 do
    local w = math.max(0.6, 6 - i * 0.22) + (flick and (i % 3 == 0 and 1 or 0) or 0)
    G.disc(12 + math.sin(i * 0.7 + (flick and 1 or 0)) * 1.2, 30 - i, w, i < 6 and "o1" or (i < 14 and "t1" or (i < 20 and "t2" or "t3")))
  end
  G.disc(12, 32, 6, "K"); G.disc(12, 32, 5, "b2"); G.disc(11, 31, 3.5, "b1")
  G.px(14, 33, "o2"); G.px(10, 34, "o2"); G.px(13, 30, "y1"); G.px(9, 31, "o1"); G.px(15, 32, "o1")
  G.px(11, 30, "W")
end
local a, b = grid(24, 40), grid(24, 40)
rock(a, false); rock(b, true)
save("brasa", 24, 40, {a, b})

-- ---------------------------------------------------------------- el estallido
local frames = {}
local SPARKS = { {-1, -1}, {1, -1}, {-1, 0.2}, {1, 0.2}, {0, -1.2}, {-0.6, -0.8}, {0.6, -0.8}, {-1.2, -0.4}, {1.2, -0.4} }
for f = 0, 4 do
  local G = grid(48, 40)
  local r = 4 + f * 4
  -- humo que se abre
  if f >= 1 then G.ell(24, 30 - f * 2, r * 0.9, r * 0.5, f >= 3 and "sm2" or "sm") end
  -- charco de lava que se apaga
  local pool = math.max(0, 8 - f)
  if pool > 0 then G.ell(24, 33, pool + 4, pool * 0.45 + 1.5, "r1"); G.ell(24, 33, pool + 2, pool * 0.35 + 1, f < 2 and "o1" or "o2") end
  if f == 0 then G.disc(24, 30, 7, "y1"); G.disc(24, 30, 4, "W") end
  if f == 1 then G.disc(24, 29, 9, "o1"); G.disc(24, 29, 6, "y1"); G.disc(24, 29, 2, "W") end
  -- chispas que saltan
  for i, s in ipairs(SPARKS) do
    local d = 4 + f * 4
    local x, y = 24 + s[1] * d * 1.4, 30 + s[2] * d + f * f * 0.6
    G.px(x, y, f < 3 and "y1" or "o2"); if f < 2 then G.px(x + 1, y, "o1") end
  end
  frames[#frames + 1] = G
end
save("estallido", 48, 40, frames)
