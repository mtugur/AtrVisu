import type { PanelDefinition, PanelId } from "../contracts";
import { createPanelRegistry } from "../registries";
import { platformPanelSeedDefinitions } from "../registrySeeds";

export const RUNTIME_PANEL_IDS = {
  machineLibrary: "panel.machineLibrary",
  layoutExplorer: "panel.layoutExplorer",
  inspector: "panel.inspector",
  statusBar: "panel.statusBar",
  annotations: "panel.annotations",
  layers: "panel.layers",
  groups: "panel.groups",
  collisionCheck: "panel.collisionCheck",
  performanceBenchmark: "panel.performanceBenchmark",
  diagnostics: "panel.diagnostics",
  projectManager: "panel.projectManager",
  libraryManager: "panel.libraryManager",
  taxonomyManager: "panel.taxonomyManager",
  commercialOutputs: "panel.commercialOutputs",
  primaryDockShell: "panel.primaryDockShell",
  rightPanelShell: "panel.rightPanelShell",
  bottomDockShell: "panel.bottomDockShell",
  layoutControls: "panel.layoutControls",
  viewpoints: "panel.viewpoints",
  civilReferences: "panel.civilReferences",
  projectStatus: "panel.projectStatus",
  performanceBenchmarkLauncher: "panel.performanceBenchmarkLauncher",
  simulationControls: "panel.simulationControls",
  precisionPlacement: "panel.precisionPlacement",
  alignmentTools: "panel.alignmentTools",
  connectionPointSnap: "panel.connectionPointSnap",
  displayOverlayControls: "panel.displayOverlayControls",
  help: "panel.help"
} as const;

export type RuntimePanelId = typeof RUNTIME_PANEL_IDS[keyof typeof RUNTIME_PANEL_IDS];
export type RuntimePanelCapability = "open" | "close" | "toggle";
export type RuntimePanelClassification = "required-runtime" | "declared-planned" | "modal/tool-surface";
export type RuntimePanelSurfaceKind = "section" | "shell" | "modal" | "contextual" | "unbound";
export type RuntimePanelLocation =
  | "primary-dock"
  | "secondary-dock"
  | "bottom-dock"
  | "status-bar"
  | "modal-layer"
  | "unbound";

export type RuntimePanelState = {
  isVisible: boolean;
  isOpen: boolean;
  available: boolean;
  isExpanded?: boolean;
  context?: string;
  reason?: string;
};

export type RuntimePanelBinding = {
  getState: () => RuntimePanelState;
  open?: RuntimePanelOperationHandler;
  close?: RuntimePanelOperationHandler;
  toggle?: RuntimePanelOperationHandler;
};

export type RuntimePanelBindings = Readonly<Partial<Record<RuntimePanelId, RuntimePanelBinding>>>;

export type RuntimePanelDescriptor = {
  definition: PanelDefinition;
  classification: RuntimePanelClassification;
  surfaceKind: RuntimePanelSurfaceKind;
  runtimeLocation: RuntimePanelLocation;
};

export type RuntimePanelReachability = {
  panelId: PanelId;
  title: string;
  classification: RuntimePanelClassification;
  surfaceKind: RuntimePanelSurfaceKind;
  runtimeLocation: RuntimePanelLocation;
  registered: boolean;
  bound: boolean;
  visible: boolean;
  open: boolean;
  available: boolean;
  expanded?: boolean;
  context?: string;
  capabilities: readonly RuntimePanelCapability[];
  canOpen: boolean;
  canClose: boolean;
  canToggle: boolean;
  reason?: string;
};

export type RuntimePanelOperationResult = {
  handled: boolean;
  status: "executed" | "cancelled" | "unknown" | "unbound" | "unavailable" | "unsupported";
  reason?: string;
};

export type RuntimePanelOperationHandler = () => boolean | void;

const panel = (
  id: RuntimePanelId,
  title: string,
  surfaceKind: RuntimePanelSurfaceKind,
  classification: RuntimePanelClassification = "required-runtime",
  runtimeLocation: RuntimePanelLocation = "secondary-dock"
): RuntimePanelDescriptor => ({
  definition: {
    id,
    title,
    dock: surfaceKind === "modal" ? "modal" : "floating",
    role: surfaceKind === "modal" ? "manager" : "tool",
    defaultVisible: surfaceKind !== "modal",
    canClose: true,
    canResize: false
  },
  classification,
  surfaceKind,
  runtimeLocation: surfaceKind === "modal" ? "modal-layer" : runtimeLocation
});

const seedClassifications: Readonly<Record<string, RuntimePanelClassification>> = {
  [RUNTIME_PANEL_IDS.machineLibrary]: "required-runtime",
  [RUNTIME_PANEL_IDS.layoutExplorer]: "required-runtime",
  [RUNTIME_PANEL_IDS.inspector]: "required-runtime",
  [RUNTIME_PANEL_IDS.statusBar]: "required-runtime",
  [RUNTIME_PANEL_IDS.annotations]: "required-runtime",
  [RUNTIME_PANEL_IDS.layers]: "required-runtime",
  [RUNTIME_PANEL_IDS.groups]: "required-runtime",
  [RUNTIME_PANEL_IDS.diagnostics]: "declared-planned",
  [RUNTIME_PANEL_IDS.help]: "required-runtime"
};

const seedSurfaceKinds: Readonly<Record<string, RuntimePanelSurfaceKind>> = {
  [RUNTIME_PANEL_IDS.machineLibrary]: "section",
  [RUNTIME_PANEL_IDS.layoutExplorer]: "section",
  [RUNTIME_PANEL_IDS.inspector]: "contextual",
  [RUNTIME_PANEL_IDS.statusBar]: "section",
  [RUNTIME_PANEL_IDS.annotations]: "section",
  [RUNTIME_PANEL_IDS.layers]: "section",
  [RUNTIME_PANEL_IDS.groups]: "section",
  [RUNTIME_PANEL_IDS.collisionCheck]: "modal",
  [RUNTIME_PANEL_IDS.performanceBenchmark]: "modal",
  [RUNTIME_PANEL_IDS.diagnostics]: "unbound",
  [RUNTIME_PANEL_IDS.projectManager]: "modal",
  [RUNTIME_PANEL_IDS.libraryManager]: "modal",
  [RUNTIME_PANEL_IDS.taxonomyManager]: "modal",
  [RUNTIME_PANEL_IDS.commercialOutputs]: "modal",
  [RUNTIME_PANEL_IDS.help]: "modal"
};

const seedRuntimeLocations: Readonly<Record<string, RuntimePanelLocation>> = {
  [RUNTIME_PANEL_IDS.machineLibrary]: "primary-dock",
  [RUNTIME_PANEL_IDS.layoutExplorer]: "primary-dock",
  [RUNTIME_PANEL_IDS.layers]: "primary-dock",
  [RUNTIME_PANEL_IDS.groups]: "primary-dock",
  [RUNTIME_PANEL_IDS.inspector]: "secondary-dock",
  [RUNTIME_PANEL_IDS.annotations]: "secondary-dock",
  [RUNTIME_PANEL_IDS.statusBar]: "status-bar",
  [RUNTIME_PANEL_IDS.diagnostics]: "unbound",
  [RUNTIME_PANEL_IDS.collisionCheck]: "modal-layer",
  [RUNTIME_PANEL_IDS.performanceBenchmark]: "modal-layer",
  [RUNTIME_PANEL_IDS.projectManager]: "modal-layer",
  [RUNTIME_PANEL_IDS.libraryManager]: "modal-layer",
  [RUNTIME_PANEL_IDS.taxonomyManager]: "modal-layer",
  [RUNTIME_PANEL_IDS.commercialOutputs]: "modal-layer",
  [RUNTIME_PANEL_IDS.help]: "modal-layer"
};

const seededDescriptors: readonly RuntimePanelDescriptor[] = platformPanelSeedDefinitions.map((definition) => ({
  definition,
  classification: seedClassifications[definition.id] ?? "modal/tool-surface",
  surfaceKind: seedSurfaceKinds[definition.id] ?? "unbound",
  runtimeLocation: seedRuntimeLocations[definition.id]
    ?? (seedSurfaceKinds[definition.id] === "unbound" ? "unbound" : "secondary-dock")
}));

const runtimeOnlyDescriptors: readonly RuntimePanelDescriptor[] = [
  panel(RUNTIME_PANEL_IDS.primaryDockShell, "Primary Dock", "shell", "required-runtime", "primary-dock"),
  panel(RUNTIME_PANEL_IDS.rightPanelShell, "Secondary Dock", "shell", "required-runtime", "secondary-dock"),
  panel(RUNTIME_PANEL_IDS.bottomDockShell, "Bottom Dock", "shell", "required-runtime", "bottom-dock"),
  panel(RUNTIME_PANEL_IDS.layoutControls, "Layout Import / Export", "modal", "required-runtime", "modal-layer"),
  panel(RUNTIME_PANEL_IDS.viewpoints, "Viewpoints", "section", "required-runtime", "bottom-dock"),
  panel(RUNTIME_PANEL_IDS.civilReferences, "Building / Civil", "unbound", "modal/tool-surface", "unbound"),
  panel(RUNTIME_PANEL_IDS.projectStatus, "Project Status", "unbound", "modal/tool-surface", "unbound"),
  panel(RUNTIME_PANEL_IDS.performanceBenchmarkLauncher, "Performance Benchmark Launcher", "unbound", "modal/tool-surface", "unbound"),
  panel(RUNTIME_PANEL_IDS.simulationControls, "Simulation Controls", "modal", "modal/tool-surface", "modal-layer"),
  panel(RUNTIME_PANEL_IDS.precisionPlacement, "Precision Placement", "contextual", "required-runtime", "secondary-dock"),
  panel(RUNTIME_PANEL_IDS.alignmentTools, "Selection Tools", "section", "required-runtime", "bottom-dock"),
  panel(RUNTIME_PANEL_IDS.connectionPointSnap, "Connection Point Snap", "contextual", "required-runtime", "secondary-dock"),
  panel(RUNTIME_PANEL_IDS.displayOverlayControls, "Display / Overlay Controls", "modal", "modal/tool-surface", "modal-layer")
];

export const runtimePanelDescriptors = [
  ...seededDescriptors,
  ...runtimeOnlyDescriptors
] as const satisfies readonly RuntimePanelDescriptor[];

export const requiredRuntimePanelIds = runtimePanelDescriptors
  .filter((descriptor) => descriptor.classification === "required-runtime")
  .map((descriptor) => descriptor.definition.id);

const getCapabilities = (binding: RuntimePanelBinding | undefined): RuntimePanelCapability[] => [
  ...(binding?.open ? ["open" as const] : []),
  ...(binding?.close ? ["close" as const] : []),
  ...(binding?.toggle ? ["toggle" as const] : [])
];

const unboundState = (panelId: PanelId): RuntimePanelState => ({
  isVisible: false,
  isOpen: false,
  available: false,
  reason: `Runtime panel "${panelId}" is not bound.`
});

export const createRuntimePanelRegistryBridge = (
  getBindings: () => RuntimePanelBindings,
  descriptors: readonly RuntimePanelDescriptor[] = runtimePanelDescriptors
) => {
  const registry = createPanelRegistry();
  const descriptorById = new Map<PanelId, RuntimePanelDescriptor>();

  descriptors.forEach((descriptor) => {
    registry.register(descriptor.definition);
    descriptorById.set(descriptor.definition.id, descriptor);
  });

  const getRuntimePanel = (panelId: PanelId): RuntimePanelReachability | undefined => {
    const definition = registry.get(panelId);
    const descriptor = descriptorById.get(panelId);
    if (!definition || !descriptor) {
      return undefined;
    }
    const binding = getBindings()[panelId as RuntimePanelId];
    const state = binding?.getState() ?? unboundState(panelId);
    const capabilities = getCapabilities(binding);
    return {
      panelId,
      title: definition.title,
      classification: descriptor.classification,
      surfaceKind: descriptor.surfaceKind,
      runtimeLocation: descriptor.runtimeLocation,
      registered: true,
      bound: Boolean(binding),
      visible: state.isVisible,
      open: state.isOpen,
      available: state.available,
      ...(state.isExpanded !== undefined ? { expanded: state.isExpanded } : {}),
      ...(state.context ? { context: state.context } : {}),
      capabilities,
      canOpen: capabilities.includes("open"),
      canClose: capabilities.includes("close"),
      canToggle: capabilities.includes("toggle"),
      ...(state.reason ? { reason: state.reason } : {})
    };
  };

  const listRuntimePanels = () => registry.list().flatMap((definition) => {
    const panelState = getRuntimePanel(definition.id);
    return panelState ? [panelState] : [];
  });

  const executeOperation = (
    panelId: PanelId,
    operation: RuntimePanelCapability
  ): RuntimePanelOperationResult => {
    if (!registry.get(panelId)) {
      return { handled: false, status: "unknown", reason: `Runtime panel "${panelId}" is unknown.` };
    }
    const binding = getBindings()[panelId as RuntimePanelId];
    if (!binding) {
      return { handled: false, status: "unbound", reason: `Runtime panel "${panelId}" is not bound.` };
    }
    const state = binding.getState();
    if (!state.available) {
      return {
        handled: false,
        status: "unavailable",
        reason: state.reason ?? `Runtime panel "${panelId}" is unavailable.`
      };
    }
    const operationHandler = binding[operation];
    if (!operationHandler) {
      return {
        handled: false,
        status: "unsupported",
        reason: `Runtime panel "${panelId}" does not support ${operation}.`
      };
    }
    if (operationHandler() === false) {
      return {
        handled: false,
        status: "cancelled",
        reason: `Runtime panel "${panelId}" operation was cancelled.`
      };
    }
    return { handled: true, status: "executed" };
  };

  const getReachabilityReport = () => {
    const panels = listRuntimePanels();
    const missingRequiredBindings = panels
      .filter((item) => item.classification === "required-runtime" && !item.bound)
      .map((item) => item.panelId);
    return {
      ready: missingRequiredBindings.length === 0,
      panels,
      missingRequiredBindings
    };
  };

  return {
    registry,
    getRuntimePanel,
    listRuntimePanels,
    openPanel: (panelId: PanelId) => executeOperation(panelId, "open"),
    closePanel: (panelId: PanelId) => executeOperation(panelId, "close"),
    togglePanel: (panelId: PanelId) => executeOperation(panelId, "toggle"),
    getReachabilityReport
  };
};

export type RuntimePanelRegistryBridge = ReturnType<typeof createRuntimePanelRegistryBridge>;

export type RuntimePanelE2EBridge = {
  open: (panelId: PanelId) => RuntimePanelOperationResult;
  close: (panelId: PanelId) => RuntimePanelOperationResult;
  toggle: (panelId: PanelId) => RuntimePanelOperationResult;
  get: (panelId: PanelId) => RuntimePanelReachability | undefined;
};

declare global {
  interface Window {
    __atrvisuRuntimePanels?: RuntimePanelE2EBridge;
  }
}
