import { describe, expect, it } from "vitest";
import {
  WORKSPACE_IDS,
  WORKSPACE_PRESET_SCHEMA_VERSION,
  type WorkspacePreset
} from "../../platform/contracts";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import { platformCommandSeedDefinitions } from "../../platform/registrySeeds";
import { LAYOUT_3D_EDITOR_ID } from "../layout3dEditorDefinition";
import {
  LAYOUT_ENGINEERING_WORKSPACE_ID,
  SALES_LAYOUT_WORKSPACE_ID,
  workspacePresetDefinitions
} from "./workspacePresetDefinitions";
import {
  WORKSPACE_PRESET_REGISTRY_ERROR_CODES,
  WorkspacePresetRegistryError,
  createWorkspacePresetRegistry,
  liveWorkspacePanelDescriptors,
  workspacePresetRegistry
} from "./workspacePresetRegistry";

const expectRegistryError = (operation: () => unknown, code: string) => {
  try {
    operation();
    throw new Error("Expected workspace registry creation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(WorkspacePresetRegistryError);
    expect((error as WorkspacePresetRegistryError).code).toBe(code);
  }
};

const containsFunction = (value: unknown): boolean => {
  if (typeof value === "function") return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(containsFunction);
};

describe("canonical workspace preset registry", () => {
  it("registers exactly two deterministic, JSON-safe shipping presets", () => {
    expect(workspacePresetRegistry.presets.map(({ id }) => id)).toEqual([...WORKSPACE_IDS]);
    expect(new Set(workspacePresetRegistry.presets.map(({ id }) => id)).size).toBe(2);
    expect(workspacePresetRegistry.presets.every(
      ({ schemaVersion }) => schemaVersion === WORKSPACE_PRESET_SCHEMA_VERSION
    )).toBe(true);
    expect(() => JSON.stringify(workspacePresetRegistry.presets)).not.toThrow();
    expect(containsFunction(workspacePresetRegistry.presets)).toBe(false);
  });

  it("defines the exact Sales Layout metadata", () => {
    expect(workspacePresetRegistry.require(SALES_LAYOUT_WORKSPACE_ID)).toEqual({
      schemaVersion: 1,
      id: SALES_LAYOUT_WORKSPACE_ID,
      labelKey: "workspace.salesLayout",
      tooltipKey: "workspace.salesLayout.tooltip",
      defaultEditorId: LAYOUT_3D_EDITOR_ID,
      inspectorMode: "summary",
      densityPreference: "comfortable",
      initiallyVisiblePanelIds: [
        "panel.machineLibrary", "panel.layoutControls", "panel.viewpoints", "panel.projectStatus",
        "panel.annotations", "panel.precisionPlacement", "panel.connectionPointSnap",
        "panel.displayOverlayControls", "panel.inspector"
      ],
      emphasizedCommandIds: [
        "project.save", "edit.duplicateSelected", "view.toggleLabels", "view.viewpoints"
      ]
    });
  });

  it("defines the exact Layout Engineering metadata", () => {
    expect(workspacePresetRegistry.require(LAYOUT_ENGINEERING_WORKSPACE_ID)).toEqual({
      schemaVersion: 1,
      id: LAYOUT_ENGINEERING_WORKSPACE_ID,
      labelKey: "workspace.layoutEngineering",
      tooltipKey: "workspace.layoutEngineering.tooltip",
      defaultEditorId: LAYOUT_3D_EDITOR_ID,
      inspectorMode: "engineering",
      densityPreference: "compact",
      initiallyVisiblePanelIds: [
        "panel.machineLibrary", "panel.layoutControls", "panel.viewpoints", "panel.layers",
        "panel.civilReferences", "panel.groups", "panel.projectStatus", "panel.annotations",
        "panel.precisionPlacement", "panel.alignmentTools", "panel.connectionPointSnap",
        "panel.displayOverlayControls", "panel.collisionCheck", "panel.inspector"
      ],
      emphasizedCommandIds: [
        "edit.undo", "edit.redo", "edit.duplicateSelected", "edit.deleteSelected",
        "view.showMeasurements", "view.toggleConnectionPoints"
      ]
    });
  });

  it("resolves only maintained editor, live panel, and command references", () => {
    const livePanels = new Set(liveWorkspacePanelDescriptors.map(({ definition }) => definition.id));
    const commands = new Set(platformCommandSeedDefinitions.map(({ id }) => id));
    workspacePresetRegistry.presets.forEach((preset) => {
      expect(preset.defaultEditorId).toBe(LAYOUT_3D_EDITOR_ID);
      expect(preset.initiallyVisiblePanelIds.every((id) => livePanels.has(id))).toBe(true);
      expect(preset.emphasizedCommandIds.every((id) => commands.has(id))).toBe(true);
      expect(preset.initiallyVisiblePanelIds).not.toContain(RUNTIME_PANEL_IDS.rightPanelShell);
    });
  });

  it("rejects duplicate, unsupported, unavailable, and unknown references", () => {
    const sales = workspacePresetDefinitions[0] as WorkspacePreset;
    expectRegistryError(
      () => createWorkspacePresetRegistry([sales, sales]),
      WORKSPACE_PRESET_REGISTRY_ERROR_CODES.duplicate
    );
    expectRegistryError(
      () => createWorkspacePresetRegistry([
        { ...sales, id: "workspace.unknown" } as unknown as WorkspacePreset
      ]),
      WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unsupportedId
    );
    expectRegistryError(
      () => createWorkspacePresetRegistry([{ ...sales, defaultEditorId: "editor.unknown" }]),
      WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unknownEditor
    );
    expectRegistryError(
      () => createWorkspacePresetRegistry([{ ...sales, initiallyVisiblePanelIds: ["panel.layoutExplorer"] }]),
      WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unavailablePanel
    );
    expectRegistryError(
      () => createWorkspacePresetRegistry([{ ...sales, emphasizedCommandIds: ["command.unknown"] }]),
      WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unknownCommand
    );
  });

  it("returns safely for unknown lookup without inventing a preset", () => {
    expect(workspacePresetRegistry.get("workspace.unknown")).toBeUndefined();
    expect(workspacePresetRegistry.has("workspace.unknown")).toBe(false);
  });
});
