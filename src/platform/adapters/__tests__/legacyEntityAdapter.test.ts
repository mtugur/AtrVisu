import { describe, expect, it } from "vitest";
import type { AnnotationObject } from "../../../types/annotations";
import type { CivilReferenceItem } from "../../../types/civil";
import type { ObjectGroup } from "../../../types/groups";
import type { LayoutLayer } from "../../../types/layers";
import type { MachineDefinition, PlacedMachine } from "../../../types/machine";
import {
  adaptAnnotationToPlatformEntity,
  adaptCivilReferenceToPlatformEntity,
  adaptObjectGroupToPlatformEntity,
  adaptPlacedMachineToPlatformEntity,
  createLegacyEntitySnapshot,
  createLegacyPlatformEntityId
} from "../legacyEntityAdapter";

const layers: LayoutLayer[] = [
  {
    id: "default",
    name: "Default",
    visible: true,
    locked: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "locked-layer",
    name: "Locked",
    visible: true,
    locked: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "hidden-layer",
    name: "Hidden",
    visible: false,
    locked: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

const machineDefinition = (updates: Partial<MachineDefinition> = {}): MachineDefinition => ({
  id: "machine-definition-01",
  name: "Case Packer",
  category: "packaging",
  machineType: "case-packer",
  widthMm: 2400,
  depthMm: 1300,
  heightMm: 1850,
  width: 2.4,
  depth: 1.3,
  height: 1.85,
  defaultColor: "#227755",
  connectionPoints: [],
  ...updates
});

const placedMachine = (updates: Partial<PlacedMachine> = {}): PlacedMachine => {
  const definition = machineDefinition();
  return {
    instanceId: "machine-instance-01",
    libraryId: "atara-standard",
    machineDefinitionId: definition.id,
    definition,
    definitionSnapshot: definition,
    layerId: "default",
    position: { x: -1.25, z: 3.5 },
    positionMm: { xMm: -1250, yMm: 3500 },
    referencePoint: "front-left-bottom",
    coordinateReferenceVersion: "front-left-bottom-v1",
    elevationMm: 275,
    rotationDeg: 135,
    rotationY: 135,
    flowDirection: "forward",
    ...updates
  };
};

const civilReference = (updates: Partial<CivilReferenceItem> = {}): CivilReferenceItem => ({
  id: "civil-01",
  type: "wall",
  name: "North wall",
  description: "Existing wall",
  positionMm: { xMm: -4000, yMm: 2500, zMm: 125 },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  sizeMm: { widthMm: 8000, depthMm: 200, heightMm: 3200 },
  rotationDeg: 90,
  layerId: "default",
  locked: false,
  visible: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  ...updates
});

const annotation = (updates: Partial<AnnotationObject> = {}): AnnotationObject => ({
  id: "annotation-01",
  type: "warning",
  text: "Keep access clear",
  layerId: "default",
  positionMm: { xMm: -600, yMm: -900, zMm: 1600 },
  rotationDeg: 15,
  targetObjectId: "machine-instance-01",
  style: { sizeScale: 4, emphasis: "important", background: true },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  ...updates
});

const group = (updates: Partial<ObjectGroup> = {}): ObjectGroup => ({
  id: "assembly-01",
  name: "Packaging module",
  objectIds: ["machine:machine-instance-01", "civil:civil-01"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  ...updates
});

const propertyValue = (
  entity: ReturnType<typeof adaptPlacedMachineToPlatformEntity>,
  key: string
) => entity.properties.find((item) => item.key === key)?.value;

describe("legacy entity adapter", () => {
  it("adapts a machine with stable identity, canonical millimeters, and subtype traceability", () => {
    const source = placedMachine();
    const first = adaptPlacedMachineToPlatformEntity(source, layers);
    const second = adaptPlacedMachineToPlatformEntity(source, layers);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      id: "machine:machine-instance-01",
      type: "machine",
      name: "Case Packer",
      transform: { planX: -1250, planY: 3500, elevation: 275, rotationDeg: 135 },
      layerId: "default",
      visible: true,
      locked: false,
      selectable: true
    });
    expect(propertyValue(first, "sourceId")).toBe("machine-instance-01");
    expect(propertyValue(first, "sourceSubtype")).toBe("case-packer");
    expect(propertyValue(first, "widthMm")).toBe(2400);
    expect(propertyValue(first, "depthMm")).toBe(1300);
    expect(propertyValue(first, "heightMm")).toBe(1850);
  });

  it("uses the existing legacy meter fallback only when canonical machine positions are absent", () => {
    const entity = adaptPlacedMachineToPlatformEntity(
      placedMachine({ positionMm: undefined, position: { x: -2.5, z: 4.75 } }),
      layers
    );

    expect(entity.transform).toMatchObject({ planX: -2500, planY: 4750 });
  });

  it("adapts civil subtype, transform, dimensions, object lock, and object visibility", () => {
    const entity = adaptCivilReferenceToPlatformEntity(
      civilReference({ type: "column", locked: true, visible: false }),
      layers
    );

    expect(entity).toMatchObject({
      id: "civil:civil-01",
      type: "civil",
      transform: { planX: -4000, planY: 2500, elevation: 125, rotationDeg: 90 },
      visible: false,
      locked: true,
      selectable: false
    });
    expect(propertyValue(entity, "sourceSubtype")).toBe("column");
    expect(propertyValue(entity, "heightMm")).toBe(3200);
  });

  it("does not fabricate optional civil height metadata", () => {
    const entity = adaptCivilReferenceToPlatformEntity(
      civilReference({ sizeMm: { widthMm: 8000, depthMm: 200 } }),
      layers
    );

    expect(propertyValue(entity, "heightMm")).toBeUndefined();
  });

  it("adapts annotation subtype, target traceability, and transform without clamping negatives", () => {
    const entity = adaptAnnotationToPlatformEntity(annotation(), layers);

    expect(entity).toMatchObject({
      id: "annotation:annotation-01",
      type: "annotation",
      name: "Keep access clear",
      transform: { planX: -600, planY: -900, elevation: 1600, rotationDeg: 15 }
    });
    expect(propertyValue(entity, "sourceSubtype")).toBe("warning");
    expect(propertyValue(entity, "targetObjectId")).toBe("machine-instance-01");
  });

  it("combines object and layer lock rules while keeping locked visible entities selectable", () => {
    const machineEntity = adaptPlacedMachineToPlatformEntity(
      placedMachine({ layerId: "locked-layer" }),
      layers
    );
    const civilEntity = adaptCivilReferenceToPlatformEntity(
      civilReference({ locked: false, layerId: "locked-layer" }),
      layers
    );
    const annotationEntity = adaptAnnotationToPlatformEntity(
      annotation({ layerId: "locked-layer" }),
      layers
    );

    expect(machineEntity).toMatchObject({ visible: true, locked: true, selectable: true });
    expect(civilEntity).toMatchObject({ visible: true, locked: true, selectable: true });
    expect(annotationEntity).toMatchObject({ visible: true, locked: true, selectable: true });
  });

  it("combines source and layer visibility rules", () => {
    const machineEntity = adaptPlacedMachineToPlatformEntity(
      placedMachine({ layerId: "hidden-layer" }),
      layers
    );
    const annotationEntity = adaptAnnotationToPlatformEntity(
      annotation({ layerId: "hidden-layer" }),
      layers
    );
    const civilEntity = adaptCivilReferenceToPlatformEntity(
      civilReference({ visible: true, layerId: "hidden-layer" }),
      layers
    );

    expect(machineEntity).toMatchObject({ visible: false, selectable: false });
    expect(annotationEntity).toMatchObject({ visible: false, selectable: false });
    expect(civilEntity).toMatchObject({ visible: false, selectable: false });
  });

  it("falls missing layer references back to deterministic default context", () => {
    const entity = adaptAnnotationToPlatformEntity(annotation({ layerId: "missing-layer" }), layers);
    const entityWithoutLayerContext = adaptAnnotationToPlatformEntity(
      annotation({ layerId: "missing-layer" }),
      []
    );

    expect(entity).toMatchObject({ layerId: "default", visible: true, locked: false });
    expect(entityWithoutLayerContext).toMatchObject({ layerId: "default", visible: true, locked: false });
  });

  it("uses stable prefixed identities across source families with equal raw ids", () => {
    expect(createLegacyEntitySnapshot({
      machines: [placedMachine({ instanceId: "shared" })],
      civilReferences: [civilReference({ id: "shared" })],
      annotations: [annotation({ id: "shared" })],
      layers
    }).map((entity) => entity.id)).toEqual([
      "machine:shared",
      "civil:shared",
      "annotation:shared"
    ]);
  });

  it("preserves family order and source input order in aggregate snapshots", () => {
    const entities = createLegacyEntitySnapshot({
      machines: [placedMachine({ instanceId: "m2" }), placedMachine({ instanceId: "m1" })],
      civilReferences: [civilReference({ id: "c2" }), civilReference({ id: "c1" })],
      annotations: [annotation({ id: "a2" }), annotation({ id: "a1" })],
      layers
    });

    expect(entities.map((entity) => entity.id)).toEqual([
      "machine:m2",
      "machine:m1",
      "civil:c2",
      "civil:c1",
      "annotation:a2",
      "annotation:a1"
    ]);
  });

  it.each([
    ["machine-only", ["machine:machine-instance-01"]],
    ["civil-only", ["civil:civil-01"]],
    ["mixed", ["machine:machine-instance-01", "civil:civil-01"]]
  ])("adapts a %s group with canonical deterministic children", (_label, objectIds) => {
    const entities = createLegacyEntitySnapshot({
      machines: [placedMachine()],
      civilReferences: [civilReference()],
      annotations: [],
      groups: [group({ objectIds })],
      layers
    });
    const groupEntity = entities.find((entity) => entity.id === "group:assembly-01");

    expect(groupEntity).toMatchObject({
      id: "group:assembly-01",
      type: "group",
      name: "Packaging module",
      childrenIds: objectIds
    });
    objectIds.forEach((childId) => {
      expect(entities.find((entity) => entity.id === childId)?.parentId).toBe("group:assembly-01");
    });
  });

  it("derives a deterministic group transform from existing member references", () => {
    const sourceEntities = [
      adaptPlacedMachineToPlatformEntity(placedMachine(), layers),
      adaptCivilReferenceToPlatformEntity(civilReference(), layers)
    ];

    expect(adaptObjectGroupToPlatformEntity(group(), sourceEntities, layers).transform).toEqual({
      planX: -4000,
      planY: 2500,
      elevation: 125,
      rotationDeg: 0
    });
  });

  it("preserves unresolved canonical members so atomic movement can reject them", () => {
    const entities = createLegacyEntitySnapshot({
      machines: [placedMachine()],
      civilReferences: [],
      annotations: [],
      groups: [group({ objectIds: ["machine:machine-instance-01", "civil:missing"] })],
      layers
    });

    expect(entities.find((entity) => entity.id === "group:assembly-01")?.childrenIds).toEqual([
      "machine:machine-instance-01",
      "civil:missing"
    ]);
  });

  it("uses the group layer as its own selectable lock context", () => {
    const groupEntity = adaptObjectGroupToPlatformEntity(
      group({ layerId: "locked-layer" }),
      [adaptPlacedMachineToPlatformEntity(placedMachine(), layers)],
      layers
    );

    expect(groupEntity).toMatchObject({ visible: true, selectable: true, locked: true, layerId: "locked-layer" });
  });

  it("rejects duplicate platform identities without silently overwriting", () => {
    expect(() => createLegacyEntitySnapshot({
      machines: [placedMachine({ instanceId: "duplicate" }), placedMachine({ instanceId: "duplicate" })],
      civilReferences: [],
      annotations: [],
      layers
    })).toThrow('Duplicate legacy platform entity id "machine:duplicate".');
  });

  it("does not mutate sources or layer context and produces JSON-safe output", () => {
    const machines = [placedMachine()];
    const civilReferences = [civilReference()];
    const annotations = [annotation()];
    const before = JSON.parse(JSON.stringify({ machines, civilReferences, annotations, layers }));

    const input = { machines, civilReferences, annotations, layers };
    const entities = createLegacyEntitySnapshot(input);

    expect({ machines, civilReferences, annotations, layers }).toEqual(before);
    expect(createLegacyEntitySnapshot(input)).toEqual(entities);
    expect(JSON.parse(JSON.stringify(entities))).toEqual(entities);
    expect(JSON.stringify(entities)).not.toContain("visualModel");
    expect(JSON.stringify(entities)).not.toContain("definitionSnapshot");
  });

  it("does not derive platform identity from render-related machine fields", () => {
    const original = placedMachine();
    const renderChanged = placedMachine({
      position: { x: 999, z: -999 },
      definition: machineDefinition({ modelPath: "/models/replacement.glb" })
    });

    expect(adaptPlacedMachineToPlatformEntity(original, layers).id).toBe(
      adaptPlacedMachineToPlatformEntity(renderChanged, layers).id
    );
  });
});
