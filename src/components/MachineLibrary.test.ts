import { describe, expect, it } from "vitest";
import type { LibraryMachineItem } from "../types/machine";
import { toMachineDefinition } from "./MachineLibrary";

const item: LibraryMachineItem = {
  id: "custom-atara-machine",
  name: "Custom ATARA Machine",
  type: "Custom Machine",
  category: "Custom",
  machineType: "Custom Machine",
  widthMm: 1000,
  depthMm: 2000,
  heightMm: 3000,
  width: 1,
  depth: 2,
  height: 3,
  defaultColor: "#ffffff",
  connectionPoints: [],
  ataraMachineData: {
    identity: {
      isAtaraProduct: true,
      atrId: "ATR-001",
      machineCode: "CUSTOM-001"
    },
    physical: {
      widthMm: 1000,
      depthMm: 2000,
      heightMm: 3000,
      weightKg: 1200
    }
  }
};

describe("MachineLibrary definition conversion", () => {
  it("preserves ATARA machine data when creating runtime definitions", () => {
    const definition = toMachineDefinition(item);

    expect(definition.ataraMachineData?.identity?.atrId).toBe("ATR-001");
    expect(definition.ataraMachineData?.identity?.machineCode).toBe("CUSTOM-001");
    expect(definition.ataraMachineData?.physical?.weightKg).toBe(1200);
  });
});
