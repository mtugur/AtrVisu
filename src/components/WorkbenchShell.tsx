import { Fragment, cloneElement, isValidElement, type ReactNode } from "react";
import {
  WORKBENCH_REGION_IDS,
  type WorkbenchRegionId,
  type WorkspaceInspectorMode
} from "../platform/contracts";
import { AppShell } from "./AppShell";

export type WorkbenchShellProps = {
  applicationBar?: ReactNode;
  menuBar?: ReactNode;
  commandBar?: ReactNode;
  primaryDock?: ReactNode;
  editorHost: ReactNode;
  secondaryDock?: ReactNode;
  bottomDock?: ReactNode;
  statusBar?: ReactNode;
  overlayLayer?: ReactNode;
  diagnostics?: ReactNode;
  editorLeftInset?: number;
  editorRightInset?: number;
  editorBottomInset?: number;
  workspaceInspectorMode?: WorkspaceInspectorMode;
};

export const WORKBENCH_CHROME_TOP_INSET = "var(--av-workbench-top-inset)";

type WorkbenchShellRegionSlot = Exclude<
  keyof WorkbenchShellProps,
  "diagnostics" | "editorLeftInset" | "editorRightInset" | "editorBottomInset" | "workspaceInspectorMode"
>;
type CanonicalWorkbenchRegionId = (typeof WORKBENCH_REGION_IDS)[number];

export const WORKBENCH_SHELL_REGION_BY_SLOT = Object.freeze({
  applicationBar: "application-bar",
  menuBar: "menu-bar",
  commandBar: "command-bar",
  primaryDock: "primary-dock",
  editorHost: "editor-host",
  secondaryDock: "secondary-dock",
  bottomDock: "bottom-dock",
  statusBar: "status-bar",
  overlayLayer: "overlay-layer"
} as const satisfies Record<WorkbenchShellRegionSlot, CanonicalWorkbenchRegionId>);

type AssertNoMissingRegion<T extends never> = T;
type WorkbenchShellMissingRegion = AssertNoMissingRegion<Exclude<
  WorkbenchRegionId,
  (typeof WORKBENCH_SHELL_REGION_BY_SLOT)[WorkbenchShellRegionSlot]
>>;

const withWorkbenchRegion = (
  node: ReactNode,
  region: WorkbenchRegionId
): ReactNode => {
  if (
    !isValidElement<{ "data-workbench-region"?: WorkbenchRegionId }>(node)
    || node.type === Fragment
  ) {
    return node;
  }
  return cloneElement(node, { "data-workbench-region": region });
};

export function WorkbenchShell({
  applicationBar,
  menuBar,
  commandBar,
  primaryDock,
  editorHost,
  secondaryDock,
  bottomDock,
  statusBar,
  overlayLayer,
  diagnostics,
  editorLeftInset = 0,
  editorRightInset = 0,
  editorBottomInset = 0,
  workspaceInspectorMode
}: WorkbenchShellProps) {
  return (
    <AppShell
      beforeViewport={(
        <>
          {withWorkbenchRegion(applicationBar, WORKBENCH_SHELL_REGION_BY_SLOT.applicationBar)}
          {withWorkbenchRegion(menuBar, WORKBENCH_SHELL_REGION_BY_SLOT.menuBar)}
          {withWorkbenchRegion(commandBar, WORKBENCH_SHELL_REGION_BY_SLOT.commandBar)}
          {withWorkbenchRegion(primaryDock, WORKBENCH_SHELL_REGION_BY_SLOT.primaryDock)}
        </>
      )}
      viewport={editorHost}
      shellTopInset={WORKBENCH_CHROME_TOP_INSET}
      viewportLeftInset={editorLeftInset}
      viewportRightInset={editorRightInset}
      viewportBottomInset={editorBottomInset}
      viewportWorkbenchRegion={WORKBENCH_SHELL_REGION_BY_SLOT.editorHost}
      rightPanel={secondaryDock}
      rightPanelWorkbenchRegion={WORKBENCH_SHELL_REGION_BY_SLOT.secondaryDock}
      afterRightPanel={(
        <>
          {withWorkbenchRegion(bottomDock, WORKBENCH_SHELL_REGION_BY_SLOT.bottomDock)}
          {withWorkbenchRegion(statusBar, WORKBENCH_SHELL_REGION_BY_SLOT.statusBar)}
        </>
      )}
      modalLayer={overlayLayer}
      modalLayerWorkbenchRegion={WORKBENCH_SHELL_REGION_BY_SLOT.overlayLayer}
      diagnostics={diagnostics}
      workspaceInspectorMode={workspaceInspectorMode}
    />
  );
}
