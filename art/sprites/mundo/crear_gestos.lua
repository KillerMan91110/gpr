-- Íconos de gestos del mundo (16x16, 5 frames): saludar, bailar, reir, sentarse, aplaudir.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_gestos.lua
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


local frames = {}
local function add(fn) local G = newGrid(16, 16); fn(G); frames[#frames + 1] = G end

-- saludar: mano abierta con líneas de movimiento
add(function(G)
  G.rect(5,6,10,12,"F"); G.rect(6,13,9,14,"F")
  for i,x in ipairs({5,7,9}) do G.rect(x,2,x,6,"F") end; G.rect(11,4,11,7,"F"); G.rect(12,5,12,6,"F")
  G.rect(4,8,4,10,"F"); G.rect(10,7,10,12,"f"); G.rect(6,13,9,13,"f")
  G.px(13,2,"W"); G.px(14,3,"W"); G.px(1,3,"W"); G.px(2,2,"W"); G.px(14,9,"S"); G.px(1,10,"S")
end)
-- bailar: dos corcheas doradas
add(function(G)
  G.ellipse(4,12,2.2,1.7,"Y"); G.rect(6,3,6,12,"Y"); G.rect(6,3,9,4,"Y"); G.rect(9,4,9,5,"y")
  G.ellipse(11,10,2.2,1.7,"Y"); G.rect(13,2,13,10,"Y"); G.rect(13,2,15,3,"Y")
  G.px(3,11,"W"); G.px(10,9,"W"); G.px(1,4,"W"); G.px(2,3,"S")
end)
-- reir: carita con ojos cerrados y boca abierta, con lagrimitas
add(function(G)
  G.ellipse(8,8,6.5,6.5,"Y"); G.ellipse(8,9,5,5,"Y"); G.ellipse(6,5,2,1.2,"fl")
  G.px(5,6,"b"); G.px(4,7,"b"); G.px(6,7,"b"); G.px(10,6,"b"); G.px(9,7,"b"); G.px(11,7,"b")
  G.ellipse(8,11,3,1.8,"r"); G.rect(6,10,10,10,"W"); G.px(8,12,"R")
  G.px(2,8,"q1"); G.px(2,9,"q1"); G.px(14,8,"q1"); G.px(14,9,"q1")
end)
-- sentarse: banquito de madera
add(function(G)
  G.rect(3,6,12,8,"Nh"); G.rect(3,8,12,8,"N"); G.rect(4,9,5,14,"n"); G.rect(10,9,11,14,"n"); G.rect(5,11,10,11,"N")
  G.px(5,6,"T"); G.px(8,6,"T")
end)
-- aplaudir: dos manos juntas con chispas
add(function(G)
  G.rect(4,6,7,12,"F"); G.rect(8,5,11,12,"f"); G.rect(5,3,6,6,"F"); G.rect(9,2,10,5,"f"); G.rect(6,13,9,14,"F")
  G.px(2,3,"Y"); G.px(1,2,"Y"); G.px(13,2,"Y"); G.px(14,1,"Y"); G.px(13,6,"W"); G.px(2,7,"W"); G.px(14,7,"Y")
end)

saveFrames(dir .. "/gestos.aseprite", 16, 16, frames, {{"saludar",1,1},{"bailar",2,2},{"reir",3,3},{"sentarse",4,4},{"aplaudir",5,5}})
