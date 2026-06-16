import type { CivilReferenceItem, CivilReferenceType } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import { getCivilTypeLabel } from "../utils/civil";
import { createNumericFieldRule } from "../utils/numericFieldRules";
import { NumericInput } from "./common/NumericInput";

type CivilReferencePropertiesProps = {
  selectedCivilReference?: CivilReferenceItem;
  layers: LayoutLayer[];
  isLocked: boolean;
  onUpdateCivilReference: (id: string, updates: Partial<CivilReferenceItem>, options?: { recordHistory?: boolean }) => void;
  onChangeLayer: (id: string, layerId: string) => void;
  onDeleteCivilReference: (id: string) => void;
};

const civilTypes: Array<{ value: CivilReferenceType; label: string }> = [
  "floor-area",
  "wall",
  "column",
  "door-opening",
  "restricted-area",
  "walkway",
  "reference-zone"
].map((type) => ({ value: type as CivilReferenceType, label: getCivilTypeLabel(type as CivilReferenceType) }));

const civilPlanXRule = createNumericFieldRule({
  key: "civil.planX",
  label: "Civil Plan X",
  unit: "mm",
  numericKind: "signed-coordinate",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const civilPlanYRule = createNumericFieldRule({
  key: "civil.planY",
  label: "Civil Plan Y",
  unit: "mm",
  numericKind: "signed-coordinate",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const civilElevationRule = createNumericFieldRule({
  key: "civil.elevation",
  label: "Civil Elevation",
  unit: "mm",
  numericKind: "non-negative-physical",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const civilWidthRule = createNumericFieldRule({
  key: "civil.width",
  label: "Civil Width",
  unit: "mm",
  numericKind: "positive-physical",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "greater-than-zero",
  invalidInputBehavior: "keep-invalid"
});

const civilDepthRule = createNumericFieldRule({
  key: "civil.depth",
  label: "Civil Depth",
  unit: "mm",
  numericKind: "positive-physical",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "greater-than-zero",
  invalidInputBehavior: "keep-invalid"
});

const civilHeightRule = createNumericFieldRule({
  key: "civil.height",
  label: "Civil Height",
  unit: "mm",
  numericKind: "positive-physical",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "greater-than-zero",
  invalidInputBehavior: "keep-invalid"
});

const civilRotationRule = createNumericFieldRule({
  key: "civil.rotation",
  label: "Civil Rotation Angle",
  unit: "deg",
  numericKind: "angle",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid",
  allowNegative: true
});

export function CivilReferenceProperties({
  selectedCivilReference,
  layers,
  isLocked,
  onUpdateCivilReference,
  onChangeLayer,
  onDeleteCivilReference
}: CivilReferencePropertiesProps) {
  const updatePosition = (axis: "xMm" | "yMm" | "zMm", value: number | undefined) => {
    if (!selectedCivilReference || value === undefined || isLocked) {
      return;
    }
    onUpdateCivilReference(selectedCivilReference.id, {
      positionMm: {
        ...selectedCivilReference.positionMm,
        [axis]: axis === "zMm" ? Math.max(0, value) : value
      }
    });
  };

  const updateSize = (axis: "widthMm" | "depthMm" | "heightMm", value: number | undefined) => {
    if (!selectedCivilReference || value === undefined || value <= 0 || isLocked) {
      return;
    }
    onUpdateCivilReference(selectedCivilReference.id, {
      sizeMm: {
        ...selectedCivilReference.sizeMm,
        [axis]: value
      }
    });
  };

  return (
    <section className="properties-section" aria-label="Civil Reference Properties" data-testid="civil-reference-properties">
      <header className="section-header">
        <span>Civil Reference</span>
        <strong>{selectedCivilReference ? selectedCivilReference.name : "None"}</strong>
      </header>
      {selectedCivilReference ? (
        <div className="properties-body">
          <label className="property-field">
            <span>Name</span>
            <input
              type="text"
              disabled={isLocked}
              value={selectedCivilReference.name}
              onChange={(event) => onUpdateCivilReference(selectedCivilReference.id, { name: event.target.value })}
            />
          </label>
          <label className="property-field">
            <span>Type</span>
            <select
              value={selectedCivilReference.type}
              disabled={isLocked}
              onChange={(event) =>
                onUpdateCivilReference(selectedCivilReference.id, { type: event.target.value as CivilReferenceType })
              }
            >
              {civilTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="property-field">
            <span>Layer</span>
            <select
              value={selectedCivilReference.layerId ?? "default"}
              disabled={isLocked}
              onChange={(event) => onChangeLayer(selectedCivilReference.id, event.target.value)}
            >
              {layers.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}{layer.locked ? " (locked)" : ""}
                </option>
              ))}
            </select>
          </label>
          {isLocked ? (
            <p className="layer-lock-note">This civil reference is locked. Movement, editing, and delete are disabled.</p>
          ) : null}
          <label className="property-field">
            <span>Plan X (mm)</span>
            <NumericInput
              ariaLabel="Civil Plan X"
              data-testid="civil-plan-x-input"
              disabled={isLocked}
              rule={civilPlanXRule}
              step="10"
              value={selectedCivilReference.positionMm.xMm}
              onChange={(value) => updatePosition("xMm", value)}
              onCommit={(value) => updatePosition("xMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Plan Y (mm)</span>
            <NumericInput
              ariaLabel="Civil Plan Y"
              data-testid="civil-plan-y-input"
              disabled={isLocked}
              rule={civilPlanYRule}
              step="10"
              value={selectedCivilReference.positionMm.yMm}
              onChange={(value) => updatePosition("yMm", value)}
              onCommit={(value) => updatePosition("yMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Elevation (mm)</span>
            <NumericInput
              ariaLabel="Civil Elevation"
              disabled={isLocked}
              rule={civilElevationRule}
              step="10"
              value={selectedCivilReference.positionMm.zMm ?? 0}
              onChange={(value) => updatePosition("zMm", value)}
              onCommit={(value) => updatePosition("zMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Width / Length (mm)</span>
            <NumericInput
              ariaLabel="Civil Width"
              disabled={isLocked}
              rule={civilWidthRule}
              step="10"
              value={selectedCivilReference.sizeMm.widthMm}
              onChange={(value) => updateSize("widthMm", value)}
              onCommit={(value) => updateSize("widthMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Depth / Thickness (mm)</span>
            <NumericInput
              ariaLabel="Civil Depth"
              disabled={isLocked}
              rule={civilDepthRule}
              step="10"
              value={selectedCivilReference.sizeMm.depthMm}
              onChange={(value) => updateSize("depthMm", value)}
              onCommit={(value) => updateSize("depthMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Height (mm)</span>
            <NumericInput
              ariaLabel="Civil Height"
              disabled={isLocked}
              rule={civilHeightRule}
              step="10"
              value={selectedCivilReference.sizeMm.heightMm ?? 20}
              onChange={(value) => updateSize("heightMm", value)}
              onCommit={(value) => updateSize("heightMm", value)}
            />
          </label>
          <label className="property-field">
            <span>Rotation Angle (&deg;)</span>
            <NumericInput
              ariaLabel="Civil Rotation Angle"
              disabled={isLocked}
              rule={civilRotationRule}
              step="1"
              value={selectedCivilReference.rotationDeg}
              onChange={(value) =>
                onUpdateCivilReference(selectedCivilReference.id, { rotationDeg: value ?? selectedCivilReference.rotationDeg })
              }
              onCommit={(value) => {
                if (value !== undefined) {
                  onUpdateCivilReference(selectedCivilReference.id, { rotationDeg: value });
                }
              }}
            />
          </label>
          <label className="collision-toggle">
            <input
              type="checkbox"
              checked={selectedCivilReference.locked === true}
              disabled={isLocked && selectedCivilReference.locked !== true}
              onChange={(event) => onUpdateCivilReference(selectedCivilReference.id, { locked: event.target.checked })}
            />
            <span>Item locked</span>
          </label>
          <button
            className="delete-object-button"
            type="button"
            disabled={isLocked}
            onClick={() => onDeleteCivilReference(selectedCivilReference.id)}
          >
            Delete Civil Reference
          </button>
        </div>
      ) : (
        <p className="empty-selection">Select a civil reference in the scene to edit it.</p>
      )}
    </section>
  );
}
