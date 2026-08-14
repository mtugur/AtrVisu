import type { CommandDefinition, CommandGroup } from "../contracts";

const noopExecute = () => undefined;

const createCommandSeed = (
  id: string,
  group: CommandGroup,
  label: string,
  tooltip: string,
  mutatesData = false,
  shortcut?: string
): CommandDefinition => ({
  id,
  group,
  label,
  tooltip,
  shortcut,
  execute: noopExecute,
  mutatesData,
  requiresUndoTransaction: mutatesData
});

export const platformCommandSeedDefinitions = [
  createCommandSeed("project.save", "file", "Save Project", "Save the current project or revision metadata."),
  createCommandSeed("project.exportJson", "file", "Export Project JSON", "Export the current project as JSON."),
  createCommandSeed("project.importJson", "file", "Import Project JSON", "Import a project JSON file."),
  createCommandSeed("project.restorePrompt", "file", "Restore Autosave", "Restore a previously autosaved layout when available."),
  createCommandSeed("project.manager", "file", "Project Manager", "Open the Project Manager."),
  createCommandSeed("layout.controls", "file", "Layout Import / Export", "Open layout JSON import and export tools."),
  createCommandSeed("project.commercialOutputs", "file", "Commercial Outputs...", "Open BOM, measured plan, and presentation snapshot outputs."),
  createCommandSeed("commercial.exportBomExcel", "file", "Export BOM Excel", "Export a commercial equipment workbook."),
  createCommandSeed("commercial.exportLayoutPdf", "file", "Export 2D Layout PDF", "Export a measured A3 layout plan and equipment schedule."),
  createCommandSeed("commercial.exportScenePng", "file", "Export 3D Snapshot", "Export a presentation-clean image from the current scene camera."),

  createCommandSeed("edit.undo", "edit", "Undo", "Undo the last layout transaction.", false, "Ctrl/Cmd+Z"),
  createCommandSeed("edit.redo", "edit", "Redo", "Redo the next layout transaction.", false, "Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z"),
  createCommandSeed("edit.deleteSelected", "edit", "Delete Selected", "Delete the selected layout entities.", true, "Delete"),
  createCommandSeed("edit.duplicateSelected", "edit", "Duplicate Selected", "Duplicate the selected layout entities.", true, "Ctrl/Cmd+D"),
  createCommandSeed("assembly.createGroup", "edit", "Create Group", "Create an assembly from the selected layout entities.", true),
  createCommandSeed("assembly.addSelected", "edit", "Add Selected", "Add the selected layout entities to an assembly.", true),
  createCommandSeed("assembly.removeSelected", "edit", "Remove Selected", "Remove the selected layout entities from an assembly.", true),
  createCommandSeed("assembly.enterEdit", "edit", "Edit Group", "Edit members of the selected assembly independently."),
  createCommandSeed("assembly.exitEdit", "edit", "Exit Group Edit", "Return the active assembly to rigid selection mode."),
  createCommandSeed("assembly.ungroup", "edit", "Ungroup", "Remove the assembly while preserving its members.", true),

  createCommandSeed("view.fitView", "view", "Fit View", "Fit the viewport to the current layout."),
  createCommandSeed("view.displayOverlayControls", "view", "Display / Overlay Controls", "Open global display and overlay settings."),
  createCommandSeed("view.toggleLabels", "view", "Toggle Labels", "Show or hide layout labels."),
  createCommandSeed("view.viewpoints", "view", "Viewpoints", "Open or manage saved viewpoint states."),
  createCommandSeed("view.toggleConnectionPoints", "view", "Toggle Connection Points", "Show or hide connection point overlays."),
  createCommandSeed("view.showMeasurements", "view", "Show Measurements", "Show or hide measurement helpers."),

  createCommandSeed("library.addMachine", "insert", "Machine From Library", "Add a machine from the machine library.", true),
  createCommandSeed("annotations.create", "insert", "Create Annotation", "Create a layout annotation.", true),
  createCommandSeed("civil.addFloor", "insert", "Add Floor Area", "Add a civil floor or reference zone.", true),
  createCommandSeed("civil.addWall", "insert", "Add Wall", "Add a civil wall reference.", true),
  createCommandSeed("civil.addColumn", "insert", "Add Column", "Add a civil column reference.", true),
  createCommandSeed("civil.addWalkway", "insert", "Add Walkway", "Add a civil walkway reference.", true),
  createCommandSeed("civil.addRestrictedZone", "insert", "Add Restricted Zone", "Add a civil restricted zone.", true),
  createCommandSeed("civil.addReferenceZone", "insert", "Add Reference Zone", "Add a civil reference zone.", true),

  createCommandSeed("alignment.alignSelection", "arrange", "Align Selection", "Align the selected layout entities.", true),
  createCommandSeed("snap.rotation", "arrange", "Rotation Snap", "Toggle or configure rotation snapping."),
  createCommandSeed("snap.connectionPoint", "arrange", "Connection Point Snap", "Toggle or configure connection point snapping."),

  createCommandSeed("library.manager", "tools", "Library Manager", "Open the Library Manager."),
  createCommandSeed("library.taxonomyManager", "tools", "Taxonomy Manager", "Open the Taxonomy Manager."),
  createCommandSeed("collision.check", "tools", "Collision Check", "Run or review collision checks."),
  createCommandSeed("performance.benchmark", "tools", "Performance Benchmark", "Open the performance benchmark tool."),
  createCommandSeed("simulation.controls", "tools", "Simulation Controls", "Open the current simulation controls.")
] as const satisfies readonly CommandDefinition[];

