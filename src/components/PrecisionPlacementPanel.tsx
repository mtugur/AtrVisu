import { useMemo, useState } from "react";
import type { PlacedMachine } from "../types/machine";
import type { PlacementSettings } from "../types/placement";
import {
  applyPositionSnap,
  calculateMeasurementBetweenMachines,
  distanceBetweenPlanPositionsMm,
  getRotationNudgeStepDeg,
  getMachinePlanPositionMm
} from "../utils/placement";
import { formatLength, mmToMeters } from "../utils/units";

type PrecisionPlacementPanelProps = {
  settings: PlacementSettings;
  placedMachines: PlacedMachine[];
  selectedMachine?: PlacedMachine;
  onChangeSettings: (settings: PlacementSettings) => void;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>,
    options?: { snapPosition?: boolean; snapRotation?: boolean }
  ) => void;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

export function PrecisionPlacementPanel({
  settings,
  placedMachines,
  selectedMachine,
  onChangeSettings,
  onUpdateMachine
}: PrecisionPlacementPanelProps) {
  const [objectAId, setObjectAId] = useState("");
  const [objectBId, setObjectBId] = useState("");
  const objectA = placedMachines.find((machine) => machine.instanceId === (objectAId || placedMachines[0]?.instanceId));
  const objectB = placedMachines.find((machine) => machine.instanceId === (objectBId || placedMachines[1]?.instanceId));
  const measurement = objectA && objectB && objectA.instanceId !== objectB.instanceId
    ? calculateMeasurementBetweenMachines(objectA, objectB)
    : null;

  const nearestDistance = useMemo(() => {
    if (!selectedMachine) {
      return null;
    }

    const selectedPosition = getMachinePlanPositionMm(selectedMachine);
    return placedMachines
      .filter((machine) => machine.instanceId !== selectedMachine.instanceId)
      .map((machine) => ({
        name: machine.definition.name,
        distanceMm: distanceBetweenPlanPositionsMm(selectedPosition, getMachinePlanPositionMm(machine))
      }))
      .sort((a, b) => a.distanceMm - b.distanceMm)[0] ?? null;
  }, [placedMachines, selectedMachine]);

  const updateNumberSetting = (key: "gridSnapStepMm" | "rotationSnapStepDeg", value: string) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0 || (key === "rotationSnapStepDeg" && numericValue > 360)) {
      return;
    }
    onChangeSettings({
      ...settings,
      [key]: numericValue
    });
  };

  const snapSelectedToGrid = () => {
    if (!selectedMachine) {
      return;
    }
    const snapped = applyPositionSnap(getMachinePlanPositionMm(selectedMachine), {
      ...settings,
      gridSnapEnabled: true
    });
    onUpdateMachine(selectedMachine.instanceId, {
      position: {
        x: mmToMeters(snapped.xMm),
        z: mmToMeters(snapped.yMm)
      },
      positionMm: snapped
    });
  };

  const rotateSelected = (rotationDeg: number, snapRotation = true) => {
    if (!selectedMachine) {
      return;
    }
    onUpdateMachine(selectedMachine.instanceId, {
      rotationDeg,
      rotationY: rotationDeg
    }, { snapRotation });
  };

  const currentRotation = selectedMachine?.rotationDeg ?? selectedMachine?.rotationY ?? 0;

  return (
    <section className="precision-section" data-testid="precision-placement-panel" aria-label="Precision placement">
      <div className="precision-settings">
        <label>
          <input
            type="checkbox"
            checked={settings.gridSnapEnabled}
            onChange={(event) => onChangeSettings({ ...settings, gridSnapEnabled: event.target.checked })}
          />
          <span>Grid Snap</span>
        </label>
        <label>
          <span>Grid Snap Step (mm)</span>
          <input
            aria-label="Grid Snap Step"
            type="number"
            min="1"
            step="1"
            value={settings.gridSnapStepMm}
            onChange={(event) => updateNumberSetting("gridSnapStepMm", event.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.rotationSnapEnabled}
            onChange={(event) => onChangeSettings({ ...settings, rotationSnapEnabled: event.target.checked })}
          />
          <span>Rotation Snap</span>
        </label>
        <label>
          <span>Rotation Snap Step (deg)</span>
          <input
            aria-label="Rotation Snap Step"
            type="number"
            min="1"
            max="360"
            step="1"
            value={settings.rotationSnapStepDeg}
            onChange={(event) => updateNumberSetting("rotationSnapStepDeg", event.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showMeasurementHelpers}
            onChange={(event) => onChangeSettings({ ...settings, showMeasurementHelpers: event.target.checked })}
          />
          <span>Show Measurement Helpers</span>
        </label>
      </div>

      {selectedMachine ? (
        <div className="precision-actions">
          <button type="button" onClick={snapSelectedToGrid}>
            Snap Selected to Grid
          </button>
          <div className="rotation-button-grid" aria-label="Selected object rotation presets">
            {[0, 90, 180, 270].map((angle) => (
              <button key={angle} type="button" onClick={() => rotateSelected(angle, false)}>
                {angle}&deg;
              </button>
            ))}
            <button type="button" onClick={() => rotateSelected(currentRotation - getRotationNudgeStepDeg(settings))}>
              - Step
            </button>
            <button type="button" onClick={() => rotateSelected(currentRotation + getRotationNudgeStepDeg(settings))}>
              + Step
            </button>
            <button type="button" onClick={() => rotateSelected(currentRotation - 90, false)}>
              Rotate -90&deg;
            </button>
            <button type="button" onClick={() => rotateSelected(currentRotation + 90, false)}>
              Rotate +90&deg;
            </button>
          </div>
          {nearestDistance ? (
            <p className="measurement-readout">
              Nearest object: <strong>{nearestDistance.name}</strong>, {formatMm(nearestDistance.distanceMm)} center-to-center.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="collision-note">Select an object to use grid snap and rotation actions.</p>
      )}

      {settings.showMeasurementHelpers ? (
        <div className="measurement-section" aria-label="Measurement helpers">
          <label>
            <span>Object A</span>
            <select value={objectA?.instanceId ?? ""} onChange={(event) => setObjectAId(event.target.value)}>
              <option value="">Select object</option>
              {placedMachines.map((machine) => (
                <option key={machine.instanceId} value={machine.instanceId}>
                  {machine.definition.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Object B</span>
            <select value={objectB?.instanceId ?? ""} onChange={(event) => setObjectBId(event.target.value)}>
              <option value="">Select object</option>
              {placedMachines.map((machine) => (
                <option key={machine.instanceId} value={machine.instanceId}>
                  {machine.definition.name}
                </option>
              ))}
            </select>
          </label>
          {measurement ? (
            <div className="measurement-grid" data-testid="measurement-readout">
              <span>Center Distance</span>
              <strong>{formatMm(measurement.distanceMm)} / {measurement.distanceMeters.toFixed(3)} m</strong>
              <span>Delta X</span>
              <strong>{formatMm(measurement.deltaXMm)}</strong>
              <span>Delta Y</span>
              <strong>{formatMm(measurement.deltaYMm)}</strong>
              <span>Approx. Gap</span>
              <strong>{measurement.approximateGapMm === undefined ? "Not available" : formatMm(measurement.approximateGapMm)}</strong>
            </div>
          ) : (
            <p className="collision-note">Choose two objects to measure center-to-center distance.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
