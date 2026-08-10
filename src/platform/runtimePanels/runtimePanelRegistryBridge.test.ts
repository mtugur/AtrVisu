import { describe, expect, it, vi } from "vitest";
import type { PanelDefinition } from "../contracts";
import {
  RUNTIME_PANEL_IDS,
  createRuntimePanelRegistryBridge,
  requiredRuntimePanelIds,
  runtimePanelDescriptors,
  type RuntimePanelBindings,
  type RuntimePanelDescriptor
} from "./runtimePanelRegistryBridge";

const availableState = () => ({ isVisible: true, isOpen: false, available: true });

describe("runtime panel registry bridge", () => {
  it("creates one stable registry with deterministic canonical panel registration", () => {
    const bridge = createRuntimePanelRegistryBridge(() => ({}));

    expect(bridge.registry).toBe(bridge.registry);
    expect(bridge.registry.list().map((panel) => panel.id)).toEqual(
      runtimePanelDescriptors.map((descriptor) => descriptor.definition.id)
    );
  });

  it("rejects duplicate runtime panel ids during deterministic registration", () => {
    const definition: PanelDefinition = {
      id: "panel.duplicate",
      title: "Duplicate",
      dock: "floating",
      role: "tool",
      defaultVisible: true,
      canClose: true,
      canResize: false
    };
    const descriptors: RuntimePanelDescriptor[] = [
      {
        definition,
        classification: "required-runtime",
        surfaceKind: "section",
        runtimeLocation: "right-panel-shell"
      },
      {
        definition,
        classification: "required-runtime",
        surfaceKind: "section",
        runtimeLocation: "right-panel-shell"
      }
    ];

    expect(() => createRuntimePanelRegistryBridge(() => ({}), descriptors)).toThrow(/Duplicate panel id/);
  });

  it("uses replacement bindings without rebuilding the registry", () => {
    const firstOpen = vi.fn();
    const replacementOpen = vi.fn();
    let bindings: RuntimePanelBindings = {
      [RUNTIME_PANEL_IDS.machineLibrary]: { getState: availableState, open: firstOpen }
    };
    const bridge = createRuntimePanelRegistryBridge(() => bindings);
    const registry = bridge.registry;

    expect(bridge.openPanel(RUNTIME_PANEL_IDS.machineLibrary)).toMatchObject({ handled: true });
    bindings = {
      [RUNTIME_PANEL_IDS.machineLibrary]: { getState: availableState, open: replacementOpen }
    };
    expect(bridge.openPanel(RUNTIME_PANEL_IDS.machineLibrary)).toMatchObject({ handled: true });

    expect(bridge.registry).toBe(registry);
    expect(firstOpen).toHaveBeenCalledOnce();
    expect(replacementOpen).toHaveBeenCalledOnce();
  });

  it("reports unknown and metadata-only panels safely", () => {
    const bridge = createRuntimePanelRegistryBridge(() => ({}));

    expect(bridge.openPanel("panel.unknown")).toMatchObject({ handled: false, status: "unknown" });
    expect(bridge.openPanel(RUNTIME_PANEL_IDS.layoutExplorer)).toMatchObject({
      handled: false,
      status: "unbound"
    });
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.layoutExplorer)).toMatchObject({
      registered: true,
      bound: false,
      available: false
    });
  });

  it("reports the current runtime location separately from seed dock metadata", () => {
    const bridge = createRuntimePanelRegistryBridge(() => ({
      [RUNTIME_PANEL_IDS.collisionCheck]: { getState: availableState }
    }));

    expect(bridge.registry.get(RUNTIME_PANEL_IDS.collisionCheck)?.dock).toBe("modal");
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.collisionCheck)).toMatchObject({
      bound: true,
      surfaceKind: "section",
      runtimeLocation: "right-panel-shell"
    });
  });

  it("executes one supported operation once and propagates runtime failures", () => {
    const open = vi.fn();
    const error = new Error("Panel failed.");
    const bridge = createRuntimePanelRegistryBridge(() => ({
      [RUNTIME_PANEL_IDS.layers]: { getState: availableState, open },
      [RUNTIME_PANEL_IDS.groups]: {
        getState: availableState,
        open: () => {
          throw error;
        }
      }
    }));

    expect(bridge.openPanel(RUNTIME_PANEL_IDS.layers)).toEqual({ handled: true, status: "executed" });
    expect(open).toHaveBeenCalledOnce();
    expect(() => bridge.openPanel(RUNTIME_PANEL_IDS.groups)).toThrow(error);
  });

  it("reports a cancelled runtime operation as not executed", () => {
    const close = vi.fn(() => false);
    const bridge = createRuntimePanelRegistryBridge(() => ({
      [RUNTIME_PANEL_IDS.machineLibrary]: { getState: availableState, close }
    }));

    expect(bridge.closePanel(RUNTIME_PANEL_IDS.machineLibrary)).toEqual({
      handled: false,
      status: "cancelled",
      reason: `Runtime panel "${RUNTIME_PANEL_IDS.machineLibrary}" operation was cancelled.`
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("reports contextual unavailability without invoking operations", () => {
    const open = vi.fn();
    const bridge = createRuntimePanelRegistryBridge(() => ({
      [RUNTIME_PANEL_IDS.connectionPointSnap]: {
        getState: () => ({
          isVisible: false,
          isOpen: false,
          available: false,
          reason: "Select exactly two explicit machines."
        }),
        open
      }
    }));

    expect(bridge.openPanel(RUNTIME_PANEL_IDS.connectionPointSnap)).toEqual({
      handled: false,
      status: "unavailable",
      reason: "Select exactly two explicit machines."
    });
    expect(open).not.toHaveBeenCalled();
  });

  it("projects changing contextual availability from one stable runtime registry", () => {
    let snapAvailable = false;
    let inspectorAvailable = true;
    const bridge = createRuntimePanelRegistryBridge(() => ({
      [RUNTIME_PANEL_IDS.connectionPointSnap]: {
        getState: () => ({
          isVisible: snapAvailable,
          isOpen: snapAvailable,
          available: snapAvailable,
          ...(snapAvailable ? {} : { reason: "Select exactly two explicit machines." })
        })
      },
      [RUNTIME_PANEL_IDS.inspector]: {
        getState: () => ({
          isVisible: inspectorAvailable,
          isOpen: inspectorAvailable,
          available: inspectorAvailable,
          ...(inspectorAvailable
            ? {}
            : { reason: "Annotation properties are shown in the Annotations panel." })
        })
      }
    }));
    const registry = bridge.registry;

    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.connectionPointSnap)).toMatchObject({
      bound: true,
      available: false,
      reason: "Select exactly two explicit machines."
    });
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.inspector)).toMatchObject({
      bound: true,
      available: true
    });

    snapAvailable = true;
    inspectorAvailable = false;
    expect(bridge.registry).toBe(registry);
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.connectionPointSnap)).toMatchObject({
      available: true
    });
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.inspector)).toMatchObject({
      available: false,
      reason: "Annotation properties are shown in the Annotations panel."
    });
  });

  it("routes section open, close, and toggle while reflecting user-driven state", () => {
    let machineLibraryOpen = true;
    let layersOpen = false;
    let groupsOpen = false;
    const state = (isOpen: boolean) => ({
      isVisible: true,
      isOpen,
      isExpanded: isOpen,
      available: true
    });
    const bridge = createRuntimePanelRegistryBridge(() => ({
      [RUNTIME_PANEL_IDS.machineLibrary]: {
        getState: () => state(machineLibraryOpen),
        open: () => { machineLibraryOpen = true; },
        close: () => { machineLibraryOpen = false; }
      },
      [RUNTIME_PANEL_IDS.layers]: {
        getState: () => state(layersOpen),
        toggle: () => { layersOpen = !layersOpen; }
      },
      [RUNTIME_PANEL_IDS.groups]: {
        getState: () => state(groupsOpen),
        open: () => { groupsOpen = true; }
      }
    }));

    bridge.closePanel(RUNTIME_PANEL_IDS.machineLibrary);
    bridge.togglePanel(RUNTIME_PANEL_IDS.layers);
    bridge.openPanel(RUNTIME_PANEL_IDS.groups);

    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.machineLibrary)).toMatchObject({ open: false });
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.layers)).toMatchObject({ open: true, canToggle: true });
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.groups)).toMatchObject({ open: true, canOpen: true });

    layersOpen = false;
    expect(bridge.getRuntimePanel(RUNTIME_PANEL_IDS.layers)).toMatchObject({ open: false });
  });

  it("lists every required id and fails closure for a missing required live binding", () => {
    const intentionallyUnbound = new Set<string>([
      RUNTIME_PANEL_IDS.machineLibrary
    ]);
    const bindings = Object.fromEntries(
      requiredRuntimePanelIds
        .filter((panelId) => !intentionallyUnbound.has(panelId))
        .map((panelId) => [panelId, { getState: availableState }])
    ) as RuntimePanelBindings;
    const bridge = createRuntimePanelRegistryBridge(() => bindings);
    const report = bridge.getReachabilityReport();

    expect(requiredRuntimePanelIds.length).toBeGreaterThan(0);
    requiredRuntimePanelIds.forEach((panelId) => {
      expect(report.panels.some((panel) => panel.panelId === panelId)).toBe(true);
    });
    expect(report.ready).toBe(false);
    expect(report.missingRequiredBindings).toEqual([
      RUNTIME_PANEL_IDS.machineLibrary
    ]);
    report.panels
      .filter((panel) => panel.classification === "required-runtime" && !intentionallyUnbound.has(panel.panelId))
      .forEach((panel) => expect(panel.bound).toBe(true));
  });
});
