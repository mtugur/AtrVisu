import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutViewpoint } from "../types/viewpoints";

type ViewpointsPanelProps = {
  viewpoints: LayoutViewpoint[];
  selectedViewpointId: string | null;
  onSelectViewpoint: (viewpointId: string | null) => void;
  onCaptureViewpoint: (name: string) => void;
  onApplyViewpoint: (viewpointId: string) => void;
  onUpdateViewpoint: (viewpointId: string) => void;
  onRenameViewpoint: (viewpointId: string, name: string) => void;
  onDeleteViewpoint: (viewpointId: string) => void;
  onStepViewpoint: (direction: "previous" | "next") => void;
};

type StripNavigationState = {
  hasOverflow: boolean;
  canScrollBackward: boolean;
  canScrollForward: boolean;
};

const initialStripNavigationState: StripNavigationState = {
  hasOverflow: false,
  canScrollBackward: false,
  canScrollForward: false
};

export function ViewpointsPanel({
  viewpoints,
  selectedViewpointId,
  onSelectViewpoint,
  onCaptureViewpoint,
  onApplyViewpoint,
  onUpdateViewpoint,
  onRenameViewpoint,
  onDeleteViewpoint,
  onStepViewpoint
}: ViewpointsPanelProps) {
  const [name, setName] = useState("");
  const [stripNavigation, setStripNavigation] = useState(initialStripNavigationState);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const selectedCardRef = useRef<HTMLButtonElement | null>(null);
  const selectedViewpoint = viewpoints.find((viewpoint) => viewpoint.id === selectedViewpointId) ?? null;

  const updateStripNavigation = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const overflowTolerance = 1;
    const hasOverflow = strip.scrollWidth > strip.clientWidth + overflowTolerance;
    const nextState = {
      hasOverflow,
      canScrollBackward: hasOverflow && strip.scrollLeft > overflowTolerance,
      canScrollForward: hasOverflow
        && strip.scrollLeft + strip.clientWidth < strip.scrollWidth - overflowTolerance
    };
    setStripNavigation((current) => (
      current.hasOverflow === nextState.hasOverflow
      && current.canScrollBackward === nextState.canScrollBackward
      && current.canScrollForward === nextState.canScrollForward
        ? current
        : nextState
    ));
  }, []);

  const revealSelectedCard = useCallback(() => {
    const strip = stripRef.current;
    const selectedCard = selectedCardRef.current;
    if (!strip || !selectedCard) {
      return;
    }
    const stripBounds = strip.getBoundingClientRect();
    const cardBounds = selectedCard.getBoundingClientRect();
    if (cardBounds.left < stripBounds.left) {
      strip.scrollLeft += cardBounds.left - stripBounds.left;
    } else if (cardBounds.right > stripBounds.right) {
      strip.scrollLeft += cardBounds.right - stripBounds.right;
    }
  }, []);

  const scrollStrip = useCallback((direction: "backward" | "forward") => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const distance = Math.max(156, Math.floor(strip.clientWidth * 0.8));
    strip.scrollBy({
      left: direction === "backward" ? -distance : distance,
      behavior: "smooth"
    });
  }, []);

  useEffect(() => {
    if (viewpoints.length === 0) {
      onSelectViewpoint(null);
    }
  }, [onSelectViewpoint, viewpoints.length]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) {
      return undefined;
    }
    let resizeFrameId: number | null = null;
    const handleScroll = () => updateStripNavigation();
    const handleResize = () => {
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        revealSelectedCard();
        updateStripNavigation();
      });
    };
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(handleResize);
    strip.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    resizeObserver?.observe(strip);
    handleResize();

    return () => {
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      resizeObserver?.disconnect();
      strip.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [revealSelectedCard, updateStripNavigation, viewpoints.length]);

  useEffect(() => {
    if (!selectedViewpointId) {
      updateStripNavigation();
      return undefined;
    }
    revealSelectedCard();
    const frameId = window.requestAnimationFrame(() => {
      revealSelectedCard();
      updateStripNavigation();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [revealSelectedCard, selectedViewpointId, updateStripNavigation, viewpoints.length]);

  return (
    <section className="viewpoints-panel" data-testid="viewpoints-panel" aria-label="Viewpoints">
      <div className="viewpoints-toolbar" data-testid="viewpoints-toolbar">
        <label className="property-field">
          <input
            data-testid="viewpoint-name-input"
            aria-label="Viewpoint Name"
            placeholder="Genel Gorunum"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          className="primary-action"
          data-testid="capture-viewpoint"
          type="button"
          aria-label="Capture Current View"
          title="Capture Current View"
          disabled={!name.trim()}
          onClick={() => {
            onCaptureViewpoint(name);
            setName("");
          }}
        >
          Capture
        </button>

        <div className="viewpoint-actions viewpoint-step-actions">
          <button
            type="button"
            aria-label="Previous Viewpoint"
            disabled={viewpoints.length === 0}
            onClick={() => onStepViewpoint("previous")}
          >
            Previous
          </button>
          <button
            type="button"
            aria-label="Next Viewpoint"
            disabled={viewpoints.length === 0}
            onClick={() => onStepViewpoint("next")}
          >
            Next
          </button>
        </div>
      </div>

      <div className="viewpoints-results" data-testid="viewpoints-results">
        <span className="viewpoint-saved-label">Saved</span>
        <div className="viewpoint-navigation" data-testid="viewpoint-navigation">
          {stripNavigation.hasOverflow ? (
            <button
              className="viewpoint-strip-scroll"
              data-testid="viewpoint-strip-scroll-backward"
              type="button"
              aria-label="Scroll saved viewpoints left"
              title="Scroll saved viewpoints left"
              disabled={!stripNavigation.canScrollBackward}
              onClick={() => scrollStrip("backward")}
            >
              &lt;
            </button>
          ) : null}
          <div
            className="viewpoint-strip"
            data-testid="viewpoint-strip"
            ref={stripRef}
            onWheel={(event) => {
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.preventDefault();
                event.currentTarget.scrollLeft += event.deltaY;
              }
            }}
          >
          <div className="viewpoint-list" aria-label="Saved viewpoints">
            {viewpoints.length > 0 ? viewpoints.map((viewpoint) => {
              const updatedAt = new Date(viewpoint.updatedAt).toLocaleString();
              return (
                <button
                  className={`viewpoint-list-item${viewpoint.id === selectedViewpointId ? " is-selected" : ""}`}
                  data-testid={`viewpoint-item-${viewpoint.id}`}
                  key={viewpoint.id}
                  type="button"
                  aria-pressed={viewpoint.id === selectedViewpointId}
                  aria-label={`${viewpoint.name}, updated ${updatedAt}`}
                  title={`${viewpoint.name} - Updated ${updatedAt}`}
                  ref={viewpoint.id === selectedViewpointId ? selectedCardRef : undefined}
                  onClick={() => onSelectViewpoint(viewpoint.id)}
                  onDoubleClick={() => onApplyViewpoint(viewpoint.id)}
                >
                  <strong>{viewpoint.name}</strong>
                </button>
              );
            }) : <p className="empty-selection">No viewpoints saved yet.</p>}
          </div>
          </div>
          {stripNavigation.hasOverflow ? (
            <button
              className="viewpoint-strip-scroll"
              data-testid="viewpoint-strip-scroll-forward"
              type="button"
              aria-label="Scroll saved viewpoints right"
              title="Scroll saved viewpoints right"
              disabled={!stripNavigation.canScrollForward}
              onClick={() => scrollStrip("forward")}
            >
              &gt;
            </button>
          ) : null}
        </div>

        {selectedViewpoint ? (
          <div
            className="viewpoint-actions viewpoint-context-actions"
            data-testid="viewpoint-context-actions"
            aria-label={`Actions for ${selectedViewpoint.name}`}
          >
              <button
                data-testid="apply-viewpoint"
                type="button"
                aria-label="Apply / Go To"
                title="Apply / Go To"
                onClick={() => onApplyViewpoint(selectedViewpoint.id)}
              >
                Apply
              </button>
              <button
                type="button"
                aria-label="Update From Current View"
                title="Update From Current View"
                onClick={() => onUpdateViewpoint(selectedViewpoint.id)}
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextName = window.prompt("Viewpoint name", selectedViewpoint.name);
                  if (nextName?.trim()) {
                    onRenameViewpoint(selectedViewpoint.id, nextName);
                  }
                }}
              >
                Rename
              </button>
              <button className="danger-action" type="button" onClick={() => onDeleteViewpoint(selectedViewpoint.id)}>
                Delete
              </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

