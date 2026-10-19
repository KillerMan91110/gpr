-- Jefes míticos de las Montañas, del Volcán y de las Costas (gprback/lib/mythic.js) y sus esbirros:
--   mitico_truenocuerno  Truenocuerno, el Carnero de la Tormenta (Montañas), 64x64
--   cabra_tronadora      Cabra Tronadora, su esbirro, 48x48
--   mitico_ignivora      Ignivora, la Madre Salamandra (Volcán), 64x64
--   cria_ignivora        Cría de Ignivora, su esbirro, 48x48
--   mitico_rey_pinzas    Rey Pinzas, el Ermitaño Colosal (Costas), 64x64: lleva un barco hundido de caparazón
--   cangrejo_ermitano    Cangrejo Ermitaño, su esbirro, 48x48: vive en una caracola
-- (Aullaluna, el de la Pradera, está en art/sprites/mundo/crear_coleccion.lua.)
-- Mismo estilo que crear_enemigos_volcan.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida: <dir>/miticos/<clave>.aseprite, <png>/<clave>.png (tira horizontal) y <dir>/miticos.json
-- con las animaciones para enemigos.json.
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/enemigos --script-param png=public/assets/sprites/combate/enemigos --script art/sprites/enemigos/crear_miticos.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", r="7a1f2a", T="eee0c0",
  -- fuego (brilla: sin contorno)
  f1="fff4b0", f2="ffd040", f3="ff8a24", f4="e04a1a", f5="9a2414",
  -- roca volcánica
  rk1="6e5e5c", rk2="4c4044", rk3="30282c",
  -- salamandra (la madre es más oscura y vieja; las crías, más vivas)
  sa1="ea6a3a", sa2="bc442a", sa3="7e2a1e", sa4="52180f", sb="f6b464", sc="ffc87a",
  -- lana de tormenta, cara, pezuñas y cuernos de oro viejo
  wo1="dfe5ee", wo2="aeb8c8", wo3="7c869a", wo4="4e566a",
  fa1="7a7484", fa2="54505e", fa3="38343f", hv="2a2630",
  ho1="e8c870", ho2="b8923a", ho3="7a5e22",
  -- rayo (brilla: sin contorno)
  zz1="fff7a0", zz2="ffd23a", zz3="9ae8ff",
  -- cangrejo ermitaño (rojo coral), percebes, madera del barco hundido, vela rota, agua y caracola
  cr1="e8704a", cr2="b84a30", cr3="7a2a1e", crb="f2c8a0", pc1="ddd4c2", pc2="aaa090",
  wd1="9a6a42", wd2="6e4a2c", wd3="45301c", sl1="d8d0b8", sl2="a8a088",
  wa1="d8f6ee", wa2="8ad8d0", wa3="4aa8a8", al1="5a9a4a", al2="3a6a32",
  cc1="f2e4cc", cc2="d8b890", cc3="a88458",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, f1=true, f2=true, f3=true, zz1=true, zz2=true, zz3=true, wa1=true, wa2=true}

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
  -- llama: lengua de fuego de (x, y) hacia arriba, de alto h y ancho w
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
  -- rayo en zigzag de (x0, y0) a (x1, y1)
  function G.bolt(x0, y0, x1, y1, ph, c)
    local n = 4
    local px, py = x0, y0
    for i=1,n do
      local t = i/n
      local off = (i < n) and ((((i + (ph or 0)) % 2 == 0) and 2) or -2) or 0
      local nx = x0 + (x1-x0)*t + off
      local ny = y0 + (y1-y0)*t
      G.line(px, py, nx, ny, c or "zz1")
      px, py = nx, ny
    end
  end
  -- cuerno enrollado (espiral) con centro (cx, cy), de radio r, hacia adelante (dir = 1) o atrás
  function G.horn(cx, cy, r, w, dir)
    for i=0,40 do
      local t = i / 40
      local a = -math.pi * 0.6 + t * math.pi * 1.7
      local rr = r * (1 - t * 0.55)
      local x = cx + math.cos(a) * rr * dir
      local y = cy + math.sin(a) * rr
      local c = (t < 0.3) and "ho3" or ((t < 0.7) and "ho2" or "ho1")
      G.ellipse(x, y, w * (1 - t * 0.5), w * (1 - t * 0.5), c)
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

-- =====================================================================================
-- Truenocuerno, el Carnero de la Tormenta (64x64, suelo en 61): carnero enorme de lana de nube
-- negra y blanca, cuernos de oro enrollados y rayos que saltan entre ellos
-- =====================================================================================
local function truenocuerno(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  if P.dead then
    G.ellipse(28,56,22,5,"wo3"); G.ellipse(28,54,20,5,"wo2"); G.ridge(28,54,20,5,"wo1",2)
    G.ellipse(52,56,7,4,"fa2"); G.horn(50,52,6,2,1)
    G.px(20,50,"zz3"); G.px(36,48,"zz3")
    return G
  end
  -- chispas sueltas alrededor de la lana
  for i,s in ipairs({{6,30},{12,24},{40,22},{4,42}}) do if (i + ph) % 2 == 0 then G.px(s[1]+dx, s[2]+b, "zz1"); G.px(s[1]+dx+1, s[2]+b-1, "zz2") end end
  -- patas lejanas
  local f = P.feet or {{14,60},{22,60},{38,60},{46,60}}
  G.thick(16+dx, 50+b, f[1][1], f[1][2], 3, "fa3"); G.rect(f[1][1]-1, f[1][2], f[1][1]+2, f[1][2]+1, "hv")
  G.thick(40+dx, 50+b, f[3][1], f[3][2], 3, "fa3"); G.rect(f[3][1]-1, f[3][2], f[3][1]+2, f[3][2]+1, "hv")
  -- cuerpo: lana de nube (abajo gris de tormenta, arriba blanca)
  G.ellipse(28+dx, 44+b, 19, 10, "wo4")
  G.ellipse(28+dx, 42+b, 18, 9, "wo3")
  for i,c in ipairs({{14,38,6},{22,35,7},{31,34,7},{39,37,6},{18,44,6},{35,44,6}}) do
    G.ellipse(c[1]+dx, c[2]+b, c[3], c[3]-1, (i <= 4) and "wo2" or "wo3"); G.ridge(c[1]+dx, c[2]+b, c[3], c[3]-1, "wo1", 2)
  end
  -- cola corta de nube
  G.ellipse(9+dx, 40+b, 3, 3, "wo2"); G.ridge(9+dx, 40+b, 3, 3, "wo1", 1)
  -- patas cercanas
  G.thick(20+dx, 51+b, f[2][1], f[2][2], 4, "fa2"); G.rect(f[2][1]-2, f[2][2], f[2][1]+2, f[2][2]+1, "hv")
  G.thick(44+dx, 51+b, f[4][1], f[4][2], 4, "fa2"); G.rect(f[4][1]-2, f[4][2], f[4][1]+2, f[4][2]+1, "hv")
  -- cuello de lana y cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(44+dx, 36+b, 7, 8, "wo2"); G.ridge(44+dx, 36+b, 7, 8, "wo1", 2)
  G.ellipse(52+hx, 33+hy, 6, 6, "fa1"); G.ridge(52+hx, 33+hy, 6, 6, "W", 1)
  G.rect(55+hx, 33+hy, 60+hx, 38+hy, "fa1"); G.rect(56+hx, 38+hy, 60+hx, 39+hy, "fa2")
  G.px(60+hx, 35+hy, "K")
  -- mechón de nube entre los cuernos
  G.ellipse(50+hx, 27+hy, 4, 3, "wo1")
  -- cuernos enrollados (el de atrás más oscuro asoma)
  G.horn(47+hx, 30+hy, 7, 2.2, 1)
  -- ojo
  if P.pain then G.px(55+hx, 31+hy, "K"); G.px(56+hx, 32+hy, "K") else G.px(55+hx, 31+hy, "zz2"); G.px(56+hx, 31+hy, "zz1") end
  -- carga: cabeza baja y un rayo que cae delante
  if P.charge then
    G.bolt(62, 4, 58+hx, 26+hy, ph, "zz1"); G.bolt(63, 8, 61, 24, ph + 1, "zz2")
  end
  -- llama a la tormenta: rayos que saltan de cuerno a cuerno y bajan al suelo
  if P.cast then
    G.bolt(42+hx, 22+hy, 54+hx, 22+hy, ph, "zz1")
    G.bolt(30+dx, 0, 28+dx, 30+b, ph, "zz2"); G.bolt(14+dx, 2, 18+dx, 32+b, ph + 1, "zz1")
    for k=0,3 do G.px(8+k*14+dx, 61, "zz1"); G.px(9+k*14+dx, 60, "zz2") end
  end
  return G
end

-- =====================================================================================
-- Cabra Tronadora (48x48, suelo en 45): cabra de lana gris con cuernitos que echan chispas
-- =====================================================================================
local function cabra(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  if P.dead then
    G.ellipse(22,42,13,3,"wo3"); G.ridge(22,42,13,3,"wo2",1)
    G.ellipse(38,42,5,3,"fa2"); G.px(40,40,"ho2"); G.px(41,39,"ho2")
    return G
  end
  local f = P.feet or {{12,44},{17,44},{29,44},{34,44}}
  G.thick(13+dx, 37+b, f[1][1], f[1][2], 2, "fa3"); G.thick(30+dx, 37+b, f[3][1], f[3][2], 2, "fa3")
  G.ellipse(22+dx, 33+b, 12, 6, "wo3"); G.ridge(22+dx, 33+b, 12, 6, "wo2", 3)
  for _,c in ipairs({{15,29},{21,28},{27,29}}) do G.ellipse(c[1]+dx, c[2]+b, 3, 2, "wo1") end
  G.ellipse(9+dx, 30+b, 2, 2, "wo2")
  G.thick(16+dx, 38+b, f[2][1], f[2][2], 3, "fa2"); G.thick(33+dx, 38+b, f[4][1], f[4][2], 3, "fa2")
  for _,p in ipairs(f) do G.rect(p[1]-1, p[2], p[1]+1, p[2], "hv") end
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(34+dx, 28+b, 4, 5, "wo2")
  G.ellipse(38+hx, 24+hy, 4, 4, "fa1"); G.rect(40+hx, 24+hy, 44+hx, 27+hy, "fa1"); G.rect(41+hx, 27+hy, 44+hx, 28+hy, "fa2")
  G.line(42+hx, 29+hy, 43+hx, 31+hy, "wo2") -- barbita
  G.thick(36+hx, 20+hy, 32+hx, 15+hy, 2, "ho2"); G.line(32+hx, 15+hy, 30+hx, 17+hy, "ho1")
  if P.pain then G.px(40+hx, 22+hy, "K") else G.px(40+hx, 22+hy, "zz2") end
  -- chispas en la punta del cuerno
  if (ph % 2 == 0) or P.cast then G.px(29+hx, 16+hy, "zz1"); G.px(30+hx, 14+hy, "zz2") end
  if P.cast then G.bolt(30+hx, 15+hy, 46, 4, ph, "zz1"); G.bolt(30+hx, 15+hy, 44, 20, ph + 1, "zz2") end
  if P.butt then G.line(46, 18+hy, 47, 16+hy, "zz1"); G.line(46, 26+hy, 47, 28+hy, "zz1") end
  return G
end

-- =====================================================================================
-- Ignivora, la Madre Salamandra (64x64, suelo en 61): salamandra enorme y vieja, cresta de llamas
-- en el lomo y la cabeza, panza que brilla como brasa
-- =====================================================================================
local function ignivora(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  if P.dead then
    G.ellipse(30,57,24,4,"sa3"); G.ridge(30,57,24,4,"sa2",2); G.ellipse(30,59,18,1,"rk2")
    G.ellipse(54,56,7,3,"sa3"); G.px(56,55,"K")
    G.thick(8,58,0,54,3,"sa4")
    for k=0,4 do G.px(12+k*9, 52, "rk1") end
    return G
  end
  -- cola gruesa ondulada con punta de fuego
  for i=0,16 do
    local x = 12 + dx - i
    local y = 50 + b - math.sin(i * 0.45 + ph) * 3 - i * 0.4
    G.ellipse(x, y, 3 - i * 0.12, 3 - i * 0.12, i < 9 and "sa2" or "sa3")
  end
  G.flame(-3 + dx, 43 + b - math.sin(16 * 0.45 + ph) * 3, 5, 2, ph)
  -- patas lejanas
  local f = P.feet or {{14,60},{24,60},{38,60},{48,60}}
  G.thick(16+dx, 50+b, f[1][1]-2, f[1][2], 4, "sa3"); G.thick(40+dx, 50+b, f[3][1]-2, f[3][2], 4, "sa3")
  -- cuerpo largo, ancho y pegado al suelo
  G.ellipse(31+dx, 48+b, 22, 8, "sa3")
  G.ellipse(31+dx, 46+b, 21, 7, "sa2"); G.ridge(31+dx, 46+b, 21, 7, "sa1", 2)
  G.ellipse(31+dx, 52+b, 16, 2, P.cast and "f2" or "sc") -- panza de brasa
  -- manchas que laten
  for i,m in ipairs({{18,44},{25,42},{33,43},{40,44}}) do G.px(m[1]+dx, m[2]+b, ((i + ph) % 2 == 0) and "f2" or "f3") end
  -- cresta de llamas en el lomo
  for i=0,4 do G.flame(17 + i * 6 + dx, 40 + b, 4 + ((i + ph) % 2) * 3, 2, ph + i) end
  -- patas cercanas con garras
  G.thick(20+dx, 52+b, f[2][1], f[2][2], 5, "sa2"); G.rect(f[2][1]-3, f[2][2], f[2][1]+3, f[2][2]+1, "sa4")
  G.thick(44+dx, 52+b, f[4][1], f[4][2], 5, "sa2"); G.rect(f[4][1]-3, f[4][2], f[4][1]+3, f[4][2]+1, "sa4")
  -- cabeza grande y chata
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(51+hx, 44+hy, 9, 6, "sa2"); G.ridge(51+hx, 44+hy, 9, 6, "sa1", 2)
  G.rect(55+hx, 45+hy, 63+hx, 48+hy, "sa2"); G.rect(56+hx, 48+hy, 62+hx, 49+hy, "sb")
  G.line(44+hx, 49+hy, 55+hx, 49+hy, "sa4") -- mandíbula: separa la cabeza del cuerpo
  G.ellipse(55+hx, 42+hy, 2.5, 2, "sa3") -- cuenca del ojo
  -- corona de llamas en la cabeza
  G.flame(47+hx, 39+hy, 5, 2, ph); G.flame(51+hx, 38+hy, 7, 2, ph + 1); G.flame(55+hx, 39+hy, 5, 2, ph)
  if P.pain then G.px(56+hx, 42+hy, "K"); G.px(57+hx, 43+hy, "K") else G.rect(56+hx, 42+hy, 57+hx, 42+hy, "f1"); G.px(56+hx, 43+hy, "f2") end
  if P.bite or P.cast then
    G.rect(57+hx, 49+hy, 63+hx, 50+hy, "r"); G.px(58+hx, 49+hy, "T"); G.px(61+hx, 49+hy, "T")
  end
  -- aliento de fuego
  if P.cast then
    for i=0,4 do G.ellipse(60+hx+i*1.2, 49+hy-i*2, 3-i*0.4, 2.5-i*0.3, i < 2 and "f3" or "f2") end
    G.px(62, 46+hy, "f1"); G.px(63, 44+hy, "f1")
    for k=0,4 do G.flame(6 + k * 11 + dx, 61, 3 + (k % 2) * 2, 1.5, ph + k) end
  end
  return G
end

-- =====================================================================================
-- Cría de Ignivora (48x48, suelo en 45): salamandra chica y viva, con una llamita en el lomo
-- =====================================================================================
local function cria(P)
  local G = newGrid(48, 48, 45)
  local dx, b = (P.dx or 0) - 2, P.bob or 0
  local ph = P.phase or 0
  if P.dead then
    G.ellipse(22,42,11,3,"sa2"); G.ridge(22,42,11,3,"sa1",1); G.ellipse(34,42,4,2,"sa2"); G.px(35,41,"K")
    G.thick(11,43,4,41,2,"sa3"); G.px(22,40,"rk1")
    return G
  end
  for i=0,9 do G.px(12+dx-i, 38+b-math.sin(i*0.7+ph)*2, i < 6 and "sa1" or "sa2"); G.px(12+dx-i, 39+b-math.sin(i*0.7+ph)*2, "sa2") end
  for _,p in ipairs({{15,41},{20,42},{27,42},{31,41}}) do G.thick(p[1]+dx, 38+b, p[1]+dx+(p[1] > 23 and 1 or -1), 44, 2, "sa2") end
  G.ellipse(23+dx, 37+b, 10, 4, "sa1"); G.ridge(23+dx, 37+b, 10, 4, "sc", 1); G.ellipse(23+dx, 40+b, 7, 1, "sb")
  G.flame(23+dx, 33+b, 4 + (ph % 2), 1.5, ph)
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(36+hx, 35+hy, 5, 3, "sa1"); G.ridge(36+hx, 35+hy, 5, 3, "sc", 1); G.rect(38+hx, 36+hy, 41+hx, 37+hy, "sb")
  if P.pain then G.px(38+hx, 33+hy, "K") else G.px(38+hx, 33+hy, "f2") end
  if P.bite or P.cast then G.rect(39+hx, 37+hy, 41+hx, 38+hy, "r") end
  if P.cast then for i=0,2 do G.ellipse(43+hx+i*1.5, 36+hy-i, 2-i*0.4, 1.6-i*0.3, i < 1 and "f3" or "f2") end end
  return G
end

-- =====================================================================================
-- Rey Pinzas, el Ermitaño Colosal (64x64, suelo en 61): un cangrejo ermitaño enorme que lleva de
-- caparazón el casco de un barco hundido, con el mástil roto, percebes y algas
-- =====================================================================================
local function reyPinzas(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  -- el agua a los pies
  G.rect(0, 61, 63, 61, "wa3"); G.rect(4, 60, 59, 60, "wa2"); for x=2,62,5 do G.px(x + (ph % 2), 59, "wa1") end
  if P.dead then
    G.ellipse(30,56,24,5,"wd2"); G.ridge(30,56,24,5,"wd1",2); G.line(14,52,34,40,"wd3"); G.px(34,40,"sl1")
    G.ellipse(52,57,7,3,"cr2"); G.px(54,55,"K"); G.ellipse(10,57,5,2,"cr3")
    return G
  end
  -- patas
  for i,x in ipairs({14,22,30,38}) do
    local k = (i + ph) % 2
    G.thick(x+dx, 48+b, x+dx-3+k*2, 56, 2, "cr2"); G.thick(x+dx-3+k*2, 56, x+dx-1+k*2, 60, 2, "cr3")
  end
  -- el casco del barco (su caparazón)
  G.ellipse(28+dx, 40+b, 22, 12, "wd2"); G.ridge(28+dx, 40+b, 22, 12, "wd1", 3)
  for y=34,50,4 do G.line(8+dx, y+b, 48+dx, y+b, "wd3") end
  G.rect(8+dx, 28+b, 48+dx, 30+b, "wd1"); G.line(8+dx, 30+b, 48+dx, 30+b, "wd3")
  for _,p in ipairs({{12,44},{20,48},{34,46},{42,40},{16,36}}) do G.ellipse(p[1]+dx, p[2]+b, 2, 1.5, "pc1"); G.px(p[1]+dx, p[2]+b, "pc2") end
  for _,x in ipairs({10,26,44}) do G.line(x+dx, 30+b, x+dx-1, 36+b, "al1"); G.px(x+dx-1, 37+b, "al2") end
  -- el mástil roto con un jirón de vela
  G.thick(24+dx, 28+b, 22+dx, 6+b, 3, "wd2"); G.line(16+dx, 12+b, 30+dx, 12+b, "wd3")
  for y=13,22 do local w = 6 - math.abs(y - 17) * 0.4; G.rect(24+dx, y+b, 24+dx+w+((ph % 2 == 0) and 1 or 0), y+b, (y % 3 == 0) and "sl2" or "sl1") end
  G.line(22+dx, 6+b, 20+dx, 3+b, "wd3")
  -- la cara: ojos en tallos y antenas
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(48+hx, 44+hy, 9, 7, "cr1"); G.ridge(48+hx, 44+hy, 9, 7, "crb", 2)
  G.line(46+hx, 38+hy, 44+hx, 31+hy, "cr2"); G.line(51+hx, 38+hy, 52+hx, 31+hy, "cr2")
  G.ellipse(44+hx, 30+hy, 2, 2, "K"); G.ellipse(52+hx, 30+hy, 2, 2, "K")
  if not P.pain then G.px(44+hx, 29+hy, "W"); G.px(52+hx, 29+hy, "W") end
  G.line(53+hx, 40+hy, 62+hx, 32+hy, "cr3"); G.line(54+hx, 42+hy, 63, 38+hy, "cr3")
  -- las pinzas: una chica y una enorme (la que cierra)
  G.thick(42+hx, 50+hy, 36+hx, 56+hy, 3, "cr2"); G.ellipse(34+hx, 56+hy, 4, 3, "cr1")
  local open = P.snap and 0 or 4
  G.thick(54+hx, 50+hy, 58+hx, 54+hy, 4, "cr2")
  G.ellipse(58+hx, 48+hy - open * 0.5, 6, 4, "cr1"); G.ridge(58+hx, 48+hy - open * 0.5, 6, 4, "crb", 1)
  G.ellipse(58+hx, 56+hy, 6, 3, "cr2")
  if P.snap then for k=0,3 do G.px(62, 50+hy+k*2, "W") end end
  if P.cast then for i=0,5 do G.ellipse(10+dx+i*8, 20+b-math.sin(i+ph)*4, 3, 2, i % 2 == 0 and "wa1" or "wa2") end end
  return G
end

-- =====================================================================================
-- Cangrejo Ermitaño (48x48, suelo en 45): un cangrejo rojo que vive en una caracola
-- =====================================================================================
local function ermitano(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.rect(0, 45, 47, 45, "wa3"); G.rect(4, 44, 43, 44, "wa2")
  if P.dead then
    G.ellipse(20,41,11,4,"cc2"); G.ridge(20,41,11,4,"cc1",1); G.ellipse(34,42,4,2,"cr2"); G.px(35,40,"K")
    return G
  end
  for i,x in ipairs({20,26,31}) do local k = (i + ph) % 2; G.thick(x+dx, 38+b, x+dx-2+k*2, 44, 2, "cr2") end
  -- la caracola en espiral
  G.ellipse(18+dx, 32+b, 12, 10, "cc2"); G.ridge(18+dx, 32+b, 12, 10, "cc1", 2)
  G.ellipse(16+dx, 30+b, 7, 6, "cc1"); G.ellipse(15+dx, 29+b, 4, 3, "cc2"); G.ellipse(14+dx, 28+b, 2, 2, "cc3")
  G.line(8+dx, 38+b, 4+dx, 42+b, "cc3"); G.px(4+dx, 42+b, "cc1")
  -- el cangrejo asomando
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 36+hy, 6, 5, "cr1"); G.ridge(31+hx, 36+hy, 6, 5, "crb", 1)
  G.line(30+hx, 32+hy, 29+hx, 27+hy, "cr2"); G.line(34+hx, 32+hy, 35+hx, 27+hy, "cr2")
  G.px(29+hx, 26+hy, "K"); G.px(35+hx, 26+hy, "K")
  if not P.pain then G.px(29+hx, 25+hy, "W"); G.px(35+hx, 25+hy, "W") end
  local open = P.snap and 0 or 2
  G.thick(36+hx, 38+hy, 40+hx, 40+hy, 2, "cr2"); G.ellipse(42+hx, 38+hy - open, 4, 2, "cr1"); G.ellipse(42+hx, 41+hy, 4, 2, "cr2")
  if P.cast then G.ellipse(18+dx, 32+b, 13, 11, "cc3"); G.ridge(18+dx, 32+b, 13, 11, "cc2", 2) end
  return G
end

-- =====================================================================================
local MONSTERS = {
  {key="mitico_truenocuerno", size=64, draw=truenocuerno, anims={
    {"idle",   {{bob=0,phase=0,dur=500},{bob=1,phase=1,dur=500}}},
    {"attack", {{bob=1,hx=-2,hy=2,phase=0,dur=300},{dx=5,hy=4,charge=true,feet={{10,60},{18,60},{46,59},{52,58}},phase=1,dur=170},{dx=2,phase=0,dur=300}}},
    {"cast",   {{bob=-1,hy=-2,phase=0,dur=240},{cast=true,phase=1,dur=340},{cast=true,phase=0,dur=260}}},
    {"hurt",   {{dx=-3,hy=-2,pain=true,phase=1,dur=300}}},
    {"die",    {{bob=4,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="cabra_tronadora", size=48, draw=cabra, anims={
    {"idle",   {{bob=0,phase=0,dur=400},{bob=1,phase=1,dur=400}}},
    {"attack", {{bob=1,hx=-2,hy=2,dur=200},{dx=4,hy=3,butt=true,feet={{9,44},{14,44},{32,43},{37,42}},dur=130},{dx=1,dur=220}}},
    {"cast",   {{bob=-1,phase=0,dur=200},{cast=true,phase=1,dur=300},{cast=true,phase=0,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=2,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="mitico_ignivora", size=64, draw=ignivora, anims={
    {"idle",   {{bob=0,phase=0,dur=500},{bob=1,phase=1,dur=500}}},
    {"attack", {{bob=0,hx=-2,phase=0,dur=300},{dx=4,bite=true,feet={{12,60},{20,60},{42,60},{52,59}},phase=1,dur=160},{dx=1,phase=0,dur=300}}},
    {"cast",   {{bob=-1,hx=-1,hy=-1,phase=0,dur=240},{cast=true,phase=1,dur=340},{cast=true,phase=0,dur=260}}},
    {"hurt",   {{dx=-3,hy=-1,pain=true,phase=1,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="cria_ignivora", size=48, draw=cria, anims={
    {"idle",   {{bob=0,phase=0,dur=380},{bob=1,phase=1,dur=380}}},
    {"attack", {{bob=0,hx=-2,dur=200},{dx=3,bite=true,phase=1,dur=140},{dx=1,dur=220}}},
    {"cast",   {{bob=0,hx=-1,dur=200},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=1,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
  {key="mitico_rey_pinzas", size=64, draw=reyPinzas, anims={
    {"idle",   {{bob=0,phase=0,dur=520},{bob=1,phase=1,dur=520}}},
    {"attack", {{bob=0,hx=-2,phase=0,dur=300},{dx=4,snap=true,phase=1,dur=160},{dx=1,phase=0,dur=300}}},
    {"cast",   {{bob=-1,hx=-1,phase=0,dur=240},{cast=true,phase=1,dur=340},{cast=true,phase=0,dur=260}}},
    {"hurt",   {{dx=-3,hy=-1,pain=true,phase=1,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
  }},
  {key="cangrejo_ermitano", size=48, draw=ermitano, anims={
    {"idle",   {{bob=0,phase=0,dur=400},{bob=1,phase=1,dur=400}}},
    {"attack", {{bob=0,hx=-2,dur=200},{dx=3,snap=true,phase=1,dur=140},{dx=1,dur=220}}},
    {"cast",   {{bob=1,hx=-3,dur=200},{cast=true,hx=-5,phase=0,dur=300},{cast=true,hx=-5,phase=1,dur=220}}},
    {"hurt",   {{dx=-2,hy=-1,pain=true,dur=250}}},
    {"die",    {{bob=1,pain=true,dur=200},{dead=true,dur=1000}}},
  }},
}

local dir, png = app.params.dir, app.params.png
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
  spr:saveAs(dir .. "/miticos/" .. m.key .. ".aseprite")
  spr:close()
  local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
  for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
  local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
  out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
  out:saveCopyAs(png .. "/" .. m.key .. ".png")
  out:close()
  manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
end
local fh = io.open(dir .. "/miticos.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
