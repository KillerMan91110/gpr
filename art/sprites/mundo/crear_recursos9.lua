-- Recursos de las Ruinas Ancestrales (mismo estilo que crear_recursos8.lua), en una hoja aparte para no
-- regenerar las de antes:
--  * recursos9.aseprite y recursos9.png: 32x32, 12 frames = bloque de mármol, bloque partido, veta de oro
--    primordial, veta picada, flores luminosas, flores cortadas, fuente de lágrimas, fuente seca, cráter de
--    estrella, cráter apagado, relicario del templo y relicario vacío
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos9.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"W","f0f4f8"},
  -- el prado de las Ruinas
  {"jp1","b6d878"},{"jp2","92bc5a"},{"jp3","6c9640"},{"jp4","4a7030"},
  -- mármol del templo
  {"jm1","f4f0e6"},{"jm2","dfd8c8"},{"jm3","c2b9a6"},{"jm4","978e7c"},{"jm5","6c6656"},
  -- oro primordial
  {"go1","ffe08a"},{"go2","c89a2a"},{"go3","8a6a20"},
  -- flores de luz y agua de lágrimas (brillan)
  {"jl1","e0f8ff"},{"jl2","a6e2f4"},{"jl3","64bcde"},{"jl4","3490be"},
  -- el cielo roto y las estrellas
  {"jc1","1e1a44"},{"jc2","2e2a66"},{"jc3","4c3c94"},{"sr","fff8c0"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

local function newGrid(W, H)
  local g = {}
  local G = {g = g, w = W, h = H}
  function G.px(x, y, c) x, y = math.floor(x+0.5), math.floor(y+0.5); if x>=0 and x<W and y>=0 and y<H then g[y*W+x] = c end end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.ellipse(cx,cy,rx,ry,c)
    for y=math.floor(cy-ry),math.ceil(cy+ry) do for x=math.floor(cx-rx),math.ceil(cx+rx) do
      local dx, dy = (x-cx)/rx, (y-cy)/ry
      if dx*dx+dy*dy <= 1 then G.px(x,y,c) end
    end end
  end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, c) end
  end
  return G
end

local function toImage(G, outline)
  local W, H, g = G.w, G.h, G.g
  if outline then
    local out = {}
    for y=0,H-1 do for x=0,W-1 do
      if not g[y*W+x] then
        for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
          local nx, ny = x+o[1], y+o[2]
          if nx>=0 and nx<W and ny>=0 and ny<H and g[ny*W+nx] and g[ny*W+nx] ~= "K" then out[y*W+x] = true break end
        end
      end
    end end
    for k in pairs(out) do g[k] = "K" end
  end
  local img = Image(W, H, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % W, k // W, C[c]) end
  return img
end

local dir = app.params.dir

local function saveFrames(path, W, H, frames, tags)
  local spr = Sprite(W, H, ColorMode.RGB)
  spr.layers[1].name = "arte"
  for i, G in ipairs(frames) do
    local frame = (i == 1) and spr.frames[1] or spr:newEmptyFrame(i)
    frame.duration = 0.15
    spr:newCel(spr.layers[1], frame, toImage(G, true), Point(0,0))
  end
  for _, t in ipairs(tags or {}) do local tag = spr:newTag(t[2], t[3]); tag.name = t[1] end
  spr:saveAs(path)
  spr:close()
end

-- bloque de mármol: un bloque grande con vetas doradas y marcas de cincel; partido, los pedazos
local function marbleBlock(G, full)
  G.ellipse(16,27,13,3,"jp4")
  if full then
    G.rect(5,10,26,26,"jm2"); G.rect(5,10,26,12,"jm1"); G.rect(24,10,26,26,"jm3"); G.rect(5,25,26,26,"jm4")
    G.line(7,15,14,20,"go2"); G.line(14,20,22,17,"go2"); G.px(11,18,"go1")
    for _, x in ipairs({8, 13, 19}) do G.px(x, 23, "jm4"); G.px(x + 1, 22, "jm4") end
  else
    G.rect(5,19,13,26,"jm2"); G.rect(5,19,13,20,"jm1"); G.rect(16,21,26,26,"jm3"); G.rect(16,21,26,22,"jm2")
    G.rect(12,15,17,19,"jm1"); G.line(18,24,22,23,"go2")
  end
end
-- veta de oro primordial: roca blanca con oro que brilla; picada, la roca rota
local function goldVein(G, full)
  G.ellipse(16,27,13,3,"jp4")
  G.ellipse(16,21,12,8,"jm3"); G.ellipse(14,18,9,5,"jm2"); G.ellipse(19,24,7,3,"jm4")
  if full then
    for _, v in ipairs({{8,20,14,15},{15,22,22,16},{11,25,20,21}}) do G.line(v[1], v[2], v[3], v[4], "go2"); G.line(v[1], v[2] - 1, v[3], v[4] - 1, "go1") end
    G.px(14,14,"W"); G.px(21,15,"W")
  else
    G.rect(12,16,20,17,"jm4"); for _, x in ipairs({10, 16, 22}) do G.px(x, 21, "go3") end
  end
end
-- flores luminosas: un manojo de flores celestes que brillan; cortadas, los tallos
local function lightFlowers(G, full)
  G.ellipse(16,27,11,3,"jp4")
  for _, p in ipairs({{10,17},{16,13},{22,17},{13,20},{20,21}}) do
    G.line(p[1], p[2] + 2, p[1] + (16 - p[1]) // 4, 26, "jp3")
    if full then
      G.ellipse(p[1], p[2], 2.5, 2, "jl2"); G.px(p[1], p[2], "W"); G.px(p[1] - 2, p[2], "jl1"); G.px(p[1] + 2, p[2], "jl1")
    else G.px(p[1], p[2] + 2, "jp2") end
  end
  if full then G.px(8, 10, "jl1"); G.px(24, 9, "jl1") end
end
-- fuente de lágrimas: un pocito de mármol con agua celeste que brilla; seca, el fondo vacío
local function tearWell(G, full)
  G.ellipse(16,24,13,6,"jm3"); G.ellipse(16,23,12,5,"jm2")
  G.ellipse(16,23,8,3,full and "jl3" or "jm4"); G.ellipse(16,23,6,2,full and "jl2" or "jm5")
  G.rect(4,24,28,27,"jm2"); G.rect(4,27,28,28,"jm4"); for x=6,26,5 do G.px(x,25,"jm3") end
  if full then G.px(14,22,"jl1"); G.px(18,23,"W"); G.px(16,16,"jl1"); G.px(13,18,"jl2"); G.px(19,14,"jl1") end
end
-- cráter de estrella: un hoyo en el prado con polvo plateado que brilla; apagado, el hoyo gris
local function starCrater(G, full)
  G.ellipse(16,24,13,6,"jp3"); G.ellipse(16,23,11,5,"jm4"); G.ellipse(16,24,8,3,full and "jc2" or "jm5")
  for _, p in ipairs({{5,22},{27,23},{8,27},{24,27}}) do G.px(p[1], p[2], "jm3") end
  if full then
    G.ellipse(16,23,5,2,"jc3")
    for _, p in ipairs({{13,22},{18,23},{16,21},{20,22},{11,24}}) do G.px(p[1], p[2], "sr") end
    G.px(16,15,"sr"); G.px(15,16,"sr"); G.px(17,16,"sr"); G.px(16,17,"sr")
  end
end
-- relicario del templo: un cofre de mármol con oro, la tapa abierta y reliquias; vacío, el cofre abierto
local function reliquary(G, full)
  G.ellipse(16,28,14,3,"jp4")
  G.rect(4,15,27,27,"jm2"); G.rect(4,15,27,16,"jm1"); G.rect(26,15,27,27,"jm3"); G.rect(6,17,25,25,"jm5")
  G.rect(4,20,27,21,"go2"); G.rect(14,19,17,22,"go1")
  if full then
    G.ellipse(15,22,8,3,"go2"); G.ellipse(14,21,6,2,"go1"); G.px(11,20,"W"); G.px(18,21,"W")
    G.ellipse(20,19,2,2,"jl2"); G.px(20,19,"W")
  end
  -- la tapa abierta, apoyada atrás
  G.rect(5,7,26,13,"jm1"); G.rect(5,13,26,14,"jm3"); G.rect(13,9,18,11,"go2")
end

local KIND = {marbleBlock, goldVein, lightFlowers, tearWell, starCrater, reliquary}
local frames = {}
for _, f in ipairs(KIND) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); frames[#frames + 1] = G end
end
saveFrames(dir .. "/recursos9.aseprite", 32, 32, frames, {{"bloque_marmol",1,2},{"veta_oro",3,4},{"flores_luminosas",5,6},{"fuente_lagrima",7,8},{"crater_estrella",9,10},{"relicario_templo",11,12}})
-- tira horizontal para el juego
local sheet = Image(32 * #frames, 32, ColorMode.RGB)
for i = 1, #frames do
  local f = newGrid(32, 32); KIND[(i + 1) // 2](f, i % 2 == 1)
  sheet:drawImage(toImage(f, true), Point((i - 1) * 32, 0))
end
local out = Sprite(32 * #frames, 32, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(dir .. "/recursos9.png")
out:close()
