// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { WORKBENCH_REGION_IDS } from "../platform/contracts";
import {
  WORKBENCH_SHELL_REGION_BY_SLOT,
  WorkbenchShell
} from "./WorkbenchShell";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const roots: ReturnType<typeof createRoot>[] = [];

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
});

const slot = (name: string) => createElement("section", null, name);

describe("WorkbenchShell", () => {
  it("exposes and anchors all nine workbench region slots", () => {
    const markup = renderToStaticMarkup(createElement(WorkbenchShell, {
      applicationBar: slot("applicationBar"),
      menuBar: slot("menuBar"),
      commandBar: slot("commandBar"),
      primaryDock: slot("primaryDock"),
      editorHost: slot("editorHost"),
      secondaryDock: slot("secondaryDock"),
      bottomDock: slot("bottomDock"),
      statusBar: slot("statusBar"),
      overlayLayer: slot("overlayLayer")
    }));

    expect(Object.values(WORKBENCH_SHELL_REGION_BY_SLOT)).toEqual(WORKBENCH_REGION_IDS);
    WORKBENCH_REGION_IDS.forEach((region) => {
      expect(markup).toContain(`data-workbench-region="${region}"`);
    });
    expect(markup).toContain('data-testid="app-root"');
    expect(markup).toContain('data-app-shell-zone="app-root"');
    expect(markup).toContain('class="scene-viewport-host"');
    expect(markup).toContain('data-app-shell-zone="scene-viewport"');
    expect(markup).toContain('data-app-shell-zone="machine-properties"');
    expect(markup).toContain('data-app-shell-zone="modal-layer"');
  });

  it("renders no placeholders for absent optional regions", () => {
    const markup = renderToStaticMarkup(createElement(WorkbenchShell, {
      editorHost: slot("editorHost")
    }));

    expect(markup).toContain("editorHost");
    expect(markup).not.toContain("applicationBar");
    expect(markup).not.toContain("secondaryDock");
    expect(markup).not.toContain("overlayLayer");
    expect(markup).not.toContain(WORKBENCH_SHELL_REGION_BY_SLOT.applicationBar);
    expect(markup).not.toContain(WORKBENCH_SHELL_REGION_BY_SLOT.secondaryDock);
    expect(markup).not.toContain(WORKBENCH_SHELL_REGION_BY_SLOT.overlayLayer);
  });

  it("preserves AppShell right-inset normalization", () => {
    const positive = renderToStaticMarkup(createElement(WorkbenchShell, {
      editorHost: slot("editorHost"),
      editorRightInset: 420
    }));
    const negative = renderToStaticMarkup(createElement(WorkbenchShell, {
      editorHost: slot("editorHost"),
      editorRightInset: -100
    }));

    expect(positive).toContain('style="--av-shell-top-inset:var(--av-workbench-top-inset)"');
    expect(positive).toContain('style="right:min(420px, calc(100vw - 28px))"');
    expect(negative).toContain('style="right:min(0px, calc(100vw - 28px))"');
  });

  it("does not remount the editor when secondary dock content changes", async () => {
    let mountCount = 0;
    let unmountCount = 0;
    const Probe = () => {
      useEffect(() => {
        mountCount += 1;
        return () => {
          unmountCount += 1;
        };
      }, []);
      return createElement("canvas", { "data-testid": "workbench-probe" });
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(createElement(WorkbenchShell, {
        editorHost: createElement(Probe),
        secondaryDock: createElement("aside", null, "open")
      }));
    });
    await act(async () => {
      root.render(createElement(WorkbenchShell, {
        editorHost: createElement(Probe),
        secondaryDock: createElement("button", null, "collapsed"),
        editorRightInset: 0
      }));
    });

    expect(mountCount).toBe(1);
    expect(unmountCount).toBe(0);
    expect(container.querySelectorAll('[data-testid="workbench-probe"]')).toHaveLength(1);
  });
});
