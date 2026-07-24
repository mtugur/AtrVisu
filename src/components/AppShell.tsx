import { Fragment, cloneElement, isValidElement, type ReactNode } from "react";

type AppShellProps = {
  viewport?: ReactNode;
  viewportRightInset?: number;
  rightPanel?: ReactNode;
  modalLayer?: ReactNode;
  diagnostics?: ReactNode;
  children?: ReactNode;
};

const withZoneAnchor = (node: ReactNode, zone: string): ReactNode => {
  if (!isValidElement<{ "data-app-shell-zone"?: string }>(node) || node.type === Fragment) {
    return node;
  }

  return cloneElement(node, { "data-app-shell-zone": zone });
};

export function AppShell({
  viewport,
  viewportRightInset = 0,
  rightPanel,
  modalLayer,
  diagnostics,
  children
}: AppShellProps) {
  return (
    <>
      <main className="app-shell" data-testid="app-root" data-app-shell-zone="app-root">
        <div
          className="scene-viewport-host"
          data-app-shell-zone="scene-viewport"
          style={{ right: `min(${Math.max(0, viewportRightInset)}px, calc(100vw - 28px))` }}
        >
          {viewport}
        </div>
        {withZoneAnchor(rightPanel, "machine-properties")}
        {children}
      </main>
      {diagnostics}
      {withZoneAnchor(modalLayer, "modal-layer")}
    </>
  );
}
