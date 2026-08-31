export const RESPONSIVE_INSPECTOR_BREAKPOINT_PX = 1100;
export const RESPONSIVE_PRIMARY_DOCK_BREAKPOINT_PX = 720;

export const isResponsiveInspectorPresentation = (viewportWidth: number) =>
  viewportWidth <= RESPONSIVE_INSPECTOR_BREAKPOINT_PX;

export const isResponsivePrimaryDockPresentation = (viewportWidth: number) =>
  viewportWidth <= RESPONSIVE_PRIMARY_DOCK_BREAKPOINT_PX;

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

export const resolvePrimaryDockPresentationCollapsed = ({
  viewportWidth,
  persistedCollapsed,
  responsivePrimaryDockOpen
}: Readonly<{
  viewportWidth: number;
  persistedCollapsed: boolean;
  responsivePrimaryDockOpen: boolean;
}>) => isResponsivePrimaryDockPresentation(viewportWidth)
  ? !responsivePrimaryDockOpen
  : persistedCollapsed;
