export type MachineLibraryManagerTarget = "library" | "taxonomy";

export type MachineLibraryManagerState = {
  libraryManagerOpen: boolean;
  taxonomyManagerOpen: boolean;
};

export type MachineLibraryManagerActions = {
  requestLibraryManagerClose: () => boolean;
  closeTaxonomyManager: () => void;
};

export const closeMachineLibraryManagerModals = (
  state: MachineLibraryManagerState,
  actions: MachineLibraryManagerActions
) => {
  if (state.libraryManagerOpen && !actions.requestLibraryManagerClose()) {
    return false;
  }
  if (state.taxonomyManagerOpen) {
    actions.closeTaxonomyManager();
  }
  return true;
};

export const openMachineLibraryManagerExclusively = (
  target: MachineLibraryManagerTarget,
  state: MachineLibraryManagerState,
  actions: MachineLibraryManagerActions & {
    openLibraryManager: () => void;
    openTaxonomyManager: () => void;
  }
) => {
  if (target === "library") {
    if (state.taxonomyManagerOpen) {
      actions.closeTaxonomyManager();
    }
    actions.openLibraryManager();
    return true;
  }

  if (state.libraryManagerOpen && !actions.requestLibraryManagerClose()) {
    return false;
  }
  actions.openTaxonomyManager();
  return true;
};
