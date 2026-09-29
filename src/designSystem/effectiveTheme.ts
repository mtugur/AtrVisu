import type { ThemeId } from "../platform/contracts";

export type EffectiveThemeId = "light" | "dark";

export type SystemThemeMediaQuery = Pick<
  MediaQueryList,
  "matches" | "addEventListener" | "removeEventListener"
>;

export const SYSTEM_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const resolveEffectiveThemeId = (
  themeId: ThemeId,
  systemPrefersDark: boolean
): EffectiveThemeId => themeId === "system"
  ? systemPrefersDark ? "dark" : "light"
  : themeId;

export const subscribeToEffectiveSystemTheme = (
  mediaQuery: SystemThemeMediaQuery,
  onChange: (effectiveThemeId: EffectiveThemeId) => void
) => {
  const handleChange = () => {
    onChange(resolveEffectiveThemeId("system", mediaQuery.matches));
  };
  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
};
