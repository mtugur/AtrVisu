import { describe, expect, it } from "vitest";
import {
  createSelectionStateFromIds,
  createSelectionStateFromUnknown,
  getPrimarySelectionId
} from "../selectionAdapter";

describe("selection adapter", () => {
  it("preserves id order", () => {
    expect(createSelectionStateFromIds(["civil:1", "machine:1", "annotation:1"], "scene").ids).toEqual([
      "civil:1",
      "machine:1",
      "annotation:1"
    ]);
  });

  it("uses the first id as primary", () => {
    expect(createSelectionStateFromIds(["civil:1", "machine:1"], "explorer").primaryId).toBe("civil:1");
    expect(getPrimarySelectionId(["machine:1", "civil:1"])).toBe("machine:1");
  });

  it("deduplicates ids while keeping first-seen order", () => {
    expect(createSelectionStateFromIds(["a", "b", "a", "c", "b"], "test").ids).toEqual(["a", "b", "c"]);
  });

  it("drops empty ids", () => {
    expect(createSelectionStateFromUnknown(["", "  ", null, undefined, "machine:1"], "scene").ids).toEqual(["machine:1"]);
  });

  it("returns a valid empty selection", () => {
    expect(createSelectionStateFromIds([], "command")).toEqual({
      ids: [],
      source: "command"
    });
  });

  it("returns empty selection for non-array unknown input", () => {
    expect(createSelectionStateFromUnknown({ ids: ["machine:1"] }, "test")).toEqual({
      ids: [],
      source: "test"
    });
  });

  it("preserves source", () => {
    expect(createSelectionStateFromIds(["machine:1"], "inspector").source).toBe("inspector");
  });

  it("does not apply machine or civil type priority", () => {
    expect(createSelectionStateFromIds(["civil:1", "machine:1"], "scene").primaryId).toBe("civil:1");
  });
});

