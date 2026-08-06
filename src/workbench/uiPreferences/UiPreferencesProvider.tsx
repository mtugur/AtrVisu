import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";
import { DesignSystemRoot } from "../../designSystem";
import {
  createUiPreferencesRuntimeStore,
  type UiPreferencesRuntimeStore,
  type UiPreferencesRuntimeSnapshot
} from "./uiPreferencesRuntimeStore";

const UiPreferencesContext = createContext<UiPreferencesRuntimeStore | null>(null);

export type UiPreferencesProviderProps = {
  children: ReactNode;
  store?: UiPreferencesRuntimeStore;
};

export function UiPreferencesProvider({ children, store: suppliedStore }: UiPreferencesProviderProps) {
  const [store] = useState(() => suppliedStore ?? createUiPreferencesRuntimeStore());

  useEffect(() => {
    void store.hydrate();
  }, [store]);

  return (
    <UiPreferencesContext.Provider value={store}>
      {children}
    </UiPreferencesContext.Provider>
  );
}

export const useUiPreferencesStore = () => {
  const store = useContext(UiPreferencesContext);
  if (!store) {
    throw new Error("useUiPreferencesStore must be used within UiPreferencesProvider.");
  }
  return store;
};

export const useUiPreferences = (): UiPreferencesRuntimeSnapshot => {
  const store = useUiPreferencesStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
};

export function UiPreferencesDesignSystemBoundary({ children }: { children: ReactNode }) {
  const { preferences } = useUiPreferences();
  return (
    <DesignSystemRoot themeId={preferences.theme} densityId={preferences.density}>
      {children}
    </DesignSystemRoot>
  );
}
