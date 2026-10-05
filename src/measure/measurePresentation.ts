export type MeasureSafeArea = {
    left: number;
    right: number;
    bottom?: number;
};
export const placeMeasureCallout = (point: {
    x: number;
    y: number;
}, width: number, height: number, insets: MeasureSafeArea = { left: 0, right: 0 }, labelWidth = 160) => {
    const left = Math.min(width, insets.left + 12);
    const right = Math.max(left, width - insets.right - 12 - labelWidth);
    const bottom = Math.max(20, height - (insets.bottom ?? 0) - 20);
    const x = Math.max(left, Math.min(right, Number.isFinite(point.x) ? point.x : left));
    const y = Math.max(20, Math.min(bottom, Number.isFinite(point.y) ? point.y : 20));
    return { x, y, displaced: x !== point.x || y !== point.y };
};
