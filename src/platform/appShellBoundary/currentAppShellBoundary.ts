import type { AppShellBoundaryZone } from "./appShellBoundaryTypes";

export const currentAppShellBoundaryZones = [
  {
    id: "app-root",
    label: "App Root And Shell State",
    type: "root",
    owner: "existing-app",
    sourceFiles: ["src/App.tsx", "src/styles.css"],
    relatedSurfaceIds: [
      "surface.sceneViewport",
      "surface.machineLibrary",
      "surface.inspector",
      "surface.layoutExplorer",
      "surface.statusBar"
    ],
    relatedPanelIds: [
      "panel.machineLibrary",
      "panel.layoutExplorer",
      "panel.inspector",
      "panel.statusBar"
    ],
    relatedCommandIds: ["edit.undo", "edit.redo", "edit.deleteSelected"],
    responsibilities: [
      "Owns current React shell composition and high-level layout state.",
      "Coordinates viewport, right-panel sections, modal managers, selection, autosave, undo/redo, and project state."
    ],
    refactorNotes: [
      "Split shell orchestration from domain state mutation before any visual shell rewrite.",
      "Do not let panel collapse, resize, or zone docking mutate scene data, selection order, camera state, or drag math."
    ],
    riskLevel: "high"
  },
  {
    id: "scene-viewport",
    label: "Babylon Scene Viewport",
    type: "viewport",
    owner: "existing-app",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx"],
    relatedSurfaceIds: ["surface.sceneViewport", "surface.selection", "surface.labels", "surface.measurements", "surface.connectionPoints"],
    relatedCommandIds: ["view.fitView", "view.toggleLabels", "view.toggleConnectionPoints", "view.showMeasurements"],
    responsibilities: [
      "Renders the 3D layout scene, grid, objects, civil references, annotations, labels, overlays, and scene picking.",
      "Adapts layout coordinates to Babylon scene coordinates without owning shell layout decisions."
    ],
    refactorNotes: [
      "Viewport must remain isolated from shell panel dimensions except canvas resize handling.",
      "Selection, drag, and camera behavior must continue to use shared contracts rather than shell-specific branches."
    ],
    riskLevel: "high"
  },
  {
    id: "machine-library",
    label: "Machine Library And Resource Panels",
    type: "panel",
    owner: "existing-app",
    sourceFiles: [
      "src/App.tsx",
      "src/components/MachineLibrary.tsx",
      "src/components/CivilReferencePanel.tsx",
      "src/components/AssemblyTreePanel.tsx",
      "src/components/LayersPanel.tsx",
      "src/components/AnnotationsPanel.tsx",
      "src/components/ViewpointsPanel.tsx"
    ],
    relatedSurfaceIds: [
      "surface.machineLibrary",
      "surface.layoutExplorer",
      "surface.layers",
      "surface.groups",
      "surface.annotations",
      "surface.viewpoints",
      "surface.civilColumn"
    ],
    relatedPanelIds: [
      "panel.machineLibrary",
      "panel.layoutExplorer",
      "panel.layers",
      "panel.groups",
      "panel.annotations"
    ],
    relatedCommandIds: [
      "library.addMachine",
      "annotations.create",
      "view.viewpoints",
      "civil.addFloor",
      "civil.addWall",
      "civil.addColumn",
      "civil.addWalkway",
      "civil.addRestrictedZone"
    ],
    responsibilities: [
      "Exposes resource, explorer, layer, group, annotation, viewpoint, and civil insertion surfaces currently hosted in the shell panel.",
      "Provides the existing entry points for adding library machines and civil reference geometry."
    ],
    refactorNotes: [
      "Future shell should separate resource/explorer zones from the contextual inspector without hiding existing features.",
      "Panel section collapse state should remain a shell concern and must not change layout entities."
    ],
    riskLevel: "high"
  },
  {
    id: "machine-properties",
    label: "Properties Inspector",
    type: "panel",
    owner: "existing-app",
    sourceFiles: [
      "src/App.tsx",
      "src/components/MachineProperties.tsx",
      "src/components/CivilReferenceProperties.tsx",
      "src/components/MultiSelectionProperties.tsx",
      "src/components/PrecisionPlacementPanel.tsx",
      "src/components/ConnectionPointSnapPanel.tsx",
      "src/components/AlignmentToolsPanel.tsx",
      "src/components/SimulationControls.tsx",
      "src/components/LayoutControls.tsx",
      "src/components/DisplayOverlayControls.tsx"
    ],
    relatedSurfaceIds: [
      "surface.inspector",
      "surface.transformEditor",
      "surface.rotationSnap",
      "surface.connectionPointSnap",
      "surface.alignment",
      "surface.labels",
      "surface.connectionPoints"
    ],
    relatedPanelIds: ["panel.inspector"],
    relatedCommandIds: [
      "edit.deleteSelected",
      "snap.rotation",
      "snap.connectionPoint",
      "alignment.alignSelection",
      "view.toggleLabels",
      "view.toggleConnectionPoints"
    ],
    responsibilities: [
      "Shows contextual editing controls for selected machines, civil references, annotations, multi-selection, snapping, alignment, simulation, overlays, and layout file actions.",
      "Bridges user-facing property edits to existing layout state and undo/redo flows."
    ],
    refactorNotes: [
      "Inspector refactor must preserve contextual selection priority and avoid becoming a storage area for global managers.",
      "Numeric coordinate and unit rules must stay aligned with the platform UX standard."
    ],
    riskLevel: "high"
  },
  {
    id: "top-toolbar",
    label: "Top Toolbar And Quick Actions",
    type: "toolbar",
    owner: "existing-app",
    sourceFiles: ["src/App.tsx", "src/styles.css"],
    relatedSurfaceIds: ["surface.undoRedo", "surface.deleteSelected", "surface.projectManager"],
    relatedPanelIds: ["panel.projectManager"],
    relatedCommandIds: ["edit.undo", "edit.redo", "edit.deleteSelected", "project.save"],
    responsibilities: [
      "Represents current shell-level quick access controls and project state affordances.",
      "Hosts command-like actions that should migrate toward Command Registry driven surfaces."
    ],
    refactorNotes: [
      "Avoid adding ad-hoc toolbar behavior; map user actions to command metadata before changing visual placement.",
      "Keep undo/redo and destructive actions discoverable during shell migration."
    ],
    riskLevel: "medium"
  },
  {
    id: "modal-layer",
    label: "Modal Manager Layer",
    type: "modal",
    owner: "existing-app",
    sourceFiles: [
      "src/App.tsx",
      "src/components/ProjectManager.tsx",
      "src/components/LibraryManager.tsx",
      "src/components/TaxonomyManager.tsx",
      "src/components/PerformanceBenchmarkModal.tsx"
    ],
    relatedSurfaceIds: [
      "surface.projectManager",
      "surface.libraryManager",
      "surface.taxonomyManager",
      "surface.performanceBenchmark",
      "surface.collisionCheck"
    ],
    relatedPanelIds: [
      "panel.projectManager",
      "panel.libraryManager",
      "panel.taxonomyManager",
      "panel.performanceBenchmark",
      "panel.collisionCheck"
    ],
    relatedCommandIds: [
      "project.save",
      "project.exportJson",
      "project.importJson",
      "library.manager",
      "library.taxonomyManager",
      "performance.benchmark",
      "collision.check"
    ],
    responsibilities: [
      "Provides current modal entry points for project, library, taxonomy, benchmark, and diagnostic workflows.",
      "Keeps large manager tools outside the constrained right-side panel."
    ],
    refactorNotes: [
      "Modal close, dirty-state, and focus behavior should remain stable when shell zones are split.",
      "Future modal registry integration must preserve existing manager access and quality-gate checks."
    ],
    riskLevel: "medium"
  },
  {
    id: "diagnostics",
    label: "Diagnostics And Quality Gate Surfaces",
    type: "diagnostics",
    owner: "existing-app",
    sourceFiles: [
      "src/App.tsx",
      "src/components/CollisionCheckPanel.tsx",
      "src/components/PerformanceBenchmarkModal.tsx",
      "src/components/MachineProperties.tsx",
      "src/utils/collision.ts",
      "src/utils/performanceBenchmark.ts",
      "src/utils/visualModel.ts"
    ],
    relatedSurfaceIds: ["surface.collisionCheck", "surface.performanceBenchmark", "surface.visualDiagnostics"],
    relatedPanelIds: ["panel.collisionCheck", "panel.performanceBenchmark", "panel.diagnostics"],
    relatedCommandIds: ["collision.check", "performance.benchmark", "diagnostics.noRedConsole"],
    responsibilities: [
      "Tracks collision diagnostics, performance benchmark entry points, visual model diagnostics, and no-red-console platform expectations.",
      "Provides engineering feedback without owning entity mutation rules."
    ],
    refactorNotes: [
      "Diagnostics panels should remain reachable after shell refactor and must not introduce red console errors in normal use.",
      "Diagnostic surfaces should report controlled failures rather than crashing shell rendering."
    ],
    riskLevel: "medium"
  },
  {
    id: "project-storage",
    label: "Project, Layout, Revision, And Autosave Boundary",
    type: "service-boundary",
    owner: "existing-app",
    sourceFiles: [
      "src/App.tsx",
      "src/components/ProjectManager.tsx",
      "src/utils/projectStorage.ts",
      "src/utils/layoutSerialization.ts",
      "src/utils/storage/storageMigration.ts"
    ],
    relatedSurfaceIds: [
      "surface.projectSave",
      "surface.projectExportJson",
      "surface.projectImportJson",
      "surface.restorePrompt",
      "surface.projectManager"
    ],
    relatedPanelIds: ["panel.projectManager"],
    relatedCommandIds: ["project.save", "project.exportJson", "project.importJson", "project.restorePrompt"],
    responsibilities: [
      "Owns current persistence boundary for IndexedDB projects, layout JSON, revisions, autosave recovery, import, and export.",
      "Normalizes layout snapshots across machine, civil, annotation, layer, group, and viewpoint state."
    ],
    refactorNotes: [
      "Storage actions should become command-governed without changing existing project import/export compatibility.",
      "Autosave recovery must stay separate from named project and layout save/load flows."
    ],
    riskLevel: "high"
  },
  {
    id: "library-management",
    label: "Library Management Boundary",
    type: "modal",
    owner: "existing-app",
    sourceFiles: [
      "src/components/MachineLibrary.tsx",
      "src/components/LibraryManager.tsx",
      "src/utils/libraryValidation.ts",
      "src/types/machine.ts"
    ],
    relatedSurfaceIds: ["surface.machineLibrary", "surface.libraryManager"],
    relatedPanelIds: ["panel.machineLibrary", "panel.libraryManager"],
    relatedCommandIds: ["library.addMachine", "library.manager"],
    responsibilities: [
      "Loads nested machine libraries and exposes Project Custom Library editing through the Library Manager.",
      "Preserves definition snapshots and library validation warnings for scene object creation."
    ],
    refactorNotes: [
      "Keep library loading pure enough to remain testable while manager UI moves behind future shell contracts.",
      "Do not break custom library localStorage persistence or machine definition normalization."
    ],
    riskLevel: "medium"
  },
  {
    id: "taxonomy-management",
    label: "Taxonomy Management Boundary",
    type: "modal",
    owner: "existing-app",
    sourceFiles: [
      "src/components/MachineLibrary.tsx",
      "src/components/TaxonomyManager.tsx",
      "src/utils/taxonomy.ts"
    ],
    relatedSurfaceIds: ["surface.taxonomyManager"],
    relatedPanelIds: ["panel.taxonomyManager"],
    relatedCommandIds: ["library.taxonomyManager"],
    responsibilities: [
      "Provides current taxonomy management entry point associated with the machine library workflow.",
      "Keeps taxonomy editing separate from scene object transform and selection state."
    ],
    refactorNotes: [
      "Future shell should expose taxonomy management through registered tools without hiding the current entry point.",
      "Taxonomy manager modal behavior should remain independent from right-panel resize and collapse."
    ],
    riskLevel: "low"
  }
] as const satisfies readonly AppShellBoundaryZone[];
