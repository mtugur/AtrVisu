import type { AnnotationObject } from "../types/annotations";
import type { LayoutLayer } from "../types/layers";
import { DEFAULT_LAYER_ID } from "../types/layers";
import type { PlacedMachine } from "../types/machine";

const nowIso = () => new Date().toISOString();

export const createDefaultLayer = (timestamp = nowIso()): LayoutLayer => ({
  id: DEFAULT_LAYER_ID,
  name: "Default",
  description: "Default layer for legacy and unassigned layout items.",
  visible: true,
  locked: false,
  systemLayer: true,
  createdAt: timestamp,
  updatedAt: timestamp
});

const normalizeLayer = (value: unknown, index: number): LayoutLayer | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<LayoutLayer>;
  const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : "";
  if (!id || !name) {
    return null;
  }
  const timestamp = typeof candidate.updatedAt === "string" ? candidate.updatedAt : nowIso();
  const isDefaultLayer = id === DEFAULT_LAYER_ID;
  return {
    id,
    name: isDefaultLayer ? "Default" : name,
    description: isDefaultLayer
      ? "Default layer for legacy and unassigned layout items."
      : typeof candidate.description === "string"
        ? candidate.description
        : "",
    visible: isDefaultLayer ? true : typeof candidate.visible === "boolean" ? candidate.visible : true,
    locked: isDefaultLayer ? false : typeof candidate.locked === "boolean" ? candidate.locked : false,
    color: typeof candidate.color === "string" ? candidate.color : undefined,
    systemLayer: isDefaultLayer ? true : Boolean(candidate.systemLayer),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : timestamp,
    updatedAt: timestamp
  };
};

export const normalizeLayers = (layers: unknown): LayoutLayer[] => {
  const normalized = Array.isArray(layers)
    ? layers.flatMap((layer, index) => {
        const normalizedLayer = normalizeLayer(layer, index);
        return normalizedLayer ? [normalizedLayer] : [];
      })
    : [];

  const byId = new Map<string, LayoutLayer>();
  normalized.forEach((layer) => {
    if (!byId.has(layer.id)) {
      byId.set(layer.id, layer.id === DEFAULT_LAYER_ID ? { ...layer, visible: true, locked: false, systemLayer: true } : layer);
    }
  });
  if (!byId.has(DEFAULT_LAYER_ID)) {
    byId.set(DEFAULT_LAYER_ID, createDefaultLayer());
  }
  return [
    byId.get(DEFAULT_LAYER_ID)!,
    ...[...byId.values()].filter((layer) => layer.id !== DEFAULT_LAYER_ID)
  ];
};

export const getLayerId = (layerId: string | undefined, layers: LayoutLayer[]) =>
  layers.some((layer) => layer.id === layerId) ? layerId! : DEFAULT_LAYER_ID;

export const getLayer = (layerId: string | undefined, layers: LayoutLayer[]) =>
  layers.find((layer) => layer.id === getLayerId(layerId, layers)) ?? createDefaultLayer();

export const isLayerVisible = (layerId: string | undefined, layers: LayoutLayer[]) =>
  getLayer(layerId, layers).visible;

export const isLayerLocked = (layerId: string | undefined, layers: LayoutLayer[]) =>
  getLayer(layerId, layers).locked;

export const getLayerItemCounts = (
  layers: LayoutLayer[],
  machines: PlacedMachine[],
  annotations: AnnotationObject[]
) => {
  const counts: Record<string, { machines: number; annotations: number; total: number }> = {};
  layers.forEach((layer) => {
    counts[layer.id] = { machines: 0, annotations: 0, total: 0 };
  });
  machines.forEach((machine) => {
    const layerId = getLayerId(machine.layerId, layers);
    counts[layerId] ??= { machines: 0, annotations: 0, total: 0 };
    counts[layerId].machines += 1;
    counts[layerId].total += 1;
  });
  annotations.forEach((annotation) => {
    const layerId = getLayerId(annotation.layerId, layers);
    counts[layerId] ??= { machines: 0, annotations: 0, total: 0 };
    counts[layerId].annotations += 1;
    counts[layerId].total += 1;
  });
  return counts;
};

export const createLayer = (name: string, timestamp = nowIso()): LayoutLayer => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Layer name is required.");
  }
  return {
    id: `layer-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    name: trimmedName,
    visible: true,
    locked: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const deleteLayerAndReassignItems = (
  layers: LayoutLayer[],
  machines: PlacedMachine[],
  annotations: AnnotationObject[],
  layerId: string
) => {
  const targetLayer = getLayer(layerId, layers);
  if (targetLayer.systemLayer || targetLayer.id === DEFAULT_LAYER_ID) {
    return { layers: normalizeLayers(layers), machines, annotations };
  }

  return {
    layers: layers.filter((layer) => layer.id !== layerId || layer.systemLayer),
    machines: machines.map((machine) =>
      getLayerId(machine.layerId, layers) === layerId ? { ...machine, layerId: DEFAULT_LAYER_ID } : machine
    ),
    annotations: annotations.map((annotation) =>
      getLayerId(annotation.layerId, layers) === layerId ? { ...annotation, layerId: DEFAULT_LAYER_ID } : annotation
    )
  };
};

export const isolateLayer = (layers: LayoutLayer[], layerId: string) =>
  layers.map((layer) => ({
    ...layer,
    visible: layer.id === DEFAULT_LAYER_ID || layer.id === layerId,
    updatedAt: nowIso()
  }));

export const showAllLayers = (layers: LayoutLayer[]) =>
  layers.map((layer) => ({
    ...layer,
    visible: true,
    locked: layer.id === DEFAULT_LAYER_ID ? false : layer.locked,
    systemLayer: layer.id === DEFAULT_LAYER_ID ? true : layer.systemLayer,
    updatedAt: nowIso()
  }));
