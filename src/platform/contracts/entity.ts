export type EntityId = string;

export type EntityType = "machine" | "civil" | "annotation" | "group" | "zone" | "flowObject";

export type UnitCode = "mm" | "deg" | "kg" | "s" | "pcs_per_hour" | "unknown";

export type PlanTransform = {
  planX: number;
  planY: number;
  elevation: number;
  rotationDeg: number;
};

export type EntityPropertyValue = string | number | boolean | null;

export type EntityProperty = {
  key: string;
  label: string;
  value: EntityPropertyValue;
  unit: UnitCode;
  readOnly?: boolean;
};

export type EntityConnector = {
  id: string;
  type: "mechanical" | "flow" | "electrical" | "io" | "safety" | "data";
  direction: "in" | "out" | "bidirectional";
};

export type PlatformEntity = {
  id: EntityId;
  type: EntityType;
  name: string;
  transform: PlanTransform;
  properties: readonly EntityProperty[];
  connectors: readonly EntityConnector[];
  parentId?: EntityId;
  childrenIds: readonly EntityId[];
  layerId?: string;
  visible: boolean;
  locked: boolean;
  selectable: boolean;
};

