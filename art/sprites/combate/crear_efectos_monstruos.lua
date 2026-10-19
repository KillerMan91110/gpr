-- Efectos propios de cada habilidad de los monstruos (las 92 de todas las zonas): cada habilidad tiene
-- su animación de 8 cuadros de 64x64, con su forma y sus colores. Las usa game/BattleScene.js
-- (fxMonsterSkill) según su modo:
--   golpe      se dibuja sobre el objetivo (mordidas, zarpazos, estocadas, golpes): el monstruo se
--              lanza contra él, golpea y vuelve («pesado» = salta y hace temblar la pantalla)
--   proyectil  cuadros 1-2: lo que vuela del monstruo al objetivo; 3-8: el impacto sobre él
--   area       se dibuja sobre cada objetivo, uno detrás del otro (alientos, olas, explosiones)
--   propio     se dibuja sobre el monstruo (escudos, pieles, aullidos, regeneración)
--   aliado     sobre un aliado del monstruo (Resurrección Sombría)
-- Salida (parámetro png=public/assets/combate/efectos):
--   efectos.png    una sola lámina: 16 cuadros por fila (dos habilidades por fila), así el índice del
--                  cuadro es (orden de la habilidad × 8 + cuadro) y cabe en la textura de un celular
--   efectos.json   { cuadro, cuadros, columnas, habilidades: { CODIGO: { i, modo, mezcla, color, pesado } } }
-- Las de un solo objetivo (mordidas, zarpazos, estocadas, golpes, proyectiles, remolinos y la
-- maldición) se dibujan cuadro por cuadro en los 8; las de área y las propias reparten sus 6 dibujos
-- en los 8 cuadros.
-- y art/sprites/combate/efectos/efectos_monstruos.aseprite con cada habilidad en su etiqueta.
-- Uso (desde la carpeta gpr):
--   D:\aseprite\aseprite.exe -b --script-param dir=art/sprites/combate --script-param png=public/assets/combate/efectos --script art/sprites/combate/crear_efectos_monstruos.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16), a=255} end
local S = 64
local NF = 8
-- los generadores de área y propios dibujan 6 pasos (0-5)
local NF6 = 6

-- ---------------------------------------------------------------- lienzo de un cuadro
local function newGrid()
  local g = {}
  local G = {g = g}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if c and x >= 0 and x < S and y >= 0 and y < S then g[y * S + x] = c end
  end
  function G.rect(x0, y0, x1, y1, c) for y = math.floor(y0), math.floor(y1) do for x = math.floor(x0), math.floor(x1) do G.px(x, y, c) end end end
  function G.line(x0, y0, x1, y1, c, w)
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
    w = w or 1
    for i = 0, n do
      local x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
      if w <= 1 then G.px(x, y, c) else G.disc(x, y, w / 2, c) end
    end
  end
  function G.disc(cx, cy, r, c)
    for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
      local dx, dy = x - cx, y - cy
      if dx * dx + dy * dy <= r * r then G.px(x, y, c) end
    end end
  end
  function G.ellipse(cx, cy, rx, ry, c)
    if rx <= 0 or ry <= 0 then return end
    for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      if dx * dx + dy * dy <= 1 then G.px(x, y, c) end
    end end
  end
  -- arco de circunferencia (grados), de grosor w
  function G.arc(cx, cy, r, a0, a1, c, w)
    w = w or 1
    local steps = math.max(8, math.floor(math.abs(a1 - a0) * r / 25))
    for i = 0, steps do
      local a = math.rad(a0 + (a1 - a0) * i / steps)
      local x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
      if w <= 1 then G.px(x, y, c) else G.disc(x, y, w / 2, c) end
    end
  end
  function G.ring(cx, cy, r, c, w) G.arc(cx, cy, r, 0, 360, c, w) end
  return G
end

-- pseudoazar fijo por habilidad (cada efecto sale siempre igual)
local seed = 1
local function srand(n) seed = n end
local function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end
local function rr(a, b) return a + (b - a) * rnd() end

-- t de 0 a 1 a lo largo de los 6 cuadros; "fade" va apagando el color (c1 claro → c3 oscuro)
local function T(f) return f / (NF6 - 1) end
local function fadeColor(P, f, start)
  start = start or 3
  if f < start then return P[1] end
  if f == start then return P[2] end
  return P[3]
end

-- =====================================================================================
-- Generadores (cada uno dibuja el cuadro f con la paleta P = {claro, medio, oscuro, extra…} y sus
-- opciones o)
-- =====================================================================================
local GEN = {}

-- zarpazos / tajos: o.n arcos paralelos, o.ang inclinación, o.r radio
function GEN.zarpazo(G, f, P, o)
  local n, ang, r = o.n or 3, o.ang or 30, o.r or 20
  local grow = math.min(1, (f + 1) / 3)
  for k = 0, n - 1 do
    local off = (k - (n - 1) / 2) * (o.gap or 7)
    local cx = 32 + off * math.cos(math.rad(ang + 90))
    local cy = 32 + off * math.sin(math.rad(ang + 90))
    local a0 = ang + 200
    local a1 = a0 + 120 * grow
    if f <= 3 then
      G.arc(cx, cy, r, a0, a1, P[3], o.w and o.w + 2 or 4)
      G.arc(cx, cy, r, a0, a1, f >= 3 and P[2] or P[1], o.w or 2)
    elseif f == 4 then
      G.arc(cx, cy, r, a0 + 60, a1, P[2], 2)
    else
      G.arc(cx, cy, r, a0 + 90, a1, P[3], 1)
    end
  end
  if f == 2 or f == 3 then for i = 0, 7 do local a = math.rad(i * 45 + 20); G.line(32, 32, 32 + math.cos(a) * (6 + f * 4), 32 + math.sin(a) * (6 + f * 4), P[4] or P[2]) end end
  if o.drops and f >= 2 then for i = 1, 5 do G.disc(20 + i * 5, 36 + (f - 2) * 4 + (i % 2) * 3, 1.5, o.drops) end end
end

-- mordida: dos filas de dientes que se cierran; o.teeth color de los dientes
function GEN.mordida(G, f, P, o)
  local close = ({ 16, 9, 2, 0, 0, 0 })[f + 1]
  local w = o.w or 22
  if f <= 3 then
    for _, side in ipairs({ -1, 1 }) do
      local y = 32 + side * (close + 4)
      G.arc(32, 32 + side * (close + 18), 20, side < 0 and 50 or 230, side < 0 and 130 or 310, P[3], 5)
      for k = -2, 2 do
        local x = 32 + k * (w / 5)
        G.line(x - 2, y, x, y - side * 7, o.teeth or P[1]); G.line(x + 2, y, x, y - side * 7, o.teeth or P[1]); G.line(x - 1, y, x + 1, y, o.teeth or P[1])
      end
    end
  end
  if f >= 2 then
    local n = (f - 1) * 3
    for i = 1, n do G.disc(32 + rr(-14, 14), 32 + rr(-6, 10) + (f - 2) * 3, rr(1, 2.2), i % 3 == 0 and P[2] or P[4] or P[2]) end
    if f == 2 then GEN.estrella(G, 2, P, { r = 12 }) end
  end
  if o.extra then o.extra(G, f, P) end
end

-- estallido en estrella (impactos)
function GEN.estrella(G, f, P, o)
  local r = (o.r or 18) * math.min(1, (f + 1) / 3)
  local rays = o.rays or 8
  if f >= 4 then r = r * 1.1 end
  for i = 0, rays - 1 do
    local a = math.rad(i * 360 / rays + (o.rot or 0))
    local len = (i % 2 == 0) and r or r * 0.6
    G.line(32, 32, 32 + math.cos(a) * len, 32 + math.sin(a) * len, f >= 4 and P[3] or P[2], f >= 4 and 1 or 2)
  end
  if f <= 3 then G.disc(32, 32, math.max(2, 8 - f * 1.5), P[1]) end
end

-- proyectil: cuadros 0-1 vuela (o.forma: orbe, lanza, piedra, bala, rayo, haz, lengua); 2-5 impacto
function GEN.proyectil(G, f, P, o)
  if f <= 1 then
    local forma = o.forma or 'orbe'
    if forma == 'orbe' then
      for k = 1, 4 do G.disc(32 - k * 6 - f * 2, 32 + math.sin(k + f) * 2, 6 - k, k % 2 == 0 and P[2] or P[3]) end
      G.disc(32, 32, 8, P[2]); G.disc(33, 31, 5, P[1]); G.px(35, 29, P[4] or P[1])
    elseif forma == 'lanza' then
      G.line(8, 32, 50, 32, P[2], 4); G.line(10, 32, 50, 32, P[1], 2)
      G.line(50, 26, 60, 32, P[1], 2); G.line(50, 38, 60, 32, P[1], 2)
      for k = 0, 3 do G.px(12 + k * 8 + f * 3, 28 + (k % 2) * 8, P[4] or P[2]) end
    elseif forma == 'piedra' then
      G.disc(34, 32, 7, P[2]); G.disc(32, 30, 5, P[1]); G.px(37, 34, P[3]); G.px(31, 35, P[3])
      for k = 1, 3 do G.line(26 - k * 6, 30 + k, 22 - k * 6, 30 + k, P[3]) end
    elseif forma == 'bala' then
      G.ellipse(40, 32, 4, 2, P[1]); for k = 0, 5 do G.px(34 - k * 4, 32, P[2]) end
      if f == 0 then GEN.estrella(G, 1, { P[4] or P[1], P[2], P[3] }, { r = 6 }) end
    elseif forma == 'rayo' then
      local x, y = 4, 32
      for k = 1, 7 do local nx, ny = 4 + k * 8, 32 + ((k + f) % 2 == 0 and -6 or 6); G.line(x, y, nx, ny, P[2], 3); G.line(x, y, nx, ny, P[1]); x, y = nx, ny end
    elseif forma == 'haz' then
      G.rect(0, 26, 63, 38, P[3]); G.rect(0, 28, 63, 36, P[2]); G.rect(0, 31, 63, 33, P[1])
      for k = 0, 6 do G.disc(k * 10 + f * 5, 32 + ((k % 2) * 2 - 1) * 6, 2, P[1]) end
    elseif forma == 'chorro' then
      for k = 0, 10 do G.disc(6 + k * 5, 32 + math.sin(k + f * 2) * 3, 3 + k * 0.4, k % 3 == 0 and P[1] or P[2]) end
    elseif forma == 'lengua' then
      G.line(0, 32, 54, 32, P[2], 4); G.line(0, 31, 54, 31, P[1]); G.ellipse(56, 32, 5, 4, P[2]); G.px(57, 31, P[1])
    elseif forma == 'picada' then
      for k = 0, 6 do G.line(6 + k * 6, 14 + k * 3, 14 + k * 6, 18 + k * 3, P[2]) end
      G.ellipse(52, 40, 6, 3, P[1]); G.line(46, 40, 60, 46, P[1], 2)
    elseif forma == 'sigilo' then
      G.ring(32, 32, 9, P[2], 2); G.ring(32, 32, 5, P[1]); for i = 0, 4 do local a = math.rad(i * 72 + f * 36); G.px(32 + math.cos(a) * 12, 32 + math.sin(a) * 12, P[1]) end
      for k = 1, 3 do G.disc(32 - 10 - k * 5, 32, 3 - k * 0.7, P[3]) end
    elseif forma == 'esquirla' then
      G.line(14, 32, 50, 32, P[2], 3); G.line(50, 28, 58, 32, P[1], 2); G.line(50, 36, 58, 32, P[1], 2); G.line(18, 31, 50, 31, P[1])
      for k = 0, 3 do G.px(10 + k * 7, 26 + (k + f) % 3 * 6, P[4] or P[1]) end
    end
    return
  end
  local g = f - 2
  local imp = o.impacto or 'estrella'
  if imp == 'salpicadura' then
    for i = 0, 9 do
      local a = math.rad(i * 36 + 10)
      local d = 6 + g * 6
      G.disc(32 + math.cos(a) * d, 32 + math.sin(a) * d * 0.8 + g * 2, math.max(1, 3 - g * 0.6), g >= 2 and P[3] or P[2])
    end
    if g <= 1 then G.disc(32, 32, 9 - g * 3, P[1]) end
  elseif imp == 'explosion' then
    GEN.explosion(G, g + 1, P, { r = o.r or 22 })
  elseif imp == 'escarcha' then
    for i = 0, 5 do local a = math.rad(i * 60); local d = 6 + g * 5; G.line(32, 32, 32 + math.cos(a) * d, 32 + math.sin(a) * d, g >= 3 and P[3] or P[1], 2); G.px(32 + math.cos(a) * (d + 2), 32 + math.sin(a) * (d + 2), P[2]) end
  elseif imp == 'sigilo' then
    G.ring(32, 32, 8 + g * 4, g >= 3 and P[3] or P[2], 2); G.ring(32, 32, 4 + g * 2, P[1])
    if g <= 2 then for i = 0, 5 do local a = math.rad(i * 60 + g * 20); G.disc(32 + math.cos(a) * (10 + g * 4), 32 + math.sin(a) * (10 + g * 4), 1.5, P[1]) end end
  else
    GEN.estrella(G, g + 1, P, { r = o.r or 16, rays = o.rays })
  end
  if o.impactoExtra then o.impactoExtra(G, g, P) end
end

-- explosión: bola que crece, anillo y escombros
function GEN.explosion(G, f, P, o)
  local r = (o.r or 22) * ({ 0.3, 0.6, 0.85, 1, 1.05, 1.1 })[f + 1]
  if f <= 3 then G.disc(32, 34, r, P[3]); G.disc(32, 34, r * 0.75, P[2]); G.disc(32, 33, r * 0.45, P[1]) end
  if f >= 2 then G.ring(32, 34, r + 3, f >= 4 and P[3] or P[2], 2) end
  if f >= 3 then
    srand(f * 7 + (o.sd or 0))
    for i = 1, 10 do local a = rr(0, 6.28); local d = r + rr(0, 6); G.disc(32 + math.cos(a) * d, 34 + math.sin(a) * d * 0.8, rr(1, 2.5), P[4] or P[3]) end
  end
  -- humo que sube al final
  if f == 5 then srand(41 + (o.sd or 0)); for i = 1, 5 do G.disc(32 + rr(-12, 12), 24 + rr(-8, 4), rr(3, 5), P[3]) end end
end

-- ola: el agua sube por la izquierda y rompe sobre el objetivo
function GEN.ola(G, f, P, o)
  local h = ({ 10, 22, 34, 40, 26, 12 })[f + 1] * (o.alto or 1)
  local crest = 10 + f * 9
  for x = 0, 63 do
    local top = 60 - h * math.max(0, 1 - math.abs(x - crest) / 34)
    if top < 60 then G.line(x, top, x, 60, P[2]); G.px(x, top, P[1]); G.px(x, top + 1, P[1]) end
  end
  if f >= 2 then
    srand(f * 11 + (o.sd or 0))
    for i = 1, 8 do G.disc(crest + rr(-12, 12), 60 - h - rr(0, 10), rr(1, 2.5), P[4] or P[1]) end
    G.arc(crest + 4, 60 - h + 6, 8, 180, 330, P[1], 2)
  end
  if f >= 4 then for i = 0, 6 do G.disc(8 + i * 8, 58 - (i % 2) * 3, 2, P[3]) end end
end

-- nube (azufre, tinta, vapor): bolas que se hinchan y se deshacen
function GEN.nube(G, f, P, o)
  srand(o.sd or 3)
  local grow = ({ 0.4, 0.7, 1, 1.1, 1.15, 1.2 })[f + 1]
  for i = 1, 7 do
    local x, y, r = 32 + rr(-16, 16), 34 + rr(-10, 8), rr(6, 11)
    local c = f >= 4 and P[3] or (i % 3 == 0 and P[1] or P[2])
    if f < 5 or i % 2 == 0 then G.disc(x, y - f * (o.sube or 1.5), r * grow, c) end
  end
  if o.gotas and f >= 2 then for i = 1, 6 do G.disc(16 + i * 6, 46 + (f - 2) * 3 + (i % 2) * 2, 1.5, P[4] or P[2]) end end
end

-- anillos de sonido (chillidos, aullidos, cantos)
function GEN.anillos(G, f, P, o)
  for k = 0, 2 do
    local r = 6 + f * 5 - k * 8
    if r > 2 then G.arc(32, 32, r, o.a0 or 0, o.a1 or 360, k == 0 and P[1] or P[2], 2) end
  end
  if o.simbolo then o.simbolo(G, f, P) end
end

-- rayo que cae del cielo sobre el objetivo
function GEN.rayo_cae(G, f, P, o)
  if f <= 3 then
    local x, y = 30 + (f % 2) * 4, 0
    for k = 1, 6 do
      local nx, ny = 32 + ((k + f) % 2 == 0 and -7 or 7), k * 7
      if k == 6 then nx = 32 end
      G.line(x, y, nx, ny, P[2], 4); G.line(x, y, nx, ny, P[1], 2); x, y = nx, ny
    end
  end
  if f >= 2 then GEN.estrella(G, f - 1, P, { r = 14, rays = 6 }) end
  if f >= 3 then for i = 0, 3 do G.line(32, 44, 32 + (i - 1.5) * 9, 52 + (i % 2) * 4, P[2]) end end
end

-- géiser / columna desde el suelo (erupción, ola de magma desde abajo)
function GEN.geiser(G, f, P, o)
  local h = ({ 6, 20, 40, 52, 44, 24 })[f + 1]
  G.ellipse(32, 56, 14, 4, P[3])
  G.rect(32 - 7, 58 - h, 32 + 7, 58, P[2]); G.rect(32 - 3, 58 - h, 32 + 3, 58, P[1])
  if f >= 2 then
    srand(f * 5 + (o.sd or 0))
    for i = 1, 9 do G.disc(32 + rr(-14, 14), 58 - h + rr(-6, 10), rr(1.5, 3), i % 2 == 0 and P[1] or (P[4] or P[2])) end
  end
end

-- esquirlas que vuelan hacia el objetivo y se clavan (astillas, coral, hielo)
function GEN.esquirlas(G, f, P, o)
  srand(o.sd or 9)
  local n = o.n or 7
  local t = math.min(1, (f + 1) / 3)
  for i = 1, n do
    local sx, sy = -12 + rr(-4, 4), 32 + rr(-18, 18)
    local tx, ty = 32 + rr(-12, 12), 32 + rr(-12, 12)
    local x, y = sx + (tx - sx) * t, sy + (ty - sy) * t
    local a = math.atan(ty - sy, tx - sx)
    local len = (o.len or 6) * 1.6
    local bx, by = x - len * math.cos(a), y - len * math.sin(a)
    if f <= 3 then
      G.line(bx, by, x, y, P[3], 4); G.line(bx, by, x, y, P[2], 2); G.disc(x, y, 1.5, P[1])
    else
      -- clavadas: se quedan quietas y se apagan
      G.line(bx, by, x, y, P[3], 2); G.px(x, y, f == 4 and P[2] or P[3])
    end
  end
  if f == 2 or f == 3 then
    GEN.estrella(G, f, P, { r = 16, rays = 8 })
    for i = 1, 8 do local a = rr(0, 6.28); local d = rr(8, 18); G.disc(32 + math.cos(a) * d, 32 + math.sin(a) * d, 1.5, P[4] or P[1]) end
  end
end

-- remolino (maelstrom, ventisca, giro mortal)
function GEN.remolino(G, f, P, o)
  for k = 0, 2 do
    local r0 = 4 + k * 7
    G.arc(32, 32, r0 + f, f * 50 + k * 120, f * 50 + k * 120 + 220, k == 0 and P[1] or P[2], f >= 4 and 1 or 2)
  end
  if o.copos then srand(f + 2); for i = 1, 10 do G.px(32 + rr(-24, 24), 32 + rr(-24, 24), P[1]) end end
  if f >= 4 then G.ring(32, 32, 26, P[3]) end
end

-- escudo / piel sobre el propio monstruo: o.forma (circulo, hexagonos, placas, escamas, huesos, espinas)
function GEN.escudo(G, f, P, o)
  local r = ({ 8, 16, 24, 26, 26, 26 })[f + 1]
  local forma = o.forma or 'circulo'
  local c = f >= 5 and P[3] or (f >= 3 and P[2] or P[1])
  if forma == 'circulo' then
    G.ring(32, 32, r, c, 2); if f >= 2 then G.arc(32, 32, r - 4, 200, 260, P[1], 2) end
  elseif forma == 'hexagonos' then
    for i = 0, 5 do local a0, a1 = math.rad(i * 60), math.rad(i * 60 + 60); G.line(32 + math.cos(a0) * r, 32 + math.sin(a0) * r, 32 + math.cos(a1) * r, 32 + math.sin(a1) * r, c, 2) end
    if f >= 2 then for i = 0, 5 do local a = math.rad(i * 60 + 30); G.line(32, 32, 32 + math.cos(a) * r * 0.85, 32 + math.sin(a) * r * 0.85, P[2]) end end
  elseif forma == 'placas' then
    for i = 0, 7 do local a = math.rad(i * 45 + f * 4); local x, y = 32 + math.cos(a) * r, 32 + math.sin(a) * r; G.rect(x - 3, y - 3, x + 3, y + 3, c); G.px(x - 2, y - 2, P[1]) end
  elseif forma == 'escamas' then
    for i = 0, 9 do local a = math.rad(i * 36); local x, y = 32 + math.cos(a) * r, 32 + math.sin(a) * r * 0.9; G.arc(x, y, 4, 180, 360, c, 2) end
  elseif forma == 'huesos' then
    for i = 0, 5 do local a = math.rad(i * 60 + f * 15); local x, y = 32 + math.cos(a) * r, 32 + math.sin(a) * r; G.line(x - 4, y, x + 4, y, c, 2); G.disc(x - 4, y - 1, 1.5, c); G.disc(x - 4, y + 1, 1.5, c); G.disc(x + 4, y - 1, 1.5, c); G.disc(x + 4, y + 1, 1.5, c) end
  elseif forma == 'espinas' then
    for i = 0, 9 do local a = math.rad(i * 36); G.line(32 + math.cos(a) * (r - 6), 32 + math.sin(a) * (r - 6), 32 + math.cos(a) * (r + 3), 32 + math.sin(a) * (r + 3), c, 2) end
  elseif forma == 'concha' then
    G.arc(32, 40, r, 180, 360, c, 3); for i = 0, 4 do local a = math.rad(200 + i * 35); G.line(32, 40, 32 + math.cos(a) * r, 40 + math.sin(a) * r, P[2]) end
  end
  if f >= 2 and f <= 4 then for i = 0, 3 do local a = math.rad(i * 90 + 45 + f * 20); G.px(32 + math.cos(a) * (r + 4), 32 + math.sin(a) * (r + 4), P[1]) end end
  if o.extra then o.extra(G, f, P) end
end

-- más que suben (regeneración) o chispas (resurrección)
function GEN.suben(G, f, P, o)
  srand(o.sd or 5)
  for i = 1, 6 do
    local x, y0 = 32 + rr(-18, 18), 50 + rr(-4, 8)
    local y = y0 - f * 7 - rr(0, 4)
    if o.simbolo == 'mas' then G.line(x - 3, y, x + 3, y, f >= 4 and P[2] or P[1], 2); G.line(x, y - 3, x, y + 3, f >= 4 and P[2] or P[1], 2)
    else G.disc(x, y, 2, i % 2 == 0 and P[1] or P[2]) end
  end
  G.ellipse(32, 52, 18 - f, 4, f >= 4 and P[3] or P[2])
  if o.extra then o.extra(G, f, P) end
end

-- sello oscuro (maldición): un círculo de runas que gira con una calavera
function GEN.sello(G, f, P, o)
  local r = math.min(22, 6 + f * 5)
  G.ring(32, 32, r, P[2], 2); G.ring(32, 32, r - 5, P[3])
  for i = 0, 5 do local a = math.rad(i * 60 + f * 25); local x, y = 32 + math.cos(a) * (r - 2.5), 32 + math.sin(a) * (r - 2.5); G.rect(x - 1, y - 1, x + 1, y + 1, P[1]) end
  if f >= 2 then
    G.disc(32, 30, 6, P[1]); G.rect(29, 34, 35, 37, P[1]); G.disc(30, 30, 1.5, P[3]); G.disc(34, 30, 1.5, P[3]); G.px(32, 33, P[3])
  end
end


-- =====================================================================================
-- Generadores de 8 cuadros (habilidades de un solo objetivo)
-- =====================================================================================
local function clamp(x, a, b) return math.max(a, math.min(b, x)) end
-- brillo: halo oscuro (con mezcla ADD se ve como resplandor), medio y núcleo
local function glow(G, x, y, r, P) G.disc(x, y, r, P[3]); G.disc(x, y, r * 0.66, P[2]); G.disc(x, y, r * 0.33, P[1]) end
-- chispas o gotas que salen del centro (g = paso desde el impacto); caen si gravedad
local function spray(G, g, P, n, speed, grav, sd, size)
  srand(sd)
  for i = 1, n do
    local a = rr(0, 6.28)
    local v = speed * rr(0.6, 1.2)
    local d = 4 + v * g
    local x, y = 32 + math.cos(a) * d, 32 + math.sin(a) * d * 0.85 + (grav or 0) * g * g
    local r = math.max(0.6, (size or 2) * (1 - g / 7))
    G.disc(x, y, r, g >= 4 and P[3] or (i % 3 == 0 and (P[4] or P[1]) or P[2]))
  end
end

-- mordida: las mandíbulas se abren (anticipación), se cierran de golpe con un destello, salpican y
-- quedan las marcas de los dientes. o.w ancho, o.teeth color de los dientes, o.pinza = tenaza
function GEN.mordida8(G, f, P, o)
  local open = ({ 14, 20, 24, 3, 0, 0, 0, 0 })[f + 1]
  local w = o.w or 24
  local teeth = o.teeth or P[1]
  if f <= 3 then
    for _, side in ipairs({ -1, 1 }) do
      local base = 32 + side * (open / 2 + 5)
      -- encía (o pinza): media luna rellena
      for x = -w / 2 - 2, w / 2 + 2 do
        local curve = (x * x) / ((w / 2 + 2) * (w / 2 + 2)) * 5
        G.line(32 + x, base, 32 + x, base + side * (6 - curve + (o.pinza and 3 or 0)), P[3])
        G.px(32 + x, base + side * (6 - curve + (o.pinza and 3 or 0)), P[2])
      end
      -- dientes: triángulos que apuntan al centro
      for k = -2, 2 do
        local x = 32 + k * (w / 5)
        local tip = base - side * (o.pinza and 4 or (k == 0 and 9 or 7))
        for d = 0, 6 do G.line(x - 3 + d, base, x, tip, teeth) end
        G.px(x - 1, base - side * 2, P[3])
      end
    end
    if f == 2 then for k = 0, 2 do G.px(18 + k * 14, 32 + rr(-2, 2), P[1]) end end
    if f == 3 then glow(G, 32, 32, 12, P); GEN.estrella(G, 2, P, { r = 20, rays = 10 }) end
  else
    local g = f - 3
    if g <= 2 then G.ring(32, 32, 10 + g * 6, g == 1 and P[2] or P[3], 2) end
    spray(G, g, P, 12, 6, 0.6, 41, 2.4)
    -- las marcas de los dientes
    for k = -2, 2 do
      local c = g >= 3 and P[3] or P[2]
      G.disc(32 + k * (w / 5), 28, 1.3, c); G.disc(32 + k * (w / 5), 36, 1.3, c)
    end
  end
  if o.extra then o.extra(G, f, P) end
end

-- zarpazo: o.n garras que barren con la punta brillante y una estela que se apaga
function GEN.zarpazo8(G, f, P, o)
  local n, ang, r = o.n or 3, o.ang or 30, o.r or 22
  local gap = o.gap or 7
  local p = clamp(f / 3, 0, 1)
  for k = 0, n - 1 do
    local off = (k - (n - 1) / 2) * gap
    local cx = 32 + off * math.cos(math.rad(ang + 90))
    local cy = 32 + off * math.sin(math.rad(ang + 90))
    local a0 = ang + 200
    local span = 140
    if f <= 3 then
      local a1 = a0 + span * p
      -- estela: cola oscura, cuerpo medio, punta brillante
      G.arc(cx, cy, r, a0, a0 + (a1 - a0) * 0.4, P[3], o.w or 2)
      G.arc(cx, cy, r, a0 + (a1 - a0) * 0.4, a1, P[2], (o.w or 2) + 1)
      G.arc(cx, cy, r, a1 - 14, a1, P[1], (o.w or 2) + 2)
      if f == 0 then G.disc(cx + math.cos(math.rad(a0)) * r, cy + math.sin(math.rad(a0)) * r, 2, P[1]) end
    else
      local g = f - 4
      local c = g >= 2 and P[3] or P[2]
      local drift = g * 1.5
      G.arc(cx + drift, cy + drift, r, a0 + 30 + g * 20, a0 + span, c, g == 0 and 3 or 1)
    end
  end
  if f == 3 or f == 4 then GEN.estrella(G, f == 3 and 2 or 4, P, { r = 18, rays = 8 }) end
  if f >= 4 then spray(G, f - 3, P, 8, 5, 0.3, 17, 1.8) end
  if o.drops and f >= 3 then for i = 1, 5 do G.disc(20 + i * 5, 36 + (f - 3) * 4 + (i % 2) * 3, f >= 6 and 1 or 1.6, o.drops) end end
end

-- estocada: una lanza, un aguijón o una aguja al rojo que entra desde la izquierda y revienta
function GEN.estocada8(G, f, P, o)
  local tipX = ({ 10, 26, 46, 48, 48, 48, 48, 48 })[f + 1]
  if f <= 3 then
    local tail = math.max(0, tipX - 40)
    G.line(tail, 32, tipX - 6, 32, P[3], 4); G.line(tail + 4, 32, tipX - 6, 32, P[2], 2)
    G.line(tipX - 8, 28, tipX, 32, P[1], 2); G.line(tipX - 8, 36, tipX, 32, P[1], 2)
    for k = 0, 2 do G.line(tail - 4 - k * 6, 30 + k * 2, tail - k * 6, 30 + k * 2, P[3]) end
  end
  if f >= 2 then
    local g = f - 2
    if g <= 2 then glow(G, 46, 32, 8 - g * 2, P) end
    GEN.estrella(G, math.min(5, g + 1), P, { r = 16, rays = 8 })
    if o.chispas and g <= 3 then
      for i = 0, 2 do local a = math.rad(i * 120 + g * 40); local x, y = 46, 32
        for k = 1, 3 do local nx, ny = 46 + math.cos(a) * k * 6 + (k % 2) * 3, 32 + math.sin(a) * k * 6; G.line(x, y, nx, ny, P[4] or P[1]); x, y = nx, ny end end
    end
    if o.drops then for i = 1, 6 do G.disc(40 + (i % 3) * 5, 34 + g * 3 + (i % 2) * 3, g >= 4 and 1 or 1.8, o.drops) end end
  end
end

-- golpe pesado: destello, onda de choque, estallido grande, escombros que caen y polvo
function GEN.golpe8(G, f, P, o)
  if f == 0 then glow(G, 32, 32, 6, P) end
  if f >= 1 and f <= 3 then
    local r = ({ 14, 24, 26 })[f]
    GEN.estrella(G, f == 3 and 3 or 2, P, { r = r, rays = o.rays or 12 })
    if f <= 2 then glow(G, 32, 32, 10 - f, P) end
  end
  if f >= 1 then G.ring(32, 32, 8 + f * 3.5, f >= 5 and P[3] or P[2], f >= 4 and 1 or 2) end
  if f >= 3 then spray(G, f - 2, P, 10, 5, 0.9, 23, 2.6) end
  if f >= 5 then srand(77); for i = 1, 5 do G.disc(20 + i * 5 + rr(-2, 2), 52 - (f - 5) * 2, 3 - (f - 5) * 0.6, P[3]) end end
end

-- remolino de un objetivo: el torbellino se cierra sobre él, revienta y se deshace
function GEN.remolino8(G, f, P, o)
  if f <= 4 then
    local shrink = 1 - f * 0.12
    for k = 0, 2 do
      local r0 = (8 + k * 8) * shrink
      G.arc(32, 32, r0, f * 70 + k * 120, f * 70 + k * 120 + 240, k == 0 and P[1] or P[2], 2)
      G.arc(32, 32, r0 + 2, f * 70 + k * 120 + 180, f * 70 + k * 120 + 240, P[3], 1)
    end
    if o.copos then srand(f + 2); for i = 1, 12 do local a = rr(0, 6.28); local d = rr(6, 26) * shrink; G.disc(32 + math.cos(a + f) * d, 32 + math.sin(a + f) * d, 1, P[1]) end end
  else
    local g = f - 5
    GEN.estrella(G, g + 2, P, { r = 18 + g * 2, rays = 10 })
    spray(G, g + 1, P, 10, 6, 0.2, 31, 2)
  end
end

-- maldición: el círculo de runas se dibuja, gira, aparece la calavera y se cierra sobre el objetivo
function GEN.sello8(G, f, P, o)
  local r = ({ 10, 16, 20, 22, 22, 14, 6, 4 })[f + 1]
  local span = math.min(360, 140 + f * 110)
  G.arc(32, 32, r, -90, -90 + span, P[2], 2)
  if r > 8 then G.ring(32, 32, r - 5, P[3]) end
  for i = 0, 5 do
    if i * 60 <= span then
      local a = math.rad(i * 60 + f * 22 - 90)
      local x, y = 32 + math.cos(a) * (r - 2.5), 32 + math.sin(a) * (r - 2.5)
      G.rect(x - 1, y - 1, x + 1, y + 1, P[1])
    end
  end
  if f >= 3 and f <= 5 then
    G.disc(32, 30, 6, P[1]); G.rect(29, 34, 35, 37, P[1]); G.disc(30, 30, 1.5, P[3]); G.disc(34, 30, 1.5, P[3]); G.px(32, 33, P[3])
    if f == 4 then glow(G, 32, 31, 4, P) end
  end
  if f >= 6 then GEN.estrella(G, f - 3, P, { r = 12, rays = 6 }) end
end

-- proyectil de 8 cuadros: 0-1 vuela (con halo y estela), 2-7 el impacto (o.impacto)
function GEN.proyectil8(G, f, P, o)
  if f <= 1 then
    -- halo detrás de lo que vuela
    local forma = o.forma or 'orbe'
    if forma == 'orbe' or forma == 'sigilo' then G.disc(34, 32, 12, P[3]) end
    GEN.proyectil(G, f, P, o)
    srand(f + 61)
    for i = 1, 6 do G.px(rr(0, 24), 32 + rr(-6, 6), i % 2 == 0 and P[2] or (P[4] or P[1])) end
    return
  end
  local g = f - 2
  local imp = o.impacto or 'estrella'
  if g <= 1 then glow(G, 32, 32, 12 - g * 3, P) end
  if imp == 'salpicadura' then
    spray(G, g, P, 14, 6, 0.9, 13, 2.8)
    if g <= 2 then G.ring(32, 32, 8 + g * 6, P[2], 2) end
  elseif imp == 'explosion' then
    GEN.explosion(G, g, P, { r = o.r or 22, sd = 3 })
  elseif imp == 'escarcha' then
    for i = 0, 5 do
      local a = math.rad(i * 60 + 15)
      local d = g <= 3 and (6 + g * 5) or (21 + (g - 3) * 4)
      local c = g >= 4 and P[3] or P[1]
      if g <= 3 then G.line(32, 32, 32 + math.cos(a) * d, 32 + math.sin(a) * d, c, 2); G.line(32 + math.cos(a) * d * 0.6, 32 + math.sin(a) * d * 0.6, 32 + math.cos(a + 0.5) * d * 0.8, 32 + math.sin(a + 0.5) * d * 0.8, P[2])
      else G.line(32 + math.cos(a) * (d - 6), 32 + math.sin(a) * (d - 6), 32 + math.cos(a) * d, 32 + math.sin(a) * d, c, 2) end
    end
  elseif imp == 'sigilo' then
    G.ring(32, 32, 8 + g * 3.5, g >= 4 and P[3] or P[2], 2); G.ring(32, 32, math.max(2, 12 - g * 2), P[1])
    for i = 0, 5 do local a = math.rad(i * 60 + g * 25); local d = 6 + g * 4; G.disc(32 + math.cos(a) * d, 32 + math.sin(a) * d, g >= 4 and 1 or 1.6, P[1]) end
  else
    GEN.estrella(G, math.min(5, g + 1), P, { r = o.r or 18, rays = o.rays })
    if g >= 1 then G.ring(32, 32, 10 + g * 4, g >= 4 and P[3] or P[2], g >= 3 and 1 or 2) end
    if g >= 2 then spray(G, g - 1, P, 8, 5, 0.4, 19, 1.8) end
  end
end

-- =====================================================================================
-- Paletas
-- =====================================================================================
local PAL = {
  sangre = { hex("ffd0c8"), hex("e04040"), hex("7a1820"), hex("ff8a7a") },
  blanco = { hex("ffffff"), hex("c8d0e0"), hex("6a7488"), hex("fff4c0") },
  fuego = { hex("fff4b0"), hex("ff8a24"), hex("a8281a"), hex("ffd040") },
  magma = { hex("ffe08a"), hex("e0501a"), hex("5a1a14"), hex("2a1410") },
  hielo = { hex("ffffff"), hex("8ad8ff"), hex("3a78b8"), hex("d8f4ff") },
  nieve = { hex("ffffff"), hex("d8e4f0"), hex("8a9ab0"), hex("b0c4d8") },
  rayo = { hex("ffffff"), hex("ffe040"), hex("b08a1a"), hex("9ae8ff") },
  rayoazul = { hex("ffffff"), hex("9ae8ff"), hex("3a7ab8"), hex("fff7a0") },
  agua = { hex("e8fbff"), hex("4ab4e0"), hex("1c5a8a"), hex("a8eaf8") },
  marea = { hex("d8f6ee"), hex("3a9cc0"), hex("123c5e"), hex("8ad8d0") },
  tinta = { hex("6a5a78"), hex("2a2230"), hex("141018"), hex("4a3a58") },
  oscuro = { hex("e0b0ff"), hex("8a4ad8"), hex("3a1a68"), hex("c890ff") },
  sombra = { hex("c8a0e8"), hex("5a3a7a"), hex("221430"), hex("8a6aa8") },
  luz = { hex("ffffff"), hex("fff2a0"), hex("c8a040"), hex("ffe0f0") },
  veneno = { hex("e0ffb0"), hex("7be05a"), hex("2e7a2a"), hex("b8f080") },
  infecto = { hex("e8f0a0"), hex("98a040"), hex("4a5a1a"), hex("6a3a2a") },
  azufre = { hex("fff8b0"), hex("e8d040"), hex("8a7a1a"), hex("c8b830") },
  tierra = { hex("e8c890"), hex("a8784a"), hex("5a3e24"), hex("c8a070") },
  piedra = { hex("d8d4cc"), hex("8a8680"), hex("4a4644"), hex("b0aca4") },
  coral = { hex("ffe8e0"), hex("f27a72"), hex("8a3040"), hex("fff4ea") },
  madera = { hex("e8c090"), hex("9a6a42"), hex("4e3220"), hex("c89060") },
  hueso = { hex("fffaf0"), hex("e0d8c0"), hex("8a8270"), hex("c8bea8") },
  verdevida = { hex("e0ffe8"), hex("6ae08a"), hex("2a7a4a"), hex("b8ffcc") },
  furia = { hex("fff0d0"), hex("ff6a3a"), hex("8a2a1a"), hex("ffd040") },
  vapor = { hex("ffffff"), hex("d8e0e4"), hex("8a969c"), hex("ffd0a0") },
  morado = { hex("ffe0ff"), hex("d070e0"), hex("6a2a78"), hex("ffb0f0") },
  vidrio = { hex("ffffff"), hex("a8b8d0"), hex("3a3a50"), hex("e0e8ff") },
  ancla = { hex("e0e4ea"), hex("8a929c"), hex("3a3e48"), hex("4ab4e0") },
  polvo = { hex("f0e0c0"), hex("c8a878"), hex("7a6040"), hex("ffffff") },
  aurora = { hex("e0fff0"), hex("7af0b8"), hex("6a3ab8"), hex("b884ff") },
}

-- =====================================================================================
-- Las 92 habilidades: código, modo, mezcla (add = brilla; normal = tapa), generador, paleta, opciones
-- =====================================================================================
local HAB = {}
local function H(code, modo, mezcla, gen, pal, o) HAB[#HAB + 1] = { code = code, modo = modo, mezcla = mezcla, gen = gen, pal = PAL[pal], o = o or {} } end

-- golpes y mordidas
H("ABRAZO_AHOGADO", "golpe", "add", "remolino8", "marea", {})
H("BOTELLA_ROTA", "golpe", "add", "esquirlas", "vidrio", { n = 6, len = 4, sd = 4 })
H("CORNADA", "golpe", "add", "zarpazo8", "polvo", { n = 2, ang = -20, r = 22, gap = 10, w = 3, pesado = true })
H("EMBESTIDA", "golpe", "add", "golpe8", "polvo", { rays = 10, pesado = true })
H("FRENESI", "golpe", "add", "mordida8", "sangre", { w = 16, extra = function(G, f, P) if f >= 4 then for k = 0, 1 do local x = 20 + k * 24; GEN.estrella(G, math.min(5, f - 3), P, { r = 7, rot = 22 + k * 30 }) end end end })
H("GIRO_MORTAL", "golpe", "add", "remolino8", "sangre", {})
H("GOLPE_BAJO", "golpe", "add", "zarpazo8", "blanco", { n = 1, ang = 150, r = 22, w = 3 })
H("GOLPE_BRUTAL", "golpe", "add", "golpe8", "furia", { rays = 12, pesado = true })
H("GOLPE_INFERNAL", "golpe", "add", "zarpazo8", "fuego", { n = 1, ang = 40, r = 24, w = 4, drops = hex("ff8a24"), pesado = true })
H("GOLPE_PICO", "golpe", "add", "esquirlas", "piedra", { n = 8, len = 3, sd = 12 })
H("LANZAZO", "golpe", "add", "estocada8", "rayo", { chispas = true })
H("MORDIDA_ARDIENTE", "golpe", "add", "mordida8", "fuego", { teeth = hex("fff4b0") })
H("MORDIDA_DESGARRADORA", "golpe", "add", "mordida8", "sangre", {})
H("MORDIDA_HELADA", "golpe", "add", "mordida8", "hielo", { teeth = hex("ffffff") })
H("MORDISCO_INFECTO", "golpe", "add", "mordida8", "infecto", { w = 16 })
H("PICADURA_VENENOSA", "golpe", "add", "estocada8", "veneno", { drops = hex("7be05a") })
H("PINCHAZO", "golpe", "add", "estocada8", "fuego", { drops = hex("ff8a24") })
H("PUNO_LAVA", "golpe", "add", "golpe8", "magma", { rays = 10, pesado = true })
H("TENAZA", "golpe", "add", "mordida8", "coral", { w = 26, teeth = hex("ffe8e0"), pinza = true })
H("TENTACULOS", "golpe", "add", "zarpazo8", "morado", { n = 2, ang = 60, r = 20, gap = 9, w = 3 })
H("ZARPAZO", "golpe", "add", "zarpazo8", "sangre", { n = 3 })
-- lo que vuela del monstruo al objetivo
H("CADENA_RAYO", "proyectil", "add", "proyectil8", "rayoazul", { forma = "rayo", impacto = "estrella", rays = 6 })
H("CHORRO_VAPOR", "proyectil", "add", "proyectil8", "vapor", { forma = "chorro", impacto = "salpicadura" })
H("ESCUPITAJO_IGNEO", "proyectil", "add", "proyectil8", "magma", { forma = "orbe", impacto = "salpicadura" })
H("LANZA_AGUA", "proyectil", "add", "proyectil8", "agua", { forma = "lanza", impacto = "salpicadura" })
H("LENGUA_PEGAJOSA", "proyectil", "normal", "proyectil8", "morado", { forma = "lengua", impacto = "salpicadura" })
H("LLAMARADA", "proyectil", "add", "proyectil8", "fuego", { forma = "orbe", impacto = "explosion", r = 18 })
H("PICADO", "proyectil", "add", "proyectil8", "blanco", { forma = "picada", impacto = "estrella" })
H("PICOTAZO", "proyectil", "add", "proyectil8", "polvo", { forma = "picada", impacto = "estrella", r = 12 })
H("PIEDRAZO", "proyectil", "normal", "proyectil8", "piedra", { forma = "piedra", impacto = "estrella" })
H("PIEDRAZO_AZUFRE", "proyectil", "add", "proyectil8", "azufre", { forma = "piedra", impacto = "explosion", r = 16 })
H("PISTOLON", "proyectil", "add", "proyectil8", "fuego", { forma = "bala", impacto = "estrella", r = 10 })
H("RAYO_LUZ", "proyectil", "add", "proyectil8", "luz", { forma = "haz", impacto = "estrella", rays = 12 })
H("RAYO_OSCURO", "proyectil", "add", "proyectil8", "oscuro", { forma = "orbe", impacto = "sigilo" })
H("REZO_ABISAL", "proyectil", "add", "proyectil8", "marea", { forma = "sigilo", impacto = "sigilo" })
H("REZO_OSCURO", "proyectil", "add", "proyectil8", "oscuro", { forma = "sigilo", impacto = "sigilo" })
H("TOQUE_GELIDO", "proyectil", "add", "proyectil8", "hielo", { forma = "esquirla", impacto = "escarcha" })
H("TOQUE_URTICANTE", "proyectil", "add", "proyectil8", "rayoazul", { forma = "rayo", impacto = "salpicadura" })
H("TORRENTE_AGUA", "proyectil", "add", "proyectil8", "agua", { forma = "haz", impacto = "salpicadura" })
H("VENTISCA", "golpe", "add", "remolino8", "nieve", { copos = true })
-- de área: sobre cada objetivo, uno detrás del otro
H("ALIENTO_BRASA", "area", "add", "nube", "fuego", { sd = 21, sube = 2 })
H("ALIENTO_HELADO", "area", "add", "nube", "hielo", { sd = 22, sube = 1 })
H("ANCLA_GIRATORIA", "area", "add", "remolino", "ancla", {})
H("ANDANADA", "area", "add", "explosion", "fuego", { r = 22, sd = 7 })
H("ASTILLAS", "area", "add", "esquirlas", "madera", { n = 9, len = 5, sd = 31 })
H("AVALANCHA", "area", "add", "esquirlas", "nieve", { n = 8, len = 4, sd = 32 })
H("BOTELLA_INCENDIARIA", "area", "add", "explosion", "fuego", { r = 18, sd = 11 })
H("CADENA_FUEGO", "area", "add", "rayo_cae", "fuego", {})
H("CANTO_HECHIZANTE", "area", "add", "anillos", "morado", { simbolo = function(G, f, P)
  for i = 0, 2 do local x, y = 18 + i * 13, 26 - f * 3 + (i % 2) * 6; G.disc(x, y + 6, 2.5, P[1]); G.line(x + 2, y + 6, x + 2, y - 2, P[1]); G.line(x + 2, y - 2, x + 6, y, P[1]) end end })
H("CHILLIDO", "area", "add", "anillos", "blanco", {})
H("CHORRO_TINTA", "area", "normal", "nube", "tinta", { sd = 23, gotas = true, sube = 0.5 })
H("COLETAZO_OLA", "area", "add", "ola", "agua", { alto = 0.8, sd = 2 })
H("CORAL_CORTANTE", "area", "add", "esquirlas", "coral", { n = 8, len = 5, sd = 33 })
H("DESCARGA", "area", "add", "rayo_cae", "rayo", {})
H("DESCARGA_MEDUSA", "area", "add", "rayo_cae", "morado", {})
H("ERUPCION_CALDERA", "area", "add", "geiser", "magma", { sd = 4 })
H("EXPLOSION_OSCURA", "area", "add", "explosion", "oscuro", { r = 24, sd = 13 })
H("MAELSTROM", "area", "add", "remolino", "agua", {})
H("MAREA_NEGRA", "area", "normal", "ola", "tinta", { alto = 0.9, sd = 5 })
H("MAREMOTO", "area", "add", "ola", "marea", { alto = 1.2, sd = 6 })
H("NUBE_SULFUROSA", "area", "add", "nube", "azufre", { sd = 24, sube = 1 })
H("OLA_MAGMA", "area", "add", "ola", "magma", { alto = 0.8, sd = 8 })
H("RISA_DIABLILLO", "area", "add", "anillos", "fuego", { simbolo = function(G, f, P)
  -- "¡ja!" que salta: una j y una a de píxeles
  local y = 22 - f * 2
  G.line(24, y, 24, y + 8, P[1], 2); G.arc(21, y + 8, 3, 0, 180, P[1], 2); G.disc(24, y - 3, 1, P[1])
  G.ring(33, y + 6, 3, P[1], 2); G.line(36, y + 3, 36, y + 9, P[1], 2)
  G.line(41, y, 41, y + 6, P[1], 2); G.disc(41, y + 9, 1, P[1]) end })
H("TERREMOTO", "area", "add", "geiser", "tierra", { sd = 9 })
-- sobre el propio monstruo
H("AULLIDO_GUERRA", "propio", "add", "anillos", "furia", { a0 = -60, a1 = 60 })
H("AULLIDO_MANADA", "propio", "add", "anillos", "luz", {})
H("CAPARAZON", "propio", "add", "escudo", "coral", { forma = "concha" })
H("CORAZA_MAGMA", "propio", "add", "escudo", "magma", { forma = "placas" })
H("ESCAMAS_ABISALES", "propio", "add", "escudo", "marea", { forma = "escamas" })
H("ESCUDO_HUESO", "propio", "add", "escudo", "hueso", { forma = "huesos" })
H("ESCUDO_TORMENTA", "propio", "add", "escudo", "rayoazul", { forma = "circulo", extra = function(G, f, P) if f >= 2 then for i = 0, 2 do local a = math.rad(i * 120 + f * 40); G.line(32 + math.cos(a) * 10, 32 + math.sin(a) * 10, 32 + math.cos(a) * 24, 32 + math.sin(a) * 24, P[1]) end end end })
H("PIEL_CORAL", "propio", "add", "escudo", "coral", { forma = "espinas" })
H("PIEL_PIEDRA", "propio", "normal", "escudo", "piedra", { forma = "placas" })
H("PIEL_VIDRIO", "propio", "add", "escudo", "vidrio", { forma = "hexagonos" })
H("REGENERACION", "propio", "add", "suben", "verdevida", { simbolo = "mas" })
-- la Tundra Eterna (zona 5)
H("ZAMBULLIDA", "golpe", "add", "golpe8", "agua", { rays = 10, pesado = true })
H("TRAMPA_OSO", "golpe", "normal", "mordida8", "ancla", { w = 22, teeth = hex("ffffff") })
H("ABRAZO_OSO", "golpe", "add", "zarpazo8", "nieve", { n = 4, w = 3, pesado = true })
H("TAJO_GLACIAL", "golpe", "add", "zarpazo8", "hielo", { n = 1, ang = 30, r = 26, w = 4, pesado = true })
H("MARTILLO_GLACIAL", "golpe", "add", "golpe8", "hielo", { rays = 12, pesado = true })
H("PICADO_SILENCIOSO", "proyectil", "add", "proyectil8", "nieve", { forma = "picada", impacto = "estrella" })
H("LANZA_HIELO", "proyectil", "add", "proyectil8", "hielo", { forma = "lanza", impacto = "escarcha" })
H("REZO_HELADO", "proyectil", "add", "proyectil8", "hielo", { forma = "sigilo", impacto = "sigilo" })
H("TRONO_CONGELADO", "golpe", "add", "sello8", "hielo", {})
H("LAMENTO_HELADO", "area", "add", "anillos", "hielo", {})
H("PISOTON", "area", "add", "geiser", "nieve", { sd = 14 })
H("AULLIDO_AURORA", "area", "add", "anillos", "aurora", {})
H("INVIERNO_ETERNO", "area", "add", "remolino", "hielo", {})
H("ARMADURA_ESCARCHA", "propio", "add", "escudo", "hielo", { forma = "placas" })
H("ESCUDO_HIELO", "propio", "add", "escudo", "hielo", { forma = "hexagonos" })

-- sobre un enemigo (sin daño) o un aliado
H("MALDICION_OSCURA", "golpe", "add", "sello8", "sombra", {})
H("RESURRECCION_SOMBRIA", "aliado", "add", "suben", "sombra", { sd = 7, extra = function(G, f, P) if f >= 2 then G.line(32, 52, 32, 52 - f * 8, P[1], 3) end end })

-- =====================================================================================
-- Lámina, .aseprite y json
-- =====================================================================================
local dir, png = app.params.dir, app.params.png
local COLS = NF * 2
local rows = math.ceil(#HAB / 2)
local sheet = Image(S * COLS, S * rows, ColorMode.RGB)
local spr = Sprite(S, S, ColorMode.RGB)
spr.layers[1].name = "efecto"
local meta = {}
local frameN = 0
for i, h in ipairs(HAB) do
  local slot = i - 1
  local from = frameN + 1
  local ocho = h.gen:sub(-1) == "8"
  for f = 0, NF - 1 do
    local G = newGrid()
    srand(i * 97 + f)
    GEN[h.gen](G, ocho and f or math.floor(f * (NF6 - 1) / (NF - 1) + 0.5), h.pal, h.o)
    local img = Image(S, S, ColorMode.RGB)
    for k, c in pairs(G.g) do img:drawPixel(k % S, k // S, c) end
    local idx = slot * NF + f
    sheet:drawImage(img, Point((idx % COLS) * S, (idx // COLS) * S))
    frameN = frameN + 1
    local fr = (frameN == 1) and spr.frames[1] or spr:newEmptyFrame(frameN)
    fr.duration = 0.07
    spr:newCel(spr.layers[1], fr, img, Point(0, 0))
  end
  local tag = spr:newTag(from, frameN); tag.name = h.code
  local c = h.pal[2]
  meta[#meta + 1] = string.format('"MONSTRUO_%s": { "i": %d, "modo": "%s", "mezcla": "%s", "color": "#%02x%02x%02x"%s }',
    h.code, slot, h.modo, h.mezcla, c.red, c.green, c.blue, h.o.pesado and ', "pesado": true' or '')
end
spr:saveAs(dir .. "/efectos/efectos_monstruos.aseprite")
spr:close()
local out = Sprite(sheet.width, sheet.height, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(png .. "/efectos.png")
out:close()
local fh = io.open(png .. "/efectos.json", "w")
fh:write(string.format('{ "cuadro": %d, "cuadros": %d, "columnas": %d, "habilidades": {\n  %s\n} }\n', S, NF, COLS, table.concat(meta, ",\n  ")))
fh:close()
