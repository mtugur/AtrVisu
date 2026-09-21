import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { PanelId } from "../../platform/contracts";
import { WorkbenchIcon, type WorkbenchIconId } from "../../workbench/icons";
import { WorkbenchDockResizeHandle } from "./WorkbenchDockResizeHandle";
import { WorkbenchDockCollapseButton } from "./WorkbenchDockCollapseButton";

export type WorkbenchPrimaryDockItem = Readonly<{
  panelId: PanelId;
  label: string;
  iconId: WorkbenchIconId;
  content: ReactNode;
  badge?: string;
}>;

type WorkbenchPrimaryDockProps = {
  items: readonly WorkbenchPrimaryDockItem[];
  activePanelId: PanelId;
  collapsed: boolean;
  width: number;
  minWidth: number;
  maxWidth: number;
  resizeEnabled: boolean;
  bottomInset: number;
  onActivate: (panelId: PanelId) => void;
  onToggleCollapsed: () => void;
  onResize: (width: number) => void;
};

export function WorkbenchPrimaryDock({
  items,
  activePanelId,
  collapsed,
  width,
  minWidth,
  maxWidth,
  resizeEnabled,
  bottomInset,
  onActivate,
  onToggleCollapsed,
  onResize
}: WorkbenchPrimaryDockProps) {
  const activeItem = items.find((item) => item.panelId === activePanelId) ?? items[0];
  const accessibleLabel = (item: WorkbenchPrimaryDockItem) => {
    if (!item.badge) return item.label;
    const count = Number(item.badge);
    const unit = item.label === "Explorer"
      ? `entit${count === 1 ? "y" : "ies"}`
      : item.label === "Groups"
        ? `group${count === 1 ? "" : "s"}`
        : item.label === "Viewpoints"
          ? `saved viewpoint${count === 1 ? "" : "s"}`
          : `item${count === 1 ? "" : "s"}`;
    return `${item.label}, ${item.badge} ${unit}`;
  };

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
      <header className="workbench-primary-dock-header" hidden={collapsed}>
        <nav className="workbench-primary-dock-tabs" aria-label="Primary Dock panels">
          {items.map((item) => (
            <button
              key={item.panelId}
              type="button"
              aria-label={accessibleLabel(item)}
              title={accessibleLabel(item)}
              className={item.panelId === activeItem?.panelId ? "is-active" : undefined}
              data-testid={`primary-dock-tab-${item.panelId}`}
              aria-pressed={!collapsed && item.panelId === activeItem?.panelId}
              onClick={() => onActivate(item.panelId)}
            >
              <WorkbenchIcon iconId={item.iconId} />
              {item.badge ? <small aria-hidden="true">{item.badge}</small> : null}
            </button>
          ))}
        </nav>
        {!collapsed ? (
          <WorkbenchDockCollapseButton
            side="left"
            collapsed={false}
            onToggle={onToggleCollapsed}
            testId="primary-dock-collapse-toggle"
          />
        ) : null}
      </header>
      {collapsed ? (
        <div className="workbench-dock-reopen-control is-left">
          <WorkbenchDockCollapseButton
            side="left"
            collapsed
            label={`Open ${activeItem?.label ?? "Primary Dock"}`}
            onToggle={onToggleCollapsed}
            testId="primary-dock-collapse-toggle"
          />
        </div>
      ) : null}
      <div className="workbench-primary-dock-content" hidden={collapsed}>
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
      {!collapsed && resizeEnabled && maxWidth > minWidth ? (
        <WorkbenchDockResizeHandle
          axis="horizontal"
          label="Resize Primary Dock"
          testId="primary-dock-resize-handle"
          value={width}
          min={minWidth}
          max={maxWidth}
          onResize={onResize}
        />
      ) : null}
    </aside>
  );
}
