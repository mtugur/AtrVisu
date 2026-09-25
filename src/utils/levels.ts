import type { CivilReferenceItem } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import type { LayoutLevel } from "../types/levels";
import type { PlacedMachine } from "../types/machine";
import {
  getCivilBottomWorldElevationFromAnchorMm,
  getCivilLevelAnchorWorldElevationMm
} from "./civil";
import { isLayerLocked } from "./layers";

export const GROUND_LEVEL_ID = "ground";
export const GROUND_LEVEL_NAME = "Ground";

const nowIso = () => new Date().toISOString();
const finiteNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const createGroundLevel = (timestamp = nowIso()): LayoutLevel => ({
  id: GROUND_LEVEL_ID,
  name: GROUND_LEVEL_NAME,
  elevationMm: 0,
  systemLevel: true,
  createdAt: timestamp,
  updatedAt: timestamp
});

const normalizeLevel = (value: unknown): LayoutLevel | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<LayoutLevel>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (!id || !name) return null;
  const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : nowIso();
  return {
    id,
    name,
    elevationMm: Math.max(0, finiteNumber(candidate.elevationMm)),
    systemLevel: id === GROUND_LEVEL_ID,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : updatedAt,
    updatedAt
  };
};

export const normalizeLevels = (value: unknown): LayoutLevel[] => {
  const levels = Array.isArray(value) ? value.flatMap((item) => {
    const normalized = normalizeLevel(item);
    return normalized ? [normalized] : [];
  }) : [];
  const byId = new Map<string, LayoutLevel>();
  levels.forEach((level) => {
    if (!byId.has(level.id)) byId.set(level.id, level);
  });
  const suppliedGround = byId.get(GROUND_LEVEL_ID);
  const ground = createGroundLevel(suppliedGround?.createdAt ?? nowIso());
  return [
    ground,
    ...[...byId.values()].filter((level) => level.id !== GROUND_LEVEL_ID)
  ];
};

export const getLevelId = (levelId: string | undefined, levels: readonly LayoutLevel[]) =>
  levels.some((level) => level.id === levelId) ? levelId! : GROUND_LEVEL_ID;

export const getLevel = (levelId: string | undefined, levels: readonly LayoutLevel[]) =>
  levels.find((level) => level.id === getLevelId(levelId, levels)) ?? createGroundLevel();

export const getRelativeElevationMm = (worldElevationMm: number, level: LayoutLevel) =>
  finiteNumber(worldElevationMm) - level.elevationMm;

export const getWorldElevationMm = (relativeElevationMm: number, level: LayoutLevel) =>
  level.elevationMm + finiteNumber(relativeElevationMm);

export const createLayoutLevel = (
  id: string,
  name: string,
  elevationMm: number,
  timestamp = nowIso()
): LayoutLevel => {
  const normalizedId = id.trim();
  const normalizedName = name.trim();
  if (!normalizedId || normalizedId === GROUND_LEVEL_ID) throw new Error("A unique non-Ground level ID is required.");
  if (!normalizedName) throw new Error("Level name is required.");
  if (!Number.isFinite(elevationMm) || elevationMm < 0) throw new Error("Level datum must be a non-negative finite number.");
  return { id: normalizedId, name: normalizedName, elevationMm, createdAt: timestamp, updatedAt: timestamp };
};

export type LevelEntityMutationResult = Readonly<{
  ok: boolean;
  machines: PlacedMachine[];
  civilReferences: CivilReferenceItem[];
  reason?: string;
}>;

const machineLocked = (machine: PlacedMachine, layers: LayoutLayer[]) =>
  isLayerLocked(machine.layerId, layers);
const civilLocked = (item: CivilReferenceItem, layers: LayoutLayer[]) =>
  Boolean(item.locked) || isLayerLocked(item.layerId, layers);

export const reassignEntityLevel = (
  entityKey: string,
  targetLevelId: string,
  levels: readonly LayoutLevel[],
  machines: PlacedMachine[],
  civilReferences: CivilReferenceItem[],
  layers: LayoutLayer[]
): LevelEntityMutationResult => {
  const targetLevel = getLevel(targetLevelId, levels);
  if (targetLevel.id !== targetLevelId) {
    return { ok: false, machines, civilReferences, reason: "The selected Level no longer exists." };
  }
  if (entityKey.startsWith("machine:")) {
    const id = entityKey.slice("machine:".length);
    const machine = machines.find((item) => item.instanceId === id);
    if (!machine) return { ok: false, machines, civilReferences, reason: "The selected machine no longer exists." };
    if (machineLocked(machine, layers)) return { ok: false, machines, civilReferences, reason: "The selected machine is locked." };
    const sourceLevel = getLevel(machine.levelId, levels);
    const relative = getRelativeElevationMm(machine.elevationMm ?? 0, sourceLevel);
    return {
      ok: true,
      machines: machines.map((item) => item.instanceId === id
        ? { ...item, levelId: targetLevel.id, elevationMm: getWorldElevationMm(relative, targetLevel) }
        : item),
      civilReferences
    };
  }
  if (entityKey.startsWith("civil:")) {
    const id = entityKey.slice("civil:".length);
    const civil = civilReferences.find((item) => item.id === id);
    if (!civil) return { ok: false, machines, civilReferences, reason: "The selected civil item no longer exists." };
    if (civilLocked(civil, layers)) return { ok: false, machines, civilReferences, reason: "The selected civil item is locked." };
    const sourceLevel = getLevel(civil.levelId, levels);
    const relative = getRelativeElevationMm(getCivilLevelAnchorWorldElevationMm(civil), sourceLevel);
    const targetAnchorWorldElevationMm = getWorldElevationMm(relative, targetLevel);
    return {
      ok: true,
      machines,
      civilReferences: civilReferences.map((item) => item.id === id
        ? {
            ...item,
            levelId: targetLevel.id,
            positionMm: {
              ...item.positionMm,
              zMm: getCivilBottomWorldElevationFromAnchorMm(item, targetAnchorWorldElevationMm)
            }
          }
        : item)
    };
  }
  return { ok: false, machines, civilReferences, reason: "Only machines and civil items can be assigned to a Level." };
};

export const changeLevelDatum = (
  levelId: string,
  nextElevationMm: number,
  levels: LayoutLevel[],
  machines: PlacedMachine[],
  civilReferences: CivilReferenceItem[],
  layers: LayoutLayer[],
  timestamp = nowIso()
): LevelEntityMutationResult & Readonly<{ levels: LayoutLevel[] }> => {
  const level = levels.find((item) => item.id === levelId);
  if (!level || level.systemLevel || level.id === GROUND_LEVEL_ID) {
    return { ok: false, levels, machines, civilReferences, reason: "Ground datum cannot be changed." };
  }
  if (!Number.isFinite(nextElevationMm) || nextElevationMm < 0) {
    return { ok: false, levels, machines, civilReferences, reason: "Level datum must be a non-negative finite number." };
  }
  const assignedMachines = machines.filter((item) => getLevelId(item.levelId, levels) === levelId);
  const assignedCivil = civilReferences.filter((item) => getLevelId(item.levelId, levels) === levelId);
  if (assignedMachines.some((item) => machineLocked(item, layers)) || assignedCivil.some((item) => civilLocked(item, layers))) {
    return { ok: false, levels, machines, civilReferences, reason: "Level datum change is blocked because an assigned entity is locked." };
  }
  const delta = nextElevationMm - level.elevationMm;
  return {
    ok: true,
    levels: levels.map((item) => item.id === levelId ? { ...item, elevationMm: nextElevationMm, updatedAt: timestamp } : item),
    machines: machines.map((item) => getLevelId(item.levelId, levels) === levelId
      ? { ...item, elevationMm: (item.elevationMm ?? 0) + delta }
      : item),
    civilReferences: civilReferences.map((item) => getLevelId(item.levelId, levels) === levelId
      ? { ...item, positionMm: { ...item.positionMm, zMm: (item.positionMm.zMm ?? 0) + delta }, updatedAt: timestamp }
      : item)
  };
};
