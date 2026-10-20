-- Fondo de combate del Observatorio Roto (640x360, 5 capas con parallax como el de las Ruinas). Adentro de la
-- cúpula partida, de noche:
--   1_cielo        el cielo roto que se ve por la cúpula: noche morada con estrellas y el ojo del Devorador
--   2_montanas     la cúpula de bronce partida al medio, con sus costillas de metal
--   3_colinas      el gran telescopio de bronce apuntando arriba, con estanterías de mapas a los lados
--   4_suelo        baldosas de mármol en perspectiva con un astrolabio de oro incrustado (el suelo en y=248)
--   5_primer_plano lámparas de cristal, libros y vidrios de la lente partida (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_observatorio.lua
local W, H, GROUND = 640, 360, 248
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  s1=hex("2e2a66"), s2=hex("26225a"), s3=hex("1e1a44"), s4=hex("161236"), s5=hex("100e26"),
  st=hex("fff8c0"), st2=hex("a6e2f4"),
  e1=hex("e2a6ff"), e2=hex("8a50d8"), e3=hex("4e2490"), ne=hex("18161e"),
  b1=hex("e8d098"), b2=hex("c0a060"), b3=hex("8a7040"), b4=hex("5a4828"), v1=hex("7ae0c8"),
  m1=hex("e8e2d6"), m2=hex("cfc7b6"), m3=hex("a89f8c"), m4=hex("7c7462"),
  c1=hex("5c5c80"), c2=hex("46466a"), c3=hex("343456"), c4=hex("242440"),
  l1=hex("e0f8ff"), l2=hex("64bcde"), l3=hex("3490be"),
  go=hex("ffe08a"), god=hex("c89a2a"), r1=hex("3a5ea8"), r2=hex("6a8ad8"), K=hex("141420"),
}
local seed = 4343
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
  function L.thick(x0,y0,x1,y1,w,c) for k=0,w-1 do L.line(x0 + k, y0, x1 + k, y1, c) end end
  -- halo suave (mezcla a mano sobre lo que haya debajo en la misma capa)
  function L.glow(cx,cy,rad,col,strength)
    for y=math.floor(cy-rad),math.ceil(cy+rad) do for x=math.floor(cx-rad),math.ceil(cx+rad) do
      if x>=0 and x<W and y>=0 and y<H then
        local d = math.sqrt((x-cx)^2+(y-cy)^2)/rad
        if d < 1 then
          local k = (1-d)^2 * strength
          local p = img:getPixel(x,y)
          local pr, pg, pb, pa = app.pixelColor.rgbaR(p), app.pixelColor.rgbaG(p), app.pixelColor.rgbaB(p), app.pixelColor.rgbaA(p)
          if pa == 0 then pr, pg, pb = col.red*0.3, col.green*0.3, col.blue*0.3 end
          local nr = math.min(255, pr + (col.red - pr) * k)
          local ng = math.min(255, pg + (col.green - pg) * k)
          local nb = math.min(255, pb + (col.blue - pb) * k)
          local na = math.max(pa, math.floor(255 * math.min(1, k * 1.6)))
          img:drawPixel(x, y, rgba(math.floor(nr), math.floor(ng), math.floor(nb), na))
        end
      end
    end end
  end
  return L
end

local function save(L, name)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], L.img, Point(0,0))
  spr:saveCopyAs(app.params.dir .. "/observatorio/fondo/" .. name .. ".png")
  spr:close()
end

-- 1: la noche morada que se ve por la cúpula rota, con estrellas y el ojo del Devorador entre ellas
do
  local L = layer()
  local bands = {P.s5, P.s4, P.s3, P.s2, P.s1}
  for y=0,H-1 do
    local t = math.min(1, y / GROUND)
    local i = math.min(5, 1 + math.floor(t * 5))
    L.rect(0,y,W-1,y,bands[i])
  end
  for _=1,140 do local x, y = math.floor(rnd()*W), math.floor(rnd()*GROUND); L.px(x, y, rnd() < 0.7 and P.st or P.st2) end
  for _,p in ipairs({{80,40},{520,60},{300,30},{180,110},{600,120}}) do L.px(p[1]-1,p[2],P.st2); L.px(p[1]+1,p[2],P.st2); L.px(p[1],p[2]-1,P.st2); L.px(p[1],p[2]+1,P.st2) end
  -- el ojo, arriba, entrecerrado
  L.glow(320, 70, 80, P.e2, 0.5)
  L.ellipse(320, 70, 46, 16, P.e3); L.ellipse(320, 70, 40, 12, P.ne); L.ellipse(320, 70, 14, 12, P.e2); L.ellipse(320, 70, 4, 11, P.ne)
  L.line(274, 70, 366, 70, P.e3)
  save(L, "1_cielo")
end

-- 2: la cúpula de bronce partida al medio, con las costillas de metal recortadas contra el cielo
do
  local L = layer()
  for x=0,W-1 do
    local u = (x - 320) / 360
    local top = math.floor(30 + 150 * u * u)
    -- la grieta del medio: la cúpula falta entre 230 y 410
    if x < 230 or x > 410 then
      L.rect(x, top, x, GROUND + 6, ((x // 40) % 2 == 0) and P.c3 or P.c4)
      L.px(x, top, P.b3); L.px(x, top + 1, P.b4)
    end
  end
  for k=-8,8 do
    local xb = 320 + k * 44
    if xb < 230 or xb > 410 then
      local u = (xb - 320) / 360
      L.line(xb, math.floor(30 + 150 * u * u), 320 + k * 80, GROUND + 6, P.b3)
    end
  end
  -- los bordes rotos de la grieta
  for i=0,12 do L.rect(230 - i, 60 + i * 12, 232 - i, 66 + i * 12, P.b4); L.rect(408 + i, 60 + i * 12, 410 + i, 66 + i * 12, P.b4) end
  save(L, "2_montanas")
end

-- 3: el gran telescopio de bronce en el medio, y estanterías con mapas y libros a los lados
do
  local L = layer()
  -- estanterías
  for _,s in ipairs({{20, 120, 150}, {490, 120, 620}}) do
    local x0, top, x1 = s[1], s[2], s[3]
    L.rect(x0, top, x1, GROUND + 10, P.b4); L.rect(x0 + 4, top + 4, x1 - 4, GROUND + 6, P.c4)
    for y=top + 10, GROUND, 26 do
      L.rect(x0 + 4, y + 18, x1 - 4, y + 20, P.b3)
      local x = x0 + 6
      while x < x1 - 10 do local w = 4 + math.floor(rnd() * 5); local h = 10 + math.floor(rnd() * 8); L.rect(x, y + 18 - h, x + w, y + 17, rnd() < 0.5 and P.r1 or (rnd() < 0.5 and P.god or P.m3)); x = x + w + 1 end
    end
  end
  -- el telescopio: un tubo largo de bronce en diagonal, con anillos y la lente rota arriba
  local function tube(t) return 260 + t * 120, GROUND - 10 - t * 190 end
  for t=0,1,0.004 do
    local x, y = tube(t)
    local r = 18 + t * 8
    L.ellipse(x, y, r, r, (math.floor(t * 30) % 6 == 0) and P.b1 or P.b2)
    L.ellipse(x + r * 0.4, y + r * 0.4, r * 0.5, r * 0.5, P.b3)
  end
  local lx, ly = tube(1)
  L.ellipse(lx, ly, 28, 28, P.b3); L.ellipse(lx, ly, 22, 22, P.ne); L.glow(lx, ly, 34, P.e2, 0.4); L.ellipse(lx, ly, 8, 8, P.e2)
  L.line(lx - 18, ly - 10, lx + 4, ly + 12, P.l2)
  -- el pie del telescopio
  L.rect(230, GROUND - 40, 300, GROUND + 18, P.b3); L.rect(230, GROUND - 40, 300, GROUND - 36, P.b1); L.rect(214, GROUND + 10, 316, GROUND + 18, P.b4)
  for _,p in ipairs({{240,GROUND-20},{290,GROUND-28}}) do L.px(p[1], p[2], P.v1); L.px(p[1]+1, p[2], P.v1) end
  save(L, "3_colinas")
end

-- 4: baldosas de mármol en perspectiva con un astrolabio de oro incrustado al medio
do
  local L = layer()
  local vx, vy = 320, 150
  for y=GROUND,H-1 do L.rect(0, y, W-1, y, P.m2) end
  local y, gap = GROUND, 6
  while y < H do L.rect(0, math.floor(y), W-1, math.floor(y), P.m3); L.rect(0, math.floor(y)+1, W-1, math.floor(y)+1, P.m1); y = y + gap; gap = gap * 1.35 end
  for k=-12,12 do
    local xb = 320 + k * 70
    local x0 = vx + (xb - vx) * ((GROUND - vy) / (H - vy))
    L.line(x0, GROUND, xb, H-1, P.m3)
  end
  -- el astrolabio, aplastado por la perspectiva
  local cx, cy = 320, 312
  for _,r in ipairs({{150, 34, P.god}, {140, 30, P.c4}, {96, 20, P.god}, {90, 18, P.c3}}) do L.ellipse(cx, cy, r[1], r[2], r[3]) end
  L.line(cx - 140, cy, cx + 140, cy, P.go); L.line(cx, cy - 30, cx, cy + 30, P.go)
  for a=0,330,30 do L.px(cx + math.cos(math.rad(a)) * 145, cy + math.sin(math.rad(a)) * 32, P.go) end
  L.ellipse(cx, cy, 10, 3, P.go)
  L.rect(0, GROUND, W-1, GROUND+1, P.m4)
  save(L, "4_suelo")
end

-- 5: primer plano (lámparas de cristal a los lados, libros caídos y vidrios de la lente)
do
  local L = layer()
  for _,x in ipairs({36, 604}) do
    L.rect(x - 3, 250, x + 3, 359, P.b3); L.rect(x - 10, 246, x + 10, 250, P.b2)
    L.glow(x, 226, 34, P.l2, 0.5); L.ellipse(x, 226, 12, 16, P.l3); L.ellipse(x - 2, 222, 8, 12, P.l1)
  end
  for _,b in ipairs({{90, 340, P.r1}, {110, 346, P.god}, {540, 344, P.r1}, {520, 348, P.m3}}) do
    L.rect(b[1], b[2], b[1] + 22, b[2] + 6, b[3]); L.rect(b[1], b[2], b[1] + 22, b[2], P.m1)
  end
  for _=1,26 do local x = 140 + math.floor(rnd() * 360); local y = 330 + math.floor(rnd() * 26); L.line(x, y, x + 3, y - 2, P.l2); L.px(x + 1, y - 1, P.l1) end
  save(L, "5_primer_plano")
end
