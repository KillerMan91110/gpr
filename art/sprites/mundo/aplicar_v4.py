# Mete el bloque de la ciudad (v4_ciudad.lua) en crear_mundo.lua: colores nuevos, tiles, choque y
# tiles que van por encima del héroe. Los tiles nuevos van al FINAL para no cambiar los ids viejos.
p = 'D:/Sprites/mundo/crear_mundo.lua'
s = open(p, encoding='utf-8').read()
if 'v4_ciudad' in s:
    raise SystemExit('ya aplicado')


def rep(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b, 1)


rep('''  {"N","7a5a3a"},{"M","2e44b0"},
}''', '''  {"N","7a5a3a"},{"M","2e44b0"},
  -- v4 (Aurelia): adoquines, mármol, tejados de colores, yeso y vigas, vidrio, oro, hojas plateadas
  {"k1","e0dccf"},{"k2","bdb6a6"},{"k3","8e8778"},{"k4","6a6458"},
  {"m1","f2ecd8"},{"m2","d6cdb2"},{"m3","a89f84"},
  {"pb","3a5ea8"},{"pbd","26407a"},{"pg","3e7a4a"},{"pgd","28553a"},{"pv","6a4a9a"},{"pvd","48306c"},{"pz","5a6070"},{"pzd","3c404c"},
  {"wp","efe6cf"},{"wpd","cfc3a3"},{"tb","5a3a22"},{"gl","9ad8f0"},{"go","ffd860"},{"god","c89a2a"},
  {"ag","a8d4b8"},{"agd","6aa08c"},{"agh","dcf4e4"},{"wn","ffe9a0"},{"fv","b070e0"},{"n","4e3622"},{"Oh","e08a4a"},{"O","c0602a"},
}''')
block = open('D:/Sprites/mundo/v4_ciudad.lua', encoding='utf-8').read()
rep('local COLLIDE = {', '-- v4_ciudad\n' + block + '\nlocal COLLIDE = {')
rep('''bigCollide("granja", 3, 3, 1); bigCollide("granero", 3, 3, 1); bigCollide("molino", 3, 3, 1); bigCollide("puerta_norte", 4, 3, 0)''',
    '''bigCollide("granja", 3, 3, 1); bigCollide("granero", 3, 3, 1); bigCollide("molino", 3, 3, 1); bigCollide("puerta_norte", 4, 3, 0)
-- v4 (Aurelia)
for m=0,15 do COLLIDE["canal_" .. m] = true end
for _, b in ipairs({{"casa_roja",3,3},{"casa_azul",3,3},{"casa_verde",3,3},{"casa_piedra",3,3},{"casa_alta_a",2,3},{"casa_alta_b",2,3},
  {"posada",4,3},{"cuartel",4,3},{"casa_arqueros",3,3},{"taberna_sombra",3,3},{"capilla",3,3},{"banco",4,3},{"lonja",4,3},
  {"forja_enana",3,3},{"casa_elfica",3,3},{"arbol_plata",3,3}}) do bigCollide(b[1], b[2], b[3], 1) end
bigCollide("torre_arcana", 2, 4, 2); bigCollide("catedral", 6, 6, 2); bigCollide("castillo", 8, 4, 0); bigCollide("torre_muralla", 2, 2, 0)
bigCollide("estatua", 1, 2, 1)
for _, n in ipairs({"muro_v","banco_plaza","maceta","seto","diana","cerca_hierro","puesto_rojo_ai","puesto_rojo_ad","puesto_rojo_bi","puesto_rojo_bd",
  "puesto_verde_ai","puesto_verde_ad","puesto_verde_bi","puesto_verde_bd"}) do COLLIDE[n] = true end''')
rep('''for _, n in ipairs({"granja","granero","molino"}) do for c=0,2 do ABOVE[string.format("%s_0_%d", n, c)] = true end end''',
    '''for _, n in ipairs({"granja","granero","molino"}) do for c=0,2 do ABOVE[string.format("%s_0_%d", n, c)] = true end end
-- v4: tejados y copas de la ciudad
local function aboveRows(name, w, rows) for r=0,rows-1 do for c=0,w-1 do ABOVE[string.format("%s_%d_%d", name, r, c)] = true end end end
for _, b in ipairs({{"casa_roja",3},{"casa_azul",3},{"casa_verde",3},{"casa_piedra",3},{"casa_alta_a",2},{"casa_alta_b",2},
  {"posada",4},{"cuartel",4},{"casa_arqueros",3},{"taberna_sombra",3},{"capilla",3},{"banco",4},{"lonja",4},
  {"forja_enana",3},{"casa_elfica",3},{"arbol_plata",3}}) do aboveRows(b[1], b[2], 1) end
aboveRows("torre_arcana", 2, 2); aboveRows("catedral", 6, 2); aboveRows("estatua", 1, 1)''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
