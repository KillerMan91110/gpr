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

local COLLIDE = {arbol=true, roca=true, arbusto=true, valla=true, agua=true, cartel=true, fogata=true, orilla_agua_arriba=true,
  arbol_grande_bi=true, arbol_grande_bd=true, carpa_ai=true, carpa_ad=true, carpa_bi=true, carpa_bd=true,
  puesto_ai=true, puesto_ad=true, puesto_bi=true, puesto_bd=true, yunque=true, barril=true, caja=true, farol=true}
for m=0,15 do COLLIDE["agua_" .. m] = true end
-- tiles que se dibujan POR ENCIMA del personaje (copas de los árboles grandes)
local ABOVE = {arbol_grande_ai=true, arbol_grande_ad=true}

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
