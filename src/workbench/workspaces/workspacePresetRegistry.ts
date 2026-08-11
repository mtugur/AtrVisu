import type {
  CommandId,
  EditorId,
  PanelId,
  WorkspaceId,
  WorkspacePreset
} from "../../platform/contracts";
import { WORKSPACE_IDS } from "../../platform/contracts";
import { validateWorkspacePreset } from "../../platform/phase1ArchitectureValidation";
import { platformCommandSeedDefinitions } from "../../platform/registrySeeds";
import {
  RUNTIME_PANEL_IDS,
  runtimePanelDescriptors,
  type RuntimePanelDescriptor
} from "../../platform/runtimePanels";
import { LAYOUT_3D_EDITOR_ID } from "../layout3dEditorDefinition";
import { workspacePresetDefinitions } from "./workspacePresetDefinitions";

export const WORKSPACE_PRESET_REGISTRY_ERROR_CODES = Object.freeze({
  invalid: "workspace-preset.invalid",
  duplicate: "workspace-preset.duplicate",
  unsupportedId: "workspace-preset.unsupported-id",
  unknownEditor: "workspace-preset.unknown-editor",
  unavailablePanel: "workspace-preset.unavailable-panel",
  unknownCommand: "workspace-preset.unknown-command"
} as const);

export type WorkspacePresetRegistryErrorCode =
  typeof WORKSPACE_PRESET_REGISTRY_ERROR_CODES[keyof typeof WORKSPACE_PRESET_REGISTRY_ERROR_CODES];

export class WorkspacePresetRegistryError extends Error {
  readonly code: WorkspacePresetRegistryErrorCode;
  readonly workspaceId?: string;

  constructor(code: WorkspacePresetRegistryErrorCode, message: string, workspaceId?: string) {
    super(message);
    this.name = "WorkspacePresetRegistryError";
    this.code = code;
    this.workspaceId = workspaceId;
  }
}

export const liveWorkspacePanelDescriptors = Object.freeze(
  runtimePanelDescriptors.filter((descriptor) => (
    descriptor.runtimeLocation !== "unbound"
    && descriptor.runtimeLocation !== "modal-layer"
    && descriptor.runtimeLocation !== "status-bar"
    && (descriptor.surfaceKind === "section" || descriptor.surfaceKind === "contextual")
    && descriptor.definition.id !== RUNTIME_PANEL_IDS.primaryDockShell
    && descriptor.definition.id !== RUNTIME_PANEL_IDS.rightPanelShell
    && descriptor.definition.id !== RUNTIME_PANEL_IDS.bottomDockShell
  ))
) as readonly RuntimePanelDescriptor[];

export type WorkspacePresetRegistryDependencies = Readonly<{
  editorIds: ReadonlySet<EditorId>;
  livePanelIds: ReadonlySet<PanelId>;
  commandIds: ReadonlySet<CommandId>;
  shippingWorkspaceIds: ReadonlySet<string>;
}>;

export type WorkspacePresetRegistry = Readonly<{
  presets: readonly Readonly<WorkspacePreset>[];
  get: (workspaceId: string) => Readonly<WorkspacePreset> | undefined;
  require: (workspaceId: WorkspaceId) => Readonly<WorkspacePreset>;
  has: (workspaceId: string) => boolean;
}>;

export const canonicalWorkspacePresetDependencies: WorkspacePresetRegistryDependencies = Object.freeze({
  editorIds: new Set<EditorId>([LAYOUT_3D_EDITOR_ID]),
  livePanelIds: new Set<PanelId>(liveWorkspacePanelDescriptors.map(({ definition }) => definition.id)),
  commandIds: new Set<CommandId>(platformCommandSeedDefinitions.map(({ id }) => id)),
  shippingWorkspaceIds: new Set<string>(WORKSPACE_IDS)
});

const freezePreset = (preset: WorkspacePreset): Readonly<WorkspacePreset> => Object.freeze({
  ...preset,
  initiallyVisiblePanelIds: Object.freeze([...preset.initiallyVisiblePanelIds]),
  emphasizedCommandIds: Object.freeze([...preset.emphasizedCommandIds])
});

export const createWorkspacePresetRegistry = (
  definitions: readonly WorkspacePreset[],
  dependencies: WorkspacePresetRegistryDependencies = canonicalWorkspacePresetDependencies
): WorkspacePresetRegistry => {
  const byId = new Map<string, Readonly<WorkspacePreset>>();
  const ordered: Readonly<WorkspacePreset>[] = [];

  definitions.forEach((definition) => {
    const validation = validateWorkspacePreset(definition);
    if (!validation.valid) {
      throw new WorkspacePresetRegistryError(
        WORKSPACE_PRESET_REGISTRY_ERROR_CODES.invalid,
        `Workspace preset "${definition.id}" is invalid.`,
        definition.id
      );
    }
    if (!dependencies.shippingWorkspaceIds.has(definition.id)) {
      throw new WorkspacePresetRegistryError(
        WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unsupportedId,
        `Workspace preset "${definition.id}" is not a shipping workspace.`,
        definition.id
      );
    }
    if (byId.has(definition.id)) {
      throw new WorkspacePresetRegistryError(
        WORKSPACE_PRESET_REGISTRY_ERROR_CODES.duplicate,
        `Duplicate workspace preset "${definition.id}".`,
        definition.id
      );
    }
    if (!dependencies.editorIds.has(definition.defaultEditorId)) {
      throw new WorkspacePresetRegistryError(
        WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unknownEditor,
        `Workspace preset "${definition.id}" references unavailable editor "${definition.defaultEditorId}".`,
        definition.id
      );
    }
    const unavailablePanelId = definition.initiallyVisiblePanelIds.find(
      (panelId) => !dependencies.livePanelIds.has(panelId)
    );
    if (unavailablePanelId) {
      throw new WorkspacePresetRegistryError(
        WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unavailablePanel,
        `Workspace preset "${definition.id}" references unavailable panel "${unavailablePanelId}".`,
        definition.id
      );
    }
    const unknownCommandId = definition.emphasizedCommandIds.find(
      (commandId) => !dependencies.commandIds.has(commandId)
    );
    if (unknownCommandId) {
      throw new WorkspacePresetRegistryError(
        WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unknownCommand,
        `Workspace preset "${definition.id}" references unknown command "${unknownCommandId}".`,
        definition.id
      );
    }

    const snapshot = freezePreset(definition);
    byId.set(snapshot.id, snapshot);
    ordered.push(snapshot);
  });

  const presets = Object.freeze([...ordered]);
  return Object.freeze({
    presets,
    get: (workspaceId: string) => byId.get(workspaceId),
    require: (workspaceId: WorkspaceId) => {
      const preset = byId.get(workspaceId);
      if (!preset) {
        throw new WorkspacePresetRegistryError(
          WORKSPACE_PRESET_REGISTRY_ERROR_CODES.unsupportedId,
          `Unknown workspace preset "${workspaceId}".`,
          workspaceId
        );
      }
      return preset;
    },
    has: (workspaceId: string) => byId.has(workspaceId)
  });
};

export const workspacePresetRegistry = createWorkspacePresetRegistry(workspacePresetDefinitions);
