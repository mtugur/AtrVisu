import type { AlignmentAction, DistributionAction, EqualGapAction } from "../../types/alignment";

export type ViewportArrangeBarProps = {
  selectionCount: number;
  movementAllowed: boolean;
  canDistribute: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canOpenAdvancedAlignment: boolean;
  connectAndSnapAvailable: boolean;
  connectAndSnapOpen: boolean;
  onAlign: (action: AlignmentAction) => void;
  onDistribute: (action: DistributionAction) => void;
  onEqualGap: (action: EqualGapAction) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onOpenAdvancedAlignment: () => void;
  onToggleConnectAndSnap: () => void;
};

const ActionMenu = <T extends string>({ label, disabled, actions, onAction }: {
  label: string;
  disabled?: boolean;
  actions: readonly { label: string; value: T }[];
  onAction: (value: T) => void;
}) => (
  <details className="viewport-arrange-menu">
    <summary aria-disabled={disabled || undefined} onClick={(event) => { if (disabled) event.preventDefault(); }}>{label}</summary>
    <div>{actions.map((action) => <button key={action.value} type="button" disabled={disabled} onClick={(event) => { onAction(action.value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{action.label}</button>)}</div>
  </details>
);

export function ViewportArrangeBar(props: ViewportArrangeBarProps) {
  if (props.selectionCount < 2 && !props.canUngroup) return null;
  return (
    <div className="viewport-arrange-bar" role="toolbar" aria-label="Arrange selected objects" data-testid="viewport-arrange-bar">
      <span>{props.selectionCount} selected</span>
      {props.selectionCount >= 2 && !props.canUngroup ? (
        <ActionMenu label="Align" disabled={!props.movementAllowed} onAction={props.onAlign} actions={[
          { label: "Left edges", value: "left" }, { label: "Center X", value: "centerX" }, { label: "Right edges", value: "right" },
          { label: "Front edges", value: "front" }, { label: "Center Y", value: "centerY" }, { label: "Back edges", value: "back" }
        ]} />
      ) : null}
      {props.canDistribute ? (
        <>
          <ActionMenu label="Distribute" disabled={!props.movementAllowed} onAction={props.onDistribute} actions={[
            { label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }
          ]} />
          <ActionMenu label="Equal Gap" disabled={!props.movementAllowed} onAction={props.onEqualGap} actions={[
            { label: "Gap X", value: "gapX" }, { label: "Gap Y", value: "gapY" }
          ]} />
        </>
      ) : null}
      {props.canGroup ? <button type="button" disabled={!props.movementAllowed} onClick={props.onGroup}>Group</button> : null}
      {props.canUngroup ? <button type="button" onClick={props.onUngroup}>Ungroup</button> : null}
      {props.canOpenAdvancedAlignment ? (
        <button type="button" onClick={props.onOpenAdvancedAlignment}>Advanced Alignment...</button>
      ) : null}
      {props.connectAndSnapAvailable ? <button type="button" aria-expanded={props.connectAndSnapOpen} onClick={props.onToggleConnectAndSnap}>Connect &amp; Snap</button> : null}
    </div>
  );
}
