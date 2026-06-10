import { describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { getSelectedAtaraMachineDataState } from "./MachineProperties";

const baseDefinition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Custom",
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  width: 1,
  depth: 1,
  height: 1,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const createPlacedMachine = (definitionSnapshot: MachineDefinition, definition = definitionSnapshot): PlacedMachine => ({
  instanceId: "machine-1",
  machineDefinitionId: "machine",
  definitionSnapshot,
  definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
});

describe("MachineProperties ATARA diagnostics", () => {
  it("reads ATARA data from the definition snapshot first", () => {
    const machine = createPlacedMachine({
      ...baseDefinition,
      ataraMachineData: {
        identity: { atrId: "ATR-SNAPSHOT" }
      }
    });

    const state = getSelectedAtaraMachineDataState(machine);

    expect(state.ataraMachineData?.identity?.atrId).toBe("ATR-SNAPSHOT");
    expect(state.hasNewerLibraryAtaraData).toBe(false);
  });

  it("does not crash for older scene objects without ATARA data", () => {
    const state = getSelectedAtaraMachineDataState(createPlacedMachine(baseDefinition));

    expect(state.ataraMachineData).toBeUndefined();
    expect(state.hasNewerLibraryAtaraData).toBe(false);
  });

  it("detects newer library ATARA data when snapshot is older", () => {
    const state = getSelectedAtaraMachineDataState(
      createPlacedMachine(baseDefinition, {
        ...baseDefinition,
        ataraMachineData: {
          identity: { atrId: "ATR-LIBRARY" }
        }
      })
    );

    expect(state.ataraMachineData?.identity?.atrId).toBe("ATR-LIBRARY");
    expect(state.hasNewerLibraryAtaraData).toBe(true);
  });
});
