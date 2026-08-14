import type { PlatformSurfaceInventoryItem } from "./surfaceInventoryTypes";

export const currentPlatformSurfaceInventory: readonly PlatformSurfaceInventoryItem[] = [
  {
    surfaceId: "surface.workbenchApplicationBar",
    surfaceType: "toolbar-action",
    label: "Workbench Application Bar",
    owner: "platform",
    sourceFiles: [
      "src/App.tsx",
      "src/components/workbench/WorkbenchApplicationBar.tsx",
      "src/workbench/commandSurfaces/commandSurfaceAdapter.ts"
    ],
    commandIds: ["project.save"],
    featureIds: ["project.save", "panel.projectStatus"],
    notes: "Registry metadata is projected through the existing Runtime Feature Command Bridge; project context is read-only."
  },
  {
    surfaceId: "surface.workbenchMenuBar",
    surfaceType: "toolbar-action",
    label: "Workbench Menu Bar",
    owner: "platform",
    sourceFiles: [
      "src/App.tsx",
      "src/components/workbench/WorkbenchMenuBar.tsx",
      "src/workbench/commandSurfaces/commandSurfaceAdapter.ts"
    ],
    commandIds: [
      "project.save",
      "project.manager",
      "layout.controls",
      "project.commercialOutputs",
      "project.exportJson",
      "project.importJson",
      "project.restorePrompt",
      "edit.undo",
      "edit.redo",
      "edit.duplicateSelected",
      "edit.deleteSelected",
      "view.toggleLabels",
      "view.viewpoints",
      "view.toggleConnectionPoints",
      "view.showMeasurements",
      "library.manager",
      "library.taxonomyManager",
      "collision.check",
      "performance.benchmark",
      "simulation.controls"
    ],
    featureIds: [
      "project.save",
      "project.exportJson",
      "project.importJson",
      "project.restorePrompt",
      "project.commercialOutputs",
      "edit.undo",
      "edit.redo",
      "object.duplicate",
      "edit.deleteSelected",
      "view.toggleLabels",
      "view.viewpoints",
      "connectionPoints.toggle",
      "measurements.show",
      "library.manager",
      "library.taxonomyManager",
      "collision.check",
      "performance.benchmark"
    ],
    notes: "File/Edit/View/Tools commands execute through existing runtime bridges. project.importJson reuses the single persistent App-owned file acquisition provider."
  },
  {
    surfaceId: "surface.workbenchCommandBar",
    surfaceType: "toolbar-action",
    label: "Workbench Command Bar",
    owner: "platform",
    sourceFiles: [
      "src/App.tsx",
      "src/components/workbench/WorkbenchCommandBar.tsx",
      "src/workbench/commandSurfaces/commandSurfaceAdapter.ts"
    ],
    commandIds: [
      "edit.undo",
      "edit.redo",
      "edit.duplicateSelected",
      "edit.deleteSelected",
      "view.toggleLabels",
      "view.showMeasurements",
      "view.toggleConnectionPoints",
      "view.viewpoints"
    ],
    featureIds: [
      "edit.undo",
      "edit.redo",
      "object.duplicate",
      "edit.deleteSelected",
      "view.toggleLabels",
      "measurements.show",
      "connectionPoints.toggle",
      "view.viewpoints"
    ],
    notes: "One-row registry-backed command projection with live enablement, pending, disabled-reason and pressed-state presentation."
  },
  {
    surfaceId: "surface.machineLibrary",
    surfaceType: "panel",
    label: "Machine Library",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineLibrary.tsx"],
    commandIds: ["library.addMachine"],
    panelIds: ["panel.machineLibrary"],
    featureIds: ["library.addMachine", "panel.machineLibrary"]
  },
  {
    surfaceId: "surface.layoutExplorer",
    surfaceType: "panel",
    label: "Layout Explorer",
    owner: "platform",
    sourceFiles: ["src/App.tsx", "src/components/workbench/LayoutExplorer.tsx"],
    panelIds: ["panel.layoutExplorer"],
    featureIds: ["panel.layoutExplorer", "selection.singleSelect", "selection.multiSelect"],
    notes: "Projects current PlatformEntity adapters and writes through the canonical Runtime Selection Bridge."
  },
  {
    surfaceId: "surface.sceneViewport",
    surfaceType: "scene-interaction",
    label: "Babylon Scene Viewport",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx"],
    featureIds: ["viewport.main", "selection.singleSelect", "selection.multiSelect", "object.movePlan"]
  },
  {
    surfaceId: "surface.inspector",
    surfaceType: "property-editor",
    label: "Properties Inspector",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/components/CivilReferenceProperties.tsx"],
    panelIds: ["panel.inspector"],
    featureIds: [
      "panel.rightPanelShell",
      "object.propertiesInspector",
      "panel.inspector",
      "object.rotateY",
      "object.movePlan"
    ]
  },
  {
    surfaceId: "surface.projectSave",
    surfaceType: "persistence",
    label: "Project Save",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/ProjectManager.tsx", "src/utils/projectStorage.ts"],
    commandIds: ["project.save"],
    panelIds: ["panel.projectManager"],
    featureIds: ["project.save", "panel.projectStatus"]
  },
  {
    surfaceId: "surface.projectExportJson",
    surfaceType: "persistence",
    label: "Project JSON Export",
    owner: "existing-ui",
    sourceFiles: ["src/components/ProjectManager.tsx", "src/utils/projectSerialization.ts"],
    commandIds: ["project.exportJson"],
    panelIds: ["panel.projectManager"],
    featureIds: ["project.exportJson"]
  },
  {
    surfaceId: "surface.projectImportJson",
    surfaceType: "persistence",
    label: "Project JSON Import",
    owner: "existing-ui",
    sourceFiles: ["src/components/ProjectManager.tsx", "src/utils/projectSerialization.ts"],
    commandIds: ["project.importJson"],
    panelIds: ["panel.projectManager"],
    featureIds: ["project.importJson"]
  },
  {
    surfaceId: "surface.restorePrompt",
    surfaceType: "persistence",
    label: "Autosave Restore Prompt",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx"],
    commandIds: ["project.restorePrompt"],
    featureIds: ["project.restorePrompt"]
  },
  {
    surfaceId: "surface.projectManager",
    surfaceType: "manager",
    label: "Project Manager",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/ProjectManager.tsx"],
    commandIds: ["project.manager"],
    panelIds: ["panel.projectManager"],
    featureIds: [
      "project.save",
      "project.exportJson",
      "project.importJson",
      "panel.projectManager"
    ]
  },
  {
    surfaceId: "surface.selection",
    surfaceType: "scene-interaction",
    label: "Scene And Explorer Selection",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx", "src/components/AssemblyTreePanel.tsx"],
    featureIds: ["selection.singleSelect", "selection.multiSelect"]
  },
  {
    surfaceId: "surface.multiSelectionAlignment",
    surfaceType: "property-editor",
    label: "Multi-Selection Layout Assistance",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MultiSelectionProperties.tsx", "src/utils/alignment.ts", "src/utils/layoutHistory.ts", "src/utils/placement.ts"],
    commandIds: ["alignment.alignSelection"],
    panelIds: ["panel.inspector"],
    featureIds: ["selection.multiSelect", "alignment.alignSelection", "object.movePlan", "measurements.show", "panel.inspector"],
    notes: "Tracks PR #69-#73 multi-select foundation, alignment/distribution/equal-gap panel actions, and v01 pair reference-point measurement readout."
  },
  {
    surfaceId: "surface.transformEditor",
    surfaceType: "property-editor",
    label: "Transform Editor",
    owner: "existing-ui",
    sourceFiles: ["src/components/MachineProperties.tsx", "src/components/CivilReferenceProperties.tsx"],
    featureIds: ["object.movePlan", "object.rotateY"]
  },
  {
    surfaceId: "surface.deleteSelected",
    surfaceType: "toolbar-action",
    label: "Delete Selected",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/utils/keyboardShortcuts.ts"],
    commandIds: ["edit.deleteSelected"],
    featureIds: ["edit.deleteSelected"],
    notes: "Delete is available from selected-object controls and the guarded Delete keyboard shortcut; repeated keydown and editable targets are ignored."
  },
  {
    surfaceId: "surface.duplicateSelected",
    surfaceType: "toolbar-action",
    label: "Duplicate Selected",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/components/MultiSelectionProperties.tsx", "src/utils/placement.ts", "src/utils/keyboardShortcuts.ts"],
    commandIds: ["edit.duplicateSelected"],
    panelIds: ["panel.inspector"],
    featureIds: ["object.duplicate", "panel.inspector"],
    notes: "Duplicate Selected is exposed for single selected-machine properties, machine multi-selection, and guarded Ctrl/Cmd+D; multi-select duplicate preserves selected pack offsets and does not mutate group membership."
  },
  {
    surfaceId: "surface.undoRedo",
    surfaceType: "keyboard-action",
    label: "Undo And Redo",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/utils/layoutHistory.ts", "src/utils/keyboardShortcuts.ts"],
    commandIds: ["edit.undo", "edit.redo"],
    featureIds: ["edit.undo", "edit.redo"],
    notes: "Undo uses Ctrl/Cmd+Z; redo uses Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z. Editable targets and modal dialogs keep priority."
  },
  {
    surfaceId: "surface.labels",
    surfaceType: "visual-overlay",
    label: "Labels Overlay",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx", "src/components/DisplayOverlayControls.tsx"],
    commandIds: ["view.toggleLabels"],
    featureIds: ["view.toggleLabels"]
  },
  {
    surfaceId: "surface.viewpoints",
    surfaceType: "panel",
    label: "Viewpoints",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/ViewpointsPanel.tsx", "src/utils/viewpoints.ts"],
    commandIds: ["view.viewpoints"],
    panelIds: ["panel.viewpoints"],
    featureIds: ["view.viewpoints", "panel.viewpoints"]
  },
  {
    surfaceId: "surface.measurements",
    surfaceType: "visual-overlay",
    label: "Measurements",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx", "src/components/DisplayOverlayControls.tsx"],
    commandIds: ["view.showMeasurements"],
    featureIds: ["measurements.show"]
  },
  {
    surfaceId: "surface.connectionPoints",
    surfaceType: "visual-overlay",
    label: "Connection Points",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx", "src/components/DisplayOverlayControls.tsx", "src/utils/connectionPoints.ts"],
    commandIds: ["view.toggleConnectionPoints"],
    featureIds: ["connectionPoints.toggle"]
  },
  {
    surfaceId: "surface.coordinateReference",
    surfaceType: "diagnostics",
    label: "Coordinate Reference",
    owner: "legacy-compatible",
    sourceFiles: ["src/utils/coordinateReference.ts", "src/components/MachineProperties.tsx", "src/components/CivilReferenceProperties.tsx"],
    featureIds: ["object.movePlan"],
    notes: "Coordinate/reference-point standard is represented through utility and property surfaces."
  },
  {
    surfaceId: "surface.annotations",
    surfaceType: "panel",
    label: "Annotations",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/AnnotationsPanel.tsx", "src/utils/annotations.ts"],
    commandIds: ["annotations.create"],
    panelIds: ["panel.annotations"],
    featureIds: ["annotations.create", "panel.annotations"]
  },
  {
    surfaceId: "surface.layers",
    surfaceType: "panel",
    label: "Layers",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/LayersPanel.tsx", "src/utils/layers.ts"],
    panelIds: ["panel.layers"],
    featureIds: ["panel.layers"]
  },
  {
    surfaceId: "surface.groups",
    surfaceType: "panel",
    label: "Groups",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/AssemblyTreePanel.tsx", "src/utils/groups.ts"],
    panelIds: ["panel.groups"],
    commandIds: [
      "assembly.createGroup",
      "assembly.addSelected",
      "assembly.removeSelected",
      "assembly.enterEdit",
      "assembly.exitEdit",
      "assembly.ungroup"
    ],
    featureIds: [
      "panel.groups",
      "assembly.createGroup",
      "assembly.addSelected",
      "assembly.removeSelected",
      "assembly.enterEdit",
      "assembly.exitEdit",
      "assembly.ungroup"
    ]
  },
  {
    surfaceId: "surface.collisionCheck",
    surfaceType: "diagnostics",
    label: "Collision Check",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CollisionCheckPanel.tsx", "src/utils/collision.ts"],
    commandIds: ["collision.check"],
    panelIds: ["panel.collisionCheck"],
    featureIds: ["collision.check", "panel.collisionCheck"]
  },
  {
    surfaceId: "surface.performanceBenchmark",
    surfaceType: "diagnostics",
    label: "Performance Benchmark",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/PerformanceBenchmarkModal.tsx", "src/utils/performanceBenchmark.ts"],
    commandIds: ["performance.benchmark"],
    panelIds: ["panel.performanceBenchmark"],
    featureIds: [
      "performance.benchmark",
      "panel.performanceBenchmark",
      "panel.performanceBenchmarkLauncher"
    ]
  },
  {
    surfaceId: "surface.visualDiagnostics",
    surfaceType: "diagnostics",
    label: "Visual Model Diagnostics",
    owner: "existing-ui",
    sourceFiles: ["src/components/MachineProperties.tsx", "src/utils/visualModel.ts"],
    panelIds: ["panel.inspector"],
    featureIds: ["object.propertiesInspector"]
  },
  {
    surfaceId: "surface.libraryManager",
    surfaceType: "manager",
    label: "Library Manager",
    owner: "existing-ui",
    sourceFiles: ["src/components/MachineLibrary.tsx", "src/components/LibraryManager.tsx"],
    commandIds: ["library.manager"],
    panelIds: ["panel.libraryManager"],
    featureIds: ["library.manager", "panel.libraryManager"]
  },
  {
    surfaceId: "surface.taxonomyManager",
    surfaceType: "manager",
    label: "Taxonomy Manager",
    owner: "existing-ui",
    sourceFiles: ["src/components/MachineLibrary.tsx", "src/components/TaxonomyManager.tsx"],
    commandIds: ["library.taxonomyManager"],
    panelIds: ["panel.taxonomyManager"],
    featureIds: ["library.taxonomyManager", "panel.taxonomyManager"]
  },
  {
    surfaceId: "surface.civilFloor",
    surfaceType: "panel",
    label: "Civil Floor",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addFloor"],
    panelIds: ["panel.civilReferences"],
    featureIds: ["civil.floor", "panel.civilReferences"]
  },
  {
    surfaceId: "surface.civilWall",
    surfaceType: "panel",
    label: "Civil Wall",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addWall"],
    panelIds: ["panel.civilReferences"],
    featureIds: ["civil.wall", "panel.civilReferences"]
  },
  {
    surfaceId: "surface.civilColumn",
    surfaceType: "panel",
    label: "Civil Column",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addColumn"],
    panelIds: ["panel.civilReferences"],
    featureIds: ["civil.column", "panel.civilReferences"]
  },
  {
    surfaceId: "surface.civilWalkway",
    surfaceType: "panel",
    label: "Civil Walkway",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addWalkway"],
    panelIds: ["panel.civilReferences"],
    featureIds: ["civil.walkway", "panel.civilReferences"]
  },
  {
    surfaceId: "surface.civilRestrictedZone",
    surfaceType: "panel",
    label: "Civil Restricted Zone",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addRestrictedZone"],
    panelIds: ["panel.civilReferences"],
    featureIds: ["civil.restrictedZone", "panel.civilReferences"]
  },
  {
    surfaceId: "surface.civilReferenceZone",
    surfaceType: "panel",
    label: "Civil Reference Zone",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addReferenceZone"],
    panelIds: ["panel.civilReferences"],
    featureIds: ["civil.referenceZone", "panel.civilReferences"]
  },
  {
    surfaceId: "surface.rotationSnap",
    surfaceType: "property-editor",
    label: "Rotation Snap",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/utils/placement.ts", "src/utils/placementSettings.ts"],
    commandIds: ["snap.rotation"],
    panelIds: ["panel.precisionPlacement"],
    featureIds: ["snap.rotation", "panel.precisionPlacement"]
  },
  {
    surfaceId: "surface.connectionPointSnap",
    surfaceType: "property-editor",
    label: "Connection Point Snap",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/ConnectionPointSnapPanel.tsx", "src/utils/connectionPointSnap.ts"],
    commandIds: ["snap.connectionPoint"],
    panelIds: ["panel.connectionPointSnap"],
    featureIds: ["snap.connectionPoint", "panel.connectionPointSnap"]
  },
  {
    surfaceId: "surface.alignment",
    surfaceType: "property-editor",
    label: "Alignment",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/AlignmentToolsPanel.tsx", "src/utils/alignment.ts"],
    commandIds: ["alignment.alignSelection"],
    panelIds: ["panel.alignmentTools"],
    featureIds: ["alignment.alignSelection", "panel.alignmentTools"]
  },
  {
    surfaceId: "surface.layoutControls",
    surfaceType: "manager",
    label: "Layout Import And Export",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/LayoutControls.tsx"],
    commandIds: ["layout.controls"],
    panelIds: ["panel.layoutControls"],
    featureIds: ["panel.layoutControls"],
    notes: "File-menu command opens the existing layout JSON controls in a dedicated modal tool surface."
  },
  {
    surfaceId: "surface.commercialOutputs",
    surfaceType: "modal",
    label: "Commercial Outputs",
    owner: "platform",
    sourceFiles: [
      "src/App.tsx",
      "src/components/CommercialOutputsModal.tsx",
      "src/commercialOutputs/commercialOutputSnapshot.ts",
      "src/commercialOutputs/xlsxSerializer.ts",
      "src/commercialOutputs/pdfSerializer.ts",
      "src/components/BabylonScene.tsx"
    ],
    commandIds: [
      "project.commercialOutputs",
      "commercial.exportBomExcel",
      "commercial.exportLayoutPdf",
      "commercial.exportScenePng"
    ],
    panelIds: ["panel.commercialOutputs"],
    featureIds: [
      "project.commercialOutputs",
      "commercial.exportBomExcel",
      "commercial.exportLayoutPdf",
      "commercial.exportScenePng",
      "panel.commercialOutputs"
    ],
    notes: "File-owned modal routes three real client-side exports through registered runtime commands and one immutable derived commercial-output snapshot."
  },
  {
    surfaceId: "surface.simulationControls",
    surfaceType: "panel",
    label: "Simulation Controls",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/SimulationControls.tsx"],
    commandIds: ["simulation.controls"],
    panelIds: ["panel.simulationControls"],
    featureIds: ["panel.simulationControls"]
  },
  {
    surfaceId: "surface.workbenchStatusBar",
    surfaceType: "diagnostics",
    label: "Workbench Status Bar",
    owner: "platform",
    sourceFiles: ["src/App.tsx", "src/components/workbench/WorkbenchStatusBar.tsx"],
    panelIds: ["panel.statusBar"],
    featureIds: ["panel.statusBar", "selection.singleSelect", "selection.multiSelect"],
    notes: "Read-only status projection for canonical selection, millimetre units, snap state, and dirty state."
  },
  {
    surfaceId: "surface.displayOverlayControls",
    surfaceType: "modal",
    label: "Display And Overlay Controls",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/DisplayOverlayControls.tsx"],
    commandIds: ["view.displayOverlayControls", "view.toggleLabels", "view.toggleConnectionPoints"],
    panelIds: ["panel.displayOverlayControls"],
    featureIds: [
      "view.displayOverlayControls",
      "view.toggleLabels",
      "connectionPoints.toggle",
      "view.selectionBox",
      "view.metadataBox",
      "view.collisionEnvelope",
      "view.clearanceEnvelope",
      "annotations.visibility",
      "annotations.leaderLines",
      "connectionPoints.displayMode",
      "panel.displayOverlayControls"
    ],
    notes: "View-owned global modal backed by the existing persisted overlaySettings authority."
  },
  {
    surfaceId: "surface.noRedConsoleQualityGate",
    surfaceType: "diagnostics",
    label: "No Red Console Quality Gate",
    owner: "platform",
    sourceFiles: ["e2e/app-smoke.spec.ts", "docs/quality-gate.md"],
    featureIds: ["diagnostics.noRedConsole"],
    notes: "External browser evidence only; this is not a production command or panel."
  }
];
