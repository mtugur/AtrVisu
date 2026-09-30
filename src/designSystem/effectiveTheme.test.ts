import { describe, expect, it, vi } from "vitest";
import {
  resolveEffectiveThemeId,
  subscribeToEffectiveSystemTheme,
  type SystemThemeMediaQuery
} from "./effectiveTheme";

describe("effective theme authority", () => {
  it("resolves explicit and system preferences deterministically", () => {
    expect(resolveEffectiveThemeId("light", true)).toBe("light");
    expect(resolveEffectiveThemeId("dark", false)).toBe("dark");
    expect(resolveEffectiveThemeId("system", true)).toBe("dark");
    expect(resolveEffectiveThemeId("system", false)).toBe("light");
  });

  it("publishes system media changes and removes the exact listener", () => {
    let listener: (() => void) | undefined;
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn((_type: string, next: () => void) => { listener = next; }),
      removeEventListener: vi.fn()
    } as unknown as SystemThemeMediaQuery;
    const onChange = vi.fn();

    const cleanup = subscribeToEffectiveSystemTheme(mediaQuery, onChange);
    listener?.();
    expect(onChange).toHaveBeenCalledWith("dark");

    Object.defineProperty(mediaQuery, "matches", { value: false });
    listener?.();
    expect(onChange).toHaveBeenLastCalledWith("light");

    cleanup();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});
