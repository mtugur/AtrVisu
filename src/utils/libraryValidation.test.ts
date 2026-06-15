import { describe, expect, it, vi } from "vitest";
import type { LibraryIndexEntry, LibraryValidationWarning, LoadedMachineLibrary } from "../types/machine";
import { removeDuplicateLibraryItems, validateLibraryDocument } from "./libraryValidation";

const entry: LibraryIndexEntry = {
  libraryId: "test-library",
  libraryName: "Test Library",
  path: "/library/test.json",
  readonly: false,
  enabled: true
};

const createLibrary = (item: Record<string, unknown>) => ({
  libraryId: "test-library",
  libraryName: "Test Library",
  readonly: false,
  root: {
    id: "root",
    name: "Root",
    children: [],
    items: [
      {
        id: "item-1",
        name: "Item 1",
        type: "Conveyor",
        widthMm: 2876,
        depthMm: 760,
        heightMm: 500,
        defaultColor: "#ffffff",
        connectionPoints: [],
        ...item
      }
    ]
  }
});

describe("library validation", () => {
  it("preserves millimeter dimensions and applies visual model defaults", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(entry, createLibrary({}), warnings);
    const item = library.root.items[0];

    expect(item.widthMm).toBe(2876);
    expect(item.width).toBe(2.876);
    expect(item.collisionEnvelope).toEqual({
      widthMm: 2876,
      depthMm: 760,
      heightMm: 500,
      offsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      enabled: true
    });
    expect(item.visualModel).toEqual({
      modelPath: null,
      unit: "m",
      scaleMode: "metadata-box",
      rotationOffsetDeg: { x: 0, y: 0, z: 0 },
      positionOffsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      calibration: {
        centerOnFootprint: true,
        bottomOnFloor: true,
        preserveAspectRatio: true,
        forwardAxis: "z+",
        upAxis: "y+"
      }
    });
  });

  it("converts legacy meter dimensions to millimeters", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(
      entry,
      createLibrary({ widthMm: undefined, depthMm: undefined, heightMm: undefined, width: 2.876, depth: 0.76, height: 0.5 }),
      warnings
    );
    const item = library.root.items[0];

    expect(item.widthMm).toBe(2876);
    expect(item.depthMm).toBe(760);
    expect(item.heightMm).toBe(500);
  });

  it("normalizes invalid visualModel safely", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(entry, createLibrary({ visualModel: { unit: "cm", scaleMode: "bad" } }), warnings);
    const item = library.root.items[0];

    expect(item.visualModel?.unit).toBe("m");
    expect(item.visualModel?.scaleMode).toBe("metadata-box");
  });

  it("removes diagnostic missing GLB fixture paths from normal loaded library items", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(
      entry,
      createLibrary({
        name: "Test Conveyor",
        modelPath: "/library/models/not-existing-test.glb",
        visualModel: { modelPath: "/library/models/not-existing-test.glb" }
      }),
      warnings
    );
    const item = library.root.items[0];

    expect(item.modelPath).toBeNull();
    expect(item.visualModel?.modelPath).toBeNull();
  });

  it("preserves real GLB model paths for fallback loading diagnostics", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(
      entry,
      createLibrary({
        modelPath: "/library/models/forklift.glb",
        visualModel: { modelPath: "/library/models/forklift.glb" }
      }),
      warnings
    );
    const item = library.root.items[0];

    expect(item.modelPath).toBe("/library/models/forklift.glb");
    expect(item.visualModel?.modelPath).toBe("/library/models/forklift.glb");
  });

  it("normalizes invalid collision envelope safely", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(
      entry,
      createLibrary({ collisionEnvelope: { widthMm: -1, depthMm: 800, heightMm: 400, enabled: true } }),
      warnings
    );
    const item = library.root.items[0];

    expect(item.collisionEnvelope).toEqual({
      widthMm: 2876,
      depthMm: 800,
      heightMm: 400,
      offsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      enabled: true
    });
    expect(warnings.some((warning) => warning.message.includes("collisionEnvelope"))).toBe(true);
  });

  it("normalizes optional ATARA machine data without breaking existing item validation", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(
      entry,
      createLibrary({
        ataraMachineData: {
          identity: {
            isAtaraProduct: true,
            atrId: "ATR-SAMPLE"
          },
          physical: {
            widthMm: -1,
            depthMm: 900,
            heightMm: 700,
            weightKg: 120
          },
          maintenanceClearance: {
            frontMm: 500,
            backMm: 400,
            leftMm: 300,
            rightMm: 300,
            topMm: 100
          },
          connectionPoints: [
            {
              id: "electrical-1",
              name: "Electrical",
              type: "electrical",
              positionMm: { xMm: 10, yMm: 20, zMm: 30 },
              direction: "x+"
            }
          ]
        }
      }),
      warnings
    );
    const item = library.root.items[0];

    expect(item.ataraMachineData?.identity?.atrId).toBe("ATR-SAMPLE");
    expect(item.ataraMachineData?.physical?.widthMm).toBe(2876);
    expect(item.ataraMachineData?.physical?.depthMm).toBe(900);
    expect(item.ataraMachineData?.maintenanceClearance?.frontMm).toBe(500);
    expect(item.ataraMachineData?.connectionPoints?.[0].type).toBe("electrical");
  });

  it("falls back when placeholderVisualType is not renderable", () => {
    const warnings: LibraryValidationWarning[] = [];
    const library = validateLibraryDocument(entry, createLibrary({ placeholderVisualType: "not-rendered-yet" }), warnings);

    expect(library.root.items[0].placeholderVisualType).toBe("conveyor-belt");
  });

  it("skips duplicate machine item ids after the first loaded item", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const warnings: LibraryValidationWarning[] = [];
    const libraries: LoadedMachineLibrary[] = [
      validateLibraryDocument(entry, createLibrary({ id: "duplicate" }), warnings),
      validateLibraryDocument({ ...entry, libraryId: "second", libraryName: "Second" }, createLibrary({ id: "duplicate" }), warnings)
    ];

    const deduped = removeDuplicateLibraryItems(libraries, warnings);

    expect(deduped[0].root.items).toHaveLength(1);
    expect(deduped[1].root.items).toHaveLength(0);
    expect(warnings.some((warning) => warning.message.includes("Duplicate machine item id"))).toBe(true);
    vi.mocked(console.warn).mockRestore();
  });
});
