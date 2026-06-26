import { describe, expect, it } from "vitest";
import { currentAppShellBoundaryZones } from "../currentAppShellBoundary";
import { createPlatformAppShellBoundaryReport } from "../platformAppShellBoundaryReport";

describe("platform app shell boundary report", () => {
  it("matches current zone count", () => {
    expect(createPlatformAppShellBoundaryReport().zoneCount).toBe(currentAppShellBoundaryZones.length);
  });

  it("returns zero errors for current valid data", () => {
    expect(createPlatformAppShellBoundaryReport().errorCount).toBe(0);
  });

  it("returns issue count as a number", () => {
    expect(typeof createPlatformAppShellBoundaryReport().issueCount).toBe("number");
  });

  it("returns warning count as a number", () => {
    expect(typeof createPlatformAppShellBoundaryReport().warningCount).toBe("number");
  });

  it("returns high risk count as a number", () => {
    expect(typeof createPlatformAppShellBoundaryReport().highRiskZoneCount).toBe("number");
  });

  it("returns medium risk count as a number", () => {
    expect(typeof createPlatformAppShellBoundaryReport().mediumRiskZoneCount).toBe("number");
  });

  it("returns low risk count as a number", () => {
    expect(typeof createPlatformAppShellBoundaryReport().lowRiskZoneCount).toBe("number");
  });

  it("returns zones as an array", () => {
    expect(Array.isArray(createPlatformAppShellBoundaryReport().zones)).toBe(true);
  });

  it("returns an audit object", () => {
    expect(createPlatformAppShellBoundaryReport().audit.zoneCount).toBe(currentAppShellBoundaryZones.length);
  });
});
