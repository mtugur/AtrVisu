import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry } from "../contracts";
import { createRuntimeFeatureAccessGate } from "./runtimeFeatureAccessGate";
import type { RuntimeFeatureAccessEvidence } from "./runtimeFeatureAccessTypes";

const runtimeSessionId = "runtime-session";

const required: FeatureAccessEntry = {
  featureId: "test.required",
  label: "Required",
  classification: "required-runtime",
  surfaces: ["panel"],
  commandIds: ["edit.undo"],
  panelIds: ["panel.test"],
  requiresSurfaceExecutionEvidence: true,
  requiredForRegression: true
};
const planned: FeatureAccessEntry = {
  featureId: "test.planned",
  label: "Planned",
  classification: "declared-planned",
  surfaces: ["api"],
  commandIds: ["test.plannedCommand"],
  requiredForRegression: false
};
const quality: FeatureAccessEntry = {
  featureId: "diagnostics.noRedConsole",
  label: "No red console",
  classification: "quality-signal",
  surfaces: ["api"],
  qualitySignalId: "no-red-console",
  requiredForRegression: true
};

const evidence = (
  overrides: Partial<RuntimeFeatureAccessEvidence> = {}
): RuntimeFeatureAccessEvidence => ({
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
    open: false,
    available: true,
    capabilities: ["open"]
  }),
  quality: { "no-red-console": true },
  surfaceExecution: {
    source: "observed-runtime-probes",
    sessionId: runtimeSessionId,
    observations: [{
      commandId: "edit.undo",
      sessionId: runtimeSessionId,
      beforeAttemptCount: 0,
      beforeExecutedCount: 0,
      afterAttemptCount: 1,
      afterExecutedCount: 1,
      finalResult: { handled: true, status: "executed" }
    }]
  },
  ...overrides
});

const createGate = (
  runtimeEvidence: RuntimeFeatureAccessEvidence,
  features: readonly FeatureAccessEntry[] = [required, planned, quality]
) => createRuntimeFeatureAccessGate({
  features,
  surfaces: [{
    surfaceId: "surface.required",
    surfaceType: "panel",
    label: "Required",
    owner: "existing-ui",
    sourceFiles: ["src/test.ts"],
    featureIds: [required.featureId],
    commandIds: required.commandIds,
    panelIds: required.panelIds
  }, {
    surfaceId: "surface.quality",
    surfaceType: "diagnostics",
    label: "Quality",
    owner: "platform",
    sourceFiles: ["e2e/test.ts"],
    featureIds: [quality.featureId]
  }],
  evidence: runtimeEvidence,
  runtimeSessionId
});

describe("runtime feature access gate", () => {
  it("passes live required features, planned unbound features, and explicit quality evidence", () => {
    const gate = createGate(evidence());

    expect(gate.passed).toBe(true);
    expect(gate.blockedFeatureIds).toEqual([]);
  });

  it("does not block contextual unavailability", () => {
    const gate = createGate(evidence({
      getCommand: (commandId) => ({
        commandId,
        registered: true,
        bound: true,
        reachable: true,
        currentlyAvailable: false,
        reason: "No selection."
      })
    }));

    expect(gate.report.features.find((feature) => feature.featureId === required.featureId)?.status)
      .toBe("contextually-unavailable");
    expect(gate.passed).toBe(true);
  });

  it("blocks a missing required command or panel", () => {
    const commandGate = createGate(evidence({
      getCommand: (commandId) => ({
        commandId,
        registered: true,
        bound: false,
        reachable: false,
        currentlyAvailable: false
      })
    }));
    const panelGate = createGate(evidence({ getPanel: () => undefined }));

    expect(commandGate.passed).toBe(false);
    expect(panelGate.passed).toBe(false);
  });

  it("blocks missing selection, entity, or viewport authorities", () => {
    const authorityFeature: FeatureAccessEntry = {
      ...required,
      runtimeRequirements: ["selection", "entity", "viewport"]
    };
    const baseAuthorityEvidence: RuntimeFeatureAccessEvidence = {
      ...evidence(),
      selection: {
        authorityBound: true,
        canonicalIdSupport: true,
        currentSelectionIds: [],
        primarySelectionId: null,
        replaceSupported: true,
        toggleSupported: true,
        clearSupported: true,
        reconciliationSupported: true,
        groupRootSemanticsSupported: true,
        editChildSemanticsSupported: true,
        staleUnselectableRemovalSupported: true,
        selectedEntitiesResolved: true,
        selectedEntitiesVisible: true,
        selectedEntitiesSelectable: true,
        primarySelectionValid: true,
        annotationExclusivityValid: true,
        activeGroupEditValid: true,
        activeGroupSelectionExclusive: true,
        groupChildPromotionValid: true,
        reasons: []
      },
      entities: {
        authorityBound: true,
        adapterFamilies: ["annotation", "civil", "group", "machine"],
        entityCount: 0,
        canonicalIdentity: true,
        duplicateIdentityRejected: true,
        parentChildRelationshipsRepresented: true,
        visibilityRepresented: true,
        selectabilityRepresented: true,
        lockContextRepresented: true,
        layerAssociationRepresented: true,
        groupEntitiesValid: true,
        entities: [],
        reasons: []
      },
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
      }
    };

    expect(createGate(
      { ...baseAuthorityEvidence, selection: undefined },
      [authorityFeature, planned, quality]
    ).passed).toBe(false);
    expect(createGate(
      { ...baseAuthorityEvidence, entities: undefined },
      [authorityFeature, planned, quality]
    ).passed).toBe(false);
    expect(createGate(
      { ...baseAuthorityEvidence, viewport: undefined },
      [authorityFeature, planned, quality]
    ).passed).toBe(false);
  });

  it("blocks missing, false, or fabricated production quality evidence", () => {
    expect(createGate(evidence({ quality: undefined })).passed).toBe(false);
    expect(createGate(evidence({ quality: { "no-red-console": false } })).passed).toBe(false);
    expect(createGate(evidence({ quality: {} })).passed).toBe(false);
  });

  it("blocks missing external browser surface execution evidence", () => {
    const gate = createGate(evidence({ surfaceExecution: undefined }));

    expect(gate.passed).toBe(false);
    expect(gate.report.missingSurfaceExecutionCommandIds)
      .toEqual(["edit.undo"]);
  });

  it("blocks partial, cancelled, and copied-ID-only surface evidence", () => {
    const partial = createGate(evidence({
      surfaceExecution: {
        source: "observed-runtime-probes",
        sessionId: runtimeSessionId,
        observations: []
      }
    }));
    const cancelled = createGate(evidence({
      surfaceExecution: {
        source: "observed-runtime-probes",
        sessionId: runtimeSessionId,
        observations: [{
          commandId: "edit.undo",
          sessionId: runtimeSessionId,
          beforeAttemptCount: 0,
          beforeExecutedCount: 0,
          afterAttemptCount: 1,
          afterExecutedCount: 0,
          finalResult: { handled: false, status: "cancelled" }
        }]
      }
    }));
    const copiedIdsOnly: unknown = { verifiedCommandIds: ["edit.undo"] };
    const copied = createGate(evidence({
      surfaceExecution: copiedIdsOnly as RuntimeFeatureAccessEvidence["surfaceExecution"]
    }));

    expect(partial.passed).toBe(false);
    expect(partial.report.missingSurfaceExecutionCommandIds).toEqual(["edit.undo"]);
    expect(cancelled.passed).toBe(false);
    expect(cancelled.report.surfaceExecutionValidation.cancelledCommandIds)
      .toEqual(["edit.undo"]);
    expect(copied.passed).toBe(false);
    expect(copied.report.surfaceExecutionValidation.verifiedCommandIds).toEqual([]);
  });

  it("reports deterministic sorted failure reasons", () => {
    const gate = createGate(evidence({
      getCommand: (commandId) => ({
        commandId,
        registered: false,
        bound: false,
        reachable: false,
        currentlyAvailable: false
      }),
      quality: undefined
    }));

    expect(gate.reasons).toEqual([...gate.reasons].sort());
  });
});
