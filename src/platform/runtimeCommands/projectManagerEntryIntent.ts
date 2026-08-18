export const PROJECT_MANAGER_ENTRY_INTENTS = ["create", "open"] as const;

export type ProjectManagerEntryIntent = typeof PROJECT_MANAGER_ENTRY_INTENTS[number];

export type ProjectManagerEntryPayload = {
  intent: ProjectManagerEntryIntent;
};

export const getProjectManagerEntryIntent = (
  payload: unknown
): ProjectManagerEntryIntent | null => {
  if (!payload || typeof payload !== "object" || !("intent" in payload)) {
    return null;
  }
  const intent = (payload as { intent?: unknown }).intent;
  return PROJECT_MANAGER_ENTRY_INTENTS.find((candidate) => candidate === intent) ?? null;
};
