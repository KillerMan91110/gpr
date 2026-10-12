-- Arte de AURELIA, la capital de Etheria (misma paleta y estilo que crear_mundo.lua / crear_extras.lua):
--  * caminar/npc_*.aseprite y cit_*.aseprite: ciudadanos de varias razas (32x32, 9 frames)
--  * retratos/<npc>.aseprite: 64x64 para los diálogos
--  * paloma, gato, pilar (el Pilar de Aethra animado) y carteles con ícono para los edificios
--
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_ciudad.lua
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
-- Aurelia: ciudadanos de varias razas, retratos, palomas, gatos, el Pilar de Aethra y carteles
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_ciudad.lua
-- =====================================================================================
for _, e in ipairs({
  {"F2","c8905e"},{"f2","9a6a42"},{"F3","8a5a3a"},{"f3","63402a"},{"F4","f4d6c0"},{"f4","d2a890"},
  {"k1","e0dccf"},{"m1","f2ecd8"},{"m2","d6cdb2"},{"m3","a89f84"},{"pb","3a5ea8"},{"go","ffd860"},{"god","c89a2a"},
  {"ag","a8d4b8"},{"agh","dcf4e4"},{"gl","9ad8f0"},{"Hs","d8dce4"},{"Hg","9a9ca4"},{"Ho","e07a3a"},{"Hd","1c1820"},
  {"Cr","b03030"},{"Cb","3a5ea8"},{"Cg","3e7a4a"},{"Cy","d8b040"},{"Cp","8a4ab0"},{"Cw","e8e0d0"},{"Cn","6a4a32"},{"Co","d07a30"},
  {"a1","4a8ad8"},{"a3","6aa8ec"},{"a4","2a5a9c"},{"sd","8a847a"},{"sw","b8b2a8"},{"sk","4c4a46"},
  {"P","eeecf4"},{"p","b4b0c8"},{"Ph","ffffff"},{"fw","f4f4f4"},{"L","434352"},{"l","2e2e3a"},{"Lh","62627a"},
  {"ad","a8501e"},{"au","d87a3a"},{"m","1d2770"},{"Mh","5070e0"},{"lp","5aa040"},{"bb","4a5ad8"},{"t1","c9a46a"},
}) do C[e[1]] = hex(e[2]) end

-- st: skin/skinD, hair/hairD, style (corto|largo|mono|calvo|capucha|gorra|casco|sombrero|mago), top/topD/topL,
--     pants, boots, robe, trim, apron, belt, beard, race (humano|elfo|enano|mediano|nino|felino), ears (felino)
local function headFront(G, st, bob)
  G.rect(10,9+bob,21,17+bob,"F"); G.rect(10,9+bob,10,17+bob,"f"); G.rect(11,17+bob,20,17+bob,"f")
  G.rect(12,13+bob,13,14+bob,"E"); G.rect(18,13+bob,19,14+bob,"E"); G.px(12,13+bob,"W"); G.px(18,13+bob,"W")
  G.px(15,16+bob,"f"); G.px(16,16+bob,"f")
  local h, hd, s = st.hair, st.hairD or st.hair, st.style
  if s == "corto" or s == "mono" or s == "gorra" or s == "sombrero" then
    G.rect(9,4+bob,22,9+bob,h); G.rect(8,7+bob,9,13+bob,h); G.rect(22,7+bob,23,13+bob,h); G.rect(10,10+bob,21,10+bob,h)
    G.px(12,11+bob,h); G.px(19,11+bob,h); G.px(13,5+bob,hd); G.px(18,6+bob,hd)
  elseif s == "largo" then
    G.rect(9,4+bob,22,9+bob,h); G.rect(8,7+bob,9,22+bob,h); G.rect(22,7+bob,23,22+bob,h)
    G.rect(10,10+bob,13,11+bob,h); G.rect(18,10+bob,21,11+bob,h); G.rect(8,18+bob,9,22+bob,hd); G.rect(22,18+bob,23,22+bob,hd)
  elseif s == "calvo" then
    G.rect(10,6+bob,21,9+bob,"F"); G.rect(11,5+bob,20,5+bob,"F"); G.px(13,6+bob,"W"); G.rect(9,10+bob,10,13+bob,h); G.rect(21,10+bob,22,13+bob,h)
  elseif s == "capucha" then
    G.rect(8,3+bob,23,9+bob,h); G.rect(7,7+bob,9,18+bob,h); G.rect(22,7+bob,24,18+bob,h); G.rect(10,9+bob,21,10+bob,h); G.rect(9,4+bob,22,5+bob,hd)
  end
  if s == "mono" then G.ellipse(15.5,2+bob,4,3,h); G.px(15,1+bob,hd) end
  if s == "gorra" then G.rect(8,3+bob,23,7+bob,st.hat); G.rect(8,7+bob,23,8+bob,st.hatD or st.hat); G.px(14,4+bob,"W") end
  if s == "sombrero" then G.rect(5,6+bob,26,7+bob,st.hat); G.rect(9,1+bob,22,6+bob,st.hat); G.rect(9,5+bob,22,5+bob,st.hatD or "b"); if st.pluma then G.rect(21,-2+bob,22,4+bob,st.pluma); G.px(23,-3+bob,st.pluma) end end
  if s == "casco" then G.rect(8,3+bob,23,10+bob,"S"); G.rect(8,3+bob,23,4+bob,"W"); G.rect(7,8+bob,9,15+bob,"s"); G.rect(22,8+bob,24,15+bob,"s"); G.rect(15,0+bob,16,3+bob,st.hat or "R") end
  if s == "mago" then
    G.rect(9,4+bob,22,9+bob,h); G.rect(8,7+bob,9,20+bob,h); G.rect(22,7+bob,23,20+bob,h)
    G.rect(5,6+bob,26,7+bob,st.hat); for y=0,6 do G.rect(11+y//2,-1+y+bob,20-y//2,-1+y+bob,st.hat) end; G.px(16,0+bob,"go")
  end
  if st.beard then G.rect(10,15+bob,21,19+bob,st.beard); G.rect(12,20+bob,19,20+bob,st.beard); G.rect(14,21+bob,17,22+bob,st.beard); G.rect(14,15+bob,17,15+bob,"R") end
  if st.race == "elfo" then G.rect(6,10+bob,8,11+bob,"F"); G.px(5,9+bob,"F"); G.rect(23,10+bob,25,11+bob,"F"); G.px(26,9+bob,"F") end
  if st.race == "felino" then
    for i=0,3 do G.rect(10+i//2,1+i+bob,12-i//2+1,1+i+bob,st.ears or h); G.rect(19+i//2,1+i+bob,21-i//2+1,1+i+bob,st.ears or h) end
    G.px(11,3+bob,"fr"); G.px(20,3+bob,"fr"); G.px(9,15+bob,"W"); G.px(22,15+bob,"W")
  end
end

local function headBack(G, st, bob)
  local h, s = st.hair, st.style
  if s == "calvo" then G.rect(10,5+bob,21,17+bob,"F"); G.rect(9,9+bob,10,15+bob,"f"); G.rect(10,12+bob,21,15+bob,h)
  elseif s == "largo" or s == "mago" then G.rect(9,4+bob,22,17+bob,h); G.rect(8,7+bob,23,23+bob,h); G.rect(10,20+bob,21,24+bob,st.hairD or h)
  elseif s == "capucha" then G.rect(8,3+bob,23,18+bob,h); G.rect(10,18+bob,21,23+bob,h)
  else G.rect(9,4+bob,22,16+bob,h); G.rect(8,7+bob,23,14+bob,h); G.rect(10,17+bob,21,17+bob,"f") end
  if s == "mono" then G.ellipse(15.5,3+bob,4,3,h) end
  if s == "gorra" then G.rect(8,3+bob,23,8+bob,st.hat) end
  if s == "sombrero" then G.rect(5,6+bob,26,7+bob,st.hat); G.rect(9,1+bob,22,6+bob,st.hat) end
  if s == "casco" then G.rect(8,3+bob,23,13+bob,"S"); G.rect(15,0+bob,16,3+bob,st.hat or "R") end
  if s == "mago" then G.rect(5,6+bob,26,7+bob,st.hat); for y=0,6 do G.rect(11+y//2,-1+y+bob,20-y//2,-1+y+bob,st.hat) end end
  if st.race == "elfo" then G.rect(6,10+bob,8,11+bob,"F"); G.rect(23,10+bob,25,11+bob,"F") end
  if st.race == "felino" then for i=0,3 do G.rect(10,1+i+bob,12,1+i+bob,st.ears or h); G.rect(19,1+i+bob,21,1+i+bob,st.ears or h) end end
end

local function legs(G, st, step, bob)
  if st.robe then
    for y=18+bob,28 do local e = (y-18)//4; G.rect(10-e,y,21+e,y,st.top); G.rect(19+e,y,21+e,y,st.topD) end
    G.rect(9,28,22,28,st.trim or st.topD)
    local l, r = (step == 1) and 1 or 0, (step == 2) and 1 or 0
    G.rect(11,29,14,30-r,"b"); G.rect(17,29,20,30-l,"b")
    return
  end
  local liftL, liftR = (step == 2) and 1 or 0, (step == 1) and 1 or 0
  G.rect(11,26,14,29-liftL,st.pants); G.rect(11,29-liftL,14,30-liftL,st.boots)
  G.rect(17,26,20,29-liftR,st.pants); G.rect(17,29-liftR,20,30-liftR,st.boots)
end

local function body(G, st, step, bob, back)
  local swing = (step == 1) and 1 or ((step == 2) and -1 or 0)
  if back then swing = -swing end
  local x0, x1 = 10, 21
  if st.race == "enano" then x0, x1 = 9, 22 end
  G.rect(x0,18+bob,x1,26,st.top); G.rect(x1-2,18+bob,x1,26,st.topD); G.rect(x0+1,19+bob,x0+1,24,st.topL or st.top)
  if not back then
    if st.vest then G.rect(13,19+bob,18,26,st.vest) end
    if st.apron then G.rect(12,20+bob,19,28,st.apron); G.rect(12,20+bob,12,28,"t") end
    if st.tabard then G.rect(13,18+bob,18,27,st.tabard); G.rect(13,18+bob,18,19+bob,"go"); G.px(15,22+bob,"go"); G.px(16,22+bob,"go") end
    if st.robe and st.trim then G.rect(15,18+bob,16,26,st.trim) end
  end
  if st.belt then G.rect(x0,25,x1,25,st.belt); G.px(15,25,"go") end
  G.rect(12,17+bob,19,18+bob,st.neck or st.topD)
  local a0 = (st.race == "enano") and 7 or 8
  G.rect(a0,19+bob-swing,a0+1,24+bob-swing,st.top); G.rect(a0,25+bob-swing,a0+1,26+bob-swing,"F")
  G.rect(x1+1,19+bob+swing,x1+2,24+bob+swing,st.topD); G.rect(x1+1,25+bob+swing,x1+2,26+bob+swing,"F")
  if back and st.race == "felino" then for i=0,6 do G.px(15+math.floor(math.sin(i/2)*2), 26+i//2, st.ears or st.hair); G.px(16+math.floor(math.sin(i/2)*2), 26+i//2, st.ears or st.hair) end end
end

local function sideView(G, st, step, bob)
  local fwd = (step == 1) and 2 or ((step == 2) and -2 or 0)
  if st.robe then
    for y=18+bob,28 do local e = (y-18)//5; G.rect(11-e,y,20+e,y,st.top); G.rect(11-e,y,12-e,y,st.topD) end
    G.rect(10,28,21,28,st.trim or st.topD); G.rect(15+fwd,29,18+fwd,30,"b")
  else
    G.rect(13-fwd,26,15-fwd,29,st.pants); G.rect(12-fwd,30,15-fwd,30,st.boots)
    G.rect(16+fwd,26,18+fwd,29,st.pants); G.rect(16+fwd,30,20+fwd,30,st.boots)
  end
  if st.race == "felino" then for i=0,7 do G.px(9-i//2, 24-i+math.floor(math.sin(i)*1), st.ears or st.hair); G.px(8-i//2, 24-i, st.ears or st.hair) end end
  G.rect(11,18+bob,20,26,st.top); G.rect(11,18+bob,12,26,st.topD)
  if st.vest then G.rect(16,19+bob,20,26,st.vest) end
  if st.apron then G.rect(18,20+bob,21,28,st.apron) end
  if st.tabard then G.rect(16,18+bob,20,27,st.tabard) end
  if st.belt then G.rect(11,25,20,25,st.belt) end
  G.rect(13,17+bob,19,18+bob,st.neck or st.topD)
  G.rect(11,9+bob,21,17+bob,"F"); G.rect(11,17+bob,20,17+bob,"f"); G.rect(19,13+bob,19,14+bob,"E"); G.px(22,14+bob,"F")
  local h, s = st.hair, st.style
  if s == "calvo" then G.rect(11,6+bob,20,9+bob,"F"); G.rect(10,10+bob,13,14+bob,h)
  elseif s == "largo" or s == "mago" then G.rect(9,4+bob,20,9+bob,h); G.rect(8,7+bob,14,23+bob,h)
  elseif s == "capucha" then G.rect(8,3+bob,19,10+bob,h); G.rect(8,7+bob,14,19+bob,h)
  else G.rect(9,4+bob,20,9+bob,h); G.rect(9,7+bob,14,15+bob,h) end
  if s == "mono" then G.ellipse(11,4+bob,4,3,h) end
  if s == "gorra" then G.rect(8,3+bob,21,7+bob,st.hat); G.rect(20,7+bob,24,8+bob,st.hatD or st.hat) end
  if s == "sombrero" then G.rect(4,6+bob,26,7+bob,st.hat); G.rect(9,1+bob,21,6+bob,st.hat); if st.pluma then G.rect(9,-2+bob,10,4+bob,st.pluma) end end
  if s == "casco" then G.rect(8,3+bob,21,10+bob,"S"); G.rect(8,3+bob,21,4+bob,"W"); G.rect(9,0+bob,11,3+bob,st.hat or "R") end
  if s == "mago" then G.rect(4,6+bob,25,7+bob,st.hat); for y=0,6 do G.rect(10+y//2,-1+y+bob,19-y//2,-1+y+bob,st.hat) end end
  if st.beard then G.rect(17,15+bob,22,20+bob,st.beard); G.rect(18,21+bob,21,22+bob,st.beard) end
  if st.race == "elfo" then G.rect(11,9+bob,12,11+bob,"F"); G.px(10,8+bob,"F") end
  if st.race == "felino" then for i=0,3 do G.rect(11+i//2,1+i+bob,13,1+i+bob,st.ears or h) end; G.px(23,15+bob,"W") end
  local sw = -fwd // 2
  G.rect(15+sw,19+bob,17+sw,24+bob,st.topL or st.top); G.rect(15+sw,25+bob,17+sw,26+bob,"F")
end

-- quita filas del torso para las razas bajas (enanos, medianos, niños): baja todo lo de arriba
local function squash(G, from, n)
  if n <= 0 then return end
  local W, g = G.w, G.g
  local out = {}
  for k, c in pairs(g) do
    local x, y = k % W, k // W
    if y >= from + n then out[k] = c
    elseif y < from then out[(y + n) * W + x] = c end
  end
  G.g = out
end

-- color de piel del personaje (los dibujos usan F/f)
local function skin(G, st)
  local map = {F = st.skin or "F", f = st.skinD or "f"}
  for k, c in pairs(G.g) do if map[c] then G.g[k] = map[c] end end
end

local SHORT = {enano = 4, mediano = 5, nino = 6}
local function frame(st, view, step)
  local G = newGrid(32, 32)
  local bob = (step == 0) and 0 or 1
  if view == "abajo" then legs(G, st, step, bob); body(G, st, step, bob, false); headFront(G, st, bob)
  elseif view == "arriba" then legs(G, st, step, bob); body(G, st, step, bob, true); headBack(G, st, bob)
  else sideView(G, st, step, bob) end
  squash(G, 19, SHORT[st.race] or 0)
  skin(G, st)
  return G
end

local function makeWalker(name, st)
  local frames, tags = {}, {}
  for _, view in ipairs({"abajo", "arriba", "lado"}) do
    local from = #frames + 1
    for step=0,2 do frames[#frames + 1] = frame(st, view, step) end
    tags[#tags + 1] = {view, from, #frames}
  end
  saveFrames(dir .. "/caminar/" .. name .. ".aseprite", 32, 32, frames, tags)
end

local D = "F2"; local Dd = "f2"; local N = "F3"; local Nd = "f3"; local P = "F4"; local Pd = "f4"
local CITIZENS = {
  -- con nombre y oficio
  npc_tomas     = {race="humano", style="corto", hair="B", hairD="b", top="Cg", topD="g", topL="Gh", pants="b", boots="B", belt="b", vest="N"},
  npc_elenya    = {race="humano", style="largo", hair="Y", hairD="y", top="P", topD="p", topL="Ph", robe=true, trim="Cb", neck="Cb"},
  npc_bram      = {race="humano", style="sombrero", hat="Cr", hatD="r", pluma="fw", hair="Hg", beard="Hs", top="Cr", topD="r", topL="R", pants="Hd", boots="b", belt="b"},
  npc_marta     = {race="humano", style="mono", hair="Ho", hairD="o", top="Cg", topD="g", robe=true, apron="T", trim="g", skin=D, skinD=Dd},
  npc_durin     = {race="enano", style="calvo", hair="Hs", beard="Hs", top="Cy", topD="y", topL="go", pants="b", boots="b", belt="b", vest="Cn"},
  npc_aelin     = {race="elfo", style="largo", hair="Hs", hairD="Hg", top="Cp", topD="v", topL="Vh", robe=true, trim="go", skin=P, skinD=Pd},
  npc_brokk     = {race="enano", style="corto", hair="Ho", beard="Ho", top="Cr", topD="r", pants="b", boots="b", apron="N", belt="b"},
  npc_cochero   = {race="humano", style="gorra", hat="Cn", hatD="b", hair="b", top="Cn", topD="b", topL="N", pants="Hd", boots="b", belt="b", skin=D, skinD=Dd},
  npc_farolero  = {race="humano", style="gorra", hat="Hd", hatD="K", hair="Hg", top="Hd", topD="K", topL="L", pants="l", boots="b", robe=true, trim="go"},
  npc_bardo     = {race="elfo", style="sombrero", hat="Cg", hatD="g", pluma="fr", hair="Y", top="Co", topD="ad", topL="au", pants="Cp", boots="b", belt="b"},
  npc_heraldo   = {race="humano", style="sombrero", hat="go", hatD="god", pluma="Cb", hair="B", top="Cb", topD="m", topL="Mh", pants="Cw", boots="b", tabard="Cw"},
  -- maestros de las órdenes
  npc_maestro_guerrero = {race="humano", style="casco", hat="R", hair="b", beard="b", top="A", topD="a", topL="Ah", pants="a", boots="A", belt="b", tabard="Cr"},
  npc_maestra_maga     = {race="elfo", style="mago", hat="Cp", hair="Hs", hairD="Hg", top="Cp", topD="v", topL="Vh", robe=true, trim="go", skin=P, skinD=Pd},
  npc_maestra_arquera  = {race="elfo", style="capucha", hair="Cg", hairD="Gh", top="Cg", topD="g", topL="Gh", pants="b", boots="B", belt="b", vest="N"},
  npc_maestro_picaro   = {race="felino", style="corto", hair="Hd", ears="Hd", top="L", topD="l", topL="Lh", pants="l", boots="L", belt="b", neck="V", skin=D, skinD=Dd},
  npc_sumo_sacerdote   = {race="humano", style="calvo", hair="Hs", beard="Hs", top="P", topD="p", topL="Ph", robe=true, trim="go", neck="go"},
  -- guardia de la ciudad
  npc_guardia   = {race="humano", style="casco", hat="Cb", hair="b", top="A", topD="a", topL="Ah", pants="a", boots="A", tabard="Cb", belt="b"},
  -- ciudadanos
  cit_1  = {race="humano", style="corto", hair="b", top="Cb", topD="m", topL="Mh", pants="b", boots="b", belt="b"},
  cit_2  = {race="humano", style="largo", hair="B", hairD="b", top="Cr", topD="r", robe=true, trim="r"},
  cit_3  = {race="elfo", style="corto", hair="Hs", top="Cg", topD="g", topL="Gh", pants="Cw", boots="b", skin=P, skinD=Pd},
  cit_4  = {race="elfo", style="largo", hair="Y", hairD="y", top="Cw", topD="T", robe=true, trim="Cg", skin=P, skinD=Pd},
  cit_5  = {race="enano", style="corto", hair="B", beard="B", top="Hg", topD="s", pants="b", boots="b", belt="b"},
  cit_6  = {race="mediano", style="corto", hair="Ho", top="Cy", topD="y", pants="Cg", boots="b", vest="Cn"},
  cit_7  = {race="felino", style="largo", hair="Co", hairD="ad", ears="Co", top="Cp", topD="v", robe=true, trim="go"},
  cit_8  = {race="felino", style="corto", hair="Hg", ears="Hg", top="Cn", topD="b", topL="N", pants="Hd", boots="b", skin=D, skinD=Dd},
  cit_9  = {race="humano", style="largo", hair="Hd", hairD="K", top="Cp", topD="v", robe=true, trim="go", neck="go"},
  cit_10 = {race="humano", style="corto", hair="Y", top="Cb", topD="m", topL="Mh", pants="Cw", boots="b", belt="go", vest="go"},
  cit_11 = {race="humano", style="calvo", hair="b", top="Cn", topD="b", robe=true, trim="b", skin=N, skinD=Nd},
  cit_12 = {race="humano", style="gorra", hat="Cb", hair="b", beard="Hg", top="Cw", topD="T", pants="Cb", boots="b"},
  cit_13 = {race="humano", style="mono", hair="Hd", top="Co", topD="ad", robe=true, trim="go", skin=N, skinD=Nd},
  cit_14 = {race="humano", style="corto", hair="Hd", top="Cg", topD="g", pants="b", boots="b", vest="Cn", skin=N, skinD=Nd},
  cit_15 = {race="humano", style="gorra", hat="Cr", hair="B", top="Cw", topD="T", robe=true, apron="Cw", trim="T", skin=D, skinD=Dd},
  nino_a = {race="nino", style="corto", hair="Ho", top="Cr", topD="r", pants="Cb", boots="b"},
  nino_b = {race="nino", style="largo", hair="Y", hairD="y", top="Cb", topD="m", robe=true, trim="m"},
}
for name, st in pairs(CITIZENS) do makeWalker(name, st) end

-- =====================================================================================
-- Retratos 64x64 (busto) para los diálogos de la ciudad
-- =====================================================================================
local function portrait(st)
  local G = newGrid(64, 64)
  local sk, skd = st.skin or "F", st.skinD or "f"
  G.ellipse(32,66,26,16,st.top); G.ellipse(32,68,26,14,st.topD); G.ellipse(32,62,24,12,st.top)
  if st.robe and st.trim then G.rect(30,48,33,64,st.trim) end
  if st.tabard then G.rect(22,50,42,64,st.tabard); G.rect(22,50,42,52,"go") end
  if st.apron then G.rect(24,52,40,64,st.apron) end
  if st.vest then G.rect(20,48,26,64,st.vest); G.rect(38,48,44,64,st.vest) end
  -- pelo por detrás
  if st.style == "largo" or st.style == "mago" then G.ellipse(32,26,19,17,st.hair); G.rect(13,24,20,58,st.hair); G.rect(44,24,51,58,st.hair) end
  if st.style == "capucha" then G.ellipse(32,26,20,19,st.hair); G.rect(12,24,19,52,st.hair); G.rect(45,24,52,52,st.hair) end
  if st.race == "felino" then G.rect(15,4,22,16,st.ears or st.hair); G.rect(42,4,49,16,st.ears or st.hair); G.rect(17,8,20,14,"fr"); G.rect(44,8,47,14,"fr") end
  G.rect(27,40,37,48,skd); G.rect(28,40,36,46,sk)
  if st.race == "elfo" then for i=0,7 do G.rect(12-i,24-i,17-i//2,26-i//3,sk); G.rect(47+i//2,24-i,52+i,26-i//3,sk) end end
  G.ellipse(32,30,14,15,sk); G.rect(19,30,20,36,skd); G.ellipse(32,40,10,4,sk)
  G.rect(24,30,28,35,"W"); G.rect(36,30,40,35,"W"); G.rect(25,31,28,35,st.eyes or "E"); G.rect(37,31,40,35,st.eyes or "E"); G.px(26,32,"W"); G.px(38,32,"W")
  G.rect(25,30,28,30,"K"); G.rect(36,30,40,30,"K"); G.px(32,37,skd); G.px(33,38,skd); G.rect(30,42,34,42,st.lips or skd)
  local h = st.hair
  if st.style == "corto" or st.style == "mono" or st.style == "gorra" or st.style == "sombrero" or st.style == "largo" or st.style == "mago" then
    G.ellipse(32,18,16,8,h); G.rect(17,18,20,30,h); G.rect(44,18,47,30,h); G.rect(24,22,31,24,h); G.rect(36,22,42,23,h)
  end
  if st.style == "calvo" then G.ellipse(32,19,14,8,sk); G.rect(26,14,30,15,"W"); G.rect(17,26,20,34,h); G.rect(44,26,47,34,h) end
  if st.style == "mono" then G.ellipse(32,8,7,6,h) end
  if st.style == "capucha" then G.ellipse(32,16,15,5,st.hair); G.ellipse(32,14,12,3,st.hairD or st.hair) end
  if st.style == "gorra" then G.ellipse(32,14,17,7,st.hat); G.rect(14,16,50,19,st.hatD or st.hat) end
  if st.style == "sombrero" then G.rect(6,16,58,19,st.hat); G.rect(18,4,46,16,st.hat); G.rect(18,14,46,15,st.hatD or "b"); if st.pluma then G.rect(44,-2,47,12,st.pluma) end end
  if st.style == "casco" then G.ellipse(32,18,18,11,"S"); G.rect(14,18,50,22,"s"); G.rect(30,2,34,10,st.hat or "R"); G.rect(30,22,34,34,"s") end
  if st.style == "mago" then G.rect(6,14,58,17,st.hat); for y=0,14 do G.rect(22+y//2,y,42-y//2,y,st.hat) end; G.px(32,1,"go") end
  if st.beard then G.ellipse(32,47,15,9,st.beard); G.rect(18,36,22,46,st.beard); G.rect(42,36,46,46,st.beard); G.rect(26,39,38,41,st.beard); G.rect(30,43,34,44,"R") end
  return G
end
for _, name in ipairs({"npc_tomas","npc_elenya","npc_bram","npc_marta","npc_durin","npc_aelin","npc_brokk","npc_cochero","npc_bardo","npc_heraldo",
  "npc_maestro_guerrero","npc_maestra_maga","npc_maestra_arquera","npc_maestro_picaro","npc_sumo_sacerdote","npc_guardia"}) do
  saveFrames(dir .. "/retratos/" .. name:gsub("^npc_", "") .. ".aseprite", 64, 64, {portrait(CITIZENS[name])})
end

-- =====================================================================================
-- Palomas (16x16: quieta, picoteando, volando A y B) y gato (16x16: sentado, caminando A y B)
-- =====================================================================================
local pig = {}
for f=0,3 do
  local G = newGrid(16, 16)
  if f < 2 then
    G.ellipse(8,11,4,3,"Hg"); G.ellipse(7,11,3,2,"Hs"); local hy = f == 1 and 11 or 8; G.ellipse(11,hy,2,2,"Hg"); G.px(12,hy,"K"); G.px(13,hy+1,"Cy")
    G.px(10,hy+2,"lp"); G.rect(7,14,7,15,"fr"); G.rect(9,14,9,15,"fr"); G.rect(3,10,4,11,"sk")
  else
    G.ellipse(8,9,3,2,"Hg"); G.ellipse(11,8,2,2,"Hg"); G.px(12,8,"K"); G.px(13,8,"Cy")
    if f == 2 then G.rect(3,3,8,7,"Hs"); G.rect(9,3,13,6,"Hs") else G.rect(3,10,8,12,"Hs"); G.rect(9,10,13,12,"Hs") end
  end
  pig[#pig + 1] = G
end
saveFrames(dir .. "/paloma.aseprite", 16, 16, pig)
local cat = {}
for f=0,2 do
  local G = newGrid(16, 16)
  if f == 0 then
    G.ellipse(8,11,4,4,"Co"); G.ellipse(8,6,3,3,"Co"); G.rect(5,2,6,4,"Co"); G.rect(10,2,11,4,"Co"); G.px(7,6,"K"); G.px(9,6,"K")
    for i=0,4 do G.px(12+i//3,14-i,"Co") end; G.rect(6,14,10,15,"ad")
  else
    local j = f == 1 and 0 or 1
    G.ellipse(7,10,5,3,"Co"); G.ellipse(12,8,3,3,"Co"); G.rect(11,4,11,6,"Co"); G.rect(14,4,14,6,"Co"); G.px(13,8,"K")
    G.rect(4,12,4,14-j,"ad"); G.rect(9,12,9,13+j,"ad"); for i=0,4 do G.px(2-i//3,9-i,"Co") end
  end
  cat[#cat + 1] = G
end
saveFrames(dir .. "/gato.aseprite", 16, 16, cat)

-- =====================================================================================
-- El Pilar de Aethra (96x128, 4 frames): estanque, columna de agua y la diosa con un orbe
-- =====================================================================================
local pil = {}
for f=0,3 do
  local G = newGrid(96, 128)
  -- estanque
  G.ellipse(48,112,46,14,"sd"); G.ellipse(48,110,44,12,"sw"); G.ellipse(48,110,40,10,"a4"); G.ellipse(48,109,38,8,"a1")
  for i=0,5 do local a = (i / 6) * math.pi * 2 + f * 0.4; G.ellipse(48 + math.floor(math.cos(a) * (20 + f * 3)), 109 + math.floor(math.sin(a) * 5), 3, 1, "a3") end
  -- pedestal
  G.rect(38,74,57,108,"m2"); G.rect(38,74,41,108,"m1"); G.rect(54,74,57,108,"m3"); G.rect(34,72,61,76,"m1"); G.rect(34,104,61,108,"m3")
  G.ellipse(48,90,5,5,"go"); G.ellipse(48,90,3,3,"bb")
  -- la diosa Aethra con los brazos en alto y un orbe de luz
  G.rect(43,44,52,72,"m1"); G.rect(50,44,52,72,"m2"); for y=60,72 do G.rect(42-(y-60)//4,y,53+(y-60)//4,y,"m1") end
  G.ellipse(47.5,38,5,6,"m1"); G.rect(42,36,44,50,"m2"); G.rect(51,36,53,50,"m2")
  G.rect(38,26,41,46,"m1"); G.rect(54,26,57,46,"m1")
  local glow = ({"agh","Ph","gl","Ph"})[f + 1]
  G.ellipse(47.5,18,8,8,"gl"); G.ellipse(47.5,18,6,6,glow); G.ellipse(46,16,2,2,"Ph")
  -- agua que cae desde el orbe y las manos al estanque (se mueve en cada frame)
  for _, x in ipairs({36, 59}) do
    for y=30,104 do
      if (y + f * 4) % 8 < 5 then G.px(x + math.floor(math.sin((y + f * 3) / 6)), y, "a3") end
      if (y + f * 4) % 12 == 0 then G.px(x + 1, y, "Ph") end
    end
  end
  for y=26,40 do if (y + f * 2) % 4 < 2 then G.px(47,y,"a3"); G.px(48,y,"gl") end end
  -- salpicaduras
  for i=0,3 do G.px(30 + i * 12 + f, 100 - (f + i) % 3, "Ph"); G.px(34 + i * 10 - f, 102, "a3") end
  pil[#pil + 1] = G
end
saveFrames(dir .. "/pilar.aseprite", 96, 128, pil)

-- =====================================================================================
-- Carteles colgantes con ícono (24x24) para los edificios
-- =====================================================================================
local SIGNS = {
  espada = function(G) for i=0,9 do G.px(7+i,16-i,"S"); G.px(8+i,16-i,"W") end; G.rect(6,14,10,15,"go"); G.rect(5,17,7,18,"b") end,
  baston = function(G) for i=0,10 do G.px(8+i//2,17-i,"N") end; G.ellipse(14,6,3,3,"Cp"); G.px(13,5,"Ph") end,
  arco = function(G) for i=0,10 do G.px(9+math.floor(math.sin(i/10*math.pi)*4),6+i,"B") end; G.rect(9,6,9,16,"W"); G.rect(9,11,17,11,"b"); G.px(18,11,"S") end,
  daga = function(G) for i=0,6 do G.px(10+i,14-i,"S") end; G.rect(8,14,11,15,"V"); G.px(7,16,"b") end,
  sol = function(G) G.ellipse(12,11,3,3,"go"); for i=0,7 do local a = i * math.pi / 4; G.px(12 + math.floor(math.cos(a) * 6), 11 + math.floor(math.sin(a) * 6), "go") end end,
  pocion = function(G) G.ellipse(12,13,4,4,"fr"); G.rect(11,6,13,9,"gl"); G.rect(10,5,14,6,"b"); G.px(11,12,"Ph") end,
  yunque = function(G) G.rect(6,9,18,11,"d"); G.rect(9,12,15,14,"d"); G.rect(7,15,17,16,"sk"); G.rect(4,9,6,10,"d") end,
  jarra = function(G) G.rect(8,8,15,17,"go"); G.rect(16,10,18,15,"god"); G.rect(8,6,15,8,"fw"); G.px(10,10,"Ph") end,
  moneda = function(G) G.ellipse(12,11,6,6,"god"); G.ellipse(12,11,5,5,"go"); G.rect(11,8,12,14,"god") end,
  pergamino = function(G) G.rect(7,6,17,17,"T"); G.rect(6,5,18,6,"t"); G.rect(6,17,18,18,"t"); for y=9,15,3 do G.rect(9,y,15,y,"b") end end,
  balanza = function(G) G.rect(11,5,12,17,"go"); G.rect(6,7,17,7,"go"); G.ellipse(7,12,3,1,"god"); G.ellipse(16,12,3,1,"god"); G.rect(9,17,14,17,"god") end,
  gema = function(G) for y=0,8 do local w = y < 3 and 2 + y * 2 or 8 - (y - 3); G.rect(12-w//2,6+y,12+w//2,6+y,"Cp") end; G.px(11,7,"Ph") end,
  ala = function(G) for i=0,8 do G.rect(6+i,8+i//2,7+i,9+i//2,"Ph") end; G.ellipse(14,10,4,5,"Ph"); G.px(14,8,"gl") end,
  rueda = function(G) G.ellipse(12,11,6,6,"b"); G.ellipse(12,11,4,4,"B"); for i=0,3 do local a = i * math.pi / 4; G.px(12+math.floor(math.cos(a)*4),11+math.floor(math.sin(a)*4),"b"); G.px(12-math.floor(math.cos(a)*4),11-math.floor(math.sin(a)*4),"b") end; G.px(12,11,"go") end,
  libro = function(G) G.rect(6,7,17,16,"Cr"); G.rect(7,8,16,15,"r"); G.rect(11,7,12,16,"go"); G.rect(8,9,10,9,"go") end,
  cama = function(G) G.rect(5,12,18,15,"B"); G.rect(5,9,8,15,"b"); G.rect(9,10,17,12,"fw"); G.rect(5,16,6,17,"b"); G.rect(17,16,18,17,"b") end,
}
local ORDER_SIGNS = {"espada","baston","arco","daga","sol","pocion","yunque","jarra","moneda","pergamino","balanza","gema","ala","rueda","libro","cama"}
local signs = {}
for _, k in ipairs(ORDER_SIGNS) do
  local G = newGrid(24, 24)
  -- soporte y tabla de madera
  G.rect(2,2,21,3,"b"); G.rect(5,3,5,5,"d"); G.rect(18,3,18,5,"d")
  G.rect(3,5,20,21,"B"); G.rect(3,5,20,6,"t1"); G.rect(3,20,20,21,"b"); G.rect(3,5,4,21,"b"); G.rect(19,5,20,21,"b")
  G.rect(5,7,18,19,"T")
  SIGNS[k](G)
  signs[#signs + 1] = G
end
saveFrames(dir .. "/carteles.aseprite", 24, 24, signs)
