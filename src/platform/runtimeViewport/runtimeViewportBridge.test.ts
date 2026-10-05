import { describe, expect, it, vi } from "vitest";
import { createViewportResizeRequest } from "../contracts";
import {
  RUNTIME_VIEWPORT_IDS,
  createRuntimeViewportBridge,
  type RuntimeViewportBindings,
  type RuntimeViewportDescriptor,
  type RuntimeViewportState
} from "./runtimeViewportBridge";

const availableState = (): RuntimeViewportState => ({
  visible: true,
  available: true,
  cssWidth: 1200,
  cssHeight: 800,
  canvasWidth: 2400,
  canvasHeight: 1600,
  devicePixelRatio: 2,
  sceneLifecycleGeneration: 1,
  resizeGeneration: 2,
  cameraMode: "perspective",
  cameraResolvable: true
});

const request = createViewportResizeRequest("manual", { width: 1200, height: 800 });

describe("runtime viewport bridge", () => {
  it("forwards navigation once to the current live binding without a second camera authority", () => {
    const firstFit = vi.fn(() => true);
    const firstPreset = vi.fn(() => true);
    let bindings: RuntimeViewportBindings = {
      [RUNTIME_VIEWPORT_IDS.main]: {
        getState: availableState,
        getCameraSnapshot: () => null,
        requestResize: () => ({ status: "unchanged" }),
        fitView: firstFit,
        applyViewPreset: firstPreset
      }
    };
    const bridge = createRuntimeViewportBridge(() => bindings);
    expect(bridge.fitView(RUNTIME_VIEWPORT_IDS.main)).toBe(true);
    expect(bridge.applyViewPreset(RUNTIME_VIEWPORT_IDS.main, "z+")).toBe(true);
    expect(firstFit).toHaveBeenCalledOnce();
    expect(firstPreset).toHaveBeenCalledExactlyOnceWith("z+");

    const nextFit = vi.fn(() => false);
    const nextPreset = vi.fn(() => false);
    bindings = {
      [RUNTIME_VIEWPORT_IDS.main]: {
        ...bindings[RUNTIME_VIEWPORT_IDS.main]!,
        fitView: nextFit,
        applyViewPreset: nextPreset
      }
    };
    expect(bridge.fitView(RUNTIME_VIEWPORT_IDS.main)).toBe(false);
    expect(bridge.applyViewPreset(RUNTIME_VIEWPORT_IDS.main, "x+")).toBe(false);
    expect(nextFit).toHaveBeenCalledOnce();
    expect(nextPreset).toHaveBeenCalledExactlyOnceWith("x+");
    expect(firstFit).toHaveBeenCalledOnce();
    expect(firstPreset).toHaveBeenCalledOnce();
  });

  it("never reports navigation handled without an installed navigation callback", () => {
    const bridge = createRuntimeViewportBridge(() => ({}));
    expect(bridge.fitView(RUNTIME_VIEWPORT_IDS.main)).toBe(false);
    expect(bridge.applyViewPreset(RUNTIME_VIEWPORT_IDS.main, "z+")).toBe(false);
  });

  it("registers the canonical main viewport deterministically", () => {
    const bridge = createRuntimeViewportBridge(() => ({}));

    expect(bridge.listRuntimeViewports().map((item) => item.viewportId)).toEqual([
      RUNTIME_VIEWPORT_IDS.main
    ]);
  });

  it("rejects duplicate viewport ids", () => {
    const descriptor: RuntimeViewportDescriptor = {
      id: RUNTIME_VIEWPORT_IDS.main,
      label: "Main",
      requiredRuntime: true
    };

    expect(() => createRuntimeViewportBridge(() => ({}), [descriptor, descriptor])).toThrow(
      /Duplicate viewport id/
    );
  });

  it("reports unknown and unbound viewports safely", () => {
    const bridge = createRuntimeViewportBridge(() => ({}));

    expect(bridge.requestResize("viewport.unknown", request))
      .toMatchObject({ handled: false, status: "unknown" });
    expect(bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, request))
      .toMatchObject({ handled: false, status: "unbound" });
    expect(bridge.getRuntimeViewport(RUNTIME_VIEWPORT_IDS.main)).toMatchObject({
      registered: true,
      bound: false,
      available: false
    });
    expect(bridge.getReachabilityReport()).toMatchObject({
      ready: false,
      missingRequiredBindings: [RUNTIME_VIEWPORT_IDS.main]
    });
  });

  it("reports unavailable and unsupported runtime operations without execution", () => {
    const requestResize = vi.fn(() => ({ status: "scheduled" as const }));
    let state: RuntimeViewportState = {
      ...availableState(),
      available: false,
      reason: "Viewport host is unavailable."
    };
    const bridge = createRuntimeViewportBridge(() => ({
      [RUNTIME_VIEWPORT_IDS.main]: {
        getState: () => state,
        getCameraSnapshot: () => null,
        requestResize
      }
    }));

    expect(bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, request)).toEqual({
      handled: false,
      status: "unavailable",
      reason: "Viewport host is unavailable."
    });
    state = availableState();
    expect(bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, {
      ...request,
      preserveCamera: false
    })).toEqual({
      handled: false,
      status: "unsupported",
      reason: "Runtime viewport resize supports preserve-only requests."
    });
    expect(requestResize).not.toHaveBeenCalled();
  });

  it("executes an accepted runtime resize at most once and propagates failures", () => {
    const requestResize = vi.fn(() => ({ status: "scheduled" as const }));
    const error = new Error("Resize failed.");
    let bindings: RuntimeViewportBindings = {
      [RUNTIME_VIEWPORT_IDS.main]: {
        getState: availableState,
        getCameraSnapshot: () => null,
        requestResize
      }
    };
    const bridge = createRuntimeViewportBridge(() => bindings);

    expect(bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, request)).toEqual({
      handled: true,
      status: "scheduled"
    });
    expect(requestResize).toHaveBeenCalledOnce();

    bindings = {
      [RUNTIME_VIEWPORT_IDS.main]: {
        getState: availableState,
        getCameraSnapshot: () => null,
        requestResize: () => {
          throw error;
        }
      }
    };
    expect(() => bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, request)).toThrow(error);
  });

  it("reads replacement bindings without rebuilding the bridge", () => {
    const first = vi.fn(() => ({ status: "scheduled" as const }));
    const replacement = vi.fn(() => ({ status: "unchanged" as const }));
    let bindings: RuntimeViewportBindings = {
      [RUNTIME_VIEWPORT_IDS.main]: {
        getState: availableState,
        getCameraSnapshot: () => null,
        requestResize: first
      }
    };
    const bridge = createRuntimeViewportBridge(() => bindings);

    bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, request);
    bindings = {
      [RUNTIME_VIEWPORT_IDS.main]: {
        getState: availableState,
        getCameraSnapshot: () => null,
        requestResize: replacement
      }
    };
    expect(bridge.requestResize(RUNTIME_VIEWPORT_IDS.main, request)).toMatchObject({
      handled: true,
      status: "unchanged"
    });
    expect(first).toHaveBeenCalledOnce();
    expect(replacement).toHaveBeenCalledOnce();
    expect(bridge.getReachabilityReport()).toMatchObject({
      ready: true,
      missingRequiredBindings: [],
      unavailableRequiredViewports: []
    });
  });
});
