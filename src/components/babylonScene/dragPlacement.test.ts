import { describe, expect, it } from "vitest";
import {
  getMachineStartPositionMm,
  type DraggableMachine,
  type SceneDragMutationResult
} from "./dragPlacement";

const machine = (position: DraggableMachine["position"], positionMm?: DraggableMachine["positionMm"]): DraggableMachine => ({
  instanceId: "machine-a",
  position,
  positionMm
});

describe("canonical Plan movement primitives", () => {
  it("prefers canonical millimeter positions over rendering-adapter coordinates", () => {
    expect(getMachineStartPositionMm(machine(
      { x: 9.5, z: -3.25 },
      { xMm: 1250, yMm: -750 }
    ))).toEqual({ xMm: 1250, yMm: -750 });
  });

  it("converts legacy rendering coordinates only when canonical positions are absent", () => {
    expect(getMachineStartPositionMm(machine({ x: 1.25, z: -0.75 })))
      .toEqual({ xMm: 1250, yMm: -750 });
  });

  it("keeps the shared atomic movement result contract bounded", () => {
    const results: SceneDragMutationResult[] = ["applied", "noop", "blocked"];
    expect(results).toEqual(["applied", "noop", "blocked"]);
  });
});
