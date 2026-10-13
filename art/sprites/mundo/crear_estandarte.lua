-- Estandarte del gremio campeón (Plaza del Registro de Gremios, Aurelia). Dos capas de 32x64:
--   estandarte_asta.png  asta de roble con remate dorado y travesaño (no se tiñe)
--   estandarte_tela.png  la tela en blancos y grises, 4 cuadros ondeando: el juego la tiñe con el
--                        color del gremio y le pone su emblema encima
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_estandarte.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","ffffff"},{"w","e4e4ea"},{"v","c4c4ce"},{"u","9c9ca8"},
  {"B","9a6438"},{"b","5a3a20"},{"Bh","c08a58"},{"Y","f0cc5a"},{"y","b08a30"},{"Yh","fff2a8"},
  {"S","8a8478"},{"s","5c574e"},
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
  return G
end

local function toImage(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y=0,H-1 do for x=0,W-1 do
    if not g[y*W+x] then
      for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
        local nx, ny = x+o[1], y+o[2]
        local n = (nx>=0 and nx<W and ny>=0 and ny<H) and g[ny*W+nx]
        if n and n ~= "K" then out[y*W+x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % W, k // W, C[c]) end
  return img
end

local dir = app.params.dir
local function save(path, frames, durs)
  local spr = Sprite(32, 64, ColorMode.RGB)
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = (durs and durs[i] or 180) / 1000
    spr:newCel(spr.layers[1], frame, toImage(G), Point(0,0))
  end
  spr:saveAs(path)
  spr:close()
end

-- asta: base de piedra, palo de roble, travesaño y remate dorado
do
  local G = newGrid(32, 64)
  G.rect(10,58,21,62,"S"); G.rect(10,58,21,58,"u"); G.rect(10,62,21,62,"s")
  G.rect(15,6,16,58,"B"); G.rect(16,6,16,58,"b"); G.px(15,20,"Bh"); G.px(15,36,"Bh")
  G.rect(5,9,26,10,"B"); G.rect(5,10,26,10,"b"); G.px(4,9,"Y"); G.px(27,9,"Y")
  G.rect(14,2,17,5,"Y"); G.rect(15,1,16,1,"Yh"); G.rect(14,5,17,5,"y")
  save(dir .. "/estandarte/estandarte_asta.aseprite", {G})
end

-- tela: cuelga del travesaño (filas 11..44) con borde dentado abajo; la ondulación desplaza las
-- columnas un píxel según una onda que avanza en cada cuadro
local frames = {}
for f=0,3 do
  local G = newGrid(32, 64)
  for x=6,25 do
    local wave = math.floor(math.sin((x / 3) + f * math.pi / 2) * 1.2 + 0.5)
    local bottom = 42 + wave + (((x - 6) % 5 == 2) and 3 or 0)
    for y=11,bottom do
      local c = "w"
      if x == 6 or x == 25 or y == 11 then c = "v" end
      if wave < 0 then c = (c == "w") and "W" or c end
      if wave > 0 and c == "w" then c = "v" end
      G.px(x, y, c)
    end
    G.px(x, bottom, "u")
  end
  -- franja dorada (se tiñe con el resto, queda como un tono más claro del color del gremio)
  for x=7,24 do G.px(x, 14, "W"); G.px(x, 15, "W") end
  frames[#frames + 1] = G
end
save(dir .. "/estandarte/estandarte_tela.aseprite", frames, {200,200,200,200})
