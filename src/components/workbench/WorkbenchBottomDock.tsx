import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { PanelId } from "../../platform/contracts";

export type WorkbenchBottomDockContribution = Readonly<{
  panelId: PanelId;
  label: string;
  content: ReactNode;
  badge?: string;
}>;

type WorkbenchBottomDockProps = {
  contributions: readonly WorkbenchBottomDockContribution[];
  activePanelId: PanelId;
  collapsed: boolean;
  expandedHeight: number;
  leftInset: number;
  rightInset: number;
  onActivate: (panelId: PanelId) => void;
  onToggleCollapsed: () => void;
};

export function WorkbenchBottomDock({
  contributions,
  activePanelId,
  collapsed,
  expandedHeight,
  leftInset,
  rightInset,
  onActivate,
  onToggleCollapsed
}: WorkbenchBottomDockProps) {
  const activeContribution = contributions.find((item) => item.panelId === activePanelId)
    ?? contributions[0];

  return (
    <section
      className={`workbench-bottom-dock${collapsed ? " is-collapsed" : ""}`}
      data-testid="bottom-dock"
      data-collapsed={collapsed ? "true" : "false"}
      aria-label="Bottom Dock"
      style={{
        "--av-bottom-dock-height": `${Math.max(120, expandedHeight)}px`,
        "--av-bottom-dock-left-inset": `${Math.max(0, leftInset)}px`,
        "--av-bottom-dock-right-inset": `${Math.max(0, rightInset)}px`
      } as CSSProperties}
    >
      <header className="workbench-bottom-dock-header">
        <nav aria-label="Bottom Dock contributions">
          {contributions.map((contribution) => (
            <button
              key={contribution.panelId}
              type="button"
              className={contribution.panelId === activeContribution?.panelId ? "is-active" : undefined}
              aria-pressed={contribution.panelId === activeContribution?.panelId}
              onClick={() => onActivate(contribution.panelId)}
            >
              {contribution.label}
              {contribution.badge ? <small>{contribution.badge}</small> : null}
            </button>
          ))}
        </nav>
        <button
          type="button"
          aria-label={collapsed ? "Expand Bottom Dock" : "Collapse Bottom Dock"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? "Open" : "Close"}
        </button>
      </header>
      <div className="workbench-bottom-dock-content" hidden={collapsed}>
        {contributions.map((contribution) => (
          <section
            key={contribution.panelId}
            data-panel-id={contribution.panelId}
            hidden={contribution.panelId !== activeContribution?.panelId}
          >
            {contribution.content}
          </section>
        ))}
      </div>
    </section>
  );
}
