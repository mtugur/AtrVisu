import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import type { DensityId, PanelId, ThemeId, WorkspaceId } from "../../platform/contracts";
import {
  CascadingFlyoutSurface,
  resolveCascadingFlyoutGeometry,
  useCascadingFlyoutState,
  type CascadingFlyoutGeometry,
  type CascadingFlyoutRect
} from "./cascading";

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
const VISIBLE_PANELS_BRANCH_ID = "visible-panels";
const VISIBLE_PANELS_SURFACE_ID = "workspace-visible-panels-surface";
const VISIBLE_PANELS_TITLE_ID = "workspace-visible-panels-title";
const FLYOUT_WIDTH = 340;
const FLYOUT_VIEWPORT_MARGIN = 12;
const FLYOUT_GAP = 8;

const getPanelAvailabilityDescriptionId = (panelId: PanelId) =>
  `workspace-panel-availability-${panelId.replace(/[^a-z0-9]+/gi, "-")}`;

const toFlyoutRect = (rect: DOMRect): CascadingFlyoutRect => ({
  left: rect.left,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height
});

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
  const [flyoutGeometry, setFlyoutGeometry] = useState<CascadingFlyoutGeometry>();
  const [presentation, setPresentation] = useState<"flyout" | "drill-in">("flyout");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const visiblePanelsTriggerRef = useRef<HTMLButtonElement>(null);
  const focusChildOnOpenRef = useRef(false);
  const focusBranchOnCloseRef = useRef(false);
  const {
    state: cascadeState,
    open: openCascade,
    close: closeCascade,
    closeRoot: closeCascadeRoot
  } = useCascadingFlyoutState();
  const isVisiblePanelsOpen = cascadeState.openPath[0] === VISIBLE_PANELS_BRANCH_ID;
  const visiblePanelCount = panelOptions.filter((option) => option.visible).length;

  const closeRoot = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    closeCascadeRoot();
    setFlyoutGeometry(undefined);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, [closeCascadeRoot]);

  const closeVisiblePanels = useCallback((restoreFocus = true) => {
    focusBranchOnCloseRef.current = restoreFocus;
    closeCascade(1);
    setFlyoutGeometry(undefined);
  }, [closeCascade]);

  const resolveVisiblePanelsPresentation = useCallback(() => {
    const popover = popoverRef.current;
    const branchTrigger = visiblePanelsTriggerRef.current;
    if (!popover || !branchTrigger) {
      return;
    }
    const popoverRect = popover.getBoundingClientRect();
    const branchRect = branchTrigger.getBoundingClientRect();
    const geometry = resolveCascadingFlyoutGeometry({
      anchorRect: {
        ...toFlyoutRect(branchRect),
        left: popoverRect.left,
        right: popoverRect.right,
        width: popoverRect.width
      },
      requestedWidth: FLYOUT_WIDTH,
      requestedHeight: 96 + (panelOptions.length * 42),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      viewportMargin: FLYOUT_VIEWPORT_MARGIN,
      gap: FLYOUT_GAP
    });
    setFlyoutGeometry(geometry);
    setPresentation(geometry.sideBySideViable ? "flyout" : "drill-in");
  }, [panelOptions.length]);

  const openVisiblePanels = useCallback((moveFocus = false) => {
    resolveVisiblePanelsPresentation();
    focusChildOnOpenRef.current = moveFocus;
    openCascade(1, VISIBLE_PANELS_BRANCH_ID);
  }, [openCascade, resolveVisiblePanelsPresentation]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeRoot(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [closeRoot, isOpen]);

  useEffect(() => {
    if (!isVisiblePanelsOpen) {
      return;
    }
    const handleResize = () => resolveVisiblePanelsPresentation();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isVisiblePanelsOpen, resolveVisiblePanelsPresentation]);

  useLayoutEffect(() => {
    if (!isVisiblePanelsOpen || !focusChildOnOpenRef.current) {
      return;
    }
    focusChildOnOpenRef.current = false;
    const childSurface = rootRef.current?.querySelector<HTMLElement>(`#${VISIBLE_PANELS_SURFACE_ID}`);
    const firstEnabledControl = childSurface?.querySelector<HTMLInputElement>('input:not(:disabled)');
    (firstEnabledControl ?? childSurface)?.focus();
  }, [isVisiblePanelsOpen, presentation]);

  useLayoutEffect(() => {
    if (isVisiblePanelsOpen || !isOpen || !focusBranchOnCloseRef.current) {
      return;
    }
    focusBranchOnCloseRef.current = false;
    visiblePanelsTriggerRef.current?.focus();
  }, [isOpen, isVisiblePanelsOpen]);

  const handlePopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    if (isVisiblePanelsOpen) {
      closeVisiblePanels();
      return;
    }
    closeRoot(true);
  };

  const handleVisiblePanelsTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      openVisiblePanels(true);
    }
  };

  const handleVisiblePanelsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape" || event.key === "ArrowLeft") {
      event.preventDefault();
      closeVisiblePanels();
    }
  };

  const stopPointerPropagation = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const renderVisiblePanelsControls = () => (
    <fieldset
      className="workspace-preferences-group workspace-visible-panels-list"
      aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
    >
      <legend>Panel visibility</legend>
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
  );

  const renderRootPreferences = () => (
    <>
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
      <button
        ref={visiblePanelsTriggerRef}
        type="button"
        className="workspace-visible-panels-trigger"
        aria-expanded={isVisiblePanelsOpen}
        aria-controls={VISIBLE_PANELS_SURFACE_ID}
        data-testid="workspace-visible-panels-trigger"
        onClick={() => {
          if (isVisiblePanelsOpen) {
            closeVisiblePanels(false);
          } else {
            openVisiblePanels(false);
          }
        }}
        onKeyDown={handleVisiblePanelsTriggerKeyDown}
      >
        <span>Visible Panels</span>
        <small>{visiblePanelCount}/{panelOptions.length}</small>
        <span className="workspace-visible-panels-chevron" aria-hidden="true">{`\u203A`}</span>
      </button>
    </>
  );

  const renderDrillIn = () => (
    <div
      id={VISIBLE_PANELS_SURFACE_ID}
      className="workspace-visible-panels-drill-in"
      role="group"
      aria-labelledby={VISIBLE_PANELS_TITLE_ID}
      tabIndex={-1}
      data-testid="workspace-visible-panels-drill-in"
      data-cascading-depth="1"
      data-cascading-side="right"
      onKeyDown={handleVisiblePanelsKeyDown}
    >
      <header className="workspace-preferences-heading workspace-visible-panels-drill-in-heading">
        <button
          type="button"
          className="workspace-visible-panels-back"
          onClick={() => closeVisiblePanels()}
        >
          <span aria-hidden="true">{`\u2039`}</span>
          Workspace &amp; View
        </button>
        <strong id={VISIBLE_PANELS_TITLE_ID}>Visible Panels</strong>
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
      {renderVisiblePanelsControls()}
    </div>
  );

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
        onClick={() => {
          if (isOpen) {
            closeRoot(false);
          } else {
            setIsOpen(true);
          }
        }}
      >
        <span>Workspace</span>
        <strong>{activeWorkspaceLabel}</strong>
      </button>
      {isOpen ? (
        <div
          ref={popoverRef}
          id={POPOVER_ID}
          className={`workspace-preferences-popover${presentation === "drill-in" && isVisiblePanelsOpen ? " is-drill-in" : ""}`}
          role="dialog"
          aria-labelledby={presentation === "drill-in" && isVisiblePanelsOpen
            ? VISIBLE_PANELS_TITLE_ID
            : "workspace-preferences-title"}
          aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          data-testid="workspace-preferences-popover"
          data-cascading-presentation={presentation === "drill-in" && isVisiblePanelsOpen ? "drill-in" : "root"}
          onKeyDown={handlePopoverKeyDown}
          onPointerDown={stopPointerPropagation}
        >
          {presentation === "drill-in" && isVisiblePanelsOpen
            ? renderDrillIn()
            : renderRootPreferences()}
        </div>
      ) : null}
      {isOpen && isVisiblePanelsOpen && presentation === "flyout" && flyoutGeometry ? (
        <CascadingFlyoutSurface
          id={VISIBLE_PANELS_SURFACE_ID}
          depth={1}
          geometry={flyoutGeometry}
          className="workspace-visible-panels-flyout"
          role="group"
          aria-labelledby={VISIBLE_PANELS_TITLE_ID}
          aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          tabIndex={-1}
          data-testid="workspace-visible-panels-flyout"
          onKeyDown={handleVisiblePanelsKeyDown}
          onPointerDown={stopPointerPropagation}
        >
          <header className="workspace-visible-panels-flyout-heading">
            <strong id={VISIBLE_PANELS_TITLE_ID}>Visible Panels</strong>
            <small>{visiblePanelCount}/{panelOptions.length}</small>
          </header>
          {renderVisiblePanelsControls()}
        </CascadingFlyoutSurface>
      ) : null}
    </div>
  );
}
