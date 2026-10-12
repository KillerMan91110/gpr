import Phaser from 'phaser';

// Canal de eventos entre la escena de Phaser (el mapa) y React (el HUD y las ventanas).
// Phaser -> React: 'poi' (punto de interés cercano o null), 'interact', 'encounter'.
// React -> Phaser: 'input-enabled' (apagar el teclado del mapa mientras escribes o hay una ventana abierta).
const bus = new Phaser.Events.EventEmitter();

// Solo en desarrollo: permite disparar eventos a mano desde la consola del navegador para probar
// (por ejemplo, un encuentro sin tener que caminar hasta un monstruo).
if (process.env.NODE_ENV === 'development') window.etheriaBus = bus;

export default bus;
