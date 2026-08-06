import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  UiPreferencesDesignSystemBoundary,
  UiPreferencesProvider
} from "./UiPreferencesProvider";
import { createUiPreferencesRuntimeStore } from "./uiPreferencesRuntimeStore";

const createStore = () => createUiPreferencesRuntimeStore({
  storage: {
    read: vi.fn(async () => ({ status: "absent" as const })),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined)
  },
  legacyStorage: { getItem: () => null, removeItem: vi.fn() }
});

describe("UiPreferencesProvider", () => {
  it("binds one preference snapshot to DesignSystemRoot without replacing its child", () => {
    const store = createStore();
    store.updateTheme("light");
    store.updateDensity("compact");

    const markup = renderToStaticMarkup(createElement(
      UiPreferencesProvider,
      { store, children: createElement(
        UiPreferencesDesignSystemBoundary,
        null,
        createElement("main", { "data-testid": "stable-app" }, "app")
      ) }
    ));

    expect(markup).toContain('data-av-theme="light"');
    expect(markup).toContain('data-av-density="compact"');
    expect(markup).toContain('data-testid="stable-app"');
    expect(markup.match(/data-testid="design-system-root"/g)).toHaveLength(1);
  });
});
