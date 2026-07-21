import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AppShell } from "./components/AppShell";
import { BabylonScene, type BabylonSceneHandle } from "./components/BabylonScene";
import { AssemblyTreePanel } from "./components/AssemblyTreePanel";
import { CollisionCheckPanel } from "./components/CollisionCheckPanel";
import { ConnectionPointSnapPanel } from "./components/ConnectionPointSnapPanel";
import { CivilReferencePanel } from "./components/CivilReferencePanel";
import { CivilReferenceProperties } from "./components/CivilReferenceProperties";
import { AnnotationsPanel } from "./components/AnnotationsPanel";
import { DisplayOverlayControls } from "./components/DisplayOverlayControls";
import { AlignmentToolsPanel } from "./components/AlignmentToolsPanel";
import { LayoutControls } from "./components/LayoutControls";
import { LayersPanel } from "./components/LayersPanel";
import { MachineLibrary } from "./components/MachineLibrary";
import { MachineProperties } from "./components/MachineProperties";
import { MultiSelectionProperties } from "./components/MultiSelectionProperties";
import { PanelSection } from "./components/PanelSection";
import { PrecisionPlacementPanel } from "./components/PrecisionPlacementPanel";
import { PerformanceBenchmarkModal } from "./components/PerformanceBenchmarkModal";
import { ProjectManager } from "./components/ProjectManager";
import { SimulationControls } from "./components/SimulationControls";
import { ViewpointsPanel } from "./components/ViewpointsPanel";
import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "./types/machine";
import type { AlignmentAction, DistributionAction, EqualGapAction, FootprintAnchor, PairAlignmentAction } from "./types/alignment";
import type { NudgeSettings, SelectionMode } from "./types/selection";
import type { VisualModelDiagnostics } from "./types/overlays";
import type { AtrVisuProject } from "./types/project";
import type { ScenePerformanceMetrics } from "./types/performance";
import type { MachineConnectionPoint } from "./types/ataraMachineData";
import type { AnnotationObject, AnnotationType } from "./types/annotations";
import type { CivilReferenceItem, CivilReferenceType } from "./types/civil";
import type { ObjectGroup } from "./types/groups";
import type { LayoutLayer } from "./types/layers";
import type { LayoutViewpoint, ViewpointDisplayState } from "./types/viewpoints";
import { checkAllObjectCollisions } from "./utils/collision";
import { loadCollisionSettings, saveCollisionSettings } from "./utils/collisionSettings";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT, getCivilReferenceFootprintBoundsMm } from "./utils/coordinateReference";
import { normalizeMachineDefinitionDimensions } from "./utils/machineDimensions";
import { annotationsFromLayout, civilReferencesFromLayout, createLayoutSnapshotFromMachines, groupsFromLayout, layersFromLayout, placedMachinesFromLayout, viewpointsFromLayout } from "./utils/layoutSerialization";
import { loadOverlaySettings, saveOverlaySettings } from "./utils/overlaySettings";
import {
  applyPositionSnap,
  applyRotationSnap,
  createMachineInstanceId,
  duplicatePlacedMachines,
  getMachinePlanPositionMm
} from "./utils/placement";
import {
  alignObjectsToAnchor,
  alignEntitiesToAnchor,
  applyMachinePositionUpdates,
  applyEntityPairAlignment,
  applyPairAlignment,
  distributeObjectsByCenter,
  distributeEntitiesByCenter,
  equalizeGaps,
  equalizeEntityGaps,
  getAlignableEntityKey,
  selectionHasLockedAlignableEntities,
  snapPrimaryEntityAnchorToSecondaryAnchor,
  snapPrimaryAnchorToSecondaryAnchor
} from "./utils/alignment";
import { createLayoutHistory, pushHistorySnapshot, redoHistory, undoHistory } from "./utils/layoutHistory";
import { loadPlacementSettings, savePlacementSettings } from "./utils/placementSettings";
import { listProjects } from "./utils/projectStorage";
import { initializeProjectStorage } from "./utils/storage/storageMigration";
import { metersToMm, mmToMeters } from "./utils/units";
import { normalizeMachineVisualModel } from "./utils/visualModel";
import { getObjectPlanBounds, getSelectionPlanBounds } from "./utils/selectionBounds";
import {
  applyConnectionPointSnap,
  executeGuardedConnectionPointSnap,
  type ConnectionPointSnapSelection
} from "./utils/connectionPointSnap";
import {
  createAnnotation,
  deleteAnnotation,
  detachAnnotationsForDeletedObjects,
  updateAnnotation
} from "./utils/annotations";
import {
  createCivilReference,
  deleteCivilReference,
  getVisibleCivilReferences,
  normalizeCivilReferences,
  updateCivilReference
} from "./utils/civil";
import { addViewpoint, createViewpoint, deleteViewpoint, updateViewpoint } from "./utils/viewpoints";
import {
  getEditorCommandIdForShortcutAction,
  resolveEditorShortcut,
  shouldPreventEditorShortcutDefault
} from "./utils/keyboardShortcuts";
import {
  CORE_EDITOR_COMMAND_IDS,
  createCoreEditorCommandAction,
  createCoreEditorRuntimeCommandBridge,
  isDeleteSelectionEligible,
  isMachineSelectionDuplicable,
  type CoreEditorCommandId,
  type CoreEditorRuntimeCommandBindings
} from "./platform/runtimeCommands/coreEditorRuntimeCommands";
import {
  ASSEMBLY_COMMAND_IDS,
  createAssemblyRuntimeCommandBridge,
  type AssemblyCommandId,
  type AssemblyRuntimeCommandBindings
} from "./platform/runtimeCommands/assemblyRuntimeCommands";
import { createLegacyEntitySnapshot, createLegacyPlatformEntityId } from "./platform/adapters/legacyEntityAdapter";
import {
  applyRuntimeSelectionRequest,
  areRuntimeSelectionsEqual,
  createEmptyRuntimeSelection,
  createRuntimeSelectionMovementPreflight,
  evaluateAtomicMovement,
  executeAtomicSelectionMutation,
  getAtomicMovementEntityIds,
  parseRuntimeSelectionEntityId,
  projectExplicitRuntimeSelection,
  projectRuntimeSelection,
  reconcileRuntimeSelection,
  replaceRuntimeSelection
} from "./platform/runtimeSelection";
import {
  addObjectsToGroup,
  createObjectGroup,
  getSelectedGroupMemberEntityIds,
  normalizeGroups,
  removeObjectsFromGroupWithResult,
  removeObjectsFromGroups,
  ungroupObjectGroup
} from "./utils/groups";
import {
  getCivilPositionUpdateDelta,
  getMachinePositionUpdateDelta,
  moveAssemblyMembersByDelta
} from "./utils/assemblyRuntime";
import {
  createDefaultLayer,
  createLayer,
  deleteLayerAndReassignItems,
  getLayer,
  getLayerId,
  isLayerLocked,
  isLayerVisible,
  isolateLayer,
  normalizeLayers,
  showAllLayers
} from "./utils/layers";

const PLACEMENT_COLUMNS = 3;
const PLACEMENT_SPACING = 7;
const PLACEMENT_ORIGIN = { x: -8, z: -6 };
const AUTOSAVE_KEY = "atrvisu.autosavedLayout.v1";
const AUTOSAVE_DELAY_MS = 500;
const PANEL_WIDTH_KEY = "atrvisu.rightPanelWidth.v1";
const PANEL_COLLAPSED_KEY = "atrvisu.rightPanelCollapsed.v1";
const NUDGE_SETTINGS_KEY = "atrvisu.nudgeSettings.v1";
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 360;
const DEFAULT_NUDGE_SETTINGS: NudgeSettings = {
  nudgeStepMm: 100,
  largeNudgeStepMm: 1000,
  smallNudgeStepMm: 10
};
const DUPLICATE_MACHINE_OFFSET_MM = 250;

const normalizeNudgeSettings = (value: Partial<NudgeSettings> | null | undefined): NudgeSettings => ({
  nudgeStepMm:
    typeof value?.nudgeStepMm === "number" && Number.isFinite(value.nudgeStepMm) && value.nudgeStepMm > 0
      ? value.nudgeStepMm
      : DEFAULT_NUDGE_SETTINGS.nudgeStepMm,
  largeNudgeStepMm:
    typeof value?.largeNudgeStepMm === "number" && Number.isFinite(value.largeNudgeStepMm) && value.largeNudgeStepMm > 0
      ? value.largeNudgeStepMm
      : DEFAULT_NUDGE_SETTINGS.largeNudgeStepMm,
  smallNudgeStepMm:
    typeof value?.smallNudgeStepMm === "number" && Number.isFinite(value.smallNudgeStepMm) && value.smallNudgeStepMm > 0
      ? value.smallNudgeStepMm
      : DEFAULT_NUDGE_SETTINGS.smallNudgeStepMm
});

export function App() {
  const [enableE2EDiagnostics] = useState(() =>
    new URLSearchParams(window.location.search).get("e2eDiagnostics") === "1"
  );
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);
  const [civilReferences, setCivilReferences] = useState<CivilReferenceItem[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>([]);
  const [layers, setLayers] = useState<LayoutLayer[]>(() => [createDefaultLayer()]);
  const [groups, setGroups] = useState<ObjectGroup[]>([]);
  const [activeGroupEditId, setActiveGroupEditId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("default");
  const [viewpoints, setViewpoints] = useState<LayoutViewpoint[]>([]);
  const [selectedViewpointId, setSelectedViewpointId] = useState<string | null>(null);
  const [runtimeSelection, setRuntimeSelection] = useState(() => createEmptyRuntimeSelection("scene"));
  const [annotationSelectionSignal, setAnnotationSelectionSignal] = useState(0);
  const [recoveryLayout, setRecoveryLayout] = useState<AtrVisuLayout | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [overlaySettings, setOverlaySettings] = useState(loadOverlaySettings);
  const [collisionSettings, setCollisionSettings] = useState(loadCollisionSettings);
  const [placementSettings, setPlacementSettings] = useState(loadPlacementSettings);
  const [nudgeSettings, setNudgeSettings] = useState<NudgeSettings>(() => {
    try {
      return normalizeNudgeSettings(JSON.parse(window.localStorage.getItem(NUDGE_SETTINGS_KEY) ?? "null"));
    } catch {
      return DEFAULT_NUDGE_SETTINGS;
    }
  });
  const [visualDiagnostics, setVisualDiagnostics] = useState<Record<string, VisualModelDiagnostics>>({});
  const [projects, setProjects] = useState<AtrVisuProject[]>([]);
  const [isProjectStorageLoading, setIsProjectStorageLoading] = useState(true);
  const [projectStorageError, setProjectStorageError] = useState("");
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isPerformanceBenchmarkOpen, setIsPerformanceBenchmarkOpen] = useState(false);
  const [isBenchmarkMode, setIsBenchmarkMode] = useState(false);
  const [latestPerformanceMetrics, setLatestPerformanceMetrics] = useState<ScenePerformanceMetrics | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
  const [hasUnsavedProjectChanges, setHasUnsavedProjectChanges] = useState(false);
  const [layoutHistory, setLayoutHistory] = useState(() => createLayoutHistory());
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const rawSavedWidth = window.localStorage.getItem(PANEL_WIDTH_KEY);
      const savedWidth = rawSavedWidth === null ? Number.NaN : Number(rawSavedWidth);
      return Number.isFinite(savedWidth)
        ? Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, savedWidth))
        : DEFAULT_PANEL_WIDTH;
    } catch {
      return DEFAULT_PANEL_WIDTH;
    }
  });
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(PANEL_COLLAPSED_KEY) === "collapsed";
    } catch {
      return false;
    }
  });
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);
  const placementSettingsRef = useRef(placementSettings);
  const isBenchmarkModeRef = useRef(isBenchmarkMode);
  const runtimeSelectionRef = useRef(runtimeSelection);
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);
  const civilReferencesRef = useRef<CivilReferenceItem[]>(civilReferences);
  const annotationsRef = useRef<AnnotationObject[]>(annotations);
  const layersRef = useRef<LayoutLayer[]>(layers);
  const groupsRef = useRef<ObjectGroup[]>(groups);
  const activeGroupEditIdRef = useRef<string | null>(activeGroupEditId);
  const viewpointsRef = useRef<LayoutViewpoint[]>(viewpoints);
  const sceneRef = useRef<BabylonSceneHandle | null>(null);
  const annotationEditHistoryRecordedRef = useRef(false);
  const runtimeCommandBindingsRef = useRef<CoreEditorRuntimeCommandBindings>({});
  const runtimeCommandBridge = useMemo(
    () => createCoreEditorRuntimeCommandBridge(() => runtimeCommandBindingsRef.current),
    []
  );
  const assemblyCommandBindingsRef = useRef<AssemblyRuntimeCommandBindings>({});
  const assemblyCommandBridge = useMemo(
    () => createAssemblyRuntimeCommandBridge(() => assemblyCommandBindingsRef.current),
    []
  );

  const platformEntities = useMemo(() => createLegacyEntitySnapshot({
    machines: placedMachines,
    civilReferences,
    annotations,
    layers,
    groups
  }), [annotations, civilReferences, groups, layers, placedMachines]);
  const platformEntitiesRef = useRef(platformEntities);
  const selectionProjection = useMemo(
    () => projectRuntimeSelection(runtimeSelection, platformEntities),
    [platformEntities, runtimeSelection]
  );
  const explicitSelectionProjection = useMemo(
    () => projectExplicitRuntimeSelection(runtimeSelection, platformEntities),
    [platformEntities, runtimeSelection]
  );
  const {
    selectedMachineIds,
    primarySelectedMachineId,
    selectedCivilReferenceIds,
    selectedCivilReferenceId,
    selectedAnnotationId,
    selectedGroupId,
    selectedAlignableEntityIds: selectedEntityKeys
  } = selectionProjection;
  const editingAnnotationId = selectedAnnotationId;

  const selectedMachineId = primarySelectedMachineId;
  const selectedMachine = placedMachines.find((machine) => machine.instanceId === selectedMachineId);
  const selectedCivilReference = selectedCivilReferenceId
    && selectedMachineIds.length === 0
    && selectedCivilReferenceIds.length <= 1
    && !selectedGroupId
    ? civilReferences.find((item) => item.id === selectedCivilReferenceId)
    : undefined;
  const selectedGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) : null;
  const activeGroupEdit = activeGroupEditId ? groups.find((group) => group.id === activeGroupEditId) : null;
  const activeGroupEditMachineIds = useMemo(() => activeGroupEdit
    ? activeGroupEdit.objectIds.flatMap((entityId) => entityId.startsWith("machine:")
      ? [entityId.slice("machine:".length)]
      : [])
    : [], [activeGroupEdit]);
  const singleSelectedMachine = selectedMachineIds.length === 1 && !selectedGroup ? selectedMachine : undefined;
  const visiblePlacedMachines = useMemo(
    () => placedMachines.filter((machine) => isLayerVisible(machine.layerId, layers)),
    [layers, placedMachines]
  );
  const visibleCivilReferences = useMemo(
    () => getVisibleCivilReferences(civilReferences, layers),
    [civilReferences, layers]
  );
  const visibleAnnotations = useMemo(
    () => annotations.filter((annotation) => isLayerVisible(annotation.layerId, layers)),
    [annotations, layers]
  );
  const lockedMachineIds = useMemo(
    () => placedMachines.filter((machine) => isLayerLocked(machine.layerId, layers)).map((machine) => machine.instanceId),
    [layers, placedMachines]
  );
  const lockedCivilReferenceIds = useMemo(
    () => civilReferences
      .filter((item) => item.locked || isLayerLocked(item.layerId, layers))
      .map((item) => item.id),
    [civilReferences, layers]
  );
  const lockedAnnotationIds = useMemo(
    () => annotations.filter((annotation) => isLayerLocked(annotation.layerId, layers)).map((annotation) => annotation.id),
    [annotations, layers]
  );
  const selectedMachineLocked = selectedMachine ? isLayerLocked(selectedMachine.layerId, layers) : false;
  const selectedCivilReferenceLocked = selectedCivilReference
    ? Boolean(selectedCivilReference.locked || isLayerLocked(selectedCivilReference.layerId, layers))
    : false;
  const selectedAnnotationLocked = editingAnnotationId
    ? isLayerLocked(annotations.find((annotation) => annotation.id === editingAnnotationId)?.layerId, layers)
    : false;
  const selectedMachineIdSet = useMemo(() => new Set(selectedMachineIds), [selectedMachineIds]);
  const selectedCivilReferenceIdSet = useMemo(() => new Set(selectedCivilReferenceIds), [selectedCivilReferenceIds]);
  const selectedMachines = useMemo(
    () => placedMachines.filter((machine) => selectedMachineIdSet.has(machine.instanceId)),
    [placedMachines, selectedMachineIdSet]
  );
  const runtimeSelectionMovementEvaluation = useMemo(
    () => evaluateAtomicMovement(runtimeSelection.ids, platformEntities),
    [platformEntities, runtimeSelection.ids]
  );
  const canDuplicateSelectedMachines = useMemo(
    () => runtimeSelection.ids.length === selectedMachineIds.length
      && runtimeSelectionMovementEvaluation.allowed
      && isMachineSelectionDuplicable(
        selectedMachineIds,
        selectedMachines.map((machine) => ({
          id: machine.instanceId,
          locked: isLayerLocked(machine.layerId, layers)
        }))
      ),
    [layers, runtimeSelection.ids.length, runtimeSelectionMovementEvaluation.allowed, selectedMachineIds, selectedMachines]
  );
  const selectedAnnotationForDeleteId = editingAnnotationId || selectedAnnotationId;
  const canDeleteSelectedEntities = useMemo(() => {
    if (selectedGroupId) {
      return false;
    }
    const selectedCivil = selectedCivilReferenceId
      ? civilReferences.find((item) => item.id === selectedCivilReferenceId)
      : undefined;
    const selectedAnnotation = selectedAnnotationForDeleteId
      ? annotations.find((item) => item.id === selectedAnnotationForDeleteId)
      : undefined;

    return isDeleteSelectionEligible({
      civil: selectedCivilReferenceId
        ? {
            exists: Boolean(selectedCivil),
            locked: Boolean(selectedCivil?.locked || isLayerLocked(selectedCivil?.layerId, layers))
          }
        : null,
      annotation: selectedAnnotationForDeleteId
        ? {
            exists: Boolean(selectedAnnotation),
            locked: isLayerLocked(selectedAnnotation?.layerId, layers)
          }
        : null,
      machines: selectedMachines.map((machine) => ({
        id: machine.instanceId,
        locked: isLayerLocked(machine.layerId, layers)
      }))
    });
  }, [
    annotations,
    civilReferences,
    layers,
    selectedAnnotationForDeleteId,
    selectedCivilReferenceId,
    selectedGroupId,
    selectedMachines
  ]);
  const selectedCivilReferences = useMemo(
    () => civilReferences.filter((item) => selectedCivilReferenceIdSet.has(item.id)),
    [civilReferences, selectedCivilReferenceIdSet]
  );
  const alignableEntities = useMemo(() => [
    ...visiblePlacedMachines.map((machine) => ({
      id: machine.instanceId,
      kind: "machine" as const,
      label: machine.definition.name,
      bounds: getObjectPlanBounds(machine),
      positionMm: getMachinePlanPositionMm(machine),
      locked: isLayerLocked(machine.layerId, layers),
      hidden: false
    })),
    ...visibleCivilReferences.map((item) => ({
      id: item.id,
      kind: "civil" as const,
      label: item.name,
      bounds: { objectId: item.id, ...getCivilReferenceFootprintBoundsMm(item) },
      positionMm: item.positionMm,
      locked: Boolean(item.locked || isLayerLocked(item.layerId, layers)),
      hidden: false
    }))
  ], [layers, visibleCivilReferences, visiblePlacedMachines]);
  const selectedAlignableEntityIds = useMemo(() => [
    ...selectedEntityKeys
  ], [selectedEntityKeys]);
  const explicitSelectedAlignableEntityIds = explicitSelectionProjection.selectedAlignableEntityIds;
  const removableActiveGroupEntityIds = useMemo(() => activeGroupEdit
    ? getSelectedGroupMemberEntityIds(activeGroupEdit, explicitSelectedAlignableEntityIds)
    : [], [activeGroupEdit, explicitSelectedAlignableEntityIds]);
  const selectedAlignableEntities = useMemo(() => {
    const byKey = new Map(alignableEntities.map((entity) => [getAlignableEntityKey(entity.kind, entity.id), entity]));
    return selectedAlignableEntityIds.flatMap((key) => {
      const entity = byKey.get(key);
      return entity ? [entity] : [];
    });
  }, [alignableEntities, selectedAlignableEntityIds]);
  const primarySelectedAlignableId = useMemo(() => {
    return selectedAlignableEntityIds[0] ?? null;
  }, [selectedAlignableEntityIds]);
  const primarySelectedAlignable = primarySelectedAlignableId
    ? selectedAlignableEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) === primarySelectedAlignableId)
    : undefined;
  const selectedGroupHasLockedVisibleMembers = useMemo(() => {
    if (!selectedGroup) {
      return false;
    }
    return selectedGroup.objectIds.some((objectId) => {
      if (objectId.startsWith("civil:")) {
        const civil = civilReferences.find((item) => item.id === objectId.slice("civil:".length));
        return civil ? isLayerVisible(civil.layerId, layers) && (civil.locked || isLayerLocked(civil.layerId, layers)) : false;
      }
      const machineId = objectId.replace(/^(object|machine):/, "");
      const machine = placedMachines.find((item) => item.instanceId === machineId);
      return machine ? isLayerVisible(machine.layerId, layers) && isLayerLocked(machine.layerId, layers) : false;
    });
  }, [civilReferences, layers, placedMachines, selectedGroup]);
  const selectionBounds = useMemo(() => getSelectionPlanBounds(selectedMachines), [selectedMachines]);
  const canUndo = layoutHistory.undoStack.length > 0;
  const canRedo = layoutHistory.redoStack.length > 0;
  const selectedVisualDiagnostics = selectedMachineId ? visualDiagnostics[selectedMachineId] : undefined;
  const currentProject = currentProjectId ? projects.find((project) => project.projectId === currentProjectId) : null;
  const currentLayout = currentProject && currentLayoutId
    ? currentProject.layouts.find((layout) => layout.layoutId === currentLayoutId)
    : null;
  const currentRevision = currentLayout && currentRevisionId
    ? currentLayout.revisions.find((revision) => revision.revisionId === currentRevisionId)
    : null;
  const collisionResult = useMemo(
    () => checkAllObjectCollisions(visiblePlacedMachines, visibleCivilReferences, collisionSettings.enabled),
    [collisionSettings.enabled, visibleCivilReferences, visiblePlacedMachines]
  );
  const selectedCollisionPairs = selectedMachineId
    ? collisionResult.pairs.filter(
        (pair) => pair.objectAId === selectedMachineId || pair.objectBId === selectedMachineId
      )
    : [];
  const handleVisualDiagnosticsChange = useCallback((diagnostics: VisualModelDiagnostics) => {
    setVisualDiagnostics((current) => {
      const previous = current[diagnostics.instanceId];
      if (previous && JSON.stringify(previous) === JSON.stringify(diagnostics)) {
        return current;
      }
      return {
        ...current,
        [diagnostics.instanceId]: diagnostics
      };
    });
  }, []);

  useEffect(() => {
    try {
      saveOverlaySettings(overlaySettings);
    } catch {
      // Display preferences are best-effort only.
    }
  }, [overlaySettings]);

  useEffect(() => {
    try {
      saveCollisionSettings(collisionSettings);
    } catch {
      // Collision preferences are best-effort only.
    }
  }, [collisionSettings]);

  useEffect(() => {
    try {
      savePlacementSettings(placementSettings);
    } catch {
      // Placement preferences are best-effort only.
    }
    placementSettingsRef.current = placementSettings;
  }, [placementSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NUDGE_SETTINGS_KEY, JSON.stringify(nudgeSettings));
    } catch {
      // Precision preferences are best-effort only.
    }
  }, [nudgeSettings]);

  useEffect(() => {
    setRuntimeSelection((current) => {
      const next = reconcileRuntimeSelection(current, platformEntities);
      return areRuntimeSelectionsEqual(current, next) ? current : next;
    });
  }, [platformEntities]);

  useLayoutEffect(() => {
    runtimeSelectionRef.current = runtimeSelection;
    platformEntitiesRef.current = platformEntities;
  }, [platformEntities, runtimeSelection]);

  useEffect(() => {
    isBenchmarkModeRef.current = isBenchmarkMode;
  }, [isBenchmarkMode]);

  useLayoutEffect(() => {
    placedMachinesRef.current = placedMachines;
  }, [placedMachines]);

  useLayoutEffect(() => {
    civilReferencesRef.current = civilReferences;
  }, [civilReferences]);

  useLayoutEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useLayoutEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useLayoutEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useLayoutEffect(() => {
    activeGroupEditIdRef.current = activeGroupEditId;
  }, [activeGroupEditId]);

  useEffect(() => {
    const normalized = normalizeGroups(groups, placedMachines, layers, civilReferences);
    if (
      normalized.length !== groups.length ||
      normalized.some((group, index) => group.id !== groups[index]?.id || group.objectIds.join("|") !== groups[index]?.objectIds.join("|"))
    ) {
      setGroups(normalized);
    }
    if (activeGroupEditId && !normalized.some((group) => group.id === activeGroupEditId)) {
      setActiveGroupEditId(null);
    }
  }, [activeGroupEditId, civilReferences, groups, layers, placedMachines]);

  useEffect(() => {
    const normalized = normalizeCivilReferences(civilReferences, layers);
    if (
      normalized.length !== civilReferences.length ||
      normalized.some((item, index) =>
        item.id !== civilReferences[index]?.id ||
        item.layerId !== civilReferences[index]?.layerId ||
        item.sizeMm.widthMm !== civilReferences[index]?.sizeMm.widthMm ||
        item.sizeMm.depthMm !== civilReferences[index]?.sizeMm.depthMm ||
        item.sizeMm.heightMm !== civilReferences[index]?.sizeMm.heightMm
      )
    ) {
      setCivilReferences(normalized);
    }
  }, [civilReferences, layers]);

  useEffect(() => {
    const normalized = normalizeLayers(layers);
    if (
      normalized.length !== layers.length ||
      normalized.some((layer, index) =>
        layer.id !== layers[index]?.id ||
        layer.name !== layers[index]?.name ||
        layer.visible !== layers[index]?.visible ||
        layer.locked !== layers[index]?.locked ||
        layer.systemLayer !== layers[index]?.systemLayer
      )
    ) {
      setLayers(normalized);
    }
    if (!normalized.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId("default");
    }
  }, [layers, selectedLayerId]);

  useLayoutEffect(() => {
    viewpointsRef.current = viewpoints;
  }, [viewpoints]);

  useEffect(() => {
    if (selectedViewpointId && !viewpoints.some((viewpoint) => viewpoint.id === selectedViewpointId)) {
      setSelectedViewpointId(viewpoints[viewpoints.length - 1]?.id ?? null);
    }
  }, [selectedViewpointId, viewpoints]);

  const recordLayoutHistory = useCallback(() => {
    if (isBenchmarkModeRef.current) {
      return;
    }
    setLayoutHistory((current) =>
      pushHistorySnapshot(
        current,
        placedMachinesRef.current,
        annotationsRef.current,
        civilReferencesRef.current,
        viewpointsRef.current,
        layersRef.current,
        groupsRef.current
      )
    );
  }, []);

  const clearLayoutHistory = useCallback(() => {
    setLayoutHistory(createLayoutHistory());
  }, []);

  const markLayoutChanged = useCallback((options: { recordHistory?: boolean } = {}) => {
    if (options.recordHistory !== false) {
      recordLayoutHistory();
    }
    if (!isBenchmarkModeRef.current) {
      setHasUnsavedProjectChanges((current) => current || true);
    }
  }, [recordLayoutHistory]);

  const undoLayoutChange = useCallback(() => {
    setLayoutHistory((current) => {
      const result = undoHistory(
        current,
        placedMachinesRef.current,
        annotationsRef.current,
        civilReferencesRef.current,
        viewpointsRef.current,
        layersRef.current,
        groupsRef.current
      );
      if (!result) {
        return current;
      }
      setPlacedMachines(result.machines);
      setAnnotations(result.annotations);
      setCivilReferences(normalizeCivilReferences(result.civilReferences, result.layers));
      setLayers(normalizeLayers(result.layers));
      setGroups(normalizeGroups(result.groups, result.machines, result.layers, result.civilReferences));
      setViewpoints(result.viewpoints);
      setRuntimeSelection((selection) => selection.ids.some((id) => id.startsWith("annotation:"))
        ? createEmptyRuntimeSelection("command")
        : selection);
      setHasUnsavedProjectChanges(true);
      return result.history;
    });
  }, []);

  const redoLayoutChange = useCallback(() => {
    setLayoutHistory((current) => {
      const result = redoHistory(
        current,
        placedMachinesRef.current,
        annotationsRef.current,
        civilReferencesRef.current,
        viewpointsRef.current,
        layersRef.current,
        groupsRef.current
      );
      if (!result) {
        return current;
      }
      setPlacedMachines(result.machines);
      setAnnotations(result.annotations);
      setCivilReferences(normalizeCivilReferences(result.civilReferences, result.layers));
      setLayers(normalizeLayers(result.layers));
      setGroups(normalizeGroups(result.groups, result.machines, result.layers, result.civilReferences));
      setViewpoints(result.viewpoints);
      setRuntimeSelection((selection) => selection.ids.some((id) => id.startsWith("annotation:"))
        ? createEmptyRuntimeSelection("command")
        : selection);
      setHasUnsavedProjectChanges(true);
      return result.history;
    });
  }, []);

  const refreshProjects = useCallback(async () => {
    const nextProjects = await listProjects();
    setProjects(nextProjects);
    return nextProjects;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      setIsProjectStorageLoading(true);
      try {
        const migrationResult = await initializeProjectStorage();
        if (migrationResult.warnings.length > 0) {
          console.warn("AtrVisu project storage migration warnings:", migrationResult.warnings);
        }
        const nextProjects = await listProjects();
        if (isMounted) {
          setProjects(nextProjects);
          setProjectStorageError("");
        }
      } catch (caught) {
        if (isMounted) {
          setProjectStorageError(caught instanceof Error ? caught.message : "Project storage could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsProjectStorageLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      // UI preferences are best-effort only.
    }
  }, [panelWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PANEL_COLLAPSED_KEY, isPanelCollapsed ? "collapsed" : "open");
    } catch {
      // UI preferences are best-effort only.
    }
  }, [isPanelCollapsed]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = resizeStartRef.current;
      if (!resizeStart) {
        return;
      }

      const nextWidth = resizeStart.width + resizeStart.pointerX - event.clientX;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(nextWidth))));
    };

    const handlePointerUp = () => {
      resizeStartRef.current = null;
      document.body.classList.remove("is-resizing-panel");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const startPanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStartRef.current = {
      pointerX: event.clientX,
      width: panelWidth
    };
    document.body.classList.add("is-resizing-panel");
  };

  const createLayoutSnapshot = useCallback(
    (exportedAt = new Date().toISOString()): AtrVisuLayout =>
      createLayoutSnapshotFromMachines(placedMachines, exportedAt, annotations, viewpoints, layers, groups, civilReferences),
    [annotations, civilReferences, groups, layers, placedMachines, viewpoints]
  );

  const clearSelection = useCallback(() => {
    setRuntimeSelection(createEmptyRuntimeSelection("command"));
  }, []);

  const selectMachine = useCallback((instanceId: string | null, mode: SelectionMode = "replace") => {
    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: instanceId ? createLegacyPlatformEntityId("machine", instanceId) : null,
      mode: !instanceId ? "clear" : mode,
      source: "scene"
    }, platformEntitiesRef.current, { activeGroupEditId: activeGroupEditIdRef.current }));
  }, []);

  const selectAnnotationForEditing = useCallback((annotationId: string | null) => {
    if (!annotationId) {
      setRuntimeSelection((current) => current.ids.some((id) => id.startsWith("annotation:"))
        ? createEmptyRuntimeSelection("scene")
        : current);
      return;
    }

    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: createLegacyPlatformEntityId("annotation", annotationId),
      mode: "replace",
      source: "scene"
    }, platformEntitiesRef.current));
    setAnnotationSelectionSignal((current) => current + 1);
    setIsPanelCollapsed(false);
  }, []);

  const selectCivilReferenceForEditing = useCallback((id: string | null, mode: SelectionMode = "replace") => {
    setIsPanelCollapsed(false);
    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: id ? createLegacyPlatformEntityId("civil", id) : null,
      mode: !id ? "clear" : mode,
      source: "scene"
    }, platformEntitiesRef.current, { activeGroupEditId: activeGroupEditIdRef.current }));
  }, []);

  const replaceSelection = useCallback((ids: string[], primaryId: string | null = ids[0] ?? null) => {
    const orderedIds = primaryId
      ? [primaryId, ...ids.filter((id) => id !== primaryId)]
      : ids;
    setRuntimeSelection(replaceRuntimeSelection(
      orderedIds.map((id) => createLegacyPlatformEntityId("machine", id)),
      "command"
    ));
  }, []);

  const addMachine = useCallback((selection: { libraryId: string; definition: MachineDefinition }) => {
    const { libraryId } = selection;
    const definition = normalizeMachineVisualModel(normalizeMachineDefinitionDimensions(selection.definition));
    const instanceId = createMachineInstanceId(
      definition.id,
      placedMachinesRef.current.map((machine) => machine.instanceId)
    );

    markLayoutChanged();
    setPlacedMachines((current) => {
      const index = current.length;
      const column = index % PLACEMENT_COLUMNS;
      const row = Math.floor(index / PLACEMENT_COLUMNS);

      const position = {
        x: PLACEMENT_ORIGIN.x + column * PLACEMENT_SPACING,
        z: PLACEMENT_ORIGIN.z + row * PLACEMENT_SPACING
      };

      return [
        ...current,
        {
          instanceId,
          libraryId,
          machineDefinitionId: definition.id,
          definitionSnapshot: definition,
          definition,
          layerId: "default",
          position,
          positionMm: {
            xMm: metersToMm(position.x),
            yMm: metersToMm(position.z)
          },
          referencePoint: LAYOUT_REFERENCE_POINT,
          coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
          elevationMm: 0,
          rotationDeg: 0,
          rotationY: 0,
          flowDirection: "forward"
        }
      ];
    });
    replaceSelection([instanceId], instanceId);
  }, [markLayoutChanged, replaceSelection]);

  const duplicateSelectedMachines = useCallback(() => {
    if (
      selectedMachineIds.length === 0
      || runtimeSelection.ids.length !== selectedMachineIds.length
      || !evaluateAtomicMovement(runtimeSelection.ids, platformEntities).allowed
    ) {
      return;
    }

    const selectedById = new Map(selectedMachines.map((machine) => [machine.instanceId, machine]));
    const sourceMachines = selectedMachineIds.flatMap((machineId) => {
      const machine = selectedById.get(machineId);
      return machine ? [machine] : [];
    });

    if (sourceMachines.length !== selectedMachineIds.length) {
      return;
    }

    if (sourceMachines.some((machine) => isLayerLocked(machine.layerId, layersRef.current))) {
      return;
    }

    const duplicates = duplicatePlacedMachines(sourceMachines, {
      existingInstanceIds: placedMachinesRef.current.map((machine) => machine.instanceId),
      offsetMm: DUPLICATE_MACHINE_OFFSET_MM
    });
    const duplicateIds = duplicates.map((machine) => machine.instanceId);
    const primarySourceId = primarySelectedMachineId && selectedMachineIds.includes(primarySelectedMachineId)
      ? primarySelectedMachineId
      : selectedMachineIds[0];
    const primarySourceIndex = sourceMachines.findIndex((machine) => machine.instanceId === primarySourceId);
    const duplicatePrimaryId = duplicates[Math.max(0, primarySourceIndex)]?.instanceId ?? duplicateIds[0] ?? null;

    markLayoutChanged();
    setPlacedMachines((current) => [...current, ...duplicates]);
    setActiveGroupEditId(null);
    replaceSelection(duplicateIds, duplicatePrimaryId);
  }, [markLayoutChanged, platformEntities, primarySelectedMachineId, replaceSelection, runtimeSelection.ids, selectedMachineIds, selectedMachines]);

  const updateMachine = useCallback((
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection" | "layerId">>,
    options: { snapPosition?: boolean; snapRotation?: boolean } = {}
  ) => {
    const currentMachine = placedMachinesRef.current.find((machine) => machine.instanceId === instanceId);
    if (currentMachine && isLayerLocked(currentMachine.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setPlacedMachines((current) =>
      current.map((machine) => {
        if (machine.instanceId !== instanceId) {
          return machine;
        }

        const positionChanged = updates.position !== undefined || updates.positionMm !== undefined;
        const rawPositionMm = updates.positionMm ?? (
          updates.position
            ? { xMm: metersToMm(updates.position.x), yMm: metersToMm(updates.position.z) }
            : machine.positionMm ?? {
                xMm: metersToMm(machine.position.x),
                yMm: metersToMm(machine.position.z)
              }
        );
        const nextPositionMm = positionChanged
          ? options.snapPosition === false
            ? rawPositionMm
            : applyPositionSnap(rawPositionMm, placementSettingsRef.current)
          : rawPositionMm;
        const nextPosition = {
          x: mmToMeters(nextPositionMm.xMm),
          z: mmToMeters(nextPositionMm.yMm)
        };
        const rotationChanged = updates.rotationY !== undefined || updates.rotationDeg !== undefined;
        const rawRotation = updates.rotationY ?? updates.rotationDeg ?? machine.rotationDeg ?? machine.rotationY;
        const nextRotationY = rotationChanged
          ? options.snapRotation === false
            ? applyRotationSnap(rawRotation, { ...placementSettingsRef.current, rotationSnapEnabled: false })
            : applyRotationSnap(rawRotation, placementSettingsRef.current)
          : rawRotation;

        return {
          ...machine,
          ...updates,
          position: nextPosition,
          positionMm: nextPositionMm,
          referencePoint: LAYOUT_REFERENCE_POINT,
          coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
          rotationY: nextRotationY,
          rotationDeg: nextRotationY
        };
      })
    );
  }, []);

  const exportLayout = useCallback(() => {
    const layout = createLayoutSnapshot();
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atrvisu-layout-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [createLayoutSnapshot]);

  const importLayout = useCallback((layout: AtrVisuLayout) => {
    const importedMachines = placedMachinesFromLayout(layout);
    const importedAnnotations = annotationsFromLayout(layout);
    const importedLayers = layersFromLayout(layout);
    const importedCivilReferences = civilReferencesFromLayout(layout, importedLayers);
    const importedGroups = groupsFromLayout(layout, importedMachines, importedLayers);
    const importedViewpoints = viewpointsFromLayout(layout);

    markLayoutChanged();
    setLayers(importedLayers);
    setGroups(importedGroups);
    setActiveGroupEditId(null);
    setSelectedLayerId(importedLayers[0]?.id ?? "default");
    setPlacedMachines(importedMachines);
    setCivilReferences(importedCivilReferences);
    setAnnotations(importedAnnotations);
    setViewpoints(importedViewpoints);
    setSelectedViewpointId(importedViewpoints[0]?.id ?? null);
    clearSelection();
  }, [clearSelection, markLayoutChanged]);

  const createCurrentDisplayState = useCallback((): ViewpointDisplayState => ({
    showCollisionEnvelope: overlaySettings.showCollisionEnvelope,
    showConnectionPoints: overlaySettings.showConnectionPoints,
    showAnnotations: overlaySettings.showAnnotations,
    selectedObjectIds: selectedMachineIds,
    selectedAnnotationId
  }), [overlaySettings, selectedAnnotationId, selectedMachineIds]);

  const captureViewpoint = useCallback((name: string) => {
    const camera = sceneRef.current?.getCameraState();
    if (!camera) {
      return;
    }

    try {
      const viewpoint = createViewpoint({
        name,
        camera,
        displayState: createCurrentDisplayState()
      });
      markLayoutChanged();
      setViewpoints((current) => addViewpoint(current, viewpoint));
      setSelectedViewpointId(viewpoint.id);
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Viewpoint could not be captured.");
    }
  }, [createCurrentDisplayState, markLayoutChanged]);

  const applyViewpoint = useCallback((viewpointId: string) => {
    const viewpoint = viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return;
    }

    sceneRef.current?.applyCameraState(viewpoint.camera);
    if (viewpoint.displayState) {
      const {
        selectedObjectIds,
        selectedAnnotationId: displaySelectedAnnotationId,
        ...overlayDisplayState
      } = viewpoint.displayState;
      setOverlaySettings((current) => ({
        ...current,
        ...overlayDisplayState
      }));
      if (selectedObjectIds) {
        setRuntimeSelection(replaceRuntimeSelection(
          selectedObjectIds.map((id) => createLegacyPlatformEntityId("machine", id)),
          "command"
        ));
      }
      if (displaySelectedAnnotationId) {
        selectAnnotationForEditing(displaySelectedAnnotationId);
      }
    }
    setSelectedViewpointId(viewpoint.id);
  }, [selectAnnotationForEditing, viewpoints]);

  const updateSelectedViewpointFromCurrentView = useCallback((viewpointId: string) => {
    const camera = sceneRef.current?.getCameraState();
    if (!camera) {
      return;
    }

    markLayoutChanged();
    setViewpoints((current) =>
      updateViewpoint(current, viewpointId, {
        camera,
        displayState: createCurrentDisplayState()
      })
    );
  }, [createCurrentDisplayState, markLayoutChanged]);

  const renameViewpoint = useCallback((viewpointId: string, name: string) => {
    if (!name.trim()) {
      return;
    }

    markLayoutChanged();
    setViewpoints((current) => updateViewpoint(current, viewpointId, { name }));
  }, [markLayoutChanged]);

  const removeViewpoint = useCallback((viewpointId: string) => {
    const viewpoint = viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return;
    }
    if (!window.confirm(`Delete viewpoint "${viewpoint.name}"?`)) {
      return;
    }

    markLayoutChanged();
    setViewpoints((current) => deleteViewpoint(current, viewpointId));
  }, [markLayoutChanged, viewpoints]);

  const stepViewpoint = useCallback((direction: "previous" | "next") => {
    if (viewpoints.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, viewpoints.findIndex((viewpoint) => viewpoint.id === selectedViewpointId));
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % viewpoints.length
      : (currentIndex - 1 + viewpoints.length) % viewpoints.length;
    applyViewpoint(viewpoints[nextIndex].id);
  }, [applyViewpoint, selectedViewpointId, viewpoints]);

  const addLayer = useCallback((name: string) => {
    try {
      const layer = createLayer(name);
      markLayoutChanged();
      setLayers((current) => normalizeLayers([...current, layer]));
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Layer could not be created.");
    }
  }, [markLayoutChanged]);

  const renameLayer = useCallback((layerId: string, name: string) => {
    if (!name.trim()) {
      return;
    }
    markLayoutChanged();
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId && !layer.systemLayer
          ? { ...layer, name: name.trim(), updatedAt: new Date().toISOString() }
          : layer
      )
    );
  }, [markLayoutChanged]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    if (getLayer(layerId, layersRef.current).systemLayer) {
      return;
    }
    markLayoutChanged();
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible, updatedAt: new Date().toISOString() } : layer
      )
    );
  }, [markLayoutChanged]);

  const toggleLayerLocked = useCallback((layerId: string) => {
    if (getLayer(layerId, layersRef.current).systemLayer) {
      return;
    }
    markLayoutChanged();
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? { ...layer, locked: !layer.locked, updatedAt: new Date().toISOString() } : layer
      )
    );
  }, [markLayoutChanged]);

  const removeLayer = useCallback((layerId: string) => {
    const layer = layers.find((item) => item.id === layerId);
    if (!layer || layer.systemLayer) {
      return;
    }
    if (!window.confirm(`Delete layer "${layer.name}"? Items on this layer will move to Default.`)) {
      return;
    }
    markLayoutChanged();
    const result = deleteLayerAndReassignItems(layers, placedMachinesRef.current, annotationsRef.current, layerId);
    setLayers(normalizeLayers(result.layers));
    setPlacedMachines(result.machines);
    setAnnotations(result.annotations);
    setCivilReferences((current) =>
      current.map((item) => getLayerId(item.layerId, layers) === layerId ? { ...item, layerId: "default" } : item)
    );
    setSelectedLayerId("default");
  }, [layers, markLayoutChanged]);

  const isolateSelectedLayer = useCallback((layerId: string) => {
    markLayoutChanged();
    setLayers((current) => isolateLayer(current, layerId));
    setSelectedLayerId(layerId);
  }, [markLayoutChanged]);

  const showAllLayoutLayers = useCallback(() => {
    markLayoutChanged();
    setLayers((current) => showAllLayers(current));
  }, [markLayoutChanged]);

  const changeMachineLayer = useCallback((instanceId: string, layerId: string) => {
    const machine = placedMachinesRef.current.find((item) => item.instanceId === instanceId);
    if (!machine || isLayerLocked(machine.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setPlacedMachines((current) =>
      current.map((item) => item.instanceId === instanceId ? { ...item, layerId: getLayerId(layerId, layersRef.current) } : item)
    );
  }, [markLayoutChanged]);

  const changeAnnotationLayer = useCallback((annotationId: string, layerId: string) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (!annotation || isLayerLocked(annotation.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setAnnotations((current) =>
      current.map((item) => item.id === annotationId ? { ...item, layerId: getLayerId(layerId, layersRef.current) } : item)
    );
  }, [markLayoutChanged]);

  const selectObjectGroup = useCallback((groupId: string) => {
    const group = groupsRef.current.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("group", groupId)
    ], "explorer"));
  }, []);

  const createGroupFromSelection = useCallback((name: string) => {
    const objectIds = explicitSelectedAlignableEntityIds.filter((key) => {
      if (key.startsWith("civil:")) {
        const civil = civilReferencesRef.current.find((item) => item.id === key.slice("civil:".length));
        return civil ? isLayerVisible(civil.layerId, layersRef.current) : false;
      }
      const machineId = key.replace(/^(object|machine):/, "");
      const machine = placedMachinesRef.current.find((item) => item.instanceId === machineId);
      return machine ? isLayerVisible(machine.layerId, layersRef.current) : false;
    });
    if (objectIds.length === 0) {
      return;
    }
    try {
      const group = createObjectGroup(name, objectIds);
      markLayoutChanged();
      setGroups((current) => addObjectsToGroup([...current, { ...group, objectIds: [] }], group.id, objectIds));
      setActiveGroupEditId(null);
      setRuntimeSelection(replaceRuntimeSelection([
        createLegacyPlatformEntityId("group", group.id)
      ], "command"));
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Group could not be created.");
    }
  }, [explicitSelectedAlignableEntityIds, markLayoutChanged]);

  const addSelectionToGroup = useCallback((groupId: string) => {
    if (explicitSelectedAlignableEntityIds.length === 0) {
      return;
    }
    const nextGroups = addObjectsToGroup(groupsRef.current, groupId, explicitSelectedAlignableEntityIds);
    if (nextGroups === groupsRef.current) {
      return;
    }
    markLayoutChanged();
    setGroups(nextGroups);
    if (
      activeGroupEditIdRef.current
      && !nextGroups.some((group) => group.id === activeGroupEditIdRef.current)
    ) {
      setActiveGroupEditId(null);
    }
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("group", groupId)
    ], "command"));
  }, [explicitSelectedAlignableEntityIds, markLayoutChanged]);

  const removeSelectionFromGroup = useCallback((groupId: string) => {
    if (activeGroupEditIdRef.current !== groupId) {
      return;
    }
    const group = groupsRef.current.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    const explicitSelection = projectExplicitRuntimeSelection(
      runtimeSelectionRef.current,
      platformEntitiesRef.current
    );
    const removableEntityIds = getSelectedGroupMemberEntityIds(
      group,
      explicitSelection.selectedAlignableEntityIds
    );
    if (removableEntityIds.length === 0) {
      return;
    }
    const result = removeObjectsFromGroupWithResult(
      groupsRef.current,
      groupId,
      removableEntityIds
    );
    if (!result) {
      return;
    }
    markLayoutChanged();
    setGroups(result.groups);
    if (result.removedGroup) {
      setActiveGroupEditId(null);
      setRuntimeSelection(createEmptyRuntimeSelection("command"));
    }
  }, [markLayoutChanged]);

  const renameObjectGroup = useCallback((groupId: string, name: string) => {
    if (!name.trim()) {
      return;
    }
    markLayoutChanged();
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, name: name.trim(), updatedAt: new Date().toISOString() } : group
      )
    );
  }, [markLayoutChanged]);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    markLayoutChanged();
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, collapsed: !group.collapsed, updatedAt: new Date().toISOString() } : group
      )
    );
  }, [markLayoutChanged]);

  const applyBenchmarkMachines = useCallback((machines: PlacedMachine[]) => {
    setIsBenchmarkMode(true);
    setPlacedMachines(machines);
    setCivilReferences([]);
    setAnnotations([]);
    setLayers([createDefaultLayer()]);
    setGroups([]);
    setActiveGroupEditId(null);
    setSelectedLayerId("default");
    setViewpoints([]);
    setSelectedViewpointId(null);
    clearSelection();
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const restoreBenchmarkSnapshot = useCallback((snapshot: AtrVisuLayout) => {
    const importedMachines = placedMachinesFromLayout(snapshot);
    const importedAnnotations = annotationsFromLayout(snapshot);
    const importedLayers = layersFromLayout(snapshot);
    const importedCivilReferences = civilReferencesFromLayout(snapshot, importedLayers);
    const importedGroups = groupsFromLayout(snapshot, importedMachines, importedLayers);
    const importedViewpoints = viewpointsFromLayout(snapshot);
    setPlacedMachines(importedMachines);
    setCivilReferences(importedCivilReferences);
    setAnnotations(importedAnnotations);
    setLayers(importedLayers);
    setGroups(importedGroups);
    setActiveGroupEditId(null);
    setSelectedLayerId(importedLayers[0]?.id ?? "default");
    setViewpoints(importedViewpoints);
    setSelectedViewpointId(importedViewpoints[0]?.id ?? null);
    clearSelection();
    setIsBenchmarkMode(false);
    setHasUnsavedProjectChanges(false);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const clearBenchmarkScene = useCallback(() => {
    setPlacedMachines([]);
    setCivilReferences([]);
    setAnnotations([]);
    setLayers([createDefaultLayer()]);
    setGroups([]);
    setActiveGroupEditId(null);
    setSelectedLayerId("default");
    setViewpoints([]);
    setSelectedViewpointId(null);
    clearSelection();
    setIsBenchmarkMode(true);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const loadRevisionSnapshot = useCallback((
    projectId: string,
    layoutId: string,
    revisionId: string,
    snapshot: AtrVisuLayout
  ) => {
    const importedMachines = placedMachinesFromLayout(snapshot);
    const importedAnnotations = annotationsFromLayout(snapshot);
    const importedLayers = layersFromLayout(snapshot);
    const importedCivilReferences = civilReferencesFromLayout(snapshot, importedLayers);
    const importedGroups = groupsFromLayout(snapshot, importedMachines, importedLayers);
    const importedViewpoints = viewpointsFromLayout(snapshot);
    setPlacedMachines(importedMachines);
    setCivilReferences(importedCivilReferences);
    setAnnotations(importedAnnotations);
    setLayers(importedLayers);
    setGroups(importedGroups);
    setActiveGroupEditId(null);
    setSelectedLayerId(importedLayers[0]?.id ?? "default");
    setViewpoints(importedViewpoints);
    setSelectedViewpointId(importedViewpoints[0]?.id ?? null);
    clearSelection();
    setCurrentProjectId(projectId);
    setCurrentLayoutId(layoutId);
    setCurrentRevisionId(revisionId);
    void refreshProjects();
    setHasUnsavedProjectChanges(false);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection, refreshProjects]);

  const canBeginObjectDrag = useMemo(() => createRuntimeSelectionMovementPreflight(() => ({
    selection: runtimeSelectionRef.current,
    entities: platformEntitiesRef.current,
    activeGroupEditId: activeGroupEditIdRef.current
  })), []);

  const setMachinePositions = useCallback((
    updates: Array<{ instanceId: string; xMm: number; yMm: number }>,
    options: { recordHistory?: boolean } = {}
  ) => {
    const currentSelection = runtimeSelectionRef.current;
    const currentEntities = platformEntitiesRef.current;
    const affectedEntityIds = getAtomicMovementEntityIds(
      currentSelection,
      updates.map((update) => createLegacyPlatformEntityId("machine", update.instanceId)),
      true,
      currentEntities,
      activeGroupEditIdRef.current
    );
    const evaluation = evaluateAtomicMovement(affectedEntityIds, currentEntities);
    if (!evaluation.allowed) {
      return false;
    }

    const hasRealPositionChange = updates.some((update) => {
      const machine = placedMachinesRef.current.find((item) => item.instanceId === update.instanceId);
      const currentPosition = machine ? getMachinePlanPositionMm(machine) : null;
      return currentPosition ? currentPosition.xMm !== update.xMm || currentPosition.yMm !== update.yMm : false;
    });
    if (!hasRealPositionChange) {
      return false;
    }

    const activeEditGroup = activeGroupEditIdRef.current
      ? groupsRef.current.find((group) => group.id === activeGroupEditIdRef.current)
      : undefined;
    const updatesActiveEditMember = Boolean(activeEditGroup && updates.some((update) =>
      activeEditGroup.objectIds.includes(createLegacyPlatformEntityId("machine", update.instanceId))
    ));
    const hasSelectedAssembly = !updatesActiveEditMember
      && currentSelection.ids.some((entityId) => entityId.startsWith("group:"));
    if (hasSelectedAssembly) {
      const firstUpdate = updates.find((update) =>
        placedMachinesRef.current.some((machine) => machine.instanceId === update.instanceId)
      );
      const firstMachine = firstUpdate
        ? placedMachinesRef.current.find((machine) => machine.instanceId === firstUpdate.instanceId)
        : undefined;
      if (!firstUpdate || !firstMachine) {
        return false;
      }
      const targetPosition = applyPositionSnap(
        { xMm: firstUpdate.xMm, yMm: firstUpdate.yMm },
        placementSettingsRef.current
      );
      const delta = getMachinePositionUpdateDelta(firstMachine, targetPosition);
      const projection = projectRuntimeSelection(currentSelection, currentEntities);
      const movement = moveAssemblyMembersByDelta({
        machines: placedMachinesRef.current,
        civilReferences: civilReferencesRef.current,
        memberEntityIds: projection.selectedAlignableEntityIds,
        ...delta
      });
      if (!movement) {
        return false;
      }

      executeAtomicSelectionMutation({
        entityIds: affectedEntityIds,
        entities: currentEntities,
        beforeMutation: () => markLayoutChanged(options),
        mutate: () => {
          setPlacedMachines(movement.machines);
          setCivilReferences(movement.civilReferences);
        }
      });
      return true;
    }

    executeAtomicSelectionMutation({
      entityIds: affectedEntityIds,
      entities: currentEntities,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => setPlacedMachines((current) => {
        if (!placementSettingsRef.current.gridSnapEnabled || updates.length === 1) {
          const snappedUpdates = updates.map((update) => ({
            ...update,
            ...applyPositionSnap({ xMm: update.xMm, yMm: update.yMm }, placementSettingsRef.current)
          }));
          return applyMachinePositionUpdates(current, snappedUpdates);
        }

        const firstUpdate = updates[0];
        const firstMachine = current.find((machine) => machine.instanceId === firstUpdate.instanceId);
        if (!firstMachine) {
          return current;
        }

        const firstPosition = getMachinePlanPositionMm(firstMachine);
        const snappedFirstPosition = applyPositionSnap({ xMm: firstUpdate.xMm, yMm: firstUpdate.yMm }, placementSettingsRef.current);
        const snappedDeltaXMm = snappedFirstPosition.xMm - firstPosition.xMm;
        const snappedDeltaYMm = snappedFirstPosition.yMm - firstPosition.yMm;
        const updateIds = new Set(updates.map((update) => update.instanceId));

        return current.map((machine) => {
          if (!updateIds.has(machine.instanceId)) {
            return machine;
          }

          const position = getMachinePlanPositionMm(machine);
          return applyMachinePositionUpdates(
            [machine],
            [{
              instanceId: machine.instanceId,
              xMm: position.xMm + snappedDeltaXMm,
              yMm: position.yMm + snappedDeltaYMm
            }]
          )[0];
        });
      })
    });
    return true;
  }, [markLayoutChanged]);

  const moveSelectedByDelta = useCallback((
    deltaXMm: number,
    deltaYMm: number,
    options: { recordHistory?: boolean } = {}
  ) => {
    const currentSelection = runtimeSelectionRef.current;
    const currentEntities = platformEntitiesRef.current;
    const projection = projectRuntimeSelection(currentSelection, currentEntities);
    const movement = moveAssemblyMembersByDelta({
      machines: placedMachinesRef.current,
      civilReferences: civilReferencesRef.current,
      memberEntityIds: projection.selectedAlignableEntityIds,
      deltaXMm,
      deltaYMm
    });
    if (!movement) {
      return false;
    }
    const evaluation = executeAtomicSelectionMutation({
      entityIds: currentSelection.ids,
      entities: currentEntities,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => {
        setPlacedMachines(movement.machines);
        setCivilReferences(movement.civilReferences);
      }
    });
    return evaluation.allowed;
  }, [markLayoutChanged]);

  const getAssemblyCommandGroupId = useCallback((primarySelectionId?: string) => {
    const parsed = primarySelectionId ? parseRuntimeSelectionEntityId(primarySelectionId) : null;
    return parsed?.family === "group" ? parsed.sourceId : activeGroupEditIdRef.current;
  }, []);

  const enterGroupEditMode = useCallback((primarySelectionId?: string) => {
    const groupId = getAssemblyCommandGroupId(primarySelectionId);
    if (!groupId || !groupsRef.current.some((group) => group.id === groupId)) {
      return;
    }
    setActiveGroupEditId(groupId);
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("group", groupId)
    ], "command"));
  }, [getAssemblyCommandGroupId]);

  const exitGroupEditMode = useCallback(() => {
    const groupId = activeGroupEditIdRef.current;
    setActiveGroupEditId(null);
    if (groupId && groupsRef.current.some((group) => group.id === groupId)) {
      setRuntimeSelection(replaceRuntimeSelection([
        createLegacyPlatformEntityId("group", groupId)
      ], "command"));
    }
  }, []);

  const ungroupAssembly = useCallback((primarySelectionId?: string) => {
    const groupId = getAssemblyCommandGroupId(primarySelectionId);
    const group = groupId ? groupsRef.current.find((item) => item.id === groupId) : undefined;
    if (!group || !window.confirm(`Ungroup "${group.name}"? Member objects will remain in the layout.`)) {
      return;
    }

    const result = ungroupObjectGroup(groupsRef.current, group.id);
    if (!result) {
      return;
    }
    markLayoutChanged();
    setGroups(result.groups);
    setActiveGroupEditId(null);
    setRuntimeSelection(replaceRuntimeSelection(result.memberEntityIds, "command"));
  }, [getAssemblyCommandGroupId, markLayoutChanged]);

  const applyAlignablePositionUpdates = useCallback((updates: Array<{ kind: "machine" | "civil"; id: string; xMm: number; yMm: number }>) => {
    const machineUpdates = updates
      .filter((update) => update.kind === "machine")
      .map((update) => ({ instanceId: update.id, xMm: update.xMm, yMm: update.yMm }));
    const civilUpdates = updates.filter((update) => update.kind === "civil");

    if (machineUpdates.length > 0) {
      setPlacedMachines((current) => applyMachinePositionUpdates(current, machineUpdates));
    }
    if (civilUpdates.length > 0) {
      setCivilReferences((current) =>
        civilUpdates.reduce(
          (items, update) => updateCivilReference(items, update.id, { positionMm: { xMm: update.xMm, yMm: update.yMm } }),
          current
        )
      );
    }
  }, []);

  const canApplyAlignableAction = useCallback(() => {
    if (runtimeSelection.ids.some((entityId) => entityId.startsWith("group:"))) {
      window.alert("Arrange the assembly as one rigid entity. Member alignment is available only in Edit Group mode.");
      return false;
    }
    if (selectedGroupHasLockedVisibleMembers) {
      window.alert("Alignment is blocked because the selected group contains locked visible objects.");
      return false;
    }
    if (selectedAlignableEntityIds.length < 2) {
      return false;
    }
    if (selectionHasLockedAlignableEntities(alignableEntities, selectedAlignableEntityIds)) {
      window.alert("Alignment is blocked because the selection includes locked objects or civil references.");
      return false;
    }
    return true;
  }, [alignableEntities, runtimeSelection.ids, selectedAlignableEntityIds, selectedGroupHasLockedVisibleMembers]);

  const applyAlignmentAction = useCallback((action: AlignmentAction) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = alignEntitiesToAnchor(alignableEntities, selectedAlignableEntityIds, primarySelectedAlignableId, action);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, primarySelectedAlignableId, selectedAlignableEntityIds]);

  const applyDistributionAction = useCallback((action: DistributionAction) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = distributeEntitiesByCenter(alignableEntities, selectedAlignableEntityIds, action);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, selectedAlignableEntityIds]);

  const applyEqualGapAction = useCallback((action: EqualGapAction) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = equalizeEntityGaps(alignableEntities, selectedAlignableEntityIds, action);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, selectedAlignableEntityIds]);

  const applyPairAlignmentAction = useCallback((action: PairAlignmentAction, gapMm = 0) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = applyEntityPairAlignment(alignableEntities, selectedAlignableEntityIds, primarySelectedAlignableId, action, gapMm);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, primarySelectedAlignableId, selectedAlignableEntityIds]);

  const applyPairAnchorSnap = useCallback((primaryAnchor: FootprintAnchor, secondaryAnchor: FootprintAnchor) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = snapPrimaryEntityAnchorToSecondaryAnchor(
      alignableEntities,
      selectedAlignableEntityIds,
      primarySelectedAlignableId,
      primaryAnchor,
      secondaryAnchor
    );
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, primarySelectedAlignableId, selectedAlignableEntityIds]);

  const applyConnectionSnap = useCallback((
    selection: ConnectionPointSnapSelection,
    movingPoint: MachineConnectionPoint,
    fixedPoint: MachineConnectionPoint
  ) => {
    executeGuardedConnectionPointSnap({
      selection: runtimeSelectionRef.current,
      entities: platformEntitiesRef.current,
      activeGroupEditId: activeGroupEditIdRef.current,
      movingMachineId: selection.movingMachineId,
      fixedMachineId: selection.fixedMachineId
    }, () => {
      const currentMachines = placedMachinesRef.current;
      const nextMachines = applyConnectionPointSnap(currentMachines, selection, movingPoint, fixedPoint);
      if (nextMachines === currentMachines) {
        return;
      }
      markLayoutChanged();
      setPlacedMachines(nextMachines);
    });
  }, [markLayoutChanged]);

  const addCivilReference = useCallback((type: CivilReferenceType) => {
    const index = civilReferencesRef.current.length;
    const column = index % PLACEMENT_COLUMNS;
    const row = Math.floor(index / PLACEMENT_COLUMNS);
    const positionMm = {
      xMm: metersToMm(PLACEMENT_ORIGIN.x + column * PLACEMENT_SPACING),
      yMm: metersToMm(PLACEMENT_ORIGIN.z + row * PLACEMENT_SPACING)
    };
    const item = createCivilReference(type, positionMm);
    markLayoutChanged();
    setCivilReferences((current) => [...current, item]);
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("civil", item.id)
    ], "inspector"));
    setIsPanelCollapsed(false);
  }, [markLayoutChanged]);

  const updateSelectedCivilReference = useCallback((
    id: string,
    updates: Partial<CivilReferenceItem>,
    options: { recordHistory?: boolean } = {}
  ) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || isLayerLocked(item.layerId, layersRef.current)) {
      return;
    }
    if (item.locked && updates.locked !== false) {
      return;
    }
    markLayoutChanged(options);
    setCivilReferences((current) => updateCivilReference(current, id, updates));
  }, [markLayoutChanged]);

  const setCivilReferencePosition = useCallback((
    id: string,
    positionMm: { xMm: number; yMm: number },
    options: { recordHistory?: boolean } = {}
  ) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || (item.positionMm.xMm === positionMm.xMm && item.positionMm.yMm === positionMm.yMm)) {
      return false;
    }

    const entityId = createLegacyPlatformEntityId("civil", id);
    const currentSelection = runtimeSelectionRef.current;
    const currentEntities = platformEntitiesRef.current;
    const affectedEntityIds = getAtomicMovementEntityIds(
      currentSelection,
      [entityId],
      true,
      currentEntities,
      activeGroupEditIdRef.current
    );
    const activeEditGroup = activeGroupEditIdRef.current
      ? groupsRef.current.find((group) => group.id === activeGroupEditIdRef.current)
      : undefined;
    const updatesActiveEditMember = Boolean(activeEditGroup?.objectIds.includes(entityId));
    const hasSelectedAssembly = !updatesActiveEditMember
      && currentSelection.ids.some((selectedId) => selectedId.startsWith("group:"));
    if (hasSelectedAssembly) {
      const delta = getCivilPositionUpdateDelta(item, positionMm);
      const projection = projectRuntimeSelection(currentSelection, currentEntities);
      const movement = moveAssemblyMembersByDelta({
        machines: placedMachinesRef.current,
        civilReferences: civilReferencesRef.current,
        memberEntityIds: projection.selectedAlignableEntityIds,
        ...delta
      });
      if (!movement) {
        return false;
      }
      const evaluation = executeAtomicSelectionMutation({
        entityIds: affectedEntityIds,
        entities: currentEntities,
        beforeMutation: () => markLayoutChanged(options),
        mutate: () => {
          setPlacedMachines(movement.machines);
          setCivilReferences(movement.civilReferences);
        }
      });
      return evaluation.allowed;
    }

    const evaluation = executeAtomicSelectionMutation({
      entityIds: affectedEntityIds,
      entities: currentEntities,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => setCivilReferences((current) => updateCivilReference(current, id, { positionMm }))
    });
    return evaluation.allowed;
  }, [markLayoutChanged]);

  const changeCivilReferenceLayer = useCallback((id: string, layerId: string) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || item.locked || isLayerLocked(item.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setCivilReferences((current) =>
      updateCivilReference(current, id, { layerId: getLayerId(layerId, layersRef.current) })
    );
  }, [markLayoutChanged]);

  const removeCivilReference = useCallback((id: string) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || item.locked || isLayerLocked(item.layerId, layersRef.current)) {
      return;
    }
    if (!window.confirm(`Delete civil reference "${item.name}"?`)) {
      return;
    }
    markLayoutChanged();
    setCivilReferences((current) => deleteCivilReference(current, id));
    setGroups((current) => removeObjectsFromGroups(current, [getAlignableEntityKey("civil", id)]));
    setRuntimeSelection((selection) => replaceRuntimeSelection(
      selection.ids.filter((entityId) => entityId !== createLegacyPlatformEntityId("civil", id)),
      "command"
    ));
  }, [markLayoutChanged]);

  const addAnnotation = useCallback((type: AnnotationType) => {
    markLayoutChanged();
    const annotation = createAnnotation({
      type,
      selectedMachine: type === "callout" ? selectedMachine : undefined
    });
    setAnnotations((current) => [...current, { ...annotation, layerId: "default" }]);
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("annotation", annotation.id)
    ], "inspector"));
    setAnnotationSelectionSignal((current) => current + 1);
    setIsPanelCollapsed(false);
  }, [markLayoutChanged, selectedMachine]);

  const updateSelectedAnnotation = useCallback((
    annotationId: string,
    updates: Partial<AnnotationObject>,
    options: { recordHistory?: boolean } = {}
  ) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (annotation && isLayerLocked(annotation.layerId, layersRef.current)) {
      return;
    }
    if (options.recordHistory !== false) {
      markLayoutChanged();
      annotationEditHistoryRecordedRef.current = false;
    } else if (!isBenchmarkModeRef.current) {
      if (!annotationEditHistoryRecordedRef.current) {
        recordLayoutHistory();
        annotationEditHistoryRecordedRef.current = true;
      }
      setHasUnsavedProjectChanges(true);
    }
    setAnnotations((current) => updateAnnotation(current, annotationId, updates));
  }, [markLayoutChanged, recordLayoutHistory]);

  const setAnnotationPosition = useCallback((
    annotationId: string,
    positionMm: { xMm: number; yMm: number },
    options: { recordHistory?: boolean } = {}
  ) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (
      !annotation
      || (annotation.positionMm.xMm === positionMm.xMm && annotation.positionMm.yMm === positionMm.yMm)
    ) {
      return false;
    }

    const entityId = createLegacyPlatformEntityId("annotation", annotationId);
    const currentSelection = runtimeSelectionRef.current;
    const evaluation = executeAtomicSelectionMutation({
      entityIds: getAtomicMovementEntityIds(currentSelection, [entityId], true),
      entities: platformEntitiesRef.current,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => setAnnotations((current) =>
        updateAnnotation(current, annotationId, {
          positionMm: {
            ...(current.find((item) => item.id === annotationId)?.positionMm ?? { zMm: 1600 }),
            xMm: positionMm.xMm,
            yMm: positionMm.yMm
          }
        })
      )
    });
    return evaluation.allowed;
  }, [markLayoutChanged]);

  const commitAnnotationEdit = useCallback(() => {
    annotationEditHistoryRecordedRef.current = false;
  }, []);

  const removeAnnotation = useCallback((annotationId: string) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (annotation && isLayerLocked(annotation.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setAnnotations((current) => deleteAnnotation(current, annotationId));
    setRuntimeSelection((selection) => replaceRuntimeSelection(
      selection.ids.filter((entityId) => entityId !== createLegacyPlatformEntityId("annotation", annotationId)),
      "command"
    ));
  }, [markLayoutChanged]);

  const deleteSelectedMachines = useCallback(() => {
    const deletableMachines = selectedMachines.filter((machine) => !isLayerLocked(machine.layerId, layersRef.current));
    if (deletableMachines.length === 0) {
      return;
    }

    const selectedNames = deletableMachines.map((machine) => machine.definition.name);
    const label = deletableMachines.length === 1
      ? selectedNames[0] ?? "the selected object"
      : `${deletableMachines.length} selected objects`;
    const confirmed = window.confirm(`Delete ${label} from the layout?`);
    if (!confirmed) {
      return;
    }

    markLayoutChanged();
    const ids = new Set(deletableMachines.map((machine) => machine.instanceId));
    const groupIdsToRemove = deletableMachines.flatMap((machine) => [
      machine.instanceId,
      getAlignableEntityKey("machine", machine.instanceId)
    ]);
    setPlacedMachines((current) => current.filter((machine) => !ids.has(machine.instanceId)));
    setAnnotations((current) => detachAnnotationsForDeletedObjects(current, ids));
    setGroups((current) => removeObjectsFromGroups(current, groupIdsToRemove));
    setActiveGroupEditId(null);
    clearSelection();
  }, [clearSelection, markLayoutChanged, selectedMachines]);

  const deleteSelectedEntities = useCallback(() => {
    if (selectedCivilReferenceId) {
      removeCivilReference(selectedCivilReferenceId);
      return;
    }
    if (selectedAnnotationForDeleteId) {
      removeAnnotation(selectedAnnotationForDeleteId);
      return;
    }
    deleteSelectedMachines();
  }, [
    deleteSelectedMachines,
    removeAnnotation,
    removeCivilReference,
    selectedAnnotationForDeleteId,
    selectedCivilReferenceId
  ]);

  const runtimeCommandBindings = useMemo<CoreEditorRuntimeCommandBindings>(() => ({
    [CORE_EDITOR_COMMAND_IDS.undo]: {
      getEnableState: () => canUndo
        ? { enabled: true }
        : { enabled: false, reason: "Nothing to undo." },
      execute: undoLayoutChange
    },
    [CORE_EDITOR_COMMAND_IDS.redo]: {
      getEnableState: () => canRedo
        ? { enabled: true }
        : { enabled: false, reason: "Nothing to redo." },
      execute: redoLayoutChange
    },
    [CORE_EDITOR_COMMAND_IDS.deleteSelected]: {
      getEnableState: () => canDeleteSelectedEntities
        ? { enabled: true }
        : { enabled: false, reason: "Select an unlocked deletable object." },
      execute: deleteSelectedEntities
    },
    [CORE_EDITOR_COMMAND_IDS.duplicateSelected]: {
      getEnableState: () => canDuplicateSelectedMachines
        ? { enabled: true }
        : { enabled: false, reason: "Select only machines on unlocked layers." },
      execute: duplicateSelectedMachines
    }
  }), [
    canDeleteSelectedEntities,
    canDuplicateSelectedMachines,
    canRedo,
    canUndo,
    deleteSelectedEntities,
    duplicateSelectedMachines,
    redoLayoutChange,
    undoLayoutChange
  ]);

  useLayoutEffect(() => {
    runtimeCommandBindingsRef.current = runtimeCommandBindings;
  }, [runtimeCommandBindings]);

  const assemblyCommandBindings = useMemo<AssemblyRuntimeCommandBindings>(() => ({
    [ASSEMBLY_COMMAND_IDS.enterEdit]: {
      getEnableState: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        return groupId && groupId !== activeGroupEditId && groups.some((group) => group.id === groupId)
          ? { enabled: true }
          : { enabled: false, reason: "Select an assembly that is not already in edit mode." };
      },
      execute: (context) => enterGroupEditMode(context.primarySelectionId)
    },
    [ASSEMBLY_COMMAND_IDS.exitEdit]: {
      getEnableState: () => activeGroupEditId
        ? { enabled: true }
        : { enabled: false, reason: "No assembly is in edit mode." },
      execute: exitGroupEditMode
    },
    [ASSEMBLY_COMMAND_IDS.ungroup]: {
      getEnableState: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        return groupId && groups.some((group) => group.id === groupId)
          ? { enabled: true }
          : { enabled: false, reason: "Select an assembly to ungroup." };
      },
      execute: (context) => ungroupAssembly(context.primarySelectionId)
    }
  }), [
    activeGroupEditId,
    enterGroupEditMode,
    exitGroupEditMode,
    getAssemblyCommandGroupId,
    groups,
    ungroupAssembly
  ]);

  useLayoutEffect(() => {
    assemblyCommandBindingsRef.current = assemblyCommandBindings;
  }, [assemblyCommandBindings]);

  const executeAssemblyCommand = useCallback((commandId: AssemblyCommandId, groupId?: string) => {
    const groupEntityId = groupId ? createLegacyPlatformEntityId("group", groupId) : undefined;
    return assemblyCommandBridge.executeCommand(commandId, {
      selectionIds: groupEntityId ? [groupEntityId] : runtimeSelectionRef.current.ids,
      primarySelectionId: groupEntityId ?? runtimeSelectionRef.current.primaryId,
      hasUnsavedChanges: hasUnsavedProjectChanges
    });
  }, [assemblyCommandBridge, hasUnsavedProjectChanges]);

  const coreEditorCommandContext = useMemo(() => ({
    selectionIds: runtimeSelection.ids,
    primarySelectionId: runtimeSelection.primaryId,
    hasUnsavedChanges: hasUnsavedProjectChanges
  }), [hasUnsavedProjectChanges, runtimeSelection]);

  const canExecuteCoreEditorCommand = useCallback(
    (commandId: CoreEditorCommandId) => runtimeCommandBridge.canExecuteCommand(
      commandId,
      coreEditorCommandContext,
      runtimeCommandBindings
    ),
    [coreEditorCommandContext, runtimeCommandBindings, runtimeCommandBridge]
  );

  const executeCoreEditorCommand = useCallback(
    (commandId: CoreEditorCommandId) => runtimeCommandBridge.executeCommand(
      commandId,
      coreEditorCommandContext
    ).handled,
    [coreEditorCommandContext, runtimeCommandBridge]
  );

  const canExecuteUndoCommand = canExecuteCoreEditorCommand(CORE_EDITOR_COMMAND_IDS.undo).enabled;
  const canExecuteRedoCommand = canExecuteCoreEditorCommand(CORE_EDITOR_COMMAND_IDS.redo).enabled;
  const canExecuteDuplicateSelectedCommand = canExecuteCoreEditorCommand(
    CORE_EDITOR_COMMAND_IDS.duplicateSelected
  ).enabled;

  const executeUndoCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.undo, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );
  const executeRedoCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.redo, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );
  const executeDeleteSelectedCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.deleteSelected, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );
  const executeDuplicateSelectedCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.duplicateSelected, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );

  useEffect(() => {
    try {
      const rawLayout = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!rawLayout) {
        setAutosaveReady(true);
        return;
      }

      const parsedLayout = JSON.parse(rawLayout) as AtrVisuLayout;
      if (
        parsedLayout.appName === "AtrVisu" &&
        parsedLayout.version === 1 &&
        (parsedLayout.objects.length > 0 ||
          (parsedLayout.civilReferences?.length ?? 0) > 0 ||
          (parsedLayout.annotations?.length ?? 0) > 0 ||
          (parsedLayout.viewpoints?.length ?? 0) > 0 ||
          (parsedLayout.layers?.length ?? 0) > 0 ||
          (parsedLayout.groups?.length ?? 0) > 0)
      ) {
        setRecoveryLayout(parsedLayout);
        return;
      }

      window.localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveReady(true);
    } catch {
      window.localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveReady(true);
    }
  }, []);

  useEffect(() => {
    if (!autosaveReady) {
      return;
    }
    if (isBenchmarkMode) {
      return;
    }

    const autosaveId = window.setTimeout(() => {
      try {
        if (
          placedMachines.length === 0 &&
          civilReferences.length === 0 &&
          annotations.length === 0 &&
          viewpoints.length === 0 &&
          layers.length <= 1 &&
          groups.length === 0
        ) {
          window.localStorage.removeItem(AUTOSAVE_KEY);
          return;
        }

        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(createLayoutSnapshot()));
      } catch {
        // Autosave is best-effort; explicit export remains available.
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(autosaveId);
    };
  }, [annotations.length, autosaveReady, civilReferences.length, createLayoutSnapshot, groups.length, isBenchmarkMode, layers.length, placedMachines.length, viewpoints.length]);

  const restoreAutosavedLayout = () => {
    if (!recoveryLayout) {
      return;
    }

    importLayout(recoveryLayout);
    setRecoveryLayout(null);
    setAutosaveReady(true);
  };

  const dismissAutosavedLayout = () => {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    setRecoveryLayout(null);
    setAutosaveReady(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = resolveEditorShortcut({
        key: event.key,
        target: event.target,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        repeat: event.repeat,
        modalOpen: document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]') !== null
      });
      if (!action) {
        return;
      }

      const commandId = getEditorCommandIdForShortcutAction(action);
      if (commandId) {
        const handled = executeCoreEditorCommand(commandId);
        if (shouldPreventEditorShortcutDefault(action, handled)) {
          event.preventDefault();
        }
        return;
      }

      const runHandledAction = (handled: boolean, execute: () => void) => {
        if (!shouldPreventEditorShortcutDefault(action, handled)) {
          return false;
        }
        event.preventDefault();
        execute();
        return true;
      };

      if (action === "clear-selection") {
        runHandledAction(
          runtimeSelection.ids.length > 0,
          clearSelection
        );
        return;
      }

      const canNudgeSelection =
        runtimeSelectionMovementEvaluation.allowed
        && selectedAlignableEntities.length > 0;
      if (!canNudgeSelection) {
        return;
      }

      const step = event.shiftKey
        ? nudgeSettings.largeNudgeStepMm
        : event.altKey || event.ctrlKey
          ? nudgeSettings.smallNudgeStepMm
          : nudgeSettings.nudgeStepMm;
      const delta = {
        "nudge-left": { x: -step, y: 0 },
        "nudge-right": { x: step, y: 0 },
        "nudge-forward": { x: 0, y: -step },
        "nudge-back": { x: 0, y: step }
      } as Partial<Record<string, { x: number; y: number }>>;
      const nudgeDelta = delta[action];

      if (nudgeDelta) {
        runHandledAction(true, () => moveSelectedByDelta(nudgeDelta.x, nudgeDelta.y));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clearSelection,
    executeCoreEditorCommand,
    moveSelectedByDelta,
    nudgeSettings,
    runtimeSelection.ids.length,
    runtimeSelectionMovementEvaluation.allowed,
    selectedAlignableEntities.length
  ]);

  return (
    <AppShell
      viewport={(
        <BabylonScene
          ref={sceneRef}
          placedMachines={visiblePlacedMachines}
          civilReferences={visibleCivilReferences}
          annotations={visibleAnnotations}
          selectedMachineIds={selectedMachineIds}
          primarySelectedMachineId={primarySelectedMachineId}
          selectedCivilReferenceId={selectedCivilReferenceId}
          selectedCivilReferenceIds={selectedCivilReferenceIds}
          selectedAnnotationId={selectedAnnotationId}
          lockedMachineIds={lockedMachineIds}
          lockedCivilReferenceIds={lockedCivilReferenceIds}
          lockedAnnotationIds={lockedAnnotationIds}
          activeGroupEditMachineIds={activeGroupEditMachineIds}
          selectedAssemblyId={selectedGroupId}
          activeGroupEditId={activeGroupEditId}
          onSelectMachine={selectMachine}
          onSelectCivilReference={selectCivilReferenceForEditing}
          onSelectAnnotation={selectAnnotationForEditing}
          onUpdateMachine={updateMachine}
          onSetMachinePositions={setMachinePositions}
          onSetAnnotationPosition={setAnnotationPosition}
          onSetCivilReferencePosition={setCivilReferencePosition}
          canBeginObjectDrag={canBeginObjectDrag}
          isSimulationRunning={isSimulationRunning}
          simulationSpeed={simulationSpeed}
          overlaySettings={overlaySettings}
          collisionResult={collisionResult}
          enableE2EDiagnostics={enableE2EDiagnostics}
          onVisualDiagnosticsChange={handleVisualDiagnosticsChange}
          onPerformanceMetricsChange={setLatestPerformanceMetrics}
        />
      )}
      rightPanel={isPanelCollapsed ? (
        <button
          className="panel-reopen-tab"
          type="button"
          aria-label="Open right panel"
          data-app-shell-zone="machine-properties"
          onClick={() => setIsPanelCollapsed(false)}
        >
          Panel
        </button>
      ) : (
        <aside
          className="machine-panel"
          data-testid="right-panel"
          data-app-shell-zone="machine-properties"
          style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
          aria-label="Machine library, layout, and properties"
        >
          <button
            className="panel-resize-handle"
            type="button"
            aria-label="Resize right panel"
            onPointerDown={startPanelResize}
          />
          <div className="panel-toolbar" data-app-shell-zone="top-toolbar">
            <span>AtrVisu Tools</span>
            <div className="toolbar-button-group" aria-label="Undo and redo">
              <button type="button" disabled={!canExecuteUndoCommand} onClick={executeUndoCommand}>
                Undo
              </button>
              <button type="button" disabled={!canExecuteRedoCommand} onClick={executeRedoCommand}>
                Redo
              </button>
            </div>
            <button type="button" onClick={() => setIsPanelCollapsed(true)}>
              Collapse
            </button>
          </div>
          {recoveryLayout ? (
            <section className="recovery-prompt" aria-label="Autosave recovery">
              <p>A previous unsaved layout was found. Restore it?</p>
              <div className="recovery-actions">
                <button type="button" onClick={restoreAutosavedLayout}>
                  Restore
                </button>
                <button type="button" onClick={dismissAutosavedLayout}>
                  Dismiss
                </button>
              </div>
            </section>
          ) : null}
          <PanelSection
            title="Machine Library"
            storageKey="atrvisu.panelSection.machineLibrary.v1"
            defaultExpanded
          >
            <MachineLibrary onAddMachine={addMachine} />
          </PanelSection>
          <PanelSection
            title="Layout Controls"
            storageKey="atrvisu.panelSection.layoutControls.v1"
            defaultExpanded
          >
            <LayoutControls onExportLayout={exportLayout} onImportLayout={importLayout} />
          </PanelSection>
          <PanelSection
            title="Viewpoints"
            storageKey="atrvisu.panelSection.viewpoints.v1"
            defaultExpanded={false}
            badge={viewpoints.length > 0 ? `${viewpoints.length}` : undefined}
          >
            <ViewpointsPanel
              viewpoints={viewpoints}
              selectedViewpointId={selectedViewpointId}
              onSelectViewpoint={setSelectedViewpointId}
              onCaptureViewpoint={captureViewpoint}
              onApplyViewpoint={applyViewpoint}
              onUpdateViewpoint={updateSelectedViewpointFromCurrentView}
              onRenameViewpoint={renameViewpoint}
              onDeleteViewpoint={removeViewpoint}
              onStepViewpoint={stepViewpoint}
            />
          </PanelSection>
          <PanelSection
            title="Layers"
            storageKey="atrvisu.panelSection.layers.v1"
            defaultExpanded={false}
            badge={layers.length > 1 ? `${layers.length}` : undefined}
          >
            <LayersPanel
              layers={layers}
              placedMachines={placedMachines}
              annotations={annotations}
              civilReferences={civilReferences}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onAddLayer={addLayer}
              onRenameLayer={renameLayer}
              onDeleteLayer={removeLayer}
              onToggleVisibility={toggleLayerVisibility}
              onToggleLocked={toggleLayerLocked}
              onIsolateLayer={isolateSelectedLayer}
              onShowAllLayers={showAllLayoutLayers}
            />
          </PanelSection>
          <PanelSection
            title="Building / Civil"
            storageKey="atrvisu.panelSection.civilReferences.v1"
            defaultExpanded={false}
            badge={civilReferences.length > 0 ? `${civilReferences.length}` : undefined}
          >
            <CivilReferencePanel onAddCivilReference={addCivilReference} />
          </PanelSection>
          <PanelSection
            title="Assembly Tree"
            storageKey="atrvisu.panelSection.assemblyTree.v1"
            defaultExpanded={false}
            badge={groups.length > 0 ? `${groups.length}` : undefined}
          >
            <AssemblyTreePanel
              groups={groups}
              placedMachines={placedMachines}
              civilReferences={civilReferences}
              selectedGroupId={selectedGroupId}
              activeGroupEditId={activeGroupEditId}
              explicitSelectedEntityCount={explicitSelectedAlignableEntityIds.length}
              removableSelectedEntityCount={removableActiveGroupEntityIds.length}
              onCreateGroupFromSelection={createGroupFromSelection}
              onAddSelectionToGroup={addSelectionToGroup}
              onRemoveSelectionFromGroup={removeSelectionFromGroup}
              onRenameGroup={renameObjectGroup}
              onEnterGroupEdit={(groupId) => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.enterEdit, groupId)}
              onExitGroupEdit={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.exitEdit)}
              onUngroup={(groupId) => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.ungroup, groupId)}
              onSelectGroup={selectObjectGroup}
              onToggleGroupCollapsed={toggleGroupCollapsed}
            />
          </PanelSection>
          <PanelSection
            title="Project Manager"
            storageKey="atrvisu.panelSection.projectManager.v1"
            defaultExpanded
            badge={hasUnsavedProjectChanges ? "Unsaved" : currentRevision?.revisionCode ?? "None"}
          >
            <section className="project-status-panel" aria-label="Current project status">
              <div className="property-readout">
                <span>Current Project</span>
                <strong>{currentProject?.projectName ?? "None"}</strong>
              </div>
              <div className="property-readout">
                <span>Current Layout</span>
                <strong>{currentLayout?.layoutName ?? "None"}</strong>
              </div>
              <div className="property-readout">
                <span>Current Revision</span>
                <strong>{currentRevision?.revisionCode ?? "None"}</strong>
              </div>
              <div className={`project-dirty-state${hasUnsavedProjectChanges ? " is-dirty" : ""}`}>
                {isProjectStorageLoading
                  ? "Loading project storage"
                  : projectStorageError
                    ? "Project storage unavailable"
                    : hasUnsavedProjectChanges
                      ? "Unsaved changes"
                      : "No unsaved project changes"}
              </div>
              {projectStorageError ? <p className="manager-validation">{projectStorageError}</p> : null}
              <button
                className="manager-open-button"
                data-testid="open-project-manager"
                type="button"
                disabled={isProjectStorageLoading}
                onClick={() => {
                  void refreshProjects();
                  setIsProjectManagerOpen(true);
                }}
              >
                Project Manager
              </button>
            </section>
          </PanelSection>
          <PanelSection
            title="Performance Benchmark"
            storageKey="atrvisu.panelSection.performanceBenchmark.v1"
            defaultExpanded={false}
            badge={isBenchmarkMode ? "Benchmark" : undefined}
          >
            <section className="project-status-panel" aria-label="Performance benchmark entry">
              <p className="collision-note">
                Optional scene diagnostics for FPS, mesh counts, and snapshot size.
              </p>
              <button
                className="manager-open-button"
                data-testid="open-performance-benchmark"
                type="button"
                onClick={() => setIsPerformanceBenchmarkOpen(true)}
              >
                Performance Benchmark
              </button>
            </section>
          </PanelSection>
          <PanelSection
            title="Simulation Controls"
            storageKey="atrvisu.panelSection.simulationControls.v1"
            defaultExpanded={false}
            badge={isSimulationRunning ? "Running" : undefined}
          >
            <SimulationControls
              isRunning={isSimulationRunning}
              speed={simulationSpeed}
              onToggleRunning={() => setIsSimulationRunning((current) => !current)}
              onChangeSpeed={setSimulationSpeed}
            />
          </PanelSection>
          <PanelSection
            title="Annotations"
            storageKey="atrvisu.panelSection.annotations.v1"
            defaultExpanded={false}
            badge={annotations.length > 0 ? `${annotations.length}` : undefined}
            expandSignal={editingAnnotationId ? annotationSelectionSignal : null}
          >
            <AnnotationsPanel
              annotations={annotations}
              selectedAnnotationId={editingAnnotationId}
              placedMachines={placedMachines}
              layers={layers}
              isSelectedAnnotationLocked={selectedAnnotationLocked}
              onAddAnnotation={addAnnotation}
              onSelectAnnotation={selectAnnotationForEditing}
              onUpdateAnnotation={updateSelectedAnnotation}
              onChangeAnnotationLayer={changeAnnotationLayer}
              onCommitAnnotationEdit={commitAnnotationEdit}
              onDeleteAnnotation={executeDeleteSelectedCommand}
            />
          </PanelSection>
          <PanelSection
            title="Precision Placement"
            storageKey="atrvisu.panelSection.precisionPlacement.v1"
            defaultExpanded
            badge={placementSettings.gridSnapEnabled ? `${placementSettings.gridSnapStepMm} mm` : "Free"}
          >
            <PrecisionPlacementPanel
              settings={placementSettings}
              placedMachines={placedMachines}
              selectedMachine={singleSelectedMachine}
              onChangeSettings={setPlacementSettings}
              onUpdateMachine={updateMachine}
            />
          </PanelSection>
          <PanelSection
            title="Alignment Tools"
            storageKey="atrvisu.panelSection.alignmentTools.v1"
            defaultExpanded={false}
            badge={selectedAlignableEntities.length >= 2 ? `${selectedAlignableEntities.length}` : undefined}
          >
            <AlignmentToolsPanel
              selectedEntityCount={selectedAlignableEntities.length}
              primarySelectionLabel={primarySelectedAlignable?.label}
              nudgeSettings={nudgeSettings}
              onAlign={applyAlignmentAction}
              onDistribute={applyDistributionAction}
              onEqualGap={applyEqualGapAction}
              onPairAlign={applyPairAlignmentAction}
              onPairAnchorSnap={applyPairAnchorSnap}
              onChangeNudgeSettings={setNudgeSettings}
            />
          </PanelSection>
          {selectedMachineIds.length === 2 && !selectedGroupId ? (
            <PanelSection
              title="Connection Point Snap"
              storageKey="atrvisu.panelSection.connectionPointSnap.v1"
              defaultExpanded
              badge="2"
            >
              <ConnectionPointSnapPanel
                selectedMachines={selectedMachines}
                primarySelectedMachine={selectedMachine}
                onSnap={applyConnectionSnap}
                onClearSelection={clearSelection}
              />
            </PanelSection>
          ) : null}
          <PanelSection
            title="Display / Overlay Controls"
            storageKey="atrvisu.panelSection.overlayControls.v1"
            defaultExpanded={false}
          >
            <DisplayOverlayControls settings={overlaySettings} onChange={setOverlaySettings} />
          </PanelSection>
          <PanelSection
            title="Collision Check"
            storageKey="atrvisu.panelSection.collisionCheck.v1"
            defaultExpanded
            badge={collisionSettings.enabled ? `${collisionResult.pairs.length}` : "Off"}
          >
            <CollisionCheckPanel
              settings={collisionSettings}
              result={collisionResult}
              onChange={setCollisionSettings}
            />
          </PanelSection>
          {!editingAnnotationId ? (
            <PanelSection
              title={selectedGroup ? "Assembly Properties" : selectedCivilReference ? "Civil Reference Properties" : selectedAlignableEntities.length > 1 ? "Multi-Selection" : "Selected Object Properties"}
              storageKey="atrvisu.panelSection.properties.v1"
              defaultExpanded={selectedAlignableEntities.length > 0 || Boolean(selectedCivilReference) || Boolean(selectedGroup)}
              badge={selectedGroup ? selectedGroup.name : selectedCivilReference ? selectedCivilReference.name : selectedAlignableEntities.length > 1 ? `${selectedAlignableEntities.length}` : selectedMachine ? selectedMachine.definition.name : "None"}
            >
              {selectedGroup && (selectedCivilReferenceIds.length > 0 || selectedMachineIds.length <= 1) ? (
                <div className="property-grid" data-testid="assembly-properties-panel">
                  <div className="property-readout">
                    <span>Assembly</span>
                    <strong>{selectedGroup.name}</strong>
                  </div>
                  <div className="property-readout">
                    <span>Members</span>
                    <strong>{selectedAlignableEntities.length}</strong>
                  </div>
                  <div className="property-readout">
                    <span>Mode</span>
                    <strong>{activeGroupEditId === selectedGroup.id ? "Editing members" : "Rigid assembly"}</strong>
                  </div>
                  <div className="selection-actions">
                    {activeGroupEditId === selectedGroup.id ? (
                      <button type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.exitEdit)}>
                        Exit Group Edit
                      </button>
                    ) : (
                      <button type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.enterEdit, selectedGroup.id)}>
                        Edit Group
                      </button>
                    )}
                    <button className="danger-action" type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.ungroup, selectedGroup.id)}>
                      Ungroup
                    </button>
                  </div>
                </div>
              ) : selectedCivilReference ? (
                <CivilReferenceProperties
                  selectedCivilReference={selectedCivilReference}
                  layers={layers}
                  isLocked={selectedCivilReferenceLocked}
                  onUpdateCivilReference={updateSelectedCivilReference}
                  onChangeLayer={changeCivilReferenceLayer}
                  onDeleteCivilReference={executeDeleteSelectedCommand}
                />
              ) : selectedMachineIds.length > 1 && selectedCivilReferenceIds.length === 0 ? (
                <MultiSelectionProperties
                  selectedMachines={selectedMachines}
                  assemblyName={selectedGroup?.name}
                  primarySelectedMachine={selectedMachine}
                  selectionBounds={selectionBounds}
                  onAlign={applyAlignmentAction}
                  onDistribute={applyDistributionAction}
                  onEqualGap={applyEqualGapAction}
                  canDuplicateSelected={canExecuteDuplicateSelectedCommand}
                  onDuplicateSelected={executeDuplicateSelectedCommand}
                  onClearSelection={clearSelection}
                  onDeleteSelected={executeDeleteSelectedCommand}
                  canArrangeSelection={!selectedGroup}
                />
              ) : selectedAlignableEntities.length > 1 ? (
                <div className="property-grid">
                  <div className="property-readout">
                    <span>{selectedGroup ? "Assembly" : "Selected entities"}</span>
                    <strong>{selectedGroup?.name ?? selectedAlignableEntities.length}</strong>
                  </div>
                  <p className="collision-note">Use Alignment Tools to align the selected machines and civil references.</p>
                  <button type="button" onClick={clearSelection}>
                    Clear Selection
                  </button>
                </div>
              ) : (
                <MachineProperties
                  selectedMachine={singleSelectedMachine}
                  layers={layers}
                  isLocked={selectedMachineLocked}
                  placementSettings={placementSettings}
                  visualDiagnostics={selectedVisualDiagnostics}
                  collisionPairs={selectedCollisionPairs}
                  onUpdateMachine={updateMachine}
                  onChangeLayer={changeMachineLayer}
                  onDuplicateSelected={executeDuplicateSelectedCommand}
                  onDeleteSelected={executeDeleteSelectedCommand}
                />
              )}
            </PanelSection>
          ) : null}
        </aside>
      )}
      modalLayer={(
        <>
          {isProjectManagerOpen ? (
            <ProjectManager
              projects={projects}
              currentProjectId={currentProjectId}
              currentLayoutId={currentLayoutId}
              currentRevisionId={currentRevisionId}
              currentSnapshot={createLayoutSnapshot()}
              hasSceneObjects={placedMachines.length > 0 || civilReferences.length > 0}
              isDirty={hasUnsavedProjectChanges}
              onClose={() => setIsProjectManagerOpen(false)}
              onProjectsChanged={setProjects}
              onCurrentSelectionChange={(projectId, layoutId, revisionId) => {
                setCurrentProjectId(projectId);
                setCurrentLayoutId(layoutId);
                setCurrentRevisionId(revisionId);
              }}
              onLoadRevision={loadRevisionSnapshot}
              onSavedRevision={(projectId, layoutId, revisionId) => {
                setCurrentProjectId(projectId);
                setCurrentLayoutId(layoutId);
                setCurrentRevisionId(revisionId);
                void refreshProjects();
                setHasUnsavedProjectChanges(false);
              }}
            />
          ) : null}
          {isPerformanceBenchmarkOpen ? (
            <PerformanceBenchmarkModal
              currentSnapshot={createLayoutSnapshot()}
              latestMetrics={latestPerformanceMetrics}
              onApplyBenchmarkScene={applyBenchmarkMachines}
              onRestoreScene={restoreBenchmarkSnapshot}
              onClearBenchmarkScene={clearBenchmarkScene}
              onClose={() => setIsPerformanceBenchmarkOpen(false)}
            />
          ) : null}
        </>
      )}
    />
  );
}
