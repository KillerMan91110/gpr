import { Component } from 'react';
import GameIcon from './GameIcon';

// Boundary global: sin esto, cualquier error de render (ej. el crash de Inventario con los
// íconos) tira pantalla en blanco y el único rastro queda en la consola del navegador.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error de render sin capturar:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="placeholder-page">
        <h1>
          <GameIcon name="broken-shield" artist="lorc" /> Algo salió mal
        </h1>
        <p>Hubo un error inesperado. Probá volver al inicio.</p>
        <a href="/">Volver al inicio</a>
      </div>
    );
  }
}
