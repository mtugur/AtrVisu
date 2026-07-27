import { describe, expect, it } from "vitest";
import { createSurfaceCoverageAuditReportFromSources } from "../surfaceCoverageAudit";
import type { SurfaceCoverageAuditSources } from "../surfaceCoverageAuditTypes";

const emptySources = (): SurfaceCoverageAuditSources => ({
  commandSeedDefinitions: [],
  panelSeedDefinitions: [],
  featureAccessEntries: [],
  featureAccessCoverageDefinitions: [],
  surfaceInventory: []
});

describe("surface coverage audit failures", () => {
  it("reports a missing command surface", () => {
    const report = createSurfaceCoverageAuditReportFromSources({
      ...emptySources(),
      commandSeedDefinitions: [{ id: "command.missing" }]
    });

    expect(report.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "command-surface-missing",
      id: "command.missing"
    }));
  });

  it("reports a missing panel surface", () => {
    const report = createSurfaceCoverageAuditReportFromSources({
      ...emptySources(),
      panelSeedDefinitions: [{ id: "panel.missing" }]
    });

    expect(report.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "panel-surface-missing",
      id: "panel.missing"
    }));
  });

  it("reports a missing required feature surface", () => {
    const report = createSurfaceCoverageAuditReportFromSources({
      ...emptySources(),
      featureAccessEntries: [{
        featureId: "feature.required",
        label: "Required feature",
        classification: "required-runtime",
        surfaces: ["api"],
        requiredForRegression: true
      }],
      featureAccessCoverageDefinitions: [{ featureId: "feature.required" }]
    });

    expect(report.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "required-feature-surface-missing",
      id: "feature.required"
    }));
  });

  it("reports a missing required feature integration definition", () => {
    const report = createSurfaceCoverageAuditReportFromSources({
      ...emptySources(),
      featureAccessEntries: [{
        featureId: "feature.required",
        label: "Required feature",
        classification: "required-runtime",
        surfaces: ["panel"],
        requiredForRegression: true
      }],
      surfaceInventory: [{
        surfaceId: "surface.required",
        surfaceType: "panel",
        label: "Required feature",
        owner: "platform",
        sourceFiles: ["src/platform/example.ts"],
        featureIds: ["feature.required"]
      }]
    });

    expect(report.issues).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "required-feature-integration-coverage-missing",
      id: "feature.required"
    }));
  });

  it("does not report missing surface coverage for a non-required feature", () => {
    const report = createSurfaceCoverageAuditReportFromSources({
      ...emptySources(),
      featureAccessEntries: [{
        featureId: "feature.optional",
        label: "Optional feature",
        classification: "declared-planned",
        surfaces: ["api"],
        requiredForRegression: false
      }]
    });

    expect(report.issues).toEqual([]);
  });
});
