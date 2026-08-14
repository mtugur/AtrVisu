import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry } from "../contracts";
import { createFeatureAccessRegistry } from "../registries";
import { criticalRegressionFeatureIds, platformFeatureAccessMatrix } from "../featureAccess";

const featureAccessEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix;

describe("platform feature access matrix", () => {
  it("is not empty", () => {
    expect(featureAccessEntries.length).toBeGreaterThan(0);
  });

  it("uses unique feature ids", () => {
    const featureIds = featureAccessEntries.map((entry) => entry.featureId);

    expect(new Set(featureIds).size).toBe(featureIds.length);
  });

  it("gives every required regression feature at least one surface", () => {
    const missingSurfaceEntries = featureAccessEntries.filter(
      (entry) => entry.requiredForRegression && entry.surfaces.length === 0
    );

    expect(missingSurfaceEntries).toEqual([]);
  });

  it("can register every matrix entry in the feature access registry", () => {
    const registry = createFeatureAccessRegistry();

    featureAccessEntries.forEach((entry) => {
      registry.register(entry);
    });

    expect(registry.list()).toHaveLength(featureAccessEntries.length);
  });

  it("contains the critical regression feature list", () => {
    const featureIds = new Set(featureAccessEntries.map((entry) => entry.featureId));

    criticalRegressionFeatureIds.forEach((featureId) => {
      expect(featureIds.has(featureId)).toBe(true);
    });
  });

  it("does not use empty commandId or panelId strings", () => {
    const entriesWithEmptyIds = featureAccessEntries.filter((entry) =>
      entry.commandId?.trim() === ""
      || entry.panelId?.trim() === ""
      || entry.commandIds?.some((commandId) => commandId.trim() === "")
      || entry.panelIds?.some((panelId) => panelId.trim() === "")
    );

    expect(entriesWithEmptyIds).toEqual([]);
  });

  it("classifies duplicate and runtime selection features as required runtime access", () => {
    expect(featureAccessEntries.find((entry) => entry.featureId === "object.duplicate")).toMatchObject({
      classification: "required-runtime",
      requiredForRegression: true,
      commandIds: ["edit.duplicateSelected"]
    });
    expect(featureAccessEntries.find((entry) => entry.featureId === "selection.singleSelect"))
      .toMatchObject({ classification: "required-runtime", runtimeRequirements: ["selection", "entity"] });
    expect(featureAccessEntries.find((entry) => entry.featureId === "selection.multiSelect"))
      .toMatchObject({ classification: "required-runtime", runtimeRequirements: ["selection", "entity"] });
  });

  it("keeps planned definitions explicit and excludes them from regression", () => {
    ["view.fitView", "panel.diagnostics"].forEach((featureId) => {
      expect(featureAccessEntries.find((entry) => entry.featureId === featureId)).toMatchObject({
        classification: "declared-planned",
        requiredForRegression: false
      });
    });
  });

  it("classifies the live explorer and status bar as required runtime surfaces", () => {
    ["panel.layoutExplorer", "panel.statusBar"].forEach((featureId) => {
      expect(featureAccessEntries.find((entry) => entry.featureId === featureId)).toMatchObject({
        classification: "required-runtime",
        requiredForRegression: true
      });
    });
  });

  it("maps every global display overlay capability to the View-owned modal", () => {
    [
      "view.displayOverlayControls",
      "view.selectionBox",
      "view.metadataBox",
      "view.collisionEnvelope",
      "view.clearanceEnvelope",
      "annotations.visibility",
      "annotations.leaderLines",
      "connectionPoints.displayMode"
    ].forEach((featureId) => {
      expect(featureAccessEntries.find((entry) => entry.featureId === featureId)).toMatchObject({
        requiredForRegression: true,
        panelIds: ["panel.displayOverlayControls"]
      });
    });
    expect(featureAccessEntries.find((entry) => entry.featureId === "view.displayOverlayControls"))
      .toMatchObject({
        commandIds: ["view.displayOverlayControls"],
        surfaces: ["menu", "modal"]
      });
  });

  it("models no-red-console as external quality evidence without fake runtime links", () => {
    const qualityFeature = featureAccessEntries.find(
      (entry) => entry.featureId === "diagnostics.noRedConsole"
    );
    expect(qualityFeature).toMatchObject({
      classification: "quality-signal",
      qualitySignalId: "no-red-console"
    });
    expect(qualityFeature).not.toHaveProperty("commandIds");
    expect(qualityFeature).not.toHaveProperty("panelIds");
  });

  it("contains current assembly action features", () => {
    const featureIds = new Set(featureAccessEntries.map((entry) => entry.featureId));

    [
      "assembly.createGroup",
      "assembly.addSelected",
      "assembly.removeSelected",
      "assembly.enterEdit",
      "assembly.exitEdit",
      "assembly.ungroup"
    ].forEach((featureId) => expect(featureIds.has(featureId)).toBe(true));
  });
});
