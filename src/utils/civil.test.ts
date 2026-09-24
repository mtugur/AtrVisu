import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../types/civil";
import {
  createCivilReference,
  deleteCivilReference,
  getCivilLevelAnchorWorldElevationMm,
  normalizeCivilReferences,
  resizeCivilHeightPreservingLevelAnchor,
  updateCivilReference
} from "./civil";
import { createDefaultLayer } from "./layers";
import { adaptCivilReferenceToPlatformEntity } from "../platform/adapters";
import { getCivilReferenceFootprintBoundsMm } from "./coordinateReference";

describe("civil references", () => {
  it("creates a civil reference on the Default layer", () => {
    const item = createCivilReference("column", { xMm: -200, yMm: 350 });

    expect(item.type).toBe("column");
    expect(item.layerId).toBe("default");
    expect(item.positionMm).toMatchObject({ xMm: -200, yMm: 350 });
    expect(item.sizeMm.widthMm).toBeGreaterThan(0);
  });

  it("creates an overhead Beam with canonical civil identity, millimetres and style", () => {
    const beam = createCivilReference("beam", { xMm: -1200, yMm: 2400 }, "2026-09-21T00:00:00.000Z");

    expect(beam).toMatchObject({
      type: "beam",
      positionMm: { xMm: -1200, yMm: 2400, zMm: 3000 },
      sizeMm: { widthMm: 6000, depthMm: 300, heightMm: 500 },
      referencePoint: "front-left-bottom",
      layerId: "default",
      style: { colorToken: "#9eaab5", opacity: 0.78 }
    });
    expect(getCivilReferenceFootprintBoundsMm(beam)).toMatchObject({
      minXMm: -1200,
      maxXMm: 4800,
      minYMm: 2400,
      maxYMm: 2700
    });
    expect(adaptCivilReferenceToPlatformEntity(beam, [createDefaultLayer()])).toMatchObject({
      id: `civil:${beam.id}`,
      type: "civil",
      selectable: true,
      locked: false,
      transform: { planX: -1200, planY: 2400, elevation: 3000 }
    });
  });

  it("inherits hidden and locked layer state as a Beam entity", () => {
    const beam = createCivilReference("beam");
    beam.layerId = "structure";
    const layer = { ...createDefaultLayer(), id: "structure", visible: false, locked: true };
    expect(adaptCivilReferenceToPlatformEntity(beam, [createDefaultLayer(), layer])).toMatchObject({
      selectable: false,
      visible: false,
      locked: true
    });
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

  it("preserves a signed Floor Area bottom and keeps its top fixed when thickness changes", () => {
    const floor = {
      ...createCivilReference("floor-area", { xMm: 0, yMm: 0 }),
      positionMm: { xMm: 0, yMm: 0, zMm: -20 }
    };
    const [normalized] = normalizeCivilReferences([floor], [createDefaultLayer()]);

    expect(normalized.positionMm.zMm).toBe(-20);
    expect(getCivilLevelAnchorWorldElevationMm(normalized)).toBe(0);

    const resized = resizeCivilHeightPreservingLevelAnchor(normalized, 350);
    expect(resized.positionMm.zMm).toBe(-350);
    expect(resized.sizeMm.heightMm).toBe(350);
    expect(getCivilLevelAnchorWorldElevationMm({ ...normalized, ...resized })).toBe(0);
  });

  it("keeps legacy civil defaults and normalizes imported Beam and style values", () => {
    const column = createCivilReference("column", { xMm: 0, yMm: 0 });
    const beam = createCivilReference("beam", { xMm: 0, yMm: 0 });
    const [oldItem, restoredBeam] = normalizeCivilReferences([
      { ...column, style: undefined },
      { ...beam, style: { colorToken: "#Ac12EF", opacity: 0.45 } }
    ], [createDefaultLayer()]);

    expect(oldItem.style).toEqual(column.style);
    expect(restoredBeam.type).toBe("beam");
    expect(restoredBeam.style).toEqual({ colorToken: "#ac12ef", opacity: 0.45 });
    expect(restoredBeam.positionMm.zMm).toBe(3000);
  });

  it("rejects unsafe imported color and clamps opacity without changing other style fields", () => {
    const item = createCivilReference("wall");
    const [restored] = normalizeCivilReferences([{
      ...item,
      style: { colorToken: "url(javascript:bad)", opacity: 9 }
    }], [createDefaultLayer()]);
    expect(restored.style).toEqual({ colorToken: item.style?.colorToken, opacity: 1 });

    const [updated] = updateCivilReference([item], item.id, { style: { colorToken: "#123ABC" } });
    expect(updated.style).toEqual({ colorToken: "#123abc", opacity: item.style?.opacity });
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
