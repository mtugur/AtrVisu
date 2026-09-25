export type LayoutLevel = {
  id: string;
  name: string;
  elevationMm: number;
  systemLevel?: boolean;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated Use LayoutLevel and the normalized Ground datum authority. */
export type LevelDefinition = LayoutLevel;
