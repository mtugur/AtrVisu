type EmptyProjectWelcomeProps = {
  onCreateNewLayout: () => void;
  onOpenExistingProject: () => void;
};

export function EmptyProjectWelcome({
  onCreateNewLayout,
  onOpenExistingProject
}: EmptyProjectWelcomeProps) {
  return (
    <section className="empty-project-welcome" aria-labelledby="empty-project-title" data-testid="empty-project-welcome">
      <div className="empty-project-welcome-content">
        <span className="panel-kicker">AtrVisu Workbench</span>
        <h1 id="empty-project-title">Start a layout</h1>
        <p>Start a new sales layout or continue an existing AtrVisu project.</p>
        <div className="empty-project-welcome-actions">
          <button className="primary-action" type="button" onClick={onCreateNewLayout}>Create New Layout</button>
          <button type="button" onClick={onOpenExistingProject}>Open Existing Project</button>
        </div>
      </div>
    </section>
  );
}
