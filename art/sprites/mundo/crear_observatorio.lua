-- El Observatorio Roto (mazmorra de las Ruinas Ancestrales): donde los aethrinos vigilaban al Devorador. El
-- gran telescopio se partió el día que el Devorador abrió un ojo. Mismo estilo y plano que crear_trono_huesos.lua:
--   observatorio/tileset_observatorio  tileset propio de 32x32 (baldosas de mármol con estrellas, paredes de
--                              piedra azul con mapas del cielo, el vacío estrellado que se ve por la cúpula
--                              rota, la pasarela de bronce, columnas, mesas de astrónomo, astrolabios, la
--                              lente del telescopio…) + su .json
--   observatorio/lampara_cristal  lámpara de control de cristal (apagada / encendida con luz celeste, 32x32)
--   observatorio/puerta_bronce  la puerta de la Gran Lente (sellada con el ojo / abierta, 128x64)
-- Además exporta los PNG que usa el juego (parámetro png=public/assets/mundo):
--   tileset_observatorio.png, mazmorra/lampara_cristal.png (tira 5x32), mazmorra/puerta_bronce.png (tira 3x128)
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_observatorio.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- baldosas de mármol del piso
  {"a1","e8e2d6"},{"a2","cfc7b6"},{"a3","a89f8c"},{"a4","7c7462"},
  -- piedra azul de las paredes (de clara a oscura)
  {"c1","7a7a9a"},{"c2","5c5c80"},{"c3","46466a"},{"c4","343456"},{"c5","242440"},{"c6","16162a"},
  -- bronce de las cúpulas y los instrumentos
  {"h1","e8d098"},{"h2","c0a060"},{"h3","8a7040"},{"h4","5a4828"},
  -- el vacío: el cielo roto que se ve por las grietas de la cúpula, con estrellas
  {"w1","fff8c0"},{"w2","a6e2f4"},{"w3","2e2a66"},{"w4","1e1a44"},{"w5","100e26"},
  -- luz celeste de las lámparas de cristal
  {"g1","e0f8ff"},{"g2","64bcde"},{"g3","3490be"},{"an1","ffffff"},
  -- oro
  {"o1","ffe08a"},{"o2","c89a2a"},{"o3","8a6a20"},
  -- mármol de las estatuas
  {"p1","f4f0e6"},{"p2","dfd8c8"},{"p3","c2b9a6"},{"p4","978e7c"},
  -- hierro viejo
  {"m1","8a8290"},{"m2","5e5866"},{"m3","3c3844"},
  -- el ojo del Devorador (eclipse)
  {"e1","e2a6ff"},{"e2","8a50d8"},{"e3","4e2490"},
  -- tinta, tapas de libros (azul) y el verdín del bronce
  {"b1","3a3644"},{"b2","26222e"},{"r1","3a5ea8"},{"r2","6a8ad8"},{"v1","7ae0c8"},{"v2","2e9c8a"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end
-- colores que brillan: no reciben contorno
local GLOW = {K=true, w1=true, e1=true, g1=true, an1=true, o1=true}

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
  spr:saveAs(dir .. "/observatorio/" .. name .. ".aseprite")
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
local seed = 9393
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end


-- una estrella chica de 4 puntas
local function estrella(G, x, y, c)
  G.px(x, y, c or "w1"); G.px(x - 1, y, "w2"); G.px(x + 1, y, "w2"); G.px(x, y - 1, "w2"); G.px(x, y + 1, "w2")
end

-- =====================================================================================
-- Tileset (32x32 cada uno). Se arma en una sola imagen de 8 columnas.
-- =====================================================================================
local TILES = {}
local function tile(nombre, colision, encima, draw)
  local G = newGrid(32, 32)
  draw(G)
  TILES[#TILES+1] = {nombre=nombre, colision=colision, encima=encima, G=G}
end

-- baldosas de mármol con juntas de bronce y, a veces, una estrella de oro incrustada
local function losa(G, base)
  G.rect(0,0,31,31,base or "a2")
  G.line(0,15,31,15,"a3"); G.line(15,0,15,31,"a3")
  G.line(1,1,13,1,"a1"); G.line(17,17,30,17,"a1"); G.line(1,17,13,17,"a1"); G.line(17,1,30,1,"a1")
  G.px(15,15,"h2")
  for _=1,8 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), rnd() < 0.5 and "a1" or "a3") end
end
-- el vacío: noche morada con estrellas, muy abajo (lo que se ve por la cúpula partida)
local function vacio(G)
  G.rect(0,0,31,31,"w4")
  for _=1,5 do G.ellipse(rnd()*31, rnd()*31, 4 + rnd()*5, 2 + rnd()*2, rnd() < 0.5 and "w3" or "w5") end
  for _=1,4 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w1") end
  for _=1,4 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w2") end
end

tile("suelo", false, false, function(G) losa(G) end)
-- baldosas con hojas de notas y pedacitos de lente regados
tile("suelo_huesos", false, false, function(G)
  losa(G)
  G.rect(4,6,11,11,"a1"); G.line(5,8,10,8,"b1"); G.line(5,10,9,10,"b1")
  G.line(20,20,25,18,"g2"); G.line(21,21,26,19,"g1"); G.px(23,22,"g2")
  estrella(G, 24, 7, "o1"); G.px(9, 25, "a4"); G.px(10, 26, "a4")
end)
tile("suelo_grieta", false, false, function(G)
  losa(G)
  G.line(4,6,12,14,"a4"); G.line(12,14,10,22,"a4"); G.line(12,14,22,18,"a4"); G.line(22,18,28,27,"a4")
  G.px(12,15,"w2"); G.px(22,19,"w1")
end)
tile("sombra", false, false, function(G)
  losa(G)
  for y=0,7 do for x=0,31 do if (x + y) % 2 == 0 or y < 3 then G.px(x, y, y < 3 and "a4" or "a3") end end end
end)
tile("techo", true, false, function(G)
  G.rect(0,0,31,31,"c6")
  for _=1,10 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "c5") end
  G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w2")
end)
-- cara de la pared: sillares de piedra azul con un friso de bronce
local function pared(G)
  G.rect(0,0,31,31,"c3")
  G.rect(0,0,31,3,"c6"); G.line(0,4,31,4,"c5")
  for _,r in ipairs({{0,6,15,13},{16,6,31,13},{0,14,9,21},{10,14,24,21},{25,14,31,21},{0,22,15,29},{16,22,31,29}}) do
    G.rect(r[1], r[2], r[3], r[4], "c2"); G.line(r[1], r[2], r[3], r[2], "c1"); G.line(r[1], r[4], r[3], r[4], "c4")
  end
  G.rect(0,5,31,6,"h3"); G.line(0,5,31,5,"h2")
  G.rect(0,30,31,31,"c5")
end
tile("pared", true, false, pared)
-- lámpara de cristal en la pared (hace de antorcha)
tile("pared_vela", true, false, function(G)
  pared(G)
  G.rect(13,20,19,22,"h3"); G.line(13,20,19,20,"h2"); G.line(16,22,16,25,"h4")
  G.ellipse(16,15,4,5,"g3"); G.ellipse(16,15,3,4,"g2"); G.ellipse(15,14,1.5,2,"an1")
  G.rect(14,9,18,10,"h2")
end)
-- un mapa del cielo colgado: pergamino azul con constelaciones
tile("pared_craneos", true, false, function(G)
  pared(G)
  G.rect(6,8,25,26,"r1"); G.rect(6,8,25,9,"h2"); G.rect(6,25,25,26,"h2")
  local st = {{9,22},{12,15},{16,18},{20,12},{23,19}}
  for i = 1, #st - 1 do G.line(st[i][1], st[i][2], st[i+1][1], st[i+1][2], "r2") end
  for _, p in ipairs(st) do G.px(p[1], p[2], "w1") end
end)
-- la pared partida: por la grieta se ve el cielo roto, con estrellas
tile("pared_eclipse", true, false, function(G)
  pared(G)
  G.ellipse(16,17,7,9,"w4"); G.ellipse(15,16,5,7,"w3")
  estrella(G, 14, 13); G.px(18, 20, "w1"); G.px(12, 21, "w2")
  G.line(9,10,16,8,"c5"); G.line(22,26,25,29,"c5")
end)
tile("abismo", true, false, function(G) vacio(G) end)
-- el vacío con el borde de las baldosas arriba (cuando hay suelo encima)
tile("abismo_borde", true, false, function(G)
  vacio(G)
  G.rect(0,0,31,5,"a3"); G.line(0,0,31,0,"a2")
  for x=0,31 do if (x * 7) % 5 < 3 then G.px(x, 6, "a4") end end
  for x=1,31,6 do G.line(x, 7, x, 8 + (x % 3), "c5") end
end)
-- pasarela de bronce sobre el vacío (3 casillas de ancho): borde de arriba, centro y borde de abajo
local function pasarela(G)
  G.rect(0,0,31,31,"h3")
  for y=0,31,8 do G.line(0, y, 31, y, "h4") end
  for x=0,31,8 do G.line(x, 0, x, 31, "h4") end
  for y=3,31,8 do for x=3,31,8 do G.px(x, y, "h2") end end
end
tile("puente_n", false, false, function(G)
  vacio(G); pasarela(G); G.rect(0,0,31,4,"w4")
  -- baranda de bronce con verdín
  G.rect(0,1,31,2,"h2"); for x=1,31,6 do G.rect(x, 2, x + 1, 6, "h2") end
  G.px(4,1,"v1"); G.px(20,2,"v2"); G.rect(0,5,31,6,"h4")
end)
tile("puente_c", false, false, function(G) pasarela(G) end)
tile("puente_s", false, false, function(G)
  vacio(G); pasarela(G); G.rect(0,27,31,31,"w4")
  G.rect(0,25,31,26,"h4"); G.rect(0,29,31,30,"h2"); for x=1,31,6 do G.rect(x, 25, x + 1, 29, "h2") end
  G.px(12,29,"v1")
end)
-- escalones de mármol con borde de bronce
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"c5")
  for i=0,5 do
    local y = 26 - i*5
    G.rect(i, y, 31-i, y+4, i % 2 == 0 and "a2" or "a3")
    G.line(i, y, 31-i, y, "h2")
    G.line(i, y+4, 31-i, y+4, "a4")
  end
  G.rect(0,0,2,31,"c4"); G.rect(29,0,31,31,"c4")
end)
-- el piso de la Gran Lente: un astrolabio gigante incrustado en oro
tile("piso_trono", false, false, function(G)
  G.rect(0,0,31,31,"w3")
  G.ellipse(16,16,15,15,"h3"); G.ellipse(16,16,13,13,"w4"); G.ellipse(16,16,9,9,"h4"); G.ellipse(16,16,8,8,"w3")
  for a=0,330,30 do G.px(16 + 14 * math.cos(math.rad(a)), 16 + 14 * math.sin(math.rad(a)), "o1") end
  G.line(4,16,28,16,"o2"); G.line(16,4,16,28,"o2"); G.ellipse(16,16,2,2,"o1")
  estrella(G, 10, 10); G.px(22,21,"w1")
end)
-- riel de bronce con luz de estrellas que corre adentro (se puede pisar)
tile("canal_almas", false, false, function(G)
  losa(G)
  G.rect(0,12,31,19,"h4"); G.rect(0,13,31,18,"w3"); G.rect(0,15,31,16,"g3"); G.line(0,15,31,15,"w2")
  for x=3,31,9 do G.px(x, 15, "w1") end
  G.line(0,12,31,12,"h2"); G.line(0,19,31,19,"h3")
end)
-- columna de mármol con anillos de bronce (choca)
tile("columna", true, false, function(G)
  G.ellipse(16,28,9,3,"a4")
  G.rect(10,4,22,27,"p2"); G.rect(10,4,12,27,"p1"); G.rect(20,4,22,27,"p3")
  for x=13,19,3 do G.line(x, 6, x, 25, "p3") end
  G.rect(8,2,24,5,"h3"); G.rect(8,25,24,28,"h3"); G.line(8,2,24,2,"h2"); G.rect(9,14,23,15,"h2")
end)
-- mesa del astrónomo con un libro abierto y un compás (choca)
tile("sarcofago", true, false, function(G)
  G.ellipse(16,28,13,3,"a4")
  G.rect(4,13,27,17,"h3"); G.line(4,13,27,13,"h2"); G.rect(6,18,8,27,"h4"); G.rect(23,18,25,27,"h4")
  G.rect(9,9,22,13,"a1"); G.line(15,9,15,13,"a3"); for y=10,12 do G.line(10,y,14,y,"b1"); G.line(17,y,21,y,"b1") end
  G.line(24,8,26,12,"m1"); G.line(26,8,24,12,"m1")
end)
-- astrolabio sobre un pie de bronce (choca)
tile("urna", true, false, function(G)
  G.ellipse(16,28,8,2,"a4")
  G.rect(15,18,17,27,"h3"); G.rect(12,26,20,27,"h4")
  G.ellipse(16,11,8,8,"h3"); G.ellipse(16,11,6,6,"w3"); G.ellipse(16,11,6,2,"h2")
  G.line(10,5,22,17,"h2"); G.ellipse(16,11,1.5,1.5,"o1"); G.px(13,9,"w1"); G.px(19,13,"w2")
end)
-- pila de libros y rollos de mapas (choca)
tile("vasija", true, false, function(G)
  G.ellipse(16,27,12,3,"a4")
  for i, b in ipairs({{5,22,20,26,"r1"},{7,18,18,22,"o3"},{6,14,17,18,"r2"},{9,10,16,14,"r1"}}) do
    G.rect(b[1], b[2], b[3], b[4], b[5]); G.line(b[1], b[2], b[3], b[2], "a1"); G.line(b[3], b[2], b[3], b[4], "a3")
  end
  G.rect(21,14,26,26,"a1"); G.ellipse(23.5,14,2.5,1.5,"a2"); G.line(21,20,26,20,"r1")
end)
-- montón de vidrios de la lente partida (choca)
tile("bloque_hielo", true, false, function(G)
  G.ellipse(16,28,13,3,"a4")
  for _, s in ipairs({{5,27,10,16},{11,27,17,12},{17,27,24,18},{22,27,27,21},{9,20,15,9}}) do
    G.line(s[1], s[2], s[3], s[4], "g2"); G.line(s[1] + 1, s[2], s[3] + 1, s[4], "g1"); G.line(s[1] + 2, s[2], s[3] + 2, s[4], "g3")
  end
  G.px(14,10,"an1"); G.px(23,17,"an1")
end)
-- racimo de cristales del eclipse: donde el ojo miró demasiado tiempo (choca)
tile("cristal", true, false, function(G)
  G.ellipse(16,27,10,3,"a4"); G.ellipse(16,25,8,3,"c4")
  for _,s in ipairs({{12,25,3,12},{17,25,4,17},{22,25,3,10}}) do
    local x, y, w, h = s[1], s[2], s[3], s[4]
    for i=0,h do local ww = math.floor(w * (1 - i / h)); G.rect(x - ww, y - i, x + ww, y - i, i < h * 0.4 and "e3" or "e2") end
    G.line(x, y - 1, x, y - h + 2, "e1")
  end
end)
-- estatua de un astrónomo aethrino con un catalejo apuntando arriba (2x2): de la cintura para arriba se
-- ve sobre el héroe
local function estatua(G, cx, cy)
  G.rect(6 - cx, 52 - cy, 58 - cx, 61 - cy, "p3"); G.rect(6 - cx, 52 - cy, 58 - cx, 53 - cy, "p2"); G.line(6 - cx, 61 - cy, 58 - cx, 61 - cy, "p4")
  for y=22,51 do local half = math.floor(7 + (y - 22) * 0.45); G.rect(32 - half - cx, y - cy, 32 + half - cx, y - cy, (y % 6 == 0) and "p3" or "p2") end
  G.ellipse(32 - cx, 15 - cy, 7, 8, "p1"); G.rect(26 - cx, 18 - cy, 38 - cx, 24 - cy, "p2")
  -- el sombrero de astrónomo, puntiagudo
  for y=0,9 do G.rect(32 - (9 - y) // 2 - 1 - cx, y + 1 - cy, 32 + (9 - y) // 2 + 1 - cx, y + 1 - cy, "p2") end
  G.rect(22 - cx, 9 - cy, 42 - cx, 10 - cy, "p3")
  -- el catalejo de bronce, apuntando al cielo
  G.thick(38 - cx, 34 - cy, 50 - cx, 6 - cy, 3, "h3"); G.line(38 - cx, 33 - cy, 50 - cx, 5 - cy, "h2"); G.ellipse(50 - cx, 6 - cy, 2.5, 2, "h4")
  G.ellipse(36 - cx, 34 - cy, 4, 3, "p1")
  G.line(26 - cx, 38 - cy, 30 - cx, 46 - cy, "p4")
end
tile("estatua_0_0", false, true, function(G) estatua(G, 0, 0) end)
tile("estatua_0_1", false, true, function(G) estatua(G, 32, 0) end)
tile("estatua_1_0", true, false, function(G) estatua(G, 0, 32) end)
tile("estatua_1_1", true, false, function(G) estatua(G, 32, 32) end)
-- el ocular del gran telescopio (2x2): un aro de bronce enorme con la lente rota, y del otro lado, el ojo
local function lente(G, cx, cy)
  G.rect(4 - cx, 52 - cy, 60 - cx, 61 - cy, "h4"); G.line(4 - cx, 52 - cy, 60 - cx, 52 - cy, "h2")
  G.ellipse(32 - cx, 28 - cy, 27, 24, "h3"); G.ellipse(32 - cx, 28 - cy, 24, 21, "h2"); G.ellipse(32 - cx, 28 - cy, 21, 18, "w5")
  G.ellipse(32 - cx, 28 - cy, 14, 9, "e3"); G.ellipse(32 - cx, 28 - cy, 9, 7, "e2"); G.ellipse(32 - cx, 28 - cy, 3, 6, "b2"); G.px(28 - cx, 24 - cy, "e1")
  -- las grietas de la lente
  G.line(14 - cx, 16 - cy, 28 - cx, 30 - cy, "g2"); G.line(28 - cx, 30 - cy, 22 - cx, 44 - cy, "g2"); G.line(40 - cx, 12 - cy, 34 - cx, 26 - cy, "g3")
  for _, a in ipairs({20, 70, 110, 160, 200, 250, 290, 340}) do G.px(32 + 25.5 * math.cos(math.rad(a)) - cx, 28 + 22.5 * math.sin(math.rad(a)) - cy, "o1") end
  for _, x in ipairs({12, 48}) do G.rect(x - cx, 44 - cy, x + 3 - cx, 52 - cy, "h3") end
end
tile("tumba_0_0", false, true, function(G) lente(G, 0, 0) end)
tile("tumba_0_1", false, true, function(G) lente(G, 32, 0) end)
tile("tumba_1_0", true, false, function(G) lente(G, 0, 32) end)
tile("tumba_1_1", true, false, function(G) lente(G, 32, 32) end)

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
  spr:saveAs(dir .. "/observatorio/tileset_observatorio.aseprite")
  if png then spr:saveCopyAs(png .. "/tileset_observatorio.png") end
  spr:close()
  local fh = io.open(dir .. "/tileset_observatorio.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Lámpara de cristal de control (32x32): 0 apagada sobre su pie de bronce; 1-4 encendida, luz celeste
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32)
    G.ellipse(16,29,10,2,"a4"); G.rect(14,20,18,28,"h3"); G.rect(14,20,14,28,"h2"); G.ellipse(16,28,5,2,"h4")
    G.rect(11,18,21,20,"h2"); G.line(11,18,21,18,"h1")
    local lit = i > 0
    G.ellipse(16,11,6,7,lit and "g2" or "c3"); G.ellipse(15,10,4,5,lit and "g1" or "c2")
    G.line(10,11,22,11,"h3"); G.line(16,4,16,18,"h3")
    if lit then
      local s = i % 2
      G.ellipse(15, 9 - s, 1.5, 2, "an1")
      G.px(8 + s, 6 - (i % 3), "w1"); G.px(24 - s, 4 + (i % 2), "w1"); G.px(25, 12 - i, "w2")
      for a=0,359,30 do G.px(16 + 10 * math.cos(math.rad(a + i * 10)), 11 + 8 * math.sin(math.rad(a + i * 10)), "g3") end
    end
    frames[#frames+1] = G; durs[#durs+1] = 180
  end
  saveSheet("lampara_cristal", 32, 32, frames, durs, {{"apagada",1,1},{"encendida",2,5}})
end

-- =====================================================================================
-- Puerta de bronce de la Gran Lente (128x64): 0-1 sellada (el ojo late), 2 abierta
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64)
    G.rect(0,8,127,63,"c3")
    G.rect(0,8,127,13,"c2"); G.line(0,8,127,8,"c1"); G.line(0,13,127,13,"c6")
    G.rect(0,14,13,63,"c2"); G.rect(114,14,127,63,"c2"); G.line(13,14,13,63,"c6"); G.line(114,14,114,63,"c1")
    for x=4,124,10 do estrella(G, x, 4, "o1") end
    G.rect(14,14,113,63,"c6")
    if i < 2 then
      -- dos hojas de bronce con las siete constelaciones y el ojo que las sella
      G.rect(16,14,63,63,"h3"); G.rect(64,14,111,63,"h3")
      G.line(63,14,63,63,"h4"); G.line(64,14,64,63,"h4")
      G.rect(16,14,111,16,"h2"); G.rect(16,58,111,63,"h4")
      for k, c in ipairs({{24,24},{36,48},{46,22},{82,24},{92,48},{104,22},{30,36}}) do
        G.px(c[1], c[2], "h1"); G.px(c[1] + 4, c[2] + 3, "h1"); G.line(c[1], c[2], c[1] + 4, c[2] + 3, "h2")
      end
      for _, p in ipairs({{20,40},{100,40},{56,56},{72,20}}) do G.px(p[1], p[2], "v1") end
      local glow = i == 0 and "e1" or "e2"
      G.ellipse(64,36,13,9,"e3"); G.ellipse(64,36,10,6,glow); G.ellipse(64,36,3,5,"b2"); G.px(61,33,"W")
    else
      -- abierta: las hojas recogidas y la Gran Lente al fondo, con la luz morada del ojo
      G.rect(14,14,22,63,"h3"); G.rect(105,14,113,63,"h3")
      for k=0,3 do G.rect(36 + k*3, 50 + k*3, 92 - k*3, 51 + k*3, "c5") end
      G.ellipse(64,36,22,16,"h3"); G.ellipse(64,36,19,13,"w5"); G.ellipse(64,36,9,6,"e3"); G.ellipse(64,36,5,4,"e2")
    end
    -- lámparas de cristal a los lados
    for _,x in ipairs({6, 121}) do G.rect(x-1,30,x+1,36,"h3"); G.ellipse(x,26,2.5,3,"g2"); G.px(x,25,"an1") end
    frames[#frames+1] = G
  end
  saveSheet("puerta_bronce", 128, 64, frames, {500, 500, 500}, {{"sellada",1,2},{"abierta",3,3}}, {outline=false})
end
