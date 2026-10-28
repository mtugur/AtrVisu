import { describe, expect, it } from "vitest";
import { createMeasureAuthority, isMeasureAction, type MeasureAction, type MeasureContext } from "./measureAuthority";

const context: MeasureContext = { selectionIds: [], entities: [], machines: [] };
const begin = () => { const a = createMeasureAuthority(); a.dispatch({ type: "toggle" }, context); return a; };

describe("Issue 139 independent operator contract", () => {
  it("accepts a deliberate canonical Plan XY interpretation, rather than inferring it from the view", () => {
    expect(isMeasureAction({ type: "projectionMode", projectionMode: "plan-xy" })).toBe(true);
  });
  it("offers a fixed-A workflow without closing the tool or consuming its anchor", () => {
    expect(isMeasureAction({ type: "workflow", workflow: "fan-out" })).toBe(true);
  });
  it("offers explicit manual selected-pair operands rather than automatic origins only", () => {
    expect(isMeasureAction({ type: "workflow", workflow: "selected-pair" })).toBe(true);
  });
  it("can replace a confirmed transient A before saving", () => {
    expect(isMeasureAction({ type: "changePoint", index: 0 })).toBe(true);
  });
  it("explicitly pauses the picking guard for normal property editing without exiting the session", () => {
    const a = begin();
    a.dispatch({ type: "pauseForEdit" } as MeasureAction, context);
    expect(a.getActive()).toBe(false);
    expect(a.getSnapshot()).not.toBeNull();
  });
});
