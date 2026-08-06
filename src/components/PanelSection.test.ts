import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PanelSection } from "./PanelSection";

describe("PanelSection controlled expansion", () => {
  it("uses the controlled value as the single rendered expansion source", () => {
    const collapsed = renderToStaticMarkup(createElement(PanelSection, {
      storageKey: "test.panel",
      title: "Test Panel",
      defaultExpanded: true,
      expanded: false,
      onExpandedChange: vi.fn(),
      children: createElement("div", null, "panel-content")
    }));
    const expanded = renderToStaticMarkup(createElement(PanelSection, {
      storageKey: "test.panel",
      title: "Test Panel",
      defaultExpanded: false,
      expanded: true,
      onExpandedChange: vi.fn(),
      children: createElement("div", null, "panel-content")
    }));

    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).not.toContain("panel-content");
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).toContain("panel-content");
  });

  it("does not require or access legacy localStorage in controlled mode", () => {
    const markup = renderToStaticMarkup(createElement(PanelSection, {
      title: "Controlled Panel",
      defaultExpanded: false,
      expanded: true,
      onExpandedChange: vi.fn(),
      children: createElement("div", null, "controlled-content")
    }));

    expect(markup).toContain("controlled-content");
    expect(markup).toContain('aria-expanded="true"');
  });
});
