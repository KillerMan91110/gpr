-- El Arrecife Hundido (mazmorra bajo el Arrecife Blanco, en las Costas Muertas): la ciudad de coral de
-- los tritones, ahora en manos de los Ocultos. Mismo estilo que crear_fisura.lua:
--   arrecife/tileset_arrecife  tileset propio de 32x32 (arena del fondo, paredes de coral, agua honda,
--                              pasarelas de nácar, columnas, estatuas de tritones…) + su .json
--   arrecife/caracola          caracola de control sobre su pedestal (callada / soplada, 32x32)
--   arrecife/compuerta_coral   la compuerta del Salón del Trono (sellada con el eclipse / abierta, 128x64)
-- Además exporta los PNG que usa el juego (parámetro png=public/assets/mundo):
--   tileset_arrecife.png, mazmorra/caracola.png (tira 5x32), mazmorra/compuerta_coral.png (tira 3x128)
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_arrecife.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- arena del fondo (azulada por el agua)
  {"a1","9cc4ba"},{"a2","7eaaa2"},{"a3","62908c"},{"a4","4a7476"},
  -- coral de las paredes (de claro a oscuro)
  {"c1","f2a49a"},{"c2","d27a72"},{"c3","a85660"},{"c4","7a3c4e"},{"c5","4e2638"},{"c6","2c1626"},
  -- coral blanco de las columnas
  {"cb1","f6eee4"},{"cb2","dccabc"},{"cb3","b0a092"},
  -- agua honda (brilla un poco)
  {"w1","8ae0ec"},{"w2","4ab4d0"},{"w3","2a82aa"},{"w4","1c5a84"},{"w5","123c5e"},
  -- nácar de las pasarelas y del trono
  {"n1","f6f2ff"},{"n2","d6cef2"},{"n3","aaa0d4"},{"n4","7c72a8"},
  -- algas y anémonas
  {"g1","8adc96"},{"g2","52a46a"},{"g3","2e7050"},{"an1","ffb0d8"},{"an2","e070b0"},{"an3","ffe8f4"},
  -- oro de los tritones
  {"o1","ffe08a"},{"o2","e0a840"},{"o3","a07024"},
  -- piedra gris de las estatuas
  {"p1","a8b2c0"},{"p2","828ca0"},{"p3","5e687c"},{"p4","404858"},
  -- hierro oxidado (anclas)
  {"m1","9a8478"},{"m2","6e5a52"},{"m3","4a3a36"},
  -- eclipse
  {"e1","d8a0ff"},{"e2","8a4ad8"},{"e3","4e2490"},
  -- burbujas
  {"bu","dcfaff"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end
-- colores que brillan: no reciben contorno
local GLOW = {K=true, w1=true, e1=true, bu=true, an3=true, o1=true}

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
          if n and not GLOW[n] then out[y*W+x] = true break end
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
  spr:saveAs(dir .. "/arrecife/" .. name .. ".aseprite")
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
local seed = 7307
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

-- arena del fondo con ondas que dejó la corriente y conchitas
local function arena(G, base)
  G.rect(0,0,31,31,base or "a2")
  for y=3,31,7 do for x=0,31 do if (x + y) % 9 < 5 then G.px(x, y + math.floor(math.sin(x * 0.4) * 1.2), "a3") end end end
  for _=1,14 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), rnd() < 0.5 and "a1" or "a3") end
end
-- agua honda con reflejos que se mueven
local function agua(G)
  G.rect(0,0,31,31,"w4")
  for _=1,6 do G.ellipse(rnd()*31, rnd()*31, 4 + rnd()*4, 1 + rnd()*1.5, "w3") end
  for _=1,5 do local x, y = math.floor(rnd()*28), math.floor(rnd()*30); G.line(x, y, x + 3, y, "w2") end
  for _=1,3 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w1") end
  for _=1,4 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w5") end
end

tile("suelo", false, false, function(G) arena(G) end)
tile("suelo_coral", false, false, function(G)
  arena(G)
  for _,p in ipairs({{6,8},{22,6},{12,22},{26,24},{4,27}}) do
    G.rect(p[1], p[2], p[1]+2, p[2]+1, "c2"); G.px(p[1]+1, p[2]-1, "c1"); G.px(p[1]+3, p[2]+1, "c3")
  end
  G.ellipse(18,15,2,1,"cb1"); G.px(17,15,"cb3")
end)
tile("suelo_alga", false, false, function(G)
  arena(G)
  for _,x in ipairs({5, 11, 19, 26}) do
    local h = 8 + math.floor(rnd() * 8)
    for y=0,h do G.px(x + math.floor(math.sin(y * 0.6 + x) * 1.5), 30 - y, (y % 3 == 0) and "g1" or "g2") end
  end
end)
tile("sombra", false, false, function(G)
  arena(G)
  for y=0,7 do for x=0,31 do if (x + y) % 2 == 0 or y < 3 then G.px(x, y, y < 3 and "a4" or "a3") end end end
end)
tile("techo", true, false, function(G)
  G.rect(0,0,31,31,"c6")
  for _=1,12 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "c5") end
  G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w4")
end)
-- cara de la pared: coral apilado en bultos redondos, con poros, y el borde de arriba oscuro
local function pared(G)
  G.rect(0,0,31,31,"c4")
  G.rect(0,0,31,3,"c6"); G.line(0,4,31,4,"c3")
  for _,b in ipairs({{5,10,6,5},{17,9,7,5},{28,11,5,5},{9,20,7,6},{23,21,7,6},{2,27,5,4},{16,28,6,4},{30,27,4,4}}) do
    G.ellipse(b[1], b[2], b[3], b[4], "c3"); G.ellipse(b[1]-1, b[2]-1, b[3]-2, b[4]-2, "c2")
    G.px(b[1]+1, b[2], "c4"); G.px(b[1]-2, b[2]+1, "c4"); G.px(b[1]-2, b[2]-2, "c1")
  end
  G.rect(0,30,31,31,"c5")
end
tile("pared", true, false, pared)
-- anémona que brilla en la pared (hace de antorcha)
tile("pared_anemona", true, false, function(G)
  pared(G)
  G.ellipse(16,18,6,4,"c5"); G.ellipse(16,17,5,3,"an2")
  for i=0,6 do local a = math.rad(200 + i * 23); G.line(16, 15, 16 + math.cos(a) * 8, 15 + math.sin(a) * 7, i % 2 == 0 and "an1" or "an2"); G.px(16 + math.cos(a) * 8, 15 + math.sin(a) * 7, "an3") end
  G.ellipse(16,15,2,2,"an3")
end)
tile("pared_concha", true, false, function(G)
  pared(G)
  -- una concha grande incrustada, abierta en abanico
  G.ellipse(16,18,8,6,"cb2"); for i=-3,3 do G.line(16, 23, 16 + i * 2.6, 13, "cb3") end
  G.ellipse(16,18,7,5,"cb1"); for i=-3,3 do G.line(16, 23, 16 + i * 2.3, 14, "cb2") end
  G.rect(13,23,19,24,"cb3")
end)
tile("pared_eclipse", true, false, function(G)
  pared(G)
  -- un cristal de eclipse clavado en el coral, con grietas moradas
  G.line(16,9,16,24,"e3"); G.line(12,13,20,20,"e3")
  G.line(16,10,13,15,"e2"); G.line(13,15,16,22,"e2"); G.line(16,22,19,15,"e2"); G.line(19,15,16,10,"e2")
  G.rect(15,14,17,17,"e1"); G.px(16,12,"e1")
  G.line(8,24,12,20,"e3"); G.line(24,8,20,12,"e3")
end)
tile("agua", true, false, function(G) agua(G) end)
-- agua con orilla de arena arriba (cuando hay suelo encima)
tile("agua_borde", true, false, function(G)
  agua(G)
  G.rect(0,0,31,5,"a2"); G.line(0,0,31,0,"a1")
  for x=0,31 do if (x * 7) % 5 < 3 then G.px(x, 6, "a3") end end
  for x=0,31,3 do G.px(x, 7, "w1") end
end)
-- pasarela de nácar sobre el agua (3 casillas de ancho): borde de arriba, centro y borde de abajo
local function nacar(G)
  G.rect(0,0,31,31,"n2")
  for x=0,31,8 do G.line(x,0,x,31,"n3") end
  for _,p in ipairs({{4,6},{12,20},{20,9},{27,25},{6,26}}) do G.ellipse(p[1], p[2], 2, 1, "n1"); G.px(p[1]+1, p[2]+1, "n3") end
end
tile("pasarela_n", false, false, function(G)
  agua(G); nacar(G); G.rect(0,0,31,5,"w3")
  G.rect(0,4,31,6,"cb2"); G.line(0,4,31,4,"cb1"); for x=3,31,7 do G.ellipse(x, 5, 1.5, 1.5, "c2") end
end)
tile("pasarela_c", false, false, function(G) nacar(G) end)
tile("pasarela_s", false, false, function(G)
  agua(G); nacar(G); G.rect(0,26,31,31,"w3")
  G.rect(0,24,31,26,"cb2"); G.line(0,24,31,24,"cb1"); for x=3,31,7 do G.ellipse(x, 25, 1.5, 1.5, "c2") end
  for y=27,31 do for x=0,31 do if (x + y * 3) % 7 < 2 then G.px(x, y, "w2") end end end
end)
-- escalones de coral blanco
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"c5")
  for i=0,5 do
    local y = 26 - i*5
    G.rect(i, y, 31-i, y+4, i % 2 == 0 and "cb2" or "cb3")
    G.line(i, y, 31-i, y, "cb1")
    G.line(i, y+4, 31-i, y+4, "c5")
  end
  G.rect(0,0,2,31,"c4"); G.rect(29,0,31,31,"c4")
end)
-- el piso del Salón del Trono: mosaico de nácar con el tridente de los reyes en oro
tile("piso_trono", false, false, function(G)
  G.rect(0,0,31,31,"n3")
  for y=0,31,8 do for x=0,31,8 do G.rect(x+1, y+1, x+6, y+6, ((x + y) // 8) % 2 == 0 and "n2" or "n1") end end
  G.line(16,6,16,26,"o2"); G.line(10,10,10,14,"o2"); G.line(22,10,22,14,"o2"); G.line(10,14,22,14,"o2")
  G.px(16,5,"o1"); G.px(10,9,"o1"); G.px(22,9,"o1")
end)
-- canal de agua corriente con rejilla de coral (se puede pisar)
tile("canal", false, false, function(G)
  arena(G)
  G.rect(0,11,31,20,"c4"); G.rect(0,12,31,19,"w3"); G.rect(0,14,31,17,"w2"); G.line(0,15,31,15,"w1")
  for x=1,31,4 do G.line(x,11,x,20,"cb3") end
  G.line(0,11,31,11,"cb2"); G.line(0,20,31,20,"c5")
end)
-- columna de coral blanco con algas enroscadas (choca)
tile("columna", true, false, function(G)
  G.ellipse(16,28,9,3,"a4")
  G.rect(10,4,22,27,"cb2"); G.rect(10,4,12,27,"cb1"); G.rect(20,4,22,27,"cb3")
  G.rect(8,2,24,5,"cb1"); G.rect(8,25,24,28,"cb3")
  for y=6,24,3 do G.px(13 + (y % 6), y, "cb3") end
  for y=7,24 do G.px(16 + math.floor(math.sin(y * 0.5) * 6), y, "g2") end
end)
-- almeja gigante con una perla (choca)
tile("almeja", true, false, function(G)
  G.ellipse(16,27,12,3,"a4")
  G.ellipse(16,22,12,6,"p3"); for i=-4,4 do G.line(16, 27, 16 + i * 2.8, 17, "p4") end
  G.ellipse(16,14,11,6,"p2"); for i=-4,4 do G.line(16, 9, 16 + i * 2.5, 19, "p3") end
  G.ellipse(16,19,6,2,"an2"); G.ellipse(16,19,2,2,"n1"); G.px(15,18,"W")
end)
-- ancla vieja hundida en la arena (choca)
tile("ancla", true, false, function(G)
  G.ellipse(16,28,10,3,"a4")
  G.ring(16,6,3,3,"m2"); G.thick(16,9,16,26,3,"m2"); G.line(15,9,15,25,"m1")
  G.thick(10,13,22,13,2,"m2")
  for i=0,8 do local a = math.rad(200 + i * 17.5); G.px(16 + math.cos(a) * 10, 22 - math.sin(a) * 6, "m2"); G.px(16 + math.cos(a) * 10, 23 - math.sin(a) * 6, "m3") end
  G.px(6,20,"m1"); G.px(26,20,"m1"); G.px(17,18,"g2"); G.px(15,22,"g2")
end)
-- ánfora de los tritones (choca)
tile("anfora", true, false, function(G)
  G.ellipse(16,28,7,2,"a4")
  G.ellipse(16,19,7,8,"c3"); G.ellipse(15,18,5,6,"c2"); G.rect(14,6,18,11,"c3"); G.rect(13,5,19,6,"c2")
  G.line(9,14,12,10,"c4"); G.line(23,14,20,10,"c4")
  G.line(10,20,22,20,"o2"); G.line(10,22,22,22,"o3")
end)
-- roca con algas largas (choca)
tile("roca_alga", true, false, function(G)
  G.ellipse(16,26,13,5,"a4")
  G.ellipse(16,21,12,7,"p3"); G.ellipse(14,19,8,5,"p2"); G.px(10,17,"p1")
  for _,x in ipairs({8,13,19,24}) do for y=0,10 do G.px(x + math.floor(math.sin(y * 0.7 + x) * 1.5), 16 - y, (y % 3 == 0) and "g1" or "g2") end end
end)
-- racimo de cristales de eclipse que los Ocultos plantaron en el coral (choca)
tile("cristal", true, false, function(G)
  G.ellipse(16,27,10,3,"a4"); G.ellipse(16,25,8,3,"c4")
  for _,s in ipairs({{12,25,3,12},{17,25,4,17},{22,25,3,10}}) do
    local x, y, w, h = s[1], s[2], s[3], s[4]
    for i=0,h do local ww = math.floor(w * (1 - i / h)); G.rect(x - ww, y - i, x + ww, y - i, i < h * 0.4 and "e3" or "e2") end
    G.line(x, y - 1, x, y - h + 2, "e1")
  end
end)
-- estatua de un rey tritón con su tridente (2x2): de la cintura para arriba se ve sobre el héroe
local function estatua(G, cx, cy)
  -- pedestal
  G.rect(6 - cx, 52 - cy, 58 - cx, 61 - cy, "p3"); G.rect(6 - cx, 52 - cy, 58 - cx, 53 - cy, "p2"); G.line(6 - cx, 61 - cy, 58 - cx, 61 - cy, "p4")
  -- cola de pez enroscada y torso
  G.ellipse(32 - cx, 46 - cy, 14, 6, "p2"); G.ellipse(32 - cx, 45 - cy, 12, 4, "p1")
  G.ellipse(32 - cx, 30 - cy, 9, 12, "p2"); G.ellipse(30 - cx, 28 - cy, 6, 9, "p1")
  -- cabeza con corona
  G.ellipse(32 - cx, 13 - cy, 6, 6, "p2"); G.ellipse(31 - cx, 12 - cy, 4, 4, "p1")
  G.rect(26 - cx, 5 - cy, 38 - cx, 7 - cy, "o2"); for _,x in ipairs({27, 32, 37}) do G.line(x - cx, 5 - cy, x - cx, 2 - cy, "o2"); G.px(x - cx, 1 - cy, "o1") end
  -- aletas de las orejas
  G.line(25 - cx, 12 - cy, 22 - cx, 9 - cy, "p3"); G.line(39 - cx, 12 - cy, 42 - cx, 9 - cy, "p3")
  -- tridente
  G.thick(46 - cx, 4 - cy, 46 - cx, 50 - cy, 2, "o3"); G.line(40 - cx, 8 - cy, 52 - cx, 8 - cy, "o2")
  for _,x in ipairs({40, 46, 52}) do G.line(x - cx, 8 - cy, x - cx, 1 - cy, "o2"); G.px(x - cx, 0 - cy, "o1") end
  G.thick(40 - cx, 30 - cy, 46 - cx, 26 - cy, 3, "p2")
  -- algas que le crecen encima
  for y=34,50 do G.px(22 + math.floor(math.sin(y * 0.6) * 2) - cx, y - cy, "g2") end
end
tile("estatua_0_0", false, true, function(G) estatua(G, 0, 0) end)
tile("estatua_0_1", false, true, function(G) estatua(G, 32, 0) end)
tile("estatua_1_0", true, false, function(G) estatua(G, 0, 32) end)
tile("estatua_1_1", true, false, function(G) estatua(G, 32, 32) end)
-- el trono del rey (2x2): el respaldo de coral se ve sobre el héroe, el asiento choca
local function trono(G, cx, cy)
  G.rect(4 - cx, 50 - cy, 60 - cx, 61 - cy, "n3"); G.line(4 - cx, 50 - cy, 60 - cx, 50 - cy, "n1")
  -- respaldo en abanico de coral y nácar
  G.ellipse(32 - cx, 28 - cy, 26, 24, "c3"); G.ellipse(32 - cx, 28 - cy, 22, 20, "n2")
  for i=-4,4 do G.line(32 - cx, 48 - cy, 32 + i * 5 - cx, 8 - cy, "n3") end
  G.ellipse(32 - cx, 14 - cy, 5, 5, "o2"); G.ellipse(32 - cx, 14 - cy, 3, 3, "e2"); G.px(31 - cx, 13 - cy, "e1")
  -- asiento
  G.rect(14 - cx, 40 - cy, 50 - cx, 50 - cy, "c2"); G.rect(14 - cx, 40 - cy, 50 - cx, 42 - cy, "c1")
  G.rect(10 - cx, 34 - cy, 16 - cx, 50 - cy, "c3"); G.rect(48 - cx, 34 - cy, 54 - cx, 50 - cy, "c3")
end
tile("trono_0_0", false, true, function(G) trono(G, 0, 0) end)
tile("trono_0_1", false, true, function(G) trono(G, 32, 0) end)
tile("trono_1_0", true, false, function(G) trono(G, 0, 32) end)
tile("trono_1_1", true, false, function(G) trono(G, 32, 32) end)

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
  spr:saveAs(dir .. "/arrecife/tileset_arrecife.aseprite")
  if png then spr:saveCopyAs(png .. "/tileset_arrecife.png") end
  spr:close()
  local fh = io.open(dir .. "/tileset_arrecife.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Caracola de control (32x32): 0 callada sobre su pedestal; 1-4 soplada: brilla y suelta burbujas
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32)
    -- pedestal de coral blanco
    G.ellipse(16,29,10,2,"a4"); G.rect(10,22,22,28,"cb2"); G.rect(10,22,11,28,"cb1"); G.rect(21,22,22,28,"cb3"); G.rect(8,20,24,22,"cb1")
    -- la caracola en espiral
    local lit = i > 0
    G.ellipse(15,15,8,5,lit and "o1" or "o2"); G.ellipse(13,14,5,3,lit and "W" or "o1")
    G.ring(13,14,3,2,"o3"); G.px(13,14,"o3")
    G.line(22,13,26,10,"o2"); G.line(22,17,27,19,"o2"); G.line(26,10,27,19,"o3")
    G.ellipse(25,15,2,4,"an2")
    if lit then
      -- burbujas que suben y el canto que se ve como ondas
      local s = i % 2
      G.ellipse(27 - s, 8 - i, 1.5, 1.5, "bu"); G.ellipse(24 + s, 4 - (i % 3), 1, 1, "bu"); G.px(29, 12 - i, "bu")
      for a=-50,50,10 do
        local r1, r2 = 6 + s * 2, 9 + s * 2
        G.px(26 + r1 * math.cos(math.rad(a)) * 0.6, 15 + r1 * math.sin(math.rad(a)), "w1")
        G.px(26 + r2 * math.cos(math.rad(a)) * 0.6, 15 + r2 * math.sin(math.rad(a)), "w1")
      end
    end
    frames[#frames+1] = G; durs[#durs+1] = 180
  end
  saveSheet("caracola", 32, 32, frames, durs, {{"callada",1,1},{"soplada",2,5}})
end

-- =====================================================================================
-- Compuerta de coral del Salón del Trono (128x64): 0-1 sellada (el cristal de eclipse late), 2 abierta
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64)
    -- arco de coral
    G.rect(0,8,127,63,"c4")
    G.rect(0,8,127,13,"c3"); G.line(0,8,127,8,"c2"); G.line(0,13,127,13,"c6")
    G.rect(0,14,13,63,"c3"); G.rect(114,14,127,63,"c3"); G.line(13,14,13,63,"c6"); G.line(114,14,114,63,"c2")
    for _,b in ipairs({{6,20},{6,38},{6,54},{121,22},{121,40},{121,56},{30,10},{64,10},{98,10}}) do G.ellipse(b[1], b[2], 4, 3, "c2"); G.px(b[1]-1, b[2]-1, "c1") end
    G.rect(14,14,113,63,"c6")
    if i < 2 then
      -- dos hojas de coral blanco trenzado y el cristal de eclipse que las sella
      G.rect(16,14,63,63,"cb2"); G.rect(64,14,111,63,"cb2"); G.line(63,14,63,63,"cb3"); G.line(64,14,64,63,"cb1")
      for y=18,60,6 do for x=18,110,8 do G.ellipse(x + (y % 12 == 0 and 4 or 0), y, 2, 1.5, "cb3") end end
      G.rect(16,58,111,63,"c3"); G.line(16,58,111,58,"c2")
      local glow = i == 0 and "e1" or "e2"
      G.ellipse(64,34,12,14,"e3"); G.ellipse(64,34,9,11,glow); G.ellipse(64,34,5,7,"e2")
      G.line(64,20,64,48,"e3"); G.px(61,28,"W")
      -- grietas moradas que corren por el coral
      G.line(52,34,30,22,"e3"); G.line(76,34,98,46,"e3"); G.line(52,40,36,52,"e3"); G.line(76,28,94,18,"e3")
    else
      -- abierta: las hojas recogidas y el agua del salón que brilla al fondo
      G.rect(14,14,22,63,"cb2"); G.rect(105,14,113,63,"cb2")
      for k=0,3 do G.rect(36 + k*3, 50 + k*3, 92 - k*3, 51 + k*3, "c5") end
      G.ellipse(64,40,20,10,"w3"); G.ellipse(64,40,12,5,"w2")
    end
    -- anémonas a los lados
    for _,x in ipairs({6, 121}) do G.ellipse(x,30,3,2,"an2"); G.px(x-2,28,"an1"); G.px(x+2,28,"an1"); G.px(x,27,"an3") end
    frames[#frames+1] = G
  end
  saveSheet("compuerta_coral", 128, 64, frames, {500, 500, 500}, {{"sellada",1,2},{"abierta",3,3}}, {outline=false})
end
