import { describe, expect, it } from "vitest";
import { calculateBoundsDifferenceMm, createBaseVisualDiagnostics } from "./visualDiagnostics";

describe("visual diagnostics", () => {
  it("calculates visual-to-metadata bounds differences", () => {
    expect(
      calculateBoundsDifferenceMm(
        { widthMm: 2876, depthMm: 760, heightMm: 500 },
        { widthMm: 3000, depthMm: 700, heightMm: 520 }
      )
    ).toEqual({ widthMm: 124, depthMm: -60, heightMm: 20 });
  });

  it("creates diagnostics with normalized visual model defaults", () => {
    const diagnostics = createBaseVisualDiagnostics(
      "machine-1",
      {
        id: "machine",
        name: "Machine",
        category: "Material Handling",
        machineType: "Forklift",
        placeholderVisualType: "forklift-proxy",
        widthMm: 2876,
        depthMm: 1200,
        heightMm: 2100,
        width: 2.876,
        depth: 1.2,
        height: 2.1,
        defaultColor: "#ffffff",
        connectionPoints: []
      },
      "proxy"
    );

    expect(diagnostics.visualStatus).toBe("proxy");
    expect(diagnostics.visualSource).toBe("proxy");
    expect(diagnostics.metadataBoundsMm.widthMm).toBe(2876);
    expect(diagnostics.placeholderVisualType).toBe("forklift-proxy");
    expect(diagnostics.modelUnit).toBe("m");
    expect(diagnostics.calibration.centerOnFootprint).toBe(true);
  });
});
