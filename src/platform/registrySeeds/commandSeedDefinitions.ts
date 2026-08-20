import type { CommandDefinition, CommandGroup } from "../contracts";

const noopExecute = () => undefined;

const createCommandSeed = (
  id: string,
  group: CommandGroup,
  label: string,
  tooltip: string,
  mutatesData = false,
  shortcut?: string,
  iconId?: string
): CommandDefinition => ({
  id,
  group,
  label,
  tooltip,
  shortcut,
  ...(iconId ? { iconId } : {}),
  execute: noopExecute,
  mutatesData,
  requiresUndoTransaction: mutatesData
});

export const platformCommandSeedDefinitions = [
  createCommandSeed("project.save", "file", "Save Project", "Save the current project or revision metadata.", false, undefined, "save"),
  createCommandSeed("project.exportJson", "file", "Export Project JSON", "Export the current project as JSON."),
  createCommandSeed("project.importJson", "file", "Import Project JSON", "Import a project JSON file."),
  createCommandSeed("project.restorePrompt", "file", "Restore Autosave", "Restore a previously autosaved layout when available."),
  createCommandSeed("project.manager", "file", "Project Manager", "Open the Project Manager."),
  createCommandSeed("layout.controls", "file", "Layout Import / Export", "Open layout JSON import and export tools."),
  createCommandSeed("project.commercialOutputs", "file", "Commercial Outputs...", "Open BOM, measured plan, and presentation snapshot outputs."),
  createCommandSeed("commercial.exportBomExcel", "file", "Export BOM Excel", "Export a commercial equipment workbook."),
  createCommandSeed("commercial.exportLayoutPdf", "file", "Export 2D Layout PDF", "Export a measured A3 layout plan and equipment schedule."),
  createCommandSeed("commercial.exportScenePng", "file", "Export 3D Snapshot", "Export a presentation-clean image from the current scene camera."),

  createCommandSeed("edit.undo", "edit", "Undo", "Undo the last layout transaction.", false, "Ctrl/Cmd+Z", "undo"),
  createCommandSeed("edit.redo", "edit", "Redo", "Redo the next layout transaction.", false, "Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z", "redo"),
  createCommandSeed("edit.deleteSelected", "edit", "Delete Selected", "Delete the selected layout entities.", true, "Delete", "delete"),
  createCommandSeed("edit.duplicateSelected", "edit", "Duplicate Selected", "Duplicate the selected layout entities.", true, "Ctrl/Cmd+D", "duplicate"),
  createCommandSeed("edit.renameSelected", "edit", "Rename", "Rename the selected project entity.", true, "F2", "rename"),
  createCommandSeed("assembly.createGroup", "edit", "Create Group", "Create an assembly from the selected layout entities.", true),
  createCommandSeed("assembly.addSelected", "edit", "Add Selected", "Add the selected layout entities to an assembly.", true),
  createCommandSeed("assembly.removeSelected", "edit", "Remove Selected", "Remove the selected layout entities from an assembly.", true),
  createCommandSeed("assembly.enterEdit", "edit", "Edit Group", "Edit members of the selected assembly independently."),
  createCommandSeed("assembly.exitEdit", "edit", "Exit Group Edit", "Return the active assembly to rigid selection mode."),
  createCommandSeed("assembly.ungroup", "edit", "Ungroup", "Remove the assembly while preserving its members.", true),

  createCommandSeed("view.fitView", "view", "Fit View", "Fit the viewport to the current layout."),
  createCommandSeed("view.displayOverlayControls", "view", "Display / Overlay Controls", "Open global display and overlay settings."),
  createCommandSeed("view.toggleLabels", "view", "Labels", "Show or hide layout labels.", false, undefined, "labels"),
  createCommandSeed("view.viewpoints", "view", "Viewpoints", "Open or manage saved viewpoint states.", false, undefined, "viewpoints"),
  createCommandSeed("view.toggleConnectionPoints", "view", "Connection Points", "Show or hide connection point overlays.", false, undefined, "connection-points"),
  createCommandSeed("view.showMeasurements", "view", "Measurement Helpers", "Open distance and placement measurement tools.", false, undefined, "measurement"),

  createCommandSeed("library.addMachine", "insert", "Machine From Library", "Add a machine from the machine library.", true),
  createCommandSeed("annotations.create", "insert", "Create Annotation", "Create a layout annotation.", true),
  createCommandSeed("civil.addFloor", "insert", "Add Floor Area", "Add a civil floor or reference zone.", true),
  createCommandSeed("civil.addWall", "insert", "Add Wall", "Add a civil wall reference.", true),
  createCommandSeed("civil.addColumn", "insert", "Add Column", "Add a civil column reference.", true),
  createCommandSeed("civil.addWalkway", "insert", "Add Walkway", "Add a civil walkway reference.", true),
  createCommandSeed("civil.addRestrictedZone", "insert", "Add Restricted Zone", "Add a civil restricted zone.", true),
  createCommandSeed("civil.addReferenceZone", "insert", "Add Reference Zone", "Add a civil reference zone.", true),

  createCommandSeed("alignment.alignSelection", "arrange", "Align Selection", "Align the selected layout entities.", true),
  createCommandSeed("arrange.alignLeft", "arrange", "Align Left", "Align selected layout entities by their left footprint edges.", true),
  createCommandSeed("arrange.alignRight", "arrange", "Align Right", "Align selected layout entities by their right footprint edges.", true),
  createCommandSeed("arrange.alignFront", "arrange", "Align Front", "Align selected layout entities by their front footprint edges.", true),
  createCommandSeed("arrange.alignBack", "arrange", "Align Back", "Align selected layout entities by their back footprint edges.", true),
  createCommandSeed("arrange.alignCenterX", "arrange", "Align Center X", "Align selected layout entities on the X-axis center.", true),
  createCommandSeed("arrange.alignCenterY", "arrange", "Align Center Y", "Align selected layout entities on the Y-axis center.", true),
  createCommandSeed("arrange.distributeHorizontal", "arrange", "Distribute Horizontally", "Distribute at least three selected entities by horizontal center.", true),
  createCommandSeed("arrange.distributeVertical", "arrange", "Distribute Vertically", "Distribute at least three selected entities by vertical center.", true),
  createCommandSeed("arrange.equalGapX", "arrange", "Equal Gap X", "Equalize horizontal gaps between at least three selected entities.", true),
  createCommandSeed("arrange.equalGapY", "arrange", "Equal Gap Y", "Equalize vertical gaps between at least three selected entities.", true),
  createCommandSeed("arrange.alignmentTools", "arrange", "Selection Tools...", "Open advanced selection alignment and connection-point tools.", false, undefined, "selection-tools"),
  createCommandSeed("snap.rotation", "arrange", "Rotation Snap", "Toggle or configure rotation snapping."),
  createCommandSeed("snap.connectionPoint", "arrange", "Connection Point Snap", "Toggle or configure connection point snapping."),

  createCommandSeed("library.manager", "tools", "Library Manager", "Open the Library Manager."),
  createCommandSeed("library.taxonomyManager", "tools", "Taxonomy Manager", "Open the Taxonomy Manager."),
  createCommandSeed("collision.check", "tools", "Collision Check", "Run or review collision checks."),
  createCommandSeed("performance.benchmark", "tools", "Performance Benchmark", "Open the performance benchmark tool."),
  createCommandSeed("simulation.controls", "tools", "Simulation Controls", "Open the current simulation controls."),

  createCommandSeed("help.quickStart", "help", "Quick Start", "Open the AtrVisu quick-start guide.", false, undefined, "help"),
  createCommandSeed("help.keyboardShortcuts", "help", "Keyboard Shortcuts", "Review the current keyboard shortcuts.", false, undefined, "keyboard"),
  createCommandSeed("help.about", "help", "About AtrVisu", "View AtrVisu product and version information.", false, undefined, "info")
] as const satisfies readonly CommandDefinition[];

