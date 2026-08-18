import type { PlacedMachine } from "../types/machine";

export const getPlacedMachineDisplayName = (machine: PlacedMachine) => {
  const displayName = machine.displayName?.trim();
  return displayName || machine.definition.name;
};
