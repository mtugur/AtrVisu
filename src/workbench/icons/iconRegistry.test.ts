import { describe, expect, it } from "vitest";
import { getPlatformCommandSeedById } from "../../platform/registrySeeds";
import { COMMAND_BAR_COMMAND_IDS } from "../commandSurfaces";
import { getWorkbenchIcon, isWorkbenchIconId } from "./iconRegistry";

describe("workbench icon authority", () => {
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
