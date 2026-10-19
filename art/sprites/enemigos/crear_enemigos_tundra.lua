-- Enemigos de la Tundra Eterna (zona 5, nivel 61-75): uno o dos propios por subzona.
--   foca_colmillo        Foca Colmilluda (Costa Helada)
--   jabali_helado        Jabalí Helado (Aldea de los Mamuts)
--   lobo_hielo           Lobo de Hielo (Bosque de Pinos Blancos)
--   buho_niveo           Búho Níveo (Bosque y Estepa)
--   espiritu_congelado   Espíritu Congelado (Lago de Cristal)
--   elemental_escarcha   Elemental de Escarcha (Torre de Cristal)
--   cazador_hielo        Cazador del Hielo (Campamento de los Cazadores)
--   oso_nieves           Oso de las Nieves (Valle de los Gigantes)
--   gigante_nieve        Gigante de Nieve (Valle de los Gigantes), 56x56
--   cultista_helado      Cultista del Eclipse Helado (Grieta y Santuario)
--   caballero_escarcha   Caballero de Escarcha (Cementerio Real y Palacio)
--   sierpe_glacial       Sierpe Glacial (Grieta y Palacio), 56x56
--   mamut_lanudo         Mamut Lanudo, raro, 56x56
--   lobo_aurora          Lobo de la Aurora, raro, 56x56
--   bruja_congelada      Bruja Congelada (la historia), 56x56
--   guardian_hielo       Guardián del Hielo, minijefe, 64x64
--   rey_hielo            Rey del Hielo, jefe, 64x64
-- y los de la Cripta Congelada: criptah_doncella, criptah_gargola, criptah_escolta (48x48) y
-- criptah_escarcha, Escarcha, la Sierpe de la Reina (jefe, 64x64)
-- Mismo estilo que crear_enemigos_costas.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona5/<clave>.aseprite y
-- enemigos_tundra.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_tundra.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", R="c0343a", r="7a1f2a", Y="e8c050", y="a8802c", O="e88a3a",
  m1="b8c0cc", m2="7a8290", m3="4a505e", w1="8a5a3a", w2="5e3a22", w3="3e2616", T="eee0c0", t="b8a880",
  -- nieve y hielo (el hielo brilla: sin contorno)
  nv1="f2f6fc", nv2="d4e0ee", nv3="a8b8cc", ic1="e4f8ff", ic2="a8dcf0", ic3="6aaed0", ic4="3a7aa8",
  -- piel gris de foca, pelo de jabalí, pelo blanco de lobo y oso
  fo1="9aa6b2", fo2="72808e", fo3="4e5a68",
  jb1="5a4e5a", jb2="3e3440", jb3="282230",
  lb1="eef2f8", lb2="c4cedc", lb3="8e9aae",
  -- búho, pieles de cazador, cuero
  bu1="f6f4ee", bu2="d8d2c4", bu3="a89c88",
  pe1="cbb08e", pe2="94765a", pe3="5e4a38",
  -- espíritu y aurora (brillan)
  es1="d8f4ff", es2="8ad0f0", es3="4a8ab8", au1="7af0b8", au2="b884ff", au3="3aa88a",
  -- gigante y guardián (piel azul), mamut
  gi1="8ab0d8", gi2="5e86b4", gi3="3a5a86", ma1="8a5e3e", ma2="644228", ma3="402818",
  -- ocultos (eclipse), armadura de escarcha
  ec1="e2a6ff", ec2="8a50d8", ec3="4e2490", ar1="c8d4e4", ar2="8a98b0", ar3="56627a",
  -- el rey y la bruja: azul real, oro y pelo blanco
  rb1="3a5a8e", rb2="26406a", rb3="182a48", go1="ffe08a", go2="e0a840",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, ic1=true, es1=true, es2=true, au1=true, au2=true, ec1=true, go1=true}

local function newGrid(W, H, ground)
  ground = ground or H - 1
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x>=0 and x<W and y>=0 and y<H and y<=ground then g[y*W+x] = c end
  end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end
  end
  function G.thick(x0,y0,x1,y1,w,c)
    local vertical = math.abs(y1-y0) >= math.abs(x1-x0)
    for k=0,w-1 do
      local o = k - (w-1)//2
      if vertical then G.line(x0+o,y0,x1+o,y1,c) else G.line(x0,y0+o,x1,y1+o,c) end
    end
  end
  function G.ellipse(cx,cy,rx,ry,c)
    for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do
      local dx, dy = (x-cx)/rx, (y-cy)/ry
      if dx*dx + dy*dy <= 1 then G.px(x,y,c) end
    end end
  end
  function G.ridge(cx,cy,rx,ry,c,depth)
    for x=math.floor(cx-rx+1),math.ceil(cx+rx-1) do
      local u = (x-cx)/rx
      local top = cy - ry*math.sqrt(math.max(0, 1-u*u))
      for d=1,(depth or 1) do G.px(x, math.ceil(top)+d-1, c) end
    end
  end
  -- chapoteo: agua a los pies (de x0 a x1 en la fila y)
  function G.splash(x0, x1, y, ph)
    G.rect(x0, y, x1, y, "wa3"); G.rect(x0 + 2, y - 1, x1 - 2, y - 1, "wa2")
    for x = x0 + 1, x1 - 1, 4 do G.px(x + ((ph or 0) % 2), y - 2, "wa1") end
  end
  -- tentáculo ondulado de (x, y) con largo n, grosor w (se afina) y fase
  function G.tentacle(x, y, n, w, dirx, ph, c1, c2)
    for i=0,n do
      local t = i / n
      local cx = x + dirx * i
      local cy = y + math.sin(t * 5 + (ph or 0)) * 2.5
      G.ellipse(cx, cy, math.max(1, w * (1 - t * 0.7)), math.max(1, w * (1 - t * 0.7)), c1)
      if c2 and i % 3 == 0 then G.px(cx, cy + 1, c2) end
    end
  end
  return G
end

-- contorno oscuro + volteo horizontal
local function toImage(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y=0,H-1 do for x=0,W-1 do
    if not g[y*W+x] then
      for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
        local nx, ny = x+o[1], y+o[2]
        local n = (nx>=0 and nx<W and ny>=0 and ny<H) and g[ny*W+nx]
        if n and not GLOW[n] then out[y*W+x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(W - 1 - (k % W), k // W, C[c]) end
  return img
end

local function eye(G, x, y, c, pain)
  if pain then G.px(x, y, "K"); G.px(x+1, y, "K") else G.px(x, y, c) end
end

-- nieve bajo las patas
local function snowGround(G, x0, x1, y) G.rect(x0, y, x1, y, "nv3"); G.rect(x0 + 2, y - 1, x1 - 2, y - 1, "nv2") end
-- cuatro patas (cuadrúpedos): x de cada pata, arriba y abajo, color
local function legs(G, xs, top, bottom, c, c2, ph)
  for i, x in ipairs(xs) do local k = ((i + (ph or 0)) % 2); G.thick(x, top, x + (k == 0 and -1 or 1), bottom, 3, c); G.px(x, bottom, c2 or c) end
end

-- =====================================================================================
-- Foca Colmilluda (48x48): gorda, gris, con dos colmillos de morsa y bigotes
-- =====================================================================================
local function foca(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 4, 44, 45)
  if P.dead then G.ellipse(24,41,17,4,"fo2"); G.ridge(24,41,17,4,"fo1",1); G.ellipse(38,40,5,3,"fo1"); G.line(40,42,42,45,"T"); return G end
  G.ellipse(22+dx, 35+b, 17, 9, "fo2"); G.ridge(22+dx, 35+b, 17, 9, "fo1", 3); G.ellipse(22+dx, 40+b, 12, 4, "nv2")
  for _,p in ipairs({{12,32},{20,30},{16,36},{26,34}}) do G.px(p[1]+dx, p[2]+b, "fo3") end
  G.thick(8+dx, 40+b, 2+dx, 44, 3, "fo3"); G.line(2+dx, 44, 6+dx, 44, "fo3")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(36+hx, 26+hy, 8, 7, "fo2"); G.ridge(36+hx, 26+hy, 8, 7, "fo1", 2); G.ellipse(41+hx, 29+hy, 4, 3, "fo1")
  eye(G, 38+hx, 23+hy, "K", P.pain); G.px(44+hx, 27+hy, "K")
  for _,y in ipairs({28, 30}) do G.line(44+hx, y+hy, 47+hx, y-1+hy, "W") end
  G.thick(40+hx, 31+hy, 41+hx, 37+hy, 2, "T"); G.thick(43+hx, 31+hy, 44+hx, 36+hy, 2, "T")
  G.thick(28+dx, 40+b, 34+dx, 44, 3, "fo3")
  if P.splash then for i=0,5 do G.ellipse(36+dx+i*2, 20+b-i, 2, 2, i % 2 == 0 and "ic1" or "ic2") end end
  return G
end

-- =====================================================================================
-- Jabalí Helado (48x48): pelo oscuro, cresta escarchada, colmillos
-- =====================================================================================
local function jabali(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 4, 44, 45)
  if P.dead then G.ellipse(22,41,16,4,"jb2"); G.ridge(22,41,16,4,"jb1",1); G.ellipse(38,41,5,3,"jb1"); G.line(42,40,45,38,"T"); return G end
  legs(G, {12, 18, 28, 34}, 36+b, 44, "jb3", "jb3", P.phase)
  G.ellipse(22+dx, 30+b, 14, 9, "jb2"); G.ridge(22+dx, 30+b, 14, 9, "jb1", 2)
  for x=10,32,3 do G.line(x+dx, 21+b, x+dx+1, 17+b, "ic2"); G.px(x+dx+1, 17+b, "ic1") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(37+hx, 30+hy, 7, 6, "jb2"); G.ellipse(43+hx, 33+hy, 3, 3, "jb1"); G.px(45+hx, 33+hy, "K")
  eye(G, 38+hx, 27+hy, "ic1", P.pain); G.line(33+hx, 24+hy, 31+hx, 21+hy, "jb3")
  G.line(41+hx, 35+hy, 44+hx, 31+hy, "T"); G.line(40+hx, 35+hy, 43+hx, 30+hy, "W")
  if P.charge then for i=0,3 do G.line(4+dx-i*3, 26+b+i*3, 0+dx-i*3, 26+b+i*3, "nv2") end end
  return G
end

-- =====================================================================================
-- Lobo de Hielo (48x48): blanco, ojos celestes, aliento de escarcha
-- =====================================================================================
local function loboHielo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 4, 44, 45)
  if P.dead then G.ellipse(22,41,16,3,"lb2"); G.ridge(22,41,16,3,"lb1",1); G.ellipse(38,40,5,3,"lb1"); G.px(40,39,"K"); return G end
  legs(G, {12, 17, 29, 34}, 34+b, 44, "lb3", "lb3", P.phase)
  G.thick(8+dx, 26+b, 2+dx, 20+b, 4, "lb2"); G.px(1+dx, 19+b, "lb1")
  G.ellipse(22+dx, 30+b, 13, 7, "lb2"); G.ridge(22+dx, 30+b, 13, 7, "lb1", 2); G.ellipse(30+dx, 30+b, 6, 6, "lb1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(37+hx, 23+hy, 6, 5, "lb1"); G.rect(40+hx, 23+hy, 46+hx, 26+hy, "lb2"); G.px(46+hx, 23+hy, "K")
  G.line(34+hx, 18+hy, 33+hx, 13+hy, "lb2"); G.line(37+hx, 18+hy, 37+hx, 13+hy, "lb2")
  eye(G, 39+hx, 21+hy, "ic3", P.pain)
  if P.bite then G.rect(41+hx, 26+hy, 46+hx, 28+hy, "r"); for x=41,46,2 do G.px(x+hx, 26+hy, "W") end end
  if P.cast then for i=0,4 do G.ellipse(46+hx+i*0.4, 24+hy-i*2, 2, 2, "ic1") end; for _,p in ipairs({{8,8},{20,4},{30,10}}) do G.px(p[1]+dx,p[2]+b,"ic2") end end
  return G
end

-- =====================================================================================
-- Búho Níveo (48x48): búho blanco con motas, ojos amarillos; abre las alas para el picado
-- =====================================================================================
local function buho(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then G.ellipse(24,42,12,3,"bu2"); G.ridge(24,42,12,3,"bu1",1); for x=14,34,4 do G.px(x,41,"bu3") end; return G end
  local wing = P.wing or 0
  if wing == 1 then
    G.thick(12+dx, 22+b, 0+dx, 14+b, 5, "bu2"); G.thick(34+dx, 22+b, 46+dx, 12+b, 5, "bu2")
    for x=2,10,3 do G.px(x+dx, 16+b, "bu3") end; for x=38,44,3 do G.px(x+dx, 14+b, "bu3") end
  end
  G.ellipse(24+dx, 28+b, 11, 13, "bu1"); G.ridge(24+dx, 28+b, 11, 13, "W", 2)
  for _,p in ipairs({{18,28},{24,32},{30,28},{21,36},{27,36}}) do G.px(p[1]+dx, p[2]+b, "bu3"); G.px(p[1]+1+dx, p[2]+b, "bu3") end
  if wing == 0 then G.ellipse(14+dx, 28+b, 4, 9, "bu2"); G.ellipse(34+dx, 28+b, 4, 9, "bu2") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 14+hy, 9, 7, "bu1"); G.line(16+hx, 8+hy, 18+hx, 11+hy, "bu2"); G.line(32+hx, 8+hy, 30+hx, 11+hy, "bu2")
  for _,x in ipairs({20, 28}) do G.ellipse(x+hx, 14+hy, 3, 3, "Y"); if P.pain then G.px(x+hx, 14+hy, "K") else G.ellipse(x+hx, 14+hy, 1, 1, "K") end end
  G.line(24+hx, 16+hy, 24+hx, 19+hy, "y")
  G.line(20+dx, 41+b, 19+dx, 45, "y"); G.line(28+dx, 41+b, 29+dx, 45, "y")
  if P.dive then for i=0,4 do G.line(2+dx-i*2, 4+b+i*4, 8+dx-i*2, 8+b+i*4, "nv2") end end
  return G
end

-- =====================================================================================
-- Espíritu Congelado (48x48): figura de niebla helada con la cola deshilachada y ojos huecos
-- =====================================================================================
local function espiritu(P)
  local G = newGrid(48, 48, 47)
  local dx, b = P.dx or 0, (P.bob or 0) - 2
  local ph = P.phase or 0
  if P.dead then G.ellipse(24,44,12,3,"es3"); for i=0,6 do G.px(14 + i * 3, 42 - (i % 2), "es2") end; return G end
  for y=26,44 do local w = math.max(1, 10 - (y - 26) * 0.5); G.rect(22+dx+math.sin(y*0.4+ph)*3 - w, y+b, 22+dx+math.sin(y*0.4+ph)*3 + w, y+b, (y % 4 == 0) and "es3" or "es2") end
  G.ellipse(24+dx, 20+b, 11, 12, "es2"); G.ridge(24+dx, 20+b, 11, 12, "es1", 3)
  G.thick(14+dx, 22+b, 8+dx, 30+b, 3, "es2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if P.pain then G.line(24+hx, 16+hy, 26+hx, 18+hy, "es3"); G.line(31+hx, 16+hy, 33+hx, 18+hy, "es3")
  else G.ellipse(25+hx, 17+hy, 2, 3, "es3"); G.ellipse(32+hx, 17+hy, 2, 3, "es3") end
  G.ellipse(29+hx, 24+hy, 2, 3, "es3")
  if P.cast then
    G.thick(33+dx, 22+b, 42+dx, 18+b, 3, "es2")
    for i=0,5 do G.px(42+dx+i, 16+b-(i%2)*2, "ic1"); G.px(43+dx+i, 20+b+(i%2), "ic2") end
  end
  for _,p in ipairs({{6,10},{40,6},{4,34},{44,30}}) do G.px(p[1]+dx, p[2]+b+(ph%2), "es1") end
  return G
end

-- =====================================================================================
-- Elemental de Escarcha (48x48): esquirlas de hielo que giran alrededor de un núcleo azul
-- =====================================================================================
local function elemental(P)
  local G = newGrid(48, 48, 46)
  local dx, b = P.dx or 0, (P.bob or 0) - 2
  local ph = P.phase or 0
  if P.dead then for _,p in ipairs({{12,42},{20,44},{28,42},{36,44},{24,40}}) do G.line(p[1],p[2],p[1]+4,p[2]-2,"ic2") end; G.ellipse(24,42,3,2,"ic3"); return G end
  -- remolino de escarcha
  for i=0,11 do
    local a = i * 0.52 + ph * 0.6
    local r = 12 + (i % 3) * 3
    local x, y = 24 + dx + math.cos(a) * r, 26 + b + math.sin(a) * r * 0.8
    G.line(x, y, x + math.cos(a + 1.5) * 4, y + math.sin(a + 1.5) * 4, i % 2 == 0 and "ic2" or "ic3", 1)
    G.px(x, y, "ic1")
  end
  -- cuerpo de hielo
  for i=0,5 do local a = i * 1.05 + ph * 0.3; G.thick(24+dx, 26+b, 24+dx+math.cos(a)*9, 26+b+math.sin(a)*9, 3, "ic3") end
  G.ellipse(24+dx, 26+b, 7, 8, "ic2"); G.ridge(24+dx, 26+b, 7, 8, "ic1", 2)
  -- el núcleo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 25+hy, 3, 4, P.pain and "ic4" or "es1"); G.px(24+hx, 24+hy, "W")
  if P.cast then for i=0,5 do G.line(32+dx+i*2, 22+b, 36+dx+i*2, 22+b-((i%2)*2), "ic1") end end
  if P.shell then G.ring = nil; for a=0,350,20 do G.px(24+dx+math.cos(math.rad(a))*17, 26+b+math.sin(math.rad(a))*15, "ic1") end end
  return G
end

-- =====================================================================================
-- Cazador del Hielo (48x48): capucha de piel, abrigo, una trampa colgada y una lanza
-- =====================================================================================
local function cazador(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,14,3,"pe2"); G.ridge(22,41,14,3,"pe1",1); G.line(6,44,40,40,"w2"); G.ellipse(34,40,4,3,"pe1"); return G end
  G.thick(18+dx, 34+b, 16+dx, 44, 4, "w3"); G.thick(26+dx, 34+b, 28+dx, 44, 4, "w3")
  G.rect(14+dx, 20+b, 30+dx, 36+b, "pe2"); G.rect(14+dx, 20+b, 30+dx, 22+b, "pe1"); G.rect(14+dx, 34+b, 30+dx, 36+b, "pe1")
  for y=24,32,4 do G.px(18+dx, y+b, "pe3"); G.px(26+dx, y+b, "pe3") end
  -- la trampa colgada del cinturón
  G.ellipse(14+dx, 32+b, 3, 3, "m3"); G.px(13+dx, 31+b, "m1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(23+hx, 13+hy, 7, 7, "pe1"); G.ellipse(24+hx, 14+hy, 4, 4, "s2" and "T" or "T"); G.ellipse(24+hx, 15+hy, 3, 3, "T")
  eye(G, 25+hx, 14+hy, "K", P.pain); G.rect(22+hx, 17+hy, 27+hx, 18+hy, "pe3")
  if P.throw then
    G.thick(30+dx, 22+b, 40+dx, 18+b, 3, "pe2"); G.ellipse(43+dx, 18+b, 4, 3, "m2"); for x=40,46,2 do G.px(x+dx, 15+b, "m1"); G.px(x+dx, 21+b, "m1") end
  else
    G.thick(30+dx, 22+b, 34+dx, 30+b, 3, "pe2"); G.thick(36+dx, 4+b, 34+dx, 44, 2, "w2"); G.line(36+dx, 4+b, 38+dx, 0, "m1"); G.line(35+dx, 4+b, 34+dx, 0, "m1")
  end
  return G
end

-- =====================================================================================
-- Oso de las Nieves (48x48): oso blanco enorme; en el ataque se para en dos patas
-- =====================================================================================
local function oso(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 2, 46, 45)
  if P.dead then G.ellipse(22,40,19,5,"lb2"); G.ridge(22,40,19,5,"lb1",2); G.ellipse(40,40,5,4,"lb1"); G.px(43,39,"K"); return G end
  if P.rear then
    G.thick(20+dx, 34+b, 18+dx, 44, 5, "lb3"); G.thick(30+dx, 34+b, 32+dx, 44, 5, "lb3")
    G.ellipse(25+dx, 26+b, 11, 14, "lb2"); G.ridge(25+dx, 26+b, 11, 14, "lb1", 2)
    G.thick(32+dx, 18+b, 42+dx, 10+b, 5, "lb2"); for i=0,2 do G.line(42+dx+i, 8+b, 45+dx+i, 5+b, "K") end
    G.ellipse(27+dx, 8+b, 7, 6, "lb1"); eye(G, 29+dx, 6+b, "K", P.pain); G.rect(31+dx, 9+b, 34+dx, 11+b, "r")
    return G
  end
  legs(G, {10, 17, 30, 37}, 32+b, 44, "lb3", "K", P.phase)
  G.ellipse(23+dx, 28+b, 18, 11, "lb2"); G.ridge(23+dx, 28+b, 18, 11, "lb1", 3); G.ellipse(14+dx, 22+b, 7, 5, "lb1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(39+hx, 25+hy, 7, 6, "lb1"); G.ellipse(44+hx, 27+hy, 3, 2, "lb2"); G.px(46+hx, 27+hy, "K")
  G.ellipse(36+hx, 19+hy, 2, 2, "lb2"); eye(G, 41+hx, 23+hy, "K", P.pain)
  if P.swipe then for i=0,2 do G.line(44+dx, 14+b+i*4, 47+dx, 22+b+i*4, "W") end end
  return G
end

-- =====================================================================================
-- Gigante de Nieve (56x56): piel azul, barba de carámbanos, taparrabo de pieles
-- =====================================================================================
local function gigante(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 4, 52, 53)
  if P.dead then G.ellipse(28,48,22,5,"gi2"); G.ridge(28,48,22,5,"gi1",2); G.ellipse(46,47,6,4,"gi1"); for x=40,50,3 do G.line(x,50,x,53,"ic2") end; return G end
  G.thick(20+dx, 40+b, 18+dx, 52, 6, "gi3"); G.thick(34+dx, 40+b, 36+dx, 52, 6, "gi3")
  G.rect(16+dx, 34+b, 40+dx, 42+b, "pe2"); for x=16,40,4 do G.line(x+dx, 42+b, x+1+dx, 45+b, "pe3") end
  G.ellipse(28+dx, 26+b, 14, 13, "gi2"); G.ridge(28+dx, 26+b, 14, 13, "gi1", 3)
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 10+hy, 8, 8, "gi1"); G.ellipse(31+hx, 6+hy, 8, 3, "nv1")
  eye(G, 34+hx, 9+hy, "ic1", P.pain); eye(G, 29+hx, 9+hy, "ic1", P.pain)
  for x=25,37,3 do G.line(x+hx, 14+hy, x+hx, 22+hy, "ic2"); G.px(x+hx, 22+hy, "ic1") end
  G.thick(15+dx, 22+b, 8+dx, 38+b, 6, "gi2"); G.ellipse(8+dx, 40+b, 4, 4, "gi1")
  if P.slam then
    G.thick(41+dx, 20+b, 50+dx, 8+b, 6, "gi2"); G.ellipse(50+dx, 6+b, 5, 5, "gi1")
    for _,p in ipairs({{44,46},{50,44},{40,50}}) do G.ellipse(p[1], p[2], 3, 2, "nv1") end
  else
    G.thick(41+dx, 22+b, 46+dx, 38+b, 6, "gi2"); G.ellipse(46+dx, 40+b, 4, 4, "gi1")
  end
  if P.cast then for i=0,6 do G.ellipse(36+dx+i*3, 2+b+i*2, 3, 2, i % 2 == 0 and "nv1" or "nv2") end end
  return G
end

-- =====================================================================================
-- Cultista del Eclipse Helado (48x48): túnica azul oscuro con escarcha, máscara de hielo, báculo
-- =====================================================================================
local function cultista(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 8, 40, 45)
  if P.dead then G.ellipse(22,41,14,3,"rb2"); G.ridge(22,41,14,3,"rb1",1); G.ellipse(34,40,4,3,"ic2"); G.px(30,40,"ec2"); return G end
  for y=20,44 do local half = math.floor(6 + (y - 20) * 0.35); G.rect(22+dx-half, y+b, 22+dx+half, y+b, (y % 6 == 0) and "rb3" or "rb2") end
  G.rect(13+dx, 42+b, 31+dx, 44, "nv2")
  G.ellipse(22+dx, 30+b, 4, 4, "ec2"); G.ellipse(23+dx, 29+b, 3, 3, "rb2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(23+hx, 13+hy, 7, 8, "rb3"); G.ellipse(25+hx, 14+hy, 4, 5, "ic2"); G.ridge(25+hx, 14+hy, 4, 5, "ic1", 1)
  if P.pain then G.px(26+hx, 13+hy, "K") else G.rect(26+hx, 12+hy, 27+hx, 13+hy, "ec1") end
  if P.cast then
    G.thick(28+dx, 24+b, 36+dx, 16+b, 3, "rb2"); G.thick(38+dx, 4+b, 36+dx, 44, 2, "w3")
    G.ellipse(38+dx, 4+b, 4, 4, "ec2"); G.ellipse(38+dx, 4+b, 2, 2, "ec1")
    for _,p in ipairs({{44,2},{46,8},{42,12}}) do G.px(p[1]+dx, p[2]+b, "ec1") end
  else
    G.thick(28+dx, 24+b, 34+dx, 30+b, 3, "rb2"); G.thick(36+dx, 8+b, 35+dx, 44, 2, "w3"); G.ellipse(36+dx, 7+b, 3, 3, "ec2")
  end
  return G
end

-- =====================================================================================
-- Caballero de Escarcha (48x48): armadura cubierta de hielo, yelmo con cuernos, espada congelada
-- =====================================================================================
local function caballero(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,15,3,"ar2"); G.ridge(22,41,15,3,"ar1",1); G.line(4,44,40,40,"ic2"); G.ellipse(34,40,5,3,"ar1"); return G end
  G.thick(18+dx, 34+b, 17+dx, 44, 5, "ar3"); G.thick(27+dx, 34+b, 28+dx, 44, 5, "ar3")
  G.rect(14+dx, 18+b, 31+dx, 35+b, "ar2"); G.rect(14+dx, 18+b, 31+dx, 20+b, "ar1"); G.rect(21+dx, 20+b, 23+dx, 35+b, "ar3")
  for _,p in ipairs({{16,24},{28,22},{18,32}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "ic2") end
  G.rect(12+dx, 16+b, 17+dx, 21+b, "ar1"); G.rect(28+dx, 16+b, 33+dx, 21+b, "ar1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(17+hx, 5+hy, 29+hx, 16+hy, "ar2"); G.rect(17+hx, 5+hy, 29+hx, 7+hy, "ar1"); G.rect(23+hx, 10+hy, 29+hx, 11+hy, "K")
  if not P.pain then G.px(25+hx, 10+hy, "es2"); G.px(28+hx, 10+hy, "es2") end
  G.line(17+hx, 6+hy, 13+hx, 1+hy, "ic2"); G.line(29+hx, 6+hy, 33+hx, 1+hy, "ic2")
  G.ellipse(12+dx, 28+b, 6, 8, "ar3"); G.ellipse(12+dx, 28+b, 4, 6, "ar2"); G.px(12+dx, 28+b, "ic1")
  if P.swing then
    G.thick(32+dx, 22+b, 38+dx, 14+b, 3, "ar2"); G.thick(38+dx, 14+b, 47, 2+b, 3, "ic2"); G.line(39+dx, 13+b, 47, 2+b, "ic1")
  else
    G.thick(32+dx, 22+b, 35+dx, 30+b, 3, "ar2"); G.thick(36+dx, 30+b, 42+dx, 44, 3, "ic2"); G.line(36+dx, 30+b, 41+dx, 43, "ic1"); G.rect(33+dx, 28+b, 39+dx, 30+b, "ar3")
  end
  if P.shell then for _,p in ipairs({{6,10},{40,8},{24,0},{4,30},{44,32}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "ic1") end end
  return G
end

-- =====================================================================================
-- Sierpe Glacial (56x56): serpiente transparente de hielo, enroscada, con aletas como carámbanos
-- =====================================================================================
local function sierpe(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  snowGround(G, 2, 54, 53)
  if P.dead then G.ellipse(28,49,22,3,"ic3"); G.ridge(28,49,22,3,"ic2",1); G.ellipse(46,48,6,3,"ic2"); G.px(48,46,"K"); return G end
  -- el cuerpo enroscado
  G.ellipse(22+dx, 46+b, 18, 6, "ic3"); G.ridge(22+dx, 46+b, 18, 6, "ic2", 3)
  local lunge = P.lunge and 5 or 0
  for i=0,30 do
    local t = i / 30
    local x = 26 + dx + math.sin(t * 3 + ph * 0.5) * 4 + t * (10 + lunge)
    local y = 46 + b - t * 30
    G.ellipse(x, y, 5 - t * 1.5, 4, "ic3"); G.px(x - 2, y - 3, "ic1"); G.px(x + 2, y + 1, "ic2")
  end
  for i=0,4 do G.line(26+dx+i*2, 36+b-i*5, 22+dx+i*2, 32+b-i*5, "ic1") end
  local hx, hy = dx + lunge + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(42+hx, 14+hy, 8, 5, "ic3"); G.ridge(42+hx, 14+hy, 8, 5, "ic1", 2)
  G.line(37+hx, 10+hy, 32+hx, 4+hy, "ic2"); G.line(40+hx, 9+hy, 38+hx, 2+hy, "ic2")
  eye(G, 45+hx, 12+hy, "es1", P.pain)
  if P.bite or P.cast then
    G.rect(46+hx, 16+hy, 53+hx, 19+hy, "ic4"); for x=47,53,2 do G.px(x+hx, 16+hy, "W"); G.px(x+hx, 19+hy, "W") end
    if P.cast then for i=0,5 do G.ellipse(54+hx-(i%2), 18+hy+i*3, 2, 2, i < 3 and "ic1" or "nv1") end end
  else G.line(46+hx, 17+hy, 52+hx, 17+hy, "ic4") end
  return G
end

-- =====================================================================================
-- Mamut Lanudo (56x56): pelo largo marrón, colmillos curvos enormes, trompa
-- =====================================================================================
local function mamut(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 2, 54, 53)
  if P.dead then G.ellipse(26,47,22,6,"ma2"); G.ridge(26,47,22,6,"ma1",2); G.line(40,46,52,40,"T"); return G end
  legs(G, {12, 20, 32, 40}, 38+b, 52, "ma3", "ma3", P.phase)
  G.ellipse(26+dx, 28+b, 21, 15, "ma2"); G.ridge(26+dx, 28+b, 21, 15, "ma1", 3)
  for x=8,44,3 do G.line(x+dx, 38+b, x+dx+1, 44+b, "ma3") end
  G.ellipse(18+dx, 14+b, 9, 6, "ma2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(42+hx, 22+hy, 9, 9, "ma2"); G.ridge(42+hx, 22+hy, 9, 9, "ma1", 2)
  eye(G, 44+hx, 19+hy, "K", P.pain)
  -- trompa y colmillos
  G.thick(47+hx, 26+hy, 50+hx, 44+hy, 3, "ma2"); G.px(50+hx, 45+hy, "ma3")
  for i=0,12 do local a = i / 12; G.px(44+hx + a * 10, 30+hy + math.sin(a * 2.5) * 6, "T"); G.px(44+hx + a * 10, 31+hy + math.sin(a * 2.5) * 6, "t") end
  G.ellipse(30+dx, 14+b, 9, 3, "nv1")
  if P.stomp then for _,p in ipairs({{6,50},{16,52},{48,50},{40,52}}) do G.ellipse(p[1], p[2], 4, 2, "nv1") end end
  return G
end

-- =====================================================================================
-- Lobo de la Aurora (56x56): un lobo hecho de luz verde y morada, con estrellas en el pelo
-- =====================================================================================
local function loboAurora(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  if P.dead then for i=0,10 do G.px(10 + i * 3, 50 - (i % 3), i % 2 == 0 and "au1" or "au2") end; G.ellipse(28,51,14,2,"au3"); return G end
  legs(G, {14, 20, 34, 40}, 38+b, 52, "au3", "au1", ph)
  for i=0,12 do G.px(4+dx+i*0.5, 30+b-i+math.sin(i+ph)*2, i % 2 == 0 and "au2" or "au1"); G.px(5+dx+i*0.5, 31+b-i+math.sin(i+ph)*2, "au3") end
  G.ellipse(27+dx, 33+b, 15, 9, "au3"); G.ridge(27+dx, 33+b, 15, 9, "au1", 3); G.ellipse(35+dx, 31+b, 6, 6, "au1")
  for x=16,32,5 do G.line(x+dx, 26+b, x+dx-2, 34+b, "au2") end
  for _,p in ipairs({{18,30},{26,28},{32,36},{22,36}}) do G.px(p[1]+dx, p[2]+b, "W") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(44+hx, 24+hy, 7, 6, "au1"); G.rect(47+hx, 24+hy, 54+hx, 27+hy, "au3"); G.px(54+hx, 24+hy, "K")
  G.line(41+hx, 19+hy, 40+hx, 12+hy, "au2"); G.line(45+hx, 18+hy, 45+hx, 11+hy, "au2")
  eye(G, 47+hx, 22+hy, "W", P.pain)
  if P.bite then G.rect(48+hx, 27+hy, 54+hx, 29+hy, "au2"); for x=48,54,2 do G.px(x+hx, 27+hy, "W") end end
  if P.cast then for i=0,3 do G.ellipse(44+hx, 10+hy-i*3, 4+i*2, 2, i % 2 == 0 and "au1" or "au2") end end
  return G
end

-- =====================================================================================
-- Bruja Congelada (56x56): Hela, pelo blanco, corona de hielo, vestido azul, báculo con un cristal
-- =====================================================================================
local function bruja(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 8, 48, 53)
  if P.dead then G.ellipse(26,49,16,3,"rb2"); G.ridge(26,49,16,3,"rb1",1); G.thick(38,47,46,46,3,"lb1"); G.line(6,52,30,50,"w3"); return G end
  -- vestido largo
  for y=24,52 do local half = math.floor(5 + (y - 24) * 0.42); G.rect(26+dx-half, y+b, 26+dx+half, y+b, (y % 7 == 0) and "rb3" or "rb2") end
  for x=14,38,4 do G.line(x+dx, 50+b, x+2+dx, 52, "ic2") end
  G.rect(22+dx, 24+b, 30+dx, 34+b, "rb1"); G.ellipse(26+dx, 30+b, 2, 2, "ec2")
  -- el pelo blanco, largo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(22+hx, 12+hy, 18+hx, 36+hy, 5, "lb1"); G.line(18+hx, 36+hy, 16+hx, 40+hy, "lb2")
  G.ellipse(28+hx, 16+hy, 6, 7, "nv1"); G.ridge(28+hx, 16+hy, 6, 7, "lb1", 3); G.rect(22+hx, 12+hy, 25+hx, 22+hy, "lb1")
  eye(G, 31+hx, 16+hy, "es2", P.pain); G.px(31+hx, 19+hy, "nv3")
  -- corona de hielo
  for _,x in ipairs({24, 28, 32}) do G.line(x+hx, 9+hy, x+hx, 4+hy - (x == 28 and 2 or 0), "ic2"); G.px(x+hx, 3+hy - (x == 28 and 2 or 0), "ic1") end
  G.rect(23+hx, 9+hy, 33+hx, 10+hy, "ic3")
  if P.cast then
    G.thick(31+dx, 26+b, 40+dx, 18+b, 3, "nv1"); G.thick(42+dx, 4+b, 40+dx, 52, 2, "ic3")
    G.ellipse(42+dx, 4+b, 4, 5, "ic2"); G.ellipse(42+dx, 4+b, 2, 3, "es1")
    for i=0,5 do G.ellipse(48+dx-(i%2)*2, 6+b+i*4, 2, 2, i % 2 == 0 and "ic1" or "nv1") end
  else
    G.thick(31+dx, 26+b, 36+dx, 34+b, 3, "nv1"); G.thick(38+dx, 8+b, 37+dx, 52, 2, "ic3"); G.ellipse(38+dx, 7+b, 3, 4, "ic2")
  end
  return G
end

-- =====================================================================================
-- Guardián del Hielo (64x64): gigante de hielo antiguo con un martillo de glaciar y un cristal clavado
-- =====================================================================================
local function guardian(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 2, 62, 61)
  if P.dead then
    for _,r in ipairs({{14,56,8,5},{30,57,10,5},{48,56,8,5},{24,50,6,4}}) do G.ellipse(r[1],r[2],r[3],r[4],"ic3"); G.px(r[1]-2,r[2]-2,"ic1") end
    G.ellipse(38,52,3,3,"ec2"); G.thick(44,58,62,52,4,"ic2"); return G
  end
  G.thick(22+dx, 44+b, 20+dx, 60, 7, "ic3"); G.thick(38+dx, 44+b, 40+dx, 60, 7, "ic3")
  G.ellipse(30+dx, 32+b, 17, 16, "ic3"); G.ridge(30+dx, 32+b, 17, 16, "ic2", 4)
  for _,p in ipairs({{22,30},{34,24},{28,40},{38,36}}) do G.line(p[1]+dx, p[2]+b, p[1]+4+dx, p[2]+3+b, "ic4") end
  -- el cristal de eclipse en el pecho
  G.ellipse(32+dx, 30+b, 3, 4, "ec2"); G.ellipse(32+dx, 30+b, 1.5, 2, "ec1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(34+hx, 12+hy, 9, 8, "ic2"); G.ridge(34+hx, 12+hy, 9, 8, "ic1", 2)
  for _,x in ipairs({28, 34, 40}) do G.line(x+hx, 5+hy, x+hx+(x-34)/3, 0+hy, "ic1") end
  eye(G, 37+hx, 11+hy, "es1", P.pain); eye(G, 31+hx, 11+hy, "es1", P.pain)
  G.thick(14+dx, 24+b, 6+dx, 42+b, 7, "ic2"); G.ellipse(6+dx, 44+b, 5, 5, "ic3")
  if P.slam then
    G.thick(46+dx, 22+b, 54+dx, 8+b, 7, "ic2"); G.thick(54+dx, 8+b, 54+dx, 2+b, 3, "w3")
    G.rect(44+dx, 0+b, 63, 8+b, "ic3"); G.rect(44+dx, 0+b, 63, 2+b, "ic1")
    for _,p in ipairs({{48,54},{56,52},{42,58}}) do G.ellipse(p[1], p[2], 3, 2, "ic1") end
  else
    G.thick(46+dx, 24+b, 52+dx, 40+b, 7, "ic2"); G.thick(54+dx, 20+b, 54+dx, 60, 3, "w3")
    G.rect(48+dx, 14+b, 62, 24+b, "ic3"); G.rect(48+dx, 14+b, 62, 16+b, "ic1")
  end
  if P.shell then for a=0,350,15 do G.px(30+dx+math.cos(math.rad(a))*26, 32+b+math.sin(math.rad(a))*24, "ic1") end end
  return G
end

-- =====================================================================================
-- Rey del Hielo (64x64): viejo y enorme, barba blanca, corona de hielo, manto azul real y su cetro
-- =====================================================================================
local function rey(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 4, 60, 61)
  if P.dead then
    G.ellipse(30,56,22,5,"rb2"); G.ridge(30,56,22,5,"rb1",2); G.ellipse(36,48,8,7,"lb1")
    G.rect(10,56,20,58,"ic3"); for _,x in ipairs({11,15,19}) do G.line(x,56,x,53,"ic2") end; G.thick(42,58,60,54,3,"go2"); return G
  end
  -- manto largo
  for y=24,60 do local half = math.floor(10 + (y - 24) * 0.42); G.rect(32+dx-half, y+b, 32+dx+half, y+b, (y % 8 == 0) and "rb3" or "rb2") end
  for x=14,50,4 do G.line(x+dx, 58+b, x+2+dx, 61, "ic2") end
  G.rect(26+dx, 24+b, 38+dx, 40+b, "rb1"); G.rect(26+dx, 24+b, 38+dx, 26+b, "go2")
  -- la barba
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(34+hx, 14+hy, 8, 8, "nv1"); G.ridge(34+hx, 14+hy, 8, 8, "lb1", 2)
  for y=18,34 do local w = math.max(1, 7 - (y - 18) * 0.4); G.rect(34+hx-w, y+hy, 34+hx+w, y+hy, (y % 3 == 0) and "lb2" or "lb1") end
  eye(G, 37+hx, 13+hy, "es2", P.pain); eye(G, 31+hx, 13+hy, "es2", P.pain); G.rect(30+hx, 10+hy, 39+hx, 10+hy, "lb3")
  -- corona de hielo
  G.rect(26+hx, 5+hy, 42+hx, 7+hy, "ic3")
  for _,x in ipairs({27, 31, 34, 37, 41}) do G.line(x+hx, 5+hy, x+hx, 0+hy - (x == 34 and 0 or 0), "ic2"); G.px(x+hx, 0+hy, "ic1") end
  G.ellipse(34+hx, 6+hy, 2, 2, "es1")
  -- el cetro
  if P.cast then
    G.thick(40+dx, 28+b, 50+dx, 18+b, 4, "rb2"); G.thick(52+dx, 2+b, 50+dx, 60, 2, "go2")
    G.ellipse(52+dx, 4+b, 5, 5, "ic2"); G.ellipse(52+dx, 4+b, 3, 3, "es1")
    for i=0,6 do G.ellipse(58+dx-(i%2)*3, 6+b+i*5, 2, 2, i % 2 == 0 and "ic1" or "nv1") end
  else
    G.thick(40+dx, 28+b, 46+dx, 38+b, 4, "rb2"); G.thick(48+dx, 8+b, 47+dx, 60, 2, "go2"); G.ellipse(48+dx, 8+b, 4, 4, "ic2"); G.px(48+dx, 8+b, "es1")
  end
  G.thick(24+dx, 28+b, 18+dx, 42+b, 4, "rb2"); G.ellipse(18+dx, 44+b, 3, 3, "nv1")
  if P.shell then for a=0,350,15 do G.px(32+dx+math.cos(math.rad(a))*28, 32+b+math.sin(math.rad(a))*26, "ic1") end end
  return G
end

-- =====================================================================================
-- =====================================================================================
-- La Cripta Congelada (mazmorra, gprback/lib/cripta_congelada.js)
-- =====================================================================================
-- Doncella de Hielo (48x48): dama de compañía de la reina, fantasma de vestido blanco con una lanza de hielo
local function doncella(P)
  local G = newGrid(48, 48, 46)
  local dx, b = P.dx or 0, (P.bob or 0) - 1
  local ph = P.phase or 0
  if P.dead then G.ellipse(22,44,13,3,"es3"); G.ridge(22,44,13,3,"nv2",1); G.line(30,44,44,40,"ic2"); for i=0,4 do G.px(12 + i * 4, 42 - (i % 2), "es1") end; return G end
  -- vestido largo que se deshace abajo
  for y=20,44 do local half = math.floor(4 + (y - 20) * 0.38); local sway = math.floor(math.sin(y * 0.3 + ph) * 1.5)
    G.rect(22+dx-half+sway, y+b, 22+dx+half+sway, y+b, (y % 6 == 0) and "nv2" or "nv1") end
  for x=14,30,4 do G.px(x+dx, 45+b, "es2") end
  G.rect(19+dx, 20+b, 25+dx, 28+b, "nv2"); G.px(22+dx, 24+b, "es2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(18+hx, 10+hy, 16+hx, 26+hy, 3, "es1")
  G.ellipse(23+hx, 13+hy, 5, 6, "nv1"); G.ridge(23+hx, 13+hy, 5, 6, "W", 2)
  if P.pain then G.px(25+hx, 13+hy, "K") else G.px(25+hx, 12+hy, "es3"); G.px(25+hx, 13+hy, "es3") end
  G.rect(19+hx, 6+hy, 27+hx, 7+hy, "ic2"); G.px(21+hx, 5+hy, "ic1"); G.px(25+hx, 5+hy, "ic1")
  if P.cast then
    G.thick(26+dx, 22+b, 34+dx, 16+b, 2, "nv1"); G.thick(30+dx, 26+b, 46, 8+b, 2, "ic2"); G.line(31+dx, 25+b, 46, 8+b, "ic1")
    for i=0,3 do G.px(40+dx+i*2, 14+b-i*2, "es1") end
  else
    G.thick(26+dx, 22+b, 30+dx, 30+b, 2, "nv1"); G.thick(32+dx, 4+b, 32+dx, 44+b, 2, "ic3"); G.line(32+dx, 2+b, 32+dx, 6+b, "ic1"); G.px(31+dx, 3+b, "ic1")
  end
  return G
end

-- Gárgola Glacial (48x48): gárgola de piedra con hielo en las grietas, alas abiertas
local function gargola(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    for _,r in ipairs({{14,42,6,3},{26,43,8,3},{36,41,5,3}}) do G.ellipse(r[1],r[2],r[3],r[4],"m2"); G.px(r[1]-1,r[2]-1,"ic1") end
    G.line(8,44,18,40,"m3"); return G
  end
  local wing = P.wing or 0
  if wing == 1 then
    G.thick(14+dx, 18+b, 1+dx, 6+b, 4, "m3"); G.thick(30+dx, 18+b, 46+dx, 4+b, 4, "m3")
    for x=3,12,3 do G.line(x+dx, 8+b+(12-x)/2, x+dx, 14+b+(12-x)/2, "m2") end
  else
    G.thick(14+dx, 16+b, 6+dx, 4+b, 4, "m3"); G.thick(30+dx, 16+b, 38+dx, 4+b, 4, "m3")
  end
  G.ellipse(22+dx, 26+b, 9, 10, "m2"); G.ridge(22+dx, 26+b, 9, 10, "m1", 2)
  G.line(18+dx, 20+b, 24+dx, 30+b, "ic2"); G.line(24+dx, 30+b, 20+dx, 34+b, "ic2"); G.px(19+dx, 22+b, "ic1")
  G.thick(16+dx, 34+b, 14+dx, 44, 3, "m3"); G.thick(28+dx, 34+b, 30+dx, 44, 3, "m3")
  G.line(12+dx, 44, 18+dx, 44, "m3"); G.line(26+dx, 44, 32+dx, 44, "m3")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(30+hx, 15+hy, 6, 5, "m2"); G.ridge(30+hx, 15+hy, 6, 5, "m1", 1)
  G.line(26+hx, 11+hy, 24+hx, 5+hy, "m3"); G.line(30+hx, 10+hy, 30+hx, 4+hy, "m3")
  eye(G, 32+hx, 14+hy, "es1", P.pain); G.rect(33+hx, 17+hy, 37+hx, 18+hy, "K")
  if P.dive then for i=0,4 do G.line(2+dx-i*2, 4+b+i*4, 8+dx-i*2, 8+b+i*4, "nv2") end end
  if P.cast then for i=0,5 do G.ellipse(38+dx+i, 22+b+i*3, 2, 2, i % 2 == 0 and "nv1" or "ic2") end end
  return G
end

-- Escolta de la Reina (48x48): caballero muerto en armadura real con capa azul, escudo con la corona
local function escolta(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  snowGround(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,15,3,"rb2"); G.ridge(22,41,15,3,"ar1",1); G.ellipse(12,40,6,3,"ar2"); G.line(24,44,44,40,"ic2"); return G end
  -- capa azul real
  G.rect(12+dx, 18+b, 31+dx, 40+b, "rb2"); G.rect(12+dx, 18+b, 14+dx, 40+b, "rb3")
  G.thick(18+dx, 34+b, 17+dx, 44, 5, "ar3"); G.thick(27+dx, 34+b, 28+dx, 44, 5, "ar3")
  G.rect(15+dx, 18+b, 30+dx, 35+b, "ar2"); G.rect(15+dx, 18+b, 30+dx, 20+b, "ar1"); G.rect(21+dx, 20+b, 23+dx, 35+b, "go2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(17+hx, 5+hy, 29+hx, 16+hy, "ar2"); G.rect(17+hx, 5+hy, 29+hx, 7+hy, "ar1"); G.rect(23+hx, 10+hy, 29+hx, 11+hy, "K")
  if not P.pain then G.px(25+hx, 10+hy, "es1"); G.px(28+hx, 10+hy, "es1") end
  G.rect(21+hx, 2+hy, 25+hx, 5+hy, "rb1"); G.line(23+hx, 0+hy, 23+hx, 2+hy, "rb1")
  -- escudo con la corona
  G.ellipse(11+dx, 28+b, 7, 9, "rb3"); G.ellipse(11+dx, 28+b, 5, 7, "rb1")
  G.rect(8+dx, 27+b, 14+dx, 28+b, "go1"); G.px(8+dx, 26+b, "go1"); G.px(11+dx, 25+b, "go1"); G.px(14+dx, 26+b, "go1")
  if P.swing then
    G.thick(32+dx, 22+b, 38+dx, 14+b, 3, "ar2"); G.thick(38+dx, 14+b, 47, 2+b, 3, "ar1"); G.line(39+dx, 13+b, 47, 2+b, "ic1")
  else
    G.thick(32+dx, 22+b, 35+dx, 30+b, 3, "ar2"); G.thick(36+dx, 30+b, 42+dx, 44, 3, "ar1"); G.line(36+dx, 30+b, 41+dx, 43, "ic2"); G.rect(33+dx, 28+b, 39+dx, 30+b, "go2")
  end
  if P.shell then for a=0,350,20 do G.px(22+dx+math.cos(math.rad(a))*20, 26+b+math.sin(math.rad(a))*18, "ic1") end end
  return G
end

-- Escarcha, la Sierpe de la Reina (64x64): sierpe de hielo blanco con corona de cuernos y un cristal en la frente
local function escarcha(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  snowGround(G, 2, 62, 61)
  if P.dead then
    G.ellipse(30,56,24,4,"ic3"); G.ridge(30,56,24,4,"nv1",2); G.ellipse(52,54,8,4,"nv1"); G.px(55,52,"K")
    G.ellipse(46,50,2,2,"ec2"); return G
  end
  -- el cuerpo enroscado
  G.ellipse(24+dx, 54+b, 20, 6, "ic3"); G.ridge(24+dx, 54+b, 20, 6, "nv1", 3)
  G.ellipse(18+dx, 48+b, 12, 5, "ic2"); G.ridge(18+dx, 48+b, 12, 5, "nv1", 2)
  local lunge = P.lunge and 6 or 0
  for i=0,34 do
    local t = i / 34
    local x = 28 + dx + math.sin(t * 3 + ph * 0.5) * 5 + t * (12 + lunge)
    local y = 52 + b - t * 34
    G.ellipse(x, y, 6 - t * 2, 5, "nv2"); G.px(x - 3, y - 3, "nv1"); G.px(x + 2, y + 1, "ic2")
  end
  -- aletas de hielo en la espalda
  for i=0,5 do G.line(26+dx+i*2, 44+b-i*6, 20+dx+i*2, 40+b-i*6, "ic1"); G.px(20+dx+i*2, 40+b-i*6, "W") end
  local hx, hy = dx + lunge + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(48+hx, 15+hy, 10, 6, "nv2"); G.ridge(48+hx, 15+hy, 10, 6, "nv1", 2)
  -- corona de cuernos y el cristal de eclipse en la frente
  for _,c in ipairs({{42,10,38,1},{46,9,45,0},{50,9,52,1}}) do G.thick(c[1]+hx, c[2]+hy, c[3]+hx, c[4]+hy, 2, "ic2"); G.px(c[3]+hx, c[4]+hy, "ic1") end
  G.ellipse(47+hx, 11+hy, 2, 2, "ec2"); G.px(47+hx, 10+hy, "ec1")
  eye(G, 52+hx, 13+hy, "es1", P.pain)
  if P.bite or P.cast then
    G.rect(54+hx, 17+hy, 63, 21+hy, "ic4"); for x=55,63,2 do G.px(x+hx, 17+hy, "W"); G.px(x+hx, 21+hy, "W") end
    if P.cast then for i=0,6 do G.ellipse(62-(i%2)*2, 22+hy+i*4, 2+(i%3), 2, i < 3 and "es1" or "nv1") end end
  else G.line(54+hx, 18+hy, 62+hx, 18+hy, "ic4") end
  if P.shell then for a=0,350,15 do G.px(32+dx+math.cos(math.rad(a))*28, 34+b+math.sin(math.rad(a))*26, "ic1") end end
  return G
end


local A_BEAST = function(extra)
  return {
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=0,hx=-2,dur=200},{dx=3,phase=1,dur=150,[extra]=true},{dx=1,dur=220,[extra]=true}}},
    {"cast",   {{bob=-1,dur=200},{cast=true,phase=1,dur=320},{cast=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }
end
local MONSTERS = {
  {key="foca_colmillo", size=48, draw=foca, anims=A_BEAST("splash")},
  {key="jabali_helado", size=48, draw=jabali, anims=A_BEAST("charge")},
  {key="lobo_hielo", size=48, draw=loboHielo, anims=A_BEAST("bite")},
  {key="buho_niveo", size=48, draw=buho, anims={
    {"idle",   {{bob=0,wing=0,dur=360},{bob=-1,wing=0,dur=360}}},
    {"attack", {{bob=-3,wing=1,dur=180},{dx=4,dive=true,wing=1,dur=150},{dx=1,wing=0,dur=220}}},
    {"cast",   {{bob=-1,wing=1,dur=200},{dive=true,wing=1,dur=300},{wing=0,dur=220}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=2,wing=0,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="espiritu_congelado", size=48, draw=espiritu, anims={
    {"idle",   {{bob=0,phase=0,dur=340},{bob=-2,phase=1,dur=340}}},
    {"attack", {{bob=-2,phase=1,dur=200},{dx=3,cast=true,phase=0,dur=200},{dx=1,phase=1,dur=200}}},
    {"cast",   {{bob=-2,phase=1,dur=180},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="elemental_escarcha", size=48, draw=elemental, anims={
    {"idle",   {{bob=0,phase=0,dur=300},{bob=-1,phase=1,dur=300}}},
    {"attack", {{bob=-1,phase=1,dur=200},{dx=2,cast=true,phase=2,dur=200},{dx=1,phase=3,dur=200}}},
    {"cast",   {{bob=-1,phase=1,dur=200},{shell=true,phase=2,dur=300},{shell=true,phase=3,dur=220}}},
    {"hurt",   {{dx=-2,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="cazador_hielo", size=48, draw=cazador, anims={
    {"idle",   {{bob=0,dur=420},{bob=1,dur=420}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=2,throw=true,dur=170},{dx=1,throw=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="oso_nieves", size=48, draw=oso, anims={
    {"idle",   {{bob=0,phase=0,dur=480},{bob=1,phase=1,dur=480}}},
    {"attack", {{rear=true,dur=260},{rear=true,dx=3,dur=160},{dx=2,swipe=true,dur=240}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1100}}},
  }},
  {key="gigante_nieve", size=56, draw=gigante, anims={
    {"idle",   {{bob=0,dur=540},{bob=1,dur=540}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,slam=true,dur=170},{dx=1,slam=true,dur=300}}},
    {"cast",   {{bob=-1,dur=220},{cast=true,slam=true,dur=320},{cast=true,dur=240}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="cultista_helado", size=48, draw=cultista, anims={
    {"idle",   {{bob=0,dur=480},{bob=1,dur=480}}},
    {"attack", {{bob=-1,dur=200},{dx=2,cast=true,dur=240},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,dur=200},{cast=true,dur=320},{cast=true,bob=-1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="caballero_escarcha", size=48, draw=caballero, anims={
    {"idle",   {{bob=0,dur=500},{bob=1,dur=500}}},
    {"attack", {{bob=1,hx=-1,dur=220},{dx=3,swing=true,dur=170},{dx=1,swing=true,dur=240}}},
    {"cast",   {{bob=-1,dur=200},{shell=true,dur=320},{shell=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="sierpe_glacial", size=56, draw=sierpe, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=-1,hx=-2,dur=220},{dx=2,lunge=true,bite=true,phase=1,dur=150},{dx=1,dur=240}}},
    {"cast",   {{bob=-1,hx=-1,dur=220},{cast=true,phase=0,dur=340},{cast=true,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,hy=-2,pain=true,dur=280}}},
    {"die",    {{bob=3,pain=true,dur=260},{dead=true,dur=1200}}},
  }},
  {key="mamut_lanudo", size=56, draw=mamut, anims={
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-1,hx=-2,dur=260},{dx=4,phase=1,dur=170},{dx=1,phase=0,dur=260}}},
    {"cast",   {{bob=-3,dur=260},{stomp=true,dur=300},{stomp=true,bob=1,dur=240}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="lobo_aurora", size=56, draw=loboAurora, anims={
    {"idle",   {{bob=0,phase=0,dur=380},{bob=-1,phase=1,dur=380}}},
    {"attack", {{bob=0,hx=-2,dur=200},{dx=3,bite=true,phase=1,dur=150},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,hy=-2,dur=220},{cast=true,phase=0,dur=340},{cast=true,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="bruja_congelada", size=56, draw=bruja, anims={
    {"idle",   {{bob=0,dur=460},{bob=1,dur=460}}},
    {"attack", {{bob=-1,dur=220},{dx=2,cast=true,dur=240},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,dur=200},{cast=true,dur=320},{cast=true,bob=-1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1200}}},
  }},
  {key="guardian_hielo", size=64, draw=guardian, anims={
    {"idle",   {{bob=0,dur=560},{bob=1,dur=560}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=3,slam=true,dur=180},{dx=1,slam=true,dur=300}}},
    {"cast",   {{bob=-1,dur=220},{shell=true,dur=340},{shell=true,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }},
  {key="rey_hielo", size=64, draw=rey, anims={
    {"idle",   {{bob=0,dur=600},{bob=1,dur=600}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,cast=true,dur=200},{dx=1,dur=300}}},
    {"cast",   {{bob=-1,dur=240},{cast=true,dur=360},{cast=true,shell=true,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
  }},
  {key="criptah_doncella", size=48, draw=doncella, anims={
    {"idle",   {{bob=0,phase=0,dur=380},{bob=-1,phase=1,dur=380}}},
    {"attack", {{bob=-1,hx=-1,dur=200},{dx=3,cast=true,phase=1,dur=180},{dx=1,phase=0,dur=220}}},
    {"cast",   {{bob=-2,phase=1,dur=200},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1100}}},
  }},
  {key="criptah_gargola", size=48, draw=gargola, anims={
    {"idle",   {{bob=0,wing=0,dur=360},{bob=-1,wing=1,dur=360}}},
    {"attack", {{bob=-3,wing=1,dur=180},{dx=4,dive=true,wing=1,dur=150},{dx=1,wing=0,dur=220}}},
    {"cast",   {{bob=-1,wing=1,dur=200},{cast=true,wing=1,dur=320},{wing=0,dur=220}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=2,wing=0,pain=true,dur=200},{dead=true,dur=1100}}},
  }},
  {key="criptah_escolta", size=48, draw=escolta, anims={
    {"idle",   {{bob=0,dur=500},{bob=1,dur=500}}},
    {"attack", {{bob=1,hx=-1,dur=220},{dx=3,swing=true,dur=170},{dx=1,swing=true,dur=240}}},
    {"cast",   {{bob=-1,dur=200},{shell=true,dur=320},{shell=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="criptah_escarcha", size=64, draw=escarcha, anims={
    {"idle",   {{bob=0,phase=0,dur=460},{bob=1,phase=1,dur=460}}},
    {"attack", {{bob=-1,hx=-2,dur=240},{dx=2,lunge=true,bite=true,phase=1,dur=160},{dx=1,dur=260}}},
    {"cast",   {{bob=-1,hx=-1,dur=240},{cast=true,phase=0,dur=360},{cast=true,shell=true,phase=1,dur=260}}},
    {"hurt",   {{dx=-3,hy=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1400}}},
  }},
}

local dir = app.params.dir
local manifest = {}
for _,m in ipairs(MONSTERS) do
  local images, entry, f = {}, {}, 0
  local spr = Sprite(m.size, m.size, ColorMode.RGB)
  spr.layers[1].name = "cuerpo"
  for _,a in ipairs(m.anims) do
    local name, poses = a[1], a[2]
    local from = f + 1
    local idx, durs = {}, {}
    for _,P in ipairs(poses) do
      f = f + 1
      local img = toImage(m.draw(P))
      images[#images+1] = img
      local frame = (f == 1) and spr.frames[1] or spr:newEmptyFrame(f)
      frame.duration = P.dur / 1000
      spr:newCel(spr.layers[1], frame, img, Point(0,0))
      idx[#idx+1] = f - 1; durs[#durs+1] = P.dur
    end
    local tag = spr:newTag(from, f); tag.name = name
    entry[#entry+1] = string.format('"%s": { "frames": [%s], "durations": [%s], "loop": %s }',
      name, table.concat(idx, ", "), table.concat(durs, ", "), name == "idle" and "true" or "false")
  end
  spr:saveAs(dir .. "/zona5/" .. m.key .. ".aseprite")
  spr:close()
  local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
  for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
  local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
  out:saveCopyAs(dir .. "/enemigos/" .. m.key .. ".png")
  out:close()
  manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
end
local fh = io.open(dir .. "/enemigos_tundra.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
