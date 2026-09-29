import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { DensityId, ThemeId } from "../platform/contracts";
import {
  resolveEffectiveThemeId,
  subscribeToEffectiveSystemTheme,
  SYSTEM_THEME_MEDIA_QUERY,
  type EffectiveThemeId
} from "./effectiveTheme";
import "./designTokens.css";
import "./themes.css";

export type DesignSystemRootProps = {
  children: ReactNode;
  themeId: ThemeId;
  densityId: DensityId;
};

const EffectiveThemeContext = createContext<EffectiveThemeId>("dark");

export const useEffectiveThemeId = () => useContext(EffectiveThemeContext);

export function DesignSystemRoot({
  children,
  themeId,
  densityId
}: DesignSystemRootProps) {
  const mediaQuery = useMemo(
    () => themeId === "system"
      && typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      ? window.matchMedia(SYSTEM_THEME_MEDIA_QUERY)
      : null,
    [themeId]
  );
  const [systemEffectiveThemeId, setSystemEffectiveThemeId] = useState<EffectiveThemeId>(
    () => resolveEffectiveThemeId("system", mediaQuery?.matches ?? true)
  );

  useEffect(() => {
    if (!mediaQuery) {
      return;
    }
    setSystemEffectiveThemeId(resolveEffectiveThemeId("system", mediaQuery.matches));
    return subscribeToEffectiveSystemTheme(mediaQuery, setSystemEffectiveThemeId);
  }, [mediaQuery]);

  const effectiveThemeId = themeId === "system" ? systemEffectiveThemeId : themeId;

  return (
    <EffectiveThemeContext.Provider value={effectiveThemeId}>
      <div
        className="av-design-system-root"
        data-av-theme={effectiveThemeId}
        data-av-theme-preference={themeId}
        data-av-density={densityId}
        data-testid="design-system-root"
      >
        {children}
      </div>
    </EffectiveThemeContext.Provider>
  );
}
