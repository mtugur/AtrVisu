import { Children, createElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AlignmentAction, DistributionAction, EqualGapAction } from "../types/alignment";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { MultiSelectionProperties } from "./MultiSelectionProperties";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Test",
  width: 1,
  depth: 1,
  height: 1,
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  defaultColor: "#aaaaaa",
  connectionPoints: [],
  capabilities: {
    canConvey: false,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: false
  }
};

const machine = (
  instanceId: string,
  name: string,
  positionMm: { xMm: number; yMm: number } = { xMm: 0, yMm: 0 }
): PlacedMachine => ({
  instanceId,
  machineDefinitionId: definition.id,
  definition: { ...definition, name },
  definitionSnapshot: { ...definition, name },
  position: { x: positionMm.xMm / 1000, z: positionMm.yMm / 1000 },
  positionMm,
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

const renderPanel = (selectedMachines: PlacedMachine[]) =>
  renderToStaticMarkup(
    createElement(MultiSelectionProperties, {
      selectedMachines,
      primarySelectedMachine: selectedMachines[0],
      selectionBounds: {
        centerXMm: 0,
        centerYMm: 0,
        minXMm: -500,
        maxXMm: 2500,
        minYMm: -500,
        maxYMm: 500,
        widthMm: 3000,
        depthMm: 1000
      },
      onAlign: () => undefined,
      onDistribute: () => undefined,
      onEqualGap: () => undefined,
      canDuplicateSelected: true,
      onDuplicateSelected: () => undefined,
      onClearSelection: () => undefined,
      onDeleteSelected: () => undefined
    })
  );

type ButtonProps = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

const createPanelCallbacks = () => ({
  onAlign: vi.fn<(action: AlignmentAction) => void>(),
  onDistribute: vi.fn<(action: DistributionAction) => void>(),
  onEqualGap: vi.fn<(action: EqualGapAction) => void>(),
  onDuplicateSelected: vi.fn<() => void>(),
  onClearSelection: vi.fn<() => void>(),
  onDeleteSelected: vi.fn<() => void>()
});

const renderInteractivePanel = (selectedMachines: PlacedMachine[], canDuplicateSelected = true) => {
  const callbacks = createPanelCallbacks();

  return {
    callbacks,
    tree: MultiSelectionProperties({
      selectedMachines,
      primarySelectedMachine: selectedMachines[0],
      selectionBounds: null,
      canDuplicateSelected,
      ...callbacks
    })
  };
};

const getNodeText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
};

const findButtonByText = (node: ReactNode, label: string): ReactElement<ButtonProps> => {
  const matches: ReactElement<ButtonProps>[] = [];
  const visit = (currentNode: ReactNode) => {
    if (!isValidElement<ButtonProps>(currentNode)) {
      return;
    }

    if (currentNode.type === "button" && getNodeText(currentNode.props.children).trim() === label) {
      matches.push(currentNode);
    }

    Children.forEach(currentNode.props.children, visit);
  };

  visit(node);

  expect(matches).toHaveLength(1);
  return matches[0];
};

const clickButton = (button: ReactElement<ButtonProps>) => {
  if (!button.props.disabled) {
    button.props.onClick?.();
  }
};

describe("MultiSelectionProperties", () => {
  it("renders alignment action controls for a machine multi-selection", () => {
    const markup = renderPanel([machine("a", "Packer"), machine("b", "Conveyor")]);

    expect(markup).toContain('data-testid="multi-selection-alignment-actions"');
    expect(markup).toContain("Align Left");
    expect(markup).toContain("Align Center X");
    expect(markup).toContain("Align Right");
    expect(markup).toContain("Align Top");
    expect(markup).toContain("Align Center Y");
    expect(markup).toContain("Align Bottom");
  });

  it("renders duplicate and delete actions for machine multi-selection", () => {
    const markup = renderPanel([machine("a", "Packer"), machine("b", "Conveyor")]);

    expect(markup).toContain("Duplicate Selected");
    expect(markup).toContain("Delete Selected Objects");
  });

  it("renders pair reference point measurement for exactly two selected machines", () => {
    const markup = renderPanel([
      machine("a", "Packer", { xMm: -1000, yMm: 2000 }),
      machine("b", "Conveyor", { xMm: 2000, yMm: -2000 })
    ]);

    expect(markup).toContain('data-testid="pair-measurement-readout"');
    expect(markup).toContain("Delta X");
    expect(markup).toContain("3000 mm");
    expect(markup).toContain("Delta Y");
    expect(markup).toContain("-4000 mm");
    expect(markup).toContain("Reference Point Distance");
    expect(markup).toContain("5000 mm / 5.000 m");
    expect(markup).not.toContain("Clearance");
  });

  it("does not render pair reference point measurement for three selected machines", () => {
    const markup = renderPanel([
      machine("a", "Packer"),
      machine("b", "Conveyor"),
      machine("c", "Wrapper")
    ]);

    expect(markup).not.toContain('data-testid="pair-measurement-readout"');
    expect(markup).not.toContain("Reference Point Distance");
  });

  it("disables distribution and equal gap actions until at least three machines are selected", () => {
    const twoMachineMarkup = renderPanel([machine("a", "Packer"), machine("b", "Conveyor")]);
    const threeMachineMarkup = renderPanel([
      machine("a", "Packer"),
      machine("b", "Conveyor"),
      machine("c", "Wrapper")
    ]);

    expect(twoMachineMarkup).toContain("Distribute Horizontal Center");
    expect(twoMachineMarkup.match(/disabled=""/g)?.length).toBe(4);
    expect(threeMachineMarkup).not.toContain('disabled=""');
  });

  it("calls the expected alignment callback action for each alignment button", () => {
    const { callbacks, tree } = renderInteractivePanel([machine("a", "Packer"), machine("b", "Conveyor")]);
    const expectedActions = [
      ["Align Left", "left"],
      ["Align Center X", "centerX"],
      ["Align Right", "right"],
      ["Align Top", "front"],
      ["Align Center Y", "centerY"],
      ["Align Bottom", "back"]
    ] as const satisfies readonly (readonly [string, AlignmentAction])[];

    expectedActions.forEach(([label, action]) => {
      clickButton(findButtonByText(tree, label));
      expect(callbacks.onAlign).toHaveBeenLastCalledWith(action);
    });

    expect(callbacks.onAlign).toHaveBeenCalledTimes(expectedActions.length);
    expect(callbacks.onDistribute).not.toHaveBeenCalled();
    expect(callbacks.onEqualGap).not.toHaveBeenCalled();
  });

  it("calls the expected distribution and equal-gap callback actions when three machines are selected", () => {
    const { callbacks, tree } = renderInteractivePanel([
      machine("a", "Packer"),
      machine("b", "Conveyor"),
      machine("c", "Wrapper")
    ]);

    clickButton(findButtonByText(tree, "Distribute Horizontal Center"));
    clickButton(findButtonByText(tree, "Distribute Vertical Center"));
    clickButton(findButtonByText(tree, "Equal Gap X"));
    clickButton(findButtonByText(tree, "Equal Gap Y"));

    expect(callbacks.onDistribute).toHaveBeenNthCalledWith(1, "horizontal");
    expect(callbacks.onDistribute).toHaveBeenNthCalledWith(2, "vertical");
    expect(callbacks.onDistribute).toHaveBeenCalledTimes(2);
    expect(callbacks.onEqualGap).toHaveBeenNthCalledWith(1, "gapX");
    expect(callbacks.onEqualGap).toHaveBeenNthCalledWith(2, "gapY");
    expect(callbacks.onEqualGap).toHaveBeenCalledTimes(2);
    expect(callbacks.onAlign).not.toHaveBeenCalled();
  });

  it("does not call distribution or equal-gap callbacks from disabled buttons with two machines selected", () => {
    const { callbacks, tree } = renderInteractivePanel([machine("a", "Packer"), machine("b", "Conveyor")]);
    const disabledActionLabels = [
      "Distribute Horizontal Center",
      "Distribute Vertical Center",
      "Equal Gap X",
      "Equal Gap Y"
    ] as const;

    disabledActionLabels.forEach((label) => {
      const button = findButtonByText(tree, label);

      expect(button.props.disabled).toBe(true);
      clickButton(button);
    });

    expect(callbacks.onDistribute).not.toHaveBeenCalled();
    expect(callbacks.onEqualGap).not.toHaveBeenCalled();
    expect(callbacks.onAlign).not.toHaveBeenCalled();
  });

  it("calls duplicate callback from Duplicate Selected when duplication is allowed", () => {
    const { callbacks, tree } = renderInteractivePanel([machine("a", "Packer"), machine("b", "Conveyor")]);

    clickButton(findButtonByText(tree, "Duplicate Selected"));

    expect(callbacks.onDuplicateSelected).toHaveBeenCalledTimes(1);
  });

  it("does not call duplicate callback when Duplicate Selected is disabled", () => {
    const { callbacks, tree } = renderInteractivePanel(
      [machine("a", "Packer"), machine("b", "Conveyor")],
      false
    );
    const button = findButtonByText(tree, "Duplicate Selected");

    expect(button.props.disabled).toBe(true);
    clickButton(button);

    expect(callbacks.onDuplicateSelected).not.toHaveBeenCalled();
  });
});
