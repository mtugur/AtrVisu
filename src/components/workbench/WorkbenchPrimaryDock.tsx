import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { PanelId } from "../../platform/contracts";

export type WorkbenchPrimaryDockItem = Readonly<{
  panelId: PanelId;
  label: string;
  content: ReactNode;
  badge?: string;
}>;

type WorkbenchPrimaryDockProps = {
  items: readonly WorkbenchPrimaryDockItem[];
  activePanelId: PanelId;
  collapsed: boolean;
  width: number;
  bottomInset: number;
  onActivate: (panelId: PanelId) => void;
  onToggleCollapsed: () => void;
};

export function WorkbenchPrimaryDock({
  items,
  activePanelId,
  collapsed,
  width,
  bottomInset,
  onActivate,
  onToggleCollapsed
}: WorkbenchPrimaryDockProps) {
  const activeItem = items.find((item) => item.panelId === activePanelId) ?? items[0];

  return (
    <aside
      className={`workbench-primary-dock${collapsed ? " is-collapsed" : ""}`}
      data-testid="primary-dock"
      data-app-shell-zone="machine-library"
      data-collapsed={collapsed ? "true" : "false"}
      aria-label="Primary Dock"
      style={{
        "--av-primary-dock-width": `${Math.max(220, width)}px`,
        "--av-primary-dock-bottom-inset": `${Math.max(0, bottomInset)}px`
      } as CSSProperties}
    >
      <nav className="workbench-activity-rail" aria-label="Primary Dock panels">
        {items.map((item) => (
          <button
            key={item.panelId}
            type="button"
            className={item.panelId === activeItem?.panelId ? "is-active" : undefined}
            data-testid={`primary-dock-tab-${item.panelId}`}
            aria-label={item.label}
            aria-pressed={item.panelId === activeItem?.panelId}
            title={item.label}
            onClick={() => onActivate(item.panelId)}
          >
            <span>{item.label}</span>
            {item.badge ? <small>{item.badge}</small> : null}
          </button>
        ))}
        <button
          type="button"
          className="workbench-dock-collapse"
          aria-label={collapsed ? "Expand Primary Dock" : "Collapse Primary Dock"}
          title={collapsed ? "Expand Primary Dock" : "Collapse Primary Dock"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? ">" : "<"}
        </button>
      </nav>
      <div className="workbench-primary-dock-content" hidden={collapsed}>
        <header>
          <strong>{activeItem?.label ?? "Primary Dock"}</strong>
        </header>
        <div className="workbench-primary-panel-stack">
          {items.map((item) => (
            <section
              key={item.panelId}
              className="workbench-primary-panel"
              data-panel-id={item.panelId}
              hidden={item.panelId !== activeItem?.panelId}
              aria-label={item.label}
            >
              {item.content}
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}
