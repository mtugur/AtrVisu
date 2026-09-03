import { describe, expect, it } from "vitest";
import type { MachineDefinition } from "../../types/machine";
import { getMachinePlaceholderVisualParts, getMachineVerticalRenderPositions } from "./objectRendering";

const createDefinition = (
  placeholderVisualType: string | undefined,
  dimensions = { width: 4, depth: 1.2, height: 0.8 }
): MachineDefinition => ({
  id: "test-machine",
  name: "Test Machine",
  category: "Test",
  placeholderVisualType,
  width: dimensions.width,
  depth: dimensions.depth,
  height: dimensions.height,
  defaultColor: "#6ba88f",
  connectionPoints: [],
  capabilities: {
    canConvey: false,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: false
  }
});

describe("machine vertical render authority", () => {
  it.each([undefined, 0, 1500, -250])("applies elevation %s to the root center and label without changing the definition", (elevationMm) => {
    const definition = createDefinition("box-generic");
    const before = structuredClone(definition);
    const offset = (elevationMm ?? 0) / 1000;
    const positions = getMachineVerticalRenderPositions({ definition, elevationMm });
    expect(positions.centerY).toBeCloseTo(0.4 + offset);
    expect(positions.labelY).toBeCloseTo(1.65 + offset);
    expect(definition).toEqual(before);
  });

  it("uses canonical mm height for imported and Standard definitions, with legacy height fallback", () => {
    const definition = { ...createDefinition("box-generic"), heightMm: 1200 };
    const expected = { centerY: 2.6, labelY: 4.05 };
    expect(getMachineVerticalRenderPositions({ definition, elevationMm: 2000 })).toEqual(expected);
    expect(getMachineVerticalRenderPositions({ definition: { ...definition, modelPath: "atrvisu-model:test" }, elevationMm: 2000 })).toEqual(expected);
    expect(getMachineVerticalRenderPositions({ definition: createDefinition(undefined), elevationMm: 2000 }).centerY).toBe(2.4);
  });
});

describe("object rendering placeholder descriptors", () => {
  it("creates a generic box descriptor by default", () => {
    const parts = getMachinePlaceholderVisualParts(createDefinition(undefined));

    expect(parts).toEqual([
      {
        kind: "box",
        suffix: "generic",
        size: { width: 4, depth: 1.2, height: 0.8 },
        position: { x: 0, y: 0, z: 0 }
      }
    ]);
  });

  it("keeps conveyor roller descriptor count, spacing, and rotation", () => {
    const parts = getMachinePlaceholderVisualParts(createDefinition("conveyor-roller"));
    const frame = parts[0];

    expect(parts).toHaveLength(6);
    expect(frame).toMatchObject({
      kind: "box",
      suffix: "roller-frame"
    });
    if (frame.kind !== "box") {
      throw new Error("Expected roller frame to be a box descriptor.");
    }
    expect(frame.size.width).toBeCloseTo(4);
    expect(frame.size.depth).toBeCloseTo(1.2);
    expect(frame.size.height).toBeCloseTo(0.224);
    expect(parts.slice(1).every((part) => part.kind === "cylinder" && part.suffix === "roller")).toBe(true);
    expect(parts[1].position.x).toBeCloseTo(-4 / 3);
    expect(parts[3].position.x).toBeCloseTo(0);
    expect(parts[5].position.x).toBeCloseTo(4 / 3);
    expect(parts[1].rotation).toEqual({ x: Math.PI / 2, y: 0, z: 0 });
  });

  it("preserves inclined elevator run rotation as descriptor data", () => {
    const parts = getMachinePlaceholderVisualParts(createDefinition("elevator-inclined"));

    expect(parts).toHaveLength(2);
    expect(parts[1]).toMatchObject({
      kind: "box",
      suffix: "inclined-run",
      rotation: { x: 0, y: 0, z: -Math.PI / 10 }
    });
  });

  it("uses millimeter dimensions when available", () => {
    const parts = getMachinePlaceholderVisualParts({
      ...createDefinition("safety-fence"),
      widthMm: 2500,
      depthMm: 120,
      heightMm: 1800
    });

    expect(parts[0]).toMatchObject({
      kind: "box",
      suffix: "fence-panel",
      size: { width: 2.5, depth: 0.04, height: 1.296 }
    });
    expect(parts[1].position.x).toBeCloseTo(-1.2);
    expect(parts[2].position.x).toBeCloseTo(1.2);
  });
});
