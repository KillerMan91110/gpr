-- Enemigos de las Montañas Grises (zona 2, nivel 16-30): uno o dos propios por subzona.
--   cabra_montes        Cabra Montés (Paso de la Montaña)
--   orco_montana        Orco de Montaña (Paso de la Montaña)
--   lobo_nieve          Lobo de las Nieves (Paso y Pinar Nevado)
--   minero_corrompido   Minero Corrompido (Minas Abandonadas)
--   murcielago_caverna  Murciélago de Caverna (Minas Abandonadas)
--   centinela_piedra    Centinela de Piedra (Minas y Garganta del Eco)
--   espectro_helado     Espectro Helado (Pinar Nevado y Lago Helado)
--   oso_cumbres         Oso de las Cumbres (Pinar Nevado y Cumbre del Rey)
--   sierpe_hielo        Sierpe de Hielo (Lago Helado)
--   troll_salvaje       Troll Salvaje (Garganta del Eco y Acantilados)
--   arpia_eco           Arpía del Eco (Garganta del Eco y Cornisas)
--   elemental_tormenta  Elemental de Tormenta (Acantilados del Trueno y Cumbre)
--   gigante_hielo       Gigante de Hielo, raro, 56x56
--   brujo_montana       Brujo de la Montaña, raro, 56x56
--   senor_acantilado    Señor del Acantilado, minijefe, 64x64
--   rey_montana         Rey de la Montaña, jefe, 64x64
--   guardia_tormenta    Guardia de la Tormenta (Cumbre del Rey): soldado enano espectral del Rey
-- y los de la Mina Profunda (mazmorra):
--   mina_minero         Minero Poseído (guardián)
--   mina_golem_veta     Gólem de Veta (guardián), 56x56
--   mina_golem_negro    Gólem de Hierro Negro (jefe), 64x64
-- Mismo estilo que crear_enemigos_pradera2.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona2/<clave>.aseprite y
-- enemigos_montanas.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_montanas.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", E="1c1420", R="c0343a", r="7a1f2a", Y="e8c050", y="a8802c", pk="d88a96",
  -- comunes a varios: metal, madera, piel humana, colmillo
  m1="b8c0cc", m2="7a8290", m3="4a505e", w1="8a5a3a", w2="5e3a22", w3="3e2616", T="eee0c0", t="b8a880",
  s1="d8b090", s2="a88468", s3="7a5a44",
  -- rayo y escarcha (brillan: sin contorno)
  z1="fff7a0", z2="ffd23a", z3="e8a020", i1="e6fbff", i2="a8e4ff",
  -- cabra
  g1="c2b29a", g2="948268", g3="66574a", g4="3e342c", gb="ece4d4", hn="dccca4", hn2="a8946c",
  -- orco
  o1="8e9e7e", o2="66745c", o3="444e3c", f1="8a6a4a", f2="5e4630",
  -- lobo de las nieves
  l1="f2f6fa", l2="cad6e6", l3="9aaac2", l4="6a7892", le="6fe0ff",
  -- minero corrompido
  bd1="9a9aa6", bd2="64646e", hm1="c8a850", hm2="8a7030", c1="5e4e6e", c2="3e324c", v1="d8a8ff", v2="9a5ae8", vn="2a1838",
  -- murciélago
  b1="6e5e74", b2="4c4056", b3="302838", wm1="8e5e70", wm2="5e3a4c",
  -- centinela de piedra
  st1="aeaaa2", st2="84807a", st3="5c5852", st4="3e3c38", ru="ffb04a", ru2="e07a20",
  -- espectro helado
  e1="dcf6ff", e2="9cd6f0", e3="5ca2ca", e4="2e6a96",
  -- oso
  br1="946642", br2="704c32", br3="4e3422", br4="30200f", sn="b8916e",
  -- sierpe
  sp1="cdf2ff", sp2="8ed2f0", sp3="4c9cca", sp4="2a5e8c", sb="f2fcff",
  -- troll
  t1="7e9e5c", t2="5e7e44", t3="40602e", t4="2a4020", th="4a3a2a",
  -- arpía
  a1="aeaab6", a2="7e7a88", a3="54505e", ah="3a3046", ta="e8d070",
  -- elemental de tormenta
  cl1="9a9cb0", cl2="6c6e86", cl3="44465c", cl4="2a2c40",
  -- gigante de hielo
  ig1="9ccaea", ig2="6c9cc2", ig3="486e96", ig4="2c4868",
  -- brujo
  rb1="4c5c7c", rb2="36425c", rb3="242c40",
  -- señor del acantilado
  cp1="7e2c3c", cp2="501c28",
  -- rey de la montaña
  kr1="5a6a8e", kr2="3e4a68", kr3="283048",
  -- guardia de la tormenta: hierro espectral azulado
  gt1="a8bcd8", gt2="7a8eb0", gt3="4e5e80", gt4="2e3a56", gs1="cfe6ff", gs2="8ec2f0",
  -- mina profunda: hierro negro, roca de veta y cristal de eclipse
  hk1="5c5a6a", hk2="3e3c4c", hk3="282632", hk4="18161e", ec1="c890ff", ec2="8a4ad8", ec3="4e2490",
  rv1="8a8478", rv2="66615a", rv3="48443e", ore="c8b070",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, z1=true, z2=true, i1=true, v1=true, ru=true, le=true, gs1=true, ec1=true}

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
  -- rayo en zigzag de (x0,y0) a (x1,y1)
  function G.bolt(x0,y0,x1,y1,seg)
    local n = seg or 4
    local px, py = x0, y0
    for i=1,n do
      local t = i/n
      local nx = x0 + (x1-x0)*t + ((i < n) and ((i % 2 == 0) and 2 or -2) or 0)
      local ny = y0 + (y1-y0)*t
      G.line(px, py, nx, ny, "z2"); G.line(px, py-1, nx, ny-1, "z1")
      px, py = nx, ny
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

-- ojo: brillo normal, o cerrado con dolor
local function eye(G, x, y, c, pain)
  if pain then G.px(x, y, "K"); G.px(x+1, y, "K") else G.px(x, y, c) end
end

-- =====================================================================================
-- Cabra Montés (48x48, suelo en 45): ágil, pelo gris pardo, barba y cuernos en espiral
-- =====================================================================================
local function cabra(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(22,41,12,4,"g2"); G.ridge(22,41,12,4,"g1",2); G.ellipse(22,43,8,1,"gb")
    G.ellipse(37,41,4,3,"g2"); G.line(38,38,42,36,"hn"); G.line(42,36,44,38,"hn2")
    G.line(14,44,10,45,"g3"); G.line(28,44,33,45,"g3"); G.px(36,41,"K")
    return G
  end
  local lean = P.charge and 2 or 0
  -- patas finas traseras
  G.thick(14+dx, 34+b, 12+dx, 44, 2, "g3"); G.thick(28+dx, 34+b, 30+dx+lean, 44, 2, "g3")
  G.rect(11+dx, 44, 13+dx, 45, "g4"); G.rect(29+dx+lean, 44, 31+dx+lean, 45, "g4")
  -- cola corta
  G.line(8+dx, 27+b, 6+dx, 24+b, "g1"); G.px(6+dx, 23+b, "gb")
  -- cuerpo
  G.ellipse(20+dx, 30+b, 12, 7, "g2"); G.ridge(20+dx, 30+b, 12, 7, "g1", 2)
  G.ellipse(21+dx, 35+b, 8, 2, "gb")
  -- patas delanteras
  G.thick(17+dx, 34+b, 17+dx, 44, 2, "g2"); G.thick(31+dx, 33+b, 33+dx+lean, 44, 2, "g2")
  G.rect(16+dx, 44, 18+dx, 45, "g4"); G.rect(32+dx+lean, 44, 34+dx+lean, 45, "g4")
  -- cuello y cabeza (baja al embestir)
  local hx, hy = dx + lean + (P.hx or 0), b + (P.hy or 0) + (P.charge and 4 or 0)
  G.thick(29+dx, 27+b, 33+hx, 22+hy, 4, "g2")
  G.ellipse(35+hx, 20+hy, 4, 3, "g2"); G.rect(37+hx, 20+hy, 41+hx, 23+hy, "g1"); G.px(41+hx, 21+hy, "g4")
  -- barba
  G.line(37+hx, 24+hy, 37+hx, 28+hy, "gb"); G.px(38+hx, 26+hy, "gb")
  -- oreja
  G.line(32+hx, 19+hy, 29+hx, 20+hy, "g3")
  eye(G, 36+hx, 19+hy, "Y", P.pain)
  -- cuernos en espiral hacia atrás
  G.thick(34+hx, 17+hy, 30+hx, 12+hy, 2, "hn"); G.thick(30+hx, 12+hy, 26+hx, 13+hy, 2, "hn")
  G.line(26+hx, 13+hy, 25+hx, 17+hy, "hn2"); G.line(25+hx, 17+hy, 27+hx, 19+hy, "hn2")
  for k=0,2 do G.px(32-k*2+hx, 14+hy+(k==2 and -1 or 0), "hn2") end
  return G
end

-- =====================================================================================
-- Orco de Montaña (48x48): piel gris verdosa, pelliza de piel, colmillos y hacha mellada
-- =====================================================================================
local function orco(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,14,3,"o3"); G.rect(10,39,30,41,"f1"); G.ellipse(34,40,5,3,"o2")
    G.px(33,39,"K"); G.px(36,39,"K"); G.px(37,42,"T")
    G.line(4,44,18,44,"w2"); G.rect(2,41,6,44,"m2")
    return G
  end
  -- hacha detrás del hombro o bajando de golpe
  local ax, ay = 32+dx, 22+b
  if P.swing then
    G.thick(ax, ay, ax+11, ay+12, 2, "w1"); G.rect(ax+9, ay+10, ax+14, ay+17, "m2"); G.rect(ax+12, ay+10, ax+14, ay+17, "m1")
  else
    G.thick(ax+3, ay+10, ax+4, ay-12, 2, "w1"); G.rect(ax+5, ay-13, ax+10, ay-6, "m2"); G.rect(ax+9, ay-13, ax+10, ay-6, "m1")
  end
  -- piernas cortas y anchas
  G.thick(19+dx, 34+b, 17+dx, 43, 4, "o3"); G.thick(28+dx, 34+b, 30+dx, 43, 4, "o3")
  G.rect(14+dx, 43, 20+dx, 45, "f2"); G.rect(28+dx, 43, 34+dx, 45, "f2")
  -- torso ancho con pelliza
  G.ellipse(24+dx, 26+b, 10, 9, "o2"); G.ellipse(22+dx, 25+b, 7, 6, "o1")
  G.rect(14+dx, 30+b, 34+dx, 35+b, "f2"); G.rect(14+dx, 30+b, 34+dx, 31+b, "f1")
  G.ellipse(17+dx, 19+b, 5, 3, "f1"); G.ellipse(31+dx, 19+b, 5, 3, "f1")
  for x=13,35,3 do G.px(x+dx, 21+b, "f2") end
  -- brazo trasero
  G.thick(15+dx, 21+b, 12+dx, 31+b, 3, "o3")
  -- cabeza con mandíbula saliente
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(26+hx, 12+hy, 6, 6, "o2"); G.ellipse(25+hx, 11+hy, 4, 4, "o1")
  G.rect(26+hx, 15+hy, 33+hx, 18+hy, "o2")
  G.px(28+hx, 15+hy, "T"); G.px(28+hx, 14+hy, "T"); G.px(32+hx, 15+hy, "T"); G.px(32+hx, 14+hy, "T")
  G.rect(24+hx, 9+hy, 31+hx, 9+hy, "o3")
  eye(G, 29+hx, 10+hy, "R", P.pain)
  G.line(20+hx, 7+hy, 23+hx, 5+hy, "th")
  -- brazo con el hacha
  G.thick(31+dx, 21+b, ax, ay+(P.swing and 1 or 0), 3, "o2")
  return G
end

-- =====================================================================================
-- Lobo de las Nieves (48x48): pelaje blanco y espeso, ojos de hielo
-- =====================================================================================
local function lobo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(23,41,12,4,"l2"); G.ridge(23,41,12,4,"l1",2)
    G.ellipse(37,42,5,3,"l2"); G.rect(40,42,44,44,"l1"); G.px(44,42,"K"); G.px(37,41,"K")
    G.thick(18,44,21,45,2,"l3"); G.thick(28,44,31,45,2,"l3")
    return G
  end
  local feet = P.feet or {{14,44},{18,44},{31,44},{28,44}}
  local hip, sh = {16+dx, 35+b}, {30+dx, 35+b}
  -- cola tupida
  G.thick(11+dx, 30+b, 4+dx, 26+b-(P.tail or 0), 3, "l2"); G.px(3+dx, 25+b-(P.tail or 0), "l1")
  G.thick(hip[1]-1, hip[2], feet[1][1], feet[1][2], 2, "l3"); G.rect(feet[1][1]-1,feet[1][2]+1,feet[1][1]+1,feet[1][2]+1,"l4")
  G.thick(sh[1]+1, sh[2], feet[3][1], feet[3][2], 2, "l3"); G.rect(feet[3][1]-1,feet[3][2]+1,feet[3][1]+1,feet[3][2]+1,"l4")
  G.ellipse(22+dx, 32+b, 11, 6, "l2"); G.ridge(22+dx, 32+b, 11, 6, "l1", 3)
  -- pelo erizado del lomo
  for x=13,29,3 do G.line(x+dx, 27+b, x+1+dx, 25+b, "l1") end
  G.thick(hip[1]+2, hip[2], feet[2][1], feet[2][2], 3, "l2"); G.rect(feet[2][1]-1,feet[2][2]+1,feet[2][1]+2,feet[2][2]+1,"l4")
  G.thick(sh[1]-2, sh[2], feet[4][1], feet[4][2], 3, "l2"); G.rect(feet[4][1]-1,feet[4][2]+1,feet[4][1]+2,feet[4][2]+1,"l4")
  -- melena del cuello
  G.ellipse(31+dx, 28+b, 6, 7, "l1"); G.px(27+dx, 33+b, "l2"); G.px(30+dx, 35+b, "l2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(36+hx, 25+hy, 5, 4, "l1")
  G.rect(40+hx, 25+hy, 45+hx, 27+hy, "l1"); G.rect(40+hx, 27+hy, 44+hx, 28+hy, "l2"); G.px(45+hx, 25+hy, "K")
  G.line(33+hx, 21+hy, 34+hx, 18+hy, "l2"); G.line(36+hx, 21+hy, 37+hx, 18+hy, "l2")
  eye(G, 39+hx, 24+hy, "le", P.pain)
  if P.bite then
    G.rect(40+hx, 28+hy, 45+hx, 28+hy, "r"); G.px(41+hx,28+hy,"W"); G.px(44+hx,28+hy,"W")
    G.rect(40+hx, 29+hy, 44+hx, 30+hy, "l2"); G.px(43+hx,29+hy,"W")
    G.px(46+hx, 26+hy, "i1"); G.px(47+hx, 29+hy, "i2")
  end
  return G
end

-- =====================================================================================
-- Minero Corrompido (48x48): enano con casco y vela, barba gris, pico; ojos y venas violetas
-- =====================================================================================
local function minero(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,13,3,"c2"); G.rect(12,39,28,41,"c1"); G.ellipse(32,40,5,3,"bd1")
    G.ellipse(36,38,4,2,"hm1"); G.px(39,36,"y")
    G.line(4,44,20,42,"w2"); G.line(2,40,6,46,"m2")
    return G
  end
  -- pico detrás o clavándose
  local px0, py0 = 31+dx, 25+b
  if P.swing then
    G.thick(px0, py0, px0+10, py0+6, 2, "w1")
    G.line(px0+8, py0-2, px0+12, py0+3, "m2"); G.line(px0+12, py0+3, px0+13, py0+11, "m1"); G.line(px0+8, py0-2, px0+6, py0-5, "m2")
  else
    G.thick(px0, py0, px0-2, py0-14, 2, "w1")
    G.line(px0-8, py0-13, px0-2, py0-15, "m2"); G.line(px0-2, py0-15, px0+5, py0-12, "m1"); G.px(px0+6, py0-11, "m1")
  end
  -- piernas cortas y botas
  G.thick(20+dx, 35+b, 19+dx, 43, 4, "c2"); G.thick(28+dx, 35+b, 29+dx, 43, 4, "c2")
  G.rect(16+dx, 43, 22+dx, 45, "w3"); G.rect(26+dx, 43, 32+dx, 45, "w3")
  -- cuerpo rechoncho con tirantes
  G.ellipse(24+dx, 29+b, 10, 8, "c1"); G.ridge(24+dx, 29+b, 10, 8, "c2", 1)
  G.line(19+dx, 22+b, 20+dx, 36+b, "w2"); G.line(29+dx, 22+b, 28+dx, 36+b, "w2")
  -- venas de corrupción
  G.line(16+dx, 28+b, 19+dx, 32+b, "vn"); G.line(30+dx, 26+b, 32+dx, 31+b, "vn")
  -- brazo trasero
  G.thick(16+dx, 24+b, 14+dx, 33+b, 3, "s2")
  -- cabeza: barba larga, nariz grande, casco con vela
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 15+hy, 6, 5, "s1")
  G.ellipse(26+hx, 21+hy, 7, 5, "bd1"); G.rect(22+hx, 21+hy, 30+hx, 26+hy, "bd1"); G.line(23+hx, 22+hy, 25+hx, 27+hy, "bd2"); G.line(28+hx, 22+hy, 29+hx, 27+hy, "bd2")
  G.ellipse(31+hx, 17+hy, 2, 2, "s2")
  G.ellipse(25+hx, 11+hy, 7, 4, "hm1"); G.rect(18+hx, 12+hy, 33+hx, 13+hy, "hm2")
  G.rect(24+hx, 5+hy, 26+hx, 8+hy, "W"); G.px(25+hx, 4+hy, "z2"); G.px(25+hx, 3+hy, "z1")
  if P.pain then G.px(28+hx,15+hy,"K"); G.px(29+hx,15+hy,"K")
  else G.px(28+hx,15+hy,"v1"); G.px(29+hx,15+hy,"v2") end
  -- brazo con el pico
  G.thick(30+dx, 24+b, px0, py0+(P.swing and 1 or 0), 3, "s2")
  return G
end

-- =====================================================================================
-- Murciélago de Caverna (48x48): vuela en el lugar batiendo las alas
-- =====================================================================================
local function murcielago(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 4
  if P.dead then
    G.ellipse(24,42,6,3,"b2"); G.line(18,42,8,44,"wm2"); G.line(30,42,40,44,"wm2")
    G.line(8,44,12,40,"wm1"); G.line(40,44,36,40,"wm1"); G.px(25,41,"K"); G.px(27,41,"K")
    return G
  end
  local up = P.wing == 1
  local cx, cy = 24+dx, 26+b
  -- alas: membrana entre los dedos
  local function wing(side)
    local s = side
    local tipY = up and cy-16 or cy+6
    local midY = up and cy-10 or cy+2
    G.line(cx+s*4, cy-2, cx+s*12, midY, "b3"); G.line(cx+s*12, midY, cx+s*20, tipY, "b3")
    for k=0,8 do
      local t = k/8
      local x0, y0 = cx+s*4, cy-2
      local x1, y1 = cx+s*(12+8*t), midY+(tipY-midY)*t
      G.line(x0, y0+2, x1, y1+2+math.floor(4*(1-math.abs(t-0.5)*2)), k % 3 == 0 and "wm2" or "wm1")
    end
    G.line(cx+s*12, midY, cx+s*10, cy+6, "b3"); G.line(cx+s*20, tipY, cx+s*18, tipY+8, "b3")
  end
  wing(-1); wing(1)
  -- cuerpo peludo
  G.ellipse(cx, cy, 5, 7, "b2"); G.ellipse(cx-1, cy-1, 3, 5, "b1")
  -- patitas
  G.line(cx-2, cy+7, cx-3, cy+10, "b3"); G.line(cx+2, cy+7, cx+3, cy+10, "b3")
  -- cabeza con orejas grandes
  local hx, hy = (P.hx or 0), (P.hy or 0)
  G.ellipse(cx+2+hx, cy-8+hy, 4, 3, "b1")
  G.line(cx-1+hx, cy-10+hy, cx-2+hx, cy-15+hy, "b2"); G.line(cx+4+hx, cy-10+hy, cx+5+hx, cy-15+hy, "b2")
  G.px(cx-1+hx, cy-13+hy, "pk"); G.px(cx+5+hx, cy-13+hy, "pk")
  eye(G, cx+3+hx, cy-9+hy, "R", P.pain)
  if P.shriek then
    G.rect(cx+4+hx, cy-7+hy, cx+6+hx, cy-5+hy, "r"); G.px(cx+4+hx, cy-7+hy, "W"); G.px(cx+6+hx, cy-7+hy, "W")
    for k=0,2 do G.line(cx+10+k*4+hx, cy-11+hy-k, cx+10+k*4+hx, cy-3+hy+k, "i2") end
  else
    G.px(cx+5+hx, cy-6+hy, "W")
  end
  return G
end

-- =====================================================================================
-- Centinela de Piedra (48x48): guardián enano de roca tallada con una runa encendida
-- =====================================================================================
local function centinela(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,43,15,3,"st3"); G.rect(10,38,22,42,"st2"); G.rect(10,38,22,39,"st1")
    G.rect(25,40,33,43,"st2"); G.rect(35,41,40,43,"st3"); G.px(28,41,"ru2")
    return G
  end
  local slam = P.slam
  -- piernas de bloque
  G.rect(16+dx, 36+b, 21+dx, 45, "st3"); G.rect(27+dx, 36+b, 32+dx, 45, "st3")
  G.rect(16+dx, 36+b, 17+dx, 45, "st2"); G.rect(27+dx, 36+b, 28+dx, 45, "st2")
  -- brazo trasero
  G.rect(9+dx, 18+b, 13+dx, 32+b, "st3"); G.rect(8+dx, 31+b, 14+dx, 36+b, "st4")
  -- torso tallado
  G.rect(13+dx, 14+b, 35+dx, 37+b, "st2"); G.rect(13+dx, 14+b, 16+dx, 37+b, "st1"); G.rect(32+dx, 14+b, 35+dx, 37+b, "st3")
  G.line(13+dx, 25+b, 35+dx, 25+b, "st4"); G.line(24+dx, 14+b, 24+dx, 25+b, "st4")
  -- nieve sobre los hombros
  G.rect(13+dx, 13+b, 19+dx, 14+b, "W"); G.rect(29+dx, 13+b, 35+dx, 14+b, "W")
  -- runa del pecho
  local rc = P.glow and "ru" or "ru2"
  G.line(22+dx, 28+b, 26+dx, 28+b, rc); G.line(24+dx, 27+b, 24+dx, 34+b, rc); G.line(22+dx, 32+b, 26+dx, 34+b, rc)
  -- cabeza: yelmo cuadrado con una ranura
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(19+hx, 4+hy, 31+hx, 13+hy, "st2"); G.rect(19+hx, 4+hy, 21+hx, 13+hy, "st1"); G.rect(18+hx, 3+hy, 32+hx, 4+hy, "st3")
  if P.pain then G.rect(23+hx, 8+hy, 30+hx, 8+hy, "st4") else G.rect(23+hx, 8+hy, 30+hx, 9+hy, "ru") end
  -- brazo delantero (puño de roca)
  if slam then
    G.thick(34+dx, 17+b, 41+dx, 32+b, 5, "st3"); G.rect(37+dx, 32+b, 45+dx, 39+b, "st2"); G.rect(37+dx, 32+b, 45+dx, 33+b, "st1")
    for k=0,2 do G.px(37+dx+k*4, 44, "st1") end
  else
    G.rect(35+dx, 17+b, 40+dx, 31+b, "st3"); G.rect(35+dx, 17+b, 36+dx, 31+b, "st2"); G.rect(34+dx, 30+b, 41+dx, 36+b, "st2")
  end
  return G
end

-- =====================================================================================
-- Espectro Helado (48x48): alma encapuchada de escarcha que flota, con cola de neblina
-- =====================================================================================
local function espectro(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 2
  if P.dead then
    G.ellipse(24,43,12,2,"e3"); G.ellipse(24,42,8,1,"e2")
    for _,m in ipairs({{14,36},{22,32},{31,35},{36,30}}) do G.px(m[1], m[2], "i2") end
    return G
  end
  local ph = P.phase or 0
  -- cola de neblina que se deshace
  for y=30,42 do
    local w = math.max(1, (42 - y) // 2)
    local sway = ((y + ph) % 4 < 2) and 1 or -1
    G.rect(20+dx+sway-w, y+b, 27+dx+sway+w-6, y+b, y > 38 and "e3" or "e2")
  end
  -- manto
  G.ellipse(24+dx, 24+b, 9, 10, "e2"); G.ellipse(22+dx, 23+b, 6, 8, "e1")
  for x=15,33,3 do G.px(x+dx, 33+b+((x+ph) % 2), "e3") end
  -- capucha y rostro hundido
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 12+hy, 7, 8, "e2"); G.ellipse(27+hx, 14+hy, 4, 5, "e4")
  G.line(19+hx, 7+hy, 22+hx, 3+hy, "e2")
  if P.pain then G.px(26+hx,13+hy,"e3"); G.px(29+hx,13+hy,"e3")
  else G.px(26+hx,13+hy,"W"); G.px(29+hx,13+hy,"W"); G.px(27+hx,17+hy,"e3") end
  -- brazo largo con dedos de hielo
  local cast = P.cast
  local ax, ay = 34+dx+(cast and 6 or 0), 22+b-(cast and 2 or 0)
  G.thick(29+dx, 19+b, ax, ay, 3, "e2")
  G.line(ax, ay, ax+3, ay-2, "e1"); G.line(ax, ay, ax+4, ay, "e1"); G.line(ax, ay, ax+3, ay+2, "e1")
  if cast then
    G.ellipse(ax+7, ay, 3, 3, "i2"); G.px(ax+7, ay, "i1"); G.px(ax+10, ay-3, "i1"); G.px(ax+11, ay+2, "i2")
  end
  -- copos alrededor
  for k,m in ipairs({{9,12},{39,8},{6,28},{41,34}}) do if (k + ph) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "i1") end end
  return G
end

-- =====================================================================================
-- Oso de las Cumbres (48x48): enorme, pardo, con escarcha en el lomo y garras claras
-- =====================================================================================
local function oso(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 3, P.bob or 0
  if P.dead then
    G.ellipse(23,40,15,5,"br2"); G.ridge(23,40,15,5,"br1",2); G.ridge(23,40,15,5,"W",1)
    G.ellipse(40,41,5,4,"br2"); G.rect(43,41,46,43,"sn"); G.px(39,40,"K")
    G.thick(14,44,18,45,3,"br3"); G.thick(28,44,32,45,3,"br3")
    return G
  end
  local rear = P.rear
  -- patas traseras
  G.thick(13+dx, 34+b, 12+dx, 43, 5, "br3"); G.rect(9+dx, 43, 15+dx, 45, "br4")
  -- cuerpo macizo (se levanta al atacar)
  local tilt = rear and -5 or 0
  G.ellipse(21+dx, 29+b, 14, 10, "br2"); G.ridge(21+dx, 29+b, 14, 10, "br1", 2)
  G.ellipse(30+dx, 26+b+tilt, 9, 9, "br2"); G.ridge(30+dx, 26+b+tilt, 9, 9, "br1", 2)
  -- escarcha en el lomo
  G.ridge(21+dx, 29+b, 13, 10, "W", 1); G.ridge(30+dx, 26+b+tilt, 8, 9, "W", 1)
  for x=12,34,4 do G.px(x+dx, 21+b+(x > 24 and tilt or 0), "i2") end
  -- patas delanteras (al levantarse, zarpas al frente)
  G.thick(17+dx, 34+b, 17+dx, 43, 5, "br2"); G.rect(14+dx, 43, 20+dx, 45, "br4")
  if rear then
    G.thick(35+dx, 24+b+tilt, 43+dx, 18+b, 5, "br2"); G.rect(42+dx, 15+b, 46+dx, 19+b, "br3")
    for k=0,2 do G.line(46+dx, 15+b+k*2, 48+dx, 14+b+k*2, "T") end
  else
    G.thick(34+dx, 32+b, 35+dx, 43, 5, "br2"); G.rect(32+dx, 43, 38+dx, 45, "br4")
    for k=0,2 do G.px(37+dx+k, 45, "T") end
  end
  -- cabeza redonda con orejas y hocico claro
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0) + tilt
  G.ellipse(38+hx, 21+hy, 6, 5, "br2"); G.ellipse(37+hx, 20+hy, 4, 3, "br1")
  G.ellipse(34+hx, 16+hy, 2, 2, "br2"); G.ellipse(40+hx, 16+hy, 2, 2, "br2")
  G.rect(42+hx, 21+hy, 46+hx, 25+hy, "sn"); G.px(46+hx, 22+hy, "K")
  eye(G, 40+hx, 20+hy, "E", P.pain)
  if rear then G.rect(42+hx, 25+hy, 45+hx, 26+hy, "r"); G.px(43+hx, 25+hy, "W"); G.px(45+hx, 25+hy, "W") end
  return G
end

-- =====================================================================================
-- Sierpe de Hielo (48x48): serpiente enroscada de escamas transparentes, cuello erguido
-- =====================================================================================
local function sierpe(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(20,42,14,3,"sp3"); G.ellipse(20,41,11,2,"sp2"); G.ellipse(38,42,6,2,"sp3")
    G.px(42,41,"K"); G.line(6,43,2,45,"sp4")
    return G
  end
  local ph = P.phase or 0
  -- anillos del cuerpo enroscado
  G.ellipse(19+dx, 39, 14, 5, "sp3"); G.ellipse(19+dx, 38, 12, 4, "sp2"); G.ellipse(21+dx, 40, 8, 2, "sb")
  G.ellipse(16+dx, 33+b, 10, 4, "sp3"); G.ellipse(16+dx, 32+b, 8, 3, "sp2")
  -- punta de la cola
  G.line(4+dx, 40, 1+dx, 36-ph, "sp3"); G.px(1+dx, 35-ph, "i2")
  -- cuello que sube en S
  local lean = P.lunge and 6 or 0
  local hx, hy = dx + lean + (P.hx or 0), b + (P.hy or 0) + (P.lunge and 4 or 0)
  for i=0,12 do
    local t = i/12
    local x = 22 + dx + 8*t + lean*t + math.sin(t*3.1)*3
    local y = 32 + b - 16*t + (hy - b)*t
    G.ellipse(x, y, 3, 3, "sp3"); G.px(x-1, y-1, "sp2"); G.px(x+2, y+1, "sb")
  end
  -- escamas brillantes
  for k,m in ipairs({{10,37},{18,36},{26,38},{14,31}}) do if (k + ph) % 2 == 0 then G.px(m[1]+dx, m[2], "i1") end end
  -- cabeza con cresta de hielo
  G.ellipse(34+hx, 15+hy, 5, 4, "sp2"); G.rect(36+hx, 15+hy, 42+hx, 18+hy, "sp2"); G.rect(36+hx, 18+hy, 41+hx, 19+hy, "sp3")
  G.line(30+hx, 12+hy, 26+hx, 8+hy, "i2"); G.line(32+hx, 11+hy, 30+hx, 6+hy, "i1"); G.line(34+hx, 11+hy, 34+hx, 7+hy, "i2")
  eye(G, 37+hx, 14+hy, "Y", P.pain)
  if P.cast then
    G.rect(38+hx, 18+hy, 42+hx, 19+hy, "r")
    for k=0,4 do G.ellipse(45+hx+k*2, 18+hy+((k % 2 == 0) and -1 or 1), 1.5, 1.5, k < 2 and "i1" or "i2") end
  end
  return G
end

-- =====================================================================================
-- Troll Salvaje (48x48): encorvado, brazos largos, piel verde y garrote de tronco
-- =====================================================================================
local function troll(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,16,3,"t3"); G.ellipse(22,40,13,3,"t2"); G.ellipse(38,40,5,3,"t2")
    G.px(37,39,"K"); G.px(40,39,"K"); G.rect(2,40,12,43,"w2"); G.rect(2,40,12,40,"w1")
    return G
  end
  -- garrote
  local gx, gy = 34+dx, 30+b
  if P.swing then
    G.thick(gx, gy-8, gx+9, gy+4, 3, "w1"); G.ellipse(gx+11, gy+7, 4, 5, "w2"); G.ellipse(gx+10, gy+6, 3, 4, "w1")
  else
    G.thick(gx, gy, gx+3, gy+12, 3, "w1"); G.ellipse(gx+4, gy+14, 4, 3, "w2"); G.px(gx+3, gy+13, "w1")
  end
  -- piernas cortas y gruesas
  G.thick(17+dx, 35+b, 15+dx, 43, 5, "t3"); G.thick(28+dx, 35+b, 29+dx, 43, 5, "t3")
  G.rect(11+dx, 43, 19+dx, 45, "t4"); G.rect(26+dx, 43, 33+dx, 45, "t4")
  -- taparrabo
  G.rect(15+dx, 32+b, 31+dx, 36+b, "f2"); G.rect(15+dx, 32+b, 31+dx, 32+b, "f1")
  -- torso jorobado
  G.ellipse(23+dx, 24+b, 12, 11, "t2"); G.ellipse(21+dx, 22+b, 9, 8, "t1")
  G.ellipse(24+dx, 29+b, 7, 3, "t3")
  -- verrugas
  G.px(16+dx, 19+b, "t3"); G.px(19+dx, 15+b, "t3"); G.px(27+dx, 18+b, "t3")
  -- brazo trasero largo
  G.thick(13+dx, 20+b, 10+dx, 36+b, 4, "t3"); G.ellipse(10+dx, 37+b, 3, 2, "t3")
  -- cabeza pequeña adelantada
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(32+hx, 16+hy, 6, 5, "t2"); G.ellipse(31+hx, 15+hy, 4, 3, "t1")
  G.ellipse(37+hx, 17+hy, 2, 2, "t3")
  G.rect(33+hx, 20+hy, 37+hx, 21+hy, "t4"); G.px(34+hx, 19+hy, "T"); G.px(37+hx, 19+hy, "T")
  G.line(28+hx, 11+hy, 24+hx, 9+hy, "th"); G.line(30+hx, 11+hy, 28+hx, 7+hy, "th")
  eye(G, 34+hx, 15+hy, "Y", P.pain)
  -- brazo con el garrote
  G.thick(31+dx, 22+b, gx, gy-(P.swing and 8 or 0), 4, "t2")
  if P.regen then for _,m in ipairs({{12,10},{36,4},{8,24},{40,28}}) do G.px(m[1]+dx, m[2]+b, "le"); G.px(m[1]+dx, m[2]+b-1, "le") end end
  return G
end

-- =====================================================================================
-- Arpía del Eco (48x48): mujer ave de plumas grises, alas en vez de brazos y garras doradas
-- =====================================================================================
local function arpia(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 3
  if P.dead then
    G.ellipse(24,42,10,3,"a2"); G.line(14,42,4,44,"a3"); G.line(6,40,4,44,"a1")
    G.ellipse(32,41,4,3,"s1"); G.rect(29,39,36,40,"ah"); G.px(33,41,"K"); G.line(20,44,24,45,"ta")
    return G
  end
  local up = P.wing == 1
  local dive = P.dive
  -- ala en abanico: se rellena desde el hombro hasta el borde, con las plumas largas marcadas
  local function fan(sx, sy, ax, ay, bx, by, c, edge)
    for i=0,16 do local t = i/16; G.line(sx, sy, ax+(bx-ax)*t, ay+(by-ay)*t, c) end
    for i=0,4 do local t = i/4; local ex, ey = ax+(bx-ax)*t, ay+(by-ay)*t; G.line(ex, ey, ex+(sx-ex)*0.3, ey+(sy-ey)*0.3, edge) end
  end
  -- ala trasera
  if up then fan(19+dx, 18+b, 9+dx, 2+b, 3+dx, 14+b, "a3", "ah")
  else fan(19+dx, 18+b, 3+dx, 22+b, 9+dx, 33+b, "a3", "ah") end
  -- patas de ave con garras
  local fy = dive and -4 or 0
  G.thick(21+dx, 32+b, 20+dx+(dive and 6 or 0), 41+b+fy, 2, "ta"); G.thick(27+dx, 32+b, 28+dx+(dive and 8 or 0), 41+b+fy, 2, "ta")
  for _,fx in ipairs({20+(dive and 6 or 0), 28+(dive and 8 or 0)}) do
    G.line(fx+dx, 41+b+fy, fx+dx+3, 43+b+fy, "ta"); G.line(fx+dx, 41+b+fy, fx+dx-2, 43+b+fy, "ta")
  end
  -- cuerpo emplumado
  G.ellipse(24+dx, 26+b, 7, 8, "a2"); G.ellipse(23+dx, 25+b, 5, 6, "a1")
  for y=28,34,2 do G.line(19+dx, y+b, 29+dx, y+b+1, "a3") end
  -- torso y cabeza de mujer
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(22+hx, 10+hy, 6, 6, "ah"); G.thick(18+hx, 10+hy, 14+hx, 20+hy, 3, "ah")
  G.ellipse(27+hx, 11+hy, 4, 5, "s1"); G.px(29+hx, 15+hy, "s1")
  G.rect(23+hx, 5+hy, 29+hx, 6+hy, "ah")
  eye(G, 28+hx, 11+hy, "Y", P.pain)
  if P.shriek then G.rect(28+hx, 14+hy, 30+hx, 15+hy, "r") else G.px(29+hx, 14+hy, "s3") end
  -- ala delantera
  if up then fan(28+dx, 19+b, 38+dx, 2+b, 45+dx, 13+b, "a2", "a3")
  else fan(28+dx, 19+b, 45+dx, 22+b, 38+dx, 34+b, "a2", "a3") end
  G.line(28+dx, 19+b, up and 38+dx or 45+dx, up and 2+b or 22+b, "a1")
  return G
end

-- =====================================================================================
-- Elemental de Tormenta (48x48): nube con forma de cuerpo, llena de relámpagos
-- =====================================================================================
local function elemental(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 3
  if P.dead then
    G.ellipse(18,42,8,2,"cl3"); G.ellipse(30,42,7,2,"cl2"); G.px(24,40,"z2"); G.px(12,38,"z1")
    return G
  end
  local ph = P.phase or 0
  -- base de nube que se deshace
  for k=0,4 do G.ellipse(16+dx+k*4, 38+b+((k+ph) % 2), 4, 3, k % 2 == 0 and "cl3" or "cl2") end
  -- cuerpo de nubes apiladas
  G.ellipse(24+dx, 28+b, 11, 9, "cl2"); G.ellipse(18+dx, 22+b, 7, 6, "cl2"); G.ellipse(30+dx, 21+b, 7, 6, "cl2")
  G.ellipse(23+dx, 25+b, 8, 6, "cl1"); G.ellipse(17+dx, 20+b, 4, 3, "cl1"); G.ellipse(30+dx, 19+b, 4, 3, "cl1")
  G.ellipse(24+dx, 33+b, 9, 3, "cl3")
  -- cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 11+hy, 7, 6, "cl2"); G.ellipse(24+hx, 10+hy, 5, 4, "cl1")
  if P.pain then G.px(27+hx,11+hy,"cl4"); G.px(30+hx,11+hy,"cl4")
  else G.rect(26+hx,10+hy,27+hx,12+hy,"z1"); G.rect(30+hx,10+hy,31+hx,12+hy,"z1") end
  -- relámpagos internos
  if ph == 0 then G.bolt(18+dx, 18+b, 26+dx, 34+b, 4) else G.bolt(30+dx, 17+b, 22+dx, 33+b, 4) end
  -- brazo de nube que suelta el rayo
  local cast = P.cast
  local ax, ay = 36+dx+(cast and 4 or 0), 24+b-(cast and 3 or 0)
  G.thick(31+dx, 24+b, ax, ay, 4, "cl2"); G.ellipse(ax+1, ay, 3, 3, "cl1")
  if cast then G.bolt(ax+2, ay-2, ax+7, ay-16, 3); G.bolt(ax+3, ay+1, ax+8, ay+12, 3); G.px(ax+4, ay, "z1") end
  -- chispas
  for k,m in ipairs({{8,12},{40,8},{6,30},{42,34}}) do if (k + ph) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "z1") end end
  return G
end

-- =====================================================================================
-- Gigante de Hielo (56x56, suelo en 53): piel azul, barba blanca, cristales en la espalda
-- y un garrote de hielo
-- =====================================================================================
local function gigante(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(28,50,20,4,"ig3"); G.ellipse(26,48,16,3,"ig2"); G.ellipse(44,47,5,3,"ig2")
    G.line(14,46,12,40,"i2"); G.line(20,46,19,39,"i1"); G.line(26,46,27,41,"i2"); G.px(44,46,"K")
    G.rect(2,49,12,51,"i2")
    return G
  end
  -- cristales de la espalda
  for i,c in ipairs({{11,10},{15,13},{19,9},{13,6}}) do
    local x, h = c[1]+dx, c[2] + (P.glow and 2 or 0)
    G.thick(x, 20+b, x-2, 20+b-h, 3, "i2"); G.line(x-1, 20+b, x-2, 20+b-h, "i1")
  end
  -- garrote de hielo
  local gx, gy = 41+dx, 30+b
  if P.swing then
    G.thick(gx, gy-10, gx+8, gy+6, 3, "ig3"); G.ellipse(gx+10, gy+10, 5, 6, "i2"); G.ellipse(gx+9, gy+9, 3, 4, "i1")
  else
    G.thick(gx, gy, gx+2, gy+14, 3, "ig3"); G.ellipse(gx+3, gy+17, 5, 4, "i2"); G.ellipse(gx+2, gy+16, 3, 2, "i1")
  end
  -- piernas
  G.thick(20+dx, 40+b, 18+dx, 51, 6, "ig3"); G.thick(32+dx, 40+b, 34+dx, 51, 6, "ig3")
  G.rect(13+dx, 51, 22+dx, 53, "ig4"); G.rect(31+dx, 51, 39+dx, 53, "ig4")
  -- taparrabo de piel
  G.rect(16+dx, 37+b, 38+dx, 43+b, "f1"); G.rect(16+dx, 42+b, 38+dx, 43+b, "f2")
  -- torso enorme
  G.ellipse(27+dx, 27+b, 13, 13, "ig2"); G.ellipse(25+dx, 25+b, 10, 10, "ig1")
  G.line(27+dx, 20+b, 27+dx, 34+b, "ig3")
  -- brazo trasero
  G.thick(15+dx, 22+b, 11+dx, 40+b, 5, "ig3"); G.ellipse(11+dx, 41+b, 3, 3, "ig3")
  -- cabeza con barba blanca y escarcha
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 10+hy, 7, 7, "ig2"); G.ellipse(30+hx, 9+hy, 5, 5, "ig1")
  G.ellipse(33+hx, 17+hy, 7, 5, "W"); G.rect(29+hx, 17+hy, 38+hx, 22+hy, "W"); G.line(31+hx, 19+hy, 32+hx, 24+hy, "i2"); G.line(36+hx, 18+hy, 36+hx, 23+hy, "i2")
  G.rect(29+hx, 7+hy, 37+hx, 7+hy, "ig3")
  if P.pain then G.px(34+hx,9+hy,"K"); G.px(35+hx,9+hy,"K") else G.px(34+hx,9+hy,"i1"); G.px(35+hx,9+hy,"le") end
  G.line(25+hx, 3+hy, 27+hx, 0+hy, "i1"); G.line(29+hx, 3+hy, 30+hx, 0+hy, "i2")
  -- brazo con el garrote
  G.thick(37+dx, 22+b, gx, gy-(P.swing and 10 or 0), 5, "ig2")
  return G
end

-- =====================================================================================
-- Brujo de la Montaña (56x56): viejo de túnica azul, barba larga y vara de pino con una
-- piedra que chispea
-- =====================================================================================
local function brujo(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(26,50,16,3,"rb3"); G.ellipse(25,48,13,3,"rb1"); G.ellipse(40,47,5,3,"s1"); G.rect(38,45,44,46,"W")
    G.line(4,51,24,49,"w1"); G.ellipse(3,51,2,2,"cl2"); G.px(41,46,"K")
    return G
  end
  local cast = P.cast
  -- vara (detrás) con la piedra de tormenta
  local vx, vy = 38+dx+(cast and 4 or 0), 8+b-(cast and 4 or 0)
  G.thick(vx-2, 46, vx, vy, 2, "w1"); G.line(vx-1, 30, vx, 24, "w2")
  G.line(vx, vy, vx-3, vy-3, "w2"); G.line(vx, vy, vx+3, vy-3, "w2")
  G.ellipse(vx, vy-3, 3, 3, "cl2"); G.px(vx, vy-3, P.glow and "z1" or "z2")
  if cast then G.bolt(vx+2, vy-3, vx+13, vy+3, 3); G.bolt(vx+2, vy, vx+12, vy+14, 3) end
  if P.glow and not cast then G.px(vx+4, vy-6, "z1"); G.px(vx-4, vy-7, "z2") end
  -- túnica larga
  for y=22,52 do
    local e = math.max(0, y-28)//3
    G.rect(17-e+dx, y+b*(y<34 and 1 or 0), 33+e+dx, y+b*(y<34 and 1 or 0), "rb1")
    G.rect(30+e+dx, y, 33+e+dx, y, "rb2")
  end
  G.rect(12+dx, 52, 38+dx, 53, "rb3")
  G.line(25+dx, 24+b, 25+dx, 52, "rb2")
  -- cinturón de cuerda con amuletos
  G.rect(18+dx, 33+b, 32+dx, 33+b, "t"); G.px(22+dx, 35+b, "z3"); G.px(27+dx, 35+b, "i2")
  -- brazo trasero
  G.thick(18+dx, 24+b, 15+dx, 36+b, 3, "rb2")
  -- cabeza: sombrero puntiagudo caído, barba larga
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(26+hx, 15+hy, 5, 5, "s1"); G.ellipse(29+hx, 16+hy, 2, 2, "s2")
  G.ellipse(26+hx, 22+hy, 5, 4, "W"); G.rect(23+hx, 22+hy, 29+hx, 31+hy, "W"); G.line(24+hx, 24+hy, 25+hx, 32+hy, "bd1"); G.px(28+hx, 30+hy, "bd1")
  G.rect(17+hx, 10+hy, 35+hx, 11+hy, "rb2"); G.ellipse(25+hx, 8+hy, 6, 4, "rb1")
  G.line(21+hx, 6+hy, 16+hx, 1+hy, "rb1"); G.line(22+hx, 6+hy, 18+hx, 0+hy, "rb1"); G.line(16+hx, 1+hy, 13+hx, 4+hy, "rb2")
  G.rect(20+hx, 9+hy, 31+hx, 9+hy, "z3")
  if P.pain then G.px(28+hx,14+hy,"K") else G.px(28+hx,14+hy,"z1"); G.px(29+hx,14+hy,"z2") end
  -- brazo que sostiene la vara
  G.thick(31+dx, 24+b, vx-1, 26+b-(cast and 6 or 0), 3, "rb1"); G.ellipse(vx-1, 26+b-(cast and 6 or 0), 2, 2, "s1")
  return G
end

-- =====================================================================================
-- Señor del Acantilado (64x64, suelo en 61): armadura de piedra, capa roja y una lanza que
-- atrae los rayos
-- =====================================================================================
local function senor(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(30,58,22,4,"st3"); G.rect(10,52,40,57,"cp2"); G.rect(14,50,36,54,"st2"); G.rect(14,50,36,51,"st1")
    G.ellipse(44,54,6,4,"st2"); G.rect(42,52,48,53,"st4")
    G.line(2,60,30,56,"m2"); G.px(2,60,"m1")
    return G
  end
  local cast = P.cast
  local thrust = P.thrust
  -- capa al viento detrás
  for y=18,56 do
    local w = 6 + (y-18)//4
    local sway = ((y + (P.phase or 0)) % 6 < 3) and 0 or 1
    local yy = y+b*(y<30 and 1 or 0)
    G.rect(14+dx-w+sway, yy, 20+dx, yy, "cp1")
    for fx=17,4,-4 do if fx > 14-w then G.px(fx+dx-((y-18)//6)+sway, yy, "cp2") end end
  end
  -- lanza (atrás en reposo, al frente al atacar)
  if thrust then
    G.thick(18+dx, 36+b, 62+dx, 30+b, 2, "w1"); G.line(54+dx, 28+b, 63+dx, 30+b, "m1"); G.line(54+dx, 32+b, 63+dx, 30+b, "m2")
  else
    G.thick(42+dx, 60, 46+dx, 2+b, 2, "w1"); G.line(44+dx, 2+b, 47+dx, -6+b, "m1"); G.line(48+dx, 2+b, 47+dx, -6+b, "m2")
    if cast then G.bolt(48+dx, 1+b, 60+dx, 10+b, 3); G.bolt(48+dx, 4+b, 58+dx, 22+b, 3); G.px(47+dx, 2+b, "z1") end
  end
  -- piernas con grebas de piedra
  G.thick(24+dx, 44+b, 22+dx, 59, 6, "st3"); G.thick(36+dx, 44+b, 38+dx, 59, 6, "st3")
  G.rect(18+dx, 58, 26+dx, 61, "st4"); G.rect(35+dx, 58, 43+dx, 61, "st4")
  G.rect(20+dx, 50+b, 26+dx, 52+b, "st1"); G.rect(35+dx, 50+b, 41+dx, 52+b, "st1")
  -- torso acorazado
  G.rect(19+dx, 22+b, 42+dx, 45+b, "st2"); G.rect(19+dx, 22+b, 23+dx, 45+b, "st1"); G.rect(38+dx, 22+b, 42+dx, 45+b, "st3")
  G.line(19+dx, 33+b, 42+dx, 33+b, "st4"); G.line(30+dx, 22+b, 30+dx, 45+b, "st4")
  -- rayo grabado en el peto
  G.line(29+dx, 25+b, 26+dx, 30+b, "z3"); G.line(26+dx, 30+b, 32+dx, 30+b, "z3"); G.line(32+dx, 30+b, 28+dx, 36+b, "z3")
  if cast or P.glow then G.line(29+dx, 25+b, 26+dx, 30+b, "z1"); G.line(32+dx, 30+b, 28+dx, 36+b, "z1") end
  -- hombreras de roca
  G.ellipse(19+dx, 22+b, 6, 4, "st2"); G.ridge(19+dx, 22+b, 6, 4, "st1", 2)
  G.ellipse(42+dx, 22+b, 6, 4, "st2"); G.ridge(42+dx, 22+b, 6, 4, "st1", 2)
  -- cabeza: yelmo con cresta y visera
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(25+hx, 6+hy, 38+hx, 20+hy, "st2"); G.rect(25+hx, 6+hy, 27+hx, 20+hy, "st1"); G.rect(36+hx, 6+hy, 38+hx, 20+hy, "st3")
  G.rect(24+hx, 4+hy, 39+hx, 6+hy, "st3")
  for k=0,5 do G.line(26+hx+k*2, 4+hy, 24+hx+k*2, 0+hy-(k % 2), "cp1") end
  if P.pain then G.rect(29+hx,12+hy,37+hx,12+hy,"st4") else G.rect(29+hx,11+hy,37+hx,13+hy,"K"); G.px(32+hx,12+hy,"z1"); G.px(35+hx,12+hy,"z1") end
  -- brazo que sostiene la lanza
  if thrust then G.thick(40+dx, 25+b, 44+dx, 32+b, 5, "st3")
  else G.thick(40+dx, 25+b, 44+dx, 30+b-(cast and 6 or 0), 5, "st3"); G.ellipse(44+dx, 30+b-(cast and 6 or 0), 3, 3, "st2") end
  return G
end

-- =====================================================================================
-- Rey de la Montaña (64x64, suelo en 61): el viejo rey enano que pactó con la tormenta.
-- Corona de oro, barba blanca cruzada de rayos, armadura azul oscura y martillo rúnico
-- =====================================================================================
local function rey(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(30,58,24,4,"kr3"); G.rect(12,50,42,57,"kr2"); G.rect(12,50,42,51,"kr1")
    G.ellipse(46,53,7,4,"W"); G.ellipse(50,50,5,3,"s1"); G.rect(46,46,54,48,"Y"); G.px(48,45,"R")
    G.rect(0,54,10,60,"st2"); G.line(10,57,24,55,"w1")
    return G
  end
  local cast, swing = P.cast, P.swing
  -- nubes de tormenta que lo rodean
  for k,m in ipairs({{6,14},{58,10},{4,34},{60,30},{10,4}}) do
    if (k + (P.phase or 0)) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "z1"); G.px(m[1]+dx+1, m[2]+b+1, "z2"); G.px(m[1]+dx-1, m[2]+b+1, "z2") end
  end
  -- martillo
  local mx, my = 46+dx, 30+b
  if swing then
    G.thick(36+dx, 18+b, mx+8, my+12, 3, "w1"); G.rect(mx+4, my+12, mx+16, my+22, "st2"); G.rect(mx+4, my+12, mx+16, my+13, "st1")
    G.line(mx+8, my+15, mx+12, my+19, "ru"); G.bolt(mx+10, my+22, mx+14, 61, 2)
  else
    G.thick(mx, my, mx+2, my-20, 3, "w1"); G.rect(mx-5, my-30, mx+8, my-20, "st2"); G.rect(mx-5, my-30, mx+8, my-29, "st1")
    G.line(mx-1, my-27, mx+3, my-23, cast and "ru" or "ru2"); G.line(mx+3, my-27, mx-1, my-23, cast and "ru" or "ru2")
    if cast then G.bolt(mx+1, my-31, mx+8, 0, 3); G.bolt(mx+8, my-26, mx+18, my-34, 2) end
  end
  -- piernas cortas y fuertes
  G.thick(22+dx, 46+b, 21+dx, 59, 7, "kr3"); G.thick(36+dx, 46+b, 37+dx, 59, 7, "kr3")
  G.rect(15+dx, 58, 26+dx, 61, "w3"); G.rect(32+dx, 58, 43+dx, 61, "w3")
  -- cuerpo ancho con armadura
  G.ellipse(29+dx, 34+b, 16, 14, "kr2"); G.ellipse(27+dx, 32+b, 12, 11, "kr1")
  G.rect(14+dx, 42+b, 44+dx, 46+b, "w2"); G.rect(26+dx, 42+b, 32+dx, 46+b, "Y"); G.px(29+dx, 44+b, "R")
  -- hombreras doradas
  G.ellipse(14+dx, 24+b, 6, 4, "y"); G.ridge(14+dx, 24+b, 6, 4, "Y", 2)
  G.ellipse(43+dx, 24+b, 6, 4, "y"); G.ridge(43+dx, 24+b, 6, 4, "Y", 2)
  -- brazo trasero
  G.thick(13+dx, 26+b, 10+dx, 42+b, 6, "kr2"); G.ellipse(10+dx, 43+b, 3, 3, "s2")
  -- cabeza: cara ancha, barba enorme que llega a la cintura, corona
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 13+hy, 7, 7, "s1"); G.ellipse(36+hx, 15+hy, 2, 2, "s2")
  G.ellipse(31+hx, 24+hy, 10, 9, "W"); G.rect(23+hx, 24+hy, 39+hx, 38+hy, "W")
  for k=0,3 do G.line(25+hx+k*4, 26+hy, 24+hx+k*4, 39+hy, "bd1") end
  G.bolt(28+hx, 25+hy, 32+hx, 37+hy, 3)
  G.rect(25+hx, 4+hy, 38+hx, 7+hy, "Y"); G.rect(25+hx, 7+hy, 38+hx, 7+hy, "y")
  for k=0,3 do G.line(26+hx+k*4, 4+hy, 26+hx+k*4, 1+hy, "Y") end
  G.px(31+hx, 5+hy, "R"); G.px(35+hx, 5+hy, "i2"); G.px(27+hx, 5+hy, "i2")
  G.rect(28+hx, 10+hy, 37+hx, 10+hy, "W")
  if P.pain then G.px(33+hx,12+hy,"K"); G.px(34+hx,12+hy,"K") else G.px(33+hx,12+hy,"z1"); G.px(34+hx,12+hy,"z2") end
  -- brazo con el martillo
  if swing then G.thick(40+dx, 26+b, 38+dx, 20+b, 6, "kr2")
  else G.thick(41+dx, 26+b, mx+1, my-2-(cast and 2 or 0), 6, "kr2"); G.ellipse(mx+1, my-2-(cast and 2 or 0), 3, 3, "s2") end
  return G
end

-- =====================================================================================
-- Guardia de la Tormenta (48x48): soldado enano del Rey que no descansa. Yelmo con cuernos,
-- armadura de hierro azulado, barba de escarcha, lanza que chispea; de la cintura para abajo es niebla
-- =====================================================================================
local function guardia(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 1
  if P.dead then
    G.ellipse(24,43,13,2,"gs2"); G.ellipse(20,41,7,2,"gt3"); G.ellipse(30,41,5,2,"gt2")
    G.line(4,44,26,40,"w2"); G.px(2,45,"m1"); G.px(28,39,"gt1")
    for _,m in ipairs({{12,36},{24,33},{34,37}}) do G.px(m[1], m[2], "gs1") end
    return G
  end
  local ph = P.phase or 0
  -- niebla en vez de piernas
  for y=32,43 do
    local w = math.max(1, (43 - y) // 2 + 2)
    local sway = ((y + ph) % 4 < 2) and 1 or -1
    G.rect(18+dx+sway-w+3, y+b, 28+dx+sway+w-3, y+b, y > 39 and "gs2" or "gs1")
  end
  -- lanza: vertical en reposo, al frente al atacar
  local thrust = P.thrust
  if thrust then
    G.thick(14+dx, 26+b, 46+dx, 22+b, 2, "w1"); G.line(40+dx, 20+b, 47+dx, 22+b, "m1"); G.line(40+dx, 24+b, 47+dx, 22+b, "m2")
    G.bolt(44+dx, 18+b, 47+dx, 10+b, 2)
  else
    G.thick(34+dx, 44, 36+dx, 4+b, 2, "w1"); G.line(34+dx, 4+b, 36+dx, -2+b, "m1"); G.line(37+dx, 4+b, 36+dx, -2+b, "m2")
    if P.glow then G.bolt(36+dx, 2+b, 42+dx, -4+b, 2); G.px(37+dx, 1+b, "z1") end
  end
  -- cuerpo acorazado y ancho (enano)
  G.ellipse(24+dx, 26+b, 9, 8, "gt2"); G.ellipse(22+dx, 25+b, 6, 6, "gt1")
  G.rect(16+dx, 30+b, 32+dx, 32+b, "gt3"); G.px(24+dx, 31+b, "Y")
  -- hombreras
  G.ellipse(15+dx, 20+b, 4, 3, "gt3"); G.ridge(15+dx, 20+b, 4, 3, "gt1", 1)
  G.ellipse(32+dx, 20+b, 4, 3, "gt3"); G.ridge(32+dx, 20+b, 4, 3, "gt1", 1)
  -- rayo grabado en el peto
  G.line(25+dx, 22+b, 22+dx, 26+b, "z3"); G.line(22+dx, 26+b, 26+dx, 26+b, "z3"); G.line(26+dx, 26+b, 23+dx, 30+b, "z3")
  -- cabeza: yelmo con cuernos, barba de escarcha, ojos de rayo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 12+hy, 6, 5, "gt2"); G.rect(19+hx, 13+hy, 31+hx, 14+hy, "gt3")
  G.line(19+hx, 10+hy, 15+hx, 5+hy, "T"); G.line(15+hx, 5+hy, 16+hx, 3+hy, "t")
  G.line(31+hx, 10+hy, 34+hx, 5+hy, "T"); G.line(34+hx, 5+hy, 33+hx, 3+hy, "t")
  G.ellipse(26+hx, 18+hy, 5, 4, "gs1"); G.line(24+hx, 18+hy, 24+hx, 22+hy, "gs2"); G.line(28+hx, 18+hy, 28+hx, 21+hy, "gs2")
  if P.pain then G.px(27+hx,14+hy,"K"); G.px(29+hx,14+hy,"K") else G.px(27+hx,14+hy,"z1"); G.px(29+hx,14+hy,"z1") end
  -- brazo con la lanza
  if thrust then G.thick(30+dx, 22+b, 36+dx, 24+b, 3, "gt2")
  else G.thick(30+dx, 22+b, 34+dx, 26+b, 3, "gt2"); G.ellipse(35+dx, 26+b, 2, 2, "gt1") end
  -- chispas
  for k,m in ipairs({{8,14},{42,30},{6,30}}) do if (k + ph) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "z1") end end
  return G
end

-- =====================================================================================
-- Minero Poseído (48x48): minero enano con casco y pico, ojos violetas y un cristal clavado en la
-- espalda que le chupa la voluntad; su farol está apagado
-- =====================================================================================
local function poseido(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,13,3,"c2"); G.rect(12,39,28,41,"c1"); G.ellipse(32,40,5,3,"bd2")
    G.ellipse(36,38,4,2,"hm2"); G.line(14,36,12,32,"ec2"); G.px(12,31,"ec1")
    G.line(4,44,20,42,"w2"); G.line(2,40,6,46,"m3")
    return G
  end
  -- cristal clavado en la espalda (late)
  local ph = P.phase or 0
  G.thick(14+dx, 24+b, 9+dx, 14+b-ph, 3, "ec3"); G.line(14+dx, 24+b, 10+dx, 15+b-ph, "ec2"); G.px(9+dx, 13+b-ph, "ec1")
  -- pico
  local px0, py0 = 31+dx, 25+b
  if P.swing then
    G.thick(px0, py0, px0+10, py0+6, 2, "w2")
    G.line(px0+8, py0-2, px0+12, py0+3, "m3"); G.line(px0+12, py0+3, px0+13, py0+11, "m2"); G.line(px0+8, py0-2, px0+6, py0-5, "m3")
  else
    G.thick(px0, py0, px0-2, py0-14, 2, "w2")
    G.line(px0-8, py0-13, px0-2, py0-15, "m3"); G.line(px0-2, py0-15, px0+5, py0-12, "m2")
  end
  G.thick(20+dx, 35+b, 19+dx, 43, 4, "c2"); G.thick(28+dx, 35+b, 29+dx, 43, 4, "c2")
  G.rect(16+dx, 43, 22+dx, 45, "w3"); G.rect(26+dx, 43, 32+dx, 45, "w3")
  G.ellipse(24+dx, 29+b, 10, 8, "c2"); G.ridge(24+dx, 29+b, 10, 8, "c1", 1)
  G.line(19+dx, 22+b, 20+dx, 36+b, "w3"); G.line(29+dx, 22+b, 28+dx, 36+b, "w3")
  -- venas de eclipse por el cuerpo
  G.line(16+dx, 27+b, 21+dx, 33+b, "ec3"); G.line(29+dx, 25+b, 33+dx, 31+b, "ec3"); G.px(21+dx, 33+b, "ec2")
  -- farol apagado colgando del cinto
  G.rect(15+dx, 33+b, 17+dx, 37+b, "hk2"); G.px(16+dx, 35+b, "hk3")
  G.thick(16+dx, 24+b, 14+dx, 33+b, 3, "s3")
  -- cabeza: barba gris sucia, casco abollado sin vela
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 15+hy, 6, 5, "s2")
  G.ellipse(26+hx, 21+hy, 7, 5, "bd2"); G.rect(22+hx, 21+hy, 30+hx, 26+hy, "bd2"); G.line(24+hx, 22+hy, 25+hx, 27+hy, "hk2")
  G.ellipse(31+hx, 17+hy, 2, 2, "s3")
  G.ellipse(25+hx, 11+hy, 7, 4, "hm2"); G.rect(18+hx, 12+hy, 33+hx, 13+hy, "hk2"); G.px(21+hx, 9+hy, "hk3")
  if P.pain then G.px(28+hx,15+hy,"K"); G.px(29+hx,15+hy,"K") else G.px(28+hx,15+hy,"ec1"); G.px(29+hx,15+hy,"ec1") end
  G.thick(30+dx, 24+b, px0, py0+(P.swing and 1 or 0), 3, "s3")
  return G
end

-- =====================================================================================
-- Gólem de Veta (56x56, suelo en 53): un pedazo de veta que se levantó; roca con vetas doradas de
-- mineral y cristales negros por ojos
-- =====================================================================================
local function golemVeta(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(28,50,20,4,"rv3"); G.ellipse(20,47,9,4,"rv2"); G.ellipse(34,48,8,3,"rv1"); G.ellipse(44,49,5,3,"rv2")
    G.line(16,46,24,48,"ore"); G.px(34,47,"ec2"); G.px(36,48,"ec2")
    return G
  end
  local slam = P.slam
  -- piernas de roca
  G.ellipse(19+dx, 46, 6, 7, "rv3"); G.ellipse(36+dx, 46, 6, 7, "rv3")
  -- cuerpo: peñasco irregular
  G.ellipse(27+dx, 30+b, 16, 15, "rv2"); G.ellipse(25+dx, 27+b, 12, 11, "rv1")
  G.ellipse(18+dx, 18+b, 7, 6, "rv2"); G.ellipse(36+dx, 19+b, 7, 6, "rv2")
  -- vetas de mineral
  G.line(15+dx, 26+b, 23+dx, 36+b, "ore"); G.line(23+dx, 36+b, 30+dx, 38+b, "ore"); G.line(33+dx, 22+b, 37+dx, 32+b, "ore")
  G.px(19+dx, 30+b, "W"); G.px(35+dx, 26+b, "W")
  -- cristales negros en la espalda
  G.thick(14+dx, 16+b, 10+dx, 8+b, 3, "ec3"); G.line(15+dx, 16+b, 11+dx, 8+b, "ec2")
  -- cabeza hundida con ojos de cristal
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(30+hx, 14+hy, 7, 6, "rv2"); G.ellipse(29+hx, 13+hy, 5, 4, "rv1")
  if P.pain then G.rect(30+hx,13+hy,35+hx,13+hy,"rv3") else G.rect(31+hx,12+hy,32+hx,14+hy,"ec1"); G.rect(34+hx,12+hy,35+hx,14+hy,"ec1") end
  -- brazo delantero: puño de piedra
  if slam then
    G.thick(38+dx, 22+b, 45+dx, 38+b, 6, "rv2"); G.ellipse(47+dx, 42+b, 6, 5, "rv1"); G.line(44+dx, 40+b, 49+dx, 44+b, "ore")
    for k=0,2 do G.px(40+dx+k*5, 52, "rv1") end
  else
    G.thick(40+dx, 22+b, 43+dx, 36+b, 6, "rv2"); G.ellipse(43+dx, 40+b, 5, 5, "rv1")
  end
  G.thick(14+dx, 24+b, 9+dx, 36+b, 5, "rv3"); G.ellipse(9+dx, 39+b, 4, 4, "rv2")
  return G
end

-- =====================================================================================
-- Gólem de Hierro Negro (64x64, suelo en 61): el guardián de hierro que forjaron los enanos para
-- cuidar el Segundo Sello, con runas de plata y cristales de eclipse clavados en el pecho
-- =====================================================================================
local function golemNegro(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(30,58,24,4,"hk3"); G.rect(10,50,44,57,"hk2"); G.rect(10,50,44,51,"hk1")
    G.ellipse(48,54,7,4,"hk2"); G.rect(44,52,52,53,"z3")
    G.line(20,52,24,50,"ec2"); G.line(28,53,31,50,"ec3"); G.px(36,53,"i2")
    return G
  end
  local slam = P.slam
  local ph = P.phase or 0
  -- piernas macizas
  G.rect(18+dx, 46+b, 27+dx, 59, "hk2"); G.rect(36+dx, 46+b, 45+dx, 59, "hk2")
  G.rect(16+dx, 57, 29+dx, 61, "hk3"); G.rect(34+dx, 57, 47+dx, 61, "hk3")
  G.rect(18+dx, 50+b, 27+dx, 51+b, "hk1"); G.rect(36+dx, 50+b, 45+dx, 51+b, "hk1")
  -- torso de placas remachadas
  G.rect(13+dx, 18+b, 50+dx, 47+b, "hk2"); G.rect(13+dx, 18+b, 18+dx, 47+b, "hk1"); G.rect(45+dx, 18+b, 50+dx, 47+b, "hk3")
  for y=22,44,6 do G.line(14+dx, y+b, 49+dx, y+b, "hk3") end
  for _,r in ipairs({{16,20},{47,20},{16,45},{47,45}}) do G.px(r[1]+dx, r[2]+b, "m1") end
  -- runas de plata de los enanos
  G.line(22+dx, 26+b, 22+dx, 32+b, "m1"); G.line(22+dx, 26+b, 25+dx, 29+b, "m1"); G.line(40+dx, 26+b, 40+dx, 32+b, "m1"); G.line(40+dx, 29+b, 43+dx, 26+b, "m1")
  -- cristales de eclipse clavados en el pecho (laten)
  for i,c in ipairs({{28,30,8},{32,34,10},{36,30,7}}) do
    local h = c[3] + ((i + ph) % 2)
    G.thick(c[1]+dx, c[2]+b, c[1]+dx+1, c[2]+b-h, 2, "ec3"); G.line(c[1]+dx, c[2]+b, c[1]+dx, c[2]+b-h, "ec2"); G.px(c[1]+dx, c[2]+b-h, "ec1")
  end
  -- hombreras
  G.ellipse(12+dx, 20+b, 7, 5, "hk2"); G.ridge(12+dx, 20+b, 7, 5, "hk1", 2)
  G.ellipse(51+dx, 20+b, 7, 5, "hk2"); G.ridge(51+dx, 20+b, 7, 5, "hk1", 2)
  -- cabeza: yelmo sin cara con una ranura de luz
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(24+hx, 4+hy, 40+hx, 17+hy, "hk2"); G.rect(24+hx, 4+hy, 26+hx, 17+hy, "hk1"); G.rect(22+hx, 2+hy, 42+hx, 4+hy, "hk3")
  if P.pain then G.rect(27+hx, 10+hy, 38+hx, 10+hy, "hk4") else G.rect(27+hx, 9+hy, 38+hx, 11+hy, "ec1"); G.px(32+hx, 10+hy, "W") end
  -- brazos: puños como yunques
  if slam then
    G.thick(50+dx, 22+b, 56+dx, 4+b, 7, "hk2"); G.rect(51+dx, -2+b, 62+dx, 6+b, "hk1"); G.rect(51+dx, 5+b, 62+dx, 6+b, "hk3")
    for k=0,3 do G.px(8+dx+k*12, 61, "rv1"); G.px(9+dx+k*12, 60, "rv2") end
  else
    G.thick(51+dx, 22+b, 55+dx, 44+b, 7, "hk2"); G.rect(50+dx, 43+b, 60+dx, 51+b, "hk1"); G.rect(50+dx, 50+b, 60+dx, 51+b, "hk3")
  end
  G.thick(12+dx, 22+b, 8+dx, 44+b, 7, "hk3"); G.rect(3+dx, 43+b, 13+dx, 51+b, "hk2")
  return G
end

-- =====================================================================================
local MONSTERS = {
  {key="cabra_montes", size=48, draw=cabra, anims={
    {"idle",   {{bob=0,dur=420},{bob=1,hy=1,dur=420}}},
    {"attack", {{bob=1,hx=-2,dur=200},{dx=3,charge=true,dur=130},{dx=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="orco_montana", size=48, draw=orco, anims={
    {"idle",   {{bob=0,dur=450},{bob=1,dur=450}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=4,swing=true,dur=140},{dx=1,swing=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="lobo_nieve", size=48, draw=lobo, anims={
    {"idle",   {{bob=0,dur=400},{bob=1,tail=2,dur=400}}},
    {"attack", {{bob=2,hx=-1,hy=2,dur=200},{dx=3,bob=-2,bite=true,feet={{10,44},{13,44},{40,40},{37,42}},dur=120},{dx=2,dur=220}}},
    {"hurt",   {{dx=-2,hy=-2,pain=true,dur=250}}},
    {"die",    {{bob=4,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="minero_corrompido", size=48, draw=minero, anims={
    {"idle",   {{bob=0,dur=450},{bob=1,dur=450}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=4,swing=true,dur=140},{dx=1,swing=true,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="murcielago_caverna", size=48, draw=murcielago, anims={
    {"idle",   {{bob=0,wing=1,dur=180},{bob=2,wing=0,dur=180}}},
    {"attack", {{bob=-1,wing=1,hx=-1,dur=180},{dx=4,bob=1,wing=0,shriek=true,dur=200},{dx=2,wing=1,dur=200}}},
    {"hurt",   {{dx=-3,bob=-1,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=4,wing=0,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="centinela_piedra", size=48, draw=centinela, anims={
    {"idle",   {{bob=0,dur=520},{bob=1,glow=true,dur=520}}},
    {"attack", {{bob=-1,hx=-1,glow=true,dur=300},{dx=2,slam=true,glow=true,dur=170},{dx=1,slam=true,dur=300}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="espectro_helado", size=48, draw=espectro, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-1,phase=1,dur=420}}},
    {"attack", {{bob=-1,hy=-1,dur=200},{dx=3,cast=true,phase=1,dur=220},{dx=1,dur=200}}},
    {"cast",   {{bob=-1,dur=180},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=200}}},
    {"hurt",   {{dx=-3,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="oso_cumbres", size=48, draw=oso, anims={
    {"idle",   {{bob=0,dur=500},{bob=1,dur=500}}},
    {"attack", {{bob=0,rear=true,dur=260},{dx=3,rear=true,hy=2,dur=140},{dx=1,dur=240}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=220},{dead=true,dur=1100}}},
  }},
  {key="sierpe_hielo", size=48, draw=sierpe, anims={
    {"idle",   {{bob=0,phase=0,dur=450},{bob=1,phase=1,dur=450}}},
    {"attack", {{bob=-1,hx=-2,dur=200},{dx=2,lunge=true,phase=1,dur=150},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,hx=-1,dur=200},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-2,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="troll_salvaje", size=48, draw=troll, anims={
    {"idle",   {{bob=0,dur=480},{bob=1,dur=480}}},
    {"attack", {{bob=1,hx=-1,dur=220},{dx=4,swing=true,dur=150},{dx=1,swing=true,dur=240}}},
    {"cast",   {{bob=1,dur=200},{regen=true,dur=300},{regen=true,bob=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=260}}},
    {"die",    {{bob=3,pain=true,dur=220},{dead=true,dur=1100}}},
  }},
  {key="arpia_eco", size=48, draw=arpia, anims={
    {"idle",   {{bob=0,wing=1,dur=220},{bob=2,wing=0,dur=220}}},
    {"attack", {{bob=-2,wing=1,hx=-1,dur=200},{dx=5,bob=2,wing=0,dive=true,shriek=true,dur=150},{dx=2,wing=1,dur=220}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=4,wing=0,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="elemental_tormenta", size=48, draw=elemental, anims={
    {"idle",   {{bob=0,phase=0,dur=300},{bob=-1,phase=1,dur=300}}},
    {"attack", {{bob=-1,hy=-1,phase=1,dur=200},{dx=3,cast=true,phase=0,dur=200},{dx=1,phase=1,dur=200}}},
    {"cast",   {{bob=-1,phase=1,dur=180},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="gigante_hielo", size=56, draw=gigante, anims={
    {"idle",   {{bob=0,dur=520},{bob=1,glow=true,dur=520}}},
    {"attack", {{bob=-1,hx=-1,glow=true,dur=300},{dx=3,swing=true,glow=true,dur=170},{dx=1,swing=true,dur=300}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="brujo_montana", size=56, draw=brujo, anims={
    {"idle",   {{bob=0,dur=480},{bob=-1,glow=true,dur=480}}},
    {"attack", {{bob=-1,glow=true,dur=220},{dx=2,cast=true,dur=240},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,glow=true,dur=200},{cast=true,dur=320},{cast=true,glow=true,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="senor_acantilado", size=64, draw=senor, anims={
    {"idle",   {{bob=0,phase=0,dur=520},{bob=1,phase=3,glow=true,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=260},{dx=4,thrust=true,phase=3,dur=170},{dx=2,thrust=true,dur=280}}},
    {"cast",   {{bob=-1,glow=true,dur=220},{cast=true,phase=3,dur=340},{cast=true,glow=true,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }},
  {key="guardia_tormenta", size=48, draw=guardia, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-1,phase=1,glow=true,dur=420}}},
    {"attack", {{bob=-1,hx=-1,glow=true,dur=200},{dx=4,thrust=true,phase=1,dur=150},{dx=2,thrust=true,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="mina_minero", size=48, draw=poseido, anims={
    {"idle",   {{bob=0,phase=0,dur=450},{bob=1,phase=1,dur=450}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=4,swing=true,dur=140},{dx=1,swing=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="mina_golem_veta", size=56, draw=golemVeta, anims={
    {"idle",   {{bob=0,dur=520},{bob=1,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,slam=true,dur=170},{dx=1,slam=true,dur=300}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="mina_golem_negro", size=64, draw=golemNegro, anims={
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-1,hx=-1,dur=320},{dx=3,slam=true,phase=1,dur=180},{dx=1,slam=true,dur=320}}},
    {"cast",   {{bob=-1,dur=220},{slam=true,phase=0,dur=360},{phase=1,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
  }},
  {key="rey_montana", size=64, draw=rey, anims={
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-2,hx=-1,dur=300},{dx=3,swing=true,phase=1,dur=180},{dx=1,swing=true,dur=320}}},
    {"cast",   {{bob=-1,dur=220},{cast=true,phase=0,dur=360},{cast=true,phase=1,dur=260}}},
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
  spr:saveAs(dir .. "/zona2/" .. m.key .. ".aseprite")
  spr:close()
  local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
  for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
  local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
  out:saveCopyAs(dir .. "/enemigos/" .. m.key .. ".png")
  out:close()
  manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
end
local fh = io.open(dir .. "/enemigos_montanas.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
