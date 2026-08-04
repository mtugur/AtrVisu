// @vitest-environment jsdom

import { createElement, useEffect } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorDefinition } from "../platform/contracts";
import { createEditorDefinitionRegistry } from "../platform/editorDefinitionRegistry";
import { createEditorRuntimeRegistry } from "../workbench/editorRuntimeRegistry";
import { LAYOUT_3D_EDITOR_DEFINITION } from "../workbench/layout3dEditorDefinition";
import { EditorHost } from "./EditorHost";

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

const createDefinition = (
  id: string,
  availability: EditorDefinition["availability"] = "available"
): EditorDefinition => ({
  ...LAYOUT_3D_EDITOR_DEFINITION,
  id,
  titleKey: `editor.${id}.title`,
  availability
});

describe("EditorHost", () => {
  it("renders only the active binding and exposes its editor ID", () => {
    const inactiveRender = vi.fn(() => createElement("div", null, "inactive"));
    const activeRender = vi.fn(() => createElement("canvas", { "data-testid": "layout-canvas" }));
    const definitions = createEditorDefinitionRegistry([
      LAYOUT_3D_EDITOR_DEFINITION,
      createDefinition("editor.inactive")
    ]);
    const runtime = createEditorRuntimeRegistry(definitions, [
      { editorId: "layout.3d", render: activeRender },
      { editorId: "editor.inactive", render: inactiveRender }
    ]);

    const markup = renderToStaticMarkup(createElement(EditorHost, {
      activeEditorId: "layout.3d",
      definitionRegistry: definitions,
      runtimeRegistry: runtime
    }));

    expect(markup).toContain('data-testid="editor-host"');
    expect(markup).toContain('data-active-editor-id="layout.3d"');
    expect(markup).toContain('style="position:absolute;inset:0;min-width:0;overflow:hidden"');
    expect(markup).toContain('data-testid="layout-canvas"');
    expect(activeRender).toHaveBeenCalledTimes(1);
    expect(inactiveRender).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", "editor.unknown", "unknown"],
    ["unavailable", "editor.unavailable", "unavailable"],
    ["disabled", "editor.disabled", "disabled"]
  ] as const)("renders an accessible fallback for an %s editor", (_, activeId, expectedCode) => {
    const availability = expectedCode === "unknown" ? "available" : expectedCode;
    const registeredId = expectedCode === "unknown" ? "layout.3d" : activeId;
    const definition = createDefinition(registeredId, availability);
    const definitions = createEditorDefinitionRegistry([definition]);
    const runtime = createEditorRuntimeRegistry(
      definitions,
      availability === "available"
        ? [{ editorId: registeredId, render: () => createElement("canvas") }]
        : []
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const markup = renderToStaticMarkup(createElement(EditorHost, {
      activeEditorId: activeId,
      definitionRegistry: definitions,
      runtimeRegistry: runtime
    }));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-testid="editor-host-fallback"');
    expect(markup).toContain(`data-editor-host-error="${expectedCode}"`);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("renders an accessible fallback for a missing runtime binding", () => {
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);
    const validRuntime = createEditorRuntimeRegistry(definitions, [{
      editorId: "layout.3d",
      render: () => createElement("canvas")
    }]);
    const runtime = {
      ...validRuntime,
      bindings: [],
      has: () => false,
      get: () => undefined
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const markup = renderToStaticMarkup(createElement(EditorHost, {
      activeEditorId: "layout.3d",
      definitionRegistry: definitions,
      runtimeRegistry: runtime
    }));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-editor-host-error="missing-binding"');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not execute a binding when definition and runtime registries mismatch", () => {
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);
    const runtimeDefinitions = createEditorDefinitionRegistry([
      { ...LAYOUT_3D_EDITOR_DEFINITION }
    ]);
    const render = vi.fn(() => createElement("canvas"));
    const runtime = createEditorRuntimeRegistry(runtimeDefinitions, [{
      editorId: "layout.3d",
      render
    }]);

    const markup = renderToStaticMarkup(createElement(EditorHost, {
      activeEditorId: "layout.3d",
      definitionRegistry: definitions,
      runtimeRegistry: runtime
    }));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-editor-host-error="registry-mismatch"');
    expect(render).not.toHaveBeenCalled();
  });

  it("preserves the mounted child when the binding object changes for the same active editor", async () => {
    let mountCount = 0;
    let unmountCount = 0;
    const Probe = () => {
      useEffect(() => {
        mountCount += 1;
        return () => {
          unmountCount += 1;
        };
      }, []);
      return createElement("canvas", { "data-testid": "probe-canvas" });
    };
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);
    const createRuntime = () => createEditorRuntimeRegistry(definitions, [{
      editorId: "layout.3d",
      render: () => createElement(Probe)
    }]);
    const container = document.createElement("div");
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(createElement(EditorHost, {
        activeEditorId: "layout.3d",
        definitionRegistry: definitions,
        runtimeRegistry: createRuntime()
      }));
    });
    await act(async () => {
      root.render(createElement(EditorHost, {
        activeEditorId: "layout.3d",
        definitionRegistry: definitions,
        runtimeRegistry: createRuntime()
      }));
    });

    expect(mountCount).toBe(1);
    expect(unmountCount).toBe(0);
    expect(container.querySelectorAll('[data-testid="probe-canvas"]')).toHaveLength(1);
  });
});
