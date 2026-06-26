import { createAppShellBoundaryAuditReport } from "./appShellBoundaryAudit";
import { currentAppShellBoundaryZones } from "./currentAppShellBoundary";
import type { PlatformAppShellBoundaryReport } from "./appShellBoundaryTypes";

export const createPlatformAppShellBoundaryReport = (): PlatformAppShellBoundaryReport => {
  const audit = createAppShellBoundaryAuditReport();

  return {
    zoneCount: currentAppShellBoundaryZones.length,
    highRiskZoneCount: currentAppShellBoundaryZones.filter((zone) => zone.riskLevel === "high").length,
    mediumRiskZoneCount: currentAppShellBoundaryZones.filter((zone) => zone.riskLevel === "medium").length,
    lowRiskZoneCount: currentAppShellBoundaryZones.filter((zone) => zone.riskLevel === "low").length,
    issueCount: audit.issues.length,
    errorCount: audit.errorCount,
    warningCount: audit.warningCount,
    zones: currentAppShellBoundaryZones,
    audit
  };
};
