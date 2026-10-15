-- Fondo de combate de las Montañas Grises (640x360, 5 capas con parallax como el de la Pradera):
--   1_cielo        cielo gris de tormenta con nubes en bandas
--   2_montanas     picos nevados lejanos; sobre la Cumbre cae un rayo
--   3_colinas      crestas de roca más cerca, con pinos nevados
--   4_suelo        nieve pisada con rocas y huellas (el suelo empieza en y=248)
--   5_primer_plano rocas con nieve en las esquinas y copos (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_montanas.lua
local W, H, GROUND = 640, 360, 248
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  s0=hex("5a6478"), s1=hex("6c7690"), s2=hex("8290a8"), s3=hex("9aa8be"), s4=hex("b4c0d2"),
  n1=hex("4a5266"), n2=hex("3c4356"), n3=hex("5e6780"),
  m1=hex("7a849c"), m2=hex("626c84"), m3=hex("4c556c"), mw=hex("e6eef8"), mw2=hex("c4d0e2"),
  r1=hex("6e6a72"), r2=hex("57535c"), r3=hex("413e46"), r4=hex("2e2c34"),
  pn1=hex("2e5a44"), pn2=hex("1e4030"), pn3=hex("143024"), tr=hex("4a3424"),
  W=hex("f4f8fc"), w1=hex("dfe8f2"), w2=hex("c2d0e0"), w3=hex("9eb0c6"), w4=hex("7e90a8"),
  z1=hex("fff7a0"), z2=hex("ffd23a"), K=hex("141420"),
  flake=rgba(255,255,255,200), flake2=rgba(230,240,255,140),
}
local seed = 4242
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
  -- silueta de cordillera: para cada x, la altura sale de los picos (triángulos) y se rellena hacia abajo
  function L.range(peaks, bottom, c, shadeC, snowC, snowDepth)
    for x=0,W-1 do
      local top, side = bottom, 0
      for _,p in ipairs(peaks) do
        local h = p[2] + math.abs(x - p[1]) * p[3]
        if h < top then top = h; side = (x < p[1]) and -1 or 1 end
      end
      if top < bottom then
        L.rect(x, top, x, bottom, side > 0 and shadeC or c)
        if snowC then
          local d = snowDepth + math.floor(rnd() * 4)
          for _,p in ipairs(peaks) do if math.abs(top - (p[2] + math.abs(x - p[1]) * p[3])) < 0.5 and top - p[2] < 26 then L.rect(x, top, x, top + d, snowC) end end
        end
      end
    end
  end
  return L
end

local function save(L, name)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], L.img, Point(0,0))
  spr:saveCopyAs(app.params.dir .. "/montanas/fondo/" .. name .. ".png")
  spr:close()
end

-- 1: cielo de tormenta en bandas, nubes oscuras arriba
do
  local L = layer()
  local bands = {P.s0, P.s1, P.s2, P.s3, P.s4}
  for y=0,H-1 do
    local i = math.min(5, 1 + math.floor((y / (GROUND - 20)) * 5))
    L.rect(0, y, W-1, y, bands[i])
  end
  -- franjas de nubes
  for k=0,14 do
    local cx, cy = rnd() * W, 10 + rnd() * 90
    local rx = 40 + rnd() * 70
    L.ellipse(cx, cy, rx, 8 + rnd() * 6, k % 3 == 0 and P.n2 or P.n1)
    L.ellipse(cx + 10, cy - 3, rx * 0.7, 5, P.n3)
  end
  save(L, "1_cielo")
end

-- 2: picos nevados lejanos y la Cumbre al medio con un rayo
do
  local L = layer()
  L.range({{40,120,1.1},{150,96,1.0},{260,110,1.2},{340,60,0.9},{440,104,1.1},{540,88,1.0},{630,118,1.2}}, GROUND + 6, P.m1, P.m2, P.mw, 6)
  -- nieve que baja por las laderas
  for _=1,260 do
    local x, y = math.floor(rnd() * W), 100 + math.floor(rnd() * 120)
    local p = L.img:getPixel(x, y)
    if app.pixelColor.rgbaA(p) > 0 then L.rect(x, y, x + 2, y, P.mw2) end
  end
  -- rayo sobre la Cumbre
  local x, y = 352, 0
  for i=1,6 do
    local nx, ny = 340 + (i % 2 == 0 and 14 or -6) + i, i * 11
    L.line(x, y, nx, ny, P.z2); L.line(x + 1, y, nx + 1, ny, P.z1)
    x, y = nx, ny
  end
  save(L, "2_montanas")
end

-- 3: crestas de roca más cercanas con pinos nevados
do
  local L = layer()
  L.range({{0,170,0.8},{120,150,0.9},{230,176,0.7},{360,158,0.8},{480,172,0.9},{600,148,0.8}}, GROUND + 12, P.m3, P.n2, P.w2, 4)
  local function pine(x, base, h)
    L.rect(x - 1, base - 4, x + 1, base, P.tr)
    for k=0,3 do
      local y0 = base - 4 - k * (h / 4)
      local half = (4 - k) * h / 9
      for yy=0,math.floor(h / 4) do
        local w = half * (yy / (h / 4))
        L.rect(x - w, y0 - h / 4 + yy, x + w, y0 - h / 4 + yy, (yy < 2) and P.w1 or (x % 2 == 0 and P.pn1 or P.pn2))
      end
    end
    L.px(x, base - 4 - h, P.W)
  end
  -- lomas de nieve al pie de las crestas: ahí se plantan los pinos y se funden con el suelo
  local MOUNDS = {{40,236,70,16},{180,232,80,18},{300,242,70,10},{430,236,80,16},{580,230,90,20}}
  for x=0,W-1 do
    local top = GROUND + 12
    for _,m in ipairs(MOUNDS) do
      local u = (x - m[1]) / m[3]
      if math.abs(u) < 1 then top = math.min(top, m[2] + (GROUND + 12 - m[2]) * u * u) end
      if math.abs(u) < 1 then top = math.min(top, m[2] - m[4] * (1 - u * u) + 6) end
    end
    if top < GROUND + 12 then
      L.rect(x, top, x, GROUND + 12, P.w2)
      L.rect(x, top, x, top + 1, P.W)
      if (x % 7) == 0 then L.px(x, top + 4, P.w3) end
    end
  end
  -- los pinos, con el pie en la loma
  for _,t in ipairs({{30,226,30},{58,232,24},{170,220,34},{196,228,26},{410,226,30},{452,232,22},{560,218,36},{590,226,26},{620,234,20}}) do
    pine(t[1], t[2], t[3])
    L.ellipse(t[1], t[2], 6, 2, P.w1)
  end
  save(L, "3_colinas")
end

-- 4: nieve en perspectiva, con rocas y huellas
do
  local L = layer()
  for y=GROUND,H-1 do
    local t = (y - GROUND) / (H - GROUND)
    L.rect(0, y, W-1, y, t < 0.2 and P.w2 or (t < 0.55 and P.w1 or P.W))
  end
  -- ondas de nieve
  local y, gap = GROUND + 4, 6
  while y < H do
    for x=0,W-1,3 do if (x + math.floor(y)) % 9 < 5 then L.px(x, y + math.sin(x / 30) * 2, P.w3) end end
    y = y + gap; gap = gap * 1.4
  end
  -- rocas que asoman
  for _,r in ipairs({{70,262,22,7},{560,258,26,8},{210,300,14,5},{470,318,18,6},{120,340,24,8}}) do
    L.ellipse(r[1], r[2], r[3], r[4], P.r2); L.ellipse(r[1] - 3, r[2] - 2, r[3] * 0.7, r[4] * 0.6, P.r1)
    L.ellipse(r[1] - 2, r[2] - r[4] + 1, r[3] * 0.6, 2, P.W)
  end
  -- huellas
  for k=0,6 do
    local hx, hy = 250 + k * 22, 330 - k * 12
    L.ellipse(hx, hy, 3, 2, P.w4); L.ellipse(hx + 8, hy - 4, 3, 2, P.w4)
  end
  L.rect(0, GROUND, W-1, GROUND + 1, P.w3)
  for _=1,400 do L.px(math.floor(rnd() * W), GROUND + 3 + math.floor(rnd() * (H - GROUND - 3)), P.w3) end
  save(L, "4_suelo")
end

-- 5: primer plano (rocas nevadas en las esquinas y copos)
do
  local L = layer()
  for _,b in ipairs({{30, 348, 60, 28}, {612, 344, 54, 30}}) do
    local bx, by, rx, ry = b[1], b[2], b[3], b[4]
    L.ellipse(bx, by, rx, ry, P.r3); L.ellipse(bx - 6, by - 4, rx * 0.8, ry * 0.7, P.r2)
    L.ellipse(bx, by - ry + 6, rx * 0.9, 9, P.W); L.ellipse(bx + 4, by - ry + 9, rx * 0.7, 5, P.w1)
    L.line(bx - rx * 0.5, by + 2, bx - 6, by - 10, P.r4)
  end
  -- copos sueltos
  for _=1,70 do
    local x, y = math.floor(rnd() * W), math.floor(rnd() * (H - 40))
    L.px(x, y, P.flake); if rnd() < 0.3 then L.px(x + 1, y, P.flake2); L.px(x, y + 1, P.flake2) end
  end
  save(L, "5_primer_plano")
end
