import { WorkbenchIcon } from "../../workbench/icons";

type DockSide = "left" | "right" | "bottom";

export type WorkbenchDockCollapseButtonProps = {
  side: DockSide;
  collapsed: boolean;
  onToggle: () => void;
  testId?: string;
  label?: string;
};

const iconId = (side: DockSide, collapsed: boolean) => {
  if (side === "left") return collapsed ? "chevron-right" : "chevron-left";
  if (side === "right") return collapsed ? "chevron-left" : "chevron-right";
  return collapsed ? "chevron-up" : "chevron-down";
};

export function WorkbenchDockCollapseButton({ side, collapsed, onToggle, testId, label: customLabel }: WorkbenchDockCollapseButtonProps) {
  const dockName = side === "left" ? "Primary Dock" : side === "right" ? "Inspector" : "Bottom Dock";
  const label = customLabel ?? `${collapsed ? "Expand" : "Collapse"} ${dockName}`;
  return (
    <button className="workbench-dock-collapse-control" type="button" data-testid={testId} aria-label={label} title={label} onClick={onToggle}>
      <WorkbenchIcon iconId={iconId(side, collapsed)} />
    </button>
  );
}
