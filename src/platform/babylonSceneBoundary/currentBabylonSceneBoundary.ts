import type { BabylonSceneBoundaryInventory } from "./babylonSceneBoundaryTypes";

export const currentBabylonSceneBoundary = {
  id: "babylon-scene",
  displayName: "Babylon Scene",
  ownerLayer: "scene-viewport",
  runtimeStatus: "active",
  sourceFiles: [
    "src/components/BabylonScene.tsx",
    "src/types/machine.ts",
    "src/types/civil.ts",
    "src/types/annotations.ts",
    "src/types/overlays.ts",
    "src/types/performance.ts",
    "src/utils/coordinateReference.ts",
    "src/utils/collision.ts",
    "src/utils/connectionPoints.ts",
    "src/utils/annotations.ts",
    "src/utils/performanceBenchmark.ts",
    "src/utils/visualDiagnostics.ts",
    "src/utils/visualModel.ts"
  ],
  parentBoundaryIds: ["scene-viewport"],
  relatedSurfaceIds: [
    "surface.sceneViewport",
    "surface.selection",
    "surface.labels",
    "surface.measurements",
    "surface.connectionPoints",
    "surface.collisionCheck",
    "surface.visualDiagnostics",
    "surface.performanceBenchmark"
  ],
  relatedCommandIds: [
    "view.fitView",
    "view.toggleLabels",
    "view.toggleConnectionPoints",
    "view.showMeasurements",
    "collision.check",
    "performance.benchmark",
    "diagnostics.noRedConsole"
  ],
  primaryResponsibilities: [
    {
      id: "babylon-engine-scene-lifecycle",
      label: "Babylon engine and scene lifecycle"
    },
    {
      id: "canvas-rendering",
      label: "Canvas rendering"
    },
    {
      id: "camera-creation-control",
      label: "Camera creation and control"
    },
    {
      id: "lighting-ground-grid-context",
      label: "Lighting, ground, and grid visual context"
    },
    {
      id: "machine-object-mesh-rendering",
      label: "Machine and object mesh rendering"
    },
    {
      id: "civil-building-reference-rendering",
      label: "Civil and building reference rendering"
    },
    {
      id: "annotation-connection-overlay-rendering",
      label: "Annotation and connection point overlay rendering"
    },
    {
      id: "selection-visualization",
      label: "Selection visualization"
    },
    {
      id: "pointer-interaction-handling",
      label: "Pointer interaction handling"
    },
    {
      id: "drag-move-placement-interaction",
      label: "Drag, move, and placement interaction handling"
    },
    {
      id: "rotation-transform-interaction",
      label: "Rotation and transform interaction handling"
    },
    {
      id: "collision-clearance-visualization",
      label: "Collision and clearance visualization"
    },
    {
      id: "visual-diagnostics-overlays",
      label: "Visual diagnostics and overlay responsibilities"
    }
  ],
  knownUpstreamInputs: [
    {
      id: "layout-machine-state",
      label: "Layout and machine state"
    },
    {
      id: "selected-object-group-state",
      label: "Selected object and group state"
    },
    {
      id: "placement-move-rotation-interaction-state",
      label: "Placement, move, and rotation commands or interaction state"
    },
    {
      id: "library-visual-model-data",
      label: "Library item metadata and visual model data"
    },
    {
      id: "overlay-diagnostic-settings",
      label: "Overlay and diagnostic settings"
    },
    {
      id: "viewport-camera-settings",
      label: "Viewport and camera settings"
    },
    {
      id: "layer-visibility-state",
      label: "Layer and visibility state"
    },
    {
      id: "civil-building-references",
      label: "Civil and building references"
    },
    {
      id: "annotation-state",
      label: "Annotation state"
    }
  ],
  knownDownstreamEffects: [
    {
      id: "babylon-scene-object-updates",
      label: "Babylon scene object updates"
    },
    {
      id: "visual-selection-feedback",
      label: "Visual selection feedback"
    },
    {
      id: "pointer-drag-feedback",
      label: "Pointer and drag feedback"
    },
    {
      id: "camera-viewport-feedback",
      label: "Camera and viewport feedback"
    },
    {
      id: "collision-clearance-feedback",
      label: "Collision and clearance visual feedback"
    },
    {
      id: "app-state-callback-events",
      label: "Callbacks and events back to app state"
    },
    {
      id: "visual-diagnostics-events",
      label: "Visual diagnostics callbacks"
    },
    {
      id: "performance-metrics-events",
      label: "Performance metrics callbacks"
    }
  ],
  boundaryRisks: [
    {
      id: "multi-responsibility-component",
      label: "BabylonScene currently carries multiple responsibilities"
    },
    {
      id: "render-interaction-coupling",
      label: "Render lifecycle and interaction logic are tightly coupled"
    },
    {
      id: "selection-placement-viewport-coupling",
      label: "Selection, placement, and viewport concerns are coupled"
    },
    {
      id: "pointer-camera-regression-risk",
      label: "Pointer, drag, and camera interactions are sensitive regression areas"
    }
  ],
  extractionNotes: [
    {
      id: "extract-gradually",
      label: "Selection, placement, and viewport concerns should be extracted gradually"
    },
    {
      id: "preserve-app-shell-scene-viewport-slot",
      label: "Future extraction should preserve the AppShell scene-viewport slot"
    },
    {
      id: "preserve-zone-anchors",
      label: "Future extraction should preserve data-app-shell-zone anchors"
    },
    {
      id: "keep-e2e-smoke-stable",
      label: "Future extraction should keep E2E smoke behavior stable"
    },
    {
      id: "no-platform-runtime-dependency",
      label: "No runtime dependency should be introduced from platform inventory into component code"
    }
  ]
} as const satisfies BabylonSceneBoundaryInventory;
