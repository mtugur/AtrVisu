import { useEffect, useMemo, useRef, useState } from "react";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";
import { WorkbenchIcon } from "../../workbench/icons";

export type CommandPaletteProps = {
  items: readonly CommandSurfaceItem[];
  onExecute: (commandId: string) => void;
  onClose: () => void;
};

export function CommandPalette({ items, onExecute, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? items.filter((item) => `${item.label} ${item.group ?? ""} ${item.commandId}`.toLocaleLowerCase().includes(normalized)) : items;
  }, [items, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIndex(0); }, [query]);

  const execute = (item: CommandSurfaceItem | undefined) => {
    if (!item || item.disabled) return;
    onExecute(item.commandId);
    onClose();
  };

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette" data-testid="command-palette" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setActiveIndex((current) => filtered.length ? (current + delta + filtered.length) % filtered.length : 0);
        }
        if (event.key === "Enter") { event.preventDefault(); execute(filtered[activeIndex]); }
      }}>
        <label className="command-palette-search">
          <WorkbenchIcon iconId="search" />
          <span className="visually-hidden">Search commands</span>
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands..." />
          <kbd>Esc</kbd>
        </label>
        <div className="command-palette-results" role="listbox" aria-label="Commands">
          {filtered.map((item, index) => (
            <button key={item.commandId} type="button" role="option" aria-selected={index === activeIndex} disabled={item.disabled} title={item.disabledReason} onMouseEnter={() => setActiveIndex(index)} onClick={() => execute(item)}>
              <span className="command-palette-item-label">{item.iconId ? <WorkbenchIcon iconId={item.iconId} /> : null}<strong>{item.label}</strong></span>
              <span>{item.disabledReason ?? item.shortcut ?? item.group ?? item.commandId}</span>
            </button>
          ))}
          {filtered.length === 0 ? <p>No matching commands.</p> : null}
        </div>
      </section>
    </div>
  );
}
