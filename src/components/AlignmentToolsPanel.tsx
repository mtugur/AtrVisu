import { useState } from "react";
import type {
  AlignmentAction,
  DistributionAction,
  EqualGapAction,
  FootprintAnchor,
  PairAlignmentAction
} from "../types/alignment";
import type { NudgeSettings } from "../types/selection";

type AlignmentToolsPanelProps = {
  selectedEntityCount: number;
  primarySelectionLabel?: string;
  nudgeSettings: NudgeSettings;
  onAlign: (action: AlignmentAction) => void;
  onDistribute: (action: DistributionAction) => void;
  onEqualGap: (action: EqualGapAction) => void;
  onPairAlign: (action: PairAlignmentAction, gapMm?: number) => void;
  onPairAnchorSnap: (primaryAnchor: FootprintAnchor, secondaryAnchor: FootprintAnchor) => void;
  onChangeNudgeSettings: (settings: NudgeSettings) => void;
  movementAllowed?: boolean;
};

const toPositiveNumber = (value: string, fallback: number) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
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
  nudgeSettings,
  onAlign,
  onDistribute,
  onEqualGap,
  onPairAlign,
  onPairAnchorSnap,
  onChangeNudgeSettings,
  movementAllowed = true
}: AlignmentToolsPanelProps) {
  const [pairGapXMm, setPairGapXMm] = useState(100);
  const [pairGapYMm, setPairGapYMm] = useState(100);
  const [primaryAnchor, setPrimaryAnchor] = useState<FootprintAnchor>("center");
  const [secondaryAnchor, setSecondaryAnchor] = useState<FootprintAnchor>("center");
  const hasEnoughObjects = selectedEntityCount >= 2;
  const hasPair = selectedEntityCount === 2;

  return (
    <section className="precision-section alignment-tools" data-testid="alignment-tools-panel" aria-label="Alignment tools">
      {hasEnoughObjects ? (
        <>
          <div className="property-readout">
            <span>Anchor</span>
            <strong>{primarySelectionLabel ?? "Primary selected object"}</strong>
          </div>
          <div className="alignment-group">
            <strong>Align to Primary</strong>
            <div className="alignment-button-grid">
              <button type="button" disabled={!movementAllowed} data-testid="align-left-button" onClick={() => onAlign("left")}>
                Left
              </button>
              <button type="button" disabled={!movementAllowed} onClick={() => onAlign("right")}>
                Right
              </button>
              <button type="button" disabled={!movementAllowed} onClick={() => onAlign("front")}>
                Front
              </button>
              <button type="button" disabled={!movementAllowed} onClick={() => onAlign("back")}>
                Back
              </button>
              <button type="button" disabled={!movementAllowed} onClick={() => onAlign("centerX")}>
                Center X
              </button>
              <button type="button" disabled={!movementAllowed} onClick={() => onAlign("centerY")}>
                Center Y
              </button>
            </div>
          </div>
          <div className="alignment-group">
            <strong>Distribute</strong>
            <div className="alignment-button-grid">
              <button type="button" disabled={!movementAllowed || selectedEntityCount < 3} onClick={() => onDistribute("horizontal")}>
                Horizontal
              </button>
              <button type="button" disabled={!movementAllowed || selectedEntityCount < 3} onClick={() => onDistribute("vertical")}>
                Vertical
              </button>
              <button type="button" disabled={!movementAllowed || selectedEntityCount < 3} onClick={() => onEqualGap("gapX")}>
                Equal Gap X
              </button>
              <button type="button" disabled={!movementAllowed || selectedEntityCount < 3} onClick={() => onEqualGap("gapY")}>
                Equal Gap Y
              </button>
            </div>
          </div>
          {hasPair ? (
            <div className="alignment-group">
              <strong>Pair Alignment - primary moves, secondary stays fixed</strong>
              <div className="alignment-button-grid">
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("leftToRight")}>
                  Primary left edge to secondary right edge
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("rightToLeft")}>
                  Primary right edge to secondary left edge
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("frontToBack")}>
                  Primary front edge to secondary back edge
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("backToFront")}>
                  Primary back edge to secondary front edge
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("centerX")}>
                  Match Center X
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("centerY")}>
                  Match Center Y
                </button>
              </div>
              <div className="alignment-button-grid">
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("leftToRight", 0)}>
                  Zero Gap X: left to right
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("rightToLeft", 0)}>
                  Zero Gap X: right to left
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("frontToBack", 0)}>
                  Zero Gap Y: front to back
                </button>
                <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("backToFront", 0)}>
                  Zero Gap Y: back to front
                </button>
              </div>
              <label className="property-field">
                <span>Pair Gap X (mm)</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={pairGapXMm}
                  onChange={(event) => setPairGapXMm(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("gapX", pairGapXMm)}>
                Set Gap X
              </button>
              <label className="property-field">
                <span>Pair Gap Y (mm)</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={pairGapYMm}
                  onChange={(event) => setPairGapYMm(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
              <button type="button" disabled={!movementAllowed} onClick={() => onPairAlign("gapY", pairGapYMm)}>
                Set Gap Y
              </button>
              <div className="pair-anchor-grid" data-testid="pair-anchor-snap-section">
                <label className="property-field">
                  <span>Primary Anchor</span>
                  <select
                    value={primaryAnchor}
                    onChange={(event) => setPrimaryAnchor(event.target.value as FootprintAnchor)}
                  >
                    {anchorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="property-field">
                  <span>Secondary Anchor</span>
                  <select
                    value={secondaryAnchor}
                    onChange={(event) => setSecondaryAnchor(event.target.value as FootprintAnchor)}
                  >
                    {anchorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!movementAllowed}
                  onClick={() => onPairAnchorSnap(primaryAnchor, secondaryAnchor)}
                >
                  Snap Primary Anchor to Secondary Anchor
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="collision-note">Select at least two objects to use alignment tools.</p>
      )}
      <div className="alignment-group">
        <strong>Keyboard Nudge</strong>
        <label className="property-field">
          <span>Default Step (mm)</span>
          <input
            type="number"
            min="1"
            step="10"
            value={nudgeSettings.nudgeStepMm}
            onChange={(event) =>
              onChangeNudgeSettings({
                ...nudgeSettings,
                nudgeStepMm: toPositiveNumber(event.target.value, nudgeSettings.nudgeStepMm)
              })
            }
          />
        </label>
        <label className="property-field">
          <span>Large Step (mm)</span>
          <input
            type="number"
            min="1"
            step="10"
            value={nudgeSettings.largeNudgeStepMm}
            onChange={(event) =>
              onChangeNudgeSettings({
                ...nudgeSettings,
                largeNudgeStepMm: toPositiveNumber(event.target.value, nudgeSettings.largeNudgeStepMm)
              })
            }
          />
        </label>
        <label className="property-field">
          <span>Small Step (mm)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={nudgeSettings.smallNudgeStepMm}
            onChange={(event) =>
              onChangeNudgeSettings({
                ...nudgeSettings,
                smallNudgeStepMm: toPositiveNumber(event.target.value, nudgeSettings.smallNudgeStepMm)
              })
            }
          />
        </label>
      </div>
    </section>
  );
}
