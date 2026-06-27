import { currentBabylonSceneBoundary } from "./currentBabylonSceneBoundary";

export type BabylonSceneExtractionRiskLevel = "low" | "medium" | "high";

export type BabylonSceneExtractionPhase = {
  id: string;
  title: string;
  goal: string;
  riskLevel: BabylonSceneExtractionRiskLevel;
  prerequisites: readonly string[];
  protectedBehaviors: readonly string[];
  forbiddenChanges: readonly string[];
  validationSignals: readonly string[];
  expectedFilesOrModules: readonly string[];
};

export type BabylonSceneExtractionPlan = {
  id: "babylon-scene-extraction-plan-v0.1";
  version: "0.1";
  boundaryId: "babylon-scene";
  sourceBoundaryId: typeof currentBabylonSceneBoundary.id;
  readinessIntegrated: true;
  firstSafeRefactorCandidate: string;
  phases: readonly BabylonSceneExtractionPhase[];
};

const baselineProtectedBehaviors = [
  "app-shell-scene-viewport-slot",
  "e2e-smoke-stability",
  "no-runtime-dependency-from-components-to-platform-inventory",
  "no-ui-behavior-change-before-extraction"
] as const;

const sharedForbiddenChanges = [
  "no-runtime-behavior-change",
  "no-ui-behavior-change",
  "no-component-behavior-change",
  "no-babylon-render-camera-gizmo-selection-drag-drop-pointer-logic-change",
  "no-app-shell-slot-api-change",
  "no-component-runtime-dependency-on-platform-inventory"
] as const;

const sharedValidationSignals = [
  "npm.cmd run build",
  "npm.cmd run test -- --run",
  "npm.cmd run test:e2e",
  "no-red-console-errors"
] as const;

export const babylonSceneExtractionPlan = {
  id: "babylon-scene-extraction-plan-v0.1",
  version: "0.1",
  boundaryId: "babylon-scene",
  sourceBoundaryId: currentBabylonSceneBoundary.id,
  readinessIntegrated: true,
  firstSafeRefactorCandidate: "diagnostics-overlays-extraction",
  phases: [
    {
      id: "baseline-protection",
      title: "Baseline protection",
      goal: "Lock down the current Babylon Scene behavior and platform boundaries before any runtime extraction starts.",
      riskLevel: "low",
      prerequisites: [
        "current-babylon-scene-boundary-inventory-ready",
        "platform-readiness-report-includes-babylon-scene-boundary",
        "current-e2e-smoke-suite-green"
      ],
      protectedBehaviors: baselineProtectedBehaviors,
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "babylon-scene-boundary-inventory-tests-pass",
        "babylon-scene-extraction-plan-tests-pass"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx (unchanged baseline)",
        "src/platform/babylonSceneBoundary/*",
        "src/platform/babylonSceneBoundary/babylonSceneExtractionPlan.ts (conceptual plan)"
      ]
    },
    {
      id: "scene-lifecycle-extraction",
      title: "Scene lifecycle extraction",
      goal: "Extract Babylon engine and scene lifecycle setup while preserving canvas ownership and dispose/cleanup behavior.",
      riskLevel: "medium",
      prerequisites: [
        "baseline-protection",
        "engine-scene-canvas-ownership-documented",
        "dispose-cleanup-paths-covered-by-smoke-tests"
      ],
      protectedBehaviors: [
        ...baselineProtectedBehaviors,
        "canvas-ownership-remains-in-scene-viewport",
        "engine-scene-dispose-cleanup-remains-equivalent"
      ],
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "scene-dispose-cleanup-regression-check",
        "viewport-renders-after-page-load"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx",
        "src/components/babylonScene/sceneLifecycle.ts",
        "src/scene/babylon/disposeBabylonSceneLifecycle.ts (future conceptual split)"
      ]
    },
    {
      id: "viewport-camera-extraction",
      title: "Viewport/camera extraction",
      goal: "Separate camera creation and control behavior while staying compatible with the future viewport contract.",
      riskLevel: "medium",
      prerequisites: [
        "scene-lifecycle-extraction",
        "camera-state-read-write-contract-documented",
        "viewport-settings-inputs-identified"
      ],
      protectedBehaviors: [
        ...baselineProtectedBehaviors,
        "camera-orbit-pan-zoom-behavior",
        "viewpoint-camera-state-restore"
      ],
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "viewpoints-can-be-captured-and-applied",
        "camera-pan-zoom-smoke-remains-stable"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx",
        "src/scene/viewport/createViewportCamera.ts (conceptual)",
        "src/scene/viewport/applyViewportCameraState.ts (conceptual)"
      ]
    },
    {
      id: "visual-context-extraction",
      title: "Visual context extraction",
      goal: "Extract lighting, ground, and grid visual context without changing rendered output.",
      riskLevel: "low",
      prerequisites: [
        "baseline-protection",
        "current-lighting-ground-grid-values-documented"
      ],
      protectedBehaviors: [
        ...baselineProtectedBehaviors,
        "lighting-ground-grid-render-output",
        "floor-pick-surface-availability"
      ],
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "scene-grid-floor-visible",
        "object-placement-still-picks-floor"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx",
        "src/components/babylonScene/visualContext.ts"
      ]
    },
    {
      id: "object-rendering-extraction",
      title: "Object rendering extraction",
      goal: "Extract machine, civil, annotation, and object mesh rendering while preserving library visual model and dimension mapping.",
      riskLevel: "medium",
      prerequisites: [
        "scene-lifecycle-extraction",
        "visual-context-extraction",
        "machine-dimension-and-visual-model-mapping-documented"
      ],
      protectedBehaviors: [
        ...baselineProtectedBehaviors,
        "machine-object-dimensions-remain-mm-authoritative",
        "library-visual-model-fallback-diagnostics",
        "civil-reference-rendering"
      ],
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "machine-library-add-smoke",
        "building-civil-reference-smoke",
        "visual-model-diagnostics-remain-available"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx",
        "src/scene/rendering/renderMachineObject.ts (conceptual)",
        "src/scene/rendering/renderCivilReference.ts (conceptual)",
        "src/scene/rendering/renderAnnotationObject.ts (conceptual)"
      ]
    },
    {
      id: "interaction-extraction",
      title: "Interaction extraction",
      goal: "Extract pointer handling in ordered slices for selection, drag/move, placement, rotation, and gizmo behavior.",
      riskLevel: "high",
      prerequisites: [
        "scene-lifecycle-extraction",
        "viewport-camera-extraction",
        "object-rendering-extraction",
        "selection-and-drag-contract-tests-ready"
      ],
      protectedBehaviors: [
        ...baselineProtectedBehaviors,
        "single-and-multi-selection-order",
        "object-civil-annotation-drag-math",
        "placement-and-rotation-controls",
        "camera-controls-not-triggered-during-drag"
      ],
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "selected-object-and-numeric-rotation-smoke",
        "annotation-negative-coordinate-smoke",
        "layers-groups-selection-smoke",
        "connection-point-and-alignment-regression-tests"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx",
        "src/scene/interactions/createScenePointerController.ts (conceptual)",
        "src/scene/interactions/createSelectionController.ts (conceptual)",
        "src/scene/interactions/createDragPlacementController.ts (conceptual)",
        "src/scene/interactions/createRotationGizmoController.ts (conceptual)"
      ]
    },
    {
      id: "diagnostics-overlays-extraction",
      title: "Diagnostics/overlays extraction",
      goal: "Extract collision, clearance, visual diagnostics, and overlay responsibilities while preserving existing diagnostics signals.",
      riskLevel: "medium",
      prerequisites: [
        "object-rendering-extraction",
        "diagnostics-and-overlay-settings-documented",
        "collision-clearance-visualization-covered"
      ],
      protectedBehaviors: [
        ...baselineProtectedBehaviors,
        "collision-clearance-visual-feedback",
        "visual-diagnostics-callbacks",
        "performance-metrics-callbacks",
        "overlay-settings-visibility-behavior"
      ],
      forbiddenChanges: sharedForbiddenChanges,
      validationSignals: [
        ...sharedValidationSignals,
        "collision-check-tests-pass",
        "performance-benchmark-smoke",
        "visual-diagnostics-no-red-console"
      ],
      expectedFilesOrModules: [
        "src/components/BabylonScene.tsx",
        "src/scene/diagnostics/renderCollisionClearanceOverlays.ts (conceptual)",
        "src/scene/diagnostics/createVisualDiagnosticsAdapter.ts (conceptual)",
        "src/scene/diagnostics/collectScenePerformanceMetricsAdapter.ts (conceptual)"
      ]
    }
  ]
} as const satisfies BabylonSceneExtractionPlan;

export const getBabylonSceneExtractionPhaseIds = () =>
  babylonSceneExtractionPlan.phases.map((phase) => phase.id);

export const getBabylonSceneExtractionPhaseById = (phaseId: string) =>
  babylonSceneExtractionPlan.phases.find((phase) => phase.id === phaseId);
