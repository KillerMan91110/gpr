import './devMismoOrigen'; // (solo desarrollo, ver el archivo) — va primero
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { iniciarTraduccion } from './i18n';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// la interfaz en inglés, si el jugador la eligió (src/i18n)
iniciarTraduccion();
