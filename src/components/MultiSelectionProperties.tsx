import type { PlanBounds } from "../types/alignment";
import type { AlignmentAction, DistributionAction, EqualGapAction } from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import { calculateReferencePointMeasurementBetweenMachines } from "../utils/placement";
import { formatLength } from "../utils/units";
import {
  WorkbenchContextContribution,
  type WorkbenchContextContributionProps
} from "./workbench/WorkbenchContextContribution";

type MultiSelectionPropertiesProps = {
  selectedMachines: PlacedMachine[];
  assemblyName?: string;
  primarySelectedMachine?: PlacedMachine;
  selectionBounds: PlanBounds | null;
  onAlign: (action: AlignmentAction) => void;
  onDistribute: (action: DistributionAction) => void;
  onEqualGap: (action: EqualGapAction) => void;
  canDuplicateSelected: boolean;
  onDuplicateSelected: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  canArrangeSelection?: boolean;
  alignmentContribution?: Omit<
    WorkbenchContextContributionProps,
    "title" | "children" | "badge"
  >;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

export function MultiSelectionProperties({
  selectedMachines,
  assemblyName,
  primarySelectedMachine,
  selectionBounds,
  onAlign,
  onDistribute,
  onEqualGap,
  canDuplicateSelected,
  onDuplicateSelected,
  onClearSelection,
  onDeleteSelected,
  canArrangeSelection = true,
  alignmentContribution
}: MultiSelectionPropertiesProps) {
  const canDistribute = canArrangeSelection && selectedMachines.length >= 3;
  const pairMeasurement = selectedMachines.length === 2
    ? calculateReferencePointMeasurementBetweenMachines(selectedMachines[0], selectedMachines[1])
    : null;
  const alignmentActions = (
    <>
      <div className="alignment-group multi-selection-alignment" data-testid="multi-selection-alignment-actions">
        <strong>Align Selection</strong>
        <div className="alignment-button-grid">
          <button type="button" disabled={!canArrangeSelection} onClick={() => onAlign("left")}>
            Align Left
          </button>
          <button type="button" disabled={!canArrangeSelection} onClick={() => onAlign("centerX")}>
            Align Center X
          </button>
          <button type="button" disabled={!canArrangeSelection} onClick={() => onAlign("right")}>
            Align Right
          </button>
          <button type="button" disabled={!canArrangeSelection} onClick={() => onAlign("front")}>
            Align Top
          </button>
          <button type="button" disabled={!canArrangeSelection} onClick={() => onAlign("centerY")}>
            Align Center Y
          </button>
          <button type="button" disabled={!canArrangeSelection} onClick={() => onAlign("back")}>
            Align Bottom
          </button>
        </div>
      </div>
      <div className="alignment-group multi-selection-alignment" data-testid="multi-selection-distribution-actions">
        <strong>Distribute Selection</strong>
        <div className="alignment-button-grid">
          <button type="button" disabled={!canDistribute} onClick={() => onDistribute("horizontal")}>
            Distribute Horizontal Center
          </button>
          <button type="button" disabled={!canDistribute} onClick={() => onDistribute("vertical")}>
            Distribute Vertical Center
          </button>
          <button type="button" disabled={!canDistribute} onClick={() => onEqualGap("gapX")}>
            Equal Gap X
          </button>
          <button type="button" disabled={!canDistribute} onClick={() => onEqualGap("gapY")}>
            Equal Gap Y
          </button>
        </div>
      </div>
    </>
  );

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
          <strong>{primarySelectedMachine?.definition.name ?? primarySelectedMachine?.instanceId ?? "None"}</strong>
        </div>
        <div className="multi-selection-list" aria-label="Selected objects">
          {selectedMachines.map((machine) => (
            <div
              className={machine.instanceId === primarySelectedMachine?.instanceId ? "multi-selection-item is-primary" : "multi-selection-item"}
              key={machine.instanceId}
            >
              <span>{machine.definition.name}</span>
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
        {alignmentContribution ? (
          <WorkbenchContextContribution {...alignmentContribution} title="Alignment Tools">
            {alignmentActions}
          </WorkbenchContextContribution>
        ) : alignmentActions}
        <div className="selection-actions">
          <button type="button" disabled={!canDuplicateSelected} onClick={onDuplicateSelected}>
            Duplicate Selected
          </button>
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
