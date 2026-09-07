import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PreferenceDisclosureRow } from "./PreferenceDisclosureRow";

describe("PreferenceDisclosureRow", () => {
  it("renders caller-owned label and summary as an accessible disclosure button", () => {
    const markup = renderToStaticMarkup(createElement(PreferenceDisclosureRow, {
      label: "Workspace",
      summary: "Layout Engineering",
      expanded: true,
      controlsId: "workspace-child",
      testId: "workspace-row",
      onClick: vi.fn(),
      onKeyDown: vi.fn()
    }));

    expect(markup).toContain('aria-label="Workspace: Layout Engineering"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="workspace-child"');
    expect(markup).toContain('data-testid="workspace-row"');
    expect(markup.match(/<svg/g)).toHaveLength(1);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("›");
  });

  it("uses registered disclosure icons for collapsed and expanded states", () => {
    const render = (expanded: boolean) => renderToStaticMarkup(createElement(PreferenceDisclosureRow, {
      label: "Theme",
      summary: "System",
      expanded,
      controlsId: "theme-child",
      testId: "theme-row",
      onClick: vi.fn(),
      onKeyDown: vi.fn()
    }));

    expect(render(false)).toContain('aria-expanded="false"');
    expect(render(false).match(/<svg/g)).toHaveLength(1);
    expect(render(true)).toContain('aria-expanded="true"');
    expect(render(true).match(/<svg/g)).toHaveLength(1);
  });
});
