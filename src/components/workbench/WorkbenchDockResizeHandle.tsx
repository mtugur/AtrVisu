import { useEffect, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

type WorkbenchDockResizeHandleProps = {
  axis: "horizontal" | "vertical";
  label: string;
  testId: string;
  value: number;
  min: number;
  max: number;
  onResize: (value: number) => void;
};

type ResizeStart = {
  coordinate: number;
  value: number;
};

export function WorkbenchDockResizeHandle({
  axis,
  label,
  testId,
  value,
  min,
  max,
  onResize
}: WorkbenchDockResizeHandleProps) {
  const resizeStartRef = useRef<ResizeStart | null>(null);
  const onResizeRef = useRef(onResize);

  useLayoutEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const coordinate = axis === "horizontal" ? event.clientX : event.clientY;
      const delta = axis === "horizontal"
        ? coordinate - start.coordinate
        : start.coordinate - coordinate;
      onResizeRef.current(start.value + delta);
    };
    const handlePointerUp = () => {
      resizeStartRef.current = null;
      document.body.classList.remove("is-resizing-workbench-dock");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.classList.remove("is-resizing-workbench-dock");
    };
  }, [axis]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || min === max) return;
    event.preventDefault();
    resizeStartRef.current = {
      coordinate: axis === "horizontal" ? event.clientX : event.clientY,
      value
    };
    document.body.classList.add("is-resizing-workbench-dock");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const decrement = axis === "horizontal" ? event.key === "ArrowLeft" : event.key === "ArrowDown";
    const increment = axis === "horizontal" ? event.key === "ArrowRight" : event.key === "ArrowUp";
    if (!decrement && !increment) return;
    event.preventDefault();
    onResize(value + (increment ? 16 : -16));
  };

  return (
    <div
      className={`workbench-dock-resize-handle is-${axis}`}
      data-testid={testId}
      role="separator"
      aria-label={label}
      aria-orientation={axis === "horizontal" ? "vertical" : "horizontal"}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      title={label}
      tabIndex={0}
      onPointerDown={startResize}
      onKeyDown={handleKeyDown}
    />
  );
}
