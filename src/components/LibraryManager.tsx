import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type {
  LibraryGroup,
  LibraryMachineItem,
  LoadedMachineLibrary,
  MachineLibraryDocument
} from "../types/machine";
import type { AtaraMachineData, MachineConnectionPoint } from "../types/ataraMachineData";
import type { MachineTaxonomy } from "../types/taxonomy";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import {
  CUSTOM_LIBRARY_STORAGE_KEY,
  PROJECT_CUSTOM_LIBRARY_ID,
  validateProjectCustomLibraryDocument
} from "../utils/libraryValidation";
import { inferPlaceholderVisualType, loadMachineTaxonomy, normalizeTags } from "../utils/taxonomy";
import { mmToMeters } from "../utils/units";
import { normalizeCollisionEnvelope } from "../utils/collision";
import { normalizeAtaraMachineData } from "../utils/ataraMachineData";

type LibraryManagerProps = {
  libraries: LoadedMachineLibrary[];
  taxonomyReloadToken: number;
  onClose: () => void;
  onLibrariesChanged: () => void;
};

type SelectedNode =
  | { type: "group"; groupId: string }
  | { type: "item"; groupId: string; itemId: string };

type ItemEditorState = {
  mode: "add" | "edit";
  parentGroupId: string;
  originalId?: string;
  id: string;
  name: string;
  category: string;
  machineType: string;
  variant: string;
  productFamilyCode: string;
  tags: string;
  placeholderVisualType: string;
  widthMm: string;
  depthMm: string;
  heightMm: string;
  defaultColor: string;
  canConvey: boolean;
  canPalletize: boolean;
  canWrap: boolean;
  hasFlowDirection: boolean;
  canWeigh: boolean;
  canDose: boolean;
  canInspect: boolean;
  canStore: boolean;
  canElevate: boolean;
  connectsLevels: boolean;
  mobileEquipment: boolean;
  collisionRelevant: boolean;
  requiresTravelPath: boolean;
  buildingObstacle: boolean;
  safetyEquipment: boolean;
  instrumentation: boolean;
  visualModelPath: string;
  visualModelUnit: "m" | "mm";
  visualModelScaleMode: "metadata-box" | "model-units";
  rotationOffsetX: string;
  rotationOffsetY: string;
  rotationOffsetZ: string;
  positionOffsetXMm: string;
  positionOffsetYMm: string;
  positionOffsetZMm: string;
  centerOnFootprint: boolean;
  bottomOnFloor: boolean;
  preserveAspectRatio: boolean;
  forwardAxis: "x+" | "x-" | "z+" | "z-";
  upAxis: "y+" | "z+" | "x+";
  collisionEnvelopeEnabled: boolean;
  collisionWidthMm: string;
  collisionDepthMm: string;
  collisionHeightMm: string;
  collisionOffsetXMm: string;
  collisionOffsetYMm: string;
  collisionOffsetZMm: string;
  ataraIsProduct: boolean;
  ataraAtrId: string;
  ataraMachineCode: string;
  ataraProductFamilyCode: string;
  ataraPdnCode: string;
  ataraDisplayName: string;
  ataraRevision: string;
  ataraWeightKg: string;
  ataraOperatingWeightKg: string;
  ataraMaintenanceOpenWidthMm: string;
  ataraMaintenanceOpenDepthMm: string;
  ataraMaintenanceOpenHeightMm: string;
  ataraClearanceFrontMm: string;
  ataraClearanceBackMm: string;
  ataraClearanceLeftMm: string;
  ataraClearanceRightMm: string;
  ataraClearanceTopMm: string;
  ataraClearanceNotes: string;
  ataraCapacityMin: string;
  ataraCapacityNominal: string;
  ataraCapacityMax: string;
  ataraCapacityUnit: string;
  ataraProductTypes: string;
  ataraNoiseDb: string;
  ataraVibrationClass: string;
  ataraOperationalNotes: string;
  ataraElectricalPowerKw: string;
  ataraVoltage: string;
  ataraPhase: string;
  ataraFrequencyHz: string;
  ataraPneumaticPressureBar: string;
  ataraAirConsumptionNlMin: string;
  ataraNetworkProtocols: string;
  ataraAspirationRequired: boolean;
  ataraAspirationAirflowM3h: string;
  ataraUtilityNotes: string;
  ataraConnectionPointsJson: string;
};

const cloneLibrary = (library: LoadedMachineLibrary): MachineLibraryDocument => ({
  libraryId: library.libraryId,
  libraryName: library.libraryName,
  readonly: library.readonly,
  root: JSON.parse(JSON.stringify(library.root)) as LibraryGroup
});

const createEmptyGroup = (id: string, name: string): LibraryGroup => ({
  id,
  name,
  children: [],
  items: []
});

const makeSlug = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `group-${Date.now()}`;
};

const collectGroupIds = (group: LibraryGroup, ids = new Set<string>()) => {
  ids.add(group.id);
  group.children.forEach((child) => collectGroupIds(child, ids));
  return ids;
};

const collectItemIds = (group: LibraryGroup, ids = new Set<string>()) => {
  group.items.forEach((item) => ids.add(item.id));
  group.children.forEach((child) => collectItemIds(child, ids));
  return ids;
};

const collectDuplicateItemIds = (group: LibraryGroup, seen = new Set<string>(), duplicates = new Set<string>()) => {
  group.items.forEach((item) => {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  });
  group.children.forEach((child) => collectDuplicateItemIds(child, seen, duplicates));
  return duplicates;
};

const uniqueGroupId = (root: LibraryGroup, name: string) => {
  const ids = collectGroupIds(root);
  const base = makeSlug(name);
  let candidate = base;
  let index = 2;
  while (ids.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
};

const updateGroup = (
  group: LibraryGroup,
  groupId: string,
  updater: (group: LibraryGroup) => LibraryGroup
): LibraryGroup => {
  if (group.id === groupId) {
    return updater(group);
  }

  return {
    ...group,
    children: group.children.map((child) => updateGroup(child, groupId, updater))
  };
};

const deleteGroupById = (group: LibraryGroup, groupId: string): LibraryGroup => ({
  ...group,
  children: group.children
    .filter((child) => child.id !== groupId)
    .map((child) => deleteGroupById(child, groupId))
});

const deleteItemById = (group: LibraryGroup, itemId: string): LibraryGroup => ({
  ...group,
  items: group.items.filter((item) => item.id !== itemId),
  children: group.children.map((child) => deleteItemById(child, itemId))
});

const findGroup = (group: LibraryGroup, groupId: string): LibraryGroup | null => {
  if (group.id === groupId) {
    return group;
  }

  for (const child of group.children) {
    const result = findGroup(child, groupId);
    if (result) {
      return result;
    }
  }

  return null;
};

const findItem = (
  group: LibraryGroup,
  itemId: string
): { group: LibraryGroup; item: LibraryMachineItem } | null => {
  const item = group.items.find((candidate) => candidate.id === itemId);
  if (item) {
    return { group, item };
  }

  for (const child of group.children) {
    const result = findItem(child, itemId);
    if (result) {
      return result;
    }
  }

  return null;
};

const countItems = (group: LibraryGroup): number => {
  return group.items.length + group.children.reduce((total, child) => total + countItems(child), 0);
};

const toEditorState = (
  parentGroupId: string,
  item?: LibraryMachineItem
): ItemEditorState => {
  const dimensionsMm = item ? getMachineDimensionsMm({ ...item, category: item.type }) : null;
  const visualModel = item?.visualModel;
  const collisionEnvelope = item
    ? normalizeCollisionEnvelope(item.collisionEnvelope, dimensionsMm ?? { widthMm: 1000, depthMm: 1000, heightMm: 1000 })
    : null;
  const ataraData = normalizeAtaraMachineData(item?.ataraMachineData, dimensionsMm ?? undefined);
  const connectionPoints = ataraData?.connectionPoints ?? [];

  return {
    mode: item ? "edit" : "add",
    parentGroupId,
    originalId: item?.id,
    id: item?.id ?? "",
    name: item?.name ?? "",
  category: item?.category ?? "Custom",
  machineType: item?.machineType ?? item?.type ?? "Custom Machine",
  variant: item?.variant ?? "",
  productFamilyCode: item?.productFamilyCode ?? "",
  tags: item?.tags?.join(", ") ?? "",
  placeholderVisualType: item?.placeholderVisualType ?? inferPlaceholderVisualType(item?.category ?? "", item?.machineType ?? item?.type ?? ""),
    widthMm: dimensionsMm ? String(dimensionsMm.widthMm) : "1000",
    depthMm: dimensionsMm ? String(dimensionsMm.depthMm) : "1000",
    heightMm: dimensionsMm ? String(dimensionsMm.heightMm) : "1000",
    defaultColor: item?.defaultColor ?? "#7fc8ff",
    canConvey: item?.capabilities?.canConvey ?? false,
    canPalletize: item?.capabilities?.canPalletize ?? false,
    canWrap: item?.capabilities?.canWrap ?? false,
    hasFlowDirection: item?.capabilities?.hasFlowDirection ?? false,
    canWeigh: item?.capabilities?.canWeigh ?? false,
    canDose: item?.capabilities?.canDose ?? false,
    canInspect: item?.capabilities?.canInspect ?? false,
    canStore: item?.capabilities?.canStore ?? false,
    canElevate: item?.capabilities?.canElevate ?? false,
    connectsLevels: item?.capabilities?.connectsLevels ?? false,
    mobileEquipment: item?.capabilities?.mobileEquipment ?? false,
    collisionRelevant: item?.capabilities?.collisionRelevant ?? true,
    requiresTravelPath: item?.capabilities?.requiresTravelPath ?? false,
    buildingObstacle: item?.capabilities?.buildingObstacle ?? false,
    safetyEquipment: item?.capabilities?.safetyEquipment ?? false,
    instrumentation: item?.capabilities?.instrumentation ?? false,
    visualModelPath: visualModel?.modelPath ?? item?.modelPath ?? "",
    visualModelUnit: visualModel?.unit ?? "m",
    visualModelScaleMode: visualModel?.scaleMode ?? "metadata-box",
    rotationOffsetX: String(visualModel?.rotationOffsetDeg.x ?? 0),
    rotationOffsetY: String(visualModel?.rotationOffsetDeg.y ?? 0),
    rotationOffsetZ: String(visualModel?.rotationOffsetDeg.z ?? 0),
    positionOffsetXMm: String(visualModel?.positionOffsetMm.xMm ?? 0),
    positionOffsetYMm: String(visualModel?.positionOffsetMm.yMm ?? 0),
    positionOffsetZMm: String(visualModel?.positionOffsetMm.zMm ?? 0),
    centerOnFootprint: visualModel?.calibration.centerOnFootprint ?? true,
    bottomOnFloor: visualModel?.calibration.bottomOnFloor ?? true,
    preserveAspectRatio: visualModel?.calibration.preserveAspectRatio ?? true,
    forwardAxis: visualModel?.calibration.forwardAxis ?? "z+",
    upAxis: visualModel?.calibration.upAxis ?? "y+",
    collisionEnvelopeEnabled: collisionEnvelope?.enabled ?? true,
    collisionWidthMm: collisionEnvelope ? String(collisionEnvelope.widthMm) : "",
    collisionDepthMm: collisionEnvelope ? String(collisionEnvelope.depthMm) : "",
    collisionHeightMm: collisionEnvelope ? String(collisionEnvelope.heightMm) : "",
    collisionOffsetXMm: String(collisionEnvelope?.offsetMm?.xMm ?? 0),
    collisionOffsetYMm: String(collisionEnvelope?.offsetMm?.yMm ?? 0),
    collisionOffsetZMm: String(collisionEnvelope?.offsetMm?.zMm ?? 0),
    ataraIsProduct: ataraData?.identity?.isAtaraProduct ?? false,
    ataraAtrId: ataraData?.identity?.atrId ?? "",
    ataraMachineCode: ataraData?.identity?.machineCode ?? "",
    ataraProductFamilyCode: ataraData?.identity?.productFamilyCode ?? item?.productFamilyCode ?? "",
    ataraPdnCode: ataraData?.identity?.pdnCode ?? "",
    ataraDisplayName: ataraData?.identity?.displayName ?? "",
    ataraRevision: ataraData?.identity?.revision ?? "",
    ataraWeightKg: ataraData?.physical?.weightKg !== undefined ? String(ataraData.physical.weightKg) : "",
    ataraOperatingWeightKg: ataraData?.physical?.operatingWeightKg !== undefined ? String(ataraData.physical.operatingWeightKg) : "",
    ataraMaintenanceOpenWidthMm: ataraData?.physical?.maintenanceOpenDimensionsMm?.widthMm !== undefined ? String(ataraData.physical.maintenanceOpenDimensionsMm.widthMm) : "",
    ataraMaintenanceOpenDepthMm: ataraData?.physical?.maintenanceOpenDimensionsMm?.depthMm !== undefined ? String(ataraData.physical.maintenanceOpenDimensionsMm.depthMm) : "",
    ataraMaintenanceOpenHeightMm: ataraData?.physical?.maintenanceOpenDimensionsMm?.heightMm !== undefined ? String(ataraData.physical.maintenanceOpenDimensionsMm.heightMm) : "",
    ataraClearanceFrontMm: String(ataraData?.maintenanceClearance?.frontMm ?? 0),
    ataraClearanceBackMm: String(ataraData?.maintenanceClearance?.backMm ?? 0),
    ataraClearanceLeftMm: String(ataraData?.maintenanceClearance?.leftMm ?? 0),
    ataraClearanceRightMm: String(ataraData?.maintenanceClearance?.rightMm ?? 0),
    ataraClearanceTopMm: String(ataraData?.maintenanceClearance?.topMm ?? 0),
    ataraClearanceNotes: ataraData?.maintenanceClearance?.notes ?? "",
    ataraCapacityMin: ataraData?.operationalData?.capacityMin !== undefined ? String(ataraData.operationalData.capacityMin) : "",
    ataraCapacityNominal: ataraData?.operationalData?.capacityNominal !== undefined ? String(ataraData.operationalData.capacityNominal) : "",
    ataraCapacityMax: ataraData?.operationalData?.capacityMax !== undefined ? String(ataraData.operationalData.capacityMax) : "",
    ataraCapacityUnit: ataraData?.operationalData?.capacityUnit ?? "",
    ataraProductTypes: ataraData?.operationalData?.productTypes?.join(", ") ?? "",
    ataraNoiseDb: ataraData?.operationalData?.noiseDb !== undefined ? String(ataraData.operationalData.noiseDb) : "",
    ataraVibrationClass: ataraData?.operationalData?.vibrationClass ?? "",
    ataraOperationalNotes: ataraData?.operationalData?.notes ?? "",
    ataraElectricalPowerKw: ataraData?.utilityRequirements?.electrical?.powerKw !== undefined ? String(ataraData.utilityRequirements.electrical.powerKw) : "",
    ataraVoltage: ataraData?.utilityRequirements?.electrical?.voltage !== undefined ? String(ataraData.utilityRequirements.electrical.voltage) : "",
    ataraPhase: ataraData?.utilityRequirements?.electrical?.phase ?? "",
    ataraFrequencyHz: ataraData?.utilityRequirements?.electrical?.frequencyHz !== undefined ? String(ataraData.utilityRequirements.electrical.frequencyHz) : "",
    ataraPneumaticPressureBar: ataraData?.utilityRequirements?.pneumatic?.pressureBar !== undefined ? String(ataraData.utilityRequirements.pneumatic.pressureBar) : "",
    ataraAirConsumptionNlMin: ataraData?.utilityRequirements?.pneumatic?.airConsumptionNlMin !== undefined ? String(ataraData.utilityRequirements.pneumatic.airConsumptionNlMin) : "",
    ataraNetworkProtocols: ataraData?.utilityRequirements?.network?.protocols?.join(", ") ?? "",
    ataraAspirationRequired: ataraData?.utilityRequirements?.aspiration?.required ?? false,
    ataraAspirationAirflowM3h: ataraData?.utilityRequirements?.aspiration?.airflowM3h !== undefined ? String(ataraData.utilityRequirements.aspiration.airflowM3h) : "",
    ataraUtilityNotes: ataraData?.utilityRequirements?.electrical?.notes ?? ataraData?.utilityRequirements?.pneumatic?.notes ?? ataraData?.utilityRequirements?.network?.notes ?? ataraData?.utilityRequirements?.aspiration?.notes ?? "",
    ataraConnectionPointsJson: JSON.stringify(connectionPoints, null, 2)
  };
};

const optionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined;
};

const csvList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

const numericEditorKeys = new Set<keyof ItemEditorState>([
  "widthMm",
  "depthMm",
  "heightMm",
  "rotationOffsetX",
  "rotationOffsetY",
  "rotationOffsetZ",
  "positionOffsetXMm",
  "positionOffsetYMm",
  "positionOffsetZMm",
  "collisionWidthMm",
  "collisionDepthMm",
  "collisionHeightMm",
  "collisionOffsetXMm",
  "collisionOffsetYMm",
  "collisionOffsetZMm",
  "ataraWeightKg",
  "ataraOperatingWeightKg",
  "ataraMaintenanceOpenWidthMm",
  "ataraMaintenanceOpenDepthMm",
  "ataraMaintenanceOpenHeightMm",
  "ataraClearanceFrontMm",
  "ataraClearanceBackMm",
  "ataraClearanceLeftMm",
  "ataraClearanceRightMm",
  "ataraClearanceTopMm",
  "ataraCapacityMin",
  "ataraCapacityNominal",
  "ataraCapacityMax",
  "ataraNoiseDb",
  "ataraElectricalPowerKw",
  "ataraVoltage",
  "ataraFrequencyHz",
  "ataraPneumaticPressureBar",
  "ataraAirConsumptionNlMin",
  "ataraAspirationAirflowM3h"
]);

const csvEditorKeys = new Set<keyof ItemEditorState>([
  "tags",
  "ataraProductTypes",
  "ataraNetworkProtocols"
]);

const normalizeEditorString = (key: keyof ItemEditorState, value: string) => {
  const trimmed = value.trim();
  if (numericEditorKeys.has(key)) {
    if (!trimmed) {
      return "";
    }
    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? numericValue : trimmed;
  }
  if (csvEditorKeys.has(key)) {
    return csvList(trimmed);
  }
  return trimmed;
};

const normalizeConnectionPointsDraft = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return normalizeAtaraMachineData({ connectionPoints: parsed })?.connectionPoints ?? [];
  } catch {
    return trimmed;
  }
};

export const getItemEditorDirtyKey = (editor: ItemEditorState | null) => {
  if (!editor) {
    return "";
  }

  const normalizedEntries = (Object.entries(editor) as [keyof ItemEditorState, ItemEditorState[keyof ItemEditorState]][])
    .map(([key, value]) => {
      if (key === "ataraConnectionPointsJson") {
        return [key, normalizeConnectionPointsDraft(String(value))] as const;
      }
      if (typeof value === "string") {
        return [key, normalizeEditorString(key, value)] as const;
      }
      return [key, value] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));

  return JSON.stringify(normalizedEntries);
};

const buildAtaraMachineData = (
  editor: ItemEditorState,
  dimensionsMm: { widthMm: number; depthMm: number; heightMm: number }
): AtaraMachineData | undefined => {
  let connectionPoints: MachineConnectionPoint[] = [];
  const rawConnectionPoints = editor.ataraConnectionPointsJson.trim();
  if (rawConnectionPoints) {
    const parsed = JSON.parse(rawConnectionPoints) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("ATARA connection points must be a JSON array.");
    }
    connectionPoints = parsed as MachineConnectionPoint[];
  }

  const hasIdentity =
    editor.ataraIsProduct ||
    editor.ataraAtrId.trim() ||
    editor.ataraMachineCode.trim() ||
    editor.ataraProductFamilyCode.trim() ||
    editor.ataraPdnCode.trim() ||
    editor.ataraDisplayName.trim() ||
    editor.ataraRevision.trim();
  const hasEngineering =
    editor.ataraWeightKg.trim() ||
    editor.ataraOperatingWeightKg.trim() ||
    editor.ataraMaintenanceOpenWidthMm.trim() ||
    editor.ataraMaintenanceOpenDepthMm.trim() ||
    editor.ataraMaintenanceOpenHeightMm.trim();
  const hasClearance =
    Number(editor.ataraClearanceFrontMm) > 0 ||
    Number(editor.ataraClearanceBackMm) > 0 ||
    Number(editor.ataraClearanceLeftMm) > 0 ||
    Number(editor.ataraClearanceRightMm) > 0 ||
    Number(editor.ataraClearanceTopMm) > 0 ||
    editor.ataraClearanceNotes.trim();
  const hasOperational =
    editor.ataraCapacityMin.trim() ||
    editor.ataraCapacityNominal.trim() ||
    editor.ataraCapacityMax.trim() ||
    editor.ataraCapacityUnit.trim() ||
    editor.ataraProductTypes.trim() ||
    editor.ataraNoiseDb.trim() ||
    editor.ataraVibrationClass.trim() ||
    editor.ataraOperationalNotes.trim();
  const hasUtilities =
    editor.ataraElectricalPowerKw.trim() ||
    editor.ataraVoltage.trim() ||
    editor.ataraPhase.trim() ||
    editor.ataraFrequencyHz.trim() ||
    editor.ataraPneumaticPressureBar.trim() ||
    editor.ataraAirConsumptionNlMin.trim() ||
    editor.ataraNetworkProtocols.trim() ||
    editor.ataraAspirationRequired ||
    editor.ataraAspirationAirflowM3h.trim() ||
    editor.ataraUtilityNotes.trim();

  if (!hasIdentity && !hasEngineering && !hasClearance && !hasOperational && !hasUtilities && connectionPoints.length === 0) {
    return undefined;
  }

  return normalizeAtaraMachineData(
    {
      identity: hasIdentity
        ? {
            isAtaraProduct: editor.ataraIsProduct,
            atrId: editor.ataraAtrId,
            machineCode: editor.ataraMachineCode,
            productFamilyCode: editor.ataraProductFamilyCode,
            pdnCode: editor.ataraPdnCode,
            displayName: editor.ataraDisplayName,
            revision: editor.ataraRevision
          }
        : undefined,
      physical: hasEngineering
        ? {
            ...dimensionsMm,
            weightKg: optionalNumber(editor.ataraWeightKg),
            operatingWeightKg: optionalNumber(editor.ataraOperatingWeightKg),
            maintenanceOpenDimensionsMm: {
              widthMm: optionalNumber(editor.ataraMaintenanceOpenWidthMm),
              depthMm: optionalNumber(editor.ataraMaintenanceOpenDepthMm),
              heightMm: optionalNumber(editor.ataraMaintenanceOpenHeightMm)
            }
          }
        : undefined,
      maintenanceClearance: hasClearance
        ? {
            frontMm: optionalNumber(editor.ataraClearanceFrontMm) ?? 0,
            backMm: optionalNumber(editor.ataraClearanceBackMm) ?? 0,
            leftMm: optionalNumber(editor.ataraClearanceLeftMm) ?? 0,
            rightMm: optionalNumber(editor.ataraClearanceRightMm) ?? 0,
            topMm: optionalNumber(editor.ataraClearanceTopMm) ?? 0,
            notes: editor.ataraClearanceNotes
          }
        : undefined,
      operationalData: hasOperational
        ? {
            capacityMin: optionalNumber(editor.ataraCapacityMin),
            capacityNominal: optionalNumber(editor.ataraCapacityNominal),
            capacityMax: optionalNumber(editor.ataraCapacityMax),
            capacityUnit: editor.ataraCapacityUnit,
            productTypes: csvList(editor.ataraProductTypes),
            noiseDb: optionalNumber(editor.ataraNoiseDb),
            vibrationClass: editor.ataraVibrationClass,
            notes: editor.ataraOperationalNotes
          }
        : undefined,
      utilityRequirements: hasUtilities
        ? {
            electrical: {
              powerKw: optionalNumber(editor.ataraElectricalPowerKw),
              voltage: optionalNumber(editor.ataraVoltage),
              phase: editor.ataraPhase,
              frequencyHz: optionalNumber(editor.ataraFrequencyHz),
              notes: editor.ataraUtilityNotes
            },
            pneumatic: {
              pressureBar: optionalNumber(editor.ataraPneumaticPressureBar),
              airConsumptionNlMin: optionalNumber(editor.ataraAirConsumptionNlMin),
              notes: editor.ataraUtilityNotes
            },
            network: {
              protocols: csvList(editor.ataraNetworkProtocols),
              notes: editor.ataraUtilityNotes
            },
            aspiration: {
              required: editor.ataraAspirationRequired,
              airflowM3h: optionalNumber(editor.ataraAspirationAirflowM3h),
              notes: editor.ataraUtilityNotes
            }
          }
        : undefined,
      connectionPoints
    },
    dimensionsMm
  );
};

function ManagerTreeNode({
  group,
  depth,
  editable,
  selectedNode,
  onSelectGroup,
  onSelectItem,
  onAddChildGroup,
  onAddItem,
  onRenameGroup,
  onDeleteGroup
}: {
  group: LibraryGroup;
  depth: number;
  editable: boolean;
  selectedNode: SelectedNode | null;
  onSelectGroup: (groupId: string) => void;
  onSelectItem: (groupId: string, item: LibraryMachineItem) => void;
  onAddChildGroup: (groupId: string) => void;
  onAddItem: (groupId: string) => void;
  onRenameGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isRoot = depth === 0;
  const isSelected = selectedNode?.type === "group" && selectedNode.groupId === group.id;
  const itemCount = countItems(group);

  return (
    <div className="manager-tree-node">
      <div
        className={`manager-tree-row${isSelected ? " is-selected" : ""}`}
        style={{ "--tree-depth": depth } as CSSProperties}
      >
        <button className="manager-row-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "-" : "+"}
        </button>
        <button className="manager-tree-label" type="button" onClick={() => onSelectGroup(group.id)}>
          <strong>{group.name}</strong>
          <span>{itemCount} items</span>
        </button>
        {editable ? (
          <div className="manager-row-actions">
            <button type="button" onClick={() => onAddChildGroup(group.id)} title="Add Child Group">
              Group
            </button>
            <button
              data-testid={isRoot ? "library-manager-add-item-button" : undefined}
              type="button"
              onClick={() => onAddItem(group.id)}
              title="Add Item"
            >
              Item
            </button>
            {!isRoot ? (
              <>
                <button type="button" onClick={() => onRenameGroup(group.id)} title="Rename Group">
                  Rename
                </button>
                <button className="danger-action" type="button" onClick={() => onDeleteGroup(group.id)} title="Delete Group">
                  Delete
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="manager-tree-children">
          {group.children.map((child) => (
            <ManagerTreeNode
              depth={depth + 1}
              editable={editable}
              group={child}
              key={child.id}
              selectedNode={selectedNode}
              onSelectGroup={onSelectGroup}
              onSelectItem={onSelectItem}
              onAddChildGroup={onAddChildGroup}
              onAddItem={onAddItem}
              onRenameGroup={onRenameGroup}
              onDeleteGroup={onDeleteGroup}
            />
          ))}
          {group.items.map((item) => {
            const itemSelected = selectedNode?.type === "item" && selectedNode.itemId === item.id;
            return (
              <button
                className={`manager-item-row${itemSelected ? " is-selected" : ""}`}
                key={item.id}
                style={{ "--tree-depth": depth + 1 } as CSSProperties}
                type="button"
                onClick={() => onSelectItem(group.id, item)}
              >
                <span className="manager-item-color" style={{ backgroundColor: item.defaultColor }} aria-hidden="true" />
                <strong>{item.name}</strong>
                <span>{item.type}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LibraryManager({ libraries, taxonomyReloadToken, onClose, onLibrariesChanged }: LibraryManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState(PROJECT_CUSTOM_LIBRARY_ID);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [draftLibrary, setDraftLibrary] = useState<MachineLibraryDocument | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [itemEditorBaseline, setItemEditorBaseline] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [taxonomy, setTaxonomy] = useState<MachineTaxonomy | null>(null);

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.libraryId === selectedLibraryId) ?? libraries[0],
    [libraries, selectedLibraryId]
  );
  const editable = selectedLibrary?.libraryId === PROJECT_CUSTOM_LIBRARY_ID && !selectedLibrary.readonly;
  const activeRoot = editable ? draftLibrary?.root : selectedLibrary?.root;
  const selectedGroup =
    activeRoot && selectedNode?.type === "group" ? findGroup(activeRoot, selectedNode.groupId) : null;
  const selectedItem =
    activeRoot && selectedNode?.type === "item" ? findItem(activeRoot, selectedNode.itemId) : null;

  const clearItemEditor = () => {
    setItemEditor(null);
    setItemEditorBaseline("");
  };

  useEffect(() => {
    const customLibrary = libraries.find((library) => library.libraryId === PROJECT_CUSTOM_LIBRARY_ID);
    if (customLibrary) {
      setDraftLibrary(cloneLibrary(customLibrary));
    }
  }, [libraries]);

  useEffect(() => {
    if (activeRoot) {
      setSelectedNode({ type: "group", groupId: activeRoot.id });
      clearItemEditor();
      setValidationError("");
    }
  }, [activeRoot?.id, selectedLibraryId]);

  useEffect(() => {
    let cancelled = false;
    void loadMachineTaxonomy().then((loaded) => {
      if (!cancelled) {
        setTaxonomy(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [taxonomyReloadToken]);

  const machineTypeOptions = useMemo(
    () => {
      const categoryId = taxonomy?.categories.find((category) => category.name === itemEditor?.category)?.id;
      return taxonomy?.machineTypes.filter((type) => type.categoryId === categoryId) ?? [];
    },
    [itemEditor?.category, taxonomy?.categories, taxonomy?.machineTypes]
  );

  const persistLibrary = (library: MachineLibraryDocument, statusText: string) => {
    window.localStorage.setItem(CUSTOM_LIBRARY_STORAGE_KEY, JSON.stringify(library, null, 2));
    setDraftLibrary(library);
    setMessage(statusText);
    setValidationError("");
    onLibrariesChanged();
  };

  const requestClose = () => {
    if (getItemEditorDirtyKey(itemEditor) !== itemEditorBaseline) {
      const confirmed = window.confirm("Close Library Manager and discard the current item editor changes?");
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  const selectGroup = (groupId: string) => {
    if (getItemEditorDirtyKey(itemEditor) !== itemEditorBaseline) {
      const confirmed = window.confirm("Discard the current item editor changes?");
      if (!confirmed) {
        return;
      }
    }
    setSelectedNode({ type: "group", groupId });
    clearItemEditor();
    setValidationError("");
  };

  const selectItem = (groupId: string, item: LibraryMachineItem) => {
    if (getItemEditorDirtyKey(itemEditor) !== itemEditorBaseline) {
      const confirmed = window.confirm("Discard the current item editor changes?");
      if (!confirmed) {
        return;
      }
    }
    const nextEditor = toEditorState(groupId, item);
    setSelectedNode({ type: "item", groupId, itemId: item.id });
    setItemEditor(nextEditor);
    setItemEditorBaseline(getItemEditorDirtyKey(nextEditor));
    setValidationError("");
  };

  const addGroup = (parentGroupId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const name = window.prompt("Group name");
    if (!name?.trim()) {
      return;
    }

    const group = createEmptyGroup(uniqueGroupId(draftLibrary.root, name), name.trim());
    const nextLibrary = {
      ...draftLibrary,
      root: updateGroup(draftLibrary.root, parentGroupId, (target) => ({
        ...target,
        children: [...target.children, group]
      }))
    };
    persistLibrary(nextLibrary, `Group "${group.name}" added.`);
    setSelectedNode({ type: "group", groupId: group.id });
  };

  const renameGroup = (groupId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const group = findGroup(draftLibrary.root, groupId);
    const name = window.prompt("New group name", group?.name ?? "");
    if (!name?.trim()) {
      return;
    }

    const nextLibrary = {
      ...draftLibrary,
      root: updateGroup(draftLibrary.root, groupId, (target) => ({
        ...target,
        name: name.trim()
      }))
    };
    persistLibrary(nextLibrary, "Group renamed.");
    setSelectedNode({ type: "group", groupId });
  };

  const deleteGroup = (groupId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const group = findGroup(draftLibrary.root, groupId);
    if (!group || group.id === draftLibrary.root.id) {
      return;
    }

    const hasContent = group.children.length > 0 || group.items.length > 0;
    const confirmed = window.confirm(
      hasContent
        ? `Delete "${group.name}" and all child groups/items inside it?`
        : `Delete "${group.name}"?`
    );
    if (!confirmed) {
      return;
    }

    persistLibrary(
      {
        ...draftLibrary,
        root: deleteGroupById(draftLibrary.root, groupId)
      },
      "Group deleted."
    );
    setSelectedNode({ type: "group", groupId: draftLibrary.root.id });
  };

  const deleteItem = (itemId: string) => {
    if (!editable || !draftLibrary) {
      return;
    }

    const confirmed = window.confirm(`Delete machine item "${itemId}"?`);
    if (!confirmed) {
      return;
    }

    persistLibrary(
      {
        ...draftLibrary,
        root: deleteItemById(draftLibrary.root, itemId)
      },
      "Machine item deleted."
    );
    clearItemEditor();
    setSelectedNode({ type: "group", groupId: draftLibrary.root.id });
  };

  const startAddItem = (groupId: string) => {
    if (!editable) {
      return;
    }
    if (getItemEditorDirtyKey(itemEditor) !== itemEditorBaseline) {
      const confirmed = window.confirm("Discard the current item editor changes?");
      if (!confirmed) {
        return;
      }
    }
    const nextEditor = toEditorState(groupId);
    setSelectedNode({ type: "group", groupId });
    setItemEditor(nextEditor);
    setItemEditorBaseline(getItemEditorDirtyKey(nextEditor));
    setValidationError("");
  };

  const saveItem = () => {
    if (!editable || !draftLibrary || !itemEditor) {
      return;
    }

    const widthMm = Number(itemEditor.widthMm);
    const depthMm = Number(itemEditor.depthMm);
    const heightMm = Number(itemEditor.heightMm);
    const rotationOffsetX = Number(itemEditor.rotationOffsetX);
    const rotationOffsetY = Number(itemEditor.rotationOffsetY);
    const rotationOffsetZ = Number(itemEditor.rotationOffsetZ);
    const positionOffsetXMm = Number(itemEditor.positionOffsetXMm);
    const positionOffsetYMm = Number(itemEditor.positionOffsetYMm);
    const positionOffsetZMm = Number(itemEditor.positionOffsetZMm);
    const collisionWidthMm = itemEditor.collisionWidthMm.trim() ? Number(itemEditor.collisionWidthMm) : widthMm;
    const collisionDepthMm = itemEditor.collisionDepthMm.trim() ? Number(itemEditor.collisionDepthMm) : depthMm;
    const collisionHeightMm = itemEditor.collisionHeightMm.trim() ? Number(itemEditor.collisionHeightMm) : heightMm;
    const collisionOffsetXMm = Number(itemEditor.collisionOffsetXMm);
    const collisionOffsetYMm = Number(itemEditor.collisionOffsetYMm);
    const collisionOffsetZMm = Number(itemEditor.collisionOffsetZMm);
    const ids = collectItemIds(draftLibrary.root);
    if (itemEditor.originalId) {
      ids.delete(itemEditor.originalId);
    }

    if (!itemEditor.id.trim()) {
      setValidationError("Machine item id is required.");
      return;
    }
    if (!itemEditor.name.trim()) {
      setValidationError("Machine item name is required.");
      return;
    }
    if (!itemEditor.category.trim()) {
      setValidationError("Machine category is required.");
      return;
    }
    if (!itemEditor.machineType.trim()) {
      setValidationError("Machine type is required.");
      return;
    }
    if (
      !Number.isFinite(widthMm) ||
      widthMm <= 0 ||
      !Number.isFinite(depthMm) ||
      depthMm <= 0 ||
      !Number.isFinite(heightMm) ||
      heightMm <= 0
    ) {
      setValidationError("Width, depth, and height must be positive millimeter values.");
      return;
    }
    if (ids.has(itemEditor.id.trim())) {
      setValidationError("Machine item id must be unique inside Project Custom Library.");
      return;
    }
    if (
      !Number.isFinite(rotationOffsetX) ||
      !Number.isFinite(rotationOffsetY) ||
      !Number.isFinite(rotationOffsetZ) ||
      !Number.isFinite(positionOffsetXMm) ||
      !Number.isFinite(positionOffsetYMm) ||
      !Number.isFinite(positionOffsetZMm)
    ) {
      setValidationError("Visual model offsets must be valid numbers.");
      return;
    }
    if (
      !Number.isFinite(collisionWidthMm) ||
      collisionWidthMm <= 0 ||
      !Number.isFinite(collisionDepthMm) ||
      collisionDepthMm <= 0 ||
      !Number.isFinite(collisionHeightMm) ||
      collisionHeightMm <= 0 ||
      !Number.isFinite(collisionOffsetXMm) ||
      !Number.isFinite(collisionOffsetYMm) ||
      !Number.isFinite(collisionOffsetZMm)
    ) {
      setValidationError("Collision envelope dimensions must be positive and offsets must be valid millimeter values.");
      return;
    }

    const visualModelPath = itemEditor.visualModelPath.trim();
    let ataraMachineData: AtaraMachineData | undefined;
    try {
      ataraMachineData = buildAtaraMachineData(itemEditor, { widthMm, depthMm, heightMm });
    } catch (caught) {
      setValidationError(caught instanceof Error ? caught.message : "ATARA machine data could not be saved.");
      return;
    }

    const item: LibraryMachineItem = {
      id: itemEditor.id.trim(),
      name: itemEditor.name.trim(),
      type: itemEditor.machineType.trim(),
      category: itemEditor.category.trim(),
      machineType: itemEditor.machineType.trim(),
      variant: itemEditor.variant.trim(),
      productFamilyCode: itemEditor.productFamilyCode.trim().toUpperCase(),
      tags: normalizeTags(itemEditor.tags),
      placeholderVisualType: itemEditor.placeholderVisualType || inferPlaceholderVisualType(itemEditor.category, itemEditor.machineType),
      widthMm,
      depthMm,
      heightMm,
      width: mmToMeters(widthMm),
      depth: mmToMeters(depthMm),
      height: mmToMeters(heightMm),
      defaultColor: itemEditor.defaultColor || "#7fc8ff",
      modelPath: visualModelPath || null,
      visualModel: {
        modelPath: visualModelPath || null,
        unit: itemEditor.visualModelUnit,
        scaleMode: itemEditor.visualModelScaleMode,
        rotationOffsetDeg: {
          x: rotationOffsetX,
          y: rotationOffsetY,
          z: rotationOffsetZ
        },
        positionOffsetMm: {
          xMm: positionOffsetXMm,
          yMm: positionOffsetYMm,
          zMm: positionOffsetZMm
        },
        calibration: {
          centerOnFootprint: itemEditor.centerOnFootprint,
          bottomOnFloor: itemEditor.bottomOnFloor,
          preserveAspectRatio: itemEditor.preserveAspectRatio,
          forwardAxis: itemEditor.forwardAxis,
          upAxis: itemEditor.upAxis
        }
      },
      thumbnailPath: null,
      connectionPoints: [],
      clearance: {
        front: 0,
        back: 0,
        left: 0,
        right: 0
      },
      collisionEnvelope: normalizeCollisionEnvelope(
        {
          widthMm: collisionWidthMm,
          depthMm: collisionDepthMm,
          heightMm: collisionHeightMm,
          offsetMm: {
            xMm: collisionOffsetXMm,
            yMm: collisionOffsetYMm,
            zMm: collisionOffsetZMm
          },
          enabled: itemEditor.collisionEnvelopeEnabled
        },
        { widthMm, depthMm, heightMm }
      ),
      ...(ataraMachineData ? { ataraMachineData } : {}),
      capabilities: {
        canConvey: itemEditor.canConvey,
        canPalletize: itemEditor.canPalletize,
        canWrap: itemEditor.canWrap,
        hasFlowDirection: itemEditor.hasFlowDirection,
        canWeigh: itemEditor.canWeigh,
        canDose: itemEditor.canDose,
        canInspect: itemEditor.canInspect,
        canStore: itemEditor.canStore,
        canElevate: itemEditor.canElevate,
        connectsLevels: itemEditor.connectsLevels,
        mobileEquipment: itemEditor.mobileEquipment,
        collisionRelevant: itemEditor.collisionRelevant,
        requiresTravelPath: itemEditor.requiresTravelPath,
        buildingObstacle: itemEditor.buildingObstacle,
        safetyEquipment: itemEditor.safetyEquipment,
        instrumentation: itemEditor.instrumentation
      }
    };

    const rootWithoutOldItem = itemEditor.originalId
      ? deleteItemById(draftLibrary.root, itemEditor.originalId)
      : draftLibrary.root;
    const nextLibrary = {
      ...draftLibrary,
      root: updateGroup(rootWithoutOldItem, itemEditor.parentGroupId, (group) => ({
        ...group,
        items: [...group.items, item]
      }))
    };

    persistLibrary(nextLibrary, `Machine item "${item.name}" saved.`);
    setSelectedNode({ type: "item", groupId: itemEditor.parentGroupId, itemId: item.id });
    clearItemEditor();
  };

  const exportCustomLibrary = () => {
    if (!draftLibrary) {
      return;
    }

    const blob = new Blob([JSON.stringify(draftLibrary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-custom.library.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importCustomLibrary = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const { library, warnings } = validateProjectCustomLibraryDocument(parsed);
      if (warnings.some((warning) => warning.message.includes("was skipped"))) {
        setValidationError("Imported library contains invalid groups or items. Check console for details.");
        return;
      }
      if (collectDuplicateItemIds(library.root).size > 0) {
        setValidationError("Imported library contains duplicate machine item ids.");
        return;
      }

      const confirmed = window.confirm("Replace the current Project Custom Library with this imported library?");
      if (!confirmed) {
        return;
      }

      const importedLibrary = {
        libraryId: PROJECT_CUSTOM_LIBRARY_ID,
        libraryName: "Project Custom Library",
        readonly: false,
        root: library.root
      };
      persistLibrary(importedLibrary, "Custom library imported.");
      clearItemEditor();
      setSelectedNode({ type: "group", groupId: importedLibrary.root.id });
    } catch {
      setValidationError("Could not import custom library JSON.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const resetCustomLibrary = () => {
    const confirmed = window.confirm("Reset Project Custom Library to the default file version?");
    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(CUSTOM_LIBRARY_STORAGE_KEY);
    clearItemEditor();
    setMessage("Custom library reset.");
    setValidationError("");
    onLibrariesChanged();
  };

  const modal = (
    <div className="manager-backdrop" role="presentation">
      <section className="manager-dialog" data-testid="library-manager-modal" role="dialog" aria-modal="true" aria-label="Library Manager">
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Library Manager</h2>
          </div>
          <div className="manager-context">
            <strong>{selectedLibrary?.libraryName ?? "No library"}</strong>
            <span className={`manager-mode-badge${editable ? " is-editable" : ""}`}>
              {editable ? "Editable" : "Read-only"}
            </span>
          </div>
          <button data-testid="close-library-manager" type="button" onClick={requestClose}>
            Close
          </button>
        </header>

        <div className="manager-layout">
          <aside className="manager-library-list" aria-label="Available libraries">
            {libraries.map((library) => (
              <button
                className={library.libraryId === selectedLibraryId ? "is-selected" : ""}
                data-testid={library.libraryId === PROJECT_CUSTOM_LIBRARY_ID ? "library-manager-custom-library-selector" : undefined}
                key={library.libraryId}
                type="button"
                onClick={() => setSelectedLibraryId(library.libraryId)}
              >
                <strong>{library.libraryName}</strong>
                <span>{library.readonly ? "Read-only" : "Editable"}</span>
              </button>
            ))}
          </aside>

          <section className="manager-tree-panel" data-testid="library-manager-tree-panel" aria-label="Library group and item tree">
            <div className="manager-column-header">
              <span>Library Tree</span>
              {activeRoot ? <strong>{countItems(activeRoot)} items</strong> : null}
            </div>
            {!editable ? <p className="manager-readonly-note">This library is read-only.</p> : null}
            {activeRoot ? (
              <div className="manager-tree">
                <ManagerTreeNode
                  depth={0}
                  editable={editable}
                  group={activeRoot}
                  selectedNode={selectedNode}
                  onSelectGroup={selectGroup}
                  onSelectItem={selectItem}
                  onAddChildGroup={addGroup}
                  onAddItem={startAddItem}
                  onRenameGroup={renameGroup}
                  onDeleteGroup={deleteGroup}
                />
              </div>
            ) : (
              <p className="empty-selection">No library tree is available.</p>
            )}
          </section>

          <section className="manager-detail-panel" aria-label="Library details and editor">
            <div className="manager-column-header">
              <span>Details</span>
              <strong>{itemEditor ? (itemEditor.mode === "add" ? "New Item" : "Machine Item") : "Selection"}</strong>
            </div>
            {message ? <p className="manager-status">{message}</p> : null}
            {validationError ? <p className="manager-validation">{validationError}</p> : null}

            {!selectedLibrary ? (
              <p className="empty-selection">No libraries are loaded.</p>
            ) : itemEditor ? (
              <div className="manager-editor" data-testid="library-manager-selected-item-editor" aria-label="Machine item editor">
                <div className="manager-editor-grid">
                  <label>
                    <span>ID</span>
                    <input
                      disabled={!editable}
                      value={itemEditor.id}
                      onChange={(event) => setItemEditor({ ...itemEditor, id: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Name</span>
                    <input
                      disabled={!editable}
                      value={itemEditor.name}
                      onChange={(event) => setItemEditor({ ...itemEditor, name: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Category</span>
                    <select
                      disabled={!editable}
                      value={itemEditor.category}
                      onChange={(event) => {
                        const category = event.target.value;
                        const categoryId = taxonomy?.categories.find((item) => item.name === category)?.id;
                        const firstType = taxonomy?.machineTypes.find((type) => type.categoryId === categoryId);
                        setItemEditor({
                          ...itemEditor,
                          category,
                          machineType: firstType?.name ?? "Custom Machine",
                          placeholderVisualType: inferPlaceholderVisualType(category, firstType?.name ?? "")
                        });
                      }}
                    >
                      {(taxonomy?.categories ?? []).map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Machine Type</span>
                    <input
                      disabled={!editable}
                      list="taxonomy-machine-types"
                      value={itemEditor.machineType}
                      onChange={(event) =>
                        setItemEditor({
                          ...itemEditor,
                          machineType: event.target.value,
                          placeholderVisualType: inferPlaceholderVisualType(itemEditor.category, event.target.value)
                        })
                      }
                    />
                    <datalist id="taxonomy-machine-types">
                      {machineTypeOptions.map((type) => (
                        <option key={type.id} value={type.name} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    <span>Variant</span>
                    <input
                      disabled={!editable}
                      value={itemEditor.variant}
                      onChange={(event) => setItemEditor({ ...itemEditor, variant: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Product Family Code</span>
                    <select
                      disabled={!editable}
                      value={itemEditor.productFamilyCode}
                      onChange={(event) => setItemEditor({ ...itemEditor, productFamilyCode: event.target.value })}
                    >
                      <option value="">None</option>
                      {(taxonomy?.productFamilyCodes ?? []).map((family) => (
                        <option key={family.code} value={family.code}>
                          {family.code} - {family.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Placeholder Visual</span>
                    <select
                      disabled={!editable}
                      value={itemEditor.placeholderVisualType}
                      onChange={(event) => setItemEditor({ ...itemEditor, placeholderVisualType: event.target.value })}
                    >
                      {(taxonomy?.placeholderVisualTypes ?? []).map((placeholder) => (
                        <option key={placeholder.id} value={placeholder.id}>
                          {placeholder.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tags</span>
                    <input
                      disabled={!editable}
                      placeholder="comma, separated, tags"
                      value={itemEditor.tags}
                      onChange={(event) => setItemEditor({ ...itemEditor, tags: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Width (mm)</span>
                    <input
                      disabled={!editable}
                      type="number"
                      step="1"
                      value={itemEditor.widthMm}
                      onChange={(event) => setItemEditor({ ...itemEditor, widthMm: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Depth (mm)</span>
                    <input
                      disabled={!editable}
                      type="number"
                      step="1"
                      value={itemEditor.depthMm}
                      onChange={(event) => setItemEditor({ ...itemEditor, depthMm: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Height (mm)</span>
                    <input
                      disabled={!editable}
                      type="number"
                      step="1"
                      value={itemEditor.heightMm}
                      onChange={(event) => setItemEditor({ ...itemEditor, heightMm: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Color</span>
                    <input
                      disabled={!editable}
                      type="color"
                      value={itemEditor.defaultColor}
                      onChange={(event) => setItemEditor({ ...itemEditor, defaultColor: event.target.value })}
                    />
                  </label>
                </div>
                <details className="manager-visual-model" data-testid="atara-machine-data-section">
                  <summary>ATARA Identity</summary>
                  <div className="manager-capabilities">
                    <label>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor.ataraIsProduct}
                        onChange={(event) => setItemEditor({ ...itemEditor, ataraIsProduct: event.target.checked })}
                      />
                      <span>Is ATARA Product</span>
                    </label>
                  </div>
                  <div className="manager-editor-grid">
                    {([
                      ["ataraAtrId", "ATR ID"],
                      ["ataraMachineCode", "Machine Code"],
                      ["ataraProductFamilyCode", "Product Family Code"],
                      ["ataraPdnCode", "PDN Code"],
                      ["ataraDisplayName", "Display Name"],
                      ["ataraRevision", "Revision"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <details className="manager-visual-model">
                  <summary>Engineering Data</summary>
                  <div className="manager-editor-grid">
                    {([
                      ["ataraWeightKg", "Weight (kg)"],
                      ["ataraOperatingWeightKg", "Operating Weight (kg)"],
                      ["ataraMaintenanceOpenWidthMm", "Maintenance Open Width (mm)"],
                      ["ataraMaintenanceOpenDepthMm", "Maintenance Open Depth (mm)"],
                      ["ataraMaintenanceOpenHeightMm", "Maintenance Open Height (mm)"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          type="number"
                          step="1"
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <details className="manager-visual-model">
                  <summary>Maintenance Clearance</summary>
                  <div className="manager-editor-grid">
                    {([
                      ["ataraClearanceFrontMm", "Front (mm)"],
                      ["ataraClearanceBackMm", "Back (mm)"],
                      ["ataraClearanceLeftMm", "Left (mm)"],
                      ["ataraClearanceRightMm", "Right (mm)"],
                      ["ataraClearanceTopMm", "Top (mm)"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          type="number"
                          step="1"
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                    <label>
                      <span>Notes</span>
                      <input
                        disabled={!editable}
                        value={itemEditor.ataraClearanceNotes}
                        onChange={(event) => setItemEditor({ ...itemEditor, ataraClearanceNotes: event.target.value })}
                      />
                    </label>
                  </div>
                </details>
                <details className="manager-visual-model">
                  <summary>Operational Data</summary>
                  <div className="manager-editor-grid">
                    {([
                      ["ataraCapacityMin", "Capacity Min"],
                      ["ataraCapacityNominal", "Capacity Nominal"],
                      ["ataraCapacityMax", "Capacity Max"],
                      ["ataraNoiseDb", "Noise (dB)"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          type="number"
                          step="1"
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                    {([
                      ["ataraCapacityUnit", "Capacity Unit"],
                      ["ataraProductTypes", "Product Types"],
                      ["ataraVibrationClass", "Vibration Class"],
                      ["ataraOperationalNotes", "Notes"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          placeholder={key === "ataraProductTypes" ? "comma, separated" : undefined}
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <details className="manager-visual-model">
                  <summary>Utility Requirements</summary>
                  <div className="manager-capabilities">
                    <label>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor.ataraAspirationRequired}
                        onChange={(event) => setItemEditor({ ...itemEditor, ataraAspirationRequired: event.target.checked })}
                      />
                      <span>Aspiration Required</span>
                    </label>
                  </div>
                  <div className="manager-editor-grid">
                    {([
                      ["ataraElectricalPowerKw", "Electrical Power (kW)"],
                      ["ataraVoltage", "Voltage"],
                      ["ataraFrequencyHz", "Frequency (Hz)"],
                      ["ataraPneumaticPressureBar", "Pneumatic Pressure (bar)"],
                      ["ataraAirConsumptionNlMin", "Air Consumption (Nl/min)"],
                      ["ataraAspirationAirflowM3h", "Aspiration Airflow (m3/h)"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          type="number"
                          step="0.1"
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                    {([
                      ["ataraPhase", "Phase"],
                      ["ataraNetworkProtocols", "Network Protocols"],
                      ["ataraUtilityNotes", "Notes"]
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          disabled={!editable}
                          placeholder={key === "ataraNetworkProtocols" ? "comma, separated" : undefined}
                          value={itemEditor[key]}
                          onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <details className="manager-visual-model">
                  <summary>Connection Points</summary>
                  <label>
                    <span>Connection Points JSON</span>
                    <textarea
                      disabled={!editable}
                      value={itemEditor.ataraConnectionPointsJson}
                      onChange={(event) => setItemEditor({ ...itemEditor, ataraConnectionPointsJson: event.target.value })}
                    />
                  </label>
                </details>
                <details className="manager-visual-model" open>
                  <summary>Visual Model</summary>
                  <div className="manager-editor-grid">
                    <label>
                      <span>Model Path</span>
                      <input
                        disabled={!editable}
                        placeholder="/library/models/example.glb"
                        value={itemEditor.visualModelPath}
                        onChange={(event) => setItemEditor({ ...itemEditor, visualModelPath: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Model Unit</span>
                      <select
                        disabled={!editable}
                        value={itemEditor.visualModelUnit}
                        onChange={(event) =>
                          setItemEditor({ ...itemEditor, visualModelUnit: event.target.value === "mm" ? "mm" : "m" })
                        }
                      >
                        <option value="m">Meters</option>
                        <option value="mm">Millimeters</option>
                      </select>
                    </label>
                    <label>
                      <span>Scale Mode</span>
                      <select
                        disabled={!editable}
                        value={itemEditor.visualModelScaleMode}
                        onChange={(event) =>
                          setItemEditor({
                            ...itemEditor,
                            visualModelScaleMode:
                              event.target.value === "model-units" ? "model-units" : "metadata-box"
                          })
                        }
                      >
                        <option value="metadata-box">Metadata Box</option>
                        <option value="model-units">Model Units</option>
                      </select>
                    </label>
                    <label>
                      <span>Rotation X (°)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.rotationOffsetX}
                        onChange={(event) => setItemEditor({ ...itemEditor, rotationOffsetX: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Rotation Y (°)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.rotationOffsetY}
                        onChange={(event) => setItemEditor({ ...itemEditor, rotationOffsetY: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Rotation Z (°)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.rotationOffsetZ}
                        onChange={(event) => setItemEditor({ ...itemEditor, rotationOffsetZ: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset X (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.positionOffsetXMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, positionOffsetXMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset Y (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.positionOffsetYMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, positionOffsetYMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset Z (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.positionOffsetZMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, positionOffsetZMm: event.target.value })}
                      />
                    </label>
                  </div>
                </details>
                <details className="manager-visual-model" data-testid="visual-model-calibration-section" open>
                  <summary>Visual Model Calibration</summary>
                  <div className="manager-capabilities">
                    <label>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor.centerOnFootprint}
                        onChange={(event) => setItemEditor({ ...itemEditor, centerOnFootprint: event.target.checked })}
                      />
                      <span>Center on Footprint</span>
                    </label>
                    <label>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor.bottomOnFloor}
                        onChange={(event) => setItemEditor({ ...itemEditor, bottomOnFloor: event.target.checked })}
                      />
                      <span>Bottom on Floor</span>
                    </label>
                    <label>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor.preserveAspectRatio}
                        onChange={(event) => setItemEditor({ ...itemEditor, preserveAspectRatio: event.target.checked })}
                      />
                      <span>Preserve Aspect Ratio</span>
                    </label>
                  </div>
                  <div className="manager-editor-grid">
                    <label>
                      <span>Forward Axis</span>
                      <select
                        disabled={!editable}
                        value={itemEditor.forwardAxis}
                        onChange={(event) =>
                          setItemEditor({
                            ...itemEditor,
                            forwardAxis: event.target.value as "x+" | "x-" | "z+" | "z-"
                          })
                        }
                      >
                        <option value="x+">X+</option>
                        <option value="x-">X-</option>
                        <option value="z+">Z+</option>
                        <option value="z-">Z-</option>
                      </select>
                    </label>
                    <label>
                      <span>Up Axis</span>
                      <select
                        disabled={!editable}
                        value={itemEditor.upAxis}
                        onChange={(event) =>
                          setItemEditor({
                            ...itemEditor,
                            upAxis: event.target.value as "y+" | "z+" | "x+"
                          })
                        }
                      >
                        <option value="y+">Y+</option>
                        <option value="z+">Z+</option>
                        <option value="x+">X+</option>
                      </select>
                    </label>
                  </div>
                </details>
                <details className="manager-visual-model" data-testid="collision-envelope-editor-section">
                  <summary>Collision Envelope</summary>
                  <div className="manager-capabilities">
                    <label>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor.collisionEnvelopeEnabled}
                        onChange={(event) =>
                          setItemEditor({ ...itemEditor, collisionEnvelopeEnabled: event.target.checked })
                        }
                      />
                      <span>Enable Collision Envelope</span>
                    </label>
                  </div>
                  <div className="manager-editor-grid">
                    <label>
                      <span>Collision Width (mm)</span>
                      <input
                        disabled={!editable}
                        placeholder={itemEditor.widthMm}
                        type="number"
                        step="1"
                        value={itemEditor.collisionWidthMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, collisionWidthMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Collision Depth (mm)</span>
                      <input
                        disabled={!editable}
                        placeholder={itemEditor.depthMm}
                        type="number"
                        step="1"
                        value={itemEditor.collisionDepthMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, collisionDepthMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Collision Height (mm)</span>
                      <input
                        disabled={!editable}
                        placeholder={itemEditor.heightMm}
                        type="number"
                        step="1"
                        value={itemEditor.collisionHeightMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, collisionHeightMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset X (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.collisionOffsetXMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, collisionOffsetXMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset Y / Elevation Offset (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.collisionOffsetYMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, collisionOffsetYMm: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Offset Z / Plan Y Offset (mm)</span>
                      <input
                        disabled={!editable}
                        type="number"
                        step="1"
                        value={itemEditor.collisionOffsetZMm}
                        onChange={(event) => setItemEditor({ ...itemEditor, collisionOffsetZMm: event.target.value })}
                      />
                    </label>
                  </div>
                </details>
                <div className="manager-capabilities">
                  {([
                    "canConvey",
                    "canPalletize",
                    "canWrap",
                    "hasFlowDirection",
                    "canWeigh",
                    "canDose",
                    "canInspect",
                    "canStore",
                    "canElevate",
                    "connectsLevels",
                    "mobileEquipment",
                    "collisionRelevant",
                    "requiresTravelPath",
                    "buildingObstacle",
                    "safetyEquipment",
                    "instrumentation"
                  ] as const).map((key) => (
                    <label key={key}>
                      <input
                        disabled={!editable}
                        type="checkbox"
                        checked={itemEditor[key]}
                        onChange={(event) => setItemEditor({ ...itemEditor, [key]: event.target.checked })}
                      />
                      <span>{key}</span>
                    </label>
                  ))}
                </div>
                <div className="manager-editor-actions">
                  <button className="primary-action" disabled={!editable} type="button" onClick={saveItem}>
                    Save Item
                  </button>
                  <button type="button" onClick={clearItemEditor}>
                    Cancel
                  </button>
                  {itemEditor.mode === "edit" && itemEditor.originalId ? (
                    <button
                      className="danger-action"
                      disabled={!editable}
                      type="button"
                      onClick={() => deleteItem(itemEditor.originalId ?? "")}
                    >
                      Delete Item
                    </button>
                  ) : null}
                </div>
              </div>
            ) : selectedGroup ? (
              <div className="manager-detail-card">
                <span>Group</span>
                <h3>{selectedGroup.name}</h3>
                <p>{countItems(selectedGroup)} machine item{countItems(selectedGroup) === 1 ? "" : "s"} in this group.</p>
                {!editable ? <p className="manager-readonly-note">This library is read-only.</p> : null}
                <div className="manager-detail-actions">
                  <button className="primary-action" disabled={!editable} type="button" onClick={() => addGroup(selectedGroup.id)}>
                    Add Child Group
                  </button>
                  <button disabled={!editable} type="button" onClick={() => startAddItem(selectedGroup.id)}>
                    Add Item
                  </button>
                  <button disabled={!editable || selectedGroup.id === activeRoot?.id} type="button" onClick={() => renameGroup(selectedGroup.id)}>
                    Rename
                  </button>
                  <button
                    className="danger-action"
                    disabled={!editable || selectedGroup.id === activeRoot?.id}
                    type="button"
                    onClick={() => deleteGroup(selectedGroup.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : selectedItem ? (
              <div className="manager-detail-card">
                <span>Machine Item</span>
                <h3>{selectedItem.item.name}</h3>
                <p>
                  {(() => {
                    const dimensionsMm = getMachineDimensionsMm({
                      ...selectedItem.item,
                      category: selectedItem.item.type
                    });
                    return `${dimensionsMm.widthMm} x ${dimensionsMm.depthMm} x ${dimensionsMm.heightMm} mm`;
                  })()}
                </p>
                <button type="button" onClick={() => selectItem(selectedItem.group.id, selectedItem.item)}>
                  Open Editor
                </button>
              </div>
            ) : (
              <p className="empty-selection">Select a group or machine item to view details.</p>
            )}
          </section>
        </div>

        <footer className="manager-footer">
          <div className="manager-footer-left">
            <button disabled={!editable || !draftLibrary} type="button" onClick={exportCustomLibrary}>
              Export Custom Library
            </button>
            <button disabled={!editable || !draftLibrary} type="button" onClick={() => fileInputRef.current?.click()}>
              Import Custom Library
            </button>
            <input
              className="file-input"
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importCustomLibrary(file);
                }
              }}
            />
          </div>
          <div className="manager-footer-right">
            <button className="danger-action" disabled={!editable || !draftLibrary} type="button" onClick={resetCustomLibrary}>
              Reset Custom Library
            </button>
            <button type="button" onClick={requestClose}>
              Close
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
