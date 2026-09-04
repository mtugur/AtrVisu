import { IMPORTED_MODELS_STORE_NAME, openAtrVisuDatabase } from "../utils/storage/indexedDb";
import { modelKeyFromPath, validateGlb } from "./modelContract";

export const importedModelStore = {
  async put(key: string, bytes: ArrayBuffer, fileName: string) {
    validateGlb(bytes);
    await (await openAtrVisuDatabase()).add(IMPORTED_MODELS_STORE_NAME, { bytes, fileName }, key);
  },
  async get(key: string) { return (await openAtrVisuDatabase()).get(IMPORTED_MODELS_STORE_NAME, key); },
  async delete(key: string) { await (await openAtrVisuDatabase()).delete(IMPORTED_MODELS_STORE_NAME, key); }
};

export const resolveImportedModel = async (path: string, store = importedModelStore, urls = URL) => {
  const key = modelKeyFromPath(path);
  if (!key) throw new Error("Invalid imported model reference.");
  const record = await store.get(key);
  if (!record) throw new Error("Imported model is unavailable in this browser. Import the GLB again.");
  validateGlb(record.bytes);
  const url = urls.createObjectURL(new Blob([record.bytes], { type: "model/gltf-binary" }));
  let released = false;
  return { url, release: () => { if (!released) { released = true; urls.revokeObjectURL(url); } } };
};
