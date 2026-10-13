-- Aldren, el anciano sabio de la Aldea Espiga: hoja de caminar (32x32, abajo/arriba/lado x3)
-- y retrato (64x64). Reusa la paleta y el dibujo de crear_ciudad.lua sin regenerar la ciudad.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_anciano.lua
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

-- =====================================================================================
-- Aldren: calvo, pelo y barba blancos y largos, túnica de lana verde musgo con ribete crema,
-- un poco encorvado y con un cayado de roble rematado por una gema
-- =====================================================================================
local aldren = {race="humano", style="calvo", hair="Hs", hairD="Hg", beard="Hs", top="Cg", topD="g", topL="Gh",
  robe=true, trim="T", belt="N", neck="T", skin="F", skinD="f"}

-- barba hasta el pecho (la de crear_ciudad.lua es corta) y cejas blancas pobladas
local function viejo(G, view, bob)
  if view == "abajo" then
    G.rect(11,21+bob,20,23+bob,"Hs"); G.rect(12,24+bob,19,25+bob,"Hs"); G.rect(14,26+bob,17,26+bob,"Hg")
    G.rect(11,12+bob,13,12+bob,"Hs"); G.rect(18,12+bob,20,12+bob,"Hs")
    G.px(15,21+bob,"Hg"); G.px(16,23+bob,"Hg")
    G.rect(14,15+bob,17,15+bob,"Hg") -- la boca queda escondida entre la barba
  elseif view == "arriba" then
    -- de espaldas: la corona de pelo blanco cae un poco hacia la nuca
    for k, c in pairs(G.g) do if c == "Hs" then G.g[k] = "Hg" end end
    G.rect(10,15+bob,21,16+bob,"Hs"); G.rect(11,17+bob,20,17+bob,"Hg")
  elseif view == "lado" then
    G.rect(18,21+bob,22,23+bob,"Hs"); G.rect(19,24+bob,21,25+bob,"Hs"); G.rect(18,12+bob,20,12+bob,"Hs")
  end
end

-- cayado: en la mano derecha de frente, delante del cuerpo de lado
local function cayado(G, view, step, bob)
  local sw = (step == 1) and 1 or ((step == 2) and -1 or 0)
  if view == "abajo" then
    G.rect(24,7+bob+sw,25,30,"B"); G.rect(25,7+bob+sw,25,30,"b")
    G.rect(23,3+bob+sw,26,6+bob+sw,"N"); G.rect(24,2+bob+sw,25,5+bob+sw,"Cg"); G.px(24,3+bob+sw,"Gh")
  elseif view == "arriba" then
    G.rect(6,7+bob-sw,7,30,"B"); G.rect(5,3+bob-sw,8,6+bob-sw,"N")
  else
    local fwd = (step == 1) and 2 or ((step == 2) and -2 or 0)
    G.rect(23+fwd//2,6+bob,24+fwd//2,30,"B"); G.rect(22+fwd//2,2+bob,25+fwd//2,5+bob,"N"); G.rect(23+fwd//2,2+bob,24+fwd//2,4+bob,"Cg"); G.px(23+fwd//2,2+bob,"Gh")
    G.rect(21,19+bob,23,21+bob,"F")
  end
end

do
  local frames, tags = {}, {}
  for _, view in ipairs({"abajo", "arriba", "lado"}) do
    local from = #frames + 1
    for step=0,2 do
      local G = frame(aldren, view, step)
      local bob = (step == 0) and 0 or 1
      viejo(G, view, bob)
      cayado(G, view, step, bob)
      frames[#frames + 1] = G
    end
    tags[#tags + 1] = {view, from, #frames}
  end
  saveFrames(dir .. "/caminar/npc_anciano.aseprite", 32, 32, frames, tags)
end

-- retrato: el busto de siempre con barba larga, cejas, arrugas y el cayado asomando
do
  local G = portrait(aldren)
  G.ellipse(32,52,15,12,"Hs"); G.rect(18,36,22,50,"Hs"); G.rect(42,36,46,50,"Hs"); G.rect(26,39,38,44,"Hs")
  G.rect(29,41,35,41,"f")
  -- mechones de la barba (sutiles, en diagonal)
  for i=0,6 do G.px(27 - i//3, 48 + i*2, "Hg"); G.px(37 + i//3, 48 + i*2, "Hg"); G.px(32, 50 + i*2, "Hg") end
  G.rect(22,27,29,28,"Hs"); G.rect(35,27,42,28,"Hs")
  G.rect(24,23,30,23,"f"); G.rect(34,23,40,23,"f"); G.rect(21,37,23,37,"f"); G.rect(41,37,43,37,"f")
  G.rect(54,8,57,64,"B"); G.rect(57,8,57,64,"b"); G.rect(52,2,59,8,"N"); G.rect(54,1,57,6,"Cg"); G.px(54,2,"Gh"); G.px(55,2,"Gh")
  saveFrames(dir .. "/retratos/anciano.aseprite", 64, 64, {G})
end
