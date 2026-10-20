-- Retrato de la Escalinata de Luz (64x64), el que se ve en su diálogo (src/game/dialoguesRuinas.js).
-- Uso: aseprite -b --script-param dir=art/sprites/mundo --script-param png=public/assets/mundo --script crear_retrato_escalinata.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = { K=hex("141420"), W=hex("ffffff"), l1=hex("e0f8ff"), l2=hex("a6e2f4"), l3=hex("64bcde"), go=hex("ffe08a"), god=hex("c89a2a"),
  m1=hex("f4f0e6"), m3=hex("c2b9a6"), c1=hex("2e2a66"), c2=hex("1e1a44") }
local img = Image(64, 64, ColorMode.RGB)
local function px(x, y, c) if x >= 0 and x < 64 and y >= 0 and y < 64 then img:drawPixel(math.floor(x), math.floor(y), C[c]) end end
local function rect(x0, y0, x1, y1, c) for y = y0, y1 do for x = x0, x1 do px(x, y, c) end end end
local function ellipse(cx, cy, rx, ry, c) for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do local dx, dy = (x - cx) / rx, (y - cy) / ry; if dx * dx + dy * dy <= 1 then px(x, y, c) end end end end
-- el cielo del atardecer de las Ruinas, oscuro arriba
rect(0, 0, 63, 63, "c2"); rect(0, 32, 63, 63, "c1")
for _, p in ipairs({{6,6},{20,12},{50,8},{58,20},{12,24},{40,4}}) do px(p[1], p[2], "go") end
-- el círculo de luz en el suelo y los escalones transparentes que suben en espiral
ellipse(32, 54, 26, 8, "m3"); ellipse(32, 54, 22, 6, "l3"); ellipse(32, 54, 15, 4, "l2"); ellipse(32, 54, 6, 2, "W")
for i = 0, 7 do
  local x = 10 + i * 6; local y = 46 - i * 5
  rect(x, y, x + 9, y + 2, i % 2 == 0 and "l2" or "l1"); rect(x, y + 3, x + 9, y + 3, "l3")
end
for _, p in ipairs({{8,50},{56,50},{18,58},{46,58},{32,46}}) do px(p[1], p[2], "go") end
local spr = Sprite(64, 64, ColorMode.RGB)
spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
spr:saveAs(app.params.dir .. "/retratos/escalinata_luz.aseprite")
spr:saveCopyAs(app.params.png .. "/retratos/escalinata_luz.png")
spr:close()
