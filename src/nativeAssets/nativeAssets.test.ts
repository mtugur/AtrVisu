import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNativeGlbFixture } from "../../tests/fixtures/nativeGlb";
import { createCustomAssetId, createCustomAssetService, createImportedItem, cloneCustomVariant, type NativeAssetDraft } from "./customAssets";
import { DEFAULT_IMPORT_CALIBRATION, modelKeyFromPath, projectModelCalibration, validateGlb } from "./modelContract";
import { importedModelStore, resolveImportedModel } from "./modelStorage";
import { ATRVISU_DB_NAME, openAtrVisuDatabase, resetAtrVisuDatabaseConnectionForTests } from "../utils/storage/indexedDb";
import type { MachineLibraryDocument } from "../types/machine";

const draft: NativeAssetDraft = { name: "Imported equipment", category: "Packaging", productFamilyCode: "", machineType: "custom", variant: "", tags: "test, imported",
  unit: "m", calibration: DEFAULT_IMPORT_CALIBRATION, bounds: { min: [-1, 0, -1.5], max: [1, 1, 1.5] } };
const empty = (): MachineLibraryDocument => ({ libraryId: "project-custom", libraryName: "Project Custom Library", readonly: false, root: { id: "custom-root", name: "Custom", children: [], items: [] } });
afterEach(async () => {
  resetAtrVisuDatabaseConnectionForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(ATRVISU_DB_NAME); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
});

describe("native asset validation and calibration", () => {
  it("accepts self-contained GLB and rejects malformed containers", () => {
    expect(validateGlb(createNativeGlbFixture()).meshes).toHaveLength(1);
    expect(() => validateGlb(new ArrayBuffer(4))).toThrow("GLB");
    expect(() => validateGlb(createNativeGlbFixture({ external: true }))).toThrow("GLB");
    expect(() => validateGlb(createNativeGlbFixture({ noGeometry: true }))).toThrow("GLB");
    expect(validateGlb(createNativeGlbFixture({ unindexed: true })).meshes).toHaveLength(1);
    const bad = createNativeGlbFixture(); new DataView(bad).setUint32(8, 12, true);
    expect(() => validateGlb(bad)).toThrow("GLB");
  });
  it("converts units and maps perpendicular orientation without losing aspect ratio", () => {
    expect(projectModelCalibration(draft.bounds, "m", draft.calibration)).toMatchObject({ widthMm: 2000, depthMm: 3000, heightMm: 1000 });
    expect(projectModelCalibration(draft.bounds, "mm", draft.calibration)).toMatchObject({ widthMm: 2, depthMm: 3, heightMm: 1 });
    expect(projectModelCalibration(draft.bounds, "m", { ...draft.calibration, forwardAxis: "x+", upAxis: "z+" })).toMatchObject({ widthMm: 1000, depthMm: 2000, heightMm: 3000 });
    expect(() => projectModelCalibration(draft.bounds, "m", { ...draft.calibration, upAxis: "z+" })).toThrow("perpendicular");
    expect(projectModelCalibration({ min: [2, 3, 4], max: [4, 5, 6] }, "m", draft.calibration).offsetMeters).toEqual([-3, -3, -5]);
  });
  it("rejects invalid bounds and missing metadata before creating an asset", () => {
    expect(() => createImportedItem({ ...draft, name: " " }, "id", "key")).toThrow("required");
    expect(() => createImportedItem({ ...draft, category: " " }, "id", "key")).toThrow("required");
    for (const max of [[0, 0, 0], [Infinity, 2, 3], [NaN, 2, 3]]) {
      expect(() => createImportedItem({ ...draft, bounds: { min: [0, 0, 0], max: max as [number, number, number] } }, "id", "key")).toThrow("positive");
    }
    expect(createImportedItem(draft, "id", "key").visualModel?.modelPath).toBe("atrvisu-model:key");
    expect(modelKeyFromPath("atrvisu-model:key")).toBe("key");
  });
  it("retries identity collisions without a clock-based identity", () => {
    const random = vi.fn().mockReturnValueOnce("taken").mockReturnValue("new");
    expect(createCustomAssetId(new Set(["custom-taken"]), random)).toBe("custom-new");
    expect(new Set(Array.from({ length: 100 }, () => createCustomAssetId(new Set()))).size).toBe(100);
  });
});

describe("persistent imported models", () => {
  it("migrates v3 to v4 without rewriting any existing stores", async () => {
    const records = { projects: { projectId: "p", untouched: [1] }, uiPreferences: { schemaVersion: 1, untouched: [2] }, assetBrowserPreferences: { schemaVersion: 1, untouched: [3] } };
    await new Promise<void>((resolve) => {
      const request = indexedDB.open(ATRVISU_DB_NAME, 3);
      request.onupgradeneeded = () => Object.entries(records).forEach(([name, value]) => request.result.createObjectStore(name).put(value, "record"));
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const db = await openAtrVisuDatabase();
    expect(db.version).toBe(4);
    for (const name of ["projects", "uiPreferences", "assetBrowserPreferences"] as const) expect(await db.get(name, "record")).toEqual(records[name]);
    const bytes = createNativeGlbFixture();
    await importedModelStore.put("model", bytes, "fixture.glb");
    expect((await importedModelStore.get("model"))?.bytes).toEqual(bytes);
    await importedModelStore.delete("model");
    expect(await importedModelStore.get("model")).toBeUndefined();
  });
  it("resolves persisted bytes with idempotent URL release and truthful missing/corrupt failure", async () => {
    const urls = { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() };
    await importedModelStore.put("model", createNativeGlbFixture(), "fixture.glb");
    const resolved = await resolveImportedModel("atrvisu-model:model", importedModelStore, urls as unknown as typeof URL);
    expect(resolved.url).toBe("blob:test"); resolved.release(); resolved.release();
    expect(urls.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:test");
    await expect(resolveImportedModel("atrvisu-model:absent")).rejects.toThrow("unavailable");
    await (await openAtrVisuDatabase()).put("importedModels", { bytes: new ArrayBuffer(1), fileName: "bad.glb" }, "bad");
    await expect(resolveImportedModel("atrvisu-model:bad")).rejects.toThrow("GLB");
  });
  it("compensates a failed metadata save and publishes nothing on quota failure", async () => {
    const write = vi.fn(() => { throw new Error("quota"); });
    const service = createCustomAssetService({ read: async () => empty(), write, models: importedModelStore });
    await expect(service.importAsset(draft, createNativeGlbFixture(), "test.glb")).rejects.toThrow("quota");
    expect(await (await openAtrVisuDatabase()).count("importedModels")).toBe(0);
    const unavailable = createCustomAssetService({ read: async () => empty(), write, models: { ...importedModelStore, put: async () => { throw new Error("binary quota"); } } });
    write.mockClear();
    await expect(unavailable.importAsset(draft, createNativeGlbFixture(), "test.glb")).rejects.toThrow("binary quota");
    expect(write).not.toHaveBeenCalled();
  });
  it("preserves source definitions and shares binary until the final custom reference is deleted", async () => {
    let library = empty();
    const service = createCustomAssetService({ read: async () => library, write: (value) => { library = value; }, models: importedModelStore });
    const imported = await service.importAsset(draft, createNativeGlbFixture(), "test.glb");
    const original = structuredClone(imported);
    const variant = await service.createVariant(imported);
    expect(imported).toEqual(original);
    expect(variant.id).not.toBe(imported.id);
    expect(variant.modelPath).toBe(imported.modelPath);
    expect(await (await openAtrVisuDatabase()).count("importedModels")).toBe(1);
    await service.saveLibrary({ ...library, root: { ...library.root, items: [variant] } });
    expect(await (await openAtrVisuDatabase()).count("importedModels")).toBe(1);
    await service.saveLibrary(empty());
    expect(await (await openAtrVisuDatabase()).count("importedModels")).toBe(0);
    await expect(service.saveLibrary({ ...empty(), libraryId: "atara-standard", readonly: true })).rejects.toThrow("Only Project Custom");
    const standard = { ...original, ataraMachineData: { identity: { atrId: "ATR-1", isAtaraProduct: true }, utilityRequirements: { electrical: { powerKw: 5 } } } };
    const standardSnapshot = structuredClone(standard);
    const custom = cloneCustomVariant(standard, "custom-new");
    expect(standard).toEqual(standardSnapshot);
    expect(custom.ataraMachineData?.identity?.atrId).toBeUndefined();
    expect(custom.ataraMachineData?.utilityRequirements?.electrical?.powerKw).toBe(5);
  });
  it("serializes concurrent imports and rejects stale whole-library writes", async () => {
    let library = empty();
    const service = createCustomAssetService({ read: async () => library, write: (value) => { library = value; }, models: importedModelStore });
    const old = structuredClone(library);
    const [first, second] = await Promise.all([
      service.importAsset(draft, createNativeGlbFixture(), "first.glb"),
      service.importAsset({ ...draft, name: "Second" }, createNativeGlbFixture(), "second.glb")
    ]);
    expect(library.root.items.map((item) => item.id)).toEqual([first.id, second.id]);
    await expect(service.saveLibrary(empty(), old)).rejects.toThrow("changed");
    expect(await (await openAtrVisuDatabase()).count("importedModels")).toBe(2);
  });
});
