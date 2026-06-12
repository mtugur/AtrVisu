import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type PanelSectionProps = {
  storageKey: string;
  title: string;
  defaultExpanded: boolean;
  children: ReactNode;
  badge?: string;
  expandSignal?: string | number | null;
};

export function PanelSection({
  storageKey,
  title,
  defaultExpanded,
  children,
  badge,
  expandSignal
}: PanelSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const savedValue = window.localStorage.getItem(storageKey);
      return savedValue === null ? defaultExpanded : savedValue === "expanded";
    } catch {
      return defaultExpanded;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, isExpanded ? "expanded" : "collapsed");
    } catch {
      // UI preferences are best-effort only.
    }
  }, [isExpanded, storageKey]);

  useEffect(() => {
    if (expandSignal) {
      setIsExpanded(true);
      window.requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  }, [expandSignal]);

  return (
    <section className="panel-section" ref={sectionRef}>
      <button
        className="panel-section-header"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
        <strong>{title}</strong>
        {badge ? <small>{badge}</small> : null}
      </button>
      {isExpanded ? <div className="panel-section-body">{children}</div> : null}
    </section>
  );
}
