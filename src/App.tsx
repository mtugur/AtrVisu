import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BabylonScene } from "./components/BabylonScene";
import { DisplayOverlayControls } from "./components/DisplayOverlayControls";
import { LayoutControls } from "./components/LayoutControls";
import { MachineLibrary } from "./components/MachineLibrary";
import { MachineProperties } from "./components/MachineProperties";
import { PanelSection } from "./components/PanelSection";
import { SimulationControls } from "./components/SimulationControls";
import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "./types/machine";
import type { VisualModelDiagnostics } from "./types/overlays";
import { normalizeMachineDefinitionDimensions } from "./utils/machineDimensions";
import { createLayoutSnapshotFromMachines, placedMachinesFromLayout } from "./utils/layoutSerialization";
import { loadOverlaySettings, saveOverlaySettings } from "./utils/overlaySettings";
import { metersToMm, mmToMeters } from "./utils/units";
import { normalizeMachineVisualModel } from "./utils/visualModel";

const PLACEMENT_COLUMNS = 3;
const PLACEMENT_SPACING = 7;
const PLACEMENT_ORIGIN = { x: -8, z: -6 };
const AUTOSAVE_KEY = "atrvisu.autosavedLayout.v1";
const AUTOSAVE_DELAY_MS = 500;
const PANEL_WIDTH_KEY = "atrvisu.rightPanelWidth.v1";
const PANEL_COLLAPSED_KEY = "atrvisu.rightPanelCollapsed.v1";
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 360;

export function App() {
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [recoveryLayout, setRecoveryLayout] = useState<AtrVisuLayout | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [overlaySettings, setOverlaySettings] = useState(loadOverlaySettings);
  const [visualDiagnostics, setVisualDiagnostics] = useState<Record<string, VisualModelDiagnostics>>({});
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

  const selectedMachine = placedMachines.find((machine) => machine.instanceId === selectedMachineId);
  const selectedVisualDiagnostics = selectedMachineId ? visualDiagnostics[selectedMachineId] : undefined;

  useEffect(() => {
    try {
      saveOverlaySettings(overlaySettings);
    } catch {
      // Display preferences are best-effort only.
    }
  }, [overlaySettings]);

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

  const addMachine = useCallback((selection: { libraryId: string; definition: MachineDefinition }) => {
    const { libraryId } = selection;
    const definition = normalizeMachineVisualModel(normalizeMachineDefinitionDimensions(selection.definition));
    const instanceId = `${definition.id}-${Date.now()}-${Math.round(Math.random() * 10000)}`;

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
    setSelectedMachineId(instanceId);
  }, []);

  const updateMachine = useCallback((
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>
  ) => {
    setPlacedMachines((current) =>
      current.map((machine) => {
        if (machine.instanceId !== instanceId) {
          return machine;
        }

        const nextPosition = updates.position ?? (
          updates.positionMm
            ? { x: mmToMeters(updates.positionMm.xMm), z: mmToMeters(updates.positionMm.yMm) }
            : machine.position
        );
        const nextRotationY = updates.rotationY ?? updates.rotationDeg ?? machine.rotationY;

        return {
          ...machine,
          ...updates,
          position: nextPosition,
          positionMm: updates.positionMm ?? {
            xMm: metersToMm(nextPosition.x),
            yMm: metersToMm(nextPosition.z)
          },
          rotationY: nextRotationY,
          rotationDeg: updates.rotationDeg ?? updates.rotationY ?? machine.rotationDeg ?? machine.rotationY
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

    setPlacedMachines(importedMachines);
    setSelectedMachineId(importedMachines[0]?.instanceId ?? null);
  }, []);

  const deleteSelectedMachine = useCallback(() => {
    if (!selectedMachine) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedMachine.definition.name} from the layout?`);
    if (!confirmed) {
      return;
    }

    setPlacedMachines((current) => current.filter((machine) => machine.instanceId !== selectedMachine.instanceId));
    setSelectedMachineId(null);
  }, [selectedMachine]);

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
  }, [autosaveReady, createLayoutSnapshot, placedMachines.length]);

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
      if (event.key !== "Delete" || !selectedMachine) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      deleteSelectedMachine();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelectedMachine, selectedMachine]);

  return (
    <main className="app-shell" data-testid="app-root">
      <BabylonScene
        placedMachines={placedMachines}
        selectedMachineId={selectedMachineId}
        onSelectMachine={setSelectedMachineId}
        onUpdateMachine={updateMachine}
        isSimulationRunning={isSimulationRunning}
        simulationSpeed={simulationSpeed}
        overlaySettings={overlaySettings}
        onVisualDiagnosticsChange={(diagnostics) =>
          setVisualDiagnostics((current) => ({
            ...current,
            [diagnostics.instanceId]: diagnostics
          }))
        }
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
            title="Display / Overlay Controls"
            storageKey="atrvisu.panelSection.overlayControls.v1"
            defaultExpanded={false}
          >
            <DisplayOverlayControls settings={overlaySettings} onChange={setOverlaySettings} />
          </PanelSection>
          <PanelSection
            title="Selected Object Properties"
            storageKey="atrvisu.panelSection.properties.v1"
            defaultExpanded={Boolean(selectedMachine)}
            badge={selectedMachine ? selectedMachine.definition.name : "None"}
          >
            <MachineProperties
              selectedMachine={selectedMachine}
              visualDiagnostics={selectedVisualDiagnostics}
              onUpdateMachine={updateMachine}
              onDeleteSelected={deleteSelectedMachine}
            />
          </PanelSection>
        </aside>
      )}
    </main>
  );
}
