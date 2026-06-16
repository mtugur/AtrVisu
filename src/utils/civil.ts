import type { CivilReferenceItem, CivilReferenceType } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT } from "./coordinateReference";
import { getLayerId, isLayerVisible } from "./layers";

const nowIso = () => new Date().toISOString();

const CIVIL_TYPE_LABELS: Record<CivilReferenceType, string> = {
  "floor-area": "Floor Area",
  wall: "Wall",
  column: "Column",
  "door-opening": "Door / Opening",
  "restricted-area": "Restricted Area",
  walkway: "Walkway",
  "reference-zone": "Reference Zone"
};

const CIVIL_DEFAULTS: Record<CivilReferenceType, {
  widthMm: number;
  depthMm: number;
  heightMm?: number;
  colorToken: string;
  opacity: number;
}> = {
  "floor-area": { widthMm: 12000, depthMm: 8000, heightMm: 20, colorToken: "#3f6f91", opacity: 0.22 },
  wall: { widthMm: 6000, depthMm: 200, heightMm: 3000, colorToken: "#8d98a5", opacity: 0.68 },
  column: { widthMm: 600, depthMm: 600, heightMm: 3500, colorToken: "#b6bdc8", opacity: 0.78 },
  "door-opening": { widthMm: 1800, depthMm: 160, heightMm: 2200, colorToken: "#7ec8de", opacity: 0.54 },
  "restricted-area": { widthMm: 4000, depthMm: 3000, heightMm: 25, colorToken: "#d77957", opacity: 0.3 },
  walkway: { widthMm: 6000, depthMm: 1400, heightMm: 20, colorToken: "#d5c25d", opacity: 0.28 },
  "reference-zone": { widthMm: 5000, depthMm: 3500, heightMm: 20, colorToken: "#75b99d", opacity: 0.24 }
};

export const getCivilTypeLabel = (type: CivilReferenceType) => CIVIL_TYPE_LABELS[type] ?? type;

export const getCivilTypeDefaults = (type: CivilReferenceType) => CIVIL_DEFAULTS[type] ?? CIVIL_DEFAULTS["reference-zone"];

export const createCivilReferenceId = (type: CivilReferenceType) =>
  `civil-${type}-${Date.now()}-${Math.round(Math.random() * 10000)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCivilType = (value: unknown): value is CivilReferenceType =>
  typeof value === "string" && value in CIVIL_DEFAULTS;

const readFinite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readPositive = (value: unknown, fallback: number) => {
  const numeric = readFinite(value, fallback);
  return numeric > 0 ? numeric : fallback;
};

const normalizeCivilReference = (
  value: unknown,
  index: number,
  layers: LayoutLayer[]
): CivilReferenceItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const type = isCivilType(value.type) ? value.type : "reference-zone";
  const defaults = getCivilTypeDefaults(type);
  const timestamp = typeof value.updatedAt === "string" ? value.updatedAt : nowIso();
  const position = isRecord(value.positionMm) ? value.positionMm : {};
  const size = isRecord(value.sizeMm) ? value.sizeMm : {};
  const id = typeof value.id === "string" && value.id.trim()
    ? value.id.trim()
    : `civil-imported-${index}`;
  const name = typeof value.name === "string" && value.name.trim()
    ? value.name.trim()
    : getCivilTypeLabel(type);

  return {
    id,
    type,
    name,
    description: typeof value.description === "string" ? value.description : "",
    positionMm: {
      xMm: readFinite(position.xMm, 0),
      yMm: readFinite(position.yMm, 0),
      zMm: Math.max(0, readFinite(position.zMm, 0))
    },
    referencePoint: value.referencePoint === LAYOUT_REFERENCE_POINT ? LAYOUT_REFERENCE_POINT : undefined,
    coordinateReferenceVersion:
      value.coordinateReferenceVersion === COORDINATE_REFERENCE_VERSION ? COORDINATE_REFERENCE_VERSION : undefined,
    sizeMm: {
      widthMm: readPositive(size.widthMm, defaults.widthMm),
      depthMm: readPositive(size.depthMm, defaults.depthMm),
      heightMm: readPositive(size.heightMm, defaults.heightMm ?? 20)
    },
    rotationDeg: readFinite(value.rotationDeg, 0),
    layerId: getLayerId(typeof value.layerId === "string" ? value.layerId : undefined, layers),
    locked: value.locked === true,
    visible: value.visible !== false,
    style: {
      opacity: Math.min(1, Math.max(0.05, readFinite(isRecord(value.style) ? value.style.opacity : undefined, defaults.opacity))),
      colorToken: typeof (isRecord(value.style) ? value.style.colorToken : undefined) === "string"
        ? String((value.style as Record<string, unknown>).colorToken)
        : defaults.colorToken
    },
    createdAt: typeof value.createdAt === "string" ? value.createdAt : timestamp,
    updatedAt: timestamp
  };
};

export const normalizeCivilReferences = (
  civilReferences: unknown,
  layers: LayoutLayer[] = []
): CivilReferenceItem[] => {
  if (!Array.isArray(civilReferences)) {
    return [];
  }

  const seen = new Set<string>();
  return civilReferences.flatMap((item, index) => {
    const normalized = normalizeCivilReference(item, index, layers);
    if (!normalized || seen.has(normalized.id)) {
      return [];
    }
    seen.add(normalized.id);
    return [normalized];
  });
};

export const createCivilReference = (
  type: CivilReferenceType,
  positionMm = { xMm: 0, yMm: 0 },
  timestamp = nowIso()
): CivilReferenceItem => {
  const defaults = getCivilTypeDefaults(type);
  return {
    id: createCivilReferenceId(type),
    type,
    name: getCivilTypeLabel(type),
    description: "",
    positionMm: { ...positionMm, zMm: 0 },
    referencePoint: LAYOUT_REFERENCE_POINT,
    coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
    sizeMm: {
      widthMm: defaults.widthMm,
      depthMm: defaults.depthMm,
      heightMm: defaults.heightMm
    },
    rotationDeg: 0,
    layerId: "default",
    locked: false,
    visible: true,
    style: {
      opacity: defaults.opacity,
      colorToken: defaults.colorToken
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const updateCivilReference = (
  items: CivilReferenceItem[],
  id: string,
  updates: Partial<CivilReferenceItem>,
  timestamp = nowIso()
) =>
  items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      ...updates,
      referencePoint: LAYOUT_REFERENCE_POINT,
      coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
      positionMm: updates.positionMm ? { ...item.positionMm, ...updates.positionMm } : item.positionMm,
      sizeMm: updates.sizeMm ? { ...item.sizeMm, ...updates.sizeMm } : item.sizeMm,
      style: updates.style ? { ...item.style, ...updates.style } : item.style,
      updatedAt: timestamp
    };
  });

export const deleteCivilReference = (items: CivilReferenceItem[], id: string) =>
  items.filter((item) => item.id !== id);

export const getVisibleCivilReferences = (items: CivilReferenceItem[], layers: LayoutLayer[]) =>
  items.filter((item) => item.visible !== false && isLayerVisible(item.layerId, layers));
