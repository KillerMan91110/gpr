-- Fondo de combate de la Tundra Eterna (640x360, 5 capas con parallax como el de la Pradera):
--   1_cielo        noche azul con estrellas y la aurora (cintas verdes y moradas)
--   2_montanas     glaciares lejanos y, a la derecha, la Torre de Cristal brillando
--   3_colinas      lomas de nieve con abetos blancos y un menhir rúnico
--   4_suelo        nieve en perspectiva con placas de hielo y huellas (el suelo empieza en y=248)
--   5_primer_plano témpanos en las esquinas y copos (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_tundra.lua
local W, H, GROUND = 640, 360, 248
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  s0=hex("0e1430"), s1=hex("16204a"), s2=hex("1e2e60"), s3=hex("2a4278"), s4=hex("3c5a8e"),
  st=hex("f4f8ff"), st2=hex("a8c0e8"),
  a1=rgba(122,240,184,150), a2=rgba(122,240,184,80), a3=rgba(184,132,255,110), a4=rgba(184,132,255,60),
  g1=hex("8ab4d8"), g2=hex("6a94bc"), g3=hex("4e7299"), gw=hex("d8ecfa"), gw2=hex("b4d2ec"),
  ic1=hex("e4f8ff"), ic2=hex("a8dcf0"), ic3=hex("6aaed0"), ic4=hex("3a7aa8"),
  tw=rgba(200,240,255,120),
  ab1=hex("d4e4f0"), ab2=hex("a8bed4"), ab3=hex("7a92ac"), tr=hex("4a3a34"),
  mn1=hex("6e7486"), mn2=hex("545a6c"), ru=hex("7af0f8"),
  W=hex("f6faff"), w1=hex("e2ecf6"), w2=hex("c6d6e8"), w3=hex("a2b6ce"), w4=hex("8298b4"),
  flake=rgba(255,255,255,210), flake2=rgba(220,236,255,140),
}
local seed = 5151
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  -- mezcla un color semitransparente sobre lo que ya hay (para la aurora y el brillo de la torre)
  function L.blend(x,y,c)
    x,y=math.floor(x),math.floor(y); if x<0 or x>=W or y<0 or y>=H then return end
    local p = img:getPixel(x,y); local a = c.alpha / 255
    local pc = app.pixelColor
    if pc.rgbaA(p) == 0 then img:drawPixel(x,y,c) return end
    img:drawPixel(x,y,rgba(math.floor(pc.rgbaR(p)*(1-a)+c.red*a), math.floor(pc.rgbaG(p)*(1-a)+c.green*a), math.floor(pc.rgbaB(p)*(1-a)+c.blue*a), 255))
  end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
  function L.range(peaks, bottom, c, shadeC, snowC, snowDepth)
    for x=0,W-1 do
      local top, side = bottom, 0
      for _,p in ipairs(peaks) do
        local h = p[2] + math.abs(x - p[1]) * p[3]
        if h < top then top = h; side = (x < p[1]) and -1 or 1 end
      end
      if top < bottom then
        L.rect(x, top, x, bottom, side > 0 and shadeC or c)
        if snowC then L.rect(x, top, x, top + snowDepth + math.floor(rnd() * 3), snowC) end
      end
    end
  end
  return L
end

local function save(L, name)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], L.img, Point(0,0))
  spr:saveCopyAs(app.params.dir .. "/tundra/fondo/" .. name .. ".png")
  spr:close()
end

-- 1: noche con estrellas y la aurora
do
  local L = layer()
  local bands = {P.s0, P.s1, P.s2, P.s3, P.s4}
  for y=0,H-1 do
    local i = math.min(5, 1 + math.floor((y / (GROUND - 10)) * 5))
    L.rect(0, y, W-1, y, bands[i])
  end
  for _=1,160 do
    local x, y = math.floor(rnd() * W), math.floor(rnd() * 170)
    L.px(x, y, rnd() < 0.3 and P.st or P.st2)
  end
  for _,s in ipairs({{80,30},{300,18},{520,40},{430,90}}) do
    L.px(s[1], s[2], P.st); L.px(s[1]-1, s[2], P.st2); L.px(s[1]+1, s[2], P.st2); L.px(s[1], s[2]-1, P.st2); L.px(s[1], s[2]+1, P.st2)
  end
  -- cintas de aurora: cortinas verticales que ondulan
  local function cinta(y0, amp, freq, ph, alto, c1, c2)
    for x=0,W-1 do
      local y = y0 + math.sin(x * freq + ph) * amp + math.sin(x * freq * 2.7) * amp * 0.3
      for k=0,alto do
        local c = (k < 3) and c1 or c2
        if k < alto * 0.6 or (x + k) % 3 ~= 0 then L.blend(x, y + k, c) end
      end
    end
  end
  cinta(40, 18, 0.012, 0.5, 46, P.a1, P.a2)
  cinta(70, 14, 0.017, 2.1, 30, P.a3, P.a4)
  save(L, "1_cielo")
end

-- 2: glaciares lejanos y la Torre de Cristal
do
  local L = layer()
  -- la Torre de Cristal: aguja de hielo que brilla, detrás de los glaciares (que tapan su base)
  local tx = 540
  for y=40,210 do
    local half = 3 + (y - 40) * 0.05
    L.rect(tx - half, y, tx + half, y, (y % 12 < 2) and P.ic3 or P.ic2)
    L.px(tx - half, y, P.ic1)
  end
  L.line(tx, 26, tx, 40, P.ic1)
  for r=4,22,3 do for a=0,359,6 do L.blend(tx + math.cos(math.rad(a)) * r, 34 + math.sin(math.rad(a)) * r, P.tw) end end
  L.range({{20,150,0.9},{130,128,1.0},{240,146,1.1},{330,118,0.8},{420,142,1.0},{520,124,0.9},{630,140,1.0}}, GROUND + 6, P.g1, P.g2, P.gw, 5)
  -- grietas azules en los glaciares
  for _=1,90 do
    local x, y = math.floor(rnd() * W), 150 + math.floor(rnd() * 90)
    if app.pixelColor.rgbaA(L.img:getPixel(x, y)) > 0 then L.line(x, y, x + 1, y + 4 + math.floor(rnd() * 4), P.g3) end
  end
  for _=1,160 do
    local x, y = math.floor(rnd() * W), 130 + math.floor(rnd() * 110)
    if app.pixelColor.rgbaA(L.img:getPixel(x, y)) > 0 then L.rect(x, y, x + 2, y, P.gw2) end
  end
  save(L, "2_montanas")
end

-- 3: lomas de nieve con abetos blancos y el menhir rúnico
do
  local L = layer()
  local MOUNDS = {{60,226,110,24},{240,232,120,18},{420,224,110,26},{600,230,100,20}}
  for x=0,W-1 do
    local top = GROUND + 12
    for _,m in ipairs(MOUNDS) do
      local u = (x - m[1]) / m[3]
      if math.abs(u) < 1 then top = math.min(top, m[2] - m[4] * (1 - u * u) + 14) end
    end
    if top < GROUND + 12 then
      L.rect(x, top, x, GROUND + 12, P.w2)
      L.rect(x, top, x, top + 1, P.W)
      if (x % 9) == 0 then L.px(x, top + 5, P.w3) end
    end
  end
  local function abeto(x, base, h)
    L.rect(x - 1, base - 4, x + 1, base, P.tr)
    for k=0,3 do
      local y0 = base - 4 - k * (h / 4)
      local half = (4 - k) * h / 9
      for yy=0,math.floor(h / 4) do
        local w = half * (yy / (h / 4))
        L.rect(x - w, y0 - h / 4 + yy, x + w, y0 - h / 4 + yy, (yy < 2) and P.W or (x % 2 == 0 and P.ab1 or P.ab2))
        L.px(x + w, y0 - h / 4 + yy, P.ab3)
      end
    end
    L.px(x, base - 4 - h, P.W)
  end
  for _,t in ipairs({{24,222,32},{52,228,24},{150,226,28},{206,222,36},{236,230,22},{380,220,34},{408,228,26},{590,222,32},{622,230,22}}) do
    abeto(t[1], t[2], t[3]); L.ellipse(t[1], t[2], 6, 2, P.w1)
  end
  -- menhir con runas que brillan
  local mx = 300
  L.rect(mx - 7, 186, mx + 7, 232, P.mn1); L.rect(mx + 3, 186, mx + 7, 232, P.mn2)
  L.ellipse(mx, 186, 7, 4, P.mn1); L.ellipse(mx - 1, 184, 6, 2, P.W)
  for _,r in ipairs({{196},{206},{216}}) do L.line(mx - 3, r[1], mx + 1, r[1] + 4, P.ru); L.line(mx + 1, r[1], mx - 3, r[1] + 4, P.ru) end
  L.ellipse(mx, 232, 12, 3, P.w1)
  save(L, "3_colinas")
end

-- 4: nieve en perspectiva con placas de hielo y huellas
do
  local L = layer()
  for y=GROUND,H-1 do
    local t = (y - GROUND) / (H - GROUND)
    L.rect(0, y, W-1, y, t < 0.2 and P.w2 or (t < 0.55 and P.w1 or P.W))
  end
  local y, gap = GROUND + 4, 6
  while y < H do
    for x=0,W-1,3 do if (x + math.floor(y)) % 9 < 5 then L.px(x, y + math.sin(x / 30) * 2, P.w3) end end
    y = y + gap; gap = gap * 1.4
  end
  -- placas de hielo (lago congelado que asoma)
  for _,r in ipairs({{110,270,40,7},{520,276,46,8},{330,320,60,10}}) do
    L.ellipse(r[1], r[2], r[3], r[4], P.ic3); L.ellipse(r[1] - 4, r[2] - 1, r[3] * 0.85, r[4] * 0.7, P.ic2)
    L.line(r[1] - r[3] * 0.5, r[2] - 2, r[1] - r[3] * 0.2, r[2] - 4, P.ic1); L.line(r[1] + 4, r[2] + 1, r[1] + r[3] * 0.4, r[2] - 1, P.ic1)
    L.line(r[1] - 10, r[2] - 3, r[1] + 6, r[2] + 3, P.ic4)
  end
  for k=0,6 do
    local hx, hy = 220 + k * 24, 340 - k * 12
    L.ellipse(hx, hy, 3, 2, P.w4); L.ellipse(hx + 8, hy - 4, 3, 2, P.w4)
  end
  L.rect(0, GROUND, W-1, GROUND + 1, P.w3)
  for _=1,400 do L.px(math.floor(rnd() * W), GROUND + 3 + math.floor(rnd() * (H - GROUND - 3)), P.w3) end
  save(L, "4_suelo")
end

-- 5: témpanos en las esquinas y copos
do
  local L = layer()
  local function tempano(bx, by, picos)
    for _,p in ipairs(picos) do
      local x, h, w = bx + p[1], p[2], p[3]
      for yy=0,h do
        local half = w * (yy / h)
        L.rect(x - half, by - h + yy, x + half, by - h + yy, (yy % 9 < 2) and P.ic3 or P.ic2)
        L.px(x - half, by - h + yy, P.ic1)
      end
    end
    L.ellipse(bx, by + 4, 50, 10, P.W)
  end
  tempano(30, 352, {{-20,40,10},{0,64,14},{22,44,10}})
  tempano(612, 350, {{-22,48,12},{2,70,15},{24,38,9}})
  for _=1,90 do
    local x, y = math.floor(rnd() * W), math.floor(rnd() * (H - 40))
    L.px(x, y, P.flake); if rnd() < 0.3 then L.px(x + 1, y, P.flake2); L.px(x, y + 1, P.flake2) end
  end
  save(L, "5_primer_plano")
end
