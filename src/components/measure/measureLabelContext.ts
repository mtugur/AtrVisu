import type { MeasureSafeArea } from "../../measure/measurePresentation";

export const readMeasureLabelViewport = (canvas: HTMLCanvasElement) => {
  const viewport = canvas.getBoundingClientRect();
  const root = canvas.closest('[data-testid="app-root"]');
  const css = root ? getComputedStyle(root) : null;
  const inset = (name: string) => Number.parseFloat(css?.getPropertyValue(name) ?? "0") || 0;
  const insets: MeasureSafeArea = { left: inset("--av-viewport-hud-left-inset"), right: inset("--av-viewport-hud-right-inset"), bottom: inset("--av-viewport-hud-bottom-inset") };
  return { viewport, insets, maximumLabelWidth: Math.max(24, viewport.width - insets.left - insets.right - 24) };
};

export const createMeasureTextMeasurer = (canvas: HTMLCanvasElement) => {
  const context = canvas.ownerDocument.createElement("canvas").getContext("2d")!;
  return (fontFamily: string, textPx: number) => {
    context.font = `600 ${textPx}px ${fontFamily}`;
    return (text: string) => context.measureText(text).width;
  };
};
