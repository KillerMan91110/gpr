-- La Cripta del Vigía (mazmorra bajo las Ruinas del Vigía, en la Pradera):
--   cripta/tileset_cripta  tileset propio de 32x32 (suelos, paredes, columnas, sarcófagos…) + su .json
--   cripta/brasero         brasero de control (apagado y encendido, 32x32)
--   cripta/puerta_sello    puerta del Vigía (sellada con runa / abierta, 128x64)
--   cripta/entrada         boca de la cripta que se ve en las ruinas (64x64)
--   cripta/centinela       Centinela de Hueso (48x48, combate)
--   cripta/espectro        Espectro de la Cripta (48x48, combate)
--   cripta/vigia           El Vigía Caído, el jefe (64x64, combate)
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_cripta.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- piedra de la cripta (de clara a oscura)
  {"p1","6e6a86"},{"p2","56536e"},{"p3","444159"},{"p4","333045"},{"p5","242233"},{"p6","19172a"},
  -- musgo, hueso, alfombra, oro, runa, fuego, madera, óxido
  {"m1","5f8a48"},{"m2","3f6234"},
  {"T","e8dcb8"},{"t","b8a880"},{"tt","857a5c"},
  {"R","a8303a"},{"r","6a1a26"},{"Y","e8c050"},{"y","a8802c"},
  {"C","7ff8ff"},{"c","3aa8c8"},{"cc","1f6a8a"},{"Ch","d8ffff"},
  {"F","ffe070"},{"f","ff9a4a"},{"ff","d0502a"},
  {"B","6a4428"},{"b","4f2e1c"},
  {"o","8a5a3a"},{"oo","5a3a2a"},
  -- espectro
  {"v1","b8a8e8"},{"v2","7a68b8"},{"v3","4a3a80"},{"v4","2a2050"},
  -- armadura del Vigía
  {"a1","a8b0c0"},{"a2","7a8296"},{"a3","505870"},{"a4","343a50"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

local function newGrid(W, H, ground)
  ground = ground or H - 1
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x>=0 and x<W and y>=0 and y<H and y<=ground then g[y*W+x] = c end
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
          if n and n ~= "K" and n ~= "Ch" and n ~= "C" then out[y*W+x] = true break end
        end
      end
    end end
    for k in pairs(out) do g[k] = "K" end
  end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do
    local x = k % W
    img:drawPixel(opts.flip and (W - 1 - x) or x, k // W, C[c])
  end
  return img
end

local dir = app.params.dir

local function saveSheet(path, W, H, frames, durs, tags, opts)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = (durs and durs[i] or 150) / 1000
    spr:newCel(spr.layers[1], frame, toImage(G, opts), Point(0,0))
  end
  for _, t in ipairs(tags or {}) do local tag = spr:newTag(t[2], t[3]); tag.name = t[1] end
  spr:saveAs(path)
  spr:close()
end

-- monstruo de combate: anims = {{name, poses}}; draw(P) devuelve la grilla. Se guarda mirando a
-- la izquierda (flip) y deja el manifiesto de animaciones para enemigos.json.
local function saveMonster(name, size, draw, anims)
  local frames, durs, tags, manifest = {}, {}, {}, {}
  for _,a in ipairs(anims) do
    local from = #frames + 1
    local idx, ds = {}, {}
    for _,P in ipairs(a.poses) do
      frames[#frames+1] = draw(P); durs[#durs+1] = P.dur
      idx[#idx+1] = #frames - 1; ds[#ds+1] = P.dur
    end
    tags[#tags+1] = {a.name, from, #frames}
    manifest[#manifest+1] = string.format('"%s": { "frames": [%s], "durations": [%s], "loop": %s }',
      a.name, table.concat(idx, ", "), table.concat(ds, ", "), a.name == "idle" and "true" or "false")
  end
  saveSheet(dir .. "/cripta/" .. name .. ".aseprite", size, size, frames, durs, tags, {flip=true})
  local fh = io.open(dir .. "/cripta/" .. name .. ".anims.json", "w")
  fh:write("{ " .. table.concat(manifest, ", ") .. " }")
  fh:close()
end

-- pseudoazar fijo (las texturas salen iguales cada vez)
local seed = 4242
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

-- =====================================================================================
-- Tileset (32x32 cada uno). Se arma en una sola imagen de 8 columnas.
-- =====================================================================================
local TILES = {}
local function tile(nombre, colision, encima, draw)
  local G = newGrid(32, 32, 31)
  draw(G)
  TILES[#TILES+1] = {nombre=nombre, colision=colision, encima=encima, G=G}
end

-- losas: 4 piezas desparejas con junta oscura, luz arriba a la izquierda
local function losas(G, base, var)
  G.rect(0,0,31,31,base)
  local rows = {{0,15,{0,13,31}},{16,31,{0,18,31}}}
  if var == 1 then rows = {{0,10,{0,20,31}},{11,22,{0,9,31}},{23,31,{0,15,31}}} end
  for _,r in ipairs(rows) do
    local y0, y1, xs = r[1], r[2], r[3]
    for i=1,#xs-1 do
      local x0, x1 = xs[i], xs[i+1]
      G.line(x0, y0, x1, y0, "p1")
      G.line(x0, y0, x0, y1, "p1")
      G.line(x1, y0, x1, y1, "p4")
      G.line(x0, y1, x1, y1, "p4")
    end
    G.line(0, y1, 31, y1, "p5")
  end
  for _=1,10 do G.px(math.floor(rnd()*30)+1, math.floor(rnd()*30)+1, "p3") end
end

tile("suelo", false, false, function(G) losas(G, "p2", 0) end)
tile("suelo_b", false, false, function(G)
  losas(G, "p2", 1)
  G.line(6,4,11,11,"p5"); G.line(11,11,9,17,"p5"); G.line(11,11,17,13,"p5"); G.line(9,17,13,24,"p5")
end)
tile("suelo_musgo", false, false, function(G)
  losas(G, "p2", 0)
  for _,m in ipairs({{3,14},{6,16},{4,17},{20,30},{23,29},{26,31},{14,15},{16,16},{29,2},{28,4}}) do
    G.px(m[1], m[2], "m2"); G.px(m[1]+1, m[2], "m1")
  end
end)
tile("suelo_huesos", false, false, function(G)
  losas(G, "p2", 1)
  G.thick(5,22,13,19,2,"t"); G.line(5,21,13,18,"T"); G.ellipse(5,22,2,2,"T"); G.ellipse(13,19,2,2,"T")
  G.ellipse(22,9,3,3,"T"); G.rect(20,11,24,12,"t"); G.px(21,9,"p5"); G.px(23,9,"p5")
  G.line(18,26,25,27,"t")
end)
tile("alfombra", false, false, function(G)
  losas(G, "p2", 0)
  G.rect(4,0,27,31,"r"); G.rect(6,0,25,31,"R")
  G.line(4,0,4,31,"y"); G.line(27,0,27,31,"y"); G.line(7,0,7,31,"Y"); G.line(24,0,24,31,"Y")
  for y=3,31,8 do G.px(15,y,"Y"); G.px(16,y,"Y"); G.px(15,y+1,"y"); G.px(16,y+1,"y"); G.px(14,y+1,"y"); G.px(17,y+1,"y") end
end)
tile("estrado", false, false, function(G)
  G.rect(0,0,31,31,"p1")
  G.line(0,0,31,0,"W"); G.line(0,31,31,31,"p3"); G.line(31,0,31,31,"p3")
  for _=1,14 do G.px(math.floor(rnd()*30)+1, math.floor(rnd()*30)+1, "p2") end
  G.rect(15,15,16,16,"p2")
end)
tile("techo", true, false, function(G)
  G.rect(0,0,31,31,"p6")
  for _=1,18 do local x, y = math.floor(rnd()*31), math.floor(rnd()*31); G.px(x, y, "p5") end
end)
-- cara de la pared: ladrillos en hileras desplazadas, borde superior de piedra y zócalo
local function ladrillos(G)
  G.rect(0,0,31,31,"p3")
  G.rect(0,0,31,3,"p5"); G.line(0,4,31,4,"p1")
  for row=0,4 do
    local y0 = 5 + row*5
    G.line(0, y0+4, 31, y0+4, "p5")
    local off = (row % 2 == 0) and 0 or 8
    for x=off,31,16 do G.line(x, y0, x, y0+3, "p5") end
    for x=off+1,31,16 do G.line(x, y0, math.min(31, x+13), y0, "p2") end
  end
  G.rect(0,29,31,31,"p4")
end
tile("pared", true, false, ladrillos)
tile("pared_b", true, false, function(G)
  ladrillos(G)
  G.line(20,6,23,13,"p6"); G.line(23,13,21,19,"p6"); G.line(23,13,27,16,"p6")
  G.px(6,24,"m2"); G.px(7,24,"m1"); G.px(8,25,"m2"); G.px(5,25,"m1")
end)
tile("pared_antorcha", true, false, function(G)
  ladrillos(G)
  G.rect(14,16,17,19,"B"); G.rect(13,19,18,20,"b"); G.line(15,21,16,24,"b")
  G.ellipse(15.5,12,3,4,"f"); G.ellipse(15.5,13,2,2,"F"); G.px(15,8,"f"); G.px(16,7,"F")
end)
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"p5")
  for i=0,5 do
    local y = 26 - i*5
    local inset = i
    G.rect(inset, y, 31-inset, y+4, i % 2 == 0 and "p2" or "p3")
    G.line(inset, y, 31-inset, y, "p1")
    G.line(inset, y+4, 31-inset, y+4, "p5")
  end
  G.rect(0,0,2,31,"p4"); G.rect(29,0,31,31,"p4")
end)
-- columna de 2 casillas: capitel arriba (encima) y fuste con base abajo (choca)
tile("columna_0_0", false, true, function(G)
  G.rect(10,14,21,31,"p2"); G.line(10,14,10,31,"p1"); G.line(21,14,21,31,"p4")
  G.line(14,16,14,31,"p3"); G.line(17,16,17,31,"p3")
  G.rect(6,8,25,13,"p1"); G.line(6,13,25,13,"p3"); G.rect(8,5,23,7,"p2")
end)
tile("columna_1_0", true, false, function(G)
  G.rect(10,0,21,24,"p2"); G.line(10,0,10,24,"p1"); G.line(21,0,21,24,"p4")
  G.line(14,0,14,24,"p3"); G.line(17,0,17,24,"p3")
  G.rect(7,24,24,28,"p1"); G.line(7,28,24,28,"p4"); G.rect(6,29,25,30,"p3")
  G.px(12,10,"m2"); G.px(13,11,"m1")
end)
-- sarcófago horizontal de 2 casillas
tile("sarcofago_0_0", true, false, function(G)
  G.rect(4,8,31,27,"p3"); G.rect(4,6,31,24,"p1"); G.line(4,6,31,6,"W"); G.line(4,6,4,24,"W")
  G.rect(4,25,31,27,"p4")
  G.ellipse(14,15,4,4,"p2"); G.ring(14,15,4,4,"p3"); G.rect(13,19,15,22,"p2")
  G.line(9,15,6,15,"p2")
end)
tile("sarcofago_0_1", true, false, function(G)
  G.rect(0,8,27,27,"p3"); G.rect(0,6,27,24,"p1"); G.line(0,6,27,6,"W"); G.line(27,6,27,24,"p3")
  G.rect(0,25,27,27,"p4")
  G.rect(4,13,18,16,"p2"); G.line(4,13,18,13,"p3")
  G.line(10,9,10,21,"y"); G.line(7,12,13,12,"y")
end)
tile("urna", true, false, function(G)
  G.ellipse(16,20,7,8,"o"); G.ellipse(15,18,5,5,"B"); G.rect(12,9,19,12,"o"); G.rect(11,8,20,9,"oo")
  G.line(9,20,23,20,"oo"); G.px(13,16,"Y"); G.px(14,15,"Y"); G.rect(13,27,18,28,"oo")
end)
tile("pila_huesos", true, false, function(G)
  G.ellipse(16,24,11,5,"t")
  G.ellipse(16,22,9,4,"T")
  G.ellipse(12,17,4,4,"T"); G.px(11,17,"p5"); G.px(13,17,"p5"); G.rect(10,20,14,20,"t")
  G.ellipse(21,18,3,3,"T"); G.px(20,18,"p5"); G.px(22,18,"p5")
  G.thick(5,25,26,21,2,"T"); G.line(8,27,24,25,"t")
end)
tile("telarana", false, true, function(G)
  for i=0,4 do G.line(0, 0, 14 - i*3, 2 + i*4, "W") end
  for r=4,12,4 do
    local pts = {}
    for i=0,4 do local a = math.rad(8 + i*18); pts[#pts+1] = {r*1.2*math.cos(a), r*1.2*math.sin(a)} end
    for i=1,#pts-1 do G.line(pts[i][1], pts[i][2], pts[i+1][1], pts[i+1][2], "W") end
  end
end)
tile("grieta", false, false, function(G)
  losas(G, "p2", 1)
  G.line(2,20,10,16,"p6"); G.line(10,16,16,18,"p6"); G.line(16,18,24,12,"p6"); G.line(24,12,30,13,"p6")
  G.line(10,17,16,19,"p5"); G.line(16,19,24,13,"p5")
end)
tile("sombra", false, false, function(G)
  losas(G, "p2", 0)
  for y=0,7 do for x=0,31 do if (x + y) % 2 == 0 or y < 3 then G.px(x, y, y < 3 and "p5" or "p4") end end end
end)
tile("runa", false, false, function(G)
  losas(G, "p2", 0)
  G.ring(16,16,12,12,"cc"); G.ring(16,16,11,11,"c")
  G.line(16,6,16,26,"c"); G.line(8,20,24,20,"c"); G.line(10,10,22,10,"cc")
  G.px(16,16,"C"); G.px(16,6,"C"); G.px(16,26,"C")
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
  spr:saveAs(dir .. "/cripta/tileset_cripta.aseprite")
  spr:saveCopyAs(dir .. "/cripta/tileset_cripta.png")
  spr:close()
  local fh = io.open(dir .. "/cripta/tileset_cripta.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Brasero de control (32x32): 0 apagado, 1-4 encendido
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32, 31)
    G.rect(13,20,18,28,"p2"); G.line(13,20,13,28,"p1"); G.line(18,20,18,28,"p4")
    G.rect(10,28,21,30,"p3"); G.line(10,28,21,28,"p1")
    G.ellipse(15.5,18,9,4,"p3"); G.ellipse(15.5,17,9,3,"p1"); G.ellipse(15.5,17,7,2,"p5")
    G.px(7,17,"y"); G.px(24,17,"y")
    if i == 0 then
      G.px(13,16,"p3"); G.px(15,16,"p4"); G.px(18,16,"p3"); G.px(16,15,"tt")
    else
      local s = i % 2
      G.ellipse(15.5,12,5,6 + s,"ff"); G.ellipse(15.5,13,4,4,"f"); G.ellipse(15.5,14,2,2 + s,"F")
      G.px(13 + s,6 - s,"f"); G.px(18 - s,5 + s,"f"); G.px(15 + (i % 3) - 1, 3,"F")
      G.ellipse(15.5,17,6,1,"F")
    end
    frames[#frames+1] = G; durs[#durs+1] = 140
  end
  saveSheet(dir .. "/cripta/brasero.aseprite", 32, 32, frames, durs, {{"apagado",1,1},{"encendido",2,5}})
end

-- =====================================================================================
-- Puerta del Vigía (128x64): 0-1 sellada (la runa late), 2 abierta
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64, 63)
    -- marco de piedra con arco
    G.rect(0,8,127,63,"p3")
    G.rect(0,8,127,12,"p1"); G.line(0,13,127,13,"p5")
    G.rect(0,14,15,63,"p2"); G.rect(112,14,127,63,"p2")
    G.line(15,14,15,63,"p4"); G.line(112,14,112,63,"p1")
    G.ellipse(64,30,46,22,"p2"); G.ellipse(64,32,40,20,"p4")
    G.rect(24,32,104,63,"p4")
    -- calavera en la clave del arco
    G.ellipse(64,9,6,5,"T"); G.px(62,9,"K"); G.px(66,9,"K"); G.rect(62,13,66,14,"t")
    if i < 2 then
      -- hoja de la puerta: hierro con remaches y el sello de luz
      G.rect(26,30,102,63,"p5"); G.ellipse(64,32,37,18,"p5")
      for x=34,96,12 do G.line(x,22,x,63,"p6") end
      for y=36,60,12 do G.line(26,y,102,y,"p4") end
      local glow = i == 0 and "C" or "c"
      G.ring(64,40,13,13,"cc"); G.ring(64,40,12,12,glow); G.ring(64,40,7,7,glow)
      G.line(64,27,64,53,glow); G.line(51,40,77,40,glow)
      G.px(64,40,"Ch"); G.px(64,28,"Ch"); G.px(64,52,"Ch"); G.px(52,40,"Ch"); G.px(76,40,"Ch")
    else
      -- abierta: oscuridad y unas escaleras que bajan
      G.rect(28,32,100,63,"p6"); G.ellipse(64,32,35,16,"p6")
      for k=0,3 do G.rect(40 + k*3, 50 + k*3, 88 - k*3, 51 + k*3, "p4") end
    end
    -- antorchas a los lados
    for _,x in ipairs({7, 120}) do
      G.rect(x-1,30,x+1,34,"B"); G.ellipse(x,26,2,3,"f"); G.px(x,25,"F")
    end
    frames[#frames+1] = G
  end
  saveSheet(dir .. "/cripta/puerta_sello.aseprite", 128, 64, frames, {500, 500, 500}, {{"sellada",1,2},{"abierta",3,3}}, {outline=false})
end

-- =====================================================================================
-- Entrada de la cripta en las Ruinas del Vigía (64x64): arco caído y escaleras a la oscuridad
-- =====================================================================================
do
  local G = newGrid(64, 64, 63)
  G.ellipse(32,52,30,10,"p4")
  G.rect(8,22,17,58,"p2"); G.line(8,22,8,58,"p1"); G.line(17,22,17,58,"p4")
  G.rect(46,30,55,58,"p2"); G.line(46,30,46,58,"p1"); G.line(55,30,55,58,"p4")
  G.rect(6,18,22,23,"p1"); G.line(6,23,22,23,"p4")
  G.thick(22,20,40,15,4,"p1"); G.line(22,22,40,17,"p3")
  G.rect(44,26,57,30,"p1")
  G.rect(18,34,45,60,"p6")
  for k=0,4 do G.rect(19 + k, 40 + k*4, 44 - k, 41 + k*4, k % 2 == 0 and "p3" or "p4") end
  G.px(11,30,"m1"); G.px(12,31,"m2"); G.px(50,40,"m1"); G.px(49,41,"m2"); G.px(30,16,"m1")
  G.ellipse(31,38,3,2,"cc"); G.px(31,38,"c")
  saveSheet(dir .. "/cripta/entrada.aseprite", 64, 64, {G})
end

-- =====================================================================================
-- Centinela de Hueso (48x48, suelo en 45): esqueleto con lanza y escudo oxidado, ojos de luz.
-- Se dibuja mirando a la derecha.
-- =====================================================================================
local function centinela(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,43,14,2,"tt")
    G.thick(10,42,34,42,2,"T"); G.ellipse(36,41,4,3,"T"); G.px(35,41,"p5"); G.px(37,41,"p5")
    G.thick(6,44,40,40,1,"B"); G.ellipse(16,40,5,4,"o"); G.ellipse(16,40,3,2,"oo")
    return G
  end
  -- lanza detrás (en ataque se adelanta)
  local sx = P.thrust and 10 or 0
  G.line(30+dx+sx-8, 44+b-2, 40+dx+sx, 8+b+(P.thrust and 18 or 0), "B")
  local tipX, tipY = 40+dx+sx, 8+b+(P.thrust and 18 or 0)
  G.px(tipX, tipY-1, "a1"); G.px(tipX, tipY-2, "a1"); G.px(tipX+1, tipY-1, "a2"); G.px(tipX-1, tipY, "a2")
  -- piernas
  G.thick(20+dx, 33+b, 17+dx, 44, 2, "t"); G.thick(27+dx, 33+b, 29+dx, 44, 2, "t")
  G.rect(15+dx, 44, 19+dx, 45, "T"); G.rect(28+dx, 44, 32+dx, 45, "T")
  -- pelvis y costillas
  G.rect(19+dx, 31+b, 28+dx, 33+b, "t")
  G.line(23+dx, 22+b, 23+dx, 31+b, "T")
  for y=22,29,2 do G.line(19+dx, y+b, 28+dx, y+b, "T") end
  G.line(19+dx, 22+b, 19+dx, 29+b, "t"); G.line(28+dx, 22+b, 28+dx, 29+b, "t")
  -- hombreras oxidadas
  G.ellipse(18+dx, 21+b, 3, 2, "o"); G.ellipse(29+dx, 21+b, 3, 2, "o")
  -- brazo con la lanza
  G.thick(29+dx, 22+b, 33+dx+(P.thrust and 6 or 0), 29+b, 2, "T")
  -- cráneo con yelmo
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 14+hy, 6, 6, "T"); G.rect(20+hx, 18+hy, 28+hx, 20+hy, "T")
  G.ellipse(24+hx, 11+hy, 7, 4, "a3"); G.rect(17+hx, 11+hy, 31+hx, 12+hy, "a2"); G.px(24+hx, 6+hy, "R"); G.px(24+hx, 5+hy, "R")
  if P.pain then G.px(26+hx,15+hy,"K"); G.px(29+hx,15+hy,"K") else G.px(26+hx,15+hy,"C"); G.px(29+hx,15+hy,"C") end
  G.line(25+hx, 19+hy, 29+hx, 19+hy, "p5")
  -- escudo delante
  G.ellipse(16+dx, 28+b, 6, 8, "oo"); G.ellipse(16+dx, 28+b, 5, 7, "o"); G.line(16+dx, 21+b, 16+dx, 35+b, "oo")
  G.px(14+dx, 25+b, "Y"); G.px(18+dx, 31+b, "Y")
  return G
end
saveMonster("centinela", 48, centinela, {
  {name="idle",   poses={{bob=0,dur=450},{bob=1,dur=450}}},
  {name="attack", poses={{bob=1,hx=-1,dur=200},{dx=3,thrust=true,dur=140},{dx=1,dur=220}}},
  {name="hurt",   poses={{dx=-2,hy=-1,pain=true,dur=250}}},
  {name="die",    poses={{bob=3,pain=true,dur=200},{dead=true,dur=1000}}},
})

-- =====================================================================================
-- Espectro de la Cripta (48x48): alma encapuchada que flota con un farol de luz fría
-- =====================================================================================
local function espectro(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(24,43,12,2,"v3"); G.ellipse(24,42,8,1,"v2")
    for _,m in ipairs({{14,30},{20,24},{30,20},{34,32},{24,14}}) do G.px(m[1], m[2], "v1") end
    G.ellipse(35,42,2,2,"c")
    return G
  end
  local w = P.wave or 0
  -- túnica en jirones
  G.ellipse(23+dx, 26+b, 10, 12, "v3"); G.ellipse(22+dx, 24+b, 9, 10, "v2")
  for i=0,4 do
    local x = 15 + i*4 + dx
    local len = 36 + ((i + w) % 2) * 3 + b
    G.thick(x, 30+b, x - 1 + ((i + w) % 3) - 1, len, 3, i % 2 == 0 and "v3" or "v2")
  end
 
  -- capucha
  G.ellipse(25+dx, 14+b, 8, 8, "v3"); G.ellipse(25+dx, 13+b, 7, 7, "v2"); G.ellipse(27+dx, 15+b, 5, 5, "v4")
  if P.pain then G.px(27+dx,15+b,"v1"); G.px(30+dx,15+b,"v1") else G.px(27+dx,15+b,"C"); G.px(30+dx,15+b,"C"); G.px(28+dx,15+b,"c") end
  -- brazo y farol
  local ax, ay = 34+dx+(P.lunge and 6 or 0), 26+b-(P.lunge and 4 or 0)
  G.thick(28+dx, 22+b, ax, ay, 2, "v2"); G.rect(ax-1, ay-1, ax+1, ay, "v1")
  G.line(ax, ay+1, ax, ay+3, "a3")
  G.rect(ax-2, ay+4, ax+2, ay+9, "a3"); G.rect(ax-1, ay+5, ax+1, ay+8, P.lunge and "Ch" or "C")
  G.line(ax-2, ay+10, ax+2, ay+10, "a4")
  -- motas
  for k,m in ipairs({{8,12},{12,6},{38,8},{6,26},{40,18}}) do if (k + (P.phase or 0)) % 2 == 0 then G.px(m[1]+dx, m[2]+b, "v1") end end
  return G
end
saveMonster("espectro", 48, espectro, {
  {name="idle",   poses={{bob=0,wave=0,phase=0,dur=380},{bob=-1,wave=1,phase=1,dur=380}}},
  {name="attack", poses={{bob=-2,dur=200},{dx=4,lunge=true,wave=1,dur=160},{dx=1,dur=220}}},
  {name="hurt",   poses={{dx=-3,pain=true,dur=250}}},
  {name="die",    poses={{bob=2,pain=true,dur=220},{dead=true,dur=1000}}},
})

-- =====================================================================================
-- El Vigía Caído (64x64, suelo en 61): guardián gigante en armadura, con un faro encendido en
-- el pecho y una alabarda. Mira a la derecha.
-- =====================================================================================
local function vigia(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local beam = P.beam
  if P.dead then
    G.ellipse(32,58,24,4,"a4"); G.ellipse(30,56,18,4,"a3");
    G.ellipse(48,55,6,4,"a2"); G.px(50,55,"K")
    G.thick(4,59,58,53,2,"B"); G.rect(54,50,58,55,"a1")
    G.ellipse(30,55,3,2,"cc")
    return G
  end
  -- capa raída detrás
  G.ellipse(26+dx, 38+b, 14, 18, "r"); G.thick(14+dx, 40+b, 10+dx, 58, 6, "r"); G.thick(22+dx, 44+b, 22+dx, 59, 5, "r")
  G.px(10+dx, 58, "K"); G.px(13+dx, 59, "K")
  -- alabarda detrás del cuerpo
  local hx = P.swing and 14 or 0
  G.line(44+dx+hx-16, 60, 48+dx+hx, 6+b+(P.swing and 14 or 0), "B")
  local ax, ay = 48+dx+hx, 6+b+(P.swing and 14 or 0)
  G.ellipse(ax+3, ay+4, 4, 5, "a1"); G.ellipse(ax+4, ay+4, 2, 4, "a2"); G.px(ax, ay-3, "a1"); G.px(ax, ay-4, "a1")
  -- piernas con grebas
  G.thick(24+dx, 44+b, 22+dx, 59, 6, "a3"); G.thick(36+dx, 44+b, 39+dx, 59, 6, "a3")
  G.rect(18+dx, 59, 27+dx, 61, "a4"); G.rect(35+dx, 59, 44+dx, 61, "a4")
  G.line(21+dx, 50, 21+dx, 58, "a2"); G.line(37+dx, 50, 38+dx, 58, "a2")
  -- torso
  G.rect(19+dx, 24+b, 42+dx, 46+b, "a3"); G.rect(20+dx, 24+b, 41+dx, 44+b, "a2")
  G.line(20+dx, 24+b, 41+dx, 24+b, "a1"); G.rect(19+dx, 44+b, 42+dx, 46+b, "a4")
  -- faro en el pecho
  local lc = beam and "Ch" or "C"
  G.ellipse(31+dx, 34+b, 6, 6, "a4"); G.ellipse(31+dx, 34+b, 5, 5, "cc"); G.ellipse(31+dx, 34+b, 3, 3, lc); G.px(31+dx, 34+b, "Ch")
  if beam then for k=0,10 do G.px(37+dx+k*2, 34+b, "Ch"); G.px(37+dx+k*2, 33+b, "C"); G.px(37+dx+k*2, 35+b, "C") end end
  -- hombreras
  G.ellipse(18+dx, 25+b, 6, 5, "a1"); G.ellipse(18+dx, 26+b, 5, 3, "a2")
  G.ellipse(43+dx, 25+b, 6, 5, "a1"); G.ellipse(43+dx, 26+b, 5, 3, "a2")
  -- brazo que sujeta el arma
  G.thick(44+dx, 28+b, 46+dx+(P.swing and 8 or 0), 38+b, 4, "a3")
  G.rect(44+dx+(P.swing and 8 or 0), 37+b, 49+dx+(P.swing and 8 or 0), 41+b, "a2")
  -- yelmo con visera y penacho
  local hhx, hhy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hhx, 16+hhy, 8, 8, "a2"); G.ellipse(30+hhx, 15+hhy, 7, 7, "a1")
  G.rect(24+hhx, 16+hhy, 38+hhx, 19+hhy, "a3"); G.rect(27+hhx, 17+hhy, 38+hhx, 18+hhy, "p6")
  if P.pain then G.px(33+hhx,17+hhy,"a1"); G.px(36+hhx,17+hhy,"a1")
  else G.px(33+hhx,17+hhy,"C"); G.px(36+hhx,17+hhy,"C"); G.px(34+hhx,17+hhy,"c") end
  G.thick(31+hhx, 8+hhy, 22+hhx, 4+hhy, 2, "R"); G.px(20+hhx, 5+hhy, "R"); G.px(21+hhx, 3+hhy, "r")
  return G
end
saveMonster("vigia", 64, vigia, {
  {name="idle",   poses={{bob=0,dur=520},{bob=1,dur=520}}},
  {name="attack", poses={{bob=1,hx=-2,beam=true,dur=280},{dx=4,swing=true,beam=true,dur=160},{dx=2,dur=300}}},
  {name="hurt",   poses={{dx=-2,hy=-1,pain=true,dur=300}}},
  {name="die",    poses={{bob=3,pain=true,dur=300},{dead=true,dur=1200}}},
})
