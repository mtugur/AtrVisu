import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "../types/machine";
import type { AnnotationObject } from "../types/annotations";
import type { CivilReferenceItem } from "../types/civil";
import type { ObjectGroup } from "../types/groups";
import type { LayoutLayer } from "../types/layers";
import type { LayoutViewpoint } from "../types/viewpoints";
import {
  ATRVISU_UNIT_SYSTEM,
  getMachineDimensionsMm,
  normalizeMachineDefinitionDimensions
} from "./machineDimensions";
import {
  COORDINATE_REFERENCE_VERSION,
  LAYOUT_REFERENCE_POINT,
  getReferenceFromCenterMm
} from "./coordinateReference";
import { DEFAULT_CAPABILITIES } from "./taxonomy";
import { metersToMm, mmToMeters } from "./units";
import { normalizeMachineVisualModel } from "./visualModel";
import { normalizeCollisionEnvelope } from "./collision";
import { normalizeAnnotations } from "./annotations";
import { normalizeCivilReferences } from "./civil";
import { normalizeGroups } from "./groups";
import { getLayerId, normalizeLayers } from "./layers";
import { normalizeViewpoints } from "./viewpoints";

const DEFAULT_CLEARANCE = { front: 0, back: 0, left: 0, right: 0 };

export const createLayoutSnapshotFromMachines = (
  placedMachines: PlacedMachine[],
  exportedAt = new Date().toISOString(),
  annotations: AnnotationObject[] = [],
  viewpoints: LayoutViewpoint[] = [],
  layers: LayoutLayer[] = [],
  groups: ObjectGroup[] = [],
  civilReferences: CivilReferenceItem[] = []
): AtrVisuLayout => {
  const normalizedLayers = normalizeLayers(layers);
  const normalizedCivilReferences = normalizeCivilReferences(civilReferences, normalizedLayers).map((item) => ({
    ...item,
    referencePoint: LAYOUT_REFERENCE_POINT,
    coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION
  }));
  const normalizedGroups = normalizeGroups(groups, placedMachines, normalizedLayers, normalizedCivilReferences);

  return {
    appName: "AtrVisu",
    version: 1,
    unitSystem: ATRVISU_UNIT_SYSTEM,
    coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
    referencePoint: LAYOUT_REFERENCE_POINT,
    exportedAt,
    layers: normalizedLayers,
    groups: normalizedGroups,
    civilReferences: normalizedCivilReferences,
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
      displayName: machine.displayName,
      libraryId: machine.libraryId,
      machineDefinitionId: machine.machineDefinitionId,
      definitionSnapshot: snapshot,
      layerId: getLayerId(machine.layerId, normalizedLayers),
      name: definition.name,
      category: definition.category,
      ...dimensionsMm,
      width: definition.width,
      depth: definition.depth,
      height: definition.height,
      positionMm,
      referencePoint: LAYOUT_REFERENCE_POINT,
      coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
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
    annotations: normalizeAnnotations(annotations).map((annotation) => ({
      ...annotation,
      layerId: getLayerId(annotation.layerId, normalizedLayers)
    })),
    viewpoints: normalizeViewpoints(viewpoints)
  };
};

export const annotationsFromLayout = (layout: AtrVisuLayout): AnnotationObject[] =>
  normalizeAnnotations(layout.annotations).map((annotation) => ({
    ...annotation,
    layerId: getLayerId(annotation.layerId, normalizeLayers(layout.layers))
  }));

export const layersFromLayout = (layout: AtrVisuLayout): LayoutLayer[] =>
  normalizeLayers(layout.layers);

export const civilReferencesFromLayout = (layout: AtrVisuLayout, layers: LayoutLayer[]): CivilReferenceItem[] =>
  normalizeCivilReferences(layout.civilReferences, layers).map((item) => {
    if (
      layout.coordinateReferenceVersion === COORDINATE_REFERENCE_VERSION ||
      item.coordinateReferenceVersion === COORDINATE_REFERENCE_VERSION
    ) {
      return {
        ...item,
        referencePoint: LAYOUT_REFERENCE_POINT,
        coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION
      };
    }

    return {
      ...item,
      positionMm: {
        ...item.positionMm,
        ...getReferenceFromCenterMm(item.positionMm, item.sizeMm, item.rotationDeg)
      },
      referencePoint: LAYOUT_REFERENCE_POINT,
      coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION
    };
  });

export const groupsFromLayout = (layout: AtrVisuLayout, machines: PlacedMachine[], layers: LayoutLayer[]): ObjectGroup[] =>
  normalizeGroups(layout.groups, machines, layers, civilReferencesFromLayout(layout, layers));

export const viewpointsFromLayout = (layout: AtrVisuLayout): LayoutViewpoint[] =>
  normalizeViewpoints(layout.viewpoints);

export const placedMachinesFromLayout = (layout: AtrVisuLayout): PlacedMachine[] => {
  const layers = normalizeLayers(layout.layers);
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
    const referencePositionMm =
      layout.coordinateReferenceVersion === COORDINATE_REFERENCE_VERSION ||
      object.coordinateReferenceVersion === COORDINATE_REFERENCE_VERSION
        ? positionMm
        : getReferenceFromCenterMm(positionMm, getMachineDimensionsMm(definition), rotationDeg);

    return {
      instanceId: object.id,
      displayName: object.displayName,
      libraryId: object.libraryId,
      machineDefinitionId: object.machineDefinitionId,
      definitionSnapshot: definition,
      definition,
      layerId: getLayerId(object.layerId, layers),
      position: {
        x: mmToMeters(referencePositionMm.xMm),
        z: mmToMeters(referencePositionMm.yMm)
      },
      positionMm: referencePositionMm,
      referencePoint: LAYOUT_REFERENCE_POINT,
      coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
      elevationMm: object.elevationMm ?? 0,
      rotationDeg,
      rotationY: rotationDeg,
      flowDirection: object.flowDirection ?? "forward"
    };
  });
};
