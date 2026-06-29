export type SelectionPickMesh = {
  metadata?: Record<string, unknown> | null;
  isPickable: boolean;
  getChildMeshes?: (directDescendantsOnly?: boolean) => SelectionPickMesh[];
};

export type SelectionPickInfo = {
  pickedMesh?: SelectionPickMesh | null;
};

export type SelectionPickTarget = {
  instanceId?: string;
  civilReferenceId?: string;
  annotationId?: string;
};

export type SelectionToggleEvent = {
  ctrlKey?: boolean;
  shiftKey?: boolean;
};

const getStringMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key];

  return typeof value === "string" ? value : undefined;
};

export const getSelectionPickTarget = (
  pickInfo: SelectionPickInfo | null | undefined
): SelectionPickTarget => {
  const metadata = pickInfo?.pickedMesh?.metadata;

  return {
    instanceId: getStringMetadata(metadata, "instanceId"),
    civilReferenceId: getStringMetadata(metadata, "civilReferenceId"),
    annotationId: getStringMetadata(metadata, "annotationId")
  };
};

export const isToggleSelectionEvent = (
  event: SelectionToggleEvent | undefined
) => Boolean(event?.ctrlKey || event?.shiftKey);

export const setMachinePickMetadata = <TMesh extends SelectionPickMesh>(
  mesh: TMesh,
  instanceId: string
) => {
  mesh.metadata = { ...(mesh.metadata ?? {}), instanceId };
  mesh.isPickable = true;

  return mesh;
};

export const applyMachinePickMetadataToHierarchy = <TMesh extends SelectionPickMesh>(
  mesh: TMesh,
  instanceId: string
) => {
  setMachinePickMetadata(mesh, instanceId);
  mesh.getChildMeshes?.(false).forEach((child) => {
    setMachinePickMetadata(child, instanceId);
  });

  return mesh;
};
