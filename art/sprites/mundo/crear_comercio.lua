-- Ícono de comercio entre jugadores (32x32): balanza dorada con una moneda en un platillo y una
-- gema en el otro. Reusa la paleta y el dibujo de crear_vinculo.lua.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_comercio.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- piedra de la estatua (crema como el Pilar) y gris del pedestal
  {"T","efe6cc"},{"t","cdbf9c"},{"u","a8977a"},{"v","7a6c58"},
  {"P","b8bcc8"},{"p","8a90a0"},{"q","5f6578"},{"Q","434858"},
  -- brillo del vínculo (agua de Aethra)
  {"g1","e8fcff"},{"g2","9ae8ff"},{"g3","4ab4e8"},{"g4","2a6aa8"},
  -- piedra de regreso
  {"r1","c8d4e0"},{"r2","96a4b8"},{"r3","6a7890"},{"r4","465068"},
  -- emblemas
  {"Y","f0cc5a"},{"y","b08a30"},{"Yh","fff2a8"},
  {"R","c8383e"},{"r","80222c"},
  {"S","dfe6ee"},{"s","9aa6b6"},{"sd","5e6a7c"},
  {"A","7a5ad8"},{"a","46308a"},{"Ah","b8a0ff"},
  {"G","5aa848"},{"gg","2f6a2a"},{"Gh","a8e070"},
  {"B","9a6438"},{"b","5a3a20"},
  {"N","3a3450"},{"n","241f34"},{"Nh","6a6088"},
  {"L","fff6dc"},{"l","e8d8a8"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

local function newGrid(W, H)
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x>=0 and x<W and y>=0 and y<H then g[y*W+x] = c end
  end
  function G.get(x, y) return g[y*W+x] end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end
  end
  function G.thick(x0,y0,x1,y1,w,c)
    local vertical = math.abs(y1-y0) >= math.abs(x1-x0)
    for t=0,w-1 do
      local o = t - (w-1)//2
      if vertical then G.line(x0+o,y0,x1+o,y1,c) else G.line(x0,y0+o,x1,y1+o,c) end
    end
  end
  function G.ellipse(cx,cy,rx,ry,c)
    for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do
      local dx, dy = (x-cx)/rx, (y-cy)/ry
      if dx*dx + dy*dy <= 1 then G.px(x,y,c) end
    end end
  end
  return G
end

-- contorno oscuro alrededor de lo dibujado (el brillo suelto no lleva contorno)
local NO_OUTLINE = {K=true, g1=true}
local function toImage(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y=0,H-1 do for x=0,W-1 do
    if not g[y*W+x] then
      for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
        local nx, ny = x+o[1], y+o[2]
        local n = (nx>=0 and nx<W and ny>=0 and ny<H) and g[ny*W+nx]
        if n and not NO_OUTLINE[n] then out[y*W+x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % W, k // W, C[c]) end
  return img
end

local dir = app.params.dir

local function saveSheet(path, W, H, frames, durs)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = (durs and durs[i] or 150) / 1000
    spr:newCel(spr.layers[1], frame, toImage(G), Point(0,0))
  end
  spr:saveAs(path)
  spr:close()
end

-- =====================================================================================
-- Balanza: poste y base de madera, brazo dorado, platillos colgando de cadenitas
-- =====================================================================================
do
  local G = newGrid(32, 32)
  -- base y poste
  G.rect(10,27,21,29,"b"); G.rect(10,27,21,27,"B"); G.rect(14,9,17,26,"B"); G.rect(16,9,17,26,"b")
  G.ellipse(15.5,8,2.5,2.5,"Y"); G.px(15,7,"Yh")
  -- brazo
  G.rect(4,10,27,11,"Y"); G.rect(4,11,27,11,"y")
  -- cadenas
  for y=12,17 do G.px(5,y,"s"); G.px(9,y,"s"); G.px(22,y,"s"); G.px(26,y,"s") end
  -- platillos
  G.rect(3,18,11,19,"Y"); G.rect(4,20,10,20,"y")
  G.rect(20,18,28,19,"Y"); G.rect(21,20,27,20,"y")
  -- moneda (izquierda) y gema (derecha)
  G.ellipse(7,15.5,2.4,2.4,"Y"); G.px(6,14,"Yh"); G.px(7,15,"y")
  G.rect(23,14,25,16,"A"); G.px(24,13,"Ah"); G.px(23,14,"Ah"); G.px(25,17,"a"); G.px(24,17,"a")
  saveSheet(dir .. "/vinculo/comercio.aseprite", 32, 32, {G})
end
