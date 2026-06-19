export type FeatureAccessCoverageDefinition = {
  featureId: string;
  commandIds?: readonly string[];
  panelIds?: readonly string[];
  coverageType: "command" | "panel" | "command-and-panel" | "metadata-only";
  notes?: string;
};

export const platformFeatureAccessCoverageDefinitions = [
  { featureId: "project.save", commandIds: ["project.save"], panelIds: ["panel.projectManager"], coverageType: "command-and-panel" },
  { featureId: "project.exportJson", commandIds: ["project.exportJson"], panelIds: ["panel.projectManager"], coverageType: "command-and-panel" },
  { featureId: "project.importJson", commandIds: ["project.importJson"], panelIds: ["panel.projectManager"], coverageType: "command-and-panel" },
  { featureId: "project.restorePrompt", commandIds: ["project.restorePrompt"], coverageType: "command" },
  { featureId: "edit.undo", commandIds: ["edit.undo"], coverageType: "command" },
  { featureId: "edit.redo", commandIds: ["edit.redo"], coverageType: "command" },
  { featureId: "edit.deleteSelected", commandIds: ["edit.deleteSelected"], panelIds: ["panel.inspector"], coverageType: "command-and-panel" },
  { featureId: "view.fitView", commandIds: ["view.fitView"], coverageType: "command" },
  { featureId: "view.toggleLabels", commandIds: ["view.toggleLabels"], coverageType: "command" },
  { featureId: "view.viewpoints", commandIds: ["view.viewpoints"], coverageType: "command" },
  { featureId: "library.addMachine", commandIds: ["library.addMachine"], panelIds: ["panel.machineLibrary"], coverageType: "command-and-panel" },
  { featureId: "library.manager", commandIds: ["library.manager"], panelIds: ["panel.libraryManager"], coverageType: "command-and-panel" },
  { featureId: "library.taxonomyManager", commandIds: ["library.taxonomyManager"], panelIds: ["panel.taxonomyManager"], coverageType: "command-and-panel" },
  {
    featureId: "selection.singleSelect",
    coverageType: "metadata-only",
    notes: "Selection contract coverage; runtime selection manager integration is intentionally outside this branch."
  },
  {
    featureId: "selection.multiSelect",
    coverageType: "metadata-only",
    notes: "Selection contract coverage; runtime selection manager integration is intentionally outside this branch."
  },
  {
    featureId: "object.movePlan",
    panelIds: ["panel.inspector"],
    coverageType: "panel",
    notes: "Object movement is represented through inspector/property coverage until command seeds are added."
  },
  {
    featureId: "object.rotateY",
    panelIds: ["panel.inspector"],
    coverageType: "panel",
    notes: "Object rotation is represented through inspector/property coverage until command seeds are added."
  },
  { featureId: "object.duplicate", commandIds: ["edit.duplicateSelected"], coverageType: "command" },
  { featureId: "object.propertiesInspector", panelIds: ["panel.inspector"], coverageType: "panel" },
  { featureId: "annotations.create", commandIds: ["annotations.create"], panelIds: ["panel.annotations"], coverageType: "command-and-panel" },
  { featureId: "collision.check", commandIds: ["collision.check"], panelIds: ["panel.collisionCheck"], coverageType: "command-and-panel" },
  { featureId: "connectionPoints.toggle", commandIds: ["view.toggleConnectionPoints"], coverageType: "command" },
  { featureId: "snap.rotation", commandIds: ["snap.rotation"], coverageType: "command" },
  { featureId: "snap.connectionPoint", commandIds: ["snap.connectionPoint"], coverageType: "command" },
  { featureId: "alignment.alignSelection", commandIds: ["alignment.alignSelection"], coverageType: "command" },
  { featureId: "measurements.show", commandIds: ["view.showMeasurements"], coverageType: "command" },
  { featureId: "panel.machineLibrary", panelIds: ["panel.machineLibrary"], coverageType: "panel" },
  { featureId: "panel.inspector", panelIds: ["panel.inspector"], coverageType: "panel" },
  { featureId: "panel.annotations", panelIds: ["panel.annotations"], coverageType: "panel" },
  { featureId: "panel.layers", panelIds: ["panel.layers"], coverageType: "panel" },
  { featureId: "panel.groups", panelIds: ["panel.groups"], coverageType: "panel" },
  { featureId: "civil.floor", commandIds: ["civil.addFloor"], coverageType: "command" },
  { featureId: "civil.wall", commandIds: ["civil.addWall"], coverageType: "command" },
  { featureId: "civil.column", commandIds: ["civil.addColumn"], coverageType: "command" },
  { featureId: "civil.walkway", commandIds: ["civil.addWalkway"], coverageType: "command" },
  { featureId: "civil.restrictedZone", commandIds: ["civil.addRestrictedZone"], coverageType: "command" },
  { featureId: "performance.benchmark", commandIds: ["performance.benchmark"], panelIds: ["panel.performanceBenchmark"], coverageType: "command-and-panel" },
  { featureId: "diagnostics.noRedConsole", commandIds: ["diagnostics.noRedConsole"], panelIds: ["panel.diagnostics"], coverageType: "command-and-panel" }
] as const satisfies readonly FeatureAccessCoverageDefinition[];

