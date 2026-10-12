-- Sprites del MUNDO (vista desde arriba, estilo Pokemon/Tibia) de Etheria:
--  * caminar/<clase>.aseprite: 32x32, 9 frames = abajo(quieto, paso A, paso B), arriba(...), lado(...)
--    (izquierda = lado volteado en el juego)
--  * tileset_pradera.aseprite: tiles de 32x32 para armar mapas en Tiled
--
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_mundo.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"F","e8b48c"},{"f","b97f5c"},{"E","1c2a4a"},{"H","2a2433"},{"h","4a3f5c"},
  {"W","f0f4f8"},{"S","c8d0dc"},{"s","8a96a8"},{"d","555f70"},{"R","c0343a"},{"r","7a1f2a"},
  {"B","8a5530"},{"b","4f2e1c"},{"Y","e8c050"},{"y","a8802c"},{"A","4a5060"},{"a","2e323e"},{"Ah","7a8296"},
  {"M","2e44b0"},{"m","1d2770"},{"Mh","5070e0"},{"C","6fc3ff"},
  {"G","3f7040"},{"g","274828"},{"Gh","64984f"},
  {"L","434352"},{"l","2e2e3a"},{"Lh","62627a"},{"V","6a3a8a"},{"v","432456"},
  {"P","eeecf4"},{"p","b4b0c8"},{"Ph","ffffff"},
  -- terreno
  {"c1","6fae4a"},{"c2","5c9a3c"},{"c3","4a8432"},{"c4","3a6c28"},
  {"t1","c9a46a"},{"t2","b08c56"},{"t3","8e6e40"},
  {"a1","4a8ad8"},{"a2","3a72c0"},{"a3","6aa8ec"},{"a4","2a5a9c"},
  {"r1","9a9488"},{"r2","767060"},{"r3","4c473e"},
  {"o1","3c7a2c"},{"o2","2c5e20"},{"o3","1e4416"},{"o4","5a9a3a"},
  {"fl","f0e070"},{"fr","e86a8a"},{"fw","f4f4f4"},
  -- v3: trigo, pasto dorado, tierra arada y herida, madera muerta, tejados, piedra de muralla, pinos, otoño
  {"g1","f0d070"},{"g2","d0a840"},{"g3","9a7a2a"},{"gp1","b8b85a"},{"gp2","9ea248"},{"gp3","84903c"},
  {"s1","8a6a42"},{"s2","6e5032"},{"x1","a89878"},{"x2","8a7a5e"},{"x3","5e5040"},{"dw","5a4a3a"},
  {"rf","b04a3a"},{"rd","7a2a22"},{"sw","b8b2a8"},{"sd","8a847a"},{"sk","4c4a46"},{"pn","3a6e46"},{"pd","244a30"},
  {"au","d87a3a"},{"ad","a8501e"},{"lp","5aa040"},{"bb","4a5ad8"},{"rn","7ad8ff"},{"T","d8c8a0"},{"t","a8987a"},
  {"N","7a5a3a"},{"M","2e44b0"},
  -- v4 (Aurelia): adoquines, mármol, tejados de colores, yeso y vigas, vidrio, oro, hojas plateadas
  {"k1","e0dccf"},{"k2","bdb6a6"},{"k3","8e8778"},{"k4","6a6458"},
  {"m1","f2ecd8"},{"m2","d6cdb2"},{"m3","a89f84"},
  {"pb","3a5ea8"},{"pbd","26407a"},{"pg","3e7a4a"},{"pgd","28553a"},{"pv","6a4a9a"},{"pvd","48306c"},{"pz","5a6070"},{"pzd","3c404c"},
  {"wp","efe6cf"},{"wpd","cfc3a3"},{"tb","5a3a22"},{"gl","9ad8f0"},{"go","ffd860"},{"god","c89a2a"},
  {"ag","a8d4b8"},{"agd","6aa08c"},{"agh","dcf4e4"},{"wn","ffe9a0"},{"fv","b070e0"},{"n","4e3622"},{"Oh","e08a4a"},{"O","c0602a"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

local function newGrid(W, H)
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c) x, y = math.floor(x+0.5), math.floor(y+0.5); if x>=0 and x<W and y>=0 and y<H then g[y*W+x] = c end end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.ellipse(cx,cy,rx,ry,c)
    for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do
      local dx, dy = (x-cx)/rx, (y-cy)/ry
      if dx*dx+dy*dy <= 1 then G.px(x,y,c) end
    end end
  end
  return G
end

local function toImage(G, outline)
  local W, H, g = G.w, G.h, G.g
  if outline then
    local out = {}
    for y=0,H-1 do for x=0,W-1 do
      if not g[y*W+x] then
        for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
          local nx, ny = x+o[1], y+o[2]
          if nx>=0 and nx<W and ny>=0 and ny<H and g[ny*W+nx] and g[ny*W+nx] ~= "K" then out[y*W+x] = true break end
        end
      end
    end end
    for k in pairs(out) do g[k] = "K" end
  end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % W, k // W, C[c]) end
  return img
end

local function makePalette()
  local pal = Palette(#ORDER + 1)
  pal:setColor(0, Color{r=0,g=0,b=0,a=0})
  for i,e in ipairs(ORDER) do pal:setColor(i, C[e[1]]) end
  return pal
end

-- =====================================================================================
-- Personajes caminando (chibi, cabeza grande). Suelo en la fila 30.
-- =====================================================================================
-- step: 0 quieto, 1 paso A, 2 paso B
local STYLES = {
  guerrero  = {main="A", shade="a", light="Ah", pants="a", boots="A", neck="R", back="cape", backC="R", backD="r", belt="b", hand="a"},
  mago      = {main="M", shade="m", light="Mh", robe=true, trim="Y", neck="M", back="robe", hand="F"},
  arquero   = {main="G", shade="g", light="Gh", pants="b", boots="B", neck="G", vest="B", back="quiver", belt="b", hand="B"},
  picaro    = {main="L", shade="l", light="Lh", pants="l", boots="L", neck="V", straps="b", back="scarf", belt="b", hand="l"},
  sacerdote = {main="P", shade="p", light="Ph", robe=true, trim="Y", neck="P", stole="Y", back="robe", hand="F"},
}

local function legsFront(G, st, step, bob)
  if st.robe then
    for y=18+bob,28 do local e = (y-18)//4; G.rect(10-e,y,21+e,y,st.main); G.rect(19+e,y,21+e,y,st.shade) end
    G.rect(9,28,22,28,st.trim)
    local l, r = (step == 1) and 1 or 0, (step == 2) and 1 or 0
    G.rect(11,29,14,30-r,"b"); G.rect(17,29,20,30-l,"b")
    return
  end
  local liftL, liftR = (step == 2) and 1 or 0, (step == 1) and 1 or 0
  G.rect(11,26,14,29-liftL,st.pants); G.rect(11,30-liftL,14,30-liftL,st.boots); G.rect(11,29-liftL,14,29-liftL,st.boots)
  G.rect(17,26,20,29-liftR,st.pants); G.rect(17,30-liftR,20,30-liftR,st.boots); G.rect(17,29-liftR,20,29-liftR,st.boots)
end

local function bodyFront(G, st, step, bob)
  local swing = (step == 1) and 1 or ((step == 2) and -1 or 0)
  G.rect(10,18+bob,21,26,st.main); G.rect(19,18+bob,21,26,st.shade); G.rect(11,19+bob,11,24,st.light)
  if st.vest then G.rect(13,19+bob,18,25,st.vest) end
  if st.straps then for i=0,5 do G.px(11+i,19+bob+i,st.straps); G.px(20-i,19+bob+i,st.straps) end end
  if st.stole then G.rect(15,18+bob,16,28,st.stole) end
  if st.trim and st.robe then G.rect(15,18+bob,16,26,st.trim) end
  if st.belt then G.rect(10,25,21,25,st.belt); G.px(15,25,"Y") end
  G.rect(12,17+bob,19,18+bob,st.neck)
  -- brazos: se balancean al caminar
  G.rect(8,19+bob-swing,9,24+bob-swing,st.main); G.rect(8,25+bob-swing,9,26+bob-swing,st.hand)
  G.rect(22,19+bob+swing,23,24+bob+swing,st.shade); G.rect(22,25+bob+swing,23,26+bob+swing,st.hand)
end

local function headFront(G, bob)
  G.rect(10,9+bob,21,17+bob,"F"); G.rect(10,15+bob,21,17+bob,"F"); G.rect(10,9+bob,10,17+bob,"f"); G.rect(11,17+bob,20,17+bob,"f")
  G.rect(9,4+bob,22,9+bob,"H"); G.rect(8,7+bob,9,15+bob,"H"); G.rect(22,7+bob,23,15+bob,"H")
  G.rect(10,10+bob,21,10+bob,"H"); G.px(12,11+bob,"H"); G.px(15,11+bob,"H"); G.px(16,11+bob,"H"); G.px(19,11+bob,"H")
  G.px(10,3+bob,"H"); G.px(14,2+bob,"H"); G.px(15,3+bob,"H"); G.px(19,3+bob,"H"); G.px(21,2+bob,"H")
  G.px(12,5+bob,"h"); G.px(13,5+bob,"h"); G.px(17,6+bob,"h")
  G.rect(12,13+bob,13,14+bob,"E"); G.rect(18,13+bob,19,14+bob,"E"); G.px(12,13+bob,"W"); G.px(18,13+bob,"W")
  G.px(15,16+bob,"f"); G.px(16,16+bob,"f")
end

local function drawFront(st, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  legsFront(G, st, step, bob)
  bodyFront(G, st, step, bob)
  headFront(G, bob)
  return G
end

local function drawBack(st, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  legsFront(G, st, step, bob)
  local swing = (step == 1) and 1 or ((step == 2) and -1 or 0)
  G.rect(10,18+bob,21,26,st.main); G.rect(10,18+bob,12,26,st.shade)
  if st.belt then G.rect(10,25,21,25,st.belt) end
  G.rect(8,19+bob+swing,9,24+bob+swing,st.shade); G.rect(8,25+bob+swing,9,26+bob+swing,st.hand)
  G.rect(22,19+bob-swing,23,24+bob-swing,st.main); G.rect(22,25+bob-swing,23,26+bob-swing,st.hand)
  if st.back == "cape" then G.rect(10,18+bob,21,27,st.backC); G.rect(10,18+bob,12,27,st.backD); G.rect(10,27,21,27,st.backD)
  elseif st.back == "quiver" then G.rect(17,15+bob,20,25+bob,"b"); G.rect(17,16+bob,17,25+bob,"B"); G.px(17,14+bob,"W"); G.px(19,13+bob,"R"); G.px(20,14+bob,"W")
  elseif st.back == "scarf" then G.rect(17,18+bob,19,23+bob,st.neck); G.rect(18,24+bob,19,25+bob,"v")
  elseif st.back == "robe" then G.rect(15,18+bob,16,28,st.trim) end
  -- cabeza de espaldas: todo pelo
  G.rect(9,4+bob,22,16+bob,"H"); G.rect(8,7+bob,23,14+bob,"H"); G.rect(10,17+bob,21,17+bob,"f")
  G.px(10,3+bob,"H"); G.px(14,2+bob,"H"); G.px(15,3+bob,"H"); G.px(19,3+bob,"H"); G.px(21,2+bob,"H")
  G.px(12,6+bob,"h"); G.px(13,7+bob,"h"); G.px(18,6+bob,"h"); G.px(16,10+bob,"h")
  return G
end

local function drawSide(st, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  -- piernas de perfil: una adelante y otra atras al caminar
  local fwd = (step == 1) and 2 or ((step == 2) and -2 or 0)
  if st.robe then
    for y=18+bob,28 do local e = (y-18)//5; G.rect(11-e,y,20+e,y,st.main); G.rect(11-e,y,12-e,y,st.shade) end
    G.rect(10,28,21,28,st.trim)
    G.rect(15+fwd,29,18+fwd,30,"b"); if fwd ~= 0 then G.rect(14-fwd,29,16-fwd,29,"b") end
  else
    G.rect(13-fwd,26,15-fwd,29,st.shade); G.rect(12-fwd,30,15-fwd,30,st.boots)
    G.rect(16+fwd,26,18+fwd,29,st.pants); G.rect(16+fwd,30,20+fwd,30,st.boots); G.rect(16+fwd,29,19+fwd,29,st.boots)
  end
  if st.back == "cape" then G.rect(8,18+bob,11,27,st.backC); G.rect(8,18+bob,9,27,st.backD)
  elseif st.back == "quiver" then G.rect(8,14+bob,11,24+bob,"b"); G.px(8,13+bob,"W"); G.px(10,12+bob,"R")
  elseif st.back == "scarf" then G.rect(7,18+bob,10,19+bob,st.neck); G.px(6,20+bob,"v") end
  G.rect(11,18+bob,20,26,st.main); G.rect(11,18+bob,12,26,st.shade)
  if st.vest then G.rect(14,19+bob,19,25,st.vest) end
  if st.stole then G.rect(18,18+bob,19,27,st.stole) end
  if st.trim and st.robe then G.rect(18,18+bob,19,26,st.trim) end
  if st.belt then G.rect(11,25,20,25,st.belt) end
  G.rect(13,17+bob,19,18+bob,st.neck)
  -- cabeza de perfil mirando a la derecha
  G.rect(11,9+bob,21,17+bob,"F"); G.rect(11,17+bob,20,17+bob,"f")
  G.rect(9,4+bob,20,9+bob,"H"); G.rect(9,7+bob,14,16+bob,"H"); G.rect(15,10+bob,21,10+bob,"H"); G.px(21,9+bob,"H")
  G.px(10,3+bob,"H"); G.px(14,2+bob,"H"); G.px(18,3+bob,"H"); G.px(8,6+bob,"H")
  G.px(12,5+bob,"h"); G.px(16,6+bob,"h"); G.px(15,13+bob,"f"); G.px(15,14+bob,"F")
  G.rect(19,13+bob,19,14+bob,"E"); G.px(22,14+bob,"F"); G.px(20,16+bob,"f")
  -- brazo visible balanceandose
  local sw = -fwd // 2
  G.rect(15+sw,19+bob,17+sw,24+bob,st.light); G.rect(15+sw,25+bob,17+sw,26+bob,st.hand)
  return G
end

local dir = app.params.dir
for _,name in ipairs({"guerrero","mago","arquero","picaro","sacerdote"}) do
  local st = STYLES[name]
  local spr = Sprite(32, 32, ColorMode.RGB)
  spr:setPalette(makePalette())
  spr.layers[1].name = "caminar"
  local f = 0
  for _,view in ipairs({{"abajo", drawFront}, {"arriba", drawBack}, {"lado", drawSide}}) do
    local from = f + 1
    for step=0,2 do
      f = f + 1
      local frame = (f == 1) and spr.frames[1] or spr:newEmptyFrame(f)
      frame.duration = 0.15
      spr:newCel(spr.layers[1], frame, toImage(view[2](st, step), true), Point(0,0))
    end
    local tag = spr:newTag(from, f); tag.name = view[1]
  end
  spr:saveAs(dir .. "/caminar/" .. name .. ".aseprite")
  spr:close()
end

-- =====================================================================================
-- Tileset de la pradera (32x32 por tile, 8 columnas). Indices = orden de TILES (desde 0).
-- =====================================================================================
local function noise(x, y, seed) return ((x * 73856093) ~ (y * 19349663) ~ (seed * 83492791)) % 100 end

local function grassBase(G, seed)
  G.rect(0,0,31,31,"c2")
  for y=0,31 do for x=0,31 do
    local n = noise(x, y, seed)
    if n < 10 then G.px(x,y,"c1") elseif n < 16 then G.px(x,y,"c3") end
  end end
end

local TILES = {
  {"pasto", function(G) grassBase(G, 1) end},
  {"pasto_matas", function(G) grassBase(G, 2)
    for _,p in ipairs({{6,8},{20,5},{12,22},{26,20}}) do G.px(p[1],p[2],"c4"); G.px(p[1]-1,p[2]+1,"c3"); G.px(p[1]+1,p[2]+1,"c3"); G.px(p[1],p[2]+1,"c3") end end},
  {"pasto_flores", function(G) grassBase(G, 3)
    for _,p in ipairs({{6,7,"fl"},{22,9,"fr"},{13,20,"fw"},{26,25,"fl"},{4,26,"fr"}}) do
      G.px(p[1],p[2],p[3]); G.px(p[1]-1,p[2],p[3]); G.px(p[1]+1,p[2],p[3]); G.px(p[1],p[2]-1,p[3]); G.px(p[1],p[2]+1,p[3]); G.px(p[1],p[2],"Y") end end},
  {"camino", function(G)
    G.rect(0,0,31,31,"t1")
    for y=0,31 do for x=0,31 do local n = noise(x,y,4); if n < 8 then G.px(x,y,"t2") elseif n < 11 then G.px(x,y,"t3") end end end end},
  {"agua", function(G)
    G.rect(0,0,31,31,"a1")
    for _,p in ipairs({{4,6},{18,4},{10,17},{24,22},{6,26}}) do G.rect(p[1],p[2],p[1]+4,p[2],"a3"); G.rect(p[1]+1,p[2]+1,p[1]+3,p[2]+1,"a2") end end},
  {"hierba_alta", function(G)
    grassBase(G, 5)
    for x=1,31,4 do for y=3,31,8 do
      local o = (y // 8) % 2 * 2
      G.rect(x+o,y,x+o,y+5,"c4"); G.rect(x+o+1,y+1,x+o+1,y+5,"c3"); G.px(x+o,y-1,"c1"); G.px(x+o+2,y+2,"c4")
    end end end},
  {"arbol", function(G)
    -- sin fondo: el suelo lo pone la capa "suelo" del mapa
    G.ellipse(16,27,9,3,"c4"); G.rect(14,20,17,28,"b"); G.rect(14,20,14,28,"t3")
    G.ellipse(16,13,13,11,"o2"); G.ellipse(14,11,10,8,"o1"); G.ellipse(12,8,5,4,"o4"); G.ellipse(19,17,6,4,"o3") end},
  {"roca", function(G)
    -- sin fondo: el suelo lo pone la capa "suelo" del mapa
    G.ellipse(16,24,11,4,"c4"); G.ellipse(16,18,11,9,"r2"); G.ellipse(14,15,8,6,"r1"); G.ellipse(19,22,6,3,"r3")
    G.px(12,14,"S"); G.px(13,13,"S") end},
  {"arbusto", function(G)
    -- sin fondo: el suelo lo pone la capa "suelo" del mapa
    G.ellipse(16,24,11,3,"c4"); G.ellipse(16,19,12,9,"o2"); G.ellipse(14,16,8,6,"o1"); G.ellipse(12,14,3,2,"o4")
    G.px(20,18,"fr"); G.px(10,20,"fr"); G.px(17,13,"fr") end},
  {"valla", function(G)
    -- sin fondo: el suelo lo pone la capa "suelo" del mapa
    G.rect(0,12,31,14,"B"); G.rect(0,20,31,22,"B"); G.rect(0,14,31,14,"b"); G.rect(0,22,31,22,"b")
    for _,x in ipairs({3,27}) do G.rect(x,8,x+3,27,"B"); G.rect(x+3,8,x+3,27,"b"); G.rect(x,8,x+3,8,"t1") end end},
  {"cartel", function(G)
    -- sin fondo: el suelo lo pone la capa "suelo" del mapa
    G.rect(15,16,17,29,"b"); G.rect(6,6,26,17,"B"); G.rect(6,17,26,17,"b"); G.rect(6,6,26,6,"t1")
    G.rect(9,9,22,9,"b"); G.rect(9,12,19,12,"b"); G.rect(9,15,21,15,"b") end},
  {"fogata", function(G)
    -- sin fondo: el suelo lo pone la capa "suelo" del mapa
    G.ellipse(16,24,10,4,"r3"); for _,p in ipairs({{8,24},{12,27},{20,27},{24,24},{16,28}}) do G.ellipse(p[1],p[2],2,1,"r1") end
    G.rect(10,22,22,23,"b"); G.rect(12,20,20,21,"B")
    G.ellipse(16,17,5,6,"R"); G.ellipse(16,18,3,4,"fl"); G.px(16,9,"R"); G.px(13,12,"R"); G.px(19,11,"R") end},
  {"orilla_agua_arriba", function(G)
    G.rect(0,0,31,31,"a1"); G.rect(0,0,31,5,"c2"); G.rect(0,6,31,7,"t2"); G.rect(0,8,31,8,"a4")
    for x=0,31,3 do G.px(x,5,"c3") end
    G.rect(6,16,10,16,"a3"); G.rect(20,24,24,24,"a3") end},
  {"piedra_plaza", function(G)
    G.rect(0,0,31,31,"r1")
    for y=0,31,8 do G.rect(0,y,31,y,"r2") end
    for y=0,31,8 do local o = ((y // 8) % 2) * 8; for x=o,31,16 do G.rect(x,y,x,y+7,"r2") end end end},
}
-- ---------------------------------------------------------------------------------------
-- v2: autotiles de camino y agua, árbol grande 2x2, carpa, puesto, objetos del campamento
-- ---------------------------------------------------------------------------------------
-- Máscara de vecinos (bits): 1 = arriba, 2 = derecha, 4 = abajo, 8 = izquierda. Un bit en 1
-- significa "el vecino es del mismo terreno"; donde vale 0 se dibuja el borde. El generador del
-- mapa calcula la máscara y elige el tile camino_<máscara> / agua_<máscara>.
local function grassPx(G, x, y, seed)
  local n = noise(x, y, seed)
  G.px(x, y, n < 10 and "c1" or (n < 16 and "c3" or "c2"))
end

local function sideBand(G, mask, depthFn, paint)
  for i=0,31 do
    if mask & 1 == 0 then for d=0,depthFn(i, 1)-1 do paint(i, d) end end
    if mask & 2 == 0 then for d=0,depthFn(i, 2)-1 do paint(31-d, i) end end
    if mask & 4 == 0 then for d=0,depthFn(i, 3)-1 do paint(i, 31-d) end end
    if mask & 8 == 0 then for d=0,depthFn(i, 4)-1 do paint(d, i) end end
  end
end

local function pathTile(mask)
  return function(G)
    G.rect(0,0,31,31,"t1")
    for y=0,31 do for x=0,31 do local n = noise(x,y,4); if n < 8 then G.px(x,y,"t2") elseif n < 11 then G.px(x,y,"t3") end end end
    -- el pasto "muerde" el borde del camino de forma irregular
    local depth = function(i, side) return 3 + (noise(i, side, 13 + mask) % 4) end
    sideBand(G, mask, function(i, side) return depth(i, side) + 1 end, function(x, y) G.px(x, y, "t2") end)
    sideBand(G, mask, depth, function(x, y) grassPx(G, x, y, 21) end)
    for i=0,31,5 do
      if mask & 1 == 0 then G.px(i, depth(i,1), "c3") end
      if mask & 4 == 0 then G.px(i, 31-depth(i,3), "c3") end
    end
  end
end

local function waterTile(mask)
  return function(G)
    G.rect(0,0,31,31,"a1")
    for _,p in ipairs({{4,9},{18,6},{10,19},{22,24}}) do G.rect(p[1],p[2],p[1]+4,p[2],"a3"); G.rect(p[1]+1,p[2]+1,p[1]+3,p[2]+1,"a2") end
    local depth = function(i, side) return 4 + (noise(i, side, 31 + mask) % 3) end
    -- espuma, arena y pasto desde el agua hacia afuera
    sideBand(G, mask, function(i, side) return depth(i, side) + 2 end, function(x, y) G.px(x, y, "a3") end)
    sideBand(G, mask, function(i, side) return depth(i, side) + 1 end, function(x, y) G.px(x, y, "t1") end)
    sideBand(G, mask, function(i, side) return depth(i, side) - 2 end, function(x, y) grassPx(G, x, y, 22) end)
  end
end

for m=0,15 do TILES[#TILES+1] = {"camino_" .. m, pathTile(m)} end
for m=0,15 do TILES[#TILES+1] = {"agua_" .. m, waterTile(m)} end

-- dibujos de 64x64 cortados en 4 tiles
local function slice(draw, ox, oy)
  return function(G)
    local V = {}
    function V.px(x,y,c) G.px(x-ox, y-oy, c) end
    function V.rect(x0,y0,x1,y1,c) G.rect(x0-ox,y0-oy,x1-ox,y1-oy,c) end
    function V.ellipse(cx,cy,rx,ry,c) G.ellipse(cx-ox,cy-oy,rx,ry,c) end
    draw(V)
  end
end
local function addBig(name, draw)
  TILES[#TILES+1] = {name .. "_ai", slice(draw, 0, 0)}
  TILES[#TILES+1] = {name .. "_ad", slice(draw, 32, 0)}
  TILES[#TILES+1] = {name .. "_bi", slice(draw, 0, 32)}
  TILES[#TILES+1] = {name .. "_bd", slice(draw, 32, 32)}
end

addBig("arbol_grande", function(V)
  V.ellipse(32,58,20,5,"c4")
  V.rect(28,38,35,57,"b"); V.rect(28,38,29,57,"B"); V.px(27,57,"b"); V.px(36,57,"b")
  V.ellipse(32,27,28,23,"o3")
  V.ellipse(31,24,26,20,"o2")
  V.ellipse(27,20,20,15,"o1")
  V.ellipse(21,13,10,7,"o4"); V.ellipse(40,17,7,5,"o4")
  V.ellipse(38,36,15,7,"o3")
  for _,p in ipairs({{14,26},{46,22},{30,8},{20,34},{44,32}}) do V.ellipse(p[1],p[2],4,3,"o1") end
end)

addBig("carpa", function(V)
  V.ellipse(32,59,26,4,"c4")
  for y=8,56 do
    local half = math.floor((y - 8) * 0.55)
    for x=32-half,32+half do
      local stripe = math.floor((x - 32 + 64) / 6) % 2 == 0
      V.px(x, y, stripe and "R" or "W")
    end
    V.px(32-half, y, "r"); V.px(32+half, y, "r")
  end
  V.rect(26,40,38,56,"K"); V.rect(28,42,36,56,"r")
  V.rect(31,2,32,9,"b"); V.rect(33,2,38,5,"Y")
end)

addBig("puesto", function(V)
  V.ellipse(32,59,28,4,"c4")
  V.rect(6,34,57,55,"B"); V.rect(6,34,57,36,"t1"); V.rect(6,52,57,55,"b")
  V.rect(8,10,10,52,"b"); V.rect(53,10,55,52,"b")
  for x=4,59 do
    local stripe = math.floor(x / 6) % 2 == 0
    for y=6,16 do V.px(x, y, stripe and "M" or "W") end
    if x % 6 < 3 then V.px(x, 17, stripe and "M" or "W"); V.px(x, 18, stripe and "m" or "p") end
  end
  -- mercadería sobre el mostrador
  V.ellipse(18,31,5,4,"R"); V.ellipse(30,31,5,4,"Y"); V.rect(40,26,48,33,"B"); V.rect(41,27,47,32,"t1")
  V.ellipse(52,31,3,3,"C")
end)

TILES[#TILES+1] = {"yunque", function(G)
  G.ellipse(16,28,11,3,"c4")
  G.rect(10,20,22,28,"b"); G.rect(10,20,22,21,"B")
  G.rect(7,12,25,16,"d"); G.rect(7,12,25,13,"s"); G.rect(13,17,19,19,"d"); G.rect(3,13,7,15,"d")
end}
TILES[#TILES+1] = {"barril", function(G)
  G.ellipse(16,28,9,3,"c4")
  G.rect(9,8,23,27,"B"); G.rect(9,8,11,27,"b"); G.rect(21,8,23,27,"b")
  G.rect(9,11,23,12,"d"); G.rect(9,22,23,23,"d"); G.ellipse(16,8,7,2,"t1")
end}
TILES[#TILES+1] = {"caja", function(G)
  G.ellipse(16,28,11,3,"c4")
  G.rect(6,10,26,27,"B"); G.rect(6,10,26,11,"t1"); G.rect(6,26,26,27,"b")
  G.rect(6,10,7,27,"b"); G.rect(25,10,26,27,"b")
  for i=0,15 do G.px(8+i, 12+i, "b") end
end}
TILES[#TILES+1] = {"farol", function(G)
  G.ellipse(16,29,6,2,"c4")
  G.rect(15,8,17,29,"a"); G.rect(13,28,19,29,"a")
  G.rect(11,2,21,9,"a"); G.rect(13,4,19,8,"fl"); G.px(16,1,"a")
end}
TILES[#TILES+1] = {"huesos", function(G)
  for _,b in ipairs({{6,20,14,24},{18,10,26,13},{12,26,22,28}}) do G.rect(b[1],b[2],b[3],b[4],"fw") end
  G.ellipse(23,22,5,4,"fw"); G.px(21,22,"K"); G.px(24,22,"K"); G.rect(21,25,25,26,"fw")
end}
TILES[#TILES+1] = {"suelo_guarida", function(G)
  G.rect(0,0,31,31,"t3")
  for y=0,31 do for x=0,31 do local n = noise(x,y,77); if n < 12 then G.px(x,y,"t2") elseif n < 16 then G.px(x,y,"r3") end end end
  for i=0,7 do G.px(5+i, 8+i, "r3"); G.px(20+i, 18-i, "r3"); G.px(10+i*2, 26, "r3") end
end}

-- ---------------------------------------------------------------------------------------
-- v3 (Pradera grande): trigales, tierra herida, mesetas con pared de roca, puentes,
-- edificios (granja, granero, molino), ruinas, menhires, muralla y Puerta Norte de la capital.
-- ---------------------------------------------------------------------------------------
local function goldenPx(G, x, y, seed)
  local n = noise(x, y, seed)
  G.px(x, y, n < 9 and "gp1" or (n < 15 and "gp3" or "gp2"))
end

-- trigal: hileras de espigas sobre tierra arada; el borde se funde con el pasto
local function wheatTile(mask)
  return function(G)
    G.rect(0,0,31,31,"s1")
    for y=0,31 do if y % 4 == 3 then G.rect(0,y,31,y,"s2") end end
    for x=1,31,3 do for y=1,31,4 do
      local o = (y // 4) % 2
      G.rect(x+o,y-1,x+o,y+2,"g2"); G.px(x+o,y-2,"g1"); G.px(x+o+1,y-1,"g1"); G.px(x+o,y+2,"g3")
    end end
    local depth = function(i, side) return 2 + (noise(i, side, 41 + mask) % 3) end
    sideBand(G, mask, depth, function(x, y) grassPx(G, x, y, 23) end)
  end
end

-- tierra herida por el Titán: seca, agrietada; el pasto se apaga en el borde
local function blightTile(mask)
  return function(G)
    G.rect(0,0,31,31,"x1")
    for y=0,31 do for x=0,31 do local n = noise(x,y,51); if n < 10 then G.px(x,y,"x2") elseif n < 13 then G.px(x,y,"x3") end end end
    -- grietas
    local cx, cy = 4 + noise(mask, 1, 9) % 8, 6 + noise(mask, 2, 9) % 10
    for i=0,18 do
      G.px(cx + i, cy + (noise(i, mask, 3) % 3) - 1 + i // 3, "x3")
      if i % 6 == 0 then G.px(cx + i, cy + i // 3 + 1, "x3"); G.px(cx + i + 1, cy + i // 3 + 2, "x3") end
    end
    local depth = function(i, side) return 3 + (noise(i, side, 61 + mask) % 4) end
    sideBand(G, mask, depth, function(x, y) G.px(x, y, noise(x, y, 5) < 50 and "c3" or "c4") end)
  end
end

-- pasto dorado (el "Dorada" de la Pradera): manchas que se funden con el pasto verde. En los
-- lados que no siguen siendo dorados el verde entra salpicado (difuminado), sin línea recta.
local function goldenTile(mask)
  return function(G)
    for y=0,31 do for x=0,31 do
      local d = 99
      if mask & 1 == 0 then d = math.min(d, y) end
      if mask & 2 == 0 then d = math.min(d, 31 - x) end
      if mask & 4 == 0 then d = math.min(d, 31 - y) end
      if mask & 8 == 0 then d = math.min(d, x) end
      local fade = d < 14 and (1 - d / 14) or 0
      if noise(x, y, 97) < fade * 100 then grassPx(G, x, y, 24) else goldenPx(G, x, y, 71) end
    end end
    for _,p in ipairs({{9,9},{21,12},{14,21},{24,22}}) do G.px(p[1],p[2],"g3"); G.px(p[1]-1,p[2]+1,"gp3"); G.px(p[1]+1,p[2]+1,"gp3") end
  end
end

-- meseta: el mismo pasto de siempre, con un filo de luz y una sombra fina donde termina
local function plateauTile(mask)
  return function(G)
    grassBase(G, 1)
    if mask & 1 == 0 then G.rect(0,0,31,0,"c4"); G.rect(0,1,31,2,"o4") end
    if mask & 2 == 0 then G.rect(31,0,31,31,"c4"); G.rect(29,0,30,31,"c3") end
    if mask & 8 == 0 then G.rect(0,0,0,31,"c4"); G.rect(1,0,2,31,"o4") end
    if mask & 4 == 0 then G.rect(0,30,31,31,"o4") end
  end
end

for m=0,15 do TILES[#TILES+1] = {"trigo_" .. m, wheatTile(m)} end
for m=0,15 do TILES[#TILES+1] = {"seco_" .. m, blightTile(m)} end
for m=0,15 do TILES[#TILES+1] = {"dorado_" .. m, goldenTile(m)} end
for m=0,15 do TILES[#TILES+1] = {"meseta_" .. m, plateauTile(m)} end

-- pared de roca de la meseta: dos filas (alta con el borde de pasto, baja con sombra)
local function cliff(row, side)
  return function(G)
    G.rect(0,0,31,31,"r2")
    for x=0,31 do
      local n = noise(x, row, 101)
      if x % 7 == 0 then G.rect(x,0,x,31,"r3") end
      if n < 18 then G.px(x, n % 31, "r1") end
    end
    for y=4,31,9 do G.rect(0,y,31,y,"r3") end
    if row == 1 then G.rect(0,0,31,3,"c2"); for x=0,31,2 do G.px(x,4,"c3") end; G.rect(0,4,31,4,"c4") end
    if row == 2 then G.rect(0,26,31,31,"c4"); G.rect(0,24,31,25,"r3") end
    if side == "i" then G.rect(0,0,2,31,"r3") end
    if side == "d" then G.rect(29,0,31,31,"r3") end
  end
end
for _, side in ipairs({"i", "c", "d"}) do
  TILES[#TILES+1] = {"cara_a_" .. side, cliff(1, side)}
  TILES[#TILES+1] = {"cara_b_" .. side, cliff(2, side)}
end
TILES[#TILES+1] = {"escalera", function(G)
  G.rect(0,0,31,31,"r2")
  for y=0,31,6 do G.rect(2,y,29,y+4,"r1"); G.rect(2,y+4,29,y+5,"r3") end
  G.rect(0,0,1,31,"r3"); G.rect(30,0,31,31,"r3")
end}

-- puentes de madera sobre el río
TILES[#TILES+1] = {"puente_h", function(G)
  G.rect(0,0,31,31,"a1"); G.rect(0,6,31,25,"B")
  for x=0,31,5 do G.rect(x,6,x,25,"b") end
  G.rect(0,6,31,7,"t1"); G.rect(0,24,31,25,"b"); G.rect(0,3,31,4,"b"); G.rect(0,27,31,28,"b")
end}
TILES[#TILES+1] = {"puente_v", function(G)
  G.rect(0,0,31,31,"a1"); G.rect(6,0,25,31,"B")
  for y=0,31,5 do G.rect(6,y,25,y,"b") end
  G.rect(6,0,7,31,"t1"); G.rect(24,0,25,31,"b"); G.rect(3,0,4,31,"b"); G.rect(27,0,28,31,"b")
end}

-- decoración pequeña (sin fondo)
local function deco(name, draw) TILES[#TILES+1] = {name, draw} end
deco("cerca_v", function(G)
  G.rect(13,0,18,31,"B"); G.rect(17,0,18,31,"b"); for _,y in ipairs({4,18}) do G.rect(11,y,20,y+2,"B"); G.rect(11,y+2,20,y+2,"b") end
end)
deco("espantapajaros", function(G)
  G.ellipse(16,29,6,2,"c4"); G.rect(15,10,17,29,"b"); G.rect(6,12,26,14,"b")
  G.rect(10,13,22,22,"B"); G.rect(10,13,22,13,"t1"); G.ellipse(16,7,5,5,"g1"); G.rect(11,2,21,4,"b"); G.rect(8,4,24,5,"b")
  G.px(14,7,"K"); G.px(18,7,"K"); G.rect(14,9,18,9,"K"); for _,x in ipairs({6,26}) do G.px(x,15,"g2"); G.px(x,16,"g1") end
end)
deco("heno", function(G)
  G.ellipse(16,27,12,3,"c4"); G.ellipse(16,18,12,10,"g2"); G.ellipse(14,15,9,7,"g1")
  for x=6,26,4 do G.rect(x,12,x,26,"g3") end; G.rect(4,18,28,19,"b")
end)
deco("pozo", function(G)
  G.ellipse(16,28,13,3,"c4"); G.rect(5,14,27,28,"r2"); G.rect(5,14,27,15,"r1"); G.ellipse(16,15,9,3,"a4")
  G.rect(5,4,7,15,"b"); G.rect(25,4,27,15,"b"); G.rect(3,2,29,5,"rf"); G.rect(3,5,29,5,"rd"); G.rect(14,6,18,9,"B")
  for y=18,26,4 do G.rect(5,y,27,y,"r3") end
end)
deco("carreta", function(G)
  G.ellipse(16,28,14,3,"c4"); G.rect(3,12,27,21,"B"); G.rect(3,12,27,13,"t1"); G.rect(3,21,27,21,"b")
  G.ellipse(8,23,5,5,"b"); G.ellipse(8,23,2,2,"B"); G.ellipse(23,23,5,5,"b"); G.ellipse(23,23,2,2,"B")
  G.ellipse(12,10,4,3,"g1"); G.ellipse(19,9,5,4,"g2"); G.rect(27,15,31,16,"b")
end)
deco("tocon", function(G)
  G.ellipse(16,26,10,3,"c4"); G.rect(8,16,23,25,"b"); G.ellipse(16,16,8,3,"t1"); G.ellipse(16,16,5,2,"t2"); G.ellipse(16,16,2,1,"t3")
  G.rect(8,16,9,25,"B")
end)
deco("bayas", function(G)
  G.ellipse(16,26,11,3,"c4"); G.ellipse(16,19,12,9,"o2"); G.ellipse(14,16,8,6,"o1")
  for _,p in ipairs({{10,18},{20,15},{15,21},{22,21},{12,13},{18,24}}) do G.px(p[1],p[2],"bb"); G.px(p[1]+1,p[2],"bb"); G.px(p[1],p[2]-1,"W") end
end)
local function flowerPatch(c1, c2)
  return function(G)
    for _,p in ipairs({{5,6},{12,4},{22,7},{8,15},{18,13},{26,16},{4,24},{14,23},{23,26},{29,4}}) do
      G.px(p[1],p[2]+1,"c4"); G.px(p[1],p[2],c1); G.px(p[1]-1,p[2],c2); G.px(p[1]+1,p[2],c2); G.px(p[1],p[2]-1,c2)
    end
  end
end
deco("flores_amarillas", flowerPatch("Y", "fl"))
deco("flores_blancas", flowerPatch("Y", "fw"))
deco("flores_moradas", flowerPatch("fw", "fv"))
deco("setas", function(G)
  for _,p in ipairs({{9,22,4},{19,25,5},{24,18,3},{14,15,3}}) do
    G.rect(p[1],p[2]-p[3]+2,p[1]+1,p[2]+2,"fw"); G.ellipse(p[1]+0.5,p[2]-p[3]+2,p[3],p[3]-1,"R"); G.px(p[1]-1,p[2]-p[3]+1,"W")
  end
end)
deco("juncos", function(G)
  for x=6,26,4 do G.rect(x,8 + (x % 3),x,28,"o3"); G.rect(x+1,10 + (x % 4),x+1,28,"o2"); G.rect(x,6 + (x % 3),x,8 + (x % 3),"b") end
end)
deco("nenufar", function(G)
  G.rect(0,0,31,31,"a1")
  for _,p in ipairs({{10,10,5},{22,20,4},{8,23,3}}) do G.ellipse(p[1],p[2],p[3],p[3]-1,"lp"); G.px(p[1],p[2]-p[3]+1,"a1"); G.px(p[1]+1,p[2]-p[3]+2,"a1") end
  G.ellipse(10,9,2,1,"fr"); G.px(10,8,"fw")
end)
deco("columna_rota", function(G)
  G.ellipse(16,29,9,2,"c4"); G.rect(9,26,23,29,"sw"); G.rect(11,8,21,26,"sw"); G.rect(11,8,13,26,"sd")
  for y=10,24,4 do G.rect(15,y,15,y+2,"sd") end; G.rect(11,6,16,8,"sw"); G.rect(17,4,21,8,"sw"); G.px(18,3,"sw")
  G.rect(4,27,8,29,"sd"); G.px(25,28,"sd")
end)
deco("muro_ruina", function(G)
  G.ellipse(16,29,15,2,"c4"); G.rect(0,12,31,28,"sw"); G.rect(0,26,31,28,"sd")
  for y=12,24,6 do G.rect(0,y,31,y,"sd"); for x=(y//6)%2*8,31,16 do G.rect(x,y,x,y+6,"sd") end end
  G.rect(0,8,10,12,"sw"); G.rect(18,4,28,12,"sw"); G.rect(10,10,18,12,"sd"); G.px(5,7,"o2"); G.px(22,3,"o2"); G.px(23,3,"o1")
end)
deco("hueso_grande", function(G)
  G.ellipse(16,26,13,3,"c4"); G.rect(4,18,28,22,"fw"); G.ellipse(4,18,3,3,"fw"); G.ellipse(4,23,3,3,"fw")
  G.ellipse(28,18,3,3,"fw"); G.ellipse(28,23,3,3,"fw"); G.rect(4,22,28,22,"S")
end)
deco("grieta", function(G)
  for i=0,24 do G.px(4 + i, 14 + (noise(i, 1, 7) % 4) - 2 + (i // 8), "x3"); if i % 5 == 0 then G.px(4 + i, 12 + i // 8, "x3") end end
end)
deco("senal", function(G)
  G.ellipse(16,29,5,2,"c4"); G.rect(15,6,17,29,"b"); G.rect(4,6,24,11,"B"); G.rect(24,7,28,10,"B"); G.px(29,8,"B"); G.px(29,9,"B")
  G.rect(4,6,24,6,"t1"); G.rect(8,14,26,18,"B"); G.rect(4,15,8,17,"B"); G.px(3,16,"B"); G.rect(8,14,26,14,"t1")
end)
deco("pino_chico", function(G)
  G.ellipse(16,29,8,2,"c4"); G.rect(15,24,17,29,"b")
  for i=0,2 do local y = 4 + i * 7; for r=0,6 do G.rect(16 - r - i, y + r, 16 + r + i, y + r, r < 2 and "pn" or "pd") end end
  G.px(15,5,"Gh"); G.px(13,12,"Gh"); G.px(12,19,"Gh")
end)
deco("arbusto_seco", function(G)
  G.ellipse(16,27,10,2,"x3")
  for i=0,8 do G.rect(16,26 - i * 2,16 + (i % 3) - 1,26 - i * 2,"dw"); G.px(16 - i,22 - i,"dw"); G.px(16 + i,21 - i,"dw") end
end)

-- objetos grandes cortados en tiles (ancho x alto en tiles)
local function addGrid(name, w, h, draw)
  for r=0,h-1 do for c=0,w-1 do
    TILES[#TILES+1] = {string.format("%s_%d_%d", name, r, c), slice(draw, c * 32, r * 32)}
  end end
end

addGrid("arbol_muerto", 2, 2, function(V)
  V.ellipse(32,58,14,4,"x3"); V.rect(28,30,35,57,"dw"); V.rect(28,30,29,57,"x3")
  for i=0,14 do V.px(28 - i, 32 - i, "dw"); V.px(27 - i, 32 - i, "dw"); V.px(36 + i, 28 - i, "dw"); V.px(37 + i, 28 - i, "dw") end
  for i=0,8 do V.px(20 - i, 20 - i // 2, "dw"); V.px(46 + i // 2, 16 - i, "dw"); V.px(32, 30 - i * 2, "dw"); V.px(33, 30 - i * 2, "dw") end
  V.px(14,13,"dw"); V.px(50,6,"dw")
end)
addGrid("roca_grande", 2, 2, function(V)
  V.ellipse(32,56,28,6,"c4"); V.ellipse(32,40,28,20,"r3"); V.ellipse(30,36,26,18,"r2"); V.ellipse(24,30,15,11,"r1")
  V.ellipse(44,44,9,5,"r3"); V.px(18,26,"S"); V.px(19,25,"S"); V.px(20,25,"S"); V.ellipse(46,26,5,3,"o2")
end)
addGrid("tienda_goblin", 2, 2, function(V)
  V.ellipse(32,58,26,4,"c4")
  for y=10,56 do local half = math.floor((y - 10) * 0.5); V.rect(32 - half, y, 32 + half, y, (y // 6) % 2 == 0 and "B" or "N") end
  V.rect(26,42,38,56,"K"); V.rect(31,4,33,12,"b"); V.rect(34,4,40,8,"R")
  for i=0,6 do V.px(12 + i * 6, 52, "fw") end
end)
addGrid("tronco_caido", 2, 1, function(V)
  V.ellipse(32,26,30,3,"c4"); V.rect(4,12,58,24,"b"); V.rect(4,12,58,14,"B"); V.ellipse(58,18,5,7,"t1"); V.ellipse(58,18,2,3,"t3")
  V.px(20,11,"o1"); V.px(21,10,"o2"); V.px(40,11,"o1"); V.ellipse(30,12,4,2,"o2")
end)
addGrid("menhir", 1, 2, function(V)
  V.ellipse(16,60,9,3,"c4"); V.rect(9,6,23,60,"r1"); V.rect(9,6,12,60,"r2"); V.rect(20,6,23,60,"r3"); V.ellipse(16,6,7,4,"r1")
  -- runas que brillan
  for _,y in ipairs({18,28,38,48}) do V.rect(14,y,18,y,"rn"); V.px(16,y-2,"rn"); V.px(16,y+2,"rn") end
end)
addGrid("pino", 2, 2, function(V)
  V.ellipse(32,59,14,4,"c4"); V.rect(30,46,33,58,"b")
  for i=0,3 do local y = 4 + i * 11; for r=0,12 do V.rect(32 - r - i * 2, y + r, 32 + r + i * 2, y + r, r < 3 and "pn" or "pd") end end
  V.px(30,6,"Gh"); V.px(26,17,"Gh"); V.px(24,29,"Gh"); V.px(22,41,"Gh")
end)
addGrid("arbol_dorado", 2, 2, function(V)
  V.ellipse(32,58,20,5,"c4"); V.rect(28,38,35,57,"b"); V.rect(28,38,29,57,"B")
  V.ellipse(32,27,28,23,"ad"); V.ellipse(31,24,26,20,"au"); V.ellipse(27,20,20,15,"g1"); V.ellipse(21,13,10,7,"gp1")
  for _,p in ipairs({{14,26},{46,22},{30,8},{20,34},{44,32}}) do V.ellipse(p[1],p[2],4,3,"au") end
end)

-- edificios 3x3: la fila de arriba (tejado) va en "encima" para pasar por detrás
addGrid("granja", 3, 3, function(V)
  V.ellipse(48,92,46,5,"c4")
  V.rect(8,44,87,90,"T"); V.rect(8,44,12,90,"t"); V.rect(8,86,87,90,"t")
  for x=8,87,10 do V.rect(x,44,x,86,"t") end
  V.rect(40,62,55,90,"b"); V.rect(42,64,53,90,"B"); V.px(51,77,"Y")
  V.rect(16,56,30,70,"b"); V.rect(18,58,28,68,"C"); V.rect(23,58,23,68,"b"); V.rect(18,63,28,63,"b")
  V.rect(64,56,78,70,"b"); V.rect(66,58,76,68,"C"); V.rect(71,58,71,68,"b"); V.rect(66,63,76,63,"b")
  for y=4,48 do local half = math.floor((y - 4) * 1.05); V.rect(48 - half, y, 48 + half, y, (y // 4) % 2 == 0 and "rf" or "rd") end
  V.rect(66,6,74,22,"r2"); V.rect(66,6,74,8,"r1"); V.ellipse(70,3,4,2,"S")
end)
addGrid("granero", 3, 3, function(V)
  V.ellipse(48,92,46,5,"c4")
  V.rect(6,36,89,90,"rf"); V.rect(6,36,10,90,"rd"); V.rect(85,36,89,90,"rd")
  for x=6,89,8 do V.rect(x,36,x,90,"rd") end
  V.rect(32,52,63,90,"fw"); V.rect(34,54,61,90,"rd"); for i=0,26 do V.px(34 + i, 54 + i, "fw"); V.px(61 - i, 54 + i, "fw") end
  for y=2,40 do local half = math.floor((y - 2) * 1.2); V.rect(48 - half, y, 48 + half, y, "sd") end
  V.rect(40,14,55,26,"b"); V.rect(42,16,53,26,"K")
end)
addGrid("molino", 3, 3, function(V)
  V.ellipse(48,92,34,5,"c4")
  for y=26,90 do local half = 14 + math.floor((y - 26) * 0.18); V.rect(48 - half, y, 48 + half, y, "sw"); V.px(48 - half, y, "sd"); V.px(48 + half, y, "sd") end
  for y=34,86,10 do V.rect(30,y,66,y,"sd") end
  V.rect(41,64,55,90,"b"); V.rect(43,66,53,90,"B"); V.rect(44,40,52,50,"b"); V.rect(45,41,51,49,"fl")
  for y=6,28 do local half = math.floor((y - 6) * 0.8); V.rect(48 - half, y, 48 + half, y, (y // 3) % 2 == 0 and "rf" or "rd") end
  V.ellipse(48,24,4,4,"b")
end)

-- muralla de la capital y su Puerta Norte (cerrada hasta que exista la ciudad)
deco("muro_alto", function(G)
  G.rect(0,0,31,31,"sw"); for y=0,31,8 do G.rect(0,y,31,y,"sd"); for x=(y//8)%2*8,31,16 do G.rect(x,y,x,y+8,"sd") end end
  for x=0,31,10 do G.rect(x,0,x+5,4,"sk") end; G.rect(0,0,31,1,"sk")
end)
deco("muro_bajo", function(G)
  G.rect(0,0,31,31,"sw"); for y=0,31,8 do G.rect(0,y,31,y,"sd"); for x=(y//8)%2*8,31,16 do G.rect(x,y,x,y+8,"sd") end end
  G.rect(0,26,31,31,"sk"); G.rect(0,31,31,31,"c4")
end)
addGrid("puerta_norte", 4, 3, function(V)
  V.rect(0,0,127,95,"sw")
  for y=0,95,8 do V.rect(0,y,127,y,"sd"); for x=(y//8)%2*8,127,16 do V.rect(x,y,x,y+8,"sd") end end
  for x=0,127,12 do V.rect(x,0,x+6,6,"sk") end
  -- torres a los lados
  V.rect(0,0,22,95,"sd"); V.rect(105,0,127,95,"sd"); V.rect(2,0,20,4,"sw"); V.rect(107,0,125,4,"sw")
  V.rect(8,20,14,32,"K"); V.rect(113,20,119,32,"K")
  -- arco con el portón de madera
  V.ellipse(64,52,30,26,"sk"); V.rect(34,52,94,95,"sk"); V.ellipse(64,54,26,22,"b"); V.rect(38,54,90,95,"b")
  for x=40,90,7 do V.rect(x,34,x,95,"B") end; V.rect(38,66,90,68,"d"); V.rect(38,82,90,84,"d")
  -- estandartes del reino
  for _,x in ipairs({28,96}) do V.rect(x-4,12,x+4,44,"M"); V.rect(x-4,12,x+4,14,"Y"); V.px(x,28,"Y"); V.px(x-1,29,"Y"); V.px(x+1,29,"Y"); V.rect(x-4,44,x,48,"M"); V.rect(x,44,x+4,46,"M") end
end)

-- v4_ciudad
-- ---------------------------------------------------------------------------------------
-- v4 (Aurelia, la capital): adoquines y canales con borde de piedra, losas y mosaico de la
-- plaza, casas con entramado de madera, casas de las órdenes de clase, catedral de Aethra,
-- posada, banco, lonja, forja enana, barrio élfico, castillo, muralla y decoración urbana.
-- ---------------------------------------------------------------------------------------

-- adoquines: piedras redondeadas con juntas, algunas con musgo
local function cobble(G, seed, moss)
  G.rect(0,0,31,31,"k3")
  for row=0,5 do
    local y0 = row * 6 - 1
    local off = (row % 2) * 4
    for col=-1,4 do
      local x0 = col * 8 + off
      local n = noise(col + 7, row + 3, seed)
      local c = n < 35 and "k1" or (n < 80 and "k2" or "x1")
      G.rect(x0 + 1, y0 + 1, x0 + 6, y0 + 4, c)
      G.px(x0 + 1, y0 + 1, "k3"); G.px(x0 + 6, y0 + 1, "k3"); G.px(x0 + 1, y0 + 4, "k3"); G.px(x0 + 6, y0 + 4, "k3")
      G.px(x0 + 2, y0 + 2, "m1")
      if moss and n % 7 == 0 then G.px(x0 + 3, y0 + 5, "o2"); G.px(x0 + 4, y0 + 5, "o1") end
    end
  end
end
TILES[#TILES+1] = {"adoquin", function(G) cobble(G, 3, false) end}
TILES[#TILES+1] = {"adoquin_b", function(G) cobble(G, 9, false) end}
TILES[#TILES+1] = {"adoquin_musgo", function(G) cobble(G, 5, true) end}

-- adoquín con bordillo: donde el vecino no es calle, una franja de pasto detrás de la piedra
local function cobbleEdge(mask)
  return function(G)
    cobble(G, 11 + mask, false)
    sideBand(G, mask, function() return 6 end, function(x, y) G.px(x, y, "k4") end)
    sideBand(G, mask, function() return 5 end, function(x, y) G.px(x, y, "sd") end)
    sideBand(G, mask, function() return 4 end, function(x, y) grassPx(G, x, y, 23) end)
  end
end
for m=0,15 do TILES[#TILES+1] = {"adoquin_" .. m, cobbleEdge(m)} end

-- canal: agua entre muros de piedra
local function canalTile(mask)
  return function(G)
    G.rect(0,0,31,31,"a2")
    for _,p in ipairs({{5,9},{19,6},{11,20},{23,25}}) do G.rect(p[1],p[2],p[1]+4,p[2],"a3"); G.rect(p[1]+1,p[2]+1,p[1]+3,p[2]+1,"a1") end
    sideBand(G, mask, function() return 8 end, function(x, y) G.px(x, y, "a4") end)
    sideBand(G, mask, function() return 7 end, function(x, y) G.px(x, y, "sk") end)
    sideBand(G, mask, function() return 6 end, function(x, y) G.px(x, y, "sd") end)
    sideBand(G, mask, function() return 4 end, function(x, y) G.px(x, y, (x + y) % 9 == 0 and "sd" or "sw") end)
  end
end
for m=0,15 do TILES[#TILES+1] = {"canal_" .. m, canalTile(m)} end

-- losas grandes de mármol (plaza, atrio de la catedral)
TILES[#TILES+1] = {"losa", function(G)
  G.rect(0,0,31,31,"m1")
  G.rect(0,15,31,16,"m3"); G.rect(15,0,16,31,"m3"); G.rect(0,0,31,0,"m2"); G.rect(0,0,0,31,"m2")
  for _,p in ipairs({{4,5},{22,8},{7,24},{25,21}}) do G.px(p[1],p[2],"m2") end
  G.px(3,3,"Ph"); G.px(19,19,"Ph")
end}
TILES[#TILES+1] = {"losa_b", function(G)
  G.rect(0,0,31,31,"m2")
  G.rect(0,15,31,16,"m3"); G.rect(15,0,16,31,"m3")
  for _,p in ipairs({{5,4},{20,10},{9,22},{26,26}}) do G.px(p[1],p[2],"m1") end
end}
-- mosaico con rombos azules y dorados (anillo de la plaza del Pilar)
TILES[#TILES+1] = {"mosaico", function(G)
  G.rect(0,0,31,31,"m1")
  for i=0,15 do
    G.px(16 - i, i, "bb"); G.px(15 + i, i, "bb"); G.px(16 - i, 31 - i, "bb"); G.px(15 + i, 31 - i, "bb")
  end
  G.ellipse(15.5,15.5,5,5,"go"); G.ellipse(15.5,15.5,3,3,"bb"); G.ellipse(15.5,15.5,1,1,"Ph")
  for _,p in ipairs({{3,3},{28,3},{3,28},{28,28}}) do G.px(p[1],p[2],"god") end
end}

-- ---------------------------------------------------------------------------------------
-- edificios: generador común (muros, ventanas, puerta y tejado) + detalles de cada uno
-- ---------------------------------------------------------------------------------------
local function wallFill(V, x0, y0, x1, y1, style)
  if style == "yeso" then
    V.rect(x0, y0, x1, y1, "wp"); V.rect(x1 - 3, y0, x1, y1, "wpd")
    for x = x0, x1, 14 do V.rect(x, y0, x + 1, y1, "tb") end
    V.rect(x0, y0, x1, y0 + 1, "tb"); V.rect(x0, (y0 + y1) // 2, x1, (y0 + y1) // 2 + 1, "tb"); V.rect(x0, y1 - 1, x1, y1, "tb")
  elseif style == "piedra" then
    V.rect(x0, y0, x1, y1, "sw"); V.rect(x1 - 3, y0, x1, y1, "sd")
    for y = y0, y1, 6 do V.rect(x0, y, x1, y, "sd"); for x = x0 + ((y - y0) // 6 % 2) * 6, x1, 12 do V.rect(x, y, x, y + 6, "sd") end end
  elseif style == "marmol" then
    V.rect(x0, y0, x1, y1, "m1"); V.rect(x1 - 3, y0, x1, y1, "m2")
    for y = y0, y1, 8 do V.rect(x0, y, x1, y, "m2") end
  elseif style == "oscuro" then
    V.rect(x0, y0, x1, y1, "n"); V.rect(x1 - 3, y0, x1, y1, "b")
    for x = x0, x1, 5 do V.rect(x, y0, x, y1, "b") end
  elseif style == "enano" then
    V.rect(x0, y0, x1, y1, "sd"); V.rect(x1 - 3, y0, x1, y1, "sk")
    for y = y0, y1, 7 do V.rect(x0, y, x1, y, "sk"); for x = x0 + ((y - y0) // 7 % 2) * 7, x1, 14 do V.rect(x, y, x, y + 7, "sk") end end
  elseif style == "elfico" then
    V.rect(x0, y0, x1, y1, "Ph"); V.rect(x1 - 3, y0, x1, y1, "p")
    for x = x0 + 6, x1, 16 do for y = y0, y1, 3 do V.px(x + (y // 3) % 2, y, "lp") end end
  end
end

local function window(V, x, y, glow)
  V.rect(x - 1, y - 1, x + 8, y + 10, "tb")
  V.rect(x, y, x + 7, y + 9, glow and "wn" or "gl")
  V.rect(x, y + 4, x + 7, y + 4, "tb"); V.rect(x + 3, y, x + 4, y + 9, "tb")
  V.px(x + 1, y + 1, "Ph"); V.rect(x - 1, y + 10, x + 8, y + 11, "sd")
end

local function door(V, cx, y1, w, h, c, arch)
  local x0, x1 = cx - w // 2, cx + w // 2
  V.rect(x0 - 2, y1 - h - 2, x1 + 2, y1, "tb")
  if arch then V.ellipse(cx, y1 - h, w // 2 + 2, 5, "tb"); V.ellipse(cx, y1 - h, w // 2, 4, c) end
  V.rect(x0, y1 - h, x1, y1, c); V.rect(cx, y1 - h, cx, y1, "b"); V.px(cx - 2, y1 - h // 2, "go"); V.px(cx + 2, y1 - h // 2, "go")
end

-- tejado a dos aguas (triángulo con tejas) o a cuatro aguas (trapecio)
local function roof(V, W, top, bottom, c1, c2, hip)
  for y = top, bottom do
    local half
    if hip then half = math.min(W // 2 + 2, 14 + math.floor((y - top) * 1.6)) else half = math.floor((y - top) * (W / 2 + 3) / (bottom - top)) end
    local cx = W // 2
    V.rect(cx - half, y, cx + half, y, ((y - top) // 3) % 2 == 0 and c1 or c2)
    V.px(cx - half, y, c2)
  end
  V.rect(2, bottom + 1, W - 3, bottom + 2, "sk")
end

local function building(name, w, h, o)
  addGrid(name, w, h, function(V)
    local W, H = w * 32, h * 32
    local wallTop = o.wallTop or math.floor(H * 0.42)
    V.ellipse(W // 2, H - 4, W // 2 - 2, 5, "c4")
    wallFill(V, 4, wallTop, W - 5, H - 3, o.wall)
    -- ventanas en dos filas si hay altura
    local rows = o.rows or 1
    for r = 0, rows - 1 do
      local wy = wallTop + 8 + r * 22
      for x = 12, W - 22, o.winStep or 22 do
        if math.abs(x + 4 - W // 2) > (o.doorW or 14) // 2 + 6 or r < rows - 1 then window(V, x, wy, o.glow) end
      end
    end
    door(V, W // 2, H - 3, o.doorW or 14, o.doorH or 20, o.doorC or "B", o.arch)
    if o.roof then roof(V, W, o.roofTop or 2, wallTop, o.roof[1], o.roof[2], o.hip) end
    if o.chimney then V.rect(W - 26, o.roofTop or 4, W - 18, wallTop - 10, "sd"); V.rect(W - 27, (o.roofTop or 4) - 1, W - 17, (o.roofTop or 4) + 1, "sk") end
    if o.extra then o.extra(V, W, H, wallTop) end
  end)
end

-- casas del pueblo
building("casa_roja", 3, 3, {wall="yeso", roof={"rf","rd"}, chimney=true})
building("casa_azul", 3, 3, {wall="yeso", roof={"pb","pbd"}})
building("casa_verde", 3, 3, {wall="yeso", roof={"pg","pgd"}, chimney=true})
building("casa_piedra", 3, 3, {wall="piedra", roof={"pz","pzd"}, chimney=true})
building("casa_alta_a", 2, 3, {wall="yeso", roof={"rf","rd"}, rows=2, wallTop=30, winStep=18})
building("casa_alta_b", 2, 3, {wall="piedra", roof={"pb","pbd"}, rows=2, wallTop=30, winStep=18})

-- posada El Grifo Dorado: balcón con flores y jarra pintada
building("posada", 4, 3, {wall="yeso", roof={"rf","rd"}, hip=true, chimney=true, glow=true, doorW=18, arch=true, extra=function(V, W, H, wt)
  V.rect(10, wt + 20, W - 11, wt + 22, "B"); for x = 12, W - 12, 4 do V.rect(x, wt + 22, x, wt + 28, "b") end
  for x = 14, W - 16, 10 do V.ellipse(x, wt + 19, 3, 2, "fr"); V.px(x + 2, wt + 18, "fl") end
  V.ellipse(W // 2, wt + 6, 7, 5, "go"); V.rect(W // 2 - 4, wt + 4, W // 2 + 3, wt + 10, "Y"); V.rect(W // 2 + 4, wt + 6, W // 2 + 6, wt + 8, "Y"); V.rect(W // 2 - 4, wt + 3, W // 2 + 3, wt + 4, "fw")
end})

-- cuartel del Acero (guerrero): almenas, estandartes rojos y espadas cruzadas
building("cuartel", 4, 3, {wall="piedra", wallTop=22, doorW=20, doorH=24, doorC="b", arch=true, extra=function(V, W, H, wt)
  V.rect(2, 8, W - 3, wt, "sd"); V.rect(2, 8, W - 3, 10, "sw")
  for x = 2, W - 8, 12 do V.rect(x, 2, x + 6, 9, "sd"); V.rect(x, 2, x + 6, 3, "sw") end
  for _, x in ipairs({20, W - 21}) do V.rect(x - 5, wt + 4, x + 5, wt + 34, "R"); V.rect(x - 5, wt + 4, x + 5, wt + 6, "go"); V.rect(x - 5, wt + 34, x, wt + 38, "R"); V.px(x, wt + 18, "go"); V.px(x - 1, wt + 19, "go"); V.px(x + 1, wt + 19, "go") end
  for i = 0, 12 do V.px(W // 2 - 6 + i, wt + 4 + i, "S"); V.px(W // 2 + 6 - i, wt + 4 + i, "S") end
  V.rect(W // 2 - 8, wt + 14, W // 2 - 4, wt + 15, "go"); V.rect(W // 2 + 4, wt + 14, W // 2 + 8, wt + 15, "go")
end})

-- torre Arcana (mago): torre redonda con tejado cónico estrellado y ventanas que brillan
addGrid("torre_arcana", 2, 4, function(V)
  local W, H = 64, 128
  V.ellipse(32, H - 4, 26, 5, "c4")
  for y = 44, H - 3 do local half = 22; V.rect(32 - half, y, 32 + half, y, "sw"); V.rect(32 + half - 6, y, 32 + half, y, "sd"); V.px(32 - half, y, "sd") end
  for y = 50, H - 6, 10 do V.rect(10, y, 54, y, "sd") end
  V.rect(10, 44, 54, 47, "pv")
  for _, y in ipairs({58, 80}) do V.ellipse(32, y, 5, 7, "tb"); V.ellipse(32, y, 3, 5, "rn"); V.px(31, y - 3, "Ph") end
  door(V, 32, H - 3, 12, 18, "pvd", true)
  for y = 2, 46 do local half = math.floor((y - 2) * 0.62); V.rect(32 - half, y, 32 + half, y, ((y // 4) % 2 == 0) and "pv" or "pvd") end
  for _, p in ipairs({{30, 16}, {24, 32}, {38, 28}, {33, 40}, {26, 42}}) do V.px(p[1], p[2], "go"); V.px(p[1] + 1, p[2], "Y") end
  V.rect(31, 0, 32, 4, "go")
end)

-- campo de tiro del Halcón (arquero): casa de tejado verde con arco pintado
building("casa_arqueros", 3, 3, {wall="yeso", roof={"pg","pgd"}, extra=function(V, W, H, wt)
  for i = 0, 14 do local a = (i / 14) * math.pi; V.px(W // 2 - 10 + math.floor(math.sin(a) * 6), wt + 6 + i, "B") end
  V.rect(W // 2 - 9, wt + 6, W // 2 - 9, wt + 20, "W"); V.rect(W // 2 - 9, wt + 13, W // 2 + 6, wt + 13, "b"); V.px(W // 2 + 7, wt + 13, "S")
end})

-- la Sombra Callada (pícaro): madera oscura, tejado de pizarra y farol violeta
building("taberna_sombra", 3, 3, {wall="oscuro", roof={"pz","pzd"}, doorC="l", extra=function(V, W, H, wt)
  V.rect(W // 2 + 12, wt + 18, W // 2 + 13, wt + 30, "a"); V.rect(W // 2 + 10, wt + 30, W // 2 + 15, wt + 36, "a"); V.rect(W // 2 + 11, wt + 31, W // 2 + 14, wt + 35, "fv")
  V.ellipse(W // 2, wt + 8, 5, 5, "go"); V.ellipse(W // 2 + 2, wt + 7, 4, 4, "n")
end})

-- capilla de la Luz (sacerdote): mármol, tejado azul, campanario y sol dorado
building("capilla", 3, 3, {wall="marmol", roof={"pb","pbd"}, doorC="go", arch=true, wallTop=40, roofTop=12, extra=function(V, W, H, wt)
  V.rect(W // 2 - 6, 0, W // 2 + 5, 16, "m1"); V.rect(W // 2 - 6, 0, W // 2 + 5, 2, "pbd"); V.ellipse(W // 2, 9, 3, 3, "go"); V.px(W // 2, 6, "god")
  V.ellipse(W // 2, wt + 10, 6, 6, "go"); for i = 0, 7 do local a = i * math.pi / 4; V.px(W // 2 + math.floor(math.cos(a) * 9), wt + 10 + math.floor(math.sin(a) * 9), "go") end
end})

-- catedral de Aethra: rosetón, dos agujas, portón dorado y escalinata
addGrid("catedral", 6, 6, function(V)
  local W, H = 192, 192
  V.ellipse(96, H - 4, 92, 6, "c4")
  -- nave
  V.rect(14, 70, W - 15, H - 14, "m1"); V.rect(W - 22, 70, W - 15, H - 14, "m2")
  for y = 76, H - 16, 10 do V.rect(14, y, W - 15, y, "m2") end
  -- contrafuertes
  for _, x in ipairs({14, 48, 136, W - 24}) do V.rect(x, 74, x + 8, H - 14, "m2"); V.rect(x, 74, x + 2, H - 14, "Ph") end
  -- tejado de la nave
  for y = 40, 72 do local half = 60 + (y - 40); V.rect(96 - half, y, 96 + half, y, ((y // 4) % 2 == 0) and "pb" or "pbd") end
  -- agujas
  for _, cx in ipairs({30, W - 31}) do
    V.rect(cx - 14, 46, cx + 14, H - 14, "m1"); V.rect(cx + 8, 46, cx + 14, H - 14, "m2")
    for y = 2, 50 do local half = math.floor((y - 2) * 0.3); V.rect(cx - half, y, cx + half, y, ((y // 5) % 2 == 0) and "pz" or "pzd") end
    V.rect(cx - 1, 0, cx, 4, "go")
    for _, y in ipairs({70, 100, 130}) do V.ellipse(cx, y, 4, 7, "tb"); V.ellipse(cx, y, 2, 5, "gl") end
  end
  -- rosetón de colores
  V.ellipse(96, 96, 24, 24, "m3"); V.ellipse(96, 96, 21, 21, "gl")
  for i = 0, 11 do local a = i * math.pi / 6; for r = 4, 20 do V.px(96 + math.floor(math.cos(a) * r), 96 + math.floor(math.sin(a) * r), ({"R", "go", "bb", "lp"})[i % 4 + 1]) end end
  V.ellipse(96, 96, 6, 6, "go"); V.ellipse(96, 96, 3, 3, "Ph")
  -- portón dorado
  V.ellipse(96, 140, 20, 12, "m3"); V.rect(76, 140, 116, H - 14, "m3"); V.ellipse(96, 141, 17, 10, "god"); V.rect(79, 141, 113, H - 14, "god")
  V.rect(80, 142, 95, H - 15, "go"); V.rect(97, 142, 112, H - 15, "go"); V.rect(96, 140, 96, H - 14, "god")
  -- escalinata
  for i = 0, 3 do V.rect(66 - i * 4, H - 14 + i * 3, 126 + i * 4, H - 12 + i * 3, i % 2 == 0 and "m2" or "m1") end
end)

-- banco Real: columnas, frontón y moneda de oro
building("banco", 4, 3, {wall="marmol", wallTop=34, doorC="god", arch=false, doorW=16, extra=function(V, W, H, wt)
  for y = 6, wt do local half = math.floor((y - 6) * (W / 2) / (wt - 6)); V.rect(W // 2 - half, y, W // 2 + half, y, "m2") end
  V.rect(4, wt - 2, W - 5, wt + 2, "m3")
  V.ellipse(W // 2, wt - 12, 8, 7, "go"); V.ellipse(W // 2, wt - 12, 5, 4, "Y"); V.rect(W // 2 - 1, wt - 15, W // 2, wt - 9, "god")
  for _, x in ipairs({14, 34, W - 41, W - 21}) do V.rect(x, wt + 4, x + 6, H - 6, "m1"); V.rect(x + 5, wt + 4, x + 6, H - 6, "m3"); V.rect(x - 1, wt + 2, x + 7, wt + 4, "m3") end
end})

-- lonja del mercado: tejado sobre columnas, toldos y género
addGrid("lonja", 4, 3, function(V)
  local W, H = 128, 96
  V.ellipse(64, H - 4, 62, 5, "c4")
  roof(V, W, 2, 34, "rf", "rd", true)
  for _, x in ipairs({8, 40, 84, 116}) do V.rect(x, 36, x + 4, H - 6, "tb") end
  V.rect(6, 34, W - 7, 38, "B")
  for x = 6, W - 7 do local s = (x // 6) % 2 == 0; for y = 39, 44 do V.px(x, y, s and "R" or "fw") end end
  V.rect(12, 62, W - 13, 72, "B"); V.rect(12, 62, W - 13, 63, "t1")
  for i, c in ipairs({"R", "Y", "lp", "au", "fv", "C", "fr", "go"}) do V.ellipse(18 + (i - 1) * 13, 59, 4, 3, c) end
  V.rect(12, 72, W - 13, 80, "b")
end)

-- forja enana: piedra oscura, chimenea humeante y puerta encendida
building("forja_enana", 3, 3, {wall="enano", roof={"pz","pzd"}, hip=true, doorC="O", doorW=18, arch=true, extra=function(V, W, H, wt)
  V.rect(W - 30, 0, W - 18, wt - 6, "sk"); V.rect(W - 31, 0, W - 17, 3, "sd"); V.ellipse(W - 24, 0, 6, 3, "s")
  V.rect(W // 2 - 7, H - 21, W // 2 + 7, H - 4, "Oh"); V.rect(W // 2 - 5, H - 15, W // 2 + 5, H - 4, "Y")
  V.rect(W // 2 - 8, wt + 6, W // 2 + 8, wt + 9, "d"); V.rect(W // 2 - 4, wt + 10, W // 2 + 4, wt + 12, "d"); V.rect(W // 2 - 11, wt + 6, W // 2 - 8, wt + 8, "d")
end})

-- casas élficas: madera blanca, ventanas en arco y tejado de hojas plateadas
addGrid("casa_elfica", 3, 3, function(V)
  local W, H = 96, 96
  V.ellipse(48, H - 4, 44, 5, "c4")
  wallFill(V, 10, 42, W - 11, H - 4, "elfico")
  for _, x in ipairs({22, W - 28}) do V.ellipse(x, 58, 5, 8, "tb"); V.ellipse(x, 59, 4, 7, "rn"); V.px(x - 1, 54, "Ph") end
  door(V, 48, H - 4, 14, 22, "B", true)
  V.ellipse(48, 30, 46, 22, "agd"); V.ellipse(46, 26, 42, 18, "ag"); V.ellipse(36, 18, 18, 9, "agh")
  for _, p in ipairs({{20, 30}, {70, 22}, {50, 12}, {82, 34}, {14, 40}}) do V.ellipse(p[1], p[2], 5, 3, "agd") end
  for _, p in ipairs({{26, 22}, {60, 30}, {74, 16}}) do V.px(p[1], p[2], "rn") end
end)
-- árbol plateado (barrio élfico)
addGrid("arbol_plata", 3, 3, function(V)
  local W, H = 96, 96
  V.ellipse(48, H - 6, 30, 6, "c4")
  V.rect(42, 50, 54, H - 6, "m3"); V.rect(42, 50, 45, H - 6, "Ph"); V.rect(36, H - 10, 60, H - 6, "m3")
  V.ellipse(48, 36, 44, 32, "agd"); V.ellipse(46, 32, 40, 28, "ag"); V.ellipse(38, 24, 24, 16, "agh")
  for _, p in ipairs({{20, 40}, {74, 30}, {50, 10}, {30, 54}, {68, 52}, {58, 22}, {16, 26}}) do V.ellipse(p[1], p[2], 6, 4, "agd") end
  for _, p in ipairs({{28, 30}, {62, 40}, {44, 18}, {72, 22}, {24, 50}, {54, 56}}) do V.px(p[1], p[2], "rn"); V.px(p[1] + 1, p[2], "Ph") end
end)

-- castillo (fondo, al norte detrás de la catedral)
addGrid("castillo", 8, 4, function(V)
  local W, H = 256, 128
  V.rect(0, 40, W - 1, H - 1, "sw")
  for y = 40, H - 1, 8 do V.rect(0, y, W - 1, y, "sd"); for x = ((y - 40) // 8 % 2) * 8, W - 1, 16 do V.rect(x, y, x, y + 8, "sd") end end
  for x = 0, W - 1, 12 do V.rect(x, 34, x + 6, 41, "sw"); V.rect(x, 34, x + 6, 35, "Ph") end
  -- torre del homenaje
  V.rect(92, 10, 163, H - 1, "sw"); V.rect(150, 10, 163, H - 1, "sd")
  for y = 0, 14 do local half = math.floor(y * 2.6); V.rect(128 - half, y, 128 + half, y, ((y // 3) % 2 == 0) and "pb" or "pbd") end
  for _, x in ipairs({104, 124, 144}) do V.rect(x, 40, x + 7, 54, "K"); V.rect(x + 1, 41, x + 6, 53, "wn") end
  -- torres de las esquinas
  for _, cx in ipairs({18, W - 19}) do
    V.rect(cx - 16, 20, cx + 16, H - 1, "sw"); V.rect(cx + 8, 20, cx + 16, H - 1, "sd")
    for y = 0, 22 do local half = math.floor(y * 0.75); V.rect(cx - half, y, cx + half, y, ((y // 3) % 2 == 0) and "pb" or "pbd") end
    V.rect(cx, -2, cx + 1, 2, "go")
  end
  -- portón y estandartes
  V.ellipse(128, 96, 18, 12, "sk"); V.rect(110, 96, 146, H - 1, "sk"); V.rect(113, 97, 143, H - 1, "b")
  for _, x in ipairs({70, 186}) do V.rect(x - 6, 50, x + 6, 96, "M"); V.rect(x - 6, 50, x + 6, 53, "go"); V.ellipse(x, 70, 4, 4, "go"); V.rect(x - 6, 96, x, 102, "M") end
end)

-- torre de la muralla
addGrid("torre_muralla", 2, 2, function(V)
  V.ellipse(32, 60, 28, 4, "c4")
  V.rect(4, 10, 59, 62, "sw"); V.rect(48, 10, 59, 62, "sd")
  for y = 14, 60, 8 do V.rect(4, y, 59, y, "sd") end
  for x = 4, 54, 11 do V.rect(x, 2, x + 6, 11, "sw"); V.rect(x, 2, x + 6, 3, "Ph") end
  V.rect(26, 24, 31, 38, "K")
end)

-- muralla vista de lado (bordes este y oeste)
deco("muro_v", function(G)
  G.rect(4, 0, 27, 31, "sw"); G.rect(20, 0, 27, 31, "sd"); G.rect(4, 0, 6, 31, "Ph")
  for y = 0, 31, 8 do G.rect(4, y, 27, y, "sd") end
  for y = 2, 31, 8 do G.rect(0, y, 4, y + 4, "sw"); G.rect(27, y, 31, y + 4, "sd") end
end)

-- decoración urbana
deco("banco_plaza", function(G)
  G.ellipse(16, 27, 13, 2, "c4"); G.rect(3, 14, 28, 17, "B"); G.rect(3, 14, 28, 14, "t1"); G.rect(3, 19, 28, 22, "B"); G.rect(3, 22, 28, 22, "b")
  for _, x in ipairs({5, 25}) do G.rect(x, 22, x + 2, 27, "a") end
end)
deco("maceta", function(G)
  G.ellipse(16, 28, 8, 2, "c4"); G.rect(10, 18, 22, 28, "ad"); G.rect(10, 18, 22, 19, "au"); G.rect(19, 18, 22, 28, "rd")
  G.ellipse(16, 13, 8, 6, "o2"); G.ellipse(14, 11, 5, 4, "o1")
  for _, p in ipairs({{12, 10, "fr"}, {18, 8, "fl"}, {20, 13, "fr"}, {14, 15, "fv"}}) do G.px(p[1], p[2], p[3]); G.px(p[1] + 1, p[2], p[3]) end
end)
deco("seto", function(G)
  G.ellipse(16, 28, 15, 2, "c4"); G.rect(0, 10, 31, 27, "o2"); G.rect(0, 10, 31, 13, "o1"); G.rect(0, 24, 31, 27, "o3")
  for _, p in ipairs({{4, 15}, {12, 19}, {22, 16}, {27, 21}}) do G.px(p[1], p[2], "o4") end
end)
deco("diana", function(G)
  G.ellipse(16, 28, 9, 2, "c4"); G.rect(14, 20, 17, 28, "b")
  G.ellipse(16, 13, 11, 11, "B"); G.ellipse(16, 13, 9, 9, "fw"); G.ellipse(16, 13, 6, 6, "R"); G.ellipse(16, 13, 3, 3, "fw"); G.ellipse(16, 13, 1, 1, "R")
  for i = 0, 5 do G.px(22 + i, 8 - i, "b") end; G.px(28, 2, "W")
end)
deco("cerca_hierro", function(G)
  G.rect(0, 12, 31, 13, "a"); G.rect(0, 24, 31, 25, "a")
  for x = 1, 31, 5 do G.rect(x, 8, x + 1, 28, "a"); G.px(x, 7, "go") end
end)
deco("puente_piedra_h", function(G)
  G.rect(0, 0, 31, 31, "sw"); for y = 4, 28, 6 do G.rect(0, y, 31, y, "sd") end
  G.rect(0, 0, 31, 3, "sk"); G.rect(0, 28, 31, 31, "sk"); G.rect(0, 1, 31, 2, "m1"); G.rect(0, 29, 31, 30, "m1")
end)
deco("puente_piedra_v", function(G)
  G.rect(0, 0, 31, 31, "sw"); for x = 4, 28, 6 do G.rect(x, 0, x, 31, "sd") end
  G.rect(0, 0, 3, 31, "sk"); G.rect(28, 0, 31, 31, "sk"); G.rect(1, 0, 2, 31, "m1"); G.rect(29, 0, 30, 31, "m1")
end)
deco("guirnalda", function(G)
  for x = 0, 31 do local y = 6 + math.floor(math.sin(x / 31 * math.pi) * 5); G.px(x, y, "b") end
  for i, c in ipairs({"R", "go", "bb", "lp", "fr"}) do local x = (i - 1) * 6 + 3; local y = 7 + math.floor(math.sin(x / 31 * math.pi) * 5); G.rect(x - 2, y, x + 2, y, c); G.rect(x - 1, y + 1, x + 1, y + 2, c); G.px(x, y + 3, c) end
end)
addGrid("estatua", 1, 2, function(V)
  V.ellipse(16, 60, 12, 3, "c4"); V.rect(5, 46, 26, 60, "m2"); V.rect(5, 46, 26, 48, "m1")
  V.rect(10, 22, 21, 45, "sd"); V.rect(10, 22, 13, 45, "sw"); V.ellipse(16, 16, 6, 6, "sd"); V.ellipse(15, 15, 4, 4, "sw")
  V.rect(22, 4, 23, 40, "sw"); V.rect(19, 14, 26, 15, "sd")
end)
-- puestos del mercado con toldos de colores
local function stall(stripe, stripeD)
  return function(V)
    V.ellipse(32, 59, 28, 4, "c4")
    V.rect(6, 34, 57, 55, "B"); V.rect(6, 34, 57, 36, "t1"); V.rect(6, 52, 57, 55, "b")
    V.rect(8, 10, 10, 52, "b"); V.rect(53, 10, 55, 52, "b")
    for x = 4, 59 do local s = math.floor(x / 6) % 2 == 0; for y = 6, 16 do V.px(x, y, s and stripe or "fw") end
      if x % 6 < 3 then V.px(x, 17, s and stripe or "fw"); V.px(x, 18, s and stripeD or "p") end end
  end
end
addBig("puesto_rojo", function(V) stall("R", "r")(V); V.ellipse(18, 31, 5, 4, "R"); V.ellipse(30, 31, 5, 4, "au"); V.ellipse(44, 31, 5, 4, "lp") end)
addBig("puesto_verde", function(V) stall("lp", "o2")(V); V.rect(14, 26, 22, 33, "fw"); V.rect(28, 26, 36, 33, "Y"); V.ellipse(46, 31, 5, 4, "fv") end)

-- diligencia: carruaje con caballo (viaje rápido entre la capital y las aldeas)
addGrid("diligencia", 3, 2, function(V)
  V.ellipse(48, 60, 44, 4, "c4")
  -- caballo a la izquierda
  V.ellipse(18, 36, 12, 7, "B"); V.ellipse(18, 35, 10, 5, "N"); V.rect(8, 18, 13, 34, "B"); V.ellipse(8, 18, 5, 4, "B")
  V.px(6, 17, "K"); V.rect(4, 19, 5, 20, "b"); V.rect(9, 12, 10, 15, "b"); V.rect(12, 16, 14, 30, "b")
  for _, x in ipairs({10, 14, 22, 26}) do V.rect(x, 42, x + 1, 58, "b"); V.rect(x, 57, x + 2, 58, "K") end
  V.rect(28, 30, 31, 33, "b")
  -- carruaje
  V.rect(34, 14, 90, 46, "M"); V.rect(34, 14, 90, 16, "go"); V.rect(34, 44, 90, 46, "god"); V.rect(84, 14, 90, 46, "m")
  V.rect(32, 8, 92, 13, "b"); V.rect(32, 8, 92, 9, "B")
  V.rect(42, 20, 54, 32, "tb"); V.rect(43, 21, 53, 31, "gl"); V.rect(66, 20, 78, 32, "tb"); V.rect(67, 21, 77, 31, "gl")
  V.rect(58, 18, 62, 42, "m"); V.px(60, 30, "go")
  for _, cx in ipairs({44, 80}) do V.ellipse(cx, 50, 9, 9, "b"); V.ellipse(cx, 50, 6, 6, "B"); V.ellipse(cx, 50, 2, 2, "go"); for i = 0, 3 do local a = i * math.pi / 4; V.px(cx + math.floor(math.cos(a) * 5), 50 + math.floor(math.sin(a) * 5), "b") end end
  -- maletas en el techo
  V.rect(46, 2, 58, 8, "B"); V.rect(46, 2, 58, 3, "t1"); V.rect(64, 4, 74, 8, "au")
end)

-- Puerta Sur de Aurelia ABIERTA: torres a los lados, arco arriba (por encima del héroe) y los
-- portones abiertos contra las paredes; por el medio se pasa caminando a la Pradera
addGrid("puerta_abierta", 4, 3, function(V)
  -- torres
  for _, x0 in ipairs({0, 104}) do
    V.rect(x0, 0, x0 + 23, 95, "sw"); V.rect(x0 + 17, 0, x0 + 23, 95, "sd")
    for y = 0, 95, 8 do V.rect(x0, y, x0 + 23, y, "sd") end
    for x = x0, x0 + 18, 9 do V.rect(x, 0, x + 5, 6, "sk") end
    V.rect(x0 + 8, 18, x0 + 14, 30, "K")
  end
  -- arco sobre el paso (fila de arriba)
  V.rect(24, 0, 103, 22, "sw"); for y = 0, 22, 8 do V.rect(24, y, 103, y, "sd") end
  for x = 24, 100, 12 do V.rect(x, 0, x + 6, 5, "sk") end
  V.ellipse(64, 30, 40, 16, "sw"); V.ellipse(64, 34, 36, 14, "sk")
  -- estandartes del reino colgando del arco
  for _, x in ipairs({40, 88}) do V.rect(x - 5, 6, x + 5, 30, "M"); V.rect(x - 5, 6, x + 5, 8, "Y"); V.px(x, 18, "Y"); V.rect(x - 5, 30, x, 34, "M") end
  -- portones abiertos, pegados a las torres
  V.rect(24, 44, 31, 95, "b"); V.rect(25, 46, 30, 95, "B"); V.rect(24, 60, 31, 61, "d"); V.rect(24, 80, 31, 81, "d")
  V.rect(96, 44, 103, 95, "b"); V.rect(97, 46, 102, 95, "B"); V.rect(96, 60, 103, 61, "d"); V.rect(96, 80, 103, 81, "d")
end)

local COLLIDE = {arbol=true, roca=true, arbusto=true, valla=true, agua=true, cartel=true, fogata=true, orilla_agua_arriba=true,
  arbol_grande_bi=true, arbol_grande_bd=true, carpa_ai=true, carpa_ad=true, carpa_bi=true, carpa_bd=true,
  puesto_ai=true, puesto_ad=true, puesto_bi=true, puesto_bd=true, yunque=true, barril=true, caja=true, farol=true}
for m=0,15 do COLLIDE["agua_" .. m] = true end
-- v3
for _, n in ipairs({"cara_a_i","cara_a_c","cara_a_d","cara_b_i","cara_b_c","cara_b_d","cerca_v","espantapajaros","heno","pozo",
  "carreta","tocon","bayas","juncos","columna_rota","muro_ruina","hueso_grande","senal","pino_chico","arbusto_seco","muro_alto","muro_bajo"}) do COLLIDE[n] = true end
local function bigCollide(name, w, h, fromRow)
  for r=fromRow,h-1 do for c=0,w-1 do COLLIDE[string.format("%s_%d_%d", name, r, c)] = true end end
end
bigCollide("arbol_muerto", 2, 2, 1); bigCollide("roca_grande", 2, 2, 0); bigCollide("tienda_goblin", 2, 2, 1)
bigCollide("tronco_caido", 2, 1, 0); bigCollide("menhir", 1, 2, 1); bigCollide("pino", 2, 2, 1); bigCollide("arbol_dorado", 2, 2, 1)
bigCollide("granja", 3, 3, 1); bigCollide("granero", 3, 3, 1); bigCollide("molino", 3, 3, 1); bigCollide("puerta_norte", 4, 3, 0)
-- v4 (Aurelia)
for m=0,15 do COLLIDE["canal_" .. m] = true end
for _, b in ipairs({{"casa_roja",3,3},{"casa_azul",3,3},{"casa_verde",3,3},{"casa_piedra",3,3},{"casa_alta_a",2,3},{"casa_alta_b",2,3},
  {"posada",4,3},{"cuartel",4,3},{"casa_arqueros",3,3},{"taberna_sombra",3,3},{"capilla",3,3},{"banco",4,3},{"lonja",4,3},
  {"forja_enana",3,3},{"casa_elfica",3,3},{"arbol_plata",3,3}}) do bigCollide(b[1], b[2], b[3], 1) end
bigCollide("torre_arcana", 2, 4, 2); bigCollide("catedral", 6, 6, 2); bigCollide("castillo", 8, 4, 0); bigCollide("torre_muralla", 2, 2, 0)
bigCollide("estatua", 1, 2, 1); bigCollide("diligencia", 3, 2, 0)
for r=0,2 do COLLIDE[string.format("puerta_abierta_%d_0", r)] = true; COLLIDE[string.format("puerta_abierta_%d_3", r)] = true end
for _, n in ipairs({"muro_v","banco_plaza","maceta","seto","diana","cerca_hierro","puesto_rojo_ai","puesto_rojo_ad","puesto_rojo_bi","puesto_rojo_bd",
  "puesto_verde_ai","puesto_verde_ad","puesto_verde_bi","puesto_verde_bd"}) do COLLIDE[n] = true end
-- tiles que se dibujan POR ENCIMA del personaje (copas de los árboles grandes)
local ABOVE = {arbol_grande_ai=true, arbol_grande_ad=true}
-- v3: copas y tejados (fila de arriba de los objetos grandes) tapan al personaje
for _, n in ipairs({"arbol_muerto","pino","arbol_dorado","tienda_goblin"}) do ABOVE[n .. "_0_0"] = true; ABOVE[n .. "_0_1"] = true end
ABOVE["menhir_0_0"] = true
for _, n in ipairs({"granja","granero","molino"}) do for c=0,2 do ABOVE[string.format("%s_0_%d", n, c)] = true end end
-- v4: tejados y copas de la ciudad
local function aboveRows(name, w, rows) for r=0,rows-1 do for c=0,w-1 do ABOVE[string.format("%s_%d_%d", name, r, c)] = true end end end
for _, b in ipairs({{"casa_roja",3},{"casa_azul",3},{"casa_verde",3},{"casa_piedra",3},{"casa_alta_a",2},{"casa_alta_b",2},
  {"posada",4},{"cuartel",4},{"casa_arqueros",3},{"taberna_sombra",3},{"capilla",3},{"banco",4},{"lonja",4},
  {"forja_enana",3},{"casa_elfica",3},{"arbol_plata",3}}) do aboveRows(b[1], b[2], 1) end
aboveRows("torre_arcana", 2, 2); aboveRows("catedral", 6, 2); aboveRows("estatua", 1, 1)
ABOVE["puerta_abierta_0_1"] = true; ABOVE["puerta_abierta_0_2"] = true

local COLS = 8
local ROWS = math.ceil(#TILES / COLS)
local sheet = Image(COLS*32, ROWS*32, ColorMode.RGB)
for i,t in ipairs(TILES) do
  local G = newGrid(32, 32)
  t[2](G)
  sheet:drawImage(toImage(G, false), Point(((i-1) % COLS) * 32, ((i-1) // COLS) * 32))
end
local spr = Sprite(COLS*32, ROWS*32, ColorMode.RGB)
spr:setPalette(makePalette())
spr.layers[1].name = "tiles"
spr:newCel(spr.layers[1], spr.frames[1], sheet, Point(0,0))
spr:saveAs(dir .. "/tileset_pradera.aseprite")
spr:close()

-- indice de tiles (para el generador del mapa y para Tiled)
local lines = {}
for i,t in ipairs(TILES) do
  lines[#lines+1] = string.format('    { "id": %d, "nombre": "%s", "colision": %s, "encima": %s }', i-1, t[1],
    COLLIDE[t[1]] and "true" or "false", ABOVE[t[1]] and "true" or "false")
end
local fh = io.open(dir .. "/tileset_pradera.json", "w")
fh:write('{\n  "tileSize": 32,\n  "columns": ' .. COLS .. ',\n  "count": ' .. #TILES .. ',\n  "tiles": [\n' .. table.concat(lines, ",\n") .. '\n  ]\n}\n')
fh:close()
