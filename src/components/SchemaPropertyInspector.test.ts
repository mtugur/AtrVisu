// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { projectAtaraMachineProperties, type PropertyProjection } from "../propertySchema";
import { SchemaPropertyInspector } from "./SchemaPropertyInspector";

const roots: Root[] = [];
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

const placedMachine = (instanceId: string, machineCode?: string): PlacedMachine => {
  const definition: MachineDefinition = {
    id: `definition-${instanceId}`,
    name: `Machine ${instanceId}`,
    category: "Packaging",
    widthMm: instanceId === "one" ? 1000 : 2000,
    depthMm: 800,
    heightMm: 1600,
    width: instanceId === "one" ? 1 : 2,
    depth: 0.8,
    height: 1.6,
    defaultColor: "#ffffff",
    connectionPoints: [],
    ...(machineCode ? { ataraMachineData: { identity: { machineCode } } } : {})
  };
  return {
    instanceId,
    machineDefinitionId: definition.id,
    definitionSnapshot: definition,
    definition,
    position: { x: 0, z: 0 },
    rotationY: 0,
    flowDirection: "forward"
  };
};

describe("SchemaPropertyInspector", () => {
  it("renders localized schema groups, units, unknown values, and export-backed fields", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => root.render(createElement(SchemaPropertyInspector, {
      projection: projectAtaraMachineProperties(placedMachine("one", "CP-01"))
    })));

    expect(container.querySelector("summary")?.textContent).toBe("Smart Asset Properties");
    expect([...container.querySelectorAll("h4")].map((heading) => heading.textContent)).toEqual([
      "Identity", "Physical", "Capacity", "Electrical", "Pneumatic", "Network", "Maintenance Clearance"
    ]);
    expect(container.querySelector('[data-property-id="atara.identity.machine-code"]')?.textContent).toBe("CP-01");
    expect(container.querySelector('[data-property-id="atara.physical.width"]')?.textContent).toBe("1000 mm");
    expect(container.querySelector('[data-property-id="atara.identity.manufacturer"]')?.textContent).toBe("Not available");
    expect(container.querySelectorAll("input, select, textarea")).toHaveLength(0);
  });

  it("updates the same Inspector node for a selection change without remounting it", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => root.render(createElement(SchemaPropertyInspector, {
      projection: projectAtaraMachineProperties(placedMachine("one", "CP-01"))
    })));
    const inspector = container.querySelector('[data-testid="schema-property-inspector"]');

    await act(async () => root.render(createElement(SchemaPropertyInspector, {
      projection: projectAtaraMachineProperties(placedMachine("two", "PL-02"))
    })));

    expect(container.querySelector('[data-testid="schema-property-inspector"]')).toBe(inspector);
    expect(container.querySelector('[data-property-id="atara.identity.machine-code"]')?.textContent).toBe("PL-02");
    expect(container.querySelector('[data-property-id="atara.physical.width"]')?.textContent).toBe("2000 mm");
  });

  it("renders the validation message supplied by the projection without localizing it again", async () => {
    const baseProjection = projectAtaraMachineProperties(placedMachine("one", "CP-01"));
    const firstSection = baseProjection.sections[0];
    const firstField = firstSection.fields[0];
    const projectedMessage = "Projection-owned validation presentation.";
    const projection: PropertyProjection = {
      ...baseProjection,
      sections: [{
        ...firstSection,
        fields: [{
          ...firstField,
          issues: [{
            code: "property.required",
            severity: "error",
            propertyId: firstField.id,
            messageKey: "property.validation.required",
            message: projectedMessage
          }]
        }]
      }],
      issueCount: 1
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => root.render(createElement(SchemaPropertyInspector, { projection })));

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(projectedMessage);
    expect(container.textContent).not.toContain("A value is required.");
  });
});
