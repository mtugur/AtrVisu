export type PanelId = string;

export type PanelDock = "left" | "right" | "bottom" | "modal" | "floating";

export type PanelRole = "library" | "explorer" | "inspector" | "manager" | "diagnostics" | "tool" | "status";

export type PanelVisibilityState = {
  visible: boolean;
  reason?: string;
};

export type PanelDefinition = {
  id: PanelId;
  title: string;
  dock: PanelDock;
  role: PanelRole;
  defaultVisible: boolean;
  canClose: boolean;
  canResize: boolean;
  visibilityRule?: () => PanelVisibilityState;
};

