# GPR · Reino de Etheria — front

Juego RPG web con un mundo 2D tipo MMO. Está hecho con React 19 (Create React App), Phaser 3.80 para el mundo y el combate, y `socket.io-client` para el multijugador. El back está en el repo `gprback`.

## Correr

```bash
npm install
npm start                 # http://localhost:3000, usa el back de REACT_APP_API_URL (por defecto http://localhost:5000)
npm run revisar           # revisión antes de dar algo por terminado: mapas, sprites, íconos, sonidos y lint
```

## Dónde está cada cosa

- `src/pages/World.js` y `src/game/`: el mundo 2D (escena de Phaser, módulos en `src/game/world/`), el combate (`BattleScene.js`), los diálogos y las misiones.
- `src/components/world/`: las ventanas del mundo (mochila, taller, mercado, bestiario…).
- `public/assets/`: mapas (`mundo/<zona>/`), tilesets, sprites, fondos e íconos.
- `art/`: los scripts de Aseprite (`art/sprites/…`) y los generadores de mapas (`art/mapas/`). Todo el arte es propio.

## Documentación

- Guía para trabajar en el front: `D:\vscode\CLAUDE.gpr.md`.
- Cómo se hace una zona del juego (mapa, monstruos, equipo, equilibrio, misiones, arte): `gprback/docs/zona3_volcan_traspaso.md`.
- Historia y continente: `gprback/docs/historia_etheria.md` y `gprback/docs/mapa_etheria.md`.
