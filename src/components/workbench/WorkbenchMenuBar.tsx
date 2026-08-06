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

const findAdjacentItem = (
  menu: CommandSurfaceMenu,
  startIndex: number,
  direction: 1 | -1
) => {
  if (menu.items.length === 0) {
    return -1;
  }
  return (startIndex + direction + menu.items.length) % menu.items.length;
};

export function WorkbenchMenuBar({ menus, onExecute }: WorkbenchMenuBarProps) {
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const menuButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusItemOnOpenRef = useRef(false);

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
    const firstItemIndex = menu.items.length > 0 ? 0 : -1;
    setFocusedMenuIndex(index);
    setFocusedItemIndex(firstItemIndex);
    focusItemOnOpenRef.current = focusItem && firstItemIndex >= 0;
    setActiveMenuIndex(index);
  };

  useEffect(() => {
    if (activeMenuIndex === null || !focusItemOnOpenRef.current || focusedItemIndex < 0) {
      return;
    }
    focusItemOnOpenRef.current = false;
    itemButtonRefs.current[focusedItemIndex]?.focus();
  }, [activeMenuIndex, focusedItemIndex]);

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
      event.stopPropagation();
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
      const nextIndex = findAdjacentItem(menu, itemIndex, event.key === "ArrowDown" ? 1 : -1);
      if (nextIndex >= 0) {
        setFocusedItemIndex(nextIndex);
        itemButtonRefs.current[nextIndex]?.focus();
      }
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (menu.items.length > 0) {
        const nextIndex = event.key === "Home" ? 0 : menu.items.length - 1;
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
    } else if ((event.key === "Enter" || event.key === " ") && menu.items[itemIndex]?.disabled) {
      event.preventDefault();
    }
  };

  const activateItem = (menuIndex: number, itemIndex: number) => {
    const item = menus[menuIndex]?.items[itemIndex];
    if (!item || item.disabled) {
      return;
    }
    closeMenu(true);
    onExecute(item.commandId);
  };

  const handleMenuPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <nav
      ref={rootRef}
      className="workbench-menu-bar"
      role="menubar"
      aria-label="Application menus"
      data-testid="workbench-menu-bar"
      onPointerDown={handleMenuPointerDown}
    >
      {menus.map((menu, menuIndex) => (
        <div className="workbench-menu" key={menu.id}>
          <button
            ref={(node) => { menuButtonRefs.current[menuIndex] = node; }}
            type="button"
            id={`workbench-menu-trigger-${menu.id}`}
            className="workbench-menu-trigger"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={activeMenuIndex === menuIndex}
            aria-controls={`workbench-menu-popup-${menu.id}`}
            tabIndex={focusedMenuIndex === menuIndex ? 0 : -1}
            onFocus={() => setFocusedMenuIndex(menuIndex)}
            onClick={() => activeMenuIndex === menuIndex ? closeMenu(false) : openMenu(menuIndex)}
            onKeyDown={(event) => handleMenuKeyDown(event, menuIndex)}
          >
            {menu.fallbackLabel}
          </button>
          {activeMenuIndex === menuIndex ? (
            <div
              id={`workbench-menu-popup-${menu.id}`}
              className="workbench-menu-popup"
              role="menu"
              aria-labelledby={`workbench-menu-trigger-${menu.id}`}
            >
              {menu.items.map((item, itemIndex) => (
                <button
                  key={item.commandId}
                  ref={(node) => { itemButtonRefs.current[itemIndex] = node; }}
                  type="button"
                  role={item.pressed === undefined ? "menuitem" : "menuitemcheckbox"}
                  className="workbench-menu-item"
                  data-command-id={item.commandId}
                  aria-disabled={item.disabled || undefined}
                  title={item.disabledReason ?? item.tooltip}
                  aria-label={item.disabledReason ? `${item.label}: ${item.disabledReason}` : item.label}
                  aria-checked={item.pressed === undefined ? undefined : item.pressed}
                  aria-busy={item.pending || undefined}
                  tabIndex={focusedItemIndex === itemIndex ? 0 : -1}
                  onClick={() => activateItem(menuIndex, itemIndex)}
                  onKeyDown={(event) => handleItemKeyDown(event, menuIndex, itemIndex)}
                >
                  <span className="workbench-menu-item-label">
                    {item.pending ? `${item.label}...` : item.label}
                  </span>
                  {item.shortcut ? (
                    <kbd
                      className="workbench-menu-item-shortcut"
                      data-multiline={item.shortcut.includes(" or ") ? "true" : undefined}
                    >
                      {item.shortcut}
                    </kbd>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
