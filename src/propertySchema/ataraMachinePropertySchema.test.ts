import { describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { validatePropertySchemaDefinition } from "../platform/phase1ArchitectureValidation";
import {
  ATARA_MACHINE_PROPERTY_SCHEMA,
  PROPERTY_SCHEMA_REGISTRY,
  createAtaraMachinePropertySource,
  getAtaraMachinePropertySourceValue,
  projectAtaraMachineProperties
} from "./ataraMachinePropertySchema";

const definition = (name: string, code: string): MachineDefinition => ({
  id: `definition-${code}`,
  name,
  category: "Packaging",
  productFamilyCode: "PF-FALLBACK",
  widthMm: 1200,
  depthMm: 800,
  heightMm: 1800,
  width: 1.2,
  depth: 0.8,
  height: 1.8,
  defaultColor: "#ffffff",
  connectionPoints: [],
  ataraMachineData: {
    identity: {
      manufacturer: "Atara Makine",
      isAtaraProduct: true,
      atrId: `ATR-${code}`,
      machineCode: code,
      productFamilyCode: "PF-100",
      pdnCode: "PDN-42",
      revision: "R03"
    },
    physical: {
      widthMm: 1200,
      depthMm: 800,
      heightMm: 1800,
      weightKg: 950,
      operatingWeightKg: 1100
    },
    operationalData: {
      capacityMin: 20,
      capacityNominal: 40,
      capacityMax: 55,
      capacityUnit: "cases/min"
    },
    utilityRequirements: {
      electrical: { powerKw: 12.5, voltage: 400, phase: "3P", frequencyHz: 50, currentA: 22 },
      pneumatic: { pressureBar: 6, airConsumptionNlMin: 240, connectionSize: "G 1/2" },
      network: { protocols: ["OPC UA", "Profinet"] }
    },
    maintenanceClearance: { frontMm: 900, backMm: 600, leftMm: 500, rightMm: 500, topMm: 800 }
  }
});

const machine = (machineDefinition: MachineDefinition): PlacedMachine => ({
  instanceId: `instance-${machineDefinition.id}`,
  machineDefinitionId: machineDefinition.id,
  definitionSnapshot: machineDefinition,
  definition: machineDefinition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
});

const fieldById = (projection: ReturnType<typeof projectAtaraMachineProperties>, id: string) => (
  projection.sections.flatMap((section) => section.fields).find((field) => field.id === id)
);

describe("canonical ATARA machine property schema", () => {
  it("is registered, valid, versioned, and globally unique", () => {
    expect(validatePropertySchemaDefinition(ATARA_MACHINE_PROPERTY_SCHEMA)).toEqual({ valid: true, errors: [] });
    expect(PROPERTY_SCHEMA_REGISTRY.get(ATARA_MACHINE_PROPERTY_SCHEMA.id)).toBe(ATARA_MACHINE_PROPERTY_SCHEMA);
    const fields = ATARA_MACHINE_PROPERTY_SCHEMA.sections.flatMap((section) => section.fields);
    expect(ATARA_MACHINE_PROPERTY_SCHEMA.sections.map((section) => section.id)).toEqual([
      "identity", "physical", "capacity", "electrical", "pneumatic", "network", "maintenance"
    ]);
    expect(fields).toHaveLength(29);
    expect(new Set(fields.map((field) => field.id)).size).toBe(fields.length);
    expect(fields.every((field) => field.editable === false && field.accessorId === field.id)).toBe(true);
  });

  it("projects existing typed ATARA data, units, and export mappings through one authority", () => {
    const projection = projectAtaraMachineProperties(machine(definition("Case Packer", "CP-01")));

    expect(projection.sections).toHaveLength(7);
    expect(fieldById(projection, "atara.identity.manufacturer")).toMatchObject({
      displayValue: "Atara Makine",
      exportMappings: [{ target: "bom", key: "manufacturer" }, { target: "report", key: "manufacturer" }]
    });
    expect(fieldById(projection, "atara.identity.is-atara-product")?.displayValue).toBe("Yes");
    expect(fieldById(projection, "atara.physical.width")?.displayValue).toBe("1200 mm");
    expect(fieldById(projection, "atara.physical.weight")?.displayValue).toBe("950 kg");
    expect(fieldById(projection, "atara.capacity.nominal")?.displayValue).toBe("40 cases/min");
    expect(fieldById(projection, "atara.electrical.power")?.displayValue).toBe("12.5 kW");
    expect(fieldById(projection, "atara.pneumatic.pressure")?.displayValue).toBe("6 bar");
    expect(fieldById(projection, "atara.network.protocols")?.displayValue).toBe("OPC UA, Profinet");
    expect(fieldById(projection, "atara.maintenance.front")?.displayValue).toBe("900 mm");
  });

  it("uses snapshot data first and marks newer definition-only ATARA data", () => {
    const oldSnapshot = { ...definition("Old", "OLD"), ataraMachineData: undefined };
    const currentDefinition = definition("Current", "CURRENT");
    const placed = { ...machine(currentDefinition), definitionSnapshot: oldSnapshot };
    const sourceValue = getAtaraMachinePropertySourceValue(createAtaraMachinePropertySource(placed));

    expect(sourceValue.ataraMachineData?.identity?.machineCode).toBe("CURRENT");
    expect(sourceValue.hasNewerLibraryAtaraData).toBe(true);
  });

  it("keeps absent smart-asset values unknown while retaining known machine dimensions", () => {
    const withoutSmartData = { ...definition("Legacy", "LEGACY"), ataraMachineData: undefined };
    const projection = projectAtaraMachineProperties(machine(withoutSmartData));

    expect(fieldById(projection, "atara.identity.manufacturer")).toMatchObject({
      displayValue: "Not available",
      missing: true
    });
    expect(fieldById(projection, "atara.physical.width")).toMatchObject({
      displayValue: "1200 mm",
      missing: false
    });
    expect(fieldById(projection, "atara.maintenance.front")).toMatchObject({
      displayValue: "Not available",
      missing: true
    });
  });
});
