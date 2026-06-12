import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "../types/machine";
import type { AnnotationObject } from "../types/annotations";
import {
  ATRVISU_UNIT_SYSTEM,
  getMachineDimensionsMm,
  normalizeMachineDefinitionDimensions
} from "./machineDimensions";
import { DEFAULT_CAPABILITIES } from "./taxonomy";
import { metersToMm, mmToMeters } from "./units";
import { normalizeMachineVisualModel } from "./visualModel";
import { normalizeCollisionEnvelope } from "./collision";
import { normalizeAnnotations } from "./annotations";

const DEFAULT_CLEARANCE = { front: 0, back: 0, left: 0, right: 0 };

export const createLayoutSnapshotFromMachines = (
  placedMachines: PlacedMachine[],
  exportedAt = new Date().toISOString(),
  annotations: AnnotationObject[] = []
): AtrVisuLayout => ({
  appName: "AtrVisu",
  version: 1,
  unitSystem: ATRVISU_UNIT_SYSTEM,
  exportedAt,
  objects: placedMachines.map((machine) => {
    const definition = normalizeMachineVisualModel(normalizeMachineDefinitionDimensions(machine.definition));
    const snapshot = normalizeMachineVisualModel(normalizeMachineDefinitionDimensions(machine.definitionSnapshot));
    const dimensionsMm = getMachineDimensionsMm(definition);
    const positionMm = machine.positionMm ?? {
      xMm: metersToMm(machine.position.x),
      yMm: metersToMm(machine.position.z)
    };
    const rotationDeg = machine.rotationDeg ?? machine.rotationY;

    return {
      id: machine.instanceId,
      libraryId: machine.libraryId,
      machineDefinitionId: machine.machineDefinitionId,
      definitionSnapshot: snapshot,
      name: definition.name,
      category: definition.category,
      ...dimensionsMm,
      width: definition.width,
      depth: definition.depth,
      height: definition.height,
      positionMm,
      elevationMm: machine.elevationMm ?? 0,
      rotationDeg,
      positionX: machine.position.x,
      positionZ: machine.position.z,
      rotationY: machine.rotationY,
      defaultColor: definition.defaultColor,
      collisionEnvelope: normalizeCollisionEnvelope(definition.collisionEnvelope, dimensionsMm),
      flowDirection: machine.flowDirection
    };
  }),
  annotations: normalizeAnnotations(annotations)
});

export const annotationsFromLayout = (layout: AtrVisuLayout): AnnotationObject[] =>
  normalizeAnnotations(layout.annotations);

export const placedMachinesFromLayout = (layout: AtrVisuLayout): PlacedMachine[] => {
  return layout.objects.map((object) => {
    const rawDefinition = normalizeMachineDefinitionDimensions({
      ...(object.definitionSnapshot ?? {
        id: object.machineDefinitionId,
        name: object.name,
        category: object.category,
        widthMm: object.widthMm,
        depthMm: object.depthMm,
        heightMm: object.heightMm,
        width: object.width,
        depth: object.depth,
        height: object.height,
        defaultColor: object.defaultColor,
        connectionPoints: []
      }),
      clearance: object.definitionSnapshot?.clearance ?? DEFAULT_CLEARANCE,
      collisionEnvelope: object.definitionSnapshot?.collisionEnvelope ?? object.collisionEnvelope,
      capabilities: object.definitionSnapshot?.capabilities ?? DEFAULT_CAPABILITIES
    });
    const definition: MachineDefinition = normalizeMachineVisualModel({
      ...rawDefinition,
      collisionEnvelope: normalizeCollisionEnvelope(rawDefinition.collisionEnvelope, getMachineDimensionsMm(rawDefinition))
    });
    const positionMm = object.positionMm ?? {
      xMm: metersToMm(object.positionX),
      yMm: metersToMm(object.positionZ)
    };
    const rotationDeg = object.rotationDeg ?? object.rotationY;

    return {
      instanceId: object.id,
      libraryId: object.libraryId,
      machineDefinitionId: object.machineDefinitionId,
      definitionSnapshot: definition,
      definition,
      position: {
        x: mmToMeters(positionMm.xMm),
        z: mmToMeters(positionMm.yMm)
      },
      positionMm,
      elevationMm: object.elevationMm ?? 0,
      rotationDeg,
      rotationY: rotationDeg,
      flowDirection: object.flowDirection ?? "forward"
    };
  });
};
