import type { FeatureAccessEntry } from "../contracts";

export const platformFeatureAccessMatrix = [
  {
    featureId: "project.save",
    label: "Save project revision",
    surfaces: ["modal"],
    requiredForRegression: true,
    notes: "Project Manager save/revision workflow."
  },
  {
    featureId: "project.exportJson",
    label: "Export project JSON",
    surfaces: ["modal"],
    requiredForRegression: true
  },
  {
    featureId: "project.importJson",
    label: "Import project JSON",
    surfaces: ["modal"],
    requiredForRegression: true
  },
  {
    featureId: "project.restorePrompt",
    label: "Restore autosaved layout",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "edit.undo",
    label: "Undo",
    surfaces: ["toolbar", "shortcut"],
    requiredForRegression: true
  },
  {
    featureId: "edit.redo",
    label: "Redo",
    surfaces: ["toolbar", "shortcut"],
    requiredForRegression: true
  },
  {
    featureId: "edit.deleteSelected",
    label: "Delete selected entity",
    surfaces: ["toolbar", "shortcut", "panel"],
    requiredForRegression: true
  },
  {
    featureId: "view.fitView",
    label: "Fit view",
    surfaces: ["api"],
    requiredForRegression: false,
    notes: "Viewport capability exists as camera-facing API behavior until command registry integration."
  },
  {
    featureId: "view.toggleLabels",
    label: "Toggle labels",
    surfaces: ["toolbar", "menu"],
    requiredForRegression: true
  },
  {
    featureId: "view.viewpoints",
    label: "Viewpoints",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "library.addMachine",
    label: "Add machine from library",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "library.manager",
    label: "Library Manager",
    surfaces: ["panel", "modal"],
    requiredForRegression: true
  },
  {
    featureId: "library.taxonomyManager",
    label: "Taxonomy Manager",
    surfaces: ["panel", "modal"],
    requiredForRegression: true
  },
  {
    featureId: "selection.singleSelect",
    label: "Single select entity",
    surfaces: ["panel", "api"],
    requiredForRegression: true
  },
  {
    featureId: "selection.multiSelect",
    label: "Multi-select entities",
    surfaces: ["panel", "api"],
    requiredForRegression: true
  },
  {
    featureId: "object.movePlan",
    label: "Move object on plan",
    surfaces: ["panel", "api"],
    requiredForRegression: true
  },
  {
    featureId: "object.rotateY",
    label: "Rotate object around vertical axis",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "object.duplicate",
    label: "Duplicate object",
    surfaces: ["api"],
    requiredForRegression: false,
    notes: "Reserved platform capability; not currently exposed as active UI."
  },
  {
    featureId: "object.propertiesInspector",
    label: "Object Properties Inspector",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "annotations.create",
    label: "Create annotation",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "collision.check",
    label: "Collision check",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "connectionPoints.toggle",
    label: "Toggle connection points",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "snap.rotation",
    label: "Rotation snap",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "snap.connectionPoint",
    label: "Connection point snap",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "alignment.alignSelection",
    label: "Align selection",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "measurements.show",
    label: "Show measurements",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "panel.machineLibrary",
    label: "Machine Library panel",
    surfaces: ["panel"],
    panelId: "panel.machineLibrary",
    requiredForRegression: true
  },
  {
    featureId: "panel.inspector",
    label: "Properties Inspector panel",
    surfaces: ["panel"],
    panelId: "panel.inspector",
    requiredForRegression: true
  },
  {
    featureId: "panel.annotations",
    label: "Annotations panel",
    surfaces: ["panel"],
    panelId: "panel.annotations",
    requiredForRegression: true
  },
  {
    featureId: "panel.layers",
    label: "Layers panel",
    surfaces: ["panel"],
    panelId: "panel.layers",
    requiredForRegression: true
  },
  {
    featureId: "panel.groups",
    label: "Groups panel",
    surfaces: ["panel"],
    panelId: "panel.groups",
    requiredForRegression: true
  },
  {
    featureId: "civil.floor",
    label: "Civil floor area",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "civil.wall",
    label: "Civil wall",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "civil.column",
    label: "Civil column",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "civil.walkway",
    label: "Civil walkway",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "civil.restrictedZone",
    label: "Civil restricted zone",
    surfaces: ["panel"],
    requiredForRegression: true
  },
  {
    featureId: "performance.benchmark",
    label: "Performance benchmark",
    surfaces: ["modal"],
    requiredForRegression: true
  },
  {
    featureId: "diagnostics.noRedConsole",
    label: "No red console diagnostics",
    surfaces: ["api"],
    requiredForRegression: true
  }
] as const satisfies readonly FeatureAccessEntry[];

