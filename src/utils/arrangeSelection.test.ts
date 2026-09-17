import { describe, expect, it } from "vitest";
import type { PlatformEntity, SelectionState } from "../platform/contracts";
import type { AlignableEntity } from "./alignment";
import { projectArrangeSelection } from "./arrangeSelection";

const member = (
  kind: "machine" | "civil",
  id: string,
  xMm: number,
  yMm: number,
  widthMm = 1000,
  depthMm = 1000
): AlignableEntity => ({
  kind,
  id,
  label: id,
  positionMm: { xMm, yMm },
  bounds: {
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

const platform = (
  id: string,
  type: PlatformEntity["type"],
  options: Partial<PlatformEntity> = {}
): PlatformEntity => ({
  id,
  type,
  name: id,
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds: [],
  visible: true,
  locked: false,
  selectable: true,
  ...options
});

const selection = (ids: string[], primaryId = ids[0] ?? null): SelectionState => ({
  ids,
  primaryId,
  source: "scene"
});

describe("arrange selection projection", () => {
  const members = [
    member("machine", "m1", 0, 0, 1000, 800),
    member("civil", "c1", 2400, -200, 600, 600),
    member("machine", "outside", 6000, 0)
  ];
  const entities = [
    platform("machine:m1", "machine", { parentId: "group:g1" }),
    platform("civil:c1", "civil", { parentId: "group:g1" }),
    platform("machine:outside", "machine"),
    platform("group:g1", "group", {
      name: "Cell",
      childrenIds: ["machine:m1", "civil:c1"]
    })
  ];

  it("projects a selected group root as one rigid composite beside an ungrouped entity", () => {
    const result = projectArrangeSelection({
      selection: selection(["group:g1", "machine:outside"]),
      platformEntities: entities,
      memberEntities: members,
      activeGroupEditId: null
    });

    expect(result.selectedEntityIds).toEqual(["group:g1", "machine:outside"]);
    expect(result.primarySelectedEntityId).toBe("group:g1");
    expect(result.entities.map((entity) => entity.kind)).toEqual(["group", "machine"]);
    expect(result.entities[0]).toMatchObject({
      positionMm: { xMm: 1500, yMm: 300 },
      bounds: { minXMm: 0, maxXMm: 3000, minYMm: -200, maxYMm: 800 }
    });
  });

  it("never exposes group children as independent Arrange entities outside edit mode", () => {
    const result = projectArrangeSelection({
      selection: selection(["group:g1", "machine:m1", "civil:c1"]),
      platformEntities: entities,
      memberEntities: members,
      activeGroupEditId: null
    });

    expect(result.selectedEntityIds).toEqual(["group:g1"]);
  });

  it("projects explicit members independently in Edit Group mode", () => {
    const result = projectArrangeSelection({
      selection: selection(["machine:m1", "civil:c1"]),
      platformEntities: entities,
      memberEntities: members,
      activeGroupEditId: "g1"
    });

    expect(result.selectedEntityIds).toEqual(["machine:m1", "civil:c1"]);
    expect(result.entities.map((entity) => entity.kind)).toEqual(["machine", "civil"]);
  });

  it("rejects a partially unresolved group projection instead of moving a subset", () => {
    const result = projectArrangeSelection({
      selection: selection(["group:g1"]),
      platformEntities: entities,
      memberEntities: members.filter((entity) => entity.id !== "c1"),
      activeGroupEditId: null
    });

    expect(result.entities).toEqual([]);
    expect(result.selectedEntityIds).toEqual([]);
  });

  it("propagates locked and hidden member safety to the composite group", () => {
    const result = projectArrangeSelection({
      selection: selection(["group:g1"]),
      platformEntities: entities,
      memberEntities: members.map((entity) => entity.id === "c1"
        ? { ...entity, locked: true, hidden: true }
        : entity),
      activeGroupEditId: null
    });

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]).toMatchObject({ kind: "group", locked: true, hidden: true });
  });
});
