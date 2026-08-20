type EmptyProjectWelcomeProps = {
  onCreateNewLayout: () => void;
  onOpenExistingProject: () => void;
  recoveryAvailable?: boolean;
  onResumeRecovery?: () => void;
  onDiscardRecovery?: () => void;
};

export function EmptyProjectWelcome({
  onCreateNewLayout,
  onOpenExistingProject,
  recoveryAvailable = false,
  onResumeRecovery,
  onDiscardRecovery
}: EmptyProjectWelcomeProps) {
  return (
    <section className="empty-project-welcome" aria-labelledby="empty-project-title" data-testid="empty-project-welcome">
      <div className="empty-project-welcome-content">
        <span className="panel-kicker">AtrVisu Workbench</span>
        <h1 id="empty-project-title">{recoveryAvailable ? "Unsaved work found" : "Start a layout"}</h1>
        <p>
          {recoveryAvailable
            ? "Resume the recovered layout or choose another project workflow."
            : "Start a new sales layout or continue an existing AtrVisu project."}
        </p>
        <div className="empty-project-welcome-actions">
          {recoveryAvailable ? (
            <button className="primary-action" type="button" onClick={onResumeRecovery}>
              Resume Unsaved Layout
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={onCreateNewLayout}>
              Create New Layout
            </button>
          )}
          <button type="button" onClick={onOpenExistingProject}>Open Existing Project</button>
          {recoveryAvailable ? (
            <>
              <button type="button" onClick={onCreateNewLayout}>Create New Layout</button>
              <button className="tertiary-action" type="button" onClick={onDiscardRecovery}>
                Discard Unsaved Recovery
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
