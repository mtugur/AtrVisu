import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

const createSlot = (testId: string, text: string) =>
  createElement("section", { "data-testid": testId }, text);

const expectTextOrder = (markup: string, orderedText: readonly string[]) => {
  const positions = orderedText.map((text) => markup.indexOf(text));

  positions.forEach((position) => {
    expect(position).toBeGreaterThanOrEqual(0);
  });

  positions.slice(1).forEach((position, index) => {
    expect(position).toBeGreaterThan(positions[index]);
  });
};

describe("AppShell render contract", () => {
  it("renders the current AppShell slots in shell order", () => {
    const markup = renderToStaticMarkup(
      createElement(
        AppShell,
        {
          viewport: createSlot("viewport-slot", "viewport-slot"),
          rightPanel: createSlot("right-panel-slot", "right-panel-slot"),
          diagnostics: createSlot("diagnostics-slot", "diagnostics-slot"),
          modalLayer: createSlot("modal-layer-slot", "modal-layer-slot")
        },
        createSlot("children-slot", "children-slot")
      )
    );

    expectTextOrder(markup, [
      "viewport-slot",
      "right-panel-slot",
      "children-slot",
      "diagnostics-slot",
      "modal-layer-slot"
    ]);
  });

  it("renders the app-root shell zone anchor", () => {
    const markup = renderToStaticMarkup(
      createElement(AppShell, {
        viewport: createSlot("viewport-slot", "viewport-slot")
      })
    );

    expect(markup).toContain('class="app-shell"');
    expect(markup).toContain('data-testid="app-root"');
    expect(markup).toContain('data-app-shell-zone="app-root"');
  });

  it("renders zone anchors for root slot wrapper elements", () => {
    const markup = renderToStaticMarkup(
      createElement(AppShell, {
        viewport: createSlot("viewport-slot", "viewport-slot"),
        rightPanel: createSlot("right-panel-slot", "right-panel-slot"),
        modalLayer: createSlot("modal-layer-slot", "modal-layer-slot")
      })
    );

    expect(markup).toContain('data-app-shell-zone="app-root"');
    expect(markup).toContain('data-app-shell-zone="scene-viewport"');
    expect(markup).toContain('data-app-shell-zone="machine-properties"');
    expect(markup).toContain('data-app-shell-zone="modal-layer"');
  });

  it("applies the committed right-panel inset to the viewport host", () => {
    const markup = renderToStaticMarkup(
      createElement(AppShell, {
        viewport: createSlot("viewport-slot", "viewport-slot"),
        viewportRightInset: 420
      })
    );

    expect(markup).toContain('class="scene-viewport-host"');
    expect(markup).toContain('style="right:min(420px, calc(100vw - 28px))"');
  });
});
