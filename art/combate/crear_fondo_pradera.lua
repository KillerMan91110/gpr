-- Fondo de combate de la Pradera Dorada en 5 capas para parallax (640x360, pixel art).
-- 1 cielo · 2 montañas lejanas · 3 colinas y árboles · 4 suelo · 5 primer plano
-- Uso: aseprite -b --script-param dir=D:/Sprites/combate/pradera --script crear_fondo_pradera.lua
local W, H = 640, 360
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local function mix(a, b, t) return Color{r=math.floor(a.red+(b.red-a.red)*t+0.5), g=math.floor(a.green+(b.green-a.green)*t+0.5), b=math.floor(a.blue+(b.blue-a.blue)*t+0.5)} end

-- dither ordenado 4x4: da el degradado "a bandas" típico del pixel art
local BAYER = {{0,8,2,10},{12,4,14,6},{3,11,1,9},{15,7,13,5}}
local function dither(x, y, t, steps)
  local v = t * steps
  local base = math.floor(v)
  local frac = v - base
  if frac * 16 > BAYER[(y % 4) + 1][(x % 4) + 1] then base = base + 1 end
  return math.min(steps, base) / steps
end

local function newLayer() return Image(W, H, ColorMode.RGB) end
local function px(img, x, y, c) if x >= 0 and x < W and y >= 0 and y < H then img:drawPixel(x, y, c) end end
local function ellipse(img, cx, cy, rx, ry, c)
  for y = math.floor(cy-ry), math.ceil(cy+ry) do for x = math.floor(cx-rx), math.ceil(cx+rx) do
    local dx, dy = (x-cx)/rx, (y-cy)/ry
    if dx*dx + dy*dy <= 1 then px(img, x, y, c) end
  end end
end
local function rnd(seed) local s = seed; return function() s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 end end

-- ---------- 1. cielo ----------
local function sky()
  local img = newLayer()
  local top, mid, horizon = hex("4f86d6"), hex("8fbbe8"), hex("f4ddb0")
  for y = 0, H-1 do
    for x = 0, W-1 do
      local t = math.min(1, y / 230)
      local c
      if t < 0.6 then c = mix(top, mid, dither(x, y, t / 0.6, 6))
      else c = mix(mid, horizon, dither(x, y, (t - 0.6) / 0.4, 6)) end
      img:drawPixel(x, y, c)
    end
  end
  -- resplandor del sol
  for r = 44, 8, -9 do ellipse(img, 478, 112, r, r, mix(horizon, hex("fff6dc"), (44 - r) / 44)) end
  -- nubes
  local cloud, shade = hex("fbf8f0"), hex("d8e2f0")
  local R = rnd(7)
  for _, c in ipairs({{90,70},{240,48},{380,88},{560,60},{150,128},{520,140}}) do
    local n = 4 + math.floor(R() * 3)
    for i = 1, n do
      local ox, oy, rx = c[1] + (i - n/2) * 14, c[2] - math.floor(R() * 8), 12 + math.floor(R() * 12)
      ellipse(img, ox, oy + 3, rx, rx * 0.45, shade)
      ellipse(img, ox, oy, rx, rx * 0.45, cloud)
    end
  end
  return img
end

-- línea de cumbre con suma de senos (determinista)
local function ridge(x, base, amp, f1, f2, ph)
  return base - amp * (0.6 * math.sin(x * f1 + ph) + 0.4 * math.sin(x * f2 + ph * 1.7))
end

-- ---------- 2. montañas lejanas ----------
local function mountains()
  local img = newLayer()
  local far, farTop, near, mist = hex("8aa6cf"), hex("b6c9e6"), hex("6f8fbd"), hex("c9d8ec")
  for x = 0, W-1 do
    local y1 = math.floor(ridge(x, 150, 38, 0.011, 0.027, 1.2))
    for y = y1, 230 do px(img, x, y, (y - y1 < 3) and farTop or far) end
    local y2 = math.floor(ridge(x, 185, 26, 0.016, 0.041, 4.1))
    for y = y2, 235 do px(img, x, y, near) end
    -- niebla al pie
    for y = 205, 235 do if dither(x, y, (y - 205) / 30, 4) > 0.4 then px(img, x, y, mist) end end
  end
  return img
end

-- ---------- 3. colinas y árboles ----------
local function hills()
  local img = newLayer()
  local hill, hillLight, treeDark, tree, treeLight, trunk = hex("5f9a4a"), hex("7cb85a"), hex("2b5a24"), hex("3c7a32"), hex("5a9a42"), hex("4f3420")
  for x = 0, W-1 do
    local y = math.floor(ridge(x, 228, 14, 0.019, 0.05, 2.3))
    for yy = y, 262 do px(img, x, yy, (yy - y < 2) and hillLight or hill) end
  end
  local R = rnd(42)
  local x = -10
  while x < W + 10 do
    local base = math.floor(ridge(x, 228, 14, 0.019, 0.05, 2.3)) + 4
    local s = 10 + math.floor(R() * 10)
    if R() < 0.3 then
      -- pino
      for i = 0, s * 2 do
        local half = math.floor((i / (s * 2)) * s * 0.6)
        for dx = -half, half do px(img, x + dx, base - s * 2 + i, (dx < 0) and tree or treeDark) end
      end
    else
      -- árbol de copa redonda
      for yy = base - 4, base + 2 do px(img, x, yy, trunk); px(img, x + 1, yy, trunk) end
      ellipse(img, x, base - s, s, s * 0.85, treeDark)
      ellipse(img, x - 2, base - s - 2, s * 0.85, s * 0.7, tree)
      ellipse(img, x - s * 0.35, base - s * 1.35, s * 0.35, s * 0.3, treeLight)
    end
    x = x + s + math.floor(R() * 26)
  end
  return img
end

-- ---------- 4. suelo (donde pelean) ----------
local function ground()
  local img = newLayer()
  local g1, g2, g3, dirt, dirtD, dirtL = hex("6fae4a"), hex("5c9a3c"), hex("4a8432"), hex("c9a46a"), hex("a8844e"), hex("dcbc84")
  local R = rnd(99)
  for y = 248, H-1 do
    -- bandas más separadas cerca de la cámara: perspectiva
    local t = (y - 248) / (H - 248)
    local band = math.floor((t * t) * 14) % 2
    for x = 0, W-1 do
      local c = band == 0 and g1 or g2
      if R() < 0.04 then c = g3 end
      img:drawPixel(x, y, c)
    end
  end
  -- claro de tierra en el centro, donde se ubican los combatientes
  for y = 262, H-1 do
    local t = (y - 262) / (H - 262)
    local rx = 120 + t * 230
    for x = 0, W-1 do
      local dx = (x - 320) / rx
      local edge = 1 - dx * dx
      -- borde superior irregular (si no, el claro queda como un trapecio recto)
      local topFade = math.min(1, (y - 262) / 10)
      if edge > 0 then
        local n = R()
        if (edge > 0.12 or n < edge * 6) and n < topFade + 0.15 then
          local c = dirt
          if n < 0.08 then c = dirtD elseif n > 0.95 then c = dirtL end
          img:drawPixel(x, y, c)
        end
      end
    end
  end
  -- matas de pasto y flores sobre el verde
  local flowers = {hex("f0e070"), hex("e86a8a"), hex("f4f4f4")}
  for _ = 1, 160 do
    local x, y = math.floor(R() * W), 252 + math.floor(R() * (H - 252))
    local dx = (x - 320) / (120 + ((y - 262) / (H - 262)) * 230)
    if y < 262 or dx * dx > 1.05 then
      if R() < 0.35 then
        local f = flowers[1 + math.floor(R() * 3)]
        px(img, x, y, f); px(img, x - 1, y, f); px(img, x + 1, y, f); px(img, x, y - 1, f); px(img, x, y, hex("e8c050"))
      else
        px(img, x, y, g3); px(img, x - 1, y - 1, g3); px(img, x + 1, y - 2, g3); px(img, x, y - 2, g3)
      end
    end
  end
  return img
end

-- ---------- 5. primer plano (se desenfoca en el juego) ----------
local function foreground()
  local img = newLayer()
  local d1, d2, d3 = hex("2a5420"), hex("3a6e2c"), hex("4f8a38")
  local R = rnd(5)
  local function blade(bx, h, lean, c)
    for i = 0, h do
      local x = math.floor(bx + lean * (i / h) ^ 2)
      local w = math.max(0, math.floor((1 - i / h) * 3))
      for dx = -w, w do px(img, x + dx, H - 1 - i, c) end
    end
  end
  for _ = 1, 70 do
    local side = R() < 0.5
    local bx = side and math.floor(R() * 150) or W - 1 - math.floor(R() * 150)
    local h = 30 + math.floor(R() * 70) * ((side and bx < 70 or (not side and bx > W - 70)) and 1 or 0.5)
    local lean = (side and 1 or -1) * (8 + R() * 22)
    local c = ({d1, d2, d3})[1 + math.floor(R() * 3)]
    blade(bx, math.floor(h), lean, c)
  end
  -- ramas con hojas en la esquina superior izquierda
  for i = 0, 140 do
    local x, y = i, math.floor(10 + i * 0.25 + math.sin(i * 0.08) * 6)
    px(img, x, y, hex("3a2616")); px(img, x, y + 1, hex("3a2616"))
    if i % 9 == 0 then ellipse(img, x + 3, y + 7, 7, 4, d1); ellipse(img, x + 1, y + 5, 5, 3, d2) end
  end
  return img
end

local dir = app.params.dir
local layers = {
  {"1_cielo", sky}, {"2_montanas", mountains}, {"3_colinas", hills}, {"4_suelo", ground}, {"5_primer_plano", foreground},
}
local spr = Sprite(W, H, ColorMode.RGB)
for i, l in ipairs(layers) do
  local layer = (i == 1) and spr.layers[1] or spr:newLayer()
  layer.name = l[1]
  local img = l[2]()
  spr:newCel(layer, spr.frames[1], img, Point(0, 0))
  img:saveAs(dir .. "/" .. l[1] .. ".png")
end
spr:saveAs(dir .. "/fondo_pradera.aseprite")
spr:close()
