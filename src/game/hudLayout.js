// Medidas compartidas entre la escena (que dibuja el minimapa con una segunda cámara) y el HUD
// de React (que dibuja el marco dorado encima). Si cambian acá, quedan alineados los dos.
// En pantallas angostas (celular en vertical) el minimapa es más chico para no taparle el retrato
// al héroe (se calcula al cargar la página).
const narrow = typeof window !== 'undefined' && window.innerWidth < 600;
export const MINIMAP = narrow
  ? { width: 116, height: 88, margin: 8, zoom: 0.1 }
  : { width: 184, height: 138, margin: 16, zoom: 0.16 };
