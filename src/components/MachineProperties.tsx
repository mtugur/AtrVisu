import { useEffect, useState } from "react";
import type { CollisionPair } from "../types/collision";
import type { PlacedMachine } from "../types/machine";
import type { VisualModelDiagnostics } from "../types/overlays";
import type { PlacementSettings } from "../types/placement";
import { getCollisionEnvelopeForMachine } from "../utils/collision";
import { getEffectiveMaintenanceClearance, normalizeAtaraMachineData, summarizeUtilityRequirements } from "../utils/ataraMachineData";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import { commitRotationAngle } from "../utils/placement";
import { formatLength, metersToMm, mmToMeters } from "../utils/units";
import {
  getConnectionPointsForObject,
  getConnectionPointDisplayLabel,
  validateConnectionPointsForObject
} from "../utils/connectionPoints";

type MachinePropertiesProps = {
  selectedMachine?: PlacedMachine;
  placementSettings: PlacementSettings;
  visualDiagnostics?: VisualModelDiagnostics;
  collisionPairs: CollisionPair[];
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>,
    options?: { snapPosition?: boolean; snapRotation?: boolean }
  ) => void;
  onDeleteSelected: () => void;
};

const formatMm = (value: number) => formatLength(value, "mm", 0);

const summarizeConnectionPointMetadata = (metadata?: {
  voltage?: number;
  powerKw?: number;
  airPressureBar?: number;
  airConsumptionNlMin?: number;
  protocol?: string;
  description?: string;
}) => {
  const parts = [
    metadata?.voltage !== undefined ? `${metadata.voltage} V` : "",
    metadata?.powerKw !== undefined ? `${metadata.powerKw} kW` : "",
    metadata?.airPressureBar !== undefined ? `${metadata.airPressureBar} bar` : "",
    metadata?.airConsumptionNlMin !== undefined ? `${metadata.airConsumptionNlMin} Nl/min` : "",
    metadata?.protocol ? `Protocol: ${metadata.protocol}` : "",
    metadata?.description ?? ""
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "No metadata";
};

export const getSelectedAtaraMachineDataState = (selectedMachine?: PlacedMachine) => {
  const dimensionsMm = selectedMachine ? getMachineDimensionsMm(selectedMachine.definition) : null;
  const ataraSnapshotData = selectedMachine
    ? normalizeAtaraMachineData(selectedMachine.definitionSnapshot.ataraMachineData, dimensionsMm ?? undefined)
    : undefined;
  const ataraDefinitionData = selectedMachine
    ? normalizeAtaraMachineData(selectedMachine.definition.ataraMachineData, dimensionsMm ?? undefined)
    : undefined;

  return {
    ataraMachineData: ataraSnapshotData ?? ataraDefinitionData,
    hasNewerLibraryAtaraData: Boolean(!ataraSnapshotData && ataraDefinitionData),
    ataraClearance: selectedMachine ? getEffectiveMaintenanceClearance(selectedMachine.definition) : null
  };
};

export function MachineProperties({
  selectedMachine,
  placementSettings,
  visualDiagnostics,
  collisionPairs,
  onUpdateMachine,
  onDeleteSelected
}: MachinePropertiesProps) {
  const currentRotation = selectedMachine?.rotationDeg ?? selectedMachine?.rotationY ?? 0;
  const [rotationDraft, setRotationDraft] = useState(String(currentRotation));

  useEffect(() => {
    setRotationDraft(String(currentRotation));
  }, [currentRotation, selectedMachine?.instanceId]);

  const updatePosition = (axis: "x" | "z", value: string) => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const currentPositionMm = selectedMachine.positionMm ?? {
      xMm: metersToMm(selectedMachine.position.x),
      yMm: metersToMm(selectedMachine.position.z)
    };
    const nextPositionMm = {
      ...currentPositionMm,
      [axis === "x" ? "xMm" : "yMm"]: numericValue
    };

    onUpdateMachine(selectedMachine.instanceId, {
      position: {
        x: mmToMeters(nextPositionMm.xMm),
        z: mmToMeters(nextPositionMm.yMm)
      },
      positionMm: nextPositionMm
    });
  };

  const updateElevation = (value: string) => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    onUpdateMachine(selectedMachine.instanceId, {
      elevationMm: numericValue
    });
  };

  const getPositionMm = () => {
    if (!selectedMachine) {
      return { xMm: 0, yMm: 0 };
    }

    return selectedMachine.positionMm ?? {
      xMm: metersToMm(selectedMachine.position.x),
      yMm: metersToMm(selectedMachine.position.z)
    };
  };

  const commitRotation = () => {
    if (!selectedMachine) {
      return;
    }

    const numericValue = Number(rotationDraft);
    if (!Number.isFinite(numericValue)) {
      setRotationDraft(String(currentRotation));
      return;
    }

    const committedRotation = commitRotationAngle(numericValue, placementSettings);
    setRotationDraft(String(committedRotation));
    onUpdateMachine(selectedMachine.instanceId, {
      rotationY: committedRotation,
      rotationDeg: committedRotation
    }, { snapRotation: false });
  };

  const positionMm = getPositionMm();
  const dimensionsMm = selectedMachine ? getMachineDimensionsMm(selectedMachine.definition) : null;
  const formatOptionalMm = (value?: number) => (typeof value === "number" ? formatMm(value) : "Not available");
  const formatOffset = (offset?: { xMm: number; yMm: number; zMm: number }) =>
    offset ? `X ${formatMm(offset.xMm)}, Y ${formatMm(offset.yMm)}, Z ${formatMm(offset.zMm)}` : "Not available";
  const formatRotationOffset = (offset?: { x: number; y: number; z: number }) =>
    offset ? `X ${offset.x} deg, Y ${offset.y} deg, Z ${offset.z} deg` : "Not available";
  const formatYesNo = (value?: boolean) => (typeof value === "boolean" ? (value ? "Yes" : "No") : "Not available");
  const formatScale = (scale?: { x: number; y: number; z: number }) =>
    scale ? `X ${scale.x.toFixed(4)}, Y ${scale.y.toFixed(4)}, Z ${scale.z.toFixed(4)}` : "Not available";
  const collisionEnvelope = selectedMachine ? getCollisionEnvelopeForMachine(selectedMachine) : null;
  const { ataraMachineData, hasNewerLibraryAtaraData, ataraClearance } = getSelectedAtaraMachineDataState(selectedMachine);
  const connectionPoints = selectedMachine ? getConnectionPointsForObject(selectedMachine) : [];
  const connectionPointDiagnostics = selectedMachine ? validateConnectionPointsForObject(selectedMachine) : null;
  const connectionPointTypeCounts = connectionPoints.reduce<Record<string, number>>((counts, point) => {
    counts[point.type] = (counts[point.type] ?? 0) + 1;
    return counts;
  }, {});
  const collidingNames = selectedMachine
    ? collisionPairs.map((pair) =>
        pair.objectAId === selectedMachine.instanceId ? pair.objectBName : pair.objectAName
      )
    : [];

  return (
    <section className="properties-section" aria-label="Selected machine properties">
      <header className="section-header">
        <span>Selection</span>
        <strong>{selectedMachine ? selectedMachine.definition.name : "None"}</strong>
      </header>

      {selectedMachine ? (
        <div className="properties-body">
          <div className="property-readout">
            <span>Name</span>
            <strong>{selectedMachine.definition.name}</strong>
          </div>
          <div className="property-readout">
            <span>Category</span>
            <strong>{selectedMachine.definition.category}</strong>
          </div>

          <label className="property-field">
            <span>Plan X (mm)</span>
            <input
              type="number"
              step="10"
              value={positionMm.xMm}
              onChange={(event) => updatePosition("x", event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Plan Y (mm)</span>
            <input
              type="number"
              step="10"
              value={positionMm.yMm}
              onChange={(event) => updatePosition("z", event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Elevation (mm)</span>
            <input
              type="number"
              step="10"
              value={selectedMachine.elevationMm ?? 0}
              onChange={(event) => updateElevation(event.target.value)}
            />
          </label>
          <label className="property-field">
            <span>Rotation Angle (&deg;)</span>
            <input
              type="number"
              step={placementSettings.rotationSnapEnabled ? placementSettings.rotationSnapStepDeg : 1}
              value={rotationDraft}
              onChange={(event) => setRotationDraft(event.target.value)}
              onBlur={commitRotation}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitRotation();
                  event.currentTarget.blur();
                }
              }}
            />
          </label>

          {dimensionsMm ? (
            <div className="dimension-grid" aria-label="Machine dimensions">
              <span>W {formatMm(dimensionsMm.widthMm)}</span>
              <span>D {formatMm(dimensionsMm.depthMm)}</span>
              <span>H {formatMm(dimensionsMm.heightMm)}</span>
            </div>
          ) : null}

          <details className="diagnostics-section" data-testid="atara-machine-data-diagnostics">
            <summary>ATARA Machine Data</summary>
            {ataraMachineData ? (
              <div className="diagnostics-grid">
                {hasNewerLibraryAtaraData ? (
                  <>
                    <span>Snapshot Warning</span>
                    <strong>This object uses an older definition snapshot. Re-add the item or update from library.</strong>
                  </>
                ) : null}
                <span>ATR ID</span>
                <strong>{ataraMachineData.identity?.atrId ?? "Not assigned"}</strong>
                <span>Machine Code</span>
                <strong>{ataraMachineData.identity?.machineCode ?? "Not assigned"}</strong>
                <span>Product Family Code</span>
                <strong>{ataraMachineData.identity?.productFamilyCode ?? selectedMachine.definition.productFamilyCode ?? "Not assigned"}</strong>
                <span>PDN Code</span>
                <strong>{ataraMachineData.identity?.pdnCode ?? "Not assigned"}</strong>
                <span>Is ATARA Product</span>
                <strong>{ataraMachineData.identity?.isAtaraProduct ? "Yes" : "No"}</strong>
                <span>Weight / Operating Weight</span>
                <strong>
                  {ataraMachineData.physical?.weightKg ?? "Not assigned"} kg / {ataraMachineData.physical?.operatingWeightKg ?? "Not assigned"} kg
                </strong>
                <span>Nominal Capacity</span>
                <strong>
                  {ataraMachineData.operationalData?.capacityNominal ?? "Not assigned"} {ataraMachineData.operationalData?.capacityUnit ?? ""}
                </strong>
                <span>Utilities</span>
                <strong>{summarizeUtilityRequirements(ataraMachineData)}</strong>
                <span>Connection Points</span>
                <strong>{ataraMachineData.connectionPoints?.length ?? 0}</strong>
                <span>Maintenance Clearance</span>
                <strong>
                  F {ataraClearance?.frontMm ?? 0} mm, B {ataraClearance?.backMm ?? 0} mm, L {ataraClearance?.leftMm ?? 0} mm, R {ataraClearance?.rightMm ?? 0} mm, T {ataraClearance?.topMm ?? 0} mm
                </strong>
              </div>
            ) : (
              <p className="empty-selection">No ATARA machine data assigned.</p>
            )}
          </details>

          <details className="diagnostics-section" data-testid="connection-point-diagnostics" open>
            <summary>Connection Points</summary>
            {connectionPoints.length > 0 ? (
              <div className="connection-point-list">
                <div className="diagnostics-grid">
                  <span>Total</span>
                  <strong>{connectionPoints.length}</strong>
                  <span>Count by Type</span>
                  <strong>
                    {Object.entries(connectionPointTypeCounts)
                      .map(([type, count]) => `${type}: ${count}`)
                      .join(", ")}
                  </strong>
                  <span>Diagnostics</span>
                  <strong>
                    {connectionPointDiagnostics &&
                    (connectionPointDiagnostics.errors.length || connectionPointDiagnostics.warnings.length)
                      ? [...connectionPointDiagnostics.errors, ...connectionPointDiagnostics.warnings].join(" ")
                      : "No issues found"}
                  </strong>
                </div>
                {connectionPoints.map((point) => (
                  <article className="connection-point-card" key={point.id}>
                    <strong>{getConnectionPointDisplayLabel(point)}</strong>
                    <span>
                      Local X {formatMm(point.positionMm.xMm)}, Plan Y {formatMm(point.positionMm.yMm)}, Elevation{" "}
                      {formatMm(point.positionMm.zMm)}
                    </span>
                    <span>{summarizeConnectionPointMetadata(point.metadata)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-selection">No connection points assigned.</p>
            )}
          </details>

          <details className="diagnostics-section" data-testid="collision-diagnostics" open>
            <summary>Collision Diagnostics</summary>
            <div className="diagnostics-grid">
              <span>Collision Envelope Enabled</span>
              <strong>{collisionEnvelope?.enabled ? "Yes" : "No"}</strong>
              <span>Collision Width / Depth / Height</span>
              <strong>
                {collisionEnvelope
                  ? `${formatMm(collisionEnvelope.widthMm)} / ${formatMm(collisionEnvelope.depthMm)} / ${formatMm(collisionEnvelope.heightMm)}`
                  : "Not available"}
              </strong>
              <span>Collision Offset</span>
              <strong>
                {collisionEnvelope?.offsetMm
                  ? `X ${formatMm(collisionEnvelope.offsetMm.xMm)}, Y ${formatMm(collisionEnvelope.offsetMm.yMm)}, Z ${formatMm(collisionEnvelope.offsetMm.zMm)}`
                  : "X 0 mm, Y 0 mm, Z 0 mm"}
              </strong>
              <span>Current Status</span>
              <strong>{collidingNames.length > 0 ? "Colliding" : "Clear"}</strong>
              <span>Colliding With</span>
              <strong>{collidingNames.length > 0 ? collidingNames.join(", ") : "None"}</strong>
            </div>
          </details>

          <details className="diagnostics-section" data-testid="visual-model-diagnostics" open>
            <summary>Visual Model Diagnostics</summary>
            <div className="diagnostics-grid">
              <span>Visual Status</span>
              <strong>{visualDiagnostics?.visualStatus ?? "Not available"}</strong>
              <span>Visual Source</span>
              <strong>{visualDiagnostics?.visualSource ?? "Not available"}</strong>
              <span>Model Path</span>
              <strong>{visualDiagnostics?.modelPath || "None"}</strong>
              <span>Category</span>
              <strong>{visualDiagnostics?.category ?? selectedMachine.definition.category}</strong>
              <span>Machine Type</span>
              <strong>{visualDiagnostics?.machineType ?? selectedMachine.definition.machineType ?? "Not set"}</strong>
              <span>Placeholder Visual Type</span>
              <strong>{visualDiagnostics?.placeholderVisualType ?? selectedMachine.definition.placeholderVisualType ?? "box-generic"}</strong>
              <span>Scale Mode</span>
              <strong>{visualDiagnostics?.scaleMode ?? selectedMachine.definition.visualModel?.scaleMode ?? "metadata-box"}</strong>
              <span>Model Unit</span>
              <strong>{visualDiagnostics?.modelUnit ?? selectedMachine.definition.visualModel?.unit ?? "m"}</strong>
              <span>Product Family Code</span>
              <strong>{visualDiagnostics?.productFamilyCode || selectedMachine.definition.productFamilyCode || "None"}</strong>
              <span>Calibration Mode</span>
              <strong>{visualDiagnostics?.scaleMode === "metadata-box" ? "Metadata box fit" : "Model units"}</strong>
              <span>Center on Footprint</span>
              <strong>{formatYesNo(visualDiagnostics?.calibration.centerOnFootprint)}</strong>
              <span>Bottom on Floor</span>
              <strong>{formatYesNo(visualDiagnostics?.calibration.bottomOnFloor)}</strong>
              <span>Preserve Aspect Ratio</span>
              <strong>{formatYesNo(visualDiagnostics?.calibration.preserveAspectRatio)}</strong>
              <span>Forward Axis</span>
              <strong>{visualDiagnostics?.calibration.forwardAxis ?? "Not available"}</strong>
              <span>Up Axis</span>
              <strong>{visualDiagnostics?.calibration.upAxis ?? "Not available"}</strong>
              <span>Applied Scale X / Y / Z</span>
              <strong>{formatScale(visualDiagnostics?.appliedScale)}</strong>
              <span>Metadata Width / Depth / Height</span>
              <strong>
                {visualDiagnostics
                  ? `${formatMm(visualDiagnostics.metadataBoundsMm.widthMm)} / ${formatMm(visualDiagnostics.metadataBoundsMm.depthMm)} / ${formatMm(visualDiagnostics.metadataBoundsMm.heightMm)}`
                  : dimensionsMm
                    ? `${formatMm(dimensionsMm.widthMm)} / ${formatMm(dimensionsMm.depthMm)} / ${formatMm(dimensionsMm.heightMm)}`
                    : "Not available"}
              </strong>
              <span>Visual Bounds Width / Depth / Height</span>
              <strong>
                {visualDiagnostics?.visualBoundsMm
                  ? `${formatMm(visualDiagnostics.visualBoundsMm.widthMm)} / ${formatMm(visualDiagnostics.visualBoundsMm.depthMm)} / ${formatMm(visualDiagnostics.visualBoundsMm.heightMm)}`
                  : "Not available"}
              </strong>
              <span>Visual vs Metadata Difference</span>
              <strong>
                {visualDiagnostics?.boundsDifferenceMm
                  ? `${formatOptionalMm(visualDiagnostics.boundsDifferenceMm.widthMm)} / ${formatOptionalMm(visualDiagnostics.boundsDifferenceMm.depthMm)} / ${formatOptionalMm(visualDiagnostics.boundsDifferenceMm.heightMm)}`
                  : "Not available"}
              </strong>
              <span>Rotation Offset</span>
              <strong>{formatRotationOffset(visualDiagnostics?.rotationOffsetDeg)}</strong>
              <span>Position Offset</span>
              <strong>{formatOffset(visualDiagnostics?.positionOffsetMm)}</strong>
              {visualDiagnostics?.fallbackReason ? (
                <>
                  <span>Fallback Reason</span>
                  <strong>{visualDiagnostics.fallbackReason}</strong>
                </>
              ) : null}
              {visualDiagnostics?.warnings.length ? (
                <>
                  <span>Calibration Warnings</span>
                  <strong>{visualDiagnostics.warnings.join(" ")}</strong>
                </>
              ) : null}
            </div>
          </details>

          {selectedMachine.definition.capabilities?.hasFlowDirection ||
          selectedMachine.definition.category === "Conveyor" ? (
            <label className="property-field">
              <span>Flow Direction</span>
              <select
                value={selectedMachine.flowDirection}
                onChange={(event) =>
                  onUpdateMachine(selectedMachine.instanceId, {
                    flowDirection: event.target.value === "reverse" ? "reverse" : "forward"
                  })
                }
              >
                <option value="forward">Forward</option>
                <option value="reverse">Reverse</option>
              </select>
            </label>
          ) : null}

          <button className="delete-object-button" type="button" onClick={onDeleteSelected}>
            Delete Selected Object
          </button>
        </div>
      ) : (
        <p className="empty-selection">Click a machine in the scene to inspect and transform it.</p>
      )}
    </section>
  );
}
