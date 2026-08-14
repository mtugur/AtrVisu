import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { TECHNICAL_COLOR_RGB, type TechnicalRgb } from "../designSystem";
import type { LayoutPlanModel } from "./layoutPlan";
import { embedCommercialPdfFonts } from "./pdfFontAdapter";
import { paginateEquipmentSchedule, type EquipmentSchedulePage } from "./schedulePagination";

const A3_LANDSCAPE: [number, number] = [1190.55, 841.89];
const PAGE_MARGIN = 42;
const TITLE_BLOCK_HEIGHT = 76;
const pdfRgb = rgb;
const pdfColor = (color: TechnicalRgb) => pdfRgb(color[0], color[1], color[2]);

const truncate = (value: string, maxLength: number) => value.length > maxLength
  ? `${value.slice(0, Math.max(0, maxLength - 1))}...`
  : value;

const drawMetadata = (page: PDFPage, font: PDFFont, bold: PDFFont, model: LayoutPlanModel) => {
  const [pageWidth] = A3_LANDSCAPE;
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: PAGE_MARGIN,
    width: pageWidth - PAGE_MARGIN * 2,
    height: TITLE_BLOCK_HEIGHT,
    borderColor: pdfColor(TECHNICAL_COLOR_RGB.sceneAmbient),
    borderWidth: 1
  });
  page.drawText(model.title, { x: PAGE_MARGIN + 12, y: PAGE_MARGIN + 50, size: 16, font: bold, color: pdfColor(TECHNICAL_COLOR_RGB.sceneGround) });
  page.drawText(`Project: ${model.projectName}`, { x: PAGE_MARGIN + 12, y: PAGE_MARGIN + 30, size: 9, font });
  page.drawText(`Layout: ${model.layoutName}`, { x: 360, y: PAGE_MARGIN + 30, size: 9, font });
  page.drawText(`Revision: ${model.revision}`, { x: 660, y: PAGE_MARGIN + 30, size: 9, font });
  page.drawText(`Generated: ${model.generatedAt}`, { x: PAGE_MARGIN + 12, y: PAGE_MARGIN + 12, size: 8, font });
  page.drawText(`Unit: ${model.unit}`, { x: 660, y: PAGE_MARGIN + 12, size: 8, font });
  page.drawText(model.scaleLabel, { x: 850, y: PAGE_MARGIN + 12, size: 8, font: bold });
};

const drawPlan = (page: PDFPage, font: PDFFont, bold: PDFFont, model: LayoutPlanModel) => {
  const [pageWidth, pageHeight] = A3_LANDSCAPE;
  const drawing = {
    x: PAGE_MARGIN + 54,
    y: PAGE_MARGIN + TITLE_BLOCK_HEIGHT + 54,
    width: pageWidth - PAGE_MARGIN * 2 - 108,
    height: pageHeight - PAGE_MARGIN * 2 - TITLE_BLOCK_HEIGHT - 108
  };
  page.drawRectangle({ x: drawing.x, y: drawing.y, width: drawing.width, height: drawing.height, borderColor: pdfColor(TECHNICAL_COLOR_RGB.neutralFrame), borderWidth: 0.8 });
  if (!model.extents || model.footprints.length === 0) {
    page.drawText("No visible canonical footprint is available.", {
      x: drawing.x + 20,
      y: drawing.y + drawing.height / 2,
      size: 13,
      font,
      color: pdfColor(TECHNICAL_COLOR_RGB.clearanceFrame)
    });
    return;
  }
  const spanX = Math.max(model.extents.widthMm, 1);
  const spanY = Math.max(model.extents.depthMm, 1);
  const scale = Math.min(drawing.width / spanX, drawing.height / spanY) * 0.9;
  const usedWidth = spanX * scale;
  const usedHeight = spanY * scale;
  const originX = drawing.x + (drawing.width - usedWidth) / 2 - model.extents.minXMm * scale;
  const originY = drawing.y + (drawing.height - usedHeight) / 2 - model.extents.minYMm * scale;
  const point = (value: { xMm: number; yMm: number }) => ({
    x: originX + value.xMm * scale,
    y: originY + value.yMm * scale
  });

  model.footprints.forEach((footprint) => {
    const corners = footprint.cornersMm.map(point);
    corners.forEach((corner, index) => {
      const next = corners[(index + 1) % corners.length];
      page.drawLine({
        start: corner,
        end: next,
        thickness: footprint.entityType === "machine" ? 1.3 : 0.8,
        color: footprint.entityType === "machine"
          ? pdfColor(TECHNICAL_COLOR_RGB.axisZ)
          : pdfColor(TECHNICAL_COLOR_RGB.sceneAmbient)
      });
    });
    const centerX = corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length;
    const centerY = corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length;
    page.drawText(truncate(footprint.name, 28), { x: centerX - 32, y: centerY - 3, size: 7, font: bold, color: pdfColor(TECHNICAL_COLOR_RGB.sceneGround) });
    if (corners.length >= 2) {
      const frontMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
      page.drawLine({ start: { x: centerX, y: centerY }, end: frontMid, thickness: 1.4, color: pdfColor(TECHNICAL_COLOR_RGB.axisX) });
    }
  });

  const lowerLeft = point({ xMm: model.extents.minXMm, yMm: model.extents.minYMm });
  const lowerRight = point({ xMm: model.extents.maxXMm, yMm: model.extents.minYMm });
  const upperLeft = point({ xMm: model.extents.minXMm, yMm: model.extents.maxYMm });
  const dimensionColor = pdfColor(TECHNICAL_COLOR_RGB.sceneAmbient);
  page.drawLine({ start: { x: lowerLeft.x, y: lowerLeft.y - 24 }, end: { x: lowerRight.x, y: lowerRight.y - 24 }, thickness: 0.8, color: dimensionColor });
  page.drawText(model.xDimensionLabel, { x: (lowerLeft.x + lowerRight.x) / 2 - 24, y: lowerLeft.y - 20, size: 8, font: bold });
  page.drawLine({ start: { x: lowerLeft.x - 24, y: lowerLeft.y }, end: { x: upperLeft.x - 24, y: upperLeft.y }, thickness: 0.8, color: dimensionColor });
  page.drawText(model.yDimensionLabel, { x: lowerLeft.x - 52, y: (lowerLeft.y + upperLeft.y) / 2, size: 8, font: bold, rotate: degrees(90) });
  const origin = point({ xMm: 0, yMm: 0 });
  page.drawCircle({ x: origin.x, y: origin.y, size: 3, borderColor: pdfColor(TECHNICAL_COLOR_RGB.axisX), borderWidth: 1 });
  page.drawText("Origin (0, 0)", { x: origin.x + 5, y: origin.y + 5, size: 7, font });
  page.drawText("+X", { x: drawing.x + drawing.width - 20, y: drawing.y + 8, size: 8, font: bold });
  page.drawText("+Y", { x: drawing.x + 8, y: drawing.y + drawing.height - 12, size: 8, font: bold });
};

const drawSchedule = (
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  model: LayoutPlanModel,
  schedulePage: EquipmentSchedulePage
) => {
  const [pageWidth, pageHeight] = A3_LANDSCAPE;
  page.drawText("EQUIPMENT SCHEDULE", { x: PAGE_MARGIN, y: pageHeight - PAGE_MARGIN, size: 18, font: bold, color: pdfColor(TECHNICAL_COLOR_RGB.sceneGround) });
  page.drawText(`${model.projectName} / ${model.layoutName} / ${model.revision}`, { x: PAGE_MARGIN, y: pageHeight - PAGE_MARGIN - 22, size: 9, font });
  page.drawText(`Schedule page ${schedulePage.pageIndex + 1} of ${schedulePage.pageCount}`, {
    x: pageWidth - PAGE_MARGIN - 116,
    y: pageHeight - PAGE_MARGIN - 22,
    size: 8,
    font: bold
  });
  const columns = [
    { label: "Equipment", width: 140 },
    { label: "Instance", width: 100 },
    { label: "Identity", width: 185 },
    { label: "Dimensions", width: 135 },
    { label: "Manufacturer", width: 120 },
    { label: "Machine code", width: 105 },
    { label: "Power", width: 80 },
    { label: "Air", width: 75 },
    { label: "Network", width: 110 }
  ];
  let y = pageHeight - PAGE_MARGIN - 62;
  page.drawRectangle({ x: PAGE_MARGIN, y: y - 4, width: pageWidth - PAGE_MARGIN * 2, height: 22, color: pdfColor(TECHNICAL_COLOR_RGB.sceneAmbient) });
  let x = PAGE_MARGIN + 4;
  columns.forEach((column) => {
    page.drawText(column.label, { x, y: y + 4, size: 8, font: bold, color: pdfColor(TECHNICAL_COLOR_RGB.white) });
    x += column.width;
  });
  y -= 20;
  schedulePage.rows.forEach((row, pageRowIndex) => {
    const rowIndex = schedulePage.rowStartIndex + pageRowIndex;
    if (rowIndex % 2 === 0) {
      page.drawRectangle({ x: PAGE_MARGIN, y: y - 3, width: pageWidth - PAGE_MARGIN * 2, height: 19, color: pdfColor(TECHNICAL_COLOR_RGB.nearWhite) });
    }
    const values = [row.name, row.instanceId, row.identity, row.dimensions, row.manufacturer, row.machineCode, row.electricalPower, row.pneumaticPressure, row.networkProtocols];
    x = PAGE_MARGIN + 4;
    values.forEach((value, index) => {
      page.drawText(truncate(value, Math.max(8, Math.floor(columns[index].width / 5.3))), { x, y: y + 2, size: 7, font, color: pdfColor(TECHNICAL_COLOR_RGB.sceneGround) });
      x += columns[index].width;
    });
    y -= 19;
  });
};

export const serializeLayoutPlanPdf = async (model: LayoutPlanModel) => {
  const document = await PDFDocument.create();
  document.setTitle(`${model.projectName} - ${model.layoutName} - Measured Layout Plan`);
  document.setSubject(`Revision ${model.revision}; unit ${model.unit}; ${model.xDimensionLabel} x ${model.yDimensionLabel}`);
  document.setKeywords(["AtrVisu", "Measured Layout Plan", model.projectName, model.layoutName, model.revision, model.unit]);
  document.setProducer("AtrVisu");
  document.setCreationDate(new Date(model.generatedAt));
  document.setModificationDate(new Date(model.generatedAt));
  const { regular: font, bold } = await embedCommercialPdfFonts(document);
  const planPage = document.addPage(A3_LANDSCAPE);
  drawPlan(planPage, font, bold, model);
  drawMetadata(planPage, font, bold, model);
  paginateEquipmentSchedule(model.schedule).forEach((schedulePageModel) => {
    const schedulePage = document.addPage(A3_LANDSCAPE);
    drawSchedule(schedulePage, font, bold, model, schedulePageModel);
  });
  return document.save({ useObjectStreams: false });
};
