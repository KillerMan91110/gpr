-- Los rivales de las Pruebas de la Orden (gprback/docs/evoluciones_pruebas.md), en Aurelia:
--   recluta_cuartel    Recluta del Cuartel (Prueba del Aprendiz del Guerrero), 48x48
--   campeon_cuartel    Campeón del Cuartel (el duelo de la misma prueba), 48x48
--   golem_runas        Gólem de Runas (Prueba del Aprendiz del Mago), 48x48
--   sombra_nox         Sombra de Nox (Prueba del Aprendiz del Pícaro), 48x48
-- (la Sombra de tu héroe, la de la Ascensión, no tiene hoja propia: el combate dibuja a tu clase en negro)
-- Mismo estilo que crear_enemigos_ruinas.lua: se dibujan mirando a la derecha, contorno oscuro automático y
-- se voltean (en combate miran a los héroes, a la izquierda).
-- Salida en dir: enemigos/<clave>.png (tira horizontal), ordenes/<clave>.aseprite y enemigos_ordenes.json.
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_ordenes.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local C = {}
for k, v in pairs({
  K="141420", W="f0f4f8",
  -- el empedrado de Aurelia
  gr1="c8c0b0", gr2="a8a090", gr3="7e7868",
  -- piel
  sk1="f0c8a0", sk2="d0a07a", sk3="9a6e4e",
  -- acero del Cuartel y su tabardo rojo
  m1="e4ecf4", m2="a8b4c8", m3="6a7488", m4="444c5c",
  rd1="e04a4a", rd2="a8283a", rd3="6a1824", go1="ffe08a", go2="c89a2a",
  -- cuero y madera de los reclutas
  le1="c89060", le2="9a6438", le3="5e3a1c", wd1="d0a068", wd2="8a5a30",
  -- piedra del gólem y sus runas (brillan)
  st1="b8b4c0", st2="8a8694", st3="5e5a68", st4="3c3a44", ru1="cdf0ff", ru2="6ac8ff", ru3="2a7ad0",
  -- la sombra de Nox: tela morada oscura y su brillo
  sh1="6a4a8a", sh2="432456", sh3="2a1638", sh4="180c22", ev1="e2a6ff", ev2="a060e8",
}) do C[k] = hex(v) end
-- colores que brillan: no reciben contorno a su alrededor
local GLOW = {K=true, ru1=true, ru2=true, ev1=true, go1=true}

local function newGrid(W, H, ground)
  ground = ground or H - 1
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x>=0 and x<W and y>=0 and y<H and y<=ground then g[y*W+x] = c end
  end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end
  end
  function G.thick(x0,y0,x1,y1,w,c)
    local vertical = math.abs(y1-y0) >= math.abs(x1-x0)
    for k=0,w-1 do
      local o = k - (w-1)//2
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

-- contorno oscuro + volteo horizontal
local function toImage(G)
  local W, H, g, out = G.w, G.h, G.g, {}
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
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(W - 1 - (k % W), k // W, C[c]) end
  return img
end

local function eye(G, x, y, c, pain)
  if pain then G.px(x, y, "K"); G.px(x+1, y, "K") else G.px(x, y, c) end
end
local function floor(G, x0, x1, y) G.rect(x0, y, x1, y, "gr3"); G.rect(x0 + 2, y - 1, x1 - 2, y - 1, "gr2") end

-- piernas que caminan (k: fase)
local function legs(G, dx, b, k, c1, c2)
  G.rect(17+dx-k, 32+b, 21+dx-k, 43, c1); G.rect(25+dx+k, 32+b, 29+dx+k, 43, c1)
  G.rect(16+dx-k, 42, 22+dx-k, 44, c2); G.rect(24+dx+k, 42, 30+dx+k, 44, c2)
end

-- =====================================================================================
-- Recluta del Cuartel (48x48): chaqueta de cuero, casco de hierro chico y espada de madera
-- =====================================================================================
local function recluta(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 6, 42, 45)
  if P.dead then G.rect(8, 40, 36, 43, "le2"); G.ellipse(38, 41, 4, 3, "m3"); G.line(10, 44, 22, 38, "wd2"); return G end
  local k = P.phase or 0
  legs(G, dx, b, k, "le3", "le3")
  -- torso: chaqueta de cuero con el escudo rojo del Cuartel
  G.rect(15+dx, 17+b, 31+dx, 32+b, "le2"); G.rect(15+dx, 17+b, 18+dx, 32+b, "le1"); G.rect(29+dx, 17+b, 31+dx, 32+b, "le3")
  G.rect(21+dx, 22+b, 25+dx, 27+b, "rd2"); G.px(23+dx, 24+b, "go1"); G.rect(15+dx, 30+b, 31+dx, 31+b, "le3")
  -- cabeza con casco de hierro chico
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 11+hy, 6, 6, "sk1"); G.rect(26+hx, 11+hy, 29+hx, 15+hy, "sk2")
  G.ellipse(24+hx, 8+hy, 7, 4, "m3"); G.rect(17+hx, 8+hy, 31+hx, 9+hy, "m2")
  eye(G, 27+hx, 12+hy, "K", P.pain)
  -- espada de madera (golpe) y el brazo
  if P.swing then G.thick(30+dx, 20+b, 45+dx, 14+b, 3, "wd1"); G.rect(28+dx, 19+b, 32+dx, 23+b, "sk2")
  else G.thick(34+dx, 8+b, 34+dx, 28+b, 3, "wd1"); G.rect(32+dx, 26+b, 36+dx, 28+b, "wd2"); G.ellipse(34+dx, 25+b, 2, 2, "sk2") end
  G.rect(11+dx, 19+b, 15+dx, 30+b, "le2")
  return G
end

-- =====================================================================================
-- Campeón del Cuartel (48x48): armadura completa de acero, tabardo rojo, capa y mandoble
-- =====================================================================================
local function campeon(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then G.rect(6, 39, 38, 43, "m3"); G.rect(10, 38, 30, 40, "rd2"); G.thick(30, 44, 46, 36, 3, "m2"); return G end
  local k = P.phase or 0
  -- capa roja detrás
  G.rect(11+dx, 15+b, 17+dx, 40+b, "rd3"); G.rect(11+dx, 15+b, 13+dx, 40+b, "rd2")
  legs(G, dx, b, k, "m3", "m4")
  -- peto de acero con tabardo
  G.rect(15+dx, 15+b, 33+dx, 32+b, "m2"); G.rect(15+dx, 15+b, 18+dx, 32+b, "m1"); G.rect(30+dx, 15+b, 33+dx, 32+b, "m3")
  G.rect(21+dx, 18+b, 27+dx, 34+b, "rd1"); G.rect(21+dx, 18+b, 22+dx, 34+b, "rd2")
  G.line(24+dx, 21+b, 24+dx, 29+b, "go1"); G.line(22+dx, 24+b, 26+dx, 24+b, "go1")
  G.ellipse(14+dx, 16+b, 4, 3, "m1"); G.ellipse(34+dx, 16+b, 4, 3, "m2")
  -- yelmo con cresta roja
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 9+hy, 7, 7, "m2"); G.rect(17+hx, 9+hy, 31+hx, 14+hy, "m2"); G.rect(28+hx, 9+hy, 31+hx, 14+hy, "m3")
  G.rect(24+hx, 10+hy, 31+hx, 11+hy, "K"); eye(G, 28+hx, 10+hy, "go1", P.pain)
  for i=0,6 do G.px(20+hx+i, 1+hy - (i % 2), "rd1"); G.px(20+hx+i, 2+hy, "rd2") end
  -- el mandoble (golpe en arco) y las manos
  if P.swing then
    G.thick(30+dx, 22+b, 47+dx, 6+b, 3, "m1"); G.line(31+dx, 23+b, 47+dx, 7+b, "m3"); G.rect(28+dx, 21+b, 33+dx, 26+b, "go2")
  else
    G.thick(37+dx, 0+b, 37+dx, 28+b, 3, "m1"); G.line(38+dx, 0+b, 38+dx, 27+b, "m3"); G.rect(33+dx, 27+b, 41+dx, 29+b, "go2"); G.rect(36+dx, 30+b, 38+dx, 34+b, "le2")
  end
  if P.shell then for a=0,359,30 do G.px(24+dx + math.cos(math.rad(a)) * 20, 24+b + math.sin(math.rad(a)) * 18, "go1") end end
  return G
end

-- =====================================================================================
-- Gólem de Runas (48x48): bloques de piedra de la Torre Arcana unidos por runas azules
-- =====================================================================================
local function rune(G, x, y, c) G.line(x, y, x + 2, y + 2, c or "ru2"); G.line(x + 2, y, x, y + 2, c or "ru2"); G.px(x + 1, y + 1, "ru1") end
local function golem(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  floor(G, 4, 44, 45)
  if P.dead then for _,p in ipairs({{6,38,9,6},{18,40,11,5},{32,38,8,7}}) do G.rect(p[1], p[2], p[1] + p[3], p[2] + p[4], "st2") end; G.px(22,41,"ru3"); return G end
  local k = P.phase or 0
  G.rect(13+dx-k, 34+b, 20+dx-k, 44, "st3"); G.rect(27+dx+k, 34+b, 34+dx+k, 44, "st3")
  -- torso: tres bloques separados por la luz de las runas
  G.rect(11+dx, 14+b, 36+dx, 22+b, "st2"); G.rect(11+dx, 14+b, 36+dx, 15+b, "st1")
  G.rect(13+dx, 24+b, 34+dx, 33+b, "st2"); G.rect(13+dx, 24+b, 15+dx, 33+b, "st1"); G.rect(32+dx, 24+b, 34+dx, 33+b, "st3")
  G.line(11+dx, 23+b, 36+dx, 23+b, P.cast and "ru1" or "ru3")
  rune(G, 16+dx, 17+b); rune(G, 27+dx, 17+b); rune(G, 22+dx, 27+b, P.cast and "ru1" or "ru2")
  -- cabeza: un bloque con un ojo de runa
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.rect(17+hx, 4+hy, 31+hx, 13+hy, "st1"); G.rect(28+hx, 4+hy, 31+hx, 13+hy, "st2")
  G.rect(23+hx, 8+hy, 29+hx, 9+hy, P.pain and "K" or "ru2"); G.px(26+hx, 8+hy, "ru1")
  -- brazos de bloques
  G.rect(4+dx, 15+b, 10+dx, 30+b, "st2"); G.rect(3+dx, 29+b, 11+dx, 36+b, "st1"); rune(G, 5+dx, 20+b)
  if P.swing then G.rect(36+dx, 14+b, 47+dx, 21+b, "st2"); G.rect(41+dx, 12+b, 47+dx, 24+b, "st1"); G.px(44+dx, 18+b, "ru1")
  else G.rect(37+dx, 15+b, 43+dx, 30+b, "st2"); G.rect(36+dx, 29+b, 44+dx, 36+b, "st1") end
  if P.cast then for a=0,359,24 do G.px(24+dx + math.cos(math.rad(a)) * 21, 24+b + math.sin(math.rad(a)) * 19, "ru2") end end
  if P.shell then for _,p in ipairs({{3,6},{40,6},{2,40}}) do G.rect(p[1]+dx, p[2]+b, p[1]+dx+4, p[2]+b+4, "st1"); rune(G, p[1]+dx+1, p[2]+b+1) end end
  return G
end

-- =====================================================================================
-- Sombra de Nox (48x48): una figura encapuchada de tela morada, con dos dagas que brillan
-- =====================================================================================
local function sombraNox(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  G.ellipse(24, 45, 14, 2, "sh4")
  if P.dead then G.ellipse(24,42,14,3,"sh3"); G.ellipse(20,40,6,3,"sh2"); G.px(30,41,"ev2"); return G end
  local ph = P.phase or 0
  -- capa que se deshace en jirones abajo
  for y=14,43 do
    local half = 5 + math.floor((y - 14) * 0.35)
    local o = math.floor(math.sin(y / 3 + ph) * 1.5)
    if y < 40 or (y + ph) % 2 == 0 then G.rect(23+dx-half+o, y+b, 23+dx+half+o, y+b, (y // 4) % 2 == 0 and "sh2" or "sh3") end
  end
  G.line(20+dx, 18+b, 18+dx, 38+b, "sh1"); G.rect(19+dx, 28+b, 29+dx, 29+b, "sh4")
  -- capucha con la cara en sombra y dos ojos
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(24+hx, 10+hy, 8, 8, "sh2"); G.ellipse(26+hx, 11+hy, 5, 5, "sh4"); G.line(17+hx, 6+hy, 22+hx, 2+hy, "sh1")
  eye(G, 26+hx, 11+hy, "ev1", P.pain); eye(G, 29+hx, 11+hy, "ev1", P.pain)
  -- dagas: la del golpe adelante, la otra atrás
  if P.swing then G.thick(30+dx, 22+b, 45+dx, 18+b, 2, "m1"); G.px(45+dx, 18+b, "ev1"); G.rect(28+dx, 21+b, 31+dx, 24+b, "sh1")
  else G.thick(33+dx, 22+b, 38+dx, 32+b, 2, "m1"); G.rect(31+dx, 20+b, 34+dx, 23+b, "sh1") end
  G.thick(14+dx, 22+b, 9+dx, 32+b, 2, "m2"); G.px(9+dx, 32+b, "ev2")
  if P.cast then for i=0,5 do G.px(8+dx + i * 7, 6+b + (i % 2) * 4, "ev2"); G.px(9+dx + i * 7, 7+b + (i % 2) * 4, "ev1") end end
  return G
end

-- =====================================================================================
-- animaciones (idle 2, attack 3, cast 3, hurt 1, die 2)
-- =====================================================================================
local function walker(hit)
  return {
    {"idle",   {{bob=0,phase=0,dur=460},{bob=1,phase=1,dur=460}}},
    {"attack", {{bob=-1,hx=-2,dur=220},{dx=4,[hit]=true,phase=1,dur=160},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-1,hy=-1,dur=220},{cast=true,phase=0,dur=320},{cast=true,phase=1,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }
end
local function floater(hit)
  return {
    {"idle",   {{bob=0,phase=0,dur=420},{bob=-2,phase=2,dur=420}}},
    {"attack", {{bob=-2,hx=-2,phase=1,dur=220},{dx=4,[hit]=true,phase=2,dur=170},{dx=1,phase=0,dur=240}}},
    {"cast",   {{bob=-2,phase=1,dur=220},{cast=true,phase=2,dur=320},{cast=true,phase=3,dur=240}}},
    {"hurt",   {{dx=-3,pain=true,phase=1,dur=260}}},
    {"die",    {{bob=2,pain=true,dur=240},{dead=true,dur=1100}}},
  }
end
local MONSTERS = {
  {key="recluta_cuartel", size=48, draw=recluta, anims=walker("swing")},
  {key="campeon_cuartel", size=48, draw=campeon, anims=walker("swing")},
  {key="golem_runas", size=48, draw=golem, anims=walker("swing")},
  {key="sombra_nox", size=48, draw=sombraNox, anims=floater("swing")},
}

local dir = app.params.dir
local solo = app.params.solo
local manifest = {}
for _,m in ipairs(MONSTERS) do
  if not solo or solo:find(m.key, 1, true) then
    local images, entry, f = {}, {}, 0
    local spr = Sprite(m.size, m.size, ColorMode.RGB)
    spr.layers[1].name = "cuerpo"
    for _,a in ipairs(m.anims) do
      local name, poses = a[1], a[2]
      local from = f + 1
      local idx, durs = {}, {}
      for _,P in ipairs(poses) do
        f = f + 1
        local img = toImage(m.draw(P))
        images[#images+1] = img
        local frame = (f == 1) and spr.frames[1] or spr:newEmptyFrame(f)
        frame.duration = P.dur / 1000
        spr:newCel(spr.layers[1], frame, img, Point(0,0))
        idx[#idx+1] = f - 1; durs[#durs+1] = P.dur
      end
      local tag = spr:newTag(from, f); tag.name = name
      entry[#entry+1] = string.format('"%s": { "frames": [%s], "durations": [%s], "loop": %s }',
        name, table.concat(idx, ", "), table.concat(durs, ", "), name == "idle" and "true" or "false")
    end
    spr:saveAs(dir .. "/ordenes/" .. m.key .. ".aseprite")
    spr:close()
    local sheet = Image(m.size * #images, m.size, ColorMode.RGB)
    for i, img in ipairs(images) do sheet:drawImage(img, Point((i - 1) * m.size, 0)) end
    local out = Sprite(m.size * #images, m.size, ColorMode.RGB)
    out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
    out:saveCopyAs(dir .. "/enemigos/" .. m.key .. ".png")
    out:close()
    manifest[#manifest+1] = string.format('"%s": { "size": %d, "animations": { %s } }', m.key:upper(), m.size, table.concat(entry, ", "))
  end
end
local fh = io.open(dir .. "/enemigos_ordenes.json", "w")
fh:write("{ " .. table.concat(manifest, ", ") .. " }")
fh:close()
