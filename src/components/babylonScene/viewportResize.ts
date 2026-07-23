import type { ViewportResizeReason, ViewportResizeRequest } from "../../platform/contracts";

export type ViewportResizeObservation = {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
};

export type AcceptedViewportResize = ViewportResizeObservation & {
  resizeGeneration: number;
  reason: ViewportResizeReason;
};

export type ViewportResizeEvaluation =
  | { status: "accepted"; next: AcceptedViewportResize }
  | { status: "unchanged"; current: AcceptedViewportResize }
  | { status: "deferred"; reason: string };

export const evaluateViewportResize = (
  current: AcceptedViewportResize | null,
  observation: ViewportResizeObservation,
  reason: ViewportResizeReason
): ViewportResizeEvaluation => {
  if (
    !Number.isFinite(observation.cssWidth)
    || !Number.isFinite(observation.cssHeight)
    || observation.cssWidth <= 0
    || observation.cssHeight <= 0
  ) {
    return {
      status: "deferred",
      reason: "Viewport resize is deferred until committed dimensions are positive."
    };
  }

  const normalized = {
    cssWidth: Math.round(observation.cssWidth * 1000) / 1000,
    cssHeight: Math.round(observation.cssHeight * 1000) / 1000,
    devicePixelRatio:
      Number.isFinite(observation.devicePixelRatio) && observation.devicePixelRatio > 0
        ? observation.devicePixelRatio
        : 1
  };
  if (
    current
    && current.cssWidth === normalized.cssWidth
    && current.cssHeight === normalized.cssHeight
    && current.devicePixelRatio === normalized.devicePixelRatio
  ) {
    return { status: "unchanged", current };
  }

  return {
    status: "accepted",
    next: {
      ...normalized,
      resizeGeneration: (current?.resizeGeneration ?? 0) + 1,
      reason
    }
  };
};

export type ViewportResizeEngine = {
  resize: () => void;
  getRenderWidth: () => number;
  getRenderHeight: () => number;
};

export type ViewportResizeHost = {
  getBoundingClientRect: () => Pick<DOMRect, "width" | "height">;
};

export type ViewportResizeWindow = {
  devicePixelRatio: number;
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["removeEventListener"];
  requestAnimationFrame: Window["requestAnimationFrame"];
  cancelAnimationFrame: Window["cancelAnimationFrame"];
};

export type ViewportResizeObserver = {
  observe: (target: Element) => void;
  disconnect: () => void;
};

export type ViewportResizeRuntimeState = AcceptedViewportResize & {
  canvasWidth: number;
  canvasHeight: number;
};

type CreateViewportResizeControllerOptions = {
  engine: ViewportResizeEngine;
  host: Element & ViewportResizeHost;
  windowTarget: ViewportResizeWindow;
  createObserver: (callback: ResizeObserverCallback) => ViewportResizeObserver;
  onResize: (state: ViewportResizeRuntimeState) => void;
};

export const createViewportResizeController = ({
  engine,
  host,
  windowTarget,
  createObserver,
  onResize
}: CreateViewportResizeControllerOptions) => {
  let current: AcceptedViewportResize | null = null;
  let pendingFrame: number | null = null;
  let pendingReason: ViewportResizeReason = "manual";
  let disposed = false;

  const readObservation = (): ViewportResizeObservation => {
    const bounds = host.getBoundingClientRect();
    return {
      cssWidth: bounds.width,
      cssHeight: bounds.height,
      devicePixelRatio: windowTarget.devicePixelRatio
    };
  };

  const reconcile = () => {
    pendingFrame = null;
    if (disposed) {
      return;
    }
    const evaluation = evaluateViewportResize(current, readObservation(), pendingReason);
    if (evaluation.status !== "accepted") {
      return;
    }
    engine.resize();
    current = evaluation.next;
    onResize({
      ...evaluation.next,
      canvasWidth: engine.getRenderWidth(),
      canvasHeight: engine.getRenderHeight()
    });
  };

  const schedule = (reason: ViewportResizeReason) => {
    if (disposed) {
      return { status: "deferred" as const, reason: "Viewport resize controller is disposed." };
    }
    pendingReason = reason;
    const evaluation = evaluateViewportResize(current, readObservation(), reason);
    if (evaluation.status === "deferred") {
      return evaluation;
    }
    if (evaluation.status === "unchanged" && pendingFrame === null) {
      return { status: "unchanged" as const };
    }
    if (pendingFrame === null) {
      pendingFrame = windowTarget.requestAnimationFrame(reconcile);
    }
    return { status: "scheduled" as const };
  };

  const observer = createObserver(() => {
    schedule("splitter");
  });
  observer.observe(host);

  const handleWindowResize = () => {
    schedule("window");
  };
  windowTarget.addEventListener("resize", handleWindowResize);
  schedule("manual");

  return {
    getState: () => current,
    requestResize: (request: ViewportResizeRequest) => {
      if (
        !request.preserveCamera
        || !request.preserveSelection
        || !request.preserveEntityTransforms
      ) {
        return {
          status: "deferred" as const,
          reason: "Runtime viewport resize requires all state-preservation flags."
        };
      }
      if (request.nextSize.width <= 0 || request.nextSize.height <= 0) {
        return {
          status: "deferred" as const,
          reason: "Viewport resize is deferred until committed dimensions are positive."
        };
      }
      return schedule(request.reason);
    },
    dispose: () => {
      disposed = true;
      if (pendingFrame !== null) {
        windowTarget.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
      observer.disconnect();
      windowTarget.removeEventListener("resize", handleWindowResize);
    }
  };
};

export type ViewportResizeController = ReturnType<typeof createViewportResizeController>;
