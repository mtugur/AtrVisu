import { describe, expect, it } from "vitest";
import {
  closeCascadingFlyout,
  closeCascadingFlyoutRoot,
  createCascadingFlyoutState,
  openCascadingFlyout
} from "./cascadingFlyoutState";

describe("cascading flyout state", () => {
  it("opens root to depth one and then depth two", () => {
    const depthOne = openCascadingFlyout(createCascadingFlyoutState(), 1, "panels");
    expect(depthOne.openPath).toEqual(["panels"]);
    expect(openCascadingFlyout(depthOne, 2, "advanced").openPath)
      .toEqual(["panels", "advanced"]);
  });

  it("closing depth two preserves depth one", () => {
    const state = openCascadingFlyout(
      openCascadingFlyout(createCascadingFlyoutState(), 1, "panels"),
      2,
      "advanced"
    );
    expect(closeCascadingFlyout(state, 2).openPath).toEqual(["panels"]);
  });

  it("replacing depth one clears its stale depth-two descendant", () => {
    const state = openCascadingFlyout(
      openCascadingFlyout(createCascadingFlyoutState(), 1, "panels"),
      2,
      "advanced"
    );
    expect(openCascadingFlyout(state, 1, "viewpoints").openPath).toEqual(["viewpoints"]);
  });

  it("replaces sibling preference branches at depth one without changing the depth policy", () => {
    const workspace = openCascadingFlyout(createCascadingFlyoutState(), 1, "workspace");
    const workspaceChild = openCascadingFlyout(workspace, 2, "workspace-detail");
    const theme = openCascadingFlyout(workspaceChild, 1, "theme");
    const density = openCascadingFlyout(theme, 1, "density");

    expect(theme.openPath).toEqual(["theme"]);
    expect(density.openPath).toEqual(["density"]);
    expect(closeCascadingFlyout(density, 1).openPath).toEqual([]);
  });

  it("closing depth one and root clear every descendant", () => {
    const state = openCascadingFlyout(
      openCascadingFlyout(createCascadingFlyoutState(), 1, "panels"),
      2,
      "advanced"
    );
    expect(closeCascadingFlyout(state, 1).openPath).toEqual([]);
    expect(closeCascadingFlyoutRoot().openPath).toEqual([]);
  });

  it("rejects an orphan depth-two branch", () => {
    expect(() => openCascadingFlyout(createCascadingFlyoutState(), 2, "orphan"))
      .toThrow(/requires an open depth-one branch/);
  });
});
