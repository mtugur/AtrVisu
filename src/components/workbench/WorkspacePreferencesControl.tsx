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
import { PreferenceDisclosureRow } from "./PreferenceDisclosureRow";

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

type PreferenceBranchId = "workspace" | "theme" | "density" | "visible-panels";

type PreferenceBranchDefinition = Readonly<{
  id: PreferenceBranchId;
  label: string;
  surfaceId: string;
  titleId: string;
  testId: string;
  flyoutTestId: string;
  drillInTestId: string;
  requestedWidth: number;
  requestedHeight: number;
}>;

const POPOVER_ID = "workspace-preferences-popover";
const READ_ONLY_DESCRIPTION_ID = "workspace-preferences-read-only-description";
const FLYOUT_VIEWPORT_MARGIN = 12;
const FLYOUT_GAP = 8;

const PREFERENCE_BRANCHES: readonly PreferenceBranchDefinition[] = Object.freeze([
  Object.freeze({
    id: "workspace",
    label: "Workspace",
    surfaceId: "workspace-preferences-workspace-surface",
    titleId: "workspace-preferences-workspace-title",
    testId: "workspace-preferences-workspace-trigger",
    flyoutTestId: "workspace-preferences-workspace-flyout",
    drillInTestId: "workspace-preferences-workspace-drill-in",
    requestedWidth: 300,
    requestedHeight: 190
  }),
  Object.freeze({
    id: "theme",
    label: "Theme",
    surfaceId: "workspace-preferences-theme-surface",
    titleId: "workspace-preferences-theme-title",
    testId: "workspace-preferences-theme-trigger",
    flyoutTestId: "workspace-preferences-theme-flyout",
    drillInTestId: "workspace-preferences-theme-drill-in",
    requestedWidth: 240,
    requestedHeight: 170
  }),
  Object.freeze({
    id: "density",
    label: "Density",
    surfaceId: "workspace-preferences-density-surface",
    titleId: "workspace-preferences-density-title",
    testId: "workspace-preferences-density-trigger",
    flyoutTestId: "workspace-preferences-density-flyout",
    drillInTestId: "workspace-preferences-density-drill-in",
    requestedWidth: 240,
    requestedHeight: 145
  }),
  Object.freeze({
    id: "visible-panels",
    label: "Visible Panels",
    surfaceId: "workspace-visible-panels-surface",
    titleId: "workspace-visible-panels-title",
    testId: "workspace-visible-panels-trigger",
    flyoutTestId: "workspace-visible-panels-flyout",
    drillInTestId: "workspace-visible-panels-drill-in",
    requestedWidth: 340,
    requestedHeight: 0
  })
]);

const getBranchDefinition = (branchId: PreferenceBranchId) =>
  PREFERENCE_BRANCHES.find(({ id }) => id === branchId)!;

const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);

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
  const branchTriggerRefs = useRef<Partial<Record<PreferenceBranchId, HTMLButtonElement>>>({});
  const focusChildOnOpenRef = useRef(false);
  const focusBranchOnCloseRef = useRef<PreferenceBranchId>();
  const {
    state: cascadeState,
    open: openCascade,
    close: closeCascade,
    closeRoot: closeCascadeRoot
  } = useCascadingFlyoutState();
  const activeBranchId = cascadeState.openPath[0] as PreferenceBranchId | undefined;
  const activeBranch = activeBranchId ? getBranchDefinition(activeBranchId) : undefined;
  const visiblePanelCount = panelOptions.filter((option) => option.visible).length;
  const branchSummaries: Readonly<Record<PreferenceBranchId, string>> = {
    workspace: activeWorkspaceLabel,
    theme: titleCase(theme),
    density: titleCase(density),
    "visible-panels": `${visiblePanelCount}/${panelOptions.length}`
  };

  const closeRoot = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    closeCascadeRoot();
    setFlyoutGeometry(undefined);
    focusBranchOnCloseRef.current = undefined;
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, [closeCascadeRoot]);

  const closeActiveBranch = useCallback((restoreFocus = true) => {
    if (activeBranchId && restoreFocus) {
      focusBranchOnCloseRef.current = activeBranchId;
    }
    closeCascade(1);
    setFlyoutGeometry(undefined);
  }, [activeBranchId, closeCascade]);

  const resolveBranchPresentation = useCallback((branchId: PreferenceBranchId) => {
    const popover = popoverRef.current;
    const branchTrigger = branchTriggerRefs.current[branchId];
    if (!popover || !branchTrigger) {
      return;
    }
    const branch = getBranchDefinition(branchId);
    const popoverRect = popover.getBoundingClientRect();
    const branchRect = branchTrigger.getBoundingClientRect();
    const requestedHeight = branchId === "visible-panels"
      ? 96 + (panelOptions.length * 42)
      : branch.requestedHeight + (readOnly ? 84 : 0);
    const geometry = resolveCascadingFlyoutGeometry({
      anchorRect: {
        ...toFlyoutRect(branchRect),
        left: popoverRect.left,
        right: popoverRect.right,
        width: popoverRect.width
      },
      requestedWidth: branch.requestedWidth,
      requestedHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      viewportMargin: FLYOUT_VIEWPORT_MARGIN,
      gap: FLYOUT_GAP
    });
    setFlyoutGeometry(geometry);
    setPresentation(geometry.sideBySideViable ? "flyout" : "drill-in");
  }, [panelOptions.length, readOnly]);

  const openBranch = useCallback((branchId: PreferenceBranchId, moveFocus = false) => {
    resolveBranchPresentation(branchId);
    focusChildOnOpenRef.current = moveFocus;
    openCascade(1, branchId);
  }, [openCascade, resolveBranchPresentation]);

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
    if (!activeBranchId) {
      return;
    }
    const handleResize = () => resolveBranchPresentation(activeBranchId);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeBranchId, resolveBranchPresentation]);

  useLayoutEffect(() => {
    if (!activeBranch || !focusChildOnOpenRef.current) {
      return;
    }
    focusChildOnOpenRef.current = false;
    const childSurface = rootRef.current?.querySelector<HTMLElement>(`#${activeBranch.surfaceId}`);
    const firstEnabledControl = childSurface?.querySelector<HTMLInputElement>('input:not(:disabled)');
    (firstEnabledControl ?? childSurface)?.focus();
  }, [activeBranch, presentation]);

  useLayoutEffect(() => {
    const branchId = focusBranchOnCloseRef.current;
    if (activeBranchId || !isOpen || !branchId) {
      return;
    }
    focusBranchOnCloseRef.current = undefined;
    branchTriggerRefs.current[branchId]?.focus();
  }, [activeBranchId, isOpen]);

  const handlePopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    if (activeBranchId) {
      closeActiveBranch();
      return;
    }
    closeRoot(true);
  };

  const handleBranchKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    branchId: PreferenceBranchId
  ) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      openBranch(branchId, true);
    }
  };

  const handleChildKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape" || event.key === "ArrowLeft") {
      event.preventDefault();
      closeActiveBranch();
    }
  };

  const stopPointerPropagation = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const renderReadOnlyMessage = () => readOnly ? (
    <p
      id={READ_ONLY_DESCRIPTION_ID}
      className="workspace-preferences-read-only-message"
      role="status"
      data-testid="workspace-preferences-read-only-message"
    >
      {readOnlyReason}
    </p>
  ) : null;

  const renderWorkspaceControls = () => (
    <fieldset className="workspace-preferences-group" disabled={readOnly} aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}>
      <legend>Workspace options</legend>
      <label>
        <input
          type="radio"
          name="workspace-preference"
          value="current-arrangement"
          checked={!activeWorkspaceId}
          disabled={readOnly}
          onChange={() => {
            if (!readOnly) onSelectCurrentArrangement();
          }}
        />
        <span>Custom Workspace</span>
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
              if (!readOnly) onSelectWorkspace(option.id);
            }}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );

  const renderThemeControls = () => (
    <fieldset className="workspace-preferences-group" disabled={readOnly} aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}>
      <legend>Theme options</legend>
      {(["system", "dark", "light"] as const).map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="theme-preference"
            value={option}
            checked={theme === option}
            disabled={readOnly}
            onChange={() => {
              if (!readOnly) onSelectTheme(option);
            }}
          />
          <span>{titleCase(option)}</span>
        </label>
      ))}
    </fieldset>
  );

  const renderDensityControls = () => (
    <fieldset className="workspace-preferences-group" disabled={readOnly} aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}>
      <legend>Density options</legend>
      {(["comfortable", "compact"] as const).map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="density-preference"
            value={option}
            checked={density === option}
            disabled={readOnly}
            onChange={() => {
              if (!readOnly) onSelectDensity(option);
            }}
          />
          <span>{titleCase(option)}</span>
        </label>
      ))}
    </fieldset>
  );

  const renderVisiblePanelsControls = () => (
    <fieldset className="workspace-preferences-group workspace-visible-panels-list" aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}>
      <legend>Panel visibility</legend>
      {panelOptions.map((option) => {
        const descriptionId = getPanelAvailabilityDescriptionId(option.id);
        return (
          <label key={option.id} title={option.unavailableReason}>
            <input
              type="checkbox"
              checked={option.visible}
              disabled={readOnly || !option.available}
              aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : !option.available && option.unavailableReason ? descriptionId : undefined}
              onChange={(event) => {
                if (!readOnly && option.available) onTogglePanel(option.id, event.currentTarget.checked);
              }}
            />
            <span>{option.label}</span>
            {!option.available && option.unavailableReason ? (
              <small id={descriptionId} className="workspace-preference-unavailable-reason">{option.unavailableReason}</small>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );

  const renderBranchControls = (branchId: PreferenceBranchId) => {
    switch (branchId) {
      case "workspace": return renderWorkspaceControls();
      case "theme": return renderThemeControls();
      case "density": return renderDensityControls();
      case "visible-panels": return renderVisiblePanelsControls();
    }
  };

  const renderRootPreferences = () => (
    <>
      <header className="workspace-preferences-heading">
        <strong id="workspace-preferences-title">Workspace &amp; View</strong>
      </header>
      {renderReadOnlyMessage()}
      <div className="workspace-preference-disclosure-list">
        {PREFERENCE_BRANCHES.map((branch) => (
          <PreferenceDisclosureRow
            key={branch.id}
            ref={(element) => {
              branchTriggerRefs.current[branch.id] = element ?? undefined;
            }}
            label={branch.label}
            summary={branchSummaries[branch.id]}
            expanded={activeBranchId === branch.id}
            controlsId={branch.surfaceId}
            testId={branch.testId}
            onClick={() => activeBranchId === branch.id
              ? closeActiveBranch(false)
              : openBranch(branch.id, false)}
            onKeyDown={(event) => handleBranchKeyDown(event, branch.id)}
          />
        ))}
      </div>
    </>
  );

  const renderDrillIn = (branch: PreferenceBranchDefinition) => (
    <div
      id={branch.surfaceId}
      className="workspace-preference-drill-in"
      role="group"
      aria-labelledby={branch.titleId}
      aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
      tabIndex={-1}
      data-testid={branch.drillInTestId}
      data-preference-branch={branch.id}
      data-cascading-depth="1"
      data-cascading-side="right"
      onKeyDown={handleChildKeyDown}
    >
      <header className="workspace-preferences-heading workspace-preference-drill-in-heading">
        <button type="button" className="workspace-preference-back" onClick={() => closeActiveBranch()}>
          <span aria-hidden="true">{`\u2039`}</span>
          Workspace &amp; View
        </button>
        <strong id={branch.titleId}>{branch.label}</strong>
      </header>
      {renderReadOnlyMessage()}
      {renderBranchControls(branch.id)}
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
        onClick={() => isOpen ? closeRoot(false) : setIsOpen(true)}
      >
        <span>Workspace</span>
        <strong>{activeWorkspaceLabel}</strong>
      </button>
      {isOpen ? (
        <div
          ref={popoverRef}
          id={POPOVER_ID}
          className={`workspace-preferences-popover${presentation === "drill-in" && activeBranch ? " is-drill-in" : ""}`}
          role="dialog"
          aria-labelledby={presentation === "drill-in" && activeBranch ? activeBranch.titleId : "workspace-preferences-title"}
          aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          data-testid="workspace-preferences-popover"
          data-cascading-presentation={presentation === "drill-in" && activeBranch ? "drill-in" : "root"}
          onKeyDown={handlePopoverKeyDown}
          onPointerDown={stopPointerPropagation}
        >
          {presentation === "drill-in" && activeBranch ? renderDrillIn(activeBranch) : renderRootPreferences()}
        </div>
      ) : null}
      {isOpen && activeBranch && presentation === "flyout" && flyoutGeometry ? (
        <CascadingFlyoutSurface
          id={activeBranch.surfaceId}
          depth={1}
          geometry={flyoutGeometry}
          className="workspace-preference-flyout"
          role="group"
          aria-labelledby={activeBranch.titleId}
          aria-describedby={readOnly ? READ_ONLY_DESCRIPTION_ID : undefined}
          tabIndex={-1}
          data-testid={activeBranch.flyoutTestId}
          data-preference-branch={activeBranch.id}
          onKeyDown={handleChildKeyDown}
          onPointerDown={stopPointerPropagation}
        >
          <header className="workspace-preference-flyout-heading">
            <strong id={activeBranch.titleId}>{activeBranch.label}</strong>
            <small>{branchSummaries[activeBranch.id]}</small>
          </header>
          {renderBranchControls(activeBranch.id)}
        </CascadingFlyoutSurface>
      ) : null}
    </div>
  );
}
