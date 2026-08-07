import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DensityId, PanelId, ThemeId, WorkspaceId } from "../../platform/contracts";

export type WorkspacePreferenceOption = Readonly<{
  id: WorkspaceId;
  label: string;
  tooltip?: string;
}>;

export type WorkspacePanelPreferenceOption = Readonly<{
  id: PanelId;
  label: string;
  visible: boolean;
  available: boolean;
  unavailableReason?: string;
}>;

export type WorkspacePreferencesControlProps = Readonly<{
  activeWorkspaceId?: WorkspaceId;
  activeWorkspaceLabel: string;
  workspaceOptions: readonly WorkspacePreferenceOption[];
  theme: ThemeId;
  density: DensityId;
  panelOptions: readonly WorkspacePanelPreferenceOption[];
  onSelectCurrentArrangement: () => void;
  onSelectWorkspace: (workspaceId: WorkspaceId) => void;
  onSelectTheme: (theme: ThemeId) => void;
  onSelectDensity: (density: DensityId) => void;
  onTogglePanel: (panelId: PanelId, visible: boolean) => void;
}>;

const POPOVER_ID = "workspace-preferences-popover";
const getPanelAvailabilityDescriptionId = (panelId: PanelId) =>
  `workspace-panel-availability-${panelId.replace(/[^a-z0-9]+/gi, "-")}`;

export function WorkspacePreferencesControl({
  activeWorkspaceId,
  activeWorkspaceLabel,
  workspaceOptions,
  theme,
  density,
  panelOptions,
  onSelectCurrentArrangement,
  onSelectWorkspace,
  onSelectTheme,
  onSelectDensity,
  onTogglePanel
}: WorkspacePreferencesControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const handlePopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const stopPointerPropagation = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="workspace-preferences-control" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="workspace-preferences-trigger"
        aria-label={`Workspace and view preferences. Current workspace: ${activeWorkspaceLabel}`}
        aria-expanded={isOpen}
        aria-controls={POPOVER_ID}
        aria-haspopup="dialog"
        data-testid="workspace-preferences-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Workspace</span>
        <strong>{activeWorkspaceLabel}</strong>
      </button>
      {isOpen ? (
        <div
          id={POPOVER_ID}
          className="workspace-preferences-popover"
          role="dialog"
          aria-labelledby="workspace-preferences-title"
          data-testid="workspace-preferences-popover"
          onKeyDown={handlePopoverKeyDown}
          onPointerDown={stopPointerPropagation}
        >
          <header className="workspace-preferences-heading">
            <strong id="workspace-preferences-title">Workspace &amp; View</strong>
          </header>
          <fieldset className="workspace-preferences-group">
            <legend>Workspace</legend>
            <label>
              <input
                type="radio"
                name="workspace-preference"
                value="current-arrangement"
                checked={!activeWorkspaceId}
                onChange={onSelectCurrentArrangement}
              />
              <span>Current arrangement</span>
            </label>
            {workspaceOptions.map((option) => (
              <label key={option.id} title={option.tooltip}>
                <input
                  type="radio"
                  name="workspace-preference"
                  value={option.id}
                  checked={activeWorkspaceId === option.id}
                  onChange={() => onSelectWorkspace(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="workspace-preferences-group">
            <legend>Theme</legend>
            {(["system", "dark", "light"] as const).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="theme-preference"
                  value={option}
                  checked={theme === option}
                  onChange={() => onSelectTheme(option)}
                />
                <span>{option[0].toUpperCase() + option.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="workspace-preferences-group">
            <legend>Density</legend>
            {(["comfortable", "compact"] as const).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="density-preference"
                  value={option}
                  checked={density === option}
                  onChange={() => onSelectDensity(option)}
                />
                <span>{option[0].toUpperCase() + option.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="workspace-preferences-group workspace-panel-preferences">
            <legend>Visible Panels</legend>
            {panelOptions.map((option) => {
              const descriptionId = getPanelAvailabilityDescriptionId(option.id);
              return (
                <label key={option.id} title={option.unavailableReason}>
                  <input
                    type="checkbox"
                    checked={option.visible}
                    disabled={!option.available}
                    aria-describedby={!option.available && option.unavailableReason
                      ? descriptionId
                      : undefined}
                    onChange={(event) => {
                      if (option.available) {
                        onTogglePanel(option.id, event.currentTarget.checked);
                      }
                    }}
                  />
                  <span>{option.label}</span>
                  {!option.available && option.unavailableReason ? (
                    <small
                      id={descriptionId}
                      className="workspace-preference-unavailable-reason"
                    >
                      {option.unavailableReason}
                    </small>
                  ) : null}
                </label>
              );
            })}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
