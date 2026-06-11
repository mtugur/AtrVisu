import type { PlanBounds } from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import { formatLength } from "../utils/units";

type MultiSelectionPropertiesProps = {
  selectedMachines: PlacedMachine[];
  primarySelectedMachine?: PlacedMachine;
  selectionBounds: PlanBounds | null;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

export function MultiSelectionProperties({
  selectedMachines,
  primarySelectedMachine,
  selectionBounds,
  onClearSelection,
  onDeleteSelected
}: MultiSelectionPropertiesProps) {
  return (
    <section className="properties-section multi-selection-panel" data-testid="multi-selection-panel" aria-label="Multi-selection properties">
      <header className="section-header">
        <span>Multi-Selection</span>
        <strong>{selectedMachines.length} objects</strong>
      </header>
      <div className="properties-body">
        <div className="property-readout">
          <span>Primary</span>
          <strong>{primarySelectedMachine?.definition.name ?? primarySelectedMachine?.instanceId ?? "None"}</strong>
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
        <div className="selection-actions">
          <button type="button" onClick={onClearSelection}>
            Clear Selection
          </button>
          <button className="danger-action" type="button" onClick={onDeleteSelected}>
            Delete Selected Objects
          </button>
        </div>
      </div>
    </section>
  );
}
