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

Use Export Layout to download the current scene as JSON. Use Import Layout to restore a previously exported layout; imported objects replace the current scene objects and keep their dimensions, labels, positions, rotations, and colors.

AtrVisu also autosaves the current layout in browser localStorage. If an unsaved layout is found after a refresh, the app prompts to restore it or dismiss and clear the autosave.

Machine libraries are loaded from `public/library/libraries.index.json`, which points to enabled JSON library files under `public/library/libraries/`. The library schema supports nested groups, machine items at any group level, model/thumbnail paths for future use, connection points, clearance, and capabilities. Libraries are validated during loading; invalid items are skipped, missing clearance/capability data gets safe defaults, and warnings are shown in the panel with details in the console. There is no backend, database, or authentication layer.

Use Library Manager to inspect loaded libraries and edit Project Custom Library. Atara Standard Library remains read-only. Project Custom Library edits are stored in browser localStorage, can be exported/imported as JSON, and can be reset back to the default `project-custom.library.json`.
