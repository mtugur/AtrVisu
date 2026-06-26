import { Fragment, cloneElement, isValidElement, type ReactNode } from "react";

type AppShellProps = {
  viewport?: ReactNode;
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
  rightPanel,
  modalLayer,
  diagnostics,
  children
}: AppShellProps) {
  return (
    <>
      <main className="app-shell" data-testid="app-root" data-app-shell-zone="app-root">
        {withZoneAnchor(viewport, "scene-viewport")}
        {withZoneAnchor(rightPanel, "machine-properties")}
        {children}
      </main>
      {diagnostics}
      {withZoneAnchor(modalLayer, "modal-layer")}
    </>
  );
}
