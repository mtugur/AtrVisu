import { strToU8, zipSync } from "fflate";
import type { CommercialOutputBomGroup, CommercialOutputProperty, CommercialOutputSnapshot } from "./types";
import { UNKNOWN_COMMERCIAL_VALUE } from "./types";

type WorkbookCell = string | number | boolean;
type WorkbookRow = readonly WorkbookCell[];

const xmlEscape = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const columnName = (columnIndex: number) => {
  let current = columnIndex + 1;
  let name = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const cellXml = (value: WorkbookCell, row: number, column: number, header: boolean) => {
  const reference = `${columnName(column)}${row + 1}`;
  const style = header ? " s=\"1\"" : "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${reference}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
};

const worksheetXml = (rows: readonly WorkbookRow[], headerRows = 1) => {
  const rowXml = rows.map((row, rowIndex) => (
    `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => cellXml(cell, rowIndex, columnIndex, rowIndex < headerRows)).join("")}</row>`
  )).join("");
  const widthCount = Math.max(1, ...rows.map((row) => row.length));
  const widths = Array.from({ length: widthCount }, (_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 28 : 20}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${widths}</cols>
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
};

const propertyColumns = (groups: readonly CommercialOutputBomGroup[]) => {
  const seen = new Set<string>();
  const columns: Array<Pick<CommercialOutputProperty, "key" | "label" | "unitLabel">> = [];
  groups.forEach((group) => group.properties.forEach((property) => {
    if (!seen.has(property.key)) {
      seen.add(property.key);
      columns.push({
        key: property.key,
        label: property.label,
        ...(property.unitLabel ? { unitLabel: property.unitLabel } : {})
      });
    }
  }));
  return columns;
};

const propertyValue = (properties: readonly CommercialOutputProperty[], key: string): WorkbookCell => {
  const property = properties.find((candidate) => candidate.key === key);
  if (!property || property.missing || property.rawValue === null) {
    return UNKNOWN_COMMERCIAL_VALUE;
  }
  return property.rawValue;
};

export const createBomWorkbookRows = (snapshot: CommercialOutputSnapshot) => {
  const summary: WorkbookRow[] = [
    ["Commercial Output Summary", "Value"],
    ["Project name", snapshot.metadata.projectName],
    ["Layout name", snapshot.metadata.layoutName],
    ["Revision", snapshot.metadata.revision],
    ["Generated timestamp", snapshot.metadata.generatedAt],
    ["Canonical unit", snapshot.metadata.canonicalUnit],
    ["Equipment instances", snapshot.equipmentCount],
    ["BOM groups", snapshot.bomGroupCount],
    ["Unknown commercial fields", snapshot.dataGapCount]
  ];
  const columns = propertyColumns(snapshot.bomGroups);
  const bom: WorkbookRow[] = [
    [
      "BOM group identity",
      "Equipment",
      "Canonical definition/library identity",
      "Quantity",
      ...columns.map((column) => `${column.label}${column.unitLabel ? ` (${column.unitLabel})` : ""}`)
    ],
    ...snapshot.bomGroups.map((group): WorkbookRow => [
      group.id,
      group.name,
      group.definitionIdentity,
      group.quantity,
      ...columns.map((column) => propertyValue(group.properties, column.key))
    ])
  ];
  const instances: WorkbookRow[] = [
    [
      "Instance ID", "Equipment", "Canonical definition/library identity", "BOM group identity",
      "Layer", "Group / assembly", "Plan X (mm)", "Plan Y (mm)", "Elevation (mm)",
      "Rotation (deg)", "Width (mm)", "Depth (mm)", "Height (mm)"
    ],
    ...snapshot.equipment.map((instance): WorkbookRow => [
      instance.instanceId,
      instance.name,
      instance.definitionIdentity,
      instance.bomGroupId,
      instance.layer,
      instance.groups.length > 0 ? instance.groups.join(", ") : "None",
      instance.planXMm,
      instance.planYMm,
      instance.elevationMm,
      instance.rotationDeg,
      instance.widthMm,
      instance.depthMm,
      instance.heightMm
    ])
  ];
  return { summary, bom, instances } as const;
};

export const serializeCommercialOutputXlsx = (snapshot: CommercialOutputSnapshot) => {
  const rows = createBomWorkbookRows(snapshot);
  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Summary" sheetId="1" r:id="rId1"/>
    <sheet name="BOM" sheetId="2" r:id="rId2"/>
    <sheet name="Instances" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(rows.summary)),
    "xl/worksheets/sheet2.xml": strToU8(worksheetXml(rows.bom)),
    "xl/worksheets/sheet3.xml": strToU8(worksheetXml(rows.instances))
  };
  return zipSync(files, { level: 6 });
};
