-- Globito de combate (24x24, 4 cuadros): aparece sobre la cabeza de un jugador mientras pelea.
-- Dos espadas se acercan, chocan con una chispa y rebotan.
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_globo_combate.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","fffaf0"},{"w","e6dcc8"},
  {"S","e8eef8"},{"s","9aa6b6"},{"Y","f0cc5a"},{"y","a8802c"},{"B","8a5530"},
  {"F","fff2a8"},{"O","ff9a3a"},{"R","c0343a"},
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
local function sword(G, hx, hy, tx, ty)
  local dx, dy = tx - hx, ty - hy
  local len = math.max(math.abs(dx), math.abs(dy))
  local ux, uy = dx / len, dy / len
  -- hoja (desde la guarda hasta la punta), con filo claro y lomo gris
  for i = 3, len do
    local x, y = hx + ux * i, hy + uy * i
    G.px(x, y, "S"); G.px(x + 1, y, "s")
  end
  G.px(tx, ty, "W")
  -- guarda perpendicular
  local gx, gy = hx + ux * 3, hy + uy * 3
  for k = -2, 2 do G.px(gx + uy * k * -1 + 0, gy + ux * k, "y") end
  for k = -1, 1 do G.px(gx + uy * k * -1, gy + ux * k, "Y") end
  -- mango y pomo
  G.px(hx + ux, hy + uy, "B"); G.px(hx + ux * 2, hy + uy * 2, "B")
  G.px(hx, hy, "Y")
end

-- vaivén de las puntas en cada cuadro (negativo = se cruzan más: el choque)
local SWING = { 2, 0, -1, 1 }
local frames = {}
for f = 1, 4 do
  local G = newGrid(24, 24)
  bubble(G)
  local d = SWING[f]
  -- una espada sube de abajo-izquierda a arriba-derecha y la otra al revés (⚔)
  sword(G, 5, 13, 16 + d, 3)
  sword(G, 18, 13, 7 - d, 3)
  if f == 3 then
    -- chispa del choque
    G.px(11, 1, "F"); G.px(12, 1, "F"); G.px(11, 2, "O"); G.px(12, 2, "O")
    G.px(9, 2, "F"); G.px(14, 2, "F"); G.px(10, 1, "O"); G.px(13, 1, "O")
  end
  frames[f] = G
end

local dir = app.params.dir
local spr = Sprite(24, 24, ColorMode.RGB)
for i, G in ipairs(frames) do
  local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
  frame.duration = ({ 0.16, 0.12, 0.22, 0.14 })[i]
  spr:newCel(spr.layers[1], frame, toImage(G), Point(0, 0))
end
spr:saveAs(dir .. "/globos/globo_combate.aseprite")
spr:close()
