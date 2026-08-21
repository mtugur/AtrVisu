import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";
import {
  COMMAND_BAR_GROUP_DEFINITIONS,
  COMMAND_BAR_SHORT_LABELS
} from "../../workbench/commandSurfaces/commandSurfaceConfig";
import { WorkbenchIcon } from "../../workbench/icons";

export type WorkbenchCommandBarProps = {
  items: readonly CommandSurfaceItem[];
  emphasizedCommandIds?: readonly string[];
  onExecute: (commandId: string) => void;
};

const getEnabledIndex = (
  items: readonly CommandSurfaceItem[],
  startIndex: number,
  direction: 1 | -1
) => {
  if (items.length === 0) {
    return -1;
  }
  const normalizedStart = startIndex >= 0 ? startIndex : direction === 1 ? -1 : 0;
  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (normalizedStart + direction * offset + items.length) % items.length;
    if (!items[index]?.disabled) {
      return index;
    }
  }
  return -1;
};

const getNearestEnabledIndex = (
  items: readonly CommandSurfaceItem[],
  startIndex: number
) => {
  for (let distance = 1; distance < items.length; distance += 1) {
    const nextIndex = (startIndex + distance) % items.length;
    if (!items[nextIndex]?.disabled) {
      return nextIndex;
    }
    const previousIndex = (startIndex - distance + items.length) % items.length;
    if (!items[previousIndex]?.disabled) {
      return previousIndex;
    }
  }
  return -1;
};

export function WorkbenchCommandBar({
  items,
  emphasizedCommandIds = [],
  onExecute
}: WorkbenchCommandBarProps) {
  const [compactOverflow, setCompactOverflow] = useState(() =>
    typeof window !== "undefined" && Boolean(window.matchMedia?.("(max-width: 720px)").matches)
  );
  const [overflowOpen, setOverflowOpen] = useState(false);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const overflowSummaryRef = useRef<HTMLElement | null>(null);
  const groupedItems = COMMAND_BAR_GROUP_DEFINITIONS.map((group) => ({
    ...group,
    items: group.commandIds.flatMap((commandId) => {
      const index = items.findIndex((item) => item.commandId === commandId);
      return index >= 0 ? [{ item: items[index], index }] : [];
    })
  })).filter((group) => group.items.length > 0);
  const primaryGroups = compactOverflow
    ? groupedItems.filter((group) => group.id === "history")
    : groupedItems;
  const overflowGroups = compactOverflow
    ? groupedItems.filter((group) => group.id !== "history")
    : [];
  const directEntries = primaryGroups.flatMap((group) => group.items);
  const directItems = directEntries.map(({ item }) => item);
  const firstEnabledIndex = directItems.findIndex((item) => !item.disabled);
  const [focusedCommandId, setFocusedCommandId] = useState<string | undefined>(
    firstEnabledIndex >= 0 ? directItems[firstEnabledIndex]?.commandId : undefined
  );
  const currentItemIndex = directItems.findIndex((item) => item.commandId === focusedCommandId);
  const focusIndex = currentItemIndex >= 0 && !directItems[currentItemIndex]?.disabled
    ? currentItemIndex
    : -1;

  useLayoutEffect(() => {
    if (focusIndex >= 0) {
      return;
    }
    const nextIndex = currentItemIndex >= 0
      ? getNearestEnabledIndex(directItems, currentItemIndex)
      : directItems.findIndex((item) => !item.disabled);
    const nextCommandId = nextIndex >= 0 ? directItems[nextIndex]?.commandId : undefined;
    if (nextCommandId !== focusedCommandId) {
      setFocusedCommandId(nextCommandId);
    }
  }, [currentItemIndex, directItems, focusIndex, focusedCommandId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => {
      setCompactOverflow(query.matches);
      if (!query.matches) {
        setOverflowOpen(false);
      }
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const focusAt = (index: number) => {
    const entry = directEntries[index];
    if (!entry || entry.item.disabled) {
      return;
    }
    setFocusedCommandId(entry.item.commandId);
    buttonRefs.current[entry.index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.key === "Escape" && overflowOpen) {
      event.preventDefault();
      event.stopPropagation();
      setOverflowOpen(false);
      overflowSummaryRef.current?.focus();
      return;
    }
    if (compactOverflow && !target.closest('[data-command-placement="direct"]')) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.stopPropagation();
      }
      return;
    }
    if (directItems.length === 0) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      focusAt(getEnabledIndex(directItems, focusIndex, event.key === "ArrowRight" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      const scan = event.key === "Home" ? directItems : [...directItems].reverse();
      const offset = scan.findIndex((item) => !item.disabled);
      if (offset >= 0) {
        focusAt(event.key === "Home" ? offset : directItems.length - 1 - offset);
      }
    }
  };

  const renderCommandButton = (item: CommandSurfaceItem, index: number, overflow = false) => (
    <button
      key={item.commandId}
      ref={(node) => { buttonRefs.current[index] = node; }}
      type="button"
      className="workbench-command-button"
      data-command-id={item.commandId}
      data-command-placement={overflow ? "overflow" : "direct"}
      data-icon-id={item.iconId}
      data-workspace-emphasized={emphasizedCommandIds.includes(item.commandId)
        ? "true"
        : undefined}
      disabled={item.disabled}
      title={[item.tooltip, item.shortcut, item.disabledReason].filter(Boolean).join(" | ")}
      aria-label={item.disabledReason ? `${item.label}: ${item.disabledReason}` : item.label}
      aria-pressed={item.pressed}
      aria-busy={item.pending || undefined}
      tabIndex={overflow
        ? overflowOpen && !item.disabled ? 0 : -1
        : item.commandId === focusedCommandId && !item.disabled ? 0 : -1}
      onFocus={() => setFocusedCommandId(item.commandId)}
      onClick={() => {
        onExecute(item.commandId);
        if (overflow) {
          setOverflowOpen(false);
          overflowSummaryRef.current?.focus();
        }
      }}
    >
      {item.iconId ? <WorkbenchIcon iconId={item.iconId} /> : null}
      <span className={overflow ? "workbench-command-overflow-label" : "workbench-command-label"}>
        {item.pending
          ? `${overflow ? item.label : COMMAND_BAR_SHORT_LABELS[item.commandId] ?? item.label}...`
          : overflow ? item.label : COMMAND_BAR_SHORT_LABELS[item.commandId] ?? item.label}
      </span>
    </button>
  );

  return (
    <div
      className="workbench-command-bar"
      role="toolbar"
      aria-label="Layout commands"
      data-testid="workbench-command-bar"
      data-app-shell-zone="top-toolbar"
      onKeyDown={handleKeyDown}
    >
      {primaryGroups.map((group) => (
        <div className="workbench-command-group" role="group" aria-label={group.label} key={group.id}>
          <div className="workbench-command-group-actions">
            {group.items.map(({ item, index }) => renderCommandButton(item, index))}
          </div>
          <span className="workbench-command-group-label" aria-hidden="true">{group.label}</span>
        </div>
      ))}
      {overflowGroups.length > 0 ? (
        <details className="workbench-command-overflow" open={overflowOpen}>
          <summary
            ref={overflowSummaryRef}
            aria-label="More engineering commands"
            aria-expanded={overflowOpen}
            onClick={(event) => {
              event.preventDefault();
              setOverflowOpen((current) => !current);
            }}
          >
            More
          </summary>
          <div className="workbench-command-overflow-menu">
            {overflowGroups.map((group) => (
              <div className="workbench-command-overflow-group" role="group" aria-label={group.label} key={group.id}>
                <strong>{group.label}</strong>
                {group.items.map(({ item, index }) => renderCommandButton(item, index, true))}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
