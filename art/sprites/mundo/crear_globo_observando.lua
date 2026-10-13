-- Globito de espectador (24x24, 4 cuadros): aparece sobre la cabeza de un jugador mientras mira
-- el combate de otro. Un ojo abierto que parpadea (abierto, entrecerrado, cerrado, entrecerrado).
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_globo_observando.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","fffaf0"},{"w","e6dcc8"},
  {"S","e8eef8"},{"s","9aa6b6"},{"Y","f0cc5a"},{"y","a8802c"},{"B","8a5530"},
  {"F","fff2a8"},{"O","ff9a3a"},{"R","c0343a"},
  {"E","ffffff"},{"I","4a8ad8"},{"i","2a5a9a"},{"L","6a4a8a"},
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
-- ojo en forma de almendra centrado en el globo; abre = 1 (abierto) .. 0 (cerrado)
local CX, CY, RX, RY = 11.5, 8.5, 7, 4.5
local function eye(G, abre)
  if abre <= 0 then
    -- cerrado: párpado curvo hacia abajo con tres pestañas
    for x = 5, 18 do
      local t = (x - CX) / RX
      local y = math.floor(CY) + math.floor(1.6 * math.sqrt(math.max(0, 1 - t * t)) + 0.5)
      G.px(x, y, "K")
    end
    G.px(7, 10, "K"); G.px(6, 11, "K")
    G.px(10, 11, "K"); G.px(13, 11, "K")
    G.px(16, 10, "K"); G.px(17, 11, "K")
    return
  end
  for x = 5, 18 do
    local t = (x - CX) / RX
    local h = RY * math.sqrt(math.max(0, 1 - t * t)) * abre
    local top = math.floor(CY - h + 0.5)
    local bot = math.floor(CY + h + 0.5)
    if bot - top < 2 then
      G.px(x, math.floor(CY), "K")
    else
      for y = top + 1, bot - 1 do
        local d = math.sqrt((x - CX) ^ 2 + (y - CY) ^ 2)
        if d <= 1 then G.px(x, y, "K")
        elseif d <= 3.2 then G.px(x, y, y > CY and "i" or "I")
        else G.px(x, y, "E") end
      end
      G.px(x, top, "K"); G.px(x, bot, "K")
    end
  end
  -- brillo del ojo (solo si se ve)
  if abre > 0.6 then G.px(10, 7, "E") end
  -- pestañas arriba cuando está bien abierto
  if abre > 0.9 then G.px(7, 4, "K"); G.px(6, 3, "K"); G.px(11, 3, "K"); G.px(12, 3, "K"); G.px(16, 4, "K"); G.px(17, 3, "K") end
end

local ABRE = { 1, 0.5, 0, 0.5 }
local frames = {}
for f = 1, 4 do
  local G = newGrid(24, 24)
  bubble(G)
  eye(G, ABRE[f])
  frames[f] = G
end

local dir = app.params.dir
local spr = Sprite(24, 24, ColorMode.RGB)
for i, G in ipairs(frames) do
  local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
  frame.duration = ({ 1.2, 0.07, 0.12, 0.07 })[i]
  spr:newCel(spr.layers[1], frame, toImage(G), Point(0, 0))
end
spr:saveAs(dir .. "/globos/globo_observando.aseprite")
spr:close()
