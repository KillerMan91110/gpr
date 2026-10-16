-- Recursos del Volcán Rojo (mismo estilo y paleta que crear_recursos4.lua), en una hoja aparte
-- para no regenerar las de antes:
--  * recursos5.aseprite y recursos5.png: 32x32, 10 frames = veta de obsidiana, veta picada, fumarola,
--    fumarola apagada, flor de ceniza, flor recogida, nido de salamandra, nido vacío, geoda ardiente, geoda rota
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos5.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"F","e8b48c"},{"f","b97f5c"},{"E","1c2a4a"},{"H","2a2433"},{"h","4a3f5c"},
  {"W","f0f4f8"},{"S","c8d0dc"},{"s","8a96a8"},{"d","555f70"},{"R","c0343a"},{"r","7a1f2a"},
  {"B","8a5530"},{"b","4f2e1c"},{"Y","e8c050"},{"y","a8802c"},{"A","4a5060"},{"a","2e323e"},{"Ah","7a8296"},
  {"G","3f7040"},{"g","274828"},{"Gh","64984f"},{"V","6a3a8a"},{"v","432456"},{"Vh","8e5ab0"},
  {"O","c0602a"},{"o","8a3a1a"},{"Oh","e08a4a"},{"N","7a5a3a"},{"n","4e3622"},{"Nh","a07a52"},
  {"T","d8c8a0"},{"t","a8987a"},
  -- recursos y mascotas
  {"c1","6fae4a"},{"c2","4a8432"},{"c3","2c5e20"},{"fl","f0e070"},{"fr","e86a8a"},{"fv","b070e0"},
  {"r1","9a9488"},{"r2","767060"},{"r3","4c473e"},{"q1","6fc3ff"},{"q2","3a8ad8"},{"q3","e8a050"},
  {"w1","b8b0a8"},{"w2","847c74"},{"w3","5a524c"},{"p1","7adcc0"},{"p2","3aa888"},{"p3","c0f0e0"},
  {"x1","e85a3a"},{"x2","a83020"},{"z1","e8a050"},{"z2","b06a28"},{"u1","5a8a4a"},{"u2","3a5e30"},
  {"k1","f4e8f0"},{"k2","d8b8e0"},{"k3","a888c0"},{"lb","8ab8f0"},
  -- montaña: nieve, hielo, acero, carbón y pino
  {"n1","f4f8fc"},{"n2","c8d4e4"},{"n3","8a9ab4"},{"i1","e6fbff"},{"i2","a8e4ff"},{"i3","5ca2ca"},
  {"m1","cfd8e6"},{"m2","8e9cb4"},{"cb","26242c"},{"pn1","2e5a44"},{"pn2","1e4030"},
  -- volcán: ceniza, basalto, obsidiana, azufre, lava y vapor
  {"as1","b8b2aa"},{"as2","8a847c"},{"as3","5a544e"},{"ba1","4a4448"},{"ba2","2e2a2e"},{"ob1","3a3448"},{"ob2","1e1a28"},{"obh","8a80b8"},
  {"su1","f4e868"},{"su2","c8b028"},{"su3","8a7a18"},{"lv1","ffe060"},{"lv2","ff8a20"},{"lv3","c83010"},{"st1","f4f4f4"},{"st2","c8ccd4"},
  {"pm1","d8ccb0"},{"pm2","a89c84"},{"eg1","f8b070"},{"eg2","d06a30"},{"eg3","8a3a18"},
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

-- veta de obsidiana: roca de basalto con agujas de vidrio negro que brillan violeta; picada, el hueco
local function obsidian(G, full)
  G.ellipse(16,27,13,3,"as2")
  G.ellipse(16,21,11,7,"ba1"); G.ellipse(14,19,8,5,"ba2"); G.ellipse(18,24,6,2,"ba2")
  G.px(9,23,"lv3"); G.px(10,24,"lv2"); G.px(22,25,"lv3")
  if full then
    local function spike(x, y, h, w)
      for i = 0, h do
        local ww = math.max(0, math.floor(w * (1 - i / h)))
        for dx = -ww, ww do G.px(x + dx, y - i, (dx < 0) and "ob2" or "ob1") end
      end
      G.px(x, y - h, "obh"); G.px(x + 1, y - h + 2, "obh"); G.px(x + 1, y - h + 3, "obh")
    end
    spike(12, 20, 9, 2); spike(17, 19, 13, 2); spike(21, 21, 7, 1)
  else
    G.ellipse(16,19,4,3,"ob2"); G.px(15,18,"obh"); G.px(11,21,"ob1"); G.px(20,22,"ob1")
  end
end
-- fumarola: grieta en una costra de azufre; activa, con cristales amarillos y una columna de vapor
local function fumarole(G, full)
  G.ellipse(16,26,13,4,"su2"); G.ellipse(16,25,10,3,"su1"); G.ellipse(16,25,4,1.5,"ba2"); G.px(16,25,"lv3")
  G.px(8,27,"su3"); G.px(23,27,"su3"); G.px(12,28,"su3"); G.px(20,28,"su3")
  local function crystal(x, y)
    G.rect(x, y - 3, x + 1, y, "su1"); G.px(x + 1, y - 3, "W"); G.rect(x + 2, y - 1, x + 2, y, "su2"); G.px(x - 1, y, "su3")
  end
  if full then
    crystal(7, 25); crystal(22, 25); crystal(11, 23); crystal(19, 23)
    -- vapor: bocanadas que se tocan y se van afinando hacia arriba
    G.ellipse(16,19,4,3,"st2"); G.ellipse(17,15,4.5,3,"st2"); G.ellipse(15,11,4,3,"st2"); G.ellipse(17,7,3,2.5,"st2"); G.ellipse(15,4,2,1.5,"st2")
    G.ellipse(15,18,2.5,1.5,"st1"); G.ellipse(16,14,3,1.5,"st1"); G.ellipse(14,10,2.5,1.5,"st1"); G.ellipse(16,6,1.5,1,"st1")
  else
    G.ellipse(16,21,2,2,"st2"); G.px(15,20,"st1")
  end
end
-- flor de ceniza: pétalos grises y tibios con el centro encendido, sobre ceniza; recogida, los tallos
local function ashflower(G, full)
  G.ellipse(16,28,11,2,"as2")
  for _, x in ipairs({10, 16, 22}) do G.rect(x, 22, x, 27, "as3"); G.px(x - 1, 25, "ba1"); G.px(x + 1, 24, "ba1") end
  if full then
    for i, x in ipairs({10, 16, 22}) do
      local y = 19 - (i % 2) * 3
      G.px(x, y - 1, "as1"); G.px(x, y + 1, "as1"); G.px(x - 1, y, "as1"); G.px(x + 1, y, "as1")
      G.px(x - 1, y - 1, "as2"); G.px(x + 1, y + 1, "as2"); G.px(x - 1, y + 1, "as2"); G.px(x, y, "lv2"); G.px(x, y - 2, "lv1")
    end
  end
end
-- nido de salamandra: anillo de piedra pómez con tres huevos naranjas; vacío, cáscaras
local function nest(G, full)
  G.ellipse(16,27,13,3,"as2")
  G.ellipse(16,25,10,3.5,"ba2")
  for k = 0, 11 do
    local a = k / 12 * math.pi * 2
    local x, y = 16 + math.cos(a) * 10, 25 + math.sin(a) * 3.5
    G.ellipse(x, y, 2, 1.5, (k % 2 == 0) and "pm1" or "pm2"); G.px(x + 1, y, "pm2")
  end
  if full then
    for _, p in ipairs({{11,22},{16,20},{21,22}}) do
      G.ellipse(p[1], p[2], 2.5, 3.2, "eg3"); G.ellipse(p[1], p[2], 2, 2.7, "eg2"); G.ellipse(p[1] - 0.6, p[2] - 0.8, 1, 1.4, "eg1"); G.px(p[1] - 1, p[2] - 2, "W")
    end
  else
    for _, p in ipairs({{12,24},{16,23},{20,24}}) do G.px(p[1], p[2], "eg1"); G.px(p[1] + 1, p[2], "eg2"); G.px(p[1], p[2] - 1, "eg2") end
  end
end
-- geoda ardiente: roca redonda partida con cristales rojos encendidos adentro; rota, la cáscara vacía
local function geode(G, full)
  G.ellipse(16,27,12,3,"as2")
  G.ellipse(16,20,10,8,"ba1"); G.ellipse(16,21,7,6,"ba2")
  if full then
    G.ellipse(16,21,6,5,"lv3"); G.ellipse(16,21,4,3.5,"lv2"); G.ellipse(16,21,2,2,"lv1")
    for _, p in ipairs({{12,19},{20,19},{14,24},{18,24},{16,16}}) do G.px(p[1],p[2],"lv1"); G.px(p[1],p[2]+1,"lv2") end
    G.px(16,20,"W")
  else
    G.ellipse(16,21,5,4,"ob2"); G.px(13,20,"lv3"); G.px(19,22,"lv3")
    for _, p in ipairs({{8,24},{24,24},{6,26}}) do G.px(p[1],p[2],"ba1"); G.px(p[1]+1,p[2],"ba2") end
  end
end

local KIND = {obsidian, fumarole, ashflower, nest, geode}
local frames = {}
for _, f in ipairs(KIND) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); frames[#frames + 1] = G end
end
saveFrames(dir .. "/recursos5.aseprite", 32, 32, frames, {{"veta_obsidiana",1,2},{"fumarola",3,4},{"flor_ceniza",5,6},{"nido_salamandra",7,8},{"geoda_ardiente",9,10}})
-- tira horizontal para el juego
local sheet = Image(32 * #frames, 32, ColorMode.RGB)
for i = 1, #frames do
  local f = newGrid(32, 32); KIND[(i + 1) // 2](f, i % 2 == 1)
  sheet:drawImage(toImage(f, true), Point((i - 1) * 32, 0))
end
local out = Sprite(32 * #frames, 32, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(dir .. "/recursos5.png")
out:close()
