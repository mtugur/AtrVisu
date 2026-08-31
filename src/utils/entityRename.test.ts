import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../types/civil";
import type { ObjectGroup } from "../types/groups";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { getPlacedMachineDisplayName } from "./entityNames";
import { renameProjectEntity } from "./entityRename";

const definition: MachineDefinition = {
  id: "flow-pack",
  name: "Flow Pack Machine",
  category: "Packaging",
  width: 1,
  depth: 1,
  height: 1,
  defaultColor: "#ffffff",
  connectionPoints: []
};
const machine: PlacedMachine = {
  instanceId: "machine-1",
  machineDefinitionId: definition.id,
  definitionSnapshot: definition,
  definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
};
const civil: CivilReferenceItem = {
  id: "wall-1",
  type: "wall",
  name: "Wall",
  positionMm: { xMm: 0, yMm: 0 },
  sizeMm: { widthMm: 1000, depthMm: 100 },
  rotationDeg: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};
const group: ObjectGroup = {
  id: "group-1",
  name: "Assembly",
  objectIds: ["machine:machine-1"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("project entity rename authority", () => {
  it("renames a machine instance without mutating its library definition", () => {
    const result = renameProjectEntity({
      entityId: "machine:machine-1",
      name: "Flow Pack Machine - Line 2",
      machines: [machine],
      civilReferences: [civil],
      groups: [group]
    });

    expect(result.changed).toBe(true);
    expect(getPlacedMachineDisplayName(result.machines[0])).toBe("Flow Pack Machine - Line 2");
    expect(result.machines[0]?.definition.name).toBe("Flow Pack Machine");
    expect(definition.name).toBe("Flow Pack Machine");
  });

  it("renames supported civil and group entities deterministically", () => {
    const civilResult = renameProjectEntity({
      entityId: "civil:wall-1",
      name: "North Wall",
      machines: [machine],
      civilReferences: [civil],
      groups: [group],
      now: "2026-08-18T12:00:00.000Z"
    });
    const groupResult = renameProjectEntity({
      entityId: "group:group-1",
      name: "Packaging Cell",
      machines: civilResult.machines,
      civilReferences: civilResult.civilReferences,
      groups: civilResult.groups,
      now: "2026-08-18T12:00:00.000Z"
    });

    expect(civilResult.civilReferences[0]?.name).toBe("North Wall");
    expect(groupResult.groups[0]?.name).toBe("Packaging Cell");
  });

  it("rejects locked, empty, annotation, and missing targets", () => {
    const base = { machines: [machine], civilReferences: [civil], groups: [group] };
    expect(renameProjectEntity({
      ...base,
      entityId: "machine:machine-1",
      name: "Blocked",
      lockedEntityIds: new Set(["machine:machine-1"])
    })).toMatchObject({ changed: false, reason: "Locked entities cannot be renamed." });
    expect(renameProjectEntity({ ...base, entityId: "civil:wall-1", name: " " }).changed).toBe(false);
    expect(renameProjectEntity({ ...base, entityId: "annotation:a", name: "Note" }).changed).toBe(false);
    expect(renameProjectEntity({ ...base, entityId: "group:missing", name: "Missing" }).changed).toBe(false);
  });
});
