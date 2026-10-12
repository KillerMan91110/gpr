-- Enemigos de la Pradera Dorada (zona 1). Se dibujan mirando a la derecha y al final se
-- voltean: en combate los heroes estan a la izquierda y los monstruos a la derecha mirandolos.
-- La clave de cada monstruo es su monsters.code en minuscula (LOBO_PRADERA -> lobo_pradera),
-- asi el juego encuentra el sprite sin columnas nuevas en la base.
--
-- Uso: aseprite -b --script-param dir=D:/Sprites/enemigos --script crear_enemigos_zona1.lua
local function hex(s) return Color{r=tonumber(s:sub(1,2),16), g=tonumber(s:sub(3,4),16), b=tonumber(s:sub(5,6),16)} end
local ORDER = {
  {"K","141420"},{"F","e8b48c"},{"f","b97f5c"},{"E","1c2a4a"},{"H","2a2433"},{"h","4a3f5c"},
  {"W","f0f4f8"},{"S","c8d0dc"},{"s","8a96a8"},{"d","555f70"},{"R","c0343a"},{"r","7a1f2a"},
  {"B","8a5530"},{"b","4f2e1c"},{"Y","e8c050"},{"y","a8802c"},{"A","4a5060"},{"a","2e323e"},
  -- lobos
  {"w1","a49c8c"},{"w2","746c60"},{"w3","4a453d"},{"x1","6e5e5a"},{"x2","4a3c3a"},{"x3","2a2020"},{"Re","ff3a2a"},
  -- rata / araña
  {"t1","9a8a78"},{"t2","6a5c4e"},{"t3","45392f"},{"pk","d88a96"},
  {"q1","6a5a80"},{"q2","4a3a5e"},{"q3","08080c"},{"gv","7ad04a"},
  -- goblin
  {"g1","7aa040"},{"g2","4f7028"},{"k1","c8b088"},{"k2","9a8460"},
  -- bandido / chaman / capitan
  {"n1","6a4a3a"},{"n2","4a3226"},{"V1","3e2a52"},{"V2","271a36"},{"Vg","b07aff"},{"gs","8a8f7a"},
  -- titan
  {"o1","a8a090"},{"o2","767060"},{"o3","4c473e"},{"o4","2e2a24"},{"m1","6f9e3c"},{"m2","466a26"},{"gl","ffc040"},
}
local C = {}
for _,e in ipairs(ORDER) do C[e[1]] = hex(e[2]) end

-- ---------- Lienzo ----------
local function newGrid(FW, FH, ground)
  local g = {}
  local G = {g = g, w = FW, h = FH}
  function G.px(x, y, c)
    x, y = math.floor(x + 0.5), math.floor(y + 0.5)
    if x>=0 and x<FW and y>=0 and y<FH and y<=ground then g[y*FW+x] = c end
  end
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
  -- franja clara sobre el lomo de una elipse
  function G.ridge(cx,cy,rx,ry,c,depth)
    for x=math.floor(cx-rx+1),math.ceil(cx+rx-1) do
      local t = (x-cx)/rx
      local top = cy - ry*math.sqrt(math.max(0, 1-t*t))
      for d=1,(depth or 1) do G.px(x, math.ceil(top)+d-1, c) end
    end
  end
  return G
end

local function view(G, dx, dy)
  local V = {}
  function V.px(x,y,c) G.px(x+dx, y+dy, c) end
  function V.rect(x0,y0,x1,y1,c) G.rect(x0+dx,y0+dy,x1+dx,y1+dy,c) end
  function V.line(x0,y0,x1,y1,c) G.line(x0+dx,y0+dy,x1+dx,y1+dy,c) end
  return V
end

-- Contorno + volteo horizontal (los monstruos miran a la izquierda)
local function toImage(G)
  local FW, FH, g, out = G.w, G.h, G.g, {}
  for y=0,FH-1 do for x=0,FW-1 do
    if not g[y*FW+x] then
      for _,o in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
        local nx, ny = x+o[1], y+o[2]
        -- las patas negras de la araña (q3) no llevan contorno: con borde quedaban como una mancha
        local n = g[ny*FW+nx]
        if nx>=0 and nx<FW and ny>=0 and ny<FH and n and n ~= "K" and n ~= "q3" then out[y*FW+x] = true break end
      end
    end
  end end
  for k in pairs(out) do g[k] = "K" end
  local img = Image(FW, FH, ColorMode.RGB)
  for k,c in pairs(g) do img:drawPixel(FW - 1 - (k % FW), k // FW, C[c]) end
  return img
end

-- =====================================================================================
-- Humanoides: mismo esqueleto que los heroes (crear_sprites_v2.lua), 48x48
-- =====================================================================================
local OX, OY = 8, 16
local HERO_FRAMES = {
  idle   = {{hx=25,hy=16,ang="up",u=0,lean=0,legs="stand",dur=400},
            {hx=25,hy=16,ang="up",u=1,lean=0,legs="stand",dur=400}},
  attack = {{hx=19,hy=7, ang="upback", u=0,lean=-1,legs="stand",dur=120},
            {hx=24,hy=9, ang="upfwd",  u=0,lean=1, legs="lunge",dur=80},
            {hx=27,hy=15,ang="downfwd",u=1,lean=2, legs="lunge",dur=180},
            {hx=25,hy=15,ang="upfwd",  u=0,lean=1, legs="lunge",dur=200}},
  cast   = {{hx=23,hy=9, ang="up",   u=0,lean=0,legs="stand",dur=150},
            {hx=24,hy=5, ang="up",   u=0,lean=0,legs="stand",dur=350},
            {hx=26,hy=12,ang="upfwd",u=0,lean=1,legs="lunge",dur=200}},
  hurt   = {{hx=22,hy=16,ang="up",u=1,lean=-2,legs="stand",dur=250,pain=true}},
  die    = {{hx=23,hy=19,ang="downfwd",u=3,lean=1,legs="kneel",dur=200,pain=true},
            {hx=24,hy=23,ang="fwd",u=5,lean=2,legs="kneel",dur=1000,pain=true,headDown=1}},
}
local DIRS = {up={0,-1}, upfwd={1,-1}, fwd={1,0}, downfwd={1,1}, upback={-1,-1}}

local function headView(G, P)
  local hd = P.headDown or 0
  return view(G, OX + P.lean + hd, OY + P.u + (P.jump or 0) + hd)
end

local function head(G, P)
  local V = headView(G, P)
  V.rect(13,6,18,10,"F"); V.rect(13,6,13,10,"f")
  if P.pain then V.px(16,9,"E"); V.px(17,9,"E") else V.px(17,8,"E"); V.px(17,9,"E") end
  V.px(16,10,"f"); V.px(17,10,"f"); V.px(18,10,nil)
  V.rect(11,3,17,5,"H"); V.rect(10,4,12,9,"H"); V.px(11,10,"H")
  V.rect(14,6,18,6,"H"); V.px(18,5,"H"); V.px(19,6,"H"); V.px(15,7,"H"); V.px(18,7,"H")
  V.px(12,8,"F"); V.px(12,9,"f")
  V.rect(13,11,15,11,"f")
  return V
end

local function legs(L, P, pants, pantsD, boot, bootD)
  if P.legs == "lunge" then
    L.rect(10,22,12,27,pantsD); L.rect(9,28,12,29,bootD)
    L.rect(15,22,17,23,pants); L.rect(16,24,18,27,pants); L.rect(16,28,20,29,boot); L.rect(16,29,20,29,bootD)
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
  if P.legs == "stand" then L.rect(12,29,14,29,"n2"); L.rect(16,29,18,29,"n2")
  elseif P.legs == "lunge" then L.rect(11,29,13,29,"n2"); L.rect(17,29,20,29,"n2") end
end

local function arm(U, P, sleeve, sleeveD, hand, thick)
  for t=0,thick-1 do U.line(18, 13+t, P.hx, P.hy+t-1, (t == thick-1) and sleeveD or sleeve) end
  U.rect(P.hx-1, P.hy-1, P.hx+1, P.hy+1, hand)
end

local function handPoint(P) return OX + P.lean + P.hx, OY + P.u + (P.jump or 0) + P.hy end

local function blade(G, P, guardColor, guardHalf, from, to, edge, side)
  local cx, cy = handPoint(P)
  local d = DIRS[P.ang]; local dx, dy = d[1], d[2]
  local sx, sy = (dx == 0) and 1 or 0, (dx ~= 0 and dy == 0) and 1 or 0
  if dx ~= 0 and dy ~= 0 then sx, sy = 1, 0; to = from + math.floor((to - from) * 0.72 + 0.5) end
  G.px(cx-dx*2, cy-dy*2, "y"); G.px(cx-dx, cy-dy, "b")
  for k=-guardHalf,guardHalf do G.px(cx+dx*from-dy*k, cy+dy*from+dx*k, guardColor) end
  for i=from+1,to do
    G.px(cx+dx*i, cy+dy*i, edge)
    if i < to then G.px(cx+dx*i+sx, cy+dy*i+sy, side) end
  end
end

local HUMANOIDS = {}

HUMANOIDS.bandido_corrupto = {
  weapon = function(G, P) blade(G, P, "d", 1, 2, 8, "S", "s") end,  -- daga gastada
  draw = function(U, L, G, P)
    U.rect(8,12,10,21,"n2"); U.px(8,22,"n2"); U.px(10,22,"n2")                 -- capa raida
    legs(L, P, "A","a","n2","b")
    U.rect(10,20,18,21,"n1"); U.px(11,22,"n1"); U.px(14,22,"n1"); U.px(17,22,"n1")
    U.rect(10,12,17,19,"n1"); U.rect(16,12,17,19,"n2"); U.rect(12,13,15,18,"b")
    U.rect(10,19,18,19,"a"); U.px(13,19,"s")
    local V = head(G, P)
    V.rect(10,2,17,5,"n2"); V.rect(10,2,12,11,"n2"); V.px(18,4,"n2"); V.px(18,5,"n2")  -- capucha
    V.rect(13,9,18,10,"r"); V.px(19,9,"r"); V.px(14,10,"R")                       -- mascara
    return function() arm(U, P, "n1","n2","F", 2); U.rect(15,12,18,13,"n2") end
  end,
}

HUMANOIDS.chaman_oscuro = {
  weapon = function(G, P)                                                        -- baculo con calavera
    local cx, cy = handPoint(P)
    local d = DIRS[P.ang]; local dx, dy = d[1], d[2]
    for i=-12,7 do G.px(cx+dx*i, cy+dy*i, (i < -6) and "n2" or "b") end
    local x, y = cx+dx*10, cy+dy*10
    G.rect(x-2, y-2, x+2, y+1, "W"); G.rect(x-1, y+2, x+1, y+2, "S")
    G.px(x-1, y-1, "Vg"); G.px(x+1, y-1, "Vg"); G.px(x, y+1, "K")
  end,
  draw = function(U, L, G, P)
    robe(L, P, "V1","V2","s")
    U.rect(10,12,17,19,"V1"); U.rect(16,12,17,19,"V2")
    U.px(12,13,"W"); U.px(13,14,"S"); U.px(14,13,"W"); U.px(15,14,"S")            -- collar de huesos
    U.rect(10,19,18,19,"n2")
    local V = head(G, P)
    V.rect(13,6,18,10,"gs"); V.rect(13,6,13,10,"o3")                              -- rostro en sombra
    if P.pain then V.px(16,9,"Vg"); V.px(17,9,"Vg") else V.px(15,8,"Vg"); V.px(17,8,"Vg") end
    V.rect(10,1,17,5,"V1"); V.rect(9,3,12,12,"V1"); V.rect(18,3,19,7,"V1")       -- capucha profunda
    V.px(19,8,"V1"); V.rect(11,2,15,2,"V2"); V.rect(9,6,10,12,"V2")
    return function() arm(U, P, "V1","V2","gs", 3); U.rect(15,12,18,13,"V2") end
  end,
}

HUMANOIDS.capitan_lobos = {
  weapon = function(G, P) blade(G, P, "y", 2, 2, 14, "W", "S") end,             -- espadon
  draw = function(U, L, G, P)
    U.rect(6,11,10,25,"w2"); U.rect(6,11,6,25,"w3"); U.px(5,25,"w2"); U.px(8,26,"w2")  -- capa de piel
    legs(L, P, "a","a","b","a")
    U.rect(10,20,18,22,"b"); U.rect(16,20,18,22,"n2")
    U.rect(10,12,17,19,"A"); U.rect(16,12,17,19,"a"); U.rect(11,14,12,16,"s")
    U.line(10,13,17,18,"b"); U.rect(10,19,18,19,"b"); U.px(14,19,"Y")
    local V = head(G, P)
    V.rect(10,1,18,5,"w2"); V.rect(9,3,11,11,"w2"); V.rect(16,2,21,5,"w2")      -- cabeza de lobo
    V.rect(17,2,21,3,"w1"); V.px(21,3,"K"); V.px(18,1,"Y")
    V.rect(11,0,12,0,"w2"); V.px(14,0,"w2"); V.px(11,1,"w3")
    V.px(17,6,"W"); V.px(20,6,"W")                                                 -- colmillos
    V.px(14,8,"r"); V.px(15,9,"r")                                                 -- cicatriz
    return function()
      arm(U, P, "A","a","a", 2)
      U.rect(9,10,19,13,"w1"); U.rect(9,13,19,13,"w2"); U.px(10,9,"w1"); U.px(13,9,"w1"); U.px(17,9,"w1")
    end
  end,
}

local function humanoidFrame(def, P)
  local G = newGrid(48, 48, OY + 29)
  local jump = P.jump or 0
  def.weapon(G, P)
  local U = view(G, OX + P.lean, OY + P.u + jump)
  local L = view(G, OX, OY + jump)
  local front = def.draw(U, L, G, P)
  front()
  return G
end

-- =====================================================================================
-- Bestias y criaturas propias (48x48, suelo en la fila 45)
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

local function rat(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.line(13,42,7,43,"pk"); G.line(7,43,3,41,"pk")
    G.ellipse(21,42,9,3,"t1"); G.ellipse(21,41,9,2,"t2")
    for _,x in ipairs({16,19,24,27}) do G.line(x,39,x-1,36,"t3") end
    G.ellipse(31,42,4,3,"t2"); G.rect(34,42,36,43,"t1"); G.px(37,43,"pk")
    G.px(31,41,"K"); G.px(32,42,"K"); G.px(30,42,"K")
    return G
  end
  G.line(13+dx,40+b,8+dx,41,"pk"); G.line(8+dx,41,4+dx,39,"pk"); G.line(4+dx,39,2+dx,35-(P.tail or 0),"pk")
  G.rect(15+dx,43,16+dx,45,"t3"); G.rect(26+dx+(P.reach or 0),43,27+dx+(P.reach or 0),45,"t3")
  G.ellipse(21+dx, 39+b, 9, 5, "t2"); G.ridge(21+dx, 39+b, 9, 5, "t1", 2)
  G.rect(18+dx,43,19+dx,45,"t2"); G.rect(29+dx+(P.reach or 0),43,30+dx+(P.reach or 0),45,"t2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.ellipse(31+hx, 38+hy, 5, 4, "t2"); G.rect(34+hx, 37+hy, 37+hx, 39+hy, "t1"); G.px(38+hx, 38+hy, "pk")
  G.ellipse(29+hx, 33+hy, 2, 2, "t2"); G.px(29+hx, 33+hy, "pk"); G.px(29+hx, 34+hy, "pk")
  if P.pain then G.px(32+hx,36+hy,"K"); G.px(33+hx,36+hy,"K") else G.px(33+hx, 36+hy, "R") end
  G.px(36+hx, 40+hy, "W"); G.px(37+hx, 40+hy, "W")
  if P.bite then G.px(36+hx, 41+hy, "W"); G.px(37+hx, 41+hy, "W"); G.px(38+hx,40+hy,"r") end
  return G
end

local function spider(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  local function leg(ax, ay, kx, ky, fx, fy, c) G.line(ax, ay, kx, ky, c); G.line(kx, ky, fx, fy, c) end
  if P.dead then
    G.ellipse(18,41,9,4,"q2"); G.ellipse(28,42,5,3,"q2")
    for i,x in ipairs({14,19,24,29}) do leg(x,38,x-2+i,33,x+1,36,"q3") end
    G.px(15,40,"gv"); G.px(18,39,"gv"); G.px(21,40,"gv"); G.px(32,41,"K"); G.px(31,42,"K")
    return G
  end
  local knees = P.knees or {{20,27},{24,26},{32,27},{36,29}}
  local feet  = P.feet  or {{14,45},{21,45},{33,45},{41,45}}
  local att = {24,26,28,30}
  -- patas negras y DETRAS del cuerpo: encima se mezclaban con el abdomen
  for i=1,4 do leg(att[i]-3+dx, 36+b, knees[i][1]-4+dx, knees[i][2]-2+b, feet[i][1]-5+dx, feet[i][2], "q3") end
  for i=1,4 do leg(att[i]+dx, 37+b, knees[i][1]+dx, knees[i][2]+b, feet[i][1]+dx, feet[i][2], "q3") end
  G.ellipse(17+dx, 33+b, 9, 7, "q2"); G.ridge(17+dx, 33+b, 9, 7, "q1", 2)
  G.px(14+dx,31+b,"gv"); G.px(16+dx,30+b,"gv"); G.px(18+dx,31+b,"gv"); G.px(16+dx,33+b,"gv"); G.px(16+dx,35+b,"gv")
  G.ellipse(28+dx, 36+b, 5, 4, "q2"); G.ridge(28+dx, 36+b, 5, 4, "q1")
  if P.pain then G.px(31+dx,35+b,"K"); G.px(32+dx,35+b,"K")
  else G.px(31+dx,34+b,"Re"); G.px(32+dx,35+b,"Re"); G.px(31+dx,36+b,"Re"); G.px(30+dx,35+b,"Re") end
  G.px(33+dx,38+b,"W"); G.px(33+dx,39+b,"W")
  if P.bite then G.px(33+dx,40+b,"gv"); G.px(34+dx,41+b,"gv") end
  return G
end

local function goblin(P)
  local G = newGrid(48, 48, 45)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(11,42,4,3,"k2"); G.ellipse(11,41,3,2,"k1"); G.px(7,45,"Y"); G.px(9,45,"Y"); G.px(5,44,"Y")
    G.ellipse(22,42,7,3,"B"); G.rect(16,43,28,43,"b")
    G.ellipse(31,41,4,3,"g1"); G.line(28,39,25,36,"g1"); G.px(34,41,"g1"); G.px(35,42,"g2")
    G.px(31,40,"K"); G.px(32,41,"K"); G.px(30,41,"K")
    G.line(36,44,41,44,"s")
    return G
  end
  G.ellipse(14+dx, 35+b, 5, 5, "k2"); G.ellipse(13+dx, 34+b, 4, 4, "k1"); G.px(16+dx,30+b,"b"); G.px(17+dx,31+b,"b")
  local fl = P.lunge and 2 or 0
  G.rect(19+dx,41,20+dx,44,"g2"); G.rect(18+dx,45,21+dx,45,"b")
  G.rect(23+dx+fl,41,24+dx+fl,44,"g1"); G.rect(23+dx+fl,45,26+dx+fl,45,"b")
  G.rect(18+dx,34+b,25+dx,40+b,"B"); G.rect(23+dx,34+b,25+dx,40+b,"b")
  G.px(18+dx,41+b,"B"); G.px(21+dx,41+b,"B"); G.px(24+dx,41+b,"B"); G.rect(18+dx,38+b,25+dx,38+b,"n2")
  local hx, hy = dx + (P.hx or 0), b + (P.hy or 0)
  G.thick(19+hx, 28+hy, 13+hx, 24+hy, 2, "g1"); G.px(13+hx,24+hy,"g2")
  G.ellipse(23+hx, 29+hy, 5, 4, "g1"); G.rect(19+hx,31+hy,22+hx,32+hy,"g2")
  G.thick(27+hx, 27+hy, 31+hx, 24+hy, 2, "g1")
  G.px(28+hx,29+hy,"g1"); G.px(29+hx,30+hy,"g2"); G.px(28+hx,30+hy,"g1")
  if P.pain then G.px(24+hx,28+hy,"K"); G.px(25+hx,28+hy,"K")
  else G.px(25+hx,28+hy,"Y"); G.px(26+hx,28+hy,"K") end
  G.px(24+hx,31+hy,"K"); G.px(25+hx,31+hy,"W"); G.px(26+hx,31+hy,"K")
  local hand = P.hand or {28,37}
  G.thick(24+dx, 35+b, hand[1]+dx, hand[2]+b, 2, "g1")
  local wx, wy = hand[1]+dx, hand[2]+b
  local d = P.stab and {1,0} or {1,-1}
  for i=2,6 do G.px(wx+d[1]*i, wy+d[2]*i, (i == 6) and "S" or "s") end
  G.px(wx+d[1], wy+d[2], "d")
  G.rect(wx-1, wy-1, wx, wy, "g1")
  return G
end

-- Titan de la Pradera: gigante de piedra con musgo, 64x64 (suelo en la fila 61)
local function titan(P)
  local G = newGrid(64, 64, 61)
  local dx, b = P.dx or 0, P.bob or 0
  if P.dead then
    G.ellipse(20,57,9,5,"o3"); G.ellipse(34,55,11,7,"o2"); G.ellipse(47,58,7,4,"o3")
    G.ridge(34,55,11,7,"o1",2); G.ellipse(30,50,5,3,"m1"); G.px(28,47,"m2"); G.px(31,47,"m2")
    G.line(26,55,32,60,"o4"); G.line(40,52,43,58,"o4"); G.px(36,53,"y")
    G.px(10,60,"o2"); G.px(56,60,"o2"); G.px(54,59,"o1")
    return G
  end
  local kneel = P.kneel and 6 or 0
  G.thick(18+dx, 30+b, 14+dx, 46+b, 5, "o3"); G.ellipse(14+dx, 48+b, 4, 4, "o3")       -- brazo trasero
  G.rect(18+dx,46+kneel,24+dx,60,"o3"); G.rect(16+dx,59,25+dx,61,"o4")
  G.rect(30+dx,46+kneel,37+dx,60,"o2"); G.rect(29+dx,59,39+dx,61,"o3")
  G.ellipse(28+dx, 36+b+kneel, 16, 13, "o2"); G.ridge(28+dx, 36+b+kneel, 16, 13, "o1", 3)
  G.line(22+dx,34+b+kneel,26+dx,42+b+kneel,"o4"); G.line(34+dx,38+b+kneel,31+dx,45+b+kneel,"o4")
  G.ellipse(18+dx, 25+b+kneel, 7, 3, "m1"); G.ellipse(38+dx, 24+b+kneel, 7, 3, "m1")
  G.px(15+dx,22+b+kneel,"m2"); G.px(18+dx,21+b+kneel,"m2"); G.px(36+dx,21+b+kneel,"m2"); G.px(40+dx,20+b+kneel,"m2")
  local hx, hy = 33+dx, 20+b+kneel
  G.ellipse(hx, hy, 6, 5, "o1"); G.rect(hx-5, hy-1, hx+6, hy-1, "o3")
  local eye = P.pain and "o4" or "gl"
  G.rect(hx+1, hy, hx+2, hy, eye); G.rect(hx+4, hy, hx+5, hy, eye)
  G.rect(hx+1, hy+3, hx+4, hy+3, "o4")
  local hand = P.hand or {44,46}
  G.thick(40+dx, 28+b+kneel, hand[1]+dx, hand[2]+b, 6, "o2")
  G.ellipse(hand[1]+dx, hand[2]+b, 5, 5, "o1"); G.ridge(hand[1]+dx, hand[2]+b, 5, 5, "m1")
  G.px(hand[1]+dx-1, hand[2]+b+1, "o4"); G.px(hand[1]+dx+1, hand[2]+b+2, "o4")
  if P.slam then
    for _,p in ipairs({{54,60},{57,58},{59,61},{51,58},{60,56}}) do G.px(p[1], p[2], "o1") end
    G.px(56,61,"o3"); G.px(58,59,"o3")
  end
  return G
end

-- =====================================================================================
-- Definicion de cada monstruo: animaciones -> lista de poses
-- =====================================================================================
local WOLF_PAL  = {L="w1", M="w2", D="w3", eye="Y"}
local FERAL_PAL = {L="x1", M="x2", D="x3", eye="Re", spiky=true, scar=true}
local WOLF_ANIMS = {
  idle   = {{bob=0,dur=400},{bob=1,tail=2,dur=400}},
  attack = {{bob=2,hx=-1,hy=2,dur=200},
            {dx=5,bob=-2,bite=true,feet={{10,44},{13,44},{40,40},{37,42}},dur=120},
            {dx=2,bob=0,dur=220}},
  hurt   = {{dx=-2,hy=-2,pain=true,dur=250}},
  die    = {{bob=4,pain=true,dur=200},{dead=true,dur=1000}},
}

local MONSTERS = {
  {key="lobo_pradera", name="Lobo de Pradera", rank="comun", size=48, draw=wolf(WOLF_PAL),  anims=WOLF_ANIMS},
  {key="lobo_feroz", name="Lobo Feroz", rank="raro", size=48, draw=wolf(FERAL_PAL), anims=WOLF_ANIMS},
  {key="rata_alcantarilla", name="Rata de Alcantarilla", rank="comun", size=48, draw=rat, anims={
    idle   = {{bob=0,dur=300},{bob=0,hy=1,tail=2,dur=300}},
    attack = {{bob=1,hx=-2,dur=180},{dx=6,bob=-1,bite=true,reach=2,dur=120},{dx=2,dur=200}},
    hurt   = {{dx=-2,hy=-1,pain=true,dur=250}},
    die    = {{bob=2,pain=true,dur=200},{dead=true,dur=1000}},
  }},
  {key="arana_venenosa", name="Araña Venenosa", rank="comun", size=48, draw=spider, anims={
    idle   = {{bob=0,dur=350},{bob=1,dur=350}},
    attack = {{bob=-2,knees={{20,27},{24,26},{34,24},{38,22}},feet={{14,45},{21,45},{40,28},{44,26}},dur=200},
              {dx=4,bob=-1,bite=true,knees={{20,27},{24,26},{36,26},{40,25}},feet={{14,45},{21,45},{44,33},{46,31}},dur=130},
              {dx=1,dur=200}},
    hurt   = {{dx=-2,bob=-1,pain=true,dur=250}},
    die    = {{bob=4,pain=true,dur=200},{dead=true,dur=1000}},
  }},
  {key="goblin_saqueador", name="Goblin Saqueador", rank="comun", size=48, draw=goblin, anims={
    idle   = {{bob=0,dur=350},{bob=1,dur=350}},
    attack = {{hand={24,30},hy=-1,dur=180},{dx=4,lunge=true,stab=true,hand={32,36},dur=120},{dx=1,hand={29,36},dur=200}},
    hurt   = {{dx=-2,hy=-1,pain=true,hand={26,38},dur=250}},
    die    = {{bob=3,pain=true,dur=200},{dead=true,dur=1000}},
  }},
  {key="bandido_corrupto", name="Bandido Corrupto", rank="comun", size=48, humanoid=HUMANOIDS.bandido_corrupto},
  {key="chaman_oscuro", name="Chamán Oscuro", rank="raro", size=48, humanoid=HUMANOIDS.chaman_oscuro, cast=true},
  {key="capitan_lobos", name="Capitán de los Lobos", rank="miniboss", size=48, humanoid=HUMANOIDS.capitan_lobos, cast=true},
  {key="titan_pradera", name="Titán de la Pradera", rank="jefe", size=64, draw=titan, anims={
    idle   = {{bob=0,dur=500},{bob=1,dur=500}},
    attack = {{hand={40,10},bob=-1,dur=300},{hand={50,56},dx=2,bob=2,slam=true,dur=160},{hand={46,48},dur=300}},
    hurt   = {{dx=-2,pain=true,dur=300}},
    die    = {{kneel=true,pain=true,hand={46,56},dur=300},{dead=true,dur=1200}},
  }},
}
local ANIM_ORDER = {"idle","attack","cast","hurt","die"}
local LOOP = {idle=true}

local function makePalette()
  local pal = Palette(#ORDER + 1)
  pal:setColor(0, Color{r=0,g=0,b=0,a=0})
  for i,e in ipairs(ORDER) do pal:setColor(i, C[e[1]]) end
  return pal
end

local dir = app.params.dir
local manifest = {}
for _,m in ipairs(MONSTERS) do
  local anims = m.anims
  local render = m.draw
  if m.humanoid then
    anims = {idle=HERO_FRAMES.idle, attack=HERO_FRAMES.attack, hurt=HERO_FRAMES.hurt, die=HERO_FRAMES.die}
    if m.cast then anims.cast = HERO_FRAMES.cast end
    render = function(P) return humanoidFrame(m.humanoid, P) end
  end
  local spr = Sprite(m.size, m.size, ColorMode.RGB)
  spr:setPalette(makePalette())
  spr.layers[1].name = "cuerpo"
  local f, entry = 0, {}
  for _,name in ipairs(ANIM_ORDER) do
    local poses = anims[name]
    if poses then
      local from = f + 1
      local frames, durs = {}, {}
      for _,P in ipairs(poses) do
        f = f + 1
        local frame = (f == 1) and spr.frames[1] or spr:newEmptyFrame(f)
        frame.duration = P.dur / 1000
        spr:newCel(spr.layers[1], frame, toImage(render(P)), Point(0,0))
        frames[#frames+1] = f - 1; durs[#durs+1] = P.dur
      end
      local tag = spr:newTag(from, f); tag.name = name
      entry[#entry+1] = string.format('"%s": { "frames": [%s], "durations": [%s], "loop": %s }',
        name, table.concat(frames, ", "), table.concat(durs, ", "), LOOP[name] and "true" or "false")
    end
  end
  spr:saveAs(dir .. "/zona1/" .. m.key .. ".aseprite")
  spr:close()
  manifest[#manifest+1] = string.format(
    '    "%s": {\n      "name": "%s",\n      "rank": "' .. m.rank .. '",\n      "sheet": "enemigos/%s.png",\n      "frameSize": { "w": %d, "h": %d },\n      "anchor": { "x": %d, "y": %d },\n      "animations": {\n        %s\n      }\n    }',
    m.key:upper(), m.name, m.key, m.size, m.size, m.size // 2, m.size - 2, table.concat(entry, ",\n        "))
end

local fh = io.open(dir .. "/enemigos.json", "w")
fh:write('{\n  "version": 1,\n  "facing": "left",\n  "monsters": {\n' .. table.concat(manifest, ",\n") .. '\n  }\n}\n')
fh:close()
