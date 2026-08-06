export type RightPanelUtilityStripProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCollapse: () => void;
};

export function RightPanelUtilityStrip({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCollapse
}: RightPanelUtilityStripProps) {
  return (
    <div
      className="panel-toolbar"
      data-app-shell-zone="top-toolbar"
      data-testid="right-panel-utility-strip"
    >
      <span className="panel-toolbar-title">AtrVisu Tools</span>
      <div
        className="panel-toolbar-actions"
        data-testid="right-panel-utility-actions"
        aria-label="Panel actions"
      >
        <div className="toolbar-button-group" aria-label="Undo and redo">
          <button type="button" disabled={!canUndo} onClick={onUndo}>
            Undo
          </button>
          <button type="button" disabled={!canRedo} onClick={onRedo}>
            Redo
          </button>
        </div>
        <button type="button" onClick={onCollapse}>
          Collapse
        </button>
      </div>
    </div>
  );
}
