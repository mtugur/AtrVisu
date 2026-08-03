export const WORKBENCH_REGION_IDS = [
  "application-bar",
  "menu-bar",
  "command-bar",
  "primary-dock",
  "editor-host",
  "secondary-dock",
  "bottom-dock",
  "status-bar",
  "overlay-layer"
] as const;

export type WorkbenchRegionId = (typeof WORKBENCH_REGION_IDS)[number];
export type WorkbenchDockRegionId = Extract<
  WorkbenchRegionId,
  "primary-dock" | "secondary-dock" | "bottom-dock"
>;

export type WorkbenchRegionRole =
  | "application"
  | "navigation"
  | "commands"
  | "dock"
  | "editor"
  | "status"
  | "overlay";

export type WorkbenchRegionDefinition = {
  id: WorkbenchRegionId;
  role: WorkbenchRegionRole;
  labelKey: string;
  order: number;
  hostsPanels: boolean;
};

export const WORKBENCH_LAYOUT_SCHEMA_VERSION = 1 as const;

export const CANONICAL_WORKBENCH_REGION_DEFINITIONS = [
  { id: "application-bar", role: "application", labelKey: "workbench.region.applicationBar", order: 0, hostsPanels: false },
  { id: "menu-bar", role: "navigation", labelKey: "workbench.region.menuBar", order: 1, hostsPanels: false },
  { id: "command-bar", role: "commands", labelKey: "workbench.region.commandBar", order: 2, hostsPanels: false },
  { id: "primary-dock", role: "dock", labelKey: "workbench.region.primaryDock", order: 3, hostsPanels: true },
  { id: "editor-host", role: "editor", labelKey: "workbench.region.editorHost", order: 4, hostsPanels: false },
  { id: "secondary-dock", role: "dock", labelKey: "workbench.region.secondaryDock", order: 5, hostsPanels: true },
  { id: "bottom-dock", role: "dock", labelKey: "workbench.region.bottomDock", order: 6, hostsPanels: true },
  { id: "status-bar", role: "status", labelKey: "workbench.region.statusBar", order: 7, hostsPanels: false },
  { id: "overlay-layer", role: "overlay", labelKey: "workbench.region.overlayLayer", order: 8, hostsPanels: false }
] as const satisfies readonly WorkbenchRegionDefinition[];
