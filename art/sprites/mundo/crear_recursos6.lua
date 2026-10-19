-- Recursos de las Costas Muertas (mismo estilo y paleta que crear_recursos5.lua), en una hoja aparte
-- para no regenerar las de antes:
--  * recursos6.aseprite y recursos6.png: 32x32, 12 frames = veta de coral, veta picada, algas salinas,
--    algas cortadas, ostras, ostras abiertas, restos de naufragio, restos registrados, poza de marea,
--    poza vacía, concha gigante y concha abierta (el cofre de la costa usa el cofre de siempre)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos6.lua
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

-- veta de coral: roca con ramas de coral rojo duro; picada, los muñones
local function coralVein(G, full)
  G.ellipse(16,27,13,3,"ar3")
  G.ellipse(16,22,11,6,"r2"); G.ellipse(14,20,8,4,"r1"); G.px(10,23,"co3"); G.px(21,24,"co3")
  local function branch(x, y, h, c1, c2)
    for i = 0, h do G.px(x, y - i, c1); G.px(x + 1, y - i, c2) end
    G.px(x - 1, y - h + 2, c1); G.px(x - 2, y - h + 1, c1); G.px(x + 2, y - h + 3, c1); G.px(x + 3, y - h + 2, c1)
    G.px(x, y - h - 1, "co3")
  end
  if full then
    branch(11, 19, 9, "cr1", "cr2"); branch(17, 18, 12, "cr1", "cr2"); branch(22, 20, 7, "co1", "co2")
  else
    for _, x in ipairs({11, 17, 22}) do G.rect(x, 17, x + 1, 19, "cr2"); G.px(x, 16, "co3") end
  end
end
-- algas salinas: mata de algas sobre la arena mojada; recogidas, los tallos cortados
local function seaweed(G, full)
  G.ellipse(16,26,12,4,"ar3"); G.ellipse(16,26,9,2.5,"bj2"); G.px(12,26,"bjh")
  if full then
    for k, s in ipairs({{9,10},{12,14},{16,16},{20,13},{23,10}}) do
      local x, h = s[1], s[2]
      for i = 0, h do G.px(x + math.sin(i * 0.6 + k) * 1.5, 25 - i, (i % 3 == 0) and "al1" or "al2") end
      G.px(x + math.sin(h * 0.6 + k) * 1.5, 25 - h, "al1")
    end
    G.ellipse(14,20,1.5,1,"al3"); G.ellipse(19,18,1.5,1,"al3")
  else
    for _, x in ipairs({10, 13, 16, 20, 23}) do G.rect(x, 23, x, 25, "al3") end
  end
end
-- ostras: un racimo de ostras grises pegadas a una roca; recogidas, las cáscaras abiertas
local function oysters(G, full)
  G.ellipse(16,27,12,3,"ar3"); G.ellipse(16,24,9,4,"r2"); G.ellipse(15,22,6,3,"r1")
  local pos = {{10,22},{16,19},{22,22},{13,25},{20,25}}
  for _, p in ipairs(pos) do
    if full then
      G.ellipse(p[1], p[2], 3, 2, "os1"); G.ellipse(p[1], p[2] - 0.5, 2, 1, "os2"); G.px(p[1] - 1, p[2] - 1, "nc1")
    else
      G.ellipse(p[1], p[2], 2.5, 1.5, "nc2"); G.px(p[1], p[2], "nc1"); G.px(p[1] + 2, p[2] - 1, "os2")
    end
  end
end
-- restos de naufragio: tablones, un barril roto y un cabo enrollado; registrados, solo astillas
local function wreckage(G, full)
  G.ellipse(16,27,13,3,"ar3")
  if full then
    G.rect(4,22,26,24,"md2"); G.rect(4,22,26,22,"md1"); G.rect(8,18,24,20,"md1"); G.rect(8,20,24,20,"md3")
    for _, x in ipairs({10,16,22}) do G.px(x,19,"md3"); G.px(x+1,23,"md3") end
    G.ellipse(22,15,4,4,"md2"); G.rect(19,13,25,13,"mdg"); G.rect(19,17,25,17,"mdg")
    G.ellipse(9,15,3,2,"md3"); G.ellipse(9,15,2,1,"md1"); G.px(12,16,"md3")
  else
    for _, p in ipairs({{8,25},{14,24},{20,26},{24,24}}) do G.rect(p[1], p[2], p[1] + 3, p[2], "md2"); G.px(p[1], p[2] - 1, "md1") end
  end
end
-- poza de marea: charco entre rocas con una estrella de mar y sal en el borde; vacía, el charco solo
local function tidepool(G, full)
  G.ellipse(16,24,13,6,"r2"); G.ellipse(16,24,10,4,"bj2"); G.ellipse(15,23,8,3,"bj1"); G.px(12,22,"bjh"); G.px(18,22,"bjh")
  for _, p in ipairs({{5,23},{27,24},{9,28},{23,28}}) do G.px(p[1],p[2],"pe1"); G.px(p[1]+1,p[2],"pe2") end
  if full then
    for a = 0, 4 do
      local ang = a * 2 * math.pi / 5 - math.pi / 2
      for r = 0, 4 do G.px(17 + math.cos(ang) * r, 23 + math.sin(ang) * r * 0.7, r < 3 and "st1o" or "st2o") end
    end
    G.ellipse(11,25,1.5,1,"os1")
  end
end
-- concha gigante: almeja enorme medio enterrada; llena, entreabierta con la perla; vacía, abierta
local function giantClam(G, full)
  G.ellipse(16,27,13,3,"ar3")
  if full then
    G.ellipse(16,22,12,6,"nc2"); G.ellipse(16,24,11,3,"co3")
    G.ellipse(16,18,12,6,"nc1"); for x = 6, 26, 4 do G.rect(x, 14, x, 22, "nc2") end
    G.rect(6,22,26,22,"co4"); G.ellipse(16,22,2,1.5,"pe1"); G.px(15,21,"W")
  else
    G.ellipse(16,24,12,4,"nc2"); G.ellipse(16,23,10,3,"co3"); G.ellipse(16,13,12,5,"nc1"); for x = 6, 26, 4 do G.rect(x, 10, x, 16, "nc2") end
    G.rect(8,17,24,18,"co2")
  end
end

local KIND = {coralVein, seaweed, oysters, wreckage, tidepool, giantClam}
local frames = {}
for _, f in ipairs(KIND) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); frames[#frames + 1] = G end
end
saveFrames(dir .. "/recursos6.aseprite", 32, 32, frames, {{"veta_coral",1,2},{"alga_salina",3,4},{"ostras",5,6},{"restos_naufragio",7,8},{"poza_marea",9,10},{"concha_gigante",11,12}})
-- tira horizontal para el juego
local sheet = Image(32 * #frames, 32, ColorMode.RGB)
for i = 1, #frames do
  local f = newGrid(32, 32); KIND[(i + 1) // 2](f, i % 2 == 1)
  sheet:drawImage(toImage(f, true), Point((i - 1) * 32, 0))
end
local out = Sprite(32 * #frames, 32, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(dir .. "/recursos6.png")
out:close()
