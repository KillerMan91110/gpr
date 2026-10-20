-- Recursos de las Catacumbas del Abismo (mismo estilo y paleta que crear_recursos7.lua), en una hoja
-- aparte para no regenerar las de antes:
--  * recursos8.aseprite y recursos8.png: 32x32, 12 frames = pila de huesos, huesos removidos, setas
--    pálidas, setas cortadas, veta de plata sepulcral, veta picada, candelabro olvidado, candelabro sin
--    cera, pozo de almas, pozo apagado, sarcófago con tesoro y sarcófago vacío
-- Uso: aseprite -b --script-param dir=D:/Sprites/mundo --script crear_recursos8.lua
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
  -- costa: arena, agua baja, coral, algas, ostras, madera de naufragio y nácar
  {"ar1","eedcaa"},{"ar2","d8c28c"},{"ar3","b49c6a"},{"bj1","62c6be"},{"bj2","48aaa6"},{"bjh","b2eedf"},{"es","f2fbf8"},
  {"co1","f2aaa2"},{"co2","d87c7a"},{"co3","f6ece0"},{"co4","a85060"},{"cr1","e05a4a"},{"cr2","a83a32"},
  {"al1","4e8a4a"},{"al2","2e6a36"},{"al3","1e4a2a"},{"os1","8a8c86"},{"os2","5e605c"},{"nc1","f4eef6"},{"nc2","d6cce2"},
  {"md1","a08260"},{"md2","7a6248"},{"md3","514030"},{"mdg","9a948a"},{"pe1","f8f4f0"},{"pe2","d8d0e0"},{"st1o","f08a3a"},{"st2o","c0602a"},
  -- tundra: nieve azulada, hielo eterno, pino blanco, agua helada, runas, madera clara y pescado
  {"tn1","f2f6fc"},{"tn2","d4e0ee"},{"tn3","a8b8cc"},{"ie1","e4f8ff"},{"ie2","a8dcf0"},{"ie3","6aaed0"},{"ie4","3a7aa8"},
  {"ab1","d4e4f0"},{"ab2","a8bed4"},{"ab3","7a92ac"},{"tr1","6a5040"},{"tr2","4a3a34"},
  {"ag1","2a4a6e"},{"ag2","1a2e48"},{"mn1","7e8496"},{"mn2","5e6476"},{"mn3","444a5a"},{"ru1","7af0f8"},{"ru2","3ab0c8"},
  {"pz1","c8d4e0"},{"pz2","8a9cb4"},{"tl1","d8c8a8"},{"tl2","a89474"},{"tl3","786448"},{"fg1","f0f8ff"},{"fg2","b8e0f8"},{"fg3","88b8e0"},
  -- catacumbas: piedra violácea, hueso, hongos que brillan, plata, cera, almas y oro viejo
  {"cs1","8e8898"},{"cs2","706a7c"},{"cs3","524e5e"},{"cs4","383444"},
  {"hu1","ece4cc"},{"hu2","c6ba9a"},{"hu3","8c7e66"},
  {"hgp","c6a2ff"},{"hgd","7a5ab0"},{"hgs","d2c2a0"},{"hg1","a4f4dc"},
  {"sp1","e4e8f2"},{"sp2","a8aec0"},{"sp3","6a7084"},
  {"cw1","f6ecd2"},{"cw2","d2c2a0"},{"sk","4c4a46"},
  {"al1","4cbcdc"},{"al2","2a7eaa"},{"al3","1c5478"},{"alh","c0f6ff"},
  {"go1","ffe08a"},{"go2","c89a2a"},
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


-- pila de huesos: fémures, costillas y cráneos amontonados; removida, unos pocos huesos sueltos
local function bonePile(G, full)
  G.ellipse(16,27,12,3,"cs3")
  local function bone(x0, y0, x1, y1) local n = math.max(math.abs(x1-x0), math.abs(y1-y0)); for i=0,n do G.px(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n, "hu2") end; G.px(x0, y0-1, "hu1"); G.px(x0, y0+1, "hu1"); G.px(x1, y1-1, "hu1"); G.px(x1, y1+1, "hu1") end
  local function skull(x, y) G.ellipse(x, y, 3, 2.5, "hu1"); G.rect(x-2, y+2, x+2, y+3, "hu1"); G.px(x-1, y, "K"); G.px(x+1, y, "K"); G.px(x, y+3, "hu3") end
  if full then
    G.ellipse(16,23,10,5,"hu3"); G.ellipse(16,21,8,4,"hu2")
    bone(8,24,20,18); bone(12,15,24,22); bone(9,19,18,26); bone(18,13,25,17)
    skull(12,18); skull(20,20); skull(16,13)
  else
    bone(8,25,15,23); bone(18,26,24,24); skull(21,22)
  end
end
-- setas pálidas: un grupo de setas lilas que brillan; cortadas, los pies
local function paleMushrooms(G, full)
  G.ellipse(16,27,11,3,"cs3")
  if full then
    for _, p in ipairs({{10,18,4},{17,14,5},{23,19,3},{14,22,3}}) do
      local x, y, r = p[1], p[2], p[3]
      G.rect(x-1, y, x+1, 26, "hgs"); G.ellipse(x, y, r+1, r, "hgd"); G.ellipse(x-0.5, y-1, r, r-1, "hgp")
      G.px(x-1, y-1, "hg1"); G.px(x+2, y, "hg1")
    end
  else
    for _, x in ipairs({10, 14, 17, 23}) do G.rect(x-1, 23, x+1, 26, "hgs"); G.px(x, 23, "hg1") end
  end
end
-- veta de plata sepulcral: piedra oscura con vetas plateadas que brillan; picada, la piedra rota
local function silverVein(G, full)
  G.ellipse(16,27,13,3,"cs3")
  G.ellipse(16,21,12,8,"cs2"); G.ellipse(14,18,9,5,"cs1"); G.ellipse(19,24,7,3,"cs3")
  if full then
    for _, v in ipairs({{8,20,14,15},{15,22,22,16},{11,25,20,21}}) do
      local n = math.max(math.abs(v[3]-v[1]), math.abs(v[4]-v[2]))
      for i=0,n do local x, y = v[1]+(v[3]-v[1])*i/n, v[2]+(v[4]-v[2])*i/n; G.px(x, y, "sp2"); G.px(x, y-1, "sp1") end
    end
    G.px(14,14,"W"); G.px(21,15,"W")
  else
    G.rect(12,16,20,17,"cs3"); for _, x in ipairs({10, 16, 22}) do G.px(x, 21, "sp3") end
  end
end
-- candelabro olvidado: hierro con velas consumidas y cera chorreada; sin cera, el hierro solo
local function oldCandelabrum(G, full)
  G.ellipse(16,28,9,2.5,"cs3")
  G.rect(15,12,17,28,"sk"); G.rect(11,26,21,28,"sk"); G.rect(7,13,25,14,"sk")
  for _, x in ipairs({8, 16, 24}) do G.rect(x-2, 11, x+2, 13, "sk") end
  if full then
    for _, c in ipairs({{8,6},{16,9},{24,5}}) do
      local x, h = c[1], c[2]
      G.rect(x-1, 11-h, x+1, 11, "cw1"); G.px(x+1, 12-h, "cw2"); G.rect(x-2, 12, x-2, 15, "cw2"); G.px(x+2, 13, "cw2")
      G.px(x, 10-h, "fr"); G.px(x, 9-h, "fl")
    end
    G.ellipse(16,27,7,1.5,"cw2")
  end
end
-- pozo de almas: brocal de piedra con agua azul que brilla y una chispa; apagado, el agua oscura
local function soulWell(G, full)
  G.ellipse(16,24,13,6,"cs2"); G.ellipse(16,23,12,5,"cs1")
  G.ellipse(16,23,8,3,full and "al2" or "cs4"); G.ellipse(16,23,6,2,full and "al1" or "cs4")
  G.rect(4,24,28,27,"cs2"); G.rect(4,27,28,28,"cs3"); for x=6,26,5 do G.px(x,25,"cs3") end
  if full then G.px(14,22,"alh"); G.px(18,23,"alh"); G.px(16,16,"alh"); G.px(13,18,"al1"); G.px(19,14,"al1") end
end
-- sarcófago con tesoro: la tapa corrida y monedas de oro adentro; vacío, la caja abierta
local function treasureCoffin(G, full)
  G.ellipse(16,28,14,3,"cs3")
  G.rect(4,14,27,27,"cs2"); G.rect(4,14,27,15,"cs1"); G.rect(26,14,27,27,"cs3"); G.rect(6,16,25,25,"cs4")
  if full then
    G.ellipse(15,22,8,3,"go2"); G.ellipse(14,21,6,2,"go1"); G.px(11,20,"W"); G.px(18,21,"W"); G.px(21,23,"go1")
    G.ellipse(10,19,2,2,"hu1")
  end
  -- la tapa corrida, apoyada en un costado
  G.rect(16,6,29,12,"cs1"); G.rect(16,12,29,13,"cs3"); G.rect(21,8,24,10,"cs2")
end

local KIND = {bonePile, paleMushrooms, silverVein, oldCandelabrum, soulWell, treasureCoffin}
local frames = {}
for _, f in ipairs(KIND) do
  for _, full in ipairs({true, false}) do local G = newGrid(32, 32); f(G, full); frames[#frames + 1] = G end
end
saveFrames(dir .. "/recursos8.aseprite", 32, 32, frames, {{"pila_huesos",1,2},{"setas_palidas",3,4},{"veta_plata",5,6},{"candelabro_olvidado",7,8},{"pozo_almas",9,10},{"sarcofago_tesoro",11,12}})
-- tira horizontal para el juego
local sheet = Image(32 * #frames, 32, ColorMode.RGB)
for i = 1, #frames do
  local f = newGrid(32, 32); KIND[(i + 1) // 2](f, i % 2 == 1)
  sheet:drawImage(toImage(f, true), Point((i - 1) * 32, 0))
end
local out = Sprite(32 * #frames, 32, ColorMode.RGB)
out:newCel(out.layers[1], out.frames[1], sheet, Point(0, 0))
out:saveCopyAs(dir .. "/recursos8.png")
out:close()
