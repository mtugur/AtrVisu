import type { SavedAtrVisuLayout } from "../types/machine";

type SavedLayoutManagerProps = {
  isOpen: boolean;
  savedLayouts: SavedAtrVisuLayout[];
  onSaveLayout: () => void;
  onToggleLoadPanel: () => void;
  onLoadLayout: (layoutId: string) => void;
  onDeleteLayout: (layoutId: string) => void;
};

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString();
};

export function SavedLayoutManager({
  isOpen,
  savedLayouts,
  onSaveLayout,
  onToggleLoadPanel,
  onLoadLayout,
  onDeleteLayout
}: SavedLayoutManagerProps) {
  return (
    <section className="saved-layout-section" aria-label="Saved layouts">
      <div className="saved-layout-actions">
        <button className="layout-button" type="button" onClick={onSaveLayout}>
          Save Layout
        </button>
        <button className="layout-button" type="button" onClick={onToggleLoadPanel}>
          Load Layout
        </button>
      </div>
      <p className="saved-layout-note">Saved layouts are stored in this browser.</p>

      {isOpen ? (
        <div className="saved-layout-panel" aria-label="Saved layout list">
          {savedLayouts.length > 0 ? (
            savedLayouts.map((layout) => (
              <article className="saved-layout-card" key={layout.id}>
                <div>
                  <strong>{layout.name}</strong>
                  <span>{formatUpdatedAt(layout.updatedAt)}</span>
                  <small>{layout.objectCount} object{layout.objectCount === 1 ? "" : "s"}</small>
                </div>
                <div className="saved-layout-card-actions">
                  <button type="button" onClick={() => onLoadLayout(layout.id)}>
                    Load
                  </button>
                  <button type="button" onClick={() => onDeleteLayout(layout.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="saved-layout-empty">No saved layouts yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
