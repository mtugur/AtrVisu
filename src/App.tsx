import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BabylonScene } from "./components/BabylonScene";
import { CollisionCheckPanel } from "./components/CollisionCheckPanel";
import { ConnectionPointSnapPanel } from "./components/ConnectionPointSnapPanel";
import { DisplayOverlayControls } from "./components/DisplayOverlayControls";
import { AlignmentToolsPanel } from "./components/AlignmentToolsPanel";
import { LayoutControls } from "./components/LayoutControls";
import { MachineLibrary } from "./components/MachineLibrary";
import { MachineProperties } from "./components/MachineProperties";
import { MultiSelectionProperties } from "./components/MultiSelectionProperties";
import { PanelSection } from "./components/PanelSection";
import { PrecisionPlacementPanel } from "./components/PrecisionPlacementPanel";
import { PerformanceBenchmarkModal } from "./components/PerformanceBenchmarkModal";
import { ProjectManager } from "./components/ProjectManager";
import { SimulationControls } from "./components/SimulationControls";
import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "./types/machine";
import type { AlignmentAction, DistributionAction, EqualGapAction, FootprintAnchor, PairAlignmentAction } from "./types/alignment";
import type { NudgeSettings, SelectionMode } from "./types/selection";
import type { VisualModelDiagnostics } from "./types/overlays";
import type { AtrVisuProject } from "./types/project";
import type { ScenePerformanceMetrics } from "./types/performance";
import type { MachineConnectionPoint } from "./types/ataraMachineData";
import { checkAllObjectCollisions } from "./utils/collision";
import { loadCollisionSettings, saveCollisionSettings } from "./utils/collisionSettings";
import { normalizeMachineDefinitionDimensions } from "./utils/machineDimensions";
import { createLayoutSnapshotFromMachines, placedMachinesFromLayout } from "./utils/layoutSerialization";
import { loadOverlaySettings, saveOverlaySettings } from "./utils/overlaySettings";
import { applyPositionSnap, applyRotationSnap, getMachinePlanPositionMm } from "./utils/placement";
import {
  alignObjectsToAnchor,
  applyMachinePositionUpdates,
  applyPairAlignment,
  distributeObjectsByCenter,
  equalizeGaps,
  moveObjectsByDelta,
  snapPrimaryAnchorToSecondaryAnchor
} from "./utils/alignment";
import { createLayoutHistory, pushHistorySnapshot, redoHistory, undoHistory } from "./utils/layoutHistory";
import { loadPlacementSettings, savePlacementSettings } from "./utils/placementSettings";
import { listProjects } from "./utils/projectStorage";
import { initializeProjectStorage } from "./utils/storage/storageMigration";
import { metersToMm, mmToMeters } from "./utils/units";
import { normalizeMachineVisualModel } from "./utils/visualModel";
import { getSelectionPlanBounds } from "./utils/selectionBounds";
import { applyConnectionPointSnap, type ConnectionPointSnapSelection } from "./utils/connectionPointSnap";

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

const isTextEntryTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

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
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [primarySelectedMachineId, setPrimarySelectedMachineId] = useState<string | null>(null);
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
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);

  const selectedMachineId = primarySelectedMachineId;
  const selectedMachine = placedMachines.find((machine) => machine.instanceId === selectedMachineId);
  const singleSelectedMachine = selectedMachineIds.length === 1 ? selectedMachine : undefined;
  const selectedMachineIdSet = useMemo(() => new Set(selectedMachineIds), [selectedMachineIds]);
  const selectedMachines = useMemo(
    () => placedMachines.filter((machine) => selectedMachineIdSet.has(machine.instanceId)),
    [placedMachines, selectedMachineIdSet]
  );
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
    () => checkAllObjectCollisions(placedMachines, collisionSettings.enabled),
    [collisionSettings.enabled, placedMachines]
  );
  const selectedCollisionPairs = selectedMachineId
    ? collisionResult.pairs.filter(
        (pair) => pair.objectAId === selectedMachineId || pair.objectBId === selectedMachineId
      )
    : [];

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
    const activeIds = new Set(placedMachines.map((machine) => machine.instanceId));
    const nextSelection = selectedMachineIds.filter((id) => activeIds.has(id));
    const nextPrimary = primarySelectedMachineId && activeIds.has(primarySelectedMachineId)
      ? primarySelectedMachineId
      : nextSelection[nextSelection.length - 1] ?? null;

    if (nextSelection.length !== selectedMachineIds.length) {
      setSelectedMachineIds(nextSelection);
    }
    if (nextPrimary !== primarySelectedMachineId) {
      setPrimarySelectedMachineId(nextPrimary);
    }
  }, [placedMachines, primarySelectedMachineId, selectedMachineIds]);

  useEffect(() => {
    isBenchmarkModeRef.current = isBenchmarkMode;
  }, [isBenchmarkMode]);

  useEffect(() => {
    placedMachinesRef.current = placedMachines;
  }, [placedMachines]);

  const recordLayoutHistory = useCallback(() => {
    if (isBenchmarkModeRef.current) {
      return;
    }
    setLayoutHistory((current) => pushHistorySnapshot(current, placedMachinesRef.current));
  }, []);

  const clearLayoutHistory = useCallback(() => {
    setLayoutHistory(createLayoutHistory());
  }, []);

  const markLayoutChanged = useCallback((options: { recordHistory?: boolean } = {}) => {
    if (options.recordHistory !== false) {
      recordLayoutHistory();
    }
    if (!isBenchmarkModeRef.current) {
      setHasUnsavedProjectChanges(true);
    }
  }, [recordLayoutHistory]);

  const undoLayoutChange = useCallback(() => {
    setLayoutHistory((current) => {
      const result = undoHistory(current, placedMachinesRef.current);
      if (!result) {
        return current;
      }
      setPlacedMachines(result.machines);
      setHasUnsavedProjectChanges(true);
      return result.history;
    });
  }, []);

  const redoLayoutChange = useCallback(() => {
    setLayoutHistory((current) => {
      const result = redoHistory(current, placedMachinesRef.current);
      if (!result) {
        return current;
      }
      setPlacedMachines(result.machines);
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
      createLayoutSnapshotFromMachines(placedMachines, exportedAt),
    [placedMachines]
  );

  const clearSelection = useCallback(() => {
    setSelectedMachineIds([]);
    setPrimarySelectedMachineId(null);
  }, []);

  const selectMachine = useCallback((instanceId: string | null, mode: SelectionMode = "replace") => {
    if (!instanceId || mode === "clear") {
      clearSelection();
      return;
    }

    if (mode === "toggle") {
      setSelectedMachineIds((current) => {
        const isAlreadySelected = current.includes(instanceId);
        const nextSelection = isAlreadySelected
          ? current.filter((id) => id !== instanceId)
          : [...current, instanceId];
        setPrimarySelectedMachineId(isAlreadySelected ? nextSelection[nextSelection.length - 1] ?? null : instanceId);
        return nextSelection;
      });
      return;
    }

    setSelectedMachineIds([instanceId]);
    setPrimarySelectedMachineId(instanceId);
  }, [clearSelection]);

  const replaceSelection = useCallback((ids: string[], primaryId: string | null = ids[ids.length - 1] ?? null) => {
    setSelectedMachineIds(ids);
    setPrimarySelectedMachineId(primaryId);
  }, []);

  const addMachine = useCallback((selection: { libraryId: string; definition: MachineDefinition }) => {
    const { libraryId } = selection;
    const definition = normalizeMachineVisualModel(normalizeMachineDefinitionDimensions(selection.definition));
    const instanceId = `${definition.id}-${Date.now()}-${Math.round(Math.random() * 10000)}`;

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
          position,
          positionMm: {
            xMm: metersToMm(position.x),
            yMm: metersToMm(position.z)
          },
          elevationMm: 0,
          rotationDeg: 0,
          rotationY: 0,
          flowDirection: "forward"
        }
      ];
    });
    replaceSelection([instanceId], instanceId);
  }, [markLayoutChanged, replaceSelection]);

  const updateMachine = useCallback((
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>,
    options: { snapPosition?: boolean; snapRotation?: boolean } = {}
  ) => {
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

    markLayoutChanged();
    setPlacedMachines(importedMachines);
    clearSelection();
  }, [clearSelection, markLayoutChanged]);

  const applyBenchmarkMachines = useCallback((machines: PlacedMachine[]) => {
    setIsBenchmarkMode(true);
    setPlacedMachines(machines);
    clearSelection();
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const restoreBenchmarkSnapshot = useCallback((snapshot: AtrVisuLayout) => {
    const importedMachines = placedMachinesFromLayout(snapshot);
    setPlacedMachines(importedMachines);
    clearSelection();
    setIsBenchmarkMode(false);
    setHasUnsavedProjectChanges(false);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const clearBenchmarkScene = useCallback(() => {
    setPlacedMachines([]);
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
    setPlacedMachines(importedMachines);
    clearSelection();
    setCurrentProjectId(projectId);
    setCurrentLayoutId(layoutId);
    setCurrentRevisionId(revisionId);
    void refreshProjects();
    setHasUnsavedProjectChanges(false);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection, refreshProjects]);

  const setMachinePositions = useCallback((
    updates: Array<{ instanceId: string; xMm: number; yMm: number }>,
    options: { recordHistory?: boolean } = {}
  ) => {
    if (updates.length === 0) {
      return;
    }

    markLayoutChanged(options);
    setPlacedMachines((current) => {
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
        return applyMachinePositionUpdates(current, updates);
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
    });
  }, [markLayoutChanged]);

  const moveSelectedByDelta = useCallback((
    deltaXMm: number,
    deltaYMm: number,
    options: { recordHistory?: boolean } = {}
  ) => {
    if (selectedMachineIds.length === 0) {
      return;
    }

    markLayoutChanged(options);
    setPlacedMachines((current) => moveObjectsByDelta(current, selectedMachineIds, deltaXMm, deltaYMm));
  }, [markLayoutChanged, selectedMachineIds]);

  const applyAlignmentAction = useCallback((action: AlignmentAction) => {
    markLayoutChanged();
    setPlacedMachines((current) => alignObjectsToAnchor(current, selectedMachineIds, primarySelectedMachineId, action));
  }, [markLayoutChanged, primarySelectedMachineId, selectedMachineIds]);

  const applyDistributionAction = useCallback((action: DistributionAction) => {
    markLayoutChanged();
    setPlacedMachines((current) => distributeObjectsByCenter(current, selectedMachineIds, action));
  }, [markLayoutChanged, selectedMachineIds]);

  const applyEqualGapAction = useCallback((action: EqualGapAction) => {
    markLayoutChanged();
    setPlacedMachines((current) => equalizeGaps(current, selectedMachineIds, action));
  }, [markLayoutChanged, selectedMachineIds]);

  const applyPairAlignmentAction = useCallback((action: PairAlignmentAction, gapMm = 0) => {
    markLayoutChanged();
    setPlacedMachines((current) =>
      applyPairAlignment(current, selectedMachineIds, primarySelectedMachineId, action, gapMm)
    );
  }, [markLayoutChanged, primarySelectedMachineId, selectedMachineIds]);

  const applyPairAnchorSnap = useCallback((primaryAnchor: FootprintAnchor, secondaryAnchor: FootprintAnchor) => {
    markLayoutChanged();
    setPlacedMachines((current) =>
      snapPrimaryAnchorToSecondaryAnchor(
        current,
        selectedMachineIds,
        primarySelectedMachineId,
        primaryAnchor,
        secondaryAnchor
      )
    );
  }, [markLayoutChanged, primarySelectedMachineId, selectedMachineIds]);

  const applyConnectionSnap = useCallback((
    selection: ConnectionPointSnapSelection,
    movingPoint: MachineConnectionPoint,
    fixedPoint: MachineConnectionPoint
  ) => {
    markLayoutChanged();
    setPlacedMachines((current) => applyConnectionPointSnap(current, selection, movingPoint, fixedPoint));
  }, [markLayoutChanged]);

  const deleteSelectedMachines = useCallback(() => {
    if (selectedMachineIds.length === 0) {
      return;
    }

    const selectedNames = selectedMachines.map((machine) => machine.definition.name);
    const label = selectedMachineIds.length === 1
      ? selectedNames[0] ?? "the selected object"
      : `${selectedMachineIds.length} selected objects`;
    const confirmed = window.confirm(`Delete ${label} from the layout?`);
    if (!confirmed) {
      return;
    }

    markLayoutChanged();
    const ids = new Set(selectedMachineIds);
    setPlacedMachines((current) => current.filter((machine) => !ids.has(machine.instanceId)));
    clearSelection();
  }, [clearSelection, markLayoutChanged, selectedMachineIds, selectedMachines]);

  useEffect(() => {
    try {
      const rawLayout = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!rawLayout) {
        setAutosaveReady(true);
        return;
      }

      const parsedLayout = JSON.parse(rawLayout) as AtrVisuLayout;
      if (parsedLayout.appName === "AtrVisu" && parsedLayout.version === 1 && parsedLayout.objects.length > 0) {
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
        if (placedMachines.length === 0) {
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
  }, [autosaveReady, createLayoutSnapshot, isBenchmarkMode, placedMachines.length]);

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
      if (isTextEntryTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoLayoutChange();
        } else {
          undoLayoutChange();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redoLayoutChange();
        return;
      }

      if (event.key === "Escape" && selectedMachineIds.length > 0) {
        event.preventDefault();
        clearSelection();
        return;
      }

      if (event.key === "Delete" && selectedMachineIds.length > 0) {
        event.preventDefault();
        deleteSelectedMachines();
        return;
      }

      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || selectedMachineIds.length === 0) {
        return;
      }

      const step = event.shiftKey
        ? nudgeSettings.largeNudgeStepMm
        : event.altKey || event.ctrlKey
          ? nudgeSettings.smallNudgeStepMm
          : nudgeSettings.nudgeStepMm;
      const delta = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step }
      }[event.key];

      if (delta) {
        event.preventDefault();
        moveSelectedByDelta(delta.x, delta.y);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clearSelection,
    deleteSelectedMachines,
    moveSelectedByDelta,
    nudgeSettings,
    redoLayoutChange,
    selectedMachineIds.length,
    undoLayoutChange
  ]);

  return (
    <>
    <main className="app-shell" data-testid="app-root">
      <BabylonScene
        placedMachines={placedMachines}
        selectedMachineIds={selectedMachineIds}
        primarySelectedMachineId={primarySelectedMachineId}
        onSelectMachine={selectMachine}
        onUpdateMachine={updateMachine}
        onSetMachinePositions={setMachinePositions}
        onBeginObjectDrag={recordLayoutHistory}
        isSimulationRunning={isSimulationRunning}
        simulationSpeed={simulationSpeed}
        overlaySettings={overlaySettings}
        collisionResult={collisionResult}
        onVisualDiagnosticsChange={(diagnostics) =>
          setVisualDiagnostics((current) => ({
            ...current,
            [diagnostics.instanceId]: diagnostics
          }))
        }
        onPerformanceMetricsChange={setLatestPerformanceMetrics}
      />
      {isPanelCollapsed ? (
        <button
          className="panel-reopen-tab"
          type="button"
          aria-label="Open right panel"
          onClick={() => setIsPanelCollapsed(false)}
        >
          Panel
        </button>
      ) : (
        <aside
          className="machine-panel"
          data-testid="right-panel"
          style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
          aria-label="Machine library, layout, and properties"
        >
          <button
            className="panel-resize-handle"
            type="button"
            aria-label="Resize right panel"
            onPointerDown={startPanelResize}
          />
          <div className="panel-toolbar">
            <span>AtrVisu Tools</span>
            <div className="toolbar-button-group" aria-label="Undo and redo">
              <button type="button" disabled={!canUndo} onClick={undoLayoutChange}>
                Undo
              </button>
              <button type="button" disabled={!canRedo} onClick={redoLayoutChange}>
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
            badge={selectedMachineIds.length >= 2 ? `${selectedMachineIds.length}` : undefined}
          >
            <AlignmentToolsPanel
              selectedMachines={selectedMachines}
              primarySelectedMachine={selectedMachine}
              nudgeSettings={nudgeSettings}
              onAlign={applyAlignmentAction}
              onDistribute={applyDistributionAction}
              onEqualGap={applyEqualGapAction}
              onPairAlign={applyPairAlignmentAction}
              onPairAnchorSnap={applyPairAnchorSnap}
              onChangeNudgeSettings={setNudgeSettings}
            />
          </PanelSection>
          {selectedMachineIds.length === 2 ? (
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
          <PanelSection
            title={selectedMachineIds.length > 1 ? "Multi-Selection" : "Selected Object Properties"}
            storageKey="atrvisu.panelSection.properties.v1"
            defaultExpanded={selectedMachineIds.length > 0}
            badge={selectedMachineIds.length > 1 ? `${selectedMachineIds.length}` : selectedMachine ? selectedMachine.definition.name : "None"}
          >
            {selectedMachineIds.length > 1 ? (
              <MultiSelectionProperties
                selectedMachines={selectedMachines}
                primarySelectedMachine={selectedMachine}
                selectionBounds={selectionBounds}
                onClearSelection={clearSelection}
                onDeleteSelected={deleteSelectedMachines}
              />
            ) : (
              <MachineProperties
                selectedMachine={singleSelectedMachine}
                placementSettings={placementSettings}
                visualDiagnostics={selectedVisualDiagnostics}
                collisionPairs={selectedCollisionPairs}
                onUpdateMachine={updateMachine}
                onDeleteSelected={deleteSelectedMachines}
              />
            )}
          </PanelSection>
        </aside>
      )}
    </main>
    {isProjectManagerOpen ? (
      <ProjectManager
        projects={projects}
        currentProjectId={currentProjectId}
        currentLayoutId={currentLayoutId}
        currentRevisionId={currentRevisionId}
        currentSnapshot={createLayoutSnapshot()}
        hasSceneObjects={placedMachines.length > 0}
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
  );
}
