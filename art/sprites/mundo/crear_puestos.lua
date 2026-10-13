-- Muñecos de venta y buzón del correo.
--  munecos.png  32x32, 3 filas (oso, conejo, gato) x 2 cuadros: el muñeco de trapo sentado sobre
--               su manta, con una bolsita de monedas; en el cuadro 2 saluda con la patita
--  buzon.png    32x48, 2 cuadros: el buzón real de Aurelia con la banderita baja / levantada
--               (levantada = tienes cartas sin leer)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_puestos.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","fffaf0"},{"w","e6dcc8"},
  -- oso
  {"B","a8703c"},{"b","7a4a24"},{"Bh","c8905a"},{"T","e8cfa0"},
  -- conejo
  {"P","f4f0f4"},{"p","c8c0d0"},{"Pk","f0a0b8"},
  -- gato
  {"G","9aa0b0"},{"g","6a7080"},{"Gh","c4c8d4"},{"Go","e0a050"},
  -- comunes
  {"E","1c2a4a"},{"N","e85a6a"},{"R","c0343a"},{"r","7a1f2a"},{"Rh","e05a5a"},
  {"Y","f0cc5a"},{"y","a8802c"},{"V","6a3a8a"},{"v","432456"},
  {"A","3a5ea8"},{"a","243c70"},{"Ah","5a86d8"},{"S","8a8e98"},{"s","5a5e68"},
  {"M","b07a3a"},{"m","7a5226"},{"Mh","d8a060"},
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

local function toImage(G)
  local W, H, g = G.w, G.h, G.g
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
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % W, k // W, C[c]) end
  return img
end

-- ------------------------------------------------------------------ muñecos
-- piel: color principal, sombra, claro y hocico
local LOOKS = {
  oso = { main = "B", dark = "b", light = "Bh", muzzle = "T", mat = "R", matD = "r", matL = "Rh" },
  conejo = { main = "P", dark = "p", light = "W", muzzle = "W", mat = "A", matD = "a", matL = "Ah" },
  gato = { main = "G", dark = "g", light = "Gh", muzzle = "W", mat = "V", matD = "v", matL = "Y" },
}

local function doll(kind, wave)
  local L = LOOKS[kind]
  local G = newGrid(32, 32)
  -- manta (cojín) donde está sentado, con flecos
  G.ellipse(16, 27, 13, 4, L.mat); G.ellipse(16, 28, 13, 3, L.matD); G.rect(5, 26, 27, 26, L.matL)
  for x = 4, 28, 3 do G.px(x, 31, L.matL) end
  -- piernas estiradas hacia delante
  G.ellipse(11, 25, 3, 2.5, L.main); G.ellipse(21, 25, 3, 2.5, L.main)
  G.ellipse(11, 26, 2, 1.5, L.muzzle); G.ellipse(21, 26, 2, 1.5, L.muzzle)
  -- cuerpo panzón con costura
  G.ellipse(16, 20, 7, 6, L.main); G.ellipse(18, 21, 4, 4, L.dark); G.ellipse(16, 20, 6, 5, L.main)
  G.ellipse(16, 21, 4, 3.5, L.muzzle)
  for y = 18, 24, 2 do G.px(16, y, L.dark) end
  -- bracito izquierdo sujeta la bolsa de monedas
  G.ellipse(8, 21, 2, 3, L.main)
  G.ellipse(6, 24, 3, 3, "M"); G.rect(5, 21, 7, 21, "m"); G.px(6, 20, "Y"); G.px(5, 24, "Mh"); G.px(6, 25, "Y")
  -- bracito derecho: abajo o saludando
  if wave then G.ellipse(25, 13, 2, 3, L.main); G.ellipse(25, 11, 2, 1.5, L.light)
  else G.ellipse(24, 21, 2, 3, L.main) end
  -- cabeza
  local hy = 10
  G.ellipse(16, hy, 7, 6, L.main); G.ellipse(16, hy - 1, 5, 4, L.light); G.ellipse(16, hy, 6, 5, L.main)
  -- orejas
  if kind == "oso" then
    G.ellipse(10, hy - 5, 2.5, 2.5, L.main); G.ellipse(22, hy - 5, 2.5, 2.5, L.main)
    G.ellipse(10, hy - 5, 1.2, 1.2, L.muzzle); G.ellipse(22, hy - 5, 1.2, 1.2, L.muzzle)
  elseif kind == "conejo" then
    G.rect(11, hy - 9, 13, hy - 4, L.main); G.rect(19, hy - 9, 21, hy - 4, L.main)
    G.rect(12, hy - 8, 12, hy - 5, "Pk"); G.rect(20, hy - 8, 20, hy - 5, "Pk")
    G.rect(21, hy - 9, 23, hy - 8, L.main); G.px(23, hy - 7, L.dark) -- una oreja dobladita
  else
    for i = 0, 3 do G.rect(10 + i // 2, hy - 8 + i, 12, hy - 8 + i, L.main); G.rect(20, hy - 8 + i, 22 - i // 2, hy - 8 + i, L.main) end
    G.px(11, hy - 6, "Pk"); G.px(21, hy - 6, "Pk")
    G.rect(14, hy - 5, 18, hy - 5, "Go"); G.px(16, hy - 4, "Go") -- manchita naranja
  end
  -- cara: ojos de botón, hocico y nariz
  G.rect(12, hy - 1, 13, hy, "E"); G.rect(19, hy - 1, 20, hy, "E"); G.px(12, hy - 1, "W"); G.px(19, hy - 1, "W")
  G.ellipse(16, hy + 2, 2.5, 1.8, L.muzzle); G.px(16, hy + 1, "N"); G.px(15, hy + 3, L.dark); G.px(17, hy + 3, L.dark)
  if kind == "gato" then G.px(9, hy + 2, "W"); G.px(23, hy + 2, "W") end
  -- remiendo de muñeco de trapo
  G.rect(19, 17, 20, 18, "Y"); G.px(19, 17, "y")
  return G
end

local dir = app.params.dir
do
  local spr = Sprite(64, 96, ColorMode.RGB)
  local img = Image(64, 96, ColorMode.RGB)
  local row = 0
  for _, kind in ipairs({ "oso", "conejo", "gato" }) do
    for f = 0, 1 do img:drawImage(toImage(doll(kind, f == 1)), Point(f * 32, row * 32)) end
    row = row + 1
  end
  spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
  spr:saveAs(dir .. "/puestos/munecos.aseprite")
  spr:close()
end

-- ------------------------------------------------------------------ buzón
local function mailbox(flagUp)
  local G = newGrid(32, 48)
  -- poste y base de piedra
  G.rect(14, 26, 17, 43, "s"); G.rect(14, 26, 14, 43, "S")
  G.rect(10, 43, 21, 46, "S"); G.rect(10, 46, 21, 46, "s")
  -- caja azul real con techo redondeado y ribete dorado
  G.ellipse(16, 10, 10, 6, "A"); G.rect(6, 10, 26, 26, "A"); G.rect(22, 10, 26, 26, "a"); G.rect(7, 11, 8, 24, "Ah")
  G.rect(6, 26, 26, 27, "y"); G.rect(6, 15, 26, 15, "Y"); G.ellipse(16, 10, 10, 6, "A"); G.rect(7, 5, 25, 5, "Ah")
  G.rect(6, 15, 26, 15, "Y")
  -- ranura y escudo de Aurelia (sol dorado)
  G.rect(11, 18, 21, 19, "K"); G.rect(11, 20, 21, 20, "a")
  G.ellipse(16, 23, 2, 2, "Y"); G.px(16, 20, "Y"); G.px(13, 23, "Y"); G.px(19, 23, "Y")
  -- banderita roja a un costado
  G.rect(27, 12, 28, 22, "S")
  if flagUp then G.rect(28, 4, 29, 12, "s"); G.rect(29, 4, 31, 8, "R"); G.rect(29, 4, 31, 4, "Rh")
  else G.rect(28, 17, 31, 19, "R"); G.rect(28, 17, 31, 17, "Rh") end
  return G
end

do
  local spr = Sprite(32, 48, ColorMode.RGB)
  for i, up in ipairs({ false, true }) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    spr:newCel(spr.layers[1], frame, toImage(mailbox(up)), Point(0, 0))
  end
  spr:saveAs(dir .. "/puestos/buzon.aseprite")
  spr:close()
end
