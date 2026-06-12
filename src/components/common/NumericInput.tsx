import { useEffect, useId, useState } from "react";
import type { NumericFieldRule } from "../../utils/numericFieldRules";
import {
  assertKnownNumericFieldRule,
  deriveNumericInputProps,
  validateNumericValue
} from "../../utils/numericFieldRules";

export type NumericCommitResult =
  | { status: "empty"; value: undefined; displayValue: "" }
  | { status: "invalid"; value: undefined; displayValue: string; message: string }
  | { status: "valid"; value: number; displayValue: string };

const temporaryNumericStates = new Set(["", "-", ".", "-."]);

export const isTemporaryNumericInput = (value: string) => temporaryNumericStates.has(value.trim());

export const normalizeNumericInputValue = (
  rawValue: string,
  rule: NumericFieldRule
): NumericCommitResult => {
  const inputProps = deriveNumericInputProps(rule);
  const trimmed = rawValue.trim();

  if (trimmed === "") {
    const validation = validateNumericValue(trimmed, rule);
    return validation.valid
      ? { status: "empty", value: undefined, displayValue: "" }
      : { status: "invalid", value: undefined, displayValue: rawValue, message: validation.message };
  }

  if (isTemporaryNumericInput(trimmed)) {
    return {
      status: "invalid",
      value: undefined,
      displayValue: rawValue,
      message: "Complete the number before leaving this field."
    };
  }

  const validation = validateNumericValue(trimmed, rule);
  if (!validation.valid) {
    return { status: "invalid", value: undefined, displayValue: rawValue, message: validation.message };
  }

  const min = inputProps.min;
  const max = inputProps.max;
  const clampedValue = Math.min(
    max ?? Number.POSITIVE_INFINITY,
    Math.max(min ?? Number.NEGATIVE_INFINITY, validation.value ?? 0)
  );

  return {
    status: "valid",
    value: clampedValue,
    displayValue: String(clampedValue)
  };
};

type NumericInputProps = {
  value: number | string;
  rule: NumericFieldRule;
  onChange?: (value: number) => void;
  onDraftChange?: (value: string) => void;
  onCommit: (value: number | undefined) => void;
  step?: number | string;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
  ariaLabel?: string;
};

export function NumericInput({
  value,
  rule,
  onChange,
  onDraftChange,
  onCommit,
  step = 1,
  placeholder,
  disabled,
  "data-testid": dataTestId,
  ariaLabel
}: NumericInputProps) {
  assertKnownNumericFieldRule(rule);
  const inputProps = deriveNumericInputProps(rule);
  const [draft, setDraft] = useState(String(value));
  const [message, setMessage] = useState("");
  const messageId = `${useId()}-message`;

  useEffect(() => {
    setDraft(String(value));
    setMessage("");
  }, [value]);

  const commitDraft = () => {
    const result = normalizeNumericInputValue(draft, rule);

    if (result.status === "valid") {
      setDraft(result.displayValue);
      setMessage("");
      onCommit(result.value);
      return;
    }

    if (result.status === "empty") {
      setDraft("");
      setMessage("");
      onCommit(undefined);
      return;
    }

    setMessage(result.message);
    if (rule.invalidInputBehavior === "revert-on-blur") {
      setDraft(String(value));
    }
  };

  return (
    <span className="numeric-input-control">
      <span className="numeric-input-row">
        <input
          aria-label={ariaLabel}
          aria-invalid={message ? "true" : "false"}
          aria-describedby={message ? messageId : undefined}
          data-testid={dataTestId}
          disabled={disabled}
          inputMode={inputProps.allowDecimal ? "decimal" : "numeric"}
          max={inputProps.max}
          min={inputProps.min}
          placeholder={placeholder}
          step={step}
          type="text"
          value={draft}
          onBlur={commitDraft}
          onChange={(event) => {
            const nextDraft = event.target.value;
            setDraft(nextDraft);
            onDraftChange?.(nextDraft);

            const result = normalizeNumericInputValue(nextDraft, rule);
            if (result.status === "valid") {
              setMessage("");
              onChange?.(result.value);
            } else if (isTemporaryNumericInput(nextDraft)) {
              setMessage("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <span className="numeric-input-unit">{inputProps.unitLabel}</span>
      </span>
      {message ? (
        <small className="numeric-input-message" id={messageId}>
          {message}
        </small>
      ) : null}
    </span>
  );
}
