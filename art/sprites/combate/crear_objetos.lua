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
