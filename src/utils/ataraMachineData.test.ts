import { describe, expect, it } from "vitest";
import type { MachineDefinition } from "../types/machine";
import {
  getConnectionPointsByType,
  getEffectiveMachineDimensions,
  getEffectiveMaintenanceClearance,
  normalizeAtaraMachineData,
  normalizeConnectionPointType,
  summarizeUtilityRequirements,
  validateAtaraMachineData
} from "./ataraMachineData";

const definition: MachineDefinition = {
  id: "machine-1",
  name: "Machine",
  category: "Custom",
  widthMm: 1000,
  depthMm: 2000,
  heightMm: 3000,
  width: 1,
  depth: 2,
  height: 3,
  defaultColor: "#ffffff",
  connectionPoints: []
};

describe("ATARA machine data helpers", () => {
  it("treats missing ataraMachineData as valid", () => {
    expect(validateAtaraMachineData(undefined).valid).toBe(true);
    expect(normalizeAtaraMachineData(undefined)).toBeUndefined();
  });

  it("normalizes negative dimensions safely", () => {
    const normalized = normalizeAtaraMachineData(
      {
        physical: {
          widthMm: -100,
          depthMm: 2500,
          heightMm: -1,
          weightKg: -10
        }
      },
      { widthMm: 1000, depthMm: 2000, heightMm: 3000 }
    );

    expect(normalized?.physical?.widthMm).toBe(1000);
    expect(normalized?.physical?.depthMm).toBe(2500);
    expect(normalized?.physical?.heightMm).toBe(3000);
    expect(normalized?.physical?.weightKg).toBeUndefined();
  });

  it("normalizes connection point type and defaults position", () => {
    const normalized = normalizeAtaraMachineData({
      connectionPoints: [
        {
          id: "cp-1",
          name: "Bad type point",
          type: "invalid-type",
          direction: "bad"
        }
      ]
    });

    expect(normalizeConnectionPointType("electrical")).toBe("electrical");
    expect(normalizeConnectionPointType("bad")).toBe("other");
    expect(normalized?.connectionPoints?.[0]).toMatchObject({
      id: "cp-1",
      name: "Bad type point",
      type: "other",
      positionMm: { xMm: 0, yMm: 0, zMm: 0 },
      direction: "z+"
    });
  });

  it("returns connection points by type", () => {
    const data = normalizeAtaraMachineData({
      connectionPoints: [
        { id: "in", name: "In", type: "product-in", positionMm: { xMm: 0, yMm: 0, zMm: 0 }, direction: "z-" },
        { id: "out", name: "Out", type: "product-out", positionMm: { xMm: 0, yMm: 0, zMm: 10 }, direction: "z+" }
      ]
    });

    expect(getConnectionPointsByType(data, "product-out").map((point) => point.id)).toEqual(["out"]);
  });

  it("summarizes utility requirements and handles missing values", () => {
    expect(summarizeUtilityRequirements(undefined)).toBe("No utility requirements assigned.");
    expect(
      summarizeUtilityRequirements({
        utilityRequirements: {
          electrical: { powerKw: 12, voltage: 400 },
          pneumatic: { pressureBar: 6, airConsumptionNlMin: 250 },
          network: { protocols: ["Profinet"] }
        }
      })
    ).toContain("12 kW");
  });

  it("falls back to zero maintenance clearance", () => {
    expect(getEffectiveMaintenanceClearance(definition)).toEqual({
      frontMm: 0,
      backMm: 0,
      leftMm: 0,
      rightMm: 0,
      topMm: 0
    });
  });

  it("uses ATARA physical dimensions when available", () => {
    expect(
      getEffectiveMachineDimensions({
        ...definition,
        ataraMachineData: {
          physical: {
            widthMm: 1200,
            depthMm: 2200,
            heightMm: 3200
          }
        }
      })
    ).toEqual({ widthMm: 1200, depthMm: 2200, heightMm: 3200 });
  });
});
