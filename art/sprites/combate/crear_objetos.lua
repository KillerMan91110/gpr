-- Íconos de objetos sin arte propio (32x32, mismo estilo que crear_equipo.lua: contorno oscuro
-- automático): pociones y elixires de vida y maná, las comidas que curan de la Pradera y los
-- accesorios (amuletos, collar, brazalete, anillos) hasta el nivel de la Pradera, y los
-- materiales y consumibles del crafteo v2 (frasco, agua, lingote, tabla, cuero, antídoto,
-- tónico y vendaje) y objetos de misión (la llave del Vigía). Los nuevos van siempre al final:
-- el orden es el del atlas.
-- Salida: equipo/objetos.aseprite, equipo/objetos.png (una fila) y equipo/objetos.json (orden).
-- Uso: aseprite -b --script-param dir=D:/Sprites/v2 --script crear_objetos.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local dir = app.params.dir

local PAL = {}
for k, v in pairs({
  K="141420", W="ffffff", pa="f0e6d0",
  gl1="e8f4fa", gl2="a8c4d4", gl3="7890a4",          -- vidrio
  r1="ff8a8a", r2="e0303c", r3="8a1424",              -- líquido de vida
  b1="8ad8ff", b2="2f6fe0", b3="1a3c8a",              -- líquido de maná
  p1="e0a8ff", p2="9a4ad8", p3="5a2490",              -- púrpura (brujo, mezcla)
  v1="d8ffb0", v2="7ad04a", v3="3a8a2a",              -- verde (Pradera)
  co1="c89a60", co2="8a5a30",                         -- corcho
  au1="ffe070", au2="c09030", au3="7a5418",           -- oro
  fe1="c8d0dc", fe2="8a96a8", fe3="555f70",           -- hierro
  wd1="c08850", wd2="8a5a30", wd3="5a3818",           -- madera del cuenco
  st1="c07a40", st2="7a4620", mt="d06050", bn="f0e6d0", -- estofado, carne, hueso
  gs1="b8d860", gs2="6a8a28",                         -- sopa de goblin
  tr1="a0a880", tr2="666e50",                         -- guiso de troll
  po1="7a7e8a", po2="4a4e5a", po3="2e303a",           -- olla de hierro
  rb1="e04a4a", rb2="9a2028",                         -- cinta roja
  aq1="dcf8ff", aq2="8ad8f0", aq3="3a98c8",           -- agua del Pilar
  am1="ffe08a", am2="e8a028", am3="9a5a10",           -- miel
  le1="d09860", le2="9a6438", le3="5e3a1c",           -- cuero tratado
  ln1="e8f0d8", ln2="c0d0a8", ln3="8aa070", lb="8ab8f0", -- lino (fibra, tela y su flor)
  k1="f4e8f0", k2="d8b8e0", k3="a888c0",              -- cuarzo rosado
  y1="f0d070", y2="c89a38", y3="8a6420",              -- trigo y pan
  sp1="b8c86a", sp2="7a8a3a", sp3="4a5a22", sy="ffd23a", -- sapo (glándula) y su veneno
  bz1="e0a868", bz2="b07438", bz3="6e4420",           -- bronce de la guardia
  az1="6a8ad8", az2="3a5aa8", az3="22346e",           -- azul del tabardo del Vigía
  rk1="b8b4c0", rk2="8a8694", rk3="5e5a68", ru="7ff8c8", ru2="3ac898", -- piedra del Círculo y sus runas
  ec1="5a4878", ec2="2e2440", ec3="171222", ev="c890ff", -- cristal de eclipse
  al1="fff4c8", al2="ffd86a",                         -- luz del alba
  -- Montañas Grises: materiales de sus monstruos
  gh1="e4d6b0", gh2="b09c72", gh3="6e5e40",           -- cuerno de cabra
  wl1="f6f9fc", wl2="cad6e6", wl3="94a4bc",           -- pelo de lobo de las nieves
  bt1="9a6a7c", bt2="6a4456", bt3="3a2a40",           -- ala de murciélago
  pv1="ffb04a", pv2="e07a20",                         -- latido de la piedra viva
  ih1="eefcff", ih2="a8e4ff", ih3="5ca2ca", ih4="2e6a96", -- hielo y escarcha
  br1="a87850", br2="704c32", br3="3e2a1a",           -- oso
  tl1="8eae68", tl2="5e7e44", tl3="3a5a2a",           -- troll
  hp1="c2bec8", hp2="8a8694", hp3="5a5664",           -- pluma de arpía
  zz1="fff7a0", zz2="ffd23a",                         -- rayo
  cl1="7a7c94", cl2="4a4c62",                         -- nube de tormenta
  hx1="6a7488", hx2="3c4252", hx3="22252e", hxb="7ec8ff", -- hierro negro y su brillo azulado
  sl1="c8e0ff", sl2="6a9ae0", sl3="2e5aa8", sv="eef4ff",  -- piedra azul del Segundo Sello y su runa de plata
  qm1="3a2a24", qm2="6e5040",                         -- borde quemado de papel
}) do PAL[k] = hex(v) end
-- Volcán Rojo, Costas Muertas y Tundra Eterna: materiales y comidas
for k, v in pairs({
  lv1="ffe070", lv2="ff8a1a", lv3="d0381a", lv4="7a1a14", -- lava y fuego
  ob1="5a4a6e", ob2="2e2638", ob3="1a1522", obh="a890d0", -- obsidiana y su brillo
  su1="fff27a", su2="e0c42a", su3="9a8018",           -- azufre
  as1="b8b0a8", as2="7e7670", as3="4a4440",           -- ceniza
  pm1="eee6cc", pm2="c8bc96", pm3="8e8262",           -- piedra pómez
  sa1="ffa858", sa2="e0662a", sa3="8a3a1a",           -- salamandra
  dc1="d85a44", dc2="9a2e26", dc3="561a18",           -- draco y dragón
  sh1="ffa080", sh2="e8583a", sh3="9a2e22",           -- caparazón de cangrejo
  oc1="9af0e4", oc2="3ab4b8", oc3="1a6e7e", oc4="0e3c4e", -- mar
  cr1="ffb4c0", cr2="ee6a82", cr3="a8304e",           -- coral vivo
  pe1="fffaf2", pe2="e6dade", pe3="aea0b4",           -- nácar y perla
  me1="f4ccff", me2="c484f0", me3="7a44b0",           -- medusa
  ab1="5a4a9a", ab2="2e2462", ab3="161034", abg="7af0e0", -- abismo y su brillo
  ag1="a8dc78", ag2="4e9e54", ag3="2a5c3a",           -- alga
  ta1="4e443a", ta2="2a2420",                         -- alquitrán y tinta
  rs1="c8743e", rs2="7e4426",                         -- óxido
  ce1="9ab062", ce2="5e7e3c", ce3="3a5028",           -- cocodrilo
  os1="d8d2c4", os2="a49c8c", os3="6a6458",           -- concha de ostra
  om1="fcdcca", om2="e0a090",                         -- carne de ostra
  gr1="fff6dc", gr2="e8d4a0", gr3="b09a68",           -- grasa de foca
  ar1="9affc8", ar2="44c8b0", ar3="a070ff",           -- aurora
  mf1="9a6a40", mf2="6a4426", mf3="3e2614",           -- pelo de mamut
  fi1="dcecf8", fi2="8ab0d0", fi3="4a7098",           -- pescado glacial
  pb1="f0e6d2", pb2="c8b896", pb3="8a7a5a",           -- pino blanco
  ry1="b07a4a", ry2="7e5230",                         -- pan de centeno
}) do PAL[k] = hex(v) end

-- ---------------------------------------------------------------- lienzo
local function newGrid(W, H)
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x >= 0 and x < W and y >= 0 and y < H then g[y * W + x] = c end
  end
  function G.get(x, y) return g[y * W + x] end
  function G.rect(x0, y0, x1, y1, c) for y = y0, y1 do for x = x0, x1 do G.px(x, y, c) end end end
  function G.line(x0, y0, x1, y1, c)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
    for i = 0, n do G.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c) end
  end
  function G.thick(x0, y0, x1, y1, w, c)
    local vertical = math.abs(y1 - y0) >= math.abs(x1 - x0)
    for t = 0, w - 1 do
      local o = t - (w - 1) // 2
      if vertical then G.line(x0 + o, y0, x1 + o, y1, c) else G.line(x0, y0 + o, x1, y1 + o, c) end
    end
  end
  -- elipse rellena; fn(x, y) opcional decide el color de cada píxel (nil = no pinta)
  function G.ellipse(cx, cy, rx, ry, c, fn)
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 then
        local col = fn and fn(x, y) or c
        if col then G.px(x, y, col) end
      end
    end end
  end
  function G.erase(cx, cy, rx, ry)
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 and x >= 0 and x < W and y >= 0 and y < H then g[y * W + x] = nil end
    end end
  end
  function G.poly(pts, c, fn)
    local miny, maxy = math.huge, -math.huge
    for _, p in ipairs(pts) do miny = math.min(miny, p[2]); maxy = math.max(maxy, p[2]) end
    for y = math.floor(miny), math.ceil(maxy) do
      local xs = {}
      for i = 1, #pts do
        local a, b = pts[i], pts[i % #pts + 1]
        if (a[2] <= y and b[2] > y) or (b[2] <= y and a[2] > y) then
          xs[#xs + 1] = a[1] + (y - a[2]) * (b[1] - a[1]) / (b[2] - a[2])
        end
      end
      table.sort(xs)
      for i = 1, #xs - 1, 2 do for x = math.ceil(xs[i]), math.floor(xs[i + 1]) do
        local col = fn and fn(x, y) or c
        if col then G.px(x, y, col) end
      end end
    end
  end
  return G
end

local function outline(G)
  local W, H, g, out = G.w, G.h, G.g, {}
  for y = 0, H - 1 do for x = 0, W - 1 do
    if not g[y * W + x] then
      for _, o in ipairs({{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) do
        local nx, ny = x + o[1], y + o[2]
        local n = (nx >= 0 and nx < W and ny >= 0 and ny < H) and g[ny * W + nx]
        if n and n ~= "K" then out[y * W + x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
end

local ICONS = {}
local function icon(name, draw) ICONS[#ICONS + 1] = {name = name, draw = draw} end

-- ---------------------------------------------------------------- pociones
local VIDA = {"r1", "r2", "r3"}
local MANA = {"b1", "b2", "b3"}

-- frasco redondo pequeño con corcho (las "menores")
local function flaskSmall(G, L)
  G.rect(14, 4, 18, 8, "co1"); G.rect(17, 4, 18, 8, "co2"); G.rect(14, 8, 18, 8, "co2")
  G.rect(13, 9, 19, 10, "gl2"); G.rect(14, 9, 15, 10, "gl1")
  G.rect(14, 11, 18, 14, "gl2"); G.rect(15, 11, 15, 14, "gl1")
  G.ellipse(16, 21, 8.5, 8, "gl2")
  G.ellipse(16, 21, 7.2, 6.8, nil, function(x, y)
    if y < 17 then return nil end
    if y == 17 then return L[1] end
    return ((x - 16) + (y - 21) > 5) and L[3] or L[2]
  end)
  -- brillo del vidrio y burbujas
  G.line(10, 17, 10, 22, "gl1"); G.px(11, 15, "W"); G.px(10, 16, "W")
  G.px(18, 20, L[1]); G.px(14, 24, L[1]); G.px(19, 23, L[1])
end

-- botella alta con hombros, anillo dorado y etiqueta (las "mayores")
local function flaskBig(G, L, mark)
  G.rect(13, 2, 19, 5, "co1"); G.rect(17, 2, 19, 5, "co2"); G.rect(12, 5, 20, 5, "co2")
  G.rect(13, 6, 19, 10, "gl2"); G.rect(14, 6, 15, 10, "gl1")
  G.rect(12, 9, 20, 10, "au1"); G.rect(12, 10, 20, 10, "au2")
  local body = {{10, 11}, {22, 11}, {26, 16}, {26, 27}, {24, 29}, {8, 29}, {6, 27}, {6, 16}}
  G.poly(body, "gl2")
  G.poly({{7, 15}, {25, 15}, {25, 27}, {23, 28}, {9, 28}, {7, 27}}, nil, function(x, y)
    if y == 15 then return L[1] end
    if x >= 23 or y >= 27 then return L[3] end
    return L[2]
  end)
  -- etiqueta de pergamino con su marca
  G.rect(10, 18, 22, 25, "pa"); G.line(10, 25, 22, 25, "wd1")
  mark(G)
  G.line(7, 17, 7, 25, "gl1"); G.px(7, 16, "W"); G.px(8, 13, "W")
end

local function heart(G, c)
  G.px(14, 20, c); G.px(15, 20, c); G.px(17, 20, c); G.px(18, 20, c)
  G.rect(13, 21, 19, 21, c); G.rect(14, 22, 18, 22, c); G.rect(15, 23, 17, 23, c); G.px(16, 24, c)
  G.px(14, 21, "r1")
end
local function drop(G, c)
  G.px(16, 19, c); G.rect(15, 20, 17, 21, c); G.rect(14, 22, 18, 23, c); G.rect(15, 24, 17, 24, c)
  G.px(15, 22, "b1")
end

icon("pocion_vida_menor", function(G) flaskSmall(G, VIDA) end)
icon("pocion_vida_mayor", function(G) flaskBig(G, VIDA, function(g) heart(g, "r2") end) end)
icon("pocion_mana_menor", function(G) flaskSmall(G, MANA) end)
icon("pocion_mana_mayor", function(G) flaskBig(G, MANA, function(g) drop(g, "b2") end) end)

-- vial en forma de gota: mitad vida, mitad maná, y un remolino púrpura al medio
icon("elixir_regeneracion", function(G)
  G.rect(14, 2, 18, 6, "co1"); G.rect(17, 2, 18, 6, "co2")
  G.rect(13, 7, 19, 8, "au1"); G.rect(13, 8, 19, 8, "au2")
  G.rect(14, 9, 18, 12, "gl2"); G.px(15, 10, "gl1"); G.px(15, 11, "gl1")
  local body = {{11, 13}, {21, 13}, {25, 20}, {23, 27}, {16, 30}, {9, 27}, {7, 20}}
  G.poly(body, "gl2")
  G.poly({{11, 16}, {21, 16}, {24, 20}, {22, 26}, {16, 29}, {10, 26}, {8, 20}}, nil, function(x, y)
    local swirl = math.floor(16 + 1.5 * math.sin(y * 0.9) + 0.5)
    if x == swirl then return "p1" end
    if math.abs(x - swirl) == 1 then return "p2" end
    if y == 16 then return x < swirl and "r1" or "b1" end
    return x < swirl and "r2" or "b2"
  end)
  G.line(9, 19, 9, 24, "gl1"); G.px(10, 17, "W")
  -- destellos
  G.px(4, 9, "au1"); G.px(3, 10, "W"); G.px(5, 10, "au1"); G.px(4, 11, "au1")
  G.px(27, 12, "W"); G.px(28, 15, "au1")
end)

-- frasco de cristal tallado con esencia verde dorada y tapón con una gema
icon("esencia_restauradora", function(G)
  G.ellipse(16, 4, 2.6, 2.6, "b1"); G.px(15, 3, "W")
  G.rect(13, 7, 19, 9, "au1"); G.rect(13, 9, 19, 9, "au2"); G.px(16, 7, "au3")
  local body = {{11, 10}, {21, 10}, {25, 16}, {22, 29}, {10, 29}, {7, 16}}
  G.poly(body, "gl2")
  G.poly({{11, 13}, {21, 13}, {24, 17}, {21, 28}, {11, 28}, {8, 17}}, nil, function(x, y)
    if y == 13 then return "v1" end
    if (x + y) % 7 == 0 and y > 15 and y < 27 then return "au1" end
    return (x > 18) and "v3" or "v2"
  end)
  -- facetas del cristal
  G.line(16, 10, 16, 12, "gl1"); G.line(9, 17, 11, 27, "gl1"); G.px(10, 16, "W")
  G.px(5, 7, "au1"); G.px(27, 9, "W"); G.px(26, 22, "au1"); G.px(4, 22, "W")
end)

-- ---------------------------------------------------------------- comidas que curan
local function steam(G)
  G.px(11, 9, "gl1"); G.px(12, 8, "gl1"); G.px(11, 7, "gl1"); G.px(12, 6, "gl1")
  G.px(17, 8, "gl1"); G.px(16, 7, "gl1"); G.px(17, 6, "gl1"); G.px(16, 5, "gl1")
  G.px(22, 9, "gl1"); G.px(21, 8, "gl1"); G.px(22, 7, "gl1")
end

-- cuenco de madera visto de lado con la sopa por arriba
local function bowl(G, s1, s2)
  G.ellipse(16, 18, 13, 10, nil, function(x, y)
    if y < 18 then return nil end
    return (x > 22) and "wd3" or "wd2"
  end)
  G.rect(12, 27, 20, 29, "wd3")
  G.ellipse(16, 18, 13, 3.2, "wd1")
  G.ellipse(16, 18, 11, 2.2, nil, function(x, y) return ((x + y) % 5 == 0) and s2 or s1 end)
  G.line(6, 21, 9, 25, "wd1")
end

icon("estofado_lobo", function(G)
  steam(G)
  -- hueso que asoma
  G.thick(18, 18, 25, 10, 2, "bn"); G.ellipse(25, 9, 1.8, 1.6, "bn"); G.ellipse(27, 11, 1.6, 1.6, "bn")
  bowl(G, "st1", "st2")
  G.rect(10, 17, 12, 18, "mt"); G.rect(14, 18, 15, 19, "mt"); G.px(19, 18, "mt"); G.px(20, 18, "mt")
  G.px(11, 17, "r1"); G.px(17, 17, "v2"); G.px(22, 18, "v2")
end)

icon("sopa_goblin", function(G)
  steam(G)
  -- cuchara de hierro
  G.thick(20, 18, 26, 9, 2, "fe2"); G.ellipse(26, 8, 2.4, 2, "fe1"); G.px(25, 7, "W")
  bowl(G, "gs1", "gs2")
  G.px(10, 17, "v1"); G.px(13, 18, "gl1"); G.px(17, 17, "gl1"); G.px(15, 19, "v1")
  -- oreja de goblin flotando
  G.poly({{6, 16}, {11, 17}, {9, 19}}, "v2"); G.px(8, 17, "v3")
end)

-- olla de hierro con asas, guiso espeso y un trozo grande
icon("guiso_troll", function(G)
  steam(G)
  G.ellipse(16, 20, 12, 9, nil, function(x, y)
    if y < 15 then return nil end
    return (x > 22) and "po3" or "po2"
  end)
  G.rect(4, 14, 28, 16, "po1"); G.rect(4, 16, 28, 16, "po2")
  G.rect(1, 15, 3, 18, "po2"); G.rect(29, 15, 31, 18, "po2")
  G.ellipse(16, 14, 11, 2, nil, function(x, y) return ((x * 3 + y) % 7 == 0) and "tr2" or "tr1" end)
  G.rect(12, 12, 15, 14, "mt"); G.px(13, 12, "r1")
  G.ellipse(20, 13, 2, 1.5, "co1"); G.px(19, 12, "pa")
  G.rect(11, 28, 13, 29, "po3"); G.rect(19, 28, 21, 29, "po3")
  G.line(7, 18, 7, 24, "po1")
end)

-- ---------------------------------------------------------------- accesorios
-- cadena en U de puntos dorados
local function chain(G, bottom, c1, c2)
  for x = 5, 27 do
    local t = (x - 16) / 11
    local y = 3 + (bottom - 3) * (1 - t * t)
    if x % 2 == 0 then G.px(x, y, c1) else G.px(x, y, c2) end
  end
end

local function pendant(G, f1, f2, g1, g2)
  G.rect(15, 13, 17, 15, f2)
  G.ellipse(16, 21, 6.5, 7.5, f2)
  G.ellipse(16, 21, 5, 6, f1)
  G.ellipse(16, 21, 3.4, 4.4, g2)
  G.ellipse(15, 19.5, 1.6, 2, g1); G.px(14, 18, "W")
end

icon("amuleto_pradera", function(G)
  chain(G, 13, "au1", "au2")
  pendant(G, "au1", "au2", "v1", "v3")
  -- hojitas a los lados
  G.poly({{8, 22}, {10, 19}, {11, 23}}, "v2"); G.poly({{24, 22}, {22, 19}, {21, 23}}, "v2")
end)

icon("collar_pradera", function(G)
  for i = 0, 10 do
    local x = 5 + i * 2.2
    local t = (x - 16) / 11
    local y = 4 + 16 * (1 - t * t)
    G.ellipse(x, y, 1.4, 1.4, (i % 2 == 0) and "v2" or "au1")
  end
  -- dije de hoja
  G.rect(15, 21, 17, 22, "au2")
  G.poly({{16, 23}, {21, 26}, {16, 31}, {11, 26}}, "v2")
  G.line(16, 24, 16, 30, "v3"); G.px(14, 25, "v1"); G.px(13, 26, "v1")
end)

icon("brazalete_pradera", function(G)
  G.ellipse(16, 17, 13, 9, nil, function(x, y) return (y < 17) and "au1" or "au2" end)
  G.erase(16, 16, 9.5, 5.5)
  G.ellipse(16, 17, 13, 9, nil, function(x, y)
    if G.get(x, y) and y > 22 and x % 3 == 0 then return "au3" end
    return nil
  end)
  G.ellipse(16, 24, 2.4, 2.2, "v3"); G.ellipse(15.5, 23.5, 1.2, 1.2, "v1")
  G.ellipse(8, 22, 1.6, 1.6, "v2"); G.ellipse(24, 22, 1.6, 1.6, "v2")
  G.px(8, 11, "W"); G.px(9, 10, "W")
end)

local function ring(G, b1, b2, b3, g1, g2)
  G.ellipse(16, 21, 9, 8, nil, function(x, y) return (x < 14 and y < 22) and b1 or b2 end)
  G.erase(16, 21.5, 6, 5)
  G.ellipse(16, 21, 9, 8, nil, function(x, y)
    if G.get(x, y) and x > 20 and y > 21 then return b3 end
    return nil
  end)
  -- engaste con garras
  G.rect(12, 11, 20, 14, b2); G.px(12, 10, b2); G.px(20, 10, b2)
  G.ellipse(16, 9.5, 4, 4, g2); G.ellipse(15, 8.5, 2, 2, g1); G.px(14, 7, "W")
  G.px(10, 16, "W")
end

icon("anillo_pradera", function(G) ring(G, "au1", "au2", "au3", "v1", "v3") end)

-- medalla de capitán: cinta roja y moneda dorada con estrella
icon("amuleto_capitan", function(G)
  G.poly({{9, 2}, {15, 2}, {17, 15}, {13, 15}}, "rb1")
  G.poly({{17, 2}, {23, 2}, {19, 15}, {15, 15}}, "rb2")
  G.line(12, 2, 15, 13, "rb2")
  G.ellipse(16, 21, 8, 8, "au2")
  G.ellipse(16, 21, 6.3, 6.3, "au1")
  -- estrella
  G.rect(15, 16, 17, 26, "au3"); G.rect(11, 20, 21, 22, "au3")
  G.px(14, 24, "au3"); G.px(18, 24, "au3"); G.px(13, 25, "au3"); G.px(19, 25, "au3")
  G.px(16, 21, "W"); G.px(12, 17, "W")
end)

icon("anillo_fuerza", function(G) ring(G, "fe1", "fe2", "fe3", "r1", "r2") end)

-- amuleto del brujo: cadena oscura y un ojo púrpura en un marco de hierro con púas
icon("amuleto_brujo", function(G)
  chain(G, 13, "fe2", "fe3")
  G.poly({{16, 12}, {19, 15}, {13, 15}}, "fe3")
  G.poly({{6, 21}, {11, 18}, {11, 24}}, "fe3"); G.poly({{26, 21}, {21, 18}, {21, 24}}, "fe3")
  G.px(16, 30, "fe3"); G.rect(15, 28, 17, 29, "fe3")
  pendant(G, "fe1", "fe3", "p1", "p3")
  G.rect(15, 20, 17, 22, "p2"); G.px(16, 21, "K")
end)

-- ---------------------------------------------------------------- crafteo v2: materiales y consumibles
-- frasco sin nada (se compra en el alquimista y se llena en el Pilar)
icon("frasco_vacio", function(G)
  G.rect(14, 4, 18, 8, "co1"); G.rect(17, 4, 18, 8, "co2"); G.rect(14, 8, 18, 8, "co2")
  G.rect(13, 9, 19, 10, "gl2"); G.rect(14, 9, 15, 10, "gl1")
  G.rect(14, 11, 18, 14, "gl2"); G.rect(15, 11, 15, 14, "gl1")
  G.ellipse(16, 21, 8.5, 8, "gl2")
  G.ellipse(16, 21, 7.2, 6.8, nil, function(x, y) return ((x - 16) + (y - 21) > 5) and "gl3" or "gl1" end)
  G.line(10, 17, 10, 22, "W"); G.px(11, 15, "W")
end)

-- agua del Pilar: celeste clara con un destello
icon("agua_purificada", function(G)
  flaskSmall(G, {"aq1", "aq2", "aq3"})
  G.px(25, 6, "W"); G.px(24, 7, "aq1"); G.px(26, 7, "aq1"); G.px(25, 8, "W"); G.px(25, 5, "aq1"); G.px(25, 9, "aq1")
end)

-- lingote visto de frente: cara de arriba clara, frente medio, costado oscuro
icon("lingote_hierro", function(G)
  G.poly({{3, 26}, {29, 26}, {25, 16}, {7, 16}}, "fe2")
  G.poly({{7, 16}, {25, 16}, {27, 12}, {9, 12}}, "fe1")
  G.poly({{25, 16}, {29, 26}, {27, 26}, {24, 17}}, "fe3")
  G.line(8, 17, 22, 17, "W"); G.line(5, 25, 27, 25, "fe3")
  G.px(12, 13, "W"); G.px(13, 13, "W")
end)

-- dos tablas de roble apiladas con la veta marcada
local function plank(G, dx, dy)
  G.poly({{3 + dx, 17 + dy}, {19 + dx, 4 + dy}, {24 + dx, 9 + dy}, {8 + dx, 22 + dy}}, "wd1")
  G.line(5 + dx, 18 + dy, 20 + dx, 6 + dy, "wd2"); G.line(7 + dx, 20 + dy, 22 + dx, 8 + dy, "wd2")
  G.poly({{19 + dx, 4 + dy}, {24 + dx, 9 + dy}, {25 + dx, 9 + dy}, {20 + dx, 4 + dy}}, "wd3")
  G.px(13 + dx, 12 + dy, "wd3")
end
icon("tabla_roble", function(G)
  plank(G, 0, 0)
  plank(G, 5, 6)
end)

-- piel curtida y enrollada, con costura
icon("cuero_tratado", function(G)
  G.poly({{4, 9}, {12, 6}, {20, 8}, {27, 6}, {26, 16}, {28, 25}, {18, 27}, {9, 25}, {4, 27}, {6, 17}}, "le1")
  G.poly({{20, 8}, {27, 6}, {26, 16}, {28, 25}, {20, 26}}, "le2")
  for i = 0, 7 do G.px(7 + i * 2.5, 11 + (i % 2), "le3") end
  for i = 0, 7 do G.px(7 + i * 2.5, 23 - (i % 2), "le3") end
  G.ellipse(5, 18, 2.5, 9, "le2"); G.line(5, 10, 5, 26, "le3")
  G.px(12, 15, "pa"); G.px(13, 16, "pa")
end)

-- antídoto: botella verde con una hoja en la etiqueta
icon("antidoto", function(G)
  flaskBig(G, {"v1", "v2", "v3"}, function(g)
    g.poly({{12, 23}, {16, 19}, {21, 18}, {18, 22}}, "v2")
    g.line(13, 23, 19, 19, "v3")
  end)
end)

-- tónico de miel: frasco ámbar con una gota que chorrea y una abejita
icon("tonico_miel", function(G)
  flaskSmall(G, {"am1", "am2", "am3"})
  G.rect(15, 11, 17, 13, "am2"); G.px(16, 14, "am2")
  G.ellipse(25, 8, 2.5, 2, "am1"); G.line(24, 7, 24, 9, "K"); G.line(26, 7, 26, 9, "K")
  G.px(24, 5, "gl1"); G.px(26, 5, "gl1"); G.px(25, 6, "gl1")
end)

-- vendaje: rollo de tela visto de costado, con la punta suelta y una ramita de hierba
icon("vendaje", function(G)
  G.poly({{14, 22}, {28, 25}, {27, 29}, {13, 26}}, "pa")
  G.line(16, 24, 26, 27, "wd1")
  G.rect(8, 11, 22, 23, "W")
  G.line(8, 23, 22, 23, "pa"); G.line(8, 20, 22, 20, "pa"); G.line(8, 14, 22, 14, "pa")
  G.ellipse(22, 17, 3, 6, "pa")
  G.ellipse(8, 17, 3, 6, "W")
  G.ellipse(8, 17, 1.6, 3.4, "pa"); G.px(8, 17, "wd1")
  G.rect(14, 15, 16, 19, "rb1"); G.rect(13, 16, 17, 18, "rb1")
  G.line(21, 4, 27, 11, "v3"); G.px(23, 5, "v2"); G.px(24, 6, "v2"); G.px(25, 8, "v2"); G.px(22, 7, "v1"); G.px(26, 9, "v1")
end)

-- amuleto de colmillos: cordón de cuero con tres colmillos de lobo y una cuenta dorada
icon("amuleto_colmillos", function(G)
  chain(G, 14, "le2", "le3")
  local function fang(x, y, len)
    G.poly({{x - 2, y}, {x + 2, y}, {x + 0.5, y + len}}, "bn")
    G.line(x + 1, y + 1, x + 0.5, y + len - 1, "pa")
    G.px(x - 1, y, "W")
  end
  fang(11, 15, 9)
  fang(16, 17, 11)
  fang(21, 15, 9)
  G.ellipse(16, 15, 2, 2, "au1"); G.px(15, 14, "W")
end)

-- ---------------------------------------------------------------- recolección v4
-- fibra de lino: un manojo atado con florcitas celestes
icon("fibra_lino", function(G)
  for i, x in ipairs({10, 13, 16, 19, 22}) do
    G.line(16, 28, x, 6 + (i % 2) * 2, (i % 2 == 0) and "ln2" or "ln3")
  end
  G.rect(13, 19, 19, 21, "wd1"); G.line(13, 21, 19, 21, "wd2")
  for _, p in ipairs({{10, 6}, {16, 4}, {22, 6}}) do G.px(p[1], p[2], "lb"); G.px(p[1] - 1, p[2], "lb"); G.px(p[1] + 1, p[2], "lb"); G.px(p[1], p[2] - 1, "W") end
end)

-- tela de lino: rollo de tela clara, doblado
icon("tela_lino", function(G)
  G.poly({{4, 12}, {24, 8}, {28, 20}, {8, 25}}, "ln1")
  G.poly({{8, 25}, {28, 20}, {28, 23}, {8, 28}}, "ln2")
  for i = 0, 4 do G.line(7 + i * 4, 12 - i, 11 + i * 4, 24 - i, "ln2") end
  G.ellipse(6, 18, 3, 7, "ln2"); G.ellipse(6, 18, 1.4, 3, "ln3")
end)

-- cuarzo de río: racimo de cristales rosados
icon("cuarzo_rio", function(G)
  local function shard(x0, y0, x1, y1, w, c, d)
    G.poly({{x0 - w, y0}, {x0 + w, y0}, {x1 + 1, y1 + 2}, {x1, y1}, {x1 - 1, y1 + 2}}, c)
    G.line(x0 + w - 1, y0, x1, y1 + 1, d)
  end
  G.ellipse(16, 26, 11, 3, "st2")
  shard(12, 26, 8, 10, 3, "k2", "k3")
  shard(16, 26, 17, 4, 3, "k1", "k3")
  shard(21, 26, 25, 12, 2, "k2", "k3")
  G.px(15, 8, "W"); G.px(16, 11, "W"); G.px(9, 13, "W")
end)

-- trigo: tres espigas
icon("trigo", function(G)
  for i, x in ipairs({11, 16, 21}) do
    local top = 5 + (i % 2) * 3
    G.line(x, top + 8, 16, 29, "y2")
    for j = 0, 7 do G.px(x - 1, top + j, "y1"); G.px(x + 1, top + j, "y2"); G.px(x, top + j, (j % 2 == 0) and "y1" or "y3") end
    G.line(x, top - 1, x - 2, top - 4, "y3")
  end
  G.rect(13, 20, 19, 21, "wd1")
end)

-- harina: saquito atado con la harina asomando
icon("harina", function(G)
  G.poly({{9, 12}, {23, 12}, {27, 27}, {5, 27}}, "pa")
  G.poly({{20, 12}, {23, 12}, {27, 27}, {22, 27}}, "wd1")
  G.rect(11, 10, 21, 12, "wd2")
  G.ellipse(16, 8, 5, 3, "W"); G.px(14, 7, "ln1")
  G.rect(12, 18, 17, 22, "y1"); G.px(14, 19, "y3"); G.px(15, 21, "y3")
end)

-- pan de campo: hogaza dorada con cortes
icon("pan_campo", function(G)
  G.ellipse(16, 20, 12, 8, "y2")
  G.ellipse(15, 18, 10, 6, "y1")
  for i = 0, 2 do G.line(10 + i * 5, 14, 13 + i * 5, 20, "y3") end
  G.ellipse(16, 25, 11, 3, nil, function(x, y) return y > 24 and "y3" or nil end)
  G.px(12, 15, "W")
end)

-- llave del Vigía (objeto de misión): llave antigua dorada con el ojo del Vigía en el aro
icon("llave_vigia", function(G)
  G.ellipse(9, 16, 6, 7, "au2")
  G.ellipse(9, 15, 4, 5, "au1")
  G.ellipse(9, 16, 3, 2.5, "aq2")
  G.px(9, 16, "K"); G.px(8, 16, "aq3"); G.px(10, 15, "W")
  G.rect(15, 15, 28, 17, "au2")
  G.line(15, 15, 28, 15, "au1")
  G.rect(21, 18, 23, 21, "au2"); G.line(21, 18, 21, 21, "au1")
  G.rect(25, 18, 27, 23, "au2"); G.line(25, 18, 25, 23, "au1")
  G.rect(28, 15, 29, 17, "au3")
  G.px(14, 16, "au3"); G.px(14, 15, "au2")
end)

-- ---------------------------------------------------------------- botín de los monstruos nuevos de la Pradera
-- carne de jabalí: pernil crudo con el hueso asomando
icon("carne_jabali", function(G)
  G.ellipse(14, 18, 10, 8, "rb2")
  G.ellipse(13, 17, 8.5, 6.5, "mt")
  G.ellipse(11, 15, 3, 2, "r1"); G.line(8, 20, 16, 22, "rb1")
  G.thick(21, 13, 27, 7, 3, "bn")
  G.ellipse(27, 5, 2.2, 2, "bn"); G.ellipse(29, 7, 2, 2, "bn")
  G.px(22, 12, "pa"); G.px(26, 4, "W")
end)

-- glándula de sapo: bolsita verde y viscosa que gotea veneno amarillo
icon("glandula_sapo", function(G)
  G.ellipse(16, 17, 10, 9, "sp2")
  G.ellipse(15, 16, 8, 7, "sp1")
  G.px(11, 13, "sp3"); G.px(19, 19, "sp3"); G.px(14, 20, "sp3"); G.px(20, 14, "sp3")
  G.ellipse(12, 13, 2, 1.4, "v1"); G.px(11, 12, "W")
  G.rect(15, 26, 17, 26, "sp2")
  G.ellipse(16, 28, 1.5, 2, "sy"); G.px(16, 29, "am3")
  G.ellipse(23, 25, 1, 1.5, "sy")
end)

-- medalla del Vigía: disco de bronce con el ojo de la guardia y una cinta azul
icon("medalla_vigia", function(G)
  G.poly({{10, 2}, {15, 2}, {17, 13}, {13, 13}}, "az1")
  G.poly({{17, 2}, {22, 2}, {19, 13}, {15, 13}}, "az2")
  G.ellipse(16, 21, 9, 9, "bz2")
  G.ellipse(16, 21, 7.3, 7.3, "bz1")
  G.ellipse(16, 21, 5, 3, "bz3"); G.ellipse(16, 21, 3.4, 2, "W"); G.ellipse(16, 21, 1.5, 1.5, "az2"); G.px(16, 21, "K")
  G.line(10, 26, 22, 26, "bz3"); G.px(11, 16, "W")
end)

-- runa de menhir: lasca de piedra gris con una runa verde que brilla
icon("runa_menhir", function(G)
  G.poly({{8, 6}, {22, 3}, {27, 14}, {24, 28}, {9, 29}, {5, 17}}, "rk2")
  G.poly({{8, 6}, {22, 3}, {18, 9}, {9, 11}}, "rk1")
  G.poly({{22, 3}, {27, 14}, {24, 28}, {20, 27}, {18, 9}}, "rk3")
  G.line(13, 12, 13, 24, "ru"); G.line(13, 12, 17, 15, "ru"); G.line(17, 15, 13, 18, "ru")
  G.line(14, 21, 17, 24, "ru2")
  G.px(12, 11, "ru2"); G.px(18, 16, "ru2"); G.px(10, 7, "W")
end)

-- fragmento de eclipse: astilla de cristal negro con brillo violeta
icon("fragmento_eclipse", function(G)
  G.poly({{16, 2}, {23, 13}, {19, 30}, {10, 22}, {11, 10}}, "ec2")
  G.poly({{16, 2}, {11, 10}, {10, 22}, {15, 17}}, "ec1")
  G.poly({{16, 2}, {23, 13}, {19, 30}, {17, 16}}, "ec3")
  G.line(16, 4, 15, 16, "ev"); G.px(14, 9, "W")
  G.px(6, 8, "ev"); G.px(26, 22, "ev"); G.px(25, 6, "p1")
end)

-- asado de jabalí: pernil dorado sobre una tabla con una ramita
icon("asado_jabali", function(G)
  steam(G)
  G.rect(3, 24, 29, 27, "wd1"); G.line(3, 27, 29, 27, "wd3"); G.line(5, 25, 26, 25, "wd2")
  G.ellipse(14, 19, 10, 6.5, "st2")
  G.ellipse(13, 18, 8.5, 5, "st1")
  G.line(8, 16, 14, 21, "st2"); G.line(12, 15, 18, 20, "st2")
  G.thick(22, 16, 28, 11, 3, "bn"); G.ellipse(28, 9, 2, 2, "bn")
  G.px(10, 15, "am1"); G.px(15, 14, "am1")
  G.line(4, 22, 8, 19, "v3"); G.px(5, 20, "v2"); G.px(7, 21, "v2")
end)

-- elixir del lago: botella con agua verdosa del lago y una gota violeta de magia
icon("elixir_lago", function(G)
  flaskBig(G, {"aq2", "sp2", "sp3"}, function(g)
    g.ellipse(16, 21, 2.4, 3, "p2"); g.px(15, 20, "p1")
  end)
end)

-- emblema de la guardia: escudito de bronce con el ojo del Vigía y cinta azul
icon("emblema_guardia", function(G)
  G.poly({{11, 2}, {21, 2}, {19, 9}, {13, 9}}, "az2")
  G.line(13, 2, 15, 9, "az1")
  G.poly({{6, 10}, {26, 10}, {25, 20}, {16, 30}, {7, 20}}, "bz2")
  G.poly({{8, 12}, {24, 12}, {23, 19}, {16, 27}, {9, 19}}, "az2")
  G.poly({{8, 12}, {16, 12}, {16, 27}, {9, 19}}, "az1")
  G.ellipse(16, 18, 4.5, 2.6, "W"); G.ellipse(16, 18, 2, 2, "bz2"); G.px(16, 18, "K")
  G.px(9, 11, "bz1"); G.px(10, 11, "bz1")
end)

-- amuleto rúnico: piedra con runa en un marco de plata
icon("amuleto_runico", function(G)
  chain(G, 13, "fe1", "fe2")
  G.rect(15, 13, 17, 15, "fe2")
  G.poly({{16, 14}, {24, 20}, {22, 29}, {10, 29}, {8, 20}}, "fe2")
  G.poly({{16, 16}, {22, 21}, {20, 27}, {12, 27}, {10, 21}}, "rk2")
  G.poly({{16, 16}, {10, 21}, {12, 27}, {16, 22}}, "rk1")
  G.line(16, 18, 16, 26, "ru"); G.line(16, 18, 19, 21, "ru"); G.line(19, 21, 16, 23, "ru")
  G.px(14, 19, "W")
end)

-- amuleto del alba: sol dorado naciente sobre el cristal de eclipse purificado
icon("amuleto_alba", function(G)
  chain(G, 12, "au1", "au2")
  for i = 0, 6 do
    local a = math.pi * (0.1 + i * 0.8 / 6) + math.pi
    G.line(16 + math.cos(a) * 9, 21 + math.sin(a) * 9, 16 + math.cos(a) * 12, 21 + math.sin(a) * 12, "al2")
  end
  G.ellipse(16, 21, 8, 8, "au2")
  G.ellipse(16, 21, 6.5, 6.5, "al2")
  G.ellipse(16, 21, 4, 4, "ev"); G.ellipse(15.5, 20.5, 2.6, 2.6, "al1"); G.px(15, 19, "W")
end)

-- ---------------------------------------------------------------- objetos de misión de la Pradera
-- collar de cuero con una piedra negra que late (P2)
icon("collar_cristal_negro", function(G)
  chain(G, 14, "le2", "le3")
  G.rect(15, 13, 17, 15, "le3")
  G.poly({{16, 15}, {21, 21}, {16, 30}, {11, 21}}, "ec2")
  G.poly({{16, 15}, {11, 21}, {16, 30}, {15, 21}}, "ec1")
  G.line(16, 17, 16, 27, "ev"); G.px(14, 20, "W")
  G.px(7, 24, "ev"); G.px(25, 25, "p1")
end)

-- saco de arpillera atado, con cristales negros asomando (P3)
icon("saco_cristales", function(G)
  G.poly({{8, 13}, {24, 13}, {28, 28}, {4, 28}}, "wd1")
  G.poly({{20, 13}, {24, 13}, {28, 28}, {22, 28}}, "wd2")
  for i = 0, 5 do G.px(8 + i * 3, 20 + (i % 2), "wd2") end
  G.rect(11, 11, 21, 13, "wd3")
  G.poly({{12, 11}, {14, 3}, {16, 11}}, "ec2"); G.line(14, 4, 14, 10, "ev")
  G.poly({{16, 11}, {19, 5}, {21, 11}}, "ec1"); G.px(19, 6, "ev")
  G.poly({{9, 11}, {10, 7}, {12, 11}}, "ec3")
end)

-- montoncito de tierra seca con una astilla negra clavada (P4)
icon("cristal_enterrado", function(G)
  G.ellipse(16, 25, 13, 5, "st2")
  G.ellipse(16, 24, 11, 3.5, "wd3")
  for _, p in ipairs({{8, 24}, {13, 23}, {21, 25}, {24, 23}}) do G.px(p[1], p[2], "K") end
  G.poly({{14, 23}, {17, 4}, {20, 23}}, "ec2")
  G.poly({{14, 23}, {17, 4}, {16, 23}}, "ec1")
  G.line(17, 7, 17, 20, "ev"); G.px(16, 9, "W")
end)

-- rueda dentada de roble con el centro de bronce (P5)
icon("engranaje_molino", function(G)
  for i = 0, 7 do
    local a = i * math.pi / 4
    G.thick(16 + math.cos(a) * 9, 16 + math.sin(a) * 9, 16 + math.cos(a) * 14, 16 + math.sin(a) * 14, 4, "wd2")
  end
  G.ellipse(16, 16, 11, 11, "wd1")
  G.ellipse(16, 16, 11, 11, nil, function(x, y) return ((x - 16) + (y - 16) > 6) and "wd2" or nil end)
  G.ellipse(16, 16, 5, 5, "bz2"); G.ellipse(16, 16, 3.5, 3.5, "bz1"); G.ellipse(16, 16, 1.6, 1.6, "K")
  G.px(11, 11, "pa")
end)

-- tarro de barro con pasta verde y una hoja (P6)
icon("unguento_raiz", function(G)
  G.ellipse(16, 22, 10, 8, "st2")
  G.ellipse(15, 21, 8.5, 6.5, "st1")
  G.rect(9, 11, 23, 14, "st2"); G.rect(10, 11, 22, 12, "st1")
  G.ellipse(16, 11, 7, 2.5, "v2"); G.ellipse(15, 10.5, 4, 1.5, "v1")
  G.poly({{18, 9}, {24, 3}, {25, 8}}, "v2"); G.line(19, 9, 24, 4, "v3")
  G.px(11, 19, "pa"); G.px(12, 20, "pa")
end)

-- carta empapada con un eclipse negro dibujado (P7)
icon("carta_eclipse", function(G)
  G.poly({{5, 7}, {27, 5}, {28, 26}, {6, 28}}, "pa")
  G.poly({{20, 6}, {27, 5}, {28, 26}, {22, 27}}, "ln2")
  for i = 0, 3 do G.line(8, 20 + i * 2, 18, 20 + i * 2, "gl3") end
  G.ellipse(16, 12, 5.5, 5.5, "K"); G.ellipse(14.5, 11, 4.5, 4.5, "pa")
  G.px(23, 23, "aq2"); G.px(9, 9, "aq2"); G.px(25, 12, "aq2")
end)

-- mapa de piel enrollado a los lados con la Guarida marcada en negro (P10)
icon("mapa_chaman", function(G)
  G.rect(6, 8, 26, 25, "le1")
  G.rect(22, 8, 26, 25, "le2")
  G.ellipse(6, 16.5, 2.5, 9, "le2"); G.ellipse(26, 16.5, 2.5, 9, "le3")
  G.line(9, 22, 14, 15, "wd3"); G.line(14, 15, 19, 18, "wd3")
  G.ellipse(20, 13, 3.5, 3.5, "K"); G.ellipse(20, 13, 2, 2, "le1")
  G.px(11, 12, "v3"); G.px(12, 11, "v3"); G.px(10, 18, "v3")
end)

-- cristal negro enorme colgado de un collar de cuero (P11)
icon("cristal_capitan", function(G)
  G.ellipse(16, 9, 11, 6, nil, function(x, y) return y <= 10 and "le2" or nil end)
  G.erase(16, 9.5, 8, 4)
  G.poly({{16, 10}, {25, 18}, {16, 31}, {7, 18}}, "ec2")
  G.poly({{16, 10}, {7, 18}, {16, 31}, {14, 18}}, "ec1")
  G.poly({{16, 10}, {25, 18}, {16, 31}, {19, 18}}, "ec3")
  G.line(16, 13, 15, 27, "ev"); G.px(12, 16, "W")
  G.px(4, 22, "ev"); G.px(28, 14, "p1"); G.px(27, 25, "ev")
end)

-- piedra tibia con la runa dorada del Primer Sello (P14)
icon("fragmento_sello", function(G)
  G.poly({{9, 6}, {23, 4}, {28, 16}, {22, 28}, {8, 27}, {4, 15}}, "rk2")
  G.poly({{9, 6}, {23, 4}, {19, 10}, {8, 12}}, "rk1")
  G.poly({{23, 4}, {28, 16}, {22, 28}, {19, 26}, {21, 12}}, "rk3")
  G.ellipse(15, 16, 6, 6, "al2")
  G.line(15, 11, 15, 21, "au3"); G.line(11, 16, 19, 16, "au3"); G.line(12, 13, 18, 19, "au2"); G.line(18, 13, 12, 19, "au2")
  G.ellipse(15, 16, 1.6, 1.6, "al1"); G.px(10, 8, "W")
end)

-- rama recta de roble (la espada de Tilo)
icon("palo_roble", function(G)
  G.thick(6, 26, 25, 6, 3, "wd2")
  G.line(6, 25, 24, 6, "wd1")
  G.line(13, 18, 10, 14, "wd2"); G.poly({{9, 14}, {6, 11}, {11, 12}}, "v2")
  G.ellipse(25, 6, 2, 2, "wd3"); G.px(25, 6, "wd1")
end)

-- sobre con sello de cera verde y una pluma pegada (Ren)
local function envelope(G)
  G.rect(4, 9, 28, 25, "pa")
  G.rect(4, 22, 28, 25, "ln2")
  G.line(4, 9, 16, 18, "ln2"); G.line(28, 9, 16, 18, "ln2")
  G.line(4, 25, 13, 17, "ln2"); G.line(28, 25, 19, 17, "ln2")
end
icon("carta_ren", function(G)
  envelope(G)
  G.ellipse(16, 18, 3.4, 3.4, "v3"); G.ellipse(16, 18, 2, 2, "v2"); G.px(15, 17, "v1")
  G.line(20, 5, 27, 13, "W"); G.line(21, 5, 27, 12, "gl2"); G.px(20, 5, "gl3")
end)

-- sobre con una cinta roja (Marta)
icon("carta_marta", function(G)
  envelope(G)
  G.rect(4, 15, 28, 16, "rb1"); G.rect(15, 9, 16, 25, "rb1")
  G.poly({{16, 15}, {11, 11}, {12, 18}}, "rb2"); G.poly({{16, 15}, {21, 11}, {20, 18}}, "rb2")
  G.ellipse(16, 15.5, 1.8, 1.8, "rb1")
end)

-- hacha de leñador con el mango mordido (Brenna)
icon("hacha_brenna", function(G)
  G.thick(9, 28, 21, 7, 3, "wd1")
  G.line(9, 27, 20, 7, "wd2")
  for _, p in ipairs({{13, 21}, {15, 17}, {12, 23}}) do G.px(p[1], p[2], "wd3"); G.px(p[1] + 1, p[2], "K") end
  G.poly({{17, 4}, {28, 3}, {28, 14}, {21, 12}}, "fe2")
  G.poly({{17, 4}, {28, 3}, {27, 6}, {18, 7}}, "fe1")
  G.line(28, 3, 28, 14, "W")
end)

-- muñeca de trapo con vestido amarillo remendado (Sela)
icon("muneca_trapo", function(G)
  G.ellipse(16, 9, 5, 5, "pa")
  G.px(14, 9, "K"); G.px(18, 9, "K"); G.line(15, 11, 17, 11, "r2")
  G.rect(11, 4, 21, 6, "st1"); G.rect(10, 5, 11, 12, "st1"); G.rect(21, 5, 22, 12, "st1")
  G.poly({{12, 14}, {20, 14}, {24, 26}, {8, 26}}, "y1")
  G.poly({{17, 14}, {20, 14}, {24, 26}, {19, 26}}, "y2")
  G.rect(13, 19, 15, 21, "rb1"); G.px(14, 20, "pa")
  G.thick(11, 15, 6, 21, 2, "pa"); G.thick(21, 15, 26, 21, 2, "pa")
  G.thick(13, 26, 12, 30, 2, "pa"); G.thick(19, 26, 20, 30, 2, "pa")
end)

-- ojo del Vigía: el ojo de piedra del yelmo del Vigía Caído, que todavía brilla
icon("ojo_vigia", function(G)
  G.ellipse(16, 16, 13, 9, "rk2")
  G.ellipse(16, 15, 12, 7.5, "rk1")
  G.ellipse(16, 16, 9, 6, "W")
  G.ellipse(16, 16, 5, 5, "az2"); G.ellipse(16, 16, 3.4, 3.4, "aq2"); G.ellipse(16, 16, 1.8, 1.8, "K")
  G.px(14, 14, "W"); G.px(15, 13, "W")
  G.line(5, 13, 9, 9, "rk3"); G.line(27, 13, 23, 9, "rk3")
  G.px(4, 20, "aq2"); G.px(28, 21, "aq2"); G.px(16, 4, "au1")
end)

-- ---------------------------------------------------------------- Montañas Grises: materiales
-- cuerno en espiral de la Cabra Montés
icon("cuerno_cabra", function(G)
  G.thick(8, 27, 12, 14, 5, "gh2"); G.thick(12, 14, 20, 6, 4, "gh2"); G.thick(20, 6, 27, 9, 3, "gh2")
  G.thick(27, 9, 26, 15, 2, "gh2"); G.line(26, 15, 22, 15, "gh3")
  G.line(7, 26, 11, 14, "gh1"); G.line(11, 14, 19, 6, "gh1"); G.line(19, 6, 26, 8, "gh1")
  for _, p in ipairs({{9, 22}, {10, 18}, {13, 12}, {16, 9}, {20, 7}, {24, 8}}) do G.line(p[1] - 1, p[2] + 1, p[1] + 2, p[2] + 1, "gh3") end
  G.rect(5, 27, 11, 29, "gh3")
end)

-- colmillo de orco, amarillento y con la raíz oscura
icon("colmillo_orco", function(G)
  G.poly({{9, 27}, {16, 26}, {20, 18}, {22, 9}, {20, 3}, {16, 9}, {11, 17}}, "pa")
  G.poly({{16, 26}, {20, 18}, {22, 9}, {20, 3}, {19, 11}, {15, 20}}, "y1")
  G.line(13, 21, 18, 10, "W")
  G.rect(8, 26, 17, 29, "wd2"); G.rect(9, 27, 16, 28, "wd3")
end)

-- piel de lobo de las nieves, estirada, con el pelo largo en el borde
icon("piel_lobo_nieve", function(G)
  G.poly({{7, 5}, {25, 5}, {28, 12}, {25, 18}, {27, 27}, {16, 25}, {5, 27}, {7, 18}, {4, 12}}, "wl2")
  G.poly({{9, 7}, {23, 7}, {25, 12}, {22, 17}, {23, 24}, {16, 22}, {9, 24}, {10, 17}, {7, 12}}, "wl1")
  for _, p in ipairs({{4, 12}, {28, 12}, {5, 27}, {27, 27}, {7, 5}, {25, 5}}) do G.px(p[1], p[2], "wl3") end
  for y = 9, 22, 3 do G.line(12, y, 14, y + 1, "wl2"); G.line(18, y + 1, 20, y, "wl2") end
  G.line(16, 6, 16, 24, "wl3")
end)

-- punta de pico minero chorreando savia negra violeta
icon("pico_corrompido", function(G)
  G.thick(7, 28, 18, 13, 3, "wd1"); G.line(7, 27, 17, 13, "wd2")
  G.poly({{6, 9}, {16, 8}, {27, 4}, {29, 6}, {18, 13}, {8, 13}}, "fe2")
  G.poly({{6, 9}, {16, 8}, {27, 4}, {26, 6}, {16, 10}, {7, 11}}, "fe1")
  G.ellipse(19, 11, 3, 3, "ec2"); G.line(20, 13, 21, 18, "ec1"); G.px(21, 19, "ev"); G.line(9, 13, 9, 17, "ec1"); G.px(9, 18, "ev")
  G.px(27, 5, "ev")
end)

-- ala de murciélago con su membrana y los dedos marcados
icon("membrana_murcielago", function(G)
  G.poly({{4, 8}, {28, 5}, {26, 12}, {22, 10}, {20, 18}, {15, 15}, {11, 26}, {8, 18}}, "bt1")
  G.poly({{6, 10}, {26, 7}, {24, 11}, {21, 9}, {19, 16}, {14, 13}, {11, 22}, {9, 17}}, "bt2")
  G.line(4, 8, 28, 5, "bt3"); G.line(4, 8, 22, 10, "bt3"); G.line(4, 8, 15, 15, "bt3"); G.line(4, 8, 11, 26, "bt3")
  G.px(28, 4, "pa"); G.px(3, 8, "pa")
end)

-- trozo de roca con una grieta que late
icon("fragmento_piedra_viva", function(G)
  G.poly({{7, 9}, {18, 4}, {27, 10}, {26, 23}, {15, 28}, {5, 21}}, "rk2")
  G.poly({{7, 9}, {18, 4}, {27, 10}, {17, 12}}, "rk1")
  G.poly({{27, 10}, {26, 23}, {15, 28}, {18, 16}}, "rk3")
  G.line(10, 14, 14, 17, "pv2"); G.line(14, 17, 13, 22, "pv2"); G.line(14, 17, 20, 19, "pv2")
  G.line(11, 14, 14, 16, "pv1"); G.line(14, 18, 19, 19, "pv1")
  G.px(13, 7, "W"); G.px(4, 26, "pv1"); G.px(28, 27, "pv2")
end)

-- neblina helada encerrada en escarcha
icon("esencia_helada", function(G)
  G.poly({{16, 2}, {25, 10}, {24, 24}, {16, 30}, {8, 24}, {7, 10}}, "ih3")
  G.poly({{16, 4}, {23, 11}, {22, 23}, {16, 28}, {10, 23}, {9, 11}}, "ih2")
  G.ellipse(16, 17, 5, 6, "ih1"); G.ellipse(15, 16, 3, 3, "W")
  G.line(16, 4, 16, 10, "W"); G.line(9, 11, 13, 13, "ih1")
  G.px(14, 17, "ih4"); G.px(18, 17, "ih4")
  G.px(4, 6, "ih2"); G.px(28, 20, "ih2")
end)

-- garra de oso sobre un mechón de pelo pardo
icon("garra_oso", function(G)
  G.ellipse(12, 23, 8, 6, "br2"); G.ellipse(11, 22, 6, 4, "br1")
  for x = 6, 18, 3 do G.line(x, 27, x + 1, 29, "br3") end
  G.poly({{14, 19}, {18, 18}, {24, 10}, {27, 3}, {23, 6}, {16, 12}}, "pa")
  G.poly({{18, 18}, {24, 10}, {27, 3}, {25, 9}, {19, 16}}, "gh2")
  G.line(16, 15, 23, 7, "W")
end)

-- escama azul transparente
icon("escama_sierpe", function(G)
  G.poly({{16, 3}, {26, 9}, {26, 18}, {16, 29}, {6, 18}, {6, 9}}, "ih3")
  G.poly({{16, 5}, {24, 10}, {24, 17}, {16, 26}, {8, 17}, {8, 10}}, "ih2")
  G.line(16, 6, 16, 25, "ih3"); for k = 0, 3 do G.line(16, 10 + k * 4, 10, 8 + k * 4, "ih3"); G.line(16, 10 + k * 4, 22, 8 + k * 4, "ih3") end
  G.line(10, 10, 13, 8, "ih1"); G.px(11, 12, "W")
end)

-- cuero de troll enrollado y atado
icon("piel_troll", function(G)
  G.poly({{4, 14}, {24, 8}, {28, 20}, {8, 26}}, "tl2")
  G.poly({{4, 14}, {24, 8}, {25, 12}, {6, 18}}, "tl1")
  G.ellipse(26, 14, 3, 6, "tl3"); G.ellipse(26, 14, 1.5, 4, "tl2")
  G.line(13, 11, 17, 23, "wd2"); G.line(14, 11, 18, 23, "wd3")
  for _, p in ipairs({{8, 18}, {20, 13}, {22, 19}, {10, 22}}) do G.px(p[1], p[2], "tl3") end
end)

-- pluma gris de arpía, larga, con un brillo de viento
icon("pluma_arpia", function(G)
  G.poly({{6, 28}, {10, 18}, {18, 9}, {27, 3}, {24, 12}, {16, 21}}, "hp2")
  G.poly({{10, 18}, {18, 9}, {27, 3}, {20, 11}, {12, 19}}, "hp1")
  G.line(5, 29, 26, 4, "pa")
  for k = 0, 4 do G.line(10 + k * 3, 23 - k * 4, 14 + k * 3, 23 - k * 4, "hp3") end
  G.px(4, 9, "ih2"); G.px(6, 7, "ih1"); G.px(28, 18, "ih2")
end)

-- esfera de cristal con un relámpago atrapado
icon("nucleo_tormenta", function(G)
  G.ellipse(16, 16, 12, 12, "cl2"); G.ellipse(16, 15, 10, 10, "cl1")
  G.line(18, 6, 13, 15, "zz2"); G.line(13, 15, 19, 16, "zz2"); G.line(19, 16, 14, 26, "zz2")
  G.line(17, 7, 13, 14, "zz1"); G.line(19, 17, 15, 24, "zz1")
  G.px(10, 9, "W"); G.px(11, 8, "W")
  G.px(3, 12, "zz1"); G.px(29, 20, "zz2")
end)

-- racimo de cristales de hielo
icon("cristal_gigante", function(G)
  G.poly({{13, 28}, {11, 12}, {15, 3}, {19, 12}, {18, 28}}, "ih2")
  G.poly({{15, 3}, {19, 12}, {18, 28}, {16, 28}, {16, 10}}, "ih3")
  G.poly({{6, 28}, {4, 18}, {7, 12}, {11, 19}, {11, 28}}, "ih2"); G.line(7, 13, 7, 27, "ih1")
  G.poly({{20, 28}, {21, 17}, {26, 9}, {28, 18}, {26, 28}}, "ih3"); G.line(25, 11, 23, 26, "ih2")
  G.line(14, 6, 13, 24, "ih1"); G.px(14, 5, "W")
  G.rect(3, 28, 29, 29, "rk2")
end)

-- vara de pino retorcida con su piedra de tormenta
icon("vara_brujo", function(G)
  G.thick(6, 29, 21, 10, 2, "wd2"); G.line(6, 28, 20, 10, "wd1")
  for _, p in ipairs({{10, 24}, {14, 19}, {17, 15}}) do G.px(p[1], p[2], "wd3") end
  G.line(20, 10, 18, 5, "wd2"); G.line(21, 10, 26, 6, "wd2")
  G.ellipse(22, 7, 3, 3, "cl1"); G.px(22, 7, "zz1")
  G.line(25, 3, 28, 1, "zz2"); G.line(26, 9, 29, 11, "zz1"); G.px(18, 2, "zz2")
end)

-- tronquitos de pino nevado atados con una cuerda
icon("madera_pino", function(G)
  for i, y in ipairs({10, 16, 22}) do
    G.thick(4, y + 2, 26, y - 2, 5, "wd2"); G.line(4, y, 26, y - 4, "wd1")
    G.ellipse(26, y - 2, 2.5, 2.5, "wd1"); G.px(26, y - 2, "wd3"); G.px(25, y - 3, "pa")
  end
  G.line(12, 6, 13, 26, "wd3"); G.line(18, 4, 19, 24, "wd3")
  G.rect(4, 6, 10, 7, "W"); G.rect(16, 4, 22, 5, "W")
end)

-- flor de nieve: pétalos blancos con centro dorado y escarcha
icon("flor_nieve", function(G)
  G.line(16, 30, 16, 18, "v3"); G.line(16, 24, 11, 21, "v3"); G.line(16, 26, 21, 23, "v2")
  G.ellipse(11, 21, 2.5, 1.5, "v2"); G.ellipse(21, 23, 2.5, 1.5, "v2")
  for k = 0, 5 do
    local a = k * math.pi / 3
    G.ellipse(16 + math.cos(a) * 6, 12 + math.sin(a) * 6, 3.4, 3.4, "W")
  end
  for k = 0, 5 do local a = k * math.pi / 3; G.px(16 + math.cos(a) * 8, 12 + math.sin(a) * 8, "ih2") end
  G.ellipse(16, 12, 3, 3, "au1"); G.px(15, 11, "al1")
  G.px(5, 5, "ih1"); G.px(27, 6, "ih2"); G.px(26, 28, "ih1")
end)

-- lingote de acero refinado, azulado
icon("acero_refinado", function(G)
  G.poly({{4, 22}, {10, 14}, {28, 14}, {24, 22}}, "fe1")
  G.poly({{4, 22}, {24, 22}, {24, 27}, {4, 27}}, "fe2")
  G.poly({{24, 22}, {28, 14}, {28, 19}, {24, 27}}, "fe3")
  G.line(11, 15, 26, 15, "W"); G.line(8, 19, 20, 19, "gl1")
  G.px(14, 24, "fe3"); G.px(18, 24, "fe3")
  G.px(27, 8, "W"); G.px(26, 9, "gl1"); G.px(28, 9, "gl1")
end)

-- ---------------------------------------------------------------- comidas de las Montañas Grises
-- carne de cabra montés: filete rojo magro con su borde de grasa
icon("carne_cabra", function(G)
  G.poly({{4, 18}, {10, 9}, {24, 7}, {29, 15}, {24, 25}, {9, 26}}, "rb2")
  G.poly({{6, 18}, {11, 11}, {23, 9}, {27, 15}, {22, 23}, {10, 24}}, "mt")
  G.line(8, 17, 24, 13, "pa"); G.line(11, 21, 22, 19, "r1")
  G.px(14, 13, "W"); G.px(19, 11, "r1")
end)

-- lomo de oso: trozo grueso con su capa de grasa blanca
icon("lomo_oso", function(G)
  G.poly({{3, 14}, {8, 8}, {26, 6}, {30, 12}, {27, 24}, {6, 26}}, "rb2")
  G.poly({{5, 15}, {9, 10}, {25, 8}, {28, 13}, {25, 22}, {8, 24}}, "mt")
  G.poly({{3, 14}, {8, 8}, {26, 6}, {30, 12}, {26, 11}, {9, 13}}, "pa"); G.line(9, 9, 25, 7, "W")
  G.line(8, 17, 25, 15, "r1"); G.line(9, 21, 23, 19, "rb1"); G.px(15, 18, "pa"); G.px(20, 17, "pa")
end)

-- asado de cabra: pierna asada sobre una tabla con flores de nieve
icon("asado_cabra", function(G)
  steam(G)
  G.rect(3, 24, 29, 27, "wd1"); G.line(3, 27, 29, 27, "wd3"); G.line(5, 25, 26, 25, "wd2")
  G.ellipse(13, 19, 9, 6, "st2"); G.ellipse(12, 18, 7.5, 4.6, "st1")
  G.line(7, 17, 13, 21, "st2"); G.line(11, 15, 17, 20, "st2")
  G.thick(20, 17, 28, 13, 2, "bn"); G.ellipse(28, 12, 1.8, 1.8, "bn")
  G.px(9, 15, "am1"); G.px(14, 14, "am1")
  for _, p in ipairs({{5, 21}, {24, 21}}) do
    G.px(p[1], p[2] - 1, "W"); G.px(p[1], p[2] + 1, "W"); G.px(p[1] - 1, p[2], "W"); G.px(p[1] + 1, p[2], "W"); G.px(p[1], p[2], "au1")
  end
end)

-- té de flor de nieve: taza humeante con una flor blanca flotando
icon("te_flor_nieve", function(G)
  steam(G)
  G.ellipse(16, 18, 11, 9, nil, function(x, y) if y < 17 then return nil end return (x > 21) and "gl3" or "gl2" end)
  G.rect(11, 26, 21, 28, "gl3")
  G.ellipse(16, 17, 11, 3, "gl1")
  G.ellipse(16, 17, 9, 2, "aq2")
  G.thick(26, 18, 29, 22, 2, "gl2"); G.line(27, 22, 25, 25, "gl2")
  for k = 0, 5 do local a = k * math.pi / 3; G.px(16 + math.cos(a) * 2.5, 17 + math.sin(a) * 1.2, "W") end
  G.px(16, 17, "au1")
end)

-- caldo de oso: olla de hierro con caldo dorado y un hueso grande
icon("caldo_oso", function(G)
  steam(G)
  G.thick(18, 17, 26, 9, 2, "bn"); G.ellipse(26, 8, 2, 2, "bn"); G.ellipse(28, 10, 1.8, 1.8, "bn")
  G.ellipse(16, 20, 12, 9, nil, function(x, y) if y < 17 then return nil end return (x > 22) and "po3" or "po2" end)
  G.ellipse(16, 17, 12, 3, "po1"); G.ellipse(16, 17, 10, 2, "am1")
  G.px(11, 17, "mt"); G.px(14, 17, "mt"); G.px(19, 17, "v2")
  G.rect(2, 18, 4, 20, "po3"); G.rect(28, 18, 30, 20, "po3")
end)

-- elixir de tormenta: botella con un relámpago dentro
icon("elixir_tormenta", function(G)
  flaskBig(G, {"cl1", "cl2", "cl2"}, function(g)
    g.line(17, 15, 14, 21, "zz2"); g.line(14, 21, 18, 21, "zz2"); g.line(18, 21, 15, 27, "zz2"); g.px(16, 18, "zz1")
  end)
end)

-- insignia de la Guardia Real: placa de hierro con el rayo del Rey y un listón azul
icon("insignia_guardia_real", function(G)
  G.poly({{11, 2}, {21, 2}, {19, 9}, {13, 9}}, "az2"); G.line(13, 2, 15, 9, "az1")
  G.poly({{6, 9}, {26, 9}, {26, 21}, {16, 30}, {6, 21}}, "fe3")
  G.poly({{8, 11}, {24, 11}, {24, 20}, {16, 27}, {8, 20}}, "fe2")
  G.poly({{8, 11}, {16, 11}, {16, 27}, {8, 20}}, "fe1")
  G.line(17, 13, 13, 19, "zz2"); G.line(13, 19, 19, 19, "zz2"); G.line(19, 19, 15, 25, "zz2"); G.px(16, 16, "zz1")
  G.px(9, 12, "W"); G.px(5, 5, "zz1"); G.px(27, 6, "zz2")
end)

-- ---------------------------------------------------------------- la Mina Profunda
-- mena de hierro negro: roca oscura con vetas que brillan azul
icon("mena_hierro_negro", function(G)
  G.poly({{5, 14}, {12, 6}, {23, 5}, {28, 14}, {25, 26}, {12, 28}, {4, 22}}, "hx2")
  G.poly({{5, 14}, {12, 6}, {23, 5}, {17, 12}, {8, 16}}, "hx1")
  G.poly({{23, 5}, {28, 14}, {25, 26}, {18, 27}, {20, 14}}, "hx3")
  G.line(9, 20, 15, 15, "hxb"); G.line(15, 15, 21, 18, "hxb"); G.line(13, 23, 18, 21, "hxb")
  G.px(15, 15, "W"); G.px(11, 9, "W"); G.px(22, 22, "hxb")
end)

-- corazón de hierro negro: núcleo con forma de corazón, tibio, con un cristal clavado
icon("corazon_hierro_negro", function(G)
  G.ellipse(11, 12, 7, 7, "hx2"); G.ellipse(21, 12, 7, 7, "hx2")
  G.poly({{4, 14}, {28, 14}, {16, 29}}, "hx2")
  G.ellipse(10, 10, 4, 4, "hx1"); G.poly({{5, 14}, {10, 14}, {14, 23}}, "hx1")
  G.poly({{28, 13}, {16, 29}, {20, 16}}, "hx3")
  G.ellipse(16, 16, 4, 4, "pv2"); G.ellipse(16, 16, 2.5, 2.5, "pv1"); G.px(16, 16, "W")
  G.poly({{19, 4}, {22, 2}, {23, 9}, {20, 11}}, "ec2"); G.line(21, 3, 21, 9, "ev")
  G.px(9, 8, "W")
end)

-- llave de la Mina Profunda: grande, de hierro negro, con runas enanas en el ojo
icon("llave_mina", function(G)
  G.ellipse(9, 16, 7, 8, "hx2")
  G.ellipse(9, 15, 5, 6, "hx1")
  G.erase(9, 16, 2.6, 3)
  G.px(6, 11, "hxb"); G.px(12, 21, "hxb"); G.px(5, 18, "hxb")
  G.rect(16, 14, 29, 18, "hx2"); G.line(16, 14, 29, 14, "hx1"); G.line(16, 18, 29, 18, "hx3")
  G.rect(20, 19, 23, 24, "hx2"); G.line(20, 19, 20, 24, "hx1")
  G.rect(25, 19, 28, 26, "hx2"); G.line(25, 19, 25, 26, "hx1")
  G.px(22, 21, "hxb"); G.px(27, 22, "hxb"); G.px(18, 16, "hxb")
end)

-- carta de Elenya: sobre blanco con el sello dorado de la Catedral
icon("carta_elenya", function(G)
  envelope(G)
  G.ellipse(16, 18, 3.6, 3.6, "au2"); G.ellipse(16, 18, 2.2, 2.2, "au1")
  G.line(16, 16, 16, 20, "au3"); G.line(14, 18, 18, 18, "au3")
  G.px(6, 11, "al2"); G.px(26, 11, "al2")
end)

-- hacha de orco con el eclipse pintado en el mango
icon("hacha_orco", function(G)
  G.thick(8, 29, 20, 8, 3, "wd2")
  G.line(8, 28, 19, 8, "wd3")
  G.ellipse(13, 20, 2.6, 2.6, "ec3"); G.ellipse(12.4, 19.4, 1.8, 1.8, "wd2")
  G.poly({{14, 3}, {28, 2}, {29, 16}, {20, 14}, {17, 9}}, "fe3")
  G.poly({{14, 3}, {28, 2}, {27, 6}, {16, 7}}, "fe2")
  G.line(29, 3, 29, 15, "fe1")
  G.px(23, 9, "rb2"); G.px(25, 11, "rb2")
end)

-- cristal de la veta: trozo de veta de hierro con un cristal de eclipse incrustado
icon("cristal_veta", function(G)
  G.poly({{4, 20}, {9, 12}, {24, 11}, {29, 19}, {25, 28}, {7, 28}}, "rk2")
  G.poly({{4, 20}, {9, 12}, {24, 11}, {14, 17}}, "rk1")
  G.line(6, 24, 27, 22, "fe3"); G.line(8, 26, 25, 25, "hx2")
  G.poly({{12, 18}, {16, 3}, {21, 18}, {16, 22}}, "ec2")
  G.poly({{16, 3}, {21, 18}, {16, 22}, {17, 10}}, "ec3")
  G.line(15, 7, 14, 17, "ev"); G.px(15, 6, "W")
end)

-- esquirla del Segundo Sello: piedra azul con un trozo de runa que chispea
icon("esquirla_sello", function(G)
  G.poly({{9, 8}, {20, 4}, {26, 13}, {21, 27}, {10, 24}, {6, 15}}, "sl2")
  G.poly({{9, 8}, {20, 4}, {16, 12}, {7, 14}}, "sl1")
  G.poly({{20, 4}, {26, 13}, {21, 27}, {17, 22}, {19, 12}}, "sl3")
  G.line(12, 12, 16, 18, "sv"); G.line(16, 18, 13, 22, "sv"); G.line(16, 18, 20, 16, "sv")
  G.px(11, 9, "W"); G.px(4, 5, "zz1"); G.px(28, 22, "sv"); G.px(25, 4, "zz2")
end)

-- nota del Brujo: papel con los bordes quemados y una línea escrita en rojo
icon("nota_brujo", function(G)
  G.poly({{6, 5}, {25, 4}, {27, 27}, {5, 28}}, "pa")
  G.poly({{6, 5}, {11, 4}, {9, 8}, {5, 9}}, "qm1"); G.poly({{22, 26}, {27, 27}, {27, 21}}, "qm1")
  G.line(5, 12, 5, 20, "qm2"); G.line(26, 7, 27, 14, "qm2")
  for i = 0, 3 do G.line(9, 11 + i * 3, 22, 11 + i * 3, "gl3") end
  G.line(9, 23, 18, 23, "rb2")
  G.ellipse(21, 22, 2.4, 2.4, "ec2"); G.px(21, 22, "ev")
end)

-- corazón de la tormenta: piedra del tamaño de un puño, llena de rayos negros
icon("corazon_tormenta", function(G)
  G.ellipse(16, 16, 12, 11, "cl2"); G.ellipse(15, 15, 10, 9, "cl1")
  G.ellipse(16, 16, 6, 6, "ec2")
  G.line(19, 6, 14, 15, "ec3"); G.line(14, 15, 20, 16, "ec3"); G.line(20, 16, 14, 26, "ec3")
  G.line(18, 7, 14, 14, "ev"); G.line(19, 17, 16, 23, "ev")
  G.px(10, 9, "W"); G.px(3, 10, "zz2"); G.px(29, 22, "ev"); G.px(27, 5, "zz1")
end)

-- Segundo Fragmento de Sello: piedra tibia con la runa de plata del Sello de la montaña
icon("fragmento_sello_montanas", function(G)
  G.poly({{9, 6}, {23, 4}, {28, 16}, {22, 28}, {8, 27}, {4, 15}}, "sl2")
  G.poly({{9, 6}, {23, 4}, {19, 10}, {8, 12}}, "sl1")
  G.poly({{23, 4}, {28, 16}, {22, 28}, {19, 26}, {21, 12}}, "sl3")
  G.ellipse(15, 16, 6, 6, "sv")
  G.line(15, 11, 15, 21, "sl3"); G.line(11, 16, 19, 16, "sl3"); G.line(12, 13, 18, 19, "sl2"); G.line(18, 13, 12, 19, "sl2")
  G.ellipse(15, 16, 1.6, 1.6, "W"); G.px(10, 8, "W")
end)

-- ---------------------------------------------------------------- secundarias de las Montañas
-- el anillo de compromiso de Durgan: oro con una runa enana y una piedra azul
icon("anillo_durgan", function(G)
  ring(G, "au1", "au2", "au3", "sl1", "sl2")
  G.px(8, 22, "hxb"); G.px(24, 22, "hxb")
end)

-- la olla de Hilda: olla de hierro con asas y el guiso todavía humeando
icon("olla_hilda", function(G)
  G.ellipse(16, 20, 11, 8, "po2"); G.ellipse(16, 18, 10, 6, "po1")
  G.ellipse(16, 13, 10, 3, "po3"); G.ellipse(16, 13, 8.5, 2.2, "st1"); G.px(13, 13, "mt"); G.px(19, 12, "bn")
  G.rect(3, 15, 6, 17, "po3"); G.rect(26, 15, 29, 17, "po3")
  G.ellipse(16, 27, 9, 1.5, "po3")
  G.px(13, 8, "W"); G.px(15, 6, "W"); G.px(19, 7, "W"); G.px(10, 18, "W")
end)

-- el cuerno de señales de Astrid: cuerno de cabra con boquilla y aros de bronce, y su cordón
icon("cuerno_astrid", function(G)
  G.poly({{5, 22}, {9, 16}, {17, 11}, {26, 9}, {28, 12}, {19, 16}, {11, 21}, {8, 26}}, "gh2")
  G.poly({{17, 11}, {26, 9}, {28, 12}, {19, 14}}, "gh1")
  G.poly({{5, 22}, {9, 16}, {11, 19}, {8, 26}}, "gh3")
  G.line(12, 14, 13, 19, "bz2"); G.line(20, 11, 21, 15, "bz2"); G.px(12, 15, "bz1"); G.px(20, 12, "bz1")
  G.ellipse(27, 10.5, 1.6, 2, "au2")
  G.line(9, 24, 14, 28, "rb2"); G.line(14, 28, 21, 26, "rb2"); G.px(24, 10, "W")
end)

-- la carta sellada del Rey: pergamino enrollado con lacre azul de tormenta y una cinta
icon("carta_rey", function(G)
  G.rect(6, 9, 26, 23, "pa"); G.rect(22, 9, 26, 23, "ln2")
  G.ellipse(6, 16, 2.5, 7, "ln2"); G.ellipse(26, 16, 2.5, 7, "ln3")
  for i = 0, 2 do G.line(10, 12 + i * 3, 20, 12 + i * 3, "gl3") end
  G.rect(4, 15, 28, 16, "az2")
  G.ellipse(16, 20, 4, 4, "az2"); G.ellipse(16, 20, 2.5, 2.5, "az1")
  G.line(17, 18, 15, 20, "zz2"); G.line(15, 20, 17, 22, "zz2")
end)

-- ---------------------------------------------------------------- moldes de las zonas 3 a 5
-- roca de tres caras (luz arriba a la izquierda, sombra a la derecha)
local function rockShape(G, c1, c2, c3)
  G.poly({{7, 9}, {18, 4}, {27, 10}, {26, 23}, {15, 28}, {5, 21}}, c2)
  G.poly({{7, 9}, {18, 4}, {27, 10}, {17, 12}}, c1)
  G.poly({{27, 10}, {26, 23}, {15, 28}, {18, 16}}, c3)
end
-- corazón de piedra o de metal
local function heartShape(G, c1, c2, c3)
  G.ellipse(11, 12, 7, 7, c2); G.ellipse(21, 12, 7, 7, c2)
  G.poly({{4, 14}, {28, 14}, {16, 29}}, c2)
  G.ellipse(10, 10, 4, 4, c1); G.poly({{5, 14}, {10, 14}, {14, 23}}, c1)
  G.poly({{28, 13}, {16, 29}, {20, 16}}, c3)
end
-- gema tallada: corona clara arriba y pabellón en punta
local function gem(G, g1, g2, g3, g4)
  G.poly({{4, 11}, {10, 4}, {22, 4}, {28, 11}, {16, 29}}, g3)
  G.poly({{4, 11}, {10, 4}, {22, 4}, {28, 11}}, g2)
  G.poly({{10, 6}, {22, 6}, {19, 10}, {13, 10}}, g1)
  G.poly({{4, 11}, {16, 29}, {12, 11}}, g2)
  G.poly({{20, 11}, {16, 29}, {28, 11}}, g4)
  G.line(4, 11, 28, 11, g4); G.line(12, 11, 16, 28, g1)
  G.px(12, 7, "W"); G.px(13, 7, "W"); G.px(7, 13, "W")
end
-- disco de piedra de un sello
local function sealDisk(G, s1, s2, s3)
  G.ellipse(16, 16, 13, 13, s3); G.ellipse(16, 15, 12, 12, s2)
  G.ellipse(16, 16, 9, 9, s3); G.ellipse(16, 15.5, 8, 8, s2)
  G.ellipse(12, 11, 4, 3, s1)
  for k = 0, 7 do local a = k * math.pi / 4; G.px(16 + math.cos(a) * 10.5, 15.5 + math.sin(a) * 10.5, s1) end
end
-- piel estirada
local function pelt(G, c1, c2, c3)
  G.poly({{7, 5}, {25, 5}, {28, 12}, {25, 18}, {27, 27}, {16, 25}, {5, 27}, {7, 18}, {4, 12}}, c2)
  G.poly({{9, 7}, {23, 7}, {25, 12}, {22, 17}, {23, 24}, {16, 22}, {9, 24}, {10, 17}, {7, 12}}, c1)
  for _, p in ipairs({{4, 12}, {28, 12}, {5, 27}, {27, 27}, {7, 5}, {25, 5}}) do G.px(p[1], p[2], c3) end
  for y = 9, 22, 3 do G.line(12, y, 14, y + 1, c2); G.line(18, y + 1, 20, y, c2) end
  G.line(16, 6, 16, 24, c3)
end
-- colmillo con la raíz abajo
local function fang(G, c1, c2, c3)
  G.poly({{9, 27}, {16, 26}, {20, 18}, {22, 9}, {20, 3}, {16, 9}, {11, 17}}, c2)
  G.poly({{16, 26}, {20, 18}, {22, 9}, {20, 3}, {19, 11}, {15, 20}}, c3)
  G.line(13, 21, 18, 10, c1)
end
-- tabla de madera para los asados
local function board(G)
  G.rect(3, 24, 29, 27, "wd1"); G.line(3, 27, 29, 27, "wd3"); G.line(5, 25, 26, 25, "wd2")
end
-- taza humeante (c: loza clara, media y sombra; l: el líquido)
local function cup(G, c1, c2, c3, l)
  steam(G)
  G.ellipse(16, 18, 11, 9, nil, function(x, y) if y < 17 then return nil end return (x > 21) and c3 or c2 end)
  G.rect(11, 26, 21, 28, c3)
  G.ellipse(16, 17, 11, 3, c1)
  G.ellipse(16, 17, 9, 2, l)
  G.thick(26, 18, 29, 22, 2, c2); G.line(27, 22, 25, 25, c2)
end
-- olla de hierro con asas (como la del caldo de oso)
local function pot(G, l)
  steam(G)
  G.ellipse(16, 20, 12, 9, nil, function(x, y) if y < 17 then return nil end return (x > 22) and "po3" or "po2" end)
  G.ellipse(16, 17, 12, 3, "po1"); G.ellipse(16, 17, 10, 2, l)
  G.rect(2, 18, 4, 20, "po3"); G.rect(28, 18, 30, 20, "po3")
end
-- trozo de carne cruda con su borde (b) y la veta (v)
local function meat(G, b, m, v)
  G.poly({{4, 18}, {10, 9}, {24, 7}, {29, 15}, {24, 25}, {9, 26}}, b)
  G.poly({{6, 18}, {11, 11}, {23, 9}, {27, 15}, {22, 23}, {10, 24}}, m)
  G.line(8, 17, 24, 13, v); G.line(11, 21, 22, 19, "r1")
end
-- coral ramificado
local function coral(G, c1, c2, c3)
  G.rect(9, 27, 23, 29, "rk2"); G.line(9, 27, 23, 27, "rk1")
  G.thick(16, 27, 16, 17, 3, c2); G.thick(16, 19, 9, 11, 2, c2); G.thick(16, 17, 23, 9, 2, c2)
  G.thick(10, 12, 7, 5, 2, c2); G.thick(12, 15, 13, 7, 2, c2); G.thick(22, 10, 26, 6, 2, c2)
  G.thick(20, 13, 19, 6, 2, c2); G.thick(16, 22, 24, 18, 2, c3); G.thick(24, 18, 27, 13, 2, c3)
  for _, p in ipairs({{7, 5}, {13, 7}, {26, 6}, {19, 6}, {27, 13}}) do G.ellipse(p[1], p[2], 1.6, 1.6, c1) end
  G.line(15, 26, 15, 18, c1); G.line(15, 18, 10, 12, c1)
end

-- ---------------------------------------------------------------- Volcán Rojo: materiales
-- escama de salamandra: redonda, naranja, con el borde al rojo
icon("escama_salamandra", function(G)
  G.ellipse(16, 16, 11, 12.5, "sa3")
  G.ellipse(16, 15, 9.5, 11, "sa2")
  G.ellipse(13, 11, 5, 5, "sa1")
  G.line(16, 6, 16, 26, "sa3"); G.line(9, 13, 16, 19, "sa3"); G.line(23, 13, 16, 19, "sa3")
  G.line(11, 26, 21, 26, "lv2"); G.px(16, 27, "lv1")
  G.px(11, 8, "W"); G.px(4, 6, "lv1"); G.px(28, 22, "lv2"); G.px(27, 5, "lv2")
end)

-- pelaje de ceniza: piel gris con brasas todavía prendidas
icon("pelaje_ceniza", function(G)
  pelt(G, "as1", "as2", "as3")
  for _, p in ipairs({{11, 11}, {20, 15}, {13, 20}, {22, 9}, {18, 22}}) do G.px(p[1], p[2], "lv2") end
  G.px(11, 12, "lv3"); G.px(20, 16, "lv3")
  G.px(14, 3, "lv1"); G.px(19, 2, "lv2"); G.px(29, 18, "lv1")
end)

-- caparazón de azufre: cúpula amarilla por segmentos que todavía humea
icon("caparazon_azufre", function(G)
  G.ellipse(16, 22, 13, 13, nil, function(x, y) if y > 22 then return nil end return x > 21 and "su3" or "su2" end)
  G.rect(3, 22, 29, 25, "su3"); G.line(4, 22, 28, 22, "su2")
  G.ellipse(12, 15, 5, 3, "su1")
  G.line(10, 12, 8, 21, "su3"); G.line(16, 9, 16, 21, "su3"); G.line(22, 12, 24, 21, "su3")
  G.px(12, 13, "W")
  G.px(9, 6, "as1"); G.px(10, 5, "as1"); G.px(9, 4, "as1"); G.px(21, 5, "as1"); G.px(22, 4, "as1"); G.px(21, 3, "as1")
end)

-- brasa de bandido: carbón con grietas que brillan
icon("brasa_bandido", function(G)
  G.poly({{5, 18}, {10, 10}, {19, 7}, {27, 12}, {27, 22}, {18, 28}, {8, 25}}, "ob2")
  G.poly({{10, 10}, {19, 7}, {27, 12}, {17, 15}, {7, 16}}, "ob1")
  G.poly({{27, 12}, {27, 22}, {18, 28}, {19, 18}}, "ob3")
  G.line(9, 20, 15, 17, "lv3"); G.line(15, 17, 22, 20, "lv3"); G.line(15, 17, 17, 12, "lv3"); G.line(12, 24, 18, 22, "lv3")
  G.line(10, 20, 15, 18, "lv2"); G.px(15, 17, "lv1"); G.px(20, 19, "lv2"); G.px(16, 13, "lv2")
  G.px(22, 4, "lv1"); G.px(25, 6, "lv2"); G.px(19, 2, "lv2"); G.px(12, 9, "obh")
end)

-- esencia de fuego: una llama encerrada
icon("esencia_fuego", function(G)
  G.poly({{17, 2}, {23, 9}, {26, 18}, {23, 26}, {16, 30}, {9, 26}, {6, 18}, {9, 12}, {12, 15}, {13, 8}}, "lv3")
  G.poly({{17, 6}, {21, 12}, {23, 19}, {20, 25}, {16, 27}, {12, 25}, {9, 19}, {11, 16}, {14, 18}, {15, 11}}, "lv2")
  G.poly({{17, 12}, {20, 18}, {18, 24}, {16, 25}, {14, 24}, {13, 20}}, "lv1")
  G.ellipse(16, 22, 1.8, 2.2, "W")
  G.px(5, 7, "lv1"); G.px(27, 8, "lv2"); G.px(27, 28, "lv1"); G.px(4, 26, "lv2")
end)

-- colmillo de magma: negro, con grietas de lava y la raíz fundida
icon("colmillo_magma", function(G)
  fang(G, "ob1", "ob2", "ob3")
  G.line(12, 23, 14, 20, "lv3"); G.line(14, 20, 17, 18, "lv2"); G.line(17, 18, 19, 13, "lv3")
  G.px(20, 4, "lv2"); G.px(21, 6, "lv3")
  G.rect(8, 26, 17, 29, "lv3"); G.rect(9, 27, 16, 27, "lv2"); G.px(12, 28, "lv1")
  G.px(14, 22, "obh")
end)

-- esquirla de obsidiana: vidrio volcánico negro y filoso
icon("esquirla_obsidiana", function(G)
  G.poly({{11, 29}, {7, 18}, {14, 2}, {22, 12}, {20, 29}}, "ob2")
  G.poly({{14, 2}, {22, 12}, {20, 29}, {16, 29}, {16, 12}}, "ob3")
  G.poly({{11, 29}, {7, 18}, {14, 2}, {13, 16}}, "ob1")
  G.line(13, 5, 10, 17, "obh"); G.line(17, 14, 18, 24, "ob1"); G.px(13, 4, "W")
  G.poly({{22, 29}, {25, 20}, {28, 29}}, "ob2"); G.line(25, 21, 24, 28, "obh")
end)

-- núcleo infernal: esfera roja con fuego por dentro y tres cuernitos
icon("nucleo_infernal", function(G)
  G.poly({{7, 8}, {4, 2}, {11, 5}}, "lv4"); G.poly({{25, 8}, {28, 2}, {21, 5}}, "lv4"); G.poly({{14, 5}, {16, 1}, {18, 5}}, "lv4")
  G.ellipse(16, 17, 12, 12, "lv4"); G.ellipse(16, 16, 10.5, 10.5, "lv3")
  G.poly({{16, 8}, {21, 16}, {20, 22}, {12, 22}, {11, 16}}, "lv2")
  G.poly({{16, 12}, {19, 17}, {18, 21}, {14, 21}, {13, 17}}, "lv1"); G.px(16, 19, "W")
  G.px(10, 10, "sa1"); G.px(11, 9, "W")
end)

-- ala de draco: ala de escamas rojas con sus huesos y la garra
icon("ala_draco", function(G)
  G.poly({{28, 8}, {4, 5}, {6, 12}, {10, 10}, {12, 18}, {17, 15}, {21, 26}, {24, 18}}, "dc2")
  G.poly({{26, 10}, {6, 7}, {8, 11}, {11, 9}, {13, 16}, {18, 13}, {21, 22}, {23, 17}}, "dc1")
  G.line(28, 8, 4, 5, "dc3"); G.line(28, 8, 10, 10, "dc3"); G.line(28, 8, 17, 15, "dc3"); G.line(28, 8, 21, 26, "dc3")
  for _, p in ipairs({{16, 7}, {19, 9}, {22, 12}, {23, 16}}) do G.px(p[1], p[2], "dc2") end
  G.px(29, 7, "pa"); G.px(30, 6, "pa"); G.px(4, 4, "pa"); G.px(3, 5, "pa")
end)

-- sello de eclipse: disco de piedra con el eclipse grabado
icon("sello_eclipse", function(G)
  sealDisk(G, "rk1", "rk2", "rk3")
  G.ellipse(16, 15.5, 5.5, 5.5, "ev"); G.ellipse(17.5, 14.5, 4.6, 4.6, "ec3")
  G.px(12, 19, "p1"); G.px(5, 4, "ev"); G.px(27, 27, "ev")
end)

-- cuerno de demonio de lava: cuerno negro con la punta al rojo
icon("cuerno_demonio_lava", function(G)
  G.thick(8, 28, 10, 18, 5, "ob2"); G.thick(10, 18, 16, 10, 4, "ob2"); G.thick(16, 10, 23, 6, 3, "lv3"); G.thick(23, 6, 28, 4, 2, "lv2")
  G.px(29, 3, "lv1"); G.px(28, 3, "lv1")
  G.line(7, 27, 9, 18, "ob1"); G.line(9, 18, 15, 10, "ob1"); G.line(17, 9, 22, 6, "lv2"); G.line(23, 5, 27, 4, "lv1")
  for _, p in ipairs({{9, 24}, {10, 20}, {12, 15}, {14, 12}}) do G.line(p[1] - 1, p[2] + 1, p[1] + 2, p[2] + 1, "ob3") end
  G.rect(5, 27, 12, 29, "lv3"); G.line(6, 28, 11, 28, "lv2")
end)

-- cola de diablillo: rabito rojo con la punta de flecha
icon("cola_diablillo", function(G)
  G.ellipse(5, 27, 2.5, 2.5, "rb2")
  G.thick(5, 27, 9, 21, 3, "rb2"); G.thick(9, 21, 10, 15, 3, "rb2"); G.thick(10, 15, 15, 12, 3, "rb2")
  G.thick(15, 12, 20, 13, 2, "rb2"); G.thick(20, 13, 23, 9, 2, "rb2")
  G.line(4, 26, 8, 21, "r2"); G.line(8, 20, 9, 15, "r2"); G.line(10, 14, 15, 11, "r2")
  G.poly({{20, 8}, {29, 2}, {27, 12}}, "r2"); G.poly({{20, 8}, {29, 2}, {24, 7}}, "r1"); G.line(23, 9, 27, 11, "rb2")
end)

-- corazón de brasa: piedra con forma de corazón que late como un carbón
icon("corazon_brasa", function(G)
  heartShape(G, "lv2", "lv3", "lv4")
  G.line(9, 14, 14, 18, "lv1"); G.line(14, 18, 13, 23, "lv1"); G.line(14, 18, 21, 16, "lv1")
  G.ellipse(16, 17, 2.5, 2.5, "lv1"); G.px(16, 17, "W"); G.px(9, 9, "W")
  G.px(4, 4, "lv1"); G.px(28, 5, "lv2"); G.px(27, 26, "lv1")
end)

-- escama de dragón corrupto: escama roja oscura con venas violetas del eclipse
icon("escama_dragon_corrupto", function(G)
  G.poly({{6, 5}, {26, 5}, {26, 15}, {16, 29}, {6, 15}}, "dc3")
  G.poly({{8, 7}, {24, 7}, {24, 15}, {16, 26}, {8, 15}}, "dc2")
  G.poly({{8, 7}, {15, 7}, {15, 23}, {8, 15}}, "dc1")
  G.line(16, 10, 16, 23, "ec1"); G.line(16, 15, 11, 19, "ev"); G.line(16, 13, 21, 17, "ev"); G.px(16, 20, "ev")
  G.ellipse(16, 11, 2, 2, "ec3"); G.px(10, 9, "W")
end)

-- cristal de lava: racimo de cristales naranjas sobre roca negra
icon("cristal_lava", function(G)
  G.poly({{13, 28}, {11, 12}, {15, 3}, {19, 12}, {18, 28}}, "lv2")
  G.poly({{15, 3}, {19, 12}, {18, 28}, {16, 28}, {16, 10}}, "lv3")
  G.poly({{6, 28}, {4, 18}, {7, 12}, {11, 19}, {11, 28}}, "lv2"); G.line(7, 13, 7, 27, "lv1")
  G.poly({{20, 28}, {21, 17}, {26, 9}, {28, 18}, {26, 28}}, "lv3"); G.line(25, 11, 23, 26, "lv2")
  G.line(14, 6, 13, 24, "lv1"); G.px(14, 5, "W")
  G.rect(3, 28, 29, 29, "ob2"); G.line(3, 28, 29, 28, "ob1")
end)

-- corazón de la caldera: núcleo fundido sujeto por bandas de hierro
icon("corazon_caldera", function(G)
  G.ellipse(16, 16, 12.5, 12.5, "lv3"); G.ellipse(15, 15, 10, 10, "lv2"); G.ellipse(13, 12, 5, 5, "lv1")
  G.thick(3, 16, 29, 16, 3, "po2"); G.thick(16, 3, 16, 29, 3, "po2")
  G.line(4, 15, 28, 15, "po1"); G.line(15, 4, 15, 28, "po1")
  for _, p in ipairs({{6, 16}, {26, 16}, {16, 6}, {16, 26}, {16, 16}}) do G.px(p[1], p[2], "fe1") end
  G.px(11, 10, "W"); G.px(22, 22, "lv1")
end)

-- núcleo del Titán de Fuego: roca partida con el fuego del titán dentro
icon("nucleo_titan_fuego", function(G)
  G.poly({{9, 3}, {23, 3}, {29, 10}, {29, 22}, {23, 29}, {9, 29}, {3, 22}, {3, 10}}, "as3")
  G.poly({{9, 3}, {23, 3}, {27, 8}, {6, 9}, {3, 10}}, "as2")
  G.ellipse(16, 16, 8, 8, "lv3"); G.ellipse(16, 16, 6, 6, "lv2"); G.ellipse(15, 15, 3, 3, "lv1"); G.px(15, 15, "W")
  G.line(3, 16, 8, 16, "lv3"); G.line(24, 16, 29, 14, "lv3"); G.line(16, 24, 18, 29, "lv3"); G.line(12, 9, 9, 4, "lv3")
  G.px(6, 6, "as1"); G.px(25, 26, "ob3")
end)

-- azufre: terrones de cristal amarillo
icon("azufre", function(G)
  for _, c in ipairs({{16, 10, 6}, {9, 20, 6}, {22, 21, 7}}) do
    local x, y, r = c[1], c[2], c[3]
    G.poly({{x - r, y}, {x - r // 2, y - r}, {x + r // 2, y - r}, {x + r, y}, {x + r // 2, y + r}, {x - r // 2, y + r}}, "su2")
    G.poly({{x - r, y}, {x - r // 2, y - r}, {x + r // 2, y - r}, {x, y}}, "su1")
    G.poly({{x + r, y}, {x + r // 2, y + r}, {x, y + r}, {x, y}}, "su3")
    G.px(x - r // 2, y - r + 1, "W")
  end
  G.px(26, 6, "as1"); G.px(27, 5, "as1"); G.px(26, 4, "as1")
end)

-- obsidiana bruta: roca negra y brillante como vidrio
icon("obsidiana_bruta", function(G)
  rockShape(G, "ob1", "ob2", "ob3")
  G.line(10, 10, 17, 6, "obh"); G.line(8, 14, 9, 19, "ob1"); G.line(19, 18, 23, 14, "ob1"); G.line(14, 22, 18, 20, "obh")
  G.px(11, 9, "W"); G.px(20, 19, "obh")
end)

-- flor de ceniza: pétalos grises con el centro encendido
icon("flor_ceniza", function(G)
  G.line(16, 30, 16, 18, "as3"); G.line(16, 24, 11, 21, "as3"); G.line(16, 26, 21, 23, "as2")
  G.ellipse(11, 21, 2.5, 1.5, "as2"); G.ellipse(21, 23, 2.5, 1.5, "as2")
  for k = 0, 4 do
    local a = k * 2 * math.pi / 5 - math.pi / 2
    G.ellipse(16 + math.cos(a) * 6, 12 + math.sin(a) * 6, 3.6, 3.6, "as1")
    G.px(16 + math.cos(a) * 8, 12 + math.sin(a) * 8, "as2")
  end
  G.ellipse(16, 12, 3, 3, "lv2"); G.px(15, 11, "lv1"); G.px(17, 13, "lv3")
  G.px(5, 6, "lv1"); G.px(27, 5, "lv2"); G.px(26, 27, "as1")
end)

-- piedra pómez: piedra clara, liviana y llena de agujeritos
icon("piedra_pomez", function(G)
  G.ellipse(16, 17, 13, 10, nil, function(x, y) return (x + y > 37) and "pm3" or "pm2" end)
  G.ellipse(13, 14, 9, 6, "pm1")
  for _, p in ipairs({{9, 13}, {14, 11}, {18, 15}, {12, 18}, {21, 20}, {7, 19}, {17, 22}, {24, 15}, {11, 23}, {20, 11}}) do
    G.rect(p[1], p[2], p[1] + 1, p[2] + 1, "pm3"); G.px(p[1], p[2], "as3")
  end
  G.px(9, 10, "W")
end)

-- gema de fuego
icon("gema_fuego", function(G)
  gem(G, "lv1", "lv2", "lv3", "lv4")
  G.px(28, 4, "lv1"); G.px(3, 22, "lv2"); G.px(26, 24, "lv1")
end)

-- escoria negra: grumos de metal quemado con burbujas
icon("escoria_negra", function(G)
  G.ellipse(11, 21, 8, 7, "as3"); G.ellipse(22, 20, 8, 8, "as3"); G.ellipse(16, 13, 7, 6, "as3")
  G.ellipse(10, 19, 4, 3, "as2"); G.ellipse(15, 11, 3, 2, "as2"); G.ellipse(21, 17, 3, 2.5, "as2")
  for _, p in ipairs({{13, 23}, {8, 22}, {18, 14}, {24, 22}, {20, 24}, {12, 15}}) do G.px(p[1], p[2], "ob3") end
  G.line(26, 27, 26, 29, "as3"); G.px(23, 23, "lv3"); G.px(14, 10, "as1"); G.px(9, 18, "as1")
end)

-- corazón de la Forja Negra: corazón de hierro negro con las rejillas de la forja encendidas
icon("corazon_forja_negra", function(G)
  heartShape(G, "hx1", "hx2", "hx3")
  for i = 0, 2 do G.rect(11 + i * 4, 13, 12 + i * 4, 21 - i, "lv3"); G.line(11 + i * 4, 13, 11 + i * 4, 20 - i, "lv2") end
  G.px(11, 13, "lv1"); G.px(15, 13, "lv1"); G.px(19, 13, "lv1")
  for _, p in ipairs({{8, 9}, {24, 9}, {16, 25}}) do G.px(p[1], p[2], "fe1") end
  G.px(9, 8, "W"); G.px(5, 3, "lv1"); G.px(27, 4, "lv2")
end)

-- cola de salamandra: carne de la cola, naranja con manchas, cortada de un lado
icon("carne_salamandra", function(G)
  G.poly({{4, 21}, {8, 14}, {18, 12}, {29, 5}, {23, 16}, {10, 25}}, "sa2")
  G.poly({{8, 14}, {18, 12}, {29, 5}, {19, 14}, {8, 17}}, "sa1")
  for _, p in ipairs({{12, 20}, {17, 17}, {21, 13}, {14, 15}, {24, 12}}) do G.px(p[1], p[2], "sa3"); G.px(p[1] + 1, p[2], "lv4") end
  G.ellipse(6, 19.5, 3, 4.5, "mt"); G.ellipse(6, 19.5, 1.5, 2.2, "r1"); G.px(6, 19, "pa")
end)

-- aceite de cocina: frasquito de aceite dorado con una rama de olivo
icon("aceite_cocina", function(G)
  flaskSmall(G, {"su1", "y1", "y2"})
  G.line(22, 27, 28, 21, "v3"); G.poly({{24, 24}, {28, 26}, {25, 22}}, "v2"); G.poly({{26, 21}, {29, 18}, {27, 23}}, "v2")
  G.ellipse(23, 28, 1.6, 1.6, "v3"); G.px(22, 27, "v1")
end)

-- ---------------------------------------------------------------- comidas del Volcán
-- asado de salamandra: la cola asada sobre la tabla
icon("asado_salamandra", function(G)
  steam(G); board(G)
  G.poly({{4, 22}, {9, 16}, {19, 15}, {29, 11}, {23, 20}, {10, 24}}, "st2")
  G.poly({{9, 16}, {19, 15}, {29, 11}, {19, 17}, {8, 19}}, "st1")
  G.line(12, 17, 14, 22, "wd3"); G.line(17, 16, 19, 21, "wd3"); G.line(22, 14, 23, 18, "wd3")
  G.ellipse(6, 21, 2, 2.5, "mt"); G.px(15, 17, "am1"); G.px(25, 13, "am1")
end)

-- té de flor de ceniza: taza de barro con la flor gris flotando
icon("te_flor_ceniza", function(G)
  cup(G, "pm1", "st1", "st2", "am2")
  for k = 0, 4 do local a = k * 2 * math.pi / 5; G.px(16 + math.cos(a) * 2.5, 17 + math.sin(a) * 1.2, "as1") end
  G.px(16, 17, "lv2")
end)

-- chile de azufre: cuenco de chile rojo con trozos amarillos y un ají encima
icon("chile_azufre", function(G)
  steam(G)
  bowl(G, "lv3", "su1")
  G.thick(17, 15, 24, 11, 2, "r2"); G.line(18, 14, 23, 11, "r1"); G.line(25, 10, 26, 8, "v3"); G.px(24, 10, "v2")
  G.px(10, 18, "su1"); G.px(13, 17, "su2")
end)

-- estofado de draco: olla con estofado rojo y la punta de un ala asomando
icon("estofado_draco", function(G)
  G.poly({{19, 16}, {24, 4}, {27, 9}, {23, 16}}, "dc2"); G.line(20, 15, 24, 5, "dc1"); G.px(24, 3, "pa")
  pot(G, "dc1")
  G.px(11, 17, "mt"); G.px(14, 17, "st1"); G.px(9, 17, "su1")
end)

-- elixir de magma: botella de lava con una llama en la etiqueta
icon("elixir_magma", function(G)
  flaskBig(G, {"lv1", "lv2", "lv3"}, function(g)
    g.poly({{16, 18}, {19, 22}, {18, 24}, {14, 24}, {13, 22}}, "lv3"); g.px(16, 22, "lv2"); g.px(16, 23, "lv1")
  end)
end)

-- ---------------------------------------------------------------- Costas Muertas: materiales
-- caparazón de cangrejo gigante, con sus púas
icon("caparazon_cangrejo", function(G)
  for _, x in ipairs({7, 12, 20, 25}) do G.poly({{x - 2, 13}, {x, 7}, {x + 2, 12}}, "sh2") end
  G.ellipse(16, 18, 13, 9, "sh3"); G.ellipse(16, 17, 11.5, 7.5, "sh2"); G.ellipse(12, 14, 6, 3.5, "sh1")
  G.line(9, 21, 14, 18, "sh3"); G.line(23, 21, 18, 18, "sh3")
  for _, p in ipairs({{20, 14}, {8, 18}, {24, 18}, {16, 22}}) do G.px(p[1], p[2], "sh3") end
  G.px(10, 13, "W"); G.rect(4, 26, 7, 28, "sh3"); G.rect(25, 26, 28, 28, "sh3")
end)

-- pluma salada: pluma de gaviota con cristales de sal
icon("pluma_salada", function(G)
  G.poly({{26, 28}, {22, 18}, {14, 9}, {5, 3}, {8, 12}, {16, 21}}, "wl2")
  G.poly({{22, 18}, {14, 9}, {5, 3}, {12, 11}, {20, 19}}, "wl1")
  G.line(27, 29, 6, 4, "W")
  for k = 0, 4 do G.line(22 - k * 3, 23 - k * 4, 18 - k * 3, 23 - k * 4, "wl3") end
  G.line(6, 4, 9, 6, "hp2")
  G.px(27, 9, "W"); G.px(28, 10, "aq1"); G.px(4, 18, "W"); G.px(25, 15, "aq1")
end)

-- parche de pirata: parche negro con calavera y sus correas
icon("parche_pirata", function(G)
  G.line(2, 9, 10, 15, "ta1"); G.line(2, 10, 10, 16, "ta2"); G.line(22, 15, 30, 9, "ta1"); G.line(22, 16, 30, 10, "ta2")
  G.ellipse(16, 18, 8, 7, "ta2"); G.ellipse(15, 17, 6.5, 5.5, "ta1")
  G.ellipse(16, 16, 2.6, 2.2, "W"); G.rect(15, 18, 17, 19, "W"); G.px(15, 16, "K"); G.px(17, 16, "K")
  G.line(12, 22, 20, 22, "W"); G.px(11, 14, "as2")
end)

-- caparazón hervido: cola de langosta roja por segmentos, todavía humeando
icon("caparazon_hervido", function(G)
  G.poly({{24, 18}, {30, 12}, {30, 26}}, "sh2"); G.line(25, 18, 29, 14, "sh1")
  for i = 0, 4 do
    local cx = 6 + i * 4
    G.ellipse(cx, 19, 3.5, 8 - i * 0.6, "sh3"); G.ellipse(cx - 0.5, 18, 2.6, 6.5 - i * 0.6, "sh2"); G.line(cx - 2, 13 + i, cx, 12 + i * 0.6, "sh1")
  end
  G.px(11, 9, "gl1"); G.px(12, 8, "gl1"); G.px(11, 7, "gl1"); G.px(18, 9, "gl1"); G.px(17, 8, "gl1"); G.px(18, 7, "gl1")
end)

-- diente de piraña: mandíbula con la fila de dientes filosos
icon("diente_pirana", function(G)
  G.ellipse(16, 22, 14, 7, nil, function(x, y) if y < 20 then return nil end return (y > 25) and "bt3" or "rb2" end)
  for i = 0, 3 do
    local x = 4 + i * 6
    local top = (i == 1 or i == 2) and 7 or 10
    G.poly({{x, 21}, {x + 3, top}, {x + 6, 21}}, "pa"); G.line(x + 3, top + 1, x + 5, 20, "gh2"); G.px(x + 2, top + 4, "W")
  end
  G.px(8, 24, "sh1"); G.px(22, 25, "sh3")
end)

-- cuero de cocodrilo: piel verde con las placas
icon("cuero_cocodrilo", function(G)
  G.poly({{5, 6}, {27, 4}, {28, 26}, {4, 28}}, "ce2")
  for x = 7, 23, 5 do for y = 8, 23, 5 do
    G.rect(x, y, x + 2, y + 2, "ce1"); G.px(x + 2, y + 2, "ce3"); G.px(x + 3, y + 3, "ce3")
  end end
  G.line(5, 6, 27, 4, "ce1"); G.line(28, 5, 28, 26, "ce3"); G.px(6, 7, "W")
end)

-- gel de medusa: campana violeta translúcida con sus tentáculos
icon("gel_medusa", function(G)
  for i, x in ipairs({10, 14, 18, 22}) do
    for y = 15, 29 do G.px(x + math.sin(y * 0.6 + i) * 1.4, y, (y > 24) and "me3" or "me2") end
  end
  G.ellipse(16, 14, 12, 9, nil, function(x, y) if y > 15 then return nil end return x > 22 and "me3" or "me2" end)
  G.rect(4, 15, 28, 16, "me3")
  G.ellipse(12, 10, 5, 3, "me1"); G.px(10, 9, "W"); G.px(11, 8, "W")
  G.px(16, 12, "pe1"); G.px(20, 11, "me1")
end)

-- escama de sirena: escama tornasolada, verde mar y violeta
icon("escama_sirena", function(G)
  local function band(x, y) if y < 10 then return "oc1" elseif y < 16 then return "oc2" elseif y < 22 then return "me2" else return "me3" end end
  G.ellipse(16, 13, 11, 10, nil, band)
  G.poly({{5, 14}, {27, 14}, {16, 30}}, nil, band)
  G.line(16, 5, 16, 26, "pe1"); G.line(10, 9, 9, 18, "W"); G.px(21, 8, "pe1")
  G.px(4, 4, "oc1"); G.px(28, 24, "me1")
end)

-- fragmento de coral vivo: coral rosado sobre su piedra, con brillitos
icon("fragmento_coral", function(G)
  coral(G, "cr1", "cr2", "cr3")
  G.px(4, 8, "aq1"); G.px(28, 4, "oc1"); G.px(29, 20, "aq1")
end)

-- cadena ahogada: eslabones oxidados con un alga enredada
icon("cadena_ahogada", function(G)
  for i = 0, 4 do
    local cx, cy = 6 + i * 5, 26 - i * 5
    if i % 2 == 0 then G.ellipse(cx, cy, 4, 3, "rs2"); G.ellipse(cx - 0.5, cy - 0.5, 3, 2, "rs1"); G.erase(cx, cy, 1.8, 1)
    else G.ellipse(cx, cy, 1.6, 3.5, "rs1"); G.line(cx + 1, cy - 2, cx + 1, cy + 2, "rs2") end
  end
  for y = 8, 22 do G.px(13 + math.sin(y * 0.7) * 1.5, y, "ag2") end
  G.px(13, 7, "ag1"); G.px(25, 5, "aq2"); G.px(5, 18, "aq2")
end)

-- sello de la marea: disco de piedra verde mar con tres olas
icon("sello_marea", function(G)
  sealDisk(G, "oc1", "oc3", "oc4")
  for i = 0, 2 do
    local y = 12 + i * 4
    for x = 10, 22 do G.px(x, y + math.floor(math.sin((x - 10) * 0.8) * 1.2 + 0.5), (i == 0) and "W" or "oc1") end
  end
end)

-- tinta abisal: la bolsa de tinta de un calamar, que gotea
icon("tinta_abisal", function(G)
  G.poly({{11, 13}, {21, 13}, {17, 3}, {15, 3}}, "ab2")
  G.ellipse(16, 18, 10, 9, "ab2"); G.ellipse(18, 20, 7, 6, "ab3")
  G.ellipse(12, 15, 3, 4, "ab1"); G.px(11, 13, "W"); G.px(12, 12, "W")
  G.line(20, 27, 20, 29, "ab3"); G.ellipse(24, 29, 4, 1.4, "ab3"); G.px(23, 29, "abg"); G.px(26, 8, "abg")
end)

-- colmillo de leviatán: colmillo enorme, azulado, con un percebe
icon("colmillo_leviatan", function(G)
  G.poly({{6, 28}, {14, 28}, {21, 20}, {26, 10}, {28, 2}, {22, 6}, {15, 13}, {8, 21}}, "pe2")
  G.poly({{14, 28}, {21, 20}, {26, 10}, {28, 2}, {24, 11}, {17, 21}}, "pe3")
  G.line(10, 23, 16, 15, "pe1"); G.line(16, 15, 23, 8, "pe1")
  G.rect(5, 27, 15, 29, "oc3"); G.line(6, 27, 14, 27, "oc2")
  G.ellipse(9, 24, 2, 1.6, "os2"); G.px(9, 24, "os3")
end)

-- perla marina: concha abierta con una perla blanca
icon("perla_marina", function(G)
  G.ellipse(16, 11, 12, 7, nil, function(x, y) if y > 13 then return nil end return x > 21 and "os3" or "os2" end)
  for x = 8, 24, 4 do G.line(16, 13, x, 5, "os3") end
  G.ellipse(16, 21, 13, 8, nil, function(x, y) if y < 19 then return nil end return x > 22 and "os3" or "os2" end)
  for x = 6, 26, 4 do G.line(16, 20, x, 28, "os3") end
  G.ellipse(16, 18, 11, 3.5, "pe2"); G.ellipse(16, 18, 8, 2, "om1")
  G.ellipse(16, 17, 3.5, 3.5, "pe2"); G.ellipse(15, 16, 2.2, 2.2, "pe1"); G.px(14, 15, "W")
end)

-- carta de Velanegra: carta de navegar con la costa, una X y la vela negra
icon("carta_velanegra", function(G)
  G.rect(6, 8, 26, 25, "pa"); G.rect(22, 8, 26, 25, "ln2")
  G.ellipse(6, 16.5, 2.5, 9, "ln2"); G.ellipse(26, 16.5, 2.5, 9, "ln3")
  G.rect(8, 9, 21, 24, "aq2")
  G.poly({{8, 9}, {16, 9}, {13, 14}, {9, 18}, {8, 18}}, "y1"); G.line(16, 9, 9, 18, "y2")
  G.line(15, 19, 19, 23, "rb2"); G.line(19, 19, 15, 23, "rb2")
  G.line(17, 12, 17, 16, "wd3"); G.poly({{17, 12}, {20, 14}, {17, 15}}, "ta2")
  G.line(10, 22, 14, 21, "aq3")
end)

-- ancla del Almirante: ancla de hierro con el cepo dorado
icon("ancla_almirante", function(G)
  G.ellipse(16, 4.5, 3, 3, "au2"); G.erase(16, 4.5, 1.4, 1.4)
  G.rect(15, 7, 17, 26, "fe2"); G.line(15, 8, 15, 26, "fe1")
  G.rect(8, 9, 24, 11, "au2"); G.line(8, 9, 24, 9, "au1"); G.px(8, 10, "au3"); G.px(24, 10, "au3")
  G.thick(16, 27, 8, 23, 2, "fe2"); G.thick(16, 27, 24, 23, 2, "fe2")
  G.thick(8, 23, 6, 19, 2, "fe2"); G.thick(24, 23, 26, 19, 2, "fe2")
  G.poly({{3, 20}, {6, 15}, {9, 20}}, "fe1"); G.poly({{23, 20}, {26, 15}, {29, 20}}, "fe3")
  for y = 13, 21 do G.px(18 + math.sin(y * 0.8), y, "ag2") end
end)

-- corazón abisal: corazón de la bestia de las profundidades, con venas que brillan
icon("corazon_abisal", function(G)
  heartShape(G, "ab1", "ab2", "ab3")
  G.line(10, 15, 15, 19, "abg"); G.line(15, 19, 14, 24, "abg"); G.line(15, 19, 22, 15, "abg")
  G.ellipse(16, 18, 2, 2, "oc1"); G.px(9, 9, "W")
  G.px(4, 4, "abg"); G.px(28, 6, "oc1"); G.px(27, 27, "abg")
end)

-- alga salina: tres hojas de alga atadas, con cristales de sal
icon("alga_salina", function(G)
  for i, b in ipairs({10, 16, 22}) do
    for y = 3 + (i % 2) * 2, 27 do
      local x = b + math.sin(y * 0.35 + i * 2) * 1.2
      G.rect(x - 1, y, x + 1, y, "ag2"); G.px(x - 1, y, "ag1"); G.px(x + 1, y, "ag3")
    end
  end
  G.rect(9, 22, 23, 23, "co1"); G.line(9, 23, 23, 23, "co2")
  G.px(8, 9, "W"); G.px(18, 7, "W"); G.px(24, 14, "W"); G.px(12, 17, "W")
end)

-- coral rojo: abanico de coral rojo
icon("coral_rojo", function(G)
  G.rect(9, 27, 23, 29, "rk2"); G.line(9, 27, 23, 27, "rk1")
  G.thick(16, 27, 16, 15, 3, "r3"); G.thick(16, 21, 9, 15, 2, "r3"); G.thick(16, 19, 23, 13, 2, "r3")
  G.thick(9, 15, 6, 8, 2, "r2"); G.thick(9, 15, 12, 9, 2, "r2"); G.thick(23, 13, 26, 7, 2, "r2"); G.thick(23, 13, 20, 7, 2, "r2")
  G.thick(16, 15, 15, 5, 2, "r2"); G.thick(16, 15, 18, 9, 2, "r2")
  for _, p in ipairs({{6, 8}, {12, 9}, {26, 7}, {20, 7}, {15, 5}, {18, 9}}) do G.ellipse(p[1], p[2], 1.5, 1.5, "r1") end
  G.line(15, 26, 15, 16, "r2"); G.px(4, 4, "aq1"); G.px(28, 18, "aq1")
end)

-- carne de ostra: ostra abierta con la carne dentro
icon("carne_ostra", function(G)
  G.poly({{4, 16}, {8, 8}, {18, 5}, {27, 9}, {29, 18}, {24, 27}, {12, 28}, {5, 23}}, "os2")
  G.poly({{4, 16}, {8, 8}, {18, 5}, {27, 9}, {18, 9}, {8, 13}}, "os1")
  G.poly({{24, 27}, {29, 18}, {27, 25}}, "os3")
  G.ellipse(16, 17, 10, 8, "pe2"); G.ellipse(16, 17, 7.5, 6, "om1")
  G.ellipse(17, 18, 4, 3, "om2"); G.line(10, 14, 13, 12, "pe1"); G.px(13, 15, "W")
end)

-- madera de naufragio: tablas rotas, mojadas, con un clavo oxidado y percebes
icon("madera_naufragio", function(G)
  G.poly({{3, 7}, {27, 6}, {25, 9}, {29, 11}, {26, 14}, {3, 14}}, "wd2"); G.line(4, 8, 25, 7, "wd1"); G.line(4, 13, 25, 13, "wd3")
  G.poly({{5, 18}, {24, 17}, {28, 20}, {22, 22}, {26, 25}, {5, 26}}, "wd3"); G.line(6, 19, 23, 18, "wd2")
  G.rect(3, 15, 29, 16, "co2")
  G.line(9, 10, 9, 22, "rs2"); G.px(9, 9, "rs1"); G.px(9, 21, "rs1")
  G.ellipse(19, 11, 1.6, 1.6, "os1"); G.px(19, 11, "os3"); G.ellipse(14, 22, 1.6, 1.6, "os1"); G.px(14, 22, "os3")
  G.px(24, 28, "aq2"); G.px(26, 29, "aq2"); G.px(17, 24, "ag2"); G.px(18, 23, "ag2")
end)

-- cuerda con alquitrán: rollo de cuerda negra que gotea
icon("cuerda_alquitran", function(G)
  for _, r in ipairs({12, 9, 6, 3}) do
    G.ellipse(16, 17, r, r * 0.7, nil, function(x, y) return ((x + y) % 3 == 0) and "ta1" or "co2" end)
    G.erase(16, 17, r - 1.6, (r - 1.6) * 0.7)
  end
  G.thick(27, 18, 29, 27, 2, "co2")
  G.ellipse(18, 27, 6, 1.5, "ta2"); G.line(20, 25, 20, 26, "ta2"); G.px(11, 12, "co1"); G.px(14, 11, "co1")
end)

-- estrella de mar
icon("estrella_mar", function(G)
  local pts, inner = {}, {}
  for k = 0, 9 do
    local a = -math.pi / 2 + k * math.pi / 5
    local r = (k % 2 == 0) and 14 or 5.5
    pts[#pts + 1] = {16 + math.cos(a) * r, 17 + math.sin(a) * r}
    inner[#inner + 1] = {16 + math.cos(a) * r * 0.6, 16 + math.sin(a) * r * 0.6}
  end
  G.poly(pts, "sa2"); G.poly(inner, "sa1")
  for k = 0, 4 do
    local a = -math.pi / 2 + k * 2 * math.pi / 5
    for d = 4, 10, 3 do G.px(16 + math.cos(a) * d, 17 + math.sin(a) * d, "pa") end
  end
  G.px(16, 17, "sa3")
end)

-- sal marina: saco de lino abierto lleno de sal
icon("sal_marina", function(G)
  G.poly({{7, 13}, {25, 13}, {28, 27}, {4, 27}}, "ln2")
  G.poly({{20, 13}, {25, 13}, {28, 27}, {22, 27}}, "ln3")
  G.ellipse(16, 13, 9, 4, "W"); G.ellipse(16, 12, 6, 2.5, "pe1")
  for _, p in ipairs({{12, 11}, {18, 10}, {21, 13}, {14, 14}}) do G.px(p[1], p[2], "aq1") end
  G.line(7, 17, 25, 17, "co2"); G.px(25, 18, "co2")
  G.px(5, 7, "W"); G.px(27, 8, "aq1")
end)

-- arena abisal: montoncito de arena violeta oscura que brilla
icon("arena_abisal", function(G)
  G.ellipse(16, 27, 14, 15, nil, function(x, y) if y > 27 then return nil end return (x > 20) and "ab2" or "ab1" end)
  G.rect(2, 27, 30, 28, "ab3")
  for _, p in ipairs({{12, 17}, {18, 21}, {9, 24}, {22, 25}, {15, 14}, {25, 21}}) do G.px(p[1], p[2], "abg") end
  G.ellipse(7, 26, 2, 1.4, "pe2"); G.px(14, 13, "me1")
end)

-- perla del abismo: perla negra violeta que brilla
icon("perla_abismo", function(G)
  G.ellipse(16, 25, 10, 4, "ab3"); G.ellipse(16, 24, 8, 2, "os3")
  G.ellipse(16, 15, 10, 10, "ab2"); G.ellipse(14, 13, 6, 6, "ab1"); G.ellipse(13, 11, 2.5, 2.5, "me2")
  G.px(12, 10, "W"); G.px(20, 20, "abg"); G.px(21, 19, "abg")
  G.px(3, 6, "abg"); G.px(28, 5, "abg"); G.px(27, 13, "oc1"); G.px(4, 16, "oc1")
end)

-- carne de cocodrilo: trozo de cola con la piel verde
icon("carne_cocodrilo", function(G)
  meat(G, "rb2", "mt", "pa")
  G.poly({{4, 18}, {10, 9}, {24, 7}, {29, 15}, {25, 14}, {22, 11}, {11, 13}, {7, 18}}, "ce2")
  for x = 11, 24, 4 do G.rect(x, 9, x + 1, 10, "ce1") end
  G.px(16, 18, "W")
end)

-- ---------------------------------------------------------------- comidas de las Costas
-- sopa de cangrejo: servida en el caparazón, con una pinza
icon("sopa_cangrejo", function(G)
  steam(G)
  G.poly({{22, 14}, {26, 4}, {29, 6}, {27, 11}, {29, 13}, {25, 16}}, "sh2"); G.line(23, 13, 26, 5, "sh1")
  G.ellipse(16, 19, 13, 9, nil, function(x, y) if y < 18 then return nil end return (x > 22) and "sh3" or "sh2" end)
  G.rect(12, 27, 20, 29, "sh3")
  G.ellipse(16, 18, 13, 3.2, "sh1")
  G.ellipse(16, 18, 11, 2.2, nil, function(x, y) return ((x + y) % 5 == 0) and "sh2" or "pa" end)
  G.line(6, 21, 9, 25, "sh1")
end)

-- ostras a la brasa: tres ostras sobre la parrilla con el fuego abajo
icon("ostras_brasa", function(G)
  G.poly({{7, 29}, {10, 24}, {12, 28}, {15, 23}, {18, 28}, {21, 24}, {24, 29}}, "lv2"); G.px(15, 26, "lv1")
  for y = 18, 22, 2 do G.line(3, y, 29, y, "po2") end
  for i, x in ipairs({8, 16, 24}) do
    local y = 14 - (i == 2 and 2 or 0)
    G.ellipse(x, y, 5, 4, "os2"); G.ellipse(x, y - 0.5, 3.5, 2.6, "om1"); G.px(x, y, "om2"); G.px(x - 2, y - 2, "W")
  end
  steam(G)
end)

-- té de alga: taza de loza con el té verde y una hojita de alga
icon("te_alga", function(G)
  cup(G, "gl1", "gl2", "gl3", "ag2")
  G.line(13, 17, 19, 17, "ag1"); G.px(16, 16, "ag1")
end)

-- ceviche de ostras: plato con ostras, limón y cebolla morada
icon("ceviche_ostras", function(G)
  G.ellipse(16, 20, 14, 7, "pe3"); G.ellipse(16, 19, 13, 6, "pe1"); G.ellipse(16, 19, 9, 4, "pe2")
  for _, p in ipairs({{11, 18}, {17, 17}, {14, 21}, {20, 20}}) do G.ellipse(p[1], p[2], 2.2, 1.6, "om1"); G.px(p[1], p[2], "om2") end
  G.ellipse(24, 15, 3.5, 3.5, "v3"); G.ellipse(24, 15, 2.5, 2.5, "v1"); G.px(24, 15, "v2")
  G.px(9, 20, "cr2"); G.px(21, 18, "cr2"); G.px(15, 18, "ag2")
end)

-- guiso de cocodrilo: cuenco con trozos de carne y alga
icon("guiso_cocodrilo", function(G)
  steam(G)
  bowl(G, "st1", "ce2")
  G.px(12, 17, "mt"); G.px(19, 18, "mt"); G.px(15, 18, "ag1")
end)

-- elixir de la marea: botella violeta con una ola
icon("elixir_marea", function(G)
  flaskBig(G, {"me1", "me2", "me3"}, function(g)
    for x = 12, 20 do g.px(x, 21 + math.floor(math.sin((x - 12) * 0.8) * 1.2 + 0.5), "oc2") end
    g.line(12, 23, 20, 23, "oc3")
  end)
end)

-- brocheta de calamar en su tinta: palito con anillos negros y un tentáculo
icon("brocheta_calamar", function(G)
  G.thick(4, 28, 28, 4, 2, "wd1"); G.line(4, 27, 27, 4, "wd2")
  for i = 0, 3 do
    local x, y = 9 + i * 5, 23 - i * 5
    G.ellipse(x, y, 3.5, 3.5, "ta2"); G.ellipse(x - 0.5, y - 0.5, 2.5, 2.5, "ab3"); G.erase(x, y, 1, 1)
    G.px(x - 2, y - 2, "ab1")
  end
  for k = 0, 4 do G.px(27 + math.sin(k) , 6 + k, "ta1") end
  G.px(13, 14, "pa"); G.px(23, 22, "ab3")
end)

-- ---------------------------------------------------------------- Tundra Eterna: materiales
-- grasa de foca: tarro de barro rebosando de grasa blanca
icon("grasa_foca", function(G)
  G.ellipse(16, 20, 10, 9, nil, function(x, y) return (x > 21) and "st2" or "st1" end)
  G.rect(10, 10, 22, 12, "st2"); G.line(10, 10, 22, 10, "st1")
  G.ellipse(16, 10, 7, 4, "gr2"); G.ellipse(15, 9, 5, 2.5, "gr1")
  G.line(21, 11, 22, 16, "gr2"); G.px(22, 17, "gr1"); G.px(13, 8, "W")
  G.line(8, 22, 24, 22, "st2"); G.px(10, 17, "pa")
end)

-- colmillo de jabalí helado: colmillo curvo con la punta escarchada
icon("colmillo_jabali_helado", function(G)
  G.thick(6, 27, 10, 17, 6, "gh2"); G.thick(10, 17, 17, 10, 5, "gh1"); G.thick(17, 10, 24, 8, 3, "ih1"); G.thick(24, 8, 28, 12, 3, "ih2")
  G.line(5, 26, 8, 17, "pa"); G.line(9, 16, 16, 9, "pa"); G.line(17, 8, 24, 7, "W")
  G.rect(3, 27, 11, 29, "br2"); G.line(4, 27, 10, 27, "br1")
  G.px(21, 4, "ih1"); G.px(29, 7, "W"); G.px(13, 20, "ih2"); G.px(4, 15, "ih1")
end)

-- piel de lobo de hielo: piel azulada con carámbanos en el borde
icon("piel_lobo_hielo", function(G)
  pelt(G, "ih1", "ih2", "ih3")
  for _, x in ipairs({9, 13, 19, 23}) do G.line(x, 25, x, 27, "ih2"); G.px(x, 28, "W") end
  G.px(12, 10, "W"); G.px(20, 13, "W")
end)

-- pluma nívea: pluma ancha, blanca, con las puntas celestes
icon("pluma_nivea", function(G)
  G.poly({{8, 29}, {6, 19}, {9, 10}, {17, 4}, {25, 4}, {24, 12}, {17, 20}}, "W")
  G.poly({{17, 20}, {24, 12}, {25, 4}, {20, 11}}, "wl2")
  G.line(7, 30, 23, 6, "wl3")
  for k = 0, 3 do G.line(9 + k * 3, 23 - k * 4, 6 + k * 3, 19 - k * 4, "wl2") end
  G.px(25, 4, "ih2"); G.px(24, 5, "ih2"); G.px(6, 19, "ih2"); G.px(17, 4, "ih2")
  G.px(28, 18, "W"); G.px(4, 8, "ih1")
end)

-- esencia congelada: cubo de hielo con una llama azul quieta dentro
icon("esencia_congelada", function(G)
  G.poly({{16, 3}, {28, 9}, {16, 15}, {4, 9}}, "ih1")
  G.poly({{4, 9}, {16, 15}, {16, 29}, {4, 23}}, "ih2")
  G.poly({{28, 9}, {16, 15}, {16, 29}, {28, 23}}, "ih3")
  G.poly({{16, 10}, {20, 17}, {19, 23}, {13, 23}, {12, 17}}, "b2")
  G.poly({{16, 14}, {18, 19}, {17, 22}, {15, 22}, {14, 19}}, "b1"); G.px(16, 20, "W")
  G.line(16, 4, 26, 9, "W"); G.line(5, 10, 5, 21, "W")
end)

-- núcleo de escarcha: esfera de hielo con un copo de nieve dentro
icon("nucleo_escarcha", function(G)
  G.ellipse(16, 16, 12, 12, "ih3"); G.ellipse(16, 15, 10, 10, "ih2")
  for k = 0, 2 do
    local a = k * math.pi / 3
    G.line(16 - math.cos(a) * 7, 16 - math.sin(a) * 7, 16 + math.cos(a) * 7, 16 + math.sin(a) * 7, "W")
  end
  for k = 0, 5 do local a = k * math.pi / 3; G.px(16 + math.cos(a) * 5, 16 + math.sin(a) * 5, "ih1") end
  G.px(16, 16, "ih1"); G.px(10, 9, "W"); G.px(11, 8, "W")
  G.px(3, 5, "ih1"); G.px(29, 24, "ih2")
end)

-- trampa del cazador: cepo de hierro con dientes y la cadena, escarchado
icon("trampa_cazador", function(G)
  G.ellipse(14, 17, 12, 8, "fe3"); G.erase(14, 17, 9.5, 5.5)
  G.ellipse(14, 16, 12, 8, nil, function(x, y) if G.get(x, y) and y < 13 then return "fe2" end return nil end)
  for x = 7, 21, 4 do G.poly({{x - 1, 12}, {x, 15}, {x + 1, 12}}, "fe1"); G.poly({{x + 1, 23}, {x + 2, 19}, {x + 3, 23}}, "fe1") end
  G.ellipse(14, 17, 3, 2, "fe2"); G.px(14, 17, "fe3")
  G.line(26, 18, 29, 22, "fe2"); G.line(29, 22, 28, 27, "fe2"); G.px(28, 27, "fe1")
  G.px(6, 10, "ih1"); G.px(22, 10, "W"); G.px(10, 25, "ih1")
end)

-- zarpa de oso blanco: pata blanca con las garras negras
icon("zarpa_oso_blanco", function(G)
  G.ellipse(16, 20, 11, 9, "wl2"); G.ellipse(15, 19, 9, 7, "wl1")
  for i, x in ipairs({7, 12, 18, 24}) do
    local y = (i == 1 or i == 4) and 11 or 9
    G.ellipse(x, y, 3, 2.6, "wl1")
    G.poly({{x - 1, y - 2}, {x + 2, y - 2}, {x + 1, y - 6}}, "ob3"); G.px(x, y - 3, "ob1")
  end
  G.ellipse(16, 22, 5, 3.5, "wl3"); G.ellipse(15, 21, 2, 1.2, "wl2"); G.px(13, 16, "W")
end)

-- puño de gigante de nieve: puño de piedra helada con nieve encima
icon("puno_gigante_nieve", function(G)
  G.poly({{6, 9}, {24, 8}, {28, 13}, {27, 24}, {20, 29}, {8, 28}, {4, 21}}, "rk2")
  G.poly({{24, 8}, {28, 13}, {27, 24}, {20, 29}, {22, 14}}, "rk3")
  for i = 0, 3 do G.line(8 + i * 4, 10, 8 + i * 4, 17, "rk3") end
  G.line(6, 17, 23, 17, "rk3"); G.poly({{4, 21}, {7, 18}, {17, 19}, {15, 23}, {7, 25}}, "rk1")
  G.poly({{6, 9}, {24, 8}, {22, 6}, {14, 4}, {8, 6}}, "W"); G.line(7, 9, 23, 8, "ih1")
  G.px(12, 22, "ih2"); G.px(25, 20, "ih2"); G.px(28, 5, "W")
end)

-- sello del eclipse helado: disco de piedra azul con el eclipse y escarcha
icon("sello_eclipse_helado", function(G)
  sealDisk(G, "sl1", "sl2", "sl3")
  G.ellipse(16, 15.5, 5.5, 5.5, "ev"); G.ellipse(17.5, 14.5, 4.6, 4.6, "ec3")
  G.line(3, 6, 7, 10, "W"); G.line(29, 26, 25, 22, "W"); G.px(6, 7, "ih2"); G.px(26, 23, "ih2")
end)

-- placa de escarcha: hombrera de acero cubierta de hielo
icon("placa_escarcha", function(G)
  G.ellipse(16, 22, 13, 15, nil, function(x, y) if y > 24 then return nil end return x > 21 and "fe3" or "fe2" end)
  G.rect(4, 24, 28, 26, "fe3"); G.line(4, 24, 28, 24, "fe1")
  G.ellipse(12, 15, 5, 4, "fe1")
  G.poly({{6, 16}, {13, 9}, {20, 8}, {14, 13}, {9, 18}}, "ih2"); G.line(8, 15, 14, 10, "ih1")
  for _, x in ipairs({8, 15, 22}) do G.line(x, 27, x, 29, "ih2") end
  G.px(11, 12, "W"); G.px(24, 14, "ih1"); G.px(16, 24, "fe1")
end)

-- escama glacial: escama ancha, blanca azulada, con una grieta de hielo
icon("escama_glacial", function(G)
  G.ellipse(16, 17, 12, 12, "ih3"); G.poly({{6, 12}, {26, 12}, {16, 2}}, "ih3")
  G.ellipse(16, 17, 10.5, 10.5, "ih2"); G.poly({{8, 12}, {24, 12}, {16, 4}}, "ih2")
  G.ellipse(14, 14, 6, 6, "ih1")
  G.line(16, 6, 18, 14, "W"); G.line(18, 14, 15, 20, "W"); G.line(15, 20, 19, 26, "ih3")
  G.px(11, 11, "W")
end)

-- colmillo de mamut: colmillo largo de marfil, curvado
icon("colmillo_mamut", function(G)
  local prev
  for i = 0, 24 do
    local t = i / 24
    local x, y = 4 + t * 22 + math.sin(t * math.pi) * 2, 27 - t * 16 - math.sin(t * math.pi) * 8
    local w = math.max(2, math.floor(7 - t * 5 + 0.5))
    if prev then G.thick(prev[1], prev[2], x, y, w, (t < 0.12) and "gh3" or "gh1") end
    prev = {x, y}
  end
  for i = 3, 21 do
    local t = i / 24
    local w = math.floor(7 - t * 5 + 0.5)
    G.px(4 + t * 22 + math.sin(t * math.pi) * 2, 27 - t * 16 - math.sin(t * math.pi) * 8 + w // 2, "gh2")
    G.px(4 + t * 22 + math.sin(t * math.pi) * 2, 27 - t * 16 - math.sin(t * math.pi) * 8 - w // 2 + 1, "pa")
  end
  G.px(26, 11, "W")
end)

-- pelaje de aurora: rollo de pelo blanco con reflejos verdes y violetas
icon("pelaje_aurora", function(G)
  G.poly({{4, 14}, {24, 8}, {28, 20}, {8, 26}}, "wl2")
  G.poly({{4, 14}, {24, 8}, {25, 12}, {6, 18}}, "wl1")
  G.ellipse(26, 14, 3, 6, "wl3"); G.ellipse(26, 14, 1.5, 4, "ar3")
  G.line(7, 18, 24, 13, "ar1"); G.line(8, 21, 25, 16, "ar2"); G.line(9, 24, 26, 19, "ar3")
  G.px(3, 5, "ar1"); G.px(27, 4, "ar3"); G.px(15, 4, "ar2")
end)

-- flor de escarcha: flor de cristal azul
icon("flor_escarcha", function(G)
  G.line(16, 30, 16, 19, "ih3"); G.line(16, 25, 11, 22, "ih3"); G.poly({{11, 22}, {8, 20}, {12, 20}}, "ih2")
  for k = 0, 4 do
    local a = k * 2 * math.pi / 5 - math.pi / 2
    local cx, cy = 16 + math.cos(a) * 6, 12 + math.sin(a) * 6
    G.poly({{16, 12}, {cx + math.cos(a + 1.6) * 2.5, cy + math.sin(a + 1.6) * 2.5}, {16 + math.cos(a) * 10, 12 + math.sin(a) * 10},
      {cx + math.cos(a - 1.6) * 2.5, cy + math.sin(a - 1.6) * 2.5}}, "ih2")
    G.line(16, 12, 16 + math.cos(a) * 9, 12 + math.sin(a) * 9, "ih1")
  end
  G.ellipse(16, 12, 2, 2, "W"); G.px(4, 26, "ih1"); G.px(28, 24, "W")
end)

-- hielo eterno: bloque de hielo que nunca se derrite
icon("hielo_eterno", function(G)
  G.poly({{16, 4}, {28, 10}, {16, 16}, {4, 10}}, "ih1")
  G.poly({{4, 10}, {16, 16}, {16, 29}, {4, 23}}, "ih2")
  G.poly({{28, 10}, {16, 16}, {16, 29}, {28, 23}}, "ih3")
  G.line(8, 14, 11, 21, "ih1"); G.line(11, 21, 9, 25, "ih1"); G.line(20, 19, 25, 16, "ih2")
  G.line(16, 5, 26, 10, "W"); G.px(6, 11, "W")
end)

-- madera de pino blanco: tres troncos claros vistos de punta
icon("madera_pino_blanco", function(G)
  for _, c in ipairs({{10, 22}, {22, 22}, {16, 12}}) do
    G.ellipse(c[1], c[2], 6.5, 6.5, "pb3"); G.ellipse(c[1], c[2], 5, 5, "pb1")
    G.ellipse(c[1], c[2], 3, 3, "pb2"); G.ellipse(c[1], c[2], 1.6, 1.6, "pb1"); G.px(c[1], c[2], "pb3")
  end
  G.px(13, 7, "W"); G.px(14, 6, "W"); G.px(19, 6, "W")
end)

-- pescado glacial: pez plateado azul
icon("pescado_glacial", function(G)
  G.poly({{24, 16}, {30, 9}, {29, 16}, {30, 23}}, "fi3")
  G.ellipse(14, 16, 11, 7, nil, function(x, y) return (y > 17) and "fi1" or "fi2" end)
  G.poly({{11, 9}, {17, 5}, {19, 10}}, "fi3"); G.poly({{12, 22}, {16, 26}, {17, 22}}, "fi3")
  G.line(8, 16, 22, 16, "fi3"); G.ellipse(7, 14, 1.5, 1.5, "W"); G.px(7, 14, "K")
  G.line(10, 12, 10, 19, "fi3"); G.px(15, 13, "W"); G.px(19, 13, "W")
end)

-- runa norteña: piedra alta con la runa azul grabada
icon("runa_nortena", function(G)
  G.poly({{9, 29}, {8, 8}, {13, 3}, {21, 4}, {24, 10}, {23, 29}}, "rk2")
  G.poly({{9, 29}, {8, 8}, {13, 3}, {12, 29}}, "rk1"); G.poly({{21, 4}, {24, 10}, {23, 29}, {20, 29}}, "rk3")
  G.line(16, 8, 16, 24, "ih2"); G.line(16, 10, 20, 14, "ih2"); G.line(16, 14, 20, 18, "ih2"); G.line(16, 16, 12, 20, "ih2")
  G.px(16, 9, "W"); G.rect(5, 28, 27, 29, "W")
end)

-- núcleo del Guardián del Hielo: esfera de hielo engastada en oro
icon("nucleo_guardian", function(G)
  G.ellipse(16, 16, 12, 12, "au2"); G.ellipse(16, 16, 10, 10, "ih3")
  G.ellipse(16, 15, 8.5, 8.5, "ih2"); G.ellipse(14, 13, 4, 4, "ih1"); G.px(13, 12, "W")
  for _, p in ipairs({{16, 3}, {16, 29}, {3, 16}, {29, 16}}) do G.ellipse(p[1], p[2], 2, 2, "au1") end
  G.line(6, 8, 8, 6, "au1"); G.px(16, 16, "sv")
end)

-- corona del Rey del Hielo: aro de plata con púas de hielo
icon("corona_rey_hielo", function(G)
  for i, x in ipairs({6, 11, 16, 21, 26}) do
    local h = (i == 3) and 3 or ((i == 2 or i == 4) and 7 or 10)
    G.poly({{x - 3, 20}, {x, h}, {x + 3, 20}}, "ih2"); G.line(x - 1, 19, x, h + 1, "ih1")
  end
  G.rect(4, 19, 28, 26, "fe2"); G.line(4, 19, 28, 19, "fe1"); G.line(4, 26, 28, 26, "fe3")
  for _, x in ipairs({9, 16, 23}) do G.ellipse(x, 22.5, 1.8, 1.8, "sl2"); G.px(x - 1, 22, "sl1") end
  G.px(16, 4, "W")
end)

-- gema helada
icon("gema_helada", function(G)
  gem(G, "ih1", "ih2", "ih3", "ih4")
  G.px(28, 4, "W"); G.px(3, 22, "ih1"); G.px(26, 24, "W")
end)

-- hielo eterno puro: cristal blanco que brilla con luz propia
icon("hielo_eterno_puro", function(G)
  for k = 0, 7 do local a = k * math.pi / 4; G.px(16 + math.cos(a) * 13, 16 + math.sin(a) * 13, (k % 2 == 0) and "W" or "ih2") end
  G.poly({{16, 2}, {22, 12}, {20, 28}, {12, 28}, {10, 12}}, "ih1")
  G.poly({{16, 2}, {22, 12}, {20, 28}, {16, 28}}, "ih2")
  G.line(16, 3, 16, 27, "W"); G.line(11, 12, 13, 26, "W"); G.px(14, 8, "W")
end)

-- lágrima de la Reina: colgante de cristal en forma de lágrima, con cadena de plata
icon("lagrima_reina", function(G)
  chain(G, 12, "fe1", "sv")
  G.ellipse(16, 22, 6, 7, "ih2"); G.poly({{10, 21}, {22, 21}, {16, 11}}, "ih2")
  G.ellipse(15, 22, 4, 5, "ih1"); G.poly({{12, 20}, {19, 20}, {16, 14}}, "ih1")
  G.ellipse(17, 24, 2, 2, "p1"); G.px(14, 19, "W"); G.px(13, 21, "W")
end)

-- báculo roto de la Bruja Congelada: vara partida en dos con su cristal helado
icon("baculo_roto_bruja", function(G)
  G.thick(4, 29, 12, 19, 2, "wd3"); G.line(4, 28, 11, 19, "wd2")
  G.thick(15, 16, 23, 7, 2, "wd3"); G.line(15, 15, 22, 7, "wd2")
  G.px(12, 18, "pb1"); G.px(14, 17, "pb1")
  G.poly({{22, 8}, {24, 1}, {29, 4}, {27, 10}}, "ih2"); G.line(24, 2, 25, 8, "ih1"); G.px(25, 3, "W")
  G.px(18, 23, "ih2"); G.px(8, 13, "ih1"); G.px(29, 15, "W")
end)

-- carne de mamut: trozo enorme con el pelo pardo en el borde
icon("carne_mamut", function(G)
  meat(G, "rb2", "mt", "pa")
  G.poly({{4, 18}, {10, 9}, {24, 7}, {29, 15}, {26, 13}, {23, 10}, {11, 12}, {7, 18}}, "mf2")
  for x = 10, 25, 3 do G.line(x, 9, x - 1, 6, "mf2"); G.px(x, 9, "mf1") end
  G.px(15, 17, "W")
end)

-- ---------------------------------------------------------------- comidas de la Tundra
-- pescado glacial a la brasa: el pez asado sobre la tabla
icon("pescado_brasa", function(G)
  steam(G); board(G)
  G.poly({{23, 18}, {29, 13}, {28, 18}, {29, 23}}, "st2")
  G.ellipse(14, 18, 10, 5.5, nil, function(x, y) return (y > 19) and "st1" or "st2" end)
  G.line(10, 15, 12, 21, "wd3"); G.line(15, 14, 17, 21, "wd3"); G.line(20, 15, 21, 20, "wd3")
  G.px(7, 17, "W"); G.px(13, 16, "am1"); G.ellipse(26, 24, 2, 1.5, "v2")
end)

-- pan de centeno con grasa de foca: rebanada oscura untada de grasa blanca
icon("pan_grasa_foca", function(G)
  G.ellipse(16, 13, 12, 9, nil, function(x, y) if y > 15 then return nil end return "ry2" end)
  G.rect(4, 13, 28, 27, "ry2")
  G.ellipse(16, 13, 10.5, 7.5, nil, function(x, y) if y > 15 then return nil end return "ry1" end)
  G.rect(6, 13, 26, 25, "ry1")
  G.ellipse(16, 11, 9, 4, "gr1"); G.rect(7, 11, 25, 14, "gr1"); G.line(8, 15, 24, 15, "gr2")
  for _, p in ipairs({{10, 19}, {15, 22}, {20, 18}, {23, 22}, {12, 23}}) do G.px(p[1], p[2], "ry2") end
  G.px(11, 9, "W")
end)

-- té de flor de escarcha: taza de hierro con el té celeste y la flor azul
icon("te_flor_escarcha", function(G)
  cup(G, "fe1", "fe2", "fe3", "aq2")
  for k = 0, 4 do local a = k * 2 * math.pi / 5; G.px(16 + math.cos(a) * 2.5, 17 + math.sin(a) * 1.2, "ih3") end
  G.px(16, 17, "W")
end)

-- sopa de raíces: cuenco con zanahoria y remolacha
icon("sopa_raices", function(G)
  steam(G)
  bowl(G, "am2", "st1")
  G.px(11, 17, "sa2"); G.px(12, 17, "sa2"); G.px(18, 18, "cr3"); G.px(19, 18, "cr3"); G.px(15, 17, "v2")
  G.thick(21, 16, 26, 11, 2, "sa2"); G.line(26, 11, 27, 8, "v2"); G.px(28, 9, "v3")
end)

-- hidromiel caliente: jarra de madera con aros de hierro y espuma de miel
icon("hidromiel_caliente", function(G)
  steam(G)
  G.rect(7, 12, 21, 28, "wd2"); G.rect(7, 12, 10, 28, "wd1"); G.rect(18, 12, 21, 28, "wd3")
  G.rect(7, 15, 21, 16, "fe2"); G.rect(7, 24, 21, 25, "fe2")
  G.ellipse(14, 12, 7, 2, "am1"); G.px(12, 11, "W")
  G.ellipse(25, 20, 4.5, 5, "wd3"); G.erase(25, 20, 2.5, 3)
end)

-- elixir de la aurora: botella verde y violeta con una estrella
icon("elixir_aurora", function(G)
  flaskBig(G, {"ar1", "ar2", "ar3"}, function(g)
    g.line(16, 19, 16, 24, "ar3"); g.line(13, 21, 19, 21, "ar3"); g.px(14, 20, "ar2"); g.px(18, 22, "ar2"); g.px(16, 21, "W")
  end)
end)

-- estofado de mamut: olla grande con trozos de carne y zanahoria
icon("estofado_mamut", function(G)
  G.thick(19, 15, 25, 7, 3, "bn"); G.ellipse(26, 6, 2.2, 2.2, "bn")
  pot(G, "st1")
  G.px(10, 17, "mt"); G.px(11, 17, "mt"); G.px(15, 17, "sa2"); G.px(19, 17, "mt"); G.px(13, 18, "v2")
end)

-- sopa de jabalí helado: cuenco con caldo y un trocito de colmillo
icon("sopa_jabali", function(G)
  steam(G)
  bowl(G, "st1", "mt")
  G.thick(20, 15, 25, 9, 2, "gh1"); G.px(26, 8, "ih1"); G.px(12, 17, "ih1")
end)

-- ---------------------------------------------------------------- Catacumbas del Abismo: materiales
for k, v in pairs({
  hb1="ece4cc", hb2="c6ba9a", hb3="8c7e66",           -- hueso viejo
  cv1="8e8898", cv2="6c6678", cv3="4e4a5a",           -- piedra de catacumba
  sx1="e4e8f2", sx2="a8aec0", sx3="6a7084",           -- plata sepulcral
  ws1="f6ecd2", ws2="d2c2a0", ws3="a08c6c",           -- cera
  so1="c0f6ff", so2="4cbcdc", so3="2a7eaa",           -- agua de almas
  fu1="c6a2ff", fu2="7a5ab0", fu3="a4f4dc",           -- hongo lila y su brillo
  zb1="8aa07a", zb2="62785a", zb3="40523c",           -- carne de zombie
  vb1="4a3a4e", vb2="2e2434", vbm="8a3a4a",           -- murciélago
  nx1="3a3644", nx2="26222e", nx3="16141c",           -- hierro negro de los Ocultos
  wm1="e8dcd0", wm2="c0b0a4", wm3="8e7e74",           -- gusano
  fc1="dcd8e6", fc2="a8a4b8", fc3="6e6a80",           -- pescado ciego
  vl1="e2a6ff", vl2="8a50d8",                         -- eclipse
}) do PAL[k] = hex(v) end

-- un hueso de (x0,y0) a (x1,y1) con sus dos cabezas
local function boneBar(G, x0, y0, x1, y1, w, c1, c2)
  G.thick(x0, y0, x1, y1, w, c2); G.line(x0, y0 - 1, x1, y1 - 1, c1)
  for _, p in ipairs({{x0, y0}, {x1, y1}}) do G.ellipse(p[1] - 1.5, p[2] - 1, 2.2, 2.2, c1); G.ellipse(p[1] + 1.5, p[2] + 1, 2.2, 2.2, c2) end
end
-- un cráneo visto de frente
local function skullFront(G, cx, cy, r, c1, c2, eye)
  G.ellipse(cx, cy, r, r * 0.9, c1); G.rect(cx - r * 0.6, cy + r * 0.5, cx + r * 0.6, cy + r, c1)
  G.ellipse(cx - r * 0.4, cy + r * 0.1, r * 0.28, r * 0.3, eye or "K"); G.ellipse(cx + r * 0.4, cy + r * 0.1, r * 0.28, r * 0.3, eye or "K")
  G.px(cx, cy + r * 0.5, "K"); for i = -1, 1 do G.px(cx + i * 2, cy + r * 0.95, c2) end
  G.ellipse(cx - r * 0.45, cy - r * 0.45, r * 0.25, r * 0.2, "W")
end

-- cola de rata de osario: larga y pelada, enroscada
icon("cola_rata_osario", function(G)
  for i = 0, 40 do local t = i / 40; local a = t * math.pi * 2.6; local r = 11 - t * 7
    G.ellipse(16 + math.cos(a) * r, 16 + math.sin(a) * r, 1.8 - t * 0.8, 1.8 - t * 0.8, i % 6 == 0 and "om2" or "om1") end
  G.ellipse(26, 18, 3, 3, "po2"); G.px(25, 17, "po1")
end)
-- ala de murciélago vampiro: membrana negra con venas rojas
icon("ala_murcielago_vampiro", function(G)
  G.poly({{4, 8}, {28, 4}, {26, 12}, {22, 15}, {20, 22}, {14, 20}, {10, 27}, {6, 20}}, "vb1")
  for _, p in ipairs({{26, 12}, {20, 22}, {10, 27}}) do G.line(4, 8, p[1], p[2], "vb2") end
  G.line(4, 8, 28, 4, "vb2"); G.line(12, 9, 18, 16, "vbm"); G.line(9, 12, 10, 19, "vbm"); G.px(28, 3, "hb1")
end)
-- espada rota de esqueleto: media hoja oxidada con tela en la empuñadura
icon("espada_rota_esqueleto", function(G)
  G.poly({{8, 24}, {20, 10}, {24, 9}, {22, 14}, {11, 27}}, "fe2"); G.line(9, 24, 21, 10, "fe1")
  G.poly({{20, 10}, {24, 9}, {23, 12}}, "rs1"); G.px(16, 16, "rs1"); G.px(13, 20, "rs2")
  G.thick(4, 22, 12, 30, 3, "fe3"); G.thick(5, 28, 9, 24, 3, "tr2"); G.px(7, 26, "tr1"); G.ellipse(4, 30, 2, 2, "au2")
end)
-- carne putrefacta ancestral: un trozo verdoso con moscas
icon("carne_putrefacta_ancestral", function(G)
  meat(G, "zb3", "zb2", "zb1")
  for _, p in ipairs({{8, 6}, {22, 4}, {27, 9}}) do G.px(p[1], p[2], "K"); G.px(p[1] - 1, p[2] - 1, "gl2"); G.px(p[1] + 1, p[2] - 1, "gl2") end
  G.px(14, 15, "sp1"); G.px(19, 18, "sp1")
end)
-- seda de tumba: un ovillo gris con hilos sueltos
icon("seda_tumba", function(G)
  G.ellipse(16, 17, 10, 10, "cv1"); G.ellipse(15, 16, 8, 8, "fc1")
  for i = 0, 4 do G.line(8 + i * 3, 9 + i, 22 - i, 25 - i * 2, "cv2") end
  G.line(25, 21, 30, 28, "fc2"); G.line(6, 22, 2, 29, "fc2"); G.px(12, 12, "W")
end)
-- esporas pálidas: frasco con polvo verde agua que brilla
icon("esporas_palidas", function(G)
  flaskSmall(G, {"fu3", "fu1", "fu2"})
  for _, p in ipairs({{8, 6}, {24, 8}, {26, 14}, {6, 13}}) do G.px(p[1], p[2], "fu3") end
end)
-- cadena espectral: eslabones que brillan azul pálido
icon("cadena_espectral", function(G)
  for i = 0, 4 do local x, y = 5 + i * 5.5, 25 - i * 5
    G.ellipse(x, y, 4, 3, "so3"); G.ellipse(x, y, 2.5, 1.5, nil); G.erase(x, y, 2.2, 1.2); G.px(x - 2, y - 2, "so1") end
  G.px(28, 4, "W")
end)
-- garra de gul: una uña negra y curva con un poco de piel gris
icon("garra_gul", function(G)
  G.ellipse(10, 24, 6, 5, "tr1"); G.ellipse(9, 23, 4, 3, "tr1")
  for i = 0, 2 do G.thick(10 + i * 3, 21 - i, 20 + i * 4, 6 + i * 3, 2, "nx2"); G.px(20 + i * 4, 6 + i * 3, "nx1") end
  G.px(8, 22, "W")
end)
-- hueso reanimado: un hueso con una chispa verde que lo mueve
icon("hueso_reanimado", function(G)
  boneBar(G, 7, 24, 25, 8, 4, "hb1", "hb2")
  for _, p in ipairs({{14, 12}, {19, 19}, {10, 16}}) do G.px(p[1], p[2], "v2"); G.px(p[1] + 1, p[2] - 1, "v1") end
end)
-- lamento cristalizado: una lágrima de cristal azul
icon("lamento_cristalizado", function(G)
  G.ellipse(16, 21, 8, 8, "so2"); G.poly({{9, 18}, {16, 3}, {23, 18}}, "so2")
  G.ellipse(14, 20, 4, 5, "so1"); G.poly({{12, 17}, {16, 7}, {17, 17}}, "so1"); G.ellipse(19, 25, 3, 2, "so3")
  G.px(13, 16, "W"); G.px(14, 15, "W")
end)
-- reliquia maldita: relicario de plata negra con el eclipse sobre el sol
icon("reliquia_maldita", function(G)
  chain(G, 14, "sx2", "sx3")
  G.ellipse(16, 21, 9, 9, "sx2"); G.ellipse(16, 21, 7, 7, "sx3"); G.ellipse(16, 21, 5, 5, "au1")
  G.ellipse(18, 20, 4.5, 4.5, "nx3"); G.px(12, 17, "W")
end)
-- sello del eclipse negro: anillo de hierro con el eclipse
icon("sello_eclipse_negro", function(G)
  G.ellipse(16, 18, 11, 9, "nx1"); G.erase(16, 20, 7, 5); G.ellipse(16, 12, 7, 6, "nx2")
  G.ellipse(16, 12, 5, 4, "vl2"); G.ellipse(17.5, 11.5, 3.5, 3, "nx3"); G.px(13, 10, "vl1")
end)
-- diente del gusano de las criptas: un diente largo como un puñal
icon("diente_gusano", function(G) fang(G, "W", "wm1", "wm2"); G.rect(7, 26, 14, 29, "cr3"); G.line(8, 26, 13, 26, "cr2") end)
-- yelmo vacío: yelmo negro y por dentro, nada (una luz violeta)
icon("yelmo_vacio", function(G)
  G.ellipse(16, 15, 11, 11, "nx1"); G.rect(5, 15, 27, 27, "nx1"); G.ellipse(14, 10, 6, 4, "sx3")
  G.rect(8, 15, 25, 19, "nx3"); G.px(19, 17, "vl1"); G.px(22, 17, "vl2")
  G.rect(15, 20, 17, 27, "nx2"); G.rect(5, 26, 27, 28, "nx2"); G.line(10, 3, 22, 3, "r2")
end)
-- núcleo del centinela: piedra negra con vetas azules que late
icon("nucleo_centinela", function(G)
  heartShape(G, "nx1", "nx2", "nx3")
  G.line(9, 12, 14, 20, "so2"); G.line(14, 20, 20, 15, "so2"); G.line(20, 15, 23, 22, "so3"); G.px(16, 21, "so1"); G.px(10, 10, "sx2")
end)
-- hueso antiguo: un fémur amarillento
icon("hueso_antiguo", function(G) boneBar(G, 6, 25, 26, 7, 4, "hb2", "hb3"); G.px(11, 19, "hb1") end)
-- seta pálida: dos setas lilas con motas que brillan
icon("seta_palida", function(G)
  for _, s in ipairs({{11, 15, 7, 13}, {22, 19, 5, 9}}) do
    local x, y, r, h = s[1], s[2], s[3], s[4]
    G.rect(x - 1, y, x + 1, y + h, "ws2"); G.ellipse(x, y, r, r * 0.65, "fu2"); G.ellipse(x - 1, y - 1, r - 1.5, r * 0.5, "fu1")
    G.px(x - 2, y - 1, "fu3"); G.px(x + 2, y, "fu3")
  end
  G.line(4, 29, 28, 29, "cv2")
end)
-- plata sepulcral: un trozo de mineral oscuro con vetas de plata
icon("plata_sepulcral", function(G)
  rockShape(G, "cv1", "cv2", "cv3")
  G.line(9, 14, 20, 9, "sx2"); G.line(10, 15, 21, 10, "sx1"); G.line(13, 22, 22, 18, "sx2"); G.px(17, 11, "W")
end)
-- plata sepulcral pura: un lingote claro que brilla solo
icon("plata_sepulcral_pura", function(G)
  G.poly({{4, 22}, {10, 14}, {28, 14}, {22, 22}}, "sx1"); G.poly({{4, 22}, {22, 22}, {22, 27}, {4, 27}}, "sx2")
  G.poly({{22, 22}, {28, 14}, {28, 19}, {22, 27}}, "sx3"); G.line(11, 16, 24, 16, "W")
  for _, p in ipairs({{6, 9}, {26, 8}, {16, 5}}) do G.px(p[1], p[2], "W") end
end)
-- cera eterna: un pan de cera blanca con su mecha
icon("cera_eterna", function(G)
  G.ellipse(16, 23, 11, 5, "ws3"); G.ellipse(16, 20, 11, 5, "ws1"); G.rect(5, 20, 27, 23, "ws2"); G.ellipse(16, 19, 9, 3, "ws1")
  G.line(16, 19, 16, 13, "nx2"); G.ellipse(16, 11, 1.5, 2.5, "lv2"); G.px(16, 10, "lv1")
  G.rect(23, 21, 24, 26, "ws1")
end)
-- esencia de alma: frasco con el agua azul del río que brilla
icon("esencia_de_alma", function(G) flaskSmall(G, {"so1", "so2", "so3"}); G.px(16, 19, "W") end)
-- fragmento del abismo: esquirla negra con un borde violeta
icon("fragmento_del_abismo", function(G)
  G.poly({{6, 27}, {12, 6}, {18, 3}, {26, 14}, {20, 28}}, "nx2"); G.poly({{12, 6}, {18, 3}, {17, 14}}, "vl2")
  G.line(12, 7, 7, 26, "vl1"); G.line(18, 4, 25, 14, "nx1"); G.px(15, 8, "W")
end)
-- grimorio corrupto: libro negro cerrado con un ojo del eclipse
icon("grimorio_corrupto", function(G)
  G.rect(6, 5, 26, 27, "nx1"); G.rect(6, 5, 8, 27, "nx2"); G.rect(24, 6, 27, 26, "ws1"); for y = 8, 24, 3 do G.px(25, y, "ws3") end
  G.ellipse(17, 16, 5, 4, "vl2"); G.ellipse(17, 16, 2.5, 2.5, "vl1"); G.px(17, 16, "K")
  for _, p in ipairs({{11, 7}, {22, 7}, {11, 25}, {22, 25}}) do G.px(p[1], p[2], "au2") end
end)
-- corazón del lich ancestral: un corazón negro y dorado que todavía late
icon("corazon_lich_ancestral", function(G)
  heartShape(G, "vl2", "nx1", "nx3")
  G.ellipse(16, 16, 4, 4, "au1"); G.ellipse(17.5, 15.5, 3, 3, "nx3"); G.px(10, 10, "vl1")
  for _, p in ipairs({{3, 6}, {29, 8}, {27, 26}}) do G.px(p[1], p[2], "vl1") end
end)
-- corona de huesos: dedos de hueso atados con hilo de oro
icon("corona_huesos", function(G)
  G.rect(5, 19, 27, 25, "hb2"); G.line(5, 19, 27, 19, "hb1"); G.line(5, 25, 27, 25, "hb3")
  for i = 0, 4 do local x = 6 + i * 5; G.thick(x + 1, 18, x + 1, 7 + (i % 2) * 4, 3, "hb1"); G.ellipse(x + 1, 7 + (i % 2) * 4, 1.8, 1.8, "hb1") end
  G.line(5, 22, 27, 22, "au1"); G.ellipse(16, 22, 2, 2, "vl2")
end)
-- carne de gusano: un trozo blanco y elástico
icon("carne_gusano", function(G)
  meat(G, "wm2", "wm1", "wm3")
  for x = 9, 23, 4 do G.line(x, 12, x - 2, 22, "wm2") end
end)
-- pescado ciego: un pez pálido sin ojos
icon("pescado_ciego", function(G)
  G.ellipse(14, 16, 11, 6, "fc1")
  G.poly({{24, 16}, {30, 10}, {30, 22}}, "fc2"); G.line(6, 17, 22, 17, "fc2")
  G.ellipse(7, 15, 2, 1.2, "fc2"); for x = 10, 20, 3 do G.px(x, 13, "fc3") end
  G.line(14, 10, 18, 7, "fc2")
end)

-- ---------------------------------------------------------------- Catacumbas del Abismo: comidas
icon("sopa_setas_palidas", function(G) steam(G); bowl(G, "fu1", "fu3"); G.px(12, 17, "fu2"); G.px(20, 18, "fu2") end)
icon("pan_ofrenda", function(G)
  G.ellipse(16, 20, 12, 8, "y2"); G.ellipse(15, 18, 10, 6, "y1")
  for x = 9, 21, 4 do G.line(x, 15, x + 2, 19, "y3") end
  G.ellipse(16, 17, 2, 2, "ws1"); G.line(16, 15, 16, 12, "nx2"); G.px(16, 11, "lv1")
end)
icon("pescado_ciego_asado", function(G)
  board(G)
  G.ellipse(15, 18, 10, 5, "st1"); G.poly({{24, 18}, {29, 13}, {29, 23}}, "st2"); G.line(7, 19, 22, 19, "st2")
  for x = 9, 20, 4 do G.line(x, 15, x + 2, 21, "wd3") end
  G.px(12, 15, "fc1"); steam(G)
end)
icon("te_cera_eterna", function(G) cup(G, "ws1", "ws2", "ws3", "am1"); G.px(14, 17, "W") end)
icon("guiso_sepulturero", function(G)
  pot(G, "st1")
  G.px(10, 17, "wm1"); G.px(11, 17, "wm1"); G.px(15, 17, "fu1"); G.px(19, 17, "wm1"); G.px(21, 17, "fu1")
end)
icon("vino_velados", function(G)
  flaskBig(G, {"so1", "so2", "so3"}, function(g) g.ellipse(16, 21, 3, 3, "so3"); g.px(16, 21, "so1") end)
end)
icon("caldo_hueso_antiguo", function(G)
  pot(G, "ws2")
  boneBar(G, 19, 14, 26, 6, 2, "hb1", "hb2"); G.px(12, 17, "hb2")
end)
-- vela de sebo (la oscuridad de las Catacumbas): una vela gorda y amarillenta en un plato de hueso, con
-- chorreaduras y la llama tibia
icon("vela_sebo", function(G)
  G.ellipse(16, 26, 11, 3, "hb3"); G.ellipse(16, 25, 10, 2.5, "hb1")
  G.rect(11, 12, 21, 25, "wm2"); G.rect(11, 12, 13, 25, "ws1"); G.rect(19, 12, 21, 25, "wm3")
  G.ellipse(16, 12, 5, 1.8, "ws1"); G.rect(12, 13, 13, 18, "ws1"); G.rect(19, 13, 20, 16, "ws2"); G.px(20, 17, "ws2")
  G.line(16, 11, 16, 8, "nx2"); G.ellipse(16, 6, 2, 3.5, "lv2"); G.ellipse(16, 6.5, 1, 2, "lv1")
end)

-- ---------------------------------------------------------------- atlas (una fila)
local n = #ICONS
local img = Image(n * 32, 32, ColorMode.RGB)
for i, ic in ipairs(ICONS) do
  local G = newGrid(32, 32)
  ic.draw(G)
  outline(G)
  for k, c in pairs(G.g) do img:drawPixel((i - 1) * 32 + k % 32, k // 32, PAL[c] or PAL.K) end
end
local spr = Sprite(n * 32, 32, ColorMode.RGB)
spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
spr:saveAs(dir .. "/equipo/objetos.aseprite")
spr:saveCopyAs(dir .. "/equipo/objetos.png")
spr:close()
local names = {}
for _, ic in ipairs(ICONS) do names[#names + 1] = '"' .. ic.name .. '"' end
local fh = io.open(dir .. "/equipo/objetos.json", "w")
fh:write(string.format('{"size":32,"icons":[%s]}', table.concat(names, ",")))
fh:close()
