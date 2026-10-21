// Dónde estaba el héroe en el mundo ({ x, y, zona }, en píxeles locales de la zona). Se guarda en la pestaña
// (sessionStorage, la que se usa para teletransportar en las pruebas) y en el navegador por cuenta (localStorage),
// así al recargar o al volver a entrar después de cerrar la pestaña apareces donde lo dejaste.
const CLAVE = 'mundo_posicion_v2';

const cuenta = () => {
  try { return JSON.parse(localStorage.getItem('player'))?.id ?? null; } catch { return null; }
};
const claveCuenta = () => (cuenta() != null ? `${CLAVE}:${cuenta()}` : null);

export function leerPosicion() {
  try {
    const deLaPestana = sessionStorage.getItem(CLAVE);
    if (deLaPestana) return JSON.parse(deLaPestana);
    const k = claveCuenta();
    return k ? JSON.parse(localStorage.getItem(k)) : null;
  } catch { return null; }
}

export function guardarPosicion(pos) {
  if (!pos) return;
  const texto = JSON.stringify(pos);
  try { sessionStorage.setItem(CLAVE, texto); } catch { /* sin guardar */ }
  try { const k = claveCuenta(); if (k) localStorage.setItem(k, texto); } catch { /* sin guardar */ }
}

export function borrarPosicion() {
  try { sessionStorage.removeItem(CLAVE); } catch { /* nada */ }
  try { const k = claveCuenta(); if (k) localStorage.removeItem(k); } catch { /* nada */ }
}

// al entrar o salir de una cuenta: lo de la pestaña podía ser de otra cuenta (lo de cada cuenta se queda)
export function olvidarPestana() {
  try { sessionStorage.removeItem(CLAVE); } catch { /* nada */ }
}
