import { describe, expect, it } from "vitest";
import {
  isResponsiveInspectorPresentation,
  isResponsivePrimaryDockPresentation,
  resolveInspectorPresentationCollapsed,
  resolvePrimaryDockPresentationCollapsed
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

  it("presentation-collapses the Primary Dock at 720px without changing its desktop preference", () => {
    expect(isResponsivePrimaryDockPresentation(720)).toBe(true);
    expect(resolvePrimaryDockPresentationCollapsed({
      viewportWidth: 640,
      persistedCollapsed: false,
      responsivePrimaryDockOpen: false
    })).toBe(true);
    expect(resolvePrimaryDockPresentationCollapsed({
      viewportWidth: 640,
      persistedCollapsed: false,
      responsivePrimaryDockOpen: true
    })).toBe(false);
    expect(resolvePrimaryDockPresentationCollapsed({
      viewportWidth: 1440,
      persistedCollapsed: false,
      responsivePrimaryDockOpen: true
    })).toBe(false);
  });

  it("restores a persisted collapsed Primary Dock after leaving narrow presentation", () => {
    expect(resolvePrimaryDockPresentationCollapsed({
      viewportWidth: 640,
      persistedCollapsed: true,
      responsivePrimaryDockOpen: true
    })).toBe(false);
    expect(resolvePrimaryDockPresentationCollapsed({
      viewportWidth: 1440,
      persistedCollapsed: true,
      responsivePrimaryDockOpen: true
    })).toBe(true);
  });
});
