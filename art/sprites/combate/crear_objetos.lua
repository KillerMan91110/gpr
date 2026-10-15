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
