import { currentPlatformSurfaceInventory } from "./currentSurfaceInventory";
import { validateSurfaceInventory } from "./surfaceInventoryAudit";

export const createPlatformSurfaceInventoryReport = () => {
  const audit = validateSurfaceInventory();

  return {
    surfaceCount: currentPlatformSurfaceInventory.length,
    panelLinkedSurfaceCount: currentPlatformSurfaceInventory.filter((item) => (item.panelIds?.length ?? 0) > 0).length,
    commandLinkedSurfaceCount: currentPlatformSurfaceInventory.filter((item) => (item.commandIds?.length ?? 0) > 0).length,
    featureLinkedSurfaceCount: currentPlatformSurfaceInventory.filter((item) => (item.featureIds?.length ?? 0) > 0).length,
    unlinkedSurfaceCount: currentPlatformSurfaceInventory.filter((item) =>
      (item.panelIds?.length ?? 0) === 0 &&
      (item.commandIds?.length ?? 0) === 0 &&
      (item.featureIds?.length ?? 0) === 0
    ).length,
    audit
  };
};

