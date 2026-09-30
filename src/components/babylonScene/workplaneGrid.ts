import type { CivilReferenceItem } from "../../types/civil";
import type { PlacedMachine } from "../../types/machine";
import {
  getCivilReferenceFootprintBoundsMm,
  getMachineFootprintBoundsMm,
  type PlanBoundsMm
} from "../../utils/coordinateReference";

export const WORKPLANE_GRID_MINOR_SPACING_MM = 1_000;
export const WORKPLANE_GRID_MAJOR_SPACING_MM = 5_000;
export const WORKPLANE_CONTENT_MARGIN_MM = 5_000;
export const WORKPLANE_MINIMUM_SIZE_MM = 40_000;

export type WorkplaneBoundsMm = Readonly<{
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
  centerXMm: number;
  centerYMm: number;
  widthMm: number;
  depthMm: number;
}>;

const createBounds = (
  minXMm: number,
  maxXMm: number,
  minYMm: number,
  maxYMm: number
): WorkplaneBoundsMm => Object.freeze({
  minXMm,
  maxXMm,
  minYMm,
  maxYMm,
  centerXMm: (minXMm + maxXMm) / 2,
  centerYMm: (minYMm + maxYMm) / 2,
  widthMm: maxXMm - minXMm,
  depthMm: maxYMm - minYMm
});

export const EMPTY_WORKPLANE_BOUNDS_MM = createBounds(-20_000, 20_000, -20_000, 20_000);

const isFiniteBounds = (bounds: PlanBoundsMm) => [
  bounds.minXMm,
  bounds.maxXMm,
  bounds.minYMm,
  bounds.maxYMm
].every(Number.isFinite);

export const calculateWorkplaneBoundsFromPlanBounds = (
  sourceBounds: readonly PlanBoundsMm[]
): WorkplaneBoundsMm => {
  const finiteBounds = sourceBounds.filter(isFiniteBounds);
  if (finiteBounds.length === 0) {
    return EMPTY_WORKPLANE_BOUNDS_MM;
  }

  const contentMinX = Math.min(...finiteBounds.map((bounds) => bounds.minXMm));
  const contentMaxX = Math.max(...finiteBounds.map((bounds) => bounds.maxXMm));
  const contentMinY = Math.min(...finiteBounds.map((bounds) => bounds.minYMm));
  const contentMaxY = Math.max(...finiteBounds.map((bounds) => bounds.maxYMm));
  const contentCenterX = (contentMinX + contentMaxX) / 2;
  const contentCenterY = (contentMinY + contentMaxY) / 2;
  const halfMinimum = WORKPLANE_MINIMUM_SIZE_MM / 2;

  const unroundedMinX = Math.min(
    contentMinX - WORKPLANE_CONTENT_MARGIN_MM,
    contentCenterX - halfMinimum
  );
  const unroundedMaxX = Math.max(
    contentMaxX + WORKPLANE_CONTENT_MARGIN_MM,
    contentCenterX + halfMinimum
  );
  const unroundedMinY = Math.min(
    contentMinY - WORKPLANE_CONTENT_MARGIN_MM,
    contentCenterY - halfMinimum
  );
  const unroundedMaxY = Math.max(
    contentMaxY + WORKPLANE_CONTENT_MARGIN_MM,
    contentCenterY + halfMinimum
  );

  return createBounds(
    Math.floor(unroundedMinX / WORKPLANE_GRID_MAJOR_SPACING_MM) * WORKPLANE_GRID_MAJOR_SPACING_MM,
    Math.ceil(unroundedMaxX / WORKPLANE_GRID_MAJOR_SPACING_MM) * WORKPLANE_GRID_MAJOR_SPACING_MM,
    Math.floor(unroundedMinY / WORKPLANE_GRID_MAJOR_SPACING_MM) * WORKPLANE_GRID_MAJOR_SPACING_MM,
    Math.ceil(unroundedMaxY / WORKPLANE_GRID_MAJOR_SPACING_MM) * WORKPLANE_GRID_MAJOR_SPACING_MM
  );
};
export const calculateSceneWorkplaneBounds = ({
  machines,
  civilReferences
}: {
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
}) => calculateWorkplaneBoundsFromPlanBounds([
  ...machines.map(getMachineFootprintBoundsMm),
  ...civilReferences.map(getCivilReferenceFootprintBoundsMm)
]);

export const getWorldGridPhaseMm = (worldCoordinateMm: number, spacingMm: number) => {
  const remainder = worldCoordinateMm % spacingMm;
  if (Object.is(remainder, -0)) {
    return 0;
  }
  return remainder < 0 ? remainder + spacingMm : remainder;
};
