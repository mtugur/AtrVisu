export type RenderingDepthScene = Readonly<{
  setRenderingAutoClearDepthStencil: (
    renderingGroupId: number,
    autoClearDepthStencil: boolean,
    depth?: boolean,
    stencil?: boolean
  ) => void;
}>;

export const WORLD_GEOMETRY_RENDERING_GROUP_ID = 1;

export const preserveWorldGeometryDepthAcrossRenderingGroups = (
  scene: RenderingDepthScene
) => {
  scene.setRenderingAutoClearDepthStencil(WORLD_GEOMETRY_RENDERING_GROUP_ID, false);
};
