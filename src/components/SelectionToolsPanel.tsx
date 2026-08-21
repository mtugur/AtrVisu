import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type { AlignmentAction, DistributionAction, EqualGapAction, FootprintAnchor, PairAlignmentAction } from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import type { ConnectionPointSnapSelection } from "../utils/connectionPointSnap";
import { RUNTIME_PANEL_IDS } from "../platform/runtimePanels";
import { AlignmentToolsPanel } from "./AlignmentToolsPanel";
import { ConnectionPointSnapPanel } from "./ConnectionPointSnapPanel";
import { WorkbenchContextContribution } from "./workbench/WorkbenchContextContribution";

type SelectionToolsPanelProps = {
  selectedEntityCount: number;
  primarySelectionLabel?: string;
  selectedMachines: PlacedMachine[];
  primarySelectedMachine?: PlacedMachine;
  connectionPointSnapAvailable: boolean;
  movementAllowed: boolean;
  connectionPointSnapVisible: boolean;
  connectionPointSnapExpanded: boolean;
  onConnectionPointSnapExpandedChange: (expanded: boolean) => void;
  onAlign: (action: AlignmentAction) => void;
  onDistribute: (action: DistributionAction) => void;
  onEqualGap: (action: EqualGapAction) => void;
  onPairAlign: (action: PairAlignmentAction, gapMm?: number) => void;
  onPairAnchorSnap: (primaryAnchor: FootprintAnchor, secondaryAnchor: FootprintAnchor) => void;
  onConnectionPointSnap: (selection: ConnectionPointSnapSelection, movingPoint: MachineConnectionPoint, fixedPoint: MachineConnectionPoint) => void;
  onClearSelection: () => void;
};

export function SelectionToolsPanel({
  selectedEntityCount,
  primarySelectionLabel,
  selectedMachines,
  primarySelectedMachine,
  connectionPointSnapAvailable,
  movementAllowed,
  connectionPointSnapVisible,
  connectionPointSnapExpanded,
  onConnectionPointSnapExpandedChange,
  onAlign,
  onDistribute,
  onEqualGap,
  onPairAlign,
  onPairAnchorSnap,
  onConnectionPointSnap,
  onClearSelection
}: SelectionToolsPanelProps) {
  if (selectedEntityCount < 2) {
    return (
      <section className="selection-tools-empty" data-testid="selection-tools-panel" aria-label="Selection tools">
        <strong>Selection Tools</strong>
        <p>Select two or more objects to align or snap.</p>
      </section>
    );
  }

  return (
    <div className="selection-tools-panel" data-testid="selection-tools-panel">
      <AlignmentToolsPanel
        selectedEntityCount={selectedEntityCount}
        primarySelectionLabel={primarySelectionLabel}
        onAlign={onAlign}
        onDistribute={onDistribute}
        onEqualGap={onEqualGap}
        onPairAlign={onPairAlign}
        onPairAnchorSnap={onPairAnchorSnap}
        movementAllowed={movementAllowed}
      />
      <WorkbenchContextContribution panelId={RUNTIME_PANEL_IDS.connectionPointSnap} title="Connection Point Snap" visible={connectionPointSnapVisible && connectionPointSnapAvailable} expanded={connectionPointSnapExpanded} onExpandedChange={onConnectionPointSnapExpandedChange}>
        <ConnectionPointSnapPanel selectedMachines={selectedMachines} primarySelectedMachine={primarySelectedMachine} onSnap={onConnectionPointSnap} onClearSelection={onClearSelection} />
      </WorkbenchContextContribution>
    </div>
  );
}
