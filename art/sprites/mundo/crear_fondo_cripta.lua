-- Fondo de combate de la Cripta del Vigía (640x360, 5 capas con parallax como el de la Pradera):
--   1_cielo        bóveda oscura de piedra
--   2_montanas     muro del fondo con arcos y el faro del Vigía brillando a lo lejos
--   3_colinas      columnas cercanas con antorchas
--   4_suelo        losas en perspectiva con la alfombra roja (el suelo empieza en y=248)
--   5_primer_plano cadenas, telarañas y huesos (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_cripta.lua
local W, H, GROUND = 640, 360, 248
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  v0=hex("0c0a16"), v1=hex("15122a"), v2=hex("1e1a34"), v3=hex("27223f"),
  w1=hex("3a3552"), w2=hex("2e2a44"), w3=hex("242036"), w4=hex("19162a"),
  c1=hex("6e6a86"), c2=hex("56536e"), c3=hex("444159"), c4=hex("333045"), c5=hex("242233"),
  f1=hex("5e5a78"), f2=hex("4a4662"), f3=hex("3a3650"), f4=hex("2a2740"),
  R=hex("a8303a"), r=hex("6a1a26"), Y=hex("e8c050"), y=hex("a8802c"),
  C=hex("7ff8ff"), c=hex("3aa8c8"), Ch=hex("d8ffff"),
  F=hex("ffe070"), Fo=hex("ff9a4a"), Fr=hex("d0502a"), B=hex("6a4428"),
  T=hex("e8dcb8"), t=hex("b8a880"), K=hex("141420"), ch=hex("5a5870"), chd=hex("3a3850"), web=rgba(230,230,240,150),
}
local seed = 777
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
  spr:saveCopyAs(app.params.dir .. "/cripta/fondo/" .. name .. ".png")
  spr:close()
end

-- 1: bóveda (degradé en bandas, con bloques de piedra apenas marcados)
do
  local L = layer()
  local bands = {P.v0, P.v1, P.v2, P.v3}
  for y=0,H-1 do
    local i = math.min(4, 1 + math.floor((y / GROUND) * 4))
    L.rect(0,y,W-1,y,bands[i])
  end
  for row=0,7 do
    local y = row * 30
    L.rect(0,y,W-1,y,P.v0)
    local off = (row % 2) * 24
    for x=off,W,48 do L.rect(x,y,x,y+29,P.v0) end
  end
  save(L, "1_cielo")
end

-- 2: muro del fondo con tres arcos; en el del medio, el faro lejano
do
  local L = layer()
  L.rect(0,40,W-1,GROUND+8,P.w3)
  for row=0,7 do
    local y = 40 + row*26
    L.rect(0,y,W-1,y,P.w4)
    local off = (row % 2) * 20
    for x=off,W,40 do L.rect(x,y,x,y+25,P.w4) end
    for x=off+1,W,40 do L.rect(x,y+1,x+30,y+1,P.w2) end
  end
  for _,a in ipairs({{120,52},{320,70},{520,52}}) do
    local cx, rw = a[1], a[2]
    local top = 260 - rw*2.6
    L.rect(cx-rw-8, top-6, cx+rw+8, GROUND+8, P.w2)
    L.ellipse(cx, top+rw*0.2, rw+8, rw*0.9+8, P.w2)
    L.rect(cx-rw, top+rw*0.2, cx+rw, GROUND+8, P.v0)
    L.ellipse(cx, top+rw*0.2, rw, rw*0.9, P.v0)
    L.rect(cx-rw-8, top-6, cx-rw-2, GROUND+8, P.w1)
  end
  -- el faro: luz fría al fondo del arco central
  L.glow(320, 150, 70, P.c, 0.55)
  L.ellipse(320, 150, 9, 9, P.c); L.ellipse(320, 150, 5, 5, P.C); L.ellipse(320,150,2,2,P.Ch)
  for k=0,5 do L.line(320, 150, 320 + math.cos(k*1.05)*26, 150 + math.sin(k*1.05)*26, P.c) end
  save(L, "2_montanas")
end

-- 3: columnas con antorchas
do
  local L = layer()
  for _,x in ipairs({40, 210, 430, 600}) do
    L.rect(x-16, 30, x+16, GROUND+20, P.c3)
    L.rect(x-16, 30, x-12, GROUND+20, P.c2)
    L.rect(x+12, 30, x+16, GROUND+20, P.c4)
    for _,dx in ipairs({-6, 0, 6}) do L.rect(x+dx, 40, x+dx, GROUND+8, P.c4) end
    L.rect(x-24, 18, x+24, 32, P.c2); L.rect(x-24, 30, x+24, 32, P.c4); L.rect(x-20, 12, x+20, 18, P.c1)
    L.rect(x-24, GROUND+10, x+24, GROUND+22, P.c2); L.rect(x-24, GROUND+20, x+24, GROUND+22, P.c5)
    if rnd() < 0.8 then L.px(x-9, 120, hex("3f6234")); L.px(x-8, 121, hex("5f8a48")) end
  end
  for _,x in ipairs({210, 430}) do
    L.glow(x, 112, 46, P.Fo, 0.6)
    L.rect(x-3, 120, x+3, 132, P.B); L.rect(x-6, 118, x+6, 120, P.B)
    L.ellipse(x, 110, 5, 8, P.Fr); L.ellipse(x, 112, 4, 5, P.Fo); L.ellipse(x, 114, 2, 3, P.F)
  end
  save(L, "3_colinas")
end

-- 4: suelo de losas en perspectiva con la alfombra
do
  local L = layer()
  local vx, vy = 320, 150 -- punto de fuga
  for y=GROUND,H-1 do
    local t = (y - GROUND) / (H - GROUND)
    local base = (t < 0.33) and P.f3 or (t < 0.66 and P.f2 or P.f2)
    L.rect(0, y, W-1, y, base)
  end
  -- juntas horizontales cada vez más separadas
  local y, gap = GROUND, 6
  while y < H do L.rect(0, math.floor(y), W-1, math.floor(y), P.f4); L.rect(0, math.floor(y)+1, W-1, math.floor(y)+1, P.f1); y = y + gap; gap = gap * 1.35 end
  -- juntas que van al punto de fuga
  for k=-12,12 do
    local xb = 320 + k * 70
    local x0 = vx + (xb - vx) * ((GROUND - vy) / (H - vy))
    L.line(x0, GROUND, xb, H-1, P.f4)
  end
  -- alfombra roja con borde dorado
  for yy=GROUND,H-1 do
    local t = (yy - vy) / (H - vy)
    local half = 140 * t
    L.rect(320 - half, yy, 320 + half, yy, P.R)
    L.px(320 - half, yy, P.y); L.px(320 + half, yy, P.y)
    L.px(320 - half + 3*t, yy, P.Y); L.px(320 + half - 3*t, yy, P.Y)
  end
  -- borde del muro con el suelo
  L.rect(0, GROUND, W-1, GROUND+1, P.f4)
  for _=1,500 do local x, yy = math.floor(rnd()*W), GROUND + 3 + math.floor(rnd()*(H-GROUND-3)); L.px(x, yy, P.f4) end
  save(L, "4_suelo")
end

-- 5: primer plano (cadenas arriba, telaraña, huesos abajo en las esquinas)
do
  local L = layer()
  for _,cx in ipairs({30, 92}) do
    local len = cx == 30 and 90 or 54
    for k=0,len,6 do L.ellipse(cx, k, 2, 3, P.ch); L.px(cx, k, P.chd) end
    L.rect(cx-5, len+2, cx+5, len+5, P.chd)
  end
  for i=0,6 do L.line(W-1, 0, W-1-90+i*12, 70-i*10, P.web) end
  for r=20,80,20 do
    local prev
    for i=0,6 do local a = math.rad(180 + i*15); local p = {W-1 + math.cos(a)*r*1.1, -math.sin(a)*r*0.9}; if prev then L.line(prev[1],prev[2],p[1],p[2],P.web) end; prev = p end
  end
  for _,b in ipairs({{40, 340}, {600, 338}}) do
    local bx, by = b[1], b[2]
    L.ellipse(bx, by+10, 46, 16, P.t); L.ellipse(bx, by+6, 38, 12, P.T)
    L.ellipse(bx-12, by-6, 11, 10, P.T); L.rect(bx-17, by+2, bx-7, by+4, P.t)
    L.ellipse(bx-16, by-7, 3, 3, P.K); L.ellipse(bx-8, by-7, 3, 3, P.K)
    L.line(bx-30, by+12, bx+30, by, P.T); L.line(bx-30, by+13, bx+30, by+1, P.t)
    L.ellipse(bx+18, by-2, 7, 6, P.T); L.px(bx+16, by-3, P.K); L.px(bx+20, by-3, P.K)
  end
  save(L, "5_primer_plano")
end
