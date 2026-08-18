import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";
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
  const firstEnabledIndex = items.findIndex((item) => !item.disabled);
  const [focusedCommandId, setFocusedCommandId] = useState<string | undefined>(
    firstEnabledIndex >= 0 ? items[firstEnabledIndex]?.commandId : undefined
  );
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const currentItemIndex = items.findIndex((item) => item.commandId === focusedCommandId);
  const focusIndex = currentItemIndex >= 0 && !items[currentItemIndex]?.disabled
    ? currentItemIndex
    : -1;

  useLayoutEffect(() => {
    if (focusIndex >= 0) {
      return;
    }
    const nextIndex = currentItemIndex >= 0
      ? getNearestEnabledIndex(items, currentItemIndex)
      : items.findIndex((item) => !item.disabled);
    const nextCommandId = nextIndex >= 0 ? items[nextIndex]?.commandId : undefined;
    if (nextCommandId !== focusedCommandId) {
      setFocusedCommandId(nextCommandId);
    }
  }, [currentItemIndex, focusIndex, focusedCommandId, items]);

  const focusAt = (index: number) => {
    if (index < 0 || items[index]?.disabled) {
      return;
    }
    setFocusedCommandId(items[index]?.commandId);
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (items.length === 0) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      focusAt(getEnabledIndex(items, focusIndex, event.key === "ArrowRight" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      const scan = event.key === "Home" ? items : [...items].reverse();
      const offset = scan.findIndex((item) => !item.disabled);
      if (offset >= 0) {
        focusAt(event.key === "Home" ? offset : items.length - 1 - offset);
      }
    }
  };

  return (
    <div
      className="workbench-command-bar"
      role="toolbar"
      aria-label="Layout commands"
      data-testid="workbench-command-bar"
      data-app-shell-zone="top-toolbar"
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.commandId}
          ref={(node) => { buttonRefs.current[index] = node; }}
          type="button"
          className="workbench-command-button"
          data-command-id={item.commandId}
          data-icon-id={item.iconId}
          data-workspace-emphasized={emphasizedCommandIds.includes(item.commandId)
            ? "true"
            : undefined}
          disabled={item.disabled}
          title={[item.tooltip, item.shortcut, item.disabledReason].filter(Boolean).join(" | ")}
          aria-label={item.disabledReason ? `${item.label}: ${item.disabledReason}` : item.label}
          aria-pressed={item.pressed}
          aria-busy={item.pending || undefined}
          tabIndex={index === focusIndex && !item.disabled ? 0 : -1}
          onFocus={() => setFocusedCommandId(item.commandId)}
          onClick={() => onExecute(item.commandId)}
        >
          {item.iconId ? <WorkbenchIcon iconId={item.iconId} /> : null}
          <span className="visually-hidden">
            {item.pending ? `${item.label}...` : item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
