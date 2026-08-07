import type { WorkbenchUiPreferences } from "../../platform/contracts";
import { UI_PREFERENCES_SCHEMA_VERSION } from "../../platform/contracts";
import { validateWorkbenchUiPreferences } from "../../platform/phase1ArchitectureValidation";
import {
  UI_PREFERENCES_RECORD_KEY,
  UI_PREFERENCES_STORE_NAME,
  openAtrVisuDatabase
} from "../../utils/storage/indexedDb";
import { cloneWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import {
  getUiPreferencesSchemaVersion,
  normalizeWorkbenchUiPreferences
} from "./uiPreferencesNormalizer";

export type UiPreferencesReadResult =
  | { status: "absent" }
  | { status: "valid"; preferences: WorkbenchUiPreferences; warnings: readonly string[] }
  | { status: "invalid"; raw: unknown; warning: string }
  | { status: "future-version"; raw: unknown; schemaVersion: number; warning: string }
  | { status: "storage-error"; error: unknown; warning: string };

export type UiPreferencesStorage = {
  read: () => Promise<UiPreferencesReadResult>;
  put: (preferences: WorkbenchUiPreferences) => Promise<void>;
  delete: () => Promise<void>;
};

export const createIndexedDbUiPreferencesStorage = (): UiPreferencesStorage => ({
  async read() {
    try {
      const database = await openAtrVisuDatabase();
      const raw = await database.get(UI_PREFERENCES_STORE_NAME, UI_PREFERENCES_RECORD_KEY) as unknown;
      if (raw === undefined) {
        return { status: "absent" };
      }
      const schemaVersion = getUiPreferencesSchemaVersion(raw);
      if (schemaVersion !== null && schemaVersion > UI_PREFERENCES_SCHEMA_VERSION) {
        return {
          status: "future-version",
          raw,
          schemaVersion,
          warning: `UI preferences use unsupported schema version ${schemaVersion}; defaults are active in read-only mode.`
        };
      }
      if (!validateWorkbenchUiPreferences(raw).valid) {
        return {
          status: "invalid",
          raw,
          warning: "Stored UI preferences are invalid; defaults are active until an explicit update or reset."
        };
      }
      const normalized = normalizeWorkbenchUiPreferences(raw);
      return {
        status: "valid",
        preferences: cloneWorkbenchUiPreferences(normalized.preferences),
        warnings: normalized.warnings
      };
    } catch (error) {
      return {
        status: "storage-error",
        error,
        warning: "UI preference storage is unavailable; defaults are active in degraded mode."
      };
    }
  },
  async put(preferences) {
    const normalized = normalizeWorkbenchUiPreferences(preferences);
    if (normalized.rejectedDomainPayload || !validateWorkbenchUiPreferences(normalized.preferences).valid) {
      throw new Error("UI preferences failed validation.");
    }
    const database = await openAtrVisuDatabase();
    await database.put(
      UI_PREFERENCES_STORE_NAME,
      cloneWorkbenchUiPreferences(normalized.preferences),
      UI_PREFERENCES_RECORD_KEY
    );
  },
  async delete() {
    const database = await openAtrVisuDatabase();
    await database.delete(UI_PREFERENCES_STORE_NAME, UI_PREFERENCES_RECORD_KEY);
  }
});
