import { useCallback, useEffect, useState } from "react";
import { BabylonScene } from "./components/BabylonScene";
import { LayoutControls } from "./components/LayoutControls";
import { MachineLibrary } from "./components/MachineLibrary";
import { MachineProperties } from "./components/MachineProperties";
import { SimulationControls } from "./components/SimulationControls";
import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "./types/machine";

const PLACEMENT_COLUMNS = 3;
const PLACEMENT_SPACING = 7;
const PLACEMENT_ORIGIN = { x: -8, z: -6 };
const AUTOSAVE_KEY = "atrvisu.autosavedLayout.v1";
const AUTOSAVE_DELAY_MS = 500;

export function App() {
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [recoveryLayout, setRecoveryLayout] = useState<AtrVisuLayout | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  const selectedMachine = placedMachines.find((machine) => machine.instanceId === selectedMachineId);

  const createLayoutSnapshot = useCallback(
    (exportedAt = new Date().toISOString()): AtrVisuLayout => ({
      appName: "AtrVisu",
      version: 1,
      exportedAt,
      objects: placedMachines.map((machine) => ({
        id: machine.instanceId,
        machineDefinitionId: machine.definition.id,
        name: machine.definition.name,
        category: machine.definition.category,
        width: machine.definition.width,
        depth: machine.definition.depth,
        height: machine.definition.height,
        positionX: machine.position.x,
        positionZ: machine.position.z,
        rotationY: machine.rotationY,
        defaultColor: machine.definition.defaultColor,
        flowDirection: machine.flowDirection
      }))
    }),
    [placedMachines]
  );

  const addMachine = useCallback((definition: MachineDefinition) => {
    const instanceId = `${definition.id}-${Date.now()}-${Math.round(Math.random() * 10000)}`;

    setPlacedMachines((current) => {
      const index = current.length;
      const column = index % PLACEMENT_COLUMNS;
      const row = Math.floor(index / PLACEMENT_COLUMNS);

      return [
        ...current,
        {
          instanceId,
          definition,
          position: {
            x: PLACEMENT_ORIGIN.x + column * PLACEMENT_SPACING,
            z: PLACEMENT_ORIGIN.z + row * PLACEMENT_SPACING
          },
          rotationY: 0,
          flowDirection: "forward"
        }
      ];
    });
    setSelectedMachineId(instanceId);
  }, []);

  const updateMachine = useCallback((
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "rotationY" | "flowDirection">>
  ) => {
    setPlacedMachines((current) =>
      current.map((machine) => (machine.instanceId === instanceId ? { ...machine, ...updates } : machine))
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
    const importedMachines: PlacedMachine[] = layout.objects.map((object) => ({
      instanceId: object.id,
      definition: {
        id: object.machineDefinitionId,
        name: object.name,
        category: object.category,
        width: object.width,
        depth: object.depth,
        height: object.height,
        defaultColor: object.defaultColor,
        connectionPoints: []
      },
      position: {
        x: object.positionX,
        z: object.positionZ
      },
      rotationY: object.rotationY,
      flowDirection: object.flowDirection ?? "forward"
    }));

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
    <main className="app-shell">
      <BabylonScene
        placedMachines={placedMachines}
        selectedMachineId={selectedMachineId}
        onSelectMachine={setSelectedMachineId}
        onUpdateMachine={updateMachine}
        isSimulationRunning={isSimulationRunning}
        simulationSpeed={simulationSpeed}
      />
      <aside className="machine-panel" aria-label="Machine library, layout, and properties">
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
        <MachineLibrary onAddMachine={addMachine} />
        <LayoutControls onExportLayout={exportLayout} onImportLayout={importLayout} />
        <SimulationControls
          isRunning={isSimulationRunning}
          speed={simulationSpeed}
          onToggleRunning={() => setIsSimulationRunning((current) => !current)}
          onChangeSpeed={setSimulationSpeed}
        />
        <MachineProperties
          selectedMachine={selectedMachine}
          onUpdateMachine={updateMachine}
          onDeleteSelected={deleteSelectedMachine}
        />
      </aside>
    </main>
  );
}
