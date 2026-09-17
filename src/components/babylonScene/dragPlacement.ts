import { metersToMm } from "../../utils/units";

export type PlanPositionMm = { xMm: number; yMm: number };
export type SceneDragMutationResult = "applied" | "noop" | "blocked";
export type DraggableMachine = { instanceId: string; position: { x: number; z: number }; positionMm?: PlanPositionMm };

export const getMachineStartPositionMm = (machine: DraggableMachine): PlanPositionMm => ({
  xMm: machine.positionMm?.xMm ?? metersToMm(machine.position.x),
  yMm: machine.positionMm?.yMm ?? metersToMm(machine.position.z)
});
