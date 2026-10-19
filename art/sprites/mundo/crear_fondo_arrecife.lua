-- Fondo de combate del Arrecife Hundido (640x360, 5 capas con parallax como el de las Costas):
--   1_cielo        el agua desde abajo: la superficie que brilla arriba y los rayos de luz que bajan
--   2_montanas     la ciudad de coral de los tritones a lo lejos: torres, cúpulas y arcos azulados
--   3_colinas      bancos de coral rojo y blanco a los lados, con algas largas que se mecen
--   4_suelo        arena del fondo con conchas, una almeja gigante y cristales de eclipse (el suelo
--                  empieza en y=248)
--   5_primer_plano algas en las esquinas y burbujas que suben (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_arrecife.lua
local W, H, GROUND = 640, 360, 248
local FONDO = "arrecife"
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  -- agua (de la superficie al fondo)
  s0=hex("5ec8d8"), s1=hex("3aa6c4"), s2=hex("2a86aa"), s3=hex("1f6890"), s4=hex("174e74"),
  sf=hex("c8f6fa"), sf2=hex("8ae0ec"),
  ray=rgba(200,246,250,40), ray2=rgba(200,246,250,22),
  -- la ciudad lejana (siluetas azuladas)
  far1=hex("3e7c9a"), far2=hex("326a88"), far3=hex("285874"), win=hex("8ae0ec"),
  -- coral
  c1=hex("f2a49a"), c2=hex("d27a72"), c3=hex("a85660"), c4=hex("7a3c4e"),
  cb1=hex("f6eee4"), cb2=hex("dccabc"), cb3=hex("b0a092"),
  -- arena
  a1=hex("b4d2c4"), a2=hex("9cc4ba"), a3=hex("7eaaa2"), a4=hex("62908c"),
  -- algas, almeja, cristales
  g1=hex("8adc96"), g2=hex("52a46a"), g3=hex("2e7050"),
  p2=hex("828ca0"), p3=hex("5e687c"), n1=hex("f6f2ff"), an2=hex("e070b0"),
  e1=hex("d8a0ff"), e2=hex("8a4ad8"), e3=hex("4e2490"),
  bub=rgba(220,250,255,200), bub2=rgba(220,250,255,120),
}
local seed = 9113
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
  -- alga larga que se mece: de (x, base) hacia arriba
  function L.kelp(x, base, h, ph, c1, c2)
    for i=0,h do
      local cx = x + math.sin(i / 9 + ph) * 4
      L.rect(cx - 1, base - i, cx + 1, base - i, (i % 7 == 0) and c2 or c1)
      if i % 11 == 5 then L.ellipse(cx + 3, base - i, 3, 1.5, c1) end
    end
  end
  return L
end

-- en el fondo no hay sol: al mezclar dos colores semitransparentes se mira el de abajo
local function blend(img, x, y, c)
  if x < 0 or x >= W or y < 0 or y >= H then return end
  local o = Color(img:getPixel(x, y))
  local a = c.alpha / 255
  img:drawPixel(x, y, rgba(math.floor(o.red * (1 - a) + c.red * a), math.floor(o.green * (1 - a) + c.green * a), math.floor(o.blue * (1 - a) + c.blue * a), 255))
end

local function save(L, name)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], L.img, Point(0,0))
  spr:saveCopyAs(app.params.dir .. "/" .. FONDO .. "/fondo/" .. name .. ".png")
  spr:close()
end

-- 1: el agua desde abajo, con la superficie brillando y rayos de luz
do
  local L = layer()
  local bands = {P.s0, P.s1, P.s2, P.s3, P.s4}
  for y=0,H-1 do
    local i = math.min(5, 1 + math.floor((y / 230) * 5))
    L.rect(0, y, W-1, y, bands[i])
  end
  -- la superficie: ondas claras arriba
  for k=0,2 do
    for x=0,W-1 do local y = 6 + k * 7 + math.sin((x + k * 40) / 18) * 2; L.px(x, y, k == 0 and P.sf or P.sf2); if x % 4 ~= 0 then L.px(x, y + 1, P.sf2) end end
  end
  -- rayos de luz que bajan en diagonal
  for _,r in ipairs({{80,30},{210,22},{330,36},{470,26},{580,30}}) do
    for y=10,230 do
      local x0 = r[1] + (y - 10) * 0.35
      for x=x0, x0 + r[2] * (1 - y / 300) do blend(L.img, math.floor(x), y, (y < 120) and P.ray or P.ray2) end
    end
  end
  save(L, "1_cielo")
end

-- 2: la ciudad de coral de los tritones a lo lejos
do
  local L = layer()
  local BASE = 200
  -- lomas de coral lejanas
  for x=0,W-1 do
    local top = BASE - 20 - math.sin(x / 70) * 10 - math.sin(x / 23) * 4
    L.rect(x, top, x, GROUND + 10, P.far3)
  end
  -- torres con cúpula, arcos y ventanas que brillan
  for _,t in ipairs({{70,60,14},{120,90,10},{250,110,18},{300,70,12},{360,120,16},{430,80,11},{520,100,15},{590,66,12}}) do
    local x, h, w = t[1], t[2], t[3]
    L.rect(x - w / 2, BASE - h, x + w / 2, BASE, P.far2)
    L.ellipse(x, BASE - h, w / 2 + 3, w / 2 + 2, P.far1)
    L.line(x, BASE - h - w / 2 - 2, x, BASE - h - w / 2 - 10, P.far1); L.px(x, BASE - h - w / 2 - 11, P.win)
    for y=BASE - h + 10, BASE - 10, 14 do L.rect(x - 1, y, x + 1, y + 4, P.win) end
  end
  -- un gran arco de coral en el medio
  for a=0,180,2 do
    local r = math.rad(a)
    L.ellipse(320 + math.cos(r) * 70, 190 - math.sin(r) * 60, 6, 6, P.far1)
  end
  save(L, "2_montanas")
end

-- 3: bancos de coral a los lados con algas largas
do
  local L = layer()
  local function banco(cx, top, rx, flip)
    for x=cx - rx, cx + rx do
      local u = (x - cx) / rx
      local y = top + (1 - math.sqrt(math.max(0, 1 - u * u))) * 60
      L.rect(x, y, x, GROUND + 12, ((x // 6) % 2 == 0) and P.c3 or P.c4)
    end
    -- ramas de coral rojo y blanco
    for k=0,6 do
      local x = cx - rx * 0.7 + k * rx * 0.24
      local h = 30 + (k % 3) * 14
      local base = top + 10
      local c = (k % 2 == 0) and P.c2 or P.cb2
      L.rect(x - 2, base - h, x + 2, base, c)
      L.line(x, base - h * 0.6, x - 8, base - h * 0.9, c); L.line(x, base - h * 0.4, x + 8, base - h * 0.7, c)
      L.ellipse(x, base - h, 3, 3, (k % 2 == 0) and P.c1 or P.cb1)
    end
  end
  banco(60, 170, 90); banco(590, 176, 80)
  L.kelp(150, GROUND + 10, 120, 0, P.g2, P.g3); L.kelp(170, GROUND + 10, 90, 1.4, P.g2, P.g3)
  L.kelp(480, GROUND + 10, 110, 0.7, P.g2, P.g3); L.kelp(500, GROUND + 10, 140, 2.1, P.g2, P.g3)
  save(L, "3_colinas")
end

-- 4: arena del fondo con conchas, una almeja gigante y cristales de eclipse
do
  local L = layer()
  for y=GROUND,H-1 do
    local t = (y - GROUND) / (H - GROUND)
    L.rect(0, y, W-1, y, t < 0.15 and P.a4 or (t < 0.5 and P.a3 or P.a2))
  end
  -- ondas en la arena
  local y, gap = GROUND + 12, 8
  while y < H do
    for x=0,W-1,3 do if (x + math.floor(y)) % 11 < 5 then L.px(x, y + math.sin(x / 30) * 2, P.a1) end end
    y = y + gap; gap = gap * 1.3
  end
  -- la almeja gigante con su perla
  L.ellipse(110, 300, 34, 12, P.p3); L.ellipse(110, 288, 30, 12, P.p2); L.ellipse(110, 296, 16, 4, P.an2); L.ellipse(110, 295, 5, 4, P.n1)
  -- cristales de eclipse clavados en la arena
  for _,c in ipairs({{520,300,6,26},{536,304,4,16},{506,306,4,14},{300,270,3,12}}) do
    for i=0,c[4] do local w = math.floor(c[3] * (1 - i / c[4])); L.rect(c[1] - w, c[2] - i, c[1] + w, c[2] - i, i < c[4] * 0.4 and P.e3 or P.e2) end
    L.line(c[1], c[2] - 1, c[1], c[2] - c[4] + 2, P.e1)
  end
  for _,c in ipairs({{60,286},{230,272},{410,300},{590,280},{180,338},{470,350},{360,320}}) do L.ellipse(c[1], c[2], 3, 2, P.cb1); L.px(c[1], c[2], P.c1); L.px(c[1] - 2, c[2] + 1, P.a4) end
  for _=1,500 do L.px(math.floor(rnd() * W), GROUND + 3 + math.floor(rnd() * (H - GROUND - 3)), rnd() < 0.7 and P.a4 or P.a1) end
  save(L, "4_suelo")
end

-- 5: algas en las esquinas y burbujas que suben
do
  local L = layer()
  for k=0,4 do L.kelp(8 + k * 9, H + 4, 110 - k * 14, k, P.g1, P.g2) end
  for k=0,4 do L.kelp(600 + k * 9, H + 4, 120 - k * 16, k + 2, P.g1, P.g2) end
  for _=1,60 do
    local x, y = math.floor(rnd() * W), math.floor(rnd() * (H - 40))
    local r = rnd() < 0.3 and 2 or 1
    L.ellipse(x, y, r, r, rnd() < 0.5 and P.bub or P.bub2)
  end
  save(L, "5_primer_plano")
end
