-- Enemigos nuevos de la Pradera (historia de la zona 1): uno propio por subzona alta.
--   jabali_cornudo   Jabalí Cornudo (bosque de Robleviejo y praderas del este)
--   sapo_de_lodo     Sapo de Lodo (lago Cristalino)
--   esqueleto_vigia  Esqueleto del Vigía (ruinas del Vigía)
--   acolito_eclipse  Acólito del Eclipse (círculo de piedras y tierras heridas)
--   bestia_grieta    Bestia de la Grieta (tierras heridas)
--   golem_menhir     Golem de Menhir, raro (círculo de piedras), 56x56
-- Mismo estilo que crear_enemigos_zona1.lua y crear_cripta.lua: se dibujan mirando a la derecha,
-- contorno oscuro automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona1/<clave>.aseprite y
-- enemigos_pradera2.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_pradera2.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", E="1c1420", R="c0343a", r="7a1f2a", Y="e8c050", y="a8802c", pk="d88a96",
  -- jabalí
  j1="8a5a3a", j2="5e3a22", j3="3a2414", j4="2a1a10", jn="b07a60", T="eee0c0", t="b8a880",
  -- sapo
  s1="8a9a52", s2="5e7034", s3="3a4a20", sb="d8cc8a", sw="2a3418", so="ffd23a", sl="e07a8a",
  -- esqueleto y su tabardo
  h1="e8dcb8", h2="b8a880", h3="857a5c", a1="4a6aa8", a2="2e4478", a3="1c2c50", m1="8a96a8", m2="555f70", ox="8a5a3a",
  -- acólito
  e1="3a3048", e2="241e30", e3="15121e", g1="ffd86a", g2="c09030", v1="d8a8ff", v2="9a5ae8", v3="5a28a8",
  -- bestia de la grieta
  b1="5a5868", b2="3e3c4a", b3="26242e", c1="e0b8ff", c2="a868f0", c3="5c2c9a",
  -- golem
  o1="aeaab4", o2="85818e", o3="5e5a68", o4="3e3b46", mo1="6f9e3c", mo2="466a26", ru="7ff8c8", ru2="3ac898",
}) do C[k] = hex(v) end

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
  -- franja clara sobre el lomo de una elipse
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
        if n and n ~= "K" and n ~= "ru" and n ~= "c1" and n ~= "v1" then out[y*W+x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(W - 1 - (k % W), k // W, C[c]) end
  return img
end

-- =====================================================================================
-- Jabalí Cornudo (48x48, suelo en 45): bajo y macizo, crin erizada y colmillos curvos
-- =====================================================================================
local function jabali(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 3, P.bob or 0
  if P.dead then
    G.ellipse(22,41,13,4,"j2"); G.ridge(22,41,13,4,"j1")
    for x=12,30,3 do G.px(x,37,"j4") end
    G.ellipse(38,42,5,3,"j2"); G.rect(41,42,44,44,"jn"); G.line(40,41,44,38,"T")
    G.thick(16,44,19,45,2,"j3"); G.thick(27,44,30,45,2,"j3"); G.px(37,41,"K")
    return G
  end
  local lean = P.charge and 2 or 0
  -- patas traseras y delanteras (cortas y gruesas)
  G.thick(14+dx, 34+b, 13+dx, 44, 3, "j3"); G.thick(29+dx, 34+b, 31+dx+lean, 44, 3, "j3")
  G.rect(11+dx, 44, 15+dx, 45, "j4"); G.rect(29+dx+lean, 44, 33+dx+lean, 45, "j4")
  -- cola enroscada
  G.line(8+dx, 28+b, 5+dx, 25+b, "j2"); G.px(6+dx, 24+b, "j2")
  -- cuerpo
  G.ellipse(21+dx, 30+b, 13, 9, "j2"); G.ridge(21+dx, 30+b, 13, 9, "j1", 2)
  G.rect(12+dx, 37+b, 30+dx, 38+b, "j3")
  -- crin erizada sobre el lomo
  for x=12,30,2 do G.line(x+dx, 22+b, x+dx+1, 18+b+((x // 2) % 2), "j4") end
  -- patas del lado de adelante
  G.thick(18+dx, 35+b, 18+dx, 44, 3, "j2"); G.thick(34+dx, 34+b, 36+dx+lean, 44, 3, "j2")
  G.rect(16+dx, 44, 20+dx, 45, "j4"); G.rect(34+dx+lean, 44, 38+dx+lean, 45, "j4")
  -- cabeza baja con hocico
  local hx, hy = dx + lean + (P.hx or 0), b + (P.hy or 0) + (P.charge and 2 or 0)
  G.ellipse(35+hx, 29+hy, 7, 6, "j2"); G.ridge(35+hx, 29+hy, 7, 6, "j1")
  G.rect(40+hx, 30+hy, 45+hx, 34+hy, "j2"); G.rect(44+hx, 31+hy, 46+hx, 34+hy, "jn"); G.px(46+hx, 32+hy, "j4")
  G.line(31+hx, 23+hy, 33+hx, 20+hy, "j3"); G.px(32+hx, 21+hy, "pk")
  if P.pain then G.px(38+hx,27+hy,"K"); G.px(39+hx,28+hy,"K") else G.px(39+hx,27+hy,"R"); G.px(38+hx,27+hy,"r") end
  -- colmillos curvos como cuernos
  G.line(41+hx, 34+hy, 43+hx, 36+hy, "T"); G.line(43+hx, 36+hy, 45+hx, 33+hy, "T"); G.px(45+hx, 32+hy, "t")
  G.px(42+hx, 35+hy, "t")
  return G
end

-- =====================================================================================
-- Sapo de Lodo (48x48): achaparrado, verrugas, ojos dorados arriba y lengua larga
-- =====================================================================================
local function sapo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,15,4,"s2"); G.ellipse(24,41,12,3,"sb")
    G.px(16,40,"s3"); G.px(30,41,"s3"); G.px(33,39,"K"); G.px(35,39,"K")
    G.line(10,44,6,45,"s3"); G.line(38,44,42,45,"s3")
    return G
  end
  local sq = P.squash or 0
  -- patas traseras plegadas
  G.ellipse(14+dx, 39, 7, 5, "s2"); G.ellipse(14+dx, 38, 6, 4, "s1"); G.rect(7+dx, 43, 15+dx, 45, "s3")
  -- cuerpo (se aplasta al saltar)
  G.ellipse(23+dx, 34+b+sq, 15, 10-sq, "s2"); G.ellipse(23+dx, 33+b+sq, 14, 9-sq, "s1")
  G.ellipse(26+dx, 39+b, 10, 5, "sb")
  -- verrugas
  for _,w in ipairs({{14,28},{19,25},{24,27},{17,33},{29,26},{12,34}}) do G.px(w[1]+dx, w[2]+b+sq, "s3"); G.px(w[1]+dx+1, w[2]+b+sq, "sw") end
  -- patas delanteras
  G.thick(33+dx, 38+b, 35+dx, 44, 3, "s2"); G.rect(33+dx, 44, 38+dx, 45, "s3")
  -- ojos saltones dorados
  local ex, ey = dx + (P.hx or 0), b + sq + (P.hy or 0)
  G.ellipse(30+ex, 24+ey, 3, 3, "s1"); G.ellipse(36+ex, 25+ey, 3, 3, "s1")
  if P.pain then G.px(30+ex,24+ey,"K"); G.px(36+ex,25+ey,"K")
  else G.px(30+ex,24+ey,"so"); G.px(31+ex,24+ey,"K"); G.px(36+ex,25+ey,"so"); G.px(37+ex,25+ey,"K") end
  -- boca ancha
  G.line(29+ex, 31+ey, 39+ex, 31+ey, "s3"); G.px(39+ex, 30+ey, "s3")
  if P.tongue then
    G.line(39+ex, 31+ey, 46+ex, 29+ey, "sl"); G.line(39+ex, 32+ey, 46+ex, 30+ey, "pk"); G.ellipse(46+ex, 29+ey, 1.5, 1.5, "sl")
  end
  -- gota de veneno
  G.px(18+dx, 42, "Y"); G.px(18+dx, 43, "y")
  return G
end

-- =====================================================================================
-- Esqueleto del Vigía (48x48): soldado de hueso con el tabardo azul de la guardia y una
-- espada oxidada
-- =====================================================================================
local function esqueleto(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,43,13,2,"h3")
    G.thick(10,42,30,42,2,"h1"); G.ellipse(33,41,4,3,"h1"); G.px(32,41,"E"); G.px(34,41,"E")
    G.rect(14,40,22,41,"a2"); G.line(4,44,24,41,"m2"); G.px(4,44,"ox")
    return G
  end
  -- espada detrás (en ataque baja de golpe)
  local sx, sy = 33+dx, 24+b
  if P.swing then
    G.thick(sx, sy, sx+12, sy+10, 2, "m1"); G.px(sx+13, sy+11, "m2"); G.line(sx+3, sy+1, sx+9, sy+6, "ox")
  else
    G.thick(sx+2, sy, sx+4, sy-16, 2, "m1"); G.px(sx+4, sy-17, "m2"); G.line(sx+3, sy-5, sx+3, sy-12, "ox")
  end
  G.rect(sx, sy-1, sx+5, sy, "y")
  -- piernas de hueso
  G.thick(20+dx, 33+b, 18+dx, 44, 2, "h2"); G.thick(27+dx, 33+b, 29+dx, 44, 2, "h2")
  G.rect(16+dx, 44, 20+dx, 45, "h1"); G.rect(28+dx, 44, 32+dx, 45, "h1")
  -- tabardo azul raído sobre las costillas
  G.rect(19+dx, 21+b, 29+dx, 34+b, "a2"); G.rect(20+dx, 21+b, 28+dx, 32+b, "a1")
  G.px(19+dx, 35+b, "a2"); G.px(22+dx, 35+b, "a2"); G.px(26+dx, 35+b, "a2"); G.px(29+dx, 34+b, "a3")
  G.rect(23+dx, 24+b, 25+dx, 28+b, "Y"); G.px(24+dx, 26+b, "a3")                     -- ojo del Vigía bordado
  G.line(19+dx, 30+b, 29+dx, 30+b, "a3")
  -- brazo con la espada
  G.thick(29+dx, 22+b, 33+dx, 24+b+(P.swing and 1 or 0), 2, "h1")
  G.thick(18+dx, 22+b, 16+dx, 30+b, 2, "h1")
  -- cráneo agrietado
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 14+hy, 6, 6, "h1"); G.rect(21+hx, 18+hy, 28+hx, 20+hy, "h1")
  G.line(22+hx, 9+hy, 24+hx, 13+hy, "h3")
  G.rect(25+hx,13+hy,27+hx,15+hy,"E"); G.rect(29+hx,13+hy,30+hx,15+hy,"E"); G.px(28+hx,16+hy,"E")
  if not P.pain then G.px(26+hx,14+hy,"Y"); G.px(29+hx,14+hy,"Y") end
  G.line(25+hx, 19+hy, 29+hx, 19+hy, "h3"); G.px(26+hx, 20+hy, "E"); G.px(28+hx, 20+hy, "E")
  return G
end

-- =====================================================================================
-- Acólito del Eclipse (48x48): túnica negra con el eclipse dorado en el pecho, capucha con ojos
-- violetas y un orbe de sombra en la mano
-- =====================================================================================
local function acolito(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(23,42,13,3,"e2"); G.ellipse(22,41,10,2,"e1")
    G.ellipse(14,41,3,2,"g2"); G.px(14,41,"E")
    G.ellipse(33,42,2,2,"v3")
    return G
  end
  -- túnica larga que se abre abajo
  for y=20,44 do
    local e = math.max(0, y-24)//3
    G.rect(16-e+dx, y+b*(y<30 and 1 or 0), 30+e+dx, y+b*(y<30 and 1 or 0), "e1")
    G.rect(27+e+dx, y, 30+e+dx, y, "e2")
  end
  G.rect(12+dx, 44, 34+dx, 45, "e3")
  for x=14,33,4 do G.px(x+dx, 44, "e2") end
  -- eclipse dorado en el pecho
  G.ellipse(23+dx, 27+b, 4, 4, "g2"); G.ellipse(23+dx, 27+b, 3, 3, "g1"); G.ellipse(24+dx, 26+b, 2.5, 2.5, "E")
  -- capucha honda
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 13+hy, 8, 9, "e1"); G.ellipse(26+hx, 15+hy, 5, 5, "e3")
  G.line(17+hx, 8+hy, 20+hx, 3+hy, "e1"); G.px(19+hx, 4+hy, "e2")
  if P.pain then G.px(26+hx,15+hy,"v3"); G.px(28+hx,15+hy,"v3")
  else G.px(26+hx,15+hy,"v1"); G.px(28+hx,15+hy,"v1"); G.px(27+hx,16+hy,"v2") end
  -- brazo con el orbe (en ataque lo adelanta y brilla)
  local cast = P.cast
  local ox, oy = 34+dx+(cast and 6 or 0), 25+b-(cast and 3 or 0)
  G.thick(29+dx, 21+b, ox-1, oy, 3, "e1")
  G.ellipse(ox+2, oy, cast and 4 or 3, cast and 4 or 3, "v3"); G.ellipse(ox+2, oy, cast and 3 or 2, cast and 3 or 2, "v2"); G.px(ox+1, oy-1, "v1")
  if cast then for k=0,4 do G.px(ox+6+k, oy-1+(k % 2), "v1") end end
  -- motas de sombra
  for k,m in ipairs({{10,14},{38,10},{8,30},{40,36}}) do if (k + (P.phase or 0)) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "v2") end end
  return G
end

-- =====================================================================================
-- Bestia de la Grieta (48x48): lobo gris oscuro con cristales violetas que le brotan del lomo
-- =====================================================================================
local function bestia(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(23,41,12,4,"b2"); G.ridge(23,41,12,4,"b1")
    G.line(16,37,17,33,"c2"); G.line(22,37,23,32,"c1"); G.line(28,37,30,34,"c2")
    G.ellipse(37,42,5,3,"b2"); G.rect(40,42,44,44,"b1"); G.px(44,42,"K"); G.px(37,41,"K")
    G.thick(18,44,21,45,2,"b3"); G.thick(28,44,31,45,2,"b3")
    return G
  end
  local feet = P.feet or {{14,44},{18,44},{31,44},{28,44}}
  local hip, sh = {16+dx, 35+b}, {30+dx, 35+b}
  -- cola con punta de cristal
  G.thick(11+dx, 30+b, 5+dx, 24+b-(P.tail or 0), 2, "b2"); G.px(4+dx, 23+b-(P.tail or 0), "c2"); G.px(4+dx, 22+b-(P.tail or 0), "c1")
  G.thick(hip[1]-1, hip[2], feet[1][1], feet[1][2], 2, "b3"); G.rect(feet[1][1]-1,feet[1][2]+1,feet[1][1]+1,feet[1][2]+1,"b3")
  G.thick(sh[1]+1, sh[2], feet[3][1], feet[3][2], 2, "b3"); G.rect(feet[3][1]-1,feet[3][2]+1,feet[3][1]+1,feet[3][2]+1,"b3")
  G.ellipse(22+dx, 32+b, 11, 6, "b2"); G.ridge(22+dx, 32+b, 11, 6, "b1", 2)
  G.rect(16+dx, 37+b, 27+dx, 37+b, "b1")
  -- cristales del eclipse en el lomo
  for i,c in ipairs({{13,6},{17,8},{22,9},{27,7},{31,5}}) do
    local x, h = c[1]+dx, c[2] + ((i + (P.phase or 0)) % 2)
    G.thick(x, 27+b, x+1, 27+b-h, 2, "c3"); G.line(x, 27+b, x, 27+b-h, "c2"); G.px(x, 27+b-h, "c1")
  end
  G.thick(hip[1]+2, hip[2], feet[2][1], feet[2][2], 3, "b2"); G.rect(feet[2][1]-1,feet[2][2]+1,feet[2][1]+2,feet[2][2]+1,"b3")
  G.thick(sh[1]-2, sh[2], feet[4][1], feet[4][2], 3, "b2"); G.rect(feet[4][1]-1,feet[4][2]+1,feet[4][1]+2,feet[4][2]+1,"b3")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+dx, 28+b, 5, 6, "b2")
  G.ellipse(36+hx, 26+hy, 5, 4, "b2")
  G.rect(40+hx, 26+hy, 45+hx, 28+hy, "b2"); G.rect(40+hx, 28+hy, 44+hx, 29+hy, "b1"); G.px(45+hx, 26+hy, "K")
  G.line(33+hx, 22+hy, 34+hx, 19+hy, "b2"); G.px(34+hx, 18+hy, "c2")
  G.line(36+hx, 22+hy, 37+hx, 19+hy, "b2")
  if P.pain then G.px(38+hx,25+hy,"K"); G.px(39+hx,25+hy,"K") else G.px(39+hx,25+hy,"c1"); G.px(38+hx,25+hy,"c2") end
  if P.bite then
    G.rect(40+hx, 29+hy, 45+hx, 29+hy, "r"); G.px(41+hx,29+hy,"W"); G.px(44+hx,29+hy,"W")
    G.rect(40+hx, 30+hy, 44+hx, 31+hy, "b1"); G.px(43+hx,30+hy,"W")
  end
  return G
end

-- =====================================================================================
-- Golem de Menhir (56x56, suelo en 53): una piedra del Círculo con brazos de roca, musgo y
-- runas que brillan en el pecho
-- =====================================================================================
local function golem(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(28,50,20,4,"o3"); G.rect(10,44,40,49,"o2"); G.rect(10,44,40,45,"o1")
    G.ellipse(44,49,5,3,"o2"); G.ellipse(14,50,4,2,"o3")
    G.px(22,46,"ru2"); G.px(26,47,"ru2"); G.ellipse(30,46,3,2,"mo2")
    return G
  end
  local slam = P.slam
  -- piernas de bloque
  G.rect(17+dx, 42+b, 24+dx, 53, "o3"); G.rect(31+dx, 42+b, 38+dx, 53, "o3")
  G.rect(17+dx, 42+b, 19+dx, 53, "o2"); G.rect(31+dx, 42+b, 33+dx, 53, "o2")
  -- brazo trasero
  G.rect(10+dx, 22+b, 15+dx, 40+b, "o3"); G.rect(9+dx, 38+b, 15+dx, 43+b, "o4")
  -- tronco: el menhir
  G.rect(15+dx, 10+b, 40+dx, 44+b, "o2"); G.rect(15+dx, 10+b, 19+dx, 44+b, "o1")
  G.rect(36+dx, 10+b, 40+dx, 44+b, "o3"); G.rect(17+dx, 7+b, 38+dx, 10+b, "o2"); G.rect(19+dx, 5+b, 35+dx, 7+b, "o1")
  -- grietas y musgo
  G.line(22+dx, 12+b, 26+dx, 20+b, "o4"); G.line(33+dx, 30+b, 30+dx, 38+b, "o4")
  G.ellipse(20+dx, 9+b, 4, 2, "mo1"); G.ellipse(36+dx, 40+b, 3, 2, "mo2"); G.px(18+dx, 11+b, "mo2")
  -- runas que brillan
  local rc = P.glow and "ru" or "ru2"
  G.line(24+dx, 24+b, 24+dx, 32+b, rc); G.line(24+dx, 24+b, 28+dx, 27+b, rc); G.line(28+dx, 27+b, 24+dx, 29+b, rc)
  G.line(31+dx, 22+b, 33+dx, 26+b, rc); G.line(33+dx, 26+b, 31+dx, 30+b, rc)
  -- ojos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if P.pain then G.rect(28+hx,14+hy,30+hx,14+hy,"o4"); G.rect(33+hx,14+hy,35+hx,14+hy,"o4")
  else G.rect(28+hx,13+hy,30+hx,15+hy,"ru"); G.rect(33+hx,13+hy,35+hx,15+hy,"ru") end
  -- brazo delantero (en ataque golpea el suelo)
  if slam then
    G.thick(38+dx, 20+b, 46+dx, 40+b, 6, "o3"); G.rect(42+dx, 40+b, 51+dx, 48+b, "o2"); G.rect(42+dx, 40+b, 51+dx, 41+b, "o1")
    for k=0,3 do G.px(40+dx+k*4, 52, "o1"); G.px(41+dx+k*4, 51, "o2") end
  else
    G.rect(40+dx, 20+b, 46+dx, 38+b, "o3"); G.rect(40+dx, 20+b, 41+dx, 38+b, "o2"); G.rect(39+dx, 36+b, 47+dx, 42+b, "o2")
  end
  return G
end

-- =====================================================================================
local MONSTERS = {
  {key="jabali_cornudo", size=48, draw=jabali, anims={
    {"idle",   {{bob=0,dur=420},{bob=1,dur=420}}},
    {"attack", {{bob=1,hx=-2,dur=200},{dx=2,charge=true,dur=130},{dx=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="sapo_de_lodo", size=48, draw=sapo, anims={
    {"idle",   {{bob=0,dur=450},{bob=0,squash=1,dur=450}}},
    {"attack", {{squash=2,dur=200},{dx=3,bob=-3,tongue=true,dur=160},{dx=1,dur=220}}},
    {"hurt",   {{dx=-2,pain=true,squash=1,dur=250}}},
    {"die",    {{bob=2,pain=true,squash=2,dur=200},{dead=true,dur=1000}}},
  }},
  {key="esqueleto_vigia", size=48, draw=esqueleto, anims={
    {"idle",   {{bob=0,dur=450},{bob=1,dur=450}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=4,swing=true,dur=140},{dx=1,swing=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="acolito_eclipse", size=48, draw=acolito, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-1,phase=1,dur=420}}},
    {"attack", {{bob=-1,hy=-1,dur=200},{dx=2,cast=true,phase=1,dur=220},{dx=1,dur=200}}},
    {"cast",   {{bob=-1,dur=180},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=200}}},
    {"hurt",   {{dx=-3,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="bestia_grieta", size=48, draw=bestia, anims={
    {"idle",   {{bob=0,phase=0,dur=400},{bob=1,tail=2,phase=1,dur=400}}},
    {"attack", {{bob=2,hx=-1,hy=2,dur=200},{dx=3,bob=-2,bite=true,feet={{10,44},{13,44},{40,40},{37,42}},dur=120},{dx=2,dur=220}}},
    {"hurt",   {{dx=-2,hy=-2,pain=true,dur=250}}},
    {"die",    {{bob=4,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="golem_menhir", size=56, draw=golem, anims={
    {"idle",   {{bob=0,dur=520},{bob=1,glow=true,dur=520}}},
    {"attack", {{bob=-1,hx=-1,glow=true,dur=300},{dx=2,slam=true,glow=true,dur=170},{dx=1,slam=true,dur=300}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
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
  spr:saveAs(dir .. "/zona1/" .. m.key .. ".aseprite")
  spr:close()
  -- tira horizontal para el juego (un cuadro al lado del otro, como las demás hojas)
  local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
  for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
  local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
  out:saveCopyAs(dir .. "/enemigos/" .. m.key .. ".png")
  out:close()
  manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
end
local fh = io.open(dir .. "/enemigos_pradera2.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
