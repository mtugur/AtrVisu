import type { RuntimeViewportCameraSnapshot } from "../../platform/runtimeViewport";

export type CameraPresentationSource = Readonly<{
  getSnapshot: () => RuntimeViewportCameraSnapshot | null;
  subscribe: (listener: () => void) => () => void;
}>;

export const createCameraTelemetry = () => {
  let snapshot: RuntimeViewportCameraSnapshot | null = null;
  const listeners = new Set<() => void>();
  const source: CameraPresentationSource = Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }
  });
  return {
    source,
    publish: (next: RuntimeViewportCameraSnapshot | null) => {
      if (JSON.stringify(snapshot) === JSON.stringify(next)) return;
      snapshot = next ? Object.freeze({ ...next, ...(next.orthographicIntent ? { orthographicIntent: Object.freeze({ ...next.orthographicIntent }) } : {}) }) : null;
      listeners.forEach((listener) => listener());
    }
  };
};
