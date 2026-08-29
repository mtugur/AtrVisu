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

  it("keeps disclosure, title, and badge in distinct header slots", () => {
    const markup = renderToStaticMarkup(createElement(PanelSection, {
      title: "Machine Properties",
      badge: "Line 1 Flow Pack Machine",
      defaultExpanded: true,
      expanded: true,
      onExpandedChange: vi.fn(),
      children: createElement("div", null, "properties")
    }));

    expect(markup).toContain('class="panel-section-disclosure"');
    expect(markup).toContain("<strong>Machine Properties</strong>");
    expect(markup).toContain("<small>Line 1 Flow Pack Machine</small>");
    expect(markup.indexOf("panel-section-disclosure")).toBeLessThan(markup.indexOf("Machine Properties"));
    expect(markup.indexOf("Machine Properties")).toBeLessThan(markup.indexOf("Line 1 Flow Pack Machine"));
  });
});
