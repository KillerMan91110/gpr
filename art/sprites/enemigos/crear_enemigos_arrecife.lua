-- Enemigos del Arrecife Hundido (mazmorra de las Costas Muertas, nivel 52-58):
--   arrecife_triton    Tritón Corrompido: guardia del rey con lanza y un cristal en el pecho (48x48)
--   arrecife_medusa    Medusa Guardiana: una medusa enorme, farol de los tritones (48x48)
--   arrecife_coloso    Coloso de Coral: una estatua de coral que se levantó del pedestal (56x56)
--   senor_oceano       Señor del Océano: el rey de los tritones, con tridente, corona y el cristal de
--                      eclipse en la frente (64x64, jefe)
-- Mismo estilo y ayudantes que crear_enemigos_costas.lua: se dibujan mirando a la derecha, contorno
-- oscuro automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona4/<clave>.aseprite y
-- enemigos_arrecife.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_arrecife.lua
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

-- colores propios del Arrecife: piel de tritón, oro del rey, nácar
for k, v in pairs({
  tr1="7ac4b4", tr2="4e9688", tr3="2e6a60", tf="5ab0d8", tf2="3a86b0",
  o1="ffe08a", o2="e0a840", o3="a07024", n1="f6f2ff", n2="d6cef2", n3="aaa0d4",
  gm1="6ae0f0", gm2="3aa8d0", gm3="2a6e9a", sw="3a7a4a", sw2="25583a", fb="e8f4f2",
}) do C[k] = hex(v) end
GLOW.gm1 = true; GLOW.o1 = true; GLOW.n1 = true

-- =====================================================================================
-- Tritón Corrompido (48x48): cola de pez enroscada, armadura de conchas, lanza de coral y el cristal
-- de eclipse clavado en el pecho
-- =====================================================================================
local function triton(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  G.splash(4, 44, 45, P.phase)
  if P.dead then
    G.ellipse(22,41,14,3,"tr2"); G.ridge(22,41,14,3,"tr1",1); G.ellipse(36,40,4,3,"tr1"); G.line(6,44,40,38,"cl3"); G.px(24,40,"ec1")
    return G
  end
  local ph = P.phase or 0
  -- cola enroscada que lo sostiene
  G.ellipse(20+dx, 39+b, 11, 5, "tr2"); G.ridge(20+dx, 39+b, 11, 5, "tr1", 2)
  G.thick(10+dx, 38+b, 5+dx, 31+b, 4, "tr2"); G.line(5+dx, 31+b, 1+dx, 27+b, "tf"); G.line(5+dx, 31+b, 9+dx, 26+b, "tf")
  for x=13,27,3 do G.px(x+dx, 37+b, "tr3") end
  -- torso con peto de conchas
  G.ellipse(24+dx, 26+b, 7, 9, "tr1"); G.rect(18+dx, 22+b, 30+dx, 30+b, "cl2"); for x=19,29,3 do G.ellipse(x+dx, 24+b, 1.5, 1.5, "cl1") end
  G.line(18+dx, 30+b, 30+dx, 30+b, "cl3")
  -- el cristal clavado en el pecho
  G.ellipse(24+dx, 27+b, 2, 3, "ec1"); G.px(24+dx, 27+b, "W"); G.line(21+dx, 25+b, 19+dx, 23+b, "ha2"); G.line(27+dx, 29+b, 30+dx, 31+b, "ha2")
  -- cabeza con aletas en las orejas y casco de concha
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(26+hx, 12+hy, 5, 5, "tr1"); G.ridge(26+hx, 12+hy, 6, 6, "cl1", 3)
  G.line(21+hx, 13+hy, 17+hx, 9+hy, "tf"); G.line(21+hx, 14+hy, 18+hx, 15+hy, "tf2")
  for _,y in ipairs({15, 17}) do G.line(23+hx, y+hy, 25+hx, y+hy, "tr3") end
  eye(G, 29+hx, 11+hy, (ph % 2 == 0) and "ec1" or "me2", P.pain)
  -- brazo con la lanza de coral
  local reach = P.thrust and 6 or 0
  G.thick(29+dx, 21+b, 33+dx+reach*0.5, 24+b, 2, "tr2")
  G.thick(14+dx+reach, 26+b, 44+dx+reach, 18+b, 2, "cl3"); G.line(14+dx+reach, 25+b, 44+dx+reach, 17+b, "cl2")
  G.line(44+dx+reach, 18+b, 47+dx+reach, 14+b, "cl1"); G.line(44+dx+reach, 18+b, 47+dx+reach, 19+b, "cl1")
  if P.cast then for i=0,4 do G.ellipse(46+dx-i*0.5, 10+b-i*2, 2, 2, i < 2 and "wa2" or "wa1") end end
  G.thick(19+dx, 21+b, 15+dx, 29+b, 2, "tr2")
  return G
end

-- =====================================================================================
-- Medusa Guardiana (48x48): campana alta y celeste con un borde de nácar, el corazón tomado por el
-- eclipse y filamentos largos
-- =====================================================================================
local function medusaGuardiana(P)
  local G = newGrid(48, 48, 47)
  local dx, b = P.dx or 0, (P.bob or 0) - 3
  if P.dead then
    G.ellipse(24,44,14,3,"gm3"); G.ellipse(24,43,10,2,"gm2"); for x=12,36,4 do G.line(x,45,x+2,47,"gm3") end; G.px(24,43,"ec1")
    return G
  end
  local ph = P.phase or 0
  -- filamentos largos
  for i,x in ipairs({12,17,22,27,32,37}) do
    for y=0,20 do G.px(x+dx+math.sin(y*0.45+ph+i)*2, 24+b+y, (y % 5 == 0) and "gm1" or "gm3") end
  end
  -- campana alta
  G.ellipse(24+dx, 15+b, 15, 12, "gm2"); G.ridge(24+dx, 15+b, 15, 12, "gm1", 3)
  G.rect(9+dx, 20+b, 39+dx, 23+b, "n2"); for x=10,38,4 do G.ellipse(x+dx, 24+b, 1.5, 1.5, "n1") end
  -- el corazón: antes celeste, ahora un eclipse que late
  G.ellipse(24+dx, 13+b, 6, 5, "ha2"); G.ellipse(24+dx, 13+b, 4, 3, (ph % 2 == 0) and "ec1" or "me1"); G.ellipse(26+dx, 12+b, 2, 2, "ha2")
  -- cara
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if P.pain then G.px(18+hx, 18+hy, "K"); G.px(30+hx, 18+hy, "K") else G.rect(18+hx, 17+hy, 19+hx, 19+hy, "K"); G.rect(29+hx, 17+hy, 30+hx, 19+hy, "K") end
  -- descarga
  if P.cast then
    for i=0,7 do G.px(39+dx+i*1.2, 12+b+((i % 2 == 0) and -2 or 2), "Y"); G.px(40+dx+i*1.2, 12+b+((i % 2 == 0) and -1 or 1), "W") end
    for _,p in ipairs({{6,8},{42,4},{4,28},{44,30}}) do G.px(p[1]+dx, p[2]+b, "Y") end
  end
  if P.sting then for i,x in ipairs({30,35,40}) do G.line(x+dx, 30+b, x+dx+6, 38+b+i, "me1") end end
  return G
end

-- =====================================================================================
-- Coloso de Coral (56x56): estatua de un rey tritón hecha de coral blanco, con el cristal en la frente
-- =====================================================================================
local function coloso(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    for _,r in ipairs({{12,48,6,5},{26,49,8,5},{42,48,6,5},{22,43,5,4},{34,44,4,3}}) do G.ellipse(r[1],r[2],r[3],r[4],"cl1"); G.px(r[1]-1,r[2]-2,"W"); G.px(r[1]+2,r[2]+1,"cl3") end
    G.ellipse(30,46,2,3,"ec1")
    return G
  end
  local ph = P.phase or 0
  -- pedestal roto que arrastra
  G.rect(12, 49, 44, 53, "m2"); G.rect(12, 49, 44, 50, "m1"); G.line(18, 50, 22, 53, "m3")
  -- cola enroscada de coral
  G.ellipse(26+dx, 44+b, 15, 6, "cl2"); G.ridge(26+dx, 44+b, 15, 6, "cl1", 3)
  for x=14,38,4 do G.px(x+dx, 44+b, "cl3") end
  -- torso ancho
  G.ellipse(28+dx, 30+b, 13, 13, "cl1"); G.ridge(28+dx, 30+b, 13, 13, "W", 2)
  for _,p in ipairs({{22,26},{30,34},{34,24},{24,36},{36,32}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "cl2"); G.px(p[1]+dx, p[2]+b, "cl4") end
  -- ramas de coral rojo que le crecen en los hombros
  for i,r in ipairs({{17,20,10},{39,19,9}}) do
    local x, y, h = r[1]+dx, r[2]+b, r[3]
    G.thick(x, y, x + (i == 1 and -3 or 3), y-h, 2, "cl3")
    G.line(x, y-h*0.5, x-4, y-h*0.8, "cl3"); G.line(x, y-h*0.6, x+4, y-h-1, "cl3"); G.px(x-4, y-h*0.8-1, "cl2"); G.px(x+4, y-h-2, "cl2")
  end
  -- cabeza con corona tallada y el cristal en la frente
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(32+hx, 13+hy, 7, 7, "cl1"); G.ridge(32+hx, 13+hy, 7, 7, "W", 2)
  G.rect(25+hx, 5+hy, 39+hx, 7+hy, "cl2"); for _,x in ipairs({26, 32, 38}) do G.line(x+hx, 5+hy, x+hx, 2+hy, "cl2") end
  G.ellipse(32+hx, 9+hy, 2, 2, "ec1"); G.px(32+hx, 9+hy, "W")
  if P.pain then G.rect(34+hx, 13+hy, 37+hx, 13+hy, "cl4") else G.rect(34+hx, 12+hy, 35+hx, 14+hy, "me2"); G.rect(28+hx, 12+hy, 29+hx, 14+hy, "me2") end
  -- brazos: puños de coral
  G.thick(15+dx, 26+b, 9+dx, 40+b, 6, "cl2"); G.ellipse(9+dx, 42+b, 4, 4, "cl1")
  if P.slam then
    G.thick(41+dx, 26+b, 51+dx, 38+b, 6, "cl2"); G.ellipse(51+dx, 42+b, 5, 5, "cl1")
    for k=0,4 do G.px(42+dx+k*3, 52-(k % 2)*2, "cl1") end
  else
    G.thick(41+dx, 26+b, 45+dx, 38+b, 6, "cl2"); G.ellipse(45+dx, 40+b, 4, 4, "cl1")
  end
  if P.shell then for _,p in ipairs({{8,20},{50,22},{30,2},{12,44},{48,44}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "cl1"); G.px(p[1]+dx, p[2]+b, "W") end end
  -- un pez que nada alrededor
  G.ellipse(48+dx-(ph % 2)*2, 12+b, 2, 1, "fi"); G.px(51+dx-(ph % 2)*2, 12+b, "fi")
  return G
end

-- =====================================================================================
-- Señor del Océano (64x64): el rey de los tritones, enorme, con barba de espuma, corona de oro, capa
-- de algas, tridente y el cristal de eclipse clavado en la frente
-- =====================================================================================
local function senor(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  G.splash(0, 63, 61, P.phase)
  if P.dead then
    -- de rodillas, sin el cristal: el tridente en el suelo y la corona a un lado
    G.ellipse(28,56,20,5,"tr2"); G.ridge(28,56,20,5,"tr1",2)
    G.ellipse(34,46,9,9,"tr1"); G.ellipse(38,38,6,6,"tr1"); G.ellipse(40,43,5,4,"fb")
    G.line(6,59,58,55,"o3"); G.line(6,58,58,54,"o2"); for _,x in ipairs({54,58,62}) do G.line(x,54,x+1,50,"o2") end
    G.rect(14,56,22,58,"o2"); G.px(16,55,"o1"); G.px(20,55,"o1")
    for _,p in ipairs({{44,30},{48,34}}) do G.px(p[1],p[2],"ec1") end
    return G
  end
  local ph = P.phase or 0
  -- cola enorme enroscada
  G.ellipse(26+dx, 54+b, 20, 7, "tr2"); G.ridge(26+dx, 54+b, 20, 7, "tr1", 3)
  G.thick(8+dx, 52+b, 3+dx, 42+b, 6, "tr2"); G.line(3+dx, 42+b, 0+dx, 35+b, "tf"); G.line(3+dx, 42+b, 9+dx, 35+b, "tf"); G.line(1+dx, 39+b, 7+dx, 36+b, "tf2")
  for x=12,40,4 do G.px(x+dx, 52+b, "tr3"); G.px(x+2+dx, 55+b, "tr3") end
  -- capa de algas
  for i=0,8 do G.thick(20+dx+i*2, 24+b, 16+dx+i*2+math.sin(ph+i)*2, 50+b, 2, (i % 2 == 0) and "sw" or "sw2") end
  -- torso
  G.ellipse(34+dx, 36+b, 12, 14, "tr1"); G.ridge(34+dx, 36+b, 12, 14, "tr1", 1)
  G.line(28+dx, 34+b, 40+dx, 34+b, "tr2"); G.line(30+dx, 40+b, 38+dx, 40+b, "tr2")
  G.rect(26+dx, 44+b, 42+dx, 47+b, "o2"); G.line(26+dx, 44+b, 42+dx, 44+b, "o1"); G.ellipse(34+dx, 46+b, 2, 2, "n1")
  -- cabeza, barba de espuma y corona
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(38+hx, 16+hy, 8, 8, "tr1"); G.ridge(38+hx, 16+hy, 8, 8, "tr1", 1)
  G.ellipse(38+hx, 25+hy, 8, 7, "fb"); for x=31,45,3 do G.line(x+hx, 26+hy, x+hx+1, 31+hy, "wa2") end
  G.line(30+hx, 15+hy, 25+hx, 10+hy, "tf"); G.line(30+hx, 17+hy, 26+hx, 18+hy, "tf2")
  G.rect(31+hx, 6+hy, 45+hx, 8+hy, "o2"); for _,x in ipairs({32, 38, 44}) do G.line(x+hx, 6+hy, x+hx, 2+hy, "o2"); G.px(x+hx, 1+hy, "o1") end
  -- el cristal de eclipse en la frente
  G.ellipse(38+hx, 11+hy, 2, 3, "ec1"); G.px(38+hx, 11+hy, "W"); G.line(36+hx, 13+hy, 34+hx, 15+hy, "ha2"); G.line(40+hx, 13+hy, 42+hx, 15+hy, "ha2")
  eye(G, 42+hx, 16+hy, (ph % 2 == 0) and "ec1" or "me2", P.pain); eye(G, 36+hx, 16+hy, (ph % 2 == 0) and "ec1" or "me2", P.pain)
  -- brazo izquierdo
  G.thick(24+dx, 30+b, 20+dx, 42+b, 4, "tr2"); G.ellipse(20+dx, 44+b, 3, 3, "tr1")
  -- el tridente (en el ataque lo clava hacia adelante; al lanzar, lo alza)
  if P.thrust then
    G.thick(42+dx, 34+b, 50+dx, 30+b, 4, "tr2")
    G.thick(30+dx, 33+b, 63, 27+b, 2, "o3"); G.line(58, 22+b, 58, 32+b, "o2")
    for _,y in ipairs({22, 27, 32}) do G.line(58, y+b, 63, y+b-1, "o2"); G.px(63, y+b-1, "o1") end
  elseif P.cast then
    G.thick(42+dx, 32+b, 50+dx, 20+b, 4, "tr2")
    G.thick(52+dx, 58+b, 52+dx, 2+b, 2, "o3"); G.line(46+dx, 8+b, 58+dx, 8+b, "o2")
    for _,x in ipairs({46, 52, 58}) do G.line(x+dx, 8+b, x+dx, 1+b, "o2"); G.px(x+dx, 0+b, "o1") end
    for i=0,6 do G.ellipse(58+dx-i*3, 14+b-math.sin(i)*3, 3, 2, i % 2 == 0 and "wa1" or "wa2") end
  else
    G.thick(42+dx, 34+b, 48+dx, 36+b, 4, "tr2")
    G.thick(52+dx, 60, 52+dx, 8+b, 2, "o3"); G.line(46+dx, 12+b, 58+dx, 12+b, "o2")
    for _,x in ipairs({46, 52, 58}) do G.line(x+dx, 12+b, x+dx, 5+b, "o2"); G.px(x+dx, 4+b, "o1") end
  end
  if P.shell then for _,p in ipairs({{10,20},{58,40},{24,8},{6,50},{56,56}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 2, "wa1") end end
  return G
end

-- =====================================================================================
local MONSTERS = {
  {key="arrecife_triton", size=48, draw=triton, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=0,hx=-1,dur=200},{dx=2,thrust=true,phase=1,dur=160},{dx=1,thrust=true,dur=220}}},
    {"cast",   {{bob=-1,phase=0,dur=200},{cast=true,phase=1,dur=320},{cast=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="arrecife_medusa", size=48, draw=medusaGuardiana, anims={
    {"idle",   {{bob=0,phase=0,dur=340},{bob=-2,phase=1,dur=340}}},
    {"attack", {{bob=-2,phase=1,dur=200},{dx=3,sting=true,phase=0,dur=200},{dx=1,sting=true,phase=1,dur=200}}},
    {"cast",   {{bob=-2,phase=1,dur=180},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="arrecife_coloso", size=56, draw=coloso, anims={
    {"idle",   {{bob=0,phase=0,dur=540},{bob=1,phase=1,dur=540}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,slam=true,dur=170},{dx=1,slam=true,phase=1,dur=300}}},
    {"cast",   {{bob=-1,dur=220},{shell=true,phase=1,dur=320},{shell=true,phase=0,dur=240}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="senor_oceano", size=64, draw=senor, anims={
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,thrust=true,phase=1,dur=180},{dx=1,thrust=true,phase=0,dur=300}}},
    {"cast",   {{bob=-1,phase=0,dur=220},{cast=true,phase=1,dur=360},{cast=true,shell=true,phase=0,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
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
local fh = io.open(dir .. "/enemigos_arrecife.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()

