import { Fragment, cloneElement, isValidElement, type ReactNode } from "react";
import type { WorkbenchRegionId } from "../platform/contracts";

type EditorHostRegionId = Extract<WorkbenchRegionId, "editor-host">;
type SecondaryDockRegionId = Extract<WorkbenchRegionId, "secondary-dock">;
type OverlayLayerRegionId = Extract<WorkbenchRegionId, "overlay-layer">;

type AppShellProps = {
  beforeViewport?: ReactNode;
  viewport?: ReactNode;
  viewportRightInset?: number;
  viewportWorkbenchRegion?: EditorHostRegionId;
  rightPanel?: ReactNode;
  rightPanelWorkbenchRegion?: SecondaryDockRegionId;
  afterRightPanel?: ReactNode;
  modalLayer?: ReactNode;
  modalLayerWorkbenchRegion?: OverlayLayerRegionId;
  diagnostics?: ReactNode;
  children?: ReactNode;
};

type ShellAnchorProps = {
  "data-app-shell-zone"?: string;
  "data-workbench-region"?: WorkbenchRegionId;
};

const withZoneAnchor = (
  node: ReactNode,
  zone: string,
  workbenchRegion?: WorkbenchRegionId
): ReactNode => {
  if (!isValidElement<ShellAnchorProps>(node) || node.type === Fragment) {
    return node;
  }

  return cloneElement(node, {
    "data-app-shell-zone": zone,
    ...(workbenchRegion ? { "data-workbench-region": workbenchRegion } : {})
  });
};

export function AppShell({
  beforeViewport,
  viewport,
  viewportRightInset = 0,
  viewportWorkbenchRegion,
  rightPanel,
  rightPanelWorkbenchRegion,
  afterRightPanel,
  modalLayer,
  modalLayerWorkbenchRegion,
  diagnostics,
  children
}: AppShellProps) {
  return (
    <>
      <main className="app-shell" data-testid="app-root" data-app-shell-zone="app-root">
        {beforeViewport}
        <div
          className="scene-viewport-host"
          data-app-shell-zone="scene-viewport"
          {...(viewportWorkbenchRegion
            ? { "data-workbench-region": viewportWorkbenchRegion }
            : {})}
          style={{ right: `min(${Math.max(0, viewportRightInset)}px, calc(100vw - 28px))` }}
        >
          {viewport}
        </div>
        {withZoneAnchor(rightPanel, "machine-properties", rightPanelWorkbenchRegion)}
        {afterRightPanel}
        {children}
      </main>
      {diagnostics}
      {withZoneAnchor(modalLayer, "modal-layer", modalLayerWorkbenchRegion)}
    </>
  );
}
