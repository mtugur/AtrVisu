import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry, PlatformEntity, SelectionState } from "../contracts";
import {
  createRuntimeEntityAccessEvidence,
  createRuntimeFeatureAccessReport,
  createRuntimeSelectionAccessEvidence,
  requiredRuntimeSurfaceExecutionCommandIds
} from "./runtimeFeatureAccessReport";
import type {
  RuntimeEntityAuthorityCapabilities,
  RuntimeFeatureAccessEvidence,
  RuntimeFeatureAccessReportInput,
  RuntimeSelectionAuthorityCapabilities
} from "./runtimeFeatureAccessTypes";

const selectionCapabilities: RuntimeSelectionAuthorityCapabilities = {
  authorityBound: true,
  replaceSupported: true,
  toggleSupported: true,
  clearSupported: true,
  reconciliationSupported: true,
  groupRootSemanticsSupported: true,
  editChildSemanticsSupported: true,
  staleUnselectableRemovalSupported: true
};
const entityAuthority: RuntimeEntityAuthorityCapabilities = {
  authorityBound: true,
  adapterFamilies: ["machine", "civil", "annotation", "group"]
};

const entity: PlatformEntity = {
  id: "machine:m-1",
  type: "machine",
  name: "Machine",
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds: [],
  layerId: "default",
  visible: true,
  locked: false,
  selectable: true
};

const requiredFeature: FeatureAccessEntry = {
  featureId: "test.required",
  label: "Required",
  classification: "required-runtime",
  surfaces: ["panel"],
  commandIds: ["test.command"],
  panelIds: ["panel.test"],
  runtimeRequirements: ["selection", "entity", "viewport"],
  requiredForRegression: true
};

const evidence = (overrides: Partial<RuntimeFeatureAccessEvidence> = {}): RuntimeFeatureAccessEvidence => ({
  getCommand: (commandId) => ({
    commandId,
    registered: true,
    bound: true,
    reachable: true,
    currentlyAvailable: true
  }),
  getPanel: (panelId) => ({
    panelId,
    registered: true,
    bound: true,
    visible: true,
    open: true,
    available: true,
    capabilities: ["open", "close"]
  }),
  selection: createRuntimeSelectionAccessEvidence({
    selection: { ids: [], source: "test" },
    entities: [],
    activeGroupEditId: null,
    capabilities: selectionCapabilities
  }),
  entities: createRuntimeEntityAccessEvidence({ entities: [], authority: entityAuthority }),
  viewport: {
    viewportId: "viewport.main",
    registered: true,
    bound: true,
    available: true,
    visible: true,
    cssWidth: 1000,
    cssHeight: 700,
    cameraResolvable: true,
    resizeSupported: true,
    sceneLifecycleGeneration: 1,
    resizeGeneration: 1
  },
  surfaceExecution: {
    verifiedCommandIds: requiredRuntimeSurfaceExecutionCommandIds
  },
  ...overrides
});

const input = (
  features: readonly FeatureAccessEntry[],
  runtimeEvidence: RuntimeFeatureAccessEvidence = evidence()
): RuntimeFeatureAccessReportInput => ({
  features,
  surfaces: features.map((feature, index) => ({
    surfaceId: `surface.${index}`,
    surfaceType: "panel",
    label: feature.label,
    owner: "existing-ui",
    sourceFiles: ["src/test.ts"],
    featureIds: [feature.featureId],
    commandIds: feature.commandIds,
    panelIds: feature.panelIds
  })),
  evidence: runtimeEvidence
});

describe("runtime feature access report", () => {
  it("reports a fully live required feature as ready", () => {
    const report = createRuntimeFeatureAccessReport(input([requiredFeature]));

    expect(report.features[0]).toMatchObject({
      status: "ready",
      registered: true,
      bound: true,
      reachable: true,
      currentlyAvailable: true
    });
  });

  it("reports disabled live bindings as contextually unavailable", () => {
    const report = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      getCommand: (commandId) => ({
        commandId,
        registered: true,
        bound: true,
        reachable: true,
        currentlyAvailable: false,
        reason: "No eligible selection."
      })
    })));

    expect(report.features[0].status).toBe("contextually-unavailable");
    expect(report.features[0].reasons).toContain("No eligible selection.");
    expect(report.blockedRequiredFeatureIds).toEqual([]);
  });

  it("blocks a seed-only or missing required command binding", () => {
    const report = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      getCommand: (commandId) => ({
        commandId,
        registered: true,
        bound: false,
        reachable: false,
        currentlyAvailable: false,
        reason: "Seed metadata only."
      })
    })));

    expect(report.features[0].status).toBe("blocked");
    expect(report.metadataOnlyRequiredFeatureIds).toEqual(["test.required"]);
  });

  it("blocks a required feature with no runtime authority requirement", () => {
    const metadataOnly: FeatureAccessEntry = {
      featureId: "test.metadataOnly",
      label: "Metadata only",
      classification: "required-runtime",
      surfaces: ["panel"],
      requiredForRegression: true
    };
    const report = createRuntimeFeatureAccessReport(input([metadataOnly]));

    expect(report.features[0]).toMatchObject({
      status: "blocked",
      reachable: false
    });
    expect(report.features[0].reasons).toContain(
      "Required runtime feature has no runtime authority requirement."
    );
  });

  it("reports unknown command and panel references", () => {
    const report = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      getCommand: (commandId) => ({
        commandId,
        registered: false,
        bound: false,
        reachable: false,
        currentlyAvailable: false
      }),
      getPanel: () => undefined
    })));

    expect(report.unknownCommandIds).toEqual(["test.command"]);
    expect(report.unknownPanelIds).toEqual(["panel.test"]);
    expect(report.features[0].status).toBe("blocked");
  });

  it("keeps declared planned features explicitly unbound", () => {
    const planned: FeatureAccessEntry = {
      featureId: "test.planned",
      label: "Planned",
      classification: "declared-planned",
      surfaces: ["api"],
      commandIds: ["test.plannedCommand"],
      requiredForRegression: false
    };
    const report = createRuntimeFeatureAccessReport({
      features: [planned],
      surfaces: [],
      evidence: evidence()
    });

    expect(report.features[0]).toMatchObject({
      status: "planned-unbound",
      bound: false,
      reachable: false
    });
  });

  it("requires explicit external evidence for a quality signal without command or panel bindings", () => {
    const quality: FeatureAccessEntry = {
      featureId: "diagnostics.noRedConsole",
      label: "No red console",
      classification: "quality-signal",
      surfaces: ["api"],
      qualitySignalId: "no-red-console",
      requiredForRegression: true
    };
    const missing = createRuntimeFeatureAccessReport(input([quality]));
    const passing = createRuntimeFeatureAccessReport(input([quality], evidence({
      quality: { "no-red-console": true }
    })));

    expect(missing.features[0].status).toBe("external-evidence-required");
    expect(missing.features[0].commandEvidence).toEqual([]);
    expect(missing.features[0].panelEvidence).toEqual([]);
    expect(passing.features[0].status).toBe("ready");
  });

  it("rejects duplicate feature ids and stale surface mappings deterministically", () => {
    const report = createRuntimeFeatureAccessReport({
      ...input([requiredFeature, requiredFeature]),
      surfaces: [{
        surfaceId: "surface.stale",
        surfaceType: "panel",
        label: "Stale",
        owner: "existing-ui",
        sourceFiles: ["src/test.ts"],
        featureIds: ["missing.feature"]
      }]
    });

    expect(report.duplicateFeatureIds).toEqual(["test.required"]);
    expect(report.staleSurfaceFeatureIds).toEqual(["missing.feature"]);
    expect(report.issues).toEqual([...report.issues].sort());
  });
});

describe("runtime authority evidence", () => {
  it("accepts an empty authoritative selection and entity snapshot", () => {
    const selection = createRuntimeSelectionAccessEvidence({
      selection: { ids: [], source: "test" },
      entities: [],
      activeGroupEditId: null,
      capabilities: selectionCapabilities
    });
    const entities = createRuntimeEntityAccessEvidence({
      entities: [],
      authority: entityAuthority
    });

    expect(selection).toMatchObject({
      authorityBound: true,
      canonicalIdSupport: true,
      replaceSupported: true,
      toggleSupported: true,
      clearSupported: true,
      reconciliationSupported: true
    });
    expect(entities).toMatchObject({
      authorityBound: true,
      entityCount: 0,
      canonicalIdentity: true,
      duplicateIdentityRejected: true
    });
  });

  it("represents canonical identity, lock, visibility, layer, and assembly relationships", () => {
    const group: PlatformEntity = {
      ...entity,
      id: "group:g-1",
      type: "group",
      name: "Group",
      childrenIds: [entity.id]
    };
    const child = { ...entity, parentId: group.id };
    const entities = createRuntimeEntityAccessEvidence({
      entities: [child, group],
      authority: entityAuthority
    });
    const selectionState: SelectionState = {
      ids: [child.id],
      primaryId: child.id,
      source: "test"
    };
    const selection = createRuntimeSelectionAccessEvidence({
      selection: selectionState,
      entities: [child, group],
      activeGroupEditId: "g-1",
      capabilities: selectionCapabilities
    });

    expect(entities).toMatchObject({
      canonicalIdentity: true,
      parentChildRelationshipsRepresented: true,
      visibilityRepresented: true,
      selectabilityRepresented: true,
      lockContextRepresented: true,
      layerAssociationRepresented: true
    });
    expect(selection).toMatchObject({
      canonicalIdSupport: true,
      primarySelectionId: child.id,
      groupRootSemanticsSupported: true,
      editChildSemanticsSupported: true
    });
  });

  it("reports duplicate canonical identities as invalid", () => {
    const entities = createRuntimeEntityAccessEvidence({
      entities: [entity, entity],
      authority: entityAuthority
    });

    expect(entities.duplicateIdentityRejected).toBe(false);
    expect(entities.reason).toContain("Duplicate canonical entity IDs");
  });

  it("rejects missing entity adapter families and stale runtime selection ids", () => {
    const staleSelection = createRuntimeSelectionAccessEvidence({
      selection: { ids: ["machine:missing"], source: "test" },
      entities: [],
      activeGroupEditId: null,
      capabilities: selectionCapabilities
    });
    const incompleteEntities = createRuntimeEntityAccessEvidence({
      entities: [],
      authority: {
        authorityBound: true,
        adapterFamilies: ["machine"]
      }
    });
    const report = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      selection: staleSelection,
      entities: incompleteEntities
    })));

    expect(staleSelection.canonicalIdSupport).toBe(false);
    expect(report.features[0].status).toBe("blocked");
    expect(report.features[0].reasons.join(" ")).toContain(
      "Runtime Selection contains an unresolved entity ID."
    );
    expect(report.features[0].reasons.join(" ")).toContain(
      'Runtime Entity adapter family "annotation" is missing.'
    );
  });

  it("keeps an unavailable bound viewport contextual but blocks missing resize capability", () => {
    const unavailable = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      viewport: {
        ...evidence().viewport!,
        available: false,
        cameraResolvable: false,
        reason: "Viewport is initializing."
      }
    })));
    const missingResize = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      viewport: {
        ...evidence().viewport!,
        resizeSupported: false
      }
    })));

    expect(unavailable.features[0]).toMatchObject({
      status: "contextually-unavailable",
      bound: true,
      reachable: true
    });
    expect(unavailable.features[0].reasons).toContain("Viewport is initializing.");
    expect(missingResize.features[0].status).toBe("blocked");
  });

  it("blocks every missing Runtime Selection authority capability", () => {
    (Object.keys(selectionCapabilities) as Array<keyof RuntimeSelectionAuthorityCapabilities>)
      .forEach((capability) => {
        const selection = createRuntimeSelectionAccessEvidence({
          selection: { ids: [], source: "test" },
          entities: [],
          activeGroupEditId: null,
          capabilities: { ...selectionCapabilities, [capability]: false }
        });
        const report = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
          selection
        })));

        expect(report.features[0].status, capability).toBe("blocked");
      });
  });

  it("blocks unresolved, hidden, non-selectable, and invalid primary selections", () => {
    const cases: Array<{
      selection: SelectionState;
      entities: readonly PlatformEntity[];
      expectedReason: string;
    }> = [{
      selection: { ids: ["machine:missing"], primaryId: "machine:missing", source: "test" },
      entities: [],
      expectedReason: "unresolved"
    }, {
      selection: { ids: [entity.id], primaryId: entity.id, source: "test" },
      entities: [{ ...entity, visible: false }],
      expectedReason: "hidden"
    }, {
      selection: { ids: [entity.id], primaryId: entity.id, source: "test" },
      entities: [{ ...entity, selectable: false }],
      expectedReason: "non-selectable"
    }, {
      selection: { ids: [entity.id], primaryId: "machine:other", source: "test" },
      entities: [entity],
      expectedReason: "primary"
    }];

    cases.forEach(({ selection, entities, expectedReason }) => {
      const result = createRuntimeSelectionAccessEvidence({
        selection,
        entities,
        activeGroupEditId: null,
        capabilities: selectionCapabilities
      });
      expect(result.reasons.join(" ").toLowerCase()).toContain(expectedReason);
      expect(createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
        selection: result
      })))).toMatchObject({
        features: [{ status: "blocked" }]
      });
    });
  });

  it("enforces annotation and active Edit Group selection exclusivity", () => {
    const annotation: PlatformEntity = {
      ...entity,
      id: "annotation:a-1",
      type: "annotation",
      name: "Note"
    };
    const group: PlatformEntity = {
      ...entity,
      id: "group:g-1",
      type: "group",
      name: "Group",
      childrenIds: [entity.id]
    };
    const child = { ...entity, parentId: group.id };
    const mixedAnnotation = createRuntimeSelectionAccessEvidence({
      selection: {
        ids: [annotation.id, child.id],
        primaryId: annotation.id,
        source: "test"
      },
      entities: [annotation, child, group],
      activeGroupEditId: "g-1",
      capabilities: selectionCapabilities
    });
    const rootAndChild = createRuntimeSelectionAccessEvidence({
      selection: {
        ids: [group.id, child.id],
        primaryId: group.id,
        source: "test"
      },
      entities: [child, group],
      activeGroupEditId: "g-1",
      capabilities: selectionCapabilities
    });

    expect(mixedAnnotation.annotationExclusivityValid).toBe(false);
    expect(rootAndChild.activeGroupSelectionExclusive).toBe(false);
  });

  it("accepts active group root-only and child-only selection", () => {
    const group: PlatformEntity = {
      ...entity,
      id: "group:g-1",
      type: "group",
      childrenIds: [entity.id]
    };
    const child = { ...entity, parentId: group.id };
    const rootOnly = createRuntimeSelectionAccessEvidence({
      selection: { ids: [group.id], primaryId: group.id, source: "test" },
      entities: [child, group],
      activeGroupEditId: "g-1",
      capabilities: selectionCapabilities
    });
    const childOnly = createRuntimeSelectionAccessEvidence({
      selection: { ids: [child.id], primaryId: child.id, source: "test" },
      entities: [child, group],
      activeGroupEditId: "g-1",
      capabilities: selectionCapabilities
    });

    expect(rootOnly.reasons).toEqual([]);
    expect(childOnly.reasons).toEqual([]);
  });

  it("blocks invalid Edit Group identity and unpromoted children from another group", () => {
    const group: PlatformEntity = {
      ...entity,
      id: "group:g-2",
      type: "group",
      childrenIds: [entity.id]
    };
    const child = { ...entity, parentId: group.id };
    const invalidActiveGroup = createRuntimeSelectionAccessEvidence({
      selection: { ids: [], source: "test" },
      entities: [child, group],
      activeGroupEditId: "missing",
      capabilities: selectionCapabilities
    });
    const unpromotedChild = createRuntimeSelectionAccessEvidence({
      selection: { ids: [child.id], primaryId: child.id, source: "test" },
      entities: [child, group],
      activeGroupEditId: null,
      capabilities: selectionCapabilities
    });

    expect(invalidActiveGroup.activeGroupEditValid).toBe(false);
    expect(unpromotedChild.groupChildPromotionValid).toBe(false);
  });

  it("requires explicit complete Runtime Entity authority for an empty snapshot", () => {
    const missingAuthority = createRuntimeEntityAccessEvidence({
      entities: [],
      authority: { ...entityAuthority, authorityBound: false }
    });
    const missingFamily = createRuntimeEntityAccessEvidence({
      entities: [],
      authority: { authorityBound: true, adapterFamilies: ["machine", "civil", "group"] }
    });
    const complete = createRuntimeEntityAccessEvidence({
      entities: [],
      authority: entityAuthority
    });

    expect(missingAuthority.reason).toContain("not bound");
    expect(missingFamily.reason).toContain('"annotation" is missing');
    expect(complete.reasons).toEqual([]);
  });

  it("rejects type/family mismatch and invalid group relationships", () => {
    const mismatched = createRuntimeEntityAccessEvidence({
      entities: [{ ...entity, id: "civil:c-1" }],
      authority: entityAuthority
    });
    const group: PlatformEntity = {
      ...entity,
      id: "group:g-1",
      type: "group",
      childrenIds: [entity.id]
    };
    const missingChild = createRuntimeEntityAccessEvidence({
      entities: [group],
      authority: entityAuthority
    });
    const oneSided = createRuntimeEntityAccessEvidence({
      entities: [entity, group],
      authority: entityAuthority
    });
    const childWithUnlistedParent = createRuntimeEntityAccessEvidence({
      entities: [{ ...entity, parentId: group.id }, { ...group, childrenIds: ["civil:c-1"] }],
      authority: entityAuthority
    });
    const secondGroup = { ...group, id: "group:g-2" };
    const multiplyOwned = createRuntimeEntityAccessEvidence({
      entities: [{ ...entity, parentId: group.id }, group, secondGroup],
      authority: entityAuthority
    });

    expect(mismatched.canonicalIdentity).toBe(false);
    expect(missingChild.parentChildRelationshipsRepresented).toBe(false);
    expect(oneSided.parentChildRelationshipsRepresented).toBe(false);
    expect(childWithUnlistedParent.parentChildRelationshipsRepresented).toBe(false);
    expect(multiplyOwned.reason).toContain("multiple groups");
  });

  it("accepts a valid machine, civil, annotation, and group snapshot", () => {
    const machine = { ...entity, parentId: "group:g-1" };
    const civil: PlatformEntity = {
      ...entity,
      id: "civil:c-1",
      type: "civil",
      name: "Column"
    };
    const annotation: PlatformEntity = {
      ...entity,
      id: "annotation:a-1",
      type: "annotation",
      name: "Note"
    };
    const group: PlatformEntity = {
      ...entity,
      id: "group:g-1",
      type: "group",
      childrenIds: [machine.id]
    };
    const result = createRuntimeEntityAccessEvidence({
      entities: [machine, civil, annotation, group],
      authority: entityAuthority
    });

    expect(result).toMatchObject({
      authorityBound: true,
      canonicalIdentity: true,
      duplicateIdentityRejected: true,
      parentChildRelationshipsRepresented: true,
      groupEntitiesValid: true
    });
    expect(result.reasons).toEqual([]);
  });
});
