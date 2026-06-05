import type {
  LibraryGroup,
  LibraryIndexEntry,
  LibraryMachineItem,
  LibraryValidationWarning,
  LoadedMachineLibrary,
  MachineLibraryDocument
} from "../types/machine";
import type { MachineCapabilities } from "../types/taxonomy";
import { DEFAULT_CAPABILITIES, getLegacyTaxonomyHints, inferPlaceholderVisualType, normalizeTags } from "./taxonomy";
import { metersToMm, mmToMeters } from "./units";
import { normalizeVisualModel } from "./visualModel";

type LibraryIndexDocument = {
  libraries?: unknown;
};

type LoadMachineLibrariesResult = {
  libraries: LoadedMachineLibrary[];
  warnings: LibraryValidationWarning[];
  loadError: string;
};

export const PROJECT_CUSTOM_LIBRARY_ID = "project-custom";
export const CUSTOM_LIBRARY_STORAGE_KEY = "atrvisu.projectCustomLibrary.v1";

export const MACHINE_CATEGORIES = [
  "Packaging",
  "Palletizing",
  "Wrapping / Hooding",
  "Conveying",
  "Elevating",
  "Weighing / Dosing",
  "Inspection / Quality Control",
  "Storage / Buffer",
  "Material Handling",
  "Process Equipment",
  "Utility Systems",
  "Safety",
  "Building / Civil",
  "Sensor / Instrumentation",
  "Custom"
];

const DEFAULT_CLEARANCE = {
  front: 0,
  back: 0,
  left: 0,
  right: 0
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isPositiveNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

const readDimensionMm = (item: Record<string, unknown>, mmKey: string, meterKey: string) => {
  const mmValue = item[mmKey];
  if (isPositiveNumber(mmValue)) {
    return mmValue;
  }

  const meterValue = item[meterKey];
  if (isPositiveNumber(meterValue)) {
    return metersToMm(meterValue);
  }

  return null;
};

const createWarning = (
  warnings: LibraryValidationWarning[],
  path: string,
  message: string
) => {
  const warning = { path, message };
  warnings.push(warning);
  console.warn(`[AtrVisu library] ${path}: ${message}`);
};

const fetchJson = async (path: string) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const validateIndexEntries = (
  index: unknown,
  warnings: LibraryValidationWarning[]
): LibraryIndexEntry[] => {
  if (!isRecord(index) || !Array.isArray((index as LibraryIndexDocument).libraries)) {
    throw new Error("Could not load a valid library index.");
  }

  return (index.libraries as unknown[]).flatMap((entry, indexPosition) => {
    const path = `libraries.index.json/libraries[${indexPosition}]`;
    if (!isRecord(entry)) {
      createWarning(warnings, path, "Library index entry is not an object and was skipped.");
      return [];
    }

    if (!isNonEmptyString(entry.libraryId)) {
      createWarning(warnings, path, "Library index entry is missing libraryId and was skipped.");
      return [];
    }

    if (!isNonEmptyString(entry.libraryName)) {
      createWarning(warnings, path, `Library "${entry.libraryId}" is missing libraryName and was skipped.`);
      return [];
    }

    const enabled = entry.enabled === true;
    if (enabled && !isNonEmptyString(entry.path)) {
      createWarning(warnings, path, `Enabled library "${entry.libraryName}" has no valid path and was skipped.`);
      return [];
    }

    return [
      {
        libraryId: entry.libraryId,
        libraryName: entry.libraryName,
        path: isNonEmptyString(entry.path) ? entry.path : "",
        readonly: entry.readonly === true,
        enabled
      }
    ];
  });
};

const readClearance = (
  value: unknown,
  warnings: LibraryValidationWarning[],
  path: string
): LibraryMachineItem["clearance"] => {
  if (value === undefined) {
    createWarning(warnings, path, "Missing clearance; safe zero clearance defaults were applied.");
    return DEFAULT_CLEARANCE;
  }

  if (!isRecord(value)) {
    createWarning(warnings, path, "Invalid clearance; safe zero clearance defaults were applied.");
    return DEFAULT_CLEARANCE;
  }

  return {
    front: typeof value.front === "number" && Number.isFinite(value.front) ? value.front : 0,
    back: typeof value.back === "number" && Number.isFinite(value.back) ? value.back : 0,
    left: typeof value.left === "number" && Number.isFinite(value.left) ? value.left : 0,
    right: typeof value.right === "number" && Number.isFinite(value.right) ? value.right : 0
  };
};

const readCapabilities = (
  value: unknown,
  warnings: LibraryValidationWarning[],
  path: string
): MachineCapabilities => {
  if (value === undefined) {
    createWarning(warnings, path, "Missing capabilities; safe disabled capability defaults were applied.");
    return DEFAULT_CAPABILITIES;
  }

  if (!isRecord(value)) {
    createWarning(warnings, path, "Invalid capabilities; safe disabled capability defaults were applied.");
    return DEFAULT_CAPABILITIES;
  }

  return {
    canConvey: value.canConvey === true,
    canPalletize: value.canPalletize === true,
    canWrap: value.canWrap === true,
    hasFlowDirection: value.hasFlowDirection === true,
    canWeigh: value.canWeigh === true,
    canDose: value.canDose === true,
    canInspect: value.canInspect === true,
    canStore: value.canStore === true,
    canElevate: value.canElevate === true,
    connectsLevels: value.connectsLevels === true,
    mobileEquipment: value.mobileEquipment === true,
    collisionRelevant: value.collisionRelevant !== false,
    requiresTravelPath: value.requiresTravelPath === true,
    buildingObstacle: value.buildingObstacle === true,
    safetyEquipment: value.safetyEquipment === true,
    instrumentation: value.instrumentation === true
  };
};

const validateMachineItem = (
  item: unknown,
  warnings: LibraryValidationWarning[],
  path: string
): LibraryMachineItem | null => {
  if (!isRecord(item)) {
    createWarning(warnings, path, "Machine item is not an object and was skipped.");
    return null;
  }

  const id = item.id;
  const name = item.name;
  const type = item.type;
  const legacyHints = getLegacyTaxonomyHints(isNonEmptyString(type) ? type : "", isNonEmptyString(name) ? name : "");
  const category = isNonEmptyString(item.category) ? item.category : legacyHints.category;
  const machineType = isNonEmptyString(item.machineType)
    ? item.machineType
    : legacyHints.machineType;
  const placeholderVisualType = isNonEmptyString(item.placeholderVisualType)
    ? item.placeholderVisualType
    : inferPlaceholderVisualType(category, machineType, legacyHints.placeholder);
  const widthMm = readDimensionMm(item, "widthMm", "width");
  const depthMm = readDimensionMm(item, "depthMm", "depth");
  const heightMm = readDimensionMm(item, "heightMm", "height");
  const defaultColor = item.defaultColor;
  const connectionPoints = item.connectionPoints;

  const invalidReasons = [
    !isNonEmptyString(id) ? "id" : "",
    !isNonEmptyString(name) ? "name" : "",
    !isNonEmptyString(type) && !isNonEmptyString(machineType) ? "type/machineType" : "",
    !isNonEmptyString(category) ? "category" : "",
    !isNonEmptyString(machineType) ? "machineType" : "",
    widthMm === null ? "widthMm/width" : "",
    depthMm === null ? "depthMm/depth" : "",
    heightMm === null ? "heightMm/height" : "",
    !isNonEmptyString(defaultColor) ? "defaultColor" : "",
    !Array.isArray(connectionPoints) ? "connectionPoints" : ""
  ].filter(Boolean);

  if (invalidReasons.length > 0) {
    createWarning(warnings, path, `Machine item is missing or has invalid ${invalidReasons.join(", ")} and was skipped.`);
    return null;
  }

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(name) ||
    (!isNonEmptyString(type) && !isNonEmptyString(machineType)) ||
    !isNonEmptyString(category) ||
    !isNonEmptyString(machineType) ||
    widthMm === null ||
    depthMm === null ||
    heightMm === null ||
    !isNonEmptyString(defaultColor) ||
    !Array.isArray(connectionPoints)
  ) {
    return null;
  }

  return {
    id,
    name,
    type: machineType,
    category,
    machineType,
    variant: isNonEmptyString(item.variant) ? item.variant : "",
    productFamilyCode: isNonEmptyString(item.productFamilyCode) ? item.productFamilyCode.trim().toUpperCase() : "",
    tags: normalizeTags(item.tags),
    placeholderVisualType,
    widthMm,
    depthMm,
    heightMm,
    width: mmToMeters(widthMm),
    depth: mmToMeters(depthMm),
    height: mmToMeters(heightMm),
    defaultColor,
    modelPath: isNonEmptyString(item.modelPath) ? item.modelPath : null,
    visualModel: normalizeVisualModel(item.visualModel, isNonEmptyString(item.modelPath) ? item.modelPath : null),
    thumbnailPath: isNonEmptyString(item.thumbnailPath) ? item.thumbnailPath : null,
    connectionPoints,
    clearance: readClearance(item.clearance, warnings, path),
    capabilities: readCapabilities(item.capabilities, warnings, path)
  };
};

const validateGroup = (
  group: unknown,
  warnings: LibraryValidationWarning[],
  path: string
): LibraryGroup | null => {
  if (!isRecord(group)) {
    createWarning(warnings, path, "Group is not an object and was skipped.");
    return null;
  }

  if (!isNonEmptyString(group.id) || !isNonEmptyString(group.name)) {
    createWarning(warnings, path, "Group is missing id or name and was skipped.");
    return null;
  }

  if (group.children !== undefined && !Array.isArray(group.children)) {
    createWarning(warnings, path, "Group children is not an array; children were ignored.");
  }

  if (group.items !== undefined && !Array.isArray(group.items)) {
    createWarning(warnings, path, "Group items is not an array; items were ignored.");
  }

  const children = Array.isArray(group.children)
    ? group.children.flatMap((child, index) => {
        const validatedChild = validateGroup(child, warnings, `${path}/children[${index}]`);
        return validatedChild ? [validatedChild] : [];
      })
    : [];

  const items = Array.isArray(group.items)
    ? group.items.flatMap((item, index) => {
        const validatedItem = validateMachineItem(item, warnings, `${path}/items[${index}]`);
        return validatedItem ? [validatedItem] : [];
      })
    : [];

  return {
    id: group.id,
    name: group.name,
    children,
    items
  };
};

const emptyRoot = (libraryName: string): LibraryGroup => ({
  id: "root",
  name: libraryName,
  children: [],
  items: []
});

export const validateLibraryDocument = (
  entry: LibraryIndexEntry,
  data: unknown,
  warnings: LibraryValidationWarning[]
): LoadedMachineLibrary => {
  const basePath = entry.path || entry.libraryName;

  if (!isRecord(data)) {
    createWarning(warnings, basePath, "Library file is not an object; the library was loaded empty.");
    return { ...entry, root: emptyRoot(entry.libraryName) };
  }

  const document = data as Partial<MachineLibraryDocument>;
  if (!isNonEmptyString(document.libraryId)) {
    createWarning(warnings, basePath, "Library file is missing libraryId; index libraryId was used.");
  }

  if (!isNonEmptyString(document.libraryName)) {
    createWarning(warnings, basePath, "Library file is missing libraryName; index libraryName was used.");
  }

  const root = validateGroup(document.root, warnings, `${basePath}/root`) ?? emptyRoot(entry.libraryName);

  return {
    libraryId: isNonEmptyString(document.libraryId) ? document.libraryId : entry.libraryId,
    libraryName: isNonEmptyString(document.libraryName) ? document.libraryName : entry.libraryName,
    readonly: document.readonly === true || entry.readonly,
    enabled: entry.enabled,
    path: entry.path,
    root
  };
};

export const validateProjectCustomLibraryDocument = (data: unknown) => {
  const warnings: LibraryValidationWarning[] = [];
  const library = validateLibraryDocument(
    {
      libraryId: PROJECT_CUSTOM_LIBRARY_ID,
      libraryName: "Project Custom Library",
      path: "localStorage",
      readonly: false,
      enabled: true
    },
    data,
    warnings
  );

  return {
    library: {
      ...library,
      libraryId: PROJECT_CUSTOM_LIBRARY_ID,
      libraryName: "Project Custom Library",
      readonly: false,
      enabled: true,
      path: "localStorage"
    },
    warnings
  };
};

const removeDuplicateItems = (
  libraries: LoadedMachineLibrary[],
  warnings: LibraryValidationWarning[]
): LoadedMachineLibrary[] => {
  const seenIds = new Set<string>();

  const visitGroup = (library: LoadedMachineLibrary, group: LibraryGroup, path: string): LibraryGroup => {
    const items = group.items.filter((item) => {
      if (seenIds.has(item.id)) {
        createWarning(
          warnings,
          `${path}/items/${item.id}`,
          `Duplicate machine item id "${item.id}" found in library "${library.libraryName}". Keeping the first loaded item.`
        );
        return false;
      }
      seenIds.add(item.id);
      return true;
    });

    return {
      ...group,
      items,
      children: group.children.map((child) =>
        visitGroup(library, child, `${path}/children/${child.id}`)
      )
    };
  };

  return libraries.map((library) => ({
    ...library,
    root: visitGroup(library, library.root, library.path || library.libraryName)
  }));
};

export const loadMachineLibraries = async (): Promise<LoadMachineLibrariesResult> => {
  const warnings: LibraryValidationWarning[] = [];

  try {
    const indexJson = await fetchJson("/library/libraries.index.json");
    const entries = validateIndexEntries(indexJson, warnings);
    const enabledEntries = entries.filter((entry) => entry.enabled);

    const loadedLibraries = await Promise.all(
      enabledEntries.map(async (entry) => {
        try {
          const customLibraryJson =
            entry.libraryId === PROJECT_CUSTOM_LIBRARY_ID && typeof window !== "undefined"
              ? window.localStorage.getItem(CUSTOM_LIBRARY_STORAGE_KEY)
              : null;
          const libraryJson = customLibraryJson ? JSON.parse(customLibraryJson) : await fetchJson(entry.path);
          return validateLibraryDocument(entry, libraryJson, warnings);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown load error";
          createWarning(warnings, entry.path, `Library "${entry.libraryName}" failed to load: ${message}`);
          return {
            ...entry,
            root: emptyRoot(entry.libraryName),
            loadError: "Failed to load"
          };
        }
      })
    );

    return {
      libraries: removeDuplicateItems(loadedLibraries, warnings),
      warnings,
      loadError: ""
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load library index.";
    console.warn(`[AtrVisu library] ${message}`);
    return {
      libraries: [],
      warnings,
      loadError: message
    };
  }
};
