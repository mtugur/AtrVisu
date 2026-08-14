import { PDFDocument } from "pdf-lib";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createCommercialOutputSnapshot } from "./commercialOutputSnapshot";
import { getPngDimensions } from "./download";
import { createLayoutPlanModel } from "./layoutPlan";
import type { LayoutPlanModel, LayoutPlanScheduleRow } from "./layoutPlan";
import { COMMERCIAL_PDF_FONT_AUTHORITY } from "./pdfFontAdapter";
import { serializeLayoutPlanPdf } from "./pdfSerializer";
import { EQUIPMENT_SCHEDULE_ROWS_PER_PAGE, paginateEquipmentSchedule } from "./schedulePagination";
import { commercialOutputFixtureInput } from "./testFixtures";
import { serializeCommercialOutputXlsx } from "./xlsxSerializer";

const scheduleRows = (count: number): readonly LayoutPlanScheduleRow[] => Array.from(
  { length: count },
  (_, index) => ({
    instanceId: `schedule-instance-${String(index + 1).padStart(3, "0")}`,
    name: index === 0 ? "Ürün Besleme Konveyörü" : `Equipment ${index + 1}`,
    identity: `atara-standard:equipment-${String(index + 1).padStart(3, "0")}`,
    dimensions: "1200 x 800 x 900 mm",
    manufacturer: index === count - 1 ? "Müşteri Çözümü" : "Atara Makine",
    machineCode: `AT-${String(index + 1).padStart(3, "0")}`,
    electricalPower: "12.5 kW",
    pneumaticPressure: "6 bar",
    networkProtocols: index === 0 ? "Görüş / Ölçüm" : "Profinet"
  })
);

const planWithSchedule = (count: number): LayoutPlanModel => ({
  ...createLayoutPlanModel(createCommercialOutputSnapshot(commercialOutputFixtureInput())),
  schedule: scheduleRows(count)
});

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

  it("embeds deterministic OFL Unicode fonts and reloads Turkish commercial text", async () => {
    const base = planWithSchedule(1);
    const plan: LayoutPlanModel = {
      ...base,
      projectName: "İstanbul Şişeleme Hattı",
      layoutName: "Görüş / Ölçüm",
      revision: "Müşteri Çözümü",
      footprints: base.footprints.map((footprint, index) => index === 0
        ? { ...footprint, name: "Ürün Besleme Konveyörü" }
        : footprint),
      schedule: base.schedule.map((row) => ({
        ...row,
        manufacturer: "Müşteri Çözümü / ç Ç ğ Ğ ı İ ö Ö ş Ş ü Ü"
      }))
    };

    const bytes = await serializeLayoutPlanPdf(plan);
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getTitle()).toBe("İstanbul Şişeleme Hattı - Görüş / Ölçüm - Measured Layout Plan");
    expect(pdf.getKeywords()).toContain("Müşteri Çözümü");
    expect(pdf.getPageCount()).toBe(2);
    expect(COMMERCIAL_PDF_FONT_AUTHORITY).toMatchObject({
      family: "Noto Sans",
      license: "SIL Open Font License 1.1"
    });
  });

  it.each([
    { rowCount: 0, schedulePageCount: 1 },
    { rowCount: 1, schedulePageCount: 1 },
    { rowCount: 4, schedulePageCount: 1 },
    { rowCount: EQUIPMENT_SCHEDULE_ROWS_PER_PAGE, schedulePageCount: 1 },
    { rowCount: EQUIPMENT_SCHEDULE_ROWS_PER_PAGE + 1, schedulePageCount: 2 },
    { rowCount: 100, schedulePageCount: 3 }
  ])("preserves all $rowCount schedule rows across $schedulePageCount schedule page(s)", async ({ rowCount, schedulePageCount }) => {
    const plan = planWithSchedule(rowCount);
    const pages = paginateEquipmentSchedule(plan.schedule);
    const flattenedIds = pages.flatMap((page) => page.rows.map((row) => row.instanceId));
    const expectedIds = plan.schedule.map((row) => row.instanceId);

    expect(pages).toHaveLength(schedulePageCount);
    expect(flattenedIds).toEqual(expectedIds);
    expect(new Set(flattenedIds).size).toBe(rowCount);
    if (rowCount > 0) {
      expect(flattenedIds[0]).toBe(expectedIds[0]);
      expect(flattenedIds[flattenedIds.length - 1]).toBe(expectedIds[expectedIds.length - 1]);
    }

    const pdf = await PDFDocument.load(await serializeLayoutPlanPdf(plan));
    expect(pdf.getPageCount()).toBe(schedulePageCount + 1);
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
