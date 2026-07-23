import type { ViewportResizeRequest, ViewportResizeReason } from "../contracts";

export const RUNTIME_VIEWPORT_IDS = {
  main: "viewport.main"
} as const;

export type RuntimeViewportId = typeof RUNTIME_VIEWPORT_IDS[keyof typeof RUNTIME_VIEWPORT_IDS];
export type RuntimeViewportCameraMode = "perspective" | "orthographic";

export type RuntimeViewportCameraSnapshot = {
  mode: RuntimeViewportCameraMode;
  alpha: number;
  beta: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  fov: number;
  orthoLeft?: number;
  orthoRight?: number;
  orthoTop?: number;
  orthoBottom?: number;
};

export type RuntimeViewportState = {
  visible: boolean;
  available: boolean;
  cssWidth: number;
  cssHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  devicePixelRatio: number;
  sceneLifecycleGeneration: number;
  resizeGeneration: number;
  lastResizeReason?: ViewportResizeReason;
  cameraMode?: RuntimeViewportCameraMode;
  cameraResolvable: boolean;
  reason?: string;
};

export type RuntimeViewportResizeResult = {
  status: "scheduled" | "unchanged" | "deferred";
  reason?: string;
};

export type RuntimeViewportBinding = {
  getState: () => RuntimeViewportState;
  getCameraSnapshot: () => RuntimeViewportCameraSnapshot | null;
  requestResize: (request: ViewportResizeRequest) => RuntimeViewportResizeResult;
};

export type RuntimeViewportBindings = Readonly<
  Partial<Record<RuntimeViewportId, RuntimeViewportBinding>>
>;

export type RuntimeViewportDescriptor = {
  id: RuntimeViewportId;
  label: string;
  requiredRuntime: boolean;
};

export type RuntimeViewportReachability = RuntimeViewportState & {
  viewportId: RuntimeViewportId;
  label: string;
  registered: boolean;
  bound: boolean;
};

export type RuntimeViewportOperationResult = {
  handled: boolean;
  status:
    | "scheduled"
    | "unchanged"
    | "deferred"
    | "unknown"
    | "unbound"
    | "unavailable"
    | "unsupported";
  reason?: string;
};

export const runtimeViewportDescriptors = [
  {
    id: RUNTIME_VIEWPORT_IDS.main,
    label: "Main 3D Viewport",
    requiredRuntime: true
  }
] as const satisfies readonly RuntimeViewportDescriptor[];

const unboundState = (viewportId: RuntimeViewportId): RuntimeViewportState => ({
  visible: false,
  available: false,
  cssWidth: 0,
  cssHeight: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  devicePixelRatio: 1,
  sceneLifecycleGeneration: 0,
  resizeGeneration: 0,
  cameraResolvable: false,
  reason: `Runtime viewport "${viewportId}" is not bound.`
});

export const createRuntimeViewportBridge = (
  getBindings: () => RuntimeViewportBindings,
  descriptors: readonly RuntimeViewportDescriptor[] = runtimeViewportDescriptors
) => {
  const descriptorById = new Map<string, RuntimeViewportDescriptor>();

  descriptors.forEach((descriptor) => {
    if (descriptorById.has(descriptor.id)) {
      throw new Error(`Duplicate viewport id "${descriptor.id}".`);
    }
    descriptorById.set(descriptor.id, descriptor);
  });

  const getRuntimeViewport = (
    viewportId: string
  ): RuntimeViewportReachability | undefined => {
    const descriptor = descriptorById.get(viewportId);
    if (!descriptor) {
      return undefined;
    }
    const binding = getBindings()[descriptor.id];
    const state = binding?.getState() ?? unboundState(descriptor.id);
    return {
      viewportId: descriptor.id,
      label: descriptor.label,
      registered: true,
      bound: Boolean(binding),
      ...state
    };
  };

  const listRuntimeViewports = () =>
    descriptors.flatMap((descriptor) => {
      const viewport = getRuntimeViewport(descriptor.id);
      return viewport ? [viewport] : [];
    });

  const requestResize = (
    viewportId: string,
    request: ViewportResizeRequest
  ): RuntimeViewportOperationResult => {
    const descriptor = descriptorById.get(viewportId);
    if (!descriptor) {
      return {
        handled: false,
        status: "unknown",
        reason: `Runtime viewport "${viewportId}" is unknown.`
      };
    }
    const binding = getBindings()[viewportId as RuntimeViewportId];
    if (!binding) {
      return {
        handled: false,
        status: "unbound",
        reason: `Runtime viewport "${viewportId}" is not bound.`
      };
    }
    const state = binding.getState();
    if (!state.available) {
      return {
        handled: false,
        status: "unavailable",
        reason: state.reason ?? `Runtime viewport "${viewportId}" is unavailable.`
      };
    }
    if (
      !request.preserveCamera
      || !request.preserveSelection
      || !request.preserveEntityTransforms
    ) {
      return {
        handled: false,
        status: "unsupported",
        reason: "Runtime viewport resize supports preserve-only requests."
      };
    }
    const result = binding.requestResize(request);
    return {
      handled: result.status === "scheduled" || result.status === "unchanged",
      ...result
    };
  };

  const getCameraSnapshot = (viewportId: string) => {
    if (!descriptorById.has(viewportId)) {
      return undefined;
    }
    return getBindings()[viewportId as RuntimeViewportId]?.getCameraSnapshot() ?? null;
  };

  const getReachabilityReport = () => {
    const viewports = listRuntimeViewports();
    const missingRequiredBindings = descriptors
      .filter((descriptor) => descriptor.requiredRuntime)
      .filter((descriptor) => !getBindings()[descriptor.id])
      .map((descriptor) => descriptor.id);
    const unavailableRequiredViewports = viewports
      .filter((viewport) => descriptorById.get(viewport.viewportId)?.requiredRuntime)
      .filter((viewport) => !viewport.available)
      .map((viewport) => viewport.viewportId);
    return {
      ready: missingRequiredBindings.length === 0 && unavailableRequiredViewports.length === 0,
      viewports,
      missingRequiredBindings,
      unavailableRequiredViewports
    };
  };

  return {
    getRuntimeViewport,
    listRuntimeViewports,
    requestResize,
    getCameraSnapshot,
    getReachabilityReport
  };
};

export type RuntimeViewportBridge = ReturnType<typeof createRuntimeViewportBridge>;

export type RuntimeViewportInvariantSnapshot = {
  selectionIds: readonly string[];
  primarySelectionId: string | null;
  activeGroupEditId: string | null;
  machineTransforms: readonly string[];
  civilTransforms: readonly string[];
  annotationTransforms: readonly string[];
  groupMembership: readonly string[];
  layerState: readonly string[];
  undoDepth: number;
  redoDepth: number;
  undoStack: readonly string[];
  redoStack: readonly string[];
  projectDirty: boolean;
  simulationRunning: boolean;
  simulationSpeed: number;
};

const cameraSnapshotKeys = [
  "alpha",
  "beta",
  "radius",
  "targetX",
  "targetY",
  "targetZ",
  "positionX",
  "positionY",
  "positionZ",
  "fov",
  "orthoLeft",
  "orthoRight",
  "orthoTop",
  "orthoBottom"
] as const satisfies readonly (keyof RuntimeViewportCameraSnapshot)[];

export const areRuntimeViewportCameraSnapshotsEquivalent = (
  left: RuntimeViewportCameraSnapshot,
  right: RuntimeViewportCameraSnapshot,
  tolerance = 1e-6
) =>
  left.mode === right.mode
  && cameraSnapshotKeys.every((key) => {
    const leftValue = left[key];
    const rightValue = right[key];
    if (leftValue === undefined || rightValue === undefined) {
      return leftValue === rightValue;
    }
    return Math.abs(leftValue - rightValue) <= tolerance;
  });

export const areRuntimeViewportInvariantSnapshotsEqual = (
  left: RuntimeViewportInvariantSnapshot,
  right: RuntimeViewportInvariantSnapshot
) =>
  JSON.stringify(left) === JSON.stringify(right);

export type RuntimeViewportE2EBridge = {
  get: (viewportId: RuntimeViewportId) => RuntimeViewportReachability | undefined;
  list: () => RuntimeViewportReachability[];
  requestResize: (
    viewportId: string,
    request: ViewportResizeRequest
  ) => RuntimeViewportOperationResult;
  getCameraSnapshot: (
    viewportId: RuntimeViewportId
  ) => RuntimeViewportCameraSnapshot | null | undefined;
  getInvariants: () => RuntimeViewportInvariantSnapshot;
};

declare global {
  interface Window {
    __atrvisuRuntimeViewport?: RuntimeViewportE2EBridge;
  }
}
