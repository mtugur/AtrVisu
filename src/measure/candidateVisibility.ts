export type CandidateVisibility = "Visible" | "Not in viewport" | "Covered by chrome" | "Scene-occluded";

export const getCandidateVisibility = ({ x, y, z, width, height, covered, occluded }: {
  x: number; y: number; z: number; width: number; height: number; covered: boolean; occluded: boolean;
}): CandidateVisibility => {
  if (![x, y, z].every(Number.isFinite) || z < 0 || z > 1 || x < 0 || y < 0 || x >= width || y >= height) return "Not in viewport";
  if (covered) return "Covered by chrome";
  if (occluded) return "Scene-occluded";
  return "Visible";
};
