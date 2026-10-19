-- Recursos de la Tundra Eterna (mismo estilo y paleta que crear_recursos6.lua), en una hoja aparte
-- para no regenerar las de antes:
--  * recursos7.aseprite y recursos7.png: 32x32, 12 frames = veta de hielo eterno, veta picada, flor de
--    escarcha, flor cortada, pino blanco, tocón, agujero de pesca, agujero vacío, menhir con runas,
--    menhir apagado, trineo abandonado y trineo registrado (el cofre de la tundra usa el cofre de siempre)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos7.lua
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
  {"k1","f4e8f0"},{"k2","d8b8e0"},{"k3","a888c0"},{"lb","8ab8f0"},
  -- montaña: nieve, hielo, acero, carbón y pino
  {"n1","f4f8fc"},{"n2","c8d4e4"},{"n3","8a9ab4"},{"i1","e6fbff"},{"i2","a8e4ff"},{"i3","5ca2ca"},
  {"m1","cfd8e6"},{"m2","8e9cb4"},{"cb","26242c"},{"pn1","2e5a44"},{"pn2","1e4030"},
  -- volcán: ceniza, basalto, obsidiana, azufre, lava y vapor
  {"as1","b8b2aa"},{"as2","8a847c"},{"as3","5a544e"},{"ba1","4a4448"},{"ba2","2e2a2e"},{"ob1","3a3448"},{"ob2","1e1a28"},{"obh","8a80b8"},
  {"su1","f4e868"},{"su2","c8b028"},{"su3","8a7a18"},{"lv1","ffe060"},{"lv2","ff8a20"},{"lv3","c83010"},{"st1","f4f4f4"},{"st2","c8ccd4"},
  {"pm1","d8ccb0"},{"pm2","a89c84"},{"eg1","f8b070"},{"eg2","d06a30"},{"eg3","8a3a18"},
  -- costa: arena, agua baja, coral, algas, ostras, madera de naufragio y nácar
  {"ar1","eedcaa"},{"ar2","d8c28c"},{"ar3","b49c6a"},{"bj1","62c6be"},{"bj2","48aaa6"},{"bjh","b2eedf"},{"es","f2fbf8"},
  {"co1","f2aaa2"},{"co2","d87c7a"},{"co3","f6ece0"},{"co4","a85060"},{"cr1","e05a4a"},{"cr2","a83a32"},
  {"al1","4e8a4a"},{"al2","2e6a36"},{"al3","1e4a2a"},{"os1","8a8c86"},{"os2","5e605c"},{"nc1","f4eef6"},{"nc2","d6cce2"},
  {"md1","a08260"},{"md2","7a6248"},{"md3","514030"},{"mdg","9a948a"},{"pe1","f8f4f0"},{"pe2","d8d0e0"},{"st1o","f08a3a"},{"st2o","c0602a"},
  -- tundra: nieve azulada, hielo eterno, pino blanco, agua helada, runas, madera clara y pescado
  {"tn1","f2f6fc"},{"tn2","d4e0ee"},{"tn3","a8b8cc"},{"ie1","e4f8ff"},{"ie2","a8dcf0"},{"ie3","6aaed0"},{"ie4","3a7aa8"},
  {"ab1","d4e4f0"},{"ab2","a8bed4"},{"ab3","7a92ac"},{"tr1","6a5040"},{"tr2","4a3a34"},
  {"ag1","2a4a6e"},{"ag2","1a2e48"},{"mn1","7e8496"},{"mn2","5e6476"},{"mn3","444a5a"},{"ru1","7af0f8"},{"ru2","3ab0c8"},
  {"pz1","c8d4e0"},{"pz2","8a9cb4"},{"tl1","d8c8a8"},{"tl2","a89474"},{"tl3","786448"},{"fg1","f0f8ff"},{"fg2","b8e0f8"},{"fg3","88b8e0"},
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

-- veta de hielo eterno: roca nevada con cristales azules que salen como dientes; picada, los muñones
local function iceVein(G, full)
  G.ellipse(16,27,13,3,"tn3")
  G.ellipse(16,22,11,6,"r2"); G.ellipse(14,20,8,4,"r1"); G.ellipse(14,17,7,2,"tn1"); G.px(21,23,"tn2")
  local function shard(x, y, h, w)
    for i = 0, h do
      local half = math.max(0, math.floor(w * (1 - i / h)))
      G.rect(x - half, y - i, x + half, y - i, (i % 4 == 0) and "ie3" or "ie2")
      G.px(x - half, y - i, "ie1")
    end
  end
  if full then
    shard(11, 20, 9, 2); shard(17, 19, 13, 3); shard(23, 21, 7, 2)
    G.px(17, 8, "W"); G.px(11, 12, "W")
  else
    for _, x in ipairs({11, 17, 23}) do G.rect(x - 1, 18, x + 1, 20, "ie3"); G.px(x, 18, "ie1") end
  end
end
-- flor de escarcha: mata de pétalos de hielo sobre la nieve; cortada, los tallos
local function frostFlower(G, full)
  G.ellipse(16,26,11,3.5,"tn2"); G.ellipse(16,26,8,2,"tn1")
  if full then
    for _, p in ipairs({{10,17},{17,13},{23,18},{15,21}}) do
      local x, y = p[1], p[2]
      G.rect(x, y + 3, x, 25, "c2"); G.px(x + 1, y + 6, "c1")
      G.ellipse(x, y, 3, 3, "fg2"); G.ellipse(x - 0.5, y - 0.5, 2, 2, "fg1")
      G.px(x - 3, y, "fg3"); G.px(x + 3, y, "fg3"); G.px(x, y - 3, "fg3"); G.px(x, y + 3, "fg3")
      G.px(x, y, "ie2")
    end
  else
    for _, x in ipairs({10, 13, 16, 22}) do G.rect(x, 22, x, 25, "c3") end
  end
end
-- pino blanco: un pino de corteza clara cargado de nieve; talado, el tocón con la nieve encima
local function whitePine(G, full)
  G.ellipse(16,28,10,2.5,"tn2")
  if full then
    G.rect(15,22,17,28,"tl2"); G.rect(15,22,15,28,"tl1")
    for k = 0, 3 do
      local y0 = 22 - k * 5
      local half = 11 - k * 2.5
      for yy = 0, 5 do
        local w = half * (yy / 5)
        G.rect(16 - w, y0 - 5 + yy, 16 + w, y0 - 5 + yy, (yy < 2) and "tn1" or ((yy % 2 == 0) and "ab1" or "ab2"))
        G.px(16 + w, y0 - 5 + yy, "ab3")
      end
    end
    G.px(16, 1, "W")
  else
    G.ellipse(16,25,5,2,"tl2"); G.rect(11,22,21,25,"tl2"); G.ellipse(16,22,5,2,"tl1"); G.ellipse(16,22,3,1,"tl3")
    G.ellipse(15,20,4,1.5,"tn1")
  end
end
-- agujero de pesca: un círculo de agua oscura en el hielo con una caña de palo; vacío, el agua quieta
local function fishingHole(G, full)
  G.ellipse(16,24,13,6,"ie2"); G.ellipse(16,24,11,5,"ie1"); G.px(6,23,"W"); G.px(25,26,"W")
  G.ellipse(16,24,6,3,"ag1"); G.ellipse(16,24.5,4,2,"ag2")
  if full then
    G.rect(22,10,22,22,"tl2"); G.px(21,9,"tl2"); G.px(20,8,"tl2"); for y = 9, 22 do G.px(19 - (y - 9) * 0.15, y, "pz2") end
    G.ellipse(14,23,3,1,"pz1"); G.px(12,23,"pz2"); G.px(17,22,"ie2")
  else
    G.px(14,24,"ie3"); G.px(18,25,"ie3")
  end
end
-- menhir con runas: piedra alta con runas que brillan; agotado, las runas apagadas
local function runeMenhir(G, full)
  G.ellipse(16,28,9,2.5,"tn2")
  G.rect(11,8,20,27,"mn1"); G.rect(18,8,20,27,"mn2"); G.ellipse(15.5,8,5,2,"mn1"); G.ellipse(15,7,4,1.5,"tn1")
  G.rect(11,25,20,27,"mn3")
  local c1, c2 = full and "ru1" or "mn3", full and "ru2" or "mn3"
  for _, y in ipairs({11, 16, 21}) do G.px(13, y, c1); G.px(14, y + 1, c1); G.px(15, y + 2, c2); G.px(15, y, c1); G.px(13, y + 2, c2) end
  if full then G.px(10, 12, "ru2"); G.px(22, 17, "ru2"); G.px(9, 20, "ru1") end
end
-- trineo abandonado: tablas de pino con cuero y un saco; registrado, el trineo vacío
local function sled(G, full)
  G.ellipse(16,27,13,3,"tn3")
  G.rect(5,24,27,24,"tl3"); G.rect(4,22,4,23,"tl3"); G.px(3,21,"tl3")
  G.rect(6,20,26,22,"tl2"); G.rect(6,20,26,20,"tl1"); for x = 9, 25, 4 do G.px(x,21,"tl3") end
  G.rect(24,15,25,20,"tl3"); G.px(25,14,"tl3")
  if full then
    G.ellipse(14,17,5,3,"tl2"); G.ellipse(13,16,4,2,"tl1"); G.rect(13,13,14,14,"tl3")
    G.ellipse(20,18,3,2,"mdg"); G.ellipse(9,18,2,1.5,"tn1")
  end
  G.ellipse(16,19,8,1,"tn1")
end

local KIND = {iceVein, frostFlower, whitePine, fishingHole, runeMenhir, sled}
local frames = {}
for _, f in ipairs(KIND) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); frames[#frames + 1] = G end
end
saveFrames(dir .. "/recursos7.aseprite", 32, 32, frames, {{"veta_hielo",1,2},{"flor_escarcha",3,4},{"pino_blanco",5,6},{"agujero_pesca",7,8},{"menhir_runas",9,10},{"restos_trineo",11,12}})
-- tira horizontal para el juego
local sheet = Image(32 * #frames, 32, ColorMode.RGB)
for i = 1, #frames do
  local f = newGrid(32, 32); KIND[(i + 1) // 2](f, i % 2 == 1)
  sheet:drawImage(toImage(f, true), Point((i - 1) * 32, 0))
end
local out = Sprite(32 * #frames, 32, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(dir .. "/recursos7.png")
out:close()
