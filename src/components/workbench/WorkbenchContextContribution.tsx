import type { ReactNode } from "react";
import type { PanelId } from "../../platform/contracts";

export type WorkbenchContextContributionProps = {
  panelId: PanelId;
  title: string;
  children: ReactNode;
  badge?: string;
  expanded: boolean;
  visible: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function WorkbenchContextContribution({
  panelId,
  title,
  children,
  badge,
  expanded,
  visible,
  onExpandedChange
}: WorkbenchContextContributionProps) {
  if (!visible) {
    return null;
  }

  return (
    <section
      className="workbench-context-contribution"
      data-panel-id={panelId}
      data-testid={`contextual-panel-${panelId}`}
    >
      <button
        className="workbench-context-contribution-header"
        type="button"
        aria-expanded={expanded}
        data-testid={`contextual-panel-toggle-${panelId}`}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span aria-hidden="true">{expanded ? "-" : "+"}</span>
        <strong>{title}</strong>
        {badge ? <small>{badge}</small> : null}
      </button>
      {expanded ? (
        <div className="workbench-context-contribution-body">{children}</div>
      ) : null}
    </section>
  );
}
