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

Click a machine in the library to add a meter-scale placeholder box to the grid. Each added machine gets a visible label above it. Machine definitions currently live in `src/data/machines.ts`; there is no backend, database, or authentication layer.
