import type { OverlaySettings } from "./overlays";

export type ViewpointCameraState = {
  alpha: number;
  beta: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  mode?: "perspective" | "orthographic";
};

export type ViewpointDisplayState = Partial<Pick<
  OverlaySettings,
  "showCollisionEnvelope" | "showConnectionPoints" | "showAnnotations"
>> & {
  selectedObjectIds?: string[];
  selectedAnnotationId?: string | null;
};

export type LayoutViewpoint = {
  id: string;
  name: string;
  description?: string;
  camera: ViewpointCameraState;
  displayState?: ViewpointDisplayState;
  createdAt: string;
  updatedAt: string;
};
