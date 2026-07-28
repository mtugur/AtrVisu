import { describe, expect, it } from "vitest";
import { executeProjectManagerRuntimeOperation } from "./ProjectManager";

describe("Project Manager runtime operations", () => {
  it("keeps save completion awaitable", async () => {
    let release: (() => void) | undefined;
    let completed = false;
    const pendingAction = new Promise<void>((resolve) => {
      release = resolve;
    });

    const resultPromise = executeProjectManagerRuntimeOperation(async () => {
      await pendingAction;
      completed = true;
    });

    expect(completed).toBe(false);
    release?.();
    await expect(resultPromise).resolves.toEqual({
      handled: true,
      status: "executed"
    });
    expect(completed).toBe(true);
  });

  it("keeps export completion awaitable", async () => {
    let release: (() => void) | undefined;
    const pendingExport = new Promise<void>((resolve) => {
      release = resolve;
    });
    const resultPromise = executeProjectManagerRuntimeOperation(async () => {
      await pendingExport;
    });

    let settled = false;
    void resultPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    release?.();
    await expect(resultPromise).resolves.toEqual({
      handled: true,
      status: "executed"
    });
  });

  it("makes import failures observable without rejecting the UI caller", async () => {
    await expect(executeProjectManagerRuntimeOperation(async () => {
      throw new Error("Invalid project JSON.");
    })).resolves.toEqual({
      handled: false,
      status: "failed",
      reason: "Invalid project JSON."
    });
  });
});
