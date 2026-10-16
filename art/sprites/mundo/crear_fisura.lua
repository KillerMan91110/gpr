-- La Fisura Infernal (mazmorra bajo la Grieta Ardiente, en el Volcán Rojo): la forja secreta de los
-- Ocultos. Mismo estilo que crear_mina.lua:
--   fisura/tileset_fisura  tileset propio de 32x32 (basalto, lava, escoria, hornos, yunques, moldes…) + su .json
--   fisura/cuba            cuba de metal fundido, el punto de control (de pie / volcada, 32x32)
--   fisura/porton_forja    Portón de la Forja (sellado con el eclipse / abierto, 128x64)
-- Además exporta los PNG que usa el juego (parámetro png=public/assets/mundo):
--   tileset_fisura.png, mazmorra/cuba.png (tira 5x32), mazmorra/porton_forja.png (tira 3x128)
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_fisura.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- basalto (de claro a oscuro, un poco cálido por el brillo de la lava)
  {"p1","6e5e5c"},{"p2","56494a"},{"p3","43393b"},{"p4","33292e"},{"p5","241c22"},{"p6","171216"},
  -- lava y metal fundido
  {"F","fff4b0"},{"f1","ffd040"},{"f2","ff8a24"},{"f3","e04a1a"},{"f4","9a2414"},
  -- hierro negro de los Ocultos
  {"m1","8a8898"},{"m2","5c5a6a"},{"m3","3e3c4c"},{"m4","282632"},
  -- escoria
  {"s1","7e7468"},{"s2","5a5248"},{"s3","3c362e"},
  -- eclipse
  {"e1","d8a0ff"},{"e2","8a4ad8"},{"e3","4e2490"},
  -- madera quemada y cuero
  {"B","6e4630"},{"b","4a2e1e"},{"bb","2e1c12"},{"l1","8e6a48"},{"l2","644830"},
  -- vapor
  {"v1","c8c0bc"},{"v2","8e8682"},
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
          if n and n ~= "K" and n ~= "F" and n ~= "f1" and n ~= "e1" and n ~= "v1" and n ~= "v2" then out[y*W+x] = true break end
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

local function saveSheet(name, W, H, frames, durs, tags, opts)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = (durs and durs[i] or 150) / 1000
    spr:newCel(spr.layers[1], frame, toImage(G, opts), Point(0,0))
  end
  for _, t in ipairs(tags or {}) do local tag = spr:newTag(t[2], t[3]); tag.name = t[1] end
  spr:saveAs(dir .. "/fisura/" .. name .. ".aseprite")
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
local seed = 6661
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

-- losas de basalto talladas por los Ocultos (juntas en cruz, un poco desparejas)
local function losas(G, base)
  G.rect(0,0,31,31,base or "p2")
  G.line(0,15,31,15,"p4"); G.line(15,0,15,15,"p4"); G.line(7,16,7,31,"p4"); G.line(23,16,23,31,"p4")
  G.line(0,0,31,0,"p1"); G.line(0,16,31,16,"p1")
  for _=1,18 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), rnd() < 0.5 and "p3" or "p1") end
end
-- lava que se mueve apenas (manchas claras)
local function lava(G)
  G.rect(0,0,31,31,"f3")
  for _=1,7 do G.ellipse(rnd()*31, rnd()*31, 3 + rnd()*4, 1.5 + rnd()*2, "f2") end
  for _=1,6 do local x, y = math.floor(rnd()*30), math.floor(rnd()*30); G.rect(x, y, x+1, y, "f1") end
  for _=1,4 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "f4") end
end

tile("suelo", false, false, function(G) losas(G) end)
tile("suelo_grieta", false, false, function(G)
  losas(G)
  G.line(2,22,9,18,"f4"); G.line(9,18,15,20,"f3"); G.line(15,20,22,14,"f3"); G.line(22,14,29,15,"f4")
  G.px(12,19,"f1"); G.px(19,17,"f2")
end)
tile("suelo_escoria", false, false, function(G)
  losas(G, "p3")
  for _=1,40 do
    local x, y = math.floor(rnd()*30), math.floor(rnd()*30)
    G.rect(x, y, x+1, y+1, rnd() < 0.5 and "s2" or "s3"); if rnd() < 0.3 then G.px(x, y, "s1") end
  end
  G.px(8,9,"f3"); G.px(24,22,"f4")
end)
tile("sombra", false, false, function(G)
  losas(G)
  for y=0,7 do for x=0,31 do if (x + y) % 2 == 0 or y < 3 then G.px(x, y, y < 3 and "p5" or "p4") end end end
end)
tile("techo", true, false, function(G)
  G.rect(0,0,31,31,"p6")
  for _=1,14 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "p5") end
  if rnd() < 1 then G.px(math.floor(rnd()*31), math.floor(rnd()*31), "f4") end
end)
-- cara de la pared: basalto en columnas (prismas) con el borde de arriba oscuro
local function pared(G)
  G.rect(0,0,31,31,"p3")
  G.rect(0,0,31,3,"p5"); G.line(0,4,31,4,"p2")
  for _,x in ipairs({0, 8, 16, 24}) do
    G.line(x, 5, x, 28, "p4"); G.line(x + 1, 5, x + 1, 28, "p2")
    G.rect(x + 2, 6 + (x % 3), x + 6, 6 + (x % 3), "p2")
  end
  for _=1,10 do local x, y = math.floor(rnd()*30)+1, math.floor(rnd()*22)+6; G.px(x, y, "p4") end
  G.rect(0,29,31,31,"p4")
end
tile("pared", true, false, pared)
tile("pared_brasero", true, false, function(G)
  pared(G)
  -- brasero de hierro colgado con fuego
  G.line(15,6,15,10,"m3"); G.rect(10,11,21,12,"m2")
  G.ellipse(16,16,6,4,"m3"); G.rect(10,13,21,15,"m3")
  G.ellipse(16,12,4,3,"f2"); G.ellipse(16,11,2,2,"f1"); G.px(16,8,"f1"); G.px(14,9,"f2"); G.px(18,9,"f2")
  G.rect(13,20,19,21,"m2")
end)
tile("pared_eclipse", true, false, function(G)
  pared(G)
  -- el eclipse pintado de los Ocultos
  G.ellipse(16,16,7,7,"e3"); G.ellipse(16,16,6,6,"e2"); G.ellipse(18,15,5,5,"p3")
  G.px(10,16,"e1"); G.px(11,13,"e1"); G.px(11,19,"e1")
end)
tile("pared_cadena", true, false, function(G)
  pared(G)
  G.rect(6,5,9,7,"m2"); G.rect(22,5,25,7,"m2")
  for y=8,26,4 do G.ellipse(8, y, 1.5, 2, "m2"); G.px(8, y, "m4"); G.ellipse(24, y + 2, 1.5, 2, "m2"); G.px(24, y + 2, "m4") end
  G.line(8,27,24,29,"m2")
end)
tile("lava", true, false, function(G) lava(G) end)
-- lava con orilla de basalto arriba (cuando hay suelo encima)
tile("lava_borde", true, false, function(G)
  lava(G)
  G.rect(0,0,31,5,"p2"); G.line(0,0,31,0,"p1")
  for x=0,31 do if (x * 7) % 5 < 3 then G.px(x, 6, "p3") end end
  G.line(0,7,31,7,"f4")
end)
tile("puente_h", false, false, function(G)
  lava(G)
  -- tablones de escoria apisonada con bordes de hierro
  G.rect(0,6,31,25,"s2"); G.line(0,6,31,6,"s1"); G.line(0,25,31,25,"s3")
  for x=3,31,7 do G.line(x,7,x,24,"s3") end
  G.rect(0,4,31,5,"m3"); G.rect(0,26,31,27,"m3"); G.line(0,4,31,4,"m2")
  for x=4,31,9 do G.px(x,5,"m1"); G.px(x,27,"m1") end
end)
tile("puente_v", false, false, function(G)
  lava(G)
  G.rect(6,0,25,31,"s2"); G.line(6,0,6,31,"s1"); G.line(25,0,25,31,"s3")
  for y=3,31,7 do G.line(7,y,24,y,"s3") end
  G.rect(4,0,5,31,"m3"); G.rect(26,0,27,31,"m3"); G.line(4,0,4,31,"m2")
end)
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"p5")
  for i=0,5 do
    local y = 26 - i*5
    G.rect(i, y, 31-i, y+4, i % 2 == 0 and "p2" or "p3")
    G.line(i, y, 31-i, y, "p1")
    G.line(i, y+4, 31-i, y+4, "p5")
  end
  G.rect(0,0,2,31,"p4"); G.rect(29,0,31,31,"p4")
end)
-- el piso de la cámara de Morvak: losas con el eclipse grabado en metal
tile("piso_forja", false, false, function(G)
  losas(G, "p3")
  G.ring(16,16,10,10,"e3"); G.ring(16,16,9,9,"m3"); G.ellipse(18,15,5,5,"p4"); G.px(8,16,"e2"); G.px(16,16,"e1")
end)
-- canal de metal fundido con rejilla (se puede pisar)
tile("canal", false, false, function(G)
  losas(G)
  G.rect(0,11,31,20,"m4"); G.rect(0,12,31,19,"f3"); G.rect(0,14,31,17,"f2"); G.line(0,15,31,15,"f1")
  for x=1,31,4 do G.line(x,11,x,20,"m2") end
  G.line(0,11,31,11,"m1"); G.line(0,20,31,20,"m3")
end)
tile("yunque", true, false, function(G)
  G.ellipse(16,27,11,3,"p4")
  G.rect(11,20,21,26,"m3"); G.rect(9,25,23,27,"m2")
  G.rect(5,12,27,16,"m2"); G.line(5,12,27,12,"m1"); G.rect(22,13,30,14,"m2"); G.px(30,13,"m1")
  G.rect(8,17,24,19,"m3")
  G.rect(12,10,18,11,"f2"); G.px(15,9,"f1")
end)
tile("molde", true, false, function(G)
  G.ellipse(16,26,12,3,"p4")
  -- molde abierto con la forma de un Cristal de Eclipse
  G.rect(5,12,27,24,"m3"); G.rect(5,12,27,13,"m2"); G.line(5,24,27,24,"m4")
  G.rect(9,15,23,21,"m4")
  G.line(16,15,12,18,"e3"); G.line(12,18,16,21,"e3"); G.line(16,21,20,18,"e3"); G.line(20,18,16,15,"e3")
  G.px(16,18,"e2")
end)
tile("pila_escoria", true, false, function(G)
  G.ellipse(16,24,13,6,"s3"); G.ellipse(16,21,11,6,"s2"); G.ellipse(14,17,7,4,"s2")
  for _,p in ipairs({{9,20},{13,16},{19,18},{22,22},{15,23}}) do G.rect(p[1], p[2], p[1]+2, p[2]+1, "s1") end
  G.px(17,19,"f3"); G.px(11,22,"f4")
end)
tile("caja", true, false, function(G)
  G.rect(6,10,25,27,"B"); G.rect(6,10,25,11,"l1"); G.line(6,10,25,27,"b"); G.line(25,10,6,27,"b")
  G.rect(6,10,6,27,"bb"); G.rect(25,10,25,27,"bb"); G.rect(6,27,25,27,"bb")
  G.ellipse(16,18,3,3,"e3"); G.px(15,18,"e2")
end)
-- crisol frío, decorativo (los que se pueden volcar son las cubas, aparte)
tile("crisol", true, false, function(G)
  G.ellipse(16,27,10,3,"p4")
  G.rect(8,12,24,25,"m3"); G.ellipse(16,12,8,3,"m2"); G.ellipse(16,12,6,2,"s3")
  G.line(8,12,8,25,"m2"); G.line(6,15,8,15,"m2"); G.line(24,15,26,15,"m2")
end)
-- horno de los Ocultos (2x2): cúpula arriba (encima), boca encendida abajo (choca)
local function horno(G, cx, cy)
  G.ellipse(32 - cx, 30 - cy, 28, 26, "p3"); G.ellipse(28 - cx, 26 - cy, 20, 18, "p2")
  G.rect(4 - cx, 30 - cy, 60 - cx, 60 - cy, "p3"); G.rect(4 - cx, 30 - cy, 8 - cx, 60 - cy, "p2")
  G.rect(28 - cx, 0 - cy, 36 - cx, 8 - cy, "p4")
  -- el eclipse en la cúpula
  G.ellipse(32 - cx, 20 - cy, 5, 5, "e2"); G.ellipse(34 - cx, 19 - cy, 4, 4, "p2")
  -- la boca
  G.ellipse(32 - cx, 48 - cy, 13, 11, "p5"); G.ellipse(32 - cx, 50 - cy, 10, 8, "f4"); G.ellipse(32 - cx, 52 - cy, 7, 5, "f3")
  G.ellipse(32 - cx, 53 - cy, 4, 3, "f1"); G.rect(16 - cx, 58 - cy, 48 - cx, 61 - cy, "p4")
end
tile("horno_0_0", false, true, function(G) horno(G, 0, 0) end)
tile("horno_0_1", false, true, function(G) horno(G, 32, 0) end)
tile("horno_1_0", true, false, function(G) horno(G, 0, 32) end)
tile("horno_1_1", true, false, function(G) horno(G, 32, 32) end)
-- puente ancho (3 casillas): borde de arriba con baranda, centro liso y borde de abajo con baranda.
-- El centro también sirve para las bajadas verticales al puente.
local function tablones(G)
  G.rect(0,0,31,31,"s2")
  for x=3,31,7 do G.line(x,0,x,31,"s3") end
  for _=1,10 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "s1") end
end
tile("puente_n", false, false, function(G)
  lava(G); G.rect(0,6,31,31,"s2"); tablones(G); G.rect(0,0,31,5,"f3")
  G.rect(0,4,31,5,"m3"); G.line(0,4,31,4,"m2"); for x=4,31,9 do G.px(x,5,"m1") end
end)
tile("puente_c", false, false, function(G) tablones(G) end)
tile("puente_s", false, false, function(G)
  lava(G); tablones(G); G.rect(0,26,31,31,"f3")
  G.rect(0,24,31,25,"m3"); G.line(0,24,31,24,"m2"); for x=4,31,9 do G.px(x,25,"m1") end
  for y=26,31 do for x=0,31 do if (x + y * 3) % 7 < 2 then G.px(x, y, "f2") end end end
end)

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
  spr:saveAs(dir .. "/fisura/tileset_fisura.aseprite")
  if png then spr:saveCopyAs(png .. "/tileset_fisura.png") end
  spr:close()
  local fh = io.open(dir .. "/tileset_fisura.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Cuba de metal fundido (32x32): 0 de pie y llena (peligro), 1-4 volcada y enfriándose con vapor
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32)
    if i == 0 then
      -- cuba de pie sobre su soporte, llena de metal al rojo
      G.rect(6,27,25,29,"m3"); G.line(8,20,6,28,"m2"); G.line(23,20,25,28,"m2")
      G.rect(7,11,24,25,"m3"); G.rect(7,11,8,25,"m2")
      G.ellipse(16,11,9,3,"m2"); G.ellipse(16,11,7,2,"f2"); G.px(14,11,"f1"); G.px(18,10,"F")
      G.line(4,14,7,14,"m2"); G.line(24,14,27,14,"m2")
    else
      -- volcada: la cuba de costado y el metal derramado, ya oscuro, echando vapor
      local s = i % 2
      G.ellipse(18,27,12,3,"s3"); G.ellipse(18,27,9,2,"s2"); G.px(22,27,"f4")
      G.rect(3,17,17,26,"m3"); G.ellipse(17,21,3,5,"m2"); G.ellipse(17,21,2,4,"s3")
      G.line(3,17,17,17,"m2")
      G.ellipse(20 + s, 18 - s, 3, 2, "v2"); G.ellipse(23 - s, 13 - s, 3, 2, "v1"); G.ellipse(20 + s, 8 - s * 2, 2, 2, "v1")
    end
    frames[#frames+1] = G; durs[#durs+1] = 180
  end
  saveSheet("cuba", 32, 32, frames, durs, {{"llena",1,1},{"volcada",2,5}})
end

-- =====================================================================================
-- Portón de la Forja (128x64): 0-1 sellado (el eclipse late y el hierro está al rojo), 2 abierto
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64)
    -- marco de basalto
    G.rect(0,8,127,63,"p3")
    G.rect(0,8,127,13,"p2"); G.line(0,8,127,8,"p1"); G.line(0,13,127,13,"p5")
    G.rect(0,14,13,63,"p2"); G.rect(114,14,127,63,"p2"); G.line(13,14,13,63,"p5"); G.line(114,14,114,63,"p1")
    G.rect(14,14,113,63,"p5")
    if i < 2 then
      -- dos hojas de hierro negro con remaches y el eclipse en el medio
      G.rect(16,14,63,63,"m3"); G.rect(64,14,111,63,"m3"); G.line(63,14,63,63,"m4"); G.line(64,14,64,63,"m2")
      for y=20,60,10 do for _,x in ipairs({20,40,58,70,88,106}) do G.px(x,y,"m1") end end
      -- borde inferior al rojo
      G.rect(16,58,111,63,i == 0 and "f3" or "f4"); G.line(16,58,111,58,i == 0 and "f2" or "f3")
      local glow = i == 0 and "e1" or "e2"
      G.ellipse(64,34,13,13,"e3"); G.ellipse(64,34,11,11,glow); G.ellipse(68,32,9,9,"m3")
      G.px(53,34,"W"); G.px(55,28,glow); G.px(55,40,glow)
    else
      -- abierto: las hojas recogidas a los lados y el túnel con resplandor
      G.rect(14,14,22,63,"m3"); G.rect(105,14,113,63,"m3")
      for k=0,3 do G.rect(36 + k*3, 50 + k*3, 92 - k*3, 51 + k*3, "p4") end
      G.ellipse(64,40,20,10,"f4")
    end
    -- braseros a los lados
    for _,x in ipairs({6, 121}) do G.rect(x-3,26,x+3,31,"m3"); G.rect(x-2,22,x+2,25,"f2"); G.px(x,21,"f1") end
    frames[#frames+1] = G
  end
  saveSheet("porton_forja", 128, 64, frames, {500, 500, 500}, {{"sellado",1,2},{"abierto",3,3}}, {outline=false})
end
