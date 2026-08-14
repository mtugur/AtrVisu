import { createElement, type CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// Node is available to Vitest; the app intentionally does not depend on @types/node.
// @ts-expect-error The test-only built-in import is outside the browser type surface.
import { readFileSync } from "node:fs";
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

  it("exposes derived workspace Inspector mode without changing shell composition", () => {
    const markup = renderToStaticMarkup(
      createElement(AppShell, {
        viewport: createSlot("viewport-slot", "viewport-slot"),
        workspaceInspectorMode: "engineering"
      })
    );

    expect(markup).toContain('data-workspace-inspector-mode="engineering"');
    expect(markup.match(/data-workspace-inspector-mode=/g)).toHaveLength(1);
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
    expect(markup).toContain('style="--av-shell-top-inset:0px"');
    expect(markup).toContain('style="left:min(0px, calc(100vw - 28px));right:min(420px, calc(100vw - 28px));bottom:0px"');
  });

  it("owns one shell inset property without injecting right-panel geometry", () => {
    const markup = renderToStaticMarkup(createElement(AppShell, {
      viewport: createSlot("viewport-slot", "viewport-slot"),
      shellTopInset: "var(--canonical-inset)",
      rightPanel: createElement("aside", {
        style: { "--panel-width": "360px" } as CSSProperties
      }, "right-panel")
    }));
    const rightPanelMarkup = markup.match(/<aside[^>]*>right-panel<\/aside>/)?.[0] ?? "";

    expect(markup).toContain('style="--av-shell-top-inset:var(--canonical-inset)"');
    expect(rightPanelMarkup).toContain("--panel-width:360px");
    expect(rightPanelMarkup).not.toMatch(/(?:^|;)top:/);
    expect(rightPanelMarkup).not.toMatch(/(?:^|;)height:/);
  });

  it("keeps desktop inset geometry in CSS and restores the mobile bottom sheet", () => {
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.scene-viewport-host\s*{[^}]*top:\s*var\(--av-shell-top-inset\)/s);
    expect(styles).toMatch(/\.machine-panel\s*{[^}]*top:\s*var\(--av-shell-top-inset\)[^}]*height:\s*calc\(100% - var\(--av-shell-top-inset\)\)/s);
    expect(styles).toMatch(/@media \(max-width: 720px\)\s*{[\s\S]*?\.machine-panel\s*{[^}]*top:\s*auto;[^}]*bottom:\s*(?:28px|0)(?:\s*!important)?;[^}]*height:\s*min\(44vh, 360px\)(?:\s*!important)?/);
  });
});
