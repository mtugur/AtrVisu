import type { PlanBounds } from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import { getPlacedMachineDisplayName } from "../utils/entityNames";
import { calculateReferencePointMeasurementBetweenMachines } from "../utils/placement";
import { formatLength } from "../utils/units";

type MultiSelectionPropertiesProps = {
  selectedMachines: PlacedMachine[];
  assemblyName?: string;
  primarySelectedMachine?: PlacedMachine;
  selectionBounds: PlanBounds | null;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

export function MultiSelectionProperties({
  selectedMachines,
  assemblyName,
  primarySelectedMachine,
  selectionBounds
}: MultiSelectionPropertiesProps) {
  const pairMeasurement = selectedMachines.length === 2
    ? calculateReferencePointMeasurementBetweenMachines(selectedMachines[0], selectedMachines[1])
    : null;
  return (
    <section className="properties-section multi-selection-panel" data-testid="multi-selection-panel" aria-label="Multi-selection properties">
      <header className="section-header">
        <span>Multi-Selection</span>
        <strong>{selectedMachines.length} objects</strong>
      </header>
      <div className="properties-body">
        {assemblyName ? (
          <div className="property-readout" data-testid="selected-assembly-name">
            <span>Assembly</span>
            <strong>{assemblyName}</strong>
          </div>
        ) : null}
        <div className="property-readout">
          <span>Primary</span>
          <strong>{primarySelectedMachine ? getPlacedMachineDisplayName(primarySelectedMachine) : "None"}</strong>
        </div>
        <div className="multi-selection-list" aria-label="Selected objects">
          {selectedMachines.map((machine) => (
            <div
              className={machine.instanceId === primarySelectedMachine?.instanceId ? "multi-selection-item is-primary" : "multi-selection-item"}
              key={machine.instanceId}
            >
              <span>{getPlacedMachineDisplayName(machine)}</span>
              {machine.instanceId === primarySelectedMachine?.instanceId ? <strong>Primary</strong> : null}
            </div>
          ))}
        </div>
        {selectionBounds ? (
          <div className="diagnostics-grid compact-grid" aria-label="Selection bounds">
            <span>Min Plan X</span>
            <strong>{formatMm(selectionBounds.minXMm)}</strong>
            <span>Max Plan X</span>
            <strong>{formatMm(selectionBounds.maxXMm)}</strong>
            <span>Min Plan Y</span>
            <strong>{formatMm(selectionBounds.minYMm)}</strong>
            <span>Max Plan Y</span>
            <strong>{formatMm(selectionBounds.maxYMm)}</strong>
            <span>Selection Width</span>
            <strong>{formatMm(selectionBounds.widthMm)}</strong>
            <span>Selection Depth</span>
            <strong>{formatMm(selectionBounds.depthMm)}</strong>
          </div>
        ) : null}
        {pairMeasurement ? (
          <div
            className="diagnostics-grid compact-grid"
            data-testid="pair-measurement-readout"
            aria-label="Pair reference point measurement"
          >
            <span>Delta X</span>
            <strong>{formatMm(pairMeasurement.deltaXMm)}</strong>
            <span>Delta Y</span>
            <strong>{formatMm(pairMeasurement.deltaYMm)}</strong>
            <span>Reference Point Distance</span>
            <strong>
              {formatMm(pairMeasurement.referencePointDistanceMm)} / {pairMeasurement.referencePointDistanceMeters.toFixed(3)} m
            </strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
