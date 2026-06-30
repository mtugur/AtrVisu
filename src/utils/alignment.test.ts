import { describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  alignEntitiesToAnchor,
  alignObjectsToAnchor,
  applyEntityPairAlignment,
  applyPairAlignment,
  distributeEntitiesByCenter,
  distributeObjectsByCenter,
  equalizeGaps,
  equalizeEntityGaps,
  getFootprintAnchorPoint,
  getAlignableEntityKey,
  moveObjectsByDelta,
  selectionHasLockedAlignableEntities,
  snapPrimaryAnchorToSecondaryAnchor
} from "./alignment";
import { getObjectPlanBounds, getSelectionPlanBounds } from "./selectionBounds";

const definition = (id: string, widthMm: number, depthMm: number): MachineDefinition => ({
  id,
  name: id,
  category: "Test",
  widthMm,
  depthMm,
  heightMm: 1000,
  width: widthMm / 1000,
  depth: depthMm / 1000,
  height: 1,
  defaultColor: "#88aa44",
  connectionPoints: [],
  capabilities: {
    canConvey: false,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: false
  }
});

const machine = (
  instanceId: string,
  xMm: number,
  yMm: number,
  widthMm = 1000,
  depthMm = 1000,
  rotationDeg = 0
): PlacedMachine => {
  const itemDefinition = definition(`${instanceId}-definition`, widthMm, depthMm);

  return {
    instanceId,
    machineDefinitionId: itemDefinition.id,
    definitionSnapshot: itemDefinition,
    definition: itemDefinition,
    position: { x: xMm / 1000, z: yMm / 1000 },
    positionMm: { xMm, yMm },
    elevationMm: 0,
    rotationDeg,
    rotationY: rotationDeg,
    flowDirection: "forward"
  };
};

describe("selection bounds", () => {
  it("calculates object bounds in millimeters", () => {
    expect(getObjectPlanBounds(machine("a", 1000, 2000, 2000, 1000))).toMatchObject({
      minXMm: 0,
      maxXMm: 2000,
      minYMm: 1500,
      maxYMm: 2500,
      widthMm: 2000,
      depthMm: 1000
    });
  });

  it("uses an axis-aligned bounding box for rotated objects", () => {
    const bounds = getObjectPlanBounds(machine("a", 0, 0, 2000, 1000, 90));
    expect(bounds.widthMm).toBeCloseTo(1000);
    expect(bounds.depthMm).toBeCloseTo(2000);
  });

  it("calculates aggregate selection bounds", () => {
    expect(getSelectionPlanBounds([machine("a", 0, 0, 1000, 1000), machine("b", 3000, 0, 1000, 1000)])).toMatchObject({
      minXMm: -500,
      maxXMm: 3500,
      widthMm: 4000
    });
  });
});

describe("alignment helpers", () => {
  it("moves selected objects by the same delta", () => {
    const result = moveObjectsByDelta([machine("a", 0, 0), machine("b", 1000, 0)], ["a", "b"], 250, -100);
    expect(result.map((item) => item.positionMm)).toEqual([
      { xMm: 250, yMm: -100 },
      { xMm: 1250, yMm: -100 }
    ]);
  });

  it("aligns selected objects to the primary anchor and keeps the primary fixed", () => {
    const result = alignObjectsToAnchor(
      [machine("a", 0, 0, 1000, 1000), machine("b", 3000, 1500, 1000, 1000)],
      ["a", "b"],
      "a",
      "left"
    );
    expect(result.find((item) => item.instanceId === "a")?.positionMm?.xMm).toBe(0);
    expect(result.find((item) => item.instanceId === "b")?.positionMm?.xMm).toBe(0);
  });

  it("aligns multi-selected machines deterministically to the primary footprint edge", () => {
    const machines = [
      machine("primary", 1000, 0, 1000, 1000),
      machine("secondary", 4000, 1500, 2000, 1000),
      machine("third", -1000, -500, 1000, 1000)
    ];
    const updates = alignEntitiesToAnchor(
      machines.map((item) => ({
        id: item.instanceId,
        kind: "machine" as const,
        label: item.definition.name,
        bounds: getObjectPlanBounds(item),
        positionMm: item.positionMm ?? { xMm: item.position.x * 1000, yMm: item.position.z * 1000 }
      })),
      [
        getAlignableEntityKey("machine", "primary"),
        getAlignableEntityKey("machine", "secondary"),
        getAlignableEntityKey("machine", "third")
      ],
      getAlignableEntityKey("machine", "primary"),
      "left"
    );

    expect(updates).toEqual([
      { kind: "machine", id: "secondary", xMm: 1500, yMm: 1500 },
      { kind: "machine", id: "third", xMm: 1000, yMm: -500 }
    ]);
  });

  it("aligns multi-selected machines to aggregate selection bounds when no primary is provided", () => {
    const result = alignObjectsToAnchor(
      [
        machine("a", 0, 0, 1000, 1000),
        machine("b", 3000, 0, 1000, 1000),
        machine("c", 6000, 0, 1000, 1000)
      ],
      ["a", "b", "c"],
      null,
      "centerX"
    );

    expect(result.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["a", 3000],
      ["b", 3000],
      ["c", 3000]
    ]);
  });

  it("distributes selected objects by center", () => {
    const result = distributeObjectsByCenter(
      [machine("a", 0, 0), machine("b", 1000, 0), machine("c", 5000, 0)],
      ["a", "b", "c"],
      "horizontal"
    );
    expect(result.map((item) => item.positionMm?.xMm)).toEqual([0, 2500, 5000]);
  });

  it("distributes multi-selected machines by center regardless of selection order", () => {
    const result = distributeObjectsByCenter(
      [
        machine("left", 0, 0, 1000, 1000),
        machine("middle", 4500, 0, 1000, 1000),
        machine("right", 9000, 0, 1000, 1000)
      ],
      ["right", "left", "middle"],
      "horizontal"
    );

    expect(result.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["left", 0],
      ["middle", 4500],
      ["right", 9000]
    ]);
  });

  it("equalizes gaps between selected objects", () => {
    const result = equalizeGaps(
      [machine("a", 0, 0, 1000, 1000), machine("b", 1500, 0, 1000, 1000), machine("c", 5000, 0, 1000, 1000)],
      ["a", "b", "c"],
      "gapX"
    );
    expect(result.map((item) => item.positionMm?.xMm)).toEqual([0, 2500, 5000]);
  });

  it("equalizes multi-selected machine gaps while preserving the outer span", () => {
    const result = equalizeGaps(
      [
        machine("a", 0, 0, 1000, 1000),
        machine("b", 2000, 0, 2000, 1000),
        machine("c", 7000, 0, 1000, 1000)
      ],
      ["a", "b", "c"],
      "gapX"
    );

    expect(result.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["a", 0],
      ["b", 3500],
      ["c", 7000]
    ]);
  });

  it("moves the primary object relative to the secondary in pair alignment", () => {
    const result = applyPairAlignment(
      [machine("primary", 0, 0, 1000, 1000), machine("secondary", 3000, 0, 1000, 1000)],
      ["primary", "secondary"],
      "primary",
      "leftToRight",
      500
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm?.xMm).toBe(4500);
  });

  it("calculates footprint anchor points from metadata bounds", () => {
    expect(getFootprintAnchorPoint(machine("a", 1000, 2000, 2000, 1000), "frontRight")).toEqual({
      xMm: 2000,
      yMm: 1500
    });
  });

  it("snaps the primary center to the secondary center", () => {
    const result = snapPrimaryAnchorToSecondaryAnchor(
      [machine("primary", 0, 0), machine("secondary", 3000, 2000)],
      ["primary", "secondary"],
      "primary",
      "center",
      "center"
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm).toEqual({ xMm: 3000, yMm: 2000 });
  });

  it("snaps primary edge and corner anchors to secondary anchors", () => {
    const result = snapPrimaryAnchorToSecondaryAnchor(
      [machine("primary", 0, 0, 1000, 1000), machine("secondary", 3000, 0, 1000, 1000)],
      ["primary", "secondary"],
      "primary",
      "rightCenter",
      "frontLeft"
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm).toEqual({ xMm: 2000, yMm: -500 });
  });

  it("supports zero gap pair positioning", () => {
    const result = applyPairAlignment(
      [machine("primary", 0, 0, 1000, 1000), machine("secondary", 3000, 0, 1000, 1000)],
      ["primary", "secondary"],
      "primary",
      "leftToRight",
      0
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm?.xMm).toBe(4000);
  });
});

describe("mixed alignable entity helpers", () => {
  const entity = (
    kind: "machine" | "civil",
    id: string,
    xMm: number,
    yMm: number,
    widthMm = 1000,
    depthMm = 1000,
    locked = false,
    hidden = false
  ) => ({
    kind,
    id,
    label: id,
    positionMm: { xMm, yMm },
    locked,
    hidden,
    bounds: {
      objectId: id,
      centerXMm: xMm + widthMm / 2,
      centerYMm: yMm + depthMm / 2,
      minXMm: xMm,
      maxXMm: xMm + widthMm,
      minYMm: yMm,
      maxYMm: yMm + depthMm,
      widthMm,
      depthMm
    }
  });

  it("aligns two civil columns by footprint edge", () => {
    const entities = [
      entity("civil", "column-a", 0, 0, 600, 600),
      entity("civil", "column-b", 2000, 1000, 600, 600)
    ];
    const updates = alignEntitiesToAnchor(
      entities,
      entities.map((item) => getAlignableEntityKey(item.kind, item.id)),
      getAlignableEntityKey("civil", "column-a"),
      "left"
    );

    expect(updates).toEqual([{ kind: "civil", id: "column-b", xMm: 0, yMm: 1000 }]);
  });

  it("aligns a wall and a machine by center line", () => {
    const entities = [
      entity("machine", "packer", 0, 0, 2000, 1000),
      entity("civil", "wall", 5000, 2000, 3000, 200)
    ];
    const updates = applyEntityPairAlignment(
      entities,
      entities.map((item) => getAlignableEntityKey(item.kind, item.id)),
      getAlignableEntityKey("civil", "wall"),
      "centerY"
    );

    expect(updates).toEqual([{ kind: "civil", id: "wall", xMm: 5000, yMm: 400 }]);
  });

  it("uses civil-first selection order as align-to-primary anchor", () => {
    const entities = [
      entity("machine", "machine-a", 3000, 0, 1000, 1000),
      entity("civil", "column-a", 0, 1000, 600, 600)
    ];
    const updates = alignEntitiesToAnchor(
      entities,
      [getAlignableEntityKey("civil", "column-a"), getAlignableEntityKey("machine", "machine-a")],
      getAlignableEntityKey("civil", "column-a"),
      "left"
    );

    expect(updates).toEqual([{ kind: "machine", id: "machine-a", xMm: 0, yMm: 0 }]);
  });

  it("uses machine-first selection order as align-to-primary anchor", () => {
    const entities = [
      entity("machine", "machine-a", 3000, 0, 1000, 1000),
      entity("civil", "column-a", 0, 1000, 600, 600)
    ];
    const updates = alignEntitiesToAnchor(
      entities,
      [getAlignableEntityKey("machine", "machine-a"), getAlignableEntityKey("civil", "column-a")],
      getAlignableEntityKey("machine", "machine-a"),
      "left"
    );

    expect(updates).toEqual([{ kind: "civil", id: "column-a", xMm: 3000, yMm: 1000 }]);
  });

  it("excludes hidden civil entities from alignment updates", () => {
    const entities = [
      entity("civil", "visible-a", 0, 0),
      entity("civil", "visible-b", 2000, 0),
      entity("civil", "hidden-c", 4000, 0, 1000, 1000, false, true)
    ];
    const updates = alignEntitiesToAnchor(
      entities,
      entities.map((item) => getAlignableEntityKey(item.kind, item.id)),
      getAlignableEntityKey("civil", "visible-a"),
      "left"
    );

    expect(updates).toEqual([{ kind: "civil", id: "visible-b", xMm: 0, yMm: 0 }]);
  });

  it("blocks alignment when a locked civil entity is selected", () => {
    const entities = [
      entity("civil", "column-a", 0, 0),
      entity("civil", "column-b", 2000, 0, 1000, 1000, true)
    ];
    const ids = entities.map((item) => getAlignableEntityKey(item.kind, item.id));

    expect(selectionHasLockedAlignableEntities(entities, ids)).toBe(true);
    expect(alignEntitiesToAnchor(entities, ids, getAlignableEntityKey("civil", "column-a"), "left")).toEqual([]);
  });

  it("distributes mixed entities and equalizes civil gaps", () => {
    const entities = [
      entity("machine", "a", 0, 0, 1000, 1000),
      entity("civil", "b", 2000, 0, 1000, 1000),
      entity("civil", "c", 6000, 0, 1000, 1000)
    ];
    const ids = entities.map((item) => getAlignableEntityKey(item.kind, item.id));

    expect(distributeEntitiesByCenter(entities, ids, "horizontal").map((update) => update.xMm)).toEqual([0, 3000, 6000]);
    expect(equalizeEntityGaps(entities, ids, "gapX").map((update) => update.xMm)).toEqual([0, 3000, 6000]);
  });
});
