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
  feature("edit.undo", "Undo", ["toolbar", "shortcut"], { commandIds: ["edit.undo"] }),
  feature("edit.redo", "Redo", ["toolbar", "shortcut"], { commandIds: ["edit.redo"] }),
  feature("edit.deleteSelected", "Delete selected entity", ["toolbar", "shortcut", "panel"], {
    commandIds: ["edit.deleteSelected"],
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("object.duplicate", "Duplicate selected machines", ["panel", "shortcut"], {
    commandIds: ["edit.duplicateSelected"],
    panelIds: ["panel.inspector"],
    runtimeRequirements: ["selection", "entity"]
  }),

  feature("view.fitView", "Fit view", ["api"], {
    classification: "declared-planned",
    commandIds: ["view.fitView"],
    requiredForRegression: false,
    notes: "No current user-facing Fit View action exists."
  }),
  feature("view.toggleLabels", "Toggle labels", ["panel"], {
    commandIds: ["view.toggleLabels"],
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("view.viewpoints", "Viewpoints", ["panel"], {
    commandIds: ["view.viewpoints"],
    panelIds: ["panel.viewpoints"],
    runtimeRequirements: ["viewport"]
  }),
  feature("connectionPoints.toggle", "Toggle connection points", ["panel"], {
    commandIds: ["view.toggleConnectionPoints"],
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("measurements.show", "Show measurements", ["panel"], {
    commandIds: ["view.showMeasurements"],
    panelIds: ["panel.displayOverlayControls"]
  }),
  feature("viewport.main", "Main scene viewport", ["api"], {
    runtimeRequirements: ["viewport"]
  }),

  feature("library.addMachine", "Add machine from library", ["panel"], {
    commandIds: ["library.addMachine"],
    panelIds: ["panel.machineLibrary"],
    runtimeRequirements: ["entity"]
  }),
  feature("library.manager", "Library Manager", ["panel", "modal"], {
    commandIds: ["library.manager"],
    panelIds: ["panel.libraryManager"]
  }),
  feature("library.taxonomyManager", "Taxonomy Manager", ["panel", "modal"], {
    commandIds: ["library.taxonomyManager"],
    panelIds: ["panel.taxonomyManager"]
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

  feature("annotations.create", "Create annotation", ["panel"], {
    commandIds: ["annotations.create"],
    panelIds: ["panel.annotations"],
    runtimeRequirements: ["entity"]
  }),
  feature("collision.check", "Collision check", ["panel"], {
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
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("alignment.alignSelection", "Align selection", ["panel"], {
    commandIds: ["alignment.alignSelection"],
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
    runtimeRequirements: ["entity"]
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
    runtimeRequirements: ["selection", "entity"]
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
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("assembly.exitEdit", "Exit Group Edit", ["panel"], {
    commandIds: ["assembly.exitEdit"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"]
  }),
  feature("assembly.ungroup", "Ungroup", ["panel"], {
    commandIds: ["assembly.ungroup"],
    panelIds: ["panel.groups"],
    runtimeRequirements: ["selection", "entity"]
  }),

  feature("performance.benchmark", "Performance benchmark", ["panel", "modal"], {
    commandIds: ["performance.benchmark"],
    panelIds: ["panel.performanceBenchmark"]
  }),

  panelFeature("panel.rightPanelShell", "Right panel shell"),
  panelFeature("panel.machineLibrary", "Machine Library panel"),
  feature("panel.layoutExplorer", "Layout Explorer panel", ["panel"], {
    classification: "declared-planned",
    panelIds: ["panel.layoutExplorer"],
    requiredForRegression: false,
    notes: "The current Assembly Tree is not relabeled as Layout Explorer."
  }),
  panelFeature("panel.inspector", "Properties Inspector panel"),
  feature("panel.statusBar", "Status Bar panel", ["panel"], {
    classification: "declared-planned",
    panelIds: ["panel.statusBar"],
    requiredForRegression: false
  }),
  panelFeature("panel.layoutControls", "Layout Controls panel"),
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
  panelFeature("panel.displayOverlayControls", "Display and Overlay Controls panel"),
  panelFeature("panel.collisionCheck", "Collision Check panel"),
  panelFeature("panel.projectManager", "Project Manager", ["modal"]),
  panelFeature("panel.performanceBenchmark", "Performance Benchmark", ["modal"]),
  panelFeature("panel.libraryManager", "Library Manager", ["modal"]),
  panelFeature("panel.taxonomyManager", "Taxonomy Manager", ["modal"]),
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
