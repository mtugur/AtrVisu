import type { AnnotationObject } from "../types/annotations";
import type { LayoutLayer } from "../types/layers";
import { isLayerLocked } from "../utils/layers";

// Keep the same canonical layer authority for in-scene annotations and saved dimensions.
export const isSavedMeasureDimensionEditable = (annotation: AnnotationObject | undefined, layers: LayoutLayer[]): boolean =>
  Boolean(annotation?.dimension && !isLayerLocked(annotation.layerId, layers));
