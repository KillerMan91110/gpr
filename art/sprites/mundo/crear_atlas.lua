-- Pinta el MAPA DEL MUNDO en pixel art a partir de las casillas reales del continente (las junta
-- art/mapas/generar_atlas.js en atlas_casillas.json). 2 píxeles por casilla:
--   - el color de cada casilla sale de su dibujo en el tileset (el promedio de sus píxeles), con un
--     tramado suave para que no quede plano; árboles, casas y rocas encima, con su sombra;
--   - el mar, por profundidad: espuma junto a la costa, agua baja y mar hondo con olas sueltas;
--   - rocas, paredes y acantilados (lo que choca y no es agua) con sombra abajo, para que se lea el relieve;
--   - las tierras sin explorar que rodean a las zonas (para que la costa no sea un rectángulo), más apagadas.
-- Salida: <png>/atlas.png (lo carga el mapa del juego) y <dir>/atlas.aseprite.
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/mapas --script-param png=public/assets/mundo/atlas --script art/sprites/mundo/crear_atlas.lua
local dir, png = app.params.dir, app.params.png
local function readJson(p) local f = assert(io.open(p, "r")); local s = f:read("a"); f:close(); return json.decode(s) end
local cas = readJson(dir .. "/atlas_casillas.json")
local meta = readJson("art/sprites/mundo/tileset_pradera.json")
local W, H = cas.w, cas.h
local T = 2

-- ---------------------------------------------------------------- colores del tileset
local tsSpr = app.open("public/assets/mundo/tileset_pradera.png")
local ts = Image(tsSpr.cels[1].image)
tsSpr:close()
local COLS = math.floor(ts.width / 32)
local pc = app.pixelColor
local avgCache, coverCache = {}, {}
local function tileAvg(gid)
  if avgCache[gid] then return avgCache[gid], coverCache[gid] end
  local id = gid - 1
  local ox, oy = (id % COLS) * 32, (id // COLS) * 32
  local r, g, b, n = 0, 0, 0, 0
  for y = 0, 31 do for x = 0, 31 do
    local p = ts:getPixel(ox + x, oy + y)
    if pc.rgbaA(p) > 128 then r = r + pc.rgbaR(p); g = g + pc.rgbaG(p); b = b + pc.rgbaB(p); n = n + 1 end
  end end
  local c = n > 0 and { r / n, g / n, b / n } or { 0, 0, 0 }
  avgCache[gid], coverCache[gid] = c, n / 1024
  return c, n / 1024
end
local function nameOf(gid) local t = meta.tiles[gid] return t and t.nombre or "" end
local waterCache = {}
local function isWater(gid)
  if gid == 0 then return true end
  if waterCache[gid] == nil then
    local n = nameOf(gid)
    waterCache[gid] = (n:find("^mar") or n:find("^fiordo") or n:find("^bajo") or n:find("^agua") or n:find("^canal")) and true or false
  end
  return waterCache[gid]
end

-- ---------------------------------------------------------------- distancia al agua y a la tierra
local idx = function(x, y) return y * W + x + 1 end
local water = {}
for y = 0, H - 1 do for x = 0, W - 1 do
  local k = idx(x, y)
  water[k] = (cas.zone[k] == 0 and cas.wild[k] == 0) or (cas.zone[k] > 0 and isWater(cas.ground[k]))
end end
-- distancia a la tierra (para el mar), hasta 12 casillas
local dist = {}
local queue, qh = {}, 1
for y = 0, H - 1 do for x = 0, W - 1 do
  local k = idx(x, y)
  if not water[k] then dist[k] = 0; queue[#queue + 1] = { x, y } end
end end
while qh <= #queue do
  local q = queue[qh]; qh = qh + 1
  local d = dist[idx(q[1], q[2])]
  if d < 12 then
    for _, o in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
      local nx, ny = q[1] + o[1], q[2] + o[2]
      if nx >= 0 and ny >= 0 and nx < W and ny < H then
        local nk = idx(nx, ny)
        if dist[nk] == nil then dist[nk] = d + 1; queue[#queue + 1] = { nx, ny } end
      end
    end
  end
end

-- ---------------------------------------------------------------- paleta
local function rgb(c) return Color{ r = math.floor(math.max(0, math.min(255, c[1]))), g = math.floor(math.max(0, math.min(255, c[2]))), b = math.floor(math.max(0, math.min(255, c[3]))) } end
local function mul(c, k) return { c[1] * k, c[2] * k, c[3] * k } end
local function mix(a, b, t) return { a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t } end
local function hexc(s) return { tonumber(s:sub(1, 2), 16), tonumber(s:sub(3, 4), 16), tonumber(s:sub(5, 6), 16) } end
-- un poco de más color: las casillas promediadas quedan grises
local function vivid(c, k)
  local m = (c[1] + c[2] + c[3]) / 3
  return { m + (c[1] - m) * k, m + (c[2] - m) * k, m + (c[3] - m) * k }
end
-- pocos tonos por canal: le da el aspecto de pixel art y saca el ruido
local function quant(c) return { math.floor(c[1] / 6 + 0.5) * 6, math.floor(c[2] / 6 + 0.5) * 6, math.floor(c[3] / 6 + 0.5) * 6 } end
local function hash(x, y) local h = (x * 374761393 + y * 668265263) % 2147483647; h = (h * 1274126177) % 2147483647; return (h % 10000) / 10000 end
local FOAM, SHALLOW, MID, DEEP, ABYSS = hexc("d8f2f4"), hexc("5fb4cc"), hexc("3a87b0"), hexc("2a628c"), hexc("1c4468")
local WAVE = hexc("78bcd6")
local function seaColor(d, x, y)
  if d <= 1 then return mix(SHALLOW, FOAM, 0.5) end
  if d == 2 then return mix(MID, SHALLOW, 0.65) end
  if d <= 4 then return mix(SHALLOW, MID, (d - 2) / 2) end
  if d <= 8 then return mix(MID, DEEP, (d - 4) / 4) end
  return mix(DEEP, ABYSS, math.min(1, (d - 8) / 6 + ((x + y) % 7) / 40))
end

-- ---------------------------------------------------------------- pintar
local img = Image(W * T, H * T, ColorMode.RGB)
local function put(px, py, c) img:drawPixel(px, py, rgb(quant(c))) end
for y = 0, H - 1 do for x = 0, W - 1 do
  local k = idx(x, y)
  local px, py = x * T, y * T
  if water[k] and not (cas.zone[k] > 0 and nameOf(cas.ground[k]):find("^lago")) then
    -- mar y ríos: por profundidad, con olas sueltas en el hondo
    local d = dist[k] or 13
    local c = seaColor(d, x, y)
    put(px, py, c); put(px + 1, py, c); put(px, py + 1, mul(c, 0.96)); put(px + 1, py + 1, c)
    -- olas sueltas: una rayita de dos píxeles con un borde más oscuro, donde caiga el azar
    if d >= 5 and hash(x, y) < 0.018 then put(px, py, WAVE); put(px + 1, py, WAVE); put(px + 1, py + 1, mul(c, 0.85)) end
    -- el agua de dentro del mapa (ríos, lagos) se ve más clara que el mar abierto
    if cas.zone[k] > 0 and d >= 3 then put(px + 1, py + 1, mul(c, 1.08)) end
  else
    local base = vivid(tileAvg(cas.ground[k]), 1.25)
    -- tierras sin explorar alrededor de las zonas: el mismo terreno, más apagado
    local wild = cas.wild[k] == 1
    if wild then base = mul(vivid(base, 0.8), 0.9) end
    -- la tierra que toca el agua: un poco más clara (orilla)
    if (dist[k] or 0) == 0 then
      for _, o in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) do
        local nx, ny = x + o[1], y + o[2]
        if nx >= 0 and ny >= 0 and nx < W and ny < H and water[idx(nx, ny)] then base = mix(base, hexc("efe2b8"), 0.22) break end
      end
    end
    -- tramado: dos tonos en diagonal
    put(px, py, base); put(px + 1, py + 1, base); put(px + 1, py, mul(base, 0.95)); put(px, py + 1, mul(base, 0.95))
    -- lo que hay encima (árboles, casas, rocas): su color tapa tres píxeles y el cuarto es su sombra
    local o = cas.object[k]
    if o and o > 0 and (not wild or (x + y) % 2 == 0) then
      local oc, cover = tileAvg(o)
      if cover > 0.18 then
        local c = vivid(oc, 1.3)
        put(px, py, c); put(px + 1, py, mul(c, 1.06)); put(px, py + 1, mul(c, 0.92)); put(px + 1, py + 1, mul(c, 0.7))
      end
    end
    -- relieve: lo que choca (acantilados, paredes, rocas) proyecta sombra en la casilla de abajo
    if cas.solid[k] == 1 then
      put(px, py + 1, mul(base, 0.72)); put(px + 1, py + 1, mul(base, 0.72))
    end
    if y > 0 and cas.solid[idx(x, y - 1)] == 1 and cas.solid[k] == 0 and not water[idx(x, y - 1)] then
      put(px, py, mul(base, 0.84)); put(px + 1, py, mul(base, 0.84))
    end
  end
end end

local spr = Sprite(W * T, H * T, ColorMode.RGB)
spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
spr:saveAs(dir .. "/atlas.aseprite")
spr:saveCopyAs(png .. "/atlas.png")
spr:close()
print("atlas.png " .. (W * T) .. "x" .. (H * T))
