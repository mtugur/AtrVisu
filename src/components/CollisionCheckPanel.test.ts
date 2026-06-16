import { describe, expect, it } from "vitest";
import {
  getCollisionEntityDisplayName,
  getCollisionEntityTypeLabel,
  getCollisionPairKey
} from "./CollisionCheckPanel";

describe("CollisionCheckPanel helpers", () => {
  it("creates stable keys for mixed entity pairs", () => {
    expect(getCollisionPairKey({
      objectAId: "machine-1",
      objectBId: "civil:wall-1",
      objectAName: "Machine 1",
      objectBName: "Wall 1",
      entityA: { entityType: "object", id: "machine-1", name: "Machine 1", typeLabel: "Conveyor" },
      entityB: { entityType: "civil", id: "wall-1", name: "Wall 1", typeLabel: "Wall" },
      severity: "error",
      reason: "Collision envelopes overlap on the floor plan."
    }, 0)).toBe("object:machine-1|civil:wall-1|0");
  });

  it("uses safe fallback labels for missing collision entities", () => {
    expect(getCollisionEntityDisplayName(undefined, undefined)).toBe("Unknown entity");
    expect(getCollisionEntityTypeLabel(undefined)).toBe("Machine");
  });

  it("trims provided display labels", () => {
    expect(getCollisionEntityDisplayName({ entityType: "civil", id: "c1", name: " Column 1 " })).toBe("Column 1");
    expect(getCollisionEntityTypeLabel({ entityType: "civil", id: "c1", typeLabel: " Column " })).toBe("Column");
  });
});
