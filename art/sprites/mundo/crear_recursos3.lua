-- Recursos v4 del mundo (mismo estilo y paleta que crear_extras.lua), en una hoja aparte para no
-- regenerar las de antes:
--  * recursos3.aseprite: 32x32, 6 frames = lino, lino cosechado, cuarzo de río, cuarzo agotado,
--    trigo, trigo segado
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos3.lua
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


-- lino: matas finas y altas con florcitas celestes
local function flax(G, full)
  G.ellipse(16,28,11,2,"c3")
  if full then
    for i, x in ipairs({8, 11, 14, 17, 20, 23}) do
      local top = 8 + (i % 3) * 3
      for y = top, 27 do G.px(x + ((y + i) % 5 == 0 and 1 or 0), y, (i % 2 == 0) and "c1" or "c2") end
      G.px(x - 1, top, "lb"); G.px(x + 1, top, "lb"); G.px(x, top - 1, "lb"); G.px(x, top + 1, "lb"); G.px(x, top, "W")
    end
  else
    for _, x in ipairs({9, 13, 17, 21}) do G.rect(x, 24, x, 27, "c3"); G.px(x, 23, "t") end
  end
end
-- cuarzo de río: piedritas de la orilla con un racimo de cristales rosados
local function quartz(G, full)
  G.ellipse(16,27,13,3,"c3")
  G.ellipse(8,25,4,3,"r1"); G.ellipse(24,25,5,3,"r2"); G.ellipse(16,26,3,2,"r1"); G.px(7,24,"W")
  if full then
    local function shard(x, y, h, c, d)
      for i = 0, h do G.px(x, y - i, c); G.px(x + 1, y - i, d) end
      G.px(x, y - h - 1, "W"); G.px(x + 1, y - h - 1, c)
    end
    shard(13, 24, 9, "k1", "k2"); shard(16, 24, 13, "k1", "k3"); shard(19, 24, 8, "k2", "k3"); shard(11, 24, 5, "k2", "k3")
    G.px(14, 13, "W"); G.px(18, 12, "W")
  end
end
-- trigo: espigas doradas; segado, rastrojo cortito
local function wheat(G, full)
  G.ellipse(16,28,12,2,"c3")
  if full then
    for i, x in ipairs({6, 11, 16, 21, 26}) do
      local top = 10 + (i % 3) * 2
      G.rect(x, top + 5, x, 27, (i % 2 == 0) and "y" or "Y")
      for j = 0, 4 do G.px(x - 1, top + j, "Y"); G.px(x + 1, top + j, "y"); G.px(x, top + j, (j % 2 == 0) and "Y" or "y") end
      G.px(x, top - 1, "y"); G.px(x - 1, top - 2, "t")
    end
  else
    for _, x in ipairs({8, 11, 14, 17, 20, 23}) do G.rect(x, 25, x, 27, "y") end
  end
end
local res3 = {}
for _, f in ipairs({flax, quartz, wheat}) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); res3[#res3 + 1] = G end
end
saveFrames(dir .. "/recursos3.aseprite", 32, 32, res3, {{"lino",1,2},{"cuarzo",3,4},{"trigo",5,6}})
