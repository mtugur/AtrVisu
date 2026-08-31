import { describe, expect, it } from "vitest";
import type { CivilReferenceItem, CivilReferenceType } from "../types/civil";
import type { PlacedMachine } from "../types/machine";
import {
  buildCollisionEnvelopeFromCivilReference,
  buildCollisionEnvelopeFromObject,
  checkAllObjectCollisions,
  checkObjectCollision
} from "./collision";

const createMachine = (
  id: string,
  positionMm: { xMm: number; yMm: number },
  options: {
    rotationDeg?: number;
    collisionEnvelope?: PlacedMachine["definition"]["collisionEnvelope"];
    widthMm?: number;
    depthMm?: number;
    heightMm?: number;
  } = {}
): PlacedMachine => {
  const widthMm = options.widthMm ?? 1000;
  const depthMm = options.depthMm ?? 1000;
  const heightMm = options.heightMm ?? 1000;

  return {
    instanceId: id,
    machineDefinitionId: id,
    definitionSnapshot: {
      id,
      name: id,
      category: "Custom",
      widthMm,
      depthMm,
      heightMm,
      width: widthMm / 1000,
      depth: depthMm / 1000,
      height: heightMm / 1000,
      defaultColor: "#ffffff",
      connectionPoints: [],
      collisionEnvelope: options.collisionEnvelope
    },
    definition: {
      id,
      name: id,
      category: "Custom",
      widthMm,
      depthMm,
      heightMm,
      width: widthMm / 1000,
      depth: depthMm / 1000,
      height: heightMm / 1000,
      defaultColor: "#ffffff",
      connectionPoints: [],
      collisionEnvelope: options.collisionEnvelope
    },
    position: { x: positionMm.xMm / 1000, z: positionMm.yMm / 1000 },
    positionMm,
    elevationMm: 0,
    rotationDeg: options.rotationDeg ?? 0,
    rotationY: options.rotationDeg ?? 0,
    flowDirection: "forward"
  };
};

const createCivil = (
  id: string,
  type: CivilReferenceType,
  positionMm: { xMm: number; yMm: number },
  sizeMm = { widthMm: 1000, depthMm: 1000, heightMm: 3000 },
  visible = true,
  locked = false
): CivilReferenceItem => ({
  id,
  type,
  name: id,
  positionMm: { ...positionMm, zMm: 0 },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  sizeMm,
  rotationDeg: 0,
  layerId: visible ? "default" : "hidden",
  locked,
  visible,
  createdAt: "now",
  updatedAt: "now"
});

describe("collision helpers", () => {
  it("returns no collision for separated rectangles", () => {
    const result = checkAllObjectCollisions([
      createMachine("a", { xMm: 0, yMm: 0 }),
      createMachine("b", { xMm: 2200, yMm: 0 })
    ]);

    expect(result.pairs).toHaveLength(0);
    expect(result.collidingObjectIds).toEqual([]);
  });

  it("detects overlapping rectangles", () => {
    const pair = checkObjectCollision(
      createMachine("a", { xMm: 0, yMm: 0 }),
      createMachine("b", { xMm: 700, yMm: 0 })
    );

    expect(pair?.severity).toBe("error");
    expect(pair?.reason).toContain("overlap");
  });

  it("detects a simple rotated rectangle collision", () => {
    const result = checkAllObjectCollisions([
      createMachine("a", { xMm: 0, yMm: 0 }, { widthMm: 1800, depthMm: 500, rotationDeg: 45 }),
      createMachine("b", { xMm: 800, yMm: 0 }, { widthMm: 900, depthMm: 900 })
    ]);

    expect(result.pairs).toHaveLength(1);
  });

  it("treats edge-touching rectangles as clear for v0.1", () => {
    const result = checkAllObjectCollisions([
      createMachine("a", { xMm: 0, yMm: 0 }),
      createMachine("b", { xMm: 1000, yMm: 0 })
    ]);

    expect(result.pairs).toHaveLength(0);
  });

  it("uses metadata dimensions when collisionEnvelope is missing", () => {
    const footprint = buildCollisionEnvelopeFromObject(
      createMachine("legacy", { xMm: 0, yMm: 0 }, { widthMm: 1200, depthMm: 800, heightMm: 600 })
    );

    expect(footprint?.envelope).toMatchObject({
      widthMm: 1200,
      depthMm: 800,
      heightMm: 600,
      enabled: true
    });
  });

  it("uses placed-instance names for collision presentation without changing canonical identity", () => {
    const machine = createMachine("flow-pack", { xMm: 0, yMm: 0 });
    machine.definition.name = "Flow Pack Machine";
    machine.definitionSnapshot.name = "Flow Pack Machine";
    machine.displayName = "Line 1 Packer";

    const footprint = buildCollisionEnvelopeFromObject(machine);

    expect(footprint?.objectName).toBe("Line 1 Packer");
    expect(footprint?.entityRef?.name).toBe("Line 1 Packer");
    expect(machine.definition.name).toBe("Flow Pack Machine");
  });

  it("ignores disabled collision envelopes", () => {
    const result = checkAllObjectCollisions([
      createMachine("a", { xMm: 0, yMm: 0 }, {
        collisionEnvelope: { widthMm: 1000, depthMm: 1000, heightMm: 1000, enabled: false }
      }),
      createMachine("b", { xMm: 0, yMm: 0 })
    ]);

    expect(result.pairs).toHaveLength(0);
  });

  it("does not crash on legacy objects without positionMm", () => {
    const legacy = createMachine("legacy", { xMm: 250, yMm: -500 });
    legacy.positionMm = undefined;

    expect(() => checkAllObjectCollisions([legacy])).not.toThrow();
    expect(buildCollisionEnvelopeFromObject(legacy)?.center).toEqual({ xMm: 250, yMm: -500 });
  });

  it("detects machine vs wall collisions", () => {
    const result = checkAllObjectCollisions(
      [createMachine("conveyor", { xMm: 0, yMm: 0 })],
      [createCivil("wall-1", "wall", { xMm: 250, yMm: 0 })]
    );

    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].entityA?.entityType).toBe("object");
    expect(result.pairs[0].entityB?.entityType).toBe("civil");
  });

  it("detects machine vs column collisions", () => {
    const result = checkAllObjectCollisions(
      [createMachine("machine", { xMm: 0, yMm: 0 })],
      [createCivil("column-1", "column", { xMm: 250, yMm: 250 }, { widthMm: 500, depthMm: 500, heightMm: 3000 })]
    );

    expect(result.pairs).toHaveLength(1);
    expect(result.collidingObjectIds).toEqual(["machine", "civil:column-1"]);
  });

  it("ignores non-solid civil references for hard collision", () => {
    const machine = createMachine("machine", { xMm: 0, yMm: 0 });

    expect(checkAllObjectCollisions([machine], [createCivil("floor", "floor-area", { xMm: 0, yMm: 0 })]).pairs).toHaveLength(0);
    expect(checkAllObjectCollisions([machine], [createCivil("walkway", "walkway", { xMm: 0, yMm: 0 })]).pairs).toHaveLength(0);
    expect(checkAllObjectCollisions([machine], [createCivil("zone", "reference-zone", { xMm: 0, yMm: 0 })]).pairs).toHaveLength(0);
  });

  it("keeps locked visible civil solids collidable", () => {
    const result = checkAllObjectCollisions(
      [createMachine("machine", { xMm: 0, yMm: 0 })],
      [createCivil("locked-column", "column", { xMm: 0, yMm: 0 }, { widthMm: 500, depthMm: 500, heightMm: 3000 }, true, true)]
    );

    expect(result.pairs).toHaveLength(1);
  });

  it("builds no footprint for non-solid civil references", () => {
    expect(buildCollisionEnvelopeFromCivilReference(createCivil("walkway", "walkway", { xMm: 0, yMm: 0 }))).toBeNull();
  });
});
