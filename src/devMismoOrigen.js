// Solo en desarrollo: "modo mismo origen". Algunos navegadores embebidos (por ejemplo el panel
// de navegador de Claude) bloquean las peticiones de localhost:3000 a otro puerto (el back en
// localhost:5000). Con este modo, todo lo que iba a http://localhost:5000 se pide a la propia
// página (localhost:3000) y src/setupProxy.js lo reenvía al back.
//
// Se activa abriendo cualquier página con ?mismoOrigen=1 (queda guardado) y se apaga con
// ?mismoOrigen=0. Sin activarlo no cambia nada: el juego habla directo con el back como siempre.
const BACK = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function activo() {
  try {
    const p = new URLSearchParams(window.location.search).get('mismoOrigen');
    if (p === '1') localStorage.setItem('mismoOrigen', '1');
    if (p === '0') localStorage.removeItem('mismoOrigen');
    return localStorage.getItem('mismoOrigen') === '1';
  } catch {
    return false;
  }
}

if (process.env.NODE_ENV === 'development' && activo()) {
  const here = window.location.origin;
  const rewrite = (url) => (typeof url === 'string' && url.startsWith(BACK) ? here + url.slice(BACK.length) : url);
  const wsBack = BACK.replace(/^http/, 'ws');
  const wsHere = here.replace(/^http/, 'ws');

  const fetch0 = window.fetch.bind(window);
  window.fetch = (input, init) => fetch0(typeof input === 'string' ? rewrite(input) : input, init);

  const open0 = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function open(method, url, ...rest) { return open0.call(this, method, rewrite(String(url)), ...rest); };

  const WS0 = window.WebSocket;
  window.WebSocket = function WebSocket(url, protocols) {
    const u = String(url);
    return new WS0(u.startsWith(wsBack) ? wsHere + u.slice(wsBack.length) : u, protocols);
  };
  window.WebSocket.prototype = WS0.prototype;
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

  // eslint-disable-next-line no-console
  console.info('[mismoOrigen] el back se pide a través de', here);
}
