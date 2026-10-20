-- Escena de las Ruinas Ancestrales (puntos "escena" con fase, ver src/game/world/escena.js y
-- art/mapas/generar_ruinas.js): el Santuario de las Lágrimas revive con la historia, así que sus casas
-- restauradas se dibujan ENCIMA de las ruinas del mapa solo cuando toca. Se arman con los mismos tiles del
-- tileset (crear_mundo.lua, v11), pegados en una sola imagen:
--   escena/casa_aethrina.png     casa de los peregrinos, restaurada (96x96)
--   escena/posada_santuario.png  la posada de Madre Tilda (128x96)
--   escena/forja_santuario.png   la forja de Orin (96x96)
--   escena/fuente_lagrimas.png   la fuente del Santuario, encendida (64x64)
--   escena/niebla_velo.png       la niebla del Velo que tapa la Puerta hasta la R1 (96x64)
-- Uso (desde la carpeta gpr):
--   aseprite -b --script-param ts=public/assets/mundo/tileset_pradera.png --script-param json=art/sprites/mundo/tileset_pradera.json --script-param out=public/assets/mundo/escena --script art/sprites/mundo/crear_escena_ruinas.lua
local fh = io.open(app.params.json, "r"); local txt = fh:read("a"); fh:close()
local ID = {}
for id, name in txt:gmatch('"id": (%d+), "nombre": "([^"]+)"') do ID[name] = tonumber(id) end
local ts = app.open(app.params.ts); local sheet = Image(ts.cels[1].image); local sp = ts.cels[1].position; ts:close()
local COLS = 8

local function tileInto(out, id, ox, oy)
  local sx, sy = (id % COLS) * 32, (id // COLS) * 32
  for y = 0, 31 do for x = 0, 31 do
    local c = sheet:getPixel(sx + x - sp.x, sy + y - sp.y)
    if app.pixelColor.rgbaA(c) > 0 then out:drawPixel(ox + x, oy + y, c) end
  end end
end
local function save(name, img)
  local s = Sprite(img.width, img.height, ColorMode.RGB)
  s.cels[1].image = img
  s:saveCopyAs(app.params.out .. "/" .. name .. ".png")
  s:close()
end
-- un objeto grande del tileset (nombre_fila_columna)
local function grid(name, w, h, out)
  local img = Image(w * 32, h * 32, ColorMode.RGB)
  for r = 0, h - 1 do for c = 0, w - 1 do
    local id = ID[string.format("%s_%d_%d", name, r, c)]
    assert(id, "falta el tile " .. name)
    tileInto(img, id, c * 32, r * 32)
  end end
  save(out or name, img)
end

grid("casa_aethrina", 3, 3)
grid("posada_santuario", 4, 3)
grid("forja_santuario", 3, 3)
grid("fuente_lagrimas", 2, 2)

-- la niebla de la Puerta: el Velo entero (velo_15) en 3x2 casillas
do
  local img = Image(96, 64, ColorMode.RGB)
  for r = 0, 1 do for c = 0, 2 do tileInto(img, ID["velo_15"], c * 32, r * 32) end end
  save("niebla_velo", img)
end
