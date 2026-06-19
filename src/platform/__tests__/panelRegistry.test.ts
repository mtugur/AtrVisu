import { describe, expect, it } from "vitest";
import type { PanelDefinition } from "../contracts";
import { createPanelRegistry } from "../registries";

const createPanel = (overrides: Partial<PanelDefinition> = {}): PanelDefinition => ({
  id: "properties.inspector",
  title: "Properties Inspector",
  dock: "right",
  role: "inspector",
  defaultVisible: true,
  canClose: false,
  canResize: true,
  ...overrides
});

describe("panel registry", () => {
  it("registers a valid panel", () => {
    const registry = createPanelRegistry();
    const panel = createPanel();

    registry.register(panel);

    expect(registry.get("properties.inspector")).toBe(panel);
    expect(registry.list()).toEqual([panel]);
  });

  it("rejects duplicate panel ids", () => {
    const registry = createPanelRegistry();
    registry.register(createPanel());

    expect(() => registry.register(createPanel())).toThrow(/Duplicate panel id/);
  });

  it("rejects inspector panels outside the right dock", () => {
    const registry = createPanelRegistry();

    expect(() => registry.register(createPanel({ dock: "left" }))).toThrow(/right dock/);
  });

  it("keeps manager panels separate from inspector role", () => {
    const registry = createPanelRegistry();
    const panel = createPanel({
      id: "library.manager",
      title: "Library Manager",
      dock: "modal",
      role: "manager",
      defaultVisible: false,
      canClose: true,
      canResize: true
    });

    registry.register(panel);

    expect(registry.get("library.manager")?.role).toBe("manager");
    expect(registry.get("library.manager")?.role).not.toBe("inspector");
  });

  it("rejects manager, diagnostics, or tool panels in the right dock", () => {
    const registry = createPanelRegistry();

    expect(() =>
      registry.register(createPanel({
        id: "benchmark.tool",
        title: "Benchmark",
        role: "tool",
        dock: "right"
      }))
    ).toThrow(/right-dock inspector substitute/);
  });

  it("rejects empty titles", () => {
    const registry = createPanelRegistry();

    expect(() => registry.register(createPanel({ title: " " }))).toThrow(/title is required/);
  });
});

