import type { BabylonSceneBoundaryInventory } from "./babylonSceneBoundaryTypes";

export const currentBabylonSceneBoundary = {
  id: "babylon-scene",
  displayName: "Babylon Scene",
  ownerLayer: "scene-viewport",
  runtimeStatus: "active",
  sourceFiles: [
    "src/components/BabylonScene.tsx",
    "src/components/babylonScene/cameraViewport.ts",
    "src/components/babylonScene/dragPlacement.ts",
    "src/components/babylonScene/dragPlacement.test.ts",
    "src/components/babylonScene/objectRendering.ts",
    "src/components/babylonScene/objectRendering.test.ts",
    "src/components/babylonScene/selectionPicking.ts",
    "src/components/babylonScene/selectionPicking.test.ts",
    "src/components/babylonScene/sceneLifecycle.ts",
    "src/components/babylonScene/visualContext.ts",
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
      label: "Babylon engine and scene lifecycle setup extracted to sceneLifecycle helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/sceneLifecycle.ts",
      nextRefactorCandidate: false
    },
    {
      id: "canvas-rendering",
      label: "Canvas rendering remains coordinated by BabylonScene component",
      status: "remaining",
      riskLevel: "low",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: false
    },
    {
      id: "camera-creation-control",
      label: "Camera creation and viewport setup extracted to cameraViewport helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/cameraViewport.ts",
      nextRefactorCandidate: false
    },
    {
      id: "lighting-ground-grid-context",
      label: "Lighting, ground, and grid visual context setup extracted to visualContext helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/visualContext.ts",
      nextRefactorCandidate: false
    },
    {
      id: "machine-object-mesh-rendering",
      label: "Machine and object placeholder rendering descriptor logic extracted to objectRendering helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/objectRendering.ts",
      nextRefactorCandidate: false
    },
    {
      id: "machine-object-rendering-adapter",
      label: "Babylon mesh instantiation, GLB loading, labels, diagnostics callbacks, and rendering cleanup remain in BabylonScene",
      status: "remaining",
      riskLevel: "medium",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: true
    },
    {
      id: "civil-building-reference-rendering",
      label: "Civil and building reference rendering remains in BabylonScene",
      status: "remaining",
      riskLevel: "medium",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: false
    },
    {
      id: "annotation-connection-overlay-rendering",
      label: "Annotation and connection point overlay rendering remains in BabylonScene",
      status: "remaining",
      riskLevel: "medium",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: false
    },
    {
      id: "selection-visualization",
      label: "Selection pick target and toggle-selection helper logic extracted to selectionPicking helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/selectionPicking.ts",
      nextRefactorCandidate: false
    },
    {
      id: "pointer-interaction-handling",
      label: "Pointer interaction handling remains in BabylonScene and is high risk to extract",
      status: "remaining",
      riskLevel: "high",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: false
    },
    {
      id: "object-picking-metadata",
      label: "Object picking metadata decoding and hierarchy propagation extracted to selectionPicking helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/selectionPicking.ts",
      nextRefactorCandidate: false
    },
    {
      id: "drag-move-placement-interaction",
      label: "Drag, move, placement, and floor-delta calculation logic extracted to dragPlacement helper",
      status: "extracted",
      riskLevel: "low",
      ownerModule: "src/components/babylonScene/dragPlacement.ts",
      nextRefactorCandidate: false
    },
    {
      id: "rotation-transform-interaction",
      label: "Rotation and transform or gizmo interaction remains in BabylonScene and is high risk to extract",
      status: "remaining",
      riskLevel: "high",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: true
    },
    {
      id: "collision-clearance-visualization",
      label: "Collision and clearance visualization remains in BabylonScene as a controlled next candidate",
      status: "remaining",
      riskLevel: "medium",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: true
    },
    {
      id: "visual-diagnostics-overlays",
      label: "Visual diagnostics and overlay responsibilities remain in BabylonScene as a controlled next candidate",
      status: "remaining",
      riskLevel: "medium",
      ownerModule: "src/components/BabylonScene.tsx",
      nextRefactorCandidate: true
    }
  ],
  cameraViewportContract: {
    responsibilityId: "camera-creation-control",
    status: "extracted",
    ownerModule: "src/components/babylonScene/cameraViewport.ts",
    riskLevel: "low",
    refactorRiskRank: 2,
    extractedModule: "src/components/babylonScene/cameraViewport.ts",
    remainingAdapterModule: "src/components/BabylonScene.tsx",
    protectedBehaviors: [
      "orbit-camera-name",
      "initial-alpha-math-pi-over-4",
      "initial-beta-math-pi-over-3",
      "initial-radius-34",
      "initial-target-vector3-zero",
      "manual-camera-attach-control",
      "radius-limits-8-to-78",
      "wheel-precision-35",
      "panning-sensibility-75",
      "panning-inertia-0.18",
      "camera-inertia-0.65",
      "left-button-orbit",
      "middle-button-pan",
      "imperative-get-camera-state",
      "imperative-apply-camera-state",
      "perspective-orthographic-mode-restore"
    ],
    initialCamera: {
      name: "orbit-camera",
      alphaExpression: "Math.PI / 4",
      betaExpression: "Math.PI / 3",
      radius: 34,
      targetExpression: "Vector3.Zero()"
    },
    controls: {
      lowerRadiusLimit: 8,
      upperRadiusLimit: 78,
      wheelPrecision: 35,
      panningSensibility: 75,
      panningInertia: 0.18,
      inertia: 0.65,
      pointerButtons: [0],
      panningMouseButton: 1
    },
    imperativeHandle: {
      exposesGetCameraState: true,
      exposesApplyCameraState: true,
      supportedModes: ["perspective", "orthographic"]
    }
  },
  objectRenderingContract: {
    responsibilityId: "machine-object-mesh-rendering",
    status: "extracted",
    ownerModule: "src/components/babylonScene/objectRendering.ts",
    riskLevel: "low",
    refactorRiskRank: 2,
    extractedModule: "src/components/babylonScene/objectRendering.ts",
    testModule: "src/components/babylonScene/objectRendering.test.ts",
    remainingAdapterModule: "src/components/BabylonScene.tsx",
    separatedFromResponsibilityIds: [
      "babylon-engine-scene-lifecycle",
      "lighting-ground-grid-context",
      "camera-creation-control",
      "pointer-interaction-handling",
      "selection-visualization",
      "object-picking-metadata",
      "drag-move-placement-interaction",
      "rotation-transform-interaction"
    ],
    protectedBehaviors: [
      "placeholder-visual-descriptor-calculation",
      "placeholder-visual-rendering",
      "fallback-visual-behavior",
      "placeholder-dimension-mapping",
      "babylon-mesh-instantiation-adapter",
      "glb-external-visual-model-loading-flow",
      "object-labels-and-visual-identity",
      "visual-model-diagnostics-callbacks",
      "rendering-lifecycle-cleanup"
    ],
    extractedFlows: {
      placeholderVisualDescriptorCalculation: true,
      fallbackVisualDescriptorBehavior: true,
      placeholderDimensionMapping: true
    },
    remainingAdapterFlows: {
      babylonMeshInstantiation: true,
      glbExternalVisualModelLoading: true,
      objectLabelsVisualIdentity: true,
      machinePickMetadata: true,
      renderingLifecycleCleanup: true
    },
    extractedDependencyModules: {
      sceneLifecycle: "src/components/babylonScene/sceneLifecycle.ts",
      visualContext: "src/components/babylonScene/visualContext.ts",
      cameraViewport: "src/components/babylonScene/cameraViewport.ts"
    },
    futureModuleCandidates: [
      "src/scene/rendering/createBabylonMachineMeshAdapter.ts (conceptual)",
      "src/scene/rendering/loadMachineVisualModel.ts (conceptual)",
      "src/scene/rendering/createObjectLabel.ts (conceptual)"
    ]
  },
  selectionPickingContract: {
    responsibilityIds: ["selection-visualization", "object-picking-metadata"],
    status: "extracted",
    ownerModule: "src/components/babylonScene/selectionPicking.ts",
    riskLevel: "low",
    refactorRiskRank: 2,
    extractedModule: "src/components/babylonScene/selectionPicking.ts",
    testModule: "src/components/babylonScene/selectionPicking.test.ts",
    remainingPointerOrchestrationModule: "src/components/BabylonScene.tsx",
    separatedFromResponsibilityIds: [
      "pointer-interaction-handling",
      "drag-move-placement-interaction",
      "rotation-transform-interaction"
    ],
    protectedBehaviors: [
      "pick-target-metadata-decoding",
      "machine-pick-metadata-assignment",
      "hierarchy-pick-metadata-propagation",
      "toggle-selection-event-detection",
      "remaining-pointer-observer-orchestration"
    ],
    extractedFlows: {
      pickTargetMetadataDecoding: true,
      machinePickMetadataAssignment: true,
      hierarchyPickMetadataPropagation: true,
      toggleSelectionEventDetection: true
    },
    remainingInteractionFlows: {
      pointerObserverOrchestration: true,
      rotationTransformGizmo: true
    },
    futureModuleCandidates: [
      "src/scene/interactions/createSelectionController.ts (conceptual)",
      "src/scene/interactions/createPickingMetadataAdapter.ts (conceptual)"
    ]
  },
  dragPlacementContract: {
    responsibilityId: "drag-move-placement-interaction",
    status: "extracted",
    ownerModule: "src/components/babylonScene/dragPlacement.ts",
    riskLevel: "low",
    refactorRiskRank: 2,
    extractedModule: "src/components/babylonScene/dragPlacement.ts",
    testModule: "src/components/babylonScene/dragPlacement.test.ts",
    remainingPointerOrchestrationModule: "src/components/BabylonScene.tsx",
    separatedFromResponsibilityIds: [
      "pointer-interaction-handling",
      "rotation-transform-interaction",
      "selection-visualization",
      "object-picking-metadata"
    ],
    protectedBehaviors: [
      "machine-drag-instance-selection",
      "locked-machine-drag-filtering",
      "machine-start-position-capture",
      "floor-delta-mm-conversion",
      "civil-drag-position-calculation",
      "machine-drag-position-updates",
      "remaining-pointer-observer-orchestration"
    ],
    extractedFlows: {
      machineDragInstanceSelection: true,
      machineStartPositionCapture: true,
      floorDeltaMmConversion: true,
      civilDragPositionCalculation: true,
      machineDragPositionUpdates: true
    },
    remainingInteractionFlows: {
      pointerObserverOrchestration: true,
      rotationTransformGizmo: true
    },
    futureModuleCandidates: [
      "src/scene/interactions/createDragPlacementController.ts (conceptual)",
      "src/scene/interactions/createMultiSelectMoveController.ts (conceptual)"
    ]
  },
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
      label: "BabylonScene still carries machine/object rendering adapter, pointer orchestration, rotation/gizmo, diagnostics, and camera state adapter responsibilities"
    },
    {
      id: "rendering-lifecycle-cleanup-risk",
      label: "BabylonScene still owns GLB loading, labels, diagnostics callbacks, picking metadata, and cleanup paths after descriptor extraction"
    },
    {
      id: "render-interaction-coupling",
      label: "Render loop contents and interaction logic remain coupled after lifecycle setup extraction"
    },
    {
      id: "selection-placement-viewport-coupling",
      label: "Pointer orchestration, rotation/gizmo, and viewport concerns remain coupled after selection/picking and drag placement helper extraction"
    },
    {
      id: "pointer-camera-regression-risk",
      label: "Pointer orchestration, rotation/gizmo, and camera interactions are sensitive regression areas"
    }
  ],
  extractionNotes: [
    {
      id: "extract-gradually",
      label: "Visual context, scene lifecycle, camera, rendering descriptor, selection/picking, and drag placement helpers are extracted; remaining rotation, diagnostics, and overlay concerns should be extracted gradually"
    },
    {
      id: "visual-context-extracted",
      label: "Lighting, ground, and grid setup now lives in src/components/babylonScene/visualContext.ts"
    },
    {
      id: "scene-lifecycle-extracted",
      label: "Engine, scene, render loop, resize, and dispose lifecycle setup now lives in src/components/babylonScene/sceneLifecycle.ts"
    },
    {
      id: "camera-viewport-extracted",
      label: "Camera creation, initial viewport setup, attachControl, limits, and camera input setup now live in src/components/babylonScene/cameraViewport.ts"
    },
    {
      id: "camera-state-adapter-remains",
      label: "BabylonScene still owns getCameraState and applyCameraState as the imperative camera state adapter"
    },
    {
      id: "object-rendering-contract-added",
      label: "Machine/object placeholder descriptor rendering is extracted to src/components/babylonScene/objectRendering.ts with deterministic unit coverage"
    },
    {
      id: "object-rendering-adapter-remains",
      label: "BabylonScene still adapts objectRendering descriptors into Babylon meshes, GLB loading, labels, picking metadata, and cleanup"
    },
    {
      id: "selection-picking-extracted",
      label: "Selection pick target decoding, toggle selection event detection, and machine pick metadata propagation now live in src/components/babylonScene/selectionPicking.ts"
    },
    {
      id: "pointer-orchestration-remains",
      label: "BabylonScene still owns pointer observer orchestration and rotation/gizmo interaction flow"
    },
    {
      id: "drag-placement-extracted",
      label: "Machine and civil drag state, floor-delta millimeter conversion, and drag position update calculations now live in src/components/babylonScene/dragPlacement.ts"
    },
    {
      id: "next-controlled-candidate",
      label: "Rotation/gizmo is the next controlled interaction candidate after drag placement extraction, followed by post-interaction inventory and multi-select/alignment/snap readiness work"
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
