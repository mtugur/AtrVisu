import type { CivilReferenceItem, CivilReferenceType } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import type { LayoutLevel } from "../types/levels";
import {
  getCivilLevelAnchorWorldElevationMm,
  getCivilTypeTransitionUpdate,
  getCivilTypeDefaults,
  getCivilTypeLabel,
  resizeCivilHeightPreservingLevelAnchor
} from "../utils/civil";
import { createNumericFieldRule } from "../utils/numericFieldRules";
import { NumericInput } from "./common/NumericInput";

type CivilReferencePropertiesProps = {
  selectedCivilReference?: CivilReferenceItem;
  layers: LayoutLayer[];
  levels: readonly LayoutLevel[];
  isLocked: boolean;
  onUpdateCivilReference: (id: string, updates: Partial<CivilReferenceItem>, options?: { recordHistory?: boolean }) => void;
  onChangeLayer: (id: string, layerId: string) => void;
  onChangeLevel: (id: string, levelId: string) => void;
  onUpdateRelativeElevation: (id: string, relativeElevationMm: number) => void;
  onDeleteCivilReference: (id: string) => void;
};

const civilTypes: Array<{ value: CivilReferenceType; label: string }> = [
  "floor-area",
  "wall",
  "column",
  "beam",
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
  levels,
  isLocked,
  onUpdateCivilReference,
  onChangeLayer,
  onChangeLevel,
  onUpdateRelativeElevation,
  onDeleteCivilReference
}: CivilReferencePropertiesProps) {
  const assignedLevel = levels.find((level) => level.id === selectedCivilReference?.levelId) ?? levels[0];
  const isFloorArea = selectedCivilReference?.type === "floor-area";
  const worldElevationMm = selectedCivilReference
    ? getCivilLevelAnchorWorldElevationMm(selectedCivilReference)
    : 0;
  const relativeElevationMm = worldElevationMm - (assignedLevel?.elevationMm ?? 0);
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
    if (axis === "heightMm" && selectedCivilReference.type === "floor-area") {
      onUpdateCivilReference(
        selectedCivilReference.id,
        resizeCivilHeightPreservingLevelAnchor(selectedCivilReference, value)
      );
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
                onUpdateCivilReference(
                  selectedCivilReference.id,
                  getCivilTypeTransitionUpdate(selectedCivilReference, event.target.value as CivilReferenceType)
                )
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
            <span>Level</span>
            <select
              aria-label="Civil Level"
              value={assignedLevel?.id ?? "ground"}
              disabled={isLocked}
              onChange={(event) => onChangeLevel(selectedCivilReference.id, event.target.value)}
            >
              {levels.map((level) => <option key={level.id} value={level.id}>{level.name} ({level.elevationMm} mm)</option>)}
            </select>
          </label>
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
            <span>{isFloorArea ? "Top Elevation above Level (mm)" : "Elevation above Level (mm)"}</span>
            <NumericInput
              ariaLabel={isFloorArea ? "Civil Top Elevation above Level" : "Civil Elevation above Level"}
              disabled={isLocked}
              rule={civilElevationRule}
              step="10"
              value={relativeElevationMm}
              onChange={(value) => onUpdateRelativeElevation(selectedCivilReference.id, value)}
              onCommit={(value) => value !== undefined && onUpdateRelativeElevation(selectedCivilReference.id, value)}
            />
          </label>
          <div className="property-readout" data-testid="civil-world-elevation">
            <span>{isFloorArea ? "Top Surface World Elevation" : "World Elevation"}</span>
            <strong>{worldElevationMm} mm</strong>
          </div>
          {isFloorArea ? (
            <div className="property-readout" data-testid="civil-bottom-world-elevation">
              <span>Bottom Surface World Elevation</span>
              <strong>{selectedCivilReference.positionMm.zMm ?? 0} mm</strong>
            </div>
          ) : null}
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
            <span>{isFloorArea ? "Plan Depth (mm)" : "Depth / Thickness (mm)"}</span>
            <NumericInput
              ariaLabel={isFloorArea ? "Civil Plan Depth" : "Civil Depth"}
              disabled={isLocked}
              rule={civilDepthRule}
              step="10"
              value={selectedCivilReference.sizeMm.depthMm}
              onChange={(value) => updateSize("depthMm", value)}
              onCommit={(value) => updateSize("depthMm", value)}
            />
          </label>
          <label className="property-field">
            <span>{isFloorArea ? "Floor Thickness (mm)" : "Height (mm)"}</span>
            <NumericInput
              ariaLabel={isFloorArea ? "Civil Floor Thickness" : "Civil Height"}
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
          <label className="property-field">
            <span>Color</span>
            <input
              type="color"
              aria-label="Civil Color"
              disabled={isLocked}
              value={selectedCivilReference.style?.colorToken ?? getCivilTypeDefaults(selectedCivilReference.type).colorToken}
              onChange={(event) => onUpdateCivilReference(selectedCivilReference.id, {
                style: { ...selectedCivilReference.style, colorToken: event.currentTarget.value }
              })}
            />
          </label>
          <label className="property-field">
            <span>Opacity</span>
            <input
              type="range"
              aria-label="Civil Opacity"
              min="0.05"
              max="1"
              step="0.01"
              disabled={isLocked}
              value={selectedCivilReference.style?.opacity ?? getCivilTypeDefaults(selectedCivilReference.type).opacity}
              onChange={(event) => onUpdateCivilReference(selectedCivilReference.id, {
                style: { ...selectedCivilReference.style, opacity: Number(event.currentTarget.value) }
              })}
            />
            <output>{Math.round(100 * (selectedCivilReference.style?.opacity ?? getCivilTypeDefaults(selectedCivilReference.type).opacity))}%</output>
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
