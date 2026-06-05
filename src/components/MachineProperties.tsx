import type { PlacedMachine } from "../types/machine";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import { formatLength, metersToMm, mmToMeters } from "../utils/units";

type MachinePropertiesProps = {
  selectedMachine?: PlacedMachine;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>
  ) => void;
  onDeleteSelected: () => void;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

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

    const currentPositionMm = selectedMachine.positionMm ?? {
      xMm: metersToMm(selectedMachine.position.x),
      yMm: metersToMm(selectedMachine.position.z)
    };
    const nextPositionMm = {
      ...currentPositionMm,
      [axis === "x" ? "xMm" : "yMm"]: numericValue
    };

    onUpdateMachine(selectedMachine.instanceId, {
      position: {
        x: mmToMeters(nextPositionMm.xMm),
        z: mmToMeters(nextPositionMm.yMm)
      },
      positionMm: nextPositionMm
    });
  };

  const updateElevation = (value: string) => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    onUpdateMachine(selectedMachine.instanceId, {
      elevationMm: numericValue
    });
  };

  const getPositionMm = () => {
    if (!selectedMachine) {
      return { xMm: 0, yMm: 0 };
    }

    return selectedMachine.positionMm ?? {
      xMm: metersToMm(selectedMachine.position.x),
      yMm: metersToMm(selectedMachine.position.z)
    };
  };

  const updateRotation = (value: string) => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    onUpdateMachine(selectedMachine.instanceId, {
      rotationY: numericValue,
      rotationDeg: numericValue
    });
  };

  const positionMm = getPositionMm();
  const dimensionsMm = selectedMachine ? getMachineDimensionsMm(selectedMachine.definition) : null;

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
            <span>Plan X (mm)</span>
            <input
              type="number"
              step="10"
              value={positionMm.xMm}
              onChange={(event) => updatePosition("x", event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Plan Y (mm)</span>
            <input
              type="number"
              step="10"
              value={positionMm.yMm}
              onChange={(event) => updatePosition("z", event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Elevation (mm)</span>
            <input
              type="number"
              step="10"
              value={selectedMachine.elevationMm ?? 0}
              onChange={(event) => updateElevation(event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Rotation Angle (&deg;)</span>
            <input
              type="number"
              step="1"
              value={selectedMachine.rotationDeg ?? selectedMachine.rotationY}
              onChange={(event) => updateRotation(event.target.value)}
            />
          </label>

          {dimensionsMm ? (
            <div className="dimension-grid" aria-label="Machine dimensions">
              <span>W {formatMm(dimensionsMm.widthMm)}</span>
              <span>D {formatMm(dimensionsMm.depthMm)}</span>
              <span>H {formatMm(dimensionsMm.heightMm)}</span>
            </div>
          ) : null}

          {selectedMachine.definition.capabilities?.hasFlowDirection ||
          selectedMachine.definition.category === "Conveyor" ? (
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
