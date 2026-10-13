-- Piedra de regreso y órdenes: la Estatua del Viajero (48x96, 4 cuadros de brillo), el ícono
-- de la piedra de regreso (32x32) y los emblemas de las cinco órdenes de Aurelia (32x32).
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_vinculo.lua
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
-- Estatua del Viajero (48x96): un peregrino encapuchado sobre un pedestal que alza la piedra
-- de Aethra. La runa del pedestal y la piedra laten (4 cuadros).
-- =====================================================================================
local function estatua(f)
  local G = newGrid(48, 96)
  local glow = ({ {"g2","g3"}, {"g1","g2"}, {"g1","g1"}, {"g1","g2"} })[f]
  -- escalón y pedestal
  G.rect(4,86,43,93,"q"); G.rect(4,86,43,87,"p"); G.rect(5,92,42,93,"Q")
  G.rect(9,62,38,85,"P"); G.rect(9,62,10,85,"p"); G.rect(37,62,38,85,"q")
  G.rect(7,58,40,62,"p"); G.rect(7,58,40,59,"P"); G.rect(8,62,39,62,"q")
  G.rect(7,83,40,85,"p")
  -- runa del pedestal: gota de Aethra
  G.ellipse(24,75,4,4,glow[2]); G.line(24,67,24,71,glow[2]); G.px(23,70,glow[2]); G.px(25,70,glow[2])
  G.ellipse(24,75,2,2,glow[1]); G.px(24,69,glow[1])
  -- túnica (cae en pliegues)
  G.rect(15,36,32,57,"t")
  for x=15,32 do
    local s = (x-15) % 4
    if s == 0 then G.line(x,40,x,57,"u") end
  end
  G.rect(13,52,34,57,"t"); G.line(13,57,34,57,"u")
  G.rect(16,36,20,57,"T")
  -- brazos alzados hacia la piedra
  G.thick(17,40,14,24,3,"t"); G.thick(30,40,33,24,3,"u")
  G.line(16,40,13,25,"T")
  -- capucha y cara en sombra
  G.ellipse(24,31,6,7,"t"); G.ellipse(23,30,5,6,"T"); G.px(24,24,"T")
  -- la cara queda en la sombra de la capucha
  G.ellipse(24,33,3.4,3.6,"u"); G.ellipse(24,34,2.4,2.6,"v")
  -- manos y la piedra en lo alto
  G.rect(12,21,15,24,"T"); G.rect(32,21,35,24,"t")
  G.ellipse(24,16,7,6,"g4"); G.ellipse(24,15,6,5,"g3"); G.ellipse(23,14,4,3,glow[2]); G.px(21,12,glow[1]); G.px(22,12,glow[1])
  -- chispas alrededor de la piedra
  local sparks = ({ {{14,8},{34,10}}, {{12,6},{36,7},{24,4}}, {{15,4},{33,5},{24,2},{10,12}}, {{13,7},{35,9}} })[f]
  for _,s in ipairs(sparks) do G.px(s[1], s[2], "g1") end
  return G
end
local frames = {}
for f=1,4 do frames[f] = estatua(f) end
saveSheet(dir .. "/vinculo/estatua_vinculo.aseprite", 48, 96, frames, {220,180,260,180})

-- =====================================================================================
-- Piedra de regreso (32x32): canto rodado gris azulado con la gota de Aethra grabada.
-- =====================================================================================
do
  local G = newGrid(32, 32)
  G.ellipse(15.5,18.5,12.4,9.4,"r4"); G.ellipse(15,17.5,11.4,8.4,"r3"); G.ellipse(14,16.5,9.4,6.4,"r2")
  G.ellipse(11,13.5,4.4,1.6,"r1"); G.px(8,13,"W")
  -- runa brillante: la gota de Aethra
  G.ellipse(16,21,3.6,3.6,"g4"); G.ellipse(16,20.5,2.8,2.8,"g3")
  G.line(16,12,16,17,"g3"); G.line(15,15,15,18,"g3"); G.line(17,15,17,18,"g3")
  G.ellipse(16,20.5,1.4,1.4,"g1"); G.line(16,13,16,16,"g2")
  -- destellos
  G.px(27,7,"g1"); G.px(26,6,"g2"); G.px(28,6,"g2"); G.px(27,5,"g2"); G.px(27,8,"g2")
  G.px(5,27,"g2")
  saveSheet(dir .. "/vinculo/piedra_regreso.aseprite", 32, 32, {G})
end

-- =====================================================================================
-- Emblemas de las órdenes (32x32): escudo con su color y su símbolo.
-- =====================================================================================
local function escudo(G, c1, c2, borde)
  -- escudo heráldico con borde dorado (o plata)
  for y=3,28 do
    local half
    if y < 18 then half = 12 else half = math.floor(12 * math.sqrt(math.max(0, 1 - ((y-18)/11)^2))) end
    if half > 0 then G.rect(16-half, y, 15+half, y, borde) end
    if half > 1 and y > 3 and y < 27 then G.rect(17-half, y, 14+half, y, c1) end
  end
  for y=5,25 do
    local half
    if y < 18 then half = 10 else half = math.floor(10 * math.sqrt(math.max(0, 1 - ((y-18)/8)^2))) end
    if half > 0 then G.rect(16, y, 15+half, y, c2) end
  end
end

local EMBLEMAS = {
  guerrero = function()
    local G = newGrid(32, 32)
    escudo(G, "R", "r", "Y")
    -- espadas cruzadas
    G.thick(9,9,22,22,2,"S"); G.thick(22,9,9,22,2,"s")
    G.line(9,9,21,21,"W")
    G.rect(7,21,11,22,"y"); G.rect(20,21,24,22,"y")
    G.rect(8,23,9,25,"B"); G.rect(22,23,23,25,"B")
    return G
  end,
  mago = function()
    local G = newGrid(32, 32)
    escudo(G, "A", "a", "S")
    -- estrella de ocho puntas
    G.line(16,6,16,24,"Ah"); G.line(7,15,25,15,"Ah")
    G.line(11,10,21,20,"Ah"); G.line(21,10,11,20,"Ah")
    G.ellipse(16,15,3,3,"W"); G.ellipse(16,15,1,1,"Yh")
    G.px(10,22,"Ah"); G.px(22,8,"W")
    return G
  end,
  arquero = function()
    local G = newGrid(32, 32)
    escudo(G, "G", "gg", "Y")
    -- arco tenso y flecha
    for y=7,24 do
      local t = (y-15.5)/8.5
      G.px(11 + math.floor(4*(t*t)), y, "B")
      G.px(12 + math.floor(4*(t*t)), y, "b")
    end
    G.line(15,7,15,24,"S")
    G.thick(10,15,24,15,1,"l"); G.rect(22,14,24,16,"S"); G.px(25,15,"S")
    G.px(9,14,"Gh"); G.px(9,16,"Gh"); G.px(10,15,"W")
    return G
  end,
  picaro = function()
    local G = newGrid(32, 32)
    escudo(G, "N", "n", "s")
    -- luna menguante y daga
    G.ellipse(12,12,5,5,"Nh"); G.ellipse(14,11,4,4,"n")
    G.thick(19,7,19,20,2,"S"); G.line(18,7,18,20,"W")
    G.px(19,6,"S"); G.rect(15,20,23,21,"sd"); G.rect(18,22,19,25,"b")
    G.px(18,26,"s"); G.px(19,26,"s")
    return G
  end,
  sacerdote = function()
    local G = newGrid(32, 32)
    escudo(G, "L", "l", "Y")
    -- sol de Aethra
    for i=0,7 do
      local a = i * math.pi / 4
      G.thick(16 + math.cos(a)*6, 15 + math.sin(a)*6, 16 + math.cos(a)*10, 15 + math.sin(a)*10, 1, "y")
    end
    G.ellipse(16,15,5,5,"y"); G.ellipse(16,15,4,4,"Y"); G.ellipse(16,15,2,2,"Yh"); G.px(15,14,"W")
    return G
  end,
}
for _, nombre in ipairs({"guerrero","mago","arquero","picaro","sacerdote"}) do
  saveSheet(dir .. "/vinculo/orden_" .. nombre .. ".aseprite", 32, 32, {EMBLEMAS[nombre]()})
end
