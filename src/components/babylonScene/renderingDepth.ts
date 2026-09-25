import type { CivilReferenceType } from "../../types/civil";

export type RenderingDepthScene = Readonly<{
  setRenderingAutoClearDepthStencil: (
    renderingGroupId: number,
    autoClearDepthStencil: boolean,
    depth?: boolean,
    stencil?: boolean
  ) => void;
}>;

export const PHYSICAL_WORLD_RENDERING_GROUP_ID = 0;
export const PLANNING_REFERENCE_RENDERING_GROUP_ID = 1;

const PHYSICAL_CIVIL_TYPES: readonly CivilReferenceType[] = [
  "floor-area",
  "wall",
  "column",
  "beam"
];

export const getCivilRenderingGroupId = (type: CivilReferenceType) =>
  PHYSICAL_CIVIL_TYPES.includes(type)
    ? PHYSICAL_WORLD_RENDERING_GROUP_ID
    : PLANNING_REFERENCE_RENDERING_GROUP_ID;

export const preserveWorldGeometryDepthAcrossRenderingGroups = (
  scene: RenderingDepthScene
) => {
  scene.setRenderingAutoClearDepthStencil(PLANNING_REFERENCE_RENDERING_GROUP_ID, false);
};
