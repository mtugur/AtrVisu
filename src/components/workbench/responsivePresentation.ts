export const RESPONSIVE_INSPECTOR_BREAKPOINT_PX = 1100;

export const isResponsiveInspectorPresentation = (viewportWidth: number) =>
  viewportWidth <= RESPONSIVE_INSPECTOR_BREAKPOINT_PX;

export const resolveInspectorPresentationCollapsed = ({
  viewportWidth,
  persistedCollapsed,
  responsiveInspectorOpen
}: Readonly<{
  viewportWidth: number;
  persistedCollapsed: boolean;
  responsiveInspectorOpen: boolean;
}>) => isResponsiveInspectorPresentation(viewportWidth)
  ? !responsiveInspectorOpen
  : persistedCollapsed;
