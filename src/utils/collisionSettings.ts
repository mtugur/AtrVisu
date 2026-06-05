import type { CollisionSettings } from "../types/collision";

export const COLLISION_SETTINGS_STORAGE_KEY = "atrvisu.collisionSettings";

export const DEFAULT_COLLISION_SETTINGS: CollisionSettings = {
  enabled: true
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const normalizeCollisionSettings = (value: unknown): CollisionSettings => {
  if (!isRecord(value)) {
    return DEFAULT_COLLISION_SETTINGS;
  }

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_COLLISION_SETTINGS.enabled
  };
};

export const loadCollisionSettings = (): CollisionSettings => {
  try {
    const raw = window.localStorage.getItem(COLLISION_SETTINGS_STORAGE_KEY);
    return raw ? normalizeCollisionSettings(JSON.parse(raw)) : DEFAULT_COLLISION_SETTINGS;
  } catch {
    return DEFAULT_COLLISION_SETTINGS;
  }
};

export const saveCollisionSettings = (settings: CollisionSettings) => {
  window.localStorage.setItem(COLLISION_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeCollisionSettings(settings)));
};
