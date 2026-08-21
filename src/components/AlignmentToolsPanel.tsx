import { useState } from "react";
import type {
  AlignmentAction,
  DistributionAction,
  EqualGapAction,
  FootprintAnchor,
  PairAlignmentAction
} from "../types/alignment";

type AlignmentToolsPanelProps = {
  selectedEntityCount: number;
  primarySelectionLabel?: string;
  onAlign: (action: AlignmentAction) => void;
  onDistribute: (action: DistributionAction) => void;
  onEqualGap: (action: EqualGapAction) => void;
  onPairAlign: (action: PairAlignmentAction, gapMm?: number) => void;
  onPairAnchorSnap: (primaryAnchor: FootprintAnchor, secondaryAnchor: FootprintAnchor) => void;
  movementAllowed?: boolean;
};

const anchorOptions: Array<{ value: FootprintAnchor; label: string }> = [
  { value: "center", label: "Center" },
  { value: "leftCenter", label: "Left edge center" },
  { value: "rightCenter", label: "Right edge center" },
  { value: "frontCenter", label: "Front edge center" },
  { value: "backCenter", label: "Back edge center" },
  { value: "frontLeft", label: "Front-left corner" },
  { value: "frontRight", label: "Front-right corner" },
  { value: "backLeft", label: "Back-left corner" },
  { value: "backRight", label: "Back-right corner" }
];

export function AlignmentToolsPanel({
  selectedEntityCount,
  primarySelectionLabel,
  onAlign,
  onDistribute,
  onEqualGap,
  onPairAlign,
  onPairAnchorSnap,
  movementAllowed = true
}: AlignmentToolsPanelProps) {
  const [pairGapXMm, setPairGapXMm] = useState(100);
  const [pairGapYMm, setPairGapYMm] = useState(100);
  const [primaryAnchor, setPrimaryAnchor] = useState<FootprintAnchor>("center");
  const [secondaryAnchor, setSecondaryAnchor] = useState<FootprintAnchor>("center");
  const distributionDisabled = !movementAllowed || selectedEntityCount < 3;
  const distributionReason = selectedEntityCount < 3
    ? "Select three or more objects to distribute."
    : undefined;

  return (
    <section className="precision-section alignment-tools" data-testid="alignment-tools-panel" aria-label="Alignment tools">
      <div className="selection-tools-summary">
        <span>{selectedEntityCount} objects selected</span>
        <strong>{primarySelectionLabel ?? "Primary selected object"}</strong>
      </div>
      <div className="selection-tools-common-groups">
        <div className="alignment-group">
          <strong>Align</strong>
          <div className="alignment-button-grid">
            <button type="button" disabled={!movementAllowed} data-testid="align-left-button" onClick={() => onAlign("left")}>Left</button>
            <button type="button" disabled={!movementAllowed} onClick={() => onAlign("centerX")}>Center X</button>
            <button type="button" disabled={!movementAllowed} onClick={() => onAlign("right")}>Right</button>
            <button type="button" disabled={!movementAllowed} onClick={() => onAlign("front")}>Front</button>
            <button type="button" disabled={!movementAllowed} onClick={() => onAlign("centerY")}>Center Y</button>
            <button type="button" disabled={!movementAllowed} onClick={() => onAlign("back")}>Back</button>
          </div>
        </div>
        <div className="alignment-group">
          <strong>Distribute</strong>
          <div className="alignment-button-grid">
            <button type="button" disabled={distributionDisabled} title={distributionReason} onClick={() => onDistribute("horizontal")}>Horizontal</button>
            <button type="button" disabled={distributionDisabled} title={distributionReason} onClick={() => onDistribute("vertical")}>Vertical</button>
            <button type="button" disabled={distributionDisabled} title={distributionReason} onClick={() => onEqualGap("gapX")}>Equal Gap X</button>
            <button type="button" disabled={distributionDisabled} title={distributionReason} onClick={() => onEqualGap("gapY")}>Equal Gap Y</button>
          </div>
          {selectedEntityCount < 3 ? <small>Select three or more objects to distribute.</small> : null}
        </div>
      </div>
      {selectedEntityCount === 2 ? (
        <details className="selection-tools-advanced" data-testid="selection-tools-advanced">
          <summary>Advanced pair alignment</summary>
          <div className="selection-tools-advanced-content">
            <p>Primary moves; secondary stays fixed.</p>
            <div className="alignment-button-grid">
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("leftToRight")}>Left to right</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("rightToLeft")}>Right to left</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("frontToBack")}>Front to back</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("backToFront")}>Back to front</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("centerX")}>Match Center X</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("centerY")}>Match Center Y</button>
            </div>
            <div className="alignment-button-grid">
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("leftToRight", 0)}>Zero Gap X: left to right</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("rightToLeft", 0)}>Zero Gap X: right to left</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("frontToBack", 0)}>Zero Gap Y: front to back</button>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("backToFront", 0)}>Zero Gap Y: back to front</button>
            </div>
            <div className="pair-gap-grid">
              <label className="property-field"><span>Pair Gap X (mm)</span><input type="number" min="0" step="10" value={pairGapXMm} onChange={(event) => setPairGapXMm(Math.max(0, Number(event.target.value) || 0))} /></label>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("gapX", pairGapXMm)}>Set Gap X</button>
              <label className="property-field"><span>Pair Gap Y (mm)</span><input type="number" min="0" step="10" value={pairGapYMm} onChange={(event) => setPairGapYMm(Math.max(0, Number(event.target.value) || 0))} /></label>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("gapY", pairGapYMm)}>Set Gap Y</button>
            </div>
            <div className="pair-anchor-grid" data-testid="pair-anchor-snap-section">
              <label className="property-field"><span>Primary Anchor</span><select value={primaryAnchor} onChange={(event) => setPrimaryAnchor(event.target.value as FootprintAnchor)}>{anchorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="property-field"><span>Secondary Anchor</span><select value={secondaryAnchor} onChange={(event) => setSecondaryAnchor(event.target.value as FootprintAnchor)}>{anchorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAnchorSnap(primaryAnchor, secondaryAnchor)}>Snap Primary Anchor to Secondary Anchor</button>
            </div>
          </div>
        </details>
      ) : null}
    </section>
  );
}
