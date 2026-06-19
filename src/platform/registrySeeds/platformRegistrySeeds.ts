import type { CommandId, PanelId } from "../contracts";
import { createCommandRegistry, createPanelRegistry } from "../registries";
import { platformCommandSeedDefinitions } from "./commandSeedDefinitions";
import { platformPanelSeedDefinitions } from "./panelSeedDefinitions";

export const createSeededPlatformCommandRegistry = () => {
  const registry = createCommandRegistry();

  platformCommandSeedDefinitions.forEach((command) => {
    registry.register(command);
  });

  return registry;
};

export const createSeededPlatformPanelRegistry = () => {
  const registry = createPanelRegistry();

  platformPanelSeedDefinitions.forEach((panel) => {
    registry.register(panel);
  });

  return registry;
};

export const getPlatformCommandSeedById = (id: CommandId) =>
  platformCommandSeedDefinitions.find((command) => command.id === id);

export const getPlatformPanelSeedById = (id: PanelId) =>
  platformPanelSeedDefinitions.find((panel) => panel.id === id);

