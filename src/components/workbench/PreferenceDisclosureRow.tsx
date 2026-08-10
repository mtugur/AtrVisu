import { forwardRef, type KeyboardEventHandler } from "react";

export type PreferenceDisclosureRowProps = Readonly<{
  label: string;
  summary: string;
  expanded: boolean;
  controlsId: string;
  testId?: string;
  onClick: () => void;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
}>;

export const PreferenceDisclosureRow = forwardRef<HTMLButtonElement, PreferenceDisclosureRowProps>(
  function PreferenceDisclosureRow({
    label,
    summary,
    expanded,
    controlsId,
    testId,
    onClick,
    onKeyDown
  }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className="workspace-preference-disclosure-row"
        aria-label={`${label}: ${summary}`}
        aria-expanded={expanded}
        aria-controls={controlsId}
        data-testid={testId}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <span>{label}</span>
        <small>{summary}</small>
        <span className="workspace-preference-disclosure-chevron" aria-hidden="true">{`\u203A`}</span>
      </button>
    );
  }
);
