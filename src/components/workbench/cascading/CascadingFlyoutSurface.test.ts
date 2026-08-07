import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CascadingFlyoutSurface } from "./CascadingFlyoutSurface";

describe("CascadingFlyoutSurface", () => {
  it("keeps semantics caller-owned while exposing resolved cascade geometry", () => {
    const markup = renderToStaticMarkup(createElement(CascadingFlyoutSurface, {
      depth: 2,
      geometry: {
        side: "left",
        left: 120,
        top: 24,
        width: 320,
        maxHeight: 640,
        sideBySideViable: true
      },
      role: "group",
      "aria-label": "Caller owned controls",
      children: "surface-content"
    }));

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Caller owned controls"');
    expect(markup).toContain('data-cascading-depth="2"');
    expect(markup).toContain('data-cascading-side="left"');
    expect(markup).toContain('position:fixed');
    expect(markup).toContain('left:120px');
    expect(markup).toContain("surface-content");
  });
});
