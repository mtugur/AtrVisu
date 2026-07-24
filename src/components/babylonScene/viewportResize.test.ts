import { describe, expect, it, vi } from "vitest";
import { createViewportResizeRequest, type ViewportResizeReason } from "../../platform/contracts";
import {
  coalesceViewportResizeReason,
  createViewportResizeController,
  evaluateViewportResize,
  type AcceptedViewportResize,
  type ViewportResizeHost,
  type ViewportResizeObserver,
  type ViewportResizeRuntimeState,
  type ViewportResizeWindow
} from "./viewportResize";

const createControllerHarness = () => {
  let width = 1000;
  let height = 700;
  let runFrame: FrameRequestCallback | null = null;
  let notifyObserver: ResizeObserverCallback | null = null;
  let windowResize: EventListenerOrEventListenerObject | null = null;
  const resize = vi.fn();
  const onResize = vi.fn<(state: ViewportResizeRuntimeState) => void>();
  const prepareResize = vi.fn<(next: AcceptedViewportResize) => (() => void) | void>();
  const host = {
    getBoundingClientRect: () => ({ width, height })
  } as Element & ViewportResizeHost;
  const windowTarget: ViewportResizeWindow = {
    devicePixelRatio: 1,
    addEventListener: ((_type: string, listener: EventListenerOrEventListenerObject) => {
      windowResize = listener;
    }) as Window["addEventListener"],
    removeEventListener: ((_type: string, listener: EventListenerOrEventListenerObject) => {
      if (windowResize === listener) {
        windowResize = null;
      }
    }) as Window["removeEventListener"],
    requestAnimationFrame: ((callback: FrameRequestCallback) => {
      runFrame = callback;
      return 1;
    }) as Window["requestAnimationFrame"],
    cancelAnimationFrame: (() => {
      runFrame = null;
    }) as Window["cancelAnimationFrame"]
  };
  const observer: ViewportResizeObserver = {
    observe: vi.fn(),
    disconnect: vi.fn()
  };
  const controller = createViewportResizeController({
    engine: {
      resize,
      getRenderWidth: () => width,
      getRenderHeight: () => height
    },
    host,
    windowTarget,
    createObserver: (callback) => {
      notifyObserver = callback;
      return observer;
    },
    prepareResize,
    onResize
  });

  const flushFrame = () => {
    const callback = runFrame;
    if (!callback) {
      throw new Error("No animation frame is scheduled.");
    }
    runFrame = null;
    callback(1);
  };
  const notifyHostResize = () => {
    if (!notifyObserver) {
      throw new Error("Resize observer is not attached.");
    }
    notifyObserver([], {} as ResizeObserver);
  };
  const notifyWindowResize = () => {
    if (!windowResize) {
      throw new Error("Window resize listener is not attached.");
    }
    if (typeof windowResize === "function") {
      windowResize({ type: "resize" } as Event);
    } else {
      windowResize.handleEvent({ type: "resize" } as Event);
    }
  };

  return {
    controller,
    resize,
    onResize,
    prepareResize,
    observer,
    flushFrame,
    notifyHostResize,
    notifyWindowResize,
    setSize: (nextWidth: number, nextHeight: number) => {
      width = nextWidth;
      height = nextHeight;
    },
    getWindowResizeListener: () => windowResize
  };
};

describe("viewport resize evaluation", () => {
  it("accepts changed width, height, and DPR and ignores repeated observations", () => {
    const initial = evaluateViewportResize(null, {
      cssWidth: 1000,
      cssHeight: 700,
      devicePixelRatio: 1
    }, "manual");
    expect(initial.status).toBe("accepted");
    if (initial.status !== "accepted") {
      return;
    }

    expect(evaluateViewportResize(initial.next, {
      cssWidth: 1100,
      cssHeight: 700,
      devicePixelRatio: 1
    }, "dock-collapse")).toMatchObject({ status: "accepted" });
    expect(evaluateViewportResize(initial.next, {
      cssWidth: 1000,
      cssHeight: 710,
      devicePixelRatio: 1
    }, "window")).toMatchObject({ status: "accepted" });
    expect(evaluateViewportResize(initial.next, {
      cssWidth: 1000,
      cssHeight: 700,
      devicePixelRatio: 2
    }, "window")).toMatchObject({ status: "accepted" });
    expect(evaluateViewportResize(initial.next, {
      cssWidth: 1000,
      cssHeight: 700,
      devicePixelRatio: 1
    }, "splitter")).toMatchObject({ status: "unchanged" });
  });

  it("defers zero-sized observations and accepts a later valid size", () => {
    expect(evaluateViewportResize(null, {
      cssWidth: 0,
      cssHeight: 700,
      devicePixelRatio: 1
    }, "manual")).toMatchObject({ status: "deferred" });
    expect(evaluateViewportResize(null, {
      cssWidth: 1000,
      cssHeight: 700,
      devicePixelRatio: 1
    }, "manual")).toMatchObject({
      status: "accepted",
      next: { resizeGeneration: 1 }
    });
  });
});

describe("viewport resize reason precedence", () => {
  it.each([
    ["dock-collapse", "splitter", "dock-collapse"],
    ["splitter", "dock-collapse", "dock-collapse"],
    ["dock-resize", "splitter", "dock-resize"],
    ["window", "splitter", "window"],
    ["manual", "splitter", "splitter"]
  ] satisfies readonly [ViewportResizeReason, ViewportResizeReason, ViewportResizeReason][])(
    "coalesces %s followed by %s as %s",
    (current, incoming, expected) => {
      expect(coalesceViewportResizeReason(current, incoming)).toBe(expected);
    }
  );
});

describe("viewport resize controller", () => {
  it("reports initial reconciliation as manual and applies resize hooks around engine resize", () => {
    const harness = createControllerHarness();
    const completeResize = vi.fn();
    harness.prepareResize.mockReturnValue(completeResize);
    harness.notifyHostResize();

    harness.flushFrame();

    expect(harness.prepareResize).toHaveBeenCalledOnce();
    expect(harness.resize).toHaveBeenCalledOnce();
    expect(completeResize).toHaveBeenCalledOnce();
    expect(harness.onResize).toHaveBeenCalledWith(expect.objectContaining({
      reason: "manual",
      resizeGeneration: 1
    }));
  });

  it.each([
    {
      first: "dock-collapse" as const,
      second: "splitter" as const,
      expected: "dock-collapse" as const
    },
    {
      first: "splitter" as const,
      second: "dock-collapse" as const,
      expected: "dock-collapse" as const
    },
    {
      first: "dock-resize" as const,
      second: "splitter" as const,
      expected: "dock-resize" as const
    },
    {
      first: "window" as const,
      second: "splitter" as const,
      expected: "window" as const
    }
  ])("records $expected for coalesced $first and $second notifications", ({
    first,
    second,
    expected
  }) => {
    const harness = createControllerHarness();
    harness.flushFrame();
    harness.setSize(1100, 700);

    const schedule = (reason: ViewportResizeReason) => {
      if (reason === "splitter") {
        harness.notifyHostResize();
      } else if (reason === "window") {
        harness.notifyWindowResize();
      } else {
        harness.controller.requestResize(
          createViewportResizeRequest(reason, { width: 1100, height: 700 })
        );
      }
    };
    schedule(first);
    schedule(second);
    harness.flushFrame();

    expect(harness.resize).toHaveBeenCalledTimes(2);
    expect(harness.onResize).toHaveBeenLastCalledWith(expect.objectContaining({
      reason: expected,
      resizeGeneration: 2
    }));
  });

  it("records observer-only resizing as splitter and resets the pending reason", () => {
    const harness = createControllerHarness();
    harness.flushFrame();

    harness.setSize(1050, 700);
    harness.controller.requestResize(
      createViewportResizeRequest("dock-collapse", { width: 1050, height: 700 })
    );
    harness.notifyHostResize();
    harness.flushFrame();
    expect(harness.onResize).toHaveBeenLastCalledWith(expect.objectContaining({
      reason: "dock-collapse"
    }));

    harness.setSize(1100, 700);
    harness.notifyHostResize();
    harness.flushFrame();
    expect(harness.onResize).toHaveBeenLastCalledWith(expect.objectContaining({
      reason: "splitter"
    }));
  });

  it("coalesces observations, suppresses unchanged sizes, and defers zero sizes", () => {
    const harness = createControllerHarness();
    harness.setSize(1050, 700);
    harness.notifyHostResize();
    harness.setSize(1100, 700);
    harness.notifyHostResize();
    harness.flushFrame();

    expect(harness.resize).toHaveBeenCalledOnce();
    expect(harness.onResize).toHaveBeenCalledWith(expect.objectContaining({
      cssWidth: 1100,
      cssHeight: 700,
      resizeGeneration: 1,
      reason: "manual"
    }));

    harness.notifyHostResize();
    expect(harness.controller.requestResize(
      createViewportResizeRequest("dock-resize", { width: 1100, height: 700 })
    )).toEqual({ status: "unchanged" });
    expect(harness.resize).toHaveBeenCalledOnce();

    harness.setSize(1100, 0);
    expect(harness.controller.requestResize(
      createViewportResizeRequest("manual", { width: 1100, height: 1 })
    )).toMatchObject({ status: "deferred" });
    harness.setSize(1100, 720);
    expect(harness.controller.requestResize(
      createViewportResizeRequest("dock-collapse", { width: 1100, height: 720 })
    )).toEqual({ status: "scheduled" });
    harness.flushFrame();
    expect(harness.resize).toHaveBeenCalledTimes(2);
  });

  it("does not advance generation or run resize hooks for unchanged dimensions", () => {
    const harness = createControllerHarness();
    harness.flushFrame();
    harness.prepareResize.mockClear();
    harness.resize.mockClear();
    harness.onResize.mockClear();

    expect(harness.controller.requestResize(
      createViewportResizeRequest("dock-resize", { width: 1000, height: 700 })
    )).toEqual({ status: "unchanged" });
    expect(harness.controller.getState()?.resizeGeneration).toBe(1);
    expect(harness.prepareResize).not.toHaveBeenCalled();
    expect(harness.resize).not.toHaveBeenCalled();
    expect(harness.onResize).not.toHaveBeenCalled();
  });

  it("disconnects observer and window listener on disposal", () => {
    const harness = createControllerHarness();

    harness.controller.dispose();

    expect(harness.observer.disconnect).toHaveBeenCalledOnce();
    expect(harness.getWindowResizeListener()).toBeNull();
  });
});
