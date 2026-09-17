import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getPlatformCommandSeedById } from "../../platform/registrySeeds";
import { COMMAND_BAR_COMMAND_IDS } from "../commandSurfaces";
import { getWorkbenchIcon, isWorkbenchIconId, WORKBENCH_ICON_IDS, WorkbenchIcon } from "./iconRegistry";

describe("workbench icon authority", () => {
  it("resolves every unique declared semantic icon and hides its SVG from assistive technology", () => {
    expect(new Set(WORKBENCH_ICON_IDS).size).toBe(WORKBENCH_ICON_IDS.length);
    WORKBENCH_ICON_IDS.forEach((iconId) => {
      expect(isWorkbenchIconId(iconId)).toBe(true);
      expect(getWorkbenchIcon(iconId)).toBeDefined();
    });
    expect(getWorkbenchIcon("unknown-icon")).toBeUndefined();

    const markup = renderToStaticMarkup(createElement(WorkbenchIcon, { iconId: "library" }));
    expect(markup).toContain("<svg");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
  });

  it("resolves every frequent command through serializable icon metadata", () => {
    COMMAND_BAR_COMMAND_IDS.forEach((commandId) => {
      const iconId = getPlatformCommandSeedById(commandId)?.iconId;
      expect(typeof iconId).toBe("string");
      expect(isWorkbenchIconId(iconId ?? "")).toBe(true);
      expect(getWorkbenchIcon(iconId ?? "")).toBeDefined();
    });
  });

  it("keeps presentation components out of registered command metadata", () => {
    COMMAND_BAR_COMMAND_IDS.forEach((commandId) => {
      const command = getPlatformCommandSeedById(commandId);
      expect(command?.iconId).toBeTypeOf("string");
      expect(Object.values(command ?? {}).some((value) => typeof value === "object")).toBe(false);
    });
  });
});
