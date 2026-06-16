import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../types/civil";
import { createCivilReference, deleteCivilReference, normalizeCivilReferences, updateCivilReference } from "./civil";
import { createDefaultLayer } from "./layers";

describe("civil references", () => {
  it("creates a civil reference on the Default layer", () => {
    const item = createCivilReference("column", { xMm: -200, yMm: 350 });

    expect(item.type).toBe("column");
    expect(item.layerId).toBe("default");
    expect(item.positionMm).toMatchObject({ xMm: -200, yMm: 350 });
    expect(item.sizeMm.widthMm).toBeGreaterThan(0);
  });

  it("loads safely when civil references are missing", () => {
    expect(normalizeCivilReferences(undefined, [createDefaultLayer()])).toEqual([]);
  });

  it("resolves missing layers to Default and keeps signed plan coordinates", () => {
    const [item] = normalizeCivilReferences([
      {
        id: "civil-1",
        type: "wall",
        name: "North Wall",
        positionMm: { xMm: -1500, yMm: -2500, zMm: 0 },
        sizeMm: { widthMm: 5000, depthMm: 200, heightMm: 3000 },
        rotationDeg: 90,
        layerId: "missing",
        createdAt: "now",
        updatedAt: "now"
      }
    ], [createDefaultLayer()]);

    expect(item.layerId).toBe("default");
    expect(item.positionMm.xMm).toBe(-1500);
    expect(item.positionMm.yMm).toBe(-2500);
    expect(item.rotationDeg).toBe(90);
  });

  it("normalizes invalid physical dimensions to positive defaults", () => {
    const [item] = normalizeCivilReferences([
      {
        id: "civil-1",
        type: "column",
        name: "Column",
        positionMm: { xMm: 0, yMm: 0, zMm: -100 },
        sizeMm: { widthMm: -10, depthMm: 0, heightMm: -1 },
        rotationDeg: 0,
        createdAt: "now",
        updatedAt: "now"
      }
    ], [createDefaultLayer()]);

    expect(item.positionMm.zMm).toBe(0);
    expect(item.sizeMm.widthMm).toBeGreaterThan(0);
    expect(item.sizeMm.depthMm).toBeGreaterThan(0);
    expect(item.sizeMm.heightMm).toBeGreaterThan(0);
  });

  it("updates and deletes civil references", () => {
    const item: CivilReferenceItem = createCivilReference("walkway", { xMm: 0, yMm: 0 });
    const updated = updateCivilReference([item], item.id, {
      name: "Service Corridor",
      positionMm: { xMm: 1200, yMm: -800 },
      sizeMm: { ...item.sizeMm, widthMm: 4200 }
    });

    expect(updated[0]).toMatchObject({
      name: "Service Corridor",
      positionMm: { xMm: 1200, yMm: -800 },
      sizeMm: { widthMm: 4200 }
    });
    expect(deleteCivilReference(updated, item.id)).toEqual([]);
  });
});
