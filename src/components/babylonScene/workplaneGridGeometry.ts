import { MeshBuilder, Scene, Vector3, VertexBuffer, type LinesMesh } from "@babylonjs/core";
import type { ViewportVisualPalette } from "../../designSystem";
import { createViewportPaletteColor3 } from "../../designSystem/viewportVisualPaletteBabylon";
import { mmToMeters } from "../../utils/units";
import { WORKPLANE_GRID_MAJOR_SPACING_MM, WORKPLANE_GRID_MINOR_SPACING_MM, type WorkplaneBoundsMm } from "./workplaneGrid";

export const GRID_GEOMETRY_POLICY = Object.freeze({ renderer: "rigid-world-line-systems" as const, phaseOriginMm: 0 });
type WorldLineMm = readonly [readonly [number, number], readonly [number, number]];

export const createWorldGridLinesMm = (bounds: WorkplaneBoundsMm) => {
  const minor: WorldLineMm[] = [], major: WorldLineMm[] = [];
  for (let x = Math.ceil(bounds.minXMm / WORKPLANE_GRID_MINOR_SPACING_MM) * WORKPLANE_GRID_MINOR_SPACING_MM;
    x <= bounds.maxXMm; x += WORKPLANE_GRID_MINOR_SPACING_MM) {
    (x % WORKPLANE_GRID_MAJOR_SPACING_MM === 0 ? major : minor).push([[x, bounds.minYMm], [x, bounds.maxYMm]]);
  }
  for (let y = Math.ceil(bounds.minYMm / WORKPLANE_GRID_MINOR_SPACING_MM) * WORKPLANE_GRID_MINOR_SPACING_MM;
    y <= bounds.maxYMm; y += WORKPLANE_GRID_MINOR_SPACING_MM) {
    (y % WORKPLANE_GRID_MAJOR_SPACING_MM === 0 ? major : minor).push([[bounds.minXMm, y], [bounds.maxXMm, y]]);
  }
  return { minor, major };
};

const sameBounds = (a: WorkplaneBoundsMm, b: WorkplaneBoundsMm) =>
  a.minXMm === b.minXMm && a.maxXMm === b.maxXMm && a.minYMm === b.minYMm && a.maxYMm === b.maxYMm;

export const createWorkplaneGridGeometry = (scene: Scene, initialBounds: WorkplaneBoundsMm, initialPalette: ViewportVisualPalette) => {
  let bounds = initialBounds, palette = initialPalette, generation = 0;
  let minor: LinesMesh, major: LinesMesh;
  let coordinates: ReturnType<typeof createWorldGridLinesMm>;
  const build = (name: string, lines: readonly WorldLineMm[]) => {
    const mesh = MeshBuilder.CreateLineSystem(name, {
      lines: lines.map(line => line.map(([x, y]) => new Vector3(mmToMeters(x), -0.001, mmToMeters(y)))),
      useVertexAlpha: false
    }, scene);
    mesh.isPickable = false; mesh.checkCollisions = false;
    mesh.material!.disableDepthWrite = true;
    return mesh;
  };
  const applyPalette = () => {
    minor.color = createViewportPaletteColor3(palette, "gridMinor");
    major.color = createViewportPaletteColor3(palette, "gridMajor");
  };
  const rebuild = () => {
    minor?.dispose(false, true); major?.dispose(false, true);
    coordinates = createWorldGridLinesMm(bounds);
    minor = build("visual-grid-minor", coordinates.minor);
    major = build("visual-grid-major", coordinates.major);
    generation++; applyPalette();
  };
  rebuild();
  return {
    updateBounds: (next: WorkplaneBoundsMm) => { if (!sameBounds(bounds, next)) { bounds = next; rebuild(); } },
    updatePalette: (next: ViewportVisualPalette) => { palette = next; applyPalette(); },
    getDiagnostics: () => ({
      ...GRID_GEOMETRY_POLICY, generation, rebuildCount: generation - 1,
      minor: { meshId: minor.uniqueId, linesMm: coordinates.minor, verticesMeters: Array.from(minor.getVerticesData(VertexBuffer.PositionKind)!) },
      major: { meshId: major.uniqueId, linesMm: coordinates.major, verticesMeters: Array.from(major.getVerticesData(VertexBuffer.PositionKind)!) }
    }),
    dispose: () => { minor.dispose(false, true); major.dispose(false, true); }
  };
};
