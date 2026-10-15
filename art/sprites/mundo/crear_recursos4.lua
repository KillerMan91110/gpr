-- Recursos de las Montañas Grises (mismo estilo y paleta que crear_recursos3.lua), en una hoja aparte
-- para no regenerar las de antes:
--  * recursos4.aseprite y recursos4.png: 32x32, 8 frames = veta de acero, veta agotada, pino nevado,
--    tocón, flor de nieve, flor recogida, cristal del lago, cristal roto
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos4.lua
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



-- veta de acero: roca gris con nieve encima, vetas azuladas y carbón; agotada, solo la roca picada
local function vein(G, full)
  G.ellipse(16,27,13,3,"n2")
  G.ellipse(16,20,11,9,"r2"); G.ellipse(14,18,9,7,"r1"); G.ellipse(16,13,9,3,"n1"); G.ellipse(15,12,6,2,"W")
  if full then
    for _, p in ipairs({{10,20},{13,23},{19,18},{21,22},{16,16}}) do G.px(p[1],p[2],"W"); G.px(p[1]+1,p[2],"q1"); G.px(p[1],p[2]+1,"q2"); G.px(p[1]+1,p[2]+1,"m2") end
    G.px(12,18,"cb"); G.px(13,18,"cb"); G.px(20,24,"cb"); G.px(21,24,"cb"); G.px(17,21,"W")
  else
    G.ellipse(18,21,4,3,"r3"); G.px(17,20,"r2"); G.px(11,23,"r3")
  end
end
-- pino nevado: tronco con copa de nieve; talado, el tocón con la madera clara
local function pine(G, full)
  G.ellipse(16,28,11,2,"n2")
  if full then
    G.rect(15,22,17,27,"N"); G.px(16,25,"n")
    for k = 0, 3 do
      local y0 = 18 - k * 4
      local half = 9 - k * 2
      for yy = 0, 4 do
        local w = math.floor(half * (yy + 1) / 5)
        G.rect(16 - w, y0 + yy, 16 + w, y0 + yy, (yy < 1) and "n1" or ((yy % 2 == 0) and "pn1" or "pn2"))
      end
    end
    G.px(16,2,"W")
  else
    G.ellipse(16,25,5,2,"N"); G.rect(11,25,21,27,"N"); G.ellipse(16,25,4,1.5,"Nh"); G.px(16,25,"n"); G.ellipse(16,23,3,1,"n1")
  end
end
-- flor de nieve: matitas blancas con centro dorado sobre la nieve; recogida, solo las hojas
local function snowflower(G, full)
  G.ellipse(16,28,11,2,"n2")
  for _, x in ipairs({10, 16, 22}) do G.rect(x, 22, x, 27, "c2"); G.px(x - 1, 25, "c1"); G.px(x + 1, 24, "c1") end
  if full then
    for i, x in ipairs({10, 16, 22}) do
      local y = 19 - (i % 2) * 3
      G.px(x, y - 1, "n1"); G.px(x, y + 1, "n1"); G.px(x - 1, y, "n1"); G.px(x + 1, y, "n1")
      G.px(x - 1, y - 1, "n2"); G.px(x + 1, y + 1, "n2"); G.px(x, y, "Y")
    end
  end
end
-- cristal del lago: racimo de hielo azul en la orilla; roto, los trocitos
local function icecrystal(G, full)
  G.ellipse(16,27,13,3,"n2"); G.ellipse(8,25,4,2,"i2"); G.ellipse(24,26,4,2,"n3")
  local function shard(x, y, h, c, d)
    for i = 0, h do G.px(x, y - i, c); G.px(x + 1, y - i, d) end
    G.px(x, y - h - 1, "W"); G.px(x + 1, y - h - 1, c)
  end
  if full then
    shard(12, 25, 8, "i1", "i2"); shard(15, 25, 14, "i1", "i3"); shard(18, 25, 10, "i2", "i3"); shard(21, 25, 6, "i1", "i2")
    G.px(16,12,"W")
  else
    shard(14, 25, 2, "i2", "i3"); shard(18, 25, 3, "i1", "i3"); G.px(10,25,"i1"); G.px(22,25,"i2")
  end
end
local frames = {}
for _, f in ipairs({vein, pine, snowflower, icecrystal}) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); frames[#frames + 1] = G end
end
saveFrames(dir .. "/recursos4.aseprite", 32, 32, frames, {{"veta",1,2},{"pino",3,4},{"flor_nieve",5,6},{"cristal_lago",7,8}})
-- tira horizontal para el juego
local sheet = Image(32 * #frames, 32, ColorMode.RGB)
for i, G in ipairs(frames) do
  local f = newGrid(32, 32); if i % 2 == 1 then ({vein, pine, snowflower, icecrystal})[(i + 1) // 2](f, true) else ({vein, pine, snowflower, icecrystal})[i // 2](f, false) end
  sheet:drawImage(toImage(f, true), Point((i - 1) * 32, 0))
end
local out = Sprite(32 * #frames, 32, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(dir .. "/recursos4.png")
out:close()
