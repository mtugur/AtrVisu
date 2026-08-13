import { useEffect, useState } from "react";
import type { LayoutViewpoint } from "../types/viewpoints";

type ViewpointsPanelProps = {
  viewpoints: LayoutViewpoint[];
  selectedViewpointId: string | null;
  onSelectViewpoint: (viewpointId: string | null) => void;
  onCaptureViewpoint: (name: string) => void;
  onApplyViewpoint: (viewpointId: string) => void;
  onUpdateViewpoint: (viewpointId: string) => void;
  onRenameViewpoint: (viewpointId: string, name: string) => void;
  onDeleteViewpoint: (viewpointId: string) => void;
  onStepViewpoint: (direction: "previous" | "next") => void;
};

export function ViewpointsPanel({
  viewpoints,
  selectedViewpointId,
  onSelectViewpoint,
  onCaptureViewpoint,
  onApplyViewpoint,
  onUpdateViewpoint,
  onRenameViewpoint,
  onDeleteViewpoint,
  onStepViewpoint
}: ViewpointsPanelProps) {
  const [name, setName] = useState("");
  const selectedViewpoint = viewpoints.find((viewpoint) => viewpoint.id === selectedViewpointId) ?? null;

  useEffect(() => {
    if (viewpoints.length === 0) {
      onSelectViewpoint(null);
    }
  }, [onSelectViewpoint, viewpoints.length]);

  return (
    <section className="viewpoints-panel" data-testid="viewpoints-panel" aria-label="Viewpoints">
      <div className="viewpoints-toolbar" data-testid="viewpoints-toolbar">
        <label className="property-field">
          <span>Viewpoint Name</span>
          <input
            data-testid="viewpoint-name-input"
            placeholder="Genel Gorunum"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          className="primary-action"
          data-testid="capture-viewpoint"
          type="button"
          aria-label="Capture Current View"
          title="Capture Current View"
          disabled={!name.trim()}
          onClick={() => {
            onCaptureViewpoint(name);
            setName("");
          }}
        >
          Capture
        </button>

        <div className="viewpoint-actions viewpoint-step-actions">
          <button
            type="button"
            aria-label="Previous Viewpoint"
            disabled={viewpoints.length === 0}
            onClick={() => onStepViewpoint("previous")}
          >
            Previous
          </button>
          <button
            type="button"
            aria-label="Next Viewpoint"
            disabled={viewpoints.length === 0}
            onClick={() => onStepViewpoint("next")}
          >
            Next
          </button>
        </div>
      </div>

      <div className="viewpoints-results" data-testid="viewpoints-results">
        <span className="viewpoint-saved-label">Saved viewpoints</span>
        <div className="viewpoint-strip" data-testid="viewpoint-strip">
          <div className="viewpoint-list" aria-label="Saved viewpoints">
            {viewpoints.length > 0 ? viewpoints.map((viewpoint) => {
              const updatedAt = new Date(viewpoint.updatedAt).toLocaleString();
              return (
                <button
                  className={`viewpoint-list-item${viewpoint.id === selectedViewpointId ? " is-selected" : ""}`}
                  data-testid={`viewpoint-item-${viewpoint.id}`}
                  key={viewpoint.id}
                  type="button"
                  aria-pressed={viewpoint.id === selectedViewpointId}
                  onClick={() => onSelectViewpoint(viewpoint.id)}
                  onDoubleClick={() => onApplyViewpoint(viewpoint.id)}
                >
                  <strong>{viewpoint.name}</strong>
                  <span title={`Updated ${updatedAt}`}>{updatedAt}</span>
                </button>
              );
            }) : <p className="empty-selection">No viewpoints saved yet.</p>}
          </div>

          {selectedViewpoint ? (
            <div
              className="viewpoint-actions viewpoint-context-actions"
              data-testid="viewpoint-context-actions"
              aria-label={`Actions for ${selectedViewpoint.name}`}
            >
              <button
                data-testid="apply-viewpoint"
                type="button"
                aria-label="Apply / Go To"
                title="Apply / Go To"
                onClick={() => onApplyViewpoint(selectedViewpoint.id)}
              >
                Apply
              </button>
              <button
                type="button"
                aria-label="Update From Current View"
                title="Update From Current View"
                onClick={() => onUpdateViewpoint(selectedViewpoint.id)}
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextName = window.prompt("Viewpoint name", selectedViewpoint.name);
                  if (nextName?.trim()) {
                    onRenameViewpoint(selectedViewpoint.id, nextName);
                  }
                }}
              >
                Rename
              </button>
              <button className="danger-action" type="button" onClick={() => onDeleteViewpoint(selectedViewpoint.id)}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

