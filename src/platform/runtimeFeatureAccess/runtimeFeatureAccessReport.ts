import type { FeatureAccessEntry, PlatformEntity } from "../contracts";
import { parseRuntimeSelectionEntityId } from "../runtimeSelection";
import type { LegacyEntityFamily } from "../adapters";
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

const familyByEntityType: Readonly<
  Partial<Record<PlatformEntity["type"], LegacyEntityFamily>>
> = {
  machine: "machine",
  civil: "civil",
  annotation: "annotation",
  group: "group"
};

const isCanonicalEntityIdentity = (entity: PlatformEntity) => {
  const parsed = parseRuntimeSelectionEntityId(entity.id);
  return parsed !== null && familyByEntityType[entity.type] === parsed.family;
};

const hasEntityShape = (entity: PlatformEntity) =>
  isCanonicalEntityIdentity(entity)
  && typeof entity.visible === "boolean"
  && typeof entity.locked === "boolean"
  && typeof entity.selectable === "boolean";

const requiredAdapterFamilies = ["annotation", "civil", "group", "machine"] as const;

export const requiredRuntimeSurfaceExecutionCommandIds = [
  "alignment.alignSelection",
  "annotations.create",
  "assembly.createGroup",
  "assembly.enterEdit",
  "assembly.exitEdit",
  "assembly.ungroup",
  "civil.addColumn",
  "edit.deleteSelected",
  "edit.duplicateSelected",
  "edit.redo",
  "edit.undo",
  "library.addMachine",
  "library.manager",
  "library.taxonomyManager",
  "performance.benchmark",
  "snap.connectionPoint",
  "view.showMeasurements",
  "view.toggleConnectionPoints",
  "view.toggleLabels"
] as const;

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
  && evidence.selectedEntitiesResolved
  && evidence.selectedEntitiesVisible
  && evidence.selectedEntitiesSelectable
  && evidence.primarySelectionValid
  && evidence.annotationExclusivityValid
  && evidence.activeGroupEditValid
  && evidence.activeGroupSelectionExclusive
  && evidence.groupChildPromotionValid
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
  && evidence.groupEntitiesValid
);

export const createRuntimeSelectionAccessEvidence = ({
  selection,
  entities,
  activeGroupEditId,
  capabilities
}: RuntimeSelectionEvidenceInput): RuntimeSelectionAccessEvidence => {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const selectedEntities = selection.ids.flatMap((id) => {
    const entity = entityById.get(id);
    return entity ? [entity] : [];
  });
  const canonicalIdSupport = selection.ids.every((id) => {
    const entity = entityById.get(id);
    return Boolean(entity && isCanonicalEntityIdentity(entity));
  });
  const selectedEntitiesResolved = selectedEntities.length === selection.ids.length;
  const selectedEntitiesVisible = selectedEntities.every((entity) => entity.visible);
  const selectedEntitiesSelectable = selectedEntities.every((entity) => entity.selectable);
  const primarySelectionValid = selection.ids.length === 0
    ? selection.primaryId == null
    : Boolean(selection.primaryId && selection.ids.includes(selection.primaryId));
  const annotationIds = selectedEntities
    .filter((entity) => entity.type === "annotation")
    .map((entity) => entity.id);
  const annotationExclusivityValid = annotationIds.length === 0
    || (annotationIds.length === 1 && selection.ids.length === 1);
  const activeGroupEntityId = activeGroupEditId ? `group:${activeGroupEditId}` : null;
  const activeGroup = activeGroupEntityId
    ? entityById.get(activeGroupEntityId)
    : undefined;
  const activeGroupEditValid = activeGroupEditId === null
    || Boolean(activeGroup?.type === "group" && activeGroup.childrenIds.length > 0);
  const activeGroupChildIds = new Set(
    activeGroup?.type === "group" ? activeGroup.childrenIds : []
  );
  const activeGroupSelectionExclusive = !activeGroupEntityId
    || !selection.ids.includes(activeGroupEntityId)
    || !selection.ids.some((id) => activeGroupChildIds.has(id));
  const groupChildPromotionValid = selectedEntities.every((entity) => {
    if (!entity.parentId) {
      return true;
    }
    return entity.parentId === activeGroupEntityId;
  });
  const reasons = uniqueSorted([
    ...(!capabilities.authorityBound ? ["Runtime Selection authority is not bound."] : []),
    ...(!capabilities.replaceSupported ? ["Runtime Selection replace capability is missing."] : []),
    ...(!capabilities.toggleSupported ? ["Runtime Selection toggle capability is missing."] : []),
    ...(!capabilities.clearSupported ? ["Runtime Selection clear capability is missing."] : []),
    ...(!capabilities.reconciliationSupported
      ? ["Runtime Selection reconciliation capability is missing."]
      : []),
    ...(!capabilities.groupRootSemanticsSupported
      ? ["Runtime Selection group-root semantics are missing."]
      : []),
    ...(!capabilities.editChildSemanticsSupported
      ? ["Runtime Selection edit-child semantics are missing."]
      : []),
    ...(!capabilities.staleUnselectableRemovalSupported
      ? ["Runtime Selection stale/unselectable removal capability is missing."]
      : []),
    ...(!canonicalIdSupport
      ? ["Runtime Selection contains a non-canonical entity identity."]
      : []),
    ...(!selectedEntitiesResolved
      ? ["Runtime Selection contains an unresolved entity ID."]
      : []),
    ...(!selectedEntitiesVisible
      ? ["Runtime Selection contains a hidden entity."]
      : []),
    ...(!selectedEntitiesSelectable
      ? ["Runtime Selection contains a non-selectable entity."]
      : []),
    ...(!primarySelectionValid
      ? ["Runtime Selection primary identity is inconsistent with the selected IDs."]
      : []),
    ...(!annotationExclusivityValid
      ? ["Runtime Selection mixes an annotation with another selected entity."]
      : []),
    ...(!activeGroupEditValid
      ? ["Runtime Selection active Edit Group identity is unresolved or invalid."]
      : []),
    ...(!activeGroupSelectionExclusive
      ? ["Runtime Selection contains both the active group root and one of its children."]
      : []),
    ...(!groupChildPromotionValid
      ? ["Runtime Selection contains a child outside the active Edit Group instead of its group root."]
      : [])
  ]);

  return {
    authorityBound: capabilities.authorityBound,
    canonicalIdSupport,
    currentSelectionIds: [...selection.ids],
    primarySelectionId: selection.primaryId ?? null,
    replaceSupported: capabilities.replaceSupported,
    toggleSupported: capabilities.toggleSupported,
    clearSupported: capabilities.clearSupported,
    reconciliationSupported: capabilities.reconciliationSupported,
    groupRootSemanticsSupported: capabilities.groupRootSemanticsSupported,
    editChildSemanticsSupported: capabilities.editChildSemanticsSupported,
    staleUnselectableRemovalSupported: capabilities.staleUnselectableRemovalSupported,
    selectedEntitiesResolved,
    selectedEntitiesVisible,
    selectedEntitiesSelectable,
    primarySelectionValid,
    annotationExclusivityValid,
    activeGroupEditValid,
    activeGroupSelectionExclusive,
    groupChildPromotionValid,
    reasons,
    ...(reasons[0] ? { reason: reasons.join(" ") } : {})
  };
};

export const createRuntimeEntityAccessEvidence = ({
  entities,
  authority
}: RuntimeEntityEvidenceInput): RuntimeEntityAccessEvidence => {
  const ids = entities.map((entity) => entity.id);
  const duplicateIds = findDuplicates(ids);
  const canonicalIdentity = entities.every(hasEntityShape);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const ownerGroupIdsByChildId = new Map<string, string[]>();
  const groupEntities = entities.filter((entity) => entity.type === "group");
  groupEntities.forEach((group) => {
    group.childrenIds.forEach((childId) => {
      const owners = ownerGroupIdsByChildId.get(childId) ?? [];
      ownerGroupIdsByChildId.set(childId, [...owners, group.id]);
    });
  });
  const groupEntitiesValid = groupEntities.every((group) =>
    group.childrenIds.length > 0
    && new Set(group.childrenIds).size === group.childrenIds.length
  );
  const groupChildrenAreReciprocal = groupEntities.every((group) =>
    group.childrenIds.every((childId) => {
      const child = entityById.get(childId);
      return Boolean(child && child.parentId === group.id);
    })
  );
  const parentLinksAreReciprocal = entities.every((entity) => {
    if (!entity.parentId) {
      return true;
    }
    const parent = entityById.get(entity.parentId);
    return parent?.type === "group" && parent.childrenIds.includes(entity.id);
  });
  const uniqueGroupOwnership = [...ownerGroupIdsByChildId.values()]
    .every((owners) => new Set(owners).size === 1);
  const parentChildRelationshipsRepresented =
    groupChildrenAreReciprocal
    && parentLinksAreReciprocal
    && uniqueGroupOwnership;
  const reasons = uniqueSorted([
    ...(!authority.authorityBound ? ["Runtime Entity adapter authority is not bound."] : []),
    ...requiredAdapterFamilies
      .filter((family) => !authority.adapterFamilies.includes(family))
      .map((family) => `Runtime Entity adapter family "${family}" is missing.`),
    ...(!canonicalIdentity ? ["One or more runtime entities have invalid canonical identity."] : []),
    ...(duplicateIds.length > 0
      ? [`Duplicate canonical entity IDs: ${duplicateIds.join(", ")}.`]
      : []),
    ...(!groupEntitiesValid
      ? ["Runtime Entity snapshot contains an empty or duplicate-member group."]
      : []),
    ...(!groupChildrenAreReciprocal
      ? ["Runtime Entity group child links are missing or not reciprocal."]
      : []),
    ...(!parentLinksAreReciprocal
      ? ["Runtime Entity parent links are missing or not reciprocal."]
      : []),
    ...(!uniqueGroupOwnership
      ? ["Runtime Entity child is owned by multiple groups."]
      : [])
  ]);

  return {
    authorityBound: authority.authorityBound,
    adapterFamilies: uniqueSorted(authority.adapterFamilies) as LegacyEntityFamily[],
    entityCount: entities.length,
    canonicalIdentity,
    duplicateIdentityRejected: duplicateIds.length === 0,
    parentChildRelationshipsRepresented,
    visibilityRepresented: entities.every((entity) => typeof entity.visible === "boolean"),
    selectabilityRepresented: entities.every((entity) => typeof entity.selectable === "boolean"),
    lockContextRepresented: entities.every((entity) => typeof entity.locked === "boolean"),
    layerAssociationRepresented: entities.every((entity) =>
      typeof entity.layerId === "string" && entity.layerId.length > 0
    ),
    groupEntitiesValid,
    entities: [...entities],
    reasons,
    ...(reasons[0] ? { reason: reasons.join(" ") } : {})
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
  const verifiedSurfaceExecutionCommandIds = new Set(
    input.evidence.surfaceExecution?.verifiedCommandIds ?? []
  );
  const missingSurfaceExecutionCommandIds =
    requiredRuntimeSurfaceExecutionCommandIds.filter(
      (commandId) => !verifiedSurfaceExecutionCommandIds.has(commandId)
    );
  const issues = uniqueSorted([
    ...duplicateFeatureIds.map((featureId) => `Duplicate feature ID "${featureId}".`),
    ...staleSurfaceFeatureIds.map((featureId) => `Surface inventory references unknown feature "${featureId}".`),
    ...unmappedRuntimeSurfaceIds.map((surfaceId) => `Runtime surface "${surfaceId}" has no feature mapping.`),
    ...missingSurfaceExecutionCommandIds.map(
      (commandId) => `External browser execution evidence is missing for "${commandId}".`
    ),
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
    requiredSurfaceExecutionCommandIds: [...requiredRuntimeSurfaceExecutionCommandIds],
    missingSurfaceExecutionCommandIds,
    issues
  };
};
