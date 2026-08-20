import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type {
  AlignmentAction,
  DistributionAction,
  EqualGapAction,
  FootprintAnchor,
  PairAlignmentAction
} from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import type { NudgeSettings } from "../types/selection";
import type { ConnectionPointSnapSelection } from "../utils/connectionPointSnap";
import { RUNTIME_PANEL_IDS } from "../platform/runtimePanels";
import { AlignmentToolsPanel } from "./AlignmentToolsPanel";
import { ConnectionPointSnapPanel } from "./ConnectionPointSnapPanel";
import { WorkbenchContextContribution } from "./workbench/WorkbenchContextContribution";

type SelectionToolsPanelProps = {
  selectedEntityCount: number;
  primarySelectionLabel?: string;
  nudgeSettings: NudgeSettings;
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
  onChangeNudgeSettings: (settings: NudgeSettings) => void;
  onConnectionPointSnap: (
    selection: ConnectionPointSnapSelection,
    movingPoint: MachineConnectionPoint,
    fixedPoint: MachineConnectionPoint
  ) => void;
  onClearSelection: () => void;
};

export function SelectionToolsPanel({
  selectedEntityCount,
  primarySelectionLabel,
  nudgeSettings,
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
  onChangeNudgeSettings,
  onConnectionPointSnap,
  onClearSelection
}: SelectionToolsPanelProps) {
  return (
    <div className="selection-tools-panel" data-testid="selection-tools-panel">
      <AlignmentToolsPanel
        selectedEntityCount={selectedEntityCount}
        primarySelectionLabel={primarySelectionLabel}
        nudgeSettings={nudgeSettings}
        onAlign={onAlign}
        onDistribute={onDistribute}
        onEqualGap={onEqualGap}
        onPairAlign={onPairAlign}
        onPairAnchorSnap={onPairAnchorSnap}
        onChangeNudgeSettings={onChangeNudgeSettings}
        movementAllowed={movementAllowed}
      />
      <WorkbenchContextContribution
        panelId={RUNTIME_PANEL_IDS.connectionPointSnap}
        title="Connection Point Snap"
        visible={connectionPointSnapVisible}
        expanded={connectionPointSnapExpanded}
        onExpandedChange={onConnectionPointSnapExpandedChange}
      >
        {connectionPointSnapAvailable ? (
          <ConnectionPointSnapPanel
            selectedMachines={selectedMachines}
            primarySelectedMachine={primarySelectedMachine}
            onSnap={onConnectionPointSnap}
            onClearSelection={onClearSelection}
          />
        ) : (
          <p className="empty-selection">Select exactly two compatible machines to configure a connection snap.</p>
        )}
      </WorkbenchContextContribution>
    </div>
  );
}
