import { describe, expect, it } from "vitest";
import {
  getMachineEmissiveRole,
  getSelectionFrameRole
} from "./selectionPresentation";

describe("viewport selection presentation", () => {
  it("follows the global primary entity across mixed Machine and Civil selection", () => {
    expect(getSelectionFrameRole("machine:machine-1", true, "civil:civil-1")).toBe("secondary");
    expect(getSelectionFrameRole("civil:civil-1", true, "civil:civil-1")).toBe("primary");
    expect(getSelectionFrameRole("civil:civil-2", false, "civil:civil-1")).toBeNull();
  });

  it("keeps collision emissive independent from selection presentation", () => {
    expect(getMachineEmissiveRole(false)).toBe("black");
    expect(getMachineEmissiveRole(true)).toBe("collisionEmissive");
    expect(getMachineEmissiveRole).toHaveLength(1);
  });
});
