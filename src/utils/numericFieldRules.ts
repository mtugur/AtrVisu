export type NumericKind =
  | "signed-coordinate"
  | "non-negative-physical"
  | "positive-physical"
  | "context-signed"
  | "percentage"
  | "angle"
  | "integer-count";

export type ZeroPolicy = "zero-allowed" | "greater-than-zero";
export type InvalidInputBehavior = "keep-invalid" | "revert-on-blur";

export type NumericFieldRule = {
  key: string;
  label: string;
  unit: string;
  numericKind: NumericKind;
  optional: boolean;
  allowDecimal: boolean;
  zeroPolicy: ZeroPolicy;
  invalidInputBehavior: InvalidInputBehavior;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  reason?: string;
};

export type NumericValueValidation =
  | { valid: true; value: number | undefined; empty: boolean }
  | { valid: false; message: string };

export const createNumericFieldRule = (rule: NumericFieldRule): NumericFieldRule => {
  assertKnownNumericFieldRule(rule);
  return rule;
};

export const getRuleAllowsNegative = (rule: NumericFieldRule) => {
  if (rule.numericKind === "context-signed" || rule.numericKind === "angle") {
    return rule.allowNegative === true;
  }

  if (rule.numericKind === "signed-coordinate") {
    return true;
  }

  return false;
};

const getEffectiveMin = (rule: NumericFieldRule) => {
  if (typeof rule.min === "number") {
    return rule.min;
  }

  if (rule.numericKind === "percentage") {
    return 0;
  }

  if (!getRuleAllowsNegative(rule)) {
    return 0;
  }

  return undefined;
};

const getEffectiveMax = (rule: NumericFieldRule) => {
  if (typeof rule.max === "number") {
    return rule.max;
  }

  if (rule.numericKind === "percentage") {
    return 100;
  }

  return undefined;
};

export const validateNumericFieldRule = (rule: NumericFieldRule): string[] => {
  const issues: string[] = [];

  if (!rule.key.trim()) {
    issues.push("Numeric field rule requires key.");
  }
  if (!rule.label.trim()) {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires label.`);
  }
  if (!rule.unit.trim()) {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires unit.`);
  }
  if (!rule.numericKind) {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires numericKind.`);
  }
  if (typeof rule.optional !== "boolean") {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires optional.`);
  }
  if (typeof rule.allowDecimal !== "boolean") {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires allowDecimal.`);
  }
  if (!rule.zeroPolicy) {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires zeroPolicy.`);
  }
  if (!rule.invalidInputBehavior) {
    issues.push(`Numeric field rule ${rule.key || "(unknown)"} requires invalidInputBehavior.`);
  }

  if (rule.numericKind === "context-signed") {
    if (typeof rule.allowNegative !== "boolean") {
      issues.push(`Context-signed numeric field ${rule.key} requires explicit allowNegative.`);
    }
    if (!rule.reason?.trim()) {
      issues.push(`Context-signed numeric field ${rule.key} requires a reason.`);
    }
  }

  if (rule.numericKind === "angle" && typeof rule.allowNegative !== "boolean") {
    issues.push(`Angle numeric field ${rule.key} requires explicit allowNegative.`);
  }

  if (rule.numericKind === "integer-count" && rule.allowDecimal) {
    issues.push(`Integer-count numeric field ${rule.key} must set allowDecimal=false.`);
  }

  if (rule.zeroPolicy === "greater-than-zero" && getRuleAllowsNegative(rule)) {
    issues.push(`Numeric field ${rule.key} cannot combine signed negative behavior with greater-than-zero.`);
  }

  return issues;
};

export const assertKnownNumericFieldRule = (rule: NumericFieldRule) => {
  const issues = validateNumericFieldRule(rule);
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }
};

export const deriveNumericInputProps = (rule: NumericFieldRule) => {
  assertKnownNumericFieldRule(rule);

  return {
    allowNegative: getRuleAllowsNegative(rule),
    allowDecimal: rule.allowDecimal,
    min: getEffectiveMin(rule),
    max: getEffectiveMax(rule),
    unitLabel: rule.unit
  };
};

export const validateNumericValue = (value: string | number | undefined, rule: NumericFieldRule): NumericValueValidation => {
  assertKnownNumericFieldRule(rule);

  const rawValue = value === undefined ? "" : String(value).trim();
  if (!rawValue) {
    return rule.optional
      ? { valid: true, value: undefined, empty: true }
      : { valid: false, message: `${rule.label} is required.` };
  }

  if (rawValue === "-" || rawValue === "." || rawValue === "-.") {
    return { valid: false, message: `${rule.label} is incomplete.` };
  }

  if (!rule.allowDecimal && rawValue.includes(".")) {
    return { valid: false, message: `${rule.label} must be an integer.` };
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return { valid: false, message: `${rule.label} must be a valid number.` };
  }

  if (!getRuleAllowsNegative(rule) && numericValue < 0) {
    return { valid: false, message: `${rule.label} cannot be negative.` };
  }

  if (rule.zeroPolicy === "greater-than-zero" && numericValue <= 0) {
    return { valid: false, message: `${rule.label} must be greater than zero.` };
  }

  const min = getEffectiveMin(rule);
  if (typeof min === "number" && numericValue < min) {
    return { valid: false, message: `${rule.label} must be at least ${min} ${rule.unit}.` };
  }

  const max = getEffectiveMax(rule);
  if (typeof max === "number" && numericValue > max) {
    return { valid: false, message: `${rule.label} must be at most ${max} ${rule.unit}.` };
  }

  return { valid: true, value: numericValue, empty: false };
};

