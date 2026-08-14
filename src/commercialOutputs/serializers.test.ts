import { PDFDocument } from "pdf-lib";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createCommercialOutputSnapshot } from "./commercialOutputSnapshot";
import { getPngDimensions } from "./download";
import { createLayoutPlanModel } from "./layoutPlan";
import { serializeLayoutPlanPdf } from "./pdfSerializer";
import { commercialOutputFixtureInput } from "./testFixtures";
import { serializeCommercialOutputXlsx } from "./xlsxSerializer";

describe("commercial output serializers", () => {
  it("creates a valid XLSX OpenXML package with Summary, BOM and Instances", () => {
    const snapshot = createCommercialOutputSnapshot(commercialOutputFixtureInput());
    const files = unzipSync(serializeCommercialOutputXlsx(snapshot));
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const bom = strFromU8(files["xl/worksheets/sheet2.xml"]);
    const instances = strFromU8(files["xl/worksheets/sheet3.xml"]);

    expect(Object.keys(files)).toContain("[Content_Types].xml");
    expect(workbook).toContain('name="Summary"');
    expect(workbook).toContain('name="BOM"');
    expect(workbook).toContain('name="Instances"');
    expect(bom).toContain("Flow Pack Machine");
    expect(bom).toContain("Belt Conveyor");
    expect(bom).toContain("Robot Palletizer");
    expect(bom).toContain("Unknown");
    expect(bom).toContain("atara-standard:conveyor-belt-01");
    expect(bom).toMatch(/<v>2<\/v>/);
    expect(instances.match(/conveyor-[12]/g)).toHaveLength(2);
  });

  it("creates a two-page A3 landscape PDF with canonical plan metadata and dimensions", async () => {
    const snapshot = createCommercialOutputSnapshot(commercialOutputFixtureInput());
    const plan = createLayoutPlanModel(snapshot);
    const bytes = await serializeLayoutPlanPdf(plan);
    const pdf = await PDFDocument.load(bytes);

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toContain("ATARA Line / 01");
    expect(pdf.getSubject()).toContain(plan.xDimensionLabel);
    expect(pdf.getSubject()).toContain(plan.yDimensionLabel);
    expect(pdf.getSubject()).toContain("unit mm");
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(1190.55, 1);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(841.89, 1);
    expect(plan.footprints.some((footprint) => footprint.entityId === "machine:conveyor-2")).toBe(true);
  });

  it("recognizes valid 1920 by 1080 PNG output headers", () => {
    const bytes = new Uint8Array(24);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(bytes.buffer).setUint32(16, 1920);
    new DataView(bytes.buffer).setUint32(20, 1080);
    expect(getPngDimensions(bytes)).toEqual({ width: 1920, height: 1080 });
    expect(getPngDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
