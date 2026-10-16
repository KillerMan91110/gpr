-- La tormenta de las Montañas Grises (Cumbre del Rey y Acantilados del Trueno):
--   clima/rayo.png        tira de 4 cuadros de 48x192: el rayo que cae (se forma, golpea, se abre, se apaga)
--   clima/quemadura.png   32x32: la marca chamuscada que deja en la nieve
--   clima/sombra_rayo.png 32x32: el círculo que avisa dónde va a caer
-- Salida: <dir>/clima/*.aseprite y <png>/clima/*.png
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script art/sprites/mundo/crear_tormenta.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=tonumber(s:sub(7,8) ~= "" and s:sub(7,8) or "ff",16)} end
local PAL = {
  W = hex("ffffff"), c1 = hex("fff7c0"), c2 = hex("ffe26a"), g1 = hex("b8e4ff"), g2 = hex("6aa8ff"), g3 = hex("3a5ad8"),
  s1 = hex("2a2433"), s2 = hex("4a3f52"), s3 = hex("8a7a6a"), e1 = hex("ff9a3a"),
  k1 = hex("14142080"), k2 = hex("14142050"), k3 = hex("14142028"),
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
  function G.line(x0, y0, x1, y1, w, c)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
    for i = 0, n do G.disc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, w, c) end
  end
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
    fr.duration = 0.06
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

-- ---------------------------------------------------------------- el rayo
-- camino quebrado de arriba (0) a abajo (H-8), con dos ramas
local W, H = 48, 192
local path = { {24, 0}, {20, 22}, {28, 44}, {18, 70}, {27, 96}, {21, 120}, {29, 146}, {22, 168}, {24, 184} }
local branches = { { {28, 44}, {38, 60}, {36, 74} }, { {27, 96}, {14, 110}, {10, 126} } }
local function bolt(G, upto, core, glow, wGlow, wCore)
  for i = 1, upto - 1 do
    local a, b = path[i], path[i + 1]
    G.line(a[1], a[2], b[1], b[2], wGlow, glow)
  end
  for _, br in ipairs(branches) do
    if br[1][2] < path[upto][2] then for i = 1, #br - 1 do G.line(br[i][1], br[i][2], br[i + 1][1], br[i + 1][2], wGlow * 0.6, glow) end end
  end
  for i = 1, upto - 1 do
    local a, b = path[i], path[i + 1]
    G.line(a[1], a[2], b[1], b[2], wCore, core)
  end
  for _, br in ipairs(branches) do
    if br[1][2] < path[upto][2] then for i = 1, #br - 1 do G.line(br[i][1], br[i][2], br[i + 1][1], br[i + 1][2], wCore * 0.5, core) end end
  end
end
local frames = {}
-- 1: se forma (la mitad de arriba, finito)
local G = grid(W, H); bolt(G, 5, "g1", "g3", 1.6, 0.6); frames[1] = G
-- 2: golpea (entero, blanco, con el estallido abajo)
G = grid(W, H); bolt(G, #path, "W", "g2", 3.2, 1.2); G.ell(24, 184, 14, 6, "g1"); G.ell(24, 184, 9, 4, "W"); frames[2] = G
-- 3: se abre (más grueso, amarillo en el centro)
G = grid(W, H); bolt(G, #path, "c1", "g2", 4, 1.8); G.ell(24, 184, 16, 7, "g2"); G.ell(24, 184, 10, 4, "c1"); frames[3] = G
-- 4: se apaga
G = grid(W, H); bolt(G, #path, "g1", "g3", 1.6, 0.6); G.ell(24, 185, 10, 4, "g3"); frames[4] = G
save("rayo", W, H, frames)

-- ---------------------------------------------------------------- la quemadura en la nieve
G = grid(32, 32)
G.ell(16, 18, 12, 7, "s2"); G.ell(16, 18, 9, 5, "s1")
for i = 0, 7 do local a = i * math.pi / 4; G.line(16 + math.cos(a) * 8, 18 + math.sin(a) * 4.5, 16 + math.cos(a) * 14, 18 + math.sin(a) * 7.5, 0.6, "s3") end
G.px(14, 17, "e1"); G.px(19, 19, "e1"); G.px(17, 16, "c2")
save("quemadura", 32, 32, { G })

-- ---------------------------------------------------------------- la sombra que avisa
G = grid(32, 32)
G.ell(16, 16, 15, 9, "k3"); G.ell(16, 16, 11, 6.5, "k2"); G.ell(16, 16, 6, 3.5, "k1")
save("sombra_rayo", 32, 32, { G })
