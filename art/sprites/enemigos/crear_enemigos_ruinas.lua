-- Enemigos de las Ruinas Ancestrales (zona 7, nivel 86-100): uno o dos propios por subzona.
--   peregrino_piedra          Peregrino de Piedra (Puerta del Velo, Escalinata)
--   grifo_templo              Grifo del Templo (Campo de los Vigías, Cantera)
--   guardian_ruinas           Guardián de Ruinas (Cantera, Escalinata)
--   serpiente_lagrimas        Serpiente de Lágrimas (Lago, Jardines)
--   centinela_antiguo         Centinela Antiguo (Bosque Petrificado, Patio)
--   heraldo_olvidado          Heraldo Olvidado (Cripta de los Heraldos)
--   guardian_fuego_ancestral  Guardián Elemental de Fuego (Patio de las Estatuas)
--   guardian_agua_ancestral   Guardián Elemental de Agua (Lago de las Lágrimas)
--   guardian_hielo_ancestral  Guardián Elemental de Hielo (Jardines de las Lágrimas)
--   estrella_caida            Estrella Caída (Torres del Velo, Observatorio)
--   engendro_devorador        Engendro del Devorador (Templo Sagrado, Grieta)
--   ojo_errante               Ojo Errante (Grieta Estelar)
--   coloso_marmol             Coloso de Mármol, raro, 56x56
--   avatar_eclipse            Avatar del Eclipse, raro, 56x56
--   guardian_ancestral        Guardián Ancestral Primordial, minijefe, 64x64
--   entidad_corrupta_templo   Entidad Corrupta del Templo, minijefe, 64x64
--   centinela_cosmico         Centinela Cósmico, minijefe, 64x64
--   gran_esqueleto_abismo     Gran Esqueleto del Abismo, jefe legendario, 64x64
-- y los del Observatorio Roto (la mazmorra, tanda 5):
--   observ_astronomo          Astrónomo Fantasma, guardián, 48x48
--   observ_automata           Autómata del Cielo, guardián, 48x48
--   observ_constelacion       Constelación Viva, guardián, 48x48
--   observ_ojo                Ojo del Devorador, jefe de la mazmorra, 64x64
-- y el del final (la R13, tanda 7):
--   sombra_devorador          La Sombra del Devorador, 64x64
-- Mismo estilo que crear_enemigos_catacumbas.lua: se dibujan mirando a la derecha, contorno oscuro
-- automático y se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), zona7/<clave>.aseprite y
-- enemigos_ruinas.json con las animaciones para enemigos.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_ruinas.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8", R="c0343a", r="7a1f2a", go1="ffe08a", go2="c89a2a", go3="8a6a20",
  -- el suelo de mármol de las Ruinas
  gr1="dfd8c8", gr2="c2b9a6", gr3="978e7c",
  -- mármol y piedra de los peregrinos, guardianes y colosos
  mb1="f4f0e6", mb2="dfd8c8", mb3="c2b9a6", mb4="978e7c", mb5="6c6656",
  st1="b0aca4", st2="8a8680", st3="5e5a56", st4="3c3a38",
  -- runas y la luz de las lágrimas (brillan)
  lg1="e0f8ff", lg2="a6e2f4", lg3="64bcde", lg4="3490be",
  -- grifo: plumas blancas, pelo leonado, pico dorado
  gp1="f6f2ea", gp2="d8ccb8", gp3="a8987c", gl1="d8a868", gl2="a8783e", gl3="6e4a24",
  -- espectros (brillan) y su trompeta
  gh1="fff8e0", gh2="f0dca0", gh3="b89a5a",
  -- fuego, hielo y agua de los elementales
  f1="fff4b0", f2="ffb040", f3="e05a1a", f4="8a2414",
  i1="ffffff", i2="b4e4ff", i3="6aa8e0", i4="3a6aa8",
  w1="e0f8ff", w2="7ad0f0", w3="3a90c8", w4="1c5488",
  -- el cielo estelar y el Devorador
  cz1="9a8ae0", cz2="4c3c94", cz3="2e2a66", cz4="1e1a44", sr="fff8c0",
  ec1="e2a6ff", ec2="8a50d8", ne1="3a3644", ne2="26222e", ne3="18161e",
  -- hueso del Gran Esqueleto y su manto de Vigía
  hu1="ece4cc", hu2="c6ba9a", hu3="8c7e66", vb1="4a6a9a", vb2="2e4a72",
  -- bronce viejo de los autómatas del Observatorio y su verdín
  bz1="e8d098", bz2="c0a060", bz3="8a7040", vd1="7ae0c8", vd2="2e9c8a",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, lg1=true, lg2=true, f1=true, f2=true, i1=true, sr=true, ec1=true, gh1=true, go1=true, w1=true}

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
-- losas de mármol bajo los pies
local function floor(G, x0, x1, y) G.rect(x0, y, x1, y, "gr3"); G.rect(x0 + 2, y - 1, x1 - 2, y - 1, "gr2") end
local function skull(G, x, y, s, pain, glow)
  s = s or 1
  G.ellipse(x + 4*s, y + 3*s, 4*s, 3.5*s, "hu1"); G.rect(x + 2*s, y + 5*s, x + 7*s, y + 8*s, "hu1"); G.ridge(x + 4*s, y + 3*s, 4*s, 3.5*s, "W", 1)
  G.rect(x + 2*s, y + 8*s, x + 7*s, y + 8*s, "hu2")
  if pain then G.px(x + 5*s, y + 4*s, "K"); G.px(x + 6*s, y + 4*s, "K")
  else G.ellipse(x + 5.5*s, y + 4*s, s, s, glow or "K") end
  G.px(x + 7*s, y + 6*s, "K")
  for i=0,2 do G.px(x + 3*s + i*s, y + 7*s, "hu3") end
end
local function boneLine(G, x0, y0, x1, y1, w)
  G.thick(x0, y0, x1, y1, w or 2, "hu1"); G.ellipse(x0, y0, 1.5, 1.5, "hu1"); G.ellipse(x1, y1, 1.5, 1.5, "hu1")
end
-- una runa aethrina que brilla (tres trazos)
local function rune(G, x, y, c)
  G.line(x, y, x, y + 4, c or "lg2"); G.line(x, y + 2, x + 2, y, c or "lg2"); G.line(x, y + 2, x + 2, y + 4, c or "lg2")
end
-- estrellitas (brillan)
local function stars(G, pts, ph)
  for i, p in ipairs(pts) do
    local on = ((i + (ph or 0)) % 2) == 0
    G.px(p[1], p[2], "sr"); if on then G.px(p[1] - 1, p[2], "sr"); G.px(p[1] + 1, p[2], "sr"); G.px(p[1], p[2] - 1, "sr"); G.px(p[1], p[2] + 1, "sr") end
  end
end

-- =====================================================================================
-- Peregrino de Piedra (48x48): encapuchado de piedra con bastón, grietas por donde se ve la luz
-- =====================================================================================
local function peregrino(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.ellipse(22,42,14,3,"st2"); G.ellipse(18,40,6,3,"st1"); G.ellipse(30,41,5,3,"st3"); G.px(24,40,"lg2"); G.line(34,44,44,38,"st3"); return G end
  -- manto largo
  for y=14,44 do local half = 5 + math.floor((y - 14) * 0.32); G.rect(22+dx-half, math.min(44, y+b), 22+dx+half, math.min(44, y+b), (y // 5) % 2 == 0 and "st1" or "st2") end
  G.rect(14+dx, 40, 30+dx, 44, "st3")
  -- grietas con luz
  G.line(18+dx, 24+b, 22+dx, 32+b, "st4"); G.line(22+dx, 32+b, 20+dx, 38+b, "st4"); G.px(21+dx, 30+b, "lg2"); G.line(26+dx, 20+b, 28+dx, 27+b, "st4"); G.px(27+dx, 24+b, "lg1")
  -- capucha y cara de piedra
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(23+hx, 10+hy, 8, 8, "st2"); G.ellipse(25+hx, 11+hy, 5, 5, "st4")
  eye(G, 26+hx, 11+hy, "lg2", P.pain); eye(G, 28+hx, 11+hy, "lg2", P.pain)
  -- bastón de piedra (golpe) y la mano
  if P.swing then G.thick(28+dx, 20+b, 46+dx, 30+b, 3, "st3"); G.ellipse(46+dx, 30+b, 3, 3, "st1"); G.ellipse(30+dx, 20+b, 3, 3, "st1")
  else G.thick(33+dx, 6+b, 33+dx, 44, 3, "st3"); G.ellipse(33+dx, 5+b, 3, 3, "st1"); G.ellipse(31+dx, 22+b, 3, 3, "st1") end
  if P.shell then for _,p in ipairs({{6,18},{40,14},{8,34},{42,34}}) do G.rect(p[1]+dx, p[2]+b, p[1]+dx+3, p[2]+b+3, "st2") end end
  return G
end

-- =====================================================================================
-- Grifo del Templo (48x48): águila blanca con cuerpo de león, alas abiertas, pico dorado
-- =====================================================================================
local function grifo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.ellipse(22,41,14,4,"gl2"); G.ellipse(30,39,7,4,"gp2"); G.line(6,44,20,40,"gp1"); G.px(36,38,"go2"); return G end
  -- cola y patas de león
  G.line(8+dx, 30+b, 2+dx, 22+b, "gl2"); G.ellipse(2+dx, 21+b, 2, 2, "gl3")
  for i, x in ipairs({12, 17, 28, 32}) do local k = (i + (P.phase or 0)) % 2; G.thick(x+dx, 32+b, x+dx + (k == 0 and -1 or 1), 44, 3, i > 2 and "go2" or "gl2") end
  G.ellipse(20+dx, 30+b, 12, 7, "gl1"); G.ridge(20+dx, 30+b, 12, 7, "gl2", 2)
  -- alas: arriba o abajo
  local up = (P.phase or 0) % 2 == 0
  if up then for i=0,5 do G.thick(18+dx + i * 2, 24+b, 8+dx + i * 3, 4+b + i, 2, i % 2 == 0 and "gp1" or "gp2") end
  else for i=0,5 do G.thick(18+dx + i * 2, 26+b, 4+dx + i * 3, 30+b - i, 2, i % 2 == 0 and "gp1" or "gp2") end end
  -- pecho y cabeza de águila
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+dx, 25+b, 6, 7, "gp1"); G.ellipse(35+hx, 15+hy, 6, 6, "gp1"); G.ellipse(33+hx, 12+hy, 3, 2, "gp2")
  G.rect(40+hx, 14+hy, 45+hx, 17+hy, "go2"); G.px(45+hx, 18+hy, "go3"); G.px(41+hx, 14+hy, "go1")
  eye(G, 37+hx, 13+hy, "K", P.pain)
  if P.bite then for i=0,3 do G.line(40+hx + i, 22+hy, 46+hx, 30+hy - i, "gp2") end end
  if P.cast then for _,r in ipairs({6, 9}) do G.ellipse(44+hx, 16+hy, r, r - 2, "gp2"); G.ellipse(44+hx, 16+hy, r - 1, r - 3, "W") end end
  return G
end

-- =====================================================================================
-- Guardián de Ruinas (48x48): coloso de bloques de piedra con runas, puños grandes
-- =====================================================================================
local function guardianRuinas(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then for _,p in ipairs({{6,38,8,6},{18,40,10,5},{32,39,7,6}}) do G.rect(p[1], p[2], p[1] + p[3], p[2] + p[4], "st2") end; G.px(23,41,"lg2"); return G end
  local k = P.phase or 0
  G.rect(14+dx-k, 34+b, 20+dx-k, 44, "st3"); G.rect(26+dx+k, 34+b, 32+dx+k, 44, "st3")
  G.rect(12+dx, 16+b, 34+dx, 35+b, "st2"); G.rect(12+dx, 16+b, 34+dx, 18+b, "st1"); G.rect(32+dx, 16+b, 34+dx, 35+b, "st3")
  G.line(12+dx, 26+b, 34+dx, 26+b, "st3"); rune(G, 21+dx, 20+b); rune(G, 25+dx, 28+b, "lg3")
  -- cabeza chica de bloque
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(18+hx, 6+hy, 30+hx, 15+hy, "st1"); G.rect(28+hx, 6+hy, 30+hx, 15+hy, "st2")
  G.rect(24+hx, 10+hy, 29+hx, 11+hy, P.pain and "K" or "lg2")
  -- brazos: el de atrás y el puño del golpe
  G.rect(6+dx, 18+b, 11+dx, 34+b, "st2"); G.rect(4+dx, 32+b, 12+dx, 38+b, "st1")
  if P.swing then G.rect(34+dx, 18+b, 46+dx, 24+b, "st2"); G.rect(40+dx, 16+b, 47+dx, 26+b, "st1")
  else G.rect(35+dx, 18+b, 40+dx, 34+b, "st2"); G.rect(34+dx, 32+b, 42+dx, 38+b, "st1") end
  if P.shell then for _,p in ipairs({{4,10},{40,8},{2,40}}) do G.rect(p[1]+dx, p[2]+b, p[1]+dx+4, p[2]+b+4, "st1"); rune(G, p[1]+dx+1, p[2]+b) end end
  return G
end

-- =====================================================================================
-- Serpiente de Lágrimas (48x48): serpiente transparente celeste, enroscada, que escupe agua
-- =====================================================================================
local function serpiente(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  floor(G, 4, 44, 45)
  if P.dead then for i=0,16 do G.ellipse(8 + i * 2, 42 - (i % 3), 3, 2, i % 2 == 0 and "lg3" or "lg2") end; G.ellipse(42,40,4,3,"lg2"); return G end
  -- el cuerpo enroscado
  for i=0,22 do
    local t = i / 22
    local x = 12 + dx + math.cos(t * 6 + ph) * (10 - t * 4)
    local y = 42 - t * 22 + b
    G.ellipse(x, y, 5 - t * 2, 4 - t * 1.5, i % 3 == 0 and "lg3" or "lg2")
    if i % 4 == 0 then G.px(x, y - 1, "lg1") end
  end
  -- cuello y cabeza
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(14+dx, 20+b, 28+hx, 12+hy, 4, "lg2"); G.ellipse(31+hx, 11+hy, 6, 4, "lg2"); G.ellipse(33+hx, 10+hy, 3, 2, "lg1")
  G.rect(34+hx, 12+hy, 38+hx, 13+hy, "lg4")
  eye(G, 33+hx, 9+hy, "K", P.pain)
  if P.cast then for i=0,10 do G.ellipse(38+hx + i, 12+hy + (i % 2), 1.5, 1.5, i % 2 == 0 and "w1" or "lg2") end end
  if P.bite then G.rect(34+hx, 13+hy, 40+hx, 15+hy, "lg4"); G.px(36+hx, 14+hy, "W"); G.px(38+hx, 14+hy, "W") end
  return G
end

-- =====================================================================================
-- Centinela Antiguo (48x48): autómata de oro y bronce, un brazo de lanza, ojo de rayo
-- =====================================================================================
local function centinela(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.rect(8,38,30,44,"go3"); G.ellipse(34,40,6,4,"go2"); G.ellipse(18,40,3,3,"go1"); G.line(2,46,44,34,"st2"); return G end
  local k = P.phase or 0
  G.thick(18+dx, 32+b, 16+dx-k, 44, 3, "go3"); G.thick(26+dx, 32+b, 28+dx+k, 44, 3, "go3")
  -- torso de engranajes
  G.rect(14+dx, 16+b, 32+dx, 32+b, "go2"); G.rect(14+dx, 16+b, 32+dx, 18+b, "go1"); G.rect(30+dx, 16+b, 32+dx, 32+b, "go3")
  G.ellipse(23+dx, 24+b, 5, 5, "go3"); G.ellipse(23+dx, 24+b, 3, 3, "lg2"); G.px(23+dx, 24+b, "W")
  -- cabeza con un solo ojo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(18+hx, 6+hy, 30+hx, 15+hy, "go2"); G.rect(18+hx, 6+hy, 30+hx, 7+hy, "go1"); G.rect(20+hx, 3+hy, 21+hx, 6+hy, "go3")
  if P.pain then G.rect(25+hx, 10+hy, 28+hx, 11+hy, "K") else G.ellipse(26+hx, 10+hy, 2, 2, "lg1") end
  -- le falta un brazo (cables sueltos) y el otro es una lanza
  G.line(14+dx, 18+b, 9+dx, 24+b, "go3"); G.px(8+dx, 25+b, "lg2")
  if P.swing then G.thick(32+dx, 20+b, 47+dx, 18+b, 2, "go3"); G.line(40+dx, 15+b, 47+dx, 18+b, "go1"); G.line(40+dx, 21+b, 47+dx, 18+b, "go1")
  else G.thick(36+dx, 2+b, 36+dx, 44, 2, "go3"); G.line(33+dx, 6+b, 36+dx, 0+b, "go1"); G.line(39+dx, 6+b, 36+dx, 0+b, "go1"); G.rect(32+dx, 20+b, 36+dx, 23+b, "go2") end
  if P.cast then for i=0,6 do G.px(38+dx + (i % 2) * 3, 2+b + i * 4, "lg1"); G.px(39+dx + (i % 2) * 3, 3+b + i * 4, "sr") end end
  return G
end

-- =====================================================================================
-- Heraldo Olvidado (48x48): espectro dorado con capa larga y una trompeta rota
-- =====================================================================================
local function heraldo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  if P.dead then G.ellipse(24,42,10,2,"gh2"); G.rect(28,40,38,42,"go2"); G.ellipse(38,41,3,2,"go2"); return G end
  for y=26,42 do local w = math.floor(9 - (y - 26) * 0.5); local o = math.floor(math.sin(y / 3 + ph) * 2); G.rect(22+dx-w+o, y+b, 22+dx+w+o, y+b, (y % 4 == 0) and "gh3" or "gh2") end
  G.ellipse(22+dx, 20+b, 10, 10, "gh2"); G.ridge(22+dx, 20+b, 10, 10, "gh1", 3)
  -- tabardo con el sol de Aethra
  G.rect(17+dx, 16+b, 27+dx, 30+b, "vb1"); G.ellipse(22+dx, 22+b, 3, 3, "go1")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 9+hy, 6, 6, "gh1"); G.rect(19+hx, 3+hy, 29+hx, 5+hy, "vb2"); G.px(29+hx, 3+hy, "go1")
  eye(G, 25+hx, 9+hy, "lg3", P.pain); eye(G, 28+hx, 9+hy, "lg3", P.pain)
  -- la trompeta: a la boca o levantada
  if P.cast then
    G.thick(30+hx, 11+hy, 44+hx, 4+hy, 2, "go2"); G.ellipse(45+hx, 3+hy, 3, 4, "go1")
    for _,r in ipairs({6, 10}) do for a=-60,60,15 do G.px(45+hx + math.cos(math.rad(a)) * r, 3+hy + math.sin(math.rad(a)) * r, "gh1") end end
  else G.thick(30+dx, 22+b, 42+dx, 22+b, 2, "go2"); G.ellipse(43+dx, 22+b, 2, 3, "go1"); G.px(36+dx, 21+b, "go3") end
  return G
end

-- =====================================================================================
-- Guardianes Elementales (48x48): una armadura de oro hueca con la máscara aethrina; adentro, su elemento
-- =====================================================================================
local function elementalOf(c1, c2, c3, shards)
  return function(P)
    local G = newGrid(48, 48, 45)
    local dx, b = P.dx or 0, P.bob or 0
    local ph = P.phase or 0
    floor(G, 6, 42, 45)
    if P.dead then G.ellipse(22,42,10,3,c3); G.ellipse(20,39,6,4,"go2"); G.ellipse(30,40,4,3,"go3"); G.px(22,38,c1); return G end
    -- el elemento sale de la armadura y flota
    for i=0,10 do local t = i / 10; G.ellipse(22+dx + math.sin(t * 6 + ph) * 3, 42 - t * 12 + b, 6 - t * 3, 3, i % 2 == 0 and c2 or c3) end
    -- armadura: hombreras y peto de oro, hueca
    G.rect(13+dx, 14+b, 31+dx, 30+b, c3); G.rect(15+dx, 16+b, 29+dx, 28+b, c2); G.ellipse(22+dx, 22+b, 5, 5, c1)
    G.rect(13+dx, 14+b, 31+dx, 15+b, "go2"); G.rect(13+dx, 14+b, 15+dx, 30+b, "go2"); G.rect(29+dx, 14+b, 31+dx, 30+b, "go2")
    G.ellipse(11+dx, 15+b, 4, 3, "go1"); G.ellipse(33+dx, 15+b, 4, 3, "go1")
    -- la máscara aethrina
    local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
    G.ellipse(23+hx, 8+hy, 6, 6, c2); G.ellipse(24+hx, 8+hy, 5, 5, "go1"); G.rect(21+hx, 10+hy, 27+hx, 11+hy, "go2")
    eye(G, 24+hx, 7+hy, c1, P.pain); eye(G, 27+hx, 7+hy, c1, P.pain)
    for i=0,4 do G.px(19+hx + i * 2, 1+hy - (i % 2), c1) end
    -- manos de elemento
    G.ellipse(8+dx, 26+b, 3, 3, c2)
    if P.swing or P.cast then for i=0,4 do G.ellipse(36+dx + i * 2, 20+b - i, 3 - i * 0.4, 3 - i * 0.4, i % 2 == 0 and c1 or c2) end
      for _,p in ipairs({{44,10},{40,4},{46,20}}) do G.px(p[1]+dx, p[2]+b, c1) end
    else G.ellipse(36+dx, 26+b, 3, 3, c2) end
    G.px(22+dx, 22+b, "W")
    -- el de hielo: puntas de hielo que le salen de la armadura y de la máscara
    if shards then
      for _,p in ipairs({{12,12,-1},{32,12,1},{18,1,-1},{28,1,1}}) do
        local x, y, sgn = p[1] + dx + (P.hx or 0) * (p[2] < 5 and 1 or 0), p[2] + b, p[3]
        for i=0,5 do G.rect(x + sgn * i // 2, y - i, x + sgn * i // 2 + 1, y - i, i < 3 and "i2" or "i1") end
      end
    end
    return G
  end
end
local guardianFuego = elementalOf("f1", "f2", "f3", false)
local guardianAgua = elementalOf("w2", "w3", "w4", false)
local guardianHielo = elementalOf("i1", "i2", "i3", true)

-- =====================================================================================
-- Estrella Caída (48x48): una estrella de cinco puntas con carita enojada que flota y quema
-- =====================================================================================
local function estrella(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.ellipse(24, 45, 10, 2, "gr3")
  if P.dead then G.ellipse(24,42,8,2,"go3"); G.ellipse(24,41,4,2,"go2"); stars(G, {{14,38},{34,36},{24,32}}, 0); return G end
  local cx, cy = 24 + dx, 22 + b
  local rot = ph * 0.2
  for i=0,4 do
    local a = rot + i * math.pi * 2 / 5 - math.pi / 2
    for r=0,16 do local w = 5 * (1 - r / 16); G.ellipse(cx + math.cos(a) * r, cy + math.sin(a) * r, w + 0.5, w + 0.5, r < 9 and "go1" or "go2") end
  end
  G.ellipse(cx, cy, 8, 8, "go1"); G.ellipse(cx, cy, 6, 6, "sr")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  -- carita enojada
  G.line(cx - 4 + (P.hx or 0), cy - 4 + (P.hy or 0), cx - 1 + (P.hx or 0), cy - 2 + (P.hy or 0), "go3"); G.line(cx + 4 + (P.hx or 0), cy - 4 + (P.hy or 0), cx + 1 + (P.hx or 0), cy - 2 + (P.hy or 0), "go3")
  eye(G, cx - 3 + (P.hx or 0), cy - 1 + (P.hy or 0), "K", P.pain); eye(G, cx + 2 + (P.hx or 0), cy - 1 + (P.hy or 0), "K", P.pain)
  G.line(cx - 2 + (P.hx or 0), cy + 3 + (P.hy or 0), cx + 2 + (P.hx or 0), cy + 3 + (P.hy or 0), "go3")
  stars(G, {{6,8},{40,6},{8,34},{42,30},{24,2}}, ph)
  if P.cast then for i=0,6 do local a = i * math.pi / 3.5; G.line(cx + math.cos(a) * 18, cy + math.sin(a) * 18, cx + math.cos(a) * 23, cy + math.sin(a) * 23, "f2") end end
  if P.swing then for i=0,4 do G.ellipse(cx + 18 + i * 2, cy + i, 2 - i * 0.3, 2 - i * 0.3, "f1") end end
  return G
end

-- =====================================================================================
-- Engendro del Devorador (48x48): una masa de oscuridad con estrellas adentro, muchos brazos y dientes
-- =====================================================================================
local function engendro(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  floor(G, 4, 44, 45)
  if P.dead then G.ellipse(22,42,16,3,"ne2"); stars(G, {{12,40},{26,41},{34,39}}, 0); G.ellipse(22,40,6,2,"cz3"); return G end
  -- brazos (tentáculos) que se retuercen
  for i=0,5 do
    local base = 8 + i * 6
    for t=0,10 do local x = base + dx + math.sin(t / 2 + ph + i) * 3; local y = 44 - t * 1.5 + b; G.ellipse(x, y, 2, 1.5, t % 3 == 0 and "ne1" or "ne2") end
  end
  G.ellipse(23+dx, 24+b, 15, 13, "ne2"); G.ellipse(21+dx, 21+b, 11, 9, "cz4")
  stars(G, {{16+dx, 18+b}, {24+dx, 15+b}, {14+dx, 28+b}, {28+dx, 26+b}}, ph)
  -- la boca de dientes
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(33+hx, 24+hy, 7, 5, P.bite and "R" or "r"); for x=28,38,3 do G.line(x+hx, 20+hy, x+hx+1, 23+hy, "hu1"); G.line(x+hx, 28+hy, x+hx+1, 25+hy, "hu1") end
  eye(G, 30+hx, 15+hy, "ec1", P.pain); eye(G, 35+hx, 16+hy, "ec1", P.pain); eye(G, 25+hx, 13+hy, "ec1", P.pain)
  if P.bite then for i=0,4 do G.thick(36+dx, 18+b + i * 4, 47+dx, 14+b + i * 5, 2, "ne1") end end
  return G
end

-- =====================================================================================
-- Ojo Errante (48x48): un ojo enorme que flota, con párpados de piedra rota y un iris morado
-- =====================================================================================
local function ojo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.ellipse(24, 45, 12, 2, "gr3")
  if P.dead then G.ellipse(24,41,11,4,"W"); G.ellipse(24,41,5,3,"ec2"); G.line(14,38,34,44,"K"); return G end
  local cx, cy = 24 + dx, 21 + b
  G.ellipse(cx, cy, 15, 13, "ne1"); G.ellipse(cx, cy, 13, 11, "W"); G.ellipse(cx, cy, 13, 11, "i1")
  for i=0,8 do local a = i * 0.7; G.line(cx + math.cos(a) * 6, cy + math.sin(a) * 5, cx + math.cos(a) * 12, cy + math.sin(a) * 10, "R") end
  local lx, ly = (P.hx or 0) + 3, (P.hy or 0)
  G.ellipse(cx + lx, cy + ly, 7, 7, P.cast and "ec1" or "ec2"); G.ellipse(cx + lx, cy + ly, 3, 4, "ne3"); G.px(cx + lx - 2, cy + ly - 3, "W")
  if P.pain then G.rect(cx - 13, cy - 2, cx + 13, cy + 2, "st3"); G.line(cx - 13, cy, cx + 13, cy, "K") end
  -- párpados de piedra rota y pedazos que orbitan
  G.ridge(cx, cy, 15, 13, "st2", 3)
  for i=0,3 do local a = ph * 0.5 + i * math.pi / 2; G.rect(cx + math.cos(a) * 20, cy + math.sin(a) * 14, cx + math.cos(a) * 20 + 2, cy + math.sin(a) * 14 + 2, "st3") end
  if P.cast then for _,r in ipairs({17, 20}) do for a=0,359,12 do G.px(cx + math.cos(math.rad(a)) * r, cy + math.sin(math.rad(a)) * (r - 3), "ec2") end end end
  return G
end

-- =====================================================================================
-- Coloso de Mármol (56x56, raro): una estatua de Aethra a medio tallar, la cara lisa sin terminar
-- =====================================================================================
local function coloso(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 52, 53)
  if P.dead then for _,p in ipairs({{6,46,10,7},{18,48,12,5},{34,46,10,7},{44,49,6,4}}) do G.rect(p[1], p[2], p[1] + p[3], p[2] + p[4], "mb2") end; G.ellipse(30,44,5,4,"mb1"); return G end
  -- la base sin tallar (bloque) y el manto que empieza a salir
  G.rect(12+dx, 38+b, 42+dx, 52, "mb3"); G.rect(12+dx, 38+b, 42+dx, 40+b, "mb2"); for x=14,40,6 do G.line(x+dx, 41+b, x+dx+3, 52, "mb4") end
  for y=16,38 do local half = 7 + math.floor((y - 16) * 0.35); G.rect(27+dx-half, y+b, 27+dx+half, y+b, (y % 5 == 0) and "mb2" or "mb1") end
  -- el corazón de mármol que late
  G.ellipse(27+dx, 26+b, 3, 3, P.cast and "lg1" or "mb3")
  -- brazos de piedra, uno con un bloque en la mano
  G.rect(10+dx, 18+b, 15+dx, 34+b, "mb2"); G.rect(7+dx, 32+b, 16+dx, 38+b, "mb3")
  if P.slam then G.rect(38+dx, 18+b, 50+dx, 24+b, "mb2"); G.rect(46+dx, 24+b, 55+dx, 34+b, "mb3"); for i=0,4 do G.line(40+dx+i*3, 52, 42+dx+i*3, 47, "mb4") end
  else G.rect(39+dx, 18+b, 44+dx, 32+b, "mb2"); G.rect(37+dx, 30+b, 47+dx, 38+b, "mb3") end
  -- la cabeza con el pelo tallado y la cara lisa, sin terminar
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(28+hx, 9+hy, 8, 9, "mb1"); G.rect(19+hx, 8+hy, 21+hx, 22+hy, "mb2"); G.rect(35+hx, 8+hy, 37+hx, 22+hy, "mb2")
  G.ellipse(30+hx, 10+hy, 5, 6, "mb2"); G.line(27+hx, 6+hy, 33+hx, 14+hy, "mb3")
  if P.pain then G.line(26+hx, 9+hy, 34+hx, 11+hy, "K") end
  if P.shell then for _,p in ipairs({{4,10},{48,8},{2,40},{50,40}}) do G.rect(p[1]+dx, p[2]+b, p[1]+dx+4, p[2]+b+4, "mb3") end end
  return G
end

-- =====================================================================================
-- Avatar del Eclipse (56x56, raro): figura alta y flaca hecha de cielo nocturno, con un eclipse por cara
-- =====================================================================================
local function avatar(P)
  local G = newGrid(56, 56, 53)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.ellipse(28, 53, 16, 2, "gr3")
  if P.dead then G.ellipse(28,49,16,3,"cz3"); stars(G, {{16,46},{30,47},{40,45}}, 0); G.ellipse(28,46,5,5,"ne3"); G.ridge(28,46,5,5,"go1",1); return G end
  local fl = -3
  for y=18,50 do local half = 4 + math.floor((y - 18) * 0.38); local o = math.floor(math.sin(y / 4 + ph) * 1.5); G.rect(28+dx-half+o, y+b+fl, 28+dx+half+o, y+b+fl, (y // 6) % 2 == 0 and "cz3" or "cz4") end
  stars(G, {{24+dx, 30+b}, {32+dx, 36+b}, {26+dx, 44+b}, {34+dx, 24+b}}, ph)
  -- brazos largos
  G.thick(20+dx, 22+b+fl, 8+dx, 34+b+fl, 2, "cz2"); G.ellipse(7+dx, 35+b+fl, 2, 2, "cz1")
  -- la cabeza es un eclipse: un sol negro con corona dorada
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0) + fl
  G.ellipse(29+hx, 12+hy, 9, 9, "go2"); G.ellipse(29+hx, 12+hy, 8, 8, "go1"); G.ellipse(30+hx, 12+hy, 7, 7, "ne3")
  if P.pain then G.line(26+hx, 10+hy, 34+hx, 14+hy, "ec2") else eye(G, 32+hx, 11+hy, "ec1", false) end
  -- la corona eclipsada
  for _,x in ipairs({22, 29, 36}) do G.line(x+hx, 3+hy, x+hx + (x - 29) * 0.2, -2+hy, "go3") end
  if P.cast then
    G.thick(36+dx, 22+b+fl, 50+dx, 10+b+fl, 2, "cz2")
    for _,r in ipairs({6, 10}) do G.ellipse(51+dx, 8+b+fl, r, r, "ec2"); G.ellipse(51+dx, 8+b+fl, r - 1, r - 1, "ne3") end; G.ellipse(51+dx, 8+b+fl, 3, 3, "ec1")
  else G.thick(36+dx, 22+b+fl, 46+dx, 34+b+fl, 2, "cz2"); G.ellipse(47+dx, 35+b+fl, 2, 2, "cz1") end
  return G
end

-- =====================================================================================
-- Guardián Ancestral Primordial (64x64, minijefe): un gigante de mármol y oro con el Núcleo Primordial en
-- el pecho, alas de piedra y un escudo con el sol de Aethra
-- =====================================================================================
local function guardianAncestral(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 60, 61)
  if P.dead then for _,p in ipairs({{6,54,12,6},{20,56,14,5},{38,54,12,7}}) do G.rect(p[1], p[2], p[1] + p[3], p[2] + p[4], "mb2") end; G.ellipse(30,52,6,4,"go2"); G.ellipse(30,52,3,2,"lg1"); return G end
  -- alas de piedra detrás
  for i=0,5 do G.thick(28+dx, 22+b, 4+dx + i * 2, 4+b + i * 3, 3, i % 2 == 0 and "mb2" or "mb3") end
  local k = P.phase or 0
  G.rect(22+dx-k, 44+b, 28+dx-k, 60, "mb3"); G.rect(34+dx+k, 44+b, 40+dx+k, 60, "mb3")
  G.rect(18+dx, 18+b, 44+dx, 44+b, "mb1"); G.rect(18+dx, 18+b, 44+dx, 21+b, "go2"); G.rect(42+dx, 18+b, 44+dx, 44+b, "mb3")
  G.ellipse(31+dx, 30+b, 6, 6, "go2"); G.ellipse(31+dx, 30+b, 4, 4, P.cast and "W" or "lg1")
  for _,x in ipairs({16, 46}) do G.ellipse(x+dx, 20+b, 6, 4, "go1") end
  -- cabeza con casco de oro
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(32+hx, 10+hy, 8, 8, "mb1"); G.rect(24+hx, 2+hy, 40+hx, 8+hy, "go2"); G.rect(24+hx, 2+hy, 40+hx, 3+hy, "go1")
  G.rect(30+hx, 0+hy, 33+hx, 2+hy, "go1")
  eye(G, 33+hx, 10+hy, "lg1", P.pain); eye(G, 37+hx, 10+hy, "lg1", P.pain)
  -- escudo (atrás) y el puño (golpe)
  local sh = P.shell
  G.ellipse(10+dx, 32+b, 9, 12, sh and "go1" or "go2"); G.ellipse(10+dx, 32+b, 7, 10, "mb2"); G.ellipse(10+dx, 32+b, 3, 3, "go1")
  if P.slam then G.rect(44+dx, 24+b, 58+dx, 30+b, "mb2"); G.rect(54+dx, 22+b, 63, 34+b, "mb1"); for i=0,4 do G.line(46+dx+i*3, 61, 48+dx+i*3, 56, "mb4") end
  else G.rect(45+dx, 22+b, 51+dx, 40+b, "mb2"); G.rect(44+dx, 38+b, 54+dx, 46+b, "mb1") end
  if sh then for _,p in ipairs({{2,10},{56,6},{2,50}}) do G.ellipse(p[1]+dx, p[2]+b, 3, 3, "lg1") end end
  return G
end

-- =====================================================================================
-- Entidad Corrupta del Templo (64x64, minijefe): una sombra con forma de sacerdote, sin cara, que reza al
-- revés; le sale el cristal de eclipse por la espalda
-- =====================================================================================
local function entidad(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.ellipse(32, 60, 22, 3, "gr3")
  if P.dead then G.ellipse(30,56,20,4,"ne2"); G.ellipse(40,52,5,6,"ec2"); G.ellipse(40,51,3,3,"ec1"); return G end
  local fl = -2
  -- el cristal de eclipse en la espalda
  for _,s in ipairs({{14,30,4,22},{20,26,3,16},{9,34,3,12}}) do
    local x, y, w, h = s[1] + dx, s[2] + b, s[3], s[4]
    for i=0,h do local ww = math.floor(w * (1 - i / h)); G.rect(x - ww, y - i, x + ww, y - i, i < h * 0.4 and "ec2" or "ec1") end
  end
  -- túnica de sombra
  for y=16,58 do local half = 6 + math.floor((y - 16) * 0.38); local o = math.floor(math.sin(y / 3 + ph) * 2); G.rect(30+dx-half+o, y+b+fl, 30+dx+half+o, y+b+fl, (y // 6) % 2 == 0 and "ne1" or "ne2") end
  for x=14,46,5 do G.line(x+dx, 55+b, x+dx+2, 60, "ne3") end
  -- estola de oro manchada y manos juntas al revés
  G.thick(30+dx, 20+b+fl, 30+dx, 50+b+fl, 3, "go3"); G.ellipse(34+dx, 32+b+fl, 4, 3, "ne3")
  -- cabeza: capucha sin cara, solo el eclipse
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0) + fl
  G.ellipse(32+hx, 11+hy, 9, 10, "ne1"); G.ellipse(34+hx, 12+hy, 6, 7, "ne3")
  if P.pain then G.line(30+hx, 10+hy, 38+hx, 14+hy, "ec2") else G.ellipse(35+hx, 12+hy, 3, 3, "ec1"); G.ellipse(36+hx, 12+hy, 2, 2, "ne3") end
  if P.cast then
    for _,r in ipairs({8, 13}) do G.ellipse(48+dx, 18+b, r, r, "ec2"); G.ellipse(48+dx, 18+b, r - 1, r - 1, "ne3") end
    G.ellipse(48+dx, 18+b, 4, 4, "ec1"); G.thick(38+dx, 26+b+fl, 46+dx, 20+b, 2, "ne1")
  end
  return G
end

-- =====================================================================================
-- Centinela Cósmico (64x64, minijefe): un gigante hecho de constelaciones, con armadura de cielo y una
-- espada de luz
-- =====================================================================================
local function centinelaCosmico(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  floor(G, 4, 60, 61)
  if P.dead then G.ellipse(30,56,22,4,"cz3"); stars(G, {{10,54},{22,52},{36,55},{50,53}}, 0); G.line(4,60,52,50,"lg2"); return G end
  local k = P.phase or 0
  G.rect(22+dx-k, 44+b, 28+dx-k, 60, "cz3"); G.rect(34+dx+k, 44+b, 40+dx+k, 60, "cz3")
  -- cuerpo de cielo con estrellas unidas por líneas (constelaciones)
  G.rect(16+dx, 16+b, 46+dx, 46+b, "cz4"); G.rect(16+dx, 16+b, 46+dx, 18+b, "cz2"); G.rect(44+dx, 16+b, 46+dx, 46+b, "cz3")
  local pts = {{22, 22}, {30, 28}, {38, 22}, {34, 38}, {24, 40}}
  for i=1,#pts - 1 do G.line(pts[i][1]+dx, pts[i][2]+b, pts[i + 1][1]+dx, pts[i + 1][2]+b, "cz1") end
  for _,p in ipairs(pts) do G.px(p[1]+dx, p[2]+b, "sr"); G.px(p[1]+dx+1, p[2]+b, "sr") end
  for _,x in ipairs({14, 48}) do G.ellipse(x+dx, 18+b, 6, 4, "cz2") end
  -- cabeza: un casco con una estrella por ojo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(32+hx, 9+hy, 8, 8, "cz3"); G.rect(24+hx, 8+hy, 40+hx, 10+hy, "cz2")
  if P.pain then G.rect(33+hx, 8+hy, 38+hx, 9+hy, "K") else stars(G, {{36+hx, 9+hy}}, 0) end
  for i=0,4 do G.px(26+hx + i * 3, 0+hy + (i % 2), "sr") end
  -- espada de luz (golpe) o levantada
  if P.swing then G.thick(46+dx, 24+b, 52+dx, 30+b, 3, "cz2"); for i=0,16 do G.ellipse(52+dx - i * 0.3, 30+b + i * 1.8, 2, 1, i % 2 == 0 and "lg1" or "sr") end
  else G.thick(46+dx, 24+b, 50+dx, 32+b, 3, "cz2"); for i=0,18 do G.ellipse(52+dx, 30+b - i * 1.7, 2, 1, i % 2 == 0 and "lg1" or "sr") end end
  if P.cast then for i=0,7 do local a = i * math.pi / 4 + ph; G.px(31+dx + math.cos(a) * 26, 30+b + math.sin(a) * 22, "sr"); G.px(31+dx + math.cos(a) * 26 + 1, 30+b + math.sin(a) * 22, "lg2") end end
  return G
end

-- =====================================================================================
-- Gran Esqueleto del Abismo (64x64, jefe legendario): el primer Vigía. Esqueleto enorme con el manto azul de
-- los Vigías hecho jirones, la lanza de los Vigías y el ojo del eclipse en la frente
-- =====================================================================================
local function granEsqueleto(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 60, 61)
  if P.dead then for _,p in ipairs({{4,58,22,55},{18,60,40,57},{36,58,56,60}}) do boneLine(G, p[1], p[2], p[3], p[4], 3) end; skull(G, 40, 46, 1.5, true); G.ellipse(16,54,10,3,"vb2"); G.line(2,48,40,44,"go3"); return G end
  local k = P.phase or 0
  boneLine(G, 26+dx, 42+b, 22+dx-k, 60, 4); boneLine(G, 36+dx, 42+b, 40+dx+k, 60, 4)
  -- el manto azul de los Vigías, roto
  for y=18,54 do local half = 10 + math.floor((y - 18) * 0.3); local o = (y > 44) and math.floor(math.sin(y / 2 + (P.phase or 0)) * 2) or 0
    if (y + (y // 7)) % 9 ~= 0 then G.rect(31+dx-half+o, y+b, 31+dx-4+o, y+b, (y // 6) % 2 == 0 and "vb1" or "vb2") end end
  -- tórax de costillas grandes
  G.thick(31+dx, 16+b, 31+dx, 42+b, 4, "hu2")
  for i=0,4 do local y = 20 + i*4; G.ellipse(32+dx, y+b, 11 - i, 2, "hu1"); G.ellipse(32+dx, y+b, 9 - i, 1, "K") end
  G.rect(22+dx, 40+b, 40+dx, 44+b, "hu2")
  -- el broche de los Vigías (un ojo de oro)
  G.ellipse(22+dx, 18+b, 3, 2, "go2"); G.px(22+dx, 18+b, "go1")
  -- cabeza: el cráneo con el ojo del eclipse en la frente
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  skull(G, 24+hx, 2+hy, 2, P.pain, "ec1")
  G.ellipse(31+hx, 3+hy, 3, 2, "ec2"); G.px(31+hx, 3+hy, "ec1")
  -- brazo con la lanza de los Vigías
  if P.swing then
    boneLine(G, 40+dx, 20+b, 50+dx, 26+b, 3); G.thick(20+dx, 34+b, 63, 18+b, 2, "go3"); G.line(56, 16+b, 63, 18+b, "go1"); G.line(56, 22+b, 63, 18+b, "go1")
  else
    boneLine(G, 40+dx, 20+b, 46+dx, 30+b, 3); G.thick(50+dx, 0+b, 50+dx, 60, 2, "go3"); G.line(47+dx, 4+b, 50+dx, -2+b, "go1"); G.line(53+dx, 4+b, 50+dx, -2+b, "go1")
  end
  boneLine(G, 22+dx, 20+b, 14+dx, 34+b, 3); G.ellipse(13+dx, 36+b, 4, 3, "hu1")
  if P.cast then for _,r in ipairs({14, 20}) do for a=0,359,10 do G.px(31+hx + math.cos(math.rad(a)) * r, 6+hy + math.sin(math.rad(a)) * (r * 0.6), "ec2") end end end
  if P.shell then for i=0,7 do local t = i / 8 * math.pi * 2; G.ellipse(31+dx + math.cos(t)*24, 32+b + math.sin(t)*18, 1.5, 1.5, "ec1") end end
  return G
end

-- =====================================================================================
-- el Observatorio Roto (mazmorra, tanda 5)
-- =====================================================================================
-- Astrónomo Fantasma (48x48): el Gran Astrónomo, un espectro azul con sombrero de estrellas que anota en el aire
local function astronomo(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, (P.bob or 0) + 3
  local ph = P.phase or 0
  G.ellipse(24, 45, 10, 2, "gr3")
  if P.dead then G.ellipse(24,42,12,3,"cz3"); G.ellipse(22,41,5,2,"lg3"); stars(G, {{12,38},{30,40},{36,36}}, 0); return G end
  -- la túnica, que se deshace abajo en jirones de luz
  for y=18,42 do
    local half = 6 + math.floor((y - 18) * 0.4)
    local o = math.floor(math.sin(y / 3 + ph) * 1.5)
    if y < 38 or (y + ph) % 3 ~= 0 then G.rect(22+dx-half+o, y+b, 22+dx+half+o, y+b, (y // 5) % 2 == 0 and "cz2" or "cz3") end
  end
  stars(G, {{18+dx, 26+b}, {26+dx, 32+b}, {20+dx, 37+b}}, ph)
  -- la cara pálida, la barba larga y el sombrero puntiagudo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(23+hx, 13+hy, 6, 6, "lg2"); G.rect(19+hx, 15+hy, 27+hx, 24+hy, "W"); G.rect(21+hx, 24+hy, 25+hx, 27+hy, "W")
  eye(G, 21+hx, 12+hy, "lg1", P.pain); eye(G, 25+hx, 12+hy, "lg1", P.pain)
  for y=0,8 do G.rect(23+hx - (8 - y) // 2 - 1, y - 2 + hy, 23+hx + (8 - y) // 2 + 1, y - 2 + hy, "cz2") end
  G.rect(14+hx, 6+hy, 32+hx, 7+hy, "cz3"); G.px(23+hx, -1+hy, "sr"); G.px(19+hx, 3+hy, "sr")
  -- el brazo con la pluma de luz
  G.thick(28+dx, 22+b, 36+dx, 18+b, 2, "cz2"); G.ellipse(37+dx, 17+b, 1.5, 1.5, "lg2")
  if P.cast then
    -- escribe constelaciones en el aire
    local pts = {{36,6},{41,12},{38,20},{44,24}}
    for i=1,#pts - 1 do G.line(pts[i][1]+dx, pts[i][2]+b, pts[i+1][1]+dx, pts[i+1][2]+b, "lg2") end
    stars(G, {{36+dx, 6+b}, {41+dx, 12+b}, {38+dx, 20+b}, {44+dx, 24+b}}, ph)
  end
  if P.swing then for i=0,4 do G.ellipse(38+dx + i * 2, 17+b - i, 2 - i * 0.3, 2 - i * 0.3, "sr") end end
  return G
end

-- Autómata del Cielo (48x48): un muñeco de bronce con verdín, cabeza de engranaje y un brazo con manivela
local function automata(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  floor(G, 6, 42, 45)
  if P.dead then G.rect(8,38,30,44,"bz3"); G.ellipse(34,40,6,4,"bz2"); G.ellipse(18,40,3,3,"vd1"); G.line(2,46,44,34,"st2"); return G end
  local k = P.phase or 0
  G.thick(18+dx, 32+b, 16+dx-k, 44, 3, "bz3"); G.thick(28+dx, 32+b, 30+dx+k, 44, 3, "bz3")
  G.rect(14+dx, 42, 20+dx, 44, "bz2"); G.rect(26+dx, 42, 32+dx, 44, "bz2")
  -- el cuerpo: una caja de bronce con un reloj de estrellas en el pecho
  G.rect(13+dx, 16+b, 33+dx, 32+b, "bz2"); G.rect(13+dx, 16+b, 33+dx, 18+b, "bz1"); G.rect(31+dx, 16+b, 33+dx, 32+b, "bz3")
  G.ellipse(23+dx, 24+b, 5, 5, "cz4"); G.line(23+dx, 24+b, 23+dx + math.cos(ph) * 4, 24+b + math.sin(ph) * 4, "sr"); G.px(23+dx, 24+b, "sr")
  for _, p in ipairs({{15,20},{30,29},{16,30}}) do G.px(p[1]+dx, p[2]+b, "vd1"); G.px(p[1]+dx+1, p[2]+b, "vd2") end
  -- la cabeza: un engranaje que gira, con un ojo de cristal
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  for i=0,7 do local a = i * math.pi / 4 + ph * 0.4; G.rect(23+hx + math.cos(a) * 7 - 1, 9+hy + math.sin(a) * 7 - 1, 23+hx + math.cos(a) * 7 + 1, 9+hy + math.sin(a) * 7 + 1, "bz3") end
  G.ellipse(23+hx, 9+hy, 6, 6, "bz2"); G.ellipse(23+hx, 9+hy, 3, 3, "bz3")
  if P.pain then G.rect(24+hx, 8+hy, 27+hx, 9+hy, "K") else G.ellipse(25+hx, 9+hy, 2, 2, "lg1") end
  -- un brazo con la manivela de girar cúpulas; el otro, un martillo
  G.thick(13+dx, 18+b, 7+dx, 28+b, 2, "bz3"); G.rect(4+dx, 28+b, 9+dx, 31+b, "bz2")
  if P.swing then G.thick(33+dx, 20+b, 46+dx, 16+b, 3, "bz3"); G.rect(42+dx, 11+b, 47+dx, 20+b, "bz1"); G.line(42+dx, 11+b, 47+dx, 11+b, "vd1")
  else G.thick(33+dx, 20+b, 38+dx, 30+b, 3, "bz3"); G.rect(35+dx, 30+b, 42+dx, 35+b, "bz1") end
  if P.cast then for i=0,5 do G.line(36+dx + i, 4+b + i * 5, 40+dx + i, 6+b + i * 5, "lg2"); G.px(41+dx + i, 7+b + i * 5, "lg1") end end
  return G
end

-- Constelación Viva (48x48): estrellas unidas por líneas de luz con la forma de un cazador con su arco
local function constelacion(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.ellipse(24, 45, 10, 2, "gr3")
  if P.dead then stars(G, {{10,42},{18,40},{26,43},{34,41},{40,43}}, 0); G.line(10,42,40,43,"cz2"); return G end
  local hx, hy = (P.hx or 0), (P.hy or 0)
  local J = {
    head = {22 + hx, 8 + hy}, neck = {22, 14}, hipC = {22, 28}, shL = {16, 16}, shR = {28, 16},
    hL = {10, 24}, hR = {34, 20}, kneeL = {16, 36}, kneeR = {28, 36}, fL = {14, 43}, fR = {31, 43},
  }
  local L = {{"head","neck"},{"neck","shL"},{"neck","shR"},{"neck","hipC"},{"shL","hL"},{"shR","hR"},{"hipC","kneeL"},{"hipC","kneeR"},{"kneeL","fL"},{"kneeR","fR"}}
  for _, l in ipairs(L) do local a, c = J[l[1]], J[l[2]]; G.thick(a[1]+dx, a[2]+b, c[1]+dx, c[2]+b, 2, "cz2"); G.line(a[1]+dx, a[2]+b, c[1]+dx, c[2]+b, "cz1") end
  local pts = {}
  for _, p in pairs(J) do pts[#pts+1] = {p[1]+dx, p[2]+b} end
  stars(G, pts, ph)
  G.ellipse(J.head[1]+dx, J.head[2]+b, 3, 3, "cz1"); eye(G, J.head[1]+dx+1, J.head[2]+b, "sr", P.pain)
  -- el arco de luz
  for t=-10,10 do G.px(36+dx + math.floor(4 * math.cos(t / 10 * 1.4)), 20+b + t, "lg2") end
  G.line(36+dx, 10+b, 36+dx, 30+b, "lg1")
  if P.swing or P.cast then for i=0,12 do G.px(36+dx + i, 20+b, i % 3 == 0 and "sr" or "lg1") end; G.line(46+dx, 18+b, 47+dx, 20+b, "sr"); G.line(46+dx, 22+b, 47+dx, 20+b, "sr") end
  if P.cast then for i=0,7 do local a = i * math.pi / 4 + ph; G.px(22+dx + math.cos(a) * 20, 24+b + math.sin(a) * 20, "sr") end end
  return G
end

-- Ojo del Devorador (64x64, jefe de la mazmorra): un ojo morado enorme detrás de la lente rota del telescopio,
-- con el aro de bronce partido y la oscuridad del Devorador que se escapa por las grietas
local function ojoDevorador(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  G.ellipse(32, 61, 22, 3, "gr3")
  if P.dead then G.ellipse(32,52,22,8,"bz3"); G.ellipse(32,52,18,6,"ne3"); G.line(14,52,50,52,"ec2"); stars(G, {{20,46},{44,47}}, 0); return G end
  local cx, cy = 32 + dx, 28 + b
  -- la oscuridad que se escapa: tentáculos alrededor
  for i=0,7 do
    local a = i * math.pi / 4 + 0.3
    for t=0,9 do local r = 22 + t * 1.2; local w = math.sin(t / 2 + ph + i) * 2; G.ellipse(cx + math.cos(a) * r + w, cy + math.sin(a) * r * 0.85, 2.2 - t * 0.15, 2.2 - t * 0.15, t % 3 == 0 and "ne1" or "ne2") end
  end
  -- el aro de bronce del telescopio, partido
  G.ellipse(cx, cy, 25, 23, "bz3"); G.ellipse(cx, cy, 23, 21, "bz2"); G.ellipse(cx, cy, 21, 19, "ne3")
  for _, a in ipairs({30, 150, 260}) do local r = math.rad(a); G.rect(cx + math.cos(r) * 22 - 2, cy + math.sin(r) * 20 - 2, cx + math.cos(r) * 22 + 2, cy + math.sin(r) * 20 + 2, "ne3") end
  -- el ojo: blanco con venas, iris morado enorme y la pupila en ranura
  G.ellipse(cx, cy, 18, 14, "i1")
  for i=0,10 do local a = i * 0.57; G.line(cx + math.cos(a) * 9, cy + math.sin(a) * 7, cx + math.cos(a) * 17, cy + math.sin(a) * 13, "R") end
  local lx, ly = (P.hx or 0) * 2, (P.hy or 0)
  G.ellipse(cx + lx, cy + ly, 11, 11, P.cast and "ec1" or "ec2"); G.ellipse(cx + lx, cy + ly, 8, 8, "cz2")
  stars(G, {{cx + lx - 5, cy + ly - 4}, {cx + lx + 6, cy + ly + 3}}, ph)
  G.ellipse(cx + lx, cy + ly, 2.5, 7, "ne3"); G.px(cx + lx - 4, cy + ly - 6, "W"); G.px(cx + lx - 3, cy + ly - 6, "W")
  if P.pain then G.rect(cx - 18, cy - 3, cx + 18, cy + 3, "ne2"); G.line(cx - 18, cy, cx + 18, cy, "K") end
  -- las grietas de la lente, por delante
  G.line(cx - 16, cy - 12, cx - 4, cy + 2, "lg2"); G.line(cx - 4, cy + 2, cx - 8, cy + 14, "lg2"); G.line(cx + 10, cy - 14, cx + 4, cy - 2, "lg3")
  if P.swing then for i=0,4 do G.thick(cx + 18, cy - 6 + i * 4, 63, cy - 10 + i * 6, 2, "ne1") end end
  if P.cast then for _,r in ipairs({26, 30}) do for a=0,359,10 do G.px(cx + math.cos(math.rad(a)) * r, cy + math.sin(math.rad(a)) * (r - 4), "ec2") end end end
  if P.shell then for i=0,7 do local t = i / 8 * math.pi * 2; G.ellipse(cx + math.cos(t)*28, cy + math.sin(t)*24, 1.5, 1.5, "ec1") end end
  return G
end

-- La Sombra del Devorador (64x64, el final): una silueta enorme hecha de cielo roto, sin piernas, que sube de una
-- grieta; brazos largos de oscuridad, una corona de estrellas apagadas y un ojo morado en el pecho
local function sombraDevorador(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local ph = P.phase or 0
  -- la grieta del suelo de donde sube
  G.ellipse(32, 60, 22, 3, "ne3"); G.line(12, 60, 52, 60, "ec2"); G.line(18, 59, 46, 59, "ec1")
  if P.dead then G.ellipse(32,56,20,5,"cz4"); G.ellipse(32,55,12,3,"cz3"); stars(G, {{14,52},{26,50},{40,51},{50,53}}, 0); return G end
  -- el cuerpo: un manto de cielo que se ensancha hacia abajo y se deshace en jirones
  for y=14,58 do
    local half = math.floor(6 + (y - 14) * 0.38)
    local o = math.floor(math.sin(y / 4 + ph) * 2)
    if y < 52 or (y + ph) % 3 ~= 0 then G.rect(31+dx-half+o, y+b, 31+dx+half+o, y+b, (y // 6) % 2 == 0 and "cz4" or "ne2") end
  end
  stars(G, {{24+dx, 30+b}, {38+dx, 26+b}, {28+dx, 44+b}, {40+dx, 40+b}, {20+dx, 50+b}}, ph)
  -- el ojo del pecho
  G.ellipse(32+dx, 32+b, 7, 5, "ne3"); G.ellipse(32+dx, 32+b, 5, 4, P.cast and "ec1" or "ec2"); G.ellipse(32+dx, 32+b, 1.5, 3.5, "ne3")
  if P.pain then G.line(26+dx, 32+b, 38+dx, 32+b, "K") end
  -- la cabeza sin cara y la corona de estrellas apagadas
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 10+hy, 7, 7, "ne2"); G.ellipse(31+hx, 10+hy, 5, 5, "cz4")
  for i=0,4 do G.line(25+hx + i * 3, 4+hy, 24+hx + i * 3, 0+hy - (i % 2) * 2, "cz3"); G.px(24+hx + i * 3, -1+hy - (i % 2) * 2, "cz1") end
  eye(G, 29+hx, 10+hy, "ec1", P.pain); eye(G, 33+hx, 10+hy, "ec1", P.pain)
  -- los brazos de oscuridad
  local reach = P.bite and 12 or 0
  for side=-1,1,2 do
    for t=0,14 do
      local x = 31+dx + side * (8 + t * 1.3 + (side == 1 and reach * t / 14 or 0))
      local y = 22+b + t * 1.2 + math.sin(t / 3 + ph) * 2
      G.ellipse(x, y, 2.4 - t * 0.08, 2.4 - t * 0.08, t % 3 == 0 and "ne1" or "ne2")
    end
  end
  if P.cast then for _,r in ipairs({24, 28}) do for a=0,359,12 do G.px(32+dx + math.cos(math.rad(a)) * r, 32+b + math.sin(math.rad(a)) * (r * 0.7), "ec2") end end end
  if P.shell then for i=0,7 do local t = i / 8 * math.pi * 2; G.ellipse(32+dx + math.cos(t)*26, 32+b + math.sin(t)*20, 1.5, 1.5, "ec1") end end
  return G
end

-- =====================================================================================
-- animaciones (idle 2, attack 3, cast 3, hurt 1, die 2)
-- =====================================================================================
local function walker(hit)
  return {
    {"idle",   {{bob=0,phase=0,dur=460},{bob=1,phase=1,dur=460}}},
    {"attack", {{bob=-1,hx=-2,dur=220},{dx=4,[hit]=true,phase=1,dur=160},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-1,hy=-1,dur=220},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }
end
local function floater(hit)
  return {
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-2,phase=2,dur=420}}},
    {"attack", {{bob=-2,hx=-2,phase=1,dur=220},{dx=4,[hit]=true,phase=2,dur=170},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-2,phase=1,dur=220},{cast=true,phase=2,dur=320},{cast=true,phase=3,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }
end
local function big(hit, extra)
  return {
    {"idle",   {{bob=0,phase=0,dur=560},{bob=1,phase=1,dur=560}}},
    {"attack", {{bob=-1,hx=-1,dur=300},{dx=3,[hit]=true,phase=1,dur=190},{dx=1,[hit]=true,dur=300}}},
    {"cast",   {{bob=-1,dur=240},{cast=true,[extra or "shell"]=true,phase=0,dur=340},{cast=true,[extra or "shell"]=true,phase=1,dur=260}}},
    {"hurt",   {{dx=-3,pain=true,dur=300}}},
    {"die",    {{bob=3,pain=true,dur=300},{dead=true,dur=1300}}},
  }
end
local MONSTERS = {
  {key="peregrino_piedra", size=48, draw=peregrino, anims=walker("swing")},
  {key="grifo_templo", size=48, draw=grifo, anims={
    {"idle",   {{bob=0,phase=0,dur=280},{bob=-2,phase=1,dur=280}}},
    {"attack", {{bob=-3,phase=0,dur=180},{dx=5,bite=true,phase=1,dur=150},{dx=1,phase=0,dur=220}}},
    {"cast",   {{bob=-2,phase=1,dur=200},{cast=true,phase=0,dur=300},{cast=true,phase=1,dur=220}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=250}}},
    {"die",    {{bob=3,pain=true,dur=200},{dead=true,dur=1100}}},
  }},
  {key="guardian_ruinas", size=48, draw=guardianRuinas, anims=walker("swing")},
  {key="serpiente_lagrimas", size=48, draw=serpiente, anims=floater("bite")},
  {key="centinela_antiguo", size=48, draw=centinela, anims=walker("swing")},
  {key="heraldo_olvidado", size=48, draw=heraldo, anims=floater("cast")},
  {key="guardian_fuego_ancestral", size=48, draw=guardianFuego, anims=floater("swing")},
  {key="guardian_agua_ancestral", size=48, draw=guardianAgua, anims=floater("swing")},
  {key="guardian_hielo_ancestral", size=48, draw=guardianHielo, anims=floater("swing")},
  {key="estrella_caida", size=48, draw=estrella, anims=floater("swing")},
  {key="engendro_devorador", size=48, draw=engendro, anims=walker("bite")},
  {key="ojo_errante", size=48, draw=ojo, anims=floater("cast")},
  {key="coloso_marmol", size=56, draw=coloso, anims=big("slam")},
  {key="avatar_eclipse", size=56, draw=avatar, anims=floater("cast")},
  {key="guardian_ancestral", size=64, draw=guardianAncestral, anims=big("slam")},
  {key="entidad_corrupta_templo", size=64, draw=entidad, anims=floater("cast")},
  {key="centinela_cosmico", size=64, draw=centinelaCosmico, anims=big("swing")},
  {key="gran_esqueleto_abismo", size=64, draw=granEsqueleto, anims=big("swing")},
  -- el Observatorio Roto
  {key="observ_astronomo", size=48, draw=astronomo, anims=floater("swing")},
  {key="observ_automata", size=48, draw=automata, anims=walker("swing")},
  {key="observ_constelacion", size=48, draw=constelacion, anims=floater("swing")},
  {key="observ_ojo", size=64, draw=ojoDevorador, anims=big("swing")},
  -- el final
  {key="sombra_devorador", size=64, draw=sombraDevorador, anims=big("bite")},
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
    spr:saveAs(dir .. "/zona7/" .. m.key .. ".aseprite")
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
local fh = io.open(dir .. "/enemigos_ruinas.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
