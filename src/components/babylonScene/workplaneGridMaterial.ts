import { Scene, ShaderMaterial } from "@babylonjs/core";
import type { ViewportVisualPalette } from "../../designSystem";
import { createViewportPaletteColor3 } from "../../designSystem/viewportVisualPaletteBabylon";
import { WORKPLANE_GRID_MAJOR_SPACING_MM, WORKPLANE_GRID_MINOR_SPACING_MM } from "./workplaneGrid";
import { mmToMeters } from "../../utils/units";

export const GRID_SAMPLING = Object.freeze({
  renderer: "world-space-derivative-antialiasing" as const,
  lineHalfWidthPixels: 0.6,
  fadeStartPeriodPixels: 4,
  fadeEndPeriodPixels: 2,
  phaseOriginMeters: 0
});

export const GRID_VERTEX_SOURCE = `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec2 worldPlan;
void main() {
  worldPlan = (world * vec4(position, 1.0)).xz;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

export const GRID_FRAGMENT_SOURCE = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 worldPlan;
uniform vec3 fillColor;
uniform vec3 minorColor;
uniform vec3 majorColor;
uniform float minorSpacing;
uniform float majorSpacing;
uniform float halfWidth;
uniform float fadeStart;
uniform float fadeEnd;
vec2 lineIntegral(vec2 coordinate, vec2 width) {
  vec2 period = floor(coordinate);
  vec2 fraction = fract(coordinate);
  return period * 2.0 * width + min(fraction, width)
    + max(fraction - (1.0 - width), vec2(0.0));
}
vec2 gridCoverage(float spacing) {
  vec2 coordinate = worldPlan / spacing;
  vec2 footprint = max(fwidth(worldPlan) / spacing, vec2(0.000001));
  vec2 width = min(halfWidth * footprint, vec2(0.5));
  // Integrate the periodic line across the fragment footprint instead of
  // point-sampling it. World phase and major cadence remain unchanged.
  return (lineIntegral(coordinate + footprint * 0.5, width)
    - lineIntegral(coordinate - footprint * 0.5, width)) / footprint;
}
void main() {
  vec2 minor = gridCoverage(minorSpacing);
  minor *= smoothstep(fadeEnd, fadeStart,
    minorSpacing / max(fwidth(worldPlan), vec2(0.000001)));
  vec2 major = gridCoverage(majorSpacing);
  vec3 color = mix(fillColor, minorColor, max(minor.x, minor.y));
  color = mix(color, majorColor, max(major.x, major.y));
  gl_FragColor = vec4(color, 1.0);
}`;

export const applyWorkplaneGridPalette = (material: ShaderMaterial, palette: ViewportVisualPalette) => {
  material.setColor3("fillColor", createViewportPaletteColor3(palette, "workplaneFill"));
  material.setColor3("minorColor", createViewportPaletteColor3(palette, "gridMinor"));
  material.setColor3("majorColor", createViewportPaletteColor3(palette, "gridMajor"));
};

export const createWorkplaneGridMaterial = (scene: Scene, palette: ViewportVisualPalette) => {
  const material = new ShaderMaterial("visual-workplane-material", scene, {
    vertexSource: GRID_VERTEX_SOURCE,
    fragmentSource: GRID_FRAGMENT_SOURCE
  }, {
    attributes: ["position"],
    uniforms: ["world", "worldViewProjection", "fillColor", "minorColor", "majorColor",
      "minorSpacing", "majorSpacing", "halfWidth", "fadeStart", "fadeEnd"]
  });
  material.disableDepthWrite = true;
  material.backFaceCulling = true;
  material.setFloat("minorSpacing", mmToMeters(WORKPLANE_GRID_MINOR_SPACING_MM));
  material.setFloat("majorSpacing", mmToMeters(WORKPLANE_GRID_MAJOR_SPACING_MM));
  material.setFloat("halfWidth", GRID_SAMPLING.lineHalfWidthPixels);
  material.setFloat("fadeStart", GRID_SAMPLING.fadeStartPeriodPixels);
  material.setFloat("fadeEnd", GRID_SAMPLING.fadeEndPeriodPixels);
  applyWorkplaneGridPalette(material, palette);
  return material;
};
