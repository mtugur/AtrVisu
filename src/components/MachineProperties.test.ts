import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_PLACEMENT_SETTINGS } from "../utils/placementSettings";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  MachineProperties,
  commitMachineRotationDraft,
  getRotationAngleInputStep,
  getSelectedAtaraMachineDataState
} from "./MachineProperties";

const baseDefinition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Custom",
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  width: 1,
  depth: 1,
  height: 1,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const createPlacedMachine = (definitionSnapshot: MachineDefinition, definition = definitionSnapshot): PlacedMachine => ({
  instanceId: "machine-1",
  machineDefinitionId: "machine",
  definitionSnapshot,
  definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
});

const renderSelectedMachineProperties = (machine: PlacedMachine, isLocked = false) =>
  renderToStaticMarkup(
    createElement(MachineProperties, {
      selectedMachine: machine,
      layers: [{
        id: "default",
        name: "Default",
        visible: true,
        locked: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }],
      isLocked,
      placementSettings: {
        ...DEFAULT_PLACEMENT_SETTINGS,
        rotationSnapEnabled: true,
        rotationSnapStepDeg: 45
      },
      collisionPairs: [],
      onUpdateMachine: () => undefined,
      onChangeLayer: () => undefined,
      onDeleteSelected: () => undefined
    })
  );

const getRotationFieldMarkup = (markup: string) => {
  const rotationLabelIndex = markup.indexOf("Rotation Angle");
  const fieldEndIndex = markup.indexOf("</label>", rotationLabelIndex);

  expect(rotationLabelIndex).toBeGreaterThanOrEqual(0);
  expect(fieldEndIndex).toBeGreaterThan(rotationLabelIndex);

  return markup.slice(rotationLabelIndex, fieldEndIndex);
};

describe("MachineProperties ATARA diagnostics", () => {
  it("reads ATARA data from the definition snapshot first", () => {
    const machine = createPlacedMachine({
      ...baseDefinition,
      ataraMachineData: {
        identity: { atrId: "ATR-SNAPSHOT" }
      }
    });

    const state = getSelectedAtaraMachineDataState(machine);

    expect(state.ataraMachineData?.identity?.atrId).toBe("ATR-SNAPSHOT");
    expect(state.hasNewerLibraryAtaraData).toBe(false);
  });

  it("does not crash for older scene objects without ATARA data", () => {
    const state = getSelectedAtaraMachineDataState(createPlacedMachine(baseDefinition));

    expect(state.ataraMachineData).toBeUndefined();
    expect(state.hasNewerLibraryAtaraData).toBe(false);
  });

  it("detects newer library ATARA data when snapshot is older", () => {
    const state = getSelectedAtaraMachineDataState(
      createPlacedMachine(baseDefinition, {
        ...baseDefinition,
        ataraMachineData: {
          identity: { atrId: "ATR-LIBRARY" }
        }
      })
    );

    expect(state.ataraMachineData?.identity?.atrId).toBe("ATR-LIBRARY");
    expect(state.hasNewerLibraryAtaraData).toBe(true);
  });
});

describe("MachineProperties rotation editing", () => {
  it("keeps the rotation angle input enabled and uses the active snap step", () => {
    const markup = renderSelectedMachineProperties(createPlacedMachine(baseDefinition));
    const rotationFieldMarkup = getRotationFieldMarkup(markup);

    expect(rotationFieldMarkup).toContain('step="45"');
    expect(rotationFieldMarkup).toContain('value="0"');
    expect(rotationFieldMarkup).not.toContain('disabled=""');
  });

  it("disables the rotation angle input only when the selected machine is locked", () => {
    const markup = renderSelectedMachineProperties(createPlacedMachine(baseDefinition), true);
    const rotationFieldMarkup = getRotationFieldMarkup(markup);

    expect(rotationFieldMarkup).toContain('disabled=""');
    expect(rotationFieldMarkup).toContain('step="45"');
  });

  it("uses the active snap step for the native Rotation Angle number input +/- spinner", () => {
    // MachineProperties does not render explicit +/- rotation buttons for this field;
    // the browser's native number input spinner is the supported field-level +/- mechanism.
    expect(getRotationAngleInputStep({
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: true,
      rotationSnapStepDeg: 45
    })).toBe(45);
    expect(getRotationAngleInputStep({
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: false,
      rotationSnapStepDeg: 45
    })).toBe(1);
  });

  it("normalizes committed manual rotation input to the nearest snap step when snap is enabled", () => {
    expect(commitMachineRotationDraft("50", 0, {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: true,
      rotationSnapStepDeg: 45
    })).toEqual({
      shouldCommit: true,
      rotationDeg: 45,
      displayValue: "45"
    });
  });

  it("preserves committed manual rotation input apart from normalization when snap is disabled", () => {
    expect(commitMachineRotationDraft("50", 0, {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: false,
      rotationSnapStepDeg: 45
    })).toEqual({
      shouldCommit: true,
      rotationDeg: 50,
      displayValue: "50"
    });
  });

  it("reverts invalid manual rotation drafts without committing", () => {
    expect(commitMachineRotationDraft("-", 90, {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: true,
      rotationSnapStepDeg: 45
    })).toEqual({
      shouldCommit: false,
      rotationDeg: 90,
      displayValue: "90"
    });
  });
});
