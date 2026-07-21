import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../types/civil";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  getCivilPositionUpdateDelta,
  getMachinePositionUpdateDelta,
  moveAssemblyMembersByDelta
} from "./assemblyRuntime";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Packaging",
  width: 1,
  depth: 1,
  height: 1,
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const machine = (instanceId: string, xMm: number, yMm: number): PlacedMachine => ({
  instanceId,
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: xMm / 1000, z: yMm / 1000 },
  positionMm: { xMm, yMm },
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

const civil = (id: string, xMm: number, yMm: number): CivilReferenceItem => ({
  id,
  type: "column",
  name: id,
  positionMm: { xMm, yMm, zMm: 0 },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  sizeMm: { widthMm: 500, depthMm: 500, heightMm: 3000 },
  rotationDeg: 0,
  createdAt: "now",
  updatedAt: "now"
});

describe("assembly runtime movement", () => {
  it("moves a machine-only assembly by one common delta", () => {
    const result = moveAssemblyMembersByDelta({
      machines: [machine("m1", 100, 200), machine("m2", 900, -400)],
      civilReferences: [],
      memberEntityIds: ["machine:m1", "machine:m2"],
      deltaXMm: 250,
      deltaYMm: -100
    });

    expect(result?.machines.map((item) => item.positionMm)).toEqual([
      { xMm: 350, yMm: 100 },
      { xMm: 1150, yMm: -500 }
    ]);
  });

  it("moves mixed machine and civil members while preserving relative offsets", () => {
    const sourceMachines = [machine("m1", -500, 300)];
    const sourceCivil = [civil("c1", 1500, -700)];
    const result = moveAssemblyMembersByDelta({
      machines: sourceMachines,
      civilReferences: sourceCivil,
      memberEntityIds: ["machine:m1", "civil:c1"],
      deltaXMm: -200,
      deltaYMm: 450
    });

    expect(result?.machines[0].positionMm).toEqual({ xMm: -700, yMm: 750 });
    expect(result?.civilReferences[0].positionMm).toMatchObject({ xMm: 1300, yMm: -250, zMm: 0 });
    expect(
      (result?.civilReferences[0].positionMm.xMm ?? 0) - (result?.machines[0].positionMm?.xMm ?? 0)
    ).toBe(2000);
    expect(sourceMachines[0].positionMm).toEqual({ xMm: -500, yMm: 300 });
    expect(sourceCivil[0].positionMm).toMatchObject({ xMm: 1500, yMm: -700 });
  });

  it("moves an ungrouped civil selection in millimeters without changing source state", () => {
    const sourceCivil = [civil("c1", -200, 450)];
    const result = moveAssemblyMembersByDelta({
      machines: [],
      civilReferences: sourceCivil,
      memberEntityIds: ["civil:c1"],
      deltaXMm: 100,
      deltaYMm: -250
    });

    expect(result?.civilReferences[0].positionMm).toMatchObject({ xMm: -100, yMm: 200, zMm: 0 });
    expect(sourceCivil[0].positionMm).toMatchObject({ xMm: -200, yMm: 450, zMm: 0 });
  });

  it("moves only an explicitly selected civil edit child while siblings stay fixed", () => {
    const sourceMachines = [machine("m1", 0, 0)];
    const sourceCivil = [civil("selected", 500, 600), civil("sibling", 900, 1000)];
    const result = moveAssemblyMembersByDelta({
      machines: sourceMachines,
      civilReferences: sourceCivil,
      memberEntityIds: ["civil:selected"],
      deltaXMm: -300,
      deltaYMm: 150
    });

    expect(result?.machines[0].positionMm).toEqual({ xMm: 0, yMm: 0 });
    expect(result?.civilReferences.find((item) => item.id === "selected")?.positionMm).toMatchObject({
      xMm: 200,
      yMm: 750
    });
    expect(result?.civilReferences.find((item) => item.id === "sibling")?.positionMm).toMatchObject({
      xMm: 900,
      yMm: 1000
    });
  });

  it("rejects an empty or zero-delta movement without allocating replacement state", () => {
    const machines = [machine("m1", 0, 0)];

    expect(moveAssemblyMembersByDelta({
      machines,
      civilReferences: [],
      memberEntityIds: [],
      deltaXMm: 100,
      deltaYMm: 0
    })).toBeNull();
    expect(moveAssemblyMembersByDelta({
      machines,
      civilReferences: [],
      memberEntityIds: ["machine:m1"],
      deltaXMm: 0,
      deltaYMm: 0
    })).toBeNull();
    expect(machines[0].positionMm).toEqual({ xMm: 0, yMm: 0 });
  });

  it("rejects unresolved or non-alignable members without partial source mutation", () => {
    const source = [machine("m1", 0, 0)];

    expect(moveAssemblyMembersByDelta({
      machines: source,
      civilReferences: [],
      memberEntityIds: ["machine:m1", "civil:missing"],
      deltaXMm: 100,
      deltaYMm: 100
    })).toBeNull();
    expect(source[0].positionMm).toEqual({ xMm: 0, yMm: 0 });
  });

  it("derives a shared delta from machine and civil drag targets", () => {
    expect(getMachinePositionUpdateDelta(machine("m1", 100, -200), { xMm: 350, yMm: -500 })).toEqual({
      deltaXMm: 250,
      deltaYMm: -300
    });
    expect(getCivilPositionUpdateDelta(civil("c1", -400, 800), { xMm: -900, yMm: 1200 })).toEqual({
      deltaXMm: -500,
      deltaYMm: 400
    });
  });
});
