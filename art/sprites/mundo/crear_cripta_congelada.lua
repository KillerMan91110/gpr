-- La Cripta Congelada (mazmorra bajo el Cementerio Real, en la Tundra Eterna): la tumba de la reina,
-- madre de Eirik y de Hela, que los Ocultos profanaron para llegar al Quinto Sello por debajo. Mismo
-- estilo y plano que crear_arrecife.lua:
--   cripta_congelada/tileset_cripta_congelada  tileset propio de 32x32 (losas de hielo, paredes de piedra
--                              y escarcha, el abismo helado, el puente de hielo, sarcófagos, urnas,
--                              estatuas de la reina, su tumba…) + su .json
--   cripta_congelada/vela_hielo       vela de control de hielo azul (apagada / encendida, 32x32)
--   cripta_congelada/compuerta_helada la compuerta de la Tumba de la Reina (sellada con el eclipse /
--                                     abierta, 128x64)
-- Además exporta los PNG que usa el juego (parámetro png=public/assets/mundo):
--   tileset_cripta_congelada.png, mazmorra/vela_hielo.png (tira 5x32), mazmorra/compuerta_helada.png (tira 3x128)
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_cripta_congelada.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- losas de hielo del piso
  {"a1","d4e8f4"},{"a2","b4d0e4"},{"a3","90b0cc"},{"a4","6c8cac"},
  -- piedra fría de las paredes (de clara a oscura)
  {"c1","9aa8c0"},{"c2","7a88a4"},{"c3","5c6a88"},{"c4","44506c"},{"c5","2e3850"},{"c6","1c2234"},
  -- escarcha y hielo
  {"cb1","f2faff"},{"cb2","cfe6f6"},{"cb3","a6c8e2"},
  -- el abismo helado (brilla un poco al fondo)
  {"w1","9ae0ff"},{"w2","4aa0d0"},{"w3","2a6aa0"},{"w4","1a3c6a"},{"w5","0e2040"},
  -- hielo claro del puente y de la tumba
  {"n1","f4fbff"},{"n2","d8eefa"},{"n3","a8d0ea"},{"n4","78a8cc"},
  -- llama azul de las velas
  {"g1","b8f0ff"},{"g2","5ac8f0"},{"g3","2a8ac0"},{"an1","e0f8ff"},{"an2","7ad8ff"},{"an3","ffffff"},
  -- plata de la familia real
  {"o1","f0f4ff"},{"o2","b8c4dc"},{"o3","7c88a8"},
  -- mármol blanco de las estatuas
  {"p1","e8ecf4"},{"p2","c4cad8"},{"p3","9aa0b4"},{"p4","6c7288"},
  -- hierro viejo de las urnas
  {"m1","8a92a0"},{"m2","5e6676"},{"m3","3c4250"},
  -- eclipse
  {"e1","d8a0ff"},{"e2","8a4ad8"},{"e3","4e2490"},
  -- copos
  {"bu","ffffff"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end
-- colores que brillan: no reciben contorno
local GLOW = {K=true, w1=true, e1=true, bu=true, an3=true, g1=true, an1=true}

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
  spr:saveAs(dir .. "/cripta_congelada/" .. name .. ".aseprite")
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

-- losas de hielo con juntas y algo de escarcha
local function losa(G, base)
  G.rect(0,0,31,31,base or "a2")
  G.line(0,15,31,15,"a3"); G.line(15,0,15,15,"a3"); G.line(7,16,7,31,"a3"); G.line(23,16,23,31,"a3")
  G.line(1,1,13,1,"a1"); G.line(17,17,30,17,"a1")
  for _=1,10 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), rnd() < 0.5 and "a1" or "a3") end
end
-- el abismo helado: oscuridad azul con hielo que brilla abajo
local function abismo(G)
  G.rect(0,0,31,31,"w4")
  for _=1,6 do G.ellipse(rnd()*31, rnd()*31, 4 + rnd()*4, 1 + rnd()*1.5, "w5") end
  for _=1,4 do local x, y = math.floor(rnd()*28), math.floor(rnd()*30); G.line(x, y, x + 2, y + 1, "w3") end
  for _=1,3 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w1") end
  for _=1,3 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w2") end
end

tile("suelo", false, false, function(G) losa(G) end)
tile("suelo_escarcha", false, false, function(G)
  losa(G)
  for _,p in ipairs({{6,8},{22,6},{12,22},{26,24},{4,27}}) do
    G.line(p[1]-2, p[2], p[1]+2, p[2], "cb1"); G.line(p[1], p[2]-2, p[1], p[2]+2, "cb1"); G.px(p[1], p[2], "W")
  end
end)
tile("suelo_grieta", false, false, function(G)
  losa(G)
  G.line(4,6,12,14,"a4"); G.line(12,14,10,22,"a4"); G.line(12,14,22,18,"a4"); G.line(22,18,28,27,"a4")
  G.px(12,15,"w2"); G.px(22,19,"w2")
end)
tile("sombra", false, false, function(G)
  losa(G)
  for y=0,7 do for x=0,31 do if (x + y) % 2 == 0 or y < 3 then G.px(x, y, y < 3 and "a4" or "a3") end end end
end)
tile("techo", true, false, function(G)
  G.rect(0,0,31,31,"c6")
  for _=1,12 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "c5") end
  G.px(math.floor(rnd()*31), math.floor(rnd()*31), "cb3")
end)
-- cara de la pared: bloques de piedra fría con escarcha en las juntas y carámbanos arriba
local function pared(G)
  G.rect(0,0,31,31,"c3")
  G.rect(0,0,31,3,"c6"); G.line(0,4,31,4,"c5")
  for _,r in ipairs({{0,6,15,13},{16,6,31,13},{0,14,9,21},{10,14,24,21},{25,14,31,21},{0,22,15,29},{16,22,31,29}}) do
    G.rect(r[1], r[2], r[3], r[4], "c2"); G.line(r[1], r[2], r[3], r[2], "c1"); G.line(r[1], r[4], r[3], r[4], "c4")
    G.px(r[1] + 2, r[2] + 1, "cb2")
  end
  for x=2,31,5 do G.line(x, 4, x, 6 + (x % 3), "cb2"); G.px(x, 7 + (x % 3), "cb1") end
  G.rect(0,30,31,31,"c5")
end
tile("pared", true, false, pared)
-- vela de hielo en un nicho de la pared (hace de antorcha)
tile("pared_vela", true, false, function(G)
  pared(G)
  G.rect(11,9,21,24,"c5"); G.ellipse(16,9,5,3,"c5")
  G.rect(14,16,18,23,"cb2"); G.rect(14,16,14,23,"cb1")
  G.ellipse(16,13,2,3,"g2"); G.ellipse(16,13,1,2,"an1"); G.px(16,10,"g1")
end)
-- runas de la familia real grabadas en la pared
tile("pared_runa", true, false, function(G)
  pared(G)
  G.rect(9,10,23,24,"c4"); G.rect(10,11,22,23,"c3")
  G.line(12,13,12,21,"g2"); G.line(12,13,15,16,"g2"); G.line(18,13,18,21,"g2"); G.line(18,17,21,13,"g2"); G.line(18,17,21,21,"g2")
end)
tile("pared_eclipse", true, false, function(G)
  pared(G)
  -- un cristal de eclipse clavado en la piedra, con grietas moradas
  G.line(16,9,16,24,"e3"); G.line(12,13,20,20,"e3")
  G.line(16,10,13,15,"e2"); G.line(13,15,16,22,"e2"); G.line(16,22,19,15,"e2"); G.line(19,15,16,10,"e2")
  G.rect(15,14,17,17,"e1"); G.px(16,12,"e1")
  G.line(8,24,12,20,"e3"); G.line(24,8,20,12,"e3")
end)
tile("abismo", true, false, function(G) abismo(G) end)
-- abismo con el borde de las losas arriba (cuando hay suelo encima)
tile("abismo_borde", true, false, function(G)
  abismo(G)
  G.rect(0,0,31,5,"a3"); G.line(0,0,31,0,"a2")
  for x=0,31 do if (x * 7) % 5 < 3 then G.px(x, 6, "a4") end end
  for x=1,31,4 do G.line(x, 7, x, 9 + (x % 3), "cb2") end
end)
-- puente de hielo sobre el abismo (3 casillas de ancho): borde de arriba, centro y borde de abajo
local function hielo(G)
  G.rect(0,0,31,31,"n2")
  for x=0,31,8 do G.line(x,0,x,31,"n3") end
  for _,p in ipairs({{4,6},{12,20},{20,9},{27,25},{6,26}}) do G.line(p[1], p[2], p[1]+3, p[2]-2, "n1"); G.px(p[1]+1, p[2]+1, "n3") end
end
tile("puente_n", false, false, function(G)
  abismo(G); hielo(G); G.rect(0,0,31,5,"w3")
  G.rect(0,4,31,6,"cb2"); G.line(0,4,31,4,"cb1"); for x=3,31,7 do G.rect(x, 3, x + 1, 6, "cb3") end
end)
tile("puente_c", false, false, function(G) hielo(G) end)
tile("puente_s", false, false, function(G)
  abismo(G); hielo(G); G.rect(0,26,31,31,"w4")
  G.rect(0,24,31,26,"cb2"); G.line(0,24,31,24,"cb1"); for x=3,31,7 do G.rect(x, 24, x + 1, 27, "cb3") end
  for x=2,31,5 do G.line(x, 27, x, 29 + (x % 3), "cb2") end
end)
-- escalones de piedra con escarcha
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"c5")
  for i=0,5 do
    local y = 26 - i*5
    G.rect(i, y, 31-i, y+4, i % 2 == 0 and "c2" or "c3")
    G.line(i, y, 31-i, y, "cb2")
    G.line(i, y+4, 31-i, y+4, "c5")
  end
  G.rect(0,0,2,31,"c4"); G.rect(29,0,31,31,"c4")
end)
-- el piso de la Tumba de la Reina: mosaico de hielo con la corona real en plata
tile("piso_tumba", false, false, function(G)
  G.rect(0,0,31,31,"n3")
  for y=0,31,8 do for x=0,31,8 do G.rect(x+1, y+1, x+6, y+6, ((x + y) // 8) % 2 == 0 and "n2" or "n1") end end
  G.rect(10,14,22,16,"o2"); for _,x in ipairs({10, 16, 22}) do G.line(x, 14, x, 8, "o2"); G.px(x, 7, "o1") end
  G.line(13,14,13,11,"o2"); G.line(19,14,19,11,"o2"); G.px(16,15,"g1")
end)
-- canal de agua helada con rejilla de hierro (se puede pisar)
tile("canal_helado", false, false, function(G)
  losa(G)
  G.rect(0,11,31,20,"c4"); G.rect(0,12,31,19,"w3"); G.rect(0,14,31,17,"n3"); G.line(0,15,31,15,"n1")
  for x=1,31,4 do G.line(x,11,x,20,"m2") end
  G.line(0,11,31,11,"m1"); G.line(0,20,31,20,"c5")
end)
-- columna de hielo con escarcha (choca)
tile("columna", true, false, function(G)
  G.ellipse(16,28,9,3,"a4")
  G.rect(10,4,22,27,"cb3"); G.rect(10,4,12,27,"cb1"); G.rect(20,4,22,27,"n4")
  G.rect(8,2,24,5,"c2"); G.rect(8,25,24,28,"c3"); G.line(8,2,24,2,"c1")
  for y=7,24,4 do G.line(14, y, 17, y + 2, "cb1") end
end)
-- sarcófago de piedra de un antepasado, con escarcha en la tapa (choca)
tile("sarcofago", true, false, function(G)
  G.ellipse(16,28,13,3,"a4")
  G.rect(5,10,26,27,"p3"); G.rect(5,10,26,12,"p2"); G.rect(5,26,26,27,"p4")
  G.rect(4,7,27,11,"p2"); G.line(4,7,27,7,"p1")
  G.ellipse(16,9,5,2,"p1"); G.rect(14,13,17,22,"p4"); G.rect(11,16,20,17,"p4")
  for x=6,26,4 do G.px(x, 7, "cb1"); G.px(x + 1, 8, "cb2") end
end)
-- urna funeraria de hierro con el emblema real (choca)
tile("urna", true, false, function(G)
  G.ellipse(16,28,8,2,"a4")
  G.ellipse(16,19,7,8,"m2"); G.ellipse(15,18,5,6,"m1"); G.rect(13,6,19,11,"m2"); G.rect(12,5,20,6,"m1")
  G.ellipse(16,4,3,1.5,"m3"); G.px(16,3,"o2")
  G.line(10,20,22,20,"o2"); G.ellipse(16,16,2,2,"o1")
end)
-- vasija de ofrendas con flores de escarcha secas (choca)
tile("vasija", true, false, function(G)
  G.ellipse(16,28,7,2,"a4")
  G.ellipse(16,20,7,7,"p2"); G.ellipse(15,19,5,5,"p1"); G.rect(13,9,19,13,"p2"); G.rect(12,8,20,9,"p1")
  for _,f in ipairs({{12,4},{16,2},{20,5}}) do G.line(16, 9, f[1], f[2] + 2, "c2"); G.ellipse(f[1], f[2], 1.5, 1.5, "cb2"); G.px(f[1], f[2], "W") end
  G.line(10,21,22,21,"o3")
end)
-- bloque de hielo con algo oscuro adentro (choca)
tile("bloque_hielo", true, false, function(G)
  G.ellipse(16,27,13,4,"a4")
  G.rect(5,8,27,27,"n3"); G.rect(5,8,27,10,"n1"); G.rect(5,8,7,27,"n2"); G.rect(25,8,27,27,"n4")
  G.ellipse(16,18,4,5,"w4"); G.ellipse(16,17,2,3,"w3")
  G.line(9,12,14,14,"W"); G.line(20,22,24,20,"n2")
end)
-- racimo de cristales de eclipse que los Ocultos plantaron en la cripta (choca)
tile("cristal", true, false, function(G)
  G.ellipse(16,27,10,3,"a4"); G.ellipse(16,25,8,3,"c4")
  for _,s in ipairs({{12,25,3,12},{17,25,4,17},{22,25,3,10}}) do
    local x, y, w, h = s[1], s[2], s[3], s[4]
    for i=0,h do local ww = math.floor(w * (1 - i / h)); G.rect(x - ww, y - i, x + ww, y - i, i < h * 0.4 and "e3" or "e2") end
    G.line(x, y - 1, x, y - h + 2, "e1")
  end
end)
-- estatua de la reina con su manto y su corona (2x2): de la cintura para arriba se ve sobre el héroe
local function estatua(G, cx, cy)
  -- pedestal
  G.rect(6 - cx, 52 - cy, 58 - cx, 61 - cy, "p3"); G.rect(6 - cx, 52 - cy, 58 - cx, 53 - cy, "p2"); G.line(6 - cx, 61 - cy, 58 - cx, 61 - cy, "p4")
  -- el manto, largo hasta el pedestal
  for y=22,51 do local half = math.floor(6 + (y - 22) * 0.45); G.rect(32 - half - cx, y - cy, 32 + half - cx, y - cy, (y % 6 == 0) and "p3" or "p2") end
  G.rect(28 - cx, 22 - cy, 36 - cx, 34 - cy, "p1")
  -- cabeza, pelo largo y corona
  G.ellipse(32 - cx, 14 - cy, 6, 7, "p1"); G.rect(25 - cx, 12 - cy, 27 - cx, 30 - cy, "p2"); G.rect(37 - cx, 12 - cy, 39 - cx, 30 - cy, "p2")
  G.rect(26 - cx, 6 - cy, 38 - cx, 8 - cy, "o2"); for _,x in ipairs({27, 32, 37}) do G.line(x - cx, 6 - cy, x - cx, 2 - cy, "o2"); G.px(x - cx, 1 - cy, "o1") end
  -- las manos juntas sobre una flor de escarcha
  G.ellipse(32 - cx, 36 - cy, 4, 3, "p1"); G.ellipse(32 - cx, 33 - cy, 2, 2, "cb1"); G.px(32 - cx, 33 - cy, "g1")
  -- escarcha en los hombros
  G.line(24 - cx, 24 - cy, 28 - cx, 22 - cy, "cb1"); G.line(36 - cx, 22 - cy, 40 - cx, 24 - cy, "cb1")
end
tile("estatua_0_0", false, true, function(G) estatua(G, 0, 0) end)
tile("estatua_0_1", false, true, function(G) estatua(G, 32, 0) end)
tile("estatua_1_0", true, false, function(G) estatua(G, 0, 32) end)
tile("estatua_1_1", true, false, function(G) estatua(G, 32, 32) end)
-- la tumba de la reina (2x2): el respaldo con su retrato de hielo se ve sobre el héroe, la tumba choca
local function tumba(G, cx, cy)
  G.rect(4 - cx, 50 - cy, 60 - cx, 61 - cy, "n3"); G.line(4 - cx, 50 - cy, 60 - cx, 50 - cy, "n1")
  -- lápida alta de hielo, con la corona grabada
  G.ellipse(32 - cx, 24 - cy, 22, 22, "c3"); G.ellipse(32 - cx, 24 - cy, 19, 19, "n3"); G.ellipse(32 - cx, 24 - cy, 16, 16, "n2")
  G.rect(24 - cx, 16 - cy, 40 - cx, 18 - cy, "o2"); for _,x in ipairs({24, 32, 40}) do G.line(x - cx, 16 - cy, x - cx, 10 - cy, "o2"); G.px(x - cx, 9 - cy, "o1") end
  G.ellipse(32 - cx, 28 - cy, 3, 3, "e2"); G.px(31 - cx, 27 - cy, "e1")
  -- la tumba
  G.rect(12 - cx, 38 - cy, 52 - cx, 50 - cy, "p2"); G.rect(12 - cx, 38 - cy, 52 - cx, 40 - cy, "p1"); G.rect(12 - cx, 49 - cy, 52 - cx, 50 - cy, "p4")
  for x=16,48,8 do G.px(x - cx, 44 - cy, "cb1"); G.px(x + 1 - cx, 45 - cy, "g2") end
end
tile("tumba_0_0", false, true, function(G) tumba(G, 0, 0) end)
tile("tumba_0_1", false, true, function(G) tumba(G, 32, 0) end)
tile("tumba_1_0", true, false, function(G) tumba(G, 0, 32) end)
tile("tumba_1_1", true, false, function(G) tumba(G, 32, 32) end)

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
  spr:saveAs(dir .. "/cripta_congelada/tileset_cripta_congelada.aseprite")
  if png then spr:saveCopyAs(png .. "/tileset_cripta_congelada.png") end
  spr:close()
  local fh = io.open(dir .. "/tileset_cripta_congelada.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Vela de hielo de control (32x32): 0 apagada sobre su pie; 1-4 encendida, con llama azul
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32)
    -- pie de piedra
    G.ellipse(16,29,10,2,"a4"); G.rect(10,23,22,28,"c2"); G.rect(10,23,11,28,"c1"); G.rect(21,23,22,28,"c4"); G.rect(8,21,24,23,"c1")
    -- la vela de hielo
    G.rect(12,9,20,21,"cb2"); G.rect(12,9,13,21,"cb1"); G.rect(19,9,20,21,"cb3")
    G.line(14,12,14,18,"W"); G.px(18,15,"n3"); G.rect(15,6,17,9,"cb3")
    local lit = i > 0
    if lit then
      local s = i % 2
      G.ellipse(16, 4 - s, 3, 4, "g2"); G.ellipse(16, 4 - s, 1.5, 2.5, "an1"); G.px(16, 0, "g1")
      -- copos que suben y el brillo alrededor
      G.px(9 + s, 6 - (i % 3), "bu"); G.px(23 - s, 3 + (i % 2), "bu"); G.px(25, 8 - i, "bu")
      for a=0,359,30 do G.px(16 + 9 * math.cos(math.rad(a + i * 10)), 6 + 6 * math.sin(math.rad(a + i * 10)), "g1") end
    else
      G.line(16, 5, 16, 3, "c4")
    end
    frames[#frames+1] = G; durs[#durs+1] = 180
  end
  saveSheet("vela_hielo", 32, 32, frames, durs, {{"apagada",1,1},{"encendida",2,5}})
end

-- =====================================================================================
-- Compuerta helada de la Tumba de la Reina (128x64): 0-1 sellada (el cristal de eclipse late), 2 abierta
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64)
    -- arco de piedra con escarcha
    G.rect(0,8,127,63,"c3")
    G.rect(0,8,127,13,"c2"); G.line(0,8,127,8,"c1"); G.line(0,13,127,13,"c6")
    G.rect(0,14,13,63,"c2"); G.rect(114,14,127,63,"c2"); G.line(13,14,13,63,"c6"); G.line(114,14,114,63,"c1")
    for x=2,126,6 do G.line(x, 13, x, 15 + (x % 4), "cb2") end
    G.rect(14,14,113,63,"c6")
    if i < 2 then
      -- dos hojas de hielo grueso y el cristal de eclipse que las sella
      G.rect(16,14,63,63,"n3"); G.rect(64,14,111,63,"n3"); G.line(63,14,63,63,"n4"); G.line(64,14,64,63,"n1")
      for y=18,60,6 do for x=18,110,8 do G.line(x + (y % 12 == 0 and 4 or 0), y, x + 3 + (y % 12 == 0 and 4 or 0), y - 2, "n2") end end
      G.rect(16,58,111,63,"c3"); G.line(16,58,111,58,"c2")
      local glow = i == 0 and "e1" or "e2"
      G.ellipse(64,34,12,14,"e3"); G.ellipse(64,34,9,11,glow); G.ellipse(64,34,5,7,"e2")
      G.line(64,20,64,48,"e3"); G.px(61,28,"W")
      -- grietas moradas que corren por el hielo
      G.line(52,34,30,22,"e3"); G.line(76,34,98,46,"e3"); G.line(52,40,36,52,"e3"); G.line(76,28,94,18,"e3")
    else
      -- abierta: las hojas recogidas y el resplandor azul de la tumba al fondo
      G.rect(14,14,22,63,"n3"); G.rect(105,14,113,63,"n3")
      for k=0,3 do G.rect(36 + k*3, 50 + k*3, 92 - k*3, 51 + k*3, "c5") end
      G.ellipse(64,40,20,10,"w3"); G.ellipse(64,40,12,5,"g2")
    end
    -- velas de hielo a los lados
    for _,x in ipairs({6, 121}) do G.rect(x-1,26,x+1,34,"cb2"); G.ellipse(x,23,1.5,2.5,"g2"); G.px(x,22,"an1") end
    frames[#frames+1] = G
  end
  saveSheet("compuerta_helada", 128, 64, frames, {500, 500, 500}, {{"sellada",1,2},{"abierta",3,3}}, {outline=false})
end
