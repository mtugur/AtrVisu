import type { PlacedMachine } from "../types/machine";

type MachinePropertiesProps = {
  selectedMachine?: PlacedMachine;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "rotationY" | "flowDirection">>
  ) => void;
  onDeleteSelected: () => void;
};

const formatMeters = (value: number) => `${value.toFixed(2)} m`;

export function MachineProperties({
  selectedMachine,
  onUpdateMachine,
  onDeleteSelected
}: MachinePropertiesProps) {
  const updatePosition = (axis: "x" | "z", value: string) => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    onUpdateMachine(selectedMachine.instanceId, {
      position: {
        ...selectedMachine.position,
        [axis]: numericValue
      }
    });
  };

  const updateRotation = (value: string) => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    onUpdateMachine(selectedMachine.instanceId, { rotationY: numericValue });
  };

  return (
    <section className="properties-section" aria-label="Selected machine properties">
      <header className="section-header">
        <span>Selection</span>
        <strong>{selectedMachine ? selectedMachine.definition.name : "None"}</strong>
      </header>

      {selectedMachine ? (
        <div className="properties-body">
          <div className="property-readout">
            <span>Name</span>
            <strong>{selectedMachine.definition.name}</strong>
          </div>
          <div className="property-readout">
            <span>Category</span>
            <strong>{selectedMachine.definition.category}</strong>
          </div>

          <label className="property-field">
            <span>Plan X (m)</span>
            <input
              type="number"
              step="0.1"
              value={selectedMachine.position.x}
              onChange={(event) => updatePosition("x", event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Plan Y (m)</span>
            <input
              type="number"
              step="0.1"
              value={selectedMachine.position.z}
              onChange={(event) => updatePosition("z", event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Rotation Angle (&deg;)</span>
            <input
              type="number"
              step="1"
              value={selectedMachine.rotationY}
              onChange={(event) => updateRotation(event.target.value)}
            />
          </label>

          <div className="dimension-grid" aria-label="Machine dimensions">
            <span>W {formatMeters(selectedMachine.definition.width)}</span>
            <span>D {formatMeters(selectedMachine.definition.depth)}</span>
            <span>H {formatMeters(selectedMachine.definition.height)}</span>
          </div>

          {selectedMachine.definition.category === "Conveyor" ? (
            <label className="property-field">
              <span>Flow Direction</span>
              <select
                value={selectedMachine.flowDirection}
                onChange={(event) =>
                  onUpdateMachine(selectedMachine.instanceId, {
                    flowDirection: event.target.value === "reverse" ? "reverse" : "forward"
                  })
                }
              >
                <option value="forward">Forward</option>
                <option value="reverse">Reverse</option>
              </select>
            </label>
          ) : null}

          <button className="delete-object-button" type="button" onClick={onDeleteSelected}>
            Delete Selected Object
          </button>
        </div>
      ) : (
        <p className="empty-selection">Click a machine in the scene to inspect and transform it.</p>
      )}
    </section>
  );
}
