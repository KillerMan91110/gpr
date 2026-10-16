-- Fondos de combate del Volcán Rojo y de la Fisura Infernal (640x360, 5 capas con parallax como el
-- de la Pradera). Con --script-param fondo=volcan (por defecto) o fondo=fisura.
-- Volcán:
--   1_cielo        cielo de humo rojizo, con ceniza en bandas y el sol tapado
--   2_montanas     el volcán al fondo echando humo y lava por las laderas
--   3_colinas      crestas de basalto con árboles calcinados y una cascada de lava
--   4_suelo        ceniza y basalto con grietas de lava (el suelo empieza en y=248)
--   5_primer_plano rocas de basalto en las esquinas y brasas que suben (casi todo transparente)
-- Fisura (la forja de los Ocultos bajo el volcán):
--   1_cielo        el techo de la caverna, negro con brillo rojo
--   2_montanas     paredes de roca con chorros de lava y cadenas
--   3_colinas      hornos y moldes de los Ocultos, con el eclipse pintado
--   4_suelo        losas de basalto con canales de metal fundido
--   5_primer_plano estalactitas, un yunque y chispas
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script-param fondo=volcan --script crear_fondo_volcan.lua
local W, H, GROUND = 640, 360, 248
local FONDO = app.params.fondo or "volcan"
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  -- cielo de humo
  s0=hex("3a1e22"), s1=hex("5a2a26"), s2=hex("7e3a2a"), s3=hex("a8522e"), s4=hex("c8743a"),
  n1=hex("4a3a3c"), n2=hex("3a2e30"), n3=hex("5e4a48"), sun=hex("f0b060"), sun2=hex("e0884a"),
  -- volcán y roca
  m1=hex("5a4a4c"), m2=hex("44383c"), m3=hex("33292e"), m4=hex("241c22"),
  r1=hex("6e5e5c"), r2=hex("4c4044"), r3=hex("30282c"), r4=hex("1e181c"),
  -- ceniza
  a1=hex("8e8680"), a2=hex("746c68"), a3=hex("5a5450"), a4=hex("443e3c"),
  -- lava
  f1=hex("fff4b0"), f2=hex("ffd040"), f3=hex("ff8a24"), f4=hex("e04a1a"), f5=hex("9a2414"),
  -- madera quemada
  tq=hex("2a2020"), tq2=hex("3e302c"),
  -- eclipse y metal
  ec1=hex("d8a0ff"), ec2=hex("8a4ad8"), hk1=hex("5c5a6a"), hk2=hex("3e3c4c"), hk3=hex("282632"),
  K=hex("141420"),
  ember=rgba(255,180,80,230), ember2=rgba(255,120,40,170), ash=rgba(200,190,185,150),
}
local seed = 7331
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
  -- silueta de cordillera (como en crear_fondo_montanas.lua); flat: picos truncados (cráter)
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
  -- río de lava que baja zigzagueando
  function L.lava(x, y0, y1, w)
    local cx = x
    for y=y0,y1 do
      cx = cx + (rnd() - 0.5) * 1.4
      L.rect(cx - w, y, cx + w, y, P.f4); if w > 1 then L.rect(cx - w + 1, y, cx + w - 1, y, P.f3) end
      if w > 2 and (y % 3 == 0) then L.px(cx, y, P.f2) end
    end
  end
  -- grieta de lava en el suelo
  function L.crack(x, y, len, dir)
    local cx, cy = x, y
    for i=1,len do
      local nx, ny = cx + dir * (2 + rnd() * 3), cy + (rnd() - 0.5) * 3
      L.line(cx, cy, nx, ny, P.f4); L.line(cx, cy - 1, nx, ny - 1, i < len / 2 and P.f3 or P.f5)
      cx, cy = nx, ny
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

local function embers(L, n, ymax)
  for _=1,n do
    local x, y = math.floor(rnd() * W), math.floor(rnd() * ymax)
    L.px(x, y, rnd() < 0.5 and P.ember or P.ember2)
    if rnd() < 0.25 then L.px(x, y + 1, P.ember2) end
  end
end

-- árbol calcinado: tronco negro con ramas secas y alguna brasa
local function deadTree(L, x, base, h)
  L.rect(x - 1, base - h, x + 1, base, P.tq); L.px(x - 1, base - h + 4, P.tq2)
  for k=1,3 do
    local y = base - h + k * (h / 4)
    local d = (k % 2 == 0) and 1 or -1
    L.line(x, y, x + d * (5 + k), y - 6, P.tq); L.line(x + d * (5 + k), y - 6, x + d * (7 + k), y - 9, P.tq)
  end
  L.px(x, base - h // 2, P.f4)
end

if FONDO == "volcan" then
  -- 1: cielo de humo rojizo
  do
    local L = layer()
    local bands = {P.s0, P.s1, P.s2, P.s3, P.s4}
    for y=0,H-1 do
      local i = math.min(5, 1 + math.floor((y / (GROUND - 20)) * 5))
      L.rect(0, y, W-1, y, bands[i])
    end
    -- el sol apagado detrás del humo
    L.ellipse(500, 70, 22, 22, P.sun2); L.ellipse(500, 70, 16, 16, P.sun)
    for k=0,16 do
      local cx, cy = rnd() * W, 8 + rnd() * 110
      local rx = 50 + rnd() * 80
      L.ellipse(cx, cy, rx, 7 + rnd() * 6, k % 3 == 0 and P.n2 or P.n1)
      L.ellipse(cx + 12, cy - 3, rx * 0.7, 4, P.n3)
    end
    for _=1,120 do L.px(math.floor(rnd() * W), math.floor(rnd() * GROUND), P.ash) end
    save(L, "1_cielo")
  end

  -- 2: el volcán con el cráter, el humo y la lava por las laderas
  do
    local L = layer()
    L.range({{60,150,1.0},{170,130,1.1},{560,140,1.0},{640,126,1.2}}, GROUND + 6, P.m2, P.m3)
    L.range({{330,40,1.25,62}}, GROUND + 6, P.m1, P.m2)
    -- cráter encendido y columna de humo
    L.rect(300, 60, 360, 64, P.f4); L.rect(312, 60, 348, 61, P.f2)
    for k=0,10 do L.ellipse(330 + math.sin(k) * 10 + k * 3, 50 - k * 6, 14 + k * 2, 6 + k, k % 2 == 0 and P.n2 or P.n1) end
    -- ríos de lava por las laderas
    L.lava(312, 64, 200, 2); L.lava(346, 64, 230, 2); L.lava(330, 64, 150, 1)
    -- piedras ardientes por el aire
    for _,b in ipairs({{280,30},{380,20},{400,46},{260,52}}) do L.ellipse(b[1], b[2], 2, 2, P.f3); L.px(b[1], b[2], P.f1); L.line(b[1], b[2] + 2, b[1] + (b[1] < 330 and 4 or -4), b[2] + 10, P.f5) end
    save(L, "2_montanas")
  end

  -- 3: crestas de basalto, árboles calcinados y una cascada de lava
  do
    local L = layer()
    L.range({{0,176,0.8},{120,156,0.9},{250,180,0.7},{380,160,0.8},{500,172,0.9},{620,150,0.8}}, GROUND + 12, P.r2, P.r3)
    -- columnas de basalto (prismas) en las crestas
    for x=100,150,6 do L.rect(x, 170 + (x % 12), x + 4, GROUND + 12, P.r1); L.line(x + 4, 170 + (x % 12), x + 4, GROUND + 12, P.r3) end
    for x=470,520,6 do L.rect(x, 180 + (x % 12), x + 4, GROUND + 12, P.r1); L.line(x + 4, 180 + (x % 12), x + 4, GROUND + 12, P.r3) end
    -- cascada de lava
    L.lava(390, 166, GROUND + 6, 4); L.ellipse(390, GROUND + 8, 14, 4, P.f4); L.ellipse(390, GROUND + 8, 8, 2, P.f2)
    -- lomas de ceniza con árboles
    local MOUNDS = {{40,236,70,14},{200,232,80,16},{300,244,60,8},{470,236,70,14},{590,230,80,18}}
    for x=0,W-1 do
      local top = GROUND + 12
      for _,m in ipairs(MOUNDS) do
        local u = (x - m[1]) / m[3]
        if math.abs(u) < 1 then top = math.min(top, m[2] - m[4] * (1 - u * u) + 6) end
      end
      if top < GROUND + 12 then L.rect(x, top, x, GROUND + 12, P.a3); L.rect(x, top, x, top + 1, P.a2) end
    end
    for _,t in ipairs({{30,232,30},{62,236,22},{190,226,34},{224,232,24},{456,232,28},{580,224,36},{612,232,24}}) do deadTree(L, t[1], t[2], t[3]) end
    save(L, "3_colinas")
  end

  -- 4: ceniza y basalto con grietas de lava
  do
    local L = layer()
    for y=GROUND,H-1 do
      local t = (y - GROUND) / (H - GROUND)
      L.rect(0, y, W-1, y, t < 0.2 and P.a4 or (t < 0.55 and P.a3 or P.a2))
    end
    local y, gap = GROUND + 4, 6
    while y < H do
      for x=0,W-1,3 do if (x + math.floor(y)) % 9 < 4 then L.px(x, y + math.sin(x / 30) * 2, P.r2) end end
      y = y + gap; gap = gap * 1.4
    end
    -- losas de basalto
    for _,r in ipairs({{80,264,24,7},{560,260,28,8},{220,304,16,5},{470,320,20,6},{130,342,26,8}}) do
      L.ellipse(r[1], r[2], r[3], r[4], P.r3); L.ellipse(r[1] - 3, r[2] - 2, r[3] * 0.75, r[4] * 0.6, P.r2)
      L.line(r[1] - r[3] * 0.4, r[2] - 2, r[1] + r[3] * 0.3, r[2] - 3, P.r1)
    end
    -- grietas con lava
    L.crack(300, 270, 12, 1); L.crack(300, 270, 8, -1); L.crack(40, 310, 10, 1); L.crack(600, 300, 9, -1); L.crack(380, 340, 10, 1)
    L.rect(0, GROUND, W-1, GROUND + 1, P.a4)
    for _=1,400 do L.px(math.floor(rnd() * W), GROUND + 3 + math.floor(rnd() * (H - GROUND - 3)), rnd() < 0.8 and P.r2 or P.a1) end
    save(L, "4_suelo")
  end

  -- 5: rocas de basalto en las esquinas y brasas que suben
  do
    local L = layer()
    for _,b in ipairs({{30, 348, 60, 28}, {612, 344, 54, 30}}) do
      local bx, by, rx, ry = b[1], b[2], b[3], b[4]
      L.ellipse(bx, by, rx, ry, P.r4); L.ellipse(bx - 6, by - 4, rx * 0.8, ry * 0.7, P.r3)
      L.ellipse(bx - 4, by - ry + 8, rx * 0.6, 5, P.r2)
      L.line(bx - rx * 0.5, by + 2, bx - 6, by - 10, P.f5); L.line(bx - 6, by - 10, bx + 10, by - 4, P.f4)
    end
    embers(L, 90, H - 40)
    save(L, "5_primer_plano")
  end
else
  -- ============================================================ la Fisura Infernal
  -- 1: techo de la caverna, negro con brillo rojo abajo
  do
    local L = layer()
    for y=0,H-1 do
      local t = y / GROUND
      L.rect(0, y, W-1, y, t < 0.3 and P.r4 or (t < 0.6 and P.m4 or (t < 0.85 and P.s0 or P.s1)))
    end
    for _=1,40 do L.ellipse(rnd() * W, rnd() * 80, 20 + rnd() * 40, 4 + rnd() * 6, P.r4) end
    save(L, "1_cielo")
  end

  -- 2: paredes de roca con chorros de lava y cadenas colgando
  do
    local L = layer()
    for x=0,W-1 do
      local top = 70 + math.sin(x / 40) * 18 + math.sin(x / 13) * 6
      L.rect(x, top, x, GROUND + 6, P.m3)
      -- estalactitas del techo
      local st = 30 + math.abs(math.sin(x / 9)) * 30
      L.rect(x, 0, x, st * (0.5 + math.abs(math.sin(x / 23)) * 0.5), P.r4)
    end
    -- vetas y salientes de la roca
    for _=1,70 do
      local cx, cy = rnd() * W, 90 + rnd() * (GROUND - 90)
      L.ellipse(cx, cy, 8 + rnd() * 18, 3 + rnd() * 5, rnd() < 0.5 and P.m2 or P.r3)
      L.line(cx - 6, cy - 3, cx + 6, cy - 4, P.m1)
    end
    for _,x in ipairs({80, 240, 420, 560}) do L.lava(x, 80, GROUND + 4, 3); L.ellipse(x, GROUND + 6, 12, 3, P.f4) end
    -- cadenas
    for _,c in ipairs({{150, 0, 140},{330, 0, 110},{500, 0, 160}}) do
      for y=c[2],c[3],4 do L.ellipse(c[1], y, 1.5, 2, P.hk1); L.px(c[1], y, P.r4) end
      L.line(c[1] - 4, c[3] + 2, c[1] + 4, c[3] + 2, P.hk1); L.line(c[1] - 4, c[3] + 2, c[1] - 4, c[3] + 6, P.hk1)
    end
    save(L, "2_montanas")
  end

  -- 3: hornos y moldes de los Ocultos, con el eclipse pintado
  do
    local L = layer()
    for _,f in ipairs({{90, GROUND + 10}, {330, GROUND + 6}, {560, GROUND + 10}}) do
      local x, base = f[1], f[2]
      -- horno de basalto en cúpula con la boca encendida
      L.ellipse(x, base - 30, 42, 40, P.r2); L.ellipse(x - 6, base - 34, 32, 30, P.r1)
      L.rect(x - 42, base - 30, x + 42, base, P.r2)
      L.ellipse(x, base - 14, 14, 12, P.f5); L.ellipse(x, base - 12, 10, 8, P.f4); L.ellipse(x, base - 10, 6, 5, P.f2)
      L.rect(x - 4, base - 80, x + 4, base - 66, P.r3)
      -- el eclipse pintado
      L.ellipse(x, base - 48, 7, 7, P.ec2); L.ellipse(x + 2, base - 49, 6, 6, P.r2); L.px(x - 5, base - 48, P.ec1)
    end
    -- moldes apilados entre los hornos
    for _,m in ipairs({{200, GROUND + 6},{220, GROUND + 2},{460, GROUND + 6},{440, GROUND + 4}}) do
      L.rect(m[1] - 10, m[2] - 8, m[1] + 10, m[2], P.hk2); L.rect(m[1] - 7, m[2] - 6, m[1] + 7, m[2] - 4, P.f4)
    end
    save(L, "3_colinas")
  end

  -- 4: losas de basalto con canales de metal fundido
  do
    local L = layer()
    for y=GROUND,H-1 do
      local t = (y - GROUND) / (H - GROUND)
      L.rect(0, y, W-1, y, t < 0.2 and P.r3 or (t < 0.55 and P.r2 or P.r1))
    end
    -- juntas de las losas en perspectiva
    local y, gap = GROUND + 6, 8
    while y < H do L.rect(0, y, W-1, y, P.r3); y = y + gap; gap = gap * 1.35 end
    for k=-6,6 do L.line(320 + k * 24, GROUND, 320 + k * 90, H, P.r3) end
    -- canal de metal fundido que cruza
    for x=0,W-1 do
      local cy = 296 + math.sin(x / 50) * 6
      L.rect(x, cy - 3, x, cy + 3, P.f5); L.rect(x, cy - 2, x, cy + 2, P.f4); if x % 4 ~= 0 then L.px(x, cy, P.f3) end
    end
    L.rect(0, GROUND, W-1, GROUND + 1, P.r4)
    save(L, "4_suelo")
  end

  -- 5: estalactitas, un yunque y chispas
  do
    local L = layer()
    for _,s in ipairs({{20, 0, 60}, {60, 0, 34}, {600, 0, 70}, {630, 0, 40}}) do
      for y=0,s[3] do local w = 10 * (1 - y / s[3]); L.rect(s[1] - w, y, s[1] + w, y, P.r4) end
    end
    -- yunque en la esquina
    L.rect(560, 318, 630, 326, P.hk2); L.rect(580, 326, 612, 352, P.hk3); L.rect(570, 350, 622, 360, P.hk2); L.rect(560, 318, 630, 319, P.hk1)
    L.rect(578, 316, 600, 317, P.f3)
    for _,b in ipairs({{30, 348, 50, 24}}) do
      L.ellipse(b[1], b[2], b[3], b[4], P.r4); L.ellipse(b[1] - 6, b[2] - 4, b[3] * 0.8, b[4] * 0.7, P.r3)
    end
    embers(L, 70, H - 40)
    save(L, "5_primer_plano")
  end
end
