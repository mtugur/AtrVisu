import { useEffect, useState, type ReactNode } from "react";
import { ATRVISU_APPLICATION_VERSION } from "../applicationVersion";
import { WorkbenchIcon } from "../workbench/icons";
import { useModalFocus } from "./common/useModalFocus";

export type HelpSection =
  | "quick-start"
  | "workbench"
  | "arrange-snap"
  | "measurements"
  | "viewpoints"
  | "outputs"
  | "shortcuts"
  | "about";

type HelpModalProps = {
  initialSection: HelpSection;
  onClose: () => void;
};

const sections: readonly { id: HelpSection; label: string; iconId: string }[] = [
  { id: "quick-start", label: "Quick Start", iconId: "help" },
  { id: "workbench", label: "Workbench", iconId: "selection-tools" },
  { id: "arrange-snap", label: "Arrange & Snap", iconId: "connection-points" },
  { id: "measurements", label: "Measurements", iconId: "measurement" },
  { id: "viewpoints", label: "Viewpoints", iconId: "viewpoints" },
  { id: "outputs", label: "Outputs", iconId: "save" },
  { id: "shortcuts", label: "Keyboard Shortcuts", iconId: "keyboard" },
  { id: "about", label: "About", iconId: "info" }
];

const HelpTaskCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="help-task-card">
    <strong>{title}</strong>
    <p>{children}</p>
  </div>
);

const Shortcut = ({ action, children }: { action: string; children: ReactNode }) => (
  <div>
    <dt>{action}</dt>
    <dd>{children}</dd>
  </div>
);

export function HelpModal({ initialSection, onClose }: HelpModalProps) {
  const [section, setSection] = useState(initialSection);
  const dialogRef = useModalFocus<HTMLElement>(
    onClose,
    () => document.getElementById("workbench-menu-trigger-help")
  );

  useEffect(() => setSection(initialSection), [initialSection]);

  return (
    <div className="manager-backdrop" role="presentation">
      <section ref={dialogRef} className="manager-dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-dialog-title" tabIndex={-1} data-testid="help-modal">
        <header className="manager-header">
          <div><span className="panel-kicker">AtrVisu</span><h2 id="help-dialog-title">Help</h2></div>
          <button type="button" onClick={onClose} aria-label="Close Help">Close</button>
        </header>
        <div className="help-dialog-layout">
          <nav className="help-dialog-nav" aria-label="Help sections">
            {sections.map((item) => (
              <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>
                <WorkbenchIcon iconId={item.iconId} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="help-dialog-content" tabIndex={0}>
            {section === "quick-start" ? (
              <article><h3>Quick Start</h3><div className="help-task-grid">
                <HelpTaskCard title="1. Start or open a layout">Create a new layout, open an existing project, or resume unsaved work.</HelpTaskCard>
                <HelpTaskCard title="2. Add equipment">Search or browse Library, narrow the results with filters, then use Add to place equipment in the viewport.</HelpTaskCard>
                <HelpTaskCard title="3. Arrange and inspect">Select, move, align, rename, and review equipment properties.</HelpTaskCard>
                <HelpTaskCard title="4. Present and export">Capture viewpoints and create customer-ready workbook, plan, and image outputs.</HelpTaskCard>
              </div></article>
            ) : null}
            {section === "workbench" ? (
              <article><h3>Workbench</h3><dl className="help-feature-list">
                <div><dt>Library</dt><dd>Search assets, browse categories and families, and narrow results by source, category, or family. Use Favorites for equipment you want to keep handy, Recent for equipment you have added, and Add to place the selected asset.</dd></div>
                <div><dt>Explorer</dt><dd>Review layout items and control the current selection.</dd></div>
                <div><dt>Import 3D Asset</dt><dd>Use Library or Insert to choose a local GLB. Check the preview, choose model units and perpendicular forward/up axes, and set floor and footprint calibration. Enter a name and category, then Validate &amp; Save to Project Custom. Imported models are stored in this browser.</dd></div>
                <div><dt>Create Custom Variant</dt><dd>Use the copy action on a Library asset to create an editable Project Custom variant. The source remains unchanged. Edit the copy in Library Manager; copies of imported assets share the stored model.</dd></div>
                <div><dt>Viewport</dt><dd>Navigate and edit the 3D layout.</dd></div>
                <div><dt>Inspector</dt><dd>Edit properties for the current object or selection.</dd></div>
                <div><dt>Primary Dock</dt><dd>Switch between Library, Explorer, Layers, Groups, and Viewpoints without covering the layout.</dd></div>
                <div><dt>Bottom Dock</dt><dd>Reserved for future timeline and results utilities; it stays absent when no utility contributes content.</dd></div>
                <div><dt>Command Palette</dt><dd>Press Ctrl+K or Cmd+K to search available commands from anywhere in the workbench.</dd></div>
              </dl></article>
            ) : null}
            {section === "arrange-snap" ? (
              <article><h3>Arrange &amp; Snap</h3><p>Select two or more alignable objects to reveal the compact Arrange bar in the viewport. Use it for common edge, center, distribution, equal-gap, grouping, and ungrouping operations.</p><p>Advanced Alignment opens registered pair and anchor controls without expanding the contextual bar. When exactly two compatible machines are selected, Connect &amp; Snap opens beside the Arrange bar.</p></article>
            ) : null}
            {section === "measurements" ? (
              <article><h3>Measurements</h3><p>Precision Placement provides exact position, rotation, snap, and keyboard nudge settings in the Inspector and Tools menu.</p><p>Precision Placement is not the viewport Measure tool. Spatial measurement graphics are not yet available in this release.</p></article>
            ) : null}
            {section === "viewpoints" ? (
              <article><h3>Viewpoints</h3><p>Capture the current camera and display state, then Apply, Update, Rename, or Delete the selected viewpoint. Previous and Next move through saved viewpoints.</p><p>Use Viewpoints in the Primary Dock. The Viewpoints command opens that tab and closes the Primary Dock when the active tab is invoked again.</p></article>
            ) : null}
            {section === "outputs" ? (
              <article><h3>Outputs</h3><div className="help-task-grid">
                <HelpTaskCard title="Equipment Workbook (.xlsx)">Create a detailed equipment schedule and instance workbook.</HelpTaskCard>
                <HelpTaskCard title="Measured Layout Plan (.pdf)">Create a measured plan for engineering and customer review.</HelpTaskCard>
                <HelpTaskCard title="3D Presentation Image (.png)">Capture the current 3D view as a presentation image.</HelpTaskCard>
              </div></article>
            ) : null}
            {section === "shortcuts" ? (
              <article><h3>Keyboard Shortcuts</h3><dl className="help-shortcut-list">
                <Shortcut action="Undo"><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Z</kbd></Shortcut>
                <Shortcut action="Redo"><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Y</kbd> or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></Shortcut>
                <Shortcut action="Duplicate selected"><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>D</kbd></Shortcut>
                <Shortcut action="Delete selected"><kbd>Delete</kbd></Shortcut>
                <Shortcut action="Rename selected"><kbd>F2</kbd></Shortcut>
                <Shortcut action="Clear selection"><kbd>Escape</kbd></Shortcut>
                <Shortcut action="Search commands"><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd></Shortcut>
                <Shortcut action="Nudge selection"><kbd>Arrow keys</kbd></Shortcut>
              </dl></article>
            ) : null}
            {section === "about" ? (
              <article><h3>About AtrVisu</h3><p>AtrVisu is Atara Makine&apos;s industrial layout, engineering review, and commercial-output workbench.</p><p>Version {ATRVISU_APPLICATION_VERSION}</p></article>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
