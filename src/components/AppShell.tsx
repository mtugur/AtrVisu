import type { ReactNode } from "react";

type AppShellProps = {
  viewport?: ReactNode;
  rightPanel?: ReactNode;
  modalLayer?: ReactNode;
  diagnostics?: ReactNode;
  children?: ReactNode;
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
        {viewport}
        {rightPanel}
        {children}
      </main>
      {diagnostics}
      {modalLayer}
    </>
  );
}
