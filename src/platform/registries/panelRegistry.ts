import type { PanelDefinition, PanelId } from "../contracts";

const hasText = (value: string) => value.trim().length > 0;

export const validatePanelDefinition = (panel: PanelDefinition) => {
  if (!hasText(panel.id)) {
    throw new Error("Panel id is required.");
  }
  if (!hasText(panel.title)) {
    throw new Error(`Panel "${panel.id}" title is required.`);
  }
  if (panel.role === "inspector" && panel.dock !== "right") {
    throw new Error(`Inspector panel "${panel.id}" must use the right dock.`);
  }
  if ((panel.role === "manager" || panel.role === "diagnostics" || panel.role === "tool") && panel.dock === "right") {
    throw new Error(`Panel "${panel.id}" role "${panel.role}" cannot be registered as a right-dock inspector substitute.`);
  }
};

export const createPanelRegistry = () => {
  const panels = new Map<PanelId, PanelDefinition>();

  return {
    register(panel: PanelDefinition) {
      validatePanelDefinition(panel);
      if (panels.has(panel.id)) {
        throw new Error(`Duplicate panel id "${panel.id}".`);
      }
      panels.set(panel.id, panel);
      return panel;
    },
    get(id: PanelId) {
      return panels.get(id);
    },
    list() {
      return Array.from(panels.values());
    },
    validate(panel: PanelDefinition) {
      validatePanelDefinition(panel);
    }
  };
};

