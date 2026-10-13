-- Arte extra del MUNDO de Etheria (mismo estilo y paleta que crear_mundo.lua):
--  * caminar/npc_ren|npc_lyra|npc_goreth.aseprite: 32x32, 9 frames (abajo, arriba, lado) como los héroes
--  * retratos/<npc>.aseprite: 64x64, busto para los diálogos
--  * recursos.aseprite: 32x32, 6 frames = hierba, hierba recogida, mineral, mineral agotado, cofre, cofre abierto
--  * mascotas.aseprite: 24x24, 2 frames por especie (quieto, salto): lobo, ave, limo, gato, dragon, zorro, tortuga, arana
--
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_extras.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"F","e8b48c"},{"f","b97f5c"},{"E","1c2a4a"},{"H","2a2433"},{"h","4a3f5c"},
  {"W","f0f4f8"},{"S","c8d0dc"},{"s","8a96a8"},{"d","555f70"},{"R","c0343a"},{"r","7a1f2a"},
  {"B","8a5530"},{"b","4f2e1c"},{"Y","e8c050"},{"y","a8802c"},{"A","4a5060"},{"a","2e323e"},{"Ah","7a8296"},
  {"G","3f7040"},{"g","274828"},{"Gh","64984f"},{"V","6a3a8a"},{"v","432456"},{"Vh","8e5ab0"},
  {"O","c0602a"},{"o","8a3a1a"},{"Oh","e08a4a"},{"N","7a5a3a"},{"n","4e3622"},{"Nh","a07a52"},
  {"T","d8c8a0"},{"t","a8987a"},
  -- recursos y mascotas
  {"c1","6fae4a"},{"c2","4a8432"},{"c3","2c5e20"},{"fl","f0e070"},{"fr","e86a8a"},{"fv","b070e0"},
  {"r1","9a9488"},{"r2","767060"},{"r3","4c473e"},{"q1","6fc3ff"},{"q2","3a8ad8"},{"q3","e8a050"},
  {"w1","b8b0a8"},{"w2","847c74"},{"w3","5a524c"},{"p1","7adcc0"},{"p2","3aa888"},{"p3","c0f0e0"},
  {"x1","e85a3a"},{"x2","a83020"},{"z1","e8a050"},{"z2","b06a28"},{"u1","5a8a4a"},{"u2","3a5e30"},
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

local dir = app.params.dir

local function saveFrames(path, W, H, frames, tags)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = 0.15
    spr:newCel(spr.layers[1], frame, toImage(G, true), Point(0,0))
  end
  for _, t in ipairs(tags or {}) do local tag = spr:newTag(t[2], t[3]); tag.name = t[1] end
  spr:saveAs(path)
  spr:close()
end

-- =====================================================================================
-- NPCs caminando (misma silueta que los héroes; cambian pelo, ropa y accesorios)
-- =====================================================================================
local NPCS = {
  -- Ren, guardabosque: capucha y capa verdes, chaleco de cuero
  npc_ren    = {main="G", shade="g", light="Gh", pants="b", boots="B", neck="g", vest="N", belt="b", hand="B", head="hood", hood="g", hoodL="G"},
  -- Lyra, mercader: pelo largo cobrizo, vestido violeta con delantal
  npc_lyra   = {main="V", shade="v", light="Vh", robe=true, trim="Y", neck="V", apron="T", hand="F", head="long", hair="O", hairD="o", hairL="Oh"},
  -- Goreth, herrero: calvo con barba, delantal de cuero sobre camisa roja, brazos anchos
  npc_goreth = {main="r", shade="b", light="R", pants="b", boots="b", neck="F", vest="N", belt="n", hand="F", head="beard", beard="N", beardD="n", wide=true},
}

local function legs(G, st, step, bob)
  if st.robe then
    for y=18+bob,28 do local e = (y-18)//4; G.rect(10-e,y,21+e,y,st.main); G.rect(19+e,y,21+e,y,st.shade) end
    G.rect(9,28,22,28,st.trim)
    local l, r = (step == 1) and 1 or 0, (step == 2) and 1 or 0
    G.rect(11,29,14,30-r,"b"); G.rect(17,29,20,30-l,"b")
    return
  end
  local liftL, liftR = (step == 2) and 1 or 0, (step == 1) and 1 or 0
  G.rect(11,26,14,29-liftL,st.pants); G.rect(11,29-liftL,14,30-liftL,st.boots)
  G.rect(17,26,20,29-liftR,st.pants); G.rect(17,29-liftR,20,30-liftR,st.boots)
end

local function headFront(G, st, bob)
  G.rect(10,9+bob,21,17+bob,"F"); G.rect(10,9+bob,10,17+bob,"f"); G.rect(11,17+bob,20,17+bob,"f")
  G.rect(12,13+bob,13,14+bob,"E"); G.rect(18,13+bob,19,14+bob,"E"); G.px(12,13+bob,"W"); G.px(18,13+bob,"W")
  if st.head == "hood" then
    G.rect(8,3+bob,23,9+bob,st.hood); G.rect(7,7+bob,9,18+bob,st.hood); G.rect(22,7+bob,24,18+bob,st.hood)
    G.rect(10,9+bob,21,10+bob,st.hood); G.rect(9,4+bob,22,5+bob,st.hoodL); G.px(15,2+bob,st.hood); G.px(16,2+bob,st.hood)
    G.px(15,16+bob,"f"); G.px(16,16+bob,"f")
  elseif st.head == "long" then
    G.rect(9,4+bob,22,9+bob,st.hair); G.rect(8,7+bob,9,22+bob,st.hair); G.rect(22,7+bob,23,22+bob,st.hair)
    G.rect(10,10+bob,13,11+bob,st.hair); G.rect(18,10+bob,21,11+bob,st.hair)
    G.px(12,5+bob,st.hairL); G.px(13,5+bob,st.hairL); G.px(18,6+bob,st.hairL); G.rect(8,18+bob,9,22+bob,st.hairD); G.rect(22,18+bob,23,22+bob,st.hairD)
    G.px(15,16+bob,"R"); G.px(16,16+bob,"R")
  elseif st.head == "beard" then
    G.rect(10,6+bob,21,9+bob,"F"); G.rect(11,5+bob,20,5+bob,"F"); G.px(13,6+bob,"W")
    G.rect(10,11+bob,13,11+bob,st.beardD); G.rect(18,11+bob,21,11+bob,st.beardD)
    G.rect(10,15+bob,21,19+bob,st.beard); G.rect(12,20+bob,19,20+bob,st.beard); G.rect(14,21+bob,17,21+bob,st.beardD)
    G.rect(14,15+bob,17,15+bob,st.beardD)
  end
end

local function body(G, st, step, bob, back)
  local swing = (step == 1) and 1 or ((step == 2) and -1 or 0)
  if back then swing = -swing end
  local x0, x1 = 10, 21
  if st.wide then x0, x1 = 9, 22 end
  G.rect(x0,18+bob,x1,26,st.main); G.rect(x1-2,18+bob,x1,26,st.shade); G.rect(x0+1,19+bob,x0+1,24,st.light)
  if not back then
    if st.vest then G.rect(13,19+bob,18,26,st.vest); G.rect(13,19+bob,13,26,"n") end
    if st.apron then G.rect(12,20+bob,19,28,st.apron); G.rect(12,20+bob,12,28,"t") end
  end
  if st.belt then G.rect(x0,25,x1,25,st.belt); G.px(15,25,"Y") end
  G.rect(12,17+bob,19,18+bob,st.neck)
  local a0 = st.wide and 6 or 8
  G.rect(a0,19+bob-swing,a0+1+(st.wide and 1 or 0),24+bob-swing,st.main); G.rect(a0,25+bob-swing,a0+1+(st.wide and 1 or 0),26+bob-swing,st.hand)
  G.rect(x1+1,19+bob+swing,x1+2+(st.wide and 1 or 0),24+bob+swing,st.shade); G.rect(x1+1,25+bob+swing,x1+2+(st.wide and 1 or 0),26+bob+swing,st.hand)
end

local function drawFront(st, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  legs(G, st, step, bob); body(G, st, step, bob, false); headFront(G, st, bob)
  return G
end

local function drawBack(st, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  legs(G, st, step, bob); body(G, st, step, bob, true)
  if st.head == "hood" then
    G.rect(8,3+bob,23,18+bob,st.hood); G.rect(9,4+bob,22,6+bob,st.hoodL); G.rect(10,18+bob,21,24+bob,st.hood)
  elseif st.head == "long" then
    G.rect(9,4+bob,22,17+bob,st.hair); G.rect(8,7+bob,23,21+bob,st.hair)
    G.rect(9,22+bob,22,22+bob,st.hair); G.rect(10,23+bob,21,23+bob,st.hair); G.rect(12,24+bob,19,24+bob,st.hair); G.rect(14,25+bob,17,25+bob,st.hair)
    for _, x in ipairs({11, 15, 19}) do G.rect(x,12+bob,x,21+bob,st.hairD) end
    G.rect(13,23+bob,13,24+bob,st.hairD); G.rect(18,23+bob,18,24+bob,st.hairD)
    G.px(12,6+bob,st.hairL); G.px(18,7+bob,st.hairL)
  else
    G.rect(10,5+bob,21,17+bob,"F"); G.rect(9,9+bob,10,15+bob,"f"); G.rect(21,9+bob,22,15+bob,"f"); G.px(13,7+bob,"W")
  end
  return G
end

local function drawSide(st, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  local fwd = (step == 1) and 2 or ((step == 2) and -2 or 0)
  if st.robe then
    for y=18+bob,28 do local e = (y-18)//5; G.rect(11-e,y,20+e,y,st.main); G.rect(11-e,y,12-e,y,st.shade) end
    G.rect(10,28,21,28,st.trim); G.rect(15+fwd,29,18+fwd,30,"b")
  else
    G.rect(13-fwd,26,15-fwd,29,st.pants); G.rect(12-fwd,30,15-fwd,30,st.boots)
    G.rect(16+fwd,26,18+fwd,29,st.pants); G.rect(16+fwd,30,20+fwd,30,st.boots)
  end
  G.rect(11,18+bob,20,26,st.main); G.rect(11,18+bob,12,26,st.shade)
  if st.vest then G.rect(16,19+bob,20,26,st.vest) end
  if st.apron then G.rect(18,20+bob,21,28,st.apron) end
  if st.belt then G.rect(11,25,20,25,st.belt) end
  G.rect(13,17+bob,19,18+bob,st.neck)
  G.rect(11,9+bob,21,17+bob,"F"); G.rect(11,17+bob,20,17+bob,"f")
  G.rect(19,13+bob,19,14+bob,"E"); G.px(22,14+bob,"F")
  if st.head == "hood" then
    G.rect(8,3+bob,19,10+bob,st.hood); G.rect(8,7+bob,14,19+bob,st.hood); G.rect(9,4+bob,18,5+bob,st.hoodL); G.rect(6,12+bob,8,22+bob,st.hood)
  elseif st.head == "long" then
    G.rect(9,4+bob,20,9+bob,st.hair); G.rect(8,7+bob,14,23+bob,st.hair); G.rect(8,19+bob,12,23+bob,st.hairD); G.px(13,5+bob,st.hairL)
  else
    G.rect(11,6+bob,20,9+bob,"F"); G.px(16,6+bob,"W"); G.rect(16,15+bob,22,19+bob,st.beard); G.rect(18,20+bob,21,21+bob,st.beardD)
  end
  local sw = -fwd // 2
  G.rect(15+sw,19+bob,17+sw,24+bob,st.light); G.rect(15+sw,25+bob,17+sw,26+bob,st.hand)
  return G
end

for name, st in pairs(NPCS) do
  local frames, tags = {}, {}
  for _, view in ipairs({{"abajo", drawFront}, {"arriba", drawBack}, {"lado", drawSide}}) do
    local from = #frames + 1
    for step=0,2 do frames[#frames + 1] = view[2](st, step) end
    tags[#tags + 1] = {view[1], from, #frames}
  end
  saveFrames(dir .. "/caminar/" .. name .. ".aseprite", 32, 32, frames, tags)
end

-- =====================================================================================
-- Retratos 64x64 para los diálogos (busto de frente, mismo estilo chibi pero más detalle)
-- =====================================================================================
local function portraitBase(G, shirt, shirtD, behind)
  -- hombros y torso
  G.ellipse(32,66,26,16,shirt); G.ellipse(32,68,26,14,shirtD); G.ellipse(32,62,24,12,shirt)
  if behind then behind(G) end
  -- cuello
  G.rect(27,40,37,48,"f"); G.rect(28,40,36,46,"F")
  -- cara
  G.ellipse(32,30,14,15,"F"); G.rect(19,30,20,36,"f"); G.ellipse(32,40,10,4,"F")
  -- ojos grandes
  G.rect(24,30,28,35,"W"); G.rect(36,30,40,35,"W")
  G.rect(25,31,28,35,"E"); G.rect(37,31,40,35,"E"); G.px(26,32,"W"); G.px(38,32,"W"); G.rect(25,30,28,30,"K"); G.rect(36,30,40,30,"K")
  -- nariz y boca
  G.px(32,37,"f"); G.px(33,38,"f"); G.rect(30,42,34,42,"f")
end

local PORTRAITS = {
  ren = function(G)
    portraitBase(G, "G", "g", function(Q)
      Q.rect(14,46,50,64,"N"); Q.rect(22,48,42,64,"G"); Q.rect(30,48,33,60,"Y")
      -- capucha (por detrás de la cara)
      Q.ellipse(32,26,20,19,"g"); Q.rect(12,24,19,52,"g"); Q.rect(45,24,52,52,"g"); Q.ellipse(32,22,16,12,"G")
    end)
    -- borde de la capucha sobre la frente
    G.ellipse(32,16,15,5,"g"); G.ellipse(32,14,12,3,"Gh"); G.rect(18,18,20,30,"g"); G.rect(44,18,46,30,"g")
    G.rect(24,28,28,28,"n"); G.rect(36,28,40,28,"n"); G.px(44,48,"Y"); G.px(45,49,"Y")
  end,
  lyra = function(G)
    portraitBase(G, "V", "v", function(Q)
      Q.rect(24,52,40,64,"T"); Q.rect(24,52,24,64,"t")
      -- pelo largo por detrás
      Q.ellipse(32,26,19,17,"O"); Q.rect(13,24,20,58,"O"); Q.rect(44,24,51,58,"O"); Q.rect(13,46,20,58,"o"); Q.rect(44,46,51,58,"o")
    end)
    -- flequillo (por encima de los ojos) y mechones a los lados de la cara
    G.ellipse(32,18,16,7,"O"); G.rect(17,18,21,40,"O"); G.rect(43,18,47,40,"O"); G.rect(28,22,36,25,"O")
    G.px(24,14,"Oh"); G.px(25,13,"Oh"); G.px(26,13,"Oh"); G.px(38,14,"Oh"); G.px(39,15,"Oh")
    G.rect(24,28,28,28,"o"); G.rect(36,28,40,28,"o")
    -- labios, rubor y pendiente
    G.rect(30,42,34,42,"R"); G.px(23,38,"fr"); G.px(41,38,"fr"); G.rect(18,41,19,43,"Y")
  end,
  goreth = function(G)
    portraitBase(G, "r", "b", function(Q)
      Q.rect(18,48,46,64,"N"); Q.rect(18,48,20,64,"n"); Q.rect(22,46,24,50,"n"); Q.rect(40,46,42,50,"n")
    end)
    -- coronilla calva con brillo y cejas pobladas
    G.ellipse(32,20,14,8,"F"); G.rect(26,14,30,15,"W"); G.rect(23,27,29,28,"n"); G.rect(35,27,41,28,"n")
    -- barba grande (deja ver los ojos), bigote y boca
    G.ellipse(32,47,15,9,"N"); G.rect(18,36,22,46,"N"); G.rect(42,36,46,46,"N"); G.ellipse(32,54,8,5,"n")
    G.rect(26,39,38,41,"N"); G.rect(28,40,36,40,"n"); G.rect(30,43,34,44,"R"); G.px(26,49,"Nh"); G.px(37,51,"Nh")
    -- cicatriz
    G.px(41,23,"r"); G.px(42,24,"r"); G.px(43,25,"r")
  end,
}

for name, draw in pairs(PORTRAITS) do
  local G = newGrid(64, 64)
  draw(G)
  saveFrames(dir .. "/retratos/" .. name .. ".aseprite", 64, 64, {G})
end

-- =====================================================================================
-- Recursos para recolectar (32x32, apoyados en la fila 30)
-- =====================================================================================
local function bush(G, flowers)
  G.ellipse(16,24,10,7,"c3"); G.ellipse(14,21,7,6,"c2"); G.ellipse(19,20,7,6,"c2"); G.ellipse(16,18,6,5,"c1")
  G.px(12,19,"c1"); G.px(20,17,"c1"); G.rect(10,29,22,30,"c3")
  if flowers then
    for _, p in ipairs({{11,18,"fv"},{16,15,"fl"},{21,19,"fv"},{14,23,"fr"},{19,24,"fl"},{9,23,"fv"}}) do
      G.px(p[1],p[2],p[3]); G.px(p[1]+1,p[2],p[3]); G.px(p[1],p[2]+1,p[3]); G.px(p[1]+1,p[2]+1,"W")
    end
  end
end

local function rock(G, ore)
  G.ellipse(16,24,12,7,"r3"); G.ellipse(15,21,11,8,"r2"); G.ellipse(13,19,7,6,"r1"); G.rect(6,29,26,30,"r3")
  if ore then
    for _, p in ipairs({{12,18,"q1"},{18,21,"q1"},{9,23,"q3"},{20,17,"q1"},{15,25,"q3"}}) do
      G.px(p[1],p[2],p[3]); G.px(p[1]+1,p[2],"q2"); G.px(p[1],p[2]+1,"q2"); G.px(p[1]+1,p[2]-1,"W")
    end
  else
    G.px(12,20,"r3"); G.px(13,21,"r3"); G.px(18,22,"r3"); G.px(19,23,"r3")
  end
end

local function chest(G, open)
  G.rect(7,18,24,29,"B"); G.rect(7,18,24,19,"b"); G.rect(7,28,24,29,"b"); G.rect(7,18,8,29,"b"); G.rect(23,18,24,29,"b")
  G.rect(7,23,24,23,"y"); G.rect(14,21,17,26,"Y"); G.rect(15,23,16,24,"b")
  if open then
    G.rect(7,10,24,17,"b"); G.rect(9,11,22,16,"B"); G.rect(8,17,23,18,"Y")
    G.ellipse(16,18,6,2,"Y"); G.px(12,17,"W"); G.px(19,16,"W"); G.px(16,15,"fl")
  else
    G.ellipse(16,17,9,4,"B"); G.rect(7,14,24,18,"B"); G.rect(7,14,24,14,"b"); G.rect(7,18,24,18,"y")
  end
end

local res = {}
for _, f in ipairs({
  function(G) bush(G, true) end, function(G) bush(G, false) end,
  function(G) rock(G, true) end, function(G) rock(G, false) end,
  function(G) chest(G, false) end, function(G) chest(G, true) end,
}) do
  local G = newGrid(32, 32); f(G); res[#res + 1] = G
end
saveFrames(dir .. "/recursos.aseprite", 32, 32, res, {{"hierba",1,2},{"mineral",3,4},{"cofre",5,6}})

-- =====================================================================================
-- Mascotas del mapa (24x24, vista de 3/4, mirando a la derecha). 2 frames: quieto y salto.
-- =====================================================================================
local PETS = {
  lobo = function(G, j)
    G.ellipse(11,17-j,6,4,"w2"); G.ellipse(11,16-j,5,3,"w1"); G.ellipse(17,13-j,4,4,"w1"); G.rect(19,13-j,21,15-j,"w1")
    G.px(15,9-j,"w2"); G.px(16,8-j,"w2"); G.px(19,9-j,"w2"); G.px(19,8-j,"w2"); G.px(18,12-j,"E"); G.px(21,13-j,"K")
    G.rect(5,13-j,6,15-j,"w2"); G.px(4,12-j,"w1")
    G.rect(7,20-j,8,21,"w3"); G.rect(13,20-j,14,21,"w3")
  end,
  ave = function(G, j)
    G.ellipse(12,15-j,5,5,"z1"); G.ellipse(12,16-j,4,3,"T"); G.ellipse(10,14-j,4,3,"z2"); G.px(15,13-j,"E"); G.rect(17,14-j,18,14-j,"Y")
    G.px(7,16-j,"z2"); G.px(6,17-j,"z2"); G.rect(11,20-j,11,21,"Y"); G.rect(14,20-j,14,21,"Y")
  end,
  limo = function(G, j)
    local h = j == 1 and 1 or 0
    G.ellipse(12,17-j,7+h,6-h,"p2"); G.ellipse(12,16-j,6+h,5-h,"p1"); G.ellipse(10,14-j,2,1,"p3")
    G.px(10,17-j,"E"); G.px(14,17-j,"E"); G.rect(11,19-j,13,19-j,"p2")
  end,
  gato = function(G, j)
    G.ellipse(11,17-j,6,4,"H"); G.ellipse(17,13-j,4,4,"H"); G.px(15,9-j,"H"); G.px(19,9-j,"H"); G.px(15,10-j,"h"); G.px(19,10-j,"h")
    G.px(16,13-j,"Y"); G.px(19,13-j,"Y"); G.px(4,12-j,"H"); G.px(5,13-j,"H"); G.px(5,14-j,"H"); G.px(6,15-j,"H")
    G.rect(7,20-j,8,21,"H"); G.rect(13,20-j,14,21,"H")
  end,
  dragon = function(G, j)
    G.ellipse(11,16-j,6,4,"x1"); G.ellipse(17,12-j,4,4,"x1"); G.rect(19,12-j,22,14-j,"x1"); G.px(18,11-j,"Y"); G.px(22,13-j,"K")
    G.px(16,8-j,"T"); G.px(18,8-j,"T"); G.rect(8,9-j,12,13-j,"x2"); G.px(7,8-j,"x2"); G.px(10,8-j,"x2")
    G.px(4,15-j,"x2"); G.px(3,14-j,"x1"); G.ellipse(11,17-j,4,2,"Y")
    G.rect(8,19-j,9,21,"x2"); G.rect(13,19-j,14,21,"x2")
  end,
  zorro = function(G, j)
    G.ellipse(11,17-j,6,4,"z1"); G.ellipse(17,13-j,4,4,"z1"); G.rect(19,14-j,22,15-j,"T"); G.px(15,8-j,"z2"); G.px(19,8-j,"z2")
    G.px(18,12-j,"E"); G.px(22,14-j,"K"); G.ellipse(5,14-j,3,2,"z1"); G.px(3,13-j,"W")
    G.rect(7,20-j,8,21,"z2"); G.rect(13,20-j,14,21,"z2")
  end,
  tortuga = function(G, j)
    G.ellipse(11,16-j,7,5,"u2"); G.ellipse(11,15-j,6,4,"u1"); G.px(9,14-j,"u2"); G.px(13,14-j,"u2"); G.px(11,16-j,"u2")
    G.ellipse(19,16-j,3,2,"Gh"); G.px(20,15-j,"E"); G.rect(6,20-j,7,21,"Gh"); G.rect(14,20-j,15,21,"Gh")
  end,
  arana = function(G, j)
    G.ellipse(11,16-j,5,4,"q2"); G.ellipse(16,15-j,3,3,"q1"); G.px(17,14-j,"W"); G.px(18,15-j,"W")
    for i=0,3 do G.px(7+i*2,20-j+(i%2),"K"); G.px(6+i*2,19-j,"K") end
  end,
}
local petFrames, petTags = {}, {}
for _, name in ipairs({"lobo","ave","limo","gato","dragon","zorro","tortuga","arana"}) do
  local from = #petFrames + 1
  for j=0,1 do local G = newGrid(24, 24); PETS[name](G, j * 2); petFrames[#petFrames + 1] = G end
  petTags[#petTags + 1] = {name, from, #petFrames}
end
saveFrames(dir .. "/mascotas.aseprite", 24, 24, petFrames, petTags)

-- =====================================================================================
-- v3: más recursos (frames 6..15 de recursos2), fauna del ambiente y aspas del molino
-- =====================================================================================
local function mush(G, full)
  G.ellipse(16,28,10,2,"c3")
  if full then
    for _,p in ipairs({{10,24,5},{20,26,6},{24,20,4}}) do
      G.rect(p[1]-1,p[2]-p[3]+2,p[1]+1,p[2]+2,"T"); G.ellipse(p[1],p[2]-p[3]+2,p[3]+1,p[3]-1,"x1"); G.px(p[1]-2,p[2]-p[3]+1,"W"); G.px(p[1]+1,p[2]-p[3],"W")
    end
  else
    G.px(10,26,"t"); G.px(20,27,"t"); G.px(24,22,"t")
  end
end
local function logRes(G, full)
  G.ellipse(16,27,14,3,"c3")
  if full then
    G.rect(3,16,28,25,"n"); G.rect(3,16,28,18,"N"); G.ellipse(28,20,4,5,"Nh"); G.ellipse(28,20,2,3,"n")
    G.ellipse(3,20,3,5,"Nh"); G.px(12,15,"u1"); G.px(13,14,"u2"); G.rect(6,20,9,20,"n")
  else
    G.ellipse(16,22,6,3,"Nh"); G.ellipse(16,22,3,1,"n"); for i=0,4 do G.px(8 + i * 4, 26, "Nh") end
  end
end
local function glowFlower(G, full)
  G.ellipse(16,28,8,2,"c3"); G.rect(15,14,16,28,"c2"); G.px(13,22,"c1"); G.px(18,19,"c1")
  if full then
    G.ellipse(16,11,6,6,"p1"); G.ellipse(16,11,4,4,"p3"); G.ellipse(16,11,2,2,"W")
    for _,p in ipairs({{8,8},{24,9},{10,18},{23,16}}) do G.px(p[1],p[2],"p3") end
  else
    G.px(15,13,"c3"); G.px(16,12,"c3")
  end
end
local function nest(G, full)
  G.ellipse(16,24,12,6,"N"); G.ellipse(16,22,10,4,"n"); G.ellipse(16,21,8,3,"b")
  for i=0,10 do G.px(5 + i * 2, 20 + (i % 2), "Nh") end
  if full then G.ellipse(12,20,3,3,"T"); G.ellipse(19,20,3,3,"q1"); G.ellipse(16,18,3,3,"T"); G.px(11,19,"W"); G.px(15,17,"W") end
end
local function remains(G, full)
  G.ellipse(16,27,13,3,"c3")
  if full then
    G.ellipse(12,22,7,6,"B"); G.ellipse(12,20,5,3,"N"); G.rect(9,16,15,17,"b"); G.px(12,15,"Y")
    for i=0,14 do G.px(18 + i // 2, 26 - i, "S"); G.px(19 + i // 2, 26 - i, "s") end; G.rect(16,22,24,23,"b")
  else
    for i=0,14 do G.px(18 + i // 2, 26 - i, "s") end; G.rect(16,22,24,23,"b")
  end
end
local res2 = {}
for _, f in ipairs({mush, logRes, glowFlower, nest, remains}) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); res2[#res2 + 1] = G end
end
saveFrames(dir .. "/recursos2.aseprite", 32, 32, res2, {{"setas",1,2},{"tronco",3,4},{"flor_luz",5,6},{"nido",7,8},{"restos",9,10}})

-- mariposa 8x8 (blanca: el juego la tiñe de colores), 2 frames
local but = {}
for f=0,1 do
  local G = newGrid(8, 8)
  G.rect(3,2,4,6,"K")
  if f == 0 then G.rect(0,1,2,3,"W"); G.rect(5,1,7,3,"W"); G.rect(1,4,2,5,"W"); G.rect(5,4,6,5,"W")
  else G.rect(1,2,2,4,"W"); G.rect(5,2,6,4,"W") end
  but[#but + 1] = G
end
saveFrames(dir .. "/mariposa.aseprite", 8, 8, but)

-- pájaro 16x16: quieto, aleteo 1, aleteo 2
local birds = {}
for f=0,2 do
  local G = newGrid(16, 16)
  G.ellipse(8,10,4,3,"z2"); G.ellipse(10,8,2,2,"z2"); G.px(12,8,"Y"); G.px(10,7,"K"); G.ellipse(7,11,3,2,"T")
  if f == 0 then G.rect(4,9,8,10,"n") elseif f == 1 then G.rect(3,4,7,8,"n"); G.px(2,3,"n") else G.rect(3,11,7,13,"n") end
  G.px(4,12,"n"); G.px(3,12,"n")
  birds[#birds + 1] = G
end
saveFrames(dir .. "/pajaro.aseprite", 16, 16, birds)

-- conejo 16x16: quieto y salto
local rab = {}
for f=0,1 do
  local G = newGrid(16, 16); local j = f * 2
  G.ellipse(8,11-j,5,3,"w1"); G.ellipse(11,8-j,3,3,"w1"); G.rect(10,2-j,10,6-j,"w1"); G.rect(12,2-j,12,6-j,"w1"); G.px(10,3-j,"fr"); G.px(12,3-j,"fr")
  G.px(12,8-j,"K"); G.ellipse(4,10-j,2,2,"W"); G.px(13,9-j,"fr"); G.rect(6,13-j,7,14,"w2"); G.rect(10,13-j,11,14,"w2")
  rab[#rab + 1] = G
end
saveFrames(dir .. "/conejo.aseprite", 16, 16, rab)

-- ciervo 32x32: pastando y alerta
local deer = {}
for f=0,1 do
  local G = newGrid(32, 32)
  G.ellipse(14,18,9,5,"z2"); G.ellipse(14,19,7,3,"z1"); G.px(6,17,"W"); G.px(5,16,"W")
  for _,x in ipairs({8,11,17,20}) do G.rect(x,22,x,29,"n") end
  if f == 0 then G.rect(21,17,23,23,"z2"); G.ellipse(24,25,3,2,"z2"); G.px(26,25,"K")
  else
    G.rect(21,8,23,17,"z2"); G.ellipse(24,8,3,2,"z2"); G.px(26,8,"K"); G.px(24,7,"K")
    for i=0,4 do G.px(21 - i // 2, 5 - i, "Nh"); G.px(24 + i // 2, 5 - i, "Nh") end; G.px(19,2,"Nh"); G.px(27,1,"Nh")
  end
  deer[#deer + 1] = G
end
saveFrames(dir .. "/ciervo.aseprite", 32, 32, deer)

-- aspas del molino 72x72 (el juego las hace girar)
do
  local G = newGrid(72, 72)
  for a=0,3 do
    for r=4,34 do
      local ang = a * math.pi / 2 + 0.3
      local cx, cy = 36 + math.cos(ang) * r, 36 + math.sin(ang) * r
      G.px(cx, cy, "b")
      if r > 10 then
        for w=1,6 do G.px(cx + math.cos(ang + math.pi / 2) * w, cy + math.sin(ang + math.pi / 2) * w, (r + w) % 4 == 0 and "b" or "T") end
      end
    end
  end
  G.ellipse(36,36,4,4,"n"); G.ellipse(36,36,2,2,"Nh")
  saveFrames(dir .. "/aspas.aseprite", 72, 72, {G})
end
