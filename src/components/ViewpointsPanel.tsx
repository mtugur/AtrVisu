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
        disabled={!name.trim()}
        onClick={() => {
          onCaptureViewpoint(name);
          setName("");
        }}
      >
        Capture Current View
      </button>

      <div className="viewpoint-actions">
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

      <div className="viewpoint-list" aria-label="Saved viewpoints">
        {viewpoints.length > 0 ? viewpoints.map((viewpoint) => (
          <button
            className={`viewpoint-list-item${viewpoint.id === selectedViewpointId ? " is-selected" : ""}`}
            data-testid={`viewpoint-item-${viewpoint.id}`}
            key={viewpoint.id}
            type="button"
            onClick={() => onSelectViewpoint(viewpoint.id)}
            onDoubleClick={() => onApplyViewpoint(viewpoint.id)}
          >
            <strong>{viewpoint.name}</strong>
            <span>{new Date(viewpoint.updatedAt).toLocaleString()}</span>
          </button>
        )) : <p className="empty-selection">No viewpoints saved yet.</p>}
      </div>

      {selectedViewpoint ? (
        <div className="viewpoint-actions">
          <button data-testid="apply-viewpoint" type="button" onClick={() => onApplyViewpoint(selectedViewpoint.id)}>
            Apply / Go To
          </button>
          <button type="button" onClick={() => onUpdateViewpoint(selectedViewpoint.id)}>
            Update From Current View
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
    </section>
  );
}

