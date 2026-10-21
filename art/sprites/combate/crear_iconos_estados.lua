-- Íconos de los estados nuevos del combate (gprback/lib/mecanicas.js): siluetas blancas de 32x32 sobre fondo
-- transparente, como los de game-icons.net. El juego los tiñe con el color de cada estado (src/game/statuses.js:
-- en el combate con setTintFill y en las ventanas con la máscara de GameIcon).
--  * <png>/<nombre>.png  (public/Icons/etheria)
--  * <dir>/iconos_estados.aseprite  (todos en capas, para retocar)
--
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/combate --script-param png=public/Icons/etheria --script art/sprites/combate/crear_iconos_estados.lua
local S = 32
local function grid()
  local g = {}
  local G = { g = g }
  function G.px(x, y, v)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x >= 0 and x < S and y >= 0 and y < S then g[y * S + x] = v ~= false or nil end
  end
  function G.rect(x0, y0, x1, y1, v) for y = y0, y1 do for x = x0, x1 do G.px(x, y, v) end end end
  function G.ellipse(cx, cy, rx, ry, v)
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 then G.px(x, y, v) end
    end end
  end
  function G.ring(cx, cy, r, w, v)
    for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
      local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2)
      if d <= r and d >= r - w then G.px(x, y, v) end
    end end
  end
  function G.line(x0, y0, x1, y1, w, v)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0)) * 2
    for i = 0, n do
      local t = n == 0 and 0 or i / n
      local x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
      G.ellipse(x, y, w / 2, w / 2, v)
    end
  end
  function G.poly(pts, v)
    local minY, maxY = 99, -99
    for _, p in ipairs(pts) do minY = math.min(minY, p[2]); maxY = math.max(maxY, p[2]) end
    for y = math.floor(minY), math.ceil(maxY) do
      local xs = {}
      for i = 1, #pts do
        local a, b = pts[i], pts[i % #pts + 1]
        if (a[2] <= y and b[2] > y) or (b[2] <= y and a[2] > y) then
          xs[#xs + 1] = a[1] + (y - a[2]) / (b[2] - a[2]) * (b[1] - a[1])
        end
      end
      table.sort(xs)
      for i = 1, #xs - 1, 2 do for x = math.ceil(xs[i]), math.floor(xs[i + 1]) do G.px(x, y, v) end end
    end
  end
  return G
end

local ICONS = {}
local function icon(name, fn) ICONS[#ICONS + 1] = { name, fn } end

-- mojado: una gota grande con brillo hueco
icon("mojado", function(G)
  G.poly({ { 16, 2 }, { 25, 17 }, { 7, 17 } })
  G.ellipse(16, 20, 9.5, 9.5)
  G.line(11, 18, 11, 23, 2, false); G.px(12, 25, false)
end)
-- congelado: un copo de seis brazos
icon("congelado", function(G)
  for i = 0, 5 do
    local a = math.pi / 3 * i
    local x, y = 16 + math.cos(a) * 14, 16 + math.sin(a) * 14
    G.line(16, 16, x, y, 3)
    local mx, my = 16 + math.cos(a) * 9, 16 + math.sin(a) * 9
    G.line(mx, my, mx + math.cos(a + 0.8) * 5, my + math.sin(a + 0.8) * 5, 2)
    G.line(mx, my, mx + math.cos(a - 0.8) * 5, my + math.sin(a - 0.8) * 5, 2)
  end
  G.ellipse(16, 16, 4, 4); G.ellipse(16, 16, 1.5, 1.5, false)
end)
-- raíces: un tronco que se abre en raíces con espinas
icon("raices", function(G)
  G.rect(14, 2, 18, 14)
  G.line(16, 13, 5, 28, 3); G.line(16, 13, 27, 28, 3); G.line(16, 13, 13, 30, 3); G.line(16, 13, 21, 30, 2)
  G.line(9, 22, 4, 20, 2); G.line(23, 22, 29, 21, 2)
  for _, p in ipairs({ { 7, 26 }, { 25, 25 }, { 12, 20 }, { 20, 20 } }) do G.px(p[1] - 1, p[2] - 1); G.px(p[1] + 1, p[2] - 1) end
end)
-- silencio: un globo de diálogo tachado
icon("silencio", function(G)
  G.ellipse(16, 13, 14, 10)
  G.poly({ { 8, 19 }, { 14, 22 }, { 5, 29 } })
  G.ellipse(16, 13, 11, 7, false)
  G.line(7, 22, 25, 4, 4)
end)
-- chi: tres esferas de energía (las cargas del monje)
icon("chi", function(G)
  for _, p in ipairs({ { 16, 8 }, { 8, 22 }, { 24, 22 } }) do
    G.ellipse(p[1], p[2], 6.5, 6.5); G.ellipse(p[1] - 2, p[2] - 2, 1.6, 1.6, false)
  end
  G.ring(16, 17, 15, 1.5)
end)
-- barrera: un escudo hexagonal de luz, hueco por dentro con una cruz
icon("barrera", function(G)
  local pts = {}
  for i = 0, 5 do local a = math.pi / 3 * i + math.pi / 6; pts[#pts + 1] = { 16 + math.cos(a) * 15, 16 + math.sin(a) * 15 } end
  G.poly(pts)
  local inner = {}
  for i = 0, 5 do local a = math.pi / 3 * i + math.pi / 6; inner[#inner + 1] = { 16 + math.cos(a) * 11, 16 + math.sin(a) * 11 } end
  G.poly(inner, false)
  G.rect(15, 8, 17, 24); G.rect(9, 14, 23, 16)
end)
-- runa: una piedra con una runa tallada (hueca)
icon("runa", function(G)
  G.ellipse(16, 16, 12, 14)
  G.line(13, 7, 13, 25, 2, false); G.line(13, 9, 20, 14, 2, false); G.line(20, 14, 13, 19, 2, false); G.line(13, 19, 21, 25, 2, false)
end)
-- presa: una mira
icon("presa", function(G)
  G.ring(16, 16, 14, 3); G.ring(16, 16, 7, 2)
  G.rect(15, 0, 17, 9); G.rect(15, 23, 17, 31); G.rect(0, 15, 9, 17); G.rect(23, 15, 31, 17)
  G.ellipse(16, 16, 1.5, 1.5)
end)
-- semilla: un brote de dos hojas sobre una semilla
icon("semilla", function(G)
  G.ellipse(16, 25, 8, 5)
  G.rect(15, 10, 17, 22)
  G.poly({ { 16, 13 }, { 5, 4 }, { 4, 12 }, { 10, 16 } }); G.poly({ { 16, 11 }, { 27, 2 }, { 29, 9 }, { 21, 14 } })
  G.line(14, 24, 18, 24, 1, false)
end)
-- contragolpe: un escudo con una flecha que vuelve hacia atrás
icon("contragolpe", function(G)
  G.poly({ { 3, 3 }, { 29, 3 }, { 29, 17 }, { 16, 30 }, { 3, 17 } })
  G.line(24, 12, 12, 12, 4, false)
  G.poly({ { 6, 12 }, { 13, 5 }, { 13, 19 } }, false)
  G.line(24, 12, 24, 20, 4, false)
end)
-- clon de sombra: una figura entera y su copia hueca detrás
icon("clon", function(G)
  local function persona(x, y, k, v)
    G.ellipse(x, y + 5 * k, 4.5 * k, 4.5 * k, v)
    G.poly({ { x - 7 * k, y + 28 * k }, { x - 5 * k, y + 11 * k }, { x + 5 * k, y + 11 * k }, { x + 7 * k, y + 28 * k } }, v)
  end
  persona(11, 2, 1, true)
  persona(11, 4.5, 0.82, false)
  persona(21, 3, 1, false)
  persona(21, 3, 0.92, true)
end)
-- juramento: dos eslabones de cadena enlazados
icon("vinculo", function(G)
  G.ring(11, 16, 9, 3); G.ring(21, 16, 9, 3)
  G.rect(13, 6, 14, 9, false); G.ring(21, 16, 9, 3)
end)
-- sentencia: una balanza
icon("sentencia", function(G)
  G.rect(15, 3, 17, 27); G.rect(9, 27, 23, 29); G.ellipse(16, 3, 2.5, 2.5)
  G.rect(3, 7, 29, 8)
  G.line(5, 8, 2, 18, 1); G.line(5, 8, 8, 18, 1); G.ellipse(5, 19, 5, 2.5)
  G.line(27, 8, 24, 18, 1); G.line(27, 8, 30, 18, 1); G.ellipse(27, 19, 5, 2.5)
end)
-- plaga: una calavera con esporas
icon("plaga", function(G)
  G.ellipse(16, 14, 10, 9); G.rect(11, 20, 21, 25)
  G.ellipse(12, 14, 2.8, 3, false); G.ellipse(20, 14, 2.8, 3, false); G.poly({ { 16, 17 }, { 14, 21 }, { 18, 21 } }, false)
  G.rect(13, 24, 13, 25, false); G.rect(16, 24, 16, 25, false); G.rect(19, 24, 19, 25, false)
  for _, p in ipairs({ { 4, 4 }, { 28, 6 }, { 3, 25 }, { 29, 27 }, { 26, 1 } }) do G.ellipse(p[1], p[2], 1.8, 1.8) end
end)

-- último aliento: un ankh, la vida que se niega a irse
icon("aliento", function(G)
  G.ring(16, 9, 7, 3)
  G.rect(14, 15, 18, 30)
  G.rect(5, 15, 27, 18)
  G.rect(15, 2, 17, 3, false)
end)

local dir, png = app.params.dir, app.params.png
local spr = Sprite(S, S, ColorMode.RGB)
spr.filename = dir .. "/iconos_estados.aseprite"
local first = true
for _, it in ipairs(ICONS) do
  local name, fn = it[1], it[2]
  local G = grid()
  fn(G)
  local img = Image(S, S, ColorMode.RGB)
  for k in pairs(G.g) do img:drawPixel(k % S, k // S, Color{ r = 255, g = 255, b = 255 }) end
  if png then img:saveAs(png .. "/" .. name .. ".png") end
  local layer = first and spr.layers[1] or spr:newLayer()
  layer.name = name
  spr:newCel(layer, 1, img, Point(0, 0))
  first = false
end
spr:saveAs(dir .. "/iconos_estados.aseprite")
print(#ICONS .. " íconos de estados")
