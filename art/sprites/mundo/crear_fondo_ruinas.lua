-- Fondo de combate de las Ruinas Ancestrales (640x360, 5 capas con parallax como el de la Pradera). Al aire
-- libre, el templo de Aethra al atardecer, detrás del Velo:
--   1_cielo        atardecer dorado y rosado, con las primeras estrellas y una grieta de cielo roto
--   2_montanas     las torres blancas del templo a lo lejos, entre la niebla del Velo
--   3_colinas      columnas rotas de mármol con hiedra y una estatua de Aethra que llora luz
--   4_suelo        losas de mármol en perspectiva con pasto entre las juntas (el suelo empieza en y=248)
--   5_primer_plano flores de luz, escombros y jirones de niebla (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_ruinas.lua
local W, H, GROUND = 640, 360, 248
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  s1=hex("f6c88a"), s2=hex("e8a07a"), s3=hex("b8789a"), s4=hex("6a5a9a"), s5=hex("3a3a7a"),
  sun=hex("fff4c0"), sunh=hex("ffd890"),
  m1=hex("f4f0e6"), m2=hex("dfd8c8"), m3=hex("c2b9a6"), m4=hex("978e7c"), m5=hex("6c6656"),
  far1=hex("c8bcd0"), far2=hex("a898b8"), far3=hex("8a7aa0"),
  v1=hex("f6f8fc"), v2=hex("e2e8f2"),
  g1=hex("b6d878"), g2=hex("92bc5a"), g3=hex("6c9640"), g4=hex("4a7030"),
  go=hex("ffe08a"), god=hex("c89a2a"), l1=hex("e0f8ff"), l2=hex("a6e2f4"), l3=hex("64bcde"),
  c1=hex("1e1a44"), c2=hex("2e2a66"), st=hex("ffffff"), K=hex("141420"),
  fog=rgba(246,248,252,150), fog2=rgba(246,248,252,90),
}
local seed = 1207
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

local function layer()
  local img = Image(W, H, ColorMode.RGB)
  img:clear(rgba(0,0,0,0))
  local L = {img=img}
  function L.px(x,y,c) x,y=math.floor(x),math.floor(y); if x>=0 and x<W and y>=0 and y<H then img:drawPixel(x,y,c) end end
  function L.rect(x0,y0,x1,y1,c) for y=math.max(0,math.floor(y0)),math.min(H-1,math.floor(y1)) do for x=math.max(0,math.floor(x0)),math.min(W-1,math.floor(x1)) do img:drawPixel(x,y,c) end end end
  function L.ellipse(cx,cy,rx,ry,c) for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do local dx,dy=(x-cx)/rx,(y-cy)/ry; if dx*dx+dy*dy<=1 then L.px(x,y,c) end end end end
  function L.line(x0,y0,x1,y1,c) local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1); for i=0,n do L.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end end
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
  spr:saveCopyAs(app.params.dir .. "/ruinas/fondo/" .. name .. ".png")
  spr:close()
end

-- 1: atardecer en bandas, el sol bajo, estrellas arriba y una grieta de cielo roto
do
  local L = layer()
  local bands = {P.s5, P.s4, P.s3, P.s2, P.s1}
  for y=0,H-1 do
    local t = math.min(1, y / GROUND)
    local i = math.min(5, 1 + math.floor(t * 5))
    L.rect(0,y,W-1,y,bands[i])
  end
  for _=1,60 do local x, y = math.floor(rnd()*W), math.floor(rnd()*70); L.px(x, y, P.st) end
  L.glow(470, 200, 90, P.sunh, 0.6); L.ellipse(470, 200, 26, 26, P.sunh); L.ellipse(470, 200, 20, 20, P.sun)
  -- la grieta del cielo: una herida oscura con estrellas, arriba a la izquierda
  for i=0,40 do local x = 60 + i * 3; local y = 20 + math.floor(math.sin(i / 4) * 6) + i // 3; L.rect(x, y, x + 4, y + 3 + (i % 3), P.c1); L.px(x + 1, y + 1, P.c2) end
  for _,p in ipairs({{70,26},{98,34},{130,36},{150,40}}) do L.px(p[1], p[2], P.st) end
  save(L, "1_cielo")
end

-- 2: las torres blancas del templo, lejos, entre la niebla del Velo
do
  local L = layer()
  -- colinas lejanas
  for x=0,W-1 do local h = 186 + math.floor(math.sin(x / 50) * 10 + math.sin(x / 17) * 4); L.rect(x, h, x, GROUND + 8, P.far3) end
  for _,t in ipairs({{120,60,22},{210,90,16},{330,40,26},{420,96,14},{560,70,20}}) do
    local cx, top, half = t[1], t[2], t[3]
    L.rect(cx - half, top, cx + half, GROUND, P.far1); L.rect(cx + half - 5, top, cx + half, GROUND, P.far2)
    for y=top + 10, GROUND, 14 do L.rect(cx - half, y, cx + half, y, P.far2) end
    for y=top - 30, top do local hh = math.floor((y - (top - 30)) * half / 30); L.rect(cx - hh, y, cx + hh, y, ((y // 4) % 2 == 0) and P.go or P.god) end
    L.ellipse(cx, top + 30, 3, 6, P.far3); L.ellipse(cx, top + 30, 2, 4, P.l2)
  end
  -- la niebla del Velo, en franjas
  for y=170, GROUND + 8 do for x=0,W-1 do
    local n = math.sin(x / 40 + y / 9) + math.sin(x / 13 - y / 7) * 0.5
    if n > 0.6 then L.px(x, y, P.fog) elseif n > 0.2 and (x + y) % 2 == 0 then L.px(x, y, P.fog2) end
  end end
  save(L, "2_montanas")
end

-- 3: columnas rotas con hiedra y la estatua de Aethra que llora luz en el medio
do
  local L = layer()
  local function column(x, top)
    L.rect(x - 15, top, x + 15, GROUND + 20, P.m1); L.rect(x - 15, top, x - 12, GROUND + 20, P.m2); L.rect(x + 11, top, x + 15, GROUND + 20, P.m3)
    for _,dx in ipairs({-6, 0, 6}) do L.rect(x + dx, top + 4, x + dx, GROUND + 8, P.m3) end
    -- partida arriba, en diagonal
    for i=0,30 do L.rect(x - 15 + i, top - 1 - (i * 10) // 30, x - 15 + i, top, P.m1) end
    L.rect(x - 22, GROUND + 10, x + 22, GROUND + 22, P.m2); L.rect(x - 22, GROUND + 20, x + 22, GROUND + 22, P.m4)
    -- hiedra
    for i=0,40 do local y = top + 20 + i * 3; L.px(x - 14 + math.floor(math.sin(i / 2) * 4), y, P.g3); L.px(x - 13 + math.floor(math.sin(i / 2) * 4), y, P.g2) end
  end
  column(40, 60); column(196, 110); column(444, 90); column(604, 50)
  -- la estatua de Aethra
  local cx = 320
  L.rect(cx - 30, 200, cx + 30, GROUND + 22, P.m2); L.rect(cx - 30, 200, cx + 30, 204, P.m1); L.rect(cx - 30, GROUND + 18, cx + 30, GROUND + 22, P.m4)
  -- contorno: la misma silueta un poco más grande, en gris oscuro
  for y=98,200 do local half = math.floor(12 + (y - 100) * 0.2); L.rect(cx - half - 2, y, cx + half + 2, y, P.m5) end
  L.ellipse(cx, 86, 15, 17, P.m5)
  -- el manto, con pliegues verticales
  for y=100,200 do local half = math.floor(12 + (y - 100) * 0.2); L.rect(cx - half, y, cx + half, y, P.m1); L.px(cx + half, y, P.m3); L.px(cx + half - 1, y, P.m3) end
  for _,dx in ipairs({-8, -2, 4, 10}) do L.line(cx + dx, 112, cx + dx + dx // 3, 198, P.m3) end
  -- los brazos juntos sobre el pecho y las manos con una flor
  L.ellipse(cx - 10, 118, 6, 10, P.m2); L.ellipse(cx + 10, 118, 6, 10, P.m2); L.ellipse(cx, 126, 8, 5, P.m1); L.ellipse(cx, 124, 3, 3, P.l2)
  -- la cabeza con el pelo largo
  L.ellipse(cx, 86, 12, 14, P.m1); L.rect(cx - 14, 84, cx - 10, 116, P.m2); L.rect(cx + 10, 84, cx + 14, 116, P.m3)
  L.ellipse(cx, 66, 14, 4, P.go); L.ellipse(cx, 66, 10, 2, P.god)
  L.glow(cx, 92, 30, P.l2, 0.45)
  for _,dx in ipairs({-5, 5}) do L.px(cx + dx, 88, P.l3); L.rect(cx + dx, 89, cx + dx, 120, P.l2); L.ellipse(cx + dx, 200, 3, 1, P.l1) end
  save(L, "3_colinas")
end

-- 4: losas de mármol en perspectiva con pasto en las juntas y una calzada clara al medio
do
  local L = layer()
  local vx, vy = 320, 150
  for y=GROUND,H-1 do L.rect(0, y, W-1, y, P.m2) end
  local y, gap = GROUND, 6
  while y < H do L.rect(0, math.floor(y), W-1, math.floor(y), P.g3); L.rect(0, math.floor(y)+1, W-1, math.floor(y)+1, P.m1); y = y + gap; gap = gap * 1.35 end
  for k=-12,12 do
    local xb = 320 + k * 70
    local x0 = vx + (xb - vx) * ((GROUND - vy) / (H - vy))
    L.line(x0, GROUND, xb, H-1, P.g3)
  end
  for yy=GROUND,H-1 do
    local t = (yy - vy) / (H - vy)
    local half = 90 * t
    L.rect(320 - half, yy, 320 + half, yy, P.m1)
    L.px(320 - half, yy, P.god); L.px(320 + half, yy, P.god)
  end
  -- pasto que crece entre las losas y en los costados
  for _=1,500 do local x, yy = math.floor(rnd()*W), GROUND + 3 + math.floor(rnd()*(H-GROUND-3)); if math.abs(x - 320) > 60 then L.px(x, yy, rnd() < 0.5 and P.g2 or P.g1) end end
  for _,side in ipairs({{0, 70}, {570, 640}}) do for x=side[1],side[2] - 1 do local h = 6 + math.floor(math.sin(x / 5) * 4); L.rect(x, GROUND, x, GROUND + h, P.g2); L.px(x, GROUND, P.g1) end end
  L.rect(0, GROUND, W-1, GROUND+1, P.m4)
  save(L, "4_suelo")
end

-- 5: primer plano (flores de luz y escombros abajo, jirones de niebla arriba)
do
  local L = layer()
  for _,b in ipairs({{40, 336}, {610, 340}}) do
    local bx, by = b[1], b[2]
    L.rect(bx - 30, by, bx + 10, by + 20, P.m2); L.rect(bx - 30, by, bx + 10, by + 2, P.m1); L.rect(bx + 4, by + 6, bx + 26, by + 22, P.m3); L.rect(bx + 4, by + 6, bx + 26, by + 8, P.m2)
  end
  for _,f in ipairs({{96, 350}, {116, 344}, {540, 348}, {520, 352}, {560, 344}}) do
    local x, y = f[1], f[2]
    L.rect(x, y - 10, x, y + 8, P.g3); L.px(x - 1, y - 4, P.g2)
    L.glow(x, y - 12, 10, P.l2, 0.4); L.ellipse(x, y - 12, 3, 2, P.l2); L.px(x, y - 12, P.st)
  end
  for i=0,8 do local x = 30 + i * 70; for k=0,40 do L.px(x + k, 12 + math.floor(math.sin(k / 6 + i) * 3), P.fog2) end end
  save(L, "5_primer_plano")
end
