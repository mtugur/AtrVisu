import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type PanelSectionProps = {
  storageKey: string;
  title: string;
  defaultExpanded: boolean;
  children: ReactNode;
  badge?: string;
};

export function PanelSection({
  storageKey,
  title,
  defaultExpanded,
  children,
  badge
}: PanelSectionProps) {
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

  return (
    <section className="panel-section">
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
