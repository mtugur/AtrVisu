import { describe, expect, it } from "vitest";
import { isTemporaryNumericInput, normalizeNumericInputValue } from "./NumericInput";
import {
  createNumericFieldRule,
  validateNumericFieldRule,
  validateNumericValue
} from "../../utils/numericFieldRules";

const planXRule = createNumericFieldRule({
  key: "planX",
  label: "Plan X",
  unit: "mm",
  numericKind: "signed-coordinate",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const weightRule = createNumericFieldRule({
  key: "weightKg",
  label: "Weight",
  unit: "kg",
  numericKind: "positive-physical",
  optional: true,
  allowDecimal: true,
  zeroPolicy: "greater-than-zero",
  invalidInputBehavior: "keep-invalid"
});

const powerRule = createNumericFieldRule({
  key: "motorPowerKw",
  label: "Motor Power",
  unit: "kW",
  numericKind: "positive-physical",
  optional: true,
  allowDecimal: true,
  zeroPolicy: "greater-than-zero",
  invalidInputBehavior: "keep-invalid"
});

const waterRequirementRule = createNumericFieldRule({
  key: "waterRequirement",
  label: "Water Requirement",
  unit: "L/h",
  numericKind: "non-negative-physical",
  optional: true,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const connectionLocalXRule = createNumericFieldRule({
  key: "connectionPoint.localX",
  label: "Connection Point Local X",
  unit: "mm",
  numericKind: "signed-coordinate",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

const gapRule = createNumericFieldRule({
  key: "snapGap",
  label: "Snap Gap",
  unit: "mm",
  numericKind: "non-negative-physical",
  optional: false,
  allowDecimal: true,
  zeroPolicy: "zero-allowed",
  invalidInputBehavior: "keep-invalid"
});

describe("NumericInput rule-based normalization", () => {
  it("requires an explicit numeric field rule", () => {
    const issues = validateNumericFieldRule({
      key: "",
      label: "",
      unit: "",
      numericKind: "positive-physical",
      optional: true,
      allowDecimal: true,
      zeroPolicy: "greater-than-zero",
      invalidInputBehavior: "keep-invalid"
    });

    expect(issues.length).toBeGreaterThan(0);
  });

  it("allows temporary negative typing states before commit", () => {
    expect(isTemporaryNumericInput("-")).toBe(true);
    expect(isTemporaryNumericInput(".")).toBe(true);
    expect(isTemporaryNumericInput("-.")).toBe(true);
    expect(normalizeNumericInputValue("-", planXRule).status).toBe("invalid");
  });

  it("signed-coordinate accepts negative values", () => {
    expect(normalizeNumericInputValue("-200", planXRule)).toEqual({
      status: "valid",
      value: -200,
      displayValue: "-200"
    });
  });

  it("non-negative-physical rejects negative and allows zero", () => {
    expect(validateNumericValue("-5", waterRequirementRule).valid).toBe(false);
    expect(validateNumericValue("0", waterRequirementRule)).toEqual({ valid: true, value: 0, empty: false });
  });

  it("positive-physical rejects negative and zero when assigned", () => {
    expect(validateNumericValue("-10", weightRule).valid).toBe(false);
    expect(validateNumericValue("0", weightRule).valid).toBe(false);
    expect(validateNumericValue("120.5", weightRule)).toEqual({ valid: true, value: 120.5, empty: false });
  });

  it("optional empty physical field is Not assigned, but invalid negative is not", () => {
    expect(validateNumericValue("", waterRequirementRule)).toEqual({ valid: true, value: undefined, empty: true });
    expect(validateNumericValue("-5", waterRequirementRule).valid).toBe(false);
  });

  it("context-signed requires explicit allowNegative and reason", () => {
    expect(validateNumericFieldRule({
      key: "ambientTemperature",
      label: "Ambient Temperature",
      unit: "degC",
      numericKind: "context-signed",
      optional: true,
      allowDecimal: true,
      zeroPolicy: "zero-allowed",
      invalidInputBehavior: "keep-invalid"
    })).toContain("Context-signed numeric field ambientTemperature requires explicit allowNegative.");
  });

  it("percentage applies min and max", () => {
    const percentageRule = createNumericFieldRule({
      key: "utilization",
      label: "Utilization",
      unit: "%",
      numericKind: "percentage",
      optional: true,
      allowDecimal: true,
      zeroPolicy: "zero-allowed",
      invalidInputBehavior: "keep-invalid"
    });

    expect(validateNumericValue("-1", percentageRule).valid).toBe(false);
    expect(validateNumericValue("101", percentageRule).valid).toBe(false);
    expect(validateNumericValue("80", percentageRule)).toEqual({ valid: true, value: 80, empty: false });
  });

  it("integer-count rejects decimal and negative values", () => {
    const countRule = createNumericFieldRule({
      key: "laneCount",
      label: "Lane Count",
      unit: "count",
      numericKind: "integer-count",
      optional: false,
      allowDecimal: false,
      zeroPolicy: "greater-than-zero",
      invalidInputBehavior: "keep-invalid"
    });

    expect(validateNumericValue("1.5", countRule).valid).toBe(false);
    expect(validateNumericValue("-1", countRule).valid).toBe(false);
    expect(validateNumericValue("2", countRule)).toEqual({ valid: true, value: 2, empty: false });
  });

  it("known examples use explicit behavior", () => {
    expect(validateNumericValue("-1", weightRule).valid).toBe(false);
    expect(validateNumericValue("-1", powerRule).valid).toBe(false);
    expect(validateNumericValue("-200", planXRule).valid).toBe(true);
    expect(validateNumericValue("-50", connectionLocalXRule).valid).toBe(true);
    expect(validateNumericValue("-10", gapRule).valid).toBe(false);
  });
});

