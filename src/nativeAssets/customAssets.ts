import type { LibraryGroup, LibraryMachineItem, MachineLibraryDocument } from "../types/machine";
import { CUSTOM_LIBRARY_STORAGE_KEY, PROJECT_CUSTOM_LIBRARY_ID, loadMachineLibraries, validateProjectCustomLibraryDocument } from "../utils/libraryValidation";
import { TECHNICAL_CSS_COLORS } from "../designSystem";
import { DEFAULT_VISUAL_MODEL } from "../utils/visualModel";
import { importedModelStore } from "./modelStorage";
import { MODEL_LOCATOR_PREFIX, modelKeyFromPath, projectModelCalibration, validateGlb, type ModelBounds, type ModelCalibration } from "./modelContract";

export const customAssetItems = (group: LibraryGroup): LibraryMachineItem[] => [
  ...group.items, ...group.children.flatMap(customAssetItems)
];
const referencedModels = (library: MachineLibraryDocument) => new Set(customAssetItems(library.root)
  .map((item) => modelKeyFromPath(item.visualModel?.modelPath ?? item.modelPath)).filter((id): id is string => !!id));

export const createCustomAssetId = (existing: ReadonlySet<string>, randomId = () => crypto.randomUUID()) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = `custom-${randomId()}`;
    if (!existing.has(id)) return id;
  }
  throw new Error("Could not allocate a unique custom asset identity.");
};

export type NativeAssetDraft = {
  name: string; category: string; productFamilyCode: string; machineType: string; variant: string; tags: string;
  unit: "mm" | "m"; calibration: ModelCalibration; bounds: ModelBounds;
};
export const createImportedItem = (draft: NativeAssetDraft, id: string, modelKey: string): LibraryMachineItem => {
  if (!draft.name.trim() || !draft.category.trim()) throw new Error("Name and category are required.");
  const dimensions = projectModelCalibration(draft.bounds, draft.unit, draft.calibration);
  const path = `${MODEL_LOCATOR_PREFIX}${modelKey}`;
  return {
    id, name: draft.name.trim(), category: draft.category.trim(), type: draft.machineType.trim() || "custom",
    machineType: draft.machineType.trim() || "custom", variant: draft.variant.trim(),
    productFamilyCode: draft.productFamilyCode.trim(), tags: draft.tags.split(",").map((v) => v.trim()).filter(Boolean),
    widthMm: dimensions.widthMm, depthMm: dimensions.depthMm, heightMm: dimensions.heightMm,
    width: dimensions.widthMm / 1000, depth: dimensions.depthMm / 1000, height: dimensions.heightMm / 1000,
    defaultColor: TECHNICAL_CSS_COLORS.libraryDefault, connectionPoints: [], modelPath: path,
    clearance: { front: 0, back: 0, left: 0, right: 0 },
    capabilities: { canConvey: false, canPalletize: false, canWrap: false, hasFlowDirection: false },
    visualModel: { ...structuredClone(DEFAULT_VISUAL_MODEL), modelPath: path, unit: draft.unit,
      scaleMode: "model-units", calibration: { ...draft.calibration } },
    collisionEnvelope: { enabled: true, widthMm: dimensions.widthMm, depthMm: dimensions.depthMm,
      heightMm: dimensions.heightMm, offsetMm: { xMm: 0, yMm: 0, zMm: 0 } }
  };
};

export const cloneCustomVariant = (source: LibraryMachineItem, id: string): LibraryMachineItem => {
  const copy = structuredClone(source);
  // Standard commercial codes are not identities for newly authored custom equipment.
  if (copy.ataraMachineData) copy.ataraMachineData.identity = { isAtaraProduct: false };
  return { ...copy, id, name: `${source.name} Custom`, variant: "Custom" };
};

type Dependencies = {
  read: () => Promise<MachineLibraryDocument>;
  write: (library: MachineLibraryDocument) => void;
  models: typeof importedModelStore;
};
export const createCustomAssetService = (dependencies: Dependencies) => {
  let tail: Promise<unknown> = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = tail.then(async () => {
      if (globalThis.navigator?.locks) return await navigator.locks.request("atrvisu-project-custom-library", operation);
      return operation();
    });
    tail = next.catch(() => undefined);
    return next;
  };
  const persist = async (previous: MachineLibraryDocument, library: MachineLibraryDocument) => {
    if (library.libraryId !== PROJECT_CUSTOM_LIBRARY_ID || library.readonly) throw new Error("Only Project Custom Library is editable.");
    const validated = validateProjectCustomLibraryDocument(library);
    if (validated.warnings.length) throw new Error("Custom library metadata is invalid.");
    dependencies.write(library);
    const retained = referencedModels(library);
    for (const key of referencedModels(previous)) {
      if (!retained.has(key)) await dependencies.models.delete(key);
    }
  };
  return {
    saveLibrary: (library: MachineLibraryDocument, expected?: MachineLibraryDocument) => serialize(async () => {
      const previous = await dependencies.read();
      if (expected && JSON.stringify(previous.root) !== JSON.stringify(expected.root)) {
        throw new Error("Custom Library changed. Reopen the editor before saving.");
      }
      await persist(previous, library);
    }),
    importAsset: (draft: NativeAssetDraft, bytes: ArrayBuffer, fileName: string) => serialize(async () => {
      validateGlb(bytes);
      const previous = await dependencies.read();
      const id = createCustomAssetId(new Set(customAssetItems(previous.root).map((item) => item.id)));
      const modelKey = crypto.randomUUID();
      const item = createImportedItem(draft, id, modelKey);
      await dependencies.models.put(modelKey, bytes, fileName);
      try {
        await persist(previous, { ...previous, root: { ...previous.root, items: [...previous.root.items, item] } });
      } catch (error) {
        // This newly allocated key has never been published by another operation in this queue.
        await dependencies.models.delete(modelKey);
        throw error;
      }
      return item;
    }),
    createVariant: (source: LibraryMachineItem) => serialize(async () => {
      const previous = await dependencies.read();
      const key = modelKeyFromPath(source.visualModel?.modelPath ?? source.modelPath);
      if (key) {
        const record = await dependencies.models.get(key);
        if (!record) throw new Error("The source model is unavailable in this browser.");
        validateGlb(record.bytes);
      }
      const item = cloneCustomVariant(source, createCustomAssetId(new Set(customAssetItems(previous.root).map((entry) => entry.id))));
      await persist(previous, { ...previous, root: { ...previous.root, items: [...previous.root.items, item] } });
      return item;
    })
  };
};

export const customAssets = createCustomAssetService({
  read: async () => {
    const result = await loadMachineLibraries();
    const library = result.libraries.find((entry) => entry.libraryId === PROJECT_CUSTOM_LIBRARY_ID);
    if (!library || library.loadError) throw new Error("Project Custom Library is unavailable.");
    return library;
  },
  write: (library) => {
    localStorage.setItem(CUSTOM_LIBRARY_STORAGE_KEY, JSON.stringify(library));
    window.dispatchEvent(new Event("atrvisu-custom-library-changed"));
  },
  models: importedModelStore
});
