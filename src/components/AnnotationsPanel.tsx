import type { AnnotationObject, AnnotationType } from "../types/annotations";
import type { PlacedMachine } from "../types/machine";
import { normalizeAnnotationSizeScale } from "../utils/annotations";
import { createNumericFieldRule } from "../utils/numericFieldRules";
import { NumericInput } from "./common/NumericInput";

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

const annotationPlanXRule = createNumericFieldRule({
  key: "annotation.planX",
  label: "Annotation Plan X",
  unit: "mm",
  numericKind: "signed-coordinate",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const annotationPlanYRule = createNumericFieldRule({
  key: "annotation.planY",
  label: "Annotation Plan Y",
  unit: "mm",
  numericKind: "signed-coordinate",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const annotationElevationRule = createNumericFieldRule({
  key: "annotation.elevation",
  label: "Annotation Elevation",
  unit: "mm",
  numericKind: "non-negative-physical",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

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
  const updatePosition = (axis: "xMm" | "yMm" | "zMm", value: number, recordHistory = false) => {
    if (!selectedAnnotation) {
      return;
    }

    onUpdateAnnotation(
      selectedAnnotation.id,
      {
        positionMm: {
          ...selectedAnnotation.positionMm,
          [axis]: axis === "zMm" ? Math.max(0, value) : value
        }
      },
      { recordHistory }
    );
  };

  const commitPosition = (axis: "xMm" | "yMm" | "zMm", value: number | undefined) => {
    if (value === undefined) {
      return;
    }

    updatePosition(axis, value, false);
    onCommitAnnotationEdit();
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
            <NumericInput
              ariaLabel="Annotation Plan X"
              data-testid="annotation-plan-x-input"
              rule={annotationPlanXRule}
              step="10"
              value={selectedAnnotation.positionMm.xMm}
              onChange={(value) => updatePosition("xMm", value, false)}
              onCommit={(value) => commitPosition("xMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Plan Y (mm)</span>
            <NumericInput
              ariaLabel="Annotation Plan Y"
              data-testid="annotation-plan-y-input"
              rule={annotationPlanYRule}
              step="10"
              value={selectedAnnotation.positionMm.yMm}
              onChange={(value) => updatePosition("yMm", value, false)}
              onCommit={(value) => commitPosition("yMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Elevation (mm)</span>
            <NumericInput
              ariaLabel="Annotation Elevation"
              rule={annotationElevationRule}
              step="10"
              value={selectedAnnotation.positionMm.zMm ?? 1600}
              onChange={(value) => updatePosition("zMm", value, false)}
              onCommit={(value) => commitPosition("zMm", value)}
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
