type WorkbenchStatusBarProps = {
  selectionCount: number;
  primarySelection?: Readonly<{ name: string; type: string }>;
  snapLabel: string;
  dirty: boolean;
};

export function WorkbenchStatusBar({
  selectionCount,
  primarySelection,
  snapLabel,
  dirty
}: WorkbenchStatusBarProps) {
  return (
    <footer className="workbench-status-bar" data-testid="workbench-status-bar" aria-label="Layout status">
      <span data-testid="status-selection-count">Selected: {selectionCount}</span>
      <span data-testid="status-primary-selection">
        {primarySelection ? `${primarySelection.name} (${primarySelection.type})` : "No primary selection"}
      </span>
      <span data-testid="status-working-unit">Unit: mm</span>
      <span data-testid="status-snap-state">Snap: {snapLabel}</span>
      <strong data-testid="status-dirty-state" data-dirty={dirty ? "true" : "false"}>
        {dirty ? "Unsaved" : "Saved"}
      </strong>
    </footer>
  );
}
