-- El Trono de Huesos (mazmorra de las Catacumbas del Abismo): la corte del Lich, una sala del trono hecha
-- con los huesos de los sacerdotes que traicionó. Mismo estilo y plano que crear_cripta_congelada.lua:
--   trono_huesos/tileset_trono_huesos  tileset propio de 32x32 (losas violáceas, paredes de nichos con
--                              cráneos, el pozo de huesos con las almas al fondo, el puente de costillas,
--                              columnas de hueso, estatuas veladas, el trono…) + su .json
--   trono_huesos/vela_negra    vela de control de cera negra (apagada / encendida con llama azul, 32x32)
--   trono_huesos/puerta_hueso  la puerta de la Sala del Trono (sellada con el eclipse / abierta, 128x64)
-- Además exporta los PNG que usa el juego (parámetro png=public/assets/mundo):
--   tileset_trono_huesos.png, mazmorra/vela_negra.png (tira 5x32), mazmorra/puerta_hueso.png (tira 3x128)
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_trono_huesos.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- losas violáceas del piso
  {"a1","9a94a4"},{"a2","7e7888"},{"a3","625c6e"},{"a4","4a4656"},
  -- piedra de las paredes (de clara a oscura)
  {"c1","8a8496"},{"c2","6c6678"},{"c3","524e60"},{"c4","3e3a4a"},{"c5","2a2834"},{"c6","1a1822"},
  -- hueso
  {"h1","ece4cc"},{"h2","c6ba9a"},{"h3","8c7e66"},{"h4","5a5040"},
  -- el pozo de huesos: oscuridad con las almas brillando al fondo
  {"w1","c0f6ff"},{"w2","6ad0f0"},{"w3","2a3a5a"},{"w4","1a1a2c"},{"w5","0e0c16"},
  -- llama azul de las velas negras
  {"g1","c0f6ff"},{"g2","4cbcdc"},{"g3","2a7eaa"},{"an1","e0fbff"},
  -- oro gastado de la corte
  {"o1","ffe08a"},{"o2","c89a2a"},{"o3","8a6a20"},
  -- mármol de las estatuas veladas
  {"p1","dcd8e4"},{"p2","b4aec4"},{"p3","8a849c"},{"p4","625c74"},
  -- hierro viejo
  {"m1","8a8290"},{"m2","5e5866"},{"m3","3c3844"},
  -- eclipse
  {"e1","e2a6ff"},{"e2","8a50d8"},{"e3","4e2490"},
  -- cera negra y terciopelo del trono
  {"b1","3a3644"},{"b2","26222e"},{"r1","7a1f2a"},{"r2","a8303a"},
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
  spr:saveAs(dir .. "/trono_huesos/" .. name .. ".aseprite")
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
local seed = 8282
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end

-- un cráneo chico mirando al frente (x, y = arriba-izquierda, 7x7)
local function craneo(G, x, y, ojo)
  G.ellipse(x + 3, y + 2.5, 3, 2.5, "h1"); G.rect(x + 1, y + 3, x + 5, y + 6, "h1"); G.line(x + 1, y + 6, x + 5, y + 6, "h2")
  G.px(x + 2, y + 3, ojo or "K"); G.px(x + 4, y + 3, ojo or "K"); G.px(x + 3, y + 5, "h3")
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

-- losas grandes de piedra violácea, gastadas
local function losa(G, base)
  G.rect(0,0,31,31,base or "a2")
  G.line(0,15,31,15,"a3"); G.line(15,0,15,15,"a3"); G.line(7,16,7,31,"a3"); G.line(23,16,23,31,"a3")
  G.line(1,1,13,1,"a1"); G.line(17,17,30,17,"a1")
  for _=1,10 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), rnd() < 0.5 and "a1" or "a3") end
end
-- el pozo de huesos: oscuridad, huesos muy abajo y almas azules que suben
local function pozo(G)
  G.rect(0,0,31,31,"w4")
  for _=1,6 do G.ellipse(rnd()*31, rnd()*31, 4 + rnd()*4, 1 + rnd()*1.5, "w5") end
  for _=1,5 do local x, y = math.floor(rnd()*28), math.floor(rnd()*30); G.line(x, y, x + 3, y + 1, "h4") end
  for _=1,3 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w1") end
  for _=1,3 do G.px(math.floor(rnd()*31), math.floor(rnd()*31), "w2") end
end

tile("suelo", false, false, function(G) losa(G) end)
-- huesos regados sobre las losas
tile("suelo_huesos", false, false, function(G)
  losa(G)
  G.thick(5,8,13,11,2,"h2"); G.ellipse(5,8,1.5,1.5,"h1"); G.ellipse(13,11,1.5,1.5,"h1")
  G.thick(19,22,26,18,2,"h2"); G.ellipse(19,22,1.5,1.5,"h1"); G.ellipse(26,18,1.5,1.5,"h1")
  craneo(G, 21, 5); G.px(9, 25, "h3"); G.px(10, 26, "h3")
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
  G.px(math.floor(rnd()*31), math.floor(rnd()*31), "h4")
end)
-- cara de la pared: bloques de piedra con huesos largos apilados en las juntas
local function pared(G)
  G.rect(0,0,31,31,"c3")
  G.rect(0,0,31,3,"c6"); G.line(0,4,31,4,"c5")
  for _,r in ipairs({{0,6,15,13},{16,6,31,13},{0,14,9,21},{10,14,24,21},{25,14,31,21},{0,22,15,29},{16,22,31,29}}) do
    G.rect(r[1], r[2], r[3], r[4], "c2"); G.line(r[1], r[2], r[3], r[2], "c1"); G.line(r[1], r[4], r[3], r[4], "c4")
  end
  -- fémures metidos de canto entre las piedras
  for _,y in ipairs({13, 21}) do G.line(1, y, 30, y, "h3"); for x=2,30,7 do G.px(x, y, "h2") end end
  G.rect(0,30,31,31,"c5")
end
tile("pared", true, false, pared)
-- vela negra en un nicho de la pared (hace de antorcha)
tile("pared_vela", true, false, function(G)
  pared(G)
  G.rect(11,9,21,24,"c5"); G.ellipse(16,9,5,3,"c5")
  G.rect(14,16,18,23,"b1"); G.rect(14,16,14,23,"c2"); G.line(14,16,18,16,"h3")
  G.ellipse(16,13,2,3,"g2"); G.ellipse(16,13,1,2,"an1"); G.px(16,10,"g1")
end)
-- nicho con cráneos apilados (los sacerdotes del templo)
tile("pared_craneos", true, false, function(G)
  pared(G)
  G.rect(6,8,25,26,"c6"); G.ellipse(16,8,10,3,"c6"); G.line(6,26,25,26,"c4")
  craneo(G, 7, 19); craneo(G, 13, 19, "g3"); craneo(G, 19, 19); craneo(G, 10, 12); craneo(G, 16, 12)
end)
tile("pared_eclipse", true, false, function(G)
  pared(G)
  -- un cristal de eclipse clavado en la piedra, con grietas moradas
  G.line(16,9,16,24,"e3"); G.line(12,13,20,20,"e3")
  G.line(16,10,13,15,"e2"); G.line(13,15,16,22,"e2"); G.line(16,22,19,15,"e2"); G.line(19,15,16,10,"e2")
  G.rect(15,14,17,17,"e1"); G.px(16,12,"e1")
  G.line(8,24,12,20,"e3"); G.line(24,8,20,12,"e3")
end)
tile("abismo", true, false, function(G) pozo(G) end)
-- el pozo con el borde de las losas arriba (cuando hay suelo encima)
tile("abismo_borde", true, false, function(G)
  pozo(G)
  G.rect(0,0,31,5,"a3"); G.line(0,0,31,0,"a2")
  for x=0,31 do if (x * 7) % 5 < 3 then G.px(x, 6, "a4") end end
  for x=1,31,6 do G.line(x, 7, x, 9 + (x % 3), "h4") end
end)
-- puente de costillas sobre el pozo (3 casillas de ancho): borde de arriba, centro y borde de abajo
local function costillas(G)
  G.rect(0,0,31,31,"h3")
  for x=0,31,4 do G.rect(x, 0, x + 2, 31, "h2"); G.line(x, 0, x, 31, "h1") end
  G.line(0,15,31,15,"h4"); G.line(0,16,31,16,"h4")
end
tile("puente_n", false, false, function(G)
  pozo(G); costillas(G); G.rect(0,0,31,4,"w4")
  -- baranda: costillas que se curvan hacia arriba
  for x=1,31,4 do G.line(x, 6, x + 1, 1, "h1"); G.px(x + 1, 0, "h2") end
  G.rect(0,5,31,6,"h4")
end)
tile("puente_c", false, false, function(G) costillas(G) end)
tile("puente_s", false, false, function(G)
  pozo(G); costillas(G); G.rect(0,27,31,31,"w4")
  G.rect(0,25,31,26,"h4"); for x=1,31,4 do G.line(x, 26, x + 1, 31, "h1") end
end)
-- escalones de piedra con huesos en los bordes
tile("escalera", false, false, function(G)
  G.rect(0,0,31,31,"c5")
  for i=0,5 do
    local y = 26 - i*5
    G.rect(i, y, 31-i, y+4, i % 2 == 0 and "c2" or "c3")
    G.line(i, y, 31-i, y, "h3")
    G.line(i, y+4, 31-i, y+4, "c5")
  end
  G.rect(0,0,2,31,"c4"); G.rect(29,0,31,31,"c4")
end)
-- el piso de la Sala del Trono: mosaico de hueso y oro con el eclipse en el medio
tile("piso_trono", false, false, function(G)
  G.rect(0,0,31,31,"h3")
  for y=0,31,8 do for x=0,31,8 do G.rect(x+1, y+1, x+6, y+6, ((x + y) // 8) % 2 == 0 and "h2" or "h1") end end
  G.ellipse(16,16,6,6,"o2"); G.ellipse(16,16,4,4,"o1"); G.ellipse(18,16,4,4,"b2"); G.px(13,14,"W")
end)
-- canal por donde corre la luz de las almas, con rejilla de hierro (se puede pisar)
tile("canal_almas", false, false, function(G)
  losa(G)
  G.rect(0,11,31,20,"c4"); G.rect(0,12,31,19,"w3"); G.rect(0,14,31,17,"g3"); G.line(0,15,31,15,"w2")
  for x=3,31,9 do G.px(x, 15, "w1") end
  for x=1,31,4 do G.line(x,11,x,20,"m2") end
  G.line(0,11,31,11,"m1"); G.line(0,20,31,20,"c5")
end)
-- columna hecha de huesos atados con oro (choca)
tile("columna", true, false, function(G)
  G.ellipse(16,28,9,3,"a4")
  G.rect(10,4,22,27,"h2"); G.rect(10,4,12,27,"h1"); G.rect(20,4,22,27,"h3")
  for y=6,25,3 do G.line(11, y, 21, y, "h3"); G.px(13, y - 1, "h1") end
  G.rect(8,2,24,5,"o3"); G.rect(8,25,24,28,"c3"); G.line(8,2,24,2,"o2"); G.rect(9,13,23,14,"o2")
  craneo(G, 13, 15)
end)
-- ataúd abierto de un sacerdote, con el esqueleto adentro (choca)
tile("sarcofago", true, false, function(G)
  G.ellipse(16,28,13,3,"a4")
  G.rect(5,10,26,27,"c2"); G.rect(5,10,26,12,"c1"); G.rect(5,26,26,27,"c4")
  G.rect(7,12,24,25,"c6")
  craneo(G, 13, 13); G.line(16,20,16,25,"h2"); for y=21,24,2 do G.line(13, y, 19, y, "h3") end
  G.rect(3,6,10,9,"c3"); G.line(3,6,10,6,"c1") -- la tapa corrida
end)
-- urna de hierro con el sol de Aethra (choca)
tile("urna", true, false, function(G)
  G.ellipse(16,28,8,2,"a4")
  G.ellipse(16,19,7,8,"m2"); G.ellipse(15,18,5,6,"m1"); G.rect(13,6,19,11,"m2"); G.rect(12,5,20,6,"m1")
  G.ellipse(16,4,3,1.5,"m3"); G.px(16,3,"o2")
  G.line(10,20,22,20,"o3"); G.ellipse(16,16,2,2,"o2"); G.px(16,16,"o1")
end)
-- ofrenda: velas negras y cráneos sobre un paño (choca)
tile("vasija", true, false, function(G)
  G.ellipse(16,27,12,4,"r1"); G.ellipse(16,26,10,3,"r2")
  craneo(G, 6, 18); craneo(G, 19, 19)
  for _,v in ipairs({{13,12},{16,9},{26,14}}) do
    G.rect(v[1], v[2], v[1] + 2, 25, "b1"); G.ellipse(v[1] + 1, v[2] - 2, 1, 2, "g2"); G.px(v[1] + 1, v[2] - 2, "an1")
  end
end)
-- pila de cráneos (choca)
tile("bloque_hielo", true, false, function(G)
  G.ellipse(16,28,13,3,"a4")
  for _,p in ipairs({{4,20},{10,21},{16,20},{22,21},{7,14},{13,14},{19,14},{10,8},{16,8},{13,2}}) do craneo(G, p[1], p[2]) end
  G.px(16,10,"g2")
end)
-- racimo de cristales de eclipse que los Ocultos plantaron en la corte (choca)
tile("cristal", true, false, function(G)
  G.ellipse(16,27,10,3,"a4"); G.ellipse(16,25,8,3,"c4")
  for _,s in ipairs({{12,25,3,12},{17,25,4,17},{22,25,3,10}}) do
    local x, y, w, h = s[1], s[2], s[3], s[4]
    for i=0,h do local ww = math.floor(w * (1 - i / h)); G.rect(x - ww, y - i, x + ww, y - i, i < h * 0.4 and "e3" or "e2") end
    G.line(x, y - 1, x, y - h + 2, "e1")
  end
end)
-- estatua de un sacerdote velado con su vela (2x2): de la cintura para arriba se ve sobre el héroe
local function estatua(G, cx, cy)
  G.rect(6 - cx, 52 - cy, 58 - cx, 61 - cy, "p3"); G.rect(6 - cx, 52 - cy, 58 - cx, 53 - cy, "p2"); G.line(6 - cx, 61 - cy, 58 - cx, 61 - cy, "p4")
  -- la túnica, larga hasta el pedestal
  for y=20,51 do local half = math.floor(7 + (y - 20) * 0.45); G.rect(32 - half - cx, y - cy, 32 + half - cx, y - cy, (y % 6 == 0) and "p3" or "p2") end
  -- el velo que le tapa la cara entera
  G.ellipse(32 - cx, 13 - cy, 8, 9, "p1"); G.rect(24 - cx, 13 - cy, 40 - cx, 26 - cy, "p1")
  for y=16,26,3 do G.line(25 - cx, y - cy, 39 - cx, y - cy, "p2") end
  -- las manos sostienen una vela de verdad, encendida
  G.ellipse(32 - cx, 34 - cy, 5, 3, "p1"); G.rect(31 - cx, 26 - cy, 33 - cx, 33 - cy, "b1")
  G.ellipse(32 - cx, 23 - cy, 1.5, 2.5, "g2"); G.px(32 - cx, 23 - cy, "an1")
  -- grietas de mil años
  G.line(26 - cx, 38 - cy, 30 - cx, 46 - cy, "p4"); G.line(38 - cx, 30 - cy, 36 - cx, 40 - cy, "p4")
end
tile("estatua_0_0", false, true, function(G) estatua(G, 0, 0) end)
tile("estatua_0_1", false, true, function(G) estatua(G, 32, 0) end)
tile("estatua_1_0", true, false, function(G) estatua(G, 0, 32) end)
tile("estatua_1_1", true, false, function(G) estatua(G, 32, 32) end)
-- el Trono de Huesos (2x2): el respaldo de cráneos y costillas se ve sobre el héroe, el asiento choca
local function trono(G, cx, cy)
  G.rect(4 - cx, 52 - cy, 60 - cx, 61 - cy, "h3"); G.line(4 - cx, 52 - cy, 60 - cx, 52 - cy, "h1")
  -- respaldo: costillas en abanico y una corona de cráneos
  for i=0,8 do local x = 14 + i * 4.5; G.thick(32 - cx, 40 - cy, x - cx, 10 - cy + math.abs(i - 4) * 2, 2, i % 2 == 0 and "h1" or "h2") end
  for i=0,4 do craneo(G, 13 + i * 8 - cx, 4 + math.abs(i - 2) * 2 - cy, i == 2 and "e1" or "K") end
  G.rect(12 - cx, 38 - cy, 52 - cx, 41 - cy, "o2"); G.line(12 - cx, 38 - cy, 52 - cx, 38 - cy, "o1")
  -- asiento con terciopelo rojo gastado y patas de fémures
  G.rect(14 - cx, 42 - cy, 50 - cx, 48 - cy, "r1"); G.rect(14 - cx, 42 - cy, 50 - cx, 43 - cy, "r2")
  for _,x in ipairs({14, 48}) do G.rect(x - cx, 42 - cy, x + 2 - cx, 52 - cy, "h2"); G.ellipse(x + 1 - cx, 52 - cy, 2, 1.5, "h1") end
  for _,x in ipairs({10, 54}) do G.rect(x - cx, 30 - cy, x + 2 - cx, 52 - cy, "h2"); craneo(G, x - 2 - cx, 24 - cy) end
end
tile("tumba_0_0", false, true, function(G) trono(G, 0, 0) end)
tile("tumba_0_1", false, true, function(G) trono(G, 32, 0) end)
tile("tumba_1_0", true, false, function(G) trono(G, 0, 32) end)
tile("tumba_1_1", true, false, function(G) trono(G, 32, 32) end)

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
  spr:saveAs(dir .. "/trono_huesos/tileset_trono_huesos.aseprite")
  if png then spr:saveCopyAs(png .. "/tileset_trono_huesos.png") end
  spr:close()
  local fh = io.open(dir .. "/tileset_trono_huesos.json", "w")
  fh:write(string.format('{"tileSize":32,"columns":%d,"count":%d,"tiles":[%s]}', COLS, #TILES, table.concat(meta, ",")))
  fh:close()
end

-- =====================================================================================
-- Vela negra de control (32x32): 0 apagada sobre su candelabro de hueso; 1-4 encendida, llama azul
-- =====================================================================================
do
  local frames, durs = {}, {}
  for i=0,4 do
    local G = newGrid(32, 32)
    -- candelabro: un cráneo boca arriba sobre un fémur
    G.ellipse(16,29,10,2,"a4"); G.rect(14,22,18,28,"h2"); G.rect(14,22,14,28,"h1"); G.ellipse(16,28,5,2,"h3")
    craneo(G, 12, 16)
    -- la vela de cera negra
    G.rect(13,8,19,17,"b1"); G.rect(13,8,14,17,"c2"); G.rect(18,8,19,17,"b2")
    G.line(15,9,15,13,"c3"); G.px(19,12,"b2"); G.rect(16,5,16,8,"c5")
    local lit = i > 0
    if lit then
      local s = i % 2
      G.ellipse(16, 3 - s, 2.5, 4, "g2"); G.ellipse(16, 3 - s, 1.2, 2.5, "an1"); G.px(16, 0, "g1")
      -- chispas de alma que suben y el brillo alrededor
      G.px(9 + s, 6 - (i % 3), "w1"); G.px(23 - s, 3 + (i % 2), "w1"); G.px(25, 9 - i, "w2")
      for a=0,359,30 do G.px(16 + 9 * math.cos(math.rad(a + i * 10)), 6 + 6 * math.sin(math.rad(a + i * 10)), "g3") end
    else
      G.line(16, 4, 16, 2, "c4")
    end
    frames[#frames+1] = G; durs[#durs+1] = 180
  end
  saveSheet("vela_negra", 32, 32, frames, durs, {{"apagada",1,1},{"encendida",2,5}})
end

-- =====================================================================================
-- Puerta de hueso de la Sala del Trono (128x64): 0-1 sellada (el ojo del eclipse late), 2 abierta
-- =====================================================================================
do
  local frames = {}
  for i=0,2 do
    local G = newGrid(128, 64)
    -- arco de piedra con cráneos en la clave
    G.rect(0,8,127,63,"c3")
    G.rect(0,8,127,13,"c2"); G.line(0,8,127,8,"c1"); G.line(0,13,127,13,"c6")
    G.rect(0,14,13,63,"c2"); G.rect(114,14,127,63,"c2"); G.line(13,14,13,63,"c6"); G.line(114,14,114,63,"c1")
    for x=2,120,9 do craneo(G, x, 1) end
    G.rect(14,14,113,63,"c6")
    if i < 2 then
      -- dos hojas hechas de huesos largos atados con tiras de oro, y el ojo del eclipse que las sella
      G.rect(16,14,63,63,"h3"); G.rect(64,14,111,63,"h3")
      for x=17,110,4 do if x ~= 63 then G.rect(x, 14, x + 2, 63, "h2"); G.line(x, 14, x, 63, "h1") end end
      G.line(63,14,63,63,"h4"); G.line(64,14,64,63,"h4")
      for _,y in ipairs({22, 50}) do G.rect(16, y, 111, y + 2, "o3"); G.line(16, y, 111, y, "o2") end
      G.rect(16,58,111,63,"c3"); G.line(16,58,111,58,"c2")
      local glow = i == 0 and "e1" or "e2"
      G.ellipse(64,36,13,9,"e3"); G.ellipse(64,36,10,6,glow); G.ellipse(64,36,4,4,"b2"); G.px(62,34,"W")
      G.line(51,36,40,30,"e3"); G.line(77,36,88,42,"e3"); G.line(54,42,44,52,"e3"); G.line(74,30,86,20,"e3")
    else
      -- abierta: las hojas recogidas y el trono al fondo, con la luz azul de las almas
      G.rect(14,14,22,63,"h3"); G.rect(105,14,113,63,"h3")
      for k=0,3 do G.rect(36 + k*3, 50 + k*3, 92 - k*3, 51 + k*3, "c5") end
      G.ellipse(64,40,20,10,"w3"); G.ellipse(64,40,12,5,"g3")
      for x=52,76,6 do G.thick(64, 44, x, 26, 2, "h3") end
    end
    -- velas negras a los lados
    for _,x in ipairs({6, 121}) do G.rect(x-1,26,x+1,34,"b1"); G.ellipse(x,23,1.5,2.5,"g2"); G.px(x,22,"an1") end
    frames[#frames+1] = G
  end
  saveSheet("puerta_hueso", 128, 64, frames, {500, 500, 500}, {{"sellada",1,2},{"abierta",3,3}}, {outline=false})
end
