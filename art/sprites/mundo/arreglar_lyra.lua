-- Arreglo de Lyra (pelo largo de espaldas) sin regenerar el resto de crear_extras.lua
-- (recursos, mascotas, retratos). Reusa su dibujo.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo [--script-param only=npc_lyra] --script arreglar_lyra.lua
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
    -- la punta del pelo se afina (antes era un rectángulo oscuro que parecía una mochila)
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

local only = app.params.only or "npc_lyra"
for name, st in pairs(NPCS) do
  if string.find("," .. only .. ",", "," .. name .. ",", 1, true) then
    local frames, tags = {}, {}
    for _, view in ipairs({{"abajo", drawFront}, {"arriba", drawBack}, {"lado", drawSide}}) do
      local from = #frames + 1
      for step=0,2 do frames[#frames + 1] = view[2](st, step) end
      tags[#tags + 1] = {view[1], from, #frames}
    end
    saveFrames(dir .. "/caminar/" .. name .. ".aseprite", 32, 32, frames, tags)
  end
end
