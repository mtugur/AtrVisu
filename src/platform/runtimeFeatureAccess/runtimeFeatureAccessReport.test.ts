import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry, PlatformEntity, SelectionState } from "../contracts";
import {
  createRuntimeEntityAccessEvidence,
  createRuntimeFeatureAccessReport,
  createRuntimeSelectionAccessEvidence
} from "./runtimeFeatureAccessReport";
import type {
  RuntimeFeatureAccessEvidence,
  RuntimeFeatureAccessReportInput
} from "./runtimeFeatureAccessTypes";

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
    activeGroupEditId: null
  }),
  entities: createRuntimeEntityAccessEvidence({ entities: [] }),
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
      activeGroupEditId: null
    });
    const entities = createRuntimeEntityAccessEvidence({ entities: [] });

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
    const entities = createRuntimeEntityAccessEvidence({ entities: [child, group] });
    const selectionState: SelectionState = {
      ids: [child.id, group.id],
      primaryId: child.id,
      source: "test"
    };
    const selection = createRuntimeSelectionAccessEvidence({
      selection: selectionState,
      entities: [child, group],
      activeGroupEditId: "g-1"
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
    const entities = createRuntimeEntityAccessEvidence({ entities: [entity, entity] });

    expect(entities.duplicateIdentityRejected).toBe(false);
    expect(entities.reason).toContain("Duplicate canonical entity IDs");
  });

  it("rejects missing entity adapter families and stale runtime selection ids", () => {
    const staleSelection = createRuntimeSelectionAccessEvidence({
      selection: { ids: ["machine:missing"], source: "test" },
      entities: [],
      activeGroupEditId: null
    });
    const incompleteEntities = createRuntimeEntityAccessEvidence({
      entities: [],
      adapterFamilies: ["machine"]
    });
    const report = createRuntimeFeatureAccessReport(input([requiredFeature], evidence({
      selection: staleSelection,
      entities: incompleteEntities
    })));

    expect(staleSelection.canonicalIdSupport).toBe(false);
    expect(report.features[0].status).toBe("blocked");
    expect(report.features[0].reasons).toEqual(expect.arrayContaining([
      "Runtime Selection contains an unresolved or non-canonical entity ID.",
      "Runtime Entity authority, adapters, or required capabilities are missing."
    ]));
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
});
