import type { PanelDefinition, PanelDock, PanelRole } from "../contracts";

const createPanelSeed = (
  id: string,
  title: string,
  dock: PanelDock,
  role: PanelRole,
  defaultVisible = false,
  canClose = true,
  canResize = true
): PanelDefinition => ({
  id,
  title,
  dock,
  role,
  defaultVisible,
  canClose,
  canResize
});

export const platformPanelSeedDefinitions = [
  createPanelSeed("panel.machineLibrary", "Machine Library", "left", "library", true, false, true),
  createPanelSeed("panel.layoutExplorer", "Layout Explorer", "left", "explorer"),
  createPanelSeed("panel.inspector", "Properties Inspector", "right", "inspector", true, false, true),
  createPanelSeed("panel.statusBar", "Status Bar", "bottom", "status", true, false, false),

  createPanelSeed("panel.annotations", "Annotations", "left", "tool"),
  createPanelSeed("panel.layers", "Layers", "left", "explorer"),
  createPanelSeed("panel.groups", "Groups", "left", "explorer"),
  createPanelSeed("panel.collisionCheck", "Collision Check", "modal", "tool"),
  createPanelSeed("panel.performanceBenchmark", "Performance Benchmark", "modal", "diagnostics"),
  createPanelSeed("panel.diagnostics", "Diagnostics", "modal", "diagnostics"),

  createPanelSeed("panel.projectManager", "Project Manager", "modal", "manager"),
  createPanelSeed("panel.libraryManager", "Library Manager", "modal", "manager"),
  createPanelSeed("panel.taxonomyManager", "Taxonomy Manager", "modal", "manager"),
  createPanelSeed("panel.commercialOutputs", "Commercial Outputs", "modal", "tool")
] as const satisfies readonly PanelDefinition[];

