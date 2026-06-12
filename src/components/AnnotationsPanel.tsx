import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AnnotationObject, AnnotationType } from "../types/annotations";
import type { PlacedMachine } from "../types/machine";
import { normalizeAnnotationCoordinateInput, normalizeAnnotationSizeScale } from "../utils/annotations";

type AnnotationsPanelProps = {
  annotations: AnnotationObject[];
  selectedAnnotationId: string | null;
  placedMachines: PlacedMachine[];
  onAddAnnotation: (type: AnnotationType) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onUpdateAnnotation: (annotationId: string, updates: Partial<AnnotationObject>, options?: { recordHistory?: boolean }) => void;
  onCommitAnnotationEdit: () => void;
  onDeleteAnnotation: (annotationId: string) => void;
};

const annotationTypes: Array<{ value: AnnotationType; label: string }> = [
  { value: "note", label: "Note" },
  { value: "callout", label: "Callout" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
  { value: "dimension-note", label: "Dimension Note" },
  { value: "area-note", label: "Area Note" }
];

export function AnnotationsPanel({
  annotations,
  selectedAnnotationId,
  placedMachines,
  onAddAnnotation,
  onSelectAnnotation,
  onUpdateAnnotation,
  onCommitAnnotationEdit,
  onDeleteAnnotation
}: AnnotationsPanelProps) {
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId);
  const targetMachine = selectedAnnotation?.targetObjectId
    ? placedMachines.find((machine) => machine.instanceId === selectedAnnotation.targetObjectId)
    : undefined;
  const [positionDraft, setPositionDraft] = useState({ xMm: "0", yMm: "0", zMm: "1600" });

  useEffect(() => {
    if (!selectedAnnotation) {
      setPositionDraft({ xMm: "0", yMm: "0", zMm: "1600" });
      return;
    }

    setPositionDraft({
      xMm: String(selectedAnnotation.positionMm.xMm),
      yMm: String(selectedAnnotation.positionMm.yMm),
      zMm: String(selectedAnnotation.positionMm.zMm ?? 1600)
    });
  }, [selectedAnnotation?.id, selectedAnnotation?.positionMm.xMm, selectedAnnotation?.positionMm.yMm, selectedAnnotation?.positionMm.zMm]);

  const commitPosition = (axis: "xMm" | "yMm" | "zMm") => {
    if (!selectedAnnotation) {
      return;
    }

    const fallback = axis === "zMm"
      ? selectedAnnotation.positionMm.zMm ?? 1600
      : selectedAnnotation.positionMm[axis];
    const numericValue = normalizeAnnotationCoordinateInput(
      positionDraft[axis],
      fallback,
      { allowNegative: axis !== "zMm" }
    );

    onUpdateAnnotation(
      selectedAnnotation.id,
      {
        positionMm: {
          ...selectedAnnotation.positionMm,
          [axis]: numericValue
        }
      },
      { recordHistory: false }
    );
    setPositionDraft((current) => ({ ...current, [axis]: String(numericValue) }));
    onCommitAnnotationEdit();
  };

  const handleCommitKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <section className="annotations-panel" data-testid="annotations-panel" aria-label="Annotations">
      <div className="alignment-button-grid">
        <button type="button" data-testid="add-note-annotation" onClick={() => onAddAnnotation("note")}>
          Add Note
        </button>
        <button type="button" onClick={() => onAddAnnotation("warning")}>
          Add Warning
        </button>
        <button type="button" onClick={() => onAddAnnotation("callout")}>
          Add Callout
        </button>
      </div>
      <p className="collision-note">
        Callouts attach to the selected object when one is selected. Free notes stay fixed in the layout.
      </p>
      <div className="annotation-list" aria-label="Annotation list">
        {annotations.length > 0 ? annotations.map((annotation) => (
          <button
            className={`annotation-list-item${annotation.id === selectedAnnotationId ? " is-selected" : ""}`}
            key={annotation.id}
            type="button"
            onClick={() => onSelectAnnotation(annotation.id)}
          >
            <strong>{annotation.text || "(empty annotation)"}</strong>
            <span>{annotation.type}{annotation.targetObjectId ? " | attached" : ""}</span>
          </button>
        )) : <p className="empty-selection">No annotations yet.</p>}
      </div>
      {selectedAnnotation ? (
        <div className="annotation-editor" data-testid="annotation-properties">
          <label className="property-field">
            <span>Type</span>
            <select
              value={selectedAnnotation.type}
              onChange={(event) =>
                onUpdateAnnotation(selectedAnnotation.id, { type: event.target.value as AnnotationType })
              }
            >
              {annotationTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="property-field">
            <span>Text</span>
            <textarea
              data-testid="annotation-text-input"
              value={selectedAnnotation.text}
              onChange={(event) =>
                onUpdateAnnotation(selectedAnnotation.id, { text: event.target.value }, { recordHistory: false })
              }
              onBlur={onCommitAnnotationEdit}
            />
          </label>
          <label className="property-field">
            <span>Plan X (mm)</span>
            <input
              type="number"
              step="10"
              data-testid="annotation-plan-x-input"
              value={positionDraft.xMm}
              onChange={(event) => setPositionDraft((current) => ({ ...current, xMm: event.target.value }))}
              onBlur={() => commitPosition("xMm")}
              onKeyDown={handleCommitKey}
            />
          </label>
          <label className="property-field">
            <span>Plan Y (mm)</span>
            <input
              type="number"
              step="10"
              data-testid="annotation-plan-y-input"
              value={positionDraft.yMm}
              onChange={(event) => setPositionDraft((current) => ({ ...current, yMm: event.target.value }))}
              onBlur={() => commitPosition("yMm")}
              onKeyDown={handleCommitKey}
            />
          </label>
          <label className="property-field">
            <span>Elevation (mm)</span>
            <input
              type="number"
              step="10"
              value={positionDraft.zMm}
              onChange={(event) => setPositionDraft((current) => ({ ...current, zMm: event.target.value }))}
              onBlur={() => commitPosition("zMm")}
              onKeyDown={handleCommitKey}
            />
          </label>
          <div className="property-readout">
            <span>{selectedAnnotation.targetObjectId ? "Attached to" : "Attachment"}</span>
            <strong>
              {selectedAnnotation.targetObjectId
                ? targetMachine
                  ? `${targetMachine.definition.name} (${targetMachine.instanceId})`
                  : `Missing target (${selectedAnnotation.targetObjectId})`
                : selectedAnnotation.type === "callout"
                  ? "Free callout"
                  : "Free note"}
            </strong>
          </div>
          <label className="property-field">
            <span>Size Scale: {normalizeAnnotationSizeScale(selectedAnnotation.style)}x</span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              data-testid="annotation-size-scale-input"
              value={normalizeAnnotationSizeScale(selectedAnnotation.style)}
              onChange={(event) => {
                const sizeScale = normalizeAnnotationSizeScale({ sizeScale: Number(event.target.value) });
                onUpdateAnnotation(selectedAnnotation.id, {
                  style: { ...selectedAnnotation.style, sizeScale }
                });
              }}
            />
          </label>
          <label className="property-field">
            <span>Emphasis</span>
            <select
              value={selectedAnnotation.style?.emphasis ?? "normal"}
              onChange={(event) =>
                onUpdateAnnotation(selectedAnnotation.id, {
                  style: { ...selectedAnnotation.style, emphasis: event.target.value as "normal" | "important" | "critical" }
                })
              }
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="collision-toggle">
            <input
              type="checkbox"
              checked={selectedAnnotation.style?.background ?? true}
              onChange={(event) =>
                onUpdateAnnotation(selectedAnnotation.id, {
                  style: { ...selectedAnnotation.style, background: event.target.checked }
                })
              }
            />
            <span>Background</span>
          </label>
          <button className="delete-object-button" type="button" onClick={() => onDeleteAnnotation(selectedAnnotation.id)}>
            Delete Annotation
          </button>
        </div>
      ) : (
        <p className="empty-selection">Select an annotation to edit it.</p>
      )}
    </section>
  );
}
