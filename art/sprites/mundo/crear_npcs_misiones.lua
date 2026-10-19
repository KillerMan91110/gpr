-- NPCs que dan misiones en el mundo abierto (ver src/game/questGivers.js). Mismo estilo, paleta y
-- formato que crear_ciudad.lua (de donde se copian las funciones de dibujo):
--  * caminar/<npc>.aseprite: 32x32, 9 frames (abajo, arriba, lado x3) con etiquetas
--  * retratos/<npc>.aseprite: 64x64 para los diálogos
-- y además exporta los PNG que usa el juego directamente a public/assets/mundo (parámetro png):
--  * caminar/<npc>.png: tira de 288x32 (los 9 frames en fila)
--  * retratos/<nombre>.png: 64x64
--
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script art/sprites/mundo/crear_npcs_misiones.lua
--
-- Para agregar otro NPC de misiones: sumarlo a NPCS (mismos campos que CITIZENS en crear_ciudad.lua).
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
  -- dracónidos (Volcán Rojo): escamas rojizas, carmín y grises de los viejos, cuernos de marfil y ojos dorados
  {"Dr","c4553a"},{"Drd","8e3424"},{"Dc","a83a3a"},{"Dcd","6e2222"},{"Dg","a8826a"},{"Dgd","74584a"},
  {"Hn","e8dcc0"},{"Hnd","b8a888"},{"Ey","f0c040"},{"Ab","d8c060"},{"Cs","5a5e6a"},{"Csd","3a3e48"},
  -- tritones (Costas Muertas): piel verde agua con escamas, aletas azules en vez de orejas y ojos grandes
  {"Tr","7ac4b4"},{"Trd","4e9688"},{"Tf","5ab0d8"},{"Tfd","2e78a8"},
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
  if st.race == "triton" then
    G.rect(6,10+bob,8,14+bob,"Tf"); G.px(5,9+bob,"Tf"); G.px(5,12+bob,"Tfd"); G.rect(6,12+bob,7,12+bob,"Tfd")
    G.rect(23,10+bob,25,14+bob,"Tf"); G.px(26,9+bob,"Tf"); G.px(26,12+bob,"Tfd"); G.rect(24,12+bob,25,12+bob,"Tfd")
    G.rect(12,12+bob,13,14+bob,"E"); G.rect(18,12+bob,19,14+bob,"E"); G.px(12,12+bob,"W"); G.px(18,12+bob,"W")
    G.px(11,16+bob,"f"); G.px(20,16+bob,"f")
  end
  if st.race == "draco" or st.horns then
    G.rect(10,2+bob,11,5+bob,"Hn"); G.px(9,1+bob,"Hn"); G.px(11,5+bob,"Hnd")
    G.rect(20,2+bob,21,5+bob,"Hn"); G.px(22,1+bob,"Hn"); G.px(20,5+bob,"Hnd")
    G.rect(12,13+bob,13,14+bob,"Ey"); G.rect(18,13+bob,19,14+bob,"Ey"); G.px(13,13+bob,"E"); G.px(13,14+bob,"E"); G.px(18,13+bob,"E"); G.px(18,14+bob,"E")
    G.px(11,16+bob,"f"); G.px(20,16+bob,"f"); G.px(10,12+bob,"f"); G.px(21,12+bob,"f")
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
  if st.race == "draco" or st.horns then G.rect(10,2+bob,11,5+bob,"Hn"); G.px(9,1+bob,"Hn"); G.rect(20,2+bob,21,5+bob,"Hn"); G.px(22,1+bob,"Hn") end
  if st.race == "triton" then G.rect(6,10+bob,8,14+bob,"Tf"); G.px(5,9+bob,"Tf"); G.rect(23,10+bob,25,14+bob,"Tf"); G.px(26,9+bob,"Tf") end
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
  if back and st.race == "draco" then for i=0,5 do local x = 14 + math.floor(math.sin(i/2) * 2); G.rect(x, 25 + i, x + 3 - i // 2, 25 + i, "F"); G.px(x, 25 + i, "f") end end
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
  if st.race == "triton" then
    G.rect(11,10+bob,13,14+bob,"Tf"); G.px(10,9+bob,"Tf"); G.rect(11,12+bob,12,12+bob,"Tfd"); G.rect(19,12+bob,20,14+bob,"E"); G.px(19,12+bob,"W"); G.px(17,16+bob,"f")
  end
  if st.race == "draco" or st.horns then
    G.rect(13,2+bob,14,5+bob,"Hn"); G.px(12,1+bob,"Hn"); G.rect(19,13+bob,19,14+bob,"Ey"); G.px(19,14+bob,"E")
    for i=0,6 do G.rect(10-i,22+i//2,11-i,23+i//2,"F") end
  end
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
  squash(G, 19, SHORT[st.race] or (st.small and 6) or 0)
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
  if st.race == "triton" then
    -- aletas en abanico a los lados de la cabeza, con sus varillas, y branquias en el cuello
    for i=0,9 do G.rect(10-i//2,20+i,18,21+i,"Tf"); G.rect(46,20+i,54+i//2,21+i,"Tf") end
    for _,y in ipairs({22,25,28}) do G.rect(9,y,17,y,"Tfd"); G.rect(47,y,55,y,"Tfd") end
    for _,y in ipairs({41,44,47}) do G.rect(24,y,27,y,skd); G.rect(37,y,40,y,skd) end
    G.rect(23,29,29,36,"W"); G.rect(35,29,41,36,"W"); G.rect(24,30,29,36,st.eyes or "E"); G.rect(36,30,41,36,st.eyes or "E"); G.px(25,31,"W"); G.px(37,31,"W")
    for _,p in ipairs({{28,22},{32,20},{36,22},{24,26},{40,26}}) do G.px(p[1],p[2],skd) end
  end
  if st.race == "draco" or st.horns then
    local hb = st.hornBig and 4 or 0
    for i=0,9+hb do G.rect(19-i//3,18-i,22-i//3,19-i,"Hn"); G.rect(42+i//3,18-i,45+i//3,19-i,"Hn") end
    G.rect(19,18,22,19,"Hnd"); G.rect(42,18,45,19,"Hnd")
    for _,p in ipairs({{28,22},{32,20},{36,22},{22,34},{24,37},{42,34},{40,37},{30,25},{34,25}}) do G.px(p[1],p[2],skd); G.px(p[1]+1,p[2],skd) end
    G.rect(25,31,28,35,"Ey"); G.rect(37,31,40,35,"Ey"); G.rect(26,31,26,35,"K"); G.rect(38,31,38,35,"K")
    G.rect(29,38,30,38,skd); G.rect(34,38,35,38,skd)
  end
  return G
end

-- =====================================================================================
-- NPCs de misiones
-- =====================================================================================
local NPCS = {
  -- Aldren, el Anciano Sabio de la Aldea Espiga: pelo y barba blancos, túnica marrón con ribete dorado
  npc_anciano = {race="humano", style="largo", hair="Hs", hairD="Hg", beard="Hs", top="Cn", topD="b", topL="N", robe=true, trim="go", neck="go", skin=P, skinD=Pd},
  -- Tilo, el niño de la Aldea que quiere ser héroe: pelo naranja revuelto y túnica verde remendada
  npc_tilo = {race="nino", style="corto", hair="Ho", hairD="o", top="Cg", topD="g", topL="Gh", pants="Cn", boots="b", belt="N", skin=D, skinD=Dd},
  -- Bruno, el vecino gruñón de Goreth: barba gris, gorra parda y chaleco de granjero
  npc_bruno = {race="humano", style="gorra", hat="N", hatD="n", hair="Hg", beard="Hg", top="Cy", topD="y", topL="Y", vest="Cn", pants="Hd", boots="b", belt="b", skin=N, skinD=Nd},
  -- Tobías, el molinero de la Colina: gorro blanco de harina y delantal enharinado
  npc_tobias = {race="humano", style="gorra", hat="Cw", hatD="T", hair="B", top="Cb", topD="a4", topL="a1", apron="Cw", pants="Cn", boots="b", belt="N"},
  -- puestos de la Pradera (un NPC por subzona)
  -- Brenna, la leñadora de Robleviejo: trenza castaña, camisa roja a cuadros y cinturón de cuero
  npc_brenna = {race="humano", style="largo", hair="B", hairD="b", top="Cr", topD="r", topL="R", pants="Cn", boots="b", belt="b", skin=D, skinD=Dd},
  -- Nilo, el pescador viejo del lago: sombrero de paja, barba blanca y chaqueta azul
  npc_nilo = {race="humano", style="sombrero", hat="T", hatD="t", hair="Hs", beard="Hs", top="Cb", topD="a4", topL="a1", pants="Cn", boots="b", belt="N", skin=N, skinD=Nd},
  -- Maese Orlan, el erudito de Aurelia que estudia la torre: calvo, barba gris y túnica morada
  npc_orlan = {race="humano", style="calvo", hair="Hg", beard="Hg", top="Cp", topD="v", topL="Vh", robe=true, trim="go", skin=P, skinD=Pd},
  -- Sela, la granjera refugiada de las Praderas del Este: moño oscuro, blusa amarilla y delantal
  npc_sela = {race="humano", style="mono", hair="Hd", hairD="K", top="Cy", topD="y", topL="Y", apron="T", pants="Cn", boots="b", skin=N, skinD=Nd},
  -- Vera, la cazadora de la atalaya: capucha verde, ropa de cuero y botas
  npc_vera = {race="humano", style="capucha", hair="Cg", hairD="g", top="Cg", topD="g", topL="Gh", pants="Cn", boots="b", belt="b", skin=D, skinD=Dd},
  -- Bastión de Hierro (Montañas Grises)
  -- Durgan, el jefe minero enano: casco con vela, barba pelirroja trenzada y chaleco de cuero sobre camisa gris
  npc_durgan = {race="enano", style="casco", hat="Y", hair="Ho", beard="Ho", top="A", topD="a", topL="Ah", vest="Cn", pants="b", boots="b", belt="N", skin=D, skinD=Dd},
  -- Hilda, la cocinera del Bastión: enana de moño rubio, mejillas rojas y delantal blanco sobre vestido verde
  npc_hilda = {race="enano", style="mono", hair="Y", hairD="y", top="Cg", topD="g", topL="Gh", apron="Cw", pants="Cn", boots="b", skin=P, skinD=Pd},
  -- Tilo, ahora escudero de los enanos: el mismo pelo naranja, con casco y peto de hierro que le quedan grandes
  npc_tilo_escudero = {race="nino", style="casco", hat="Cb", hair="Ho", hairD="o", top="S", topD="s", topL="W", tabard="Cb", pants="Cn", boots="b", belt="N", skin=D, skinD=Dd},
  -- puestos de las Montañas Grises (un NPC por subzona)
  -- Gorm, el carretero enano del Paso: gorra naranja, barba negra y camisa roja con chaleco de cuero
  npc_gorm = {race="enano", style="gorra", hat="Co", hatD="o", hair="Hd", beard="Hd", top="Cr", topD="r", topL="R", vest="N", pants="Cn", boots="b", belt="b", skin=N, skinD=Nd},
  -- la vieja Dora, minera de las Minas Abandonadas: casco con vela, pelo blanco y delantal de cuero
  npc_dora = {race="enano", style="casco", hat="Y", hair="Hs", hairD="Hg", top="Cb", topD="a4", topL="a1", apron="N", pants="b", boots="b", belt="N", skin=P, skinD=Pd},
  -- Sven, el trampero del Pinar: capucha de piel, barba rubia y abrigo de cuero
  npc_sven = {race="humano", style="capucha", hair="N", hairD="n", beard="Y", top="N", topD="n", topL="Nh", vest="T", pants="Cn", boots="b", belt="b", skin=P, skinD=Pd},
  -- Ingrid, la pescadora del Lago Helado: gorro de lana azul, trenzas rubias y chaleco azul
  npc_ingrid = {race="humano", style="gorra", hat="Cb", hatD="a4", hair="Y", hairD="y", top="Cw", topD="T", topL="W", vest="Cb", pants="Cn", boots="b", belt="N", skin=P, skinD=Pd},
  -- Halvar, el guardián de los pararrayos: enano canoso con casco, ropa oscura y tabardo amarillo de rayo
  npc_halvar = {race="enano", style="casco", hat="Mh", hair="Hg", beard="Hs", top="L", topD="l", topL="Lh", tabard="Cy", pants="b", boots="b", belt="N", skin=D, skinD=Dd},
  -- Lío, el bardo mediano de la Garganta: sombrero morado con pluma y chaleco amarillo
  npc_lio = {race="mediano", style="sombrero", hat="Cp", hatD="v", pluma="Cy", hair="B", top="Cg", topD="g", topL="Gh", vest="Cy", pants="Cn", boots="b", belt="b", skin=D, skinD=Dd},
  -- Ulfa, la guardiana de las Tumbas Enanas: capucha gris y túnica oscura con ribete plateado
  npc_ulfa = {race="enano", style="capucha", hair="A", hairD="a", top="L", topD="l", topL="Lh", robe=true, trim="Hs", skin=P, skinD=Pd},
  -- Kili, el minero que rescataste en las Minas: casco con vela y barba castaña
  npc_kili = {race="enano", style="casco", hat="Y", hair="B", beard="B", top="A", topD="a", topL="Ah", vest="N", pants="b", boots="b", belt="N", skin=P, skinD=Pd},
  -- Pell, el mozo de las carretas: gorra de cuero y camisa amarilla
  npc_pell = {race="nino", style="gorra", hat="N", hatD="n", hair="Hd", top="Cy", topD="y", topL="Y", pants="Cn", boots="b", belt="b", skin=N, skinD=Nd},
  -- Nori, el minero que se quedó en el campamento esperando a sus compañeros: gorro de lana gris y barba pelirroja
  npc_nori = {race="enano", style="gorra", hat="A", hatD="a", hair="Ho", beard="Ho", top="Cg", topD="g", topL="Gh", vest="N", pants="b", boots="b", belt="b", skin=D, skinD=Dd},
  -- Brin, la aprendiza de Ren: se queda con su puesto de guardabosque cuando Ren se va a las Montañas
  npc_brin = {race="humano", style="mono", hair="B", hairD="b", top="Cg", topD="g", topL="Gh", vest="N", pants="Cn", boots="b", belt="b", skin=D, skinD=Dd},
  -- Grun, Grat y Grot, los trillizos vagoneteros (un mismo sprite): gorra roja, barba rubia y delantal de cuero
  npc_vagonetero = {race="enano", style="gorra", hat="Cr", hatD="r", hair="Y", hairD="y", beard="Y", top="A", topD="a", topL="Ah", apron="N", pants="b", boots="b", belt="b", skin=P, skinD=Pd},
  -- guardia del Bastión: casco con penacho rojo, cota de malla y tabardo rojo
  npc_guardia_enano = {race="enano", style="casco", hat="R", hair="Hd", beard="Hd", top="S", topD="s", topL="W", tabard="Cr", pants="b", boots="b", belt="N", skin=D, skinD=Dd},
  -- Volcán Rojo: los dracónidos de Ascuaria y la gente de los puestos
  -- Ignar, el Forjador de Fuego: dracónido calvo de escamas rojas, delantal de cuero sobre camisa carmín y brazos de herrero
  npc_ignar = {race="draco", style="calvo", hair="Dcd", top="Dc", topD="Dcd", topL="R", apron="n", pants="Cn", boots="b", belt="b", skin="Dr", skinD="Drd"},
  -- Ascalia, la matriarca de Ascuaria: escamas carmín, cresta larga oscura, túnica roja con ribete dorado
  npc_ascalia = {race="draco", style="largo", hair="Dcd", hairD="Hd", top="Cr", topD="r", topL="R", robe=true, trim="go", neck="go", skin="Dc", skinD="Dcd", hornBig=true},
  -- Tuli, la parrillera: pañuelo naranja en la cabeza, delantal manchado y camisa amarilla
  npc_tuli = {race="draco", style="gorra", hat="Co", hatD="o", hair="Dcd", top="Cy", topD="y", topL="Y", apron="T", pants="Cn", boots="b", skin="Dr", skinD="Drd"},
  -- Chispa, la niña que quiere un dragón: pelo corto rojizo, cuernitos y túnica amarilla
  npc_chispa = {race="nino", style="corto", hair="Ho", hairD="o", top="Cy", topD="y", topL="Ab", pants="Cn", boots="b", belt="N", skin="Dr", skinD="Drd", horns=true},
  -- el Viejo Escamas: dracónido anciano de escamas grises, barba blanca y túnica parda
  npc_escamas = {race="draco", style="calvo", hair="Hs", beard="Hs", top="Cn", topD="b", topL="N", robe=true, trim="T", skin="Dg", skinD="Dgd", hornBig=true},
  -- Kessa, la talladora de obsidiana: gorro gris de cantera, delantal de cuero y ropa de trabajo
  npc_kessa = {race="draco", style="gorra", hat="Cs", hatD="Csd", hair="Hd", top="Cs", topD="Csd", topL="Ah", apron="N", pants="b", boots="b", belt="b", skin="Dr", skinD="Drd"},
  -- Ceniza, la guardabosque: capucha gris verdosa y ropa de cuero para el bosque quemado
  npc_ceniza = {race="draco", style="capucha", hair="Cs", hairD="Csd", top="Cg", topD="g", topL="Gh", pants="Cn", boots="b", belt="b", skin="Dc", skinD="Dcd"},
  -- Marga, la mercader de Ascuaria: sombrero violeta de ala ancha con pluma dorada, chaleco violeta,
  -- collar y cinturón de oro (cuenta monedas todo el día)
  npc_marga = {race="draco", style="sombrero", hat="V", hatD="v", pluma="Y", hair="Dcd", top="V", topD="v", topL="Vh", vest="N", neck="go", pants="Cn", boots="b", belt="go", skin="Dc", skinD="Dcd"},
  -- Pumo, el balsero: mediano con sombrero de paja, pañuelo rojo y chaleco remendado
  npc_pumo = {race="mediano", style="sombrero", hat="T", hatD="t", pluma="Cr", hair="B", top="Cr", topD="r", topL="R", vest="N", pants="Cn", boots="b", belt="b", skin=D, skinD=Dd},
  -- Sulfo, el alquimista: humano calvo con barba amarillenta de azufre y túnica verde manchada
  -- Lucio, el sobrino de Gaspar: atiende la diligencia cuando su tío se va con la historia. Joven, sin
  -- barba, gorra verde de cochero y camisa azul con chaleco pardo (Gaspar va todo de pardo)
  npc_lucio = {race="humano", style="gorra", hat="Cg", hatD="g", hair="Ho", hairD="o", top="Cb", topD="a4", topL="a1", vest="Cn", pants="Hd", boots="b", belt="b", skin=D, skinD=Dd},
  npc_sulfo = {race="humano", style="calvo", hair="Hg", beard="Ab", top="Cg", topD="g", topL="Y", robe=true, trim="Cy", skin=P, skinD=Pd},
  -- Costas Muertas: el Puerto Antiguo (humanos)
  -- Osvaldo Bastida, el capitán del puerto: casaca azul con botones dorados, gorra de marino y barba gris
  npc_bastida = {race="humano", style="gorra", hat="Cb", hatD="a4", hair="Hg", beard="Hg", top="Cb", topD="a4", topL="a1", neck="go", pants="Cn", boots="b", belt="go", skin=P, skinD=Pd},
  -- Tilo, ya soldado del puerto: yelmo, cota y tabardo azul del puerto
  npc_tilo_soldado = {race="humano", style="casco", hat="Cb", hair="Ho", hairD="o", top="S", topD="s", topL="W", tabard="Cb", pants="Cn", boots="b", belt="N", skin=D, skinD=Dd},
  -- Brea, la carpintera de ribera del astillero: ruda, con delantal de cuero
  npc_brea = {race="humano", style="mono", hair="Hd", hairD="K", top="Cn", topD="b", topL="N", apron="N", pants="Cn", boots="b", belt="b", skin=N, skinD=Nd},
  -- Doña Almeja, la cocinera del mercado de pescado
  npc_almeja = {race="humano", style="gorra", hat="Cw", hatD="T", hair="Hs", top="Cr", topD="r", topL="R", apron="Cw", pants="Cn", boots="b", skin=P, skinD=Pd},
  -- Salitre, el mercader viejo del puerto
  npc_salitre = {race="humano", style="sombrero", hat="T", hatD="t", pluma="Cb", hair="Hs", beard="Hs", top="Cg", topD="g", topL="Gh", vest="N", neck="go", pants="Cn", boots="b", belt="b", skin=N, skinD=Nd},
  -- Bartolo, el farero: impermeable amarillo y gorra de lana
  npc_bartolo = {race="humano", style="gorra", hat="Cb", hatD="a4", hair="Hs", beard="Hs", top="Cy", topD="y", topL="Y", pants="Cn", boots="b", skin=P, skinD=Pd},
  -- Cieno, el pescador del manglar: sombrero de paja
  npc_cieno = {race="humano", style="sombrero", hat="Y", hatD="y", hair="Hg", top="Cg", topD="g", topL="Gh", pants="Cn", boots="b", belt="b", skin=N, skinD=Nd},
  -- los piratas de la Cala: Rhaegar (tricornio negro con pluma roja) y Anka (pañuelo rojo)
  npc_rhaegar = {race="humano", style="sombrero", hat="Hd", hatD="K", pluma="Cr", hair="Hd", hairD="K", beard="Hd", top="Cr", topD="r", topL="R", vest="Hd", belt="go", pants="Cn", boots="b", skin=D, skinD=Dd},
  npc_anka = {race="humano", style="gorra", hat="Cr", hatD="r", hair="Ho", hairD="o", top="Cw", topD="T", topL="W", vest="Cr", pants="Cn", boots="b", belt="go", skin=N, skinD=Nd},
  -- Coralia (tritones): Nerea, la Anciana Cantora; Marul, el barquero; Nácar, la orfebre; Ondina, la niña
  npc_nerea = {race="triton", style="largo", hair="Hs", hairD="Hg", top="Cb", topD="a4", topL="a1", robe=true, trim="go", neck="go", skin="Tr", skinD="Trd"},
  npc_marul = {race="triton", style="corto", hair="Tfd", hairD="a4", top="Cw", topD="T", topL="W", vest="Cb", pants="Cn", boots="Tr", belt="N", skin="Tr", skinD="Trd"},
  npc_nacar = {race="triton", style="mono", hair="Cp", hairD="v", top="Cw", topD="T", topL="W", robe=true, trim="Cp", neck="go", skin="Tr", skinD="Trd"},
  npc_ondina = {race="triton", small=true, style="corto", hair="Cy", hairD="y", top="Cp", topD="v", topL="Vh", pants="Cn", boots="Tr", skin="Tr", skinD="Trd"},
}
-- solo=npc_a,npc_b genera solo esos (para no rehacer los que ya tienen retoques)
local solo = app.params.solo
if solo then
  local keep = {}
  for n in solo:gmatch("[^,]+") do keep[n] = true end
  for n in pairs(NPCS) do if not keep[n] then NPCS[n] = nil end end
end

local png = app.params.png

local function walkerFrames(st)
  local frames, tags = {}, {}
  for _, view in ipairs({"abajo", "arriba", "lado"}) do
    local from = #frames + 1
    for step=0,2 do frames[#frames + 1] = frame(st, view, step) end
    tags[#tags + 1] = {view, from, #frames}
  end
  return frames, tags
end

-- PNG en tira horizontal (lo que carga Phaser con frameWidth 32)
local function saveStrip(path, W, H, frames)
  local strip = Image(W * #frames, H, ColorMode.RGB)
  for i, G in ipairs(frames) do strip:drawImage(toImage(G, true), Point((i - 1) * W, 0)) end
  local spr = Sprite(W * #frames, H, ColorMode.RGB)
  spr:newCel(spr.layers[1], spr.frames[1], strip, Point(0, 0))
  spr:saveCopyAs(path)
  spr:close()
end

for name, st in pairs(NPCS) do
  -- (toImage le agrega el contorno al dibujo: cada salida se dibuja de cero)
  local frames, tags = walkerFrames(st)
  saveFrames(dir .. "/caminar/" .. name .. ".aseprite", 32, 32, frames, tags)
  saveFrames(dir .. "/retratos/" .. name:gsub("^npc_", "") .. ".aseprite", 64, 64, {portrait(st)})
  if png then
    saveStrip(png .. "/caminar/" .. name .. ".png", 32, 32, (walkerFrames(st)))
    saveStrip(png .. "/retratos/" .. name:gsub("^npc_", "") .. ".png", 64, 64, {portrait(st)})
  end
end
