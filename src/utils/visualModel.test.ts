import { describe, expect, it } from "vitest";
import { calculateMetadataBoxScale, normalizeVisualModel } from "./visualModel";

describe("visual model calibration", () => {
  it("applies safe calibration defaults", () => {
    const visualModel = normalizeVisualModel({ modelPath: "/library/models/forklift.glb" });

    expect(visualModel.calibration).toEqual({
      centerOnFootprint: true,
      bottomOnFloor: true,
      preserveAspectRatio: true,
      forwardAxis: "z+",
      upAxis: "y+"
    });
  });

  it("normalizes invalid calibration values safely", () => {
    const visualModel = normalizeVisualModel({
      calibration: {
        centerOnFootprint: false,
        bottomOnFloor: "bad",
        preserveAspectRatio: false,
        forwardAxis: "y+",
        upAxis: "bad"
      }
    });

    expect(visualModel.calibration.centerOnFootprint).toBe(false);
    expect(visualModel.calibration.bottomOnFloor).toBe(true);
    expect(visualModel.calibration.preserveAspectRatio).toBe(false);
    expect(visualModel.calibration.forwardAxis).toBe("z+");
    expect(visualModel.calibration.upAxis).toBe("y+");
  });

  it("uses uniform limiting scale when preserving aspect ratio", () => {
    expect(
      calculateMetadataBoxScale(
        { width: 2.876, depth: 1.2, height: 2.1 },
        { width: 1, depth: 1, height: 1 },
        true
      )
    ).toEqual({ x: 1.2, y: 1.2, z: 1.2 });
  });

  it("uses non-uniform scale when aspect ratio is not preserved", () => {
    expect(
      calculateMetadataBoxScale(
        { width: 2.876, depth: 1.2, height: 2.1 },
        { width: 1, depth: 1, height: 1 },
        false
      )
    ).toEqual({ x: 2.876, y: 2.1, z: 1.2 });
  });
});
