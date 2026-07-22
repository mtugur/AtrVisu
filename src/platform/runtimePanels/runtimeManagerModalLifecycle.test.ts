import { describe, expect, it, vi } from "vitest";
import {
  closeMachineLibraryManagerModals,
  openMachineLibraryManagerExclusively
} from "./runtimeManagerModalLifecycle";

describe("runtime manager modal lifecycle", () => {
  it("permits parent collapse after a clean Library Manager close", () => {
    const requestLibraryManagerClose = vi.fn(() => true);

    expect(closeMachineLibraryManagerModals({
      libraryManagerOpen: true,
      taxonomyManagerOpen: false
    }, {
      requestLibraryManagerClose,
      closeTaxonomyManager: vi.fn()
    })).toBe(true);
    expect(requestLibraryManagerClose).toHaveBeenCalledOnce();
  });

  it("blocks section and shell collapse when dirty close is cancelled", () => {
    const requestLibraryManagerClose = vi.fn(() => false);
    const closeTaxonomyManager = vi.fn();

    expect(closeMachineLibraryManagerModals({
      libraryManagerOpen: true,
      taxonomyManagerOpen: false
    }, { requestLibraryManagerClose, closeTaxonomyManager })).toBe(false);
    expect(closeMachineLibraryManagerModals({
      libraryManagerOpen: true,
      taxonomyManagerOpen: false
    }, { requestLibraryManagerClose, closeTaxonomyManager })).toBe(false);
    expect(closeTaxonomyManager).not.toHaveBeenCalled();
  });

  it("closes Taxonomy Manager before permitting parent collapse", () => {
    const closeTaxonomyManager = vi.fn();

    expect(closeMachineLibraryManagerModals({
      libraryManagerOpen: false,
      taxonomyManagerOpen: true
    }, {
      requestLibraryManagerClose: vi.fn(() => true),
      closeTaxonomyManager
    })).toBe(true);
    expect(closeTaxonomyManager).toHaveBeenCalledOnce();
  });

  it("keeps manager modals exclusive and respects dirty cancellation", () => {
    let state = { libraryManagerOpen: false, taxonomyManagerOpen: true };
    const openLibraryManager = vi.fn(() => {
      state = { ...state, libraryManagerOpen: true };
    });
    const openTaxonomyManager = vi.fn(() => {
      state = { ...state, taxonomyManagerOpen: true };
    });
    const closeTaxonomyManager = vi.fn(() => {
      state = { ...state, taxonomyManagerOpen: false };
    });
    const cancelledClose = vi.fn(() => false);

    expect(openMachineLibraryManagerExclusively("library", state, {
      requestLibraryManagerClose: vi.fn(() => true),
      closeTaxonomyManager,
      openLibraryManager,
      openTaxonomyManager
    })).toBe(true);
    expect(closeTaxonomyManager).toHaveBeenCalledOnce();
    expect(openLibraryManager).toHaveBeenCalledOnce();
    expect(openTaxonomyManager).not.toHaveBeenCalled();
    expect(state).toEqual({ libraryManagerOpen: true, taxonomyManagerOpen: false });

    expect(openMachineLibraryManagerExclusively("taxonomy", state, {
      requestLibraryManagerClose: cancelledClose,
      closeTaxonomyManager,
      openLibraryManager,
      openTaxonomyManager
    })).toBe(false);
    expect(cancelledClose).toHaveBeenCalledOnce();
    expect(openTaxonomyManager).not.toHaveBeenCalled();
    expect(state).toEqual({ libraryManagerOpen: true, taxonomyManagerOpen: false });

    const acceptedClose = vi.fn(() => {
      state = { ...state, libraryManagerOpen: false };
      return true;
    });
    expect(openMachineLibraryManagerExclusively("taxonomy", state, {
      requestLibraryManagerClose: acceptedClose,
      closeTaxonomyManager,
      openLibraryManager,
      openTaxonomyManager
    })).toBe(true);
    expect(openTaxonomyManager).toHaveBeenCalledOnce();
    expect(state).toEqual({ libraryManagerOpen: false, taxonomyManagerOpen: true });
  });
});
