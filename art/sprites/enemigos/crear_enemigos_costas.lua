-- Enemigos de las Costas Muertas (zona 4, nivel 46-60): uno o dos propios por subzona.
--   cangrejo_gigante     Cangrejo Gigante (Playa de Ceniza Negra)
--   gaviota_carronera    Gaviota Carroñera (Playa y Delta de Vapor)
--   pirata_sin_nombre    Pirata Sin Nombre (Cala de los Piratas y Cementerio de Barcos)
--   cangrejo_vapor       Cangrejo de Vapor (Delta de Vapor)
--   pirana_agua          Piraña del Manglar (Manglar de los Susurros)
--   cocodrilo_manglar    Cocodrilo del Manglar (Manglar de los Susurros)
--   medusa_abisal        Medusa Abisal (Rocas de las Sirenas y Arrecife Blanco)
--   sirena_corrupta      Sirena Corrupta (Rocas de las Sirenas)
--   golem_coral          Gólem de Coral (Arrecife Blanco)
--   marinero_maldito     Marinero Maldito (Cementerio de Barcos)
--   acolito_marea        Acólito de la Marea (Faro Negro)
--   calamar_abismo       Calamar del Abismo (Faro Negro y Fosa del Abismo)
--   leviatan_menor       Leviatán Menor, raro, 56x56
--   capitan_pirata       Capitana Velanegra, rara, 56x56
--   almirante_ahogado    Almirante Ahogado, minijefe, 64x64
--   bestia_profundidades Bestia de las Profundidades, jefe, 64x64
-- Mismo estilo que crear_enemigos_volcan.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona4/<clave>.aseprite y
-- enemigos_costas.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_costas.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", R="c0343a", r="7a1f2a", Y="e8c050", y="a8802c", O="e88a3a",
  m1="b8c0cc", m2="7a8290", m3="4a505e", w1="8a5a3a", w2="5e3a22", w3="3e2616", T="eee0c0", t="b8a880",
  s1="d8b090", s2="a88468", s3="7a5a44",
  -- agua y espuma (brillan: sin contorno)
  wa1="d8f6ee", wa2="8ad8d0", wa3="4aa8a8",
  -- cangrejo gigante: gris verdoso con percebes
  cg1="8ea496", cg2="627a6c", cg3="40544a", cgp="ddd4c2",
  -- cangrejo de vapor
  cv1="e8643c", cv2="b03c26", cv3="722416", vp1="f2f6f8", vp2="c4ced6",
  -- gaviota
  gw1="f6f8fa", gw2="ccd2da", gw3="8e96a2",
  -- piraña
  pg1="8e9e7e", pg2="62725a", pg3="3e4a38", pr="d8503a",
  -- cocodrilo
  cc1="728e4c", cc2="4e6634", cc3="30421f", ccb="cec68e",
  -- medusa (brilla)
  me1="d2acff", me2="a274ea", me3="6e40b8", meh="f6eeff",
  -- sirena
  si1="bcdccc", si2="8cb2a2", si3="5e8676", sc1="3c9e8e", sc2="287470", sc3="184c48", ha1="6e3ea6", ha2="462276", ec1="e2a6ff",
  -- coral
  cl1="f8eee2", cl2="f2aca4", cl3="d87e7c", cl4="a85062", fi="f2c040",
  -- ahogados
  dm1="9eb4ac", dm2="70867e", dm3="4c5c56", nv1="3c4c6e", nv2="28344e", nv3="1a2236", sw1="5a8a42", sw2="3a6a2a",
  -- acólito
  at1="2e5c6c", at2="1e3e4c", at3="122a34",
  -- calamar
  sq1="cc5a6c", sq2="963a4e", sq3="602434", sqh="f2a6b0", ink="221a26",
  -- leviatán y bestia
  lv1="3e8eb4", lv2="286c8c", lv3="184c64", lvb="aee2ea", lvf="62bcd4", bd1="2c5a7a", bd2="1c3e58", bd3="102a3e",
  -- Velanegra
  ve1="3c3842", ve2="26222a", ve3="141218",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, wa1=true, wa2=true, vp1=true, vp2=true, me1=true, meh=true, ec1=true, fi=true}

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

-- =====================================================================================
-- Cangrejo Gigante (48x48): caparazón ancho con percebes y una pinza enorme
-- =====================================================================================
local function cangrejoBase(P, c1, c2, c3, deco)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(23,41,14,4,c2); G.ridge(23,41,14,4,c1,2)
    for _,x in ipairs({10,15,31,36}) do G.line(x,43,x+(x < 24 and -3 or 3),45,c3) end
    G.ellipse(40,42,5,3,c2); G.px(22,38,"K"); G.px(26,38,"K")
    return G
  end
  local ph = P.phase or 0
  -- patas: cuatro por lado, se ven las de adelante
  for i,x in ipairs({11,16,30,35}) do
    local up = ((i + ph) % 2 == 0) and 1 or 0
    local out = x < 24 and -4 or 4
    G.line(x+dx, 36+b, x+dx+out, 40+b-up, c3); G.line(x+dx+out, 40+b-up, x+dx+out, 45, c3)
  end
  -- caparazón
  G.ellipse(23+dx, 32+b, 15, 8, c2); G.ridge(23+dx, 32+b, 15, 8, c1, 3); G.ellipse(23+dx, 37+b, 12, 2, c3)
  deco(G, dx, b, ph)
  -- ojos en palitos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.line(27+hx, 25+hy, 27+hx, 20+hy, c3); G.line(31+hx, 25+hy, 31+hx, 21+hy, c3)
  eye(G, 27+hx, 19+hy, "K", false); eye(G, 31+hx, 20+hy, "K", false)
  if P.pain then G.px(27+hx, 19+hy, "W"); G.px(31+hx, 20+hy, "W") end
  -- pinza trasera chica
  G.ellipse(8+dx, 31+b, 4, 3, c2); G.line(5+dx, 29+b, 3+dx, 27+b, c1)
  -- pinza grande, levantada delante de la cara
  local px, py = 39+dx, 19+b
  if P.snap then px, py = 41+dx, 24+b end
  G.thick(33+dx, 31+b, px-3, py+4, 4, c2); G.ellipse(px-3, py+5, 2, 2, c3)
  G.ellipse(px, py, 6, 5, c2); G.ridge(px, py, 6, 5, c1, 2); G.px(px-2, py+2, c3)
  if P.snap then
    G.thick(px+3, py-2, px+8, py-1, 3, c1); G.thick(px+3, py+2, px+8, py+1, 3, c2)
  else
    G.thick(px+3, py-3, px+7, py-8, 3, c1); G.px(px+7, py-9, c1)
    G.thick(px+4, py+1, px+8, py-2, 3, c2)
  end
  return G
end
local function cangrejo(P)
  if P.shell then
    -- se esconde en el caparazón (Cerrar el Caparazón)
    local G = newGrid(48, 48, 45)
    G.ellipse(24, 38, 15, 8, "cg2"); G.ridge(24, 38, 15, 8, "cg1", 3); G.ellipse(24, 44, 13, 1, "cg3")
    for _,p in ipairs({{16,33},{24,31},{31,34},{20,37}}) do G.ellipse(p[1], p[2], 2, 1.5, "cgp"); G.px(p[1], p[2], "cg3") end
    G.line(6, 30, 9, 33, "wa1"); G.line(42, 30, 39, 33, "wa1")
    return G
  end
  return cangrejoBase(P, "cg1", "cg2", "cg3", function(G, dx, b)
    for _,p in ipairs({{15,28},{22,26},{29,27},{19,31}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 1.5, "cgp"); G.px(p[1]+dx, p[2]+b, "cg3") end
    G.px(12+dx, 31+b, "sw1"); G.px(13+dx, 30+b, "sw1")
  end)
end
-- Cangrejo de Vapor (48x48): rojo, con vapor que le sale de la espalda
local function cangrejoVapor(P)
  local G = cangrejoBase(P, "cv1", "cv2", "cv3", function(G, dx, b, ph)
    for _,p in ipairs({{16,27},{24,25},{30,27}}) do G.px(p[1]+dx, p[2]+b, "cv3") end
  end)
  if not P.dead then
    local dx, b, ph = P.dx or 0, P.bob or 0, P.phase or 0
    for k,p in ipairs({{14,20,3},{20,15,4},{26,18,3}}) do G.ellipse(p[1]+dx, p[2]+b-(k+ph)%2, p[3], p[3]-1, (k % 2 == 0) and "vp1" or "vp2") end
    if P.cast then for i=0,4 do G.ellipse(44+dx+i, 24+b-i*2, 2.5-i*0.3, 2, i < 2 and "vp2" or "vp1") end end
  end
  return G
end

-- =====================================================================================
-- Gaviota Carroñera (48x48): gaviota gorda y descarada, alas abiertas
-- =====================================================================================
local function gaviota(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(22,42,10,3,"gw2"); G.ridge(22,42,10,3,"gw1",2); G.thick(8,43,16,40,3,"gw3")
    G.rect(32,41,37,42,"Y"); G.px(26,40,"K"); G.line(18,45,20,43,"O")
    return G
  end
  local wing = P.wing or 0
  local hy0 = P.dive and 4 or 0
  -- patas
  if not P.dive then G.line(20+dx, 38+b, 19+dx, 45, "O"); G.line(25+dx, 38+b, 26+dx, 45, "O"); G.rect(17+dx, 45, 21+dx, 45, "O"); G.rect(24+dx, 45, 28+dx, 45, "O") end
  -- ala trasera
  if wing == 1 then G.thick(18+dx, 26+b+hy0, 6+dx, 10+b+hy0, 4, "gw3") else G.thick(18+dx, 28+b+hy0, 4+dx, 30+b+hy0, 4, "gw3") end
  -- cuerpo
  G.ellipse(22+dx, 31+b+hy0, 10, 7, "gw1"); G.ridge(22+dx, 31+b+hy0, 10, 7, "gw2", 2)
  G.thick(12+dx, 32+b+hy0, 5+dx, 30+b+hy0, 3, "gw3"); G.px(4+dx, 30+b+hy0, "K")
  -- ala delantera
  if wing == 1 then
    G.thick(22+dx, 26+b+hy0, 14+dx, 6+b+hy0, 5, "gw2"); G.line(14+dx, 6+b+hy0, 8+dx, 4+b+hy0, "gw3"); G.line(16+dx, 8+b+hy0, 11+dx, 3+b+hy0, "K")
  else
    G.thick(22+dx, 29+b+hy0, 10+dx, 36+b+hy0, 5, "gw2"); G.line(10+dx, 36+b+hy0, 5+dx, 38+b+hy0, "K")
  end
  -- cabeza y pico
  local hx, hy = dx + (P.hx or 0), b + hy0 + (P.hy or 0)
  G.ellipse(31+hx, 22+hy, 5, 5, "gw1")
  G.rect(35+hx, 22+hy, 41+hx, 23+hy, "Y"); G.px(41+hx, 24+hy, "R"); G.rect(35+hx, 24+hy, 39+hx, 24+hy, P.cry and "r" or "Y")
  if P.cry then G.rect(36+hx, 25+hy, 39+hx, 26+hy, "Y"); for i=0,2 do G.px(43+hx+i, 20+hy-i*2, "wa1") end end
  eye(G, 32+hx, 20+hy, "Y", P.pain); G.px(31+hx, 19+hy, "gw3")
  return G
end

-- =====================================================================================
-- Pirata Sin Nombre (48x48): pañuelo rojo, parche, chaleco y un pistolón oxidado
-- =====================================================================================
local function pirata(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,14,3,"w3"); G.rect(10,39,30,41,"T"); G.rect(10,39,14,41,"R"); G.ellipse(34,40,5,3,"s2"); G.rect(32,36,38,38,"R")
    G.rect(4,43,9,44,"m3")
    return G
  end
  local shoot = P.shoot
  -- piernas con botas
  G.thick(20+dx, 33+b, 18+dx, 42, 3, "nv2"); G.thick(27+dx, 33+b, 29+dx, 42, 3, "nv2")
  G.rect(15+dx, 41, 21+dx, 45, "w3"); G.rect(26+dx, 41, 32+dx, 45, "w3")
  -- brazo trasero con la botella
  G.thick(17+dx, 22+b, 13+dx, 31+b, 3, "s2"); G.rect(11+dx, 30+b, 13+dx, 35+b, "sw2"); G.px(12+dx, 29+b, "w1")
  -- torso: camisa a rayas, chaleco y faja roja
  G.rect(17+dx, 20+b, 30+dx, 33+b, "T"); for y=21,32,3 do G.rect(21+dx, y+b, 26+dx, y+b, "nv1") end
  G.rect(17+dx, 20+b, 20+dx, 33+b, "w1"); G.rect(27+dx, 20+b, 30+dx, 33+b, "w1")
  G.rect(17+dx, 30+b, 30+dx, 32+b, "R"); G.px(30+dx, 33+b, "R")
  -- cabeza: pañuelo rojo, parche, barba
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 13+hy, 6, 6, "s1"); G.ridge(24+hx, 13+hy, 7, 7, "R", 3); G.px(17+hx, 10+hy, "R"); G.px(16+hx, 12+hy, "R")
  G.rect(22+hx, 16+hy, 30+hx, 19+hy, "w2"); G.px(31+hx, 17+hy, "w2")
  G.rect(23+hx, 11+hy, 26+hx, 13+hy, "K"); G.line(20+hx, 10+hy, 29+hx, 10+hy, "K")
  eye(G, 28+hx, 12+hy, "W", P.pain); G.px(30+hx, 15+hy, "s3")
  -- brazo con el pistolón
  local ax, ay = shoot and 38+dx or 33+dx, shoot and 20+b or 26+b
  G.thick(29+dx, 22+b, ax, ay, 3, "s1")
  G.rect(ax, ay-2, ax+6, ay, "m3"); G.rect(ax+1, ay+1, ax+2, ay+3, "w2"); G.px(ax+6, ay-2, "m2")
  if shoot then G.ellipse(ax+9, ay-1, 2, 2, "Y"); G.px(ax+9, ay-1, "W"); for i=1,3 do G.px(ax+11+i*2, ay-1, "m2") end end
  return G
end

-- =====================================================================================
-- Piraña del Manglar (48x48): tres pirañas saltando del agua
-- =====================================================================================
local function pirana(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  G.splash(4, 44, 44, P.phase)
  if P.dead then
    G.ellipse(24,42,7,3,"pg2"); G.ridge(24,42,7,3,"pg1",1); G.ellipse(24,44,5,1,"pr"); G.px(29,41,"K"); G.line(16,41,14,39,"pg3")
    return G
  end
  local function fish(x, y, s, bite, pain)
    G.ellipse(x, y, 7*s, 5*s, "pg2"); G.ridge(x, y, 7*s, 5*s, "pg1", 2); G.ellipse(x, y + 3*s, 5*s, 2*s, "pr")
    G.line(x - 7*s, y, x - 11*s, y - 4*s, "pg3"); G.line(x - 7*s, y, x - 11*s, y + 4*s, "pg3"); G.line(x - 11*s, y - 4*s, x - 11*s, y + 4*s, "pg3")
    G.line(x - 2*s, y - 5*s, x + 2*s, y - 8*s, "pg3")
    eye(G, x + 4*s, y - 2*s, "Y", pain)
    if bite then G.rect(x + 5*s, y + 1, x + 8*s, y + 2*s, "K"); for k=0,2 do G.px(x + 5*s + k*2, y + 1, "W") end
    else for k=0,2 do G.px(x + 4*s + k, y + 2*s, "W") end end
  end
  local ph = P.phase or 0
  local bite = P.bite
  fish(14+dx, 30+b-(ph % 2)*2, 0.8, bite, P.pain)
  fish(36+dx+(bite and 3 or 0), 26+b+(ph % 2)*2, 1.0, bite, P.pain)
  fish(24+dx, 38+b, 0.7, false, P.pain)
  for k,p in ipairs({{8,22},{30,16},{42,34}}) do if (k + ph) % 2 == 0 then G.px(p[1]+dx, p[2]+b, "wa1") end end
  return G
end

-- =====================================================================================
-- Cocodrilo del Manglar (48x48): bajo, largo, hocico lleno de dientes
-- =====================================================================================
local function cocodrilo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  G.splash(2, 46, 45, P.phase)
  if P.dead then
    G.ellipse(22,42,16,3,"cc2"); G.ridge(22,42,16,3,"cc1",2); G.ellipse(22,44,12,1,"ccb"); G.rect(36,41,45,43,"cc2"); G.px(37,40,"K")
    return G
  end
  local roll = P.roll
  -- cola
  for i=0,12 do G.ellipse(10+dx-i*0.8, 40+b-math.sin(i*0.5+(P.phase or 0))*1.5, 4-i*0.25, 3-i*0.15, "cc2") end
  -- patas
  for _,x in ipairs({14,30}) do G.thick(x+dx, 40+b, x+dx-2, 45, 3, "cc3") end
  -- cuerpo
  G.ellipse(22+dx, 38+b, 14, 5, roll and "ccb" or "cc2"); G.ridge(22+dx, 38+b, 14, 5, roll and "cc2" or "cc1", 2)
  if not roll then for x=12,32,4 do G.px(x+dx, 33+b, "cc3"); G.px(x+1+dx, 34+b, "cc1") end; G.ellipse(22+dx, 42+b, 11, 1, "ccb")
  else G.ellipse(22+dx, 35+b, 10, 1, "cc3") end
  -- cabeza y hocico
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  local open = P.bite or roll
  G.ellipse(37+hx, 36+hy, 5, 4, "cc2"); G.ridge(37+hx, 36+hy, 5, 4, "cc1", 1)
  eye(G, 37+hx, 32+hy, "Y", P.pain); G.px(36+hx, 31+hy, "cc3")
  if open then
    G.rect(40+hx, 31+hy, 47+hx, 33+hy, "cc1"); G.rect(40+hx, 38+hy, 47+hx, 40+hy, "cc2"); G.rect(40+hx, 34+hy, 47+hx, 37+hy, "r")
    for x=41,47,2 do G.px(x+hx, 34+hy, "W"); G.px(x+hx, 37+hy, "W") end
  else
    G.rect(40+hx, 34+hy, 47+hx, 38+hy, "cc2"); G.rect(40+hx, 34+hy, 47+hx, 35+hy, "cc1"); for x=41,47,2 do G.px(x+hx, 38+hy, "W") end
  end
  return G
end

-- =====================================================================================
-- Medusa Abisal (48x48): campana morada que brilla, filamentos eléctricos
-- =====================================================================================
local function medusa(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 2
  G.splash(8, 40, 45, P.phase)
  if P.dead then
    G.ellipse(24,42,12,3,"me3"); G.ellipse(24,41,9,2,"me2"); for x=14,34,4 do G.line(x,43,x+2,45,"me3") end
    return G
  end
  local ph = P.phase or 0
  -- filamentos
  for i,x in ipairs({14,19,24,29,34}) do
    for y=0,16 do G.px(x+dx+math.sin(y*0.5+ph+i)*1.5, 26+b+y, (y % 4 == 0) and "me1" or "me3") end
  end
  -- campana
  G.ellipse(24+dx, 20+b, 13, 10, "me2"); G.ridge(24+dx, 20+b, 13, 10, "me1", 3)
  G.rect(11+dx, 24+b, 37+dx, 26+b, "me3"); for x=12,36,4 do G.px(x+dx, 27+b, "me3") end
  G.ellipse(24+dx, 18+b, 5, 4, "meh"); G.ellipse(24+dx, 18+b, 3, 2, "me1")
  -- cara
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if P.pain then G.px(20+hx, 21+hy, "K"); G.px(28+hx, 21+hy, "K") else G.rect(20+hx, 20+hy, 21+hx, 22+hy, "K"); G.rect(27+hx, 20+hy, 28+hx, 22+hy, "K") end
  -- descarga
  if P.cast then
    for i=0,6 do G.px(38+dx+i*1.3, 16+b+((i % 2 == 0) and -2 or 2), "Y"); G.px(39+dx+i*1.3, 16+b+((i % 2 == 0) and -1 or 1), "W") end
    for _,p in ipairs({{8,12},{40,8},{6,30}}) do G.px(p[1]+dx, p[2]+b, "Y") end
  end
  return G
end

-- =====================================================================================
-- Sirena Corrupta (48x48): sentada en una roca, cola de pez, ojos morados
-- =====================================================================================
local function sirena(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  -- roca
  G.ellipse(20, 41, 14, 5, "m3"); G.ridge(20, 41, 14, 5, "m2", 2); G.splash(2, 46, 45, P.phase)
  if P.dead then
    G.ellipse(22,36,12,3,"sc2"); G.ridge(22,36,12,3,"sc1",1); G.ellipse(34,35,4,3,"si2"); G.thick(36,33,42,32,3,"ha2")
    return G
  end
  local ph = P.phase or 0
  -- cola de pez enroscada
  G.ellipse(18+dx, 34+b, 10, 4, "sc2"); G.ridge(18+dx, 34+b, 10, 4, "sc1", 2)
  G.thick(9+dx, 33+b, 4+dx, 26+b, 4, "sc2"); G.line(4+dx, 26+b, 0+dx, 22+b, "sc1"); G.line(4+dx, 26+b, 8+dx, 21+b, "sc1"); G.line(2+dx, 24+b, 6+dx, 22+b, "sc3")
  for x=12,24,3 do G.px(x+dx, 32+b, "sc3") end
  -- torso
  G.ellipse(27+dx, 26+b, 5, 7, "si1"); G.ridge(27+dx, 26+b, 5, 7, "si1", 1); G.rect(23+dx, 23+b, 31+dx, 25+b, "sc2")
  for _,p in ipairs({{24,23},{27,24},{30,23}}) do G.px(p[1]+dx, p[2]+b, "ec1") end
  -- pelo largo morado
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(24+hx, 12+hy, 19+hx, 28+hy, 5, "ha1"); G.line(19+hx, 28+hy, 17+hx, 31+hy, "ha2")
  G.ellipse(29+hx, 14+hy, 5, 6, "si1"); G.ridge(29+hx, 14+hy, 6, 7, "ha1", 3); G.rect(24+hx, 10+hy, 27+hx, 18+hy, "ha1")
  eye(G, 31+hx, 14+hy, "ec1", P.pain); G.px(32+hx, 17+hy, "si3")
  -- brazos: uno apoyado, otro con el agua o cantando
  G.thick(24+dx, 22+b, 21+dx, 32+b, 2, "si2")
  if P.cast then
    G.thick(31+dx, 22+b, 37+dx, 15+b, 2, "si2")
    for i=0,4 do G.ellipse(39+dx+i*1.8, 14+b-i*0.4, 2.5-i*0.3, 1.8, i < 2 and "wa2" or "wa1") end
    for k,p in ipairs({{38,6},{43,9},{35,3}}) do G.px(p[1]+dx, p[2]+b-(k+ph)%2, "ec1") end
  else
    G.thick(31+dx, 22+b, 34+dx, 30+b, 2, "si2")
  end
  if P.sing then G.rect(31+hx, 17+hy, 32+hx, 18+hy, "K") end
  return G
end

-- =====================================================================================
-- Gólem de Coral (48x48): bloque de coral blanco y rosado con peces entre las ramas
-- =====================================================================================
local function golemCoral(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    for _,r in ipairs({{12,40,5,4},{24,41,6,4},{36,40,5,4},{20,36,4,3}}) do G.ellipse(r[1],r[2],r[3],r[4],"cl2"); G.px(r[1]-1,r[2]-2,"cl1") end
    G.px(30,38,"fi")
    return G
  end
  local ph = P.phase or 0
  local slam = P.slam
  -- piernas
  G.rect(15+dx, 34+b, 21+dx, 45, "cl3"); G.rect(27+dx, 34+b, 33+dx, 45, "cl3"); G.line(15+dx, 34+b, 15+dx, 44, "cl2"); G.line(27+dx, 34+b, 27+dx, 44, "cl2")
  -- torso de coral, irregular como una roca
  G.ellipse(22+dx, 27+b, 12, 9, "cl1"); G.ellipse(28+dx, 22+b, 9, 8, "cl1"); G.ridge(28+dx, 22+b, 9, 8, "W", 1)
  G.ellipse(18+dx, 31+b, 6, 4, "cl2"); G.px(16+dx, 29+b, "cl3")
  for _,p in ipairs({{17,22},{22,30},{29,24},{25,18},{31,31},{18,30}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "cl2"); G.px(p[1]+dx, p[2]+b, "cl4") end
  -- un pez que se asoma entre las ramas
  G.ellipse(20+dx+(ph % 2), 26+b, 2, 1, "fi"); G.px(17+dx+(ph % 2), 26+b, "fi")
  -- ramas en la espalda y la cabeza
  -- ramas de coral que se bifurcan
  for i,r in ipairs({{15,20,9},{21,15,10},{29,14,9},{35,17,7}}) do
    local x, y, h = r[1]+dx, r[2]+b, r[3]
    local c = (i % 2 == 0) and "cl3" or "cl2"
    G.thick(x, y, x, y-h, 2, c)
    G.line(x, y-h*0.5, x-3, y-h*0.8, c); G.line(x, y-h*0.7, x+3, y-h-1, c); G.line(x-3, y-h*0.8, x-4, y-h-2, c)
    G.px(x, y-h-1, "cl1"); G.px(x+3, y-h-2, "cl1"); G.px(x-4, y-h-3, "cl1")
  end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if P.pain then G.rect(27+hx, 20+hy, 31+hx, 20+hy, "cl4") else G.rect(27+hx, 19+hy, 28+hx, 21+hy, "wa3"); G.rect(30+hx, 19+hy, 31+hx, 21+hy, "wa3") end
  -- brazos de coral
  G.thick(11+dx, 22+b, 7+dx, 34+b, 5, "cl2"); G.ellipse(7+dx, 35+b, 3, 3, "cl3")
  if slam then
    G.thick(37+dx, 22+b, 44+dx, 34+b, 5, "cl2"); G.ellipse(44+dx, 38+b, 4, 4, "cl1")
    for k=0,3 do G.px(36+dx+k*3, 44-k%2*2, "cl1") end
  else
    G.thick(37+dx, 22+b, 40+dx, 32+b, 5, "cl2"); G.ellipse(40+dx, 34+b, 3, 3, "cl1")
  end
  if P.shell then for _,p in ipairs({{10,18},{38,20},{24,10},{14,36},{36,36}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "cl1") end end
  return G
end

-- =====================================================================================
-- Marinero Maldito (48x48): ahogado pálido con algas, arrastra una cadena
-- =====================================================================================
local function marinero(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,14,3,"nv2"); G.rect(10,39,30,41,"nv1"); G.ellipse(34,40,5,3,"dm2"); G.line(2,44,14,41,"m3")
    G.px(20,38,"sw1"); G.px(26,37,"sw1")
    return G
  end
  local grab = P.grab
  -- cadena arrastrada
  for i=0,8 do G.px(12+dx-i, 40+((i % 2 == 0) and 0 or 1), "m3"); G.px(12+dx-i, 41, "m2") end
  -- piernas descalzas
  G.thick(20+dx, 33+b, 18+dx, 44, 3, "nv2"); G.thick(27+dx, 33+b, 28+dx, 44, 3, "nv2")
  G.rect(16+dx, 44, 20+dx, 45, "dm2"); G.rect(26+dx, 44, 30+dx, 45, "dm2")
  -- brazo trasero con la cadena
  G.thick(17+dx, 22+b, 13+dx, 33+b, 3, "dm2"); G.line(13+dx, 33+b, 12+dx, 40, "m2")
  -- torso: chaqueta de marino rota
  G.rect(17+dx, 20+b, 30+dx, 34+b, "nv1"); G.rect(17+dx, 20+b, 19+dx, 34+b, "nv2"); G.rect(22+dx, 20+b, 25+dx, 30+b, "dm1")
  for _,p in ipairs({{28,26},{28,30}}) do G.px(p[1]+dx, p[2]+b, "y") end
  G.line(18+dx, 24+b, 20+dx, 32+b, "sw1"); G.line(29+dx, 21+b, 27+dx, 28+b, "sw2")
  -- cabeza: gorro, pelo empapado, ojos vacíos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 13+hy, 6, 6, "dm1"); G.rect(18+hx, 6+hy, 29+hx, 9+hy, "nv2"); G.rect(17+hx, 9+hy, 30+hx, 9+hy, "nv3")
  G.line(18+hx, 10+hy, 18+hx, 19+hy, "sw2"); G.line(20+hx, 10+hy, 19+hx, 17+hy, "sw2")
  if P.pain then G.rect(25+hx, 12+hy, 29+hx, 12+hy, "K") else G.rect(25+hx, 11+hy, 26+hx, 13+hy, "wa2"); G.rect(28+hx, 11+hy, 29+hx, 13+hy, "wa2") end
  G.rect(25+hx, 16+hy, 29+hx, 17+hy, "dm3"); G.px(30+hx, 15+hy, "wa1")
  -- brazo delantero (abraza)
  if grab then G.thick(29+dx, 22+b, 40+dx, 20+b, 3, "dm2"); G.thick(40+dx, 20+b, 42+dx, 26+b, 3, "dm2"); G.px(43+dx, 27+b, "wa1")
  else G.thick(29+dx, 22+b, 33+dx, 32+b, 3, "dm2") end
  -- gotas
  for k,p in ipairs({{16,36},{32,38}}) do if (k + (P.phase or 0)) % 2 == 0 then G.px(p[1]+dx, p[2]+b, "wa1") end end
  return G
end

-- =====================================================================================
-- Acólito de la Marea (48x48): túnica empapada verde agua, eclipse en la frente
-- =====================================================================================
local function acolito(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,15,3,"at2"); G.ridge(24,42,15,3,"at1",2); G.ellipse(35,40,4,3,"s2"); G.ellipse(14,40,2,2,"ec1")
    return G
  end
  local ph = P.phase or 0
  -- túnica larga
  for y=18,44 do local half = math.floor(6 + (y - 18) * 0.35); G.rect(24+dx-half, y+b, 24+dx+half, y+b, ((y // 5) % 2 == 0) and "at1" or "at2") end
  G.rect(24+dx-15, 44, 24+dx+15, 45, "at3")
  G.line(24+dx, 20+b, 24+dx, 44, "at3")
  -- capucha y cara
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 12+hy, 7, 8, "at2"); G.ellipse(26+hx, 13+hy, 4, 5, "s2")
  G.ellipse(26+hx, 9+hy, 2, 2, "W"); G.ellipse(27+hx, 9+hy, 2, 2, "K")
  eye(G, 28+hx, 13+hy, "ec1", P.pain)
  -- brazos y el orbe de agua negra
  local cast = P.cast
  G.thick(18+dx, 22+b, 14+dx, 32+b, 3, "at2")
  if cast then
    G.thick(30+dx, 22+b, 38+dx, 14+b, 3, "at1"); G.ellipse(41+dx, 11+b, 4, 4, "ink"); G.ellipse(41+dx, 11+b, 2, 2, "ec1")
    for k,p in ipairs({{36,4},{46,8},{44,18}}) do G.px(p[1]+dx, p[2]+b-(k+ph)%2, "wa2") end
  else
    G.thick(30+dx, 22+b, 33+dx, 30+b, 3, "at1"); G.ellipse(34+dx, 32+b, 3, 3, "ink"); G.px(34+dx, 32+b, "ec1")
  end
  -- gotas que caen de la túnica
  for k,x in ipairs({14,22,32}) do if (k + ph) % 2 == 0 then G.px(x+dx, 46-((k*3) % 4), "wa1") end end
  return G
end

-- =====================================================================================
-- Calamar del Abismo (48x48): cabeza alargada, ojos enormes, ocho brazos
-- =====================================================================================
local function calamar(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  G.splash(4, 44, 45, P.phase)
  if P.dead then
    G.ellipse(24,41,12,4,"sq2"); G.ridge(24,41,12,4,"sq1",1); for x=8,40,5 do G.line(x,43,x+3,45,"sq3") end
    return G
  end
  local ph = P.phase or 0
  -- brazos (delante y detrás)
  for i,a in ipairs({{18,36,-1},{22,38,-1},{26,38,1},{30,36,1}}) do
    G.tentacle(a[1]+dx, a[2]+b, 9, 2, a[3], ph + i, "sq2", "sqh")
  end
  if P.lash then G.tentacle(30+dx, 30+b, 16, 2.5, 1, ph, "sq1", "sqh") end
  -- manto
  G.ellipse(24+dx, 20+b, 9, 14, "sq2"); G.ridge(24+dx, 20+b, 9, 14, "sq1", 3)
  G.line(15+dx, 8+b, 12+dx, 3+b, "sq2"); G.line(33+dx, 8+b, 36+dx, 3+b, "sq2")
  for _,p in ipairs({{20,14},{27,10},{22,24},{28,20}}) do G.px(p[1]+dx, p[2]+b, "sq3") end
  -- ojo enorme
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(28+hx, 28+hy, 4, 4, "W"); if P.pain then G.line(25+hx, 28+hy, 31+hx, 28+hy, "K") else G.ellipse(29+hx, 28+hy, 2, 3, "K") end
  -- tinta
  if P.cast then for i=0,5 do G.ellipse(36+dx+i*2, 32+b-i, 3-i*0.3, 2.5-i*0.2, "ink") end end
  return G
end

-- =====================================================================================
-- Leviatán Menor (56x56): serpiente marina que asoma del agua, aletas y cuernos
-- =====================================================================================
local function leviatan(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  G.splash(2, 54, 53, P.phase)
  if P.dead then
    G.ellipse(28,50,20,3,"lv2"); G.ridge(28,50,20,3,"lv1",1); G.ellipse(44,49,6,3,"lv2"); G.px(46,47,"K")
    return G
  end
  local ph = P.phase or 0
  -- jorobas del cuerpo saliendo del agua
  for _,h in ipairs({{6,50,6},{18,48,7}}) do G.ellipse(h[1]+dx, h[2]+b, h[3], h[3], "lv2"); G.ridge(h[1]+dx, h[2]+b, h[3], h[3], "lv1", 2); G.line(h[1]+dx, h[2]+b-h[3], h[1]+dx-3, h[2]+b-h[3]-4, "lvf") end
  -- cuello en S
  local lunge = P.lunge and 5 or 0
  for i=0,30 do
    local t = i / 30
    local x = 28 + dx + math.sin(t * 3 + ph * 0.5) * 4 + t * (8 + lunge)
    local y = 52 + b - t * 34
    G.ellipse(x, y, 6 - t * 2, 4, "lv2"); G.px(x - 2, y - 3, "lv1"); G.px(x + 3, y + 1, "lvb")
  end
  -- aleta dorsal
  for i=0,4 do G.line(28+dx+i, 40+b-i*5, 24+dx+i, 36+b-i*5, "lvf") end
  -- cabeza
  local hx, hy = dx + lunge + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(42+hx, 16+hy, 8, 5, "lv2"); G.ridge(42+hx, 16+hy, 8, 5, "lv1", 2)
  G.line(37+hx, 11+hy, 32+hx, 5+hy, "lvb"); G.line(40+hx, 11+hy, 37+hx, 4+hy, "lvb")
  G.line(36+hx, 19+hy, 33+hx, 24+hy, "lvf"); G.line(37+hx, 20+hy, 35+hx, 26+hy, "lvf")
  eye(G, 45+hx, 13+hy, "Y", P.pain)
  if P.bite or P.cast then
    G.rect(46+hx, 18+hy, 53+hx, 21+hy, "r"); for x=47,53,2 do G.px(x+hx, 18+hy, "W"); G.px(x+hx, 21+hy, "W") end
    if P.cast then for i=0,4 do G.ellipse(54+hx+i*0.5, 18+hy+i*3, 2, 2, i < 2 and "wa2" or "wa1") end end
  else G.line(46+hx, 19+hy, 52+hx, 19+hy, "lv3") end
  return G
end

-- =====================================================================================
-- Capitana Velanegra (56x56): abrigo negro, sombrero con pluma, sable y brújula del eclipse
-- =====================================================================================
local function velanegra(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(28,50,18,3,"ve2"); G.rect(12,47,36,49,"ve1"); G.ellipse(40,48,5,3,"s1"); G.rect(40,44,48,46,"ve2"); G.line(4,51,16,50,"m1")
    G.ellipse(22,46,2,2,"ec1")
    return G
  end
  local ph = P.phase or 0
  -- piernas y botas altas
  G.thick(24+dx, 38+b, 22+dx, 50, 4, "ve2"); G.thick(32+dx, 38+b, 34+dx, 50, 4, "ve2")
  G.rect(18+dx, 47, 25+dx, 53, "ve3"); G.rect(31+dx, 47, 38+dx, 53, "ve3")
  -- abrigo largo con faldones y ribete rojo
  G.rect(18+dx, 22+b, 37+dx, 42+b, "ve1"); G.rect(16+dx, 34+b, 20+dx, 46+b, "ve1"); G.rect(35+dx, 34+b, 39+dx, 44+b, "ve1")
  G.line(18+dx, 22+b, 18+dx, 46+b, "R"); G.line(37+dx, 22+b, 37+dx, 44+b, "R")
  G.rect(24+dx, 22+b, 31+dx, 34+b, "T"); G.rect(22+dx, 34+b, 33+dx, 36+b, "R"); G.px(27+dx, 35+b, "Y")
  -- brújula del eclipse colgando
  G.ellipse(30+dx, 30+b, 3, 3, "y"); G.ellipse(30+dx, 30+b, 2, 2, "K"); G.px(30+dx, 30+b, (ph % 2 == 0) and "ec1" or "W")
  -- brazo trasero
  G.thick(19+dx, 24+b, 14+dx, 36+b, 4, "ve1"); G.ellipse(14+dx, 37+b, 2, 2, "s1")
  -- cabeza, pelo negro y tricornio con pluma
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(29+hx, 14+hy, 6, 7, "s1"); G.thick(23+hx, 10+hy, 21+hx, 26+hy, 4, "ve3")
  G.rect(20+hx, 6+hy, 38+hx, 8+hy, "ve2"); G.ellipse(29+hx, 5+hy, 7, 4, "ve2"); G.line(21+hx, 8+hy, 37+hx, 8+hy, "R")
  G.thick(24+hx, 3+hy, 16+hx, 0+hy, 2, "R"); G.px(15+hx, 0+hy, "W")
  eye(G, 32+hx, 13+hy, "ec1", P.pain); G.rect(31+hx, 18+hy, 33+hx, 18+hy, "r")
  -- brazo con el sable o señalando el cañonazo
  if P.swing then
    G.thick(36+dx, 24+b, 44+dx, 20+b, 4, "ve1"); G.ellipse(45+dx, 20+b, 2, 2, "s1")
    G.line(46+dx, 19+b, 55, 4+b, "m1"); G.line(47+dx, 19+b, 55, 5+b, "m2"); G.rect(44+dx, 18+b, 47+dx, 21+b, "Y")
  elseif P.cast then
    G.thick(36+dx, 24+b, 46+dx, 16+b, 4, "ve1"); G.ellipse(47+dx, 15+b, 2, 2, "s1")
    for k,p in ipairs({{50,10},{53,14},{49,6}}) do G.ellipse(p[1], p[2]+b-(k+ph)%2, 2, 2, (k % 2 == 0) and "m2" or "ink") end
  else
    G.thick(36+dx, 24+b, 40+dx, 36+b, 4, "ve1"); G.ellipse(40+dx, 37+b, 2, 2, "s1"); G.line(41+dx, 38+b, 46+dx, 52, "m1"); G.rect(39+dx, 36+b, 42+dx, 38+b, "Y")
  end
  return G
end

-- =====================================================================================
-- Almirante Ahogado (64x64): uniforme de la flota real podrido, charreteras, ancla con cadena
-- =====================================================================================
local function almirante(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(30,58,22,4,"nv2"); G.rect(10,54,40,57,"nv1"); G.ellipse(46,56,6,4,"dm2"); G.rect(44,51,54,53,"nv3")
    G.ellipse(10,57,5,4,"m3"); G.line(10,53,10,48,"m2"); G.px(22,52,"sw1"); G.px(34,53,"sw2")
    return G
  end
  local ph = P.phase or 0
  -- piernas con botas
  G.thick(26+dx, 44+b, 24+dx, 58, 6, "nv2"); G.thick(38+dx, 44+b, 40+dx, 58, 6, "nv2")
  G.rect(18+dx, 56, 29+dx, 61, "nv3"); G.rect(35+dx, 56, 46+dx, 61, "nv3")
  -- casaca con botones dorados y algas
  G.rect(20+dx, 22+b, 44+dx, 46+b, "nv1"); G.rect(20+dx, 22+b, 23+dx, 46+b, "nv2"); G.rect(29+dx, 22+b, 35+dx, 40+b, "dm1")
  for y=26,42,4 do G.px(26+dx, y+b, "Y"); G.px(38+dx, y+b, "Y") end
  G.rect(20+dx, 40+b, 44+dx, 42+b, "R")
  G.line(22+dx, 28+b, 25+dx, 44+b, "sw1"); G.line(42+dx, 24+b, 40+dx, 36+b, "sw2"); G.px(33+dx, 30+b, "sw1")
  -- charreteras
  G.ellipse(19+dx, 23+b, 5, 3, "Y"); for x=15,23,2 do G.line(x+dx, 25+b, x+dx, 28+b, "y") end
  G.ellipse(45+dx, 23+b, 5, 3, "Y"); for x=41,49,2 do G.line(x+dx, 25+b, x+dx, 28+b, "y") end
  -- brazo trasero
  G.thick(17+dx, 25+b, 12+dx, 42+b, 5, "nv1"); G.ellipse(12+dx, 43+b, 3, 3, "dm2")
  -- cabeza: bicornio, cara hundida, barba de algas
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(33+hx, 14+hy, 8, 8, "dm1"); G.ridge(33+hx, 14+hy, 8, 8, "dm2", 1)
  G.rect(20+hx, 4+hy, 46+hx, 7+hy, "nv3"); G.ellipse(33+hx, 4+hy, 10, 4, "nv3"); G.line(21+hx, 7+hy, 45+hx, 7+hy, "Y"); G.ellipse(33+hx, 3+hy, 2, 2, "Y")
  if P.pain then G.rect(31+hx, 13+hy, 39+hx, 13+hy, "K")
  else G.rect(31+hx, 11+hy, 33+hx, 14+hy, "K"); G.rect(36+hx, 11+hy, 38+hx, 14+hy, "K"); G.px(32+hx, 12+hy, "wa2"); G.px(37+hx, 12+hy, "wa2") end
  G.line(29+hx, 18+hy, 29+hx, 25+hy, "sw2"); G.line(32+hx, 19+hy, 31+hx, 26+hy, "sw1"); G.line(36+hx, 19+hy, 37+hx, 25+hy, "sw2")
  -- el ancla con la cadena (gira en el ataque)
  if P.swing then
    G.thick(44+dx, 26+b, 52+dx, 16+b, 5, "nv1")
    for i=0,6 do G.px(53+dx+i, 15+b-i, "m2") end
    G.thick(58, 2+b, 63, 10+b, 3, "m3"); G.line(56, 10+b, 63, 4+b, "m2"); G.line(55, 0+b, 63, 0+b, "m3")
    for k=0,2 do G.px(4+k*6, 30+b+k*2, "wa1") end
  else
    G.thick(44+dx, 26+b, 48+dx, 40+b, 5, "nv1"); G.ellipse(48+dx, 41+b, 3, 3, "dm2")
    for i=0,4 do G.px(49+dx, 43+b+i*2, "m2"); G.px(50+dx, 44+b+i*2, "m3") end
    G.thick(50+dx, 52, 50+dx, 60, 3, "m3"); G.thick(44+dx, 58, 56+dx, 58, 3, "m3"); G.line(44+dx, 58, 42+dx, 54, "m2"); G.line(56+dx, 58, 58+dx, 54, "m2")
    G.ellipse(50+dx, 51, 2, 2, "m2")
  end
  if P.cast then for k,p in ipairs({{10,10},{56,8},{6,30},{58,30}}) do G.ellipse(p[1], p[2]+b-(k+ph)%2, 2, 2, "wa2") end end
  -- gotas
  for k,p in ipairs({{18,48},{46,50},{30,52}}) do if (k + ph) % 2 == 0 then G.px(p[1]+dx, p[2]+b, "wa1") end end
  return G
end

-- =====================================================================================
-- Bestia de las Profundidades (64x64): cabeza de leviatán enorme con tentáculos, cadenas y el
-- cristal de eclipse en la frente
-- =====================================================================================
local function bestia(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  G.splash(0, 63, 61, P.phase)
  if P.dead then
    G.ellipse(32,57,26,4,"bd2"); G.ridge(32,57,26,4,"bd1",2); G.ellipse(50,55,8,4,"bd2"); G.px(52,53,"K")
    for x=8,40,8 do G.line(x,59,x+4,61,"lv3") end
    G.line(20,54,24,52,"m2"); G.px(46,52,"W")
    return G
  end
  local ph = P.phase or 0
  -- tentáculos desde el agua
  for i,a in ipairs({{6,58,1},{14,56,1},{24,58,1}}) do
    for k=0,14 do
      local t = k / 14
      local x = a[1] + dx + math.sin(t * 4 + ph + i) * 3
      local y = a[2] + b - k * 2.6
      G.ellipse(x, y, 3 - t * 2, 3 - t * 2, "bd2"); if k % 3 == 0 then G.px(x + 1, y, "lvb") end
    end
  end
  -- cuerpo / cuello grueso
  G.ellipse(36+dx, 46+b, 18, 14, "bd2"); G.ridge(36+dx, 46+b, 18, 14, "bd1", 4)
  for x=24,48,6 do G.px(x+dx, 36+b, "lvf"); G.px(x+1+dx, 35+b, "lvf") end
  G.ellipse(40+dx, 54+b, 12, 4, "lvb")
  -- cadenas que la atan
  for i=0,10 do G.px(20+dx+i*3, 44+b+((i % 2 == 0) and 0 or 1), "m2"); G.px(21+dx+i*3, 45+b, "m3") end
  G.line(20+dx, 44+b, 4, 61, "m3")
  -- cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  local open = P.bite or P.cast
  G.ellipse(44+hx, 22+hy, 14, 10, "bd2"); G.ridge(44+hx, 22+hy, 14, 10, "bd1", 3)
  -- cuernos y aletas
  G.thick(36+hx, 14+hy, 28+hx, 2+hy, 3, "lvb"); G.thick(42+hx, 13+hy, 40+hx, 1+hy, 3, "lvb")
  G.line(32+hx, 24+hy, 24+hx, 30+hy, "lvf"); G.line(33+hx, 26+hy, 26+hx, 33+hy, "lvf")
  -- el cristal de eclipse clavado en la frente
  G.ellipse(47+hx, 13+hy, 3, 4, "ec1"); G.ellipse(47+hx, 13+hy, 1.5, 2, "W")
  eye(G, 51+hx, 18+hy, (ph % 2 == 0) and "ec1" or "Y", P.pain); G.px(50+hx, 17+hy, "bd3")
  if open then
    G.rect(50+hx, 24+hy, 63, 30+hy, "r"); G.rect(50+hx, 23+hy, 63, 23+hy, "bd1"); G.rect(50+hx, 31+hy, 62, 32+hy, "bd2")
    for x=51,63,3 do G.px(x+hx, 24+hy, "W"); G.px(x+hx, 30+hy, "W") end
    if P.cast then for i=0,3 do G.ellipse(58+hx-i*10, 8+hy-i, 3, 2, "wa1") end end
  else
    G.rect(50+hx, 26+hy, 62, 28+hy, "bd2"); G.line(51+hx, 27+hy, 62, 27+hy, "bd3"); for x=52,62,3 do G.px(x+hx, 28+hy, "W") end
  end
  if P.shell then for _,p in ipairs({{30,20},{44,8},{58,22},{24,46},{50,44}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "lvb") end end
  return G
end

-- =====================================================================================
local MONSTERS = {
  {key="cangrejo_gigante", size=48, draw=cangrejo, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=0,hx=-1,dur=200},{dx=3,snap=true,phase=1,dur=150},{dx=1,dur=220}}},
    {"cast",   {{bob=1,dur=200},{shell=true,dur=320},{shell=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="gaviota_carronera", size=48, draw=gaviota, anims={
    {"idle",   {{bob=0,wing=0,dur=300},{bob=-1,wing=1,dur=300}}},
    {"attack", {{bob=-3,wing=1,dur=180},{dx=4,dive=true,wing=0,dur=150},{dx=1,wing=1,dur=220}}},
    {"cast",   {{bob=0,wing=1,dur=200},{cry=true,wing=1,dur=320},{cry=true,wing=0,dur=220}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=2,wing=0,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="pirata_sin_nombre", size=48, draw=pirata, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=1,shoot=true,dur=160},{dx=0,shoot=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="cangrejo_vapor", size=48, draw=cangrejoVapor, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=0,hx=-1,dur=200},{dx=3,snap=true,phase=1,dur=150},{dx=1,dur=220}}},
    {"cast",   {{bob=1,phase=0,dur=200},{cast=true,phase=1,dur=320},{cast=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="pirana_agua", size=48, draw=pirana, anims={
    {"idle",   {{bob=0,phase=0,dur=240},{bob=-1,phase=1,dur=240}}},
    {"attack", {{bob=-2,phase=1,dur=160},{dx=3,bite=true,phase=0,dur=140},{dx=1,bite=true,phase=1,dur=200}}},
    {"hurt",   {{dx=-2,pain=true,phase=0,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="cocodrilo_manglar", size=48, draw=cocodrilo, anims={
    {"idle",   {{bob=0,phase=0,dur=480},{bob=1,phase=1,dur=480}}},
    {"attack", {{bob=0,hx=-2,dur=220},{dx=4,bite=true,phase=1,dur=150},{dx=2,roll=true,dur=240}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="medusa_abisal", size=48, draw=medusa, anims={
    {"idle",   {{bob=0,phase=0,dur=320},{bob=-2,phase=1,dur=320}}},
    {"attack", {{bob=-2,phase=1,dur=200},{dx=3,cast=true,phase=0,dur=200},{dx=1,phase=1,dur=200}}},
    {"cast",   {{bob=-2,phase=1,dur=180},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="sirena_corrupta", size=48, draw=sirena, anims={
    {"idle",   {{bob=0,phase=0,dur=460},{bob=-1,phase=1,dur=460}}},
    {"attack", {{bob=-1,phase=1,dur=220},{dx=1,cast=true,phase=0,dur=240},{dx=0,phase=1,dur=220}}},
    {"cast",   {{bob=-1,sing=true,phase=0,dur=200},{cast=true,sing=true,phase=1,dur=320},{cast=true,sing=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="golem_coral", size=48, draw=golemCoral, anims={
    {"idle",   {{bob=0,phase=0,dur=520},{bob=1,phase=1,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,slam=true,dur=170},{dx=1,slam=true,phase=1,dur=300}}},
    {"cast",   {{bob=-1,dur=220},{shell=true,phase=1,dur=320},{shell=true,phase=0,dur=240}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="marinero_maldito", size=48, draw=marinero, anims={
    {"idle",   {{bob=0,phase=0,dur=480},{bob=1,phase=1,dur=480}}},
    {"attack", {{bob=1,hx=-1,dur=220},{dx=3,grab=true,phase=1,dur=180},{dx=1,grab=true,dur=240}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=220},{dead=true,dur=1100}}},
  }},
  {key="acolito_marea", size=48, draw=acolito, anims={
    {"idle",   {{bob=0,phase=0,dur=480},{bob=1,phase=1,dur=480}}},
    {"attack", {{bob=-1,dur=200},{dx=2,cast=true,phase=1,dur=240},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,phase=0,dur=200},{cast=true,phase=1,dur=320},{cast=true,bob=-1,phase=0,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="calamar_abismo", size=48, draw=calamar, anims={
    {"idle",   {{bob=0,phase=0,dur=360},{bob=-1,phase=1,dur=360}}},
    {"attack", {{bob=-1,hx=-1,phase=1,dur=200},{dx=2,lash=true,phase=0,dur=160},{dx=1,lash=true,phase=1,dur=220}}},
    {"cast",   {{bob=-1,phase=0,dur=200},{cast=true,phase=1,dur=320},{cast=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="leviatan_menor", size=56, draw=leviatan, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=-1,hx=-2,dur=220},{dx=2,lunge=true,bite=true,phase=1,dur=150},{dx=1,dur=240}}},
    {"cast",   {{bob=-1,hx=-1,dur=220},{cast=true,phase=0,dur=340},{cast=true,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,hy=-2,pain=true,dur=280}}},
    {"die",    {{bob=3,pain=true,dur=260},{dead=true,dur=1200}}},
  }},
  {key="capitan_pirata", size=56, draw=velanegra, anims={
    {"idle",   {{bob=0,phase=0,dur=460},{bob=1,phase=1,dur=460}}},
    {"attack", {{bob=1,hx=-1,dur=220},{dx=3,swing=true,phase=1,dur=160},{dx=1,swing=true,dur=240}}},
    {"cast",   {{bob=-1,phase=0,dur=200},{cast=true,phase=1,dur=320},{cast=true,phase=0,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="almirante_ahogado", size=64, draw=almirante, anims={
    {"idle",   {{bob=0,phase=0,dur=540},{bob=1,phase=1,dur=540}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=3,swing=true,phase=1,dur=180},{dx=1,swing=true,phase=0,dur=300}}},
    {"cast",   {{bob=-1,phase=0,dur=220},{cast=true,phase=1,dur=340},{cast=true,phase=0,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }},
  {key="bestia_profundidades", size=64, draw=bestia, anims={
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-2,hx=-1,dur=300},{dx=3,bite=true,phase=1,dur=180},{dx=1,phase=0,dur=320}}},
    {"cast",   {{bob=-1,phase=0,dur=220},{cast=true,phase=1,dur=360},{cast=true,shell=true,phase=0,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
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
    spr:saveAs(dir .. "/zona4/" .. m.key .. ".aseprite")
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
local fh = io.open(dir .. "/enemigos_costas.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
