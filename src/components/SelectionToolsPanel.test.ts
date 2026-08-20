import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SelectionToolsPanel } from "./SelectionToolsPanel";

const props = {
  selectedEntityCount: 2,
  nudgeSettings: { nudgeStepMm: 100, largeNudgeStepMm: 1000, smallNudgeStepMm: 10 },
  selectedMachines: [],
  connectionPointSnapAvailable: false,
  movementAllowed: true,
  connectionPointSnapVisible: true,
  connectionPointSnapExpanded: true,
  onConnectionPointSnapExpandedChange: vi.fn(),
  onAlign: vi.fn(), onDistribute: vi.fn(), onEqualGap: vi.fn(),
  onPairAlign: vi.fn(), onPairAnchorSnap: vi.fn(), onChangeNudgeSettings: vi.fn(),
  onConnectionPointSnap: vi.fn(), onClearSelection: vi.fn()
};

describe("SelectionToolsPanel", () => {
  it("keeps advanced selection operations in one utility contribution", () => {
    const markup = renderToStaticMarkup(createElement(SelectionToolsPanel, props));

    expect(markup).toContain('data-testid="selection-tools-panel"');
    expect(markup).toContain("Align to Primary");
    expect(markup).toContain("Distribute");
    expect(markup).toContain("Equal Gap X");
    expect(markup).toContain("Pair Alignment");
    expect(markup).toContain("Connection Point Snap");
  });

  it("honors the canonical connection-snap panel visibility preference", () => {
    const markup = renderToStaticMarkup(createElement(SelectionToolsPanel, {
      ...props,
      connectionPointSnapVisible: false
    }));
    expect(markup).not.toContain("Connection Point Snap");
  });
});
