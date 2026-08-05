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
  const componentSource = readSource("../styles.css");

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

  it("defines the exact accepted P1-C semantic token contract", () => {
    const requiredTokens = [
      "--av-surface-canvas", "--av-surface-application", "--av-surface-panel",
      "--av-surface-panel-translucent", "--av-surface-raised", "--av-surface-sunken",
      "--av-surface-input", "--av-surface-overlay", "--av-surface-control",
      "--av-surface-control-hover", "--av-surface-control-active", "--av-surface-scrim",
      "--av-text-primary", "--av-text-secondary", "--av-text-muted", "--av-text-disabled",
      "--av-text-inverse", "--av-text-accent", "--av-text-danger", "--av-text-warning",
      "--av-text-success", "--av-border-subtle", "--av-border-default", "--av-border-strong",
      "--av-border-interactive", "--av-border-accent", "--av-border-danger",
      "--av-interaction-accent", "--av-interaction-accent-muted", "--av-interaction-hover",
      "--av-interaction-active", "--av-interaction-selected", "--av-interaction-disabled",
      "--av-interaction-primary", "--av-interaction-primary-hover",
      "--av-interaction-destructive", "--av-interaction-destructive-hover",
      "--av-focus-ring", "--av-focus-ring-offset", "--av-focus-ring-width",
      "--av-selection-fill", "--av-selection-background", "--av-selection-border",
      "--av-selection-primary", "--av-selection-secondary", "--av-spacing-2xs",
      "--av-spacing-xs", "--av-spacing-sm", "--av-spacing-md", "--av-spacing-lg",
      "--av-spacing-xl", "--av-spacing-2xl", "--av-font-family-sans",
      "--av-font-family-mono", "--av-font-size-xs", "--av-font-size-sm",
      "--av-font-size-md", "--av-font-size-lg", "--av-font-size-xl",
      "--av-font-weight-normal", "--av-font-weight-medium", "--av-font-weight-semibold",
      "--av-font-weight-bold", "--av-line-height-tight", "--av-line-height-compact",
      "--av-line-height-normal", "--av-control-height-xs", "--av-control-height-sm",
      "--av-control-height-md", "--av-control-height-lg", "--av-control-min-pointer-target",
      "--av-control-radius-sm", "--av-control-radius-md", "--av-control-radius-lg",
      "--av-density-control-height", "--av-density-panel-gap", "--av-density-panel-padding",
      "--av-density-horizontal-padding", "--av-density-vertical-padding", "--av-density-gap",
      "--av-density-row-height", "--av-icon-size-sm", "--av-icon-size-md", "--av-icon-size-lg",
      "--av-status-info-text", "--av-status-info-background", "--av-status-info-border",
      "--av-status-success-text", "--av-status-success-background", "--av-status-success-border",
      "--av-status-warning-text", "--av-status-warning-background", "--av-status-warning-border",
      "--av-status-danger-text", "--av-status-danger-background", "--av-status-danger-border",
      "--av-viewport-overlay-surface", "--av-viewport-overlay-text",
      "--av-viewport-overlay-border", "--av-viewport-overlay-label",
      "--av-viewport-overlay-label-background", "--av-viewport-overlay-measurement",
      "--av-viewport-overlay-annotation", "--av-viewport-overlay-connection-point",
      "--av-viewport-overlay-collision", "--av-viewport-overlay-clearance",
      "--av-viewport-overlay-selection", "--av-z-viewport", "--av-z-chrome", "--av-z-dock",
      "--av-z-panel", "--av-z-command-surface", "--av-z-popover", "--av-z-overlay",
      "--av-z-modal", "--av-z-diagnostics"
    ];
    const authoritySource = `${tokenSource}\n${themeSource}`;

    requiredTokens.forEach((token) => {
      expect(authoritySource).toMatch(new RegExp(`${token.replace(/-/g, "\\-")}\\s*:`));
    });
    expect(tokenSource).toContain("--av-font-weight-normal: 400");
  });

  it("provides complete dark, light, and CSS-driven system theme paths", () => {
    expect(themeSource).toContain('data-av-theme="dark"');
    expect(themeSource).toContain('data-av-theme="light"');
    expect(themeSource).toContain('data-av-theme="system"');
    expect(themeSource).toContain("@media (prefers-color-scheme: light)");
    expect(themeSource).toContain("@media (prefers-color-scheme: dark)");
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

  it("uses theme-owned dark and light scrims for readable modal backdrops", () => {
    expect(componentSource).toMatch(/\.manager-backdrop\s*{[^}]*background:\s*var\(--av-surface-scrim\)/s);
    expect(themeSource).toMatch(/data-av-theme="dark"[\s\S]*?--av-surface-scrim:\s*rgba\(0, 0, 0, 0\.7\)/);
    expect(themeSource).toMatch(/data-av-theme="light"[\s\S]*?--av-surface-scrim:\s*rgba\(18, 27, 24, 0\.42\)/);
    expect(themeSource).not.toMatch(/data-av-theme="light"[\s\S]*?--av-surface-scrim:\s*rgba\(255, 255, 255/);
    expect(componentSource).toMatch(/\.manager-dialog\s*{[\s\S]*?background:\s*var\(--av-surface-raised\)/);
  });
});
