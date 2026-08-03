import { Fragment, cloneElement, isValidElement, type ReactNode } from "react";
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
  editorRightInset?: number;
};

const withWorkbenchRegion = (node: ReactNode, region: string): ReactNode => {
  if (
    !isValidElement<{ "data-workbench-region"?: string }>(node)
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
  editorRightInset = 0
}: WorkbenchShellProps) {
  return (
    <AppShell
      beforeViewport={(
        <>
          {withWorkbenchRegion(applicationBar, "application-bar")}
          {withWorkbenchRegion(menuBar, "menu-bar")}
          {withWorkbenchRegion(commandBar, "command-bar")}
          {withWorkbenchRegion(primaryDock, "primary-dock")}
        </>
      )}
      viewport={editorHost}
      viewportRightInset={editorRightInset}
      viewportWorkbenchRegion="editor-host"
      rightPanel={secondaryDock}
      rightPanelWorkbenchRegion="secondary-dock"
      afterRightPanel={(
        <>
          {withWorkbenchRegion(bottomDock, "bottom-dock")}
          {withWorkbenchRegion(statusBar, "status-bar")}
        </>
      )}
      modalLayer={overlayLayer}
      modalLayerWorkbenchRegion="overlay-layer"
      diagnostics={diagnostics}
    />
  );
}
