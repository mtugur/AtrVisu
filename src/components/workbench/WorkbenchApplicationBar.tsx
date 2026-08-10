import type { ReactNode } from "react";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";

export type WorkbenchProjectContext = Readonly<{
  project: string;
  layout: string;
  revision: string;
}>;

export type WorkbenchApplicationBarProps = {
  saveItem?: CommandSurfaceItem;
  workspaceControl?: ReactNode;
  emphasizedCommandIds?: readonly string[];
  hasUnsavedChanges: boolean;
  projectContext: WorkbenchProjectContext;
  onExecute: (commandId: string) => void;
};

export function WorkbenchApplicationBar({
  saveItem,
  workspaceControl,
  emphasizedCommandIds = [],
  hasUnsavedChanges,
  projectContext,
  onExecute
}: WorkbenchApplicationBarProps) {
  const saveTitle = saveItem?.disabledReason ?? saveItem?.tooltip;
  return (
    <header
      className="workbench-application-bar"
      aria-label="Application"
      data-testid="workbench-application-bar"
    >
      <strong className="workbench-product-name">AtrVisu</strong>
      {workspaceControl}
      <div className="workbench-project-session" aria-label="Project session">
        <div className="workbench-save-cluster">
          <span
            className="workbench-save-state"
            data-dirty={hasUnsavedChanges ? "true" : "false"}
          >
            {hasUnsavedChanges ? "Unsaved" : "Saved"}
          </span>
          {saveItem ? (
            <button
              type="button"
              className="workbench-save-command"
              data-command-id={saveItem.commandId}
              data-workspace-emphasized={emphasizedCommandIds.includes(saveItem.commandId)
                ? "true"
                : undefined}
              disabled={saveItem.disabled}
              aria-busy={saveItem.pending || undefined}
              aria-label={saveItem.disabledReason
                ? `${saveItem.label}: ${saveItem.disabledReason}`
                : saveItem.label}
              title={saveTitle}
              onClick={() => onExecute(saveItem.commandId)}
            >
              {saveItem.pending ? "Saving..." : saveItem.label}
            </button>
          ) : null}
        </div>
        <div className="workbench-project-context" aria-label="Active project context">
          <span>{projectContext.project}</span>
          <span aria-hidden="true">/</span>
          <span>{projectContext.layout}</span>
          <span aria-hidden="true">/</span>
          <span>{projectContext.revision}</span>
        </div>
      </div>
    </header>
  );
}
