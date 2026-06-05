import type { PlacedMachine } from "../types/machine";
import type { VisualModelDiagnostics } from "../types/overlays";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import { formatLength, metersToMm, mmToMeters } from "../utils/units";

type MachinePropertiesProps = {
  selectedMachine?: PlacedMachine;
  visualDiagnostics?: VisualModelDiagnostics;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>
  ) => void;
  onDeleteSelected: () => void;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

export function MachineProperties({
  selectedMachine,
  visualDiagnostics,
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
  const formatOptionalMm = (value?: number) => (typeof value === "number" ? formatMm(value) : "Not available");
  const formatOffset = (offset?: { xMm: number; yMm: number; zMm: number }) =>
    offset ? `X ${formatMm(offset.xMm)}, Y ${formatMm(offset.yMm)}, Z ${formatMm(offset.zMm)}` : "Not available";
  const formatRotationOffset = (offset?: { x: number; y: number; z: number }) =>
    offset ? `X ${offset.x} deg, Y ${offset.y} deg, Z ${offset.z} deg` : "Not available";

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

          <details className="diagnostics-section" data-testid="visual-model-diagnostics" open>
            <summary>Visual Model Diagnostics</summary>
            <div className="diagnostics-grid">
              <span>Visual Status</span>
              <strong>{visualDiagnostics?.visualStatus ?? "Not available"}</strong>
              <span>Visual Source</span>
              <strong>{visualDiagnostics?.visualSource ?? "Not available"}</strong>
              <span>Model Path</span>
              <strong>{visualDiagnostics?.modelPath || "None"}</strong>
              <span>Category</span>
              <strong>{visualDiagnostics?.category ?? selectedMachine.definition.category}</strong>
              <span>Machine Type</span>
              <strong>{visualDiagnostics?.machineType ?? selectedMachine.definition.machineType ?? "Not set"}</strong>
              <span>Placeholder Visual Type</span>
              <strong>{visualDiagnostics?.placeholderVisualType ?? selectedMachine.definition.placeholderVisualType ?? "box-generic"}</strong>
              <span>Scale Mode</span>
              <strong>{visualDiagnostics?.scaleMode ?? selectedMachine.definition.visualModel?.scaleMode ?? "metadata-box"}</strong>
              <span>Model Unit</span>
              <strong>{visualDiagnostics?.modelUnit ?? selectedMachine.definition.visualModel?.unit ?? "m"}</strong>
              <span>Product Family Code</span>
              <strong>{visualDiagnostics?.productFamilyCode || selectedMachine.definition.productFamilyCode || "None"}</strong>
              <span>Metadata Width / Depth / Height</span>
              <strong>
                {visualDiagnostics
                  ? `${formatMm(visualDiagnostics.metadataBoundsMm.widthMm)} / ${formatMm(visualDiagnostics.metadataBoundsMm.depthMm)} / ${formatMm(visualDiagnostics.metadataBoundsMm.heightMm)}`
                  : dimensionsMm
                    ? `${formatMm(dimensionsMm.widthMm)} / ${formatMm(dimensionsMm.depthMm)} / ${formatMm(dimensionsMm.heightMm)}`
                    : "Not available"}
              </strong>
              <span>Visual Bounds Width / Depth / Height</span>
              <strong>
                {visualDiagnostics?.visualBoundsMm
                  ? `${formatMm(visualDiagnostics.visualBoundsMm.widthMm)} / ${formatMm(visualDiagnostics.visualBoundsMm.depthMm)} / ${formatMm(visualDiagnostics.visualBoundsMm.heightMm)}`
                  : "Not available"}
              </strong>
              <span>Visual vs Metadata Difference</span>
              <strong>
                {visualDiagnostics?.boundsDifferenceMm
                  ? `${formatOptionalMm(visualDiagnostics.boundsDifferenceMm.widthMm)} / ${formatOptionalMm(visualDiagnostics.boundsDifferenceMm.depthMm)} / ${formatOptionalMm(visualDiagnostics.boundsDifferenceMm.heightMm)}`
                  : "Not available"}
              </strong>
              <span>Rotation Offset</span>
              <strong>{formatRotationOffset(visualDiagnostics?.rotationOffsetDeg)}</strong>
              <span>Position Offset</span>
              <strong>{formatOffset(visualDiagnostics?.positionOffsetMm)}</strong>
              {visualDiagnostics?.fallbackReason ? (
                <>
                  <span>Fallback Reason</span>
                  <strong>{visualDiagnostics.fallbackReason}</strong>
                </>
              ) : null}
            </div>
          </details>

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
