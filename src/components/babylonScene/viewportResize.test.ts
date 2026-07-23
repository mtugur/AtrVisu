import { describe, expect, it, vi } from "vitest";
import { createViewportResizeRequest } from "../../platform/contracts";
import {
  createViewportResizeController,
  evaluateViewportResize,
  type ViewportResizeHost,
  type ViewportResizeObserver,
  type ViewportResizeWindow
} from "./viewportResize";

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

describe("viewport resize controller", () => {
  it("coalesces observations and reconciles the latest committed size once", () => {
    let width = 1000;
    let height = 700;
    let runFrame: FrameRequestCallback = () => {
      throw new Error("No animation frame is scheduled.");
    };
    let notifyObserver: ResizeObserverCallback = () => {
      throw new Error("Resize observer is not attached.");
    };
    let windowResize: EventListenerOrEventListenerObject | null = null;
    const resize = vi.fn();
    const onResize = vi.fn();
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
        runFrame = () => {
          throw new Error("Animation frame was cancelled.");
        };
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
      onResize
    });

    width = 1050;
    notifyObserver([], {} as ResizeObserver);
    width = 1100;
    notifyObserver([], {} as ResizeObserver);
    runFrame(1);

    expect(resize).toHaveBeenCalledOnce();
    expect(onResize).toHaveBeenCalledWith(expect.objectContaining({
      cssWidth: 1100,
      cssHeight: 700,
      resizeGeneration: 1
    }));

    notifyObserver([], {} as ResizeObserver);
    expect(controller.requestResize(
      createViewportResizeRequest("dock-resize", { width: 1100, height: 700 })
    )).toEqual({ status: "unchanged" });
    expect(resize).toHaveBeenCalledOnce();

    height = 0;
    expect(controller.requestResize(
      createViewportResizeRequest("manual", { width: 1100, height: 1 })
    )).toMatchObject({ status: "deferred" });
    height = 720;
    expect(controller.requestResize(
      createViewportResizeRequest("dock-collapse", { width: 1100, height: 720 })
    )).toEqual({ status: "scheduled" });
    runFrame(2);
    expect(resize).toHaveBeenCalledTimes(2);

    controller.dispose();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(windowResize).toBeNull();
  });
});
