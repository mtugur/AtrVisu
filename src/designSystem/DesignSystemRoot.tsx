import type { ReactNode } from "react";
import type { DensityId, ThemeId } from "../platform/contracts";
import "./designTokens.css";
import "./themes.css";

export type DesignSystemRootProps = {
  children: ReactNode;
  themeId: ThemeId;
  densityId: DensityId;
};

export function DesignSystemRoot({
  children,
  themeId,
  densityId
}: DesignSystemRootProps) {
  return (
    <div
      className="av-design-system-root"
      data-av-theme={themeId}
      data-av-density={densityId}
      data-testid="design-system-root"
    >
      {children}
    </div>
  );
}
