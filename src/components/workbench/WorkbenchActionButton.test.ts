import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkbenchActionButton } from "./WorkbenchActionButton";

describe("WorkbenchActionButton", () => {
  it("renders one canonical hidden SVG with a truthful icon-only name and title", () => {
    const markup = renderToStaticMarkup(createElement(WorkbenchActionButton, {
      iconId: "delete",
      label: "Delete Packaging Layer",
      tone: "danger"
    }));

    expect(markup).toContain('aria-label="Delete Packaging Layer"');
    expect(markup).toContain('title="Delete Packaging Layer"');
    expect(markup.match(/<svg/g)).toHaveLength(1);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain(">Delete Packaging Layer<");
    expect(markup).toContain("is-icon-only");
    expect(markup).toContain("danger-action");
  });

  it("uses the same primitive for a visible short workflow label and truthful toggle state", () => {
    const markup = renderToStaticMarkup(createElement(WorkbenchActionButton, {
      iconId: "edit",
      label: "Exit Group Edit Packaging Line",
      visibleLabel: "Done",
      "aria-pressed": true
    }));

    expect(markup).toContain(">Done</span>");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("has-label");
  });
});
