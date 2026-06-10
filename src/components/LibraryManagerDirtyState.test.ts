import { describe, expect, it } from "vitest";
import { getItemEditorDirtyKey } from "./LibraryManager";

const createEditor = (overrides: Record<string, unknown> = {}) => ({
  mode: "edit",
  parentGroupId: "root",
  originalId: "item-1",
  id: "item-1",
  name: "Machine",
  category: "Custom",
  machineType: "Custom Machine",
  variant: "",
  productFamilyCode: "",
  tags: "",
  placeholderVisualType: "box-generic",
  widthMm: "1000",
  depthMm: "2000",
  heightMm: "3000",
  defaultColor: "#ffffff",
  canConvey: false,
  canPalletize: false,
  canWrap: false,
  hasFlowDirection: false,
  canWeigh: false,
  canDose: false,
  canInspect: false,
  canStore: false,
  canElevate: false,
  connectsLevels: false,
  mobileEquipment: false,
  collisionRelevant: true,
  requiresTravelPath: false,
  buildingObstacle: false,
  safetyEquipment: false,
  instrumentation: false,
  visualModelPath: "",
  visualModelUnit: "m",
  visualModelScaleMode: "metadata-box",
  rotationOffsetX: "0",
  rotationOffsetY: "0",
  rotationOffsetZ: "0",
  positionOffsetXMm: "0",
  positionOffsetYMm: "0",
  positionOffsetZMm: "0",
  centerOnFootprint: true,
  bottomOnFloor: true,
  preserveAspectRatio: true,
  forwardAxis: "z+",
  upAxis: "y+",
  collisionEnvelopeEnabled: true,
  collisionWidthMm: "1000",
  collisionDepthMm: "2000",
  collisionHeightMm: "3000",
  collisionOffsetXMm: "0",
  collisionOffsetYMm: "0",
  collisionOffsetZMm: "0",
  ataraIsProduct: false,
  ataraAtrId: "",
  ataraMachineCode: "",
  ataraProductFamilyCode: "",
  ataraPdnCode: "",
  ataraDisplayName: "",
  ataraRevision: "",
  ataraWeightKg: "",
  ataraOperatingWeightKg: "",
  ataraMaintenanceOpenWidthMm: "",
  ataraMaintenanceOpenDepthMm: "",
  ataraMaintenanceOpenHeightMm: "",
  ataraClearanceFrontMm: "0",
  ataraClearanceBackMm: "0",
  ataraClearanceLeftMm: "0",
  ataraClearanceRightMm: "0",
  ataraClearanceTopMm: "0",
  ataraClearanceNotes: "",
  ataraCapacityMin: "",
  ataraCapacityNominal: "",
  ataraCapacityMax: "",
  ataraCapacityUnit: "",
  ataraProductTypes: "",
  ataraNoiseDb: "",
  ataraVibrationClass: "",
  ataraOperationalNotes: "",
  ataraElectricalPowerKw: "",
  ataraVoltage: "",
  ataraPhase: "",
  ataraFrequencyHz: "",
  ataraPneumaticPressureBar: "",
  ataraAirConsumptionNlMin: "",
  ataraNetworkProtocols: "",
  ataraAspirationRequired: false,
  ataraAspirationAirflowM3h: "",
  ataraUtilityNotes: "",
  ataraConnectionPointsJson: "[]",
  ...overrides
});

describe("Library Manager item editor dirty state", () => {
  it("does not mark an unchanged selected item dirty", () => {
    const editor = createEditor();

    expect(getItemEditorDirtyKey(editor as never)).toBe(getItemEditorDirtyKey(editor as never));
  });

  it("marks real field edits dirty", () => {
    const baseline = getItemEditorDirtyKey(createEditor() as never);
    const edited = getItemEditorDirtyKey(createEditor({ name: "Edited Machine" }) as never);

    expect(edited).not.toBe(baseline);
  });

  it("normalizes numeric strings and whitespace", () => {
    const baseline = getItemEditorDirtyKey(createEditor({ widthMm: "1000", ataraClearanceFrontMm: "0" }) as never);
    const equivalent = getItemEditorDirtyKey(createEditor({ widthMm: "1000.0", ataraClearanceFrontMm: " 0 " }) as never);

    expect(equivalent).toBe(baseline);
  });

  it("normalizes empty optional arrays and CSV values", () => {
    const baseline = getItemEditorDirtyKey(createEditor({ tags: "", ataraProductTypes: "", ataraNetworkProtocols: "" }) as never);
    const equivalent = getItemEditorDirtyKey(createEditor({ tags: "  ", ataraProductTypes: "  ", ataraNetworkProtocols: " " }) as never);

    expect(equivalent).toBe(baseline);
  });

  it("normalizes equivalent connection point JSON", () => {
    const connectionPoints = [
      {
        id: "electrical-1",
        name: "Electrical",
        type: "electrical",
        positionMm: { xMm: 0, yMm: 0, zMm: 0 },
        direction: "x+"
      }
    ];
    const baseline = getItemEditorDirtyKey(createEditor({ ataraConnectionPointsJson: JSON.stringify(connectionPoints, null, 2) }) as never);
    const equivalent = getItemEditorDirtyKey(createEditor({ ataraConnectionPointsJson: JSON.stringify(connectionPoints) }) as never);

    expect(equivalent).toBe(baseline);
  });
});
