-- Fondo de combate del final (640x360, 5 capas con parallax como los demás): la Plaza del Pilar de Aurelia de
-- noche, durante el ritual de los Sellos (la R13 de las Ruinas Ancestrales):
--   1_cielo        la noche de Aurelia con siete estrellas que brillan más que las otras (los siete Sellos)
--   2_montanas     los techos de Aurelia y la Catedral, recortados contra el cielo
--   3_colinas      el Pilar de Aethra en el medio, encendido, con los siete fragmentos girando alrededor
--   4_suelo        el empedrado de la plaza en perspectiva, partido por grietas moradas del Devorador
--   5_primer_plano faroles de la plaza y jirones de oscuridad que suben de las grietas (casi todo transparente)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_fondo_final.lua
local W, H, GROUND = 640, 360, 248
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local function rgba(r,g,b,a) return Color{r=r,g=g,b=b,a=a} end
local P = {
  s1=hex("2e2a66"), s2=hex("242056"), s3=hex("1c1844"), s4=hex("141236"), s5=hex("0e0c24"),
  st=hex("fff8c0"), st2=hex("a6e2f4"), sw=hex("ffffff"),
  e1=hex("e2a6ff"), e2=hex("8a50d8"), e3=hex("4e2490"), ne=hex("18161e"),
  ci1=hex("3a3a5c"), ci2=hex("2c2c48"), ci3=hex("20203a"), win=hex("ffd890"), win2=hex("c89a50"),
  p1=hex("e8eef8"), p2=hex("c8d4e8"), p3=hex("9aa8c4"), aq1=hex("dcf8ff"), aq2=hex("8ad8f0"), aq3=hex("3a98c8"),
  pv1=hex("8a8496"), pv2=hex("6c6678"), pv3=hex("524e60"), pv4=hex("3e3a4a"),
  go=hex("ffe08a"), god=hex("c89a2a"), fe=hex("4a4656"), K=hex("141420"),
  smoke=rgba(30,24,52,170), smoke2=rgba(30,24,52,100),
}
local seed = 7171
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
  spr:saveCopyAs(app.params.dir .. "/final/fondo/" .. name .. ".png")
  spr:close()
end


-- 1: la noche de Aurelia con siete estrellas grandes en arco (los siete Sellos)
do
  local L = layer()
  local bands = {P.s5, P.s4, P.s3, P.s2, P.s1}
  for y=0,H-1 do
    local t = math.min(1, y / GROUND)
    local i = math.min(5, 1 + math.floor(t * 5))
    L.rect(0,y,W-1,y,bands[i])
  end
  for _=1,120 do local x, y = math.floor(rnd()*W), math.floor(rnd()*GROUND); L.px(x, y, rnd() < 0.7 and P.st or P.st2) end
  for k=0,6 do
    local a = math.pi * (0.15 + k * 0.7 / 6)
    local x, y = 320 - math.cos(a) * 230, 120 - math.sin(a) * 90
    L.glow(x, y, 14, P.st2, 0.6); L.px(x, y, P.sw); L.px(x - 1, y, P.st); L.px(x + 1, y, P.st); L.px(x, y - 1, P.st); L.px(x, y + 1, P.st)
  end
  save(L, "1_cielo")
end

-- 2: los techos de Aurelia y la Catedral con su rosetón, recortados contra el cielo
do
  local L = layer()
  local x = 0
  while x < W do
    local w = 30 + math.floor(rnd() * 40)
    local h = 150 + math.floor(rnd() * 40)
    if x > 240 and x < 400 then h = 190 end
    L.rect(x, h, x + w, GROUND + 6, P.ci2)
    for k=0,w // 2 do L.rect(x + k, h - k // 2, x + w - k, h - k // 2, P.ci2) end
    for wy=h + 10, GROUND - 10, 16 do for wx=x + 6, x + w - 8, 12 do if rnd() < 0.45 then L.rect(wx, wy, wx + 4, wy + 6, rnd() < 0.5 and P.win or P.win2) end end end
    x = x + w + 2
  end
  -- la Catedral, a la izquierda: dos torres y el rosetón
  for _,tx in ipairs({70, 150}) do
    L.rect(tx, 70, tx + 26, GROUND, P.ci1)
    -- el techo en punta de cada torre
    for r=0,39 do local half = math.floor(13 * r / 39); L.rect(tx + 13 - half, 31 + r, tx + 13 + half, 31 + r, P.ci1) end
    L.rect(tx + 12, 22, tx + 14, 31, P.god)
  end
  L.rect(96, 110, 150, GROUND, P.ci1)
  L.ellipse(123, 140, 16, 16, P.ci3); L.ellipse(123, 140, 13, 13, P.win2); L.ellipse(123, 140, 6, 6, P.win)
  for a=0,330,30 do L.line(123, 140, 123 + math.cos(math.rad(a)) * 13, 140 + math.sin(math.rad(a)) * 13, P.ci3) end
  save(L, "2_montanas")
end

-- 3: el Pilar de Aethra encendido en el medio, con los siete fragmentos girando alrededor
do
  local L = layer()
  local cx = 320
  L.glow(cx, 150, 110, P.aq2, 0.55)
  L.rect(cx - 34, GROUND - 14, cx + 34, GROUND + 14, P.p3); L.rect(cx - 34, GROUND - 14, cx + 34, GROUND - 10, P.p2)
  L.rect(cx - 16, 70, cx + 16, GROUND - 14, P.p2); L.rect(cx - 16, 70, cx - 10, GROUND - 14, P.p1); L.rect(cx + 10, 70, cx + 16, GROUND - 14, P.p3)
  for y=80, GROUND - 20, 18 do L.rect(cx - 16, y, cx + 16, y + 1, P.p3) end
  L.ellipse(cx, 64, 22, 8, P.p2); L.ellipse(cx, 60, 14, 6, P.aq1)
  -- el chorro de agua de luz que sube del Pilar
  for y=0,60 do local w = math.floor(3 + math.sin(y / 5) * 2); L.rect(cx - w, y, cx + w, y, y % 4 == 0 and P.aq1 or P.aq2) end
  -- los siete fragmentos, en una elipse
  for k=0,6 do
    local a = k * math.pi * 2 / 7
    local x, y = cx + math.cos(a) * 70, 150 + math.sin(a) * 26
    L.glow(x, y, 12, P.e1, 0.5)
    L.ellipse(x, y, 5, 7, P.e3); L.ellipse(x, y - 1, 3, 5, P.e2); L.px(x - 1, y - 3, P.sw)
  end
  -- las dos sacerdotisas cantando a los lados, de blanco
  for _,sx in ipairs({cx - 80, cx + 80}) do
    L.rect(sx - 7, GROUND - 40, sx + 7, GROUND, P.p1); L.rect(sx - 9, GROUND - 6, sx + 9, GROUND, P.p2)
    L.ellipse(sx, GROUND - 46, 6, 7, P.p1); L.glow(sx, GROUND - 46, 14, P.st, 0.35)
  end
  save(L, "3_colinas")
end

-- 4: el empedrado de la plaza en perspectiva, partido por las grietas moradas del Devorador
do
  local L = layer()
  local vx, vy = 320, 150
  for y=GROUND,H-1 do L.rect(0, y, W-1, y, P.pv2) end
  local y, gap = GROUND, 5
  while y < H do L.rect(0, math.floor(y), W-1, math.floor(y), P.pv3); L.rect(0, math.floor(y)+1, W-1, math.floor(y)+1, P.pv1); y = y + gap; gap = gap * 1.3 end
  for k=-14,14 do
    local xb = 320 + k * 50
    local x0 = vx + (xb - vx) * ((GROUND - vy) / (H - vy))
    L.line(x0, GROUND, xb, H-1, P.pv3)
  end
  -- las grietas: líneas quebradas con luz morada
  for _,c in ipairs({{120, 270}, {500, 280}, {300, 330}, {200, 345}, {430, 340}}) do
    local x, yy = c[1], c[2]
    for i=0,10 do
      local nx, ny = x + (rnd() - 0.5) * 30, yy + (rnd() - 0.5) * 8
      L.line(x, yy, nx, ny, P.e3); L.line(x, yy - 1, nx, ny - 1, P.e2)
      x, yy = nx, ny
    end
    L.glow(c[1], c[2], 26, P.e2, 0.4)
  end
  L.rect(0, GROUND, W-1, GROUND+1, P.pv4)
  save(L, "4_suelo")
end

-- 5: primer plano (faroles de la plaza a los lados y jirones de oscuridad que suben)
do
  local L = layer()
  for _,x in ipairs({30, 610}) do
    L.rect(x - 3, 230, x + 3, 359, P.fe); L.rect(x - 10, 214, x + 10, 230, P.fe)
    L.glow(x, 222, 30, P.win, 0.55); L.rect(x - 6, 216, x + 6, 228, P.win)
  end
  for i=0,7 do
    local x = 70 + i * 72
    for t=0,40 do local w = 5 - t * 0.1; L.rect(x + math.sin(t / 5 + i) * 6 - w, 359 - t * 2, x + math.sin(t / 5 + i) * 6 + w, 360 - t * 2, t % 2 == 0 and P.smoke or P.smoke2) end
  end
  save(L, "5_primer_plano")
end
