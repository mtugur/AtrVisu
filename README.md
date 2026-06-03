# AtrVisu

Initial frontend-only React, TypeScript, and Babylon.js workspace for visualizing machine layouts.

## Stack

- React
- TypeScript
- Vite
- Babylon.js

## Run

```bash
npm.cmd install
npm.cmd run dev
```

The app starts a full-screen Babylon.js scene with an orbit camera, basic lighting, a 3D reference grid, and a right-side machine library panel.

Click a machine in the library to add a meter-scale placeholder box to the grid. Each added machine gets a visible label above it. Select an object in the 3D scene to highlight it, drag it on the floor plane, edit its Plan X, Plan Y, or rotation angle, and delete it after confirmation.

Conveyors show a top-mounted flow direction arrow. Select a conveyor to switch its Flow Direction between Forward and Reverse. Use Start Simulation to show simple product placeholders moving along conveyors, and adjust Simulation Speed to change their visual movement rate.

Use Save Layout and Load Layout for named layouts stored in this browser. Use Export Layout to download the current scene as JSON. Use Import Layout to restore a previously exported layout; imported objects replace the current scene objects and keep their dimensions, labels, positions, rotations, colors, and conveyor flow directions.

AtrVisu also autosaves the current layout in browser localStorage. If an unsaved layout is found after a refresh, the app prompts to restore it or dismiss and clear the autosave.

Machine definitions currently live in `src/data/machines.ts`; there is no backend, database, or authentication layer.
