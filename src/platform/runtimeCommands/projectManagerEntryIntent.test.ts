import { describe, expect, it } from "vitest";
import { getProjectManagerEntryIntent } from "./projectManagerEntryIntent";

describe("project manager entry intent", () => {
  it("accepts only bounded create and open command payloads", () => {
    expect(getProjectManagerEntryIntent({ intent: "create" })).toBe("create");
    expect(getProjectManagerEntryIntent({ intent: "open" })).toBe("open");
    expect(getProjectManagerEntryIntent(undefined)).toBeNull();
    expect(getProjectManagerEntryIntent({ intent: "manage" })).toBeNull();
    expect(getProjectManagerEntryIntent({ intent: "create", projectId: "project-1" })).toBe("create");
  });
});
