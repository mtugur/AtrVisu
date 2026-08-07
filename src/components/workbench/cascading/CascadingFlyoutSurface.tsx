import type { HTMLAttributes, ReactNode } from "react";
import type { CascadingFlyoutGeometry } from "./cascadingFlyoutGeometry";
import type { CascadingFlyoutDepth } from "./cascadingFlyoutState";

export type CascadingFlyoutSurfaceProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & Readonly<{
  depth: CascadingFlyoutDepth;
  geometry: CascadingFlyoutGeometry;
  children: ReactNode;
}>;

export function CascadingFlyoutSurface({
  depth,
  geometry,
  className,
  children,
  ...surfaceProps
}: CascadingFlyoutSurfaceProps) {
  return (
    <div
      {...surfaceProps}
      className={["cascading-flyout-surface", className].filter(Boolean).join(" ")}
      data-cascading-depth={depth}
      data-cascading-side={geometry.side}
      style={{
        position: "fixed",
        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        maxHeight: geometry.maxHeight
      }}
    >
      {children}
    </div>
  );
}
