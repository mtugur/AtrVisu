import type { SceneViewportBoundaryInventory } from "./sceneViewportBoundaryTypes";

export const currentSceneViewportBoundary = {
  id: "scene-viewport",
  displayName: "Scene Viewport",
  ownerLayer: "app-shell",
  runtimeStatus: "active",
  appShellZoneId: "scene-viewport",
  sourceFiles: [
    "src/App.tsx",
    "src/components/AppShell.tsx",
    "src/components/BabylonScene.tsx",
    "src/utils/coordinateReference.ts",
    "src/utils/collision.ts",
    "src/utils/overlaySettings.ts",
    "src/utils/performanceBenchmark.ts",
    "src/utils/visualDiagnostics.ts"
  ],
  relatedSurfaceIds: [
    "surface.sceneViewport",
    "surface.selection",
    "surface.labels",
    "surface.measurements",
    "surface.connectionPoints",
    "surface.collisionCheck",
    "surface.visualDiagnostics"
  ],
  relatedCommandIds: [
    "view.fitView",
    "view.toggleLabels",
    "view.toggleConnectionPoints",
    "view.showMeasurements",
    "collision.check",
    "diagnostics.noRedConsole"
  ],
  primaryResponsibilities: [
    {
      id: "babylon-canvas-scene-render",
      label: "Babylon canvas and scene render area"
    },
    {
      id: "viewport-camera-interaction",
      label: "Viewport and camera interaction surface"
    },
    {
      id: "machine-placement-visualization",
      label: "Machine and object placement visualization"
    },
    {
      id: "selection-visualization",
      label: "Selection visualization surface"
    },
    {
      id: "gizmo-manipulation-interaction",
      label: "Gizmo and manipulation interaction surface"
    },
    {
      id: "grid-ground-lighting-context",
      label: "Grid, ground, and lighting visual context"
    },
    {
      id: "overlay-diagnostics-rendering",
      label: "Overlay and diagnostics rendering surface"
    }
  ],
  knownUpstreamInputs: [
    {
      id: "app-layout-machine-state",
      label: "App-level layout and machine state"
    },
    {
      id: "selection-state",
      label: "Selection state"
    },
    {
      id: "placement-move-rotation-state",
      label: "Placement, move, and rotation interaction state"
    },
    {
      id: "library-visual-metadata",
      label: "Library item visual metadata"
    },
    {
      id: "viewport-camera-settings",
      label: "Viewport and camera related commands and settings"
    },
    {
      id: "overlay-diagnostic-settings",
      label: "Overlay and diagnostic settings"
    }
  ],
  knownDownstreamEffects: [
    {
      id: "visual-scene-updates",
      label: "Visual scene updates"
    },
    {
      id: "pointer-drag-selection-feedback",
      label: "Pointer, drag, and selection feedback"
    },
    {
      id: "camera-viewport-changes",
      label: "Camera and viewport changes"
    },
    {
      id: "collision-clearance-visual-feedback",
      label: "Collision and clearance visual feedback"
    },
    {
      id: "performance-visual-diagnostics-feedback",
      label: "Performance and visual diagnostics feedback"
    }
  ],
  boundaryRisks: [
    {
      id: "multi-responsibility-babylon-scene",
      label: "BabylonScene currently carries multiple responsibilities"
    },
    {
      id: "rendering-interaction-coupling",
      label: "Scene rendering and interaction state are tightly coupled"
    },
    {
      id: "pointer-drag-regression-risk",
      label: "Pointer, drag, selection, and camera math are sensitive regression areas"
    }
  ],
  extractionNotes: [
    {
      id: "preserve-app-shell-slot-api",
      label: "Future extraction should avoid changing the AppShell slot API"
    },
    {
      id: "keep-e2e-smoke-stable",
      label: "Future extraction should keep E2E smoke behavior stable"
    },
    {
      id: "preserve-zone-anchors",
      label: "Future extraction should preserve data-app-shell-zone anchors"
    },
    {
      id: "isolate-viewport-without-state-mutation",
      label: "Future extraction should keep viewport container changes from mutating layout, camera, or selection state"
    }
  ]
} as const satisfies SceneViewportBoundaryInventory;
