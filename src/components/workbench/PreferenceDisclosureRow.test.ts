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
  });
});
