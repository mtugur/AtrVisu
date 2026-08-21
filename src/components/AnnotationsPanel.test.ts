import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationObject } from "../types/annotations";
import type { LayoutLayer } from "../types/layers";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { AnnotationsPanel } from "./AnnotationsPanel";

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
  displayName: "Line 1 Packer",
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
};

const annotation: AnnotationObject = {
  id: "annotation-1",
  type: "note",
  text: "Check access",
  layerId: "default",
  positionMm: { xMm: 0, yMm: 0 },
  targetObjectId: machine.instanceId
};

const layer: LayoutLayer = {
  id: "default",
  name: "Default",
  visible: true,
  locked: false,
  color: "#ffffff",
  createdAt: "now",
  updatedAt: "now"
};

describe("AnnotationsPanel", () => {
  it("uses the placed-instance name for an attached machine target", () => {
    const markup = renderToStaticMarkup(createElement(AnnotationsPanel, {
      annotations: [annotation],
      selectedAnnotationId: annotation.id,
      placedMachines: [machine],
      layers: [layer],
      isSelectedAnnotationLocked: false,
      onAddAnnotation: vi.fn(),
      onSelectAnnotation: vi.fn(),
      onUpdateAnnotation: vi.fn(),
      onChangeAnnotationLayer: vi.fn(),
      onCommitAnnotationEdit: vi.fn(),
      onDeleteAnnotation: vi.fn(),
      variant: "properties"
    }));

    expect(markup).toContain("Line 1 Packer (machine-1)");
    expect(markup).not.toContain("Flow Pack Machine (machine-1)");
    expect(definition.name).toBe("Flow Pack Machine");
  });
});
