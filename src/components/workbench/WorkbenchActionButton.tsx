import type { ButtonHTMLAttributes } from "react";
import { WorkbenchIcon, type WorkbenchIconId } from "../../workbench/icons";

type WorkbenchActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "title"
> & {
  iconId: WorkbenchIconId;
  label: string;
  visibleLabel?: string;
  tone?: "default" | "danger";
};

export function WorkbenchActionButton({
  iconId,
  label,
  visibleLabel,
  tone = "default",
  className,
  children,
  type = "button",
  ...buttonProps
}: WorkbenchActionButtonProps) {
  const classes = [
    "workbench-action-button",
    visibleLabel ? "has-label" : "is-icon-only",
    tone === "danger" ? "danger-action" : "",
    className ?? ""
  ].filter(Boolean).join(" ");

  return (
    <button
      {...buttonProps}
      className={classes}
      type={type}
      aria-label={label}
      title={label}
    >
      <WorkbenchIcon iconId={iconId} />
      {visibleLabel ? <span>{visibleLabel}</span> : null}
      {children}
    </button>
  );
}
