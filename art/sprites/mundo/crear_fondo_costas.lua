-- Fondo de combate de las Costas Muertas (640x360, 5 capas con parallax como el del Volcán):
--   1_cielo        cielo de bruma marina, nubes bajas y gaviotas a lo lejos
--   2_montanas     el mar hasta el horizonte: el Faro Negro en su cabo, el barco sin bandera de velas
--                  negras y, muy lejos, el humo del Volcán
--   3_colinas      acantilados de roca negra con palmeras a los lados y las olas que rompen
--   4_suelo        arena mojada con líneas de espuma, conchas y pozas (el suelo empieza en y=248)
--   5_primer_plano rocas con algas en las esquinas y gotas de espuma (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_costas.lua
local W, H, GROUND = 640, 360, 248
local FONDO = "costas"
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  -- cielo de bruma
  s0=hex("6e8ea0"), s1=hex("86a4b2"), s2=hex("9ebac2"), s3=hex("b8ccca"), s4=hex("d6dccc"),
  n1=hex("c8d2d4"), n2=hex("aab8bc"), n3=hex("e6ecea"),
  -- mar
  sea1=hex("2c7ea0"), sea2=hex("206684"), sea3=hex("174c66"), sea4=hex("62bcd4"), foam=hex("f2fbf8"), sh1=hex("62c6be"), sh2=hex("48aaa6"),
  -- lejanía (siluetas azuladas)
  far1=hex("5a7286"), far2=hex("4a6074"), far3=hex("3c4e60"), smoke=hex("8a8c94"),
  -- roca negra y arena
  r1=hex("6a6268"), r2=hex("4c464e"), r3=hex("332e36"), r4=hex("221e26"),
  ar1=hex("eedcaa"), ar2=hex("d8c28c"), ar3=hex("b49c6a"), ar4=hex("8e7a52"),
  -- palmeras y algas
  pa1=hex("5a9a3a"), pa2=hex("3c7a2c"), pa3=hex("2a5a20"), tr1=hex("7a6248"), tr2=hex("514030"),
  co1=hex("f2aaa2"), co3=hex("f6ece0"),
  K=hex("141420"), V=hex("6a3a8a"), ec1=hex("d8a0ff"),
  mist=rgba(240,246,244,90), spray=rgba(242,251,248,200), spray2=rgba(200,236,232,150),
}
local seed = 4204
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
  function L.range(peaks, bottom, c, shadeC)
    for x=0,W-1 do
      local top, side = bottom, 0
      for _,p in ipairs(peaks) do
        local h = math.max(p[2] + math.abs(x - p[1]) * p[3], p[4] or -999)
        if h < top then top = h; side = (x < p[1]) and -1 or 1 end
      end
      if top < bottom then L.rect(x, top, x, bottom, side > 0 and shadeC or c) end
    end
  end
  return L
end

local function save(L, name)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], L.img, Point(0,0))
  spr:saveCopyAs(app.params.dir .. "/" .. FONDO .. "/fondo/" .. name .. ".png")
  spr:close()
end

-- palmera: tronco curvo y hojas que caen
local function palm(L, x, base, h, lean)
  local tx, ty = x, base
  for i=0,h do
    local t = i / h
    tx = x + lean * t * t * 14
    ty = base - i
    L.rect(tx - 2, ty, tx + 2, ty, (i % 5 == 0) and P.tr2 or P.tr1)
  end
  for _, f in ipairs({{-26,-2},{-18,-12},{0,-16},{16,-12},{26,0},{-14,8},{14,10}}) do
    for k=0,18 do
      local t = k / 18
      local fx, fy = tx + f[1] * t, ty + f[2] * t + 6 * t * t
      local w = math.floor(4 * (1 - t)) + 1
      L.line(fx, fy - w * 0.4, fx, fy + w * 0.6, t < 0.5 and P.pa2 or P.pa1)
      L.px(fx, fy + w * 0.6, P.pa3)
    end
  end
  L.ellipse(tx, ty + 2, 3, 2, P.tr2)
end

-- 1: cielo de bruma con nubes bajas y gaviotas
do
  local L = layer()
  local bands = {P.s0, P.s1, P.s2, P.s3, P.s4}
  for y=0,H-1 do
    local i = math.min(5, 1 + math.floor((y / 170) * 5))
    L.rect(0, y, W-1, y, bands[i])
  end
  L.ellipse(140, 64, 20, 20, P.n3); L.ellipse(140, 64, 15, 15, hex("f6f2e0"))
  for k=0,14 do
    local cx, cy = rnd() * W, 20 + rnd() * 110
    local rx = 50 + rnd() * 90
    L.ellipse(cx, cy, rx, 6 + rnd() * 6, k % 3 == 0 and P.n2 or P.n1)
    L.ellipse(cx - 10, cy - 3, rx * 0.6, 4, P.n3)
  end
  -- gaviotas lejanas (una V)
  for _,g in ipairs({{420,60},{438,52},{456,66},{300,88},{520,40}}) do L.line(g[1]-4, g[2]-2, g[1], g[2], P.far3); L.line(g[1], g[2], g[1]+4, g[2]-2, P.far3) end
  save(L, "1_cielo")
end

-- 2: el mar hasta el horizonte, el Faro Negro, el barco sin bandera y el humo del volcán
do
  local L = layer()
  local HZ = 170
  -- el volcán muy lejos, a la izquierda, con su humo
  L.range({{90,128,0.9,140}}, HZ, P.far1, P.far2)
  for k=0,7 do L.ellipse(90 + k * 6, 126 - k * 9, 10 + k * 2, 5 + k, P.smoke) end
  -- islas lejanas
  L.range({{470,156,0.6},{520,150,0.5}}, HZ, P.far2, P.far3)
  -- el mar
  for y=HZ,GROUND+12 do
    local t = (y - HZ) / (GROUND + 12 - HZ)
    L.rect(0, y, W-1, y, t < 0.3 and P.sea3 or (t < 0.7 and P.sea2 or P.sea1))
  end
  for _=1,160 do local x, y = rnd() * W, HZ + 3 + rnd() * (GROUND - HZ); L.rect(x, y, x + 3 + rnd() * 6, y, rnd() < 0.5 and P.sea4 or P.sea1) end
  -- el cabo del Faro Negro con la torre y su luz negra
  L.range({{560,150,1.3,156}}, HZ + 2, P.far3, P.far3)
  L.rect(553, 104, 563, 152, P.r4); L.rect(551, 98, 565, 104, P.r3); L.rect(554, 92, 562, 98, P.V); L.ellipse(558, 95, 3, 3, P.K)
  -- el barco sin bandera, de velas negras
  local bx, by = 300, 168
  L.rect(bx - 22, by - 4, bx + 22, by, P.r4); L.rect(bx - 18, by, bx + 18, by + 2, P.r4)
  for _,m in ipairs({{bx - 8, 34, 14}, {bx + 10, 28, 12}}) do
    L.rect(m[1], by - m[2] - 4, m[1] + 1, by - 4, P.r3)
    for y=by - m[2], by - 10 do local w = m[3] - math.abs(y - (by - m[2] / 2 - 6)) * 0.25; L.rect(m[1] - w / 2, y, m[1] + w / 2, y, P.r4) end
  end
  L.ellipse(bx + 9, by - 22, 2, 2, P.ec1)
  save(L, "2_montanas")
end

-- 3: acantilados negros con palmeras y las olas rompiendo
do
  local L = layer()
  -- rocas a los lados
  L.range({{0,150,0.5},{70,176,0.8},{130,206,0.9}}, GROUND + 12, P.r2, P.r3)
  L.range({{640,146,0.55},{560,186,0.8},{500,214,0.9}}, GROUND + 12, P.r2, P.r3)
  for _,s in ipairs({{40,170},{96,196},{590,170},{530,206}}) do L.line(s[1], s[2], s[1] + 14, s[2] + 30, P.r1) end
  -- la línea de olas al pie (agua baja)
  for y=GROUND - 6, GROUND + 12 do L.rect(0, y, W-1, y, y < GROUND + 2 and P.sh2 or P.sh1) end
  for x=0,W-1 do local y = GROUND - 6 + math.sin(x / 14) * 2; L.px(x, y, P.foam); if x % 3 ~= 0 then L.px(x, y + 1, P.foam) end end
  -- olas rompiendo contra las rocas
  for _,w in ipairs({{150,GROUND - 10},{480,GROUND - 12}}) do for k=0,8 do L.ellipse(w[1] + k * 4 - 16, w[2] - math.sin(k / 8 * math.pi) * 10, 4, 3, P.foam) end end
  palm(L, 30, 178, 46, 1); palm(L, 104, 206, 36, 1.4); palm(L, 600, 176, 48, -1); palm(L, 536, 212, 34, -1.3)
  save(L, "3_colinas")
end

-- 4: arena mojada con líneas de espuma, conchas y pozas
do
  local L = layer()
  for y=GROUND,H-1 do
    local t = (y - GROUND) / (H - GROUND)
    L.rect(0, y, W-1, y, t < 0.15 and P.ar3 or (t < 0.5 and P.ar2 or P.ar1))
  end
  -- espuma que deja la ola
  for k=0,3 do
    local base = GROUND + 4 + k * 9
    for x=0,W-1 do if (x + k * 37) % 120 < 80 then L.px(x, base + math.sin((x + k * 50) / 22) * 3, P.foam) end end
  end
  -- ondas en la arena
  local y, gap = GROUND + 40, 8
  while y < H do
    for x=0,W-1,3 do if (x + math.floor(y)) % 11 < 5 then L.px(x, y + math.sin(x / 30) * 2, P.ar3) end end
    y = y + gap; gap = gap * 1.35
  end
  -- pozas y conchas
  for _,p in ipairs({{120,300,26,6},{520,320,30,7},{330,346,20,5}}) do L.ellipse(p[1], p[2], p[3], p[4], P.sh2); L.ellipse(p[1] - 3, p[2] - 1, p[3] * 0.7, p[4] * 0.5, P.sh1); L.line(p[1] - p[3] * 0.4, p[2] - 2, p[1], p[2] - 2, P.foam) end
  for _,c in ipairs({{60,286},{230,272},{410,300},{590,280},{180,338},{470,350}}) do L.ellipse(c[1], c[2], 3, 2, P.co3); L.px(c[1], c[2], P.co1); L.px(c[1] - 2, c[2] + 1, P.ar4) end
  for _,r in ipairs({{300,268,14,5},{40,330,18,6}}) do L.ellipse(r[1], r[2], r[3], r[4], P.r3); L.ellipse(r[1] - 2, r[2] - 2, r[3] * 0.7, r[4] * 0.6, P.r2) end
  for _=1,500 do L.px(math.floor(rnd() * W), GROUND + 3 + math.floor(rnd() * (H - GROUND - 3)), rnd() < 0.7 and P.ar3 or P.ar1) end
  save(L, "4_suelo")
end

-- 5: rocas con algas en las esquinas y espuma en el aire
do
  local L = layer()
  for _,b in ipairs({{30, 348, 60, 28}, {612, 344, 54, 30}}) do
    local bx, by, rx, ry = b[1], b[2], b[3], b[4]
    L.ellipse(bx, by, rx, ry, P.r4); L.ellipse(bx - 6, by - 4, rx * 0.8, ry * 0.7, P.r3)
    L.ellipse(bx - 4, by - ry + 8, rx * 0.6, 5, P.r2)
    for k=0,6 do L.line(bx - rx * 0.6 + k * 10, by - ry * 0.3, bx - rx * 0.6 + k * 10 + 2, by - ry * 0.3 - 10 - (k % 3) * 4, P.pa3) end
    for k=0,4 do L.ellipse(bx - rx * 0.5 + k * 12, by - ry * 0.5 + (k % 2) * 4, 2, 1.5, P.co3) end
  end
  for _=1,70 do
    local x, y = math.floor(rnd() * W), math.floor(rnd() * (H - 60))
    L.px(x, y, rnd() < 0.5 and P.spray or P.spray2)
  end
  for _=1,10 do local x, y = rnd() * W, 40 + rnd() * 160; L.ellipse(x, y, 30 + rnd() * 40, 3, P.mist) end
  save(L, "5_primer_plano")
end
