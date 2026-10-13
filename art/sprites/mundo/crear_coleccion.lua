-- Colección del cazador: jefe mítico (Aullaluna, 64x64), marcos de carta por rareza (40x56),
-- íconos de carta para la mochila (16x16), amuletos del bestiario (24x24) y la marca del jefe
-- mítico para el mapa (16x16).
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_coleccion.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},{"S","c8d0dc"},{"s","8a96a8"},{"d","555f70"},
  {"R","c0343a"},{"r","7a1f2a"},{"Y","e8c050"},{"y","a8802c"},{"Yh","fff0a0"},
  {"T","e8dcb8"},{"t","b8a880"},{"B","8a5530"},{"b","4f2e1c"},{"Bh","b07a48"},
  -- lobo espectral
  {"L","dfe8ff"},{"M","a8b8e8"},{"D","6a78b8"},{"Dd","3e4680"},{"Ey","7ff8ff"},{"Wi","c8f4ff"},{"Mo","fff4b0"},
  -- marcos de carta
  {"c1","d8a070"},{"c2","a8703c"},{"c3","6a4422"},
  {"s1","e8eef8"},{"s2","a8b4c8"},{"s3","6a7488"},
  {"g1","fff0a0"},{"g2","e0b040"},{"g3","9a7020"},
  {"v1","d8a8ff"},{"v2","9a5ad8"},{"v3","5a2a8a"},
  {"m1","e8fcff"},{"m2","8ad8f0"},{"m3","3a7aa8"},
  {"bg","1e2238"},{"bg2","2a3050"},{"bg3","353c62"},
  {"gr","e85a3a"},{"gb","6fc3ff"},{"gy","ffe070"},
  -- amuletos
  {"G1","8ad860"},{"G2","4f9a3a"},{"G3","2c5e20"},{"In","2a2a48"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

local function newGrid(W, H, ground)
  ground = ground or H - 1
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x>=0 and x<W and y>=0 and y<H and y<=ground then g[y*W+x] = c end
  end
  function G.get(x, y) return g[y*W+x] end
  function G.clear(x, y) g[y*W+x] = nil end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end
  end
  function G.thick(x0,y0,x1,y1,w,c)
    local vertical = math.abs(y1-y0) >= math.abs(x1-x0)
    for t=0,w-1 do
      local o = t - (w-1)//2
      if vertical then G.line(x0+o,y0,x1+o,y1,c) else G.line(x0,y0+o,x1,y1+o,c) end
    end
  end
  function G.ellipse(cx,cy,rx,ry,c)
    for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do
      local dx, dy = (x-cx)/rx, (y-cy)/ry
      if dx*dx + dy*dy <= 1 then G.px(x,y,c) end
    end end
  end
  function G.ridge(cx,cy,rx,ry,c,depth)
    for x=math.floor(cx-rx+1),math.ceil(cx+rx-1) do
      local t = (x-cx)/rx
      local top = cy - ry*math.sqrt(math.max(0, 1-t*t))
      for d=1,(depth or 1) do G.px(x, math.ceil(top)+d-1, c) end
    end
  end
  return G
end

-- contorno negro alrededor de lo dibujado; flip = mirar a la izquierda (monstruos en combate)
local function toImage(G, opts)
  opts = opts or {}
  local W, H, g, out = G.w, G.h, G.g, {}
  if opts.outline ~= false then
    for y=0,H-1 do for x=0,W-1 do
      if not g[y*W+x] then
        for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
          local nx, ny = x+o[1], y+o[2]
          local n = (nx>=0 and nx<W and ny>=0 and ny<H) and g[ny*W+nx]
          if n and n ~= "K" and n ~= "Wi" then out[y*W+x] = true break end
        end
      end
    end end
    for k in pairs(out) do g[k] = "K" end
  end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do
    local x = k % W
    img:drawPixel(opts.flip and (W - 1 - x) or x, k // W, C[c])
  end
  return img
end

local dir = app.params.dir

local function saveSheet(path, W, H, frames, durs, tags, opts)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = (durs and durs[i] or 150) / 1000
    spr:newCel(spr.layers[1], frame, toImage(G, opts), Point(0,0))
  end
  for _, t in ipairs(tags or {}) do local tag = spr:newTag(t[2], t[3]); tag.name = t[1] end
  spr:saveAs(path)
  spr:close()
end

-- =====================================================================================
-- Aullaluna, el Lobo Espectral (64x64, suelo en la fila 61). Se dibuja mirando a la derecha.
-- =====================================================================================
local WISPS = {{6,30},{10,24},{3,36},{18,30},{24,34},{14,38},{30,32},{8,48}}
local function aullaluna(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  local phase = P.phase or 0
  if P.dead then
    G.ellipse(30,57,18,4,"D"); G.ellipse(30,56,17,4,"M"); G.ridge(30,56,17,4,"L",1)
    G.ellipse(50,55,6,4,"M"); G.rect(54,55,60,57,"M"); G.px(52,54,"K"); G.px(53,55,"K")
    G.thick(13,57,4,60,3,"M")
    for i,w in ipairs(WISPS) do G.px(w[1]+10, w[2]+(i%3)*3, "Wi") end
    return G
  end
  -- estela espectral
  for i,w in ipairs(WISPS) do
    local yy = w[2] + ((i + phase) % 3) - 1 + b
    G.px(w[1] + dx, yy, "Wi")
    if i % 3 == 0 then G.px(w[1] + dx, yy - 1, "Wi") end
  end
  local lunge = P.bite and 1 or 0
  local f = P.feet or {{13,60},{20,60},{37,60},{43,60}}
  -- cola barrida hacia atrás con punta de luz
  local tl = P.tail or 0
  G.thick(12+dx, 42+b, 6+dx, 46+b-tl, 4, "M"); G.thick(6+dx, 46+b-tl, 2+dx, 41+b-tl, 3, "M")
  G.line(11+dx, 41+b, 6+dx, 44+b-tl, "L"); G.px(1+dx, 39+b-tl, "Wi"); G.px(2+dx, 38+b-tl, "Wi"); G.px(0+dx, 37+b-tl, "Wi")
  -- patas lejanas
  G.thick(15+dx, 49+b, f[1][1], f[1][2], 3, "D"); G.rect(f[1][1]-1, f[1][2]+1, f[1][1]+2, f[1][2]+1, "Dd")
  G.thick(39+dx, 49+b, f[3][1], f[3][2], 3, "D"); G.rect(f[3][1]-1, f[3][2]+1, f[3][1]+2, f[3][2]+1, "Dd")
  -- cuerpo con panza en sombra
  G.ellipse(28+dx, 46+b, 16, 7, "D"); G.ellipse(28+dx, 45+b, 16, 7, "M"); G.ridge(28+dx, 45+b, 16, 7, "L", 2)
  G.ellipse(17+dx, 45+b, 7, 8, "M"); G.ridge(17+dx, 45+b, 7, 8, "L", 1)
  -- patas cercanas
  G.thick(19+dx, 50+b, f[2][1], f[2][2], 4, "M"); G.rect(f[2][1]-2, f[2][2]+1, f[2][1]+2, f[2][2]+1, "D")
  G.thick(43+dx, 50+b, f[4][1], f[4][2], 4, "M"); G.rect(f[4][1]-2, f[4][2]+1, f[4][1]+2, f[4][2]+1, "D")
  -- gorguera de pelo en el pecho y el cuello
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(41+dx, 41+b, 9, 10, "M"); G.ridge(41+dx, 41+b, 9, 10, "L", 2)
  for x=34,47,2 do G.px(x+dx, 51+b, "M"); G.px(x+dx+1, 50+b, "L") end
  for _,t in ipairs({{33,36},{33,40},{34,44}}) do G.px(t[1]+dx-1, t[2]+b, "M"); G.px(t[1]+dx, t[2]+b, "L") end
  -- cabeza
  G.ellipse(49+hx, 32+hy, 7, 6, "M"); G.ridge(49+hx, 32+hy, 7, 6, "L", 1)
  G.rect(54+hx, 31+hy, 61+hx, 34+hy, "M"); G.rect(54+hx, 35+hy, 59+hx, 36+hy, "D")
  G.rect(55+hx, 31+hy, 60+hx, 31+hy, "L"); G.px(61+hx, 31+hy, "K"); G.px(61+hx, 32+hy, "K")
  -- orejas en punta
  for i=0,6 do G.line(44+hx+i*0.3, 27+hy-i, 47+hx-i*0.2, 27+hy-i, "M") end
  for i=0,6 do G.line(49+hx+i*0.3, 27+hy-i, 52+hx-i*0.2, 27+hy-i, "M") end
  G.px(45+hx, 23+hy, "D"); G.px(50+hx, 23+hy, "D")
  -- la luna en la frente
  G.px(47+hx, 29+hy, "Mo"); G.px(48+hx, 28+hy, "Mo"); G.px(49+hx, 28+hy, "Mo"); G.px(50+hx, 29+hy, "Mo")
  if P.pain then
    G.px(53+hx,30+hy,"K"); G.px(54+hx,29+hy,"K")
  else
    G.px(53+hx, 30+hy, "Ey"); G.px(54+hx, 30+hy, "Ey"); G.px(55+hx, 29+hy, "Wi")
  end
  if P.bite then
    G.rect(54+hx, 37+hy, 60+hx, 37+hy, "r"); G.px(55+hx,37+hy,"W"); G.px(58+hx,37+hy,"W")
    G.rect(54+hx, 38+hy, 59+hx, 39+hy, "D"); G.px(57+hx,38+hy,"W")
    G.line(58+hx, 42+hy, 63, 48, "Wi"); G.line(55+hx, 44+hy, 61, 52, "Wi")
  end
  if P.howl then
    G.line(62, 24+hy, 63, 22+hy, "Wi"); G.line(60, 20+hy, 62, 18+hy, "Wi")
  end
  return G
end

local WOLF_POSES = {
  {name="idle",   poses={{bob=0,phase=0,dur=500},{bob=1,tail=2,phase=1,dur=500}}},
  {name="attack", poses={{bob=2,hx=-1,hy=2,howl=true,phase=2,dur=300},
                         {dx=5,bob=-2,bite=true,feet={{9,60},{15,60},{46,58},{52,56}},phase=0,dur=160},
                         {dx=2,bob=0,phase=1,dur=300}}},
  {name="hurt",   poses={{dx=-2,hy=-2,pain=true,phase=2,dur=300}}},
  {name="die",    poses={{bob=4,pain=true,phase=0,dur=300},{dead=true,dur=1200}}},
}
do
  local frames, durs, tags, manifest = {}, {}, {}, {}
  for _,a in ipairs(WOLF_POSES) do
    local from = #frames + 1
    local idx, ds = {}, {}
    for _,P in ipairs(a.poses) do
      frames[#frames+1] = aullaluna(P); durs[#durs+1] = P.dur
      idx[#idx+1] = #frames - 1; ds[#ds+1] = P.dur
    end
    tags[#tags+1] = {a.name, from, #frames}
    manifest[#manifest+1] = string.format('"%s": { "frames": [%s], "durations": [%s], "loop": %s }',
      a.name, table.concat(idx, ", "), table.concat(ds, ", "), a.name == "idle" and "true" or "false")
  end
  saveSheet(dir .. "/coleccion/mitico_aullaluna.aseprite", 64, 64, frames, durs, tags, {flip=true})
  local fh = io.open(dir .. "/coleccion/mitico_aullaluna.anims.json", "w")
  fh:write("{ " .. table.concat(manifest, ", ") .. " }\n")
  fh:close()
end

-- =====================================================================================
-- Marcos de carta (40x56): bronce, plata, oro, violeta y mítica (luz de luna)
-- =====================================================================================
local CARD = {
  {L="c1",M="c2",D="c3",gem="Y"},
  {L="s1",M="s2",D="s3",gem="gb"},
  {L="g1",M="g2",D="g3",gem="gr"},
  {L="v1",M="v2",D="v3",gem="gy"},
  {L="m1",M="m2",D="m3",gem="Mo",stars=true},
}
local cards = {}
for _,p in ipairs(CARD) do
  local G = newGrid(40, 56)
  -- cuerpo del marco con bisel
  G.rect(1,1,38,54,p.M)
  G.rect(1,1,38,1,p.L); G.rect(1,1,1,54,p.L)
  G.rect(1,54,38,54,p.D); G.rect(38,1,38,54,p.D)
  -- ventana del monstruo (fondo oscuro con suelo)
  G.rect(4,6,35,38,p.D)
  G.rect(5,7,34,37,"bg"); G.rect(5,30,34,37,"bg2"); G.rect(5,34,34,37,"bg3")
  -- placa del nombre
  G.rect(4,41,35,50,p.D); G.rect(5,42,34,49,"T"); G.rect(5,49,34,49,"t")
  -- gema de arriba y tachuelas en las esquinas
  G.rect(18,1,21,4,p.D); G.rect(19,2,20,3,p.gem); G.px(19,2,"W")
  for _,c in ipairs({{3,3},{36,3},{3,52},{36,52}}) do G.px(c[1],c[2],p.L); G.px(c[1]+1,c[2]+1,p.D) end
  if p.stars then
    for _,s in ipairs({{8,3},{30,3},{2,20},{37,28},{12,52},{26,52}}) do G.px(s[1],s[2],"W") end
    G.px(7,9,"Mo"); G.px(31,11,"Wi"); G.px(9,14,"Wi")
  end
  cards[#cards+1] = G
end
saveSheet(dir .. "/coleccion/cartas.aseprite", 40, 56, cards, nil, nil, {outline=false})

-- =====================================================================================
-- Íconos de carta para la mochila (16x16), uno por rareza
-- =====================================================================================
local icons = {}
for i,p in ipairs(CARD) do
  local G = newGrid(16, 16)
  -- carta de atrás asomando (da idea de colección)
  G.rect(5,1,13,13,p.D); G.rect(6,2,12,12,p.M)
  -- carta de adelante
  G.rect(2,3,10,15,p.M); G.rect(2,3,10,3,p.L); G.rect(2,3,2,15,p.L)
  G.rect(4,5,8,10,"bg"); G.rect(4,9,8,10,"bg2")
  G.px(6,7,p.gem); G.px(5,7,"W")
  G.rect(4,12,8,13,"T")
  if i == 5 then G.px(12,4,"W"); G.px(13,9,"Wi") end
  icons[#icons+1] = G
end
saveSheet(dir .. "/coleccion/carta_icono.aseprite", 16, 16, icons)

-- =====================================================================================
-- Amuletos del bestiario (24x24): bolsa, pluma, ojo, trébol, hoja
-- =====================================================================================
local charms = {}
local function charm(fn) local G = newGrid(24, 24); fn(G); charms[#charms+1] = G end
-- Bolsa del Mercader: saquito de cuero con moneda
charm(function(G)
  G.ellipse(12,15,8,7,"B"); G.ridge(12,15,8,7,"Bh",2); G.rect(6,19,18,21,"b")
  G.rect(9,6,15,8,"B"); G.rect(8,8,16,9,"b"); G.px(10,6,"Bh")
  G.line(7,9,5,7,"Y"); G.line(17,9,19,7,"Y")
  G.ellipse(12,15,3,3,"Y"); G.px(11,14,"Yh"); G.px(13,16,"y"); G.px(12,15,"y")
end)
-- Pluma del Erudito: pluma blanca en diagonal con punta de tinta
charm(function(G)
  for i=0,13 do
    local cx, cy = 19 - i, 2 + i
    local w = (i < 2 or i > 11) and 1 or 3
    for k=1,w do G.px(cx + k, cy - k + 1, "W"); G.px(cx - k + 1, cy + k, "S") end
  end
  G.line(20,1,5,16,"s")
  G.line(5,16,3,20,"In"); G.px(3,21,"In"); G.px(4,21,"gb")
end)
-- Ojo del Rastreador: amuleto dorado con un ojo
charm(function(G)
  G.ellipse(12,12,9,9,"y"); G.ellipse(12,12,8,8,"Y"); G.ridge(12,12,8,8,"Yh",1)
  G.ellipse(12,12,6,4,"W"); G.ellipse(12,12,3,3,"gb"); G.ellipse(12,12,1,1,"K"); G.px(11,11,"W")
  G.px(12,2,"Y"); G.rect(11,0,13,1,"y")
end)
-- Trébol del Coleccionista: trébol de cuatro hojas
charm(function(G)
  for _,c in ipairs({{8,8},{16,8},{8,15},{16,15}}) do G.ellipse(c[1],c[2],4,4,"G2"); G.px(c[1]-1,c[2]-1,"G1"); G.px(c[1]-2,c[2],"G1") end
  G.ellipse(12,11,2,2,"G3")
  G.line(12,13,14,22,"G3"); G.px(13,18,"G2")
  G.px(8,8,"G3"); G.px(16,8,"G3"); G.px(8,15,"G3"); G.px(16,15,"G3")
end)
-- Hoja de Respiro: hoja verde con una gota de rocío
charm(function(G)
  G.ellipse(12,11,6,9,"G2"); G.ridge(12,11,6,9,"G1",2)
  G.line(12,3,12,20,"G3"); G.line(12,8,9,6,"G3"); G.line(12,12,15,10,"G3"); G.line(12,15,9,13,"G3")
  G.line(12,20,13,23,"G3")
  G.ellipse(17,17,2,2,"gb"); G.px(16,16,"W")
end)
saveSheet(dir .. "/coleccion/amuletos.aseprite", 24, 24, charms)

-- =====================================================================================
-- Marca del jefe mítico en el mapa (16x16): calavera de lobo con luna
-- =====================================================================================
do
  local G = newGrid(16, 16)
  G.ellipse(8,7,6,5,"L"); G.rect(5,10,11,13,"L"); G.ridge(8,7,6,5,"W",1)
  G.thick(3,4,2,0,2,"L"); G.thick(13,4,14,0,2,"L")
  G.rect(5,7,6,8,"Dd"); G.rect(10,7,11,8,"Dd"); G.px(5,7,"Ey"); G.px(11,7,"Ey")
  G.px(8,10,"Dd"); G.rect(6,12,10,12,"Dd"); G.px(7,13,"W"); G.px(9,13,"W")
  G.px(7,3,"Mo"); G.px(8,2,"Mo"); G.px(9,3,"Mo")
  saveSheet(dir .. "/coleccion/marca_mitico.aseprite", 16, 16, {G})
end

-- =====================================================================================
-- Lobo espectral (48x48): los esbirros que invoca Aullaluna. Mismo esqueleto que los lobos de
-- la Pradera (crear_enemigos_zona1.lua) con colores de luna y motas de luz.
-- =====================================================================================
local function wolf(pal)
  return function(P)
    local G = newGrid(48, 48, 45)
    local dx, b = P.dx or 0, P.bob or 0
    if P.dead then
      G.line(12,40,4,43,pal.M); G.line(12,41,5,44,pal.M)
      G.ellipse(23,41,12,4,pal.M); G.ridge(23,41,12,4,pal.L)
      G.thick(18,44,21,45,2,pal.D); G.thick(28,44,31,45,2,pal.D)
      G.ellipse(37,42,5,3,pal.M); G.rect(40,42,44,44,pal.L); G.px(44,42,"K")
      G.px(37,41,"K"); G.px(38,42,"K"); G.px(36,42,"K")
      return G
    end
    local feet = P.feet or {{14,44},{18,44},{31,44},{28,44}}
    local hip, sh = {16+dx, 35+b}, {30+dx, 35+b}
    G.thick(11+dx, 30+b, 5+dx, 24+b-(P.tail or 0), 2, pal.M); G.px(5+dx, 23+b-(P.tail or 0), pal.L)
    G.thick(hip[1]-1, hip[2], feet[1][1], feet[1][2], 2, pal.D); G.rect(feet[1][1]-1,feet[1][2]+1,feet[1][1]+1,feet[1][2]+1,pal.D)
    G.thick(sh[1]+1, sh[2], feet[3][1], feet[3][2], 2, pal.D); G.rect(feet[3][1]-1,feet[3][2]+1,feet[3][1]+1,feet[3][2]+1,pal.D)
    G.ellipse(22+dx, 32+b, 11, 6, pal.M); G.ridge(22+dx, 32+b, 11, 6, pal.L, 2)
    G.rect(16+dx, 37+b, 27+dx, 37+b, pal.L)
    G.thick(hip[1]+2, hip[2], feet[2][1], feet[2][2], 3, pal.M); G.rect(feet[2][1]-1,feet[2][2]+1,feet[2][1]+2,feet[2][2]+1,pal.D)
    G.thick(sh[1]-2, sh[2], feet[4][1], feet[4][2], 3, pal.M); G.rect(feet[4][1]-1,feet[4][2]+1,feet[4][1]+2,feet[4][2]+1,pal.D)
    local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
    G.ellipse(31+dx, 28+b, 5, 6, pal.M)
    G.px(28+dx,22+b,pal.L); G.px(30+dx,21+b,pal.L); G.px(32+dx,22+b,pal.L)
    if pal.spiky then G.px(27+dx,21+b,pal.M); G.px(29+dx,20+b,pal.M); G.px(31+dx,19+b,pal.M) end
    G.ellipse(36+hx, 26+hy, 5, 4, pal.M)
    G.rect(40+hx, 26+hy, 45+hx, 28+hy, pal.M); G.rect(40+hx, 28+hy, 44+hx, 29+hy, pal.L); G.px(45+hx, 26+hy, "K")
    G.line(33+hx, 22+hy, 34+hx, 19+hy, pal.M); G.px(34+hx, 21+hy, pal.D)
    G.line(36+hx, 22+hy, 37+hx, 19+hy, pal.M)
    if P.pain then G.px(38+hx,25+hy,"K"); G.px(39+hx,25+hy,"K") else G.px(39+hx, 25+hy, pal.eye); G.px(38+hx,25+hy,pal.eye) end
    if pal.scar then G.px(41+hx,26+hy,"pk"); G.px(42+hx,27+hy,"pk") end
    if P.bite then
      G.rect(40+hx, 29+hy, 45+hx, 29+hy, "r"); G.px(41+hx,29+hy,"W"); G.px(44+hx,29+hy,"W")
      G.rect(40+hx, 30+hy, 44+hx, 31+hy, pal.L); G.px(43+hx,30+hy,"W")
    end
    return G
  end
end

local SPECTRAL = {L="L", M="M", D="D", eye="Ey"}
local WOLF_ANIMS48 = {
  {name="idle",   poses={{bob=0,dur=400},{bob=1,tail=2,dur=400}}},
  {name="attack", poses={{bob=2,hx=-1,hy=2,dur=200},{dx=5,bob=-2,bite=true,feet={{10,44},{13,44},{40,40},{37,42}},dur=120},{dx=2,bob=0,dur=220}}},
  {name="hurt",   poses={{dx=-2,hy=-2,pain=true,dur=250}}},
  {name="die",    poses={{bob=4,pain=true,dur=200},{dead=true,dur=1000}}},
}
do
  local draw = wolf(SPECTRAL)
  local frames, durs, tags, manifest = {}, {}, {}, {}
  for _,a in ipairs(WOLF_ANIMS48) do
    local from = #frames + 1
    local idx, ds = {}, {}
    for i,P in ipairs(a.poses) do
      local G = draw(P)
      -- motas de luz alrededor
      for k,m in ipairs({{6,20},{12,14},{20,18},{3,30},{26,22}}) do
        if (k + i) % 2 == 0 and not P.dead then G.px(m[1] + (P.dx or 0), m[2] + (P.bob or 0), "Wi") end
      end
      frames[#frames+1] = G; durs[#durs+1] = P.dur
      idx[#idx+1] = #frames - 1; ds[#ds+1] = P.dur
    end
    tags[#tags+1] = {a.name, from, #frames}
    manifest[#manifest+1] = string.format('"%s": { "frames": [%s], "durations": [%s], "loop": %s }',
      a.name, table.concat(idx, ", "), table.concat(ds, ", "), a.name == "idle" and "true" or "false")
  end
  saveSheet(dir .. "/coleccion/lobo_espectral.aseprite", 48, 48, frames, durs, tags, {flip=true})
  local fh = io.open(dir .. "/coleccion/lobo_espectral.anims.json", "w")
  fh:write("{ " .. table.concat(manifest, ", ") .. " }")
  fh:close()
end
