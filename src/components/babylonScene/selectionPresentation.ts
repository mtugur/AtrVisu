export type SelectionFrameRole = "primary" | "secondary";
export type MachineEmissiveRole = "black" | "collisionEmissive";

export const getSelectionFrameRole = (
  entityId: string,
  isSelected: boolean,
  primarySelectedEntityId: string | null
): SelectionFrameRole | null => {
  if (!isSelected) {
    return null;
  }
  return entityId === primarySelectedEntityId ? "primary" : "secondary";
};

export const getMachineEmissiveRole = (isColliding: boolean): MachineEmissiveRole =>
  isColliding ? "collisionEmissive" : "black";
