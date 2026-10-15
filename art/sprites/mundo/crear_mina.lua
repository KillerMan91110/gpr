-- La Mina Profunda (mazmorra bajo las Minas Abandonadas, en las Montañas Grises), mismo estilo que
-- crear_cripta.lua:
--   mina/tileset_mina    tileset propio de 32x32 (roca, rieles, vigas, vetas, vagonetas, el Sello…) + su .json
--   mina/farol           farol de control de los mineros (apagado y encendido, 32x32)
--   mina/reja_sello      Reja del Sello (cerrada con runas enanas / abierta, 128x64)
-- Además exporta los PNG que usa el juego (parámetro png=public/assets/mundo):
--   tileset_mina.png, mazmorra/farol.png (tira 5x32), mazmorra/reja_sello.png (tira 3x128)
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_mina.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- roca de la mina (de clara a oscura)
  {"p1","7a7468"},{"p2","5e5950"},{"p3","4a4640"},{"p4","38342f"},{"p5","27241f"},{"p6","1a1814"},
  -- tierra, grava, agua, madera, hierro, mineral, cristal de eclipse, sello azul, fuego
  {"d1","6e5a44"},{"d2","54432f"},
  {"q1","5a7a9a"},{"q2","3e5a78"},
  {"B","8a5a34"},{"b","5e3c22"},{"bb","3e2614"},
  {"m1","a8b0bc"},{"m2","6a7280"},{"m3","3e4450"},
  {"O","d8b860"},{"o","a08038"},
  {"e1","c890ff"},{"e2","8a4ad8"},{"e3","4e2490"},
  {"C","9ae8ff"},{"c","4a9ad8"},{"cc","2a5a9a"},{"Ch","e0ffff"},
  {"F","ffe070"},{"f","ff9a4a"},{"ff","d0502a"},
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
  function G.ring(cx,cy,rx,ry,c)
    for a=0,359,3 do G.px(cx + rx*math.cos(math.rad(a)), cy + ry*math.sin(math.rad(a)), c) end
  end
  return G
end

local function toImage(G, opts)
  opts = opts or {}
  local W, H, g, out = G.w, G.h, G.g, {}
  if opts.outline ~= false then
    for y=0,H-1 do for x=0,W-1 do
      if not g[y*W+x] then
        for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
          local nx, ny = x+o[1], y+o[2]
          local n = (nx>=0 and nx<W and ny>=0 and ny<H) and g[ny*W+nx]
          if n and n ~= "K" and n ~= "F" and n ~= "Ch" and n ~= "e1" then out[y*W+x] = true break end
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
local png = app.params.png

-- hoja animada en .aseprite y, si hay png, también la tira horizontal que carga Phaser
local function saveSheet(name, W, H, frames, durs, tags, opts)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = (durs and durs[i] or 150) / 1000
    spr:newCel(spr.layers[1], frame, toImage(G, opts), Point(0,0))
  end
  for _, t in ipairs(tags or {}) do local tag = spr:newTag(t[2], t[3]); tag.name = t[1] end
  spr:saveAs(dir .. "/mina/" .. name .. ".aseprite")
  spr:close()
  if png then
    local strip = Image(W * #frames, H, ColorMode.RGB)
    for i, G in ipairs(frames) do strip:drawImage(toImage(G, opts), Point((i - 1) * W, 0)) end
    local out = Sprite(W * #frames, H, ColorMode.RGB)
    out:newCel(out.layers[1], out.frames[1], strip, Point(0, 0))
    out:saveCopyAs(png .. "/mazmorra/" .. name .. ".png")
    out:close()
  end
end

-- pseudoazar fijo (las texturas salen iguales cada vez)
local seed = 5151
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

-- =====================================================================================
-- Tileset (32x32 cada uno). Se arma en una sola imagen de 8 columnas.
-- =====================================================================================
local TILES = {}
local function tile(nombre, colision, encima, draw)
  local G = newGrid(32, 32)
  draw(G)
  TILES[#TILES+1] = {nombre=nombre, colision=colision, encima=encima, G=G}
end

-- piso de roca apisonada con piedritas
local function rocaSuelo(G, base)
  G.rect(0,0,31,31,base or "p2")
  for _=1,26 do
    local x, y = math.floor(rnd()*31), math.floor(rnd()*31)
    G.px(x, y, rnd() < 0.5 and "p3" or "p1")
  end
  for _=1,3 do
    local x, y = math.floor(rnd()*27)+2, math.floor(rnd()*27)+2
    G.rect(x, y, x+1, y, "p1"); G.px(x, y+1, "p4")
  end
end
local function rieles(G, vertical)
  if vertical then
    for y=2,31,7 do G.rect(6,y,25,y+2,"b"); G.line(6,y,25,y,"B") end
    G.rect(9,0,10,31,"m2"); G.rect(21,0,22,31,"m2"); G.line(9,0,9,31,"m1"); G.line(21,0,21,31,"m1")
  else
    for x=2,31,7 do G.rect(x,6,x+2,25,"b"); G.line(x,6,x,25,"B") end
    G.rect(0,9,31,10,"m2"); G.rect(0,21,31,22,"m2"); G.line(0,9,31,9,"m1"); G.line(0,21,31,21,"m1")
  end
end

tile("suelo", false, false, function(G) rocaSuelo(G) end)
tile("suelo_grava", false, false, function(G)
  rocaSuelo(G, "d2")
  for _=1,40 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), rnd() < 0.5 and "d1" or "p3") end
end)
tile("suelo_charco", false, false, function(G)
  rocaSuelo(G)
  G.ellipse(16,18,11,6,"q2"); G.ellipse(15,17,9,4,"q1"); G.line(10,16,14,15,"W")
end)
tile("rieles_h", false, false, function(G) rocaSuelo(G); rieles(G, false) end)
tile("rieles_v", false, false, function(G) rocaSuelo(G); rieles(G, true) end)
tile("techo", true, false, function(G)
  G.rect(0,0,31,31,"p6")
  for _=1,18 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "p5") end
end)
-- cara de la pared: roca en capas, con borde de arriba oscuro
local function paredRoca(G)
  G.rect(0,0,31,31,"p3")
  G.rect(0,0,31,3,"p5"); G.line(0,4,31,4,"p2")
  for _,y in ipairs({10, 17, 24}) do
    for x=0,31 do if math.sin(x * 0.4 + y) > -0.2 then G.px(x, y + math.floor(math.sin(x * 0.3 + y) * 1.5), "p4") end end
  end
  for _=1,12 do local x, y = math.floor(rnd()*30)+1, math.floor(rnd()*24)+5; G.px(x, y, "p2") end
  G.rect(0,29,31,31,"p4")
end
tile("pared", true, false, paredRoca)
tile("pared_veta", true, false, function(G)
  paredRoca(G)
  G.line(4,12,12,16,"o"); G.line(12,16,20,13,"o"); G.line(20,13,28,18,"o")
  for _,p in ipairs({{7,13},{15,15},{24,15}}) do G.px(p[1], p[2], "O") end
end)
tile("pared_farol", true, false, function(G)
  paredRoca(G)
  G.line(15,6,15,12,"m3"); G.rect(12,12,19,13,"m2")
  G.rect(12,14,19,21,"m3"); G.rect(13,15,18,20,"F"); G.rect(14,16,17,19,"f"); G.rect(12,22,19,22,"m2")
end)
tile("pared_cristal", true, false, function(G)
  paredRoca(G)
  G.thick(10,26,14,10,3,"e3"); G.line(10,26,13,11,"e2"); G.px(13,10,"e1")
  G.thick(18,26,21,15,2,"e3"); G.line(18,26,20,16,"e2"); G.px(20,15,"e1")
  G.px(16,22,"e1")
end)
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"p5")
  for i=0,5 do
    local y = 26 - i*5
    G.rect(i, y, 31-i, y+4, i % 2 == 0 and "B" or "b")
    G.line(i, y, 31-i, y, "p1")
    G.line(i, y+4, 31-i, y+4, "bb")
  end
  G.rect(0,0,2,31,"p4"); G.rect(29,0,31,31,"p4")
end)
-- viga de mina de 2 casillas: travesaño arriba (encima) y poste abajo (choca)
tile("viga_0_0", false, true, function(G)
  G.rect(0,14,31,20,"B"); G.line(0,14,31,14,"F"); G.line(0,20,31,20,"bb")
  G.rect(12,20,19,31,"B"); G.line(12,20,12,31,"d1"); G.line(19,20,19,31,"bb")
  G.px(4,17,"bb"); G.px(27,17,"bb")
end)
tile("viga_1_0", true, false, function(G)
  G.rect(12,0,19,26,"B"); G.line(12,0,12,26,"d1"); G.line(19,0,19,26,"bb")
  G.line(15,4,15,22,"b")
  G.rect(9,26,22,29,"p3"); G.line(9,26,22,26,"p1")
end)
tile("vagoneta", true, false, function(G)
  rocaSuelo(G)
  G.rect(4,10,27,24,"m3"); G.rect(5,9,26,12,"m2"); G.line(5,9,26,9,"m1")
  G.ellipse(16,10,9,3,"o"); G.px(12,9,"O"); G.px(19,9,"O"); G.px(15,8,"e2")
  G.ellipse(9,26,3,3,"m3"); G.ellipse(23,26,3,3,"m3"); G.px(9,26,"m1"); G.px(23,26,"m1")
end)
tile("pila_mineral", true, false, function(G)
  G.ellipse(16,24,12,6,"p3"); G.ellipse(16,22,10,5,"p2")
  for _,p in ipairs({{10,20},{14,18},{19,19},{22,22},{13,23},{17,22}}) do G.rect(p[1], p[2], p[1]+2, p[2]+1, "o"); G.px(p[1], p[2], "O") end
  G.px(16,17,"e2")
end)
tile("barril", true, false, function(G)
  G.ellipse(16,24,8,4,"bb"); G.rect(8,10,23,24,"B"); G.ellipse(16,10,8,3,"b"); G.ellipse(16,10,6,2,"bb")
  G.line(8,15,23,15,"m3"); G.line(8,21,23,21,"m3"); G.line(10,11,10,23,"d1")
end)
tile("caja", true, false, function(G)
  G.rect(6,10,25,27,"B"); G.rect(6,10,25,11,"d1"); G.line(6,10,25,27,"b"); G.line(25,10,6,27,"b")
  G.rect(6,10,6,27,"bb"); G.rect(25,10,25,27,"bb"); G.rect(6,27,25,27,"bb")
end)
tile("sombra", false, false, function(G)
  rocaSuelo(G)
  for y=0,7 do for x=0,31 do if (x + y) % 2 == 0 or y < 3 then G.px(x, y, y < 3 and "p5" or "p4") end end end
end)
tile("grieta_negra", false, false, function(G)
  rocaSuelo(G)
  G.line(2,20,10,16,"p6"); G.line(10,16,16,18,"p6"); G.line(16,18,24,12,"p6"); G.line(24,12,30,13,"p6")
  G.px(12,17,"e2"); G.px(20,15,"e3"); G.px(16,18,"e1")
end)
-- piso del Sello: losas talladas por los enanos con runas azules
tile("piso_sello", false, false, function(G)
  G.rect(0,0,31,31,"p2"); G.line(0,15,31,15,"p4"); G.line(15,0,15,31,"p4"); G.line(0,0,31,0,"p1"); G.line(0,0,0,31,"p1")
  G.ring(16,16,9,9,"cc"); G.line(16,8,16,24,"c"); G.line(8,16,24,16,"c"); G.px(16,16,"C")
end)
-- el Segundo Sello: piedra azul de 2x2 casillas con runas de plata, agrietada
local function sello(G, cx, cy)
  G.ellipse(32 - cx, 34 - cy, 26, 12, "p4")
  G.ellipse(32 - cx, 24 - cy, 20, 24, "cc"); G.ellipse(30 - cx, 22 - cy, 16, 20, "c")
  G.ellipse(26 - cx, 14 - cy, 5, 6, "C")
  G.line(32 - cx, 6 - cy, 32 - cx, 40 - cy, "Ch"); G.line(22 - cx, 22 - cy, 42 - cx, 22 - cy, "m1")
  G.ring(32 - cx, 22 - cy, 9, 9, "m1")
  -- la grieta que late con luz negra
  G.line(38 - cx, 4 - cy, 34 - cx, 16 - cy, "e3"); G.line(34 - cx, 16 - cy, 40 - cx, 28 - cy, "e3"); G.line(40 - cx, 28 - cy, 35 - cx, 42 - cy, "e3")
  G.px(34 - cx, 16 - cy, "e1"); G.px(40 - cx, 28 - cy, "e1")
end
tile("sello_0_0", false, true, function(G) sello(G, 0, 0) end)
tile("sello_0_1", false, true, function(G) sello(G, 32, 0) end)
tile("sello_1_0", true, false, function(G) sello(G, 0, 32) end)
tile("sello_1_1", true, false, function(G) sello(G, 32, 32) end)

do
  local COLS = 8
  local rows = math.ceil(#TILES / COLS)
  local spr = Sprite(COLS * 32, rows * 32, ColorMode.RGB)
  local img = Image(COLS * 32, rows * 32, ColorMode.RGB)
  local meta = {}
  for i, t in ipairs(TILES) do
    local id = i - 1
    img:drawImage(toImage(t.G, {outline=false}), Point((id % COLS) * 32, (id // COLS) * 32))
    meta[#meta+1] = string.format('{"id":%d,"nombre":"%s","colision":%s,"encima":%s}', id, t.nombre, tostring(t.colision), tostring(t.encima))
  end
  spr:newCel(spr.layers[1], spr.frames[1], img, Point(0,0))
  spr:saveAs(dir .. "/mina/tileset_mina.aseprite")
  if png then spr:saveCopyAs(png .. "/tileset_mina.png") end
  spr:close()
  local fh = io.open(dir .. "/tileset_mina.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Farol de control de los mineros (32x32): 0 apagado, 1-4 encendido
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32)
    G.rect(15,10,16,30,"bb"); G.rect(11,29,20,30,"b")
    G.line(16,8,22,8,"m3"); G.line(22,8,22,11,"m3")
    G.rect(18,11,26,12,"m2"); G.rect(18,13,26,22,"m3"); G.rect(18,23,26,23,"m2")
    if i == 0 then
      G.rect(19,14,25,21,"p4"); G.px(22,18,"p3")
    else
      local s = i % 2
      G.rect(19,14,25,21,"f"); G.rect(20,15,24,20,"F"); G.rect(21,16 + s,23,19,"W")
    end
    frames[#frames+1] = G; durs[#durs+1] = 140
  end
  saveSheet("farol", 32, 32, frames, durs, {{"apagado",1,1},{"encendido",2,5}})
end

-- =====================================================================================
-- Reja del Sello (128x64): 0-1 cerrada (las runas laten), 2 abierta
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64)
    -- marco de roca con vigas de madera
    G.rect(0,8,127,63,"p3")
    G.rect(0,8,127,13,"B"); G.line(0,8,127,8,"d1"); G.line(0,13,127,13,"bb")
    G.rect(0,14,13,63,"B"); G.rect(114,14,127,63,"B"); G.line(13,14,13,63,"bb"); G.line(114,14,114,63,"d1")
    G.rect(14,14,113,63,"p5")
    if i < 2 then
      -- barrotes de hierro con un candado enorme y runas enanas
      for x=20,108,8 do G.rect(x,14,x+2,63,"m3"); G.line(x,14,x,63,"m2") end
      for y=26,58,16 do G.rect(14,y,113,y+2,"m3"); G.line(14,y,113,y,"m2") end
      local glow = i == 0 and "C" or "c"
      G.rect(56,32,72,46,"m2"); G.rect(57,33,71,45,"m3"); G.ring(64,30,6,6,"m2")
      G.line(64,36,64,42,glow); G.px(64,36,"Ch"); G.line(61,39,67,39,glow)
      for _,x in ipairs({30, 46, 82, 98}) do G.line(x,18,x,24,glow); G.line(x-2,21,x+2,21,glow) end
    else
      -- abierta: la reja subida y un túnel oscuro
      for x=20,108,8 do G.rect(x,14,x+2,18,"m3") end
      for k=0,3 do G.rect(36 + k*3, 50 + k*3, 92 - k*3, 51 + k*3, "p4") end
    end
    -- faroles a los lados
    for _,x in ipairs({6, 121}) do G.rect(x-2,24,x+2,30,"m3"); G.rect(x-1,25,x+1,29,"F") end
    frames[#frames+1] = G
  end
  saveSheet("reja_sello", 128, 64, frames, {500, 500, 500}, {{"sellada",1,2},{"abierta",3,3}}, {outline=false})
end
