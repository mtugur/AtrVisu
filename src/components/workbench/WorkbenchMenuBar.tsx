import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import type { CommandSurfaceMenu } from "../../workbench/commandSurfaces";

export type WorkbenchMenuBarProps = {
  menus: readonly CommandSurfaceMenu[];
  onExecute: (commandId: string) => void;
};

const findEnabledItem = (
  menu: CommandSurfaceMenu,
  startIndex: number,
  direction: 1 | -1
) => {
  for (let offset = 1; offset <= menu.items.length; offset += 1) {
    const index = (startIndex + direction * offset + menu.items.length) % menu.items.length;
    if (!menu.items[index]?.disabled) {
      return index;
    }
  }
  return startIndex;
};

export function WorkbenchMenuBar({ menus, onExecute }: WorkbenchMenuBarProps) {
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeMenu = (restoreFocus: boolean) => {
    const previousIndex = activeMenuIndex;
    setActiveMenuIndex(null);
    if (restoreFocus && previousIndex !== null) {
      queueMicrotask(() => menuButtonRefs.current[previousIndex]?.focus());
    }
  };

  const openMenu = (index: number, focusItem = false) => {
    const menu = menus[index];
    if (!menu) {
      return;
    }
    const firstEnabled = Math.max(0, menu.items.findIndex((item) => !item.disabled));
    setFocusedMenuIndex(index);
    setFocusedItemIndex(firstEnabled);
    setActiveMenuIndex(index);
    if (focusItem) {
      queueMicrotask(() => itemButtonRefs.current[firstEnabled]?.focus());
    }
  };

  useEffect(() => {
    if (activeMenuIndex === null) {
      return;
    }
    const handleOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [activeMenuIndex]);

  const moveMenuFocus = (direction: 1 | -1, keepOpen: boolean) => {
    const nextIndex = (focusedMenuIndex + direction + menus.length) % menus.length;
    setFocusedMenuIndex(nextIndex);
    menuButtonRefs.current[nextIndex]?.focus();
    if (keepOpen) {
      openMenu(nextIndex, true);
    }
  };

  const handleMenuKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    menuIndex: number
  ) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      openMenu(menuIndex, true);
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      moveMenuFocus(event.key === "ArrowRight" ? 1 : -1, activeMenuIndex !== null);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : menus.length - 1;
      setFocusedMenuIndex(nextIndex);
      menuButtonRefs.current[nextIndex]?.focus();
    } else if (event.key === "Escape" && activeMenuIndex !== null) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
  };

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    menuIndex: number,
    itemIndex: number
  ) => {
    const menu = menus[menuIndex];
    if (!menu) {
      return;
    }
    event.stopPropagation();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = findEnabledItem(menu, itemIndex, event.key === "ArrowDown" ? 1 : -1);
      setFocusedItemIndex(nextIndex);
      itemButtonRefs.current[nextIndex]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const scan = event.key === "Home" ? menu.items : [...menu.items].reverse();
      const offset = scan.findIndex((item) => !item.disabled);
      if (offset >= 0) {
        const nextIndex = event.key === "Home" ? offset : menu.items.length - 1 - offset;
        setFocusedItemIndex(nextIndex);
        itemButtonRefs.current[nextIndex]?.focus();
      }
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveMenuFocus(event.key === "ArrowRight" ? 1 : -1, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu(false);
    }
  };

  const handleMenuPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <nav
      ref={rootRef}
      className="workbench-menu-bar"
      aria-label="Application menus"
      data-testid="workbench-menu-bar"
      onPointerDown={handleMenuPointerDown}
    >
      {menus.map((menu, menuIndex) => (
        <div className="workbench-menu" key={menu.id}>
          <button
            ref={(node) => { menuButtonRefs.current[menuIndex] = node; }}
            type="button"
            className="workbench-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={activeMenuIndex === menuIndex}
            tabIndex={focusedMenuIndex === menuIndex ? 0 : -1}
            onFocus={() => setFocusedMenuIndex(menuIndex)}
            onClick={() => activeMenuIndex === menuIndex ? closeMenu(false) : openMenu(menuIndex)}
            onKeyDown={(event) => handleMenuKeyDown(event, menuIndex)}
          >
            {menu.label}
          </button>
          {activeMenuIndex === menuIndex ? (
            <div className="workbench-menu-popup" role="menu" aria-label={`${menu.label} menu`}>
              {menu.items.map((item, itemIndex) => (
                <button
                  key={item.commandId}
                  ref={(node) => { itemButtonRefs.current[itemIndex] = node; }}
                  type="button"
                  role="menuitem"
                  className="workbench-menu-item"
                  data-command-id={item.commandId}
                  disabled={item.disabled}
                  title={item.disabledReason ?? item.tooltip}
                  aria-label={item.disabledReason ? `${item.label}: ${item.disabledReason}` : item.label}
                  aria-pressed={item.pressed}
                  aria-busy={item.pending || undefined}
                  tabIndex={focusedItemIndex === itemIndex ? 0 : -1}
                  onClick={() => {
                    closeMenu(true);
                    onExecute(item.commandId);
                  }}
                  onKeyDown={(event) => handleItemKeyDown(event, menuIndex, itemIndex)}
                >
                  <span>{item.pending ? `${item.label}...` : item.label}</span>
                  {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
