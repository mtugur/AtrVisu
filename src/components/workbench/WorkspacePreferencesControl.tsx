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
  readOnly?: boolean;
  readOnlyReason?: string;
  onSelectCurrentArrangement: () => void;
  onSelectWorkspace: (workspaceId: WorkspaceId) => void;
  onSelectTheme: (theme: ThemeId) => void;
  onSelectDensity: (density: DensityId) => void;
  onTogglePanel: (panelId: PanelId, visible: boolean) => void;
}>;

const POPOVER_ID = "workspace-preferences-popover";
const READ_ONLY_DESCRIPTION_ID = "workspace-preferences-read-only-description";
const getPanelAvailabilityDescriptionId = (panelId: PanelId) =>
  `workspace-panel-availability-${panelId.replace(/[^a-z0-9]+/gi, "-")}`;

export function WorkspacePreferencesControl({
  activeWorkspaceId,
  activeWorkspaceLabel,
  workspaceOptions,
  theme,
  density,
  panelOptions,
  readOnly = false,
  readOnlyReason,
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
          aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          data-testid="workspace-preferences-popover"
          onKeyDown={handlePopoverKeyDown}
          onPointerDown={stopPointerPropagation}
        >
          <header className="workspace-preferences-heading">
            <strong id="workspace-preferences-title">Workspace &amp; View</strong>
          </header>
          {readOnly ? (
            <p
              id={READ_ONLY_DESCRIPTION_ID}
              className="workspace-preferences-read-only-message"
              role="status"
              data-testid="workspace-preferences-read-only-message"
            >
              {readOnlyReason}
            </p>
          ) : null}
          <fieldset
            className="workspace-preferences-group"
            disabled={readOnly}
            aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          >
            <legend>Workspace</legend>
            <label>
              <input
                type="radio"
                name="workspace-preference"
                value="current-arrangement"
                checked={!activeWorkspaceId}
                disabled={readOnly}
                onChange={() => {
                  if (!readOnly) {
                    onSelectCurrentArrangement();
                  }
                }}
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
                  disabled={readOnly}
                  onChange={() => {
                    if (!readOnly) {
                      onSelectWorkspace(option.id);
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset
            className="workspace-preferences-group"
            disabled={readOnly}
            aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          >
            <legend>Theme</legend>
            {(["system", "dark", "light"] as const).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="theme-preference"
                  value={option}
                  checked={theme === option}
                  disabled={readOnly}
                  onChange={() => {
                    if (!readOnly) {
                      onSelectTheme(option);
                    }
                  }}
                />
                <span>{option[0].toUpperCase() + option.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset
            className="workspace-preferences-group"
            disabled={readOnly}
            aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          >
            <legend>Density</legend>
            {(["comfortable", "compact"] as const).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="density-preference"
                  value={option}
                  checked={density === option}
                  disabled={readOnly}
                  onChange={() => {
                    if (!readOnly) {
                      onSelectDensity(option);
                    }
                  }}
                />
                <span>{option[0].toUpperCase() + option.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset
            className="workspace-preferences-group workspace-panel-preferences"
            aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          >
            <legend>Visible Panels</legend>
            {panelOptions.map((option) => {
              const descriptionId = getPanelAvailabilityDescriptionId(option.id);
              return (
                <label key={option.id} title={option.unavailableReason}>
                  <input
                    type="checkbox"
                    checked={option.visible}
                    disabled={readOnly || !option.available}
                    aria-describedby={readOnly
                      ? READ_ONLY_DESCRIPTION_ID
                      : !option.available && option.unavailableReason
                        ? descriptionId
                        : undefined}
                    onChange={(event) => {
                      if (!readOnly && option.available) {
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
