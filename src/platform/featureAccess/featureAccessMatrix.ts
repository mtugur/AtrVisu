import type {
  FeatureAccessClassification,
  FeatureAccessEntry,
  FeatureAccessSurface,
  FeatureQualitySignalId,
  FeatureRuntimeRequirement
} from "../contracts";

type FeatureSeedOptions = {
  classification?: FeatureAccessClassification;
  commandIds?: readonly string[];
  panelIds?: readonly string[];
  runtimeRequirements?: readonly FeatureRuntimeRequirement[];
  qualitySignalId?: FeatureQualitySignalId;
  requiresSurfaceExecutionEvidence?: boolean;
  requiredForRegression?: boolean;
  notes?: string;
};

const feature = (
  featureId: string,
  label: string,
  surfaces: readonly FeatureAccessSurface[],
  options: FeatureSeedOptions = {}
): FeatureAccessEntry => ({
  featureId,
  label,
  classification: options.classification ?? "required-runtime",
  surfaces,
  ...(options.commandIds ? { commandIds: options.commandIds } : {}),
  ...(options.panelIds ? { panelIds: options.panelIds } : {}),
  ...(options.runtimeRequirements ? { runtimeRequirements: options.runtimeRequirements } : {}),
  ...(options.qualitySignalId ? { qualitySignalId: options.qualitySignalId } : {}),
  ...(options.requiresSurfaceExecutionEvidence
    ? { requiresSurfaceExecutionEvidence: true }
    : {}),
  requiredForRegression: options.requiredForRegression
    ?? options.classification !== "declared-planned",
  ...(options.notes ? { notes: options.notes } : {})
});

const panelFeature = (
  panelId: string,
  label: string,
  surfaces: readonly FeatureAccessSurface[] = ["panel"]
) => feature(panelId, label, surfaces, { panelIds: [panelId] });

export const platformFeatureAccessMatrix = [
  feature("project.save", "Save project revision", ["modal"], {
    commandIds: ["project.save"],
    panelIds: ["panel.projectManager"]
  }),
  feature("project.exportJson", "Export project JSON", ["modal"], {
    commandIds: ["project.exportJson"],
    panelIds: ["panel.projectManager"]
  }),
  feature("project.importJson", "Import project JSON", ["modal"], {
    commandIds: ["project.importJson"],
    panelIds: ["panel.projectManager"]
  }),
  feature("project.restorePrompt", "Restore autosaved layout", ["panel"], {
    commandIds: ["project.restorePrompt"]
  }),
  feature("project.manager", "Project Manager", ["menu", "modal"], {
    commandIds: ["project.manager"],
    panelIds: ["panel.projectManager"]
  }),
  feature("project.commercialOutputs", "Commercial Outputs", ["menu", "modal"], {
    commandIds: ["project.commercialOutputs"],
    panelIds: ["panel.commercialOutputs"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("commercial.exportBomExcel", "Export BOM Excel", ["modal"], {
    commandIds: ["commercial.exportBomExcel"],
    panelIds: ["panel.commercialOutputs"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("commercial.exportLayoutPdf", "Export measured layout PDF", ["modal"], {
    commandIds: ["commercial.exportLayoutPdf"],
    panelIds: ["panel.commercialOutputs"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("commercial.exportScenePng", "Export presentation 3D snapshot", ["modal"], {
    commandIds: ["commercial.exportScenePng"],
    panelIds: ["panel.commercialOutputs"],
    runtimeRequirements: ["viewport"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("edit.undo", "Undo", ["toolbar", "shortcut"], {
    commandIds: ["edit.undo"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("edit.redo", "Redo", ["toolbar", "shortcut"], {
    commandIds: ["edit.redo"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("edit.deleteSelected", "Delete selected entity", ["toolbar", "shortcut", "panel"], {
    commandIds: ["edit.deleteSelected"],
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("object.duplicate", "Duplicate selected machines", ["panel", "shortcut"], {
    commandIds: ["edit.duplicateSelected"],
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("entity.rename", "Rename selected project entity", ["menu", "shortcut", "panel"], {
    commandIds: ["edit.renameSelected"],
    panelIds: ["panel.layoutExplorer"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),

  feature("view.fitView", "Fit view", ["api"], {
    classification: "declared-planned",
    commandIds: ["view.fitView"],
    requiredForRegression: false,
    notes: "No current user-facing Fit View action exists."
  }),
  feature("view.displayOverlayControls", "Display and overlay controls", ["menu", "modal"], {
    commandIds: ["view.displayOverlayControls"],
    panelIds: ["panel.displayOverlayControls"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("view.toggleLabels", "Toggle labels", ["menu", "toolbar", "modal"], {
    commandIds: ["view.toggleLabels"],
    panelIds: ["panel.displayOverlayControls"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("view.viewpoints", "Viewpoints", ["panel"], {
    commandIds: ["view.viewpoints"],
    panelIds: ["panel.viewpoints"],
    runtimeRequirements: ["viewport"]
  }),
  feature("connectionPoints.toggle", "Toggle connection points", ["menu", "toolbar", "modal"], {
    commandIds: ["view.toggleConnectionPoints"],
    panelIds: ["panel.displayOverlayControls"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("measurements.show", "Show measurements", ["menu", "toolbar"], {
    commandIds: ["view.showMeasurements"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("view.selectionBox", "Selection box overlay", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("view.metadataBox", "Metadata box overlay", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("view.collisionEnvelope", "Collision envelope overlay", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("view.clearanceEnvelope", "Clearance envelope overlay", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("annotations.visibility", "Annotation overlay visibility", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("annotations.leaderLines", "Annotation leader line visibility", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("connectionPoints.displayMode", "Connection point display mode", ["modal"], {
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("viewport.main", "Main scene viewport", ["api"], {
    runtimeRequirements: ["viewport"]
  }),

  feature("library.addMachine", "Add machine from library", ["panel"], {
    commandIds: ["library.addMachine"],
    panelIds: ["panel.machineLibrary"],
    runtimeRequirements: ["entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("library.manager", "Library Manager", ["panel", "modal"], {
    commandIds: ["library.manager"],
    panelIds: ["panel.libraryManager"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("library.taxonomyManager", "Taxonomy Manager", ["panel", "modal"], {
    commandIds: ["library.taxonomyManager"],
    panelIds: ["panel.taxonomyManager"],
    requiresSurfaceExecutionEvidence: true
  }),

  feature("selection.singleSelect", "Single select entity", ["panel", "api"], {
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("selection.multiSelect", "Multi-select entities", ["panel", "api"], {
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("object.movePlan", "Move object on plan", ["panel", "api"], {
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("object.rotateY", "Rotate object around vertical axis", ["panel"], {
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("object.propertiesInspector", "Object Properties Inspector", ["panel"], {
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"]
  }),

  feature("annotations.create", "Create annotation", ["menu", "panel"], {
    commandIds: ["annotations.create"],
    panelIds: ["panel.annotations"],
    runtimeRequirements: ["entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("collision.check", "Collision check", ["menu", "modal"], {
    commandIds: ["collision.check"],
    panelIds: ["panel.collisionCheck"]
  }),
  feature("snap.rotation", "Rotation snap", ["panel"], {
    commandIds: ["snap.rotation"],
    panelIds: ["panel.precisionPlacement"]
  }),
  feature("snap.connectionPoint", "Connection point snap", ["panel"], {
    commandIds: ["snap.connectionPoint"],
    panelIds: ["panel.connectionPointSnap"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("alignment.alignSelection", "Align selection", ["panel"], {
    commandIds: ["alignment.alignSelection"],
    panelIds: ["panel.alignmentTools"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("arrange.quickActions", "Arrange selection actions", ["menu", "panel"], {
    commandIds: [
      "arrange.alignLeft",
      "arrange.alignRight",
      "arrange.alignFront",
      "arrange.alignBack",
      "arrange.alignCenterX",
      "arrange.alignCenterY",
      "arrange.distributeHorizontal",
      "arrange.distributeVertical",
      "arrange.equalGapX",
      "arrange.equalGapY",
      "arrange.alignmentTools"
    ],
    panelIds: ["panel.alignmentTools"],
    runtimeRequirements: ["selection", "entity"]
  }),

  feature("civil.floor", "Civil floor area", ["panel"], {
    commandIds: ["civil.addFloor"],
    panelIds: ["panel.civilReferences"],
    runtimeRequirements: ["entity"]
  }),
  feature("civil.wall", "Civil wall", ["panel"], {
    commandIds: ["civil.addWall"],
    panelIds: ["panel.civilReferences"],
    runtimeRequirements: ["entity"]
  }),
  feature("civil.column", "Civil column", ["panel"], {
    commandIds: ["civil.addColumn"],
    panelIds: ["panel.civilReferences"],
    runtimeRequirements: ["entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("civil.walkway", "Civil walkway", ["panel"], {
    commandIds: ["civil.addWalkway"],
    panelIds: ["panel.civilReferences"],
    runtimeRequirements: ["entity"]
  }),
  feature("civil.restrictedZone", "Civil restricted zone", ["panel"], {
    commandIds: ["civil.addRestrictedZone"],
    panelIds: ["panel.civilReferences"],
    runtimeRequirements: ["entity"]
  }),
  feature("civil.referenceZone", "Civil reference zone", ["panel"], {
    commandIds: ["civil.addReferenceZone"],
    panelIds: ["panel.civilReferences"],
    runtimeRequirements: ["entity"]
  }),

  feature("assembly.createGroup", "Create Group", ["panel"], {
    commandIds: ["assembly.createGroup"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("assembly.addSelected", "Add Selected to Group", ["panel"], {
    commandIds: ["assembly.addSelected"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("assembly.removeSelected", "Remove Selected from Group", ["panel"], {
    commandIds: ["assembly.removeSelected"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("assembly.enterEdit", "Edit Group", ["panel"], {
    commandIds: ["assembly.enterEdit"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("assembly.exitEdit", "Exit Group Edit", ["panel"], {
    commandIds: ["assembly.exitEdit"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("assembly.ungroup", "Ungroup", ["panel"], {
    commandIds: ["assembly.ungroup"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"],
    requiresSurfaceExecutionEvidence: true
  }),

  feature("performance.benchmark", "Performance benchmark", ["panel", "modal"], {
    commandIds: ["performance.benchmark"],
    panelIds: ["panel.performanceBenchmark"],
    requiresSurfaceExecutionEvidence: true
  }),
  feature("simulation.controls", "Simulation controls", ["menu", "modal"], {
    commandIds: ["simulation.controls"],
    panelIds: ["panel.simulationControls"]
  }),
  feature("help.productGuidance", "Product help and keyboard guidance", ["menu", "modal"], {
    commandIds: ["help.quickStart", "help.keyboardShortcuts", "help.about"],
    panelIds: ["panel.help"]
  }),

  panelFeature("panel.rightPanelShell", "Right panel shell"),
  panelFeature("panel.machineLibrary", "Machine Library panel"),
  panelFeature("panel.layoutExplorer", "Layout Explorer panel"),
  panelFeature("panel.inspector", "Properties Inspector panel"),
  panelFeature("panel.statusBar", "Status Bar panel"),
  feature("panel.layoutControls", "Layout import and export tools", ["menu", "modal"], {
    commandIds: ["layout.controls"],
    panelIds: ["panel.layoutControls"]
  }),
  panelFeature("panel.viewpoints", "Viewpoints panel"),
  panelFeature("panel.layers", "Layers panel"),
  panelFeature("panel.civilReferences", "Building / Civil panel"),
  panelFeature("panel.groups", "Groups panel"),
  panelFeature("panel.projectStatus", "Project status panel"),
  panelFeature("panel.performanceBenchmarkLauncher", "Performance benchmark launcher"),
  panelFeature("panel.simulationControls", "Simulation controls panel"),
  panelFeature("panel.annotations", "Annotations panel"),
  panelFeature("panel.precisionPlacement", "Precision Placement panel"),
  panelFeature("panel.alignmentTools", "Alignment Tools panel"),
  panelFeature("panel.connectionPointSnap", "Connection Point Snap panel"),
  panelFeature("panel.displayOverlayControls", "Display and Overlay Controls panel", ["modal"]),
  panelFeature("panel.collisionCheck", "Collision Check panel"),
  panelFeature("panel.projectManager", "Project Manager", ["modal"]),
  panelFeature("panel.performanceBenchmark", "Performance Benchmark", ["modal"]),
  panelFeature("panel.libraryManager", "Library Manager", ["modal"]),
  panelFeature("panel.taxonomyManager", "Taxonomy Manager", ["modal"]),
  panelFeature("panel.commercialOutputs", "Commercial Outputs", ["modal"]),
  panelFeature("panel.help", "Help", ["modal"]),
  feature("panel.diagnostics", "Diagnostics panel", ["panel"], {
    classification: "declared-planned",
    panelIds: ["panel.diagnostics"],
    requiredForRegression: false,
    notes: "No single production Diagnostics panel exists."
  }),

  feature("diagnostics.noRedConsole", "No red console diagnostics", ["api"], {
    classification: "quality-signal",
    qualitySignalId: "no-red-console",
    notes: "Requires explicit browser or CI evidence; production runtime never self-asserts it."
  })
] as const satisfies readonly FeatureAccessEntry[];
