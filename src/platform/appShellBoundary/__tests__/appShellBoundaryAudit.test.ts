import { describe, expect, it } from "vitest";
import {
  createAppShellBoundaryAuditReport,
  createAppShellBoundaryAuditReportFromZones,
  getAppShellBoundaryZoneById,
  getAppShellBoundaryZoneIds,
  getAppShellBoundaryZonesByType,
  getHighRiskAppShellBoundaryZones
} from "../appShellBoundaryAudit";
import { currentAppShellBoundaryZones } from "../currentAppShellBoundary";

describe("app shell boundary audit", () => {
  it("returns zero errors for current valid data", () => {
    expect(createAppShellBoundaryAuditReport().errorCount).toBe(0);
  });

  it("matches current zone length", () => {
    expect(createAppShellBoundaryAuditReport().zones).toHaveLength(currentAppShellBoundaryZones.length);
  });

  it("finds app-root by id", () => {
    expect(getAppShellBoundaryZoneById("app-root")?.label).toBe("App Root And Shell State");
  });

  it("finds scene-viewport by id", () => {
    expect(getAppShellBoundaryZoneById("scene-viewport")?.label).toBe("Babylon Scene Viewport");
  });

  it("finds panel zones by type", () => {
    expect(getAppShellBoundaryZonesByType("panel").length).toBeGreaterThan(0);
  });

  it("returns high risk zones as an array", () => {
    expect(Array.isArray(getHighRiskAppShellBoundaryZones())).toBe(true);
  });

  it("returns all zone ids", () => {
    expect(getAppShellBoundaryZoneIds()).toEqual(currentAppShellBoundaryZones.map((zone) => zone.id));
  });

  it("does not mutate input arrays", () => {
    const zones = [...currentAppShellBoundaryZones];
    const initialLength = zones.length;

    createAppShellBoundaryAuditReportFromZones(zones);

    expect(zones).toHaveLength(initialLength);
  });
});
