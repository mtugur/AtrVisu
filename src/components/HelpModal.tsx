import { useEffect, useState } from "react";
import { ATRVISU_APPLICATION_VERSION } from "../applicationVersion";
import { useModalFocus } from "./common/useModalFocus";

export type HelpSection = "quick-start" | "shortcuts" | "about";

type HelpModalProps = {
  initialSection: HelpSection;
  onClose: () => void;
};

const sections: readonly { id: HelpSection; label: string }[] = [
  { id: "quick-start", label: "Quick Start" },
  { id: "shortcuts", label: "Keyboard Shortcuts" },
  { id: "about", label: "About AtrVisu" }
];

export function HelpModal({ initialSection, onClose }: HelpModalProps) {
  const [section, setSection] = useState(initialSection);
  const dialogRef = useModalFocus<HTMLElement>(onClose);

  useEffect(() => setSection(initialSection), [initialSection]);

  return (
    <div className="manager-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="manager-dialog help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        tabIndex={-1}
        data-testid="help-modal"
      >
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2 id="help-dialog-title">Help</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Help">Close</button>
        </header>
        <div className="help-dialog-layout">
          <nav className="help-dialog-nav" aria-label="Help sections">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="help-dialog-content" tabIndex={0}>
            {section === "quick-start" ? (
              <article>
                <h3>Quick Start</h3>
                <ol>
                  <li>Use the central Start surface to create or open a layout. When recovery exists, resume or explicitly discard it there.</li>
                  <li>Add equipment from Library, then place it in the scene.</li>
                  <li>Select objects in the scene or Explorer, press F2 to rename, and edit their properties in Inspector.</li>
                  <li>Use the grouped Engineering Command Strip for frequent Project, History, Selection, Display, Precision, and Arrange commands.</li>
                  <li>Use Arrange for common alignment and grouping; open Selection Tools for advanced alignment, distribution, equal-gap, and connection-point snap work.</li>
                  <li>Open Measurement Helpers for distance and placement readouts.</li>
                  <li>Use Viewpoints to open, close, or restore the saved-viewpoint Bottom Dock.</li>
                  <li>Create BOM, PDF, and PNG deliverables from Commercial Outputs.</li>
                </ol>
                <p>Product rule: every user-visible command, workflow, or shortcut change must update Help in the same pull request.</p>
              </article>
            ) : null}
            {section === "shortcuts" ? (
              <article>
                <h3>Keyboard Shortcuts</h3>
                <dl className="help-shortcut-list">
                  <div><dt>Undo</dt><dd>Ctrl/Cmd+Z</dd></div>
                  <div><dt>Redo</dt><dd>Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z</dd></div>
                  <div><dt>Duplicate selected</dt><dd>Ctrl/Cmd+D</dd></div>
                  <div><dt>Delete selected</dt><dd>Delete</dd></div>
                  <div><dt>Rename selected</dt><dd>F2</dd></div>
                  <div><dt>Clear selection</dt><dd>Escape</dd></div>
                  <div><dt>Nudge selection</dt><dd>Arrow keys</dd></div>
                </dl>
              </article>
            ) : null}
            {section === "about" ? (
              <article>
                <h3>About AtrVisu</h3>
                <p>AtrVisu is Atara Makine&apos;s industrial layout, engineering review, and commercial-output workbench.</p>
                <p>Version {ATRVISU_APPLICATION_VERSION}</p>
              </article>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
