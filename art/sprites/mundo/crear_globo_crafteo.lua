-- Globito de crafteo (24x24, 4 cuadros): aparece sobre la cabeza de un jugador mientras fabrica
-- algo en el taller. Un martillo que golpea un yunque y saca chispas.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_globo_crafteo.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","fffaf0"},{"w","e6dcc8"},
  {"S","e8eef8"},{"s","9aa6b6"},{"Y","f0cc5a"},{"y","a8802c"},{"B","8a5530"},
  {"F","fff2a8"},{"O","ff9a3a"},{"R","c0343a"},
  {"E","ffffff"},{"I","4a8ad8"},{"i","2a5a9a"},{"L","6a4a8a"},
  {"A","8a96a8"},{"a","4e5868"},{"H","c8d0dc"},{"M","a8703c"},
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
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end
  end
  return G
end

local function toImage(G)
  local W, H, g = G.w, G.h, G.g
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % W, k // W, C[c]) end
  return img
end

-- globo redondeado con colita abajo al centro; el contorno se dibuja a mano (no hay relleno
-- automático para que la colita quede limpia)
local function bubble(G)
  G.rect(3,1,20,15,"W")
  G.rect(2,2,21,14,"W")
  -- contorno
  G.rect(4,0,19,0,"K"); G.rect(4,16,19,16,"K"); G.rect(0,3,0,13,"K"); G.rect(23,3,23,13,"K")
  G.px(1,2,"K"); G.px(2,1,"K"); G.px(3,1,"K"); G.px(1,14,"K"); G.px(2,15,"K"); G.px(3,15,"K")
  G.px(22,2,"K"); G.px(21,1,"K"); G.px(20,1,"K"); G.px(22,14,"K"); G.px(21,15,"K"); G.px(20,15,"K")
  G.rect(1,3,1,13,"W"); G.rect(22,3,22,13,"W")
  -- sombra suave abajo
  G.rect(3,14,20,15,"w")
  -- colita
  G.rect(10,16,13,16,"W"); G.rect(11,17,12,17,"W"); G.px(9,16,"K"); G.px(14,16,"K"); G.px(10,17,"K"); G.px(13,17,"K"); G.px(11,18,"K"); G.px(12,18,"K")
end

-- espada de la empuñadura (hx,hy) a la punta (tx,ty): hoja de 2 px, guarda perpendicular dorada,
-- mango marrón y pomo
-- yunque chico abajo y el martillo en 4 posiciones (arriba, bajando, golpe con chispas, rebote)
local function anvil(G)
  G.rect(6, 9, 19, 9, "K"); G.px(20, 10, "K"); G.px(5, 10, "K"); G.px(5, 11, "K"); G.rect(6, 12, 9, 12, "K"); G.rect(15, 12, 19, 12, "K")
  G.rect(6, 10, 17, 11, "H"); G.rect(6, 11, 17, 11, "A"); G.px(18, 10, "H"); G.px(19, 10, "A"); G.px(18, 11, "A")
  G.rect(10, 12, 14, 12, "A"); G.px(9, 13, "K"); G.px(15, 13, "K")
  G.rect(8, 13, 16, 14, "a"); G.rect(7, 13, 7, 14, "K"); G.rect(17, 13, 17, 14, "K")
end
local HEAD = { {14, 4}, {12, 5}, {10, 7}, {12, 5} }
local frames = {}
for f = 1, 4 do
  local G = newGrid(24, 24)
  bubble(G)
  anvil(G)
  local h = HEAD[f]
  G.line(h[1] + 2, h[2] + 1, h[1] + 7, h[2] + 4, "M")
  G.rect(h[1] - 2, h[2] - 2, h[1] + 3, h[2] + 2, "K")
  G.rect(h[1] - 1, h[2] - 1, h[1] + 2, h[2] + 1, "A"); G.rect(h[1] - 1, h[2] - 1, h[1] + 2, h[2] - 1, "H")
  if f == 3 then
    G.px(8, 7, "F"); G.px(13, 7, "F"); G.px(7, 8, "O"); G.px(14, 8, "O"); G.px(10, 6, "F")
  end
  frames[f] = G
end

local dir = app.params.dir
local spr = Sprite(24, 24, ColorMode.RGB)
for i, G in ipairs(frames) do
  local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
  frame.duration = ({ 0.2, 0.1, 0.16, 0.12 })[i]
  spr:newCel(spr.layers[1], frame, toImage(G), Point(0, 0))
end
spr:saveAs(dir .. "/globos/globo_crafteo.aseprite")
spr:close()
