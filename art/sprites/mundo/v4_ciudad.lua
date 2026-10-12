-- ---------------------------------------------------------------------------------------
-- v4 (Aurelia, la capital): adoquines y canales con borde de piedra, losas y mosaico de la
-- plaza, casas con entramado de madera, casas de las órdenes de clase, catedral de Aethra,
-- posada, banco, lonja, forja enana, barrio élfico, castillo, muralla y decoración urbana.
-- ---------------------------------------------------------------------------------------

-- adoquines: piedras redondeadas con juntas, algunas con musgo
local function cobble(G, seed, moss)
  G.rect(0,0,31,31,"k3")
  for row=0,5 do
    local y0 = row * 6 - 1
    local off = (row % 2) * 4
    for col=-1,4 do
      local x0 = col * 8 + off
      local n = noise(col + 7, row + 3, seed)
      local c = n < 35 and "k1" or (n < 80 and "k2" or "x1")
      G.rect(x0 + 1, y0 + 1, x0 + 6, y0 + 4, c)
      G.px(x0 + 1, y0 + 1, "k3"); G.px(x0 + 6, y0 + 1, "k3"); G.px(x0 + 1, y0 + 4, "k3"); G.px(x0 + 6, y0 + 4, "k3")
      G.px(x0 + 2, y0 + 2, "m1")
      if moss and n % 7 == 0 then G.px(x0 + 3, y0 + 5, "o2"); G.px(x0 + 4, y0 + 5, "o1") end
    end
  end
end
TILES[#TILES+1] = {"adoquin", function(G) cobble(G, 3, false) end}
TILES[#TILES+1] = {"adoquin_b", function(G) cobble(G, 9, false) end}
TILES[#TILES+1] = {"adoquin_musgo", function(G) cobble(G, 5, true) end}

-- adoquín con bordillo: donde el vecino no es calle, una franja de pasto detrás de la piedra
local function cobbleEdge(mask)
  return function(G)
    cobble(G, 11 + mask, false)
    sideBand(G, mask, function() return 6 end, function(x, y) G.px(x, y, "k4") end)
    sideBand(G, mask, function() return 5 end, function(x, y) G.px(x, y, "sd") end)
    sideBand(G, mask, function() return 4 end, function(x, y) grassPx(G, x, y, 23) end)
  end
end
for m=0,15 do TILES[#TILES+1] = {"adoquin_" .. m, cobbleEdge(m)} end

-- canal: agua entre muros de piedra
local function canalTile(mask)
  return function(G)
    G.rect(0,0,31,31,"a2")
    for _,p in ipairs({{5,9},{19,6},{11,20},{23,25}}) do G.rect(p[1],p[2],p[1]+4,p[2],"a3"); G.rect(p[1]+1,p[2]+1,p[1]+3,p[2]+1,"a1") end
    sideBand(G, mask, function() return 8 end, function(x, y) G.px(x, y, "a4") end)
    sideBand(G, mask, function() return 7 end, function(x, y) G.px(x, y, "sk") end)
    sideBand(G, mask, function() return 6 end, function(x, y) G.px(x, y, "sd") end)
    sideBand(G, mask, function() return 4 end, function(x, y) G.px(x, y, (x + y) % 9 == 0 and "sd" or "sw") end)
  end
end
for m=0,15 do TILES[#TILES+1] = {"canal_" .. m, canalTile(m)} end

-- losas grandes de mármol (plaza, atrio de la catedral)
TILES[#TILES+1] = {"losa", function(G)
  G.rect(0,0,31,31,"m1")
  G.rect(0,15,31,16,"m3"); G.rect(15,0,16,31,"m3"); G.rect(0,0,31,0,"m2"); G.rect(0,0,0,31,"m2")
  for _,p in ipairs({{4,5},{22,8},{7,24},{25,21}}) do G.px(p[1],p[2],"m2") end
  G.px(3,3,"Ph"); G.px(19,19,"Ph")
end}
TILES[#TILES+1] = {"losa_b", function(G)
  G.rect(0,0,31,31,"m2")
  G.rect(0,15,31,16,"m3"); G.rect(15,0,16,31,"m3")
  for _,p in ipairs({{5,4},{20,10},{9,22},{26,26}}) do G.px(p[1],p[2],"m1") end
end}
-- mosaico con rombos azules y dorados (anillo de la plaza del Pilar)
TILES[#TILES+1] = {"mosaico", function(G)
  G.rect(0,0,31,31,"m1")
  for i=0,15 do
    G.px(16 - i, i, "bb"); G.px(15 + i, i, "bb"); G.px(16 - i, 31 - i, "bb"); G.px(15 + i, 31 - i, "bb")
  end
  G.ellipse(15.5,15.5,5,5,"go"); G.ellipse(15.5,15.5,3,3,"bb"); G.ellipse(15.5,15.5,1,1,"Ph")
  for _,p in ipairs({{3,3},{28,3},{3,28},{28,28}}) do G.px(p[1],p[2],"god") end
end}

-- ---------------------------------------------------------------------------------------
-- edificios: generador común (muros, ventanas, puerta y tejado) + detalles de cada uno
-- ---------------------------------------------------------------------------------------
local function wallFill(V, x0, y0, x1, y1, style)
  if style == "yeso" then
    V.rect(x0, y0, x1, y1, "wp"); V.rect(x1 - 3, y0, x1, y1, "wpd")
    for x = x0, x1, 14 do V.rect(x, y0, x + 1, y1, "tb") end
    V.rect(x0, y0, x1, y0 + 1, "tb"); V.rect(x0, (y0 + y1) // 2, x1, (y0 + y1) // 2 + 1, "tb"); V.rect(x0, y1 - 1, x1, y1, "tb")
  elseif style == "piedra" then
    V.rect(x0, y0, x1, y1, "sw"); V.rect(x1 - 3, y0, x1, y1, "sd")
    for y = y0, y1, 6 do V.rect(x0, y, x1, y, "sd"); for x = x0 + ((y - y0) // 6 % 2) * 6, x1, 12 do V.rect(x, y, x, y + 6, "sd") end end
  elseif style == "marmol" then
    V.rect(x0, y0, x1, y1, "m1"); V.rect(x1 - 3, y0, x1, y1, "m2")
    for y = y0, y1, 8 do V.rect(x0, y, x1, y, "m2") end
  elseif style == "oscuro" then
    V.rect(x0, y0, x1, y1, "n"); V.rect(x1 - 3, y0, x1, y1, "b")
    for x = x0, x1, 5 do V.rect(x, y0, x, y1, "b") end
  elseif style == "enano" then
    V.rect(x0, y0, x1, y1, "sd"); V.rect(x1 - 3, y0, x1, y1, "sk")
    for y = y0, y1, 7 do V.rect(x0, y, x1, y, "sk"); for x = x0 + ((y - y0) // 7 % 2) * 7, x1, 14 do V.rect(x, y, x, y + 7, "sk") end end
  elseif style == "elfico" then
    V.rect(x0, y0, x1, y1, "Ph"); V.rect(x1 - 3, y0, x1, y1, "p")
    for x = x0 + 6, x1, 16 do for y = y0, y1, 3 do V.px(x + (y // 3) % 2, y, "lp") end end
  end
end

local function window(V, x, y, glow)
  V.rect(x - 1, y - 1, x + 8, y + 10, "tb")
  V.rect(x, y, x + 7, y + 9, glow and "wn" or "gl")
  V.rect(x, y + 4, x + 7, y + 4, "tb"); V.rect(x + 3, y, x + 4, y + 9, "tb")
  V.px(x + 1, y + 1, "Ph"); V.rect(x - 1, y + 10, x + 8, y + 11, "sd")
end

local function door(V, cx, y1, w, h, c, arch)
  local x0, x1 = cx - w // 2, cx + w // 2
  V.rect(x0 - 2, y1 - h - 2, x1 + 2, y1, "tb")
  if arch then V.ellipse(cx, y1 - h, w // 2 + 2, 5, "tb"); V.ellipse(cx, y1 - h, w // 2, 4, c) end
  V.rect(x0, y1 - h, x1, y1, c); V.rect(cx, y1 - h, cx, y1, "b"); V.px(cx - 2, y1 - h // 2, "go"); V.px(cx + 2, y1 - h // 2, "go")
end

-- tejado a dos aguas (triángulo con tejas) o a cuatro aguas (trapecio)
local function roof(V, W, top, bottom, c1, c2, hip)
  for y = top, bottom do
    local half
    if hip then half = math.min(W // 2 + 2, 14 + math.floor((y - top) * 1.6)) else half = math.floor((y - top) * (W / 2 + 3) / (bottom - top)) end
    local cx = W // 2
    V.rect(cx - half, y, cx + half, y, ((y - top) // 3) % 2 == 0 and c1 or c2)
    V.px(cx - half, y, c2)
  end
  V.rect(2, bottom + 1, W - 3, bottom + 2, "sk")
end

local function building(name, w, h, o)
  addGrid(name, w, h, function(V)
    local W, H = w * 32, h * 32
    local wallTop = o.wallTop or math.floor(H * 0.42)
    V.ellipse(W // 2, H - 4, W // 2 - 2, 5, "c4")
    wallFill(V, 4, wallTop, W - 5, H - 3, o.wall)
    -- ventanas en dos filas si hay altura
    local rows = o.rows or 1
    for r = 0, rows - 1 do
      local wy = wallTop + 8 + r * 22
      for x = 12, W - 22, o.winStep or 22 do
        if math.abs(x + 4 - W // 2) > (o.doorW or 14) // 2 + 6 or r < rows - 1 then window(V, x, wy, o.glow) end
      end
    end
    door(V, W // 2, H - 3, o.doorW or 14, o.doorH or 20, o.doorC or "B", o.arch)
    if o.roof then roof(V, W, o.roofTop or 2, wallTop, o.roof[1], o.roof[2], o.hip) end
    if o.chimney then V.rect(W - 26, o.roofTop or 4, W - 18, wallTop - 10, "sd"); V.rect(W - 27, (o.roofTop or 4) - 1, W - 17, (o.roofTop or 4) + 1, "sk") end
    if o.extra then o.extra(V, W, H, wallTop) end
  end)
end

-- casas del pueblo
building("casa_roja", 3, 3, {wall="yeso", roof={"rf","rd"}, chimney=true})
building("casa_azul", 3, 3, {wall="yeso", roof={"pb","pbd"}})
building("casa_verde", 3, 3, {wall="yeso", roof={"pg","pgd"}, chimney=true})
building("casa_piedra", 3, 3, {wall="piedra", roof={"pz","pzd"}, chimney=true})
building("casa_alta_a", 2, 3, {wall="yeso", roof={"rf","rd"}, rows=2, wallTop=30, winStep=18})
building("casa_alta_b", 2, 3, {wall="piedra", roof={"pb","pbd"}, rows=2, wallTop=30, winStep=18})

-- posada El Grifo Dorado: balcón con flores y jarra pintada
building("posada", 4, 3, {wall="yeso", roof={"rf","rd"}, hip=true, chimney=true, glow=true, doorW=18, arch=true, extra=function(V, W, H, wt)
  V.rect(10, wt + 20, W - 11, wt + 22, "B"); for x = 12, W - 12, 4 do V.rect(x, wt + 22, x, wt + 28, "b") end
  for x = 14, W - 16, 10 do V.ellipse(x, wt + 19, 3, 2, "fr"); V.px(x + 2, wt + 18, "fl") end
  V.ellipse(W // 2, wt + 6, 7, 5, "go"); V.rect(W // 2 - 4, wt + 4, W // 2 + 3, wt + 10, "Y"); V.rect(W // 2 + 4, wt + 6, W // 2 + 6, wt + 8, "Y"); V.rect(W // 2 - 4, wt + 3, W // 2 + 3, wt + 4, "fw")
end})

-- cuartel del Acero (guerrero): almenas, estandartes rojos y espadas cruzadas
building("cuartel", 4, 3, {wall="piedra", wallTop=22, doorW=20, doorH=24, doorC="b", arch=true, extra=function(V, W, H, wt)
  V.rect(2, 8, W - 3, wt, "sd"); V.rect(2, 8, W - 3, 10, "sw")
  for x = 2, W - 8, 12 do V.rect(x, 2, x + 6, 9, "sd"); V.rect(x, 2, x + 6, 3, "sw") end
  for _, x in ipairs({20, W - 21}) do V.rect(x - 5, wt + 4, x + 5, wt + 34, "R"); V.rect(x - 5, wt + 4, x + 5, wt + 6, "go"); V.rect(x - 5, wt + 34, x, wt + 38, "R"); V.px(x, wt + 18, "go"); V.px(x - 1, wt + 19, "go"); V.px(x + 1, wt + 19, "go") end
  for i = 0, 12 do V.px(W // 2 - 6 + i, wt + 4 + i, "S"); V.px(W // 2 + 6 - i, wt + 4 + i, "S") end
  V.rect(W // 2 - 8, wt + 14, W // 2 - 4, wt + 15, "go"); V.rect(W // 2 + 4, wt + 14, W // 2 + 8, wt + 15, "go")
end})

-- torre Arcana (mago): torre redonda con tejado cónico estrellado y ventanas que brillan
addGrid("torre_arcana", 2, 4, function(V)
  local W, H = 64, 128
  V.ellipse(32, H - 4, 26, 5, "c4")
  for y = 44, H - 3 do local half = 22; V.rect(32 - half, y, 32 + half, y, "sw"); V.rect(32 + half - 6, y, 32 + half, y, "sd"); V.px(32 - half, y, "sd") end
  for y = 50, H - 6, 10 do V.rect(10, y, 54, y, "sd") end
  V.rect(10, 44, 54, 47, "pv")
  for _, y in ipairs({58, 80}) do V.ellipse(32, y, 5, 7, "tb"); V.ellipse(32, y, 3, 5, "rn"); V.px(31, y - 3, "Ph") end
  door(V, 32, H - 3, 12, 18, "pvd", true)
  for y = 2, 46 do local half = math.floor((y - 2) * 0.62); V.rect(32 - half, y, 32 + half, y, ((y // 4) % 2 == 0) and "pv" or "pvd") end
  for _, p in ipairs({{30, 16}, {24, 32}, {38, 28}, {33, 40}, {26, 42}}) do V.px(p[1], p[2], "go"); V.px(p[1] + 1, p[2], "Y") end
  V.rect(31, 0, 32, 4, "go")
end)

-- campo de tiro del Halcón (arquero): casa de tejado verde con arco pintado
building("casa_arqueros", 3, 3, {wall="yeso", roof={"pg","pgd"}, extra=function(V, W, H, wt)
  for i = 0, 14 do local a = (i / 14) * math.pi; V.px(W // 2 - 10 + math.floor(math.sin(a) * 6), wt + 6 + i, "B") end
  V.rect(W // 2 - 9, wt + 6, W // 2 - 9, wt + 20, "W"); V.rect(W // 2 - 9, wt + 13, W // 2 + 6, wt + 13, "b"); V.px(W // 2 + 7, wt + 13, "S")
end})

-- la Sombra Callada (pícaro): madera oscura, tejado de pizarra y farol violeta
building("taberna_sombra", 3, 3, {wall="oscuro", roof={"pz","pzd"}, doorC="l", extra=function(V, W, H, wt)
  V.rect(W // 2 + 12, wt + 18, W // 2 + 13, wt + 30, "a"); V.rect(W // 2 + 10, wt + 30, W // 2 + 15, wt + 36, "a"); V.rect(W // 2 + 11, wt + 31, W // 2 + 14, wt + 35, "fv")
  V.ellipse(W // 2, wt + 8, 5, 5, "go"); V.ellipse(W // 2 + 2, wt + 7, 4, 4, "n")
end})

-- capilla de la Luz (sacerdote): mármol, tejado azul, campanario y sol dorado
building("capilla", 3, 3, {wall="marmol", roof={"pb","pbd"}, doorC="go", arch=true, wallTop=40, roofTop=12, extra=function(V, W, H, wt)
  V.rect(W // 2 - 6, 0, W // 2 + 5, 16, "m1"); V.rect(W // 2 - 6, 0, W // 2 + 5, 2, "pbd"); V.ellipse(W // 2, 9, 3, 3, "go"); V.px(W // 2, 6, "god")
  V.ellipse(W // 2, wt + 10, 6, 6, "go"); for i = 0, 7 do local a = i * math.pi / 4; V.px(W // 2 + math.floor(math.cos(a) * 9), wt + 10 + math.floor(math.sin(a) * 9), "go") end
end})

-- catedral de Aethra: rosetón, dos agujas, portón dorado y escalinata
addGrid("catedral", 6, 6, function(V)
  local W, H = 192, 192
  V.ellipse(96, H - 4, 92, 6, "c4")
  -- nave
  V.rect(14, 70, W - 15, H - 14, "m1"); V.rect(W - 22, 70, W - 15, H - 14, "m2")
  for y = 76, H - 16, 10 do V.rect(14, y, W - 15, y, "m2") end
  -- contrafuertes
  for _, x in ipairs({14, 48, 136, W - 24}) do V.rect(x, 74, x + 8, H - 14, "m2"); V.rect(x, 74, x + 2, H - 14, "Ph") end
  -- tejado de la nave
  for y = 40, 72 do local half = 60 + (y - 40); V.rect(96 - half, y, 96 + half, y, ((y // 4) % 2 == 0) and "pb" or "pbd") end
  -- agujas
  for _, cx in ipairs({30, W - 31}) do
    V.rect(cx - 14, 46, cx + 14, H - 14, "m1"); V.rect(cx + 8, 46, cx + 14, H - 14, "m2")
    for y = 2, 50 do local half = math.floor((y - 2) * 0.3); V.rect(cx - half, y, cx + half, y, ((y // 5) % 2 == 0) and "pz" or "pzd") end
    V.rect(cx - 1, 0, cx, 4, "go")
    for _, y in ipairs({70, 100, 130}) do V.ellipse(cx, y, 4, 7, "tb"); V.ellipse(cx, y, 2, 5, "gl") end
  end
  -- rosetón de colores
  V.ellipse(96, 96, 24, 24, "m3"); V.ellipse(96, 96, 21, 21, "gl")
  for i = 0, 11 do local a = i * math.pi / 6; for r = 4, 20 do V.px(96 + math.floor(math.cos(a) * r), 96 + math.floor(math.sin(a) * r), ({"R", "go", "bb", "lp"})[i % 4 + 1]) end end
  V.ellipse(96, 96, 6, 6, "go"); V.ellipse(96, 96, 3, 3, "Ph")
  -- portón dorado
  V.ellipse(96, 140, 20, 12, "m3"); V.rect(76, 140, 116, H - 14, "m3"); V.ellipse(96, 141, 17, 10, "god"); V.rect(79, 141, 113, H - 14, "god")
  V.rect(80, 142, 95, H - 15, "go"); V.rect(97, 142, 112, H - 15, "go"); V.rect(96, 140, 96, H - 14, "god")
  -- escalinata
  for i = 0, 3 do V.rect(66 - i * 4, H - 14 + i * 3, 126 + i * 4, H - 12 + i * 3, i % 2 == 0 and "m2" or "m1") end
end)

-- banco Real: columnas, frontón y moneda de oro
building("banco", 4, 3, {wall="marmol", wallTop=34, doorC="god", arch=false, doorW=16, extra=function(V, W, H, wt)
  for y = 6, wt do local half = math.floor((y - 6) * (W / 2) / (wt - 6)); V.rect(W // 2 - half, y, W // 2 + half, y, "m2") end
  V.rect(4, wt - 2, W - 5, wt + 2, "m3")
  V.ellipse(W // 2, wt - 12, 8, 7, "go"); V.ellipse(W // 2, wt - 12, 5, 4, "Y"); V.rect(W // 2 - 1, wt - 15, W // 2, wt - 9, "god")
  for _, x in ipairs({14, 34, W - 41, W - 21}) do V.rect(x, wt + 4, x + 6, H - 6, "m1"); V.rect(x + 5, wt + 4, x + 6, H - 6, "m3"); V.rect(x - 1, wt + 2, x + 7, wt + 4, "m3") end
end})

-- lonja del mercado: tejado sobre columnas, toldos y género
addGrid("lonja", 4, 3, function(V)
  local W, H = 128, 96
  V.ellipse(64, H - 4, 62, 5, "c4")
  roof(V, W, 2, 34, "rf", "rd", true)
  for _, x in ipairs({8, 40, 84, 116}) do V.rect(x, 36, x + 4, H - 6, "tb") end
  V.rect(6, 34, W - 7, 38, "B")
  for x = 6, W - 7 do local s = (x // 6) % 2 == 0; for y = 39, 44 do V.px(x, y, s and "R" or "fw") end end
  V.rect(12, 62, W - 13, 72, "B"); V.rect(12, 62, W - 13, 63, "t1")
  for i, c in ipairs({"R", "Y", "lp", "au", "fv", "C", "fr", "go"}) do V.ellipse(18 + (i - 1) * 13, 59, 4, 3, c) end
  V.rect(12, 72, W - 13, 80, "b")
end)

-- forja enana: piedra oscura, chimenea humeante y puerta encendida
building("forja_enana", 3, 3, {wall="enano", roof={"pz","pzd"}, hip=true, doorC="O", doorW=18, arch=true, extra=function(V, W, H, wt)
  V.rect(W - 30, 0, W - 18, wt - 6, "sk"); V.rect(W - 31, 0, W - 17, 3, "sd"); V.ellipse(W - 24, 0, 6, 3, "s")
  V.rect(W // 2 - 7, H - 21, W // 2 + 7, H - 4, "Oh"); V.rect(W // 2 - 5, H - 15, W // 2 + 5, H - 4, "Y")
  V.rect(W // 2 - 8, wt + 6, W // 2 + 8, wt + 9, "d"); V.rect(W // 2 - 4, wt + 10, W // 2 + 4, wt + 12, "d"); V.rect(W // 2 - 11, wt + 6, W // 2 - 8, wt + 8, "d")
end})

-- casas élficas: madera blanca, ventanas en arco y tejado de hojas plateadas
addGrid("casa_elfica", 3, 3, function(V)
  local W, H = 96, 96
  V.ellipse(48, H - 4, 44, 5, "c4")
  wallFill(V, 10, 42, W - 11, H - 4, "elfico")
  for _, x in ipairs({22, W - 28}) do V.ellipse(x, 58, 5, 8, "tb"); V.ellipse(x, 59, 4, 7, "rn"); V.px(x - 1, 54, "Ph") end
  door(V, 48, H - 4, 14, 22, "B", true)
  V.ellipse(48, 30, 46, 22, "agd"); V.ellipse(46, 26, 42, 18, "ag"); V.ellipse(36, 18, 18, 9, "agh")
  for _, p in ipairs({{20, 30}, {70, 22}, {50, 12}, {82, 34}, {14, 40}}) do V.ellipse(p[1], p[2], 5, 3, "agd") end
  for _, p in ipairs({{26, 22}, {60, 30}, {74, 16}}) do V.px(p[1], p[2], "rn") end
end)
-- árbol plateado (barrio élfico)
addGrid("arbol_plata", 3, 3, function(V)
  local W, H = 96, 96
  V.ellipse(48, H - 6, 30, 6, "c4")
  V.rect(42, 50, 54, H - 6, "m3"); V.rect(42, 50, 45, H - 6, "Ph"); V.rect(36, H - 10, 60, H - 6, "m3")
  V.ellipse(48, 36, 44, 32, "agd"); V.ellipse(46, 32, 40, 28, "ag"); V.ellipse(38, 24, 24, 16, "agh")
  for _, p in ipairs({{20, 40}, {74, 30}, {50, 10}, {30, 54}, {68, 52}, {58, 22}, {16, 26}}) do V.ellipse(p[1], p[2], 6, 4, "agd") end
  for _, p in ipairs({{28, 30}, {62, 40}, {44, 18}, {72, 22}, {24, 50}, {54, 56}}) do V.px(p[1], p[2], "rn"); V.px(p[1] + 1, p[2], "Ph") end
end)

-- castillo (fondo, al norte detrás de la catedral)
addGrid("castillo", 8, 4, function(V)
  local W, H = 256, 128
  V.rect(0, 40, W - 1, H - 1, "sw")
  for y = 40, H - 1, 8 do V.rect(0, y, W - 1, y, "sd"); for x = ((y - 40) // 8 % 2) * 8, W - 1, 16 do V.rect(x, y, x, y + 8, "sd") end end
  for x = 0, W - 1, 12 do V.rect(x, 34, x + 6, 41, "sw"); V.rect(x, 34, x + 6, 35, "Ph") end
  -- torre del homenaje
  V.rect(92, 10, 163, H - 1, "sw"); V.rect(150, 10, 163, H - 1, "sd")
  for y = 0, 14 do local half = math.floor(y * 2.6); V.rect(128 - half, y, 128 + half, y, ((y // 3) % 2 == 0) and "pb" or "pbd") end
  for _, x in ipairs({104, 124, 144}) do V.rect(x, 40, x + 7, 54, "K"); V.rect(x + 1, 41, x + 6, 53, "wn") end
  -- torres de las esquinas
  for _, cx in ipairs({18, W - 19}) do
    V.rect(cx - 16, 20, cx + 16, H - 1, "sw"); V.rect(cx + 8, 20, cx + 16, H - 1, "sd")
    for y = 0, 22 do local half = math.floor(y * 0.75); V.rect(cx - half, y, cx + half, y, ((y // 3) % 2 == 0) and "pb" or "pbd") end
    V.rect(cx, -2, cx + 1, 2, "go")
  end
  -- portón y estandartes
  V.ellipse(128, 96, 18, 12, "sk"); V.rect(110, 96, 146, H - 1, "sk"); V.rect(113, 97, 143, H - 1, "b")
  for _, x in ipairs({70, 186}) do V.rect(x - 6, 50, x + 6, 96, "M"); V.rect(x - 6, 50, x + 6, 53, "go"); V.ellipse(x, 70, 4, 4, "go"); V.rect(x - 6, 96, x, 102, "M") end
end)

-- torre de la muralla
addGrid("torre_muralla", 2, 2, function(V)
  V.ellipse(32, 60, 28, 4, "c4")
  V.rect(4, 10, 59, 62, "sw"); V.rect(48, 10, 59, 62, "sd")
  for y = 14, 60, 8 do V.rect(4, y, 59, y, "sd") end
  for x = 4, 54, 11 do V.rect(x, 2, x + 6, 11, "sw"); V.rect(x, 2, x + 6, 3, "Ph") end
  V.rect(26, 24, 31, 38, "K")
end)

-- muralla vista de lado (bordes este y oeste)
deco("muro_v", function(G)
  G.rect(4, 0, 27, 31, "sw"); G.rect(20, 0, 27, 31, "sd"); G.rect(4, 0, 6, 31, "Ph")
  for y = 0, 31, 8 do G.rect(4, y, 27, y, "sd") end
  for y = 2, 31, 8 do G.rect(0, y, 4, y + 4, "sw"); G.rect(27, y, 31, y + 4, "sd") end
end)

-- decoración urbana
deco("banco_plaza", function(G)
  G.ellipse(16, 27, 13, 2, "c4"); G.rect(3, 14, 28, 17, "B"); G.rect(3, 14, 28, 14, "t1"); G.rect(3, 19, 28, 22, "B"); G.rect(3, 22, 28, 22, "b")
  for _, x in ipairs({5, 25}) do G.rect(x, 22, x + 2, 27, "a") end
end)
deco("maceta", function(G)
  G.ellipse(16, 28, 8, 2, "c4"); G.rect(10, 18, 22, 28, "ad"); G.rect(10, 18, 22, 19, "au"); G.rect(19, 18, 22, 28, "rd")
  G.ellipse(16, 13, 8, 6, "o2"); G.ellipse(14, 11, 5, 4, "o1")
  for _, p in ipairs({{12, 10, "fr"}, {18, 8, "fl"}, {20, 13, "fr"}, {14, 15, "fv"}}) do G.px(p[1], p[2], p[3]); G.px(p[1] + 1, p[2], p[3]) end
end)
deco("seto", function(G)
  G.ellipse(16, 28, 15, 2, "c4"); G.rect(0, 10, 31, 27, "o2"); G.rect(0, 10, 31, 13, "o1"); G.rect(0, 24, 31, 27, "o3")
  for _, p in ipairs({{4, 15}, {12, 19}, {22, 16}, {27, 21}}) do G.px(p[1], p[2], "o4") end
end)
deco("diana", function(G)
  G.ellipse(16, 28, 9, 2, "c4"); G.rect(14, 20, 17, 28, "b")
  G.ellipse(16, 13, 11, 11, "B"); G.ellipse(16, 13, 9, 9, "fw"); G.ellipse(16, 13, 6, 6, "R"); G.ellipse(16, 13, 3, 3, "fw"); G.ellipse(16, 13, 1, 1, "R")
  for i = 0, 5 do G.px(22 + i, 8 - i, "b") end; G.px(28, 2, "W")
end)
deco("cerca_hierro", function(G)
  G.rect(0, 12, 31, 13, "a"); G.rect(0, 24, 31, 25, "a")
  for x = 1, 31, 5 do G.rect(x, 8, x + 1, 28, "a"); G.px(x, 7, "go") end
end)
deco("puente_piedra_h", function(G)
  G.rect(0, 0, 31, 31, "sw"); for y = 4, 28, 6 do G.rect(0, y, 31, y, "sd") end
  G.rect(0, 0, 31, 3, "sk"); G.rect(0, 28, 31, 31, "sk"); G.rect(0, 1, 31, 2, "m1"); G.rect(0, 29, 31, 30, "m1")
end)
deco("puente_piedra_v", function(G)
  G.rect(0, 0, 31, 31, "sw"); for x = 4, 28, 6 do G.rect(x, 0, x, 31, "sd") end
  G.rect(0, 0, 3, 31, "sk"); G.rect(28, 0, 31, 31, "sk"); G.rect(1, 0, 2, 31, "m1"); G.rect(29, 0, 30, 31, "m1")
end)
deco("guirnalda", function(G)
  for x = 0, 31 do local y = 6 + math.floor(math.sin(x / 31 * math.pi) * 5); G.px(x, y, "b") end
  for i, c in ipairs({"R", "go", "bb", "lp", "fr"}) do local x = (i - 1) * 6 + 3; local y = 7 + math.floor(math.sin(x / 31 * math.pi) * 5); G.rect(x - 2, y, x + 2, y, c); G.rect(x - 1, y + 1, x + 1, y + 2, c); G.px(x, y + 3, c) end
end)
addGrid("estatua", 1, 2, function(V)
  V.ellipse(16, 60, 12, 3, "c4"); V.rect(5, 46, 26, 60, "m2"); V.rect(5, 46, 26, 48, "m1")
  V.rect(10, 22, 21, 45, "sd"); V.rect(10, 22, 13, 45, "sw"); V.ellipse(16, 16, 6, 6, "sd"); V.ellipse(15, 15, 4, 4, "sw")
  V.rect(22, 4, 23, 40, "sw"); V.rect(19, 14, 26, 15, "sd")
end)
-- puestos del mercado con toldos de colores
local function stall(stripe, stripeD)
  return function(V)
    V.ellipse(32, 59, 28, 4, "c4")
    V.rect(6, 34, 57, 55, "B"); V.rect(6, 34, 57, 36, "t1"); V.rect(6, 52, 57, 55, "b")
    V.rect(8, 10, 10, 52, "b"); V.rect(53, 10, 55, 52, "b")
    for x = 4, 59 do local s = math.floor(x / 6) % 2 == 0; for y = 6, 16 do V.px(x, y, s and stripe or "fw") end
      if x % 6 < 3 then V.px(x, 17, s and stripe or "fw"); V.px(x, 18, s and stripeD or "p") end end
  end
end
addBig("puesto_rojo", function(V) stall("R", "r")(V); V.ellipse(18, 31, 5, 4, "R"); V.ellipse(30, 31, 5, 4, "au"); V.ellipse(44, 31, 5, 4, "lp") end)
addBig("puesto_verde", function(V) stall("lp", "o2")(V); V.rect(14, 26, 22, 33, "fw"); V.rect(28, 26, 36, 33, "Y"); V.ellipse(46, 31, 5, 4, "fv") end)

-- diligencia: carruaje con caballo (viaje rápido entre la capital y las aldeas)
addGrid("diligencia", 3, 2, function(V)
  V.ellipse(48, 60, 44, 4, "c4")
  -- caballo a la izquierda
  V.ellipse(18, 36, 12, 7, "B"); V.ellipse(18, 35, 10, 5, "N"); V.rect(8, 18, 13, 34, "B"); V.ellipse(8, 18, 5, 4, "B")
  V.px(6, 17, "K"); V.rect(4, 19, 5, 20, "b"); V.rect(9, 12, 10, 15, "b"); V.rect(12, 16, 14, 30, "b")
  for _, x in ipairs({10, 14, 22, 26}) do V.rect(x, 42, x + 1, 58, "b"); V.rect(x, 57, x + 2, 58, "K") end
  V.rect(28, 30, 31, 33, "b")
  -- carruaje
  V.rect(34, 14, 90, 46, "M"); V.rect(34, 14, 90, 16, "go"); V.rect(34, 44, 90, 46, "god"); V.rect(84, 14, 90, 46, "m")
  V.rect(32, 8, 92, 13, "b"); V.rect(32, 8, 92, 9, "B")
  V.rect(42, 20, 54, 32, "tb"); V.rect(43, 21, 53, 31, "gl"); V.rect(66, 20, 78, 32, "tb"); V.rect(67, 21, 77, 31, "gl")
  V.rect(58, 18, 62, 42, "m"); V.px(60, 30, "go")
  for _, cx in ipairs({44, 80}) do V.ellipse(cx, 50, 9, 9, "b"); V.ellipse(cx, 50, 6, 6, "B"); V.ellipse(cx, 50, 2, 2, "go"); for i = 0, 3 do local a = i * math.pi / 4; V.px(cx + math.floor(math.cos(a) * 5), 50 + math.floor(math.sin(a) * 5), "b") end end
  -- maletas en el techo
  V.rect(46, 2, 58, 8, "B"); V.rect(46, 2, 58, 3, "t1"); V.rect(64, 4, 74, 8, "au")
end)

-- Puerta Sur de Aurelia ABIERTA: torres a los lados, arco arriba (por encima del héroe) y los
-- portones abiertos contra las paredes; por el medio se pasa caminando a la Pradera
addGrid("puerta_abierta", 4, 3, function(V)
  -- torres
  for _, x0 in ipairs({0, 104}) do
    V.rect(x0, 0, x0 + 23, 95, "sw"); V.rect(x0 + 17, 0, x0 + 23, 95, "sd")
    for y = 0, 95, 8 do V.rect(x0, y, x0 + 23, y, "sd") end
    for x = x0, x0 + 18, 9 do V.rect(x, 0, x + 5, 6, "sk") end
    V.rect(x0 + 8, 18, x0 + 14, 30, "K")
  end
  -- arco sobre el paso (fila de arriba)
  V.rect(24, 0, 103, 22, "sw"); for y = 0, 22, 8 do V.rect(24, y, 103, y, "sd") end
  for x = 24, 100, 12 do V.rect(x, 0, x + 6, 5, "sk") end
  V.ellipse(64, 30, 40, 16, "sw"); V.ellipse(64, 34, 36, 14, "sk")
  -- estandartes del reino colgando del arco
  for _, x in ipairs({40, 88}) do V.rect(x - 5, 6, x + 5, 30, "M"); V.rect(x - 5, 6, x + 5, 8, "Y"); V.px(x, 18, "Y"); V.rect(x - 5, 30, x, 34, "M") end
  -- portones abiertos, pegados a las torres
  V.rect(24, 44, 31, 95, "b"); V.rect(25, 46, 30, 95, "B"); V.rect(24, 60, 31, 61, "d"); V.rect(24, 80, 31, 81, "d")
  V.rect(96, 44, 103, 95, "b"); V.rect(97, 46, 102, 95, "B"); V.rect(96, 60, 103, 61, "d"); V.rect(96, 80, 103, 81, "d")
end)
