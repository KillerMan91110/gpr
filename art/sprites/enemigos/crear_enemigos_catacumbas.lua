-- Enemigos de las Catacumbas del Abismo (zona 6, nivel 76-85): uno o dos propios por subzona.
--   rata_osario           Rata de Osario (Escalera Helada, Cripta de la Catedral)
--   murcielago_vampiro    Murciélago Vampiro (Galería de las Máscaras)
--   esqueleto_guerrero    Esqueleto Guerrero (Osario de los Reyes)
--   zombie_anciano        Zombie Anciano (Nichos de los Sacerdotes)
--   arana_tumba           Araña de Tumba (Nichos, Jardín de Hongos)
--   hongo_palido          Hongo Pálido (Jardín de Hongos)
--   fantasma_encadenado   Fantasma Encadenado (Santuario Profanado, Lago Negro)
--   gul_hambriento        Gul Hambriento (Lago Negro)
--   cadaver_reanimado     Cadáver Reanimado (Abismo, Río)
--   alma_en_pena          Alma en Pena (Río de las Almas)
--   sacerdote_maldito     Sacerdote Maldito (Biblioteca Prohibida)
--   inquisidor_eclipse    Inquisidor del Eclipse (Antesala del Trono, Sexto Sello)
--   gusano_cripta         Gusano de las Criptas, raro, 56x56
--   caballero_sin_rostro  Caballero sin Rostro, raro, 56x56
--   guardian_abismo       Guardián del Abismo, minijefe, 64x64
--   archimago_corrupto    Archimago Corrupto, minijefe, 64x64
--   centinela_muerte      Centinela de la Muerte, minijefe, 64x64
--   lich_ancestral        Lich Ancestral, jefe, 64x64
-- y los del Trono de Huesos (la mazmorra, gprback/lib/trono_huesos.js):
--   tronoh_bufon          Bufón de Hueso, el que divertía al Lich (48x48)
--   tronoh_guardia        Guardia Real Esquelética, alabarda y yelmo de oro (48x48)
--   tronoh_doncella       la Doncella Velada, una Velada atada con cadenas (48x48)
--   tronoh_coloso         el Coloso de Huesos, jefe, hecho con mil sacerdotes (64x64)
-- Mismo estilo que crear_enemigos_tundra.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona6/<clave>.aseprite y
-- enemigos_catacumbas.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_catacumbas.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", R="c0343a", r="7a1f2a", Y="e8c050", y="a8802c", go1="ffe08a", go2="c89a2a",
  -- piedra del suelo de las catacumbas
  gr1="8e8898", gr2="6c6678", gr3="4e4a5a",
  -- hueso y trapos de tumba
  hu1="ece4cc", hu2="c6ba9a", hu3="8c7e66", tr1="6e5e4e", tr2="4c4034", tr3="302820",
  -- piel de zombie, de gul y de cadáver cosido
  zb1="8aa07a", zb2="62785a", zb3="40523c", gu1="9a9a8a", gu2="6e6e60", gu3="46463c", cd1="a8907e", cd2="7a6454", cd3="4e3e34",
  -- pelo de rata, alas de murciélago, araña
  ra1="6e6670", ra2="4c4650", ra3="302c36", pk="d88a8a",
  ba1="4a3a4e", ba2="2e2434", bam="8a3a4a",
  ar1="6a6670", ar2="48444e", ar3="2c2a32",
  -- hongo (el sombrero brilla por las motas)
  hgp="c6a2ff", hgd="7a5ab0", hgv="4c3478", hgs="d2c2a0", hgt="a08c6c", hg1="a4f4dc",
  -- espectros y almas (brillan: sin contorno)
  gh1="d8f0f0", gh2="9ccac8", gh3="5e8e90", sl1="c0f6ff", sl2="6ad0f0", sl3="2a7eaa",
  -- túnicas violetas de los sacerdotes, plata negra del eclipse
  vt1="6a4e8e", vt2="4a3468", vt3="2e2046", ec1="e2a6ff", ec2="8a50d8",
  sp1="c8ccd8", sp2="8a90a0", sp3="54586a", ne1="3a3644", ne2="26222e", ne3="18161e",
  -- el gusano, veneno y sangre
  wo1="e8dcd0", wo2="c0b0a4", wo3="8e7e74", pv="9ad04a", bl="a02a3a",
  -- el lich: blanco y oro gastados
  li1="e8e2d0", li2="b8ae94", li3="7e765e",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, sl1=true, sl2=true, ec1=true, hg1=true, gh1=true, go1=true}

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
-- losas de piedra bajo los pies
local function floor(G, x0, x1, y) G.rect(x0, y, x1, y, "gr3"); G.rect(x0 + 2, y - 1, x1 - 2, y - 1, "gr2") end
-- cráneo de frente-perfil (mirando a la derecha): x, y = arriba-izquierda, s = tamaño (1 o 2)
local function skull(G, x, y, s, pain, glow)
  s = s or 1
  G.ellipse(x + 4*s, y + 3*s, 4*s, 3.5*s, "hu1"); G.rect(x + 2*s, y + 5*s, x + 7*s, y + 8*s, "hu1"); G.ridge(x + 4*s, y + 3*s, 4*s, 3.5*s, "W", 1)
  G.rect(x + 2*s, y + 8*s, x + 7*s, y + 8*s, "hu2")
  if pain then G.px(x + 5*s, y + 4*s, "K"); G.px(x + 6*s, y + 4*s, "K")
  else G.ellipse(x + 5.5*s, y + 4*s, s, s, glow or "K") end
  G.px(x + 7*s, y + 6*s, "K")
  for i=0,2 do G.px(x + 3*s + i*s, y + 7*s, "hu3") end
end
-- un hueso entre dos puntos
local function boneLine(G, x0, y0, x1, y1, w)
  G.thick(x0, y0, x1, y1, w or 2, "hu1"); G.ellipse(x0, y0, 1.5, 1.5, "hu1"); G.ellipse(x1, y1, 1.5, 1.5, "hu1")
end
-- cadena de eslabones de (x0,y0) a (x1,y1)
local function chain(G, x0, y0, x1, y1, c)
  local n = math.max(1, math.floor(math.max(math.abs(x1-x0), math.abs(y1-y0)) / 3))
  for i=0,n do local x, y = x0 + (x1-x0)*i/n, y0 + (y1-y0)*i/n; if i % 2 == 0 then G.ellipse(x, y, 1.5, 1, c) else G.px(x, y, c) end end
end

-- =====================================================================================
-- Rata de Osario (48x48): gorda, gris violácea, cola pelada larga, ojos rojos
-- =====================================================================================
local function rata(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 2, 46, 45)
  if P.dead then G.ellipse(24,41,15,4,"ra2"); G.ridge(24,41,15,4,"ra1",1); G.line(9,42,1,44,"pk"); G.ellipse(38,41,5,3,"ra1"); return G end
  for i=0,12 do G.px(10+dx-i, 36+b + math.floor(math.sin(i/2 + (P.phase or 0)) * 2), "pk") end
  for _,x in ipairs({15, 20, 28, 33}) do local k = (x + (P.phase or 0)) % 2; G.thick(x+dx, 38+b, x+dx+(k==0 and -1 or 1), 44, 2, "ra3"); G.px(x+dx+1, 44, "pk") end
  G.ellipse(23+dx, 33+b, 13, 8, "ra2"); G.ridge(23+dx, 33+b, 13, 8, "ra1", 3)
  for x=14,30,4 do G.line(x+dx, 26+b, x+dx+1, 24+b, "ra1") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(37+hx, 31+hy, 7, 5, "ra2"); G.ridge(37+hx, 31+hy, 7, 5, "ra1", 1); G.ellipse(44+hx, 33+hy, 2, 2, "pk")
  G.ellipse(33+hx, 25+hy, 3, 3, "pk"); G.ellipse(33+hx, 25+hy, 2, 2, "ra2")
  eye(G, 38+hx, 29+hy, "R", P.pain)
  for _,y in ipairs({32, 34}) do G.line(44+hx, y+hy, 47+hx, y-1+hy, "hu2") end
  if P.bite then G.rect(41+hx, 35+hy, 45+hx, 37+hy, "r"); G.px(42+hx, 35+hy, "W"); G.px(44+hx, 35+hy, "W") end
  if P.cast then for _,p in ipairs({{44,40},{40,42},{46,38}}) do G.ellipse(p[1]+hx, p[2]+hy, 1.5, 1.5, "pv") end end
  return G
end

-- =====================================================================================
-- Murciélago Vampiro (48x48): vuela; alas que suben y bajan, boca roja
-- =====================================================================================
local function murcielago(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then G.ellipse(24,42,8,3,"ba1"); G.line(14,43,4,41,"ba2"); G.line(34,43,44,41,"ba2"); G.ellipse(30,40,3,2,"ba1"); return G end
  local up = (P.wing or 0) == 1
  -- cada ala: membrana roja oscura entre tres dedos de hueso, con el borde en festón
  local function tri(x1, y1, x2, y2, x3, y3, c)
    local minx, maxx = math.min(x1, x2, x3), math.max(x1, x2, x3)
    local miny, maxy = math.min(y1, y2, y3), math.max(y1, y2, y3)
    for y=miny,maxy do for x=minx,maxx do
      local d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)
      local d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3)
      local d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1)
      if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)) then G.px(x, y, c) end
    end end
  end
  for _,s in ipairs({-1, 1}) do
    local bx, by = 24 + dx, 21 + b
    local ex, ey = bx + s*9, by + (up and -9 or -3)          -- el codo
    local tips = up and {{bx + s*21, by - 16}, {bx + s*20, by - 6}, {bx + s*14, by + 2}} or {{bx + s*22, by - 2}, {bx + s*19, by + 8}, {bx + s*12, by + 11}}
    tri(bx, by, ex, ey, tips[1][1], tips[1][2], "bam"); tri(bx, by + 4, tips[1][1], tips[1][2], tips[2][1], tips[2][2], "bam")
    tri(bx, by + 4, tips[2][1], tips[2][2], tips[3][1], tips[3][2], "bam"); tri(bx, by + 4, tips[3][1], tips[3][2], bx + s*3, by + 8, "bam")
    G.line(bx, by, ex, ey, "ba2")
    for _,t in ipairs(tips) do G.line(ex, ey, t[1], t[2], "ba2") end
    G.px(ex + s, ey - 1, "ba2")
  end
  G.ellipse(24+dx, 26+b, 6, 8, "ba1"); G.ridge(24+dx, 26+b, 6, 8, "ba2", 1)
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(27+hx, 17+hy, 5, 4, "ba1"); G.line(24+hx, 13+hy, 23+hx, 8+hy, "ba1"); G.line(29+hx, 13+hy, 31+hx, 8+hy, "ba1")
  eye(G, 29+hx, 16+hy, "R", P.pain)
  G.rect(28+hx, 19+hy, 31+hx, 20+hy, P.bite and "r" or "ba2"); G.px(29+hx, 21+hy, "W"); G.px(31+hx, 21+hy, "W")
  G.line(22+dx, 33+b, 21+dx, 37+b, "ba2"); G.line(26+dx, 33+b, 27+dx, 37+b, "ba2")
  if P.cast then for i=0,4 do G.px(34+hx+i*2, 22+hy+i, "bl"); G.px(35+hx+i*2, 23+hy+i, "r") end end
  return G
end

-- =====================================================================================
-- Esqueleto Guerrero (48x48): espada oxidada y escudo redondo, tela de tumba
-- =====================================================================================
local function esqueleto(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then for _,p in ipairs({{8,43,20,42},{22,44,32,43},{12,40,18,44}}) do boneLine(G, p[1], p[2], p[3], p[4]) end; skull(G, 32, 36, 1, true); G.ellipse(14,42,6,2,"tr2"); return G end
  -- piernas
  local k = P.phase or 0
  boneLine(G, 20+dx, 31+b, 18+dx-k, 44); boneLine(G, 26+dx, 31+b, 28+dx+k, 44)
  -- pelvis, columna y costillas
  G.rect(18+dx, 29+b, 28+dx, 31+b, "hu2"); G.thick(23+dx, 15+b, 23+dx, 29+b, 2, "hu2")
  for y=17,25,3 do G.rect(18+dx, y+b, 28+dx, y+b, "hu1") end
  G.rect(16+dx, 27+b, 30+dx, 33+b, "tr2"); G.rect(16+dx, 33+b, 18+dx, 35+b, "tr2"); G.rect(26+dx, 33+b, 28+dx, 36+b, "tr2")
  -- escudo (brazo de atrás)
  G.ellipse(14+dx, 24+b, 7, 8, "tr1"); G.ellipse(14+dx, 24+b, 5, 6, "tr2"); G.ellipse(14+dx, 24+b, 2, 2, "sp2")
  if P.shell then G.ellipse(14+dx, 24+b, 9, 10, "hu2"); G.ellipse(14+dx, 24+b, 7, 8, "tr1"); for i=0,5 do G.px(6+dx+i*3, 14+b+(i%2), "go1") end end
  -- brazo de la espada
  local sw = P.swing
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if sw then boneLine(G, 27+dx, 18+b, 34+dx, 22+b); G.thick(34+dx, 22+b, 46+dx, 30+b, 3, "sp2"); G.line(35+dx, 21+b, 46+dx, 28+b, "sp1"); G.px(40+dx, 25+b, "tr2")
  else boneLine(G, 27+dx, 18+b, 31+dx, 26+b); G.thick(32+dx, 26+b, 36+dx, 8+b, 3, "sp2"); G.line(33+dx, 25+b, 37+dx, 9+b, "sp1"); G.rect(29+dx, 25+b, 35+dx, 26+b, "tr1") end
  skull(G, 19+hx, 4+hy, 1, P.pain, "R")
  return G
end

-- =====================================================================================
-- Zombie Anciano (48x48): un sacerdote viejo y verde, encorvado, túnica rota, brazos adelante
-- =====================================================================================
local function zombie(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,14,4,"vt2"); G.ellipse(36,40,5,4,"zb2"); G.line(10,43,4,44,"zb2"); return G end
  local k = P.phase or 0
  G.thick(19+dx, 33+b, 18+dx-k, 44, 3, "zb3"); G.thick(26+dx, 33+b, 27+dx+k, 44, 3, "zb3")
  -- túnica rota de sacerdote
  for y=16,36 do local half = 6 + math.floor((y - 16) * 0.3); G.rect(22+dx-half, y+b, 22+dx+half, y+b, (y // 5) % 2 == 0 and "vt2" or "vt3") end
  for x=14,30,4 do G.line(x+dx, 36+b, x+dx+1, 39+b, "vt3") end
  G.rect(20+dx, 18+b, 24+dx, 34+b, "hu3")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  -- brazos adelante
  local reach = P.bite and 4 or 0
  G.thick(26+dx, 20+b, 38+dx+reach, 23+b, 3, "zb2"); G.thick(25+dx, 24+b, 36+dx+reach, 27+b, 3, "zb3")
  for i=0,2 do G.line(39+dx+reach, 21+b+i*2, 42+dx+reach, 22+b+i*2, "zb1") end
  -- cabeza caída hacia adelante
  G.ellipse(29+hx, 12+hy, 6, 6, "zb2"); G.ridge(29+hx, 12+hy, 6, 6, "zb1", 2); G.rect(31+hx, 14+hy, 35+hx, 17+hy, "zb2")
  eye(G, 32+hx, 11+hy, "pv", P.pain); G.rect(32+hx, 16+hy, 34+hx, 16+hy, "K")
  G.line(24+hx, 7+hy, 22+hx, 11+hy, "hu2"); G.px(26+hx, 6+hy, "hu2")
  if P.cast then for i=0,5 do G.ellipse(38+hx+i*1.5, 16+hy-i, 2, 2, i % 2 == 0 and "pv" or "zb1") end end
  return G
end

-- =====================================================================================
-- Araña de Tumba (48x48): gris, ocho patas, ojos lilas; escupe tela
-- =====================================================================================
local function arana(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 2, 46, 45)
  if P.dead then G.ellipse(24,40,12,5,"ar2"); for i=0,3 do G.line(14+i*6,38,10+i*7,32,"ar3") end; return G end
  local ph = P.phase or 0
  for i=0,3 do
    local lift = ((i + ph) % 2) * 2
    local x = 12 + i*7 + dx
    G.line(x, 32+b, x-6+i, 24+b-lift, "ar3"); G.line(x-6+i, 24+b-lift, x-8+i*2, 44, "ar3")
    G.line(x+2, 33+b, x+4, 26+b-lift, "ar2"); G.line(x+4, 26+b-lift, x+6, 44, "ar2")
  end
  G.ellipse(16+dx, 30+b, 11, 9, "ar2"); G.ridge(16+dx, 30+b, 11, 9, "ar1", 3)
  G.rect(12+dx, 27+b, 20+dx, 28+b, "hu2"); G.px(16+dx, 25+b, "hu2"); G.px(16+dx, 30+b, "hu2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 32+hy, 7, 6, "ar2"); G.ridge(31+hx, 32+hy, 7, 6, "ar1", 1)
  for _,p in ipairs({{33,29},{36,30},{34,32},{37,33}}) do eye(G, p[1]+hx, p[2]+hy, "hgp", P.pain) end
  G.line(37+hx, 35+hy, 40+hx, 38+hy, "hu2"); G.line(35+hx, 36+hy, 37+hx, 39+hy, "hu2")
  if P.cast then for i=0,6 do G.px(39+hx+i*1.2, 34+hy-i*0.5, "W") end; G.ellipse(46+hx, 31+hy, 2, 2, "W"); G.px(46+hx, 30+hy, "hu2") end
  return G
end

-- =====================================================================================
-- Hongo Pálido (48x48): un hongo que camina sobre raíces, sombrero lila con motas que brillan
-- =====================================================================================
local function hongo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then G.ellipse(24,41,16,4,"hgd"); for _,x in ipairs({14,22,30}) do G.px(x,40,"hg1") end; G.ellipse(34,43,5,2,"hgs"); return G end
  local ph = P.phase or 0
  for i=0,3 do local x = 16 + i*5 + dx; G.line(x, 36+b, x-2+((i+ph)%2)*3, 44, "hgt") end
  G.rect(17+dx, 22+b, 29+dx, 37+b, "hgs"); G.rect(26+dx, 22+b, 29+dx, 37+b, "hgt")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  -- carita en el tallo
  eye(G, 25+hx, 28+hy, "K", P.pain); eye(G, 28+hx, 28+hy, "K", P.pain); G.rect(25+hx, 32+hy, 28+hx, 32+hy, "hgt")
  -- sombrero
  G.ellipse(23+hx, 16+hy, 17, 9, "hgd"); G.ridge(23+hx, 16+hy, 17, 9, "hgp", 4); G.rect(7+hx, 18+hy, 39+hx, 21+hy, "hgv")
  for i=0,8 do G.px(9+hx+i*3.5, 21+hy, "hgd") end
  for _,p in ipairs({{14,12},{22,9},{31,12},{18,16},{28,15}}) do G.ellipse(p[1]+hx, p[2]+hy, 1.5, 1.5, "hg1") end
  -- brazos de raíz
  G.line(17+dx, 26+b, 11+dx, 32+b, "hgt"); G.line(29+dx, 26+b, 35+dx+(P.bite and 6 or 0), 30+b, "hgt")
  if P.cast then for _,p in ipairs({{6,4},{16,2},{30,3},{40,6},{44,12},{4,12}}) do G.ellipse(p[1]+hx, p[2]+hy, 2, 2, "hg1"); G.px(p[1]+hx+3, p[2]+hy+2, "hgp") end end
  return G
end

-- =====================================================================================
-- Fantasma Encadenado (48x48): un Velado transparente con grilletes y cadenas que arrastra
-- =====================================================================================
local function fantasma(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then G.ellipse(24,42,10,2,"gh2"); chain(G, 10, 43, 38, 43, "sp3"); return G end
  local ph = P.phase or 0
  -- cola que ondea
  for y=28,42 do local w = math.floor(10 - (y - 28) * 0.55); local o = math.floor(math.sin(y / 3 + ph) * 2); G.rect(22+dx-w+o, y+b, 22+dx+w+o, y+b, (y % 4 == 0) and "gh3" or "gh2") end
  G.ellipse(23+dx, 22+b, 11, 11, "gh2"); G.ridge(23+dx, 22+b, 11, 11, "gh1", 3)
  -- capucha velada
  G.ellipse(25+dx, 14+b, 8, 8, "gh3"); G.ellipse(27+dx, 15+b, 5, 5, "ne2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  eye(G, 28+hx, 14+hy, "sl1", P.pain); eye(G, 31+hx, 14+hy, "sl1", P.pain)
  -- brazos con grilletes
  G.thick(30+dx, 22+b, 38+dx, 27+b, 3, "gh2"); G.rect(36+dx, 25+b, 39+dx, 28+b, "sp3")
  chain(G, 38+dx, 28+b, 30+dx, 42, "sp2"); chain(G, 14+dx, 30+b, 4+dx, 42, "sp2"); G.rect(12+dx, 28+b, 15+dx, 31+b, "sp3")
  if P.cast then chain(G, 39+hx, 26+hy, 47+hx, 14+hy, "sl2"); chain(G, 39+hx, 27+hy, 47+hx, 34+hy, "sl2") end
  return G
end

-- =====================================================================================
-- Gul Hambriento (48x48): agachado, gris, flaco, uñas largas y negras
-- =====================================================================================
local function gul(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then G.ellipse(22,41,14,3,"gu2"); G.ellipse(36,40,5,3,"gu1"); for i=0,2 do G.line(40+i*2,42,42+i*2,45,"K") end; return G end
  local k = P.phase or 0
  -- patas flexionadas
  G.thick(14+dx, 34+b, 10+dx, 40+b, 3, "gu3"); G.thick(10+dx, 40+b, 14+dx-k, 44, 3, "gu3")
  G.thick(22+dx, 35+b, 26+dx, 40+b, 3, "gu3"); G.thick(26+dx, 40+b, 24+dx+k, 44, 3, "gu3")
  -- espalda encorvada con costillas
  G.ellipse(19+dx, 28+b, 11, 8, "gu2"); G.ridge(19+dx, 28+b, 11, 8, "gu1", 2)
  for x=12,24,3 do G.line(x+dx, 26+b, x+dx+1, 31+b, "gu3") end
  G.rect(12+dx, 33+b, 26+dx, 36+b, "tr3")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(33+hx, 24+hy, 6, 5, "gu2"); G.ridge(33+hx, 24+hy, 6, 5, "gu1", 1); G.rect(35+hx, 25+hy, 40+hx, 29+hy, "gu2")
  eye(G, 35+hx, 22+hy, "Y", P.pain); G.rect(36+hx, 28+hy, 40+hx, 28+hy, "K"); G.px(37+hx, 27+hy, "W"); G.px(39+hx, 27+hy, "W")
  G.line(29+hx, 19+hy, 26+hx, 16+hy, "gu3")
  -- brazo con garras
  local sl = P.swing
  G.thick(26+dx, 28+b, sl and 38+dx or 32+dx, sl and 34+b or 38+b, 2, "gu2")
  local cx, cy = sl and 38+dx or 32+dx, sl and 34+b or 38+b
  for i=0,2 do G.line(cx, cy, cx + 5, cy - 3 + i*3, "K") end
  if sl then for i=0,3 do G.line(40+dx, 26+b+i*4, 46+dx, 22+b+i*4, "bl") end end
  return G
end

-- =====================================================================================
-- Cadáver Reanimado (48x48): grande, cosido con hilo negro, puños enormes
-- =====================================================================================
local function cadaver(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then G.ellipse(23,40,17,5,"cd2"); G.ridge(23,40,17,5,"cd1",1); for x=10,34,5 do G.px(x,38,"K") end; return G end
  local k = P.phase or 0
  G.thick(17+dx, 34+b, 16+dx-k, 44, 5, "cd3"); G.thick(28+dx, 34+b, 29+dx+k, 44, 5, "cd3")
  G.ellipse(22+dx, 24+b, 14, 12, "cd2"); G.ridge(22+dx, 24+b, 14, 12, "cd1", 3)
  G.rect(12+dx, 31+b, 32+dx, 36+b, "tr2")
  -- costuras
  for _,s in ipairs({{12,18,26,30},{24,14,30,26}}) do G.line(s[1]+dx, s[2]+b, s[3]+dx, s[4]+b, "K"); for i=0,4 do local t = i/4; G.px(s[1]+dx+(s[3]-s[1])*t+1, s[2]+b+(s[4]-s[2])*t-1, "K") end end
  G.ellipse(16+dx, 22+b, 3, 3, "zb2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(30+hx, 10+hy, 5, 5, "cd2"); G.ridge(30+hx, 10+hy, 5, 5, "cd1", 1)
  eye(G, 32+hx, 9+hy, "pv", P.pain); G.px(29+hx, 9+hy, "K"); G.line(27+hx, 6+hy, 33+hx, 6+hy, "K")
  local pun = P.swing and 8 or 0
  G.thick(32+dx, 20+b, 38+dx+pun, 26+b, 4, "cd2"); G.ellipse(40+dx+pun, 27+b, 5, 5, "cd1"); G.ellipse(40+dx+pun, 28+b, 4, 3, "cd2")
  G.thick(12+dx, 20+b, 8+dx, 32+b, 4, "cd3"); G.ellipse(8+dx, 34+b, 4, 4, "cd2")
  if P.cast then for _,p in ipairs({{42,16},{38,12},{44,22}}) do G.ellipse(p[1]+hx, p[2]+hy, 1.5, 1.5, "pv") end end
  return G
end

-- =====================================================================================
-- Alma en Pena (48x48): un alma azul que brilla, boca abierta en un grito
-- =====================================================================================
local function alma(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then G.ellipse(24,42,9,2,"sl3"); for i=0,4 do G.px(14+i*5, 38-i%2*2, "sl2") end; return G end
  local ph = P.phase or 0
  for y=24,43 do local w = math.floor(9 - (y - 24) * 0.42); local o = math.floor(math.sin(y / 3 + ph) * 3); if w > 0 then G.rect(22+dx-w+o, y+b, 22+dx+w+o, y+b, (y % 3 == 0) and "sl3" or "sl2") end end
  G.ellipse(23+dx, 18+b, 10, 11, "sl2"); G.ridge(23+dx, 18+b, 10, 11, "sl1", 3)
  -- brazos alzados
  G.thick(14+dx, 20+b, 8+dx, 10+b, 2, "sl2"); G.thick(31+dx, 20+b, 37+dx, 10+b, 2, "sl2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  eye(G, 25+hx, 14+hy, "K", P.pain); eye(G, 29+hx, 14+hy, "K", P.pain)
  local mouth = P.cast and 4 or 2
  G.ellipse(27+hx, 21+hy, 2, mouth, "sl3"); G.ellipse(27+hx, 21+hy, 1, mouth - 1, "K")
  if P.cast then for _,r in ipairs({6, 10, 14}) do for a=-5,5 do local t = a / 10; G.px(30+hx + math.cos(t)*r, 21+hy + math.sin(t)*r*1.4, "sl1") end end end
  return G
end

-- =====================================================================================
-- Sacerdote Maldito (48x48): túnica violeta, cara de calavera, relicario de plata con el eclipse
-- =====================================================================================
local function sacerdote(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,15,4,"vt2"); G.ridge(22,41,15,4,"vt1",1); skull(G, 32, 35, 1, true); return G end
  for y=12,44 do local half = 5 + math.floor((y - 12) * 0.3); G.rect(21+dx-half, math.min(44, y+b), 21+dx+half, math.min(44, y+b), (y // 6) % 2 == 0 and "vt1" or "vt2") end
  G.rect(19+dx, 14+b, 23+dx, 44, "vt3"); for y=18,40,6 do G.px(21+dx, y+b, "go2") end
  -- capucha
  G.ellipse(23+dx, 9+b, 8, 8, "vt2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 22+hx, 4+hy, 1, P.pain, "ec1")
  -- brazo con el relicario
  local up = P.cast and -8 or 0
  G.thick(27+dx, 18+b, 34+dx, 24+b+up, 3, "vt1"); G.ellipse(37+dx, 24+b+up, 4, 5, "sp2"); G.ellipse(37+dx, 24+b+up, 2, 3, "ne2"); G.px(37+dx, 23+b+up, "ec1")
  G.line(37+dx, 18+b+up, 37+dx, 20+b+up, "sp1")
  if P.cast then for i=0,4 do G.px(41+dx+i, 20+b+up-i, "ec1"); G.px(42+dx+i, 21+b+up-i, "ec2") end end
  return G
end

-- =====================================================================================
-- Inquisidor del Eclipse (48x48): túnica negra, máscara de plata, báculo con el eclipse
-- =====================================================================================
local function inquisidor(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,15,4,"ne2"); G.ellipse(36,40,4,3,"sp1"); G.line(6,44,30,42,"sp3"); return G end
  for y=13,44 do local half = 5 + math.floor((y - 13) * 0.33); G.rect(21+dx-half, math.min(44, y+b), 21+dx+half, math.min(44, y+b), (y // 7) % 2 == 0 and "ne1" or "ne2") end
  G.rect(13+dx, 22+b, 29+dx, 24+b, "sp3"); G.px(21+dx, 23+b, "ec1")
  for y=26,42,4 do G.px(15+dx, y+b, "sp2"); G.px(27+dx, y+b, "sp2") end
  -- báculo
  local cast = P.cast
  G.thick(35+dx, 6+b, 33+dx, 44, 2, "sp3")
  G.ellipse(35+dx, 6+b, 4, 4, "ne3"); G.ellipse(36+dx, 5+b, 3, 3, cast and "ec1" or "ec2"); G.ellipse(37+dx, 5+b, 2, 2, "ne3")
  G.thick(26+dx, 18+b, 33+dx, 22+b, 3, "ne1")
  -- capucha y máscara de plata
  G.ellipse(23+dx, 10+b, 8, 8, "ne2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 11+hy, 5, 6, "sp1"); G.ridge(25+hx, 11+hy, 5, 6, "W", 1); G.rect(24+hx, 15+hy, 29+hx, 16+hy, "sp2")
  eye(G, 26+hx, 10+hy, "ec1", P.pain); eye(G, 29+hx, 10+hy, "ec1", P.pain)
  if cast then for _,r in ipairs({6, 9}) do G.ellipse(36+dx, 5+b, r, r, "ec2"); G.ellipse(36+dx, 5+b, r - 1, r - 1, "ne3") end; G.ellipse(36+dx, 5+b, 3, 3, "ec1"); G.ellipse(37+dx, 5+b, 2, 2, "ne3") end
  return G
end

-- =====================================================================================
-- Gusano de las Criptas (56x56, raro): sale del suelo, boca redonda llena de dientes
-- =====================================================================================
local function gusano(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 2, 54, 53)
  G.ellipse(20, 52, 14, 3, "gr3"); for _,p in ipairs({{8,50},{30,50},{12,48}}) do G.ellipse(p[1], p[2], 2, 1.5, "gr2") end
  if P.dead then G.ellipse(30,49,20,4,"wo2"); G.ridge(30,49,20,4,"wo1",1); for x=14,46,4 do G.px(x,47,"wo3") end; return G end
  local lean = P.lunge and 6 or 0
  -- cuerpo en anillos, de abajo hacia la cabeza
  for i=0,9 do
    local t = i / 9
    local cx = 20 + dx + t * (16 + lean) + math.sin(t * 3 + (P.phase or 0)) * 2
    local cy = 50 + b - t * 34
    local r = 8 - t * 1.5
    G.ellipse(cx, cy, r, r * 0.8, i % 2 == 0 and "wo2" or "wo1"); G.ridge(cx, cy, r, r * 0.8, "wo1", 1); G.px(cx - r + 1, cy, "wo3")
  end
  local hx, hy = dx + (P.hx or 0) + lean, b + (P.hy or 0)
  -- la boca: un anillo de dientes
  G.ellipse(40+hx, 14+hy, 9, 9, "wo2"); G.ellipse(42+hx, 14+hy, 6, 7, "bl"); G.ellipse(43+hx, 14+hy, 4, 5, "K")
  for a=0,11 do local t = a / 12 * math.pi * 2; G.px(42+hx + math.cos(t) * 5, 14+hy + math.sin(t) * 6, "W") end
  if P.pain then G.ellipse(43+hx, 14+hy, 4, 2, "bl") end
  if P.cast then for _,p in ipairs({{6,30},{10,20},{50,40},{4,40}}) do G.ellipse(p[1], p[2], 2, 2, "gr2"); G.px(p[1]+2, p[2]-2, "gr1") end end
  return G
end

-- =====================================================================================
-- Caballero sin Rostro (56x56, raro): armadura negra, yelmo vacío con luz violeta, espada sombría
-- =====================================================================================
local function caballero(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 50, 53)
  if P.dead then G.ellipse(26,49,18,4,"ne1"); G.ridge(26,49,18,4,"sp3",1); G.ellipse(42,47,6,5,"ne1"); G.ellipse(43,47,3,3,"K"); G.line(6,52,30,50,"sp2"); return G end
  local k = P.phase or 0
  G.thick(21+dx, 36+b, 20+dx-k, 52, 5, "ne2"); G.thick(31+dx, 36+b, 32+dx+k, 52, 5, "ne2"); G.rect(17+dx, 50, 23+dx, 52, "ne1"); G.rect(29+dx, 50, 35+dx, 52, "ne1")
  G.rect(15+dx, 18+b, 37+dx, 38+b, "ne1"); G.rect(15+dx, 18+b, 37+dx, 20+b, "sp3"); G.rect(33+dx, 18+b, 37+dx, 38+b, "ne2")
  G.rect(15+dx, 36+b, 37+dx, 38+b, "sp3"); for x=17,35,6 do G.rect(x+dx, 38+b, x+dx+3, 42+b, "ne2") end
  G.ellipse(13+dx, 21+b, 5, 4, "ne2"); G.ellipse(39+dx, 21+b, 5, 4, "ne2")
  -- capa
  G.rect(8+dx, 22+b, 13+dx, 46+b, "vt3")
  if P.shell then for _,p in ipairs({{10,16},{44,18},{8,34},{46,34}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 3, "hu1") end end
  -- yelmo vacío
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(27+hx, 10+hy, 8, 8, "ne1"); G.ridge(27+hx, 10+hy, 8, 8, "sp2", 1); G.rect(19+hx, 10+hy, 35+hx, 17+hy, "ne1")
  G.rect(26+hx, 9+hy, 35+hx, 12+hy, "K"); if not P.pain then G.px(31+hx, 10+hy, "ec1"); G.px(33+hx, 11+hy, "ec2") end
  G.line(22+hx, 2+hy, 27+hx, 2+hy, "R")
  -- espada
  if P.swing then G.thick(38+dx, 26+b, 44+dx, 30+b, 4, "ne1"); G.thick(44+dx, 30+b, 55+dx, 40+b, 3, "ne3"); G.line(45+dx, 29+b, 55+dx, 38+b, "ec2")
  else G.thick(38+dx, 26+b, 42+dx, 34+b, 4, "ne1"); G.thick(43+dx, 34+b, 46+dx, 8+b, 3, "ne3"); G.line(44+dx, 33+b, 47+dx, 9+b, "ec2"); G.rect(39+dx, 33+b, 47+dx, 34+b, "sp2") end
  return G
end

-- =====================================================================================
-- Guardián del Abismo (64x64, minijefe): gigante de huesos con una losa de tumba por escudo y un
-- cristal de eclipse clavado en el pecho
-- =====================================================================================
local function guardian(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 60, 61)
  if P.dead then for _,p in ipairs({{8,58,26,56},{28,60,44,58},{14,54,22,60},{46,57,56,59}}) do boneLine(G, p[1], p[2], p[3], p[4], 3) end; skull(G, 40, 46, 1.5, true); G.rect(4,52,14,60,"gr2"); return G end
  local k = P.phase or 0
  boneLine(G, 26+dx, 42+b, 23+dx-k, 60, 4); boneLine(G, 36+dx, 42+b, 39+dx+k, 60, 4)
  G.rect(22+dx, 40+b, 40+dx, 44+b, "hu2")
  -- tórax de costillas grandes
  G.thick(31+dx, 18+b, 31+dx, 42+b, 4, "hu2")
  for i=0,4 do local y = 20 + i*4; G.ellipse(31+dx, y+b, 11 - i, 2, "hu1"); G.ellipse(31+dx, y+b, 9 - i, 1, "K") end
  -- el cristal del eclipse en el pecho
  G.ellipse(31+dx, 26+b, 3, 4, "ec2"); G.ellipse(31+dx, 25+b, 2, 2, "ec1")
  -- escudo: una losa de tumba
  local sh = P.shell
  G.rect(4+dx, 16+b, 18+dx, 46+b, sh and "gr1" or "gr2"); G.rect(4+dx, 16+b, 6+dx, 46+b, "gr1"); G.rect(16+dx, 16+b, 18+dx, 46+b, "gr3")
  G.ellipse(11+dx, 16+b, 7, 4, sh and "gr1" or "gr2"); G.rect(9+dx, 22+b, 13+dx, 22+b, "gr3"); G.rect(11+dx, 20+b, 11+dx, 30+b, "gr3")
  if sh then for _,p in ipairs({{2,12},{20,10},{1,40}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "ec1") end end
  -- brazo del golpe
  local sw = P.slam
  boneLine(G, 40+dx, 20+b, sw and 52+dx or 46+dx, sw and 30+b or 34+b, 3)
  G.ellipse(sw and 54+dx or 47+dx, sw and 32+b or 37+b, 5, 5, "hu1")
  -- cabeza: un cráneo enorme con corona de huesos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 24+hx, 2+hy, 2, P.pain, "ec1")
  for _,x in ipairs({26, 31, 36}) do G.line(x+hx, 2+hy, x+hx+1, -3+hy, "hu2") end
  if sw then for i=0,4 do G.line(48+dx+i*3, 44+b, 50+dx+i*3, 50+b, "gr2") end end
  return G
end

-- =====================================================================================
-- Archimago Corrupto (64x64, minijefe): viejo, túnica violeta con estrellas negras, libro que flota
-- =====================================================================================
local function archimago(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 8, 56, 61)
  if P.dead then G.ellipse(28,57,20,4,"vt2"); G.ridge(28,57,20,4,"vt1",1); G.rect(44,52,52,56,"tr2"); G.ellipse(14,56,5,3,"hu1"); return G end
  for y=20,60 do local half = 7 + math.floor((y - 20) * 0.38); G.rect(28+dx-half, math.min(60, y+b), 28+dx+half, math.min(60, y+b), (y // 8) % 2 == 0 and "vt1" or "vt2") end
  for _,p in ipairs({{20,36},{34,44},{24,52},{38,30},{16,48}}) do G.px(p[1]+dx, p[2]+b, "ne3"); G.px(p[1]+dx+1, p[2]+b, "ec2") end
  G.rect(26+dx, 22+b, 30+dx, 60, "vt3")
  -- barba blanca larga y capucha
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(30+hx, 12+hy, 10, 10, "vt2"); G.ellipse(32+hx, 14+hy, 6, 7, "gu1")
  for y=18,34 do local w = math.max(1, 6 - (y - 18) // 3); G.rect(32+hx-w, y+hy, 32+hx+w, y+hy, "W") end
  eye(G, 33+hx, 12+hy, "ec1", P.pain); eye(G, 36+hx, 12+hy, "ec1", P.pain)
  for x=20,40,4 do G.px(x+hx, 4+hy, "go2") end
  -- báculo con el ojo del eclipse
  G.thick(46+dx, 8+b, 44+dx, 60, 2, "tr2"); G.ellipse(46+dx, 8+b, 5, 5, "ne2"); G.ellipse(46+dx, 8+b, 3, 3, P.cast and "ec1" or "ec2"); G.px(47+dx, 8+b, "K")
  G.thick(36+dx, 28+b, 44+dx, 30+b, 3, "vt1")
  -- el libro prohibido flota delante
  local by = P.cast and -6 or 0
  G.rect(12+dx, 30+b+by, 24+dx, 38+b+by, "ne1"); G.rect(13+dx, 31+b+by, 18+dx, 37+b+by, "hu1"); G.rect(19+dx, 31+b+by, 23+dx, 37+b+by, "hu1")
  for y=33,36 do G.px(15+dx, y+b+by, "ec2"); G.px(21+dx, y+b+by, "ec2") end
  if P.cast then for _,p in ipairs({{16,22},{22,18},{10,26}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "ec1") end; for _,r in ipairs({8, 11}) do G.ellipse(46+dx, 8+b, r, r, "ec2"); G.ellipse(46+dx, 8+b, r - 1, r - 1, "vt3") end; G.ellipse(46+dx, 8+b, 3, 3, "ec1") end
  return G
end

-- =====================================================================================
-- Centinela de la Muerte (64x64, minijefe): esqueleto alto con capucha y una guadaña de hueso
-- =====================================================================================
local function centinela(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 58, 61)
  if P.dead then G.ellipse(28,57,20,4,"ne2"); skull(G, 40, 48, 1.5, true); G.line(4,60,50,52,"hu2"); G.ellipse(52,52,5,3,"hu1"); return G end
  -- túnica negra rasgada
  for y=14,60 do local half = 6 + math.floor((y - 14) * 0.32); G.rect(27+dx-half, math.min(60, y+b), 27+dx+half, math.min(60, y+b), (y // 6) % 2 == 0 and "ne1" or "ne2") end
  for x=14,40,5 do G.line(x+dx, 58, x+dx+2, 61, "ne3") end
  G.rect(22+dx, 24+b, 32+dx, 40+b, "ne3"); for y=26,38,4 do G.rect(23+dx, y+b, 31+dx, y+b, "hu2") end
  -- capucha con la calavera adentro
  G.ellipse(29+dx, 10+b, 10, 10, "ne2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 24+hx, 4+hy, 1.5, P.pain, "sl1")
  -- la guadaña
  local sw = P.swing
  if sw then
    boneLine(G, 36+dx, 22+b, 44+dx, 28+b, 2); G.thick(28+dx, 40+b, 60+dx, 16+b, 2, "hu2")
    for i=0,14 do local t = i / 14; G.thick(60+dx - t*6, 16+b + t*18, 60+dx - t*6 + 2, 16+b + t*18 + 2, 2, "hu1") end
    for i=0,4 do G.line(40+dx, 46+b+i*3, 62+dx, 40+b+i*3, "sl2") end
  else
    boneLine(G, 36+dx, 22+b, 42+dx, 30+b, 2); G.thick(44+dx, 4+b, 42+dx, 60, 2, "hu2")
    for i=0,12 do local t = i / 12; G.thick(44+dx - t*20, 4+b + t*6, 44+dx - t*20, 4+b + t*6 + 2, 2, "hu1") end
  end
  if P.shell then for _,p in ipairs({{8,20},{50,14},{12,44}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 3, "hu1") end end
  return G
end

-- =====================================================================================
-- Lich Ancestral (64x64, jefe): el sumo sacerdote de Aethra, esqueleto con corona y túnica blanca y oro
-- gastada, báculo con el orbe del eclipse
-- =====================================================================================
local function lich(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 58, 61)
  if P.dead then G.ellipse(28,57,22,4,"li2"); G.ridge(28,57,22,4,"li1",1); skull(G, 40, 46, 1.5, true); G.rect(40,44,52,46,"go2"); G.ellipse(12,56,4,4,"ec2"); return G end
  -- flota un poco: la túnica no toca el suelo
  local fl = -2
  for y=18,58 do local half = 7 + math.floor((y - 18) * 0.4); local o = math.floor(math.sin(y / 4 + (P.phase or 0)) * 1.5); G.rect(28+dx-half+o, y+b+fl, 28+dx+half+o, y+b+fl, (y // 7) % 2 == 0 and "li1" or "li2") end
  for x=16,40,4 do G.line(x+dx, 56+b+fl, x+dx+1, 59+b+fl, "li3") end
  G.rect(26+dx, 20+b+fl, 30+dx, 58+b+fl, "go2"); for y=24,54,6 do G.px(28+dx, y+b+fl, "go1") end
  -- el sol de Aethra tachado por el eclipse
  G.ellipse(28+dx, 30+b+fl, 5, 5, "go2"); G.ellipse(28+dx, 30+b+fl, 4, 4, "go1"); G.ellipse(30+dx, 30+b+fl, 4, 4, "ne3")
  -- capa con hombreras de oro
  G.ellipse(18+dx, 20+b+fl, 6, 4, "go2"); G.ellipse(38+dx, 20+b+fl, 6, 4, "go2")
  -- capucha y cráneo coronado
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0) + fl
  G.ellipse(28+hx, 16+hy, 10, 9, "li2"); G.ellipse(30+hx, 16+hy, 7, 7, "ne3")
  skull(G, 24+hx, 8+hy, 1.5, P.pain, "ec1")
  G.rect(24+hx, 6+hy, 37+hx, 8+hy, "go2"); for _,x in ipairs({25, 30, 35}) do G.rect(x+hx, 2+hy, x+hx+1, 6+hy, "go1") end; G.px(30+hx, 3+hy, "R")
  -- mano huesuda y báculo con el orbe
  local cast = P.cast
  boneLine(G, 38+dx, 24+b+fl, 46+dx, 28+b+fl, 2)
  G.thick(48+dx, 6+b, 46+dx, 60, 2, "li3"); G.ellipse(48+dx, 6+b, 6, 6, "go2"); G.ellipse(48+dx, 6+b, 4, 4, cast and "ec1" or "ec2"); G.ellipse(50+dx, 6+b, 3, 3, "ne3")
  if cast then
    for _,r in ipairs({9, 13}) do G.ellipse(48+dx, 6+b, r, r, "ec2"); G.ellipse(48+dx, 6+b, r - 1, r - 1, "ne3") end
    G.ellipse(48+dx, 6+b, 4, 4, "ec1"); G.ellipse(50+dx, 6+b, 3, 3, "ne3")
    for _,p in ipairs({{8,14},{14,6},{6,30}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "sl1") end
  end
  if P.shell then for i=0,7 do local t = i / 8 * math.pi * 2; G.ellipse(28+dx + math.cos(t)*22, 34+b + math.sin(t)*16, 1.5, 1.5, "ec1") end end
  return G
end

-- =====================================================================================
-- Velkan, el Encapuchado (56x56, la historia): capa gris oscura con capucha, la cara de su padre
-- debajo, una daga negra y el eclipse en la mano de la magia
-- =====================================================================================
local function velkan(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 8, 48, 53)
  if P.dead then G.ellipse(26,49,17,4,"ne1"); G.ridge(26,49,17,4,"gr2",1); G.ellipse(40,48,5,4,"cd1"); G.line(8,52,22,50,"sp2"); return G end
  -- capa
  for y=16,52 do local half = 6 + math.floor((y - 16) * 0.36); local o = (y > 40) and math.floor(math.sin(y / 3 + (P.phase or 0)) * 1.5) or 0
    G.rect(25+dx-half+o, math.min(52, y+b), 25+dx+half+o, math.min(52, y+b), (y // 7) % 2 == 0 and "ne1" or "ne2") end
  G.rect(23+dx, 20+b, 27+dx, 48+b, "ne3"); G.rect(16+dx, 30+b, 34+dx, 31+b, "tr2"); G.px(25+dx, 30+b, "sp1")
  -- capucha y la cara (los ojos de Aldren)
  G.ellipse(27+dx, 12+b, 9, 9, "ne2"); G.ellipse(29+dx, 13+b, 6, 6, "ne3")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(30+hx, 14+hy, 4, 4.5, "cd1"); G.rect(28+hx, 17+hy, 33+hx, 18+hy, "cd2")
  eye(G, 31+hx, 13+hy, "ec1", P.pain); eye(G, 33+hx, 13+hy, "ec1", P.pain)
  -- daga (brazo de adelante) y el eclipse en la otra mano
  if P.swing then G.thick(32+dx, 22+b, 42+dx, 26+b, 3, "ne1"); G.thick(42+dx, 26+b, 52+dx, 30+b, 2, "ne3"); G.line(43+dx, 25+b, 52+dx, 29+b, "ec2")
  else G.thick(32+dx, 22+b, 36+dx, 30+b, 3, "ne1"); G.thick(37+dx, 30+b, 37+dx, 40+b, 2, "ne3"); G.px(37+dx, 41+b, "ec2"); G.rect(35+dx, 29+b, 39+dx, 30+b, "sp3") end
  G.thick(18+dx, 22+b, 12+dx, 28+b, 3, "ne1")
  G.ellipse(11+dx, 29+b, 3, 3, P.cast and "ec1" or "ec2"); G.ellipse(12+dx, 28+b, 2, 2, "ne3")
  if P.cast then for _,r in ipairs({6, 9}) do G.ellipse(11+dx, 29+b, r, r, "ec2"); G.ellipse(11+dx, 29+b, r - 1, r - 1, "ne3") end; G.ellipse(11+dx, 29+b, 3, 3, "ec1"); G.ellipse(12+dx, 28+b, 2, 2, "ne3") end
  return G
end

-- =====================================================================================
-- Bufón de Hueso (48x48, el Trono de Huesos): esqueleto flaco con gorro de cascabeles morado y oro,
-- cuello de volantes y tres cráneos chicos con los que hace malabares
-- =====================================================================================
local function bufon(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then boneLine(G, 8, 43, 20, 42); boneLine(G, 22, 44, 34, 43); skull(G, 30, 36, 1, true); G.ellipse(14,41,7,3,"vt2"); G.px(10,38,"go1"); G.px(20,39,"go1"); return G end
  local k = P.phase or 0
  -- piernas flacas, una levantada (siempre bailando)
  boneLine(G, 21+dx, 31+b, 17+dx-k, 44); boneLine(G, 26+dx, 31+b, 31+dx+k, 40+b); boneLine(G, 31+dx+k, 40+b, 34+dx+k, 44)
  G.rect(19+dx, 29+b, 28+dx, 31+b, "hu2"); G.thick(23+dx, 17+b, 23+dx, 29+b, 2, "hu2")
  for y=19,25,3 do G.rect(19+dx, y+b, 27+dx, y+b, "hu1") end
  -- traje a rombos (solo un chaleco rasgado)
  G.rect(18+dx, 24+b, 28+dx, 31+b, "vt1"); for x=18,28,4 do G.px(x+dx, 26+b, "go2"); G.px(x+dx+2, 29+b, "go2") end
  -- cuello de volantes
  for i=0,4 do G.ellipse(17+dx+i*3, 16+b, 2, 2, i % 2 == 0 and "hu1" or "vt1") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 19+hx, 9+hy, 1, P.pain, "go1")
  -- gorro de dos puntas con cascabeles
  G.rect(19+hx, 8+hy, 28+hx, 10+hy, "vt2")
  G.thick(20+hx, 8+hy, 12+hx, 3+hy + (P.cast and 2 or 0), 2, "vt1"); G.thick(27+hx, 8+hy, 33+hx, 4+hy, 2, "go2")
  G.ellipse(12+hx, 3+hy + (P.cast and 2 or 0), 1.5, 1.5, "go1"); G.ellipse(33+hx, 3+hy, 1.5, 1.5, "go1")
  -- brazos y los cráneos de los malabares (en la magia los tira contra los héroes)
  local ph = (P.phase or 0) + (P.juggle or 0)
  boneLine(G, 27+dx, 18+b, 33+dx, 14+b); boneLine(G, 19+dx, 18+b, 13+dx, 14+b)
  if P.swing then
    boneLine(G, 27+dx, 18+b, 38+dx, 20+b); for i=0,2 do skull(G, 38+dx+i*3, 14+b+i*2, 0.6, false, "ec1") end
  else
    for i=0,2 do local t = (i / 3 + ph * 0.17) * math.pi * 2; skull(G, 36+dx + math.cos(t)*5, 8+b + math.sin(t)*5, 0.6, false, i == 1 and "ec1" or "K") end
  end
  if P.cast then for _,q in ipairs({{40,8},{44,18},{38,30}}) do G.ellipse(q[1]+dx, q[2]+b, 2, 2, "ec1") end end
  return G
end

-- =====================================================================================
-- Guardia Real Esquelética (48x48, el Trono de Huesos): esqueleto alto con coraza negra, yelmo de oro
-- con penacho rojo y alabarda; siempre de a dos
-- =====================================================================================
local function guardia(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then boneLine(G, 6, 43, 18, 42); G.rect(20,38,32,44,"ne1"); G.ellipse(38,40,5,4,"go2"); G.line(2,46,46,36,"sp2"); return G end
  local k = P.phase or 0
  boneLine(G, 19+dx, 31+b, 17+dx-k, 44); boneLine(G, 25+dx, 31+b, 27+dx+k, 44)
  G.rect(16+dx, 42, 20+dx-k, 44, "ne1"); G.rect(25+dx+k, 42, 29+dx+k, 44, "ne1")
  -- coraza negra con el sol de Aethra tachado y faldar
  G.rect(15+dx, 15+b, 29+dx, 30+b, "ne1"); G.rect(15+dx, 15+b, 17+dx, 30+b, "ne2"); G.rect(27+dx, 15+b, 29+dx, 30+b, "ne2")
  G.ellipse(22+dx, 21+b, 3, 3, "go2"); G.line(19+dx, 24+b, 25+dx, 18+b, "R")
  for x=15,29,3 do G.rect(x+dx, 30+b, x+dx+1, 34+b, "ne2") end
  G.ellipse(14+dx, 16+b, 4, 3, "go2"); G.ellipse(30+dx, 16+b, 4, 3, "go2")
  -- yelmo de oro con penacho
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 18+hx, 5+hy, 1, P.pain, "R")
  G.rect(17+hx, 3+hy, 27+hx, 7+hy, "go2"); G.rect(17+hx, 3+hy, 27+hx, 3+hy, "go1"); G.rect(25+hx, 7+hy, 27+hx, 11+hy, "go2")
  for i=0,5 do G.px(19+hx-i, 2+hy-(i%2), "R"); G.px(20+hx-i, 1+hy, "r") end
  -- alabarda: asta larga, hoja de hacha y punta
  if P.swing then
    boneLine(G, 27+dx, 18+b, 34+dx, 22+b); G.thick(10+dx, 30+b, 46+dx, 14+b, 2, "tr1")
    G.ellipse(42+dx, 13+b, 5, 7, "sp2"); G.ellipse(41+dx, 13+b, 3, 5, "sp1"); G.line(44+dx, 6+b, 47+dx, 4+b, "sp1")
  else
    boneLine(G, 27+dx, 18+b, 33+dx, 24+b); G.thick(35+dx, 0+b, 35+dx, 44, 2, "tr1")
    G.ellipse(39+dx, 7+b, 4, 6, "sp2"); G.ellipse(40+dx, 7+b, 2, 4, "sp1"); G.line(35+dx, 0+b, 35+dx, -4+b, "sp1")
  end
  if P.shell then G.ellipse(10+dx, 22+b, 7, 9, "ne1"); G.ellipse(10+dx, 22+b, 5, 7, "ne2"); G.ellipse(10+dx, 22+b, 2, 2, "go1") end
  return G
end

-- =====================================================================================
-- la Doncella Velada (48x48, el Trono de Huesos): una de las Veladas, hermana de Liora; luz azul con
-- velo largo, atada al trono con cadenas negras del eclipse
-- =====================================================================================
local function doncella(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    -- libre: las cadenas rotas en el suelo y la luz que sube
    chain(G, 6, 44, 20, 44, "ne1"); chain(G, 28, 44, 42, 44, "ne1"); G.ellipse(24,42,6,2,"sl2")
    for _,q in ipairs({{22,34},{26,26},{23,18},{25,10}}) do G.ellipse(q[1], q[2], 1.5, 1.5, "sl1") end
    return G
  end
  local ph = P.phase or 0
  -- vestido largo de luz que no toca el suelo
  for y=20,42 do local w = math.floor(5 + (y - 20) * 0.42); local o = math.floor(math.sin(y / 3 + ph) * 1.5); G.rect(23+dx-w+o, y+b, 23+dx+w+o, y+b, (y % 5 == 0) and "sl3" or "sl2") end
  G.rect(21+dx, 18+b, 26+dx, 30+b, "sl1")
  -- velo: le tapa la cara y cae hasta la cintura
  G.ellipse(24+dx, 10+b, 6, 7, "gh1"); G.rect(18+dx, 10+b, 30+dx, 26+b, "gh1")
  for y=13,25,3 do G.line(19+dx, y+b, 29+dx, y+b, "gh2") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  -- solo se le ven los ojos a través del velo (rojos del eclipse mientras está atada)
  eye(G, 25+hx, 10+hy, "ec1", P.pain); eye(G, 28+hx, 10+hy, "ec1", P.pain)
  -- las manos juntas con una vela apagada
  G.ellipse(24+dx, 28+b, 3, 2, "gh1"); G.rect(23+dx, 22+b, 24+dx, 27+b, "ne1")
  -- cadenas del eclipse: muñecas y cuello, tiran hacia atrás
  chain(G, 19+dx, 27+b, 2, 44, "ne1"); chain(G, 29+dx, 18+b, 4, 6, "ne1"); G.rect(18+dx, 26+b, 20+dx, 28+b, "ec2"); G.rect(22+dx, 17+b, 26+dx, 18+b, "ec2")
  if P.cast then
    G.ellipse(24+dx, 21+b, 1.5, 2.5, "sl1")
    for _,r in ipairs({7, 11}) do for a=0,359,20 do G.px(24+dx + r*math.cos(math.rad(a + ph*20)), 22+b + r*math.sin(math.rad(a + ph*20)), "sl1") end end
  end
  if P.swing then chain(G, 29+dx, 24+b, 46+dx, 18+b, "ec2") end
  return G
end

-- =====================================================================================
-- el Coloso de Huesos (64x64, jefe del Trono de Huesos): una montaña encorvada de huesos de sacerdotes,
-- con cráneos metidos en el cuerpo, mitra de oro del sumo sacerdote y un garrote hecho con una columna
-- entera; el ojo del eclipse late en el pecho
-- =====================================================================================
local function coloso(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 2, 62, 61)
  if P.dead then
    -- se desarma en una pila de huesos
    for _,q in ipairs({{4,58,22,55},{18,60,40,57},{36,58,56,60},{10,54,30,52},{40,54,58,55}}) do boneLine(G, q[1], q[2], q[3], q[4], 3) end
    for _,q in ipairs({{8,48},{24,46},{44,47}}) do skull(G, q[1], q[2], 1, true) end
    G.rect(30,44,40,48,"go2"); G.ellipse(52,50,4,4,"ec2"); return G
  end
  local k = P.phase or 0
  -- piernas cortas y gruesas de fémures atados
  boneLine(G, 22+dx, 44+b, 18+dx-k, 60, 5); boneLine(G, 38+dx, 44+b, 42+dx+k, 60, 5)
  G.ellipse(18+dx-k, 60, 5, 2, "hu2"); G.ellipse(42+dx+k, 60, 5, 2, "hu2")
  -- el cuerpo: un bulto de huesos con cráneos incrustados
  G.ellipse(30+dx, 34+b, 20, 15, "hu2"); G.ellipse(28+dx, 31+b, 16, 10, "hu1")
  for i=0,10 do local t = i * 0.57; G.line(30+dx + math.cos(t)*8, 34+b + math.sin(t)*6, 30+dx + math.cos(t)*18, 34+b + math.sin(t)*13, "hu3") end
  for _,q in ipairs({{14,33},{40,26},{18,42},{38,40},{22,22}}) do skull(G, q[1]+dx, q[2]+b, 0.75, P.pain, "sl2") end
  -- el ojo del eclipse en el pecho
  G.ellipse(30+dx, 34+b, 5, 4, "ec2"); G.ellipse(30+dx, 34+b, 3, 2, P.cast and "W" or "ec1"); G.px(30+dx, 34+b, "ne3")
  -- estola de oro del sumo sacerdote cruzada
  G.thick(14+dx, 24+b, 44+dx, 46+b, 2, "go2"); for i=0,6 do G.px(16+dx+i*4, 26+b+i*3.1, "go1") end
  -- cabeza chica hundida entre los hombros, con la mitra de oro
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 26+hx, 11+hy, 1.5, P.pain, "ec1")
  G.rect(27+hx, 7+hy, 37+hx, 11+hy, "go2"); G.rect(29+hx, 3+hy, 35+hx, 7+hy, "go2"); G.line(32+hx, 3+hy, 32+hx, 11+hy, "go1"); G.px(32+hx, 8+hy, "R")
  -- brazo de atrás: una mano enorme que arrastra
  boneLine(G, 14+dx, 28+b, 8+dx, 42+b, 4); G.ellipse(7+dx, 46+b, 5, 4, "hu1"); for i=0,3 do G.line(4+dx+i*2, 48+b, 3+dx+i*2, 52+b, "hu2") end
  -- brazo del garrote: una columna vertebral entera con un cráneo de punta
  if P.slam then
    boneLine(G, 46+dx, 26+b, 54+dx, 34+b, 4)
    for i=0,8 do G.ellipse(55+dx + i*0.6, 34+b + i*2.8, 3, 1.5, i % 2 == 0 and "hu1" or "hu2") end
    skull(G, 54+dx, 56, 1, false, "ec1")
    for i=0,4 do G.line(44+dx+i*4, 61, 46+dx+i*4, 56, "gr2") end
  else
    boneLine(G, 46+dx, 26+b, 52+dx, 36+b, 4)
    for i=0,8 do G.ellipse(54+dx - i*0.4, 33+b - i*2.6, 3, 1.5, i % 2 == 0 and "hu1" or "hu2") end
    skull(G, 49+dx, 2+b, 1, false, "ec1")
  end
  -- escudo: huesos que giran alrededor y lo tapan
  if P.shell then for i=0,9 do local t = i / 10 * math.pi * 2 + (P.phase or 0); boneLine(G, 30+dx + math.cos(t)*24, 34+b + math.sin(t)*20, 30+dx + math.cos(t + 0.3)*24, 34+b + math.sin(t + 0.3)*20, 2) end end
  return G
end

-- =====================================================================================
-- animaciones (idle 2, attack 3, cast 3, hurt 1, die 2)
-- =====================================================================================
local function walker(bite)
  return {
    {"idle",   {{bob=0,phase=0,dur=440},{bob=1,phase=1,dur=440}}},
    {"attack", {{bob=-1,hx=-2,dur=220},{dx=4,phase=1,[bite]=true,dur=160},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-1,hy=-1,dur=220},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }
end
local MONSTERS = {
  {key="rata_osario", size=48, draw=rata, anims=walker("bite")},
  {key="murcielago_vampiro", size=48, draw=murcielago, anims={
    {"idle",   {{bob=0,wing=0,dur=260},{bob=-2,wing=1,dur=260}}},
    {"attack", {{bob=-3,wing=1,dur=180},{dx=5,bite=true,wing=0,dur=150},{dx=1,wing=1,dur=220}}},
    {"cast",   {{bob=-2,wing=1,dur=200},{dx=3,cast=true,bite=true,wing=0,dur=300},{cast=true,wing=1,dur=220}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=3,wing=0,pain=true,dur=200},{dead=true,dur=1100}}},
  }},
  {key="esqueleto_guerrero", size=48, draw=esqueleto, anims={
    {"idle",   {{bob=0,phase=0,dur=480},{bob=1,phase=0,dur=480}}},
    {"attack", {{bob=-1,hx=-1,dur=240},{dx=3,swing=true,phase=1,dur=170},{dx=1,swing=true,dur=240}}},
    {"cast",   {{bob=-1,dur=200},{shell=true,dur=320},{shell=true,bob=1,dur=220}}},
    {"hurt",   {{dx=-3,hy=-1,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="zombie_anciano", size=48, draw=zombie, anims=walker("bite")},
  {key="arana_tumba", size=48, draw=arana, anims=walker("bite")},
  {key="hongo_palido", size=48, draw=hongo, anims=walker("bite")},
  {key="fantasma_encadenado", size=48, draw=fantasma, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-2,phase=2,dur=420}}},
    {"attack", {{bob=-2,hx=-2,phase=1,dur=220},{dx=4,cast=true,phase=2,dur=170},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-2,phase=1,dur=220},{cast=true,phase=2,dur=320},{cast=true,phase=3,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="gul_hambriento", size=48, draw=gul, anims=walker("swing")},
  {key="cadaver_reanimado", size=48, draw=cadaver, anims=walker("swing")},
  {key="alma_en_pena", size=48, draw=alma, anims={
    {"idle",   {{bob=0,phase=0,dur=400},{bob=-2,phase=2,dur=400}}},
    {"attack", {{bob=-2,hx=-2,phase=1,dur=200},{dx=4,cast=true,phase=2,dur=170},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-3,phase=1,dur=220},{cast=true,phase=2,dur=320},{cast=true,phase=3,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="sacerdote_maldito", size=48, draw=sacerdote, anims=walker("cast")},
  {key="inquisidor_eclipse", size=48, draw=inquisidor, anims=walker("cast")},
  {key="gusano_cripta", size=56, draw=gusano, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1.5,dur=420}}},
    {"attack", {{bob=1,hx=-3,dur=240},{lunge=true,phase=1,dur=180},{dx=1,phase=0,dur=260}}},
    {"cast",   {{bob=-2,dur=220},{cast=true,bob=2,dur=300},{cast=true,bob=1,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=280}}},
    {"die",    {{bob=3,pain=true,dur=260},{dead=true,dur=1200}}},
  }},
  {key="caballero_sin_rostro", size=56, draw=caballero, anims={
    {"idle",   {{bob=0,phase=0,dur=500},{bob=1,phase=0,dur=500}}},
    {"attack", {{bob=1,hx=-1,dur=240},{dx=3,swing=true,phase=1,dur=170},{dx=1,swing=true,dur=260}}},
    {"cast",   {{bob=-1,dur=220},{shell=true,dur=320},{shell=true,swing=true,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=280}}},
    {"die",    {{bob=3,pain=true,dur=260},{dead=true,dur=1200}}},
  }},
  {key="guardian_abismo", size=64, draw=guardian, anims={
    {"idle",   {{bob=0,dur=560},{bob=1,dur=560}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=3,slam=true,phase=1,dur=180},{dx=1,slam=true,dur=300}}},
    {"cast",   {{bob=-1,dur=220},{shell=true,dur=340},{shell=true,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }},
  {key="archimago_corrupto", size=64, draw=archimago, anims={
    {"idle",   {{bob=0,dur=520},{bob=-1,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=260},{dx=2,cast=true,dur=220},{dx=1,dur=260}}},
    {"cast",   {{bob=-1,dur=240},{cast=true,dur=360},{cast=true,bob=-1,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }},
  {key="centinela_muerte", size=64, draw=centinela, anims={
    {"idle",   {{bob=0,dur=600},{bob=1,dur=600}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=3,swing=true,dur=200},{dx=1,swing=true,dur=300}}},
    {"cast",   {{bob=-1,dur=240},{swing=true,shell=true,dur=340},{shell=true,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
  }},
  {key="velkan", size=56, draw=velkan, anims={
    {"idle",   {{bob=0,phase=0,dur=460},{bob=1,phase=1,dur=460}}},
    {"attack", {{bob=-1,hx=-2,dur=220},{dx=4,swing=true,phase=1,dur=160},{dx=1,swing=true,dur=240}}},
    {"cast",   {{bob=-1,dur=220},{cast=true,phase=0,dur=320},{cast=true,bob=-1,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1200}}},
  }},
  {key="lich_ancestral", size=64, draw=lich, anims={
    {"idle",   {{bob=0,phase=0,dur=600},{bob=-1,phase=2,dur=600}}},
    {"attack", {{bob=-1,hx=-1,phase=1,dur=300},{dx=2,cast=true,phase=2,dur=200},{dx=1,phase=3,dur=300}}},
    {"cast",   {{bob=-1,phase=1,dur=240},{cast=true,phase=2,dur=360},{cast=true,shell=true,phase=3,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
  }},
  -- el Trono de Huesos
  {key="tronoh_bufon", size=48, draw=bufon, anims={
    {"idle",   {{bob=0,phase=0,dur=300},{bob=-1,phase=1,dur=300},{bob=0,phase=2,dur=300}}},
    {"attack", {{bob=-2,hx=-2,phase=0,dur=200},{dx=4,swing=true,phase=1,dur=160},{dx=1,phase=2,dur=240}}},
    {"cast",   {{bob=-1,phase=0,dur=220},{cast=true,phase=1,juggle=2,dur=300},{cast=true,phase=2,juggle=4,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="tronoh_guardia", size=48, draw=guardia, anims={
    {"idle",   {{bob=0,phase=0,dur=520},{bob=1,phase=0,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=260},{dx=3,swing=true,phase=1,dur=180},{dx=1,swing=true,dur=260}}},
    {"cast",   {{bob=-1,dur=220},{shell=true,dur=320},{shell=true,bob=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="tronoh_doncella", size=48, draw=doncella, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-2,phase=2,dur=420}}},
    {"attack", {{bob=-2,hx=-2,phase=1,dur=220},{dx=4,swing=true,phase=2,dur=170},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-2,phase=1,dur=220},{cast=true,phase=2,dur=320},{cast=true,phase=3,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1300}}},
  }},
  {key="tronoh_coloso", size=64, draw=coloso, anims={
    {"idle",   {{bob=0,phase=0,dur=620},{bob=1,phase=0,dur=620}}},
    {"attack", {{bob=-1,hx=-1,dur=320},{dx=3,slam=true,phase=1,dur=200},{dx=1,slam=true,dur=320}}},
    {"cast",   {{bob=-1,dur=240},{cast=true,shell=true,phase=0,dur=340},{cast=true,shell=true,phase=0.4,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1500}}},
  }},
}

local dir = app.params.dir
local solo = app.params.solo
local manifest = {}
for _,m in ipairs(MONSTERS) do
  if not solo or solo:find(m.key, 1, true) then
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
    spr:saveAs(dir .. "/zona6/" .. m.key .. ".aseprite")
    spr:close()
    local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
    for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
    local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
    out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
    out:saveCopyAs(dir .. "/enemigos/" .. m.key .. ".png")
    out:close()
    manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
  end
end
local fh = io.open(dir .. "/enemigos_catacumbas.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
