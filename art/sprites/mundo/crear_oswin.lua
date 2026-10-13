-- Retrato de Oswin, el del Registro de Gremios de Aurelia (64x64). Reusa la paleta y el busto
-- de crear_ciudad.lua sin regenerar el resto de la ciudad.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_oswin.lua
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

-- Oswin: escribano rubio con casaca azul y chaleco dorado (como su sprite cit_10), anteojos
-- redondos y una pluma detrás de la oreja
local oswin = {race="humano", style="corto", hair="Y", hairD="y", top="Cb", topD="m", topL="Mh", vest="go", belt="go"}
local G = portrait(oswin)
-- anteojos (aros dorados alrededor de los ojos y el puente)
for _, cx in ipairs({26, 38}) do
  for x=cx-4,cx+4 do G.px(x, 28, "god"); G.px(x, 37, "god") end
  for y=28,37 do G.px(cx-4, y, "god"); G.px(cx+4, y, "god") end
end
G.rect(31, 31, 33, 31, "god")
-- pluma detrás de la oreja
for i=0,14 do G.px(46 + i//2, 24 - i, "fw"); G.px(47 + i//2, 24 - i, "s") end
-- cuello blanco de escribano
G.rect(27, 48, 37, 50, "W")
saveFrames(dir .. "/retratos/oswin.aseprite", 64, 64, {G})
