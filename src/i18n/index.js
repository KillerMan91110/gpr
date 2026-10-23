// Idioma del juego. El juego se escribe en español; en inglés, un observador cambia los textos que aparecen en
// pantalla por su traducción al vuelo: no toca la lógica ni el estado de React, así que nada del juego cambia de
// comportamiento. Etapa 1, la interfaz (en.js); etapa 2, el contenido: clases, habilidades y el registro del combate
// (en_contenido.js y las reglas por frase de reglas.js, que se descargan solo en inglés). Lo que no está en el
// diccionario (diálogos, objetos, misiones, monstruos, lo que escriben los jugadores) se queda en español. Para que algo no se traduzca: data-no-traducir en su elemento
// (no translate="no": ese lo lleva toda la página, en public/index.html, para que el navegador no la traduzca solo).
import Phaser from 'phaser';
import { fijos, patrones } from './en';

const CLAVE = 'idioma';
export const IDIOMAS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export function idiomaActual() {
  try { return localStorage.getItem(CLAVE) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
}

// cambiar de idioma recarga la página: así todo se vuelve a dibujar desde cero en el idioma nuevo
export function cambiarIdioma(code) {
  if (code === idiomaActual()) return;
  try { localStorage.setItem(CLAVE, code); } catch { /* sin guardar */ }
  window.location.reload();
}

// ---- traducción de un texto ----
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compilar = (lista) => [...lista]
  .sort((a, b) => b[0].replace(/\{\d\}/g, '').length - a[0].replace(/\{\d\}/g, '').length)
  .map(([es, en]) => {
  const partes = es.split(/\{(\d)\}/);
  let src = '^';
  const orden = [];
  partes.forEach((p, i) => {
    if (i % 2 === 0) src += reEscape(p);
    // puede venir vacío («{0} · Rango {1}{2}» sin título al final)
    else { src += '([\\s\\S]*?)'; orden.push(Number(p)); }
  });
  return { re: new RegExp(`${src}$`), orden, en };
  });
// el contenido (etapa 2) se suma a estos cuando llega
const FIJOS = { ...fijos };
let PATRONES = compilar(patrones);
let REGLAS = [];

// lo de adentro de un patrón ({0}) también se traduce si es un texto conocido (p. ej. «Velocidad aumentada»)
const fijo = (s) => FIJOS[s] ?? s;

function traducirNucleo(s) {
  if (FIJOS[s] != null) return FIJOS[s];
  for (const p of PATRONES) {
    const m = s.match(p.re);
    if (!m) continue;
    const vals = {};
    p.orden.forEach((n, i) => { vals[n] = fijo(m[i + 1]); });
    return p.en.replace(/\{(\d)\}/g, (_, n) => vals[n] ?? '');
  }
  return null;
}

// adornos alrededor (emojis, ✔, ▶, «», dos puntos…) y espacios se conservan; se traduce lo de adentro
const BORDES = /^([^\p{L}\p{N}¿¡«{]*)([\s\S]*?)([^\p{L}\p{N}»?!.)}]*)$/u;
// lo ya traducido se recuerda (el HUD y el combate repiten los mismos textos todo el tiempo)
const MEMORIA = new Map();
export function traducir(texto) {
  if (!texto || !/\p{L}/u.test(texto)) return texto;
  const ya = MEMORIA.get(texto);
  if (ya !== undefined) return ya;
  const r = traducirSinMemoria(texto);
  if (MEMORIA.size > 8000) MEMORIA.clear();
  MEMORIA.set(texto, r);
  return r;
}
function traducirSinMemoria(texto) {
  const compacto = texto.replace(/\s+/g, ' ');
  const lead = compacto.match(/^\s*/)[0];
  const trail = compacto.match(/\s*$/)[0];
  const s = compacto.trim();
  let t = traducirNucleo(s) ?? conBordes(s);
  if (t == null) {
    // «Mochila (I)», «Clase: Mago»: se traduce cada parte conocida
    let m = s.match(/^(.+?) \(([^()]+)\)$/);
    if (m && FIJOS[m[1]]) t = `${FIJOS[m[1]]} (${traducirTodo(m[2])})`;
    m = t == null && s.match(/^([^:]+): (.+)$/);
    if (m && FIJOS[m[1]]) t = `${FIJOS[m[1]]}: ${traducirTodo(m[2])}`;
    // varias partes juntas con «·» («Clic derecho: equipar · Mayús + clic: poner candado»): cada una por su lado
    if (t == null && s.includes(' · ')) {
      const partes = s.split(' · ');
      const en = partes.map((p) => traducirNucleo(p) ?? conBordes(p) ?? p);
      if (en.some((p, i) => p !== partes[i])) t = en.join(' · ');
    }
    // objetos con su mejora o su cantidad: «Espada del Volcán +3», «Poción de Vida Menor ×5», «2x Carbón»
    m = t == null && (s.match(/^(.+?)( [+x×]\d+)$/) || s.match(/^(\d+ ?[x×] )(.+)$/));
    if (m) {
      const [a, b] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
      const n = traducirNucleo(b);
      if (n != null) t = /^\d/.test(m[1]) ? a + n : n + a;
    }
  }
  if (t == null && REGLAS.length) {
    const out = aplicarReglas(s);
    if (out !== s) t = out;
  } else if (t != null && REGLAS.length) {
    // lo que quedó en español adentro de una frase ya traducida (la rareza del monstruo: «· Poco Común»)
    t = soloReglas(t);
  }
  return t == null ? texto : lead + t + trail;
}

// lo de adentro de los adornos («El Primer Fuego» → «The First Fire»)
function conBordes(s) {
  const m = s.match(BORDES);
  if (!m || !m[2]) return null;
  let n = m[1] || m[3] ? traducirNucleo(m[2]) : null;
  // un nombre entre comillas: « · «El Primer Fuego»» (el título de un logro en el ranking)
  const q = n == null && m[2].match(/^«([^«»]+)»$/);
  if (q && traducirNucleo(q[1]) != null) n = `«${traducirNucleo(q[1])}»`;
  return n == null ? null : m[1] + n + m[3];
}

const traducirTodo = (x) => traducirNucleo(x) ?? (REGLAS.length ? aplicarReglas(x) : x);
const soloReglas = (s) => REGLAS.reduce((out, [re, rep]) => out.replace(re, rep), s);

// frases armadas por partes (registro del combate, efectos): primero cada oración conocida se cambia entera (la
// más larga que se encuentre), después cada regla cambia un pedazo conocido
function aplicarReglas(s) {
  const frases = s.split(/(?<=[.!?…])\s+(?=[¡¿«\p{Lu}])/u);
  const partes = [];
  for (let i = 0; i < frases.length;) {
    let j = frases.length;
    for (; j > i; j--) {
      const n = traducirNucleo(frases.slice(i, j).join(' '));
      if (n != null) { partes.push(n); break; }
    }
    if (j > i) i = j;
    else { partes.push(frases[i]); i += 1; }
  }
  return soloReglas(partes.join(' '));
}

// etapa 2: el contenido del juego (se descarga aparte, solo en inglés) y una pasada más por la página
function cargarContenido() {
  Promise.all([import('./en_contenido'), import('./reglas')]).then(([c, r]) => {
    Object.assign(FIJOS, c.fijos);
    PATRONES = compilar([...patrones, ...c.patrones]);
    const parte = (x) => traducirNucleo(String(x).trim()) ?? x;
    REGLAS = r.crearReglas(parte);
    MEMORIA.clear(); // lo que se recordó sin el contenido
    traducirArbol(document.body);
  }).catch(() => { /* sin el contenido queda solo la interfaz */ });
}

// ---- traducción de la página ----
const ATRIBUTOS = ['title', 'placeholder', 'aria-label', 'alt'];
// el texto de los diálogos de los NPC tampoco (etapa 3): se escribe letra por letra y cada letra sería una pasada
const NO = 'SCRIPT,STYLE,TEXTAREA,CODE,[data-no-traducir],.dlg-text';
const saltar = (el) => !el || !!el.closest?.(NO) || el.isContentEditable;

function traducirTexto(nodo) {
  if (saltar(nodo.parentElement)) return;
  const v = nodo.nodeValue;
  const t = traducir(v);
  if (t !== v) nodo.nodeValue = t;
}

function traducirAtributos(el) {
  if (saltar(el)) return;
  for (const a of ATRIBUTOS) {
    const v = el.getAttribute?.(a);
    if (!v) continue;
    const t = traducir(v);
    if (t !== v) el.setAttribute(a, t);
  }
}

function traducirArbol(raiz) {
  if (raiz.nodeType === Node.TEXT_NODE) { traducirTexto(raiz); return; }
  if (raiz.nodeType !== Node.ELEMENT_NODE || saltar(raiz)) return;
  traducirAtributos(raiz);
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) traducirTexto(n);
    else traducirAtributos(n);
  }
}

let iniciado = false;
export function iniciarTraduccion() {
  document.documentElement.lang = idiomaActual();
  if (idiomaActual() !== 'en' || iniciado || typeof MutationObserver === 'undefined') return;
  iniciado = true;
  // los textos que el juego dibuja en el mapa y en el combate (¡Crítico!, carteles): Phaser pasa todo por setText
  const setText = Phaser.GameObjects.Text.prototype.setText;
  Phaser.GameObjects.Text.prototype.setText = function setTextTraducido(value) {
    const v = typeof value === 'string' ? traducir(value) : Array.isArray(value) ? value.map((x) => (typeof x === 'string' ? traducir(x) : x)) : value;
    return setText.call(this, v);
  };
  const tituloOriginal = document.title;
  document.title = traducir(tituloOriginal);
  traducirArbol(document.body);
  cargarContenido();
  if (process.env.NODE_ENV === 'development') window.etheriaTraducir = traducir; // para revisar desde la consola
  // los cambios se traducen antes de pintarse (el observador corre antes del siguiente cuadro)
  new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === 'characterData') traducirTexto(c.target);
      else if (c.type === 'attributes') traducirAtributos(c.target);
      else c.addedNodes.forEach(traducirArbol);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
}
