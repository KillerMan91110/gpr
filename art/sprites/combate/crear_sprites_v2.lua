-- Sprites de combate v2 de Etheria: cuerpo (sin arma) y arma en capas separadas.
-- Todas las clases comparten las mismas poses (posicion de la mano por frame), asi cualquier
-- arma encaja en cualquier clase: el juego dibuja cuerpo + arma con el mismo numero de frame.
--
-- Uso: aseprite -b --script-param dir=D:/Sprites/v2 --script crear_sprites_v2.lua
-- Genera: <dir>/clases/<clase>.aseprite (capas "arma" + "cuerpo"), <dir>/armas/<arma>.aseprite
-- y <dir>/manifest.json (lo que lee el juego).
local FW, FH = 48, 48       -- tamaño de cada frame
local OX, OY = 8, 16        -- donde cae el personaje de 32x32 dentro del frame
local GROUND = OY + 29      -- fila del suelo: nada se dibuja por debajo

local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"F","e8b48c"},{"f","b97f5c"},{"E","1c2a4a"},{"H","2a2433"},{"h","4a3f5c"},
  {"W","f0f4f8"},{"S","c8d0dc"},{"s","8a96a8"},{"d","555f70"},{"R","c0343a"},{"r","7a1f2a"},
  {"B","8a5530"},{"b","4f2e1c"},{"Y","e8c050"},{"y","a8802c"},
  {"A","4a5060"},{"a","2e323e"},{"Ah","7a8296"},
  {"M","2e44b0"},{"m","1d2770"},{"Mh","5070e0"},{"Cl","d8f4ff"},{"C","6fc3ff"},{"c","2f6fe0"},
  {"G","3f7040"},{"g","274828"},{"Gh","64984f"},
  {"L","434352"},{"l","2e2e3a"},{"Lh","62627a"},{"V","6a3a8a"},{"v","432456"},
  {"P","eeecf4"},{"p","b4b0c8"},{"Ph","ffffff"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

-- ---------- Poses (compartidas por todas las clases) ----------
-- hx,hy: centro de la mano (coordenadas del torso). ang: hacia donde apunta el arma.
-- u: bajar el torso, lean: inclinar el torso, legs: stand/lunge/kneel/walkA/walkB, jump: subir todo.
-- walk va al final: así los cuadros de antes no cambian de número.
local FRAMES = {
  {tag="idle",         hx=25,hy=16, ang="up",      u=0, lean=0,  legs="stand", dur=400},
  {tag="idle",         hx=25,hy=16, ang="up",      u=1, lean=0,  legs="stand", dur=400},
  {tag="attack_melee", hx=19,hy=7,  ang="upback",  u=0, lean=-1, legs="stand", dur=120},
  {tag="attack_melee", hx=24,hy=9,  ang="upfwd",   u=0, lean=1,  legs="lunge", dur=80},
  {tag="attack_melee", hx=27,hy=15, ang="downfwd", u=1, lean=2,  legs="lunge", dur=180},
  {tag="attack_melee", hx=25,hy=15, ang="upfwd",   u=0, lean=1,  legs="lunge", dur=200},
  {tag="attack_bow",   hx=26,hy=14, ang="up",      u=0, lean=0,  legs="stand", draw=0, dur=150},
  {tag="attack_bow",   hx=26,hy=14, ang="up",      u=0, lean=-1, legs="stand", draw=1, dur=300},
  {tag="attack_bow",   hx=26,hy=14, ang="up",      u=0, lean=-1, legs="stand", draw=0, dur=200},
  {tag="cast",         hx=23,hy=9,  ang="up",      u=0, lean=0,  legs="stand", dur=150},
  {tag="cast",         hx=24,hy=5,  ang="up",      u=0, lean=0,  legs="stand", dur=350},
  {tag="cast",         hx=26,hy=12, ang="upfwd",   u=0, lean=1,  legs="lunge", dur=200},
  {tag="hurt",         hx=22,hy=16, ang="up",      u=1, lean=-2, legs="stand", dur=120, pain=true},
  {tag="hurt",         hx=23,hy=16, ang="up",      u=0, lean=-1, legs="stand", dur=200, pain=true},
  {tag="defend",       hx=22,hy=14, ang="up",      u=1, lean=-1, legs="stand", dur=400},
  {tag="ko",           hx=23,hy=19, ang="downfwd", u=3, lean=1,  legs="kneel", dur=200, pain=true},
  {tag="ko",           hx=24,hy=23, ang="fwd",     u=5, lean=2,  legs="kneel", dur=1000, pain=true, headDown=1},
  {tag="victory",      hx=21,hy=4,  ang="up",      u=0, lean=0,  legs="stand", dur=300},
  {tag="victory",      hx=21,hy=4,  ang="up",      u=0, lean=0,  legs="stand", dur=300, jump=-2},
  -- caminar (entrar al combate como refuerzo): paso, pie juntos, otro paso, pies juntos
  {tag="walk",         hx=26,hy=16, ang="up",      u=0, lean=1,  legs="walkA", dur=150},
  {tag="walk",         hx=25,hy=16, ang="up",      u=1, lean=1,  legs="stand", dur=110},
  {tag="walk",         hx=23,hy=16, ang="up",      u=0, lean=1,  legs="walkB", dur=150},
  {tag="walk",         hx=25,hy=16, ang="up",      u=1, lean=1,  legs="stand", dur=110},
}
local TAGS = {"idle","attack_melee","attack_bow","cast","hurt","defend","ko","victory","walk"}
local LOOP = {idle=true, victory=true, defend=true, walk=true}
local DIRS = {up={0,-1}, upfwd={1,-1}, fwd={1,0}, downfwd={1,1}, upback={-1,-1}}

-- ---------- Lienzo ----------
local function newGrid()
  local g = {}
  local G = {g = g}
  function G.px(x, y, c)
    x, y = math.floor(x), math.floor(y)
    if x>=0 and x<FW and y>=0 and y<FH and y<=GROUND then g[y*FW+x] = c end
  end
  function G.rect(x0,y0,x1,y1,c) for y=y0,y1 do for x=x0,x1 do G.px(x,y,c) end end end
  function G.line(x0,y0,x1,y1,c)
    local n = math.max(math.abs(x1-x0), math.abs(y1-y0), 1)
    for i=0,n do G.px(math.floor(x0+(x1-x0)*i/n+0.5), math.floor(y0+(y1-y0)*i/n+0.5), c) end
  end
  return G
end

-- Transformacion: coordenadas del personaje 32x32 -> lienzo 48x48
local function view(G, dx, dy)
  local V = {}
  function V.px(x,y,c) G.px(x+dx, y+dy, c) end
  function V.rect(x0,y0,x1,y1,c) G.rect(x0+dx,y0+dy,x1+dx,y1+dy,c) end
  function V.line(x0,y0,x1,y1,c) G.line(x0+dx,y0+dy,x1+dx,y1+dy,c) end
  return V
end

-- ---------- Piezas del cuerpo ----------
local function head(G, P)
  local hd = P.headDown or 0
  local V = view(G, OX + P.lean + hd, OY + P.u + (P.jump or 0) + hd)
  V.rect(13,6,18,10,"F"); V.rect(13,6,13,10,"f")
  if P.pain then V.px(16,9,"E"); V.px(17,9,"E") else V.px(17,8,"E"); V.px(17,9,"E") end
  V.px(16,10,"f"); V.px(17,10,"f"); V.px(18,10,nil)
  V.rect(11,3,17,5,"H"); V.rect(10,4,12,9,"H"); V.px(11,10,"H")
  V.rect(14,6,18,6,"H"); V.px(18,5,"H"); V.px(19,6,"H"); V.px(15,7,"H"); V.px(18,7,"H")
  V.px(12,2,"H"); V.px(15,2,"H"); V.px(10,3,"H")
  V.px(13,3,"h"); V.px(14,4,"h"); V.px(16,3,"h"); V.px(11,5,"h")
  V.px(12,8,"F"); V.px(12,9,"f")
  V.rect(13,11,15,11,"f")
end

local function legs(L, P, pants, pantsD, boot, bootD)
  if P.legs == "lunge" then
    L.rect(10,22,12,27,pantsD); L.rect(9,28,12,29,bootD)
    L.rect(15,22,17,23,pants); L.rect(16,24,18,27,pants); L.rect(16,28,20,29,boot); L.rect(16,29,20,29,bootD)
  elseif P.legs == "walkA" then
    -- pierna de atrás estirada hacia atrás, la de adelante dando el paso
    L.rect(11,22,13,25,pantsD); L.rect(9,26,11,27,pantsD); L.rect(7,28,10,29,bootD)
    L.rect(15,22,17,25,pants); L.rect(16,26,18,27,pants); L.rect(16,28,20,29,boot); L.rect(16,29,20,29,bootD)
  elseif P.legs == "walkB" then
    -- al revés: la de atrás adelanta y la de adelante queda atrás
    L.rect(12,22,14,25,pantsD); L.rect(14,26,16,27,pantsD); L.rect(14,28,18,29,bootD)
    L.rect(14,22,16,24,pants); L.rect(12,25,14,27,pants); L.rect(10,28,14,29,boot); L.rect(10,29,14,29,bootD)
  elseif P.legs == "kneel" then
    L.rect(11,23,13,26,pantsD); L.rect(7,27,13,28,pantsD); L.rect(5,28,7,29,bootD)
    L.rect(15,23,19,25,pants); L.rect(18,26,20,27,pants); L.rect(18,28,22,29,boot); L.rect(18,29,22,29,bootD)
  else
    L.rect(11,22,13,27,pantsD); L.rect(15,22,17,27,pants)
    L.rect(10,28,13,29,bootD); L.rect(15,28,19,29,boot); L.rect(15,29,19,29,bootD)
  end
end

local function robe(L, P, main, shade, trim)
  for y=20+P.u,28 do
    local e = math.max(0, y-20)//3
    L.rect(10-e,y,18+e,y,main); L.rect(16+e,y,18+e,y,shade)
  end
  L.rect(8,28,20,28,trim)
  if P.legs == "stand" then L.rect(12,29,14,29,"b"); L.rect(16,29,18,29,"b")
  elseif P.legs == "lunge" then L.rect(11,29,13,29,"b"); L.rect(17,29,20,29,"b")
  elseif P.legs == "walkA" then L.rect(9,29,11,29,"b"); L.rect(17,29,20,29,"b")
  elseif P.legs == "walkB" then L.rect(10,29,12,29,"b"); L.rect(15,29,18,29,"b") end
end

-- Brazo delantero: del hombro (18,13) a la mano, con grosor; la mano es un puño de 3x3.
local function arm(U, P, sleeve, sleeveD, hand, thick)
  for t=0,thick-1 do U.line(18, 13+t, P.hx, P.hy+t-1, (t == thick-1) and sleeveD or sleeve) end
  U.rect(P.hx-1, P.hy-1, P.hx+1, P.hy+1, hand)
end

-- ---------- Clases (solo ropa; las poses son las mismas para todas) ----------
local CLASSES = {}

CLASSES.guerrero = { weapon = "espada", draw = function(U, L, P)
  U.rect(7,12,10,24,"r"); U.rect(6,20,7,25,"r"); U.rect(9,13,9,23,"R")
  legs(L, P, "a","a","A","a")
  U.rect(10,20,18,22,"A"); U.rect(16,20,18,22,"a"); U.rect(10,22,18,22,"a")
  U.rect(10,12,17,19,"A"); U.rect(16,12,17,19,"a"); U.rect(11,14,12,16,"Ah")
  U.rect(10,19,18,19,"b"); U.px(14,19,"Y")
  return function()
    U.rect(12,11,16,12,"R"); U.px(16,12,"r"); U.px(11,12,"R")
    arm(U, P, "A","a","a", 2)
    U.rect(15,12,19,14,"A"); U.rect(15,14,19,14,"a"); U.rect(16,12,17,12,"Ah")
  end
end }

CLASSES.mago = { weapon = "baculo_arcano", draw = function(U, L, P)
  robe(L, P, "M","m","Y")
  U.rect(10,12,17,19,"M"); U.rect(16,12,17,19,"m"); U.rect(11,13,11,18,"Mh")
  U.rect(15,12,15,19,"Y"); U.rect(10,19,18,19,"y")
  U.rect(10,10,12,12,"M"); U.px(10,10,"Mh")
  return function()
    arm(U, P, "M","m","F", 3)
    U.rect(15,12,18,13,"Mh")
  end
end }

CLASSES.arquero = { weapon = "arco", draw = function(U, L, P)
  U.rect(8,9,10,19,"b"); U.rect(8,10,8,19,"B")
  U.px(8,7,"W"); U.px(9,6,"R"); U.px(10,7,"W"); U.px(8,8,"s"); U.px(9,7,"s"); U.px(9,8,"s"); U.px(10,8,"s")
  U.rect(9,12,12,23,"g"); U.rect(9,22,10,24,"g")
  legs(L, P, "b","b","B","b")
  U.rect(10,20,18,22,"G"); U.rect(16,20,18,22,"g")
  U.rect(10,12,17,19,"G"); U.rect(16,12,17,19,"g"); U.rect(12,13,15,18,"B")
  U.line(11,12,17,18,"b"); U.rect(10,19,18,19,"b"); U.px(14,19,"Y")
  return function()
    U.rect(10,10,13,12,"G"); U.px(10,10,"Gh"); U.px(11,10,"Gh")
    arm(U, P, "G","B","B", 2)
    U.rect(15,12,18,13,"B")
  end
end }

CLASSES.picaro = { weapon = "daga", draw = function(U, L, P)
  U.rect(7,12,10,13,"v"); U.px(6,14,"v"); U.px(7,14,"v")
  legs(L, P, "l","l","L","l")
  U.rect(10,20,18,23,"L"); U.rect(16,20,18,23,"l"); U.rect(14,21,14,23,"l")
  U.rect(10,12,17,19,"L"); U.rect(16,12,17,19,"l"); U.rect(11,14,11,17,"Lh")
  U.line(11,13,16,18,"b"); U.line(16,13,11,18,"b"); U.px(13,15,"Y")
  U.rect(10,19,18,19,"b"); U.px(14,19,"Y")
  U.rect(9,17,9,20,"b"); U.px(9,16,"Y")
  return function()
    U.rect(12,11,16,12,"V"); U.px(16,12,"v"); U.px(11,12,"V")
    arm(U, P, "L","l","l", 2)
    U.rect(15,12,18,13,"L"); U.px(16,12,"Lh")
  end
end }

CLASSES.sacerdote = { weapon = "baculo_sagrado", draw = function(U, L, P)
  robe(L, P, "P","p","Y")
  U.rect(10,12,17,19,"P"); U.rect(16,12,17,19,"p"); U.rect(11,13,11,18,"Ph")
  U.rect(15,11,15,19,"Y"); U.rect(10,19,18,19,"y")
  U.px(12,14,"Y"); U.px(11,15,"Y"); U.px(12,15,"C"); U.px(13,15,"Y"); U.px(12,16,"Y")
  U.rect(10,10,12,12,"P"); U.px(10,10,"Y")
  return function()
    arm(U, P, "P","p","F", 3)
    U.rect(15,12,18,13,"Ph")
  end
end }

local function drawBody(cls, P)
  local G = newGrid()
  local jump = P.jump or 0
  local U = view(G, OX + P.lean, OY + P.u + jump)
  local L = view(G, OX, OY + jump)
  local front = cls.draw(U, L, P)
  head(G, P)
  front()
  return G
end

-- ---------- Armas (se dibujan en la mano, en coordenadas del lienzo) ----------
local function handPoint(P)
  return OX + P.lean + P.hx, OY + P.u + (P.jump or 0) + P.hy
end

local function blade(G, P, guardColor, guardHalf, from, to)
  local cx, cy = handPoint(P)
  local d = DIRS[P.ang]; local dx, dy = d[1], d[2]
  local sx, sy = (dx == 0) and 1 or 0, (dx ~= 0 and dy == 0) and 1 or 0
  if dx ~= 0 and dy ~= 0 then
    -- en diagonal cada pixel avanza ~1.4: acortar para que mida lo mismo que en vertical
    sx, sy = 1, 0
    to = from + math.floor((to - from) * 0.72 + 0.5)
  end
  G.px(cx-dx*2, cy-dy*2, "Y"); G.px(cx-dx, cy-dy, "b")
  for k=-guardHalf,guardHalf do G.px(cx+dx*from-dy*k, cy+dy*from+dx*k, guardColor) end
  for i=from+1,to do
    G.px(cx+dx*i, cy+dy*i, "W")
    if i < to then G.px(cx+dx*i+sx, cy+dy*i+sy, "S") end
  end
end

local function staff(G, P, shaft, shaftLow, topFn)
  local cx, cy = handPoint(P)
  local d = DIRS[P.ang]; local dx, dy = d[1], d[2]
  for i=-12,8 do G.px(cx+dx*i, cy+dy*i, (i < -6) and shaftLow or shaft) end
  topFn(G, cx+dx*11, cy+dy*11, dx, dy)
end

local WEAPONS = {}
WEAPONS.espada = { attack = "attack_melee", draw = function(G, P) blade(G, P, "Y", 2, 2, 13) end }
WEAPONS.daga   = { attack = "attack_melee", draw = function(G, P) blade(G, P, "d", 1, 2, 7) end }
WEAPONS.baculo_arcano = { attack = "attack_melee", draw = function(G, P)
  staff(G, P, "B", "b", function(G, x, y, dx, dy)
    G.px(x-dx*2-dy, y-dy*2+dx, "Y"); G.px(x-dx*2+dy, y-dy*2-dx, "Y")
    G.px(x-dx, y-dy, "c"); G.px(x, y, "C"); G.px(x+dx, y+dy, "Cl")
    G.px(x-dy, y+dx, "C"); G.px(x+dy, y-dx, "c")
  end)
end }
WEAPONS.baculo_sagrado = { attack = "attack_melee", draw = function(G, P)
  staff(G, P, "Y", "y", function(G, x, y)
    for _,o in ipairs({{-1,-2},{0,-2},{1,-2},{-2,-1},{2,-1},{-2,0},{2,0},{-2,1},{2,1},{-1,2},{0,2},{1,2}}) do
      G.px(x+o[1], y+o[2], "Y")
    end
    G.px(x,y-1,"Cl"); G.px(x-1,y,"C"); G.px(x,y,"C"); G.px(x+1,y,"c"); G.px(x,y+1,"c")
  end)
end }
WEAPONS.arco = { attack = "attack_bow", draw = function(G, P)
  local cx, cy = handPoint(P)
  for k=-11,11 do
    local x = cx - 3 + math.floor(3*math.cos(math.pi*k/22) + 0.5)
    G.px(x, cy+k, (math.abs(k) >= 10) and "Y" or "B")
  end
  if P.draw == 1 then
    G.line(cx-3, cy-10, cx-9, cy, "s"); G.line(cx-3, cy+10, cx-9, cy, "s")
    G.line(cx-9, cy, cx+2, cy, "B"); G.px(cx+3, cy, "S"); G.px(cx+4, cy, "S")
    G.px(cx-9, cy-1, "R"); G.px(cx-9, cy+1, "R")
  else
    G.line(cx-3, cy-10, cx-3, cy+10, "s")
  end
end }

-- ---------- Render ----------
local function toImage(G)
  local g, out = G.g, {}
  for y=0,FH-1 do for x=0,FW-1 do
    if not g[y*FW+x] then
      for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
        local nx, ny = x+o[1], y+o[2]
        if nx>=0 and nx<FW and ny>=0 and ny<FH and g[ny*FW+nx] and g[ny*FW+nx] ~= "K" then out[y*FW+x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(FW, FH, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(k % FW, k // FW, C[c]) end
  return img
end

local function makePalette()
  local pal = Palette(#ORDER + 1)
  pal:setColor(0, Color{r=0,g=0,b=0,a=0})
  for i,e in ipairs(ORDER) do pal:setColor(i, C[e[1]]) end
  return pal
end

-- layers: lista {nombre, function(P) -> Grid} de abajo hacia arriba
local function buildSprite(layers, path)
  local spr = Sprite(FW, FH, ColorMode.RGB)
  spr:setPalette(makePalette())
  local lys = {spr.layers[1]}
  for i=2,#layers do lys[i] = spr:newLayer() end
  for i,l in ipairs(layers) do lys[i].name = l[1] end
  for f,P in ipairs(FRAMES) do
    local frame = (f == 1) and spr.frames[1] or spr:newEmptyFrame(f)
    frame.duration = P.dur / 1000
    for i,l in ipairs(layers) do spr:newCel(lys[i], frame, toImage(l[2](P)), Point(0,0)) end
  end
  for _,name in ipairs(TAGS) do
    local from, to
    for f,P in ipairs(FRAMES) do if P.tag == name then from = from or f; to = f end end
    local tag = spr:newTag(from, to); tag.name = name
  end
  spr:saveAs(path)
  spr:close()
end

local dir = app.params.dir
local classNames = {"guerrero","mago","arquero","picaro","sacerdote"}
local weaponNames = {"espada","daga","baculo_arcano","baculo_sagrado","arco"}

for _,name in ipairs(classNames) do
  local cls = CLASSES[name]
  local wpn = WEAPONS[cls.weapon]
  buildSprite({
    {"arma",   function(P) local G = newGrid(); wpn.draw(G, P); return G end},
    {"cuerpo", function(P) return drawBody(cls, P) end},
  }, dir .. "/clases/" .. name .. ".aseprite")
end
for _,name in ipairs(weaponNames) do
  buildSprite({{"arma", function(P) local G = newGrid(); WEAPONS[name].draw(G, P); return G end}},
    dir .. "/armas/" .. name .. ".aseprite")
end

-- ---------- manifest.json ----------
local function q(s) return '"' .. s .. '"' end
local lines = {"{", '  "version": 1,', '  "frameSize": { "w": ' .. FW .. ', "h": ' .. FH .. ' },',
  '  "anchor": { "x": ' .. (OX + 14) .. ', "y": ' .. (GROUND + 1) .. ' },', '  "animations": {'}
for i,name in ipairs(TAGS) do
  local frames, durs = {}, {}
  for f,P in ipairs(FRAMES) do if P.tag == name then frames[#frames+1] = f-1; durs[#durs+1] = P.dur end end
  lines[#lines+1] = string.format('    %s: { "frames": [%s], "durations": [%s], "loop": %s }%s', q(name),
    table.concat(frames, ", "), table.concat(durs, ", "), LOOP[name] and "true" or "false", i < #TAGS and "," or "")
end
lines[#lines+1] = "  },"
lines[#lines+1] = '  "classes": {'
for i,name in ipairs(classNames) do
  lines[#lines+1] = string.format('    %s: { "body": %s, "defaultWeapon": %s }%s', q(name),
    q("clases/" .. name .. ".png"), q(CLASSES[name].weapon), i < #classNames and "," or "")
end
lines[#lines+1] = "  },"
lines[#lines+1] = '  "weapons": {'
for i,name in ipairs(weaponNames) do
  lines[#lines+1] = string.format('    %s: { "sheet": %s, "attack": %s }%s', q(name),
    q("armas/" .. name .. ".png"), q(WEAPONS[name].attack), i < #weaponNames and "," or "")
end
lines[#lines+1] = "  },"
lines[#lines+1] = '  "unarmed": { "attack": "attack_melee" }'
lines[#lines+1] = "}"
local fh = io.open(dir .. "/manifest.json", "w")
fh:write(table.concat(lines, "\n") .. "\n")
fh:close()
