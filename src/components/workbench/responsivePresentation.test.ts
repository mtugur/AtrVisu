import { describe, expect, it } from "vitest";
import {
  isResponsiveInspectorPresentation,
  resolveInspectorPresentationCollapsed
} from "./responsivePresentation";

describe("responsive workbench presentation", () => {
  it("collapses the Inspector presentation by default at the 1024-class breakpoint", () => {
    expect(isResponsiveInspectorPresentation(1024)).toBe(true);
    expect(resolveInspectorPresentationCollapsed({
      viewportWidth: 1024,
      persistedCollapsed: false,
      responsiveInspectorOpen: false
    })).toBe(true);
  });

  it("allows an explicit responsive open without replacing the persisted desktop preference", () => {
    const persistedCollapsed = true;
    expect(resolveInspectorPresentationCollapsed({
      viewportWidth: 1024,
      persistedCollapsed,
      responsiveInspectorOpen: true
    })).toBe(false);
    expect(resolveInspectorPresentationCollapsed({
      viewportWidth: 1440,
      persistedCollapsed,
      responsiveInspectorOpen: true
    })).toBe(true);
  });

  it("restores an open persisted desktop Inspector after returning wide", () => {
    expect(resolveInspectorPresentationCollapsed({
      viewportWidth: 1440,
      persistedCollapsed: false,
      responsiveInspectorOpen: false
    })).toBe(false);
  });
});
