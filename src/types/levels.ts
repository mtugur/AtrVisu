export type LevelDefinition = {
  levelId: string;
  name: string;
  elevationMm: number;
  floorHeightMm: number;
  visible: boolean;
  locked: boolean;
};

export const DEFAULT_GROUND_LEVEL: LevelDefinition = {
  levelId: "ground",
  name: "Ground Floor",
  elevationMm: 0,
  floorHeightMm: 0,
  visible: true,
  locked: false
};

export const createDefaultGroundLevel = (): LevelDefinition => ({ ...DEFAULT_GROUND_LEVEL });

