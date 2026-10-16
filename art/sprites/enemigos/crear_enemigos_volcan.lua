-- Enemigos del Volcán Rojo (zona 3, nivel 31-45): uno o dos propios por subzona.
--   salamandra_roja      Salamandra Roja (Ladera de Ceniza y Ríos de Lava)
--   lobo_ceniza          Lobo de Ceniza (Ladera de Ceniza y Bosque Calcinado)
--   bandido_fuego        Bandido de Fuego (Bosque Calcinado)
--   escarabajo_azufre    Escarabajo de Azufre (Campos de Azufre)
--   elemental_fuego      Elemental de Fuego (Campos de Azufre y Ríos de Lava)
--   serpiente_magma      Serpiente de Magma (Ríos de Lava)
--   golem_obsidiana      Gólem de Obsidiana (Cantera de Obsidiana)
--   centinela_infernal   Centinela Infernal (Cantera y Grieta Ardiente)
--   fanatico_eclipse     Fanático del Eclipse (Grieta Ardiente)
--   demonio_lava         Demonio de Lava (Grieta Ardiente y Caldera)
--   draco_brasa          Draco de Brasa (Nido del Dragón)
--   diablillo_caldera    Diablillo de la Caldera (Caldera del Titán)
--   maestro_lava         Maestro de la Lava, raro, 56x56
--   dragon_menor_corrupto Dragón Menor Corrupto, raro, 56x56
--   senor_caldera        Señor de la Caldera, minijefe, 64x64
--   titan_fuego          Titán de Fuego, jefe, 64x64
-- y los de la Fisura Infernal (mazmorra):
--   fisura_fundidor      Fundidor Oculto (guardián)
--   fisura_diablillo     Diablillo de Fragua (guardián)
--   fisura_golem_escoria Gólem de Escoria (guardián), 56x56
--   fisura_morvak        Morvak, el Forjador de Eclipses (jefe), 64x64
-- Mismo estilo que crear_enemigos_montanas.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona3/<clave>.aseprite y
-- enemigos_volcan.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_volcan.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", E="1c1420", R="c0343a", r="7a1f2a", Y="e8c050", y="a8802c",
  m1="b8c0cc", m2="7a8290", m3="4a505e", w1="8a5a3a", w2="5e3a22", w3="3e2616", T="eee0c0", t="b8a880",
  s1="d8b090", s2="a88468", s3="7a5a44",
  -- fuego y lava (brillan: sin contorno)
  f1="fff4b0", f2="ffd040", f3="ff8a24", f4="e04a1a", f5="9a2414",
  -- roca volcánica
  rk1="6e5e5c", rk2="4c4044", rk3="30282c", rk4="1e181c",
  -- salamandra
  sa1="ea6a3a", sa2="bc442a", sa3="7e2a1e", sb="f6b464",
  -- lobo de ceniza
  aw1="b4b0aa", aw2="868280", aw3="5c5856", aw4="3a3634",
  -- bandido
  bn1="8e3e2c", bn2="62281e", bn3="3e1a14", sc="3a3236",
  -- escarabajo de azufre
  su1="f2de58", su2="cab232", su3="8c7a22", su4="5a4c18", gas="cfe27a", gas2="a2b85a",
  -- obsidiana
  ob1="6a6a90", ob2="3c3c56", ob3="24243a", ob4="14141f", obh="b8b8ee",
  -- hierro negro (centinela, Morvak)
  hk1="5c5a6a", hk2="3e3c4c", hk3="282632", hk4="18161e",
  -- eclipse
  ec1="d8a0ff", ec2="8a4ad8", ec3="4e2490",
  -- túnica del fanático
  fr1="5a4468", fr2="3a2c48", fr3="241a30",
  -- draco y dragón
  dr1="d2482e", dr2="962e20", dr3="5e1c16", dw="f08848", dw2="b85a30", db="f2c27a",
  -- diablillo
  im1="d4583e", im2="9e3424", im3="641c16",
  -- escoria
  es1="7e7468", es2="5a5248", es3="3c362e",
  -- cuero del fundidor
  le1="8e6a48", le2="644830", le3="42301e",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, f1=true, f2=true, f3=true, ec1=true, gas=true, gas2=true, obh=true}

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
  -- llama: lengua de fuego de (x, y) hacia arriba, de alto h y ancho w (capas de afuera hacia adentro)
  function G.flame(x, y, h, w, ph)
    local sway = ((ph or 0) % 2 == 0) and 1 or -1
    for i=0,h do
      local t = i / h
      local half = w * (1 - t) * (1 - t * 0.3)
      local cx = x + math.sin(t * 3) * sway * 1.5
      G.line(cx - half, y - i, cx + half, y - i, t < 0.55 and "f4" or "f3")
      if half > 1 then G.line(cx - half * 0.6, y - i, cx + half * 0.6, y - i, t < 0.7 and "f3" or "f2") end
      if half > 2 and t < 0.6 then G.line(cx - half * 0.25, y - i, cx + half * 0.25, y - i, "f1") end
    end
  end
  -- grieta de lava zigzagueante
  function G.vein(x0,y0,x1,y1,c)
    local n = 3
    local px, py = x0, y0
    for i=1,n do
      local t = i/n
      local nx = x0 + (x1-x0)*t + ((i < n) and ((i % 2 == 0) and 1 or -1) or 0)
      local ny = y0 + (y1-y0)*t
      G.line(px, py, nx, ny, c or "f3")
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

local function eye(G, x, y, c, pain)
  if pain then G.px(x, y, "K"); G.px(x+1, y, "K") else G.px(x, y, c) end
end

-- =====================================================================================
-- Salamandra Roja (48x48): lagarto rojo pegado al suelo, cola larga, escupe fuego
-- =====================================================================================
local function salamandra(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(22,42,13,3,"sa2"); G.ridge(22,42,13,3,"sa1",1); G.ellipse(22,44,9,1,"sb")
    G.thick(9,43,2,40,2,"sa3"); G.ellipse(37,42,5,2,"sa2"); G.px(38,41,"K")
    return G
  end
  local ph = P.phase or 0
  -- cola ondulada
  for i=0,12 do G.px(10+dx-i, 38+b-math.sin(i*0.6+ph)*2, i < 8 and "sa2" or "sa3"); G.px(10+dx-i, 39+b-math.sin(i*0.6+ph)*2, "sa3") end
  -- patas cortas abiertas
  for _,p in ipairs({{14,41},{20,42},{28,42},{33,41}}) do G.thick(p[1]+dx, 38+b, p[1]+dx+(p[1] > 24 and 2 or -2), 44, 2, "sa3"); G.rect(p[1]+dx-1+(p[1] > 24 and 2 or -2), 44, p[1]+dx+1+(p[1] > 24 and 2 or -2), 45, "sa3") end
  -- cuerpo largo y plano
  G.ellipse(23+dx, 37+b, 13, 4, "sa2"); G.ridge(23+dx, 37+b, 13, 4, "sa1", 2); G.ellipse(23+dx, 40+b, 10, 1, "sb")
  -- manchas que brillan como brasas
  for _,m in ipairs({{16,35},{22,34},{28,35}}) do G.px(m[1]+dx, m[2]+b, ((m[1]+ph) % 2 == 0) and "f2" or "f3") end
  -- cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(38+hx, 35+hy, 6, 3, "sa2"); G.ridge(38+hx, 35+hy, 6, 3, "sa1", 1); G.rect(40+hx, 36+hy, 44+hx, 37+hy, "sb")
  eye(G, 40+hx, 33+hy, "f2", P.pain)
  if P.cast or P.bite then
    G.rect(41+hx, 37+hy, 44+hx, 38+hy, "r")
    if P.cast then for i=0,3 do G.ellipse(46+hx+i*1.5, 36+hy-i, 2.5-i*0.4, 2-i*0.3, i < 2 and "f3" or "f2") end G.px(45+hx, 36+hy, "f1") end
  end
  return G
end

-- =====================================================================================
-- Lobo de Ceniza (48x48): lobo gris con ojos de brasa; suelta ceniza al moverse
-- =====================================================================================
local function lobo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(23,41,12,4,"aw2"); G.ridge(23,41,12,4,"aw1",2)
    G.ellipse(37,42,5,3,"aw2"); G.rect(40,42,44,44,"aw1"); G.px(44,42,"K"); G.px(37,41,"K")
    G.thick(18,44,21,45,2,"aw3"); G.thick(28,44,31,45,2,"aw3")
    G.px(12,38,"aw1"); G.px(30,36,"aw1")
    return G
  end
  local feet = P.feet or {{14,44},{18,44},{31,44},{28,44}}
  local hip, sh = {16+dx, 35+b}, {30+dx, 35+b}
  G.thick(11+dx, 30+b, 4+dx, 28+b-(P.tail or 0), 3, "aw2"); G.px(3+dx, 27+b-(P.tail or 0), "f3")
  G.thick(hip[1]-1, hip[2], feet[1][1], feet[1][2], 2, "aw3"); G.rect(feet[1][1]-1,feet[1][2]+1,feet[1][1]+1,feet[1][2]+1,"aw4")
  G.thick(sh[1]+1, sh[2], feet[3][1], feet[3][2], 2, "aw3"); G.rect(feet[3][1]-1,feet[3][2]+1,feet[3][1]+1,feet[3][2]+1,"aw4")
  G.ellipse(22+dx, 32+b, 11, 6, "aw2"); G.ridge(22+dx, 32+b, 11, 6, "aw1", 2)
  -- lomo chamuscado con brasas
  for x=13,29,4 do G.line(x+dx, 27+b, x+1+dx, 25+b, "aw3") end
  G.px(18+dx, 28+b, "f3"); G.px(25+dx, 27+b, "f4")
  G.thick(hip[1]+2, hip[2], feet[2][1], feet[2][2], 3, "aw2"); G.rect(feet[2][1]-1,feet[2][2]+1,feet[2][1]+2,feet[2][2]+1,"aw4")
  G.thick(sh[1]-2, sh[2], feet[4][1], feet[4][2], 3, "aw2"); G.rect(feet[4][1]-1,feet[4][2]+1,feet[4][1]+2,feet[4][2]+1,"aw4")
  G.ellipse(31+dx, 28+b, 6, 7, "aw1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(36+hx, 25+hy, 5, 4, "aw1")
  G.rect(40+hx, 25+hy, 45+hx, 27+hy, "aw1"); G.rect(40+hx, 27+hy, 44+hx, 28+hy, "aw2"); G.px(45+hx, 25+hy, "K")
  G.line(33+hx, 21+hy, 34+hx, 18+hy, "aw2"); G.line(36+hx, 21+hy, 37+hx, 18+hy, "aw2")
  eye(G, 39+hx, 24+hy, "f2", P.pain)
  if P.bite then
    G.rect(40+hx, 28+hy, 45+hx, 28+hy, "r"); G.px(41+hx,28+hy,"W"); G.px(44+hx,28+hy,"W")
    G.rect(40+hx, 29+hy, 44+hx, 30+hy, "aw2")
  end
  -- ceniza que se le cae
  for k,m in ipairs({{8,22},{14,18},{26,20}}) do if (k + (P.tail or 0)) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "aw1") end end
  return G
end

-- =====================================================================================
-- Bandido de Fuego (48x48): cara tiznada con pañuelo, chaleco rojo, botella encendida
-- =====================================================================================
local function bandido(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,14,3,"bn3"); G.rect(10,39,30,41,"bn1"); G.ellipse(34,40,5,3,"s2"); G.rect(30,37,38,38,"sc")
    G.px(6,43,"m2"); G.px(7,42,"f3")
    return G
  end
  local throw = P.throw
  -- piernas
  G.thick(20+dx, 33+b, 18+dx, 43, 3, "w2"); G.thick(27+dx, 33+b, 29+dx, 43, 3, "w2")
  G.rect(15+dx, 43, 21+dx, 45, "w3"); G.rect(26+dx, 43, 32+dx, 45, "w3")
  -- brazo trasero con cuchillo
  G.thick(17+dx, 22+b, 13+dx, 31+b, 3, "s2"); G.line(12+dx, 31+b, 9+dx, 35+b, "m1")
  -- torso: camisa, chaleco y cinturón con latas de brasas
  G.rect(17+dx, 20+b, 30+dx, 33+b, "t"); G.rect(17+dx, 20+b, 21+dx, 33+b, "bn1"); G.rect(27+dx, 20+b, 30+dx, 33+b, "bn1")
  G.rect(17+dx, 31+b, 30+dx, 32+b, "w3"); G.rect(19+dx, 32+b, 21+dx, 34+b, "m3"); G.px(20+dx, 32+b, "f3")
  -- cabeza: capucha, pañuelo y ojos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 13+hy, 6, 6, "s2"); G.ridge(24+hx, 13+hy, 7, 7, "bn2", 3)
  G.rect(18+hx, 8+hy, 21+hx, 18+hy, "bn2")
  G.rect(22+hx, 15+hy, 30+hx, 18+hy, "sc"); G.px(31+hx, 17+hy, "sc"); G.px(32+hx, 18+hy, "sc")
  G.rect(23+hx, 12+hy, 29+hx, 12+hy, "rk3")
  eye(G, 27+hx, 13+hy, "W", P.pain)
  -- brazo con la botella de aceite encendida
  local ax, ay = throw and 36+dx or 32+dx, throw and 14+b or 26+b
  G.thick(29+dx, 22+b, ax, ay, 3, "s2")
  G.rect(ax, ay-5, ax+2, ay, "gas2"); G.rect(ax, ay-5, ax+2, ay-4, "m2"); G.px(ax+1, ay-6, "w1")
  G.flame(ax+1, ay-7, 4, 1.5, P.phase)
  if throw then for i=1,3 do G.px(ax+4+i*2, ay-6-i, "f3") end end
  return G
end

-- =====================================================================================
-- Escarabajo de Azufre (48x48): caparazón amarillo, cuernos y nubes de gas
-- =====================================================================================
local function escarabajo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(24,40,14,6,"su3"); G.ridge(24,40,14,6,"su2",2)
    for _,x in ipairs({14,20,28,34}) do G.line(x,34,x-2,30,"su4") end
    G.ellipse(18,30,3,2,"gas2")
    return G
  end
  local ph = P.phase or 0
  -- patas (tres por lado, se ven las de este lado)
  for i,x in ipairs({14,22,30}) do
    local up = ((i + ph) % 2 == 0) and 1 or 0
    G.line(x+dx, 38+b, x+dx-3, 44-up, "su4"); G.line(x+dx-3, 44-up, x+dx-4, 45, "su4")
  end
  -- caparazón
  G.ellipse(23+dx, 33+b, 15, 9, "su2"); G.ridge(23+dx, 33+b, 15, 9, "su1", 3)
  G.line(23+dx, 25+b, 21+dx, 41+b, "su3")
  for _,m in ipairs({{14,31},{30,30},{18,36},{28,37}}) do G.px(m[1]+dx, m[2]+b, "su3") end
  G.ellipse(23+dx, 41+b, 13, 2, "su4")
  -- cabeza con cuerno curvo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(38+hx, 35+hy, 5, 4, "su3"); G.ridge(38+hx, 35+hy, 5, 4, "su2", 1)
  G.thick(40+hx, 32+hy, 44+hx, 26+hy, 2, "su4"); G.px(45+hx, 25+hy, "su3")
  G.line(42+hx, 38+hy, 45+hx, 39+hy, "su4")
  eye(G, 40+hx, 34+hy, "R", P.pain)
  -- gas
  local puffs = P.cast and {{10,20,5},{4,16,4},{16,14,4},{44,30,4}} or {{8,24,3},{4,20,2}}
  for k,p in ipairs(puffs) do G.ellipse(p[1]+dx, p[2]+b-((k+ph) % 2), p[3], p[3]-1, (k % 2 == 0) and "gas" or "gas2") end
  return G
end

-- =====================================================================================
-- Elemental de Fuego (48x48): una llama con forma de cuerpo sobre un charco de lava
-- =====================================================================================
local function elementalFuego(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) - 2
  if P.dead then
    G.ellipse(24,43,10,2,"rk3"); G.ellipse(24,43,6,1,"f4"); G.px(20,40,"f3"); G.px(28,39,"f2"); G.px(24,37,"rk1")
    return G
  end
  local ph = P.phase or 0
  -- charco de lava
  G.ellipse(24+dx, 43, 11, 2, "f5"); G.ellipse(24+dx, 43, 7, 1, "f4")
  -- cuerpo: llama grande
  G.flame(24+dx, 42+b, 30, 9, ph)
  -- núcleo de roca
  G.ellipse(24+dx, 26+b, 4, 4, "rk2"); G.ridge(24+dx, 26+b, 4, 4, "rk1", 1); G.vein(22+dx, 24+b, 26+dx, 29+b, "f2")
  -- cara
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  if P.pain then G.px(23+hx, 18+hy, "f5"); G.px(27+hx, 18+hy, "f5")
  else G.rect(22+hx, 17+hy, 23+hx, 19+hy, "W"); G.rect(26+hx, 17+hy, 27+hx, 19+hy, "W") end
  G.rect(23+hx, 21+hy, 26+hx, 21+hy, "f5")
  -- brazos de fuego
  local cast = P.cast
  G.thick(18+dx, 27+b, 12+dx, 22+b-(cast and 4 or 0), 3, "f3"); G.px(11+dx, 21+b-(cast and 4 or 0), "f2")
  G.thick(30+dx, 27+b, 36+dx+(cast and 3 or 0), 22+b-(cast and 4 or 0), 3, "f3")
  if cast then G.ellipse(40+dx, 17+b, 4, 4, "f3"); G.ellipse(40+dx, 17+b, 2, 2, "f1") end
  for k,m in ipairs({{10,10},{38,6},{8,32},{40,30}}) do if (k + ph) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "f2") end end
  return G
end

-- =====================================================================================
-- Serpiente de Magma (48x48): sale de la lava con el lomo brillante y la boca abierta
-- =====================================================================================
local function serpiente(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,43,16,2,"f5"); G.ellipse(14,41,5,2,"rk2"); G.ellipse(30,41,6,2,"rk2"); G.px(36,40,"K")
    return G
  end
  local ph = P.phase or 0
  -- charco de lava de donde sale
  G.ellipse(22+dx, 43, 17, 2, "f4"); G.ellipse(22+dx, 43, 12, 1, "f3")
  -- una joroba del cuerpo detrás
  G.ellipse(10+dx, 41+b, 5, 5, "rk2"); G.ridge(10+dx, 41+b, 5, 5, "f4", 2)
  -- cuello que sube en S
  local lunge = P.lunge and 4 or 0
  for i=0,24 do
    local t = i / 24
    local x = 22 + dx + math.sin(t * 3.2 + ph * 0.5) * 4 + t * (10 + lunge)
    local y = 43 + b - t * 28
    G.ellipse(x, y, 4 - t, 3, "rk2"); G.px(x - 1, y - 2, "f4")
  end
  -- placas del lomo con lava entre medio
  for i=0,4 do G.px(20+dx+i*2, 38+b-i*5, ((i + ph) % 2 == 0) and "f2" or "f3") end
  -- cabeza
  local hx, hy = dx + lunge + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(36+hx, 14+hy, 6, 4, "rk2"); G.ridge(36+hx, 14+hy, 6, 4, "rk1", 1)
  G.line(32+hx, 10+hy, 29+hx, 7+hy, "rk3"); G.line(34+hx, 10+hy, 32+hx, 6+hy, "rk3")
  eye(G, 37+hx, 12+hy, "f2", P.pain)
  if P.cast or P.lunge then
    G.rect(38+hx, 16+hy, 43+hx, 18+hy, "f4"); G.px(39+hx, 16+hy, "W"); G.px(42+hx, 18+hy, "W")
    if P.cast then for i=0,2 do G.px(44+hx+i, 17+hy+i*2, "f3"); G.px(45+hx+i, 18+hy+i*2, "f2") end end
  else G.line(38+hx, 16+hy, 42+hx, 16+hy, "f4") end
  return G
end

-- =====================================================================================
-- Gólem de Obsidiana (48x48): vidrio negro tallado, brillos lilas y ojos rojos
-- =====================================================================================
local function golemObs(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    for _,r in ipairs({{12,40,5,4},{24,41,6,4},{36,40,5,4},{20,36,4,3}}) do G.ellipse(r[1],r[2],r[3],r[4],"ob2"); G.px(r[1]-1,r[2]-2,"obh") end
    return G
  end
  local slam = P.slam
  -- piernas de bloque
  G.rect(15+dx, 34+b, 21+dx, 45, "ob3"); G.rect(27+dx, 34+b, 33+dx, 45, "ob3"); G.line(15+dx, 34+b, 15+dx, 44, "ob2"); G.line(27+dx, 34+b, 27+dx, 44, "ob2")
  -- torso facetado
  G.rect(12+dx, 16+b, 36+dx, 34+b, "ob2"); G.line(12+dx, 16+b, 24+dx, 26+b, "ob1"); G.line(36+dx, 16+b, 24+dx, 26+b, "ob3"); G.line(24+dx, 26+b, 24+dx, 34+b, "ob3")
  G.line(14+dx, 18+b, 20+dx, 23+b, "obh"); G.px(30+dx, 30+b, "obh")
  -- cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(19+hx, 6+hy, 30+hx, 15+hy, "ob2"); G.line(19+hx, 6+hy, 30+hx, 6+hy, "ob1"); G.px(21+hx, 8+hy, "obh")
  if P.pain then G.rect(24+hx, 10+hy, 28+hx, 10+hy, "ob4") else G.rect(24+hx, 9+hy, 25+hx, 11+hy, "R"); G.rect(27+hx, 9+hy, 28+hx, 11+hy, "R") end
  -- brazos de cristal
  G.thick(11+dx, 18+b, 7+dx, 34+b, 5, "ob3"); G.ellipse(7+dx, 35+b, 3, 3, "ob2")
  if slam then
    G.thick(37+dx, 18+b, 44+dx, 34+b, 5, "ob2"); G.ellipse(44+dx, 38+b, 4, 4, "ob1"); G.px(43+dx, 36+b, "obh")
    for k=0,2 do G.px(38+dx+k*4, 45, "ob1") end
  else
    G.thick(37+dx, 18+b, 40+dx, 32+b, 5, "ob2"); G.ellipse(40+dx, 34+b, 3, 3, "ob1"); G.px(39+dx, 33+b, "obh")
  end
  -- púas de vidrio en la espalda
  G.line(13+dx, 16+b, 10+dx, 9+b, "ob1"); G.line(17+dx, 16+b, 15+dx, 8+b, "ob1"); G.px(10+dx, 9+b, "obh")
  return G
end

-- =====================================================================================
-- Centinela Infernal (48x48): armadura vacía de hierro negro con fuego rojo adentro
-- =====================================================================================
local function centinela(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.rect(8,41,22,44,"hk2"); G.ellipse(30,42,6,3,"hk2"); G.rect(34,38,40,43,"hk3"); G.px(36,40,"f4")
    G.line(2,44,14,38,"m2")
    return G
  end
  local ph = P.phase or 0
  -- lanza alabarda
  local sx = P.thrust and 40+dx or 34+dx
  if P.thrust then G.thick(26+dx, 26+b, 47, 24+b, 2, "w2"); G.rect(42, 21+b, 47, 27+b, "m2"); G.line(42, 21+b, 47, 24+b, "m1")
  else G.thick(sx, 4+b, sx, 44, 2, "w2"); G.rect(sx-3, 2+b, sx+2, 8+b, "m2"); G.line(sx, 0+b, sx, 3+b, "m1") end
  -- piernas
  G.thick(19+dx, 32+b, 18+dx, 43, 4, "hk2"); G.thick(28+dx, 32+b, 29+dx, 43, 4, "hk2")
  G.rect(14+dx, 43, 21+dx, 45, "hk3"); G.rect(26+dx, 43, 33+dx, 45, "hk3")
  -- coraza abierta con fuego dentro
  G.rect(15+dx, 17+b, 32+dx, 33+b, "hk2"); G.rect(15+dx, 17+b, 17+dx, 33+b, "hk1"); G.rect(15+dx, 30+b, 32+dx, 31+b, "hk3")
  G.rect(20+dx, 20+b, 27+dx, 28+b, "f5"); G.flame(23+dx, 28+b, 8, 3, ph)
  -- hombreras con púas
  G.ellipse(14+dx, 18+b, 5, 3, "hk1"); G.line(12+dx, 15+b, 10+dx, 11+b, "hk2"); G.ellipse(33+dx, 18+b, 5, 3, "hk1")
  -- yelmo sin cara
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(18+hx, 4+hy, 29+hx, 16+hy, "hk2"); G.rect(18+hx, 4+hy, 20+hx, 16+hy, "hk1"); G.rect(17+hx, 2+hy, 30+hx, 4+hy, "hk3")
  if P.pain then G.rect(22+hx, 10+hy, 28+hx, 10+hy, "hk4") else G.rect(22+hx, 9+hy, 28+hx, 11+hy, "f3"); G.px(25+hx, 10+hy, "f1") end
  G.flame(24+hx, 2+hy, 4, 2, ph + 1)
  -- brazo
  G.thick(31+dx, 19+b, P.thrust and 28+dx or sx-1, P.thrust and 26+b or 24+b, 4, "hk2")
  return G
end

-- =====================================================================================
-- Fanático del Eclipse (48x48): túnica quemada, eclipse pintado en la frente, reza y lanza llamas negras
-- =====================================================================================
local function fanatico(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,15,3,"fr2"); G.rect(10,39,30,41,"fr1"); G.ellipse(34,40,4,3,"s2"); G.px(34,38,"ec2")
    return G
  end
  local cast = P.cast
  -- túnica larga acampanada
  for y=20,44 do local w = 5 + (y - 20) * 0.35; G.line(24+dx-w, y+(y < 44 and b or 0), 24+dx+w, y+(y < 44 and b or 0), "fr1") end
  for y=24,44,4 do G.px(24+dx-7, y, "fr2") end
  G.line(24+dx, 22+b, 24+dx, 44, "fr2"); G.line(14+dx, 44, 34+dx, 44, "fr3")
  -- bordes quemados
  for x=15,33,3 do G.px(x+dx, 43, "f4") end
  -- cinto con el disco del eclipse
  G.rect(18+dx, 30+b, 30+dx, 31+b, "w3"); G.ellipse(27+dx, 32+b, 2, 2, "rk3"); G.px(27+dx, 32+b, "ec2")
  -- cabeza con capucha
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 13+hy, 7, 7, "fr2"); G.ellipse(26+hx, 14+hy, 4, 5, "s3")
  G.ellipse(27+hx, 10+hy, 2, 1, "rk4"); G.px(27+hx, 10+hy, "ec1")
  eye(G, 28+hx, 13+hy, "ec1", P.pain)
  -- manos: rezando o lanzando
  if cast then
    G.thick(29+dx, 22+b, 37+dx, 16+b, 3, "fr1"); G.ellipse(38+dx, 15+b, 2, 2, "s3")
    G.ellipse(42+dx, 11+b, 4, 4, "ec3"); G.ellipse(42+dx, 11+b, 2, 2, "ec2"); G.px(42+dx, 11+b, "ec1")
    G.thick(19+dx, 22+b, 12+dx, 14+b, 3, "fr1"); G.px(11+dx, 13+b, "ec1")
  else
    G.thick(20+dx, 22+b, 25+dx, 26+b, 3, "fr1"); G.thick(29+dx, 22+b, 27+dx, 26+b, 3, "fr1"); G.ellipse(27+dx, 25+b, 2, 2, "s3")
  end
  return G
end

-- =====================================================================================
-- Demonio de Lava (48x48): roca agrietada con lava en las venas, cuernos y garras
-- =====================================================================================
local function demonio(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,15,4,"rk2"); G.vein(12,42,34,41,"f4"); G.ellipse(35,39,5,3,"rk2"); G.line(36,36,40,33,"rk3")
    return G
  end
  local ph = P.phase or 0
  -- piernas de cabra
  G.thick(18+dx, 32+b, 15+dx, 38+b, 4, "rk2"); G.thick(15+dx, 38+b, 18+dx, 44, 3, "rk2")
  G.thick(28+dx, 32+b, 31+dx, 38+b, 4, "rk2"); G.thick(31+dx, 38+b, 28+dx, 44, 3, "rk2")
  G.rect(16+dx, 44, 20+dx, 45, "rk4"); G.rect(26+dx, 44, 30+dx, 45, "rk4")
  -- cola con punta
  G.line(14+dx, 32+b, 6+dx, 36+b, "rk3"); G.line(6+dx, 36+b, 4+dx, 31+b, "rk3"); G.px(4+dx, 30+b, "f3")
  -- torso
  G.ellipse(24+dx, 24+b, 10, 10, "rk2"); G.ridge(24+dx, 24+b, 10, 10, "rk1", 2)
  G.vein(19+dx, 18+b, 22+dx, 31+b, ph == 0 and "f3" or "f2"); G.vein(28+dx, 17+b, 26+dx, 30+b, ph == 0 and "f2" or "f3")
  -- brazo trasero
  G.thick(15+dx, 20+b, 11+dx, 30+b, 4, "rk3")
  -- cabeza con cuernos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(27+hx, 9+hy, 6, 6, "rk2"); G.ridge(27+hx, 9+hy, 6, 6, "rk1", 1)
  G.thick(23+hx, 5+hy, 18+hx, 0+hy, 2, "rk3"); G.thick(30+hx, 4+hy, 33+hx, -1+hy, 2, "rk3")
  G.line(28+hx, 13+hy, 32+hx, 13+hy, "f4"); G.px(29+hx, 13+hy, "f2")
  eye(G, 30+hx, 8+hy, "f1", P.pain)
  -- brazo con garras
  local sw = P.swing
  local ax, ay = sw and 42+dx or 36+dx, sw and 22+b or 30+b
  G.thick(32+dx, 19+b, ax, ay, 4, "rk2"); G.vein(33+dx, 20+b, ax-1, ay-1, "f4")
  G.line(ax, ay, ax+3, ay-2, "T"); G.line(ax, ay+1, ax+4, ay+1, "T"); G.line(ax, ay+2, ax+3, ay+4, "T")
  if sw then for i=0,2 do G.line(ax+5, ay-4+i*4, ax+7, ay-3+i*4, "f2") end end
  return G
end

-- =====================================================================================
-- Draco de Brasa (48x48): pariente chico de los dragones, alas abiertas, cola larga
-- =====================================================================================
local function draco(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(22,41,11,4,"dr2"); G.ridge(22,41,11,4,"dr1",1); G.line(8,40,30,36,"dw2"); G.line(30,36,38,42,"dw2")
    G.ellipse(38,42,4,2,"dr2"); G.px(39,41,"K"); G.thick(10,43,2,44,2,"dr3")
    return G
  end
  local wing = P.wing or 0
  -- ala trasera
  if wing == 1 then G.line(20+dx, 26+b, 10+dx, 6+b, "dr3"); G.line(10+dx, 6+b, 4+dx, 18+b, "dr3"); for i=0,6 do G.line(20+dx, 26+b, 4+dx+i, 18+b-i*1.6, "dw2") end
  else G.line(20+dx, 26+b, 4+dx, 30+b, "dr3"); for i=0,5 do G.line(20+dx, 26+b, 4+dx+i*2, 31+b+i, "dw2") end end
  -- cola
  G.thick(12+dx, 34+b, 3+dx, 40+b, 3, "dr2"); G.line(3+dx, 40+b, 0+dx, 38+b, "dr3")
  -- patas
  G.thick(17+dx, 36+b, 16+dx, 44, 3, "dr3"); G.thick(27+dx, 36+b, 29+dx, 44, 3, "dr3")
  G.rect(14+dx, 44, 18+dx, 45, "T"); G.rect(28+dx, 44, 32+dx, 45, "T")
  -- cuerpo
  G.ellipse(22+dx, 31+b, 11, 7, "dr2"); G.ridge(22+dx, 31+b, 11, 7, "dr1", 2); G.ellipse(23+dx, 35+b, 8, 2, "db")
  -- ala delantera
  if wing == 1 then
    G.line(24+dx, 24+b, 30+dx, 2+b, "dr3"); G.line(30+dx, 2+b, 40+dx, 10+b, "dr3")
    for i=0,9 do G.line(24+dx, 24+b, 30+dx+i, 3+b+i*0.8, "dw") end
  else
    G.line(24+dx, 26+b, 38+dx, 20+b, "dr3"); for i=0,6 do G.line(24+dx, 26+b, 38+dx-i*2, 21+b+i, "dw") end
  end
  -- cuello y cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(30+dx, 28+b, 35+hx, 21+hy, 4, "dr2"); G.ellipse(38+hx, 19+hy, 5, 4, "dr2"); G.ridge(38+hx, 19+hy, 5, 4, "dr1", 1)
  G.rect(41+hx, 20+hy, 45+hx, 22+hy, "dr2"); G.px(45+hx, 20+hy, "K")
  G.line(35+hx, 16+hy, 31+hx, 13+hy, "T"); G.line(37+hx, 15+hy, 35+hx, 11+hy, "T")
  eye(G, 39+hx, 18+hy, "f2", P.pain)
  if P.cast then for i=0,4 do G.ellipse(47+hx+i, 22+hy+i*0.5, 2.5-i*0.3, 1.8, i < 2 and "f3" or "f2") end G.px(46+hx, 21+hy, "f1") end
  return G
end

-- =====================================================================================
-- Diablillo (48x48): demonio chiquito que salta riéndose con un tridente
-- (sooty = el de la Fisura: tiznado, con fuelle en vez de tridente)
-- =====================================================================================
local function diablilloBase(P, sooty)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) + (P.jump and -6 or 0)
  local c1, c2, c3 = "im1", "im2", "im3"
  if sooty then c1, c2, c3 = "im2", "im3", "rk3" end
  if P.dead then
    G.ellipse(24,42,9,3,c2); G.ellipse(31,40,4,3,c2); G.line(16,42,10,44,c3); G.px(32,39,"K")
    G.line(36,44,44,40,sooty and "le2" or "m2")
    return G
  end
  -- cola con flecha
  G.line(18+dx, 36+b, 10+dx, 34+b, c3); G.line(10+dx, 34+b, 8+dx, 28+b, c3); G.ellipse(8+dx, 27+b, 1.5, 1.5, c2)
  -- piernas flacas
  G.line(21+dx, 37+b, 19+dx, 44+(P.jump and -4 or 0), c2); G.line(26+dx, 37+b, 28+dx, 44+(P.jump and -4 or 0), c2)
  -- cuerpo panzón
  G.ellipse(24+dx, 32+b, 6, 6, c1); G.ellipse(25+dx, 34+b, 4, 3, sooty and "es1" or "sb")
  -- alitas
  G.line(19+dx, 27+b, 13+dx, 22+b, c3); G.line(13+dx, 22+b, 16+dx, 29+b, c3); G.line(14+dx, 23+b, 16+dx, 27+b, c2)
  -- cabeza grande
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(26+hx, 20+hy, 7, 6, c1); G.ridge(26+hx, 20+hy, 7, 6, sooty and c2 or "dr1", 1)
  G.line(21+hx, 15+hy, 18+hx, 10+hy, "T"); G.line(30+hx, 15+hy, 32+hx, 10+hy, "T")
  G.line(25+hx, 24+hy, 31+hx, 24+hy, "K"); G.px(26+hx, 23+hy, "W"); G.px(30+hx, 23+hy, "W")
  eye(G, 29+hx, 19+hy, sooty and "f2" or "Y", P.pain); G.px(25+hx, 19+hy, P.pain and "K" or (sooty and "f2" or "Y"))
  if sooty then for _,m in ipairs({{22,30},{27,28},{24,18}}) do G.px(m[1]+dx, m[2]+b, "rk4") end end
  -- arma
  local poke = P.poke
  if sooty then
    -- fuelle de forja que sopla brasas
    local fx, fy = poke and 36+dx or 32+dx, 30+b
    G.thick(29+dx, 29+b, fx, fy, 2, c2)
    G.rect(fx, fy-3, fx+5, fy+2, "le1"); G.rect(fx, fy-3, fx+5, fy-2, "le2"); G.line(fx+6, fy, fx+8, fy, "m2")
    if poke or P.cast then for i=0,3 do G.px(fx+10+i*2, fy-1+((i % 2 == 0) and -1 or 1), i < 2 and "f2" or "f3") end end
  else
    local tx = poke and 44+dx or 35+dx
    G.thick(29+dx, 29+b, 32+dx, 30+b, 2, c2)
    if poke then G.line(26+dx, 30+b, tx, 30+b, "w2"); G.line(tx, 27+b, tx, 33+b, "m2"); G.line(tx, 27+b, tx+2, 27+b, "m1"); G.line(tx, 30+b, tx+3, 30+b, "m1"); G.line(tx, 33+b, tx+2, 33+b, "m1")
    else G.line(tx, 18+b, tx, 44, "w2"); G.line(tx-3, 16+b, tx+3, 16+b, "m2"); G.line(tx-3, 13+b, tx-3, 16+b, "m1"); G.line(tx, 12+b, tx, 16+b, "m1"); G.line(tx+3, 13+b, tx+3, 16+b, "m1") end
  end
  return G
end
local function diablillo(P) return diablilloBase(P, false) end
local function diablilloFragua(P) return diablilloBase(P, true) end

-- =====================================================================================
-- Maestro de la Lava (56x56, suelo en 53): agente de los Ocultos con túnica, máscara y lava en las manos
-- =====================================================================================
local function maestro(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(28,50,18,3,"fr2"); G.rect(12,47,36,49,"fr1"); G.ellipse(40,48,4,3,"rk1"); G.ellipse(46,51,5,2,"f4"); G.px(40,47,"ec2")
    return G
  end
  local ph, cast = P.phase or 0, P.cast
  -- charco de lava a sus pies
  G.ellipse(28+dx, 52, 16, 2, "f5"); G.vein(14+dx, 52, 42+dx, 52, "f3")
  -- túnica larga roja oscura con bordes de eclipse
  for y=22,52 do local w = 6 + (y - 22) * 0.4; G.line(28+dx-w, y+(y < 52 and b or 0), 28+dx+w, y+(y < 52 and b or 0), "fr2") end
  G.line(28+dx, 24+b, 28+dx, 52, "fr3")
  for y=26,50,6 do G.px(28+dx-6-(y-22)*0.4, y+b, "ec2") end
  -- estola con el eclipse
  G.rect(23+dx, 22+b, 26+dx, 40+b, "dr3"); G.ellipse(24+dx, 36+b, 2, 2, "rk4"); G.px(24+dx, 36+b, "ec1")
  -- cabeza: capucha y máscara de basalto
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(28+hx, 14+hy, 8, 8, "fr3"); G.ellipse(31+hx, 15+hy, 5, 6, "rk2"); G.ridge(31+hx, 15+hy, 5, 6, "rk1", 1)
  G.vein(31+hx, 10+hy, 31+hx, 20+hy, "f4")
  eye(G, 33+hx, 14+hy, "f1", P.pain); G.px(29+hx, 14+hy, P.pain and "K" or "f1")
  -- manos de lava
  if cast then
    G.thick(35+dx, 26+b, 44+dx, 18+b, 4, "fr2"); G.ellipse(45+dx, 17+b, 3, 3, "f3")
    G.flame(47+dx, 16+b, 10, 4, ph); G.ellipse(47+dx, 8+b, 3, 3, "f2")
    G.thick(21+dx, 26+b, 12+dx, 18+b, 4, "fr2"); G.ellipse(11+dx, 17+b, 3, 3, "f3"); G.flame(10+dx, 16+b, 6, 2, ph + 1)
  else
    G.thick(35+dx, 26+b, 40+dx, 36+b, 4, "fr2"); G.ellipse(41+dx, 37+b, 3, 3, "f3"); G.px(42+dx, 40+b, "f4"); G.px(41+dx, 43+b+ph, "f3")
    G.thick(21+dx, 26+b, 16+dx, 36+b, 4, "fr2"); G.ellipse(15+dx, 37+b, 3, 3, "f3")
  end
  return G
end

-- =====================================================================================
-- Dragón Menor Corrupto (56x56): dragón joven con un cristal de eclipse clavado en el pecho
-- =====================================================================================
local function dragon(P)
  local G = newGrid(56, 56, 53)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  if P.dead then
    G.ellipse(26,48,16,5,"dr2"); G.ridge(26,48,16,5,"dr1",2); G.line(6,48,30,40,"dw2"); G.line(30,40,44,49,"dw2")
    G.ellipse(46,50,6,3,"dr2"); G.px(48,49,"K"); G.thick(10,51,0,52,3,"dr3"); G.px(28,44,"ec2")
    return G
  end
  local wing, ph = P.wing or 0, P.phase or 0
  -- ala trasera
  if wing == 1 then for i=0,9 do G.line(22+dx, 28+b, 4+dx+i, 6+b+i*1.4, "dw2") end G.line(22+dx, 28+b, 6+dx, 4+b, "dr3")
  else for i=0,8 do G.line(22+dx, 28+b, 2+dx+i*2, 34+b+i, "dw2") end G.line(22+dx, 28+b, 2+dx, 33+b, "dr3") end
  -- cola gruesa
  G.thick(14+dx, 40+b, 2+dx, 46+b, 5, "dr2"); G.ridge(8+dx, 44+b, 6, 2, "dr1", 1); G.line(2+dx, 46+b, -1+dx, 42+b, "dr3")
  -- patas
  G.thick(19+dx, 42+b, 17+dx, 52, 5, "dr3"); G.thick(33+dx, 42+b, 35+dx, 52, 5, "dr3")
  G.rect(14+dx, 52, 20+dx, 53, "T"); G.rect(33+dx, 52, 39+dx, 53, "T")
  -- cuerpo
  G.ellipse(26+dx, 36+b, 14, 9, "dr2"); G.ridge(26+dx, 36+b, 14, 9, "dr1", 2); G.ellipse(28+dx, 41+b, 10, 3, "db")
  -- cristal de eclipse y venas negras
  G.thick(31+dx, 38+b, 33+dx, 30+b, 2, "ec3"); G.line(32+dx, 38+b, 32+dx, 29+b, "ec2"); G.px(32+dx, 28+b, "ec1")
  G.line(30+dx, 38+b, 24+dx, 42+b, "rk4"); G.line(33+dx, 38+b, 38+dx, 34+b, "rk4"); G.line(31+dx, 36+b, 26+dx, 32+b, "rk4")
  -- ala delantera
  if wing == 1 then for i=0,12 do G.line(28+dx, 28+b, 34+dx+i, 2+b+i*0.9, "dw") end G.line(28+dx, 28+b, 34+dx, 1+b, "dr3")
  else for i=0,8 do G.line(28+dx, 30+b, 46+dx-i*2, 24+b+i, "dw") end G.line(28+dx, 30+b, 46+dx, 23+b, "dr3") end
  -- cuello y cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(36+dx, 32+b, 42+hx, 22+hy, 6, "dr2")
  G.ellipse(45+hx, 19+hy, 6, 5, "dr2"); G.ridge(45+hx, 19+hy, 6, 5, "dr1", 1); G.rect(48+hx, 20+hy, 54+hx, 23+hy, "dr2"); G.px(54+hx, 20+hy, "K")
  G.line(41+hx, 15+hy, 35+hx, 11+hy, "T"); G.line(44+hx, 14+hy, 41+hx, 8+hy, "T")
  -- lágrimas de fuego
  eye(G, 47+hx, 18+hy, ph == 0 and "ec1" or "f2", P.pain); G.px(47+hx, 20+hy, "f3"); G.px(47+hx, 22+hy+ph, "f2")
  if P.cast then for i=0,5 do G.ellipse(56+hx+i, 23+hy+i*0.5, 3-i*0.3, 2.2, i < 2 and "f3" or (i < 4 and "f2" or "ec2")) end G.px(55+hx, 22+hy, "f1") end
  if P.bite then G.rect(49+hx, 23+hy, 54+hx, 24+hy, "r"); G.px(50+hx, 23+hy, "W"); G.px(53+hx, 23+hy, "W") end
  return G
end

-- =====================================================================================
-- Señor de la Caldera (64x64, suelo en 61): demonio grande con corona de roca fundida y mazo
-- =====================================================================================
local function senor(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(30,57,24,4,"rk3"); G.rect(10,50,42,56,"rk2"); G.vein(12,52,40,53,"f4")
    G.ellipse(48,54,7,4,"rk2"); G.rect(46,47,56,49,"f3"); G.px(50,46,"f2")
    G.rect(0,55,10,60,"rk1"); G.line(10,57,24,55,"w2")
    return G
  end
  local ph, swing, cast = P.phase or 0, P.swing, P.cast
  -- mazo de basalto
  local mx, my = 48+dx, 32+b
  if swing then
    G.thick(38+dx, 20+b, mx+6, my+12, 3, "w2"); G.rect(mx+1, my+12, mx+14, my+22, "rk2"); G.rect(mx+1, my+12, mx+14, my+13, "rk1")
    G.vein(mx+3, my+15, mx+12, my+19, "f3"); for k=0,3 do G.px(mx+k*4, 61, "f3"); G.px(mx+1+k*4, 60, "f2") end
  else
    G.thick(mx, my, mx+2, my-20, 3, "w2"); G.rect(mx-5, my-31, mx+8, my-20, "rk2"); G.rect(mx-5, my-31, mx+8, my-30, "rk1")
    G.vein(mx-3, my-28, mx+6, my-23, cast and "f2" or "f4")
  end
  -- piernas de cabra
  G.thick(22+dx, 44+b, 18+dx, 52+b, 7, "rk2"); G.thick(18+dx, 52+b, 21+dx, 60, 5, "rk2")
  G.thick(36+dx, 44+b, 40+dx, 52+b, 7, "rk2"); G.thick(40+dx, 52+b, 37+dx, 60, 5, "rk2")
  G.rect(17+dx, 60, 24+dx, 61, "rk4"); G.rect(34+dx, 60, 41+dx, 61, "rk4")
  -- cola
  G.thick(16+dx, 44+b, 6+dx, 50+b, 3, "rk3"); G.line(6+dx, 50+b, 2+dx, 44+b, "rk3"); G.flame(2+dx, 44+b, 4, 1.5, ph)
  -- torso enorme con placas
  G.ellipse(29+dx, 32+b, 16, 14, "rk2"); G.ridge(29+dx, 32+b, 16, 14, "rk1", 3)
  G.vein(22+dx, 22+b, 26+dx, 42+b, ph == 0 and "f3" or "f2"); G.vein(36+dx, 20+b, 32+dx, 42+b, ph == 0 and "f2" or "f3"); G.vein(18+dx, 32+b, 40+dx, 34+b, "f4")
  -- cinturón con calavera
  G.rect(14+dx, 42+b, 44+dx, 45+b, "w3"); G.ellipse(29+dx, 43+b, 3, 3, "T"); G.px(28+dx, 43+b, "K"); G.px(30+dx, 43+b, "K")
  -- hombreras de roca con fuego
  G.ellipse(13+dx, 22+b, 6, 5, "rk3"); G.flame(13+dx, 18+b, 6, 3, ph)
  G.ellipse(45+dx, 22+b, 6, 5, "rk3"); G.flame(45+dx, 18+b, 6, 3, ph + 1)
  -- brazo trasero
  G.thick(12+dx, 24+b, 9+dx, 42+b, 6, "rk3"); G.ellipse(9+dx, 43+b, 3, 3, "rk2")
  -- cabeza: cuernos largos y corona de roca fundida
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 12+hy, 8, 7, "rk2"); G.ridge(31+hx, 12+hy, 8, 7, "rk1", 1)
  G.thick(25+hx, 8+hy, 16+hx, 3+hy, 3, "rk3"); G.line(16+hx, 3+hy, 13+hx, 7+hy, "rk3")
  G.thick(36+hx, 7+hy, 42+hx, 1+hy, 3, "rk3"); G.line(42+hx, 1+hy, 45+hx, 4+hy, "rk3")
  G.rect(25+hx, 4+hy, 38+hx, 6+hy, "f4"); for k=0,3 do G.flame(26+hx+k*4, 4+hy, 3, 1.5, ph + k) end
  G.rect(30+hx, 16+hy, 38+hx, 17+hy, "f5"); G.px(31+hx, 16+hy, "T"); G.px(37+hx, 16+hy, "T")
  if P.pain then G.px(34+hx,11+hy,"K"); G.px(35+hx,11+hy,"K") else G.rect(33+hx,10+hy,35+hx,12+hy,"f1"); G.px(29+hx, 11+hy, "f2") end
  -- brazo del mazo
  if swing then G.thick(42+dx, 24+b, 40+dx, 19+b, 6, "rk2")
  else G.thick(43+dx, 24+b, mx+1, my-2-(cast and 2 or 0), 6, "rk2"); G.ellipse(mx+1, my-2-(cast and 2 or 0), 3, 3, "rk1") end
  if cast then for i=0,4 do G.flame(10+i*11+dx, 61, 5 + (i % 2) * 3, 2, ph + i) end end
  return G
end

-- =====================================================================================
-- Titán de Fuego (64x64): gigante de magma con roca encima; el lago de lava le llega a las rodillas
-- =====================================================================================
local function titan(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(32,58,28,4,"f5"); G.ellipse(32,58,20,2,"f4")
    for _,r in ipairs({{14,52,7,5},{30,50,9,7},{48,53,7,4}}) do G.ellipse(r[1],r[2],r[3],r[4],"rk2"); G.ridge(r[1],r[2],r[3],r[4],"rk1",1) end
    G.vein(24,48,36,54,"f4")
    return G
  end
  local ph, swing, cast = P.phase or 0, P.swing, P.cast
  -- cuerpo de magma: hombros enormes, sin piernas visibles (sale del lago)
  G.ellipse(31+dx, 38+b, 22, 18, "f4"); G.ellipse(31+dx, 36+b, 18, 14, "f3")
  -- placas de roca sobre el magma
  for _,r in ipairs({{18,28,7,6},{42,26,8,6},{30,44,9,5},{14,44,5,4},{46,44,6,4},{30,30,6,5}}) do
    G.ellipse(r[1]+dx, r[2]+b, r[3], r[4], "rk2"); G.ridge(r[1]+dx, r[2]+b, r[3], r[4], "rk1", 2)
  end
  G.vein(24+dx, 32+b, 26+dx, 50+b, "f2"); G.vein(36+dx, 30+b, 38+dx, 50+b, "f1")
  -- el lago de lava (tapa la cintura)
  G.ellipse(31+dx, 58, 30, 5, "f5"); G.ellipse(31+dx, 57, 26, 3, "f4"); G.line(10+dx, 56, 52+dx, 56, "f3")
  for k=0,4 do if (k + ph) % 2 == 0 then G.px(10+dx+k*10, 54, "f2"); G.px(11+dx+k*10, 53, "f1") end end
  -- brazo trasero
  G.thick(11+dx, 30+b, 5+dx, 50+b, 9, "rk2"); G.ellipse(5+dx, 51+b, 5, 4, "rk1"); G.vein(9+dx, 32+b, 6+dx, 48+b, "f3")
  -- cabeza: roca con cuernos y una boca de fuego
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(32+hx, 13+hy, 10, 9, "rk2"); G.ridge(32+hx, 13+hy, 10, 9, "rk1", 2)
  G.thick(24+hx, 8+hy, 16+hx, 0+hy, 4, "rk3"); G.thick(40+hx, 8+hy, 48+hx, 0+hy, 4, "rk3")
  G.flame(32+hx, 4+hy, 5, 4, ph)
  G.rect(28+hx, 17+hy, 39+hx, 19+hy, "f3"); G.rect(30+hx, 18+hy, 37+hx, 18+hy, "f1")
  if P.pain then G.rect(28+hx,11+hy,30+hx,11+hy,"K"); G.rect(35+hx,11+hy,37+hx,11+hy,"K")
  else G.rect(28+hx,10+hy,30+hx,12+hy,"f1"); G.rect(35+hx,10+hy,37+hx,12+hy,"f1") end
  -- puño delantero
  if swing then
    G.thick(48+dx, 28+b, 58+dx, 44+b, 9, "rk2"); G.ellipse(58+dx, 48+b, 6, 6, "rk1"); G.vein(50+dx, 30+b, 57+dx, 46+b, "f2")
    for k=0,3 do G.flame(46+dx+k*5, 61, 5, 2, ph + k) end
  elseif cast then
    G.thick(48+dx, 28+b, 56+dx, 12+b, 9, "rk2"); G.ellipse(57+dx, 9+b, 5, 5, "rk1")
    G.ellipse(57+dx, 2+b, 6, 4, "f3"); G.ellipse(57+dx, 2+b, 3, 2, "f1")
  else
    G.thick(48+dx, 28+b, 54+dx, 48+b, 9, "rk2"); G.ellipse(55+dx, 50+b, 5, 5, "rk1"); G.vein(51+dx, 30+b, 54+dx, 46+b, "f3")
  end
  -- sello roto en el pecho (el Tercer Sello)
  G.ellipse(31+dx, 28+b, 3, 3, "Y"); G.px(31+dx, 28+b, "f1"); G.line(29+dx, 26+b, 33+dx, 30+b, "rk4")
  return G
end

-- =====================================================================================
-- Fundidor Oculto (48x48): delantal de cuero, máscara de hierro y un cucharón de metal fundido
-- =====================================================================================
local function fundidor(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,42,14,3,"le3"); G.rect(10,39,30,41,"le1"); G.ellipse(34,40,4,3,"hk2"); G.ellipse(42,43,4,2,"f4")
    return G
  end
  local pour = P.swing or P.cast
  -- piernas y botas
  G.thick(20+dx, 33+b, 19+dx, 43, 4, "fr3"); G.thick(28+dx, 33+b, 29+dx, 43, 4, "fr3")
  G.rect(15+dx, 43, 22+dx, 45, "le3"); G.rect(26+dx, 43, 33+dx, 45, "le3")
  -- torso ancho con delantal de cuero
  G.rect(15+dx, 18+b, 33+dx, 34+b, "fr2"); G.rect(18+dx, 20+b, 31+dx, 38+b, "le1"); G.rect(18+dx, 36+b, 31+dx, 38+b, "le2")
  G.line(18+dx, 20+b, 18+dx, 38+b, "le2"); G.px(26+dx, 26+b, "ec2"); G.px(23+dx, 30+b, "f4")
  -- brazo trasero con pinzas
  G.thick(15+dx, 20+b, 11+dx, 32+b, 4, "s3"); G.line(11+dx, 32+b, 8+dx, 38+b, "m2"); G.line(12+dx, 32+b, 11+dx, 38+b, "m2")
  -- cabeza: máscara de hierro con rendijas
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(25+hx, 12+hy, 7, 7, "hk2"); G.ridge(25+hx, 12+hy, 7, 7, "hk1", 2)
  G.rect(22+hx, 11+hy, 31+hx, 11+hy, P.pain and "hk4" or "f3"); G.rect(26+hx, 14+hy, 30+hx, 14+hy, "hk4"); G.rect(26+hx, 16+hy, 30+hx, 16+hy, "hk4")
  -- brazo con el cucharón
  if pour then
    G.thick(32+dx, 20+b, 38+dx, 18+b, 4, "s3"); G.line(38+dx, 18+b, 41+dx, 14+b, "m2")
    G.ellipse(43+dx, 14+b, 3, 2, "m3"); for i=0,4 do G.px(44+dx+(i % 2), 17+b+i*2, i < 3 and "f2" or "f3") end
    G.ellipse(45+dx, 44, 3, 1, "f3")
  else
    G.thick(32+dx, 20+b, 36+dx, 30+b, 4, "s3"); G.line(36+dx, 30+b, 38+dx, 34+b, "m2")
    G.ellipse(39+dx, 36+b, 4, 3, "m3"); G.rect(36+dx, 34+b, 42+dx, 34+b, "f2"); G.px(39+dx, 34+b, "f1")
  end
  return G
end

-- =====================================================================================
-- Gólem de Escoria (56x56): montaña de escoria con metal derretido que gotea
-- =====================================================================================
local function golemEscoria(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    for _,r in ipairs({{12,48,8,5},{28,49,9,5},{43,48,7,5},{22,43,5,3}}) do G.ellipse(r[1],r[2],r[3],r[4],"es2"); G.ridge(r[1],r[2],r[3],r[4],"es1",1) end
    G.ellipse(28,52,14,1,"f4")
    return G
  end
  local ph, slam = P.phase or 0, P.slam
  -- piernas cortas
  G.thick(19+dx, 40+b, 18+dx, 52, 8, "es3"); G.thick(36+dx, 40+b, 37+dx, 52, 8, "es3")
  -- cuerpo amontonado
  G.ellipse(27+dx, 30+b, 17, 15, "es2"); G.ridge(27+dx, 30+b, 17, 15, "es1", 3)
  for _,r in ipairs({{18,24,5,4},{34,22,6,4},{24,36,6,4},{38,34,4,3}}) do G.ellipse(r[1]+dx, r[2]+b, r[3], r[4], "es3"); G.ridge(r[1]+dx, r[2]+b, r[3], r[4], "es1", 1) end
  -- metal derretido que gotea
  G.vein(22+dx, 18+b, 26+dx, 40+b, "f3"); G.vein(32+dx, 20+b, 30+dx, 42+b, "f2")
  for k,m in ipairs({{20,44},{33,45},{27,46}}) do G.px(m[1]+dx, m[2]+b+((k+ph) % 2), "f3") end
  -- pedazos de armas y moldes metidos en la escoria
  G.line(12+dx, 28+b, 6+dx, 22+b, "m2"); G.rect(38+dx, 14+b, 43+dx, 18+b, "m3")
  -- cabeza hundida
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(30+hx, 12+hy, 7, 5, "es2"); G.ridge(30+hx, 12+hy, 7, 5, "es1", 1)
  if P.pain then G.rect(30+hx, 12+hy, 35+hx, 12+hy, "es3") else G.rect(30+hx, 11+hy, 31+hx, 13+hy, "f2"); G.rect(34+hx, 11+hy, 35+hx, 13+hy, "f2") end
  -- brazos
  G.thick(11+dx, 22+b, 6+dx, 40+b, 7, "es3"); G.ellipse(6+dx, 42+b, 5, 4, "es2")
  if slam then
    G.thick(43+dx, 22+b, 52+dx, 40+b, 7, "es2"); G.ellipse(52+dx, 44+b, 6, 5, "es1"); G.ellipse(52+dx, 47+b, 4, 1, "f3")
    for k=0,3 do G.px(36+dx+k*5, 53, "f3"); G.px(37+dx+k*5, 52, "f2") end
  else
    G.thick(43+dx, 22+b, 47+dx, 40+b, 7, "es2"); G.ellipse(47+dx, 42+b, 5, 4, "es1"); G.px(47+dx, 46+b+ph, "f3")
  end
  return G
end

-- =====================================================================================
-- Morvak, el Forjador de Eclipses (64x64): herrero de los Ocultos con armadura de forja negra,
-- un martillo enorme de eclipse y un yunque ardiendo a su lado
-- =====================================================================================
local function morvak(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(30,58,22,4,"hk3"); G.rect(12,52,40,57,"hk2"); G.rect(12,52,40,53,"hk1")
    G.ellipse(44,55,6,3,"hk2"); G.rect(48,48,60,55,"hk3"); G.px(54,50,"ec2")
    G.rect(0,52,10,61,"hk4"); G.rect(2,50,8,52,"f4")
    return G
  end
  local ph, swing, cast = P.phase or 0, P.swing, P.cast
  -- yunque ardiendo detrás
  G.rect(0+dx, 50, 10+dx, 52, "hk3"); G.rect(3+dx, 52, 7+dx, 61, "hk3"); G.rect(0+dx, 48, 12+dx, 50, "hk2")
  G.rect(2+dx, 47, 9+dx, 47, "f3"); G.px(5+dx, 46, "f1")
  -- martillo
  local mx, my = 48+dx, 30+b
  if swing then
    G.thick(38+dx, 20+b, mx+6, my+14, 3, "w2"); G.rect(mx+1, my+13, mx+15, my+23, "hk2"); G.rect(mx+1, my+13, mx+15, my+14, "hk1")
    G.ellipse(mx+8, my+18, 3, 3, "ec3"); G.px(mx+8, my+18, "ec1")
    for k=0,3 do G.px(mx-2+k*5, 61, "ec2"); G.px(mx-1+k*5, 60, "f2") end
  else
    G.thick(mx, my, mx+2, my-18, 3, "w2"); G.rect(mx-6, my-30, mx+9, my-18, "hk2"); G.rect(mx-6, my-30, mx+9, my-29, "hk1")
    G.ellipse(mx+1, my-24, 3, 3, "ec3"); G.px(mx+1, my-24, cast and "W" or "ec1")
    if cast then for i=0,5 do local a = i * 1.05; G.px(mx+1+math.cos(a)*7, my-24+math.sin(a)*7, "ec1") end end
  end
  -- piernas con grebas
  G.thick(22+dx, 44+b, 21+dx, 59, 7, "hk3"); G.thick(36+dx, 44+b, 37+dx, 59, 7, "hk3")
  G.rect(15+dx, 58, 26+dx, 61, "hk4"); G.rect(32+dx, 58, 43+dx, 61, "hk4")
  -- torso con coraza de forja negra y delantal
  G.ellipse(29+dx, 32+b, 15, 14, "hk2"); G.ellipse(27+dx, 30+b, 11, 10, "hk1")
  G.rect(20+dx, 34+b, 38+dx, 50+b, "le2"); G.rect(20+dx, 34+b, 38+dx, 35+b, "le3")
  G.ellipse(29+dx, 27+b, 4, 4, "hk3"); G.ellipse(29+dx, 27+b, 2, 2, "ec2"); G.px(29+dx, 27+b, ph == 0 and "ec1" or "W")
  -- cristales de eclipse en las hombreras
  G.ellipse(14+dx, 22+b, 6, 4, "hk2"); G.ridge(14+dx, 22+b, 6, 4, "hk1", 2); G.line(13+dx, 19+b, 11+dx, 12+b, "ec2"); G.px(11+dx, 12+b, "ec1")
  G.ellipse(44+dx, 22+b, 6, 4, "hk2"); G.ridge(44+dx, 22+b, 6, 4, "hk1", 2); G.line(45+dx, 19+b, 47+dx, 13+b, "ec2"); G.px(47+dx, 13+b, "ec1")
  -- brazo trasero con tenazas
  G.thick(12+dx, 24+b, 9+dx, 40+b, 6, "hk3"); G.line(9+dx, 41+b, 6+dx, 49+b, "m2"); G.line(10+dx, 41+b, 10+dx, 49+b, "m2")
  -- cabeza: calvo, barba trenzada quemada, gafas de forja
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 12+hy, 7, 7, "s2"); G.ridge(31+hx, 12+hy, 7, 7, "s1", 2)
  G.rect(25+hx, 9+hy, 38+hx, 11+hy, "hk3"); G.ellipse(34+hx, 10+hy, 2, 1.5, P.pain and "hk4" or "ec1"); G.ellipse(29+hx, 10+hy, 2, 1.5, P.pain and "hk4" or "ec1")
  G.rect(27+hx, 16+hy, 37+hx, 20+hy, "rk3"); G.thick(32+hx, 20+hy, 32+hx, 26+hy, 3, "rk3"); G.px(32+hx, 26+hy, "Y")
  G.px(36+hx, 15+hy, "f4")
  -- brazo del martillo
  if swing then G.thick(42+dx, 24+b, 40+dx, 19+b, 6, "hk2")
  else G.thick(43+dx, 24+b, mx+1, my-2-(cast and 2 or 0), 6, "hk2"); G.ellipse(mx+1, my-2-(cast and 2 or 0), 3, 3, "s2") end
  return G
end

-- =====================================================================================
local MONSTERS = {
  {key="salamandra_roja", size=48, draw=salamandra, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=0,hx=-2,dur=200},{dx=3,bite=true,phase=1,dur=140},{dx=1,dur=220}}},
    {"cast",   {{bob=0,hx=-1,dur=200},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=1,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="lobo_ceniza", size=48, draw=lobo, anims={
    {"idle",   {{bob=0,dur=400},{bob=1,tail=2,dur=400}}},
    {"attack", {{bob=2,hx=-1,hy=2,dur=200},{dx=3,bob=-2,bite=true,feet={{10,44},{13,44},{40,40},{37,42}},dur=120},{dx=2,dur=220}}},
    {"hurt",   {{dx=-2,hy=-2,pain=true,dur=250}}},
    {"die",    {{bob=4,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="bandido_fuego", size=48, draw=bandido, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=2,throw=true,phase=1,dur=160},{dx=1,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="escarabajo_azufre", size=48, draw=escarabajo, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=0,hx=-2,phase=1,dur=200},{dx=4,phase=0,dur=140},{dx=1,phase=1,dur=220}}},
    {"cast",   {{bob=1,dur=200},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="elemental_fuego", size=48, draw=elementalFuego, anims={
    {"idle",   {{bob=0,phase=0,dur=260},{bob=-1,phase=1,dur=260}}},
    {"attack", {{bob=-1,hy=-1,phase=1,dur=200},{dx=3,cast=true,phase=0,dur=200},{dx=1,phase=1,dur=200}}},
    {"cast",   {{bob=-1,phase=1,dur=180},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="serpiente_magma", size=48, draw=serpiente, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=-1,hx=-2,dur=200},{dx=2,lunge=true,phase=1,dur=150},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,hx=-1,dur=200},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-2,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="golem_obsidiana", size=48, draw=golemObs, anims={
    {"idle",   {{bob=0,dur=520},{bob=1,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,slam=true,dur=170},{dx=1,slam=true,dur=300}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="centinela_infernal", size=48, draw=centinela, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=-1,hx=-1,phase=1,dur=220},{dx=4,thrust=true,phase=0,dur=150},{dx=2,thrust=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
  }},
  {key="fanatico_eclipse", size=48, draw=fanatico, anims={
    {"idle",   {{bob=0,dur=480},{bob=1,dur=480}}},
    {"attack", {{bob=-1,dur=200},{dx=2,cast=true,dur=240},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,dur=200},{cast=true,dur=320},{cast=true,bob=-1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="demonio_lava", size=48, draw=demonio, anims={
    {"idle",   {{bob=0,phase=0,dur=420},{bob=1,phase=1,dur=420}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=4,swing=true,phase=1,dur=140},{dx=1,swing=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="draco_brasa", size=48, draw=draco, anims={
    {"idle",   {{bob=0,wing=1,dur=240},{bob=2,wing=0,dur=240}}},
    {"attack", {{bob=-1,wing=1,hx=-2,dur=200},{dx=3,bob=1,wing=0,dur=150},{dx=1,wing=1,dur=220}}},
    {"cast",   {{bob=-1,wing=1,dur=200},{cast=true,wing=0,dur=320},{cast=true,wing=1,dur=220}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=250}}},
    {"die",    {{bob=3,wing=0,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="diablillo_caldera", size=48, draw=diablillo, anims={
    {"idle",   {{bob=0,dur=260},{bob=-2,jump=true,dur=220}}},
    {"attack", {{bob=-1,hx=-1,dur=180},{dx=4,poke=true,dur=150},{dx=1,poke=true,dur=200}}},
    {"hurt",   {{dx=-3,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="maestro_lava", size=56, draw=maestro, anims={
    {"idle",   {{bob=0,phase=0,dur=460},{bob=-1,phase=1,dur=460}}},
    {"attack", {{bob=-1,phase=1,dur=220},{dx=2,cast=true,phase=0,dur=240},{dx=1,phase=1,dur=220}}},
    {"cast",   {{bob=-1,phase=0,dur=200},{cast=true,phase=1,dur=320},{cast=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }},
  {key="dragon_menor_corrupto", size=56, draw=dragon, anims={
    {"idle",   {{bob=0,wing=1,phase=0,dur=320},{bob=2,wing=0,phase=1,dur=320}}},
    {"attack", {{bob=-1,wing=1,hx=-2,dur=220},{dx=3,bite=true,wing=0,dur=150},{dx=1,wing=1,dur=240}}},
    {"cast",   {{bob=-1,wing=1,dur=220},{cast=true,wing=0,phase=0,dur=340},{cast=true,wing=1,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,wing=1,pain=true,dur=280}}},
    {"die",    {{bob=3,wing=0,pain=true,dur=260},{dead=true,dur=1200}}},
  }},
  {key="senor_caldera", size=64, draw=senor, anims={
    {"idle",   {{bob=0,phase=0,dur=520},{bob=1,phase=1,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=280},{dx=3,swing=true,phase=1,dur=180},{dx=1,swing=true,phase=0,dur=300}}},
    {"cast",   {{bob=-1,phase=0,dur=220},{cast=true,phase=1,dur=340},{cast=true,phase=0,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }},
  {key="titan_fuego", size=64, draw=titan, anims={
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-2,hx=-1,dur=300},{dx=3,swing=true,phase=1,dur=180},{dx=1,swing=true,phase=0,dur=320}}},
    {"cast",   {{bob=-1,phase=0,dur=220},{cast=true,phase=1,dur=360},{cast=true,phase=0,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=320}}},
    {"die",    {{bob=3,pain=true,dur=320},{dead=true,dur=1400}}},
  }},
  {key="fisura_fundidor", size=48, draw=fundidor, anims={
    {"idle",   {{bob=0,dur=450},{bob=1,dur=450}}},
    {"attack", {{bob=1,hx=-1,dur=200},{dx=3,swing=true,dur=160},{dx=1,swing=true,dur=220}}},
    {"cast",   {{bob=1,dur=200},{cast=true,dur=320},{cast=true,bob=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="fisura_diablillo", size=48, draw=diablilloFragua, anims={
    {"idle",   {{bob=0,dur=260},{bob=-2,jump=true,dur=220}}},
    {"attack", {{bob=-1,hx=-1,dur=180},{dx=4,poke=true,dur=150},{dx=1,poke=true,dur=200}}},
    {"cast",   {{bob=-1,dur=180},{cast=true,dur=300},{cast=true,jump=true,dur=220}}},
    {"hurt",   {{dx=-3,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="fisura_golem_escoria", size=56, draw=golemEscoria, anims={
    {"idle",   {{bob=0,phase=0,dur=520},{bob=1,phase=1,dur=520}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=2,slam=true,phase=1,dur=170},{dx=1,slam=true,phase=0,dur=300}}},
    {"hurt",   {{dx=-2,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="fisura_morvak", size=64, draw=morvak, anims={
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
  spr:saveAs(dir .. "/zona3/" .. m.key .. ".aseprite")
  spr:close()
  local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
  for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
  local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
  out:saveCopyAs(dir .. "/enemigos/" .. m.key .. ".png")
  out:close()
  manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
end
local fh = io.open(dir .. "/enemigos_volcan.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
