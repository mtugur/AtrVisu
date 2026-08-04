import { useRef, useState, type KeyboardEvent } from "react";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";

export type WorkbenchCommandBarProps = {
  items: readonly CommandSurfaceItem[];
  onExecute: (commandId: string) => void;
};

const getEnabledIndex = (
  items: readonly CommandSurfaceItem[],
  startIndex: number,
  direction: 1 | -1
) => {
  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (startIndex + direction * offset + items.length) % items.length;
    if (!items[index]?.disabled) {
      return index;
    }
  }
  return startIndex;
};

export function WorkbenchCommandBar({ items, onExecute }: WorkbenchCommandBarProps) {
  const firstEnabledIndex = Math.max(0, items.findIndex((item) => !item.disabled));
  const [focusIndex, setFocusIndex] = useState(firstEnabledIndex);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAt = (index: number) => {
    setFocusIndex(index);
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (items.length === 0) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(getEnabledIndex(items, focusIndex, event.key === "ArrowRight" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
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
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.commandId}
          ref={(node) => { buttonRefs.current[index] = node; }}
          type="button"
          className="workbench-command-button"
          data-command-id={item.commandId}
          disabled={item.disabled}
          title={[item.tooltip, item.shortcut, item.disabledReason].filter(Boolean).join(" | ")}
          aria-label={item.disabledReason ? `${item.label}: ${item.disabledReason}` : item.label}
          aria-pressed={item.pressed}
          aria-busy={item.pending || undefined}
          tabIndex={index === focusIndex ? 0 : -1}
          onFocus={() => setFocusIndex(index)}
          onClick={() => onExecute(item.commandId)}
        >
          {item.pending ? `${item.label}...` : item.label}
        </button>
      ))}
    </div>
  );
}
