import type { ReactNode } from "react";

export type WorkbenchProjectContext = Readonly<{
  project: string;
  layout: string;
  revision: string;
}>;

export type WorkbenchApplicationBarProps = {
  workspaceControl?: ReactNode;
  hasUnsavedChanges: boolean;
  projectContext: WorkbenchProjectContext;
  onOpenCommandPalette: () => void;
};

export function WorkbenchApplicationBar({
  workspaceControl,
  hasUnsavedChanges,
  projectContext,
  onOpenCommandPalette
}: WorkbenchApplicationBarProps) {
  return (
    <header
      className="workbench-application-bar"
      aria-label="Application"
      data-testid="workbench-application-bar"
    >
      <strong className="workbench-product-name">AtrVisu</strong>
      <span className="workbench-product-context">Industrial Layout Workbench</span>
      {workspaceControl}
      <div className="workbench-project-session" aria-label="Project session">
        <div className="workbench-project-context" aria-label="Active project context">
          <span>{projectContext.project}</span>
          <span aria-hidden="true">/</span>
          <span>{projectContext.layout}</span>
          <span aria-hidden="true">/</span>
          <span>{projectContext.revision}</span>
        </div>
        <button
          className="workbench-command-search"
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Search commands"
          title="Search commands (Ctrl/Cmd+K)"
        >
          <span className="workbench-command-search-label">
            <span className="workbench-command-search-label-full">Search commands</span>
            <span className="workbench-command-search-label-compact" aria-hidden="true">Search</span>
          </span>
          <kbd>Ctrl+K</kbd>
        </button>
        <span className="workbench-unit-indicator">mm</span>
        <span className="workbench-save-state" data-dirty={hasUnsavedChanges ? "true" : "false"}>
          {hasUnsavedChanges ? "Unsaved" : "Saved"}
        </span>
      </div>
    </header>
  );
}
