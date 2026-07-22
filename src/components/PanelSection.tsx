import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type PanelSectionProps = {
  storageKey: string;
  title: string;
  defaultExpanded: boolean;
  children: ReactNode;
  badge?: string;
  expandSignal?: string | number | null;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export function PanelSection({
  storageKey,
  title,
  defaultExpanded,
  children,
  badge,
  expandSignal,
  expanded,
  onExpandedChange
}: PanelSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [internalExpanded, setInternalExpanded] = useState(() => {
    try {
      const savedValue = window.localStorage.getItem(storageKey);
      return savedValue === null ? defaultExpanded : savedValue === "expanded";
    } catch {
      return defaultExpanded;
    }
  });
  const isExpanded = expanded ?? internalExpanded;
  const setExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) {
      setInternalExpanded(nextExpanded);
    }
    onExpandedChange?.(nextExpanded);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, isExpanded ? "expanded" : "collapsed");
    } catch {
      // UI preferences are best-effort only.
    }
  }, [isExpanded, storageKey]);

  useEffect(() => {
    if (expandSignal) {
      setExpanded(true);
      window.requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
    // The signal is the event boundary; controlled state changes must not retrigger scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal]);

  return (
    <section className="panel-section" ref={sectionRef}>
      <button
        className="panel-section-header"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setExpanded(!isExpanded)}
      >
        <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
        <strong>{title}</strong>
        {badge ? <small>{badge}</small> : null}
      </button>
      {isExpanded ? <div className="panel-section-body">{children}</div> : null}
    </section>
  );
}
