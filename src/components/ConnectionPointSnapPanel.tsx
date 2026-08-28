import { useEffect, useMemo, useState } from "react";
import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type { PlacedMachine } from "../types/machine";
import {
  getConnectionPointDisplayLabel,
  getConnectionPointsForObject,
  validateConnectionPointsForObject
} from "../utils/connectionPoints";
import {
  formatConnectionPointSelectorLabel,
  formatConnectionPointSnapSummary,
  findProductFlowConnectionPointPair,
  getConnectionPointById,
  getConnectionPointCompatibility,
  getConnectionPointSnapDelta,
  isProductFlowConnectionPointPair,
  type ConnectionPointSnapSelection
} from "../utils/connectionPointSnap";
import { getPlacedMachineDisplayName } from "../utils/entityNames";

type ConnectionPointSnapPanelProps = {
  selectedMachines: PlacedMachine[];
  primarySelectedMachine?: PlacedMachine;
  onSnap: (
    selection: ConnectionPointSnapSelection,
    movingPoint: MachineConnectionPoint,
    fixedPoint: MachineConnectionPoint
  ) => void;
  onClearSelection?: () => void;
  productFlowOnly?: boolean;
};

const pointPriority = (point: MachineConnectionPoint, preferred: MachineConnectionPoint["type"]) =>
  point.type === preferred ? 0 : 1;

const chooseDefaultPoint = (points: MachineConnectionPoint[], preferred: MachineConnectionPoint["type"]) =>
  [...points].sort((a, b) => pointPriority(a, preferred) - pointPriority(b, preferred))[0];

export function ConnectionPointSnapPanel({
  selectedMachines,
  primarySelectedMachine,
  onSnap,
  onClearSelection,
  productFlowOnly = false
}: ConnectionPointSnapPanelProps) {
  const productFlowPair = useMemo(
    () => productFlowOnly ? findProductFlowConnectionPointPair(selectedMachines) : null,
    [productFlowOnly, selectedMachines]
  );
  const defaultMoving = productFlowPair
    ? selectedMachines.find((machine) => machine.instanceId === productFlowPair.movingMachineId)
    : primarySelectedMachine ?? selectedMachines[0];
  const defaultFixed = productFlowPair
    ? selectedMachines.find((machine) => machine.instanceId === productFlowPair.fixedMachineId)
    : selectedMachines.find((machine) => machine.instanceId !== defaultMoving?.instanceId);
  const [movingMachineId, setMovingMachineId] = useState(defaultMoving?.instanceId ?? "");
  const [fixedMachineId, setFixedMachineId] = useState(defaultFixed?.instanceId ?? "");
  const [movingPointId, setMovingPointId] = useState(productFlowPair?.movingPoint.id ?? "");
  const [fixedPointId, setFixedPointId] = useState(productFlowPair?.fixedPoint.id ?? "");
  const [gapMm, setGapMm] = useState(0);

  useEffect(() => {
    setMovingMachineId(defaultMoving?.instanceId ?? "");
    setFixedMachineId(defaultFixed?.instanceId ?? "");
  }, [defaultFixed?.instanceId, defaultMoving?.instanceId]);

  const movingMachine = selectedMachines.find((machine) => machine.instanceId === movingMachineId);
  const fixedMachine = selectedMachines.find((machine) => machine.instanceId === fixedMachineId);
  const movingPoints = useMemo(() => movingMachine
    ? getConnectionPointsForObject(movingMachine).filter((point) => !productFlowOnly || point.type === "product-out")
    : [], [movingMachine, productFlowOnly]);
  const fixedPoints = useMemo(() => fixedMachine
    ? getConnectionPointsForObject(fixedMachine).filter((point) => !productFlowOnly || point.type === "product-in")
    : [], [fixedMachine, productFlowOnly]);

  useEffect(() => {
    if (productFlowOnly) {
      setMovingPointId(productFlowPair?.movingPoint.id ?? "");
      setFixedPointId(productFlowPair?.fixedPoint.id ?? "");
      return;
    }
    const movingProductOut = movingPoints.find((point) => point.type === "product-out");
    const fixedProductIn = fixedPoints.find((point) => point.type === "product-in");
    const movingProductIn = movingPoints.find((point) => point.type === "product-in");
    const fixedProductOut = fixedPoints.find((point) => point.type === "product-out");
    const nextMovingPoint = movingProductOut && fixedProductIn
      ? movingProductOut
      : movingProductIn && fixedProductOut
        ? movingProductIn
        : chooseDefaultPoint(movingPoints, "product-out");
    const nextFixedPoint = movingProductOut && fixedProductIn
      ? fixedProductIn
      : movingProductIn && fixedProductOut
        ? fixedProductOut
        : chooseDefaultPoint(fixedPoints, "product-in");

    setMovingPointId((current) =>
      movingPoints.some((point) => point.id === current) ? current : nextMovingPoint?.id ?? ""
    );
    setFixedPointId((current) =>
      fixedPoints.some((point) => point.id === current) ? current : nextFixedPoint?.id ?? ""
    );
  }, [fixedPoints, movingPoints, productFlowOnly, productFlowPair]);

  if (selectedMachines.length !== 2) {
    return (
      <section className="precision-section connection-snap-panel" data-testid="connection-point-snap-panel">
        <p className="collision-note">Connection point snap requires exactly two selected objects.</p>
      </section>
    );
  }

  const movingPoint = getConnectionPointById(movingPoints, movingPointId);
  const fixedPoint = getConnectionPointById(fixedPoints, fixedPointId);
  const snapDelta = movingMachine && fixedMachine && movingPoint && fixedPoint
    ? getConnectionPointSnapDelta(movingMachine, fixedMachine, movingPoint, fixedPoint, gapMm)
    : null;
  const compatibility = getConnectionPointCompatibility(movingMachine, fixedMachine, movingPoint, fixedPoint);
  const diagnostics = [
    ...(movingMachine ? validateConnectionPointsForObject(movingMachine).warnings : []),
    ...(fixedMachine ? validateConnectionPointsForObject(fixedMachine).warnings : [])
  ];
  const canSnap = Boolean(
    movingMachine
    && fixedMachine
    && movingPoint
    && fixedPoint
    && (!productFlowOnly || isProductFlowConnectionPointPair(movingPoint, fixedPoint))
  );
  const reverseProductFlowPair = movingMachine && fixedMachine
    ? findProductFlowConnectionPointPair([fixedMachine, movingMachine])
    : null;
  const canSwap = !productFlowOnly
    || reverseProductFlowPair?.movingMachineId === fixedMachine?.instanceId;

  const swapMovingFixed = () => {
    setMovingMachineId(fixedMachineId);
    setFixedMachineId(movingMachineId);
    setMovingPointId(fixedPointId);
    setFixedPointId(movingPointId);
  };

  return (
    <section
      className="precision-section connection-snap-panel"
      data-testid="connection-point-snap-panel"
      data-snap-mode={productFlowOnly ? "product-flow" : "engineering"}
      aria-label="Connection point snap"
    >
      <div className="property-readout">
        <span>Moving Object</span>
        <strong>{movingMachine ? getPlacedMachineDisplayName(movingMachine) : "Primary selected object"}</strong>
      </div>
      <div className="property-readout">
        <span>Fixed Object</span>
        <strong>{fixedMachine ? getPlacedMachineDisplayName(fixedMachine) : "Secondary selected object"}</strong>
      </div>
      <p className="collision-note">Connect &amp; Snap moves the selected machine without changing its rotation.</p>
      {movingPoints.length === 0 || fixedPoints.length === 0 ? (
        <p className="manager-validation">Selected objects do not have compatible connection points.</p>
      ) : (
        <>
          <label className="property-field">
            <span>Moving Object Connection Point</span>
            <select
              data-testid="moving-connection-point-select"
              value={movingPointId}
              onChange={(event) => setMovingPointId(event.target.value)}
            >
              {movingPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {formatConnectionPointSelectorLabel(point)}
                </option>
              ))}
            </select>
          </label>
          <label className="property-field">
            <span>Fixed Object Connection Point</span>
            <select
              data-testid="fixed-connection-point-select"
              value={fixedPointId}
              onChange={(event) => setFixedPointId(event.target.value)}
            >
              {fixedPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {formatConnectionPointSelectorLabel(point)}
                </option>
              ))}
            </select>
          </label>
          <label className="property-field">
            <span>Gap (mm)</span>
            <input
              data-testid="connection-point-gap-input"
              type="number"
              min="0"
              step="10"
              value={gapMm}
              onChange={(event) => setGapMm(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <div className="connection-snap-summary" data-testid="connection-point-snap-summary">
            <strong>{formatConnectionPointSnapSummary(snapDelta, gapMm)}</strong>
            {movingPoint ? <span>Moving: {getConnectionPointDisplayLabel(movingPoint)}</span> : null}
            {fixedPoint ? <span>Fixed: {getConnectionPointDisplayLabel(fixedPoint)}</span> : null}
          </div>
          <div className={`connection-snap-compatibility is-${compatibility.level}`}>
            {compatibility.messages.map((message) => (
              <span key={message}>{message}</span>
            ))}
            {diagnostics.length > 0 ? <span>{diagnostics.join(" ")}</span> : null}
          </div>
          <div className="alignment-button-grid">
            <button type="button" disabled={!canSwap} onClick={swapMovingFixed}>
              Swap Moving/Fixed
            </button>
            <button
              type="button"
              data-testid="connection-point-snap-button"
              disabled={!canSnap}
              onClick={() => {
                if (movingMachine && fixedMachine && movingPoint && fixedPoint) {
                  onSnap(
                    {
                      movingMachineId: movingMachine.instanceId,
                      fixedMachineId: fixedMachine.instanceId,
                      movingPointId: movingPoint.id,
                      fixedPointId: fixedPoint.id,
                      gapMm
                    },
                    movingPoint,
                    fixedPoint
                  );
                }
              }}
            >
              Connect &amp; Snap
            </button>
          </div>
        </>
      )}
      {onClearSelection ? (
        <button type="button" className="secondary-action" onClick={onClearSelection}>
          Clear Selection
        </button>
      ) : null}
    </section>
  );
}

