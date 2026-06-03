import { useState } from "react";
import { BabylonScene } from "./components/BabylonScene";
import { MachineLibrary } from "./components/MachineLibrary";
import type { MachineDefinition, PlacedMachine } from "./types/machine";

const PLACEMENT_COLUMNS = 3;
const PLACEMENT_SPACING = 7;
const PLACEMENT_ORIGIN = { x: -8, z: -6 };

export function App() {
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);

  const addMachine = (definition: MachineDefinition) => {
    setPlacedMachines((current) => {
      const index = current.length;
      const column = index % PLACEMENT_COLUMNS;
      const row = Math.floor(index / PLACEMENT_COLUMNS);

      return [
        ...current,
        {
          instanceId: `${definition.id}-${Date.now()}-${index}`,
          definition,
          position: {
            x: PLACEMENT_ORIGIN.x + column * PLACEMENT_SPACING,
            z: PLACEMENT_ORIGIN.z + row * PLACEMENT_SPACING
          }
        }
      ];
    });
  };

  return (
    <main className="app-shell">
      <BabylonScene placedMachines={placedMachines} />
      <MachineLibrary onAddMachine={addMachine} />
    </main>
  );
}
