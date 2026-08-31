import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";
import { WorkbenchIcon } from "../../workbench/icons";

export type WorkbenchCommandBarProps = {
  items: readonly CommandSurfaceItem[];
  emphasizedCommandIds?: readonly string[];
  onExecute: (commandId: string) => void;
};

const COMPACT_DIRECT_IDS = new Set(["project.save", "edit.undo", "edit.redo"]);
const SEPARATOR_AFTER_IDS = new Set(["project.save", "edit.redo", "edit.deleteSelected"]);

const nextEnabledIndex = (items: readonly CommandSurfaceItem[], index: number, delta: 1 | -1) => {
  for (let offset = 1; offset <= items.length; offset += 1) {
    const candidate = (index + (offset * delta) + items.length) % items.length;
    if (!items[candidate]?.disabled) return candidate;
  }
  return -1;
};

const nearestEnabledIndex = (items: readonly CommandSurfaceItem[], index: number) => {
  for (let distance = 1; distance < items.length; distance += 1) {
    if (items[index + distance] && !items[index + distance]?.disabled) return index + distance;
    if (items[index - distance] && !items[index - distance]?.disabled) return index - distance;
  }
  return items.findIndex((item) => !item.disabled);
};

export function WorkbenchCommandBar({ items, emphasizedCommandIds = [], onExecute }: WorkbenchCommandBarProps) {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(max-width: 720px)").matches));
  const [overflowOpen, setOverflowOpen] = useState(false);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
  const directItems = compact ? items.filter((item) => COMPACT_DIRECT_IDS.has(item.commandId)) : items;
  const overflowItems = compact ? items.filter((item) => !COMPACT_DIRECT_IDS.has(item.commandId)) : [];
  const firstEnabled = directItems.findIndex((item) => !item.disabled);
  const [focusId, setFocusId] = useState(() => directItems[firstEnabled]?.commandId);
  const rawFocusIndex = directItems.findIndex((item) => item.commandId === focusId);
  const focusIndex = rawFocusIndex >= 0 && !directItems[rawFocusIndex]?.disabled
    ? rawFocusIndex
    : rawFocusIndex >= 0 ? nearestEnabledIndex(directItems, rawFocusIndex) : firstEnabled;

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => {
      setCompact(query.matches);
      if (!query.matches) setOverflowOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (focusIndex >= 0 && directItems[focusIndex]?.commandId !== focusId) {
      setFocusId(directItems[focusIndex]?.commandId);
    }
  }, [directItems, focusId, focusIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && overflowOpen) {
      event.preventDefault();
      event.stopPropagation();
      setOverflowOpen(false);
      requestAnimationFrame(() => overflowButtonRef.current?.focus());
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const next = event.key === "Home"
      ? firstEnabled
      : event.key === "End"
        ? [...directItems].map((item, index) => ({ item, index })).reverse().find(({ item }) => !item.disabled)?.index ?? -1
        : nextEnabledIndex(directItems, focusIndex, event.key === "ArrowRight" ? 1 : -1);
    if (next >= 0) {
      setFocusId(directItems[next]?.commandId);
      buttonRefs.current[next]?.focus();
    }
  };

  const commandButton = (item: CommandSurfaceItem, index: number, overflow = false) => (
    <button
      key={item.commandId}
      ref={overflow ? undefined : (node) => { buttonRefs.current[index] = node; }}
      type="button"
      className="workbench-command-button"
      data-command-id={item.commandId}
      data-icon-id={item.iconId}
      data-command-placement={overflow ? "overflow" : "direct"}
      data-workspace-emphasized={emphasizedCommandIds.includes(item.commandId) ? "true" : undefined}
      disabled={item.disabled}
      title={[item.tooltip, item.shortcut, item.disabledReason].filter(Boolean).join(" | ")}
      aria-label={item.disabledReason ? `${item.label}: ${item.disabledReason}` : item.label}
      aria-pressed={item.pressed}
      aria-busy={item.pending || undefined}
      tabIndex={overflow ? 0 : item.commandId === focusId && !item.disabled ? 0 : -1}
      onFocus={() => setFocusId(item.commandId)}
      onClick={() => { onExecute(item.commandId); if (overflow) setOverflowOpen(false); }}
    >
      {item.iconId ? <WorkbenchIcon iconId={item.iconId} /> : null}
      <span className={overflow ? "workbench-command-overflow-label" : "visually-hidden"}>{item.label}</span>
    </button>
  );

  return (
    <div className="workbench-command-bar" role="toolbar" aria-label="Quick Toolbar" data-testid="workbench-command-bar" data-app-shell-zone="top-toolbar" onKeyDown={handleKeyDown}>
      <div className="workbench-command-direct-actions">
        {directItems.map((item, index) => (
          <span className={SEPARATOR_AFTER_IDS.has(item.commandId) ? "workbench-command-slot has-separator" : "workbench-command-slot"} key={item.commandId}>
            {commandButton(item, index)}
          </span>
        ))}
      </div>
      {overflowItems.length > 0 ? (
        <div className="workbench-command-overflow">
          <button ref={overflowButtonRef} type="button" aria-label="More commands" aria-expanded={overflowOpen} onClick={() => setOverflowOpen((value) => !value)}>
            <WorkbenchIcon iconId="more" />
          </button>
          {overflowOpen ? <div className="workbench-command-overflow-menu">{overflowItems.map((item, index) => commandButton(item, index, true))}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
