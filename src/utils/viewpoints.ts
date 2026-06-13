import type { LayoutViewpoint, ViewpointCameraState, ViewpointDisplayState } from "../types/viewpoints";

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const createViewpointId = () => `viewpoint-${Date.now()}-${Math.round(Math.random() * 10000)}`;

export const normalizeViewpointCamera = (camera: unknown): ViewpointCameraState | null => {
  if (!camera || typeof camera !== "object") {
    return null;
  }

  const value = camera as Partial<ViewpointCameraState>;
  if (
    !isFiniteNumber(value.alpha) ||
    !isFiniteNumber(value.beta) ||
    !isFiniteNumber(value.radius) ||
    !isFiniteNumber(value.targetX) ||
    !isFiniteNumber(value.targetY) ||
    !isFiniteNumber(value.targetZ)
  ) {
    return null;
  }

  return {
    alpha: value.alpha,
    beta: value.beta,
    radius: value.radius,
    targetX: value.targetX,
    targetY: value.targetY,
    targetZ: value.targetZ,
    ...(isFiniteNumber(value.positionX) ? { positionX: value.positionX } : {}),
    ...(isFiniteNumber(value.positionY) ? { positionY: value.positionY } : {}),
    ...(isFiniteNumber(value.positionZ) ? { positionZ: value.positionZ } : {}),
    mode: value.mode === "orthographic" ? "orthographic" : "perspective"
  };
};

export const normalizeViewpoints = (viewpoints: unknown): LayoutViewpoint[] => {
  if (!Array.isArray(viewpoints)) {
    return [];
  }

  return viewpoints.flatMap((viewpoint, index) => {
    if (!viewpoint || typeof viewpoint !== "object") {
      return [];
    }

    const value = viewpoint as Partial<LayoutViewpoint>;
    const camera = normalizeViewpointCamera(value.camera);
    const name = typeof value.name === "string" ? value.name.trim() : "";
    if (!camera || !name) {
      return [];
    }

    const timestamp = typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString();
    return [{
      id: typeof value.id === "string" && value.id.trim() ? value.id : `viewpoint-${index + 1}`,
      name,
      description: typeof value.description === "string" ? value.description : "",
      camera,
      displayState: value.displayState as ViewpointDisplayState | undefined,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : timestamp,
      updatedAt: timestamp
    }];
  });
};

export const createViewpoint = ({
  name,
  description = "",
  camera,
  displayState,
  now = new Date().toISOString(),
  id = createViewpointId()
}: {
  name: string;
  description?: string;
  camera: ViewpointCameraState;
  displayState?: ViewpointDisplayState;
  now?: string;
  id?: string;
}): LayoutViewpoint => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Viewpoint name is required.");
  }

  return {
    id,
    name: trimmedName,
    description: description.trim(),
    camera,
    displayState,
    createdAt: now,
    updatedAt: now
  };
};

export const addViewpoint = (viewpoints: LayoutViewpoint[], viewpoint: LayoutViewpoint) => [
  ...viewpoints,
  viewpoint
];

export const updateViewpoint = (
  viewpoints: LayoutViewpoint[],
  viewpointId: string,
  updates: Partial<Pick<LayoutViewpoint, "name" | "description" | "camera" | "displayState">>,
  updatedAt = new Date().toISOString()
) =>
  viewpoints.map((viewpoint) =>
    viewpoint.id === viewpointId
      ? {
          ...viewpoint,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : viewpoint.name,
          description: updates.description !== undefined ? updates.description.trim() : viewpoint.description,
          updatedAt
        }
      : viewpoint
  );

export const deleteViewpoint = (viewpoints: LayoutViewpoint[], viewpointId: string) =>
  viewpoints.filter((viewpoint) => viewpoint.id !== viewpointId);

