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
      <div className={`empty-project-welcome-content${recoveryAvailable ? " has-recovery" : ""}`}>
        <span className="empty-project-product">AtrVisu</span>
        <h1 id="empty-project-title">{recoveryAvailable ? "Continue where you left off" : "Start a layout"}</h1>
        <p>
          {recoveryAvailable
            ? "Resume your unsaved layout or choose another project to continue."
            : "Create a new engineering layout or open an existing project."}
        </p>
        {recoveryAvailable ? (
          <div className="empty-project-recovery-status" role="status">
            <strong>Unsaved layout available</strong>
            <span>Your recovery remains available until you resume or discard it.</span>
          </div>
        ) : null}
        <div className="empty-project-welcome-actions">
          {recoveryAvailable ? (
            <button className="primary-action" type="button" onClick={onResumeRecovery}>
              Resume
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={onCreateNewLayout}>
              New Layout
            </button>
          )}
          <button type="button" onClick={onOpenExistingProject}>Open Project</button>
          {recoveryAvailable ? (
            <button type="button" onClick={onCreateNewLayout}>New Layout</button>
          ) : null}
        </div>
        {recoveryAvailable ? (
          <div className="empty-project-destructive-action">
            <button className="tertiary-action" type="button" onClick={onDiscardRecovery}>
              Discard recovery
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
