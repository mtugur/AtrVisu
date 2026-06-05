import type {
  MachineCapabilities,
  MachineTaxonomy,
  MachineTypeDefinition,
  PlaceholderVisualType,
  ProductFamilyCode,
  TaxonomyCategory
} from "../types/taxonomy";

export const CUSTOM_TAXONOMY_STORAGE_KEY = "atrvisu.customMachineTaxonomy";

export const DEFAULT_CAPABILITIES: MachineCapabilities = {
  canConvey: false,
  canPalletize: false,
  canWrap: false,
  hasFlowDirection: false,
  canWeigh: false,
  canDose: false,
  canInspect: false,
  canStore: false,
  canElevate: false,
  connectsLevels: false,
  mobileEquipment: false,
  collisionRelevant: true,
  requiresTravelPath: false,
  buildingObstacle: false,
  safetyEquipment: false,
  instrumentation: false
};

export const FALLBACK_TAXONOMY: MachineTaxonomy = {
  version: 1,
  categories: [{ id: "custom", name: "Custom", readonly: true }],
  machineTypes: [{ id: "custom-machine", name: "Custom Machine", categoryId: "custom", readonly: true }],
  placeholderVisualTypes: [{ id: "box-generic", name: "Generic Box", readonly: true }],
  productFamilyCodes: [],
  defaultCapabilities: DEFAULT_CAPABILITIES
};

const LEGACY_CATEGORY_MAP: Record<string, { category: string; machineType: string; placeholder: string }> = {
  "Packaging Machine": { category: "Packaging", machineType: "Flow Pack Machine", placeholder: "box-generic" },
  Conveyor: { category: "Conveying", machineType: "Belt Conveyor", placeholder: "conveyor-belt" },
  "Robot Palletizer": { category: "Palletizing", machineType: "Robot Palletizer", placeholder: "robot-cell" },
  "High Level Palletizer": { category: "Palletizing", machineType: "High Level Palletizer", placeholder: "robot-cell" },
  "Stretch Wrapper": { category: "Wrapping / Hooding", machineType: "Pallet Stretch Wrapper", placeholder: "wrapper-proxy" },
  Pallet: { category: "Material Handling", machineType: "Pallet Truck", placeholder: "pallet-proxy" },
  "Safety Fence": { category: "Safety", machineType: "Safety Fence", placeholder: "safety-fence" }
};

const RENDERED_PLACEHOLDER_IDS = new Set([
  "box-generic",
  "conveyor-belt",
  "conveyor-roller",
  "elevator-vertical",
  "elevator-inclined",
  "silo-cylinder",
  "tank-cylinder",
  "hopper",
  "forklift-proxy",
  "pallet-proxy",
  "robot-cell",
  "wrapper-proxy",
  "safety-fence",
  "building-column",
  "building-wall",
  "platform",
  "electrical-panel"
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `taxonomy-${Date.now()}`;
};

const uniqueBy = <T,>(items: T[], keyOf: (item: T) => string) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const readCategories = (value: unknown): TaxonomyCategory[] => {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name)) {
          return [];
        }
        return [{
          id: isNonEmptyString(entry.id) ? entry.id : slugify(entry.name),
          name: entry.name.trim(),
          readonly: entry.readonly === true
        }];
      })
    : [];
};

const readMachineTypes = (value: unknown): MachineTypeDefinition[] => {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name) || !isNonEmptyString(entry.categoryId)) {
          return [];
        }
        return [{
          id: isNonEmptyString(entry.id) ? entry.id : slugify(entry.name),
          name: entry.name.trim(),
          categoryId: entry.categoryId,
          readonly: entry.readonly === true
        }];
      })
    : [];
};

const readPlaceholderVisualTypes = (value: unknown): PlaceholderVisualType[] => {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name)) {
          return [];
        }
        return [{
          id: isNonEmptyString(entry.id) ? entry.id : slugify(entry.name),
          name: entry.name.trim(),
          readonly: entry.readonly === true
        }];
      })
    : [];
};

const readProductFamilyCodes = (value: unknown): ProductFamilyCode[] => {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.code)) {
          return [];
        }
        return [{
          code: entry.code.trim().toUpperCase(),
          name: isNonEmptyString(entry.name) ? entry.name.trim() : entry.code.trim().toUpperCase(),
          description: isNonEmptyString(entry.description) ? entry.description.trim() : "",
          readonly: entry.readonly === true
        }];
      })
    : [];
};

export const validateTaxonomy = (value: unknown): MachineTaxonomy => {
  if (!isRecord(value)) {
    return FALLBACK_TAXONOMY;
  }

  const categories = uniqueBy(readCategories(value.categories), (item) => item.id);
  const placeholderVisualTypes = uniqueBy(readPlaceholderVisualTypes(value.placeholderVisualTypes), (item) => item.id);
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const machineTypes = uniqueBy(readMachineTypes(value.machineTypes), (item) => item.id)
    .filter((type) => validCategoryIds.has(type.categoryId));
  const productFamilyCodes = uniqueBy(readProductFamilyCodes(value.productFamilyCodes), (item) => item.code);

  if (categories.length === 0 || machineTypes.length === 0 || placeholderVisualTypes.length === 0) {
    return FALLBACK_TAXONOMY;
  }

  return {
    version: 1,
    categories,
    machineTypes,
    placeholderVisualTypes,
    productFamilyCodes,
    defaultCapabilities: {
      ...DEFAULT_CAPABILITIES,
      ...(isRecord(value.defaultCapabilities) ? value.defaultCapabilities : {})
    }
  };
};

export const mergeTaxonomies = (base: MachineTaxonomy, custom?: MachineTaxonomy | null): MachineTaxonomy => {
  if (!custom) {
    return base;
  }

  return validateTaxonomy({
    version: 1,
    categories: uniqueBy([...base.categories, ...custom.categories], (item) => item.id),
    machineTypes: uniqueBy([...base.machineTypes, ...custom.machineTypes], (item) => item.id),
    placeholderVisualTypes: uniqueBy(
      [...base.placeholderVisualTypes, ...custom.placeholderVisualTypes],
      (item) => item.id
    ),
    productFamilyCodes: uniqueBy([...base.productFamilyCodes, ...custom.productFamilyCodes], (item) => item.code),
    defaultCapabilities: {
      ...base.defaultCapabilities,
      ...custom.defaultCapabilities
    }
  });
};

export const loadMachineTaxonomy = async (): Promise<MachineTaxonomy> => {
  try {
    const response = await fetch("/library/taxonomy/machine-taxonomy.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const base = validateTaxonomy(await response.json());
    const customRaw = window.localStorage.getItem(CUSTOM_TAXONOMY_STORAGE_KEY);
    const custom = customRaw ? validateTaxonomy(JSON.parse(customRaw)) : null;
    return mergeTaxonomies(base, custom);
  } catch (error) {
    console.warn("[AtrVisu taxonomy] Default taxonomy could not be loaded; using safe fallback.", error);
    return FALLBACK_TAXONOMY;
  }
};

export const saveCustomTaxonomy = (taxonomy: MachineTaxonomy) => {
  window.localStorage.setItem(CUSTOM_TAXONOMY_STORAGE_KEY, JSON.stringify(validateTaxonomy(taxonomy), null, 2));
};

export const getLegacyTaxonomyHints = (legacyType: string, name = "") => {
  if (LEGACY_CATEGORY_MAP[legacyType]) {
    return LEGACY_CATEGORY_MAP[legacyType];
  }

  const searchText = `${legacyType} ${name}`.toLowerCase();
  if (searchText.includes("forklift")) {
    return { category: "Material Handling", machineType: "Forklift", placeholder: "forklift-proxy" };
  }
  if (searchText.includes("silo")) {
    return { category: "Storage / Buffer", machineType: "Silo", placeholder: "silo-cylinder" };
  }
  if (searchText.includes("tank")) {
    return { category: "Storage / Buffer", machineType: "Tank", placeholder: "tank-cylinder" };
  }
  if (searchText.includes("elevator")) {
    return { category: "Elevating", machineType: "Bucket Elevator", placeholder: "elevator-vertical" };
  }

  return { category: legacyType || "Custom", machineType: name || "Custom Machine", placeholder: "box-generic" };
};

export const inferPlaceholderVisualType = (category: string, machineType: string, fallback = "box-generic") => {
  const text = `${category} ${machineType}`.toLowerCase();
  if (text.includes("roller conveyor")) return "conveyor-roller";
  if (text.includes("conveyor")) return "conveyor-belt";
  if (text.includes("inclined") || text.includes("z type") || text.includes("spiral")) return "elevator-inclined";
  if (text.includes("elevator") || text.includes("vertical")) return "elevator-vertical";
  if (text.includes("silo")) return "silo-cylinder";
  if (text.includes("tank")) return "tank-cylinder";
  if (text.includes("hopper")) return "hopper";
  if (text.includes("forklift")) return "forklift-proxy";
  if (text.includes("pallet") && !text.includes("palletiz")) return "pallet-proxy";
  if (text.includes("palletiz") || text.includes("robot")) return "robot-cell";
  if (text.includes("wrapper") || text.includes("hooder")) return "wrapper-proxy";
  if (text.includes("fence") || text.includes("gate")) return "safety-fence";
  if (text.includes("column")) return "building-column";
  if (text.includes("wall")) return "building-wall";
  if (text.includes("platform")) return "platform";
  if (text.includes("electrical") || text.includes("panel")) return "electrical-panel";
  return RENDERED_PLACEHOLDER_IDS.has(fallback) ? fallback : "box-generic";
};

export const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(isNonEmptyString).map((tag) => tag.trim());
  }
  if (isNonEmptyString(value)) {
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
};

export const createTaxonomyId = slugify;
