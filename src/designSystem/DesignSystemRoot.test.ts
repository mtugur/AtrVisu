import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// Node is available to Vitest; the app intentionally does not depend on @types/node.
// @ts-expect-error The test-only built-in import is outside the browser type surface.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESIGN_TOKEN_FAMILIES } from "../platform/contracts";
import { DesignSystemRoot } from "./DesignSystemRoot";

const readSource = (fileName: string) =>
  readFileSync(new URL(fileName, import.meta.url), "utf8");

describe("DesignSystemRoot", () => {
  it.each([
    ["dark", "comfortable"],
    ["light", "compact"],
    ["system", "comfortable"]
  ] as const)("renders %s theme with %s density", (themeId, densityId) => {
    const markup = renderToStaticMarkup(createElement(
      DesignSystemRoot,
      {
        themeId,
        densityId,
        children: createElement("span", null, "editor")
      }
    ));

    expect(markup).toContain(`data-av-theme="${themeId}"`);
    expect(markup).toContain(`data-av-density="${densityId}"`);
    expect(markup).toContain("editor");
  });

  it("owns no persistence, domain, browser, or Babylon dependency", () => {
    const source = readSource("./DesignSystemRoot.tsx");

    expect(source).not.toMatch(/localStorage|indexedDB|window\.|document\./);
    expect(source).not.toMatch(/types\/(machine|project)|Babylon/);
    expect(source).toContain('className="av-design-system-root"');
  });
});

describe("semantic token contract", () => {
  const tokenSource = readSource("./designTokens.css");
  const themeSource = readSource("./themes.css");

  it("implements every accepted P1-A token family", () => {
    const familySignals: Record<(typeof DESIGN_TOKEN_FAMILIES)[number], string> = {
      surface: "--av-surface-",
      elevation: "--av-elevation-",
      text: "--av-text-",
      border: "--av-border-",
      interaction: "--av-interaction-",
      focus: "--av-focus-",
      selection: "--av-selection-",
      spacing: "--av-spacing-",
      typography: "--av-font-",
      "control-size": "--av-control-height-",
      density: "--av-density-",
      "icon-size": "--av-icon-size-",
      "semantic-status": "--av-status-",
      "viewport-overlay": "--av-viewport-overlay-",
      "technical-palette": "--av-technical-palette-",
      "z-index": "--av-z-"
    };

    DESIGN_TOKEN_FAMILIES.forEach((family) => {
      expect(`${tokenSource}\n${themeSource}`).toContain(familySignals[family]);
    });
  });

  it("provides complete dark, light, and CSS-driven system theme paths", () => {
    expect(themeSource).toContain('data-av-theme="dark"');
    expect(themeSource).toContain('data-av-theme="light"');
    expect(themeSource).toContain('data-av-theme="system"');
    expect(themeSource).toContain("@media (prefers-color-scheme: light)");
    expect(themeSource).not.toContain("matchMedia");

    const requiredTokens = [
      "--av-surface-application",
      "--av-surface-overlay",
      "--av-text-danger",
      "--av-border-interactive",
      "--av-interaction-destructive",
      "--av-focus-ring-offset",
      "--av-selection-primary",
      "--av-status-info-background",
      "--av-viewport-overlay-collision"
    ];
    requiredTokens.forEach((token) => {
      expect(themeSource.match(new RegExp(token, "g"))?.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("defines the root sizing and one canonical chrome inset contract", () => {
    expect(tokenSource).toContain("width: 100%");
    expect(tokenSource).toContain("height: 100%");
    expect(tokenSource).toContain("--av-workbench-top-inset");
  });
});
