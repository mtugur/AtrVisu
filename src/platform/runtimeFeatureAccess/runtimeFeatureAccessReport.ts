import type { FeatureAccessEntry, PlatformEntity } from "../contracts";
import { parseRuntimeSelectionEntityId } from "../runtimeSelection";
import type {
  RuntimeEntityAccessEvidence,
  RuntimeEntityEvidenceInput,
  RuntimeFeatureAccessReport,
  RuntimeFeatureAccessReportInput,
  RuntimeFeatureAccessReportItem,
  RuntimeSelectionAccessEvidence,
  RuntimeSelectionEvidenceInput
} from "./runtimeFeatureAccessTypes";

const uniqueSorted = (values: readonly string[]) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const findDuplicates = (values: readonly string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return [...duplicates].sort((left, right) => left.localeCompare(right));
};

const getFeatureCommandIds = (feature: FeatureAccessEntry) =>
  uniqueSorted([
    ...(feature.commandIds ?? []),
    ...(feature.commandId ? [feature.commandId] : [])
  ]);

const getFeaturePanelIds = (feature: FeatureAccessEntry) =>
  uniqueSorted([
    ...(feature.panelIds ?? []),
    ...(feature.panelId ? [feature.panelId] : [])
  ]);

const hasEntityShape = (entity: PlatformEntity) =>
  typeof entity.id === "string"
  && entity.id.includes(":")
  && typeof entity.visible === "boolean"
  && typeof entity.locked === "boolean"
  && typeof entity.selectable === "boolean";

const requiredAdapterFamilies = ["annotation", "civil", "group", "machine"] as const;

const hasLiveSelectionCapabilities = (
  evidence: RuntimeSelectionAccessEvidence | undefined
) => Boolean(
  evidence?.authorityBound
  && evidence.canonicalIdSupport
  && evidence.replaceSupported
  && evidence.toggleSupported
  && evidence.clearSupported
  && evidence.reconciliationSupported
  && evidence.groupRootSemanticsSupported
  && evidence.editChildSemanticsSupported
  && evidence.staleUnselectableRemovalSupported
);

const hasLiveEntityCapabilities = (
  evidence: RuntimeEntityAccessEvidence | undefined
) => Boolean(
  evidence?.authorityBound
  && requiredAdapterFamilies.every((family) => evidence.adapterFamilies.includes(family))
  && evidence.canonicalIdentity
  && evidence.duplicateIdentityRejected
  && evidence.parentChildRelationshipsRepresented
  && evidence.visibilityRepresented
  && evidence.selectabilityRepresented
  && evidence.lockContextRepresented
  && evidence.layerAssociationRepresented
);

export const createRuntimeSelectionAccessEvidence = ({
  selection,
  entities
}: RuntimeSelectionEvidenceInput): RuntimeSelectionAccessEvidence => {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const canonicalIdSupport = selection.ids.every((id) =>
    Boolean(parseRuntimeSelectionEntityId(id)) && entityIds.has(id)
  );

  return {
    authorityBound: true,
    canonicalIdSupport,
    currentSelectionIds: [...selection.ids],
    primarySelectionId: selection.primaryId ?? null,
    replaceSupported: true,
    toggleSupported: true,
    clearSupported: true,
    reconciliationSupported: true,
    groupRootSemanticsSupported: true,
    editChildSemanticsSupported: true,
    staleUnselectableRemovalSupported: true,
    ...(!canonicalIdSupport ? { reason: "Runtime Selection contains an unresolved or non-canonical entity ID." } : {})
  };
};

export const createRuntimeEntityAccessEvidence = ({
  entities,
  adapterFamilies = ["machine", "civil", "annotation", "group"]
}: RuntimeEntityEvidenceInput): RuntimeEntityAccessEvidence => {
  const ids = entities.map((entity) => entity.id);
  const duplicateIds = findDuplicates(ids);
  const canonicalIdentity = entities.every(hasEntityShape);
  const entityIds = new Set(ids);
  const parentChildRelationshipsRepresented = entities.every((entity) =>
    (!entity.parentId || entityIds.has(entity.parentId))
    && entity.childrenIds.every((childId) => entityIds.has(childId))
  );

  return {
    authorityBound: true,
    adapterFamilies: uniqueSorted(adapterFamilies),
    entityCount: entities.length,
    canonicalIdentity,
    duplicateIdentityRejected: duplicateIds.length === 0,
    parentChildRelationshipsRepresented,
    visibilityRepresented: entities.every((entity) => typeof entity.visible === "boolean"),
    selectabilityRepresented: entities.every((entity) => typeof entity.selectable === "boolean"),
    lockContextRepresented: entities.every((entity) => typeof entity.locked === "boolean"),
    layerAssociationRepresented: entities.every((entity) => typeof entity.layerId === "string"),
    entities: [...entities],
    ...(duplicateIds.length > 0
      ? { reason: `Duplicate canonical entity IDs: ${duplicateIds.join(", ")}.` }
      : !canonicalIdentity
        ? { reason: "One or more runtime entities do not have canonical identity." }
        : !parentChildRelationshipsRepresented
          ? { reason: "Runtime entity parent/child relationships are unresolved." }
          : {})
  };
};

const getRuntimeSurfaceIds = (
  feature: FeatureAccessEntry,
  surfaces: RuntimeFeatureAccessReportInput["surfaces"]
) => {
  const commandIds = getFeatureCommandIds(feature);
  const panelIds = getFeaturePanelIds(feature);
  return uniqueSorted(surfaces
    .filter((surface) =>
      surface.featureIds?.includes(feature.featureId)
      || surface.commandIds?.some((commandId) => commandIds.includes(commandId))
      || surface.panelIds?.some((panelId) => panelIds.includes(panelId))
    )
    .map((surface) => surface.surfaceId));
};

const reportFeature = (
  feature: FeatureAccessEntry,
  input: RuntimeFeatureAccessReportInput
): RuntimeFeatureAccessReportItem => {
  const commandIds = getFeatureCommandIds(feature);
  const panelIds = getFeaturePanelIds(feature);
  const commandEvidence = commandIds.map(input.evidence.getCommand);
  const panelEvidence = panelIds.flatMap((panelId) => {
    const evidence = input.evidence.getPanel(panelId);
    return evidence ? [evidence] : [{
      panelId,
      registered: false,
      bound: false,
      visible: false,
      open: false,
      available: false,
      capabilities: [],
      reason: `Runtime panel "${panelId}" is unknown.`
    }];
  });
  const inventoriedRuntimeSurfaceIds = getRuntimeSurfaceIds(feature, input.surfaces);
  const requiresSelection = feature.runtimeRequirements?.includes("selection") ?? false;
  const requiresEntities = feature.runtimeRequirements?.includes("entity") ?? false;
  const requiresViewport = feature.runtimeRequirements?.includes("viewport") ?? false;
  const viewportEvidence = input.evidence.viewport;
  const hasRuntimeAuthorityRequirement =
    commandIds.length > 0
    || panelIds.length > 0
    || requiresSelection
    || requiresEntities
    || requiresViewport;
  const reasons: string[] = [];

  if (feature.classification === "declared-planned") {
    if (inventoriedRuntimeSurfaceIds.length > 0) {
      reasons.push("Declared-planned feature is still mapped to a current runtime surface.");
      return {
        featureId: feature.featureId,
        label: feature.label,
        classification: feature.classification,
        requiredForRegression: feature.requiredForRegression,
        declaredSurfaces: feature.surfaces,
        inventoriedRuntimeSurfaceIds,
        commandIds,
        panelIds,
        commandEvidence,
        panelEvidence,
        registered: true,
        bound: false,
        reachable: false,
        currentlyAvailable: false,
        status: "blocked",
        reasons
      };
    }
    return {
      featureId: feature.featureId,
      label: feature.label,
      classification: feature.classification,
      requiredForRegression: feature.requiredForRegression,
      declaredSurfaces: feature.surfaces,
      inventoriedRuntimeSurfaceIds,
      commandIds,
      panelIds,
      commandEvidence,
      panelEvidence,
      registered: true,
      bound: false,
      reachable: false,
      currentlyAvailable: false,
      status: "planned-unbound",
      reasons: ["Feature is explicitly declared as planned and unbound."]
    };
  }

  if (feature.classification === "quality-signal") {
    const qualityValue = feature.qualitySignalId
      ? input.evidence.quality?.[feature.qualitySignalId]
      : undefined;
    const status = qualityValue === true
      ? "ready"
      : qualityValue === false
        ? "blocked"
        : "external-evidence-required";
    const qualityReasons = qualityValue === true
      ? []
      : qualityValue === false
        ? ["Explicit external quality evidence failed."]
        : ["Explicit external quality evidence is required."];
    return {
      featureId: feature.featureId,
      label: feature.label,
      classification: feature.classification,
      requiredForRegression: feature.requiredForRegression,
      declaredSurfaces: feature.surfaces,
      inventoriedRuntimeSurfaceIds,
      commandIds,
      panelIds,
      commandEvidence: [],
      panelEvidence: [],
      registered: true,
      bound: qualityValue !== undefined,
      reachable: qualityValue === true,
      currentlyAvailable: qualityValue === true,
      status,
      reasons: qualityReasons
    };
  }

  if (!hasRuntimeAuthorityRequirement) {
    reasons.push("Required runtime feature has no runtime authority requirement.");
  }
  commandEvidence.forEach((command) => {
    if (!command.registered) {
      reasons.push(`Command "${command.commandId}" is not registered.`);
    } else if (!command.bound || !command.reachable) {
      reasons.push(command.reason ?? `Command "${command.commandId}" is not live-bound.`);
    }
  });
  panelEvidence.forEach((panel) => {
    if (!panel.registered) {
      reasons.push(`Panel "${panel.panelId}" is not registered.`);
    } else if (!panel.bound) {
      reasons.push(panel.reason ?? `Panel "${panel.panelId}" is not live-bound.`);
    }
  });
  if (inventoriedRuntimeSurfaceIds.length === 0) {
    reasons.push("No current runtime surface is inventoried.");
  }
  if (requiresSelection && !hasLiveSelectionCapabilities(input.evidence.selection)) {
    reasons.push(
      input.evidence.selection?.reason
      ?? "Runtime Selection authority or required capabilities are missing."
    );
  }
  if (requiresEntities && !hasLiveEntityCapabilities(input.evidence.entities)) {
    reasons.push(
      input.evidence.entities?.reason
      ?? "Runtime Entity authority, adapters, or required capabilities are missing."
    );
  }
  if (requiresViewport) {
    if (!viewportEvidence?.registered || !viewportEvidence.bound) {
      reasons.push(viewportEvidence?.reason ?? "Runtime Viewport authority is missing.");
    } else if (!viewportEvidence.resizeSupported) {
      reasons.push("Runtime Viewport resize capability is missing.");
    } else if (viewportEvidence.available && !viewportEvidence.cameraResolvable) {
      reasons.push("Available Runtime Viewport camera is not resolvable.");
    }
  }

  const registered = commandEvidence.every((item) => item.registered)
    && panelEvidence.every((item) => item.registered);
  const bound = commandEvidence.every((item) => item.bound)
    && panelEvidence.every((item) => item.bound)
    && (!requiresSelection || hasLiveSelectionCapabilities(input.evidence.selection))
    && (!requiresEntities || hasLiveEntityCapabilities(input.evidence.entities))
    && (!requiresViewport || Boolean(viewportEvidence?.bound));
  const reachable = reasons.length === 0;
  const currentlyAvailable = reachable
    && commandEvidence.every((item) => item.currentlyAvailable)
    && panelEvidence.every((item) => item.available)
    && (!requiresViewport || Boolean(viewportEvidence?.available));
  const contextualReasons = [
    ...commandEvidence.filter((item) => !item.currentlyAvailable).flatMap((item) =>
      item.reason ? [item.reason] : []
    ),
    ...panelEvidence.filter((item) => !item.available).flatMap((item) =>
      item.reason ? [item.reason] : []
    ),
    ...(
      requiresViewport && viewportEvidence?.bound && !viewportEvidence.available
        ? [viewportEvidence.reason ?? "Runtime viewport is temporarily unavailable."]
        : []
    )
  ];

  return {
    featureId: feature.featureId,
    label: feature.label,
    classification: feature.classification,
    requiredForRegression: feature.requiredForRegression,
    declaredSurfaces: feature.surfaces,
    inventoriedRuntimeSurfaceIds,
    commandIds,
    panelIds,
    commandEvidence,
    panelEvidence,
    ...(requiresSelection && input.evidence.selection ? { selectionEvidence: input.evidence.selection } : {}),
    ...(requiresEntities && input.evidence.entities ? { entityEvidence: input.evidence.entities } : {}),
    ...(requiresViewport && viewportEvidence ? { viewportEvidence } : {}),
    registered,
    bound,
    reachable,
    currentlyAvailable,
    status: reasons.length > 0
      ? "blocked"
      : currentlyAvailable
        ? "ready"
        : "contextually-unavailable",
    reasons: uniqueSorted(reasons.length > 0 ? reasons : contextualReasons)
  };
};

export const createRuntimeFeatureAccessReport = (
  input: RuntimeFeatureAccessReportInput
): RuntimeFeatureAccessReport => {
  const duplicateFeatureIds = findDuplicates(input.features.map((feature) => feature.featureId));
  const featureIds = new Set(input.features.map((feature) => feature.featureId));
  const staleSurfaceFeatureIds = uniqueSorted(input.surfaces.flatMap((surface) =>
    (surface.featureIds ?? []).filter((featureId) => !featureIds.has(featureId))
  ));
  const unmappedRuntimeSurfaceIds = uniqueSorted(input.surfaces
    .filter((surface) => (surface.featureIds?.length ?? 0) === 0)
    .map((surface) => surface.surfaceId));
  const features = input.features.map((feature) => reportFeature(feature, input));
  const requiredRuntimeFeatures = features.filter(
    (feature) => feature.classification === "required-runtime"
  );
  const plannedFeatures = features.filter(
    (feature) => feature.classification === "declared-planned"
  );
  const qualitySignals = features.filter(
    (feature) => feature.classification === "quality-signal"
  );
  const unknownCommandIds = uniqueSorted(features.flatMap((feature) =>
    feature.commandEvidence.filter((command) => !command.registered).map((command) => command.commandId)
  ));
  const unknownPanelIds = uniqueSorted(features.flatMap((feature) =>
    feature.panelEvidence.filter((panel) => !panel.registered).map((panel) => panel.panelId)
  ));
  const metadataOnlyRequiredFeatureIds = requiredRuntimeFeatures
    .filter((feature) => !feature.bound || !feature.reachable)
    .map((feature) => feature.featureId);
  const blockedRequiredFeatureIds = uniqueSorted([
    ...requiredRuntimeFeatures
      .filter((feature) => feature.status === "blocked")
      .map((feature) => feature.featureId),
    ...qualitySignals
      .filter((feature) => feature.status !== "ready")
      .map((feature) => feature.featureId)
  ]);
  const issues = uniqueSorted([
    ...duplicateFeatureIds.map((featureId) => `Duplicate feature ID "${featureId}".`),
    ...staleSurfaceFeatureIds.map((featureId) => `Surface inventory references unknown feature "${featureId}".`),
    ...unmappedRuntimeSurfaceIds.map((surfaceId) => `Runtime surface "${surfaceId}" has no feature mapping.`),
    ...features.flatMap((feature) =>
      feature.status === "blocked"
        ? feature.reasons.map((reason) => `${feature.featureId}: ${reason}`)
        : []
    )
  ]);

  return {
    features,
    requiredRuntimeFeatures,
    plannedFeatures,
    qualitySignals,
    blockedRequiredFeatureIds,
    metadataOnlyRequiredFeatureIds,
    unknownCommandIds,
    unknownPanelIds,
    staleSurfaceFeatureIds,
    unmappedRuntimeSurfaceIds,
    duplicateFeatureIds,
    issues
  };
};
