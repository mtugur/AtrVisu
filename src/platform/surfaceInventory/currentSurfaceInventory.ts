import type { PlatformSurfaceInventoryItem } from "./surfaceInventoryTypes";

export const currentPlatformSurfaceInventory: readonly PlatformSurfaceInventoryItem[] = [
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
    surfaceId: "surface.sceneViewport",
    surfaceType: "scene-interaction",
    label: "Babylon Scene Viewport",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/BabylonScene.tsx"],
    commandIds: ["view.fitView"],
    featureIds: ["selection.singleSelect", "selection.multiSelect", "object.movePlan"]
  },
  {
    surfaceId: "surface.inspector",
    surfaceType: "property-editor",
    label: "Properties Inspector",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/components/CivilReferenceProperties.tsx"],
    panelIds: ["panel.inspector"],
    featureIds: ["object.propertiesInspector", "panel.inspector", "object.rotateY", "object.movePlan"]
  },
  {
    surfaceId: "surface.statusBar",
    surfaceType: "panel",
    label: "Status Bar",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx"],
    panelIds: ["panel.statusBar"]
  },
  {
    surfaceId: "surface.layoutExplorer",
    surfaceType: "panel",
    label: "Layout Explorer",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/AssemblyTreePanel.tsx"],
    panelIds: ["panel.layoutExplorer"]
  },
  {
    surfaceId: "surface.projectSave",
    surfaceType: "persistence",
    label: "Project Save",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/ProjectManager.tsx", "src/utils/projectStorage.ts"],
    commandIds: ["project.save"],
    panelIds: ["panel.projectManager"],
    featureIds: ["project.save"]
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
    panelIds: ["panel.projectManager"],
    featureIds: ["project.save", "project.exportJson", "project.importJson"]
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
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx"],
    commandIds: ["edit.deleteSelected"],
    featureIds: ["edit.deleteSelected"]
  },
  {
    surfaceId: "surface.duplicateSelected",
    surfaceType: "toolbar-action",
    label: "Duplicate Selected",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/utils/placement.ts"],
    commandIds: ["edit.duplicateSelected"],
    panelIds: ["panel.inspector"],
    featureIds: ["object.duplicate", "panel.inspector"],
    notes: "Single selected-machine duplicate control is exposed in Selected Object Properties; multi-select duplicate remains out of scope."
  },
  {
    surfaceId: "surface.undoRedo",
    surfaceType: "keyboard-action",
    label: "Undo And Redo",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/utils/layoutHistory.ts", "src/utils/keyboardShortcuts.ts"],
    commandIds: ["edit.undo", "edit.redo"],
    featureIds: ["edit.undo", "edit.redo"]
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
    featureIds: ["view.viewpoints"]
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
    featureIds: ["panel.groups"]
  },
  {
    surfaceId: "surface.collisionCheck",
    surfaceType: "diagnostics",
    label: "Collision Check",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CollisionCheckPanel.tsx", "src/utils/collision.ts"],
    commandIds: ["collision.check"],
    panelIds: ["panel.collisionCheck"],
    featureIds: ["collision.check"]
  },
  {
    surfaceId: "surface.performanceBenchmark",
    surfaceType: "diagnostics",
    label: "Performance Benchmark",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/PerformanceBenchmarkModal.tsx", "src/utils/performanceBenchmark.ts"],
    commandIds: ["performance.benchmark"],
    panelIds: ["panel.performanceBenchmark"],
    featureIds: ["performance.benchmark"]
  },
  {
    surfaceId: "surface.visualDiagnostics",
    surfaceType: "diagnostics",
    label: "Visual Model Diagnostics",
    owner: "existing-ui",
    sourceFiles: ["src/components/MachineProperties.tsx", "src/utils/visualModel.ts"],
    commandIds: ["diagnostics.noRedConsole"],
    panelIds: ["panel.inspector", "panel.diagnostics"],
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
    featureIds: ["library.manager"]
  },
  {
    surfaceId: "surface.taxonomyManager",
    surfaceType: "manager",
    label: "Taxonomy Manager",
    owner: "existing-ui",
    sourceFiles: ["src/components/MachineLibrary.tsx", "src/components/TaxonomyManager.tsx"],
    commandIds: ["library.taxonomyManager"],
    panelIds: ["panel.taxonomyManager"],
    featureIds: ["library.taxonomyManager"]
  },
  {
    surfaceId: "surface.civilFloor",
    surfaceType: "panel",
    label: "Civil Floor",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addFloor"],
    featureIds: ["civil.floor"]
  },
  {
    surfaceId: "surface.civilWall",
    surfaceType: "panel",
    label: "Civil Wall",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addWall"],
    featureIds: ["civil.wall"]
  },
  {
    surfaceId: "surface.civilColumn",
    surfaceType: "panel",
    label: "Civil Column",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addColumn"],
    featureIds: ["civil.column"]
  },
  {
    surfaceId: "surface.civilWalkway",
    surfaceType: "panel",
    label: "Civil Walkway",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addWalkway"],
    featureIds: ["civil.walkway"]
  },
  {
    surfaceId: "surface.civilRestrictedZone",
    surfaceType: "panel",
    label: "Civil Restricted Zone",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/CivilReferencePanel.tsx", "src/utils/civil.ts"],
    commandIds: ["civil.addRestrictedZone"],
    featureIds: ["civil.restrictedZone"]
  },
  {
    surfaceId: "surface.rotationSnap",
    surfaceType: "property-editor",
    label: "Rotation Snap",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/MachineProperties.tsx", "src/utils/placement.ts", "src/utils/placementSettings.ts"],
    commandIds: ["snap.rotation"],
    featureIds: ["snap.rotation"]
  },
  {
    surfaceId: "surface.connectionPointSnap",
    surfaceType: "property-editor",
    label: "Connection Point Snap",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/ConnectionPointSnapPanel.tsx", "src/utils/connectionPointSnap.ts"],
    commandIds: ["snap.connectionPoint"],
    featureIds: ["snap.connectionPoint"]
  },
  {
    surfaceId: "surface.alignment",
    surfaceType: "property-editor",
    label: "Alignment",
    owner: "existing-ui",
    sourceFiles: ["src/App.tsx", "src/components/AlignmentToolsPanel.tsx", "src/utils/alignment.ts"],
    commandIds: ["alignment.alignSelection"],
    featureIds: ["alignment.alignSelection"]
  }
];
